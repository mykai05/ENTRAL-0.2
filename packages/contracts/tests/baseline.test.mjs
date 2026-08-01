import assert from "node:assert/strict";
import test from "node:test";
import { parseBaselineCertificationManifest } from "../dist/index.js";

const productSha = "5c2f9d58c25dec82d4c3102f3b48a76797801594";
const sha256 = "a".repeat(64);
const evidence = [{ path_or_id: "test:evidence", content_sha256: sha256, evidence_type: "TEST" }];

function requirement(requirement_id, phase) {
  return { requirement_id, phase, state: "VERIFIED_COMPLETE", summary: "Verified by deterministic evidence.", evidence, limitation: null };
}

function candidate(overrides = {}) {
  const requirements = [100, 110, 120, 130, 140, 150, 160, 170, 180, 190]
    .map((phase) => requirement(`P${phase}-BASELINE`, phase));
  for (let feature = 1; feature <= 60; feature += 1) {
    requirements.push(requirement(`P195-F${String(feature).padStart(3, "0")}`, 195));
  }
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    manifest_id: "123e4567-e89b-42d3-a456-426614174000",
    phase: 199,
    status: "CANDIDATE_REVIEW",
    covered_phases: [100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 195],
    repositories: {
      product: { repository: "mykai05/ENTRAL-0.2", main_sha: productSha },
      control_website: { repository: "SovereignProtocol/sovereign-protocol-agent", main_sha: "8f1923fcec20a11dc0aef304c0e05827fe2cb5c5" }
    },
    deployments: [
      { role: "FRONTEND", provider: "VERCEL", deployment_id: "frontend", deployed_commit_sha: productSha, production_url: "https://entral-0-2-frontend.vercel.app", status: "READY" },
      { role: "API", provider: "RAILWAY", deployment_id: "api", deployed_commit_sha: productSha, production_url: "https://entral-backend-production.up.railway.app/health", status: "READY" },
      { role: "WORKER", provider: "RAILWAY", deployment_id: "worker", deployed_commit_sha: productSha, production_url: "https://entral-backend-production.up.railway.app/health", status: "READY" }
    ],
    migrations: [{ name: "phase-198-no-schema-change", status: "NO_SCHEMA_CHANGE", checksum_sha256: null, production_readback_sha256: sha256 }],
    runtime_versions: { node: "20.19.0", pnpm: "9.12.3", postgres: "18.4", redis: "8.2.8" },
    requirements,
    legacy_isolation: [{ surface: "development memory server", disposition: "DEVELOPMENT_ONLY", production_reachable: false, canonical_authority: false, evidence: ["backend/src/dev-memory-server.ts"] }],
    tests: [{ command: "pnpm test:phase199", status: "PENDING_REVIEW", receipt_sha256: null }],
    production_truth: {
      release_phase: 198,
      canonical_release_id: "223e4567-e89b-42d3-a456-426614174000",
      phase_gate_id: "323e4567-e89b-42d3-a456-426614174000",
      authenticated_smoke_sha256: sha256,
      state_readback_sha256: sha256
    },
    secure_json_reconciliation: { status: "PENDING_DEPLOYMENT", plaintext_rows_found: null, plaintext_rows_reencrypted: null, receipt_sha256: null },
    known_limitations: ["Shared customer records remain user scoped until Phase 202; current authorization remains per-user."],
    rollback_point: { release_phase: 197, main_sha: "fdabaea99400ed1e1dfcada2cd41a336ed0a193b", reference: "release:phase-197" },
    certification: {
      all_mandatory_gates_passed: false,
      phase_200_blocked: true,
      review_checkpoint_id: "P199-BASELINE-RECERTIFICATION-REVIEW",
      review_verdict_commit_sha: null
    },
    generated_at: "2026-08-01T16:30:00.000Z",
    ...overrides
  };
}

test("Phase 199 candidate requires exact baseline coverage and remains fail closed", () => {
  assert.doesNotThrow(() => parseBaselineCertificationManifest(candidate()));
  const missing = candidate();
  missing.requirements = missing.requirements.filter((item) => item.requirement_id !== "P195-F060");
  assert.throws(() => parseBaselineCertificationManifest(missing), (error) => error.code === "MISSING_PHASE_195_REQUIREMENT");
});

test("Phase 199 candidate rejects production/source mismatch and legacy authority", () => {
  const mismatched = candidate();
  mismatched.deployments[1] = { ...mismatched.deployments[1], deployed_commit_sha: "b".repeat(40) };
  assert.throws(() => parseBaselineCertificationManifest(mismatched), (error) => error.code === "BASELINE_DEPLOYMENT_SHA_MISMATCH");
  const authoritativeLegacy = candidate();
  authoritativeLegacy.legacy_isolation[0] = { ...authoritativeLegacy.legacy_isolation[0], canonical_authority: true };
  assert.throws(() => parseBaselineCertificationManifest(authoritativeLegacy), (error) => error.code === "LEGACY_CANONICAL_AUTHORITY");
});

test("Phase 199 certification requires review, reconciliation, and completed tests", () => {
  const incomplete = candidate({ status: "CERTIFIED" });
  assert.throws(() => parseBaselineCertificationManifest(incomplete), (error) => error.code === "BASELINE_CERTIFICATION_INCOMPLETE");
  const failOpen = candidate();
  failOpen.certification = { ...failOpen.certification, phase_200_blocked: false };
  assert.throws(() => parseBaselineCertificationManifest(failOpen), (error) => error.code === "BASELINE_PHASE_200_FAIL_OPEN");
});
