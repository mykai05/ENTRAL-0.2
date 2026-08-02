import {
  ContractError,
  assertIsoDate,
  assertJsonValue,
  assertNonEmptyString,
  assertRecord,
  assertSafeNonNegativeInteger,
  assertUuid
} from "./validation.js";

export const IDENTITY_AUTHORITY_CONTRACT_VERSION = "1.0.0" as const;
export const IDENTITY_AUTHORITY_RELEASE_VERSION = "phase-202" as const;

export const IDENTITY_ACTOR_TYPES = ["HUMAN", "SERVICE", "AGENT"] as const;
export type IdentityActorType = (typeof IDENTITY_ACTOR_TYPES)[number];
export const AUTHORITY_DOMAINS = ["IDENTITY", "TENANCY", "OPERATIONS", "FINANCE", "INTEGRATIONS", "SUPPORT"] as const;
export type AuthorityDomain = (typeof AUTHORITY_DOMAINS)[number];
export const DATA_CLASSIFICATIONS = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"] as const;
export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number];
export const ACTION_RISKS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type ActionRisk = (typeof ACTION_RISKS)[number];

export interface TenantOwnershipContext {
  readonly organization_id: string;
  readonly tenant_id: string;
  readonly business_id: string | null;
  readonly environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
  readonly data_residency: string;
}

export interface IdentityActorReference {
  readonly actor_id: string;
  readonly actor_type: IdentityActorType;
  readonly human_user_id: string | null;
  readonly service_subject: string | null;
  readonly agent_id: string | null;
}

export interface AuthorityEvaluationRequest {
  readonly contract_version: typeof IDENTITY_AUTHORITY_CONTRACT_VERSION;
  readonly schema_version: 1;
  readonly request_id: string;
  readonly idempotency_key: string;
  readonly actor: IdentityActorReference;
  readonly ownership: TenantOwnershipContext;
  readonly role: string;
  readonly authority_domain: AuthorityDomain;
  readonly data_classification: DataClassification;
  readonly action: string;
  readonly action_risk: ActionRisk;
  readonly requested_at: string;
}

export interface AuthorityEvaluationResult {
  readonly contract_version: typeof IDENTITY_AUTHORITY_CONTRACT_VERSION;
  readonly schema_version: 1;
  readonly request_id: string;
  readonly decision: "ALLOW" | "DENY" | "STEP_UP_REQUIRED";
  readonly reason_code: string;
  readonly policy_version: string;
  readonly evaluated_at: string;
  readonly evidence: readonly string[];
}

export interface AutonomyEnvelope {
  readonly contract_version: typeof IDENTITY_AUTHORITY_CONTRACT_VERSION;
  readonly schema_version: 1;
  readonly envelope_id: string;
  readonly version: number;
  readonly ownership: TenantOwnershipContext;
  readonly actor: IdentityActorReference;
  readonly allowed_action_types: readonly string[];
  readonly tool_scope: readonly string[];
  readonly data_scope: readonly string[];
  readonly budget: {
    readonly currency: string;
    readonly maximum_minor_units: number;
  };
  readonly reversible: boolean;
  readonly verification: string;
  readonly escalation: string;
  readonly expires_at: string;
  readonly created_at: string;
}

export interface SessionInventoryItem {
  readonly session_id: string;
  readonly actor_id: string;
  readonly organization_id: string | null;
  readonly tenant_id: string | null;
  readonly session_type: "INTERNAL" | "MEMBER" | "SUPPORT";
  readonly support_grant_id: string | null;
  readonly device_label: string;
  readonly issued_at: string;
  readonly last_used_at: string;
  readonly expires_at: string;
  readonly revoked_at: string | null;
  readonly current: boolean;
}

export interface MembershipTransitionReceipt {
  readonly contract_version: typeof IDENTITY_AUTHORITY_CONTRACT_VERSION;
  readonly schema_version: 1;
  readonly transition_id: string;
  readonly transition: "INVITE" | "ACCEPT" | "ROLE_CHANGE" | "SUSPEND" | "REMOVE";
  readonly ownership: TenantOwnershipContext;
  readonly actor: IdentityActorReference;
  readonly subject_user_id: string | null;
  readonly subject_email_hash: string | null;
  readonly request_id: string;
  readonly idempotency_key: string;
  readonly prior_version: number;
  readonly resulting_version: number;
  readonly authorization: "INVITATION_TOKEN" | "OWNER" | "TENANT_ADMIN" | "ACCOUNT_DEIDENTIFICATION";
  readonly budget: { readonly kind: "NO_EXTERNAL_SPEND"; readonly amount_minor_units: 0 };
  readonly reversible: boolean;
  readonly verification: "TRANSACTIONAL_READBACK";
  readonly reconciliation: "IDEMPOTENT_RECEIPT";
  readonly failure_behavior: "NO_PARTIAL_WRITE";
  readonly evidence: readonly string[];
  readonly notification_evidence_id: string;
  readonly occurred_at: string;
  readonly release_version: typeof IDENTITY_AUTHORITY_RELEASE_VERSION;
}

export interface IdentityTransitionOwnershipContext {
  readonly scope_kind: "PERSONAL" | "TENANT";
  readonly organization_id: string | null;
  readonly tenant_id: string | null;
  readonly business_id: string | null;
  readonly environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
  readonly data_residency: string | null;
}

export interface IdentityTransitionSideEffects {
  readonly budget: { readonly kind: "NO_EXTERNAL_SPEND"; readonly amount_minor_units: 0 };
  readonly reversible: boolean;
  readonly verification: "TRANSACTIONAL_READBACK";
  readonly reconciliation: "IDEMPOTENT_RECEIPT";
  readonly failure_behavior: "NO_PARTIAL_WRITE";
  readonly evidence: readonly string[];
  readonly occurred_at: string;
  readonly release_version: typeof IDENTITY_AUTHORITY_RELEASE_VERSION;
}

