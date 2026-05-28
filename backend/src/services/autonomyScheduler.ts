import type { FastifyBaseLogger } from "fastify";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { evaluateAgentPolicies } from "./policyEngine.js";
import { emitGovernanceAlert } from "./alerts.js";
import { recordAuditLog } from "./audit.js";
import { parseSecureJson } from "./secureJson.js";
import { createAssignedAgentMessage, enqueueAgentTask } from "./agentOrchestrator.js";

type ScheduleRecord = {
  action: string;
  agentId: string;
  id: string;
  intervalMinutes: number;
  nextRunAt: Date;
  payloadJson: string;
  title: string;
  userId: string;
};

const runningSchedules = new Set<string>();
let schedulerTimer: NodeJS.Timeout | undefined;
type BullQueueLike = { add: (name: string, data: unknown, options?: unknown) => Promise<unknown>; close: () => Promise<void> };
type BullWorkerLike = { close: () => Promise<void> };
let bullScheduleQueue: BullQueueLike | null = null;
let bullScheduleWorker: BullWorkerLike | null = null;
let bullScheduleInitStarted = false;

function nextRunFromNow(intervalMinutes: number) {
  return new Date(Date.now() + intervalMinutes * 60 * 1000);
}

async function tryImportBullMq() {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<Record<string, unknown>>;

  return dynamicImport("bullmq");
}

async function runScheduleById(scheduleId: string, logger?: FastifyBaseLogger) {
  const schedule = await prisma.agentSchedule.findUnique({
    where: { id: scheduleId }
  });

  if (schedule) {
    await runSchedule(schedule, logger);
  }
}

async function initializeBullScheduleQueue(logger?: FastifyBaseLogger) {
  if (bullScheduleInitStarted || bullScheduleQueue || !env.REDIS_URL) {
    return;
  }

  bullScheduleInitStarted = true;

  try {
    const bullmq = await tryImportBullMq();
    const Queue = bullmq.Queue as new (name: string, options: unknown) => BullQueueLike;
    const Worker = bullmq.Worker as new (name: string, processor: (job: { data?: { scheduleId?: string } }) => Promise<void>, options: unknown) => BullWorkerLike;
    const connection = { url: env.REDIS_URL };

    bullScheduleQueue = new Queue("entral-agent-schedules", { connection });
    bullScheduleWorker = new Worker("entral-agent-schedules", async (job) => {
      const scheduleId = job.data?.scheduleId;

      if (scheduleId) {
        await runScheduleById(scheduleId, logger);
      }
    }, {
      concurrency: 2,
      connection
    });
    logger?.info("BullMQ repeatable agent schedule queue initialized");
  } catch (error) {
    logger?.warn({ err: error }, "BullMQ repeatable schedules unavailable; using durable database scheduling");
  }
}

export function registerAgentScheduleRepeat(schedule: ScheduleRecord, logger?: FastifyBaseLogger) {
  if (!bullScheduleQueue || schedule.intervalMinutes < 1) {
    return;
  }

  void bullScheduleQueue.add("agent-schedule", { scheduleId: schedule.id }, {
    jobId: schedule.id,
    removeOnComplete: true,
    removeOnFail: false,
    repeat: {
      every: schedule.intervalMinutes * 60 * 1000,
      immediately: schedule.nextRunAt <= new Date()
    }
  }).catch((error) => {
    logger?.warn({ err: error, scheduleId: schedule.id }, "Unable to register BullMQ repeatable agent schedule");
  });
}

async function pauseScheduleForPolicy(schedule: ScheduleRecord, reason: string, logger?: FastifyBaseLogger) {
  await prisma.agentSchedule.update({
    where: { id: schedule.id },
    data: { status: "paused" }
  });
  await prisma.agentLog.create({
    data: {
      agentId: schedule.agentId,
      level: "warn",
      message: `Schedule paused by policy: ${reason}`
    }
  });
  await recordAuditLog({
    action: "agent.schedule.policy_blocked",
    actorUserId: schedule.userId,
    metadata: {
      reason,
      scheduleId: schedule.id
    },
    outcome: "blocked",
    severity: "high",
    targetId: schedule.agentId,
    targetType: "agent"
  });
  await emitGovernanceAlert({
    actorUserId: schedule.userId,
    metadata: {
      agentId: schedule.agentId,
      reason,
      scheduleId: schedule.id
    },
    severity: "high",
    targetId: schedule.id,
    targetType: "agent_schedule",
    title: "Autonomous schedule paused by policy"
  }, logger);
  logger?.warn({ agentId: schedule.agentId, scheduleId: schedule.id, reason }, "Agent schedule blocked by policy");
}

