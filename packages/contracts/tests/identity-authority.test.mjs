import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAutonomyEnvelope,
  assertAccountDeidentificationResult,
  assertIdentityActorReference,
  assertMembershipTransitionReceipt,
  assertMfaTransitionReceipt,
  assertSecretReferenceDescriptor,
  assertSecretTransitionReceipt,
  assertSessionInventoryItem,
  assertSessionTransitionReceipt,
  assertSupportAccessGrant,
  assertSupportSessionReadback,
  assertSupportAccessTransitionReceipt,
  parseAuthorityEvaluationRequest
} from "../dist/index.js";

const organizationId = "123e4567-e89b-42d3-a456-426614174001";
const tenantId = "123e4567-e89b-42d3-a456-426614174002";
const actorId = "123e4567-e89b-42d3-a456-426614174003";
const requestId = "123e4567-e89b-42d3-a456-426614174004";
const ownership = {
  organization_id: organizationId,
  tenant_id: tenantId,
  business_id: null,
  environment: "PRODUCTION",
  data_residency: "US"
};
const actor = {
  actor_id: actorId,
  actor_type: "HUMAN",
  human_user_id: "user_ada",
  service_subject: null,
  agent_id: null
};
const personalOwnership = {
  scope_kind: "PERSONAL",
  organization_id: null,
  tenant_id: null,
  business_id: null,
  environment: "PRODUCTION",
  data_residency: null
};
const canonicalSideEffects = {
  budget: { kind: "NO_EXTERNAL_SPEND", amount_minor_units: 0 },
  reversible: false,
  verification: "TRANSACTIONAL_READBACK",
  reconciliation: "IDEMPOTENT_RECEIPT",
  failure_behavior: "NO_PARTIAL_WRITE",
  evidence: ["transactional-readback:phase-202"],
  occurred_at: "2026-08-02T08:00:00.000Z",
  release_version: "phase-202"
};

test("Phase 202 authority contract accepts a fully scoped Human request", () => {
  const request = {
    contract_version: "1.0.0",
    schema_version: 1,
    request_id: requestId,
    idempotency_key: "phase202:authority:ada:1",
    actor,
    ownership,
    role: "OWNER",
    authority_domain: "TENANCY",
    data_classification: "CONFIDENTIAL",
    action: "membership.role.change",
    action_risk: "HIGH",
    requested_at: "2026-08-02T08:00:00.000Z"
  };
  assert.deepEqual(parseAuthorityEvaluationRequest(request), request);
});

test("Phase 202 rejects identity-type confusion and malformed authority scope", () => {
  assert.throws(() => assertIdentityActorReference({
    ...actor,
    actor_type: "SERVICE",
    service_subject: "worker",
    human_user_id: "user_ada"
  }), (error) => error.code === "IDENTITY_TYPE_CONFUSION");

  assert.throws(() => parseAuthorityEvaluationRequest({
    contract_version: "1.0.0",
    schema_version: 1,
    request_id: requestId,
    idempotency_key: "phase202:authority:ada:2",
    actor,
    ownership: { ...ownership, tenant_id: "not-a-uuid" },
    role: "OWNER",
    authority_domain: "TENANCY",
    data_classification: "CONFIDENTIAL",
    action: "membership.role.change",
    action_risk: "HIGH",
    requested_at: "2026-08-02T08:00:00.000Z"
  }), (error) => error.code === "INVALID_UUID");
});

test("Phase 202 AutonomyEnvelope is versioned, bounded, expiring, and verifiable", () => {
  const envelope = {
    contract_version: "1.0.0",
    schema_version: 1,
    envelope_id: "123e4567-e89b-42d3-a456-426614174005",
    version: 1,
    ownership,
    actor: { ...actor, actor_type: "AGENT", human_user_id: null, agent_id: "agent_1" },
    allowed_action_types: ["READ", "DRAFT"],
    tool_scope: ["portfolio.read"],
    data_scope: ["business:all"],
    budget: { currency: "USD", maximum_minor_units: 0 },
    reversible: true,
    verification: "transactional readback",
    escalation: "Human owner approval",
    created_at: "2026-08-02T08:00:00.000Z",
    expires_at: "2026-08-02T09:00:00.000Z"
  };
  assert.doesNotThrow(() => assertAutonomyEnvelope(envelope));
  assert.throws(() => assertAutonomyEnvelope({ ...envelope, expires_at: envelope.created_at }), (error) => error.code === "EXPIRED_AUTONOMY_ENVELOPE");
});