export interface MfaTransitionReceipt extends IdentityTransitionSideEffects {
  readonly contract_version: typeof IDENTITY_AUTHORITY_CONTRACT_VERSION;
  readonly schema_version: 1;
  readonly transition_id: string;
  readonly transition: "TOTP_ENROLL" | "TOTP_CONFIRM" | "STEP_UP" | "RECOVERY_REGENERATE" | "FACTOR_REVOKE";
  readonly ownership: IdentityTransitionOwnershipContext;
  readonly actor: IdentityActorReference;
  readonly session_id: string;
  readonly factor_id: string;
  readonly request_id: string;
  readonly idempotency_key: string;
  readonly prior_version: number;
  readonly resulting_version: number;
  readonly authorization: "DURABLE_SESSION" | "TOTP" | "RECOVERY_CODE" | "RECENT_MFA_STEP_UP";
  readonly factor_status: "PENDING" | "ACTIVE" | "REVOKED";
  readonly session_step_up_at: string | null;
  readonly one_time_material_policy: "TOTP_SECRET_RETURNED_ONCE" | "RECOVERY_CODES_RETURNED_ONCE" | "NONE";
  readonly recovery_action: "BEGIN_NEW_ENROLLMENT" | "REGENERATE_RECOVERY_CODES" | null;
}

export interface SecretReferenceDescriptor {
  readonly secret_reference_id: string;
  readonly tenant_id: string;
  readonly organization_id: string;
  readonly business_id: string | null;
  readonly provider: string;
  readonly purpose: string;
  readonly environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
  readonly key_version: string;
  readonly version: number;
  readonly last_four: string | null;
  readonly rotated_at: string | null;
  readonly revoked_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface SessionTransitionReceipt extends IdentityTransitionSideEffects {
  readonly contract_version: typeof IDENTITY_AUTHORITY_CONTRACT_VERSION;
  readonly schema_version: 1;
  readonly transition_id: string;
  readonly transition: "REVOKE_ONE" | "REVOKE_ALL";
  readonly ownership: IdentityTransitionOwnershipContext;
  readonly actor: IdentityActorReference;
  readonly request_id: string;
  readonly idempotency_key: string;
  readonly prior_version: number;
  readonly resulting_version: number;
  readonly revoked_count: number;
  readonly subject_session_id: string | null;
}

export interface SecretTransitionReceipt extends IdentityTransitionSideEffects {
  readonly contract_version: typeof IDENTITY_AUTHORITY_CONTRACT_VERSION;
  readonly schema_version: 1;
  readonly transition_id: string;
  readonly transition: "CREATE" | "ROTATE" | "REVOKE";
  readonly ownership: IdentityTransitionOwnershipContext;
  readonly actor: IdentityActorReference;
  readonly request_id: string;
  readonly idempotency_key: string;
  readonly prior_version: number;
  readonly resulting_version: number;
  readonly descriptor: SecretReferenceDescriptor;
}

export interface DependencyUnavailableResult {
  readonly contract_version: typeof IDENTITY_AUTHORITY_CONTRACT_VERSION;
  readonly schema_version: 1;
  readonly status: "BLOCKED";
  readonly dependency: "SECRET_BROKER" | "SESSION_STORE" | "AUTHORITY_STORE";
  readonly reason_code: string;
  readonly retryable: boolean;
  readonly occurred_at: string;
}

export interface AccountDeidentificationResult {
  readonly contract_version: typeof IDENTITY_AUTHORITY_CONTRACT_VERSION;
  readonly schema_version: 1;
  readonly outcome: "ACCOUNT_DEIDENTIFIED";
  readonly tenant_records: "RETAINED";
  readonly actor_provenance: "RETAINED_REVOKED";
  readonly retry_semantics: "TERMINAL_SESSION_REVOCATION";
  readonly receipt_id: string;
  readonly receipt_hash: string;
  readonly membership_receipt_ids: readonly string[];
  readonly retained_evidence_classes: readonly string[];
  readonly occurred_at: string;
}

export interface AccountExportScopeDescriptor {
  readonly kind: "PERSONAL" | "TENANT";
  readonly organization_id: string | null;
  readonly tenant_id: string | null;
  readonly external_providers_contacted: false;
  readonly secret_material_included: false;
}

export interface SupportAccessGrantDescriptor {
  readonly grant_id: string;
  readonly tenant_id: string;
  readonly organization_id: string;
  readonly support_actor_id: string;
  readonly purpose: string;
  readonly scopes: readonly string[];
  readonly access_mode: "READ_ONLY" | "WRITE_ELEVATED";
  readonly write_elevation_purpose: string | null;
  readonly write_elevation_expires_at: string | null;
  readonly owner_visible: true;
  readonly approved_by_actor_id: string;
  readonly issued_at: string;
  readonly expires_at: string;
  readonly revoked_at: string | null;
}

export interface SupportAccessTransitionReceipt extends IdentityTransitionSideEffects {
  readonly contract_version: typeof IDENTITY_AUTHORITY_CONTRACT_VERSION;
  readonly schema_version: 1;
  readonly transition_id: string;
  readonly transition: "ISSUE_READ_ONLY" | "ELEVATE_WRITE" | "REVOKE";
  readonly ownership: IdentityTransitionOwnershipContext;
  readonly actor: IdentityActorReference;
  readonly grant_id: string;
  readonly support_actor_id: string;
  readonly request_id: string;
  readonly idempotency_key: string;
  readonly prior_version: number;
  readonly resulting_version: number;
  readonly authorization: "OWNER" | "OWNER_RECENT_MFA_STEP_UP";
  readonly grant: SupportAccessGrantDescriptor;
}

export interface SupportSessionReadback {
  readonly session: SessionInventoryItem;
  readonly support_grant: SupportAccessGrantDescriptor;
}

function assertVersion(value: Record<string, unknown>, field: string) {
  if (value.contract_version !== IDENTITY_AUTHORITY_CONTRACT_VERSION || value.schema_version !== 1) {
    throw new ContractError("INVALID_IDENTITY_AUTHORITY_VERSION", `${field} must use the Phase 202 identity authority contract`);
  }
}

function assertStringArray(value: unknown, field: string, maximum = 100): asserts value is string[] {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new ContractError("INVALID_SCOPE_LIST", `${field} must be a bounded array`);
  }
  value.forEach((item, index) => assertNonEmptyString(item, `${field}[${index}]`, 160));
  if (new Set(value).size !== value.length) throw new ContractError("DUPLICATE_SCOPE", `${field} must be unique`);
}

