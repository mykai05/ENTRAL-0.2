import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  personalActorId: "323e4567-e89b-42d3-a456-426614174000",
  personalQueryRaw: vi.fn(),
  rootQueryRaw: vi.fn(),
  tenantOrganizationId: "523e4567-e89b-42d3-a456-426614174000",
  tenantQueryRaw: vi.fn()
}));

vi.mock("../src/db.js", () => ({
  prisma: { $queryRaw: mocks.rootQueryRaw },
  withPersonalSession: async (_database: unknown, _context: unknown, operation: (transaction: unknown, identity: unknown) => unknown) => operation(
    { $queryRaw: mocks.personalQueryRaw },
    {
      actorId: mocks.personalActorId,
      appUserId: "423e4567-e89b-42d3-a456-426614174000",
      authSubject: "admin-user"
    }
  ),
  withTenantSession: async (_database: unknown, context: { tenantId: string }, operation: (transaction: unknown, identity: unknown) => unknown) => operation(
    { $queryRaw: mocks.tenantQueryRaw },
    {
      actorId: "623e4567-e89b-42d3-a456-426614174000",
      appUserId: "723e4567-e89b-42d3-a456-426614174000",
      organizationId: mocks.tenantOrganizationId,
      role: "OWNER",
      tenantId: context.tenantId
    }
  )
}));

const capabilityId = "123e4567-e89b-42d3-a456-426614174000";
const now = new Date("2026-08-03T05:00:00.000Z");
const postgresTimestamp = "2026-08-03T05:00:00+00:00";

function cataloguedRecord() {
  return {
    capability_id: capabilityId,
    capability_key: "integration.openai",
    capability_version: "1.0.0",
    display_name: "OpenAI",
    purpose: "Conservative source-backed integration catalog entry.",
    kind: "INTEGRATION",
    owner: "UNASSIGNED",
    data_classification: "INTERNAL",
    environment: "PRODUCTION",
    scope: "GLOBAL",
    supported_scopes: ["GLOBAL"],
    tenant_id: null,
    organization_id: null,
    lifecycle_state: "CATALOGUED",
    audience_status: "UNSUPPORTED",
    production_readiness: "SIMULATED",
    dependencies: [],
    required_evidence: ["UNIT_TEST"],
    activation_requirements: [],
    verification_receipts: [],
    last_verified_at: null,
    failure_state: null,
    public_claim_eligible: false,
    pricing_eligibility: "NOT_ELIGIBLE",
    rollback_path: "Remove the conservative catalog entry.",
    deactivation_path: "Keep the entry publication-ineligible.",
    source_reference: "mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts",
    limitations: ["Mock Mode is not activation evidence."],
    record_version: 1,
    created_at: now.toISOString(),
    updated_at: now.toISOString()
  };
}

function publicClaim(overrides = {}) {
  return {
    claim_id: "223e4567-e89b-42d3-a456-426614174000",
    claim_key: "entral.workspace.website",
    capability_id: capabilityId,
    capability_key: "entral.workspace",
    capability_version: "1.0.0",
    display_name: "ENTRAL workspace",
    lifecycle_state: "SELLABLE",
    pricing_eligibility: "INCLUDED",
    approved_language: "A verified ENTRAL workspace is available.",
    limitations: ["Authentication is required."],
    evidence_receipt_ids: ["823e4567-e89b-42d3-a456-426614174000"],
    claim_record_version: 2,
    capability_record_version: 8,
    ...overrides
  };
}

