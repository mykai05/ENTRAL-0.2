import cookie from "@fastify/cookie";
import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getHierarchySnapshot: vi.fn(),
  teamMemberFindUnique: vi.fn(),
  userFindUnique: vi.fn()
}));

vi.mock("../src/db.js", () => ({
  prisma: {
    teamMember: {
      findUnique: mocks.teamMemberFindUnique
    },
    user: {
      findUnique: mocks.userFindUnique
    }
  }
}));

vi.mock("../src/services/canonicalControlPlane.js", () => ({
  canonicalControlPlaneRepository: {
    getHierarchySnapshot: mocks.getHierarchySnapshot
  }
}));

vi.mock("../src/services/graphPreferences.js", () => ({
  GraphPreferencesError: class GraphPreferencesError extends Error {},
  graphPreferencesService: {
    get: vi.fn(),
    reset: vi.fn(),
    update: vi.fn()
  }
}));

const organizationId = "ck1234567890123456789012";
const telemetry = {
  contract_version: "1.0.0",
  dropped_frame_rate_ratio: 0.02,
  edge_count: 131,
  error_code: "NONE",
  frame_rate_fps: 59.5,
  layout_pattern: "AUTHORITY_RADIAL",
  layout_time_ms: 16.25,
  node_count: 132,
  observed_at: "2026-07-26T02:00:00.000Z",
  projection_id: "123e4567-e89b-42d3-a456-426614174000",
  projection_version: 195,
  render_time_ms: 8.5,
  renderer: "2D",
  sample_window_ms: 5000,
  schema_version: 1,
  settings_version: 3,
  telemetry_id: "223e4567-e89b-42d3-a456-426614174000"
} as const;

async function buildTelemetryServer() {
  const [{ graphPreferenceRoutes }, { signAuthToken }] = await Promise.all([
    import("../src/routes/graphPreferences.js"),
    import("../src/auth.js")
  ]);
  const app = Fastify();
  await app.register(cookie);
  await app.register(graphPreferenceRoutes, { prefix: "/api/v1" });
  return {
    app,
    authorization: `Bearer ${signAuthToken({
      email: "member@example.test",
      role: "USER",
      session: "member",
      sub: "member_phase195"
    })}`
  };
}

const rootEntityId = "123e4567-e89b-42d3-a456-426614174000";

function canonicalRootHierarchy() {
  return {
    entities: [{
      active_alert: null,
      active_task_count: 0,
      assigned_business_id: null,
      child_count: 0,
      compute_tier: "standard",
      current_mission: null,
      entity_id: rootEntityId,
      entity_type: "ENTRAL",
      health: "HEALTHY",
      latest_material_result: null,
      model_class: "canonical",
      name: "Sensitive customer display name",
      parent_id: null,
      stable_code: "ENTRAL.CORE",
      status: "ACTIVE",
      updated_at: "2026-07-26T01:00:00.000Z",
      version: 3
    }],
    event_sequence: 195,
    generated_at: "2026-07-26T02:00:00.000Z",
    scope: {
      label: "Human portfolio / all canonical businesses",
      mode: "HUMAN_PORTFOLIO",
      user_id: rootEntityId,
      visible_business_ids: []
    }
  } as const;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./phase195-telemetry.db";
  process.env.JWT_SECRET = "phase195-test-secret-that-is-long-enough";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.APP_PUBLIC_URL = "http://localhost:3000";
  mocks.userFindUnique.mockResolvedValue({ sessionVersion: 0 });
});

