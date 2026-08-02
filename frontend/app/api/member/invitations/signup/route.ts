import { isJsonContentType, readLimitedRequestBody, withoutBearerToken } from "../../../../../lib/member-login";
import { apiProxyBase, sanitizedForwardHeaders, sanitizedResponseHeaders } from "../../../../../lib/server-api-proxy";

export const dynamic = "force-dynamic";

type SignupBody = {
  email: string;
  invitation_token: string;
  name: string;
  password: string;
};

const allowedKeys = new Set(["email", "invitation_token", "name", "password"]);
const invitationTokenPattern = /^\S{32,256}$/;

function privateHeaders(requestId: string, source?: Headers) {
  const headers = source ? sanitizedResponseHeaders(source) : new Headers();
  headers.set("cache-control", "private, no-store");
  headers.set("referrer-policy", "no-referrer");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-request-id", source?.get("x-request-id") ?? requestId);
  return headers;
}

function parseSignupBody(body: Uint8Array): SignupBody | null {
  try {
    const value = JSON.parse(new TextDecoder().decode(body));
    if (!value || Array.isArray(value) || typeof value !== "object") return null;

    const input = value as Record<string, unknown>;
    if (Object.keys(input).some((key) => !allowedKeys.has(key))) return null;
    if (typeof input.name !== "string" || typeof input.email !== "string" || typeof input.password !== "string" || typeof input.invitation_token !== "string") return null;

    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const password = input.password;
    const invitationToken = input.invitation_token.trim();
    if (name.length < 2 || name.length > 80) return null;
    if (email.length < 3 || email.length > 320 || !email.includes("@")) return null;
    if (password.length < 8 || password.length > 128) return null;
    if (!invitationTokenPattern.test(invitationToken)) return null;

    return { email, invitation_token: invitationToken, name, password };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  if (!isJsonContentType(request.headers.get("content-type"))) {
    return Response.json(
      { error: "Unsupported Media Type", message: "Invitation signup accepts JSON requests only.", requestId },
      { headers: privateHeaders(requestId), status: 415 }
    );
  }

  const body = await readLimitedRequestBody(request);
  if (!body) {
    return Response.json(
      { error: "Payload Too Large", message: "Invitation signup request is too large.", requestId },
      { headers: privateHeaders(requestId), status: 413 }
    );
  }

  const input = parseSignupBody(body);
  if (!input) {
    return Response.json(
      { error: "Bad Request", message: "Invitation signup requires valid account details and an invitation token.", requestId },
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
  headers.delete("cookie");
  headers.delete("referer");
  headers.set("content-type", "application/json");
  headers.set("x-request-id", requestId);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v1/signup`, {
      body: JSON.stringify({
        email: input.email,
        invitationToken: input.invitation_token,
        name: input.name,
        next: "/member/dashboard",
        password: input.password
      }),
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