export function assertTenantOwnershipContext(value: unknown): asserts value is TenantOwnershipContext {
  assertRecord(value, "ownership");
  assertUuid(value.organization_id, "ownership.organization_id");
  assertUuid(value.tenant_id, "ownership.tenant_id");
  if (value.business_id !== null) assertUuid(value.business_id, "ownership.business_id");
  if (!["DEVELOPMENT", "STAGING", "PRODUCTION"].includes(String(value.environment))) {
    throw new ContractError("INVALID_ENVIRONMENT", "ownership.environment is invalid");
  }
  assertNonEmptyString(value.data_residency, "ownership.data_residency", 80);
}

export function assertIdentityTransitionOwnershipContext(value: unknown): asserts value is IdentityTransitionOwnershipContext {
  assertRecord(value, "transition_ownership");
  if (value.scope_kind !== "PERSONAL" && value.scope_kind !== "TENANT") {
    throw new ContractError("INVALID_TRANSITION_SCOPE", "transition ownership scope is invalid");
  }
  for (const field of ["organization_id", "tenant_id", "business_id"] as const) {
    if (value[field] !== null) assertUuid(value[field], `transition_ownership.${field}`);
  }
  if (!["DEVELOPMENT", "STAGING", "PRODUCTION"].includes(String(value.environment))) {
    throw new ContractError("INVALID_ENVIRONMENT", "transition ownership environment is invalid");
  }
  if (value.data_residency !== null) assertNonEmptyString(value.data_residency, "transition_ownership.data_residency", 80);
  if (value.scope_kind === "PERSONAL") {
    if (value.organization_id !== null || value.tenant_id !== null || value.business_id !== null || value.data_residency !== null) {
      throw new ContractError("INVALID_PERSONAL_SCOPE", "personal transition ownership cannot declare tenant scope");
    }
  } else if (value.organization_id === null || value.tenant_id === null || value.data_residency === null) {
    throw new ContractError("INVALID_TENANT_SCOPE", "tenant transition ownership requires organization, tenant, and residency");
  }
}

function assertTransitionSideEffects(value: Record<string, unknown>, field: string) {
  assertRecord(value.budget, `${field}.budget`);
  if (value.budget.kind !== "NO_EXTERNAL_SPEND" || value.budget.amount_minor_units !== 0) {
    throw new ContractError("INVALID_TRANSITION_BUDGET", `${field} cannot declare external spend`);
  }
  if (typeof value.reversible !== "boolean"
    || value.verification !== "TRANSACTIONAL_READBACK"
    || value.reconciliation !== "IDEMPOTENT_RECEIPT"
    || value.failure_behavior !== "NO_PARTIAL_WRITE") {
    throw new ContractError("INVALID_TRANSITION_SIDE_EFFECT", `${field} side-effect declaration is incomplete`);
  }
  assertStringArray(value.evidence, `${field}.evidence`);
  if (value.evidence.length === 0) throw new ContractError("MISSING_TRANSITION_EVIDENCE", `${field} requires evidence`);
  assertIsoDate(value.occurred_at, `${field}.occurred_at`);
  if (value.release_version !== IDENTITY_AUTHORITY_RELEASE_VERSION) {
    throw new ContractError("INVALID_RELEASE", `${field} release is invalid`);
  }
}

function containsMfaSecretMaterial(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsMfaSecretMaterial);
  if (value === null || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => (
    ["secret", "secret_value", "otpauth_uri", "recovery_code", "recovery_codes", "submitted_code", "totp_code"].includes(key.toLowerCase())
    || containsMfaSecretMaterial(nested)
  ));
}

function containsProhibitedMaterial(value: unknown, prohibitedKeys: ReadonlySet<string>): boolean {
  if (Array.isArray(value)) return value.some((item) => containsProhibitedMaterial(item, prohibitedKeys));
  if (value === null || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => (
    prohibitedKeys.has(key.toLowerCase()) || containsProhibitedMaterial(nested, prohibitedKeys)
  ));
}

function assertExactKeys(value: Record<string, unknown>, allowedKeys: readonly string[], field: string) {
  const allowed = new Set(allowedKeys);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new ContractError("UNEXPECTED_CONTRACT_FIELD", `${field} contains unexpected fields`);
  }
}

const PROHIBITED_SESSION_RECEIPT_KEYS = new Set([
  "access_token",
  "authorization_header",
  "cookie",
  "jwt",
  "raw_token",
  "refresh_token",
  "session_secret",
  "token_hash"
]);

const PROHIBITED_SECRET_RECEIPT_KEYS = new Set([
  "access_token",
  "accesstoken",
  "admin_token",
  "admintoken",
  "ciphertext",
  "credential_json",
  "credentialjson",
  "encrypted_payload",
  "encrypted_value",
  "encryptedpayload",
  "encryptedvalue",
  "envelope",
  "nonce",
  "payload_json",
  "payloadjson",
  "plaintext",
  "raw_secret",
  "rawsecret",
  "secret",
  "secret_value",
  "secretvalue"
]);

export function assertIdentityActorReference(value: unknown): asserts value is IdentityActorReference {
  assertRecord(value, "actor");
  assertUuid(value.actor_id, "actor.actor_id");
  if (!(IDENTITY_ACTOR_TYPES as readonly unknown[]).includes(value.actor_type)) {
    throw new ContractError("INVALID_IDENTITY_ACTOR_TYPE", "actor.actor_type must be HUMAN, SERVICE, or AGENT");
  }
  for (const field of ["human_user_id", "service_subject", "agent_id"] as const) {
    const candidate = value[field];
    if (candidate !== null) assertNonEmptyString(candidate, `actor.${field}`, 200);
  }
  const populated = [value.human_user_id, value.service_subject, value.agent_id].filter((item) => item !== null);
  if (populated.length !== 1) throw new ContractError("IDENTITY_TYPE_CONFUSION", "actor must identify exactly one actor-type subject");
  if (
    (value.actor_type === "HUMAN" && value.human_user_id === null)
    || (value.actor_type === "SERVICE" && value.service_subject === null)
    || (value.actor_type === "AGENT" && value.agent_id === null)
  ) {
    throw new ContractError("IDENTITY_TYPE_CONFUSION", "actor subject does not match actor_type");
  }
}

