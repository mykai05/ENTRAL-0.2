import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  aggregate: vi.fn(),
  create: vi.fn()
}));

vi.mock("../src/db.js", () => ({
  prisma: {
    aiUsageEvent: {
      aggregate: mocks.aggregate,
      create: mocks.create
    }
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
  delete process.env.DATA_ENCRYPTION_KEY;
}

function mockUsageSums(dailyUsedCents: number, monthlyUsedCents: number) {
  mocks.aggregate
    .mockResolvedValueOnce({ _sum: { estimatedCostCents: dailyUsedCents } })
    .mockResolvedValueOnce({ _sum: { estimatedCostCents: monthlyUsedCents } });
}

beforeEach(() => {
  vi.resetModules();
  mocks.aggregate.mockReset();
  mocks.create.mockReset();
  setTestEnv();
});

describe("AI usage guardrails", () => {
  it("estimates provider-backed request costs by request kind", async () => {
    const { estimateAiCostCents } = await import("../src/services/aiUsage.js");

    expect(estimateAiCostCents("chat", true)).toBe(5);
    expect(estimateAiCostCents("screen", true)).toBe(9);
    expect(estimateAiCostCents("development_status", true)).toBe(1);
    expect(estimateAiCostCents("development_write_refusal", false)).toBe(0);
  });

  it("allows requests that fit inside the daily and monthly caps", async () => {
    mockUsageSums(4, 10);
    const { assertAiUsageAllowed } = await import("../src/services/aiUsage.js");

    await expect(assertAiUsageAllowed("user-1", "chat")).resolves.toMatchObject({
      estimatedCostCents: 5,
      summary: {
        daily: {
          remainingCents: 6,
          usedCents: 4
        },
        mode: "real"
      }
    });
  });

  it("blocks real provider calls before they exceed the cap", async () => {
    mockUsageSums(6, 20);
    const { AiUsageLimitError, assertAiUsageAllowed } = await import("../src/services/aiUsage.js");

    await expect(assertAiUsageAllowed("user-1", "chat")).rejects.toBeInstanceOf(AiUsageLimitError);
  });

  it("records usage events with metadata", async () => {
    mocks.create.mockResolvedValueOnce({ id: "usage-1" });
    const { recordAiUsageEvent } = await import("../src/services/aiUsage.js");

    await recordAiUsageEvent({
      estimatedCostCents: 5,
      metadata: {
        authorizationRequired: true,
        secret: "sk-should-be-redacted"
      },
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
        userId: "user-1"
      })
    });
  });
});
