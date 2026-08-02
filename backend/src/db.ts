import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma, PrismaClient } from "@prisma/client";

function processBoundDatabaseUrl() {
  if (process.env.PROCESS_ROLE?.trim().toLowerCase() !== "worker") return undefined;
  const serviceAppUserId = process.env.CANONICAL_OUTBOX_SERVICE_APP_USER_ID?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!serviceAppUserId || !databaseUrl) return undefined;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(serviceAppUserId)) {
    throw new Error("Worker database identity requires a valid CANONICAL_OUTBOX_SERVICE_APP_USER_ID UUID.");
  }
  const parsed = new URL(databaseUrl);
  const existingOptions = parsed.searchParams.get("options")?.trim();
  parsed.searchParams.set(
    "options",
    [existingOptions, `-c app.phase202_worker_app_user_id=${serviceAppUserId}`].filter(Boolean).join(" ")
  );
  return parsed.toString();
}

const boundDatabaseUrl = processBoundDatabaseUrl();

const rootPrisma = new PrismaClient({
  ...(boundDatabaseUrl ? { datasourceUrl: boundDatabaseUrl } : {}),
  log: [
    { emit: "event", level: "error" },
    { emit: "event", level: "warn" }
  ]
});

const scopedTransaction = new AsyncLocalStorage<Prisma.TransactionClient>();

export const prisma = new Proxy(rootPrisma, {
  get(target, property) {
    const transaction = scopedTransaction.getStore();
    if (transaction && property === "$transaction") {
      return (operation: unknown) => {
        if (typeof operation === "function") {
          return (operation as (client: Prisma.TransactionClient) => unknown)(transaction);
        }
        if (Array.isArray(operation)) return Promise.all(operation);
        throw new Error("Unsupported nested transaction operation.");
      };
    }
    const source = transaction && property in transaction ? transaction : target;
    const value = Reflect.get(source, property, source);
    return typeof value === "function" ? value.bind(source) : value;
  }
}) as PrismaClient;

export function withScopedPrismaTransaction<T>(
  transaction: Prisma.TransactionClient,
  operation: () => Promise<T>
) {
  return scopedTransaction.run(transaction, operation);
}

type CanonicalTenantScope = {
  organizationId?: string;
  tenantId?: string;
};

export type CanonicalSessionContext = (
  | {
      actionReason: string;
      authSubject: string;
      correlationId?: string;
      governanceActionId?: string;
      serviceAppUserId?: never;
    }
  | {
      actionReason: string;
      authSubject?: never;
      correlationId?: string;
      governanceActionId?: string;
      serviceAppUserId: string;
    }
) & CanonicalTenantScope;

export async function withCanonicalSession<T>(
  database: PrismaClient,
  context: CanonicalSessionContext,
  operation: (transaction: Prisma.TransactionClient, appUserId: string) => Promise<T>,
  options: {
    isolationLevel?: Prisma.TransactionIsolationLevel;
  } = {}
): Promise<T> {
  return database.$transaction(async (transaction) => {
    const correlationId = context.correlationId ?? randomUUID();
    await transaction.$queryRaw`
      SELECT
        set_config('app.action_reason', ${context.actionReason}, true),
        set_config('app.correlation_id', ${correlationId}, true),
        set_config('app.governance_action_id', ${context.governanceActionId ?? ""}, true)
    `;

    const identityRows = "authSubject" in context
      ? await transaction.$queryRaw<{ appUserId: string }[]>`
          SELECT entral.bind_authenticated_app_user(${context.authSubject}) AS "appUserId"
        `
      : await transaction.$queryRaw<{ appUserId: string }[]>`
          SELECT entral.bind_service_app_user(${context.serviceAppUserId}::uuid) AS "appUserId"
        `;
    const appUserId = identityRows[0]?.appUserId;
    if (!appUserId) {
      throw new Error("Canonical database session identity could not be established.");
    }

    if (context.tenantId !== undefined || context.organizationId !== undefined) {
      if (!context.tenantId || !context.organizationId) {
        throw new Error("Canonical tenant sessions require both tenant and organization identifiers.");
      }
      const actorRows = "authSubject" in context
        ? await transaction.$queryRaw<{ actorId: string }[]>`
            SELECT entral.phase202_resolve_human_actor(${context.authSubject})::text AS "actorId"
          `
        : await transaction.$queryRaw<{ actorId: string }[]>`
            SELECT entral.phase202_resolve_service_actor(${appUserId}::uuid)::text AS "actorId"
          `;
      const actorId = actorRows[0]?.actorId;
      if (!actorId) throw new Error("ACTIVE_IDENTITY_ACTOR_REQUIRED");
      await transaction.$queryRaw`
        SELECT set_config('app.tenant_id', ${context.tenantId}, true),
               set_config('app.phase202_actor_id', ${actorId}, true)
      `;
      const assignment = await transaction.$queryRaw<Array<{ organizationId: string; tenantId: string }>>`
        SELECT "organizationId"::text AS "organizationId", "tenantId"::text AS "tenantId"
        FROM entral.phase202_resolve_tenant_assignment(
          ${actorId}::uuid,
          ${context.tenantId}::uuid,
          ${appUserId}::uuid
        )
      `;
      if (assignment[0]?.tenantId !== context.tenantId
        || assignment[0]?.organizationId !== context.organizationId) {
        throw new Error("ACTIVE_TENANT_ASSIGNMENT_REQUIRED");
      }
      await transaction.$queryRaw`
        SELECT set_config('app.organization_id', ${context.organizationId}, true)
      `;
    }

    return operation(transaction, appUserId);
  }, options);
}

