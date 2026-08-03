import { beforeEach, describe, expect, it, vi } from "vitest";

const ids = {
  actor: "123e4567-e89b-42d3-a456-426614174000",
  appUser: "223e4567-e89b-42d3-a456-426614174000",
  organization: "323e4567-e89b-42d3-a456-426614174000",
  tenant: "423e4567-e89b-42d3-a456-426614174000"
};

const mocks = vi.hoisted(() => ({
  identity: {
    actorId: "123e4567-e89b-42d3-a456-426614174000",
    appUserId: "223e4567-e89b-42d3-a456-426614174000",
    organizationId: "323e4567-e89b-42d3-a456-426614174000",
    role: "OWNER",
    tenantId: "423e4567-e89b-42d3-a456-426614174000"
  },
  queryRaw: vi.fn(),
  sessionContexts: [] as unknown[],
  sessionOptions: [] as unknown[]
}));

vi.mock("../src/db.js", () => ({
  prisma: {},
  withTenantSession: async (
    _database: unknown,
    context: unknown,
    operation: (transaction: unknown, identity: unknown) => unknown,
    options: unknown
  ) => {
    mocks.sessionContexts.push(context);
    mocks.sessionOptions.push(options);
    return operation({ $queryRaw: mocks.queryRaw }, mocks.identity);
  }
}));

function context(recentMfaVerified = true) {
  return {
    authSubject: "member-user",
    organizationId: ids.organization,
    recentMfaVerified,
    requestId: "request-phase204-service",
    tenantId: ids.tenant
  };
}

function jsonEnvelope(query: unknown): Record<string, unknown> {
  const values = (query as { values?: unknown[] }).values ?? [];
  const serialized = values.find((value) => typeof value === "string" && value.startsWith("{"));
  if (typeof serialized !== "string") throw new Error("Expected a JSON envelope in the SQL query.");
  return JSON.parse(serialized) as Record<string, unknown>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessionContexts.length = 0;
  mocks.sessionOptions.length = 0;
  Object.assign(mocks.identity, {
    actorId: ids.actor,
    appUserId: ids.appUser,
    organizationId: ids.organization,
    role: "OWNER",
    tenantId: ids.tenant
  });
  mocks.queryRaw.mockResolvedValue([{ value: { release_version: "phase-204" } }]);
});

