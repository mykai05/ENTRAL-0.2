import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  memberWorkspaceFindUnique: vi.fn(),
  taskCount: vi.fn(),
  taskFindMany: vi.fn(),
  teamMemberFindMany: vi.fn(),
  teamMemberFindUnique: vi.fn(),
  userFindUnique: vi.fn()
}));

vi.mock("../src/db.js", () => ({
  prisma: {
    memberWorkspaceSnapshot: {
      findUnique: mocks.memberWorkspaceFindUnique
    },
    task: {
      count: mocks.taskCount,
      findMany: mocks.taskFindMany
    },
    teamMember: {
      findMany: mocks.teamMemberFindMany,
      findUnique: mocks.teamMemberFindUnique
    },
    user: {
      findUnique: mocks.userFindUnique
    }
  }
}));

const organizationId = "ck1234567890123456789012";
const otherOrganizationId = "ck9876543210987654321098";

async function buildMemberTestServer() {
  const [{ memberRoutes }, { signAuthToken }] = await Promise.all([
    import("../src/routes/member.js"),
    import("../src/auth.js")
  ]);
  const app = Fastify();
  await app.register(cookie);
  await app.register(memberRoutes, { prefix: "/api/v1" });

  return {
    app,
    authorization: `Bearer ${signAuthToken({ sub: "user-1", email: "ada@example.com", role: "USER" })}`
  };
}

beforeEach(() => {
  vi.resetModules();
    vi.clearAllMocks();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.APP_PUBLIC_URL = "http://localhost:3000";
});

