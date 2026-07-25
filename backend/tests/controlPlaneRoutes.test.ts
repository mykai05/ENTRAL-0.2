import cookie from "@fastify/cookie";
import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createGovernanceAction: vi.fn(),
  getBusiness: vi.fn(),
  listBusinesses: vi.fn(),
  listHierarchy: vi.fn(),
  userFindUnique: vi.fn()
}));

vi.mock("../src/db.js", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique
    }
  }
}));

vi.mock("../src/services/canonicalControlPlane.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/services/canonicalControlPlane.js")>();
  return {
    ...original,
    canonicalControlPlaneRepository: {
      createGovernanceAction: mocks.createGovernanceAction,
      getBusiness: mocks.getBusiness,
      listBusinesses: mocks.listBusinesses,
      listHierarchy: mocks.listHierarchy
    }
  };
});

const actionId = "123e4567-e89b-42d3-a456-426614174000";
const actorId = "223e4567-e89b-42d3-a456-426614174000";
const targetId = "323e4567-e89b-42d3-a456-426614174000";

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
    sub: "internal-user"
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
  mocks.userFindUnique.mockResolvedValue({ role: "ADMIN" });
});

describe("canonical control-plane routes", () => {
  it("requires internal admin authentication for canonical hierarchy reads", async () => {
    const { app } = await buildControlPlaneTestServer();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/control-plane/hierarchy"
    });

    expect(response.statusCode).toBe(401);
    expect(mocks.listHierarchy).not.toHaveBeenCalled();
    await app.close();
  });

  it("returns database-backed hierarchy records with private cache headers", async () => {
    mocks.listHierarchy.mockResolvedValueOnce([
      { entity_id: targetId, entity_type: "ENTRAL", name: "ENTRAL" }
    ]);
    const { app, authorization } = await buildControlPlaneTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: "/api/v1/control-plane/hierarchy"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.json()).toEqual({
      entities: [{ entity_id: targetId, entity_type: "ENTRAL", name: "ENTRAL" }]
    });
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
      { authenticatedHumanEmail: "authority@example.test" }
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
