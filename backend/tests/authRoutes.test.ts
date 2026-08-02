import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
});

describe("auth route member return paths", () => {
  it("passes canonical return paths from signup and verification resend to email issuance", async () => {
    const user = {
      email: "ada@example.com",
      emailVerifiedAt: null,
      id: "user_123",
      name: "Ada Lovelace",
      role: "USER"
    };
    const team = {
      id: "team_123",
      name: "Ada's Team",
      slug: "ada-team"
    };
    const createUserWithTeam = vi.fn(async () => ({ team, user }));
    const issueEmailVerification = vi.fn(async () => ({ alreadyVerified: false }));
    const requestEmailVerification = vi.fn(async () => ({ ok: true }));

    vi.doMock("../src/db.js", () => ({
      prisma: {
        user: {
          findUnique: vi.fn()
        }
      },
      withPreAuthEmailSession: vi.fn(async (database, context, operation) => operation(database, {
        email: context.email,
        userId: user.id
      })),
      withPersonalSession: vi.fn(),
      withTenantSession: vi.fn()
    }));
    vi.doMock("../src/auth.js", () => ({
      clearAuthCookie: vi.fn(),
      requireAdmin: vi.fn(),
      requireAuth: vi.fn(),
      setAuthCookie: vi.fn(),
      setPrivateNoStoreHeaders: vi.fn(),
      signAuthToken: vi.fn(() => "signed-token")
    }));
    vi.doMock("../src/services/users.js", () => ({
      createUserWithTeam,
      normalizeUserRole: vi.fn(() => "USER"),
      publicUser: vi.fn((value) => value)
    }));
    vi.doMock("../src/services/authRecovery.js", () => ({
      confirmEmailVerification: vi.fn(),
      confirmPasswordReset: vi.fn(),
      issueEmailVerification,
      requestEmailVerification,
      requestPasswordReset: vi.fn()
    }));

    type RouteHandler = (
      request: { body: unknown; id: string },
      reply: {
        code: (statusCode: number) => unknown;
        send: (payload: unknown) => unknown;
      }
    ) => Promise<unknown>;

    const handlers = new Map<string, RouteHandler>();
    const app = {
      addHook: vi.fn(),
      get: vi.fn(),
      post: vi.fn((path: string, _options: unknown, handler: RouteHandler) => {
        handlers.set(path, handler);
      })
    };
    const reply = {
      code: vi.fn(() => reply),
      send: vi.fn((payload: unknown) => payload)
    };

    const { authRoutes } = await import("../src/routes/auth.js");
    await authRoutes(app as never);

    await handlers.get("/signup")?.({
      body: {
        email: user.email,
        name: user.name,
        next: "/member/graph?focus=agent_123",
        password: "a-secure-password"
      },
      id: "signup_request"
    }, reply);

    expect(createUserWithTeam).toHaveBeenCalledWith({
      email: user.email,
      name: user.name,
      password: "a-secure-password"
    });
    expect(issueEmailVerification).toHaveBeenCalledWith(user, {
      flow: "member",
      next: "/member/graph?focus=agent_123",
      requestId: "signup_request"
    });

    await handlers.get("/email-verification/request")?.({
      body: {
        email: user.email,
        flow: "member",
        next: "/member/infrastructure?section=agents"
      },
      id: "resend_request"
    }, reply);

    expect(requestEmailVerification).toHaveBeenCalledWith(user.email, {
      flow: "member",
      next: "/member/infrastructure?section=agents",
      requestId: "resend_request"
    });
  });

  it("keeps the login JWT in the HttpOnly cookie instead of the JSON response", async () => {
    const user = {
      email: "verified@example.com",
      emailVerifiedAt: new Date("2026-07-25T12:00:00.000Z"),
      id: "user_verified",
      internalAccess: false,
      name: "Verified Member",
      passwordHash: "stored-password-hash",
      role: "USER"
    };
    const publicMember = {
      email: user.email,
      emailVerified: true,
      id: user.id,
      name: user.name,
      role: user.role
    };
    const setAuthCookie = vi.fn();
    const signAuthToken = vi.fn(() => "signed-token");

    vi.doMock("bcryptjs", () => ({
      default: {
        compare: vi.fn(async () => true)
      }
    }));
    const tenantId = "523e4567-e89b-42d3-a456-426614174000";
    const organizationId = "423e4567-e89b-42d3-a456-426614174000";
    const membership = { organizationId, role: "OWNER", teamId: "team_123", tenantId };
    const transaction = {
      team: {
        findUnique: vi.fn(async () => ({
          id: membership.teamId,
          memberAccessEnabled: true,
          name: "Ada's Team",
          organizationId,
          slug: "ada-team",
          tenantId
        }))
      },
      teamMember: { findMany: vi.fn(async () => [membership]) }
    };
    vi.doMock("../src/db.js", () => ({
      prisma: {
        user: {
          findUnique: vi.fn(async () => user)
        }
      },
      withPreAuthEmailSession: vi.fn(async (database, context, operation) => operation(database, {
        email: context.email,
        userId: user.id
      })),
      withPersonalSession: vi.fn(async (_database, _context, operation) => operation(transaction, {
        actorId: "323e4567-e89b-42d3-a456-426614174000",
        appUserId: user.id,
        authSubject: user.id
      })),
      withTenantSession: vi.fn(async (_database, context, operation) => operation(transaction, {
        actorId: "323e4567-e89b-42d3-a456-426614174000",
        appUserId: user.id,
        organizationId,
        role: "OWNER",
        tenantId: context.tenantId
      }))
    }));
    vi.doMock("../src/auth.js", () => ({
      clearAuthCookie: vi.fn(),
      requireAdmin: vi.fn(),
      requireAuth: vi.fn(),
      setAuthCookie,
      setPrivateNoStoreHeaders: vi.fn(),
      signAuthToken
    }));
    vi.doMock("../src/services/users.js", () => ({
      createUserWithTeam: vi.fn(),
      normalizeUserRole: vi.fn(() => "USER"),
      publicUser: vi.fn(() => publicMember)
    }));
    vi.doMock("../src/services/authRecovery.js", () => ({
      confirmEmailVerification: vi.fn(),
      confirmPasswordReset: vi.fn(),
      issueEmailVerification: vi.fn(),
      requestEmailVerification: vi.fn(),
      requestPasswordReset: vi.fn()
    }));

    type RouteHandler = (
      request: { body: unknown; id: string },
      reply: {
        code: (statusCode: number) => unknown;
        send: (payload: unknown) => unknown;
      }
    ) => Promise<unknown>;

    const handlers = new Map<string, RouteHandler>();
    const app = {
      addHook: vi.fn(),
      get: vi.fn(),
      post: vi.fn((path: string, _options: unknown, handler: RouteHandler) => {
        handlers.set(path, handler);
      })
    };
    const reply = {
      code: vi.fn(() => reply),
      send: vi.fn((payload: unknown) => payload)
    };

    const { authRoutes } = await import("../src/routes/auth.js");
    await authRoutes(app as never);
    await handlers.get("/login")?.({
      body: {
        email: user.email,
        flow: "member",
        password: "a-secure-password"
      },
      id: "login_request"
    }, reply);

    expect(signAuthToken).toHaveBeenCalledWith({
      email: user.email,
      role: "USER",
      session: "member",
      sub: user.id
    });
    expect(setAuthCookie).toHaveBeenCalledWith(reply, "signed-token");
    expect(reply.send).toHaveBeenCalledWith({ user: publicMember });
    expect(reply.send).not.toHaveBeenCalledWith(expect.objectContaining({ token: expect.anything() }));
  });
});
