import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  EXECUTION_MODEL,
  GovernorError,
  validateNamedContract,
  validateReviewRequest,
  validateTaskPacket
} from "../lib/contracts.mjs";
import {
  activatePhase,
  blockProgram,
  checkpointSession,
  claimTask,
  compileContext,
  createReviewPacket,
  createTask,
  eventLogSummary,
  getStatus,
  heartbeatTask,
  ingestReviewVerdict,
  initializeGovernor,
  nextAction,
  recordResult,
  resumeGovernor,
  certifyPhase,
  unblockProgram,
  usageCheckpointRequired,
  verifyGovernor
} from "../lib/governor.mjs";
import { governorPath, loadState, readEvents, sha256 } from "../lib/store.mjs";
import { migrate } from "../migrations/001_initialize_v1.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, "../../..");
const H = "11058bffef238c1c7f917b2ea5bb3ff93800d35e";
const authA = { actor: EXECUTION_MODEL, sessionId: "codex-session-a" };
const authB = { actor: EXECUTION_MODEL, sessionId: "codex-session-b" };
const at = (minute, millisecond = 0) => new Date(Date.UTC(2026, 7, 1, 12, minute, 0, millisecond));

async function readSourceJson(relative) {
  return JSON.parse(await readFile(path.join(repositoryRoot, relative), "utf8"));
}

async function makeRepository() {
  const root = await mkdtemp(path.join(os.tmpdir(), "entral-governor-"));
  await mkdir(path.join(root, ".git"), { recursive: true });
  await writeFile(path.join(root, "package.json"), `${JSON.stringify({ name: "governor-test", private: true }, null, 2)}\n`);
  await cp(path.join(repositoryRoot, ".entral/governor/program"), path.join(root, ".entral/governor/program"), { recursive: true });
  await cp(path.join(repositoryRoot, ".entral/governor/phases"), path.join(root, ".entral/governor/phases"), { recursive: true });
  await cp(path.join(repositoryRoot, ".entral/governor/releases"), path.join(root, ".entral/governor/releases"), { recursive: true });
  return root;
}

function taskPacket({ phase = 196, id = `P${phase}-TEST-PACKET`, createdAt = at(2).toISOString() } = {}) {
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    task_packet_id: id,
    phase,
    objective: `Implement the bounded deterministic Phase ${phase} test packet.`,
    scope: [".entral/governor/**"],
    likely_modules: [".entral/governor/lib/governor.mjs"],
    preserved_behavior: ["Previously certified production behavior"],
    exclusions: ["No future phase implementation"],
    acceptance_tests: ["node --test"],
    release_requirements: ["Exact main SHA production readback"],
    usage_budget: {
      maximum_wall_time_minutes: 120,
      maximum_attempts: 4,
      maximum_retries: 3,
      stagnation_limit: 2,
      checkpoint_at_tokens_remaining: 1_000,
      release_repair_reserve_tokens: 500
    },
    owner_escalation_conditions: [
      "CREDENTIAL_OR_MFA",
      "DENIED_EXTERNAL_ACCESS",
      "MATERIAL_SPENDING",
      "IRREVERSIBLE_EXTERNAL_ACT",
      "PRICING_LEGAL_OR_DATA_RIGHTS",
      "PRODUCT_DEFINING_AMBIGUITY",
      "PROTOCOL_REQUIRED_REVIEW"
    ],
    policy: {
      future_phase_compatibility_required: false,
      work_created_to_stay_active: false,
      speculative_refactors: [],
      duplicate_systems: []
    },
    relevant_adrs: [],
    relevant_source_paths: ["package.json"],
    created_at: createdAt
  };
}

function executionResult({ phase = 196, taskId = `P${phase}-TEST-PACKET`, id = `result-${phase}`, outcome = "PASSED", fingerprint = "pass" } = {}) {
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    execution_result_id: id,
    task_packet_id: taskId,
    phase,
    outcome,
    commit_sha: outcome === "PASSED" ? H : null,
    changed_files: [".entral/governor/lib/governor.mjs"],
    tests: [{ command: "node --test", status: outcome === "PASSED" ? "PASSED" : "FAILED", ...(outcome === "PASSED" ? {} : { reason: "deterministic failure" }) }],
    unresolved_failures: outcome === "PASSED" ? [] : ["deterministic failure"],
    deployment_state: { status: "NOT_ATTEMPTED" },
    result_fingerprint: sha256(fingerprint),
    completed_at: at(5).toISOString()
  };
}

