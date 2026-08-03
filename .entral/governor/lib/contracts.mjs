import { createHash } from "node:crypto";
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
export const REPOSITORY_ROLES = Object.freeze(["PRODUCT", "CONTROL_WEBSITE"]);
export const RELEASE_RISK_TIERS = Object.freeze(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const RELEASE_SURFACES = Object.freeze([
  "CUSTOMER",
  "FRONTEND",
  "API",
  "WORKER",
  "SCHEDULER",
  "CONNECTOR",
  "BILLING",
  "GRAPH",
  "TUTORIAL",
  "WEBSITE"
]);
export const RELEASE_CONTROL_DECISIONS = Object.freeze([
  "READY_FOR_MERGE",
  "PASS",
  "BLOCKED",
  "ROLLBACK_REQUIRED",
  "INCIDENT_REQUIRED"
]);
export const IMPROVEMENT_SOURCES = Object.freeze([
  "TEST",
  "INCIDENT",
  "TELEMETRY",
  "SUPPORT",
  "ONBOARDING",
  "SALES_OBJECTION",
  "LOST_DEAL",
  "FEATURE_USAGE",
  "CONNECTOR_HEALTH",
  "COST",
  "VERIFIED_MARKET_EVIDENCE"
]);
export const IMPROVEMENT_CATEGORIES = Object.freeze([
  "DEFECT_REPAIR",
  "RELIABILITY_IMPROVEMENT",
  "PRODUCT_ENHANCEMENT",
  "TECHNICAL_DEBT",
  "COMMERCIAL_CHANGE",
  "RESEARCH_HYPOTHESIS"
]);
export const IMPROVEMENT_STATUSES = Object.freeze([
  "NEW",
  "QUEUED",
  "AUTO_EXECUTION_ELIGIBLE",
  "OWNER_REVIEW_REQUIRED",
  "AMENDMENT_PROPOSED",
  "AMENDMENT_ACCEPTED",
  "DEFERRED",
  "REJECTED",
  "IMPLEMENTED",
  "CLOSED_EVIDENCE_INVALID",
  "CLOSED_ROOT_CAUSE_REMOVED"
]);
export const IMPROVEMENT_OWNER_REVIEW_TOPICS = Object.freeze([
  "PRICING",
  "PACKAGING",
  "LEGAL",
  "CUSTOMER_DATA_RIGHTS",
  "PUBLIC_COMMITMENT",
  "ARCHITECTURE_REPLACEMENT",
  "MATERIAL_SPENDING"
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

function evidenceBindingSha256(values) {
  return createHash("sha256").update(JSON.stringify(values)).digest("hex");
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

function assertNumber(value, field, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    fail("INVALID_CONTRACT", `${field} must be a finite number between ${minimum} and ${maximum}`);
  }
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

function assertPublicHttpsUrl(value, field) {
  assertString(value, field, 8, 2_000);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail("INVALID_URL", `${field} must be a valid HTTPS URL`);
  }
  if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) {
    fail("INVALID_URL", `${field} must be a credential-free HTTPS URL`);
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

function validateRepositoryBinding(value, field) {
  assertRecord(value, field);
  assertEnum(value.role, REPOSITORY_ROLES, `${field}.role`);
  assertString(value.repository, `${field}.repository`, 3, 300);
  assertString(value.local_path, `${field}.local_path`, 3, 2_000);
  assertString(value.origin_url, `${field}.origin_url`, 8, 2_000);
  if (/^https?:\/\/[^/@]+@/i.test(value.origin_url)) fail("CREDENTIAL_IN_ORIGIN_URL", `${field}.origin_url must not contain credentials`);
  if (value.default_branch !== "main") fail("INVALID_DEFAULT_BRANCH", `${field}.default_branch must be main`);
  assertSha40(value.latest_verified_main_sha, `${field}.latest_verified_main_sha`);
  assertString(value.branch_prefix, `${field}.branch_prefix`, 1, 100);
  if (!value.branch_prefix.startsWith("codex/")) fail("INVALID_BRANCH_PREFIX", `${field}.branch_prefix must begin with codex/`);
  assertString(value.compatibility_contract_version, `${field}.compatibility_contract_version`, 1, 100);
}

export function validateReleaseControlPlan(value) {
  assertVersion(value, "release_control_plan");
  assertId(value.plan_id, "release_control_plan.plan_id");
  assertInteger(value.phase, "release_control_plan.phase", 197);
  assertArray(value.repositories, "release_control_plan.repositories", { minimum: 2, maximum: 2 });
  value.repositories.forEach((repository, index) => validateRepositoryBinding(repository, `release_control_plan.repositories[${index}]`));
  const repositoryRoles = value.repositories.map((repository) => repository.role);
  if (new Set(repositoryRoles).size !== 2 || REPOSITORY_ROLES.some((role) => !repositoryRoles.includes(role))) {
    fail("INCOMPLETE_REPOSITORY_SET", "ReleaseControlPlan requires exactly one PRODUCT and one CONTROL_WEBSITE repository");
  }
  if (new Set(value.repositories.map((repository) => repository.compatibility_contract_version)).size !== 1) {
    fail("CROSS_REPOSITORY_CONTRACT_MISMATCH", "Product and control/website repositories must declare the same compatibility contract version");
  }
  assertRecord(value.task, "release_control_plan.task");
  if (typeof value.task.task_packet_id !== "string" || !TASK_ID.test(value.task.task_packet_id)) fail("INVALID_TASK_ID", "release_control_plan.task.task_packet_id is invalid");
  assertSha40(value.task.commit_sha, "release_control_plan.task.commit_sha");
  assertStringArray(value.task.changed_files, "release_control_plan.task.changed_files", { minimum: 1, unique: true });
  value.task.changed_files.forEach((entry, index) => assertRelativePath(entry, `release_control_plan.task.changed_files[${index}]`));
  assertStringArray(value.task.mandatory_phase_suites, "release_control_plan.task.mandatory_phase_suites", { minimum: 1, unique: true });
  assertRecord(value.risk_profile, "release_control_plan.risk_profile");
  assertEnum(value.risk_profile.data_migration, ["NONE", "ADDITIVE", "DESTRUCTIVE"], "release_control_plan.risk_profile.data_migration");
  assertEnum(value.risk_profile.customer_data_risk, ["NONE", "BOUNDED", "MATERIAL"], "release_control_plan.risk_profile.customer_data_risk");
  assertEnum(value.risk_profile.rollback_complexity, ["SIMPLE", "MULTI_SERVICE", "IRREVERSIBLE"], "release_control_plan.risk_profile.rollback_complexity");
  for (const field of ["public_contract_change", "provider_configuration_change", "identity_or_tenancy_change", "billing_or_economic_change"]) {
    assertBoolean(value.risk_profile[field], `release_control_plan.risk_profile.${field}`);
  }
  assertStringArray(value.changed_surfaces, "release_control_plan.changed_surfaces", { minimum: 1, unique: true });
  value.changed_surfaces.forEach((surface, index) => assertEnum(surface, RELEASE_SURFACES, `release_control_plan.changed_surfaces[${index}]`));
  assertArray(value.migrations, "release_control_plan.migrations", { minimum: 1 });
  value.migrations.forEach((migration, index) => {
    const field = `release_control_plan.migrations[${index}]`;
    assertRecord(migration, field);
    assertInteger(migration.order, `${field}.order`, 0);
    assertString(migration.name, `${field}.name`);
    assertEnum(migration.kind, ["NO_SCHEMA_CHANGE", "ADDITIVE", "DESTRUCTIVE"], `${field}.kind`);
    assertSha256(migration.fingerprint_sha256, `${field}.fingerprint_sha256`);
    assertEnum(migration.compatibility, ["COMPATIBLE", "EXPAND_CONTRACT", "BREAKING"], `${field}.compatibility`);
    assertEnum(migration.recovery_strategy, ["NONE_REQUIRED", "ROLLBACK", "RESTORE", "FORWARD_REPAIR"], `${field}.recovery_strategy`);
  });
  const migrationOrders = value.migrations.map((migration) => migration.order);
  if (new Set(migrationOrders).size !== migrationOrders.length) fail("DUPLICATE_MIGRATION_ORDER", "Migration order values must be unique");
  assertRecord(value.health_thresholds, "release_control_plan.health_thresholds");
  assertNumber(value.health_thresholds.minimum_availability, "release_control_plan.health_thresholds.minimum_availability", 0, 1);
  assertNumber(value.health_thresholds.maximum_error_rate, "release_control_plan.health_thresholds.maximum_error_rate", 0, 1);
  assertNumber(value.health_thresholds.maximum_p95_ms, "release_control_plan.health_thresholds.maximum_p95_ms", 1, 600_000);
  assertInteger(value.health_thresholds.maximum_failed_jobs, "release_control_plan.health_thresholds.maximum_failed_jobs", 0);
  assertInteger(value.health_thresholds.maximum_dead_letter_jobs, "release_control_plan.health_thresholds.maximum_dead_letter_jobs", 0);
  assertRecord(value.rollback_point, "release_control_plan.rollback_point");
  assertEnum(value.rollback_point.status, ["VERIFIED", "UNAVAILABLE"], "release_control_plan.rollback_point.status");
  assertSha40(value.rollback_point.main_sha, "release_control_plan.rollback_point.main_sha");
  assertString(value.rollback_point.release_tag, "release_control_plan.rollback_point.release_tag");
  assertEnum(value.rollback_point.integrity_status, ["CERTAIN", "UNCERTAIN"], "release_control_plan.rollback_point.integrity_status");
  assertSha256(value.rollback_point.receipt_sha256, "release_control_plan.rollback_point.receipt_sha256");
  assertArray(value.rollback_point.deployments, "release_control_plan.rollback_point.deployments", { minimum: 3, maximum: 3 });
  value.rollback_point.deployments.forEach((deployment, index) => {
    const field = `release_control_plan.rollback_point.deployments[${index}]`;
    assertRecord(deployment, field);
    assertEnum(deployment.role, ["FRONTEND", "API", "WORKER"], `${field}.role`);
    assertEnum(deployment.provider, ["VERCEL", "RAILWAY"], `${field}.provider`);
    assertString(deployment.deployment_id, `${field}.deployment_id`);
    if (deployment.service_id !== undefined && deployment.service_id !== null) assertString(deployment.service_id, `${field}.service_id`);
  });
  const rollbackRoles = value.rollback_point.deployments.map((deployment) => deployment.role);
  if (new Set(rollbackRoles).size !== 3 || ["FRONTEND", "API", "WORKER"].some((role) => !rollbackRoles.includes(role))) {
    fail("INCOMPLETE_ROLLBACK_DEPLOYMENT_SET", "Rollback point requires exactly one frontend, API, and worker deployment");
  }
  for (const deployment of value.rollback_point.deployments) {
    if (deployment.role === "FRONTEND" && deployment.provider !== "VERCEL") fail("INVALID_ROLLBACK_PROVIDER", "Frontend rollback must use Vercel");
    if (["API", "WORKER"].includes(deployment.role) && deployment.provider !== "RAILWAY") fail("INVALID_ROLLBACK_PROVIDER", `${deployment.role} rollback must use Railway`);
  }
  assertIso(value.created_at, "release_control_plan.created_at");
  assertSafeTextTree(value, "release_control_plan");
  return value;
}

export function validateReleaseControlEvidence(value) {
  assertVersion(value, "release_control_evidence");
  assertId(value.evidence_id, "release_control_evidence.evidence_id");
  assertInteger(value.phase, "release_control_evidence.phase", 197);
  assertSha256(value.plan_sha256, "release_control_evidence.plan_sha256");
  assertEnum(value.stage, ["INTEGRATION", "PRODUCTION"], "release_control_evidence.stage");
  assertArray(value.repositories, "release_control_evidence.repositories", { minimum: 2, maximum: 2 });
  value.repositories.forEach((repository, index) => {
    const field = `release_control_evidence.repositories[${index}]`;
    assertRecord(repository, field);
    assertEnum(repository.role, REPOSITORY_ROLES, `${field}.role`);
    assertSha40(repository.origin_main_sha, `${field}.origin_main_sha`);
    assertString(repository.observed_contract_version, `${field}.observed_contract_version`);
    assertBoolean(repository.compatible, `${field}.compatible`);
  });
  assertRecord(value.task, "release_control_evidence.task");
  assertSha40(value.task.commit_sha, "release_control_evidence.task.commit_sha");
  assertBoolean(value.task.coherent_commit, "release_control_evidence.task.coherent_commit");
  assertBoolean(value.task.worktree_clean, "release_control_evidence.task.worktree_clean");
  for (const field of ["targeted_tests", "mandatory_suites", "status_checks"]) {
    assertArray(value[field], `release_control_evidence.${field}`, { minimum: 1 });
    value[field].forEach((check, index) => {
      assertRecord(check, `release_control_evidence.${field}[${index}]`);
      assertString(check.name, `release_control_evidence.${field}[${index}].name`);
      assertEnum(check.status, ["PASSED", "FAILED", "PENDING", "SKIPPED"], `release_control_evidence.${field}[${index}].status`);
    });
  }
  assertRecord(value.reconciliation, "release_control_evidence.reconciliation");
  assertSha40(value.reconciliation.origin_main_sha, "release_control_evidence.reconciliation.origin_main_sha");
  assertSha40(value.reconciliation.reconciled_commit_sha, "release_control_evidence.reconciliation.reconciled_commit_sha");
  assertBoolean(value.reconciliation.affected_checks_rerun, "release_control_evidence.reconciliation.affected_checks_rerun");
  assertEnum(value.reconciliation.status, ["CURRENT", "RECONCILED", "CONFLICT", "STALE"], "release_control_evidence.reconciliation.status");
  assertRecord(value.staging, "release_control_evidence.staging");
  assertEnum(value.staging.status, ["PASSED", "FAILED", "NOT_REQUIRED"], "release_control_evidence.staging.status");
  assertRecord(value.migration_verification, "release_control_evidence.migration_verification");
  assertEnum(value.migration_verification.status, ["PASSED", "FAILED", "NO_SCHEMA_CHANGE"], "release_control_evidence.migration_verification.status");
  assertBoolean(value.migration_verification.ordered, "release_control_evidence.migration_verification.ordered");
  assertBoolean(value.migration_verification.fingerprints_match, "release_control_evidence.migration_verification.fingerprints_match");
  assertBoolean(value.migration_verification.compatibility_verified, "release_control_evidence.migration_verification.compatibility_verified");
  assertEnum(value.migration_verification.backup_status, ["VERIFIED", "NOT_REQUIRED", "MISSING"], "release_control_evidence.migration_verification.backup_status");
  assertArray(value.migration_verification.entries, "release_control_evidence.migration_verification.entries", { minimum: 1 });
  value.migration_verification.entries.forEach((entry, index) => {
    const field = `release_control_evidence.migration_verification.entries[${index}]`;
    assertRecord(entry, field);
    assertInteger(entry.order, `${field}.order`, 0);
    assertString(entry.name, `${field}.name`);
    assertSha256(entry.fingerprint_sha256, `${field}.fingerprint_sha256`);
    assertEnum(entry.status, ["VERIFIED", "NO_SCHEMA_CHANGE", "FAILED"], `${field}.status`);
  });
  const migrationEntryKeys = value.migration_verification.entries.map((entry) => `${entry.order}:${entry.name}`);
  if (new Set(migrationEntryKeys).size !== migrationEntryKeys.length) fail("DUPLICATE_MIGRATION_EVIDENCE", "Migration verification entries must be unique by order and name");
  assertArray(value.deployments, "release_control_evidence.deployments");
  value.deployments.forEach((deployment, index) => {
    const field = `release_control_evidence.deployments[${index}]`;
    assertRecord(deployment, field);
    assertEnum(deployment.role, ["FRONTEND", "API", "WORKER"], `${field}.role`);
    assertEnum(deployment.provider, ["VERCEL", "RAILWAY"], `${field}.provider`);
    assertString(deployment.deployment_id, `${field}.deployment_id`);
    assertPublicHttpsUrl(deployment.live_url, `${field}.live_url`);
    assertSha40(deployment.deployed_commit_sha, `${field}.deployed_commit_sha`);
    assertEnum(deployment.status, ["READY", "FAILED"], `${field}.status`);
  });
  for (const deployment of value.deployments) {
    if (deployment.role === "FRONTEND" && deployment.provider !== "VERCEL") fail("INVALID_DEPLOYMENT_PROVIDER", "Frontend deployment evidence must use Vercel");
    if (["API", "WORKER"].includes(deployment.role) && deployment.provider !== "RAILWAY") fail("INVALID_DEPLOYMENT_PROVIDER", `${deployment.role} deployment evidence must use Railway`);
  }
  assertArray(value.authenticated_smokes, "release_control_evidence.authenticated_smokes");
  value.authenticated_smokes.forEach((smoke, index) => {
    const field = `release_control_evidence.authenticated_smokes[${index}]`;
    assertRecord(smoke, field);
    assertString(smoke.surface, `${field}.surface`);
    assertPublicHttpsUrl(smoke.live_url, `${field}.live_url`);
    assertBoolean(smoke.authenticated, `${field}.authenticated`);
    assertEnum(smoke.status, ["PASSED", "FAILED", "NOT_APPLICABLE"], `${field}.status`);
    assertSha256(smoke.receipt_sha256, `${field}.receipt_sha256`);
  });
  assertRecord(value.state_reconciliation, "release_control_evidence.state_reconciliation");
  assertEnum(value.state_reconciliation.status, ["PASSED", "FAILED", "NOT_REQUIRED"], "release_control_evidence.state_reconciliation.status");
  assertBoolean(value.state_reconciliation.side_effects_reconciled, "release_control_evidence.state_reconciliation.side_effects_reconciled");
  assertSha40(value.state_reconciliation.main_sha, "release_control_evidence.state_reconciliation.main_sha");
  assertSha256(value.state_reconciliation.receipt_sha256, "release_control_evidence.state_reconciliation.receipt_sha256");
  assertStringArray(value.state_reconciliation.blockers, "release_control_evidence.state_reconciliation.blockers");
  assertRecord(value.health, "release_control_evidence.health");
  assertNumber(value.health.availability, "release_control_evidence.health.availability", 0, 1);
  assertNumber(value.health.error_rate, "release_control_evidence.health.error_rate", 0, 1);
  assertNumber(value.health.p95_ms, "release_control_evidence.health.p95_ms", 0, 600_000);
  assertInteger(value.health.failed_jobs, "release_control_evidence.health.failed_jobs", 0);
  assertInteger(value.health.dead_letter_jobs, "release_control_evidence.health.dead_letter_jobs", 0);
  assertBoolean(value.health.worker_ready, "release_control_evidence.health.worker_ready");
  assertSha256(value.health.receipt_sha256, "release_control_evidence.health.receipt_sha256");
  assertRecord(value.rollback_rehearsal, "release_control_evidence.rollback_rehearsal");
  assertEnum(value.rollback_rehearsal.status, ["PASSED", "FAILED", "NOT_REQUIRED"], "release_control_evidence.rollback_rehearsal.status");
  assertRecord(value.failure_proof, "release_control_evidence.failure_proof");
  assertEnum(value.failure_proof.status, ["PASSED", "FAILED"], "release_control_evidence.failure_proof.status");
  assertEnum(value.failure_proof.outcome, ["REJECTED", "ROLLED_BACK", "ADVANCED_INCORRECTLY"], "release_control_evidence.failure_proof.outcome");
  assertBoolean(value.failure_proof.phase_advanced, "release_control_evidence.failure_proof.phase_advanced");
  assertRecord(value.rollback_point, "release_control_evidence.rollback_point");
  assertEnum(value.rollback_point.status, ["VERIFIED", "UNAVAILABLE"], "release_control_evidence.rollback_point.status");
  assertSha256(value.rollback_point.receipt_sha256, "release_control_evidence.rollback_point.receipt_sha256");
  assertIso(value.produced_at, "release_control_evidence.produced_at");
  assertSafeTextTree(value, "release_control_evidence");
  return value;
}

export function validateReleaseEvidenceBundle(value) {
  assertVersion(value, "release_evidence_bundle");
  assertId(value.bundle_id, "release_evidence_bundle.bundle_id");
  assertInteger(value.phase, "release_evidence_bundle.phase", 197);
  assertEnum(value.risk_tier, RELEASE_RISK_TIERS, "release_evidence_bundle.risk_tier");
  assertEnum(value.decision, RELEASE_CONTROL_DECISIONS, "release_evidence_bundle.decision");
  assertSha256(value.plan_sha256, "release_evidence_bundle.plan_sha256");
  assertSha256(value.evidence_sha256, "release_evidence_bundle.evidence_sha256");
  assertArray(value.components, "release_evidence_bundle.components", { minimum: 1 });
  value.components.forEach((component, index) => {
    assertRecord(component, `release_evidence_bundle.components[${index}]`);
    assertString(component.name, `release_evidence_bundle.components[${index}].name`);
    assertSha256(component.content_sha256, `release_evidence_bundle.components[${index}].content_sha256`);
  });
  assertSha256(value.bundle_sha256, "release_evidence_bundle.bundle_sha256");
  assertIso(value.created_at, "release_evidence_bundle.created_at");
  assertSafeTextTree(value, "release_evidence_bundle");
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
  if (value.phase >= 197) {
    value.deployments.forEach((deployment, index) => assertPublicHttpsUrl(deployment.live_url, `release_manifest.deployments[${index}].live_url`));
    assertArray(value.repositories, "release_manifest.repositories", { minimum: 2, maximum: 2 });
    value.repositories.forEach((repository, index) => {
      const field = `release_manifest.repositories[${index}]`;
      assertRecord(repository, field);
      assertEnum(repository.role, REPOSITORY_ROLES, `${field}.role`);
      assertString(repository.repository, `${field}.repository`);
      assertSha40(repository.main_sha, `${field}.main_sha`);
      assertString(repository.contract_version, `${field}.contract_version`);
      assertEnum(repository.compatibility_status, ["PASSED"], `${field}.compatibility_status`);
    });
    const product = value.repositories.find((repository) => repository.role === "PRODUCT");
    const control = value.repositories.find((repository) => repository.role === "CONTROL_WEBSITE");
    if (!product || !control) fail("INCOMPLETE_REPOSITORY_SET", "Phase 197 and later require product and control/website repository bindings");
    if (product.repository !== value.repository || product.main_sha !== value.main_sha) fail("PRODUCT_RELEASE_MISMATCH", "Product repository binding must match the release main SHA");
    assertRecord(value.release_controller, "release_manifest.release_controller");
    assertEnum(value.release_controller.risk_tier, RELEASE_RISK_TIERS, "release_manifest.release_controller.risk_tier");
    assertEnum(value.release_controller.decision, ["PASS"], "release_manifest.release_controller.decision");
    assertSha256(value.release_controller.plan_sha256, "release_manifest.release_controller.plan_sha256");
    assertSha256(value.release_controller.evidence_bundle_sha256, "release_manifest.release_controller.evidence_bundle_sha256");
    assertEnum(value.release_controller.health_status, ["PASSED"], "release_manifest.release_controller.health_status");
    assertEnum(value.release_controller.failure_proof_status, ["PASSED"], "release_manifest.release_controller.failure_proof_status");
  }
  if (value.phase >= 203) {
    const journey = value.authenticated_member_journey;
    assertRecord(journey, "release_manifest.authenticated_member_journey");
    assertEnum(journey.status, ["PASSED"], "release_manifest.authenticated_member_journey.status");
    assertId(journey.receipt_id, "release_manifest.authenticated_member_journey.receipt_id");
    assertSha256(journey.receipt_sha256, "release_manifest.authenticated_member_journey.receipt_sha256");
    assertEnum(journey.environment, ["PRODUCTION"], "release_manifest.authenticated_member_journey.environment");
    assertEnum(journey.session_scope, ["MIGRATED_MEMBER"], "release_manifest.authenticated_member_journey.session_scope");
    assertSha40(journey.deployed_commit_sha, "release_manifest.authenticated_member_journey.deployed_commit_sha");
    if (journey.deployed_commit_sha !== value.main_sha) {
      fail("MEMBER_JOURNEY_SHA_MISMATCH", "The authenticated member journey must verify the exact release main SHA");
    }
    for (const field of [
      "canonical_node_set_sha256",
      "canonical_edge_set_sha256",
      "deployment_readback_receipt_sha256",
      "membership_provenance_sha256",
      "migrated_account_provenance_sha256",
      "migrated_organization_scope_sha256",
      "migrated_state_receipt_sha256",
      "migrated_subject_sha256",
      "migrated_team_scope_sha256",
      "migrated_tenant_scope_sha256",
      "session_subject_sha256",
      "team_scope_sha256",
      "tenant_scope_sha256",
      "organization_scope_sha256"
    ]) assertSha256(journey[field], `release_manifest.authenticated_member_journey.${field}`);
    assertId(journey.migrated_state_receipt_id, "release_manifest.authenticated_member_journey.migrated_state_receipt_id");
    assertInteger(journey.migrated_source_phase, "release_manifest.authenticated_member_journey.migrated_source_phase", 202, 202);
    assertSha40(journey.migrated_source_main_sha, "release_manifest.authenticated_member_journey.migrated_source_main_sha");
    assertIso(journey.migrated_membership_joined_at, "release_manifest.authenticated_member_journey.migrated_membership_joined_at");
    assertIso(journey.migrated_phase_202_cutover_at, "release_manifest.authenticated_member_journey.migrated_phase_202_cutover_at");
    assertIso(journey.migrated_source_checked_at, "release_manifest.authenticated_member_journey.migrated_source_checked_at");
    assertIso(journey.observed_at, "release_manifest.authenticated_member_journey.observed_at");
    const migratedAccountProvenanceSha256 = evidenceBindingSha256([
      journey.migrated_membership_joined_at,
      journey.migrated_organization_scope_sha256,
      journey.migrated_phase_202_cutover_at,
      journey.migrated_source_checked_at,
      journey.migrated_source_main_sha,
      journey.migrated_source_phase,
      journey.migrated_state_receipt_id,
      journey.migrated_state_receipt_sha256,
      journey.migrated_subject_sha256,
      journey.migrated_team_scope_sha256,
      journey.migrated_tenant_scope_sha256
    ]);
    if (
      journey.pre_phase_202_provenance_verified !== true
      || journey.migrated_source_main_sha !== "c689176234bca8a43f6bb5665f6a8a63d8d653dd"
      || journey.migrated_state_receipt_id !== "P202-PROD-READBACK-C6891762"
      || journey.migrated_state_receipt_sha256 !== "67b31f7094d2b5ee1dfc5d4cdaab1646791b2a27e2ee4d3725cda649b0c3e55c"
      || journey.migrated_account_provenance_sha256 !== migratedAccountProvenanceSha256
      || journey.migrated_subject_sha256 !== journey.session_subject_sha256
      || journey.migrated_tenant_scope_sha256 !== journey.tenant_scope_sha256
      || journey.migrated_organization_scope_sha256 !== journey.organization_scope_sha256
      || journey.migrated_team_scope_sha256 !== journey.team_scope_sha256
      || Date.parse(journey.migrated_membership_joined_at) >= Date.parse(journey.migrated_phase_202_cutover_at)
      || Date.parse(journey.migrated_source_checked_at) < Date.parse(journey.migrated_phase_202_cutover_at)
      || Date.parse(journey.observed_at) < Date.parse(journey.migrated_source_checked_at)
    ) {
      fail("UNBOUND_MIGRATED_MEMBER_PROVENANCE", "The production journey must cryptographically bind a pre-Phase-202 member, tenant, organization, and team to the certified Phase 202 state receipt");
    }
    assertSha256(value.production_readback.deployment_readback_sha256, "release_manifest.production_readback.deployment_readback_sha256");
    if (
      journey.deployment_readback_exact_sha_verified !== true
      || journey.deployment_readback_receipt_sha256 !== value.production_readback.deployment_readback_sha256
    ) {
      fail("UNBOUND_MEMBER_JOURNEY_DEPLOYMENT", "The authenticated member journey must bind the independently verified exact-SHA frontend, API, and worker deployment receipt");
    }
    if (
      journey.command_canonical_data_verified !== true
      || journey.graph_preference_actor_bound !== true
      || journey.graph_preference_organization_bound !== true
      || journey.projection_organization_bound !== true
    ) {
      fail("UNBOUND_CANONICAL_MEMBER_DATA", "The production journey must bind visible Command data, graph preference ownership, and projection organization authority");
    }
    assertInteger(journey.business_count, "release_manifest.authenticated_member_journey.business_count", 0);
    assertEnum(journey.businesses_state, ["REAL_RECORDS", "EMPTY_CANONICAL"], "release_manifest.authenticated_member_journey.businesses_state");
    assertInteger(journey.canonical_node_count, "release_manifest.authenticated_member_journey.canonical_node_count", 2);
    assertInteger(journey.canonical_edge_count, "release_manifest.authenticated_member_journey.canonical_edge_count", 1);
    assertInteger(journey.canonical_sync_errors, "release_manifest.authenticated_member_journey.canonical_sync_errors", 0, 0);
    if (
      (journey.businesses_state === "REAL_RECORDS" && journey.business_count === 0)
      || (journey.businesses_state === "EMPTY_CANONICAL" && journey.business_count !== 0)
    ) {
      fail("INVALID_CANONICAL_BUSINESS_STATE", "The production member journey business state must match its canonical business count");
    }
    const requiredEndpoints = [
      "PORTFOLIO_SUMMARY",
      "HIERARCHY",
      "ENTRAL_CONVERSATION",
      "GRAPH_PROJECTION",
      "GRAPH_PREFERENCES",
      "EVENTS",
      "BUSINESS_FULL_RECORD",
      "ENTITY_FULL_RECORD"
    ];
    assertArray(journey.canonical_endpoint_readback, "release_manifest.authenticated_member_journey.canonical_endpoint_readback", {
      minimum: requiredEndpoints.length,
      maximum: requiredEndpoints.length
    });
    const endpointByName = new Map();
    journey.canonical_endpoint_readback.forEach((endpoint, index) => {
      const field = `release_manifest.authenticated_member_journey.canonical_endpoint_readback[${index}]`;
      assertRecord(endpoint, field);
      assertEnum(endpoint.endpoint, requiredEndpoints, `${field}.endpoint`);
      if (endpointByName.has(endpoint.endpoint)) {
        fail("DUPLICATE_MEMBER_ENDPOINT_READBACK", "Every canonical member endpoint requires exactly one readback result");
      }
      endpointByName.set(endpoint.endpoint, endpoint);
      assertInteger(endpoint.http_status, `${field}.http_status`, 100, 599);
      if (endpoint.endpoint === "BUSINESS_FULL_RECORD") {
        assertEnum(endpoint.result, ["PASSED", "NOT_APPLICABLE_NO_CANONICAL_BUSINESS"], `${field}.result`);
        if (
          (endpoint.result === "PASSED" && endpoint.http_status !== 200)
          || (endpoint.result === "NOT_APPLICABLE_NO_CANONICAL_BUSINESS" && endpoint.http_status !== 404)
        ) {
          fail("INVALID_BUSINESS_FULL_RECORD_READBACK", "Business full-record evidence must be a successful canonical record or an explicit truthful empty-state 404");
        }
      } else if (endpoint.result !== "PASSED" || endpoint.http_status !== 200) {
        fail("FAILED_CANONICAL_ENDPOINT_READBACK", `${endpoint.endpoint} must pass authenticated production readback`);
      }
    });
    if (requiredEndpoints.some((endpoint) => !endpointByName.has(endpoint))) {
      fail("INCOMPLETE_CANONICAL_ENDPOINT_READBACK", "Every canonical workspace endpoint requires authenticated production readback");
    }
    const portfolioReadback = endpointByName.get("PORTFOLIO_SUMMARY");
    const hierarchyReadback = endpointByName.get("HIERARCHY");
    const conversationReadback = endpointByName.get("ENTRAL_CONVERSATION");
    const projectionReadback = endpointByName.get("GRAPH_PROJECTION");
    const preferenceReadback = endpointByName.get("GRAPH_PREFERENCES");
    const eventsReadback = endpointByName.get("EVENTS");
    const businessReadback = endpointByName.get("BUSINESS_FULL_RECORD");
    const entityReadback = endpointByName.get("ENTITY_FULL_RECORD");
    assertInteger(portfolioReadback.business_count, "release_manifest.authenticated_member_journey.portfolio_readback.business_count", 0);
    assertInteger(portfolioReadback.event_sequence, "release_manifest.authenticated_member_journey.portfolio_readback.event_sequence", 0);
    assertInteger(hierarchyReadback.entity_count, "release_manifest.authenticated_member_journey.hierarchy_readback.entity_count", 2);
    assertInteger(hierarchyReadback.root_count, "release_manifest.authenticated_member_journey.hierarchy_readback.root_count", 1, 1);
    assertInteger(hierarchyReadback.event_sequence, "release_manifest.authenticated_member_journey.hierarchy_readback.event_sequence", 0);
    assertInteger(conversationReadback.message_count, "release_manifest.authenticated_member_journey.conversation_readback.message_count", 0);
    assertInteger(conversationReadback.event_sequence, "release_manifest.authenticated_member_journey.conversation_readback.event_sequence", 0);
    assertInteger(projectionReadback.entity_count, "release_manifest.authenticated_member_journey.projection_readback.entity_count", 2);
    assertInteger(projectionReadback.edge_count, "release_manifest.authenticated_member_journey.projection_readback.edge_count", 1);
    assertInteger(projectionReadback.projection_version, "release_manifest.authenticated_member_journey.projection_readback.projection_version", 0);
    assertInteger(preferenceReadback.preference_version, "release_manifest.authenticated_member_journey.preference_readback.preference_version", 0);
    assertInteger(eventsReadback.event_count, "release_manifest.authenticated_member_journey.events_readback.event_count", 0);
    if (
      portfolioReadback.business_count !== journey.business_count
      || projectionReadback.entity_count !== journey.canonical_node_count
      || projectionReadback.edge_count !== journey.canonical_edge_count
      || projectionReadback.projection_version !== hierarchyReadback.event_sequence
      || preferenceReadback.actor_bound !== true || preferenceReadback.organization_bound !== true
      || (journey.businesses_state === "REAL_RECORDS" && businessReadback.result !== "PASSED")
      || (journey.businesses_state === "EMPTY_CANONICAL" && businessReadback.result !== "NOT_APPLICABLE_NO_CANONICAL_BUSINESS")
      || entityReadback.canonical_root_visible !== true
    ) {
      fail("MISMATCHED_CANONICAL_ENDPOINT_READBACK", "Canonical endpoint results must agree with the journey counts, event version, ownership, and root visibility");
    }
    if (journey.route_interception !== false) {
      fail("INTERCEPTED_PRODUCTION_JOURNEY", "The authenticated production member journey cannot use route interception");
    }
    const requiredDestinations = [
      "COMMAND",
      "BUSINESSES",
      "UNIVERSE_2D",
      "UNIVERSE_3D",
      "INFRASTRUCTURE",
      "TUTORIAL"
    ];
    assertStringArray(journey.destinations, "release_manifest.authenticated_member_journey.destinations", {
      minimum: requiredDestinations.length,
      maximum: requiredDestinations.length,
      unique: true
    });
    if (requiredDestinations.some((destination) => !journey.destinations.includes(destination))) {
      fail("INCOMPLETE_MEMBER_JOURNEY", "Every canonical member destination must pass in production");
    }
    assertArray(journey.viewport_widths, "release_manifest.authenticated_member_journey.viewport_widths", {
      minimum: 5,
      unique: true
    });
    journey.viewport_widths.forEach((width, index) => assertInteger(
      width,
      `release_manifest.authenticated_member_journey.viewport_widths[${index}]`,
      320,
      10_000
    ));
    for (const requiredWidth of [360, 390, 412, 430, 1440, 1920]) {
      if (!journey.viewport_widths.includes(requiredWidth)) {
        fail("INCOMPLETE_MEMBER_VIEWPORTS", `Authenticated member journey is missing the ${requiredWidth}px viewport`);
      }
    }
    if (!journey.viewport_widths.some((width) => width >= 1024)) {
      fail("MISSING_DESKTOP_MEMBER_JOURNEY", "Authenticated member journey requires a desktop viewport");
    }
    if (
      journey.destination_visual_evidence_verified !== true
      || journey.screenshot_collision_evidence_verified !== true
    ) {
      fail("UNVERIFIED_MEMBER_VISUAL_EVIDENCE", "Command, Businesses, and graph collision screenshots must be verified before release");
    }
    assertArray(journey.viewport_observations, "release_manifest.authenticated_member_journey.viewport_observations", {
      minimum: journey.viewport_widths.length,
      maximum: journey.viewport_widths.length
    });
    const observedWidths = new Set();
    journey.viewport_observations.forEach((observation, index) => {
      const field = `release_manifest.authenticated_member_journey.viewport_observations[${index}]`;
      assertRecord(observation, field);
      assertInteger(observation.viewport_width, `${field}.viewport_width`, 320, 10_000);
      if (observedWidths.has(observation.viewport_width) || !journey.viewport_widths.includes(observation.viewport_width)) {
        fail("INVALID_MEMBER_VIEWPORT_OBSERVATION", "Authenticated member viewport observations must be unique and match the declared widths");
      }
      observedWidths.add(observation.viewport_width);
      for (const booleanField of [
        "command_canonical_data_verified",
        "desktop_side_by_side",
        "mobile_single_renderer",
        "renderer_parity_verified",
        "rendered_subset_authorized",
        "renderer_state_preserved",
        "selected_entity_authorized",
        "two_d_loaded",
        "three_d_loaded"
      ]) assertBoolean(observation[booleanField], `${field}.${booleanField}`);
      assertInteger(observation.business_count, `${field}.business_count`, 0);
      assertEnum(observation.businesses_state, ["REAL_RECORDS", "EMPTY_CANONICAL"], `${field}.businesses_state`);
      assertInteger(observation.entity_count, `${field}.entity_count`, 2);
      assertInteger(observation.edge_count, `${field}.edge_count`, 1);
      assertInteger(observation.event_sequence, `${field}.event_sequence`, 0);
      assertInteger(observation.sync_errors, `${field}.sync_errors`, 0, 0);
      assertSha256(observation.entity_set_sha256, `${field}.entity_set_sha256`);
      assertSha256(observation.edge_set_sha256, `${field}.edge_set_sha256`);
      assertArray(observation.destination_visual_evidence, `${field}.destination_visual_evidence`, {
        minimum: 2,
        maximum: 2
      });
      const visibleDestinations = new Set();
      const destinationScreenshotHashes = new Set();
      observation.destination_visual_evidence.forEach((evidence, evidenceIndex) => {
        const evidenceField = `${field}.destination_visual_evidence[${evidenceIndex}]`;
        assertRecord(evidence, evidenceField);
        assertEnum(evidence.destination, ["COMMAND", "BUSINESSES"], `${evidenceField}.destination`);
        assertRelativePath(evidence.screenshot_file, `${evidenceField}.screenshot_file`);
        assertSha256(evidence.screenshot_sha256, `${evidenceField}.screenshot_sha256`);
        assertInteger(evidence.viewport_width, `${evidenceField}.viewport_width`, 320, 10_000);
        assertInteger(evidence.viewport_height, `${evidenceField}.viewport_height`, 1, 10_000);
        assertInteger(evidence.obscuring_surface_count, `${evidenceField}.obscuring_surface_count`, 0, 0);
        assertRecord(evidence.root_bounds, `${evidenceField}.root_bounds`);
        for (const coordinate of ["bottom", "height", "left", "right", "top", "width"]) {
          assertNumber(evidence.root_bounds[coordinate], `${evidenceField}.root_bounds.${coordinate}`, -1_000_000, 1_000_000);
        }
        if (
          visibleDestinations.has(evidence.destination)
          || destinationScreenshotHashes.has(evidence.screenshot_sha256)
          || evidence.viewport_width !== observation.viewport_width
          || evidence.screenshot_file !== `screenshots/${evidence.destination.toLowerCase()}-${observation.viewport_width}px.png`
          || evidence.root_bounds.width <= 1 || evidence.root_bounds.height <= 1
          || evidence.root_bounds.right <= 0 || evidence.root_bounds.left >= evidence.viewport_width
          || evidence.root_bounds.bottom <= 0 || evidence.root_bounds.top >= evidence.viewport_height
        ) {
          fail("INVALID_DESTINATION_VISUAL_EVIDENCE", "Each viewport requires visibly unobscured, distinct, width-bound Command and Businesses screenshots");
        }
        visibleDestinations.add(evidence.destination);
        destinationScreenshotHashes.add(evidence.screenshot_sha256);
      });
      if (visibleDestinations.size !== 2) {
        fail("INCOMPLETE_DESTINATION_VISUAL_EVIDENCE", "Each viewport requires both Command and Businesses screenshots");
      }
      assertRecord(observation.destination_sync_errors, `${field}.destination_sync_errors`);
      for (const destination of requiredDestinations) {
        assertInteger(observation.destination_sync_errors[destination], `${field}.destination_sync_errors.${destination}`, 0, 0);
      }
      const mobile = observation.viewport_width < 1024;
      assertArray(observation.graph_presentation_evidence, `${field}.graph_presentation_evidence`, {
        minimum: mobile ? 4 : 2,
        maximum: mobile ? 4 : 2
      });
      const graphPresentations = new Set();
      observation.graph_presentation_evidence.forEach((evidence, evidenceIndex) => {
        const evidenceField = `${field}.graph_presentation_evidence[${evidenceIndex}]`;
        assertRecord(evidence, evidenceField);
        assertEnum(evidence.dimension, ["2D", "3D"], `${evidenceField}.dimension`);
        assertEnum(evidence.orientation, ["portrait", "landscape"], `${evidenceField}.orientation`);
        assertBoolean(evidence.collision_free, `${evidenceField}.collision_free`);
        assertBoolean(evidence.focus_bound_to_selected_entity, `${evidenceField}.focus_bound_to_selected_entity`);
        assertBoolean(evidence.protected_focal_region_clear, `${evidenceField}.protected_focal_region_clear`);
        assertRelativePath(evidence.screenshot_file, `${evidenceField}.screenshot_file`);
        assertSha256(evidence.screenshot_sha256, `${evidenceField}.screenshot_sha256`);
        assertInteger(evidence.viewport_width, `${evidenceField}.viewport_width`, 320, 10_000);
        assertNumber(evidence.stage_height, `${evidenceField}.stage_height`, 1, 10_000);
        assertNumber(evidence.stage_width, `${evidenceField}.stage_width`, 1, 10_000);
        const key = `${evidence.dimension}:${evidence.orientation}`;
        if (
          graphPresentations.has(key)
          || evidence.viewport_width !== observation.viewport_width
          || evidence.screenshot_file !== `screenshots/universe-${observation.viewport_width}px-${evidence.orientation}-${evidence.dimension.toLowerCase()}.png`
          || evidence.collision_free !== true
          || evidence.focus_bound_to_selected_entity !== true
          || evidence.protected_focal_region_clear !== true
        ) {
          fail("INVALID_GRAPH_PRESENTATION_EVIDENCE", "Every graph screenshot must be unique, width-bound, collision-free, and focused on the selected canonical entity");
        }
        if (evidence.dimension === "2D") {
          assertInteger(evidence.minimap_label_collision_count, `${evidenceField}.minimap_label_collision_count`, 0, 0);
          if (evidence.minimap_visible !== true) {
            fail("INVALID_GRAPH_PRESENTATION_EVIDENCE", "2D graph evidence must exercise the visible minimap");
          }
          assertRecord(evidence.minimap_bounds, `${evidenceField}.minimap_bounds`);
          for (const coordinate of ["bottom", "left", "right", "top"]) {
            assertNumber(evidence.minimap_bounds[coordinate], `${evidenceField}.minimap_bounds.${coordinate}`);
          }
          assertArray(evidence.rendered_label_bounds, `${evidenceField}.rendered_label_bounds`, { minimum: 1, maximum: 300 });
          assertInteger(evidence.rendered_label_count, `${evidenceField}.rendered_label_count`, 1, 300);
          assertSha256(evidence.rendered_label_bounds_sha256, `${evidenceField}.rendered_label_bounds_sha256`);
          if (
            evidence.rendered_label_count !== evidence.rendered_label_bounds.length
            || evidence.rendered_label_bounds_sha256 !== evidenceBindingSha256(evidence.rendered_label_bounds)
            || evidence.minimap_bounds.right <= evidence.minimap_bounds.left
            || evidence.minimap_bounds.bottom <= evidence.minimap_bounds.top
            || evidence.minimap_bounds.right > evidence.stage_width
            || evidence.minimap_bounds.bottom > evidence.stage_height
          ) {
            fail("INVALID_GRAPH_PRESENTATION_EVIDENCE", "2D minimap and rendered-label evidence must be positive, contained, complete, and hash-bound");
          }
          evidence.rendered_label_bounds.forEach((bounds, boundsIndex) => {
            const boundsField = `${evidenceField}.rendered_label_bounds[${boundsIndex}]`;
            assertRecord(bounds, boundsField);
            for (const coordinate of ["bottom", "left", "right", "top"]) {
              assertNumber(bounds[coordinate], `${boundsField}.${coordinate}`);
            }
            if (
              bounds.right <= bounds.left || bounds.bottom <= bounds.top
              || bounds.left < evidence.minimap_bounds.right
                && bounds.right > evidence.minimap_bounds.left
                && bounds.top < evidence.minimap_bounds.bottom
                && bounds.bottom > evidence.minimap_bounds.top
            ) {
              fail("GRAPH_PRESENTATION_COLLISION", "Rendered 2D labels must have positive bounds and remain outside the visible minimap");
            }
          });
        } else if (evidence.minimap_label_collision_count !== null) {
          fail("INVALID_GRAPH_PRESENTATION_EVIDENCE", "3D graph evidence cannot claim a 2D minimap collision measurement");
        } else if (
          evidence.minimap_bounds !== null
          || evidence.minimap_visible !== null
          || evidence.rendered_label_bounds !== null
          || evidence.rendered_label_bounds_sha256 !== null
          || evidence.rendered_label_count !== null
        ) {
          fail("INVALID_GRAPH_PRESENTATION_EVIDENCE", "3D graph evidence cannot carry 2D minimap or rendered-label measurements");
        }
        graphPresentations.add(key);
      });
      const requiredPresentations = mobile
        ? ["2D:portrait", "3D:portrait", "2D:landscape", "3D:landscape"]
        : ["2D:landscape", "3D:landscape"];
      if (requiredPresentations.some((presentation) => !graphPresentations.has(presentation))) {
        fail("INCOMPLETE_GRAPH_PRESENTATION_EVIDENCE", "Every required graph dimension and orientation needs collision-checked screenshot evidence");
      }
      if (mobile) {
        if (observation.desktop_layout_evidence !== null) {
          fail("INVALID_MOBILE_GRAPH_LAYOUT_EVIDENCE", "Mobile viewport evidence cannot claim a desktop panel layout");
        }
      } else {
        assertRecord(observation.desktop_layout_evidence, `${field}.desktop_layout_evidence`);
        assertEnum(observation.desktop_layout_evidence.layout, ["side-by-side"], `${field}.desktop_layout_evidence.layout`);
        assertRecord(observation.desktop_layout_evidence.viewport, `${field}.desktop_layout_evidence.viewport`);
        assertNumber(observation.desktop_layout_evidence.viewport.height, `${field}.desktop_layout_evidence.viewport.height`, 1, 10_000);
        assertNumber(observation.desktop_layout_evidence.viewport.width, `${field}.desktop_layout_evidence.viewport.width`, 1, 10_000);
        for (const panel of ["panels", "twoDPanel", "threeDPanel", "twoD", "threeD"]) {
          assertRecord(observation.desktop_layout_evidence[panel], `${field}.desktop_layout_evidence.${panel}`);
          for (const coordinate of ["bottom", "height", "left", "right", "top", "width"]) {
            assertNumber(observation.desktop_layout_evidence[panel][coordinate], `${field}.desktop_layout_evidence.${panel}.${coordinate}`, -1_000_000, 1_000_000);
          }
        }
        const { panels, twoD, twoDPanel, threeD, threeDPanel, viewport } = observation.desktop_layout_evidence;
        const contained = (inner, outer) => inner.left >= outer.left - 2
          && inner.right <= outer.right + 2
          && inner.top >= outer.top - 2
          && inner.bottom <= outer.bottom + 2;
        const panelGap = threeDPanel.left - twoDPanel.right;
        const stageVerticalOverlap = Math.min(twoD.bottom, threeD.bottom) - Math.max(twoD.top, threeD.top);
        if (
          viewport.width !== observation.viewport_width
          || [panels, twoDPanel, threeDPanel, twoD, threeD].some((box) => box.width <= 1 || box.height <= 1)
          || Math.abs(twoDPanel.top - threeDPanel.top) > 4
          || twoDPanel.right > threeDPanel.left + 2
          || panelGap > panels.width * 0.08
          || twoDPanel.width < panels.width * 0.35
          || threeDPanel.width < panels.width * 0.35
          || stageVerticalOverlap < Math.min(twoD.height, threeD.height) * 0.5
          || !contained(twoDPanel, panels) || !contained(threeDPanel, panels)
          || !contained(twoD, twoDPanel) || !contained(threeD, threeDPanel)
          || twoD.right <= 0 || twoD.left >= viewport.width || twoD.bottom <= 0 || twoD.top >= viewport.height
          || threeD.right <= 0 || threeD.left >= viewport.width || threeD.bottom <= 0 || threeD.top >= viewport.height
        ) {
          fail("INVALID_DESKTOP_SIDE_BY_SIDE_EVIDENCE", "Desktop graph panels and stages must be visibly, measurably side by side and contained");
        }
      }
      if (
        observation.two_d_loaded !== true || observation.three_d_loaded !== true
        || observation.renderer_parity_verified !== true || observation.renderer_state_preserved !== true
        || observation.rendered_subset_authorized !== true || observation.selected_entity_authorized !== true
        || observation.command_canonical_data_verified !== true
        || observation.business_count !== journey.business_count
        || observation.businesses_state !== journey.businesses_state
        || observation.event_sequence !== projectionReadback.projection_version
        || observation.mobile_single_renderer !== mobile
        || observation.desktop_side_by_side !== !mobile
      ) {
        fail("FAILED_MEMBER_RENDERER_OBSERVATION", "Every viewport must load real 2D and 3D renderers with exact parity and the expected responsive presentation");
      }
    });
    if (observedWidths.size !== journey.viewport_widths.length) {
      fail("INCOMPLETE_MEMBER_VIEWPORT_OBSERVATIONS", "Every declared viewport requires a production execution observation");
    }
    if (journey.renderer_state_preserved !== true || journey.canonical_sync_errors !== 0) {
      fail("FAILED_CANONICAL_MEMBER_JOURNEY", "Renderer state must be preserved and canonical sync errors must be zero");
    }
  }
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

function assertNullableString(value, field, maximum = 2_000) {
  if (value !== null) assertString(value, field, 1, maximum);
}

function validateImprovementEvidence(value, field) {
  assertRecord(value, field);
  assertId(value.evidence_id, `${field}.evidence_id`);
  assertEnum(value.kind, IMPROVEMENT_SOURCES, `${field}.kind`);
  assertString(value.reference, `${field}.reference`, 1, 2_000);
  assertSha256(value.lineage_sha256, `${field}.lineage_sha256`);
  assertBoolean(value.valid, `${field}.valid`);
  assertIso(value.observed_at, `${field}.observed_at`);
}

function validateImprovementAmendmentDetails(value, field) {
  if (value === null) return;
  assertRecord(value, field);
  assertRecord(value.scope_delta, `${field}.scope_delta`);
  assertStringArray(value.scope_delta.added_requirements, `${field}.scope_delta.added_requirements`, { minimum: 1, unique: true });
  assertStringArray(value.scope_delta.removed_requirements, `${field}.scope_delta.removed_requirements`, { unique: true });
  assertStringArray(value.scope_delta.affected_paths, `${field}.scope_delta.affected_paths`, { minimum: 1, unique: true });
  assertStringArray(value.affected_contracts, `${field}.affected_contracts`, { minimum: 1, unique: true });
  assertStringArray(value.acceptance_criteria, `${field}.acceptance_criteria`, { minimum: 1, unique: true });
  assertString(value.commercial_unlock, `${field}.commercial_unlock`, 3, 2_000);
  assertRecord(value.dag_update, `${field}.dag_update`);
  assertInteger(value.dag_update.target_phase, `${field}.dag_update.target_phase`, 1);
  assertArray(value.dag_update.dependencies, `${field}.dag_update.dependencies`, { minimum: 1, unique: true });
  value.dag_update.dependencies.forEach((phase, index) => assertInteger(phase, `${field}.dag_update.dependencies[${index}]`, 1));
  assertRecord(value.supersession_record, `${field}.supersession_record`);
  assertStringArray(value.supersession_record.supersedes, `${field}.supersession_record.supersedes`, { minimum: 1, unique: true });
  assertString(value.supersession_record.reason, `${field}.supersession_record.reason`, 3, 2_000);
}

export function validateImprovementCandidate(value) {
  assertVersion(value, "improvement_candidate");
  assertId(value.candidate_id, "improvement_candidate.candidate_id");
  for (const field of ["tenant_id", "organization_id", "business_id"]) {
    assertNullableString(value[field], `improvement_candidate.${field}`, 200);
  }
  assertExecutionActor(value.actor);
  assertSha256(value.request_idempotency_key, "improvement_candidate.request_idempotency_key");
  assertInteger(value.version, "improvement_candidate.version", 1);
  assertEnum(value.source, IMPROVEMENT_SOURCES, "improvement_candidate.source");
  assertEnum(value.category, IMPROVEMENT_CATEGORIES, "improvement_candidate.category");
  assertString(value.title, "improvement_candidate.title", 3, 300);
  assertString(value.root_cause, "improvement_candidate.root_cause", 3, 2_000);
  assertEnum(value.root_cause_status, ["ACTIVE", "REMOVED"], "improvement_candidate.root_cause_status");
  assertString(value.affected_capability, "improvement_candidate.affected_capability", 2, 300);
  assertStringArray(value.affected_scope, "improvement_candidate.affected_scope", { minimum: 1, maximum: 100, unique: true });
  assertArray(value.evidence, "improvement_candidate.evidence", { minimum: 1, maximum: 1_000 });
  value.evidence.forEach((entry, index) => validateImprovementEvidence(entry, `improvement_candidate.evidence[${index}]`));
  if (new Set(value.evidence.map((entry) => entry.evidence_id)).size !== value.evidence.length) {
    fail("DUPLICATE_EVIDENCE", "ImprovementCandidate evidence IDs must be unique");
  }
  assertRecord(value.observed_impact, "improvement_candidate.observed_impact");
  assertString(value.observed_impact.summary, "improvement_candidate.observed_impact.summary", 3, 2_000);
  assertString(value.observed_impact.metric, "improvement_candidate.observed_impact.metric", 1, 200);
  if (value.observed_impact.measured_value !== null) assertNumber(value.observed_impact.measured_value, "improvement_candidate.observed_impact.measured_value", -1_000_000_000, 1_000_000_000);
  assertNullableString(value.observed_impact.unit, "improvement_candidate.observed_impact.unit", 100);
  assertNumber(value.confidence, "improvement_candidate.confidence", 0, 1);
  assertInteger(value.urgency, "improvement_candidate.urgency", 0, 100);
  assertInteger(value.estimated_effort, "improvement_candidate.estimated_effort", 1, 100);
  assertEnum(value.risk, ["LOW", "MEDIUM", "HIGH", "CRITICAL"], "improvement_candidate.risk");
  assertEnum(value.reversibility, ["FULL", "PARTIAL", "NONE"], "improvement_candidate.reversibility");
  assertRecord(value.expected_value, "improvement_candidate.expected_value");
  for (const field of ["value", "customer_impact", "security_impact", "revenue_impact", "cost_impact"]) {
    assertInteger(value.expected_value[field], `improvement_candidate.expected_value.${field}`, 0, 100);
  }
  assertRecord(value.score, "improvement_candidate.score");
  for (const field of ["value", "confidence", "urgency", "customer_impact", "security_impact", "revenue_impact", "cost_impact", "effort", "risk", "total"]) {
    assertNumber(value.score[field], `improvement_candidate.score.${field}`, 0, 100);
  }
  assertBoolean(value.product_defining, "improvement_candidate.product_defining");
  assertStringArray(value.owner_review_topics, "improvement_candidate.owner_review_topics", { maximum: IMPROVEMENT_OWNER_REVIEW_TOPICS.length, unique: true });
  value.owner_review_topics.forEach((topic, index) => assertEnum(topic, IMPROVEMENT_OWNER_REVIEW_TOPICS, `improvement_candidate.owner_review_topics[${index}]`));
  assertInteger(value.budget_units, "improvement_candidate.budget_units", 1, 10_000);
  assertBoolean(value.emergency_repair, "improvement_candidate.emergency_repair");
  assertStringArray(value.deterministic_tests, "improvement_candidate.deterministic_tests", { unique: true });
  assertSha256(value.root_cause_fingerprint_sha256, "improvement_candidate.root_cause_fingerprint_sha256");
  assertSha256(value.evidence_lineage_sha256, "improvement_candidate.evidence_lineage_sha256");
  assertSha256(value.deduplication_key_sha256, "improvement_candidate.deduplication_key_sha256");
  assertEnum(value.status, IMPROVEMENT_STATUSES, "improvement_candidate.status");
  assertNullableString(value.rationale, "improvement_candidate.rationale");
  assertNullableString(value.reevaluation_trigger, "improvement_candidate.reevaluation_trigger");
  assertInteger(value.proposed_phase, "improvement_candidate.proposed_phase", 1);
  assertRecord(value.outcome_target, "improvement_candidate.outcome_target");
  assertString(value.outcome_target.metric, "improvement_candidate.outcome_target.metric", 1, 200);
  assertEnum(value.outcome_target.direction, ["INCREASE", "DECREASE", "MAINTAIN"], "improvement_candidate.outcome_target.direction");
  if (value.outcome_target.baseline_value !== null) assertNumber(value.outcome_target.baseline_value, "improvement_candidate.outcome_target.baseline_value", -1_000_000_000, 1_000_000_000);
  assertNumber(value.outcome_target.expected_delta, "improvement_candidate.outcome_target.expected_delta", -1_000_000_000, 1_000_000_000);
  assertString(value.outcome_target.unit, "improvement_candidate.outcome_target.unit", 1, 100);
  validateImprovementAmendmentDetails(value.amendment_details, "improvement_candidate.amendment_details");
  const material = value.product_defining
    || value.owner_review_topics.length > 0
    || ["PRODUCT_ENHANCEMENT", "COMMERCIAL_CHANGE", "RESEARCH_HYPOTHESIS"].includes(value.category)
    || value.risk !== "LOW"
    || value.reversibility !== "FULL"
    || value.affected_scope.some((entry) => entry.replaceAll("\\", "/").startsWith(".entral/governor/"));
  if (material && value.amendment_details === null) fail("MATERIAL_AMENDMENT_REQUIRED", "Material ImprovementCandidates require complete amendment details");
  for (const field of ["created_at", "updated_at"]) assertIso(value[field], `improvement_candidate.${field}`);
  assertSha40(value.release_version, "improvement_candidate.release_version");
  assertSafeTextTree(value, "improvement_candidate");
  return value;
}

export function validatePhaseAmendment(value) {
  assertVersion(value, "phase_amendment");
  assertId(value.amendment_id, "phase_amendment.amendment_id");
  assertId(value.candidate_id, "phase_amendment.candidate_id");
  for (const field of ["tenant_id", "organization_id", "business_id"]) assertNullableString(value[field], `phase_amendment.${field}`, 200);
  assertExecutionActor(value.actor);
  assertSha256(value.request_idempotency_key, "phase_amendment.request_idempotency_key");
  assertInteger(value.phase, "phase_amendment.phase", 1);
  assertInteger(value.version, "phase_amendment.version", 1);
  assertInteger(value.candidate_version, "phase_amendment.candidate_version", 1);
  assertString(value.reason, "phase_amendment.reason", 3, 2_000);
  assertRecord(value.scope_delta, "phase_amendment.scope_delta");
  assertStringArray(value.scope_delta.added_requirements, "phase_amendment.scope_delta.added_requirements", { minimum: 1, unique: true });
  assertStringArray(value.scope_delta.removed_requirements, "phase_amendment.scope_delta.removed_requirements", { unique: true });
  assertStringArray(value.scope_delta.affected_paths, "phase_amendment.scope_delta.affected_paths", { minimum: 1, unique: true });
  assertArray(value.evidence, "phase_amendment.evidence", { minimum: 1 });
  value.evidence.forEach((entry, index) => validateImprovementEvidence(entry, `phase_amendment.evidence[${index}]`));
  assertStringArray(value.affected_contracts, "phase_amendment.affected_contracts", { minimum: 1, unique: true });
  assertStringArray(value.acceptance_criteria, "phase_amendment.acceptance_criteria", { minimum: 1, unique: true });
  assertString(value.commercial_unlock, "phase_amendment.commercial_unlock", 3, 2_000);
  assertRecord(value.dag_update, "phase_amendment.dag_update");
  assertInteger(value.dag_update.target_phase, "phase_amendment.dag_update.target_phase", 1);
  assertArray(value.dag_update.dependencies, "phase_amendment.dag_update.dependencies", { minimum: 1, unique: true });
  value.dag_update.dependencies.forEach((phase, index) => assertInteger(phase, `phase_amendment.dag_update.dependencies[${index}]`, 1));
  assertRecord(value.supersession_record, "phase_amendment.supersession_record");
  assertStringArray(value.supersession_record.supersedes, "phase_amendment.supersession_record.supersedes", { minimum: 1, unique: true });
  assertString(value.supersession_record.reason, "phase_amendment.supersession_record.reason", 3, 2_000);
  assertEnum(value.approval_status, ["OWNER_REVIEW_REQUIRED", "ACCEPTED_BY_OWNER", "REJECTED", "DEFERRED"], "phase_amendment.approval_status");
  assertStringArray(value.owner_review_topics, "phase_amendment.owner_review_topics", { unique: true });
  value.owner_review_topics.forEach((topic, index) => assertEnum(topic, IMPROVEMENT_OWNER_REVIEW_TOPICS, `phase_amendment.owner_review_topics[${index}]`));
  if (value.owner_approval !== null) {
    assertRecord(value.owner_approval, "phase_amendment.owner_approval");
    assertId(value.owner_approval.decision_id, "phase_amendment.owner_approval.decision_id");
    if (value.owner_approval.owner_attested !== true) fail("UNATTESTED_OWNER_APPROVAL", "Accepted PhaseAmendments require an owner-attested approval");
    assertIso(value.owner_approval.approved_at, "phase_amendment.owner_approval.approved_at");
    assertSha256(value.owner_approval.evidence_sha256, "phase_amendment.owner_approval.evidence_sha256");
  }
  if (value.approval_status === "ACCEPTED_BY_OWNER" && value.owner_approval === null) fail("MISSING_OWNER_APPROVAL", "Accepted PhaseAmendments require owner approval evidence");
  if (value.approval_status !== "ACCEPTED_BY_OWNER" && value.owner_approval !== null) fail("UNBOUND_OWNER_APPROVAL", "Only accepted PhaseAmendments may carry owner approval evidence");
  assertNullableString(value.rationale, "phase_amendment.rationale");
  assertNullableString(value.reevaluation_trigger, "phase_amendment.reevaluation_trigger");
  for (const field of ["created_at", "updated_at"]) assertIso(value[field], `phase_amendment.${field}`);
  assertSha40(value.release_version, "phase_amendment.release_version");
  assertSafeTextTree(value, "phase_amendment");
  return value;
}

export function validateImprovementOutcome(value) {
  assertVersion(value, "improvement_outcome");
  assertId(value.outcome_id, "improvement_outcome.outcome_id");
  assertId(value.candidate_id, "improvement_outcome.candidate_id");
  for (const field of ["tenant_id", "organization_id", "business_id"]) assertNullableString(value[field], `improvement_outcome.${field}`, 200);
  assertExecutionActor(value.actor);
  assertSha256(value.request_idempotency_key, "improvement_outcome.request_idempotency_key");
  assertSha40(value.implementation_release_sha, "improvement_outcome.implementation_release_sha");
  assertString(value.metric, "improvement_outcome.metric", 1, 200);
  if (value.baseline_value !== null) assertNumber(value.baseline_value, "improvement_outcome.baseline_value", -1_000_000_000, 1_000_000_000);
  if (value.observed_value !== null) assertNumber(value.observed_value, "improvement_outcome.observed_value", -1_000_000_000, 1_000_000_000);
  if (value.delta !== null) assertNumber(value.delta, "improvement_outcome.delta", -1_000_000_000, 1_000_000_000);
  assertEnum(value.result, ["IMPROVED", "UNCHANGED", "REGRESSED", "UNAVAILABLE"], "improvement_outcome.result");
  if (value.result === "UNAVAILABLE" && (value.observed_value !== null || value.delta !== null)) fail("DISHONEST_OUTCOME", "Unavailable outcomes cannot invent an observed value or delta");
  if (value.result !== "UNAVAILABLE" && (value.observed_value === null || value.delta === null)) fail("MISSING_OUTCOME_MEASUREMENT", "Measured outcomes require observed value and delta");
  assertArray(value.evidence, "improvement_outcome.evidence", { minimum: 1 });
  value.evidence.forEach((entry, index) => validateImprovementEvidence(entry, `improvement_outcome.evidence[${index}]`));
  assertIso(value.measured_at, "improvement_outcome.measured_at");
  assertSha40(value.release_version, "improvement_outcome.release_version");
  assertSafeTextTree(value, "improvement_outcome");
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
    case "ReleaseControlPlan": return validateReleaseControlPlan(value);
    case "ReleaseControlEvidence": return validateReleaseControlEvidence(value);
    case "ReleaseEvidenceBundle": return validateReleaseEvidenceBundle(value);
    case "OwnerEscalation": return validateOwnerEscalation(value);
    case "SessionCheckpoint": return validateSessionCheckpoint(value);
    case "GPTProReviewRequest": return validateReviewRequest(value, context.program);
    case "ProReviewVerdict": return validateReviewVerdict(value);
    case "GovernorEvent": return validateGovernorEvent(value);
    case "ReviewRecord": return validateSimpleRecord(value, "review_record", ["checkpoint_id", "phase", "policy", "status", "request_commit_sha", "verdict", "updated_at"]);
    case "IncidentRecord": return validateSimpleRecord(value, "incident_record", ["incident_id", "phase", "severity", "summary", "evidence", "status", "created_at"]);
    case "ImprovementCandidate": return validateImprovementCandidate(value);
    case "PhaseAmendment": return validatePhaseAmendment(value);
    case "ImprovementOutcome": return validateImprovementOutcome(value);
    default: fail("UNKNOWN_CONTRACT", `Unsupported contract ${name}`);
  }
}

export function isHealthyLease(lease, now = new Date()) {
  return Boolean(lease && typeof lease.expires_at === "string" && Date.parse(lease.expires_at) > now.getTime());
}

export function assertProgramStatus(value) {
  assertEnum(value, PROGRAM_STATUSES, "program.status");
}
