import type { FastifyBaseLogger } from "fastify";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { evaluateAgentPolicies } from "./policyEngine.js";
import { emitGovernanceAlert } from "./alerts.js";
import { recordAuditLog } from "./audit.js";
import { parseSecureJson } from "./secureJson.js";
import { createAssignedAgentMessage, enqueueAgentTask } from "./agentOrchestrator.js";
import { assertDurableAuthorization } from "./durableAuthorization.js";

type ScheduleRecord = {
  action: string;
  agentId: string;
  authorizationVersion: number;
  id: string;
  intervalMinutes: number;
  nextRunAt: Date;
  payloadJson: string;
  title: string;
  userId: string;
};

const runningSchedules = new Set<string>();
const scheduleRuns = new Set<Promise<void>>();
let schedulerTimer: NodeJS.Timeout | undefined;
let acceptingSchedules = false;
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
let bullScheduleQueue: BullQueueLike | null = null;
let bullScheduleWorker: BullWorkerLike | null = null;
let bullScheduleInitStarted = false;
let schedulerStarting = false;
let schedulerHealthCallback: ((healthy: boolean) => void) | undefined;

type StartAutonomySchedulerOptions = {
  initializeQueue?: () => Promise<void>;
  logger?: FastifyBaseLogger;
  onHealthChange?: (healthy: boolean) => void;
  poll?: () => Promise<void>;
  pollIntervalMs?: number;
  probeQueue?: () => Promise<void>;
};

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
    await launchSchedule(schedule, logger);
  }
}

async function closeBullScheduleQueue(logger?: FastifyBaseLogger) {
  const worker = bullScheduleWorker;
  const queue = bullScheduleQueue;
  bullScheduleWorker = null;
  bullScheduleQueue = null;
  bullScheduleInitStarted = false;
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
    logger?.warn({ err: error }, "Unable to close BullMQ schedule queue resource");
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, "BullMQ schedule resources failed to close.");
  }
}

async function probeBullScheduleQueue(required: boolean) {
  if (!bullScheduleQueue || !bullScheduleWorker) {
    if (required) {
      throw new Error("Production autonomy scheduler requires ready BullMQ queue and worker connections.");
    }
    return;
  }
  await Promise.all([
    bullScheduleQueue.waitUntilReady(),
    bullScheduleWorker.waitUntilReady()
  ]);
}

async function initializeBullScheduleQueue(logger?: FastifyBaseLogger, required = false) {
  if (bullScheduleInitStarted || bullScheduleQueue || !env.REDIS_URL) {
    if (required && !env.REDIS_URL) {
      throw new Error("Production autonomy scheduler requires REDIS_URL.");
    }
    await probeBullScheduleQueue(required);
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
    bullScheduleQueue.on?.("error", () => schedulerHealthCallback?.(false));
    bullScheduleWorker.on?.("error", () => schedulerHealthCallback?.(false));
    await probeBullScheduleQueue(required);
    logger?.info("BullMQ repeatable agent schedule queue initialized");
  } catch (error) {
    await closeBullScheduleQueue(logger);
    if (required) {
      throw error;
    }
    logger?.warn({ err: error }, "BullMQ repeatable schedules unavailable; using durable database scheduling");
  }
}

async function addAgentScheduleRepeat(schedule: ScheduleRecord) {
  if (!bullScheduleQueue || schedule.intervalMinutes < 1) {
    return;
  }

  await bullScheduleQueue.add("agent-schedule", { scheduleId: schedule.id }, {
    jobId: schedule.id,
    removeOnComplete: true,
    removeOnFail: false,
    repeat: {
      every: schedule.intervalMinutes * 60 * 1000,
      immediately: schedule.nextRunAt <= new Date()
    }
  });
}

export function registerAgentScheduleRepeat(schedule: ScheduleRecord, logger?: FastifyBaseLogger) {
  void addAgentScheduleRepeat(schedule).catch((error) => {
    schedulerHealthCallback?.(false);
    logger?.warn({ err: error, scheduleId: schedule.id }, "Unable to register BullMQ repeatable agent schedule");
  });
}

async function pauseScheduleForPolicy(
  schedule: ScheduleRecord,
  expectedStatus: "active" | "running",
  reason: string,
  logger?: FastifyBaseLogger
) {
  const paused = await prisma.agentSchedule.updateMany({
    where: {
      authorizationVersion: schedule.authorizationVersion,
      id: schedule.id,
      status: expectedStatus
    },
    data: { status: "paused" }
  });
  if (paused.count !== 1) return false;
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
    title: "Background schedule paused by policy"
  }, logger);
  logger?.warn({ agentId: schedule.agentId, scheduleId: schedule.id, reason }, "Agent schedule blocked by policy");
  return true;
}

