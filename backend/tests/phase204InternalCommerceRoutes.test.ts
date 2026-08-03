import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ids = {
  actor: "123e4567-e89b-42d3-a456-426614174000",
  organization: "223e4567-e89b-42d3-a456-426614174000",
  tenant: "323e4567-e89b-42d3-a456-426614174000",
  storefront: "423e4567-e89b-42d3-a456-426614174000"
};
const organizationRouteId = "cm12345678901234567890123";
const now = new Date("2026-08-03T20:00:00.000Z");

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  approvePublication: vi.fn(),
  bindCapabilityRequirement: vi.fn(),
  getReadback: vi.fn(),
  ingestProviderFact: vi.fn(),
  recordCapabilityEvidence: vi.fn(),
  recordListingState: vi.fn(),
  recordMetricTruth: vi.fn(),
  recordProductGate: vi.fn(),
  recordStorefrontState: vi.fn(),
  registerCapability: vi.fn(),
  registerInstallation: vi.fn(),
  registerProductAsset: vi.fn(),
  registerProductEvidence: vi.fn(),
  setControl: vi.fn(),
  transitionCapability: vi.fn(),
  transitionInstallation: vi.fn(),
  activate: vi.fn()
}));

vi.mock("../src/env.js", () => ({ env: { MFA_STEP_UP_TTL_SECONDS: 600 } }));

