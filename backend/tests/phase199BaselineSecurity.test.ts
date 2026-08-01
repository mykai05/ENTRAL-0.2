import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const managedEnvironmentKeys = [
  "NODE_ENV", "PROCESS_ROLE", "DATABASE_URL", "JWT_SECRET", "COOKIE_NAME",
  "CORS_ORIGIN", "APP_PUBLIC_URL", "API_PUBLIC_URL", "AUTH_EMAIL_PROVIDER",
  "AUTH_EMAIL_FROM", "RESEND_API_KEY", "DATA_ENCRYPTION_KEY", "ADMIN_MFA_CODE"
] as const;
const originalEnvironment = Object.fromEntries(managedEnvironmentKeys.map((key) => [key, process.env[key]]));

function testEnvironment() {
  process.env.NODE_ENV = "test";
  delete process.env.PROCESS_ROLE;
  process.env.DATABASE_URL = "file:./phase199-baseline.db";
  process.env.JWT_SECRET = "phase199-test-secret-that-is-long-enough";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.APP_PUBLIC_URL = "http://localhost:3000";
  process.env.API_PUBLIC_URL = "http://localhost:4000";
  process.env.AUTH_EMAIL_PROVIDER = "console";
  delete process.env.AUTH_EMAIL_FROM;
  delete process.env.RESEND_API_KEY;
  process.env.DATA_ENCRYPTION_KEY = "phase199-test-encryption-key";
  delete process.env.ADMIN_MFA_CODE;
}

function productionApiEnvironment() {
  process.env.NODE_ENV = "production";
  process.env.AUTH_EMAIL_PROVIDER = "resend";
  process.env.AUTH_EMAIL_FROM = "ENTRAL <noreply@example.com>";
  process.env.RESEND_API_KEY = "test-resend-key";
}

beforeEach(() => {
  vi.resetModules();
  testEnvironment();
});

afterEach(() => {
  for (const key of managedEnvironmentKeys) {
    const original = originalEnvironment[key];
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
  vi.restoreAllMocks();
});

describe("Phase 199 production truth and secure JSON reconciliation", () => {
  it("rejects production startup without an encryption key", async () => {
    productionApiEnvironment();
    delete process.env.DATA_ENCRYPTION_KEY;
    process.env.ADMIN_MFA_CODE = "123456";

    await expect(import("../src/env.js")).rejects.toThrow(
      "Production requires DATA_ENCRYPTION_KEY; plaintext secure JSON is forbidden."
    );
  });

  it("rejects production API startup without administrative step-up", async () => {
    productionApiEnvironment();
    process.env.DATA_ENCRYPTION_KEY = "phase199-production-encryption-key";
    delete process.env.ADMIN_MFA_CODE;

    await expect(import("../src/env.js")).rejects.toThrow(
      "Production API requires ADMIN_MFA_CODE for administrative step-up."
    );
  });

  it("audits plaintext secure JSON without exposing values or row identifiers", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([
        { tableName: "ShopifyConnection", columnName: "credentialJson" },
        { tableName: "ShopifyOAuthContinuation", columnName: "payloadJson" }
      ])
      .mockResolvedValueOnce([{ rowId: "customer-record-42", value: JSON.stringify({ accessToken: "must-not-escape" }) }])
      .mockResolvedValueOnce([]);
    const database = {
      $queryRawUnsafe: query,
      $executeRawUnsafe: vi.fn(),
      $transaction: vi.fn()
    };
    const { reconcileSecureJson } = await import("../src/services/secureJsonReconciliation.js");

    const receipt = await reconcileSecureJson(database as never, "AUDIT", () => new Date("2026-08-01T16:30:00.000Z"));
    const serialized = JSON.stringify(receipt);

    expect(receipt).toMatchObject({
      status: "REQUIRES_REENCRYPTION",
      plaintext_rows_found: 1,
      plaintext_rows_reencrypted: 0,
      invalid_json_rows: 0
    });
    expect(receipt.targets[0]?.plaintext_row_id_sha256[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(serialized).not.toContain("customer-record-42");
    expect(serialized).not.toContain("must-not-escape");
  });

  it("re-encrypts discovered plaintext rows atomically with an optimistic match", async () => {
    const plaintext = JSON.stringify({ accessToken: "provider-secret" });
    const query = vi.fn()
      .mockResolvedValueOnce([
        { tableName: "ShopifyConnection", columnName: "credentialJson" },
        { tableName: "ShopifyOAuthContinuation", columnName: "payloadJson" }
      ])
      .mockResolvedValueOnce([{ rowId: "row-1", value: plaintext }])
      .mockResolvedValueOnce([]);
    const execute = vi.fn().mockResolvedValue(1);
    const database = {
      $queryRawUnsafe: query,
      $executeRawUnsafe: vi.fn(),
      $transaction: vi.fn(async (operation: (transaction: { $executeRawUnsafe: typeof execute }) => Promise<void>) => operation({ $executeRawUnsafe: execute }))
    };
    const { isEncryptedSecureJson } = await import("../src/services/secureJson.js");
    const { reconcileSecureJson } = await import("../src/services/secureJsonReconciliation.js");

    const receipt = await reconcileSecureJson(database as never, "APPLY", () => new Date("2026-08-01T16:31:00.000Z"));

    expect(receipt.status).toBe("VERIFIED");
    expect(receipt.plaintext_rows_found).toBe(1);
    expect(receipt.plaintext_rows_reencrypted).toBe(1);
    expect(execute).toHaveBeenCalledOnce();
    const [, encrypted, rowId, previous] = execute.mock.calls[0] as [string, string, string, string];
    expect(isEncryptedSecureJson(encrypted)).toBe(true);
    expect(rowId).toBe("row-1");
    expect(previous).toBe(plaintext);
  });

  it("blocks mutation when invalid legacy JSON requires operator review", async () => {
    const database = {
      $queryRawUnsafe: vi.fn()
        .mockResolvedValueOnce([
          { tableName: "ShopifyConnection", columnName: "credentialJson" },
          { tableName: "ShopifyOAuthContinuation", columnName: "payloadJson" }
        ])
        .mockResolvedValueOnce([{ rowId: "row-invalid", value: "{not-json" }])
        .mockResolvedValueOnce([]),
      $executeRawUnsafe: vi.fn(),
      $transaction: vi.fn()
    };
    const { reconcileSecureJson } = await import("../src/services/secureJsonReconciliation.js");

    const receipt = await reconcileSecureJson(database as never, "APPLY");

    expect(receipt.status).toBe("BLOCKED");
    expect(receipt.invalid_json_rows).toBe(1);
    expect(database.$transaction).not.toHaveBeenCalled();
  });
});
