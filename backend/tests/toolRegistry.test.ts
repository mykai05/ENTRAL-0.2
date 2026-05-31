import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
});

describe("backend Tool Registry", () => {
  it("exposes the OpenAI provider and guarded external tools", async () => {
    const { getToolRegistry } = await import("../src/services/toolRegistry.js");
    const registry = getToolRegistry();

    expect(registry.some((tool) => tool.id === "openai")).toBe(true);
    expect(registry.some((tool) => tool.id === "gmail" && tool.requiresAuthorization)).toBe(true);
  });

  it("reports unconnected credentials safely", async () => {
    const { buildToolTestResult, getToolById } = await import("../src/services/toolRegistry.js");
    const gmail = getToolById("gmail");

    expect(gmail).toBeDefined();
    const result = buildToolTestResult(gmail!);

    expect(result.success).toBe(false);
    expect(result.nextSteps).toContain("Add backend-controlled credentials.");
  });

  it("creates mock execution without contacting external systems", async () => {
    const { buildMockToolExecution, getToolById } = await import("../src/services/toolRegistry.js");
    const shopify = getToolById("shopify");

    expect(shopify).toBeDefined();
    const result = buildMockToolExecution(shopify!, "Prepare Shopify launch.");

    expect(result.message).toContain("No external system was contacted");
    expect(result.simulatedResult).toContain("Prepare Shopify launch");
  });
});
