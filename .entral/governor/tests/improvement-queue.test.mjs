import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  EXECUTION_MODEL,
  GovernorError,
  IMPROVEMENT_CATEGORIES,
  IMPROVEMENT_OWNER_REVIEW_TOPICS,
  IMPROVEMENT_SOURCES,
  validateNamedContract
} from "../lib/contracts.mjs";
import {
  applyAcceptedPhaseAmendment,
  buildPhaseAmendment,
  decideImprovementCandidate,
  improvementEvidenceView,
  loadImprovementCandidates,
  mergeImprovementCandidate,
  normalizeImprovementCandidate,
  persistImprovementCandidate,
  planImprovementCycle,
  rankImprovementBacklog,
  reconcileImprovementCandidate,
  recordImprovementOutcome,
  sameImprovementRootCause,
  scoreImprovementCandidate,
  validateImprovementPolicy
} from "../lib/improvement-queue.mjs";
import { getImprovementBacklog, intakeImprovementCandidate, runImprovementCycle } from "../lib/governor.mjs";
import { commitStateAndEvent, ensureGovernorLayout, governorPath, sha256, writeJsonAtomic } from "../lib/store.mjs";

const RELEASE_SHA = "fdabaea99400ed1e1dfcada2cd41a336ed0a193b";
const NOW = new Date("2026-08-01T15:30:00.000Z");
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function amendmentDetails(phase = 199) {
  return {
    scope_delta: {
      added_requirements: ["Add the evidence-backed capability change."],
      removed_requirements: [],
      affected_paths: ["frontend/src/improvement.ts"]
    },
    affected_contracts: ["PhaseContract"],
    acceptance_criteria: ["The amended capability passes its deterministic gate."],
    commercial_unlock: "Makes the verified capability available without an unreviewed public commitment.",
    dag_update: { target_phase: phase, dependencies: [198] },
    supersession_record: {
      supersedes: ["P199-F001"],
      reason: "The evidence-backed requirement supersedes the earlier bounded wording."
    }
  };
}

function candidateInput(overrides = {}) {
  const merged = {
    source: "INCIDENT",
    category: "DEFECT_REPAIR",
    title: "Repair duplicate connector retries",
    root_cause: "The connector retry cursor is not advanced after a durable acknowledgment.",
    root_cause_status: "ACTIVE",
    affected_capability: "connector-retry",
    affected_scope: ["backend/src/connectors/retry.ts"],
    evidence: [{ kind: "INCIDENT", reference: "incident://INC-198-001", observed_at: NOW.toISOString() }],
    observed_impact: { summary: "Duplicate retry work increases completion latency.", metric: "retry_latency_ms", measured_value: 420, unit: "ms" },
    confidence: 0.9,
    urgency: 80,
    estimated_effort: 20,
    risk: "LOW",
    reversibility: "FULL",
    expected_value: { value: 90, customer_impact: 85, security_impact: 20, revenue_impact: 50, cost_impact: 70 },
    product_defining: false,
    owner_review_topics: [],
    budget_units: 20,
    emergency_repair: false,
    deterministic_tests: ["node --test connector-retry.test.mjs"],
    proposed_phase: 199,
    outcome_target: { metric: "retry_latency_ms", direction: "DECREASE", baseline_value: 420, expected_delta: -100, unit: "ms" },
    amendment_details: null,
    ...overrides
  };
  const material = merged.product_defining
    || merged.owner_review_topics.length > 0
    || ["PRODUCT_ENHANCEMENT", "COMMERCIAL_CHANGE", "RESEARCH_HYPOTHESIS"].includes(merged.category)
    || merged.risk !== "LOW"
    || merged.reversibility !== "FULL"
    || merged.affected_scope.some((entry) => entry.replaceAll("\\", "/").startsWith(".entral/governor/"));
  if (material && !merged.amendment_details) merged.amendment_details = amendmentDetails(merged.proposed_phase);
  return merged;
}

function candidate(overrides = {}, now = NOW) {
  return normalizeImprovementCandidate(candidateInput(overrides), { releaseVersion: RELEASE_SHA, now });
}

