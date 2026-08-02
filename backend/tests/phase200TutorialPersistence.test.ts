import { beforeEach, describe, expect, it, vi } from "vitest";

const persistence = vi.hoisted(() => ({
  receipts: new Map<string, Record<string, unknown>>(),
  row: {} as Record<string, unknown>,
  receiptCreate: vi.fn(),
  updateMany: vi.fn()
}));

vi.mock("../src/db.js", () => {
  const progress = {
    findUniqueOrThrow: vi.fn(async () => persistence.row),
    updateMany: persistence.updateMany,
    upsert: vi.fn(async () => persistence.row)
  };
  const receipts = {
    create: persistence.receiptCreate,
    findUnique: vi.fn(async ({ where }: { where: { userId_organizationId_releaseVersion_idempotencyKey: { idempotencyKey: string } } }) => (
      persistence.receipts.get(where.userId_organizationId_releaseVersion_idempotencyKey.idempotencyKey) ?? null
    ))
  };
  const transaction = {
    memberTutorialMutationReceipt: receipts,
    memberTutorialProgress: progress
  };
  return {
    prisma: {
      $transaction: vi.fn(async (run: (client: typeof transaction) => unknown) => run(transaction)),
      memberTutorialProgress: progress
    }
  };
});

import { TutorialProgressConflictError, interactionLayerService } from "../src/services/interactionLayer.js";

const organizationId = "organization-phase-200";
const userId = "user-phase-200";

function makeProgressRow() {
  const now = new Date("2026-08-02T00:00:00.000Z");
  return {
    businessModelContext: null,
    commanderPackContext: null,
    completedAnchorIds: [],
    completedAt: null,
    createdAt: now,
    currentAnchorId: "command-overview",
    firstLaunchSeen: false,
    id: "progress-phase-200",
    mode: "beginner",
    organizationId,
    planContext: null,
    releaseVersion: "phase-200",
    revision: 1,
    roleContext: "MEMBER",
    startedAt: now,
    updatedAt: now,
    userId
  };
}

beforeEach(() => {
  persistence.receipts.clear();
  persistence.row = makeProgressRow();
  persistence.updateMany.mockReset().mockImplementation(async ({ data, where }) => {
    if (where.revision !== persistence.row.revision) return { count: 0 };
    persistence.row = {
      ...persistence.row,
      completedAnchorIds: data.completedAnchorIds ?? [],
      completedAt: data.completedAt ?? null,
      currentAnchorId: data.currentAnchorId ?? null,
      firstLaunchSeen: data.firstLaunchSeen ?? false,
      mode: data.mode ?? "beginner",
      revision: Number(persistence.row.revision) + 1,
      roleContext: data.roleContext,
      startedAt: data.startedAt ?? persistence.row.startedAt,
      updatedAt: new Date("2026-08-02T00:01:00.000Z")
    };
    return { count: 1 };
  });
  persistence.receiptCreate.mockReset().mockImplementation(async ({ data }) => {
    const receipt = {
      ...data,
      createdAt: data.createdAt ?? new Date("2026-08-02T00:01:00.000Z"),
      id: "123e4567-e89b-42d3-a456-426614174000"
    };
    persistence.receipts.set(data.idempotencyKey, receipt);
    return receipt;
  });
});

describe("Phase 200 Tutorial persistence", () => {
  it("returns a durable idempotent replay without applying a duplicate transition", async () => {
    const update = {
      contract_version: "1.0.0" as const,
      completed_anchor_ids: ["command-overview"] as const,
      current_anchor_id: "businesses-overview" as const,
      expected_revision: 1,
      first_launch_seen: true,
      idempotency_key: "phase200:tutorial:update:retry-test",
      mode: "beginner" as const,
      schema_version: 1 as const
    };

    const accepted = await interactionLayerService.updateTutorialProgress({ organizationId, role: "MEMBER", update, userId });
    const replay = await interactionLayerService.updateTutorialProgress({ organizationId, role: "MEMBER", update, userId });

    expect(accepted).toMatchObject({ idempotent_replay: false, progress: { revision: 2 } });
    expect(replay).toMatchObject({
      idempotent_replay: true,
      transition: {
        idempotency_key: update.idempotency_key,
        prior_revision: 1,
        resulting_revision: 2
      }
    });
    expect(persistence.updateMany).toHaveBeenCalledTimes(1);
  });

  it("fails stale independent writes without changing accepted progress", async () => {
    persistence.row = { ...makeProgressRow(), revision: 2 };
    await expect(interactionLayerService.updateTutorialProgress({
      organizationId,
      role: "MEMBER",
      update: {
        contract_version: "1.0.0",
        completed_anchor_ids: [],
        current_anchor_id: null,
        expected_revision: 1,
        first_launch_seen: false,
        idempotency_key: "phase200:tutorial:update:stale-test",
        mode: "beginner",
        schema_version: 1
      },
      userId
    })).rejects.toBeInstanceOf(TutorialProgressConflictError);
    expect(persistence.updateMany).not.toHaveBeenCalled();
  });

  it("resets only the Tutorial fields and returns transactional readback", async () => {
    persistence.row = {
      ...makeProgressRow(),
      completedAnchorIds: ["command-overview"],
      firstLaunchSeen: true,
      revision: 2
    };
    const result = await interactionLayerService.resetTutorialProgress({
      expectedRevision: 2,
      idempotencyKey: "phase200:tutorial:reset:test",
      organizationId,
      role: "MEMBER",
      userId
    });
    expect(result).toMatchObject({
      idempotent_replay: false,
      progress: { completed_anchor_ids: [], first_launch_seen: false, revision: 3 },
      transition: { action: "RESET", prior_revision: 2, resulting_revision: 3 }
    });
  });
});
