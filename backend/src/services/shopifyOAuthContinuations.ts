import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma, withTenantSession } from "../db.js";
import { isProduction } from "../env.js";
import {
  createSecretReferenceInTransaction,
  readSecretValueInTransaction,
  revokeSecretReferenceInTransaction,
  rotateSecretReferenceInTransaction,
  type SecretBrokerTenantIdentity,
  type SecretBrokerTenantPrincipal,
  type SecretReferenceDescriptor
} from "./phase202SecretBroker.js";

const shopifyOAuthProvider = "shopify" as const;
const shopifyOAuthPurpose = "shopify-oauth-continuation" as const;

function childIdempotencyKey(parent: string, operation: string) {
  return `shopify:${operation}:${createHash("sha256").update(parent).digest("base64url")}`;
}

async function recordedSecretMutation(
  transaction: Prisma.TransactionClient,
  tenantId: string,
  idempotencyKey: string
) {
  return transaction.secretMutationReceipt.findUnique({
    select: { id: true },
    where: { tenantId_idempotencyKey: { idempotencyKey, tenantId } }
  });
}

export type ShopifyOAuthContinuationPayload = {
  connectorApproval: boolean;
  countryCode: string;
  dryRun: boolean;
  includeCollections: boolean;
  includeProducts: boolean;
  includeStoreShell: boolean;
  liveUnlockPhrase: string | null;
  maxProducts: number;
  note: string | null;
  ownerEmail: string | null;
  requestedShopName: string | null;
  storeType: "client_transfer" | "development";
};

export type ShopifyOAuthContinuationRecord = {
  authorizationVersion: number;
  auditLogId: string | null;
  consumedAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
  id: string;
  payload: ShopifyOAuthContinuationPayload;
  payloadReference: Pick<SecretReferenceDescriptor, "id" | "provider" | "purpose" | "version" | "revokedAt">;
  resultAuditLogId: string | null;
  resultSummary: string | null;
  shopDomain: string;
  stateNonce: string;
  status: string;
  storeId: string;
  updatedAt: Date;
  userId: string;
};

export type ShopifyOAuthContinuationPrincipal = SecretBrokerTenantPrincipal;

type ShopifyOAuthContinuationRow = Omit<ShopifyOAuthContinuationRecord, "payload" | "payloadReference"> & {
  actorId: string | null;
  businessId: string | null;
  createdBy: string | null;
  organizationId: string | null;
  ownedBy: string | null;
  payloadSecretReferenceId: string | null;
  tenantId: string | null;
};

function principalSessionContext(input: ShopifyOAuthContinuationPrincipal, actionReason: string) {
  return typeof input.authSubject === "string"
    ? { actionReason, authSubject: input.authSubject, requestId: input.requestId, tenantId: input.tenantId }
    : { actionReason, requestId: input.requestId, serviceAppUserId: input.serviceAppUserId, tenantId: input.tenantId };
}

function assertTargetUser(input: ShopifyOAuthContinuationPrincipal, userId: string) {
  if (typeof input.authSubject === "string" && input.authSubject !== userId) {
    throw new Error("SHOPIFY_OAUTH_CONTINUATION_PRINCIPAL_USER_MISMATCH");
  }
}

function assertContinuationScope(row: ShopifyOAuthContinuationRow, identity: SecretBrokerTenantIdentity) {
  if (row.tenantId !== identity.tenantId || row.organizationId !== identity.organizationId) {
    throw new Error("SHOPIFY_OAUTH_CONTINUATION_TENANT_SCOPE_MISMATCH");
  }
  if (!row.payloadSecretReferenceId) throw new Error("SHOPIFY_OAUTH_CONTINUATION_SECRET_REFERENCE_REQUIRED");
}

function assertPayload(value: unknown): ShopifyOAuthContinuationPayload {
  if (!value || typeof value !== "object") throw new Error("SHOPIFY_OAUTH_CONTINUATION_SECRET_INVALID");
  const payload = value as ShopifyOAuthContinuationPayload;
  if (typeof payload.connectorApproval !== "boolean"
    || typeof payload.countryCode !== "string" || !/^[A-Z]{2}$/.test(payload.countryCode)
    || typeof payload.dryRun !== "boolean"
    || typeof payload.includeCollections !== "boolean"
    || typeof payload.includeProducts !== "boolean"
    || typeof payload.includeStoreShell !== "boolean"
    || !Number.isInteger(payload.maxProducts) || payload.maxProducts < 1 || payload.maxProducts > 25
    || (payload.liveUnlockPhrase !== null && typeof payload.liveUnlockPhrase !== "string")
    || (payload.note !== null && typeof payload.note !== "string")
    || (payload.ownerEmail !== null && typeof payload.ownerEmail !== "string")
    || (payload.requestedShopName !== null && typeof payload.requestedShopName !== "string")
    || (payload.storeType !== "client_transfer" && payload.storeType !== "development")) {
    throw new Error("SHOPIFY_OAUTH_CONTINUATION_SECRET_INVALID");
  }
  return payload;
}

