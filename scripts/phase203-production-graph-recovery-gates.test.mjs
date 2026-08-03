import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { canonicalJson, sha256 } from "../.entral/governor/lib/store.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Phase 203 graph recovery is forward-only and preserves fail-closed business scope", async () => {
  const migration = await read("prisma/migrations/20260803000000_phase_203_graph_recovery/migration.sql");
  assert.match(migration, /phase202_legacy_can_access_entity\(p_entity_id,p_permission\)/);
  assert.match(migration, /p_permission='read'/);
  assert.match(migration, /child\.business_id IS NULL/);
  assert.match(migration, /child\.role IN \('MARSHAL','GENERAL'\)/);
  assert.match(migration, /HAVING count\(\*\)=1/);
  assert.match(migration, /interaction\.help_used/);
  assert.match(migration, /p_target_type='INTERACTION_ANALYTICS'/);
  assert.doesNotMatch(migration, /DISABLE ROW LEVEL SECURITY|BYPASSRLS|DROP POLICY/);
});

test("migrated-account and interaction analytics regressions are release-bound", async () => {
  const postgres = await read("backend/tests/phase203ProductionGraphRecoveryPostgres.integration.test.ts");
  const interactionRoute = await read("backend/src/routes/interactionLayer.ts");
  const ci = await read(".github/workflows/ci-cd.yml");
  const packageJson = JSON.parse(await read("package.json"));
  assert.match(postgres, /Phase 200 disposable migration baseline/);
  assert.match(postgres, /INVALID_GRAPH_ROOT/);
  assert.match(postgres, /privateCommanderId/);
  assert.match(postgres, /tutorialBeforeRepair/);
  assert.match(postgres, /migratedMemberId/);
  assert.match(postgres, /memberTutorialMutationReceipt\.create/);
  assert.match(postgres, /interaction\.unsupported/);
  assert.match(postgres, /phase202_live_ownership_blockers/);
  assert.match(interactionRoute, /withTenantSession\(prisma/);
  assert.match(interactionRoute, /Record tenant-bound member interaction analytics evidence/);
  assert.match(interactionRoute, /Read tenant-bound Tutorial progress/);
  assert.match(interactionRoute, /Update tenant-bound Tutorial progress/);
  assert.match(interactionRoute, /Reset tenant-bound Tutorial progress/);
  assert.match(postgres, /migrated Tutorial service uses the tenant transaction/);
  assert.match(ci, /Verify migrated-account Phase 203 production graph recovery/);
  assert.ok(packageJson.scripts["test:phase203:graph-recovery"]);
});

test("Phase 202 correction is append-only and binds exact deployments and rollback hierarchy", async () => {
  const correction = JSON.parse(await read("docs/evidence/phase202/POST_CERTIFICATION_CORRECTION_P203.json"));
  assert.equal(correction.historical_release.main_sha, "c689176234bca8a43f6bb5665f6a8a63d8d653dd");
  assert.equal(correction.corrected_deployments[0].deployment_id, "dpl_HRwLpSwJaN3mU8Ye2VhEpu3Ho7MW");
  assert.equal(correction.corrected_deployments[1].deployment_id, "0cc752c9-1599-49e8-b0d2-c7eb15f0c900");
  assert.equal(correction.corrected_deployments[2].deployment_id, "e3c342e6-efcd-430e-a49d-195e51670b54");
  assert.equal(correction.corrected_rollback_hierarchy.immediate.main_sha, "22ced00b5c0f2b0f79f2cc1302bf2f534ddf7516");
  assert.equal(correction.corrected_rollback_hierarchy.deep_restore_fallback.main_sha, "5c2f9d58c25dec82d4c3102f3b48a76797801594");
  assert.equal(correction.post_certification_incident.discovered_after_certification, true);
  const { receipt_sha256: receiptSha256, ...unsigned } = correction;
  assert.equal(receiptSha256, sha256(canonicalJson(unsigned)));
});

test("all later releases require a real authenticated production member journey", async () => {
  const contracts = await read(".entral/governor/lib/contracts.mjs");
  const journey = await read("e2e/production-member-journey.mjs");
  assert.match(contracts, /if \(value\.phase >= 203\)/);
  assert.match(contracts, /INTERCEPTED_PRODUCTION_JOURNEY/);
  assert.match(contracts, /canonical_node_count/);
  assert.match(contracts, /canonical_edge_count/);
  assert.match(contracts, /MEMBER_JOURNEY_SHA_MISMATCH/);
  assert.match(contracts, /viewport_observations/);
  assert.match(journey, /Production projection did not contain actual canonical nodes/);
  assert.match(journey, /Production projection did not contain actual canonical edges/);
  assert.match(journey, /Compact mobile Universe controls/);
  assert.match(journey, /data-canonical-entity-ids/);
  assert.match(journey, /data-canonical-edge-ids/);
  assert.match(journey, /data-graph-webgl-state=\"ready\"/);
  assert.match(journey, /E2E_MIGRATED_STATE_RECEIPT_SHA256/);
  assert.match(journey, /memberSessionClaims/);
  assert.match(journey, /Current migrated member organization inventory/);
  assert.doesNotMatch(journey, /\/api\/v1\/me\b/);
  assert.doesNotMatch(journey, /page\.route\(|route\.fulfill\(/);
});
