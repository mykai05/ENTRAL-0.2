import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { prisma, withTenantSession, type VerifiedTenantIdentity } from "../db.js";

type JsonRecord = Readonly<Record<string, unknown>>;
type JsonValueRow = { value: unknown };

export type Phase204InternalCommerceMemberContext = {
  authSubject: string;
  organizationId: string;
  recentMfaVerified: boolean;
  requestId: string;
  tenantId: string;
};

export class Phase204InternalCommerceServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number
  ) {
    super(message);
    this.name = "Phase204InternalCommerceServiceError";
  }
}

const uuid = z.string().uuid();
const sha256 = z.string().regex(/^[0-9a-f]{64}$/u);
const timestamp = z.string().datetime({ offset: true });
const nullableUuid = uuid.nullable();
const nullableTimestamp = timestamp.nullable();

const productSchema = z.object({
  asset_role_count: z.number().int().nonnegative(),
  claims_sha256: sha256,
  currency: z.literal("USD"),
  delivery_manifest_sha256: sha256,
  latest_passed_gate_count: z.number().int().nonnegative(),
  price_cents: z.number().int().safe().nonnegative(),
  product_code: z.string().min(1),
  product_id: uuid,
  product_kind: z.enum(["PRODUCT", "BUNDLE"]),
  product_version: z.string().min(1),
  ready: z.boolean(),
  title: z.string().min(1)
}).strict();

const capabilitySchema = z.object({
  catalog_capability_id: uuid,
  environment: z.literal("PRODUCTION"),
  installation_id: nullableUuid,
  installation_state: z.string().nullable(),
  lifecycle_state: z.string().min(1),
  name: z.string().min(1),
  public_claim_eligible: z.literal(false),
  scope: z.literal("TENANT"),
  tenant_capability_id: uuid
}).strict();

const listingSchema = z.object({
  claims_manifest_sha256: sha256,
  delivery_manifest_sha256: sha256,
  listing_record_id: uuid,
  price_cents: z.number().int().safe().nonnegative(),
  product_code: z.string().min(1),
  provider_evidence_ids: z.array(uuid),
  provider_listing_id: z.string().nullable(),
  provider_listing_reference_sha256: sha256.nullable(),
  published_at: nullableTimestamp,
  status: z.enum(["DRAFT", "READY_FOR_OWNER_APPROVAL", "PUBLISHED", "PAUSED", "DISABLED"])
}).strict();

const metricSchema = z.object({
  currency: z.enum(["USD"]).nullable(),
  evidence_id: nullableUuid,
  is_estimate: z.literal(false),
  metric_code: z.string().min(1),
  metric_id: uuid,
  observed_at: nullableTimestamp,
  provider_record_id: nullableUuid,
  scope: z.object({ scope_code: z.string().min(1), scope_type: z.enum(["BUSINESS", "PRODUCT"]) }).strict(),
  source_type: z.string().nullable(),
  truth_state: z.enum(["OBSERVED", "UNAVAILABLE"]),
  unavailable_reason: z.string().nullable(),
  unit: z.enum(["USD_CENTS", "RATIO", "COUNT", "SCORE"]),
  value: z.number().finite().nullable()
}).strict();

const controlSchema = z.object({
  availability: z.literal("AVAILABLE"),
  control_code: z.enum(["PAUSE_BUSINESS", "DISABLE_PUBLICATION", "KILL_BUSINESS"]),
  control_id: uuid,
  evidence_ids: z.array(uuid),
  last_action_id: nullableUuid,
  reason: z.string().nullable(),
  requires_owner_approval: z.boolean(),
  state: z.enum(["ARMED", "ENGAGED"]),
  verified_at: timestamp,
  version: z.number().int().positive()
}).strict();

const manifestSchema = z.object({
  ai_disclosure_manifest_sha256: sha256,
  asset_manifest_sha256: sha256,
  claims_manifest_sha256: sha256,
  license_manifest_sha256: sha256,
  product_manifest_sha256: sha256
}).strict();

