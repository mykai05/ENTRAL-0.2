import { readdir } from "node:fs/promises";
import {
  CONTRACT_VERSION,
  EXECUTION_MODEL,
  GovernorError,
  IMPROVEMENT_CATEGORIES,
  IMPROVEMENT_OWNER_REVIEW_TOPICS,
  IMPROVEMENT_SOURCES,
  SCHEMA_VERSION,
  validateImprovementCandidate,
  validateImprovementOutcome,
  validatePhaseAmendment
} from "./contracts.mjs";
import {
  governorPath,
  readJson,
  readOptionalJson,
  sha256,
  writeJsonAtomic
} from "./store.mjs";

export const IMPROVEMENT_POLICY_FILE = "improvements/POLICY.v1.json";
const CANDIDATE_DIRECTORY = "improvements/candidates";
const AMENDMENT_DIRECTORY = "improvements/amendments";
const OUTCOME_DIRECTORY = "improvements/outcomes";
const CYCLE_DIRECTORY = "improvements/cycles";
const TASK_PROPOSAL_DIRECTORY = "improvements/task-proposals";

const RISK_SCORE = Object.freeze({ LOW: 0, MEDIUM: 35, HIGH: 70, CRITICAL: 100 });
const MATERIAL_CATEGORIES = new Set(["PRODUCT_ENHANCEMENT", "COMMERCIAL_CHANGE", "RESEARCH_HYPOTHESIS"]);
const PROCESSABLE_STATUSES = new Set(["NEW", "QUEUED"]);
const CLOSED_STATUSES = new Set(["REJECTED", "IMPLEMENTED", "CLOSED_EVIDENCE_INVALID", "CLOSED_ROOT_CAUSE_REMOVED"]);
const GOVERNOR_CONTROL_PREFIXES = [
  ".entral/governor/PROGRAM_STATE.json",
  ".entral/governor/bin/",
  ".entral/governor/events/",
  ".entral/governor/lib/",
  ".entral/governor/migrations/",
  ".entral/governor/program/",
  ".entral/governor/schemas/"
];

function touchesGovernorScope(scope) {
  return scope.some((entry) => {
    const normalized = entry.replaceAll("\\", "/");
    return GOVERNOR_CONTROL_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(prefix));
  });
}

function requiredString(value, field, minimum = 1) {
  if (typeof value !== "string" || value.trim().length < minimum) {
    throw new GovernorError("INVALID_IMPROVEMENT_INPUT", `${field} must be a non-empty string`);
  }
  return value.trim();
}

