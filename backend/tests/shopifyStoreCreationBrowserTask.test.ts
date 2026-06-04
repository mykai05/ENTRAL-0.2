import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

function resetEnv() {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  delete process.env.SHOPIFY_DEV_DASHBOARD_STORAGE_STATE_PATH;
}

describe("Shopify store creation browser task", () => {
  beforeEach(resetEnv);

  it("detects a final myshopify.com domain as capture-ready evidence", async () => {
    const { classifyShopifyStoreCreationBrowserText } = await import("../src/services/shopifyStoreCreationBrowserTask.js");

    expect(classifyShopifyStoreCreationBrowserText({
      expectedShopDomain: "iron-house-gym.myshopify.com",
      text: "Store created. Visit iron-house-gym.myshopify.com/admin to continue."
    })).toMatchObject({
      detectedDomain: "iron-house-gym.myshopify.com",
      hardStop: null,
      status: "capture_ready"
    });
  });

  it("stops at operator and billing gates before store creation", async () => {
    const { classifyShopifyStoreCreationBrowserText } = await import("../src/services/shopifyStoreCreationBrowserTask.js");

    expect(classifyShopifyStoreCreationBrowserText({
      text: "Log in to Shopify and complete two-factor verification."
    })).toMatchObject({
      detectedDomain: null,
      status: "blocked_operator_gate"
    });

    expect(classifyShopifyStoreCreationBrowserText({
      text: "Select a paid plan and set up billing before continuing."
    })).toMatchObject({
      detectedDomain: null,
      status: "blocked_hard_stop"
    });
  });

  it("uses an ephemeral unauthenticated session when no Shopify dashboard storage state is configured", async () => {
    const { shopifyDevDashboardBrowserSession } = await import("../src/services/shopifyStoreCreationBrowserTask.js");

    expect(shopifyDevDashboardBrowserSession()).toMatchObject({
      contextOptions: {},
      operatorOrSessionContext: "Governed Playwright task using an ephemeral unauthenticated browser session.",
      storageStateConfigured: false,
      storageStateStatus: "not_configured"
    });
  });

  it("reports configured Shopify dashboard storage state when the file is missing", async () => {
    process.env.SHOPIFY_DEV_DASHBOARD_STORAGE_STATE_PATH = "C:/secure/shopify-dev-dashboard-storage.json";
    const { shopifyDevDashboardBrowserSession } = await import("../src/services/shopifyStoreCreationBrowserTask.js");

    expect(shopifyDevDashboardBrowserSession()).toMatchObject({
      contextOptions: {},
      operatorOrSessionContext: "Governed Playwright task could not use configured Shopify Dev Dashboard storage state because the file is missing.",
      storageStateConfigured: true,
      storageStateStatus: "missing"
    });
  });

  it("can use operator-provided Shopify dashboard storage state without entering credentials", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "entral-shopify-state-"));
    const storageStatePath = join(tempDir, "shopify-dev-dashboard-storage.json");

    try {
      writeFileSync(storageStatePath, JSON.stringify({ cookies: [], origins: [] }));
      process.env.SHOPIFY_DEV_DASHBOARD_STORAGE_STATE_PATH = storageStatePath;
      const { shopifyDevDashboardBrowserSession } = await import("../src/services/shopifyStoreCreationBrowserTask.js");

      expect(shopifyDevDashboardBrowserSession()).toMatchObject({
        contextOptions: {
          storageState: storageStatePath
        },
        operatorOrSessionContext: "Governed Playwright task using operator-provided authenticated Shopify Dev Dashboard storage state.",
        storageStateConfigured: true,
        storageStateStatus: "ready"
      });
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("builds the capture request from governed browser evidence", async () => {
    const { buildShopifyStoreCreationCaptureInputFromBrowserReceipt } = await import("../src/services/shopifyStoreCreationBrowserTask.js");
    const captureInput = buildShopifyStoreCreationCaptureInputFromBrowserReceipt({
      payload: {
        browserTask: {
          allowedDomains: ["dev.shopify.com"],
          allowedSteps: [],
          completionEvidence: {
            captureEndpoint: "/api/v1/merch/stores/cm123/shopify-store-creation-capture",
            nextAutonomousStep: "submit_shopify_store_creation_capture",
            requiredFields: ["finalShopDomain"]
          },
          currentExecution: "not_started",
          hardStops: [],
          mode: "Governed Shopify Dev Dashboard Browser Task",
          targetUrl: "https://dev.shopify.com/dashboard/stores"
        },
        countryCode: "US",
        expectedShopDomain: "iron-house-gym.myshopify.com",
        requestedShopName: "Iron House Gym",
        storeId: "ckzzzzzzzzzzzzzzzzzzzzzzz",
        storeType: "client_transfer"
      },
      receipt: {
        actualExternalActionsExecuted: true,
        attemptedStepIds: ["open_dev_dashboard_stores", "create_store_and_capture_domain"],
        autoCapture: null,
        autoCaptureError: null,
        browserTaskEvidence: {
          capturedAt: "2026-06-04T09:00:00.000Z",
          capturedFromTargetUrl: "https://dev.shopify.com/dashboard/stores",
          completedStepIds: ["open_dev_dashboard_stores", "create_store_and_capture_domain"],
          countryCode: "US",
          finalShopDomain: "iron-house-gym.myshopify.com",
          operatorOrSessionContext: "Governed Playwright task after create-store attempt.",
          source: "governed_browser_task",
          storeType: "client_transfer"
        },
        detectedDomain: "iron-house-gym.myshopify.com",
        externalExecution: true,
        hardStop: null,
        mode: "Governed Shopify Dev Dashboard Browser Task Receipt",
        providerContacted: true,
        status: "capture_ready",
        summary: "Shopify Dev Dashboard browser task found iron-house-gym.myshopify.com; capture can continue.",
        targetUrl: "https://dev.shopify.com/dashboard/stores"
      }
    });

    expect(captureInput).toMatchObject({
      browserTaskEvidence: {
        completedStepIds: ["open_dev_dashboard_stores", "create_store_and_capture_domain"],
        finalShopDomain: "iron-house-gym.myshopify.com",
        source: "governed_browser_task",
        storeType: "client_transfer"
      },
      countryCode: "US",
      queueAutonomyResume: true,
      requestedShopName: "Iron House Gym",
      shopDomain: "iron-house-gym.myshopify.com",
      startOAuth: true,
      storeType: "client_transfer"
    });
  });
});
