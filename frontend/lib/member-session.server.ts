import { parseMemberOrganizationsResponse } from "@entral/contracts";
import { apiProxyBase } from "./server-api-proxy";
import type { MemberOrganizationsResponse } from "./member";

export type MemberSessionResult =
  | { kind: "authenticated"; session: MemberOrganizationsResponse }
  | { kind: "unauthenticated" }
  | { kind: "unavailable"; message: string; requestId?: string };

type MemberSessionOptions = {
  fetcher?: typeof fetch;
  proxyUrl?: string;
  timeoutMs?: number;
};

export async function loadMemberSession(
  cookieHeader: string,
  { fetcher = fetch, proxyUrl = process.env.API_PROXY_URL, timeoutMs = 8000 }: MemberSessionOptions = {}
): Promise<MemberSessionResult> {
  if (!cookieHeader.trim()) {
    return { kind: "unauthenticated" };
  }

  const baseUrl = apiProxyBase(process.env.NODE_ENV, proxyUrl);

  if (!baseUrl) {
    return {
      kind: "unavailable",
      message: "The member service is not configured for this Entral deployment."
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(`${baseUrl}/api/v1/member/organizations`, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        cookie: cookieHeader
      },
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null) as unknown;

    if (response.status === 401) {
      return { kind: "unauthenticated" };
    }

    let safeSession: MemberOrganizationsResponse | null = null;
    try {
      safeSession = parseMemberOrganizationsResponse(payload);
    } catch {
      safeSession = null;
    }

    if (!response.ok || !safeSession) {
      const errorPayload = payload && typeof payload === "object" ? payload as { message?: unknown; requestId?: unknown } : null;
      return {
        kind: "unavailable",
        message: typeof errorPayload?.message === "string" ? errorPayload.message : "Entral could not load the member workspace.",
        requestId: typeof errorPayload?.requestId === "string" ? errorPayload.requestId : response.headers.get("x-request-id") ?? undefined
      };
    }

    return { kind: "authenticated", session: safeSession };
  } catch (error) {
    return {
      kind: "unavailable",
      message: error instanceof Error && error.name === "AbortError"
        ? "The member service took too long to respond."
        : "Entral could not reach the member service."
    };
  } finally {
    clearTimeout(timeout);
  }
}
