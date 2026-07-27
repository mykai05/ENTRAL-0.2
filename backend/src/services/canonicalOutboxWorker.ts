import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import { Queue } from "bullmq";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";
import { env } from "../env.js";
import { prisma, withCanonicalSession } from "../db.js";

const DEFAULT_QUEUE_NAME = "entral-canonical-events";
const MAX_ERROR_LENGTH = 1_024;

export type CanonicalOutboxEvent = {
  attempts: number;
  eventId: string;
  id: string;
  partitionKey: string;
  payload: Prisma.JsonValue;
  topic: string;
};

export type CanonicalOutboxPublisher = {
  close?: () => Promise<void>;
  publish: (event: CanonicalOutboxEvent) => Promise<void>;
};

export type CanonicalOutboxBatchResult = {
  claimed: number;
  deadLettered: number;
  failed: number;
  published: number;
};

type DispatchCanonicalOutboxBatchOptions = {
  batchSize?: number;
  database?: PrismaClient;
  lockDurationMs?: number;
  maxAttempts?: number;
  publisher: CanonicalOutboxPublisher;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
  serviceAppUserId: string;
  workerId?: string;
};

type StartCanonicalOutboxWorkerOptions = {
  database?: PrismaClient;
  logger?: Pick<FastifyBaseLogger, "error" | "info" | "warn">;
  onHealthChange?: (healthy: boolean) => void;
  publisher?: CanonicalOutboxPublisher;
  workerId?: string;
};

function boundedError(error: unknown) {
  const message = error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
  return message.slice(0, MAX_ERROR_LENGTH);
}

function retryDelay(attempts: number, baseDelayMs: number, maxDelayMs: number) {
  const exponent = Math.min(Math.max(attempts - 1, 0), 20);
  return Math.min(baseDelayMs * (2 ** exponent), maxDelayMs);
}

function requiredPositiveInteger(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return value;
}

async function claimOutboxRows(input: {
  batchSize: number;
  database: PrismaClient;
  lockDurationMs: number;
  serviceAppUserId: string;
  workerId: string;
}) {
  return withCanonicalSession(input.database, {
    actionReason: "Claim canonical transactional-outbox events for durable publication.",
    serviceAppUserId: input.serviceAppUserId
  }, async (transaction) => transaction.$queryRaw<CanonicalOutboxEvent[]>(Prisma.sql`
    WITH candidates AS (
      SELECT id
      FROM entral.transactional_outbox
      WHERE available_at <= clock_timestamp()
        AND (
          status IN ('PENDING', 'FAILED')
          OR (
            status = 'PUBLISHING'
            AND locked_until <= clock_timestamp()
          )
        )
      ORDER BY available_at, created_at, id
      FOR UPDATE SKIP LOCKED
      LIMIT ${input.batchSize}
    )
    UPDATE entral.transactional_outbox AS outbox
    SET
      status = 'PUBLISHING',
      attempts = outbox.attempts + 1,
      locked_by = ${input.workerId},
      locked_until = clock_timestamp() + (${input.lockDurationMs} * interval '1 millisecond'),
      last_error = NULL
    FROM candidates
    WHERE outbox.id = candidates.id
    RETURNING
      outbox.id,
      outbox.event_id AS "eventId",
      outbox.topic,
      outbox.partition_key AS "partitionKey",
      outbox.payload,
      outbox.attempts
  `));
}

async function markOutboxPublished(input: {
  database: PrismaClient;
  outboxId: string;
  serviceAppUserId: string;
  workerId: string;
}) {
  const rows = await withCanonicalSession(input.database, {
    actionReason: "Record durable canonical event publication.",
    serviceAppUserId: input.serviceAppUserId
  }, async (transaction) => transaction.$queryRaw<{ id: string }[]>(Prisma.sql`
    UPDATE entral.transactional_outbox
    SET
      status = 'PUBLISHED',
      published_at = clock_timestamp(),
      locked_by = NULL,
      locked_until = NULL,
      last_error = NULL
    WHERE id = ${input.outboxId}::uuid
      AND status = 'PUBLISHING'
      AND locked_by = ${input.workerId}
    RETURNING id
  `));

  if (rows.length !== 1) {
    throw new Error(`Canonical outbox lock was lost before publication receipt ${input.outboxId} could be recorded.`);
  }
}

