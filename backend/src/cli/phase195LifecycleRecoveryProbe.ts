import { randomUUID } from "node:crypto";
import {
  assertEntityLifecycleActionRequest,
  type EntityLifecycleActionRequest,
  type EntityStatus
} from "@entral/contracts";
import { PrismaClient } from "@prisma/client";
import { withCanonicalSession } from "../db.js";
import {
  CanonicalEntityLifecycleService
} from "../services/canonicalEntityLifecycle.js";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

type ProbeEnvironment = Readonly<Record<string, string | undefined>>;

function required(environment: ProbeEnvironment, name: string) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}

function disposableDatabaseUrl(
  environment: ProbeEnvironment,
  name: string
) {
  const raw = required(environment, name);
  const parsed = new URL(raw);
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol)
    || !LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())
    || !database.startsWith("entral_phase195_restore_")
  ) {
    throw new Error(`${name}_NOT_DISPOSABLE`);
  }
  return { database, raw };
}

function databaseClient(databaseUrl: string) {
  return new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: []
  });
}

function session(authSubject: string, reason: string) {
  return {
    actionReason: reason,
    authSubject,
    correlationId: randomUUID()
  } as const;
}

function lifecycleRequest(input: {
  actionType: "PAUSE" | "RESUME";
  actorId: string;
  expectedVersion: number;
  previousStatus: EntityStatus;
  restoresActionId?: string;
  targetId: string;
}): EntityLifecycleActionRequest {
  const actionId = randomUUID();
  const nextStatus = input.actionType === "PAUSE" ? "PAUSED" : "ACTIVE";
  return {
    action_id: actionId,
    action_type: input.actionType,
    actor_id: input.actorId,
    actor_type: "HUMAN",
    authority_basis: {
      channel: "MEMBER_INFRASTRUCTURE",
      explicit_confirmation_required: true,
      target_version: input.expectedVersion
    },
    business_id: null,
    confidence: 1,
    expected_version: input.expectedVersion,
    idempotency_key: `phase195-recovery:${actionId}`,
    proposed_changes: {
      containment_policy: "FINISH_IN_FLIGHT",
      status: nextStatus
    },
    reason:
      `${input.actionType} the disposable Phase 195 restart-recovery target.`,
    requested_at: new Date().toISOString(),
    requested_outcome:
      `${input.actionType} the entity with verified durable convergence.`,
    restores_action_id: input.restoresActionId,
    risk_class: "MEDIUM",
    rollback_plan: {
      action: input.actionType === "PAUSE" ? "RESUME" : "PAUSE",
      previous_status: input.previousStatus
    },
    scope: {
      display_label: "Phase 195 disposable restart recovery",
      entity_id: input.targetId,
      scope_id: input.actorId,
      scope_type: "USER"
    },
    target_id: input.targetId,
    target_type: "ENTITY",
    verification_plan: {
      checks: [
        "canonical status and version readback",
        "new-work lease containment",
        "event audit outbox and conversation receipts"
      ]
    }
  };
}

async function apiRoleEvidence(api: PrismaClient) {
  const rows = await api.$queryRaw<Array<{
    roleName: string;
    superuser: boolean;
    bypassRls: boolean;
    apiMember: boolean;
  }>>`
    SELECT
      current_user::text AS "roleName",
      roles.rolsuper AS superuser,
      roles.rolbypassrls AS "bypassRls",
      pg_has_role(current_user, 'entral_api', 'member') AS "apiMember"
    FROM pg_roles AS roles
    WHERE roles.rolname = current_user
  `;
  const evidence = rows[0];
  if (
    !evidence
    || evidence.superuser
    || evidence.bypassRls
    || !evidence.apiMember
  ) {
    throw new Error("LIFECYCLE_API_IDENTITY_UNSAFE");
  }
  return evidence;
}

