import {
  CAPABILITY_EVIDENCE_TYPES,
  PHASE204_DELIVERY_ASSET_ROLES,
  PHASE204_OPERATIONAL_METRICS,
  PHASE204_PRODUCT_LINE,
  PHASE204_SETUP_SPEND_LIMIT_CENTS
} from "@entral/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z, ZodError, type ZodType } from "zod";
import { requireAuth, setPrivateNoStoreHeaders, type AuthUser } from "../auth.js";
import { hasVerifiedMemberTeamAccess, prisma } from "../db.js";
import { env } from "../env.js";
import {
  Phase204InternalCommerceServiceError,
  phase204InternalCommerceService,
  type Phase204InternalCommerceMemberContext,
  type Phase204InternalCommerceService
} from "../services/phase204InternalCommerce.js";

const uuid = z.string().uuid();
const sha256 = z.string().regex(/^[0-9a-f]{64}$/u);
const gitSha = z.string().regex(/^[0-9a-f]{40}$/u);
const timestamp = z.string().datetime({ offset: true });
const repositoryReference = z.string().regex(/^[^@\s]+@[0-9a-f]{40}:.+$/u).max(2_000);
const boundedText = (maximum = 2_000) => z.string().trim().min(1).max(maximum);
const nullableUuid = uuid.nullable();
const idempotencyKeySchema = z.string().trim().min(12).max(255);

const paramsSchema = z.object({ organizationId: z.string().cuid() }).strict();
const memberOrganizationParamsSchema = z.object({ organizationId: z.string().cuid() }).passthrough();
const capabilityParamsSchema = paramsSchema.extend({ capabilityId: uuid }).strict();
const installationParamsSchema = paramsSchema.extend({ installationId: uuid }).strict();
const productParamsSchema = paramsSchema.extend({ productId: uuid }).strict();
const storefrontParamsSchema = paramsSchema.extend({ storefrontId: uuid }).strict();

const activationSchema = z.object({
  activation_id: uuid,
  artifact_storage_uri: repositoryReference,
  content_sha256: sha256,
  evidence_artifact_id: uuid,
  release_commit_sha: gitSha,
  repository_reference: repositoryReference,
  requested_at: timestamp,
  source_record_id: uuid
}).strict().superRefine((value, context) => {
  const marker = `@${value.release_commit_sha}:`;
  if (!value.repository_reference.includes(marker) || !value.artifact_storage_uri.includes(marker)) {
    context.addIssue({ code: "custom", message: "Repository evidence must bind the exact release commit." });
  }
});

const activationRequirementSchema = z.object({
  description: boundedText(1_000),
  evidence_receipt_ids: z.array(uuid).length(0),
  required: z.literal(true),
  requirement_code: z.string().regex(/^[A-Z0-9][A-Z0-9_]{2,79}$/u),
  satisfied: z.literal(false)
}).strict();

const capabilityRegistrationSchema = z.object({
  activation_requirements: z.array(activationRequirementSchema).min(1),
  catalog_capability_id: uuid,
  deactivation_path: boundedText(),
  implementation_reference: repositoryReference,
  limitations: z.array(boundedText(1_000)).max(50),
  owner: boundedText(320),
  purpose: boundedText(),
  requested_at: timestamp,
  required_evidence: z.array(z.enum(CAPABILITY_EVIDENCE_TYPES)).min(1),
  rollback_path: boundedText(),
  tenant_capability_id: uuid
}).strict();

const capabilityEvidenceSchema = z.object({
  capability_id: uuid,
  captured_at: timestamp,
  content_sha256: sha256,
  environment: z.literal("PRODUCTION"),
  evidence_type: z.enum(CAPABILITY_EVIDENCE_TYPES),
  expected_record_version: z.number().int().positive(),
  expires_at: timestamp.nullable(),
  receipt_id: uuid,
  reference: boundedText(2_000),
  status: z.enum(["PASSED", "FAILED"])
}).strict();

