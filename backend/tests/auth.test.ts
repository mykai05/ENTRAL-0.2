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

  it("creates random recovery tokens and stores only hashes", async () => {
    const { createAuthToken, hashAuthToken } = await import("../src/services/authTokens.js");

    const first = createAuthToken();
    const second = createAuthToken();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashAuthToken(first.token));
    expect(first.tokenHash).not.toContain(first.token);
  });
});
