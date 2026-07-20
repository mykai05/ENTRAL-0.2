import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../app/health/route";

describe("Entral production health route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("API_PROXY_URL", "https://backend.example.com");
    vi.stubEnv("SOVEREIGN_AGENT_API_URL", "https://agents.example.com");
  });

  it("requires both the member backend and executable Sovereign Command without reflecting upstream payloads", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "ok", privateDetail: "do-not-reflect" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ execution_enabled: true, privateDetail: "do-not-reflect" }), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);

    const response = await GET(new Request("https://entral.example.com/health"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.sovereignCommand.executionEnabled).toBe(true);
    expect(JSON.stringify(body)).not.toContain("privateDetail");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the agent reports execution disabled", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ execution_enabled: false }), { status: 200 })));

    const response = await GET(new Request("https://entral.example.com/health"));
    const body = await response.json();
    expect(response.status).toBe(502);
    expect(body.ok).toBe(false);
    expect(body.sovereignCommand.executionEnabled).toBe(false);
  });
});
