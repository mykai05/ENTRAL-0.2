import { randomUUID } from "node:crypto";
import { Queue } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { withCanonicalSession } from "../db.js";
import { dispatchCanonicalOutboxBatch } from "../services/canonicalOutboxWorker.js";
import {
  readWorkerReadinessEvidence,
  startWorkerReadinessHeartbeat
} from "../services/workerReadiness.js";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const QUEUE_NAME = "entral-canonical-events";

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

function disposableRedisUrl(environment: ProbeEnvironment) {
  const raw = required(environment, "PHASE195_RECOVERY_REDIS_URL");
  const parsed = new URL(raw);
  if (
    parsed.protocol !== "redis:"
    || !LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())
  ) {
    throw new Error("PHASE195_RECOVERY_REDIS_URL_NOT_DISPOSABLE");
  }
  return raw;
}

function databaseClient(databaseUrl: string) {
  return new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: []
  });
}

function lifecycleActionIds(environment: ProbeEnvironment) {
  const values = required(
    environment,
    "PHASE195_RECOVERY_LIFECYCLE_ACTION_IDS"
  ).split(",");
  if (
    values.length !== 2
    || new Set(values).size !== 2
    || values.some((value) =>
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
        .test(value)
    )
  ) {
    throw new Error("INVALID_LIFECYCLE_ACTION_IDS");
  }
  return values;
}

