import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { assertMembershipTransitionReceipt, type MembershipTransitionReceipt } from "@entral/contracts";
import { env } from "../env.js";
import { prisma, withInvitationSession, withTenantSession, type VerifiedTenantIdentity } from "../db.js";
import { stringifySecretEnvelope, type SecretEnvelopeContext } from "./secureJson.js";

type MembershipRole = "MEMBER" | "TENANT_ADMIN" | "OWNER";
type LifecycleAction = "ROLE_CHANGE" | "SUSPEND" | "REMOVE";

const membershipRoles = new Set<MembershipRole>(["MEMBER", "TENANT_ADMIN", "OWNER"]);
const lifecycleActions = new Set<LifecycleAction>(["ROLE_CHANGE", "SUSPEND", "REMOVE"]);

function isMembershipRole(value: unknown): value is MembershipRole {
  return typeof value === "string" && membershipRoles.has(value as MembershipRole);
}

function keyedHash(domain: string, value: string) {
  return createHmac("sha256", env.JWT_SECRET).update(`phase202:${domain}\0${value}`).digest("hex");
}

function membershipRequestFingerprint(parts: readonly (string | null)[]) {
  return createHash("sha256").update(JSON.stringify(["phase202-membership-command-v1", ...parts])).digest("hex");
}

export function hashMembershipInvitationToken(token: string) {
  return keyedHash("membership-invitation", token);
}

type MembershipEmailCommand = {
  action: string | null;
  kind: "CHANGE" | "INVITATION";
  organizationName: string;
  role: MembershipRole | null;
  schemaVersion: 1;
  to: string;
  token: string | null;
};

async function enqueueMembershipEmail(
  tx: Prisma.TransactionClient,
  identity: VerifiedTenantIdentity,
  input: {
    command: MembershipEmailCommand;
    notificationEvidenceId: string;
    occurredAt: Date;
  }
) {
  const secretReferenceId = randomUUID();
  const deliveryId = randomUUID();
  const context: SecretEnvelopeContext = {
    secretReferenceId,
    organizationId: identity.organizationId,
    tenantId: identity.tenantId,
    businessId: null,
    actorId: identity.actorId,
    provider: "resend",
    purpose: "membership-email-delivery",
    environment: env.SECRET_BROKER_ENVIRONMENT,
    recordVersion: 1
  };
  const encryptedValue = stringifySecretEnvelope(input.command, context);
  // This write intentionally avoids RETURNING: membership administrators may
  // enqueue the exact encrypted delivery secret but may not read ciphertext.
  await tx.$executeRaw`
    INSERT INTO "SecretReference" (
      "id","organizationId","tenantId","businessId","provider","purpose",
      "environment","keyVersion","encryptedValue","lastFour","version","createdByActorId"
    ) VALUES (
      ${secretReferenceId}::uuid,${identity.organizationId}::uuid,${identity.tenantId}::uuid,
      NULL::uuid,${context.provider},${context.purpose},${context.environment},
      ${env.DATA_ENCRYPTION_KEY_VERSION},${encryptedValue},NULL,1,${identity.actorId}::uuid
    )
  `;
  await tx.notificationDeliveryOutbox.create({
    data: {
      id: deliveryId,
      organizationId: identity.organizationId,
      tenantId: identity.tenantId,
      notificationEvidenceId: input.notificationEvidenceId,
      secretReferenceId,
      deliveryKind: input.command.kind,
      status: "PENDING",
      attempts: 0,
      availableAt: input.occurredAt,
      deadlineAt: new Date(input.occurredAt.getTime() + 23 * 60 * 60 * 1000)
    }
  });
}

function actorReference(actorId: string, humanUserId: string) {
  return { actor_id: actorId, actor_type: "HUMAN" as const, human_user_id: humanUserId, service_subject: null, agent_id: null };
}

