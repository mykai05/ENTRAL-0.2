import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  brainDecision: vi.fn(),
  conversationCreate: vi.fn(),
  conversationUpdate: vi.fn(),
  createAiAuditEntry: vi.fn(),
  createReply: vi.fn(),
  createVisionReply: vi.fn(),
  failReservation: vi.fn(),
  getSummary: vi.fn(),
  messageCreate: vi.fn(),
  messageDelete: vi.fn(),
  messageFindMany: vi.fn(),
  recordAuditLog: vi.fn(),
  reserve: vi.fn(),
  settle: vi.fn()
}));

class TestAiUsageLimitError extends Error {
  statusCode = 429;
  summary = {};
}

class TestAiUsageIdempotencyError extends Error {
  statusCode = 409;
}

vi.mock("../src/auth.js", () => ({
  requireAuth: vi.fn(async (request: { user?: unknown }) => {
    request.user = {
      email: "ada@example.com",
      role: "USER",
      session: "internal",
      sessionVersion: 0,
      sub: "user-1"
    };
  })
}));

const transactionClient = {
  conversation: {
    create: mocks.conversationCreate,
    findFirst: vi.fn(),
    update: mocks.conversationUpdate
  },
  message: { create: mocks.messageCreate }
};

vi.mock("../src/db.js", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(transactionClient)),
    conversation: {
      create: mocks.conversationCreate,
      update: mocks.conversationUpdate
    },
    message: {
      create: mocks.messageCreate,
      delete: mocks.messageDelete,
      findMany: mocks.messageFindMany
    }
  }
}));

vi.mock("../src/services/aiBrain.js", () => ({
  createAiAuditEntry: mocks.createAiAuditEntry
}));

vi.mock("../src/services/aiUsage.js", () => ({
  AiUsageIdempotencyError: TestAiUsageIdempotencyError,
  AiUsageLimitError: TestAiUsageLimitError,
  failAiUsageReservation: mocks.failReservation,
  getAiUsageSummary: mocks.getSummary,
  reserveAiUsage: mocks.reserve,
  resolveAiUsageRequestId: vi.fn((fallback: string, header?: string) => header ?? fallback),
  settleAiUsageReservation: mocks.settle
}));

vi.mock("../src/services/audit.js", () => ({ recordAuditLog: mocks.recordAuditLog }));
vi.mock("../src/services/developmentConnections.js", () => ({
  buildDevelopmentStatusAuditEntry: vi.fn(),
  createDevelopmentStatusReport: vi.fn(),
  createReadOnlyWriteRefusal: vi.fn(),
  isDevelopmentStatusRequest: vi.fn(() => false),
  isDevelopmentWriteActionRequest: vi.fn(() => false)
}));
vi.mock("../src/services/openaiService.js", () => ({
  createProviderBackedAiDecision: mocks.brainDecision,
  openAiChatService: { createReply: mocks.createReply, createVisionReply: mocks.createVisionReply }
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reserve.mockResolvedValue({ estimatedCostCents: 5, id: "usage-1" });
  mocks.settle.mockResolvedValue({ estimatedCostCents: 5, id: "usage-1" });
  mocks.getSummary.mockResolvedValue({ daily: {}, monthly: {} });
  mocks.brainDecision.mockResolvedValue({
    classification: {},
    errors: [],
    plan: {
      authorizationRequired: false,
      intent: "chat",
      riskLevel: "Low",
      toolsRequired: []
    },
    provider: { connectionStatus: "Connected" },
    providerRequestId: "decision-request-1",
    source: "provider"
  });
  mocks.conversationCreate.mockResolvedValue({ id: "conversation-1", title: "New thread" });
  mocks.messageCreate
    .mockResolvedValueOnce({ content: "Hello", createdAt: new Date(), id: "message-user-1" })
    .mockResolvedValueOnce({ content: "Reply", createdAt: new Date(), id: "message-ai-1" });
  mocks.messageFindMany.mockResolvedValue([{ content: "Hello", role: "user" }]);
  mocks.conversationUpdate.mockResolvedValue({});
  mocks.recordAuditLog.mockResolvedValue(undefined);
  mocks.createAiAuditEntry.mockReturnValue({ outcome: "planned" });
  mocks.createReply.mockResolvedValue({
    content: "Reply",
    model: "gpt-4o",
    providerName: "OpenAI",
    requestId: "reply-request-1",
    usedLocalFallback: false
  });
  mocks.createVisionReply.mockResolvedValue({
    content: "Screen reply",
    model: "gpt-4o",
    providerName: "OpenAI",
    requestId: "vision-request-1",
    usedLocalFallback: false
  });
});

async function buildServer() {
  const { aiRoutes } = await import("../src/routes/ai.js");
  const app = Fastify();
  await app.register(aiRoutes, {
    aiService: {
      createReply: mocks.createReply,
      createVisionReply: mocks.createVisionReply
    },
    prefix: "/api/v1"
  });
  return app;
}

describe("AI route reservation ordering", () => {
  it("reserves chat budget before either provider call and settles the same row", async () => {
    const app = await buildServer();
    const response = await app.inject({
      headers: { "idempotency-key": "chat-request-123" },
      method: "POST",
      payload: { message: "Hello" },
      url: "/api/v1/ai/chat"
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.reserve.mock.invocationCallOrder[0]).toBeLessThan(mocks.brainDecision.mock.invocationCallOrder[0]);
    expect(mocks.reserve.mock.invocationCallOrder[0]).toBeLessThan(mocks.createReply.mock.invocationCallOrder[0]);
    expect(mocks.settle).toHaveBeenCalledWith(expect.objectContaining({
      providerRequestId: "reply-request-1",
      requestId: "chat-request-123",
      reservationId: "usage-1"
    }));
    await app.close();
  });

  it("reserves screen budget before vision calls and rejects duplicate keys without provider execution", async () => {
    const app = await buildServer();
    const accepted = await app.inject({
      headers: { "idempotency-key": "screen-request-123" },
      method: "POST",
      payload: { message: "Inspect", screenshot: "data:image/png;base64,aGVsbG8=" },
      url: "/api/v1/ai/screen"
    });
    expect(accepted.statusCode).toBe(200);
    expect(mocks.reserve.mock.invocationCallOrder[0]).toBeLessThan(mocks.createVisionReply.mock.invocationCallOrder[0]);

    vi.clearAllMocks();
    mocks.reserve.mockRejectedValueOnce(new TestAiUsageIdempotencyError("duplicate"));
    const duplicate = await app.inject({
      headers: { "idempotency-key": "screen-request-123" },
      method: "POST",
      payload: { message: "Inspect", screenshot: "data:image/png;base64,aGVsbG8=" },
      url: "/api/v1/ai/screen"
    });
    expect(duplicate.statusCode).toBe(409);
    expect(mocks.brainDecision).not.toHaveBeenCalled();
    expect(mocks.createVisionReply).not.toHaveBeenCalled();
    await app.close();
  });
});
