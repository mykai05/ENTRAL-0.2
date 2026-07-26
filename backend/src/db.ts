import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "error" },
    { emit: "event", level: "warn" }
  ]
});

export type CanonicalSessionContext =
  | {
      actionReason: string;
      authSubject: string;
      correlationId?: string;
      governanceActionId?: string;
      serviceAppUserId?: never;
    }
  | {
      actionReason: string;
      authSubject?: never;
      correlationId?: string;
      governanceActionId?: string;
      serviceAppUserId: string;
    };

export async function withCanonicalSession<T>(
  database: PrismaClient,
  context: CanonicalSessionContext,
  operation: (transaction: Prisma.TransactionClient, appUserId: string) => Promise<T>
): Promise<T> {
  return database.$transaction(async (transaction) => {
    const correlationId = context.correlationId ?? randomUUID();
    await transaction.$queryRaw`
      SELECT
        set_config('app.action_reason', ${context.actionReason}, true),
        set_config('app.correlation_id', ${correlationId}, true),
        set_config('app.governance_action_id', ${context.governanceActionId ?? ""}, true)
    `;

    const identityRows = "authSubject" in context
      ? await transaction.$queryRaw<{ appUserId: string }[]>`
          SELECT entral.bind_authenticated_app_user(${context.authSubject}) AS "appUserId"
        `
      : await transaction.$queryRaw<{ appUserId: string }[]>`
          SELECT entral.bind_service_app_user(${context.serviceAppUserId}::uuid) AS "appUserId"
        `;
    const appUserId = identityRows[0]?.appUserId;
    if (!appUserId) {
      throw new Error("Canonical database session identity could not be established.");
    }

    return operation(transaction, appUserId);
  });
}