export function parseAuthorityEvaluationRequest(value: unknown): AuthorityEvaluationRequest {
  assertRecord(value, "authority_request");
  assertVersion(value, "authority_request");
  assertUuid(value.request_id, "authority_request.request_id");
  assertNonEmptyString(value.idempotency_key, "authority_request.idempotency_key", 255);
  if (value.idempotency_key.length < 12) throw new ContractError("IDEMPOTENCY_KEY", "idempotency_key must be at least 12 characters");
  assertIdentityActorReference(value.actor);
  assertTenantOwnershipContext(value.ownership);
  assertNonEmptyString(value.role, "authority_request.role", 80);
  if (!(AUTHORITY_DOMAINS as readonly unknown[]).includes(value.authority_domain)) throw new ContractError("INVALID_AUTHORITY_DOMAIN", "authority_domain is invalid");
  if (!(DATA_CLASSIFICATIONS as readonly unknown[]).includes(value.data_classification)) throw new ContractError("INVALID_DATA_CLASSIFICATION", "data_classification is invalid");
  assertNonEmptyString(value.action, "authority_request.action", 160);
  if (!(ACTION_RISKS as readonly unknown[]).includes(value.action_risk)) throw new ContractError("INVALID_ACTION_RISK", "action_risk is invalid");
  assertIsoDate(value.requested_at, "authority_request.requested_at");
  return value as unknown as AuthorityEvaluationRequest;
}

export function assertAutonomyEnvelope(value: unknown): asserts value is AutonomyEnvelope {
  assertRecord(value, "autonomy_envelope");
  assertVersion(value, "autonomy_envelope");
  assertUuid(value.envelope_id, "autonomy_envelope.envelope_id");
  assertSafeNonNegativeInteger(value.version, "autonomy_envelope.version");
  if (value.version < 1) throw new ContractError("INVALID_ENVELOPE_VERSION", "autonomy envelope version must be positive");
  assertTenantOwnershipContext(value.ownership);
  assertIdentityActorReference(value.actor);
  assertStringArray(value.allowed_action_types, "autonomy_envelope.allowed_action_types");
  assertStringArray(value.tool_scope, "autonomy_envelope.tool_scope");
  assertStringArray(value.data_scope, "autonomy_envelope.data_scope");
  assertRecord(value.budget, "autonomy_envelope.budget");
  assertNonEmptyString(value.budget.currency, "autonomy_envelope.budget.currency", 3);
  assertSafeNonNegativeInteger(value.budget.maximum_minor_units, "autonomy_envelope.budget.maximum_minor_units");
  if (typeof value.reversible !== "boolean") throw new ContractError("INVALID_REVERSIBILITY", "autonomy_envelope.reversible must be boolean");
  assertNonEmptyString(value.verification, "autonomy_envelope.verification", 500);
  assertNonEmptyString(value.escalation, "autonomy_envelope.escalation", 500);
  assertIsoDate(value.expires_at, "autonomy_envelope.expires_at");
  assertIsoDate(value.created_at, "autonomy_envelope.created_at");
  if (Date.parse(value.expires_at) <= Date.parse(value.created_at)) throw new ContractError("EXPIRED_AUTONOMY_ENVELOPE", "autonomy envelope expiration must follow creation");
}

export function assertMembershipTransitionReceipt(value: unknown): asserts value is MembershipTransitionReceipt {
  assertRecord(value, "membership_transition");
  assertVersion(value, "membership_transition");
  assertUuid(value.transition_id, "membership_transition.transition_id");
  if (!["INVITE", "ACCEPT", "ROLE_CHANGE", "SUSPEND", "REMOVE"].includes(String(value.transition))) throw new ContractError("INVALID_MEMBERSHIP_TRANSITION", "membership transition is invalid");
  assertTenantOwnershipContext(value.ownership);
  assertIdentityActorReference(value.actor);
  if (value.subject_user_id !== null) assertNonEmptyString(value.subject_user_id, "membership_transition.subject_user_id", 160);
  if (value.subject_email_hash !== null) assertNonEmptyString(value.subject_email_hash, "membership_transition.subject_email_hash", 128);
  if ((value.subject_user_id === null) === (value.subject_email_hash === null)) {
    throw new ContractError("INVALID_MEMBERSHIP_SUBJECT", "membership transition must identify exactly one user or invited email hash");
  }
  assertUuid(value.request_id, "membership_transition.request_id");
  assertNonEmptyString(value.idempotency_key, "membership_transition.idempotency_key", 255);
  assertSafeNonNegativeInteger(value.prior_version, "membership_transition.prior_version");
  assertSafeNonNegativeInteger(value.resulting_version, "membership_transition.resulting_version");
  if (value.resulting_version !== value.prior_version + 1) throw new ContractError("INVALID_MEMBERSHIP_VERSION", "membership transition must increment one version");
  if (!["INVITATION_TOKEN", "OWNER", "TENANT_ADMIN", "ACCOUNT_DEIDENTIFICATION"].includes(String(value.authorization))) {
    throw new ContractError("INVALID_MEMBERSHIP_AUTHORITY", "membership transition authority is invalid");
  }
  if (value.transition === "ACCEPT") {
    if (value.authorization !== "INVITATION_TOKEN" || value.subject_user_id !== value.actor.human_user_id) {
      throw new ContractError("INVALID_INVITATION_AUTHORITY", "invitation acceptance must be token-bound to the invited Human");
    }
  } else if (value.authorization === "INVITATION_TOKEN") {
    throw new ContractError("INVALID_INVITATION_AUTHORITY", "invitation-token authority is valid only for acceptance");
  }
  if (value.authorization === "ACCOUNT_DEIDENTIFICATION" && (
    value.transition !== "REMOVE" || value.subject_user_id !== value.actor.human_user_id
  )) {
    throw new ContractError("INVALID_ACCOUNT_DEIDENTIFICATION_AUTHORITY", "account deidentification may remove only the authenticated Human");
  }
  assertRecord(value.budget, "membership_transition.budget");
  if (value.budget.kind !== "NO_EXTERNAL_SPEND" || value.budget.amount_minor_units !== 0) throw new ContractError("INVALID_MEMBERSHIP_BUDGET", "membership transition cannot declare spend");
  if (typeof value.reversible !== "boolean" || value.verification !== "TRANSACTIONAL_READBACK" || value.reconciliation !== "IDEMPOTENT_RECEIPT" || value.failure_behavior !== "NO_PARTIAL_WRITE") {
    throw new ContractError("INVALID_MEMBERSHIP_SIDE_EFFECT", "membership transition side-effect declaration is incomplete");
  }
  assertStringArray(value.evidence, "membership_transition.evidence");
  assertUuid(value.notification_evidence_id, "membership_transition.notification_evidence_id");
  assertIsoDate(value.occurred_at, "membership_transition.occurred_at");
  if (value.release_version !== IDENTITY_AUTHORITY_RELEASE_VERSION) throw new ContractError("INVALID_RELEASE", "membership transition release is invalid");
}

