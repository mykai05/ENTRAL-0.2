import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ContractError,
  PHASE204_ADVERTISING_BUDGET_CENTS,
  PHASE204_CONTROL_CODES,
  PHASE204_DELIVERY_ASSET_ROLES,
  PHASE204_INTERNAL_AUTHORITY,
  PHASE204_INTERNAL_BUSINESS_CODE,
  PHASE204_INTERNAL_BUSINESS_WORKING_NAME,
  PHASE204_INTERNAL_CAPABILITY_SEQUENCE,
  PHASE204_OPERATIONAL_METRICS,
  PHASE204_PRODUCT_LINE,
  PHASE204_SETUP_SPEND_LIMIT_CENTS,
  assertPhase204InternalCommerceActivationRequest,
  assertPhase204InternalCommerceActivationResult,
  assertPhase204InternalCommerceEnvelope,
  evaluatePhase204InternalCommercePublication,
  parsePhase204InternalCommerceActivationRequest
} from "../dist/index.js";

const now = "2026-08-03T18:00:00.000Z";
const repositorySha = "4".repeat(40);
const tenantId = uuid(1);
const organizationId = uuid(2);
const actorId = uuid(3);
const businessId = uuid(4);
const capabilityId = uuid(5);

function uuid(index) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function hash(index) {
  return index.toString(16).slice(-1).repeat(64);
}

function productFixture(spec, productIndex) {
  const assets = PHASE204_DELIVERY_ASSET_ROLES.map((role, roleIndex) => ({
    asset_id: uuid(1000 + productIndex * 100 + roleIndex),
    product_code: spec.product_code,
    role,
    file_name: `${spec.product_code.toLowerCase()}-${role.toLowerCase()}.pdf`,
    media_type: role === "EDITABLE_SOURCE" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf",
    editable: role === "EDITABLE_SOURCE",
    byte_size: 2048 + roleIndex,
    content_sha256: hash((productIndex + roleIndex) % 15),
    version: "1.0.0",
    source_reference: `mykai05/ENTRAL-0.2@${repositorySha}:artifacts/phase204/${spec.product_code}/${role}.pdf`,
    readiness: "FINAL",
    license_status: "CLEARED"
  }));
  const evidence = uuid(2000 + productIndex);
  const manifestHash = hash(productIndex + 1);
  const claimsHash = hash(productIndex + 6);
  return {
    product_id: uuid(100 + productIndex),
    product_code: spec.product_code,
    name: spec.name,
    kind: spec.kind,
    currency: "USD",
    price_cents: spec.price_cents,
    version: "1.0.0",
    delivery_manifest_sha256: manifestHash,
    claims_sha256: claimsHash,
    component_product_codes: spec.kind === "BUNDLE"
      ? PHASE204_PRODUCT_LINE.filter((candidate) => candidate.kind === "PRODUCT").map((candidate) => candidate.product_code)
      : [],
    assets,
    claims: [{
      claim_id: uuid(3000 + productIndex),
      claim_text: `${spec.name} contains the verified delivery files identified in its manifest.`,
      evidence_ids: [evidence],
      support_state: "EVIDENCE_VERIFIED"
    }],
    gates: {
      originality: {
        status: "PASSED",
        original_work: true,
        copied_content: false,
        generic_prompt_collection: false,
        evidence_ids: [evidence],
        checked_at: now
      },
      licensing: {
        status: "PASSED",
        unresolved_rights: false,
        permitted_use_terms_asset_id: assets.find((asset) => asset.role === "LICENSE_TERMS").asset_id,
        evidence_ids: [evidence],
        checked_at: now
      },
      claims: {
        status: "PASSED",
        unsupported_claim_count: 0,
        claims_sha256: claimsHash,
        evidence_ids: [evidence],
        checked_at: now
      },
      ai_disclosure: {
        status: "PASSED",
        ai_assisted: true,
        disclosure_included: true,
        disclosure_text: "AI assisted drafting; every delivered asset was reviewed and verified by the publisher.",
        evidence_ids: [evidence],
        checked_at: now
      },
      file_integrity: {
        status: "PASSED",
        invalid_file_count: 0,
        delivery_manifest_sha256: manifestHash,
        evidence_ids: [evidence],
        checked_at: now
      },
      delivery_readiness: {
        status: "PASSED",
        missing_asset_roles: [],
        customer_delivery_tested: true,
        support_ready: true,
        evidence_ids: [evidence],
        checked_at: now
      }
    },
    contains_placeholder_content: false,
    contains_unfinished_files: false,
    contains_unresolved_licensing: false
  };
}

