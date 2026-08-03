import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  process.env.NODE_ENV ??= "test";
  process.env.DATABASE_URL ??= "file:./phase203-capability-truth-routes.db";
  process.env.JWT_SECRET ??= "phase203-capability-truth-routes-test-secret";
  return {
    getAdminReadback: vi.fn(),
    getMemberProjection: vi.fn(),
    getPublicProjection: vi.fn(),
    hasVerifiedMemberTeamAccess: vi.fn(),
    recordEvidence: vi.fn(),
    transition: vi.fn()
  };
});

vi.mock("../src/auth.js", () => ({
  requireAuth: async (request: { headers: Record<string, unknown>; user?: unknown }, reply: { code: (status: number) => { send: (body: unknown) => unknown } }) => {
    if (request.headers["x-test-session"] !== "member" && request.headers["x-test-session"] !== "internal") {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    if (request.headers["x-test-session"] === "internal") {
      request.user = {
        email: "operator@example.test",
        role: "ADMIN",
        session: "internal",
        sub: "internal-operator"
      };
      return;
    }
    request.user = {
      email: "member@example.test",
      organizationId: "523e4567-e89b-42d3-a456-426614174000",
      role: "USER",
      session: "member",
      sub: "member-user",
      tenantId: "423e4567-e89b-42d3-a456-426614174000"
    };
  },
  requireAdmin: async (request: { headers: Record<string, unknown>; user?: unknown }, reply: { code: (status: number) => { send: (body: unknown) => unknown } }) => {
    if (request.headers["x-test-session"] !== "admin") {
      return reply.code(403).send({ error: "Forbidden" });
    }
    request.user = {
      email: "admin@example.test",
      role: "ADMIN",
      session: "internal",
      sub: "admin-user"
    };
  },
  setPrivateNoStoreHeaders: (reply: { header: (name: string, value: string) => unknown }) => {
    reply.header("cache-control", "private, no-store");
  }
}));

vi.mock("../src/db.js", () => ({
  hasVerifiedMemberTeamAccess: mocks.hasVerifiedMemberTeamAccess,
  prisma: {}
}));

const projection = {
  contract_version: "1.0.0",
  schema_version: 1,
  projection_id: "123e4567-e89b-42d3-a456-426614174000",
  environment: "PRODUCTION",
  surface: "WEBSITE",
  registry_revision: 1,
  generated_at: "2026-08-03T05:00:00.000Z",
  expires_at: "2026-08-03T05:05:00.000Z",
  claims: []
};

const publicationSurfaces = [
  "WEBSITE",
  "PRICING",
  "CHECKOUT",
  "PROPOSAL",
  "ONBOARDING",
  "TUTORIAL",
  "MEMBER_APPLICATION",
  "INTEGRATION_LIST",
  "SALES"
] as const;

async function testServer() {
  const [{ capabilityTruthRoutes }, { CapabilityTruthServiceError }] = await Promise.all([
    import("../src/routes/capabilityTruth.js"),
    import("../src/services/capabilityTruth.js")
  ]);
  const app = Fastify();
  await app.register(capabilityTruthRoutes, {
    prefix: "/api/v1",
    service: {
      getAdminReadback: mocks.getAdminReadback,
      getMemberProjection: mocks.getMemberProjection,
      getPublicProjection: mocks.getPublicProjection,
      recordEvidence: mocks.recordEvidence,
      transition: mocks.transition
    } as never
  });
  return { app, CapabilityTruthServiceError };
}

async function connectionTestServer() {
  const { connectionRoutes } = await import("../src/routes/connections.js");
  const app = Fastify();
  await app.register(connectionRoutes, {
    prefix: "/api/v1",
    productTruth: { getPublicProjection: mocks.getPublicProjection } as never
  });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPublicProjection.mockResolvedValue(projection);
  mocks.getMemberProjection.mockResolvedValue({ ...projection, surface: "TUTORIAL" });
  mocks.getAdminReadback.mockResolvedValue({
    contract_version: "1.0.0",
    schema_version: 1,
    registry_revision: 1,
    generated_at: projection.generated_at,
    records: [],
    claims: [],
    installations: [],
    verification_receipts: [],
    dependencies: [],
    transition_audit: [],
    installation_transition_audit: []
  });
  mocks.hasVerifiedMemberTeamAccess.mockResolvedValue(true);
});

