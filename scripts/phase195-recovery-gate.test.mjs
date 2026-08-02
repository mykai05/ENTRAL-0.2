import assert from "node:assert/strict";
import test from "node:test";
import {
  assertDisposableDatabaseName,
  assertSafeContainerIdentity,
  normalizeGlobalsForPortableRestore,
  phase195BaselineMigrationNames,
  receiptContainsSecretMaterial,
  recoveryTargets,
  validateRecoveryRunId
} from "./phase195-recovery-gate.mjs";

test("Phase 195 recovery keeps its historical migration boundary when later governed migrations exist", () => {
  const before = "20260725000000_phase_190_baseline";
  const phase195 = "20260726190000_phase_195_graph_preferences_release_evidence_and_worker_readiness";
  const phase200 = "20260802023000_phase_200_interaction_layer";

  assert.deepEqual(
    phase195BaselineMigrationNames([phase200, phase195, before]),
    [before]
  );
  assert.throws(
    () => phase195BaselineMigrationNames([before, phase200]),
    /PHASE195_MIGRATION_MISSING/
  );
});

test("recovery targets are unique, explicit, and disposable", () => {
  const runId = validateRecoveryRunId("abcdef123456");
  const targets = recoveryTargets(runId);

  assert.equal(
    assertDisposableDatabaseName(targets.sourceDatabase),
    "entral_phase195_source_abcdef123456"
  );
  assert.equal(
    assertDisposableDatabaseName(targets.restoreDatabase),
    "entral_phase195_restore_abcdef123456"
  );
  assert.notEqual(targets.sourceContainer, targets.restoreContainer);
  assert.match(targets.redisContainer, /abcdef123456$/);
  assert.throws(() => assertDisposableDatabaseName("entral_production"));
  assert.throws(() => validateRecoveryRunId("not-unique"));
});

test("cleanup requires exact container ID, name, and both run labels", () => {
  const valid = {
    actualId: "a".repeat(64),
    actualName: "/entral-phase195-pg-restore-abcdef123456",
    expectedId: "a".repeat(64),
    expectedName: "entral-phase195-pg-restore-abcdef123456",
    expectedRunId: "abcdef123456",
    gate: "true",
    runId: "abcdef123456"
  };
  assert.doesNotThrow(() => assertSafeContainerIdentity(valid));
  for (const mutation of [
    { actualId: "b".repeat(64) },
    { actualName: "/entral-phase195-pg-restore-deadbeef0000" },
    { gate: "false" },
    { runId: "deadbeef0000" }
  ]) {
    assert.throws(() => assertSafeContainerIdentity({
      ...valid,
      ...mutation
    }));
  }
});

test("machine receipts reject URLs with credentials and retained secret material", () => {
  assert.equal(receiptContainsSecretMaterial({
    database: "entral_phase195_restore_abcdef123456",
    password_material_present: false,
    sha256: "a".repeat(64)
  }), false);
  assert.equal(receiptContainsSecretMaterial({
    database_url: "postgresql://user:password@localhost/entral"
  }), true);
  assert.equal(receiptContainsSecretMaterial({
    globals: "SCRAM-SHA-256$4096:secret"
  }), true);
});

test("globals restore rebinds only the disposable source grantor", () => {
  const source = "entral_p195_src_a1b2c3d4e5f6";
  const destination = "entral_p195_dst_a1b2c3d4e5f6";
  const restored = normalizeGlobalsForPortableRestore(
    [
      `CREATE ROLE ${source};`,
      "CREATE ROLE entral_api;",
      "CREATE ROLE entral_verifier;",
      `GRANT entral_verifier TO entral_api GRANTED BY ${source};`
    ].join("\n"),
    source,
    destination
  );

  assert.equal(restored.grantor_rebindings, 1);
  assert.match(
    restored.sql,
    new RegExp(`GRANTED BY ${destination};`)
  );
  assert.doesNotMatch(
    restored.sql,
    new RegExp(`GRANTED BY ${source};`)
  );
});