export function assertMfaTransitionReceipt(value: unknown): asserts value is MfaTransitionReceipt {
  assertRecord(value, "mfa_transition");
  assertVersion(value, "mfa_transition");
  assertUuid(value.transition_id, "mfa_transition.transition_id");
  if (!["TOTP_ENROLL", "TOTP_CONFIRM", "STEP_UP", "RECOVERY_REGENERATE", "FACTOR_REVOKE"].includes(String(value.transition))) {
    throw new ContractError("INVALID_MFA_TRANSITION", "MFA transition is invalid");
  }
  assertIdentityTransitionOwnershipContext(value.ownership);
  if (value.ownership.scope_kind !== "PERSONAL") throw new ContractError("INVALID_MFA_SCOPE", "MFA transition must be personal");
  assertIdentityActorReference(value.actor);
  if (value.actor.actor_type !== "HUMAN") throw new ContractError("INVALID_MFA_ACTOR", "MFA transition actor must be Human");
  for (const field of ["session_id", "factor_id"] as const) assertUuid(value[field], `mfa_transition.${field}`);
  assertNonEmptyString(value.request_id, "mfa_transition.request_id", 255);
  assertNonEmptyString(value.idempotency_key, "mfa_transition.idempotency_key", 255);
  if (value.idempotency_key.length < 12) throw new ContractError("IDEMPOTENCY_KEY", "MFA idempotency key must be at least 12 characters");
  assertSafeNonNegativeInteger(value.prior_version, "mfa_transition.prior_version");
  assertSafeNonNegativeInteger(value.resulting_version, "mfa_transition.resulting_version");
  if (value.resulting_version !== value.prior_version + 1) throw new ContractError("INVALID_MFA_VERSION", "MFA transition must increment one version");
  if (!["DURABLE_SESSION", "TOTP", "RECOVERY_CODE", "RECENT_MFA_STEP_UP"].includes(String(value.authorization))) {
    throw new ContractError("INVALID_MFA_AUTHORITY", "MFA transition authority is invalid");
  }
  if (!["PENDING", "ACTIVE", "REVOKED"].includes(String(value.factor_status))) throw new ContractError("INVALID_MFA_STATUS", "MFA factor status is invalid");
  if (value.session_step_up_at !== null) assertIsoDate(value.session_step_up_at, "mfa_transition.session_step_up_at");
  if (!["TOTP_SECRET_RETURNED_ONCE", "RECOVERY_CODES_RETURNED_ONCE", "NONE"].includes(String(value.one_time_material_policy))) {
    throw new ContractError("INVALID_ONE_TIME_MATERIAL_POLICY", "MFA one-time material policy is invalid");
  }
  if (value.recovery_action !== null && !["BEGIN_NEW_ENROLLMENT", "REGENERATE_RECOVERY_CODES"].includes(String(value.recovery_action))) {
    throw new ContractError("INVALID_MFA_RECOVERY_ACTION", "MFA recovery action is invalid");
  }
  const validCombination = (
    value.transition === "TOTP_ENROLL"
      ? value.authorization === "DURABLE_SESSION" && value.factor_status === "PENDING" && value.session_step_up_at === null
        && value.one_time_material_policy === "TOTP_SECRET_RETURNED_ONCE" && value.recovery_action === "BEGIN_NEW_ENROLLMENT" && value.reversible === true
      : value.transition === "TOTP_CONFIRM"
        ? value.authorization === "TOTP" && value.factor_status === "ACTIVE" && value.session_step_up_at !== null
          && value.one_time_material_policy === "RECOVERY_CODES_RETURNED_ONCE" && value.recovery_action === "REGENERATE_RECOVERY_CODES" && value.reversible === true
        : value.transition === "STEP_UP"
          ? (value.authorization === "TOTP" || value.authorization === "RECOVERY_CODE") && value.factor_status === "ACTIVE"
            && value.session_step_up_at !== null && value.one_time_material_policy === "NONE" && value.recovery_action === null && value.reversible === true
          : value.transition === "RECOVERY_REGENERATE"
            ? value.authorization === "RECENT_MFA_STEP_UP" && value.factor_status === "ACTIVE" && value.session_step_up_at !== null
              && value.one_time_material_policy === "RECOVERY_CODES_RETURNED_ONCE" && value.recovery_action === "REGENERATE_RECOVERY_CODES" && value.reversible === false
            : value.authorization === "RECENT_MFA_STEP_UP" && value.factor_status === "REVOKED" && value.session_step_up_at === null
              && value.one_time_material_policy === "NONE" && value.recovery_action === null && value.reversible === false
  );
  if (!validCombination) throw new ContractError("INVALID_MFA_TRANSITION_STATE", "MFA transition state and authority do not match");
  if (containsMfaSecretMaterial(value)) {
    throw new ContractError("MFA_SECRET_MATERIAL_PRESENT", "MFA transition receipt contains prohibited secret material");
  }
  assertTransitionSideEffects(value, "mfa_transition");
}

