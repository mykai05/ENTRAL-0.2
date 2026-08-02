import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  acceptInvitation: vi.fn(),
  beginTotpEnrollment: vi.fn(),
  clearAuthCookie: vi.fn(),
  confirmTotpEnrollment: vi.fn(),
  consumeTenantRateLimit: vi.fn(),
  durableSessionsAvailable: vi.fn(),
  elevateSupportAccess: vi.fn(),
  inviteMember: vi.fn(),
  issueSupportAccess: vi.fn(),
  listMemberships: vi.fn(),
  listMfaFactors: vi.fn(),
  listSessions: vi.fn(),
  listSupportAccess: vi.fn(),
  listSupportTasks: vi.fn(),
  readSupportSession: vi.fn(),
  regenerateRecoveryCodes: vi.fn(),
  removeMfaFactor: vi.fn(),
  requestUser: null as null | Record<string, unknown>,
  requireAuthFailure: null as null | { statusCode: number; payload: unknown },
  revokeAllSessions: vi.fn(),
  revokeSession: vi.fn(),
  revokeSupportAccess: vi.fn(),
  transitionMember: vi.fn(),
  updateSupportTaskStatus: vi.fn(),
  verifyMfaStepUp: vi.fn()
}));

vi.mock("../src/auth.js", () => ({
  clearAuthCookie: mocks.clearAuthCookie,
  requireAuth: async (request: { user?: unknown }, reply: { code(value: number): unknown; send(value: unknown): unknown }) => {
    if (mocks.requireAuthFailure) {
      return (reply.code(mocks.requireAuthFailure.statusCode) as { send(value: unknown): unknown }).send(mocks.requireAuthFailure.payload);
    }
    request.user = mocks.requestUser;
  },
  setPrivateNoStoreHeaders: (reply: { header(name: string, value: string): unknown }) => {
    reply.header("cache-control", "private, no-store");
    reply.header("vary", "Origin, Cookie, Authorization");
  }
}));

vi.mock("../src/env.js", () => ({
  env: { MFA_STEP_UP_TTL_SECONDS: 600 }
}));

vi.mock("../src/services/phase202SessionBroker.js", () => ({
  durableSessionsAvailable: mocks.durableSessionsAvailable,
  listSessions: mocks.listSessions,
  readSupportSession: mocks.readSupportSession,
  revokeAllSessions: mocks.revokeAllSessions,
  revokeSession: mocks.revokeSession
}));

vi.mock("../src/services/phase202Mfa.js", () => ({
  Phase202MfaError: class Phase202MfaError extends Error {},
  beginTotpEnrollment: mocks.beginTotpEnrollment,
  confirmTotpEnrollment: mocks.confirmTotpEnrollment,
  listMfaFactors: mocks.listMfaFactors,
  regenerateRecoveryCodes: mocks.regenerateRecoveryCodes,
  removeMfaFactor: mocks.removeMfaFactor,
  verifyMfaStepUp: mocks.verifyMfaStepUp
}));

vi.mock("../src/services/phase202Membership.js", () => ({
  acceptInvitation: mocks.acceptInvitation,
  inviteMember: mocks.inviteMember,
  listMemberships: mocks.listMemberships,
  transitionMember: mocks.transitionMember
}));

vi.mock("../src/services/phase202SupportAccess.js", () => ({
  Phase202SupportAccessError: class Phase202SupportAccessError extends Error {},
  consumeTenantRateLimit: mocks.consumeTenantRateLimit,
  elevateSupportAccess: mocks.elevateSupportAccess,
  issueSupportAccess: mocks.issueSupportAccess,
  listSupportAccess: mocks.listSupportAccess,
  revokeSupportAccess: mocks.revokeSupportAccess
}));

vi.mock("../src/services/phase202SupportOperations.js", () => ({
  listSupportTasks: mocks.listSupportTasks,
  updateSupportTaskStatus: mocks.updateSupportTaskStatus
}));

const sessionId = "123e4567-e89b-42d3-a456-426614174201";
const actorId = "123e4567-e89b-42d3-a456-426614174202";
const organizationId = "123e4567-e89b-42d3-a456-426614174203";
const tenantId = "123e4567-e89b-42d3-a456-426614174204";
const factorId = "123e4567-e89b-42d3-a456-426614174205";
const grantId = "123e4567-e89b-42d3-a456-426614174206";
const supportActorId = "123e4567-e89b-42d3-a456-426614174207";