describe("member organization routes", () => {
  it("requires authentication before listing organizations", async () => {
    const { app } = await buildMemberTestServer();
    const response = await app.inject({ method: "GET", url: "/api/v1/member/organizations" });

    expect(response.statusCode).toBe(401);
    expect(mocks.teamMemberFindMany).not.toHaveBeenCalled();
    await app.close();
  });

  it("returns only the signed-in user's organization memberships", async () => {
    const joinedAt = new Date("2026-07-01T12:00:00.000Z");
    mocks.userFindUnique.mockResolvedValueOnce({ id: "user-1", name: "Ada Lovelace", email: "ada@example.com" });
    mocks.teamMemberFindMany.mockResolvedValueOnce([
      {
        joinedAt,
        role: "OWNER",
        team: { _count: { members: 3 }, id: organizationId, memberAccessEnabled: true, memberSeatLimit: 5, name: "Analytical Works", slug: "analytical-works" }
      }
    ]);
    const { app, authorization } = await buildMemberTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: "/api/v1/member/organizations"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers.vary).toBe("Origin, Cookie, Authorization");
    expect(mocks.teamMemberFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        team: { memberAccessEnabled: true },
        userId: "user-1"
      }
    }));
    expect(response.json()).toMatchObject({
      organizations: [{ id: organizationId, memberCount: 3, memberLimit: 5, role: "OWNER" }],
      user: { email: "ada@example.com", id: "user-1", name: "Ada Lovelace" }
    });
    await app.close();
  });

  it("fails closed to the member role when a stored role is not public", async () => {
    mocks.userFindUnique.mockResolvedValueOnce({ id: "user-1", name: "Ada Lovelace", email: "ada@example.com" });
    mocks.teamMemberFindMany.mockResolvedValueOnce([{
      joinedAt: new Date("2026-07-01T12:00:00.000Z"),
      role: "INTERNAL_SUPERUSER",
      team: { _count: { members: 1 }, id: organizationId, memberAccessEnabled: true, memberSeatLimit: 5, name: "Analytical Works", slug: "analytical-works" }
    }]);
    const { app, authorization } = await buildMemberTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: "/api/v1/member/organizations"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().organizations[0].role).toBe("MEMBER");
    expect(response.body).not.toContain("INTERNAL_SUPERUSER");
    await app.close();
  });

  it("scopes every overview query to the verified organization", async () => {
    mocks.teamMemberFindUnique.mockResolvedValueOnce({
      role: "OWNER",
      team: { _count: { members: 2 }, id: organizationId, memberAccessEnabled: true, memberSeatLimit: 5, name: "Analytical Works", slug: "analytical-works" }
    });
    mocks.taskCount
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    mocks.taskFindMany.mockResolvedValueOnce([
      {
        assignedTo: { id: "user-1", name: "Ada Lovelace" },
        dueDate: null,
        id: "task-1",
        status: "IN_PROGRESS",
        title: "Map the operating workflow",
        updatedAt: new Date("2026-07-10T00:00:00.000Z")
      }
    ]);
    mocks.teamMemberFindMany.mockResolvedValueOnce([
      { joinedAt: new Date("2026-07-01T00:00:00.000Z"), role: "OWNER", user: { id: "user-1", name: "Ada Lovelace" } }
    ]);
    mocks.memberWorkspaceFindUnique.mockResolvedValueOnce({
      publishedAt: new Date("2026-07-18T00:00:00.000Z"),
      snapshotJson: JSON.stringify({
        businessHealth: { score: 78, status: "stable", summary: "Delivery is steady." },
        commandHierarchy: { nodes: [
          { id: "entral", name: "ENTRAL", parentId: null, rank: "emperor", status: "thinking" },
          { id: "operations", name: "Operations Marshal", parentId: "entral", rank: "marshal", status: "working" },
          { id: "company", name: "Analytical Works General", parentId: "operations", rank: "general", status: "working" }
        ] },
        findingsAndRecommendations: [],
        monthlyOperatingSummary: null,
        objectivesAndPriorities: [{ id: "objective-1", priority: "high", progress: 60, status: "active", title: "Improve scheduling" }]
      }),
      version: 2
    });
    const { app, authorization } = await buildMemberTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${organizationId}/overview`
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.teamMemberFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_teamId: { teamId: organizationId, userId: "user-1" } }
    }));
    for (const call of mocks.taskCount.mock.calls) {
      expect(call[0].where.teamId).toBe(organizationId);
      expect(call[0].where.memberVisible).toBe(true);
    }
    expect(mocks.taskFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { memberVisible: true, teamId: organizationId }
    }));
    expect(response.json()).toMatchObject({
      availability: { subscription: { available: false, state: "not_configured" } },
      organization: { id: organizationId, memberLimit: 5, role: "OWNER" },
      taskSummary: { done: 1, inProgress: 2, overdue: 1, todo: 1, total: 4 }
    });
    expect(response.json()).toMatchObject({
      workspace: {
        businessHealth: { score: 78, status: "stable" },
        commandHierarchy: { nodes: expect.arrayContaining([
          expect.objectContaining({ id: "company", rank: "general" })
        ]) },
        objectivesAndPriorities: [{ id: "objective-1", title: "Improve scheduling" }],
        version: 2
      }
    });
    expect(response.body).not.toContain("password");
    expect(response.body).not.toContain("token");
    expect(response.body).not.toContain("agent");
    await app.close();
  });

  it("rejects cross-tenant identifiers before any organization data query", async () => {
    mocks.teamMemberFindUnique.mockResolvedValueOnce(null);
    const { app, authorization } = await buildMemberTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${otherOrganizationId}/overview`
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ message: "Organization not found or unavailable." });
    expect(mocks.taskCount).not.toHaveBeenCalled();
    expect(mocks.taskFindMany).not.toHaveBeenCalled();
    expect(mocks.teamMemberFindMany).not.toHaveBeenCalled();
    expect(mocks.memberWorkspaceFindUnique).not.toHaveBeenCalled();
    await app.close();
  });

  it("rejects a membership whose organization has not been explicitly provisioned", async () => {
    mocks.teamMemberFindUnique.mockResolvedValueOnce({
      role: "OWNER",
      team: {
        _count: { members: 1 },
        id: organizationId,
        memberAccessEnabled: false,
        memberSeatLimit: 5,
        name: "Unprovisioned Organization",
        slug: "unprovisioned"
      }
    });
    const { app, authorization } = await buildMemberTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${organizationId}/overview`
    });

    expect(response.statusCode).toBe(404);
    expect(mocks.taskCount).not.toHaveBeenCalled();
    expect(mocks.taskFindMany).not.toHaveBeenCalled();
    expect(mocks.memberWorkspaceFindUnique).not.toHaveBeenCalled();
    await app.close();
  });
});
