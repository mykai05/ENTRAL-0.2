import { describe, expect, it, vi } from "vitest";
import { assertPhase202WorkerAuthority } from "../src/services/phase202WorkerAuthority.js";

function database(result: unknown[] | Error) {
  return {
    $queryRaw: result instanceof Error
      ? vi.fn().mockRejectedValue(result)
      : vi.fn().mockResolvedValue(result)
  };
}

describe("Phase 202 worker authority startup probe", () => {
  it("fails closed before querying when the service identity is absent", async () => {
    const db = database([{ ready: true }]);

    await expect(assertPhase202WorkerAuthority({
      database: db,
      serviceAppUserId: "   "
    })).rejects.toThrow(
      "Worker authority startup probe requires CANONICAL_OUTBOX_SERVICE_APP_USER_ID."
    );

    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it.each([
    ["false", [{ ready: false }]],
    ["empty", []],
    ["null", [{ ready: null }]],
    ["non-singleton", [{ ready: true }, { ready: true }]]
  ])("fails closed for a %s readiness result", async (_case, result) => {
    const db = database(result);

    await expect(assertPhase202WorkerAuthority({
      database: db,
      serviceAppUserId: "123e4567-e89b-42d3-a456-426614174301"
    })).rejects.toThrow(
      "Worker authority startup probe denied the configured service identity."
    );
  });

  it("reports a truthful sanitized error when the database probe fails", async () => {
    const sentinel = "postgres-internal-host.example:5432 secret detail";
    const db = database(new Error(sentinel));

    let error: unknown;
    try {
      await assertPhase202WorkerAuthority({
        database: db,
        serviceAppUserId: "123e4567-e89b-42d3-a456-426614174301"
      });
    } catch (candidate) {
      error = candidate;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      "Worker authority startup probe could not query the worker authority boundary."
    );
    expect(JSON.stringify(error)).not.toContain(sentinel);
    expect((error as Error)).not.toHaveProperty("cause");
  });

  it("passes only when the database returns exactly one true result", async () => {
    const db = database([{ ready: true }]);

    await expect(assertPhase202WorkerAuthority({
      database: db,
      serviceAppUserId: "123e4567-e89b-42d3-a456-426614174301"
    })).resolves.toBeUndefined();

    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    const query = db.$queryRaw.mock.calls[0]![0].join(" ");
    expect(query).toContain("entral.phase202_worker_runtime_ready()");
  });
});
