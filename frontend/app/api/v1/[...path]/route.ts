import { apiProxyBase, missingApiProxyResponse, sanitizedForwardHeaders, sanitizedResponseHeaders } from "../../../../lib/server-api-proxy";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

export const dynamic = "force-dynamic";

async function proxyRequest(request: Request, context: RouteContext) {
  const baseUrl = apiProxyBase();

  if (!baseUrl) {
    return missingApiProxyResponse();
  }

  const params = await context.params;
  const path = (params.path ?? []).map((segment) => encodeURIComponent(segment)).join("/");
  const sourceUrl = new URL(request.url);
  const targetUrl = `${baseUrl}/api/v1/${path}${sourceUrl.search}`;
  const headers = sanitizedForwardHeaders(request);

  const response = await fetch(targetUrl, {
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
    cache: "no-store",
    headers,
    method: request.method,
    redirect: "manual"
  });

  const responseHeaders = sanitizedResponseHeaders(response.headers);

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
