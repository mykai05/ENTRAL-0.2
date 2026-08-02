import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { env, isProduction } from "./env.js";
import { bindSupportGrantContext, prisma, withPersonalSession } from "./db.js";

export type AuthUser = {
  sub: string;
  email: string;
  role: "USER" | "ADMIN";
  session: "internal" | "member" | "support";
  sessionVersion: number;
  tokenVersion: 1 | 2;
  sessionId: string | null;
  tokenId: string | null;
  actorId: string | null;
  organizationId: string | null;
  tenantId: string | null;
  supportGrantId: string | null;
  stepUpAt: string | null;
};

type SignableAuthUser = Omit<AuthUser, "session" | "sessionVersion" | "tokenVersion" | "stepUpAt" | "sessionId" | "tokenId" | "actorId" | "organizationId" | "tenantId" | "supportGrantId"> & {
  session?: AuthUser["session"];
  sessionVersion?: number;
  sessionId?: string | null;
  tokenId?: string | null;
  actorId?: string | null;
  organizationId?: string | null;
  tenantId?: string | null;
  supportGrantId?: string | null;
};

const sessionAudiences = {
  internal: "entral-internal",
  member: "entral-member",
  support: "entral-support"
} as const;

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProduction,
  path: "/",
  maxAge: env.ACCESS_TOKEN_TTL_SECONDS
};

export const refreshCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: isProduction,
  path: "/",
  maxAge: 60 * 60 * 24 * env.REFRESH_TOKEN_TTL_DAYS
};

export function signAuthToken(user: SignableAuthUser) {
  const session = user.session ?? "internal";
  const sessionVersion = user.sessionVersion ?? 0;
  if (!Number.isSafeInteger(sessionVersion) || sessionVersion < 0) {
    throw new Error("Invalid session version");
  }

  const durable = Boolean(user.sessionId && user.tokenId && user.actorId);
  if (!durable && isProduction) {
    throw new Error("Production access tokens require a durable server session.");
  }
  if (session === "support" && (!durable || !user.organizationId || !user.tenantId || !user.supportGrantId)) {
    throw new Error("Support access tokens require an exact durable grant scope.");
  }
  if (session !== "support" && user.supportGrantId) {
    throw new Error("Support grant scope is accepted only for support sessions.");
  }

  return jwt.sign({
    sub: user.sub,
    email: user.email,
    role: user.role,
    session,
    sv: sessionVersion,
    ver: durable ? 2 : 1,
    sid: user.sessionId ?? undefined,
    jti: user.tokenId ?? undefined,
    aid: user.actorId ?? undefined,
    oid: user.organizationId ?? undefined,
    tid: user.tenantId ?? undefined,
    sgid: user.supportGrantId ?? undefined
  }, env.JWT_SECRET, {
    algorithm: "HS256",
    audience: sessionAudiences[session],
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS
  });
}

export function verifyAuthToken(token: string): AuthUser {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (!payload || typeof payload === "string") {
    throw new Error("Invalid auth token");
  }

  if (payload.session !== "member" && payload.session !== "internal" && payload.session !== "support") {
    throw new Error("Invalid session scope");
  }

  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const session: AuthUser["session"] = payload.session;
  if (!audience.includes(sessionAudiences[session])) {
    throw new Error("Invalid session audience");
  }

  if (!Number.isSafeInteger(payload.sv) || Number(payload.sv) < 0) {
    throw new Error("Invalid session version");
  }

  const tokenVersion = payload.ver === 2 ? 2 : 1;
  if (tokenVersion !== 2 && isProduction) throw new Error("Legacy session tokens are not accepted in production");
  if (tokenVersion === 2 && (!payload.sid || !payload.jti || !payload.aid)) {
    throw new Error("Durable session token is incomplete");
  }
  if (session === "support" && (tokenVersion !== 2 || !payload.oid || !payload.tid || !payload.sgid)) {
    throw new Error("Support session token is incomplete");
  }
  if (session !== "support" && payload.sgid) {
    throw new Error("Invalid support grant scope");
  }

  return {
    sub: String(payload.sub),
    email: String(payload.email),
    role: payload.role === "ADMIN" ? "ADMIN" : "USER",
    session,
    sessionVersion: Number(payload.sv),
    tokenVersion,
    sessionId: payload.sid ? String(payload.sid) : null,
    tokenId: payload.jti ? String(payload.jti) : null,
    actorId: payload.aid ? String(payload.aid) : null,
    organizationId: payload.oid ? String(payload.oid) : null,
    tenantId: payload.tid ? String(payload.tid) : null,
    supportGrantId: payload.sgid ? String(payload.sgid) : null,
    stepUpAt: null
  };
}