test("Phase 202 membership receipts require idempotency, notification evidence, and exact version transition", () => {
  const receipt = {
    contract_version: "1.0.0",
    schema_version: 1,
    transition_id: "123e4567-e89b-42d3-a456-426614174006",
    transition: "SUSPEND",
    ownership,
    actor,
    subject_user_id: "user_grace",
    subject_email_hash: null,
    request_id: requestId,
    idempotency_key: "phase202:membership:suspend:grace",
    prior_version: 2,
    resulting_version: 3,
    authorization: "OWNER",
    budget: { kind: "NO_EXTERNAL_SPEND", amount_minor_units: 0 },
    reversible: true,
    verification: "TRANSACTIONAL_READBACK",
    reconciliation: "IDEMPOTENT_RECEIPT",
    failure_behavior: "NO_PARTIAL_WRITE",
    evidence: ["membership:readback:3"],
    notification_evidence_id: "123e4567-e89b-42d3-a456-426614174007",
    occurred_at: "2026-08-02T08:00:00.000Z",
    release_version: "phase-202"
  };
  assert.doesNotThrow(() => assertMembershipTransitionReceipt(receipt));
  assert.throws(() => assertMembershipTransitionReceipt({ ...receipt, resulting_version: 4 }), (error) => error.code === "INVALID_MEMBERSHIP_VERSION");
});

test("Phase 202 support access is owner-visible, expiring, and read-only by default", () => {
  const grant = {
    grant_id: "123e4567-e89b-42d3-a456-426614174008",
    tenant_id: tenantId,
    organization_id: organizationId,
    support_actor_id: "123e4567-e89b-42d3-a456-426614174009",
    purpose: "Investigate failed member workspace readback",
    scopes: ["table:MemberWorkspaceSnapshot:read"],
    access_mode: "READ_ONLY",
    write_elevation_purpose: null,
    write_elevation_expires_at: null,
    owner_visible: true,
    approved_by_actor_id: actorId,
    issued_at: "2026-08-02T08:00:00.000Z",
    expires_at: "2026-08-02T08:30:00.000Z",
    revoked_at: null
  };
  assert.doesNotThrow(() => assertSupportAccessGrant(grant));
  assert.throws(() => assertSupportAccessGrant({ ...grant, owner_visible: false }), (error) => error.code === "HIDDEN_SUPPORT_ACCESS");
  assert.throws(() => assertSupportAccessGrant({ ...grant, expires_at: grant.issued_at }), (error) => error.code === "INVALID_SUPPORT_EXPIRY");
  assert.throws(() => assertSupportAccessGrant({ ...grant, scopes: ["table:Task:write"] }), (error) => error.code === "INVALID_SUPPORT_SCOPE");
  assert.throws(() => assertSupportAccessGrant({
    ...grant,
    access_mode: "WRITE_ELEVATED",
    write_elevation_purpose: "repair a task",
    write_elevation_expires_at: "2026-08-02T08:20:00.000Z"
  }), (error) => error.code === "INVALID_SUPPORT_SCOPE");
  assert.throws(() => assertSupportAccessGrant({
    ...grant,
    access_mode: "WRITE_ELEVATED",
    scopes: [...grant.scopes, "table:Task:write"],
    write_elevation_purpose: "repair a task",
    write_elevation_expires_at: "2026-08-02T09:00:00.000Z"
  }), (error) => error.code === "INVALID_SUPPORT_ELEVATION");
});

