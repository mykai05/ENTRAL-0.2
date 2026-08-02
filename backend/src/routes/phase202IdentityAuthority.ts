import type { DependencyUnavailableResult } from "@entral/contracts";
import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import { clearAuthCookie, requireAuth, setPrivateNoStoreHeaders, type AuthUser } from "../auth.js";
import {
  acceptInvitation,
  inviteMember,
  listMemberships,
  transitionMember
} from "../services/phase202Membership.js";
import {
  Phase202MfaError,
  beginTotpEnrollment,
  confirmTotpEnrollment,
  listMfaFactors,
  regenerateRecoveryCodes,
  removeMfaFactor,
  verifyMfaStepUp
} from "../services/phase202Mfa.js";
import {
  durableSessionsAvailable,
  listSessions,
  readSupportSession,
  revokeAllSessions,
  revokeSession
} from "../services/phase202SessionBroker.js";
import {
  Phase202SupportAccessError,
  consumeTenantRateLimit,
  elevateSupportAccess,
  issueSupportAccess,
  listSupportAccess,
  revokeSupportAccess
} from "../services/phase202SupportAccess.js";
import { listSupportTasks, updateSupportTaskStatus } from "../services/phase202SupportOperations.js";

const uuidSchema = z.string().uuid();
const idempotencyKeySchema = z.string().trim().min(12).max(255);
const requestPurposeSchema = z.string().trim().min(1).max(500);
const roleSchema = z.enum(["MEMBER", "TENANT_ADMIN", "OWNER"]);
const sessionParamsSchema = z.object({ sessionId: uuidSchema }).strict();
const factorParamsSchema = z.object({ factorId: uuidSchema }).strict();
const grantParamsSchema = z.object({ grantId: uuidSchema }).strict();
const memberParamsSchema = z.object({ subjectUserId: z.string().trim().min(1).max(255) }).strict();
const codeSchema = z.string().trim().min(6).max(32);
const totpConfirmationSchema = z.object({
  code: codeSchema,
  factor_id: uuidSchema
}).strict();
const stepUpSchema = z.object({ code: codeSchema }).strict();
const invitationSchema = z.object({
  email: z.string().trim().email().max(320),
  idempotency_key: idempotencyKeySchema,
  role: roleSchema
}).strict();
const invitationAcceptanceSchema = z.object({
  idempotency_key: idempotencyKeySchema,
  token: z.string().trim().min(32).max(512)
}).strict();
const membershipTransitionSchema = z.object({
  action: z.enum(["ROLE_CHANGE", "SUSPEND", "REMOVE"]),
  idempotency_key: idempotencyKeySchema,
  role: roleSchema.optional()
}).strict().superRefine((value, context) => {
  if (value.action === "ROLE_CHANGE" && !value.role) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["role"], message: "role is required for ROLE_CHANGE." });
  }
  if (value.action !== "ROLE_CHANGE" && value.role !== undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["role"], message: "role is accepted only for ROLE_CHANGE." });
  }
});
const supportIssueSchema = z.object({
  expires_at: z.string().datetime({ offset: true }),
  purpose: requestPurposeSchema,
  read_scopes: z.array(z.string().trim().min(1).max(160)).min(1).max(50),
  support_actor_id: uuidSchema
}).strict();
const supportElevationSchema = z.object({
  expires_at: z.string().datetime({ offset: true }),
  purpose: requestPurposeSchema,
  write_scopes: z.array(z.string().trim().min(1).max(160)).min(1).max(50)
}).strict();
const supportTaskQuerySchema = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) }).strict();
const supportTaskParamsSchema = z.object({ taskId: z.string().trim().min(1).max(255) }).strict();
const supportTaskMutationSchema = z.object({ status: z.enum(["TODO", "IN_PROGRESS", "DONE", "ARCHIVED"]) }).strict();
const tenantRateLimitPolicies = {
  "account-security-read": { bucket: "identity.account_security.read", limit: 120, windowSeconds: 60 },
  "membership-mutation": { bucket: "identity.membership.mutation", limit: 30, windowSeconds: 60 },
  "support-access-mutation": { bucket: "identity.support_access.mutation", limit: 20, windowSeconds: 60 },
  "support-operation": { bucket: "identity.support.operation", limit: 60, windowSeconds: 60 }
} as const;

