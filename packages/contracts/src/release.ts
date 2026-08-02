import {
  ContractError,
  assertIsoDate,
  assertNonEmptyString,
  assertRecord,
  assertSafeNonNegativeInteger,
  assertUuid
} from "./validation.js";

export const RELEASE_EVIDENCE_CONTRACT_VERSION = "1.0.0" as const;
export const RELEASE_EVIDENCE_SCHEMA_VERSION = 1 as const;
export const WORKER_READINESS_CONTRACT_VERSION = "1.0.0" as const;
export const PHASE_195_RELEASE_PHASE = 195 as const;
export const PHASE_195_RELEASE_MIGRATION_NAME =
  "20260726190000_phase_195_graph_preferences_release_evidence_and_worker_readiness" as const;
export const PHASE_195_RELEASE_CI_WORKFLOW =
  ".github/workflows/ci-cd.yml" as const;

export type ReleaseEnvironment = "development" | "preview" | "staging" | "production";
export type ReleaseVerificationState = "PENDING" | "VERIFIED" | "FAILED" | "BLOCKED";
export type ReleaseActorType = "HUMAN" | "SERVICE" | "SYSTEM";

export interface ReleaseEvidenceReference {
  readonly reference_id: string;
  readonly reference_type: "ARTIFACT" | "DATABASE_READBACK" | "DEPLOYMENT_READBACK" | "TEST_RESULT" | "EXTERNAL_RECEIPT";
  readonly content_sha256: string | null;
  readonly captured_at: string;
}

