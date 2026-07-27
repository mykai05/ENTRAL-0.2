import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  aggregate: vi.fn(),
  create: vi.fn(),
  executeRaw: vi.fn(),
  findUnique: vi.fn(),
  transaction: vi.fn(),
  updateMany: vi.fn()
}));

const transactionClient = {
  $executeRaw: mocks.executeRaw,
  aiUsageEvent: {
    aggregate: mocks.aggregate,
    create: mocks.create,
    findUnique: mocks.findUnique,
    updateMany: mocks.updateMany
  }
};

vi.mock("../src/db.js", () => ({
  prisma: {
    $transaction: mocks.transaction,
    aiUsageEvent: transactionClient.aiUsageEvent
  }
}));

function setTestEnv() {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.APP_PUBLIC_URL = "http://localhost:3000";
  process.env.AUTH_EMAIL_PROVIDER = "console";
  process.env.AI_FEATURE_ENABLED = "true";
  process.env.AI_LOCAL_FALLBACK = "true";
  process.env.AI_DAILY_COST_LIMIT_CENTS = "10";
  process.env.AI_MONTHLY_COST_LIMIT_CENTS = "50";
  process.env.AI_DECISION_ESTIMATED_COST_CENTS = "1";
  process.env.AI_CHAT_ESTIMATED_COST_CENTS = "4";
  process.env.AI_SCREEN_ESTIMATED_COST_CENTS = "8";
  process.env.AI_LOCAL_FALLBACK_ESTIMATED_COST_CENTS = "0";
  process.env.OPENAI_API_KEY = "sk-test";
  process.env.INTEGRATION_REGISTRY_JSON = JSON.stringify([{
    integration_id: "123e4567-e89b-42d3-a456-426614174000",
    provider_code: "openai",
    provider_name: "OpenAI",
    provider_api_version: "v1",
    capability_codes: ["AI_CHAT"],
    official_documentation_url: "https://platform.openai.com/docs/api-reference",
    stage: "ACTIVE",
    adapter_version: "1.0.0",
    auth_methods: ["API_KEY"],
    credential_reference_id: "223e4567-e89b-42d3-a456-426614174000",
    owning_business_id: "323e4567-e89b-42d3-a456-426614174000",
    granted_operation_codes: ["chat.completions"],
    live_tested_at: "2026-07-24T00:00:00Z",
    active_at: "2026-07-24T01:00:00Z",
    evidence_ids: ["423e4567-e89b-42d3-a456-426614174000"],
    disabled_reason: null
  }]);
  delete process.env.DATA_ENCRYPTION_KEY;
}

function mockUsageSums(dailyUsedCents: number, monthlyUsedCents: number) {
  mocks.aggregate
    .mockResolvedValueOnce({ _sum: { estimatedCostCents: dailyUsedCents } })
    .mockResolvedValueOnce({ _sum: { estimatedCostCents: monthlyUsedCents } });
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  setTestEnv();
  mocks.executeRaw.mockResolvedValue(1);
  mocks.findUnique.mockResolvedValue(null);
  mocks.transaction.mockImplementation((callback) => callback(transactionClient));
  mocks.updateMany.mockResolvedValue({ count: 1 });
});

describe("AI usage guardrails", () => {
  it("estimates provider-backed request costs by request kind", async () => {
    const { estimateAiCostCents } = await import("../src/services/aiUsage.js");

    expect(estimateAiCostCents("chat", true)).toBe(5);
    expect(estimateAiCostCents("screen", true)).toBe(9);
    expect(estimateAiCostCents("development_status", true)).toBe(1);
    expect(estimateAiCostCents("development_write_refusal", false)).toBe(0);
  });

  it("allows read-only preflights that fit inside the daily and monthly caps", async () => {
    mockUsageSums(4, 10);
    const { assertAiUsageAllowed } = await import("../src/services/aiUsage.js");

    await expect(assertAiUsageAllowed("user-1", "chat")).resolves.toMatchObject({
      estimatedCostCents: 5,
      summary: {
        daily: { remainingCents: 6, usedCents: 4 },
        mode: "real"
      }
    });
  });

  it("blocks real provider calls before they exceed the cap", async () => {
    mockUsageSums(6, 20);
    const { AiUsageLimitError, reserveAiUsage } = await import("../src/services/aiUsage.js");

    await expect(reserveAiUsage({
      requestId: "request-budget-1",
      requestKind: "chat",
      userId: "user-1"
    })).rejects.toBeInstanceOf(AiUsageLimitError);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("serializes concurrent reservations and rejects an idempotent replay before a second provider charge", async () => {
    const events = new Map<string, Record<string, unknown>>();
    let transactionTail = Promise.resolve<unknown>(undefined);
    mocks.transaction.mockImplementation((callback) => {
      const result = transactionTail.then(() => callback(transactionClient));
      transactionTail = result.then(() => undefined, () => undefined);
      return result;
    });
    mocks.aggregate.mockResolvedValue({ _sum: { estimatedCostCents: 0 } });
    mocks.findUnique.mockImplementation(async ({ where }) => {
      const key = `${where.userId_requestId.userId}:${where.userId_requestId.requestId}`;
      return events.get(key) ?? null;
    });
    mocks.create.mockImplementation(async ({ data }) => {
      const event = { ...data, id: "usage-1" };
      events.set(`${data.userId}:${data.requestId}`, event);
      return event;
    });
    const { AiUsageIdempotencyError, reserveAiUsage } = await import("../src/services/aiUsage.js");
    const input = { requestId: "same-request-1", requestKind: "chat" as const, userId: "user-1" };

    const results = await Promise.allSettled([reserveAiUsage(input), reserveAiUsage(input)]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((results.find((result) => result.status === "rejected") as PromiseRejectedResult).reason).toBeInstanceOf(AiUsageIdempotencyError);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.executeRaw).toHaveBeenCalledTimes(2);
  });

  it("settles the original reservation row with provider proof", async () => {
    mocks.findUnique.mockResolvedValueOnce({
      estimatedCostCents: 5,
      id: "usage-1",
      requestId: "request-1",
      status: "settled",
      userId: "user-1"
    });
    const { settleAiUsageReservation } = await import("../src/services/aiUsage.js");

    await settleAiUsageReservation({
      modelName: "gpt-4o",
      providerName: "OpenAI",
      providerRequestId: "openai-request-1",
      requestId: "request-1",
      reservationId: "usage-1",
      usedLocalFallback: false,
      userId: "user-1"
    });

    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        providerRequestId: "openai-request-1",
        status: "settled"
      }),
      where: expect.objectContaining({ id: "usage-1", status: "reserved" })
    }));
  });

  it("records compatibility events as already-settled usage", async () => {
    mocks.create.mockResolvedValueOnce({ id: "usage-1" });
    const { recordAiUsageEvent } = await import("../src/services/aiUsage.js");

    await recordAiUsageEvent({
      estimatedCostCents: 5,
      metadata: { authorizationRequired: true, secret: "sk-should-be-redacted" },
      modelName: "gpt-4o",
      providerName: "OpenAI",
      requestId: "request-1",
      requestKind: "chat",
      usedLocalFallback: false,
      userId: "user-1"
    });

    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        estimatedCostCents: 5,
        metadataJson: expect.stringContaining("authorizationRequired"),
        requestKind: "chat",
        status: "settled",
        userId: "user-1"
      })
    });
  });
});