type Dependency = DependencyUnavailableResult["dependency"];

function dependencyBlocked(dependency: Dependency, reasonCode: string, retryable: boolean): DependencyUnavailableResult {
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    status: "BLOCKED",
    dependency,
    reason_code: reasonCode,
    retryable,
    occurred_at: new Date().toISOString()
  };
}

function sendDependencyBlocked(
  reply: FastifyReply,
  dependency: Dependency,
  reasonCode: string,
  retryable = true
) {
  return reply.code(503).send(dependencyBlocked(dependency, reasonCode, retryable));
}

function requireDurableUser(request: FastifyRequest, reply: FastifyReply): (AuthUser & {
  actorId: string;
  sessionId: string;
}) | null {
  const currentUser = request.user;
  if (!currentUser) {
    reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    return null;
  }
  if (currentUser.session === "support") {
    reply.code(403).send({
      error: "Forbidden",
      message: "Support sessions are restricted to exact-grant readback.",
      reason_code: "SUPPORT_SESSION_SCOPE_RESTRICTED"
    });
    return null;
  }
  if (currentUser.tokenVersion !== 2 || !currentUser.sessionId || !currentUser.actorId) {
    reply.code(403).send({
      error: "Forbidden",
      message: "A durable Phase 202 session is required.",
      reason_code: "DURABLE_SESSION_REQUIRED"
    });
    return null;
  }
  if (!durableSessionsAvailable()) {
    sendDependencyBlocked(reply, "SESSION_STORE", "SESSION_STORE_UNAVAILABLE", true);
    return null;
  }
  return currentUser as AuthUser & { actorId: string; sessionId: string };
}

function requireSupportUser(request: FastifyRequest, reply: FastifyReply): AuthUser & {
  actorId: string;
  organizationId: string;
  sessionId: string;
  supportGrantId: string;
  tenantId: string;
} | null {
  const currentUser = request.user;
  if (!currentUser) {
    reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    return null;
  }
  if (currentUser.session !== "support" || currentUser.tokenVersion !== 2
    || !currentUser.sessionId || !currentUser.actorId || !currentUser.organizationId
    || !currentUser.tenantId || !currentUser.supportGrantId) {
    reply.code(403).send({
      error: "Forbidden",
      message: "An exact-grant support session is required.",
      reason_code: "SUPPORT_SESSION_REQUIRED"
    });
    return null;
  }
  if (!durableSessionsAvailable()) {
    sendDependencyBlocked(reply, "SESSION_STORE", "SESSION_STORE_UNAVAILABLE", true);
    return null;
  }
  return currentUser as AuthUser & {
    actorId: string;
    organizationId: string;
    sessionId: string;
    supportGrantId: string;
    tenantId: string;
  };
}

function requireIdempotencyKey(request: FastifyRequest, reply: FastifyReply) {
  const raw = request.headers["idempotency-key"];
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const parsed = idempotencyKeySchema.safeParse(candidate);
  if (!parsed.success) {
    reply.code(400).send({
      error: "Bad Request",
      message: "A valid idempotency-key header is required.",
      reason_code: "IDEMPOTENCY_KEY_INVALID"
    });
    return null;
  }
  return parsed.data;
}

function requireTenantUser(request: FastifyRequest, reply: FastifyReply): AuthUser & {
  actorId: string;
  organizationId: string;
  sessionId: string;
  tenantId: string;
} | null {
  const currentUser = requireDurableUser(request, reply);
  if (!currentUser) return null;
  if (currentUser.session !== "member" || !currentUser.tenantId || !currentUser.organizationId) {
    reply.code(403).send({
      error: "Forbidden",
      message: "A tenant-bound member session is required.",
      reason_code: "TENANT_SESSION_REQUIRED"
    });
    return null;
  }
  return currentUser as AuthUser & {
    actorId: string;
    organizationId: string;
    sessionId: string;
    tenantId: string;
  };
}

