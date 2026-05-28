import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
});

describe("policy engine helpers", () => {
  it("extracts URL hosts from task text", async () => {
    const { extractHosts } = await import("../src/services/policyEngine.js");

    expect(extractHosts("Review https://example.com/path and http://sub.example.org?q=1")).toEqual([
      "example.com",
      "sub.example.org"
    ]);
  });
});
