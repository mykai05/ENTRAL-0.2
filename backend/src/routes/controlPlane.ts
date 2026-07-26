import { randomUUID } from "node:crypto";
import {
  assertGovernanceActionRequest,
  ContractError,
  type GovernanceActionRequest
} from "@entral/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireAdmin, setPrivateNoStoreHeaders } from "../auth.js";
import {
  canonicalControlPlaneRepository,
  CanonicalControlPlaneError
} from "../services/canonicalControlPlane.js";

const businessParamsSchema = z.object({
  businessId: z.string().uuid()
});

const entityParamsSchema = z.object({
  entityId: z.string().uuid()
});

const eventQuerySchema = z.object({
  afterSequence: z.coerce.number().int().min(0).default(0)
});

function unauthenticated(reply: FastifyReply) {
  return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
}

function databaseSession(request: FastifyRequest, actionReason: string) {
  const currentUser = request.user;
  if (!currentUser) {
    throw new CanonicalControlPlaneError(
      "AUTHENTICATED_SESSION_REQUIRED",
      "Authentication is required.",
      401
    );
  }
  return {
    actionReason,
    authSubject: currentUser.sub,
    correlationId: randomUUID()
  } as const;
}

export async function controlPlaneRoutes(app: FastifyInstance) {
  app.addHook("onRequest", (_request, reply, done) => {
    setPrivateNoStoreHeaders(reply);
    done();
  });

  app.get("/control-plane/hierarchy", { preHandler: requireAdmin }, async (request, reply) => {
    return reply.send(await canonicalControlPlaneRepository.getHierarchySnapshot(
      databaseSession(request, "Read the canonical entity hierarchy.")
    ));
  });

  app.get("/control-plane/businesses", { preHandler: requireAdmin }, async (request, reply) => {
    return reply.send({
      businesses: await canonicalControlPlaneRepository.listBusinesses(
        databaseSession(request, "Read canonical business summaries.")
      )
    });
  });

  app.get("/control-plane/portfolio/summary", { preHandler: requireAdmin }, async (request, reply) => {
    return reply.send(await canonicalControlPlaneRepository.getPortfolio(
      databaseSession(request, "Read the canonical portfolio summary.")
    ));
  });

  app.get("/control-plane/businesses/:businessId", { preHandler: requireAdmin }, async (request, reply) => {
    const { businessId } = businessParamsSchema.parse(request.params);
    const business = await canonicalControlPlaneRepository.getBusiness(
      businessId,
      databaseSession(request, `Read canonical business ${businessId}.`)
    );
    if (!business) {
      return reply.code(404).send({ error: "Not Found", message: "Business not found." });
    }
    return reply.send({ business });
  });

  app.get("/control-plane/businesses/:businessId/full", { preHandler: requireAdmin }, async (request, reply) => {
    const { businessId } = businessParamsSchema.parse(request.params);
    const business = await canonicalControlPlaneRepository.getBusinessFull(
      businessId,
      databaseSession(request, `Read the full canonical business ${businessId}.`)
    );
    if (!business) {
      return reply.code(404).send({ error: "Not Found", message: "Business not found." });
    }
    return reply.send(business);
  });

  app.get("/control-plane/entities/:entityId/full", { preHandler: requireAdmin }, async (request, reply) => {
    const { entityId } = entityParamsSchema.parse(request.params);
    const entity = await canonicalControlPlaneRepository.getEntityFull(
      entityId,
      databaseSession(request, `Read the full canonical entity ${entityId}.`)
    );
    if (!entity) {
      return reply.code(404).send({ error: "Not Found", message: "Entity not found." });
    }
    return reply.send(entity);
  });

  app.get("/control-plane/events", { preHandler: requireAdmin }, async (request, reply) => {
    const { afterSequence } = eventQuerySchema.parse(request.query);
    return reply.send(await canonicalControlPlaneRepository.listPortfolioEvents(
      afterSequence,
      databaseSession(request, "Read canonical portfolio synchronization events.")
    ));
  });

  app.post("/control-plane/governance-actions", { preHandler: requireAdmin }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);

    const candidate = request.body as GovernanceActionRequest;
    try {
      assertGovernanceActionRequest(candidate);
    } catch (error) {
      if (error instanceof ContractError) {
        return reply.code(400).send({
          error: "Bad Request",
          code: error.code,
          message: error.message
        });
      }
      throw error;
    }

    // Public HTTP callers represent authenticated Human authority. ENTRAL-originated
    // actions are created by the internal action service, never by trusting a body field.
    if (candidate.actor_type !== "HUMAN") {
      return reply.code(403).send({
        error: "Forbidden",
        message: "HTTP governance requests must use authenticated Human authority."
      });
    }

    try {
      const action = await canonicalControlPlaneRepository.createGovernanceAction(candidate, {
        authenticatedHumanEmail: currentUser.email,
        databaseSession: databaseSession(request, candidate.reason)
      });
      return reply.code(201).send({ action });
    } catch (error) {
      if (error instanceof CanonicalControlPlaneError) {
        return reply.code(error.statusCode).send({
          error: error.statusCode >= 500 ? "Internal Server Error" : "Request Error",
          code: error.code,
          message: error.statusCode >= 500 ? "Something went wrong." : error.message
        });
      }
      throw error;
    }
  });
}