export interface ReleaseEvidenceRecordBase {
  readonly contract_version: typeof RELEASE_EVIDENCE_CONTRACT_VERSION;
  readonly schema_version: typeof RELEASE_EVIDENCE_SCHEMA_VERSION;
  readonly record_id: string;
  readonly phase: number;
  readonly organization_id: string | null;
  readonly business_id: string | null;
  readonly environment: ReleaseEnvironment;
  readonly actor: {
    readonly actor_type: ReleaseActorType;
    readonly actor_id: string;
  };
  readonly idempotency_key: string;
  readonly version: number;
  readonly verification_state: ReleaseVerificationState;
  readonly evidence_references: readonly ReleaseEvidenceReference[];
  readonly classification: "INTERNAL";
  readonly retention: "RELEASE_LIFETIME";
  readonly exportable: true;
  readonly deletion_behavior: "RETAIN";
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CanonicalReleaseRecord extends ReleaseEvidenceRecordBase {
  readonly record_type: "CANONICAL_RELEASE";
  readonly repository: string;
  readonly git_commit_sha: string;
  readonly release_tag: string;
  readonly release_status: "CANDIDATE" | "ACCEPTED" | "DEPLOYED" | "ROLLED_BACK";
  readonly accepted_at: string | null;
  readonly rollback_status: "NOT_REQUIRED" | "AVAILABLE" | "EXECUTED" | "UNAVAILABLE";
}

export interface MigrationFingerprint extends ReleaseEvidenceRecordBase {
  readonly record_type: "MIGRATION_FINGERPRINT";
  readonly release_id: string;
  readonly migration_name: string;
  readonly checksum_sha256: string;
  readonly applied_at: string | null;
  readonly verified_at: string | null;
  readonly recovery_status: "UNVERIFIED" | "FORWARD_RECOVERY_VERIFIED" | "RESTORE_VERIFIED";
}

export interface DeploymentEvidence extends ReleaseEvidenceRecordBase {
  readonly record_type: "DEPLOYMENT_EVIDENCE";
  readonly release_id: string;
  readonly deployment_role: "FRONTEND" | "API" | "WORKER";
  readonly service_name: string;
  readonly provider: string;
  readonly deployment_id: string;
  readonly deployed_commit_sha: string;
  readonly public_url: string | null;
  readonly deployment_status: "PENDING" | "READY" | "FAILED" | "ROLLED_BACK";
  readonly deployed_at: string | null;
  readonly checked_at: string;
  readonly source_freshness_seconds: number;
}

export interface PullRequestDisposition extends ReleaseEvidenceRecordBase {
  readonly record_type: "PULL_REQUEST_DISPOSITION";
  readonly release_id: string;
  readonly repository: string;
  readonly pull_request_number: number;
  readonly head_commit_sha: string;
  readonly disposition: "MERGED" | "SUPERSEDED" | "REJECTED" | "OPEN_BLOCKER";
  readonly rationale: string;
  readonly decided_at: string;
}

export interface RuntimeModeRecord extends ReleaseEvidenceRecordBase {
  readonly record_type: "RUNTIME_MODE";
  readonly release_id: string;
  readonly service_name: string;
  readonly process_role: "API" | "WORKER" | "COMBINED";
  readonly runtime_mode: "DEVELOPMENT" | "TEST" | "PRODUCTION";
  readonly observed_commit_sha: string;
  readonly in_memory_canonical_state_reachable: boolean;
  readonly deterministic_fallback_reachable: boolean;
  readonly sample_data_reachable: boolean;
  readonly observed_at: string;
}

export interface PhaseGateRecord extends ReleaseEvidenceRecordBase {
  readonly record_type: "PHASE_GATE";
  readonly release_id: string;
  readonly gate_id: string;
  readonly gate_status: "OPEN" | "PASSED" | "FAILED" | "BLOCKED";
  readonly expected_release_version: number;
  readonly migration_fingerprint_ids: readonly string[];
  readonly deployment_evidence_ids: readonly string[];
  readonly pull_request_disposition_ids: readonly string[];
  readonly runtime_mode_record_ids: readonly string[];
  readonly test_evidence_references: readonly string[];
  readonly ci_provider: string | null;
  readonly ci_repository: string | null;
  readonly ci_workflow: string | null;
  readonly ci_git_commit_sha: string | null;
  readonly ci_run_id: string | null;
  readonly ci_run_url: string | null;
  readonly ci_result: "PENDING" | "SUCCESS" | "FAILED";
  readonly ci_artifact_ids: readonly string[];
  readonly authenticated_smoke_receipt_id: string | null;
  readonly authenticated_smoke_target_url: string | null;
  readonly authenticated_smoke_status: "PENDING" | "PASSED" | "FAILED";
  readonly rollback_recovery_reference: string | null;
  readonly remaining_external_boundaries: readonly string[];
  readonly closed_at: string | null;
}

export interface PhaseReleaseEvidenceReadback {
  readonly contract_version: typeof RELEASE_EVIDENCE_CONTRACT_VERSION;
  readonly schema_version: typeof RELEASE_EVIDENCE_SCHEMA_VERSION;
  readonly phase: number;
  readonly complete: boolean;
  readonly canonical_release: CanonicalReleaseRecord | null;
  readonly phase_gate: PhaseGateRecord | null;
  readonly migration_fingerprints: readonly MigrationFingerprint[];
  readonly deployments: readonly DeploymentEvidence[];
  readonly pull_request_dispositions: readonly PullRequestDisposition[];
  readonly runtime_modes: readonly RuntimeModeRecord[];
  readonly blockers: readonly string[];
  readonly generated_at: string;
}

export interface WorkerReadinessEvidence {
  readonly contract_version: typeof WORKER_READINESS_CONTRACT_VERSION;
  readonly schema_version: 1;
  readonly status: "READY" | "DEGRADED" | "STALE" | "UNAVAILABLE";
  readonly ready: boolean;
  readonly evidence_source: "DURABLE_HEARTBEAT" | "NONE";
  readonly observed_at: string | null;
  readonly age_seconds: number | null;
  readonly components: {
    readonly process: boolean;
    readonly automation_worker: boolean;
    readonly agent_orchestrator: boolean;
    readonly autonomy_scheduler: boolean;
    readonly canonical_outbox_dispatcher: boolean;
    readonly membership_notification_dispatcher: boolean;
  };
  readonly queue: {
    readonly pending: number;
    readonly publishing: number;
    readonly failed: number;
    readonly dead_letter: number;
    readonly published_last_24h: number;
  } | null;
}

const environments = ["development", "preview", "staging", "production"] as const;
const verificationStates = ["PENDING", "VERIFIED", "FAILED", "BLOCKED"] as const;
const actorTypes = ["HUMAN", "SERVICE", "SYSTEM"] as const;
const sha256Pattern = /^[a-f0-9]{64}$/;
const gitShaPattern = /^[a-f0-9]{40}$/;

function assertExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  field: string
): void {
  const keys = new Set(allowed);
  const unexpected = Object.keys(value).filter((key) => !keys.has(key));
  if (unexpected.length > 0) {
    throw new ContractError("UNKNOWN_RELEASE_FIELD", `${field} contains unsupported fields: ${unexpected.join(", ")}`);
  }
}

function assertEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): asserts value is T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ContractError("INVALID_RELEASE_ENUM", `${field} is not a supported value`);
  }
}

function assertNullableId(value: unknown, field: string): asserts value is string | null {
  if (value !== null) assertNonEmptyString(value, field, 200);
}

function assertSha256(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !sha256Pattern.test(value)) {
    throw new ContractError("INVALID_SHA256", `${field} must be a lowercase SHA-256 digest`);
  }
}

function assertGitSha(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !gitShaPattern.test(value)) {
    throw new ContractError("INVALID_GIT_SHA", `${field} must be a lowercase full Git commit SHA`);
  }
}

function assertNonNegativeFinite(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new ContractError("INVALID_RELEASE_NUMBER", `${field} must be a non-negative finite number`);
  }
}

function assertStringArray(value: unknown, field: string, maximum = 1_000): asserts value is string[] {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new ContractError("INVALID_RELEASE_ARRAY", `${field} must contain at most ${maximum} entries`);
  }
  value.forEach((candidate, index) => assertNonEmptyString(candidate, `${field}[${index}]`, 1_000));
  if (new Set(value).size !== value.length) {
    throw new ContractError("DUPLICATE_RELEASE_REFERENCE", `${field} must not contain duplicate entries`);
  }
}

