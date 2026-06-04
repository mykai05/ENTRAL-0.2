import type { FastifyInstance, FastifyReply } from "fastify";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import {
  automationJobIdParamsSchema,
  applyBrowserOperationsRecoverySchema,
  browserOperationsQuerySchema,
  type ApplyBrowserOperationsRecoveryInput,
  type BrowserOperationsQueryInput,
  createAutomationJobSchema
} from "../schemas.js";
import { assertAllowedAutomationUrl } from "../services/automationExecutor.js";
import { enqueueAutomationJob } from "../services/automationQueue.js";
import {
  buildBrowserOperationsPlan,
  type BrowserOperationConfig,
  type BrowserOperationJobSnapshot,
  type BrowserOperationsPlan
} from "../services/browserOperations.js";
import { env } from "../env.js";

function publicAutomationJob(job: {
  id: string;
  type: string;
  status: string;
  payloadJson: string;
  resultJson: string | null;
  error: string | null;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  logs?: Array<{ id: string; level: string; message: string; createdAt: Date }>;
}) {
  let payload: unknown = { redacted: true };

  try {
    payload = JSON.parse(job.payloadJson) as unknown;
  } catch {
    payload = { redacted: true, type: job.type };
  }

  const result = job.resultJson ? JSON.parse(job.resultJson) as unknown : null;

  return {
    id: job.id,
    type: job.type,
    status: job.status,
    payload,
    result,
    error: job.error,
    scheduledAt: job.scheduledAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    logs: job.logs ?? [],
    event: {
      taskId: job.id,
      status: job.status,
      result
    }
  };
}

function parsePayload(payloadJson: string): { selector?: string; url?: string } {
  try {
    const parsed = JSON.parse(payloadJson) as { selector?: unknown; url?: unknown };

    return {
      selector: typeof parsed.selector === "string" ? parsed.selector : undefined,
      url: typeof parsed.url === "string" ? parsed.url : undefined
    };
  } catch {
    return {};
  }
}

function parseResultEngine(resultJson: string | null) {
  if (!resultJson) return null;

  try {
    const parsed = JSON.parse(resultJson) as { engine?: unknown };
    return typeof parsed.engine === "string" ? parsed.engine : null;
  } catch {
    return null;
  }
}

function parseResultObject(resultJson: string | null): Record<string, unknown> | null {
  if (!resultJson) return null;

  try {
    const parsed = JSON.parse(resultJson) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function automationJobSnapshot(job: {
  completedAt: Date | null;
  createdAt: Date;
  error: string | null;
  id: string;
  logs?: Array<{ id: string }>;
  payloadJson: string;
  resultJson: string | null;
  scheduledAt: Date | null;
  startedAt: Date | null;
  status: string;
  type: string;
  updatedAt: Date;
}): BrowserOperationJobSnapshot {
  return {
    completedAt: job.completedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    error: job.error,
    id: job.id,
    logCount: job.logs?.length ?? 0,
    payload: parsePayload(job.payloadJson),
    result: parseResultObject(job.resultJson),
    resultEngine: parseResultEngine(job.resultJson),
    scheduledAt: job.scheduledAt?.toISOString() ?? null,
    startedAt: job.startedAt?.toISOString() ?? null,
    status: job.status,
    type: job.type,
    updatedAt: job.updatedAt.toISOString()
  };
}

function browserOperationConfig(): BrowserOperationConfig {
  return {
    allowedDomains: env.AUTOMATION_ALLOWED_DOMAINS.split(",").map((host) => host.trim()).filter(Boolean),
    featureEnabled: env.AUTOMATION_FEATURE_ENABLED,
    localFallbackEnabled: env.AUTOMATION_LOCAL_FALLBACK,
    maxConcurrency: env.AUTOMATION_MAX_CONCURRENCY,
    playwrightConfigured: Boolean(env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH),
    workerEnabled: env.AUTOMATION_WORKER_ENABLED
  };
}

async function findOwnedJob(jobId: string, userId: string) {
  return prisma.automationJob.findFirst({
    where: {
      id: jobId,
      userId
    },
    include: {
      logs: {
        orderBy: { createdAt: "asc" }
      }
    }
  });
}

async function buildBrowserOperationsForUser(userId: string, options: BrowserOperationsQueryInput): Promise<BrowserOperationsPlan> {
  const jobs = await prisma.automationJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 250,
    include: {
      logs: {
        select: { id: true }
      }
    }
  });

  return buildBrowserOperationsPlan({
    config: browserOperationConfig(),
    jobs: jobs.map(automationJobSnapshot),
    options
  });
}

