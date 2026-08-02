import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  stringifySecretEnvelope: vi.fn(),
  withInvitationSession: vi.fn(),
  withTenantSession: vi.fn()
}));

vi.mock("../src/db.js", () => ({
  prisma: {},
  withInvitationSession: mocks.withInvitationSession,
  withTenantSession: mocks.withTenantSession
}));

vi.mock("../src/env.js", () => ({
  env: {
    DATA_ENCRYPTION_KEY_VERSION: "phase202-v1",
    JWT_SECRET: "phase202-membership-test-secret-long-enough",
    SECRET_BROKER_ENVIRONMENT: "PRODUCTION"
  }
}));

vi.mock("../src/services/secureJson.js", () => ({
  stringifySecretEnvelope: mocks.stringifySecretEnvelope
}));

const tenantId = "123e4567-e89b-42d3-a456-426614174201";
const organizationId = "123e4567-e89b-42d3-a456-426614174202";
const teamId = "team-phase-202";
const ownerActorId = "123e4567-e89b-42d3-a456-426614174203";
const memberActorId = "123e4567-e89b-42d3-a456-426614174204";
const invitationId = "123e4567-e89b-42d3-a456-426614174205";
const notificationId = "123e4567-e89b-42d3-a456-426614174206";
const memberUserId = "phase202-member";
const requestId = "123e4567-e89b-42d3-a456-426614174207";

function identity(role = "OWNER") {
  return {
    actorId: ownerActorId,
    appUserId: "phase202-owner",
    organizationId,
    role,
    tenantId
  };
}

function invitationIdentity(role = "MEMBER") {
  return {
    actorId: memberActorId,
    appUserId: memberUserId,
    invitationId,
    organizationId,
    role,
    teamId,
    tenantId
  };
}

function transaction() {
  return {
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    membershipInvitation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    membershipMutationReceipt: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn()
    },
    notificationEvidence: {
      create: vi.fn(),
      update: vi.fn()
    },
    notificationDeliveryOutbox: { create: vi.fn() },
    team: { findUnique: vi.fn() },
    teamMember: {
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn()
    },
    tenantActorAssignment: {
      update: vi.fn(),
      upsert: vi.fn()
    },
    user: { findUnique: vi.fn() }
  };
}

function bindTenant(tx: ReturnType<typeof transaction>, role = "OWNER") {
  mocks.withTenantSession.mockImplementation(async (_database, _context, operation) => operation(tx, identity(role)));
}

function bindInvitation(tx: ReturnType<typeof transaction>, role = "MEMBER") {
  mocks.withInvitationSession.mockImplementation(async (_database, _context, operation) => operation(tx, invitationIdentity(role)));
}

function storedReceipt(overrides: Record<string, unknown> = {}) {
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    transition_id: invitationId,
    transition: "ACCEPT",
    ownership: {
      organization_id: organizationId,
      tenant_id: tenantId,
      business_id: null,
      environment: "PRODUCTION",
      data_residency: "us-west"
    },
    actor: {
      actor_id: memberActorId,
      actor_type: "HUMAN",
      human_user_id: memberUserId,
      service_subject: null,
      agent_id: null
    },
    subject_user_id: memberUserId,
    subject_email_hash: null,
    request_id: requestId,
    idempotency_key: "accept-original",
    prior_version: 7,
    resulting_version: 8,
    authorization: "INVITATION_TOKEN",
    budget: { kind: "NO_EXTERNAL_SPEND", amount_minor_units: 0 },
    reversible: true,
    verification: "TRANSACTIONAL_READBACK",
    reconciliation: "IDEMPOTENT_RECEIPT",
    failure_behavior: "NO_PARTIAL_WRITE",
    evidence: [`tenant-assignment:${tenantId}`, `notification:${notificationId}`],
    notification_evidence_id: notificationId,
    occurred_at: "2026-08-02T12:00:00.000Z",
    release_version: "phase-202",
    ...overrides
  };
}

function membershipFingerprint(parts: readonly (string | null)[]) {
  return createHash("sha256").update(JSON.stringify(["phase202-membership-command-v1", ...parts])).digest("hex");
}