function releaseManifest(phase = 196, overrides = {}) {
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    phase,
    repository: "mykai05/ENTRAL-0.2",
    main_sha: H,
    release_tag: `phase-${phase}`,
    tests_passed: true,
    protected_main_checks_passed: true,
    migrations_verified: true,
    deployments: [
      { provider: "VERCEL", deployment_id: `frontend-${phase}`, role: "FRONTEND", status: "READY", deployed_commit_sha: H },
      { provider: "RAILWAY", deployment_id: `api-${phase}`, role: "API", status: "READY", deployed_commit_sha: H },
      { provider: "RAILWAY", deployment_id: `worker-${phase}`, role: "WORKER", status: "READY", deployed_commit_sha: H }
    ],
    migrations: [{ name: `phase-${phase}-repository-state`, status: "NO_SCHEMA_CHANGE", readback: "Production schema is current." }],
    authenticated_smoke: { status: "PASSED", receipt_sha256: "1".repeat(64) },
    production_readback: { status: "PASSED", main_sha: H, receipt_sha256: "2".repeat(64), blockers: [] },
    rollback_point: { status: "AVAILABLE", reference: `phase-${phase - 1}` },
    recorded_at: at(20).toISOString(),
    ...overrides
  };
}

function authenticatedMemberJourney() {
  const destinationSyncErrors = {
    BUSINESSES: 0,
    COMMAND: 0,
    INFRASTRUCTURE: 0,
    TUTORIAL: 0,
    UNIVERSE_2D: 0,
    UNIVERSE_3D: 0
  };
  const viewportWidths = [360, 390, 412, 430, 1440];
  return {
    business_count: 0,
    businesses_state: "EMPTY_CANONICAL",
    canonical_edge_count: 2,
    canonical_edge_set_sha256: "3".repeat(64),
    canonical_endpoint_readback: [
      { business_count: 0, endpoint: "PORTFOLIO_SUMMARY", event_sequence: 399, http_status: 200, result: "PASSED" },
      { endpoint: "HIERARCHY", entity_count: 3, event_sequence: 399, http_status: 200, result: "PASSED", root_count: 1 },
      { endpoint: "ENTRAL_CONVERSATION", event_sequence: 399, http_status: 200, message_count: 0, result: "PASSED" },
      { edge_count: 2, endpoint: "GRAPH_PROJECTION", entity_count: 3, http_status: 200, projection_version: 399, result: "PASSED" },
      { actor_bound: true, endpoint: "GRAPH_PREFERENCES", http_status: 200, organization_bound: true, preference_version: 5, result: "PASSED" },
      { endpoint: "EVENTS", event_count: 399, http_status: 200, result: "PASSED" },
      { endpoint: "BUSINESS_FULL_RECORD", http_status: 404, result: "NOT_APPLICABLE_NO_CANONICAL_BUSINESS" },
      { canonical_root_visible: true, endpoint: "ENTITY_FULL_RECORD", http_status: 200, result: "PASSED" }
    ],
    canonical_node_count: 3,
    canonical_node_set_sha256: "4".repeat(64),
    canonical_sync_errors: 0,
    command_canonical_data_verified: true,
    deployed_commit_sha: H,
    deployment_readback_exact_sha_verified: true,
    deployment_readback_receipt_sha256: "5".repeat(64),
    destinations: ["COMMAND", "BUSINESSES", "UNIVERSE_2D", "UNIVERSE_3D", "INFRASTRUCTURE", "TUTORIAL"],
    environment: "PRODUCTION",
    graph_preference_actor_bound: true,
    graph_preference_organization_bound: true,
    membership_provenance_sha256: "6".repeat(64),
    migrated_account_provenance_sha256: sha256([
      "2026-08-01T12:00:00.000Z",
      "8".repeat(64),
      "2026-08-02T19:04:46.197Z",
      "2026-08-02T22:45:45.000Z",
      "c689176234bca8a43f6bb5665f6a8a63d8d653dd",
      202,
      "P202-PROD-READBACK-C6891762",
      "67b31f7094d2b5ee1dfc5d4cdaab1646791b2a27e2ee4d3725cda649b0c3e55c",
      "a".repeat(64),
      "b".repeat(64),
      "c".repeat(64)
    ]),
    migrated_membership_joined_at: "2026-08-01T12:00:00.000Z",
    migrated_organization_scope_sha256: "8".repeat(64),
    migrated_phase_202_cutover_at: "2026-08-02T19:04:46.197Z",
    migrated_source_checked_at: "2026-08-02T22:45:45.000Z",
    migrated_source_main_sha: "c689176234bca8a43f6bb5665f6a8a63d8d653dd",
    migrated_source_phase: 202,
    migrated_state_receipt_id: "P202-PROD-READBACK-C6891762",
    migrated_state_receipt_sha256: "67b31f7094d2b5ee1dfc5d4cdaab1646791b2a27e2ee4d3725cda649b0c3e55c",
    migrated_subject_sha256: "a".repeat(64),
    migrated_team_scope_sha256: "b".repeat(64),
    migrated_tenant_scope_sha256: "c".repeat(64),
    observed_at: "2026-08-03T00:20:00.000Z",
    organization_scope_sha256: "8".repeat(64),
    pre_phase_202_provenance_verified: true,
    projection_organization_bound: true,
    receipt_id: "P203-PRODUCTION-MEMBER-JOURNEY-001",
    receipt_sha256: "d".repeat(64),
    renderer_state_preserved: true,
    route_interception: false,
    session_scope: "MIGRATED_MEMBER",
    session_subject_sha256: "a".repeat(64),
    status: "PASSED",
    team_scope_sha256: "b".repeat(64),
    tenant_scope_sha256: "c".repeat(64),
    viewport_observations: viewportWidths.map((viewportWidth) => ({
      business_count: 0,
      businesses_state: "EMPTY_CANONICAL",
      command_canonical_data_verified: true,
      desktop_side_by_side: viewportWidth >= 1024,
      destination_sync_errors: { ...destinationSyncErrors },
      edge_count: 2,
      edge_set_sha256: "3".repeat(64),
      entity_count: 3,
      entity_set_sha256: "4".repeat(64),
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
    })),
    viewport_widths: viewportWidths
  };
}

