import type { PrismaClient } from "@prisma/client";

type WorkerAuthorityDatabase = Pick<PrismaClient, "$queryRaw">;

class WorkerAuthorityProbeError extends Error {}

export async function assertPhase202WorkerAuthority(input: {
  database: WorkerAuthorityDatabase;
  serviceAppUserId?: string;
}): Promise<void> {
  if (!input.serviceAppUserId?.trim()) {
    throw new WorkerAuthorityProbeError(
      "Worker authority startup probe requires CANONICAL_OUTBOX_SERVICE_APP_USER_ID."
    );
  }

  let rows: Array<{ ready: boolean | null }>;
  try {
    rows = await input.database.$queryRaw<Array<{ ready: boolean | null }>>`
      SELECT entral.phase202_worker_runtime_ready() AS "ready"
    `;
  } catch {
    throw new WorkerAuthorityProbeError(
      "Worker authority startup probe could not query the worker authority boundary."
    );
  }

  if (rows.length !== 1 || rows[0]?.ready !== true) {
    throw new WorkerAuthorityProbeError(
      "Worker authority startup probe denied the configured service identity."
    );
  }
}
