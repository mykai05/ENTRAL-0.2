import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { authRoutes } from "./routes/auth.js";
import { accountRoutes } from "./routes/account.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { taskRoutes } from "./routes/tasks.js";
import { aiRoutes } from "./routes/ai.js";
import { automationRoutes } from "./routes/automation.js";
import { commandOSRoutes } from "./routes/commandOS.js";
import { connectionRoutes } from "./routes/connections.js";
import { agentRoutes } from "./routes/agents.js";
import { merchStoreRoutes } from "./routes/merchStores.js";
import { podProductRoutes } from "./routes/podProducts.js";
import { revenueEngineRoutes } from "./routes/revenueEngine.js";
import { adminRoutes } from "./routes/admin.js";
import { memberRoutes } from "./routes/member.js";
import { memberTaskVisibilityRoutes } from "./routes/memberTaskVisibility.js";
import { controlPlaneRoutes } from "./routes/controlPlane.js";
import { graphPreferenceRoutes } from "./routes/graphPreferences.js";
import { interactionLayerRoutes } from "./routes/interactionLayer.js";
import { releaseEvidenceRoutes } from "./routes/releaseEvidence.js";
import { phase202IdentityAuthorityRoutes } from "./routes/phase202IdentityAuthority.js";
import { capabilityTruthRoutes } from "./routes/capabilityTruth.js";
import { env } from "./env.js";
import { enforceSessionBoundary, requireTrustedOrigin } from "./auth.js";
import type { AiService } from "./services/openaiService.js";
import { startAutomationWorker } from "./services/automationQueue.js";
import { startAgentOrchestrator } from "./services/agentOrchestrator.js";
import { startAutonomyScheduler } from "./services/autonomyScheduler.js";
import { startCanonicalOutboxWorker } from "./services/canonicalOutboxWorker.js";
import { buildHealthPayload } from "./services/health.js";
import { emitOperationalAlert } from "./services/operationalMonitoring.js";
import { ensureDefaultPolicies } from "./services/policyEngine.js";
import {
  assertApiEntrypointRole,
  resolveProcessRole,
  shouldStartEmbeddedWorkers
} from "./processRole.js";
import { installPhase202TenantRequestContext } from "./phase202RequestDatabaseContext.js";

type BuildServerOptions = {
  aiService?: AiService;
};

export async function buildServer(options: BuildServerOptions = {}) {
  const processRole = resolveProcessRole({
    nodeEnv: env.NODE_ENV,
    processRole: process.env.PROCESS_ROLE
  });
  assertApiEntrypointRole(processRole);

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
  app.addHook("onRequest", (request, reply, done) => {
    reply.header("x-request-id", request.id);
    done();
  });
  app.addHook("preValidation", requireTrustedOrigin);
  app.addHook("preValidation", enforceSessionBoundary);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "Input validation failed.",
        requestId: request.id,
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    request.log.error({ err: error, requestId: request.id }, "Unhandled API error");
    const statusCode = typeof error === "object"
      && error !== null
      && "statusCode" in error
      && typeof error.statusCode === "number"
      ? error.statusCode
      : 500;
    const message = statusCode >= 500
      ? "Something went wrong."
      : error instanceof Error
        ? error.message
        : "Request failed.";

    if (statusCode >= 500) {
      void emitOperationalAlert({
        metadata: {
          method: request.method,
          route: request.url,
          statusCode
        },
        requestId: request.id,
        severity: "high",
        title: "Unhandled ENTRAL API error"
      }, request.log);
    }

    return reply.code(statusCode).send({
      error: statusCode >= 500 ? "Internal Server Error" : "Request Error",
      message,
      requestId: request.id
    });
  });

  app.get("/health", async (request) => buildHealthPayload(request.id));
  app.get("/api/v1/health", async (request) => buildHealthPayload(request.id));
  await ensureDefaultPolicies();
  await app.register(authRoutes, { prefix: "/api/v1" });
  await app.register(memberRoutes, { prefix: "/api/v1" });
  await app.register(memberTaskVisibilityRoutes, { prefix: "/api/v1" });
  await app.register(controlPlaneRoutes, { prefix: "/api/v1" });
  await app.register(graphPreferenceRoutes, { prefix: "/api/v1" });
  await app.register(interactionLayerRoutes, { prefix: "/api/v1" });
  await app.register(releaseEvidenceRoutes, { prefix: "/api/v1" });
  await app.register(phase202IdentityAuthorityRoutes, { prefix: "/api/v1" });
  await app.register(accountRoutes, { prefix: "/api/v1" });
  await app.register(capabilityTruthRoutes, { prefix: "/api/v1" });
  await app.register(async (tenantScopedApp) => {
    installPhase202TenantRequestContext(tenantScopedApp);
    await tenantScopedApp.register(dashboardRoutes, { prefix: "/api/v1" });
    await tenantScopedApp.register(taskRoutes, { prefix: "/api/v1" });
    await tenantScopedApp.register(aiRoutes, { prefix: "/api/v1", aiService: options.aiService });
    await tenantScopedApp.register(automationRoutes, { prefix: "/api/v1" });
    await tenantScopedApp.register(commandOSRoutes, { prefix: "/api/v1" });
    await tenantScopedApp.register(connectionRoutes, { prefix: "/api/v1" });
    await tenantScopedApp.register(agentRoutes, { prefix: "/api/v1" });
    await tenantScopedApp.register(revenueEngineRoutes, { prefix: "/api/v1" });
    await tenantScopedApp.register(merchStoreRoutes, { prefix: "/api/v1" });
    await tenantScopedApp.register(podProductRoutes, { prefix: "/api/v1" });
  });
  await app.register(adminRoutes, { prefix: "/api/v1" });

  if (shouldStartEmbeddedWorkers(processRole)) {
    const stopEmbeddedWorkers: Array<() => Promise<void>> = [];
    try {
      stopEmbeddedWorkers.push(await startCanonicalOutboxWorker({
        logger: app.log
      }));
      stopEmbeddedWorkers.push(await startAutomationWorker({
        logger: app.log
      }));
      stopEmbeddedWorkers.push(await startAgentOrchestrator({
        logger: app.log
      }));
      stopEmbeddedWorkers.push(await startAutonomyScheduler({
        logger: app.log
      }));
    } catch (error) {
      await Promise.allSettled(
        [...stopEmbeddedWorkers].reverse().map((stopWorker) => stopWorker())
      );
      throw error;
    }
    app.addHook("onClose", async () => {
      const results = await Promise.allSettled(
        [...stopEmbeddedWorkers].reverse().map((stopWorker) => stopWorker())
      );
      const failure = results.find((result) => result.status === "rejected");
      if (failure?.status === "rejected") throw failure.reason;
    });
  }

  return app;
}
