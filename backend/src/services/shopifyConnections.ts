import { createHash } from "node:crypto";
import type { Prisma, ShopifyConnection } from "@prisma/client";
import { prisma, withTenantSession } from "../db.js";
import { isProduction } from "../env.js";
import {
  createSecretReferenceInTransaction,
  readSecretValueInTransaction,
  rotateSecretReferenceInTransaction,
  type SecretBrokerTenantIdentity,
  type SecretBrokerTenantPrincipal
} from "./phase202SecretBroker.js";
import { safeOutboundHttpRequest, type SafeOutboundResponse } from "./safeOutboundHttp.js";
import { normalizeShopDomain, type ShopifyFetch, type ShopifyStorefrontDraftCredentials } from "./shopifyStorefrontExecutor.js";
import { defaultShopifyScopes } from "./shopifyOAuth.js";

const defaultApiVersion = "2026-04";

type ShopifyCredentialSecret = {
  adminToken: string;
};

export type ShopifyConnectionPrincipal = SecretBrokerTenantPrincipal;

type ShopifyConnectionRecord = ShopifyConnection & {
  actorId: string | null;
  businessId: string | null;
  createdBy: string | null;
  credentialSecretReferenceId: string | null;
  organizationId: string | null;
  ownedBy: string | null;
  tenantId: string | null;
};

export type ShopifyConnectionSnapshot = {
  apiVersion: string;
  connectedAt: Date;
  credentialReference: {
    id: string;
    provider: typeof shopifyCredentialProvider;
    purpose: typeof shopifyCredentialPurpose;
  } | null;
  id: string;
  lastUsedAt: Date | null;
  scopes: string[];
  shopDomain: string;
  status: string;
  storeId: string | null;
  tokenConfigured: boolean;
  tokenLastFour: string | null;
  updatedAt: Date;
};

const shopifyCredentialProvider = "shopify" as const;
const shopifyCredentialPurpose = "shopify-admin-token" as const;

export type ShopifyConnectionVerification = {
  errors: string[];
  grantedScopes: string[];
  missingScopes: string[];
  primaryDomain: string | null;
  providerContacted: boolean;
  shopDomain: string | null;
  shopId: string | null;
  shopName: string | null;
  status: "failed" | "verified";
};

const shopifyConnectionVerificationQuery = `
query EntralShopifyConnectionVerification {
  shop {
    id
    name
    myshopifyDomain
    primaryDomain {
      host
      url
    }
  }
  currentAppInstallation {
    accessScopes {
      handle
    }
  }
}`;

function tokenLastFour(value: string) {
  return value.trim().slice(-4) || null;
}

export function publicShopifyConnection(connection: ShopifyConnectionRecord): ShopifyConnectionSnapshot {
  return {
    apiVersion: connection.apiVersion,
    connectedAt: connection.connectedAt,
    credentialReference: connection.credentialSecretReferenceId ? {
      id: connection.credentialSecretReferenceId,
      provider: shopifyCredentialProvider,
      purpose: shopifyCredentialPurpose
    } : null,
    id: connection.id,
    lastUsedAt: connection.lastUsedAt,
    scopes: connection.scopes,
    shopDomain: connection.shopDomain,
    status: connection.status,
    storeId: connection.storeId,
    tokenConfigured: Boolean(connection.credentialSecretReferenceId && connection.tokenLastFour),
    tokenLastFour: connection.tokenLastFour,
    updatedAt: connection.updatedAt
  };
}

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

function principalSessionContext(input: ShopifyConnectionPrincipal, actionReason: string) {
  return typeof input.authSubject === "string"
    ? { actionReason, authSubject: input.authSubject, requestId: input.requestId, tenantId: input.tenantId }
    : { actionReason, requestId: input.requestId, serviceAppUserId: input.serviceAppUserId, tenantId: input.tenantId };
}

function assertTargetUser(input: ShopifyConnectionPrincipal, userId: string) {
  if (typeof input.authSubject === "string" && input.authSubject !== userId) {
    throw new Error("SHOPIFY_CONNECTION_PRINCIPAL_USER_MISMATCH");
  }
}

function assertConnectionScope(connection: ShopifyConnectionRecord, identity: SecretBrokerTenantIdentity) {
  if (connection.tenantId !== identity.tenantId || connection.organizationId !== identity.organizationId) {
    throw new Error("SHOPIFY_CONNECTION_TENANT_SCOPE_MISMATCH");
  }
}

