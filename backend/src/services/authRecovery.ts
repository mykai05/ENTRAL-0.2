import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { createAuthToken, dateHoursFromNow, hashAuthToken, hashForAudit, hasTokenExpired } from "./authTokens.js";
import { recordAuditLog } from "./audit.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./authEmails.js";

const emailVerificationExpiryHours = 24;
const passwordResetExpiryHours = 1;

type AuthRouteContext = {
  requestId?: string;
};

type AuthUserRecord = {
  email: string;
  emailVerifiedAt?: Date | null;
  id: string;
  name: string;
};

function emailAuditMetadata(email: string) {
  return {
    emailHash: hashForAudit(email)
  };
}

export async function issueEmailVerification(user: AuthUserRecord, context: AuthRouteContext = {}) {
  if (user.emailVerifiedAt) {
    return { alreadyVerified: true };
  }

  const now = new Date();
  const { token, tokenHash } = createAuthToken();

  await prisma.emailVerificationToken.updateMany({
    data: { consumedAt: now },
    where: {
      consumedAt: null,
      userId: user.id
    }
  });

  await prisma.emailVerificationToken.create({
    data: {
      expiresAt: dateHoursFromNow(emailVerificationExpiryHours),
      tokenHash,
      userId: user.id
    }
  });

  try {
    const delivery = await sendVerificationEmail({
      name: user.name,
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

export async function requestEmailVerification(email: string, context: AuthRouteContext = {}) {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
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
  const verificationToken = await prisma.emailVerificationToken.findUnique({
    include: { user: true },
    where: { tokenHash }
  });

  if (!verificationToken || verificationToken.consumedAt || hasTokenExpired(verificationToken.expiresAt)) {
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

  const user = await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.update({
      data: { consumedAt: now },
      where: { id: verificationToken.id }
    });

    return tx.user.update({
      data: {
        emailVerifiedAt: verificationToken.user.emailVerifiedAt ?? now
      },
      where: { id: verificationToken.userId }
    });
  });

  await recordAuditLog({
    action: "auth.email_verification.confirmed",
    actorUserId: user.id,
    metadata: emailAuditMetadata(user.email),
    requestId: context.requestId,
    targetId: user.id,
    targetType: "User"
  });

  return { ok: true as const, user };
}

export async function requestPasswordReset(email: string, context: AuthRouteContext = {}) {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
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

  await prisma.passwordResetToken.updateMany({
    data: { consumedAt: now },
    where: {
      consumedAt: null,
      userId: user.id
    }
  });

  await prisma.passwordResetToken.create({
    data: {
      expiresAt: dateHoursFromNow(passwordResetExpiryHours),
      tokenHash,
      userId: user.id
    }
  });

  try {
    const delivery = await sendPasswordResetEmail({
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
  const passwordResetToken = await prisma.passwordResetToken.findUnique({
    include: { user: true },
    where: { tokenHash }
  });

  if (!passwordResetToken || passwordResetToken.consumedAt || hasTokenExpired(passwordResetToken.expiresAt)) {
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

  const user = await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      data: { consumedAt: now },
      where: {
        consumedAt: null,
        userId: passwordResetToken.userId
      }
    });

    return tx.user.update({
      data: {
        emailVerifiedAt: passwordResetToken.user.emailVerifiedAt ?? now,
        passwordHash
      },
      where: { id: passwordResetToken.userId }
    });
  });

  await recordAuditLog({
    action: "auth.password_reset.confirmed",
    actorUserId: user.id,
    metadata: emailAuditMetadata(user.email),
    requestId: context.requestId,
    targetId: user.id,
    targetType: "User"
  });

  return { ok: true as const, user };
}