const activatedReadbackSchema = z.object({
  business: z.object({
    boundary_status: z.string().min(1),
    business_boundary_id: uuid,
    canonical_business_id: uuid,
    commander_id: uuid,
    general_id: uuid,
    internal_code: z.literal("SP-COMMERCE-001"),
    launch_mission_id: uuid,
    marshal_id: uuid,
    status: z.string().min(1),
    working_name: z.literal("Contractor Operations Products")
  }).strict(),
  capabilities: z.array(capabilitySchema),
  controls: z.array(controlSchema),
  daily_operating_summary: z.object({
    estimated_values_included: z.literal(false),
    observed_provider_fact_count: z.number().int().nonnegative(),
    operational_metrics: z.array(metricSchema),
    period_end: timestamp,
    period_start: timestamp,
    unavailable_provider_fact_count: z.number().int().nonnegative()
  }).strict(),
  generated_at: timestamp,
  operational_metrics: z.array(metricSchema),
  organization_id: uuid,
  products: z.array(productSchema),
  readiness: z.object({
    all_products_ready: z.boolean(),
    exact_control_count: z.number().int().nonnegative(),
    exact_listing_count: z.number().int().nonnegative(),
    exact_metric_truth_count: z.number().int().nonnegative(),
    exact_product_count: z.number().int().nonnegative(),
    manifest_hashes: manifestSchema,
    owner_approval_present: z.boolean()
  }).strict(),
  release_version: z.literal("phase-204"),
  storefront: z.object({
    external_provider_mutation_available: z.literal(false),
    listings: z.array(listingSchema),
    owner_approval_id: nullableUuid,
    preferred_provider: z.literal("ETSY"),
    provider: z.enum(["ETSY", "GUMROAD"]),
    provider_policy_evidence_ids: z.array(uuid),
    provider_policy_source_record_id: nullableUuid,
    public_brand: z.string().nullable(),
    publication_allowed: z.boolean(),
    state: z.enum(["OWNER_ACTION_REQUIRED", "BLOCKED", "READY_FOR_OWNER_APPROVAL", "PUBLISHED", "PAUSED", "DISABLED"]),
    state_reason: z.string().min(1),
    storefront_id: uuid
  }).strict(),
  tenant_id: uuid
}).strict();

const notActivatedReadbackSchema = z.object({
  business: z.null(),
  organization_id: uuid,
  release_version: z.literal("phase-204"),
  state: z.literal("NOT_ACTIVATED"),
  tenant_id: uuid
}).strict();

export type Phase204InternalCommerceReadback = z.infer<typeof activatedReadbackSchema> | z.infer<typeof notActivatedReadbackSchema>;

const CAPABILITY_RESPONSE_KEYS = [
  "activation_requirements", "audience_status", "capability_id", "capability_key", "capability_version",
  "catalog_capability_id", "catalog_capability_version", "created_at", "data_classification", "dependencies",
  "deactivation_path", "display_name", "environment", "failure_state", "kind", "last_verified_at", "lifecycle_state", "limitations",
  "organization_id", "owner", "pricing_eligibility", "production_readiness", "public_claim_eligible", "purpose",
  "receipt_id", "record_version", "release_version", "required_evidence", "rollback_path", "scope", "source_reference",
  "supported_scopes", "tenant_id", "updated_at", "verification_receipts"
] as const;

