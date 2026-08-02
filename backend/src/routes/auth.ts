import type { FastifyInstance } from "fastify";
import type { User } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma, withPersonalSession, withPreAuthEmailSession, withTenantSession } from "../db.js";
import { clearAuthCookie, requireAdmin, requireAuth, setAuthCookie, setPrivateNoStoreHeaders, setSessionCookies, signAuthToken, verifyAuthToken } from "../auth.js";
import { env } from "../env.js";
import { createInvitedUserWithMembership, createUserWithTeam, normalizeUserRole, publicUser } from "../services/users.js";
import {
  confirmEmailVerificationSchema,
  confirmPasswordResetSchema,
  loginSchema,
  requestEmailVerificationSchema,
  requestPasswordResetSchema,
  signupSchema
} from "../schemas.js";
import {
  confirmEmailVerification,
  confirmPasswordReset,
  issueEmailVerification,
  requestEmailVerification,
  requestPasswordReset
} from "../services/authRecovery.js";
import {
  durableSessionsAvailable,
  issueDurableSession,
  revokeSessionForLogout,
  revokeSessionByRefreshCredential,
  rotateRefreshCredential
} from "../services/phase202SessionBroker.js";

async function authorizedMemberTenants(
  userId: string,
  requestedTenantId?: string
) {
  const memberships = await withPersonalSession(prisma, {
    authSubject: userId,
    actionReason: "auth.membership.discover"
  }, (transaction) => transaction.teamMember.findMany({
    where: {
      userId,
      status: "ACTIVE",
      ...(requestedTenantId ? { tenantId: requestedTenantId } : {})
    },
    select: { organizationId: true, role: true, teamId: true, tenantId: true }
  }));
  const tenants = [];
  for (const membership of memberships) {
    if (!membership.tenantId || !membership.organizationId) continue;
    const tenant = await withTenantSession(prisma, {
      authSubject: userId,
      tenantId: membership.tenantId,
      actionReason: "auth.membership.verify"
    }, async (transaction, identity) => {
      const team = await transaction.team.findUnique({
        where: { id: membership.teamId },
        select: { id: true, memberAccessEnabled: true, name: true, organizationId: true, slug: true, tenantId: true }
      });
      if (!team?.memberAccessEnabled || team.tenantId !== identity.tenantId
        || team.organizationId !== identity.organizationId) return null;
      return { organizationId: team.organizationId, role: membership.role, teamId: team.id, tenantId: team.tenantId, name: team.name, slug: team.slug };
    });
    if (tenant) tenants.push(tenant);
  }
  return tenants;
}

async function authorizedSessionForUser(
  user: { id: string; internalAccess: boolean },
  requestedFlow: "internal" | "member" | "support",
  requestedTenantId?: string,
  requestedSupportGrantId?: string
) {
  if (requestedFlow === "internal" && user.internalAccess) {
    return { session: "internal" as const, tenantId: undefined, supportGrantId: undefined, tenants: [] };
  }
  if (requestedFlow === "support" && requestedSupportGrantId) {
    return { session: "support" as const, tenantId: undefined, supportGrantId: requestedSupportGrantId, tenants: [] };
  }
  const tenants = await authorizedMemberTenants(user.id, requestedTenantId);
  if (tenants.length !== 1) return { session: null, tenantId: undefined, supportGrantId: undefined, tenants };
  return { session: "member" as const, tenantId: tenants[0]!.tenantId, supportGrantId: undefined, tenants };
}

type SessionUser = {
  id: string;
  email: string;
  role: User["role"];
  sessionVersion: number;
};

async function establishSession(
  user: SessionUser,
  session: "internal" | "member" | "support",
  request: { id: string; ip: string; headers: { "user-agent"?: string } },
  reply: Parameters<typeof setAuthCookie>[0],
  requestedTenantId?: string,
  supportGrantId?: string
) {
  if (durableSessionsAvailable()) {
    const issued = await issueDurableSession(user, session, {
      requestId: request.id,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      requestedTenantId,
      supportGrantId
    });
    setSessionCookies(reply, issued.accessToken, issued.refreshToken);
    return;
  }

  if (session === "support") throw new Error("SESSION_STORE_UNAVAILABLE");

  setAuthCookie(reply, signAuthToken({
    sub: user.id,
    email: user.email,
    role: normalizeUserRole(user.role),
    session,
    sessionVersion: user.sessionVersion
  }));
}