export function assertSessionInventoryItem(value: unknown): asserts value is SessionInventoryItem {
  assertRecord(value, "session_inventory_item");
  for (const field of ["session_id", "actor_id"] as const) assertUuid(value[field], `session_inventory_item.${field}`);
  for (const field of ["organization_id", "tenant_id", "support_grant_id"] as const) {
    if (value[field] !== null) assertUuid(value[field], `session_inventory_item.${field}`);
  }
  if (!['INTERNAL', 'MEMBER', 'SUPPORT'].includes(String(value.session_type))) {
    throw new ContractError("INVALID_SESSION_TYPE", "session inventory type is invalid");
  }
  const isInternal = value.session_type === "INTERNAL";
  const isSupport = value.session_type === "SUPPORT";
  if ((isInternal && (value.organization_id !== null || value.tenant_id !== null || value.support_grant_id !== null))
    || (!isInternal && (value.organization_id === null || value.tenant_id === null))
    || (isSupport !== (value.support_grant_id !== null))) {
    throw new ContractError("SESSION_TYPE_SCOPE_MISMATCH", "session type does not match its tenant and support-grant scope");
  }
  assertNonEmptyString(value.device_label, "session_inventory_item.device_label", 200);
  assertIsoDate(value.issued_at, "session_inventory_item.issued_at");
  assertIsoDate(value.last_used_at, "session_inventory_item.last_used_at");
  assertIsoDate(value.expires_at, "session_inventory_item.expires_at");
  if (value.revoked_at !== null) assertIsoDate(value.revoked_at, "session_inventory_item.revoked_at");
  if (Date.parse(value.expires_at) <= Date.parse(value.issued_at)) {
    throw new ContractError("INVALID_SESSION_EXPIRY", "session expiry must follow issuance");
  }
  if (typeof value.current !== "boolean") throw new ContractError("INVALID_SESSION_CURRENT", "session current must be boolean");
}

export function assertSessionTransitionReceipt(value: unknown): asserts value is SessionTransitionReceipt {
  assertRecord(value, "session_transition");
  assertVersion(value, "session_transition");
  assertUuid(value.transition_id, "session_transition.transition_id");
  if (value.transition !== "REVOKE_ONE" && value.transition !== "REVOKE_ALL") {
    throw new ContractError("INVALID_SESSION_TRANSITION", "session transition is invalid");
  }
  assertIdentityTransitionOwnershipContext(value.ownership);
  if (value.ownership.scope_kind !== "PERSONAL") throw new ContractError("INVALID_SESSION_SCOPE", "session transition must be personal");
  assertIdentityActorReference(value.actor);
  if (value.actor.actor_type !== "HUMAN") throw new ContractError("INVALID_SESSION_ACTOR", "session transition actor must be Human");
  assertNonEmptyString(value.request_id, "session_transition.request_id", 255);
  assertNonEmptyString(value.idempotency_key, "session_transition.idempotency_key", 255);
  if (value.idempotency_key.length < 12) throw new ContractError("IDEMPOTENCY_KEY", "session idempotency key must be at least 12 characters");
  assertSafeNonNegativeInteger(value.prior_version, "session_transition.prior_version");
  assertSafeNonNegativeInteger(value.resulting_version, "session_transition.resulting_version");
  if (value.resulting_version !== value.prior_version + 1) {
    throw new ContractError("INVALID_SESSION_VERSION", "session transition must increment one version");
  }
  assertSafeNonNegativeInteger(value.revoked_count, "session_transition.revoked_count");
  if (value.subject_session_id !== null) assertUuid(value.subject_session_id, "session_transition.subject_session_id");
  if ((value.transition === "REVOKE_ONE" && (value.subject_session_id === null || value.revoked_count !== 1))
    || (value.transition === "REVOKE_ALL" && value.subject_session_id !== null)) {
    throw new ContractError("INVALID_SESSION_TRANSITION_STATE", "session transition subject and count do not match its action");
  }
  if (value.reversible !== false) throw new ContractError("INVALID_SESSION_TRANSITION_STATE", "session revocation must be terminal");
  if (containsProhibitedMaterial(value, PROHIBITED_SESSION_RECEIPT_KEYS)) {
    throw new ContractError("SESSION_SECRET_MATERIAL_PRESENT", "session transition receipt contains prohibited credential material");
  }
  assertTransitionSideEffects(value, "session_transition");
}

export function assertSecretReferenceDescriptor(value: unknown): asserts value is SecretReferenceDescriptor {
  assertRecord(value, "secret_reference_descriptor");
  assertExactKeys(value, [
    "secret_reference_id", "tenant_id", "organization_id", "business_id", "provider",
    "purpose", "environment", "key_version", "version", "last_four", "rotated_at",
    "revoked_at", "created_at", "updated_at"
  ], "secret_reference_descriptor");
  for (const field of ["secret_reference_id", "tenant_id", "organization_id"] as const) {
    assertUuid(value[field], `secret_reference_descriptor.${field}`);
  }
  if (value.business_id !== null) assertUuid(value.business_id, "secret_reference_descriptor.business_id");
  for (const field of ["provider", "purpose", "key_version"] as const) {
    assertNonEmptyString(value[field], `secret_reference_descriptor.${field}`, field === "purpose" ? 500 : 160);
  }
  if (!['DEVELOPMENT', 'STAGING', 'PRODUCTION'].includes(String(value.environment))) {
    throw new ContractError("INVALID_ENVIRONMENT", "secret reference environment is invalid");
  }
  assertSafeNonNegativeInteger(value.version, "secret_reference_descriptor.version");
  if (value.version < 1) throw new ContractError("INVALID_SECRET_VERSION", "secret reference version must be positive");
  if (value.last_four !== null) {
    assertNonEmptyString(value.last_four, "secret_reference_descriptor.last_four", 4);
    if (value.last_four.length !== 4) throw new ContractError("INVALID_SECRET_LAST_FOUR", "secret reference last_four must contain exactly four characters");
  }
  if (value.rotated_at !== null) assertIsoDate(value.rotated_at, "secret_reference_descriptor.rotated_at");
  if (value.revoked_at !== null) assertIsoDate(value.revoked_at, "secret_reference_descriptor.revoked_at");
  assertIsoDate(value.created_at, "secret_reference_descriptor.created_at");
  assertIsoDate(value.updated_at, "secret_reference_descriptor.updated_at");
  if (Date.parse(value.updated_at) < Date.parse(value.created_at)) {
    throw new ContractError("INVALID_SECRET_TIMELINE", "secret reference update cannot precede creation");
  }
}