const RESPONSE_KEYS: Readonly<Record<string, readonly string[]>> = {
  ACTIVATE_INTERNAL_COMMERCE: [
    "activation_id", "tenant_id", "organization_id", "business_boundary_id", "canonical_business_id", "business_code",
    "working_name", "commander_id", "marshal_id", "general_id", "launch_mission_id", "governance_action_id", "soldier_ids",
    "completed_provision_task_ids", "active_operation_task_ids", "product_ids", "storefront_id", "preferred_provider",
    "commerce_control_state", "public_brand", "source_record_id", "evidence_artifact_id", "release_version"
  ],
  APPROVE_PUBLICATION: [
    "approval_id", "authority", "approved", "owner_actor_id", "approved_at", "selected_provider", "storefront_id",
    "public_brand_name", "product_approvals", "setup_spend_limit_cents", "advertising_budget_cents", "envelope_sha256",
    "revoked_at", "external_publication_performed", "release_version"
  ],
  BIND_CAPABILITY_REQUIREMENT: CAPABILITY_RESPONSE_KEYS,
  INGEST_PROVIDER_FACT: [
    "provider_fact_id", "storefront_id", "product_id", "provider", "fact_type", "fact_state", "outcome", "amount_cents",
    "occurred_at", "captured_at", "release_version"
  ],
  RECORD_CAPABILITY_EVIDENCE: CAPABILITY_RESPONSE_KEYS,
  RECORD_LISTING_STATE: [
    "listing_record_id", "storefront_id", "product_code", "provider_listing_id", "status", "price_cents",
    "delivery_manifest_sha256", "published_at", "provider_evidence_ids", "release_version"
  ],
  RECORD_METRIC_TRUTH: [
    "metric_id", "metric_code", "scope", "truth_state", "value", "unit", "currency", "provider_record_id", "source_type",
    "evidence_id", "observed_at", "unavailable_reason", "is_estimate", "release_version"
  ],
  RECORD_PRODUCT_GATE: [
    "gate_receipt_id", "product_id", "gate_type", "status", "evidence_sha256", "gate_payload", "evidence_ids", "assessed_at",
    "release_version"
  ],
  RECORD_STOREFRONT_STATE: [
    "storefront_state_event_id", "storefront_id", "provider", "state", "public_brand", "occurred_at", "release_version"
  ],
  REGISTER_CAPABILITY: CAPABILITY_RESPONSE_KEYS,
  REGISTER_INSTALLATION: [
    "installation_id", "tenant_id", "organization_id", "business_boundary_id", "capability_id", "capability_version", "state",
    "plan_eligible", "feature_flags", "limits", "suspension_reason", "activated_at", "verification_receipt_ids", "record_version",
    "release_version"
  ],
  REGISTER_PRODUCT_EVIDENCE: [
    "source_record_id", "artifact_id", "product_id", "evidence_kind", "evidence_code", "file_name", "media_type",
    "byte_size", "content_sha256", "source_reference", "captured_at", "release_version"
  ],
  REGISTER_PRODUCT_ASSET: [
    "product_asset_id", "product_id", "asset_role", "asset_version", "file_name", "media_type", "editable", "byte_size",
    "content_sha256", "source_reference", "readiness", "license_status", "release_version"
  ],
  SET_COMMERCE_CONTROL: [
    "control_id", "business_boundary_id", "canonical_business_id", "action", "control_code", "availability", "state",
    "requires_owner_approval", "last_action_id", "reason", "evidence_ids", "verified_at", "version", "affected_entity_ids",
    "affected_mission_ids", "affected_task_ids", "external_provider_mutation_performed", "occurred_at", "release_version"
  ],
  TRANSITION_CAPABILITY: CAPABILITY_RESPONSE_KEYS,
  TRANSITION_INSTALLATION: [
    "installation_id", "tenant_id", "organization_id", "business_boundary_id", "capability_id", "capability_version", "state",
    "plan_eligible", "feature_flags", "limits", "suspension_reason", "activated_at", "verification_receipt_ids", "record_version",
    "release_version"
  ]
};

const REQUIRED_RESPONSE_KEYS: Readonly<Record<keyof typeof RESPONSE_KEYS, readonly string[]>> = {
  ACTIVATE_INTERNAL_COMMERCE: ["activation_id", "business_boundary_id", "canonical_business_id", "release_version"],
  APPROVE_PUBLICATION: ["approval_id", "external_publication_performed", "release_version"],
  BIND_CAPABILITY_REQUIREMENT: ["capability_id", "release_version"],
  INGEST_PROVIDER_FACT: ["provider_fact_id", "release_version"],
  RECORD_CAPABILITY_EVIDENCE: ["capability_id", "receipt_id", "release_version"],
  RECORD_LISTING_STATE: ["listing_record_id", "release_version"],
  RECORD_METRIC_TRUTH: ["metric_id", "release_version"],
  RECORD_PRODUCT_GATE: ["gate_receipt_id", "release_version"],
  RECORD_STOREFRONT_STATE: ["storefront_state_event_id", "release_version"],
  REGISTER_CAPABILITY: ["capability_id", "catalog_capability_id", "release_version"],
  REGISTER_INSTALLATION: ["installation_id", "release_version"],
  REGISTER_PRODUCT_ASSET: ["product_asset_id", "release_version"],
  REGISTER_PRODUCT_EVIDENCE: ["source_record_id", "artifact_id", "product_id", "release_version"],
  SET_COMMERCE_CONTROL: ["control_id", "external_provider_mutation_performed", "release_version"],
  TRANSITION_CAPABILITY: ["capability_id", "release_version"],
  TRANSITION_INSTALLATION: ["installation_id", "release_version"]
};

const FORBIDDEN_RESPONSE_FIELD = /(?:credential|password|secret|token|cookie|authorization)/iu;