function knownMembershipError(error: Error) {
  const statusByCode: Readonly<Record<string, number>> = {
    INVALID_INVITATION: 400,
    INVALID_OR_EXPIRED_INVITATION: 404,
    MEMBERSHIP_ADMIN_REQUIRED: 403,
    MEMBERSHIP_ALREADY_ACTIVE: 409,
    MEMBERSHIP_IDEMPOTENCY_CONFLICT: 409,
    MEMBERSHIP_NOT_FOUND: 404,
    MEMBERSHIP_ROLE_REQUIRED: 400,
    LAST_ACTIVE_OWNER_REQUIRED: 409,
    OWNER_AUTHORITY_REQUIRED: 403,
    TENANT_NOT_FOUND: 404,
    ACTIVE_HUMAN_ACTOR_REQUIRED: 403,
    ACTIVE_TENANT_ASSIGNMENT_REQUIRED: 403,
    TENANT_ACTOR_BINDING_MISMATCH: 403
  };
  const statusCode = statusByCode[error.message];
  return statusCode ? { code: error.message, statusCode } : null;
}

function structuredServiceError(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { code?: unknown; message?: unknown; statusCode?: unknown };
  if (typeof candidate.code !== "string" || typeof candidate.message !== "string"
    || typeof candidate.statusCode !== "number" || candidate.statusCode < 400 || candidate.statusCode > 599) return null;
  return { code: candidate.code, message: candidate.message, statusCode: candidate.statusCode };
}

function sendMappedError(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  if (error instanceof ZodError) {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Input validation failed.",
      issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
    });
  }

  const structured = structuredServiceError(error);
  if (structured) {
    if (structured.code.startsWith("SECRET_BROKER_") && structured.statusCode >= 500) {
      return sendDependencyBlocked(reply, "SECRET_BROKER", structured.code, true);
    }
    return reply.code(structured.statusCode).send({
      code: structured.code,
      error: structured.statusCode >= 500 ? "Service Unavailable" : "Request Error",
      message: structured.message
    });
  }

  if (error instanceof Error) {
    const membership = knownMembershipError(error);
    if (membership) {
      return reply.code(membership.statusCode).send({
        code: membership.code,
        error: membership.statusCode >= 500 ? "Service Unavailable" : "Request Error",
        message: error.message.replaceAll("_", " ").toLowerCase()
      });
    }
    if (error.message === "TARGET_ACTOR_NOT_FOUND") {
      return sendDependencyBlocked(reply, "AUTHORITY_STORE", "TARGET_ACTOR_NOT_FOUND", false);
    }
    if (error.message === "DURABLE_SESSION_REQUIRED") {
      return reply.code(401).send({ error: "Unauthorized", message: "A durable session is required.", reason_code: error.message });
    }
    if (error.message === "ACTIVE_SUPPORT_SESSION_REQUIRED") {
      clearAuthCookie(reply);
      return reply.code(401).send({
        error: "Unauthorized",
        message: "The support session is no longer active.",
        reason_code: error.message
      });
    }
  }

  request.log.error({ error }, "Phase 202 identity authority operation failed");
  return sendDependencyBlocked(reply, "AUTHORITY_STORE", "AUTHORITY_STORE_UNAVAILABLE", true);
}

async function execute(
  request: FastifyRequest,
  reply: FastifyReply,
  operation: () => Promise<unknown>
) {
  try {
    return await operation();
  } catch (error) {
    return sendMappedError(request, reply, error);
  }
}

async function consumePolicy(
  currentUser: AuthUser & { tenantId: string },
  _request: FastifyRequest,
  policy: (typeof tenantRateLimitPolicies)[keyof typeof tenantRateLimitPolicies]
) {
  return consumeTenantRateLimit({
    authSubject: currentUser.sub,
    tenantId: currentUser.tenantId,
    bucket: policy.bucket,
    limit: policy.limit,
    windowSeconds: policy.windowSeconds,
    // Rate-limit deduplication must never trust a client-controlled correlation header.
    requestId: randomUUID()
  });
}

function sendRateLimitResult(reply: FastifyReply, result: Awaited<ReturnType<typeof consumeTenantRateLimit>>) {
  const payload = {
    blocked: result.blocked,
    limit: result.limit,
    request_count: result.requestCount,
    window_started_at: result.windowStartedAt.toISOString()
  };
  if (result.blocked) {
    return reply.code(429).send({
      ...payload,
      error: "Too Many Requests",
      message: "The tenant rate limit was exceeded.",
      reason_code: "TENANT_RATE_LIMIT_EXCEEDED"
    });
  }
  return reply.send(payload);
}

