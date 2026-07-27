import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import {
  WORKER_READINESS_CONTRACT_VERSION,
  parseWorkerReadinessEvidence,
  type WorkerReadinessEvidence
} from "@entral/contracts";
import type { PrismaClient } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";
import { prisma, withCanonicalSession } from "../db.js";

const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;

export type WorkerReadinessComponents = {
  process: boolean;
  automation_worker: boolean;
  agent_orchestrator: boolean;
  autonomy_scheduler: boolean;
  canonical_outbox_dispatcher: boolean;
};

const requiredWorkerReadinessComponents = [
  "process",
  "automation_worker",
  "agent_orchestrator",
  "autonomy_scheduler",
  "canonical_outbox_dispatcher"
] as const satisfies readonly (keyof WorkerReadinessComponents)[];

type StartWorkerReadinessOptions = {
  components?: WorkerReadinessComponents;
  database?: PrismaClient;
  getComponents?: () => WorkerReadinessComponents;
  heartbeatIntervalMs?: number;
  instanceId?: string;
  logger?: Pick<FastifyBaseLogger, "error" | "info" | "warn"> | Console;
  production: boolean;
  serviceAppUserId?: string;
};

export type WorkerReadinessHeartbeatStop = (() => Promise<void>) & {
  recordNow: () => Promise<void>;
};

type PublicReadinessRow = {
  readinessStatus: "READY" | "DEGRADED" | "STALE" | "UNAVAILABLE";
  observedAt: Date | null;
  ageSeconds: string | number | null;
  components: unknown;
  queuePending: number | bigint;
  queuePublishing: number | bigint;
  queueFailed: number | bigint;
  queueDeadLetter: number | bigint;
  queuePublishedLast24h: number | bigint;
};

function sanitizeComponents(value: unknown): WorkerReadinessComponents {
  const candidate = typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    process: candidate.process === true,
    automation_worker: candidate.automation_worker === true,
    agent_orchestrator: candidate.agent_orchestrator === true,
    autonomy_scheduler: candidate.autonomy_scheduler === true,
    canonical_outbox_dispatcher: candidate.canonical_outbox_dispatcher === true
  };
}

function disabledWorkerReadinessComponents(
  components: WorkerReadinessComponents
): readonly (keyof WorkerReadinessComponents)[] {
  return requiredWorkerReadinessComponents.filter((component) => !components[component]);
}

function readinessStatusForComponents(
  components: WorkerReadinessComponents
): "READY" | "DEGRADED" {
  return disabledWorkerReadinessComponents(components).length === 0
    ? "READY"
    : "DEGRADED";
}

function unavailableReadiness(): WorkerReadinessEvidence {
  return parseWorkerReadinessEvidence({
    contract_version: WORKER_READINESS_CONTRACT_VERSION,
    schema_version: 1,
    status: "UNAVAILABLE",
    ready: false,
    evidence_source: "NONE",
    observed_at: null,
    age_seconds: null,
    components: sanitizeComponents(null),
    queue: null
  });
}

export function assertWorkerReadinessConfiguration(input: {
  components: WorkerReadinessComponents;
  production: boolean;
  serviceAppUserId?: string;
}) {
  if (input.production && !input.serviceAppUserId) {
    throw new Error(
      "CANONICAL_OUTBOX_SERVICE_APP_USER_ID is required for production worker readiness evidence."
    );
  }
  const disabledComponents = disabledWorkerReadinessComponents(input.components);
  if (input.production && disabledComponents.length > 0) {
    throw new Error(
      `Production worker readiness requires every component to be enabled; disabled: ${disabledComponents.join(", ")}.`
    );
  }
}

async function writeHeartbeat(input: {
  components: WorkerReadinessComponents;
  database: PrismaClient;
  instanceId: string;
  serviceAppUserId: string;
  startedAt: Date;
  status: "READY" | "DEGRADED" | "STOPPING";
}) {
  const components = JSON.stringify(input.components);
  return withCanonicalSession(input.database, {
    actionReason: `Record sanitized worker ${input.status.toLocaleLowerCase()} readiness evidence.`,
    serviceAppUserId: input.serviceAppUserId
  }, async (transaction, appUserId) => {
    await transaction.$executeRaw`
      INSERT INTO entral.worker_readiness_heartbeats (
        instance_id,
        service_app_user_id,
        service_name,
        process_role,
        status,
        components,
        started_at,
        heartbeat_at,
        stopped_at
      ) VALUES (
        ${input.instanceId},
        ${appUserId}::uuid,
        'entral-worker',
        'WORKER',
        ${input.status},
        ${components}::jsonb,
        ${input.startedAt},
        clock_timestamp(),
        CASE WHEN ${input.status} = 'STOPPING' THEN clock_timestamp() ELSE NULL END
      )
      ON CONFLICT (instance_id) DO UPDATE
      SET
        status = EXCLUDED.status,
        components = EXCLUDED.components,
        heartbeat_at = EXCLUDED.heartbeat_at,
        stopped_at = EXCLUDED.stopped_at
      WHERE entral.worker_readiness_heartbeats.service_app_user_id = ${appUserId}::uuid
    `;
  });
}