function policy(overrides = {}) {
  return validateImprovementPolicy({
    contract_version: "1.0.0",
    schema_version: 1,
    policy_id: "PHASE-198-TEST",
    maximum_active_budget_units: 100,
    emergency_repair_reserve_units: 20,
    maximum_active_candidates: 3,
    minimum_score: 55,
    quiet_period_hours: 24,
    active_budget_units: 0,
    active_candidate_ids: [],
    last_cycle_at: null,
    stop_conditions: [],
    updated_at: NOW.toISOString(),
    ...overrides
  });
}

test("P198-F001/P198-F002/P198-F005 normalize every source and category with complete evidence", () => {
  for (const source of IMPROVEMENT_SOURCES) {
    const normalized = candidate({ source, evidence: [{ kind: source, reference: `evidence://${source}` }] });
    assert.equal(normalized.source, source);
    assert.equal(normalized.evidence[0].kind, source);
    assert.equal(normalized.actor, EXECUTION_MODEL);
  }
  for (const category of IMPROVEMENT_CATEGORIES) {
    const normalized = candidateInput({ category });
    if (["PRODUCT_ENHANCEMENT", "COMMERCIAL_CHANGE", "RESEARCH_HYPOTHESIS"].includes(category)) normalized.amendment_details = amendmentDetails();
    assert.equal(normalizeImprovementCandidate(normalized, { releaseVersion: RELEASE_SHA, now: NOW }).category, category);
  }
  assert.throws(
    () => normalizeImprovementCandidate(candidateInput({ evidence: [] }), { releaseVersion: RELEASE_SHA, now: NOW }),
    (error) => error instanceof GovernorError && error.code === "EVIDENCE_REQUIRED"
  );
});

test("P198-F003/P198-F017 duplicate root-cause signals merge provenance and never duplicate task proposals", () => {
  const incident = candidate();
  const support = candidate({
    source: "SUPPORT",
    evidence: [{ kind: "SUPPORT", reference: "support://CASE-198-022", observed_at: "2026-08-01T15:31:00.000Z" }],
    confidence: 0.95
  }, new Date("2026-08-01T15:31:00.000Z"));
  assert.equal(sameImprovementRootCause(incident, support), true);
  const merged = mergeImprovementCandidate(incident, support, { now: new Date("2026-08-01T15:32:00.000Z") });
  assert.equal(merged.candidate_id, incident.candidate_id);
  assert.deepEqual(merged.evidence.map((entry) => entry.kind).sort(), ["INCIDENT", "SUPPORT"]);
  const first = planImprovementCycle([merged], policy(), { now: new Date("2026-08-03T16:00:00.000Z") });
  assert.equal(first.task_proposals.length, 1);
  const second = planImprovementCycle(first.candidates, policy({
    active_budget_units: merged.budget_units,
    active_candidate_ids: [merged.candidate_id]
  }), { now: new Date("2026-08-05T16:00:00.000Z") });
  assert.equal(second.task_proposals.length, 0);

  const elevated = candidate({ risk: "HIGH", reversibility: "PARTIAL" });
  const conservative = mergeImprovementCandidate(incident, elevated, { now: new Date("2026-08-01T15:34:00.000Z") });
  assert.equal(conservative.risk, "HIGH");
  assert.equal(conservative.reversibility, "PARTIAL");
  assert.equal(planImprovementCycle([conservative], policy(), { now: new Date("2026-08-03T16:00:00.000Z") }).task_proposals.length, 0);
});

test("P198-F004 scoring deterministically uses value, confidence, urgency, all impacts, effort, and risk", () => {
  const base = candidateInput();
  const baseline = scoreImprovementCandidate(base).total;
  const mutations = [
    { expected_value: { ...base.expected_value, value: 0 } },
    { confidence: 0.1 },
    { urgency: 0 },
    { expected_value: { ...base.expected_value, customer_impact: 0 } },
    { expected_value: { ...base.expected_value, security_impact: 100 } },
    { expected_value: { ...base.expected_value, revenue_impact: 0 } },
    { expected_value: { ...base.expected_value, cost_impact: 0 } },
    { estimated_effort: 100 },
    { risk: "CRITICAL" }
  ];
  for (const mutation of mutations) assert.notEqual(scoreImprovementCandidate({ ...base, ...mutation }).total, baseline);
  assert.deepEqual(scoreImprovementCandidate(base), scoreImprovementCandidate(structuredClone(base)));
});