async function enforcePolicy(
  currentUser: AuthUser & { tenantId: string },
  request: FastifyRequest,
  reply: FastifyReply,
  policy: (typeof tenantRateLimitPolicies)[keyof typeof tenantRateLimitPolicies]
) {
  const result = await consumePolicy(currentUser, request, policy);
  if (result.blocked) {
    sendRateLimitResult(reply, result);
    return false;
  }
  return true;
}

export async function phase202IdentityAuthorityRoutes(app: FastifyInstance) {
  app.addHook("onRequest", (_request, reply, done) => {
    setPrivateNoStoreHeaders(reply);
    done();
  });

  app.addHook("preHandler", requireAuth);

  app.get("/identity/support-session", async (request, reply) => {
    const currentUser = requireSupportUser(request, reply);
    if (!currentUser) return;
    return execute(request, reply, async () => reply.send(
      await readSupportSession({
        requestId: request.id,
        sessionId: currentUser.sessionId,
        supportGrantId: currentUser.supportGrantId,
        userId: currentUser.sub
      })
    ));
  });

  app.get("/identity/support-session/tasks", async (request, reply) => {
    const currentUser = requireSupportUser(request, reply);
    if (!currentUser) return;
    if (!await enforcePolicy(currentUser, request, reply, tenantRateLimitPolicies["support-operation"])) return;
    return execute(request, reply, async () => {
      const query = supportTaskQuerySchema.parse(request.query);
      return reply.send(await listSupportTasks({
        authSubject: currentUser.sub,
        limit: query.limit,
        requestId: request.id,
        supportGrantId: currentUser.supportGrantId
      }));
    });
  });

  app.patch("/identity/support-session/tasks/:taskId", async (request, reply) => {
    const currentUser = requireSupportUser(request, reply);
    if (!currentUser) return;
    if (!await enforcePolicy(currentUser, request, reply, tenantRateLimitPolicies["support-operation"])) return;
    return execute(request, reply, async () => {
      const params = supportTaskParamsSchema.parse(request.params);
      const body = supportTaskMutationSchema.parse(request.body);
      return reply.send(await updateSupportTaskStatus({
        authSubject: currentUser.sub,
        requestId: request.id,
        status: body.status,
        supportGrantId: currentUser.supportGrantId,
        taskId: params.taskId
      }));
    });
  });

  app.get("/identity/sessions", async (request, reply) => {
    const currentUser = requireDurableUser(request, reply);
    if (!currentUser) return;
    return execute(request, reply, async () => reply.send({
      sessions: await listSessions(currentUser.sub, currentUser.sessionId)
    }));
  });

  app.delete("/identity/sessions/:sessionId", async (request, reply) => {
    const currentUser = requireDurableUser(request, reply);
    if (!currentUser) return;
    const idempotencyKey = requireIdempotencyKey(request, reply);
    if (!idempotencyKey) return;
    return execute(request, reply, async () => {
      const { sessionId } = sessionParamsSchema.parse(request.params);
      const result = await revokeSession(currentUser.sub, sessionId, request.id, idempotencyKey);
      if (sessionId === currentUser.sessionId) clearAuthCookie(reply);
      return reply.send(result.receipt);
    });
  });

  app.delete("/identity/sessions", async (request, reply) => {
    const currentUser = requireDurableUser(request, reply);
    if (!currentUser) return;
    const idempotencyKey = requireIdempotencyKey(request, reply);
    if (!idempotencyKey) return;
    return execute(request, reply, async () => {
      const result = await revokeAllSessions(currentUser.sub, request.id, idempotencyKey);
      clearAuthCookie(reply);
      return reply.send(result.receipt);
    });
  });

  app.get("/identity/mfa/factors", async (request, reply) => {
    const currentUser = requireDurableUser(request, reply);
    if (!currentUser) return;
    return execute(request, reply, async () => reply.send({ factors: await listMfaFactors(currentUser.sub) }));
  });

  app.post("/identity/mfa/totp/enroll", async (request, reply) => {
    const currentUser = requireDurableUser(request, reply);
    if (!currentUser) return;
    const idempotencyKey = requireIdempotencyKey(request, reply);
    if (!idempotencyKey) return;
    return execute(request, reply, async () => {
      const result = await beginTotpEnrollment({
        email: currentUser.email,
        idempotencyKey,
        requestId: randomUUID(),
        sessionId: currentUser.sessionId,
        userId: currentUser.sub
      });
      return reply.code(201).send({
        replayed: result.replayed,
        receipt: result.receipt,
        one_time_material: result.enrollment
      });
    });
  });

  app.post("/identity/mfa/totp/confirm", async (request, reply) => {
    const currentUser = requireDurableUser(request, reply);
    if (!currentUser) return;
    const idempotencyKey = requireIdempotencyKey(request, reply);
    if (!idempotencyKey) return;
    return execute(request, reply, async () => {
      const input = totpConfirmationSchema.parse(request.body);
      const result = await confirmTotpEnrollment({
        code: input.code,
        factorId: input.factor_id,
        idempotencyKey,
        requestId: randomUUID(),
        sessionId: currentUser.sessionId,
        userId: currentUser.sub
      });
      return reply.send({
        replayed: result.replayed,
        receipt: result.receipt,
        one_time_material: result.recovery_codes ? { recovery_codes: result.recovery_codes } : null
      });
    });
  });

  app.post("/identity/mfa/step-up", async (request, reply) => {
    const currentUser = requireDurableUser(request, reply);
    if (!currentUser) return;
    const idempotencyKey = requireIdempotencyKey(request, reply);
    if (!idempotencyKey) return;
    return execute(request, reply, async () => {
      const input = stepUpSchema.parse(request.body);
      const result = await verifyMfaStepUp({
        code: input.code,
        idempotencyKey,
        requestId: randomUUID(),
        sessionId: currentUser.sessionId,
        userId: currentUser.sub
      });
      return reply.send({ replayed: result.replayed, receipt: result.receipt, one_time_material: null });
    });
  });

  app.post("/identity/mfa/recovery/regenerate", async (request, reply) => {
    const currentUser = requireDurableUser(request, reply);
    if (!currentUser) return;
    const idempotencyKey = requireIdempotencyKey(request, reply);
    if (!idempotencyKey) return;
    return execute(request, reply, async () => {
      const result = await regenerateRecoveryCodes({
        idempotencyKey,
        requestId: randomUUID(),
        sessionId: currentUser.sessionId,
        userId: currentUser.sub
      });
      return reply.send({
        replayed: result.replayed,
        receipt: result.receipt,
        one_time_material: result.recovery_codes ? { recovery_codes: result.recovery_codes } : null
      });
    });
  });

  app.delete("/identity/mfa/:factorId", async (request, reply) => {
    const currentUser = requireDurableUser(request, reply);
    if (!currentUser) return;
    const idempotencyKey = requireIdempotencyKey(request, reply);
    if (!idempotencyKey) return;
    return execute(request, reply, async () => {
      const { factorId } = factorParamsSchema.parse(request.params);
      const result = await removeMfaFactor({
        factorId,
        idempotencyKey,
        requestId: randomUUID(),
        sessionId: currentUser.sessionId,
        userId: currentUser.sub
      });
      return reply.send({ replayed: result.replayed, receipt: result.receipt, one_time_material: null });
    });
  });

  app.get("/identity/memberships", async (request, reply) => {
    const currentUser = requireTenantUser(request, reply);
    if (!currentUser) return;
    return execute(request, reply, async () => {
      if (!await enforcePolicy(currentUser, request, reply, tenantRateLimitPolicies["account-security-read"])) return;
      return reply.send({ memberships: await listMemberships(currentUser.sub, currentUser.tenantId) });
    });
  });

  app.post("/identity/memberships/invitations", async (request, reply) => {
    const currentUser = requireTenantUser(request, reply);
    if (!currentUser) return;
    return execute(request, reply, async () => {
      const input = invitationSchema.parse(request.body);
      if (!await enforcePolicy(currentUser, request, reply, tenantRateLimitPolicies["membership-mutation"])) return;
      return reply.code(201).send(await inviteMember({
        authSubject: currentUser.sub,
        tenantId: currentUser.tenantId,
        requestId: request.id,
        email: input.email,
        role: input.role,
        idempotencyKey: input.idempotency_key
      }));
    });
  });

  app.post("/identity/memberships/invitations/accept", async (request, reply) => {
    const currentUser = requireDurableUser(request, reply);
    if (!currentUser) return;
    return execute(request, reply, async () => {
      const input = invitationAcceptanceSchema.parse(request.body);
      return reply.send(await acceptInvitation({
        authSubject: currentUser.sub,
        requestId: request.id,
        token: input.token,
        idempotencyKey: input.idempotency_key
      }));
    });
  });

  app.patch("/identity/memberships/:subjectUserId", async (request, reply) => {
    const currentUser = requireTenantUser(request, reply);
    if (!currentUser) return;
    return execute(request, reply, async () => {
      const { subjectUserId } = memberParamsSchema.parse(request.params);
      const input = membershipTransitionSchema.parse(request.body);
      if (!await enforcePolicy(currentUser, request, reply, tenantRateLimitPolicies["membership-mutation"])) return;
      return reply.send(await transitionMember({
        action: input.action,
        authSubject: currentUser.sub,
        tenantId: currentUser.tenantId,
        subjectUserId,
        role: input.role,
        requestId: request.id,
        idempotencyKey: input.idempotency_key
      }));
    });
  });

  app.get("/identity/support-access", async (request, reply) => {
    const currentUser = requireTenantUser(request, reply);
    if (!currentUser) return;
    return execute(request, reply, async () => {
      if (!await enforcePolicy(currentUser, request, reply, tenantRateLimitPolicies["account-security-read"])) return;
      return reply.send({ grants: await listSupportAccess(currentUser.sub, currentUser.tenantId) });
    });
  });

  app.post("/identity/support-access", async (request, reply) => {
    const currentUser = requireTenantUser(request, reply);
    if (!currentUser) return;
    const idempotencyKey = requireIdempotencyKey(request, reply);
    if (!idempotencyKey) return;
    return execute(request, reply, async () => {
      const input = supportIssueSchema.parse(request.body);
      if (!await enforcePolicy(currentUser, request, reply, tenantRateLimitPolicies["support-access-mutation"])) return;
      return reply.code(201).send(await issueSupportAccess({
        authSubject: currentUser.sub,
        tenantId: currentUser.tenantId,
        idempotencyKey,
        requestId: randomUUID(),
        supportActorId: input.support_actor_id,
        purpose: input.purpose,
        readScopes: input.read_scopes,
        expiresAt: new Date(input.expires_at)
      }));
    });
  });

  app.post("/identity/support-access/:grantId/elevate", async (request, reply) => {
    const currentUser = requireTenantUser(request, reply);
    if (!currentUser) return;
    const idempotencyKey = requireIdempotencyKey(request, reply);
    if (!idempotencyKey) return;
    return execute(request, reply, async () => {
      const { grantId } = grantParamsSchema.parse(request.params);
      const input = supportElevationSchema.parse(request.body);
      if (!await enforcePolicy(currentUser, request, reply, tenantRateLimitPolicies["support-access-mutation"])) return;
      return reply.send(await elevateSupportAccess({
        authSubject: currentUser.sub,
        tenantId: currentUser.tenantId,
        idempotencyKey,
        requestId: randomUUID(),
        grantId,
        purpose: input.purpose,
        writeScopes: input.write_scopes,
        expiresAt: new Date(input.expires_at),
        sessionId: currentUser.sessionId
      }));
    });
  });

  app.delete("/identity/support-access/:grantId", async (request, reply) => {
    const currentUser = requireTenantUser(request, reply);
    if (!currentUser) return;
    const idempotencyKey = requireIdempotencyKey(request, reply);
    if (!idempotencyKey) return;
    return execute(request, reply, async () => {
      const { grantId } = grantParamsSchema.parse(request.params);
      if (!await enforcePolicy(currentUser, request, reply, tenantRateLimitPolicies["support-access-mutation"])) return;
      return reply.send(await revokeSupportAccess({
        authSubject: currentUser.sub,
        tenantId: currentUser.tenantId,
        idempotencyKey,
        requestId: randomUUID(),
        grantId
      }));
    });
  });

}