export async function startWorkerReadinessHeartbeat(
  options: StartWorkerReadinessOptions
): Promise<WorkerReadinessHeartbeatStop> {
  if (!options.components && !options.getComponents) {
    throw new Error("Worker readiness requires components or getComponents.");
  }
  const getComponents = () => sanitizeComponents(
    options.getComponents?.() ?? options.components
  );
  assertWorkerReadinessConfiguration({
    components: getComponents(),
    production: options.production,
    serviceAppUserId: options.serviceAppUserId
  });
  if (!options.serviceAppUserId) {
    options.logger?.warn("Worker readiness heartbeat is disabled outside production because no service identity is configured.");
    const stop = async () => undefined;
    return Object.assign(stop, {
      recordNow: async () => undefined
    });
  }
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
  if (!Number.isSafeInteger(heartbeatIntervalMs) || heartbeatIntervalMs < 1_000 || heartbeatIntervalMs > 60_000) {
    throw new Error("Worker readiness heartbeat interval must be between 1000 and 60000 milliseconds.");
  }
  const database = options.database ?? prisma;
  const instanceId = options.instanceId ?? `${hostname()}:${process.pid}:${randomUUID()}`;
  const startedAt = new Date();
  let timer: NodeJS.Timeout | undefined;
  let stopped = false;
  let stopCompleted = false;
  let stopPromise: Promise<void> | undefined;
  let writeQueue = Promise.resolve();
  let pendingDegradedComponents: WorkerReadinessComponents | undefined;

  const enqueueWrite = (
    components: WorkerReadinessComponents,
    status: "READY" | "DEGRADED" | "STOPPING"
  ) => {
    const write = writeQueue.then(async () => {
      if (pendingDegradedComponents) {
        const pending = pendingDegradedComponents;
        await writeHeartbeat({
          components: pending,
          database,
          instanceId,
          serviceAppUserId: options.serviceAppUserId!,
          startedAt,
          status: "DEGRADED"
        });
        pendingDegradedComponents = undefined;
        // A failed DEGRADED transition remains sticky for at least one
        // successful durable heartbeat before a later READY can replace it.
        if (status !== "STOPPING") return;
      }

      try {
        await writeHeartbeat({
          components,
          database,
          instanceId,
          serviceAppUserId: options.serviceAppUserId!,
          startedAt,
          status
        });
      } catch (error) {
        if (status === "DEGRADED") {
          pendingDegradedComponents = { ...components };
        }
        throw error;
      }
    });
    writeQueue = write.catch(() => undefined);
    return write;
  };

  const recordReadiness = () => {
    if (stopped) return Promise.resolve();
    const components = getComponents();
    return enqueueWrite(components, readinessStatusForComponents(components));
  };
  // Production startup fails closed when durable readiness cannot be recorded.
  await recordReadiness();

  const schedule = () => {
    if (stopped) return;
    timer = setTimeout(() => {
      void recordReadiness()
        .catch((error) => {
          options.logger?.error({ err: error }, "Worker readiness heartbeat failed");
        })
        .finally(() => {
          schedule();
        });
    }, heartbeatIntervalMs);
    timer.unref();
  };
  schedule();
  options.logger?.info({ heartbeatIntervalMs }, "Durable worker readiness heartbeat started");

  const stop = () => {
    if (stopCompleted) return Promise.resolve();
    if (stopPromise) return stopPromise;
    stopped = true;
    if (timer) clearTimeout(timer);
    const attempt = async () => {
      await writeQueue;
      const components = getComponents();
      await enqueueWrite({
        ...components,
        process: false
      }, "STOPPING");
      stopCompleted = true;
      options.logger?.info("Durable worker readiness heartbeat stopped");
    };
    stopPromise = attempt().catch((error) => {
      stopPromise = undefined;
      throw error;
    });
    return stopPromise;
  };
  return Object.assign(stop, {
    recordNow: recordReadiness
  });
}

export async function readWorkerReadinessEvidence(
  database: PrismaClient = prisma
): Promise<WorkerReadinessEvidence> {
  try {
    const rows = await database.$queryRaw<PublicReadinessRow[]>`
      SELECT
        readiness_status AS "readinessStatus",
        observed_at AS "observedAt",
        age_seconds AS "ageSeconds",
        components,
        queue_pending AS "queuePending",
        queue_publishing AS "queuePublishing",
        queue_failed AS "queueFailed",
        queue_dead_letter AS "queueDeadLetter",
        queue_published_last_24h AS "queuePublishedLast24h"
      FROM entral.public_worker_readiness()
    `;
    const row = rows[0];
    if (!row || !row.observedAt) return unavailableReadiness();
    const components = sanitizeComponents(row.components);
    const status = row.readinessStatus === "READY"
      ? readinessStatusForComponents(components)
      : row.readinessStatus;
    return parseWorkerReadinessEvidence({
      contract_version: WORKER_READINESS_CONTRACT_VERSION,
      schema_version: 1,
      status,
      ready: status === "READY",
      evidence_source: "DURABLE_HEARTBEAT",
      observed_at: row.observedAt.toISOString(),
      age_seconds: Number(row.ageSeconds),
      components,
      queue: {
        pending: Number(row.queuePending),
        publishing: Number(row.queuePublishing),
        failed: Number(row.queueFailed),
        dead_letter: Number(row.queueDeadLetter),
        published_last_24h: Number(row.queuePublishedLast24h)
      }
    });
  } catch {
    // Liveness remains independently observable while the dependency evidence
    // fails closed as unavailable. No database error or connection detail leaks.
    return unavailableReadiness();
  }
}