test("Phase 202 MFA receipts bind personal ownership, exact versions, and raw-free one-time recovery", () => {
  const receipt = {
    contract_version: "1.0.0",
    schema_version: 1,
    transition_id: "123e4567-e89b-42d3-a456-426614174012",
    transition: "TOTP_CONFIRM",
    ownership: {
      scope_kind: "PERSONAL",
      organization_id: null,
      tenant_id: null,
      business_id: null,
      environment: "PRODUCTION",
      data_residency: null
    },
    actor,
    session_id: "123e4567-e89b-42d3-a456-426614174013",
    factor_id: "123e4567-e89b-42d3-a456-426614174014",
    request_id: requestId,
    idempotency_key: "phase202:mfa:confirm:ada:1",
    prior_version: 1,
    resulting_version: 2,
    authorization: "TOTP",
    factor_status: "ACTIVE",
    session_step_up_at: "2026-08-02T08:00:00.000Z",
    one_time_material_policy: "RECOVERY_CODES_RETURNED_ONCE",
    recovery_action: "REGENERATE_RECOVERY_CODES",
    budget: { kind: "NO_EXTERNAL_SPEND", amount_minor_units: 0 },
    reversible: true,
    verification: "TRANSACTIONAL_READBACK",
    reconciliation: "IDEMPOTENT_RECEIPT",
    failure_behavior: "NO_PARTIAL_WRITE",
    evidence: ["mfa-factor:123e4567-e89b-42d3-a456-426614174014:version:2"],
    occurred_at: "2026-08-02T08:00:00.000Z",
    release_version: "phase-202"
  };
  assert.doesNotThrow(() => assertMfaTransitionReceipt(receipt));
  assert.throws(() => assertMfaTransitionReceipt({ ...receipt, resulting_version: 3 }), (error) => error.code === "INVALID_MFA_VERSION");
  assert.throws(() => assertMfaTransitionReceipt({ ...receipt, reversible: false }), (error) => error.code === "INVALID_MFA_TRANSITION_STATE");
  assert.throws(() => assertMfaTransitionReceipt({ ...receipt, recovery_action: "BEGIN_NEW_ENROLLMENT" }), (error) => error.code === "INVALID_MFA_TRANSITION_STATE");
  assert.throws(() => assertMfaTransitionReceipt({ ...receipt, idempotency_key: "too-short" }), (error) => error.code === "IDEMPOTENCY_KEY");
  assert.throws(() => assertMfaTransitionReceipt({ ...receipt, recovery_codes: ["RAW-CODE"] }), (error) => error.code === "MFA_SECRET_MATERIAL_PRESENT");
  assert.throws(() => assertMfaTransitionReceipt({
    ...receipt,
    ownership: { ...receipt.ownership, tenant_id: tenantId }
  }), (error) => error.code === "INVALID_PERSONAL_SCOPE");
});

test("Phase 202 session inventory enforces exact INTERNAL, MEMBER, and SUPPORT scope consistency", () => {
  const base = {
    session_id: "123e4567-e89b-42d3-a456-426614174020",
    actor_id: actorId,
    organization_id: null,
    tenant_id: null,
    session_type: "INTERNAL",
    support_grant_id: null,
    device_label: "Chrome on Windows",
    issued_at: "2026-08-02T08:00:00.000Z",
    last_used_at: "2026-08-02T08:05:00.000Z",
    expires_at: "2026-08-03T08:00:00.000Z",
    revoked_at: null,
    current: true
  };
  const member = { ...base, organization_id: organizationId, tenant_id: tenantId, session_type: "MEMBER" };
  const support = {
    ...member,
    session_type: "SUPPORT",
    support_grant_id: "123e4567-e89b-42d3-a456-426614174021"
  };
  assert.doesNotThrow(() => assertSessionInventoryItem(base));
  assert.doesNotThrow(() => assertSessionInventoryItem(member));
  assert.doesNotThrow(() => assertSessionInventoryItem(support));
  assert.throws(
    () => assertSessionInventoryItem({ ...member, support_grant_id: support.support_grant_id }),
    (error) => error.code === "SESSION_TYPE_SCOPE_MISMATCH"
  );
  assert.throws(
    () => assertSessionInventoryItem({ ...support, tenant_id: null }),
    (error) => error.code === "SESSION_TYPE_SCOPE_MISMATCH"
  );
  assert.throws(
    () => assertSessionInventoryItem({ ...base, device_label: null }),
    (error) => error.code === "INVALID_STRING"
  );
});

