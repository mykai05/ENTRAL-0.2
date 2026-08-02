import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient, type User } from "@prisma/client";
import {
  assertSupportSessionReadback,
  assertSessionTransitionReceipt,
  type SessionTransitionReceipt,
  type SupportSessionReadback
} from "@entral/contracts";
import { env } from "../env.js";
import {
  bindSupportGrantContext,
  prisma,
  withPersonalSession,
  withSupportSession,
  type VerifiedSupportIdentity
} from "../db.js";
import { signAuthToken } from "../auth.js";
import { recordAuditLog } from "./audit.js";
import { normalizeUserRole } from "./users.js";
import { supportAccessGrantDescriptor } from "./phase202SupportAccess.js";

export type SessionIssueMetadata = {
  ipAddress?: string;
  requestId: string;
  requestedTenantId?: string;
  supportGrantId?: string;
  userAgent?: string;
};

export type IssuedSession = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
};

export class Phase202SessionError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "Phase202SessionError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function hashValue(value: string, domain = "refresh-token") {
  return createHmac("sha256", env.JWT_SECRET).update(`${domain}\0${value}`).digest("hex");
}

function safeDeviceLabel(userAgent = "") {
  const browser = /Edg\//.test(userAgent) ? "Edge"
    : /Chrome\//.test(userAgent) ? "Chrome"
      : /Firefox\//.test(userAgent) ? "Firefox"
        : /Safari\//.test(userAgent) ? "Safari"
          : "Browser";
  const platform = /Windows/i.test(userAgent) ? "Windows"
    : /Android/i.test(userAgent) ? "Android"
      : /iPhone|iPad/i.test(userAgent) ? "iOS"
        : /Mac OS/i.test(userAgent) ? "macOS"
          : /Linux/i.test(userAgent) ? "Linux"
            : "Unknown device";
  return `${browser} on ${platform}`;
}

