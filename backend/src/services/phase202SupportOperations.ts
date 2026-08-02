import type { PrismaClient } from "@prisma/client";
import { prisma, withSupportSession } from "../db.js";

const taskStatuses = new Set(["TODO", "IN_PROGRESS", "DONE", "ARCHIVED"]);

export class Phase202SupportOperationError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = "Phase202SupportOperationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

type SupportOperationContext = {
  authSubject: string;
  requestId: string;
  supportGrantId: string;
};

function assertScope(scopes: readonly string[], requiredScope: string) {
  if (!scopes.includes(requiredScope)) {
    throw new Phase202SupportOperationError(
      "SUPPORT_SCOPE_DENIED",
      `The exact support grant does not allow ${requiredScope}.`,
      403
    );
  }
}

function projectTask(task: { id: string; status: string; title: string; updatedAt: Date }) {
  return {
    task_id: task.id,
    title: task.title,
    status: task.status,
    updated_at: task.updatedAt.toISOString()
  };
}

export async function listSupportTasks(
  input: SupportOperationContext & { limit: number },
  database: PrismaClient = prisma
) {
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 50) {
    throw new Phase202SupportOperationError("SUPPORT_QUERY_INVALID", "Support task limit must be between 1 and 50.", 400);
  }
  return withSupportSession(database, {
    actionReason: "support.task.read",
    authSubject: input.authSubject,
    requestId: input.requestId,
    supportGrantId: input.supportGrantId
  }, async (transaction, identity) => {
    assertScope(identity.scopes, "table:Task:read");
    const tasks = await transaction.task.findMany({
      where: { organizationId: identity.organizationId, tenantId: identity.tenantId },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: input.limit,
      select: { id: true, status: true, title: true, updatedAt: true }
    });
    return { tasks: tasks.map(projectTask) };
  });
}

export async function updateSupportTaskStatus(
  input: SupportOperationContext & { status: string; taskId: string },
  database: PrismaClient = prisma
) {
  if (!taskStatuses.has(input.status)) {
    throw new Phase202SupportOperationError("SUPPORT_TASK_STATUS_INVALID", "Support task status is invalid.", 400);
  }
  return withSupportSession(database, {
    actionReason: "support.task.status.update",
    authSubject: input.authSubject,
    requestId: input.requestId,
    supportGrantId: input.supportGrantId
  }, async (transaction, identity) => {
    assertScope(identity.scopes, "table:Task:write");
    if (identity.accessMode !== "WRITE_ELEVATED" || !identity.writeElevationExpiresAt
      || identity.writeElevationExpiresAt <= new Date()) {
      throw new Phase202SupportOperationError(
        "SUPPORT_WRITE_ELEVATION_REQUIRED",
        "An active explicit support write elevation is required.",
        403
      );
    }
    const existing = await transaction.task.findFirst({
      where: {
        id: input.taskId,
        organizationId: identity.organizationId,
        tenantId: identity.tenantId
      },
      select: { id: true, status: true, title: true, updatedAt: true }
    });
    if (!existing) {
      throw new Phase202SupportOperationError("SUPPORT_TASK_NOT_FOUND", "The scoped task was not found.", 404);
    }
    if (existing.status === input.status) return { changed: false, task: projectTask(existing) };
    const task = await transaction.task.update({
      where: { id: existing.id },
      data: { status: input.status },
      select: { id: true, status: true, title: true, updatedAt: true }
    });
    return { changed: true, task: projectTask(task) };
  });
}
