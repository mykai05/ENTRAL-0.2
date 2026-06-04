import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../env.js";
import { normalizeShopDomain } from "./shopifyStorefrontExecutor.js";

const stateKind = "shopify_oauth";
const defaultStateTtlSeconds = 10 * 60;
export const defaultShopifyScopes = [
  "read_products",
  "write_products",
  "read_online_store_pages",
  "write_online_store_pages",
  "read_online_store_navigation",
  "write_online_store_navigation"
];

export type ShopifyOAuthFetch = typeof fetch;

export type ShopifyOAuthStatePayload = {
  exp: number;
  iat: number;
  kind: typeof stateKind;
  nonce: string;
  returnTo: string;
  scopes: string[];
  shopDomain: string;
  storeId: string;
  userId: string;
};

type StateOptions = {
  nonce?: string;
  now?: Date;
  secret?: string;
  ttlSeconds?: number;
};

type ShopifyOAuthStartOptions = StateOptions;

export type ShopifyOAuthStart = {
  authorizeUrl: string;
  callbackUrl: string;
  missingEnvVars: string[];
  scopes: string[];
  shopDomain: string;
  state: string;
  stateExpiresAt: string;
  stateNonce: string;
};

export type ShopifyOAuthAccessToken = {
  accessToken: string;
  expiresIn: number | null;
  rawScope: string;
  scopes: string[];
};

export function normalizeShopifyOAuthScopes(value?: string | string[] | null) {
  const items = Array.isArray(value)
    ? value
    : (value ?? "").split(/[\s,]+/);
  const scopes = Array.from(new Set(items.map((scope) => scope.trim()).filter(Boolean)));

  return scopes.length > 0 ? scopes : defaultShopifyScopes;
}

export function normalizeShopifyOAuthShopDomain(value: string | null | undefined) {
  const domain = normalizeShopDomain(value);

  if (!domain) return null;

  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(domain) ? domain : null;
}

function oauthSecret(secret = env.SHOPIFY_APP_API_SECRET ?? env.JWT_SECRET) {
  return secret;
}

function hmacHex(secret: string, message: string) {
  return createHmac("sha256", secret).update(message).digest("hex");
}

function safeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function encodeJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeJson<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function normalizeReturnTo(value: string | null | undefined) {
  const fallback = env.APP_PUBLIC_URL;

  if (!value) return fallback;

  try {
    const appUrl = new URL(env.APP_PUBLIC_URL);
    const resolved = value.startsWith("/") && !value.startsWith("//")
      ? new URL(value, appUrl)
      : new URL(value);

    return resolved.origin === appUrl.origin ? resolved.toString() : fallback;
  } catch {
    return fallback;
  }
}

export function appendShopifyOAuthResultToReturnUrl(returnTo: string, input: {
  message?: string | null;
  shopDomain: string;
  status: "error" | "success";
  storeId: string;
}) {
  const url = new URL(normalizeReturnTo(returnTo));
  url.searchParams.set("shopifyConnection", input.status);
  url.searchParams.set("shop", input.shopDomain);
  url.searchParams.set("storeId", input.storeId);
  if (input.message) url.searchParams.set("shopifyConnectionMessage", input.message);

  return url.toString();
}

export function shopifyOAuthCallbackUrl() {
  return new URL("/api/v1/merch/shopify/oauth/callback", env.API_PUBLIC_URL).toString();
}

export function buildShopifyOAuthState(input: {
  returnTo?: string | null;
  scopes: string[];
  shopDomain: string;
  storeId: string;
  userId: string;
}, options: StateOptions = {}) {
  const now = options.now ?? new Date();
  const ttlSeconds = options.ttlSeconds ?? defaultStateTtlSeconds;
  const iat = Math.floor(now.getTime() / 1000);
  const payload: ShopifyOAuthStatePayload = {
    exp: iat + ttlSeconds,
    iat,
    kind: stateKind,
    nonce: options.nonce ?? randomBytes(16).toString("base64url"),
    returnTo: normalizeReturnTo(input.returnTo),
    scopes: normalizeShopifyOAuthScopes(input.scopes),
    shopDomain: input.shopDomain,
    storeId: input.storeId,
    userId: input.userId
  };
  const encoded = encodeJson(payload);
  const signature = hmacHex(oauthSecret(options.secret), encoded);

  return `${encoded}.${signature}`;
}