function memberUser(overrides: Record<string, unknown> = {}) {
  return {
    sub: "user-ada",
    email: "ada@example.com",
    role: "USER",
    session: "member",
    sessionVersion: 2,
    tokenVersion: 2,
    sessionId,
    tokenId: "123e4567-e89b-42d3-a456-426614174299",
    actorId,
    organizationId,
    tenantId,
    supportGrantId: null,
    stepUpAt: null,
    ...overrides
  };
}

function unblockedRateLimit() {
  return {
    blocked: false,
    limit: 20,
    requestCount: 1,
    windowStartedAt: new Date("2026-08-02T10:00:00.000Z")
  };
}

function sessionReceipt(transition: "REVOKE_ONE" | "REVOKE_ALL", subjectSessionId: string | null = null) {
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    transition_id: "123e4567-e89b-42d3-a456-426614174298",
    transition,
    ownership: {
      scope_kind: "PERSONAL",
      organization_id: null,
      tenant_id: null,
      business_id: null,
      environment: "DEVELOPMENT",
      data_residency: null
    },
    actor: {
      actor_id: actorId,
      actor_type: "HUMAN",
      human_user_id: "user-ada",
      service_subject: null,
      agent_id: null
    },
    request_id: "session-request",
    idempotency_key: transition === "REVOKE_ONE" ? "session-revoke-one-key" : "session-revoke-all-key",
    prior_version: 2,
    resulting_version: 3,
    revoked_count: transition === "REVOKE_ONE" ? 1 : 3,
    subject_session_id: transition === "REVOKE_ONE" ? subjectSessionId : null,
    budget: { kind: "NO_EXTERNAL_SPEND", amount_minor_units: 0 },
    reversible: false,
    verification: "TRANSACTIONAL_READBACK",
    reconciliation: "IDEMPOTENT_RECEIPT",
    failure_behavior: "NO_PARTIAL_WRITE",
    evidence: ["session:version:3"],
    occurred_at: "2026-08-02T10:00:00.000Z",
    release_version: "phase-202"
  };
}

async function buildApp() {
  const { phase202IdentityAuthorityRoutes } = await import("../src/routes/phase202IdentityAuthority.js");
  const app = Fastify({ logger: false });
  await app.register(phase202IdentityAuthorityRoutes, { prefix: "/api/v1" });
  return app;
}

beforeEach(() => {
  for (const [key, value] of Object.entries(mocks)) {
    if (typeof value === "function" && "mockReset" in value) value.mockReset();
  }
  mocks.requestUser = memberUser();
  mocks.requireAuthFailure = null;
  mocks.durableSessionsAvailable.mockReturnValue(true);
  mocks.consumeTenantRateLimit.mockResolvedValue(unblockedRateLimit());
  mocks.listSessions.mockResolvedValue([]);
  mocks.listMfaFactors.mockResolvedValue([]);
  mocks.listMemberships.mockResolvedValue([]);
  mocks.listSupportAccess.mockResolvedValue([]);
  mocks.listSupportTasks.mockResolvedValue({ tasks: [] });
  mocks.readSupportSession.mockResolvedValue({});
  mocks.updateSupportTaskStatus.mockResolvedValue({
    changed: true,
    task: { task_id: "task-1", title: "Repair task", status: "DONE", updated_at: "2026-08-02T10:00:00.000Z" }
  });
  mocks.revokeSession.mockResolvedValue({ receipt: sessionReceipt("REVOKE_ONE", sessionId), replayed: false });
  mocks.revokeAllSessions.mockResolvedValue({ receipt: sessionReceipt("REVOKE_ALL"), replayed: false });
});

