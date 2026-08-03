import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  GovernorError,
  validateReleaseControlEvidence,
  validateReleaseControlPlan,
  validateReleaseEvidenceBundle,
  validateReleaseManifest
} from "../lib/contracts.mjs";
import {
  classifyReleaseRisk,
  createIsolatedWorktree,
  createReleaseEvidenceBundle,
  evaluateRelease,
  executeBoundedRollback,
  inspectRepositories,
  mergeProtectedMain,
  reconcileRepository,
  requiredGatesForRisk,
  selectTargetedTests
} from "../lib/release-controller.mjs";
import { sha256 } from "../lib/store.mjs";

const SHA = Object.freeze({
  verified: "1".repeat(40),
  task: "2".repeat(40),
  productMain: "3".repeat(40),
  controlMain: "4".repeat(40),
  migration: "5".repeat(64),
  rollback: "6".repeat(64),
  receipt: "7".repeat(64)
});

const auth = Object.freeze({ actor: "CODEX_5_6_SOL_XHIGH", sessionId: "phase197-test" });
const at = (seconds = 0) => `2026-08-01T00:00:${String(seconds).padStart(2, "0")}.000Z`;

function plan(overrides = {}) {
  const base = {
    contract_version: "1.0.0",
    schema_version: 1,
    plan_id: "P197-RELEASE-PLAN-001",
    phase: 197,
    repositories: [
      {
        role: "PRODUCT",
        repository: "mykai05/ENTRAL-0.2",
        local_path: "C:/repo/product",
        origin_url: "https://github.com/mykai05/ENTRAL-0.2.git",
        default_branch: "main",
        latest_verified_main_sha: SHA.verified,
        branch_prefix: "codex/",
        compatibility_contract_version: "release-control-v1"
      },
      {
        role: "CONTROL_WEBSITE",
        repository: "SovereignProtocol/sovereign-protocol-agent",
        local_path: "C:/repo/control",
        origin_url: "https://github.com/SovereignProtocol/sovereign-protocol-agent.git",
        default_branch: "main",
        latest_verified_main_sha: SHA.controlMain,
        branch_prefix: "codex/",
        compatibility_contract_version: "release-control-v1"
      }
    ],
    task: {
      task_packet_id: "P197-RELEASE-CONTROLLER-001",
      commit_sha: SHA.task,
      changed_files: [".entral/governor/lib/release-controller.mjs", ".github/workflows/ci-cd.yml"],
      mandatory_phase_suites: ["pnpm test:phase197", "pnpm test:phase196", "pnpm test:phase195", "pnpm contracts:verify", "pnpm lint", "pnpm test", "pnpm build", "pnpm release:check"]
    },
    risk_profile: {
      data_migration: "NONE",
      customer_data_risk: "NONE",
      rollback_complexity: "SIMPLE",
      public_contract_change: false,
      provider_configuration_change: false,
      identity_or_tenancy_change: false,
      billing_or_economic_change: false
    },
    changed_surfaces: ["FRONTEND", "API", "WORKER"],
    migrations: [{
      order: 0,
      name: "phase-197-no-schema-change",
      kind: "NO_SCHEMA_CHANGE",
      fingerprint_sha256: SHA.migration,
      compatibility: "COMPATIBLE",
      recovery_strategy: "NONE_REQUIRED"
    }],
    health_thresholds: {
      minimum_availability: 0.99,
      maximum_error_rate: 0.01,
      maximum_p95_ms: 2_000,
      maximum_failed_jobs: 0,
      maximum_dead_letter_jobs: 0
    },
    rollback_point: {
      status: "VERIFIED",
      main_sha: SHA.verified,
      release_tag: "phase-196",
      integrity_status: "CERTAIN",
      receipt_sha256: SHA.rollback,
      deployments: [
        { role: "FRONTEND", provider: "VERCEL", deployment_id: "vercel-prior" },
        { role: "API", provider: "RAILWAY", deployment_id: "railway-api-prior", service_id: "api-service" },
        { role: "WORKER", provider: "RAILWAY", deployment_id: "railway-worker-prior", service_id: "worker-service" }
      ]
    },
    created_at: at(0)
  };
  return structuredClone(Object.assign(base, overrides));
}