test("P198-F006 low-risk reversible tested work is bounded by budget and emergency reserve", () => {
  const normal = candidate();
  const eligible = planImprovementCycle([normal], policy(), { now: NOW });
  assert.equal(eligible.task_proposals.length, 1);
  assert.equal(eligible.amendments.length, 0);

  const untested = candidate({ deterministic_tests: [] });
  assert.equal(planImprovementCycle([untested], policy(), { now: NOW }).task_proposals.length, 0);
  const reserveBlocked = candidate({ budget_units: 85 });
  assert.equal(planImprovementCycle([reserveBlocked], policy(), { now: NOW }).task_proposals.length, 0);
  const emergency = candidate({ budget_units: 85, emergency_repair: true });
  assert.equal(planImprovementCycle([emergency], policy(), { now: NOW }).task_proposals.length, 1);
});

test("P198-F007/P198-F008/P198-F009/P198-F018 material and product-defining work creates only owner-reviewed amendments", () => {
  const product = candidate({ category: "PRODUCT_ENHANCEMENT", product_defining: true });
  const planned = planImprovementCycle([product], policy(), { now: NOW });
  assert.equal(planned.task_proposals.length, 0);
  assert.equal(planned.amendments.length, 1);
  assert.equal(planned.amendments[0].approval_status, "OWNER_REVIEW_REQUIRED");

  for (const topic of IMPROVEMENT_OWNER_REVIEW_TOPICS) {
    const reviewed = candidate({ owner_review_topics: [topic] });
    const cycle = planImprovementCycle([reviewed], policy(), { now: NOW });
    assert.equal(cycle.task_proposals.length, 0);
    assert.deepEqual(cycle.amendments[0].owner_review_topics, [topic]);
  }

  const governorChange = candidate({
    affected_scope: [".entral/governor/lib/governor.mjs"],
    amendment_details: { ...amendmentDetails(), scope_delta: { ...amendmentDetails().scope_delta, affected_paths: [".entral/governor/lib/governor.mjs"] } }
  });
  const governorCycle = planImprovementCycle([governorChange], policy(), { now: NOW });
  assert.equal(governorCycle.task_proposals.length, 0);
  assert.deepEqual(governorCycle.amendments[0].owner_review_topics, ["ARCHITECTURE_REPLACEMENT"]);
});

test("P198-F010/P198-F011/P198-F019 active limits, stop conditions, quiet periods, and no-value cycles stay idle", () => {
  const work = candidate();
  assert.equal(planImprovementCycle([work], policy({ maximum_active_candidates: 1, active_candidate_ids: ["IMP-ACTIVE"], active_budget_units: 10 }), { now: NOW }).status, "IDLE");
  assert.equal(planImprovementCycle([work], policy({ stop_conditions: ["OWNER_PAUSE"] }), { now: NOW }).reason, "STOP_CONDITION");
  assert.equal(planImprovementCycle([work], policy({ last_cycle_at: "2026-08-01T14:00:00.000Z" }), { now: NOW }).reason, "QUIET_PERIOD");
  const noValue = candidate({ expected_value: { value: 0, customer_impact: 0, security_impact: 0, revenue_impact: 0, cost_impact: 0 }, confidence: 0, urgency: 0, estimated_effort: 100 });
  const idle = planImprovementCycle([noValue], policy(), { now: NOW });
  assert.equal(idle.status, "IDLE");
  assert.equal(idle.reason, "NO_WORTHWHILE_EVIDENCE_BACKED_WORK");
});

