import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn()
}));

vi.mock("../src/db.js", () => ({
  prisma: {
    memberAgentRun: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: mocks.findUnique,
      update: mocks.update,
      updateMany: mocks.updateMany
    }
  }
}));

vi.mock("../src/services/audit.js", () => ({ recordAuditLog: mocks.audit }));

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.APP_PUBLIC_URL = "http://localhost:3000";
  process.env.SOVEREIGN_COMMAND_ENABLED = "true";
  process.env.SOVEREIGN_COMMAND_API_URL = "https://sovereign.example.test";
  process.env.SOVEREIGN_COMMAND_API_TOKEN = "service-token-for-tests-only-1234567890";
});

describe("Sovereign Command member runner", () => {
  it("binds the provider request and result to the verified organization and requester", async () => {
    const { stringifySecureJson } = await import("../src/services/secureJson.js");
    mocks.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    mocks.findUnique.mockResolvedValueOnce({
      id: "run-1",
      teamId: "team-1",
      requestedById: "user-1",
      idempotencyKey: "discovery-0001",
      kind: "business_discovery",
      requestJson: stringifySecureJson({
        kind: "business_discovery",
        discovery: {
          namedBusinesses: ["Example Builders"],
          country: "US",
          maxResults: 5
        }
      })
    });
    mocks.update.mockResolvedValue({ id: "run-1" });
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "completed",
      organization_id: "team-1",
      requested_by: "user-1",
      result: {
        status: "completed",
        mode: "named_businesses",
        search_summary: "Public research completed.",
        businesses: [],
        source_coverage: ["Official websites"],
        limitations: [],
        next_command_action: "Review the evidence."
      }
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetcher);

    const { runMemberAgentRun } = await import("../src/services/sovereignCommand.js");
    await runMemberAgentRun("run-1");

    expect(fetcher).toHaveBeenCalledWith("https://sovereign.example.test/v1/business-discovery", expect.objectContaining({
      headers: expect.objectContaining({
        authorization: "Bearer service-token-for-tests-only-1234567890",
        "idempotency-key": "team-1:discovery-0001"
      })
    }));
    const sent = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(sent).toMatchObject({ organization_id: "team-1", requested_by: "user-1" });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "completed", errorCode: null })
    }));
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({
      action: "member.agent_run.completed",
      metadata: expect.objectContaining({ organizationId: "team-1" })
    }));
    vi.unstubAllGlobals();
  });

  it("fails closed when the provider returns another organization binding", async () => {
    const { stringifySecureJson } = await import("../src/services/secureJson.js");
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findUnique.mockResolvedValueOnce({
      id: "run-2",
      teamId: "team-1",
      requestedById: "user-1",
      idempotencyKey: "discovery-0002",
      kind: "business_discovery",
      requestJson: stringifySecureJson({ kind: "business_discovery", discovery: { namedBusinesses: ["Example"], country: "US", maxResults: 5 } })
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "completed",
      organization_id: "team-other",
      requested_by: "user-1",
      result: {
        status: "completed",
        mode: "named_businesses",
        search_summary: "Research completed.",
        businesses: [], source_coverage: [], limitations: [], next_command_action: "Review."
      }
    }), { status: 200 })));

    const { runMemberAgentRun } = await import("../src/services/sovereignCommand.js");
    await runMemberAgentRun("run-2");

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "failed", errorCode: "UPSTREAM_FAILED" })
    }));
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "member.agent_run.failed" }));
    vi.unstubAllGlobals();
  });
});