function evidence(releasePlan, overrides = {}) {
  const selected = selectTargetedTests(releasePlan.task.changed_files);
  const base = {
    contract_version: "1.0.0",
    schema_version: 1,
    evidence_id: "P197-EVIDENCE-001",
    phase: 197,
    plan_sha256: sha256(releasePlan),
    stage: "PRODUCTION",
    repositories: [
      { role: "PRODUCT", origin_main_sha: SHA.productMain, observed_contract_version: "release-control-v1", compatible: true },
      { role: "CONTROL_WEBSITE", origin_main_sha: SHA.controlMain, observed_contract_version: "release-control-v1", compatible: true }
    ],
    task: { commit_sha: SHA.task, coherent_commit: true, worktree_clean: true },
    targeted_tests: selected.map((name) => ({ name, status: "PASSED" })),
    mandatory_suites: releasePlan.task.mandatory_phase_suites.map((name) => ({ name, status: "PASSED" })),
    status_checks: [{ name: "verify", status: "PASSED" }],
    reconciliation: { origin_main_sha: SHA.productMain, reconciled_commit_sha: SHA.task, affected_checks_rerun: true, status: "RECONCILED" },
    staging: { status: "NOT_REQUIRED" },
    migration_verification: {
      status: "NO_SCHEMA_CHANGE",
      ordered: true,
      fingerprints_match: true,
      compatibility_verified: true,
      backup_status: "NOT_REQUIRED",
      entries: releasePlan.migrations.map((migration) => ({ order: migration.order, name: migration.name, fingerprint_sha256: migration.fingerprint_sha256, status: "NO_SCHEMA_CHANGE" }))
    },
    deployments: [
      { role: "FRONTEND", provider: "VERCEL", deployment_id: "vercel-current", live_url: "https://app.example.test", deployed_commit_sha: SHA.productMain, status: "READY" },
      { role: "API", provider: "RAILWAY", deployment_id: "railway-api-current", live_url: "https://api.example.test", deployed_commit_sha: SHA.productMain, status: "READY" },
      { role: "WORKER", provider: "RAILWAY", deployment_id: "railway-worker-current", live_url: "https://worker.example.test/health", deployed_commit_sha: SHA.productMain, status: "READY" }
    ],
    authenticated_smokes: releasePlan.changed_surfaces.map((surface) => ({ surface, live_url: `https://${surface.toLowerCase()}.example.test`, authenticated: true, status: "PASSED", receipt_sha256: sha256(surface) })),
    state_reconciliation: { status: "PASSED", side_effects_reconciled: true, main_sha: SHA.productMain, receipt_sha256: SHA.receipt, blockers: [] },
    health: { availability: 1, error_rate: 0, p95_ms: 100, failed_jobs: 0, dead_letter_jobs: 0, worker_ready: true, receipt_sha256: SHA.receipt },
    rollback_rehearsal: { status: "NOT_REQUIRED" },
    failure_proof: { status: "PASSED", outcome: "REJECTED", phase_advanced: false },
    rollback_point: { status: "VERIFIED", receipt_sha256: SHA.rollback },
    produced_at: at(1)
  };
  return structuredClone(Object.assign(base, overrides));
}

test("Phase 197 contracts accept a complete plan and production evidence", () => {
  const releasePlan = plan();
  const releaseEvidence = evidence(releasePlan);
  assert.equal(validateReleaseControlPlan(releasePlan), releasePlan);
  assert.equal(validateReleaseControlEvidence(releaseEvidence), releaseEvidence);
  assert.throws(() => validateReleaseControlEvidence({ ...releaseEvidence, plan_sha256: "bad" }), /SHA-256/);
});