function assertUuidArray(value: unknown, field: string): asserts value is string[] {
  if (!Array.isArray(value) || value.length > 10_000) {
    throw new ContractError("INVALID_RELEASE_ARRAY", `${field} must contain at most 10000 UUIDs`);
  }
  value.forEach((candidate, index) => assertUuid(candidate, `${field}[${index}]`));
  if (new Set(value).size !== value.length) {
    throw new ContractError("DUPLICATE_RELEASE_REFERENCE", `${field} must not contain duplicate entries`);
  }
}

function assertEvidenceReferences(value: unknown, field: string): asserts value is ReleaseEvidenceReference[] {
  if (!Array.isArray(value) || value.length > 1_000) {
    throw new ContractError("INVALID_RELEASE_EVIDENCE", `${field} must contain at most 1000 references`);
  }
  const ids = new Set<string>();
  value.forEach((reference, index) => {
    const referenceField = `${field}[${index}]`;
    assertRecord(reference, referenceField);
    assertExactKeys(reference, ["reference_id", "reference_type", "content_sha256", "captured_at"], referenceField);
    assertNonEmptyString(reference.reference_id, `${referenceField}.reference_id`, 500);
    assertEnum(
      reference.reference_type,
      ["ARTIFACT", "DATABASE_READBACK", "DEPLOYMENT_READBACK", "TEST_RESULT", "EXTERNAL_RECEIPT"],
      `${referenceField}.reference_type`
    );
    if (reference.content_sha256 !== null) assertSha256(reference.content_sha256, `${referenceField}.content_sha256`);
    assertIsoDate(reference.captured_at, `${referenceField}.captured_at`);
    if (ids.has(reference.reference_id)) {
      throw new ContractError("DUPLICATE_RELEASE_REFERENCE", `Duplicate evidence reference ${reference.reference_id}`);
    }
    ids.add(reference.reference_id);
  });
}

const commonKeys = [
  "contract_version", "schema_version", "record_id", "record_type", "phase",
  "organization_id", "business_id", "environment", "actor", "idempotency_key",
  "version", "verification_state", "evidence_references", "classification",
  "retention", "exportable", "deletion_behavior", "created_at", "updated_at"
] as const;

function assertReleaseBase(
  value: Record<string, unknown>,
  field: string,
  recordType: string,
  additionalKeys: readonly string[]
): void {
  assertExactKeys(value, [...commonKeys, ...additionalKeys], field);
  if (
    value.contract_version !== RELEASE_EVIDENCE_CONTRACT_VERSION
    || value.schema_version !== RELEASE_EVIDENCE_SCHEMA_VERSION
    || value.record_type !== recordType
  ) {
    throw new ContractError("RELEASE_CONTRACT_VERSION", `${field} uses an unsupported contract, schema, or record type`);
  }
  assertUuid(value.record_id, `${field}.record_id`);
  assertSafeNonNegativeInteger(value.phase, `${field}.phase`);
  if ((value.phase as number) < 1) throw new ContractError("INVALID_PHASE", `${field}.phase must be positive`);
  assertNullableId(value.organization_id, `${field}.organization_id`);
  if (value.business_id !== null) assertUuid(value.business_id, `${field}.business_id`);
  assertEnum(value.environment, environments, `${field}.environment`);
  assertRecord(value.actor, `${field}.actor`);
  assertExactKeys(value.actor, ["actor_type", "actor_id"], `${field}.actor`);
  assertEnum(value.actor.actor_type, actorTypes, `${field}.actor.actor_type`);
  assertNonEmptyString(value.actor.actor_id, `${field}.actor.actor_id`, 200);
  assertNonEmptyString(value.idempotency_key, `${field}.idempotency_key`, 255);
  if ((value.idempotency_key as string).length < 12) {
    throw new ContractError("IDEMPOTENCY_KEY", `${field}.idempotency_key must contain at least 12 characters`);
  }
  assertSafeNonNegativeInteger(value.version, `${field}.version`);
  if ((value.version as number) < 1) throw new ContractError("INVALID_VERSION", `${field}.version must be positive`);
  assertEnum(value.verification_state, verificationStates, `${field}.verification_state`);
  assertEvidenceReferences(value.evidence_references, `${field}.evidence_references`);
  if (
    value.classification !== "INTERNAL"
    || value.retention !== "RELEASE_LIFETIME"
    || value.exportable !== true
    || value.deletion_behavior !== "RETAIN"
  ) {
    throw new ContractError("INVALID_RELEASE_GOVERNANCE", `${field} has invalid classification, retention, export, or deletion behavior`);
  }
  assertIsoDate(value.created_at, `${field}.created_at`);
  assertIsoDate(value.updated_at, `${field}.updated_at`);
  if (Date.parse(value.updated_at as string) < Date.parse(value.created_at as string)) {
    throw new ContractError("INVALID_RELEASE_TIMELINE", `${field}.updated_at cannot precede created_at`);
  }
}

