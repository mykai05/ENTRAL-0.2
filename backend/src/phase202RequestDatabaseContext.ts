import type { FastifyInstance, FastifyReply } from "fastify";
import {
  prisma,
  resolveSingleActiveTenant,
  withScopedPrismaTransaction,
  withTenantSession
} from "./db.js";

function tenantScopeUnavailable(reply: FastifyReply) {
  return reply.code(403)
    .send({
      error: "Forbidden",
      message: "This operation requires one exact active tenant scope.",
      reason_code: "EXACT_ACTIVE_TENANT_REQUIRED"
    });
}

export function installPhase202TenantRequestContext(app: FastifyInstance) {
  app.addHook("onRoute", (routeOptions) => {
    const originalHandler = routeOptions.handler;
    routeOptions.handler = async function scopedTenantHandler(request, reply) {
      const currentUser = request.user;
      if (!currentUser) return originalHandler.call(this, request, reply);
      if (currentUser.session === "support") return tenantScopeUnavailable(reply);

      const resolved = currentUser.tenantId && currentUser.organizationId
        ? { organizationId: currentUser.organizationId, tenantId: currentUser.tenantId }
        : await resolveSingleActiveTenant(prisma, {
          authSubject: currentUser.sub,
          requestId: request.id
        });
      if (!resolved) return tenantScopeUnavailable(reply);

      return withTenantSession(prisma, {
        actionReason: `api.${request.method.toLowerCase()}.${routeOptions.url}`,
        authSubject: currentUser.sub,
        requestId: request.id,
        tenantId: resolved.tenantId
      }, async (transaction, identity) => {
        if (identity.organizationId !== resolved.organizationId) return tenantScopeUnavailable(reply);
        return withScopedPrismaTransaction(transaction, async () => originalHandler.call(this, request, reply));
      });
    };
  });
}
