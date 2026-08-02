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
    const { publicShopifyConnection } = await import("../src/services/shopifyConnections.js");
    const connection = {
      actorId: "123e4567-e89b-42d3-a456-426614174003",
      apiVersion: "2026-04",
      businessId: null,
      connectedAt: new Date("2026-06-04T09:00:00.000Z"),
      createdAt: new Date("2026-06-04T09:00:00.000Z"),
      createdBy: "123e4567-e89b-42d3-a456-426614174003",
      credentialSecretReferenceId: "123e4567-e89b-42d3-a456-426614174004",
      id: "shopify-connection-1",
      lastUsedAt: null,
      organizationId: "123e4567-e89b-42d3-a456-426614174002",
      ownedBy: "123e4567-e89b-42d3-a456-426614174003",
      revokedAt: null,
      scopes: ["write_products"],
      shopDomain: "iron-house.myshopify.com",
      status: "active",
      storeId: "store-1",
      tenantId: "123e4567-e89b-42d3-a456-426614174001",
      tokenLastFour: "1234",
      updatedAt: new Date("2026-06-04T09:00:00.000Z"),
      userId: "user-1"
    } as Parameters<typeof publicShopifyConnection>[0];

    const snapshot = publicShopifyConnection(connection);

    expect(snapshot).toMatchObject({
      apiVersion: "2026-04",
      credentialReference: {
        id: "123e4567-e89b-42d3-a456-426614174004",
        provider: "shopify",
        purpose: "shopify-admin-token"
      },
      shopDomain: "iron-house.myshopify.com",
      tokenConfigured: true,
      tokenLastFour: "1234"
    });
    expect(JSON.stringify(snapshot)).not.toContain("shpat_test_secret_token_1234");
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
    const transaction = { shopifyConnection: { findFirst: vi.fn(async () => null), findMany } };
    const withTenantSession = vi.fn(async (_database, _context, operation) => operation(transaction, {
      actorId: "123e4567-e89b-42d3-a456-426614174003",
      organizationId: "123e4567-e89b-42d3-a456-426614174002",
      tenantId: "123e4567-e89b-42d3-a456-426614174001"
    }));
    vi.doMock("../src/db.js", () => ({
      prisma: {},
      withTenantSession
    }));
    vi.doMock("../src/services/phase202SecretBroker.js", () => ({
      readSecretValueInTransaction: vi.fn()
    }));

    try {
      const { getShopifyConnectionCredentials } = await import("../src/services/shopifyConnections.js");

      await expect(getShopifyConnectionCredentials({
        authSubject: "user-1",
        requestId: "request-1",
        storeId: "store-1",
        tenantId: "123e4567-e89b-42d3-a456-426614174001",
        userId: "user-1"
      })).resolves.toBeNull();
      expect(transaction.shopifyConnection.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          organizationId: "123e4567-e89b-42d3-a456-426614174002",
          status: "active",
          storeId: "store-1",
          tenantId: "123e4567-e89b-42d3-a456-426614174001",
          userId: "user-1"
        }
      }));
    } finally {
      vi.doUnmock("../src/db.js");
      vi.doUnmock("../src/services/phase202SecretBroker.js");
      vi.resetModules();
    }
  });

  it("requires the exact Shopify provider and purpose when dereferencing a credential", async () => {
    resetEnv();
    const selected = {
      actorId: "123e4567-e89b-42d3-a456-426614174003",
      apiVersion: "2026-04",
      businessId: null,
      connectedAt: new Date(),
      createdAt: new Date(),
      createdBy: "123e4567-e89b-42d3-a456-426614174003",
      credentialSecretReferenceId: "123e4567-e89b-42d3-a456-426614174004",
      id: "connection-1",
      lastUsedAt: null,
      organizationId: "123e4567-e89b-42d3-a456-426614174002",
      ownedBy: "123e4567-e89b-42d3-a456-426614174003",
      revokedAt: null,
      scopes: [],
      shopDomain: "iron-house.myshopify.com",
      status: "active",
      storeId: "store-1",
      tenantId: "123e4567-e89b-42d3-a456-426614174001",
      tokenLastFour: "1234",
      updatedAt: new Date(),
      userId: "user-1"
    };
    const transaction = { shopifyConnection: { findFirst: vi.fn(async () => selected) } };
    const identity = {
      actorId: selected.actorId,
      organizationId: selected.organizationId,
      tenantId: selected.tenantId
    };
    const readSecretValueInTransaction = vi.fn(async () => {
      throw new Error("SECRET_REFERENCE_METADATA_MISMATCH");
    });
    vi.doMock("../src/db.js", () => ({
      prisma: {},
      withTenantSession: vi.fn(async (_database, _context, operation) => operation(transaction, identity))
    }));
    vi.doMock("../src/services/phase202SecretBroker.js", () => ({ readSecretValueInTransaction }));

    try {
      const { getShopifyConnectionCredentials } = await import("../src/services/shopifyConnections.js");
      await expect(getShopifyConnectionCredentials({
        authSubject: "user-1",
        requestId: "request-2",
        storeId: "store-1",
        tenantId: selected.tenantId,
        userId: "user-1"
      })).rejects.toThrow("SECRET_REFERENCE_METADATA_MISMATCH");
      expect(readSecretValueInTransaction).toHaveBeenCalledWith(transaction, identity, expect.objectContaining({
        expectedProvider: "shopify",
        expectedPurpose: "shopify-admin-token",
        secretReferenceId: selected.credentialSecretReferenceId
      }));
    } finally {
      vi.doUnmock("../src/db.js");
      vi.doUnmock("../src/services/phase202SecretBroker.js");
      vi.resetModules();
    }
  });

  it("creates a tenant-scoped credential reference containing only the Admin token", async () => {
    resetEnv();
    const identity = {
      actorId: "123e4567-e89b-42d3-a456-426614174003",
      organizationId: "123e4567-e89b-42d3-a456-426614174002",
      tenantId: "123e4567-e89b-42d3-a456-426614174001"
    };
    const secretReferenceId = "123e4567-e89b-42d3-a456-426614174004";
    const descriptor = {
      businessId: null,
      createdAt: new Date(),
      environment: "DEVELOPMENT",
      id: secretReferenceId,
      keyVersion: "v1",
      lastFour: "1234",
      organizationId: identity.organizationId,
      provider: "shopify",
      purpose: "shopify-admin-token",
      revokedAt: null,
      rotatedAt: null,
      tenantId: identity.tenantId,
      updatedAt: new Date(),
      version: 1
    };
    const create = vi.fn(async ({ data }) => ({
      ...data,
      connectedAt: new Date(),
      createdAt: new Date(),
      id: "connection-1",
      lastUsedAt: null,
      revokedAt: null,
      updatedAt: new Date()
    }));
    const transaction = {
      secretMutationReceipt: { findUnique: vi.fn(async () => null) },
      shopifyConnection: {
        create,
        findUnique: vi.fn(async () => null)
      }
    };
    const createSecretReferenceInTransaction = vi.fn(async () => ({ descriptor, receipt: {}, replayed: false }));
    vi.doMock("../src/db.js", () => ({
      prisma: {},
      withTenantSession: vi.fn(async (_database, _context, operation) => operation(transaction, identity))
    }));
    vi.doMock("../src/services/phase202SecretBroker.js", () => ({ createSecretReferenceInTransaction }));

    try {
      const { upsertShopifyConnection } = await import("../src/services/shopifyConnections.js");
      await upsertShopifyConnection({
        adminToken: "shpat_test_secret_token_1234",
        authSubject: "user-1",
        idempotencyKey: "shopify-connection-create-1",
        requestId: "request-create-1",
        scopes: ["write_products"],
        shopDomain: "iron-house.myshopify.com",
        storeId: "store-1",
        tenantId: identity.tenantId,
        userId: "user-1"
      });
      expect(createSecretReferenceInTransaction).toHaveBeenCalledWith(transaction, identity, expect.objectContaining({
        provider: "shopify",
        purpose: "shopify-admin-token",
        secretValue: { adminToken: "shpat_test_secret_token_1234" }
      }));
      expect(Object.keys(createSecretReferenceInTransaction.mock.calls[0]?.[2]?.secretValue ?? {})).toEqual(["adminToken"]);
      expect(create.mock.calls[0]?.[0]?.data).toMatchObject({
        actorId: identity.actorId,
        createdBy: identity.actorId,
        credentialSecretReferenceId: secretReferenceId,
        organizationId: identity.organizationId,
        ownedBy: identity.actorId,
        tenantId: identity.tenantId
      });
      expect(create.mock.calls[0]?.[0]?.data).not.toHaveProperty("credentialJson");
    } finally {
      vi.doUnmock("../src/db.js");
      vi.doUnmock("../src/services/phase202SecretBroker.js");
      vi.resetModules();
    }
  });

  it("replays a lost create response without rotating the credential and rejects changed secret material", async () => {
    resetEnv();
    const identity = {
      actorId: "123e4567-e89b-42d3-a456-426614174003",
      organizationId: "123e4567-e89b-42d3-a456-426614174002",
      tenantId: "123e4567-e89b-42d3-a456-426614174001"
    };
    const descriptor = {
      businessId: null,
      createdAt: new Date("2026-08-02T12:00:00.000Z"),
      environment: "DEVELOPMENT",
      id: "123e4567-e89b-42d3-a456-426614174004",
      keyVersion: "v1",
      lastFour: "1234",
      organizationId: identity.organizationId,
      provider: "shopify",
      purpose: "shopify-admin-token",
      revokedAt: null,
      rotatedAt: null,
      tenantId: identity.tenantId,
      updatedAt: new Date("2026-08-02T12:00:00.000Z"),
      version: 1
    };
    const existing = {
      actorId: identity.actorId,
      apiVersion: "2026-04",
      businessId: null,
      connectedAt: new Date("2026-08-02T12:00:00.000Z"),
      createdAt: new Date("2026-08-02T12:00:00.000Z"),
      createdBy: identity.actorId,
      credentialSecretReferenceId: descriptor.id,
      id: "connection-1",
      lastUsedAt: null,
      organizationId: identity.organizationId,
      ownedBy: identity.actorId,
      revokedAt: null,
      scopes: ["write_products"],
      shopDomain: "iron-house.myshopify.com",
      status: "active",
      storeId: "store-1",
      tenantId: identity.tenantId,
      tokenLastFour: "1234",
      updatedAt: new Date("2026-08-02T12:00:00.000Z"),
      userId: "user-1"
    };
    const update = vi.fn();
    const transaction = {
      secretMutationReceipt: { findUnique: vi.fn(async () => ({ transition: "CREATE" })) },
      shopifyConnection: { findUnique: vi.fn(async () => existing), update }
    };
    const createSecretReferenceInTransaction = vi.fn(async (_transaction, _identity, input) => {
      if (input.secretValue.adminToken !== "shpat_test_secret_token_1234") {
        throw Object.assign(new Error("The idempotency key was already used for a different secret transition."), {
          code: "IDEMPOTENCY_KEY_REUSED",
          statusCode: 409
        });
      }
      return { descriptor, receipt: {}, replayed: true };
    });
    const readSecretValueInTransaction = vi.fn();
    const rotateSecretReferenceInTransaction = vi.fn();
    vi.doMock("../src/db.js", () => ({
      prisma: {},
      withTenantSession: vi.fn(async (_database, _context, operation) => operation(transaction, identity))
    }));
    vi.doMock("../src/services/phase202SecretBroker.js", () => ({
      createSecretReferenceInTransaction,
      readSecretValueInTransaction,
      rotateSecretReferenceInTransaction
    }));

    const retry = {
      adminToken: "shpat_test_secret_token_1234",
      authSubject: "user-1",
      idempotencyKey: "shopify-connection-create-lost-response",
      requestId: "request-retry",
      scopes: ["write_products"],
      shopDomain: existing.shopDomain,
      storeId: existing.storeId,
      tenantId: identity.tenantId,
      userId: existing.userId
    };
    try {
      const { upsertShopifyConnection } = await import("../src/services/shopifyConnections.js");
      await expect(upsertShopifyConnection(retry)).resolves.toEqual(existing);
      expect(createSecretReferenceInTransaction).toHaveBeenCalledTimes(1);
      expect(readSecretValueInTransaction).not.toHaveBeenCalled();
      expect(rotateSecretReferenceInTransaction).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();

      await expect(upsertShopifyConnection({
        ...retry,
        adminToken: "shpat_changed_secret_token_9999",
        requestId: "request-collision"
      })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", statusCode: 409 });
      expect(rotateSecretReferenceInTransaction).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    } finally {
      vi.doUnmock("../src/db.js");
      vi.doUnmock("../src/services/phase202SecretBroker.js");
      vi.resetModules();
    }
  });

  it("rejects a connection row returned outside the bound tenant scope", async () => {
    resetEnv();
    const identity = {
      actorId: "123e4567-e89b-42d3-a456-426614174003",
      organizationId: "123e4567-e89b-42d3-a456-426614174002",
      tenantId: "123e4567-e89b-42d3-a456-426614174001"
    };
    const selected = {
      actorId: identity.actorId,
      apiVersion: "2026-04",
      businessId: null,
      connectedAt: new Date(),
      createdAt: new Date(),
      createdBy: identity.actorId,
      credentialSecretReferenceId: "123e4567-e89b-42d3-a456-426614174004",
      id: "connection-cross-tenant",
      lastUsedAt: null,
      organizationId: "223e4567-e89b-42d3-a456-426614174002",
      ownedBy: identity.actorId,
      revokedAt: null,
      scopes: [],
      shopDomain: "iron-house.myshopify.com",
      status: "active",
      storeId: "store-1",
      tenantId: "223e4567-e89b-42d3-a456-426614174001",
      tokenLastFour: "1234",
      updatedAt: new Date(),
      userId: "user-1"
    };
    const transaction = { shopifyConnection: { findFirst: vi.fn(async () => selected) } };
    const readSecretValueInTransaction = vi.fn();
    vi.doMock("../src/db.js", () => ({
      prisma: {},
      withTenantSession: vi.fn(async (_database, _context, operation) => operation(transaction, identity))
    }));
    vi.doMock("../src/services/phase202SecretBroker.js", () => ({ readSecretValueInTransaction }));

    try {
      const { getShopifyConnectionCredentials } = await import("../src/services/shopifyConnections.js");
      await expect(getShopifyConnectionCredentials({
        authSubject: "user-1",
        requestId: "request-cross-tenant",
        storeId: "store-1",
        tenantId: identity.tenantId,
        userId: "user-1"
      })).rejects.toThrow("SHOPIFY_CONNECTION_TENANT_SCOPE_MISMATCH");
      expect(readSecretValueInTransaction).not.toHaveBeenCalled();
    } finally {
      vi.doUnmock("../src/db.js");
      vi.doUnmock("../src/services/phase202SecretBroker.js");
      vi.resetModules();
    }
  });
});