export type VerifiedTenantSessionContext = (
  | { authSubject: string; serviceAppUserId?: never }
  | { authSubject?: never; serviceAppUserId: string }
) & {
  actionReason: string;
  requestId?: string;
  tenantId: string;
};

export type VerifiedTenantIdentity = {
  actorId: string;
  appUserId: string;
  organizationId: string;
  role: string;
  tenantId: string;
};

export type VerifiedSupportIdentity = VerifiedTenantIdentity & {
  accessMode: string;
  grantExpiresAt: Date;
  scopes: string[];
  supportGrantId: string;
  writeElevationExpiresAt: Date | null;
};

export async function bindSupportGrantContext(
  transaction: Prisma.TransactionClient,
  context: {
    actionReason: string;
    authSubject: string;
    requestId?: string;
    supportGrantId: string;
  }
): Promise<VerifiedSupportIdentity> {
  const identityRows = await transaction.$queryRaw<{ appUserId: string }[]>`
    SELECT entral.bind_authenticated_app_user(${context.authSubject}) AS "appUserId"
  `;
  const appUserId = identityRows[0]?.appUserId;
  if (!appUserId) throw new Error("Canonical database session identity could not be established.");

  const actorRows = await transaction.$queryRaw<{ actorId: string }[]>`
    SELECT entral.phase202_resolve_human_actor(${context.authSubject})::text AS "actorId"
  `;
  const actorId = actorRows[0]?.actorId;
  if (!actorId) throw new Error("ACTIVE_HUMAN_ACTOR_REQUIRED");

  await transaction.$queryRaw`
    SELECT set_config('app.phase202_actor_id',${actorId},true),
           set_config('app.phase202_support_grant_id',${context.supportGrantId},true)
  `;
  const supportRows = await transaction.$queryRaw<Array<{
    accessMode: string;
    actorId: string;
    grantExpiresAt: Date;
    organizationId: string;
    role: string;
    scopes: string[];
    supportGrantId: string;
    tenantId: string;
    writeElevationExpiresAt: Date | null;
  }>>`
    SELECT "actorId"::text AS "actorId", "organizationId"::text AS "organizationId",
           "tenantId"::text AS "tenantId", "role", "supportGrantId"::text AS "supportGrantId",
           "grantExpiresAt", "accessMode", "scopes", "writeElevationExpiresAt"
    FROM entral.phase202_resolve_support_session(
      ${actorId}::uuid,
      ${context.supportGrantId}::uuid,
      ${appUserId}::uuid
    )
  `;
  const resolved = supportRows[0];
  if (!resolved || resolved.actorId !== actorId || resolved.supportGrantId !== context.supportGrantId) {
    throw new Error("ACTIVE_SUPPORT_GRANT_REQUIRED");
  }

  const identity: VerifiedSupportIdentity = { ...resolved, appUserId };
  await transaction.$queryRaw`
    SELECT set_config('app.tenant_id',${identity.tenantId},true),
           set_config('app.organization_id',${identity.organizationId},true),
           set_config('app.phase202_actor_id',${identity.actorId},true),
           set_config('app.phase202_support_grant_id',${identity.supportGrantId},true),
           set_config('app.correlation_id',${context.requestId ?? randomUUID()},true),
           set_config('app.action_reason',${context.actionReason},true)
  `;
  return identity;
}

export async function withSupportSession<T>(
  database: PrismaClient,
  context: {
    actionReason: string;
    authSubject: string;
    requestId?: string;
    supportGrantId: string;
  },
  operation: (transaction: Prisma.TransactionClient, identity: VerifiedSupportIdentity) => Promise<T>,
  options: { isolationLevel?: Prisma.TransactionIsolationLevel } = {}
): Promise<T> {
  return database.$transaction(async (transaction) => {
    const identity = await bindSupportGrantContext(transaction, context);
    return operation(transaction, identity);
  }, options);
}

