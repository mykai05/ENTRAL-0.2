import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import {
  ContractError,
  GRAPH_CONTRACT_VERSION,
  buildGraphProjection,
  parseGraphRendererTelemetryRequest,
  parseGraphRendererTelemetryResponse,
  parseGraphViewPreferencesResetRequest,
  parseGraphViewPreferencesUpdateRequest
} from "@entral/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireAuth, setPrivateNoStoreHeaders } from "../auth.js";
import { hasVerifiedMemberTeamAccess, prisma } from "../db.js";
import { canonicalControlPlaneRepository } from "../services/canonicalControlPlane.js";
import {
  GraphPreferencesError,
  graphPreferencesService
} from "../services/graphPreferences.js";

const organizationParamsSchema = z.object({
  organizationId: z.string().cuid()
});

function unauthenticated(reply: FastifyReply) {
  return reply.code(401).send({
    error: "Unauthorized",
    message: "Authentication is required."
  });
}

function organizationNotFound(reply: FastifyReply) {
  return reply.code(404).send({
    error: "Not Found",
    message: "Organization not found or unavailable."
  });
}

async function hasOrganizationAccess(request: FastifyRequest, organizationId: string) {
  const currentUser = request.user;
  if (currentUser?.session !== "member" || !currentUser.tenantId || !currentUser.organizationId) return false;
  return hasVerifiedMemberTeamAccess(prisma, {
    authSubject: currentUser.sub,
    organizationId: currentUser.organizationId,
    requestId: request.id,
    teamId: organizationId,
    tenantId: currentUser.tenantId
  });
}

function databaseSession(request: FastifyRequest, actionReason: string) {
  const currentUser = request.user;
  if (currentUser?.session !== "member" || !currentUser.tenantId || !currentUser.organizationId) {
    throw new Error("A tenant-bound graph preference session is required.");
  }
  return {
    actionReason,
    authSubject: currentUser.sub,
    correlationId: randomUUID(),
    organizationId: currentUser.organizationId,
    tenantId: currentUser.tenantId
  } as const;
}

function contractError(reply: FastifyReply, error: ContractError) {
  return reply.code(400).send({
    code: error.code,
    error: "Bad Request",
    message: error.message
  });
}

function preferenceError(reply: FastifyReply, error: GraphPreferencesError) {
  return reply.code(error.statusCode).send({
    code: error.code,
    error: error.statusCode === 409 ? "Conflict" : "Request Error",
    message: error.message
  });
}

function boundedDuration(startedAt: number, completedAt = performance.now()) {
  return Math.max(0, Math.round((completedAt - startedAt) * 100) / 100);
}

