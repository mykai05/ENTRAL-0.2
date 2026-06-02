import type { FastifyInstance, FastifyReply } from "fastify";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { requireAuth } from "../auth.js";
import {
  agentIdParamsSchema,
  agentScheduleIdParamsSchema,
  agentTaskIdParamsSchema,
  assignAgentTaskSchema,
  createAgentScheduleSchema,
  createAgentSchema,
  updateAgentBackgroundSchema
} from "../schemas.js";
import {
  createAssignedAgentMessage,
  enqueueAgentTask
} from "../services/agentOrchestrator.js";
import { enqueueDueAgentSchedules, registerAgentScheduleRepeat } from "../services/autonomyScheduler.js";
import { recordAuditLog } from "../services/audit.js";
import { agentCapabilityBlueprints } from "../services/agentCapabilities.js";
import { parseSecureJson, stringifySecureJson } from "../services/secureJson.js";
import { assertSafeOutboundWebhookUrl } from "../services/urlSafety.js";

function parseJson<T>(value: string | null): T | null {
  return parseSecureJson<T>(value);
}

function publicAgent(agent: {
  id: string;
  name: string;
  role: string;
  capabilitiesJson: string;
  webhookUrl: string | null;
  status: string;
  isPaused: boolean;
  runInBackground: boolean;
  lastActivitySeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tasks?: Array<{ id: string; status: string }>;
}) {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    capabilities: parseJson<string[]>(agent.capabilitiesJson) ?? [],
    webhookUrl: agent.webhookUrl,
    status: agent.isPaused || !agent.runInBackground ? "paused" : agent.status,
    isPaused: agent.isPaused,
    runInBackground: agent.runInBackground,
    lastActivitySeenAt: agent.lastActivitySeenAt,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    load: agent.tasks?.filter((task) => task.status === "queued" || task.status === "running").length ?? 0
  };
}

function publicAgentTask(task: {
  id: string;
  agentId: string;
  scheduleId: string | null;
  title: string;
  action: string;
  status: string;
  payloadJson: string;
  resultJson: string | null;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: task.id,
    agentId: task.agentId,
    scheduleId: task.scheduleId,
    title: task.title,
    action: task.action,
    status: task.status,
    payload: parseJson(task.payloadJson),
    result: parseJson(task.resultJson),
    error: task.error,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  };
}

function publicAgentSchedule(schedule: {
  id: string;
  agentId: string;
  title: string;
  action: string;
  status: string;
  payloadJson: string;
  intervalMinutes: number;
  nextRunAt: Date;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: schedule.id,
    agentId: schedule.agentId,
    title: schedule.title,
    action: schedule.action,
    status: schedule.status,
    payload: parseJson(schedule.payloadJson),
    intervalMinutes: schedule.intervalMinutes,
    nextRunAt: schedule.nextRunAt,
    lastRunAt: schedule.lastRunAt,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt
  };
}

function publicAgentMessage(message: {
  id: string;
  agentId: string;
  taskId: string | null;
  type: string;
  action: string;
  payloadJson: string;
  createdAt: Date;
}) {
  return {
    id: message.id,
    agentId: message.agentId,
    taskId: message.taskId,
    type: message.type,
    action: message.action,
    payload: parseJson(message.payloadJson),
    createdAt: message.createdAt
  };
}

async function findOwnedAgent(agentId: string, userId: string) {
  return prisma.agent.findFirst({
    where: {
      id: agentId,
      userId
    }
  });
}

function validateWebhookUrl(webhookUrl: string | undefined, reply: FastifyReply) {
  if (!webhookUrl) {
    return true;
  }

  try {
    assertSafeOutboundWebhookUrl(webhookUrl);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook URL is not allowed.";
    void reply.code(400).send({ error: "Bad Request", message });
    return false;
  }
}