const capabilityRequirementSchema = z.object({
  capability_id: uuid,
  evidence_receipt_ids: z.array(uuid).min(1),
  expected_record_version: z.number().int().positive(),
  requested_at: timestamp,
  requirement_code: z.string().regex(/^[A-Z0-9][A-Z0-9_]{2,79}$/u)
}).strict();

const capabilityTransitionSchema = z.object({
  business_id: nullableUuid,
  capability_id: uuid,
  correlation_id: uuid,
  evidence_receipt_ids: z.array(uuid),
  expected_record_version: z.number().int().positive(),
  from_state: z.enum(["CATALOGUED", "DESIGNED", "IMPLEMENTED", "UNIT_VERIFIED", "INTEGRATION_VERIFIED", "CANARY_VERIFIED", "ACTIVE"]),
  reason: boundedText(),
  requested_at: timestamp,
  to_state: z.enum(["IMPLEMENTED", "UNIT_VERIFIED", "INTEGRATION_VERIFIED", "CANARY_VERIFIED", "ACTIVE"]),
  transition_id: uuid
}).strict();

const installationRegistrationSchema = z.object({
  business_boundary_id: uuid,
  capability_id: uuid,
  installation_id: uuid,
  requested_at: timestamp
}).strict();

const installationTransitionSchema = z.object({
  correlation_id: uuid,
  evidence_receipt_ids: z.array(uuid),
  expected_record_version: z.number().int().positive(),
  from_state: z.enum(["AVAILABLE", "ACTIVATING", "ACTIVE", "SUSPENDED"]),
  installation_id: uuid,
  reason: boundedText(),
  requested_at: timestamp,
  to_state: z.enum(["ACTIVATING", "ACTIVE", "SUSPENDED"]),
  transition_id: uuid
}).strict();

const productAssetSchema = z.object({
  artifact_id: uuid,
  asset_role: z.enum(PHASE204_DELIVERY_ASSET_ROLES),
  asset_version: z.string().regex(/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/u),
  byte_size: z.number().int().safe().positive(),
  content_sha256: sha256,
  editable: z.boolean(),
  file_name: boundedText(255),
  media_type: boundedText(255),
  product_asset_id: uuid,
  product_id: uuid,
  source_reference: repositoryReference
}).strict();

const productEvidenceSchema = z.object({
  artifact_id: uuid,
  byte_size: z.number().int().safe().positive(),
  captured_at: timestamp,
  content_sha256: sha256,
  evidence_code: z.string().regex(/^[A-Z0-9][A-Z0-9_]{2,79}$/u),
  evidence_kind: z.enum(["PRODUCT_ASSET", "PRODUCT_GATE"]),
  file_name: boundedText(255),
  media_type: boundedText(255),
  product_id: uuid,
  source_record_id: uuid,
  source_reference: repositoryReference
}).strict();

const gateBase = {
  checked_at: timestamp,
  evidence_ids: z.array(uuid).min(1),
  status: z.enum(["PASSED", "FAILED"])
} as const;
const gatePayloadSchema = z.union([
  z.object({ ...gateBase, copied_content: z.boolean(), generic_prompt_collection: z.boolean(), original_work: z.boolean() }).strict(),
  z.object({ ...gateBase, permitted_use_terms_asset_id: uuid, unresolved_rights: z.boolean() }).strict(),
  z.object({ ...gateBase, claims_sha256: sha256, unsupported_claim_count: z.number().int().nonnegative() }).strict(),
  z.object({ ...gateBase, ai_assisted: z.boolean(), disclosure_included: z.boolean(), disclosure_text: z.string().max(2_000) }).strict(),
  z.object({ ...gateBase, delivery_manifest_sha256: sha256, invalid_file_count: z.number().int().nonnegative() }).strict(),
  z.object({ ...gateBase, customer_delivery_tested: z.boolean(), missing_asset_roles: z.array(z.enum(PHASE204_DELIVERY_ASSET_ROLES)), support_ready: z.boolean() }).strict()
]);

