import type { FastifyBaseLogger } from "fastify";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { executeAutomationJob } from "./automationExecutor.js";

const queuedJobs = new Set<string>();
let runningJobs = 0;
let workerTimer: NodeJS.Timeout | undefined;

async function addJobLog(jobId: string, message: string, level: "info" | "warn" | "error" = "info") {
  await prisma.automationLog.create({
    data: {
      jobId,
      level,
      message
    }
  });
}

async function runAutomationJob(jobId: string, logger?: FastifyBaseLogger) {
  queuedJobs.delete(jobId);

  if (runningJobs >= env.AUTOMATION_MAX_CONCURRENCY) {
    enqueueAutomationJob(jobId, 1000, logger);
    return;
  }

  const job = await prisma.automationJob.findUnique({ where: { id: jobId } });

  if (!job || job.status === "canceled" || job.status === "completed" || job.status === "failed") {
    return;
  }

  if (job.scheduledAt && job.scheduledAt.getTime() > Date.now()) {
    enqueueAutomationJob(jobId, job.scheduledAt.getTime() - Date.now(), logger);
    return;
  }

  runningJobs += 1;

  try {
    const claim = await prisma.automationJob.updateMany({
      where: {
        id: jobId,
        status: { in: ["pending", "scheduled"] },
        OR: [
          { scheduledAt: null },
          { scheduledAt: { lte: new Date() } }
        ]
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

    const runningJob = await prisma.automationJob.findUnique({ where: { id: jobId } });

    if (!runningJob) {
      return;
    }

    await addJobLog(jobId, "Job started");
    const result = await executeAutomationJob(runningJob, (message, level = "info") => addJobLog(jobId, message, level));

    const complete = await prisma.automationJob.updateMany({
      where: {
        id: jobId,
        status: "running"
      },
      data: {
        status: "completed",
        resultJson: JSON.stringify(result),
        completedAt: new Date()
      }
    });

    if (complete.count !== 1) {
      await addJobLog(jobId, "Job stopped before completion", "warn");
      return;
    }

    await addJobLog(jobId, "Job completed");
    logger?.info({ automationJobId: jobId }, "Automation job completed");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automation job failed.";
    const fail = await prisma.automationJob.updateMany({
      where: {
        id: jobId,
        status: { not: "canceled" }
      },
      data: {
        status: "failed",
        error: message,
        completedAt: new Date()
      }
    });

    if (fail.count === 1) {
      await addJobLog(jobId, message, "error");
    }

    logger?.error({ automationJobId: jobId, err: error }, "Automation job failed");
  } finally {
    runningJobs -= 1;
  }
}

export function enqueueAutomationJob(jobId: string, delayMs = 0, logger?: FastifyBaseLogger) {
  if (!env.AUTOMATION_FEATURE_ENABLED || queuedJobs.has(jobId)) {
    return;
  }

  queuedJobs.add(jobId);
  setTimeout(() => {
    void runAutomationJob(jobId, logger).catch((error) => {
      logger?.error({ automationJobId: jobId, err: error }, "Automation job runner crashed");
    });
  }, Math.max(delayMs, 0));
}

export async function enqueueDueAutomationJobs(logger?: FastifyBaseLogger) {
  if (!env.AUTOMATION_FEATURE_ENABLED || runningJobs >= env.AUTOMATION_MAX_CONCURRENCY) {
    return;
  }

  const availableSlots = env.AUTOMATION_MAX_CONCURRENCY - runningJobs;
  const jobs = await prisma.automationJob.findMany({
    where: {
      status: { in: ["pending", "scheduled"] },
      OR: [
        { scheduledAt: null },
        { scheduledAt: { lte: new Date() } }
      ]
    },
    orderBy: [
      { scheduledAt: "asc" },
      { createdAt: "asc" }
    ],
    take: availableSlots
  });

  jobs.forEach((job) => enqueueAutomationJob(job.id, 0, logger));
}

export function startAutomationWorker(logger?: FastifyBaseLogger) {
  if (!env.AUTOMATION_WORKER_ENABLED || workerTimer) {
    return () => undefined;
  }

  void enqueueDueAutomationJobs(logger).catch((error) => {
    logger?.error({ err: error }, "Automation worker polling failed");
  });
  workerTimer = setInterval(() => {
    void enqueueDueAutomationJobs(logger).catch((error) => {
      logger?.error({ err: error }, "Automation worker polling failed");
    });
  }, 5000);

  return () => {
    if (workerTimer) {
      clearInterval(workerTimer);
      workerTimer = undefined;
    }
  };
}
