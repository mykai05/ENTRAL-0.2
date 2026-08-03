import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminReadback: vi.fn(),
  getMemberProjection: vi.fn(),
  getPublicProjection: vi.fn(),
  hasVerifiedMemberTeamAccess: vi.fn(),
  recordEvidence: vi.fn(),
  transition: vi.fn()
}));

vi.mock("../src/auth.js", () => ({
  requireAuth: async (request: { headers: Record<string, unknown>; user?: unknown }, reply: { code: (status: number) => { send: (body: unknown) => unknown } }) => {
    if (request.headers["x-test-session"] !== "member") {
      return reply.code(401).send({ error: "Unauthorized" });
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
    transition_audit: []
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
        expected_record_version: 1,
        evidence_receipt_ids: [],
        reason: "A complete design packet is available.",
        actor_id: "523e4567-e89b-42d3-a456-426614174000",
        correlation_id: "623e4567-e89b-42d3-a456-426614174000",
        idempotency_key: "phase203-transition-mismatch",
        requested_at: "2026-08-03T05:00:00.000Z"
      }
    });
    expect(transitionResponse.statusCode).toBe(400);
    expect(mocks.transition).not.toHaveBeenCalled();
    await app.close();
  });
});
