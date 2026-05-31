import { NextResponse } from "next/server";

const localApiBaseUrl = "http://127.0.0.1:4000";

const hopByHopHeaders = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "expect",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

export function apiProxyBase(environment = process.env.NODE_ENV, proxyUrl = process.env.API_PROXY_URL) {
  const configured = proxyUrl?.trim().replace(/\/+$/, "") ?? "";

  if (configured) {
    return configured;
  }

  return environment === "production" ? "" : localApiBaseUrl;
}

export function missingApiProxyResponse() {
  return NextResponse.json(
    {
      error: "API proxy is not configured.",
      message: "Set API_PROXY_URL to the Railway backend URL."
    },
    { status: 503 }
  );
}

export function sanitizedForwardHeaders(request: Request) {
  const headers = new Headers(request.headers);

  for (const header of Array.from(headers.keys())) {
    if (hopByHopHeaders.has(header.toLowerCase())) {
      headers.delete(header);
    }
  }

  return headers;
}

export function sanitizedResponseHeaders(headers: Headers) {
  const nextHeaders = new Headers(headers);

  for (const header of Array.from(nextHeaders.keys())) {
    if (hopByHopHeaders.has(header.toLowerCase())) {
      nextHeaders.delete(header);
    }
  }

  return nextHeaders;
}
