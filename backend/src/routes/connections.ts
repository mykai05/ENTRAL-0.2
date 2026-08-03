import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { buildDevelopmentStatusAuditEntry, getDevelopmentStatusSnapshot } from "../services/developmentConnections.js";
import { recordAuditLog } from "../services/audit.js";
import { buildToolTestResultWithProvider, getToolById, getToolRegistry } from "../services/toolRegistry.js";
import {
  capabilityTruthService,
  CapabilityTruthServiceError,
  type CapabilityTruthService
} from "../services/capabilityTruth.js";

const toolIdParamsSchema = z.object({
  toolId: z.string().trim().min(1).max(120)
});

export type ConnectionRoutesOptions = {
  productTruth?: Pick<CapabilityTruthService, "getPublicProjection">;
};

function publicationFailure(error: unknown, reply: FastifyReply) {
  if (error instanceof CapabilityTruthServiceError) {
    return reply.code(503).send({
      error: "Service Unavailable",
      code: "PRODUCT_TRUTH_UNAVAILABLE",
      message: "The verified integration registry is temporarily unavailable."
    });
  }
  throw error;
}

export async function connectionRoutes(app: FastifyInstance, options: ConnectionRoutesOptions = {}) {
  const productTruth = options.productTruth ?? capabilityTruthService;

  async function publishedTools() {
    const projection = await productTruth.getPublicProjection("INTEGRATION_LIST");
    const claimsByToolId = new Map<string, (typeof projection.claims)[number]>();
    for (const claim of projection.claims) {
      if (!claim.capability_key.startsWith("integration.tool.")) {
        throw new CapabilityTruthServiceError(
          "MALFORMED_PRODUCT_TRUTH",
          "The integration projection contains a non-integration capability.",
          503
        );
      }
      const toolId = claim.capability_key.slice("integration.tool.".length);
      if (claimsByToolId.has(toolId)) {
        throw new CapabilityTruthServiceError(
          "MALFORMED_PRODUCT_TRUTH",
          "The integration projection contains duplicate capability claims.",
          503
        );
      }
      claimsByToolId.set(toolId, claim);
    }
    const tools = getToolRegistry().flatMap((tool) => {
      const claim = claimsByToolId.get(tool.id);
      if (!claim) return [];
      return [{
        ...tool,
        description: claim.approved_language,
        name: claim.display_name,
        productTruth: {
          capabilityId: claim.capability_id,
          capabilityKey: claim.capability_key,
          capabilityVersion: claim.capability_version,
          claimId: claim.claim_id,
          claimKey: claim.claim_key,
          claimRecordVersion: claim.claim_record_version,
          evidenceReceiptIds: [...claim.evidence_receipt_ids],
          limitations: [...claim.limitations]
        }
      }];
    });
    if (tools.length !== projection.claims.length) {
      throw new CapabilityTruthServiceError(
        "MALFORMED_PRODUCT_TRUTH",
        "The integration projection is not synchronized with the canonical tool inventory.",
        503
      );
    }
    return { projection, tools };
  }

  app.get("/connections/tools", { preHandler: requireAuth }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }
    if (request.user.session !== "internal") {
      return reply.code(403).send({ error: "Forbidden", message: "The internal integration registry is not a member surface." });
    }

    let published;
    try {
      published = await publishedTools();
    } catch (error) {
      return publicationFailure(error, reply);
    }
    const tools = published.tools;
    const categories = tools.reduce<Record<string, number>>((groups, tool) => {
      groups[tool.category] = (groups[tool.category] ?? 0) + 1;
      return groups;
    }, {});

    return reply.send({
      categories,
      items: tools,
      product_truth: published.projection
    });
  });

  app.post("/connections/tools/:toolId/test", { preHandler: requireAuth }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }
    if (request.user.session !== "internal") {
      return reply.code(403).send({ error: "Forbidden", message: "The internal integration registry is not a member surface." });
    }

    const params = toolIdParamsSchema.parse(request.params);
    const tool = getToolById(params.toolId);

    if (!tool) {
      return reply.code(404).send({ error: "Not Found", message: "Tool was not found." });
    }

    try {
      const published = await publishedTools();
      if (!published.tools.some((candidate) => candidate.id === tool.id)) {
        return reply.code(404).send({ error: "Not Found", message: "Tool was not found." });
      }
    } catch (error) {
      return publicationFailure(error, reply);
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
    if (request.user.session !== "internal") {
      return reply.code(403).send({ error: "Forbidden", message: "Development status is not a member surface." });
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
}
