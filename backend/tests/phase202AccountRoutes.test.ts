import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildAccountExport: vi.fn(),
  clearAuthCookie: vi.fn(),
  consumeTenantRateLimit: vi.fn(),
  deidentifyAccount: vi.fn(),
  recordAuditLog: vi.fn(),
  summarizeAccountExport: vi.fn()
}));

vi.mock("../src/auth.js", () => ({
  clearAuthCookie: mocks.clearAuthCookie,
  requireAuth: vi.fn(),
  setPrivateNoStoreHeaders: vi.fn()
}));
vi.mock("../src/env.js", () => ({ env: { MFA_STEP_UP_TTL_SECONDS: 600 } }));
vi.mock("../src/services/audit.js", () => ({ recordAuditLog: mocks.recordAuditLog }));
vi.mock("../src/services/phase202SupportAccess.js", () => ({
  consumeTenantRateLimit: mocks.consumeTenantRateLimit
}));
vi.mock("../src/services/privacy.js", async () => {
  class Phase202PrivacyError extends Error {
    constructor(readonly code: string, message: string, readonly statusCode: number) {
      super(message);
    }
  }
  return {
    buildAccountExport: mocks.buildAccountExport,
    deidentifyAccount: mocks.deidentifyAccount,
    Phase202PrivacyError,
    summarizeAccountExport: mocks.summarizeAccountExport
  };
});
vi.mock("../src/schemas.js", () => ({
  deleteAccountSchema: { parse: vi.fn((value) => value) }
}));

type Handler = (request: Record<string, any>, reply: Record<string, any>) => Promise<unknown>;

function replyHarness() {
  const reply: Record<string, any> = {
    code: vi.fn(() => reply),
    header: vi.fn(() => reply),
    send: vi.fn((payload) => payload)
  };
  return reply;
}

async function handlers() {
  const routes = new Map<string, Handler>();
  const app = {
    addHook: vi.fn(),
    delete: vi.fn((path: string, _options: unknown, handler: Handler) => routes.set(`DELETE ${path}`, handler)),
    get: vi.fn((path: string, _options: unknown, handler: Handler) => routes.set(`GET ${path}`, handler))
  };
  const { accountRoutes } = await import("../src/routes/account.js");
  await accountRoutes(app as never);
  return routes;
}

function durableUser(overrides: Record<string, unknown> = {}) {
  return {
    actorId: "123e4567-e89b-42d3-a456-426614174201",
    organizationId: "123e4567-e89b-42d3-a456-426614174202",
    role: "USER",
    session: "member",
    sessionId: "123e4567-e89b-42d3-a456-426614174203",
    sessionVersion: 0,
    stepUpAt: new Date().toISOString(),
    sub: "phase202-user",
    tenantId: "123e4567-e89b-42d3-a456-426614174204",
    tokenId: "123e4567-e89b-42d3-a456-426614174205",
    tokenVersion: 2,
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.consumeTenantRateLimit.mockResolvedValue({ blocked: false });
  mocks.recordAuditLog.mockResolvedValue(undefined);
  mocks.summarizeAccountExport.mockReturnValue({ teams: 1 });
});

describe("Phase 202 account privacy routes", () => {
  it("requires a non-future recent step-up before sensitive export and binds the durable session", async () => {
    const routes = await handlers();
    const exportHandler = routes.get("GET /account/export")!;
    const staleReply = replyHarness();
    await exportHandler({
      headers: {},
      id: "export-stale",
      user: durableUser({ stepUpAt: new Date(Date.now() - 601_000).toISOString() })
    }, staleReply);
    expect(staleReply.code).toHaveBeenCalledWith(403);
    expect(mocks.buildAccountExport).not.toHaveBeenCalled();

    const futureReply = replyHarness();
    await exportHandler({
      headers: {},
      id: "export-future",
      user: durableUser({ stepUpAt: new Date(Date.now() + 60_000).toISOString() })
    }, futureReply);
    expect(futureReply.code).toHaveBeenCalledWith(403);

    const exportData = { scope: { kind: "TENANT" }, summary: { teams: 1 } };
    mocks.buildAccountExport.mockResolvedValue(exportData);
    const current = durableUser();
    const successReply = replyHarness();
    await exportHandler({ headers: {}, id: "export-current", user: current }, successReply);
    expect(mocks.buildAccountExport).toHaveBeenCalledWith(expect.objectContaining({
      authSubject: current.sub,
      sessionId: current.sessionId,
      tenantId: current.tenantId
    }));
    expect(successReply.send).toHaveBeenCalledWith(exportData);
  });

  it("returns a typed denial when the database no longer has an active MFA factor", async () => {
    const { Phase202PrivacyError } = await import("../src/services/privacy.js");
    mocks.buildAccountExport.mockRejectedValue(new Phase202PrivacyError(
      "MFA_FACTOR_REQUIRED",
      "An active MFA factor is required.",
      403
    ));
    const exportHandler = (await handlers()).get("GET /account/export")!;
    const reply = replyHarness();
    await exportHandler({ headers: {}, id: "export-no-factor", user: durableUser() }, reply);
    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ reason_code: "MFA_FACTOR_REQUIRED" }));
  });

  it("requires a stable idempotency key and preserves the canonical last-owner conflict", async () => {
    const routes = await handlers();
    const deleteHandler = routes.get("DELETE /account")!;
    const missingKeyReply = replyHarness();
    await deleteHandler({
      body: { confirmation: "DELETE MY ACCOUNT", password: "confirmed-password" },
      headers: {},
      id: "delete-no-key",
      user: durableUser()
    }, missingKeyReply);
    expect(missingKeyReply.code).toHaveBeenCalledWith(400);
    expect(mocks.deidentifyAccount).not.toHaveBeenCalled();

    const { Phase202PrivacyError } = await import("../src/services/privacy.js");
    mocks.deidentifyAccount.mockRejectedValue(new Phase202PrivacyError(
      "LAST_ACTIVE_OWNER_REQUIRED",
      "Transfer ownership first.",
      409
    ));
    const conflictReply = replyHarness();
    await deleteHandler({
      body: { confirmation: "DELETE MY ACCOUNT", password: "confirmed-password" },
      headers: { "idempotency-key": "phase202-delete-stable" },
      id: "delete-owner",
      user: durableUser()
    }, conflictReply);
    expect(mocks.deidentifyAccount).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: "phase202-delete-stable"
    }));
    expect(conflictReply.code).toHaveBeenCalledWith(409);
    expect(conflictReply.send).toHaveBeenCalledWith(expect.objectContaining({
      reason_code: "LAST_ACTIVE_OWNER_REQUIRED",
      tenant_records: "RETAINED"
    }));
    expect(mocks.clearAuthCookie).not.toHaveBeenCalled();
  });
});