export function setAuthCookie(reply: FastifyReply, token: string) {
  reply.setCookie(env.COOKIE_NAME, token, cookieOptions);
}

export function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(env.REFRESH_COOKIE_NAME, token, refreshCookieOptions);
}

export function setSessionCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  setAuthCookie(reply, accessToken);
  setRefreshCookie(reply, refreshToken);
}

export function clearAuthCookie(reply: FastifyReply) {
  reply.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isProduction
  });
  reply.clearCookie(env.REFRESH_COOKIE_NAME, {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
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
      .some((part) => {
        const cookie = part.trim();
        return cookie.startsWith(`${env.COOKIE_NAME}=`) || cookie.startsWith(`${env.REFRESH_COOKIE_NAME}=`);
      });

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

  let tokenUser: AuthUser;
  try {
    tokenUser = verifyAuthToken(token);
  } catch {
    return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
  }

  try {
    const accountState = await withPersonalSession(prisma, {
      authSubject: tokenUser.sub,
      actionReason: "auth.account-state.validate",
      requestId: request.id
    }, (transaction) => transaction.user.findUnique({
      select: { deletedAt: true, sessionVersion: true },
      where: { id: tokenUser.sub }
    }));
    if (!accountState || accountState.deletedAt || accountState.sessionVersion !== tokenUser.sessionVersion) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }
    if (tokenUser.tokenVersion === 1) {
      request.user = tokenUser;
      return;
    }

    const durable = await withPersonalSession(prisma, {
      authSubject: tokenUser.sub,
      actionReason: "auth.session.validate",
      requestId: request.id
    }, async (transaction, identity) => {
      let boundSupport = null;
      if (tokenUser.session === "support") {
        if (!tokenUser.supportGrantId || !tokenUser.tenantId || !tokenUser.organizationId) return null;
        try {
          boundSupport = await bindSupportGrantContext(transaction, {
            actionReason: "auth.support-session.validate",
            authSubject: tokenUser.sub,
            requestId: request.id,
            supportGrantId: tokenUser.supportGrantId
          });
        } catch (error) {
          if (error instanceof Error && [
            "ACTIVE_HUMAN_ACTOR_REQUIRED",
            "ACTIVE_SUPPORT_GRANT_REQUIRED"
          ].includes(error.message)) return null;
          throw error;
        }
      }
      const [currentUser, durableSession] = await Promise.all([
        transaction.user.findUnique({ select: { deletedAt: true, sessionVersion: true }, where: { id: tokenUser.sub } }),
        tokenUser.sessionId ? transaction.authSession.findUnique({ where: { id: tokenUser.sessionId } }) : Promise.resolve(null)
      ]);
      if (!currentUser || currentUser.deletedAt || currentUser.sessionVersion !== tokenUser.sessionVersion) return null;
      if (!durableSession || durableSession.userId !== tokenUser.sub || identity.actorId !== tokenUser.actorId
        || durableSession.actorId !== tokenUser.actorId || durableSession.accessTokenId !== tokenUser.tokenId
        || durableSession.sessionType.toLowerCase() !== tokenUser.session
        || durableSession.revokedAt || durableSession.expiresAt.getTime() <= Date.now()) return null;
      if (durableSession.sessionType === "MEMBER") {
        if (!durableSession.tenantId || !durableSession.organizationId
          || durableSession.supportGrantId || tokenUser.supportGrantId
          || tokenUser.tenantId !== durableSession.tenantId
          || tokenUser.organizationId !== durableSession.organizationId) return null;
        const assignment = await transaction.$queryRaw<Array<{ organizationId: string; tenantId: string }>>`
          SELECT "organizationId"::text AS "organizationId","tenantId"::text AS "tenantId"
          FROM entral.phase202_resolve_tenant_assignment(
            ${identity.actorId}::uuid,${durableSession.tenantId}::uuid,${identity.appUserId}::uuid
          )
        `;
        if (assignment[0]?.organizationId !== durableSession.organizationId
          || assignment[0]?.tenantId !== durableSession.tenantId) return null;
      } else if (durableSession.sessionType === "SUPPORT") {
        if (!durableSession.tenantId || !durableSession.organizationId || !durableSession.supportGrantId
          || tokenUser.tenantId !== durableSession.tenantId
          || tokenUser.organizationId !== durableSession.organizationId
          || tokenUser.supportGrantId !== durableSession.supportGrantId) return null;
        if (!boundSupport || boundSupport.actorId !== durableSession.actorId
          || boundSupport.tenantId !== durableSession.tenantId
          || boundSupport.organizationId !== durableSession.organizationId
          || boundSupport.supportGrantId !== durableSession.supportGrantId
          || boundSupport.grantExpiresAt.getTime() <= Date.now()) return null;
      } else if (durableSession.tenantId || durableSession.organizationId || durableSession.supportGrantId
        || tokenUser.tenantId || tokenUser.organizationId || tokenUser.supportGrantId) {
        return null;
      }
      await transaction.authSession.update({ where: { id: durableSession.id }, data: { lastUsedAt: new Date() } });
      return durableSession;
    });

    if (!durable) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }
    tokenUser.stepUpAt = durable.stepUpAt?.toISOString() ?? null;

    request.user = tokenUser;
  } catch (error) {
    request.log.error({ error }, "session store unavailable");
    return reply.code(503).send({
      contract_version: "1.0.0",
      schema_version: 1,
      status: "BLOCKED",
      dependency: "SESSION_STORE",
      reason_code: "SESSION_STORE_UNAVAILABLE",
      retryable: true,
      occurred_at: new Date().toISOString()
    });
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
  "/api/v1/password-reset/confirm",
  "/api/v1/refresh",
  "/api/v1/account",
  "/api/v1/account/export"
]);

