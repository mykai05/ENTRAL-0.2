import cookie from "@fastify/cookie";
import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionId = "123e4567-e89b-42d3-a456-426614174201";
const actorId = "123e4567-e89b-42d3-a456-426614174202";
const organizationId = "123e4567-e89b-42d3-a456-426614174203";
const tenantId = "123e4567-e89b-42d3-a456-426614174204";
const grantId = "123e4567-e89b-42d3-a456-426614174205";
const tokenId = "123e4567-e89b-42d3-a456-426614174206";

beforeEach(() => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/entral_test";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.APP_PUBLIC_URL = "http://localhost:3000";
});

describe("Phase 202 exact-grant support sessions", () => {
  it("round trips a distinct support audience and exact sgid claim", async () => {
    const { signAuthToken, verifyAuthToken } = await import("../src/auth.js");
    const token = signAuthToken({
      sub: "support-user",
      email: "support@example.com",
      role: "USER",
      session: "support",
      sessionVersion: 3,
      sessionId,
      tokenId,
      actorId,
      organizationId,
      tenantId,
      supportGrantId: grantId
    });

    expect(verifyAuthToken(token)).toMatchObject({
      sub: "support-user",
      session: "support",
      sessionId,
      actorId,
      organizationId,
      tenantId,
      supportGrantId: grantId,
      tokenVersion: 2
    });
  });

  it("rejects support tokens that are not durably bound to an exact grant", async () => {
    const { signAuthToken } = await import("../src/auth.js");
    expect(() => signAuthToken({
      sub: "support-user",
      email: "support@example.com",
      role: "USER",
      session: "support",
      sessionVersion: 3,
      sessionId,
      tokenId,
      actorId,
      organizationId,
      tenantId
    })).toThrow("exact durable grant scope");
  });

  it("default-denies every application surface except exact support readback and session lifecycle", async () => {
    const { enforceSessionBoundary, signAuthToken } = await import("../src/auth.js");
    const authorization = `Bearer ${signAuthToken({
      sub: "support-user",
      email: "support@example.com",
      role: "USER",
      session: "support",
      sessionVersion: 3,
      sessionId,
      tokenId,
      actorId,
      organizationId,
      tenantId,
      supportGrantId: grantId
    })}`;
    const app = Fastify();
    await app.register(cookie);
    app.addHook("preValidation", enforceSessionBoundary);
    app.get("/api/v1/identity/support-session", async () => ({ ok: true }));
    app.post("/api/v1/refresh", async () => ({ ok: true }));
    app.get("/api/v1/identity/sessions", async () => ({ unsafe: true }));
    app.get("/api/v1/member/dashboard", async () => ({ unsafe: true }));
    app.get("/api/v1/tasks", async () => ({ unsafe: true }));

    for (const request of [
      { method: "GET" as const, url: "/api/v1/identity/sessions" },
      { method: "GET" as const, url: "/api/v1/member/dashboard" },
      { method: "GET" as const, url: "/api/v1/tasks" }
    ]) {
      const response = await app.inject({ ...request, headers: { authorization } });
      expect(response.statusCode, request.url).toBe(403);
    }
    expect((await app.inject({
      headers: { authorization },
      method: "GET",
      url: "/api/v1/identity/support-session"
    })).statusCode).toBe(200);
    expect((await app.inject({
      headers: { authorization },
      method: "POST",
      url: "/api/v1/refresh"
    })).statusCode).toBe(200);
    await app.close();
  });

  it("requires support login to name one grant and rejects caller-supplied tenant scope", async () => {
    const { loginSchema } = await import("../src/schemas.js");
    expect(loginSchema.safeParse({
      email: "support@example.com",
      password: "secret",
      flow: "support"
    }).success).toBe(false);
    expect(loginSchema.safeParse({
      email: "support@example.com",
      password: "secret",
      flow: "support",
      supportGrantId: grantId,
      tenantId
    }).success).toBe(false);
    expect(loginSchema.safeParse({
      email: "support@example.com",
      password: "secret",
      flow: "support",
      supportGrantId: grantId
    }).success).toBe(true);
  });

  it("binds the exact support grant into the transaction-local database context", async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const queryRaw = vi.fn()
      .mockResolvedValueOnce([{ appUserId: "support-user" }])
      .mockResolvedValueOnce([{ actorId }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        accessMode: "READ_ONLY",
        actorId,
        grantExpiresAt: expiresAt,
        organizationId,
        role: "SUPPORT",
        scopes: ["table:MemberWorkspaceSnapshot:read"],
        supportGrantId: grantId,
        tenantId,
        writeElevationExpiresAt: null
      }])
      .mockResolvedValueOnce([]);
    const { bindSupportGrantContext } = await import("../src/db.js");
    const identity = await bindSupportGrantContext({ $queryRaw: queryRaw } as never, {
      actionReason: "support.test",
      authSubject: "support-user",
      requestId: "support-request",
      supportGrantId: grantId
    });

    expect(identity).toMatchObject({ actorId, organizationId, tenantId, supportGrantId: grantId });
    expect(queryRaw).toHaveBeenCalledTimes(5);
    const initialBindingValues = queryRaw.mock.calls[2]!.slice(1);
    const finalBindingValues = queryRaw.mock.calls[4]!.slice(1);
    expect(initialBindingValues).toContain(grantId);
    expect(finalBindingValues).toContain(grantId);
    expect(finalBindingValues).toContain(tenantId);
    expect(finalBindingValues).toContain(organizationId);
  });
});
