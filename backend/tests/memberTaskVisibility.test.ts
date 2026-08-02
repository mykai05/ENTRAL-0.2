import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recordAuditLog: vi.fn(),
  queryRaw: vi.fn(),
  requireAdmin: vi.fn(async (request: { user?: { email: string; role: string; sub: string } }) => {
    request.user = { email: "admin@example.com", role: "ADMIN", sub: "admin-1" };
  }),
  memberWorkspaceCreate: vi.fn(),
  memberWorkspaceFindUnique: vi.fn(),
  memberWorkspaceUpdate: vi.fn(),
  taskFindUnique: vi.fn(),
  taskUpdate: vi.fn(),
  teamMemberCount: vi.fn(),
  teamMemberCreate: vi.fn(),
  teamMemberFindUnique: vi.fn(),
  teamFindUnique: vi.fn(),
  teamUpdate: vi.fn(),
  transaction: vi.fn(),
  userFindUnique: vi.fn()
}));

vi.mock("../src/auth.js", () => ({
  requireAdmin: mocks.requireAdmin,
  setPrivateNoStoreHeaders: (reply: { header: (name: string, value: string) => unknown }) => {
    reply.header("cache-control", "private, no-store");
    reply.header("vary", "Origin, Cookie, Authorization");
  }
}));

vi.mock("../src/db.js", () => ({
  prisma: {
    $transaction: mocks.transaction,
    memberWorkspaceSnapshot: {
      create: mocks.memberWorkspaceCreate,
      findUnique: mocks.memberWorkspaceFindUnique,
      update: mocks.memberWorkspaceUpdate
    },
    task: {
      findUnique: mocks.taskFindUnique,
      update: mocks.taskUpdate
    },
    team: {
      findUnique: mocks.teamFindUnique,
      update: mocks.teamUpdate
    },
    teamMember: {
      count: mocks.teamMemberCount,
      create: mocks.teamMemberCreate,
      findUnique: mocks.teamMemberFindUnique
    },
    user: {
      findUnique: mocks.userFindUnique
    }
  }
}));

vi.mock("../src/services/audit.js", () => ({
  recordAuditLog: mocks.recordAuditLog
}));

const taskId = "ck1234567890123456789012";
const teamId = "ck9876543210987654321098";
const memberUserId = "ck1111111111111111111111";
const memberWorkspace = {
  businessHealth: { score: 82, status: "stable" as const, summary: "Delivery and capacity are steady." },
  findingsAndRecommendations: [{
    detail: "Hand-offs vary between teams.",
    id: "finding-1",
    recommendation: "Standardize the weekly hand-off review.",
    severity: "opportunity" as const,
    title: "Standardize hand-offs"
  }],
  monthlyOperatingSummary: {
    accomplishments: ["Completed the dispatch map"],
    headline: "Operations are becoming more predictable",
    nextPriorities: ["Publish the weekly capacity view"],
    period: "2026-07",
    summary: "The organization reduced ambiguity in its core operating hand-offs."
  },
  objectivesAndPriorities: [{
    id: "objective-1",
    priority: "high" as const,
    progress: 65,
    status: "active" as const,
    title: "Improve scheduling visibility"
  }]
};

async function buildTestServer() {
  const { memberTaskVisibilityRoutes } = await import("../src/routes/memberTaskVisibility.js");
  const app = Fastify();
  await app.register(memberTaskVisibilityRoutes, { prefix: "/api/v1" });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queryRaw.mockImplementation(async (query: unknown) => (
    Array.isArray(query) && query.join(" ").includes("phase202_membership_target_exists")
      ? [{ targetExists: true }]
      : []
  ));
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.APP_PUBLIC_URL = "http://localhost:3000";
  process.env.DATA_ENCRYPTION_KEY = "member-workspace-test-encryption-key";
  mocks.transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) => callback({
    $queryRaw: mocks.queryRaw,
    memberWorkspaceSnapshot: {
      create: mocks.memberWorkspaceCreate,
      findUnique: mocks.memberWorkspaceFindUnique,
      update: mocks.memberWorkspaceUpdate
    },
    task: {
      findUnique: mocks.taskFindUnique,
      update: mocks.taskUpdate
    },
    team: {
      findUnique: mocks.teamFindUnique,
      update: mocks.teamUpdate
    },
    teamMember: {
      count: mocks.teamMemberCount,
      create: mocks.teamMemberCreate,
      findUnique: mocks.teamMemberFindUnique
    },
    user: {
      findUnique: mocks.userFindUnique
    }
  }));
});

