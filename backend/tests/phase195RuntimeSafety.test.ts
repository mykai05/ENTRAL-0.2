import type { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/automationQueue.js", () => ({
  startAutomationWorker: vi.fn(() => vi.fn())
}));

vi.mock("../src/services/agentOrchestrator.js", () => ({
  startAgentOrchestrator: vi.fn(() => vi.fn())
}));

vi.mock("../src/services/autonomyScheduler.js", () => ({
  startAutonomyScheduler: vi.fn(() => vi.fn())
}));

vi.mock("../src/services/canonicalOutboxWorker.js", () => ({
  startCanonicalOutboxWorker: vi.fn(async () => async () => undefined)
}));

vi.mock("../src/services/policyEngine.js", () => ({
  ensureDefaultPolicies: vi.fn()
}));

vi.mock("../src/services/operationalMonitoring.js", () => ({
  emitOperationalAlert: vi.fn()
}));

const managedEnvironmentKeys = [
  "NODE_ENV",
  "PROCESS_ROLE",
  "DATABASE_URL",
  "JWT_SECRET",
  "COOKIE_NAME",
  "CORS_ORIGIN",
  "APP_PUBLIC_URL",
  "API_PUBLIC_URL",
  "AUTH_EMAIL_PROVIDER",
  "AUTH_EMAIL_FROM",
  "RESEND_API_KEY",
  "AI_LOCAL_FALLBACK",
  "AUTOMATION_LOCAL_FALLBACK",
  "AUTOMATION_WORKER_ENABLED",
  "AGENT_ORCHESTRATOR_ENABLED",
  "AUTONOMY_SCHEDULER_ENABLED",
  "CANONICAL_OUTBOX_DISPATCHER_ENABLED",
  "CANONICAL_OUTBOX_SERVICE_APP_USER_ID",
  "REDIS_URL"
] as const;
const originalEnvironment = Object.fromEntries(
  managedEnvironmentKeys.map((key) => [key, process.env[key]])
);

function baseTestEnvironment() {
  process.env.NODE_ENV = "test";
  delete process.env.PROCESS_ROLE;
  process.env.DATABASE_URL = "file:./phase195-runtime-safety.db";
  process.env.JWT_SECRET = "phase195-test-secret-that-is-long-enough";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.APP_PUBLIC_URL = "http://localhost:3000";
  process.env.API_PUBLIC_URL = "http://localhost:4000";
  process.env.AUTH_EMAIL_PROVIDER = "console";
  delete process.env.AUTH_EMAIL_FROM;
  delete process.env.RESEND_API_KEY;
  delete process.env.AI_LOCAL_FALLBACK;
  delete process.env.AUTOMATION_LOCAL_FALLBACK;
  delete process.env.AUTOMATION_WORKER_ENABLED;
  delete process.env.AGENT_ORCHESTRATOR_ENABLED;
  delete process.env.AUTONOMY_SCHEDULER_ENABLED;
  delete process.env.CANONICAL_OUTBOX_DISPATCHER_ENABLED;
  delete process.env.CANONICAL_OUTBOX_SERVICE_APP_USER_ID;
  delete process.env.REDIS_URL;
}

function productionWorkerEnvironment() {
  process.env.NODE_ENV = "production";
  process.env.PROCESS_ROLE = "worker";
  process.env.AUTOMATION_WORKER_ENABLED = "true";
  process.env.AGENT_ORCHESTRATOR_ENABLED = "true";
  process.env.AUTONOMY_SCHEDULER_ENABLED = "true";
  process.env.CANONICAL_OUTBOX_DISPATCHER_ENABLED = "true";
  process.env.CANONICAL_OUTBOX_SERVICE_APP_USER_ID =
    "123e4567-e89b-42d3-a456-426614174000";
  process.env.REDIS_URL = "redis://localhost:6379";
}

beforeEach(() => {
  vi.resetModules();
  baseTestEnvironment();
});

