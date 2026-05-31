import { NextResponse } from "next/server";
import { apiProxyBase, sanitizedResponseHeaders } from "../../lib/server-api-proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = apiProxyBase();

  if (!baseUrl) {
    return NextResponse.json({
      backend: {
        configured: false,
        ok: false,
        status: null
      },
      frontend: {
        ok: true
      },
      ok: true
    });
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
          ok: true
        },
        ok: response.ok
      },
      {
        headers: sanitizedResponseHeaders(response.headers),
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
          ok: true
        },
        ok: false
      },
      { status: 502 }
    );
  }
}
