import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  teamMemberFindMany: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("../src/db.js", () => ({
  prisma: {
    $transaction: mocks.transaction,
    teamMember: {
      findMany: mocks.teamMemberFindMany
    },
    user: {
      findUnique: mocks.findUnique
    }
  }
}));

function setTestEnv() {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.APP_PUBLIC_URL = "http://localhost:3000";
  process.env.AUTH_EMAIL_PROVIDER = "console";
  delete process.env.DATA_ENCRYPTION_KEY;
}

function fakeUserExportRecord() {
  const createdAt = new Date("2026-06-01T00:00:00.000Z");

  return {
    id: "user-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    passwordHash: "hashed-password",
    role: "USER",
    emailVerifiedAt: createdAt,
    lastDashboardSeenAt: null,
    createdAt,
    updatedAt: createdAt,
    aiUsageEvents: [],
    agents: [],
    auditLogs: [],
    automationJobs: [],
    commandReports: [],
    commandSnapshot: null,
    conversations: [
      {
        id: "conversation-1",
        title: "Planning",
        userId: "user-1",
        createdAt,
        updatedAt: createdAt,
        messages: [
          {
            id: "message-1",
            conversationId: "conversation-1",
            role: "user",
            content: "Prepare a plan.",
            createdAt
          }
        ]
      }
    ],
    growthApprovalPackets: [
      {
        id: "growth-approval-1",
        userId: "user-1",
        storeId: "store-1",
        status: "pending",
        mode: "Mock Mode",
        packetJson: JSON.stringify({
          businessName: "Iron House Gym",
          costGuardrail: "External ad spend is $0.",
          humanApprovalRequired: true
        }),
        scheduledFor: null,
        requestAuditLogId: "audit-1",
        reviewAuditLogId: null,
        reviewedAt: null,
        reviewedById: null,
        reviewNote: null,
        createdAt,
        updatedAt: createdAt
      }
    ],
    memberships: [
      {
        userId: "user-1",
        teamId: "team-1",
        role: "OWNER",
        joinedAt: createdAt,
        team: {
          id: "team-1",
          name: "Ada's Team",
          slug: "ada-team",
          createdAt,
          updatedAt: createdAt
        }
      }
    ],
    merchStores: [],
    policiesCreated: [],
    tasksAssigned: [],
    tasksCreated: [
      {
        id: "task-1",
        title: "Review privacy export",
        description: null,
        status: "TODO",
        dueDate: null,
        createdAt,
        updatedAt: createdAt,
        teamId: "team-1",
        createdById: "user-1",
        assignedToId: null,
        team: {
          id: "team-1",
          name: "Ada's Team",
          slug: "ada-team",
          createdAt,
          updatedAt: createdAt
        }
      }
    ]
  };
}

beforeEach(() => {
  vi.resetModules();
  mocks.findUnique.mockReset();
  mocks.teamMemberFindMany.mockReset();
  mocks.transaction.mockReset();
  setTestEnv();
});

describe("privacy export and account deletion", () => {
  it("exports account data without password or recovery token material", async () => {
    mocks.findUnique.mockResolvedValueOnce(fakeUserExportRecord());
    const { buildAccountExport } = await import("../src/services/privacy.js");

    const exportData = await buildAccountExport("user-1");
    const serialized = JSON.stringify(exportData);

    expect(exportData.summary).toMatchObject({
      conversations: 1,
      messages: 1,
      growthApprovalPackets: 1,
      tasksCreated: 1,
      teams: 1
    });
    expect(exportData.growthApprovalPackets[0].packet).toMatchObject({
      businessName: "Iron House Gym",
      humanApprovalRequired: true
    });
    expect(exportData.mode).toMatchObject({
      accountData: "real",
      externalProvidersContacted: false
    });
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain("hashed-password");
    expect(serialized).not.toContain("tokenHash");
  });

  it("deletes private teams, user-created tasks, and the user in a controlled transaction", async () => {
    const tx = {
      auditLog: { updateMany: vi.fn() },
      policy: { updateMany: vi.fn() },
      task: { deleteMany: vi.fn() },
      team: { deleteMany: vi.fn() },
      user: { delete: vi.fn() }
    };
    mocks.teamMemberFindMany.mockResolvedValueOnce([
      {
        teamId: "team-1",
        team: {
          _count: {
            members: 1
          }
        }
      }
    ]);
    mocks.transaction.mockImplementationOnce(async (callback) => callback(tx));
    const { deleteAccountAndWorkspace } = await import("../src/services/privacy.js");

    await deleteAccountAndWorkspace("user-1");

    expect(tx.team.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["team-1"] } } });
    expect(tx.task.deleteMany).toHaveBeenCalledWith({ where: { createdById: "user-1" } });
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } });
  });
});