function postgresAdminReadback() {
  const receiptId = "823e4567-e89b-42d3-a456-426614174000";
  const record = {
    ...cataloguedRecord(),
    verification_receipts: [{
      receipt_id: receiptId,
      evidence_type: "UNIT_TEST",
      environment: "PRODUCTION",
      status: "PASSED",
      reference: "repository@commit:path",
      content_sha256: "a".repeat(64),
      captured_at: postgresTimestamp,
      expires_at: "2026-08-03T06:00:00.123456+00:00"
    }],
    last_verified_at: postgresTimestamp,
    failure_state: {
      code: "PRODUCTION_READBACK_FAILED",
      summary: "A bounded readback failure is retained for audit.",
      observed_at: postgresTimestamp,
      retryable: true
    },
    created_at: postgresTimestamp,
    updated_at: postgresTimestamp
  };
  const transitionedRecord = {
    ...record,
    lifecycle_state: "DESIGNED",
    record_version: 2
  };
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    registry_revision: 2,
    generated_at: postgresTimestamp,
    records: [record],
    claims: [{
      claim_id: "223e4567-e89b-42d3-a456-426614174000",
      claim_key: "entral.workspace.website",
      capability_id: capabilityId,
      capability_version: "1.0.0",
      environment: "PRODUCTION",
      surface: "WEBSITE",
      status: "APPROVED",
      approved_language: "A verified ENTRAL workspace is available.",
      limitations: ["Authentication is required."],
      evidence_receipt_ids: [receiptId],
      requires_tenant_installation: false,
      approved_by_actor_id: "323e4567-e89b-42d3-a456-426614174000",
      approved_at: postgresTimestamp,
      record_version: 1,
      created_at: postgresTimestamp,
      updated_at: postgresTimestamp
    }],
    installations: [{
      installation_id: "423e4567-e89b-42d3-a456-426614174000",
      tenant_id: "523e4567-e89b-42d3-a456-426614174000",
      organization_id: "623e4567-e89b-42d3-a456-426614174000",
      capability_id: capabilityId,
      capability_version: "1.0.0",
      state: "ACTIVE",
      plan_eligible: true,
      feature_flags: {},
      limits: {},
      suspension_reason: null,
      activated_at: postgresTimestamp,
      verification_receipt_ids: [receiptId],
      record_version: 1,
      created_at: postgresTimestamp,
      updated_at: postgresTimestamp
    }],
    verification_receipts: [{
      capability_id: capabilityId,
      capability_version: "1.0.0",
      ...record.verification_receipts[0]
    }],
    dependencies: [],
    transition_audit: [{
      transition_id: "723e4567-e89b-42d3-a456-426614174000",
      capability_id: capabilityId,
      capability_version: "1.0.0",
      from_state: "CATALOGUED",
      to_state: "DESIGNED",
      pricing_eligibility: "NOT_ELIGIBLE",
      prior_record_version: 1,
      resulting_record_version: 2,
      evidence_receipt_ids: [receiptId],
      reason: "A bounded design packet is complete.",
      actor_id: "323e4567-e89b-42d3-a456-426614174000",
      tenant_id: null,
      organization_id: null,
      business_id: null,
      correlation_id: "923e4567-e89b-42d3-a456-426614174000",
      idempotency_key: "phase203-production-shaped-readback",
      request_sha256: "b".repeat(64),
      release_version: "phase-203",
      response_snapshot: transitionedRecord,
      requested_at: postgresTimestamp,
      recorded_at: postgresTimestamp
    }],
    installation_transition_audit: [{
      transition_id: "a23e4567-e89b-42d3-a456-426614174000",
      installation_id: "423e4567-e89b-42d3-a456-426614174000",
      tenant_id: "523e4567-e89b-42d3-a456-426614174000",
      organization_id: "623e4567-e89b-42d3-a456-426614174000",
      business_id: null,
      capability_id: capabilityId,
      capability_version: "1.0.0",
      from_state: "ACTIVATING",
      to_state: "ACTIVE",
      prior_record_version: 1,
      resulting_record_version: 2,
      reason: "Production verification completed.",
      actor_id: "323e4567-e89b-42d3-a456-426614174000",
      correlation_id: "b23e4567-e89b-42d3-a456-426614174000",
      idempotency_key: "phase203-installation-readback",
      release_version: "phase-203",
      recorded_at: postgresTimestamp
    }]
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tenantOrganizationId = "523e4567-e89b-42d3-a456-426614174000";
});