export function assertCanonicalReleaseRecord(value: unknown): asserts value is CanonicalReleaseRecord {
  assertRecord(value, "canonical_release");
  assertReleaseBase(value, "canonical_release", "CANONICAL_RELEASE", [
    "repository", "git_commit_sha", "release_tag", "release_status", "accepted_at", "rollback_status"
  ]);
  assertNonEmptyString(value.repository, "canonical_release.repository", 300);
  assertGitSha(value.git_commit_sha, "canonical_release.git_commit_sha");
  assertNonEmptyString(value.release_tag, "canonical_release.release_tag", 200);
  assertEnum(value.release_status, ["CANDIDATE", "ACCEPTED", "DEPLOYED", "ROLLED_BACK"], "canonical_release.release_status");
  if (value.accepted_at !== null) assertIsoDate(value.accepted_at, "canonical_release.accepted_at");
  assertEnum(value.rollback_status, ["NOT_REQUIRED", "AVAILABLE", "EXECUTED", "UNAVAILABLE"], "canonical_release.rollback_status");
  if (
    (value.release_status === "ACCEPTED" || value.release_status === "DEPLOYED")
    && (value.verification_state !== "VERIFIED" || value.accepted_at === null)
  ) {
    throw new ContractError("UNVERIFIED_RELEASE", "Accepted or deployed canonical releases require verified evidence and accepted_at");
  }
}

export function assertMigrationFingerprint(value: unknown): asserts value is MigrationFingerprint {
  assertRecord(value, "migration_fingerprint");
  assertReleaseBase(value, "migration_fingerprint", "MIGRATION_FINGERPRINT", [
    "release_id", "migration_name", "checksum_sha256", "applied_at", "verified_at", "recovery_status"
  ]);
  assertUuid(value.release_id, "migration_fingerprint.release_id");
  assertNonEmptyString(value.migration_name, "migration_fingerprint.migration_name", 300);
  assertSha256(value.checksum_sha256, "migration_fingerprint.checksum_sha256");
  if (value.applied_at !== null) assertIsoDate(value.applied_at, "migration_fingerprint.applied_at");
  if (value.verified_at !== null) assertIsoDate(value.verified_at, "migration_fingerprint.verified_at");
  assertEnum(
    value.recovery_status,
    ["UNVERIFIED", "FORWARD_RECOVERY_VERIFIED", "RESTORE_VERIFIED"],
    "migration_fingerprint.recovery_status"
  );
  if (value.verification_state === "VERIFIED" && (value.applied_at === null || value.verified_at === null)) {
    throw new ContractError("UNVERIFIED_MIGRATION", "Verified migrations require applied_at and verified_at readback");
  }
}

export function assertDeploymentEvidence(value: unknown): asserts value is DeploymentEvidence {
  assertRecord(value, "deployment_evidence");
  assertReleaseBase(value, "deployment_evidence", "DEPLOYMENT_EVIDENCE", [
    "release_id", "deployment_role", "service_name", "provider", "deployment_id", "deployed_commit_sha",
    "public_url", "deployment_status", "deployed_at", "checked_at", "source_freshness_seconds"
  ]);
  assertUuid(value.release_id, "deployment_evidence.release_id");
  assertEnum(value.deployment_role, ["FRONTEND", "API", "WORKER"], "deployment_evidence.deployment_role");
  assertNonEmptyString(value.service_name, "deployment_evidence.service_name", 200);
  assertNonEmptyString(value.provider, "deployment_evidence.provider", 200);
  assertNonEmptyString(value.deployment_id, "deployment_evidence.deployment_id", 300);
  assertGitSha(value.deployed_commit_sha, "deployment_evidence.deployed_commit_sha");
  if (value.public_url !== null) {
    assertNonEmptyString(value.public_url, "deployment_evidence.public_url", 2_000);
    let parsed: URL;
    try {
      parsed = new URL(value.public_url);
    } catch {
      throw new ContractError("INVALID_DEPLOYMENT_URL", "deployment_evidence.public_url must be an absolute URL");
    }
    if (parsed.protocol !== "https:" && value.environment === "production") {
      throw new ContractError("INVALID_DEPLOYMENT_URL", "Production deployment URLs require HTTPS");
    }
  }
  assertEnum(value.deployment_status, ["PENDING", "READY", "FAILED", "ROLLED_BACK"], "deployment_evidence.deployment_status");
  if (value.deployed_at !== null) assertIsoDate(value.deployed_at, "deployment_evidence.deployed_at");
  assertIsoDate(value.checked_at, "deployment_evidence.checked_at");
  assertNonNegativeFinite(value.source_freshness_seconds, "deployment_evidence.source_freshness_seconds");
  if (
    value.verification_state === "VERIFIED"
    && (value.deployment_status !== "READY" || value.deployed_at === null)
  ) {
    throw new ContractError("UNVERIFIED_DEPLOYMENT", "Verified deployments require READY status and deployed_at");
  }
}