function phase203ReleaseManifest() {
  const manifest = releaseManifest(203);
  return {
    ...manifest,
    authenticated_member_journey: authenticatedMemberJourney(),
    deployments: manifest.deployments.map((deployment) => ({
      ...deployment,
      live_url: deployment.role === "FRONTEND"
        ? "https://entral-0-2-frontend.vercel.app"
        : "https://entral-backend-production.up.railway.app/health"
    })),
    production_readback: {
      ...manifest.production_readback,
      deployment_readback_sha256: "5".repeat(64)
    },
    release_controller: {
      decision: "PASS",
      evidence_bundle_sha256: "e".repeat(64),
      failure_proof_status: "PASSED",
      health_status: "PASSED",
      plan_sha256: "f".repeat(64),
      risk_tier: "HIGH"
    },
    repositories: [
      { compatibility_status: "PASSED", contract_version: "release-control-v1", main_sha: H, repository: "mykai05/ENTRAL-0.2", role: "PRODUCT" },
      { compatibility_status: "PASSED", contract_version: "release-control-v1", main_sha: "a".repeat(40), repository: "SovereignProtocol/sovereign-protocol-agent", role: "CONTROL_WEBSITE" }
    ]
  };
}

async function setup({ phase = 196, certifiedPhases = [195] } = {}) {
  const root = await makeRepository();
  const program = await readSourceJson(".entral/governor/program/PHASE_DAG.v1.json");
  const release = await readSourceJson(".entral/governor/releases/phase-195.json");
  await initializeGovernor(root, authA, {
    program,
    latestVerifiedMainSha: H,
    latestProductionRelease: release,
    certifiedPhases,
    now: at(0)
  });
  await activatePhase(root, authA, phase, { now: at(1) });
  return { root, program };
}

test("versioned schema and migration enumerate every required Governor contract", async () => {
  const schema = await readSourceJson(".entral/governor/schemas/v1/governor.schema.json");
  for (const name of [
    "ProgramState", "TaskPacket", "ExecutionResult", "ReviewRecord", "ReleaseManifest",
    "IncidentRecord", "OwnerEscalation", "ImprovementCandidate", "PhaseAmendment",
    "SessionCheckpoint", "GovernorEvent", "GPTProReviewRequest", "ProReviewVerdict"
  ]) assert.ok(schema.$defs[name], `${name} schema must exist`);
  const initialized = migrate(null, { now: at(0) });
  assert.equal(initialized.schema_version, 1);
  assert.equal(initialized.execution_model, EXECUTION_MODEL);
});

