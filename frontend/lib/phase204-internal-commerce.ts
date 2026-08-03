import { apiFetch } from "./api";

export const PHASE204_INTERNAL_BUSINESS_CODE = "SP-COMMERCE-001" as const;
export const PHASE204_INTERNAL_BUSINESS_NAME = "Contractor Operations Products" as const;
export const PHASE204_COMMERCE_MARSHAL_ID = "a50b1493-ffe1-5373-ad1b-96bb393a0c6f" as const;
export const PHASE204_DIGITAL_PRODUCTS_GENERAL_ID = "9ce85809-e772-5a8f-be8d-34e01a9448a8" as const;

export const PHASE204_PRODUCTS = [
  {
    code: "LEAD_RESPONSE_ESTIMATE_FOLLOW_UP_KIT",
    kind: "PRODUCT",
    priceCents: 2_900,
    title: "Lead Response and Estimate Follow-Up Kit"
  },
  {
    code: "SCOPE_CHANGE_ORDER_CONTROL_PACK",
    kind: "PRODUCT",
    priceCents: 4_900,
    title: "Scope and Change-Order Control Pack"
  },
  {
    code: "BILLING_COLLECTIONS_ACCELERATOR",
    kind: "PRODUCT",
    priceCents: 4_900,
    title: "Billing and Collections Accelerator"
  },
  {
    code: "WEEKLY_OWNER_COMMAND_DASHBOARD",
    kind: "PRODUCT",
    priceCents: 3_900,
    title: "Weekly Owner Command Dashboard"
  },
  {
    code: "COMPLETE_CONTRACTOR_CONTROL_BUNDLE",
    kind: "BUNDLE",
    priceCents: 11_900,
    title: "Complete Contractor Control Bundle"
  }
] as const;

