import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma, withPreAuthEmailSession, withRecoveryTokenSession } from "../db.js";
import { createAuthToken, dateHoursFromNow, hashAuthToken, hashForAudit, hasTokenExpired } from "./authTokens.js";
import { recordAuditLog } from "./audit.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./authEmails.js";

const emailVerificationExpiryHours = 24;
const passwordResetExpiryHours = 1;

type AuthRouteContext = {
  flow?: "internal" | "member";
  requestId?: string;
};

type EmailVerificationRouteContext = AuthRouteContext & {
  next?: string;
};

type AuthUserRecord = {
  email: string;
  emailVerifiedAt?: Date | null;
  id: string;
  internalAccess?: boolean;
  name: string;
};

function authFlow(context: AuthRouteContext) {
  return context.flow === "member" ? "member" : "internal";
}

function emailAuditMetadata(email: string) {
  return {
    emailHash: hashForAudit(email)
  };
}

async function bindRecoveryUserMutation(transaction: Prisma.TransactionClient, userId: string) {
  await transaction.$executeRaw`SELECT entral.bind_authenticated_app_user(${userId})`;
  await transaction.$executeRaw`
    SELECT set_config(
      'app.phase202_actor_id',
      entral.phase202_resolve_human_actor(${userId})::text,
      true
    )
  `;
}

export async function issueEmailVerification(user: AuthUserRecord, context: EmailVerificationRouteContext = {}) {
  if (user.emailVerifiedAt) {
    return { alreadyVerified: true };
  }

  const now = new Date();
  const { token, tokenHash } = createAuthToken();

  await withPreAuthEmailSession(prisma, {
    actionReason: "auth.email-verification.issue",
    email: user.email,
    requestId: context.requestId
  }, async (transaction, identity) => {
    if (identity.userId !== user.id) throw new Error("AUTH_EMAIL_SUBJECT_MISMATCH");
    await transaction.emailVerificationToken.updateMany({
      data: { consumedAt: now },
      where: { consumedAt: null, userId: user.id }
    });
    await transaction.emailVerificationToken.create({
      data: {
        expiresAt: dateHoursFromNow(emailVerificationExpiryHours),
        flow: authFlow(context),
        tokenHash,
        userId: user.id
      }
    });
  });

  try {
    const delivery = await sendVerificationEmail({
      flow: context.flow,
      name: user.name,
      next: context.next,
      to: user.email,
      token
    });

    await recordAuditLog({
      action: "auth.email_verification.sent",
      actorUserId: user.id,
      metadata: {
        ...emailAuditMetadata(user.email),
        provider: delivery.provider,
        queued: delivery.queued
      },
      requestId: context.requestId,
      targetId: user.id,
      targetType: "User"
    });

    return { alreadyVerified: false, delivery };
  } catch (error) {
    await recordAuditLog({
      action: "auth.email_verification.delivery_failed",
      actorUserId: user.id,
      metadata: {
        ...emailAuditMetadata(user.email),
        error: error instanceof Error ? error.message : String(error)
      },
      outcome: "failure",
      requestId: context.requestId,
      severity: "high",
      targetId: user.id,
      targetType: "User"
    });

    throw error;
  }
}

export async function requestEmailVerification(email: string, context: EmailVerificationRouteContext = {}) {
  const user = await withPreAuthEmailSession(prisma, {
    actionReason: "auth.email-verification.request",
    email,
    requestId: context.requestId
  }, (transaction) => transaction.user.findUnique({ where: { email } }));

  if (!user || user.deletedAt || (authFlow(context) === "internal" && user.internalAccess !== true)) {
    await recordAuditLog({
      action: "auth.email_verification.requested",
      metadata: emailAuditMetadata(email),
      requestId: context.requestId,
      targetType: "User"
    });

    return { ok: true };
  }

  await issueEmailVerification(user, context);
  return { ok: true };
}