test("initialization, phase DAG, status, next, and bounded context are deterministic", async (t) => {
  const { root } = await setup();
  t.after(() => rm(root, { recursive: true, force: true }));
  const packet = taskPacket();
  await createTask(root, authA, packet, { now: at(2) });
  const status = await getStatus(root, authA, { tokensRemaining: 1_400 });
  assert.equal(status.state.current_phase, 196);
  assert.equal(status.state.current_task_packet_id, packet.task_packet_id);
  assert.equal(status.usage_boundary.required, true);
  assert.match(status.human_report, /Next action:/);
  assert.equal((await nextAction(root, authA)).action, "CLAIM_TASK");
  const context = await compileContext(root, authA);
  assert.equal(context.task_packet.task_packet_id, packet.task_packet_id);
  assert.equal(context.phase_contract.phase, 196);
  assert.deepEqual(context.selected_source_context.map((entry) => entry.path), ["package.json"]);
  assert.deepEqual(context.excluded_context, ["future phase packages", "consumer chat transcripts", "hidden model memory", "unrelated repository paths"]);
  for (const event of await readEvents(root)) {
    assert.equal(event.tenant_id, null);
    assert.equal(event.organization_id, null);
    assert.equal(event.business_id, null);
    assert.equal(event.resulting_version, event.prior_version + 1);
    assert.equal(event.sequence, event.resulting_version);
    assert.match(event.request_idempotency_key, /^[a-f0-9]{64}$/);
    assert.match(event.transition_evidence_sha256, /^[a-f0-9]{64}$/);
    assert.equal(event.release_version, H);
  }
  await assert.rejects(() => activatePhase(root, authA, 197, { now: at(3) }), (error) => error.code === "ACTIVE_PHASE_EXISTS");
});

test("dual writers contend on an exact lease and process loss resumes without duplicate task", async (t) => {
  const { root } = await setup();
  t.after(() => rm(root, { recursive: true, force: true }));
  const packet = taskPacket();
  await createTask(root, authA, packet, { now: at(2) });
  const first = await claimTask(root, authA, { taskId: packet.task_packet_id, owner: authA.sessionId, leaseSeconds: 60, now: at(3) });
  await assert.rejects(
    () => claimTask(root, authB, { taskId: packet.task_packet_id, owner: authB.sessionId, leaseSeconds: 60, now: at(3, 500) }),
    (error) => error.code === "WRITE_LEASE_HELD" && error.details.owner === authA.sessionId && error.details.expires_at === first.result.expires_at
  );
  const resumed = await resumeGovernor(root, authB, { now: at(4, 1) });
  assert.equal(resumed.expired_lease.owner, authA.sessionId);
  assert.equal(resumed.state.current_task_packet_id, packet.task_packet_id);
  assert.equal(resumed.state.task_status, "READY");
  const second = await claimTask(root, authB, { taskId: packet.task_packet_id, owner: authB.sessionId, leaseSeconds: 60, now: at(5) });
  assert.equal(second.result.owner, authB.sessionId);
  const events = await eventLogSummary(root, authA);
  assert.equal(events.event_types.filter((type) => type === "TASK_CREATED").length, 1);
});

test("session checkpoint records the exact continuation and survives restart", async (t) => {
  const { root } = await setup();
  t.after(() => rm(root, { recursive: true, force: true }));
  const packet = taskPacket();
  await createTask(root, authA, packet, { now: at(2) });
  await claimTask(root, authA, { taskId: packet.task_packet_id, owner: authA.sessionId, leaseSeconds: 600, now: at(3) });
  const checkpoint = {
    contract_version: "1.0.0",
    schema_version: 1,
    checkpoint_id: "checkpoint-phase196-one",
    phase: 196,
    task_packet_id: packet.task_packet_id,
    branch: "codex/phase-196-lean-development-governor",
    worktree: "C:/work/phase196",
    commit_sha: H,
    changed_files: [".entral/governor/lib/governor.mjs"],
    tests: [{ command: "node --check", status: "PASSED" }],
    unresolved_failures: [],
    deployment_state: { status: "NOT_STARTED" },
    blockers: [],
    rollback_point: { release_tag: "phase-195", main_sha: H },
    next_action: "Continue the same TaskPacket at its recovery tests.",
    created_at: at(4).toISOString()
  };
  await checkpointSession(root, authA, checkpoint, { now: at(4) });
  const resumed = await resumeGovernor(root, authA, { now: at(5) });
  assert.equal(resumed.state.latest_checkpoint.checkpoint_id, checkpoint.checkpoint_id);
  assert.equal(resumed.next_action, checkpoint.next_action);
});

