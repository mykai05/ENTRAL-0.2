import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";

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
  process.env.APP_PUBLIC_URL = "https://phase202-baseline.example.test";
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
  it("binds every Prisma JSON string column and exactly the credential-bearing protected subset", async () => {
    const [schema, inventory, reconciliation] = await Promise.all([
      readFile(new URL("../../prisma/schema.prisma", import.meta.url), "utf8"),
      readFile(new URL("../../docs/evidence/phase199/SECURE_JSON_COLUMN_INVENTORY.json", import.meta.url), "utf8").then((value) => JSON.parse(value) as {
        columns: Array<{ table: string; column: string; credential_bearing: boolean; reconciliation_protected: boolean }>;
        credential_bearing_subset: Array<{ table: string; column: string }>;
        proof: { prisma_json_string_columns: number; inventory_rows: number };
      }),
      import("../src/services/secureJsonReconciliation.js")
    ]);
    const schemaColumns: string[] = [];
    let model = "";
    for (const line of schema.split(/\r?\n/)) {
      const modelMatch = /^model\s+(\w+)/.exec(line);
      if (modelMatch) model = modelMatch[1]!;
      const columnMatch = /^\s+(\w*Json)\s+(?:String|Json)\??/.exec(line);
      if (model && columnMatch) schemaColumns.push(`${model}.${columnMatch[1]}`);
      if (/^}/.test(line)) model = "";
    }
    const inventoryColumns = inventory.columns.map((item) => `${item.table}.${item.column}`);
    const credentialColumns = inventory.columns.filter((item) => item.credential_bearing).map((item) => `${item.table}.${item.column}`);
    const protectedColumns = inventory.columns.filter((item) => item.reconciliation_protected).map((item) => `${item.table}.${item.column}`);
    const declaredCredentialSubset = inventory.credential_bearing_subset.map((item) => `${item.table}.${item.column}`);
    const runtimeTargets = reconciliation.SECURE_JSON_RECONCILIATION_TARGETS.map((item) => `${item.tableName}.${item.columnName}`);

    expect(inventoryColumns).toHaveLength(new Set(inventoryColumns).size);
    expect(inventoryColumns.sort()).toEqual(schemaColumns.sort());
    expect(inventory.proof.prisma_json_string_columns).toBe(schemaColumns.length);
    expect(inventory.proof.inventory_rows).toBe(inventoryColumns.length);
    expect(credentialColumns).toEqual([
      "ShopifyConnection.credentialJson",
      "ShopifyOAuthContinuation.payloadJson"
    ]);
    expect(protectedColumns).toEqual(credentialColumns);
    expect(declaredCredentialSubset).toEqual(credentialColumns);
    expect(runtimeTargets).toEqual(credentialColumns);
  });

  it("rejects production startup without an encryption key", async () => {
    productionApiEnvironment();
    delete process.env.DATA_ENCRYPTION_KEY;
    process.env.ADMIN_MFA_CODE = "123456";

    await expect(import("../src/env.js")).rejects.toThrow(
      "Production requires DATA_ENCRYPTION_KEY; plaintext secure JSON is forbidden."
    );
  });

  it("preserves the historical static step-up gate until Phase 202 replaces it with durable authority", async () => {
    productionApiEnvironment();
    process.env.DATA_ENCRYPTION_KEY = "phase199-production-encryption-key";
    delete process.env.ADMIN_MFA_CODE;
    const state = JSON.parse(await readFile(new URL("../../.entral/governor/PROGRAM_STATE.json", import.meta.url), "utf8")) as { current_phase: number };

    if (state.current_phase < 202) {
      await expect(import("../src/env.js")).rejects.toThrow(
        "Production API requires ADMIN_MFA_CODE for administrative step-up."
      );
    } else {
      const phase202Environment = await import("../src/env.js");
      expect(phase202Environment.isProduction).toBe(true);
      expect("ADMIN_MFA_CODE" in phase202Environment.env).toBe(false);
    }
  });

  it("requires a retained APPLY hash before a fresh credential-reference AUDIT", async () => {
    const database = {
      $queryRawUnsafe: vi.fn(),
      $executeRawUnsafe: vi.fn(),
      $transaction: vi.fn()
    };
    const { reconcileSecureJson } = await import("../src/services/secureJsonReconciliation.js");

    await expect(reconcileSecureJson(database as never, "AUDIT", {
      repairPlanReference: `mykai05/ENTRAL-0.2@${"d".repeat(40)}:docs/evidence/phase202/credential-apply.json`,
      rollbackReference: `mykai05/ENTRAL-0.2@${"e".repeat(40)}:.entral/governor/releases/phase-200.json`
    })).rejects.toThrow(/requires ENTRAL_SECURE_JSON_PRIOR_APPLY_RECEIPT_SHA256/u);
    expect(database.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it("refuses to migrate plaintext legacy credential rows", async () => {
    const database = credentialReconciliationDatabase(JSON.stringify({ adminToken: "must-not-escape" }));
    const { reconcileSecureJson } = await import("../src/services/secureJsonReconciliation.js");

    await expect(reconcileSecureJson(database as never, "APPLY", {
      repairPlanReference: `mykai05/ENTRAL-0.2@${"d".repeat(40)}:docs/evidence/phase202/credential-apply.json`,
      rollbackReference: `mykai05/ENTRAL-0.2@${"e".repeat(40)}:.entral/governor/releases/phase-200.json`
    })).rejects.toThrow("Credential reconciliation will not migrate plaintext or invalid legacy rows.");
    expect(database.$transaction).not.toHaveBeenCalled();
    expect(JSON.stringify(database.$queryRawUnsafe.mock.calls)).not.toContain("must-not-escape");
  });

  it("blocks mutation when encrypted legacy JSON is structurally invalid", async () => {
    const { stringifySecureJson } = await import("../src/services/secureJson.js");
    const database = credentialReconciliationDatabase(stringifySecureJson({ unexpected: true }));
    const { reconcileSecureJson } = await import("../src/services/secureJsonReconciliation.js");

    await expect(reconcileSecureJson(database as never, "APPLY", {
      repairPlanReference: `mykai05/ENTRAL-0.2@${"d".repeat(40)}:docs/evidence/phase202/credential-apply.json`,
      rollbackReference: `mykai05/ENTRAL-0.2@${"e".repeat(40)}:.entral/governor/releases/phase-200.json`
    })).rejects.toThrow("Credential reconciliation will not migrate plaintext or invalid legacy rows.");
    expect(database.$transaction).not.toHaveBeenCalled();
  });
});

function credentialReconciliationDatabase(legacyValue: string) {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes("information_schema.columns")) {
      return [
        { tableName: "ShopifyConnection", columnName: "credentialJson" },
        { tableName: "ShopifyConnection", columnName: "credentialSecretReferenceId" },
        { tableName: "ShopifyOAuthContinuation", columnName: "payloadJson" },
        { tableName: "ShopifyOAuthContinuation", columnName: "payloadSecretReferenceId" }
      ];
    }
    if (sql.includes("phase202_credential_inventory_hash")) return [{ inventoryHash: "a".repeat(64) }];
    if (sql.includes('FROM "ShopifyConnection" source')) {
      return [{
        rowId: "customer-record-42",
        tenantId: "11111111-1111-4111-8111-111111111111",
        organizationId: "22222222-2222-4222-8222-222222222222",
        businessId: null,
        actorId: "33333333-3333-4333-8333-333333333333",
        status: "active",
        legacyValue,
        referenceId: null,
        tenantEnvironment: "PRODUCTION",
        referenceOrganizationId: null,
        referenceTenantId: null,
        referenceBusinessId: null,
        referenceProvider: null,
        referencePurpose: null,
        referenceEnvironment: null,
        referenceKeyVersion: null,
        referenceEncryptedValue: null,
        referenceLastFour: null,
        referenceVersion: null,
        referenceRotatedAt: null,
        referenceRevokedAt: null,
        referenceCreatedByActorId: null
      }];
    }
    if (sql.includes('FROM "ShopifyOAuthContinuation" source')) return [];
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  return {
    $queryRawUnsafe: query,
    $executeRawUnsafe: vi.fn(),
    $transaction: vi.fn()
  };
}
