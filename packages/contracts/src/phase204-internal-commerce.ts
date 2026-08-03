import {
  ContractError,
  assertIsoDate,
  assertNonEmptyString,
  assertRecord,
  assertSafeNonNegativeInteger,
  assertUuid
} from "./validation.js";

export const PHASE204_INTERNAL_COMMERCE_CONTRACT_VERSION = "1.0.0" as const;
export const PHASE204_INTERNAL_COMMERCE_SCHEMA_VERSION = 1 as const;
export const PHASE204_INTERNAL_BUSINESS_CODE = "SP-COMMERCE-001" as const;
export const PHASE204_INTERNAL_BUSINESS_WORKING_NAME = "Contractor Operations Products" as const;
export const PHASE204_SETUP_SPEND_LIMIT_CENTS = 15_000 as const;
export const PHASE204_ADVERTISING_BUDGET_CENTS = 0 as const;

export const PHASE204_INTERNAL_AUTHORITY = Object.freeze({
  marshal: Object.freeze({
    entity_id: "a50b1493-ffe1-5373-ad1b-96bb393a0c6f",
    stable_code: "M02",
    name: "Digital and Software Marshal"
  }),
  general: Object.freeze({
    entity_id: "9ce85809-e772-5a8f-be8d-34e01a9448a8",
    stable_code: "G-M02-07",
    name: "Digital Products General"
  })
} as const);

export const PHASE204_INTERNAL_CAPABILITY_SEQUENCE = [
  "IMPLEMENTED",
  "UNIT_VERIFIED",
  "INTEGRATION_VERIFIED",
  "CANARY_VERIFIED",
  "ACTIVE"
] as const;

export const PHASE204_PRODUCT_LINE = [
  {
    product_code: "LEAD_RESPONSE_ESTIMATE_FOLLOW_UP_KIT",
    name: "Lead Response and Estimate Follow-Up Kit",
    kind: "PRODUCT",
    price_cents: 2_900
  },
  {
    product_code: "SCOPE_CHANGE_ORDER_CONTROL_PACK",
    name: "Scope and Change-Order Control Pack",
    kind: "PRODUCT",
    price_cents: 4_900
  },
  {
    product_code: "BILLING_COLLECTIONS_ACCELERATOR",
    name: "Billing and Collections Accelerator",
    kind: "PRODUCT",
    price_cents: 4_900
  },
  {
    product_code: "WEEKLY_OWNER_COMMAND_DASHBOARD",
    name: "Weekly Owner Command Dashboard",
    kind: "PRODUCT",
    price_cents: 3_900
  },
  {
    product_code: "COMPLETE_CONTRACTOR_CONTROL_BUNDLE",
    name: "Complete Contractor Control Bundle",
    kind: "BUNDLE",
    price_cents: 11_900
  }
] as const;

export type Phase204ProductCode = (typeof PHASE204_PRODUCT_LINE)[number]["product_code"];
export type Phase204ProductKind = (typeof PHASE204_PRODUCT_LINE)[number]["kind"];

export const PHASE204_DELIVERY_ASSET_ROLES = [
  "EDITABLE_SOURCE",
  "FINAL_DELIVERY",
  "INSTRUCTIONS",
  "IMPLEMENTATION_GUIDANCE",
  "EXAMPLE",
  "TRACKING_TOOL",
  "VERSION_INFORMATION",
  "SUPPORT_INSTRUCTIONS",
  "LICENSE_TERMS"
] as const;
export type Phase204DeliveryAssetRole = (typeof PHASE204_DELIVERY_ASSET_ROLES)[number];

export const PHASE204_OPERATIONAL_METRICS = [
  "GROSS_SALES",
  "PLATFORM_FEES",
  "PAYMENT_PROCESSING_FEES",
  "REFUNDS",
  "NET_RECEIPTS",
  "CONTRIBUTION_MARGIN",
  "CONVERSION",
  "SUPPORT_VOLUME",
  "PRODUCT_PERFORMANCE"
] as const;
export type Phase204OperationalMetricCode = (typeof PHASE204_OPERATIONAL_METRICS)[number];

export const PHASE204_CONTROL_CODES = [
  "PAUSE_BUSINESS",
  "DISABLE_PUBLICATION",
  "KILL_BUSINESS"
] as const;
export type Phase204ControlCode = (typeof PHASE204_CONTROL_CODES)[number];

export type Phase204StorefrontProvider = "ETSY" | "GUMROAD";
export type Phase204MetricTruthState = "OBSERVED" | "UNAVAILABLE";

export interface Phase204InternalCapabilityActivation {
  readonly capability_id: string;
  readonly capability_version: string;
  readonly environment: "PRODUCTION";
  readonly scope: "TENANT";
  readonly tenant_id: string;
  readonly organization_id: string;
  readonly lifecycle_sequence: typeof PHASE204_INTERNAL_CAPABILITY_SEQUENCE;
  readonly final_lifecycle_state: "ACTIVE";
  readonly pricing_eligibility: "NOT_ELIGIBLE";
  readonly public_claim_eligible: false;
  readonly production_readiness: "REAL";
  readonly internal_use_only: true;
  readonly evidence_receipt_ids: readonly string[];
}

export interface Phase204BrandSelection {
  readonly public_brand_name: string;
  readonly selection_method: "MARKET_EVIDENCE_REVIEW";
  readonly candidate_count: number;
  readonly market_evidence_ids: readonly string[];
  readonly selected_by_actor_id: string;
  readonly selected_at: string;
  readonly is_placeholder: false;
}

export interface Phase204CanonicalBusinessActivation {
  readonly business_id: string;
  readonly internal_code: typeof PHASE204_INTERNAL_BUSINESS_CODE;
  readonly working_name: typeof PHASE204_INTERNAL_BUSINESS_WORKING_NAME;
  readonly brand: Phase204BrandSelection;
  readonly marshal: typeof PHASE204_INTERNAL_AUTHORITY.marshal;
  readonly general: typeof PHASE204_INTERNAL_AUTHORITY.general;
  readonly commander: {
    readonly entity_id: string;
    readonly stable_code: string;
    readonly display_name: string;
    readonly parent_entity_id: typeof PHASE204_INTERNAL_AUTHORITY.general.entity_id;
    readonly business_id: string;
  };
  readonly mission_ids: readonly string[];
  readonly soldier_entity_ids: readonly string[];
}

export interface Phase204DeliveryAsset {
  readonly asset_id: string;
  readonly product_code: Phase204ProductCode;
  readonly role: Phase204DeliveryAssetRole;
  readonly file_name: string;
  readonly media_type: string;
  readonly editable: boolean;
  readonly byte_size: number;
  readonly content_sha256: string;
  readonly version: string;
  readonly source_reference: string;
  readonly readiness: "FINAL";
  readonly license_status: "CLEARED";
}

export interface Phase204ProductClaim {
  readonly claim_id: string;
  readonly claim_text: string;
  readonly evidence_ids: readonly string[];
  readonly support_state: "EVIDENCE_VERIFIED";
}

export interface Phase204ProductReadinessGates {
  readonly originality: {
    readonly status: "PASSED";
    readonly original_work: true;
    readonly copied_content: false;
    readonly generic_prompt_collection: false;
    readonly evidence_ids: readonly string[];
    readonly checked_at: string;
  };
  readonly licensing: {
    readonly status: "PASSED";
    readonly unresolved_rights: false;
    readonly permitted_use_terms_asset_id: string;
    readonly evidence_ids: readonly string[];
    readonly checked_at: string;
  };
  readonly claims: {
    readonly status: "PASSED";
    readonly unsupported_claim_count: 0;
    readonly claims_sha256: string;
    readonly evidence_ids: readonly string[];
    readonly checked_at: string;
  };
  readonly ai_disclosure: {
    readonly status: "PASSED";
    readonly ai_assisted: boolean;
    readonly disclosure_included: true;
    readonly disclosure_text: string;
    readonly evidence_ids: readonly string[];
    readonly checked_at: string;
  };
  readonly file_integrity: {
    readonly status: "PASSED";
    readonly invalid_file_count: 0;
    readonly delivery_manifest_sha256: string;
    readonly evidence_ids: readonly string[];
    readonly checked_at: string;
  };
  readonly delivery_readiness: {
    readonly status: "PASSED";
    readonly missing_asset_roles: readonly [];
    readonly customer_delivery_tested: true;
    readonly support_ready: true;
    readonly evidence_ids: readonly string[];
    readonly checked_at: string;
  };
}