const productGateSchema = z.object({
  assessed_at: timestamp,
  assertion_summary: boundedText(),
  evidence_artifact_id: nullableUuid,
  evidence_ids: z.array(uuid).min(1),
  evidence_sha256: sha256,
  evidence_source_record_id: nullableUuid,
  gate_payload: gatePayloadSchema,
  gate_receipt_id: uuid,
  gate_type: z.enum(["ORIGINALITY", "LICENSING", "CLAIMS", "AI_DISCLOSURE", "FILE_INTEGRITY", "DELIVERY_READINESS"]),
  product_id: uuid,
  status: z.enum(["PASSED", "FAILED"])
}).strict().superRefine((value, context) => {
  if (Number(value.evidence_artifact_id !== null) + Number(value.evidence_source_record_id !== null) !== 1) {
    context.addIssue({ code: "custom", message: "Exactly one primary evidence record is required." });
  }
  if (value.gate_payload.status !== value.status || JSON.stringify(value.gate_payload.evidence_ids) !== JSON.stringify(value.evidence_ids)) {
    context.addIssue({ code: "custom", message: "Gate payload status and evidence must match the envelope." });
  }
});

const storefrontStateSchema = z.object({
  etsy_blocker_code: z.enum(["ACCOUNT_CREATION", "ADDRESS_VERIFICATION", "BANKING_VERIFICATION", "IDENTITY_VERIFICATION", "PROVIDER_RESTRICTION"]).nullable(),
  etsy_blocker_evidence_source_record_id: nullableUuid,
  market_evidence_source_record_id: nullableUuid,
  occurred_at: timestamp,
  provider: z.enum(["ETSY", "GUMROAD"]),
  provider_policy_evidence_ids: z.array(uuid),
  public_brand: z.string().trim().min(1).max(160).nullable(),
  state: z.enum(["OWNER_ACTION_REQUIRED", "BLOCKED", "READY_FOR_OWNER_APPROVAL", "PUBLISHED", "PAUSED", "DISABLED"]),
  state_reason: boundedText(),
  storefront_state_event_id: uuid,
  storefront_id: uuid
}).strict();

const productApprovalSchema = z.object({
  approved: z.literal(true),
  claims_sha256: sha256,
  delivery_manifest_sha256: sha256,
  price_cents: z.number().int().safe().nonnegative(),
  product_code: z.enum(PHASE204_PRODUCT_LINE.map((product) => product.product_code) as [
    (typeof PHASE204_PRODUCT_LINE)[number]["product_code"],
    ...(typeof PHASE204_PRODUCT_LINE)[number]["product_code"][]
  ])
}).strict();

const publicationApprovalSchema = z.object({
  advertising_budget_cents: z.literal(0),
  approval_id: uuid,
  approved: z.literal(true),
  approved_at: timestamp,
  authority: z.literal("FIRST_EXTERNAL_PUBLICATION"),
  envelope_sha256: sha256,
  product_approvals: z.array(productApprovalSchema).length(PHASE204_PRODUCT_LINE.length),
  public_brand_name: boundedText(160),
  revoked_at: z.null(),
  selected_provider: z.enum(["ETSY", "GUMROAD"]),
  setup_spend_limit_cents: z.number().int().safe().min(0).max(PHASE204_SETUP_SPEND_LIMIT_CENTS),
  storefront_id: uuid
}).strict().superRefine((value, context) => {
  const approvals = new Map(value.product_approvals.map((approval) => [approval.product_code, approval]));
  if (approvals.size !== PHASE204_PRODUCT_LINE.length) {
    context.addIssue({ code: "custom", path: ["product_approvals"], message: "Every product must be approved exactly once." });
    return;
  }
  for (const product of PHASE204_PRODUCT_LINE) {
    if (approvals.get(product.product_code)?.price_cents !== product.price_cents) {
      context.addIssue({ code: "custom", path: ["product_approvals"], message: "Product prices must match the exact product line." });
      return;
    }
  }
});

