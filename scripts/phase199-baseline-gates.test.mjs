import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseBaselineCertificationManifest } from "../packages/contracts/dist/index.js";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const readJson = async (path) => JSON.parse(await read(path));

test("Phase 199 corrected candidate binds the certified Phase 198 baseline and owner-attested verdict", async () => {
  const [candidate, release] = await Promise.all([
    readJson("docs/evidence/phase199/BASELINE_CERTIFICATION_CANDIDATE.json"),
    readJson(".entral/governor/releases/phase-198.json")
  ]);

  assert.doesNotThrow(() => parseBaselineCertificationManifest(candidate));
  assert.equal(candidate.status, "CANDIDATE_REVIEW");
  assert.equal(candidate.certification.phase_200_blocked, true);
  assert.equal(candidate.certification.review_verdict_commit_sha, "9331b6e37d5e8db114ffc5fc211df04482cfcb67");
  assert.equal(candidate.repositories.product.main_sha, release.main_sha);
  assert.deepEqual(
    candidate.deployments.map(({ deployment_id, deployed_commit_sha, role, status }) => ({ deployment_id, deployed_commit_sha, role, status })),
    release.deployments.map(({ deployment_id, deployed_commit_sha, role, status }) => ({ deployment_id, deployed_commit_sha, role, status }))
  );
  assert.equal(candidate.production_truth.authenticated_smoke_sha256, release.authenticated_smoke.receipt_sha256);
  assert.equal(candidate.production_truth.state_readback_sha256, release.production_readback.receipt_sha256);
  assert.equal(candidate.production_truth.release_tag, "phase-198");
  assert.deepEqual(candidate.rollback_point, {
    release_phase: 198,
    main_sha: "5c2f9d58c25dec82d4c3102f3b48a76797801594",
    reference: "release:phase-198:5c2f9d58c25dec82d4c3102f3b48a76797801594",
    receipt_sha256: null
  });
});

test("Phase 100 through 190 aggregates name original gates and bind portable source, test, and release evidence", async () => {
  const candidate = await readJson("docs/evidence/phase199/BASELINE_CERTIFICATION_CANDIDATE.json");
  const portableReference = /^[^\s@/]+\/[^\s@/]+@[a-f0-9]{40}:[^\s].+$/;
  for (const phase of [100, 110, 120, 130, 140, 150, 160, 170, 180, 190]) {
    const records = candidate.requirements.filter((item) => item.phase === phase);
    assert.equal(records.length, 1, `Phase ${phase} must have one aggregate record`);
    assert.match(records[0].completion_gate, /Gate/i);
    assert.deepEqual(new Set(records[0].evidence.map((item) => item.evidence_type)), new Set(["SOURCE", "TEST", "PRODUCTION_READBACK"]));
    records[0].evidence.forEach((item) => assert.match(item.path_or_id, portableReference));
  }
  for (const item of candidate.legacy_isolation) item.evidence.forEach((reference) => assert.match(reference, portableReference));
});

test("Secure JSON inventory is complete and certification is narrowed to the exact credential subset", async () => {
  const [candidate, inventory] = await Promise.all([
    readJson("docs/evidence/phase199/BASELINE_CERTIFICATION_CANDIDATE.json"),
    readJson("docs/evidence/phase199/SECURE_JSON_COLUMN_INVENTORY.json")
  ]);
  const keys = (rows) => rows.map((item) => `${item.table}.${item.column}`);
  const credentialKeys = keys(inventory.columns.filter((item) => item.credential_bearing));
  const protectedKeys = keys(inventory.columns.filter((item) => item.reconciliation_protected));
  assert.equal(inventory.columns.length, 60);
  assert.equal(new Set(keys(inventory.columns)).size, 60);
  assert.deepEqual(credentialKeys, ["ShopifyConnection.credentialJson", "ShopifyOAuthContinuation.payloadJson"]);
  assert.deepEqual(protectedKeys, credentialKeys);
  assert.deepEqual(keys(candidate.secure_json_reconciliation.protected_targets), credentialKeys);
  assert.equal(candidate.secure_json_reconciliation.inventory_reference, "mykai05/ENTRAL-0.2@225c6ddff2bb738b478880dbd87f4239db924d2d:docs/evidence/phase199/SECURE_JSON_COLUMN_INVENTORY.json");
});

