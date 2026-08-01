import {
  ContractError,
  assertIsoDate,
  assertNonEmptyString,
  assertRecord,
  assertSafeNonNegativeInteger,
  assertUuid
} from "./validation.js";

export const BASELINE_CERTIFICATION_CONTRACT_VERSION = "1.0.0" as const;
export const BASELINE_CERTIFICATION_SCHEMA_VERSION = 1 as const;
export const PHASE_199_BASELINE_PHASES = [
  100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 195
] as const;
export const BASELINE_REQUIREMENT_STATES = [
  "VERIFIED_COMPLETE",
  "IMPLEMENTED_UNVERIFIED",
  "PARTIAL",
  "FAILING",
  "MISSING",
  "SUPERSEDED",
  "CONTRADICTORY",
  "BLOCKED",
  "PRODUCTION_UNVERIFIED",
  "LEGACY_ISOLATED"
] as const;

export type BaselineRequirementState = typeof BASELINE_REQUIREMENT_STATES[number];
export type BaselineCertificationStatus = "CANDIDATE_REVIEW" | "CERTIFIED" | "BLOCKED";

export interface BaselineEvidenceReference {
  readonly path_or_id: string;
  readonly content_sha256: string | null;
  readonly evidence_type: "SOURCE" | "TEST" | "DEPLOYMENT" | "DATABASE" | "PRODUCTION_READBACK" | "AUDIT";
}

export interface BaselineRequirementRecord {
  readonly requirement_id: string;
  readonly phase: typeof PHASE_199_BASELINE_PHASES[number];
  readonly state: BaselineRequirementState;
  readonly summary: string;
  readonly evidence: readonly BaselineEvidenceReference[];
  readonly limitation: string | null;
}

export interface BaselineDeploymentRecord {
  readonly role: "FRONTEND" | "API" | "WORKER";
  readonly provider: "VERCEL" | "RAILWAY";
  readonly deployment_id: string;
  readonly deployed_commit_sha: string;
  readonly production_url: string;
  readonly status: "READY";
}

export interface BaselineMigrationRecord {
  readonly name: string;
  readonly status: "APPLIED" | "NO_SCHEMA_CHANGE";
  readonly checksum_sha256: string | null;
  readonly production_readback_sha256: string;
}

export interface LegacyIsolationRecord {
  readonly surface: string;
  readonly disposition: "DEVELOPMENT_ONLY" | "CATALOG_ONLY" | "PRESENTATION_ONLY" | "SUPERSEDED" | "MIGRATION_BOUNDARY";
  readonly production_reachable: boolean;
  readonly canonical_authority: boolean;
  readonly evidence: readonly string[];
}

export interface BaselineTestRecord {
  readonly command: string;
  readonly status: "PASSED" | "PENDING_REVIEW" | "NOT_APPLICABLE";
  readonly receipt_sha256: string | null;
}

export interface BaselineCertificationManifest {
  readonly contract_version: typeof BASELINE_CERTIFICATION_CONTRACT_VERSION;
  readonly schema_version: typeof BASELINE_CERTIFICATION_SCHEMA_VERSION;
  readonly manifest_id: string;
  readonly phase: 199;
  readonly status: BaselineCertificationStatus;
  readonly covered_phases: readonly number[];
  readonly repositories: {
    readonly product: { readonly repository: string; readonly main_sha: string };
    readonly control_website: { readonly repository: string; readonly main_sha: string };
  };
  readonly deployments: readonly BaselineDeploymentRecord[];
  readonly migrations: readonly BaselineMigrationRecord[];
  readonly runtime_versions: {
    readonly node: string;
    readonly pnpm: string;
    readonly postgres: string;
    readonly redis: string;
  };
  readonly requirements: readonly BaselineRequirementRecord[];
  readonly legacy_isolation: readonly LegacyIsolationRecord[];
  readonly tests: readonly BaselineTestRecord[];
  readonly production_truth: {
    readonly release_phase: 198;
    readonly canonical_release_id: string;
    readonly phase_gate_id: string;
    readonly authenticated_smoke_sha256: string;
    readonly state_readback_sha256: string;
  };
  readonly secure_json_reconciliation: {
    readonly status: "PENDING_DEPLOYMENT" | "VERIFIED" | "BLOCKED";
    readonly plaintext_rows_found: number | null;
    readonly plaintext_rows_reencrypted: number | null;
    readonly receipt_sha256: string | null;
  };
  readonly known_limitations: readonly string[];
  readonly rollback_point: {
    readonly release_phase: 197;
    readonly main_sha: string;
    readonly reference: string;
  };
  readonly certification: {
    readonly all_mandatory_gates_passed: boolean;
    readonly phase_200_blocked: boolean;
    readonly review_checkpoint_id: "P199-BASELINE-RECERTIFICATION-REVIEW";
    readonly review_verdict_commit_sha: string | null;
  };
  readonly generated_at: string;
}

