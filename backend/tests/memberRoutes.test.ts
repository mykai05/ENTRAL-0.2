import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertAiUsageAllowed: vi.fn(),
  conversationCreate: vi.fn(),
  conversationFindFirst: vi.fn(),
  conversationUpdate: vi.fn(),
  createAiAuditEntry: vi.fn(),
  createGovernanceAction: vi.fn(),
  createProviderBackedAiDecision: vi.fn(),
  getBusinessFull: vi.fn(),
  getEntralConversation: vi.fn(),
  getEntityFull: vi.fn(),
  getHierarchySnapshot: vi.fn(),
  getPortfolio: vi.fn(),
  getAiUsageSummary: vi.fn(),
  listPortfolioEvents: vi.fn(),
  memberWorkspaceFindUnique: vi.fn(),
  messageCreate: vi.fn(),
  messageDelete: vi.fn(),
  messageFindMany: vi.fn(),
  openAiCreateReply: vi.fn(),
  recordAiUsageEvent: vi.fn(),
  recordAuditLog: vi.fn(),
  taskCount: vi.fn(),
  taskFindMany: vi.fn(),
  teamMemberFindMany: vi.fn(),
  teamMemberFindUnique: vi.fn(),
  userFindUnique: vi.fn()
}));

vi.mock("../src/services/canonicalControlPlane.js", () => ({
  canonicalControlPlaneRepository: {
    createGovernanceAction: mocks.createGovernanceAction,
    getBusinessFull: mocks.getBusinessFull,
    getEntralConversation: mocks.getEntralConversation,
    getEntityFull: mocks.getEntityFull,
    getHierarchySnapshot: mocks.getHierarchySnapshot,
    getPortfolio: mocks.getPortfolio,
    listPortfolioEvents: mocks.listPortfolioEvents
  }
}));

vi.mock("../src/db.js", () => ({
  prisma: {
    conversation: {
      create: mocks.conversationCreate,
      findFirst: mocks.conversationFindFirst,
      update: mocks.conversationUpdate
    },
    message: {
      create: mocks.messageCreate,
      delete: mocks.messageDelete,
      findMany: mocks.messageFindMany
    },
    memberWorkspaceSnapshot: {
      findUnique: mocks.memberWorkspaceFindUnique
    },
    task: {
      count: mocks.taskCount,
      findMany: mocks.taskFindMany
    },
    teamMember: {
      findMany: mocks.teamMemberFindMany,
      findUnique: mocks.teamMemberFindUnique
    },
    user: {
      findUnique: mocks.userFindUnique
    }
  }
}));

vi.mock("../src/services/aiBrain.js", () => ({
  createAiAuditEntry: mocks.createAiAuditEntry
}));

vi.mock("../src/services/aiUsage.js", () => ({
  AiUsageLimitError: class AiUsageLimitError extends Error {},
  assertAiUsageAllowed: mocks.assertAiUsageAllowed,
  getAiUsageSummary: mocks.getAiUsageSummary,
  recordAiUsageEvent: mocks.recordAiUsageEvent
}));

vi.mock("../src/services/audit.js", () => ({
  recordAuditLog: mocks.recordAuditLog
}));

vi.mock("../src/services/openaiService.js", () => ({
  createProviderBackedAiDecision: mocks.createProviderBackedAiDecision,
  openAiChatService: {
    createReply: mocks.openAiCreateReply
  }
}));

const organizationId = "ck1234567890123456789012";
const otherOrganizationId = "ck9876543210987654321098";
const businessId = "123e4567-e89b-42d3-a456-426614174000";
const entityId = "223e4567-e89b-42d3-a456-426614174000";
const humanId = "323e4567-e89b-42d3-a456-426614174000";

async function buildMemberTestServer() {
  const [{ memberRoutes }, { signAuthToken }] = await Promise.all([
    import("../src/routes/member.js"),
    import("../src/auth.js")
  ]);
  const app = Fastify();
  await app.register(cookie);
  await app.register(memberRoutes, { prefix: "/api/v1" });

  return {
    app,
    authorization: `Bearer ${signAuthToken({ sub: "user-1", email: "ada@example.com", role: "USER" })}`
  };
}

