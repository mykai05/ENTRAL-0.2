import type { FastifyBaseLogger } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { recordAuditLog } from "./audit.js";
import { parseSecureJson, stringifySecureJson } from "./secureJson.js";

const discoveryRequestSchema = z.object({
  namedBusinesses: z.array(z.string().trim().min(2).max(160)).max(20).default([]),
  businessType: z.string().trim().min(2).max(120).optional(),
  centerCity: z.string().trim().min(2).max(120).optional(),
  region: z.string().trim().min(2).max(120).optional(),
  country: z.string().trim().min(2).max(80).default("US"),
  radiusMiles: z.number().int().min(1).max(250).optional(),
  maxResults: z.number().int().min(1).max(40).default(20)
}).strict().superRefine((value, context) => {
  const radiusValues = [value.businessType, value.centerCity, value.radiusMiles];
  const completeRadius = radiusValues.every((item) => item !== undefined);
  const partialRadius = radiusValues.some((item) => item !== undefined);
  if (partialRadius && !completeRadius) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Business type, center city, and radius are required together." });
  }
  if (!value.namedBusinesses.length && !completeRadius) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Provide at least one business name or a complete category and radius search." });
  }
});

const httpUrlSchema = z.string().url().max(2048).refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "https:" || protocol === "http:";
}, "Only HTTP and HTTPS links are allowed.");

const sourceSchema = z.object({
  title: z.string().min(1).max(240),
  url: httpUrlSchema,
  source_type: z.string().min(1).max(80)
}).strict();

const discoveryResultSchema = z.object({
  status: z.enum(["completed", "partial", "blocked"]),
  mode: z.enum(["named_businesses", "business_type_radius", "mixed"]),
  search_summary: z.string().min(1).max(1000),
  businesses: z.array(z.object({
    name: z.string().min(2).max(200),
    business_type: z.string().max(160).nullable().optional(),
    city: z.string().max(120).nullable().optional(),
    region: z.string().max(120).nullable().optional(),
    country: z.string().max(80).nullable().optional(),
    website: httpUrlSchema.nullable().optional(),
    approximate_distance_miles: z.number().nonnegative().nullable().optional(),
    match_basis: z.string().min(1).max(500),
    confidence: z.enum(["high", "medium", "low"]),
    sources: z.array(sourceSchema).min(1).max(6)
  }).strict()).max(40),
  source_coverage: z.array(z.string().min(1).max(240)).max(12),
  limitations: z.array(z.string().min(1).max(500)).max(12),
  next_command_action: z.string().min(1).max(500)
}).strict();

const serviceResponseSchema = z.object({
  status: z.literal("completed"),
  organization_id: z.string().min(2).max(160),
  requested_by: z.string().min(2).max(160),
  result: discoveryResultSchema
}).strict();

export const memberDiscoveryInputSchema = discoveryRequestSchema;
export type MemberDiscoveryInput = z.infer<typeof discoveryRequestSchema>;

type MemberRunRequest = {
  kind: "business_discovery";
  discovery: MemberDiscoveryInput;
};

const queued = new Set<string>();
let pollTimer: NodeJS.Timeout | undefined;

function serviceUrl(path: string) {
  return new URL(path, `${env.SOVEREIGN_COMMAND_API_URL!.replace(/\/+$/, "")}/`).toString();
}

function providerPayload(request: MemberRunRequest, teamId: string, requestedById: string) {
  return {
    organization_id: teamId,
    requested_by: requestedById,
    discovery: {
      named_businesses: request.discovery.namedBusinesses,
      business_type: request.discovery.businessType,
      center_city: request.discovery.centerCity,
      region: request.discovery.region,
      country: request.discovery.country,
      radius_miles: request.discovery.radiusMiles,
      max_results: request.discovery.maxResults
    }
  };
}