function ownership(identity: VerifiedTenantIdentity, team: { dataResidency: string; environment: string }) {
  return {
    organization_id: identity.organizationId,
    tenant_id: identity.tenantId,
    business_id: null,
    environment: team.environment as "DEVELOPMENT" | "STAGING" | "PRODUCTION",
    data_residency: team.dataResidency
  };
}

function receipt(
  identity: VerifiedTenantIdentity,
  team: { dataResidency: string; environment: string },
  input: {
    action: MembershipTransitionReceipt["transition"];
    id: string;
    idempotencyKey: string;
    notificationEvidenceId: string;
    occurredAt: Date;
    priorVersion: number;
    resultingVersion: number;
    requestId: string;
    subjectEmailHash: string | null;
    subjectUserId: string | null;
  },
  actorUserId: string
): MembershipTransitionReceipt {
  if (input.resultingVersion !== input.priorVersion + 1) {
    throw new Error("MEMBERSHIP_VERSION_TRANSITION_INVALID");
  }
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    transition_id: input.id,
    transition: input.action,
    ownership: ownership(identity, team),
    actor: actorReference(identity.actorId, actorUserId),
    subject_user_id: input.subjectUserId,
    subject_email_hash: input.subjectEmailHash,
    request_id: input.requestId,
    idempotency_key: input.idempotencyKey,
    prior_version: input.priorVersion,
    resulting_version: input.resultingVersion,
    authorization: input.action === "ACCEPT"
      ? "INVITATION_TOKEN"
      : identity.role === "OWNER" ? "OWNER" : "TENANT_ADMIN",
    budget: { kind: "NO_EXTERNAL_SPEND", amount_minor_units: 0 },
    reversible: input.action !== "REMOVE",
    verification: "TRANSACTIONAL_READBACK",
    reconciliation: "IDEMPOTENT_RECEIPT",
    failure_behavior: "NO_PARTIAL_WRITE",
    evidence: [`tenant-assignment:${identity.tenantId}`, `notification:${input.notificationEvidenceId}`],
    notification_evidence_id: input.notificationEvidenceId,
    occurred_at: input.occurredAt.toISOString(),
    release_version: "phase-202"
  };
}

function assertMembershipAdministrator(identity: VerifiedTenantIdentity) {
  if (identity.role !== "OWNER" && identity.role !== "TENANT_ADMIN") throw new Error("MEMBERSHIP_ADMIN_REQUIRED");
}

function receiptFromStored(
  stored: {
    action: string;
    actorId: string;
    idempotencyKey: string;
    organizationId: string;
    requestFingerprint: string;
    resultPayload: Prisma.JsonValue;
    tenantId: string;
  },
  expected: {
    action: MembershipTransitionReceipt["transition"];
    actorId: string;
    idempotencyKey?: string;
    organizationId: string;
    requestFingerprint: string;
    tenantId: string;
  }
) {
  const value = stored.resultPayload;
  assertMembershipTransitionReceipt(value);
  if (
    stored.action !== expected.action
    || stored.actorId !== expected.actorId
    || stored.organizationId !== expected.organizationId
    || stored.tenantId !== expected.tenantId
    || stored.requestFingerprint !== expected.requestFingerprint
    || (expected.idempotencyKey !== undefined && stored.idempotencyKey !== expected.idempotencyKey)
    || value.transition !== expected.action
    || value.actor.actor_id !== expected.actorId
    || value.ownership.organization_id !== expected.organizationId
    || value.ownership.tenant_id !== expected.tenantId
    || (expected.idempotencyKey !== undefined && value.idempotency_key !== expected.idempotencyKey)
  ) {
    throw new Error("MEMBERSHIP_IDEMPOTENCY_CONFLICT");
  }
  return value;
}

