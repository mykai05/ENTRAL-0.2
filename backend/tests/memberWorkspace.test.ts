import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.DATA_ENCRYPTION_KEY = "member-workspace-unit-test-key";
});

const safeSnapshot = {
  businessHealth: { score: 82, status: "stable" as const, summary: "Delivery is steady." },
  findingsAndRecommendations: [],
  monthlyOperatingSummary: null,
  objectivesAndPriorities: []
};

describe("member workspace DTO boundary", () => {
  it("round-trips only the typed member-facing snapshot", async () => {
    const { parseMemberWorkspace, serializeMemberWorkspace } = await import("../src/services/memberWorkspace.js");
    const stored = serializeMemberWorkspace(safeSnapshot);
    expect(JSON.parse(stored)).toMatchObject({ __entralEncrypted: true, alg: "aes-256-gcm", v: 1 });
    expect(parseMemberWorkspace(stored)).toEqual(safeSnapshot);
  });

  it("fails closed for production publication without encryption", async () => {
    const { assertMemberWorkspacePublicationReady } = await import("../src/services/memberWorkspace.js");
    expect(() => assertMemberWorkspacePublicationReady("production", false)).toThrow(
      "DATA_ENCRYPTION_KEY is required to publish member workspace data in production."
    );
  });

  it("rejects internal fields instead of silently publishing them", async () => {
    const { memberWorkspaceSnapshotSchema } = await import("../src/services/memberWorkspace.js");
    expect(memberWorkspaceSnapshotSchema.safeParse({
      ...safeSnapshot,
      internalPrompt: "do not publish"
    }).success).toBe(false);
    expect(memberWorkspaceSnapshotSchema.safeParse({
      ...safeSnapshot,
      businessHealth: { ...safeSnapshot.businessHealth, internalDiagnostic: "do not publish" }
    }).success).toBe(false);
  });

  it("accepts a sanitized multi-business command hierarchy", async () => {
    const { memberWorkspaceSnapshotSchema } = await import("../src/services/memberWorkspace.js");
    const result = memberWorkspaceSnapshotSchema.safeParse({
      ...safeSnapshot,
      commandHierarchy: {
        nodes: [
          { id: "entral", name: "ENTRAL", parentId: null, rank: "emperor", status: "thinking" },
          { id: "operations", name: "Operations Marshal", parentId: "entral", rank: "marshal", status: "working" },
          { id: "company-a", name: "Company A General", parentId: "operations", rank: "general", status: "working" },
          { id: "company-b", name: "Company B General", parentId: "operations", rank: "general", status: "idle" },
          { id: "delivery", name: "Delivery Commander", parentId: "company-a", rank: "commander", status: "idle" },
          { id: "worker", name: "Delivery Soldier", parentId: "delivery", rank: "soldier", status: "idle" }
        ]
      }
    });

    expect(result.success).toBe(true);
  });

  it("rejects malformed hierarchy links and internal command data", async () => {
    const { memberWorkspaceSnapshotSchema } = await import("../src/services/memberWorkspace.js");
    const invalidParent = memberWorkspaceSnapshotSchema.safeParse({
      ...safeSnapshot,
      commandHierarchy: { nodes: [
        { id: "entral", name: "ENTRAL", parentId: null, rank: "emperor", status: "thinking" },
        { id: "soldier", name: "Orphan Soldier", parentId: "entral", rank: "soldier", status: "idle" }
      ] }
    });
    const internalData = memberWorkspaceSnapshotSchema.safeParse({
      ...safeSnapshot,
      commandHierarchy: { nodes: [{
        id: "entral",
        internalPrompt: "must remain private",
        logs: ["must remain private"],
        name: "ENTRAL",
        parentId: null,
        rank: "emperor",
        status: "thinking"
      }] }
    });

    expect(invalidParent.success).toBe(false);
    expect(internalData.success).toBe(false);
  });
});
