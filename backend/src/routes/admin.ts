import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { requireAdmin } from "../auth.js";
import {
  adminAgentTaskParamsSchema,
  auditLogListQuerySchema,
  createPolicySchema,
  policyIdParamsSchema,
  updatePolicySchema
} from "../schemas.js";
import { recordAuditLog, publicAuditLog } from "../services/audit.js";
import { parseSecureJson, stringifySecureJson } from "../services/secureJson.js";

function publicPolicy(policy: {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  effect: string;
  severity: string;
  ruleJson: string;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    enabled: policy.enabled,
    effect: policy.effect,
    severity: policy.severity,
    rule: parseSecureJson(policy.ruleJson),
    createdById: policy.createdById,
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt
  };
}

async function recentAuditLogs() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return logs.map(publicAuditLog);
}

export async function adminRoutes(app: FastifyInstance) {
  app.get("/admin/overview", { preHandler: requireAdmin }, async () => {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      agents,
      activeAgents,
      queuedAgentTasks,
      runningAgentTasks,
      activeSchedules,
      enabledPolicies,
      policyViolations24h,
      policies,
      activeTasks,
      auditLogs
    ] = await Promise.all([
      prisma.agent.count(),
      prisma.agent.count({ where: { isPaused: false } }),
      prisma.agentTask.count({ where: { status: "queued" } }),
      prisma.agentTask.count({ where: { status: "running" } }),
      prisma.agentSchedule.count({ where: { status: "active" } }),
      prisma.policy.count({ where: { enabled: true } }),
      prisma.auditLog.count({
        where: {
          action: { contains: "policy" },
          createdAt: { gte: since24h },
          outcome: "blocked"
        }
      }),
      prisma.policy.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.agentTask.findMany({
        where: { status: { in: ["queued", "running"] } },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          agent: {
            select: {
              name: true
            }
          }
        }
      }),
      recentAuditLogs()
    ]);

    return {
      health: {
        activeAgents,
        activeSchedules,
        agents,
        enabledPolicies,
        policyViolations24h,
        queuedAgentTasks,
        runningAgentTasks
      },
      activeTasks: activeTasks.map((task) => ({
        id: task.id,
        action: task.action,
        agentId: task.agentId,
        agentName: task.agent.name,
        status: task.status,
        title: task.title,
        createdAt: task.createdAt
      })),
      auditLogs,
      policies: policies.map(publicPolicy)
    };
  });

  app.get("/admin/policies", { preHandler: requireAdmin }, async () => {
    const policies = await prisma.policy.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return { items: policies.map(publicPolicy) };
  });

  app.post("/admin/policies", {
    preHandler: requireAdmin,
    config: {
      rateLimit: {
        max: 20,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const currentUser = request.user;
    const input = createPolicySchema.parse(request.body);
    const policy = await prisma.policy.create({
      data: {
        createdById: currentUser?.sub,
        description: input.description,
        effect: input.effect,
        enabled: input.enabled,
        name: input.name,
        ruleJson: stringifySecureJson(input.rule),
        severity: input.severity
      }
    });

    await recordAuditLog({
      action: "policy.created",
      actorRole: currentUser?.role,
      actorUserId: currentUser?.sub,
      metadata: {
        name: policy.name,
        ruleKind: input.rule.kind
      },
      targetId: policy.id,
      targetType: "policy"
    });

    return reply.code(201).send({ policy: publicPolicy(policy) });
  });

  app.patch("/admin/policies/:policyId", { preHandler: requireAdmin }, async (request, reply) => {
    const currentUser = request.user;
    const params = policyIdParamsSchema.parse(request.params);
    const input = updatePolicySchema.parse(request.body);
    const policy = await prisma.policy.findUnique({ where: { id: params.policyId } });

    if (!policy) {
      return reply.code(404).send({ error: "Not Found", message: "Policy was not found." });
    }

    const updated = await prisma.policy.update({
      where: { id: policy.id },
      data: {
        description: input.description === undefined ? undefined : input.description,
        effect: input.effect,
        enabled: input.enabled,
        name: input.name,
        ruleJson: input.rule ? stringifySecureJson(input.rule) : undefined,
        severity: input.severity
      }
    });

    await recordAuditLog({
      action: "policy.updated",
      actorRole: currentUser?.role,
      actorUserId: currentUser?.sub,
      metadata: {
        enabled: updated.enabled,
        name: updated.name
      },
      targetId: updated.id,
      targetType: "policy"
    });

    return reply.send({ policy: publicPolicy(updated) });
  });

  app.delete("/admin/policies/:policyId", { preHandler: requireAdmin }, async (request, reply) => {
    const currentUser = request.user;
    const params = policyIdParamsSchema.parse(request.params);
    const policy = await prisma.policy.findUnique({ where: { id: params.policyId } });

    if (!policy) {
      return reply.code(404).send({ error: "Not Found", message: "Policy was not found." });
    }

    await prisma.policy.delete({ where: { id: policy.id } });
    await recordAuditLog({
      action: "policy.deleted",
      actorRole: currentUser?.role,
      actorUserId: currentUser?.sub,
      metadata: {
        name: policy.name
      },
      targetId: policy.id,
      targetType: "policy"
    });

    return reply.send({ ok: true });
  });

  app.get("/admin/audit-logs", { preHandler: requireAdmin }, async (request) => {
    const query = auditLogListQuerySchema.parse(request.query);
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize
      }),
      prisma.auditLog.count()
    ]);

    return {
      items: items.map(publicAuditLog),
      page: query.page,
      pageSize: query.pageSize,
      total
    };
  });

  app.post("/admin/agent-tasks/:taskId/revoke", { preHandler: requireAdmin }, async (request, reply) => {
    const currentUser = request.user;
    const params = adminAgentTaskParamsSchema.parse(request.params);
    const task = await prisma.agentTask.findUnique({
      where: { id: params.taskId }
    });

    if (!task) {
      return reply.code(404).send({ error: "Not Found", message: "Agent task was not found." });
    }

    if (task.status === "completed" || task.status === "failed" || task.status === "canceled") {
      return reply.code(409).send({ error: "Conflict", message: "Only active agent tasks can be revoked." });
    }

    const updated = await prisma.agentTask.update({
      where: { id: task.id },
      data: {
        completedAt: new Date(),
        error: "Revoked by admin.",
        status: "canceled"
      }
    });
    await prisma.agentLog.create({
      data: {
        agentId: task.agentId,
        level: "warn",
        message: "Task revoked by admin",
        taskId: task.id
      }
    });
    await recordAuditLog({
      action: "agent.task.revoked",
      actorRole: currentUser?.role,
      actorUserId: currentUser?.sub,
      metadata: {
        agentId: task.agentId,
        title: task.title
      },
      outcome: "success",
      severity: "high",
      targetId: task.id,
      targetType: "agent_task"
    });

    return reply.send({ task: updated });
  });

  app.post("/admin/agents/pause-all", { preHandler: requireAdmin }, async (request) => {
    const currentUser = request.user;
    const result = await prisma.agent.updateMany({
      where: { isPaused: false },
      data: {
        isPaused: true,
        status: "paused"
      }
    });
    await recordAuditLog({
      action: "agent.pause_all",
      actorRole: currentUser?.role,
      actorUserId: currentUser?.sub,
      metadata: {
        affectedAgents: result.count
      },
      outcome: "success",
      severity: "critical",
      targetType: "agent"
    });

    return { affectedAgents: result.count };
  });
}