afterEach(() => {
  for (const key of managedEnvironmentKeys) {
    const original = originalEnvironment[key];
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
  vi.restoreAllMocks();
});

describe("Phase 195 production runtime safety", () => {
  it("defaults all local provider fallbacks off", async () => {
    const { env } = await import("../src/env.js");

    expect(env.AI_LOCAL_FALLBACK).toBe(false);
    expect(env.AUTOMATION_LOCAL_FALLBACK).toBe(false);
  });

  it.each([
    ["AI_LOCAL_FALLBACK", "AI_LOCAL_FALLBACK cannot be enabled in production."],
    ["AUTOMATION_LOCAL_FALLBACK", "AUTOMATION_LOCAL_FALLBACK cannot be enabled in production."]
  ] as const)("rejects production %s=true", async (key, message) => {
    productionWorkerEnvironment();
    process.env[key] = "true";

    await expect(import("../src/env.js")).rejects.toThrow(message);
  });

  it.each([
    "AUTOMATION_WORKER_ENABLED",
    "AGENT_ORCHESTRATOR_ENABLED",
    "AUTONOMY_SCHEDULER_ENABLED",
    "CANONICAL_OUTBOX_DISPATCHER_ENABLED"
  ] as const)("rejects a production worker with %s=false", async (key) => {
    productionWorkerEnvironment();
    process.env[key] = "false";

    await expect(import("../src/env.js")).rejects.toThrow(
      `Production worker requires ${key}=true.`
    );
  });

  it.each([
    ["REDIS_URL", "Production worker requires REDIS_URL."],
    [
      "CANONICAL_OUTBOX_SERVICE_APP_USER_ID",
      "Production worker requires CANONICAL_OUTBOX_SERVICE_APP_USER_ID."
    ]
  ] as const)("rejects a production worker without %s", async (key, message) => {
    productionWorkerEnvironment();
    delete process.env[key];

    await expect(import("../src/env.js")).rejects.toThrow(message);
  });

  it("does not register a production mock-execution HTTP route", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();

    expect(app.hasRoute({
      method: "POST",
      url: "/api/v1/connections/tools/github/mock-execute"
    })).toBe(false);
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/connections/tools/github/mock-execute",
      payload: { request: "contact a provider" }
    });
    expect(response.statusCode).toBe(404);
    await app.close();
  }, 15_000);

  it("returns canonical defaults without inventing a persisted preference record", async () => {
    const userId = "123e4567-e89b-42d3-a456-426614174000";
    let queryCount = 0;
    const transaction = {
      $queryRaw: vi.fn(async () => {
        queryCount += 1;
        if (queryCount === 2) return [{ appUserId: userId }];
        return [];
      })
    };
    const database = {
      $transaction: vi.fn(async (operation: (tx: unknown) => unknown) => operation(transaction))
    } as unknown as PrismaClient;
    const { GraphPreferencesService } = await import("../src/services/graphPreferences.js");
    const service = new GraphPreferencesService(database);

    const preferences = await service.get("team_phase195", {
      actionReason: "Read Phase 195 test preferences.",
      authSubject: "phase195-member"
    });

    expect(preferences).toMatchObject({
      organization_id: "team_phase195",
      preference_id: null,
      source: "CANONICAL_DEFAULTS",
      user_id: userId,
      version: 0
    });
    expect(preferences.settings.pinned_positions).toEqual([]);
  });

  it("returns incomplete release evidence when canonical storage is empty", async () => {
    const userId = "123e4567-e89b-42d3-a456-426614174000";
    let queryCount = 0;
    const transaction = {
      $queryRaw: vi.fn(async () => {
        queryCount += 1;
        if (queryCount === 2) return [{ appUserId: userId }];
        return [];
      })
    };
    const database = {
      $transaction: vi.fn(async (operation: (tx: unknown) => unknown) => operation(transaction))
    } as unknown as PrismaClient;
    const { ReleaseEvidenceService } = await import("../src/services/releaseEvidence.js");
    const service = new ReleaseEvidenceService(database);

    const evidence = await service.readPhase(195, {
      actionReason: "Read Phase 195 release evidence.",
      authSubject: "phase195-admin"
    });

    expect(evidence.complete).toBe(false);
    expect(evidence.canonical_release).toBeNull();
    expect(evidence.blockers).toEqual(expect.arrayContaining([
      "No production canonical release record exists for this phase.",
      "No production phase-gate record exists for this phase.",
      "No verified production migration fingerprint has been recorded.",
      "No production deployment evidence has been recorded.",
      "No reconciled pull-request disposition has been recorded.",
      "No production runtime-mode evidence has been recorded."
    ]));
  });

  it("fails closed when worker readiness storage is unavailable", async () => {
    const database = {
      $queryRaw: vi.fn(async () => {
        throw new Error("sensitive database detail");
      })
    } as unknown as PrismaClient;
    const { readWorkerReadinessEvidence } = await import("../src/services/workerReadiness.js");

    await expect(readWorkerReadinessEvidence(database)).resolves.toEqual({
      age_seconds: null,
      components: {
        agent_orchestrator: false,
        automation_worker: false,
        autonomy_scheduler: false,
        canonical_outbox_dispatcher: false,
        process: false
      },
      contract_version: "1.0.0",
      evidence_source: "NONE",
      observed_at: null,
      queue: null,
      ready: false,
      schema_version: 1,
      status: "UNAVAILABLE"
    });
  });

  it("maps only sanitized durable worker and queue readiness", async () => {
    const observedAt = new Date("2026-07-26T01:00:00.000Z");
    const database = {
      $queryRaw: vi.fn(async () => [{
        ageSeconds: "4.25",
        components: {
          agent_orchestrator: true,
          automation_worker: true,
          autonomy_scheduler: true,
          canonical_outbox_dispatcher: true,
          process: true,
          secret_instance_id: "must-not-escape"
        },
        observedAt,
        queueDeadLetter: 0n,
        queueFailed: 0n,
        queuePending: 2n,
        queuePublishedLast24h: 9n,
        queuePublishing: 1n,
        readinessStatus: "READY"
      }])
    } as unknown as PrismaClient;
    const { readWorkerReadinessEvidence } = await import("../src/services/workerReadiness.js");

    const evidence = await readWorkerReadinessEvidence(database);

    expect(evidence).toEqual({
      age_seconds: 4.25,
      components: {
        agent_orchestrator: true,
        automation_worker: true,
        autonomy_scheduler: true,
        canonical_outbox_dispatcher: true,
        process: true
      },
      contract_version: "1.0.0",
      evidence_source: "DURABLE_HEARTBEAT",
      observed_at: observedAt.toISOString(),
      queue: {
        dead_letter: 0,
        failed: 0,
        pending: 2,
        published_last_24h: 9,
        publishing: 1
      },
      ready: true,
      schema_version: 1,
      status: "READY"
    });
    expect(JSON.stringify(evidence)).not.toContain("secret_instance_id");
  });

  it("downgrades a nominal READY heartbeat when any required component is disabled", async () => {
    const observedAt = new Date("2026-07-26T01:00:00.000Z");
    const database = {
      $queryRaw: vi.fn(async () => [{
        ageSeconds: "4.25",
        components: {
          agent_orchestrator: true,
          automation_worker: true,
          autonomy_scheduler: true,
          canonical_outbox_dispatcher: false,
          process: true
        },
        observedAt,
        queueDeadLetter: 0n,
        queueFailed: 0n,
        queuePending: 3n,
        queuePublishedLast24h: 0n,
        queuePublishing: 0n,
        readinessStatus: "READY"
      }])
    } as unknown as PrismaClient;
    const { readWorkerReadinessEvidence } = await import("../src/services/workerReadiness.js");

    await expect(readWorkerReadinessEvidence(database)).resolves.toMatchObject({
      components: {
        canonical_outbox_dispatcher: false
      },
      ready: false,
      status: "DEGRADED"
    });
  });

  it("requires a durable service identity before a production worker can report ready", async () => {
    const {
      assertWorkerReadinessConfiguration,
      startWorkerReadinessHeartbeat
    } = await import("../src/services/workerReadiness.js");
    expect(() => assertWorkerReadinessConfiguration({
      components: {
        agent_orchestrator: true,
        automation_worker: true,
        autonomy_scheduler: true,
        canonical_outbox_dispatcher: true,
        process: true
      },
      production: true
    })).toThrow("CANONICAL_OUTBOX_SERVICE_APP_USER_ID is required");
    await expect(startWorkerReadinessHeartbeat({
      components: {
        agent_orchestrator: true,
        automation_worker: true,
        autonomy_scheduler: true,
        canonical_outbox_dispatcher: true,
        process: true
      },
      production: true
    })).rejects.toThrow("CANONICAL_OUTBOX_SERVICE_APP_USER_ID is required");
  });

  it.each([
    "automation_worker",
    "agent_orchestrator",
    "autonomy_scheduler",
    "canonical_outbox_dispatcher",
    "process"
  ] as const)("rejects production readiness when %s is disabled", async (component) => {
    const {
      assertWorkerReadinessConfiguration,
      startWorkerReadinessHeartbeat
    } = await import("../src/services/workerReadiness.js");
    const components = {
      agent_orchestrator: true,
      automation_worker: true,
      autonomy_scheduler: true,
      canonical_outbox_dispatcher: true,
      process: true
    };
    components[component] = false;

    expect(() => assertWorkerReadinessConfiguration({
      components,
      production: true,
      serviceAppUserId: "123e4567-e89b-42d3-a456-426614174000"
    })).toThrow(`disabled: ${component}`);
    await expect(startWorkerReadinessHeartbeat({
      components,
      production: true,
      serviceAppUserId: "123e4567-e89b-42d3-a456-426614174000"
    })).rejects.toThrow(`disabled: ${component}`);
  });
});
