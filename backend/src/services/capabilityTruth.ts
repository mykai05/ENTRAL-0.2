import { randomUUID } from "node:crypto";
import {
  assertCapabilityLifecycleTransitionRequest,
  assertCapabilityTruthRecord,
  assertInstalledCapabilityRecord,
  assertProductClaimRecord,
  assertPublicProductTruthProjection,
  type CapabilityEvidenceReceipt,
  type CapabilityEnvironment,
  type CapabilityLifecycleTransitionRequest,
  type CapabilityTruthRecord,
  type InstalledCapabilityRecord,
  type ProductClaimRecord,
  type ProductClaimSurface,
  type PublicProductClaim,
  type PublicProductTruthProjection
} from "@entral/contracts";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma, withPersonalSession, withTenantSession } from "../db.js";

type PublicationProjectionRow = { claims: unknown; registryRevision: bigint | number };
type JsonValueRow = { value: unknown };

export type CapabilityEvidenceRegistration = {
  capability_id: string;
  expected_record_version: number;
  receipt: CapabilityEvidenceReceipt;
  idempotency_key: string;
};

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

export type CapabilityTruthAdminContext = {
  authSubject: string;
  requestId: string;
};

export type CapabilityTruthMemberContext = {
  authSubject: string;
  organizationId: string;
  requestId: string;
  tenantId: string;
};

export class CapabilityTruthServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number
  ) {
    super(message);
    this.name = "CapabilityTruthServiceError";
  }
}

function isoNow(clock: () => Date) {
  return clock().toISOString();
}

function expiresAt(generatedAt: string) {
  return new Date(Date.parse(generatedAt) + 5 * 60 * 1_000).toISOString();
}

function publicClaim(value: unknown): PublicProductClaim {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CapabilityTruthServiceError("MALFORMED_PRODUCT_TRUTH", "Product Truth returned a malformed claim.", 503);
  }
  return value as PublicProductClaim;
}

function publicationClaims(value: unknown): PublicProductClaim[] {
  if (!Array.isArray(value)) {
    throw new CapabilityTruthServiceError("MALFORMED_PRODUCT_TRUTH", "Product Truth returned malformed claims.", 503);
  }
  return value.map(publicClaim);
}

function validateAdminReadback(value: unknown): CapabilityTruthAdminReadback {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CapabilityTruthServiceError("MALFORMED_ADMIN_READBACK", "Capability Truth admin readback is malformed.", 500);
  }
  const readback = value as Partial<CapabilityTruthAdminReadback>;
  if (
    readback.contract_version !== "1.0.0"
    || readback.schema_version !== 1
    || typeof readback.registry_revision !== "number"
    || !Number.isSafeInteger(readback.registry_revision)
    || readback.registry_revision < 1
    || typeof readback.generated_at !== "string"
    || Number.isNaN(Date.parse(readback.generated_at))
    || !Array.isArray(readback.records)
    || !Array.isArray(readback.claims)
    || !Array.isArray(readback.installations)
    || !Array.isArray(readback.verification_receipts)
    || !Array.isArray(readback.dependencies)
    || !Array.isArray(readback.transition_audit)
  ) {
    throw new CapabilityTruthServiceError("MALFORMED_ADMIN_READBACK", "Capability Truth admin readback is malformed.", 500);
  }
  readback.records.forEach(assertCapabilityTruthRecord);
  readback.claims.forEach(assertProductClaimRecord);
  readback.installations.forEach(assertInstalledCapabilityRecord);
  return readback as CapabilityTruthAdminReadback;
}