export const PHASE204_METRIC_CODES = [
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

export const PHASE204_INTERNAL_CAPABILITIES = [
  { catalogCapabilityId: "20300000-0002-4000-8000-000000000108", mustBeActive: true },
  { catalogCapabilityId: "20300000-0002-4000-8000-000000000107", mustBeActive: true },
  { catalogCapabilityId: "20300000-0002-4000-8000-000000000106", mustBeActive: true },
  { catalogCapabilityId: "20300000-0001-4000-8000-000000000012", mustBeActive: false }
] as const;

export type Phase204MetricCode = typeof PHASE204_METRIC_CODES[number];
export type Phase204ProductCode = typeof PHASE204_PRODUCTS[number]["code"];
export type Phase204MetricScopeCode = typeof PHASE204_INTERNAL_BUSINESS_CODE | Phase204ProductCode;
export type Phase204ControlAction = "DISABLE_PUBLICATION" | "KILL_BUSINESS" | "PAUSE_BUSINESS";
export type Phase204MfaState = "NOT_REQUIRED" | "REQUIRED" | "VERIFIED";

export type Phase204InternalCommerceBusiness = {
  readonly boundary_status: string;
  readonly business_boundary_id: string;
  readonly canonical_business_id: string;
  readonly commander_id: string;
  readonly general_id: string;
  readonly internal_code: typeof PHASE204_INTERNAL_BUSINESS_CODE;
  readonly launch_mission_id: string;
  readonly marshal_id: string;
  readonly status: string;
  readonly working_name: typeof PHASE204_INTERNAL_BUSINESS_NAME;
};

export type Phase204InternalCommerceCapability = {
  readonly catalog_capability_id: string;
  readonly environment: "PRODUCTION";
  readonly installation_id: string | null;
  readonly installation_state: string | null;
  readonly lifecycle_state: string;
  readonly name: string;
  readonly public_claim_eligible: false;
  readonly scope: "TENANT";
  readonly tenant_capability_id: string;
};

export type Phase204InternalCommerceProduct = {
  readonly asset_role_count: number;
  readonly claims_sha256: string | null;
  readonly currency: "USD";
  readonly delivery_manifest_sha256: string | null;
  readonly latest_passed_gate_count: number;
  readonly price_cents: number;
  readonly product_code: Phase204ProductCode;
  readonly product_id: string;
  readonly product_kind: "BUNDLE" | "PRODUCT";
  readonly product_version: string;
  readonly ready: boolean;
  readonly title: string;
};

export type Phase204StorefrontListing = {
  readonly claims_manifest_sha256: string;
  readonly delivery_manifest_sha256: string;
  readonly listing_record_id: string;
  readonly price_cents: number;
  readonly product_code: Phase204ProductCode;
  readonly provider_evidence_ids: readonly string[];
  readonly provider_listing_id: string | null;
  readonly provider_listing_reference_sha256: string | null;
  readonly published_at: string | null;
  readonly status: string;
};

export type Phase204Storefront = {
  readonly external_provider_mutation_available: boolean;
  readonly listings: readonly Phase204StorefrontListing[];
  readonly owner_approval_id: string | null;
  readonly preferred_provider: "ETSY";
  readonly provider: "ETSY" | "GUMROAD";
  readonly provider_policy_evidence_ids: readonly string[];
  readonly provider_policy_source_record_id: string | null;
  readonly public_brand: string | null;
  readonly publication_allowed: boolean;
  readonly state: string;
  readonly state_reason: string;
  readonly storefront_id: string;
};

export type Phase204CommerceControl = {
  readonly availability: string;
  readonly control_code: Phase204ControlAction;
  readonly control_id: string;
  readonly evidence_ids: readonly string[];
  readonly last_action_id: string | null;
  readonly reason: string | null;
  readonly requires_owner_approval: boolean;
  readonly state: "ARMED" | "ENGAGED";
  readonly verified_at: string;
  readonly version: number;
};

export type Phase204OperationalMetric = {
  readonly currency: "USD" | null;
  readonly evidence_id: string | null;
  readonly is_estimate: false;
  readonly metric_code: Phase204MetricCode;
  readonly metric_id: string;
  readonly observed_at: string | null;
  readonly provider_record_id: string | null;
  readonly scope: {
    readonly scope_code: Phase204MetricScopeCode;
    readonly scope_type: "BUSINESS" | "PRODUCT";
  };
  readonly source_type: string | null;
  readonly truth_state: "OBSERVED" | "UNAVAILABLE";
  readonly unavailable_reason: string | null;
  readonly unit: "COUNT" | "RATIO" | "SCORE" | "USD_CENTS";
  readonly value: number | null;
};

export type Phase204ProviderFact = {
  readonly captured_at: string;
  readonly fact_type: string;
  readonly outcome: string;
  readonly product_code: Phase204ProductCode | null;
  readonly provider: "ETSY" | "GUMROAD";
  readonly state: "OBSERVED" | "UNAVAILABLE";
  readonly unavailable_reason: string | null;
};

export type Phase204InternalCommerceReadback = {
  readonly business: Phase204InternalCommerceBusiness | null;
  readonly capabilities?: readonly Phase204InternalCommerceCapability[];
  readonly controls?: readonly Phase204CommerceControl[];
  readonly daily_operating_summary?: {
    readonly estimated_values_included: false;
    readonly observed_provider_fact_count: number;
    readonly operational_metrics: readonly Phase204OperationalMetric[];
    readonly period_end: string;
    readonly period_start: string;
    readonly unavailable_provider_fact_count: number;
  };
  readonly generated_at?: string;
  readonly operational_metrics?: readonly Phase204OperationalMetric[];
  readonly organization_id: string;
  readonly products?: readonly Phase204InternalCommerceProduct[];
  readonly provider_facts?: readonly Phase204ProviderFact[];
  readonly readiness?: {
    readonly all_products_ready: boolean;
    readonly exact_control_count: number;
    readonly exact_listing_count: number;
    readonly exact_metric_truth_count: number;
    readonly exact_product_count: number;
    readonly manifest_hashes: Readonly<Record<string, string | null>>;
    readonly owner_approval_present: boolean;
  };
  readonly release_version: "phase-204";
  readonly session_authority?: {
    readonly recent_mfa_verified: boolean;
  };
  readonly state?: "NOT_ACTIVATED";
  readonly storefront?: Phase204Storefront;
  readonly tenant_id: string;
};

export type Phase204MetricCell = {
  readonly code: Phase204MetricCode;
  readonly record: Phase204OperationalMetric | null;
  readonly scopeCode: Phase204MetricScopeCode;
  readonly unavailableReason: string | null;
};

const productByCode = new Map(PHASE204_PRODUCTS.map((product) => [product.code, product]));
const capabilityByCatalogId = new Map<string, (typeof PHASE204_INTERNAL_CAPABILITIES)[number]>(PHASE204_INTERNAL_CAPABILITIES.map((capability) => [
  capability.catalogCapabilityId,
  capability
]));
const metricCodeSet = new Set<string>(PHASE204_METRIC_CODES);
const scopeCodes: readonly Phase204MetricScopeCode[] = [
  PHASE204_INTERNAL_BUSINESS_CODE,
  ...PHASE204_PRODUCTS.map((product) => product.code)
];

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Phase 204 commerce truth is invalid: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function assertMetric(record: unknown): asserts record is Phase204OperationalMetric {
  invariant(isRecord(record), "metric record is not an object");
  invariant(isNonEmptyString(record.metric_id), "metric id is missing");
  invariant(typeof record.metric_code === "string" && metricCodeSet.has(record.metric_code), "metric code is unsupported");
  invariant(isRecord(record.scope), "metric scope is missing");
  invariant(scopeCodes.includes(record.scope.scope_code as Phase204MetricScopeCode), "metric scope code is unsupported");
  invariant(record.scope.scope_type === (record.scope.scope_code === PHASE204_INTERNAL_BUSINESS_CODE ? "BUSINESS" : "PRODUCT"), "metric scope type is mismatched");
  invariant(record.is_estimate === false, "estimated values are forbidden");
  invariant(record.truth_state === "OBSERVED" || record.truth_state === "UNAVAILABLE", "metric truth state is unsupported");
  if (record.truth_state === "OBSERVED") {
    invariant(typeof record.value === "number" && Number.isFinite(record.value), "observed metric value is missing");
    invariant(isNonEmptyString(record.provider_record_id), "observed provider record is missing");
    invariant(isNonEmptyString(record.evidence_id), "observed metric evidence is missing");
    invariant(isNonEmptyString(record.observed_at), "observed metric timestamp is missing");
    invariant(record.unavailable_reason === null, "observed metric has an unavailable reason");
  } else {
    invariant(record.value === null, "unavailable metric contains a numeric value");
    invariant(isNonEmptyString(record.unavailable_reason), "unavailable metric reason is missing");
  }
}

/**
 * Runtime-validates the database readback before a member-facing surface uses it.
 * The validator intentionally rejects partial activated truth instead of filling it
 * with inferred values.
 */
export function validatePhase204InternalCommerceReadback(value: unknown): Phase204InternalCommerceReadback {
  invariant(isRecord(value), "readback is not an object");
  invariant(value.release_version === "phase-204", "release version is not phase-204");
  invariant(isNonEmptyString(value.tenant_id) && isNonEmptyString(value.organization_id), "tenant scope is missing");
  invariant(
    value.session_authority === undefined
      || (isRecord(value.session_authority) && typeof value.session_authority.recent_mfa_verified === "boolean"),
    "session authority is malformed"
  );

  if (value.business === null) {
    invariant(value.state === "NOT_ACTIVATED", "empty readback state is not NOT_ACTIVATED");
    return value as Phase204InternalCommerceReadback;
  }

  invariant(isRecord(value.business), "canonical business is missing");
  invariant(value.business.internal_code === PHASE204_INTERNAL_BUSINESS_CODE, "canonical business code is mismatched");
  invariant(value.business.working_name === PHASE204_INTERNAL_BUSINESS_NAME, "canonical working name is mismatched");
  invariant(value.business.marshal_id === PHASE204_COMMERCE_MARSHAL_ID, "canonical Commerce authority Marshal is mismatched");
  invariant(value.business.general_id === PHASE204_DIGITAL_PRODUCTS_GENERAL_ID, "canonical Digital Products General is mismatched");
  for (const field of ["business_boundary_id", "canonical_business_id", "commander_id", "marshal_id", "general_id", "launch_mission_id"] as const) {
    invariant(isNonEmptyString(value.business[field]), `business ${field} is missing`);
  }

  invariant(Array.isArray(value.products) && value.products.length === PHASE204_PRODUCTS.length, "exact five-product line is missing");
  const seenProducts = new Set<string>();
  for (const rawProduct of value.products) {
    invariant(isRecord(rawProduct), "product record is malformed");
    const expected = productByCode.get(rawProduct.product_code as Phase204ProductCode);
    invariant(expected && !seenProducts.has(expected.code), "product code is missing or duplicated");
    seenProducts.add(expected.code);
    invariant(rawProduct.title === expected.title, `${expected.code} title is mismatched`);
    invariant(rawProduct.price_cents === expected.priceCents && rawProduct.currency === "USD", `${expected.code} price is mismatched`);
    invariant(rawProduct.product_kind === expected.kind, `${expected.code} kind is mismatched`);
    invariant(typeof rawProduct.ready === "boolean", `${expected.code} readiness is missing`);
  }

  invariant(Array.isArray(value.capabilities) && value.capabilities.length === PHASE204_INTERNAL_CAPABILITIES.length, "exact tenant capability truth is missing");
  const seenCapabilities = new Set<string>();
  for (const rawCapability of value.capabilities) {
    invariant(isRecord(rawCapability), "capability record is malformed");
    const expected = capabilityByCatalogId.get(rawCapability.catalog_capability_id as string);
    invariant(expected && !seenCapabilities.has(expected.catalogCapabilityId), "tenant capability source is missing or duplicated");
    seenCapabilities.add(expected.catalogCapabilityId);
    invariant(isNonEmptyString(rawCapability.tenant_capability_id), "tenant capability id is missing");
    invariant(rawCapability.environment === "PRODUCTION" && rawCapability.scope === "TENANT", "capability scope is not tenant production");
    invariant(rawCapability.public_claim_eligible === false, "internal capability is publicly claimable");
    invariant(rawCapability.lifecycle_state !== "SELLABLE", "internal capability was incorrectly made sellable");
    if (expected.mustBeActive) {
      invariant(rawCapability.lifecycle_state === "ACTIVE" && rawCapability.installation_state === "ACTIVE", "required internal capability is not active and installed");
      invariant(isNonEmptyString(rawCapability.installation_id), "required internal capability installation id is missing");
    } else {
      invariant(rawCapability.lifecycle_state !== "ACTIVE" && rawCapability.installation_state !== "ACTIVE", "unverified Etsy capability was activated");
    }
  }

  invariant(Array.isArray(value.operational_metrics) && value.operational_metrics.length === 54, "exact 54-cell metric truth matrix is missing");
  const seenMetrics = new Set<string>();
  const metricByKey = new Map<string, Phase204OperationalMetric>();
  for (const metric of value.operational_metrics) {
    assertMetric(metric);
    const key = `${metric.scope.scope_code}:${metric.metric_code}`;
    invariant(!seenMetrics.has(key), `metric cell ${key} is duplicated`);
    seenMetrics.add(key);
    metricByKey.set(key, metric);
  }
  for (const scopeCode of scopeCodes) {
    for (const metricCode of PHASE204_METRIC_CODES) {
      invariant(seenMetrics.has(`${scopeCode}:${metricCode}`), `metric cell ${scopeCode}:${metricCode} is missing`);
    }
  }

  invariant(Array.isArray(value.controls) && value.controls.length === 3, "exact commerce controls are missing");
  const controls = new Set(value.controls.map((control) => isRecord(control) ? control.control_code : null));
  invariant(controls.size === 3 && ["PAUSE_BUSINESS", "DISABLE_PUBLICATION", "KILL_BUSINESS"].every((code) => controls.has(code)), "commerce controls are missing or duplicated");

  invariant(isRecord(value.storefront), "storefront truth is missing");
  invariant(value.storefront.preferred_provider === "ETSY", "Etsy is not the preferred provider");
  invariant(value.storefront.provider === "ETSY" || value.storefront.provider === "GUMROAD", "storefront provider is unsupported");
  invariant(Array.isArray(value.storefront.listings), "listing truth is missing");
  invariant(typeof value.storefront.publication_allowed === "boolean", "publication authority is missing");
  if (value.storefront.publication_allowed) {
    invariant(isNonEmptyString(value.storefront.owner_approval_id), "publication is allowed without exact owner approval");
    invariant(isNonEmptyString(value.storefront.public_brand), "publication is allowed without an evidence-selected brand");
    invariant(value.storefront.listings.length === 5, "publication is allowed without five listing records");
  }

  invariant(isRecord(value.daily_operating_summary), "daily operating summary is missing");
  invariant(value.daily_operating_summary.estimated_values_included === false, "daily summary includes estimates");
  invariant(Array.isArray(value.daily_operating_summary.operational_metrics) && value.daily_operating_summary.operational_metrics.length === 54, "daily metric truth matrix is incomplete");
  const dailyMetricKeys = new Set<string>();
  for (const metric of value.daily_operating_summary.operational_metrics) {
    assertMetric(metric);
    const key = `${metric.scope.scope_code}:${metric.metric_code}`;
    invariant(!dailyMetricKeys.has(key), `daily metric cell ${key} is duplicated`);
    dailyMetricKeys.add(key);
    invariant(seenMetrics.has(key), `daily metric cell ${key} is outside operational truth`);
    invariant(metricByKey.get(key)?.metric_id === metric.metric_id, `daily metric cell ${key} does not bind current operational truth`);
  }
  invariant(isRecord(value.readiness) && value.readiness.exact_metric_truth_count === 54, "readiness does not bind the 54 metric cells");
  invariant(value.readiness.exact_product_count === 5 && value.readiness.exact_control_count === 3, "readiness counts are incomplete");
  invariant(value.readiness.exact_listing_count === value.storefront.listings.length, "listing readiness count is mismatched");
  invariant(value.readiness.all_products_ready === value.products.every((product) => isRecord(product) && product.ready === true), "product readiness summary is mismatched");
  invariant(value.readiness.owner_approval_present === Boolean(value.storefront.owner_approval_id), "owner approval summary is mismatched");

  return value as Phase204InternalCommerceReadback;
}

export function phase204MetricCells(metrics: readonly Phase204OperationalMetric[]): readonly Phase204MetricCell[] {
  const byKey = new Map(metrics.map((metric) => [`${metric.scope.scope_code}:${metric.metric_code}`, metric]));
  return scopeCodes.flatMap((scopeCode) => PHASE204_METRIC_CODES.map((code) => {
    const record = byKey.get(`${scopeCode}:${code}`) ?? null;
    return {
      code,
      record,
      scopeCode,
      unavailableReason: record?.truth_state === "UNAVAILABLE"
        ? record.unavailable_reason
        : record
          ? null
          : "The required canonical metric truth record is missing. No value is inferred."
    };
  }));
}

export function phase204PublicationActionAllowed(readback: Phase204InternalCommerceReadback): boolean {
  return Boolean(
    readback.business
    && readback.storefront?.owner_approval_id
    && readback.storefront.publication_allowed
    && readback.storefront.external_provider_mutation_available
  );
}

export function phase204ProductTitle(code: Phase204ProductCode): string {
  return productByCode.get(code)?.title ?? code;
}

export function phase204ScopeLabel(code: Phase204MetricScopeCode): string {
  return code === PHASE204_INTERNAL_BUSINESS_CODE
    ? "Business total"
    : phase204ProductTitle(code);
}

export async function loadPhase204InternalCommerce(
  organizationId: string,
  options: { signal?: AbortSignal } = {}
): Promise<Phase204InternalCommerceReadback> {
  const payload = await apiFetch<unknown>(
    `/member/organizations/${encodeURIComponent(organizationId)}/internal-commerce`,
    { signal: options.signal }
  );
  return validatePhase204InternalCommerceReadback(payload);
}

export async function applyPhase204CommerceControl(
  organizationId: string,
  command: {
    action: Phase204ControlAction;
    businessBoundaryId: string;
    reason: string;
  }
): Promise<void> {
  const actionId = crypto.randomUUID();
  await apiFetch<unknown>(
    `/member/organizations/${encodeURIComponent(organizationId)}/internal-commerce/controls`,
    {
      headers: { "idempotency-key": `phase204-member-control:${actionId}` },
      json: {
        action: command.action,
        business_boundary_id: command.businessBoundaryId,
        control_event_id: actionId,
        evidence_ids: [],
        occurred_at: new Date().toISOString(),
        reason: command.reason
      },
      method: "POST"
    }
  );
}
