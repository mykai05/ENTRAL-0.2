import { NextResponse } from "next/server";
import { apiProxyBase } from "../../lib/server-api-proxy";

export const dynamic = "force-dynamic";

function sovereignAgentHealthUrl() {
  try {
    const url = new URL(process.env.SOVEREIGN_AGENT_API_URL?.trim() ?? "");
    const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if ((process.env.NODE_ENV === "production" && (url.protocol !== "https:" || local)) || url.username || url.password) return null;
    return new URL("/health", url);
  } catch {
    return null;
  }
}

function responseRequestId(request: Request) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

async function fetchHealth(url: string | URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    return await fetch(url, { cache: "no-store", method: "GET", signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function responseHeaders(requestId: string) {
  return {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-request-id": requestId,
    "x-robots-tag": "noindex, nofollow"
  };
}

export async function GET(request: Request) {
  const baseUrl = apiProxyBase();
  const agentHealthUrl = sovereignAgentHealthUrl();
  const requestId = responseRequestId(request);
  const timestamp = new Date().toISOString();

  if (!baseUrl || !agentHealthUrl) {
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
        sovereignCommand: {
          configured: Boolean(agentHealthUrl),
          ok: false,
          status: null
        },
        ok: false,
        requestId
      },
      {
        headers: responseHeaders(requestId),
        status: 503
      }
    );
  }

  try {
    const [response, agentResponse] = await Promise.all([
      fetchHealth(`${baseUrl}/health`),
      fetchHealth(agentHealthUrl)
    ]);
    const agentPayload = await agentResponse.json().catch(() => null) as { execution_enabled?: unknown } | null;
    const agentReady = agentResponse.ok && agentPayload?.execution_enabled === true;

    return NextResponse.json(
      {
        backend: {
          configured: true,
          ok: response.ok,
          status: response.status
        },
        frontend: {
          ok: true,
          service: "entral-frontend",
          timestamp
        },
        sovereignCommand: {
          configured: true,
          executionEnabled: agentReady,
          ok: agentReady,
          status: agentResponse.status
        },
        ok: response.ok && agentReady,
        requestId
      },
      {
        headers: responseHeaders(requestId),
        status: response.ok && agentReady ? 200 : 502
      }
    );
  } catch {
    return NextResponse.json(
      {
        backend: {
          configured: true,
          ok: false,
          status: null
        },
        frontend: {
          ok: true,
          service: "entral-frontend",
          timestamp
        },
        sovereignCommand: {
          configured: true,
          ok: false,
          status: null
        },
        ok: false,
        requestId
      },
      {
        headers: responseHeaders(requestId),
        status: 502
      }
    );
  }
}