function refreshExpiry(now = new Date()) {
  return new Date(now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function newRefreshToken(sessionId: string, version: number, supportGrantId?: string | null) {
  const secret = randomBytes(48).toString("base64url");
  const token = supportGrantId
    ? `${sessionId}.${version}.${supportGrantId}.${secret}`
    : `${sessionId}.${version}.${secret}`;
  return { token, tokenHash: hashValue(token, "refresh-token") };
}

function supportGrantFromRefreshToken(refreshToken: string) {
  const parts = refreshToken.split(".");
  const candidate = parts.length === 4 ? parts[2] : null;
  return candidate && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(candidate)
    ? candidate
    : null;
}

export function durableSessionsAvailable() {
  const candidate = prisma as unknown as { authSession?: { create?: unknown } };
  return env.NODE_ENV !== "test" || typeof candidate.authSession?.create === "function";
}

export async function issueDurableSession(
  user: Pick<User, "id" | "email" | "role" | "sessionVersion">,
  sessionType: "internal" | "member" | "support",
  metadata: SessionIssueMetadata,
  database: PrismaClient = prisma
): Promise<IssuedSession> {
  const now = new Date();
  const sessionId = randomUUID();
  const accessTokenId = randomUUID();
  const refresh = newRefreshToken(sessionId, 1, sessionType === "support" ? metadata.supportGrantId : null);
  if (sessionType === "support" && !metadata.supportGrantId) throw new Error("SUPPORT_GRANT_REQUIRED");
  if (sessionType !== "support" && metadata.supportGrantId) throw new Error("SUPPORT_GRANT_SCOPE_INVALID");

  type IssueIdentity = {
    actorId: string;
    appUserId: string;
    organizationId?: string;
    tenantId?: string;
    supportGrantId?: string;
    grantExpiresAt?: Date;
  };
  const issue = async (transaction: Prisma.TransactionClient, identity: IssueIdentity) => {
    const memberships = sessionType === "member" ? await transaction.teamMember.findMany({
      where: { userId: user.id, status: "ACTIVE", ...(metadata.requestedTenantId ? { tenantId: metadata.requestedTenantId } : {}) },
      select: { organizationId: true, tenantId: true, teamId: true, role: true }
    }) : [];
    if (sessionType === "member" && memberships.length === 0) throw new Error("MEMBER_TENANT_REQUIRED");
    if (sessionType === "member" && memberships.length > 1) throw new Error("TENANT_SELECTION_REQUIRED");
    const membership = memberships[0] ?? null;
    if (membership && (!membership.organizationId || !membership.tenantId)) throw new Error("MEMBERSHIP_OWNERSHIP_INCOMPLETE");
    const support = sessionType === "support" ? identity as VerifiedSupportIdentity : null;
    if (support && support.supportGrantId !== metadata.supportGrantId) throw new Error("ACTIVE_SUPPORT_GRANT_REQUIRED");
    const organizationId = support?.organizationId ?? membership?.organizationId ?? null;
    const tenantId = support?.tenantId ?? membership?.tenantId ?? null;
    const supportGrantId = support?.supportGrantId ?? null;
    const expiresAt = support
      ? new Date(Math.min(refreshExpiry(now).getTime(), support.grantExpiresAt.getTime()))
      : refreshExpiry(now);
    if (expiresAt.getTime() <= now.getTime()) throw new Error("ACTIVE_SUPPORT_GRANT_REQUIRED");
    if (membership) {
      await transaction.$queryRaw`
        SELECT set_config('app.tenant_id',${membership.tenantId!},true),
               set_config('app.organization_id',${membership.organizationId!},true)
      `;
      const assignment = await transaction.$queryRaw<Array<{ organizationId: string; tenantId: string }>>`
        SELECT "organizationId"::text AS "organizationId","tenantId"::text AS "tenantId"
        FROM entral.phase202_resolve_tenant_assignment(
          ${identity.actorId}::uuid,${membership.tenantId!}::uuid,${identity.appUserId}::uuid
        )
      `;
      if (assignment[0]?.organizationId !== membership.organizationId || assignment[0]?.tenantId !== membership.tenantId) {
        throw new Error("ACTIVE_TENANT_ACTOR_ASSIGNMENT_REQUIRED");
      }
    }
    const audit = await recordAuditLog({
      action: "auth.session.issued",
      actorRole: normalizeUserRole(user.role),
      actorUserId: user.id,
      metadata: {
        actorId: identity.actorId,
        deviceLabel: safeDeviceLabel(metadata.userAgent),
        organizationId,
        sessionId,
        sessionType,
        supportGrantId,
        tenantId
      },
      requestId: metadata.requestId,
      severity: "medium",
      targetId: sessionId,
      targetType: "auth_session"
    }, transaction);
    await transaction.authSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        actorId: identity.actorId,
        organizationId,
        tenantId,
        supportGrantId,
        sessionType: sessionType.toUpperCase(),
        accessTokenId,
        accountSessionVersion: user.sessionVersion,
        refreshVersion: 1,
        deviceLabel: safeDeviceLabel(metadata.userAgent),
        userAgentHash: hashValue(metadata.userAgent ?? "unknown", "user-agent"),
        ipAddressHash: hashValue(metadata.ipAddress ?? "unknown", "ip-address"),
        issuedAt: now,
        lastUsedAt: now,
        expiresAt,
        auditProvenanceId: audit.id
      }
    });
    await transaction.authRefreshCredential.create({
      data: {
        sessionId,
        version: 1,
        tokenHash: refresh.tokenHash,
        issuedAt: now,
        expiresAt
      }
    });
    return { actorId: identity.actorId, expiresAt, organizationId, supportGrantId, tenantId };
  };

  const context = sessionType === "support"
    ? await withSupportSession(database, {
        actionReason: "auth.support-session.issue",
        authSubject: user.id,
        requestId: metadata.requestId,
        supportGrantId: metadata.supportGrantId!
      }, issue, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    : await withPersonalSession(database, {
        authSubject: user.id,
        actionReason: "auth.session.issue",
        requestId: metadata.requestId
      }, issue, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  return {
    sessionId,
    refreshToken: refresh.token,
    accessToken: signAuthToken({
      sub: user.id,
      email: user.email,
      role: normalizeUserRole(user.role),
      session: sessionType,
      sessionVersion: user.sessionVersion,
      sessionId,
      tokenId: accessTokenId,
      actorId: context.actorId,
      organizationId: context.organizationId,
      tenantId: context.tenantId,
      supportGrantId: context.supportGrantId
    })
  };
}

export async function rotateRefreshCredential(
  refreshToken: string,
  metadata: SessionIssueMetadata,
  database: PrismaClient = prisma
): Promise<IssuedSession> {
  const tokenHash = hashValue(refreshToken, "refresh-token");
  const claimedSupportGrantId = supportGrantFromRefreshToken(refreshToken);
  const now = new Date();
  const subjectRows = await database.$queryRaw<Array<{
    organizationId: string | null;
    sessionType: string;
    supportGrantId: string | null;
    tenantId: string | null;
    userId: string | null;
  }>>`
    SELECT "userId","organizationId"::text AS "organizationId","tenantId"::text AS "tenantId",
           "supportGrantId"::text AS "supportGrantId","sessionType"
    FROM entral.phase202_resolve_refresh_context(${tokenHash})
  `;
  const refreshContext = subjectRows[0];
  const userId = refreshContext?.userId;
  if (!userId
    || (refreshContext.sessionType === "SUPPORT" && refreshContext.supportGrantId !== claimedSupportGrantId)
    || (refreshContext.sessionType !== "SUPPORT" && claimedSupportGrantId !== null)) {
    throw new Error("INVALID_REFRESH_CREDENTIAL");
  }

  try {
    const rotated = await withPersonalSession(database, { authSubject: userId, actionReason: "auth.session.refresh", requestId: metadata.requestId }, async (transaction, identity) => {
      let boundSupport: VerifiedSupportIdentity | null = null;
      if (claimedSupportGrantId) {
        try {
          boundSupport = await bindSupportGrantContext(transaction, {
            actionReason: "auth.support-session.refresh",
            authSubject: userId,
            requestId: metadata.requestId,
            supportGrantId: claimedSupportGrantId
          });
        } catch (error) {
          if (error instanceof Error && [
            "ACTIVE_HUMAN_ACTOR_REQUIRED",
            "ACTIVE_SUPPORT_GRANT_REQUIRED"
          ].includes(error.message)) return { outcome: "EXPIRED" as const };
          throw error;
        }
      } else if (refreshContext.sessionType === "MEMBER") {
        if (!refreshContext.tenantId || !refreshContext.organizationId) {
          return { outcome: "EXPIRED" as const };
        }
        await transaction.$queryRaw`
          SELECT set_config('app.tenant_id',${refreshContext.tenantId},true),
                 set_config('app.organization_id',${refreshContext.organizationId},true)
        `;
        const assignment = await transaction.$queryRaw<Array<{ organizationId: string; tenantId: string }>>`
          SELECT "organizationId"::text AS "organizationId","tenantId"::text AS "tenantId"
          FROM entral.phase202_resolve_tenant_assignment(
            ${identity.actorId}::uuid,${refreshContext.tenantId}::uuid,${identity.appUserId}::uuid
          )
        `;
        if (assignment[0]?.organizationId !== refreshContext.organizationId
          || assignment[0]?.tenantId !== refreshContext.tenantId) {
          return { outcome: "EXPIRED" as const };
        }
      }
      const credential = await transaction.authRefreshCredential.findUnique({ where: { tokenHash } });
      if (!credential) throw new Error("INVALID_REFRESH_CREDENTIAL");
      const session = await transaction.authSession.findUnique({ where: { id: credential.sessionId } });
      const user = await transaction.user.findUnique({ where: { id: userId } });
      if (!session || !user || session.userId !== user.id) throw new Error("INVALID_REFRESH_CREDENTIAL");
      if (credential.consumedAt || credential.revokedAt) {
        await transaction.authSession.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: now, revokeReason: "REFRESH_REPLAY" } });
        await transaction.authRefreshCredential.updateMany({ where: { sessionId: session.id, revokedAt: null }, data: { revokedAt: now } });
        return { outcome: "REPLAY" as const };
      }
      if (session.revokedAt || session.expiresAt <= now || credential.expiresAt <= now) return { outcome: "EXPIRED" as const };
      if (user.sessionVersion !== session.accountSessionVersion) {
        await transaction.authSession.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: now, revokeReason: "ACCOUNT_SESSION_VERSION_CHANGED" } });
        await transaction.authRefreshCredential.updateMany({ where: { sessionId: session.id, revokedAt: null }, data: { revokedAt: now } });
        return { outcome: "EXPIRED" as const };
      }
      if (session.sessionType === "MEMBER") {
        if (!session.tenantId || !session.organizationId) return { outcome: "EXPIRED" as const };
        const assignment = await transaction.$queryRaw<Array<{ organizationId: string; tenantId: string }>>`
          SELECT "organizationId"::text AS "organizationId","tenantId"::text AS "tenantId"
          FROM entral.phase202_resolve_tenant_assignment(
            ${identity.actorId}::uuid,${session.tenantId}::uuid,${identity.appUserId}::uuid
          )
        `;
        if (assignment[0]?.organizationId !== session.organizationId || assignment[0]?.tenantId !== session.tenantId) {
          await transaction.authSession.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: now, revokeReason: "MEMBERSHIP_INACTIVE" } });
          await transaction.authRefreshCredential.updateMany({ where: { sessionId: session.id, revokedAt: null }, data: { revokedAt: now } });
          return { outcome: "EXPIRED" as const };
        }
      } else if (session.sessionType === "SUPPORT") {
        if (!session.supportGrantId || !session.tenantId || !session.organizationId) {
          return { outcome: "EXPIRED" as const };
        }
        if (!boundSupport || claimedSupportGrantId !== session.supportGrantId
          || boundSupport.actorId !== session.actorId || boundSupport.supportGrantId !== session.supportGrantId
          || boundSupport.tenantId !== session.tenantId || boundSupport.organizationId !== session.organizationId
          || boundSupport.grantExpiresAt <= now || session.expiresAt > boundSupport.grantExpiresAt) {
          await transaction.authSession.updateMany({
            where: { id: session.id, revokedAt: null },
            data: { revokedAt: now, revokeReason: "SUPPORT_GRANT_INACTIVE" }
          });
          await transaction.authRefreshCredential.updateMany({
            where: { sessionId: session.id, revokedAt: null },
            data: { revokedAt: now }
          });
          return { outcome: "EXPIRED" as const };
        }
      } else if (claimedSupportGrantId || session.supportGrantId || session.tenantId || session.organizationId) {
        return { outcome: "EXPIRED" as const };
      }
      const nextVersion = session.refreshVersion + 1;
      const nextAccessTokenId = randomUUID();
      const nextRefresh = newRefreshToken(session.id, nextVersion, session.supportGrantId);
      const replacementId = randomUUID();
      await transaction.authRefreshCredential.create({
        data: {
          id: replacementId,
          sessionId: session.id,
          version: nextVersion,
          tokenHash: nextRefresh.tokenHash,
          issuedAt: now,
          expiresAt: session.expiresAt
        }
      });
      const consumed = await transaction.authRefreshCredential.updateMany({
        where: { id: credential.id, consumedAt: null, revokedAt: null },
        data: { consumedAt: now, replacementId }
      });
      if (consumed.count !== 1) throw new Error("REFRESH_REPLAY_DETECTED");
      await transaction.authSession.update({
        where: { id: session.id },
        data: {
          accessTokenId: nextAccessTokenId,
          refreshVersion: nextVersion,
          lastUsedAt: now,
          deviceLabel: safeDeviceLabel(metadata.userAgent),
          userAgentHash: hashValue(metadata.userAgent ?? "unknown", "user-agent"),
          ipAddressHash: hashValue(metadata.ipAddress ?? "unknown", "ip-address")
        }
      });
      await recordAuditLog({
        action: "auth.session.refreshed",
        actorRole: normalizeUserRole(user.role),
        actorUserId: user.id,
        metadata: { refreshVersion: nextVersion, sessionId: session.id },
        requestId: metadata.requestId,
        severity: "low",
        targetId: session.id,
        targetType: "auth_session"
      }, transaction);
      return { outcome: "ROTATED" as const, session, user, nextAccessTokenId, nextRefresh };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (rotated.outcome === "REPLAY") throw new Error("REFRESH_REPLAY_DETECTED");
    if (rotated.outcome === "EXPIRED") throw new Error("REFRESH_CREDENTIAL_EXPIRED");
    return {
      sessionId: rotated.session.id,
      refreshToken: rotated.nextRefresh.token,
      accessToken: signAuthToken({
        sub: rotated.user.id,
        email: rotated.user.email,
        role: normalizeUserRole(rotated.user.role),
        session: rotated.session.sessionType === "MEMBER"
          ? "member"
          : rotated.session.sessionType === "SUPPORT"
            ? "support"
            : "internal",
        sessionVersion: rotated.user.sessionVersion,
        sessionId: rotated.session.id,
        tokenId: rotated.nextAccessTokenId,
        actorId: rotated.session.actorId,
        organizationId: rotated.session.organizationId,
        tenantId: rotated.session.tenantId,
        supportGrantId: rotated.session.supportGrantId
      })
    };
  } catch (error) {
    const replay = error instanceof Error && error.message === "REFRESH_REPLAY_DETECTED"
      || error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code);
    if (!replay) throw error;
    await containRefreshReplay(userId, tokenHash, claimedSupportGrantId, now, database);
    throw new Error("REFRESH_REPLAY_DETECTED");
  }
}

