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
});
