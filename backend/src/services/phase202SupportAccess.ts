import { createHash, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  assertSupportAccessTransitionReceipt,
  type SupportAccessGrantDescriptor,
  type SupportAccessTransitionReceipt
} from "@entral/contracts";
import { prisma, withTenantSession, type VerifiedTenantIdentity } from "../db.js";
import { env } from "../env.js";
import { evaluateBoundHumanAuthority } from "./phase202IdentityAuthority.js";

export class Phase202SupportAccessError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "Phase202SupportAccessError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

const tableScope = /^table:[A-Za-z][A-Za-z0-9]*:(read|write)$/u;
const supportReadableTables = new Set([
  "Agent", "AgentLog", "AgentMessage", "AgentSchedule", "AgentTask", "AiUsageEvent",
  "AutomationJob", "AutomationLog", "BusinessBoundary", "ClientMerchStore", "CommandOSReport",
  "CommandOSSnapshot", "Conversation", "CustomerRecordOwnership", "FacelessContentBrief",
  "FacelessContentPerformanceSnapshot", "FinancialBudgetReleasePacket", "FinancialLedgerEntry",
  "FinancialPayoutIntent", "FinancialReconciliationReport", "FinancialScalingBudgetPacket",
  "FinancialScalingExecutionEntry", "FinancialScalingSpendPacket", "FinancialSplitPolicy",
  "GrowthApprovalPacket", "MemberWorkspaceSnapshot", "Message", "PodProduct", "PortfolioCommandAction",
  "RevenueAssetControlRecord", "RevenueLaunchHandoffPacket", "RevenueMoneyArmyBatchRun",
  "RevenueOpportunity", "RevenuePerformanceSnapshot", "RevenueSignalConnectorApproval",
  "RevenueSignalImportJob", "ShopifyConnection", "ShopifyOAuthContinuation", "Task", "Team"
]);
const supportWritableTables = new Set([
  "Agent", "AgentLog", "AgentMessage", "AgentSchedule", "AgentTask", "AutomationJob", "AutomationLog",
  "CommandOSReport", "CommandOSSnapshot", "Conversation", "GrowthApprovalPacket", "MemberWorkspaceSnapshot",
  "Message", "PortfolioCommandAction", "RevenueSignalImportJob", "ShopifyOAuthContinuation", "Task"
]);

function assertOwner(identity: VerifiedTenantIdentity) {
  if (identity.role !== "OWNER") {
    throw new Phase202SupportAccessError("TENANT_OWNER_REQUIRED", "Tenant owner authority is required.", 403);
  }
}

function assertPurpose(value: string) {
  if (!value.trim() || value.length > 500 || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Phase202SupportAccessError("SUPPORT_PURPOSE_INVALID", "Support access purpose is invalid.");
  }
}

function assertScopes(scopes: readonly string[], mode: "read" | "write") {
  if (scopes.length === 0 || scopes.length > 50 || new Set(scopes).size !== scopes.length) {
    throw new Phase202SupportAccessError("SUPPORT_SCOPES_INVALID", "Support access requires unique bounded scopes.");
  }
  for (const scope of scopes) {
    const match = tableScope.exec(scope);
    const table = scope.split(":")[1];
    const allowed = mode === "read" ? supportReadableTables : supportWritableTables;
    if (!match || match[1] !== mode || !table || !allowed.has(table)) {
      throw new Phase202SupportAccessError("SUPPORT_SCOPES_INVALID", `Support ${mode} scopes must use table:<name>:${mode}.`);
    }
  }
}

export function supportAccessGrantDescriptor(row: {
  id: string;
  tenantId: string;
  organizationId: string;
  supportActorId: string;
  purpose: string;
  scopes: string[];
  accessMode: string;
  ownerVisible: boolean;
  approvedByActorId: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  writeElevationPurpose: string | null;
  writeElevationExpiresAt: Date | null;
}): SupportAccessGrantDescriptor {
  if (!row.ownerVisible) throw new Phase202SupportAccessError("SUPPORT_VISIBILITY_INVALID", "Support access must remain owner-visible.", 503);
  const now = new Date();
  const elevationActive = row.accessMode === "WRITE_ELEVATED"
    && row.writeElevationExpiresAt !== null
    && row.writeElevationExpiresAt > now
    && row.expiresAt > now
    && row.revokedAt === null;
  return {
    grant_id: row.id,
    tenant_id: row.tenantId,
    organization_id: row.organizationId,
    support_actor_id: row.supportActorId,
    purpose: row.purpose,
    scopes: elevationActive ? [...row.scopes] : row.scopes.filter((scope) => scope.endsWith(":read")),
    access_mode: elevationActive ? "WRITE_ELEVATED" : "READ_ONLY",
    write_elevation_purpose: row.writeElevationPurpose,
    write_elevation_expires_at: row.writeElevationExpiresAt?.toISOString() ?? null,
    owner_visible: true,
    approved_by_actor_id: row.approvedByActorId,
    issued_at: row.issuedAt.toISOString(),
    expires_at: row.expiresAt.toISOString(),
    revoked_at: row.revokedAt?.toISOString() ?? null
  };
}