async function containRefreshReplay(
  userId: string,
  tokenHash: string,
  supportGrantId: string | null,
  revokedAt = new Date(),
  database: PrismaClient = prisma
) {
  await withPersonalSession(database, { authSubject: userId, actionReason: "auth.session.refresh_replay" }, async (transaction) => {
    if (supportGrantId) {
      await bindSupportGrantContext(transaction, {
        actionReason: "auth.support-session.refresh_replay",
        authSubject: userId,
        supportGrantId
      });
    }
    const credential = await transaction.authRefreshCredential.findUnique({ where: { tokenHash } });
    if (!credential) return;
    await transaction.authSession.updateMany({ where: { id: credential.sessionId, revokedAt: null }, data: { revokedAt, revokeReason: "REFRESH_REPLAY" } });
    await transaction.authRefreshCredential.updateMany({ where: { sessionId: credential.sessionId, revokedAt: null }, data: { revokedAt } });
  });
}

export async function revokeSessionByRefreshCredential(
  refreshToken: string,
  requestId: string,
  reason = "USER_LOGOUT",
  database: PrismaClient = prisma
) {
  const tokenHash = hashValue(refreshToken, "refresh-token");
  const supportGrantId = supportGrantFromRefreshToken(refreshToken);
  const subjectRows = await database.$queryRaw<Array<{ userId: string | null }>>`SELECT entral.phase202_resolve_refresh_subject(${tokenHash}) AS "userId"`;
  const userId = subjectRows[0]?.userId;
  if (!userId) return false;
  return withPersonalSession(database, { authSubject: userId, actionReason: "auth.session.logout", requestId }, async (transaction) => {
    if (supportGrantId) {
      await bindSupportGrantContext(transaction, {
        actionReason: "auth.support-session.logout",
        authSubject: userId,
        requestId,
        supportGrantId
      });
    }
    const credential = await transaction.authRefreshCredential.findUnique({ where: { tokenHash } });
    if (!credential) return false;
    return revokeSessionInTransaction(transaction, userId, credential.sessionId, requestId, reason);
  });
}