describe("Phase 204 internal commerce service", () => {
  it("returns only an exact tenant-bound not-activated readback", async () => {
    mocks.queryRaw.mockResolvedValue([{ value: {
      business: null,
      organization_id: ids.organization,
      release_version: "phase-204",
      state: "NOT_ACTIVATED",
      tenant_id: ids.tenant
    } }]);
    const { Phase204InternalCommerceService } = await import("../src/services/phase204InternalCommerce.js");
    const service = new Phase204InternalCommerceService({} as never);
    await expect(service.getReadback(context())).resolves.toMatchObject({ state: "NOT_ACTIVATED" });
    expect(mocks.sessionContexts[0]).toMatchObject({
      authSubject: "member-user",
      requestId: "request-phase204-service",
      tenantId: ids.tenant
    });
  });

  it("fails before SQL when the database-resolved organization does not match", async () => {
    mocks.identity.organizationId = "523e4567-e89b-42d3-a456-426614174000";
    const { Phase204InternalCommerceService } = await import("../src/services/phase204InternalCommerce.js");
    const service = new Phase204InternalCommerceService({} as never);
    await expect(service.activate(context(), {
      activation_id: "623e4567-e89b-42d3-a456-426614174000",
      idempotency_key: "phase204-tenant-mismatch"
    })).rejects.toMatchObject({ code: "TENANT_ACTOR_BINDING_MISMATCH", statusCode: 403 });
    expect(mocks.queryRaw).not.toHaveBeenCalled();
  });

  it("injects exact tenant scope and preserves stable idempotent activation envelopes", async () => {
    mocks.queryRaw.mockResolvedValue([{ value: {
      activation_id: "623e4567-e89b-42d3-a456-426614174000",
      business_boundary_id: "633e4567-e89b-42d3-a456-426614174000",
      canonical_business_id: "643e4567-e89b-42d3-a456-426614174000",
      release_version: "phase-204"
    } }]);
    const { Phase204InternalCommerceService } = await import("../src/services/phase204InternalCommerce.js");
    const service = new Phase204InternalCommerceService({} as never);
    const input = {
      activation_id: "623e4567-e89b-42d3-a456-426614174000",
      idempotency_key: "phase204-stable-activation",
      requested_at: "2026-08-03T20:00:00.000Z"
    };
    await service.activate(context(), input);
    await service.activate(context(), input);
    const first = jsonEnvelope(mocks.queryRaw.mock.calls[0]![0]);
    const second = jsonEnvelope(mocks.queryRaw.mock.calls[1]![0]);
    expect(second).toEqual(first);
    expect(first).toEqual({
      ...input,
      organization_id: ids.organization,
      release_version: "phase-204",
      tenant_id: ids.tenant
    });
    expect(mocks.sessionOptions).toEqual([
      { isolationLevel: "Serializable" },
      { isolationLevel: "Serializable" }
    ]);
  });

  it("injects the authenticated Human actor into capability transitions and approvals", async () => {
    const { Phase204InternalCommerceService } = await import("../src/services/phase204InternalCommerce.js");
    const service = new Phase204InternalCommerceService({} as never);
    mocks.queryRaw.mockResolvedValueOnce([{ value: {
      capability_id: "723e4567-e89b-42d3-a456-426614174000",
      lifecycle_state: "ACTIVE",
      release_version: "phase-204"
    } }]);
    await service.transitionCapability(context(), {
      capability_id: "723e4567-e89b-42d3-a456-426614174000",
      idempotency_key: "phase204-capability-transition"
    });
    expect(jsonEnvelope(mocks.queryRaw.mock.calls[0]![0])).toMatchObject({ actor_id: ids.actor });

    mocks.queryRaw.mockResolvedValue([{ value: {
      approval_id: "823e4567-e89b-42d3-a456-426614174000",
      external_publication_performed: false,
      release_version: "phase-204"
    } }]);
    await service.approvePublication(context(), {
      approval_id: "823e4567-e89b-42d3-a456-426614174000",
      idempotency_key: "phase204-owner-publication"
    });
    expect(jsonEnvelope(mocks.queryRaw.mock.calls[1]![0])).toMatchObject({ owner_actor_id: ids.actor });
  });

  it("accepts the canonical capability lifecycle field but rejects any field outside the shared allowlist", async () => {
    const { Phase204InternalCommerceService } = await import("../src/services/phase204InternalCommerce.js");
    const service = new Phase204InternalCommerceService({} as never);
    mocks.queryRaw.mockResolvedValueOnce([{ value: {
      capability_id: "723e4567-e89b-42d3-a456-426614174000",
      catalog_capability_id: "20300000-0002-4000-8000-000000000108",
      lifecycle_state: "IMPLEMENTED",
      release_version: "phase-204"
    } }]);
    await expect(service.registerCapability(context(), {
      idempotency_key: "phase204-capability-lifecycle"
    })).resolves.toMatchObject({ lifecycle_state: "IMPLEMENTED" });

    mocks.queryRaw.mockResolvedValueOnce([{ value: {
      capability_id: "723e4567-e89b-42d3-a456-426614174000",
      catalog_capability_id: "20300000-0002-4000-8000-000000000108",
      lifecycle_state: "IMPLEMENTED",
      release_version: "phase-204",
      unexpected_internal_field: "must-not-cross-the-service-boundary"
    } }]);
    await expect(service.registerCapability(context(), {
      idempotency_key: "phase204-capability-unknown-field"
    })).rejects.toMatchObject({ code: "MALFORMED_INTERNAL_COMMERCE_RESPONSE", statusCode: 503 });
  });

  it("registers product evidence through the exact bounded SQL function", async () => {
    mocks.queryRaw.mockResolvedValue([{ value: {
      artifact_id: "923e4567-e89b-42d3-a456-426614174000",
      product_id: "a23e4567-e89b-42d3-a456-426614174000",
      release_version: "phase-204",
      source_record_id: "b23e4567-e89b-42d3-a456-426614174000"
    } }]);
    const { Phase204InternalCommerceService } = await import("../src/services/phase204InternalCommerce.js");
    const service = new Phase204InternalCommerceService({} as never);
    await service.registerProductEvidence(context(), {
      artifact_id: "923e4567-e89b-42d3-a456-426614174000",
      idempotency_key: "phase204-product-evidence",
      product_id: "a23e4567-e89b-42d3-a456-426614174000"
    });
    const envelope = jsonEnvelope(mocks.queryRaw.mock.calls[0]![0]);
    expect(envelope).toMatchObject({
      organization_id: ids.organization,
      release_version: "phase-204",
      tenant_id: ids.tenant
    });
    expect(String((mocks.queryRaw.mock.calls[0]![0] as { strings?: string[] }).strings?.join("")))
      .toContain("phase204_register_product_evidence");
  });

  it("forces final, cleared product asset truth in the database envelope", async () => {
    mocks.queryRaw.mockResolvedValue([{ value: {
      product_asset_id: "c23e4567-e89b-42d3-a456-426614174000",
      release_version: "phase-204"
    } }]);
    const { Phase204InternalCommerceService } = await import("../src/services/phase204InternalCommerce.js");
    const service = new Phase204InternalCommerceService({} as never);
    await service.registerProductAsset(context(), {
      idempotency_key: "phase204-product-asset",
      license_status: "UNRESOLVED",
      product_asset_id: "c23e4567-e89b-42d3-a456-426614174000",
      readiness: "DRAFT"
    });
    expect(jsonEnvelope(mocks.queryRaw.mock.calls[0]![0])).toMatchObject({
      license_status: "CLEARED",
      readiness: "FINAL"
    });
  });

  it.each([
    ["publication approval", (service: InstanceType<typeof import("../src/services/phase204InternalCommerce.js").Phase204InternalCommerceService>) => service.approvePublication(context(false), { idempotency_key: "phase204-no-mfa-approval" })],
    ["published storefront", (service: InstanceType<typeof import("../src/services/phase204InternalCommerce.js").Phase204InternalCommerceService>) => service.recordStorefrontState(context(false), { idempotency_key: "phase204-no-mfa-store", state: "PUBLISHED" })],
    ["published listing", (service: InstanceType<typeof import("../src/services/phase204InternalCommerce.js").Phase204InternalCommerceService>) => service.recordListingState(context(false), { idempotency_key: "phase204-no-mfa-listing", status: "PUBLISHED" })],
    ["business kill", (service: InstanceType<typeof import("../src/services/phase204InternalCommerce.js").Phase204InternalCommerceService>) => service.setControl(context(false), { action: "KILL_BUSINESS", idempotency_key: "phase204-no-mfa-kill" })]
  ])("requires recent MFA for %s before opening a tenant transaction", async (_label, operation) => {
    const { Phase204InternalCommerceService } = await import("../src/services/phase204InternalCommerce.js");
    const service = new Phase204InternalCommerceService({} as never);
    await expect(operation(service)).rejects.toMatchObject({
      code: "RECENT_MFA_STEP_UP_REQUIRED",
      statusCode: 403
    });
    expect(mocks.queryRaw).not.toHaveBeenCalled();
    expect(mocks.sessionContexts).toHaveLength(0);
  });

  it("never accepts credential-bearing or unbounded database response fields", async () => {
    mocks.queryRaw.mockResolvedValue([{ value: {
      access_token: "should-never-leave-database",
      release_version: "phase-204"
    } }]);
    const { Phase204InternalCommerceService } = await import("../src/services/phase204InternalCommerce.js");
    const service = new Phase204InternalCommerceService({} as never);
    await expect(service.ingestProviderFact(context(), {
      idempotency_key: "phase204-provider-no-secrets"
    })).rejects.toMatchObject({ code: "MALFORMED_INTERNAL_COMMERCE_RESPONSE", statusCode: 503 });
  });

  it.each([
    ["22023", 400, "INVALID_INTERNAL_COMMERCE_REQUEST"],
    ["23503", 404, "INTERNAL_COMMERCE_RECORD_NOT_FOUND"],
    ["23505", 409, "INTERNAL_COMMERCE_IDEMPOTENCY_CONFLICT"],
    ["40001", 409, "INTERNAL_COMMERCE_REVISION_CONFLICT"],
    ["55000", 409, "INTERNAL_COMMERCE_STATE_CONFLICT"],
    ["23514", 422, "INTERNAL_COMMERCE_REQUIREMENTS_UNSATISFIED"],
    ["42501", 403, "INTERNAL_COMMERCE_AUTHORITY_REQUIRED"]
  ])("maps PostgreSQL SQLSTATE %s without exposing database details", async (sqlState, statusCode, code) => {
    const { phase204DatabaseFailure } = await import("../src/services/phase204InternalCommerce.js");
    expect(phase204DatabaseFailure({ code: "P2010", meta: { code: sqlState }, message: "sensitive SQL" })).toMatchObject({
      code,
      statusCode
    });
  });

  it("maps unknown database failures to a bounded 503", async () => {
    const { phase204DatabaseFailure } = await import("../src/services/phase204InternalCommerce.js");
    const failure = phase204DatabaseFailure(new Error("postgresql://secret@host/customer"));
    expect(failure).toMatchObject({ code: "INTERNAL_COMMERCE_UNAVAILABLE", statusCode: 503 });
    expect(failure.message).not.toContain("postgresql");
  });
});