describe("member organization provisioning", () => {
  it("atomically enables member access through the internal admin boundary", async () => {
    mocks.teamFindUnique.mockResolvedValueOnce({ id: teamId, memberAccessEnabled: false, memberSeatLimit: 5 });
    mocks.teamUpdate.mockResolvedValueOnce({ id: teamId, memberAccessEnabled: true, memberSeatLimit: 5 });
    mocks.teamMemberCount.mockResolvedValueOnce(3);
    mocks.recordAuditLog.mockResolvedValueOnce(undefined);
    const app = await buildTestServer();
    const response = await app.inject({
      method: "PATCH",
      payload: { enabled: true },
      url: `/api/v1/admin/organizations/${teamId}/member-access`
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.teamUpdate).toHaveBeenLastCalledWith({
      where: { id: teamId },
      data: { memberAccessEnabled: true },
      select: { id: true, memberAccessEnabled: true, memberSeatLimit: true }
    });
    expect(mocks.recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "organization.member_access.updated",
      actorUserId: "admin-1",
      metadata: {
        memberAccessEnabled: true,
        memberCount: 3,
        memberSeatLimit: 5,
        previousMemberAccessEnabled: false
      },
      targetId: teamId,
      targetType: "team"
    }), expect.objectContaining({ team: expect.any(Object) }));
    expect(response.json()).toEqual({
      changed: true,
      memberCount: 3,
      organization: { id: teamId, memberAccessEnabled: true, memberSeatLimit: 5 }
    });
    await app.close();
  });

  it("rejects enabling a member organization that already exceeds five seats", async () => {
    mocks.teamFindUnique.mockResolvedValueOnce({ id: teamId, memberAccessEnabled: false, memberSeatLimit: 5 });
    mocks.teamMemberCount.mockResolvedValueOnce(6);
    const app = await buildTestServer();
    const response = await app.inject({
      method: "PATCH",
      payload: { enabled: true },
      url: `/api/v1/admin/organizations/${teamId}/member-access`
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ memberCount: 6, memberLimit: 5 });
    expect(mocks.recordAuditLog).not.toHaveBeenCalled();
    expect(mocks.teamUpdate).not.toHaveBeenCalled();
    await app.close();
  });
});