test("event tampering is detected before state can advance", async (t) => {
  const { root } = await setup();
  t.after(() => rm(root, { recursive: true, force: true }));
  const eventsPath = governorPath(root, "events/EVENTS.jsonl");
  const raw = await readFile(eventsPath, "utf8");
  await writeFile(eventsPath, raw.replace("Activate Phase 196.", "Activate Phase 999."));
  await assert.rejects(() => verifyGovernor(root, authA), (error) => ["EVENT_PAYLOAD_TAMPERED", "EVENT_HASH_TAMPERED"].includes(error.code));
});

test("unsupported actor and overengineering policy fail closed", async (t) => {
  const { root } = await setup();
  t.after(() => rm(root, { recursive: true, force: true }));
  await assert.rejects(() => activatePhase(root, { actor: "SECOND_MODEL", sessionId: "other" }, 197), (error) => error.code === "UNAUTHORIZED_EXECUTION_MODEL");
  await assert.rejects(() => getStatus(root, { actor: "SECOND_MODEL" }), (error) => error.code === "UNAUTHORIZED_EXECUTION_MODEL");
  const speculative = taskPacket();
  speculative.policy.future_phase_compatibility_required = true;
  assert.throws(() => validateTaskPacket(speculative), (error) => error.code === "OVERENGINEERING_POLICY_VIOLATION");
});

test("retries, attempts, wall time, and stagnation produce a deterministic stop", async (t) => {
  const { root } = await setup();
  t.after(() => rm(root, { recursive: true, force: true }));
  const packet = taskPacket();
  await createTask(root, authA, packet, { now: at(2) });
  await claimTask(root, authA, { taskId: packet.task_packet_id, owner: authA.sessionId, now: at(3) });
  const first = await recordResult(root, authA, executionResult({ outcome: "FAILED", id: "failure-one", fingerprint: "same-failure" }), { now: at(4) });
  assert.equal(first.state.status, "ACTIVE");
  assert.equal(first.state.task_status, "READY");
  await claimTask(root, authA, { taskId: packet.task_packet_id, owner: authA.sessionId, now: at(5) });
  const second = await recordResult(root, authA, executionResult({ outcome: "FAILED", id: "failure-two", fingerprint: "same-failure" }), { now: at(6) });
  assert.equal(second.state.status, "STOPPED");
  assert.match(second.state.next_action, /Deterministic stop/);
});

test("maximum wall time prevents a late claim and enters the deterministic stop state", async (t) => {
  const { root } = await setup();
  t.after(() => rm(root, { recursive: true, force: true }));
  const packet = taskPacket();
  packet.usage_budget.maximum_wall_time_minutes = 1;
  await createTask(root, authA, packet, { now: at(2) });
  const stopped = await claimTask(root, authA, { taskId: packet.task_packet_id, owner: authA.sessionId, now: at(4) });
  assert.equal(stopped.event.event_type, "TASK_STOPPED");
  assert.equal(stopped.state.status, "STOPPED");
  assert.equal(stopped.state.active_write_lease, null);
});

test("heartbeat cannot revive expired ownership or extend a task past its wall-time deadline", async (t) => {
  const { root } = await setup();
  t.after(() => rm(root, { recursive: true, force: true }));
  const packet = taskPacket();
  packet.usage_budget.maximum_wall_time_minutes = 2;
  await createTask(root, authA, packet, { now: at(2) });
  const claimed = await claimTask(root, authA, { taskId: packet.task_packet_id, owner: authA.sessionId, leaseSeconds: 60, now: at(2, 1) });
  const heartbeat = await heartbeatTask(root, authA, { leaseId: claimed.result.lease_id, leaseSeconds: 14_400, now: at(2, 30) });
  assert.equal(heartbeat.result.expires_at, at(4).toISOString());
  await assert.rejects(
    () => heartbeatTask(root, authA, { leaseId: claimed.result.lease_id, leaseSeconds: 60, now: at(4, 1) }),
    (error) => error.code === "LEASE_EXPIRED"
  );
});

