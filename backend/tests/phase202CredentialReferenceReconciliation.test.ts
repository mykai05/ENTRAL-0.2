import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NODE_ENV ??= "test";
  process.env.DATABASE_URL ??= "file:./phase202-credential-reconciliation.db";
  process.env.JWT_SECRET ??= "phase202-credential-reconciliation-test-secret";
});

import {
  reconcileSecureJson,
  SECURE_JSON_RECONCILIATION_TARGETS
} from "../src/services/secureJsonReconciliation.js";

const hash = "a".repeat(64);
const applyHash = "b".repeat(64);
const receiptHash = "c".repeat(64);
const repairPlanReference = `mykai05/ENTRAL-0.2@${"d".repeat(40)}:docs/evidence/phase202/credential-apply.json`;
const rollbackReference = `mykai05/ENTRAL-0.2@${"e".repeat(40)}:.entral/governor/releases/phase-200.json`;

function emptyDatabase() {
  const database = {
    $queryRawUnsafe: vi.fn(async (sql: string) => {
      if (sql.includes("information_schema.columns")) {
        return [
          { tableName: "ShopifyConnection", columnName: "credentialJson" },
          { tableName: "ShopifyConnection", columnName: "credentialSecretReferenceId" },
          { tableName: "ShopifyOAuthContinuation", columnName: "payloadJson" },
          { tableName: "ShopifyOAuthContinuation", columnName: "payloadSecretReferenceId" }
        ];
      }
      if (sql.includes("phase202_credential_inventory_hash")) return [{ inventoryHash: hash }];
      if (sql.includes("FROM \"ShopifyConnection\" source")) return [];
      if (sql.includes("FROM \"ShopifyOAuthContinuation\" source")) return [];
      if (sql.includes("phase202_live_credential_reference_state_hash")) return [{ sourceStateHash: hash }];
      if (sql.includes("INSERT INTO \"CredentialReferenceReconciliationRun\"")) return [{ receiptHash }];
      throw new Error(`Unexpected SQL: ${sql}`);
    }),
    $executeRawUnsafe: vi.fn(),
    $transaction: vi.fn(async (operation: (transaction: unknown) => Promise<unknown>) => operation(database))
  };
  return database;
}

describe("Phase 202 credential-reference reconciliation", () => {
  it("keeps exactly the two source-backed credential targets", () => {
    expect(SECURE_JSON_RECONCILIATION_TARGETS).toEqual([
      expect.objectContaining({
        tableName: "ShopifyConnection",
        columnName: "credentialJson",
        referenceColumnName: "credentialSecretReferenceId",
        provider: "shopify",
        purpose: "shopify-admin-token"
      }),
      expect.objectContaining({
        tableName: "ShopifyOAuthContinuation",
        columnName: "payloadJson",
        referenceColumnName: "payloadSecretReferenceId",
        provider: "shopify",
        purpose: "shopify-oauth-continuation"
      })
    ]);
  });

  it("requires a retained APPLY hash for a separately invoked fresh AUDIT", async () => {
    const database = emptyDatabase();
    await expect(reconcileSecureJson(database as never, "AUDIT", {
      repairPlanReference,
      rollbackReference
    })).rejects.toThrow(/requires ENTRAL_SECURE_JSON_PRIOR_APPLY_RECEIPT_SHA256/u);
    expect(database.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it("retains both hashes and verifies zero legacy, missing, and invalid rows", async () => {
    const database = emptyDatabase();
    const receipt = await reconcileSecureJson(database as never, "AUDIT", {
      priorApplyReceiptHash: applyHash,
      repairPlanReference,
      rollbackReference,
      now: () => new Date("2026-08-02T15:00:00.000Z")
    });
    expect(receipt).toMatchObject({
      mode: "AUDIT",
      status: "VERIFIED",
      target_count: 2,
      source_rows: 0,
      referenced_rows: 0,
      legacy_rows: 0,
      plaintext_legacy_rows: 0,
      invalid_legacy_rows: 0,
      missing_reference_rows: 0,
      invalid_reference_rows: 0,
      prior_apply_receipt_sha256: applyHash,
      receipt_sha256: receiptHash
    });
    expect(database.$transaction).not.toHaveBeenCalled();
    const insertCall = database.$queryRawUnsafe.mock.calls.find(([sql]) => String(sql).includes("CredentialReferenceReconciliationRun"));
    expect(insertCall).toBeDefined();
    expect(insertCall).toContain(applyHash);
  });

  it("keeps APPLY and AUDIT as distinct invocations", async () => {
    const database = emptyDatabase();
    const receipt = await reconcileSecureJson(database as never, "APPLY", {
      repairPlanReference,
      rollbackReference
    });
    expect(receipt).toMatchObject({ mode: "APPLY", status: "VERIFIED", prior_apply_receipt_sha256: null });
    expect(database.$transaction).toHaveBeenCalledTimes(1);
  });
});