function toRecord(
  row: ShopifyOAuthContinuationRow,
  payload: ShopifyOAuthContinuationPayload,
  descriptor: SecretReferenceDescriptor
): ShopifyOAuthContinuationRecord {
  return {
    authorizationVersion: row.authorizationVersion,
    auditLogId: row.auditLogId,
    consumedAt: row.consumedAt,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    id: row.id,
    payload,
    payloadReference: {
      id: descriptor.id,
      provider: descriptor.provider,
      purpose: descriptor.purpose,
      revokedAt: descriptor.revokedAt,
      version: descriptor.version
    },
    resultAuditLogId: row.resultAuditLogId,
    resultSummary: row.resultSummary,
    shopDomain: row.shopDomain,
    stateNonce: row.stateNonce,
    status: row.status,
    storeId: row.storeId,
    updatedAt: row.updatedAt,
    userId: row.userId
  };
}

async function readPayload(
  transaction: Prisma.TransactionClient,
  identity: SecretBrokerTenantIdentity,
  row: ShopifyOAuthContinuationRow,
  requestId: string
) {
  assertContinuationScope(row, identity);
  const read = await readSecretValueInTransaction<ShopifyOAuthContinuationPayload>(transaction, identity, {
    accessPurpose: "shopify.oauth.continuation.read",
    expectedProvider: shopifyOAuthProvider,
    expectedPurpose: shopifyOAuthPurpose,
    requestId,
    secretReferenceId: row.payloadSecretReferenceId!
  });
  return toRecord(row, assertPayload(read.value), read.descriptor);
}

async function transitionContinuation(
  transaction: Prisma.TransactionClient,
  identity: SecretBrokerTenantIdentity,
  input: {
    continuationId: string;
    idempotencyKey: string;
    requestId: string;
    humanUserId?: string;
    resultAuditLogId?: string | null;
    resultSummary: string;
    status: "consumed" | "failed";
  }
) {
  const terminalFingerprint = createHash("sha256").update(JSON.stringify({
    continuationId: input.continuationId,
    humanUserId: input.humanUserId ?? null,
    resultAuditLogId: input.resultAuditLogId ?? null,
    resultSummary: input.resultSummary,
    status: input.status
  })).digest("hex");
  const row = await transaction.shopifyOAuthContinuation.findFirst({
    where: {
      id: input.continuationId,
      organizationId: identity.organizationId,
      tenantId: identity.tenantId
    }
  }) as ShopifyOAuthContinuationRow | null;
  if (!row) throw new Error("SHOPIFY_OAUTH_CONTINUATION_NOT_FOUND");
  assertContinuationScope(row, identity);
  if (input.humanUserId && row.userId !== input.humanUserId) {
    throw new Error("SHOPIFY_OAUTH_CONTINUATION_PRINCIPAL_USER_MISMATCH");
  }
  const now = new Date();
  if (row.status === "pending") {
    await readSecretValueInTransaction<ShopifyOAuthContinuationPayload>(transaction, identity, {
      accessPurpose: `shopify.oauth.continuation.${input.status}.verify`,
      expectedProvider: shopifyOAuthProvider,
      expectedPurpose: shopifyOAuthPurpose,
      requestId: input.requestId,
      secretReferenceId: row.payloadSecretReferenceId!
    });
    const updated = await transaction.shopifyOAuthContinuation.updateMany({
      data: {
        consumedAt: input.status === "consumed" ? now : null,
        resultAuditLogId: input.resultAuditLogId ?? null,
        resultSummary: input.resultSummary,
        status: input.status,
        updatedAt: now
      },
      where: {
        id: row.id,
        organizationId: identity.organizationId,
        status: "pending",
        tenantId: identity.tenantId
      }
    });
    if (updated.count !== 1) throw new Error("SHOPIFY_OAUTH_CONTINUATION_TRANSITION_CONFLICT");
  } else if (row.status !== input.status) {
    throw new Error("SHOPIFY_OAUTH_CONTINUATION_ALREADY_TERMINAL");
  }
  await revokeSecretReferenceInTransaction(transaction, identity, {
    idempotencyKey: childIdempotencyKey(input.idempotencyKey, "oauth-payload-revoke"),
    requestId: input.requestId,
    revocationPurpose: `shopify.oauth.continuation.${input.status}:${terminalFingerprint}`,
    secretReferenceId: row.payloadSecretReferenceId!
  });
}

