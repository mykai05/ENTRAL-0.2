import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PHASE202_SOURCE_TABLES,
  aggregateReconciliationCounts,
  buildSidecarMetricsSql,
  buildSourceMetricsSql,
  parseCliOptions,
  redactOperationalError,
  validateRepositoryReference
} from "./phase202-ownership-reconcile.mjs";

const SHA = "a".repeat(40);
const RECEIPT_HASH = "b".repeat(64);
const validEnvironment = {
  PHASE202_OWNERSHIP_DATABASE_URL: "postgresql://runner:do-not-print@db.example/entral",
  PHASE202_OWNERSHIP_MODE: "APPLY",
  PHASE202_REPAIR_PLAN_REFERENCE: `mykai05/ENTRAL-0.2@${SHA}:docs/PHASE_202_OWNERSHIP_RECONCILIATION.md`,
  PHASE202_ROLLBACK_REFERENCE: `mykai05/ENTRAL-0.2@${SHA}:.entral/governor/releases/phase-198.json`
};

function completeSourceMetrics(overrides = {}) {
  return PHASE202_SOURCE_TABLES.map((sourceTable) => ({
    sourceTable,
    sourceRows: 1n,
    mappedRows: 1n,
    missingRows: 0n,
    ambiguousRows: 0n,
    duplicateSourceRows: 0n,
    ...(overrides[sourceTable] ?? {})
  }));
}

describe("Phase 202 ownership reconciliation input", () => {
  it("accepts an APPLY invocation only with exact repository references", () => {
    const options = parseCliOptions([], validEnvironment);
    assert.equal(options.mode, "APPLY");
    assert.equal(options.priorApplyReceiptHash, null);
    assert.equal(options.repairPlanReference, validEnvironment.PHASE202_REPAIR_PLAN_REFERENCE);
  });

  it("requires the retained clean APPLY hash for a separate AUDIT invocation", () => {
    assert.throws(
      () => parseCliOptions(["--mode", "AUDIT"], validEnvironment),
      /priorApplyReceiptHash/
    );
    const options = parseCliOptions(
      ["--mode", "AUDIT", "--prior-apply-receipt-hash", RECEIPT_HASH],
      validEnvironment
    );
    assert.equal(options.mode, "AUDIT");
    assert.equal(options.priorApplyReceiptHash, RECEIPT_HASH);
  });

  it("rejects ambiguous modes, unknown arguments, non-PostgreSQL URLs, and a prior hash on APPLY", () => {
    assert.throws(() => parseCliOptions([], { ...validEnvironment, PHASE202_OWNERSHIP_MODE: "" }));
    assert.throws(() => parseCliOptions(["--unexpected", "x"], validEnvironment));
    assert.throws(() =>
      parseCliOptions([], { ...validEnvironment, PHASE202_OWNERSHIP_DATABASE_URL: "file:db" })
    );
    assert.throws(() =>
      parseCliOptions(["--prior-apply-receipt-hash", RECEIPT_HASH], validEnvironment)
    );
  });

  it("rejects local paths, uppercase commits, parent traversal, and incomplete references", () => {
    for (const reference of [
      "C:/repo/docs/repair.md",
      `mykai05/ENTRAL-0.2@${SHA.toUpperCase()}:docs/repair.md`,
      `mykai05/ENTRAL-0.2@${SHA}:../repair.md`,
      `mykai05/ENTRAL-0.2@${SHA}:C:/repair.md`,
      `mykai05/ENTRAL-0.2@${SHA}:/docs/repair.md`,
      `mykai05/ENTRAL-0.2@${SHA}`
    ]) {
      assert.throws(() => validateRepositoryReference(reference, "reference"));
    }
  });
});

describe("Phase 202 ownership reconciliation metrics", () => {
  it("covers the full server inventory and exact special-case ownership expressions", () => {
    assert.equal(PHASE202_SOURCE_TABLES.length, 41);
    assert.equal(new Set(PHASE202_SOURCE_TABLES).size, PHASE202_SOURCE_TABLES.length);
    const sql = buildSourceMetricsSql();
    assert.match(sql, /source\."userId"\|\|':'\|\|source\."teamId"/);
    assert.match(sql, /team\."id"=source\."organizationId"/);
    assert.match(sql, /source\."createdByActorId"/);
    assert.match(sql, /source\."scopeKind" IN \('TENANT','UNRESOLVED'\)/);
    assert.match(sql, /source\."scopeKind"='UNRESOLVED'/);
    assert.match(sql, /ownership\."businessId" IS NOT DISTINCT FROM NULL::uuid/);
    const sidecarSql = buildSidecarMetricsSql();
    assert.match(sidecarSql, /reverse_orphans/);
    assert.match(sidecarSql, /unknown_sources/);
    assert.match(sidecarSql, /canonical_boundaries/);
  });

  it("reports a clean, exhaustive inventory without loss", () => {
    const result = aggregateReconciliationCounts(completeSourceMetrics(), {
      reverseOrphanRows: 0n,
      duplicateSidecarRows: 0n,
      unknownSourceRows: 0n,
      invalidCanonicalBoundaryRows: 0n,
      reverseOrphansByTable: {}
    });
    assert.deepEqual(result.counts, {
      sourceRows: PHASE202_SOURCE_TABLES.length,
      mappedRows: PHASE202_SOURCE_TABLES.length,
      duplicateRows: 0,
      ambiguousRows: 0,
      missingRows: 0
    });
  });

  it("keeps missing, duplicate, mismatched, reverse-orphan, unknown-source, and canonical counts visible", () => {
    const metrics = completeSourceMetrics({
      ClientMerchStore: {
        sourceRows: 2n,
        mappedRows: 1n,
        missingRows: 1n,
        ambiguousRows: 0n,
        duplicateSourceRows: 2n
      },
      Agent: { sourceRows: 1n, mappedRows: 0n, missingRows: 0n, ambiguousRows: 1n }
    });
    const result = aggregateReconciliationCounts(metrics, {
      reverseOrphanRows: 3n,
      duplicateSidecarRows: 4n,
      unknownSourceRows: 5n,
      invalidCanonicalBoundaryRows: 6n,
      reverseOrphansByTable: { Agent: 3 }
    });
    assert.deepEqual(result.counts, {
      sourceRows: PHASE202_SOURCE_TABLES.length + 1,
      mappedRows: PHASE202_SOURCE_TABLES.length - 1,
      duplicateRows: 6,
      ambiguousRows: 15,
      missingRows: 1
    });
    assert.equal(result.integrity.ambiguousSourceRows, 1);
    assert.equal(result.integrity.reverseOrphanRows, 3);
    assert.equal(result.integrity.unknownSourceRows, 5);
  });

  it("fails closed on incomplete coverage and non-exhaustive source classification", () => {
    assert.throws(
      () => aggregateReconciliationCounts(completeSourceMetrics().slice(1), {}),
      /complete Phase 202 inventory/
    );
    const broken = completeSourceMetrics({
      Task: { sourceRows: 2n, mappedRows: 1n, missingRows: 0n, ambiguousRows: 0n }
    });
    assert.throws(() => aggregateReconciliationCounts(broken, {}), /not exhaustive for Task/);
  });
});

describe("Phase 202 ownership reconciliation output safety", () => {
  it("redacts database URLs and credential-shaped values from operational errors", () => {
    const message = redactOperationalError(
      new Error("connect postgresql://runner:secret@db.example/entral password=hunter2 token=abc")
    );
    assert.doesNotMatch(message, /runner:secret|hunter2|token=abc/);
    assert.match(message, /REDACTED/);
  });
});
