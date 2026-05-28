import type { FastifyInstance, FastifyReply } from "fastify";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import {
  automationJobIdParamsSchema,
  createAutomationJobSchema
} from "../schemas.js";
import { assertAllowedAutomationUrl } from "../services/automationExecutor.js";
import { enqueueAutomationJob } from "../services/automationQueue.js";

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
  const payload = JSON.parse(job.payloadJson) as unknown;
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