test("P198-F012 an owner-attested amendment updates DAG, contract, acceptance, commercial, and supersession records", () => {
  const proposal = buildPhaseAmendment(candidate({ product_defining: true }), { now: NOW });
  assert.throws(
    () => applyAcceptedPhaseAmendment(proposal, { phases: [198, 199], dependencies: { 198: [197], 199: [198] } }, { phase: 199 }),
    (error) => error instanceof GovernorError && error.code === "OWNER_APPROVAL_REQUIRED"
  );
  const accepted = {
    ...proposal,
    version: proposal.version + 1,
    approval_status: "ACCEPTED_BY_OWNER",
    owner_approval: {
      decision_id: "OWNER-DECISION-198-001",
      owner_attested: true,
      approved_at: "2026-08-01T16:00:00.000Z",
      evidence_sha256: sha256("owner-approved-amendment-evidence")
    },
    rationale: "Owner accepted the evidence-bound amendment.",
    updated_at: "2026-08-01T16:00:00.000Z"
  };
  const applied = applyAcceptedPhaseAmendment(
    accepted,
    { phases: [198, 199], dependencies: { 198: [197], 199: [197] } },
    { contract_version: "1.0.0", schema_version: 1, phase: 199, acceptance_gate_ids: [] }
  );
  assert.deepEqual(applied.phase_dag.dependencies["199"], [198]);
  const entry = applied.phase_contract.accepted_amendments[0];
  assert.deepEqual(entry.affected_contracts, accepted.affected_contracts);
  assert.deepEqual(entry.acceptance_criteria, accepted.acceptance_criteria);
  assert.equal(entry.commercial_unlock, accepted.commercial_unlock);
  assert.deepEqual(entry.supersession_record, accepted.supersession_record);
});

test("P198-F013/P198-F014 decisions remain explainable and views separate concise ranking from full evidence", () => {
  const first = candidate();
  const second = candidate({
    title: "Reduce graph refresh cost",
    root_cause: "Graph refresh recalculates an unchanged aggregate.",
    affected_capability: "graph-refresh",
    affected_scope: ["frontend/src/graph/refresh.ts"],
    evidence: [{ kind: "COST", reference: "cost://graph-refresh" }],
    urgency: 40
  });
  const deferred = decideImprovementCandidate(first, { status: "DEFERRED", rationale: "Wait for the next connector release.", reevaluation_trigger: "Connector release 9.1 reaches production." }, { now: NOW });
  assert.equal(deferred.status, "DEFERRED");
  assert.match(deferred.reevaluation_trigger, /9\.1/);
  const rejected = decideImprovementCandidate(second, { status: "REJECTED", rationale: "The observed cost is below the verified action threshold." }, { now: NOW });
  assert.equal(rejected.status, "REJECTED");
  const backlog = rankImprovementBacklog([deferred, rejected]);
  assert.equal(backlog.length, 1);
  assert.equal("evidence" in backlog[0], false);
  assert.equal(improvementEvidenceView(deferred).candidate.evidence.length, 1);
});

test("P198-F015 outcomes are honest and bound to an authorized exact production release", () => {
  const eligible = planImprovementCycle([candidate()], policy(), { now: NOW }).candidates[0];
  const measured = recordImprovementOutcome(eligible, {
    metric: "retry_latency_ms",
    observed_value: 250,
    implementation_release_sha: RELEASE_SHA,
    evidence: [{ kind: "TELEMETRY", reference: "telemetry://retry-latency-after" }]
  }, { now: new Date("2026-08-02T15:30:00.000Z"), releaseVersion: RELEASE_SHA });
  assert.equal(measured.outcome.result, "IMPROVED");
  assert.equal(measured.outcome.delta, -170);
  assert.equal(measured.candidate.status, "IMPLEMENTED");

  const unavailable = recordImprovementOutcome(eligible, {
    metric: "retry_latency_ms",
    observed_value: null,
    implementation_release_sha: RELEASE_SHA,
    evidence: [{ kind: "TELEMETRY", reference: "telemetry://retry-latency-unavailable", valid: false }]
  }, { now: new Date("2026-08-02T16:00:00.000Z"), releaseVersion: RELEASE_SHA });
  assert.equal(unavailable.outcome.result, "UNAVAILABLE");
  assert.equal(unavailable.outcome.delta, null);
  assert.throws(() => recordImprovementOutcome(eligible, {
    metric: "retry_latency_ms",
    observed_value: 250,
    implementation_release_sha: "0".repeat(40),
    evidence: [{ kind: "TELEMETRY", reference: "telemetry://wrong-release" }]
  }, { releaseVersion: RELEASE_SHA }), /currently verified production release SHA/);
});