function databaseFailure(error: unknown): CapabilityTruthServiceError {
  if (error instanceof CapabilityTruthServiceError) return error;
  const message = error instanceof Error ? error.message : "";
  const metadataCode = typeof error === "object" && error !== null && "meta" in error
    && typeof error.meta === "object" && error.meta !== null && "code" in error.meta
    && typeof error.meta.code === "string"
    ? error.meta.code
    : null;
  const directCode = typeof error === "object" && error !== null && "code" in error
    && typeof error.code === "string" && error.code !== "P2010"
    ? error.code
    : null;
  const sqlState = metadataCode ?? directCode;
  if (sqlState === "P0002") {
    return new CapabilityTruthServiceError("CAPABILITY_NOT_FOUND", "Capability not found.", 404);
  }
  if (sqlState === "40001" || sqlState === "23505") {
    return new CapabilityTruthServiceError(
      sqlState === "40001" ? "CAPABILITY_REVISION_CONFLICT" : "CAPABILITY_IDEMPOTENCY_CONFLICT",
      "Capability Truth state changed or the idempotency key conflicts.",
      409
    );
  }
  if (sqlState === "42501") {
    return new CapabilityTruthServiceError("CAPABILITY_AUTHORITY_REQUIRED", "Active Human authority is required.", 403);
  }
  if (sqlState === "22023" || sqlState === "23514") {
    return new CapabilityTruthServiceError("CAPABILITY_REQUIREMENTS_UNSATISFIED", "Capability Truth requirements are not satisfied.", 422);
  }
  const boundedCode = [
    "ACTIVE_HUMAN_ACTOR_REQUIRED",
    "CAPABILITY_NOT_FOUND",
    "CAPABILITY_REVISION_CONFLICT",
    "CAPABILITY_TRANSITION_DENIED",
    "CAPABILITY_EVIDENCE_INVALID",
    "CAPABILITY_IDEMPOTENCY_CONFLICT",
    "CAPABILITY_AUTHORITY_REQUIRED"
  ].find((code) => message.includes(code));
  if (boundedCode === "CAPABILITY_NOT_FOUND") {
    return new CapabilityTruthServiceError(boundedCode, "Capability not found.", 404);
  }
  if (boundedCode === "CAPABILITY_REVISION_CONFLICT" || boundedCode === "CAPABILITY_IDEMPOTENCY_CONFLICT") {
    return new CapabilityTruthServiceError(boundedCode, "Capability Truth state changed or the idempotency key conflicts.", 409);
  }
  if (boundedCode === "CAPABILITY_AUTHORITY_REQUIRED" || boundedCode === "ACTIVE_HUMAN_ACTOR_REQUIRED") {
    return new CapabilityTruthServiceError("CAPABILITY_AUTHORITY_REQUIRED", "Active Human authority is required.", 403);
  }
  if (boundedCode === "CAPABILITY_TRANSITION_DENIED" || boundedCode === "CAPABILITY_EVIDENCE_INVALID") {
    return new CapabilityTruthServiceError(boundedCode, "Capability Truth requirements are not satisfied.", 422);
  }
  return new CapabilityTruthServiceError("PRODUCT_TRUTH_UNAVAILABLE", "Capability Truth is temporarily unavailable.", 503);
}

export class CapabilityTruthService {
  constructor(
    private readonly database: PrismaClient = prisma,
    private readonly clock: () => Date = () => new Date()
  ) {}

  private projection(
    claims: PublicProductClaim[],
    surface: ProductClaimSurface,
    environment: CapabilityEnvironment,
    registryRevision: bigint | number
  ): PublicProductTruthProjection {
    const generatedAt = isoNow(this.clock);
    const projection: PublicProductTruthProjection = {
      contract_version: "1.0.0",
      schema_version: 1,
      projection_id: randomUUID(),
      environment,
      surface,
      registry_revision: Number(registryRevision),
      generated_at: generatedAt,
      expires_at: expiresAt(generatedAt),
      claims
    };
    assertPublicProductTruthProjection(projection);
    return projection;
  }

  async getPublicProjection(
    surface: ProductClaimSurface,
    environment: CapabilityEnvironment = "PRODUCTION"
  ): Promise<PublicProductTruthProjection> {
    try {
      const rows = await this.database.$queryRaw<PublicationProjectionRow[]>(Prisma.sql`
        SELECT COALESCE(jsonb_agg(gate."claim"),'[]'::jsonb) AS "claims",
               entral.phase203_registry_revision() AS "registryRevision"
        FROM entral.phase203_publication_gate(
          ${surface}::text, ${environment}::text, NULL::uuid, NULL::uuid
        ) gate
      `);
      const row = rows[0];
      if (!row) throw new CapabilityTruthServiceError("MALFORMED_PRODUCT_TRUTH", "Product Truth returned no projection.", 503);
      return this.projection(publicationClaims(row.claims), surface, environment, row.registryRevision);
    } catch (error) {
      throw databaseFailure(error);
    }
  }