export async function createShopifyOAuthContinuation(input: {
  authorizationVersion: number;
  businessId?: string | null;
  expiresAt: Date;
  idempotencyKey: string;
  payload: ShopifyOAuthContinuationPayload;
  shopDomain: string;
  stateNonce: string;
  storeId: string;
  userId: string;
} & ShopifyOAuthContinuationPrincipal) {
  assertTargetUser(input, input.userId);
  return withTenantSession(prisma, principalSessionContext(input, "shopify.oauth.continuation.create"), async (transaction, identity) => {
    const existing = await transaction.shopifyOAuthContinuation.findUnique({
      where: { stateNonce: input.stateNonce }
    }) as ShopifyOAuthContinuationRow | null;
    let payloadDescriptor: SecretReferenceDescriptor;
    const createPayloadKey = childIdempotencyKey(input.idempotencyKey, "oauth-payload-create");
    const rotatePayloadKey = childIdempotencyKey(input.idempotencyKey, "oauth-payload-rotate");

    if (await recordedSecretMutation(transaction, identity.tenantId, createPayloadKey)) {
      const replay = await createSecretReferenceInTransaction(transaction, identity, {
        businessId: input.businessId ?? existing?.businessId ?? null,
        environment: isProduction ? "PRODUCTION" : "DEVELOPMENT",
        idempotencyKey: createPayloadKey,
        provider: shopifyOAuthProvider,
        purpose: shopifyOAuthPurpose,
        requestId: input.requestId,
        secretValue: input.payload
      });
      if (!replay.replayed || !existing || existing.payloadSecretReferenceId !== replay.descriptor.id) {
        throw new Error("SHOPIFY_OAUTH_CONTINUATION_IDEMPOTENT_RESULT_MISSING");
      }
      assertContinuationScope(existing, identity);
      return toRecord(existing, input.payload, replay.descriptor);
    }

    if (await recordedSecretMutation(transaction, identity.tenantId, rotatePayloadKey)) {
      if (!existing?.payloadSecretReferenceId) {
        throw new Error("SHOPIFY_OAUTH_CONTINUATION_IDEMPOTENT_RESULT_MISSING");
      }
      assertContinuationScope(existing, identity);
      const replay = await rotateSecretReferenceInTransaction(transaction, identity, {
        idempotencyKey: rotatePayloadKey,
        requestId: input.requestId,
        rotationPurpose: "shopify.oauth.continuation.replace",
        secretReferenceId: existing.payloadSecretReferenceId,
        secretValue: input.payload
      });
      if (!replay.replayed || existing.payloadSecretReferenceId !== replay.descriptor.id) {
        throw new Error("SHOPIFY_OAUTH_CONTINUATION_IDEMPOTENT_RESULT_MISSING");
      }
      return toRecord(existing, input.payload, replay.descriptor);
    }

    if (existing) {
      assertContinuationScope(existing, identity);
      await readSecretValueInTransaction<ShopifyOAuthContinuationPayload>(transaction, identity, {
        accessPurpose: "shopify.oauth.continuation.rotate.verify",
        expectedProvider: shopifyOAuthProvider,
        expectedPurpose: shopifyOAuthPurpose,
        requestId: input.requestId,
        secretReferenceId: existing.payloadSecretReferenceId!
      });
      const rotated = await rotateSecretReferenceInTransaction(transaction, identity, {
        idempotencyKey: rotatePayloadKey,
        requestId: input.requestId,
        rotationPurpose: "shopify.oauth.continuation.replace",
        secretReferenceId: existing.payloadSecretReferenceId!,
        secretValue: input.payload
      });
      payloadDescriptor = rotated.descriptor;
      const row = await transaction.shopifyOAuthContinuation.update({
        data: {
          actorId: identity.actorId,
          authorizationVersion: input.authorizationVersion,
          businessId: input.businessId ?? existing.businessId,
          consumedAt: null,
          createdBy: existing.createdBy ?? identity.actorId,
          expiresAt: input.expiresAt,
          organizationId: identity.organizationId,
          ownedBy: identity.actorId,
          resultAuditLogId: null,
          resultSummary: null,
          shopDomain: input.shopDomain,
          status: "pending",
          storeId: input.storeId,
          tenantId: identity.tenantId,
          userId: input.userId
        },
        where: { id: existing.id }
      }) as ShopifyOAuthContinuationRow;
      return toRecord(row, input.payload, payloadDescriptor);
    }

    const createdSecret = await createSecretReferenceInTransaction(transaction, identity, {
      businessId: input.businessId ?? null,
      environment: isProduction ? "PRODUCTION" : "DEVELOPMENT",
      idempotencyKey: createPayloadKey,
      provider: shopifyOAuthProvider,
      purpose: shopifyOAuthPurpose,
      requestId: input.requestId,
      secretValue: input.payload
    });
    payloadDescriptor = createdSecret.descriptor;
    const row = await transaction.shopifyOAuthContinuation.create({
      data: {
        actorId: identity.actorId,
        authorizationVersion: input.authorizationVersion,
        businessId: input.businessId ?? null,
        createdBy: identity.actorId,
        expiresAt: input.expiresAt,
        organizationId: identity.organizationId,
        ownedBy: identity.actorId,
        payloadSecretReferenceId: payloadDescriptor.id,
        shopDomain: input.shopDomain,
        stateNonce: input.stateNonce,
        status: "pending",
        storeId: input.storeId,
        tenantId: identity.tenantId,
        userId: input.userId
      }
    }) as ShopifyOAuthContinuationRow;
    return toRecord(row, input.payload, payloadDescriptor);
  }, { isolationLevel: "Serializable" });
}