const gitShaPattern = /^[a-f0-9]{40}$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const baselinePhaseSet = new Set<number>(PHASE_199_BASELINE_PHASES);
const requirementStateSet = new Set<string>(BASELINE_REQUIREMENT_STATES);

function assertGitSha(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !gitShaPattern.test(value)) {
    throw new ContractError("INVALID_BASELINE_GIT_SHA", `${field} must be a lowercase full Git commit SHA`);
  }
}

function assertSha256(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !sha256Pattern.test(value)) {
    throw new ContractError("INVALID_BASELINE_SHA256", `${field} must be a lowercase SHA-256 digest`);
  }
}

function assertNullableSha256(value: unknown, field: string): asserts value is string | null {
  if (value !== null) assertSha256(value, field);
}

function assertStringArray(value: unknown, field: string): asserts value is string[] {
  if (!Array.isArray(value)) throw new ContractError("INVALID_BASELINE_ARRAY", `${field} must be an array`);
  for (const [index, item] of value.entries()) assertNonEmptyString(item, `${field}[${index}]`, 500);
}

function assertEvidence(value: unknown, field: string): asserts value is BaselineEvidenceReference {
  assertRecord(value, field);
  assertNonEmptyString(value.path_or_id, `${field}.path_or_id`, 500);
  assertNullableSha256(value.content_sha256, `${field}.content_sha256`);
  if (!["SOURCE", "TEST", "DEPLOYMENT", "DATABASE", "PRODUCTION_READBACK", "AUDIT"].includes(String(value.evidence_type))) {
    throw new ContractError("INVALID_BASELINE_EVIDENCE_TYPE", `${field}.evidence_type is unsupported`);
  }
}

function assertRequirement(value: unknown, index: number): asserts value is BaselineRequirementRecord {
  const field = `baseline.requirements[${index}]`;
  assertRecord(value, field);
  assertNonEmptyString(value.requirement_id, `${field}.requirement_id`, 160);
  if (!Number.isSafeInteger(value.phase) || !baselinePhaseSet.has(Number(value.phase))) {
    throw new ContractError("INVALID_BASELINE_PHASE", `${field}.phase is outside Phase 100-195 baseline scope`);
  }
  if (!requirementStateSet.has(String(value.state))) {
    throw new ContractError("INVALID_BASELINE_REQUIREMENT_STATE", `${field}.state is unsupported`);
  }
  assertNonEmptyString(value.summary, `${field}.summary`, 2_000);
  if (!Array.isArray(value.evidence) || value.evidence.length === 0) {
    throw new ContractError("MISSING_BASELINE_EVIDENCE", `${field}.evidence must contain at least one reference`);
  }
  value.evidence.forEach((item, evidenceIndex) => assertEvidence(item, `${field}.evidence[${evidenceIndex}]`));
  if (value.limitation !== null) assertNonEmptyString(value.limitation, `${field}.limitation`, 2_000);
}