function boundedInteger(value, field, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new GovernorError("INVALID_IMPROVEMENT_INPUT", `${field} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function boundedNumber(value, field, minimum, maximum) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new GovernorError("INVALID_IMPROVEMENT_INPUT", `${field} must be a number between ${minimum} and ${maximum}`);
  }
  return value;
}

function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) throw new GovernorError("INVALID_IMPROVEMENT_INPUT", `${field} must be one of ${allowed.join(", ")}`);
  return value;
}

function iso(now = new Date()) {
  const value = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(value.getTime())) throw new GovernorError("INVALID_TIMESTAMP", "Improvement queue clock is invalid");
  return value.toISOString();
}

function nullableId(value, field) {
  if (value === null || value === undefined) return null;
  return requiredString(value, field);
}

function safeRecordId(value, field) {
  const normalized = requiredString(value, field, 3);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,199}$/.test(normalized)) {
    throw new GovernorError("UNSAFE_IMPROVEMENT_ID", `${field} must be safe for repository-local persistence`);
  }
  return normalized;
}

function normalizedText(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => (
    typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right))
  ));
}

function normalizeEvidence(entries, now) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new GovernorError("EVIDENCE_REQUIRED", "Every ImprovementCandidate requires at least one evidence reference");
  }
  const normalized = entries.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new GovernorError("INVALID_EVIDENCE", `evidence[${index}] must be an object`);
    const kind = enumValue(entry.kind, IMPROVEMENT_SOURCES, `evidence[${index}].kind`);
    const reference = requiredString(entry.reference, `evidence[${index}].reference`);
    const lineage = entry.lineage_sha256 ?? sha256({ kind, reference: normalizedText(reference) });
    if (!/^[a-f0-9]{64}$/.test(lineage)) throw new GovernorError("INVALID_SHA256", `evidence[${index}].lineage_sha256 must be a lowercase SHA-256 digest`);
    const observedAt = entry.observed_at ?? iso(now);
    return {
      evidence_id: entry.evidence_id ?? `EVID-${sha256({ kind, reference, lineage }).slice(0, 24)}`,
      kind,
      reference,
      lineage_sha256: lineage,
      valid: entry.valid !== false,
      observed_at: iso(observedAt)
    };
  });
  const byId = new Map();
  for (const entry of normalized) {
    const existing = byId.get(entry.evidence_id);
    if (existing && sha256(existing) !== sha256(entry)) throw new GovernorError("EVIDENCE_ID_CONFLICT", `Evidence ${entry.evidence_id} has conflicting content`);
    byId.set(entry.evidence_id, entry);
  }
  return [...byId.values()].sort((left, right) => left.evidence_id.localeCompare(right.evidence_id));
}

export function scoreImprovementCandidate(input) {
  const expected = input.expected_value;
  if (!expected || typeof expected !== "object" || Array.isArray(expected)) throw new GovernorError("INVALID_EXPECTED_VALUE", "expected_value is required");
  const value = boundedInteger(expected.value, "expected_value.value", 0, 100);
  const confidence = boundedNumber(input.confidence, "confidence", 0, 1);
  const urgency = boundedInteger(input.urgency, "urgency", 0, 100);
  const customerImpact = boundedInteger(expected.customer_impact, "expected_value.customer_impact", 0, 100);
  const securityImpact = boundedInteger(expected.security_impact, "expected_value.security_impact", 0, 100);
  const revenueImpact = boundedInteger(expected.revenue_impact, "expected_value.revenue_impact", 0, 100);
  const costImpact = boundedInteger(expected.cost_impact, "expected_value.cost_impact", 0, 100);
  const effort = boundedInteger(input.estimated_effort, "estimated_effort", 1, 100);
  const risk = RISK_SCORE[enumValue(input.risk, Object.keys(RISK_SCORE), "risk")];
  const total = Math.max(0, Math.min(100, Math.round(
    value * 0.22
    + confidence * 100 * 0.14
    + urgency * 0.14
    + customerImpact * 0.12
    + securityImpact * 0.10
    + revenueImpact * 0.12
    + costImpact * 0.08
    + (100 - effort) * 0.05
    + (100 - risk) * 0.03
  )));
  return {
    value,
    confidence: confidence * 100,
    urgency,
    customer_impact: customerImpact,
    security_impact: securityImpact,
    revenue_impact: revenueImpact,
    cost_impact: costImpact,
    effort,
    risk,
    total
  };
}

function normalizeAmendmentDetails(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) throw new GovernorError("INVALID_AMENDMENT_DETAILS", "amendment_details must be an object or null");
  const scopeDelta = value.scope_delta;
  const dagUpdate = value.dag_update;
  const supersession = value.supersession_record;
  if (!scopeDelta || !dagUpdate || !supersession) throw new GovernorError("INCOMPLETE_AMENDMENT_DETAILS", "Material candidates require scope, DAG, and supersession details");
  return {
    scope_delta: {
      added_requirements: uniqueSorted(scopeDelta.added_requirements ?? []),
      removed_requirements: uniqueSorted(scopeDelta.removed_requirements ?? []),
      affected_paths: uniqueSorted(scopeDelta.affected_paths ?? [])
    },
    affected_contracts: uniqueSorted(value.affected_contracts ?? []),
    acceptance_criteria: uniqueSorted(value.acceptance_criteria ?? []),
    commercial_unlock: requiredString(value.commercial_unlock, "amendment_details.commercial_unlock", 3),
    dag_update: {
      target_phase: boundedInteger(dagUpdate.target_phase, "amendment_details.dag_update.target_phase", 1, 10_000),
      dependencies: uniqueSorted(dagUpdate.dependencies ?? [])
    },
    supersession_record: {
      supersedes: uniqueSorted(supersession.supersedes ?? []),
      reason: requiredString(supersession.reason, "amendment_details.supersession_record.reason", 3)
    }
  };
}

export function normalizeImprovementCandidate(input, {
  releaseVersion,
  now = new Date()
}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new GovernorError("INVALID_IMPROVEMENT_INPUT", "Improvement candidate input must be an object");
  if (!/^[a-f0-9]{40}$/.test(releaseVersion)) throw new GovernorError("INVALID_GIT_SHA", "Improvement candidate requires an exact release SHA");
  const timestamp = iso(now);
  const source = enumValue(input.source, IMPROVEMENT_SOURCES, "source");
  const category = enumValue(input.category, IMPROVEMENT_CATEGORIES, "category");
  const rootCause = requiredString(input.root_cause, "root_cause", 3);
  const capability = requiredString(input.affected_capability, "affected_capability", 2);
  if (!Array.isArray(input.affected_scope) || input.affected_scope.length === 0) throw new GovernorError("AFFECTED_SCOPE_REQUIRED", "affected_scope must identify at least one bounded path or capability scope");
  const affectedScope = uniqueSorted(input.affected_scope.map((entry, index) => requiredString(entry, `affected_scope[${index}]`)));
  const evidence = normalizeEvidence(input.evidence, timestamp);
  const rootCauseFingerprint = sha256(normalizedText(rootCause));
  const evidenceLineage = sha256(uniqueSorted(evidence.map((entry) => entry.lineage_sha256)));
  const deduplicationKey = sha256({
    root_cause_fingerprint_sha256: rootCauseFingerprint,
    affected_capability: normalizedText(capability),
    affected_scope: affectedScope.map(normalizedText),
    evidence_lineage_sha256: evidenceLineage
  });
  const ownerReviewTopics = uniqueSorted(input.owner_review_topics ?? []);
  ownerReviewTopics.forEach((topic, index) => enumValue(topic, IMPROVEMENT_OWNER_REVIEW_TOPICS, `owner_review_topics[${index}]`));
  const risk = enumValue(input.risk, Object.keys(RISK_SCORE), "risk");
  const reversibility = enumValue(input.reversibility, ["FULL", "PARTIAL", "NONE"], "reversibility");
  const productDefining = input.product_defining === true;
  const material = productDefining || ownerReviewTopics.length > 0 || MATERIAL_CATEGORIES.has(category) || risk !== "LOW" || reversibility !== "FULL" || touchesGovernorScope(affectedScope);
  const amendmentDetails = normalizeAmendmentDetails(input.amendment_details);
  if (material && amendmentDetails === null) throw new GovernorError("MATERIAL_AMENDMENT_REQUIRED", "Material candidates require complete PhaseAmendment details");
  const observedImpact = input.observed_impact;
  if (!observedImpact || typeof observedImpact !== "object" || Array.isArray(observedImpact)) throw new GovernorError("OBSERVED_IMPACT_REQUIRED", "observed_impact is required");
  const outcomeTarget = input.outcome_target;
  if (!outcomeTarget || typeof outcomeTarget !== "object" || Array.isArray(outcomeTarget)) throw new GovernorError("OUTCOME_TARGET_REQUIRED", "outcome_target is required");
  const score = scoreImprovementCandidate(input);
  const candidate = {
    contract_version: CONTRACT_VERSION,
    schema_version: SCHEMA_VERSION,
    candidate_id: input.candidate_id === undefined ? `IMP-${deduplicationKey.slice(0, 24)}` : safeRecordId(input.candidate_id, "candidate_id"),
    tenant_id: nullableId(input.tenant_id, "tenant_id"),
    organization_id: nullableId(input.organization_id, "organization_id"),
    business_id: nullableId(input.business_id, "business_id"),
    actor: EXECUTION_MODEL,
    request_idempotency_key: sha256({ deduplication_key_sha256: deduplicationKey, source, evidence: evidence.map((entry) => entry.evidence_id) }),
    version: 1,
    source,
    category,
    title: requiredString(input.title, "title", 3),
    root_cause: rootCause,
    root_cause_status: input.root_cause_status ?? "ACTIVE",
    affected_capability: capability,
    affected_scope: affectedScope,
    evidence,
    observed_impact: {
      summary: requiredString(observedImpact.summary, "observed_impact.summary", 3),
      metric: requiredString(observedImpact.metric, "observed_impact.metric"),
      measured_value: observedImpact.measured_value ?? null,
      unit: observedImpact.unit ?? null
    },
    confidence: boundedNumber(input.confidence, "confidence", 0, 1),
    urgency: boundedInteger(input.urgency, "urgency", 0, 100),
    estimated_effort: boundedInteger(input.estimated_effort, "estimated_effort", 1, 100),
    risk,
    reversibility,
    expected_value: {
      value: score.value,
      customer_impact: score.customer_impact,
      security_impact: score.security_impact,
      revenue_impact: score.revenue_impact,
      cost_impact: score.cost_impact
    },
    score,
    product_defining: productDefining,
    owner_review_topics: ownerReviewTopics,
    budget_units: boundedInteger(input.budget_units, "budget_units", 1, 10_000),
    emergency_repair: input.emergency_repair === true,
    deterministic_tests: uniqueSorted(input.deterministic_tests ?? []),
    root_cause_fingerprint_sha256: rootCauseFingerprint,
    evidence_lineage_sha256: evidenceLineage,
    deduplication_key_sha256: deduplicationKey,
    status: input.status ?? "NEW",
    rationale: input.rationale ?? null,
    reevaluation_trigger: input.reevaluation_trigger ?? null,
    proposed_phase: boundedInteger(input.proposed_phase, "proposed_phase", 1, 10_000),
    outcome_target: {
      metric: requiredString(outcomeTarget.metric, "outcome_target.metric"),
      direction: enumValue(outcomeTarget.direction, ["INCREASE", "DECREASE", "MAINTAIN"], "outcome_target.direction"),
      baseline_value: outcomeTarget.baseline_value ?? null,
      expected_delta: boundedNumber(outcomeTarget.expected_delta, "outcome_target.expected_delta", -1_000_000_000, 1_000_000_000),
      unit: requiredString(outcomeTarget.unit, "outcome_target.unit")
    },
    amendment_details: amendmentDetails,
    created_at: timestamp,
    updated_at: timestamp,
    release_version: releaseVersion
  };
  return validateImprovementCandidate(candidate);
}

export function sameImprovementRootCause(left, right) {
  return left.root_cause_fingerprint_sha256 === right.root_cause_fingerprint_sha256
    && normalizedText(left.affected_capability) === normalizedText(right.affected_capability)
    && JSON.stringify(uniqueSorted(left.affected_scope.map(normalizedText))) === JSON.stringify(uniqueSorted(right.affected_scope.map(normalizedText)));
}

export function mergeImprovementCandidate(existing, incoming, { now = new Date() } = {}) {
  validateImprovementCandidate(existing);
  validateImprovementCandidate(incoming);
  if (!sameImprovementRootCause(existing, incoming)) throw new GovernorError("CANDIDATE_ROOT_CAUSE_MISMATCH", "Only evidence for the same root cause, capability, and affected scope can merge");
  if (existing.category !== incoming.category || existing.proposed_phase !== incoming.proposed_phase) {
    throw new GovernorError("CANDIDATE_CLASSIFICATION_CONFLICT", "Signals for one root cause must agree on category and proposed phase before they merge");
  }
  if (existing.amendment_details && incoming.amendment_details && sha256(existing.amendment_details) !== sha256(incoming.amendment_details)) {
    throw new GovernorError("AMENDMENT_DETAILS_CONFLICT", "Material signals cannot silently replace different PhaseAmendment details");
  }
  const evidence = new Map(existing.evidence.map((entry) => [entry.evidence_id, entry]));
  for (const entry of incoming.evidence) {
    const current = evidence.get(entry.evidence_id);
    if (current && sha256(current) !== sha256(entry)) throw new GovernorError("EVIDENCE_ID_CONFLICT", `Evidence ${entry.evidence_id} has conflicting content`);
    evidence.set(entry.evidence_id, entry);
  }
  const mergedEvidence = [...evidence.values()].sort((left, right) => left.evidence_id.localeCompare(right.evidence_id));
  const mergedRisk = RISK_SCORE[existing.risk] >= RISK_SCORE[incoming.risk] ? existing.risk : incoming.risk;
  const reversibilityRank = { FULL: 0, PARTIAL: 1, NONE: 2 };
  const mergedReversibility = reversibilityRank[existing.reversibility] >= reversibilityRank[incoming.reversibility] ? existing.reversibility : incoming.reversibility;
  const merged = {
    ...existing,
    version: existing.version + 1,
    evidence: mergedEvidence,
    evidence_lineage_sha256: sha256(uniqueSorted(mergedEvidence.map((entry) => entry.lineage_sha256))),
    confidence: Math.max(existing.confidence, incoming.confidence),
    urgency: Math.max(existing.urgency, incoming.urgency),
    expected_value: Object.fromEntries(Object.keys(existing.expected_value).map((field) => [field, Math.max(existing.expected_value[field], incoming.expected_value[field])])),
    score: scoreImprovementCandidate({
      confidence: Math.max(existing.confidence, incoming.confidence),
      urgency: Math.max(existing.urgency, incoming.urgency),
      estimated_effort: Math.min(existing.estimated_effort, incoming.estimated_effort),
      risk: mergedRisk,
      expected_value: Object.fromEntries(Object.keys(existing.expected_value).map((field) => [field, Math.max(existing.expected_value[field], incoming.expected_value[field])]))
    }),
    estimated_effort: Math.min(existing.estimated_effort, incoming.estimated_effort),
    risk: mergedRisk,
    reversibility: mergedReversibility,
    product_defining: existing.product_defining || incoming.product_defining,
    owner_review_topics: uniqueSorted([...existing.owner_review_topics, ...incoming.owner_review_topics]),
    deterministic_tests: uniqueSorted([...existing.deterministic_tests, ...incoming.deterministic_tests]),
    budget_units: Math.max(existing.budget_units, incoming.budget_units),
    emergency_repair: existing.emergency_repair || incoming.emergency_repair,
    amendment_details: existing.amendment_details ?? incoming.amendment_details,
    request_idempotency_key: sha256({ candidate_id: existing.candidate_id, version: existing.version + 1, evidence: mergedEvidence.map((entry) => entry.evidence_id) }),
    updated_at: iso(now)
  };
  return validateImprovementCandidate(merged);
}

export function reconcileImprovementCandidate(candidate, { now = new Date() } = {}) {
  validateImprovementCandidate(candidate);
  if (CLOSED_STATUSES.has(candidate.status)) return candidate;
  let status = candidate.status;
  let rationale = candidate.rationale;
  if (candidate.root_cause_status === "REMOVED") {
    status = "CLOSED_ROOT_CAUSE_REMOVED";
    rationale = "The verified root cause no longer exists.";
  } else if (!candidate.evidence.some((entry) => entry.valid)) {
    status = "CLOSED_EVIDENCE_INVALID";
    rationale = "All evidence references were invalidated.";
  }
  if (status === candidate.status && rationale === candidate.rationale) return candidate;
  return validateImprovementCandidate({ ...candidate, version: candidate.version + 1, status, rationale, updated_at: iso(now) });
}

export function validateImprovementPolicy(policy) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) throw new GovernorError("INVALID_IMPROVEMENT_POLICY", "Improvement policy must be an object");
  if (policy.contract_version !== CONTRACT_VERSION || policy.schema_version !== SCHEMA_VERSION) throw new GovernorError("UNSUPPORTED_CONTRACT_VERSION", "Improvement policy contract version is unsupported");
  requiredString(policy.policy_id, "policy.policy_id", 3);
  boundedInteger(policy.maximum_active_budget_units, "policy.maximum_active_budget_units", 1, 10_000);
  boundedInteger(policy.emergency_repair_reserve_units, "policy.emergency_repair_reserve_units", 1, policy.maximum_active_budget_units);
  if (policy.emergency_repair_reserve_units >= policy.maximum_active_budget_units) throw new GovernorError("INVALID_IMPROVEMENT_POLICY", "Emergency reserve must be smaller than the maximum active budget");
  boundedInteger(policy.maximum_active_candidates, "policy.maximum_active_candidates", 1, 100);
  boundedInteger(policy.minimum_score, "policy.minimum_score", 1, 100);
  boundedInteger(policy.quiet_period_hours, "policy.quiet_period_hours", 0, 8_760);
  boundedInteger(policy.active_budget_units, "policy.active_budget_units", 0, policy.maximum_active_budget_units);
  if (!Array.isArray(policy.active_candidate_ids) || new Set(policy.active_candidate_ids).size !== policy.active_candidate_ids.length) throw new GovernorError("INVALID_IMPROVEMENT_POLICY", "active_candidate_ids must be a unique array");
  policy.active_candidate_ids.forEach((candidateId, index) => safeRecordId(candidateId, `policy.active_candidate_ids[${index}]`));
  if (!Array.isArray(policy.stop_conditions)) throw new GovernorError("INVALID_IMPROVEMENT_POLICY", "stop_conditions must be an array");
  policy.stop_conditions.forEach((condition, index) => requiredString(condition, `policy.stop_conditions[${index}]`, 3));
  if (policy.last_cycle_at !== null) iso(policy.last_cycle_at);
  iso(policy.updated_at);
  return policy;
}

function touchesGovernorControl(candidate) {
  return touchesGovernorScope(candidate.affected_scope);
}

export function requiresMaterialAmendment(candidate) {
  validateImprovementCandidate(candidate);
  return candidate.product_defining
    || candidate.owner_review_topics.length > 0
    || MATERIAL_CATEGORIES.has(candidate.category)
    || candidate.risk !== "LOW"
    || candidate.reversibility !== "FULL"
    || touchesGovernorControl(candidate);
}

export function buildPhaseAmendment(candidate, { now = new Date() } = {}) {
  validateImprovementCandidate(candidate);
  if (!requiresMaterialAmendment(candidate)) throw new GovernorError("AMENDMENT_NOT_MATERIAL", "Low-risk bounded corrections do not require a PhaseAmendment");
  if (!candidate.amendment_details) throw new GovernorError("INCOMPLETE_AMENDMENT_DETAILS", "Material candidates require complete amendment details");
  const details = candidate.amendment_details;
  if (details.dag_update.target_phase !== candidate.proposed_phase) {
    throw new GovernorError("AMENDMENT_PHASE_MISMATCH", "PhaseAmendment target must equal the candidate proposed phase");
  }
  const amendment = {
    contract_version: CONTRACT_VERSION,
    schema_version: SCHEMA_VERSION,
    amendment_id: `AMEND-${candidate.candidate_id}-${candidate.version}`,
    candidate_id: candidate.candidate_id,
    tenant_id: candidate.tenant_id,
    organization_id: candidate.organization_id,
    business_id: candidate.business_id,
    actor: EXECUTION_MODEL,
    request_idempotency_key: sha256({ candidate_id: candidate.candidate_id, candidate_version: candidate.version, phase: candidate.proposed_phase }),
    phase: candidate.proposed_phase,
    version: 1,
    candidate_version: candidate.version,
    reason: candidate.root_cause,
    scope_delta: details.scope_delta,
    evidence: candidate.evidence,
    affected_contracts: details.affected_contracts,
    acceptance_criteria: details.acceptance_criteria,
    commercial_unlock: details.commercial_unlock,
    dag_update: details.dag_update,
    supersession_record: details.supersession_record,
    approval_status: "OWNER_REVIEW_REQUIRED",
    owner_review_topics: uniqueSorted(candidate.owner_review_topics.length
      ? candidate.owner_review_topics
      : (touchesGovernorControl(candidate) ? ["ARCHITECTURE_REPLACEMENT"] : [])),
    owner_approval: null,
    rationale: "Material scope is reviewable and cannot silently alter the roadmap.",
    reevaluation_trigger: null,
    created_at: iso(now),
    updated_at: iso(now),
    release_version: candidate.release_version
  };
  return validatePhaseAmendment(amendment);
}

function taskProposal(candidate, now) {
  return {
    contract_version: CONTRACT_VERSION,
    schema_version: SCHEMA_VERSION,
    proposal_id: `TASK-${candidate.candidate_id}`,
    candidate_id: candidate.candidate_id,
    actor: EXECUTION_MODEL,
    request_idempotency_key: sha256({ candidate_id: candidate.candidate_id, candidate_version: candidate.version, proposal: "BOUNDED_AUTO_EXECUTION" }),
    proposed_task_packet_id: `P${candidate.proposed_phase}-IMPROVEMENT-${candidate.deduplication_key_sha256.slice(0, 12).toUpperCase()}`,
    authorization: {
      automatic_execution: true,
      budget_units: candidate.budget_units,
      budget_verified: true,
      reversibility: "VERIFIED",
      deterministic_tests: candidate.deterministic_tests,
      verification: "REQUIRED",
      reconciliation: "REQUIRED",
      failure_behavior: "FAIL_CLOSED"
    },
    created_at: iso(now),
    release_version: candidate.release_version
  };
}

export function rankImprovementBacklog(candidates) {
  return candidates
    .map((candidate) => validateImprovementCandidate(candidate))
    .filter((candidate) => !CLOSED_STATUSES.has(candidate.status))
    .sort((left, right) => right.score.total - left.score.total || right.urgency - left.urgency || left.candidate_id.localeCompare(right.candidate_id))
    .map((candidate, index) => ({
      rank: index + 1,
      candidate_id: candidate.candidate_id,
      title: candidate.title,
      category: candidate.category,
      affected_capability: candidate.affected_capability,
      score: candidate.score.total,
      urgency: candidate.urgency,
      status: candidate.status,
      evidence_count: candidate.evidence.length,
      next_action: candidate.status === "AMENDMENT_ACCEPTED"
        ? "SCHEDULE_ACCEPTED_AMENDMENT"
        : requiresMaterialAmendment(candidate)
          ? "OWNER_REVIEW_OR_PHASE_AMENDMENT"
          : "BOUNDED_CORRECTION_POLICY_CHECK"
    }));
}

export function improvementEvidenceView(candidate) {
  validateImprovementCandidate(candidate);
  return {
    candidate,
    evidence_summary: {
      total: candidate.evidence.length,
      valid: candidate.evidence.filter((entry) => entry.valid).length,
      invalid: candidate.evidence.filter((entry) => !entry.valid).length,
      sources: uniqueSorted(candidate.evidence.map((entry) => entry.kind)),
      lineage_sha256: candidate.evidence_lineage_sha256
    },
    measured_impact: candidate.observed_impact,
    expected_outcome: candidate.outcome_target
  };
}

export function planImprovementCycle(candidates, policy, { now = new Date() } = {}) {
  validateImprovementPolicy(policy);
  const timestamp = iso(now);
  const reconciled = candidates.map((candidate) => reconcileImprovementCandidate(candidate, { now }));
  const closures = reconciled.filter((candidate, index) => candidate.status !== candidates[index].status);
  if (policy.stop_conditions.length > 0) {
    return { status: "IDLE", reason: "STOP_CONDITION", candidates: reconciled, closures, task_proposals: [], amendments: [], ranked_backlog: rankImprovementBacklog(reconciled), produced_at: timestamp };
  }
  if (policy.last_cycle_at !== null && new Date(now).getTime() - Date.parse(policy.last_cycle_at) < policy.quiet_period_hours * 3_600_000) {
    return { status: "IDLE", reason: "QUIET_PERIOD", candidates: reconciled, closures, task_proposals: [], amendments: [], ranked_backlog: rankImprovementBacklog(reconciled), produced_at: timestamp };
  }
  const ranked = reconciled
    .filter((candidate) => !CLOSED_STATUSES.has(candidate.status))
    .sort((left, right) => right.score.total - left.score.total || right.urgency - left.urgency || left.candidate_id.localeCompare(right.candidate_id));
  const taskProposals = [];
  const amendments = [];
  const updated = new Map(reconciled.map((candidate) => [candidate.candidate_id, candidate]));
  let budgetUsed = policy.active_budget_units;
  let activeCount = policy.active_candidate_ids.length;
  for (const candidate of ranked) {
    if (!PROCESSABLE_STATUSES.has(candidate.status) || policy.active_candidate_ids.includes(candidate.candidate_id)) continue;
    if (candidate.score.total < policy.minimum_score) continue;
    if (requiresMaterialAmendment(candidate)) {
      const amendment = buildPhaseAmendment(candidate, { now });
      amendments.push(amendment);
      updated.set(candidate.candidate_id, validateImprovementCandidate({ ...candidate, version: candidate.version + 1, status: "AMENDMENT_PROPOSED", rationale: "Material change requires owner-reviewed PhaseAmendment.", updated_at: timestamp }));
      continue;
    }
    const normalLimit = policy.maximum_active_budget_units - policy.emergency_repair_reserve_units;
    const budgetLimit = candidate.emergency_repair ? policy.maximum_active_budget_units : normalLimit;
    const eligible = candidate.risk === "LOW"
      && candidate.reversibility === "FULL"
      && candidate.deterministic_tests.length > 0
      && !candidate.product_defining
      && candidate.owner_review_topics.length === 0
      && !touchesGovernorControl(candidate)
      && activeCount < policy.maximum_active_candidates
      && budgetUsed + candidate.budget_units <= budgetLimit;
    if (!eligible) {
      updated.set(candidate.candidate_id, validateImprovementCandidate({ ...candidate, version: candidate.version + 1, status: "QUEUED", rationale: "Automatic execution is blocked by risk, reversibility, tests, active-work budget, or Governor self-modification policy.", updated_at: timestamp }));
      continue;
    }
    taskProposals.push(taskProposal(candidate, now));
    budgetUsed += candidate.budget_units;
    activeCount += 1;
    updated.set(candidate.candidate_id, validateImprovementCandidate({ ...candidate, version: candidate.version + 1, status: "AUTO_EXECUTION_ELIGIBLE", rationale: "Low-risk reversible correction passed deterministic test and budget policy.", updated_at: timestamp }));
  }
  const cycleCandidates = [...updated.values()];
  if (taskProposals.length === 0 && amendments.length === 0) {
    return { status: "IDLE", reason: "NO_WORTHWHILE_EVIDENCE_BACKED_WORK", candidates: cycleCandidates, closures, task_proposals: [], amendments: [], ranked_backlog: rankImprovementBacklog(cycleCandidates), produced_at: timestamp };
  }
  return {
    status: "PLANNED",
    reason: null,
    candidates: cycleCandidates,
    closures,
    task_proposals: taskProposals,
    amendments,
    ranked_backlog: rankImprovementBacklog(cycleCandidates),
    budget: {
      prior_active_units: policy.active_budget_units,
      planned_units: budgetUsed - policy.active_budget_units,
      maximum_active_units: policy.maximum_active_budget_units,
      emergency_reserve_units: policy.emergency_repair_reserve_units,
      remaining_units: policy.maximum_active_budget_units - budgetUsed
    },
    produced_at: timestamp
  };
}

export function decideImprovementCandidate(candidate, decision, { now = new Date() } = {}) {
  validateImprovementCandidate(candidate);
  if (!decision || typeof decision !== "object" || Array.isArray(decision)) throw new GovernorError("INVALID_IMPROVEMENT_DECISION", "Decision must be an object");
  const status = enumValue(decision.status, ["REJECTED", "DEFERRED", "QUEUED"], "decision.status");
  const rationale = requiredString(decision.rationale, "decision.rationale", 3);
  const reevaluationTrigger = status === "DEFERRED" ? requiredString(decision.reevaluation_trigger, "decision.reevaluation_trigger", 3) : null;
  return validateImprovementCandidate({ ...candidate, version: candidate.version + 1, status, rationale, reevaluation_trigger: reevaluationTrigger, updated_at: iso(now) });
}

export function recordImprovementOutcome(candidate, measurement, { now = new Date(), releaseVersion = candidate.release_version } = {}) {
  validateImprovementCandidate(candidate);
  if (!measurement || typeof measurement !== "object" || Array.isArray(measurement)) throw new GovernorError("INVALID_OUTCOME", "Outcome measurement must be an object");
  if (!["AUTO_EXECUTION_ELIGIBLE", "AMENDMENT_ACCEPTED"].includes(candidate.status)) throw new GovernorError("IMPROVEMENT_NOT_IMPLEMENTABLE", "Only an authorized improvement may record an implementation outcome");
  if (measurement.implementation_release_sha !== releaseVersion || !/^[a-f0-9]{40}$/.test(measurement.implementation_release_sha)) {
    throw new GovernorError("UNVERIFIED_IMPROVEMENT_RELEASE", "Outcome measurement must bind the currently verified production release SHA");
  }
  if (measurement.metric !== candidate.outcome_target.metric) throw new GovernorError("OUTCOME_METRIC_MISMATCH", "Outcome measurement must use the candidate target metric");
  const observed = measurement.observed_value ?? null;
  const baseline = candidate.outcome_target.baseline_value;
  const delta = observed === null || baseline === null ? null : observed - baseline;
  let result = "UNAVAILABLE";
  if (delta !== null) {
    if (candidate.outcome_target.direction === "INCREASE") result = delta > 0 ? "IMPROVED" : delta === 0 ? "UNCHANGED" : "REGRESSED";
    if (candidate.outcome_target.direction === "DECREASE") result = delta < 0 ? "IMPROVED" : delta === 0 ? "UNCHANGED" : "REGRESSED";
    if (candidate.outcome_target.direction === "MAINTAIN") result = Math.abs(delta) <= Math.abs(candidate.outcome_target.expected_delta) ? "IMPROVED" : "REGRESSED";
  }
  const evidence = normalizeEvidence(measurement.evidence, now);
  const outcome = {
    contract_version: CONTRACT_VERSION,
    schema_version: SCHEMA_VERSION,
    outcome_id: `OUTCOME-${candidate.candidate_id}-${candidate.version}`,
    candidate_id: candidate.candidate_id,
    tenant_id: candidate.tenant_id,
    organization_id: candidate.organization_id,
    business_id: candidate.business_id,
    actor: EXECUTION_MODEL,
    request_idempotency_key: sha256({ candidate_id: candidate.candidate_id, version: candidate.version, metric: measurement.metric, observed }),
    implementation_release_sha: measurement.implementation_release_sha,
    metric: measurement.metric,
    baseline_value: baseline,
    observed_value: observed,
    delta,
    result,
    evidence,
    measured_at: iso(now),
    release_version: releaseVersion
  };
  validateImprovementOutcome(outcome);
  const updatedCandidate = validateImprovementCandidate({
    ...candidate,
    version: candidate.version + 1,
    status: "IMPLEMENTED",
    rationale: result === "UNAVAILABLE" ? "Implementation recorded; targeted outcome remains unmeasured." : `Targeted outcome result: ${result}.`,
    updated_at: iso(now),
    release_version: releaseVersion
  });
  return { candidate: updatedCandidate, outcome };
}

export function applyAcceptedPhaseAmendment(amendment, phaseDag, phaseContract) {
  validatePhaseAmendment(amendment);
  if (amendment.approval_status !== "ACCEPTED_BY_OWNER" || amendment.owner_approval?.owner_attested !== true) {
    throw new GovernorError("OWNER_APPROVAL_REQUIRED", "A PhaseAmendment cannot change the roadmap without an owner-attested acceptance");
  }
  if (!phaseDag || typeof phaseDag !== "object" || !Array.isArray(phaseDag.phases) || !phaseDag.phases.includes(amendment.dag_update.target_phase)) {
    throw new GovernorError("INVALID_PHASE_DAG", "PhaseAmendment target phase must exist in the current DAG");
  }
  if (amendment.dag_update.dependencies.some((dependency) => !phaseDag.phases.includes(dependency) || dependency >= amendment.dag_update.target_phase)) {
    throw new GovernorError("INVALID_PHASE_DAG", "PhaseAmendment dependencies must be existing prior phases");
  }
  if (!phaseContract || typeof phaseContract !== "object" || phaseContract.phase !== amendment.dag_update.target_phase) {
    throw new GovernorError("INVALID_PHASE_CONTRACT", "PhaseAmendment must bind the target phase contract");
  }
  const updatedDag = structuredClone(phaseDag);
  updatedDag.dependencies[String(amendment.dag_update.target_phase)] = amendment.dag_update.dependencies;
  const amendmentEntry = {
    amendment_id: amendment.amendment_id,
    candidate_id: amendment.candidate_id,
    added_requirements: amendment.scope_delta.added_requirements,
    removed_requirements: amendment.scope_delta.removed_requirements,
    affected_paths: amendment.scope_delta.affected_paths,
    affected_contracts: amendment.affected_contracts,
    acceptance_criteria: amendment.acceptance_criteria,
    commercial_unlock: amendment.commercial_unlock,
    supersession_record: amendment.supersession_record,
    owner_decision_id: amendment.owner_approval.decision_id,
    accepted_at: amendment.owner_approval.approved_at
  };
  const existingAmendments = Array.isArray(phaseContract.accepted_amendments) ? phaseContract.accepted_amendments : [];
  if (existingAmendments.some((entry) => entry.amendment_id === amendment.amendment_id)) {
    throw new GovernorError("AMENDMENT_ALREADY_APPLIED", `PhaseAmendment ${amendment.amendment_id} was already applied`);
  }
  const updatedContract = {
    ...structuredClone(phaseContract),
    accepted_amendments: [...existingAmendments, amendmentEntry]
  };
  return {
    phase_dag: updatedDag,
    phase_contract: updatedContract,
    applied_changes: {
      phase: amendment.phase,
      affected_contracts: amendment.affected_contracts,
      acceptance_criteria: amendment.acceptance_criteria,
      commercial_unlock: amendment.commercial_unlock,
      supersession_record: amendment.supersession_record
    }
  };
}

export async function loadImprovementCandidates(repositoryRoot) {
  const directory = governorPath(repositoryRoot, CANDIDATE_DIRECTORY);
  let names;
  try {
    names = await readdir(directory);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const candidates = [];
  for (const name of names.filter((entry) => entry.endsWith(".json")).sort()) {
    candidates.push(validateImprovementCandidate(await readJson(governorPath(repositoryRoot, `${CANDIDATE_DIRECTORY}/${name}`))));
  }
  return candidates;
}

export async function readImprovementCandidate(repositoryRoot, candidateId) {
  const safeCandidateId = safeRecordId(candidateId, "candidate_id");
  const candidate = await readOptionalJson(governorPath(repositoryRoot, `${CANDIDATE_DIRECTORY}/${safeCandidateId}.json`));
  if (!candidate) throw new GovernorError("IMPROVEMENT_CANDIDATE_NOT_FOUND", `ImprovementCandidate ${candidateId} does not exist`);
  return validateImprovementCandidate(candidate);
}

export async function persistImprovementCandidate(repositoryRoot, candidate) {
  validateImprovementCandidate(candidate);
  safeRecordId(candidate.candidate_id, "candidate_id");
  await writeJsonAtomic(governorPath(repositoryRoot, `${CANDIDATE_DIRECTORY}/${candidate.candidate_id}.json`), candidate);
  return candidate;
}

export async function persistImprovementCycle(repositoryRoot, cycle, cycleId) {
  for (const amendment of cycle.amendments) {
    validatePhaseAmendment(amendment);
    safeRecordId(amendment.amendment_id, "amendment_id");
    await writeJsonAtomic(governorPath(repositoryRoot, `${AMENDMENT_DIRECTORY}/${amendment.amendment_id}.json`), amendment);
  }
  for (const proposal of cycle.task_proposals) {
    safeRecordId(proposal.proposal_id, "proposal_id");
    await writeJsonAtomic(governorPath(repositoryRoot, `${TASK_PROPOSAL_DIRECTORY}/${proposal.proposal_id}.json`), proposal);
  }
  for (const candidate of cycle.candidates) await persistImprovementCandidate(repositoryRoot, candidate);
  safeRecordId(cycleId, "cycle_id");
  await writeJsonAtomic(governorPath(repositoryRoot, `${CYCLE_DIRECTORY}/${cycleId}.json`), cycle);
  return cycle;
}

export async function loadImprovementTaskProposals(repositoryRoot) {
  const directory = governorPath(repositoryRoot, TASK_PROPOSAL_DIRECTORY);
  let names;
  try {
    names = await readdir(directory);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const proposals = [];
  for (const name of names.filter((entry) => entry.endsWith(".json")).sort()) {
    const proposal = await readJson(governorPath(repositoryRoot, `${TASK_PROPOSAL_DIRECTORY}/${name}`));
    safeRecordId(proposal.proposal_id, "proposal_id");
    safeRecordId(proposal.candidate_id, "candidate_id");
    if (proposal.contract_version !== CONTRACT_VERSION || proposal.schema_version !== SCHEMA_VERSION) throw new GovernorError("UNSUPPORTED_CONTRACT_VERSION", "Improvement task proposal version is unsupported");
    if (proposal.actor !== EXECUTION_MODEL) throw new GovernorError("UNAUTHORIZED_PROPOSAL", "Improvement task proposals require the sole execution actor");
    if (!/^[a-f0-9]{64}$/.test(proposal.request_idempotency_key)) throw new GovernorError("INVALID_SHA256", "Improvement task proposal requires an idempotency digest");
    if (proposal.authorization?.automatic_execution !== true || proposal.authorization?.verification !== "REQUIRED" || proposal.authorization?.reconciliation !== "REQUIRED" || proposal.authorization?.failure_behavior !== "FAIL_CLOSED") {
      throw new GovernorError("INVALID_TASK_PROPOSAL", "Improvement task proposals must retain bounded verification, reconciliation, and fail-closed authorization");
    }
    proposals.push(proposal);
  }
  return proposals;
}

export async function persistImprovementOutcome(repositoryRoot, outcome) {
  validateImprovementOutcome(outcome);
  safeRecordId(outcome.outcome_id, "outcome_id");
  await writeJsonAtomic(governorPath(repositoryRoot, `${OUTCOME_DIRECTORY}/${outcome.outcome_id}.json`), outcome);
  return outcome;
}

export async function loadImprovementPolicy(repositoryRoot) {
  return validateImprovementPolicy(await readJson(governorPath(repositoryRoot, IMPROVEMENT_POLICY_FILE)));
}
