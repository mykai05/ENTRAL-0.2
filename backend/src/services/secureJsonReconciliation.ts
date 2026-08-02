import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  isEncryptedSecureJson,
  stringifySecureJson
} from "./secureJson.js";

export type SecureJsonReconciliationMode = "AUDIT" | "APPLY";

type SecureJsonTarget = {
  readonly tableName: string;
  readonly columnName: string;
};

export const SECURE_JSON_RECONCILIATION_TARGETS = [
  { tableName: "ShopifyConnection", columnName: "credentialJson" },
  { tableName: "ShopifyOAuthContinuation", columnName: "payloadJson" }
] as const satisfies readonly SecureJsonTarget[];

type SecureJsonRow = {
  readonly rowId: string;
  readonly value: string;
};

type RawDatabase = Pick<PrismaClient, "$queryRawUnsafe" | "$executeRawUnsafe" | "$transaction">;

export interface SecureJsonReconciliationReceipt {
  readonly contract_version: "1.0.0";
  readonly schema_version: 1;
  readonly mode: SecureJsonReconciliationMode;
  readonly status: "VERIFIED" | "REQUIRES_REENCRYPTION" | "BLOCKED";
  readonly target_count: number;
  readonly rows_scanned: number;
  readonly encrypted_rows: number;
  readonly plaintext_rows_found: number;
  readonly plaintext_rows_reencrypted: number;
  readonly invalid_json_rows: number;
  readonly targets: readonly {
    readonly table: string;
    readonly column: string;
    readonly rows_scanned: number;
    readonly encrypted_rows: number;
    readonly plaintext_rows_found: number;
    readonly plaintext_row_id_sha256: readonly string[];
    readonly invalid_json_rows: number;
  }[];
  readonly blockers: readonly string[];
  readonly generated_at: string;
  readonly receipt_sha256: string;
}

const identifierPattern = /^[A-Za-z][A-Za-z0-9_]*$/;
const pageSize = 250;

function quotedIdentifier(value: string) {
  if (!identifierPattern.test(value)) {
    throw new Error("Secure JSON reconciliation discovered an unsafe database identifier.");
  }
  return `"${value}"`;
}

function rowIdSha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function classifySecureJsonValue(value: string): "ENCRYPTED" | "PLAINTEXT" | "INVALID_JSON" {
  if (isEncryptedSecureJson(value)) return "ENCRYPTED";
  try {
    JSON.parse(value);
    return "PLAINTEXT";
  } catch {
    return "INVALID_JSON";
  }
}

async function discoverTargets(database: Pick<PrismaClient, "$queryRawUnsafe">) {
  const targetPairs = SECURE_JSON_RECONCILIATION_TARGETS
    .map((target) => {
      quotedIdentifier(target.tableName);
      quotedIdentifier(target.columnName);
      return `('${target.tableName}', '${target.columnName}')`;
    })
    .join(",\n        ");
  const rows = await database.$queryRawUnsafe<Array<{ tableName: string; columnName: string }>>(`
    SELECT columns.table_name AS "tableName", columns.column_name AS "columnName"
    FROM information_schema.columns AS columns
    WHERE columns.table_schema = 'public'
      AND (columns.table_name, columns.column_name) IN (
        ${targetPairs}
      )
    ORDER BY columns.table_name, columns.ordinal_position
  `);

  const targets = rows.map((row): SecureJsonTarget => {
    if (!identifierPattern.test(row.tableName) || !identifierPattern.test(row.columnName)) {
      throw new Error("Secure JSON reconciliation target inventory contains an unsafe identifier.");
    }
    return { tableName: row.tableName, columnName: row.columnName };
  });
  const actual = new Set(targets.map((target) => `${target.tableName}.${target.columnName}`));
  const missing = SECURE_JSON_RECONCILIATION_TARGETS.filter(
    (target) => !actual.has(`${target.tableName}.${target.columnName}`)
  );
  if (missing.length > 0) {
    throw new Error("Secure JSON reconciliation could not verify its complete credential target inventory.");
  }
  return targets;
}