describe("Phase 202 identity authority routes", () => {
  it("exposes a narrow readback only to the exact durable support session", async () => {
    const supportReadback = {
      session: {
        session_id: sessionId,
        actor_id: supportActorId,
        organization_id: organizationId,
        tenant_id: tenantId,
        support_grant_id: grantId,
        session_type: "SUPPORT",
        device_label: "Chrome on Windows",
        issued_at: "2026-08-02T10:00:00.000Z",
        last_used_at: "2026-08-02T10:00:00.000Z",
        expires_at: "2026-08-02T10:30:00.000Z",
        revoked_at: null,
        current: true
      },
      support_grant: {
        grant_id: grantId,
        tenant_id: tenantId,
        organization_id: organizationId,
        support_actor_id: supportActorId,
        purpose: "bounded support diagnosis",
        scopes: ["table:MemberWorkspaceSnapshot:read"],
        access_mode: "READ_ONLY",
        write_elevation_purpose: null,
        write_elevation_expires_at: null,
        owner_visible: true,
        approved_by_actor_id: actorId,
        issued_at: "2026-08-02T09:59:00.000Z",
        expires_at: "2026-08-02T11:00:00.000Z",
        revoked_at: null
      }
    };
    mocks.requestUser = memberUser({ session: "support", supportGrantId: grantId });
    mocks.readSupportSession.mockResolvedValue(supportReadback);
    const app = await buildApp();

    const allowed = await app.inject({ method: "GET", url: "/api/v1/identity/support-session" });
    const denied = await app.inject({ method: "GET", url: "/api/v1/identity/sessions" });

    expect(allowed.statusCode).toBe(200);
    expect(allowed.json()).toEqual(supportReadback);
    expect(mocks.readSupportSession).toHaveBeenCalledWith({
      requestId: expect.any(String),
      sessionId,
      supportGrantId: grantId,
      userId: "user-ada"
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.json()).toMatchObject({ reason_code: "SUPPORT_SESSION_SCOPE_RESTRICTED" });
    expect(mocks.listSessions).not.toHaveBeenCalled();
    await app.close();
  });

  it("exposes only the bounded task projection and status mutation to exact support sessions", async () => {
    mocks.requestUser = memberUser({ session: "support", supportGrantId: grantId });
    mocks.listSupportTasks.mockResolvedValue({
      tasks: [{ task_id: "task-1", title: "Repair task", status: "IN_PROGRESS", updated_at: "2026-08-02T09:59:00.000Z" }]
    });
    const app = await buildApp();

    const read = await app.inject({ method: "GET", url: "/api/v1/identity/support-session/tasks?limit=5" });
    const write = await app.inject({
      method: "PATCH",
      url: "/api/v1/identity/support-session/tasks/task-1",
      payload: { status: "DONE" }
    });

    expect(read.statusCode).toBe(200);
    expect(read.json()).toEqual({
      tasks: [{ task_id: "task-1", title: "Repair task", status: "IN_PROGRESS", updated_at: "2026-08-02T09:59:00.000Z" }]
    });
    expect(write.statusCode).toBe(200);
    expect(write.json()).toMatchObject({ changed: true, task: { task_id: "task-1", status: "DONE" } });
    expect(mocks.listSupportTasks).toHaveBeenCalledWith(expect.objectContaining({ limit: 5, supportGrantId: grantId }));
    expect(mocks.updateSupportTaskStatus).toHaveBeenCalledWith(expect.objectContaining({ status: "DONE", taskId: "task-1" }));
    await app.close();
  });

  it("serves every AccountSecurityControls readback from the verified durable principal", async () => {
    mocks.listSessions.mockResolvedValue([{ session_id: sessionId }]);
    mocks.listMfaFactors.mockResolvedValue([{ factor_id: factorId }]);
    mocks.listMemberships.mockResolvedValue([{ user_id: "user-ada" }]);
    mocks.listSupportAccess.mockResolvedValue([{ grant_id: grantId }]);
    const app = await buildApp();

    const [sessions, factors, memberships, support] = await Promise.all([
      app.inject({ method: "GET", url: "/api/v1/identity/sessions" }),
      app.inject({ method: "GET", url: "/api/v1/identity/mfa/factors" }),
      app.inject({ method: "GET", url: "/api/v1/identity/memberships" }),
      app.inject({ method: "GET", url: "/api/v1/identity/support-access" })
    ]);

    expect(sessions.json()).toEqual({ sessions: [{ session_id: sessionId }] });
    expect(factors.json()).toEqual({ factors: [{ factor_id: factorId }] });
    expect(memberships.json()).toEqual({ memberships: [{ user_id: "user-ada" }] });
    expect(support.json()).toEqual({ grants: [{ grant_id: grantId }] });
    expect(mocks.listSessions).toHaveBeenCalledWith("user-ada", sessionId);
    expect(mocks.listMfaFactors).toHaveBeenCalledWith("user-ada");
    expect(mocks.listMemberships).toHaveBeenCalledWith("user-ada", tenantId);
    expect(mocks.listSupportAccess).toHaveBeenCalledWith("user-ada", tenantId);
    expect(sessions.headers["cache-control"]).toBe("private, no-store");
    await app.close();
  });

  it("rejects legacy access and returns the exact root dependency contract when the durable store is unavailable", async () => {
    const app = await buildApp();
    mocks.requestUser = memberUser({ tokenVersion: 1, sessionId: null, actorId: null });
    const legacy = await app.inject({ method: "GET", url: "/api/v1/identity/sessions" });
    expect(legacy.statusCode).toBe(403);
    expect(legacy.json()).toMatchObject({ reason_code: "DURABLE_SESSION_REQUIRED" });

    mocks.requestUser = memberUser();
    mocks.durableSessionsAvailable.mockReturnValue(false);
    const unavailable = await app.inject({ method: "GET", url: "/api/v1/identity/sessions" });
    expect(unavailable.statusCode).toBe(503);
    const payload = unavailable.json();
    expect(Object.keys(payload).sort()).toEqual([
      "contract_version",
      "dependency",
      "occurred_at",
      "reason_code",
      "retryable",
      "schema_version",
      "status"
    ]);
    expect(payload).toMatchObject({
      contract_version: "1.0.0",
      schema_version: 1,
      status: "BLOCKED",
      dependency: "SESSION_STORE",
      reason_code: "SESSION_STORE_UNAVAILABLE",
      retryable: true
    });
    expect(mocks.listSessions).not.toHaveBeenCalled();
    await app.close();
  });

  it("derives tenant authority only from request.user and rejects body attempts to override it", async () => {
    mocks.inviteMember.mockResolvedValue({ transition: "INVITE" });
    const app = await buildApp();
    const spoofed = await app.inject({
      method: "POST",
      url: "/api/v1/identity/memberships/invitations",
      payload: {
        email: "grace@example.com",
        role: "MEMBER",
        idempotency_key: "membership-invite-grace",
        tenant_id: "123e4567-e89b-42d3-a456-426614174999"
      }
    });
    expect(spoofed.statusCode).toBe(400);
    expect(mocks.inviteMember).not.toHaveBeenCalled();

    const accepted = await app.inject({
      method: "POST",
      url: "/api/v1/identity/memberships/invitations",
      headers: { "x-tenant-id": "123e4567-e89b-42d3-a456-426614174999" },
      payload: {
        email: "grace@example.com",
        role: "MEMBER",
        idempotency_key: "membership-invite-grace"
      }
    });
    expect(accepted.statusCode).toBe(201);
    expect(mocks.inviteMember).toHaveBeenCalledWith(expect.objectContaining({
      authSubject: "user-ada",
      tenantId,
      email: "grace@example.com",
      role: "MEMBER",
      idempotencyKey: "membership-invite-grace"
    }));
    await app.close();
  });

  it("returns 403 when a non-owner attempts a valid OWNER membership transition", async () => {
    mocks.transitionMember.mockRejectedValue(new Error("OWNER_AUTHORITY_REQUIRED"));
    const app = await buildApp();

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/identity/memberships/user-grace",
      payload: {
        action: "ROLE_CHANGE",
        idempotency_key: "membership-promote-owner",
        role: "OWNER"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      code: "OWNER_AUTHORITY_REQUIRED",
      error: "Request Error"
    });
    expect(response.json()).not.toMatchObject({ status: "BLOCKED" });
    expect(mocks.transitionMember).toHaveBeenCalledWith(expect.objectContaining({
      action: "ROLE_CHANGE",
      authSubject: "user-ada",
      tenantId,
      subjectUserId: "user-grace",
      role: "OWNER",
      idempotencyKey: "membership-promote-owner"
    }));
    await app.close();
  });

  it("returns 409 when a membership idempotency key is reused for another command", async () => {
    mocks.transitionMember.mockRejectedValue(new Error("MEMBERSHIP_IDEMPOTENCY_CONFLICT"));
    const app = await buildApp();

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/identity/memberships/user-grace",
      payload: {
        action: "SUSPEND",
        idempotency_key: "membership-command-conflict"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      code: "MEMBERSHIP_IDEMPOTENCY_CONFLICT",
      error: "Request Error"
    });
    expect(response.json()).not.toMatchObject({ status: "BLOCKED" });
    await app.close();
  });

  it("passes only the durable session identity for transactional support step-up verification", async () => {
    mocks.requestUser = memberUser({ stepUpAt: new Date().toISOString() });
    mocks.elevateSupportAccess.mockResolvedValue({ grant_id: grantId, access_mode: "WRITE_ELEVATED" });
    const app = await buildApp();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const spoofed = await app.inject({
      method: "POST",
      url: `/api/v1/identity/support-access/${grantId}/elevate`,
      headers: { "idempotency-key": "support-elevate-spoof" },
      payload: {
        expires_at: expiresAt,
        purpose: "repair verified workspace state",
        write_scopes: ["table:MemberWorkspaceSnapshot:write"],
        step_up_verified: true
      }
    });
    expect(spoofed.statusCode).toBe(400);
    expect(mocks.elevateSupportAccess).not.toHaveBeenCalled();

    const elevated = await app.inject({
      method: "POST",
      url: `/api/v1/identity/support-access/${grantId}/elevate`,
      headers: { "idempotency-key": "support-elevate-valid" },
      payload: {
        expires_at: expiresAt,
        purpose: "repair verified workspace state",
        write_scopes: ["table:MemberWorkspaceSnapshot:write"]
      }
    });
    expect(elevated.statusCode).toBe(200);
    expect(mocks.elevateSupportAccess).toHaveBeenCalledWith(expect.objectContaining({
      authSubject: "user-ada",
      tenantId,
      grantId,
      sessionId
    }));
    await app.close();
  });

  it("accepts invitations from a durable personal session without inventing a tenant", async () => {
    mocks.requestUser = memberUser({ session: "internal", tenantId: null, organizationId: null });
    mocks.acceptInvitation.mockResolvedValue({ transition: "ACCEPT" });
    const app = await buildApp();
    const response = await app.inject({
      headers: { "x-request-id": "client-replay-key" },
      method: "POST",
      url: "/api/v1/identity/memberships/invitations/accept",
      payload: {
        idempotency_key: "membership-accept-invite",
        token: "a".repeat(48)
      }
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.acceptInvitation).toHaveBeenCalledWith(expect.objectContaining({
      authSubject: "user-ada",
      idempotencyKey: "membership-accept-invite",
      token: "a".repeat(48)
    }));
    expect(mocks.acceptInvitation.mock.calls[0]![0]).not.toHaveProperty("tenantId");
    await app.close();
  });

  it("maps secret-broker failures and authority-store inconsistency to exact blocked root responses", async () => {
    mocks.beginTotpEnrollment.mockRejectedValue({
      code: "SECRET_BROKER_KEY_UNAVAILABLE",
      message: "Secret broker encryption is unavailable.",
      statusCode: 503
    });
    const app = await buildApp();
    const secret = await app.inject({
      method: "POST",
      url: "/api/v1/identity/mfa/totp/enroll",
      headers: { "idempotency-key": "mfa-enroll-secret-failure" }
    });
    expect(secret.statusCode).toBe(503);
    expect(secret.json()).toMatchObject({
      status: "BLOCKED",
      dependency: "SECRET_BROKER",
      reason_code: "SECRET_BROKER_KEY_UNAVAILABLE"
    });
    expect(Object.keys(secret.json())).not.toContain("message");

    mocks.listMemberships.mockRejectedValue(new Error("TARGET_ACTOR_NOT_FOUND"));
    const authority = await app.inject({ method: "GET", url: "/api/v1/identity/memberships" });
    expect(authority.statusCode).toBe(503);
    expect(authority.json()).toMatchObject({
      status: "BLOCKED",
      dependency: "AUTHORITY_STORE",
      reason_code: "TARGET_ACTOR_NOT_FOUND",
      retryable: false
    });
    await app.close();
  });

  it("enforces the fixed tenant rate policy before support mutation", async () => {
    mocks.consumeTenantRateLimit.mockResolvedValue({
      blocked: true,
      limit: 20,
      requestCount: 21,
      windowStartedAt: new Date("2026-08-02T10:00:00.000Z")
    });
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/identity/support-access",
      headers: { "idempotency-key": "support-rate-limited" },
      payload: {
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        purpose: "read verified production state",
        read_scopes: ["table:MemberWorkspaceSnapshot:read"],
        support_actor_id: supportActorId
      }
    });

    expect(response.statusCode).toBe(429);
    expect(response.json()).toMatchObject({
      reason_code: "TENANT_RATE_LIMIT_EXCEEDED",
      blocked: true,
      limit: 20,
      request_count: 21
    });
    expect(mocks.consumeTenantRateLimit).toHaveBeenCalledWith(expect.objectContaining({
      authSubject: "user-ada",
      tenantId,
      bucket: "identity.support_access.mutation",
      limit: 20,
      windowSeconds: 60
    }));
    const authoritativeRequestId = mocks.consumeTenantRateLimit.mock.calls[0]?.[0]?.requestId;
    expect(authoritativeRequestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(authoritativeRequestId).not.toBe("client-replay-key");
    expect(mocks.issueSupportAccess).not.toHaveBeenCalled();
    await app.close();
  });

  it("binds session and MFA mutations to the current durable session", async () => {
    mocks.confirmTotpEnrollment.mockResolvedValue({
      replayed: false,
      receipt: { transition: "TOTP_CONFIRM", session_step_up_at: "2026-08-02T10:10:00.000Z" },
      recovery_codes: ["RECOVERY-A"]
    });
    mocks.verifyMfaStepUp.mockResolvedValue({
      replayed: false,
      receipt: { transition: "STEP_UP", session_step_up_at: "2026-08-02T10:10:00.000Z" },
      recovery_codes: null
    });
    mocks.removeMfaFactor.mockResolvedValue({
      replayed: false,
      receipt: { transition: "FACTOR_REVOKE", session_step_up_at: null },
      recovery_codes: null
    });
    const app = await buildApp();

    const confirmation = await app.inject({
      method: "POST",
      url: "/api/v1/identity/mfa/totp/confirm",
      headers: { "idempotency-key": "mfa-confirm-route-key" },
      payload: { code: "123456", factor_id: factorId }
    });
    const stepUp = await app.inject({
      method: "POST",
      url: "/api/v1/identity/mfa/step-up",
      headers: { "idempotency-key": "mfa-stepup-route-key" },
      payload: { code: "654321" }
    });
    const removal = await app.inject({
      method: "DELETE",
      url: `/api/v1/identity/mfa/${factorId}`,
      headers: { "idempotency-key": "mfa-removal-route-key" }
    });
    const revocation = await app.inject({
      headers: { "idempotency-key": "session-revoke-one-key" },
      method: "DELETE",
      url: `/api/v1/identity/sessions/${sessionId}`
    });

    expect(confirmation.json()).toEqual({
      replayed: false,
      receipt: { transition: "TOTP_CONFIRM", session_step_up_at: "2026-08-02T10:10:00.000Z" },
      one_time_material: { recovery_codes: ["RECOVERY-A"] }
    });
    expect(stepUp.json()).toEqual({
      replayed: false,
      receipt: { transition: "STEP_UP", session_step_up_at: "2026-08-02T10:10:00.000Z" },
      one_time_material: null
    });
    expect(removal.json()).toEqual({
      replayed: false,
      receipt: { transition: "FACTOR_REVOKE", session_step_up_at: null },
      one_time_material: null
    });
    expect(revocation.json()).toEqual(sessionReceipt("REVOKE_ONE", sessionId));
    expect(mocks.confirmTotpEnrollment).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-ada", sessionId, idempotencyKey: "mfa-confirm-route-key" }));
    expect(mocks.verifyMfaStepUp).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-ada", sessionId, idempotencyKey: "mfa-stepup-route-key" }));
    expect(mocks.removeMfaFactor).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-ada", sessionId, factorId, idempotencyKey: "mfa-removal-route-key" }));
    expect(mocks.revokeSession).toHaveBeenCalledWith("user-ada", sessionId, expect.any(String), "session-revoke-one-key");
    expect(mocks.clearAuthCookie).toHaveBeenCalled();
    await app.close();
  });

  it("requires idempotency for session revocation and clears cookies for revoke-all", async () => {
    const app = await buildApp();
    const missing = await app.inject({ method: "DELETE", url: `/api/v1/identity/sessions/${sessionId}` });
    expect(missing.statusCode).toBe(400);
    expect(missing.json()).toMatchObject({ reason_code: "IDEMPOTENCY_KEY_INVALID" });
    expect(mocks.revokeSession).not.toHaveBeenCalled();

    const all = await app.inject({
      headers: { "idempotency-key": "session-revoke-all-key" },
      method: "DELETE",
      url: "/api/v1/identity/sessions"
    });
    expect(all.statusCode).toBe(200);
    expect(all.json()).toEqual(sessionReceipt("REVOKE_ALL"));
    expect(mocks.revokeAllSessions).toHaveBeenCalledWith(
      "user-ada",
      expect.any(String),
      "session-revoke-all-key"
    );
    expect(mocks.clearAuthCookie).toHaveBeenCalled();
    await app.close();
  });
});
