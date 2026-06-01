import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { buildDevelopmentStatusAuditEntry, getDevelopmentStatusSnapshot } from "../services/developmentConnections.js";
import { recordAuditLog } from "../services/audit.js";
import { buildMockToolExecution, buildToolTestResultWithProvider, getToolById, getToolRegistry } from "../services/toolRegistry.js";

const toolIdParamsSchema = z.object({
  toolId: z.string().trim().min(1).max(120)
});

const mockExecutionSchema = z.object({
  request: z.string().trim().max(2000).optional()
});

export async function connectionRoutes(app: FastifyInstance) {
  app.get("/connections/tools", { preHandler: requireAuth }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const tools = getToolRegistry();
    const categories = tools.reduce<Record<string, number>>((groups, tool) => {
      groups[tool.category] = (groups[tool.category] ?? 0) + 1;
      return groups;
    }, {});

    return reply.send({
      categories,
      items: tools
    });
  });

  app.post("/connections/tools/:toolId/test", { preHandler: requireAuth }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = toolIdParamsSchema.parse(request.params);
    const tool = getToolById(params.toolId);

    if (!tool) {
      return reply.code(404).send({ error: "Not Found", message: "Tool was not found." });
    }

    const result = await buildToolTestResultWithProvider(tool);

    if (tool.id === "github" || tool.id === "vercel") {
      await recordAuditLog({
        action: tool.id === "github" ? "github.status.read" : "vercel.status.read",
        actorRole: request.user.role,
        actorUserId: request.user.sub,
        metadata: {
          readOnly: result.readOnly ?? false,
          resultStatus: result.status,
          tool: result.toolName,
          writeActionsEnabled: result.writeActionsEnabled ?? false
        },
        outcome: result.success ? "success" : result.status === "Error" ? "failure" : "blocked",
        requestId: request.id,
        severity: result.status === "Error" ? "medium" : "low",
        targetId: tool.id,
        targetType: "external_tool"
      }).catch((error) => {
        request.log.warn({ err: error, toolId: tool.id }, "Development connection audit log write failed");
      });
    }

    return reply.send({ result });
  });

  app.get("/connections/development-status", { preHandler: requireAuth }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const snapshot = await getDevelopmentStatusSnapshot();
    await Promise.all([snapshot.github, snapshot.vercel].map((result) => recordAuditLog(buildDevelopmentStatusAuditEntry({
      actorRole: request.user!.role,
      actorUserId: request.user!.sub,
      requestId: request.id,
      result
    })).catch((error) => {
      request.log.warn({ err: error, toolId: result.toolId }, "Development status audit log write failed");
    })));

    return reply.send(snapshot);
  });

  app.post("/connections/tools/:toolId/mock-execute", { preHandler: requireAuth }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = toolIdParamsSchema.parse(request.params);
    const input = mockExecutionSchema.parse(request.body ?? {});
    const tool = getToolById(params.toolId);

    if (!tool) {
      return reply.code(404).send({ error: "Not Found", message: "Tool was not found." });
    }

    return reply.send({ result: buildMockToolExecution(tool, input.request ?? "") });
  });
}
