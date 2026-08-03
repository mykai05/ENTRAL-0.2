import {
  CAPABILITY_EVIDENCE_TYPES,
  CAPABILITY_ENVIRONMENTS,
  CAPABILITY_LIFECYCLE_STATES,
  CAPABILITY_PRICING_ELIGIBILITY,
  PRODUCT_CLAIM_SURFACES,
  ContractError,
  assertCapabilityLifecycleTransitionRequest,
  type CapabilityLifecycleTransitionRequest,
  type ProductClaimSurface
} from "@entral/contracts";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireAdmin, requireAuth, setPrivateNoStoreHeaders } from "../auth.js";
import { hasVerifiedMemberTeamAccess, prisma } from "../db.js";
import {
  capabilityTruthService,
  CapabilityTruthServiceError,
  type CapabilityTruthService
} from "../services/capabilityTruth.js";

const publicQuerySchema = z.object({
  surface: z.enum(PRODUCT_CLAIM_SURFACES)
}).strict();

const memberParamsSchema = z.object({
  organizationId: z.string().cuid()
}).strict();

const capabilityParamsSchema = z.object({
  capabilityId: z.string().uuid()
}).strict();

const evidenceSchema = z.object({
  capability_id: z.string().uuid(),
  expected_record_version: z.number().int().min(1),
  idempotency_key: z.string().trim().min(12).max(255),
  receipt: z.object({
    receipt_id: z.string().uuid(),
    evidence_type: z.enum(CAPABILITY_EVIDENCE_TYPES),
    environment: z.enum(CAPABILITY_ENVIRONMENTS),
    status: z.enum(["PASSED", "FAILED"]),
    reference: z.string().trim().min(1).max(2_000),
    content_sha256: z.string().regex(/^[0-9a-f]{64}$/u),
    captured_at: z.string().datetime(),
    expires_at: z.string().datetime().nullable()
  }).strict()
}).strict();

const transitionSchema = z.object({
  transition_id: z.string().uuid(),
  capability_id: z.string().uuid(),
  from_state: z.enum(CAPABILITY_LIFECYCLE_STATES),
  to_state: z.enum(CAPABILITY_LIFECYCLE_STATES),
  pricing_eligibility: z.enum(CAPABILITY_PRICING_ELIGIBILITY),
  expected_record_version: z.number().int().min(1),
  evidence_receipt_ids: z.array(z.string().uuid()),
  reason: z.string().trim().min(1).max(2_000),
  actor_id: z.string().uuid(),
  tenant_id: z.string().uuid().nullable(),
  organization_id: z.string().uuid().nullable(),
  business_id: z.string().uuid().nullable(),
  correlation_id: z.string().uuid(),
  idempotency_key: z.string().trim().min(12).max(255),
  release_version: z.literal("phase-203"),
  requested_at: z.string().datetime()
}).strict();

function serviceFailure(error: unknown, reply: FastifyReply) {
  if (error instanceof CapabilityTruthServiceError) {
    return reply.code(error.statusCode).send({
      error: error.statusCode >= 500 ? "Service Unavailable" : "Request Error",
      code: error.code,
      message: error.statusCode >= 500 ? "Capability Truth is temporarily unavailable." : error.message
    });
  }
  if (error instanceof ContractError) {
    return reply.code(400).send({ error: "Bad Request", code: error.code, message: error.message });
  }
  throw error;
}

export type CapabilityTruthRoutesOptions = {
  service?: CapabilityTruthService;
};

export async function capabilityTruthRoutes(app: FastifyInstance, options: CapabilityTruthRoutesOptions = {}) {
  const service = options.service ?? capabilityTruthService;

  app.get("/product-truth/claims", async (request, reply) => {
    const { surface } = publicQuerySchema.parse(request.query);
    reply.header("cache-control", "public, max-age=0, must-revalidate, no-store");
    try {
      return reply.send(await service.getPublicProjection(surface as ProductClaimSurface));
    } catch (error) {
      return serviceFailure(error, reply);
    }
  });

  app.get("/member/organizations/:organizationId/product-truth", { preHandler: requireAuth }, async (request, reply) => {
    setPrivateNoStoreHeaders(reply);
    const currentUser = request.user;
    if (currentUser?.session !== "member" || !currentUser.tenantId || !currentUser.organizationId) {
      return reply.code(401).send({ error: "Unauthorized", message: "A tenant-bound member session is required." });
    }
    const { organizationId } = memberParamsSchema.parse(request.params);
    const { surface } = publicQuerySchema.parse(request.query);
    const hasAccess = await hasVerifiedMemberTeamAccess(prisma, {
      authSubject: currentUser.sub,
      organizationId: currentUser.organizationId,
      requestId: request.id,
      teamId: organizationId,
      tenantId: currentUser.tenantId
    });
    if (!hasAccess) return reply.code(404).send({ error: "Not Found", message: "Organization not found." });
    try {
      return reply.send(await service.getMemberProjection({
        authSubject: currentUser.sub,
        organizationId: currentUser.organizationId,
        requestId: request.id,
        tenantId: currentUser.tenantId
      }, surface as ProductClaimSurface));
    } catch (error) {
      return serviceFailure(error, reply);
    }
  });

  app.get("/admin/product-truth", { preHandler: requireAdmin }, async (request, reply) => {
    setPrivateNoStoreHeaders(reply);
    if (!request.user) return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    try {
      return reply.send(await service.getAdminReadback({
        authSubject: request.user.sub,
        requestId: request.id
      }));
    } catch (error) {
      return serviceFailure(error, reply);
    }
  });

  app.post("/admin/product-truth/capabilities/:capabilityId/evidence", { preHandler: requireAdmin }, async (request, reply) => {
    setPrivateNoStoreHeaders(reply);
    if (!request.user) return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    const { capabilityId } = capabilityParamsSchema.parse(request.params);
    const body = evidenceSchema.parse(request.body);
    if (body.capability_id !== capabilityId) {
      return reply.code(400).send({ error: "Bad Request", message: "Capability ID must match the route." });
    }
    try {
      return reply.code(201).send(await service.recordEvidence({
        authSubject: request.user.sub,
        requestId: request.id
      }, body));
    } catch (error) {
      return serviceFailure(error, reply);
    }
  });

  app.post("/admin/product-truth/capabilities/:capabilityId/transitions", { preHandler: requireAdmin }, async (request, reply) => {
    setPrivateNoStoreHeaders(reply);
    if (!request.user) return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    const { capabilityId } = capabilityParamsSchema.parse(request.params);
    const body = transitionSchema.parse(request.body) as CapabilityLifecycleTransitionRequest;
    if (body.capability_id !== capabilityId) {
      return reply.code(400).send({ error: "Bad Request", message: "Capability ID must match the route." });
    }
    assertCapabilityLifecycleTransitionRequest(body);
    try {
      return reply.send(await service.transition({
        authSubject: request.user.sub,
        requestId: request.id
      }, body));
    } catch (error) {
      return serviceFailure(error, reply);
    }
  });
}
