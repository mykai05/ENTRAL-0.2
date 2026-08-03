import {
  assertCapabilityTruthAdminReadback,
  assertPublicProductTruthProjection,
  type CapabilityTruthAdminReadback,
  type ProductClaimSurface,
  type PublicProductTruthProjection
} from "@entral/contracts";
import { apiFetch } from "./api";

export type { CapabilityTruthAdminReadback };

export class ProductTruthValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductTruthValidationError";
  }
}

const MAX_PRODUCT_TRUTH_AGE_MS = 5 * 60_000;

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
  if (
    generatedAt > now + 60_000
    || expiresAt <= now
    || expiresAt <= generatedAt
    || now - generatedAt > MAX_PRODUCT_TRUTH_AGE_MS
    || expiresAt - generatedAt > MAX_PRODUCT_TRUTH_AGE_MS
  ) {
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
  try {
    assertCapabilityTruthAdminReadback(value);
  } catch {
    throw new ProductTruthValidationError("Capability Truth returned malformed registry records.");
  }
  return value;
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