export async function agentRoutes(app: FastifyInstance) {
  app.get("/agents/capabilities", { preHandler: requireAuth }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    return reply.send({ items: agentCapabilityBlueprints });
  });

  app.get("/agents", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const agents = await prisma.agent.findMany({
      where: { userId: currentUser.sub },
      orderBy: { createdAt: "desc" },
      include: {
        tasks: {
          where: { status: { in: ["queued", "running"] } },
          select: { id: true, status: true }
        }
      }
    });

    return reply.send({ items: agents.map(publicAgent) });
  });

  app.post("/agents", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = createAgentSchema.parse(request.body);

    if (!validateWebhookUrl(input.webhookUrl, reply)) {
      return;
    }

    const agent = await prisma.agent.create({
      data: {
        userId: currentUser.sub,
        name: input.name,
        role: input.role,
        capabilitiesJson: JSON.stringify(input.capabilities),
        webhookUrl: input.webhookUrl,
        runInBackground: input.runInBackground,
        logs: {
          create: {
            message: input.runInBackground ? "Agent registered for background work" : "Agent registered with background work disabled"
          }
        }
      }
    });

    await recordAuditLog({
      action: "agent.created",
      actorRole: currentUser.role,
      actorUserId: currentUser.sub,
      metadata: {
        name: agent.name,
        role: agent.role
      },
      targetId: agent.id,
      targetType: "agent"
    });

    return reply.code(201).send({ agent: publicAgent(agent) });
  });

  app.get("/agents/:agentId", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = agentIdParamsSchema.parse(request.params);
    const agent = await prisma.agent.findFirst({
      where: {
        id: params.agentId,
        userId: currentUser.sub
      },
      include: {
        tasks: {
          orderBy: { createdAt: "desc" },
          take: 20
        },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 20
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 20
        },
        schedules: {
          orderBy: { createdAt: "desc" },
          take: 20
        }
      }
    });

    if (!agent) {
      return reply.code(404).send({ error: "Not Found", message: "Agent was not found." });
    }

    return reply.send({
      agent: publicAgent(agent),
      tasks: agent.tasks.map(publicAgentTask),
      logs: agent.logs,
      messages: agent.messages.map(publicAgentMessage),
      schedules: agent.schedules.map(publicAgentSchedule)
    });
  });

  app.get("/agents/:agentId/status", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = agentIdParamsSchema.parse(request.params);
    const agent = await findOwnedAgent(params.agentId, currentUser.sub);

    if (!agent) {
      return reply.code(404).send({ error: "Not Found", message: "Agent was not found." });
    }

    return reply.send({ agent: publicAgent(agent) });
  });

  app.post("/agents/:agentId/assign", {
    preHandler: requireAuth,
    config: {
      rateLimit: {
        max: 30,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = agentIdParamsSchema.parse(request.params);
    const input = assignAgentTaskSchema.parse(request.body);

    if (!validateWebhookUrl(input.payload.webhookUrl, reply)) {
      return;
    }

    const agent = await findOwnedAgent(params.agentId, currentUser.sub);

    if (!agent) {
      return reply.code(404).send({ error: "Not Found", message: "Agent was not found." });
    }

    if (agent.isPaused) {
      return reply.code(409).send({ error: "Conflict", message: "Paused agents cannot receive new tasks." });
    }

    if (!agent.runInBackground) {
      return reply.code(409).send({ error: "Conflict", message: "Enable Run in Background before assigning background agent work." });
    }

    const task = await prisma.agentTask.create({
      data: {
        userId: currentUser.sub,
        agentId: agent.id,
        title: input.title,
        action: input.action,
        payloadJson: stringifySecureJson(input.payload)
      }
    });

    await createAssignedAgentMessage({
      agentId: agent.id,
      taskId: task.id,
      action: input.action,
      payload: input.payload
    });
    await recordAuditLog({
      action: "agent.task.assigned",
      actorRole: currentUser.role,
      actorUserId: currentUser.sub,
      metadata: {
        action: input.action,
        sourceType: input.payload.sourceType,
        title: task.title
      },
      targetId: task.id,
      targetType: "agent_task"
    });
    enqueueAgentTask(task.id, request.log);

    return reply.code(201).send({
      task: publicAgentTask(task),
      event: {
        type: "task-assigned",
        taskId: task.id,
        agentId: agent.id,
        action: input.action,
        payload: input.payload
      }
    });
  });

  app.post("/agents/:agentId/schedules", {
    preHandler: requireAuth,
    config: {
      rateLimit: {
        max: 20,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = agentIdParamsSchema.parse(request.params);
    const input = createAgentScheduleSchema.parse(request.body);

    if (!validateWebhookUrl(input.payload.webhookUrl, reply)) {
      return;
    }

    const agent = await findOwnedAgent(params.agentId, currentUser.sub);

    if (!agent) {
      return reply.code(404).send({ error: "Not Found", message: "Agent was not found." });
    }

    if (agent.isPaused) {
      return reply.code(409).send({ error: "Conflict", message: "Paused agents cannot receive background schedules." });
    }

    if (!agent.runInBackground) {
      return reply.code(409).send({ error: "Conflict", message: "Enable Run in Background before creating schedules." });
    }

    const intervalMinutes = Math.max(input.intervalMinutes, env.AUTONOMY_MIN_INTERVAL_MINUTES);
    const nextRunAt = input.runImmediately ? new Date() : new Date(Date.now() + intervalMinutes * 60 * 1000);
    const schedule = await prisma.agentSchedule.create({
      data: {
        userId: currentUser.sub,
        agentId: agent.id,
        title: input.title,
        action: input.action,
        payloadJson: stringifySecureJson({
          ...input.payload,
          sourceType: input.payload.sourceType ?? "schedule"
        }),
        intervalMinutes,
        nextRunAt
      }
    });

    await prisma.agentLog.create({
      data: {
        agentId: agent.id,
        message: "Background schedule created"
      }
    });
    await recordAuditLog({
      action: "agent.schedule.created",
      actorRole: currentUser.role,
      actorUserId: currentUser.sub,
      metadata: {
        intervalMinutes,
        runImmediately: input.runImmediately,
        title: input.title
      },
      targetId: schedule.id,
      targetType: "agent_schedule"
    });

    if (input.runImmediately) {
      void enqueueDueAgentSchedules(request.log).catch((error) => {
        request.log.error({ err: error, scheduleId: schedule.id }, "Unable to enqueue agent schedule");
      });
    }
    registerAgentScheduleRepeat(schedule, request.log);

    return reply.code(201).send({ schedule: publicAgentSchedule(schedule) });
  });

  app.post("/agents/:agentId/schedules/:scheduleId/pause", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = agentScheduleIdParamsSchema.parse(request.params);
    const schedule = await prisma.agentSchedule.findFirst({
      where: {
        id: params.scheduleId,
        agentId: params.agentId,
        userId: currentUser.sub
      }
    });

    if (!schedule) {
      return reply.code(404).send({ error: "Not Found", message: "Schedule was not found." });
    }

    const updated = await prisma.agentSchedule.update({
      where: { id: schedule.id },
      data: { status: "paused" }
    });
    await recordAuditLog({
      action: "agent.schedule.paused",
      actorRole: currentUser.role,
      actorUserId: currentUser.sub,
      targetId: updated.id,
      targetType: "agent_schedule"
    });

    return reply.send({ schedule: publicAgentSchedule(updated) });
  });

  app.post("/agents/:agentId/schedules/:scheduleId/resume", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = agentScheduleIdParamsSchema.parse(request.params);
    const schedule = await prisma.agentSchedule.findFirst({
      where: {
        id: params.scheduleId,
        agentId: params.agentId,
        userId: currentUser.sub
      }
    });

    if (!schedule) {
      return reply.code(404).send({ error: "Not Found", message: "Schedule was not found." });
    }

    const updated = await prisma.agentSchedule.update({
      where: { id: schedule.id },
      data: {
        status: "active",
        nextRunAt: new Date()
      }
    });
    await recordAuditLog({
      action: "agent.schedule.resumed",
      actorRole: currentUser.role,
      actorUserId: currentUser.sub,
      targetId: updated.id,
      targetType: "agent_schedule"
    });
    void enqueueDueAgentSchedules(request.log).catch((error) => {
      request.log.error({ err: error, scheduleId: updated.id }, "Unable to enqueue agent schedule");
    });
    registerAgentScheduleRepeat(updated, request.log);

    return reply.send({ schedule: publicAgentSchedule(updated) });
  });

  app.post("/agents/:agentId/schedules/:scheduleId/revoke", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = agentScheduleIdParamsSchema.parse(request.params);
    const schedule = await prisma.agentSchedule.findFirst({
      where: {
        id: params.scheduleId,
        agentId: params.agentId,
        userId: currentUser.sub
      }
    });

    if (!schedule) {
      return reply.code(404).send({ error: "Not Found", message: "Schedule was not found." });
    }

    const updated = await prisma.agentSchedule.update({
      where: { id: schedule.id },
      data: { status: "revoked" }
    });
    await recordAuditLog({
      action: "agent.schedule.revoked",
      actorRole: currentUser.role,
      actorUserId: currentUser.sub,
      targetId: updated.id,
      targetType: "agent_schedule"
    });

    return reply.send({ schedule: publicAgentSchedule(updated) });
  });

  app.post("/agents/:agentId/tasks/:taskId/cancel", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = agentTaskIdParamsSchema.parse(request.params);
    const task = await prisma.agentTask.findFirst({
      where: {
        agentId: params.agentId,
        id: params.taskId,
        userId: currentUser.sub
      }
    });

    if (!task) {
      return reply.code(404).send({ error: "Not Found", message: "Agent task was not found." });
    }

    if (task.status !== "queued" && task.status !== "running") {
      return reply.code(409).send({ error: "Conflict", message: "Only active agent tasks can be canceled." });
    }

    const updated = await prisma.agentTask.update({
      where: { id: task.id },
      data: {
        completedAt: new Date(),
        error: "Canceled by user.",
        status: "canceled"
      }
    });
    await prisma.agentLog.create({
      data: {
        agentId: task.agentId,
        level: "warn",
        message: "Task canceled by user",
        taskId: task.id
      }
    });
    await recordAuditLog({
      action: "agent.task.canceled",
      actorRole: currentUser.role,
      actorUserId: currentUser.sub,
      targetId: task.id,
      targetType: "agent_task"
    });

    return reply.send({ task: publicAgentTask(updated) });
  });

  app.patch("/agents/:agentId/background", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = agentIdParamsSchema.parse(request.params);
    const input = updateAgentBackgroundSchema.parse(request.body);
    const agent = await findOwnedAgent(params.agentId, currentUser.sub);

    if (!agent) {
      return reply.code(404).send({ error: "Not Found", message: "Agent was not found." });
    }

    const updated = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        runInBackground: input.runInBackground,
        status: input.runInBackground ? "idle" : "paused",
        logs: {
          create: {
            level: input.runInBackground ? "info" : "warn",
            message: input.runInBackground ? "Background work enabled" : "Background work disabled"
          }
        }
      }
    });

    if (!input.runInBackground) {
      await prisma.agentSchedule.updateMany({
        where: {
          agentId: agent.id,
          status: { in: ["active", "running"] }
        },
        data: { status: "paused" }
      });
    }

    await recordAuditLog({
      action: input.runInBackground ? "agent.background.enabled" : "agent.background.disabled",
      actorRole: currentUser.role,
      actorUserId: currentUser.sub,
      targetId: updated.id,
      targetType: "agent"
    });

    return reply.send({ agent: publicAgent(updated) });
  });

  app.post("/agents/:agentId/pause", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = agentIdParamsSchema.parse(request.params);
    const agent = await findOwnedAgent(params.agentId, currentUser.sub);

    if (!agent) {
      return reply.code(404).send({ error: "Not Found", message: "Agent was not found." });
    }

    const updated = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        isPaused: true,
        status: "paused",
        logs: {
          create: {
            message: "Agent paused",
            level: "warn"
          }
        }
      }
    });
    await recordAuditLog({
      action: "agent.paused",
      actorRole: currentUser.role,
      actorUserId: currentUser.sub,
      targetId: updated.id,
      targetType: "agent"
    });

    return reply.send({ agent: publicAgent(updated) });
  });

  app.post("/agents/:agentId/resume", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = agentIdParamsSchema.parse(request.params);
    const agent = await findOwnedAgent(params.agentId, currentUser.sub);

    if (!agent) {
      return reply.code(404).send({ error: "Not Found", message: "Agent was not found." });
    }

    const updated = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        isPaused: false,
        status: "idle",
        logs: {
          create: {
            message: "Agent resumed"
          }
        }
      }
    });
    await recordAuditLog({
      action: "agent.resumed",
      actorRole: currentUser.role,
      actorUserId: currentUser.sub,
      targetId: updated.id,
      targetType: "agent"
    });

    return reply.send({ agent: publicAgent(updated) });
  });

  app.post("/agents/:agentId/restart", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = agentIdParamsSchema.parse(request.params);
    const agent = await findOwnedAgent(params.agentId, currentUser.sub);

    if (!agent) {
      return reply.code(404).send({ error: "Not Found", message: "Agent was not found." });
    }

    const updated = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        isPaused: false,
        status: "idle",
        logs: {
          create: {
            message: "Agent restarted"
          }
        }
      }
    });
    await recordAuditLog({
      action: "agent.restarted",
      actorRole: currentUser.role,
      actorUserId: currentUser.sub,
      targetId: updated.id,
      targetType: "agent"
    });

    return reply.send({ agent: publicAgent(updated) });
  });
}
