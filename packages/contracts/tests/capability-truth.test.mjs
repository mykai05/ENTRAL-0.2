import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CAPABILITY_LIFECYCLE_STATES,
  ContractError,
  assertCapabilityLifecycleTransitionRequest,
  assertCapabilityTruthRecord,
  assertInstalledCapabilityRecord,
  assertProductClaimRecord,
  assertPublicProductTruthProjection,
  evaluateProductClaimPublication
} from "../dist/index.js";

const capabilityId = "123e4567-e89b-42d3-a456-426614174000";
const claimId = "223e4567-e89b-42d3-a456-426614174000";
const actorId = "323e4567-e89b-42d3-a456-426614174000";
const tenantId = "423e4567-e89b-42d3-a456-426614174000";
const organizationId = "523e4567-e89b-42d3-a456-426614174000";
const now = "2026-08-03T05:00:00.000Z";

const sellableEvidenceTypes = [
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

function receipt(evidenceType, index) {
  return {
    receipt_id: `623e4567-e89b-42d3-a456-${String(index).padStart(12, "0")}`,
    evidence_type: evidenceType,
    environment: "PRODUCTION",
    status: "PASSED",
    reference: `mykai05/ENTRAL-0.2@${"a".repeat(40)}:docs/evidence/${evidenceType}.json`,
    content_sha256: String(index % 10).repeat(64),
    captured_at: now,
    expires_at: "2026-09-03T05:00:00.000Z"
  };
}

function sellableCapability(overrides = {}) {
  const receipts = sellableEvidenceTypes.map(receipt);
  return {
    capability_id: capabilityId,
    capability_key: "entral.canonical-workspace",
    capability_version: "1.0.0",
    display_name: "Canonical workspace",
    purpose: "Expose verified canonical workspace projections.",
    kind: "CAPABILITY",
    owner: "product-owner@entral.example",
    environment: "PRODUCTION",
    scope: "GLOBAL",
    tenant_id: null,
    organization_id: null,
    lifecycle_state: "SELLABLE",
    audience_status: "CURRENT",
    production_readiness: "REAL",
    dependencies: [],
    activation_requirements: [{
      requirement_code: "production-readback",
      description: "Authenticated production readback must pass.",
      required: true,
      satisfied: true,
      evidence_receipt_ids: [receipts[3].receipt_id]
    }],
    verification_receipts: receipts,
    last_verified_at: now,
    failure_state: null,
    public_claim_eligible: true,
    rollback_path: "Restore the prior certified release.",
    deactivation_path: "Transition the capability to DEPRECATED and suppress claims.",
    source_reference: `mykai05/ENTRAL-0.2@${"a".repeat(40)}:backend/src/routes/member.ts`,
    limitations: ["Requires an authenticated member organization."],
    record_version: 8,
    created_at: "2026-08-03T04:00:00.000Z",
    updated_at: now,
    ...overrides
  };
}

function approvedClaim(capability = sellableCapability(), overrides = {}) {
  return {
    claim_id: claimId,
    claim_key: "entral.canonical-workspace.website",
    capability_id: capability.capability_id,
    capability_version: capability.capability_version,
    environment: capability.environment,
    surface: "WEBSITE",
    status: "APPROVED",
    approved_language: "ENTRAL provides a verified canonical workspace.",
    limitations: capability.limitations,
    evidence_receipt_ids: [capability.verification_receipts[3].receipt_id],
    requires_tenant_installation: false,
    approved_by_actor_id: actorId,
    approved_at: now,
    record_version: 2,
    created_at: "2026-08-03T04:30:00.000Z",
    updated_at: now,
    ...overrides
  };
}

function installation(overrides = {}) {
  return {
    installation_id: "723e4567-e89b-42d3-a456-426614174000",
    tenant_id: tenantId,
    organization_id: organizationId,
    capability_id: capabilityId,
    capability_version: "1.0.0",
    state: "ACTIVE",
    plan_eligible: true,
    suspension_reason: null,
    activated_at: now,
    verification_receipt_ids: ["623e4567-e89b-42d3-a456-000000000003"],
    record_version: 1,
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

function evaluation(capability, claim, overrides = {}) {
  return {
    capability,
    claim,
    dependency_capabilities: [],
    requested_environment: "PRODUCTION",
    requested_tenant_id: null,
    requested_organization_id: null,
    installation: null,
    evaluated_at: now,
    ...overrides
  };
}

test("Phase 203 lifecycle is the exact ten-state contract", () => {
  assert.deepEqual(CAPABILITY_LIFECYCLE_STATES, [
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
  ]);
});

test("a receipt-bound SELLABLE capability and approved claim publish", () => {
  const capability = sellableCapability();
  const claim = approvedClaim(capability);
  assert.doesNotThrow(() => assertCapabilityTruthRecord(capability));
  assert.doesNotThrow(() => assertProductClaimRecord(claim));
  assert.deepEqual(evaluateProductClaimPublication(evaluation(capability, claim)), {
    allowed: true,
    reason_code: "SELLABLE_VERIFIED",
    capability_id: capabilityId,
    capability_version: "1.0.0",
    claim_id: claimId,
    surface: "WEBSITE",
    evidence_receipt_ids: [capability.verification_receipts[3].receipt_id],
    evaluated_at: now
  });
});

test("catalogued, simulated, placeholder, local-only, and disabled sources fail closed", () => {
  for (const readiness of ["SIMULATED", "PLACEHOLDER", "LOCAL_ONLY", "DISABLED"]) {
    const candidate = sellableCapability({
      lifecycle_state: "CATALOGUED",
      production_readiness: readiness,
      public_claim_eligible: false,
      last_verified_at: null
    });
    assert.doesNotThrow(() => assertCapabilityTruthRecord(candidate));
    assert.equal(
      evaluateProductClaimPublication(evaluation(candidate, approvedClaim(candidate))).reason_code,
      "CAPABILITY_NOT_SELLABLE"
    );
    assert.throws(
      () => assertCapabilityTruthRecord({ ...candidate, lifecycle_state: "ACTIVE" }),
      (error) => error instanceof ContractError && error.code === "NON_REAL_CAPABILITY_ACTIVE"
    );
  }
});

test("SELLABLE is blocked without support, pricing, Tutorial, documentation, or rollback evidence", () => {
  for (const evidenceType of ["SUPPORT_READINESS", "PRICING_APPROVAL", "TUTORIAL", "DOCUMENTATION", "ROLLBACK"]) {
    const candidate = sellableCapability({
      verification_receipts: sellableCapability().verification_receipts.filter(
        (receiptRecord) => receiptRecord.evidence_type !== evidenceType
      )
    });
    assert.throws(
      () => assertCapabilityTruthRecord(candidate),
      (error) => error instanceof ContractError && error.code === "SELLABLE_CAPABILITY_EVIDENCE"
    );
  }
});

test("claim evidence must stay synchronized with the exact capability version and receipts", () => {
  const capability = sellableCapability();
  const versionMismatch = approvedClaim(capability, { capability_version: "1.0.1" });
  assert.equal(
    evaluateProductClaimPublication(evaluation(capability, versionMismatch)).reason_code,
    "CAPABILITY_VERSION_MISMATCH"
  );
  const missingEvidence = approvedClaim(capability, {
    evidence_receipt_ids: ["823e4567-e89b-42d3-a456-426614174000"]
  });
  assert.equal(
    evaluateProductClaimPublication(evaluation(capability, missingEvidence)).reason_code,
    "CLAIM_EVIDENCE_MISMATCH"
  );

  for (const invalidReceipt of [
    { ...receipt("PRODUCTION_READBACK", 91), status: "FAILED" },
    { ...receipt("PRODUCTION_READBACK", 92), environment: "STAGING" },
    {
      ...receipt("PRODUCTION_READBACK", 93),
      captured_at: "2026-08-03T04:00:00.000Z",
      expires_at: "2026-08-03T04:59:59.000Z"
    }
  ]) {
    const candidate = sellableCapability({
      verification_receipts: [...capability.verification_receipts, invalidReceipt]
    });
    const invalidClaim = approvedClaim(candidate, { evidence_receipt_ids: [invalidReceipt.receipt_id] });
    assert.equal(
      evaluateProductClaimPublication(evaluation(candidate, invalidClaim)).reason_code,
      "CLAIM_EVIDENCE_MISMATCH"
    );
  }
});

test("required dependencies and activation requirements fail closed", () => {
  const dependencyId = "a23e4567-e89b-42d3-a456-426614174000";
  const capability = sellableCapability({
    dependencies: [{
      capability_id: dependencyId,
      capability_version: "1.0.0",
      minimum_lifecycle_state: "ACTIVE",
      required: true
    }]
  });
  const claim = approvedClaim(capability);
  assert.equal(
    evaluateProductClaimPublication(evaluation(capability, claim)).reason_code,
    "DEPENDENCY_UNSATISFIED"
  );
  const dependency = sellableCapability({
    capability_id: dependencyId,
    capability_key: "entral.required-dependency"
  });
  assert.equal(evaluateProductClaimPublication(evaluation(capability, claim, {
    dependency_capabilities: [dependency]
  })).allowed, true);

  const emptyActivationEvidence = sellableCapability({
    lifecycle_state: "CATALOGUED",
    production_readiness: "UNVERIFIED",
    public_claim_eligible: false,
    last_verified_at: null,
    activation_requirements: [{
      requirement_code: "production-readback",
      description: "Authenticated production readback must pass.",
      required: true,
      satisfied: true,
      evidence_receipt_ids: []
    }]
  });
  assert.throws(
    () => assertCapabilityTruthRecord(emptyActivationEvidence),
    (error) => error instanceof ContractError && error.code === "ACTIVATION_EVIDENCE_REQUIRED"
  );
});

test("tenant-scoped publication requires the exact active and plan-eligible installation", () => {
  const capability = sellableCapability({
    scope: "TENANT",
    tenant_id: tenantId,
    organization_id: organizationId
  });
  const claim = approvedClaim(capability, { requires_tenant_installation: true });
  assert.equal(
    evaluateProductClaimPublication(evaluation(capability, claim)).reason_code,
    "INSTALLATION_REQUIRED"
  );
  assert.doesNotThrow(() => assertInstalledCapabilityRecord(installation()));
  assert.equal(evaluateProductClaimPublication(evaluation(capability, claim, {
    requested_tenant_id: tenantId,
    requested_organization_id: organizationId,
    installation: installation()
  })).allowed, true);
  assert.equal(evaluateProductClaimPublication(evaluation(capability, claim, {
    requested_tenant_id: tenantId,
    requested_organization_id: organizationId,
    installation: installation({ plan_eligible: false })
  })).reason_code, "PLAN_INELIGIBLE");
});

test("lifecycle transitions are versioned, audited requests and cannot skip verification", () => {
  const request = {
    transition_id: "923e4567-e89b-42d3-a456-426614174000",
    capability_id: capabilityId,
    from_state: "IMPLEMENTED",
    to_state: "UNIT_VERIFIED",
    expected_record_version: 3,
    evidence_receipt_ids: ["623e4567-e89b-42d3-a456-000000000000"],
    reason: "The bounded unit suite passed.",
    actor_id: actorId,
    correlation_id: "a23e4567-e89b-42d3-a456-426614174000",
    idempotency_key: "phase203-transition-implemented-unit",
    requested_at: now
  };
  assert.doesNotThrow(() => assertCapabilityLifecycleTransitionRequest(request));
  assert.throws(
    () => assertCapabilityLifecycleTransitionRequest({ ...request, to_state: "ACTIVE" }),
    (error) => error instanceof ContractError && error.code === "INVALID_CAPABILITY_TRANSITION"
  );
});

test("public Product Truth projections contain only receipt-bound SELLABLE claims", () => {
  const projection = {
    contract_version: "1.0.0",
    schema_version: 1,
    projection_id: "b23e4567-e89b-42d3-a456-426614174000",
    environment: "PRODUCTION",
    surface: "WEBSITE",
    registry_revision: 8,
    generated_at: now,
    expires_at: "2026-08-03T05:05:00.000Z",
    claims: [{
      claim_id: claimId,
      claim_key: "entral.canonical-workspace.website",
      capability_id: capabilityId,
      capability_key: "entral.canonical-workspace",
      capability_version: "1.0.0",
      display_name: "Canonical workspace",
      lifecycle_state: "SELLABLE",
      approved_language: "ENTRAL provides a verified canonical workspace.",
      limitations: ["Requires authentication."],
      evidence_receipt_ids: ["623e4567-e89b-42d3-a456-000000000003"],
      claim_record_version: 2,
      capability_record_version: 8
    }]
  };
  assert.doesNotThrow(() => assertPublicProductTruthProjection(projection));
  assert.throws(
    () => assertPublicProductTruthProjection({
      ...projection,
      claims: [{ ...projection.claims[0], lifecycle_state: "ACTIVE" }]
    }),
    (error) => error instanceof ContractError && error.code === "NON_SELLABLE_PUBLIC_CLAIM"
  );
  assert.throws(
    () => assertPublicProductTruthProjection({ ...projection, claims: [{ ...projection.claims[0], evidence_receipt_ids: [] }] }),
    (error) => error instanceof ContractError && error.code === "PUBLIC_CLAIM_EVIDENCE_REQUIRED"
  );
});

test("Capability Truth JSON schemas preserve fail-closed lifecycle and publication constraints", async () => {
  const recordSchema = JSON.parse(await readFile(
    new URL("../capability-truth-record.schema.json", import.meta.url),
    "utf8"
  ));
  const publicationSchema = JSON.parse(await readFile(
    new URL("../capability-truth-publication.schema.json", import.meta.url),
    "utf8"
  ));
  assert.equal(recordSchema.additionalProperties, false);
  assert.deepEqual(recordSchema.$defs.lifecycle.enum, CAPABILITY_LIFECYCLE_STATES);
  assert.equal(
    recordSchema.allOf[2].then.properties.public_claim_eligible.const,
    true
  );
  assert.equal(publicationSchema.additionalProperties, false);
  assert.equal(publicationSchema.properties.claims.items.properties.lifecycle_state.const, "SELLABLE");
  assert.equal(publicationSchema.properties.claims.items.properties.evidence_receipt_ids.minItems, 1);
});
