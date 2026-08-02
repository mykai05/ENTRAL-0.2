import { randomUUID } from "node:crypto";
import {
  ContractError,
  INTERACTION_CONTRACT_VERSION,
  assertBusinessHealthResponse,
  parseInteractionAnalyticsEventRequest,
  parseTutorialProgressResetRequest,
  parseTutorialProgressUpdateRequest
} from "@entral/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireAuth, setPrivateNoStoreHeaders } from "../auth.js";
import { prisma, resolveVerifiedMemberTeamAccess } from "../db.js";
import { recordAuditLog } from "../services/audit.js";
import { canonicalControlPlaneRepository } from "../services/canonicalControlPlane.js";
import {
  TutorialProgressConflictError,
  buildBusinessHealthResponse,
  interactionLayerService
} from "../services/interactionLayer.js";

const organizationParamsSchema = z.object({
  organizationId: z.string().cuid()
});
const businessHealthQuerySchema = z.object({
  businessId: z.string().uuid().optional(),
  mode: z.enum(["EXECUTIVE", "OPERATIONAL"]).default("EXECUTIVE")
}).strict();

function unauthenticated(reply: FastifyReply) {
  return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
}

function unavailableOrganization(reply: FastifyReply) {
  return reply.code(404).send({ error: "Not Found", message: "Organization not found or unavailable." });
}

function contractError(reply: FastifyReply, error: ContractError) {
  return reply.code(400).send({ code: error.code, error: "Bad Request", message: error.message });
}

async function memberRole(request: FastifyRequest, organizationId: string) {
  const currentUser = request.user;
  if (currentUser?.session !== "member" || !currentUser.tenantId || !currentUser.organizationId) return null;
  const membership = await resolveVerifiedMemberTeamAccess(prisma, {
    authSubject: currentUser.sub,
    organizationId: currentUser.organizationId,
    requestId: request.id,
    teamId: organizationId,
    tenantId: currentUser.tenantId
  });
  if (!membership) return null;
  return membership.role === "OWNER" ? "OWNER" as const : "MEMBER" as const;
}

function canonicalSession(request: FastifyRequest, actionReason: string) {
  if (request.user?.session !== "member" || !request.user.tenantId || !request.user.organizationId) {
    throw new Error("A tenant-bound interaction session is required.");
  }
  return {
    actionReason,
    authSubject: request.user.sub,
    correlationId: randomUUID(),
    organizationId: request.user.organizationId,
    tenantId: request.user.tenantId
  } as const;
}

function conflict(reply: FastifyReply, error: TutorialProgressConflictError) {
  return reply.code(409).send({ code: error.code, error: "Conflict", message: error.message });
}

export async function interactionLayerRoutes(app: FastifyInstance) {
  app.addHook("onRequest", (_request, reply, done) => {
    setPrivateNoStoreHeaders(reply);
    done();
  });

  app.get("/member/organizations/:organizationId/interaction/business-health", {
    preHandler: requireAuth
  }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);
    const { organizationId } = organizationParamsSchema.parse(request.params);
    if (!await memberRole(request, organizationId)) return unavailableOrganization(reply);
    const query = businessHealthQuerySchema.parse(request.query);
    const portfolio = await canonicalControlPlaneRepository.getPortfolio(canonicalSession(
      request,
      `Explain canonical business health through member access ${organizationId}.`
    ));
    if (query.businessId && !portfolio.businesses.some((business) => business.business_id === query.businessId)) {
      return reply.code(404).send({ error: "Not Found", message: "Business not found." });
    }
    const response = buildBusinessHealthResponse({
      businessId: query.businessId ?? null,
      mode: query.mode,
      organizationId,
      portfolio
    });
    assertBusinessHealthResponse(response);
    return reply.send(response);
  });

  app.get("/member/organizations/:organizationId/interaction/tutorial-progress", {
    preHandler: requireAuth
  }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);
    const { organizationId } = organizationParamsSchema.parse(request.params);
    const role = await memberRole(request, organizationId);
    if (!role) return unavailableOrganization(reply);
    return reply.send(await interactionLayerService.getTutorialProgress({
      organizationId,
      role,
      userId: currentUser.sub
    }));
  });

  app.patch("/member/organizations/:organizationId/interaction/tutorial-progress", {
    preHandler: requireAuth,
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);
    const { organizationId } = organizationParamsSchema.parse(request.params);
    const role = await memberRole(request, organizationId);
    if (!role) return unavailableOrganization(reply);
    try {
      const update = parseTutorialProgressUpdateRequest(request.body);
      return reply.send(await interactionLayerService.updateTutorialProgress({
        organizationId,
        role,
        update,
        userId: currentUser.sub
      }));
    } catch (error) {
      if (error instanceof ContractError) return contractError(reply, error);
      if (error instanceof TutorialProgressConflictError) return conflict(reply, error);
      throw error;
    }
  });

  app.delete("/member/organizations/:organizationId/interaction/tutorial-progress", {
    preHandler: requireAuth,
    config: { rateLimit: { max: 20, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);
    const { organizationId } = organizationParamsSchema.parse(request.params);
    const role = await memberRole(request, organizationId);
    if (!role) return unavailableOrganization(reply);
    try {
      const reset = parseTutorialProgressResetRequest(request.body);
      return reply.send(await interactionLayerService.resetTutorialProgress({
        expectedRevision: reset.expected_revision,
        idempotencyKey: reset.idempotency_key,
        organizationId,
        role,
        userId: currentUser.sub
      }));
    } catch (error) {
      if (error instanceof ContractError) return contractError(reply, error);
      if (error instanceof TutorialProgressConflictError) return conflict(reply, error);
      throw error;
    }
  });

  app.post("/member/organizations/:organizationId/interaction/analytics", {
    preHandler: requireAuth,
    config: { rateLimit: { max: 120, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);
    const { organizationId } = organizationParamsSchema.parse(request.params);
    if (!await memberRole(request, organizationId)) return unavailableOrganization(reply);
    try {
      const event = parseInteractionAnalyticsEventRequest(request.body);
      await recordAuditLog({
        action: `interaction.${event.event_type.toLocaleLowerCase()}`,
        actorUserId: currentUser.sub,
        metadata: {
          contractVersion: INTERACTION_CONTRACT_VERSION,
          controlId: event.control_id,
          occurredAt: event.occurred_at,
          organizationId,
          reasonCode: event.reason_code,
          route: event.route
        },
        targetId: event.event_id,
        targetType: "INTERACTION_ANALYTICS"
      });
      request.log.info({
        event: "interaction.analytics.accepted",
        eventId: event.event_id,
        eventType: event.event_type,
        organizationId,
        requestId: request.id
      }, "Bounded interaction analytics accepted");
      return reply.code(202).send({
        accepted: true,
        contract_version: INTERACTION_CONTRACT_VERSION,
        event_id: event.event_id,
        schema_version: 1
      });
    } catch (error) {
      if (error instanceof ContractError) return contractError(reply, error);
      throw error;
    }
  });
}