  async getMemberProjection(
    context: CapabilityTruthMemberContext,
    surface: ProductClaimSurface,
    environment: CapabilityEnvironment = "PRODUCTION"
  ): Promise<PublicProductTruthProjection> {
    try {
      return await withTenantSession(this.database, {
        actionReason: `Read receipt-bound Product Truth for ${surface}.`,
        authSubject: context.authSubject,
        requestId: context.requestId,
        tenantId: context.tenantId
      }, async (transaction, identity) => {
        if (identity.tenantId !== context.tenantId || identity.organizationId !== context.organizationId) {
          throw new CapabilityTruthServiceError("TENANT_ACTOR_BINDING_MISMATCH", "Tenant context does not match.", 403);
        }
        const rows = await transaction.$queryRaw<PublicationProjectionRow[]>(Prisma.sql`
          SELECT COALESCE(jsonb_agg(gate."claim"),'[]'::jsonb) AS "claims",
                 entral.phase203_registry_revision() AS "registryRevision"
          FROM entral.phase203_publication_gate(
            ${surface}::text, ${environment}::text,
            ${identity.tenantId}::uuid, ${identity.organizationId}::uuid
          ) gate
        `);
        const row = rows[0];
        if (!row) throw new CapabilityTruthServiceError("MALFORMED_PRODUCT_TRUTH", "Product Truth returned no projection.", 503);
        return this.projection(publicationClaims(row.claims), surface, environment, row.registryRevision);
      });
    } catch (error) {
      throw databaseFailure(error);
    }
  }

  async getAdminReadback(context: CapabilityTruthAdminContext): Promise<CapabilityTruthAdminReadback> {
    try {
      return await withPersonalSession(this.database, {
        actionReason: "Read the internal Capability Truth Registry.",
        authSubject: context.authSubject,
        requestId: context.requestId
      }, async (transaction) => {
        const rows = await transaction.$queryRaw<JsonValueRow[]>`
          SELECT entral.phase203_admin_readback() AS "value"
        `;
        return validateAdminReadback(rows[0]?.value);
      });
    } catch (error) {
      throw databaseFailure(error);
    }
  }

  async recordEvidence(
    context: CapabilityTruthAdminContext,
    registration: CapabilityEvidenceRegistration
  ): Promise<unknown> {
    try {
      return await withPersonalSession(this.database, {
        actionReason: "Record immutable Capability Truth verification evidence.",
        authSubject: context.authSubject,
        requestId: context.requestId
      }, async (transaction) => {
        const rows = await transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
          SELECT entral.phase203_record_capability_evidence(
            ${registration.capability_id}::uuid,
            ${registration.expected_record_version}::bigint,
            ${JSON.stringify(registration.receipt)}::jsonb,
            ${registration.idempotency_key}::text
          ) AS "value"
        `);
        return rows[0]?.value;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      throw databaseFailure(error);
    }
  }

  async transition(
    context: CapabilityTruthAdminContext,
    request: CapabilityLifecycleTransitionRequest
  ): Promise<unknown> {
    assertCapabilityLifecycleTransitionRequest(request);
    try {
      return await withPersonalSession(this.database, {
        actionReason: request.reason,
        authSubject: context.authSubject,
        requestId: context.requestId
      }, async (transaction, identity) => {
        if (request.actor_id !== identity.actorId) {
          throw new CapabilityTruthServiceError(
            "CAPABILITY_AUTHORITY_MISMATCH",
            "Transition actor must match the authenticated Human actor.",
            403
          );
        }
        const rows = await transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
          SELECT entral.phase203_transition_capability(${JSON.stringify(request)}::jsonb) AS "value"
        `);
        return rows[0]?.value;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      throw databaseFailure(error);
    }
  }
}

export const capabilityTruthService = new CapabilityTruthService();
