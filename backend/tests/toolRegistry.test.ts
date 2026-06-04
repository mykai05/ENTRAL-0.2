import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  delete process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_OWNER;
  delete process.env.GITHUB_REPO;
  delete process.env.VERCEL_TOKEN;
  delete process.env.VERCEL_ORG_ID;
  delete process.env.VERCEL_PROJECT_ID;
  delete process.env.SHOPIFY_STORE_DOMAIN;
  delete process.env.SHOPIFY_CONNECTOR_ADMIN_TOKEN;
  delete process.env.SHOPIFY_API_VERSION;
  delete process.env.SHOPIFY_DEV_DASHBOARD_STORAGE_STATE_PATH;
});

describe("backend Tool Registry", () => {
  it("exposes the OpenAI provider and guarded external tools", async () => {
    const { getToolRegistry } = await import("../src/services/toolRegistry.js");
    const registry = getToolRegistry();
    const openai = registry.find((tool) => tool.id === "openai");

    expect(openai).toBeDefined();
    expect(openai?.providerName).toBe("OpenAI");
    expect(openai?.modelName).toBe("gpt-4o");
    expect(openai?.status).toBe("Missing API Key");
    expect(registry.some((tool) => tool.id === "github" && tool.readOnly && tool.riskLevel === "Low")).toBe(true);
    expect(registry.some((tool) => tool.id === "vercel" && tool.readOnly && tool.status === "Missing Credentials")).toBe(true);
    expect(registry.some((tool) => tool.id === "gmail" && tool.requiresAuthorization)).toBe(true);
  });

  it("tests read-only development tools without write capability", async () => {
    const { buildToolTestResultWithProvider, getToolById } = await import("../src/services/toolRegistry.js");
    const github = getToolById("github");

    expect(github).toBeDefined();
    const result = await buildToolTestResultWithProvider(github!);

    expect(result.status).toBe("Missing Credentials");
    expect(result.readOnly).toBe(true);
    expect(result.writeActionsEnabled).toBe(false);
    expect(result.missingEnvVars).toEqual(["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO"]);
  });

  it("reports unconnected credentials safely", async () => {
    const { buildToolTestResult, getToolById } = await import("../src/services/toolRegistry.js");
    const gmail = getToolById("gmail");

    expect(gmail).toBeDefined();
    const result = buildToolTestResult(gmail!);

    expect(result.success).toBe(false);
    expect(result.nextSteps).toContain("Add backend-controlled credentials.");
  });

  it("creates mock execution without contacting external systems", async () => {
    const { buildMockToolExecution, getToolById } = await import("../src/services/toolRegistry.js");
    const shopify = getToolById("shopify");

    expect(shopify).toBeDefined();
    const result = buildMockToolExecution(shopify!, "Prepare Shopify launch.");

    expect(result.message).toContain("No external system was contacted");
    expect(result.simulatedResult).toContain("Prepare Shopify launch");
  });

  it("advertises governed Shopify store-creation browser autonomy", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "entral-shopify-registry-"));
    const storageStatePath = join(tempDir, "shopify-dev-dashboard-storage.json");

    try {
      writeFileSync(storageStatePath, JSON.stringify({ cookies: [], origins: [] }));
      process.env.SHOPIFY_DEV_DASHBOARD_STORAGE_STATE_PATH = storageStatePath;
      const { getToolById } = await import("../src/services/toolRegistry.js");
      const shopify = getToolById("shopify");

      expect(shopify?.availableActions).toEqual(expect.arrayContaining([
        "store.creation.browser_task",
        "store.creation.browser_task.authenticated_session",
        "store.creation.capture"
      ]));
      expect(shopify?.metadata?.devDashboardStorageStateConfigured).toBe(true);
      expect(shopify?.metadata?.devDashboardStorageStateStatus).toBe("ready");
      expect(shopify?.requiresAuthorization).toBe(true);
      expect(shopify?.riskLevel).toBe("High");
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("reports missing Shopify Dev Dashboard storage state in registry metadata", async () => {
    process.env.SHOPIFY_DEV_DASHBOARD_STORAGE_STATE_PATH = "C:/secure/missing-shopify-dev-dashboard-storage.json";
    const { getToolById } = await import("../src/services/toolRegistry.js");
    const shopify = getToolById("shopify");

    expect(shopify?.metadata?.devDashboardStorageStateConfigured).toBe(true);
    expect(shopify?.metadata?.devDashboardStorageStateStatus).toBe("missing");
  });

  it("keeps external-tool copy behind approval language", async () => {
    const { getToolRegistry, getToolById } = await import("../src/services/toolRegistry.js");
    const registryCopy = JSON.stringify(getToolRegistry()).toLowerCase();

    expect(registryCopy).not.toMatch(/\btor\b/);
    expect(getToolById("shopify")?.description).toContain("after approval");
    expect(getToolById("social-publisher")?.description).toContain("explicit approval");
  });
});
