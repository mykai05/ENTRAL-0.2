import cookie from "@fastify/cookie";
import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createGovernanceAction: vi.fn(),
  executeEntityLifecycle: vi.fn(),
  getBusiness: vi.fn(),
  getBusinessFull: vi.fn(),
  getEntityFull: vi.fn(),
  getHierarchySnapshot: vi.fn(),
  getPortfolio: vi.fn(),
  listPortfolioEvents: vi.fn(),
  listBusinesses: vi.fn(),
  listHierarchy: vi.fn(),
  authSessionFindUnique: vi.fn(),
  authSessionUpdate: vi.fn(),
  mfaFactorCount: vi.fn(),
  personalUserFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
  withPersonalSession: vi.fn()
}));

vi.mock("../src/services/canonicalEntityLifecycle.js", () => ({
  canonicalEntityLifecycleService: {
    execute: mocks.executeEntityLifecycle
  }
}));

vi.mock("../src/db.js", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique
    }
  },
  withPersonalSession: mocks.withPersonalSession
}));

vi.mock("../src/services/canonicalControlPlane.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/services/canonicalControlPlane.js")>();
  return {
    ...original,
    canonicalControlPlaneRepository: {
      createGovernanceAction: mocks.createGovernanceAction,
      getBusiness: mocks.getBusiness,
      getBusinessFull: mocks.getBusinessFull,
      getEntityFull: mocks.getEntityFull,
      getHierarchySnapshot: mocks.getHierarchySnapshot,
      getPortfolio: mocks.getPortfolio,
      listPortfolioEvents: mocks.listPortfolioEvents,
      listBusinesses: mocks.listBusinesses,
      listHierarchy: mocks.listHierarchy
    }
  };
});

const actionId = "123e4567-e89b-42d3-a456-426614174000";
const actorId = "223e4567-e89b-42d3-a456-426614174000";
const targetId = "323e4567-e89b-42d3-a456-426614174000";
const adminActorId = "423e4567-e89b-42d3-a456-426614174000";
const adminAppUserId = "523e4567-e89b-42d3-a456-426614174000";
const adminSessionId = "623e4567-e89b-42d3-a456-426614174000";
const adminAccessTokenId = "723e4567-e89b-42d3-a456-426614174000";

function requestBody() {
  return {
    action_id: actionId,
    action_type: "PAUSE",
    actor_type: "HUMAN",
    actor_id: actorId,
    authority_basis: { permission: "pause" },
    business_id: null,
    expected_version: 1,
    idempotency_key: "pause-entity-123456",
    proposed_changes: { status: "PAUSED" },
    reason: "A verified dependency is unavailable.",
    requested_at: "2026-07-24T00:00:00Z",
    requested_outcome: "Pause the entity.",
    risk_class: "MEDIUM",
    rollback_plan: { action: "RESUME" },
    scope: {
      display_label: "Target entity",
      entity_id: targetId,
      scope_id: targetId,
      scope_type: "ENTITY"
    },
    target_id: targetId,
    target_type: "ENTITY",
    verification_plan: { checks: ["read-after-write"] }
  } as const;
}

function lifecycleRequestBody() {
  return {
    ...requestBody(),
    authority_basis: {
      channel: "CONTROL_PLANE",
      explicit_confirmation_required: true,
      target_version: 1
    },
    proposed_changes: {
      containment_policy: "FINISH_IN_FLIGHT",
      status: "PAUSED"
    },
    rollback_plan: {
      action: "RESUME",
      previous_status: "ACTIVE"
    }
  } as const;
}

