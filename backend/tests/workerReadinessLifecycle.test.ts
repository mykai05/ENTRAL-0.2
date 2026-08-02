import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  startWorkerReadinessHeartbeat,
  type WorkerReadinessComponents
} from "../src/services/workerReadiness.js";

const serviceAppUserId = "123e4567-e89b-42d3-a456-426614174000";

function readinessDatabase(options: {
  failOnce?: (status: "READY" | "DEGRADED" | "STOPPING") => boolean;
} = {}) {
  const attemptedStatuses: string[] = [];
  const successfulStatuses: string[] = [];
  const transaction = {
    $executeRaw: vi.fn(async (_query: TemplateStringsArray, ...values: unknown[]) => {
      const status = values.find((value): value is "READY" | "DEGRADED" | "STOPPING" => (
        value === "READY" || value === "DEGRADED" || value === "STOPPING"
      ));

      if (!status) throw new Error("readiness status was not bound");
      attemptedStatuses.push(status);
      if (options.failOnce?.(status)) {
        throw new Error(`${status} write failed`);
      }
      successfulStatuses.push(status);
      return 1;
    }),
    $queryRaw: vi.fn(async (query: TemplateStringsArray) => (
      query.join(" ").includes("bind_service_app_user")
        ? [{ appUserId: serviceAppUserId }]
        : []
    ))
  };
  const database = {
    $transaction: vi.fn(async (operation: (client: typeof transaction) => Promise<unknown>) => operation(transaction))
  } as unknown as PrismaClient;

  return { attemptedStatuses, database, successfulStatuses };
}

function readyComponents(): WorkerReadinessComponents {
  return {
    agent_orchestrator: true,
    automation_worker: true,
    autonomy_scheduler: true,
    canonical_outbox_dispatcher: true,
    membership_notification_dispatcher: true,
    process: true
  };
}

describe("worker readiness lifecycle writes", () => {
  it("durably retries a failed DEGRADED transition before a later READY", async () => {
    let failDegraded = true;
    const database = readinessDatabase({
      failOnce: (status) => {
        if (status !== "DEGRADED" || !failDegraded) return false;
        failDegraded = false;
        return true;
      }
    });
    const components = readyComponents();
    const stop = await startWorkerReadinessHeartbeat({
      database: database.database,
      getComponents: () => ({ ...components }),
      heartbeatIntervalMs: 60_000,
      instanceId: "sticky-degraded-test",
      production: true,
      serviceAppUserId
    });

    components.agent_orchestrator = false;
    await expect(stop.recordNow()).rejects.toThrow("DEGRADED write failed");
    components.agent_orchestrator = true;
    await expect(stop.recordNow()).resolves.toBeUndefined();

    expect(database.attemptedStatuses).toEqual(["READY", "DEGRADED", "DEGRADED"]);
    expect(database.successfulStatuses).toEqual(["READY", "DEGRADED"]);

    await stop.recordNow();
    expect(database.successfulStatuses).toEqual(["READY", "DEGRADED", "READY"]);
    await stop();
  });

  it("allows STOPPING persistence to be retried after a transient failure", async () => {
    let failStopping = true;
    const database = readinessDatabase({
      failOnce: (status) => {
        if (status !== "STOPPING" || !failStopping) return false;
        failStopping = false;
        return true;
      }
    });
    const stop = await startWorkerReadinessHeartbeat({
      components: readyComponents(),
      database: database.database,
      heartbeatIntervalMs: 60_000,
      instanceId: "retry-stopping-test",
      production: true,
      serviceAppUserId
    });

    const firstStop = stop();
    const concurrentStop = stop();
    expect(concurrentStop).toBe(firstStop);
    await expect(firstStop).rejects.toThrow("STOPPING write failed");
    await expect(stop()).resolves.toBeUndefined();

    expect(database.attemptedStatuses).toEqual(["READY", "STOPPING", "STOPPING"]);
    expect(database.successfulStatuses).toEqual(["READY", "STOPPING"]);
  });
});