export async function withTenantSession<T>(
  database: PrismaClient,
  context: VerifiedTenantSessionContext,
  operation: (transaction: Prisma.TransactionClient, identity: VerifiedTenantIdentity) => Promise<T>,
  options: { isolationLevel?: Prisma.TransactionIsolationLevel } = {}
): Promise<T> {
  return database.$transaction(async (transaction) => {
    const identityRows = "authSubject" in context
      ? await transaction.$queryRaw<{ appUserId: string }[]>`
          SELECT entral.bind_authenticated_app_user(${context.authSubject}) AS "appUserId"
        `
      : await transaction.$queryRaw<{ appUserId: string }[]>`
          SELECT entral.bind_service_app_user(${context.serviceAppUserId}::uuid) AS "appUserId"
        `;
    const appUserId = identityRows[0]?.appUserId;
    if (!appUserId) throw new Error("Canonical database session identity could not be established.");

    const actorRows = "authSubject" in context
      ? await transaction.$queryRaw<{ actorId: string }[]>`
          SELECT entral.phase202_resolve_human_actor(${context.authSubject})::text AS "actorId"
        `
      : await transaction.$queryRaw<{ actorId: string }[]>`
          SELECT entral.phase202_resolve_service_actor(${appUserId}::uuid)::text AS "actorId"
        `;
    const boundActorId = actorRows[0]?.actorId;
    if (!boundActorId) throw new Error("ACTIVE_IDENTITY_ACTOR_REQUIRED");
    await transaction.$queryRaw`
      SELECT set_config('app.tenant_id', ${context.tenantId}, true),
             set_config('app.phase202_actor_id', ${boundActorId}, true)
    `;

    const tenantRows = await transaction.$queryRaw<Omit<VerifiedTenantIdentity, "appUserId">[]>`
      SELECT "actorId"::text AS "actorId", "organizationId"::text AS "organizationId",
             "tenantId"::text AS "tenantId", "role"
      FROM entral.phase202_resolve_tenant_assignment(
        ${boundActorId}::uuid,
        ${context.tenantId}::uuid,
        ${appUserId}::uuid
      )
    `;
    const resolved = tenantRows[0];
    if (!resolved) throw new Error("ACTIVE_TENANT_ASSIGNMENT_REQUIRED");
    if (resolved.actorId !== boundActorId) throw new Error("TENANT_ACTOR_BINDING_MISMATCH");
    const identity: VerifiedTenantIdentity = { ...resolved, appUserId };

    await transaction.$queryRaw`
      SELECT
        set_config('app.tenant_id', ${identity.tenantId}, true),
        set_config('app.organization_id', ${identity.organizationId}, true),
        set_config('app.phase202_actor_id', ${identity.actorId}, true),
        set_config('app.correlation_id', ${context.requestId ?? randomUUID()}, true),
        set_config('app.action_reason', ${context.actionReason}, true)
    `;
    return operation(transaction, identity);
  }, options);
}

export async function resolveSingleActiveTenant(
  database: PrismaClient,
  context: { authSubject: string; requestId?: string }
): Promise<{ organizationId: string; tenantId: string } | null> {
  return withPersonalSession(database, {
    actionReason: "auth.legacy-tenant.resolve",
    authSubject: context.authSubject,
    requestId: context.requestId
  }, async (transaction, identity) => {
    const rows = await transaction.$queryRaw<Array<{ organizationId: string; tenantId: string }>>`
      SELECT "organizationId"::text AS "organizationId", "tenantId"::text AS "tenantId"
      FROM entral.phase202_resolve_single_tenant_assignment(
        ${identity.actorId}::uuid,
        ${identity.appUserId}::uuid
      )
    `;
    return rows[0] ?? null;
  });
}