async function buildControlPlaneTestServer() {
  const [{ controlPlaneRoutes }, { signAuthToken }] = await Promise.all([
    import("../src/routes/controlPlane.js"),
    import("../src/auth.js")
  ]);
  const app = Fastify();
  await app.register(cookie);
  await app.register(controlPlaneRoutes, { prefix: "/api/v1" });
  const authorization = `Bearer ${signAuthToken({
    email: "authority@example.test",
    role: "ADMIN",
    session: "internal",
    sub: "internal-user",
    actorId: adminActorId,
    sessionId: adminSessionId,
    tokenId: adminAccessTokenId
  })}`;
  return { app, authorization };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "postgresql://unused:unused@localhost:5432/unused";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.APP_PUBLIC_URL = "http://localhost:3000";
  mocks.userFindUnique.mockResolvedValue({ deletedAt: null, role: "ADMIN", sessionVersion: 0 });
  mocks.personalUserFindUnique.mockResolvedValue({ deletedAt: null, role: "ADMIN", sessionVersion: 0 });
  mocks.authSessionFindUnique.mockResolvedValue({
    accessTokenId: adminAccessTokenId,
    actorId: adminActorId,
    expiresAt: new Date(Date.now() + 60_000),
    id: adminSessionId,
    organizationId: null,
    revokedAt: null,
    sessionType: "INTERNAL",
    stepUpAt: new Date(),
    tenantId: null,
    userId: "internal-user"
  });
  mocks.authSessionUpdate.mockResolvedValue({ id: adminSessionId });
  mocks.mfaFactorCount.mockResolvedValue(1);
  mocks.withPersonalSession.mockImplementation(async (_database, _context, operation) => operation({
    authSession: {
      findUnique: mocks.authSessionFindUnique,
      update: mocks.authSessionUpdate
    },
    mfaFactor: {
      count: mocks.mfaFactorCount
    },
    user: {
      findUnique: mocks.personalUserFindUnique
    }
  }, {
    actorId: adminActorId,
    appUserId: adminAppUserId,
    authSubject: "internal-user"
  }));
});