export async function authRoutes(app: FastifyInstance) {
  app.addHook("onRequest", (_request, reply, done) => {
    setPrivateNoStoreHeaders(reply);
    done();
  });

  app.post("/signup", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const input = signupSchema.parse(request.body);
    const { invitationToken, next, ...userInput } = input;

    try {
      if (invitationToken) {
        const { membership, team, user } = await createInvitedUserWithMembership({
          ...userInput,
          invitationToken
        }, request.id);
        await issueEmailVerification(user, {
          flow: "member",
          next,
          requestId: request.id
        });
        return reply.code(201).send({
          id: user.id,
          email: user.email,
          user: publicUser(user),
          team: { id: team.id, name: team.name, slug: team.slug },
          membership,
          invitationAccepted: true,
          verificationRequired: true,
          message: "Invitation accepted. Verify your email before signing in to Entral."
        });
      }
      await requireAdmin(request, reply);
      if (reply.sent) return;
      const { user, team } = await createUserWithTeam(userInput);
      await issueEmailVerification(user, {
        flow: "member",
        next,
        requestId: request.id
      });

      return reply.code(201).send({
        id: user.id,
        email: user.email,
        user: publicUser(user),
        team: {
          id: team.id,
          name: team.name,
          slug: team.slug
        },
        verificationRequired: true,
        message: "Account created. Verify your email before signing in to Entral."
      });
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_TAKEN") {
        return reply.code(409).send({ error: "Conflict", message: "An account already exists for this email." });
      }
      if (error instanceof Error && [
        "INVALID_OR_EXPIRED_INVITATION",
        "Invalid or expired invitation"
      ].includes(error.message)) {
        return reply.code(400).send({ error: "Bad Request", message: "This membership invitation is invalid or expired." });
      }

      throw error;
    }
  });

  app.post("/login", {
    config: {
      rateLimit: {
        max: 15,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const user = await withPreAuthEmailSession(prisma, {
      actionReason: "auth.login.lookup",
      email: input.email,
      requestId: request.id
    }, (transaction) => transaction.user.findUnique({ where: { email: input.email } }));
    const passwordMatches = user && !user.deletedAt ? await bcrypt.compare(input.password, user.passwordHash) : false;

    if (!user || !passwordMatches) {
      return reply.code(401).send({ error: "Unauthorized", message: "Email or password is incorrect." });
    }

    if (!user.emailVerifiedAt) {
      return reply.code(403).send({
        error: "Forbidden",
        message: "Verify your email before signing in. Check your inbox or request a new verification email."
      });
    }

    if (input.flow === "internal" && !user.internalAccess) {
      return reply.code(403).send({
        error: "Forbidden",
        message: "This account is not authorized for the internal Entral command center."
      });
    }

    const authorization = await authorizedSessionForUser(user, input.flow, input.tenantId, input.supportGrantId);
    if (!authorization.session) {
      if (authorization.tenants.length > 1 && !input.tenantId) {
        return reply.code(409).send({
          error: "Tenant Selection Required",
          message: "Choose the tenant for this durable member session.",
          reason_code: "TENANT_SELECTION_REQUIRED",
          tenants: authorization.tenants.map((tenant) => ({
            organization_id: tenant.organizationId,
            team_id: tenant.teamId,
            tenant_id: tenant.tenantId,
            name: tenant.name
          }))
        });
      }
      return reply.code(403).send({
        error: "Forbidden",
        message: "This account is not assigned to a provisioned member organization."
      });
    }

    try {
      await establishSession(
        user,
        authorization.session,
        request,
        reply,
        authorization.tenantId,
        authorization.supportGrantId
      );
    } catch (error) {
      if (error instanceof Error && [
        "ACTIVE_HUMAN_ACTOR_REQUIRED",
        "ACTIVE_SUPPORT_GRANT_REQUIRED",
        "SUPPORT_GRANT_REQUIRED",
        "SUPPORT_GRANT_SCOPE_INVALID"
      ].includes(error.message)) {
        clearAuthCookie(reply);
        return reply.code(403).send({
          error: "Forbidden",
          message: "The requested support grant is inactive or is not assigned to this account.",
          reason_code: "ACTIVE_SUPPORT_GRANT_REQUIRED"
        });
      }
      if (error instanceof Error && error.message === "SESSION_STORE_UNAVAILABLE") {
        clearAuthCookie(reply);
        return reply.code(503).send({
          error: "Service Unavailable",
          message: "The session authority is temporarily unavailable.",
          reason_code: "SESSION_STORE_UNAVAILABLE"
        });
      }
      throw error;
    }

    return reply.send({ user: publicUser(user) });
  });

  app.post("/email-verification/request", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "10 minutes"
      }
    }
  }, async (request, reply) => {
    const input = requestEmailVerificationSchema.parse(request.body);
    await requestEmailVerification(input.email, {
      flow: input.flow,
      next: input.next,
      requestId: request.id
    });

    return reply.send({
      message: "If this email belongs to an unverified ENTRAL account, a verification link has been sent."
    });
  });

  app.post("/email-verification/confirm", {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: "10 minutes"
      }
    }
  }, async (request, reply) => {
    const input = confirmEmailVerificationSchema.parse(request.body);
    const result = await confirmEmailVerification(input.token, { requestId: request.id });

    if (!result.ok) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "This verification link is invalid or expired. Request a new verification email."
      });
    }

    const user = publicUser(result.user);
    const authorization = await authorizedSessionForUser(result.user, result.flow);
    if (authorization.session) {
      await establishSession(result.user, authorization.session, request, reply, authorization.tenantId);
    } else {
      clearAuthCookie(reply);
    }

    return reply.send({
      message: authorization.session === "internal"
        ? "Email verified. You can now enter the ENTRAL command center."
        : authorization.session === "member"
          ? "Email verified. You can now sign in to Entral."
          : "Email verified. Member access has not been provisioned for this account.",
      user
    });
  });

  app.post("/password-reset/request", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "10 minutes"
      }
    }
  }, async (request, reply) => {
    const input = requestPasswordResetSchema.parse(request.body);
    await requestPasswordReset(input.email, { flow: input.flow, requestId: request.id });

    return reply.send({
      message: "If this email belongs to an ENTRAL account, a password reset link has been sent."
    });
  });

  app.post("/password-reset/confirm", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "10 minutes"
      }
    }
  }, async (request, reply) => {
    const input = confirmPasswordResetSchema.parse(request.body);
    const result = await confirmPasswordReset(input.token, input.password, { requestId: request.id });

    if (!result.ok) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "This password reset link is invalid or expired. Request a new reset link."
      });
    }

    const user = publicUser(result.user);
    const authorization = await authorizedSessionForUser(result.user, result.flow);
    if (authorization.session) {
      await establishSession(result.user, authorization.session, request, reply, authorization.tenantId);
    } else {
      clearAuthCookie(reply);
    }

    return reply.send({
      message: authorization.session === "internal"
        ? "Password reset. You can now enter the ENTRAL command center."
        : authorization.session === "member"
          ? "Password reset. You can now sign in to Entral."
          : "Password reset. Member access has not been provisioned for this account.",
      user
    });
  });

  app.post("/refresh", {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const refreshToken = request.cookies[env.REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      clearAuthCookie(reply);
      return reply.code(401).send({ error: "Unauthorized", message: "A valid refresh credential is required." });
    }

    try {
      const issued = await rotateRefreshCredential(refreshToken, {
        requestId: request.id,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"]
      });
      setSessionCookies(reply, issued.accessToken, issued.refreshToken);
      return reply.send({ ok: true });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      if (["INVALID_REFRESH_CREDENTIAL", "REFRESH_REPLAY_DETECTED", "REFRESH_CREDENTIAL_EXPIRED"].includes(reason)) {
        clearAuthCookie(reply);
        return reply.code(401).send({ error: "Unauthorized", message: "The refresh credential is invalid or expired." });
      }
      request.log.error({ error }, "refresh session authority unavailable");
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "The session authority is temporarily unavailable.",
        reason_code: "SESSION_STORE_UNAVAILABLE"
      });
    }
  });

  app.post("/logout", async (request, reply) => {
    const accessToken = request.cookies[env.COOKIE_NAME];
    const refreshToken = request.cookies[env.REFRESH_COOKIE_NAME];
    let revoked = false;
    let durableStoreConfirmed = false;
    let durableStoreFailed = false;
    if (refreshToken) {
      try {
        revoked = await revokeSessionByRefreshCredential(refreshToken, request.id, "USER_LOGOUT");
        durableStoreConfirmed = true;
      } catch (error) {
        durableStoreFailed = true;
        request.log.warn({ error }, "refresh-backed logout revocation failed");
      }
    }
    if (!revoked && accessToken) {
      try {
        const current = verifyAuthToken(accessToken);
        if (current.tokenVersion === 2 && current.sessionId) {
          try {
            await revokeSessionForLogout(current.sub, current.sessionId, request.id, "USER_LOGOUT");
            durableStoreConfirmed = true;
            durableStoreFailed = false;
          } catch (error) {
            durableStoreFailed = true;
            request.log.warn({ error }, "access-backed logout revocation failed");
          }
        }
      } catch {
        // Logout remains idempotent when the access token is absent, expired, or invalid.
      }
    }
    clearAuthCookie(reply);
    if (durableStoreFailed && !durableStoreConfirmed) {
      return reply.code(503).send({
        contract_version: "1.0.0",
        schema_version: 1,
        status: "BLOCKED",
        dependency: "SESSION_STORE",
        reason_code: "SESSION_REVOCATION_UNCONFIRMED",
        retryable: true,
        occurred_at: new Date().toISOString()
      });
    }
    return reply.send({ ok: true });
  });

  app.get("/me", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const user = await withPersonalSession(prisma, {
      actionReason: "auth.me.read",
      authSubject: currentUser.sub,
      requestId: request.id
    }, (transaction) => transaction.user.findUnique({ where: { id: currentUser.sub } }));

    if (!user || user.deletedAt) {
      clearAuthCookie(reply);
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const tenantRows = await authorizedMemberTenants(currentUser.sub, currentUser.session === "member" ? currentUser.tenantId ?? undefined : undefined);
    if (currentUser.session === "member" && (
      !currentUser.tenantId || !currentUser.organizationId || tenantRows.length !== 1
      || tenantRows[0]!.tenantId !== currentUser.tenantId
      || tenantRows[0]!.organizationId !== currentUser.organizationId
    )) {
      clearAuthCookie(reply);
      return reply.code(401).send({ error: "Unauthorized", message: "The tenant session is no longer active." });
    }
    return reply.send({
      user: publicUser(user),
      teams: tenantRows.map((tenant) => ({
        id: tenant.teamId,
        name: tenant.name,
        role: tenant.role,
        slug: tenant.slug,
        tenantId: tenant.tenantId,
        organizationId: tenant.organizationId
      }))
    });
  });
}