export async function confirmEmailVerification(token: string, context: AuthRouteContext = {}) {
  const tokenHash = hashAuthToken(token);
  const verificationToken = await withRecoveryTokenSession(prisma, {
    actionReason: "auth.email-verification.lookup",
    requestId: context.requestId,
    tokenHash,
    tokenKind: "EMAIL_VERIFICATION"
  }, (transaction) => transaction.emailVerificationToken.findUnique({
    include: { user: true },
    where: { tokenHash }
  }));

  if (!verificationToken || verificationToken.user.deletedAt
    || verificationToken.consumedAt || hasTokenExpired(verificationToken.expiresAt)) {
    await recordAuditLog({
      action: "auth.email_verification.confirm_failed",
      metadata: { tokenHash: hashForAudit(tokenHash) },
      outcome: "failure",
      requestId: context.requestId,
      severity: "medium",
      targetType: "EmailVerificationToken"
    });

    return { ok: false as const, reason: "invalid" as const };
  }

  const now = new Date();

  const user = await withRecoveryTokenSession(prisma, {
    actionReason: "auth.email-verification.confirm",
    requestId: context.requestId,
    tokenHash,
    tokenKind: "EMAIL_VERIFICATION"
  }, async (tx) => {
    const claim = await tx.emailVerificationToken.updateMany({
      data: { consumedAt: now },
      where: {
        consumedAt: null,
        expiresAt: { gt: now },
        id: verificationToken.id,
        tokenHash
      }
    });
    if (claim.count !== 1) return null;

    await bindRecoveryUserMutation(tx, verificationToken.userId);

    return tx.user.update({
      data: {
        emailVerifiedAt: verificationToken.user.emailVerifiedAt ?? now
      },
      where: { id: verificationToken.userId }
    });
  });

  if (!user) {
    await recordAuditLog({
      action: "auth.email_verification.confirm_failed",
      metadata: { tokenHash: hashForAudit(tokenHash) },
      outcome: "failure",
      requestId: context.requestId,
      severity: "medium",
      targetType: "EmailVerificationToken"
    });
    return { ok: false as const, reason: "invalid" as const };
  }

  await recordAuditLog({
    action: "auth.email_verification.confirmed",
    actorUserId: user.id,
    metadata: emailAuditMetadata(user.email),
    requestId: context.requestId,
    targetId: user.id,
    targetType: "User"
  });

  return {
    flow: verificationToken.flow === "member" ? "member" as const : "internal" as const,
    ok: true as const,
    user
  };
}

export async function requestPasswordReset(email: string, context: AuthRouteContext = {}) {
  const user = await withPreAuthEmailSession(prisma, {
    actionReason: "auth.password-reset.request",
    email,
    requestId: context.requestId
  }, (transaction) => transaction.user.findUnique({ where: { email } }));

  if (!user || user.deletedAt || (authFlow(context) === "internal" && user.internalAccess !== true)) {
    await recordAuditLog({
      action: "auth.password_reset.requested",
      metadata: emailAuditMetadata(email),
      requestId: context.requestId,
      targetType: "User"
    });

    return { ok: true };
  }

  const now = new Date();
  const { token, tokenHash } = createAuthToken();

  await withPreAuthEmailSession(prisma, {
    actionReason: "auth.password-reset.issue",
    email: user.email,
    requestId: context.requestId
  }, async (transaction, identity) => {
    if (identity.userId !== user.id) throw new Error("AUTH_EMAIL_SUBJECT_MISMATCH");
    await transaction.passwordResetToken.updateMany({
      data: { consumedAt: now },
      where: { consumedAt: null, userId: user.id }
    });
    await transaction.passwordResetToken.create({
      data: {
        expiresAt: dateHoursFromNow(passwordResetExpiryHours),
        flow: authFlow(context),
        tokenHash,
        userId: user.id
      }
    });
  });

  try {
    const delivery = await sendPasswordResetEmail({
      flow: context.flow,
      name: user.name,
      to: user.email,
      token
    });

    await recordAuditLog({
      action: "auth.password_reset.sent",
      actorUserId: user.id,
      metadata: {
        ...emailAuditMetadata(email),
        provider: delivery.provider,
        queued: delivery.queued
      },
      requestId: context.requestId,
      targetId: user.id,
      targetType: "User"
    });

    return { ok: true };
  } catch (error) {
    await recordAuditLog({
      action: "auth.password_reset.delivery_failed",
      actorUserId: user.id,
      metadata: {
        ...emailAuditMetadata(email),
        error: error instanceof Error ? error.message : String(error)
      },
      outcome: "failure",
      requestId: context.requestId,
      severity: "high",
      targetId: user.id,
      targetType: "User"
    });

    throw error;
  }
}

