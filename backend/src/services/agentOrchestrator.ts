import { randomUUID } from "node:crypto";
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
import { createQueueJobEnvelope, parseQueueTaskId } from "./contractRuntime.js";
import { assertDurableAuthorization } from "./durableAuthorization.js";
import {
  failAiUsageReservation,
  reserveAiUsage,
  settleAiUsageReservation
} from "./aiUsage.js";
import { safeOutboundHttpRequest } from "./safeOutboundHttp.js";

type AgentTaskRecord = {
  userId: string;
  id: string;
  agentId: string;
  title: string;
  action: string;
  payloadJson: string;
  authorizationVersion: number;
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
const agentTaskTimers = new Map<string, NodeJS.Timeout>();
const agentTaskRuns = new Set<Promise<void>>();
let runningTasks = 0;
let orchestratorTimer: NodeJS.Timeout | undefined;
let acceptingAgentTasks = false;
type BullQueueLike = {
  add: (name: string, data: unknown, options?: unknown) => Promise<unknown>;
  close: () => Promise<void>;
  on?: (event: "error", listener: (error: Error) => void) => unknown;
  waitUntilReady: () => Promise<unknown>;
};
type BullWorkerLike = {
  close: () => Promise<void>;
  on?: (event: "error", listener: (error: Error) => void) => unknown;
  waitUntilReady: () => Promise<unknown>;
};
let bullTaskQueue: BullQueueLike | null = null;
let bullTaskWorker: BullWorkerLike | null = null;
let bullQueueInitStarted = false;
let orchestratorStarting = false;
let orchestratorHealthCallback: ((healthy: boolean) => void) | undefined;

type StartAgentOrchestratorOptions = {
  initializeQueue?: () => Promise<void>;
  logger?: FastifyBaseLogger;
  onHealthChange?: (healthy: boolean) => void;
  poll?: () => Promise<void>;
  pollIntervalMs?: number;
  probeQueue?: () => Promise<void>;
};

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
    recommendation: "Review this result in the Command Center or Agents workspace, then assign a follow-up or connect a webhook if execution should leave ENTRAL.",
    sourceType: payload.sourceType ?? "manual",
    sourceId: payload.sourceId ?? null,
    model: reply.model,
    providerName: reply.providerName,
    providerRequestId: reply.requestId ?? null,
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

async function closeBullAgentQueue(logger?: FastifyBaseLogger) {
  const worker = bullTaskWorker;
  const queue = bullTaskQueue;
  bullTaskWorker = null;
  bullTaskQueue = null;
  bullQueueInitStarted = false;
  const errors: unknown[] = [];
  if (worker) {
    try {
      await worker.close();
    } catch (error) {
      errors.push(error);
    }
  }
  if (queue) {
    try {
      await queue.close();
    } catch (error) {
      errors.push(error);
    }
  }
  for (const error of errors) {
    logger?.warn({ err: error }, "Unable to close BullMQ agent queue resource");
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, "BullMQ agent resources failed to close.");
  }
}

async function probeBullAgentQueue(required: boolean) {
  if (!bullTaskQueue || !bullTaskWorker) {
    if (required) {
      throw new Error("Production agent orchestrator requires ready BullMQ queue and worker connections.");
    }
    return;
  }
  await Promise.all([
    bullTaskQueue.waitUntilReady(),
    bullTaskWorker.waitUntilReady()
  ]);
}

