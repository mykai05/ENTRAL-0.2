import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  contexts: [] as unknown[],
  env: {
    CANONICAL_OUTBOX_BATCH_SIZE: 25,
    CANONICAL_OUTBOX_DISPATCHER_ENABLED: false,
    CANONICAL_OUTBOX_LOCK_DURATION_MS: 60_000,
    CANONICAL_OUTBOX_MAX_ATTEMPTS: 12,
    CANONICAL_OUTBOX_POLL_INTERVAL_MS: 1_000,
    CANONICAL_OUTBOX_RETRY_BASE_DELAY_MS: 1_000,
    CANONICAL_OUTBOX_RETRY_MAX_DELAY_MS: 300_000,
    CANONICAL_OUTBOX_SERVICE_APP_USER_ID: undefined as string | undefined,
    REDIS_URL: undefined as string | undefined
  },
  queries: [] as Array<{ strings: readonly string[]; values: readonly unknown[] }>,
  queryResults: [] as unknown[]
}));

vi.mock("../src/env.js", () => ({
  env: harness.env
}));

vi.mock("../src/db.js", () => ({
  prisma: {},
  withCanonicalSession: async (
    _database: unknown,
    context: unknown,
    operation: (transaction: unknown, appUserId: string) => Promise<unknown>
  ) => {
    harness.contexts.push(context);
    const transaction = {
      $queryRaw: vi.fn(async (query: {
        strings: readonly string[];
        values: readonly unknown[];
      }) => {
        harness.queries.push(query);
        return harness.queryResults.shift();
      })
    };
    return operation(transaction, "00000000-0000-4000-8000-000000000001");
  }
}));

import {
  assertCanonicalOutboxConfiguration,
  dispatchCanonicalOutboxBatch,
  startCanonicalOutboxWorker
} from "../src/services/canonicalOutboxWorker.js";

const event = {
  attempts: 1,
  eventId: "00000000-0000-4000-8000-000000000011",
  id: "00000000-0000-4000-8000-000000000012",
  partitionKey: "business:00000000-0000-4000-8000-000000000013",
  payload: {
    event_type: "business.updated",
    version: 2
  },
  topic: "entral.canonical-events"
};

function sqlText(index: number) {
  return harness.queries[index]?.strings.join("?") ?? "";
}