export async function listSessions(userId: string, currentSessionId: string | null, database: PrismaClient = prisma) {
  const sessions = await withPersonalSession(database, { authSubject: userId, actionReason: "auth.sessions.read" }, (transaction) => transaction.authSession.findMany({ where: { userId }, orderBy: { lastUsedAt: "desc" } }));
  return sessions.map((session) => ({
    session_id: session.id,
    actor_id: session.actorId,
    organization_id: session.organizationId,
    tenant_id: session.tenantId,
    support_grant_id: session.supportGrantId,
    session_type: session.sessionType,
    device_label: session.deviceLabel,
    issued_at: session.issuedAt.toISOString(),
    last_used_at: session.lastUsedAt.toISOString(),
    expires_at: session.expiresAt.toISOString(),
    revoked_at: session.revokedAt?.toISOString() ?? null,
    current: session.id === currentSessionId
  }));
}

export async function readSupportSession(
  input: { requestId: string; sessionId: string; supportGrantId: string; userId: string },
  database: PrismaClient = prisma
) {
  return withSupportSession(database, {
    actionReason: "auth.support-session.readback",
    authSubject: input.userId,
    requestId: input.requestId,
    supportGrantId: input.supportGrantId
  }, async (transaction, identity) => {
    const [session, grant] = await Promise.all([
      transaction.authSession.findFirst({
      where: {
        id: input.sessionId,
        userId: input.userId,
        actorId: identity.actorId,
        organizationId: identity.organizationId,
        tenantId: identity.tenantId,
        supportGrantId: identity.supportGrantId,
        sessionType: "SUPPORT",
        revokedAt: null,
        expiresAt: { gt: new Date() }
      }
      }),
      transaction.supportAccessGrant.findFirst({
        where: {
          id: identity.supportGrantId,
          supportActorId: identity.actorId,
          organizationId: identity.organizationId,
          tenantId: identity.tenantId,
          ownerVisible: true
        }
      })
    ]);
    if (!session || !grant || grant.revokedAt || grant.expiresAt <= new Date()
      || session.expiresAt > identity.grantExpiresAt || session.expiresAt > grant.expiresAt) {
      throw new Error("ACTIVE_SUPPORT_SESSION_REQUIRED");
    }
    const readback: SupportSessionReadback = {
      session: {
        session_id: session.id,
        actor_id: session.actorId,
        organization_id: session.organizationId,
        tenant_id: session.tenantId,
        support_grant_id: session.supportGrantId,
        session_type: "SUPPORT",
        device_label: session.deviceLabel,
        issued_at: session.issuedAt.toISOString(),
        last_used_at: session.lastUsedAt.toISOString(),
        expires_at: session.expiresAt.toISOString(),
        revoked_at: session.revokedAt?.toISOString() ?? null,
        current: true
      },
      support_grant: supportAccessGrantDescriptor(grant)
    };
    assertSupportSessionReadback(readback);
    return readback;
  });
}