export interface Phase204InternalCommerceProduct {
  readonly product_id: string;
  readonly product_code: Phase204ProductCode;
  readonly name: (typeof PHASE204_PRODUCT_LINE)[number]["name"];
  readonly kind: Phase204ProductKind;
  readonly currency: "USD";
  readonly price_cents: (typeof PHASE204_PRODUCT_LINE)[number]["price_cents"];
  readonly version: string;
  readonly delivery_manifest_sha256: string;
  readonly claims_sha256: string;
  readonly component_product_codes: readonly Phase204ProductCode[];
  readonly assets: readonly Phase204DeliveryAsset[];
  readonly claims: readonly Phase204ProductClaim[];
  readonly gates: Phase204ProductReadinessGates;
  readonly contains_placeholder_content: false;
  readonly contains_unfinished_files: false;
  readonly contains_unresolved_licensing: false;
}

export type Phase204EtsyBlockerKind =
  | "ACCOUNT_CREATION"
  | "ADDRESS_VERIFICATION"
  | "BANKING_VERIFICATION"
  | "IDENTITY_VERIFICATION"
  | "PROVIDER_RESTRICTION";

export interface Phase204EtsyOnboarding {
  readonly status: "OWNER_ACTION_REQUIRED" | "READY" | "LIVE" | "BLOCKED";
  readonly blocker: {
    readonly blocker_kind: Phase204EtsyBlockerKind;
    readonly bounded_summary: string;
    readonly evidence_id: string;
    readonly observed_at: string;
  } | null;
}

export interface Phase204ProviderListing {
  readonly product_code: Phase204ProductCode;
  readonly provider_listing_id: string | null;
  readonly status: "DRAFT" | "READY_FOR_OWNER_APPROVAL" | "PUBLISHED" | "PAUSED" | "DISABLED";
  readonly price_cents: number;
  readonly delivery_manifest_sha256: string;
  readonly published_at: string | null;
  readonly provider_evidence_ids: readonly string[];
}

export interface Phase204StorefrontState {
  readonly selected_provider: Phase204StorefrontProvider;
  readonly etsy_onboarding: Phase204EtsyOnboarding;
  readonly storefront_id: string | null;
  readonly status:
    | "OWNER_ACTION_REQUIRED"
    | "READY_FOR_OWNER_APPROVAL"
    | "PUBLISHED"
    | "PAUSED"
    | "DISABLED";
  readonly provider_policy_checked_at: string;
  readonly provider_policy_evidence_ids: readonly string[];
  readonly listings: readonly Phase204ProviderListing[];
}

export interface Phase204OwnerPublicationProductApproval {
  readonly product_code: Phase204ProductCode;
  readonly price_cents: number;
  readonly delivery_manifest_sha256: string;
  readonly claims_sha256: string;
  readonly approved: true;
}

export interface Phase204OwnerPublicationApprovalEnvelope {
  readonly approval_id: string;
  readonly authority: "FIRST_EXTERNAL_PUBLICATION";
  readonly approved: true;
  readonly owner_actor_id: string;
  readonly approved_at: string;
  readonly selected_provider: Phase204StorefrontProvider;
  readonly storefront_id: string;
  readonly public_brand_name: string;
  readonly product_approvals: readonly Phase204OwnerPublicationProductApproval[];
  readonly setup_spend_limit_cents: number;
  readonly advertising_budget_cents: 0;
  readonly envelope_sha256: string;
  readonly revoked_at: null;
}

export interface Phase204OperationalMetric {
  readonly metric_id: string;
  readonly metric_code: Phase204OperationalMetricCode;
  readonly scope:
    | { readonly scope_type: "BUSINESS"; readonly scope_code: typeof PHASE204_INTERNAL_BUSINESS_CODE }
    | { readonly scope_type: "PRODUCT"; readonly scope_code: Phase204ProductCode };
  readonly truth_state: Phase204MetricTruthState;
  readonly value: number | null;
  readonly unit: "USD_CENTS" | "RATIO" | "COUNT" | "SCORE";
  readonly currency: "USD" | null;
  readonly provider_record_id: string | null;
  readonly source_type:
    | "PROVIDER_TRANSACTION"
    | "PROVIDER_FEE"
    | "PROVIDER_REFUND"
    | "PROVIDER_ANALYTICS"
    | "PROVIDER_MESSAGE"
    | "CANONICAL_CALCULATION"
    | null;
  readonly evidence_id: string | null;
  readonly observed_at: string | null;
  readonly unavailable_reason: string | null;
  readonly is_estimate: false;
}

export interface Phase204CommerceControl {
  readonly control_id: string;
  readonly control_code: Phase204ControlCode;
  readonly availability: "AVAILABLE";
  readonly state: "ARMED" | "ENGAGED";
  readonly requires_owner_approval: boolean;
  readonly last_action_id: string | null;
  readonly reason: string | null;
  readonly evidence_ids: readonly string[];
  readonly verified_at: string;
  readonly version: number;
}

export interface Phase204InternalCommerceActivationRequest {
  readonly record_type: "ACTIVATION_REQUEST";
  readonly contract_version: typeof PHASE204_INTERNAL_COMMERCE_CONTRACT_VERSION;
  readonly schema_version: typeof PHASE204_INTERNAL_COMMERCE_SCHEMA_VERSION;
  readonly request_id: string;
  readonly idempotency_key: string;
  readonly requested_at: string;
  readonly actor_id: string;
  readonly tenant_id: string;
  readonly organization_id: string;
  readonly business: Phase204CanonicalBusinessActivation;
  readonly capability_activations: readonly Phase204InternalCapabilityActivation[];
  readonly products: readonly Phase204InternalCommerceProduct[];
  readonly storefront: Phase204StorefrontState;
  readonly publication_approval: Phase204OwnerPublicationApprovalEnvelope | null;
  readonly budget: {
    readonly currency: "USD";
    readonly setup_spend_limit_cents: number;
    readonly setup_spend_committed_cents: number;
    readonly advertising_budget_cents: 0;
  };
  readonly operational_metrics: readonly Phase204OperationalMetric[];
  readonly controls: readonly Phase204CommerceControl[];
}

export const PHASE204_PUBLICATION_DECISION_REASONS = [
  "APPROVED_ENVELOPE",
  "OWNER_APPROVAL_REQUIRED",
  "PROVIDER_NOT_READY",
  "LISTINGS_NOT_READY",
  "APPROVAL_SCOPE_MISMATCH"
] as const;
export type Phase204PublicationDecisionReason = (typeof PHASE204_PUBLICATION_DECISION_REASONS)[number];

export interface Phase204PublicationDecision {
  readonly allowed: boolean;
  readonly reason_code: Phase204PublicationDecisionReason;
  readonly approval_id: string | null;
  readonly provider: Phase204StorefrontProvider;
  readonly evaluated_at: string;
}

export interface Phase204InternalCommerceActivationResult {
  readonly record_type: "ACTIVATION_RESULT";
  readonly contract_version: typeof PHASE204_INTERNAL_COMMERCE_CONTRACT_VERSION;
  readonly schema_version: typeof PHASE204_INTERNAL_COMMERCE_SCHEMA_VERSION;
  readonly result_id: string;
  readonly request_id: string;
  readonly status: "ACTIVATED" | "BLOCKED";
  readonly blocker: string | null;
  readonly business_id: string;
  readonly activated_capability_ids: readonly string[];
  readonly canonical_event_ids: readonly string[];
  readonly canonical_event_sequence: number;
  readonly business_record_version: number;
  readonly readback: {
    readonly businesses: true;
    readonly command: true;
    readonly business_full_record: true;
    readonly heart_2d: true;
    readonly heart_3d: true;
    readonly evidence_receipt_ids: readonly string[];
  };
  readonly storefront_status: Phase204StorefrontState["status"];
  readonly publication_decision: Phase204PublicationDecision;
  readonly completed_at: string;
}

export type Phase204InternalCommerceEnvelope =
  | Phase204InternalCommerceActivationRequest
  | Phase204InternalCommerceActivationResult;

const SHA256_RE = /^[0-9a-f]{64}$/;
const SEMVER_RE = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;
const REPOSITORY_REFERENCE_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[0-9a-f]{40}:.+$/;
const PRODUCT_SPECS = new Map(PHASE204_PRODUCT_LINE.map((product) => [product.product_code, product]));

function assertExactKeys(value: Record<string, unknown>, keys: readonly string[], field: string): void {
  const expected = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) throw new ContractError("UNKNOWN_PHASE204_FIELD", `${field}.${key} is not allowed`);
  }
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new ContractError("MISSING_PHASE204_FIELD", `${field}.${key} is required`);
    }
  }
}

