import { z } from "zod";
import { loadMemberSession } from "../../../../../../lib/member-session.server";

type RouteContext = { params: Promise<{ organizationId: string }> };

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const inputSchema = z.object({
  idempotencyKey: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{7,79}$/),
  namedBusinesses: z.array(z.string().trim().min(2).max(160)).max(20).default([]),
  businessType: z.string().trim().min(2).max(120).optional(),
  centerCity: z.string().trim().min(2).max(120).optional(),
  region: z.string().trim().min(2).max(120).optional(),
  country: z.string().trim().min(2).max(80).default("US"),
  radiusMiles: z.number().int().min(1).max(250).optional(),
  maxResults: z.number().int().min(1).max(40).default(20)
}).strict().superRefine((value, context) => {
  const radius = [value.businessType, value.centerCity, value.radiusMiles];
  const complete = radius.every((item) => item !== undefined);
  const partial = radius.some((item) => item !== undefined);
  if (partial && !complete) context.addIssue({ code: z.ZodIssueCode.custom, message: "Business type, city, and radius are required together." });
  if (!value.namedBusinesses.length && !complete) context.addIssue({ code: z.ZodIssueCode.custom, message: "Provide business names or a complete category-and-radius search." });
});

const httpUrlSchema = z.string().url().max(2048).refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "https:" || protocol === "http:";
}, "Only HTTP and HTTPS links are allowed.");

const discoveryResultSchema = z.object({
    status: z.enum(["completed", "partial", "blocked"]),
    mode: z.enum(["named_businesses", "business_type_radius", "mixed"]),
    search_summary: z.string().min(1).max(1000),
    businesses: z.array(z.object({
      name: z.string().min(2).max(200),
      business_type: z.string().max(160).nullable().optional(),
      city: z.string().max(120).nullable().optional(),
      region: z.string().max(120).nullable().optional(),
      country: z.string().max(80).nullable().optional(),
      website: httpUrlSchema.nullable().optional(),
      approximate_distance_miles: z.number().nonnegative().nullable().optional(),
      match_basis: z.string().min(1).max(500),
      confidence: z.enum(["high", "medium", "low"]),
      sources: z.array(z.object({
        title: z.string().min(1).max(240),
        url: httpUrlSchema,
        source_type: z.string().min(1).max(80)
      }).strict()).min(1).max(6)
    }).strict()).max(40),
    source_coverage: z.array(z.string().min(1).max(240)).max(12),
    limitations: z.array(z.string().min(1).max(500)).max(12),
    next_command_action: z.string().min(1).max(500)
}).strict();

const agentResponseSchema = z.object({
  status: z.literal("completed"),
  organization_id: z.string().min(2).max(160),
  requested_by: z.string().min(2).max(160),
  result: discoveryResultSchema
}).strict();

const storedRunSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{7,119}$/),
  organizationId: z.string().min(2).max(160),
  requestedBy: z.string().min(2).max(160),
  kind: z.literal("business_discovery"),
  request: z.unknown(),
  result: discoveryResultSchema,
  createdAt: z.string().datetime()
}).strict();

const historySchema = z.object({ runs: z.array(storedRunSchema).max(20) }).strict();
const storedResponseSchema = z.object({ stored: z.literal(true), run: storedRunSchema }).strict();
const claimResponseSchema = z.union([
  z.object({ state: z.literal("claimed"), leaseExpiresAt: z.string().datetime() }).strict(),
  z.object({ state: z.literal("completed"), run: storedRunSchema }).strict()
]);
const healthSchema = z.object({
  execution_enabled: z.boolean(),
  agent_network: z.array(z.object({ agent_id: z.string().min(1).max(80), state: z.string().min(1).max(80) }).strict()).max(20).default([])
}).passthrough();

function noStore(payload: unknown, status = 200) {
  return Response.json(payload, { status, headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" } });
}

function endpoint(value: string | undefined, label: string) {
  try {
    const url = new URL(value?.trim() ?? "");
    const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if (!["http:", "https:"].includes(url.protocol) || (process.env.NODE_ENV === "production" && (url.protocol !== "https:" || local)) || url.username || url.password) return null;
    return url;
  } catch {
    void label;
    return null;
  }
}

function trustedBrowserMutation(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin === new URL(request.url).origin) return true;
    } catch {
      return false;
    }
  }
  // Reverse proxies may rewrite the request host while the browser still
  // supplies its protected same-origin Fetch Metadata header. Cross-site
  // browser requests cannot set this value themselves.
  return request.headers.get("sec-fetch-site") === "same-origin";
}