function credentialsFromSecret(
  connection: Pick<ShopifyConnectionRecord, "apiVersion" | "shopDomain">,
  value: unknown
): ShopifyStorefrontDraftCredentials {
  const candidate = value && typeof value === "object" ? value as Partial<ShopifyCredentialSecret> : null;
  if (!candidate || Object.keys(candidate).length !== 1 || !Object.prototype.hasOwnProperty.call(candidate, "adminToken")) {
    throw new Error("SHOPIFY_CONNECTION_SECRET_INVALID");
  }
  const adminToken = candidate?.adminToken?.trim();
  if (!adminToken) throw new Error("SHOPIFY_CONNECTION_SECRET_INVALID");
  return {
    adminToken,
    apiVersion: connection.apiVersion || defaultApiVersion,
    shopDomain: connection.shopDomain
  };
}

function recordFrom(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function graphqlErrors(payload: unknown) {
  const root = recordFrom(payload);

  if (!root || !Array.isArray(root.errors)) return [];

  return root.errors.map((error) => {
    const candidate = recordFrom(error);

    return candidate?.message ? String(candidate.message) : "Shopify GraphQL error.";
  });
}

function normalizeScopes(scopes?: string[] | null) {
  return Array.from(new Set((scopes ?? defaultShopifyScopes).map((scope) => scope.trim()).filter(Boolean)));
}

export async function verifyShopifyConnection(input: {
  adminToken: string;
  apiVersion?: string | null;
  fetcher?: ShopifyFetch;
  requiredScopes?: string[] | null;
  shopDomain: string;
}): Promise<ShopifyConnectionVerification> {
  const shopDomain = normalizeShopDomain(input.shopDomain);
  const adminToken = input.adminToken.trim();
  const requiredScopes = normalizeScopes(input.requiredScopes);

  if (!shopDomain) {
    return {
      errors: ["Shopify shop domain must be a valid domain."],
      grantedScopes: [],
      missingScopes: requiredScopes,
      primaryDomain: null,
      providerContacted: false,
      shopDomain: null,
      shopId: null,
      shopName: null,
      status: "failed"
    };
  }

  if (!adminToken) {
    return {
      errors: ["Shopify Admin API token is required."],
      grantedScopes: [],
      missingScopes: requiredScopes,
      primaryDomain: null,
      providerContacted: false,
      shopDomain,
      shopId: null,
      shopName: null,
      status: "failed"
    };
  }

  const apiVersion = input.apiVersion?.trim() || defaultApiVersion;
  const url = `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;
  let payload: unknown = null;

  try {
    const requestBody = JSON.stringify({
      query: shopifyConnectionVerificationQuery
    });
    const requestHeaders = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminToken,
      "X-Entral-Idempotency-Key": `entral:shopify:${shopDomain}:connection-verification`
    };
    const response = input.fetcher ? await input.fetcher(url, {
      body: requestBody,
      headers: requestHeaders,
      method: "POST"
    }) : await safeOutboundHttpRequest(url, {
      body: requestBody,
      headers: requestHeaders,
      maxRedirects: 0,
      maxRequestBytes: 64_000,
      maxResponseBytes: 256_000,
      method: "POST",
      timeoutMs: 10_000
    });

    if (Buffer.isBuffer((response as SafeOutboundResponse).body)) {
      const responseText = (response as SafeOutboundResponse).body.toString("utf8");

      try {
        payload = JSON.parse(responseText);
      } catch {
        payload = responseText;
      }
    } else {
      const fetchResponse = response as Awaited<ReturnType<ShopifyFetch>>;

      try {
        payload = await fetchResponse.json();
      } catch {
        payload = fetchResponse.text ? await fetchResponse.text() : null;
      }
    }

    if (!(response.status >= 200 && response.status < 300)) {
      return {
        errors: [typeof payload === "string" ? payload.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300) : `Shopify returned HTTP ${response.status}.`],
        grantedScopes: [],
        missingScopes: requiredScopes,
        primaryDomain: null,
        providerContacted: true,
        shopDomain,
        shopId: null,
        shopName: null,
        status: "failed"
      };
    }
  } catch (error) {
    return {
      errors: [error instanceof Error ? error.message : "Shopify connection verification failed."],
      grantedScopes: [],
      missingScopes: requiredScopes,
      primaryDomain: null,
      providerContacted: true,
      shopDomain,
      shopId: null,
      shopName: null,
      status: "failed"
    };
  }

  const errors = graphqlErrors(payload);
  const data = recordFrom(recordFrom(payload)?.data);
  const shop = recordFrom(data?.shop);
  const actualShopDomain = shop?.myshopifyDomain ? normalizeShopDomain(String(shop.myshopifyDomain)) : null;
  const installation = recordFrom(data?.currentAppInstallation);
  const grantedScopes = Array.isArray(installation?.accessScopes)
    ? installation.accessScopes.map((scope) => recordFrom(scope)?.handle).filter((scope): scope is string => typeof scope === "string")
    : [];
  const missingScopes = requiredScopes.filter((scope) => !grantedScopes.includes(scope));
  const primaryDomain = recordFrom(shop?.primaryDomain);

  if (!actualShopDomain) {
    errors.push("Shopify verification did not return a shop domain.");
  } else if (actualShopDomain !== shopDomain) {
    errors.push(`Shopify token belongs to ${actualShopDomain}, not ${shopDomain}.`);
  }

  if (missingScopes.length > 0) {
    errors.push(`Shopify token is missing required scopes: ${missingScopes.join(", ")}.`);
  }

  return {
    errors,
    grantedScopes,
    missingScopes,
    primaryDomain: primaryDomain?.host ? String(primaryDomain.host) : primaryDomain?.url ? String(primaryDomain.url) : null,
    providerContacted: true,
    shopDomain: actualShopDomain ?? shopDomain,
    shopId: shop?.id ? String(shop.id) : null,
    shopName: shop?.name ? String(shop.name) : null,
    status: errors.length > 0 ? "failed" : "verified"
  };
}

export async function upsertShopifyConnection(input: {
  adminToken: string;
  apiVersion?: string | null;
  businessId?: string | null;
  idempotencyKey: string;
  scopes?: string[];
  shopDomain: string;
  storeId?: string | null;
  userId: string;
} & ShopifyConnectionPrincipal) {
  assertTargetUser(input, input.userId);
  const shopDomain = normalizeShopDomain(input.shopDomain);
  const adminToken = input.adminToken.trim();

  if (!shopDomain) {
    throw new Error("Shopify shop domain must be a valid domain.");
  }

  if (!adminToken) {
    throw new Error("Shopify Admin API token is required.");
  }

  const now = new Date();
  const apiVersion = input.apiVersion?.trim() || defaultApiVersion;
  const scopes = Array.from(new Set((input.scopes ?? []).map((scope) => scope.trim()).filter(Boolean)));
  const lastFour = tokenLastFour(adminToken);

  return withTenantSession(prisma, principalSessionContext(input, "shopify.connection.upsert"), async (transaction, identity) => {
    const existing = await transaction.shopifyConnection.findUnique({
      where: { userId_shopDomain: { shopDomain, userId: input.userId } }
    }) as ShopifyConnectionRecord | null;
    let credentialSecretReferenceId: string;
    const createCredentialKey = childIdempotencyKey(input.idempotencyKey, "credential-create");
    const rotateCredentialKey = childIdempotencyKey(input.idempotencyKey, "credential-rotate");

    if (await recordedSecretMutation(transaction, identity.tenantId, createCredentialKey)) {
      const replay = await createSecretReferenceInTransaction(transaction, identity, {
        businessId: input.businessId ?? existing?.businessId ?? null,
        environment: isProduction ? "PRODUCTION" : "DEVELOPMENT",
        idempotencyKey: createCredentialKey,
        lastFour,
        provider: shopifyCredentialProvider,
        purpose: shopifyCredentialPurpose,
        requestId: input.requestId,
        secretValue: { adminToken } satisfies ShopifyCredentialSecret
      });
      if (!replay.replayed || !existing || existing.credentialSecretReferenceId !== replay.descriptor.id) {
        throw new Error("SHOPIFY_CONNECTION_IDEMPOTENT_RESULT_MISSING");
      }
      assertConnectionScope(existing, identity);
      return existing;
    }

    if (await recordedSecretMutation(transaction, identity.tenantId, rotateCredentialKey)) {
      if (!existing?.credentialSecretReferenceId) {
        throw new Error("SHOPIFY_CONNECTION_IDEMPOTENT_RESULT_MISSING");
      }
      assertConnectionScope(existing, identity);
      const replay = await rotateSecretReferenceInTransaction(transaction, identity, {
        idempotencyKey: rotateCredentialKey,
        lastFour,
        requestId: input.requestId,
        rotationPurpose: "shopify.connection.credential.rotate",
        secretReferenceId: existing.credentialSecretReferenceId,
        secretValue: { adminToken } satisfies ShopifyCredentialSecret
      });
      if (!replay.replayed || existing.credentialSecretReferenceId !== replay.descriptor.id) {
        throw new Error("SHOPIFY_CONNECTION_IDEMPOTENT_RESULT_MISSING");
      }
      return existing;
    }

    if (existing) {
      assertConnectionScope(existing, identity);
      if (existing.credentialSecretReferenceId) {
        await readSecretValueInTransaction<ShopifyCredentialSecret>(transaction, identity, {
          accessPurpose: "shopify.connection.credential.rotate.verify",
          expectedProvider: shopifyCredentialProvider,
          expectedPurpose: shopifyCredentialPurpose,
          requestId: input.requestId,
          secretReferenceId: existing.credentialSecretReferenceId
        });
        const rotated = await rotateSecretReferenceInTransaction(transaction, identity, {
          idempotencyKey: rotateCredentialKey,
          lastFour,
          requestId: input.requestId,
          rotationPurpose: "shopify.connection.credential.rotate",
          secretReferenceId: existing.credentialSecretReferenceId,
          secretValue: { adminToken } satisfies ShopifyCredentialSecret
        });
        credentialSecretReferenceId = rotated.descriptor.id;
      } else {
        const created = await createSecretReferenceInTransaction(transaction, identity, {
          businessId: input.businessId ?? existing.businessId,
          environment: isProduction ? "PRODUCTION" : "DEVELOPMENT",
          idempotencyKey: createCredentialKey,
          lastFour,
          provider: shopifyCredentialProvider,
          purpose: shopifyCredentialPurpose,
          requestId: input.requestId,
          secretValue: { adminToken } satisfies ShopifyCredentialSecret
        });
        credentialSecretReferenceId = created.descriptor.id;
      }

      return transaction.shopifyConnection.update({
        data: {
          actorId: identity.actorId,
          apiVersion,
          businessId: input.businessId ?? existing.businessId,
          connectedAt: now,
          createdBy: existing.createdBy ?? identity.actorId,
          credentialSecretReferenceId,
          lastUsedAt: null,
          organizationId: identity.organizationId,
          ownedBy: identity.actorId,
          revokedAt: null,
          scopes,
          status: "active",
          storeId: input.storeId ?? null,
          tenantId: identity.tenantId,
          tokenLastFour: lastFour
        },
        where: { id: existing.id }
      }) as Promise<ShopifyConnectionRecord>;
    }

    const created = await createSecretReferenceInTransaction(transaction, identity, {
      businessId: input.businessId ?? null,
      environment: isProduction ? "PRODUCTION" : "DEVELOPMENT",
      idempotencyKey: createCredentialKey,
      lastFour,
      provider: shopifyCredentialProvider,
      purpose: shopifyCredentialPurpose,
      requestId: input.requestId,
      secretValue: { adminToken } satisfies ShopifyCredentialSecret
    });
    credentialSecretReferenceId = created.descriptor.id;

    return transaction.shopifyConnection.create({
      data: {
        actorId: identity.actorId,
        apiVersion,
        businessId: input.businessId ?? null,
        connectedAt: now,
        createdBy: identity.actorId,
        credentialSecretReferenceId,
        organizationId: identity.organizationId,
        ownedBy: identity.actorId,
        scopes,
        shopDomain,
        status: "active",
        storeId: input.storeId ?? null,
        tenantId: identity.tenantId,
        tokenLastFour: lastFour,
        userId: input.userId
      }
    }) as Promise<ShopifyConnectionRecord>;
  }, { isolationLevel: "Serializable" });
}

export async function listShopifyConnections(input: {
  storeId?: string | null;
  userId: string;
} & ShopifyConnectionPrincipal) {
  assertTargetUser(input, input.userId);
  return withTenantSession(prisma, principalSessionContext(input, "shopify.connection.list"), async (transaction, identity) => {
    const connections = await transaction.shopifyConnection.findMany({
      orderBy: { updatedAt: "desc" },
      where: {
        organizationId: identity.organizationId,
        tenantId: identity.tenantId,
        userId: input.userId,
        ...(input.storeId ? { OR: [{ storeId: input.storeId }, { storeId: null }] } : {})
      }
    }) as ShopifyConnectionRecord[];
    connections.forEach((connection) => assertConnectionScope(connection, identity));
    return connections.map(publicShopifyConnection);
  });
}

export async function getShopifyConnectionCredentials(input: {
  storeId: string;
  userId: string;
} & ShopifyConnectionPrincipal): Promise<ShopifyStorefrontDraftCredentials | null> {
  assertTargetUser(input, input.userId);
  return withTenantSession(prisma, principalSessionContext(input, "shopify.connection.credential.read"), async (transaction, identity) => {
    const selected = await transaction.shopifyConnection.findFirst({
      orderBy: { updatedAt: "desc" },
      where: {
        organizationId: identity.organizationId,
        status: "active",
        storeId: input.storeId,
        tenantId: identity.tenantId,
        userId: input.userId
      }
    }) as ShopifyConnectionRecord | null;
    if (!selected) return null;
    assertConnectionScope(selected, identity);
    if (!selected.credentialSecretReferenceId) throw new Error("SHOPIFY_CONNECTION_SECRET_REFERENCE_REQUIRED");
    const secret = await readSecretValueInTransaction<ShopifyCredentialSecret>(transaction, identity, {
      accessPurpose: "shopify.connection.credential.use",
      expectedProvider: shopifyCredentialProvider,
      expectedPurpose: shopifyCredentialPurpose,
      requestId: input.requestId,
      secretReferenceId: selected.credentialSecretReferenceId
    });
    return credentialsFromSecret(selected, secret.value);
  }, { isolationLevel: "Serializable" });
}
