import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  agentLogCreate: vi.fn(),
  agentMessageCreate: vi.fn(),
  agentTaskFindMany: vi.fn(),
  agentTaskFindUnique: vi.fn(),
  agentTaskUpdateMany: vi.fn(),
  agentUpdateMany: vi.fn(),
  aiUsageEventUpdateMany: vi.fn(),
  assertDurableAuthorization: vi.fn(),
  createReply: vi.fn(),
  emitGovernanceAlert: vi.fn(),
  evaluateAgentPolicies: vi.fn(),
  failAiUsageReservation: vi.fn(),
  recordAuditLog: vi.fn(),
  reserveAiUsage: vi.fn(),
  safeOutboundHttpRequest: vi.fn(),
  settleAiUsageReservation: vi.fn(),
  transaction: vi.fn(),
  txAgentLogCreate: vi.fn(),
  txAgentTaskUpdateMany: vi.fn(),
  txAgentUpdateMany: vi.fn(),
  txAiUsageEventUpdateMany: vi.fn()
}));

const transactionClient = {
  agent: { updateMany: mocks.txAgentUpdateMany },
  agentLog: { create: mocks.txAgentLogCreate },
  agentTask: { updateMany: mocks.txAgentTaskUpdateMany },
  aiUsageEvent: { updateMany: mocks.txAiUsageEventUpdateMany }
};

vi.mock("../src/db.js", () => ({
  prisma: {
    $transaction: mocks.transaction,
    agent: { updateMany: mocks.agentUpdateMany },
    agentLog: { create: mocks.agentLogCreate },
    agentMessage: { create: mocks.agentMessageCreate },
    agentTask: {
      findMany: mocks.agentTaskFindMany,
      findUnique: mocks.agentTaskFindUnique,
      updateMany: mocks.agentTaskUpdateMany
    },
    aiUsageEvent: { updateMany: mocks.aiUsageEventUpdateMany }
  }
}));

vi.mock("../src/env.js", () => ({
  env: {
    AGENT_MAX_CONCURRENCY: 2,
    AGENT_ORCHESTRATOR_ENABLED: true,
    NODE_ENV: "test",
    REDIS_URL: ""
  }
}));

vi.mock("../src/services/alerts.js", () => ({ emitGovernanceAlert: mocks.emitGovernanceAlert }));
vi.mock("../src/services/audit.js", () => ({ recordAuditLog: mocks.recordAuditLog }));
vi.mock("../src/services/durableAuthorization.js", () => ({
  assertDurableAuthorization: mocks.assertDurableAuthorization
}));
vi.mock("../src/services/policyEngine.js", () => ({ evaluateAgentPolicies: mocks.evaluateAgentPolicies }));
vi.mock("../src/services/openaiService.js", () => ({
  openAiChatService: { createReply: mocks.createReply }
}));
vi.mock("../src/services/aiUsage.js", () => ({
  failAiUsageReservation: mocks.failAiUsageReservation,
  reserveAiUsage: mocks.reserveAiUsage,
  settleAiUsageReservation: mocks.settleAiUsageReservation
}));
vi.mock("../src/services/safeOutboundHttp.js", () => ({
  safeOutboundHttpRequest: mocks.safeOutboundHttpRequest
}));

const logger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn()
} as any;

const queuedTask = {
  action: "summarize",
  agentId: "agent-1",
  authorizationVersion: 7,
  id: "task-1",
  payloadJson: JSON.stringify({ instructions: "Summarize the current state." }),
  scheduleId: null,
  status: "queued",
  title: "Summarize",
  userId: "user-1",
  agent: {
    capabilitiesJson: JSON.stringify(["analysis"]),
    isPaused: false,
    name: "Marshal",
    role: "operator",
    runInBackground: true,
    status: "idle",
    webhookUrl: null
  }
};

async function startOrchestrator() {
  const orchestrator = await import("../src/services/agentOrchestrator.js");
  const stop = await orchestrator.startAgentOrchestrator({
    initializeQueue: async () => undefined,
    logger,
    pollIntervalMs: 60_000,
    probeQueue: async () => undefined
  });

  return { orchestrator, stop };
}