const listingSchema = z.object({
  delivery_manifest_sha256: sha256,
  listing_record_id: uuid,
  price_cents: z.number().int().safe().nonnegative(),
  product_code: z.enum(PHASE204_PRODUCT_LINE.map((product) => product.product_code) as [
    (typeof PHASE204_PRODUCT_LINE)[number]["product_code"],
    ...(typeof PHASE204_PRODUCT_LINE)[number]["product_code"][]
  ]),
  provider_evidence_ids: z.array(uuid),
  provider_listing_id: z.string().trim().min(1).max(300).nullable(),
  published_at: timestamp.nullable(),
  status: z.enum(["DRAFT", "READY_FOR_OWNER_APPROVAL", "PUBLISHED", "PAUSED", "DISABLED"]),
  storefront_id: uuid
}).strict().superRefine((value, context) => {
  const product = PHASE204_PRODUCT_LINE.find((candidate) => candidate.product_code === value.product_code);
  if (product?.price_cents !== value.price_cents) {
    context.addIssue({ code: "custom", path: ["price_cents"], message: "Listing price must match the exact product line." });
  }
  const publishedEvidence = value.provider_listing_id !== null
    && value.published_at !== null
    && value.provider_evidence_ids.length > 0;
  if ((value.status === "PUBLISHED") !== publishedEvidence) {
    context.addIssue({ code: "custom", message: "Published listings require exact provider evidence; non-published listings cannot claim publication." });
  }
});

const providerFactSchema = z.object({
  amount_cents: z.number().int().safe().nullable(),
  captured_at: timestamp,
  currency: z.literal("USD").nullable(),
  evidence_artifact_id: nullableUuid,
  evidence_sha256: sha256,
  evidence_source_record_id: nullableUuid,
  fact_state: z.enum(["OBSERVED", "UNAVAILABLE"]),
  fact_type: z.enum(["LISTING", "ORDER", "SALE", "FEE", "REFUND", "DISPUTE", "MESSAGE", "DELIVERY", "PAYOUT"]),
  fee_category: z.enum(["PLATFORM", "PAYMENT_PROCESSING", "OTHER"]).nullable(),
  occurred_at: timestamp,
  outcome: boundedText(1_000),
  product_id: nullableUuid,
  provider: z.enum(["ETSY", "GUMROAD"]),
  provider_external_reference_sha256: sha256.nullable(),
  provider_fact_id: uuid,
  quantity: z.number().int().safe().nonnegative().nullable(),
  storefront_id: uuid,
  unavailable_reason: z.string().trim().min(1).max(1_000).nullable()
}).strict().superRefine((value, context) => {
  if (Number(value.evidence_artifact_id !== null) + Number(value.evidence_source_record_id !== null) !== 1) {
    context.addIssue({ code: "custom", message: "Exactly one primary evidence record is required." });
  }
  if (value.fact_state === "OBSERVED") {
    if (value.provider_external_reference_sha256 === null || value.unavailable_reason !== null) {
      context.addIssue({ code: "custom", message: "Observed provider facts require an external reference and cannot claim unavailability." });
    }
    if (["SALE", "FEE", "REFUND", "PAYOUT"].includes(value.fact_type)
      && (value.amount_cents === null || value.currency !== "USD")) {
      context.addIssue({ code: "custom", message: "Observed monetary facts require exact USD cents." });
    }
    if ((value.fact_type === "FEE") !== (value.fee_category !== null)) {
      context.addIssue({ code: "custom", message: "Fee category is accepted only for fee facts and is required there." });
    }
  } else if (
    value.provider_external_reference_sha256 !== null || value.amount_cents !== null || value.currency !== null
    || value.quantity !== null || value.fee_category !== null || value.unavailable_reason === null
  ) {
    context.addIssue({ code: "custom", message: "Unavailable provider facts cannot carry observed values or references." });
  }
});