test("risk classifier selects low, medium, high, and critical ceremonies", () => {
  assert.equal(classifyReleaseRisk(plan()), "LOW");
  assert.equal(classifyReleaseRisk(plan({ risk_profile: { ...plan().risk_profile, provider_configuration_change: true } })), "MEDIUM");
  assert.equal(classifyReleaseRisk(plan({ risk_profile: { ...plan().risk_profile, data_migration: "ADDITIVE" } })), "HIGH");
  assert.equal(classifyReleaseRisk(plan({ risk_profile: { ...plan().risk_profile, data_migration: "DESTRUCTIVE" } })), "CRITICAL");
  assert.equal(classifyReleaseRisk(plan({ migrations: [{ ...plan().migrations[0], kind: "ADDITIVE", recovery_strategy: "ROLLBACK" }] })), "HIGH");
  assert.equal(classifyReleaseRisk(plan({ migrations: [{ ...plan().migrations[0], kind: "DESTRUCTIVE", recovery_strategy: "RESTORE" }] })), "CRITICAL");
  assert.deepEqual(requiredGatesForRisk("LOW").includes("STAGING"), false);
  assert.deepEqual(requiredGatesForRisk("CRITICAL").includes("FAILURE_INJECTION_OR_ROLLBACK_REHEARSAL"), true);
});

test("targeted test selection is deterministic and phase-boundary suites remain separate", () => {
  assert.deepEqual(selectTargetedTests(["frontend/app/page.tsx", "prisma/schema.prisma"]), [
    "pnpm --filter @entral/backend test",
    "pnpm --filter @entral/frontend test",
    "pnpm contracts:verify",
    "pnpm prisma:generate",
    "pnpm test:e2e",
    "pnpm test:phase197"
  ]);
  const releasePlan = plan();
  const selected = selectTargetedTests(releasePlan.task.changed_files);
  assert.ok(selected.includes("pnpm test:phase196"));
  assert.ok(selected.includes("pnpm release:check"));
  assert.ok(releasePlan.task.mandatory_phase_suites.includes("pnpm build"));
});

test("integration cannot proceed without coherent commit, reconciliation, and protected checks", () => {
  const releasePlan = plan();
  const integration = evidence(releasePlan, { stage: "INTEGRATION", deployments: [], authenticated_smokes: [] });
  assert.equal(evaluateRelease(releasePlan, integration).decision, "READY_FOR_MERGE");
  const broken = { ...integration, task: { ...integration.task, coherent_commit: false }, status_checks: [{ name: "verify", status: "FAILED" }] };
  const result = evaluateRelease(releasePlan, broken);
  assert.equal(result.decision, "BLOCKED");
  assert.ok(result.blockers.some((blocker) => blocker.includes("coherent")));
  assert.ok(result.blockers.some((blocker) => blocker.includes("verify")));
});

test("low-risk production release passes exact-SHA, smoke, state, health, and failure-proof gates", () => {
  const releasePlan = plan();
  const result = evaluateRelease(releasePlan, evidence(releasePlan));
  assert.equal(result.risk_tier, "LOW");
  assert.equal(result.decision, "PASS");
  assert.deepEqual(result.blockers, []);
  const notApplicable = evidence(releasePlan, { authenticated_smokes: evidence(releasePlan).authenticated_smokes.map((smoke) => smoke.surface === "API" ? { ...smoke, status: "NOT_APPLICABLE" } : smoke) });
  assert.equal(evaluateRelease(releasePlan, notApplicable).decision, "BLOCKED");
  const wrongReadbackSha = evidence(releasePlan, { state_reconciliation: { ...evidence(releasePlan).state_reconciliation, main_sha: SHA.verified } });
  assert.equal(evaluateRelease(releasePlan, wrongReadbackSha).decision, "BLOCKED");
});

