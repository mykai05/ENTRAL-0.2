import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ loadMemberSession: vi.fn() }));

vi.mock("../lib/member-session.server", () => ({ loadMemberSession: session.loadMemberSession }));

import { GET, POST } from "../app/api/member/organizations/[organizationId]/agent-runs/route";

const organizationId = "ck1234567890123456789012";
const userId = "user-1";
const ownerSession = {
  kind: "authenticated" as const,
  session: {
    organizations: [{ id: organizationId, joinedAt: "2026-07-01T00:00:00.000Z", memberCount: 1, memberLimit: 5, name: "Analytical Works", role: "OWNER" as const, slug: "analytical-works" }],
    user: { email: "owner@example.com", id: userId, name: "Owner" }
  }
};

const providerResult = {
  status: "completed",
  organization_id: organizationId,
  requested_by: userId,
  result: {
    status: "completed",
    mode: "business_type_radius",
    search_summary: "Found one verified contractor.",
    businesses: [{
      name: "North Star Builders", business_type: "General contractor", city: "San Diego", region: "California", country: "US",
      website: "https://example.com", approximate_distance_miles: 4,
      match_basis: "The public website identifies construction services in San Diego.", confidence: "high",
      sources: [{ title: "Company website", url: "https://example.com", source_type: "company_website" }]
    }],
    source_coverage: ["Company websites"],
    limitations: ["Public sources may omit recently formed businesses."],
    next_command_action: "Review the record before outreach."
  }
};

function routeContext(id = organizationId) {
  return { params: Promise.resolve({ organizationId: id }) };
}