async function revokeSessionInTransaction(transaction: Prisma.TransactionClient, userId: string, sessionId: string, requestId: string, reason: string) {
  const now = new Date();
  const target = await transaction.authSession.findFirst({ where: { id: sessionId, userId } });
  if (!target) return false;
  await transaction.authSession.update({ where: { id: sessionId }, data: { revokedAt: now, revokeReason: reason } });
  await transaction.authRefreshCredential.updateMany({ where: { sessionId, revokedAt: null }, data: { revokedAt: now } });
  await recordAuditLog({ action: "auth.session.revoked", actorUserId: userId, metadata: { reason, sessionId }, requestId, severity: "medium", targetId: sessionId, targetType: "auth_session" }, transaction);
  return true;
}

export async function revokeSessionForLogout(
  userId: string,
  sessionId: string,
  requestId: string,
  reason = "USER_LOGOUT",
  database: PrismaClient = prisma
) {
  return withPersonalSession(database, {
    authSubject: userId,
    actionReason: "auth.session.logout",
    requestId
  }, (transaction) => revokeSessionInTransaction(transaction, userId, sessionId, requestId, reason));
}

type PersonalIdentity = { actorId: string; appUserId: string; authSubject: string };

export type SessionMutationResult = {
  receipt: SessionTransitionReceipt;
  replayed: boolean;
};