async function readTargetRows(
  database: Pick<PrismaClient, "$queryRawUnsafe">,
  target: SecureJsonTarget
) {
  const table = quotedIdentifier(target.tableName);
  const column = quotedIdentifier(target.columnName);
  const rows: SecureJsonRow[] = [];
  let cursor = "";

  while (true) {
    const page = await database.$queryRawUnsafe<SecureJsonRow[]>(`
      SELECT "id"::text AS "rowId", ${column}::text AS "value"
      FROM "public".${table}
      WHERE ${column} IS NOT NULL
        AND "id"::text > $1
      ORDER BY "id"::text
      LIMIT ${pageSize}
    `, cursor);
    rows.push(...page);
    if (page.length < pageSize) break;
    cursor = page[page.length - 1]!.rowId;
  }

  return rows;
}

function receiptDigest(value: Omit<SecureJsonReconciliationReceipt, "receipt_sha256">) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function reconcileSecureJson(
  database: RawDatabase,
  mode: SecureJsonReconciliationMode,
  now = () => new Date()
): Promise<SecureJsonReconciliationReceipt> {
  const targets = await discoverTargets(database);
  const inventory: Array<{
    target: SecureJsonTarget;
    rows: SecureJsonRow[];
    encrypted: SecureJsonRow[];
    plaintext: SecureJsonRow[];
    invalid: SecureJsonRow[];
  }> = [];

  for (const target of targets) {
    const rows = await readTargetRows(database, target);
    const encrypted: SecureJsonRow[] = [];
    const plaintext: SecureJsonRow[] = [];
    const invalid: SecureJsonRow[] = [];
    for (const row of rows) {
      const classification = classifySecureJsonValue(row.value);
      if (classification === "ENCRYPTED") encrypted.push(row);
      else if (classification === "PLAINTEXT") plaintext.push(row);
      else invalid.push(row);
    }
    inventory.push({ target, rows, encrypted, plaintext, invalid });
  }

  const invalidJsonRows = inventory.reduce((total, item) => total + item.invalid.length, 0);
  const plaintextRowsFound = inventory.reduce((total, item) => total + item.plaintext.length, 0);
  const blockers = invalidJsonRows > 0
    ? [`${invalidJsonRows} secure JSON database row(s) contain invalid JSON and require operator review before reconciliation.`]
    : [];
  let plaintextRowsReencrypted = 0;

  if (mode === "APPLY" && blockers.length === 0 && plaintextRowsFound > 0) {
    await database.$transaction(async (transaction) => {
      for (const item of inventory) {
        const table = quotedIdentifier(item.target.tableName);
        const column = quotedIdentifier(item.target.columnName);
        for (const row of item.plaintext) {
          const encrypted = stringifySecureJson(JSON.parse(row.value) as unknown);
          const updated = await transaction.$executeRawUnsafe(`
            UPDATE "public".${table}
            SET ${column} = $1
            WHERE "id"::text = $2
              AND ${column} = $3
          `, encrypted, row.rowId, row.value);
          if (updated !== 1) {
            throw new Error(`Secure JSON reconciliation lost its optimistic row match for ${item.target.tableName}.${item.target.columnName}.`);
          }
          plaintextRowsReencrypted += 1;
        }
      }
    });
  }

  const status = blockers.length > 0
    ? "BLOCKED" as const
    : mode === "AUDIT" && plaintextRowsFound > 0
      ? "REQUIRES_REENCRYPTION" as const
      : "VERIFIED" as const;
  const receiptWithoutDigest: Omit<SecureJsonReconciliationReceipt, "receipt_sha256"> = {
    contract_version: "1.0.0",
    schema_version: 1,
    mode,
    status,
    target_count: targets.length,
    rows_scanned: inventory.reduce((total, item) => total + item.rows.length, 0),
    encrypted_rows: inventory.reduce((total, item) => total + item.encrypted.length, 0),
    plaintext_rows_found: plaintextRowsFound,
    plaintext_rows_reencrypted: plaintextRowsReencrypted,
    invalid_json_rows: invalidJsonRows,
    targets: inventory.map((item) => ({
      table: item.target.tableName,
      column: item.target.columnName,
      rows_scanned: item.rows.length,
      encrypted_rows: item.encrypted.length,
      plaintext_rows_found: item.plaintext.length,
      plaintext_row_id_sha256: item.plaintext.map((row) => rowIdSha256(row.rowId)),
      invalid_json_rows: item.invalid.length
    })),
    blockers,
    generated_at: now().toISOString()
  };

  return {
    ...receiptWithoutDigest,
    receipt_sha256: receiptDigest(receiptWithoutDigest)
  };
}
