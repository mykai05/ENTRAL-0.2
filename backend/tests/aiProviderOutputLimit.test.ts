import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn()
}));

vi.mock("openai", () => ({
  default: class OpenAiTestClient {
    chat = { completions: { create: mocks.create } };
  }
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "postgresql://unused:unused@localhost:5432/unused";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.APP_PUBLIC_URL = "http://localhost:3000";
  process.env.AI_FEATURE_ENABLED = "true";
  process.env.AI_LOCAL_FALLBACK = "false";
  process.env.OPENAI_API_KEY = "sk-test";
  process.env.OPENAI_MODEL = "gpt-4o";
  process.env.INTEGRATION_REGISTRY_JSON = JSON.stringify([{
    active_at: "2026-07-24T01:00:00Z",
    adapter_version: "1.0.0",
    auth_methods: ["API_KEY"],
    capability_codes: ["AI_CHAT"],
    credential_reference_id: "223e4567-e89b-42d3-a456-426614174000",
    disabled_reason: null,
    evidence_ids: ["423e4567-e89b-42d3-a456-426614174000"],
    granted_operation_codes: ["chat.completions"],
    integration_id: "123e4567-e89b-42d3-a456-426614174000",
    live_tested_at: "2026-07-24T00:00:00Z",
    official_documentation_url: "https://platform.openai.com/docs/api-reference",
    owning_business_id: "323e4567-e89b-42d3-a456-426614174000",
    provider_api_version: "v1",
    provider_code: "openai",
    provider_name: "OpenAI",
    stage: "ACTIVE"
  }]);
  mocks.create.mockResolvedValue({
    _request_id: "provider-request-1",
    choices: [{ message: { content: "Bounded reply" } }],
    model: "gpt-4o"
  });
});

describe("OpenAI output ceiling", () => {
  it("always sends a hard bounded max_completion_tokens value", async () => {
    const { openAiProvider } = await import("../src/services/aiProvider.js");
    const messages = [{ role: "user" as const, content: "Test" }];

    await openAiProvider.request({ maxOutputTokens: 99_999, messages });
    await openAiProvider.request({ messages });

    expect(mocks.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      max_completion_tokens: 4_096
    }));
    expect(mocks.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      max_completion_tokens: 1_200
    }));
  });
});