async function applyBrowserOperationsRecovery(userId: string, plan: BrowserOperationsPlan, input: ApplyBrowserOperationsRecoveryInput, logger: Parameters<typeof enqueueAutomationJob>[2]) {
  const recoveryRunbooks = plan.runbooks.filter((runbook) => (
    (runbook.action === "retry_failed_job" || runbook.action === "recover_stale_running_job")
    && runbook.targetId
  )).slice(0, input.maxRecoveryJobs);
  const requeuedJobIds: string[] = [];
  const staleRecoveredJobIds: string[] = [];

  for (const runbook of recoveryRunbooks) {
    if (!runbook.targetId) continue;

    if (runbook.action === "recover_stale_running_job") {
      const updated = await prisma.automationJob.updateMany({
        where: {
          id: runbook.targetId,
          status: "running",
          userId
        },
        data: {
          status: "failed",
          error: "Recovered by Browser Operations Layer after exceeding stale running threshold.",
          completedAt: new Date()
        }
      });

      if (updated.count === 1) {
        staleRecoveredJobIds.push(runbook.targetId);
        await prisma.automationLog.create({
          data: {
            jobId: runbook.targetId,
            level: "warn",
            message: "Browser Operations Layer marked this stale running job as failed for deliberate retry."
          }
        });
      }
    }

    if (runbook.action === "retry_failed_job") {
      const updated = await prisma.automationJob.updateMany({
        where: {
          id: runbook.targetId,
          status: { in: ["failed", "canceled", "completed"] },
          userId
        },
        data: {
          completedAt: null,
          error: null,
          resultJson: null,
          scheduledAt: null,
          startedAt: null,
          status: "pending"
        }
      });

      if (updated.count === 1) {
        requeuedJobIds.push(runbook.targetId);
        await prisma.automationLog.create({
          data: {
            jobId: runbook.targetId,
            message: "Browser Operations Layer requeued this job through internal recovery."
          }
        });
        enqueueAutomationJob(runbook.targetId, 0, logger);
      }
    }
  }

  return {
    recoveryRunbooks: recoveryRunbooks.length,
    requeuedJobIds,
    staleRecoveredJobIds
  };
}

function validateAutomationTarget(url: string, reply: FastifyReply) {
  try {
    assertAllowedAutomationUrl(url);
    return false;
  } catch (error) {
    reply.code(400).send({
      error: "Bad Request",
      message: error instanceof Error ? error.message : "Invalid automation URL."
    });
    return true;
  }
}