function assertBoundedJson(value: unknown, path = "response"): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertBoundedJson(entry, `${path}[${index}]`));
    return;
  }
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return;
  if (typeof value !== "object") {
    throw new Phase204InternalCommerceServiceError("MALFORMED_INTERNAL_COMMERCE_RESPONSE", "Internal commerce returned malformed data.", 503);
  }
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_RESPONSE_FIELD.test(key)) {
      throw new Phase204InternalCommerceServiceError("MALFORMED_INTERNAL_COMMERCE_RESPONSE", "Internal commerce returned a forbidden field.", 503);
    }
    assertBoundedJson(entry, `${path}.${key}`);
  }
}

function validateMutation(operation: keyof typeof RESPONSE_KEYS, value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Phase204InternalCommerceServiceError("MALFORMED_INTERNAL_COMMERCE_RESPONSE", "Internal commerce returned malformed data.", 503);
  }
  const record = value as Record<string, unknown>;
  const allowed = new Set(RESPONSE_KEYS[operation]);
  if (
    record.release_version !== "phase-204"
    || Object.keys(record).some((key) => !allowed.has(key))
    || REQUIRED_RESPONSE_KEYS[operation].some((key) => !(key in record))
  ) {
    throw new Phase204InternalCommerceServiceError("MALFORMED_INTERNAL_COMMERCE_RESPONSE", "Internal commerce returned an unbounded response.", 503);
  }
  assertBoundedJson(record);
  if (JSON.stringify(record).length > 1_000_000) {
    throw new Phase204InternalCommerceServiceError("MALFORMED_INTERNAL_COMMERCE_RESPONSE", "Internal commerce response exceeded its bound.", 503);
  }
  return record;
}

function validateReadback(value: unknown, context: Phase204InternalCommerceMemberContext): Phase204InternalCommerceReadback {
  const parsed = (value && typeof value === "object" && "state" in value)
    ? notActivatedReadbackSchema.safeParse(value)
    : activatedReadbackSchema.safeParse(value);
  if (!parsed.success || parsed.data.tenant_id !== context.tenantId || parsed.data.organization_id !== context.organizationId) {
    throw new Phase204InternalCommerceServiceError("MALFORMED_INTERNAL_COMMERCE_READBACK", "Internal commerce readback is malformed.", 503);
  }
  assertBoundedJson(parsed.data);
  return parsed.data;
}

function sqlState(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { code?: unknown; meta?: { code?: unknown } };
  if (typeof candidate.meta?.code === "string") return candidate.meta.code;
  if (typeof candidate.code === "string" && candidate.code !== "P2010") return candidate.code;
  return null;
}

export function phase204DatabaseFailure(error: unknown): Phase204InternalCommerceServiceError {
  if (error instanceof Phase204InternalCommerceServiceError) return error;
  const state = sqlState(error);
  const mapped: Readonly<Record<string, readonly [number, string, string]>> = {
    "22023": [400, "INVALID_INTERNAL_COMMERCE_REQUEST", "The internal commerce request is invalid."],
    "23503": [404, "INTERNAL_COMMERCE_RECORD_NOT_FOUND", "The requested internal commerce record was not found."],
    "23505": [409, "INTERNAL_COMMERCE_IDEMPOTENCY_CONFLICT", "The internal commerce request conflicts with existing state."],
    "23514": [422, "INTERNAL_COMMERCE_REQUIREMENTS_UNSATISFIED", "Internal commerce requirements are not satisfied."],
    "40001": [409, "INTERNAL_COMMERCE_REVISION_CONFLICT", "Internal commerce state changed; retry from fresh readback."],
    "42501": [403, "INTERNAL_COMMERCE_AUTHORITY_REQUIRED", "Current internal commerce authority is required."],
    "55000": [409, "INTERNAL_COMMERCE_STATE_CONFLICT", "The requested internal commerce state transition is not available."]
  };
  const match = state ? mapped[state] : undefined;
  if (match) return new Phase204InternalCommerceServiceError(match[1], match[2], match[0]);
  return new Phase204InternalCommerceServiceError(
    "INTERNAL_COMMERCE_UNAVAILABLE",
    "Internal commerce is temporarily unavailable.",
    503
  );
}

function requireRecentMfa(context: Phase204InternalCommerceMemberContext) {
  if (!context.recentMfaVerified) {
    throw new Phase204InternalCommerceServiceError(
      "RECENT_MFA_STEP_UP_REQUIRED",
      "A durable session with recent MFA step-up is required.",
      403
    );
  }
}

export class Phase204InternalCommerceService {
  constructor(private readonly database: PrismaClient = prisma) {}

