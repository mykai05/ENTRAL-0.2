import path from "node:path";

export const CONTRACT_VERSION = "1.0.0";
export const SCHEMA_VERSION = 1;
export const EXECUTION_MODEL = "CODEX_5_6_SOL_XHIGH";
export const PROGRAM_VERSION = "ENTRAL-V9-CODEX-XHIGH-GPT-PRO-REVIEW";
export const PROGRAM_STATUSES = Object.freeze([
  "ACTIVE",
  "BLOCKED",
  "STOPPED",
  "WAITING_FOR_GPT_PRO_REVIEW",
  "COMPLETE"
]);
export const OWNER_ESCALATION_CATEGORIES = Object.freeze([
  "CREDENTIAL_OR_MFA",
  "DENIED_EXTERNAL_ACCESS",
  "MATERIAL_SPENDING",
  "IRREVERSIBLE_EXTERNAL_ACT",
  "PRICING_LEGAL_OR_DATA_RIGHTS",
  "PRODUCT_DEFINING_AMBIGUITY",
  "PROTOCOL_REQUIRED_REVIEW"
]);
export const CONDITIONAL_REVIEW_TRIGGERS = Object.freeze([
  "PRODUCT_DEFINITION_AMBIGUITY",
  "MATERIAL_PHASE_AMENDMENT",
  "PUBLIC_CLAIM_OR_PRICING_CHANGE",
  "SEVERE_SECURITY_OR_DATA_RISK",
  "ARCHITECTURE_REPLACEMENT",
  "REPEATED_CRITICAL_FAILURE"
]);
export const REVIEW_VERDICTS = Object.freeze([
  "PASS",
  "PASS_WITH_BINDING_CORRECTIONS",
  "REJECT_AND_REPAIR",
  "OWNER_DECISION_REQUIRED"
]);

const SHA40 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,199}$/;
const TASK_ID = /^P[0-9]+-[A-Z0-9-]+$/;
const SUSPICIOUS_SECRET = /(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:password|api[_-]?key|authorization)\s*[:=]\s*[^\s]{8,})/i;

export class GovernorError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = "GovernorError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new GovernorError(code, message, details);
}

export function assertRecord(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_CONTRACT", `${field} must be an object`);
  }
}

export function assertVersion(value, field = "contract") {
  assertRecord(value, field);
  if (value.contract_version !== CONTRACT_VERSION || value.schema_version !== SCHEMA_VERSION) {
    fail("UNSUPPORTED_CONTRACT_VERSION", `${field} must use contract ${CONTRACT_VERSION} schema ${SCHEMA_VERSION}`);
  }
}

function assertString(value, field, minimum = 1, maximum = 10_000) {
  if (typeof value !== "string" || value.trim().length < minimum || value.length > maximum) {
    fail("INVALID_CONTRACT", `${field} must be a string between ${minimum} and ${maximum} characters`);
  }
}

function assertInteger(value, field, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fail("INVALID_CONTRACT", `${field} must be an integer between ${minimum} and ${maximum}`);
  }
}

function assertBoolean(value, field) {
  if (typeof value !== "boolean") fail("INVALID_CONTRACT", `${field} must be boolean`);
}

function assertIso(value, field) {
  assertString(value, field);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || Number.isNaN(Date.parse(value))) {
    fail("INVALID_TIMESTAMP", `${field} must be a millisecond-precision UTC timestamp`);
  }
}

function assertEnum(value, allowed, field) {
  if (!allowed.includes(value)) fail("INVALID_ENUM", `${field} must be one of ${allowed.join(", ")}`);
}

function assertArray(value, field, { minimum = 0, maximum = 10_000, unique = false } = {}) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    fail("INVALID_CONTRACT", `${field} must contain between ${minimum} and ${maximum} entries`);
  }
  if (unique && new Set(value).size !== value.length) {
    fail("DUPLICATE_CONTRACT_VALUE", `${field} cannot contain duplicate entries`);
  }
}

function assertStringArray(value, field, options = {}) {
  assertArray(value, field, options);
  value.forEach((entry, index) => assertString(entry, `${field}[${index}]`, 1, 2_000));
}