export async function automationRoutes(app: FastifyInstance) {
  app.get("/automation/browser-operations", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = browserOperationsQuerySchema.parse(request.query);
    const plan = await buildBrowserOperationsForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/automation/browser-operations/recovery/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyBrowserOperationsRecoverySchema.parse(request.body);
    const plan = await buildBrowserOperationsForUser(currentUser.sub, input);
    const recoveryRunbooks = plan.runbooks.filter((runbook) => (
      (runbook.action === "retry_failed_job" || runbook.action === "recover_stale_running_job")
      && runbook.targetId
    )).slice(0, input.maxRecoveryJobs);

    if (input.dryRun) {
      return reply.send({
        applied: {
          dryRun: true,
          externalExecution: false,
          providerContacted: false,
          recoveryRunbooks: recoveryRunbooks.length,
          requeuedJobIds: recoveryRunbooks.filter((runbook) => runbook.action === "retry_failed_job").map((runbook) => runbook.targetId),
          staleRecoveredJobIds: recoveryRunbooks.filter((runbook) => runbook.action === "recover_stale_running_job").map((runbook) => runbook.targetId)
        },
        plan
      });
    }

    const applied = await applyBrowserOperationsRecovery(currentUser.sub, plan, input, request.log);
    const refreshed = await buildBrowserOperationsForUser(currentUser.sub, input);

    return reply.send({
      applied: {
        ...applied,
        dryRun: false,
        externalExecution: false,
        providerContacted: false
      },
      plan: refreshed
    });
  });

  app.get("/automation/jobs", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const jobs = await prisma.automationJob.findMany({
      where: { userId: currentUser.sub },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        logs: {
          orderBy: { createdAt: "desc" },
          take: 4
        }
      }
    });

    return reply.send({ items: jobs.map(publicAutomationJob) });
  });

  app.post("/automation/jobs", {
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

    const input = createAutomationJobSchema.parse(request.body);
    if (validateAutomationTarget(input.payload.url, reply)) {
      return;
    }

    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    const status = scheduledAt && scheduledAt.getTime() > Date.now() ? "scheduled" : "pending";

    const job = await prisma.automationJob.create({
      data: {
        userId: currentUser.sub,
        type: input.type,
        status,
        payloadJson: JSON.stringify(input.payload),
        scheduledAt,
        logs: {
          create: {
            message: status === "scheduled" ? "Job scheduled" : "Job queued"
          }
        }
      },
      include: {
        logs: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (status === "pending") {
      enqueueAutomationJob(job.id, 0, request.log);
    } else if (scheduledAt) {
      enqueueAutomationJob(job.id, scheduledAt.getTime() - Date.now(), request.log);
    }

    return reply.code(201).send({ job: publicAutomationJob(job) });
  });

  app.get("/automation/jobs/:jobId", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = automationJobIdParamsSchema.parse(request.params);
    const job = await findOwnedJob(params.jobId, currentUser.sub);

    if (!job) {
      return reply.code(404).send({ error: "Not Found", message: "Automation job was not found." });
    }

    return reply.send({ job: publicAutomationJob(job) });
  });

  app.post("/automation/jobs/:jobId/cancel", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = automationJobIdParamsSchema.parse(request.params);
    const job = await findOwnedJob(params.jobId, currentUser.sub);

    if (!job) {
      return reply.code(404).send({ error: "Not Found", message: "Automation job was not found." });
    }

    if (job.status === "running") {
      return reply.code(409).send({ error: "Conflict", message: "Running jobs cannot be canceled yet." });
    }

    if (job.status === "completed") {
      return reply.code(409).send({ error: "Conflict", message: "Completed jobs cannot be canceled." });
    }

    const updated = await prisma.automationJob.update({
      where: { id: job.id },
      data: {
        status: "canceled",
        completedAt: new Date(),
        logs: {
          create: {
            message: "Job canceled",
            level: "warn"
          }
        }
      },
      include: {
        logs: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    return reply.send({ job: publicAutomationJob(updated) });
  });

  app.post("/automation/jobs/:jobId/retry", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = automationJobIdParamsSchema.parse(request.params);
    const job = await findOwnedJob(params.jobId, currentUser.sub);

    if (!job) {
      return reply.code(404).send({ error: "Not Found", message: "Automation job was not found." });
    }

    if (job.status === "running" || job.status === "pending" || job.status === "scheduled") {
      return reply.code(409).send({ error: "Conflict", message: "Only finished jobs can be retried." });
    }

    const updated = await prisma.automationJob.update({
      where: { id: job.id },
      data: {
        status: "pending",
        resultJson: null,
        error: null,
        scheduledAt: null,
        startedAt: null,
        completedAt: null,
        logs: {
          create: {
            message: "Job requeued"
          }
        }
      },
      include: {
        logs: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    enqueueAutomationJob(updated.id, 0, request.log);
    return reply.send({ job: publicAutomationJob(updated) });
  });
}