  private async execute(
    context: Phase204InternalCommerceMemberContext,
    actionReason: string,
    operation: keyof typeof RESPONSE_KEYS | "READBACK",
    query: (transaction: Prisma.TransactionClient, identity: VerifiedTenantIdentity) => Promise<JsonValueRow[]>,
    options: { recentMfa?: boolean; write?: boolean } = {}
  ): Promise<JsonRecord | Phase204InternalCommerceReadback> {
    if (options.recentMfa) requireRecentMfa(context);
    try {
      return await withTenantSession(this.database, {
        actionReason,
        authSubject: context.authSubject,
        requestId: context.requestId,
        tenantId: context.tenantId
      }, async (transaction, identity) => {
        if (identity.tenantId !== context.tenantId || identity.organizationId !== context.organizationId) {
          throw new Phase204InternalCommerceServiceError(
            "TENANT_ACTOR_BINDING_MISMATCH",
            "Tenant context does not match the authenticated member.",
            403
          );
        }
        const rows = await query(transaction, identity);
        const value = rows[0]?.value;
        return operation === "READBACK"
          ? validateReadback(value, context)
          : validateMutation(operation, value);
      }, options.write ? { isolationLevel: Prisma.TransactionIsolationLevel.Serializable } : {});
    } catch (error) {
      throw phase204DatabaseFailure(error);
    }
  }

  private write(
    context: Phase204InternalCommerceMemberContext,
    actionReason: string,
    operation: keyof typeof RESPONSE_KEYS,
    input: JsonRecord,
    sqlFunction: (transaction: Prisma.TransactionClient, envelope: string) => Promise<JsonValueRow[]>,
    options: { actorField?: string; recentMfa?: boolean } = {}
  ) {
    return this.execute(context, actionReason, operation, (transaction, identity) => {
      const envelope: Record<string, unknown> = {
        ...input,
        tenant_id: identity.tenantId,
        organization_id: identity.organizationId,
        release_version: "phase-204"
      };
      if (options.actorField) envelope[options.actorField] = identity.actorId;
      return sqlFunction(transaction, JSON.stringify(envelope));
    }, { recentMfa: options.recentMfa, write: true });
  }