async function runSchedule(schedule: ScheduleRecord, logger?: FastifyBaseLogger) {
  if (runningSchedules.has(schedule.id)) {
    return;
  }

  runningSchedules.add(schedule.id);

  try {
    const claim = await prisma.agentSchedule.updateMany({
      where: {
        id: schedule.id,
        nextRunAt: { lte: new Date() },
        status: "active"
      },
      data: {
        status: "running"
      }
    });

    if (claim.count !== 1) {
      return;
    }

    const agent = await prisma.agent.findUnique({
      where: { id: schedule.agentId },
      select: { isPaused: true, runInBackground: true }
    });

    if (!agent || agent.isPaused || !agent.runInBackground) {
      await prisma.agentSchedule.update({
        where: { id: schedule.id },
        data: { status: "paused" }
      });
      await prisma.agentLog.create({
        data: {
          agentId: schedule.agentId,
          level: "warn",
          message: "Schedule paused because background work is disabled"
        }
      });
      return;
    }

    const payload = parseSecureJson<{
      context?: string;
      instructions: string;
      sourceId?: string;
      sourceType?: string;
      webhookUrl?: string;
    }>(schedule.payloadJson);

    if (!payload) {
      throw new Error("Schedule payload is empty.");
    }

    const policyResult = await evaluateAgentPolicies({
      action: schedule.action,
      agentId: schedule.agentId,
      payload,
      scheduled: true,
      title: schedule.title,
      userId: schedule.userId
    });

    if (!policyResult.allowed) {
      await pauseScheduleForPolicy(schedule, policyResult.violations.map((violation) => violation.message).join(" "), logger);
      return;
    }

    const task = await prisma.agentTask.create({
      data: {
        action: schedule.action,
        agentId: schedule.agentId,
        payloadJson: schedule.payloadJson,
        scheduleId: schedule.id,
        title: schedule.title,
        userId: schedule.userId
      }
    });

    await prisma.agentSchedule.update({
      where: { id: schedule.id },
      data: {
        lastRunAt: new Date(),
        nextRunAt: nextRunFromNow(schedule.intervalMinutes),
        status: "active"
      }
    });
    await createAssignedAgentMessage({
      action: schedule.action,
      agentId: schedule.agentId,
      payload,
      taskId: task.id
    });
    await recordAuditLog({
      action: "agent.schedule.triggered",
      actorUserId: schedule.userId,
      metadata: {
        scheduleId: schedule.id,
        taskId: task.id,
        title: schedule.title
      },
      outcome: "success",
      severity: "info",
      targetId: schedule.agentId,
      targetType: "agent"
    });
    enqueueAgentTask(task.id, logger);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Schedule execution failed.";
    await prisma.agentSchedule.updateMany({
      where: {
        id: schedule.id,
        status: "running"
      },
      data: {
        nextRunAt: nextRunFromNow(schedule.intervalMinutes),
        status: "active"
      }
    });
    await prisma.agentLog.create({
      data: {
        agentId: schedule.agentId,
        level: "error",
        message
      }
    });
    await recordAuditLog({
      action: "agent.schedule.failed",
      actorUserId: schedule.userId,
      metadata: {
        error: message,
        scheduleId: schedule.id
      },
      outcome: "failure",
      severity: "high",
      targetId: schedule.id,
      targetType: "agent_schedule"
    });
    logger?.error({ err: error, agentId: schedule.agentId, scheduleId: schedule.id }, "Agent schedule failed");
  } finally {
    runningSchedules.delete(schedule.id);
  }
}

export async function enqueueDueAgentSchedules(logger?: FastifyBaseLogger) {
  if (!env.AUTONOMY_SCHEDULER_ENABLED) {
    return;
  }

  const schedules = await prisma.agentSchedule.findMany({
    where: {
      status: "active",
      nextRunAt: { lte: new Date() },
      agent: { isPaused: false, runInBackground: true }
    },
    orderBy: { nextRunAt: "asc" },
    take: 20
  });

  schedules.forEach((schedule) => {
    void runSchedule(schedule, logger).catch((error) => {
      logger?.error({ err: error, scheduleId: schedule.id }, "Agent schedule runner crashed");
    });
  });
}

export function startAutonomyScheduler(logger?: FastifyBaseLogger) {
  if (!env.AUTONOMY_SCHEDULER_ENABLED || schedulerTimer) {
    return () => undefined;
  }

  void initializeBullScheduleQueue(logger).then(async () => {
    if (!bullScheduleQueue) {
      return;
    }

    const schedules = await prisma.agentSchedule.findMany({
      where: {
        status: "active",
        agent: { isPaused: false, runInBackground: true }
      },
      orderBy: { nextRunAt: "asc" },
      take: 100
    });
    schedules.forEach((schedule) => registerAgentScheduleRepeat(schedule, logger));
  }).catch((error) => {
    logger?.warn({ err: error }, "Unable to initialize BullMQ repeatable agent schedules");
  });
  void enqueueDueAgentSchedules(logger).catch((error) => {
    logger?.error({ err: error }, "Autonomy scheduler polling failed");
  });
  schedulerTimer = setInterval(() => {
    void enqueueDueAgentSchedules(logger).catch((error) => {
      logger?.error({ err: error }, "Autonomy scheduler polling failed");
    });
  }, env.AUTONOMY_SCHEDULER_INTERVAL_MS);

  return () => {
    if (schedulerTimer) {
      clearInterval(schedulerTimer);
      schedulerTimer = undefined;
    }
    void bullScheduleWorker?.close().catch((error) => logger?.warn({ err: error }, "Unable to close BullMQ schedule worker"));
    void bullScheduleQueue?.close().catch((error) => logger?.warn({ err: error }, "Unable to close BullMQ schedule queue"));
    bullScheduleWorker = null;
    bullScheduleQueue = null;
    bullScheduleInitStarted = false;
  };
}