function assertEnum<T extends string>(value: unknown, options: readonly T[], field: string): asserts value is T {
  if (typeof value !== "string" || !(options as readonly string[]).includes(value)) {
    throw new ContractError("INVALID_PHASE204_ENUM", `${field} is not canonical`);
  }
}

function assertBoolean(value: unknown, expected: boolean, field: string): void {
  if (value !== expected) throw new ContractError("INVALID_PHASE204_BOOLEAN", `${field} must be ${expected}`);
}

function assertSha256(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !SHA256_RE.test(value)) {
    throw new ContractError("INVALID_PHASE204_HASH", `${field} must be a lowercase SHA-256`);
  }
}

function assertSemanticVersion(value: unknown, field: string): asserts value is string {
  assertNonEmptyString(value, field, 80);
  if (!SEMVER_RE.test(value)) throw new ContractError("INVALID_PHASE204_VERSION", `${field} must be semantic version`);
}

function assertUuidArray(value: unknown, field: string, minimum = 1): asserts value is readonly string[] {
  if (!Array.isArray(value) || value.length < minimum) {
    throw new ContractError("INVALID_PHASE204_EVIDENCE", `${field} requires at least ${minimum} receipt(s)`);
  }
  value.forEach((id, index) => assertUuid(id, `${field}[${index}]`));
  if (new Set(value).size !== value.length) {
    throw new ContractError("DUPLICATE_PHASE204_VALUE", `${field} must not contain duplicates`);
  }
}

function assertPositiveInteger(value: unknown, field: string): asserts value is number {
  assertSafeNonNegativeInteger(value, field);
  if (value < 1) throw new ContractError("INVALID_PHASE204_INTEGER", `${field} must be positive`);
}

function assertExactVersion(value: Record<string, unknown>, field: string): void {
  if (
    value.contract_version !== PHASE204_INTERNAL_COMMERCE_CONTRACT_VERSION
    || value.schema_version !== PHASE204_INTERNAL_COMMERCE_SCHEMA_VERSION
  ) {
    throw new ContractError("INVALID_PHASE204_VERSION", `${field} must use the released Phase 204 contract`);
  }
}

function assertCapabilityActivation(value: unknown, tenantId: string, organizationId: string, index: number): void {
  assertRecord(value, `capability_activations[${index}]`);
  assertExactKeys(value, [
    "capability_id", "capability_version", "environment", "scope", "tenant_id", "organization_id",
    "lifecycle_sequence", "final_lifecycle_state", "pricing_eligibility", "public_claim_eligible",
    "production_readiness", "internal_use_only", "evidence_receipt_ids"
  ], `capability_activations[${index}]`);
  assertUuid(value.capability_id, `capability_activations[${index}].capability_id`);
  assertSemanticVersion(value.capability_version, `capability_activations[${index}].capability_version`);
  if (
    value.environment !== "PRODUCTION"
    || value.scope !== "TENANT"
    || value.tenant_id !== tenantId
    || value.organization_id !== organizationId
    || value.final_lifecycle_state !== "ACTIVE"
    || value.pricing_eligibility !== "NOT_ELIGIBLE"
    || value.public_claim_eligible !== false
    || value.production_readiness !== "REAL"
    || value.internal_use_only !== true
  ) {
    throw new ContractError(
      "INVALID_INTERNAL_CAPABILITY_ACTIVATION",
      "Internal commerce capabilities must be real, tenant-scoped ACTIVE production capabilities and must not be SELLABLE"
    );
  }
  if (
    !Array.isArray(value.lifecycle_sequence)
    || value.lifecycle_sequence.length !== PHASE204_INTERNAL_CAPABILITY_SEQUENCE.length
    || value.lifecycle_sequence.some((state, sequenceIndex) => state !== PHASE204_INTERNAL_CAPABILITY_SEQUENCE[sequenceIndex])
  ) {
    throw new ContractError("INVALID_CAPABILITY_SEQUENCE", "Capability activation must preserve every verified lifecycle step");
  }
  assertUuidArray(value.evidence_receipt_ids, `capability_activations[${index}].evidence_receipt_ids`, 4);
}

function assertBrandSelection(value: unknown): void {
  assertRecord(value, "business.brand");
  assertExactKeys(value, [
    "public_brand_name", "selection_method", "candidate_count", "market_evidence_ids",
    "selected_by_actor_id", "selected_at", "is_placeholder"
  ], "business.brand");
  assertNonEmptyString(value.public_brand_name, "business.brand.public_brand_name", 120);
  if (value.public_brand_name.trim().toLocaleLowerCase() === PHASE204_INTERNAL_BUSINESS_WORKING_NAME.toLocaleLowerCase()) {
    throw new ContractError("PLACEHOLDER_PUBLIC_BRAND", "The internal working name cannot be published as the public brand");
  }
  if (value.selection_method !== "MARKET_EVIDENCE_REVIEW" || value.is_placeholder !== false) {
    throw new ContractError("UNVERIFIED_PUBLIC_BRAND", "The public brand must be selected from market evidence and cannot be a placeholder");
  }
  assertSafeNonNegativeInteger(value.candidate_count, "business.brand.candidate_count");
  if (value.candidate_count < 2) throw new ContractError("UNVERIFIED_PUBLIC_BRAND", "Brand selection requires at least two market candidates");
  assertUuidArray(value.market_evidence_ids, "business.brand.market_evidence_ids");
  assertUuid(value.selected_by_actor_id, "business.brand.selected_by_actor_id");
  assertIsoDate(value.selected_at, "business.brand.selected_at");
}

function assertAuthorityRecord(value: unknown, expected: typeof PHASE204_INTERNAL_AUTHORITY.marshal, field: string): void;
function assertAuthorityRecord(value: unknown, expected: typeof PHASE204_INTERNAL_AUTHORITY.general, field: string): void;
function assertAuthorityRecord(
  value: unknown,
  expected: typeof PHASE204_INTERNAL_AUTHORITY.marshal | typeof PHASE204_INTERNAL_AUTHORITY.general,
  field: string
): void {
  assertRecord(value, field);
  assertExactKeys(value, ["entity_id", "stable_code", "name"], field);
  if (
    value.entity_id !== expected.entity_id
    || value.stable_code !== expected.stable_code
    || value.name !== expected.name
  ) {
    throw new ContractError("INVALID_PHASE204_AUTHORITY", `${field} must reference the released canonical authority`);
  }
}

function assertBusiness(value: unknown): asserts value is Phase204CanonicalBusinessActivation {
  assertRecord(value, "business");
  assertExactKeys(value, [
    "business_id", "internal_code", "working_name", "brand", "marshal", "general", "commander",
    "mission_ids", "soldier_entity_ids"
  ], "business");
  assertUuid(value.business_id, "business.business_id");
  if (value.internal_code !== PHASE204_INTERNAL_BUSINESS_CODE || value.working_name !== PHASE204_INTERNAL_BUSINESS_WORKING_NAME) {
    throw new ContractError("INVALID_PHASE204_BUSINESS", "The activation must target the exact Phase 204 internal business");
  }
  assertBrandSelection(value.brand);
  assertAuthorityRecord(value.marshal, PHASE204_INTERNAL_AUTHORITY.marshal, "business.marshal");
  assertAuthorityRecord(value.general, PHASE204_INTERNAL_AUTHORITY.general, "business.general");
  assertRecord(value.commander, "business.commander");
  assertExactKeys(value.commander, [
    "entity_id", "stable_code", "display_name", "parent_entity_id", "business_id"
  ], "business.commander");
  assertUuid(value.commander.entity_id, "business.commander.entity_id");
  assertNonEmptyString(value.commander.stable_code, "business.commander.stable_code", 120);
  assertNonEmptyString(value.commander.display_name, "business.commander.display_name", 200);
  if (
    value.commander.parent_entity_id !== PHASE204_INTERNAL_AUTHORITY.general.entity_id
    || value.commander.business_id !== value.business_id
  ) {
    throw new ContractError("INVALID_PHASE204_COMMANDER", "The business Commander must belong to SP-COMMERCE-001 beneath Digital Products General");
  }
  assertUuidArray(value.mission_ids, "business.mission_ids");
  assertUuidArray(value.soldier_entity_ids, "business.soldier_entity_ids");
  if (value.soldier_entity_ids.includes(value.commander.entity_id)) {
    throw new ContractError("INVALID_PHASE204_COMMANDER", "The Commander cannot also be a Soldier");
  }
}