describe("Entral Base seat provisioning", () => {
  it("atomically provisions an existing user when a seat is available", async () => {
    const joinedAt = new Date("2026-07-18T00:00:00.000Z");
    mocks.teamFindUnique.mockResolvedValueOnce({ id: teamId, memberAccessEnabled: true, memberSeatLimit: 5 });
    mocks.teamMemberFindUnique.mockResolvedValueOnce(null);
    mocks.teamMemberCount.mockResolvedValueOnce(4);
    mocks.teamMemberCreate.mockResolvedValueOnce({ joinedAt, role: "MEMBER", teamId, userId: memberUserId });
    const app = await buildTestServer();
    const response = await app.inject({
      method: "POST",
      payload: { role: "MEMBER", userId: memberUserId },
      url: `/api/v1/admin/organizations/${teamId}/members`
    });

    expect(response.statusCode).toBe(201);
    expect(mocks.teamMemberCreate).toHaveBeenCalledWith({
      data: { role: "MEMBER", teamId, userId: memberUserId },
      select: { joinedAt: true, role: true, teamId: true, userId: true }
    });
    expect(mocks.recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "organization.member_seat.provisioned",
      metadata: expect.objectContaining({ memberCount: 5, memberSeatLimit: 5, teamId }),
      targetId: memberUserId
    }), expect.objectContaining({ teamMember: expect.any(Object) }));
    expect(mocks.transaction.mock.calls[0]?.[1]).toEqual({ isolationLevel: "Serializable" });
    await app.close();
  });

  it("rejects the sixth seat before user lookup, membership mutation, or audit", async () => {
    mocks.teamFindUnique.mockResolvedValueOnce({ id: teamId, memberAccessEnabled: true, memberSeatLimit: 5 });
    mocks.teamMemberFindUnique.mockResolvedValueOnce(null);
    mocks.teamMemberCount.mockResolvedValueOnce(5);
    const app = await buildTestServer();
    const response = await app.inject({
      method: "POST",
      payload: { userId: memberUserId },
      url: `/api/v1/admin/organizations/${teamId}/members`
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ memberCount: 5, memberLimit: 5 });
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(mocks.teamMemberCreate).not.toHaveBeenCalled();
    expect(mocks.recordAuditLog).not.toHaveBeenCalled();
    await app.close();
  });

  it("rolls back seat provisioning if its audit record cannot be stored", async () => {
    let membershipExists = false;
    const transactionClient = {
      $queryRaw: vi.fn(async (query: unknown) => (
        Array.isArray(query) && query.join(" ").includes("phase202_membership_target_exists")
          ? [{ targetExists: true }]
          : []
      )),
      team: {
        findUnique: vi.fn(async () => ({ id: teamId, memberAccessEnabled: true, memberSeatLimit: 5 })),
        update: vi.fn(async () => ({ id: teamId, memberAccessEnabled: true, memberSeatLimit: 5 }))
      },
      teamMember: {
        count: vi.fn(async () => 4),
        create: vi.fn(async () => {
          membershipExists = true;
          return { joinedAt: new Date(), role: "MEMBER", teamId, userId: memberUserId };
        }),
        findUnique: vi.fn(async () => null)
      }
    };
    mocks.transaction.mockImplementationOnce(async (callback: (transaction: typeof transactionClient) => Promise<unknown>) => {
      const before = membershipExists;
      try {
        return await callback(transactionClient);
      } catch (error) {
        membershipExists = before;
        throw error;
      }
    });
    mocks.recordAuditLog.mockRejectedValueOnce(new Error("Audit storage unavailable"));
    const app = await buildTestServer();
    const response = await app.inject({
      method: "POST",
      payload: { userId: memberUserId },
      url: `/api/v1/admin/organizations/${teamId}/members`
    });

    expect(response.statusCode).toBe(500);
    expect(membershipExists).toBe(false);
    await app.close();
  });
});

