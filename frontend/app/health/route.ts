import { NextResponse } from "next/server";
import { apiProxyBase, sanitizedResponseHeaders } from "../../lib/server-api-proxy";

export const dynamic = "force-dynamic";

function responseRequestId(request: Request) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

export async function GET(request: Request) {
  const baseUrl = apiProxyBase();
  const requestId = responseRequestId(request);
  const timestamp = new Date().toISOString();

  if (!baseUrl) {
    return NextResponse.json(
      {
        backend: {
          configured: false,
          ok: false,
          status: null
        },
        frontend: {
          ok: true,
          service: "entral-frontend",
          timestamp
        },
        ok: false,
        requestId
      },
      {
        headers: { "x-request-id": requestId },
        status: 503
      }
    );
  }

  try {
    const response = await fetch(`${baseUrl}/health`, {
      cache: "no-store",
      method: "GET"
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);

    return NextResponse.json(
      {
        backend: {
          configured: true,
          ok: response.ok,
          status: response.status,
          upstream: payload
        },
        frontend: {
          ok: true,
          service: "entral-frontend",
          timestamp
        },
        ok: response.ok,
        requestId
      },
      {
        headers: {
          ...Object.fromEntries(sanitizedResponseHeaders(response.headers).entries()),
          "x-request-id": requestId
        },
        status: response.ok ? 200 : 502
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        backend: {
          configured: true,
          error: error instanceof Error ? error.message : "Unknown backend health error.",
          ok: false,
          status: null
        },
        frontend: {
          ok: true,
          service: "entral-frontend",
          timestamp
        },
        ok: false,
        requestId
      },
      {
        headers: { "x-request-id": requestId },
        status: 502
      }
    );
  }
}