export function assertPullRequestDisposition(value: unknown): asserts value is PullRequestDisposition {
  assertRecord(value, "pull_request_disposition");
  assertReleaseBase(value, "pull_request_disposition", "PULL_REQUEST_DISPOSITION", [
    "release_id", "repository", "pull_request_number", "head_commit_sha",
    "disposition", "rationale", "decided_at"
  ]);
  assertUuid(value.release_id, "pull_request_disposition.release_id");
  assertNonEmptyString(value.repository, "pull_request_disposition.repository", 300);
  assertSafeNonNegativeInteger(value.pull_request_number, "pull_request_disposition.pull_request_number");
  if ((value.pull_request_number as number) < 1) {
    throw new ContractError("INVALID_PULL_REQUEST", "pull_request_number must be positive");
  }
  assertGitSha(value.head_commit_sha, "pull_request_disposition.head_commit_sha");
  assertEnum(value.disposition, ["MERGED", "SUPERSEDED", "REJECTED", "OPEN_BLOCKER"], "pull_request_disposition.disposition");
  assertNonEmptyString(value.rationale, "pull_request_disposition.rationale", 2_000);
  assertIsoDate(value.decided_at, "pull_request_disposition.decided_at");
}

export function assertRuntimeModeRecord(value: unknown): asserts value is RuntimeModeRecord {
  assertRecord(value, "runtime_mode");
  assertReleaseBase(value, "runtime_mode", "RUNTIME_MODE", [
    "release_id", "service_name", "process_role", "runtime_mode", "observed_commit_sha",
    "in_memory_canonical_state_reachable", "deterministic_fallback_reachable",
    "sample_data_reachable", "observed_at"
  ]);
  assertUuid(value.release_id, "runtime_mode.release_id");
  assertNonEmptyString(value.service_name, "runtime_mode.service_name", 200);
  assertEnum(value.process_role, ["API", "WORKER", "COMBINED"], "runtime_mode.process_role");
  assertEnum(value.runtime_mode, ["DEVELOPMENT", "TEST", "PRODUCTION"], "runtime_mode.runtime_mode");
  assertGitSha(value.observed_commit_sha, "runtime_mode.observed_commit_sha");
  for (const flag of [
    "in_memory_canonical_state_reachable",
    "deterministic_fallback_reachable",
    "sample_data_reachable"
  ] as const) {
    if (typeof value[flag] !== "boolean") {
      throw new ContractError("INVALID_RUNTIME_FLAG", `runtime_mode.${flag} must be a boolean`);
    }
  }
  assertIsoDate(value.observed_at, "runtime_mode.observed_at");
  if (
    value.environment === "production"
    && value.verification_state === "VERIFIED"
    && (
      value.runtime_mode !== "PRODUCTION"
      || value.process_role === "COMBINED"
      || value.in_memory_canonical_state_reachable
      || value.deterministic_fallback_reachable
      || value.sample_data_reachable
    )
  ) {
    throw new ContractError("UNSAFE_PRODUCTION_RUNTIME", "Verified production runtime evidence must prove separated processes and no fallback data paths");
  }
}

