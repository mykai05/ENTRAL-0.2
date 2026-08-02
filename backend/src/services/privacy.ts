import { createHmac, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { env } from "../env.js";
import { prisma, withPersonalSession, withTenantSession } from "../db.js";
import { stringifySecretEnvelope, type SecretEnvelopeContext } from "./secureJson.js";

export class Phase202PrivacyError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number
  ) {
    super(message);
    this.name = "Phase202PrivacyError";
  }
}

type AccountExportScope = {
  authSubject: string;
  requestId: string;
  sessionId: string;
  sessionType: "internal" | "member";
  tenantId: string | null;
};

type PreparedMembershipRemoval = {
  actorId: string;
  email: string;
  environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
  organizationId: string;
  priorVersion: number;
  role: string;
  status: string;
  teamId: string;
  teamName: string;
  tenantId: string;
  userId: string;
};

type AccountDeidentificationDatabaseReceipt = {
  membershipReceiptIds: string[];
  occurredAt: Date;
  receiptHash: string;
  receiptId: string;
};

function iso(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}

function recipientHash(email: string) {
  return createHmac("sha256", env.JWT_SECRET)
    .update(`phase202:membership-email\0${email.trim().toLowerCase()}`)
    .digest("hex");
}

function uuidSqlArray(values: string[]) {
  if (values.length === 0) return Prisma.raw("'{}'::uuid[]");
  return Prisma.sql`ARRAY[${Prisma.join(values.map((value) => Prisma.sql`${value}::uuid`))}]::uuid[]`;
}

function textSqlArray(values: string[]) {
  if (values.length === 0) return Prisma.raw("'{}'::text[]");
  return Prisma.sql`ARRAY[${Prisma.join(values)}]::text[]`;
}

async function requireSensitiveAccountAuthority(
  transaction: Prisma.TransactionClient,
  userId: string,
  sessionId: string
) {
  const rows = await transaction.$queryRaw<Array<{ factorReady: boolean; sessionReady: boolean }>>(Prisma.sql`
    SELECT
      EXISTS (
        SELECT 1
        FROM "AuthSession" session
        JOIN "User" account ON account."id"=session."userId"
        WHERE session."id"=${sessionId}::uuid
          AND session."userId"=${userId}
          AND session."actorId"=entral.phase202_current_actor_id()
          AND session."revokedAt" IS NULL
          AND session."expiresAt">clock_timestamp()
          AND session."accountSessionVersion"=account."sessionVersion"
          AND session."stepUpAt" BETWEEN
            clock_timestamp()-make_interval(secs=>${env.MFA_STEP_UP_TTL_SECONDS})
            AND clock_timestamp()
      ) AS "sessionReady",
      EXISTS (
        SELECT 1 FROM "MfaFactor" factor
        WHERE factor."userId"=${userId}
          AND factor."actorId"=entral.phase202_current_actor_id()
          AND factor."factorType"='TOTP'
          AND factor."status"='ACTIVE'
      ) AS "factorReady"
  `);
  if (!rows[0]?.sessionReady) {
    throw new Phase202PrivacyError(
      "RECENT_MFA_STEP_UP_REQUIRED",
      "A durable session with recent MFA step-up is required.",
      403
    );
  }
  if (!rows[0].factorReady) {
    throw new Phase202PrivacyError("MFA_FACTOR_REQUIRED", "An active MFA factor is required.", 403);
  }
}

function databasePrivacyError(error: unknown): never {
  if (error instanceof Phase202PrivacyError) throw error;
  const detail = error instanceof Error
    ? `${error.message} ${JSON.stringify((error as { meta?: unknown }).meta ?? "")}`
    : String(error);
  if (detail.includes("LAST_ACTIVE_OWNER_REQUIRED")) {
    throw new Phase202PrivacyError(
      "LAST_ACTIVE_OWNER_REQUIRED",
      "Transfer ownership to another active owner before deidentifying this account.",
      409
    );
  }
  if (detail.includes("RECENT_MFA_STEP_UP_REQUIRED")) {
    throw new Phase202PrivacyError(
      "RECENT_MFA_STEP_UP_REQUIRED",
      "A durable session with recent MFA step-up is required.",
      403
    );
  }
  if (detail.includes("MFA_FACTOR_REQUIRED")) {
    throw new Phase202PrivacyError(
      "MFA_FACTOR_REQUIRED",
      "An active MFA factor is required.",
      403
    );
  }
  if (detail.includes("ACCOUNT_DEIDENTIFICATION_UNAVAILABLE")) {
    throw new Phase202PrivacyError(
      "ACCOUNT_DEIDENTIFICATION_UNAVAILABLE",
      "Account deidentification is unavailable for this identity.",
      409
    );
  }
  throw new Phase202PrivacyError(
    "ACCOUNT_DEIDENTIFICATION_BLOCKED",
    "Account deidentification could not be completed atomically. No completion receipt was recorded.",
    503
  );
}

