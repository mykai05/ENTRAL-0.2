import {
  assertCapabilityTruthRecord,
  assertInstalledCapabilityRecord,
  assertProductClaimRecord,
  assertPublicProductTruthProjection,
  type CapabilityEvidenceReceipt,
  type CapabilityTruthRecord,
  type InstalledCapabilityRecord,
  type ProductClaimRecord,
  type ProductClaimSurface,
  type PublicProductTruthProjection
} from "@entral/contracts";
import { apiFetch } from "./api";

export type CapabilityTruthAdminReadback = {
  contract_version: "1.0.0";
  schema_version: 1;
  registry_revision: number;
  generated_at: string;
  records: CapabilityTruthRecord[];
  claims: ProductClaimRecord[];
  installations: InstalledCapabilityRecord[];
  verification_receipts: CapabilityEvidenceReceipt[];
  dependencies: unknown[];
  transition_audit: unknown[];
};

export class ProductTruthValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductTruthValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertSafePositiveInteger(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new ProductTruthValidationError(`${field} must be a positive integer.`);
  }
}

function assertIsoTimestamp(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new ProductTruthValidationError(`${field} must be an ISO timestamp.`);
  }
}

export function validateFreshProductTruthProjection(
  value: unknown,
  expectedSurface: ProductClaimSurface,
  now = Date.now()
): PublicProductTruthProjection {
  try {
    assertPublicProductTruthProjection(value);
  } catch {
    throw new ProductTruthValidationError("Product Truth returned a malformed projection.");
  }

  if (value.environment !== "PRODUCTION" || value.surface !== expectedSurface) {
    throw new ProductTruthValidationError("Product Truth returned the wrong publication scope.");
  }

  const generatedAt = Date.parse(value.generated_at);
  const expiresAt = Date.parse(value.expires_at);
  if (generatedAt > now + 60_000 || expiresAt <= now) {
    throw new ProductTruthValidationError("Product Truth returned a stale projection.");
  }

  return value;
}

export async function loadMemberProductTruth(
  organizationId: string,
  surface: ProductClaimSurface,
  options: { signal?: AbortSignal } = {}
): Promise<PublicProductTruthProjection> {
  const value = await apiFetch<unknown>(
    `/member/organizations/${encodeURIComponent(organizationId)}/product-truth?surface=${encodeURIComponent(surface)}`,
    { signal: options.signal }
  );
  return validateFreshProductTruthProjection(value, surface);
}

export function validateCapabilityTruthAdminReadback(value: unknown): CapabilityTruthAdminReadback {
  if (!isRecord(value)) {
    throw new ProductTruthValidationError("Capability Truth returned a malformed admin readback.");
  }
  if (value.contract_version !== "1.0.0" || value.schema_version !== 1) {
    throw new ProductTruthValidationError("Capability Truth returned an unsupported admin contract.");
  }
  assertSafePositiveInteger(value.registry_revision, "registry_revision");
  assertIsoTimestamp(value.generated_at, "generated_at");
  if (
    !Array.isArray(value.records)
    || !Array.isArray(value.claims)
    || !Array.isArray(value.installations)
    || !Array.isArray(value.verification_receipts)
    || !Array.isArray(value.dependencies)
    || !Array.isArray(value.transition_audit)
  ) {
    throw new ProductTruthValidationError("Capability Truth returned incomplete admin evidence.");
  }

  try {
    value.records.forEach((record) => assertCapabilityTruthRecord(record as CapabilityTruthRecord));
    value.claims.forEach((claim) => assertProductClaimRecord(claim as ProductClaimRecord));
    value.installations.forEach((installation) => assertInstalledCapabilityRecord(installation as InstalledCapabilityRecord));
  } catch {
    throw new ProductTruthValidationError("Capability Truth returned malformed registry records.");
  }

  return value as CapabilityTruthAdminReadback;
}

export async function loadCapabilityTruthAdminReadback(
  options: { headers?: HeadersInit; signal?: AbortSignal } = {}
): Promise<CapabilityTruthAdminReadback> {
  const value = await apiFetch<unknown>("/admin/product-truth", {
    headers: options.headers,
    signal: options.signal
  });
  return validateCapabilityTruthAdminReadback(value);
}