function storedRow(resultPayload = storedReceipt(), overrides: Record<string, unknown> = {}) {
  return {
    action: "ACCEPT",
    actorId: memberActorId,
    idempotencyKey: "accept-original",
    organizationId,
    requestFingerprint: membershipFingerprint(["ACCEPT", invitationId, memberUserId]),
    resultPayload,
    tenantId,
    ...overrides
  };
}

beforeEach(() => {
  vi.resetModules();
  mocks.withInvitationSession.mockReset();
  mocks.withTenantSession.mockReset();
  mocks.stringifySecretEnvelope.mockReset().mockReturnValue("v2.phase202-encrypted-command");
});

describe("Phase 202 membership lifecycle", () => {
  it("uses tenant-bound SQL helpers and records the real suspension version", async () => {
    const tx = transaction();
    bindTenant(tx);
    tx.membershipMutationReceipt.findUnique.mockResolvedValue(null);
    tx.team.findUnique.mockResolvedValue({
      dataResidency: "us-west",
      environment: "PRODUCTION",
      id: teamId,
      name: "ENTRAL",
      organizationId
    });
    tx.teamMember.findUnique.mockResolvedValue({
      actorId: memberActorId,
      role: "MEMBER",
      status: "ACTIVE",
      user: { email: "member@example.test" },
      userId: memberUserId,
      version: 4
    });
    tx.notificationEvidence.create.mockResolvedValue({ id: notificationId });
    tx.teamMember.update.mockResolvedValue({
      actorId: memberActorId,
      role: "MEMBER",
      status: "SUSPENDED",
      userId: memberUserId,
      version: 5
    });
    tx.$queryRaw.mockImplementation(async (query) => {
      const sql = query.join(" ");
      if (sql.includes("phase202_resolve_membership_profile")) {
        return [{ email: "member@example.test", name: "Member", userId: memberUserId }];
      }
      if (sql.includes("phase202_resolve_tenant_human_actor")) return [{ actorId: memberActorId }];
      if (sql.includes("phase202_revoke_tenant_user_sessions")) return [{ revokedCount: 2 }];
      throw new Error(`Unexpected SQL helper: ${sql}`);
    });

    const membership = await import("../src/services/phase202Membership.js");
    const result = await membership.transitionMember({
      action: "SUSPEND",
      authSubject: "phase202-owner",
      idempotencyKey: "suspend-1",
      requestId,
      subjectUserId: memberUserId,
      tenantId
    });

    expect(result).toMatchObject({ prior_version: 4, resulting_version: 5, transition: "SUSPEND" });
    const helperSql = tx.$queryRaw.mock.calls.map(([query]) => query.join(" ")).join("\n");
    expect(helperSql).toContain("phase202_resolve_tenant_human_actor");
    expect(helperSql).toContain("phase202_revoke_tenant_user_sessions");
    expect(tx.tenantActorAssignment.update).toHaveBeenCalledWith({
      where: { actorId_tenantId: { actorId: memberActorId, tenantId } },
      data: { role: "MEMBER", status: "SUSPENDED", version: { increment: 1 } }
    });
    expect(tx.membershipMutationReceipt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ priorVersion: 4, resultingVersion: 5 })
    });
    expect(mocks.stringifySecretEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "suspended",
        kind: "CHANGE",
        to: "member@example.test",
        token: null
      }),
      expect.objectContaining({
        actorId: ownerActorId,
        organizationId,
        purpose: "membership-email-delivery",
        tenantId
      })
    );
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    const [secretInsertSql, ...secretInsertValues] = tx.$executeRaw.mock.calls[0]!;
    expect(secretInsertSql.join(" ")).toContain('INSERT INTO "SecretReference"');
    expect(secretInsertValues).toEqual(expect.arrayContaining([
      organizationId,
      tenantId,
      "resend",
      "membership-email-delivery",
      "v2.phase202-encrypted-command",
      ownerActorId
    ]));
    expect(tx.notificationDeliveryOutbox.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        deliveryKind: "CHANGE",
        notificationEvidenceId: notificationId,
        status: "PENDING",
        tenantId
      })
    });
    expect(mocks.withTenantSession.mock.calls[0]![3]).toEqual({ isolationLevel: "Serializable" });
  });

  it("commits an invitation, encrypted delivery command, and durable outbox in one tenant transaction", async () => {
    const tx = transaction();
    bindTenant(tx);
    tx.membershipMutationReceipt.findUnique.mockResolvedValue(null);
    tx.team.findUnique.mockResolvedValue({
      dataResidency: "us-west",
      environment: "PRODUCTION",
      id: teamId,
      name: "ENTRAL",
      organizationId
    });
    tx.user.findUnique.mockResolvedValue(null);
    tx.notificationEvidence.create.mockResolvedValue({ id: notificationId });
    tx.membershipInvitation.create.mockImplementation(async ({ data }) => ({ id: data.id }));

    const membership = await import("../src/services/phase202Membership.js");
    const result = await membership.inviteMember({
      authSubject: "phase202-owner",
      email: " New.Member@Example.Test ",
      idempotencyKey: "invite-1",
      requestId,
      role: "TENANT_ADMIN",
      tenantId
    });

    expect(result).toMatchObject({ transition: "INVITE", prior_version: 0, resulting_version: 1 });
    expect(tx.membershipInvitation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "new.member@example.test",
        notificationEvidenceId: notificationId,
        role: "TENANT_ADMIN",
        tenantId
      })
    });
    const [command, context] = mocks.stringifySecretEnvelope.mock.calls[0]!;
    expect(command).toMatchObject({
      action: null,
      kind: "INVITATION",
      organizationName: "ENTRAL",
      role: "TENANT_ADMIN",
      to: "new.member@example.test"
    });
    expect(command.token).toMatch(/^[A-Za-z0-9_-]{64}$/u);
    expect(context).toMatchObject({
      actorId: ownerActorId,
      organizationId,
      provider: "resend",
      purpose: "membership-email-delivery",
      tenantId
    });
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw.mock.calls[0]![0].join(" ")).toContain('INSERT INTO "SecretReference"');
    expect(tx.notificationDeliveryOutbox.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        deliveryKind: "INVITATION",
        notificationEvidenceId: notificationId,
        status: "PENDING",
        tenantId
      })
    });
    expect(mocks.withTenantSession.mock.calls[0]![3]).toEqual({ isolationLevel: "Serializable" });
  });

  it("reactivates an existing membership using its real prior and resulting versions", async () => {
    const tx = transaction();
    bindInvitation(tx);
    tx.membershipMutationReceipt.findUnique.mockResolvedValue(null);
    tx.membershipMutationReceipt.findFirst.mockResolvedValue(null);
    tx.user.findUnique.mockResolvedValue({ id: memberUserId, email: "member@example.test" });
    tx.$queryRaw.mockResolvedValue([{ priorVersion: 7, resultingVersion: 8 }]);
    tx.team.findUnique.mockResolvedValue({
      dataResidency: "us-west",
      environment: "PRODUCTION",
      id: teamId,
      name: "ENTRAL",
      organizationId
    });
    tx.membershipInvitation.findUnique.mockResolvedValue({ id: invitationId, status: "PENDING" });
    tx.notificationEvidence.create.mockResolvedValue({ id: notificationId });

    const membership = await import("../src/services/phase202Membership.js");
    const result = await membership.acceptInvitation({
      authSubject: memberUserId,
      idempotencyKey: "accept-reactivation",
      requestId,
      token: "invitation-token"
    });

    expect(result).toMatchObject({ prior_version: 7, resulting_version: 8, transition: "ACCEPT" });
    expect(tx.$queryRaw.mock.calls[0]![0].join(" ")).toContain("phase202_accept_invitation_membership");
    expect(tx.membershipMutationReceipt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ actorId: memberActorId, priorVersion: 7, resultingVersion: 8 })
    });
    expect(mocks.withInvitationSession.mock.calls[0]![3]).toEqual({ isolationLevel: "Serializable" });
  });

  it("returns the exact stored receipt for an accepted invitation replay", async () => {
    const tx = transaction();
    bindInvitation(tx);
    const expected = storedReceipt();
    tx.membershipMutationReceipt.findUnique.mockResolvedValue(storedRow(expected));

    const membership = await import("../src/services/phase202Membership.js");
    const result = await membership.acceptInvitation({
      authSubject: memberUserId,
      idempotencyKey: "accept-original",
      requestId,
      token: "invitation-token"
    });

    expect(result).toEqual(expected);
    expect(tx.membershipMutationReceipt.findFirst).not.toHaveBeenCalled();
    expect(tx.user.findUnique).not.toHaveBeenCalled();
  });

  it("reconciles an accepted invitation replay even when the retry key changes", async () => {
    const tx = transaction();
    bindInvitation(tx);
    const expected = storedReceipt();
    tx.membershipMutationReceipt.findUnique.mockResolvedValue(null);
    tx.membershipMutationReceipt.findFirst.mockResolvedValue(storedRow(expected));

    const membership = await import("../src/services/phase202Membership.js");
    const result = await membership.acceptInvitation({
      authSubject: memberUserId,
      idempotencyKey: "accept-retry-different-key",
      requestId,
      token: "invitation-token"
    });

    expect(result).toEqual(expected);
    expect(tx.membershipMutationReceipt.findFirst).toHaveBeenCalledWith({
      where: {
        action: "ACCEPT",
        resultPayload: { equals: invitationId, path: ["transition_id"] },
        tenantId
      }
    });
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });

  it("rejects reuse of an invitation idempotency key for a different command intent", async () => {
    const tx = transaction();
    bindTenant(tx);
    tx.membershipMutationReceipt.findUnique.mockResolvedValue(storedRow(storedReceipt({
      transition: "INVITE",
      authorization: "OWNER",
      subject_user_id: null,
      subject_email_hash: "f".repeat(64),
      idempotency_key: "invite-conflict"
    }), {
      action: "INVITE",
      actorId: ownerActorId,
      idempotencyKey: "invite-conflict",
      requestFingerprint: "0".repeat(64)
    }));

    const membership = await import("../src/services/phase202Membership.js");
    await expect(membership.inviteMember({
      authSubject: "phase202-owner",
      email: "different@example.test",
      idempotencyKey: "invite-conflict",
      requestId,
      role: "TENANT_ADMIN",
      tenantId
    })).rejects.toThrow("MEMBERSHIP_IDEMPOTENCY_CONFLICT");

    expect(tx.team.findUnique).not.toHaveBeenCalled();
    expect(tx.membershipInvitation.create).not.toHaveBeenCalled();
  });

  it("rejects reuse of a transition idempotency key for a different subject or action", async () => {
    const tx = transaction();
    bindTenant(tx);
    tx.membershipMutationReceipt.findUnique.mockResolvedValue(storedRow(storedReceipt({
      transition: "SUSPEND",
      authorization: "OWNER",
      subject_user_id: memberUserId,
      subject_email_hash: null,
      idempotency_key: "transition-conflict"
    }), {
      action: "SUSPEND",
      actorId: ownerActorId,
      idempotencyKey: "transition-conflict",
      requestFingerprint: "1".repeat(64)
    }));

    const membership = await import("../src/services/phase202Membership.js");
    await expect(membership.transitionMember({
      action: "REMOVE",
      authSubject: "phase202-owner",
      idempotencyKey: "transition-conflict",
      requestId,
      subjectUserId: "a-different-user",
      tenantId
    })).rejects.toThrow("MEMBERSHIP_IDEMPOTENCY_CONFLICT");

    expect(tx.team.findUnique).not.toHaveBeenCalled();
    expect(tx.teamMember.update).not.toHaveBeenCalled();
  });

  it("rejects an invalid role before opening a tenant write transaction", async () => {
    const membership = await import("../src/services/phase202Membership.js");

    await expect(membership.transitionMember({
      action: "ROLE_CHANGE",
      authSubject: "phase202-owner",
      idempotencyKey: "invalid-role",
      requestId,
      role: "SUPERADMIN" as never,
      subjectUserId: memberUserId,
      tenantId
    })).rejects.toThrow("MEMBERSHIP_ROLE_REQUIRED");

    expect(mocks.withTenantSession).not.toHaveBeenCalled();
  });

  it("does not trust a tenant administrator request to grant owner authority", async () => {
    const tx = transaction();
    bindTenant(tx, "TENANT_ADMIN");
    const membership = await import("../src/services/phase202Membership.js");

    await expect(membership.transitionMember({
      action: "ROLE_CHANGE",
      authSubject: "phase202-admin",
      idempotencyKey: "escalate-to-owner",
      requestId,
      role: "OWNER",
      subjectUserId: memberUserId,
      tenantId
    })).rejects.toThrow("OWNER_AUTHORITY_REQUIRED");

    expect(tx.membershipMutationReceipt.findUnique).not.toHaveBeenCalled();
    expect(tx.teamMember.update).not.toHaveBeenCalled();
  });
});