function assertDeployment(value: unknown, index: number): asserts value is BaselineDeploymentRecord {
  const field = `baseline.deployments[${index}]`;
  assertRecord(value, field);
  if (!["FRONTEND", "API", "WORKER"].includes(String(value.role))) throw new ContractError("INVALID_BASELINE_DEPLOYMENT_ROLE", `${field}.role is unsupported`);
  if (!["VERCEL", "RAILWAY"].includes(String(value.provider))) throw new ContractError("INVALID_BASELINE_PROVIDER", `${field}.provider is unsupported`);
  assertNonEmptyString(value.deployment_id, `${field}.deployment_id`, 200);
  assertGitSha(value.deployed_commit_sha, `${field}.deployed_commit_sha`);
  assertNonEmptyString(value.production_url, `${field}.production_url`, 500);
  try {
    const url = new URL(value.production_url);
    if (url.protocol !== "https:") throw new Error("not https");
  } catch {
    throw new ContractError("INVALID_BASELINE_URL", `${field}.production_url must be an HTTPS URL`);
  }
  if (value.status !== "READY") throw new ContractError("INVALID_BASELINE_DEPLOYMENT_STATUS", `${field}.status must be READY`);
}

function assertMigration(value: unknown, index: number): asserts value is BaselineMigrationRecord {
  const field = `baseline.migrations[${index}]`;
  assertRecord(value, field);
  assertNonEmptyString(value.name, `${field}.name`, 300);
  if (!["APPLIED", "NO_SCHEMA_CHANGE"].includes(String(value.status))) throw new ContractError("INVALID_BASELINE_MIGRATION_STATUS", `${field}.status is unsupported`);
  assertNullableSha256(value.checksum_sha256, `${field}.checksum_sha256`);
  assertSha256(value.production_readback_sha256, `${field}.production_readback_sha256`);
}

function assertLegacyIsolation(value: unknown, index: number): asserts value is LegacyIsolationRecord {
  const field = `baseline.legacy_isolation[${index}]`;
  assertRecord(value, field);
  assertNonEmptyString(value.surface, `${field}.surface`, 300);
  if (!["DEVELOPMENT_ONLY", "CATALOG_ONLY", "PRESENTATION_ONLY", "SUPERSEDED", "MIGRATION_BOUNDARY"].includes(String(value.disposition))) {
    throw new ContractError("INVALID_LEGACY_DISPOSITION", `${field}.disposition is unsupported`);
  }
  if (typeof value.production_reachable !== "boolean" || typeof value.canonical_authority !== "boolean") {
    throw new ContractError("INVALID_LEGACY_BOOLEAN", `${field} reachability and authority must be boolean`);
  }
  if (value.canonical_authority) throw new ContractError("LEGACY_CANONICAL_AUTHORITY", `${field} cannot be a canonical authority`);
  assertStringArray(value.evidence, `${field}.evidence`);
  if (value.evidence.length === 0) throw new ContractError("MISSING_LEGACY_EVIDENCE", `${field}.evidence must not be empty`);
}

function assertTest(value: unknown, index: number): asserts value is BaselineTestRecord {
  const field = `baseline.tests[${index}]`;
  assertRecord(value, field);
  assertNonEmptyString(value.command, `${field}.command`, 1_000);
  if (!["PASSED", "PENDING_REVIEW", "NOT_APPLICABLE"].includes(String(value.status))) throw new ContractError("INVALID_BASELINE_TEST_STATUS", `${field}.status is unsupported`);
  assertNullableSha256(value.receipt_sha256, `${field}.receipt_sha256`);
}

