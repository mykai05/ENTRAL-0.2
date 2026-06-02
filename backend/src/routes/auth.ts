import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { clearAuthCookie, requireAuth, setAuthCookie, signAuthToken } from "../auth.js";
import { createUserWithTeam, normalizeUserRole, publicUser } from "../services/users.js";
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

export async function authRoutes(app: FastifyInstance) {
  app.post("/signup", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const input = signupSchema.parse(request.body);

    try {
      const { user, team } = await createUserWithTeam(input);
      await issueEmailVerification(user, { requestId: request.id });

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
        message: "Account created. Verify your email before signing in to the ENTRAL command center."
      });
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_TAKEN") {
        return reply.code(409).send({ error: "Conflict", message: "An account already exists for this email." });
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
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    const passwordMatches = user ? await bcrypt.compare(input.password, user.passwordHash) : false;

    if (!user || !passwordMatches) {
      return reply.code(401).send({ error: "Unauthorized", message: "Email or password is incorrect." });
    }

    if (!user.emailVerifiedAt) {
      return reply.code(403).send({
        error: "Forbidden",
        message: "Verify your email before signing in. Check your inbox or request a new verification email."
      });
    }

    const token = signAuthToken({ sub: user.id, email: user.email, role: normalizeUserRole(user.role) });
    setAuthCookie(reply, token);

    return reply.send({ token, user: publicUser(user) });
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
    await requestEmailVerification(input.email, { requestId: request.id });

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

    return reply.send({
      message: "Email verified. You can now sign in.",
      user: publicUser(result.user)
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
    await requestPasswordReset(input.email, { requestId: request.id });

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

    clearAuthCookie(reply);

    return reply.send({
      message: "Password reset. Sign in with your new password.",
      user: publicUser(result.user)
    });
  });

  app.post("/logout", async (_request, reply) => {
    clearAuthCookie(reply);
    return reply.send({ ok: true });
  });

  app.get("/me", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.sub },
      include: {
        memberships: {
          include: {
            team: true
          }
        }
      }
    });

    if (!user) {
      clearAuthCookie(reply);
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    return reply.send({
      user: publicUser(user),
      teams: user.memberships.map((membership) => ({
        id: membership.team.id,
        name: membership.team.name,
        slug: membership.team.slug,
        role: membership.role
      }))
    });
  });
}
