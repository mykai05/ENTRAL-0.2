import cookie from "@fastify/cookie";
import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPortfolio: vi.fn(),
  getTutorialProgress: vi.fn(),
  recordAuditLog: vi.fn(),
  resetTutorialProgress: vi.fn(),
  resolveVerifiedMemberTeamAccess: vi.fn(),
  teamMemberFindUnique: vi.fn(),
  updateTutorialProgress: vi.fn(),
  userFindUnique: vi.fn(),
  withPersonalSession: vi.fn(),
  withTenantSession: vi.fn()
}));

vi.mock("../src/db.js", () => ({
  prisma: {
    teamMember: { findUnique: mocks.teamMemberFindUnique },
    user: { findUnique: mocks.userFindUnique }
  },
  resolveVerifiedMemberTeamAccess: mocks.resolveVerifiedMemberTeamAccess,
  withPersonalSession: mocks.withPersonalSession,
  withTenantSession: mocks.withTenantSession
}));

vi.mock("../src/services/canonicalControlPlane.js", () => ({
  canonicalControlPlaneRepository: { getPortfolio: mocks.getPortfolio }
}));

vi.mock("../src/services/audit.js", () => ({
  recordAuditLog: mocks.recordAuditLog
}));

vi.mock("../src/services/interactionLayer.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/interactionLayer.js")>();
  return {
    ...actual,
    interactionLayerService: {
      getTutorialProgress: mocks.getTutorialProgress,
      resetTutorialProgress: mocks.resetTutorialProgress,
      updateTutorialProgress: mocks.updateTutorialProgress
    }
  };
});

const organizationId = "ck1234567890123456789012";
const userId = "member-phase-200";
const businessId = "123e4567-e89b-42d3-a456-426614174000";
const tenantOrganizationId = "423e4567-e89b-42d3-a456-426614174000";
const tenantId = "523e4567-e89b-42d3-a456-426614174000";

const tutorialProgress = {
  business_model_context: null,
  commander_pack_context: null,
  completed_anchor_ids: [],
  completed_at: null,
  contract_version: "1.0.0",
  current_anchor_id: "command-overview",
  first_launch_seen: false,
  mode: "beginner",
  organization_id: organizationId,
  plan_context: null,
  release_version: "phase-200",
  revision: 1,
  role_context: "MEMBER",
  schema_version: 1,
  started_at: "2026-08-02T00:00:00.000Z",
  updated_at: "2026-08-02T00:00:00.000Z",
  user_id: userId
} as const;

const portfolio = {
  businesses: [{
    active_mission_count: 1,
    active_task_count: 2,
    agent_count: 3,
    automation_count: 1,
    business_id: businessId,
    business_name: "Canonical Business",
    capital_available: null,
    commander_id: "223e4567-e89b-42d3-a456-426614174000",
    currency: null,
    general_id: "323e4567-e89b-42d3-a456-426614174000",
    general_name: "Canonical General",
    gross_revenue: null,
    health_drivers: [{ code: "delivery", direction: "POSITIVE", explanation: "Recorded work is on track.", label: "Delivery" }],
    health_score: 91,
    health_state: "HEALTHY",
    integration_count: 0,
    marshal_id: "423e4567-e89b-42d3-a456-426614174000",
    marshal_name: "Canonical Marshal",
    net_contribution: null,
    primary_objective: "Deliver the accepted plan.",
    revenue_period_end: null,
    revenue_period_start: null,
    source_freshness: {},
    stable_code: "business.canonical",
    status: "OPERATING",
    tool_count: 1,
    top_exception: null,
    top_recommendation: null,
    updated_at: "2026-08-02T00:00:00.000Z",
    version: 7
  }],
  event_sequence: 200,
  generated_at: new Date().toISOString(),
  scope: {
    label: "Human portfolio / all visible businesses",
    mode: "HUMAN_PORTFOLIO",
    user_id: businessId,
    visible_business_ids: [businessId]
  },
  totals: {
    active_commanders: 1,
    active_soldiers: 0,
    businesses: 1,
    financials: [],
    health_distribution: { CRITICAL: 0, DEGRADED: 0, HEALTHY: 1, UNKNOWN: 0, WATCH: 0 },
    unresolved_exceptions: 0
  }
} as const;

async function testServer() {
  const [{ interactionLayerRoutes }, { signAuthToken }] = await Promise.all([
    import("../src/routes/interactionLayer.js"),
    import("../src/auth.js")
  ]);
  const app = Fastify();
  await app.register(cookie);
  await app.register(interactionLayerRoutes, { prefix: "/api/v1" });
  return {
    app,
    authorization: `Bearer ${signAuthToken({
      email: "member@example.test",
      role: "USER",
      session: "member",
      sub: userId,
      organizationId: tenantOrganizationId,
      tenantId
    })}`
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./phase200-interaction.db";
  process.env.JWT_SECRET = "phase200-test-secret-that-is-long-enough";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.APP_PUBLIC_URL = "http://localhost:3000";
  mocks.userFindUnique.mockResolvedValue({ sessionVersion: 0 });
  mocks.withPersonalSession.mockImplementation(async (database, context, operation) => operation(database, {
    actorId: "623e4567-e89b-42d3-a456-426614174000",
    appUserId: "723e4567-e89b-42d3-a456-426614174000",
    authSubject: context.authSubject
  }));
  mocks.withTenantSession.mockImplementation(async (database, context, operation) => operation(database, {
    actorId: "623e4567-e89b-42d3-a456-426614174000",
    appUserId: "723e4567-e89b-42d3-a456-426614174000",
    authSubject: context.authSubject,
    organizationId: tenantOrganizationId,
    role: "MEMBER",
    tenantId: context.tenantId
  }));
  mocks.teamMemberFindUnique.mockResolvedValue({
    role: "MEMBER",
    team: { memberAccessEnabled: true }
  });
  mocks.resolveVerifiedMemberTeamAccess.mockResolvedValue({ role: "MEMBER" });
  mocks.getPortfolio.mockResolvedValue(portfolio);
  mocks.getTutorialProgress.mockResolvedValue(tutorialProgress);
  mocks.updateTutorialProgress.mockResolvedValue({ ...tutorialProgress, revision: 2 });
  mocks.resetTutorialProgress.mockResolvedValue({ ...tutorialProgress, revision: 2 });
  mocks.recordAuditLog.mockResolvedValue({ id: "audit-1" });
});