async function readTarget(
  api: PrismaClient,
  authSubject: string,
  targetId?: string
) {
  return withCanonicalSession(
    api,
    {
      actionReason:
        "Read the disposable lifecycle target across the PostgreSQL restart.",
      authSubject
    },
    async (transaction, appUserId) => {
      const rows = targetId
        ? await transaction.$queryRaw<Array<{
          id: string;
          stableCode: string;
          status: EntityStatus;
          version: bigint;
        }>>`
          SELECT
            id,
            stable_code AS "stableCode",
            status::text AS status,
            version
          FROM entral.entities
          WHERE id = ${targetId}::uuid
            AND role = 'MARSHAL'
        `
        : await transaction.$queryRaw<Array<{
          id: string;
          stableCode: string;
          status: EntityStatus;
          version: bigint;
        }>>`
          SELECT
            id,
            stable_code AS "stableCode",
            status::text AS status,
            version
          FROM entral.entities
          WHERE role = 'MARSHAL'
          ORDER BY stable_code COLLATE "C"
          LIMIT 1
        `;
      const target = rows[0];
      if (!target) throw new Error("LIFECYCLE_MARSHAL_TARGET_MISSING");
      return {
        actor_id: appUserId,
        id: target.id,
        stable_code: target.stableCode,
        status: target.status,
        version: Number(target.version)
      };
    }
  );
}

async function preRestart(
  owner: PrismaClient,
  api: PrismaClient,
  runId: string
) {
  const authSubject = `phase195-recovery-lifecycle-${runId}`;
  const humanEmail =
    `phase195-recovery-lifecycle-${runId}@example.invalid`;
  await owner.$executeRaw`
    INSERT INTO public."User" (
      id, name, email, "passwordHash", role, "updatedAt"
    ) VALUES (
      ${authSubject},
      'Phase 195 lifecycle recovery human',
      ${humanEmail},
      'disposable-recovery-probe-no-login',
      'ADMIN',
      clock_timestamp()
    )
  `;
  const target = await readTarget(api, authSubject);
  await owner.$executeRaw`
    INSERT INTO entral.scope_grants (
      user_id, scope_type, scope_id, permissions
    ) VALUES (
      ${target.actor_id}::uuid,
      'SYSTEM',
      NULL,
      ARRAY['record_verification']::text[]
    )
  `;
  if (target.status !== "ACTIVE") {
    throw new Error("LIFECYCLE_TARGET_NOT_ACTIVE");
  }
  const request = lifecycleRequest({
    actionType: "PAUSE",
    actorId: target.actor_id,
    expectedVersion: target.version,
    previousStatus: target.status,
    targetId: target.id
  });
  const paused = await new CanonicalEntityLifecycleService(api).execute(
    request,
    {
      authenticatedHumanEmail: humanEmail,
      databaseSession: session(authSubject, request.reason)
    }
  );
  if (
    paused.idempotent_replay
    || paused.after.status !== "PAUSED"
    || paused.after.version !== target.version + 1
    || !paused.verification.passed
  ) {
    throw new Error("PRE_RESTART_PAUSE_NOT_DURABLE");
  }
  return {
    auth_subject: authSubject,
    human_email: humanEmail,
    pause_request: request,
    receipt: {
      action_id: request.action_id,
      canonical_event_id: paused.canonical_event.event_id,
      idempotent_replay: paused.idempotent_replay,
      observed_status: paused.verification.observed_status,
      observed_version: paused.verification.observed_version,
      stage: "PRE_RESTART",
      target_entity_id: target.id,
      target_stable_code: target.stable_code
    }
  };
}

function parseHandoff(environment: ProbeEnvironment) {
  const raw = required(
    environment,
    "PHASE195_RECOVERY_LIFECYCLE_HANDOFF"
  );
  if (Buffer.byteLength(raw, "utf8") > 16_384) {
    throw new Error("LIFECYCLE_HANDOFF_TOO_LARGE");
  }
  const value = JSON.parse(raw) as {
    auth_subject?: unknown;
    human_email?: unknown;
    pause_request?: unknown;
    receipt?: {
      canonical_event_id?: unknown;
    };
  };
  if (
    typeof value.auth_subject !== "string"
    || typeof value.human_email !== "string"
    || typeof value.receipt?.canonical_event_id !== "string"
  ) {
    throw new Error("LIFECYCLE_HANDOFF_INVALID");
  }
  const pauseRequest =
    value.pause_request as EntityLifecycleActionRequest;
  assertEntityLifecycleActionRequest(pauseRequest);
  return {
    authSubject: value.auth_subject,
    canonicalEventId: value.receipt.canonical_event_id,
    humanEmail: value.human_email,
    pauseRequest
  };
}