export async function attachShopifyOAuthContinuationAudit(input: {
  auditLogId: string;
  continuationId: string;
} & ShopifyOAuthContinuationPrincipal) {
  await withTenantSession(prisma, principalSessionContext(input, "shopify.oauth.continuation.audit.attach"), async (transaction, identity) => {
    const updated = await transaction.shopifyOAuthContinuation.updateMany({
      data: { auditLogId: input.auditLogId, updatedAt: new Date() },
      where: {
        id: input.continuationId,
        organizationId: identity.organizationId,
        tenantId: identity.tenantId,
        ...(typeof input.authSubject === "string" ? { userId: input.authSubject } : {})
      }
    });
    if (updated.count !== 1) throw new Error("SHOPIFY_OAUTH_CONTINUATION_NOT_FOUND");
  });
}

export async function getPendingShopifyOAuthContinuation(input: {
  now?: Date;
  shopDomain: string;
  stateNonce: string;
  storeId: string;
  userId: string;
} & ShopifyOAuthContinuationPrincipal) {
  assertTargetUser(input, input.userId);
  return withTenantSession(prisma, principalSessionContext(input, "shopify.oauth.continuation.read"), async (transaction, identity) => {
    const row = await transaction.shopifyOAuthContinuation.findFirst({
      where: {
        organizationId: identity.organizationId,
        shopDomain: input.shopDomain,
        stateNonce: input.stateNonce,
        status: "pending",
        storeId: input.storeId,
        tenantId: identity.tenantId,
        userId: input.userId
      }
    }) as ShopifyOAuthContinuationRow | null;
    if (!row) return null;
    assertContinuationScope(row, identity);
    if (row.expiresAt.getTime() < (input.now ?? new Date()).getTime()) {
      await transitionContinuation(transaction, identity, {
        continuationId: row.id,
        idempotencyKey: `shopify-oauth-expire:${row.id}:${row.expiresAt.toISOString()}`,
        requestId: input.requestId,
        resultSummary: "Shopify OAuth continuation expired before the callback completed.",
        status: "failed"
      });
      return null;
    }
    return readPayload(transaction, identity, row, input.requestId);
  }, { isolationLevel: "Serializable" });
}

export async function markShopifyOAuthContinuationConsumed(input: {
  continuationId: string;
  idempotencyKey: string;
  resultAuditLogId: string;
  resultSummary: string;
} & ShopifyOAuthContinuationPrincipal) {
  await withTenantSession(prisma, principalSessionContext(input, "shopify.oauth.continuation.consume"), (transaction, identity) => (
    transitionContinuation(transaction, identity, {
      ...input,
      humanUserId: typeof input.authSubject === "string" ? input.authSubject : undefined,
      status: "consumed"
    })
  ), { isolationLevel: "Serializable" });
}

export async function markShopifyOAuthContinuationFailed(input: {
  continuationId: string;
  idempotencyKey: string;
  resultAuditLogId?: string | null;
  resultSummary: string;
} & ShopifyOAuthContinuationPrincipal) {
  await withTenantSession(prisma, principalSessionContext(input, "shopify.oauth.continuation.fail"), (transaction, identity) => (
    transitionContinuation(transaction, identity, {
      ...input,
      humanUserId: typeof input.authSubject === "string" ? input.authSubject : undefined,
      status: "failed"
    })
  ), { isolationLevel: "Serializable" });
}