export function assertBaselineCertificationManifest(value: unknown): asserts value is BaselineCertificationManifest {
  assertRecord(value, "baseline");
  if (value.contract_version !== BASELINE_CERTIFICATION_CONTRACT_VERSION || value.schema_version !== BASELINE_CERTIFICATION_SCHEMA_VERSION) {
    throw new ContractError("BASELINE_CONTRACT_VERSION", "BaselineCertificationManifest must use contract 1.0.0 and schema 1");
  }
  assertUuid(value.manifest_id, "baseline.manifest_id");
  if (value.phase !== 199) throw new ContractError("BASELINE_PHASE", "BaselineCertificationManifest phase must be 199");
  if (!["CANDIDATE_REVIEW", "CERTIFIED", "BLOCKED"].includes(String(value.status))) throw new ContractError("BASELINE_STATUS", "BaselineCertificationManifest status is unsupported");
  if (!Array.isArray(value.covered_phases) || value.covered_phases.join(",") !== PHASE_199_BASELINE_PHASES.join(",")) {
    throw new ContractError("BASELINE_PHASE_COVERAGE", "BaselineCertificationManifest must cover exact ordered phases 100 through 195");
  }

  const repositories = value.repositories;
  assertRecord(repositories, "baseline.repositories");
  let productMainSha = "";
  for (const role of ["product", "control_website"] as const) {
    const repository = repositories[role];
    assertRecord(repository, `baseline.repositories.${role}`);
    assertNonEmptyString(repository.repository, `baseline.repositories.${role}.repository`, 300);
    assertGitSha(repository.main_sha, `baseline.repositories.${role}.main_sha`);
    if (role === "product") productMainSha = repository.main_sha;
  }

  if (!Array.isArray(value.deployments) || value.deployments.length !== 3) throw new ContractError("BASELINE_DEPLOYMENTS", "BaselineCertificationManifest requires exactly frontend, API, and worker deployments");
  value.deployments.forEach(assertDeployment);
  if (new Set(value.deployments.map((item) => item.role)).size !== 3) throw new ContractError("BASELINE_DEPLOYMENT_ROLES", "Deployment roles must be unique");
  if (!value.deployments.every((item) => item.deployed_commit_sha === productMainSha)) {
    throw new ContractError("BASELINE_DEPLOYMENT_SHA_MISMATCH", "All deployments must bind the exact product main SHA");
  }

  if (!Array.isArray(value.migrations) || value.migrations.length === 0) throw new ContractError("BASELINE_MIGRATIONS", "At least one migration readback is required");
  value.migrations.forEach(assertMigration);
  assertRecord(value.runtime_versions, "baseline.runtime_versions");
  for (const runtime of ["node", "pnpm", "postgres", "redis"] as const) assertNonEmptyString(value.runtime_versions[runtime], `baseline.runtime_versions.${runtime}`, 100);

  if (!Array.isArray(value.requirements) || value.requirements.length === 0) throw new ContractError("BASELINE_REQUIREMENTS", "Requirement matrix must not be empty");
  value.requirements.forEach(assertRequirement);
  if (new Set(value.requirements.map((item) => item.requirement_id)).size !== value.requirements.length) throw new ContractError("DUPLICATE_BASELINE_REQUIREMENT", "Requirement IDs must be unique");
  for (const phase of PHASE_199_BASELINE_PHASES) {
    if (!value.requirements.some((item) => item.phase === phase)) throw new ContractError("MISSING_BASELINE_PHASE_REQUIREMENT", `Requirement matrix has no Phase ${phase} row`);
  }
  for (let feature = 1; feature <= 60; feature += 1) {
    const requirementId = `P195-F${String(feature).padStart(3, "0")}`;
    if (!value.requirements.some((item) => item.requirement_id === requirementId)) throw new ContractError("MISSING_PHASE_195_REQUIREMENT", `Requirement matrix is missing ${requirementId}`);
  }

  if (!Array.isArray(value.legacy_isolation) || value.legacy_isolation.length === 0) throw new ContractError("BASELINE_LEGACY_ISOLATION", "Legacy isolation ledger must not be empty");
  value.legacy_isolation.forEach(assertLegacyIsolation);
  if (!Array.isArray(value.tests) || value.tests.length === 0) throw new ContractError("BASELINE_TESTS", "Test ledger must not be empty");
  value.tests.forEach(assertTest);

  assertRecord(value.production_truth, "baseline.production_truth");
  if (value.production_truth.release_phase !== 198) throw new ContractError("BASELINE_PRODUCTION_PHASE", "Phase 199 candidate must bind the certified Phase 198 production baseline");
  assertUuid(value.production_truth.canonical_release_id, "baseline.production_truth.canonical_release_id");
  assertUuid(value.production_truth.phase_gate_id, "baseline.production_truth.phase_gate_id");
  assertSha256(value.production_truth.authenticated_smoke_sha256, "baseline.production_truth.authenticated_smoke_sha256");
  assertSha256(value.production_truth.state_readback_sha256, "baseline.production_truth.state_readback_sha256");

  assertRecord(value.secure_json_reconciliation, "baseline.secure_json_reconciliation");
  if (!["PENDING_DEPLOYMENT", "VERIFIED", "BLOCKED"].includes(String(value.secure_json_reconciliation.status))) throw new ContractError("BASELINE_SECURE_JSON_STATUS", "Secure JSON reconciliation status is unsupported");
  for (const field of ["plaintext_rows_found", "plaintext_rows_reencrypted"] as const) {
    const count = value.secure_json_reconciliation[field];
    if (count !== null) assertSafeNonNegativeInteger(count, `baseline.secure_json_reconciliation.${field}`);
  }
  assertNullableSha256(value.secure_json_reconciliation.receipt_sha256, "baseline.secure_json_reconciliation.receipt_sha256");
  assertStringArray(value.known_limitations, "baseline.known_limitations");

  assertRecord(value.rollback_point, "baseline.rollback_point");
  if (value.rollback_point.release_phase !== 197) throw new ContractError("BASELINE_ROLLBACK_PHASE", "Rollback point must bind Phase 197");
  assertGitSha(value.rollback_point.main_sha, "baseline.rollback_point.main_sha");
  assertNonEmptyString(value.rollback_point.reference, "baseline.rollback_point.reference", 500);

  assertRecord(value.certification, "baseline.certification");
  if (typeof value.certification.all_mandatory_gates_passed !== "boolean" || typeof value.certification.phase_200_blocked !== "boolean") {
    throw new ContractError("BASELINE_CERTIFICATION_FLAGS", "Certification flags must be boolean");
  }
  if (value.certification.review_checkpoint_id !== "P199-BASELINE-RECERTIFICATION-REVIEW") throw new ContractError("BASELINE_REVIEW_CHECKPOINT", "Review checkpoint ID is invalid");
  if (value.certification.review_verdict_commit_sha !== null) assertGitSha(value.certification.review_verdict_commit_sha, "baseline.certification.review_verdict_commit_sha");
  assertIsoDate(value.generated_at, "baseline.generated_at");

  const blockingStates = new Set<BaselineRequirementState>(["FAILING", "MISSING", "CONTRADICTORY", "BLOCKED", "PRODUCTION_UNVERIFIED"]);
  if (value.status === "CERTIFIED") {
    if (!value.certification.all_mandatory_gates_passed || value.certification.phase_200_blocked || !value.certification.review_verdict_commit_sha) {
      throw new ContractError("BASELINE_CERTIFICATION_INCOMPLETE", "Certified baseline requires passed gates, released Phase 200 block, and a commit-bound review verdict");
    }
    if (value.secure_json_reconciliation.status !== "VERIFIED" || value.secure_json_reconciliation.receipt_sha256 === null) {
      throw new ContractError("BASELINE_SECURE_JSON_UNVERIFIED", "Certified baseline requires verified secure JSON reconciliation");
    }
    if (value.requirements.some((item) => blockingStates.has(item.state))) throw new ContractError("BASELINE_BLOCKING_REQUIREMENT", "Certified baseline contains a blocking requirement state");
    if (value.tests.some((item) => item.status === "PENDING_REVIEW")) throw new ContractError("BASELINE_PENDING_TEST", "Certified baseline contains pending test evidence");
  } else if (!value.certification.phase_200_blocked) {
    throw new ContractError("BASELINE_PHASE_200_FAIL_OPEN", "A non-certified baseline must keep Phase 200 blocked");
  }
}

export function parseBaselineCertificationManifest(value: unknown): BaselineCertificationManifest {
  assertBaselineCertificationManifest(value);
  return value;
}