test("Phase 199 records every binding known limitation", async () => {
  const candidate = await readJson("docs/evidence/phase199/BASELINE_CERTIFICATION_CANDIDATE.json");
  const combined = candidate.known_limitations.join(" ");
  for (const phrase of ["Phase 202", "user-local", "3D renderer", "Phase 200 UX debt", "static production ADMIN_MFA_CODE", "Checkout remains fail-closed"]) {
    assert.match(combined, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});

test("Phase 199 retains typed candidate evidence for all twenty-one acceptance gates", async () => {
  const audit = await readJson("docs/evidence/phase199/PRODUCT_TRUTH_AUDIT.json");
  const ids = audit.gates.map((gate) => gate.gate_id);

  assert.deepEqual(ids, Array.from({ length: 21 }, (_, index) => `P199-F${String(index + 1).padStart(3, "0")}-A`));
  assert.equal(new Set(ids).size, 21);
  assert.equal(audit.conclusion.includes("does not certify or release Phase 199"), true);
});

test("Production secure JSON, administrative step-up, and memory runtime fail closed", async () => {
  const [environment, secureJson, memoryServer, state, supportAccess] = await Promise.all([
    read("backend/src/env.ts"),
    read("backend/src/services/secureJson.ts"),
    read("backend/src/dev-memory-server.ts"),
    readJson(".entral/governor/PROGRAM_STATE.json"),
    read("backend/src/services/phase202SupportAccess.ts")
  ]);

  assert.match(environment, /Production requires DATA_ENCRYPTION_KEY/);
  if (state.current_phase < 202) {
    assert.match(environment, /Production API requires ADMIN_MFA_CODE/);
  } else {
    assert.doesNotMatch(environment, /ADMIN_MFA_CODE/);
    assert.match(supportAccess, /transaction\.authSession\.findFirst/);
    assert.match(supportAccess, /OWNER_RECENT_MFA_STEP_UP/);
  }
  assert.match(secureJson, /Production secure JSON writes require DATA_ENCRYPTION_KEY/);
  assert.ok(memoryServer.indexOf('if (process.env.NODE_ENV === "production")') < memoryServer.indexOf("config({ path:"));
  assert.match(memoryServer, /in-memory development server is forbidden in production/);
});

test("Canonical member surfaces fail unavailable and share one 2D and 3D authority", async () => {
  const [memberShell, workspace, universe3d, legacyRenderer] = await Promise.all([
    read("frontend/components/CanonicalMemberShell.tsx"),
    read("frontend/components/CanonicalGraphWorkspace.tsx"),
    read("frontend/components/CanonicalUniverse3DGraph.tsx"),
    read("frontend/components/NeuronsCommandCenter.tsx")
  ]);

  assert.match(memberShell, /Canonical workspace unavailable/);
  assert.match(memberShell, /!workspaceError && portfolio && hierarchy/);
  assert.match(workspace, /CanonicalUniverse3DGraph/);
  for (const binding of [
    "canonicalEntities={entities}", "canonicalLayout3D={layout}",
    "canonicalGraphSettings={settings}", "canonicalSelectedEntityId={selectedEntityId}",
    "canonicalViewFitSignal={viewFitSignal}", "canonicalViewFocusSignal={rendererFocusSignal}",
    "embeddedGraphOnly"
  ]) assert.ok(universe3d.includes(binding), `missing canonical 3D binding: ${binding}`);
  assert.ok(legacyRenderer.includes("{!isMemberSurface ? <section>"));
  assert.ok(legacyRenderer.indexOf("command-metrics") > legacyRenderer.indexOf("{!isMemberSurface ? <section>"));
});

test("Tenant, Tutorial, website, Microsoft, and pre-change inventories are explicit", async () => {
  const [tenant, truth, prechange, tutorial] = await Promise.all([
    readJson("docs/evidence/phase199/TENANT_SCOPE_INVENTORY.json"),
    readJson("docs/evidence/phase199/PRODUCT_TRUTH_AUDIT.json"),
    readJson("docs/evidence/phase199/PRECHANGE_REPOSITORY_AUDIT.json"),
    read("frontend/components/OnboardingTour.tsx")
  ]);

  assert.ok(tenant.user_scoped_models.length >= 30);
  assert.equal(tenant.phase_202_migration_required, true);
  assert.equal(prechange.product.head, prechange.product.origin_main);
  assert.equal(prechange.proven_defects.length, 3);
  assert.deepEqual(truth.microsoft.required_runtime_dependencies, []);
  assert.equal(truth.website.checkout_status, "FAIL_CLOSED_UNAVAILABLE");
  assert.match(tutorial, /entral:open-academy/);
  assert.match(tutorial, /entral:open-tutorial/);
});

test("Governor blocks Phase 200 until the exact Phase 199 production release and then permits only its bounded continuation", async () => {
  const [state, contract, phase199Release, phase200Task, phase200Result] = await Promise.all([
    readJson(".entral/governor/PROGRAM_STATE.json"),
    readJson(".entral/governor/phases/199/PHASE_CONTRACT.v1.json"),
    readJson(".entral/governor/releases/phase-199.json"),
    readJson(".entral/governor/tasks/P200-INTERACTION-LAYER-001.json"),
    readJson(".entral/governor/results/P200-INTERACTION-LAYER-001-6287a903.json")
  ]);

  if (state.current_phase === 199) {
    assert.equal(state.certified_phases.includes(199), false);
    assert.equal(state.review_state.status, "PASS_WITH_BINDING_CORRECTIONS");
    if (state.review_state.binding_corrections_completed) {
      assert.equal(state.review_state.correction_commit_sha, "39000c648844e02fa472b1f4a824cd0114d70ba7");
      assert.equal(state.latest_execution_result.outcome, "PASSED");
    } else {
      assert.equal(state.review_state.correction_commit_sha, undefined);
    }
  } else {
    assert.equal(Number.isInteger(state.current_phase) && state.current_phase >= 200, true);
    assert.equal(state.certified_phases.includes(199), true);
    assert.equal(phase199Release.phase, 199);
    assert.equal(phase199Release.main_sha, "f1e4ba62bc60986cb8e7366a35ac9a92aeda0abb");
    assert.equal(phase200Result.task_packet_id, "P200-INTERACTION-LAYER-001");
    assert.equal(phase200Result.outcome, "PASSED");
    assert.equal(phase200Result.commit_sha, "6287a9036cc55239e86e09befef07364b37502ee");
    assert.equal(phase200Task.task_packet_id, "P200-INTERACTION-LAYER-001");
    assert.equal(phase200Task.phase, 200);
    assert.equal(
      phase200Task.scope.some((entry) => /(?:phase[_-]?202|(?:^|[\\/])202(?:[\\/]|$))/i.test(entry)),
      false
    );
    if (state.current_phase === 200) {
      assert.equal(state.latest_production_release.phase, 199);
      assert.equal(state.latest_production_release.main_sha, "f1e4ba62bc60986cb8e7366a35ac9a92aeda0abb");
    } else {
      assert.equal(state.certified_phases.includes(200), true);
      assert.equal(
        Number.isInteger(state.latest_production_release.phase) &&
          state.latest_production_release.phase >= 200 &&
          state.latest_production_release.phase <= state.current_phase,
        true
      );
      assert.equal(state.certified_phases.includes(state.latest_production_release.phase), true);
      if (state.latest_production_release.phase === 200) {
        assert.equal(state.latest_production_release.main_sha, "22ced00b5c0f2b0f79f2cc1302bf2f534ddf7516");
      }
    }
    assert.equal(state.review_state, null);
  }
  assert.equal(contract.review_policy, "MANDATORY");
  assert.equal(contract.review_checkpoint.checkpoint_id, "P199-BASELINE-RECERTIFICATION-REVIEW");
  assert.equal(contract.baseline_contract.phase_200_blocked_until_certified, true);
});