export async function graphPreferenceRoutes(app: FastifyInstance) {
  app.addHook("onRequest", (_request, reply, done) => {
    setPrivateNoStoreHeaders(reply);
    done();
  });

  app.get("/member/organizations/:organizationId/graph/projection", {
    preHandler: requireAuth
  }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);
    const { organizationId } = organizationParamsSchema.parse(request.params);
    if (!await hasOrganizationAccess(request, organizationId)) {
      return organizationNotFound(reply);
    }
    const retrievalStartedAt = performance.now();
    let retrievalCompletedAt = retrievalStartedAt;
    try {
      const hierarchy = await canonicalControlPlaneRepository.getHierarchySnapshot(
        databaseSession(
          request,
          `Build the RLS-filtered canonical graph projection through member access ${organizationId}.`
        )
      );
      retrievalCompletedAt = performance.now();
      const projection = buildGraphProjection({
        hierarchy,
        organization_id: organizationId
      });
      const projectionCompletedAt = performance.now();

      // Projection observability is deliberately aggregate and payload-free:
      // no names, search text, coordinates, lineage arrays, or customer data.
      request.log.info({
        edgeCount: projection.edges.length,
        event: "graph.projection.generated",
        nodeCount: projection.entities.length,
        organizationId,
        projectionId: projection.root_id,
        projectionTimeMs: boundedDuration(retrievalCompletedAt, projectionCompletedAt),
        projectionVersion: projection.projection_version,
        requestId: request.id,
        retrievalTimeMs: boundedDuration(retrievalStartedAt, retrievalCompletedAt),
        totalTimeMs: boundedDuration(retrievalStartedAt, projectionCompletedAt)
      }, "Canonical graph projection generated");

      return reply.send(projection);
    } catch (error) {
      const failedAt = performance.now();
      request.log.error({
        errorCode: error instanceof ContractError
          ? error.code
          : "GRAPH_PROJECTION_FAILURE",
        event: "graph.projection.failed",
        organizationId,
        projectionTimeMs: boundedDuration(retrievalCompletedAt, failedAt),
        requestId: request.id,
        retrievalTimeMs: boundedDuration(retrievalStartedAt, retrievalCompletedAt),
        totalTimeMs: boundedDuration(retrievalStartedAt, failedAt)
      }, "Canonical graph projection generation failed");
      return reply.code(500).send({
        error: "Internal Server Error",
        message: "The canonical graph projection is temporarily unavailable.",
        requestId: request.id
      });
    }
  });

  app.post("/member/organizations/:organizationId/graph/telemetry", {
    preHandler: requireAuth,
    config: {
      rateLimit: {
        max: 120,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);
    const { organizationId } = organizationParamsSchema.parse(request.params);
    if (!await hasOrganizationAccess(request, organizationId)) {
      return organizationNotFound(reply);
    }
    let input;
    try {
      input = parseGraphRendererTelemetryRequest(request.body);
    } catch (error) {
      if (error instanceof ContractError) return contractError(reply, error);
      throw error;
    }

    // This is intentionally a bounded structured observability record. It
    // contains canonical identifiers, aggregate measurements, and an enum
    // error code only—never search text, labels, coordinates, customer data,
    // browser details, stack traces, or arbitrary metadata.
    request.log.info({
      edgeCount: input.edge_count,
      errorCode: input.error_code,
      event: "graph.renderer.telemetry",
      frameRateFps: input.frame_rate_fps,
      droppedFrameRateRatio: input.dropped_frame_rate_ratio,
      layoutPattern: input.layout_pattern,
      layoutTimeMs: input.layout_time_ms,
      nodeCount: input.node_count,
      observedAt: input.observed_at,
      organizationId,
      projectionId: input.projection_id,
      projectionVersion: input.projection_version,
      renderTimeMs: input.render_time_ms,
      renderer: input.renderer,
      requestId: request.id,
      sampleWindowMs: input.sample_window_ms,
      settingsVersion: input.settings_version,
      telemetryId: input.telemetry_id
    }, "Graph renderer telemetry accepted");

    return reply.code(202).send(parseGraphRendererTelemetryResponse({
      accepted: true,
      contract_version: GRAPH_CONTRACT_VERSION,
      organization_id: organizationId,
      recorded_at: new Date().toISOString(),
      schema_version: 1,
      telemetry_id: input.telemetry_id
    }));
  });

  app.get("/member/organizations/:organizationId/graph/preferences", {
    preHandler: requireAuth
  }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);
    const { organizationId } = organizationParamsSchema.parse(request.params);
    if (!await hasOrganizationAccess(request, organizationId)) {
      return organizationNotFound(reply);
    }
    return reply.send(await graphPreferencesService.get(
      organizationId,
      databaseSession(request, `Read graph preferences through member access ${organizationId}.`)
    ));
  });

  app.put("/member/organizations/:organizationId/graph/preferences", {
    preHandler: requireAuth,
    config: {
      rateLimit: {
        max: 30,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);
    const { organizationId } = organizationParamsSchema.parse(request.params);
    if (!await hasOrganizationAccess(request, organizationId)) {
      return organizationNotFound(reply);
    }
    let input;
    try {
      input = parseGraphViewPreferencesUpdateRequest(request.body);
    } catch (error) {
      if (error instanceof ContractError) return contractError(reply, error);
      throw error;
    }
    try {
      return reply.send(await graphPreferencesService.update(
        organizationId,
        input,
        databaseSession(request, `Update graph preferences through member access ${organizationId}.`)
      ));
    } catch (error) {
      if (error instanceof GraphPreferencesError) return preferenceError(reply, error);
      throw error;
    }
  });

  app.delete("/member/organizations/:organizationId/graph/preferences", {
    preHandler: requireAuth,
    config: {
      rateLimit: {
        max: 20,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);
    const { organizationId } = organizationParamsSchema.parse(request.params);
    if (!await hasOrganizationAccess(request, organizationId)) {
      return organizationNotFound(reply);
    }
    let input;
    try {
      input = parseGraphViewPreferencesResetRequest(request.body);
    } catch (error) {
      if (error instanceof ContractError) return contractError(reply, error);
      throw error;
    }
    try {
      return reply.send(await graphPreferencesService.reset(
        organizationId,
        input,
        databaseSession(request, `Reset graph preferences through member access ${organizationId}.`)
      ));
    } catch (error) {
      if (error instanceof GraphPreferencesError) return preferenceError(reply, error);
      throw error;
    }
  });
}