function metricUnit(metric) {
  if ([
    "GROSS_SALES", "PLATFORM_FEES", "PAYMENT_PROCESSING_FEES", "REFUNDS", "NET_RECEIPTS", "CONTRIBUTION_MARGIN"
  ].includes(metric)) return ["USD_CENTS", "USD"];
  if (metric === "CONVERSION") return ["RATIO", null];
  if (metric === "PRODUCT_PERFORMANCE") return ["SCORE", null];
  return ["COUNT", null];
}

function metricFixture(metric, scope, index) {
  const [unit, currency] = metricUnit(metric);
  return {
    metric_id: uuid(4000 + index),
    metric_code: metric,
    scope,
    truth_state: "UNAVAILABLE",
    value: null,
    unit,
    currency,
    provider_record_id: null,
    source_type: null,
    evidence_id: null,
    observed_at: null,
    unavailable_reason: "The storefront has not produced an observed provider record for this metric.",
    is_estimate: false
  };
}

function activationRequest() {
  const products = PHASE204_PRODUCT_LINE.map(productFixture);
  const scopes = [
    { scope_type: "BUSINESS", scope_code: PHASE204_INTERNAL_BUSINESS_CODE },
    ...PHASE204_PRODUCT_LINE.map((product) => ({ scope_type: "PRODUCT", scope_code: product.product_code }))
  ];
  let metricIndex = 0;
  const operationalMetrics = scopes.flatMap((scope) => PHASE204_OPERATIONAL_METRICS.map(
    (metric) => metricFixture(metric, scope, metricIndex++)
  ));
  return {
    record_type: "ACTIVATION_REQUEST",
    contract_version: "1.0.0",
    schema_version: 1,
    request_id: uuid(10),
    idempotency_key: "phase204:internal-commerce:activation:001",
    requested_at: now,
    actor_id: actorId,
    tenant_id: tenantId,
    organization_id: organizationId,
    business: {
      business_id: businessId,
      internal_code: PHASE204_INTERNAL_BUSINESS_CODE,
      working_name: PHASE204_INTERNAL_BUSINESS_WORKING_NAME,
      brand: {
        public_brand_name: "Field Command Works",
        selection_method: "MARKET_EVIDENCE_REVIEW",
        candidate_count: 3,
        market_evidence_ids: [uuid(20), uuid(21)],
        selected_by_actor_id: actorId,
        selected_at: now,
        is_placeholder: false
      },
      marshal: { ...PHASE204_INTERNAL_AUTHORITY.marshal },
      general: { ...PHASE204_INTERNAL_AUTHORITY.general },
      commander: {
        entity_id: uuid(22),
        stable_code: "C-SP-COMMERCE-001",
        display_name: "Field Command Works Commander",
        parent_entity_id: PHASE204_INTERNAL_AUTHORITY.general.entity_id,
        business_id: businessId
      },
      mission_ids: [uuid(23)],
      soldier_entity_ids: [uuid(24), uuid(25)]
    },
    capability_activations: [{
      capability_id: capabilityId,
      capability_version: "1.0.0",
      environment: "PRODUCTION",
      scope: "TENANT",
      tenant_id: tenantId,
      organization_id: organizationId,
      lifecycle_sequence: [...PHASE204_INTERNAL_CAPABILITY_SEQUENCE],
      final_lifecycle_state: "ACTIVE",
      pricing_eligibility: "NOT_ELIGIBLE",
      public_claim_eligible: false,
      production_readiness: "REAL",
      internal_use_only: true,
      evidence_receipt_ids: [uuid(30), uuid(31), uuid(32), uuid(33)]
    }],
    products,
    storefront: {
      selected_provider: "ETSY",
      etsy_onboarding: { status: "OWNER_ACTION_REQUIRED", blocker: null },
      storefront_id: null,
      status: "OWNER_ACTION_REQUIRED",
      provider_policy_checked_at: now,
      provider_policy_evidence_ids: [uuid(40)],
      listings: products.map((product) => ({
        product_code: product.product_code,
        provider_listing_id: null,
        status: "DRAFT",
        price_cents: product.price_cents,
        delivery_manifest_sha256: product.delivery_manifest_sha256,
        published_at: null,
        provider_evidence_ids: []
      }))
    },
    publication_approval: null,
    budget: {
      currency: "USD",
      setup_spend_limit_cents: PHASE204_SETUP_SPEND_LIMIT_CENTS,
      setup_spend_committed_cents: 0,
      advertising_budget_cents: PHASE204_ADVERTISING_BUDGET_CENTS
    },
    operational_metrics: operationalMetrics,
    controls: PHASE204_CONTROL_CODES.map((control, index) => ({
      control_id: uuid(50 + index),
      control_code: control,
      availability: "AVAILABLE",
      state: "ARMED",
      requires_owner_approval: control === "KILL_BUSINESS",
      last_action_id: null,
      reason: null,
      evidence_ids: [uuid(60 + index)],
      verified_at: now,
      version: 1
    }))
  };
}

