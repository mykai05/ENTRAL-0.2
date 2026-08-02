import cookie from "@fastify/cookie";
import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  compare: vi.fn(async () => true),
  confirmEmailVerification: vi.fn(),
  confirmPasswordReset: vi.fn(),
  teamFindUnique: vi.fn(),
  teamMemberFindMany: vi.fn(),
  userFindUnique: vi.fn()
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.compare
  }
}));

vi.mock("../src/db.js", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique }
  },
  withPreAuthEmailSession: vi.fn(async (database, context, operation) => operation(database, {
    email: context.email,
    userId: "member-1"
  })),
  withPersonalSession: vi.fn(async (_database, _context, operation) => operation({
    teamMember: { findMany: mocks.teamMemberFindMany }
  }, {
    actorId: "323e4567-e89b-42d3-a456-426614174000",
    appUserId: "member-1",
    authSubject: "member-1"
  })),
  withTenantSession: vi.fn(async (_database, context, operation) => operation({
    team: { findUnique: mocks.teamFindUnique }
  }, {
    actorId: "323e4567-e89b-42d3-a456-426614174000",
    appUserId: "member-1",
    organizationId: "423e4567-e89b-42d3-a456-426614174000",
    role: "OWNER",
    tenantId: context.tenantId
  }))
}));

vi.mock("../src/services/authRecovery.js", () => ({
  confirmEmailVerification: mocks.confirmEmailVerification,
  confirmPasswordReset: mocks.confirmPasswordReset,
  issueEmailVerification: vi.fn(),
  requestEmailVerification: vi.fn(),
  requestPasswordReset: vi.fn()
}));

const memberUser = {
  email: "member@example.com",
  emailVerifiedAt: new Date("2026-07-01T00:00:00.000Z"),
  id: "member-1",
  internalAccess: false,
  name: "Member User",
  passwordHash: "stored-password-hash",
  role: "USER"
};
const memberTenantId = "523e4567-e89b-42d3-a456-426614174000";
const memberOrganizationId = "423e4567-e89b-42d3-a456-426614174000";
const memberTeamId = "team-member-1";

async function buildAuthServer() {
  const [{ authRoutes }, { enforceSessionBoundary }] = await Promise.all([
    import("../src/routes/auth.js"),
    import("../src/auth.js")
  ]);
  const app = Fastify();
  await app.register(cookie);
  app.addHook("preValidation", enforceSessionBoundary);
  await app.register(authRoutes, { prefix: "/api/v1" });
  app.get("/api/v1/tasks", async () => ({ unsafe: true }));
  return app;
}

function responseToken(response: { headers: Record<string, string | string[] | undefined> }) {
  const setCookie = String(response.headers["set-cookie"] ?? "");
  return setCookie.match(/entral_token=([^;]+)/)?.[1] ?? "";
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/entral_test";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.APP_PUBLIC_URL = "http://localhost:3000";
  mocks.compare.mockResolvedValue(true);
  mocks.teamMemberFindMany.mockResolvedValue([{
    organizationId: memberOrganizationId,
    role: "OWNER",
    teamId: memberTeamId,
    tenantId: memberTenantId
  }]);
  mocks.teamFindUnique.mockResolvedValue({
    id: memberTeamId,
    memberAccessEnabled: true,
    name: "Member Team",
    organizationId: memberOrganizationId,
    slug: "member-team",
    tenantId: memberTenantId
  });
  mocks.userFindUnique.mockResolvedValue(memberUser);
  mocks.confirmEmailVerification.mockResolvedValue({ flow: "member", ok: true, user: memberUser });
  mocks.confirmPasswordReset.mockResolvedValue({ flow: "member", ok: true, user: memberUser });
});