type SupportGrantRow = Parameters<typeof supportAccessGrantDescriptor>[0] & { version: number };

export type SupportAccessMutationResult = {
  receipt: SupportAccessTransitionReceipt;
  replayed: boolean;
};

function assertIdempotencyKey(value: string) {
  if (typeof value !== "string" || value.length < 12 || value.length > 255 || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Phase202SupportAccessError("IDEMPOTENCY_KEY_INVALID", "A bounded idempotency key is required.");
  }
}

function requestFingerprint(value: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function actorReference(identity: VerifiedTenantIdentity, authSubject: string) {
  return {
    actor_id: identity.actorId,
    actor_type: "HUMAN" as const,
    human_user_id: authSubject,
    service_subject: null,
    agent_id: null
  };
}

function receiptFromStored(value: Prisma.JsonValue) {
  assertSupportAccessTransitionReceipt(value);
  return value;
}

function makeSupportReceipt(identity: VerifiedTenantIdentity, authSubject: string, input: {
  authorization: SupportAccessTransitionReceipt["authorization"];
  grant: SupportGrantRow;
  id: string;
  idempotencyKey: string;
  occurredAt: Date;
  priorVersion: number;
  requestId: string;
  team: { dataResidency: string; environment: string };
  transition: SupportAccessTransitionReceipt["transition"];
}): SupportAccessTransitionReceipt {
  const receipt: SupportAccessTransitionReceipt = {
    contract_version: "1.0.0",
    schema_version: 1,
    transition_id: input.id,
    transition: input.transition,
    ownership: {
      scope_kind: "TENANT",
      organization_id: identity.organizationId,
      tenant_id: identity.tenantId,
      business_id: null,
      environment: input.team.environment as "DEVELOPMENT" | "STAGING" | "PRODUCTION",
      data_residency: input.team.dataResidency
    },
    actor: actorReference(identity, authSubject),
    grant_id: input.grant.id,
    support_actor_id: input.grant.supportActorId,
    request_id: input.requestId,
    idempotency_key: input.idempotencyKey,
    prior_version: input.priorVersion,
    resulting_version: input.grant.version,
    authorization: input.authorization,
    grant: supportAccessGrantDescriptor(input.grant),
    budget: { kind: "NO_EXTERNAL_SPEND", amount_minor_units: 0 },
    reversible: input.transition !== "REVOKE",
    verification: "TRANSACTIONAL_READBACK",
    reconciliation: "IDEMPOTENT_RECEIPT",
    failure_behavior: "NO_PARTIAL_WRITE",
    evidence: [
      `support-grant:${input.grant.id}:version:${input.grant.version}`,
      `tenant-assignment:${identity.tenantId}:${identity.actorId}`
    ],
    occurred_at: input.occurredAt.toISOString(),
    release_version: "phase-202"
  };
  assertSupportAccessTransitionReceipt(receipt);
  return receipt;
}

async function persistSupportReceipt(
  transaction: Prisma.TransactionClient,
  identity: VerifiedTenantIdentity,
  fingerprint: string,
  receipt: SupportAccessTransitionReceipt
) {
  await transaction.supportAccessAudit.create({
    data: {
      id: receipt.transition_id,
      grantId: receipt.grant_id,
      organizationId: identity.organizationId,
      tenantId: identity.tenantId,
      actorId: identity.actorId,
      action: receipt.transition,
      targetType: "support_access_grant",
      targetId: receipt.grant_id,
      outcome: "SUCCEEDED",
      requestId: receipt.request_id,
      idempotencyKey: receipt.idempotency_key,
      requestFingerprint: fingerprint,
      priorVersion: receipt.prior_version,
      resultingVersion: receipt.resulting_version,
      resultPayload: receipt as unknown as Prisma.InputJsonValue,
      releaseVersion: receipt.release_version,
      purpose: receipt.grant.write_elevation_purpose ?? receipt.grant.purpose,
      scopes: [...receipt.grant.scopes],
      accessMode: receipt.grant.access_mode,
      effectiveExpiresAt: new Date(receipt.grant.write_elevation_expires_at ?? receipt.grant.expires_at),
      occurredAt: new Date(receipt.occurred_at)
    }
  });
}

async function executeSupportMutation(input: {
  actionReason: string;
  authSubject: string;
  fingerprint: string;
  idempotencyKey: string;
  requestId: string;
  tenantId: string;
  transition: SupportAccessTransitionReceipt["transition"];
}, database: PrismaClient, operation: (
  transaction: Prisma.TransactionClient,
  identity: VerifiedTenantIdentity
) => Promise<SupportAccessMutationResult>) {
  assertIdempotencyKey(input.idempotencyKey);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await withTenantSession(database, {
        authSubject: input.authSubject,
        tenantId: input.tenantId,
        actionReason: input.actionReason,
        requestId: input.requestId
      }, async (transaction, identity) => {
        assertOwner(identity);
        const stored = await transaction.supportAccessAudit.findUnique({
          where: { tenantId_idempotencyKey: { tenantId: identity.tenantId, idempotencyKey: input.idempotencyKey } }
        });
        if (stored) {
          if (stored.actorId !== identity.actorId || stored.action !== input.transition || stored.requestFingerprint !== input.fingerprint) {
            throw new Phase202SupportAccessError("IDEMPOTENCY_KEY_REUSED", "The idempotency key was already used for a different support transition.", 409);
          }
          return { receipt: receiptFromStored(stored.resultPayload), replayed: true };
        }
        return operation(transaction, identity);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError
        && (error.code === "P2002" || error.code === "P2034");
      if (!retryable || attempt === 2) throw error;
    }
  }
  throw new Phase202SupportAccessError("SUPPORT_TRANSITION_RETRY_EXHAUSTED", "The support transition could not be reconciled.", 503);
}

async function requireTeamScope(transaction: Prisma.TransactionClient, identity: VerifiedTenantIdentity) {
  const team = await transaction.team.findUnique({ where: { tenantId: identity.tenantId } });
  if (!team || team.organizationId !== identity.organizationId) {
    throw new Phase202SupportAccessError("TENANT_SCOPE_INVALID", "The support transition tenant scope is invalid.", 404);
  }
  return team;
}

export async function issueSupportAccess(input: {
  authSubject: string;
  expiresAt: Date;
  idempotencyKey: string;
  purpose: string;
  readScopes: string[];
  requestId: string;
  supportActorId: string;
  tenantId: string;
}, database: PrismaClient = prisma) {
  assertPurpose(input.purpose);
  assertScopes(input.readScopes, "read");
  const normalizedPurpose = input.purpose.trim();
  const normalizedScopes = [...input.readScopes].sort();
  const fingerprint = requestFingerprint({
    transition: "ISSUE_READ_ONLY",
    authSubject: input.authSubject,
    tenantId: input.tenantId,
    supportActorId: input.supportActorId,
    purpose: normalizedPurpose,
    scopes: normalizedScopes,
    expiresAt: input.expiresAt.toISOString()
  });
  return executeSupportMutation({ ...input, actionReason: "support.access.issue", fingerprint, transition: "ISSUE_READ_ONLY" }, database, async (transaction, identity) => {
    const now = new Date();
    if (input.expiresAt <= now || input.expiresAt.getTime() - now.getTime() > 24 * 60 * 60 * 1000) {
      throw new Phase202SupportAccessError("SUPPORT_EXPIRY_INVALID", "Support access must expire within 24 hours.");
    }
    const team = await requireTeamScope(transaction, identity);
    const assigned = await transaction.$queryRaw<Array<{ assigned: boolean }>>`
      SELECT entral.phase202_assign_support_actor(
        ${input.supportActorId}::uuid,${identity.tenantId}::uuid,${identity.organizationId}::uuid
      ) AS "assigned"
    `;
    if (assigned[0]?.assigned !== true) throw new Phase202SupportAccessError("SUPPORT_ACTOR_INVALID", "The support actor is not eligible.", 404);
    const grant = await transaction.supportAccessGrant.create({
      data: {
        organizationId: identity.organizationId,
        tenantId: identity.tenantId,
        supportActorId: input.supportActorId,
        approvedByActorId: identity.actorId,
        purpose: normalizedPurpose,
        scopes: normalizedScopes,
        accessMode: "READ_ONLY",
        ownerVisible: true,
        version: 1,
        issuedAt: now,
        expiresAt: input.expiresAt
      }
    });
    const receipt = makeSupportReceipt(identity, input.authSubject, {
      authorization: "OWNER",
      grant,
      id: randomUUID(),
      idempotencyKey: input.idempotencyKey,
      occurredAt: now,
      priorVersion: 0,
      requestId: input.requestId,
      team,
      transition: "ISSUE_READ_ONLY"
    });
    await persistSupportReceipt(transaction, identity, fingerprint, receipt);
    return { receipt, replayed: false };
  });
}

export async function elevateSupportAccess(input: {
  authSubject: string;
  expiresAt: Date;
  grantId: string;
  idempotencyKey: string;
  purpose: string;
  requestId: string;
  sessionId: string;
  tenantId: string;
  writeScopes: string[];
}, database: PrismaClient = prisma) {
  assertPurpose(input.purpose);
  assertScopes(input.writeScopes, "write");
  const normalizedPurpose = input.purpose.trim();
  const normalizedScopes = [...input.writeScopes].sort();
  const fingerprint = requestFingerprint({
    transition: "ELEVATE_WRITE",
    authSubject: input.authSubject,
    tenantId: input.tenantId,
    grantId: input.grantId,
    sessionId: input.sessionId,
    purpose: normalizedPurpose,
    scopes: normalizedScopes,
    expiresAt: input.expiresAt.toISOString()
  });
  return executeSupportMutation({ ...input, actionReason: "support.access.elevate", fingerprint, transition: "ELEVATE_WRITE" }, database, async (transaction, identity) => {
    const now = new Date();
    const session = await transaction.authSession.findFirst({
      where: {
        id: input.sessionId,
        userId: input.authSubject,
        actorId: identity.actorId,
        organizationId: identity.organizationId,
        tenantId: identity.tenantId,
        revokedAt: null,
        expiresAt: { gt: now }
      },
      select: { accountSessionVersion: true, stepUpAt: true, User: { select: { sessionVersion: true } } }
    });
    const stepUpAt = session?.stepUpAt?.getTime() ?? 0;
    const stepUpVerified = Boolean(session
      && session.accountSessionVersion === session.User.sessionVersion
      && stepUpAt > 0 && stepUpAt <= now.getTime()
      && now.getTime() - stepUpAt <= env.MFA_STEP_UP_TTL_SECONDS * 1000);
    const authority = await evaluateBoundHumanAuthority(transaction, identity, {
      action: "support.access.elevate",
      actionRisk: "HIGH",
      authSubject: input.authSubject,
      authorityDomain: "SUPPORT",
      dataClassification: "RESTRICTED",
      requestId: input.requestId,
      stepUpVerified
    });
    if (authority.decision !== "ALLOW") throw new Phase202SupportAccessError(authority.reason_code, "Support elevation authority was denied.", 403);
    const team = await requireTeamScope(transaction, identity);
    const grant = await transaction.supportAccessGrant.findFirst({
      where: { id: input.grantId, tenantId: identity.tenantId, organizationId: identity.organizationId }
    });
    if (!grant || grant.revokedAt || grant.expiresAt <= now) throw new Phase202SupportAccessError("SUPPORT_GRANT_INACTIVE", "The support access grant is inactive.", 404);
    if (input.expiresAt <= now || input.expiresAt > grant.expiresAt || input.expiresAt.getTime() - now.getTime() > 60 * 60 * 1000) {
      throw new Phase202SupportAccessError("SUPPORT_WRITE_EXPIRY_INVALID", "Write elevation must expire within one hour and before the grant.");
    }
    const scopes = [...new Set([...grant.scopes.filter((scope) => scope.endsWith(":read")), ...normalizedScopes])];
    const updatedCount = await transaction.supportAccessGrant.updateMany({
      where: { id: grant.id, tenantId: identity.tenantId, version: grant.version, revokedAt: null },
      data: {
        scopes,
        accessMode: "WRITE_ELEVATED",
        writeElevatedAt: now,
        writeElevatedByActorId: identity.actorId,
        writeElevationPurpose: normalizedPurpose,
        writeElevationExpiresAt: input.expiresAt,
        version: { increment: 1 }
      }
    });
    if (updatedCount.count !== 1) throw new Phase202SupportAccessError("SUPPORT_GRANT_CONFLICT", "The support grant changed.", 409);
    const updated = await transaction.supportAccessGrant.findUnique({ where: { id: grant.id } });
    if (!updated || updated.version !== grant.version + 1) throw new Phase202SupportAccessError("SUPPORT_GRANT_READBACK_FAILED", "The support grant readback failed.", 503);
    const receipt = makeSupportReceipt(identity, input.authSubject, {
      authorization: "OWNER_RECENT_MFA_STEP_UP",
      grant: updated,
      id: randomUUID(),
      idempotencyKey: input.idempotencyKey,
      occurredAt: now,
      priorVersion: grant.version,
      requestId: input.requestId,
      team,
      transition: "ELEVATE_WRITE"
    });
    await persistSupportReceipt(transaction, identity, fingerprint, receipt);
    return { receipt, replayed: false };
  });
}

export async function revokeSupportAccess(input: {
  authSubject: string;
  grantId: string;
  idempotencyKey: string;
  requestId: string;
  tenantId: string;
}, database: PrismaClient = prisma) {
  const fingerprint = requestFingerprint({
    transition: "REVOKE",
    authSubject: input.authSubject,
    tenantId: input.tenantId,
    grantId: input.grantId
  });
  return executeSupportMutation({ ...input, actionReason: "support.access.revoke", fingerprint, transition: "REVOKE" }, database, async (transaction, identity) => {
    const team = await requireTeamScope(transaction, identity);
    const grant = await transaction.supportAccessGrant.findFirst({
      where: { id: input.grantId, tenantId: identity.tenantId, organizationId: identity.organizationId }
    });
    if (!grant) throw new Phase202SupportAccessError("SUPPORT_GRANT_NOT_FOUND", "The support access grant was not found.", 404);
    if (grant.revokedAt) throw new Phase202SupportAccessError("SUPPORT_GRANT_INACTIVE", "The support access grant is already revoked.", 409);
    const now = new Date();
    const updatedCount = await transaction.supportAccessGrant.updateMany({
      where: { id: grant.id, tenantId: identity.tenantId, version: grant.version, revokedAt: null },
      data: { revokedAt: now, version: { increment: 1 } }
    });
    if (updatedCount.count !== 1) throw new Phase202SupportAccessError("SUPPORT_GRANT_CONFLICT", "The support grant changed.", 409);
    const revoked = await transaction.supportAccessGrant.findUnique({ where: { id: grant.id } });
    if (!revoked || revoked.version !== grant.version + 1 || !revoked.revokedAt) {
      throw new Phase202SupportAccessError("SUPPORT_GRANT_READBACK_FAILED", "The support grant readback failed.", 503);
    }
    const revokedSessionRows = await transaction.$queryRaw<Array<{ revokedCount: number }>>`
      SELECT entral.phase202_revoke_support_grant_sessions(
        ${grant.id}::uuid,
        ${identity.actorId}::uuid,
        ${identity.tenantId}::uuid,
        ${identity.organizationId}::uuid,
        ${now}::timestamptz
      ) AS "revokedCount"
    `;
    if (!Number.isInteger(revokedSessionRows[0]?.revokedCount) || revokedSessionRows[0]!.revokedCount < 0) {
      throw new Phase202SupportAccessError(
        "SUPPORT_SESSION_REVOCATION_FAILED",
        "Support grant session revocation could not be verified.",
        503
      );
    }
    const otherActive = await transaction.supportAccessGrant.count({
      where: { supportActorId: grant.supportActorId, tenantId: identity.tenantId, revokedAt: null, expiresAt: { gt: now }, id: { not: grant.id } }
    });
    if (otherActive === 0) {
      await transaction.tenantActorAssignment.updateMany({
        where: { actorId: grant.supportActorId, tenantId: identity.tenantId, role: "SUPPORT", status: "ACTIVE" },
        data: { status: "REVOKED", version: { increment: 1 } }
      });
    }
    const receipt = makeSupportReceipt(identity, input.authSubject, {
      authorization: "OWNER",
      grant: revoked,
      id: randomUUID(),
      idempotencyKey: input.idempotencyKey,
      occurredAt: now,
      priorVersion: grant.version,
      requestId: input.requestId,
      team,
      transition: "REVOKE"
    });
    await persistSupportReceipt(transaction, identity, fingerprint, receipt);
    return { receipt, replayed: false };
  });
}

export async function listSupportAccess(authSubject: string, tenantId: string, database: PrismaClient = prisma) {
  return withTenantSession(database, {
    authSubject,
    tenantId,
    actionReason: "support.access.read"
  }, async (transaction, identity) => {
    if (identity.role !== "OWNER" && identity.role !== "TENANT_ADMIN") {
      throw new Phase202SupportAccessError("SUPPORT_VISIBILITY_DENIED", "Owner or tenant administrator authority is required.", 403);
    }
    const grants = await transaction.supportAccessGrant.findMany({
      where: { tenantId: identity.tenantId, organizationId: identity.organizationId, ownerVisible: true },
      orderBy: { issuedAt: "desc" }
    });
    return grants.map(supportAccessGrantDescriptor);
  });
}

export async function consumeTenantRateLimit(input: {
  authSubject: string;
  bucket: string;
  limit: number;
  requestId: string;
  tenantId: string;
  windowSeconds: number;
}, database: PrismaClient = prisma) {
  if (!/^[a-z0-9][a-z0-9._:-]{0,79}$/u.test(input.bucket)
    || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 10_000
    || !Number.isInteger(input.windowSeconds) || input.windowSeconds < 1 || input.windowSeconds > 86_400) {
    throw new Phase202SupportAccessError("TENANT_RATE_LIMIT_INVALID", "Tenant rate-limit policy is invalid.", 500);
  }
  const epoch = Math.floor(Date.now() / 1000);
  const windowStartedAt = new Date((epoch - (epoch % input.windowSeconds)) * 1000);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await withTenantSession(database, {
        authSubject: input.authSubject,
        tenantId: input.tenantId,
        actionReason: "tenant.rate_limit.consume",
        requestId: input.requestId
      }, async (transaction, identity) => {
        const existing = await transaction.tenantRateLimitReceipt.findUnique({
          where: {
            tenantId_bucket_windowStartedAt_requestId: {
              tenantId: identity.tenantId,
              bucket: input.bucket,
              windowStartedAt,
              requestId: input.requestId
            }
          }
        });
        if (existing) {
          if (existing.organizationId !== identity.organizationId || existing.actorId !== identity.actorId) {
            throw new Phase202SupportAccessError(
              "TENANT_RATE_LIMIT_IDEMPOTENCY_SCOPE_MISMATCH",
              "Tenant rate-limit idempotency scope is invalid.",
              409
            );
          }
          return {
            blocked: existing.blocked,
            limit: existing.limit,
            requestCount: existing.requestCount,
            windowStartedAt: existing.windowStartedAt
          };
        }
        const window = await transaction.tenantRateLimitWindow.upsert({
          where: { tenantId_bucket_windowStartedAt: { tenantId: identity.tenantId, bucket: input.bucket, windowStartedAt } },
          create: {
            organizationId: identity.organizationId,
            tenantId: identity.tenantId,
            bucket: input.bucket,
            windowStartedAt,
            requestCount: 1,
            limit: input.limit
          },
          update: { requestCount: { increment: 1 }, limit: input.limit }
        });
        if (window.organizationId !== identity.organizationId) {
          throw new Phase202SupportAccessError("TENANT_RATE_LIMIT_SCOPE_MISMATCH", "Tenant rate-limit scope is invalid.", 503);
        }
        const blocked = window.requestCount > input.limit;
        await transaction.tenantRateLimitReceipt.create({
          data: {
            organizationId: identity.organizationId,
            tenantId: identity.tenantId,
            actorId: identity.actorId,
            bucket: input.bucket,
            windowStartedAt,
            requestCount: window.requestCount,
            limit: input.limit,
            blocked,
            requestId: input.requestId
          }
        });
        return { blocked, limit: input.limit, requestCount: window.requestCount, windowStartedAt };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError
        && (error.code === "P2002" || error.code === "P2034");
      if (!retryable || attempt === 2) throw error;
    }
  }
  throw new Phase202SupportAccessError("TENANT_RATE_LIMIT_RETRY_EXHAUSTED", "Tenant rate-limit retry was exhausted.", 503);
}
