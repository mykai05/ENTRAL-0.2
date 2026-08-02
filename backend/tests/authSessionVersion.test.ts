import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn()
}));

vi.mock("../src/db.js", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique }
  },
  withPersonalSession: vi.fn(async (database, context, operation) => operation(database, {
    actorId: "123e4567-e89b-42d3-a456-426614174210",
    appUserId: "223e4567-e89b-42d3-a456-426614174210",
    authSubject: context.authSubject
  }))
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
});

function replyHarness() {
  const reply = {
    code: vi.fn(() => reply),
    send: vi.fn()
  };
  return reply;
}

describe("session-version revocation", () => {
  it("accepts a token only while its version matches current account state", async () => {
    const { requireAuth, signAuthToken } = await import("../src/auth.js");
    const token = signAuthToken({
      email: "ada@example.com",
      role: "USER",
      session: "member",
      sessionVersion: 4,
      sub: "user-1"
    });
    mocks.userFindUnique.mockResolvedValueOnce({ sessionVersion: 4 });
    const request = {
      cookies: {},
      headers: { authorization: `Bearer ${token}` }
    } as never;
    const reply = replyHarness();

    await requireAuth(request, reply as never);

    expect(reply.send).not.toHaveBeenCalled();
    expect((request as { user?: { sessionVersion: number } }).user?.sessionVersion).toBe(4);
    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      select: { deletedAt: true, sessionVersion: true },
      where: { id: "user-1" }
    });
  });

  it("rejects a previously issued token after the account version advances", async () => {
    const { requireAuth, signAuthToken } = await import("../src/auth.js");
    const token = signAuthToken({
      email: "ada@example.com",
      role: "USER",
      sessionVersion: 4,
      sub: "user-1"
    });
    mocks.userFindUnique.mockResolvedValueOnce({ sessionVersion: 5 });
    const request = {
      cookies: {},
      headers: { authorization: `Bearer ${token}` }
    } as never;
    const reply = replyHarness();

    await requireAuth(request, reply as never);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({
      error: "Unauthorized",
      message: "Authentication is required."
    });
    expect((request as { user?: unknown }).user).toBeUndefined();
  });
});