describe("member authentication issuance", () => {
  it("issues a restricted member session from member login and blocks internal APIs", async () => {
    const app = await buildAuthServer();
    const response = await app.inject({
      method: "POST",
      payload: { email: memberUser.email, flow: "member", password: "correct-password" },
      url: "/api/v1/login"
    });
    const { verifyAuthToken } = await import("../src/auth.js");

    expect(response.statusCode).toBe(200);
    const token = responseToken(response);
    expect(verifyAuthToken(token).session).toBe("member");
    const internalApi = await app.inject({ headers: { authorization: `Bearer ${token}` }, method: "GET", url: "/api/v1/tasks" });
    expect(internalApi.statusCode).toBe(403);
    await app.close();
  });

  it("issues a restricted member session from a member-bound verification token", async () => {
    const app = await buildAuthServer();
    const response = await app.inject({
      method: "POST",
      payload: { token: "member-verification-token-that-is-long-enough-123" },
      url: "/api/v1/email-verification/confirm"
    });
    const { verifyAuthToken } = await import("../src/auth.js");

    expect(response.statusCode).toBe(200);
    const token = responseToken(response);
    expect(verifyAuthToken(token).session).toBe("member");
    const internalApi = await app.inject({ headers: { authorization: `Bearer ${token}` }, method: "GET", url: "/api/v1/tasks" });
    expect(internalApi.statusCode).toBe(403);
    await app.close();
  });

  it("issues a restricted member session from a member-bound password reset token", async () => {
    const app = await buildAuthServer();
    const response = await app.inject({
      method: "POST",
      payload: {
        password: "new-secure-password",
        token: "member-password-reset-token-that-is-long-enough-123"
      },
      url: "/api/v1/password-reset/confirm"
    });
    const { verifyAuthToken } = await import("../src/auth.js");

    expect(response.statusCode).toBe(200);
    const token = responseToken(response);
    expect(verifyAuthToken(token).session).toBe("member");
    const internalApi = await app.inject({ headers: { authorization: `Bearer ${token}` }, method: "GET", url: "/api/v1/tasks" });
    expect(internalApi.statusCode).toBe(403);
    await app.close();
  });

  it("does not allow a member-only account to mint an internal session", async () => {
    const app = await buildAuthServer();
    const response = await app.inject({
      method: "POST",
      payload: { email: memberUser.email, password: "correct-password" },
      url: "/api/v1/login"
    });

    expect(response.statusCode).toBe(403);
    expect(response.headers["set-cookie"]).toBeUndefined();
    await app.close();
  });

  it("does not issue a member session without an explicitly provisioned organization", async () => {
    mocks.teamMemberFindMany.mockResolvedValueOnce([]);
    const app = await buildAuthServer();
    const response = await app.inject({
      method: "POST",
      payload: { email: memberUser.email, flow: "member", password: "correct-password" },
      url: "/api/v1/login"
    });

    expect(response.statusCode).toBe(403);
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(mocks.teamMemberFindMany).toHaveBeenCalledWith({
      where: {
        status: "ACTIVE",
        userId: memberUser.id
      },
      select: { organizationId: true, role: true, teamId: true, tenantId: true }
    });
    await app.close();
  });

  it("does not issue a recovery session after verification when provisioning is absent", async () => {
    mocks.teamMemberFindMany.mockResolvedValueOnce([]);
    const app = await buildAuthServer();
    const response = await app.inject({
      method: "POST",
      payload: { token: "member-verification-token-that-is-long-enough-123" },
      url: "/api/v1/email-verification/confirm"
    });

    expect(response.statusCode).toBe(200);
    expect(String(response.headers["set-cookie"])).toContain("entral_token=;");
    expect(response.json()).toMatchObject({
      message: "Email verified. Member access has not been provisioned for this account."
    });
    await app.close();
  });

  it("does not allow public self-service organization creation", async () => {
    const app = await buildAuthServer();
    const response = await app.inject({
      method: "POST",
      payload: { email: "new@example.com", name: "New Member", password: "secure-password" },
      url: "/api/v1/signup"
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });
});