describe("member workspace publication", () => {
  it("publishes one typed organization snapshot and audit record atomically", async () => {
    const publishedAt = new Date("2026-07-18T01:00:00.000Z");
    mocks.teamFindUnique.mockResolvedValueOnce({ id: teamId });
    mocks.memberWorkspaceFindUnique.mockResolvedValueOnce(null);
    mocks.memberWorkspaceCreate.mockImplementationOnce(async ({ data }: { data: { snapshotJson: string } }) => ({
      id: "workspace-1",
      publishedAt,
      snapshotJson: data.snapshotJson,
      version: 1
    }));
    const app = await buildTestServer();
    const response = await app.inject({
      method: "PUT",
      payload: { expectedVersion: 0, snapshot: memberWorkspace },
      url: `/api/v1/admin/organizations/${teamId}/member-workspace`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      changed: true,
      workspace: { businessHealth: { score: 82 }, version: 1 }
    });
    const createInput = mocks.memberWorkspaceCreate.mock.calls[0]?.[0];
    expect(JSON.parse(createInput.data.snapshotJson)).toMatchObject({
      __entralEncrypted: true,
      alg: "aes-256-gcm",
      v: 1
    });
    const { parseMemberWorkspace } = await import("../src/services/memberWorkspace.js");
    expect(parseMemberWorkspace(createInput.data.snapshotJson)).toEqual(memberWorkspace);
    expect(mocks.recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "organization.member_workspace.published",
      metadata: expect.objectContaining({ findingCount: 1, objectiveCount: 1, teamId, version: 1 }),
      targetId: teamId,
      targetType: "member_workspace"
    }), expect.objectContaining({ memberWorkspaceSnapshot: expect.any(Object) }));
    expect(JSON.stringify(mocks.recordAuditLog.mock.calls[0]?.[0])).not.toContain(memberWorkspace.monthlyOperatingSummary.summary);
    await app.close();
  });

  it("rewrites an identical legacy plaintext snapshot into an encrypted envelope", async () => {
    const publishedAt = new Date("2026-07-18T02:00:00.000Z");
    mocks.teamFindUnique.mockResolvedValueOnce({ id: teamId });
    mocks.memberWorkspaceFindUnique.mockResolvedValueOnce({
      id: "workspace-1",
      publishedAt: new Date("2026-07-17T02:00:00.000Z"),
      snapshotJson: JSON.stringify(memberWorkspace),
      version: 1
    });
    mocks.memberWorkspaceUpdate.mockImplementationOnce(async ({ data }: { data: { snapshotJson: string } }) => ({
      id: "workspace-1",
      publishedAt,
      snapshotJson: data.snapshotJson,
      version: 2
    }));
    const app = await buildTestServer();
    const response = await app.inject({
      method: "PUT",
      payload: { expectedVersion: 1, snapshot: memberWorkspace },
      url: `/api/v1/admin/organizations/${teamId}/member-workspace`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ changed: true, workspace: { version: 2 } });
    const storedJson = mocks.memberWorkspaceUpdate.mock.calls[0]?.[0].data.snapshotJson;
    expect(JSON.parse(storedJson)).toMatchObject({ __entralEncrypted: true, alg: "aes-256-gcm" });
    expect(mocks.recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "organization.member_workspace.reencrypted",
      metadata: expect.objectContaining({ storageReencrypted: true, version: 2 })
    }), expect.any(Object));
    await app.close();
  });

  it("rejects stale snapshot versions without writing or auditing", async () => {
    mocks.teamFindUnique.mockResolvedValueOnce({ id: teamId });
    mocks.memberWorkspaceFindUnique.mockResolvedValueOnce({
      id: "workspace-1",
      publishedAt: new Date(),
      snapshotJson: JSON.stringify(memberWorkspace),
      version: 3
    });
    const app = await buildTestServer();
    const response = await app.inject({
      method: "PUT",
      payload: { expectedVersion: 2, snapshot: memberWorkspace },
      url: `/api/v1/admin/organizations/${teamId}/member-workspace`
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ currentVersion: 3 });
    expect(mocks.memberWorkspaceCreate).not.toHaveBeenCalled();
    expect(mocks.memberWorkspaceUpdate).not.toHaveBeenCalled();
    expect(mocks.recordAuditLog).not.toHaveBeenCalled();
    await app.close();
  });

  it("rolls back a published snapshot if the audit write fails", async () => {
    let storedSnapshot: string | null = null;
    const transactionClient = {
      $queryRaw: vi.fn(async () => []),
      memberWorkspaceSnapshot: {
        create: vi.fn(async ({ data }: { data: { snapshotJson: string } }) => {
          storedSnapshot = data.snapshotJson;
          return { id: "workspace-1", publishedAt: new Date(), snapshotJson: data.snapshotJson, version: 1 };
        }),
        findUnique: vi.fn(async () => null),
        update: vi.fn()
      },
      team: {
        findUnique: vi.fn(async () => ({ id: teamId })),
        update: vi.fn(async () => ({ id: teamId }))
      }
    };
    mocks.transaction.mockImplementationOnce(async (callback: (transaction: typeof transactionClient) => Promise<unknown>) => {
      const before = storedSnapshot;
      try {
        return await callback(transactionClient);
      } catch (error) {
        storedSnapshot = before;
        throw error;
      }
    });
    mocks.recordAuditLog.mockRejectedValueOnce(new Error("Audit storage unavailable"));
    const app = await buildTestServer();
    const response = await app.inject({
      method: "PUT",
      payload: { expectedVersion: 0, snapshot: memberWorkspace },
      url: `/api/v1/admin/organizations/${teamId}/member-workspace`
    });

    expect(response.statusCode).toBe(500);
    expect(storedSnapshot).toBeNull();
    await app.close();
  });
});