describe("Phase 203 Capability Truth service", () => {
  it("builds a fresh empty projection rather than falling back to static claims", async () => {
    mocks.rootQueryRaw.mockResolvedValue([{ claims: [], registryRevision: 1n }]);
    const { CapabilityTruthService } = await import("../src/services/capabilityTruth.js");
    const service = new CapabilityTruthService({ $queryRaw: mocks.rootQueryRaw } as never, () => now);
    await expect(service.getPublicProjection("WEBSITE")).resolves.toEqual({
      contract_version: "1.0.0",
      schema_version: 1,
      projection_id: expect.any(String),
      environment: "PRODUCTION",
      surface: "WEBSITE",
      registry_revision: 1,
      generated_at: "2026-08-03T05:00:00.000Z",
      expires_at: "2026-08-03T05:05:00.000Z",
      claims: []
    });
  });

  it("rejects any database claim that is not explicitly SELLABLE", async () => {
    mocks.rootQueryRaw.mockResolvedValue([{
      claims: [publicClaim({ lifecycle_state: "ACTIVE" })],
      registryRevision: 8n
    }]);
    const { CapabilityTruthService, CapabilityTruthServiceError } = await import("../src/services/capabilityTruth.js");
    const service = new CapabilityTruthService({ $queryRaw: mocks.rootQueryRaw } as never, () => now);
    await expect(service.getPublicProjection("WEBSITE")).rejects.toMatchObject({
      code: "PRODUCT_TRUTH_UNAVAILABLE",
      statusCode: 503
    } satisfies Partial<InstanceType<typeof CapabilityTruthServiceError>>);
  });

  it("requires the database-resolved tenant and organization to match the member session", async () => {
    const { CapabilityTruthService } = await import("../src/services/capabilityTruth.js");
    const service = new CapabilityTruthService({ $queryRaw: mocks.rootQueryRaw } as never, () => now);
    mocks.tenantOrganizationId = "923e4567-e89b-42d3-a456-426614174000";
    await expect(service.getMemberProjection({
      authSubject: "member-user",
      organizationId: "523e4567-e89b-42d3-a456-426614174000",
      requestId: "request-1",
      tenantId: "423e4567-e89b-42d3-a456-426614174000"
    }, "TUTORIAL")).rejects.toMatchObject({
      code: "TENANT_ACTOR_BINDING_MISMATCH",
      statusCode: 403
    });
    expect(mocks.tenantQueryRaw).not.toHaveBeenCalled();
  });

  it("validates the full internal readback instead of trusting arbitrary JSON", async () => {
    mocks.personalQueryRaw.mockResolvedValue([{ value: {
      contract_version: "1.0.0",
      schema_version: 1,
      registry_revision: 1,
      generated_at: now.toISOString(),
      records: [cataloguedRecord()],
      claims: [],
      installations: [],
      verification_receipts: [],
      dependencies: [],
      transition_audit: [],
      installation_transition_audit: []
    } }]);
    const { CapabilityTruthService } = await import("../src/services/capabilityTruth.js");
    const service = new CapabilityTruthService({ $queryRaw: mocks.rootQueryRaw } as never, () => now);
    const readback = await service.getAdminReadback({ authSubject: "admin-user", requestId: "request-2" });
    expect(readback.records).toHaveLength(1);
    expect(readback.records[0]?.lifecycle_state).toBe("CATALOGUED");

    mocks.personalQueryRaw.mockResolvedValue([{ value: { records: [{ lifecycle_state: "SELLABLE" }] } }]);
    await expect(service.getAdminReadback({ authSubject: "admin-user", requestId: "request-3" })).rejects.toMatchObject({
      code: "MALFORMED_ADMIN_READBACK"
    });
  });

  it("canonicalizes PostgreSQL timestamp offsets across the full admin readback before validation", async () => {
    const rawReadback = postgresAdminReadback();
    mocks.personalQueryRaw.mockResolvedValue([{ value: rawReadback }]);
    const { CapabilityTruthService } = await import("../src/services/capabilityTruth.js");
    const service = new CapabilityTruthService({ $queryRaw: mocks.rootQueryRaw } as never, () => now);
    const readback = await service.getAdminReadback({ authSubject: "admin-user", requestId: "request-offset" });
    expect(JSON.stringify(readback)).not.toContain("+00:00");
    expect(readback.generated_at).toBe(now.toISOString());
    expect(readback.records[0]?.verification_receipts[0]?.expires_at).toBe("2026-08-03T06:00:00.123Z");
    expect(readback.transition_audit[0]?.response_snapshot.created_at).toBe(now.toISOString());
    expect(readback.installation_transition_audit[0]?.recorded_at).toBe(now.toISOString());
    expect(rawReadback.generated_at).toBe(postgresTimestamp);
  });

  it("keeps malformed PostgreSQL timestamp fields fail-closed", async () => {
    const malformed = postgresAdminReadback();
    malformed.generated_at = "2026-08-03";
    mocks.personalQueryRaw.mockResolvedValue([{ value: malformed }]);
    const { CapabilityTruthService } = await import("../src/services/capabilityTruth.js");
    const service = new CapabilityTruthService({ $queryRaw: mocks.rootQueryRaw } as never, () => now);
    await expect(service.getAdminReadback({ authSubject: "admin-user", requestId: "request-malformed-offset" }))
      .rejects.toMatchObject({ code: "MALFORMED_ADMIN_READBACK", statusCode: 500 });
  });

  it("binds transition actor authority to the authenticated Human actor", async () => {
    const { CapabilityTruthService } = await import("../src/services/capabilityTruth.js");
    const service = new CapabilityTruthService({ $queryRaw: mocks.rootQueryRaw } as never, () => now);
    await expect(service.transition({ authSubject: "admin-user", requestId: "request-4" }, {
      transition_id: "a23e4567-e89b-42d3-a456-426614174000",
      capability_id: capabilityId,
      from_state: "CATALOGUED",
      to_state: "DESIGNED",
      pricing_eligibility: "NOT_ELIGIBLE",
      expected_record_version: 1,
      evidence_receipt_ids: [],
      reason: "A bounded design packet is complete.",
      actor_id: "b23e4567-e89b-42d3-a456-426614174000",
      tenant_id: null,
      organization_id: null,
      business_id: null,
      correlation_id: "c23e4567-e89b-42d3-a456-426614174000",
      idempotency_key: "phase203-actor-binding",
      release_version: "phase-203",
      requested_at: now.toISOString()
    })).rejects.toMatchObject({
      code: "CAPABILITY_AUTHORITY_MISMATCH",
      statusCode: 403
    });
    expect(mocks.personalQueryRaw).not.toHaveBeenCalled();
  });

  it("maps PostgreSQL transition failures to bounded API errors without leaking SQL", async () => {
    mocks.personalQueryRaw.mockRejectedValue({ code: "P2010", meta: { code: "23514", message: "sensitive database detail" } });
    const { CapabilityTruthService } = await import("../src/services/capabilityTruth.js");
    const service = new CapabilityTruthService({ $queryRaw: mocks.rootQueryRaw } as never, () => now);
    await expect(service.recordEvidence({ authSubject: "admin-user", requestId: "request-5" }, {
      capability_id: capabilityId,
      expected_record_version: 1,
      idempotency_key: "phase203-bounded-error",
      receipt: {
        receipt_id: "d23e4567-e89b-42d3-a456-426614174000",
        evidence_type: "UNIT_TEST",
        environment: "PRODUCTION",
        status: "PASSED",
        reference: "repository@commit:path",
        content_sha256: "a".repeat(64),
        captured_at: now.toISOString(),
        expires_at: null
      }
    })).rejects.toMatchObject({
      code: "CAPABILITY_REQUIREMENTS_UNSATISFIED",
      message: "Capability Truth requirements are not satisfied.",
      statusCode: 422
    });
  });
});