const metricSchema = z.object({
  currency: z.literal("USD").nullable(),
  evidence_id: nullableUuid,
  is_estimate: z.literal(false),
  metric_code: z.enum(PHASE204_OPERATIONAL_METRICS),
  metric_id: uuid,
  observed_at: timestamp.nullable(),
  provider_record_id: nullableUuid,
  scope: z.object({
    scope_code: z.string().min(1).max(100),
    scope_type: z.enum(["BUSINESS", "PRODUCT"])
  }).strict(),
  source_type: z.enum(["PROVIDER_TRANSACTION", "PROVIDER_FEE", "PROVIDER_REFUND", "PROVIDER_ANALYTICS", "PROVIDER_MESSAGE", "CANONICAL_CALCULATION"]).nullable(),
  storefront_id: uuid,
  truth_state: z.enum(["OBSERVED", "UNAVAILABLE"]),
  unavailable_reason: z.string().trim().min(1).max(1_000).nullable(),
  unit: z.enum(["USD_CENTS", "RATIO", "COUNT", "SCORE"]),
  value: z.number().finite().nullable()
}).strict().superRefine((value, context) => {
  if (value.unit === "USD_CENTS" && value.value !== null && !Number.isSafeInteger(value.value)) {
    context.addIssue({ code: "custom", path: ["value"], message: "USD cents must be an exact safe integer." });
  }
  const moneyMetric = [
    "GROSS_SALES", "PLATFORM_FEES", "PAYMENT_PROCESSING_FEES", "REFUNDS", "NET_RECEIPTS", "CONTRIBUTION_MARGIN"
  ].includes(value.metric_code);
  if ((moneyMetric && (value.unit !== "USD_CENTS" || value.currency !== "USD")) || (!moneyMetric && value.currency !== null)) {
    context.addIssue({ code: "custom", message: "Metric unit and currency do not match the metric code." });
  }
  if (value.truth_state === "OBSERVED") {
    if (value.value === null || value.provider_record_id === null || value.source_type === null
      || value.evidence_id === null || value.observed_at === null || value.unavailable_reason !== null) {
      context.addIssue({ code: "custom", message: "Observed metrics require exact provider evidence and cannot claim unavailability." });
    }
  } else if (value.value !== null || value.provider_record_id !== null || value.source_type !== null
    || value.evidence_id !== null || value.observed_at !== null || value.unavailable_reason === null) {
    context.addIssue({ code: "custom", message: "Unavailable metrics cannot carry observed values or references." });
  }
});

const controlSchema = z.object({
  action: z.enum(["PAUSE_BUSINESS", "RESUME_BUSINESS", "DISABLE_PUBLICATION", "ENABLE_PUBLICATION", "KILL_BUSINESS"]),
  business_boundary_id: uuid,
  control_event_id: uuid,
  evidence_ids: z.array(uuid),
  occurred_at: timestamp,
  reason: boundedText()
}).strict();

type AccessChecker = typeof hasVerifiedMemberTeamAccess;

export type Phase204InternalCommerceRoutesOptions = {
  accessChecker?: AccessChecker;
  clock?: () => Date;
  service?: Phase204InternalCommerceService;
};

function durableRecentStepUp(user: AuthUser, clock: () => Date) {
  const stepUpAt = user.stepUpAt ? Date.parse(user.stepUpAt) : Number.NaN;
  const now = clock().getTime();
  return user.tokenVersion === 2 && Boolean(user.sessionId && user.actorId)
    && Number.isFinite(stepUpAt) && stepUpAt <= now
    && now - stepUpAt <= env.MFA_STEP_UP_TTL_SECONDS * 1_000;
}

function serviceFailure(error: unknown, reply: FastifyReply) {
  if (error instanceof Phase204InternalCommerceServiceError) {
    return reply.code(error.statusCode).send({
      error: error.statusCode >= 500 ? "Service Unavailable" : "Request Error",
      code: error.code,
      message: error.statusCode >= 500 ? "Internal commerce is temporarily unavailable." : error.message
    });
  }
  return reply.code(503).send({
    error: "Service Unavailable",
    code: "INTERNAL_COMMERCE_UNAVAILABLE",
    message: "Internal commerce is temporarily unavailable."
  });
}