async function markOutboxFailed(input: {
  attempts: number;
  database: PrismaClient;
  error: unknown;
  outboxId: string;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  maxAttempts: number;
  serviceAppUserId: string;
  workerId: string;
}) {
  const deadLettered = input.attempts >= input.maxAttempts;
  const delayMs = retryDelay(
    input.attempts,
    input.retryBaseDelayMs,
    input.retryMaxDelayMs
  );
  const rows = await withCanonicalSession(input.database, {
    actionReason: "Record a canonical event publication failure for retry.",
    serviceAppUserId: input.serviceAppUserId
  }, async (transaction) => transaction.$queryRaw<{ id: string }[]>(Prisma.sql`
    UPDATE entral.transactional_outbox
    SET
      status = ${deadLettered ? "DEAD_LETTER" : "FAILED"},
      available_at = CASE
        WHEN ${deadLettered} THEN available_at
        ELSE clock_timestamp() + (${delayMs} * interval '1 millisecond')
      END,
      locked_by = NULL,
      locked_until = NULL,
      last_error = ${boundedError(input.error)}
    WHERE id = ${input.outboxId}::uuid
      AND status = 'PUBLISHING'
      AND locked_by = ${input.workerId}
    RETURNING id
  `));

  if (rows.length !== 1) {
    throw new Error(`Canonical outbox lock was lost before publication failure ${input.outboxId} could be recorded.`);
  }
  return deadLettered;
}

/**
 * Claims one SKIP LOCKED batch, durably publishes each event, and records the
 * resulting receipt. BullMQ publication uses the outbox UUID as its job ID, so
 * a crash after Redis accepts a job but before PostgreSQL records PUBLISHED is
 * safe to retry without creating a second queue job.
 */
export async function dispatchCanonicalOutboxBatch(
  options: DispatchCanonicalOutboxBatchOptions
): Promise<CanonicalOutboxBatchResult> {
  const database = options.database ?? prisma;
  const batchSize = requiredPositiveInteger(
    options.batchSize ?? env.CANONICAL_OUTBOX_BATCH_SIZE,
    "Canonical outbox batch size"
  );
  const lockDurationMs = requiredPositiveInteger(
    options.lockDurationMs ?? env.CANONICAL_OUTBOX_LOCK_DURATION_MS,
    "Canonical outbox lock duration"
  );
  const retryBaseDelayMs = requiredPositiveInteger(
    options.retryBaseDelayMs ?? env.CANONICAL_OUTBOX_RETRY_BASE_DELAY_MS,
    "Canonical outbox retry base delay"
  );
  const retryMaxDelayMs = requiredPositiveInteger(
    options.retryMaxDelayMs ?? env.CANONICAL_OUTBOX_RETRY_MAX_DELAY_MS,
    "Canonical outbox retry maximum delay"
  );
  const maxAttempts = requiredPositiveInteger(
    options.maxAttempts ?? env.CANONICAL_OUTBOX_MAX_ATTEMPTS,
    "Canonical outbox maximum attempts"
  );
  const workerId = options.workerId ?? `${hostname()}:${process.pid}:${randomUUID()}`;

  const claimedRows = await claimOutboxRows({
    batchSize,
    database,
    lockDurationMs,
    serviceAppUserId: options.serviceAppUserId,
    workerId
  });
  const result: CanonicalOutboxBatchResult = {
    claimed: claimedRows.length,
    deadLettered: 0,
    failed: 0,
    published: 0
  };

  for (const event of claimedRows) {
    try {
      await options.publisher.publish(event);
      await markOutboxPublished({
        database,
        outboxId: event.id,
        serviceAppUserId: options.serviceAppUserId,
        workerId
      });
      result.published += 1;
    } catch (error) {
      const deadLettered = await markOutboxFailed({
        attempts: event.attempts,
        database,
        error,
        outboxId: event.id,
        maxAttempts,
        retryBaseDelayMs,
        retryMaxDelayMs,
        serviceAppUserId: options.serviceAppUserId,
        workerId
      });
      result.failed += 1;
      if (deadLettered) {
        result.deadLettered += 1;
      }
    }
  }

  return result;
}