async function initializeBullAgentQueue(logger?: FastifyBaseLogger, required = false) {
  if (bullQueueInitStarted || bullTaskQueue || !env.REDIS_URL) {
    if (required && !env.REDIS_URL) {
      throw new Error("Production agent orchestrator requires REDIS_URL.");
    }
    await probeBullAgentQueue(required);
    return;
  }

  bullQueueInitStarted = true;

  try {
    const bullmq = await tryImportBullMq();
    const Queue = bullmq.Queue as new (name: string, options: unknown) => BullQueueLike;
    const Worker = bullmq.Worker as new (name: string, processor: (job: { data?: unknown }) => Promise<void>, options: unknown) => BullWorkerLike;
    const connection = { url: env.REDIS_URL };

    bullTaskQueue = new Queue("entral-agent-tasks", { connection });
    bullTaskWorker = new Worker("entral-agent-tasks", async (job) => {
      const taskId = parseQueueTaskId(job.data, "agent-task");
      await launchAgentTask(taskId, logger);
    }, {
      concurrency: env.AGENT_MAX_CONCURRENCY,
      connection
    });
    bullTaskQueue.on?.("error", () => orchestratorHealthCallback?.(false));
    bullTaskWorker.on?.("error", () => orchestratorHealthCallback?.(false));
    await probeBullAgentQueue(required);
    logger?.info("BullMQ agent task queue initialized");
  } catch (error) {
    try {
      await closeBullAgentQueue(logger);
    } catch (closeError) {
      throw new AggregateError([error, closeError], "BullMQ agent initialization and cleanup failed.");
    }
    if (required) {
      throw error;
    }
    logger?.warn({ err: error }, "BullMQ is unavailable; using durable database polling for background agents");
  }
}

