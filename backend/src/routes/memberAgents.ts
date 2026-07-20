import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAuth, setPrivateNoStoreHeaders } from "../auth.js";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { recordAuditLog } from "../services/audit.js";
import { parseSecureJson, stringifySecureJson } from "../services/secureJson.js";
import {
  enqueueMemberAgentRun,
  memberDiscoveryInputSchema,
  publicMemberAgentRun,
  sovereignCommandAvailability
} from "../services/sovereignCommand.js";

const paramsSchema = z.object({ organizationId: z.string().cuid() });
const createSchema = z.object({
  idempotencyKey: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{7,79}$/),
  kind: z.literal("business_discovery"),
  discovery: memberDiscoveryInputSchema
}).strict();

function requestMatches(stored: string, input: z.infer<typeof createSchema>) {
  try {
    return JSON.stringify(parseSecureJson(stored)) === JSON.stringify({ kind: input.kind, discovery: input.discovery });
  } catch {
    return false;
  }
}

async function membership(userId: string, teamId: string) {
  return prisma.teamMember.findUnique({
    where: { userId_teamId: { teamId, userId } },
    select: { role: true, team: { select: { id: true, memberAccessEnabled: true } } }
  });
}

export async function memberAgentRoutes(app: FastifyInstance) {
  app.addHook("onRequest", (_request, reply, done) => {
    setPrivateNoStoreHeaders(reply);
    done();
  });

  app.get("/member/organizations/:organizationId/agent-runs", { preHandler: requireAuth }, async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    const { organizationId } = paramsSchema.parse(request.params);
    const access = await membership(request.user.sub, organizationId);
    if (!access || !access.team.memberAccessEnabled) return reply.code(404).send({ error: "Not Found", message: "Organization not found or unavailable." });
    const runs = await prisma.memberAgentRun.findMany({ where: { teamId: organizationId }, orderBy: { createdAt: "desc" }, take: 20 });
    return reply.send({ availability: sovereignCommandAvailability(), runs: runs.map(publicMemberAgentRun) });
  });

  app.post("/member/organizations/:organizationId/agent-runs", {
    preHandler: requireAuth,
    config: { rateLimit: { max: 6, timeWindow: "1 hour" } }
  }, async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    if (!env.SOVEREIGN_COMMAND_ENABLED) return reply.code(503).send({ error: "Service Unavailable", message: "Sovereign Command is not configured." });
    const { organizationId } = paramsSchema.parse(request.params);
    const input = createSchema.parse(request.body);
    const access = await membership(request.user.sub, organizationId);
    if (!access || !access.team.memberAccessEnabled) return reply.code(404).send({ error: "Not Found", message: "Organization not found or unavailable." });
    if (access.role !== "OWNER") return reply.code(403).send({ error: "Forbidden", message: "Only an organization owner can start a research run." });

    const existing = await prisma.memberAgentRun.findUnique({
      where: { teamId_idempotencyKey: { teamId: organizationId, idempotencyKey: input.idempotencyKey } }
    });
    if (existing) {
      if (!requestMatches(existing.requestJson, input)) return reply.code(409).send({ error: "Conflict", message: "The request key is already bound to another research request." });
      return reply.send({ run: publicMemberAgentRun(existing), replayed: true });
    }

    let run;
    try {
      run = await prisma.memberAgentRun.create({
        data: {
          teamId: organizationId,
          requestedById: request.user.sub,
          kind: input.kind,
          idempotencyKey: input.idempotencyKey,
          requestJson: stringifySecureJson({ kind: input.kind, discovery: input.discovery })
        }
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      run = await prisma.memberAgentRun.findUniqueOrThrow({
        where: { teamId_idempotencyKey: { teamId: organizationId, idempotencyKey: input.idempotencyKey } }
      });
      if (!requestMatches(run.requestJson, input)) return reply.code(409).send({ error: "Conflict", message: "The request key is already bound to another research request." });
      return reply.send({ run: publicMemberAgentRun(run), replayed: true });
    }

    await recordAuditLog({
      action: "member.agent_run.requested",
      actorRole: request.user.role,
      actorUserId: request.user.sub,
      metadata: { kind: input.kind, organizationId },
      targetId: run.id,
      targetType: "member_agent_run"
    });
    enqueueMemberAgentRun(run.id, request.log);
    return reply.code(202).send({ run: publicMemberAgentRun(run), replayed: false });
  });
}
