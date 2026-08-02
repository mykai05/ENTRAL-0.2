import type { FastifyInstance, FastifyRequest } from "fastify";
import { clearAuthCookie, requireAuth, setPrivateNoStoreHeaders, type AuthUser } from "../auth.js";
import { env } from "../env.js";
import { deleteAccountSchema } from "../schemas.js";
import { recordAuditLog } from "../services/audit.js";
import {
  buildAccountExport,
  deidentifyAccount,
  Phase202PrivacyError,
  summarizeAccountExport
} from "../services/privacy.js";
import { consumeTenantRateLimit } from "../services/phase202SupportAccess.js";

function durableRecentStepUp(user: AuthUser) {
  const stepUpAt = user.stepUpAt ? Date.parse(user.stepUpAt) : Number.NaN;
  return user.tokenVersion === 2 && Boolean(user.sessionId && user.actorId)
    && Number.isFinite(stepUpAt)
    && stepUpAt <= Date.now()
    && Date.now() - stepUpAt <= env.MFA_STEP_UP_TTL_SECONDS * 1000;
}

function idempotencyKey(request: FastifyRequest) {
  const raw = request.headers["idempotency-key"] ?? request.headers["x-idempotency-key"];
  if (typeof raw !== "string" || !/^[A-Za-z0-9._:-]{8,128}$/u.test(raw)) {
    throw new Phase202PrivacyError(
      "IDEMPOTENCY_KEY_REQUIRED",
      "A bounded idempotency-key header is required.",
      400
    );
  }
  return raw;
}

export async function accountRoutes(app: FastifyInstance) {
  app.addHook("onRequest", (_request, reply, done) => {
    setPrivateNoStoreHeaders(reply);
    done();
  });

  app.get("/account/export", {
    preHandler: requireAuth,
    config: { rateLimit: { max: 10, timeWindow: "10 minutes" } }
  }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    if (currentUser.session === "support") {
      return reply.code(403).send({
        error: "Forbidden",
        reason_code: "SUPPORT_PERSONAL_ACCOUNT_ACCESS_FORBIDDEN",
        message: "Support sessions cannot access personal account controls."
      });
    }

    if (!durableRecentStepUp(currentUser)) {
      return reply.code(403).send({
        error: "Forbidden",
        reason_code: "RECENT_MFA_STEP_UP_REQUIRED",
        message: "A durable session with recent MFA step-up is required for an account export."
      });
    }
    if (currentUser.session === "member" && currentUser.tenantId) {
      const limit = await consumeTenantRateLimit({
        authSubject: currentUser.sub,
        bucket: "account-export",
        limit: 10,
        requestId: request.id,
        tenantId: currentUser.tenantId,
        windowSeconds: 600
      });
      if (limit.blocked) {
        return reply.code(429).send({ error: "Too Many Requests", reason_code: "TENANT_RATE_LIMIT_EXCEEDED" });
      }
    }
    let exportData: Awaited<ReturnType<typeof buildAccountExport>>;
    try {
      exportData = await buildAccountExport({
        authSubject: currentUser.sub,
        requestId: request.id,
        sessionId: currentUser.sessionId!,
        sessionType: currentUser.session,
        tenantId: currentUser.tenantId
      });
    } catch (error) {
      if (error instanceof Phase202PrivacyError) {
        return reply.code(error.statusCode).send({
          error: "Forbidden",
          reason_code: error.code,
          message: error.message
        });
      }
      throw error;
    }
    await recordAuditLog({
      action: "account.data_exported",
      actorRole: currentUser.role,
      actorUserId: currentUser.sub,
      metadata: {
        summary: summarizeAccountExport(exportData)
      },
      requestId: request.id,
      severity: "low",
      targetId: currentUser.sub,
      targetType: "account"
    }).catch((error) => {
      request.log.warn({ err: error }, "Account export audit log write failed");
    });

    return reply
      .header("content-disposition", `attachment; filename="entral-account-export-${currentUser.sub}.json"`)
      .send(exportData);
  });

  app.delete("/account", {
    preHandler: requireAuth,
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "10 minutes"
      }
    }
  }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    if (currentUser.session === "support") {
      return reply.code(403).send({
        error: "Forbidden",
        reason_code: "SUPPORT_PERSONAL_ACCOUNT_ACCESS_FORBIDDEN",
        message: "Support sessions cannot access personal account controls."
      });
    }

    if (!durableRecentStepUp(currentUser)) {
      return reply.code(403).send({
        error: "Forbidden",
        reason_code: "RECENT_MFA_STEP_UP_REQUIRED",
        message: "A durable session with recent MFA step-up is required."
      });
    }
    let operationKey: string;
    try {
      operationKey = idempotencyKey(request);
    } catch (error) {
      if (error instanceof Phase202PrivacyError) {
        return reply.code(error.statusCode).send({ error: "Invalid Request", reason_code: error.code, message: error.message });
      }
      throw error;
    }
    const input = deleteAccountSchema.parse(request.body);
    if (currentUser.session === "member" && currentUser.tenantId) {
      const limit = await consumeTenantRateLimit({
        authSubject: currentUser.sub,
        bucket: "account-deidentification",
        limit: 5,
        requestId: request.id,
        tenantId: currentUser.tenantId,
        windowSeconds: 600
      });
      if (limit.blocked) {
        return reply.code(429).send({ error: "Too Many Requests", reason_code: "TENANT_RATE_LIMIT_EXCEEDED" });
      }
    }
    try {
      const result = await deidentifyAccount({
        authSubject: currentUser.sub,
        idempotencyKey: operationKey,
        password: input.password,
        requestId: request.id,
        sessionId: currentUser.sessionId!
      });
      clearAuthCookie(reply);
      return reply.send({
        ok: true,
        message: "Account access deidentified. Tenant records and required evidence were retained.",
        ...result
      });
    } catch (error) {
      if (error instanceof Phase202PrivacyError) {
        return reply.code(error.statusCode).send({
          contract_version: "1.0.0",
          schema_version: 1,
          status: error.statusCode === 503 ? "BLOCKED" : "REJECTED",
          reason_code: error.code,
          message: error.message,
          tenant_records: "RETAINED"
        });
      }
      throw error;
    }
  });
}