test("heartbeat refreshes an owned lease from the current amended TaskPacket scope", async (t) => {
  const { root } = await setup();
  t.after(() => rm(root, { recursive: true, force: true }));
  const packet = taskPacket();
  await createTask(root, authA, packet, { now: at(2) });
  const claimed = await claimTask(root, authA, {
    taskId: packet.task_packet_id,
    owner: authA.sessionId,
    leaseSeconds: 120,
    now: at(2, 1)
  });
  const amendedScope = [...packet.scope, "backend/src/newly-bounded.ts"];
  await writeFile(
    governorPath(root, `tasks/${packet.task_packet_id}.json`),
    `${JSON.stringify({ ...packet, scope: amendedScope }, null, 2)}\n`
  );

  const heartbeat = await heartbeatTask(root, authA, {
    leaseId: claimed.result.lease_id,
    leaseSeconds: 120,
    now: at(2, 30)
  });

  assert.deepEqual(heartbeat.result.scope, amendedScope);
  assert.equal(heartbeat.event.payload.scope_refreshed, true);
});

test("routine phase certifies without review only after exact production gates", async (t) => {
  const { root } = await setup();
  t.after(() => rm(root, { recursive: true, force: true }));
  const packet = taskPacket();
  await createTask(root, authA, packet, { now: at(2) });
  await claimTask(root, authA, { taskId: packet.task_packet_id, owner: authA.sessionId, now: at(3) });
  await recordResult(root, authA, executionResult(), { now: at(4) });
  const certified = await certifyPhase(root, authA, releaseManifest(196), { now: at(20) });
  assert.equal(certified.result.certified, true);
  assert.equal(certified.result.next_phase, 197);
  assert.equal(certified.state.status, "ACTIVE");
  assert.equal((await nextAction(root, authA)).action, "ACTIVATE_PHASE");
  const events = await eventLogSummary(root, authA);
  assert.ok(events.event_types.includes("RELEASE_RECORDED"));
  assert.ok(events.event_types.includes("PHASE_CERTIFIED"));
});

test("release certification rejects duplicate roles, drifted SHAs, and remaining blockers", () => {
  const duplicate = releaseManifest();
  duplicate.deployments[2] = { ...duplicate.deployments[1], deployment_id: "worker-as-api" };
  assert.throws(() => validateNamedContract("ReleaseManifest", duplicate), (error) => error.code === "INCOMPLETE_DEPLOYMENT_SET");
  const drift = releaseManifest();
  drift.deployments[0].deployed_commit_sha = "c".repeat(40);
  assert.throws(() => validateNamedContract("ReleaseManifest", drift), (error) => error.code === "DEPLOYMENT_SHA_MISMATCH");
  const blocked = releaseManifest();
  blocked.production_readback.blockers = ["migration readback missing"];
  assert.throws(() => validateNamedContract("ReleaseManifest", blocked), (error) => error.code === "PRODUCTION_BLOCKERS_REMAIN");
});

test("Phase 203 release certification rejects unbound production member journey evidence", () => {
  const valid = phase203ReleaseManifest();
  assert.doesNotThrow(() => validateNamedContract("ReleaseManifest", valid));

  const migratedSubjectMismatch = structuredClone(valid);
  migratedSubjectMismatch.authenticated_member_journey.migrated_subject_sha256 = "e".repeat(64);
  assert.throws(
    () => validateNamedContract("ReleaseManifest", migratedSubjectMismatch),
    (error) => error.code === "UNBOUND_MIGRATED_MEMBER_PROVENANCE"
  );

  const postCutoverMembership = structuredClone(valid);
  postCutoverMembership.authenticated_member_journey.migrated_membership_joined_at = "2026-08-02T20:00:00.000Z";
  assert.throws(
    () => validateNamedContract("ReleaseManifest", postCutoverMembership),
    (error) => error.code === "UNBOUND_MIGRATED_MEMBER_PROVENANCE"
  );

  const deploymentMismatch = structuredClone(valid);
  deploymentMismatch.authenticated_member_journey.deployment_readback_receipt_sha256 = "f".repeat(64);
  assert.throws(
    () => validateNamedContract("ReleaseManifest", deploymentMismatch),
    (error) => error.code === "UNBOUND_MEMBER_JOURNEY_DEPLOYMENT"
  );

  const missingEndpoint = structuredClone(valid);
  missingEndpoint.authenticated_member_journey.canonical_endpoint_readback.pop();
  assert.throws(
    () => validateNamedContract("ReleaseManifest", missingEndpoint),
    (error) => error.code === "INVALID_CONTRACT"
  );

  const wrongPreferenceOwner = structuredClone(valid);
  wrongPreferenceOwner.authenticated_member_journey.canonical_endpoint_readback
    .find((entry) => entry.endpoint === "GRAPH_PREFERENCES").actor_bound = false;
  assert.throws(
    () => validateNamedContract("ReleaseManifest", wrongPreferenceOwner),
    (error) => error.code === "MISMATCHED_CANONICAL_ENDPOINT_READBACK"
  );

  const unauthorizedRenderer = structuredClone(valid);
  unauthorizedRenderer.authenticated_member_journey.viewport_observations[0].rendered_subset_authorized = false;
  assert.throws(
    () => validateNamedContract("ReleaseManifest", unauthorizedRenderer),
    (error) => error.code === "FAILED_MEMBER_RENDERER_OBSERVATION"
  );

  const commandWithoutData = structuredClone(valid);
  commandWithoutData.authenticated_member_journey.viewport_observations[0].command_canonical_data_verified = false;
  assert.throws(
    () => validateNamedContract("ReleaseManifest", commandWithoutData),
    (error) => error.code === "FAILED_MEMBER_RENDERER_OBSERVATION"
  );

  const tutorialSyncFailure = structuredClone(valid);
  tutorialSyncFailure.authenticated_member_journey.viewport_observations[0].destination_sync_errors.TUTORIAL = 1;
  assert.throws(
    () => validateNamedContract("ReleaseManifest", tutorialSyncFailure),
    (error) => error.code === "INVALID_CONTRACT"
  );
});

