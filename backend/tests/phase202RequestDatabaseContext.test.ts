import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: { source: "canonical-prisma" },
  resolveSingleActiveTenant: vi.fn(),
  withScopedPrismaTransaction: vi.fn(),
  withTenantSession: vi.fn()
}));

vi.mock("../src/db.js", () => mocks);

type TestUser = {
  organizationId: string | null;
  session: "internal" | "member" | "support";
  sub: string;
  tenantId: string | null;
};

type TestRequest = {
  id: string;
  method: string;
  user?: TestUser;
};

function createReply() {
  const code = vi.fn();
  const send = vi.fn((payload: unknown) => payload);
  const reply = { code, send };
  code.mockReturnValue(reply);
  return reply;
}

type TestReply = ReturnType<typeof createReply>;
type TestHandler = (
  this: unknown,
  request: TestRequest,
  reply: TestReply
) => Promise<unknown>;
type OnRouteHook = (routeOptions: {
  handler: TestHandler;
  method: string;
  url: string;
}) => void;

async function wrappedLegacyHandler(originalHandler: TestHandler) {
  let onRouteHook: OnRouteHook | undefined;
  const app = {
    addHook: vi.fn((name: string, hook: OnRouteHook) => {
      expect(name).toBe("onRoute");
      onRouteHook = hook;
    })
  };

  const { installPhase202TenantRequestContext } = await import("../src/phase202RequestDatabaseContext.js");
  installPhase202TenantRequestContext(app as never);

  const routeOptions = {
    handler: originalHandler,
    method: "GET",
    url: "/api/v1/dashboard"
  };
  expect(onRouteHook).toBeTypeOf("function");
  onRouteHook?.(routeOptions);
  return routeOptions.handler;
}

const organizationId = "423e4567-e89b-42d3-a456-426614174000";
const tenantId = "523e4567-e89b-42d3-a456-426614174000";
const transaction = { source: "tenant-transaction" };

describe("Phase 202 legacy-route tenant request context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSingleActiveTenant.mockResolvedValue({ organizationId, tenantId });
    mocks.withTenantSession.mockImplementation(async (
      _database: unknown,
      _context: unknown,
      operation: (database: unknown, identity: {
        organizationId: string;
        tenantId: string;
      }) => Promise<unknown>
    ) => operation(transaction, { organizationId, tenantId }));
    mocks.withScopedPrismaTransaction.mockImplementation(async (
      _transaction: unknown,
      operation: () => Promise<unknown>
    ) => operation());
  });

  it("resolves an internal principal to one active tenant and runs the legacy handler in that scoped transaction", async () => {
    let scopedTransactionActive = false;
    mocks.withScopedPrismaTransaction.mockImplementationOnce(async (
      receivedTransaction: unknown,
      operation: () => Promise<unknown>
    ) => {
      expect(receivedTransaction).toBe(transaction);
      scopedTransactionActive = true;
      try {
        return await operation();
      } finally {
        scopedTransactionActive = false;
      }
    });
    const originalHandler = vi.fn(async () => {
      expect(scopedTransactionActive).toBe(true);
      return { ok: true };
    });
    const handler = await wrappedLegacyHandler(originalHandler);
    const reply = createReply();

    const result = await handler.call({}, {
      id: "request_internal_exact_tenant",
      method: "GET",
      user: {
        organizationId: null,
        session: "internal",
        sub: "user_internal",
        tenantId: null
      }
    }, reply);

    expect(result).toEqual({ ok: true });
    expect(scopedTransactionActive).toBe(false);
    expect(mocks.resolveSingleActiveTenant).toHaveBeenCalledWith(mocks.prisma, {
      authSubject: "user_internal",
      requestId: "request_internal_exact_tenant"
    });
    expect(mocks.withTenantSession).toHaveBeenCalledWith(mocks.prisma, {
      actionReason: "api.get./api/v1/dashboard",
      authSubject: "user_internal",
      requestId: "request_internal_exact_tenant",
      tenantId
    }, expect.any(Function));
    expect(mocks.withScopedPrismaTransaction).toHaveBeenCalledWith(transaction, expect.any(Function));
    expect(originalHandler).toHaveBeenCalledOnce();
    expect(reply.code).not.toHaveBeenCalled();
  });

  it.each([
    "no active tenant",
    "multiple active tenants"
  ])("fails closed when exact tenant resolution represents %s", async () => {
    // The resolver intentionally collapses both non-exact outcomes to null.
    mocks.resolveSingleActiveTenant.mockResolvedValueOnce(null);
    const originalHandler = vi.fn(async () => ({ ok: true }));
    const handler = await wrappedLegacyHandler(originalHandler);
    const reply = createReply();

    const result = await handler.call({}, {
      id: "request_without_exact_tenant",
      method: "GET",
      user: {
        organizationId: null,
        session: "internal",
        sub: "user_without_exact_tenant",
        tenantId: null
      }
    }, reply);

    expect(result).toEqual({
      error: "Forbidden",
      message: "This operation requires one exact active tenant scope.",
      reason_code: "EXACT_ACTIVE_TENANT_REQUIRED"
    });
    expect(reply.code).toHaveBeenCalledWith(403);
    expect(mocks.withTenantSession).not.toHaveBeenCalled();
    expect(mocks.withScopedPrismaTransaction).not.toHaveBeenCalled();
    expect(originalHandler).not.toHaveBeenCalled();
  });

  it("fails closed when the tenant session resolves to a different organization", async () => {
    mocks.withTenantSession.mockImplementationOnce(async (
      _database: unknown,
      _context: unknown,
      operation: (database: unknown, identity: {
        organizationId: string;
        tenantId: string;
      }) => Promise<unknown>
    ) => operation(transaction, {
      organizationId: "623e4567-e89b-42d3-a456-426614174000",
      tenantId
    }));
    const originalHandler = vi.fn(async () => ({ ok: true }));
    const handler = await wrappedLegacyHandler(originalHandler);
    const reply = createReply();

    const result = await handler.call({}, {
      id: "request_organization_mismatch",
      method: "GET",
      user: {
        organizationId: null,
        session: "internal",
        sub: "user_organization_mismatch",
        tenantId: null
      }
    }, reply);

    expect(result).toEqual(expect.objectContaining({
      reason_code: "EXACT_ACTIVE_TENANT_REQUIRED"
    }));
    expect(reply.code).toHaveBeenCalledWith(403);
    expect(mocks.withScopedPrismaTransaction).not.toHaveBeenCalled();
    expect(originalHandler).not.toHaveBeenCalled();
  });

  it("rejects support principals before tenant resolution or legacy handler execution", async () => {
    const originalHandler = vi.fn(async () => ({ ok: true }));
    const handler = await wrappedLegacyHandler(originalHandler);
    const reply = createReply();

    const result = await handler.call({}, {
      id: "request_support",
      method: "GET",
      user: {
        organizationId,
        session: "support",
        sub: "support_operator",
        tenantId
      }
    }, reply);

    expect(result).toEqual(expect.objectContaining({
      reason_code: "EXACT_ACTIVE_TENANT_REQUIRED"
    }));
    expect(reply.code).toHaveBeenCalledWith(403);
    expect(mocks.resolveSingleActiveTenant).not.toHaveBeenCalled();
    expect(mocks.withTenantSession).not.toHaveBeenCalled();
    expect(mocks.withScopedPrismaTransaction).not.toHaveBeenCalled();
    expect(originalHandler).not.toHaveBeenCalled();
  });
});