test("medium, high, and critical paths require their additional evidence", () => {
  const mediumPlan = plan({ risk_profile: { ...plan().risk_profile, provider_configuration_change: true } });
  assert.equal(evaluateRelease(mediumPlan, evidence(mediumPlan)).decision, "BLOCKED");
  assert.equal(evaluateRelease(mediumPlan, evidence(mediumPlan, { staging: { status: "PASSED" } })).decision, "PASS");

  const highPlan = plan({ risk_profile: { ...plan().risk_profile, data_migration: "ADDITIVE" } });
  const highEvidence = evidence(highPlan, { staging: { status: "PASSED" }, migration_verification: { ...evidence(highPlan).migration_verification, backup_status: "VERIFIED" } });
  assert.equal(evaluateRelease(highPlan, highEvidence).decision, "PASS");

  const criticalPlan = plan({ risk_profile: { ...plan().risk_profile, data_migration: "DESTRUCTIVE" } });
  const criticalEvidence = evidence(criticalPlan, { staging: { status: "PASSED" }, migration_verification: { ...evidence(criticalPlan).migration_verification, backup_status: "VERIFIED" }, rollback_rehearsal: { status: "PASSED" } });
  assert.equal(evaluateRelease(criticalPlan, criticalEvidence).decision, "PASS");
});

test("failed production smoke selects bounded rollback and never advances the phase", async () => {
  const releasePlan = plan();
  const failed = evidence(releasePlan, {
    authenticated_smokes: evidence(releasePlan).authenticated_smokes.map((smoke) => smoke.surface === "API" ? { ...smoke, status: "FAILED" } : smoke)
  });
  assert.equal(evaluateRelease(releasePlan, failed).decision, "ROLLBACK_REQUIRED");
  const calls = [];
  const result = await executeBoundedRollback(releasePlan, failed, auth, {
    providerClient: { rollback: async (deployment) => { calls.push(deployment.role); return { provider: deployment.provider, role: deployment.role, status: "VERIFIED" }; } },
    now: new Date(at(2))
  });
  assert.equal(result.status, "ROLLED_BACK");
  assert.equal(result.phase_advanced, false);
  assert.deepEqual(calls, ["FRONTEND", "API", "WORKER"]);
  assert.equal(result.incident.status, "CONTAINED_READBACK_REQUIRED");
});

test("uncertain integrity or rollback failure requires an incident and blocks advancement", async () => {
  const uncertainPlan = plan({ rollback_point: { ...plan().rollback_point, integrity_status: "UNCERTAIN" } });
  const failedHealth = evidence(uncertainPlan, { health: { ...evidence(uncertainPlan).health, worker_ready: false } });
  assert.equal(evaluateRelease(uncertainPlan, failedHealth).decision, "INCIDENT_REQUIRED");

  const releasePlan = plan();
  const failedSmoke = evidence(releasePlan, { authenticated_smokes: evidence(releasePlan).authenticated_smokes.map((smoke) => ({ ...smoke, status: smoke.surface === "API" ? "FAILED" : smoke.status })) });
  const result = await executeBoundedRollback(releasePlan, failedSmoke, auth, {
    providerClient: { rollback: async (deployment) => {
      if (deployment.role === "API") throw new GovernorError("PROVIDER_FAILED", "Injected failure");
      return { provider: deployment.provider, role: deployment.role, status: "REQUESTED" };
    } },
    now: new Date(at(3))
  });
  assert.equal(result.status, "INCIDENT_REQUIRED");
  assert.equal(result.phase_advanced, false);
  assert.equal(result.incident.severity, "CRITICAL");

  const unverified = await executeBoundedRollback(releasePlan, failedSmoke, auth, {
    providerClient: { rollback: async (deployment) => ({ provider: deployment.provider, role: deployment.role, status: "REQUESTED" }) },
    now: new Date(at(4))
  });
  assert.equal(unverified.status, "INCIDENT_REQUIRED");
  assert.equal(unverified.phase_advanced, false);
});