test("Phase 202 session revocation receipts are personal, Human, idempotent, versioned, and credential-free", () => {
  const receipt = {
    contract_version: "1.0.0",
    schema_version: 1,
    transition_id: "123e4567-e89b-42d3-a456-426614174022",
    transition: "REVOKE_ONE",
    ownership: personalOwnership,
    actor,
    request_id: requestId,
    idempotency_key: "phase202:session:revoke:ada:1",
    prior_version: 4,
    resulting_version: 5,
    revoked_count: 1,
    subject_session_id: "123e4567-e89b-42d3-a456-426614174020",
    ...canonicalSideEffects
  };
  assert.doesNotThrow(() => assertSessionTransitionReceipt(receipt));
  assert.doesNotThrow(() => assertSessionTransitionReceipt({
    ...receipt,
    transition: "REVOKE_ALL",
    revoked_count: 3,
    subject_session_id: null
  }));
  assert.throws(
    () => assertSessionTransitionReceipt({ ...receipt, subject_session_id: null }),
    (error) => error.code === "INVALID_SESSION_TRANSITION_STATE"
  );
  assert.throws(
    () => assertSessionTransitionReceipt({ ...receipt, resulting_version: 6 }),
    (error) => error.code === "INVALID_SESSION_VERSION"
  );
  assert.throws(
    () => assertSessionTransitionReceipt({ ...receipt, access_token: "raw-session-credential" }),
    (error) => error.code === "SESSION_SECRET_MATERIAL_PRESENT"
  );
  assert.throws(
    () => assertSessionTransitionReceipt({ ...receipt, ownership: { ...personalOwnership, tenant_id: tenantId } }),
    (error) => error.code === "INVALID_PERSONAL_SCOPE"
  );
});

test("Phase 202 secret descriptors and transitions bind tenant scope and never carry raw secret material", () => {
  const descriptor = {
    secret_reference_id: "123e4567-e89b-42d3-a456-426614174023",
    tenant_id: tenantId,
    organization_id: organizationId,
    business_id: null,
    provider: "shopify",
    purpose: "storefront-api",
    environment: "PRODUCTION",
    key_version: "kms-v1",
    version: 1,
    last_four: "6789",
    rotated_at: null,
    revoked_at: null,
    created_at: "2026-08-02T08:00:00.000Z",
    updated_at: "2026-08-02T08:00:00.000Z"
  };
  const receipt = {
    contract_version: "1.0.0",
    schema_version: 1,
    transition_id: "123e4567-e89b-42d3-a456-426614174024",
    transition: "CREATE",
    ownership: { ...ownership, scope_kind: "TENANT" },
    actor,
    request_id: requestId,
    idempotency_key: "phase202:secret:create:shopify:1",
    prior_version: 0,
    resulting_version: 1,
    descriptor,
    ...canonicalSideEffects,
    reversible: true
  };
  assert.doesNotThrow(() => assertSecretReferenceDescriptor(descriptor));
  assert.doesNotThrow(() => assertSecretTransitionReceipt(receipt));

  const rotated = {
    ...receipt,
    transition: "ROTATE",
    prior_version: 1,
    resulting_version: 2,
    descriptor: {
      ...descriptor,
      version: 2,
      rotated_at: "2026-08-02T08:10:00.000Z",
      updated_at: "2026-08-02T08:10:00.000Z"
    }
  };
  assert.doesNotThrow(() => assertSecretTransitionReceipt(rotated));
  const revoked = {
    ...rotated,
    transition: "REVOKE",
    prior_version: 2,
    resulting_version: 3,
    descriptor: {
      ...rotated.descriptor,
      version: 3,
      revoked_at: "2026-08-02T08:20:00.000Z",
      updated_at: "2026-08-02T08:20:00.000Z"
    },
    reversible: false
  };
  assert.doesNotThrow(() => assertSecretTransitionReceipt(revoked));
  assert.throws(
    () => assertSecretTransitionReceipt({ ...receipt, resulting_version: 2 }),
    (error) => error.code === "INVALID_SECRET_VERSION"
  );
  assert.throws(
    () => assertSecretTransitionReceipt({ ...receipt, raw_secret: "never-return-this" }),
    (error) => error.code === "UNEXPECTED_CONTRACT_FIELD"
  );
  for (const prohibitedField of ["adminToken", "accessToken", "encryptedValue", "credentialJson", "payloadJson"]) {
    assert.throws(
      () => assertSecretTransitionReceipt({ ...receipt, [prohibitedField]: "never-return-this" }),
      (error) => error.code === "UNEXPECTED_CONTRACT_FIELD"
    );
  }
  assert.throws(
    () => assertSecretTransitionReceipt({ ...receipt, reversible: false }),
    (error) => error.code === "INVALID_SECRET_TRANSITION_STATE"
  );
  assert.throws(
    () => assertSecretTransitionReceipt({ ...revoked, reversible: true }),
    (error) => error.code === "INVALID_SECRET_TRANSITION_STATE"
  );
  assert.throws(
    () => assertSecretTransitionReceipt({ ...receipt, descriptor: { ...descriptor, encryptedValue: "never-return-this" } }),
    (error) => error.code === "UNEXPECTED_CONTRACT_FIELD"
  );
  assert.throws(
    () => assertSecretTransitionReceipt({ ...receipt, descriptor: { ...descriptor, business_id: "123e4567-e89b-42d3-a456-426614174099" } }),
    (error) => error.code === "SECRET_RECEIPT_SCOPE_MISMATCH"
  );
  assert.throws(
    () => assertSecretReferenceDescriptor({ ...descriptor, revoked_at: "not-a-date" }),
    (error) => error.code === "INVALID_TIMESTAMP"
  );
});