export function verifyShopifyOAuthState(token: string, options: StateOptions = {}) {
  const [encoded, signature, extra] = token.split(".");

  if (!encoded || !signature || extra !== undefined) {
    throw new Error("Invalid Shopify OAuth state.");
  }

  const expected = hmacHex(oauthSecret(options.secret), encoded);

  if (!safeEqualHex(signature, expected)) {
    throw new Error("Invalid Shopify OAuth state signature.");
  }

  const payload = decodeJson<ShopifyOAuthStatePayload>(encoded);
  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);

  if (!payload || payload.kind !== stateKind || payload.exp < nowSeconds) {
    throw new Error("Shopify OAuth state has expired.");
  }

  const shopDomain = normalizeShopifyOAuthShopDomain(payload.shopDomain);

  if (!shopDomain) {
    throw new Error("Shopify OAuth state references an invalid shop.");
  }

  return {
    ...payload,
    returnTo: normalizeReturnTo(payload.returnTo),
    scopes: normalizeShopifyOAuthScopes(payload.scopes),
    shopDomain
  };
}

function queryValueToString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.join(",");
  return value ?? "";
}

export function shopifyOAuthMessageFromQuery(query: Record<string, string | string[] | undefined>) {
  return Object.entries(query)
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .map(([key, value]) => `${key}=${queryValueToString(value)}`)
    .sort()
    .join("&");
}

export function validateShopifyOAuthHmac(query: Record<string, string | string[] | undefined>, secret = env.SHOPIFY_APP_API_SECRET) {
  const hmac = queryValueToString(query.hmac);

  if (!secret || !hmac) return false;

  const expected = hmacHex(secret, shopifyOAuthMessageFromQuery(query));

  return /^[a-f0-9]{64}$/i.test(hmac) && safeEqualHex(hmac, expected);
}

export function buildShopifyOAuthStart(input: {
  returnTo?: string | null;
  scopes?: string[];
  shopDomain: string;
  storeId: string;
  userId: string;
}, options: ShopifyOAuthStartOptions = {}): ShopifyOAuthStart {
  const shopDomain = normalizeShopifyOAuthShopDomain(input.shopDomain);

  if (!shopDomain) {
    throw new Error("Shopify OAuth requires a valid *.myshopify.com shop domain.");
  }

  const scopes = normalizeShopifyOAuthScopes(input.scopes?.length ? input.scopes : env.SHOPIFY_APP_SCOPES);
  const callbackUrl = shopifyOAuthCallbackUrl();
  const state = buildShopifyOAuthState({
    returnTo: input.returnTo,
    scopes,
    shopDomain,
    storeId: input.storeId,
    userId: input.userId
  }, options);
  const params = new URLSearchParams({
    client_id: env.SHOPIFY_APP_API_KEY ?? "",
    redirect_uri: callbackUrl,
    scope: scopes.join(","),
    state
  });
  const missingEnvVars = [
    env.SHOPIFY_APP_API_KEY ? "" : "SHOPIFY_APP_API_KEY",
    env.SHOPIFY_APP_API_SECRET ? "" : "SHOPIFY_APP_API_SECRET"
  ].filter(Boolean);
  const statePayload = verifyShopifyOAuthState(state, options);

  return {
    authorizeUrl: `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`,
    callbackUrl,
    missingEnvVars,
    scopes,
    shopDomain,
    state,
    stateExpiresAt: new Date(statePayload.exp * 1000).toISOString(),
    stateNonce: statePayload.nonce
  };
}

export async function exchangeShopifyOAuthCode(input: {
  code: string;
  fetcher?: ShopifyOAuthFetch;
  shopDomain: string;
}) {
  const shopDomain = normalizeShopifyOAuthShopDomain(input.shopDomain);

  if (!shopDomain) {
    throw new Error("Shopify OAuth token exchange requires a valid *.myshopify.com shop domain.");
  }

  if (!env.SHOPIFY_APP_API_KEY || !env.SHOPIFY_APP_API_SECRET) {
    throw new Error("Shopify OAuth app credentials are not configured.");
  }

  const fetcher = input.fetcher ?? fetch;
  const body = new URLSearchParams({
    client_id: env.SHOPIFY_APP_API_KEY,
    client_secret: env.SHOPIFY_APP_API_SECRET,
    code: input.code
  });
  const response = await fetcher(`https://${shopDomain}/admin/oauth/access_token`, {
    body,
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded"
    },
    method: "POST"
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify OAuth token exchange failed with status ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const payload = await response.json() as {
    access_token?: unknown;
    expires_in?: unknown;
    scope?: unknown;
  };
  const accessToken = typeof payload.access_token === "string" ? payload.access_token.trim() : "";
  const rawScope = typeof payload.scope === "string" ? payload.scope : "";

  if (!accessToken) {
    throw new Error("Shopify OAuth token exchange did not return an access token.");
  }

  return {
    accessToken,
    expiresIn: typeof payload.expires_in === "number" ? payload.expires_in : null,
    rawScope,
    scopes: normalizeShopifyOAuthScopes(rawScope)
  } satisfies ShopifyOAuthAccessToken;
}