export async function confirmPasswordReset(token: string, password: string, context: AuthRouteContext = {}) {
  const tokenHash = hashAuthToken(token);
  const passwordResetToken = await withRecoveryTokenSession(prisma, {
    actionReason: "auth.password-reset.lookup",
    requestId: context.requestId,
    tokenHash,
    tokenKind: "PASSWORD_RESET"
  }, (transaction) => transaction.passwordResetToken.findUnique({
    include: { user: true },
    where: { tokenHash }
  }));

  if (!passwordResetToken || passwordResetToken.user.deletedAt
    || passwordResetToken.consumedAt || hasTokenExpired(passwordResetToken.expiresAt)) {
    await recordAuditLog({
      action: "auth.password_reset.confirm_failed",
      metadata: { tokenHash: hashForAudit(tokenHash) },
      outcome: "failure",
      requestId: context.requestId,
      severity: "medium",
      targetType: "PasswordResetToken"
    });

    return { ok: false as const, reason: "invalid" as const };
  }

  const now = new Date();
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await withRecoveryTokenSession(prisma, {
    actionReason: "auth.password-reset.confirm",
    requestId: context.requestId,
    tokenHash,
    tokenKind: "PASSWORD_RESET"
  }, async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${passwordResetToken.userId}, 0))`;

    const claim = await tx.passwordResetToken.updateMany({
      data: { consumedAt: now },
      where: {
        consumedAt: null,
        expiresAt: { gt: now },
        id: passwordResetToken.id,
        tokenHash
      }
    });

    if (claim.count !== 1) {
      return null;
    }

    await bindRecoveryUserMutation(tx, passwordResetToken.userId);

    // A successful claim invalidates every sibling reset link for this user.
    // The per-user transaction lock prevents two different valid links from
    // resetting the account concurrently.
    await tx.passwordResetToken.updateMany({
      data: { consumedAt: now },
      where: {
        consumedAt: null,
        userId: passwordResetToken.userId
      }
    });

    await tx.$queryRaw<Array<{ revokedCount: number }>>`
      SELECT entral.phase202_revoke_password_reset_sessions(
        ${passwordResetToken.id},${passwordResetToken.userId},${tokenHash}
      ) AS "revokedCount"
    `;

    return tx.user.update({
      data: {
        emailVerifiedAt: passwordResetToken.user.emailVerifiedAt ?? now,
        passwordHash,
        sessionVersion: { increment: 1 }
      },
      where: { id: passwordResetToken.userId }
    });
  });

  if (!user) {
    await recordAuditLog({
      action: "auth.password_reset.confirm_failed",
      metadata: { tokenHash: hashForAudit(tokenHash) },
      outcome: "failure",
      requestId: context.requestId,
      severity: "medium",
      targetType: "PasswordResetToken"
    });

    return { ok: false as const, reason: "invalid" as const };
  }

  await recordAuditLog({
    action: "auth.password_reset.confirmed",
    actorUserId: user.id,
    metadata: emailAuditMetadata(user.email),
    requestId: context.requestId,
    targetId: user.id,
    targetType: "User"
  });

  return {
    flow: passwordResetToken.flow === "member" ? "member" as const : "internal" as const,
    ok: true as const,
    user
  };
}