export function assertPhaseGateRecord(value: unknown): asserts value is PhaseGateRecord {
  assertRecord(value, "phase_gate");
  assertReleaseBase(value, "phase_gate", "PHASE_GATE", [
    "release_id", "gate_id", "gate_status", "expected_release_version",
    "migration_fingerprint_ids", "deployment_evidence_ids",
    "pull_request_disposition_ids", "runtime_mode_record_ids",
    "test_evidence_references", "ci_provider", "ci_repository", "ci_workflow",
    "ci_git_commit_sha", "ci_run_id", "ci_run_url", "ci_result",
    "ci_artifact_ids", "authenticated_smoke_receipt_id",
    "authenticated_smoke_target_url", "authenticated_smoke_status",
    "rollback_recovery_reference", "remaining_external_boundaries", "closed_at"
  ]);
  assertUuid(value.release_id, "phase_gate.release_id");
  assertNonEmptyString(value.gate_id, "phase_gate.gate_id", 200);
  assertEnum(value.gate_status, ["OPEN", "PASSED", "FAILED", "BLOCKED"], "phase_gate.gate_status");
  assertSafeNonNegativeInteger(value.expected_release_version, "phase_gate.expected_release_version");
  if ((value.expected_release_version as number) < 1) {
    throw new ContractError("INVALID_VERSION", "phase_gate.expected_release_version must be positive");
  }
  assertUuidArray(value.migration_fingerprint_ids, "phase_gate.migration_fingerprint_ids");
  assertUuidArray(value.deployment_evidence_ids, "phase_gate.deployment_evidence_ids");
  assertUuidArray(value.pull_request_disposition_ids, "phase_gate.pull_request_disposition_ids");
  assertUuidArray(value.runtime_mode_record_ids, "phase_gate.runtime_mode_record_ids");
  assertStringArray(value.test_evidence_references, "phase_gate.test_evidence_references");
  assertNullableId(value.ci_provider, "phase_gate.ci_provider");
  if (value.ci_repository !== null) {
    assertNonEmptyString(value.ci_repository, "phase_gate.ci_repository", 300);
  }
  if (value.ci_workflow !== null) {
    assertNonEmptyString(value.ci_workflow, "phase_gate.ci_workflow", 300);
  }
  if (value.ci_git_commit_sha !== null) {
    assertGitSha(value.ci_git_commit_sha, "phase_gate.ci_git_commit_sha");
  }
  assertNullableId(value.ci_run_id, "phase_gate.ci_run_id");
  if (value.ci_run_url !== null) {
    assertNonEmptyString(value.ci_run_url, "phase_gate.ci_run_url", 2_000);
    let parsed: URL;
    try {
      parsed = new URL(value.ci_run_url);
    } catch {
      throw new ContractError("INVALID_CI_URL", "phase_gate.ci_run_url must be an absolute URL");
    }
    if (parsed.protocol !== "https:") {
      throw new ContractError("INVALID_CI_URL", "phase_gate.ci_run_url must use HTTPS");
    }
    if (
      value.ci_provider === "GITHUB_ACTIONS"
      && value.ci_repository !== null
      && value.ci_run_id !== null
      && value.ci_run_url !==
        `https://github.com/${value.ci_repository}/actions/runs/${value.ci_run_id}`
    ) {
      throw new ContractError(
        "INVALID_CI_URL",
        "phase_gate.ci_run_url must exactly bind its GitHub repository and run ID"
      );
    }
  }
  assertEnum(value.ci_result, ["PENDING", "SUCCESS", "FAILED"], "phase_gate.ci_result");
  assertStringArray(value.ci_artifact_ids, "phase_gate.ci_artifact_ids");
  assertNullableId(
    value.authenticated_smoke_receipt_id,
    "phase_gate.authenticated_smoke_receipt_id"
  );
  if (value.authenticated_smoke_target_url !== null) {
    assertNonEmptyString(
      value.authenticated_smoke_target_url,
      "phase_gate.authenticated_smoke_target_url",
      2_000
    );
    let parsed: URL;
    try {
      parsed = new URL(value.authenticated_smoke_target_url);
    } catch {
      throw new ContractError(
        "INVALID_SMOKE_URL",
        "phase_gate.authenticated_smoke_target_url must be an absolute URL"
      );
    }
    if (parsed.protocol !== "https:") {
      throw new ContractError(
        "INVALID_SMOKE_URL",
        "phase_gate.authenticated_smoke_target_url must use HTTPS"
      );
    }
  }
  assertEnum(
    value.authenticated_smoke_status,
    ["PENDING", "PASSED", "FAILED"],
    "phase_gate.authenticated_smoke_status"
  );
  assertNullableId(
    value.rollback_recovery_reference,
    "phase_gate.rollback_recovery_reference"
  );
  assertStringArray(value.remaining_external_boundaries, "phase_gate.remaining_external_boundaries");
  if (value.closed_at !== null) assertIsoDate(value.closed_at, "phase_gate.closed_at");
  if (
    value.gate_status === "PASSED"
    && (
      value.verification_state !== "VERIFIED"
      || value.closed_at === null
      || value.migration_fingerprint_ids.length === 0
      || value.deployment_evidence_ids.length !== 3
      || value.pull_request_disposition_ids.length === 0
      || value.runtime_mode_record_ids.length !== 2
      || value.test_evidence_references.length === 0
      || value.ci_provider === null
      || (
        value.phase === PHASE_195_RELEASE_PHASE
        && value.ci_provider !== "GITHUB_ACTIONS"
      )
      || value.ci_repository === null
      || value.ci_workflow === null
      || (
        value.phase === PHASE_195_RELEASE_PHASE
        && value.ci_workflow !== PHASE_195_RELEASE_CI_WORKFLOW
      )
      || value.ci_git_commit_sha === null
      || value.ci_run_id === null
      || value.ci_run_url === null
      || value.ci_result !== "SUCCESS"
      || value.ci_artifact_ids.length === 0
      || value.authenticated_smoke_receipt_id === null
      || value.authenticated_smoke_target_url === null
      || value.authenticated_smoke_status !== "PASSED"
      || value.rollback_recovery_reference === null
      || value.remaining_external_boundaries.length > 0
    )
  ) {
    throw new ContractError(
      "UNVERIFIED_PHASE_GATE",
      "Passed phase gates require verified CI, artifacts, authenticated smoke, recovery evidence, closure time, and no remaining boundaries"
    );
  }
}

