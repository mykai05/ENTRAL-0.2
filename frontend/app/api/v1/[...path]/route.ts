import { apiProxyBase, missingApiProxyResponse, sanitizedForwardHeaders, sanitizedResponseHeaders } from "../../../../lib/server-api-proxy";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

export const dynamic = "force-dynamic";

async function proxyRequest(request: Request, context: RouteContext) {
  const baseUrl = apiProxyBase();
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  if (!baseUrl) {
    return missingApiProxyResponse();
  }

  const params = await context.params;
  const path = (params.path ?? []).map((segment) => encodeURIComponent(segment)).join("/");
  const sourceUrl = new URL(request.url);
  const targetUrl = `${baseUrl}/api/v1/${path}${sourceUrl.search}`;
  const headers = sanitizedForwardHeaders(request);
  headers.set("x-request-id", requestId);

  let response: Response;

  try {
    response = await fetch(targetUrl, {
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      headers,
      method: request.method,
      redirect: "manual"
    });
  } catch (error) {
    return Response.json(
      {
        error: "API Proxy Error",
        message: "ENTRAL could not reach the backend. Real account actions may be temporarily unavailable.",
        requestId,
        upstream: error instanceof Error ? error.message : "Unknown proxy failure"
      },
      {
        headers: { "x-request-id": requestId },
        status: 502
      }
    );
  }

  const responseHeaders = sanitizedResponseHeaders(response.headers);
  responseHeaders.set("x-request-id", response.headers.get("x-request-id") ?? requestId);

  return new Response(response.body, {
    headers: responseHeaders,
    status: response.status,
    statusText: response.statusText
  });
}

export function GET(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

export function HEAD(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

export function POST(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

export function PUT(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

export function PATCH(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

export function DELETE(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

export function OPTIONS(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}