function publicationReadyRequest() {
  const request = structuredClone(activationRequest());
  request.storefront.etsy_onboarding = { status: "READY", blocker: null };
  request.storefront.storefront_id = "etsy-shop-verified-001";
  request.storefront.status = "READY_FOR_OWNER_APPROVAL";
  request.storefront.listings = request.products.map((product, index) => ({
    product_code: product.product_code,
    provider_listing_id: `etsy-draft-${index + 1}`,
    status: "READY_FOR_OWNER_APPROVAL",
    price_cents: product.price_cents,
    delivery_manifest_sha256: product.delivery_manifest_sha256,
    published_at: null,
    provider_evidence_ids: [uuid(70 + index)]
  }));
  request.publication_approval = {
    approval_id: uuid(80),
    authority: "FIRST_EXTERNAL_PUBLICATION",
    approved: true,
    owner_actor_id: actorId,
    approved_at: now,
    selected_provider: "ETSY",
    storefront_id: request.storefront.storefront_id,
    public_brand_name: request.business.brand.public_brand_name,
    product_approvals: request.products.map((product) => ({
      product_code: product.product_code,
      price_cents: product.price_cents,
      delivery_manifest_sha256: product.delivery_manifest_sha256,
      claims_sha256: product.claims_sha256,
      approved: true
    })),
    setup_spend_limit_cents: PHASE204_SETUP_SPEND_LIMIT_CENTS,
    advertising_budget_cents: 0,
    envelope_sha256: hash(15),
    revoked_at: null
  };
  return request;
}