export function assertPhaseReleaseEvidenceReadback(
  value: unknown
): asserts value is PhaseReleaseEvidenceReadback {
  assertRecord(value, "release_evidence_readback");
  assertExactKeys(value, [
    "contract_version", "schema_version", "phase", "complete", "canonical_release",
    "phase_gate", "migration_fingerprints", "deployments",
    "pull_request_dispositions", "runtime_modes", "blockers", "generated_at"
  ], "release_evidence_readback");
  if (
    value.contract_version !== RELEASE_EVIDENCE_CONTRACT_VERSION
    || value.schema_version !== RELEASE_EVIDENCE_SCHEMA_VERSION
  ) {
    throw new ContractError("RELEASE_CONTRACT_VERSION", "release_evidence_readback uses an unsupported version");
  }
  assertSafeNonNegativeInteger(value.phase, "release_evidence_readback.phase");
  if (typeof value.complete !== "boolean") {
    throw new ContractError("INVALID_RELEASE_COMPLETION", "release_evidence_readback.complete must be a boolean");
  }
  if (value.canonical_release !== null) assertCanonicalReleaseRecord(value.canonical_release);
  if (value.phase_gate !== null) assertPhaseGateRecord(value.phase_gate);
  if (!Array.isArray(value.migration_fingerprints)) throw new ContractError("INVALID_RELEASE_ARRAY", "migration_fingerprints must be an array");
  value.migration_fingerprints.forEach(assertMigrationFingerprint);
  if (!Array.isArray(value.deployments)) throw new ContractError("INVALID_RELEASE_ARRAY", "deployments must be an array");
  value.deployments.forEach(assertDeploymentEvidence);
  if (!Array.isArray(value.pull_request_dispositions)) throw new ContractError("INVALID_RELEASE_ARRAY", "pull_request_dispositions must be an array");
  value.pull_request_dispositions.forEach(assertPullRequestDisposition);
  if (!Array.isArray(value.runtime_modes)) throw new ContractError("INVALID_RELEASE_ARRAY", "runtime_modes must be an array");
  value.runtime_modes.forEach(assertRuntimeModeRecord);
  assertStringArray(value.blockers, "release_evidence_readback.blockers");
  assertIsoDate(value.generated_at, "release_evidence_readback.generated_at");

  for (const record of [
    value.canonical_release,
    value.phase_gate,
    ...value.migration_fingerprints,
    ...value.deployments,
    ...value.pull_request_dispositions,
    ...value.runtime_modes
  ]) {
    if (record && record.phase !== value.phase) {
      throw new ContractError("RELEASE_PHASE_MISMATCH", "All release evidence records must match the requested phase");
    }
  }

  if (value.complete) {
    const release = value.canonical_release;
    const gate = value.phase_gate;
    if (
      !release
      || !gate
      || release.verification_state !== "VERIFIED"
      || !["ACCEPTED", "DEPLOYED"].includes(release.release_status)
      || gate.verification_state !== "VERIFIED"
      || gate.gate_status !== "PASSED"
      || gate.release_id !== release.record_id
      || gate.expected_release_version !== release.version
      || gate.ci_repository !== release.repository
      || gate.ci_git_commit_sha !== release.git_commit_sha
      || value.blockers.length > 0
      || value.migration_fingerprints.length === 0
      || value.deployments.length === 0
      || value.pull_request_dispositions.length === 0
      || value.runtime_modes.length === 0
      || gate.migration_fingerprint_ids.length === 0
      || gate.deployment_evidence_ids.length === 0
      || gate.pull_request_disposition_ids.length === 0
      || gate.runtime_mode_record_ids.length === 0
    ) {
      throw new ContractError("FALSE_RELEASE_COMPLETION", "Complete release readback requires one verified release, passed gate, deployment, runtime evidence, and no blockers");
    }
    for (const [expectedIds, records] of [
      [gate.migration_fingerprint_ids, value.migration_fingerprints],
      [gate.deployment_evidence_ids, value.deployments],
      [gate.pull_request_disposition_ids, value.pull_request_dispositions],
      [gate.runtime_mode_record_ids, value.runtime_modes]
    ] as const) {
      const actualRecordIds = records.map((record) => record.record_id);
      const actualIds = new Set(actualRecordIds);
      const expectedIdSet = new Set(expectedIds);
      if (
        actualIds.size !== actualRecordIds.length
        || expectedIds.length !== actualRecordIds.length
        || expectedIds.some((recordId) => !actualIds.has(recordId))
        || actualRecordIds.some((recordId) => !expectedIdSet.has(recordId))
      ) {
        throw new ContractError(
          "RELEASE_GATE_REFERENCE_MISMATCH",
          "Complete release readback requires each phase-gate evidence array to exactly match unique canonical records"
        );
      }
    }
    for (const deployment of value.deployments) {
      if (
        deployment.release_id !== release.record_id
        || deployment.environment !== "production"
        || deployment.verification_state !== "VERIFIED"
        || deployment.deployment_status !== "READY"
        || deployment.deployed_commit_sha !== release.git_commit_sha
      ) {
        throw new ContractError("DEPLOYMENT_RELEASE_MISMATCH", "Complete release deployments must verify the exact production release commit");
      }
    }
    const deploymentRoles = value.deployments
      .map((deployment) => deployment.deployment_role)
      .sort();
    if (
      deploymentRoles.length !== 3
      || deploymentRoles.join(",") !== "API,FRONTEND,WORKER"
    ) {
      throw new ContractError(
        "FALSE_RELEASE_COMPLETION",
        "Complete release readback requires exactly one gate-bound frontend, API, and worker deployment"
      );
    }
    for (const runtime of value.runtime_modes) {
      if (
        runtime.release_id !== release.record_id
        || runtime.environment !== "production"
        || runtime.verification_state !== "VERIFIED"
        || runtime.observed_commit_sha !== release.git_commit_sha
      ) {
        throw new ContractError("RUNTIME_RELEASE_MISMATCH", "Complete runtime records must verify the exact production release commit");
      }
    }
    const runtimeRoles = value.runtime_modes
      .map((runtime) => runtime.process_role)
      .sort();
    if (
      runtimeRoles.length !== 2
      || runtimeRoles.join(",") !== "API,WORKER"
    ) {
      throw new ContractError(
        "FALSE_RELEASE_COMPLETION",
        "Complete release readback requires exactly one gate-bound API and worker runtime"
      );
    }
    if (value.migration_fingerprints.some((migration) => (
      migration.release_id !== release.record_id || migration.verification_state !== "VERIFIED"
    ))) {
      throw new ContractError("MIGRATION_RELEASE_MISMATCH", "Every listed migration fingerprint must be verified for the release");
    }
    if (value.pull_request_dispositions.some((disposition) => (
      disposition.release_id !== release.record_id
      || disposition.verification_state !== "VERIFIED"
      || disposition.disposition === "OPEN_BLOCKER"
    ))) {
      throw new ContractError("PULL_REQUEST_RELEASE_MISMATCH", "Every listed pull-request disposition must be verified and reconciled for the release");
    }
  }
}