describe("canonical transactional-outbox dispatcher", () => {
  beforeEach(() => {
    harness.contexts.length = 0;
    harness.env.CANONICAL_OUTBOX_DISPATCHER_ENABLED = false;
    harness.env.CANONICAL_OUTBOX_SERVICE_APP_USER_ID = undefined;
    harness.env.REDIS_URL = undefined;
    harness.queries.length = 0;
    harness.queryResults.length = 0;
    vi.useRealTimers();
  });

  it("claims with SKIP LOCKED, publishes, and records a durable receipt", async () => {
    harness.queryResults.push([event], [{ id: event.id }]);
    const publisher = {
      publish: vi.fn(async () => undefined)
    };

    const result = await dispatchCanonicalOutboxBatch({
      database: {} as never,
      publisher,
      serviceAppUserId: "00000000-0000-4000-8000-000000000001",
      workerId: "worker-test"
    });

    expect(result).toEqual({
      claimed: 1,
      deadLettered: 0,
      failed: 0,
      published: 1
    });
    expect(publisher.publish).toHaveBeenCalledWith(event);
    expect(sqlText(0)).toContain("FOR UPDATE SKIP LOCKED");
    expect(sqlText(0)).toContain("status = 'PUBLISHING'");
    expect(sqlText(1)).toContain("status = 'PUBLISHED'");
    expect(harness.contexts).toEqual([
      expect.objectContaining({
        actionReason: expect.stringContaining("Claim"),
        serviceAppUserId: "00000000-0000-4000-8000-000000000001"
      }),
      expect.objectContaining({
        actionReason: expect.stringContaining("durable"),
        serviceAppUserId: "00000000-0000-4000-8000-000000000001"
      })
    ]);
  });

  it("clears the lock, bounds the error, and schedules exponential retry on failure", async () => {
    harness.queryResults.push([{ ...event, attempts: 3 }], [{ id: event.id }]);
    const publisherError = new Error("x".repeat(2_000));
    const publisher = {
      publish: vi.fn(async () => {
        throw publisherError;
      })
    };

    const result = await dispatchCanonicalOutboxBatch({
      database: {} as never,
      publisher,
      retryBaseDelayMs: 500,
      retryMaxDelayMs: 10_000,
      serviceAppUserId: "00000000-0000-4000-8000-000000000001",
      workerId: "worker-test"
    });

    expect(result).toEqual({
      claimed: 1,
      deadLettered: 0,
      failed: 1,
      published: 0
    });
    expect(sqlText(1)).toContain("status = ?");
    expect(harness.queries[1]?.values).toContain("FAILED");
    expect(sqlText(1)).toContain("available_at = CASE");
    expect(sqlText(1)).toContain("ELSE clock_timestamp() +");
    expect(sqlText(1)).toContain("locked_by = NULL");
    expect(harness.queries[1]?.values).toContain(2_000);
    const recordedError = harness.queries[1]?.values.find(
      (value) => typeof value === "string" && value.startsWith("Error:")
    );
    expect(recordedError).toHaveLength(1_024);
  });

  it("dead-letters poison events at the bounded attempt threshold", async () => {
    harness.queryResults.push([{ ...event, attempts: 4 }], [{ id: event.id }]);
    const result = await dispatchCanonicalOutboxBatch({
      database: {} as never,
      maxAttempts: 4,
      publisher: {
        publish: vi.fn(async () => {
          throw new Error("poison event");
        })
      },
      serviceAppUserId: "00000000-0000-4000-8000-000000000001",
      workerId: "worker-test"
    });

    expect(result).toEqual({
      claimed: 1,
      deadLettered: 1,
      failed: 1,
      published: 0
    });
    expect(sqlText(1)).toContain("status = ?");
    expect(harness.queries[1]?.values).toContain("DEAD_LETTER");
    expect(harness.queries[1]?.values).toContain(true);
  });

  it("reclaims expired PUBLISHING locks for crash recovery", async () => {
    harness.queryResults.push([]);

    const result = await dispatchCanonicalOutboxBatch({
      database: {} as never,
      publisher: {
        publish: vi.fn()
      },
      serviceAppUserId: "00000000-0000-4000-8000-000000000001",
      workerId: "worker-test"
    });

    expect(result).toEqual({
      claimed: 0,
      deadLettered: 0,
      failed: 0,
      published: 0
    });
    expect(sqlText(0)).toContain("status = 'PUBLISHING'");
    expect(sqlText(0)).toContain("locked_until <= clock_timestamp()");
  });

  it("fails closed when an enabled dispatcher lacks Redis or a service identity", () => {
    expect(() => assertCanonicalOutboxConfiguration({
      enabled: true,
      serviceAppUserId: "00000000-0000-4000-8000-000000000001"
    })).toThrow("REDIS_URL is required");
    expect(() => assertCanonicalOutboxConfiguration({
      enabled: true,
      redisUrl: "redis://localhost:6379"
    })).toThrow("CANONICAL_OUTBOX_SERVICE_APP_USER_ID is required");
    expect(() => assertCanonicalOutboxConfiguration({
      enabled: true,
      redisUrl: "redis://localhost:6379",
      serviceAppUserId: "00000000-0000-4000-8000-000000000001"
    })).not.toThrow();
  });

  it("stops polling and closes the durable publisher cleanly", async () => {
    vi.useFakeTimers();
    harness.env.CANONICAL_OUTBOX_DISPATCHER_ENABLED = true;
    harness.env.CANONICAL_OUTBOX_SERVICE_APP_USER_ID =
      "00000000-0000-4000-8000-000000000001";
    harness.env.REDIS_URL = "redis://localhost:6379";
    harness.queryResults.push([]);
    const publisher = {
      close: vi.fn(async () => undefined),
      publish: vi.fn(async () => undefined)
    };

    const stop = await startCanonicalOutboxWorker({
      database: {} as never,
      publisher,
      workerId: "worker-test"
    });
    await vi.advanceTimersByTimeAsync(0);
    await stop();
    await vi.advanceTimersByTimeAsync(5_000);

    expect(harness.queries).toHaveLength(1);
    expect(publisher.close).toHaveBeenCalledOnce();
  });
});
