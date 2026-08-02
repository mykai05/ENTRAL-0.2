import { createCipheriv, createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  withPersonalSession: vi.fn(),
  withTenantSession: vi.fn()
}));

vi.mock("../src/db.js", () => ({
  prisma: {},
  withPersonalSession: mocks.withPersonalSession,
  withTenantSession: mocks.withTenantSession
}));

const tenantId = "123e4567-e89b-42d3-a456-426614174101";
const organizationId = "123e4567-e89b-42d3-a456-426614174102";
const actorId = "123e4567-e89b-42d3-a456-426614174103";
const secretReferenceId = "123e4567-e89b-42d3-a456-426614174104";
const requestId = "123e4567-e89b-42d3-a456-426614174105";
const createdAt = new Date("2026-08-02T09:00:00.000Z");

function setTestEnvironment() {
  process.env.NODE_ENV = "test";
  delete process.env.PROCESS_ROLE;
  process.env.DATABASE_URL = "file:./phase202-secret-broker.db";
  process.env.JWT_SECRET = "phase202-secret-broker-test-secret-long-enough";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.APP_PUBLIC_URL = "http://localhost:3000";
  process.env.API_PUBLIC_URL = "http://localhost:4000";
  process.env.AUTH_EMAIL_PROVIDER = "console";
  process.env.DATA_ENCRYPTION_KEY = "phase202-active-secret-key-material";
  process.env.DATA_ENCRYPTION_KEY_VERSION = "v2";
  process.env.DATA_ENCRYPTION_KEYRING_JSON = JSON.stringify({
    v1: "phase202-retained-old-key-material"
  });
  process.env.SECRET_BROKER_ENVIRONMENT = "PRODUCTION";
}

function transaction() {
  return {
    secretReference: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn()
    },
    secretAccessAudit: { create: vi.fn().mockResolvedValue({}) },
    secretMutationReceipt: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null)
    },
    identityActor: {
      findUnique: vi.fn().mockResolvedValue({
        id: actorId,
        actorType: "HUMAN",
        humanUserId: "user-ada",
        serviceSubject: null,
        agentId: null
      })
    },
    tenantBoundary: {
      findUnique: vi.fn().mockResolvedValue({
        id: tenantId,
        organizationId,
        environment: "PRODUCTION",
        dataResidency: "US"
      })
    },
    personalSecretReference: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn()
    },
    personalSecretAccessAudit: { create: vi.fn().mockResolvedValue({}) }
  };
}

function tenantIdentity() {
  return {
    actorId,
    appUserId: "123e4567-e89b-42d3-a456-426614174199",
    organizationId,
    role: "OWNER",
    tenantId
  };
}

function bindTenant(tx: ReturnType<typeof transaction>) {
  mocks.withTenantSession.mockImplementation(async (_database, _context, operation) => operation(tx, tenantIdentity()));
}

function bindPersonal(tx: ReturnType<typeof transaction>, boundActorId = actorId) {
  mocks.withPersonalSession.mockImplementation(async (_database, _context, operation) => operation(tx, {
    actorId: boundActorId,
    appUserId: "123e4567-e89b-42d3-a456-426614174199",
    authSubject: "user-ada"
  }));
}

function tenantRow(overrides: Record<string, unknown> = {}) {
  return {
    id: secretReferenceId,
    organizationId,
    tenantId,
    businessId: null,
    provider: "shopify",
    purpose: "storefront.api",
    environment: "PRODUCTION",
    keyVersion: "v2",
    encryptedValue: "",
    lastFour: "a1b2",
    version: 1,
    rotatedAt: null,
    revokedAt: null,
    createdByActorId: actorId,
    createdAt,
    updatedAt: createdAt,
    ...overrides
  };
}

function personalRow(overrides: Record<string, unknown> = {}) {
  return {
    id: secretReferenceId,
    actorId,
    provider: "mfa",
    purpose: "totp.seed",
    environment: "PRODUCTION",
    keyVersion: "v2",
    encryptedValue: "",
    lastFour: null,
    version: 1,
    revokedAt: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides
  };
}

function oldKeyEnvelope(value: unknown) {
  const context = {
    secretReferenceId,
    organizationId,
    tenantId,
    businessId: null,
    actorId,
    provider: "shopify",
    purpose: "storefront.api",
    environment: "PRODUCTION",
    recordVersion: 1
  };
  const keyVersion = "v1";
  const key = createHash("sha256").update("phase202-retained-old-key-material").digest();
  const iv = Buffer.from("00112233445566778899aabb", "hex");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(JSON.stringify([
    "entral-secret-v2",
    context.secretReferenceId,
    context.organizationId,
    context.tenantId,
    context.businessId,
    context.actorId,
    context.provider,
    context.purpose,
    context.environment,
    context.recordVersion,
    keyVersion
  ]), "utf8"));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return JSON.stringify({
    __entralEncrypted: true,
    alg: "aes-256-gcm",
    data: encrypted.toString("base64"),
    environment: "PRODUCTION",
    iv: iv.toString("base64"),
    keyVersion,
    tag: cipher.getAuthTag().toString("base64"),
    v: 2
  });
}

