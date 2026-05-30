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
  delete process.env.OPENAI_API_KEY;
});

describe("OpenAiChatService", () => {
  it("uses a local fallback outside production when no API key is configured", async () => {
    const { OpenAiChatService } = await import("../src/services/openaiService.js");
    const service = new OpenAiChatService();
    const reply = await service.createReply([
      { role: "user", content: "How should I plan onboarding?" }
    ]);

    expect(reply.usedLocalFallback).toBe(true);
    expect(reply.model).toBe("local-fallback");
    expect(reply.content).toContain("How should I plan onboarding?");
  });

  it("uses a local fallback for screen analysis when no API key is configured", async () => {
    const { OpenAiChatService } = await import("../src/services/openaiService.js");
    const service = new OpenAiChatService();
    const reply = await service.createVisionReply([
      { role: "user", content: "Look at my screen." }
    ], "data:image/jpeg;base64,aGVsbG8=", "What do you see?");

    expect(reply.usedLocalFallback).toBe(true);
    expect(reply.content).toContain("vision command channel is not configured");
  });
});