export async function resolveVerifiedMemberTeamAccess(
  database: PrismaClient,
  context: {
    authSubject: string;
    organizationId: string;
    requestId?: string;
    teamId: string;
    tenantId: string;
  }
): Promise<{ role: string } | null> {
  try {
    return await withTenantSession(database, {
      actionReason: `Verify active member access to Team ${context.teamId}.`,
      authSubject: context.authSubject,
      requestId: context.requestId,
      tenantId: context.tenantId
    }, async (transaction, identity) => {
      if (identity.organizationId !== context.organizationId) return null;
      const membership = await transaction.teamMember.findUnique({
        where: {
          userId_teamId: {
            teamId: context.teamId,
            userId: context.authSubject
          }
        },
        select: {
          role: true,
          status: true,
          team: {
            select: {
              memberAccessEnabled: true,
              organizationId: true,
              tenantId: true
            }
          }
        }
      });
      if (!membership || membership.status !== "ACTIVE"
        || !membership.team.memberAccessEnabled
        || membership.team.organizationId !== context.organizationId
        || membership.team.tenantId !== context.tenantId) return null;
      return { role: membership.role };
    });
  } catch (error) {
    if (error instanceof Error && [
      "ACTIVE_IDENTITY_ACTOR_REQUIRED",
      "ACTIVE_TENANT_ASSIGNMENT_REQUIRED",
      "TENANT_ACTOR_BINDING_MISMATCH"
    ].includes(error.message)) return null;
    throw error;
  }
}

export async function hasVerifiedMemberTeamAccess(
  database: PrismaClient,
  context: Parameters<typeof resolveVerifiedMemberTeamAccess>[1]
): Promise<boolean> {
  return Boolean(await resolveVerifiedMemberTeamAccess(database, context));
}

export async function withInvitationSession<T>(
  database: PrismaClient,
  context: { authSubject: string; tokenHash: string; requestId?: string; actionReason: string },
  operation: (transaction: Prisma.TransactionClient, identity: VerifiedTenantIdentity & { invitationId: string; teamId: string }) => Promise<T>,
  options: { isolationLevel?: Prisma.TransactionIsolationLevel } = {}
) {
  return database.$transaction(async (transaction) => {
    const identityRows = await transaction.$queryRaw<{ appUserId: string }[]>`
      SELECT entral.bind_authenticated_app_user(${context.authSubject}) AS "appUserId"
    `;
    const appUserId = identityRows[0]?.appUserId;
    if (!appUserId) throw new Error("Canonical database session identity could not be established.");
    const invitationRows = await transaction.$queryRaw<Array<{
      invitationId: string;
      tenantId: string;
      organizationId: string;
      teamId: string;
      actorId: string;
      role: string;
    }>>`
      SELECT * FROM entral.phase202_resolve_invitation_context(${context.tokenHash},${context.authSubject})
    `;
    const invitation = invitationRows[0];
    if (!invitation) throw new Error("INVALID_OR_EXPIRED_INVITATION");
    await transaction.$queryRaw`
      SELECT set_config('app.tenant_id',${invitation.tenantId},true),
             set_config('app.organization_id',${invitation.organizationId},true),
             set_config('app.phase202_actor_id',${invitation.actorId},true),
             set_config('app.phase202_invitation_id',${invitation.invitationId},true),
             set_config('app.phase202_invitation_token_hash',${context.tokenHash},true),
             set_config('app.correlation_id',${context.requestId ?? randomUUID()},true),
             set_config('app.action_reason',${context.actionReason},true)
    `;
    return operation(transaction, { ...invitation, appUserId });
  }, options);
}

export async function withInvitedSignupSession<T>(
  database: PrismaClient,
  context: {
    actorId: string;
    email: string;
    name: string;
    passwordHash: string;
    requestId?: string;
    tokenHash: string;
    userId: string;
  },
  operation: (
    transaction: Prisma.TransactionClient,
    identity: VerifiedTenantIdentity & { authSubject: string; invitationId: string; teamId: string }
  ) => Promise<T>,
  options: { isolationLevel?: Prisma.TransactionIsolationLevel } = {}
) {
  return database.$transaction(async (transaction) => {
    const normalizedEmail = context.email.trim().toLowerCase();
    await transaction.$queryRaw`
      SELECT set_config('app.phase202_auth_email',${normalizedEmail},true),
             set_config('app.phase202_invitation_token_hash',${context.tokenHash},true),
             set_config('app.correlation_id',${context.requestId ?? randomUUID()},true),
             set_config('app.action_reason','membership.invited_signup.register',true)
    `;
    const registrationRows = await transaction.$queryRaw<Array<{ userId: string }>>`
      SELECT entral.phase202_register_invited_identity(
        ${context.tokenHash},${normalizedEmail},${context.name},${context.passwordHash},
        ${context.userId},${context.actorId}::uuid
      ) AS "userId"
    `;
    const registeredUserId = registrationRows[0]?.userId;
    if (!registeredUserId) throw new Error("INVALID_OR_EXPIRED_INVITATION");
    const identityRows = await transaction.$queryRaw<{ appUserId: string }[]>`
      SELECT entral.bind_authenticated_app_user(${registeredUserId}) AS "appUserId"
    `;
    const appUserId = identityRows[0]?.appUserId;
    if (!appUserId) throw new Error("Canonical database session identity could not be established.");
    const invitationRows = await transaction.$queryRaw<Array<{
      invitationId: string;
      tenantId: string;
      organizationId: string;
      teamId: string;
      actorId: string;
      role: string;
    }>>`
      SELECT * FROM entral.phase202_resolve_invitation_context(${context.tokenHash},${registeredUserId})
    `;
    const invitation = invitationRows[0];
    if (!invitation) throw new Error("INVALID_OR_EXPIRED_INVITATION");
    await transaction.$queryRaw`
      SELECT set_config('app.tenant_id',${invitation.tenantId},true),
             set_config('app.organization_id',${invitation.organizationId},true),
             set_config('app.phase202_actor_id',${invitation.actorId},true),
             set_config('app.phase202_invitation_id',${invitation.invitationId},true),
             set_config('app.phase202_invitation_token_hash',${context.tokenHash},true),
             set_config('app.correlation_id',${context.requestId ?? randomUUID()},true),
             set_config('app.action_reason','membership.invited_signup.accept',true)
    `;
    return operation(transaction, { ...invitation, appUserId, authSubject: registeredUserId });
  }, options);
}