beforeEach(() => {
  vi.resetModules();
  mocks.withTenantSession.mockReset();
  mocks.withPersonalSession.mockReset();
  setTestEnvironment();
});

describe("Phase 202 strict tenant secret broker", () => {
  it("creates an actor-bound encrypted reference and returns only its descriptor", async () => {
    const tx = transaction();
    bindTenant(tx);
    tx.secretReference.create.mockImplementation(async ({ data }) => ({
      ...data,
      rotatedAt: null,
      revokedAt: null,
      createdAt,
      updatedAt: createdAt
    }));
    const broker = await import("../src/services/phase202SecretBroker.js");
    const sentinel = "provider-secret-must-not-escape";

    const result = await broker.createSecretReference({
      authSubject: "user-ada",
      tenantId,
      requestId,
      idempotencyKey: "secret-create-0001",
      provider: "shopify",
      purpose: "storefront.api",
      environment: "PRODUCTION",
      secretValue: { accessToken: sentinel },
      lastFour: "a1b2"
    });

    const createData = tx.secretReference.create.mock.calls[0]![0].data;
    expect(JSON.parse(createData.encryptedValue)).toMatchObject({
      __entralEncrypted: true,
      environment: "PRODUCTION",
      keyVersion: "v2",
      v: 2
    });
    expect(createData.encryptedValue).not.toContain(sentinel);
    expect(JSON.stringify(result)).not.toContain(sentinel);
    expect(result.descriptor).not.toHaveProperty("encryptedValue");
    expect(result.descriptor).not.toHaveProperty("createdByActorId");
    expect(result.receipt).toMatchObject({
      transition: "CREATE",
      idempotency_key: "secret-create-0001",
      prior_version: 0,
      resulting_version: 1
    });
    expect(tx.secretAccessAudit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId,
        tenantId,
        actorId,
        action: "CREATE",
        purpose: "storefront.api",
        outcome: "SUCCEEDED",
        requestId
      })
    });
    expect(mocks.withTenantSession.mock.calls[0]![3]).toEqual({ isolationLevel: "Serializable" });
  });

  it("replays the exact durable receipt and rejects an idempotency collision without another secret write", async () => {
    const tx = transaction();
    bindTenant(tx);
    tx.secretReference.create.mockImplementation(async ({ data }) => ({
      ...data,
      rotatedAt: null,
      revokedAt: null,
      createdAt,
      updatedAt: createdAt
    }));
    const broker = await import("../src/services/phase202SecretBroker.js");
    const input = {
      authSubject: "user-ada" as const,
      tenantId,
      requestId,
      idempotencyKey: "secret-create-replay-0001",
      provider: "shopify",
      purpose: "storefront.api",
      environment: "PRODUCTION" as const,
      secretValue: { token: "receipt-secret-sentinel" },
      lastFour: "a1b2"
    };
    const first = await broker.createSecretReference(input);
    const persisted = tx.secretMutationReceipt.create.mock.calls[0]![0].data;
    tx.secretMutationReceipt.findUnique.mockResolvedValue({
      actorId,
      idempotencyKey: persisted.idempotencyKey,
      requestFingerprint: persisted.requestFingerprint,
      resultPayload: persisted.resultPayload,
      secretReferenceId: persisted.secretReferenceId,
      transition: persisted.transition
    });

    const replay = await broker.createSecretReference(input);

    expect(replay.replayed).toBe(true);
    expect(replay.receipt).toEqual(first.receipt);
    expect(tx.secretReference.create).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(replay.receipt)).not.toContain("receipt-secret-sentinel");
    await expect(broker.createSecretReference({
      ...input,
      secretValue: { token: "different-secret" }
    })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", statusCode: 409 });
    expect(tx.secretReference.create).toHaveBeenCalledTimes(1);
  });

  it("reads only a strictly authenticated envelope and retains a non-secret audit", async () => {
    const tx = transaction();
    bindTenant(tx);
    const secureJson = await import("../src/services/secureJson.js");
    const sentinel = "strict-read-secret";
    const row = tenantRow();
    row.encryptedValue = secureJson.stringifySecretEnvelope({ token: sentinel }, {
      secretReferenceId,
      organizationId,
      tenantId,
      businessId: null,
      actorId,
      provider: row.provider,
      purpose: row.purpose,
      environment: "PRODUCTION",
      recordVersion: 1
    });
    tx.secretReference.findFirst.mockResolvedValue(row);
    const broker = await import("../src/services/phase202SecretBroker.js");

    const result = await broker.readSecretValue<{ token: string }>({
      authSubject: "user-ada",
      tenantId,
      requestId,
      secretReferenceId,
      accessPurpose: "execute storefront request"
    });

    expect(result.value).toEqual({ token: sentinel });
    expect(result.descriptor).not.toHaveProperty("encryptedValue");
    expect(JSON.stringify(tx.secretAccessAudit.create.mock.calls)).not.toContain(sentinel);
    expect(tx.secretAccessAudit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "READ", outcome: "SUCCEEDED", purpose: "execute storefront request" })
    });
  });

  it("blocks plaintext values without exposing their content", async () => {
    const tx = transaction();
    bindTenant(tx);
    const sentinel = "plaintext-must-not-escape";
    tx.secretReference.findFirst.mockResolvedValue(tenantRow({ encryptedValue: JSON.stringify({ token: sentinel }) }));
    const broker = await import("../src/services/phase202SecretBroker.js");

    let error: unknown;
    try {
      await broker.readSecretValue({
        authSubject: "user-ada",
        tenantId,
        requestId,
        secretReferenceId,
        accessPurpose: "runtime use"
      });
    } catch (candidate) {
      error = candidate;
    }

    expect(error).toMatchObject({ code: "SECRET_ENVELOPE_INVALID" });
    expect(JSON.stringify(error)).not.toContain(sentinel);
    expect(JSON.stringify(tx.secretAccessAudit.create.mock.calls)).not.toContain(sentinel);
    expect(tx.secretAccessAudit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ outcome: "BLOCKED_ENVELOPE_INVALID" })
    });
  });

  it("rejects a valid ciphertext transplanted across its AAD-bound purpose", async () => {
    const tx = transaction();
    bindTenant(tx);
    const secureJson = await import("../src/services/secureJson.js");
    const row = tenantRow();
    row.encryptedValue = secureJson.stringifySecretEnvelope({ token: "aad-bound-secret" }, {
      secretReferenceId,
      organizationId,
      tenantId,
      businessId: null,
      actorId,
      provider: row.provider,
      purpose: "different.bound.purpose",
      environment: "PRODUCTION",
      recordVersion: 1
    });
    tx.secretReference.findFirst.mockResolvedValue(row);
    const broker = await import("../src/services/phase202SecretBroker.js");

    await expect(broker.readSecretValue({
      authSubject: "user-ada",
      tenantId,
      requestId,
      secretReferenceId,
      accessPurpose: "runtime use"
    })).rejects.toMatchObject({ code: "SECRET_ENVELOPE_INVALID" });

    expect(tx.secretAccessAudit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ outcome: "BLOCKED_ENVELOPE_INVALID" })
    });
  });

  it("rotates only after decrypting the retained old key and records that proof", async () => {
    const tx = transaction();
    bindTenant(tx);
    const oldSentinel = "old-provider-secret";
    const nextSentinel = "next-provider-secret";
    tx.secretReference.findFirst.mockResolvedValue(tenantRow({
      encryptedValue: oldKeyEnvelope({ token: oldSentinel }),
      keyVersion: "v1"
    }));
    tx.secretReference.updateMany.mockResolvedValue({ count: 1 });
    const broker = await import("../src/services/phase202SecretBroker.js");

    const result = await broker.rotateSecretReference({
      authSubject: "user-ada",
      tenantId,
      requestId,
      idempotencyKey: "secret-rotate-0001",
      secretReferenceId,
      secretValue: { token: nextSentinel },
      rotationPurpose: "scheduled credential rotation",
      lastFour: "c3d4"
    });

    const updateData = tx.secretReference.updateMany.mock.calls[0]![0].data;
    expect(JSON.parse(updateData.encryptedValue)).toMatchObject({ keyVersion: "v2", environment: "PRODUCTION", v: 2 });
    expect(updateData.encryptedValue).not.toContain(oldSentinel);
    expect(updateData.encryptedValue).not.toContain(nextSentinel);
    expect(result.descriptor).toMatchObject({ keyVersion: "v2", version: 2, lastFour: "c3d4" });
    expect(result.descriptor).not.toHaveProperty("encryptedValue");
    expect(result.receipt).toMatchObject({ transition: "ROTATE", prior_version: 1, resulting_version: 2 });
    expect(tx.secretAccessAudit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "ROTATE", outcome: "SUCCEEDED_OLD_KEY_VERIFIED" })
    });
    expect(mocks.withTenantSession.mock.calls[0]![3]).toEqual({ isolationLevel: "Serializable" });
  });

  it("fails closed when the active key is absent and never persists plaintext", async () => {
    delete process.env.DATA_ENCRYPTION_KEY;
    process.env.DATA_ENCRYPTION_KEY_VERSION = "v2";
    process.env.DATA_ENCRYPTION_KEYRING_JSON = JSON.stringify({ v1: "phase202-retained-old-key-material" });
    vi.resetModules();
    const tx = transaction();
    bindTenant(tx);
    const broker = await import("../src/services/phase202SecretBroker.js");
    const sentinel = "never-persist-this-secret";

    await expect(broker.createSecretReference({
      authSubject: "user-ada",
      tenantId,
      requestId,
      idempotencyKey: "secret-create-0002",
      provider: "shopify",
      purpose: "storefront.api",
      environment: "PRODUCTION",
      secretValue: sentinel
    })).rejects.toMatchObject({ code: "SECRET_BROKER_KEY_UNAVAILABLE" });

    expect(tx.secretReference.create).not.toHaveBeenCalled();
    expect(JSON.stringify(tx.secretReference.create.mock.calls)).not.toContain(sentinel);
  });

  it("revokes idempotently and lists descriptors without selecting ciphertext", async () => {
    const tx = transaction();
    bindTenant(tx);
    const row = tenantRow({ encryptedValue: "ciphertext-is-not-selected" });
    tx.secretReference.findFirst.mockResolvedValue(row);
    tx.secretReference.updateMany.mockResolvedValue({ count: 1 });
    tx.secretReference.findMany.mockResolvedValue([{
      id: row.id,
      organizationId: row.organizationId,
      tenantId: row.tenantId,
      businessId: row.businessId,
      provider: row.provider,
      purpose: row.purpose,
      environment: row.environment,
      keyVersion: row.keyVersion,
      lastFour: row.lastFour,
      version: row.version,
      rotatedAt: row.rotatedAt,
      revokedAt: null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }]);
    const broker = await import("../src/services/phase202SecretBroker.js");

    const revoked = await broker.revokeSecretReference({
      authSubject: "user-ada",
      tenantId,
      requestId,
      idempotencyKey: "secret-revoke-0001",
      secretReferenceId,
      revocationPurpose: "provider credential retired"
    });
    const listed = await broker.listSecretReferences({ authSubject: "user-ada", tenantId, requestId });

    expect(revoked.descriptor.revokedAt).toBeInstanceOf(Date);
    expect(revoked.descriptor.version).toBe(2);
    expect(revoked.descriptor).not.toHaveProperty("encryptedValue");
    expect(revoked.receipt).toMatchObject({ transition: "REVOKE", prior_version: 1, resulting_version: 2 });
    expect(listed[0]).not.toHaveProperty("encryptedValue");
    expect(tx.secretReference.findMany.mock.calls[0]![0].select).not.toHaveProperty("encryptedValue");
  });
});

