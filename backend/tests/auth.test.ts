import { beforeEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";

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
      role: "USER",
      session: "internal"
    });
  });

  it("round trips a distinct member session audience", async () => {
    const { signAuthToken, verifyAuthToken } = await import("../src/auth.js");
    const token = signAuthToken({
      sub: "member_123",
      email: "member@example.com",
      role: "USER",
      session: "member"
    });

    expect(verifyAuthToken(token)).toMatchObject({
      sub: "member_123",
      session: "member"
    });
  });

  it("rejects legacy JWTs that have no explicit session scope or audience", async () => {
    const [{ default: jwt }, { verifyAuthToken }] = await Promise.all([
      import("jsonwebtoken"),
      import("../src/auth.js")
    ]);
    const legacyToken = jwt.sign(
      { sub: "legacy_123", email: "legacy@example.com", role: "USER" },
      process.env.JWT_SECRET as string,
      { algorithm: "HS256", expiresIn: "7d" }
    );

    expect(() => verifyAuthToken(legacyToken)).toThrow("Invalid session scope");
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

describe("member session authorization boundary", () => {
  async function buildSessionBoundaryServer() {
    const { enforceSessionBoundary } = await import("../src/auth.js");
    const app = Fastify();
    await app.register(cookie);
    app.addHook("preValidation", enforceSessionBoundary);

    for (const route of [
      { method: "GET" as const, url: "/api/v1/tasks" },
      { method: "POST" as const, url: "/api/v1/tasks" },
      { method: "GET" as const, url: "/api/v1/agents" },
      { method: "POST" as const, url: "/api/v1/agents" },
      { method: "GET" as const, url: "/api/v1/command-os/state" },
      { method: "PUT" as const, url: "/api/v1/command-os/state" },
      { method: "GET" as const, url: "/api/v1/connections/tools" },
      { method: "POST" as const, url: "/api/v1/connections/tools/example/test" }
    ]) {
      app.route({ ...route, handler: async () => ({ ok: true }) });
    }

    app.get("/api/v1/member/organizations", async () => ({ ok: true }));
    return app;
  }

  it("default-denies internal read and write surfaces to a member principal", async () => {
    const { signAuthToken } = await import("../src/auth.js");
    const authorization = `Bearer ${signAuthToken({
      sub: "member_123",
      email: "member@example.com",
      role: "USER",
      session: "member"
    })}`;
    const app = await buildSessionBoundaryServer();

    for (const request of [
      { method: "GET" as const, url: "/api/v1/tasks" },
      { method: "POST" as const, url: "/api/v1/tasks" },
      { method: "GET" as const, url: "/api/v1/agents" },
      { method: "POST" as const, url: "/api/v1/agents" },
      { method: "GET" as const, url: "/api/v1/command-os/state" },
      { method: "PUT" as const, url: "/api/v1/command-os/state" },
      { method: "GET" as const, url: "/api/v1/connections/tools" },
      { method: "POST" as const, url: "/api/v1/connections/tools/example/test" }
    ]) {
      const response = await app.inject({ ...request, headers: { authorization } });
      expect(response.statusCode, `${request.method} ${request.url}`).toBe(403);
    }

    const allowed = await app.inject({
      headers: { authorization },
      method: "GET",
      url: "/api/v1/member/organizations"
    });
    expect(allowed.statusCode).toBe(200);
    await app.close();
  });

  it("preserves internal routes for an internal principal", async () => {
    const { signAuthToken } = await import("../src/auth.js");
    const authorization = `Bearer ${signAuthToken({
      sub: "operator_123",
      email: "operator@example.com",
      role: "USER",
      session: "internal"
    })}`;
    const app = await buildSessionBoundaryServer();
    const response = await app.inject({ headers: { authorization }, method: "GET", url: "/api/v1/tasks" });

    expect(response.statusCode).toBe(200);
    await app.close();
  });
});

describe("browser request origin protection", () => {
  async function buildOriginTestServer() {
    const { requireTrustedOrigin } = await import("../src/auth.js");
    const app = Fastify();
    app.addHook("preValidation", requireTrustedOrigin);
    app.post("/mutation", async () => ({ ok: true }));
    return app;
  }

  it("accepts the configured application origin", async () => {
    const app = await buildOriginTestServer();
    const response = await app.inject({
      headers: { origin: "http://localhost:3000" },
      method: "POST",
      url: "/mutation"
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("rejects untrusted and explicitly cross-site browser mutations", async () => {
    const app = await buildOriginTestServer();
    const untrusted = await app.inject({
      headers: { origin: "https://attacker.example" },
      method: "POST",
      url: "/mutation"
    });
    const crossSite = await app.inject({
      headers: { "sec-fetch-site": "cross-site" },
      method: "POST",
      url: "/mutation"
    });

    expect(untrusted.statusCode).toBe(403);
    expect(crossSite.statusCode).toBe(403);
    await app.close();
  });

  it("preserves non-browser client compatibility when Origin is absent", async () => {
    const app = await buildOriginTestServer();
    const response = await app.inject({ method: "POST", url: "/mutation" });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("rejects an unsafe no-Origin request that carries the browser session cookie", async () => {
    const app = await buildOriginTestServer();
    const rejected = await app.inject({
      headers: { cookie: "entral_token=session-value" },
      method: "POST",
      url: "/mutation"
    });
    const sameOrigin = await app.inject({
      headers: {
        cookie: "entral_token=session-value",
        "sec-fetch-site": "same-origin"
      },
      method: "POST",
      url: "/mutation"
    });

    expect(rejected.statusCode).toBe(403);
    expect(sameOrigin.statusCode).toBe(200);
    await app.close();
  });
});