describe("canonical control-plane routes", () => {
  it("requires internal admin authentication for canonical hierarchy reads", async () => {
    const { app } = await buildControlPlaneTestServer();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/control-plane/hierarchy"
    });

    expect(response.statusCode).toBe(401);
    expect(mocks.getHierarchySnapshot).not.toHaveBeenCalled();
    await app.close();
  });

  it("returns database-backed hierarchy records with private cache headers", async () => {
    mocks.getHierarchySnapshot.mockResolvedValueOnce({
      entities: [{ entity_id: targetId, entity_type: "ENTRAL", name: "ENTRAL" }],
      event_sequence: 7,
      generated_at: "2026-07-25T00:00:00.000Z",
      scope: { label: "Human portfolio", mode: "HUMAN_PORTFOLIO", user_id: actorId, visible_business_ids: [] }
    });
    const { app, authorization } = await buildControlPlaneTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: "/api/v1/control-plane/hierarchy"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.json().event_sequence).toBe(7);
    expect(response.json().entities).toEqual([{ entity_id: targetId, entity_type: "ENTRAL", name: "ENTRAL" }]);
    expect(mocks.getHierarchySnapshot).toHaveBeenCalledWith({
      actionReason: "Read the canonical entity hierarchy.",
      authSubject: "internal-user",
      correlationId: expect.any(String)
    });
    await app.close();
  });

  it("serves lightweight portfolio, on-demand detail, and event invalidation routes", async () => {
    mocks.getPortfolio.mockResolvedValueOnce({
      businesses: [],
      event_sequence: 7,
      generated_at: "2026-07-25T00:00:00.000Z",
      scope: {
        label: "Human portfolio / all canonical businesses",
        mode: "HUMAN_PORTFOLIO",
        user_id: actorId,
        visible_business_ids: []
      },
      totals: {
        active_commanders: 0,
        active_soldiers: 0,
        businesses: 0,
        financials: [],
        health_distribution: { CRITICAL: 0, DEGRADED: 0, HEALTHY: 0, UNKNOWN: 0, WATCH: 0 },
        unresolved_exceptions: 0
      }
    });
    mocks.getBusinessFull.mockResolvedValueOnce({
      business: {
        aggregate_version: 3,
        summary: { business_id: targetId, version: 3 }
      },
      event_sequence: 7
    });
    mocks.listPortfolioEvents.mockResolvedValueOnce({
      events: [{ aggregate_id: targetId, business_id: targetId, sequence_number: 8 }],
      next_sequence: 8
    });
    const { app, authorization } = await buildControlPlaneTestServer();

    const portfolio = await app.inject({
      headers: { authorization },
      method: "GET",
      url: "/api/v1/control-plane/portfolio/summary"
    });
    const detail = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/control-plane/businesses/${targetId}/full`
    });
    const events = await app.inject({
      headers: { authorization },
      method: "GET",
      url: "/api/v1/control-plane/events?afterSequence=7"
    });

    expect(portfolio.statusCode).toBe(200);
    expect(portfolio.headers["cache-control"]).toBe("private, no-store");
    expect(portfolio.json().scope.mode).toBe("HUMAN_PORTFOLIO");
    expect(detail.statusCode).toBe(200);
    expect(detail.json().business.aggregate_version).toBe(3);
    expect(detail.json().event_sequence).toBe(7);
    expect(events.statusCode).toBe(200);
    expect(events.json().next_sequence).toBe(8);
    expect(mocks.getBusinessFull).toHaveBeenCalledWith(
      targetId,
      expect.objectContaining({ authSubject: "internal-user" })
    );
    expect(mocks.listPortfolioEvents).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ actionReason: "Read canonical portfolio synchronization events." })
    );
    await app.close();
  });

  it("serves a versioned canonical entity full record", async () => {
    mocks.getEntityFull.mockResolvedValueOnce({
      entity: { aggregate_version: 4, summary: { entity_id: targetId, version: 4 } },
      event_sequence: 12
    });
    const { app, authorization } = await buildControlPlaneTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/control-plane/entities/${targetId}/full`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().event_sequence).toBe(12);
    expect(mocks.getEntityFull).toHaveBeenCalledWith(
      targetId,
      expect.objectContaining({ authSubject: "internal-user" })
    );
    await app.close();
  });

  it("returns the same not-found envelope for missing or out-of-scope full businesses", async () => {
    mocks.getBusinessFull.mockResolvedValueOnce(null);
    const { app, authorization } = await buildControlPlaneTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/control-plane/businesses/${targetId}/full`
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Not Found", message: "Business not found." });
    await app.close();
  });

  it("creates a Human governance proposal without trusting an ENTRAL body actor", async () => {
    mocks.createGovernanceAction.mockResolvedValueOnce({
      action_id: actionId,
      action_type: "PAUSE",
      business_id: null,
      expected_version: 1,
      idempotency_key: "pause-entity-123456",
      requested_at: "2026-07-24T00:00:00.000Z",
      status: "PROPOSED",
      target_id: targetId,
      target_type: "ENTITY",
      version: 1
    });
    const { app, authorization } = await buildControlPlaneTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "POST",
      payload: requestBody(),
      url: "/api/v1/control-plane/governance-actions"
    });

    expect(response.statusCode).toBe(201);
    expect(mocks.createGovernanceAction).toHaveBeenCalledWith(
      expect.objectContaining({ actor_type: "HUMAN", target_id: targetId }),
      {
        authenticatedHumanEmail: "authority@example.test",
        databaseSession: {
          actionReason: "A verified dependency is unavailable.",
          authSubject: "internal-user",
          correlationId: expect.any(String)
        }
      }
    );

    const entralActorResponse = await app.inject({
      headers: { authorization },
      method: "POST",
      payload: { ...requestBody(), actor_type: "ENTRAL" },
      url: "/api/v1/control-plane/governance-actions"
    });
    expect(entralActorResponse.statusCode).toBe(403);
    expect(mocks.createGovernanceAction).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it("routes a typed pause to the transactional lifecycle executor and binds the path operation", async () => {
    mocks.executeEntityLifecycle.mockResolvedValueOnce({
      action_id: actionId,
      action_type: "PAUSE",
      status: "SUCCEEDED"
    });
    const { app, authorization } = await buildControlPlaneTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "POST",
      payload: lifecycleRequestBody(),
      url: `/api/v1/control-plane/entities/${targetId}/actions/pause`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      action: { action_id: actionId, action_type: "PAUSE", status: "SUCCEEDED" }
    });
    expect(mocks.executeEntityLifecycle).toHaveBeenCalledWith(
      lifecycleRequestBody(),
      {
        authenticatedHumanEmail: "authority@example.test",
        databaseSession: {
          actionReason: "A verified dependency is unavailable.",
          authSubject: "internal-user",
          correlationId: expect.any(String)
        }
      }
    );

    const mismatch = await app.inject({
      headers: { authorization },
      method: "POST",
      payload: lifecycleRequestBody(),
      url: `/api/v1/control-plane/entities/${targetId}/actions/resume`
    });
    expect(mismatch.statusCode).toBe(403);
    expect(mocks.executeEntityLifecycle).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it("rejects action-target combinations outside the canonical policy matrix", async () => {
    const { app, authorization } = await buildControlPlaneTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "POST",
      payload: { ...requestBody(), action_type: "SCHEDULE_CHANGE" },
      url: "/api/v1/control-plane/governance-actions"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "ACTION_TARGET_MISMATCH" });
    expect(mocks.createGovernanceAction).not.toHaveBeenCalled();
    await app.close();
  });
});
