import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const PHASE202_MODEL_SCOPE_LEDGER = Object.freeze(JSON.parse(readFileSync(
  new URL("../docs/PHASE_202_MODEL_SCOPE_LEDGER.json", import.meta.url),
  "utf8"
)));
export const PHASE202_SOURCE_TABLES = Object.freeze(PHASE202_MODEL_SCOPE_LEDGER.entries
  .filter((entry) => entry.ownership_projection !== "NOT_APPLICABLE")
  .map((entry) => entry.model));

const REPOSITORY_REFERENCE_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[a-f0-9]{40}:.+$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const INT32_MAX = 2_147_483_647;

const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;

function sourceExpressions(table) {
  return {
    record:
      table === "TeamMember"
        ? `source."userId"||':'||source."teamId"`
        : `source."id"::text`,
    organization:
      table === "MemberTutorialProgress" || table === "MemberTutorialMutationReceipt"
        ? `(SELECT team."organizationId" FROM "Team" team WHERE team."id"=source."organizationId")`
        : `source."organizationId"`,
    business:
      [
        "TeamMember",
        "MemberWorkspaceSnapshot",
        "MemberTutorialProgress",
        "MemberTutorialMutationReceipt"
      ].includes(table)
        ? `NULL::uuid`
        : `source."businessId"`,
    creator: table === "Task" ? `source."createdByActorId"` : `source."createdBy"`
  };
}

function applicableSourcePredicate(table, alias = "source") {
  return table === "AuditLog"
    ? `${alias}."scopeKind" IN ('TENANT','UNRESOLVED')`
    : "TRUE";
}

export function buildSourceMetricsSql(sourceTables = PHASE202_SOURCE_TABLES) {
  if (!Array.isArray(sourceTables) || sourceTables.length === 0) {
    throw new Error("At least one source table is required.");
  }
  if (new Set(sourceTables).size !== sourceTables.length) {
    throw new Error("Source table inventory contains duplicates.");
  }

  return sourceTables
    .map((table) => {
      if (!PHASE202_SOURCE_TABLES.includes(table)) {
        throw new Error(`Unsupported source table: ${table}`);
      }
      const identifier = quoteIdentifier(table);
      const expressions = sourceExpressions(table);
      const applicable = applicableSourcePredicate(table);
      const complete = [
        ...(table === "AuditLog" ? [`source."scopeKind"='TENANT'`] : []),
        `${expressions.organization} IS NOT NULL`,
        `source."tenantId" IS NOT NULL`,
        `source."actorId" IS NOT NULL`,
        `${expressions.creator} IS NOT NULL`,
        `source."ownedBy" IS NOT NULL`
      ].join(" AND ");
      const missing = table === "AuditLog"
        ? `source."scopeKind"='TENANT' AND (NOT (${complete}) OR sidecar."sidecarRows"=0)`
        : `NOT (${complete}) OR sidecar."sidecarRows"=0`;
      const ambiguous = table === "AuditLog"
        ? `source."scopeKind"='UNRESOLVED' OR (source."scopeKind"='TENANT' AND ${complete} AND sidecar."sidecarRows">0 AND NOT (sidecar."sidecarRows"=1 AND sidecar."exactRows"=1))`
        : `${complete} AND sidecar."sidecarRows">0 AND NOT (sidecar."sidecarRows"=1 AND sidecar."exactRows"=1)`;
      const exact = [
        `ownership."organizationId" IS NOT DISTINCT FROM ${expressions.organization}`,
        `ownership."tenantId" IS NOT DISTINCT FROM source."tenantId"`,
        `ownership."businessId" IS NOT DISTINCT FROM ${expressions.business}`,
        `ownership."actorId" IS NOT DISTINCT FROM source."actorId"`,
        `ownership."createdBy" IS NOT DISTINCT FROM ${expressions.creator}`,
        `ownership."ownedBy" IS NOT DISTINCT FROM source."ownedBy"`
      ].join(" AND ");

      return `
SELECT
  '${table}'::text AS "sourceTable",
  count(*)::bigint AS "sourceRows",
  count(*) FILTER (WHERE ${complete} AND sidecar."sidecarRows"=1 AND sidecar."exactRows"=1)::bigint AS "mappedRows",
  count(*) FILTER (WHERE ${missing})::bigint AS "missingRows",
  count(*) FILTER (WHERE ${ambiguous})::bigint AS "ambiguousRows",
  coalesce((
    SELECT sum(duplicate_group.row_count-1)::bigint
    FROM (
      SELECT count(*)::bigint AS row_count
      FROM ${identifier} duplicate_source
      GROUP BY ${
        table === "TeamMember"
          ? `duplicate_source."userId"||':'||duplicate_source."teamId"`
          : `duplicate_source."id"::text`
      }
      HAVING count(*)>1
    ) duplicate_group
  ),0)::bigint AS "duplicateSourceRows"
FROM ${identifier} source
LEFT JOIN LATERAL (
  SELECT count(*)::bigint AS "sidecarRows", count(*) FILTER (WHERE ${exact})::bigint AS "exactRows"
  FROM "CustomerRecordOwnership" ownership
  WHERE ownership."sourceTable"='${table}' AND ownership."sourceRecordId"=${expressions.record}
) sidecar ON true
WHERE ${applicable}`.trim();
    })
    .join("\nUNION ALL\n");
}