test("Phase 204 contract fixes the exact internal authority, product line, prices, and zero-ad budget", () => {
  assert.equal(PHASE204_INTERNAL_BUSINESS_CODE, "SP-COMMERCE-001");
  assert.equal(PHASE204_INTERNAL_AUTHORITY.marshal.stable_code, "M02");
  assert.equal(PHASE204_INTERNAL_AUTHORITY.general.stable_code, "G-M02-07");
  assert.deepEqual(PHASE204_PRODUCT_LINE.map(({ name, price_cents }) => [name, price_cents]), [
    ["Lead Response and Estimate Follow-Up Kit", 2900],
    ["Scope and Change-Order Control Pack", 4900],
    ["Billing and Collections Accelerator", 4900],
    ["Weekly Owner Command Dashboard", 3900],
    ["Complete Contractor Control Bundle", 11900]
  ]);
  assert.equal(PHASE204_SETUP_SPEND_LIMIT_CENTS, 15000);
  assert.equal(PHASE204_ADVERTISING_BUDGET_CENTS, 0);
});

test("a complete internal activation remains valid while first publication fails closed for owner action", () => {
  const request = activationRequest();
  assert.doesNotThrow(() => assertPhase204InternalCommerceActivationRequest(request));
  assert.equal(parsePhase204InternalCommerceActivationRequest(request), request);
  assert.doesNotThrow(() => assertPhase204InternalCommerceEnvelope(request));
  assert.deepEqual(evaluatePhase204InternalCommercePublication(request, now), {
    allowed: false,
    reason_code: "OWNER_APPROVAL_REQUIRED",
    approval_id: null,
    provider: "ETSY",
    evaluated_at: now
  });
});

test("exact owner approval permits only the bound store, products, prices, files, and claims", () => {
  const request = publicationReadyRequest();
  assert.doesNotThrow(() => assertPhase204InternalCommerceActivationRequest(request));
  assert.deepEqual(evaluatePhase204InternalCommercePublication(request, now), {
    allowed: true,
    reason_code: "APPROVED_ENVELOPE",
    approval_id: request.publication_approval.approval_id,
    provider: "ETSY",
    evaluated_at: now
  });

  const mismatchedPrice = structuredClone(request);
  mismatchedPrice.publication_approval.product_approvals[0].price_cents += 100;
  assert.throws(
    () => assertPhase204InternalCommerceActivationRequest(mismatchedPrice),
    (error) => error instanceof ContractError && error.code === "APPROVAL_SCOPE_MISMATCH"
  );
  const publishedWithoutApproval = structuredClone(request);
  publishedWithoutApproval.storefront.status = "PUBLISHED";
  publishedWithoutApproval.storefront.listings.forEach((listing, index) => {
    listing.status = "PUBLISHED";
    listing.published_at = now;
    listing.provider_listing_id = `etsy-live-${index + 1}`;
  });
  publishedWithoutApproval.publication_approval = null;
  assert.throws(
    () => assertPhase204InternalCommerceActivationRequest(publishedWithoutApproval),
    (error) => error instanceof ContractError && error.code === "OWNER_APPROVAL_REQUIRED"
  );
});

test("Gumroad is accepted only after a bounded provider-class Etsy blocker", () => {
  const invalidFallback = activationRequest();
  invalidFallback.storefront.selected_provider = "GUMROAD";
  assert.throws(
    () => assertPhase204InternalCommerceActivationRequest(invalidFallback),
    (error) => error instanceof ContractError && error.code === "ETSY_FIRST_REQUIRED"
  );

  const fallback = activationRequest();
  fallback.storefront.selected_provider = "GUMROAD";
  fallback.storefront.etsy_onboarding = {
    status: "BLOCKED",
    blocker: {
      blocker_kind: "IDENTITY_VERIFICATION",
      bounded_summary: "Etsy requires an owner-completed identity verification action.",
      evidence_id: uuid(90),
      observed_at: now
    }
  };
  assert.doesNotThrow(() => assertPhase204InternalCommerceActivationRequest(fallback));
});

test("internal capability truth cannot be promoted to SELLABLE or skip verification stages", () => {
  for (const mutate of [
    (record) => { record.final_lifecycle_state = "SELLABLE"; },
    (record) => { record.public_claim_eligible = true; },
    (record) => { record.pricing_eligibility = "INCLUDED"; },
    (record) => { record.production_readiness = "PLACEHOLDER"; },
    (record) => { record.lifecycle_sequence.splice(2, 1); }
  ]) {
    const request = activationRequest();
    mutate(request.capability_activations[0]);
    assert.throws(() => assertPhase204InternalCommerceActivationRequest(request), ContractError);
  }
});

