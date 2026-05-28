import type { FastifyBaseLogger } from "fastify";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { recordAuditLog } from "./audit.js";
import { emitGovernanceAlert } from "./alerts.js";
import { describeAgentCapabilities } from "./agentCapabilities.js";
import { evaluateAgentPolicies } from "./policyEngine.js";
import { openAiChatService } from "./openaiService.js";
import { parseSecureJson, stringifySecureJson } from "./secureJson.js";
import { assertSafeOutboundWebhookUrl } from "./urlSafety.js";

type AgentTaskRecord = {
  userId: string;
  id: string;
  agentId: string;
  title: string;
  action: string;
  payloadJson: string;
  scheduleId: string | null;
  agent: {
    name: string;
    role: string;
    capabilitiesJson: string;
    webhookUrl: string | null;
    status: string;
    isPaused: boolean;
    runInBackground: boolean;
  };
};

type AgentPayload = {
  instructions: string;
  context?: string;
  sourceType?: string;
  sourceId?: string;
  webhookUrl?: string;
};

const queuedTasks = new Set<string>();
let runningTasks = 0;
let orchestratorTimer: NodeJS.Timeout | undefined;
type BullQueueLike = { add: (name: string, data: unknown, options?: unknown) => Promise<unknown>; close: () => Promise<void> };
type BullWorkerLike = { close: () => Promise<void> };
let bullTaskQueue: BullQueueLike | null = null;
let bullTaskWorker: BullWorkerLike | null = null;
let bullQueueInitStarted = false;

export type AgentBusMessage = {
  agentId: string;
  taskId: string;
  action: string;
  payload: AgentPayload;
};

function parsePayload(payloadJson: string) {
  const payload = parseSecureJson<AgentPayload>(payloadJson);

  if (!payload) {
    throw new Error("Agent task payload is empty.");
  }

  return payload;
}

async function buildAgentResult(task: AgentTaskRecord): Promise<Record<string, string | number | boolean | null>> {
  const payload = parsePayload(task.payloadJson);
  const capabilities = parseSecureJson<string[]>(task.agent.capabilitiesJson) ?? [];
  const capabilityArchitecture = describeAgentCapabilities(capabilities);
  const prompt = [
    `Agent: ${task.agent.name}`,
    `Role: ${task.agent.role}`,
    `Capabilities: ${capabilities.join(", ") || "general"}`,
    "Long-term execution architecture:",
    ...capabilityArchitecture.map((line) => `- ${line}`),
    `Task: ${task.title}`,
    `Action: ${task.action}`,
    `Instructions: ${payload.instructions}`,
    payload.context ? `Context: ${payload.context}` : "",
    "Return a concise timestamped result summary and one practical recommendation. If external execution is required, state the next safe internal action instead of claiming it was done.",
    "Never claim restricted-network, credentialed, commerce, outreach, deployment, or scraping work was executed unless an approved tool call actually performed it under policy controls."
  ].filter(Boolean).join("\n");

  const reply = await openAiChatService.createReply([
    { role: "user", content: prompt }
  ]);

  return {
    summary: reply.content,
    recommendation: "Review this result from the dashboard, then assign a follow-up or connect a webhook if execution should leave ENTRAL.",
    sourceType: payload.sourceType ?? "manual",
    sourceId: payload.sourceId ?? null,
    model: reply.model,
    usedLocalFallback: reply.usedLocalFallback,
    generatedAt: new Date().toISOString()
  };
}

async function addAgentLog(agentId: string, taskId: string | null, message: string, level: "info" | "warn" | "error" = "info") {
  await prisma.agentLog.create({
    data: {
      agentId,
      taskId,
      level,
      message
    }
  });
}

async function publishAgentMessage(message: AgentBusMessage, type: "task-assigned" | "task-started" | "task-result" | "policy-violation") {
  await prisma.agentMessage.create({
    data: {
      agentId: message.agentId,
      taskId: message.taskId,
      type,
      action: message.action,
      payloadJson: stringifySecureJson(message)
    }
  });
}

async function tryImportBullMq() {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<Record<string, unknown>>;

  return dynamicImport("bullmq");
}

async function initializeBullAgentQueue(logger?: FastifyBaseLogger) {
  if (bullQueueInitStarted || bullTaskQueue || !env.REDIS_URL) {
    return;
  }

  bullQueueInitStarted = true;

  try {
    const bullmq = await tryImportBullMq();
    const Queue = bullmq.Queue as new (name: string, options: unknown) => BullQueueLike;
    const Worker = bullmq.Worker as new (name: string, processor: (job: { data?: { taskId?: string } }) => Promise<void>, options: unknown) => BullWorkerLike;
    const connection = { url: env.REDIS_URL };

    bullTaskQueue = new Queue("entral-agent-tasks", { connection });
    bullTaskWorker = new Worker("entral-agent-tasks", async (job) => {
      const taskId = job.data?.taskId;

      if (taskId) {
        await runAgentTask(taskId, logger);
      }
    }, {
      concurrency: env.AGENT_MAX_CONCURRENCY,
      connection
    });
    logger?.info("BullMQ agent task queue initialized");
  } catch (error) {
    logger?.warn({ err: error }, "BullMQ is unavailable; using durable database polling for background agents");
  }
}

