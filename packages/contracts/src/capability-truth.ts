import {
  ContractError,
  assertIsoDate,
  assertNonEmptyString,
  assertRecord,
  assertSafeNonNegativeInteger,
  assertUuid
} from "./validation.js";

export const CAPABILITY_LIFECYCLE_STATES = [
  "CATALOGUED",
  "DESIGNED",
  "IMPLEMENTED",
  "UNIT_VERIFIED",
  "INTEGRATION_VERIFIED",
  "CANARY_VERIFIED",
  "ACTIVE",
  "SELLABLE",
  "DEPRECATED",
  "RETIRED"
] as const;
export type CapabilityLifecycleState = (typeof CAPABILITY_LIFECYCLE_STATES)[number];

export const CAPABILITY_KINDS = [
  "CAPABILITY",
  "INTEGRATION",
  "AGENT",
  "WORKFLOW",
  "COMMANDER_PACK"
] as const;
export type CapabilityKind = (typeof CAPABILITY_KINDS)[number];

export const CAPABILITY_ENVIRONMENTS = [
  "DEVELOPMENT",
  "TEST",
  "STAGING",
  "CANARY",
  "PRODUCTION"
] as const;
export type CapabilityEnvironment = (typeof CAPABILITY_ENVIRONMENTS)[number];

export const CAPABILITY_SCOPES = ["GLOBAL", "TENANT"] as const;
export type CapabilityScope = (typeof CAPABILITY_SCOPES)[number];

export const CAPABILITY_PRODUCTION_READINESS = [
  "REAL",
  "UNVERIFIED",
  "SIMULATED",
  "PLACEHOLDER",
  "LOCAL_ONLY",
  "DISABLED"
] as const;
export type CapabilityProductionReadiness = (typeof CAPABILITY_PRODUCTION_READINESS)[number];

export const CAPABILITY_AUDIENCE_STATUSES = [
  "CURRENT",
  "LIMITED_BETA",
  "DESIGN_PARTNER",
  "ROADMAP",
  "UNSUPPORTED"
] as const;
export type CapabilityAudienceStatus = (typeof CAPABILITY_AUDIENCE_STATUSES)[number];

export const CAPABILITY_EVIDENCE_TYPES = [
  "UNIT_TEST",
  "INTEGRATION_TEST",
  "CANARY",
  "PRODUCTION_READBACK",
  "AUTHENTICATION",
  "AUTHORIZATION_SCOPE",
  "OPERATION",
  "READBACK",
  "RECONCILIATION",
  "REFRESH_OR_WEBHOOK",
  "FAILURE_HANDLING",
  "SUPPORT_READINESS",
  "PRICING_APPROVAL",
  "TUTORIAL",
  "DOCUMENTATION",
  "ROLLBACK"
] as const;
export type CapabilityEvidenceType = (typeof CAPABILITY_EVIDENCE_TYPES)[number];

export const PRODUCT_CLAIM_SURFACES = [
  "WEBSITE",
  "TUTORIAL",
  "PRICING",
  "CHECKOUT",
  "PROPOSAL",
  "ONBOARDING",
  "INTEGRATION_LIST",
  "MEMBER_APPLICATION",
  "SALES"
] as const;
export type ProductClaimSurface = (typeof PRODUCT_CLAIM_SURFACES)[number];

export const PRODUCT_CLAIM_STATUSES = ["DRAFT", "APPROVED", "BLOCKED", "RETIRED"] as const;
export type ProductClaimStatus = (typeof PRODUCT_CLAIM_STATUSES)[number];

export const INSTALLED_CAPABILITY_STATES = [
  "AVAILABLE",
  "ACTIVATING",
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATED"
] as const;
export type InstalledCapabilityState = (typeof INSTALLED_CAPABILITY_STATES)[number];

export const PUBLICATION_DECISION_REASONS = [
  "SELLABLE_VERIFIED",
  "MALFORMED_TRUTH",
  "ENVIRONMENT_MISMATCH",
  "CAPABILITY_VERSION_MISMATCH",
  "CAPABILITY_NOT_SELLABLE",
  "CAPABILITY_NOT_REAL",
  "PUBLIC_CLAIM_INELIGIBLE",
  "CAPABILITY_FAILURE",
  "CLAIM_NOT_APPROVED",
  "CLAIM_EVIDENCE_MISMATCH",
  "INSTALLATION_REQUIRED",
  "INSTALLATION_NOT_ACTIVE",
  "PLAN_INELIGIBLE",
  "INSTALLATION_SUSPENDED"
] as const;
export type PublicationDecisionReason = (typeof PUBLICATION_DECISION_REASONS)[number];