export function parsePhaseReleaseEvidenceReadback(value: unknown): PhaseReleaseEvidenceReadback {
  assertPhaseReleaseEvidenceReadback(value);
  return value;
}

export function assertWorkerReadinessEvidence(value: unknown): asserts value is WorkerReadinessEvidence {
  assertRecord(value, "worker_readiness");
  assertExactKeys(value, [
    "contract_version", "schema_version", "status", "ready", "evidence_source",
    "observed_at", "age_seconds", "components", "queue"
  ], "worker_readiness");
  if (
    value.contract_version !== WORKER_READINESS_CONTRACT_VERSION
    || value.schema_version !== 1
  ) {
    throw new ContractError("WORKER_READINESS_VERSION", "worker_readiness uses an unsupported version");
  }
  assertEnum(value.status, ["READY", "DEGRADED", "STALE", "UNAVAILABLE"], "worker_readiness.status");
  if (typeof value.ready !== "boolean") throw new ContractError("INVALID_WORKER_READINESS", "worker_readiness.ready must be a boolean");
  assertEnum(value.evidence_source, ["DURABLE_HEARTBEAT", "NONE"], "worker_readiness.evidence_source");
  if (value.observed_at !== null) assertIsoDate(value.observed_at, "worker_readiness.observed_at");
  if (value.age_seconds !== null) assertNonNegativeFinite(value.age_seconds, "worker_readiness.age_seconds");
  assertRecord(value.components, "worker_readiness.components");
  assertExactKeys(value.components, [
    "process", "automation_worker", "agent_orchestrator",
    "autonomy_scheduler", "canonical_outbox_dispatcher", "membership_notification_dispatcher"
  ], "worker_readiness.components");
  for (const component of Object.values(value.components)) {
    if (typeof component !== "boolean") {
      throw new ContractError("INVALID_WORKER_COMPONENT", "Worker readiness component values must be booleans");
    }
  }
  if (value.queue !== null) {
    assertRecord(value.queue, "worker_readiness.queue");
    assertExactKeys(value.queue, [
      "pending", "publishing", "failed", "dead_letter", "published_last_24h"
    ], "worker_readiness.queue");
    for (const [key, count] of Object.entries(value.queue)) {
      assertSafeNonNegativeInteger(count, `worker_readiness.queue.${key}`);
    }
  }
  if (value.ready !== (value.status === "READY")) {
    throw new ContractError("WORKER_READINESS_MISMATCH", "worker_readiness.ready must be true exactly when status is READY");
  }
  if (value.evidence_source === "NONE" && (value.observed_at !== null || value.age_seconds !== null || value.queue !== null)) {
    throw new ContractError("FALSE_WORKER_EVIDENCE", "Unavailable worker state cannot claim durable heartbeat or queue evidence");
  }
}

export function parseWorkerReadinessEvidence(value: unknown): WorkerReadinessEvidence {
  assertWorkerReadinessEvidence(value);
  return value;
}