test("unfinished, placeholder, copied, unlicensed, unsupported, corrupt, or incomplete products fail closed", () => {
  const mutations = [
    (product) => { product.contains_placeholder_content = true; },
    (product) => { product.gates.originality.copied_content = true; },
    (product) => { product.gates.licensing.unresolved_rights = true; },
    (product) => { product.gates.claims.unsupported_claim_count = 1; },
    (product) => { product.gates.ai_disclosure.disclosure_included = false; },
    (product) => { product.gates.file_integrity.invalid_file_count = 1; },
    (product) => { product.gates.delivery_readiness.customer_delivery_tested = false; },
    (product) => { product.assets = product.assets.filter((asset) => asset.role !== "TRACKING_TOOL"); },
    (product) => { product.assets[0].source_reference = "C:/Temp/uncommitted-product.docx"; }
  ];
  for (const mutate of mutations) {
    const request = activationRequest();
    mutate(request.products[0]);
    assert.throws(() => assertPhase204InternalCommerceActivationRequest(request), ContractError);
  }
  const wrongPrice = activationRequest();
  wrongPrice.products[0].price_cents = 3000;
  assert.throws(
    () => assertPhase204InternalCommerceActivationRequest(wrongPrice),
    (error) => error instanceof ContractError && error.code === "INVALID_PHASE204_PRODUCT_LINE"
  );
});

test("operational truth requires a complete business/product matrix and never accepts estimates or values disguised as unavailable", () => {
  const observed = activationRequest();
  observed.operational_metrics[0] = {
    ...observed.operational_metrics[0],
    truth_state: "OBSERVED",
    value: 2900,
    provider_record_id: "etsy-transaction-1",
    source_type: "PROVIDER_TRANSACTION",
    evidence_id: uuid(91),
    observed_at: now,
    unavailable_reason: null
  };
  assert.doesNotThrow(() => assertPhase204InternalCommerceActivationRequest(observed));

  for (const mutate of [
    (request) => { request.operational_metrics.pop(); },
    (request) => { request.operational_metrics[0].is_estimate = true; },
    (request) => { request.operational_metrics[0].value = 0; },
    (request) => { request.operational_metrics[0].source_type = "PROVIDER_TRANSACTION"; }
  ]) {
    const request = activationRequest();
    mutate(request);
    assert.throws(() => assertPhase204InternalCommerceActivationRequest(request), ContractError);
  }

  for (const [metricCode, invalidUnit] of [
    ["CONVERSION", "COUNT"],
    ["SUPPORT_VOLUME", "SCORE"],
    ["PRODUCT_PERFORMANCE", "RATIO"]
  ]) {
    const request = activationRequest();
    request.operational_metrics.find((metric) => metric.metric_code === metricCode).unit = invalidUnit;
    assert.throws(
      () => assertPhase204InternalCommerceActivationRequest(request),
      (error) => error instanceof ContractError && error.code === "INVALID_METRIC_UNIT"
    );
  }
});

test("budget and all three operational stop controls remain fail closed", () => {
  for (const mutate of [
    (request) => { request.budget.setup_spend_limit_cents = 15001; },
    (request) => { request.budget.advertising_budget_cents = 1; },
    (request) => { request.controls.pop(); },
    (request) => { request.controls.find((control) => control.control_code === "KILL_BUSINESS").requires_owner_approval = false; },
    (request) => { request.controls[0].availability = "UNAVAILABLE"; }
  ]) {
    const request = activationRequest();
    mutate(request);
    assert.throws(() => assertPhase204InternalCommerceActivationRequest(request), ContractError);
  }
});

