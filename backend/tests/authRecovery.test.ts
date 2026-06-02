import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashAuthToken } from "../src/services/authTokens.js";

beforeEach(() => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.APP_PUBLIC_URL = "http://localhost:3000";
  process.env.AUTH_EMAIL_PROVIDER = "console";
});

describe("auth recovery workflows", () => {
  it("confirms password reset with a hashed single-use token", async () => {
    const rawToken = "reset-token-that-is-long-enough-for-validation-123";
    const user = {
      email: "ada@example.com",
      emailVerifiedAt: null,
      id: "user_123",
      name: "Ada Lovelace"
    };
    const resetRecord = {
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      id: "reset_123",
      tokenHash: hashAuthToken(rawToken),
      user,
      userId: user.id
    };

    const findUnique = vi.fn(async () => resetRecord);
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const updateUser = vi.fn(async ({ data }) => ({
      ...user,
      ...data
    }));

    vi.doMock("../src/db.js", () => ({
      prisma: {
        $transaction: (callback: (tx: unknown) => unknown) => callback({
          passwordResetToken: { updateMany },
          user: { update: updateUser }
        }),
        passwordResetToken: { findUnique }
      }
    }));
    vi.doMock("../src/services/audit.js", () => ({
      recordAuditLog: vi.fn(async () => undefined)
    }));

    const { confirmPasswordReset } = await import("../src/services/authRecovery.js");
    const result = await confirmPasswordReset(rawToken, "new-secure-password");

    expect(result.ok).toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      include: { user: true },
      where: { tokenHash: hashAuthToken(rawToken) }
    });
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        consumedAt: null,
        userId: user.id
      }
    }));
    expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        emailVerifiedAt: expect.any(Date),
        passwordHash: expect.not.stringContaining("new-secure-password")
      }),
      where: { id: user.id }
    }));
  });

  it("rejects consumed password reset tokens", async () => {
    vi.doMock("../src/db.js", () => ({
      prisma: {
        passwordResetToken: {
          findUnique: vi.fn(async () => ({
            consumedAt: new Date(),
            expiresAt: new Date(Date.now() + 60_000),
            id: "reset_123",
            tokenHash: "hash",
            user: { email: "ada@example.com", id: "user_123", name: "Ada" },
            userId: "user_123"
          }))
        }
      }
    }));
    vi.doMock("../src/services/audit.js", () => ({
      recordAuditLog: vi.fn(async () => undefined)
    }));

    const { confirmPasswordReset } = await import("../src/services/authRecovery.js");
    const result = await confirmPasswordReset("used-reset-token-that-is-long-enough", "new-secure-password");

    expect(result).toEqual({ ok: false, reason: "invalid" });
  });
});