test("P198-F016 invalid evidence and removed root causes close automatically", () => {
  const invalid = candidate({ evidence: [{ kind: "INCIDENT", reference: "incident://invalid", valid: false }] });
  assert.equal(reconcileImprovementCandidate(invalid, { now: NOW }).status, "CLOSED_EVIDENCE_INVALID");
  assert.equal(reconcileImprovementCandidate(candidate({ root_cause_status: "REMOVED" }), { now: NOW }).status, "CLOSED_ROOT_CAUSE_REMOVED");
});

test("P198 restart persistence restores one durable candidate and authorization fails closed", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "entral-improvement-"));
  try {
    const original = candidate();
    await persistImprovementCandidate(root, original);
    const restored = await loadImprovementCandidates(root);
    assert.equal(restored.length, 1);
    assert.deepEqual(restored[0], original);
    assert.throws(() => validateNamedContract("ImprovementCandidate", { ...original, actor: "CLAUDE" }), /CODEX_5_6_SOL_XHIGH/);
    await assert.rejects(() => getImprovementBacklog(root, { actor: "CLAUDE" }), /CODEX_5_6_SOL_XHIGH/);
    await assert.rejects(() => intakeImprovementCandidate(root, { actor: "CLAUDE", sessionId: "unauthorized" }, candidateInput()), /CODEX_5_6_SOL_XHIGH/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("P198 Governor intake and cycle survive a process boundary without duplicate work", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "entral-improvement-governor-"));
  const auth = { actor: EXECUTION_MODEL, sessionId: "phase198-test-session" };
  try {
    await ensureGovernorLayout(root);
    const template = JSON.parse(await readFile(path.join(repositoryRoot, ".entral/governor/PROGRAM_STATE.json"), "utf8"));
    const initial = {
      ...template,
      status: "ACTIVE",
      current_phase: 198,
      certified_phases: [195, 196, 197],
      current_task_packet_id: null,
      task_status: null,
      last_task_packet_id: null,
      active_write_lease: null,
      blocked_reason: null,
      conditional_review_triggers: [],
      next_action: "Run the Phase 198 improvement queue test.",
      version: 0,
      event_count: 0,
      event_head_hash: "0".repeat(64),
      updated_at: NOW.toISOString()
    };
    delete initial.pending_release_manifest;
    await commitStateAndEvent(root, initial, {
      eventType: "PROGRAM_INITIALIZED",
      actor: EXECUTION_MODEL,
      subjectId: "phase198-test",
      payload: { test: true },
      now: NOW
    });
    await writeJsonAtomic(governorPath(root, "improvements/POLICY.v1.json"), policy({ quiet_period_hours: 0 }));

    const intake = await intakeImprovementCandidate(root, auth, candidateInput(), { now: new Date("2026-08-01T15:31:00.000Z") });
    assert.equal(intake.result.version, 1);
    const firstCycle = await runImprovementCycle(root, auth, { now: new Date("2026-08-01T15:32:00.000Z") });
    assert.equal(firstCycle.result.cycle.task_proposals.length, 1);

    await writeJsonAtomic(governorPath(root, "improvements/POLICY.v1.json"), policy({ quiet_period_hours: 0 }));
    const restoredBacklog = await getImprovementBacklog(root, { actor: EXECUTION_MODEL });
    assert.equal(restoredBacklog.length, 1);
    const restartedCycle = await runImprovementCycle(root, auth, { now: new Date("2026-08-01T15:33:00.000Z") });
    assert.equal(restartedCycle.result.cycle.task_proposals.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