describe("member agent execution route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.loadMemberSession.mockResolvedValue(ownerSession);
    vi.stubEnv("SOVEREIGN_AGENT_API_URL", "https://agents.example.com");
    vi.stubEnv("SOVEREIGN_AGENT_API_TOKEN", "a".repeat(40));
    vi.stubEnv("SOVEREIGN_AGENT_STORE_URL", "https://spcommand.com/api/internal/agent-runs");
    vi.stubEnv("SOVEREIGN_AGENT_STORE_TOKEN", "s".repeat(40));
  });

  it("rejects unauthenticated and cross-organization access before calling providers", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    session.loadMemberSession.mockResolvedValueOnce({ kind: "unauthenticated" });
    const unauthenticated = await GET(new Request("https://entral.test/api/member/organizations/x/agent-runs"), routeContext());
    expect(unauthenticated.status).toBe(401);

    const other = await GET(new Request("https://entral.test/api/member/organizations/x/agent-runs", { headers: { cookie: "entral_token=valid" } }), routeContext("another-organization"));
    expect(other.status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("allows members to read history but not start execution", async () => {
    session.loadMemberSession.mockResolvedValue({
      ...ownerSession,
      session: { ...ownerSession.session, organizations: [{ ...ownerSession.session.organizations[0], role: "MEMBER" }] }
    });
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ runs: [] }), { status: 200 })));
    vi.stubGlobal("fetch", fetcher);

    const read = await GET(new Request("https://entral.test/api/member/organizations/x/agent-runs", { headers: { cookie: "entral_token=valid" } }), routeContext());
    expect(read.status).toBe(200);
    expect(fetcher).toHaveBeenCalledWith(expect.objectContaining({ href: expect.stringContaining(`organizationId=${organizationId}`) }), expect.objectContaining({ method: "GET" }));

    const write = await POST(new Request("https://entral.test/api/member/organizations/x/agent-runs", {
      method: "POST", headers: { cookie: "entral_token=valid", "content-type": "application/json" }, body: JSON.stringify({})
    }), routeContext());
    expect(write.status).toBe(403);
  });

  it("binds a valid owner run to the authenticated user and stores the verified result", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ state: "claimed", leaseExpiresAt: "2026-07-19T00:06:00.000Z" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(providerResult), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ stored: true, run: { id: "entral-12345678", organizationId, requestedBy: userId, kind: "business_discovery", request: {}, result: providerResult.result, createdAt: "2026-07-19T00:00:00.000Z" } }), { status: 201 }));
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(new Request("https://entral.test/api/member/organizations/x/agent-runs", {
      method: "POST",
      headers: { cookie: "entral_token=valid", "content-type": "application/json", origin: "https://entral.test" },
      body: JSON.stringify({ idempotencyKey: "entral-12345678", businessType: "General contractors", centerCity: "San Diego", region: "California", radiusMiles: 10, maxResults: 10, namedBusinesses: [] })
    }), routeContext());

    expect(response.status).toBe(201);
    const claimCall = fetcher.mock.calls[0];
    expect(claimCall[0]).toEqual(new URL("https://spcommand.com/api/internal/agent-run-claims"));
    const providerCall = fetcher.mock.calls[1];
    expect(providerCall[0]).toEqual(new URL("https://agents.example.com/v1/business-discovery"));
    expect(providerCall[1].headers.authorization).toBe(`Bearer ${"a".repeat(40)}`);
    expect(JSON.parse(providerCall[1].body)).toMatchObject({ organization_id: organizationId, requested_by: userId });
    const storageCall = fetcher.mock.calls[2];
    expect(storageCall[1].headers.authorization).toBe(`Bearer ${"s".repeat(40)}`);
    expect(JSON.parse(storageCall[1].body)).toMatchObject({ organizationId, requestedBy: userId, id: "entral-12345678" });
    expect(JSON.stringify(await response.json())).not.toContain("aaaa");
  });

  it("rejects a provider response bound to another organization", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ state: "claimed", leaseExpiresAt: "2026-07-19T00:06:00.000Z" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...providerResult, organization_id: "other" }), { status: 200 })));
    const response = await POST(new Request("https://entral.test/api/member/organizations/x/agent-runs", {
      method: "POST",
      headers: { cookie: "entral_token=valid", "content-type": "application/json", origin: "https://entral.test" },
      body: JSON.stringify({ idempotencyKey: "entral-12345678", namedBusinesses: ["North Star Builders"] })
    }), routeContext());
    expect(response.status).toBe(502);
  });

  it("rejects cross-origin execution before claiming a run", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(new Request("https://entral.test/api/member/organizations/x/agent-runs", {
      method: "POST",
      headers: { cookie: "entral_token=valid", "content-type": "application/json", origin: "https://attacker.example" },
      body: JSON.stringify({ idempotencyKey: "entral-12345678", namedBusinesses: ["North Star Builders"] })
    }), routeContext());
    expect(response.status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("accepts a browser same-origin mutation when a reverse proxy rewrites the request host", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ state: "claimed", leaseExpiresAt: "2026-07-19T00:06:00.000Z" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(providerResult), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ stored: true, run: { id: "entral-12345678", organizationId, requestedBy: userId, kind: "business_discovery", request: {}, result: providerResult.result, createdAt: "2026-07-19T00:00:00.000Z" } }), { status: 201 }));
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(new Request("https://internal-proxy.test/api/member/organizations/x/agent-runs", {
      method: "POST",
      headers: {
        cookie: "entral_token=valid",
        "content-type": "application/json",
        origin: "https://entral.test",
        "sec-fetch-site": "same-origin"
      },
      body: JSON.stringify({ idempotencyKey: "entral-12345678", namedBusinesses: ["North Star Builders"] })
    }), routeContext());

    expect(response.status).toBe(201);
  });

  it("rejects non-JSON and oversized execution bodies before provider work", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const nonJson = await POST(new Request("https://entral.test/api/member/organizations/x/agent-runs", {
      method: "POST",
      headers: { cookie: "entral_token=valid", "content-type": "text/plain", origin: "https://entral.test" },
      body: "not json"
    }), routeContext());
    expect(nonJson.status).toBe(415);

    const oversized = await POST(new Request("https://entral.test/api/member/organizations/x/agent-runs", {
      method: "POST",
      headers: { cookie: "entral_token=valid", "content-length": "20001", "content-type": "application/json", origin: "https://entral.test" },
      body: JSON.stringify({ idempotencyKey: "entral-12345678", namedBusinesses: ["North Star Builders"] })
    }), routeContext());
    expect(oversized.status).toBe(413);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects unsafe links and cross-organization rows from the private store", async () => {
    const unsafe = {
      id: "entral-12345678", organizationId, requestedBy: userId, kind: "business_discovery", request: {},
      result: { ...providerResult.result, businesses: [{ ...providerResult.result.businesses[0], website: "javascript:alert(1)" }] },
      createdAt: "2026-07-19T00:00:00.000Z"
    };
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ runs: [unsafe] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ execution_enabled: true, agent_network: [] }), { status: 200 })));
    const response = await GET(new Request("https://entral.test/api/member/organizations/x/agent-runs", { headers: { cookie: "entral_token=valid" } }), routeContext());
    expect(response.status).toBe(502);
  });
});