function assertSessionIdempotencyKey(value: string) {
  if (typeof value !== "string" || value.length < 12 || value.length > 255 || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Phase202SessionError("IDEMPOTENCY_KEY_INVALID", "A bounded idempotency key is required.");
  }
}

function sessionRequestFingerprint(value: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function sessionActorReference(identity: PersonalIdentity) {
  return {
    actor_id: identity.actorId,
    actor_type: "HUMAN" as const,
    human_user_id: identity.authSubject,
    service_subject: null,
    agent_id: null
  };
}

function makeSessionReceipt(identity: PersonalIdentity, input: {
  id: string;
  idempotencyKey: string;
  occurredAt: Date;
  priorVersion: number;
  requestId: string;
  resultingVersion: number;
  revokedCount: number;
  subjectSessionId: string | null;
  transition: SessionTransitionReceipt["transition"];
}): SessionTransitionReceipt {
  const receipt: SessionTransitionReceipt = {
    contract_version: "1.0.0",
    schema_version: 1,
    transition_id: input.id,
    transition: input.transition,
    ownership: {
      scope_kind: "PERSONAL",
      organization_id: null,
      tenant_id: null,
      business_id: null,
      environment: env.SECRET_BROKER_ENVIRONMENT,
      data_residency: null
    },
    actor: sessionActorReference(identity),
    request_id: input.requestId,
    idempotency_key: input.idempotencyKey,
    prior_version: input.priorVersion,
    resulting_version: input.resultingVersion,
    revoked_count: input.revokedCount,
    subject_session_id: input.subjectSessionId,
    budget: { kind: "NO_EXTERNAL_SPEND", amount_minor_units: 0 },
    reversible: false,
    verification: "TRANSACTIONAL_READBACK",
    reconciliation: "IDEMPOTENT_RECEIPT",
    failure_behavior: "NO_PARTIAL_WRITE",
    evidence: input.transition === "REVOKE_ONE"
      ? [
          `auth-session:${input.subjectSessionId}:version:${input.resultingVersion}`,
          `auth-refresh-family:${input.subjectSessionId}:revoked`
        ]
      : [
          `user:${identity.authSubject}:session-version:${input.resultingVersion}`,
          `auth-sessions:revoked-count:${input.revokedCount}`
        ],
    occurred_at: input.occurredAt.toISOString(),
    release_version: "phase-202"
  };
  assertSessionTransitionReceipt(receipt);
  return receipt;
}

function sessionReceiptFromStored(value: Prisma.JsonValue) {
  assertSessionTransitionReceipt(value);
  return value;
}

async function persistSessionReceipt(
  transaction: Prisma.TransactionClient,
  identity: PersonalIdentity,
  fingerprint: string,
  receipt: SessionTransitionReceipt
) {
  await transaction.sessionMutationReceipt.create({
    data: {
      id: receipt.transition_id,
      userId: identity.authSubject,
      actorId: identity.actorId,
      transition: receipt.transition,
      subjectSessionId: receipt.subject_session_id,
      priorVersion: receipt.prior_version,
      resultingVersion: receipt.resulting_version,
      revokedCount: receipt.revoked_count,
      idempotencyKey: receipt.idempotency_key,
      requestFingerprint: fingerprint,
      requestId: receipt.request_id,
      resultPayload: receipt as unknown as Prisma.InputJsonValue,
      releaseVersion: receipt.release_version,
      occurredAt: new Date(receipt.occurred_at)
    }
  });
}

async function executeSessionMutation(
  input: {
    actionReason: string;
    fingerprint: string;
    idempotencyKey: string;
    requestId: string;
    transition: SessionTransitionReceipt["transition"];
    userId: string;
  },
  database: PrismaClient,
  operation: (
    transaction: Prisma.TransactionClient,
    identity: PersonalIdentity
  ) => Promise<SessionMutationResult>
): Promise<SessionMutationResult> {
  assertSessionIdempotencyKey(input.idempotencyKey);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await withPersonalSession(database, {
        authSubject: input.userId,
        actionReason: input.actionReason,
        requestId: input.requestId
      }, async (transaction, identity) => {
        const stored = await transaction.sessionMutationReceipt.findUnique({
          where: {
            actorId_idempotencyKey: {
              actorId: identity.actorId,
              idempotencyKey: input.idempotencyKey
            }
          }
        });
        if (stored) {
          if (stored.transition !== input.transition || stored.requestFingerprint !== input.fingerprint) {
            throw new Phase202SessionError(
              "IDEMPOTENCY_KEY_REUSED",
              "The idempotency key was already used for a different session transition.",
              409
            );
          }
          return { receipt: sessionReceiptFromStored(stored.resultPayload), replayed: true };
        }
        return operation(transaction, identity);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError
        && ["P2002", "P2034"].includes(error.code)
        || error instanceof Phase202SessionError && error.code === "SESSION_VERSION_CONFLICT";
      if (!retryable || attempt === 2) throw error;
    }
  }
  throw new Phase202SessionError(
    "SESSION_TRANSITION_RETRY_EXHAUSTED",
    "The session transition could not be reconciled.",
    503
  );
}

export async function revokeSession(
  userId: string,
  sessionId: string,
  requestId: string,
  idempotencyKey: string,
  database: PrismaClient = prisma
) {
  const fingerprint = sessionRequestFingerprint({ transition: "REVOKE_ONE", userId, sessionId });
  return executeSessionMutation({
    actionReason: "auth.session.revoke",
    fingerprint,
    idempotencyKey,
    requestId,
    transition: "REVOKE_ONE",
    userId
  }, database, async (transaction, identity) => {
    const target = await transaction.authSession.findFirst({
      where: { id: sessionId, userId, actorId: identity.actorId, revokedAt: null }
    });
    if (!target) throw new Phase202SessionError("SESSION_NOT_FOUND", "The active session was not found.", 404);
    const now = new Date();
    const updated = await transaction.authSession.updateMany({
      where: { id: target.id, userId, actorId: identity.actorId, version: target.version, revokedAt: null },
      data: {
        revokedAt: now,
        revokeReason: "USER_REVOKED",
        stepUpAt: null,
        version: { increment: 1 }
      }
    });
    if (updated.count !== 1) throw new Phase202SessionError("SESSION_VERSION_CONFLICT", "The session changed before revocation.", 409);
    await transaction.authRefreshCredential.updateMany({
      where: { sessionId: target.id, revokedAt: null },
      data: { revokedAt: now }
    });
    const readback = await transaction.authSession.findUnique({ where: { id: target.id } });
    if (!readback || !readback.revokedAt || readback.version !== target.version + 1) {
      throw new Phase202SessionError("SESSION_READBACK_FAILED", "Session revocation readback failed.", 503);
    }
    const receipt = makeSessionReceipt(identity, {
      id: randomUUID(),
      idempotencyKey,
      occurredAt: now,
      priorVersion: target.version,
      requestId,
      resultingVersion: readback.version,
      revokedCount: 1,
      subjectSessionId: target.id,
      transition: "REVOKE_ONE"
    });
    await persistSessionReceipt(transaction, identity, fingerprint, receipt);
    await recordAuditLog({
      action: "auth.session.revoked",
      actorUserId: userId,
      metadata: { receiptId: receipt.transition_id, sessionId: target.id },
      requestId,
      severity: "medium",
      targetId: target.id,
      targetType: "auth_session"
    }, transaction);
    return { receipt, replayed: false };
  });
}

export async function revokeAllSessions(
  userId: string,
  requestId: string,
  idempotencyKey: string,
  database: PrismaClient = prisma
) {
  const fingerprint = sessionRequestFingerprint({ transition: "REVOKE_ALL", userId });
  return executeSessionMutation({
    actionReason: "auth.sessions.revoke_all",
    fingerprint,
    idempotencyKey,
    requestId,
    transition: "REVOKE_ALL",
    userId
  }, database, async (transaction, identity) => {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: { sessionVersion: true }
    });
    if (!user) throw new Phase202SessionError("SESSION_SUBJECT_NOT_FOUND", "The session subject was not found.", 404);
    const sessions = await transaction.authSession.findMany({
      where: { userId, actorId: identity.actorId, revokedAt: null },
      select: { id: true }
    });
    const sessionIds = sessions.map((session) => session.id);
    const now = new Date();
    if (sessionIds.length > 0) {
      await transaction.authSession.updateMany({
        where: { id: { in: sessionIds }, userId, actorId: identity.actorId, revokedAt: null },
        data: {
          revokedAt: now,
          revokeReason: "USER_REVOKED_ALL",
          stepUpAt: null,
          version: { increment: 1 }
        }
      });
      await transaction.authRefreshCredential.updateMany({
        where: { sessionId: { in: sessionIds }, revokedAt: null },
        data: { revokedAt: now }
      });
    }
    const updatedUser = await transaction.user.updateMany({
      where: { id: userId, sessionVersion: user.sessionVersion },
      data: { sessionVersion: { increment: 1 } }
    });
    if (updatedUser.count !== 1) throw new Phase202SessionError("SESSION_VERSION_CONFLICT", "The account session version changed.", 409);
    const userReadback = await transaction.user.findUnique({
      where: { id: userId },
      select: { sessionVersion: true }
    });
    if (!userReadback || userReadback.sessionVersion !== user.sessionVersion + 1) {
      throw new Phase202SessionError("SESSION_READBACK_FAILED", "Session revocation readback failed.", 503);
    }
    const receipt = makeSessionReceipt(identity, {
      id: randomUUID(),
      idempotencyKey,
      occurredAt: now,
      priorVersion: user.sessionVersion,
      requestId,
      resultingVersion: userReadback.sessionVersion,
      revokedCount: sessionIds.length,
      subjectSessionId: null,
      transition: "REVOKE_ALL"
    });
    await persistSessionReceipt(transaction, identity, fingerprint, receipt);
    await recordAuditLog({
      action: "auth.sessions.revoked_all",
      actorUserId: userId,
      metadata: { receiptId: receipt.transition_id, revokedCount: sessionIds.length },
      requestId,
      severity: "high",
      targetId: userId,
      targetType: "account"
    }, transaction);
    return { receipt, replayed: false };
  });
}
