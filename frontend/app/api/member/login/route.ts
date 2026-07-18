import { apiProxyBase, missingApiProxyResponse, sanitizedForwardHeaders, sanitizedResponseHeaders } from "../../../../lib/server-api-proxy";
import { isJsonContentType, memberScopedLoginBody, readLimitedRequestBody, withoutBearerToken } from "../../../../lib/member-login";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const baseUrl = apiProxyBase();
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  if (!isJsonContentType(request.headers.get("content-type"))) {
    return Response.json(
      { error: "Unsupported Media Type", message: "Member sign in accepts JSON requests only.", requestId },
      { headers: { "cache-control": "private, no-store", "x-request-id": requestId }, status: 415 }
    );
  }

  const body = await readLimitedRequestBody(request);
  if (!body) {
    return Response.json(
      { error: "Payload Too Large", message: "Member sign in request is too large.", requestId },
      { headers: { "cache-control": "private, no-store", "x-request-id": requestId }, status: 413 }
    );
  }

  const memberBody = memberScopedLoginBody(body);
  if (!memberBody) {
    return Response.json(
      { error: "Bad Request", message: "Member sign in requires a valid JSON object.", requestId },
      { headers: { "cache-control": "private, no-store", "x-request-id": requestId }, status: 400 }
    );
  }

  if (!baseUrl) {
    return missingApiProxyResponse();
  }

  const headers = sanitizedForwardHeaders(request);
  headers.set("x-request-id", requestId);

  let response: Response;

  try {
    response = await fetch(`${baseUrl}/api/v1/login`, {
      body: memberBody,
      cache: "no-store",
      headers,
      method: "POST",
      redirect: "manual"
    });
  } catch {
    return Response.json(
      {
        error: "Member Sign In Unavailable",
        message: "Entral could not reach the member service.",
        requestId
      },
      {
        headers: {
          "cache-control": "private, no-store",
          "x-request-id": requestId
        },
        status: 502
      }
    );
  }

  const payload = await response.json().catch(() => null);
  const responseHeaders = sanitizedResponseHeaders(response.headers);
  responseHeaders.set("cache-control", "private, no-store");
  responseHeaders.set("x-request-id", response.headers.get("x-request-id") ?? requestId);

  return Response.json(withoutBearerToken(payload), {
    headers: responseHeaders,
    status: response.status
  });
}