test("mandatory review enters durable waiting and a PASS verdict cannot override a failed gate", async (t) => {
  const { root, program } = await setup({ phase: 199, certifiedPhases: [195, 196, 197, 198] });
  t.after(() => rm(root, { recursive: true, force: true }));
  const packet = taskPacket({ phase: 199, id: "P199-BASELINE-REVIEW" });
  await createTask(root, authA, packet, { now: at(2) });
  await claimTask(root, authA, { taskId: packet.task_packet_id, owner: authA.sessionId, now: at(3) });
  await recordResult(root, authA, executionResult({ phase: 199, taskId: packet.task_packet_id, id: "result-199" }), { now: at(4) });
  const request = {
    contract_version: "1.0.0",
    schema_version: 1,
    checkpoint_id: "P199-release",
    reason: "MANDATORY_PHASE_CHECKPOINT",
    phase: 199,
    task_packet_id: packet.task_packet_id,
    repository: "mykai05/ENTRAL-0.2",
    source_commit_sha: H,
    production_deployments: [{ provider: "RAILWAY", deployment_id: "api-199", status: "READY" }],
    migrations: [{ name: "phase199", status: "VERIFIED" }],
    changed_files: [".entral/governor/PROGRAM_STATE.json"],
    diffs: [{ path: ".entral/governor/PROGRAM_STATE.json", base_commit_sha: "a".repeat(40), head_commit_sha: H, diff_reference: `git diff ${"a".repeat(40)} ${H} -- .entral/governor/PROGRAM_STATE.json`, content_sha256: "2".repeat(64) }],
    acceptance_gates: [{ id: "P199-A", status: "PASSED" }],
    test_results: [{ command: "pnpm test", status: "PASSED" }],
    unresolved_questions: [],
    alternatives: [{ name: "certified baseline", disposition: "RECOMMENDED" }],
    recommendation: "Accept the evidence-backed certified baseline.",
    risks: [{ option: "proceed", risk: "bounded" }],
    requested_decision: "Review the Phase 199 production baseline.",
    evidence: [{ reference: "ci:199", sha256: "3".repeat(64) }],
    created_at: at(5).toISOString()
  };
  validateReviewRequest(request, program);
  const waiting = await createReviewPacket(root, authA, request, { now: at(5) });
  assert.equal(waiting.state.status, "WAITING_FOR_GPT_PRO_REVIEW");
  assert.equal((await nextAction(root, authA)).action, "WAIT_FOR_GPT_PRO_REVIEW");
  const verdict = {
    contract_version: "1.0.0",
    schema_version: 1,
    checkpoint_id: request.checkpoint_id,
    phase: 199,
    reviewed_commit_sha: H,
    verdict_commit_sha: "b".repeat(40),
    verdict: "PASS",
    binding_corrections: [],
    rationale: "The committed evidence supports the requested product and architecture conclusion.",
    evidence_reviewed: ["ci:199"],
    owner_attested: true,
    reviewed_at: at(6).toISOString()
  };
  await ingestReviewVerdict(root, authA, verdict, { now: at(6) });
  await assert.rejects(
    () => certifyPhase(root, authA, releaseManifest(199, { tests_passed: false }), { now: at(20) }),
    (error) => error.code === "FAILED_RELEASE_GATE"
  );
  const packetDirectory = governorPath(root, "pro-review/P199-release");
  for (const file of ["PRO_REVIEW_REQUEST.json", "PRO_REVIEW_BRIEF.md", "EVIDENCE_INDEX.json", "PRO_REVIEW_VERDICT.md"]) {
    assert.ok((await readFile(path.join(packetDirectory, file), "utf8")).length > 0);
  }
});

