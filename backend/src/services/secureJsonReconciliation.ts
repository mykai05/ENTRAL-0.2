import { createHash, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { env } from "../env.js";
import {
  isEncryptedSecureJson,
  parseSecretEnvelope,
  parseSecureJson,
  secretEnvelopeMetadata,
  stringifySecretEnvelope,
  type SecretEnvelopeContext
} from "./secureJson.js";

export type SecureJsonReconciliationMode = "AUDIT" | "APPLY";

type SecureJsonTarget = {
  readonly tableName: "ShopifyConnection" | "ShopifyOAuthContinuation";
  readonly columnName: "credentialJson" | "payloadJson";
  readonly referenceColumnName: "credentialSecretReferenceId" | "payloadSecretReferenceId";
  readonly provider: "shopify";
  readonly purpose: "shopify-admin-token" | "shopify-oauth-continuation";
};

export const SECURE_JSON_RECONCILIATION_TARGETS = [
  {
    tableName: "ShopifyConnection",
    columnName: "credentialJson",
    referenceColumnName: "credentialSecretReferenceId",
    provider: "shopify",
    purpose: "shopify-admin-token"
  },
  {
    tableName: "ShopifyOAuthContinuation",
    columnName: "payloadJson",
    referenceColumnName: "payloadSecretReferenceId",
    provider: "shopify",
    purpose: "shopify-oauth-continuation"
  }
] as const satisfies readonly SecureJsonTarget[];

const inventoryId = "phase202-credential-reference-inventory-v1";
const sha256Pattern = /^[0-9a-f]{64}$/u;
const referencePattern = /^[^@\s]+@[0-9a-f]{40}:[^\s]+$/u;

type RawDatabase = Pick<PrismaClient, "$queryRawUnsafe" | "$executeRawUnsafe" | "$transaction">;
type RawTransaction = Prisma.TransactionClient;

type CredentialRow = {
  rowId: string;
  tenantId: string;
  organizationId: string;
  businessId: string | null;
  actorId: string;
  status: string;
  legacyValue: string | null;
  referenceId: string | null;
  tenantEnvironment: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
  referenceOrganizationId: string | null;
  referenceTenantId: string | null;
  referenceBusinessId: string | null;
  referenceProvider: string | null;
  referencePurpose: string | null;
  referenceEnvironment: "DEVELOPMENT" | "STAGING" | "PRODUCTION" | null;
  referenceKeyVersion: string | null;
  referenceEncryptedValue: string | null;
  referenceLastFour: string | null;
  referenceVersion: number | null;
  referenceRotatedAt: Date | null;
  referenceRevokedAt: Date | null;
  referenceCreatedByActorId: string | null;
};

type TargetMetrics = {
  target: SecureJsonTarget;
  rows: CredentialRow[];
  plaintextLegacyRows: number;
  invalidLegacyRows: number;
  missingReferenceRows: number;
  invalidReferenceRows: number;
};

export interface SecureJsonReconciliationReceipt {
  readonly contract_version: "1.0.0";
  readonly schema_version: 1;
  readonly inventory_id: typeof inventoryId;
  readonly inventory_hash: string;
  readonly mode: SecureJsonReconciliationMode;
  readonly status: "VERIFIED" | "BLOCKED";
  readonly target_count: 2;
  readonly source_state_hash: string;
  readonly source_rows: number;
  readonly referenced_rows: number;
  readonly legacy_rows: number;
  readonly plaintext_legacy_rows: number;
  readonly invalid_legacy_rows: number;
  readonly missing_reference_rows: number;
  readonly invalid_reference_rows: number;
  readonly row_identity_sha256: string;
  readonly prior_apply_receipt_sha256: string | null;
  readonly repair_plan_reference: string;
  readonly rollback_reference: string;
  readonly blockers: readonly string[];
  readonly completed_at: string;
  readonly receipt_sha256: string;
  readonly targets: readonly {
    readonly table: string;
    readonly legacy_column: string;
    readonly reference_column: string;
    readonly source_rows: number;
    readonly legacy_rows: number;
    readonly missing_reference_rows: number;
    readonly invalid_reference_rows: number;
  }[];
}

export type SecureJsonReconciliationOptions = {
  priorApplyReceiptHash?: string | null;
  repairPlanReference: string;
  rollbackReference: string;
  now?: () => Date;
};

function assertReference(value: string, field: string) {
  if (!referencePattern.test(value)) throw new Error(`${field} must be repository@commit:path evidence.`);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function rowIdentityHash(metrics: readonly TargetMetrics[]) {
  return sha256(metrics
    .flatMap((item) => item.rows.map((row) => `${item.target.tableName}:${sha256(row.rowId)}`))
    .sort()
    .join("\n"));
}

function targetIdentifiers(target: SecureJsonTarget) {
  return {
    table: `"${target.tableName}"`,
    legacy: `"${target.columnName}"`,
    reference: `"${target.referenceColumnName}"`
  };
}

async function verifyInventory(database: Pick<PrismaClient, "$queryRawUnsafe">) {
  const rows = await database.$queryRawUnsafe<Array<{ tableName: string; columnName: string }>>(`
    SELECT columns.table_name AS "tableName",columns.column_name AS "columnName"
    FROM information_schema.columns columns
    WHERE columns.table_schema='public'
      AND (columns.table_name,columns.column_name) IN (
        ('ShopifyConnection','credentialJson'),
        ('ShopifyConnection','credentialSecretReferenceId'),
        ('ShopifyOAuthContinuation','payloadJson'),
        ('ShopifyOAuthContinuation','payloadSecretReferenceId')
      )
    ORDER BY columns.table_name,columns.column_name
  `);
  const actual = new Set(rows.map((row) => `${row.tableName}.${row.columnName}`));
  for (const target of SECURE_JSON_RECONCILIATION_TARGETS) {
    for (const column of [target.columnName, target.referenceColumnName]) {
      if (!actual.has(`${target.tableName}.${column}`)) throw new Error("Credential reconciliation inventory is incomplete.");
    }
  }
  const hashes = await database.$queryRawUnsafe<Array<{ inventoryHash: string }>>(`
    SELECT entral.phase202_credential_inventory_hash() AS "inventoryHash"
  `);
  const inventoryHash = hashes[0]?.inventoryHash;
  if (!inventoryHash || !sha256Pattern.test(inventoryHash)) throw new Error("Credential inventory hash is unavailable.");
  return inventoryHash;
}

async function readTargetRows(database: Pick<PrismaClient, "$queryRawUnsafe">, target: SecureJsonTarget) {
  const { table, legacy, reference } = targetIdentifiers(target);
  return database.$queryRawUnsafe<CredentialRow[]>(`
    SELECT source."id"::text AS "rowId",
           source."tenantId"::text AS "tenantId",
           source."organizationId"::text AS "organizationId",
           source."businessId"::text AS "businessId",
           source."actorId"::text AS "actorId",
           source."status"::text AS "status",
           source.${legacy}::text AS "legacyValue",
           source.${reference}::text AS "referenceId",
           boundary."environment"::text AS "tenantEnvironment",
           secret."organizationId"::text AS "referenceOrganizationId",
           secret."tenantId"::text AS "referenceTenantId",
           secret."businessId"::text AS "referenceBusinessId",
           secret."provider" AS "referenceProvider",
           secret."purpose" AS "referencePurpose",
           secret."environment" AS "referenceEnvironment",
           secret."keyVersion" AS "referenceKeyVersion",
           secret."encryptedValue" AS "referenceEncryptedValue",
           secret."lastFour" AS "referenceLastFour",
           secret."version" AS "referenceVersion",
           secret."rotatedAt" AS "referenceRotatedAt",
           secret."revokedAt" AS "referenceRevokedAt",
           secret."createdByActorId"::text AS "referenceCreatedByActorId"
    FROM ${table} source
    JOIN "TenantBoundary" boundary
      ON boundary."id"=source."tenantId" AND boundary."organizationId"=source."organizationId"
    LEFT JOIN "SecretReference" secret
      ON secret."id"=source.${reference}
    ORDER BY source."id"::text
  `);
}

function legacyPayload(target: SecureJsonTarget, value: string) {
  if (!isEncryptedSecureJson(value)) throw new Error("PLAINTEXT_LEGACY_CREDENTIAL");
  const parsed = parseSecureJson<unknown>(value);
  if (!parsed || typeof parsed !== "object") throw new Error("INVALID_LEGACY_CREDENTIAL");
  if (target.tableName === "ShopifyConnection") {
    const adminToken = (parsed as { adminToken?: unknown }).adminToken;
    if (typeof adminToken !== "string" || !adminToken.trim()) throw new Error("INVALID_LEGACY_CREDENTIAL");
    return { adminToken: adminToken.trim() };
  }
  const payload = parsed as Record<string, unknown>;
  const required = ["connectorApproval", "countryCode", "dryRun", "includeCollections", "includeProducts", "includeStoreShell", "maxProducts", "storeType"];
  if (required.some((field) => !(field in payload))) throw new Error("INVALID_LEGACY_CREDENTIAL");
  return payload;
}

function activeCredentialRequiresLiveReference(target: SecureJsonTarget, status: string) {
  return target.tableName === "ShopifyConnection" ? status === "active" : status === "pending";
}

function referenceIsValid(target: SecureJsonTarget, row: CredentialRow) {
  if (!row.referenceId || !row.referenceEncryptedValue || !row.referenceCreatedByActorId || !row.referenceVersion
    || !row.referenceEnvironment || !row.referenceKeyVersion) return false;
  if (row.referenceTenantId !== row.tenantId || row.referenceOrganizationId !== row.organizationId
    || row.referenceBusinessId !== row.businessId || row.referenceProvider !== target.provider
    || row.referencePurpose !== target.purpose || row.referenceEnvironment !== row.tenantEnvironment) return false;
  if (activeCredentialRequiresLiveReference(target, row.status) === Boolean(row.referenceRevokedAt)) return false;
  const context: SecretEnvelopeContext = {
    secretReferenceId: row.referenceId,
    organizationId: row.organizationId,
    tenantId: row.tenantId,
    businessId: row.businessId,
    actorId: row.referenceCreatedByActorId,
    provider: target.provider,
    purpose: target.purpose,
    environment: row.referenceEnvironment,
    recordVersion: row.referenceVersion
  };
  try {
    const metadata = secretEnvelopeMetadata(row.referenceEncryptedValue);
    if (metadata.keyVersion !== row.referenceKeyVersion || metadata.environment !== row.referenceEnvironment) return false;
    const value = parseSecretEnvelope<unknown>(row.referenceEncryptedValue, context);
    if (target.tableName === "ShopifyConnection") {
      return Boolean(value && typeof value === "object" && typeof (value as { adminToken?: unknown }).adminToken === "string"
        && (value as { adminToken: string }).adminToken.trim());
    }
    return Boolean(value && typeof value === "object" && "storeType" in (value as Record<string, unknown>));
  } catch {
    return false;
  }
}

function metricsFor(target: SecureJsonTarget, rows: CredentialRow[]): TargetMetrics {
  let plaintextLegacyRows = 0;
  let invalidLegacyRows = 0;
  let missingReferenceRows = 0;
  let invalidReferenceRows = 0;
  for (const row of rows) {
    if (row.legacyValue !== null) {
      if (!isEncryptedSecureJson(row.legacyValue)) plaintextLegacyRows += 1;
      try { legacyPayload(target, row.legacyValue); } catch { invalidLegacyRows += 1; }
    }
    if (!row.referenceId) missingReferenceRows += 1;
    else if (!referenceIsValid(target, row)) invalidReferenceRows += 1;
  }
  return { target, rows, plaintextLegacyRows, invalidLegacyRows, missingReferenceRows, invalidReferenceRows };
}

async function applyLegacyRow(transaction: RawTransaction, target: SecureJsonTarget, row: CredentialRow) {
  if (!row.legacyValue || row.referenceId) return;
  const value = legacyPayload(target, row.legacyValue);
  const secretReferenceId = randomUUID();
  const context: SecretEnvelopeContext = {
    secretReferenceId,
    organizationId: row.organizationId,
    tenantId: row.tenantId,
    businessId: row.businessId,
    actorId: row.actorId,
    provider: target.provider,
    purpose: target.purpose,
    environment: row.tenantEnvironment,
    recordVersion: 1
  };
  const encryptedValue = stringifySecretEnvelope(value, context);
  const metadata = secretEnvelopeMetadata(encryptedValue);
  const lastFour = target.tableName === "ShopifyConnection"
    ? (value as { adminToken: string }).adminToken.slice(-4) || null
    : null;
  await transaction.$executeRawUnsafe(`
    INSERT INTO "SecretReference"(
      "id","organizationId","tenantId","businessId","provider","purpose","environment",
      "keyVersion","encryptedValue","lastFour","version","createdByActorId","createdAt","updatedAt"
    ) VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,$9,$10,1,$11::uuid,clock_timestamp(),clock_timestamp())
  `, secretReferenceId, row.organizationId, row.tenantId, row.businessId, target.provider, target.purpose,
  metadata.environment, metadata.keyVersion, encryptedValue, lastFour, row.actorId);
  const { table, legacy, reference } = targetIdentifiers(target);
  const updated = await transaction.$executeRawUnsafe(`
    UPDATE ${table}
    SET ${reference}=$1::uuid,${legacy}=NULL,"updatedAt"=clock_timestamp()
    WHERE "id"::text=$2 AND ${reference} IS NULL AND ${legacy}=$3
  `, secretReferenceId, row.rowId, row.legacyValue);
  if (updated !== 1) throw new Error("Credential reconciliation lost its optimistic row match.");
}

async function liveStateHash(database: Pick<PrismaClient, "$queryRawUnsafe">) {
  const rows = await database.$queryRawUnsafe<Array<{ sourceStateHash: string }>>(`
    SELECT entral.phase202_live_credential_reference_state_hash() AS "sourceStateHash"
  `);
  const value = rows[0]?.sourceStateHash;
  if (!value || !sha256Pattern.test(value)) throw new Error("Credential reference state hash is unavailable.");
  return value;
}

async function persistRun(database: Pick<PrismaClient, "$queryRawUnsafe">, input: {
  mode: SecureJsonReconciliationMode;
  inventoryHash: string;
  sourceStateHash: string;
  sourceRows: number;
  referencedRows: number;
  legacyRows: number;
  missingReferenceRows: number;
  invalidReferenceRows: number;
  rowIdentityHash: string;
  priorApplyReceiptHash: string | null;
  repairPlanReference: string;
  rollbackReference: string;
  completedAt: Date;
}) {
  const rows = await database.$queryRawUnsafe<Array<{ receiptHash: string }>>(`
    INSERT INTO "CredentialReferenceReconciliationRun"(
      "mode","inventoryId","inventoryHash","targetCount","sourceStateHash","sourceRows","referencedRows",
      "legacyRows","missingReferenceRows","invalidReferenceRows","rowIdentityHash","priorApplyReceiptHash",
      "repairPlanReference","rollbackReference","receiptHash","completedAt"
    ) VALUES ($1,$2,$3,2,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
      entral.phase202_credential_reconciliation_hash(
        $1,$2,$3,2,$4,$5::integer,$6::integer,$7::integer,$8::integer,$9::integer,
        $10,$11::text,$12,$13,$14::timestamptz
      ),$14::timestamptz)
    RETURNING "receiptHash"
  `, input.mode, inventoryId, input.inventoryHash, input.sourceStateHash, input.sourceRows, input.referencedRows,
  input.legacyRows, input.missingReferenceRows, input.invalidReferenceRows, input.rowIdentityHash,
  input.priorApplyReceiptHash, input.repairPlanReference, input.rollbackReference, input.completedAt);
  const receiptHash = rows[0]?.receiptHash;
  if (!receiptHash || !sha256Pattern.test(receiptHash)) throw new Error("Credential reconciliation receipt hash is unavailable.");
  return receiptHash;
}

export async function reconcileSecureJson(
  database: RawDatabase,
  mode: SecureJsonReconciliationMode,
  options: SecureJsonReconciliationOptions
): Promise<SecureJsonReconciliationReceipt> {
  assertReference(options.repairPlanReference, "repairPlanReference");
  assertReference(options.rollbackReference, "rollbackReference");
  const priorApplyReceiptHash = options.priorApplyReceiptHash?.trim() || null;
  if (mode === "APPLY" && priorApplyReceiptHash !== null) throw new Error("APPLY must not bind a prior APPLY receipt.");
  if (mode === "AUDIT" && (!priorApplyReceiptHash || !sha256Pattern.test(priorApplyReceiptHash))) {
    throw new Error("AUDIT requires ENTRAL_SECURE_JSON_PRIOR_APPLY_RECEIPT_SHA256 from a separate APPLY invocation.");
  }
  const inventoryHash = await verifyInventory(database);
  let initial = await Promise.all(SECURE_JSON_RECONCILIATION_TARGETS.map(async (target) =>
    metricsFor(target, await readTargetRows(database, target))));
  const initialInvalidLegacy = initial.reduce((total, item) => total + item.invalidLegacyRows, 0);
  const initialPlaintextLegacy = initial.reduce((total, item) => total + item.plaintextLegacyRows, 0);
  if (mode === "APPLY" && (initialInvalidLegacy > 0 || initialPlaintextLegacy > 0)) {
    throw new Error("Credential reconciliation will not migrate plaintext or invalid legacy rows.");
  }
  if (mode === "APPLY") {
    await database.$transaction(async (transaction) => {
      for (const item of initial) for (const row of item.rows) await applyLegacyRow(transaction, item.target, row);
    }, { isolationLevel: "Serializable" });
    initial = await Promise.all(SECURE_JSON_RECONCILIATION_TARGETS.map(async (target) =>
      metricsFor(target, await readTargetRows(database, target))));
  }
  const sourceRows = initial.reduce((total, item) => total + item.rows.length, 0);
  const referencedRows = initial.reduce((total, item) => total + item.rows.filter((row) => row.referenceId !== null).length, 0);
  const legacyRows = initial.reduce((total, item) => total + item.rows.filter((row) => row.legacyValue !== null).length, 0);
  const plaintextLegacyRows = initial.reduce((total, item) => total + item.plaintextLegacyRows, 0);
  const invalidLegacyRows = initial.reduce((total, item) => total + item.invalidLegacyRows, 0);
  const missingReferenceRows = initial.reduce((total, item) => total + item.missingReferenceRows, 0);
  const invalidReferenceRows = initial.reduce((total, item) => total + item.invalidReferenceRows, 0);
  const blockers = [
    ...(legacyRows > 0 ? [`${legacyRows} legacy credential row(s) remain.`] : []),
    ...(plaintextLegacyRows > 0 ? [`${plaintextLegacyRows} plaintext legacy credential row(s) remain.`] : []),
    ...(invalidLegacyRows > 0 ? [`${invalidLegacyRows} invalid legacy credential row(s) remain.`] : []),
    ...(missingReferenceRows > 0 ? [`${missingReferenceRows} credential reference(s) are missing.`] : []),
    ...(invalidReferenceRows > 0 ? [`${invalidReferenceRows} credential reference(s) are invalid.`] : [])
  ];
  const sourceStateHash = await liveStateHash(database);
  const completedAt = (options.now ?? (() => new Date()))();
  const identitiesHash = rowIdentityHash(initial);
  const receiptHash = await persistRun(database, {
    mode,
    inventoryHash,
    sourceStateHash,
    sourceRows,
    referencedRows,
    legacyRows,
    missingReferenceRows,
    invalidReferenceRows,
    rowIdentityHash: identitiesHash,
    priorApplyReceiptHash,
    repairPlanReference: options.repairPlanReference,
    rollbackReference: options.rollbackReference,
    completedAt
  });
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    inventory_id: inventoryId,
    inventory_hash: inventoryHash,
    mode,
    status: blockers.length === 0 ? "VERIFIED" : "BLOCKED",
    target_count: 2,
    source_state_hash: sourceStateHash,
    source_rows: sourceRows,
    referenced_rows: referencedRows,
    legacy_rows: legacyRows,
    plaintext_legacy_rows: plaintextLegacyRows,
    invalid_legacy_rows: invalidLegacyRows,
    missing_reference_rows: missingReferenceRows,
    invalid_reference_rows: invalidReferenceRows,
    row_identity_sha256: identitiesHash,
    prior_apply_receipt_sha256: priorApplyReceiptHash,
    repair_plan_reference: options.repairPlanReference,
    rollback_reference: options.rollbackReference,
    blockers,
    completed_at: completedAt.toISOString(),
    receipt_sha256: receiptHash,
    targets: initial.map((item) => ({
      table: item.target.tableName,
      legacy_column: item.target.columnName,
      reference_column: item.target.referenceColumnName,
      source_rows: item.rows.length,
      legacy_rows: item.rows.filter((row) => row.legacyValue !== null).length,
      missing_reference_rows: item.missingReferenceRows,
      invalid_reference_rows: item.invalidReferenceRows
    }))
  };
}

export function reconciliationEnvironment() {
  return env.SECRET_BROKER_ENVIRONMENT;
}