async function sendTaskWebhook(task: AgentTaskRecord, payload: AgentPayload, result: unknown, logger?: FastifyBaseLogger) {
  if (!payload.webhookUrl) {
    return;
  }

  const webhookUrl = assertSafeOutboundWebhookUrl(payload.webhookUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    await fetch(webhookUrl, {
      body: JSON.stringify({
        action: task.action,
        agentId: task.agentId,
        result,
        status: "completed",
        taskId: task.id,
        title: task.title
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST",
      signal: controller.signal
    });
    await addAgentLog(task.agentId, task.id, "Webhook delivered");
  } catch (error) {
    await addAgentLog(task.agentId, task.id, "Webhook delivery failed", "warn");
    logger?.warn({ err: error, agentTaskId: task.id }, "Agent task webhook failed");
  } finally {
    clearTimeout(timeout);
  }
}

async function blockTaskForPolicy(task: AgentTaskRecord, busMessage: AgentBusMessage, reason: string, logger?: FastifyBaseLogger) {
  await prisma.$transaction([
    prisma.agentTask.update({
      where: { id: task.id },
      data: {
        status: "failed",
        error: `Policy violation: ${reason}`,
        completedAt: new Date()
      }
    }),
    prisma.agent.update({
      where: { id: task.agentId },
      data: {
        lastActivitySeenAt: new Date(),
        status: "idle"
      }
    }),
    prisma.agentLog.create({
      data: {
        agentId: task.agentId,
        taskId: task.id,
        level: "warn",
        message: `Policy blocked task: ${reason}`
      }
    })
  ]);
  await publishAgentMessage({ ...busMessage, payload: { ...busMessage.payload, context: reason } }, "policy-violation");
  await recordAuditLog({
    action: "agent.task.policy_blocked",
    actorUserId: task.userId,
    metadata: {
      action: task.action,
      reason,
      scheduleId: task.scheduleId,
      title: task.title
    },
    outcome: "blocked",
    severity: "high",
    targetId: task.id,
    targetType: "agent_task"
  });
  await emitGovernanceAlert({
    actorUserId: task.userId,
    metadata: {
      action: task.action,
      agentId: task.agentId,
      reason,
      taskId: task.id
    },
    severity: "high",
    targetId: task.id,
    targetType: "agent_task",
    title: "Agent task blocked by policy"
  }, logger);
  logger?.warn({ agentId: task.agentId, agentTaskId: task.id, reason }, "Agent task blocked by policy");
}

async function runAgentTask(taskId: string, logger?: FastifyBaseLogger) {
  queuedTasks.delete(taskId);

  if (runningTasks >= env.AGENT_MAX_CONCURRENCY) {
    enqueueAgentTask(taskId, logger, 1000);
    return;
  }

  const task = await prisma.agentTask.findUnique({
    where: { id: taskId },
    include: { agent: true }
  });

  if (!task || task.status !== "queued" || task.agent.isPaused || !task.agent.runInBackground) {
    return;
  }

  if (task.agent.status === "busy") {
    enqueueAgentTask(task.id, logger, 1000);
    return;
  }

  runningTasks += 1;

  try {
    const parsedPayload = parsePayload(task.payloadJson);
    const busMessage: AgentBusMessage = {
      agentId: task.agentId,
      taskId: task.id,
      action: task.action,
      payload: {
        ...parsedPayload,
        webhookUrl: parsedPayload.webhookUrl ?? task.agent.webhookUrl ?? undefined
      }
    };

    const claim = await prisma.agentTask.updateMany({
      where: {
        id: task.id,
        status: "queued"
      },
      data: {
        status: "running",
        startedAt: new Date(),
        error: null
      }
    });

    if (claim.count !== 1) {
      return;
    }

    const agentClaim = await prisma.agent.updateMany({
      where: {
        id: task.agentId,
        isPaused: false,
        runInBackground: true,
        status: { not: "busy" }
      },
      data: {
        status: "busy"
      }
    });

    if (agentClaim.count !== 1) {
      await prisma.agentTask.updateMany({
        where: {
          id: task.id,
          status: "running"
        },
        data: {
          startedAt: null,
          status: "queued"
        }
      });
      enqueueAgentTask(task.id, logger, 1000);
      return;
    }

    const policyResult = await evaluateAgentPolicies({
      action: task.action,
      agentId: task.agentId,
      payload: busMessage.payload,
      scheduled: Boolean(task.scheduleId),
      taskId: task.id,
      title: task.title,
      userId: task.userId
    });

    if (!policyResult.allowed) {
      await blockTaskForPolicy(task, busMessage, policyResult.violations.map((violation) => violation.message).join(" "), logger);
      return;
    }

    await publishAgentMessage(busMessage, "task-started");
    await addAgentLog(task.agentId, task.id, "Task started");

    const result = await buildAgentResult(task);

    const complete = await prisma.agentTask.updateMany({
      where: {
        id: task.id,
        status: "running"
      },
      data: {
        status: "completed",
        resultJson: stringifySecureJson(result),
        completedAt: new Date()
      }
    });

    await prisma.agent.update({
      where: { id: task.agentId },
      data: {
        lastActivitySeenAt: new Date(),
        status: "idle"
      }
    });

    if (complete.count !== 1) {
      await addAgentLog(task.agentId, task.id, "Task stopped before completion", "warn");
      return;
    }

    await publishAgentMessage({ ...busMessage, payload: { ...busMessage.payload, context: String(result.summary ?? "") } }, "task-result");
    await addAgentLog(task.agentId, task.id, "Task completed");
    await sendTaskWebhook(task, busMessage.payload, result, logger);
    logger?.info({ agentId: task.agentId, agentTaskId: task.id }, "Agent task completed");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent task failed.";
    const fail = await prisma.agentTask.updateMany({
      where: {
        id: task.id,
        status: { not: "canceled" }
      },
      data: {
        status: "failed",
        error: message,
        completedAt: new Date()
      }
    });
    await prisma.agent.update({
      where: { id: task.agentId },
      data: {
        lastActivitySeenAt: new Date(),
        status: fail.count === 1 ? "error" : "idle"
      }
    });

    if (fail.count === 1) {
      await addAgentLog(task.agentId, task.id, message, "error");
    }
    logger?.error({ agentId: task.agentId, agentTaskId: task.id, err: error }, "Agent task failed");
  } finally {
    runningTasks -= 1;
  }
}

export function enqueueAgentTask(taskId: string, logger?: FastifyBaseLogger, delayMs = 0) {
  if (!env.AGENT_ORCHESTRATOR_ENABLED) {
    return;
  }

  if (bullTaskQueue) {
    void bullTaskQueue.add("agent-task", { taskId }, {
      attempts: 2,
      delay: Math.max(delayMs, 0),
      jobId: taskId,
      removeOnComplete: true,
      removeOnFail: false
    }).catch((error) => {
      logger?.warn({ err: error, agentTaskId: taskId }, "BullMQ enqueue failed; falling back to local timer");
      enqueueAgentTaskWithTimer(taskId, logger, delayMs);
    });
    return;
  }

  enqueueAgentTaskWithTimer(taskId, logger, delayMs);
}

function enqueueAgentTaskWithTimer(taskId: string, logger?: FastifyBaseLogger, delayMs = 0) {
  if (queuedTasks.has(taskId)) {
    return;
  }

  queuedTasks.add(taskId);
  setTimeout(() => {
    void runAgentTask(taskId, logger).catch((error) => {
      logger?.error({ err: error, agentTaskId: taskId }, "Agent task runner crashed");
    });
  }, Math.max(delayMs, 0));
}

export async function enqueueQueuedAgentTasks(logger?: FastifyBaseLogger) {
  if (!env.AGENT_ORCHESTRATOR_ENABLED || runningTasks >= env.AGENT_MAX_CONCURRENCY) {
    return;
  }

  const availableSlots = env.AGENT_MAX_CONCURRENCY - runningTasks;
  const tasks = await prisma.agentTask.findMany({
    where: {
      status: "queued",
      agent: {
        isPaused: false,
        runInBackground: true,
        status: { not: "busy" }
      }
    },
    orderBy: { createdAt: "asc" },
    take: availableSlots
  });

  tasks.forEach((task) => enqueueAgentTask(task.id, logger));
}

export async function createAssignedAgentMessage(message: AgentBusMessage) {
  await publishAgentMessage(message, "task-assigned");
  await addAgentLog(message.agentId, message.taskId, "Task assigned");
}

export function startAgentOrchestrator(logger?: FastifyBaseLogger) {
  if (!env.AGENT_ORCHESTRATOR_ENABLED || orchestratorTimer) {
    return () => undefined;
  }

  void initializeBullAgentQueue(logger).catch((error) => {
    logger?.warn({ err: error }, "Unable to initialize BullMQ agent queue");
  });
  void enqueueQueuedAgentTasks(logger).catch((error) => {
    logger?.error({ err: error }, "Agent orchestrator polling failed");
  });
  orchestratorTimer = setInterval(() => {
    void enqueueQueuedAgentTasks(logger).catch((error) => {
      logger?.error({ err: error }, "Agent orchestrator polling failed");
    });
  }, 5000);

  return () => {
    if (orchestratorTimer) {
      clearInterval(orchestratorTimer);
      orchestratorTimer = undefined;
    }
    void bullTaskWorker?.close().catch((error) => logger?.warn({ err: error }, "Unable to close BullMQ agent worker"));
    void bullTaskQueue?.close().catch((error) => logger?.warn({ err: error }, "Unable to close BullMQ agent queue"));
    bullTaskWorker = null;
    bullTaskQueue = null;
    bullQueueInitStarted = false;
  };
}