function assertSha40(value, field) {
  if (typeof value !== "string" || !SHA40.test(value)) fail("INVALID_GIT_SHA", `${field} must be a lowercase full Git SHA`);
}

function assertSha256(value, field) {
  if (typeof value !== "string" || !SHA256.test(value)) fail("INVALID_SHA256", `${field} must be a lowercase SHA-256 digest`);
}

function assertId(value, field) {
  if (typeof value !== "string" || !ID.test(value)) fail("INVALID_ID", `${field} is not a valid identifier`);
}

function assertRelativePath(value, field) {
  assertString(value, field, 1, 1_000);
  const normalized = value.replaceAll("\\", "/");
  if (path.isAbsolute(value) || normalized === ".." || normalized.startsWith("../") || normalized.includes("/../") || normalized.includes("\0")) {
    fail("UNSAFE_PATH", `${field} must stay within the repository`);
  }
}

function assertSafeTextTree(value, field = "document") {
  if (typeof value === "string") {
    if (SUSPICIOUS_SECRET.test(value)) fail("SECRET_IN_REVIEW_PACKET", `${field} contains credential-shaped content`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertSafeTextTree(entry, `${field}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      if (/^(password|secret|token|api_key|authorization)$/i.test(key)) {
        fail("SECRET_FIELD_FORBIDDEN", `${field}.${key} is not allowed`);
      }
      assertSafeTextTree(entry, `${field}.${key}`);
    }
  }
}

export function assertExecutionActor(actor) {
  if (actor !== EXECUTION_MODEL) {
    fail("UNAUTHORIZED_EXECUTION_MODEL", `Mutations require ${EXECUTION_MODEL}`);
  }
}

export function validateProgramDefinition(value) {
  assertVersion(value, "program");
  assertString(value.program_version, "program.program_version");
  if (value.execution_model !== EXECUTION_MODEL) fail("EXECUTION_MODEL_MISMATCH", `program.execution_model must be ${EXECUTION_MODEL}`);
  if (value.review_model !== "GPT_5_6_PRO_OWNER_INVOKED") fail("REVIEW_MODEL_MISMATCH", "Review must remain owner-invoked GPT-5.6 Pro");
  assertArray(value.phases, "program.phases", { minimum: 1, unique: true });
  value.phases.forEach((phase, index) => assertInteger(phase, `program.phases[${index}]`, 1));
  if ([...value.phases].sort((a, b) => a - b).some((phase, index) => phase !== value.phases[index])) {
    fail("INVALID_PHASE_ORDER", "program.phases must be strictly increasing");
  }
  assertRecord(value.dependencies, "program.dependencies");
  for (const phase of value.phases) {
    const dependencies = value.dependencies[String(phase)];
    assertArray(dependencies, `program.dependencies.${phase}`, { minimum: 1, unique: true });
    dependencies.forEach((dependency, index) => assertInteger(dependency, `program.dependencies.${phase}[${index}]`, 1));
    if (dependencies.some((dependency) => dependency >= phase)) fail("INVALID_PHASE_DAG", `Phase ${phase} has a non-prior dependency`);
  }
  assertArray(value.mandatory_review_phases, "program.mandatory_review_phases", { unique: true });
  if (value.mandatory_review_phases.some((phase) => !value.phases.includes(phase))) fail("INVALID_REVIEW_PHASE", "Mandatory review phase is absent from the program");
  assertStringArray(value.conditional_review_triggers, "program.conditional_review_triggers", { unique: true });
  if (value.conditional_review_triggers.some((trigger) => !CONDITIONAL_REVIEW_TRIGGERS.includes(trigger))) {
    fail("INVALID_REVIEW_TRIGGER", "Program contains an unsupported conditional review trigger");
  }
  return value;
}

export function validateProgramState(value) {
  assertVersion(value, "program_state");
  if (value.program_version !== PROGRAM_VERSION) fail("PROGRAM_VERSION_MISMATCH", `program_state.program_version must be ${PROGRAM_VERSION}`);
  if (value.execution_model !== EXECUTION_MODEL) fail("EXECUTION_MODEL_MISMATCH", `program_state.execution_model must be ${EXECUTION_MODEL}`);
  assertEnum(value.status, PROGRAM_STATUSES, "program_state.status");
  if (value.current_phase !== null) assertInteger(value.current_phase, "program_state.current_phase", 1);
  assertArray(value.certified_phases, "program_state.certified_phases", { unique: true });
  value.certified_phases.forEach((phase, index) => assertInteger(phase, `program_state.certified_phases[${index}]`, 1));
  for (const field of ["current_task_packet_id", "last_task_packet_id"]) {
    if (value[field] !== null && (typeof value[field] !== "string" || !TASK_ID.test(value[field]))) fail("INVALID_TASK_ID", `program_state.${field} is invalid`);
  }
  if (value.task_status !== null) assertEnum(value.task_status, ["READY", "CLAIMED", "STOPPED"], "program_state.task_status");
  if (value.latest_execution_result !== null) validateExecutionResult(value.latest_execution_result);
  assertSha40(value.latest_verified_main_sha, "program_state.latest_verified_main_sha");
  assertRecord(value.latest_production_release, "program_state.latest_production_release");
  if (value.blocked_reason !== null) assertRecord(value.blocked_reason, "program_state.blocked_reason");
  assertInteger(value.retry_count, "program_state.retry_count");
  assertString(value.next_action, "program_state.next_action");
  if (value.active_write_lease !== null) {
    const lease = value.active_write_lease;
    assertVersion(lease, "program_state.active_write_lease");
    assertId(lease.lease_id, "program_state.active_write_lease.lease_id");
    if (typeof lease.task_packet_id !== "string" || !TASK_ID.test(lease.task_packet_id)) fail("INVALID_TASK_ID", "program_state.active_write_lease.task_packet_id is invalid");
    assertString(lease.owner, "program_state.active_write_lease.owner");
    assertExecutionActor(lease.actor);
    assertStringArray(lease.scope, "program_state.active_write_lease.scope", { minimum: 1, unique: true });
    for (const field of ["acquired_at", "heartbeat_at", "expires_at"]) assertIso(lease[field], `program_state.active_write_lease.${field}`);
  }
  if (value.latest_checkpoint !== null) validateSessionCheckpoint(value.latest_checkpoint);
  if (value.review_state !== null) assertRecord(value.review_state, "program_state.review_state");
  assertStringArray(value.conditional_review_triggers, "program_state.conditional_review_triggers", { unique: true });
  if (value.conditional_review_triggers.some((trigger) => !CONDITIONAL_REVIEW_TRIGGERS.includes(trigger))) fail("INVALID_REVIEW_TRIGGER", "ProgramState contains an unsupported conditional review trigger");
  assertInteger(value.task_attempts, "program_state.task_attempts");
  assertStringArray(value.result_fingerprints, "program_state.result_fingerprints");
  value.result_fingerprints.forEach((fingerprint, index) => assertSha256(fingerprint, `program_state.result_fingerprints[${index}]`));
  assertInteger(value.version, "program_state.version", 1);
  assertInteger(value.event_count, "program_state.event_count", 1);
  if (value.version !== value.event_count) fail("STATE_VERSION_MISMATCH", "ProgramState version must equal its event count");
  assertSha256(value.event_head_hash, "program_state.event_head_hash");
  if (value.task_deadline_at !== undefined) assertIso(value.task_deadline_at, "program_state.task_deadline_at");
  if (value.pending_release_manifest !== undefined && value.pending_release_manifest !== null) validateReleaseManifest(value.pending_release_manifest);
  assertIso(value.updated_at, "program_state.updated_at");
  return value;
}

export function validateGovernorEvent(value) {
  assertVersion(value, "governor_event");
  assertInteger(value.sequence, "governor_event.sequence", 1);
  assertId(value.event_id, "governor_event.event_id");
  assertString(value.event_type, "governor_event.event_type");
  assertExecutionActor(value.actor);
  assertString(value.subject_id, "governor_event.subject_id");
  for (const field of ["tenant_id", "organization_id", "business_id"]) {
    if (value[field] !== null) assertString(value[field], `governor_event.${field}`);
  }
  assertSha256(value.request_idempotency_key, "governor_event.request_idempotency_key");
  assertInteger(value.prior_version, "governor_event.prior_version");
  assertInteger(value.resulting_version, "governor_event.resulting_version", 1);
  if (value.resulting_version !== value.prior_version + 1 || value.sequence !== value.resulting_version) fail("INVALID_EVENT_VERSION", "GovernorEvent sequence and versions must advance exactly once");
  assertSha256(value.transition_evidence_sha256, "governor_event.transition_evidence_sha256");
  assertSha40(value.release_version, "governor_event.release_version");
  assertRecord(value.payload, "governor_event.payload");
  assertSha256(value.payload_sha256, "governor_event.payload_sha256");
  assertSha256(value.previous_hash, "governor_event.previous_hash");
  assertSha256(value.event_hash, "governor_event.event_hash");
  assertIso(value.created_at, "governor_event.created_at");
  return value;
}

export function validateTaskPacket(value) {
  assertVersion(value, "task_packet");
  if (typeof value.task_packet_id !== "string" || !TASK_ID.test(value.task_packet_id)) fail("INVALID_TASK_ID", "task_packet.task_packet_id is invalid");
  assertInteger(value.phase, "task_packet.phase", 1);
  assertString(value.objective, "task_packet.objective", 12);
  assertStringArray(value.scope, "task_packet.scope", { minimum: 1, unique: true });
  value.scope.forEach((entry, index) => assertRelativePath(entry.replace(/\*+$/, "scope"), `task_packet.scope[${index}]`));
  for (const field of ["likely_modules", "relevant_adrs", "relevant_source_paths"]) {
    assertStringArray(value[field], `task_packet.${field}`, { unique: true });
    value[field].forEach((entry, index) => assertRelativePath(entry, `task_packet.${field}[${index}]`));
  }
  for (const field of ["preserved_behavior", "exclusions", "acceptance_tests", "release_requirements", "owner_escalation_conditions"]) {
    assertStringArray(value[field], `task_packet.${field}`, { minimum: 1, unique: true });
  }
  if (value.owner_escalation_conditions.some((category) => !OWNER_ESCALATION_CATEGORIES.includes(category))) {
    fail("INVALID_OWNER_ESCALATION", "TaskPacket contains a non-authorized owner escalation condition");
  }
  assertRecord(value.usage_budget, "task_packet.usage_budget");
  for (const field of ["maximum_wall_time_minutes", "maximum_attempts", "maximum_retries", "stagnation_limit", "checkpoint_at_tokens_remaining", "release_repair_reserve_tokens"]) {
    assertInteger(value.usage_budget[field], `task_packet.usage_budget.${field}`, 1);
  }
  if (value.usage_budget.maximum_attempts <= value.usage_budget.maximum_retries) {
    fail("INVALID_USAGE_BUDGET", "maximum_attempts must exceed maximum_retries");
  }
  assertRecord(value.policy, "task_packet.policy");
  assertBoolean(value.policy.future_phase_compatibility_required, "task_packet.policy.future_phase_compatibility_required");
  assertBoolean(value.policy.work_created_to_stay_active, "task_packet.policy.work_created_to_stay_active");
  assertStringArray(value.policy.speculative_refactors, "task_packet.policy.speculative_refactors");
  assertStringArray(value.policy.duplicate_systems, "task_packet.policy.duplicate_systems");
  if (value.policy.future_phase_compatibility_required || value.policy.work_created_to_stay_active || value.policy.speculative_refactors.length || value.policy.duplicate_systems.length) {
    fail("OVERENGINEERING_POLICY_VIOLATION", "TaskPacket requests speculative, duplicate, future-phase, or stay-active work");
  }
  assertIso(value.created_at, "task_packet.created_at");
  return value;
}

export function validateExecutionResult(value) {
  assertVersion(value, "execution_result");
  assertId(value.execution_result_id, "execution_result.execution_result_id");
  if (typeof value.task_packet_id !== "string" || !TASK_ID.test(value.task_packet_id)) fail("INVALID_TASK_ID", "execution_result.task_packet_id is invalid");
  assertInteger(value.phase, "execution_result.phase", 1);
  assertEnum(value.outcome, ["PASSED", "FAILED", "BLOCKED"], "execution_result.outcome");
  if (value.commit_sha !== null) assertSha40(value.commit_sha, "execution_result.commit_sha");
  if (value.outcome === "PASSED" && value.commit_sha === null) fail("MISSING_RESULT_COMMIT", "Passed execution requires an exact commit SHA");
  assertStringArray(value.changed_files, "execution_result.changed_files", { unique: true });
  assertArray(value.tests, "execution_result.tests");
  value.tests.forEach((test, index) => {
    assertRecord(test, `execution_result.tests[${index}]`);
    assertString(test.command, `execution_result.tests[${index}].command`);
    assertEnum(test.status, ["PASSED", "FAILED", "SKIPPED"], `execution_result.tests[${index}].status`);
    if (test.status === "SKIPPED") assertString(test.reason, `execution_result.tests[${index}].reason`);
  });
  assertStringArray(value.unresolved_failures, "execution_result.unresolved_failures");
  if (value.outcome === "PASSED" && (value.unresolved_failures.length || value.tests.some((test) => test.status !== "PASSED"))) {
    fail("DISHONEST_EXECUTION_RESULT", "Passed execution cannot contain failed, skipped, or unresolved verification");
  }
  assertRecord(value.deployment_state, "execution_result.deployment_state");
  assertSha256(value.result_fingerprint, "execution_result.result_fingerprint");
  assertIso(value.completed_at, "execution_result.completed_at");
  return value;
}

export function validateSessionCheckpoint(value) {
  assertVersion(value, "checkpoint");
  assertId(value.checkpoint_id, "checkpoint.checkpoint_id");
  assertInteger(value.phase, "checkpoint.phase", 1);
  if (value.task_packet_id !== null && (typeof value.task_packet_id !== "string" || !TASK_ID.test(value.task_packet_id))) fail("INVALID_TASK_ID", "checkpoint.task_packet_id is invalid");
  assertString(value.branch, "checkpoint.branch");
  assertString(value.worktree, "checkpoint.worktree");
  assertSha40(value.commit_sha, "checkpoint.commit_sha");
  assertStringArray(value.changed_files, "checkpoint.changed_files", { unique: true });
  assertArray(value.tests, "checkpoint.tests");
  assertStringArray(value.unresolved_failures, "checkpoint.unresolved_failures");
  assertRecord(value.deployment_state, "checkpoint.deployment_state");
  assertStringArray(value.blockers, "checkpoint.blockers");
  assertRecord(value.rollback_point, "checkpoint.rollback_point");
  assertString(value.next_action, "checkpoint.next_action");
  assertIso(value.created_at, "checkpoint.created_at");
  return value;
}

export function validateOwnerEscalation(value) {
  assertVersion(value, "owner_escalation");
  assertId(value.escalation_id, "owner_escalation.escalation_id");
  assertEnum(value.category, OWNER_ESCALATION_CATEGORIES, "owner_escalation.category");
  assertString(value.reason, "owner_escalation.reason");
  assertStringArray(value.evidence, "owner_escalation.evidence");
  assertString(value.requested_action, "owner_escalation.requested_action");
  assertIso(value.created_at, "owner_escalation.created_at");
  return value;
}

export function validateReleaseManifest(value) {
  assertVersion(value, "release_manifest");
  assertInteger(value.phase, "release_manifest.phase", 1);
  assertString(value.repository, "release_manifest.repository");
  assertSha40(value.main_sha, "release_manifest.main_sha");
  assertString(value.release_tag, "release_manifest.release_tag");
  if (value.tests_passed !== true || value.protected_main_checks_passed !== true || value.migrations_verified !== true) {
    fail("FAILED_RELEASE_GATE", "Tests, protected-main checks, and migrations must be verified before certification");
  }
  assertArray(value.deployments, "release_manifest.deployments", { minimum: 3, maximum: 3 });
  const roles = new Set();
  const deploymentIds = new Set();
  value.deployments.forEach((deployment, index) => {
    assertRecord(deployment, `release_manifest.deployments[${index}]`);
    assertString(deployment.provider, `release_manifest.deployments[${index}].provider`);
    assertString(deployment.deployment_id, `release_manifest.deployments[${index}].deployment_id`);
    assertEnum(deployment.role, ["FRONTEND", "API", "WORKER"], `release_manifest.deployments[${index}].role`);
    assertEnum(deployment.status, ["READY"], `release_manifest.deployments[${index}].status`);
    assertSha40(deployment.deployed_commit_sha, `release_manifest.deployments[${index}].deployed_commit_sha`);
    if (deployment.deployed_commit_sha !== value.main_sha) fail("DEPLOYMENT_SHA_MISMATCH", "Every deployment must use the exact main SHA");
    if (deploymentIds.has(deployment.deployment_id)) fail("DUPLICATE_DEPLOYMENT", "Release deployment IDs must be unique");
    deploymentIds.add(deployment.deployment_id);
    roles.add(deployment.role);
  });
  if (roles.size !== 3 || ["FRONTEND", "API", "WORKER"].some((role) => !roles.has(role))) fail("INCOMPLETE_DEPLOYMENT_SET", "Release must bind exactly one frontend, API, and worker deployment");
  assertArray(value.migrations, "release_manifest.migrations", { minimum: 1 });
  value.migrations.forEach((migration, index) => {
    assertRecord(migration, `release_manifest.migrations[${index}]`);
    assertString(migration.name, `release_manifest.migrations[${index}].name`);
    assertEnum(migration.status, ["VERIFIED", "NO_SCHEMA_CHANGE"], `release_manifest.migrations[${index}].status`);
    assertString(migration.readback, `release_manifest.migrations[${index}].readback`);
  });
  for (const field of ["authenticated_smoke", "production_readback", "rollback_point"]) assertRecord(value[field], `release_manifest.${field}`);
  if (value.authenticated_smoke.status !== "PASSED" || value.production_readback.status !== "PASSED") fail("FAILED_PRODUCTION_READBACK", "Authenticated smoke and production readback must pass");
  assertSha256(value.authenticated_smoke.receipt_sha256, "release_manifest.authenticated_smoke.receipt_sha256");
  assertSha256(value.production_readback.receipt_sha256, "release_manifest.production_readback.receipt_sha256");
  assertStringArray(value.production_readback.blockers, "release_manifest.production_readback.blockers");
  if (value.production_readback.blockers.length) fail("PRODUCTION_BLOCKERS_REMAIN", "Production readback cannot retain blockers");
  if (value.production_readback.main_sha !== value.main_sha) fail("READBACK_SHA_MISMATCH", "Production readback must identify the exact main SHA");
  assertEnum(value.rollback_point.status, ["AVAILABLE", "RESTORE_VERIFIED"], "release_manifest.rollback_point.status");
  assertString(value.rollback_point.reference, "release_manifest.rollback_point.reference");
  assertIso(value.recorded_at, "release_manifest.recorded_at");
  return value;
}

export function validateReviewRequest(value, program) {
  assertVersion(value, "review_request");
  assertId(value.checkpoint_id, "review_request.checkpoint_id");
  assertString(value.reason, "review_request.reason");
  assertInteger(value.phase, "review_request.phase", 1);
  if (typeof value.task_packet_id !== "string" || !TASK_ID.test(value.task_packet_id)) fail("INVALID_TASK_ID", "review_request.task_packet_id is invalid");
  assertString(value.repository, "review_request.repository");
  assertSha40(value.source_commit_sha, "review_request.source_commit_sha");
  for (const field of ["production_deployments", "migrations", "acceptance_gates", "test_results", "alternatives", "risks", "evidence"]) assertArray(value[field], `review_request.${field}`);
  assertArray(value.diffs, "review_request.diffs", { minimum: 1 });
  value.diffs.forEach((diff, index) => {
    assertRecord(diff, `review_request.diffs[${index}]`);
    assertRelativePath(diff.path, `review_request.diffs[${index}].path`);
    if (!value.changed_files.includes(diff.path)) fail("REVIEW_DIFF_PATH_MISMATCH", "Every review diff must identify a changed_files path");
    assertSha40(diff.base_commit_sha, `review_request.diffs[${index}].base_commit_sha`);
    assertSha40(diff.head_commit_sha, `review_request.diffs[${index}].head_commit_sha`);
    if (diff.head_commit_sha !== value.source_commit_sha) fail("REVIEW_DIFF_COMMIT_MISMATCH", "Every review diff must terminate at source_commit_sha");
    assertString(diff.diff_reference, `review_request.diffs[${index}].diff_reference`);
    assertSha256(diff.content_sha256, `review_request.diffs[${index}].content_sha256`);
  });
  for (const field of ["changed_files", "unresolved_questions"]) assertStringArray(value[field], `review_request.${field}`, { unique: true });
  assertString(value.recommendation, "review_request.recommendation");
  assertString(value.requested_decision, "review_request.requested_decision");
  assertIso(value.created_at, "review_request.created_at");
  const mandatory = program.mandatory_review_phases.includes(value.phase);
  const conditional = CONDITIONAL_REVIEW_TRIGGERS.includes(value.reason);
  if (!mandatory && !conditional) fail("REVIEW_NOT_REQUIRED", "Review requests require a mandatory phase or defined conditional trigger");
  assertSafeTextTree(value, "review_request");
  return value;
}

export function validateReviewVerdict(value) {
  assertVersion(value, "review_verdict");
  assertId(value.checkpoint_id, "review_verdict.checkpoint_id");
  assertInteger(value.phase, "review_verdict.phase", 1);
  assertSha40(value.reviewed_commit_sha, "review_verdict.reviewed_commit_sha");
  assertSha40(value.verdict_commit_sha, "review_verdict.verdict_commit_sha");
  assertEnum(value.verdict, REVIEW_VERDICTS, "review_verdict.verdict");
  assertStringArray(value.binding_corrections, "review_verdict.binding_corrections");
  if (value.verdict === "PASS_WITH_BINDING_CORRECTIONS" && value.binding_corrections.length === 0) fail("MISSING_BINDING_CORRECTIONS", "Conditional pass requires binding corrections");
  assertString(value.rationale, "review_verdict.rationale");
  assertStringArray(value.evidence_reviewed, "review_verdict.evidence_reviewed");
  if (value.owner_attested !== true) fail("UNATTESTED_REVIEW", "The owner must attest the externally supplied verdict");
  assertIso(value.reviewed_at, "review_verdict.reviewed_at");
  assertSafeTextTree(value, "review_verdict");
  return value;
}

function validateSimpleRecord(value, name, required) {
  assertVersion(value, name);
  for (const field of required) {
    if (!(field in value)) fail("INVALID_CONTRACT", `${name}.${field} is required`);
  }
  assertSafeTextTree(value, name);
  return value;
}

export function validateNamedContract(name, value, context = {}) {
  switch (name) {
    case "ProgramState": return validateProgramState(value);
    case "TaskPacket": return validateTaskPacket(value);
    case "ExecutionResult": return validateExecutionResult(value);
    case "ReleaseManifest": return validateReleaseManifest(value);
    case "OwnerEscalation": return validateOwnerEscalation(value);
    case "SessionCheckpoint": return validateSessionCheckpoint(value);
    case "GPTProReviewRequest": return validateReviewRequest(value, context.program);
    case "ProReviewVerdict": return validateReviewVerdict(value);
    case "GovernorEvent": return validateGovernorEvent(value);
    case "ReviewRecord": return validateSimpleRecord(value, "review_record", ["checkpoint_id", "phase", "policy", "status", "request_commit_sha", "verdict", "updated_at"]);
    case "IncidentRecord": return validateSimpleRecord(value, "incident_record", ["incident_id", "phase", "severity", "summary", "evidence", "status", "created_at"]);
    case "ImprovementCandidate": return validateSimpleRecord(value, "improvement_candidate", ["candidate_id", "source", "evidence", "proposed_phase", "status", "created_at"]);
    case "PhaseAmendment": return validateSimpleRecord(value, "phase_amendment", ["amendment_id", "phase", "reason", "scope_delta", "evidence", "approval_status", "created_at"]);
    default: fail("UNKNOWN_CONTRACT", `Unsupported contract ${name}`);
  }
}

export function isHealthyLease(lease, now = new Date()) {
  return Boolean(lease && typeof lease.expires_at === "string" && Date.parse(lease.expires_at) > now.getTime());
}

export function assertProgramStatus(value) {
  assertEnum(value, PROGRAM_STATUSES, "program.status");
}