describe("member task visibility administration", () => {
  it("publishes a task through the admin-only boundary and records an audit event", async () => {
    mocks.taskFindUnique.mockResolvedValueOnce({ id: taskId, memberVisible: false, teamId });
    mocks.taskUpdate.mockResolvedValueOnce({ id: taskId, memberVisible: true, teamId });
    mocks.recordAuditLog.mockResolvedValueOnce(undefined);
    const app = await buildTestServer();
    const response = await app.inject({
      method: "PATCH",
      payload: { visible: true },
      url: `/api/v1/admin/tasks/${taskId}/member-visibility`
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.taskFindUnique).toHaveBeenCalledWith({
      where: { id: taskId },
      select: { id: true, memberVisible: true, teamId: true }
    });
    expect(mocks.taskUpdate).toHaveBeenCalledWith({
      where: { id: taskId },
      data: { memberVisible: true },
      select: { id: true, memberVisible: true, teamId: true }
    });
    expect(mocks.recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "task.member_visibility.updated",
      actorRole: "ADMIN",
      actorUserId: "admin-1",
      metadata: {
        memberVisible: true,
        previousMemberVisible: false,
        teamId
      },
      targetId: taskId,
      targetType: "task"
    }), expect.objectContaining({ task: expect.any(Object) }));
    expect(response.json()).toEqual({
      changed: true,
      task: { id: taskId, memberVisible: true, teamId }
    });
    await app.close();
  });

  it("is idempotent when the requested visibility is already set", async () => {
    mocks.taskFindUnique.mockResolvedValueOnce({ id: taskId, memberVisible: true, teamId });
    mocks.recordAuditLog.mockResolvedValueOnce(undefined);
    const app = await buildTestServer();
    const response = await app.inject({
      method: "PATCH",
      payload: { visible: true },
      url: `/api/v1/admin/tasks/${taskId}/member-visibility`
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.taskUpdate).not.toHaveBeenCalled();
    expect(mocks.recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "task.member_visibility.confirmed"
    }), expect.objectContaining({ task: expect.any(Object) }));
    expect(response.json()).toEqual({
      changed: false,
      task: { id: taskId, memberVisible: true, teamId }
    });
    await app.close();
  });

  it("does not mutate or audit an unknown task", async () => {
    mocks.taskFindUnique.mockResolvedValueOnce(null);
    const app = await buildTestServer();
    const response = await app.inject({
      method: "PATCH",
      payload: { visible: true },
      url: `/api/v1/admin/tasks/${taskId}/member-visibility`
    });

    expect(response.statusCode).toBe(404);
    expect(mocks.taskUpdate).not.toHaveBeenCalled();
    expect(mocks.recordAuditLog).not.toHaveBeenCalled();
    expect(response.json()).toEqual({ error: "Not Found", message: "Task was not found." });
    await app.close();
  });

  it("rolls back visibility when the atomic audit write fails", async () => {
    let memberVisible = false;
    const transactionClient = {
      task: {
        findUnique: vi.fn(async () => ({ id: taskId, memberVisible, teamId })),
        update: vi.fn(async ({ data }: { data: { memberVisible: boolean } }) => {
          memberVisible = data.memberVisible;
          return { id: taskId, memberVisible, teamId };
        })
      }
    };
    mocks.transaction.mockImplementationOnce(async (callback: (transaction: typeof transactionClient) => Promise<unknown>) => {
      const originalVisibility = memberVisible;
      try {
        return await callback(transactionClient);
      } catch (error) {
        memberVisible = originalVisibility;
        throw error;
      }
    });
    mocks.recordAuditLog.mockRejectedValueOnce(new Error("Audit storage unavailable"));
    const app = await buildTestServer();
    const response = await app.inject({
      method: "PATCH",
      payload: { visible: true },
      url: `/api/v1/admin/tasks/${taskId}/member-visibility`
    });

    expect(response.statusCode).toBe(500);
    expect(mocks.recordAuditLog).toHaveBeenCalledOnce();
    expect(memberVisible).toBe(false);
    await app.close();
  });
});
