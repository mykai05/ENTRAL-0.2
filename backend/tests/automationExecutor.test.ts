import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.AUTOMATION_ALLOWED_DOMAINS = "example.com";
});

describe("automation URL allow-list", () => {
  it("allows configured domains", async () => {
    const { assertAllowedAutomationUrl } = await import("../src/services/automationExecutor.js");

    expect(assertAllowedAutomationUrl("https://docs.example.com/path").hostname).toBe("docs.example.com");
  });

  it("rejects unconfigured domains", async () => {
    const { assertAllowedAutomationUrl } = await import("../src/services/automationExecutor.js");

    expect(() => assertAllowedAutomationUrl("https://untrusted.invalid")).toThrow(/not allowed/i);
  });

  it("rejects local and private network targets even if configured", async () => {
    process.env.AUTOMATION_ALLOWED_DOMAINS = "localhost,127.0.0.1,example.com";
    const { assertAllowedAutomationUrl } = await import("../src/services/automationExecutor.js");

    expect(() => assertAllowedAutomationUrl("http://localhost:3000")).toThrow(/public host/i);
    expect(() => assertAllowedAutomationUrl("http://127.0.0.1:3000")).toThrow(/public host/i);
  });
});