export function assertSecretTransitionReceipt(value: unknown): asserts value is SecretTransitionReceipt {
  assertRecord(value, "secret_transition");
  assertExactKeys(value, [
    "contract_version", "schema_version", "transition_id", "transition", "ownership", "actor",
    "request_id", "idempotency_key", "prior_version", "resulting_version", "descriptor", "budget",
    "reversible", "verification", "reconciliation", "failure_behavior", "evidence", "occurred_at",
    "release_version"
  ], "secret_transition");
  assertVersion(value, "secret_transition");
  assertUuid(value.transition_id, "secret_transition.transition_id");
  if (!['CREATE', 'ROTATE', 'REVOKE'].includes(String(value.transition))) {
    throw new ContractError("INVALID_SECRET_TRANSITION", "secret transition is invalid");
  }
  assertIdentityTransitionOwnershipContext(value.ownership);
  if (value.ownership.scope_kind !== "TENANT") throw new ContractError("INVALID_SECRET_SCOPE", "secret transition must be tenant-scoped");
  assertIdentityActorReference(value.actor);
  if (value.actor.actor_type !== "HUMAN") throw new ContractError("INVALID_SECRET_ACTOR", "secret transition actor must be Human");
  assertNonEmptyString(value.request_id, "secret_transition.request_id", 255);
  assertNonEmptyString(value.idempotency_key, "secret_transition.idempotency_key", 255);
  if (value.idempotency_key.length < 12) throw new ContractError("IDEMPOTENCY_KEY", "secret idempotency key must be at least 12 characters");
  assertSafeNonNegativeInteger(value.prior_version, "secret_transition.prior_version");
  assertSafeNonNegativeInteger(value.resulting_version, "secret_transition.resulting_version");
  const validVersion = value.transition === "CREATE"
    ? value.prior_version === 0 && value.resulting_version === 1
    : value.prior_version >= 1 && value.resulting_version === value.prior_version + 1;
  if (!validVersion) throw new ContractError("INVALID_SECRET_VERSION", "secret transition version is invalid");
  assertSecretReferenceDescriptor(value.descriptor);
  if (value.descriptor.organization_id !== value.ownership.organization_id
    || value.descriptor.tenant_id !== value.ownership.tenant_id
    || value.descriptor.business_id !== value.ownership.business_id
    || value.descriptor.environment !== value.ownership.environment
    || value.descriptor.version !== value.resulting_version) {
    throw new ContractError("SECRET_RECEIPT_SCOPE_MISMATCH", "secret descriptor does not match receipt ownership and version");
  }
  if ((value.transition === "CREATE" && (value.descriptor.rotated_at !== null || value.descriptor.revoked_at !== null))
    || (value.transition === "ROTATE" && (value.descriptor.rotated_at === null || value.descriptor.revoked_at !== null))
    || (value.transition === "REVOKE" && value.descriptor.revoked_at === null)) {
    throw new ContractError("INVALID_SECRET_TRANSITION_STATE", "secret descriptor state does not match its transition");
  }
  if ((value.transition === "REVOKE" && value.reversible !== false)
    || (value.transition !== "REVOKE" && value.reversible !== true)) {
    throw new ContractError("INVALID_SECRET_TRANSITION_STATE", "secret transition reversibility does not match its action");
  }
  if (containsProhibitedMaterial(value, PROHIBITED_SECRET_RECEIPT_KEYS)) {
    throw new ContractError("RAW_SECRET_MATERIAL_PRESENT", "secret transition receipt contains prohibited secret material");
  }
  assertTransitionSideEffects(value, "secret_transition");
}

export function assertSupportAccessTransitionReceipt(value: unknown): asserts value is SupportAccessTransitionReceipt {
  assertRecord(value, "support_transition");
  assertVersion(value, "support_transition");
  assertUuid(value.transition_id, "support_transition.transition_id");
  if (!["ISSUE_READ_ONLY", "ELEVATE_WRITE", "REVOKE"].includes(String(value.transition))) {
    throw new ContractError("INVALID_SUPPORT_TRANSITION", "support transition is invalid");
  }
  assertIdentityTransitionOwnershipContext(value.ownership);
  if (value.ownership.scope_kind !== "TENANT") throw new ContractError("INVALID_SUPPORT_SCOPE", "support transition must be tenant-scoped");
  assertIdentityActorReference(value.actor);
  if (value.actor.actor_type !== "HUMAN") throw new ContractError("INVALID_SUPPORT_ACTOR", "support transition actor must be Human");
  for (const field of ["grant_id", "support_actor_id"] as const) assertUuid(value[field], `support_transition.${field}`);
  assertNonEmptyString(value.request_id, "support_transition.request_id", 255);
  assertNonEmptyString(value.idempotency_key, "support_transition.idempotency_key", 255);
  if (value.idempotency_key.length < 12) throw new ContractError("IDEMPOTENCY_KEY", "support idempotency key must be at least 12 characters");
  assertSafeNonNegativeInteger(value.prior_version, "support_transition.prior_version");
  assertSafeNonNegativeInteger(value.resulting_version, "support_transition.resulting_version");
  if (value.resulting_version !== value.prior_version + 1) throw new ContractError("INVALID_SUPPORT_VERSION", "support transition must increment one version");
  if (value.authorization !== "OWNER" && value.authorization !== "OWNER_RECENT_MFA_STEP_UP") {
    throw new ContractError("INVALID_SUPPORT_AUTHORITY", "support transition authority is invalid");
  }
  if (value.transition === "ELEVATE_WRITE" && value.authorization !== "OWNER_RECENT_MFA_STEP_UP") {
    throw new ContractError("INVALID_SUPPORT_AUTHORITY", "support elevation requires recent MFA step-up");
  }
  if ((value.transition === "ISSUE_READ_ONLY" || value.transition === "REVOKE") && value.authorization !== "OWNER") {
    throw new ContractError("INVALID_SUPPORT_AUTHORITY", "support issue and revoke require owner authority");
  }
  assertSupportAccessGrant(value.grant);
  if (value.grant.grant_id !== value.grant_id || value.grant.support_actor_id !== value.support_actor_id
    || value.grant.tenant_id !== value.ownership.tenant_id || value.grant.organization_id !== value.ownership.organization_id) {
    throw new ContractError("SUPPORT_RECEIPT_SCOPE_MISMATCH", "support transition grant snapshot does not match receipt scope");
  }
  if ((value.transition === "ISSUE_READ_ONLY" && (value.prior_version !== 0 || value.resulting_version !== 1 || value.grant.access_mode !== "READ_ONLY" || value.grant.revoked_at !== null || value.reversible !== true))
    || (value.transition === "ELEVATE_WRITE" && (value.grant.access_mode !== "WRITE_ELEVATED" || value.grant.revoked_at !== null || value.reversible !== true))
    || (value.transition === "REVOKE" && (value.grant.revoked_at === null || value.reversible !== false))) {
    throw new ContractError("INVALID_SUPPORT_TRANSITION_STATE", "support transition state does not match its action");
  }
  assertTransitionSideEffects(value, "support_transition");
}

