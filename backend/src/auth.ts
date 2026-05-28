import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { env, isProduction } from "./env.js";
import { prisma } from "./db.js";

export type AuthUser = {
  sub: string;
  email: string;
  role: "USER" | "ADMIN";
};

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProduction,
  path: "/",
  maxAge: 60 * 60 * 24 * 7
};

export function signAuthToken(user: AuthUser) {
  return jwt.sign(user, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "7d"
  });
}

export function verifyAuthToken(token: string): AuthUser {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (!payload || typeof payload === "string") {
    throw new Error("Invalid auth token");
  }

  return {
    sub: String(payload.sub),
    email: String(payload.email),
    role: payload.role === "ADMIN" ? "ADMIN" : "USER"
  };
}

export function setAuthCookie(reply: FastifyReply, token: string) {
  reply.setCookie(env.COOKIE_NAME, token, cookieOptions);
}

export function clearAuthCookie(reply: FastifyReply) {
  reply.clearCookie(env.COOKIE_NAME, { path: "/" });
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const cookieToken = request.cookies[env.COOKIE_NAME];
  const authorization = request.headers.authorization;
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  const token = cookieToken ?? bearerToken;

  if (!token) {
    return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
  }

  try {
    request.user = verifyAuthToken(token);
  } catch {
    return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);

  if (reply.sent) {
    return;
  }

  const currentUser = request.user;

  if (!currentUser) {
    return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.sub },
    select: { role: true }
  });

  if (!user || user.role !== "ADMIN") {
    return reply.code(403).send({ error: "Forbidden", message: "Admin access is required." });
  }

  if (env.ADMIN_MFA_CODE) {
    const submittedCode = request.headers["x-admin-mfa-code"];
    const code = Array.isArray(submittedCode) ? submittedCode[0] : submittedCode;

    if (code !== env.ADMIN_MFA_CODE) {
      return reply.code(403).send({ error: "Forbidden", message: "Admin verification is required." });
    }
  }

  request.user = {
    ...currentUser,
    role: "ADMIN"
  };
}
