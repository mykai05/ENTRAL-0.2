import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ComponentKind = "automation" | "orchestrator" | "scheduler";

const componentKinds = [
  "automation",
  "orchestrator",
  "scheduler"
] as const satisfies readonly ComponentKind[];

beforeEach(() => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./worker-component-liveness.db";
  process.env.JWT_SECRET = "worker-component-liveness-secret-is-long";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.AUTOMATION_FEATURE_ENABLED = "true";
  process.env.AUTOMATION_WORKER_ENABLED = "true";
  process.env.AGENT_ORCHESTRATOR_ENABLED = "true";
  process.env.AUTONOMY_SCHEDULER_ENABLED = "true";
});

afterEach(() => {
  vi.useRealTimers();
});

async function startComponent(input: {
  initializeQueue?: () => Promise<void>;
  kind: ComponentKind;
  onHealthChange: (healthy: boolean) => void;
  poll: () => Promise<void>;
  probeQueue?: () => Promise<void>;
}) {
  if (input.kind === "automation") {
    const { startAutomationWorker } = await import("../src/services/automationQueue.js");
    return startAutomationWorker({
      onHealthChange: input.onHealthChange,
      poll: input.poll,
      pollIntervalMs: 1_000
    });
  }
  if (input.kind === "orchestrator") {
    const { startAgentOrchestrator } = await import("../src/services/agentOrchestrator.js");
    return startAgentOrchestrator({
      initializeQueue: input.initializeQueue ?? (async () => undefined),
      onHealthChange: input.onHealthChange,
      poll: input.poll,
      pollIntervalMs: 1_000,
      probeQueue: input.probeQueue ?? (async () => undefined)
    });
  }
  const { startAutonomyScheduler } = await import("../src/services/autonomyScheduler.js");
  return startAutonomyScheduler({
    initializeQueue: input.initializeQueue ?? (async () => undefined),
    onHealthChange: input.onHealthChange,
    poll: input.poll,
    pollIntervalMs: 1_000,
    probeQueue: input.probeQueue ?? (async () => undefined)
  });
}

describe("worker component liveness", () => {
  it.each(componentKinds)(
    "%s awaits its first database poll and fails startup closed",
    async (kind) => {
      const health: boolean[] = [];
      await expect(startComponent({
        kind,
        onHealthChange: (healthy) => health.push(healthy),
        poll: vi.fn(async () => {
          throw new Error("initial database poll failed");
        })
      })).rejects.toThrow(kind === "automation"
        ? "initial database poll failed"
        : "poll or queue probe failed");
      expect(health).toEqual([false]);
    }
  );

  it.each(["orchestrator", "scheduler"] as const)(
    "%s drains the queue probe before reporting an initial poll failure",
    async (kind) => {
      let releaseProbe!: () => void;
      const probeQueue = vi.fn(() => new Promise<void>((resolve) => {
        releaseProbe = resolve;
      }));
      const startup = startComponent({
        kind,
        onHealthChange: vi.fn(),
        poll: vi.fn(async () => {
          throw new Error("initial database poll failed");
        }),
        probeQueue
      });
      let settled = false;
      void startup.then(
        () => { settled = true; },
        () => { settled = true; }
      );

      await vi.waitFor(() => {
        expect(probeQueue).toHaveBeenCalledTimes(1);
      });
      expect(settled).toBe(false);

      releaseProbe();
      await expect(startup).rejects.toThrow("poll or queue probe failed");
      expect(settled).toBe(true);
    }
  );

  it.each(["orchestrator", "scheduler"] as const)(
    "%s awaits its first BullMQ initialization and fails startup closed",
    async (kind) => {
      const health: boolean[] = [];
      const poll = vi.fn(async () => undefined);
      await expect(startComponent({
        initializeQueue: vi.fn(async () => {
          throw new Error("initial BullMQ probe failed");
        }),
        kind,
        onHealthChange: (healthy) => health.push(healthy),
        poll
      })).rejects.toThrow("initial BullMQ probe failed");
      expect(poll).not.toHaveBeenCalled();
      expect(health).toEqual([false]);
    }
  );

  it.each(componentKinds)(
    "%s reports first success, later failure, and recovery",
    async (kind) => {
      vi.useFakeTimers();
      const health: boolean[] = [];
      const poll = vi.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("runtime poll failed"))
        .mockResolvedValueOnce(undefined);
      const stop = await startComponent({
        kind,
        onHealthChange: (healthy) => health.push(healthy),
        poll
      });

      expect(health).toEqual([true]);
      await vi.advanceTimersByTimeAsync(1_000);
      expect(health).toEqual([true, false]);
      await vi.advanceTimersByTimeAsync(1_000);
      expect(health).toEqual([true, false, true]);

      await stop();
      expect(health).toEqual([true, false, true, false]);
      expect(poll).toHaveBeenCalledTimes(3);
    }
  );
});