export async function buildAccountExport(input: AccountExportScope, database = prisma) {
  if (input.sessionType === "member") {
    if (!input.tenantId) {
      throw new Phase202PrivacyError("TENANT_SCOPE_REQUIRED", "A tenant-bound member session is required.", 403);
    }
    return withTenantSession(database, {
      authSubject: input.authSubject,
      tenantId: input.tenantId,
      actionReason: "privacy.export.tenant",
      requestId: input.requestId
    }, async (transaction, identity) => {
      await requireSensitiveAccountAuthority(transaction, input.authSubject, input.sessionId);
      const [user, team, membership] = await Promise.all([
        transaction.user.findUnique({
          where: { id: input.authSubject },
          select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true, emailVerifiedAt: true }
        }),
        transaction.team.findUnique({
          where: { tenantId: identity.tenantId },
          select: { id: true, name: true, slug: true, environment: true, dataResidency: true }
        }),
        transaction.teamMember.findFirst({
          where: { userId: input.authSubject, team: { tenantId: identity.tenantId } },
          select: { role: true, status: true, version: true, joinedAt: true, suspendedAt: true, removedAt: true }
        })
      ]);
      if (!user || !team || !membership) {
        throw new Phase202PrivacyError("TENANT_EXPORT_UNAVAILABLE", "The tenant export is unavailable.", 404);
      }
      const tasks = await transaction.task.findMany({
        where: { teamId: team.id },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true,
          createdById: true,
          assignedToId: true
        },
        orderBy: { createdAt: "desc" }
      });
      return {
        contract_version: "1.0.0",
        schema_version: 1,
        formatVersion: 2,
        exportedAt: new Date().toISOString(),
        scope: {
          kind: "TENANT",
          organization_id: identity.organizationId,
          tenant_id: identity.tenantId,
          external_providers_contacted: false,
          secret_material_included: false
        },
        summary: { teams: 1, tasks: tasks.length },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          created_at: iso(user.createdAt),
          updated_at: iso(user.updatedAt),
          email_verified_at: iso(user.emailVerifiedAt)
        },
        tenant: {
          id: identity.tenantId,
          organization_id: identity.organizationId,
          team_id: team.id,
          name: team.name,
          slug: team.slug,
          environment: team.environment,
          data_residency: team.dataResidency,
          membership: {
            role: membership.role,
            status: membership.status,
            version: membership.version,
            joined_at: iso(membership.joinedAt),
            suspended_at: iso(membership.suspendedAt),
            removed_at: iso(membership.removedAt)
          }
        },
        tasks: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          due_date: iso(task.dueDate),
          created_at: iso(task.createdAt),
          updated_at: iso(task.updatedAt),
          created_by_id: task.createdById,
          assigned_to_id: task.assignedToId
        }))
      };
    });
  }

  return withPersonalSession(database, {
    authSubject: input.authSubject,
    actionReason: "privacy.export.personal",
    requestId: input.requestId
  }, async (transaction) => {
    await requireSensitiveAccountAuthority(transaction, input.authSubject, input.sessionId);
    const [user, sessions, mfaFactors] = await Promise.all([
      transaction.user.findUnique({
        where: { id: input.authSubject },
        select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true, emailVerifiedAt: true }
      }),
      transaction.authSession.findMany({
        where: { userId: input.authSubject },
        select: { id: true, sessionType: true, deviceLabel: true, issuedAt: true, lastUsedAt: true, expiresAt: true, revokedAt: true, revokeReason: true },
        orderBy: { issuedAt: "desc" }
      }),
      transaction.mfaFactor.findMany({
        where: { userId: input.authSubject },
        select: { id: true, factorType: true, status: true, verifiedAt: true, createdAt: true }
      })
    ]);
    if (!user) throw new Phase202PrivacyError("ACCOUNT_NOT_FOUND", "Account was not found.", 404);
    return {
      contract_version: "1.0.0",
      schema_version: 1,
      formatVersion: 2,
      exportedAt: new Date().toISOString(),
      scope: {
        kind: "PERSONAL",
        organization_id: null,
        tenant_id: null,
        external_providers_contacted: false,
        secret_material_included: false
      },
      summary: { teams: 0, sessions: sessions.length, mfa_factors: mfaFactors.length },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: iso(user.createdAt),
        updated_at: iso(user.updatedAt),
        email_verified_at: iso(user.emailVerifiedAt)
      },
      sessions: sessions.map((session) => ({
        session_id: session.id,
        session_type: session.sessionType,
        device_label: session.deviceLabel,
        issued_at: iso(session.issuedAt),
        last_used_at: iso(session.lastUsedAt),
        expires_at: iso(session.expiresAt),
        revoked_at: iso(session.revokedAt),
        revoke_reason: session.revokeReason
      })),
      mfa_factors: mfaFactors.map((factor) => ({
        factor_id: factor.id,
        factor_type: factor.factorType,
        status: factor.status,
        verified_at: iso(factor.verifiedAt),
        created_at: iso(factor.createdAt)
      }))
    };
  });
}

