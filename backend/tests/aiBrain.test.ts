import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
});

describe("backend AI Brain", () => {
  it("requires authorization for external deployment requests", async () => {
    const { createAiActionPlan } = await import("../src/services/aiBrain.js");
    const plan = createAiActionPlan("Deploy the frontend to Vercel and push the repo to GitHub.");

    expect(plan.intent).toBe("website_workflow");
    expect(plan.toolsRequired).toEqual(expect.arrayContaining(["vercel", "github"]));
    expect(plan.authorizationRequired).toBe(true);
  });

  it("identifies governed research requests", async () => {
    const { classifyAiRequest } = await import("../src/services/aiBrain.js");
    const classification = classifyAiRequest("Research competitors and search the web for pricing.");

    expect(classification.detectedIntent).toBe("browser_web_request");
    expect(classification.requiredTools).toContain("web-search");
    expect(classification.authorizationRequirement).toBe("recommended");
  });

  it("records pending audit entries for approval-gated plans", async () => {
    const { createAiActionPlan, createAiAuditEntry } = await import("../src/services/aiBrain.js");
    const plan = createAiActionPlan("Send an email to the client.");
    const audit = createAiAuditEntry({ plan });

    expect(audit.authorizationStatus).toBe("pending");
    expect(audit.toolsUsed).toContain("gmail");
  });
});