beforeEach(() => {
  vi.resetModules();
    vi.clearAllMocks();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.APP_PUBLIC_URL = "http://localhost:3000";
});

describe("member organization routes", () => {
  it("requires authentication before listing organizations", async () => {
    const { app } = await buildMemberTestServer();
    const response = await app.inject({ method: "GET", url: "/api/v1/member/organizations" });

    expect(response.statusCode).toBe(401);
    expect(mocks.teamMemberFindMany).not.toHaveBeenCalled();
    await app.close();
  });

  it("returns only the signed-in user's organization memberships", async () => {
    const joinedAt = new Date("2026-07-01T12:00:00.000Z");
    mocks.userFindUnique.mockResolvedValueOnce({ id: "user-1", name: "Ada Lovelace", email: "ada@example.com" });
    mocks.teamMemberFindMany.mockResolvedValueOnce([
      {
        joinedAt,
        role: "OWNER",
        team: { _count: { members: 3 }, id: organizationId, memberAccessEnabled: true, memberSeatLimit: 5, name: "Analytical Works", slug: "analytical-works" }
      }
    ]);
    const { app, authorization } = await buildMemberTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: "/api/v1/member/organizations"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers.vary).toBe("Origin, Cookie, Authorization");
    expect(mocks.teamMemberFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        team: { memberAccessEnabled: true },
        userId: "user-1"
      }
    }));
    expect(response.json()).toMatchObject({
      organizations: [{ id: organizationId, memberCount: 3, memberLimit: 5, role: "OWNER" }],
      user: { email: "ada@example.com", id: "user-1", name: "Ada Lovelace" }
    });
    await app.close();
  });

  it("fails closed to the member role when a stored role is not public", async () => {
    mocks.userFindUnique.mockResolvedValueOnce({ id: "user-1", name: "Ada Lovelace", email: "ada@example.com" });
    mocks.teamMemberFindMany.mockResolvedValueOnce([{
      joinedAt: new Date("2026-07-01T12:00:00.000Z"),
      role: "INTERNAL_SUPERUSER",
      team: { _count: { members: 1 }, id: organizationId, memberAccessEnabled: true, memberSeatLimit: 5, name: "Analytical Works", slug: "analytical-works" }
    }]);
    const { app, authorization } = await buildMemberTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: "/api/v1/member/organizations"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().organizations[0].role).toBe("MEMBER");
    expect(response.body).not.toContain("INTERNAL_SUPERUSER");
    await app.close();
  });

  it("scopes every overview query to the verified organization", async () => {
    mocks.teamMemberFindUnique.mockResolvedValueOnce({
      role: "OWNER",
      team: { _count: { members: 2 }, id: organizationId, memberAccessEnabled: true, memberSeatLimit: 5, name: "Analytical Works", slug: "analytical-works" }
    });
    mocks.taskCount
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    mocks.taskFindMany.mockResolvedValueOnce([
      {
        assignedTo: { id: "user-1", name: "Ada Lovelace" },
        dueDate: null,
        id: "task-1",
        status: "IN_PROGRESS",
        title: "Map the operating workflow",
        updatedAt: new Date("2026-07-10T00:00:00.000Z")
      }
    ]);
    mocks.teamMemberFindMany.mockResolvedValueOnce([
      { joinedAt: new Date("2026-07-01T00:00:00.000Z"), role: "OWNER", user: { id: "user-1", name: "Ada Lovelace" } }
    ]);
    mocks.memberWorkspaceFindUnique.mockResolvedValueOnce({
      publishedAt: new Date("2026-07-18T00:00:00.000Z"),
      snapshotJson: JSON.stringify({
        businessHealth: { score: 78, status: "stable", summary: "Delivery is steady." },
        commandHierarchy: { nodes: [
          { id: "entral", name: "ENTRAL", parentId: null, rank: "ENTRAL", status: "thinking" },
          { id: "operations", name: "Operations Marshal", parentId: "entral", rank: "MARSHAL", status: "working" },
          { id: "company", name: "Analytical Works General", parentId: "operations", rank: "GENERAL", status: "working" }
        ] },
        findingsAndRecommendations: [],
        monthlyOperatingSummary: null,
        objectivesAndPriorities: [{ id: "objective-1", priority: "high", progress: 60, status: "active", title: "Improve scheduling" }]
      }),
      version: 2
    });
    const { app, authorization } = await buildMemberTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${organizationId}/overview`
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.teamMemberFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_teamId: { teamId: organizationId, userId: "user-1" } }
    }));
    for (const call of mocks.taskCount.mock.calls) {
      expect(call[0].where.teamId).toBe(organizationId);
      expect(call[0].where.memberVisible).toBe(true);
    }
    expect(mocks.taskFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { memberVisible: true, teamId: organizationId }
    }));
    expect(response.json()).toMatchObject({
      availability: { subscription: { available: false, state: "not_configured" } },
      organization: { id: organizationId, memberLimit: 5, role: "OWNER" },
      taskSummary: { done: 1, inProgress: 2, overdue: 1, todo: 1, total: 4 }
    });
    expect(response.json()).toMatchObject({
      workspace: {
        businessHealth: { score: 78, status: "stable" },
        commandHierarchy: { nodes: expect.arrayContaining([
          expect.objectContaining({ id: "company", rank: "GENERAL" })
        ]) },
        objectivesAndPriorities: [{ id: "objective-1", title: "Improve scheduling" }],
        version: 2
      }
    });
    expect(response.body).not.toContain("password");
    expect(response.body).not.toContain("token");
    expect(response.body).not.toContain("agent");
    await app.close();
  });

  it("rejects cross-tenant identifiers before any organization data query", async () => {
    mocks.teamMemberFindUnique.mockResolvedValueOnce(null);
    const { app, authorization } = await buildMemberTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${otherOrganizationId}/overview`
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ message: "Organization not found or unavailable." });
    expect(mocks.taskCount).not.toHaveBeenCalled();
    expect(mocks.taskFindMany).not.toHaveBeenCalled();
    expect(mocks.teamMemberFindMany).not.toHaveBeenCalled();
    expect(mocks.memberWorkspaceFindUnique).not.toHaveBeenCalled();
    await app.close();
  });

  it("rejects a membership whose organization has not been explicitly provisioned", async () => {
    mocks.teamMemberFindUnique.mockResolvedValueOnce({
      role: "OWNER",
      team: {
        _count: { members: 1 },
        id: organizationId,
        memberAccessEnabled: false,
        memberSeatLimit: 5,
        name: "Unprovisioned Organization",
        slug: "unprovisioned"
      }
    });
    const { app, authorization } = await buildMemberTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${organizationId}/overview`
    });

    expect(response.statusCode).toBe(404);
    expect(mocks.taskCount).not.toHaveBeenCalled();
    expect(mocks.taskFindMany).not.toHaveBeenCalled();
    expect(mocks.memberWorkspaceFindUnique).not.toHaveBeenCalled();
    await app.close();
  });

  it("serves the RLS-scoped canonical portfolio and event cursor to a provisioned member", async () => {
    mocks.teamMemberFindUnique
      .mockResolvedValueOnce({ team: { memberAccessEnabled: true } })
      .mockResolvedValueOnce({ team: { memberAccessEnabled: true } });
    mocks.getPortfolio.mockResolvedValueOnce({
      businesses: [],
      event_sequence: 21,
      generated_at: "2026-07-25T00:00:00.000Z",
      scope: {
        label: "Assigned canonical businesses",
        mode: "ASSIGNED_BUSINESSES",
        user_id: businessId,
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
    mocks.listPortfolioEvents.mockResolvedValueOnce({ events: [], next_sequence: 21 });
    const { app, authorization } = await buildMemberTestServer();

    const portfolio = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${organizationId}/portfolio/summary`
    });
    const events = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${organizationId}/events?afterSequence=19`
    });

    expect(portfolio.statusCode).toBe(200);
    expect(portfolio.json().scope.mode).toBe("ASSIGNED_BUSINESSES");
    expect(events.statusCode).toBe(200);
    expect(mocks.getPortfolio).toHaveBeenCalledWith(expect.objectContaining({
      actionReason: `Read the user-inherited canonical portfolio through member access ${organizationId}.`,
      authSubject: "user-1"
    }));
    expect(mocks.listPortfolioEvents).toHaveBeenCalledWith(
      19,
      expect.objectContaining({ authSubject: "user-1" })
    );
    await app.close();
  });

  it("serves only canonical Human and ENTRAL conversation history in the requested business scope", async () => {
    mocks.teamMemberFindUnique.mockResolvedValueOnce({ team: { memberAccessEnabled: true } });
    mocks.getEntralConversation.mockResolvedValueOnce({
      event_sequence: 21,
      generated_at: "2026-07-25T00:00:00.000Z",
      messages: [{
        acknowledged_at: null,
        business_id: businessId,
        content: "Verified scope-bound transmission.",
        created_at: "2026-07-25T00:00:00.000Z",
        delivered_at: "2026-07-25T00:00:01.000Z",
        direction: "ENTRAL_TO_HUMAN",
        entral_entity_id: "223e4567-e89b-42d3-a456-426614174000",
        event_id: "323e4567-e89b-42d3-a456-426614174000",
        event_sequence: 20,
        evidence_refs: [{
          id: "423e4567-e89b-42d3-a456-426614174000",
          type: "SOURCE_RECORD"
        }],
        message_id: "523e4567-e89b-42d3-a456-426614174000",
        message_type: "RESULT",
        status: "DELIVERED"
      }]
    });
    const { app, authorization } = await buildMemberTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${organizationId}/entral/conversation?businessId=${businessId}`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().messages[0]).toMatchObject({
      business_id: businessId,
      content: "Verified scope-bound transmission.",
      direction: "ENTRAL_TO_HUMAN",
      event_sequence: 20
    });
    expect(mocks.getEntralConversation).toHaveBeenCalledWith(
      businessId,
      expect.objectContaining({
        actionReason: `Read user-visible Human and ENTRAL conversation history through member access ${organizationId}.`,
        authSubject: "user-1"
      })
    );
    await app.close();
  });

  it("re-resolves canonical graph context before answering through the member assistant", async () => {
    const createdAt = new Date("2026-07-26T08:00:00.000Z");
    const entity = {
      active_alert: null,
      active_task_count: 1,
      assigned_business_id: businessId,
      child_count: 0,
      compute_tier: "standard",
      current_mission: "Verify the member workspace",
      entity_id: entityId,
      entity_type: "SOLDIER",
      health: "HEALTHY",
      latest_material_result: null,
      model_class: "reasoning",
      name: "Interface Sentinel",
      parent_id: null,
      stable_code: "OPS.INTERFACE_SENTINEL",
      status: "ACTIVE",
      updated_at: createdAt.toISOString(),
      version: 7
    };
    mocks.teamMemberFindUnique.mockResolvedValueOnce({ team: { memberAccessEnabled: true } });
    mocks.getPortfolio.mockResolvedValueOnce({
      businesses: [{ business_id: businessId, business_name: "Interface Operations" }],
      event_sequence: 51,
      scope: { label: "Human portfolio" }
    });
    mocks.getHierarchySnapshot.mockResolvedValueOnce({
      entities: [entity],
      event_sequence: 50
    });
    mocks.assertAiUsageAllowed.mockResolvedValueOnce({ estimatedCostCents: 2 });
    mocks.conversationCreate.mockResolvedValueOnce({
      id: "ck1234567890123456789012",
      userId: "user-1"
    });
    mocks.messageCreate
      .mockResolvedValueOnce({ content: "What is selected?", createdAt, id: "ck2234567890123456789012", role: "user" })
      .mockResolvedValueOnce({ content: "Interface Sentinel is selected.", createdAt, id: "ck3234567890123456789012", role: "assistant" });
    mocks.messageFindMany.mockResolvedValueOnce([
      { content: "What is selected?", createdAt, id: "ck2234567890123456789012", role: "user" }
    ]);
    mocks.createProviderBackedAiDecision.mockResolvedValueOnce({
      errors: [],
      plan: { authorizationRequired: false, intent: "inspect_selection", riskLevel: "Low" }
    });
    mocks.openAiCreateReply.mockResolvedValueOnce({
      content: "Interface Sentinel is selected.",
      model: "test-model",
      providerName: "OpenAI",
      usedLocalFallback: false
    });
    mocks.recordAiUsageEvent.mockResolvedValueOnce({ estimatedCostCents: 2, id: "usage-1" });
    mocks.getAiUsageSummary.mockResolvedValueOnce({ used: 1 });
    mocks.createAiAuditEntry.mockReturnValueOnce({ outcome: "contextual response" });
    mocks.recordAuditLog.mockResolvedValueOnce(undefined);

    const { app, authorization } = await buildMemberTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "POST",
      payload: {
        context: {
          business_id: businessId,
          observed_event_sequence: 49,
          selected_entity_id: entityId,
          surface: "graph"
        },
        message: "What is selected?"
      },
      url: `/api/v1/member/organizations/${organizationId}/entral/assistant/messages`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      content: "Interface Sentinel is selected.",
      context: {
        business_id: businessId,
        event_sequence: 50,
        scope_label: "Interface Operations",
        selected_entity: { entity_id: entityId, name: "Interface Sentinel" },
        surface: "graph"
      }
    });
    expect(mocks.getPortfolio).toHaveBeenCalledWith(expect.objectContaining({ authSubject: "user-1" }));
    expect(mocks.getHierarchySnapshot).toHaveBeenCalledWith(expect.objectContaining({ authSubject: "user-1" }));
    expect(mocks.openAiCreateReply).toHaveBeenCalledWith(
      [expect.objectContaining({
        content: expect.stringContaining("selected_entity=Interface Sentinel")
      })],
      expect.any(Object)
    );
    expect(mocks.messageCreate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({ content: "What is selected?", role: "user" })
    }));
    await app.close();
  });

  it("rejects a graph entity hint that is outside the server-resolved member hierarchy", async () => {
    mocks.teamMemberFindUnique.mockResolvedValueOnce({ team: { memberAccessEnabled: true } });
    mocks.getPortfolio.mockResolvedValueOnce({
      businesses: [],
      event_sequence: 51,
      scope: { label: "Human portfolio" }
    });
    mocks.getHierarchySnapshot.mockResolvedValueOnce({ entities: [], event_sequence: 51 });
    const { app, authorization } = await buildMemberTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "POST",
      payload: {
        context: {
          business_id: null,
          observed_event_sequence: 51,
          selected_entity_id: entityId,
          surface: "graph"
        },
        message: "Inspect this entity."
      },
      url: `/api/v1/member/organizations/${organizationId}/entral/assistant/messages`
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Not Found", message: "Entity not found." });
    expect(mocks.assertAiUsageAllowed).not.toHaveBeenCalled();
    expect(mocks.conversationCreate).not.toHaveBeenCalled();
    await app.close();
  });

  it("submits an explicitly confirmed member change as a canonical governed request", async () => {
    const request = {
      action_id: "423e4567-e89b-42d3-a456-426614174000",
      action_type: "MODEL_CHANGE",
      actor_id: humanId,
      actor_type: "HUMAN",
      authority_basis: {
        channel: "MEMBER_ENTRAL_ASSISTANT",
        explicit_confirmation_required: true,
        target_version: 7
      },
      business_id: businessId,
      confidence: 1,
      expected_version: 7,
      idempotency_key: "member-assistant:423e4567-e89b-42d3-a456-426614174000",
      proposed_changes: { model_class: "gpt-5.6" },
      reason: "Human-confirmed model change through ENTRAL.",
      requested_at: "2026-07-26T08:00:00.000Z",
      requested_outcome: "Change the selected entity model.",
      risk_class: "MEDIUM",
      rollback_plan: { model_class: "reasoning" },
      scope: {
        business_id: businessId,
        display_label: "Interface Operations",
        entity_id: entityId,
        scope_id: businessId,
        scope_type: "BUSINESS"
      },
      target_id: entityId,
      target_type: "ENTITY",
      verification_plan: { checks: ["Canonical readback"] }
    };
    mocks.teamMemberFindUnique.mockResolvedValueOnce({ team: { memberAccessEnabled: true } });
    mocks.getEntityFull.mockResolvedValueOnce({ entity: { summary: { entity_id: entityId } } });
    mocks.createGovernanceAction.mockResolvedValueOnce({
      action_id: request.action_id,
      status: "REQUESTED"
    });
    const { app, authorization } = await buildMemberTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "POST",
      payload: request,
      url: `/api/v1/member/organizations/${organizationId}/governance-actions`
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      action: { action_id: request.action_id, status: "REQUESTED" }
    });
    expect(mocks.createGovernanceAction).toHaveBeenCalledWith(
      request,
      expect.objectContaining({
        authenticatedHumanEmail: "ada@example.com",
        databaseSession: expect.objectContaining({ authSubject: "user-1" })
      })
    );

    mocks.teamMemberFindUnique.mockResolvedValueOnce({ team: { memberAccessEnabled: true } });
    const unconfirmedResponse = await app.inject({
      headers: { authorization },
      method: "POST",
      payload: {
        ...request,
        authority_basis: {
          channel: "MEMBER_ENTRAL_ASSISTANT",
          explicit_confirmation_required: false,
          target_version: request.expected_version
        }
      },
      url: `/api/v1/member/organizations/${organizationId}/governance-actions`
    });

    expect(unconfirmedResponse.statusCode).toBe(400);
    expect(unconfirmedResponse.json()).toEqual({
      error: "Bad Request",
      message: "Member ENTRAL governance requests require explicit confirmation for the current target version."
    });
    expect(mocks.getEntityFull).toHaveBeenCalledTimes(1);
    expect(mocks.createGovernanceAction).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it("does not distinguish an out-of-scope business from a missing business", async () => {
    mocks.teamMemberFindUnique.mockResolvedValueOnce({ team: { memberAccessEnabled: true } });
    mocks.getBusinessFull.mockResolvedValueOnce(null);
    const { app, authorization } = await buildMemberTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${organizationId}/businesses/${businessId}/full`
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Not Found", message: "Business not found." });
    expect(mocks.getBusinessFull).toHaveBeenCalledWith(
      businessId,
      expect.objectContaining({ authSubject: "user-1" })
    );
    await app.close();
  });

  it("serves version-aligned hierarchy and entity records to a provisioned member", async () => {
    mocks.teamMemberFindUnique
      .mockResolvedValueOnce({ team: { memberAccessEnabled: true } })
      .mockResolvedValueOnce({ team: { memberAccessEnabled: true } });
    mocks.getHierarchySnapshot.mockResolvedValueOnce({
      entities: [{ entity_id: businessId, entity_type: "ENTRAL", name: "ENTRAL", version: 1 }],
      event_sequence: 23,
      generated_at: "2026-07-25T00:00:00.000Z",
      scope: {
        label: "Assigned canonical businesses",
        mode: "ASSIGNED_BUSINESSES",
        user_id: businessId,
        visible_business_ids: []
      }
    });
    mocks.getEntityFull.mockResolvedValueOnce({
      entity: { aggregate_version: 1, summary: { entity_id: businessId, version: 1 } },
      event_sequence: 23
    });
    const { app, authorization } = await buildMemberTestServer();
    const hierarchyResponse = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${organizationId}/hierarchy`
    });
    const entityResponse = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${organizationId}/entities/${businessId}/full`
    });

    expect(hierarchyResponse.statusCode).toBe(200);
    expect(hierarchyResponse.json().event_sequence).toBe(23);
    expect(entityResponse.statusCode).toBe(200);
    expect(entityResponse.json().event_sequence).toBe(23);
    expect(mocks.getHierarchySnapshot).toHaveBeenCalledWith(expect.objectContaining({ authSubject: "user-1" }));
    expect(mocks.getEntityFull).toHaveBeenCalledWith(
      businessId,
      expect.objectContaining({ authSubject: "user-1" })
    );
    await app.close();
  });

  it("rejects unprovisioned organizations before calling the canonical repository", async () => {
    mocks.teamMemberFindUnique.mockResolvedValueOnce({ team: { memberAccessEnabled: false } });
    const { app, authorization } = await buildMemberTestServer();
    const response = await app.inject({
      headers: { authorization },
      method: "GET",
      url: `/api/v1/member/organizations/${organizationId}/portfolio/summary`
    });

    expect(response.statusCode).toBe(404);
    expect(mocks.getPortfolio).not.toHaveBeenCalled();
    await app.close();
  });
});