test("Phase 202 support-session readback binds the session to one exact active grant", () => {
  const grant = {
    grant_id: "123e4567-e89b-42d3-a456-426614174025",
    tenant_id: tenantId,
    organization_id: organizationId,
    support_actor_id: actorId,
    purpose: "Investigate an owner-approved readback",
    scopes: ["table:Task:read"],
    access_mode: "READ_ONLY",
    write_elevation_purpose: null,
    write_elevation_expires_at: null,
    owner_visible: true,
    approved_by_actor_id: "123e4567-e89b-42d3-a456-426614174026",
    issued_at: "2026-08-02T08:00:00.000Z",
    expires_at: "2026-08-02T09:00:00.000Z",
    revoked_at: null
  };
  const session = {
    session_id: "123e4567-e89b-42d3-a456-426614174027",
    actor_id: actorId,
    organization_id: organizationId,
    tenant_id: tenantId,
    session_type: "SUPPORT",
    support_grant_id: grant.grant_id,
    device_label: "Support console",
    issued_at: "2026-08-02T08:05:00.000Z",
    last_used_at: "2026-08-02T08:10:00.000Z",
    expires_at: "2026-08-02T08:30:00.000Z",
    revoked_at: null,
    current: false
  };
  assert.doesNotThrow(() => assertSupportSessionReadback({ session, support_grant: grant }));
  assert.throws(
    () => assertSupportSessionReadback({ session: { ...session, support_grant_id: "123e4567-e89b-42d3-a456-426614174099" }, support_grant: grant }),
    (error) => error.code === "SUPPORT_SESSION_GRANT_MISMATCH"
  );
  assert.throws(
    () => assertSupportSessionReadback({ session: { ...session, expires_at: "2026-08-02T10:00:00.000Z" }, support_grant: grant }),
    (error) => error.code === "INVALID_SUPPORT_SESSION_EXPIRY"
  );
});