async function postRestart(api: PrismaClient) {
  const handoff = parseHandoff(process.env);
  const persisted = await readTarget(
    api,
    handoff.authSubject,
    handoff.pauseRequest.target_id
  );
  if (
    persisted.status !== "PAUSED"
    || persisted.version !== handoff.pauseRequest.expected_version + 1
  ) {
    throw new Error("PAUSE_DID_NOT_SURVIVE_POSTGRES_RESTART");
  }
  const service = new CanonicalEntityLifecycleService(api);
  const replay = await service.execute(handoff.pauseRequest, {
    authenticatedHumanEmail: handoff.humanEmail,
    databaseSession: session(
      handoff.authSubject,
      handoff.pauseRequest.reason
    )
  });
  if (
    !replay.idempotent_replay
    || replay.canonical_event.event_id !== handoff.canonicalEventId
    || replay.after.status !== "PAUSED"
    || replay.after.version !== persisted.version
  ) {
    throw new Error("POST_RESTART_IDEMPOTENT_REPLAY_FAILED");
  }
  const resumeRequest = lifecycleRequest({
    actionType: "RESUME",
    actorId: handoff.pauseRequest.actor_id,
    expectedVersion: persisted.version,
    previousStatus: "PAUSED",
    restoresActionId: handoff.pauseRequest.action_id,
    targetId: persisted.id
  });
  const resumed = await service.execute(resumeRequest, {
    authenticatedHumanEmail: handoff.humanEmail,
    databaseSession: session(handoff.authSubject, resumeRequest.reason)
  });
  const active = await readTarget(
    api,
    handoff.authSubject,
    persisted.id
  );
  if (
    resumed.after.status !== "ACTIVE"
    || resumed.after.version !== persisted.version + 1
    || resumed.restoration_of_action_id !== handoff.pauseRequest.action_id
    || active.status !== "ACTIVE"
    || active.version !== resumed.after.version
  ) {
    throw new Error("POST_RESTART_RESUME_NOT_DURABLE");
  }
  return {
    idempotent_pause_replay: true,
    pause_action_id: handoff.pauseRequest.action_id,
    pause_canonical_event_id: replay.canonical_event.event_id,
    persisted_status_after_restart: persisted.status,
    persisted_version_after_restart: persisted.version,
    resume_action_id: resumeRequest.action_id,
    restored_active_status: active.status,
    restored_active_version: active.version,
    restoration_of_action_id: resumed.restoration_of_action_id,
    stage: "POST_RESTART",
    target_entity_id: persisted.id
  };
}

async function main() {
  if (process.argv.slice(2).length > 0) {
    throw new Error("CLI_ARGUMENTS_FORBIDDEN");
  }
  if (
    process.env.PHASE195_RECOVERY_GATE_CONFIRM
    !== "DISPOSABLE_ONLY"
  ) {
    throw new Error("DISPOSABLE_CONFIRMATION_REQUIRED");
  }
  const runId = required(process.env, "PHASE195_RECOVERY_RUN_ID");
  if (!/^[a-f0-9]{12}$/.test(runId)) {
    throw new Error("INVALID_RECOVERY_RUN_ID");
  }
  const stage = required(
    process.env,
    "PHASE195_RECOVERY_LIFECYCLE_STAGE"
  );
  if (stage !== "PRE_RESTART" && stage !== "POST_RESTART") {
    throw new Error("INVALID_LIFECYCLE_RECOVERY_STAGE");
  }
  const ownerTarget = disposableDatabaseUrl(
    process.env,
    "PHASE195_RECOVERY_OWNER_DATABASE_URL"
  );
  const apiTarget = disposableDatabaseUrl(
    process.env,
    "PHASE195_RECOVERY_API_DATABASE_URL"
  );
  if (ownerTarget.database !== apiTarget.database) {
    throw new Error("RECOVERY_DATABASE_TARGET_MISMATCH");
  }
  const owner = databaseClient(ownerTarget.raw);
  const api = databaseClient(apiTarget.raw);
  try {
    const identity = await apiRoleEvidence(api);
    const result = stage === "PRE_RESTART"
      ? await preRestart(owner, api, runId)
      : await postRestart(api);
    return {
      api_identity: {
        bypass_rls: identity.bypassRls,
        role_name: identity.roleName,
        superuser: identity.superuser
      },
      ...result
    };
  } finally {
    await Promise.allSettled([
      owner.$disconnect(),
      api.$disconnect()
    ]);
  }
}

try {
  const receipt = await main();
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    error: error instanceof Error
      ? error.message.replace(/[^A-Z0-9_]/gi, "_").slice(0, 160)
      : "PHASE195_LIFECYCLE_RECOVERY_PROBE_FAILED"
  })}\n`);
  process.exitCode = 1;
}