test("repository adapters bind explicit roles and reject a mismatched origin", () => {
  const releasePlan = plan();
  const runner = (_command, args, { cwd }) => {
    const command = args.join(" ");
    const product = cwd.endsWith("product");
    if (command === "rev-parse --show-toplevel") return { status: 0, stdout: `${cwd}\n`, stderr: "" };
    if (command === "remote get-url origin") return { status: 0, stdout: `${product ? releasePlan.repositories[0].origin_url : releasePlan.repositories[1].origin_url}\n`, stderr: "" };
    if (command === "rev-parse HEAD") return { status: 0, stdout: `${product ? SHA.task : SHA.controlMain}\n`, stderr: "" };
    if (command === "rev-parse origin/main") return { status: 0, stdout: `${product ? SHA.verified : SHA.controlMain}\n`, stderr: "" };
    if (command === "branch --show-current") return { status: 0, stdout: "main\n", stderr: "" };
    if (command === "status --porcelain=v1") return { status: 0, stdout: "", stderr: "" };
    throw new Error(`Unexpected ${command}`);
  };
  const inspected = inspectRepositories(releasePlan, auth, { runner });
  assert.deepEqual(inspected.map((entry) => entry.role), ["PRODUCT", "CONTROL_WEBSITE"]);
  assert.ok(inspected.every((entry) => entry.worktree_clean));
  const bad = plan();
  bad.repositories[0].origin_url = "https://github.com/example/wrong.git";
  assert.throws(() => inspectRepositories(bad, auth, { runner }), (error) => error.code === "REPOSITORY_ORIGIN_MISMATCH");
  const credentialed = plan();
  credentialed.repositories[0].origin_url = "https://token@github.com/mykai05/ENTRAL-0.2.git";
  assert.throws(() => validateReleaseControlPlan(credentialed), (error) => error.code === "CREDENTIAL_IN_ORIGIN_URL");
});

test("worktree creation fetches and pins exact verified origin/main", async () => {
  const releasePlan = plan();
  const calls = [];
  const runner = (_command, args) => {
    calls.push(args.join(" "));
    if (args.join(" ") === "rev-parse origin/main") return { status: 0, stdout: `${SHA.verified}\n`, stderr: "" };
    return { status: 0, stdout: "", stderr: "" };
  };
  const result = await createIsolatedWorktree(releasePlan, auth, "PRODUCT", { runner, exists: async () => false });
  assert.equal(result.base_sha, SHA.verified);
  assert.equal(result.branch, "codex/phase-197");
  assert.ok(calls.includes("fetch --prune origin main"));
  assert.ok(calls.some((call) => call.startsWith("worktree add -b codex/phase-197")));
});

test("stale repository reconciliation merges current main and mandates affected checks", () => {
  const releasePlan = plan();
  const calls = [];
  const runner = (_command, args) => {
    const command = args.join(" ");
    calls.push(command);
    if (command === "status --porcelain=v1") return { status: 0, stdout: "", stderr: "" };
    if (command === "rev-parse origin/main") return { status: 0, stdout: `${SHA.productMain}\n`, stderr: "" };
    if (command === "merge-base --is-ancestor origin/main HEAD") return { status: 1, stdout: "", stderr: "" };
    if (command === "rev-parse HEAD") return { status: 0, stdout: `${SHA.task}\n`, stderr: "" };
    return { status: 0, stdout: "", stderr: "" };
  };
  const result = reconcileRepository(releasePlan, auth, "PRODUCT", { runner });
  assert.equal(result.status, "RECONCILED");
  assert.equal(result.affected_checks_must_rerun, true);
  assert.ok(calls.includes("merge --no-edit origin/main"));
});

test("protected-main merge reads required checks and binds the exact PR head", () => {
  const releasePlan = plan();
  const integration = evidence(releasePlan, { stage: "INTEGRATION", deployments: [], authenticated_smokes: [] });
  const calls = [];
  const runner = (command, args) => {
    calls.push([command, args]);
    if (args[1] === "checks") return { status: 0, stdout: JSON.stringify([{ name: "verify", state: "SUCCESS", bucket: "pass" }]), stderr: "" };
    if (args[1] === "view") return { status: 0, stdout: JSON.stringify({ headRefOid: SHA.task, state: "OPEN" }), stderr: "" };
    if (args[1] === "merge") return { status: 0, stdout: "", stderr: "" };
    throw new Error(`Unexpected ${command} ${args.join(" ")}`);
  };
  const result = mergeProtectedMain(releasePlan, integration, auth, 38, { runner });
  assert.equal(result.status, "MERGE_REQUESTED");
  assert.ok(calls.some(([, args]) => args.includes("--match-head-commit") && args.includes(SHA.task)));
  const blocked = { ...integration, status_checks: [{ name: "verify", status: "FAILED" }] };
  assert.throws(() => mergeProtectedMain(releasePlan, blocked, auth, 38, { runner }), (error) => error.code === "INTEGRATION_GATES_FAILED");
});