export function summarizeAccountExport(exportData: Awaited<ReturnType<typeof buildAccountExport>>) {
  return exportData.summary;
}

export async function deidentifyAccount(input: {
  authSubject: string;
  idempotencyKey: string;
  password: string;
  requestId: string;
  sessionId: string;
}) {
  try {
    return await withPersonalSession(prisma, {
      authSubject: input.authSubject,
      actionReason: "privacy.account.deidentify",
      requestId: input.requestId
    }, async (transaction) => {
      const credentials = await transaction.$queryRaw<Array<{ deletedAt: Date | null; passwordHash: string }>>(Prisma.sql`
        SELECT account."passwordHash",account."deletedAt"
        FROM "User" account
        WHERE account."id"=${input.authSubject}
        FOR UPDATE
      `);
      const credential = credentials[0];
      const passwordMatches = credential && !credential.deletedAt
        ? await bcrypt.compare(input.password, credential.passwordHash)
        : false;
      if (!passwordMatches) {
        throw new Phase202PrivacyError("PASSWORD_CONFIRMATION_FAILED", "Password confirmation failed.", 401);
      }
      const prepared = await transaction.$queryRaw<PreparedMembershipRemoval[]>(Prisma.sql`
        SELECT * FROM entral.phase202_prepare_account_deidentification(
          ${input.sessionId}::uuid,${env.MFA_STEP_UP_TTL_SECONDS},${input.requestId},${input.idempotencyKey}
        )
      `);
      const membershipReceiptIds = prepared.map(() => randomUUID());
      const notificationIds = prepared.map(() => randomUUID());
      const secretReferenceIds = prepared.map(() => randomUUID());
      const deliveryIds = prepared.map(() => randomUUID());
      const recipientHashes = prepared.map((row) => recipientHash(row.email));
      const encryptedValues = prepared.map((row, index) => {
        const context: SecretEnvelopeContext = {
          secretReferenceId: secretReferenceIds[index]!,
          organizationId: row.organizationId,
          tenantId: row.tenantId,
          businessId: null,
          actorId: row.actorId,
          provider: "resend",
          purpose: "membership-email-delivery",
          environment: row.environment,
          recordVersion: 1
        };
        return stringifySecretEnvelope({
          action: "removed",
          kind: "CHANGE",
          organizationName: row.teamName,
          role: null,
          schemaVersion: 1,
          to: row.email,
          token: null
        }, context);
      });
      const receipts = await transaction.$queryRaw<AccountDeidentificationDatabaseReceipt[]>(Prisma.sql`
        SELECT * FROM entral.phase202_complete_account_deidentification(
          ${input.sessionId}::uuid,
          ${env.MFA_STEP_UP_TTL_SECONDS},
          ${input.requestId},
          ${input.idempotencyKey},
          ${uuidSqlArray(membershipReceiptIds)},
          ${uuidSqlArray(notificationIds)},
          ${uuidSqlArray(secretReferenceIds)},
          ${uuidSqlArray(deliveryIds)},
          ${textSqlArray(recipientHashes)},
          ${textSqlArray(encryptedValues)},
          ${env.DATA_ENCRYPTION_KEY_VERSION}
        )
      `);
      const receipt = receipts[0];
      if (receipts.length !== 1 || !receipt || !/^[a-f0-9]{64}$/u.test(receipt.receiptHash)) {
        throw new Error("ACCOUNT_DEIDENTIFICATION_READBACK_INVALID");
      }
      return {
        contract_version: "1.0.0",
        schema_version: 1,
        outcome: "ACCOUNT_DEIDENTIFIED" as const,
        tenant_records: "RETAINED" as const,
        actor_provenance: "RETAINED_REVOKED" as const,
        retry_semantics: "TERMINAL_SESSION_REVOCATION" as const,
        receipt_id: receipt.receiptId,
        receipt_hash: receipt.receiptHash,
        membership_receipt_ids: receipt.membershipReceiptIds,
        occurred_at: receipt.occurredAt.toISOString(),
        retained_evidence_classes: [
          "TENANT_RECORDS",
          "OWNERSHIP_AND_CREATOR_PROVENANCE",
          "MEMBERSHIP_TRANSITION_RECEIPTS",
          "SECURITY_AND_SECRET_ACCESS_AUDIT",
          "NOTIFICATION_EVIDENCE",
          "ACCOUNT_DEIDENTIFICATION_RECEIPT"
        ]
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    return databasePrivacyError(error);
  }
}