const supportSessionAllowedPaths = new Set([
  "/health",
  "/api/v1/health",
  "/api/v1/login",
  "/api/v1/logout",
  "/api/v1/refresh",
  "/api/v1/identity/support-session"
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

  const pathname = new URL(request.url, "http://entral.invalid").pathname;
  if (user.session === "support") {
    if (supportSessionAllowedPaths.has(pathname)
      || pathname === "/api/v1/identity/support-session/tasks"
      || pathname.startsWith("/api/v1/identity/support-session/tasks/")) return;
    return reply.code(403).send({
      error: "Forbidden",
      message: "This support session can access only its exact-grant readback and scoped operation surfaces."
    });
  }

  if (user.session !== "member") return;

  if (pathname === "/api/v1/member" || pathname.startsWith("/api/v1/member/") || pathname.startsWith("/api/v1/identity/") || memberSessionAllowedPaths.has(pathname)) {
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

  const user = await withPersonalSession(prisma, {
    authSubject: currentUser.sub,
    actionReason: "auth.admin-role.verify",
    requestId: request.id
  }, (transaction) => transaction.user.findUnique({
    where: { id: currentUser.sub },
    select: { role: true }
  }));

  if (!user || user.role !== "ADMIN") {
    return reply.code(403).send({ error: "Forbidden", message: "Admin access is required." });
  }

  if (currentUser.tokenVersion !== 2) {
    return reply.code(403).send({ error: "Forbidden", message: "A durable session with recent MFA step-up is required." });
  }

  const stepUpAt = currentUser.stepUpAt ? Date.parse(currentUser.stepUpAt) : Number.NaN;
  const now = Date.now();
  const recentStepUp = Number.isFinite(stepUpAt)
    && stepUpAt <= now
    && now - stepUpAt <= env.MFA_STEP_UP_TTL_SECONDS * 1000;
  if (!recentStepUp) {
    return reply.code(403).send({ error: "Forbidden", message: "Recent MFA step-up is required." });
  }

  const activeMfaFactor = await withPersonalSession(prisma, {
    authSubject: currentUser.sub,
    actionReason: "auth.admin.mfa.verify",
    requestId: request.id
  }, (transaction) => transaction.mfaFactor.count({
    where: { userId: currentUser.sub, status: "ACTIVE" }
  }));
  if (activeMfaFactor < 1) {
    return reply.code(403).send({ error: "Forbidden", message: "An active MFA factor is required." });
  }

  request.user = {
    ...currentUser,
    role: "ADMIN"
  };
}