async function agentAvailability(agentUrl: URL | null) {
  if (!agentUrl) return { executionEnabled: false, agents: [] as Array<{ agentId: string; state: string }> };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(new URL("/health", agentUrl), { cache: "no-store", headers: { accept: "application/json" }, redirect: "error", signal: controller.signal });
    const parsed = healthSchema.safeParse(await response.json().catch(() => null));
    if (!response.ok || !parsed.success) return { executionEnabled: false, agents: [] };
    return {
      executionEnabled: parsed.data.execution_enabled,
      agents: parsed.data.agent_network.map((agent) => ({ agentId: agent.agent_id, state: agent.state }))
    };
  } catch {
    return { executionEnabled: false, agents: [] };
  } finally {
    clearTimeout(timeout);
  }
}

async function authorizedContext(request: Request, organizationId: string) {
  const session = await loadMemberSession(request.headers.get("cookie") ?? "");
  if (session.kind !== "authenticated") return { ok: false as const, error: noStore({ error: "unauthorized", message: "Authentication is required." }, session.kind === "unauthenticated" ? 401 : 503) };
  const organization = session.session.organizations.find((item) => item.id === organizationId);
  if (!organization) return { ok: false as const, error: noStore({ error: "not_found", message: "Organization not found or unavailable." }, 404) };
  return { ok: true as const, session: session.session, organization };
}

async function storeFetch(url: URL, token: string, init: RequestInit) {
  return fetch(url, {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(5000),
    headers: { ...init.headers, authorization: `Bearer ${token}` }
  });
}

