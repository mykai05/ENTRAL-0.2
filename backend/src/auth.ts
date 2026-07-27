import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { env, isProduction } from "./env.js";
import { prisma } from "./db.js";

export type AuthUser = {
  sub: string;
  email: string;
  role: "USER" | "ADMIN";
  session: "internal" | "member";
  sessionVersion: number;
};

type SignableAuthUser = Omit<AuthUser, "session" | "sessionVersion"> & {
  session?: AuthUser["session"];
  sessionVersion?: number;
};

const sessionAudiences = {
  internal: "entral-internal",
  member: "entral-member"
} as const;

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProduction,
  path: "/",
  maxAge: 60 * 60 * 24 * 7
};

export function signAuthToken(user: SignableAuthUser) {
  const session = user.session ?? "internal";
  const sessionVersion = user.sessionVersion ?? 0;
  if (!Number.isSafeInteger(sessionVersion) || sessionVersion < 0) {
    throw new Error("Invalid session version");
  }

  return jwt.sign({ ...user, session, sessionVersion: undefined, sv: sessionVersion }, env.JWT_SECRET, {
    algorithm: "HS256",
    audience: sessionAudiences[session],
    expiresIn: "7d"
  });
}

export function verifyAuthToken(token: string): AuthUser {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (!payload || typeof payload === "string") {
    throw new Error("Invalid auth token");
  }

  if (payload.session !== "member" && payload.session !== "internal") {
    throw new Error("Invalid session scope");
  }

  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const session: AuthUser["session"] = payload.session === "member" ? "member" : "internal";
  if (!audience.includes(sessionAudiences[session])) {
    throw new Error("Invalid session audience");
  }

  if (!Number.isSafeInteger(payload.sv) || Number(payload.sv) < 0) {
    throw new Error("Invalid session version");
  }

  return {
    sub: String(payload.sub),
    email: String(payload.email),
    role: payload.role === "ADMIN" ? "ADMIN" : "USER",
    session,
    sessionVersion: Number(payload.sv)
  };
}

export function setAuthCookie(reply: FastifyReply, token: string) {
  reply.setCookie(env.COOKIE_NAME, token, cookieOptions);
}

export function clearAuthCookie(reply: FastifyReply) {
  reply.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isProduction
  });
}

export function setPrivateNoStoreHeaders(reply: FastifyReply) {
  reply.header("cache-control", "private, no-store");
  reply.header("vary", "Origin, Cookie, Authorization");
}

function normalizedOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export async function requireTrustedOrigin(request: FastifyRequest, reply: FastifyReply) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return;
  }

  const fetchSite = request.headers["sec-fetch-site"];
  const fetchSiteValue = Array.isArray(fetchSite) ? fetchSite[0] : fetchSite;

  if (fetchSiteValue === "cross-site") {
    return reply.code(403).send({ error: "Forbidden", message: "Cross-site requests are not allowed." });
  }

  const originHeader = request.headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;

  // Non-browser clients do not consistently send Origin. Their existing bearer
  // token behavior remains supported. A cookie-authenticated mutation without
  // Origin must carry same-origin Fetch Metadata instead of relying on the
  // cookie alone.
  if (!origin) {
    const cookieHeader = request.headers.cookie ?? "";
    const hasSessionCookie = cookieHeader
      .split(";")
      .some((part) => part.trim().startsWith(`${env.COOKIE_NAME}=`));

    if (hasSessionCookie && fetchSiteValue !== "same-origin") {
      return reply.code(403).send({ error: "Forbidden", message: "Request origin could not be verified." });
    }

    return;
  }

  const allowedOrigins = new Set(
    [env.APP_PUBLIC_URL, env.CORS_ORIGIN]
      .map(normalizedOrigin)
      .filter((value): value is string => Boolean(value))
  );

  const normalizedRequestOrigin = normalizedOrigin(origin);

  if (!normalizedRequestOrigin || !allowedOrigins.has(normalizedRequestOrigin)) {
    return reply.code(403).send({ error: "Forbidden", message: "Request origin is not allowed." });
  }
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
    const tokenUser = verifyAuthToken(token);
    const currentUser = await prisma.user.findUnique({
      select: { sessionVersion: true },
      where: { id: tokenUser.sub }
    });

    if (!currentUser || currentUser.sessionVersion !== tokenUser.sessionVersion) {
      throw new Error("Session has been revoked");
    }

    request.user = tokenUser;
  } catch {
    return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
  }
}

const memberSessionAllowedPaths = new Set([
  "/health",
  "/api/v1/health",
  "/api/v1/login",
  "/api/v1/logout",
  "/api/v1/email-verification/request",
  "/api/v1/email-verification/confirm",
  "/api/v1/password-reset/request",
  "/api/v1/password-reset/confirm"
]);

export async function enforceSessionBoundary(request: FastifyRequest, reply: FastifyReply) {
  const cookieToken = request.cookies[env.COOKIE_NAME];
  const authorization = request.headers.authorization;
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  const token = cookieToken ?? bearerToken;

  if (!token) {
    return;
  }

  let user: AuthUser;
  try {
    user = verifyAuthToken(token);
  } catch {
    return;
  }

  if (user.session !== "member") {
    return;
  }

  const pathname = new URL(request.url, "http://entral.invalid").pathname;
  if (pathname === "/api/v1/member" || pathname.startsWith("/api/v1/member/") || memberSessionAllowedPaths.has(pathname)) {
    return;
  }

  return reply.code(403).send({
    error: "Forbidden",
    message: "This member session cannot access internal Entral operations."
  });
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

  if (currentUser.session !== "internal") {
    return reply.code(403).send({ error: "Forbidden", message: "Internal access is required." });
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
