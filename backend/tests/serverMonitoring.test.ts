import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const emitOperationalAlertMock = vi.hoisted(() => vi.fn());

vi.mock("../src/services/automationQueue.js", () => ({
  startAutomationWorker: vi.fn(() => vi.fn())
}));

vi.mock("../src/services/agentOrchestrator.js", () => ({
  startAgentOrchestrator: vi.fn(() => vi.fn())
}));

vi.mock("../src/services/autonomyScheduler.js", () => ({
  startAutonomyScheduler: vi.fn(() => vi.fn())
}));

vi.mock("../src/services/policyEngine.js", () => ({
  ensureDefaultPolicies: vi.fn()
}));

vi.mock("../src/services/operationalMonitoring.js", () => ({
  emitOperationalAlert: emitOperationalAlertMock
}));

beforeEach(() => {
  vi.resetModules();
  emitOperationalAlertMock.mockReset();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.APP_PUBLIC_URL = "http://localhost:3000";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("server monitoring", () => {
  it("returns health metadata with a request id", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();

    const response = await app.inject({
      headers: { "x-request-id": "health-request" },
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toBe("health-request");
    expect(response.json()).toMatchObject({
      ok: true,
      requestId: "health-request",
      service: "entral-backend"
    });

    await app.close();
  }, 15000);

  it("includes request ids on unhandled API errors and emits an operational alert", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();
    app.get("/boom", async () => {
      throw new Error("boom details should stay out of the response");
    });

    const response = await app.inject({
      headers: { "x-request-id": "error-request" },
      method: "GET",
      url: "/boom"
    });

    expect(response.statusCode).toBe(500);
    expect(response.headers["x-request-id"]).toBe("error-request");
    expect(response.json()).toMatchObject({
      error: "Internal Server Error",
      message: "Something went wrong.",
      requestId: "error-request"
    });
    expect(response.body).not.toContain("boom details");
    expect(emitOperationalAlertMock).toHaveBeenCalledWith(expect.objectContaining({
      requestId: "error-request",
      title: "Unhandled ENTRAL API error"
    }), expect.anything());

    await app.close();
  });
});