async function roleEvidence(
  database: PrismaClient,
  expectedMembership: "entral_api" | "entral_worker"
) {
  const rows = await database.$queryRaw<Array<{
    roleName: string;
    superuser: boolean;
    bypassRls: boolean;
    expectedMembership: boolean;
  }>>`
    SELECT
      current_user::text AS "roleName",
      roles.rolsuper AS superuser,
      roles.rolbypassrls AS "bypassRls",
      pg_has_role(current_user, ${expectedMembership}, 'member')
        AS "expectedMembership"
    FROM pg_roles AS roles
    WHERE roles.rolname = current_user
  `;
  const evidence = rows[0];
  if (
    !evidence
    || evidence.superuser
    || evidence.bypassRls
    || !evidence.expectedMembership
  ) {
    throw new Error(`${expectedMembership.toUpperCase()}_IDENTITY_UNSAFE`);
  }
  return evidence;
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

  const ownerTarget = disposableDatabaseUrl(
    process.env,
    "PHASE195_RECOVERY_OWNER_DATABASE_URL"
  );
  const apiTarget = disposableDatabaseUrl(
    process.env,
    "PHASE195_RECOVERY_API_DATABASE_URL"
  );
  const workerTarget = disposableDatabaseUrl(
    process.env,
    "PHASE195_RECOVERY_WORKER_DATABASE_URL"
  );
  if (
    ownerTarget.database !== apiTarget.database
    || ownerTarget.database !== workerTarget.database
  ) {
    throw new Error("RECOVERY_DATABASE_TARGET_MISMATCH");
  }
  const redisUrl = disposableRedisUrl(process.env);
  const runId = required(process.env, "PHASE195_RECOVERY_RUN_ID");
  if (!/^[a-f0-9]{12}$/.test(runId)) {
    throw new Error("INVALID_RECOVERY_RUN_ID");
  }
  const expectedLifecycleActionIds = lifecycleActionIds(process.env);

  const owner = databaseClient(ownerTarget.raw);
  const api = databaseClient(apiTarget.raw);
  const worker = databaseClient(workerTarget.raw);
  const queue = new Queue(QUEUE_NAME, {
    connection: { url: redisUrl }
  });
  const workerAppUserId = randomUUID();
  const authSubject = `phase195-recovery-human-${runId}`;
  let stopHeartbeat: (() => Promise<void>) | undefined;

  try {
    await owner.$executeRaw`
      INSERT INTO public."User" (
        id, name, email, "passwordHash", role, "updatedAt"
      ) VALUES (
        ${authSubject},
        'Phase 195 recovery human',
        ${`phase195-recovery-human-${runId}@example.invalid`},
        'disposable-recovery-probe-no-login',
        'ADMIN',
        clock_timestamp()
      )
    `;
    await owner.$executeRaw`
      INSERT INTO entral.app_users (
        id, email, display_name, is_human_authority, is_active, auth_subject
      ) VALUES (
        ${workerAppUserId}::uuid,
        ${`phase195-recovery-worker-${runId}@example.invalid`},
        'Phase 195 recovery worker',
        false,
        true,
        NULL
      )
    `;
    await owner.$executeRaw`
      INSERT INTO entral.scope_grants (
        user_id, scope_type, scope_id, permissions
      ) VALUES (
        ${workerAppUserId}::uuid,
        'SYSTEM',
        NULL,
        ARRAY['publish_events']::text[]
      )
    `;

    const [apiRole, workerRole] = await Promise.all([
      roleEvidence(api, "entral_api"),
      roleEvidence(worker, "entral_worker")
    ]);
    const canonical = await withCanonicalSession(
      api,
      {
        actionReason:
          "Verify restored Phase 195 canonical taxonomy through the non-superuser API identity.",
        authSubject
      },
      async (transaction) => {
        const rows = await transaction.$queryRaw<Array<{
          entral: number;
          marshals: number;
          generals: number;
          entities: number;
          hierarchyEdges: number;
        }>>`
          SELECT
            count(*) FILTER (WHERE role = 'ENTRAL')::integer AS entral,
            count(*) FILTER (WHERE role = 'MARSHAL')::integer AS marshals,
            count(*) FILTER (WHERE role = 'GENERAL')::integer AS generals,
            count(*)::integer AS entities,
            count(*) FILTER (WHERE parent_id IS NOT NULL)::integer
              AS "hierarchyEdges"
          FROM entral.entities
          WHERE status <> 'RETIRED'
        `;
        return rows[0];
      }
    );
    if (
      !canonical
      || canonical.entral !== 1
      || canonical.marshals !== 8
      || canonical.generals !== 123
      || canonical.entities !== 132
      || canonical.hierarchyEdges !== 131
    ) {
      throw new Error("RESTORED_CANONICAL_COUNTS_MISMATCH");
    }

    const pending = await withCanonicalSession(
      worker,
      {
        actionReason:
          "Read restored pending outbox evidence through the non-superuser worker identity.",
        serviceAppUserId: workerAppUserId
      },
      async (transaction) => transaction.$queryRaw<Array<{
        id: string;
        eventId: string;
      }>>`
        SELECT id, event_id AS "eventId"
        FROM entral.transactional_outbox
        WHERE status IN ('PENDING', 'FAILED')
          AND available_at <= clock_timestamp()
        ORDER BY available_at, created_at, id
        LIMIT 1000
      `
    );
    const expectedOutbox = pending[0];
    if (!expectedOutbox) {
      throw new Error("RESTORED_OUTBOX_EVENT_REQUIRED");
    }

    await queue.waitUntilReady();
    const dispatch = await dispatchCanonicalOutboxBatch({
      batchSize: pending.length,
      database: worker,
      publisher: {
        publish: async (event) => {
          await queue.add(event.topic, {
            eventId: event.eventId,
            outboxId: event.id,
            partitionKey: event.partitionKey,
            payload: event.payload,
            topic: event.topic
          }, {
            jobId: event.id
          });
        }
      },
      serviceAppUserId: workerAppUserId,
      workerId: `phase195-recovery-${runId}`
    });
    if (
      dispatch.claimed !== pending.length
      || dispatch.published !== pending.length
      || dispatch.failed !== 0
      || dispatch.deadLettered !== 0
    ) {
      throw new Error("OUTBOX_DISPATCH_FAILED");
    }
    const published = await withCanonicalSession(
      worker,
      {
        actionReason:
          "Verify restored outbox publication through the non-superuser worker identity.",
        serviceAppUserId: workerAppUserId
      },
      async (transaction) => transaction.$queryRaw<Array<{
        id: string;
        status: string;
        attempts: number;
        publishedAt: Date | null;
      }>>`
        SELECT
          id,
          status,
          attempts,
          published_at AS "publishedAt"
        FROM entral.transactional_outbox
        WHERE id = ${expectedOutbox.id}::uuid
      `
    );
    const publishedRow = published[0];
    if (
      !publishedRow
      || publishedRow.status !== "PUBLISHED"
      || publishedRow.attempts !== 1
      || !publishedRow.publishedAt
    ) {
      throw new Error("OUTBOX_PUBLICATION_RECEIPT_MISSING");
    }
    const redisJob = await queue.getJob(expectedOutbox.id);
    if (
      !redisJob
      || redisJob.data?.outboxId !== expectedOutbox.id
      || redisJob.data?.eventId !== expectedOutbox.eventId
    ) {
      throw new Error("REDIS_OUTBOX_JOB_MISMATCH");
    }
    const lifecycleOutbox = await owner.$queryRaw<Array<{
      eventId: string;
      outboxId: string;
      status: string;
    }>>`
        SELECT
          event.id AS "eventId",
          outbox.id AS "outboxId",
          outbox.status::text AS status
        FROM entral.canonical_events AS event
        JOIN entral.transactional_outbox AS outbox
          ON outbox.event_id = event.id
        WHERE event.governance_action_id = ANY(
          ${expectedLifecycleActionIds}::uuid[]
        )
          AND event.aggregate_type = 'ENTITIES'
          AND event.event_type = 'entities.update'
        ORDER BY event.sequence_number
      `;
    if (
      lifecycleOutbox.length !== 2
      || lifecycleOutbox.some((row) => row.status !== "PUBLISHED")
    ) {
      throw new Error("LIFECYCLE_OUTBOX_NOT_PUBLISHED_AFTER_RESTART");
    }
    const lifecycleJobs = await Promise.all(
      lifecycleOutbox.map((row) => queue.getJob(row.outboxId))
    );
    if (lifecycleJobs.some((job) => !job)) {
      throw new Error("LIFECYCLE_REDIS_JOB_MISSING_AFTER_RESTART");
    }

    stopHeartbeat = await startWorkerReadinessHeartbeat({
      components: {
        process: true,
        automation_worker: true,
        agent_orchestrator: true,
        autonomy_scheduler: true,
        canonical_outbox_dispatcher: true
      },
      database: worker,
      heartbeatIntervalMs: 60_000,
      instanceId: `phase195-recovery-${runId}`,
      production: true,
      serviceAppUserId: workerAppUserId
    });
    const readiness = await readWorkerReadinessEvidence(api);
    if (
      !readiness.ready
      || readiness.status !== "READY"
      || readiness.evidence_source !== "DURABLE_HEARTBEAT"
      || readiness.queue?.pending !== 0
      || readiness.queue?.publishing !== 0
      || readiness.queue?.failed !== 0
      || readiness.queue?.dead_letter !== 0
      || readiness.queue?.published_last_24h !== pending.length
    ) {
      throw new Error("RESTORED_WORKER_NOT_READY");
    }

    return {
      api_identity: {
        bypass_rls: apiRole.bypassRls,
        role_name: apiRole.roleName,
        superuser: apiRole.superuser
      },
      canonical,
      outbox: {
        attempts: publishedRow.attempts,
        dispatch,
        event_id: expectedOutbox.eventId,
        lifecycle_events_published: lifecycleOutbox.length,
        lifecycle_redis_jobs_present: lifecycleJobs.length,
        outbox_id: expectedOutbox.id,
        pending_after_dispatch: readiness.queue.pending,
        postgres_status: publishedRow.status,
        published_total: pending.length,
        redis_job_present: true
      },
      redis: {
        queue_name: QUEUE_NAME,
        ready: true
      },
      worker_identity: {
        bypass_rls: workerRole.bypassRls,
        role_name: workerRole.roleName,
        superuser: workerRole.superuser
      },
      worker_readiness: readiness
    };
  } finally {
    await stopHeartbeat?.();
    await Promise.allSettled([
      queue.close(),
      owner.$disconnect(),
      api.$disconnect(),
      worker.$disconnect()
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
      : "PHASE195_RECOVERY_PROBE_FAILED"
  })}\n`);
  process.exitCode = 1;
}