async function sendTaskWebhook(task: AgentTaskRecord, payload: AgentPayload, result: unknown, logger?: FastifyBaseLogger) {
  if (!payload.webhookUrl) {
    return;
  }

  try {
    await assertDurableAuthorization({
      authorizationVersion: task.authorizationVersion,
      userId: task.userId
    });
    const response = await safeOutboundHttpRequest(payload.webhookUrl, {
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
      maxRedirects: 0,
      maxRequestBytes: 100_000,
      maxResponseBytes: 32_000,
      method: "POST",
      timeoutMs: 5_000,
      validateUrl: (url) => assertSafeOutboundWebhookUrl(url.toString())
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Agent webhook returned HTTP ${response.status}.`);
    }
    await addAgentLog(task.agentId, task.id, "Webhook delivered");
  } catch (error) {
    await addAgentLog(task.agentId, task.id, "Webhook delivery failed", "warn");
    logger?.warn({ err: error, agentTaskId: task.id }, "Agent task webhook failed");
  }
}

async function blockTaskForPolicy(
  task: AgentTaskRecord,
  busMessage: AgentBusMessage,
  reason: string,
  agentLeaseToken: string,
  logger?: FastifyBaseLogger
) {
  const blocked = await prisma.$transaction(async (transaction) => {
    const taskUpdate = await transaction.agentTask.updateMany({
      where: { id: task.id, status: "running" },
      data: {
        status: "failed",
        error: `Policy violation: ${reason}`,
        completedAt: new Date()
      }
    });
    if (taskUpdate.count !== 1) return false;
    await transaction.agent.updateMany({
      where: { executionLeaseToken: agentLeaseToken, id: task.agentId, status: "busy" },
      data: {
        executionLeaseAcquiredAt: null,
        executionLeaseTaskId: null,
        executionLeaseToken: null,
        lastActivitySeenAt: new Date(),
        status: "idle"
      }
    });
    await transaction.agent.updateMany({
      where: { executionLeaseToken: agentLeaseToken, id: task.agentId },
      data: {
        executionLeaseAcquiredAt: null,
        executionLeaseTaskId: null,
        executionLeaseToken: null,
        lastActivitySeenAt: new Date()
      }
    });
    await transaction.agentLog.create({
      data: {
        agentId: task.agentId,
        taskId: task.id,
        level: "warn",
        message: `Policy blocked task: ${reason}`
      }
    });
    return true;
  });
  if (!blocked) return false;
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
  return true;
}

async function releaseAgentExecutionLease(input: {
  agentId: string;
  leaseToken: string;
  status: "error" | "idle";
}) {
  const released = await prisma.agent.updateMany({
    where: {
      executionLeaseToken: input.leaseToken,
      id: input.agentId,
      status: "busy"
    },
    data: {
      executionLeaseAcquiredAt: null,
      executionLeaseTaskId: null,
      executionLeaseToken: null,
      lastActivitySeenAt: new Date(),
      status: input.status
    }
  });
  if (released.count === 1) return;
  // A user pause/resume can intentionally change status while work drains.
  // Clear only this task's lease without overwriting that newer control state.
  await prisma.agent.updateMany({
    where: {
      executionLeaseToken: input.leaseToken,
      id: input.agentId
    },
    data: {
      executionLeaseAcquiredAt: null,
      executionLeaseTaskId: null,
      executionLeaseToken: null,
      lastActivitySeenAt: new Date()
    }
  });
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
  const agentLeaseToken = randomUUID();
  let agentLeaseAcquired = false;
  let taskClaimed = false;

  try {
    await assertDurableAuthorization({
      authorizationVersion: task.authorizationVersion,
      userId: task.userId
    });
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
    taskClaimed = true;

    const agentClaim = await prisma.agent.updateMany({
      where: {
        id: task.agentId,
        executionLeaseToken: null,
        isPaused: false,
        runInBackground: true,
        status: { not: "busy" }
      },
      data: {
        executionLeaseAcquiredAt: new Date(),
        executionLeaseTaskId: task.id,
        executionLeaseToken: agentLeaseToken,
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
    agentLeaseAcquired = true;

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
      const blocked = await blockTaskForPolicy(
        task,
        busMessage,
        policyResult.violations.map((violation) => violation.message).join(" "),
        agentLeaseToken,
        logger
      );
      if (!blocked) {
        await releaseAgentExecutionLease({
          agentId: task.agentId,
          leaseToken: agentLeaseToken,
          status: "idle"
        });
      }
      return;
    }

    await assertDurableAuthorization({
      authorizationVersion: task.authorizationVersion,
      userId: task.userId
    });

    await publishAgentMessage(busMessage, "task-started");
    await addAgentLog(task.agentId, task.id, "Task started");

    const usageRequestId = `agent-task:${task.id}`;
    const usageReservation = await reserveAiUsage({
      metadata: {
        action: task.action,
        route: "background-agent"
      },
      requestId: usageRequestId,
      requestKind: "chat",
      userId: task.userId
    });
    let result: Awaited<ReturnType<typeof buildAgentResult>>;
    let providerCallSucceeded = false;
    let providerRequestId: string | undefined;
    try {
      result = await buildAgentResult(task);
      providerCallSucceeded = result.usedLocalFallback === false;
      providerRequestId = typeof result.providerRequestId === "string"
        ? result.providerRequestId
        : undefined;
      await settleAiUsageReservation({
        metadata: {
          action: task.action,
          agentId: task.agentId,
          taskId: task.id
        },
        modelName: String(result.model),
        providerName: String(result.providerName),
        providerRequestId,
        requestId: usageRequestId,
        reservationId: usageReservation.id,
        usedLocalFallback: result.usedLocalFallback === true,
        userId: task.userId
      });
    } catch (error) {
      await failAiUsageReservation({
        error,
        providerCallSucceeded,
        providerRequestId,
        requestId: usageRequestId,
        reservationId: usageReservation.id,
        userId: task.userId
      }).catch((reservationError) => {
        logger?.error({ err: reservationError, agentTaskId: task.id }, "Background agent AI reservation failure write failed");
      });
      throw error;
    }

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

    await releaseAgentExecutionLease({
      agentId: task.agentId,
      leaseToken: agentLeaseToken,
      status: "idle"
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
        status: taskClaimed ? "running" : "queued"
      },
      data: {
        status: "failed",
        error: message,
        completedAt: new Date()
      }
    });
    if (agentLeaseAcquired) {
      await releaseAgentExecutionLease({
        agentId: task.agentId,
        leaseToken: agentLeaseToken,
        status: fail.count === 1 ? "error" : "idle"
      });
    }

    if (fail.count === 1) {
      await addAgentLog(task.agentId, task.id, message, "error");
    }
    logger?.error({ agentId: task.agentId, agentTaskId: task.id, err: error }, "Agent task failed");
  } finally {
    runningTasks -= 1;
  }
}

function launchAgentTask(taskId: string, logger?: FastifyBaseLogger) {
  if (!acceptingAgentTasks) {
    queuedTasks.delete(taskId);
    return Promise.resolve();
  }
  const run = runAgentTask(taskId, logger);
  agentTaskRuns.add(run);
  void run.then(
    () => agentTaskRuns.delete(run),
    () => agentTaskRuns.delete(run)
  );
  return run;
}

function stopAcceptingAgentTasks() {
  acceptingAgentTasks = false;
  for (const timer of agentTaskTimers.values()) {
    clearTimeout(timer);
  }
  agentTaskTimers.clear();
  queuedTasks.clear();
}

export function enqueueAgentTask(taskId: string, logger?: FastifyBaseLogger, delayMs = 0) {
  if (!acceptingAgentTasks || !env.AGENT_ORCHESTRATOR_ENABLED) {
    return;
  }

  if (bullTaskQueue) {
    const envelope = createQueueJobEnvelope("agent-task", { taskId }, `agent-task:${taskId}`);
    void bullTaskQueue.add("agent-task", envelope, {
      attempts: 2,
      delay: Math.max(delayMs, 0),
      jobId: taskId,
      removeOnComplete: true,
      removeOnFail: false
    }).catch((error) => {
      orchestratorHealthCallback?.(false);
      logger?.warn({ err: error, agentTaskId: taskId }, "BullMQ enqueue failed; falling back to local timer");
      enqueueAgentTaskWithTimer(taskId, logger, delayMs);
    });
    return;
  }

  enqueueAgentTaskWithTimer(taskId, logger, delayMs);
}

function enqueueAgentTaskWithTimer(taskId: string, logger?: FastifyBaseLogger, delayMs = 0) {
  if (!acceptingAgentTasks || queuedTasks.has(taskId)) {
    return;
  }

  queuedTasks.add(taskId);
  const envelope = createQueueJobEnvelope("agent-task", { taskId }, `agent-task:${taskId}`);
  const timer = setTimeout(() => {
    agentTaskTimers.delete(taskId);
    if (!acceptingAgentTasks) {
      queuedTasks.delete(taskId);
      return;
    }
    const queuedTaskId = parseQueueTaskId(envelope, "agent-task");
    void launchAgentTask(queuedTaskId, logger).catch((error) => {
      orchestratorHealthCallback?.(false);
      logger?.error({ err: error, agentTaskId: queuedTaskId }, "Agent task runner crashed");
    });
  }, Math.max(delayMs, 0));
  agentTaskTimers.set(taskId, timer);
  timer.unref();
}

async function recoverStaleAgentTasks(logger?: FastifyBaseLogger) {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  const staleTasks = await prisma.agentTask.findMany({
    where: {
      startedAt: { lt: cutoff },
      status: "running"
    },
    orderBy: { startedAt: "asc" },
    take: 20
  });

  for (const task of staleTasks) {
    const recovered = await prisma.$transaction(async (transaction) => {
      const taskUpdate = await transaction.agentTask.updateMany({
        where: {
          id: task.id,
          startedAt: { lt: cutoff },
          status: "running"
        },
        data: {
          completedAt: new Date(),
          error: "Recovered after the background-agent execution lease expired.",
          status: "failed"
        }
      });
      if (taskUpdate.count !== 1) return false;
      await transaction.agent.updateMany({
        where: {
          executionLeaseTaskId: task.id,
          id: task.agentId,
          status: "busy"
        },
        data: {
          executionLeaseAcquiredAt: null,
          executionLeaseTaskId: null,
          executionLeaseToken: null,
          lastActivitySeenAt: new Date(),
          status: "error"
        }
      });
      await transaction.agent.updateMany({
        where: {
          executionLeaseTaskId: task.id,
          id: task.agentId
        },
        data: {
          executionLeaseAcquiredAt: null,
          executionLeaseTaskId: null,
          executionLeaseToken: null,
          lastActivitySeenAt: new Date()
        }
      });
      await transaction.aiUsageEvent.updateMany({
        where: {
          requestId: `agent-task:${task.id}`,
          status: "reserved",
          userId: task.userId
        },
        data: {
          failedAt: new Date(),
          metadataJson: stringifySecureJson({
            errorName: "AgentExecutionLeaseExpired",
            providerCallSucceeded: false
          }),
          status: "failed"
        }
      });
      await transaction.agentLog.create({
        data: {
          agentId: task.agentId,
          level: "error",
          message: "Expired background-agent execution lease was recovered.",
          taskId: task.id
        }
      });
      return true;
    });
    if (recovered) {
      logger?.warn({ agentTaskId: task.id }, "Recovered expired background-agent execution lease");
    }
  }
}

export async function enqueueQueuedAgentTasks(logger?: FastifyBaseLogger) {
  if (!env.AGENT_ORCHESTRATOR_ENABLED || runningTasks >= env.AGENT_MAX_CONCURRENCY) {
    return;
  }

  await recoverStaleAgentTasks(logger);

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

export async function startAgentOrchestrator(
  options: StartAgentOrchestratorOptions = {}
): Promise<() => Promise<void>> {
  const onHealthChange = options.onHealthChange ?? (() => undefined);
  let lastReportedHealth: boolean | undefined;
  const reportHealth = (healthy: boolean) => {
    if (healthy === lastReportedHealth) return;
    lastReportedHealth = healthy;
    onHealthChange(healthy);
  };
  if (!env.AGENT_ORCHESTRATOR_ENABLED) {
    reportHealth(false);
    return async () => undefined;
  }
  if (orchestratorTimer || orchestratorStarting) {
    throw new Error("Agent orchestrator is already started.");
  }

  orchestratorStarting = true;
  acceptingAgentTasks = true;
  orchestratorHealthCallback = reportHealth;
  const production = env.NODE_ENV === "production";
  const initializeQueue = options.initializeQueue
    ?? (() => initializeBullAgentQueue(options.logger, production));
  const poll = options.poll ?? (() => enqueueQueuedAgentTasks(options.logger));
  const probeQueue = options.probeQueue ?? (() => probeBullAgentQueue(production));
  const pollIntervalMs = options.pollIntervalMs ?? 5_000;
  let activePoll: Promise<void> | undefined;
  let stopped = false;

  const runPoll = async () => {
    try {
      const results = await Promise.allSettled([poll(), probeQueue()]);
      const errors = results
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) => result.reason);
      if (errors.length > 0) {
        throw new AggregateError(errors, "Agent orchestrator poll or queue probe failed.");
      }
      reportHealth(true);
    } catch (error) {
      reportHealth(false);
      throw error;
    }
  };

  try {
    await initializeQueue();
    await runPoll();
  } catch (error) {
    reportHealth(false);
    stopAcceptingAgentTasks();
    orchestratorStarting = false;
    orchestratorHealthCallback = undefined;
    try {
      await closeBullAgentQueue(options.logger);
    } catch (closeError) {
      throw new AggregateError([error, closeError], "Agent orchestrator startup and cleanup failed.");
    }
    throw error;
  }
  orchestratorStarting = false;

  const schedule = () => {
    if (stopped) return;
    orchestratorTimer = setTimeout(() => {
      const pollRun = runPoll();
      activePoll = pollRun;
      void pollRun.catch((error) => {
          options.logger?.error({ err: error }, "Agent orchestrator polling failed");
        })
        .finally(() => {
          if (activePoll === pollRun) activePoll = undefined;
          schedule();
        });
    }, pollIntervalMs);
    orchestratorTimer.unref();
  };
  schedule();

  return async () => {
    if (stopped) return;
    stopped = true;
    stopAcceptingAgentTasks();
    if (orchestratorTimer) {
      clearTimeout(orchestratorTimer);
      orchestratorTimer = undefined;
    }
    const errors: unknown[] = [];
    try {
      await activePoll;
    } catch (error) {
      errors.push(error);
    }
    try {
      await closeBullAgentQueue(options.logger);
    } catch (error) {
      errors.push(error);
    }
    const runResults = await Promise.allSettled([...agentTaskRuns]);
    errors.push(...runResults
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => result.reason));
    if (orchestratorHealthCallback === reportHealth) {
      orchestratorHealthCallback = undefined;
    }
    reportHealth(false);
    if (errors.length > 0) {
      throw new AggregateError(errors, "Agent orchestrator failed while draining.");
    }
  };
}