test("Phase 202 support transition receipts bind owner authority and immutable grant readback", () => {
  const grant = {
    grant_id: "123e4567-e89b-42d3-a456-426614174015",
    tenant_id: tenantId,
    organization_id: organizationId,
    support_actor_id: "123e4567-e89b-42d3-a456-426614174016",
    purpose: "Repair a customer-authorized task",
    scopes: ["table:Task:read", "table:Task:write"],
    access_mode: "WRITE_ELEVATED",
    write_elevation_purpose: "Repair a customer-authorized task",
    write_elevation_expires_at: "2026-08-02T08:20:00.000Z",
    owner_visible: true,
    approved_by_actor_id: actorId,
    issued_at: "2026-08-02T08:00:00.000Z",
    expires_at: "2026-08-02T08:30:00.000Z",
    revoked_at: null
  };
  const receipt = {
    contract_version: "1.0.0",
    schema_version: 1,
    transition_id: "123e4567-e89b-42d3-a456-426614174017",
    transition: "ELEVATE_WRITE",
    ownership: { ...ownership, scope_kind: "TENANT" },
    actor,
    grant_id: grant.grant_id,
    support_actor_id: grant.support_actor_id,
    request_id: requestId,
    idempotency_key: "phase202:support:elevate:ada:1",
    prior_version: 1,
    resulting_version: 2,
    authorization: "OWNER_RECENT_MFA_STEP_UP",
    grant,
    budget: { kind: "NO_EXTERNAL_SPEND", amount_minor_units: 0 },
    reversible: true,
    verification: "TRANSACTIONAL_READBACK",
    reconciliation: "IDEMPOTENT_RECEIPT",
    failure_behavior: "NO_PARTIAL_WRITE",
    evidence: [`support-grant:${grant.grant_id}:version:2`],
    occurred_at: "2026-08-02T08:00:00.000Z",
    release_version: "phase-202"
  };
  assert.doesNotThrow(() => assertSupportAccessTransitionReceipt(receipt));
  assert.throws(() => assertSupportAccessTransitionReceipt({ ...receipt, authorization: "OWNER" }), (error) => error.code === "INVALID_SUPPORT_AUTHORITY");
  assert.throws(() => assertSupportAccessTransitionReceipt({ ...receipt, grant: { ...grant, tenant_id: "123e4567-e89b-42d3-a456-426614174099" } }), (error) => error.code === "SUPPORT_RECEIPT_SCOPE_MISMATCH");
  assert.throws(() => assertSupportAccessTransitionReceipt({ ...receipt, reversible: false }), (error) => error.code === "INVALID_SUPPORT_TRANSITION_STATE");

  const issuedGrant = {
    ...grant,
    scopes: ["table:Task:read"],
    access_mode: "READ_ONLY",
    write_elevation_purpose: null,
    write_elevation_expires_at: null
  };
  const issuedReceipt = {
    ...receipt,
    transition: "ISSUE_READ_ONLY",
    authorization: "OWNER",
    prior_version: 0,
    resulting_version: 1,
    grant: issuedGrant,
    reversible: true
  };
  assert.doesNotThrow(() => assertSupportAccessTransitionReceipt(issuedReceipt));
  assert.throws(() => assertSupportAccessTransitionReceipt({ ...issuedReceipt, reversible: false }), (error) => error.code === "INVALID_SUPPORT_TRANSITION_STATE");

  const revokedReceipt = {
    ...issuedReceipt,
    transition: "REVOKE",
    prior_version: 1,
    resulting_version: 2,
    grant: { ...issuedGrant, revoked_at: "2026-08-02T08:10:00.000Z" },
    reversible: false
  };
  assert.doesNotThrow(() => assertSupportAccessTransitionReceipt(revokedReceipt));
  assert.throws(() => assertSupportAccessTransitionReceipt({ ...revokedReceipt, reversible: true }), (error) => error.code === "INVALID_SUPPORT_TRANSITION_STATE");
});

test("Phase 202 account deidentification discloses retained records and binds a hashed receipt", () => {
  const result = {
    contract_version: "1.0.0",
    schema_version: 1,
    outcome: "ACCOUNT_DEIDENTIFIED",
    tenant_records: "RETAINED",
    actor_provenance: "RETAINED_REVOKED",
    retry_semantics: "TERMINAL_SESSION_REVOCATION",
    receipt_id: "123e4567-e89b-42d3-a456-426614174010",
    receipt_hash: "a".repeat(64),
    membership_receipt_ids: ["123e4567-e89b-42d3-a456-426614174011"],
    retained_evidence_classes: ["TENANT_RECORDS", "OWNERSHIP_AND_CREATOR_PROVENANCE"],
    occurred_at: "2026-08-02T08:00:00.000Z"
  };
  assert.doesNotThrow(() => assertAccountDeidentificationResult(result));
  assert.throws(
    () => assertAccountDeidentificationResult({ ...result, tenant_records: "DELETED" }),
    (error) => error.code === "INVALID_ACCOUNT_DEIDENTIFICATION_OUTCOME"
  );
});