describe("Phase 202 personal secret broker", () => {
  it("binds MFA-like secrets to only the verified personal actor", async () => {
    const tx = transaction();
    bindPersonal(tx);
    let storedRow: ReturnType<typeof personalRow> | null = null;
    tx.personalSecretReference.create.mockImplementation(async ({ data }) => {
      storedRow = personalRow({ ...data });
      return storedRow;
    });
    tx.personalSecretReference.findFirst.mockImplementation(async () => storedRow);
    tx.personalSecretReference.updateMany.mockResolvedValue({ count: 1 });
    const broker = await import("../src/services/phase202SecretBroker.js");
    const sentinel = "personal-totp-seed";

    const created = await broker.createPersonalSecretReference({
      authSubject: "user-ada",
      requestId,
      provider: "mfa",
      purpose: "totp.seed",
      environment: "PRODUCTION",
      secretValue: { seed: sentinel }
    });
    const read = await broker.readPersonalSecretValue<{ seed: string }>({
      authSubject: "user-ada",
      requestId,
      secretReferenceId: created.id,
      accessPurpose: "verify totp"
    });
    const revoked = await broker.revokePersonalSecretReference({
      authSubject: "user-ada",
      requestId,
      secretReferenceId: created.id,
      revocationPurpose: "factor removed"
    });

    expect(read.value).toEqual({ seed: sentinel });
    expect(created).not.toHaveProperty("encryptedValue");
    expect(read.descriptor).not.toHaveProperty("encryptedValue");
    expect(revoked).not.toHaveProperty("encryptedValue");
    expect(storedRow?.encryptedValue).not.toContain(sentinel);
    expect(JSON.stringify(tx.personalSecretAccessAudit.create.mock.calls)).not.toContain(sentinel);
    expect(mocks.withPersonalSession).toHaveBeenCalledTimes(3);
  });
});