test("hashed evidence bundle covers every release component and survives readback", async () => {
  const releasePlan = plan();
  const releaseEvidence = evidence(releasePlan);
  const root = await mkdtemp(path.join(os.tmpdir(), "entral-p197-bundle-"));
  const bundle = await createReleaseEvidenceBundle(root, releasePlan, releaseEvidence, auth, {
    output: "release-control/phase-197/EVIDENCE_BUNDLE.json",
    now: new Date(at(4))
  });
  validateReleaseEvidenceBundle(bundle);
  assert.equal(bundle.decision, "PASS");
  assert.equal(bundle.components.length, 13);
  const stored = JSON.parse(await readFile(path.join(root, ".entral", "governor", "release-control", "phase-197", "EVIDENCE_BUNDLE.json"), "utf8"));
  assert.deepEqual(stored, bundle);
});

test("Phase 197 ReleaseManifest requires compatible dual repository and controller proof", () => {
  const manifest = {
    contract_version: "1.0.0",
    schema_version: 1,
    phase: 197,
    repository: "mykai05/ENTRAL-0.2",
    main_sha: SHA.productMain,
    release_tag: "phase-197",
    tests_passed: true,
    protected_main_checks_passed: true,
    migrations_verified: true,
    deployments: [
      { provider: "VERCEL", deployment_id: "front", role: "FRONTEND", live_url: "https://app.example.test", status: "READY", deployed_commit_sha: SHA.productMain },
      { provider: "RAILWAY", deployment_id: "api", role: "API", live_url: "https://api.example.test", status: "READY", deployed_commit_sha: SHA.productMain },
      { provider: "RAILWAY", deployment_id: "worker", role: "WORKER", live_url: "https://worker.example.test/health", status: "READY", deployed_commit_sha: SHA.productMain }
    ],
    migrations: [{ name: "phase-197-no-schema-change", status: "NO_SCHEMA_CHANGE", readback: "Production schema is current." }],
    authenticated_smoke: { status: "PASSED", receipt_sha256: SHA.receipt },
    production_readback: { status: "PASSED", main_sha: SHA.productMain, receipt_sha256: SHA.receipt, blockers: [] },
    rollback_point: { status: "RESTORE_VERIFIED", reference: "phase-196" },
    repositories: [
      { role: "PRODUCT", repository: "mykai05/ENTRAL-0.2", main_sha: SHA.productMain, contract_version: "release-control-v1", compatibility_status: "PASSED" },
      { role: "CONTROL_WEBSITE", repository: "SovereignProtocol/sovereign-protocol-agent", main_sha: SHA.controlMain, contract_version: "release-control-v1", compatibility_status: "PASSED" }
    ],
    release_controller: { risk_tier: "LOW", decision: "PASS", plan_sha256: SHA.receipt, evidence_bundle_sha256: SHA.rollback, health_status: "PASSED", failure_proof_status: "PASSED" },
    recorded_at: at(5)
  };
  assert.equal(validateReleaseManifest(manifest), manifest);
  assert.throws(() => validateReleaseManifest({ ...manifest, repositories: manifest.repositories.slice(0, 1) }), (error) => error.code === "INVALID_CONTRACT");
  assert.throws(() => validateReleaseManifest({ ...manifest, release_controller: { ...manifest.release_controller, health_status: "FAILED" } }), (error) => error.code === "INVALID_ENUM");

  const viewportWidths = [360, 390, 412, 430, 1440];
  const viewportObservations = viewportWidths.map((viewportWidth) => ({
    business_count: 0,
    businesses_state: "EMPTY_CANONICAL",
    command_canonical_data_verified: true,
    desktop_side_by_side: viewportWidth >= 1024,
    destination_sync_errors: {
      BUSINESSES: 0,
      COMMAND: 0,
      INFRASTRUCTURE: 0,
      TUTORIAL: 0,
      UNIVERSE_2D: 0,
      UNIVERSE_3D: 0
    },
    edge_count: 8,
    edge_set_sha256: SHA.rollback,
    entity_count: 9,
    entity_set_sha256: SHA.receipt,
    event_sequence: 399,
    mobile_single_renderer: viewportWidth < 1024,
    renderer_parity_verified: true,
    rendered_subset_authorized: true,
    renderer_state_preserved: true,
    selected_entity_authorized: true,
    sync_errors: 0,
    three_d_loaded: true,
    two_d_loaded: true,
    viewport_width: viewportWidth
  }));
  const authenticatedMemberJourney = {
    business_count: 0,
    businesses_state: "EMPTY_CANONICAL",
    canonical_edge_count: 131,
    canonical_edge_set_sha256: SHA.rollback,
    canonical_endpoint_readback: [
      { business_count: 0, endpoint: "PORTFOLIO_SUMMARY", event_sequence: 399, http_status: 200, result: "PASSED" },
      { endpoint: "HIERARCHY", entity_count: 132, event_sequence: 399, http_status: 200, result: "PASSED", root_count: 1 },
      { endpoint: "ENTRAL_CONVERSATION", event_sequence: 399, http_status: 200, message_count: 0, result: "PASSED" },
      { edge_count: 131, endpoint: "GRAPH_PROJECTION", entity_count: 132, http_status: 200, projection_version: 399, result: "PASSED" },
      { actor_bound: true, endpoint: "GRAPH_PREFERENCES", http_status: 200, organization_bound: true, preference_version: 5, result: "PASSED" },
      { endpoint: "EVENTS", event_count: 399, http_status: 200, result: "PASSED" },
      { endpoint: "BUSINESS_FULL_RECORD", http_status: 404, result: "NOT_APPLICABLE_NO_CANONICAL_BUSINESS" },
      { canonical_root_visible: true, endpoint: "ENTITY_FULL_RECORD", http_status: 200, result: "PASSED" }
    ],
    canonical_node_count: 132,
    canonical_node_set_sha256: SHA.receipt,
    canonical_sync_errors: 0,
    command_canonical_data_verified: true,
    deployed_commit_sha: SHA.productMain,
    deployment_readback_exact_sha_verified: true,
    deployment_readback_receipt_sha256: SHA.rollback,
    destinations: ["COMMAND", "BUSINESSES", "UNIVERSE_2D", "UNIVERSE_3D", "INFRASTRUCTURE", "TUTORIAL"],
    environment: "PRODUCTION",
    graph_preference_actor_bound: true,
    graph_preference_organization_bound: true,
    membership_provenance_sha256: SHA.receipt,
    migrated_account_provenance_sha256: sha256([
      "2026-08-01T00:00:00.000Z",
      SHA.receipt,
      "2026-08-02T19:04:46.197Z",
      "2026-08-02T22:45:45.000Z",
      "c689176234bca8a43f6bb5665f6a8a63d8d653dd",
      202,
      "P202-PROD-READBACK-C6891762",
      "67b31f7094d2b5ee1dfc5d4cdaab1646791b2a27e2ee4d3725cda649b0c3e55c",
      SHA.rollback,
      SHA.receipt,
      SHA.receipt
    ]),
    migrated_membership_joined_at: "2026-08-01T00:00:00.000Z",
    migrated_organization_scope_sha256: SHA.receipt,
    migrated_phase_202_cutover_at: "2026-08-02T19:04:46.197Z",
    migrated_source_checked_at: "2026-08-02T22:45:45.000Z",
    migrated_source_main_sha: "c689176234bca8a43f6bb5665f6a8a63d8d653dd",
    migrated_source_phase: 202,
    migrated_state_receipt_id: "P202-PROD-READBACK-C6891762",
    migrated_state_receipt_sha256: "67b31f7094d2b5ee1dfc5d4cdaab1646791b2a27e2ee4d3725cda649b0c3e55c",
    migrated_subject_sha256: SHA.rollback,
    migrated_team_scope_sha256: SHA.receipt,
    migrated_tenant_scope_sha256: SHA.receipt,
    observed_at: "2026-08-03T00:00:05.000Z",
    organization_scope_sha256: SHA.receipt,
    pre_phase_202_provenance_verified: true,
    projection_organization_bound: true,
    receipt_id: "P203-PRODUCTION-MEMBER-JOURNEY-001",
    receipt_sha256: SHA.receipt,
    renderer_state_preserved: true,
    route_interception: false,
    session_scope: "MIGRATED_MEMBER",
    session_subject_sha256: SHA.rollback,
    status: "PASSED",
    team_scope_sha256: SHA.receipt,
    tenant_scope_sha256: SHA.receipt,
    viewport_observations: viewportObservations,
    viewport_widths: viewportWidths
  };
  const phase203Manifest = {
    ...manifest,
    authenticated_member_journey: authenticatedMemberJourney,
    phase: 203,
    production_readback: { ...manifest.production_readback, deployment_readback_sha256: SHA.rollback },
    release_tag: "phase-203"
  };
  assert.equal(validateReleaseManifest(phase203Manifest), phase203Manifest);
  assert.throws(() => validateReleaseManifest({
    ...phase203Manifest,
    authenticated_member_journey: undefined
  }), (error) => error.code === "INVALID_CONTRACT");
  assert.throws(() => validateReleaseManifest({
    ...phase203Manifest,
    authenticated_member_journey: { ...authenticatedMemberJourney, route_interception: true }
  }), (error) => error.code === "INTERCEPTED_PRODUCTION_JOURNEY");
  assert.throws(() => validateReleaseManifest({
    ...phase203Manifest,
    authenticated_member_journey: { ...authenticatedMemberJourney, canonical_node_count: 0 }
  }), (error) => error.code === "INVALID_CONTRACT");
  assert.throws(() => validateReleaseManifest({
    ...phase203Manifest,
    authenticated_member_journey: { ...authenticatedMemberJourney, deployed_commit_sha: SHA.task }
  }), (error) => error.code === "MEMBER_JOURNEY_SHA_MISMATCH");
  assert.throws(() => validateReleaseManifest({
    ...phase203Manifest,
    authenticated_member_journey: { ...authenticatedMemberJourney, canonical_edge_set_sha256: undefined }
  }), (error) => error.code === "INVALID_SHA256");
  assert.throws(() => validateReleaseManifest({
    ...phase203Manifest,
    authenticated_member_journey: {
      ...authenticatedMemberJourney,
      viewport_observations: viewportObservations.slice(0, -1)
    }
  }), (error) => error.code === "INVALID_CONTRACT");
  assert.throws(() => validateReleaseManifest({
    ...phase203Manifest,
    authenticated_member_journey: {
      ...authenticatedMemberJourney,
      viewport_observations: viewportObservations.map((observation) => observation.viewport_width === 1440
        ? { ...observation, three_d_loaded: false }
        : observation)
    }
  }), (error) => error.code === "FAILED_MEMBER_RENDERER_OBSERVATION");
});

test("release mutations fail closed for unauthorized models", async () => {
  const releasePlan = plan();
  const releaseEvidence = evidence(releasePlan);
  const unauthorized = { actor: "OTHER_MODEL", sessionId: "other" };
  assert.throws(() => inspectRepositories(releasePlan, unauthorized, { runner: () => ({ status: 0, stdout: "", stderr: "" }) }), (error) => error.code === "UNAUTHORIZED_EXECUTION_MODEL");
  await assert.rejects(() => executeBoundedRollback(releasePlan, releaseEvidence, unauthorized), (error) => error.code === "UNAUTHORIZED_EXECUTION_MODEL");
});