export async function withPersonalSession<T>(
  database: PrismaClient,
  context: { authSubject: string; requestId?: string; actionReason: string },
  operation: (transaction: Prisma.TransactionClient, identity: { actorId: string; appUserId: string; authSubject: string }) => Promise<T>,
  options: { isolationLevel?: Prisma.TransactionIsolationLevel } = {}
) {
  return database.$transaction(async (transaction) => {
    const identityRows = await transaction.$queryRaw<{ appUserId: string }[]>`
      SELECT entral.bind_authenticated_app_user(${context.authSubject}) AS "appUserId"
    `;
    const appUserId = identityRows[0]?.appUserId;
    if (!appUserId) throw new Error("Canonical database session identity could not be established.");
    const actorRows = await transaction.$queryRaw<{ actorId: string }[]>`
      SELECT entral.phase202_resolve_human_actor(${context.authSubject})::text AS "actorId"
    `;
    const actorId = actorRows[0]?.actorId;
    if (!actorId) throw new Error("ACTIVE_HUMAN_ACTOR_REQUIRED");
    await transaction.$queryRaw`
      SELECT set_config('app.phase202_actor_id',${actorId},true),
             set_config('app.correlation_id',${context.requestId ?? randomUUID()},true),
             set_config('app.action_reason',${context.actionReason},true)
    `;
    return operation(transaction, { actorId, appUserId, authSubject: context.authSubject });
  }, options);
}

export async function withPreAuthEmailSession<T>(
  database: PrismaClient,
  context: { actionReason: string; email: string; requestId?: string },
  operation: (
    transaction: Prisma.TransactionClient,
    identity: { email: string; userId: string | null }
  ) => Promise<T>,
  options: { isolationLevel?: Prisma.TransactionIsolationLevel } = {}
) {
  const normalizedEmail = context.email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("PREAUTH_EMAIL_REQUIRED");
  return database.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      SELECT set_config('app.phase202_auth_email',${normalizedEmail},true),
             set_config('app.correlation_id',${context.requestId ?? randomUUID()},true),
             set_config('app.action_reason',${context.actionReason},true)
    `;
    const scopedUser = await transaction.user.findUnique({
      select: { id: true },
      where: { email: normalizedEmail }
    });
    if (scopedUser) {
      await transaction.$queryRaw`
        SELECT set_config('app.phase202_auth_user_id',${scopedUser.id},true)
      `;
    }
    return operation(transaction, { email: normalizedEmail, userId: scopedUser?.id ?? null });
  }, options);
}

export async function withRecoveryTokenSession<T>(
  database: PrismaClient,
  context: {
    actionReason: string;
    requestId?: string;
    tokenHash: string;
    tokenKind: "EMAIL_VERIFICATION" | "PASSWORD_RESET";
  },
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  options: { isolationLevel?: Prisma.TransactionIsolationLevel } = {}
) {
  if (!/^[0-9a-f]{64}$/u.test(context.tokenHash)) throw new Error("RECOVERY_TOKEN_HASH_INVALID");
  return database.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      SELECT set_config('app.phase202_recovery_token_hash',${context.tokenHash},true),
             set_config('app.phase202_recovery_token_kind',${context.tokenKind},true),
             set_config('app.correlation_id',${context.requestId ?? randomUUID()},true),
             set_config('app.action_reason',${context.actionReason},true)
    `;
    return operation(transaction);
  }, options);
}