function invalidRequest(error: ZodError, reply: FastifyReply) {
  return reply.code(400).send({
    error: "Bad Request",
    code: "INVALID_INTERNAL_COMMERCE_REQUEST",
    message: "The internal commerce request is invalid.",
    fields: error.issues.map((issue) => issue.path.join(".")).filter(Boolean).slice(0, 10)
  });
}

function idempotencyKey(request: FastifyRequest, reply: FastifyReply) {
  const raw = request.headers["idempotency-key"];
  const parsed = idempotencyKeySchema.safeParse(Array.isArray(raw) ? raw[0] : raw);
  if (!parsed.success) {
    reply.code(400).send({ error: "Bad Request", code: "IDEMPOTENCY_KEY_INVALID", message: "A valid idempotency-key header is required." });
    return null;
  }
  return parsed.data;
}

async function memberContext(
  request: FastifyRequest,
  reply: FastifyReply,
  accessChecker: AccessChecker,
  clock: () => Date
): Promise<{ context: Phase204InternalCommerceMemberContext; organizationId: string } | null> {
  setPrivateNoStoreHeaders(reply);
  const user = request.user;
  if (user?.session !== "member" || !user.tenantId || !user.organizationId || !user.actorId || !user.sessionId) {
    reply.code(401).send({ error: "Unauthorized", message: "A durable tenant-bound member session is required." });
    return null;
  }
  const parsed = memberOrganizationParamsSchema.safeParse(request.params);
  if (!parsed.success) {
    invalidRequest(parsed.error, reply);
    return null;
  }
  const access = await accessChecker(prisma, {
    authSubject: user.sub,
    organizationId: user.organizationId,
    requestId: request.id,
    teamId: parsed.data.organizationId,
    tenantId: user.tenantId
  });
  if (!access) {
    reply.code(404).send({ error: "Not Found", message: "Organization not found." });
    return null;
  }
  return {
    organizationId: parsed.data.organizationId,
    context: {
      authSubject: user.sub,
      organizationId: user.organizationId,
      recentMfaVerified: durableRecentStepUp(user, clock),
      requestId: request.id,
      tenantId: user.tenantId
    }
  };
}

function assertRouteId(body: Record<string, unknown>, field: string, routeValue: string, reply: FastifyReply) {
  if (body[field] !== routeValue) {
    reply.code(400).send({ error: "Bad Request", code: "ROUTE_SCOPE_MISMATCH", message: `${field} must match the route.` });
    return false;
  }
  return true;
}