export interface CapabilityEvidenceReceipt {
  readonly receipt_id: string;
  readonly evidence_type: CapabilityEvidenceType;
  readonly environment: CapabilityEnvironment;
  readonly status: "PASSED" | "FAILED";
  readonly reference: string;
  readonly content_sha256: string;
  readonly captured_at: string;
  readonly expires_at: string | null;
}

export interface CapabilityDependency {
  readonly capability_id: string;
  readonly capability_version: string;
  readonly minimum_lifecycle_state: CapabilityLifecycleState;
  readonly required: boolean;
}

export interface CapabilityActivationRequirement {
  readonly requirement_code: string;
  readonly description: string;
  readonly required: boolean;
  readonly satisfied: boolean;
  readonly evidence_receipt_ids: readonly string[];
}

export interface CapabilityFailureState {
  readonly code: string;
  readonly summary: string;
  readonly observed_at: string;
  readonly retryable: boolean;
}

export interface CapabilityTruthRecord {
  readonly capability_id: string;
  readonly capability_key: string;
  readonly capability_version: string;
  readonly display_name: string;
  readonly purpose: string;
  readonly kind: CapabilityKind;
  readonly owner: string;
  readonly environment: CapabilityEnvironment;
  readonly scope: CapabilityScope;
  readonly tenant_id: string | null;
  readonly organization_id: string | null;
  readonly lifecycle_state: CapabilityLifecycleState;
  readonly audience_status: CapabilityAudienceStatus;
  readonly production_readiness: CapabilityProductionReadiness;
  readonly dependencies: readonly CapabilityDependency[];
  readonly activation_requirements: readonly CapabilityActivationRequirement[];
  readonly verification_receipts: readonly CapabilityEvidenceReceipt[];
  readonly last_verified_at: string | null;
  readonly failure_state: CapabilityFailureState | null;
  readonly public_claim_eligible: boolean;
  readonly rollback_path: string;
  readonly deactivation_path: string;
  readonly source_reference: string;
  readonly limitations: readonly string[];
  readonly record_version: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ProductClaimRecord {
  readonly claim_id: string;
  readonly claim_key: string;
  readonly capability_id: string;
  readonly capability_version: string;
  readonly environment: CapabilityEnvironment;
  readonly surface: ProductClaimSurface;
  readonly status: ProductClaimStatus;
  readonly approved_language: string;
  readonly limitations: readonly string[];
  readonly evidence_receipt_ids: readonly string[];
  readonly requires_tenant_installation: boolean;
  readonly approved_by_actor_id: string | null;
  readonly approved_at: string | null;
  readonly record_version: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface InstalledCapabilityRecord {
  readonly installation_id: string;
  readonly tenant_id: string;
  readonly organization_id: string;
  readonly capability_id: string;
  readonly capability_version: string;
  readonly state: InstalledCapabilityState;
  readonly plan_eligible: boolean;
  readonly suspension_reason: string | null;
  readonly activated_at: string | null;
  readonly verification_receipt_ids: readonly string[];
  readonly record_version: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CapabilityLifecycleTransitionRequest {
  readonly transition_id: string;
  readonly capability_id: string;
  readonly from_state: CapabilityLifecycleState;
  readonly to_state: CapabilityLifecycleState;
  readonly expected_record_version: number;
  readonly evidence_receipt_ids: readonly string[];
  readonly reason: string;
  readonly actor_id: string;
  readonly correlation_id: string;
  readonly idempotency_key: string;
  readonly requested_at: string;
}

export interface PublicationEvaluationInput {
  readonly capability: CapabilityTruthRecord;
  readonly claim: ProductClaimRecord;
  readonly requested_environment: CapabilityEnvironment;
  readonly requested_tenant_id: string | null;
  readonly requested_organization_id: string | null;
  readonly installation: InstalledCapabilityRecord | null;
  readonly evaluated_at: string;
}

export interface PublicationDecision {
  readonly allowed: boolean;
  readonly reason_code: PublicationDecisionReason;
  readonly capability_id: string | null;
  readonly capability_version: string | null;
  readonly claim_id: string | null;
  readonly surface: ProductClaimSurface | null;
  readonly evidence_receipt_ids: readonly string[];
  readonly evaluated_at: string;
}

export interface PublicProductClaim {
  readonly claim_id: string;
  readonly claim_key: string;
  readonly capability_id: string;
  readonly capability_key: string;
  readonly capability_version: string;
  readonly display_name: string;
  readonly lifecycle_state: "SELLABLE";
  readonly approved_language: string;
  readonly limitations: readonly string[];
  readonly evidence_receipt_ids: readonly string[];
  readonly claim_record_version: number;
  readonly capability_record_version: number;
}

export interface PublicProductTruthProjection {
  readonly contract_version: "1.0.0";
  readonly schema_version: 1;
  readonly projection_id: string;
  readonly environment: CapabilityEnvironment;
  readonly surface: ProductClaimSurface;
  readonly registry_revision: number;
  readonly generated_at: string;
  readonly expires_at: string;
  readonly claims: readonly PublicProductClaim[];
}

const CAPABILITY_KEY_RE = /^[a-z0-9][a-z0-9._-]{2,159}$/;
const SEMVER_RE = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const ACTIVE_STATES: readonly CapabilityLifecycleState[] = ["ACTIVE", "SELLABLE"];
const SELLABLE_EVIDENCE: readonly CapabilityEvidenceType[] = [
  "UNIT_TEST",
  "INTEGRATION_TEST",
  "CANARY",
  "PRODUCTION_READBACK",
  "SUPPORT_READINESS",
  "PRICING_APPROVAL",
  "TUTORIAL",
  "DOCUMENTATION",
  "ROLLBACK"
];
const ACTIVE_INTEGRATION_EVIDENCE: readonly CapabilityEvidenceType[] = [
  "AUTHENTICATION",
  "AUTHORIZATION_SCOPE",
  "OPERATION",
  "READBACK",
  "RECONCILIATION",
  "REFRESH_OR_WEBHOOK",
  "FAILURE_HANDLING"
];

function assertEnum<T extends string>(value: unknown, values: readonly T[], field: string): asserts value is T {
  if (typeof value !== "string" || !(values as readonly string[]).includes(value)) {
    throw new ContractError("INVALID_CAPABILITY_ENUM", `${field} is not canonical`);
  }
}

function assertUnique(values: readonly string[], field: string): void {
  if (new Set(values).size !== values.length) {
    throw new ContractError("DUPLICATE_CAPABILITY_VALUE", `${field} must not contain duplicates`);
  }
}

function assertStringArray(value: unknown, field: string, maximum = 2_000): asserts value is readonly string[] {
  if (!Array.isArray(value)) throw new ContractError("INVALID_CAPABILITY_ARRAY", `${field} must be an array`);
  value.forEach((entry, index) => assertNonEmptyString(entry, `${field}[${index}]`, maximum));
}

function assertVersion(value: unknown, field: string): asserts value is string {
  assertNonEmptyString(value, field, 80);
  if (!SEMVER_RE.test(value)) throw new ContractError("INVALID_CAPABILITY_VERSION", `${field} must be semantic version`);
}

function assertRecordVersion(value: unknown, field: string): asserts value is number {
  assertSafeNonNegativeInteger(value, field);
  if (value < 1) throw new ContractError("INVALID_RECORD_VERSION", `${field} must be at least 1`);
}

function assertEvidenceReceipt(receipt: CapabilityEvidenceReceipt, index: number): void {
  const field = `verification_receipts[${index}]`;
  assertRecord(receipt, field);
  assertUuid(receipt.receipt_id, `${field}.receipt_id`);
  assertEnum(receipt.evidence_type, CAPABILITY_EVIDENCE_TYPES, `${field}.evidence_type`);
  assertEnum(receipt.environment, CAPABILITY_ENVIRONMENTS, `${field}.environment`);
  if (receipt.status !== "PASSED" && receipt.status !== "FAILED") {
    throw new ContractError("INVALID_EVIDENCE_STATUS", `${field}.status must be PASSED or FAILED`);
  }
  assertNonEmptyString(receipt.reference, `${field}.reference`, 2_000);
  if (!SHA256_RE.test(receipt.content_sha256)) {
    throw new ContractError("INVALID_EVIDENCE_HASH", `${field}.content_sha256 must be a lowercase SHA-256`);
  }
  assertIsoDate(receipt.captured_at, `${field}.captured_at`);
  if (receipt.expires_at !== null) {
    assertIsoDate(receipt.expires_at, `${field}.expires_at`);
    if (Date.parse(receipt.expires_at) <= Date.parse(receipt.captured_at)) {
      throw new ContractError("INVALID_EVIDENCE_EXPIRY", `${field}.expires_at must follow captured_at`);
    }
  }
}

function assertFailureState(value: CapabilityFailureState | null): void {
  if (value === null) return;
  assertRecord(value, "failure_state");
  assertNonEmptyString(value.code, "failure_state.code", 160);
  assertNonEmptyString(value.summary, "failure_state.summary", 2_000);
  assertIsoDate(value.observed_at, "failure_state.observed_at");
  if (typeof value.retryable !== "boolean") {
    throw new ContractError("INVALID_FAILURE_STATE", "failure_state.retryable must be boolean");
  }
}

function evidenceTypes(record: CapabilityTruthRecord): ReadonlySet<CapabilityEvidenceType> {
  return new Set(
    record.verification_receipts
      .filter((receipt) => receipt.status === "PASSED" && receipt.environment === record.environment)
      .map((receipt) => receipt.evidence_type)
  );
}

function requireEvidence(
  available: ReadonlySet<CapabilityEvidenceType>,
  required: readonly CapabilityEvidenceType[],
  code: string
): void {
  const missing = required.filter((type) => !available.has(type));
  if (missing.length > 0) {
    throw new ContractError(code, `missing required evidence: ${missing.join(", ")}`);
  }
}

export function assertCapabilityTruthRecord(record: CapabilityTruthRecord): void {
  assertRecord(record, "capability_truth");
  assertUuid(record.capability_id, "capability_id");
  assertNonEmptyString(record.capability_key, "capability_key", 160);
  if (!CAPABILITY_KEY_RE.test(record.capability_key)) {
    throw new ContractError("INVALID_CAPABILITY_KEY", "capability_key must use canonical lowercase syntax");
  }
  assertVersion(record.capability_version, "capability_version");
  assertNonEmptyString(record.display_name, "display_name", 200);
  assertNonEmptyString(record.purpose, "purpose", 2_000);
  assertEnum(record.kind, CAPABILITY_KINDS, "kind");
  assertNonEmptyString(record.owner, "owner", 320);
  assertEnum(record.environment, CAPABILITY_ENVIRONMENTS, "environment");
  assertEnum(record.scope, CAPABILITY_SCOPES, "scope");
  assertEnum(record.lifecycle_state, CAPABILITY_LIFECYCLE_STATES, "lifecycle_state");
  assertEnum(record.audience_status, CAPABILITY_AUDIENCE_STATUSES, "audience_status");
  assertEnum(record.production_readiness, CAPABILITY_PRODUCTION_READINESS, "production_readiness");
  if (record.scope === "GLOBAL") {
    if (record.tenant_id !== null || record.organization_id !== null) {
      throw new ContractError("INVALID_GLOBAL_SCOPE", "GLOBAL capabilities cannot carry tenant or organization IDs");
    }
  } else {
    assertUuid(record.tenant_id, "tenant_id");
    assertUuid(record.organization_id, "organization_id");
  }
  if (!Array.isArray(record.dependencies)) {
    throw new ContractError("INVALID_CAPABILITY_DEPENDENCIES", "dependencies must be an array");
  }
  record.dependencies.forEach((dependency, index) => {
    assertRecord(dependency, `dependencies[${index}]`);
    assertUuid(dependency.capability_id, `dependencies[${index}].capability_id`);
    assertVersion(dependency.capability_version, `dependencies[${index}].capability_version`);
    assertEnum(
      dependency.minimum_lifecycle_state,
      CAPABILITY_LIFECYCLE_STATES,
      `dependencies[${index}].minimum_lifecycle_state`
    );
    if (typeof dependency.required !== "boolean") {
      throw new ContractError("INVALID_CAPABILITY_DEPENDENCY", `dependencies[${index}].required must be boolean`);
    }
  });
  assertUnique(
    record.dependencies.map((dependency) => `${dependency.capability_id}@${dependency.capability_version}`),
    "dependencies"
  );
  if (!Array.isArray(record.activation_requirements)) {
    throw new ContractError("INVALID_ACTIVATION_REQUIREMENTS", "activation_requirements must be an array");
  }
  record.activation_requirements.forEach((requirement, index) => {
    const field = `activation_requirements[${index}]`;
    assertRecord(requirement, field);
    assertNonEmptyString(requirement.requirement_code, `${field}.requirement_code`, 160);
    assertNonEmptyString(requirement.description, `${field}.description`, 2_000);
    if (typeof requirement.required !== "boolean" || typeof requirement.satisfied !== "boolean") {
      throw new ContractError("INVALID_ACTIVATION_REQUIREMENT", `${field} flags must be boolean`);
    }
    assertStringArray(requirement.evidence_receipt_ids, `${field}.evidence_receipt_ids`, 36);
    requirement.evidence_receipt_ids.forEach((id, receiptIndex) => {
      assertUuid(id, `${field}.evidence_receipt_ids[${receiptIndex}]`);
    });
    assertUnique(requirement.evidence_receipt_ids, `${field}.evidence_receipt_ids`);
  });
  assertUnique(record.activation_requirements.map((requirement) => requirement.requirement_code), "activation_requirements");
  if (!Array.isArray(record.verification_receipts)) {
    throw new ContractError("INVALID_VERIFICATION_RECEIPTS", "verification_receipts must be an array");
  }
  record.verification_receipts.forEach(assertEvidenceReceipt);
  assertUnique(record.verification_receipts.map((receipt) => receipt.receipt_id), "verification_receipts");
  const receiptIds = new Set(record.verification_receipts.map((receipt) => receipt.receipt_id));
  record.activation_requirements.forEach((requirement) => {
    requirement.evidence_receipt_ids.forEach((id: string) => {
      if (!receiptIds.has(id)) {
        throw new ContractError("ACTIVATION_EVIDENCE_MISMATCH", `${id} is not a capability verification receipt`);
      }
    });
  });
  if (record.last_verified_at !== null) assertIsoDate(record.last_verified_at, "last_verified_at");
  assertFailureState(record.failure_state);
  if (typeof record.public_claim_eligible !== "boolean") {
    throw new ContractError("INVALID_PUBLIC_CLAIM_ELIGIBILITY", "public_claim_eligible must be boolean");
  }
  assertNonEmptyString(record.rollback_path, "rollback_path", 2_000);
  assertNonEmptyString(record.deactivation_path, "deactivation_path", 2_000);
  assertNonEmptyString(record.source_reference, "source_reference", 2_000);
  assertStringArray(record.limitations, "limitations");
  assertUnique(record.limitations, "limitations");
  assertRecordVersion(record.record_version, "record_version");
  assertIsoDate(record.created_at, "created_at");
  assertIsoDate(record.updated_at, "updated_at");
  if (Date.parse(record.updated_at) < Date.parse(record.created_at)) {
    throw new ContractError("INVALID_CAPABILITY_TIMELINE", "updated_at cannot precede created_at");
  }

  const isActive = ACTIVE_STATES.includes(record.lifecycle_state);
  if (isActive) {
    if (record.production_readiness !== "REAL") {
      throw new ContractError("NON_REAL_CAPABILITY_ACTIVE", "only REAL capabilities can be ACTIVE or SELLABLE");
    }
    if (record.failure_state !== null) {
      throw new ContractError("FAILED_CAPABILITY_ACTIVE", "a capability with a failure state cannot be ACTIVE or SELLABLE");
    }
    if (record.last_verified_at === null) {
      throw new ContractError("ACTIVE_CAPABILITY_UNVERIFIED", "ACTIVE and SELLABLE capabilities require last_verified_at");
    }
    const unsatisfied = record.activation_requirements.filter((requirement) => requirement.required && !requirement.satisfied);
    if (unsatisfied.length > 0) {
      throw new ContractError("ACTIVE_CAPABILITY_REQUIREMENTS", "required activation requirements must be satisfied");
    }
  }
  if (record.kind === "INTEGRATION" && isActive) {
    requireEvidence(evidenceTypes(record), ACTIVE_INTEGRATION_EVIDENCE, "ACTIVE_INTEGRATION_EVIDENCE");
  }
  if (record.lifecycle_state === "SELLABLE") {
    if (!record.public_claim_eligible || record.audience_status !== "CURRENT" || record.environment !== "PRODUCTION") {
      throw new ContractError(
        "SELLABLE_CAPABILITY_INELIGIBLE",
        "SELLABLE requires PRODUCTION, CURRENT audience, and public claim eligibility"
      );
    }
    requireEvidence(evidenceTypes(record), SELLABLE_EVIDENCE, "SELLABLE_CAPABILITY_EVIDENCE");
  } else if (record.public_claim_eligible) {
    throw new ContractError("PREMATURE_PUBLIC_CLAIM", "only SELLABLE capabilities can be public-claim eligible");
  }
}

export function assertProductClaimRecord(claim: ProductClaimRecord): void {
  assertRecord(claim, "product_claim");
  assertUuid(claim.claim_id, "claim_id");
  assertNonEmptyString(claim.claim_key, "claim_key", 160);
  if (!CAPABILITY_KEY_RE.test(claim.claim_key)) {
    throw new ContractError("INVALID_CLAIM_KEY", "claim_key must use canonical lowercase syntax");
  }
  assertUuid(claim.capability_id, "capability_id");
  assertVersion(claim.capability_version, "capability_version");
  assertEnum(claim.environment, CAPABILITY_ENVIRONMENTS, "environment");
  assertEnum(claim.surface, PRODUCT_CLAIM_SURFACES, "surface");
  assertEnum(claim.status, PRODUCT_CLAIM_STATUSES, "status");
  assertNonEmptyString(claim.approved_language, "approved_language", 4_000);
  assertStringArray(claim.limitations, "limitations");
  assertUnique(claim.limitations, "limitations");
  assertStringArray(claim.evidence_receipt_ids, "evidence_receipt_ids", 36);
  claim.evidence_receipt_ids.forEach((id, index) => assertUuid(id, `evidence_receipt_ids[${index}]`));
  assertUnique(claim.evidence_receipt_ids, "evidence_receipt_ids");
  if (typeof claim.requires_tenant_installation !== "boolean") {
    throw new ContractError("INVALID_INSTALLATION_REQUIREMENT", "requires_tenant_installation must be boolean");
  }
  if (claim.status === "APPROVED") {
    assertUuid(claim.approved_by_actor_id, "approved_by_actor_id");
    assertIsoDate(claim.approved_at, "approved_at");
    if (claim.evidence_receipt_ids.length === 0) {
      throw new ContractError("CLAIM_EVIDENCE_REQUIRED", "APPROVED claims require evidence receipts");
    }
  } else if (claim.approved_by_actor_id !== null || claim.approved_at !== null) {
    throw new ContractError("UNAPPROVED_CLAIM_APPROVAL", "only APPROVED claims can carry approval authority");
  }
  assertRecordVersion(claim.record_version, "record_version");
  assertIsoDate(claim.created_at, "created_at");
  assertIsoDate(claim.updated_at, "updated_at");
}

export function assertInstalledCapabilityRecord(installation: InstalledCapabilityRecord): void {
  assertRecord(installation, "installed_capability");
  assertUuid(installation.installation_id, "installation_id");
  assertUuid(installation.tenant_id, "tenant_id");
  assertUuid(installation.organization_id, "organization_id");
  assertUuid(installation.capability_id, "capability_id");
  assertVersion(installation.capability_version, "capability_version");
  assertEnum(installation.state, INSTALLED_CAPABILITY_STATES, "state");
  if (typeof installation.plan_eligible !== "boolean") {
    throw new ContractError("INVALID_PLAN_ELIGIBILITY", "plan_eligible must be boolean");
  }
  if (installation.suspension_reason !== null) {
    assertNonEmptyString(installation.suspension_reason, "suspension_reason", 2_000);
  }
  if (installation.state === "SUSPENDED" && installation.suspension_reason === null) {
    throw new ContractError("MISSING_SUSPENSION_REASON", "SUSPENDED installations require a reason");
  }
  if (installation.state !== "SUSPENDED" && installation.suspension_reason !== null) {
    throw new ContractError("UNEXPECTED_SUSPENSION_REASON", "only SUSPENDED installations can carry a reason");
  }
  if (installation.activated_at !== null) assertIsoDate(installation.activated_at, "activated_at");
  if (installation.state === "ACTIVE" && installation.activated_at === null) {
    throw new ContractError("MISSING_ACTIVATION_TIME", "ACTIVE installations require activated_at");
  }
  assertStringArray(installation.verification_receipt_ids, "verification_receipt_ids", 36);
  installation.verification_receipt_ids.forEach((id, index) => {
    assertUuid(id, `verification_receipt_ids[${index}]`);
  });
  assertUnique(installation.verification_receipt_ids, "verification_receipt_ids");
  assertRecordVersion(installation.record_version, "record_version");
  assertIsoDate(installation.created_at, "created_at");
  assertIsoDate(installation.updated_at, "updated_at");
}

export function assertCapabilityLifecycleTransitionRequest(request: CapabilityLifecycleTransitionRequest): void {
  assertRecord(request, "capability_lifecycle_transition");
  assertUuid(request.transition_id, "transition_id");
  assertUuid(request.capability_id, "capability_id");
  assertEnum(request.from_state, CAPABILITY_LIFECYCLE_STATES, "from_state");
  assertEnum(request.to_state, CAPABILITY_LIFECYCLE_STATES, "to_state");
  assertRecordVersion(request.expected_record_version, "expected_record_version");
  assertStringArray(request.evidence_receipt_ids, "evidence_receipt_ids", 36);
  request.evidence_receipt_ids.forEach((id, index) => assertUuid(id, `evidence_receipt_ids[${index}]`));
  assertUnique(request.evidence_receipt_ids, "evidence_receipt_ids");
  assertNonEmptyString(request.reason, "reason", 2_000);
  assertUuid(request.actor_id, "actor_id");
  assertUuid(request.correlation_id, "correlation_id");
  assertNonEmptyString(request.idempotency_key, "idempotency_key", 255);
  if (request.idempotency_key.length < 12) {
    throw new ContractError("INVALID_IDEMPOTENCY_KEY", "idempotency_key must be at least 12 characters");
  }
  assertIsoDate(request.requested_at, "requested_at");
  if (request.from_state === request.to_state) {
    throw new ContractError("NO_OP_CAPABILITY_TRANSITION", "a lifecycle transition must change state");
  }
  const fromIndex = CAPABILITY_LIFECYCLE_STATES.indexOf(request.from_state);
  const toIndex = CAPABILITY_LIFECYCLE_STATES.indexOf(request.to_state);
  const adjacentForward = toIndex === fromIndex + 1;
  const deprecating = request.to_state === "DEPRECATED" && request.from_state !== "RETIRED";
  const retiring = request.to_state === "RETIRED" && request.from_state === "DEPRECATED";
  if (!adjacentForward && !deprecating && !retiring) {
    throw new ContractError("INVALID_CAPABILITY_TRANSITION", `${request.from_state} cannot transition to ${request.to_state}`);
  }
}

export function assertPublicProductTruthProjection(value: unknown): asserts value is PublicProductTruthProjection {
  assertRecord(value, "public_product_truth_projection");
  const projection = value as unknown as PublicProductTruthProjection;
  if (projection.contract_version !== "1.0.0" || projection.schema_version !== 1) {
    throw new ContractError("UNSUPPORTED_PRODUCT_TRUTH_CONTRACT", "Product Truth contract must be 1.0.0 schema 1");
  }
  assertUuid(projection.projection_id, "projection_id");
  assertEnum(projection.environment, CAPABILITY_ENVIRONMENTS, "environment");
  assertEnum(projection.surface, PRODUCT_CLAIM_SURFACES, "surface");
  assertRecordVersion(projection.registry_revision, "registry_revision");
  assertIsoDate(projection.generated_at, "generated_at");
  assertIsoDate(projection.expires_at, "expires_at");
  if (Date.parse(projection.expires_at) <= Date.parse(projection.generated_at)) {
    throw new ContractError("INVALID_PRODUCT_TRUTH_EXPIRY", "expires_at must follow generated_at");
  }
  if (!Array.isArray(projection.claims)) {
    throw new ContractError("INVALID_PRODUCT_TRUTH_CLAIMS", "claims must be an array");
  }
  projection.claims.forEach((claim, index) => {
    const field = `claims[${index}]`;
    assertRecord(claim, field);
    assertUuid(claim.claim_id, `${field}.claim_id`);
    assertNonEmptyString(claim.claim_key, `${field}.claim_key`, 160);
    assertUuid(claim.capability_id, `${field}.capability_id`);
    assertNonEmptyString(claim.capability_key, `${field}.capability_key`, 160);
    assertVersion(claim.capability_version, `${field}.capability_version`);
    assertNonEmptyString(claim.display_name, `${field}.display_name`, 200);
    if (claim.lifecycle_state !== "SELLABLE") {
      throw new ContractError("NON_SELLABLE_PUBLIC_CLAIM", `${field}.lifecycle_state must be SELLABLE`);
    }
    assertNonEmptyString(claim.approved_language, `${field}.approved_language`, 4_000);
    assertStringArray(claim.limitations, `${field}.limitations`);
    assertUnique(claim.limitations, `${field}.limitations`);
    assertStringArray(claim.evidence_receipt_ids, `${field}.evidence_receipt_ids`, 36);
    if (claim.evidence_receipt_ids.length === 0) {
      throw new ContractError("PUBLIC_CLAIM_EVIDENCE_REQUIRED", `${field} requires evidence receipts`);
    }
    claim.evidence_receipt_ids.forEach((id: string, receiptIndex: number) => {
      assertUuid(id, `${field}.evidence_receipt_ids[${receiptIndex}]`);
    });
    assertUnique(claim.evidence_receipt_ids, `${field}.evidence_receipt_ids`);
    assertRecordVersion(claim.claim_record_version, `${field}.claim_record_version`);
    assertRecordVersion(claim.capability_record_version, `${field}.capability_record_version`);
  });
  assertUnique(projection.claims.map((claim) => claim.claim_id), "claims");
}

function decision(
  input: PublicationEvaluationInput,
  allowed: boolean,
  reasonCode: PublicationDecisionReason
): PublicationDecision {
  return {
    allowed,
    reason_code: reasonCode,
    capability_id: input.capability?.capability_id ?? null,
    capability_version: input.capability?.capability_version ?? null,
    claim_id: input.claim?.claim_id ?? null,
    surface: input.claim?.surface ?? null,
    evidence_receipt_ids: allowed ? input.claim.evidence_receipt_ids : [],
    evaluated_at: input.evaluated_at
  };
}

export function evaluateProductClaimPublication(input: PublicationEvaluationInput): PublicationDecision {
  try {
    assertRecord(input, "publication_evaluation");
    assertIsoDate(input.evaluated_at, "evaluated_at");
    assertEnum(input.requested_environment, CAPABILITY_ENVIRONMENTS, "requested_environment");
    if (input.requested_tenant_id !== null) assertUuid(input.requested_tenant_id, "requested_tenant_id");
    if (input.requested_organization_id !== null) assertUuid(input.requested_organization_id, "requested_organization_id");
    assertCapabilityTruthRecord(input.capability);
    assertProductClaimRecord(input.claim);
  } catch {
    return decision(input, false, "MALFORMED_TRUTH");
  }
  const { capability, claim, installation } = input;
  if (capability.environment !== input.requested_environment || claim.environment !== input.requested_environment) {
    return decision(input, false, "ENVIRONMENT_MISMATCH");
  }
  if (claim.capability_id !== capability.capability_id || claim.capability_version !== capability.capability_version) {
    return decision(input, false, "CAPABILITY_VERSION_MISMATCH");
  }
  if (capability.lifecycle_state !== "SELLABLE") return decision(input, false, "CAPABILITY_NOT_SELLABLE");
  if (capability.production_readiness !== "REAL") return decision(input, false, "CAPABILITY_NOT_REAL");
  if (!capability.public_claim_eligible) return decision(input, false, "PUBLIC_CLAIM_INELIGIBLE");
  if (capability.failure_state !== null) return decision(input, false, "CAPABILITY_FAILURE");
  if (claim.status !== "APPROVED") return decision(input, false, "CLAIM_NOT_APPROVED");
  const receiptIds = new Set(capability.verification_receipts.map((receipt) => receipt.receipt_id));
  if (!claim.evidence_receipt_ids.every((id) => receiptIds.has(id))) {
    return decision(input, false, "CLAIM_EVIDENCE_MISMATCH");
  }
  const requiresInstallation = claim.requires_tenant_installation || capability.scope === "TENANT";
  if (requiresInstallation) {
    if (installation === null) return decision(input, false, "INSTALLATION_REQUIRED");
    try {
      assertInstalledCapabilityRecord(installation);
    } catch {
      return decision(input, false, "MALFORMED_TRUTH");
    }
    if (
      installation.capability_id !== capability.capability_id
      || installation.capability_version !== capability.capability_version
      || installation.tenant_id !== input.requested_tenant_id
      || installation.organization_id !== input.requested_organization_id
    ) {
      return decision(input, false, "INSTALLATION_REQUIRED");
    }
    if (installation.state === "SUSPENDED") return decision(input, false, "INSTALLATION_SUSPENDED");
    if (installation.state !== "ACTIVE") return decision(input, false, "INSTALLATION_NOT_ACTIVE");
    if (!installation.plan_eligible) return decision(input, false, "PLAN_INELIGIBLE");
  }
  return decision(input, true, "SELLABLE_VERIFIED");
}