export async function inviteMember(input: {
  authSubject: string;
  email: string;
  idempotencyKey: string;
  requestId: string;
  role: MembershipRole;
  tenantId: string;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail || !isMembershipRole(input.role)) throw new Error("INVALID_INVITATION");
  const subjectEmailHash = keyedHash("membership-email", normalizedEmail);
  const requestFingerprint = membershipRequestFingerprint(["INVITE", subjectEmailHash, input.role]);

  return withTenantSession(prisma, {
    authSubject: input.authSubject,
    tenantId: input.tenantId,
    actionReason: "membership.invite",
    requestId: input.requestId
  }, async (tx, identity) => {
    assertMembershipAdministrator(identity);
    if (input.role === "OWNER" && identity.role !== "OWNER") throw new Error("OWNER_AUTHORITY_REQUIRED");
    const replay = await tx.membershipMutationReceipt.findUnique({
      where: { tenantId_idempotencyKey: { tenantId: identity.tenantId, idempotencyKey: input.idempotencyKey } }
    });
    if (replay) return receiptFromStored(replay, {
      action: "INVITE",
      actorId: identity.actorId,
      idempotencyKey: input.idempotencyKey,
      organizationId: identity.organizationId,
      requestFingerprint,
      tenantId: identity.tenantId
    });

    await tx.$queryRaw`
      SELECT set_config('app.phase202_auth_email',${normalizedEmail},true)
    `;
    const team = await tx.team.findUnique({ where: { tenantId: identity.tenantId } });
    if (!team || team.organizationId !== identity.organizationId) throw new Error("TENANT_NOT_FOUND");
    const existingUser = await tx.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
    if (existingUser) {
      const existingMembership = await tx.teamMember.findUnique({ where: { userId_teamId: { userId: existingUser.id, teamId: team.id } } });
      if (existingMembership?.status === "ACTIVE") throw new Error("MEMBERSHIP_ALREADY_ACTIVE");
    }

    const invitationId = randomUUID();
    const token = randomBytes(48).toString("base64url");
    const now = new Date();
    const notificationEvidenceId = randomUUID();
    const notification = await tx.notificationEvidence.create({
      data: {
        id: notificationEvidenceId,
        organizationId: identity.organizationId,
        tenantId: identity.tenantId,
        channel: "EMAIL",
        recipientHash: subjectEmailHash,
        templateId: "phase202-membership-invitation-v1",
        status: "PENDING",
        occurredAt: now
      }
    });
    const invitation = await tx.membershipInvitation.create({
      data: {
        id: invitationId,
        organizationId: identity.organizationId,
        tenantId: identity.tenantId,
        email: normalizedEmail,
        role: input.role,
        tokenHash: keyedHash("membership-invitation", token),
        idempotencyKey: input.idempotencyKey,
        invitedByActorId: identity.actorId,
        notificationEvidenceId: notification.id,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    });
    await enqueueMembershipEmail(tx, identity, {
      notificationEvidenceId: notification.id,
      occurredAt: now,
      command: {
        action: null,
        kind: "INVITATION",
        organizationName: team.name,
        role: input.role,
        schemaVersion: 1,
        to: normalizedEmail,
        token
      }
    });
    const result = receipt(identity, team, {
      action: "INVITE",
      id: invitation.id,
      idempotencyKey: input.idempotencyKey,
      notificationEvidenceId: notification.id,
      occurredAt: now,
      priorVersion: 0,
      resultingVersion: 1,
      requestId: input.requestId,
      subjectEmailHash: existingUser ? null : subjectEmailHash,
      subjectUserId: existingUser?.id ?? null
    }, input.authSubject);
    await tx.membershipMutationReceipt.create({
      data: {
        id: invitation.id,
        organizationId: identity.organizationId,
        tenantId: identity.tenantId,
        actorId: identity.actorId,
        subjectUserId: existingUser?.id ?? null,
        subjectEmailHash: existingUser ? null : subjectEmailHash,
        action: "INVITE",
        priorVersion: 0,
        resultingVersion: 1,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint,
        requestId: input.requestId,
        notificationEvidenceId: notification.id,
        resultPayload: result as unknown as Prisma.InputJsonValue
      }
    });
    return result;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function acceptInvitationInBoundSession(
  tx: Prisma.TransactionClient,
  identity: VerifiedTenantIdentity & { invitationId: string; teamId: string },
  input: { authSubject: string; idempotencyKey: string; requestId: string }
) {
    const tenantId = identity.tenantId;
    const requestFingerprint = membershipRequestFingerprint(["ACCEPT", identity.invitationId, input.authSubject]);
    const replay = await tx.membershipMutationReceipt.findUnique({ where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: input.idempotencyKey } } });
    if (replay) return receiptFromStored(replay, {
      action: "ACCEPT",
      actorId: identity.actorId,
      idempotencyKey: input.idempotencyKey,
      organizationId: identity.organizationId,
      requestFingerprint,
      tenantId
    });
    const acceptedReplay = await tx.membershipMutationReceipt.findFirst({
      where: {
        tenantId,
        action: "ACCEPT",
        resultPayload: { path: ["transition_id"], equals: identity.invitationId }
      }
    });
    if (acceptedReplay) return receiptFromStored(acceptedReplay, {
      action: "ACCEPT",
      actorId: identity.actorId,
      organizationId: identity.organizationId,
      requestFingerprint,
      tenantId
    });
    const user = await tx.user.findUnique({ where: { id: input.authSubject } });
    const now = new Date();
    if (!user) throw new Error("INVALID_OR_EXPIRED_INVITATION");
    const versionRows = await tx.$queryRaw<Array<{ priorVersion: number; resultingVersion: number }>>`
      SELECT * FROM entral.phase202_accept_invitation_membership(${identity.invitationId}::uuid,${user.id})
    `;
    const versions = versionRows[0];
    if (!versions || versions.resultingVersion !== versions.priorVersion + 1) {
      throw new Error("MEMBERSHIP_VERSION_TRANSITION_INVALID");
    }
    const priorVersion = versions.priorVersion;
    const team = await tx.team.findUnique({ where: { id: identity.teamId } });
    const invitation = await tx.membershipInvitation.findUnique({ where: { id: identity.invitationId } });
    if (!team || !invitation) throw new Error("INVALID_OR_EXPIRED_INVITATION");
    if (invitation.status !== "PENDING") throw new Error("ACCEPTED_INVITATION_RECEIPT_MISSING");
    const notification = await tx.notificationEvidence.create({ data: { organizationId: team.organizationId, tenantId, channel: "IN_APP", recipientHash: keyedHash("membership-email", user.email), templateId: "phase202-membership-accepted-v1", status: "RECORDED", occurredAt: now } });
    const result = receipt(identity, team, { action: "ACCEPT", id: invitation.id, idempotencyKey: input.idempotencyKey, notificationEvidenceId: notification.id, occurredAt: now, priorVersion, resultingVersion: versions.resultingVersion, requestId: input.requestId, subjectEmailHash: null, subjectUserId: user.id }, input.authSubject);
    await tx.membershipMutationReceipt.create({ data: { organizationId: team.organizationId, tenantId, actorId: identity.actorId, subjectUserId: user.id, subjectEmailHash: null, action: "ACCEPT", priorVersion, resultingVersion: versions.resultingVersion, idempotencyKey: input.idempotencyKey, requestFingerprint, requestId: input.requestId, notificationEvidenceId: notification.id, resultPayload: result as unknown as Prisma.InputJsonValue } });
    await tx.membershipInvitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED", acceptedAt: now } });
    return result;
}

export async function acceptInvitation(input: { authSubject: string; idempotencyKey: string; requestId: string; token: string }) {
  const tokenHash = hashMembershipInvitationToken(input.token);
  return withInvitationSession(prisma, {
    authSubject: input.authSubject,
    tokenHash,
    actionReason: "membership.invitation.accept",
    requestId: input.requestId
  }, (tx, identity) => acceptInvitationInBoundSession(tx, identity, input), {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable
  });
}

export async function transitionMember(input: {
  action: LifecycleAction;
  authSubject: string;
  idempotencyKey: string;
  requestId: string;
  role?: MembershipRole;
  subjectUserId: string;
  tenantId: string;
}, database: PrismaClient = prisma) {
  if (!lifecycleActions.has(input.action)) throw new Error("MEMBERSHIP_ACTION_INVALID");
  if (input.action === "ROLE_CHANGE") {
    if (!isMembershipRole(input.role)) throw new Error("MEMBERSHIP_ROLE_REQUIRED");
  } else if (input.role !== undefined) {
    throw new Error("MEMBERSHIP_ROLE_NOT_APPLICABLE");
  }
  const requestFingerprint = membershipRequestFingerprint([input.action, input.subjectUserId, input.role ?? null]);
  return withTenantSession(database, { authSubject: input.authSubject, tenantId: input.tenantId, actionReason: `membership.${input.action.toLowerCase()}`, requestId: input.requestId }, async (tx, identity) => {
    assertMembershipAdministrator(identity);
    if (input.action === "ROLE_CHANGE" && input.role === "OWNER" && identity.role !== "OWNER") throw new Error("OWNER_AUTHORITY_REQUIRED");
    const replay = await tx.membershipMutationReceipt.findUnique({ where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey } } });
    if (replay) return receiptFromStored(replay, {
      action: input.action,
      actorId: identity.actorId,
      idempotencyKey: input.idempotencyKey,
      organizationId: identity.organizationId,
      requestFingerprint,
      tenantId: identity.tenantId
    });
    const team = await tx.team.findUnique({ where: { tenantId: input.tenantId } });
    if (!team || team.organizationId !== identity.organizationId) throw new Error("TENANT_NOT_FOUND");
    const target = await tx.teamMember.findUnique({ where: { userId_teamId: { userId: input.subjectUserId, teamId: team.id } } });
    if (!target || target.status === "REMOVED") throw new Error("MEMBERSHIP_NOT_FOUND");
    const targetProfiles = await tx.$queryRaw<Array<{ email: string; name: string; userId: string }>>`
      SELECT * FROM entral.phase202_resolve_membership_profile(${target.userId},${identity.tenantId}::uuid)
    `;
    const targetProfile = targetProfiles[0];
    if (!targetProfile || targetProfile.userId !== target.userId) throw new Error("MEMBERSHIP_PROFILE_NOT_FOUND");
    if (target.role === "OWNER" && identity.role !== "OWNER") throw new Error("OWNER_AUTHORITY_REQUIRED");
    const removesOwner = target.role === "OWNER" && (input.action !== "ROLE_CHANGE" || input.role !== "OWNER");
    if (removesOwner) {
      const activeOwners = await tx.teamMember.count({ where: { teamId: team.id, role: "OWNER", status: "ACTIVE" } });
      if (activeOwners <= 1) throw new Error("LAST_ACTIVE_OWNER_REQUIRED");
    }
    const now = new Date();
    const nextRole = input.action === "ROLE_CHANGE" ? input.role! : target.role;
    const nextStatus = input.action === "SUSPEND" ? "SUSPENDED" : input.action === "REMOVE" ? "REMOVED" : target.status;
    const notification = await tx.notificationEvidence.create({ data: { id: randomUUID(), organizationId: identity.organizationId, tenantId: identity.tenantId, channel: "EMAIL", recipientHash: keyedHash("membership-email", targetProfile.email), templateId: `phase202-membership-${input.action.toLowerCase()}-v1`, status: "PENDING", occurredAt: now } });
    const updatedMembership = await tx.teamMember.update({ where: { userId_teamId: { userId: target.userId, teamId: team.id } }, data: { role: nextRole, status: nextStatus, version: { increment: 1 }, suspendedAt: nextStatus === "SUSPENDED" ? now : null, removedAt: nextStatus === "REMOVED" ? now : null } });
    if (updatedMembership.version !== target.version + 1) throw new Error("MEMBERSHIP_VERSION_TRANSITION_INVALID");
    const targetActorRows = await tx.$queryRaw<Array<{ actorId: string | null }>>`
      SELECT entral.phase202_resolve_tenant_human_actor(${target.userId},${identity.tenantId}::uuid)::text AS "actorId"
    `;
    const targetActorId = targetActorRows[0]?.actorId;
    if (!targetActorId || targetActorId !== target.actorId) throw new Error("TARGET_ACTOR_NOT_FOUND");
    await tx.tenantActorAssignment.update({ where: { actorId_tenantId: { actorId: targetActorId, tenantId: identity.tenantId } }, data: { role: nextRole, status: nextStatus === "ACTIVE" ? "ACTIVE" : nextStatus === "SUSPENDED" ? "SUSPENDED" : "REVOKED", version: { increment: 1 } } });
    if (nextStatus !== "ACTIVE") {
      await tx.$queryRaw<Array<{ revokedCount: number }>>`
        SELECT entral.phase202_revoke_tenant_user_sessions(${target.userId},${identity.tenantId}::uuid,${`MEMBERSHIP_${nextStatus}`}) AS "revokedCount"
      `;
    }
    await enqueueMembershipEmail(tx, identity, {
      notificationEvidenceId: notification.id,
      occurredAt: now,
      command: {
        action: input.action === "ROLE_CHANGE" ? `role changed to ${nextRole}` : nextStatus.toLowerCase(),
        kind: "CHANGE",
        organizationName: team.name,
        role: null,
        schemaVersion: 1,
        to: targetProfile.email,
        token: null
      }
    });
    const result = receipt(identity, team, { action: input.action, id: notification.id, idempotencyKey: input.idempotencyKey, notificationEvidenceId: notification.id, occurredAt: now, priorVersion: target.version, resultingVersion: updatedMembership.version, requestId: input.requestId, subjectEmailHash: null, subjectUserId: target.userId }, input.authSubject);
    await tx.membershipMutationReceipt.create({ data: { organizationId: identity.organizationId, tenantId: identity.tenantId, actorId: identity.actorId, subjectUserId: target.userId, subjectEmailHash: null, action: input.action, priorVersion: target.version, resultingVersion: updatedMembership.version, idempotencyKey: input.idempotencyKey, requestFingerprint, requestId: input.requestId, notificationEvidenceId: notification.id, resultPayload: result as unknown as Prisma.InputJsonValue } });
    return result;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function listMemberships(authSubject: string, tenantId: string) {
  return withTenantSession(prisma, { authSubject, tenantId, actionReason: "membership.read", requestId: undefined }, async (tx, identity) => {
    const team = await tx.team.findUnique({ where: { tenantId: identity.tenantId } });
    if (!team) throw new Error("TENANT_NOT_FOUND");
    const rows = await tx.teamMember.findMany({ where: { teamId: team.id }, orderBy: [{ status: "asc" }, { joinedAt: "asc" }] });
    const profiles = new Map<string, { email: string; name: string }>();
    for (const row of rows) {
      const profileRows = await tx.$queryRaw<Array<{ email: string; name: string; userId: string }>>`
        SELECT * FROM entral.phase202_resolve_membership_profile(${row.userId},${identity.tenantId}::uuid)
      `;
      const profile = profileRows[0];
      if (!profile || profile.userId !== row.userId) throw new Error("MEMBERSHIP_PROFILE_NOT_FOUND");
      profiles.set(row.userId, profile);
    }
    return rows.map((row) => {
      const profile = profiles.get(row.userId)!;
      return { user_id: row.userId, email: profile.email, name: profile.name, role: row.role, status: row.status, version: row.version, joined_at: row.joinedAt.toISOString(), suspended_at: row.suspendedAt?.toISOString() ?? null, removed_at: row.removedAt?.toISOString() ?? null };
    });
  });
}