async function runSchedule(schedule: ScheduleRecord, logger?: FastifyBaseLogger) {
  if (runningSchedules.has(schedule.id)) {
    return;
  }

  runningSchedules.add(schedule.id);

  try {
    try {
      await assertDurableAuthorization({
        authorizationVersion: schedule.authorizationVersion,
        userId: schedule.userId
      });
    } catch {
      await pauseScheduleForPolicy(
        schedule,
        "active",
        "The account authorization changed after this schedule was approved; explicit re-authorization is required.",
        logger
      );
      return;
    }

    const claim = await prisma.agentSchedule.updateMany({
      where: {
        authorizationVersion: schedule.authorizationVersion,
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
      const paused = await prisma.agentSchedule.updateMany({
        where: {
          authorizationVersion: schedule.authorizationVersion,
          id: schedule.id,
          status: "running"
        },
        data: { status: "paused" }
      });
      if (paused.count === 1) {
        await prisma.agentLog.create({
          data: {
            agentId: schedule.agentId,
            level: "warn",
            message: "Schedule paused because background work is disabled"
          }
        });
      }
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
      await pauseScheduleForPolicy(
        schedule,
        "running",
        policyResult.violations.map((violation) => violation.message).join(" "),
        logger
      );
      return;
    }

    const task = await prisma.$transaction(async (transaction) => {
      const advanced = await transaction.agentSchedule.updateMany({
        where: {
          authorizationVersion: schedule.authorizationVersion,
          id: schedule.id,
          status: "running"
        },
        data: {
          lastRunAt: new Date(),
          nextRunAt: nextRunFromNow(schedule.intervalMinutes),
          status: "active"
        }
      });
      if (advanced.count !== 1) return null;
      return transaction.agentTask.create({
        data: {
          action: schedule.action,
          agentId: schedule.agentId,
          authorizationVersion: schedule.authorizationVersion,
          payloadJson: schedule.payloadJson,
          scheduleId: schedule.id,
          title: schedule.title,
          userId: schedule.userId
        }
      });
    });

    if (!task) {
      logger?.info({ scheduleId: schedule.id }, "Agent schedule stopped before task creation");
      return;
    }
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
        authorizationVersion: schedule.authorizationVersion,
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

function launchSchedule(schedule: ScheduleRecord, logger?: FastifyBaseLogger) {
  if (!acceptingSchedules) return Promise.resolve();
  const run = runSchedule(schedule, logger);
  scheduleRuns.add(run);
  void run.then(
    () => scheduleRuns.delete(run),
    () => scheduleRuns.delete(run)
  );
  return run;
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
    void launchSchedule(schedule, logger).catch((error) => {
      schedulerHealthCallback?.(false);
      logger?.error({ err: error, scheduleId: schedule.id }, "Agent schedule runner crashed");
    });
  });
}

export async function startAutonomyScheduler(
  options: StartAutonomySchedulerOptions = {}
): Promise<() => Promise<void>> {
  const onHealthChange = options.onHealthChange ?? (() => undefined);
  let lastReportedHealth: boolean | undefined;
  const reportHealth = (healthy: boolean) => {
    if (healthy === lastReportedHealth) return;
    lastReportedHealth = healthy;
    onHealthChange(healthy);
  };
  if (!env.AUTONOMY_SCHEDULER_ENABLED) {
    reportHealth(false);
    return async () => undefined;
  }
  if (schedulerTimer || schedulerStarting) {
    throw new Error("Autonomy scheduler is already started.");
  }

  schedulerStarting = true;
  acceptingSchedules = true;
  schedulerHealthCallback = reportHealth;
  const production = env.NODE_ENV === "production";
  const initializeQueue = options.initializeQueue ?? (async () => {
    await initializeBullScheduleQueue(options.logger, production);
    if (!bullScheduleQueue) return;
    const schedules = await prisma.agentSchedule.findMany({
      where: {
        status: "active",
        agent: { isPaused: false, runInBackground: true }
      },
      orderBy: { nextRunAt: "asc" },
      take: 100
    });
    await Promise.all(schedules.map((schedule) => addAgentScheduleRepeat(schedule)));
  });
  const poll = options.poll ?? (() => enqueueDueAgentSchedules(options.logger));
  const probeQueue = options.probeQueue ?? (() => probeBullScheduleQueue(production));
  const pollIntervalMs = options.pollIntervalMs ?? env.AUTONOMY_SCHEDULER_INTERVAL_MS;
  let activePoll: Promise<void> | undefined;
  let stopped = false;

  const runPoll = async () => {
    try {
      const results = await Promise.allSettled([poll(), probeQueue()]);
      const errors = results
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) => result.reason);
      if (errors.length > 0) {
        throw new AggregateError(errors, "Autonomy scheduler poll or queue probe failed.");
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
    acceptingSchedules = false;
    schedulerStarting = false;
    schedulerHealthCallback = undefined;
    try {
      await closeBullScheduleQueue(options.logger);
    } catch (closeError) {
      throw new AggregateError([error, closeError], "Autonomy scheduler startup and cleanup failed.");
    }
    throw error;
  }
  schedulerStarting = false;

  const schedule = () => {
    if (stopped) return;
    schedulerTimer = setTimeout(() => {
      const pollRun = runPoll();
      activePoll = pollRun;
      void pollRun.catch((error) => {
          options.logger?.error({ err: error }, "Background agent scheduler polling failed");
        })
        .finally(() => {
          if (activePoll === pollRun) activePoll = undefined;
          schedule();
        });
    }, pollIntervalMs);
    schedulerTimer.unref();
  };
  schedule();

  return async () => {
    if (stopped) return;
    stopped = true;
    acceptingSchedules = false;
    if (schedulerTimer) {
      clearTimeout(schedulerTimer);
      schedulerTimer = undefined;
    }
    const errors: unknown[] = [];
    try {
      await activePoll;
    } catch (error) {
      errors.push(error);
    }
    try {
      await closeBullScheduleQueue(options.logger);
    } catch (error) {
      errors.push(error);
    }
    const runResults = await Promise.allSettled([...scheduleRuns]);
    errors.push(...runResults
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => result.reason));
    if (schedulerHealthCallback === reportHealth) {
      schedulerHealthCallback = undefined;
    }
    reportHealth(false);
    if (errors.length > 0) {
      throw new AggregateError(errors, "Autonomy scheduler failed while draining.");
    }
  };
}
