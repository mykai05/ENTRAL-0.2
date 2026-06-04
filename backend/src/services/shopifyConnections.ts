import type { ShopifyConnection } from "@prisma/client";
import { prisma } from "../db.js";
import { parseSecureJson, stringifySecureJson } from "./secureJson.js";
import { normalizeShopDomain, type ShopifyFetch, type ShopifyStorefrontDraftCredentials } from "./shopifyStorefrontExecutor.js";
import { defaultShopifyScopes } from "./shopifyOAuth.js";

const defaultApiVersion = "2026-04";

type ShopifyCredentialEnvelope = {
  adminToken: string;
  connectedAt: string;
};

export type ShopifyConnectionSnapshot = {
  apiVersion: string;
  connectedAt: Date;
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

export function publicShopifyConnection(connection: ShopifyConnection): ShopifyConnectionSnapshot {
  return {
    apiVersion: connection.apiVersion,
    connectedAt: connection.connectedAt,
    id: connection.id,
    lastUsedAt: connection.lastUsedAt,
    scopes: connection.scopes,
    shopDomain: connection.shopDomain,
    status: connection.status,
    storeId: connection.storeId,
    tokenConfigured: Boolean(connection.tokenLastFour),
    tokenLastFour: connection.tokenLastFour,
    updatedAt: connection.updatedAt
  };
}

export function credentialsFromShopifyConnection(connection: Pick<ShopifyConnection, "apiVersion" | "credentialJson" | "shopDomain">): ShopifyStorefrontDraftCredentials | null {
  const credentials = parseSecureJson<ShopifyCredentialEnvelope>(connection.credentialJson);
  const adminToken = credentials?.adminToken?.trim();

  if (!adminToken) return null;

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
  const fetcher = input.fetcher ?? fetch;
  const url = `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;
  let payload: unknown = null;

  try {
    const response = await fetcher(url, {
      body: JSON.stringify({
        query: shopifyConnectionVerificationQuery
      }),
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminToken,
        "X-Entral-Idempotency-Key": `entral:shopify:${shopDomain}:connection-verification`
      },
      method: "POST"
    });

    try {
      payload = await response.json();
    } catch {
      payload = response.text ? await response.text() : null;
    }

    if (!response.ok) {
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
  scopes?: string[];
  shopDomain: string;
  storeId?: string | null;
  userId: string;
}) {
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
  const credentialJson = stringifySecureJson({
    adminToken,
    connectedAt: now.toISOString()
  } satisfies ShopifyCredentialEnvelope);

  return prisma.shopifyConnection.upsert({
    create: {
      apiVersion,
      credentialJson,
      scopes,
      shopDomain,
      status: "active",
      storeId: input.storeId ?? null,
      tokenLastFour: tokenLastFour(adminToken),
      userId: input.userId
    },
    update: {
      apiVersion,
      credentialJson,
      lastUsedAt: null,
      revokedAt: null,
      scopes,
      status: "active",
      storeId: input.storeId ?? null,
      tokenLastFour: tokenLastFour(adminToken)
    },
    where: {
      userId_shopDomain: {
        shopDomain,
        userId: input.userId
      }
    }
  });
}

export async function listShopifyConnections(userId: string, storeId?: string | null) {
  const connections = await prisma.shopifyConnection.findMany({
    orderBy: { updatedAt: "desc" },
    where: {
      userId,
      ...(storeId ? {
        OR: [
          { storeId },
          { storeId: null }
        ]
      } : {})
    }
  });

  return connections.map(publicShopifyConnection);
}

export async function getShopifyConnectionCredentials(userId: string, storeId?: string | null): Promise<ShopifyStorefrontDraftCredentials | null> {
  const connections = await prisma.shopifyConnection.findMany({
    orderBy: { updatedAt: "desc" },
    take: 10,
    where: {
      status: "active",
      userId,
      ...(storeId ? {
        OR: [
          { storeId },
          { storeId: null }
        ]
      } : {})
    }
  });
  const selected = storeId
    ? connections.find((connection) => connection.storeId === storeId) ?? connections.find((connection) => connection.storeId === null)
    : connections[0];

  if (!selected) return null;

  return credentialsFromShopifyConnection(selected);
}