export function buildSidecarMetricsSql(sourceTables = PHASE202_SOURCE_TABLES) {
  const knownTables = sourceTables.map((table) => `'${table}'`).join(",");
  const reverseQueries = sourceTables.map((table) => {
    const identifier = quoteIdentifier(table);
    const record =
      table === "TeamMember"
        ? `source."userId"||':'||source."teamId"`
        : `source."id"::text`;
    const applicable = applicableSourcePredicate(table);
    return `SELECT '${table}'::text AS "sourceTable", count(*)::bigint AS "reverseOrphanRows"
      FROM "CustomerRecordOwnership" ownership
      WHERE ownership."sourceTable"='${table}'
        AND NOT EXISTS (SELECT 1 FROM ${identifier} source WHERE ${record}=ownership."sourceRecordId" AND ${applicable})`;
  });

  return `
WITH reverse_orphans AS (
  ${reverseQueries.join("\n  UNION ALL\n  ")}
), sidecar_duplicates AS (
  SELECT coalesce(sum(duplicate_group.row_count-1),0)::bigint AS duplicate_rows
  FROM (
    SELECT count(*)::bigint AS row_count
    FROM "CustomerRecordOwnership"
    GROUP BY "sourceTable","sourceRecordId"
    HAVING count(*)>1
  ) duplicate_group
), unknown_sources AS (
  SELECT count(*)::bigint AS unknown_rows
  FROM "CustomerRecordOwnership"
  WHERE NOT ("sourceTable"=ANY(ARRAY[${knownTables}]::text[]))
), canonical_boundaries AS (
  SELECT count(*)::bigint AS invalid_rows
  FROM entral.businesses business
  LEFT JOIN "BusinessBoundary" boundary ON boundary."canonicalBusinessId"=business.id
  LEFT JOIN "TenantBoundary" tenant
    ON tenant."id"=boundary."tenantId" AND tenant."organizationId"=boundary."organizationId"
  WHERE boundary."id" IS NULL OR boundary."status"<>'ACTIVE'
    OR boundary."stableCode"<>business.stable_code
    OR tenant."id" IS NULL OR tenant."status"<>'ACTIVE'
    OR boundary."environment"<>tenant."environment"
    OR boundary."dataResidency"<>tenant."dataResidency"
)
SELECT
  coalesce((SELECT sum("reverseOrphanRows") FROM reverse_orphans),0)::bigint AS "reverseOrphanRows",
  (SELECT duplicate_rows FROM sidecar_duplicates)::bigint AS "duplicateSidecarRows",
  (SELECT unknown_rows FROM unknown_sources)::bigint AS "unknownSourceRows",
  (SELECT invalid_rows FROM canonical_boundaries)::bigint AS "invalidCanonicalBoundaryRows",
  coalesce((SELECT jsonb_object_agg("sourceTable","reverseOrphanRows" ORDER BY "sourceTable") FROM reverse_orphans),'{}'::jsonb) AS "reverseOrphansByTable"`.trim();
}