test("activation results bind exact request scope, canonical readback, capabilities, and publication decision", () => {
  const request = activationRequest();
  const publicationDecision = evaluatePhase204InternalCommercePublication(request, now);
  const result = {
    record_type: "ACTIVATION_RESULT",
    contract_version: "1.0.0",
    schema_version: 1,
    result_id: uuid(92),
    request_id: request.request_id,
    status: "ACTIVATED",
    blocker: null,
    business_id: request.business.business_id,
    activated_capability_ids: request.capability_activations.map((record) => record.capability_id),
    canonical_event_ids: [uuid(93)],
    canonical_event_sequence: 204,
    business_record_version: 1,
    readback: {
      businesses: true,
      command: true,
      business_full_record: true,
      heart_2d: true,
      heart_3d: true,
      evidence_receipt_ids: [uuid(94), uuid(95), uuid(96), uuid(97), uuid(98)]
    },
    storefront_status: request.storefront.status,
    publication_decision: publicationDecision,
    completed_at: now
  };
  assert.doesNotThrow(() => assertPhase204InternalCommerceActivationResult(result, request));
  assert.doesNotThrow(() => assertPhase204InternalCommerceEnvelope(result));

  const failedReadback = structuredClone(result);
  failedReadback.readback.heart_3d = false;
  assert.throws(
    () => assertPhase204InternalCommerceActivationResult(failedReadback, request),
    (error) => error instanceof ContractError && error.code === "INCOMPLETE_INTERNAL_COMMERCE_READBACK"
  );
  const wrongCapabilities = structuredClone(result);
  wrongCapabilities.activated_capability_ids = [uuid(99)];
  assert.throws(
    () => assertPhase204InternalCommerceActivationResult(wrongCapabilities, request),
    (error) => error instanceof ContractError && error.code === "ACTIVATION_RESULT_SCOPE_MISMATCH"
  );
});

test("the distributable JSON Schema retains the same fail-closed constants and bounded structures", async () => {
  const schema = JSON.parse(await readFile(
    new URL("../phase204-internal-commerce.schema.json", import.meta.url),
    "utf8"
  ));
  assert.equal(schema.oneOf.length, 2);
  assert.equal(schema.$defs.activationRequest.additionalProperties, false);
  assert.equal(schema.$defs.activationResult.additionalProperties, false);
  assert.equal(schema.$defs.canonicalBusiness.properties.internal_code.const, "SP-COMMERCE-001");
  assert.equal(schema.$defs.authorityMarshal.properties.stable_code.const, "M02");
  assert.equal(schema.$defs.authorityGeneral.properties.stable_code.const, "G-M02-07");
  assert.equal(schema.$defs.capabilityActivation.properties.final_lifecycle_state.const, "ACTIVE");
  assert.equal(schema.$defs.capabilityActivation.properties.public_claim_eligible.const, false);
  assert.equal(schema.$defs.publicationApproval.properties.setup_spend_limit_cents.maximum, 15000);
  assert.equal(schema.$defs.publicationApproval.properties.advertising_budget_cents.const, 0);
  assert.equal(schema.$defs.operationalMetric.properties.is_estimate.const, false);
  const metricRules = schema.$defs.operationalMetric.allOf.slice(1);
  assert.equal(metricRules.find((rule) => rule.if.properties.metric_code.const === "CONVERSION").then.properties.unit.const, "RATIO");
  assert.equal(metricRules.find((rule) => rule.if.properties.metric_code.const === "SUPPORT_VOLUME").then.properties.unit.const, "COUNT");
  assert.equal(metricRules.find((rule) => rule.if.properties.metric_code.const === "PRODUCT_PERFORMANCE").then.properties.unit.const, "SCORE");
  assert.equal(schema.$defs.activationRequest.properties.operational_metrics.minItems, 54);
  assert.equal(schema.$defs.activationRequest.properties.controls.minItems, 3);
});
