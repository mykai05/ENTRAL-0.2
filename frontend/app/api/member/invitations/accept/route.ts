import { isJsonContentType, readLimitedRequestBody, withoutBearerToken } from "../../../../../lib/member-login";
import { apiProxyBase, sanitizedForwardHeaders, sanitizedResponseHeaders } from "../../../../../lib/server-api-proxy";

export const dynamic = "force-dynamic";

type AcceptanceBody = {
  idempotency_key: string;
  token: string;
};

const allowedKeys = new Set(["idempotency_key", "token"]);
const invitationTokenPattern = /^\S{32,256}$/;

function privateHeaders(requestId: string, source?: Headers) {
  const headers = source ? sanitizedResponseHeaders(source) : new Headers();
  headers.set("cache-control", "private, no-store");
  headers.set("referrer-policy", "no-referrer");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-request-id", source?.get("x-request-id") ?? requestId);
  return headers;
}

function parseAcceptanceBody(body: Uint8Array): AcceptanceBody | null {
  try {
    const value = JSON.parse(new TextDecoder().decode(body));
    if (!value || Array.isArray(value) || typeof value !== "object") return null;

    const input = value as Record<string, unknown>;
    if (Object.keys(input).some((key) => !allowedKeys.has(key))) return null;
    if (typeof input.idempotency_key !== "string" || typeof input.token !== "string") return null;

    const idempotencyKey = input.idempotency_key.trim();
    const token = input.token.trim();
    if (idempotencyKey.length < 12 || idempotencyKey.length > 255) return null;
    if (!invitationTokenPattern.test(token)) return null;

    return { idempotency_key: idempotencyKey, token };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  if (!isJsonContentType(request.headers.get("content-type"))) {
    return Response.json(
      { error: "Unsupported Media Type", message: "Invitation acceptance accepts JSON requests only.", requestId },
      { headers: privateHeaders(requestId), status: 415 }
    );
  }

  const body = await readLimitedRequestBody(request);
  if (!body) {
    return Response.json(
      { error: "Payload Too Large", message: "Invitation acceptance request is too large.", requestId },
      { headers: privateHeaders(requestId), status: 413 }
    );
  }

  const input = parseAcceptanceBody(body);
  if (!input) {
    return Response.json(
      { error: "Bad Request", message: "Invitation acceptance requires a valid token and idempotency key.", requestId },
      { headers: privateHeaders(requestId), status: 400 }
    );
  }

  const baseUrl = apiProxyBase();
  if (!baseUrl) {
    return Response.json(
      { error: "API proxy is not configured.", message: "The invitation service is unavailable.", requestId },
      { headers: privateHeaders(requestId), status: 503 }
    );
  }

  const headers = sanitizedForwardHeaders(request);
  headers.delete("authorization");
  headers.delete("referer");
  headers.set("content-type", "application/json");
  headers.set("x-request-id", requestId);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v1/identity/memberships/invitations/accept`, {
      body: JSON.stringify(input),
      cache: "no-store",
      headers,
      method: "POST",
      redirect: "manual"
    });
  } catch {
    return Response.json(
      { error: "Invitation Service Unavailable", message: "Entral could not reach the invitation service.", requestId },
      { headers: privateHeaders(requestId), status: 502 }
    );
  }

  const payload = await response.json().catch(() => null);
  return Response.json(withoutBearerToken(payload), {
    headers: privateHeaders(requestId, response.headers),
    status: response.status
  });
}
