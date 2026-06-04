import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

function resetEnv(overrides: Record<string, string | undefined> = {}) {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "https://app.entral.test";
  process.env.APP_PUBLIC_URL = "https://app.entral.test";
  process.env.API_PUBLIC_URL = "https://api.entral.test";
  process.env.SHOPIFY_APP_API_KEY = "shopify-client-id";
  process.env.SHOPIFY_APP_API_SECRET = "shopify-app-secret";
  process.env.SHOPIFY_APP_SCOPES = "write_products";

  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
}

describe("shopifyOAuth", () => {
  it("builds and verifies expiring signed OAuth state", async () => {
    resetEnv();
    const { buildShopifyOAuthState, verifyShopifyOAuthState } = await import("../src/services/shopifyOAuth.js");
    const state = buildShopifyOAuthState({
      returnTo: "https://app.entral.test/merch",
      scopes: ["write_products"],
      shopDomain: "iron-house.myshopify.com",
      storeId: "store-1",
      userId: "user-1"
    }, {
      nonce: "test-nonce",
      now: new Date("2026-06-04T09:00:00.000Z"),
      secret: "state-secret",
      ttlSeconds: 60
    });

    const payload = verifyShopifyOAuthState(state, {
      now: new Date("2026-06-04T09:00:30.000Z"),
      secret: "state-secret"
    });

    expect(payload).toMatchObject({
      nonce: "test-nonce",
      returnTo: "https://app.entral.test/merch",
      scopes: ["write_products"],
      shopDomain: "iron-house.myshopify.com",
      storeId: "store-1",
      userId: "user-1"
    });
    expect(() => verifyShopifyOAuthState(`${state.slice(0, -1)}0`, {
      now: new Date("2026-06-04T09:00:30.000Z"),
      secret: "state-secret"
    })).toThrow(/signature/i);
    expect(() => verifyShopifyOAuthState(state, {
      now: new Date("2026-06-04T09:02:00.000Z"),
      secret: "state-secret"
    })).toThrow(/expired/i);
  });

  it("validates Shopify callback HMACs using the signed query message", async () => {
    resetEnv();
    const { shopifyOAuthMessageFromQuery, validateShopifyOAuthHmac } = await import("../src/services/shopifyOAuth.js");
    const query = {
      code: "auth-code",
      shop: "iron-house.myshopify.com",
      state: "state-token",
      timestamp: "1780534800"
    };
    const hmac = createHmac("sha256", "shopify-app-secret")
      .update(shopifyOAuthMessageFromQuery(query))
      .digest("hex");

    expect(validateShopifyOAuthHmac({ ...query, hmac })).toBe(true);
    expect(validateShopifyOAuthHmac({ ...query, hmac: hmac.replace(/^./, "0") })).toBe(false);
  });

  it("builds the Shopify authorize URL with callback, scopes, and state", async () => {
    resetEnv();
    const { buildShopifyOAuthStart } = await import("../src/services/shopifyOAuth.js");
    const start = buildShopifyOAuthStart({
      returnTo: "https://app.entral.test/merch",
      shopDomain: "https://iron-house.myshopify.com/admin",
      storeId: "store-1",
      userId: "user-1"
    }, {
      nonce: "oauth-nonce",
      now: new Date("2026-06-04T09:00:00.000Z")
    });
    const url = new URL(start.authorizeUrl);

    expect(url.origin).toBe("https://iron-house.myshopify.com");
    expect(url.pathname).toBe("/admin/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("shopify-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe("https://api.entral.test/api/v1/merch/shopify/oauth/callback");
    expect(url.searchParams.get("scope")).toBe("write_products");
    expect(url.searchParams.get("state")).toBe(start.state);
    expect(start.stateExpiresAt).toBe("2026-06-04T09:10:00.000Z");
  });

  it("builds Shopify OAuth return URLs for verified success and verification errors", async () => {
    resetEnv();
    const { appendShopifyOAuthResultToReturnUrl } = await import("../src/services/shopifyOAuth.js");
    const success = new URL(appendShopifyOAuthResultToReturnUrl("https://app.entral.test/merch", {
      shopDomain: "iron-house.myshopify.com",
      status: "success",
      storeId: "store-1"
    }));
    const error = new URL(appendShopifyOAuthResultToReturnUrl("https://app.entral.test/merch", {
      message: "Shopify token is missing required scopes: write_products.",
      shopDomain: "iron-house.myshopify.com",
      status: "error",
      storeId: "store-1"
    }));

    expect(success.searchParams.get("shopifyConnection")).toBe("success");
    expect(success.searchParams.get("shop")).toBe("iron-house.myshopify.com");
    expect(error.searchParams.get("shopifyConnection")).toBe("error");
    expect(error.searchParams.get("shopifyConnectionMessage")).toBe("Shopify token is missing required scopes: write_products.");
  });

  it("exchanges an authorization code for a token without logging token material", async () => {
    resetEnv();
    const { exchangeShopifyOAuthCode } = await import("../src/services/shopifyOAuth.js");
    const fetcher = vi.fn(async (_url: Parameters<typeof fetch>[0], _init?: Parameters<typeof fetch>[1]) => ({
      json: async () => ({
        access_token: "shpat_oauth_secret_1234",
        scope: "write_products,read_products"
      }),
      ok: true,
      status: 200,
      text: async () => ""
    } as Response));

    const token = await exchangeShopifyOAuthCode({
      code: "auth-code",
      fetcher,
      shopDomain: "iron-house.myshopify.com"
    });
    const [url, init] = fetcher.mock.calls[0] ?? [];

    expect(String(url)).toBe("https://iron-house.myshopify.com/admin/oauth/access_token");
    expect(init?.method).toBe("POST");
    expect(String(init?.body)).toContain("client_id=shopify-client-id");
    expect(String(init?.body)).toContain("client_secret=shopify-app-secret");
    expect(String(init?.body)).toContain("code=auth-code");
    expect(token).toEqual({
      accessToken: "shpat_oauth_secret_1234",
      expiresIn: null,
      rawScope: "write_products,read_products",
      scopes: ["write_products", "read_products"]
    });
  });

  it("rejects non-Shopify OAuth shop domains", async () => {
    resetEnv();
    const { normalizeShopifyOAuthShopDomain } = await import("../src/services/shopifyOAuth.js");

    expect(normalizeShopifyOAuthShopDomain("iron-house.myshopify.com")).toBe("iron-house.myshopify.com");
    expect(normalizeShopifyOAuthShopDomain("iron-house.example.com")).toBeNull();
  });
});