function assertDeliveryAsset(value: unknown, productCode: Phase204ProductCode, index: number): void {
  const field = `product.assets[${index}]`;
  assertRecord(value, field);
  assertExactKeys(value, [
    "asset_id", "product_code", "role", "file_name", "media_type", "editable", "byte_size", "content_sha256",
    "version", "source_reference", "readiness", "license_status"
  ], field);
  assertUuid(value.asset_id, `${field}.asset_id`);
  if (value.product_code !== productCode) throw new ContractError("PRODUCT_ASSET_MISMATCH", `${field} belongs to another product`);
  assertEnum(value.role, PHASE204_DELIVERY_ASSET_ROLES, `${field}.role`);
  assertNonEmptyString(value.file_name, `${field}.file_name`, 255);
  if (/[/\\\0]/.test(value.file_name) || value.file_name === "." || value.file_name === "..") {
    throw new ContractError("INVALID_DELIVERY_FILE", `${field}.file_name must be a bounded file name`);
  }
  assertNonEmptyString(value.media_type, `${field}.media_type`, 160);
  if (typeof value.editable !== "boolean") throw new ContractError("INVALID_DELIVERY_FILE", `${field}.editable must be boolean`);
  if (value.role === "EDITABLE_SOURCE" && value.editable !== true) {
    throw new ContractError("NON_EDITABLE_SOURCE", "Editable source assets must remain editable");
  }
  assertPositiveInteger(value.byte_size, `${field}.byte_size`);
  assertSha256(value.content_sha256, `${field}.content_sha256`);
  assertSemanticVersion(value.version, `${field}.version`);
  assertNonEmptyString(value.source_reference, `${field}.source_reference`, 2_000);
  if (!REPOSITORY_REFERENCE_RE.test(value.source_reference)) {
    throw new ContractError("MACHINE_LOCAL_ASSET_REFERENCE", `${field}.source_reference must use repository@commit:path evidence`);
  }
  if (value.readiness !== "FINAL" || value.license_status !== "CLEARED") {
    throw new ContractError("UNREADY_DELIVERY_FILE", `${field} must be final and license-cleared`);
  }
}

function assertGateEvidence(value: unknown, field: string): void {
  assertUuidArray(value, field);
}

function assertProductGates(value: unknown, product: Record<string, unknown>, assets: readonly Record<string, unknown>[]): void {
  assertRecord(value, "product.gates");
  assertExactKeys(value, [
    "originality", "licensing", "claims", "ai_disclosure", "file_integrity", "delivery_readiness"
  ], "product.gates");

  assertRecord(value.originality, "product.gates.originality");
  assertExactKeys(value.originality, [
    "status", "original_work", "copied_content", "generic_prompt_collection", "evidence_ids", "checked_at"
  ], "product.gates.originality");
  if (
    value.originality.status !== "PASSED"
    || value.originality.original_work !== true
    || value.originality.copied_content !== false
    || value.originality.generic_prompt_collection !== false
  ) throw new ContractError("ORIGINALITY_GATE_FAILED", "Every product must pass its original-work gate");
  assertGateEvidence(value.originality.evidence_ids, "product.gates.originality.evidence_ids");
  assertIsoDate(value.originality.checked_at, "product.gates.originality.checked_at");

  assertRecord(value.licensing, "product.gates.licensing");
  const licensing = value.licensing;
  assertExactKeys(licensing, [
    "status", "unresolved_rights", "permitted_use_terms_asset_id", "evidence_ids", "checked_at"
  ], "product.gates.licensing");
  if (licensing.status !== "PASSED" || licensing.unresolved_rights !== false) {
    throw new ContractError("LICENSING_GATE_FAILED", "Every product must have resolved licensing");
  }
  assertUuid(licensing.permitted_use_terms_asset_id, "product.gates.licensing.permitted_use_terms_asset_id");
  const licenseAsset = assets.find((asset) => asset.asset_id === licensing.permitted_use_terms_asset_id);
  if (licenseAsset?.role !== "LICENSE_TERMS") {
    throw new ContractError("LICENSE_ASSET_MISMATCH", "The licensing gate must bind the product's license terms asset");
  }
  assertGateEvidence(licensing.evidence_ids, "product.gates.licensing.evidence_ids");
  assertIsoDate(licensing.checked_at, "product.gates.licensing.checked_at");

  assertRecord(value.claims, "product.gates.claims");
  assertExactKeys(value.claims, [
    "status", "unsupported_claim_count", "claims_sha256", "evidence_ids", "checked_at"
  ], "product.gates.claims");
  if (value.claims.status !== "PASSED" || value.claims.unsupported_claim_count !== 0) {
    throw new ContractError("CLAIMS_GATE_FAILED", "Unsupported product claims fail closed");
  }
  assertSha256(value.claims.claims_sha256, "product.gates.claims.claims_sha256");
  if (value.claims.claims_sha256 !== product.claims_sha256) {
    throw new ContractError("CLAIMS_HASH_MISMATCH", "Product claims must bind the passed claims gate");
  }
  assertGateEvidence(value.claims.evidence_ids, "product.gates.claims.evidence_ids");
  assertIsoDate(value.claims.checked_at, "product.gates.claims.checked_at");

  assertRecord(value.ai_disclosure, "product.gates.ai_disclosure");
  assertExactKeys(value.ai_disclosure, [
    "status", "ai_assisted", "disclosure_included", "disclosure_text", "evidence_ids", "checked_at"
  ], "product.gates.ai_disclosure");
  if (
    value.ai_disclosure.status !== "PASSED"
    || typeof value.ai_disclosure.ai_assisted !== "boolean"
    || value.ai_disclosure.disclosure_included !== true
  ) throw new ContractError("AI_DISCLOSURE_GATE_FAILED", "Every product requires a completed AI disclosure gate");
  assertNonEmptyString(value.ai_disclosure.disclosure_text, "product.gates.ai_disclosure.disclosure_text", 2_000);
  assertGateEvidence(value.ai_disclosure.evidence_ids, "product.gates.ai_disclosure.evidence_ids");
  assertIsoDate(value.ai_disclosure.checked_at, "product.gates.ai_disclosure.checked_at");

  assertRecord(value.file_integrity, "product.gates.file_integrity");
  assertExactKeys(value.file_integrity, [
    "status", "invalid_file_count", "delivery_manifest_sha256", "evidence_ids", "checked_at"
  ], "product.gates.file_integrity");
  if (value.file_integrity.status !== "PASSED" || value.file_integrity.invalid_file_count !== 0) {
    throw new ContractError("FILE_INTEGRITY_GATE_FAILED", "Every delivery file must pass integrity verification");
  }
  assertSha256(value.file_integrity.delivery_manifest_sha256, "product.gates.file_integrity.delivery_manifest_sha256");
  if (value.file_integrity.delivery_manifest_sha256 !== product.delivery_manifest_sha256) {
    throw new ContractError("DELIVERY_HASH_MISMATCH", "Product assets must bind the passed delivery manifest");
  }
  assertGateEvidence(value.file_integrity.evidence_ids, "product.gates.file_integrity.evidence_ids");
  assertIsoDate(value.file_integrity.checked_at, "product.gates.file_integrity.checked_at");

  assertRecord(value.delivery_readiness, "product.gates.delivery_readiness");
  assertExactKeys(value.delivery_readiness, [
    "status", "missing_asset_roles", "customer_delivery_tested", "support_ready", "evidence_ids", "checked_at"
  ], "product.gates.delivery_readiness");
  if (
    value.delivery_readiness.status !== "PASSED"
    || !Array.isArray(value.delivery_readiness.missing_asset_roles)
    || value.delivery_readiness.missing_asset_roles.length !== 0
    || value.delivery_readiness.customer_delivery_tested !== true
    || value.delivery_readiness.support_ready !== true
  ) throw new ContractError("DELIVERY_READINESS_GATE_FAILED", "Products with missing or untested delivery fail closed");
  assertGateEvidence(value.delivery_readiness.evidence_ids, "product.gates.delivery_readiness.evidence_ids");
  assertIsoDate(value.delivery_readiness.checked_at, "product.gates.delivery_readiness.checked_at");
}

