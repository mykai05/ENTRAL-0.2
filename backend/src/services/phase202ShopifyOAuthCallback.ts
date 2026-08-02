import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma, withTenantSession } from "../db.js";
import { recordAuditLog, type AuditLogInput } from "./audit.js";

const callbackStoreInclude = {
  products: {
    orderBy: { updatedAt: "desc" as const }
  }
} satisfies Prisma.ClientMerchStoreInclude;

type CallbackPrincipal = {
  authSubject: string;
  requestId: string;
  tenantId: string;
  userId: string;
};

function assertExactCallbackPrincipal(input: CallbackPrincipal) {
  if (input.authSubject !== input.userId) {
    throw new Error("SHOPIFY_OAUTH_CALLBACK_SUBJECT_MISMATCH");
  }
}

export async function resolvePhase202ShopifyOAuthCallbackStore(
  input: CallbackPrincipal & { storeId: string },
  database: PrismaClient = prisma
) {
  assertExactCallbackPrincipal(input);
  return withTenantSession(database, {
    actionReason: "shopify.oauth.callback.store.read",
    authSubject: input.authSubject,
    requestId: input.requestId,
    tenantId: input.tenantId
  }, async (transaction, identity) => {
    if (identity.tenantId !== input.tenantId) {
      throw new Error("SHOPIFY_OAUTH_CALLBACK_TENANT_MISMATCH");
    }
    return transaction.clientMerchStore.findFirst({
      include: callbackStoreInclude,
      where: {
        actorId: identity.actorId,
        id: input.storeId,
        organizationId: identity.organizationId,
        tenantId: identity.tenantId,
        userId: input.userId
      }
    });
  });
}

export async function recordPhase202ShopifyOAuthCallbackAudit(
  input: CallbackPrincipal,
  entry: AuditLogInput,
  database: PrismaClient = prisma
) {
  assertExactCallbackPrincipal(input);
  if (entry.actorUserId !== input.userId) {
    throw new Error("SHOPIFY_OAUTH_CALLBACK_AUDIT_ACTOR_MISMATCH");
  }
  return withTenantSession(database, {
    actionReason: "shopify.oauth.callback.audit.write",
    authSubject: input.authSubject,
    requestId: input.requestId,
    tenantId: input.tenantId
  }, async (transaction, identity) => {
    if (identity.tenantId !== input.tenantId) {
      throw new Error("SHOPIFY_OAUTH_CALLBACK_TENANT_MISMATCH");
    }
    return recordAuditLog({
      ...entry,
      requestId: entry.requestId ?? input.requestId
    }, transaction);
  });
}
