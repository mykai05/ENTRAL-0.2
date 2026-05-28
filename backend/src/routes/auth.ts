import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { clearAuthCookie, requireAuth, setAuthCookie, signAuthToken } from "../auth.js";
import { createUserWithTeam, normalizeUserRole, publicUser } from "../services/users.js";
import { loginSchema, signupSchema } from "../schemas.js";

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
      const token = signAuthToken({ sub: user.id, email: user.email, role: normalizeUserRole(user.role) });
      setAuthCookie(reply, token);

      return reply.code(201).send({
        id: user.id,
        email: user.email,
        user: publicUser(user),
        team: {
          id: team.id,
          name: team.name,
          slug: team.slug
        }
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

    const token = signAuthToken({ sub: user.id, email: user.email, role: normalizeUserRole(user.role) });
    setAuthCookie(reply, token);

    return reply.send({ token, user: publicUser(user) });
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
