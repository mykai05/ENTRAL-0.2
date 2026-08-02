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
  const oauthTenantId = "123e4567-e89b-42d3-a456-426614174001";

  it("builds and verifies expiring signed OAuth state", async () => {
    resetEnv();
    const { buildShopifyOAuthState, verifyShopifyOAuthState } = await import("../src/services/shopifyOAuth.js");
    const state = buildShopifyOAuthState({
      authorizationVersion: 7,
      returnTo: "https://app.entral.test/merch",
      scopes: ["write_products"],
      shopDomain: "iron-house.myshopify.com",
      storeId: "store-1",
      tenantId: oauthTenantId,
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
      authorizationVersion: 7,
      nonce: "test-nonce",
      returnTo: "https://app.entral.test/merch",
      scopes: ["write_products"],
      shopDomain: "iron-house.myshopify.com",
      storeId: "store-1",
      tenantId: oauthTenantId,
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

  it("rejects a correctly signed legacy state without an exact tenant binding", async () => {
    resetEnv();
    const { buildShopifyOAuthState, verifyShopifyOAuthState } = await import("../src/services/shopifyOAuth.js");
    const state = buildShopifyOAuthState({
      authorizationVersion: 7,
      scopes: ["write_products"],
      shopDomain: "iron-house.myshopify.com",
      storeId: "store-1",
      tenantId: oauthTenantId,
      userId: "user-1"
    }, {
      nonce: "legacy-state",
      now: new Date("2026-06-04T09:00:00.000Z"),
      secret: "state-secret"
    });
    const [encoded] = state.split(".");
    const payload = JSON.parse(Buffer.from(encoded!, "base64url").toString("utf8"));
    delete payload.tenantId;
    const legacyEncoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const legacySignature = createHmac("sha256", "state-secret").update(legacyEncoded).digest("hex");

    expect(() => verifyShopifyOAuthState(`${legacyEncoded}.${legacySignature}`, {
      now: new Date("2026-06-04T09:00:30.000Z"),
      secret: "state-secret"
    })).toThrow(/tenant binding/i);
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
      authorizationVersion: 7,
      returnTo: "https://app.entral.test/merch",
      shopDomain: "https://iron-house.myshopify.com/admin",
      storeId: "store-1",
      tenantId: oauthTenantId,
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

  it("creates OAuth continuations with a tenant-scoped secret reference and no payload column", async () => {
    resetEnv();
    const tenantId = "123e4567-e89b-42d3-a456-426614174001";
    const organizationId = "123e4567-e89b-42d3-a456-426614174002";
    const actorId = "123e4567-e89b-42d3-a456-426614174003";
    const secretReferenceId = "123e4567-e89b-42d3-a456-426614174004";
    const payload = {
      connectorApproval: true,
      countryCode: "US",
      dryRun: true,
      includeCollections: true,
      includeProducts: true,
      includeStoreShell: true,
      liveUnlockPhrase: null,
      maxProducts: 5,
      note: null,
      ownerEmail: null,
      requestedShopName: null,
      storeType: "development" as const
    };
    const descriptor = {
      businessId: null,
      createdAt: new Date(),
      environment: "DEVELOPMENT",
      id: secretReferenceId,
      keyVersion: "v1",
      lastFour: null,
      organizationId,
      provider: "shopify",
      purpose: "shopify-oauth-continuation",
      revokedAt: null,
      rotatedAt: null,
      tenantId,
      updatedAt: new Date(),
      version: 1
    };
    const create = vi.fn(async ({ data }) => ({
      ...data,
      auditLogId: null,
      consumedAt: null,
      createdAt: new Date(),
      id: "continuation-1",
      resultAuditLogId: null,
      resultSummary: null,
      updatedAt: new Date()
    }));
    const transaction = {
      secretMutationReceipt: { findUnique: vi.fn(async () => null) },
      shopifyOAuthContinuation: {
        create,
        findUnique: vi.fn(async () => null)
      }
    };
    const identity = { actorId, organizationId, tenantId };
    const createSecretReferenceInTransaction = vi.fn(async () => ({ descriptor, receipt: {}, replayed: false }));
    vi.doMock("../src/db.js", () => ({
      prisma: {},
      withTenantSession: vi.fn(async (_database, _context, operation) => operation(transaction, identity))
    }));
    vi.doMock("../src/services/phase202SecretBroker.js", () => ({ createSecretReferenceInTransaction }));

    try {
      const { createShopifyOAuthContinuation } = await import("../src/services/shopifyOAuthContinuations.js");
      const record = await createShopifyOAuthContinuation({
        authSubject: "user-1",
        authorizationVersion: 7,
        expiresAt: new Date(Date.now() + 60_000),
        idempotencyKey: "oauth-continuation-create-1",
        payload,
        requestId: "request-1",
        shopDomain: "iron-house.myshopify.com",
        stateNonce: "state-1",
        storeId: "store-1",
        tenantId,
        userId: "user-1"
      });
      expect(createSecretReferenceInTransaction).toHaveBeenCalledWith(transaction, identity, expect.objectContaining({
        provider: "shopify",
        purpose: "shopify-oauth-continuation",
        secretValue: payload
      }));
      expect(create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ payloadSecretReferenceId: secretReferenceId })
      }));
      expect(create.mock.calls[0]?.[0]?.data).not.toHaveProperty("payloadJson");
      expect(record.payloadReference).toMatchObject({
        id: secretReferenceId,
        provider: "shopify",
        purpose: "shopify-oauth-continuation"
      });
    } finally {
      vi.doUnmock("../src/db.js");
      vi.doUnmock("../src/services/phase202SecretBroker.js");
      vi.resetModules();
    }
  });

  it("replays a lost continuation response without rotating its payload and rejects changed payload reuse", async () => {
    resetEnv();
    const tenantId = "123e4567-e89b-42d3-a456-426614174001";
    const organizationId = "123e4567-e89b-42d3-a456-426614174002";
    const actorId = "123e4567-e89b-42d3-a456-426614174003";
    const secretReferenceId = "123e4567-e89b-42d3-a456-426614174004";
    const payload = {
      connectorApproval: true,
      countryCode: "US",
      dryRun: true,
      includeCollections: true,
      includeProducts: true,
      includeStoreShell: true,
      liveUnlockPhrase: null,
      maxProducts: 5,
      note: null,
      ownerEmail: null,
      requestedShopName: null,
      storeType: "development" as const
    };
    const descriptor = {
      businessId: null,
      createdAt: new Date("2026-08-02T12:00:00.000Z"),
      environment: "DEVELOPMENT",
      id: secretReferenceId,
      keyVersion: "v1",
      lastFour: null,
      organizationId,
      provider: "shopify",
      purpose: "shopify-oauth-continuation",
      revokedAt: null,
      rotatedAt: null,
      tenantId,
      updatedAt: new Date("2026-08-02T12:00:00.000Z"),
      version: 1
    };
    const existing = {
      actorId,
      auditLogId: null,
      authorizationVersion: 7,
      businessId: null,
      consumedAt: null,
      createdAt: new Date("2026-08-02T12:00:00.000Z"),
      createdBy: actorId,
      expiresAt: new Date("2026-08-02T13:00:00.000Z"),
      id: "continuation-1",
      organizationId,
      ownedBy: actorId,
      payloadSecretReferenceId: secretReferenceId,
      resultAuditLogId: null,
      resultSummary: null,
      shopDomain: "iron-house.myshopify.com",
      stateNonce: "state-lost-response",
      status: "pending",
      storeId: "store-1",
      tenantId,
      updatedAt: new Date("2026-08-02T12:00:00.000Z"),
      userId: "user-1"
    };
    const update = vi.fn();
    const transaction = {
      secretMutationReceipt: { findUnique: vi.fn(async () => ({ transition: "CREATE" })) },
      shopifyOAuthContinuation: { findUnique: vi.fn(async () => existing), update }
    };
    const createSecretReferenceInTransaction = vi.fn(async (_transaction, _identity, input) => {
      if (input.secretValue.maxProducts !== payload.maxProducts) {
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
      withTenantSession: vi.fn(async (_database, _context, operation) => operation(transaction, { actorId, organizationId, tenantId }))
    }));
    vi.doMock("../src/services/phase202SecretBroker.js", () => ({
      createSecretReferenceInTransaction,
      readSecretValueInTransaction,
      rotateSecretReferenceInTransaction
    }));

    const retry = {
      authSubject: "user-1",
      authorizationVersion: existing.authorizationVersion,
      expiresAt: existing.expiresAt,
      idempotencyKey: "oauth-continuation-create-lost-response",
      payload,
      requestId: "request-retry",
      shopDomain: existing.shopDomain,
      stateNonce: existing.stateNonce,
      storeId: existing.storeId,
      tenantId,
      userId: existing.userId
    };
    try {
      const { createShopifyOAuthContinuation } = await import("../src/services/shopifyOAuthContinuations.js");
      const replay = await createShopifyOAuthContinuation(retry);
      expect(replay).toMatchObject({
        id: existing.id,
        payload,
        payloadReference: { id: secretReferenceId, version: 1 },
        status: "pending"
      });
      expect(createSecretReferenceInTransaction).toHaveBeenCalledTimes(1);
      expect(readSecretValueInTransaction).not.toHaveBeenCalled();
      expect(rotateSecretReferenceInTransaction).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();

      await expect(createShopifyOAuthContinuation({
        ...retry,
        payload: { ...payload, maxProducts: 6 },
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

  it("binds terminal OAuth retries to the exact result payload", async () => {
    resetEnv();
    const tenantId = "123e4567-e89b-42d3-a456-426614174001";
    const organizationId = "123e4567-e89b-42d3-a456-426614174002";
    const actorId = "123e4567-e89b-42d3-a456-426614174003";
    const secretReferenceId = "123e4567-e89b-42d3-a456-426614174004";
    const continuationId = "continuation-terminal-1";
    const resultAuditLogId = "audit-terminal-1";
    const row = {
      actorId,
      auditLogId: null,
      authorizationVersion: 7,
      businessId: null,
      consumedAt: null,
      createdAt: new Date("2026-08-02T12:00:00.000Z"),
      createdBy: actorId,
      expiresAt: new Date("2026-08-02T13:00:00.000Z"),
      id: continuationId,
      organizationId,
      ownedBy: actorId,
      payloadSecretReferenceId: secretReferenceId,
      resultAuditLogId: null,
      resultSummary: null,
      shopDomain: "iron-house.myshopify.com",
      stateNonce: "state-terminal-response",
      status: "pending",
      storeId: "store-1",
      tenantId,
      updatedAt: new Date("2026-08-02T12:00:00.000Z"),
      userId: "user-1"
    };
    const transaction = {
      shopifyOAuthContinuation: {
        findFirst: vi.fn()
          .mockResolvedValueOnce(row)
          .mockResolvedValueOnce({
            ...row,
            consumedAt: new Date("2026-08-02T12:05:00.000Z"),
            resultAuditLogId,
            resultSummary: "first terminal result",
            status: "consumed"
          }),
        updateMany: vi.fn(async () => ({ count: 1 }))
      }
    };
    let retainedRevocation: { idempotencyKey: string; revocationPurpose: string } | null = null;
    const revokeSecretReferenceInTransaction = vi.fn(async (_transaction, _identity, input) => {
      const next = {
        idempotencyKey: input.idempotencyKey,
        revocationPurpose: input.revocationPurpose
      };
      if (retainedRevocation
        && retainedRevocation.idempotencyKey === next.idempotencyKey
        && retainedRevocation.revocationPurpose !== next.revocationPurpose) {
        throw Object.assign(new Error("The idempotency key was already used for a different secret transition."), {
          code: "IDEMPOTENCY_KEY_REUSED",
          statusCode: 409
        });
      }
      retainedRevocation = next;
      return { receipt: {}, replayed: false };
    });
    vi.doMock("../src/db.js", () => ({
      prisma: {},
      withTenantSession: vi.fn(async (_database, _context, operation) => operation(transaction, { actorId, organizationId, tenantId }))
    }));
    vi.doMock("../src/services/phase202SecretBroker.js", () => ({
      readSecretValueInTransaction: vi.fn(async () => ({ value: {} })),
      revokeSecretReferenceInTransaction
    }));

    const command = {
      authSubject: row.userId,
      continuationId,
      idempotencyKey: "oauth-terminal-lost-response",
      requestId: "request-terminal-1",
      resultAuditLogId,
      resultSummary: "first terminal result",
      tenantId
    };
    try {
      const { markShopifyOAuthContinuationConsumed } = await import("../src/services/shopifyOAuthContinuations.js");
      await markShopifyOAuthContinuationConsumed(command);
      await expect(markShopifyOAuthContinuationConsumed({
        ...command,
        requestId: "request-terminal-collision",
        resultSummary: "changed terminal result"
      })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", statusCode: 409 });
      expect(transaction.shopifyOAuthContinuation.updateMany).toHaveBeenCalledTimes(1);
      expect(revokeSecretReferenceInTransaction).toHaveBeenCalledTimes(2);
    } finally {
      vi.doUnmock("../src/db.js");
      vi.doUnmock("../src/services/phase202SecretBroker.js");
      vi.resetModules();
    }
  });

  it("fails closed when an OAuth payload reference has the wrong provider or purpose", async () => {
    resetEnv();
    const tenantId = "123e4567-e89b-42d3-a456-426614174001";
    const organizationId = "123e4567-e89b-42d3-a456-426614174002";
    const actorId = "123e4567-e89b-42d3-a456-426614174003";
    const row = {
      actorId,
      auditLogId: null,
      authorizationVersion: 7,
      businessId: null,
      consumedAt: null,
      createdAt: new Date(),
      createdBy: actorId,
      expiresAt: new Date(Date.now() + 60_000),
      id: "continuation-1",
      organizationId,
      ownedBy: actorId,
      payloadSecretReferenceId: "123e4567-e89b-42d3-a456-426614174004",
      resultAuditLogId: null,
      resultSummary: null,
      shopDomain: "iron-house.myshopify.com",
      stateNonce: "state-1",
      status: "pending",
      storeId: "store-1",
      tenantId,
      updatedAt: new Date(),
      userId: "user-1"
    };
    const transaction = { shopifyOAuthContinuation: { findFirst: vi.fn(async () => row) } };
    const identity = { actorId, organizationId, tenantId };
    const readSecretValueInTransaction = vi.fn(async () => {
      throw new Error("SECRET_REFERENCE_METADATA_MISMATCH");
    });
    vi.doMock("../src/db.js", () => ({
      prisma: {},
      withTenantSession: vi.fn(async (_database, _context, operation) => operation(transaction, identity))
    }));
    vi.doMock("../src/services/phase202SecretBroker.js", () => ({ readSecretValueInTransaction }));

    try {
      const { getPendingShopifyOAuthContinuation } = await import("../src/services/shopifyOAuthContinuations.js");
      await expect(getPendingShopifyOAuthContinuation({
        authSubject: "user-1",
        requestId: "request-2",
        shopDomain: row.shopDomain,
        stateNonce: row.stateNonce,
        storeId: row.storeId,
        tenantId,
        userId: row.userId
      })).rejects.toThrow("SECRET_REFERENCE_METADATA_MISMATCH");
      expect(readSecretValueInTransaction).toHaveBeenCalledWith(transaction, identity, expect.objectContaining({
        expectedProvider: "shopify",
        expectedPurpose: "shopify-oauth-continuation",
        secretReferenceId: row.payloadSecretReferenceId
      }));
    } finally {
      vi.doUnmock("../src/db.js");
      vi.doUnmock("../src/services/phase202SecretBroker.js");
      vi.resetModules();
    }
  });
});
