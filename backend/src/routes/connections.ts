import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { buildMockToolExecution, buildToolTestResult, getToolById, getToolRegistry } from "../services/toolRegistry.js";

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

    return reply.send({ result: buildToolTestResult(tool) });
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
