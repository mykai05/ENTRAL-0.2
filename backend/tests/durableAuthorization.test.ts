import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn()
}));

vi.mock("../src/db.js", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique
    }
  }
}));

describe("durable deferred-operation authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures the current internal session version", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      internalAccess: true,
      sessionVersion: 7
    });
    const { currentDurableAuthorization } = await import("../src/services/durableAuthorization.js");

    await expect(currentDurableAuthorization("user-1")).resolves.toEqual({
      authorizationVersion: 7,
      userId: "user-1"
    });
  });

  it("rejects deleted or deprovisioned principals", async () => {
    const { currentDurableAuthorization } = await import("../src/services/durableAuthorization.js");
    mocks.userFindUnique.mockResolvedValueOnce(null);
    await expect(currentDurableAuthorization("deleted-user")).rejects.toThrow("no longer active");

    mocks.userFindUnique.mockResolvedValueOnce({
      id: "user-1",
      internalAccess: false,
      sessionVersion: 8
    });
    await expect(currentDurableAuthorization("user-1")).rejects.toThrow("no longer active");
  });

  it("rejects a deferred operation after the session version changes", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      internalAccess: true,
      sessionVersion: 8
    });
    const { assertDurableAuthorization } = await import("../src/services/durableAuthorization.js");

    await expect(assertDurableAuthorization({
      authorizationVersion: 7,
      userId: "user-1"
    })).rejects.toThrow("stale");
  });
});