function assertProduct(value: unknown, index: number): asserts value is Phase204InternalCommerceProduct {
  const field = `products[${index}]`;
  assertRecord(value, field);
  assertExactKeys(value, [
    "product_id", "product_code", "name", "kind", "currency", "price_cents", "version",
    "delivery_manifest_sha256", "claims_sha256", "component_product_codes", "assets", "claims", "gates",
    "contains_placeholder_content", "contains_unfinished_files", "contains_unresolved_licensing"
  ], field);
  assertUuid(value.product_id, `${field}.product_id`);
  assertEnum(value.product_code, PHASE204_PRODUCT_LINE.map((product) => product.product_code), `${field}.product_code`);
  const productCode = value.product_code;
  const spec = PRODUCT_SPECS.get(productCode);
  if (
    !spec
    || value.name !== spec.name
    || value.kind !== spec.kind
    || value.currency !== "USD"
    || value.price_cents !== spec.price_cents
  ) throw new ContractError("INVALID_PHASE204_PRODUCT_LINE", `${field} must preserve the owner-approved product and price`);
  assertSemanticVersion(value.version, `${field}.version`);
  assertSha256(value.delivery_manifest_sha256, `${field}.delivery_manifest_sha256`);
  assertSha256(value.claims_sha256, `${field}.claims_sha256`);
  if (!Array.isArray(value.component_product_codes)) {
    throw new ContractError("INVALID_BUNDLE_COMPONENTS", `${field}.component_product_codes must be an array`);
  }
  const declaredComponents = value.component_product_codes as unknown[];
  const componentCodes = PHASE204_PRODUCT_LINE.filter((product) => product.kind === "PRODUCT").map((product) => product.product_code);
  if (value.kind === "BUNDLE") {
    if (
      declaredComponents.length !== componentCodes.length
      || componentCodes.some((code) => !declaredComponents.includes(code))
    ) throw new ContractError("INVALID_BUNDLE_COMPONENTS", "The complete bundle must contain the four released products exactly once");
  } else if (declaredComponents.length !== 0) {
    throw new ContractError("INVALID_BUNDLE_COMPONENTS", "Individual products cannot claim bundle components");
  }
  if (!Array.isArray(value.assets)) throw new ContractError("INVALID_DELIVERY_MANIFEST", `${field}.assets must be an array`);
  value.assets.forEach((asset, assetIndex) => assertDeliveryAsset(asset, productCode, assetIndex));
  const assets = value.assets as readonly Record<string, unknown>[];
  for (const role of PHASE204_DELIVERY_ASSET_ROLES) {
    if (!assets.some((asset) => asset.role === role)) {
      throw new ContractError("INCOMPLETE_DELIVERY_MANIFEST", `${field} is missing ${role}`);
    }
  }
  const assetIds = assets.map((asset) => String(asset.asset_id));
  if (new Set(assetIds).size !== assetIds.length) throw new ContractError("DUPLICATE_PHASE204_VALUE", `${field}.assets contains duplicate IDs`);
  if (!Array.isArray(value.claims) || value.claims.length === 0) {
    throw new ContractError("MISSING_PRODUCT_CLAIMS", `${field}.claims requires at least one evidence-backed claim`);
  }
  value.claims.forEach((claim, claimIndex) => {
    assertRecord(claim, `${field}.claims[${claimIndex}]`);
    assertExactKeys(claim, ["claim_id", "claim_text", "evidence_ids", "support_state"], `${field}.claims[${claimIndex}]`);
    assertUuid(claim.claim_id, `${field}.claims[${claimIndex}].claim_id`);
    assertNonEmptyString(claim.claim_text, `${field}.claims[${claimIndex}].claim_text`, 1_000);
    assertUuidArray(claim.evidence_ids, `${field}.claims[${claimIndex}].evidence_ids`);
    if (claim.support_state !== "EVIDENCE_VERIFIED") throw new ContractError("UNSUPPORTED_PRODUCT_CLAIM", "Product claims require verified evidence");
  });
  assertProductGates(value.gates, value, assets);
  assertBoolean(value.contains_placeholder_content, false, `${field}.contains_placeholder_content`);
  assertBoolean(value.contains_unfinished_files, false, `${field}.contains_unfinished_files`);
  assertBoolean(value.contains_unresolved_licensing, false, `${field}.contains_unresolved_licensing`);
}

function assertExactProductSet(products: readonly Phase204InternalCommerceProduct[]): void {
  if (products.length !== PHASE204_PRODUCT_LINE.length) {
    throw new ContractError("INCOMPLETE_PHASE204_PRODUCT_LINE", "Phase 204 requires exactly four products and one bundle");
  }
  const codes = products.map((product) => product.product_code);
  if (new Set(codes).size !== codes.length || PHASE204_PRODUCT_LINE.some((spec) => !codes.includes(spec.product_code))) {
    throw new ContractError("INCOMPLETE_PHASE204_PRODUCT_LINE", "The exact Phase 204 product line is required");
  }
}

function assertStorefront(value: unknown, products: readonly Phase204InternalCommerceProduct[]): asserts value is Phase204StorefrontState {
  assertRecord(value, "storefront");
  assertExactKeys(value, [
    "selected_provider", "etsy_onboarding", "storefront_id", "status", "provider_policy_checked_at",
    "provider_policy_evidence_ids", "listings"
  ], "storefront");
  assertEnum(value.selected_provider, ["ETSY", "GUMROAD"], "storefront.selected_provider");
  assertRecord(value.etsy_onboarding, "storefront.etsy_onboarding");
  assertExactKeys(value.etsy_onboarding, ["status", "blocker"], "storefront.etsy_onboarding");
  assertEnum(value.etsy_onboarding.status, ["OWNER_ACTION_REQUIRED", "READY", "LIVE", "BLOCKED"], "storefront.etsy_onboarding.status");
  if (value.etsy_onboarding.status === "BLOCKED") {
    assertRecord(value.etsy_onboarding.blocker, "storefront.etsy_onboarding.blocker");
    assertExactKeys(value.etsy_onboarding.blocker, [
      "blocker_kind", "bounded_summary", "evidence_id", "observed_at"
    ], "storefront.etsy_onboarding.blocker");
    assertEnum(value.etsy_onboarding.blocker.blocker_kind, [
      "ACCOUNT_CREATION", "ADDRESS_VERIFICATION", "BANKING_VERIFICATION", "IDENTITY_VERIFICATION", "PROVIDER_RESTRICTION"
    ], "storefront.etsy_onboarding.blocker.blocker_kind");
    assertNonEmptyString(value.etsy_onboarding.blocker.bounded_summary, "storefront.etsy_onboarding.blocker.bounded_summary", 1_000);
    assertUuid(value.etsy_onboarding.blocker.evidence_id, "storefront.etsy_onboarding.blocker.evidence_id");
    assertIsoDate(value.etsy_onboarding.blocker.observed_at, "storefront.etsy_onboarding.blocker.observed_at");
  } else if (value.etsy_onboarding.blocker !== null) {
    throw new ContractError("INVALID_ETSY_BLOCKER", "Etsy blocker evidence is allowed only when Etsy is actually blocked");
  }
  if (value.selected_provider === "GUMROAD" && value.etsy_onboarding.status !== "BLOCKED") {
    throw new ContractError("ETSY_FIRST_REQUIRED", "Gumroad is allowed only after a bounded Etsy onboarding blocker");
  }
  if (value.selected_provider === "ETSY" && value.etsy_onboarding.status === "BLOCKED") {
    throw new ContractError("BLOCKED_PROVIDER_SELECTED", "A blocked Etsy storefront cannot remain the selected provider");
  }
  if (value.storefront_id !== null) assertNonEmptyString(value.storefront_id, "storefront.storefront_id", 300);
  assertEnum(value.status, [
    "OWNER_ACTION_REQUIRED", "READY_FOR_OWNER_APPROVAL", "PUBLISHED", "PAUSED", "DISABLED"
  ], "storefront.status");
  if (value.status !== "OWNER_ACTION_REQUIRED" && value.storefront_id === null) {
    throw new ContractError("MISSING_STOREFRONT_ID", "Configured storefront states require a provider storefront ID");
  }
  assertIsoDate(value.provider_policy_checked_at, "storefront.provider_policy_checked_at");
  assertUuidArray(value.provider_policy_evidence_ids, "storefront.provider_policy_evidence_ids");
  if (!Array.isArray(value.listings) || value.listings.length !== products.length) {
    throw new ContractError("INCOMPLETE_PROVIDER_LISTINGS", "Storefront state must cover every released product");
  }
  const listingCodes: string[] = [];
  value.listings.forEach((listing, index) => {
    assertRecord(listing, `storefront.listings[${index}]`);
    assertExactKeys(listing, [
      "product_code", "provider_listing_id", "status", "price_cents", "delivery_manifest_sha256",
      "published_at", "provider_evidence_ids"
    ], `storefront.listings[${index}]`);
    assertEnum(listing.product_code, PHASE204_PRODUCT_LINE.map((product) => product.product_code), `storefront.listings[${index}].product_code`);
    const product = products.find((candidate) => candidate.product_code === listing.product_code);
    if (!product || listing.price_cents !== product.price_cents || listing.delivery_manifest_sha256 !== product.delivery_manifest_sha256) {
      throw new ContractError("PROVIDER_LISTING_MISMATCH", "Provider listing must bind the exact product price and delivery manifest");
    }
    if (listing.provider_listing_id !== null) assertNonEmptyString(listing.provider_listing_id, `storefront.listings[${index}].provider_listing_id`, 300);
    assertEnum(listing.status, ["DRAFT", "READY_FOR_OWNER_APPROVAL", "PUBLISHED", "PAUSED", "DISABLED"], `storefront.listings[${index}].status`);
    if (listing.status === "PUBLISHED") {
      if (listing.provider_listing_id === null || listing.published_at === null) {
        throw new ContractError("UNVERIFIED_PROVIDER_PUBLICATION", "Published listings require provider ID and publication time");
      }
      assertUuidArray(listing.provider_evidence_ids, `storefront.listings[${index}].provider_evidence_ids`);
    } else {
      if (listing.published_at !== null) throw new ContractError("INVALID_PUBLICATION_TIME", "Only published listings may carry published_at");
      if (!Array.isArray(listing.provider_evidence_ids)) throw new ContractError("INVALID_PHASE204_EVIDENCE", "provider_evidence_ids must be an array");
      listing.provider_evidence_ids.forEach((id, evidenceIndex) => assertUuid(id, `storefront.listings[${index}].provider_evidence_ids[${evidenceIndex}]`));
    }
    if (listing.published_at !== null) assertIsoDate(listing.published_at, `storefront.listings[${index}].published_at`);
    listingCodes.push(listing.product_code);
  });
  if (new Set(listingCodes).size !== products.length) {
    throw new ContractError("INCOMPLETE_PROVIDER_LISTINGS", "Provider listing product codes must be unique");
  }
  if (value.status === "PUBLISHED" && value.listings.some((listing) => listing.status !== "PUBLISHED")) {
    throw new ContractError("PARTIAL_STOREFRONT_PUBLICATION", "A published storefront requires all five approved listings to be published");
  }
}