function toCount(value, field) {
  const numeric = typeof value === "bigint" ? value : BigInt(value);
  if (numeric < 0n || numeric > BigInt(INT32_MAX)) {
    throw new Error(`${field} must fit a non-negative PostgreSQL integer.`);
  }
  return Number(numeric);
}

export function aggregateReconciliationCounts(sourceMetrics, sidecarMetrics) {
  if (!Array.isArray(sourceMetrics) || sourceMetrics.length !== PHASE202_SOURCE_TABLES.length) {
    throw new Error("Source metrics do not cover the complete Phase 202 inventory.");
  }
  const actualTables = new Set(sourceMetrics.map((entry) => entry.sourceTable));
  if (
    actualTables.size !== PHASE202_SOURCE_TABLES.length ||
    PHASE202_SOURCE_TABLES.some((table) => !actualTables.has(table))
  ) {
    throw new Error("Source metrics contain a missing, duplicate, or unknown table.");
  }

  let sourceRows = 0;
  let mappedRows = 0;
  let missingRows = 0;
  let ambiguousSourceRows = 0;
  let duplicateSourceRows = 0;
  for (const entry of sourceMetrics) {
    const source = toCount(entry.sourceRows, `${entry.sourceTable}.sourceRows`);
    const mapped = toCount(entry.mappedRows, `${entry.sourceTable}.mappedRows`);
    const missing = toCount(entry.missingRows, `${entry.sourceTable}.missingRows`);
    const ambiguous = toCount(entry.ambiguousRows, `${entry.sourceTable}.ambiguousRows`);
    const duplicate = toCount(
      entry.duplicateSourceRows,
      `${entry.sourceTable}.duplicateSourceRows`
    );
    if (source !== mapped + missing + ambiguous) {
      throw new Error(`Source classification is not exhaustive for ${entry.sourceTable}.`);
    }
    sourceRows += source;
    mappedRows += mapped;
    missingRows += missing;
    ambiguousSourceRows += ambiguous;
    duplicateSourceRows += duplicate;
  }

  const reverseOrphanRows = toCount(sidecarMetrics.reverseOrphanRows, "reverseOrphanRows");
  const unknownSourceRows = toCount(sidecarMetrics.unknownSourceRows, "unknownSourceRows");
  const invalidCanonicalBoundaryRows = toCount(
    sidecarMetrics.invalidCanonicalBoundaryRows,
    "invalidCanonicalBoundaryRows"
  );
  const duplicateSidecarRows = toCount(
    sidecarMetrics.duplicateSidecarRows,
    "duplicateSidecarRows"
  );
  const counts = {
    sourceRows,
    mappedRows,
    duplicateRows: duplicateSourceRows + duplicateSidecarRows,
    ambiguousRows:
      ambiguousSourceRows + reverseOrphanRows + unknownSourceRows + invalidCanonicalBoundaryRows,
    missingRows
  };
  for (const [field, value] of Object.entries(counts)) {
    if (!Number.isSafeInteger(value) || value > INT32_MAX) {
      throw new Error(`${field} must fit a non-negative PostgreSQL integer.`);
    }
  }

  return {
    counts,
    integrity: {
      ambiguousSourceRows,
      duplicateSourceRows,
      duplicateSidecarRows,
      reverseOrphanRows,
      unknownSourceRows,
      invalidCanonicalBoundaryRows,
      reverseOrphansByTable: sidecarMetrics.reverseOrphansByTable ?? {}
    }
  };
}

export function validateRepositoryReference(value, field) {
  if (typeof value !== "string" || !REPOSITORY_REFERENCE_PATTERN.test(value)) {
    throw new Error(
      `${field} must use repository@40-character-lowercase-commit:path form.`
    );
  }
  const path = value.slice(value.indexOf(":") + 1);
  if (
    path.trim() !== path ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes(":") ||
    path.split("/").includes("..")
  ) {
    throw new Error(`${field} contains an invalid repository path.`);
  }
  return value;
}

export function validateSha256(value, field) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(`${field} must be a lowercase 64-character SHA-256 hash.`);
  }
  return value;
}

