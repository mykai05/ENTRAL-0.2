import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { authRoutes } from "./routes/auth.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { taskRoutes } from "./routes/tasks.js";
import { aiRoutes } from "./routes/ai.js";
import { automationRoutes } from "./routes/automation.js";
import { agentRoutes } from "./routes/agents.js";
import { adminRoutes } from "./routes/admin.js";
import { env } from "./env.js";
import type { AiService } from "./services/openaiService.js";
import { startAutomationWorker } from "./services/automationQueue.js";
import { startAgentOrchestrator } from "./services/agentOrchestrator.js";
import { startAutonomyScheduler } from "./services/autonomyScheduler.js";
import { ensureDefaultPolicies } from "./services/policyEngine.js";

type BuildServerOptions = {
  aiService?: AiService;
};

export async function buildServer(options: BuildServerOptions = {}) {
  const app = Fastify({
    bodyLimit: 4 * 1024 * 1024,
    logger: {
      level: env.LOG_LEVEL,
      redact: ["req.headers.authorization", "req.headers.cookie"]
    },
    genReqId: (request) => {
      const requestId = request.headers["x-request-id"];
      return Array.isArray(requestId) ? requestId[0] : requestId ?? randomUUID();
    }
  });

  await app.register(helmet);
  await app.register(cookie);
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true
  });
  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute"
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "Input validation failed.",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    request.log.error({ err: error, requestId: request.id }, "Unhandled API error");
    const statusCode = "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
    const message = statusCode >= 500 ? "Something went wrong." : error.message;
    return reply.code(statusCode).send({
      error: statusCode >= 500 ? "Internal Server Error" : "Request Error",
      message
    });
  });

  app.get("/health", async () => ({ ok: true }));
  await ensureDefaultPolicies();
  await app.register(authRoutes, { prefix: "/api/v1" });
  await app.register(dashboardRoutes, { prefix: "/api/v1" });
  await app.register(taskRoutes, { prefix: "/api/v1" });
  await app.register(aiRoutes, { prefix: "/api/v1", aiService: options.aiService });
  await app.register(automationRoutes, { prefix: "/api/v1" });
  await app.register(agentRoutes, { prefix: "/api/v1" });
  await app.register(adminRoutes, { prefix: "/api/v1" });

  const stopAutomationWorker = startAutomationWorker(app.log);
  const stopAgentOrchestrator = startAgentOrchestrator(app.log);
  const stopAutonomyScheduler = startAutonomyScheduler(app.log);
  app.addHook("onClose", async () => {
    stopAutomationWorker();
    stopAgentOrchestrator();
    stopAutonomyScheduler();
  });

  return app;
}