describe("Phase 195 graph renderer telemetry route", () => {
  it("requires authentication before organization lookup", async () => {
    const { app } = await buildTelemetryServer();
    const response = await app.inject({
      method: "POST",
      payload: telemetry,
      url: `/api/v1/member/organizations/${organizationId}/graph/telemetry`
    });

    expect(response.statusCode).toBe(401);
    expect(mocks.teamMemberFindUnique).not.toHaveBeenCalled();
    await app.close();
  });

  it("does not reveal an unavailable or disabled organization", async () => {
    mocks.teamMemberFindUnique.mockResolvedValue(null);
    const { app, authorization } = await buildTelemetryServer();
    const response = await app.inject({
      headers: { authorization },
      method: "POST",
      payload: telemetry,
      url: `/api/v1/member/organizations/${organizationId}/graph/telemetry`
    });

    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it("accepts only bounded measurements in an enabled member organization", async () => {
    mocks.teamMemberFindUnique.mockResolvedValue({
      team: { memberAccessEnabled: true }
    });
    const { app, authorization } = await buildTelemetryServer();
    const response = await app.inject({
      headers: { authorization },
      method: "POST",
      payload: telemetry,
      url: `/api/v1/member/organizations/${organizationId}/graph/telemetry`
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      accepted: true,
      contract_version: "1.0.0",
      organization_id: organizationId,
      schema_version: 1,
      telemetry_id: telemetry.telemetry_id
    });
    expect(response.headers["cache-control"]).toBe("private, no-store");
    await app.close();
  });

  it.each([
    {
      ...telemetry,
      customer_payload: { search: "sensitive customer query" }
    },
    {
      ...telemetry,
      layout_pattern: "AUTHORITY_RINGS"
    },
    {
      ...telemetry,
      dropped_frame_rate_ratio: 1.01
    }
  ])("rejects unknown, renderer-incompatible, or out-of-range input", async (payload) => {
    mocks.teamMemberFindUnique.mockResolvedValue({
      team: { memberAccessEnabled: true }
    });
    const { app, authorization } = await buildTelemetryServer();
    const response = await app.inject({
      headers: { authorization },
      method: "POST",
      payload,
      url: `/api/v1/member/organizations/${organizationId}/graph/telemetry`
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });
});

describe("Phase 195 graph projection observability", () => {
  it("records bounded aggregate generation timing without graph payloads", async () => {
    mocks.teamMemberFindUnique.mockResolvedValue({
      team: { memberAccessEnabled: true }
    });
    mocks.getHierarchySnapshot.mockResolvedValue(canonicalRootHierarchy());
    const { app, authorization } = await buildTelemetryServer();
    const projectionLog = vi.spyOn(app.log, "info");
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${organizationId}/graph/projection`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      organization_id: organizationId,
      projection_version: 195,
      root_id: rootEntityId
    });
    expect(projectionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        edgeCount: 0,
        event: "graph.projection.generated",
        nodeCount: 1,
        organizationId,
        projectionId: rootEntityId,
        projectionTimeMs: expect.any(Number),
        projectionVersion: 195,
        requestId: expect.any(String),
        retrievalTimeMs: expect.any(Number),
        totalTimeMs: expect.any(Number)
      }),
      "Canonical graph projection generated"
    );
    const logged = JSON.stringify(projectionLog.mock.calls);
    expect(logged).not.toContain("Sensitive customer display name");
    expect(logged).not.toContain("ENTRAL.CORE");
    expect(logged).not.toContain("entities");
    await app.close();
  });

  it("records a sanitized bounded failure without serializing the rejected hierarchy", async () => {
    mocks.teamMemberFindUnique.mockResolvedValue({
      team: { memberAccessEnabled: true }
    });
    mocks.getHierarchySnapshot.mockResolvedValue({
      ...canonicalRootHierarchy(),
      entities: []
    });
    const { app, authorization } = await buildTelemetryServer();
    const projectionErrorLog = vi.spyOn(app.log, "error");
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${organizationId}/graph/projection`
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({
      error: "Internal Server Error",
      message: "The canonical graph projection is temporarily unavailable.",
      requestId: expect.any(String)
    });
    expect(response.body).not.toContain("Sensitive customer display name");
    expect(response.body).not.toContain("INVALID_GRAPH_ROOT");
    expect(projectionErrorLog).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "INVALID_GRAPH_ROOT",
        event: "graph.projection.failed",
        organizationId,
        projectionTimeMs: expect.any(Number),
        requestId: expect.any(String),
        retrievalTimeMs: expect.any(Number),
        totalTimeMs: expect.any(Number)
      }),
      "Canonical graph projection generation failed"
    );
    const boundedFailure = projectionErrorLog.mock.calls.find(
      ([record, message]) => (
        message === "Canonical graph projection generation failed"
        && typeof record === "object"
        && record !== null
      )
    );
    expect(JSON.stringify(boundedFailure)).not.toContain("Sensitive customer display name");
    expect(JSON.stringify(boundedFailure)).not.toContain("entities");
    await app.close();
  });
});