function assertPublicationApproval(
  value: unknown,
  request: Pick<Phase204InternalCommerceActivationRequest, "business" | "products" | "storefront">
): asserts value is Phase204OwnerPublicationApprovalEnvelope {
  assertRecord(value, "publication_approval");
  assertExactKeys(value, [
    "approval_id", "authority", "approved", "owner_actor_id", "approved_at", "selected_provider", "storefront_id",
    "public_brand_name", "product_approvals", "setup_spend_limit_cents", "advertising_budget_cents",
    "envelope_sha256", "revoked_at"
  ], "publication_approval");
  assertUuid(value.approval_id, "publication_approval.approval_id");
  if (value.authority !== "FIRST_EXTERNAL_PUBLICATION" || value.approved !== true || value.revoked_at !== null) {
    throw new ContractError("INVALID_OWNER_PUBLICATION_APPROVAL", "First publication requires an active affirmative owner approval");
  }
  assertUuid(value.owner_actor_id, "publication_approval.owner_actor_id");
  assertIsoDate(value.approved_at, "publication_approval.approved_at");
  if (
    value.selected_provider !== request.storefront.selected_provider
    || value.storefront_id !== request.storefront.storefront_id
    || value.public_brand_name !== request.business.brand.public_brand_name
  ) throw new ContractError("APPROVAL_SCOPE_MISMATCH", "Owner approval must bind the exact store and market-selected brand");
  if (request.storefront.storefront_id === null) throw new ContractError("APPROVAL_SCOPE_MISMATCH", "Owner approval cannot target an unconfigured storefront");
  assertNonEmptyString(value.storefront_id, "publication_approval.storefront_id", 300);
  if (!Array.isArray(value.product_approvals) || value.product_approvals.length !== request.products.length) {
    throw new ContractError("APPROVAL_SCOPE_MISMATCH", "Owner approval must bind every product");
  }
  const approvedCodes: string[] = [];
  value.product_approvals.forEach((approval, index) => {
    assertRecord(approval, `publication_approval.product_approvals[${index}]`);
    assertExactKeys(approval, [
      "product_code", "price_cents", "delivery_manifest_sha256", "claims_sha256", "approved"
    ], `publication_approval.product_approvals[${index}]`);
    assertEnum(approval.product_code, PHASE204_PRODUCT_LINE.map((product) => product.product_code), `publication_approval.product_approvals[${index}].product_code`);
    const product = request.products.find((candidate) => candidate.product_code === approval.product_code);
    if (
      !product
      || approval.approved !== true
      || approval.price_cents !== product.price_cents
      || approval.delivery_manifest_sha256 !== product.delivery_manifest_sha256
      || approval.claims_sha256 !== product.claims_sha256
    ) throw new ContractError("APPROVAL_SCOPE_MISMATCH", "Product approval must bind exact price, files, and claims");
    approvedCodes.push(approval.product_code);
  });
  if (new Set(approvedCodes).size !== request.products.length) {
    throw new ContractError("APPROVAL_SCOPE_MISMATCH", "Product approvals must be unique");
  }
  assertSafeNonNegativeInteger(value.setup_spend_limit_cents, "publication_approval.setup_spend_limit_cents");
  if (value.setup_spend_limit_cents > PHASE204_SETUP_SPEND_LIMIT_CENTS || value.advertising_budget_cents !== 0) {
    throw new ContractError("PUBLICATION_BUDGET_EXCEEDED", "Owner approval cannot exceed $150 setup or authorize advertising spend");
  }
  assertSha256(value.envelope_sha256, "publication_approval.envelope_sha256");
}

function expectedMetricKeys(): readonly string[] {
  return [
    ...PHASE204_OPERATIONAL_METRICS.map((metric) => `BUSINESS:${PHASE204_INTERNAL_BUSINESS_CODE}:${metric}`),
    ...PHASE204_PRODUCT_LINE.flatMap((product) => PHASE204_OPERATIONAL_METRICS.map(
      (metric) => `PRODUCT:${product.product_code}:${metric}`
    ))
  ];
}