vi.mock("../src/auth.js", () => ({
  requireAuth: async (
    request: { headers: Record<string, unknown>; user?: unknown },
    reply: { code: (status: number) => { send: (body: unknown) => unknown } }
  ) => {
    if (request.headers["x-test-session"] !== "member") {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    request.user = {
      actorId: "123e4567-e89b-42d3-a456-426614174000",
      email: "member@example.test",
      organizationId: "223e4567-e89b-42d3-a456-426614174000",
      role: "USER",
      session: "member",
      sessionId: "523e4567-e89b-42d3-a456-426614174000",
      sessionVersion: 1,
      stepUpAt: request.headers["x-test-mfa"] === "recent" ? "2026-08-03T19:55:00.000Z" : null,
      sub: "member-user",
      supportGrantId: null,
      tenantId: "323e4567-e89b-42d3-a456-426614174000",
      tokenId: "623e4567-e89b-42d3-a456-426614174000",
      tokenVersion: 2
    };
  },
  setPrivateNoStoreHeaders: (reply: { header: (name: string, value: string) => unknown }) => {
    reply.header("cache-control", "private, no-store");
    reply.header("vary", "Origin, Cookie, Authorization");
  }
}));

vi.mock("../src/db.js", () => ({
  hasVerifiedMemberTeamAccess: mocks.access,
  prisma: {}
}));

function service() {
  return {
    activate: mocks.activate,
    approvePublication: mocks.approvePublication,
    bindCapabilityRequirement: mocks.bindCapabilityRequirement,
    getReadback: mocks.getReadback,
    ingestProviderFact: mocks.ingestProviderFact,
    recordCapabilityEvidence: mocks.recordCapabilityEvidence,
    recordListingState: mocks.recordListingState,
    recordMetricTruth: mocks.recordMetricTruth,
    recordProductGate: mocks.recordProductGate,
    recordStorefrontState: mocks.recordStorefrontState,
    registerCapability: mocks.registerCapability,
    registerInstallation: mocks.registerInstallation,
    registerProductAsset: mocks.registerProductAsset,
    registerProductEvidence: mocks.registerProductEvidence,
    setControl: mocks.setControl,
    transitionCapability: mocks.transitionCapability,
    transitionInstallation: mocks.transitionInstallation
  };
}

async function testServer() {
  const { phase204InternalCommerceRoutes } = await import("../src/routes/phase204InternalCommerce.js");
  const app = Fastify();
  await app.register(phase204InternalCommerceRoutes, {
    accessChecker: mocks.access,
    clock: () => now,
    prefix: "/api/v1",
    service: service() as never
  });
  return app;
}

function memberHeaders(overrides: Record<string, string> = {}) {
  return { "x-test-session": "member", ...overrides };
}

function activationPayload(overrides: Record<string, unknown> = {}) {
  return {
    activation_id: "723e4567-e89b-42d3-a456-426614174000",
    artifact_storage_uri: "mykai05/ENTRAL-0.2@438e1b0546532efa48cd156e08af12168f4283d1:artifacts/phase204/activation.json",
    content_sha256: "a".repeat(64),
    evidence_artifact_id: "823e4567-e89b-42d3-a456-426614174000",
    release_commit_sha: "438e1b0546532efa48cd156e08af12168f4283d1",
    repository_reference: "mykai05/ENTRAL-0.2@438e1b0546532efa48cd156e08af12168f4283d1:docs/PHASE_204.md",
    requested_at: now.toISOString(),
    source_record_id: "923e4567-e89b-42d3-a456-426614174000",
    ...overrides
  };
}

function publicationApprovalPayload() {
  const products = [
    ["LEAD_RESPONSE_ESTIMATE_FOLLOW_UP_KIT", 2_900],
    ["SCOPE_CHANGE_ORDER_CONTROL_PACK", 4_900],
    ["BILLING_COLLECTIONS_ACCELERATOR", 4_900],
    ["WEEKLY_OWNER_COMMAND_DASHBOARD", 3_900],
    ["COMPLETE_CONTRACTOR_CONTROL_BUNDLE", 11_900]
  ] as const;
  return {
    advertising_budget_cents: 0,
    approval_id: "a23e4567-e89b-42d3-a456-426614174000",
    approved: true,
    approved_at: now.toISOString(),
    authority: "FIRST_EXTERNAL_PUBLICATION",
    envelope_sha256: "b".repeat(64),
    product_approvals: products.map(([product_code, price_cents]) => ({
      approved: true,
      claims_sha256: "c".repeat(64),
      delivery_manifest_sha256: "d".repeat(64),
      price_cents,
      product_code
    })),
    public_brand_name: "Contractor Command Works",
    revoked_at: null,
    selected_provider: "ETSY",
    setup_spend_limit_cents: 15_000,
    storefront_id: ids.storefront
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.access.mockResolvedValue(true);
  for (const operation of Object.values(service())) {
    operation.mockResolvedValue({ external_provider_mutation_performed: false, release_version: "phase-204" });
  }
  mocks.getReadback.mockResolvedValue({
    business: null,
    organization_id: ids.organization,
    release_version: "phase-204",
    state: "NOT_ACTIVATED",
    tenant_id: ids.tenant
  });
  mocks.approvePublication.mockResolvedValue({
    external_publication_performed: false,
    release_version: "phase-204"
  });
});

describe("Phase 204 internal commerce member routes", () => {
  it("requires a durable member session and always disables private caching", async () => {
    const app = await testServer();
    const unauthorized = await app.inject({
      method: "GET",
      url: `/api/v1/member/organizations/${organizationRouteId}/internal-commerce`
    });
    expect(unauthorized.statusCode).toBe(401);

    const response = await app.inject({
      headers: memberHeaders(),
      method: "GET",
      url: `/api/v1/member/organizations/${organizationRouteId}/internal-commerce`
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers.vary).toContain("Authorization");
    expect(response.json().session_authority).toEqual({ recent_mfa_verified: false });
    expect(mocks.getReadback).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: ids.organization,
      tenantId: ids.tenant
    }));
    await app.close();
  });

  it("exposes only the bounded durable MFA authority bit for real owner controls", async () => {
    const app = await testServer();
    const response = await app.inject({
      headers: memberHeaders({ "x-test-mfa": "recent" }),
      method: "GET",
      url: `/api/v1/member/organizations/${organizationRouteId}/internal-commerce`
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().session_authority).toEqual({ recent_mfa_verified: true });
    expect(response.json()).not.toHaveProperty("session_id");
    expect(response.json()).not.toHaveProperty("actor_id");
    await app.close();
  });

  it("hides tenant and organization access failures as 404", async () => {
    mocks.access.mockResolvedValue(false);
    const app = await testServer();
    const response = await app.inject({
      headers: memberHeaders(),
      method: "GET",
      url: `/api/v1/member/organizations/${organizationRouteId}/internal-commerce`
    });
    expect(response.statusCode).toBe(404);
    expect(mocks.getReadback).not.toHaveBeenCalled();
    await app.close();
  });

  it("requires a stable idempotency key and rejects unknown fields before writes", async () => {
    const app = await testServer();
    const noKey = await app.inject({
      headers: memberHeaders(),
      method: "POST",
      payload: activationPayload(),
      url: `/api/v1/member/organizations/${organizationRouteId}/internal-commerce/activation`
    });
    expect(noKey.statusCode).toBe(400);
    expect(noKey.json().code).toBe("IDEMPOTENCY_KEY_INVALID");

    const unknown = await app.inject({
      headers: memberHeaders({ "idempotency-key": "phase204-strict-activation" }),
      method: "POST",
      payload: activationPayload({ unexpected: "not accepted" }),
      url: `/api/v1/member/organizations/${organizationRouteId}/internal-commerce/activation`
    });
    expect(unknown.statusCode).toBe(400);
    expect(mocks.activate).not.toHaveBeenCalled();
    await app.close();
  });

  it("passes byte-stable IDs, timestamps, cents, and idempotency input without generating replacements", async () => {
    const app = await testServer();
    const headers = memberHeaders({ "idempotency-key": "phase204-repeat-activation" });
    for (let index = 0; index < 2; index += 1) {
      const response = await app.inject({
        headers,
        method: "POST",
        payload: activationPayload(),
        url: `/api/v1/member/organizations/${organizationRouteId}/internal-commerce/activation`
      });
      expect(response.statusCode).toBe(200);
    }
    expect(mocks.activate.mock.calls[1]![1]).toEqual(mocks.activate.mock.calls[0]![1]);
    expect(mocks.activate.mock.calls[0]![1]).toEqual({
      ...activationPayload(),
      idempotency_key: "phase204-repeat-activation"
    });
    await app.close();
  });

  it("registers exact repository-backed product evidence without provider mutation", async () => {
    mocks.registerProductEvidence.mockResolvedValue({
      artifact_id: "f23e4567-e89b-42d3-a456-426614174000",
      external_provider_mutation_performed: false,
      release_version: "phase-204"
    });
    const app = await testServer();
    const productId = "f23e4567-e89b-42d3-a456-426614174001";
    const payload = {
      artifact_id: "f23e4567-e89b-42d3-a456-426614174000",
      byte_size: 4_096,
      captured_at: now.toISOString(),
      content_sha256: "f".repeat(64),
      evidence_code: "EDITABLE_SOURCE",
      evidence_kind: "PRODUCT_ASSET",
      file_name: "lead-response-kit.xlsx",
      media_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      product_id: productId,
      source_record_id: "f23e4567-e89b-42d3-a456-426614174002",
      source_reference: "mykai05/ENTRAL-0.2@438e1b0546532efa48cd156e08af12168f4283d1:commerce/products/lead-response-kit.xlsx"
    };
    const response = await app.inject({
      headers: memberHeaders({ "idempotency-key": "phase204-product-evidence" }),
      method: "POST",
      payload,
      url: `/api/v1/member/organizations/${organizationRouteId}/internal-commerce/products/${productId}/evidence`
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(mocks.registerProductEvidence).toHaveBeenCalledWith(expect.objectContaining({ tenantId: ids.tenant }), {
      ...payload,
      idempotency_key: "phase204-product-evidence"
    });
    await app.close();
  });

  it("rejects route/body identifier mismatches", async () => {
    const app = await testServer();
    const response = await app.inject({
      headers: memberHeaders({ "idempotency-key": "phase204-listing-mismatch" }),
      method: "POST",
      payload: {
        delivery_manifest_sha256: "e".repeat(64),
        listing_record_id: "b23e4567-e89b-42d3-a456-426614174000",
        price_cents: 2_900,
        product_code: "LEAD_RESPONSE_ESTIMATE_FOLLOW_UP_KIT",
        provider_evidence_ids: [],
        provider_listing_id: null,
        published_at: null,
        status: "DRAFT",
        storefront_id: "c23e4567-e89b-42d3-a456-426614174000"
      },
      url: `/api/v1/member/organizations/${organizationRouteId}/internal-commerce/storefronts/${ids.storefront}/listings`
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().code, response.body).toBe("ROUTE_SCOPE_MISMATCH");
    expect(mocks.recordListingState).not.toHaveBeenCalled();
    await app.close();
  });

  it("requires recent durable MFA for owner approval before calling the service", async () => {
    const app = await testServer();
    const url = `/api/v1/member/organizations/${organizationRouteId}/internal-commerce/storefronts/${ids.storefront}/publication-approvals`;
    const stale = await app.inject({
      headers: memberHeaders({ "idempotency-key": "phase204-owner-approval" }),
      method: "POST",
      payload: publicationApprovalPayload(),
      url
    });
    expect(stale.statusCode, stale.body).toBe(403);
    expect(stale.json().code).toBe("RECENT_MFA_STEP_UP_REQUIRED");
    expect(mocks.approvePublication).not.toHaveBeenCalled();

    const approved = await app.inject({
      headers: memberHeaders({ "idempotency-key": "phase204-owner-approval", "x-test-mfa": "recent" }),
      method: "POST",
      payload: publicationApprovalPayload(),
      url
    });
    expect(approved.statusCode).toBe(200);
    expect(approved.json()).toEqual({ external_publication_performed: false, release_version: "phase-204" });
    expect(mocks.approvePublication).toHaveBeenCalledWith(expect.objectContaining({ recentMfaVerified: true }), expect.anything());
    await app.close();
  });

  it.each(["KILL_BUSINESS", "RESUME_BUSINESS", "ENABLE_PUBLICATION"] as const)(
    "requires recent MFA for the %s control",
    async (action) => {
      const app = await testServer();
      const response = await app.inject({
        headers: memberHeaders({ "idempotency-key": `phase204-control-${action.toLowerCase()}` }),
        method: "POST",
        payload: {
          action,
          business_boundary_id: "d23e4567-e89b-42d3-a456-426614174000",
          control_event_id: "e23e4567-e89b-42d3-a456-426614174000",
          evidence_ids: [],
          occurred_at: now.toISOString(),
          reason: "Owner-authorized bounded control test."
        },
        url: `/api/v1/member/organizations/${organizationRouteId}/internal-commerce/controls`
      });
      expect(response.statusCode).toBe(403);
      expect(mocks.setControl).not.toHaveBeenCalled();
      await app.close();
    }
  );

  it("maps service SQLSTATE failures without exposing database details", async () => {
    const { Phase204InternalCommerceServiceError } = await import("../src/services/phase204InternalCommerce.js");
    mocks.activate.mockRejectedValue(new Phase204InternalCommerceServiceError(
      "INTERNAL_COMMERCE_REVISION_CONFLICT",
      "Internal commerce state changed; retry from fresh readback.",
      409
    ));
    const app = await testServer();
    const response = await app.inject({
      headers: memberHeaders({ "idempotency-key": "phase204-conflict-activation" }),
      method: "POST",
      payload: activationPayload(),
      url: `/api/v1/member/organizations/${organizationRouteId}/internal-commerce/activation`
    });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: "INTERNAL_COMMERCE_REVISION_CONFLICT" });
    expect(response.body).not.toMatch(/SELECT|postgres|credential/iu);
    await app.close();
  });

  it("fails unknown service errors closed as a generic 503", async () => {
    mocks.getReadback.mockRejectedValue(new Error("customer database detail"));
    const app = await testServer();
    const response = await app.inject({
      headers: memberHeaders(),
      method: "GET",
      url: `/api/v1/member/organizations/${organizationRouteId}/internal-commerce`
    });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: "Service Unavailable",
      code: "INTERNAL_COMMERCE_UNAVAILABLE",
      message: "Internal commerce is temporarily unavailable."
    });
    expect(response.body).not.toContain("customer database");
    await app.close();
  });
});