describe("agent orchestrator durable execution", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (transaction: typeof transactionClient) => unknown) => (
      callback(transactionClient)
    ));
    mocks.assertDurableAuthorization.mockResolvedValue(undefined);
    mocks.agentLogCreate.mockResolvedValue({ id: "log-1" });
    mocks.agentMessageCreate.mockResolvedValue({ id: "message-1" });
    mocks.recordAuditLog.mockResolvedValue({ id: "audit-1" });
    mocks.emitGovernanceAlert.mockResolvedValue(undefined);
    mocks.failAiUsageReservation.mockResolvedValue(undefined);
    mocks.reserveAiUsage.mockResolvedValue({ id: "usage-1" });
    mocks.settleAiUsageReservation.mockResolvedValue({ id: "usage-1", status: "settled" });
    mocks.createReply.mockResolvedValue({
      content: "Complete.",
      model: "gpt-test",
      providerName: "OpenAI",
      requestId: "provider-request-1",
      usedLocalFallback: false
    });
    mocks.evaluateAgentPolicies.mockResolvedValue({ allowed: true, violations: [] });
  });

  it("persists one execution lease and releases only the matching token", async () => {
    mocks.agentTaskFindMany.mockResolvedValue([]);
    mocks.agentTaskFindUnique.mockResolvedValue(queuedTask);
    mocks.agentTaskUpdateMany.mockImplementation(async ({ data, where }: any) => {
      if (where.status === "queued" && data.status === "running") return { count: 1 };
      if (where.status === "running" && data.status === "completed") return { count: 1 };
      return { count: 0 };
    });
    mocks.agentUpdateMany.mockResolvedValue({ count: 1 });

    const { orchestrator, stop } = await startOrchestrator();
    orchestrator.enqueueAgentTask(queuedTask.id, logger);

    await vi.waitFor(() => expect(mocks.settleAiUsageReservation).toHaveBeenCalledTimes(1));
    await stop();

    const leaseClaim = mocks.agentUpdateMany.mock.calls.find(([input]) => input.data.status === "busy")?.[0];
    expect(leaseClaim).toBeDefined();
    expect(leaseClaim.where).toMatchObject({
      executionLeaseToken: null,
      id: queuedTask.agentId,
      isPaused: false,
      runInBackground: true
    });
    expect(leaseClaim.data).toMatchObject({
      executionLeaseTaskId: queuedTask.id,
      status: "busy"
    });
    expect(leaseClaim.data.executionLeaseToken).toEqual(expect.any(String));

    const leaseRelease = mocks.agentUpdateMany.mock.calls.find(([input]) => (
      input.where.executionLeaseToken === leaseClaim.data.executionLeaseToken
      && input.data.status === "idle"
    ))?.[0];
    expect(leaseRelease).toBeDefined();
    expect(leaseRelease.where).toMatchObject({
      executionLeaseToken: leaseClaim.data.executionLeaseToken,
      id: queuedTask.agentId,
      status: "busy"
    });
    expect(leaseRelease.data).toMatchObject({
      executionLeaseAcquiredAt: null,
      executionLeaseTaskId: null,
      executionLeaseToken: null,
      status: "idle"
    });
  });

  it("recovers stale running tasks and marks their orphaned AI reservation failed", async () => {
    const staleTask = {
      agentId: "agent-stale",
      id: "task-stale",
      startedAt: new Date("2026-07-31T00:00:00.000Z"),
      status: "running",
      userId: "user-1"
    };
    mocks.agentTaskFindMany
      .mockResolvedValueOnce([staleTask])
      .mockResolvedValueOnce([]);
    mocks.txAgentTaskUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txAgentUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txAiUsageEventUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txAgentLogCreate.mockResolvedValue({ id: "log-recovery" });

    const { enqueueQueuedAgentTasks } = await import("../src/services/agentOrchestrator.js");
    await enqueueQueuedAgentTasks(logger);

    expect(mocks.txAgentTaskUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "failed" }),
      where: expect.objectContaining({ id: staleTask.id, status: "running" })
    }));
    expect(mocks.txAgentUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ executionLeaseTaskId: staleTask.id, id: staleTask.agentId })
    }));
    expect(mocks.txAiUsageEventUpdateMany).toHaveBeenCalledWith({
      data: expect.objectContaining({
        failedAt: expect.any(Date),
        metadataJson: expect.stringContaining("AgentExecutionLeaseExpired"),
        status: "failed"
      }),
      where: {
        requestId: `agent-task:${staleTask.id}`,
        status: "reserved",
        userId: staleTask.userId
      }
    });
  });

  it("does not overwrite a newer control state when cancellation wins the policy CAS", async () => {
    mocks.agentTaskFindMany.mockResolvedValue([]);
    mocks.agentTaskFindUnique.mockResolvedValue(queuedTask);
    mocks.agentTaskUpdateMany.mockImplementation(async ({ data, where }: any) => (
      where.status === "queued" && data.status === "running" ? { count: 1 } : { count: 0 }
    ));
    mocks.txAgentTaskUpdateMany.mockResolvedValue({ count: 0 });
    mocks.evaluateAgentPolicies.mockResolvedValue({
      allowed: false,
      violations: [{ message: "Blocked by test policy." }]
    });
    mocks.agentUpdateMany.mockImplementation(async ({ data, where }: any) => {
      if (data.status === "busy") return { count: 1 };
      if (where.status === "busy" && data.status === "idle") return { count: 0 };
      if (where.executionLeaseToken && data.executionLeaseToken === null && data.status === undefined) {
        return { count: 1 };
      }
      return { count: 0 };
    });

    const { orchestrator, stop } = await startOrchestrator();
    orchestrator.enqueueAgentTask(queuedTask.id, logger);

    await vi.waitFor(() => expect(mocks.agentUpdateMany).toHaveBeenCalledTimes(3));
    await stop();

    expect(mocks.txAgentTaskUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: queuedTask.id, status: "running" }
    }));
    expect(mocks.txAgentUpdateMany).not.toHaveBeenCalled();
    expect(mocks.recordAuditLog).not.toHaveBeenCalled();
    expect(mocks.emitGovernanceAlert).not.toHaveBeenCalled();
    expect(mocks.reserveAiUsage).not.toHaveBeenCalled();

    const leaseClaim = mocks.agentUpdateMany.mock.calls.find(([input]) => input.data.status === "busy")?.[0];
    const fallbackRelease = mocks.agentUpdateMany.mock.calls.find(([input]) => (
      input.where.executionLeaseToken === leaseClaim.data.executionLeaseToken
      && input.where.status === undefined
      && input.data.executionLeaseToken === null
    ))?.[0];
    expect(fallbackRelease).toBeDefined();
    expect(fallbackRelease.data).not.toHaveProperty("status");
  });
});