async function limitedJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return { ok: false, response: noStore({ error: "unsupported_media_type", message: "JSON is required." }, 415) };
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > 20_000) {
    return { ok: false, response: noStore({ error: "payload_too_large", message: "The request is too large." }, 413) };
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 20_000) {
    return { ok: false, response: noStore({ error: "payload_too_large", message: "The request is too large." }, 413) };
  }
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: noStore({ error: "invalid_request", message: "The request body is not valid JSON." }, 400) };
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { organizationId } = await context.params;
  const auth = await authorizedContext(request, organizationId);
  if (!auth.ok) return auth.error;
  const storeUrl = endpoint(process.env.SOVEREIGN_AGENT_STORE_URL, "store");
  const agentUrl = endpoint(process.env.SOVEREIGN_AGENT_API_URL, "agent");
  const storeToken = process.env.SOVEREIGN_AGENT_STORE_TOKEN?.trim() ?? "";
  if (!storeUrl || storeToken.length < 32) return noStore({ error: "service_unavailable", message: "Agent history is not configured." }, 503);
  storeUrl.searchParams.set("organizationId", organizationId);
  try {
    const [response, availability] = await Promise.all([
      storeFetch(storeUrl, storeToken, { method: "GET", headers: { accept: "application/json" } }),
      agentAvailability(agentUrl)
    ]);
    const payload = await response.json().catch(() => null);
    const verified = historySchema.safeParse(payload);
    if (!response.ok || !verified.success || verified.data.runs.some((run) => run.organizationId !== organizationId)) {
      return noStore({ error: "service_unavailable", message: "Agent history could not be loaded." }, 502);
    }
    return noStore({ ...verified.data, availability });
  } catch {
    return noStore({ error: "service_unavailable", message: "Agent history could not be reached." }, 502);
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!trustedBrowserMutation(request)) return noStore({ error: "forbidden", message: "A same-origin request is required." }, 403);
  const { organizationId } = await context.params;
  const auth = await authorizedContext(request, organizationId);
  if (!auth.ok) return auth.error;
  if (auth.organization.role !== "OWNER") return noStore({ error: "forbidden", message: "Only an organization owner can start a research run." }, 403);

  const body = await limitedJson(request);
  if (!body.ok) return body.response;
  const parsed = inputSchema.safeParse(body.value);
  if (!parsed.success) return noStore({ error: "invalid_request", message: parsed.error.issues[0]?.message ?? "Input validation failed." }, 400);
  const agentUrl = endpoint(process.env.SOVEREIGN_AGENT_API_URL, "agent");
  const storeUrl = endpoint(process.env.SOVEREIGN_AGENT_STORE_URL, "store");
  const agentToken = process.env.SOVEREIGN_AGENT_API_TOKEN?.trim() ?? "";
  const storeToken = process.env.SOVEREIGN_AGENT_STORE_TOKEN?.trim() ?? "";
  if (!agentUrl || !storeUrl || agentToken.length < 32 || storeToken.length < 32) {
    return noStore({ error: "service_unavailable", message: "Sovereign Command is not configured." }, 503);
  }

  const runId = parsed.data.idempotencyKey;
  const discovery = {
    named_businesses: parsed.data.namedBusinesses,
    business_type: parsed.data.businessType,
    center_city: parsed.data.centerCity,
    region: parsed.data.region,
    country: parsed.data.country,
    radius_miles: parsed.data.radiusMiles,
    max_results: parsed.data.maxResults
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 285_000);
  const claimUrl = new URL("/api/internal/agent-run-claims", storeUrl);
  const claimPayload = { id: runId, organizationId, requestedBy: auth.session.user.id, request: parsed.data };
  try {
    const claimResponse = await storeFetch(claimUrl, storeToken, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(claimPayload)
    });
    const claimResult = claimResponseSchema.safeParse(await claimResponse.json().catch(() => null));
    if (claimResponse.status === 429) return noStore({ error: "rate_limited", message: "The hourly research limit has been reached. Try again later." }, 429);
    if (claimResponse.status === 409) return noStore({ error: "request_in_progress", message: "This research request is already running. Refresh history shortly." }, 409);
    if (!claimResponse.ok || !claimResult.success) return noStore({ error: "service_unavailable", message: "Sovereign Command could not reserve this research run." }, 503);
    if (claimResult.data.state === "completed") {
      if (claimResult.data.run.organizationId !== organizationId || claimResult.data.run.requestedBy !== auth.session.user.id) {
        return noStore({ error: "agent_failed", message: "Stored research did not match this organization." }, 502);
      }
      return noStore({ stored: true, run: claimResult.data.run }, 200);
    }

    const response = await fetch(new URL("/v1/business-discovery", agentUrl), {
      method: "POST",
      body: JSON.stringify({ organization_id: organizationId, requested_by: auth.session.user.id, discovery }),
      headers: {
        accept: "application/json",
        authorization: `Bearer ${agentToken}`,
        "content-type": "application/json",
        "idempotency-key": `${organizationId}:${runId}`
      },
      cache: "no-store",
      redirect: "error",
      signal: controller.signal
    });
    const providerPayload = await response.json().catch(() => null);
    if (!response.ok) return noStore({ error: "agent_failed", message: "Sovereign Command did not complete the research run." }, 502);
    const verified = agentResponseSchema.safeParse(providerPayload);
    if (!verified.success || verified.data.organization_id !== organizationId || verified.data.requested_by !== auth.session.user.id) {
      return noStore({ error: "agent_failed", message: "Sovereign Command returned an invalid organization binding." }, 502);
    }

    const storeResponse = await storeFetch(storeUrl, storeToken, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: runId,
        organizationId,
        requestedBy: auth.session.user.id,
        kind: "business_discovery",
        request: parsed.data,
        result: verified.data.result
      })
    });
    const stored = await storeResponse.json().catch(() => null);
    const verifiedStored = storedResponseSchema.safeParse(stored);
    if (!storeResponse.ok || !verifiedStored.success
      || verifiedStored.data.run.organizationId !== organizationId
      || verifiedStored.data.run.requestedBy !== auth.session.user.id) {
      return noStore({ error: "storage_failed", message: "Research completed but its controlled record could not be stored. Retry with the same request ID." }, 502);
    }
    return noStore(verifiedStored.data, 201);
  } catch (error) {
    return noStore({
      error: error instanceof Error && error.name === "AbortError" ? "agent_timeout" : "agent_unavailable",
      message: error instanceof Error && error.name === "AbortError" ? "The research run exceeded its execution window." : "Sovereign Command could not be reached."
    }, 502);
  } finally {
    clearTimeout(timeout);
  }
}