function assertOperationalMetrics(value: unknown): asserts value is readonly Phase204OperationalMetric[] {
  if (!Array.isArray(value)) throw new ContractError("INVALID_OPERATIONAL_METRICS", "operational_metrics must be an array");
  const keys: string[] = [];
  value.forEach((metric, index) => {
    const field = `operational_metrics[${index}]`;
    assertRecord(metric, field);
    assertExactKeys(metric, [
      "metric_id", "metric_code", "scope", "truth_state", "value", "unit", "currency", "provider_record_id",
      "source_type", "evidence_id", "observed_at", "unavailable_reason", "is_estimate"
    ], field);
    assertUuid(metric.metric_id, `${field}.metric_id`);
    assertEnum(metric.metric_code, PHASE204_OPERATIONAL_METRICS, `${field}.metric_code`);
    assertRecord(metric.scope, `${field}.scope`);
    assertExactKeys(metric.scope, ["scope_type", "scope_code"], `${field}.scope`);
    if (metric.scope.scope_type === "BUSINESS") {
      if (metric.scope.scope_code !== PHASE204_INTERNAL_BUSINESS_CODE) {
        throw new ContractError("INVALID_METRIC_SCOPE", "Business metrics must bind SP-COMMERCE-001");
      }
    } else if (metric.scope.scope_type === "PRODUCT") {
      assertEnum(metric.scope.scope_code, PHASE204_PRODUCT_LINE.map((product) => product.product_code), `${field}.scope.scope_code`);
    } else throw new ContractError("INVALID_METRIC_SCOPE", `${field}.scope.scope_type is invalid`);
    assertEnum(metric.truth_state, ["OBSERVED", "UNAVAILABLE"], `${field}.truth_state`);
    assertEnum(metric.unit, ["USD_CENTS", "RATIO", "COUNT", "SCORE"], `${field}.unit`);
    if (metric.is_estimate !== false) throw new ContractError("ESTIMATED_PRODUCTION_TRUTH", "Estimated values cannot be recorded as production commerce truth");
    const moneyMetric = [
      "GROSS_SALES", "PLATFORM_FEES", "PAYMENT_PROCESSING_FEES", "REFUNDS", "NET_RECEIPTS", "CONTRIBUTION_MARGIN"
    ].includes(metric.metric_code);
    if ((moneyMetric && (metric.unit !== "USD_CENTS" || metric.currency !== "USD")) || (!moneyMetric && metric.currency !== null)) {
      throw new ContractError("INVALID_METRIC_UNIT", `${field} has an invalid unit or currency`);
    }
    const expectedNonMoneyUnits: Readonly<Record<string, string>> = {
      CONVERSION: "RATIO",
      SUPPORT_VOLUME: "COUNT",
      PRODUCT_PERFORMANCE: "SCORE"
    };
    if (!moneyMetric && metric.unit !== expectedNonMoneyUnits[metric.metric_code as string]) {
      throw new ContractError("INVALID_METRIC_UNIT", `${field} has an invalid unit for ${metric.metric_code}`);
    }
    if (metric.truth_state === "OBSERVED") {
      if (typeof metric.value !== "number" || !Number.isFinite(metric.value)) {
        throw new ContractError("INVALID_OBSERVED_METRIC", `${field}.value must be a finite observed value`);
      }
      if (
        metric.metric_code !== "NET_RECEIPTS"
        && metric.metric_code !== "CONTRIBUTION_MARGIN"
        && metric.value < 0
      ) throw new ContractError("INVALID_OBSERVED_METRIC", `${field}.value cannot be negative`);
      if (metric.metric_code === "CONVERSION" && (metric.value < 0 || metric.value > 1)) {
        throw new ContractError("INVALID_OBSERVED_METRIC", "Conversion must be a ratio between zero and one");
      }
      assertNonEmptyString(metric.provider_record_id, `${field}.provider_record_id`, 300);
      assertEnum(metric.source_type, [
        "PROVIDER_TRANSACTION", "PROVIDER_FEE", "PROVIDER_REFUND", "PROVIDER_ANALYTICS",
        "PROVIDER_MESSAGE", "CANONICAL_CALCULATION"
      ], `${field}.source_type`);
      assertUuid(metric.evidence_id, `${field}.evidence_id`);
      assertIsoDate(metric.observed_at, `${field}.observed_at`);
      if (metric.unavailable_reason !== null) throw new ContractError("CONFLICTING_METRIC_TRUTH", "Observed metrics cannot also be unavailable");
    } else {
      if (
        metric.value !== null
        || metric.provider_record_id !== null
        || metric.source_type !== null
        || metric.evidence_id !== null
        || metric.observed_at !== null
      ) throw new ContractError("FABRICATED_UNAVAILABLE_METRIC", "Unavailable metrics cannot carry values or production source claims");
      assertNonEmptyString(metric.unavailable_reason, `${field}.unavailable_reason`, 1_000);
    }
    keys.push(`${metric.scope.scope_type}:${metric.scope.scope_code}:${metric.metric_code}`);
  });
  const expected = expectedMetricKeys();
  if (keys.length !== expected.length || new Set(keys).size !== keys.length || expected.some((key) => !keys.includes(key))) {
    throw new ContractError("INCOMPLETE_OPERATIONAL_METRICS", "Business and every product require a complete unavailable-or-observed metric matrix");
  }
}

function assertControls(value: unknown): asserts value is readonly Phase204CommerceControl[] {
  if (!Array.isArray(value) || value.length !== PHASE204_CONTROL_CODES.length) {
    throw new ContractError("INCOMPLETE_COMMERCE_CONTROLS", "Pause, publication-disable, and kill controls are all required");
  }
  const codes: string[] = [];
  value.forEach((control, index) => {
    const field = `controls[${index}]`;
    assertRecord(control, field);
    assertExactKeys(control, [
      "control_id", "control_code", "availability", "state", "requires_owner_approval", "last_action_id",
      "reason", "evidence_ids", "verified_at", "version"
    ], field);
    assertUuid(control.control_id, `${field}.control_id`);
    assertEnum(control.control_code, PHASE204_CONTROL_CODES, `${field}.control_code`);
    if (control.availability !== "AVAILABLE") throw new ContractError("UNAVAILABLE_COMMERCE_CONTROL", `${control.control_code} must be operational`);
    assertEnum(control.state, ["ARMED", "ENGAGED"], `${field}.state`);
    if (typeof control.requires_owner_approval !== "boolean") throw new ContractError("INVALID_CONTROL_AUTHORITY", `${field}.requires_owner_approval must be boolean`);
    if (control.control_code === "KILL_BUSINESS" && control.requires_owner_approval !== true) {
      throw new ContractError("INVALID_CONTROL_AUTHORITY", "The business kill control requires owner approval");
    }
    if (control.last_action_id !== null) assertUuid(control.last_action_id, `${field}.last_action_id`);
    if (control.state === "ENGAGED") {
      if (control.last_action_id === null) throw new ContractError("UNBOUND_CONTROL_ACTION", "Engaged controls require an action receipt");
      assertNonEmptyString(control.reason, `${field}.reason`, 1_000);
    } else if (control.reason !== null || control.last_action_id !== null) {
      throw new ContractError("CONFLICTING_CONTROL_STATE", "Armed controls cannot claim an executed action");
    }
    assertUuidArray(control.evidence_ids, `${field}.evidence_ids`);
    assertIsoDate(control.verified_at, `${field}.verified_at`);
    assertPositiveInteger(control.version, `${field}.version`);
    codes.push(control.control_code);
  });
  if (new Set(codes).size !== codes.length || PHASE204_CONTROL_CODES.some((code) => !codes.includes(code))) {
    throw new ContractError("INCOMPLETE_COMMERCE_CONTROLS", "Commerce controls must be unique and complete");
  }
}

export function assertPhase204InternalCommerceActivationRequest(
  value: unknown
): asserts value is Phase204InternalCommerceActivationRequest {
  assertRecord(value, "phase204_internal_commerce_activation_request");
  assertExactKeys(value, [
    "record_type", "contract_version", "schema_version", "request_id", "idempotency_key", "requested_at", "actor_id",
    "tenant_id", "organization_id", "business", "capability_activations", "products", "storefront",
    "publication_approval", "budget", "operational_metrics", "controls"
  ], "phase204_internal_commerce_activation_request");
  if (value.record_type !== "ACTIVATION_REQUEST") throw new ContractError("INVALID_PHASE204_RECORD_TYPE", "Expected an activation request");
  assertExactVersion(value, "phase204_internal_commerce_activation_request");
  assertUuid(value.request_id, "request_id");
  assertNonEmptyString(value.idempotency_key, "idempotency_key", 255);
  if (value.idempotency_key.length < 12) throw new ContractError("IDEMPOTENCY_KEY", "idempotency_key must be at least 12 characters");
  assertIsoDate(value.requested_at, "requested_at");
  assertUuid(value.actor_id, "actor_id");
  assertUuid(value.tenant_id, "tenant_id");
  assertUuid(value.organization_id, "organization_id");
  assertBusiness(value.business);
  if (!Array.isArray(value.capability_activations) || value.capability_activations.length === 0) {
    throw new ContractError("MISSING_INTERNAL_CAPABILITIES", "At least one evidence-backed internal capability is required");
  }
  value.capability_activations.forEach((activation, index) => assertCapabilityActivation(
    activation,
    value.tenant_id as string,
    value.organization_id as string,
    index
  ));
  const capabilityIds = value.capability_activations.map((activation) => (activation as Record<string, unknown>).capability_id);
  if (new Set(capabilityIds).size !== capabilityIds.length) throw new ContractError("DUPLICATE_PHASE204_VALUE", "Capability activations must be unique");
  if (!Array.isArray(value.products)) throw new ContractError("INVALID_PHASE204_PRODUCT_LINE", "products must be an array");
  value.products.forEach((product, index) => assertProduct(product, index));
  const products = value.products as unknown as readonly Phase204InternalCommerceProduct[];
  assertExactProductSet(products);
  assertStorefront(value.storefront, products);
  const storefront = value.storefront as unknown as Phase204StorefrontState;
  if (value.publication_approval !== null) {
    assertPublicationApproval(value.publication_approval, {
      business: value.business as unknown as Phase204CanonicalBusinessActivation,
      products,
      storefront
    });
  }
  assertRecord(value.budget, "budget");
  assertExactKeys(value.budget, [
    "currency", "setup_spend_limit_cents", "setup_spend_committed_cents", "advertising_budget_cents"
  ], "budget");
  assertSafeNonNegativeInteger(value.budget.setup_spend_limit_cents, "budget.setup_spend_limit_cents");
  assertSafeNonNegativeInteger(value.budget.setup_spend_committed_cents, "budget.setup_spend_committed_cents");
  if (
    value.budget.currency !== "USD"
    || value.budget.setup_spend_limit_cents > PHASE204_SETUP_SPEND_LIMIT_CENTS
    || value.budget.setup_spend_committed_cents > value.budget.setup_spend_limit_cents
    || value.budget.advertising_budget_cents !== PHASE204_ADVERTISING_BUDGET_CENTS
  ) throw new ContractError("PHASE204_BUDGET_EXCEEDED", "Initial commerce budget is capped at $150 setup and $0 advertising");
  const approvedSetupSpendLimit = value.publication_approval === null
    ? null
    : value.publication_approval.setup_spend_limit_cents;
  if (
    approvedSetupSpendLimit !== null
    && (
      value.budget.setup_spend_limit_cents > approvedSetupSpendLimit
      || value.budget.setup_spend_committed_cents > approvedSetupSpendLimit
    )
  ) throw new ContractError("PUBLICATION_BUDGET_EXCEEDED", "Commerce spend must remain inside the exact owner-approved envelope");
  assertOperationalMetrics(value.operational_metrics);
  assertControls(value.controls);
  if (storefront.status === "PUBLISHED") {
    if (value.publication_approval === null) throw new ContractError("OWNER_APPROVAL_REQUIRED", "External publication requires exact owner approval");
  }
}