export function assertSupportAccessGrant(value: unknown): asserts value is SupportAccessGrantDescriptor {
  assertRecord(value, "support_access_grant");
  for (const field of ["grant_id", "tenant_id", "organization_id", "support_actor_id", "approved_by_actor_id"] as const) assertUuid(value[field], `support_access_grant.${field}`);
  assertNonEmptyString(value.purpose, "support_access_grant.purpose", 500);
  assertStringArray(value.scopes, "support_access_grant.scopes", 50);
  if (value.scopes.some((scope) => !/^table:[A-Za-z][A-Za-z0-9]*:(read|write)$/u.test(scope))) {
    throw new ContractError("INVALID_SUPPORT_SCOPE", "support scopes must use table:<name>:read or table:<name>:write");
  }
  if (value.access_mode !== "READ_ONLY" && value.access_mode !== "WRITE_ELEVATED") throw new ContractError("INVALID_SUPPORT_ACCESS_MODE", "support access mode is invalid");
  if (value.access_mode === "READ_ONLY" && value.scopes.some((scope) => scope.endsWith(":write"))) {
    throw new ContractError("INVALID_SUPPORT_SCOPE", "read-only support access cannot expose write scopes");
  }
  if (value.access_mode === "WRITE_ELEVATED" && !value.scopes.some((scope) => scope.endsWith(":write"))) {
    throw new ContractError("INVALID_SUPPORT_SCOPE", "write-elevated support access requires an explicit write scope");
  }
  if (value.write_elevation_purpose !== null) assertNonEmptyString(value.write_elevation_purpose, "support_access_grant.write_elevation_purpose", 500);
  if (value.write_elevation_expires_at !== null) assertIsoDate(value.write_elevation_expires_at, "support_access_grant.write_elevation_expires_at");
  if ((value.write_elevation_purpose === null) !== (value.write_elevation_expires_at === null)) {
    throw new ContractError("INVALID_SUPPORT_ELEVATION", "support elevation purpose and expiry must be present together");
  }
  if (value.access_mode === "WRITE_ELEVATED" && value.write_elevation_expires_at === null) {
    throw new ContractError("INVALID_SUPPORT_ELEVATION", "effective write elevation requires an expiry");
  }
  if (value.owner_visible !== true) throw new ContractError("HIDDEN_SUPPORT_ACCESS", "support access must remain owner visible");
  assertIsoDate(value.issued_at, "support_access_grant.issued_at");
  assertIsoDate(value.expires_at, "support_access_grant.expires_at");
  if (value.revoked_at !== null) assertIsoDate(value.revoked_at, "support_access_grant.revoked_at");
  if (Date.parse(value.expires_at) <= Date.parse(value.issued_at)) throw new ContractError("INVALID_SUPPORT_EXPIRY", "support access must expire after issuance");
  if (value.write_elevation_expires_at !== null
    && (Date.parse(value.write_elevation_expires_at) <= Date.parse(value.issued_at)
      || Date.parse(value.write_elevation_expires_at) > Date.parse(value.expires_at))) {
    throw new ContractError("INVALID_SUPPORT_ELEVATION", "support write elevation must expire after issuance and no later than the grant");
  }
}

export function assertSupportSessionReadback(value: unknown): asserts value is SupportSessionReadback {
  assertRecord(value, "support_session_readback");
  assertSessionInventoryItem(value.session);
  assertSupportAccessGrant(value.support_grant);
  if (value.session.session_type !== "SUPPORT"
    || value.session.support_grant_id !== value.support_grant.grant_id
    || value.session.actor_id !== value.support_grant.support_actor_id
    || value.session.organization_id !== value.support_grant.organization_id
    || value.session.tenant_id !== value.support_grant.tenant_id) {
    throw new ContractError("SUPPORT_SESSION_GRANT_MISMATCH", "support session is not bound to the exact grant and tenant scope");
  }
  if (Date.parse(value.session.expires_at) > Date.parse(value.support_grant.expires_at)) {
    throw new ContractError("INVALID_SUPPORT_SESSION_EXPIRY", "support session cannot outlive its exact grant");
  }
  if (value.support_grant.revoked_at !== null && value.session.revoked_at === null) {
    throw new ContractError("ACTIVE_REVOKED_SUPPORT_SESSION", "a revoked support grant cannot retain an active session");
  }
}

export function assertAccountDeidentificationResult(value: unknown): asserts value is AccountDeidentificationResult {
  assertRecord(value, "account_deidentification");
  assertVersion(value, "account_deidentification");
  if (value.outcome !== "ACCOUNT_DEIDENTIFIED" || value.tenant_records !== "RETAINED"
    || value.actor_provenance !== "RETAINED_REVOKED"
    || value.retry_semantics !== "TERMINAL_SESSION_REVOCATION") {
    throw new ContractError("INVALID_ACCOUNT_DEIDENTIFICATION_OUTCOME", "account deidentification must disclose retained tenant records and provenance");
  }
  assertUuid(value.receipt_id, "account_deidentification.receipt_id");
  if (typeof value.receipt_hash !== "string" || !/^[a-f0-9]{64}$/u.test(value.receipt_hash)) {
    throw new ContractError("INVALID_ACCOUNT_DEIDENTIFICATION_HASH", "account deidentification receipt hash is invalid");
  }
  assertStringArray(value.membership_receipt_ids, "account_deidentification.membership_receipt_ids");
  value.membership_receipt_ids.forEach((receiptId) => assertUuid(receiptId, "account_deidentification.membership_receipt_id"));
  assertStringArray(value.retained_evidence_classes, "account_deidentification.retained_evidence_classes");
  assertIsoDate(value.occurred_at, "account_deidentification.occurred_at");
}