export async function runMemberAgentRun(runId: string, logger?: FastifyBaseLogger) {
  queued.delete(runId);
  if (!env.SOVEREIGN_COMMAND_ENABLED || !env.SOVEREIGN_COMMAND_API_URL || !env.SOVEREIGN_COMMAND_API_TOKEN) return;

  const claimed = await prisma.memberAgentRun.updateMany({
    where: { id: runId, status: "queued" },
    data: { status: "running", startedAt: new Date(), errorCode: null }
  });
  if (claimed.count !== 1) return;

  const run = await prisma.memberAgentRun.findUnique({ where: { id: runId } });
  if (!run) return;
  const request = parseSecureJson<MemberRunRequest>(run.requestJson);
  if (!request || request.kind !== "business_discovery") {
    await prisma.memberAgentRun.update({ where: { id: run.id }, data: { status: "failed", errorCode: "INVALID_STORED_REQUEST", completedAt: new Date() } });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.SOVEREIGN_COMMAND_TIMEOUT_MS);
  try {
    const response = await fetch(serviceUrl("v1/business-discovery"), {
      method: "POST",
      body: JSON.stringify(providerPayload(request, run.teamId, run.requestedById)),
      headers: {
        accept: "application/json",
        authorization: `Bearer ${env.SOVEREIGN_COMMAND_API_TOKEN}`,
        "content-type": "application/json",
        "idempotency-key": `${run.teamId}:${run.idempotencyKey}`
      },
      redirect: "error",
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`provider_status_${response.status}`);
    const result = serviceResponseSchema.parse(payload);
    if (result.organization_id !== run.teamId || result.requested_by !== run.requestedById) {
      throw new Error("provider_binding_mismatch");
    }

    await prisma.memberAgentRun.update({
      where: { id: run.id },
      data: { status: "completed", resultJson: stringifySecureJson(result.result), completedAt: new Date(), errorCode: null }
    });
    await recordAuditLog({
      action: "member.agent_run.completed",
      actorUserId: run.requestedById,
      metadata: { kind: run.kind, organizationId: run.teamId, resultCount: result.result.businesses.length },
      targetId: run.id,
      targetType: "member_agent_run"
    });
  } catch (error) {
    const errorCode = error instanceof Error && error.name === "AbortError" ? "UPSTREAM_TIMEOUT" : "UPSTREAM_FAILED";
    await prisma.memberAgentRun.updateMany({
      where: { id: run.id, status: "running" },
      data: { status: "failed", errorCode, completedAt: new Date() }
    });
    await recordAuditLog({
      action: "member.agent_run.failed",
      actorUserId: run.requestedById,
      metadata: { errorCode, kind: run.kind, organizationId: run.teamId },
      outcome: "failure",
      severity: "medium",
      targetId: run.id,
      targetType: "member_agent_run"
    });
    logger?.warn({ memberAgentRunId: run.id, err: error }, "Sovereign Command run failed");
  } finally {
    clearTimeout(timeout);
  }
}

export function enqueueMemberAgentRun(runId: string, logger?: FastifyBaseLogger) {
  if (!env.SOVEREIGN_COMMAND_ENABLED || queued.has(runId)) return;
  queued.add(runId);
  setTimeout(() => void runMemberAgentRun(runId, logger).catch((error) => {
    queued.delete(runId);
    logger?.error({ memberAgentRunId: runId, err: error }, "Member agent runner crashed");
  }), 0);
}

export function startMemberAgentRunner(logger?: FastifyBaseLogger) {
  if (!env.SOVEREIGN_COMMAND_ENABLED || pollTimer) return () => undefined;
  const poll = async () => {
    const runs = await prisma.memberAgentRun.findMany({ where: { status: "queued" }, orderBy: { createdAt: "asc" }, take: 4 });
    runs.forEach((run) => enqueueMemberAgentRun(run.id, logger));
  };
  void poll().catch((error) => logger?.error({ err: error }, "Member agent queue recovery failed"));
  pollTimer = setInterval(() => void poll().catch((error) => logger?.error({ err: error }, "Member agent queue polling failed")), 5000);
  return () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = undefined;
  };
}

export function publicMemberAgentRun(run: { id: string; kind: string; status: string; resultJson: string | null; errorCode: string | null; createdAt: Date; startedAt: Date | null; completedAt: Date | null }) {
  return {
    id: run.id,
    kind: run.kind,
    status: run.status,
    result: run.resultJson ? discoveryResultSchema.parse(parseSecureJson(run.resultJson)) : null,
    errorCode: run.errorCode,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    completedAt: run.completedAt
  };
}

export function sovereignCommandAvailability() {
  return {
    available: env.SOVEREIGN_COMMAND_ENABLED,
    state: env.SOVEREIGN_COMMAND_ENABLED ? "ready" as const : "not_configured" as const,
    capabilities: env.SOVEREIGN_COMMAND_ENABLED ? ["business_discovery"] : []
  };
}
