import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseBaselineCertificationManifest } from "../packages/contracts/dist/index.js";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const readJson = async (path) => JSON.parse(await read(path));

test("Phase 199 candidate binds the exact certified Phase 198 production baseline", async () => {
  const [candidate, release] = await Promise.all([
    readJson("docs/evidence/phase199/BASELINE_CERTIFICATION_CANDIDATE.json"),
    readJson(".entral/governor/releases/phase-198.json")
  ]);

  assert.doesNotThrow(() => parseBaselineCertificationManifest(candidate));
  assert.equal(candidate.status, "CANDIDATE_REVIEW");
  assert.equal(candidate.certification.phase_200_blocked, true);
  assert.equal(candidate.certification.review_verdict_commit_sha, null);
  assert.equal(candidate.repositories.product.main_sha, release.main_sha);
  assert.deepEqual(
    candidate.deployments.map(({ deployment_id, deployed_commit_sha, role, status }) => ({ deployment_id, deployed_commit_sha, role, status })),
    release.deployments.map(({ deployment_id, deployed_commit_sha, role, status }) => ({ deployment_id, deployed_commit_sha, role, status }))
  );
  assert.equal(candidate.production_truth.authenticated_smoke_sha256, release.authenticated_smoke.receipt_sha256);
  assert.equal(candidate.production_truth.state_readback_sha256, release.production_readback.receipt_sha256);
});

test("Phase 199 retains typed candidate evidence for all twenty-one acceptance gates", async () => {
  const audit = await readJson("docs/evidence/phase199/PRODUCT_TRUTH_AUDIT.json");
  const ids = audit.gates.map((gate) => gate.gate_id);

  assert.deepEqual(ids, Array.from({ length: 21 }, (_, index) => `P199-F${String(index + 1).padStart(3, "0")}-A`));
  assert.equal(new Set(ids).size, 21);
  assert.equal(audit.conclusion.includes("does not certify or release Phase 199"), true);
});

test("Production secure JSON, administrative step-up, and memory runtime fail closed", async () => {
  const [environment, secureJson, memoryServer] = await Promise.all([
    read("backend/src/env.ts"),
    read("backend/src/services/secureJson.ts"),
    read("backend/src/dev-memory-server.ts")
  ]);

  assert.match(environment, /Production requires DATA_ENCRYPTION_KEY/);
  assert.match(environment, /Production API requires ADMIN_MFA_CODE/);
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
    "canonicalViewFitSignal={viewFitSignal}", "canonicalViewFocusSignal={viewFocusSignal}",
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

test("Governor keeps the next phase blocked pending mandatory review", async () => {
  const [state, contract] = await Promise.all([
    readJson(".entral/governor/PROGRAM_STATE.json"),
    readJson(".entral/governor/phases/199/PHASE_CONTRACT.v1.json")
  ]);

  assert.equal(state.current_phase, 199);
  assert.equal(state.certified_phases.includes(199), false);
  assert.equal(contract.review_policy, "MANDATORY");
  assert.equal(contract.review_checkpoint.checkpoint_id, "P199-BASELINE-RECERTIFICATION-REVIEW");
  assert.equal(contract.baseline_contract.phase_200_blocked_until_certified, true);
});
