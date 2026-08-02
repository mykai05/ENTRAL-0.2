import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { randomBytes, randomUUID } from "node:crypto";
import { prisma, withInvitedSignupSession, withPreAuthEmailSession, withTenantSession } from "../db.js";
import type { SignupInput } from "../schemas.js";
import {
  acceptInvitationInBoundSession,
  hashMembershipInvitationToken
} from "./phase202Membership.js";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function normalizeUserRole(role: string): "USER" | "ADMIN" {
  return role === "ADMIN" ? "ADMIN" : "USER";
}

export function capitalizeDisplayName(name: string) {
  const trimmed = name.trim().replace(/\s+/g, " ");

  if (!trimmed) {
    return trimmed;
  }

  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

export function publicUser(user: { emailVerifiedAt?: Date | null; id: string; name: string; email: string; role: string }) {
  return {
    id: user.id,
    name: capitalizeDisplayName(user.name),
    email: user.email,
    role: normalizeUserRole(user.role),
    emailVerified: Boolean(user.emailVerifiedAt)
  };
}

export async function createUserWithTeam(input: SignupInput) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const displayName = capitalizeDisplayName(input.name);
  const organizationId = randomUUID();
  const tenantId = randomUUID();
  const actorId = randomUUID();
  const userId = `c${randomBytes(12).toString("hex")}`;
  const teamId = `c${randomBytes(12).toString("hex")}`;
  const teamName = `${displayName}'s Team`;
  const teamSlug = `${slugify(displayName) || "team"}-${userId.slice(-6)}`;

  try {
    await withPreAuthEmailSession(prisma, {
      actionReason: "tenant.owner.provision",
      email: input.email
    }, (transaction, preAuth) => transaction.$queryRaw`
        SELECT * FROM entral.phase202_provision_tenant_owner(
          ${userId},${displayName},${preAuth.email},${passwordHash},
          ${teamId},${teamName},${teamSlug},${organizationId}::uuid,${tenantId}::uuid,${actorId}::uuid
        )
      `);
    return await withTenantSession(prisma, {
      authSubject: userId,
      tenantId,
      actionReason: "tenant.owner.provision.readback"
    }, async (transaction) => {
      const [user, team] = await Promise.all([
        transaction.user.findUniqueOrThrow({ where: { id: userId } }),
        transaction.team.findUniqueOrThrow({ where: { id: teamId } })
      ]);
      return { user, team };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("EMAIL_TAKEN");
    }

    throw error;
  }
}

export async function createInvitedUserWithMembership(
  input: SignupInput & { invitationToken: string },
  requestId: string
) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const displayName = capitalizeDisplayName(input.name);
  const tokenHash = hashMembershipInvitationToken(input.invitationToken);
  const candidateUserId = `c${randomBytes(12).toString("hex")}`;
  const candidateActorId = randomUUID();
  try {
    return await withInvitedSignupSession(prisma, {
      actorId: candidateActorId,
      email: input.email,
      name: displayName,
      passwordHash,
      requestId,
      tokenHash,
      userId: candidateUserId
    }, async (transaction, identity) => {
      const membership = await acceptInvitationInBoundSession(transaction, identity, {
        authSubject: identity.authSubject,
        idempotencyKey: `invited-signup:${tokenHash}`,
        requestId
      });
      const user = await transaction.user.findUniqueOrThrow({ where: { id: identity.authSubject } });
      const team = await transaction.team.findUniqueOrThrow({ where: { id: identity.teamId } });
      return { membership, team, user };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (
      error.code === "P2002"
      || (error.code === "P2010" && String(error.meta?.code) === "23505")
    )) {
      throw new Error("EMAIL_TAKEN");
    }
    throw error;
  }
}