export function assertCanonicalOutboxConfiguration(input: {
  enabled: boolean;
  redisUrl?: string;
  serviceAppUserId?: string;
}) {
  if (!input.enabled) {
    return;
  }

  if (!input.redisUrl) {
    throw new Error("REDIS_URL is required when the canonical outbox dispatcher is enabled.");
  }

  if (!input.serviceAppUserId) {
    throw new Error(
      "CANONICAL_OUTBOX_SERVICE_APP_USER_ID is required when the canonical outbox dispatcher is enabled."
    );
  }
}

async function createBullMqPublisher(redisUrl: string): Promise<CanonicalOutboxPublisher> {
  const queue = new Queue(DEFAULT_QUEUE_NAME, {
    connection: { url: redisUrl }
  });
  await queue.waitUntilReady();

  return {
    close: async () => queue.close(),
    publish: async (event) => {
      await queue.add(event.topic, {
        eventId: event.eventId,
        outboxId: event.id,
        partitionKey: event.partitionKey,
        payload: event.payload,
        topic: event.topic
      }, {
        // Retain terminal jobs so BullMQ continues rejecting the same outbox
        // UUID after a crash between Redis acceptance and the PostgreSQL
        // PUBLISHED receipt. Cleanup must use a separately governed watermark.
        jobId: event.id
      });
    }
  };
}

export async function startCanonicalOutboxWorker(
  options: StartCanonicalOutboxWorkerOptions = {}
): Promise<() => Promise<void>> {
  const reportHealth = options.onHealthChange ?? (() => undefined);
  assertCanonicalOutboxConfiguration({
    enabled: env.CANONICAL_OUTBOX_DISPATCHER_ENABLED,
    redisUrl: env.REDIS_URL,
    serviceAppUserId: env.CANONICAL_OUTBOX_SERVICE_APP_USER_ID
  });

  if (!env.CANONICAL_OUTBOX_DISPATCHER_ENABLED) {
    reportHealth(false);
    return async () => undefined;
  }

  const serviceAppUserId = env.CANONICAL_OUTBOX_SERVICE_APP_USER_ID!;
  const publisher = options.publisher ?? await createBullMqPublisher(env.REDIS_URL!);
  const workerId = options.workerId ?? `${hostname()}:${process.pid}:${randomUUID()}`;
  let activeBatch: Promise<void> | undefined;
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const dispatchBatch = async () => {
    try {
      const result = await dispatchCanonicalOutboxBatch({
        database: options.database,
        publisher,
        serviceAppUserId,
        workerId
      });
      reportHealth(result.failed === 0);
      return result;
    } catch (error) {
      reportHealth(false);
      throw error;
    }
  };

  const schedule = (delayMs: number) => {
    if (stopped) {
      return;
    }

    timer = setTimeout(() => {
      activeBatch = dispatchBatch().then((result) => {
        if (result.claimed > 0) {
          options.logger?.info({ ...result, workerId }, "Canonical outbox batch dispatched");
        }
        schedule(
          result.claimed >= env.CANONICAL_OUTBOX_BATCH_SIZE
            ? 0
            : env.CANONICAL_OUTBOX_POLL_INTERVAL_MS
        );
      }).catch((error) => {
        options.logger?.error({ err: error, workerId }, "Canonical outbox dispatch failed");
        schedule(env.CANONICAL_OUTBOX_POLL_INTERVAL_MS);
      }).finally(() => {
        activeBatch = undefined;
      });
    }, delayMs);
    timer.unref();
  };

  let firstResult: CanonicalOutboxBatchResult;
  try {
    firstResult = await dispatchBatch();
    if (firstResult.failed > 0) {
      throw new Error("Canonical outbox startup probe could not publish every claimed event.");
    }
  } catch (error) {
    reportHealth(false);
    await publisher.close?.();
    throw error;
  }
  schedule(
    firstResult.claimed >= env.CANONICAL_OUTBOX_BATCH_SIZE
      ? 0
      : env.CANONICAL_OUTBOX_POLL_INTERVAL_MS
  );
  options.logger?.info({ workerId }, "Canonical transactional-outbox dispatcher started");

  return async () => {
    if (stopped) {
      return;
    }

    stopped = true;
    if (timer) {
      clearTimeout(timer);
    }
    await activeBatch;
    await publisher.close?.();
    reportHealth(false);
    options.logger?.info({ workerId }, "Canonical transactional-outbox dispatcher stopped");
  };
}