test("review packets reject secrets and non-triggered routine review delays", async () => {
  const program = await readSourceJson(".entral/governor/program/PHASE_DAG.v1.json");
  const request = {
    contract_version: "1.0.0", schema_version: 1, checkpoint_id: "routine-review", reason: "ROUTINE",
    phase: 196, task_packet_id: "P196-TEST-PACKET", repository: "repo", source_commit_sha: H,
    production_deployments: [], migrations: [], changed_files: [".entral/governor/PROGRAM_STATE.json"], acceptance_gates: [], test_results: [],
    diffs: [{ path: ".entral/governor/PROGRAM_STATE.json", base_commit_sha: "a".repeat(40), head_commit_sha: H, diff_reference: "git diff baseline", content_sha256: "2".repeat(64) }],
    unresolved_questions: [], alternatives: [], recommendation: "Do not wait.", risks: [], requested_decision: "None",
    evidence: [], created_at: at(5).toISOString()
  };
  assert.throws(() => validateReviewRequest(request, program), (error) => error.code === "REVIEW_NOT_REQUIRED");
  request.reason = "SEVERE_SECURITY_OR_DATA_RISK";
  request.recommendation = `Never store ${"sk-"}${"x".repeat(30)}`;
  assert.throws(() => validateReviewRequest(request, program), (error) => error.code === "SECRET_IN_REVIEW_PACKET");
});

test("typed owner escalation permits only the seven human boundaries", async (t) => {
  const { root } = await setup();
  t.after(() => rm(root, { recursive: true, force: true }));
  const escalation = {
    contract_version: "1.0.0",
    schema_version: 1,
    escalation_id: "owner-credential-boundary",
    category: "CREDENTIAL_OR_MFA",
    reason: "Production provider requires an owner MFA confirmation.",
    evidence: ["provider:access-denied"],
    requested_action: "Owner completes MFA and reports completion.",
    created_at: at(3).toISOString()
  };
  const blocked = await blockProgram(root, authA, escalation, { now: at(3) });
  assert.equal(blocked.state.status, "BLOCKED");
  const unblocked = await unblockProgram(root, authA, "Owner completed the MFA boundary.", { now: at(4) });
  assert.equal(unblocked.state.status, "ACTIVE");
  await assert.rejects(() => blockProgram(root, authA, { ...escalation, escalation_id: "owner-invalid", category: "ROUTINE_IMPLEMENTATION" }), (error) => error.code === "INVALID_ENUM");
});

test("CLI status and recovery operate with all external model credentials absent", async (t) => {
  const { root } = await setup();
  t.after(() => rm(root, { recursive: true, force: true }));
  const cli = path.join(repositoryRoot, ".entral/governor/bin/governor.mjs");
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/(CLAUDE|ANTHROPIC|GROK|XAI|SPARK|COPILOT|OPENAI|CHATGPT|AZURE)/i.test(key)) delete env[key];
  }
  const status = spawnSync(process.execPath, [cli, "status", "--root", root, "--json"], { encoding: "utf8", env });
  assert.equal(status.status, 0, status.stderr);
  assert.equal(JSON.parse(status.stdout).state.execution_model, EXECUTION_MODEL);
  const resume = spawnSync(process.execPath, [cli, "resume", "--root", root, "--session-id", "fresh-codex-session"], { encoding: "utf8", env });
  assert.equal(resume.status, 0, resume.stderr);
  assert.match(resume.stdout, /Activate Phase|Create one bounded/);
});

test("checkpoint threshold reserves integration and production repair capacity", () => {
  const packet = taskPacket();
  assert.deepEqual(usageCheckpointRequired(packet, 1_501), {
    required: false,
    tokens_remaining: 1_501,
    checkpoint_threshold: 1_500,
    release_repair_reserve: 500
  });
  assert.equal(usageCheckpointRequired(packet, 1_500).required, true);
});
