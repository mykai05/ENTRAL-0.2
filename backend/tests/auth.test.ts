import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
});

describe("auth tokens", () => {
  it("round trips signed JWT payloads", async () => {
    const { signAuthToken, verifyAuthToken } = await import("../src/auth.js");
    const token = signAuthToken({
      sub: "user_123",
      email: "ada@example.com",
      role: "USER"
    });

    expect(verifyAuthToken(token)).toMatchObject({
      sub: "user_123",
      email: "ada@example.com",
      role: "USER"
    });
  });

  it("capitalizes the first letter of display names", async () => {
    const { capitalizeDisplayName } = await import("../src/services/users.js");

    expect(capitalizeDisplayName("ada lovelace")).toBe("Ada lovelace");
    expect(capitalizeDisplayName("  grace hopper  ")).toBe("Grace hopper");
  });
});