describe("Phase 200 interaction routes", () => {
  it("binds business health to the RLS-visible canonical portfolio and truth context", async () => {
    const { app, authorization } = await testServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${organizationId}/interaction/business-health?businessId=${businessId}&mode=OPERATIONAL`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      health: { score: 91, state: "HEALTHY", value_status: "RECORDED" },
      identity: { name: "ENTRAL", provider_independent: true, release_version: "phase-200" },
      mode: "OPERATIONAL",
      truth: {
        assumptions: [],
        business_id: businessId,
        confidence: "RECORDED",
        organization_id: organizationId
      }
    });
    expect(mocks.getPortfolio).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it("labels stale health evidence and withholds a current-confidence conclusion", async () => {
    mocks.getPortfolio.mockResolvedValue({
      ...portfolio,
      generated_at: "2026-01-01T00:00:00.000Z"
    });
    const { app, authorization } = await testServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${organizationId}/interaction/business-health?businessId=${businessId}`
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      evidence: [{ freshness: "STALE" }],
      truth: {
        assumptions: ["Current health is not inferred from stale or unknown evidence."],
        confidence: "UNAVAILABLE",
        evidence_freshness: { state: "STALE" }
      }
    });
    expect(response.json().health.summary).toContain("Current health is not asserted");
    await app.close();
  });

  it("does not reveal a disabled or unavailable organization", async () => {
    mocks.resolveVerifiedMemberTeamAccess.mockResolvedValue(null);
    const { app, authorization } = await testServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${organizationId}/interaction/tutorial-progress`
    });
    expect(response.statusCode).toBe(404);
    expect(mocks.getTutorialProgress).not.toHaveBeenCalled();
    await app.close();
  });

  it("resumes and updates server-backed Tutorial progress with a revision", async () => {
    const { app, authorization } = await testServer();
    const getResponse = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${organizationId}/interaction/tutorial-progress`
    });
    expect(getResponse.json()).toMatchObject({ revision: 1, user_id: userId });

    const patchResponse = await app.inject({
      headers: { authorization },
      method: "PATCH",
      payload: {
        contract_version: "1.0.0",
        completed_anchor_ids: ["command-overview"],
        current_anchor_id: "businesses-overview",
        expected_revision: 1,
        first_launch_seen: true,
        idempotency_key: "phase200:tutorial:update:route-test",
        mode: "beginner",
        schema_version: 1
      },
      url: `/api/v1/member/organizations/${organizationId}/interaction/tutorial-progress`
    });
    expect(patchResponse.statusCode).toBe(200);
    expect(mocks.updateTutorialProgress).toHaveBeenCalledWith(expect.objectContaining({
      organizationId,
      role: "MEMBER",
      userId
    }));
    expect(mocks.updateTutorialProgress).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ idempotency_key: "phase200:tutorial:update:route-test" })
    }));
    await app.close();
  });

  it("rejects a malformed Tutorial mutation before calling persistence", async () => {
    const { app, authorization } = await testServer();
    const response = await app.inject({
      headers: { authorization },
      method: "PATCH",
      payload: {
        completed_anchor_ids: [],
        current_anchor_id: null,
        expected_revision: 1,
        first_launch_seen: false,
        mode: "beginner"
      },
      url: `/api/v1/member/organizations/${organizationId}/interaction/tutorial-progress`
    });
    expect(response.statusCode).toBe(400);
    expect(mocks.updateTutorialProgress).not.toHaveBeenCalled();
    await app.close();
  });

  it("records only the bounded analytics envelope and rejects arbitrary content", async () => {
    const { app, authorization } = await testServer();
    const validEvent = {
      contract_version: "1.0.0",
      control_id: "academy-close",
      event_id: "523e4567-e89b-42d3-a456-426614174000",
      event_type: "TUTORIAL_ABANDONED",
      occurred_at: "2026-08-02T00:00:00.000Z",
      reason_code: "USER_CLOSED",
      route: "/member/tutorial",
      schema_version: 1
    };
    const accepted = await app.inject({
      headers: { authorization },
      method: "POST",
      payload: validEvent,
      url: `/api/v1/member/organizations/${organizationId}/interaction/analytics`
    });
    expect(accepted.statusCode).toBe(202);
    expect(mocks.recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: userId,
      targetId: validEvent.event_id,
      targetType: "INTERACTION_ANALYTICS"
    }), expect.anything());
    expect(mocks.withTenantSession).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      authSubject: userId,
      tenantId
    }), expect.any(Function));

    const rejected = await app.inject({
      headers: { authorization },
      method: "POST",
      payload: { ...validEvent, customerContent: "sensitive" },
      url: `/api/v1/member/organizations/${organizationId}/interaction/analytics`
    });
    expect(rejected.statusCode).toBe(400);
    await app.close();
  });
});
