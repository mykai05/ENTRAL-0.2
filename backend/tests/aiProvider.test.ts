import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.AI_FEATURE_ENABLED = "true";
  process.env.AI_LOCAL_FALLBACK = "true";
  process.env.OPENAI_MODEL = "gpt-4o";
  process.env.OPENAI_API_KEY = "";
});

describe("AI Provider", () => {
  it("reports missing backend credentials without exposing secrets", async () => {
    const { getPrimaryAiProviderState, testPrimaryAiProvider } = await import("../src/services/aiProvider.js");

    const state = getPrimaryAiProviderState();
    const result = await testPrimaryAiProvider();

    expect(state.connectionStatus).toBe("Missing API Key");
    expect(state.mockMode).toBe(true);
    expect(state.missingEnvVars).toEqual(["OPENAI_API_KEY"]);
    expect(result.success).toBe(false);
    expect(result.message).toContain("AI Provider Not Connected");
    expect(JSON.stringify(result)).not.toContain("sk-");
  });

  it("uses deterministic planning when the provider is not connected", async () => {
    const { createProviderBackedAiDecision } = await import("../src/services/openaiService.js");

    const decision = await createProviderBackedAiDecision("Send a Gmail update to the client.");

    expect(decision.source).toBe("deterministic");
    expect(decision.plan.authorizationRequired).toBe(true);
    expect(decision.plan.toolsRequired).toContain("gmail");
    expect(decision.errors[0]).toContain("OPENAI_API_KEY");
  });

  it("validates provider JSON before using classifications and plans", async () => {
    const providerModule = await import("../src/services/aiProvider.js");
    const serviceModule = await import("../src/services/openaiService.js");
    vi.spyOn(providerModule.openAiProvider, "canRequest").mockReturnValue(true);
    vi.spyOn(providerModule.openAiProvider, "request").mockResolvedValue({
      content: JSON.stringify({
        classification: {
          authorizationRequirement: "not_required",
          confidence: "high",
          detectedIntent: "email_request",
          requiredEntities: ["Task"],
          requiredTools: [],
          riskLevel: "Low",
          suggestedAction: "Send the email immediately."
        },
        actionPlan: {
          authorizationRequired: false,
          expectedOutput: "Email sent.",
          riskLevel: "Low",
          steps: [{ id: "send", label: "Send email.", requiresApproval: false, status: "ready" }],
          summary: "Send the email.",
          toolsRequired: []
        }
      }),
      model: "gpt-4o",
      providerName: "OpenAI",
      usedMockFallback: false
    });

    const decision = await serviceModule.createProviderBackedAiDecision("Email the client a launch update through Gmail.");

    expect(decision.source).toBe("provider");
    expect(decision.plan.intent).toBe("email_request");
    expect(decision.plan.toolsRequired).toContain("gmail");
    expect(decision.plan.authorizationRequired).toBe(true);
    expect(decision.plan.steps.some((step) => step.id === "authorization")).toBe(true);
  });

  it("falls back safely when provider JSON is invalid", async () => {
    const providerModule = await import("../src/services/aiProvider.js");
    const serviceModule = await import("../src/services/openaiService.js");
    vi.spyOn(providerModule.openAiProvider, "canRequest").mockReturnValue(true);
    vi.spyOn(providerModule.openAiProvider, "request").mockResolvedValue({
      content: "not json",
      model: "gpt-4o",
      providerName: "OpenAI",
      usedMockFallback: false
    });

    const decision = await serviceModule.createProviderBackedAiDecision("Create a Merch Marshal.");

    expect(decision.source).toBe("deterministic");
    expect(decision.errors[0]).toContain("invalid JSON");
    expect(decision.plan.intent).toBe("create_hierarchy");
  });
});