export async function phase204InternalCommerceRoutes(
  app: FastifyInstance,
  options: Phase204InternalCommerceRoutesOptions = {}
) {
  const service = options.service ?? phase204InternalCommerceService;
  const accessChecker = options.accessChecker ?? hasVerifiedMemberTeamAccess;
  const clock = options.clock ?? (() => new Date());

  app.get("/member/organizations/:organizationId/internal-commerce", { preHandler: requireAuth }, async (request, reply) => {
    const member = await memberContext(request, reply, accessChecker, clock);
    if (!member) return;
    try {
      const readback = await service.getReadback(member.context);
      return reply.send({
        ...readback,
        session_authority: {
          recent_mfa_verified: member.context.recentMfaVerified
        }
      });
    } catch (error) {
      return serviceFailure(error, reply);
    }
  });

  const registerMutation = <T extends Record<string, unknown>>(
    suffix: string,
    schema: ZodType<T>,
    operation: (context: Phase204InternalCommerceMemberContext, input: T & { idempotency_key: string }) => Promise<unknown>,
    routeId?: { field: string; params: ZodType<Record<string, string>>; param: string },
    recentMfaRequired: (input: T) => boolean = () => false
  ) => {
    app.post(`/member/organizations/:organizationId/internal-commerce${suffix}`, { preHandler: requireAuth }, async (request, reply) => {
      const member = await memberContext(request, reply, accessChecker, clock);
      if (!member) return;
      const key = idempotencyKey(request, reply);
      if (!key) return;
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) return invalidRequest(parsed.error, reply);
      if (routeId) {
        const route = routeId.params.safeParse(request.params);
        if (!route.success) return invalidRequest(route.error, reply);
        if (!assertRouteId(parsed.data, routeId.field, route.data[routeId.param]!, reply)) return;
      }
      if (recentMfaRequired(parsed.data) && !member.context.recentMfaVerified) {
        return reply.code(403).send({
          error: "Forbidden",
          code: "RECENT_MFA_STEP_UP_REQUIRED",
          message: "A durable session with recent MFA step-up is required."
        });
      }
      try {
        return reply.send(await operation(member.context, { ...parsed.data, idempotency_key: key }));
      } catch (error) {
        return serviceFailure(error, reply);
      }
    });
  };

  registerMutation("/activation", activationSchema, (context, input) => service.activate(context, input));
  registerMutation("/capabilities", capabilityRegistrationSchema, (context, input) => service.registerCapability(context, input));
  registerMutation("/capabilities/:capabilityId/evidence", capabilityEvidenceSchema,
    (context, input) => service.recordCapabilityEvidence(context, input),
    { field: "capability_id", param: "capabilityId", params: capabilityParamsSchema });
  registerMutation("/capabilities/:capabilityId/requirements", capabilityRequirementSchema,
    (context, input) => service.bindCapabilityRequirement(context, input),
    { field: "capability_id", param: "capabilityId", params: capabilityParamsSchema });
  registerMutation("/capabilities/:capabilityId/transitions", capabilityTransitionSchema,
    (context, input) => service.transitionCapability(context, { ...input, pricing_eligibility: "NOT_ELIGIBLE" }),
    { field: "capability_id", param: "capabilityId", params: capabilityParamsSchema });
  registerMutation("/installations", installationRegistrationSchema, (context, input) => service.registerInstallation(context, input));
  registerMutation("/installations/:installationId/transitions", installationTransitionSchema,
    (context, input) => service.transitionInstallation(context, input),
    { field: "installation_id", param: "installationId", params: installationParamsSchema });
  registerMutation("/products/:productId/evidence", productEvidenceSchema,
    (context, input) => service.registerProductEvidence(context, input),
    { field: "product_id", param: "productId", params: productParamsSchema });
  registerMutation("/products/:productId/assets", productAssetSchema,
    (context, input) => service.registerProductAsset(context, input),
    { field: "product_id", param: "productId", params: productParamsSchema });
  registerMutation("/products/:productId/gates", productGateSchema,
    (context, input) => service.recordProductGate(context, input),
    { field: "product_id", param: "productId", params: productParamsSchema });
  registerMutation("/storefronts/:storefrontId/states", storefrontStateSchema,
    (context, input) => service.recordStorefrontState(context, input),
    { field: "storefront_id", param: "storefrontId", params: storefrontParamsSchema },
    (input) => input.state === "PUBLISHED");
  registerMutation("/storefronts/:storefrontId/publication-approvals", publicationApprovalSchema,
    (context, input) => service.approvePublication(context, input),
    { field: "storefront_id", param: "storefrontId", params: storefrontParamsSchema },
    () => true);
  registerMutation("/storefronts/:storefrontId/listings", listingSchema,
    (context, input) => service.recordListingState(context, input),
    { field: "storefront_id", param: "storefrontId", params: storefrontParamsSchema },
    (input) => input.status === "PUBLISHED");
  registerMutation("/storefronts/:storefrontId/provider-facts", providerFactSchema,
    (context, input) => service.ingestProviderFact(context, input),
    { field: "storefront_id", param: "storefrontId", params: storefrontParamsSchema });
  registerMutation("/storefronts/:storefrontId/metrics", metricSchema,
    (context, input) => service.recordMetricTruth(context, input),
    { field: "storefront_id", param: "storefrontId", params: storefrontParamsSchema });
  registerMutation("/controls", controlSchema, (context, input) => service.setControl(context, input), undefined,
    (input) => ["KILL_BUSINESS", "RESUME_BUSINESS", "ENABLE_PUBLICATION"].includes(input.action));
}