  getReadback(context: Phase204InternalCommerceMemberContext) {
    return this.execute(context, "Read exact Phase 204 internal commerce truth.", "READBACK", (transaction, identity) =>
      transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
        SELECT entral.phase204_internal_commerce_readback(
          ${identity.tenantId}::uuid, ${identity.organizationId}::uuid
        ) AS "value"
      `));
  }

  activate(context: Phase204InternalCommerceMemberContext, input: JsonRecord) {
    return this.write(context, "Activate the bounded canonical internal commerce business.", "ACTIVATE_INTERNAL_COMMERCE", input,
      (transaction, envelope) => transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
        SELECT entral.phase204_activate_internal_commerce(${envelope}::jsonb) AS "value"
      `));
  }

  registerCapability(context: Phase204InternalCommerceMemberContext, input: JsonRecord) {
    return this.write(context, "Register one conservative tenant-internal capability.", "REGISTER_CAPABILITY", input,
      (transaction, envelope) => transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
        SELECT entral.phase204_register_tenant_capability(${envelope}::jsonb) AS "value"
      `));
  }

  recordCapabilityEvidence(context: Phase204InternalCommerceMemberContext, input: JsonRecord) {
    return this.write(context, "Record receipt-bound tenant capability evidence.", "RECORD_CAPABILITY_EVIDENCE", input,
      (transaction, envelope) => transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
        SELECT entral.phase204_record_capability_evidence(${envelope}::jsonb) AS "value"
      `));
  }

  bindCapabilityRequirement(context: Phase204InternalCommerceMemberContext, input: JsonRecord) {
    return this.write(context, "Bind exact capability activation requirement evidence.", "BIND_CAPABILITY_REQUIREMENT", input,
      (transaction, envelope) => transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
        SELECT entral.phase204_bind_capability_requirement(${envelope}::jsonb) AS "value"
      `));
  }

  transitionCapability(context: Phase204InternalCommerceMemberContext, input: JsonRecord) {
    return this.write(context, "Transition one tenant-internal capability through verified lifecycle truth.", "TRANSITION_CAPABILITY", {
      ...input,
      pricing_eligibility: "NOT_ELIGIBLE"
    },
      (transaction, envelope) => transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
        SELECT entral.phase203_transition_capability(${envelope}::jsonb) AS "value"
      `), { actorField: "actor_id" });
  }

  registerInstallation(context: Phase204InternalCommerceMemberContext, input: JsonRecord) {
    return this.write(context, "Register one business-bound tenant capability installation.", "REGISTER_INSTALLATION", input,
      (transaction, envelope) => transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
        SELECT entral.phase204_register_capability_installation(${envelope}::jsonb) AS "value"
      `));
  }

  transitionInstallation(context: Phase204InternalCommerceMemberContext, input: JsonRecord) {
    return this.write(context, "Transition one business-bound tenant capability installation.", "TRANSITION_INSTALLATION", input,
      (transaction, envelope) => transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
        SELECT entral.phase204_transition_capability_installation(${envelope}::jsonb) AS "value"
      `));
  }

  registerProductAsset(context: Phase204InternalCommerceMemberContext, input: JsonRecord) {
    return this.write(context, "Bind one exact final product asset.", "REGISTER_PRODUCT_ASSET", {
      ...input,
      license_status: "CLEARED",
      readiness: "FINAL"
    },
      (transaction, envelope) => transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
        SELECT entral.phase204_register_product_asset(${envelope}::jsonb) AS "value"
      `));
  }

  registerProductEvidence(context: Phase204InternalCommerceMemberContext, input: JsonRecord) {
    return this.write(context, "Register exact same-business product evidence.", "REGISTER_PRODUCT_EVIDENCE", input,
      (transaction, envelope) => transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
        SELECT entral.phase204_register_product_evidence(${envelope}::jsonb) AS "value"
      `));
  }

  recordProductGate(context: Phase204InternalCommerceMemberContext, input: JsonRecord) {
    return this.write(context, "Record one evidence-bound product readiness gate.", "RECORD_PRODUCT_GATE", input,
      (transaction, envelope) => transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
        SELECT entral.phase204_record_product_gate(${envelope}::jsonb) AS "value"
      `));
  }

  recordStorefrontState(context: Phase204InternalCommerceMemberContext, input: JsonRecord) {
    return this.write(context, "Record one authoritative storefront state observation.", "RECORD_STOREFRONT_STATE", input,
      (transaction, envelope) => transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
        SELECT entral.phase204_record_storefront_state(${envelope}::jsonb) AS "value"
      `), { recentMfa: input.state === "PUBLISHED" });
  }

  approvePublication(context: Phase204InternalCommerceMemberContext, input: JsonRecord) {
    return this.write(context, "Approve the exact first external publication envelope.", "APPROVE_PUBLICATION", input,
      (transaction, envelope) => transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
        SELECT entral.phase204_approve_publication(${envelope}::jsonb) AS "value"
      `), { actorField: "owner_actor_id", recentMfa: true });
  }

  recordListingState(context: Phase204InternalCommerceMemberContext, input: JsonRecord) {
    return this.write(context, "Record one authoritative provider listing state.", "RECORD_LISTING_STATE", input,
      (transaction, envelope) => transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
        SELECT entral.phase204_record_listing_state(${envelope}::jsonb) AS "value"
      `), { recentMfa: input.status === "PUBLISHED" });
  }

  ingestProviderFact(context: Phase204InternalCommerceMemberContext, input: JsonRecord) {
    return this.write(context, "Ingest one evidence-bound external provider fact.", "INGEST_PROVIDER_FACT", input,
      (transaction, envelope) => transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
        SELECT entral.phase204_ingest_provider_fact(${envelope}::jsonb) AS "value"
      `));
  }

  recordMetricTruth(context: Phase204InternalCommerceMemberContext, input: JsonRecord) {
    return this.write(context, "Record one exact observed-or-unavailable commerce metric.", "RECORD_METRIC_TRUTH", input,
      (transaction, envelope) => transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
        SELECT entral.phase204_record_metric_truth(${envelope}::jsonb) AS "value"
      `));
  }

  setControl(context: Phase204InternalCommerceMemberContext, input: JsonRecord) {
    const ownerAction = ["KILL_BUSINESS", "RESUME_BUSINESS", "ENABLE_PUBLICATION"].includes(String(input.action));
    return this.write(context, "Apply one bounded internal commerce control.", "SET_COMMERCE_CONTROL", input,
      (transaction, envelope) => transaction.$queryRaw<JsonValueRow[]>(Prisma.sql`
        SELECT entral.phase204_set_commerce_control(${envelope}::jsonb) AS "value"
      `), { recentMfa: ownerAction });
  }
}

export const phase204InternalCommerceService = new Phase204InternalCommerceService();