export function parsePhase204InternalCommerceActivationRequest(
  value: unknown
): Phase204InternalCommerceActivationRequest {
  assertPhase204InternalCommerceActivationRequest(value);
  return value;
}

export function evaluatePhase204InternalCommercePublication(
  request: Phase204InternalCommerceActivationRequest,
  evaluatedAt = new Date().toISOString()
): Phase204PublicationDecision {
  assertPhase204InternalCommerceActivationRequest(request);
  assertIsoDate(evaluatedAt, "evaluated_at");
  const approval = request.publication_approval;
  const decision = (
    allowed: boolean,
    reason_code: Phase204PublicationDecisionReason
  ): Phase204PublicationDecision => ({
    allowed,
    reason_code,
    approval_id: approval?.approval_id ?? null,
    provider: request.storefront.selected_provider,
    evaluated_at: evaluatedAt
  });
  if (approval === null) return decision(false, "OWNER_APPROVAL_REQUIRED");
  if (
    approval.selected_provider !== request.storefront.selected_provider
    || approval.storefront_id !== request.storefront.storefront_id
    || approval.public_brand_name !== request.business.brand.public_brand_name
  ) return decision(false, "APPROVAL_SCOPE_MISMATCH");
  if (request.storefront.status !== "READY_FOR_OWNER_APPROVAL" && request.storefront.status !== "PUBLISHED") {
    return decision(false, "PROVIDER_NOT_READY");
  }
  if (request.storefront.listings.some((listing) => (
    listing.status !== "READY_FOR_OWNER_APPROVAL" && listing.status !== "PUBLISHED"
  ))) return decision(false, "LISTINGS_NOT_READY");
  return decision(true, "APPROVED_ENVELOPE");
}

export function assertPhase204InternalCommerceActivationResult(
  value: unknown,
  request?: Phase204InternalCommerceActivationRequest
): asserts value is Phase204InternalCommerceActivationResult {
  assertRecord(value, "phase204_internal_commerce_activation_result");
  assertExactKeys(value, [
    "record_type", "contract_version", "schema_version", "result_id", "request_id", "status", "blocker", "business_id",
    "activated_capability_ids", "canonical_event_ids", "canonical_event_sequence", "business_record_version", "readback",
    "storefront_status", "publication_decision", "completed_at"
  ], "phase204_internal_commerce_activation_result");
  if (value.record_type !== "ACTIVATION_RESULT") throw new ContractError("INVALID_PHASE204_RECORD_TYPE", "Expected an activation result");
  assertExactVersion(value, "phase204_internal_commerce_activation_result");
  assertUuid(value.result_id, "result_id");
  assertUuid(value.request_id, "request_id");
  assertEnum(value.status, ["ACTIVATED", "BLOCKED"], "status");
  assertUuid(value.business_id, "business_id");
  if (value.status === "ACTIVATED") {
    if (value.blocker !== null) throw new ContractError("CONFLICTING_ACTIVATION_RESULT", "An activated result cannot carry a blocker");
  } else assertNonEmptyString(value.blocker, "blocker", 1_000);
  assertUuidArray(value.activated_capability_ids, "activated_capability_ids");
  assertUuidArray(value.canonical_event_ids, "canonical_event_ids");
  assertPositiveInteger(value.canonical_event_sequence, "canonical_event_sequence");
  assertPositiveInteger(value.business_record_version, "business_record_version");
  assertRecord(value.readback, "readback");
  assertExactKeys(value.readback, [
    "businesses", "command", "business_full_record", "heart_2d", "heart_3d", "evidence_receipt_ids"
  ], "readback");
  for (const surface of ["businesses", "command", "business_full_record", "heart_2d", "heart_3d"] as const) {
    if (value.readback[surface] !== true) throw new ContractError("INCOMPLETE_INTERNAL_COMMERCE_READBACK", `${surface} readback must pass`);
  }
  assertUuidArray(value.readback.evidence_receipt_ids, "readback.evidence_receipt_ids", 5);
  assertEnum(value.storefront_status, [
    "OWNER_ACTION_REQUIRED", "READY_FOR_OWNER_APPROVAL", "PUBLISHED", "PAUSED", "DISABLED"
  ], "storefront_status");
  assertRecord(value.publication_decision, "publication_decision");
  assertExactKeys(value.publication_decision, [
    "allowed", "reason_code", "approval_id", "provider", "evaluated_at"
  ], "publication_decision");
  if (typeof value.publication_decision.allowed !== "boolean") throw new ContractError("INVALID_PUBLICATION_DECISION", "publication_decision.allowed must be boolean");
  assertEnum(value.publication_decision.reason_code, PHASE204_PUBLICATION_DECISION_REASONS, "publication_decision.reason_code");
  if (value.publication_decision.allowed !== (value.publication_decision.reason_code === "APPROVED_ENVELOPE")) {
    throw new ContractError("INVALID_PUBLICATION_DECISION", "Only an approved envelope may allow publication");
  }
  if (value.publication_decision.approval_id !== null) assertUuid(value.publication_decision.approval_id, "publication_decision.approval_id");
  assertEnum(value.publication_decision.provider, ["ETSY", "GUMROAD"], "publication_decision.provider");
  assertIsoDate(value.publication_decision.evaluated_at, "publication_decision.evaluated_at");
  assertIsoDate(value.completed_at, "completed_at");
  if (request) {
    if (value.request_id !== request.request_id || value.business_id !== request.business.business_id) {
      throw new ContractError("ACTIVATION_RESULT_SCOPE_MISMATCH", "Activation result must bind its exact request and business");
    }
    const requestedCapabilityIds = request.capability_activations.map((activation) => activation.capability_id).sort();
    const activatedCapabilityIds = [...(value.activated_capability_ids as string[])].sort();
    if (JSON.stringify(requestedCapabilityIds) !== JSON.stringify(activatedCapabilityIds)) {
      throw new ContractError("ACTIVATION_RESULT_SCOPE_MISMATCH", "Activation result must bind every requested capability exactly once");
    }
    if (
      value.storefront_status !== request.storefront.status
      || value.publication_decision.provider !== request.storefront.selected_provider
      || value.publication_decision.approval_id !== (request.publication_approval?.approval_id ?? null)
    ) throw new ContractError("ACTIVATION_RESULT_SCOPE_MISMATCH", "Activation result must bind storefront and approval state");
    const expectedDecision = evaluatePhase204InternalCommercePublication(
      request,
      value.publication_decision.evaluated_at as string
    );
    if (
      value.publication_decision.allowed !== expectedDecision.allowed
      || value.publication_decision.reason_code !== expectedDecision.reason_code
    ) throw new ContractError("ACTIVATION_RESULT_SCOPE_MISMATCH", "Activation result must retain the fail-closed publication decision");
    if (Date.parse(value.completed_at as string) < Date.parse(request.requested_at)) {
      throw new ContractError("INVALID_PHASE204_TIMELINE", "Activation result cannot complete before its request");
    }
  }
}

export function assertPhase204InternalCommerceEnvelope(value: unknown): asserts value is Phase204InternalCommerceEnvelope {
  assertRecord(value, "phase204_internal_commerce_envelope");
  if (value.record_type === "ACTIVATION_REQUEST") {
    assertPhase204InternalCommerceActivationRequest(value);
    return;
  }
  if (value.record_type === "ACTIVATION_RESULT") {
    assertPhase204InternalCommerceActivationResult(value);
    return;
  }
  throw new ContractError("INVALID_PHASE204_RECORD_TYPE", "Phase 204 commerce envelope must be a request or result");
}