export function parseCliOptions(argv, environment = process.env) {
  const parsed = {};
  const names = new Map([
    ["--mode", "mode"],
    ["--repair-ref", "repairPlanReference"],
    ["--rollback-ref", "rollbackReference"],
    ["--prior-apply-receipt-hash", "priorApplyReceiptHash"]
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    const field = names.get(name);
    if (!field) throw new Error(`Unknown argument: ${name}`);
    if (parsed[field] !== undefined) throw new Error(`Argument supplied more than once: ${name}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Argument requires a value: ${name}`);
    parsed[field] = value;
    index += 1;
  }

  const mode = (parsed.mode ?? environment.PHASE202_OWNERSHIP_MODE ?? "").toUpperCase();
  if (mode !== "APPLY" && mode !== "AUDIT") {
    throw new Error("Exactly one reconciliation mode, APPLY or AUDIT, is required.");
  }
  const repairPlanReference = validateRepositoryReference(
    parsed.repairPlanReference ?? environment.PHASE202_REPAIR_PLAN_REFERENCE,
    "repairPlanReference"
  );
  const rollbackReference = validateRepositoryReference(
    parsed.rollbackReference ?? environment.PHASE202_ROLLBACK_REFERENCE,
    "rollbackReference"
  );
  const priorApplyReceiptHash =
    parsed.priorApplyReceiptHash ?? environment.PHASE202_PRIOR_APPLY_RECEIPT_HASH;
  if (mode === "AUDIT") {
    validateSha256(priorApplyReceiptHash, "priorApplyReceiptHash");
  } else if (priorApplyReceiptHash) {
    throw new Error("priorApplyReceiptHash is accepted only in AUDIT mode.");
  }

  const databaseUrl = environment.PHASE202_OWNERSHIP_DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("PHASE202_OWNERSHIP_DATABASE_URL is required.");
  let parsedDatabaseUrl;
  try {
    parsedDatabaseUrl = new URL(databaseUrl);
  } catch {
    throw new Error("PHASE202_OWNERSHIP_DATABASE_URL must be a valid PostgreSQL URL.");
  }
  if (!['postgresql:', 'postgres:'].includes(parsedDatabaseUrl.protocol)) {
    throw new Error("PHASE202_OWNERSHIP_DATABASE_URL must use PostgreSQL.");
  }

  return {
    mode,
    repairPlanReference,
    rollbackReference,
    priorApplyReceiptHash: priorApplyReceiptHash ?? null,
    databaseUrl
  };
}

function normalizeBlockers(rows) {
  return rows.map((row) => ({
    blocker: String(row.blocker),
    subject: row.subject === null || row.subject === undefined ? null : String(row.subject)
  }));
}

function receiptIsClean(counts) {
  return (
    counts.sourceRows === counts.mappedRows &&
    counts.duplicateRows === 0 &&
    counts.ambiguousRows === 0 &&
    counts.missingRows === 0
  );
}

export async function executeOwnershipReconciliation(database, options) {
  return database.$transaction(
    async (transaction) => {
      const inventoryRows = await transaction.$queryRawUnsafe(
        `SELECT entral.phase202_live_source_inventory_hash() AS "sourceInventoryHash"`
      );
      const sourceInventoryHash = validateSha256(
        inventoryRows?.[0]?.sourceInventoryHash,
        "sourceInventoryHash"
      );
      const sourceMetrics = await transaction.$queryRawUnsafe(buildSourceMetricsSql());
      const sidecarRows = await transaction.$queryRawUnsafe(buildSidecarMetricsSql());
      if (sidecarRows.length !== 1) throw new Error("Sidecar metrics query returned no unique result.");
      const { counts, integrity } = aggregateReconciliationCounts(sourceMetrics, sidecarRows[0]);
      const liveBlockers = normalizeBlockers(
        await transaction.$queryRawUnsafe(
          `SELECT blocker,subject FROM entral.phase202_live_ownership_blockers() ORDER BY blocker,subject`
        )
      );

      const clean = receiptIsClean(counts);
      if (clean !== (liveBlockers.length === 0)) {
        throw new Error(
          "Independent ownership metrics disagree with phase202_live_ownership_blockers()."
        );
      }

      let priorApplyReceiptHash = null;
      if (options.mode === "AUDIT") {
        const priorRows = await transaction.$queryRawUnsafe(
          `SELECT "receiptHash" FROM "OwnershipReconciliationRun"
           WHERE "mode"='APPLY' AND "receiptHash"=$1 AND "sourceInventoryHash"=$2
             AND "sourceRows"="mappedRows" AND "duplicateRows"=0
             AND "ambiguousRows"=0 AND "missingRows"=0
           ORDER BY "completedAt" DESC,"id" DESC LIMIT 1`,
          options.priorApplyReceiptHash,
          sourceInventoryHash
        );
        if (priorRows.length !== 1) {
          throw new Error(
            "AUDIT requires the supplied clean APPLY receipt for the same live inventory hash."
          );
        }
        priorApplyReceiptHash = validateSha256(
          priorRows[0].receiptHash,
          "priorApplyReceiptHash"
        );
      }

      const inventoryConfirmation = await transaction.$queryRawUnsafe(
        `SELECT entral.phase202_live_source_inventory_hash() AS "sourceInventoryHash"`
      );
      if (inventoryConfirmation?.[0]?.sourceInventoryHash !== sourceInventoryHash) {
        throw new Error("Live source inventory changed during reconciliation.");
      }

      const inserted = await transaction.$queryRawUnsafe(
        `WITH receipt AS (SELECT clock_timestamp() AS completed_at)
         INSERT INTO "OwnershipReconciliationRun" (
           "id","mode","sourceInventoryHash","sourceRows","mappedRows","duplicateRows",
           "ambiguousRows","missingRows","repairPlanReference","rollbackReference",
           "receiptHash","completedAt"
         )
         SELECT gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,
           entral.phase202_reconciliation_hash(
             $1,$2,$3::integer,$4::integer,$5::integer,$6::integer,$7::integer,$8,$9,receipt.completed_at
           ),
           receipt.completed_at
         FROM receipt
         RETURNING "id","receiptHash","completedAt"`,
        options.mode,
        sourceInventoryHash,
        counts.sourceRows,
        counts.mappedRows,
        counts.duplicateRows,
        counts.ambiguousRows,
        counts.missingRows,
        options.repairPlanReference,
        options.rollbackReference
      );
      if (inserted.length !== 1) throw new Error("Reconciliation receipt was not persisted.");
      const receiptHash = validateSha256(inserted[0].receiptHash, "receiptHash");

      return {
        schemaVersion: "phase202-ownership-reconciliation-receipt.v1",
        phase: 202,
        status: clean ? "PASS" : "FAIL",
        mode: options.mode,
        reconciliationRunId: String(inserted[0].id),
        sourceInventoryHash,
        counts,
        integrity,
        liveBlockers,
        repairPlanReference: options.repairPlanReference,
        rollbackReference: options.rollbackReference,
        priorApplyReceiptHash,
        receiptHash,
        completedAt: new Date(inserted[0].completedAt).toISOString()
      };
    },
    { isolationLevel: "Serializable", maxWait: 10_000, timeout: 120_000 }
  );
}

export function redactOperationalError(error) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/postgres(?:ql)?:\/\/[^\s'"<>]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/\b(password|secret|token)=([^\s&]+)/gi, "$1=[REDACTED]")
    .slice(0, 1000);
}

export async function runCli(argv = process.argv.slice(2), environment = process.env) {
  let database;
  try {
    const options = parseCliOptions(argv, environment);
    const { PrismaClient } = await import("@prisma/client");
    database = new PrismaClient({ datasources: { db: { url: options.databaseUrl } } });
    const receipt = await executeOwnershipReconciliation(database, options);
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    if (receipt.status !== "PASS") process.exitCode = 1;
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        schemaVersion: "phase202-ownership-reconciliation-error.v1",
        phase: 202,
        status: "ERROR",
        error: redactOperationalError(error)
      })}\n`
    );
    process.exitCode = 1;
  } finally {
    if (database) await database.$disconnect();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  await runCli();
}