describe("Phase 203 Capability Truth routes", () => {
  it("returns only the public-safe projection and disables caching", async () => {
    const { app } = await testServer();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/product-truth/claims?surface=WEBSITE"
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.json()).toEqual(projection);
    expect(mocks.getPublicProjection).toHaveBeenCalledWith("WEBSITE");
    await app.close();
  });

  it.each(publicationSurfaces)("binds the %s surface to its exact publication projection", async (surface) => {
    const { app } = await testServer();
    mocks.getPublicProjection.mockResolvedValue({ ...projection, surface });
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/product-truth/claims?surface=${surface}`
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().surface).toBe(surface);
    expect(mocks.getPublicProjection).toHaveBeenCalledWith(surface);
    await app.close();
  });

  it("fails closed with no claim payload when Product Truth is unavailable", async () => {
    const { app, CapabilityTruthServiceError } = await testServer();
    mocks.getPublicProjection.mockRejectedValue(new CapabilityTruthServiceError(
      "PRODUCT_TRUTH_UNAVAILABLE",
      "Database is unavailable.",
      503
    ));
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/product-truth/claims?surface=WEBSITE"
    });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: "Service Unavailable",
      code: "PRODUCT_TRUTH_UNAVAILABLE",
      message: "Capability Truth is temporarily unavailable."
    });
    expect(response.body).not.toContain("claims");
    await app.close();
  });

  it("binds member publication to verified tenant and legacy organization access", async () => {
    const { app } = await testServer();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/member/organizations/cm12345678901234567890123/product-truth?surface=TUTORIAL",
      headers: { "x-test-session": "member" }
    });
    expect(response.statusCode).toBe(200);
    expect(mocks.hasVerifiedMemberTeamAccess).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      teamId: "cm12345678901234567890123",
      tenantId: "423e4567-e89b-42d3-a456-426614174000",
      organizationId: "523e4567-e89b-42d3-a456-426614174000"
    }));
    expect(mocks.getMemberProjection).toHaveBeenCalledWith(expect.objectContaining({
      authSubject: "member-user",
      tenantId: "423e4567-e89b-42d3-a456-426614174000",
      organizationId: "523e4567-e89b-42d3-a456-426614174000"
    }), "TUTORIAL");
    await app.close();
  });

  it("keeps the complete registry behind the internal admin boundary", async () => {
    const { app } = await testServer();
    const memberResponse = await app.inject({
      method: "GET",
      url: "/api/v1/admin/product-truth",
      headers: { "x-test-session": "member" }
    });
    expect(memberResponse.statusCode).toBe(403);
    expect(mocks.getAdminReadback).not.toHaveBeenCalled();

    const adminResponse = await app.inject({
      method: "GET",
      url: "/api/v1/admin/product-truth",
      headers: { "x-test-session": "admin" }
    });
    expect(adminResponse.statusCode).toBe(200);
    expect(mocks.getAdminReadback).toHaveBeenCalledWith(expect.objectContaining({ authSubject: "admin-user" }));
    await app.close();
  });

  it("rejects route/body capability mismatches before evidence or transition writes", async () => {
    const { app } = await testServer();
    const routeCapabilityId = "123e4567-e89b-42d3-a456-426614174000";
    const bodyCapabilityId = "223e4567-e89b-42d3-a456-426614174000";
    const evidenceResponse = await app.inject({
      method: "POST",
      url: `/api/v1/admin/product-truth/capabilities/${routeCapabilityId}/evidence`,
      headers: { "x-test-session": "admin" },
      payload: {
        capability_id: bodyCapabilityId,
        expected_record_version: 1,
        idempotency_key: "phase203-evidence-mismatch",
        receipt: {
          receipt_id: "323e4567-e89b-42d3-a456-426614174000",
          evidence_type: "UNIT_TEST",
          environment: "PRODUCTION",
          status: "PASSED",
          reference: "repository@commit:path",
          content_sha256: "a".repeat(64),
          captured_at: "2026-08-03T05:00:00.000Z",
          expires_at: null
        }
      }
    });
    expect(evidenceResponse.statusCode).toBe(400);
    expect(mocks.recordEvidence).not.toHaveBeenCalled();

    const transitionResponse = await app.inject({
      method: "POST",
      url: `/api/v1/admin/product-truth/capabilities/${routeCapabilityId}/transitions`,
      headers: { "x-test-session": "admin" },
      payload: {
        transition_id: "423e4567-e89b-42d3-a456-426614174000",
        capability_id: bodyCapabilityId,
        from_state: "CATALOGUED",
        to_state: "DESIGNED",
        pricing_eligibility: "NOT_ELIGIBLE",
        expected_record_version: 1,
        evidence_receipt_ids: [],
        reason: "A complete design packet is available.",
        actor_id: "523e4567-e89b-42d3-a456-426614174000",
        tenant_id: null,
        organization_id: null,
        business_id: null,
        correlation_id: "623e4567-e89b-42d3-a456-426614174000",
        idempotency_key: "phase203-transition-mismatch",
        release_version: "phase-203",
        requested_at: "2026-08-03T05:00:00.000Z"
      }
    });
    expect(transitionResponse.statusCode).toBe(400);
    expect(mocks.transition).not.toHaveBeenCalled();
    await app.close();
  });
});

describe("Phase 203 integration-list publication boundary", () => {
  const sellableOpenAiClaim = {
    claim_id: "723e4567-e89b-42d3-a456-426614174000",
    claim_key: "integration.openai.list",
    capability_id: "823e4567-e89b-42d3-a456-426614174000",
    capability_key: "integration.tool.openai",
    capability_version: "1.0.0",
    display_name: "Approved OpenAI integration",
    lifecycle_state: "SELLABLE",
    pricing_eligibility: "INCLUDED",
    approved_language: "Approved receipt-bound AI provider connection.",
    limitations: ["Provider credentials and authorization remain required."],
    evidence_receipt_ids: ["923e4567-e89b-42d3-a456-426614174000"],
    claim_record_version: 2,
    capability_record_version: 9
  } as const;

  it("returns only SELLABLE integrations with exact claim language and evidence binding", async () => {
    mocks.getPublicProjection.mockResolvedValue({
      ...projection,
      surface: "INTEGRATION_LIST",
      claims: [sellableOpenAiClaim]
    });
    const app = await connectionTestServer();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/connections/tools",
      headers: { "x-test-session": "internal" }
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toContain("no-store");
    const payload = response.json();
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({
      id: "openai",
      name: sellableOpenAiClaim.display_name,
      description: sellableOpenAiClaim.approved_language,
      productTruth: {
        capabilityId: sellableOpenAiClaim.capability_id,
        claimId: sellableOpenAiClaim.claim_id,
        evidenceReceiptIds: sellableOpenAiClaim.evidence_receipt_ids
      }
    });
    expect(JSON.stringify(payload.items)).not.toMatch(/Mock Mode|Coming Soon|placeholder/iu);
    expect(payload.product_truth.claims).toEqual([sellableOpenAiClaim]);
    await app.close();
  });

  it("keeps the global internal integration list out of tenant member sessions", async () => {
    const app = await connectionTestServer();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/connections/tools",
      headers: { "x-test-session": "member" }
    });
    expect(response.statusCode).toBe(403);
    expect(mocks.getPublicProjection).not.toHaveBeenCalled();
    await app.close();
  });

  it("blocks direct provider tests when the integration has no SELLABLE claim", async () => {
    mocks.getPublicProjection.mockResolvedValue({
      ...projection,
      surface: "INTEGRATION_LIST",
      claims: []
    });
    const app = await connectionTestServer();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/connections/tools/codex/test",
      headers: { "x-test-session": "internal" }
    });
    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it("returns no legacy registry data when Product Truth is unavailable", async () => {
    const { CapabilityTruthServiceError } = await import("../src/services/capabilityTruth.js");
    mocks.getPublicProjection.mockRejectedValue(new CapabilityTruthServiceError(
      "PRODUCT_TRUTH_UNAVAILABLE",
      "Database is unavailable.",
      503
    ));
    const app = await connectionTestServer();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/connections/tools",
      headers: { "x-test-session": "internal" }
    });
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toMatch(/items|OpenAI|Mock Mode/iu);
    await app.close();
  });
});
