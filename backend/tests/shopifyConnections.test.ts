import { describe, expect, it, vi } from "vitest";

function resetEnv() {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.DATA_ENCRYPTION_KEY = "shopify-connection-test-key";
}

describe("shopifyConnections", () => {
  it("returns public connection metadata while keeping Admin API token material private", async () => {
    resetEnv();
    const { stringifySecureJson } = await import("../src/services/secureJson.js");
    const { credentialsFromShopifyConnection, publicShopifyConnection } = await import("../src/services/shopifyConnections.js");
    const connection = {
      apiVersion: "2026-04",
      connectedAt: new Date("2026-06-04T09:00:00.000Z"),
      createdAt: new Date("2026-06-04T09:00:00.000Z"),
      credentialJson: stringifySecureJson({
        adminToken: "shpat_test_secret_token_1234",
        connectedAt: "2026-06-04T09:00:00.000Z"
      }),
      id: "shopify-connection-1",
      lastUsedAt: null,
      revokedAt: null,
      scopes: ["write_products"],
      shopDomain: "iron-house.myshopify.com",
      status: "active",
      storeId: "store-1",
      tokenLastFour: "1234",
      updatedAt: new Date("2026-06-04T09:00:00.000Z"),
      userId: "user-1"
    } as Parameters<typeof publicShopifyConnection>[0];

    const snapshot = publicShopifyConnection(connection);
    const credentials = credentialsFromShopifyConnection(connection);

    expect(snapshot).toMatchObject({
      apiVersion: "2026-04",
      shopDomain: "iron-house.myshopify.com",
      tokenConfigured: true,
      tokenLastFour: "1234"
    });
    expect(JSON.stringify(snapshot)).not.toContain("shpat_test_secret_token_1234");
    expect(credentials).toEqual({
      adminToken: "shpat_test_secret_token_1234",
      apiVersion: "2026-04",
      shopDomain: "iron-house.myshopify.com"
    });
  });

  it("verifies Shopify Admin API credentials and granted scopes before storing", async () => {
    resetEnv();
    const { verifyShopifyConnection } = await import("../src/services/shopifyConnections.js");
    const fetcher = vi.fn(async (_url: string, _init: { body: string }) => ({
      json: async () => ({
        data: {
          currentAppInstallation: {
            accessScopes: [
              { handle: "read_products" },
              { handle: "write_products" }
            ]
          },
          shop: {
            id: "gid://shopify/Shop/1",
            myshopifyDomain: "iron-house.myshopify.com",
            name: "Iron House Gym",
            primaryDomain: {
              host: "iron-house.myshopify.com",
              url: "https://iron-house.myshopify.com"
            }
          }
        }
      }),
      ok: true,
      status: 200
    }));

    const verification = await verifyShopifyConnection({
      adminToken: "shpat_test_secret_token_1234",
      apiVersion: "2026-04",
      fetcher,
      requiredScopes: ["read_products", "write_products"],
      shopDomain: "https://iron-house.myshopify.com/admin"
    });

    expect(verification).toMatchObject({
      errors: [],
      grantedScopes: ["read_products", "write_products"],
      missingScopes: [],
      primaryDomain: "iron-house.myshopify.com",
      providerContacted: true,
      shopDomain: "iron-house.myshopify.com",
      shopId: "gid://shopify/Shop/1",
      shopName: "Iron House Gym",
      status: "verified"
    });
    expect(String(fetcher.mock.calls[0]?.[0])).toBe("https://iron-house.myshopify.com/admin/api/2026-04/graphql.json");
    expect(JSON.stringify(verification)).not.toContain("shpat_test_secret_token_1234");
  });

  it("rejects Shopify credentials for the wrong shop or missing scopes", async () => {
    resetEnv();
    const { verifyShopifyConnection } = await import("../src/services/shopifyConnections.js");
    const fetcher = vi.fn(async () => ({
      json: async () => ({
        data: {
          currentAppInstallation: {
            accessScopes: [
              { handle: "read_products" }
            ]
          },
          shop: {
            id: "gid://shopify/Shop/2",
            myshopifyDomain: "other-shop.myshopify.com",
            name: "Other Shop",
            primaryDomain: null
          }
        }
      }),
      ok: true,
      status: 200
    }));

    const verification = await verifyShopifyConnection({
      adminToken: "shpat_test_secret_token_1234",
      fetcher,
      requiredScopes: ["read_products", "write_products"],
      shopDomain: "iron-house.myshopify.com"
    });

    expect(verification.status).toBe("failed");
    expect(verification.missingScopes).toEqual(["write_products"]);
    expect(verification.errors.join(" ")).toContain("other-shop.myshopify.com");
    expect(verification.errors.join(" ")).toContain("write_products");
  });

  it("accepts only an exact single-label myshopify.com domain for manual verification", async () => {
    resetEnv();
    const { verifyShopifyConnection } = await import("../src/services/shopifyConnections.js");
    const fetcher = vi.fn();

    for (const shopDomain of [
      "myshopify.com",
      "nested.iron-house.myshopify.com",
      "iron-house.myshopify.com.attacker.example",
      "iron_house.myshopify.com"
    ]) {
      const verification = await verifyShopifyConnection({
        adminToken: "shpat_test_secret_token_1234",
        fetcher,
        shopDomain
      });

      expect(verification.status).toBe("failed");
      expect(verification.providerContacted).toBe(false);
    }

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses the pinned bounded no-redirect transport for real verification requests", async () => {
    resetEnv();
    const safeOutboundHttpRequest = vi.fn(async () => ({
      body: Buffer.from(JSON.stringify({
        data: {
          currentAppInstallation: { accessScopes: [{ handle: "read_products" }] },
          shop: {
            id: "gid://shopify/Shop/1",
            myshopifyDomain: "iron-house.myshopify.com",
            name: "Iron House Gym",
            primaryDomain: null
          }
        }
      })),
      headers: {},
      status: 200,
      url: "https://iron-house.myshopify.com/admin/api/2026-04/graphql.json"
    }));
    vi.doMock("../src/services/safeOutboundHttp.js", () => ({ safeOutboundHttpRequest }));

    try {
      const { verifyShopifyConnection } = await import("../src/services/shopifyConnections.js");
      const verification = await verifyShopifyConnection({
        adminToken: "shpat_test_secret_token_1234",
        requiredScopes: ["read_products"],
        shopDomain: "iron-house.myshopify.com"
      });

      expect(verification.status).toBe("verified");
      expect(safeOutboundHttpRequest).toHaveBeenCalledWith(
        "https://iron-house.myshopify.com/admin/api/2026-04/graphql.json",
        expect.objectContaining({
          maxRedirects: 0,
          maxResponseBytes: 256_000,
          method: "POST",
          timeoutMs: 10_000
        })
      );
    } finally {
      vi.doUnmock("../src/services/safeOutboundHttp.js");
      vi.resetModules();
    }
  });

  it("selects credentials only for the exact store and never falls back to an unbound connection", async () => {
    resetEnv();
    const findMany = vi.fn(async () => []);
    vi.doMock("../src/db.js", () => ({
      prisma: {
        shopifyConnection: { findMany }
      }
    }));

    try {
      const { getShopifyConnectionCredentials } = await import("../src/services/shopifyConnections.js");

      await expect(getShopifyConnectionCredentials("user-1", "store-1")).resolves.toBeNull();
      expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
        take: 1,
        where: {
          status: "active",
          storeId: "store-1",
          userId: "user-1"
        }
      }));
    } finally {
      vi.doUnmock("../src/db.js");
      vi.resetModules();
    }
  });
});
