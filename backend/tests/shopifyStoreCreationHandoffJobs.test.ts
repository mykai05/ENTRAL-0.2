import { beforeEach, describe, expect, it, vi } from "vitest";

const shopifyStore = {
  approvalStatus: "Launch Approved",
  audience: "strength athletes",
  brandStyle: "industrial training",
  businessName: "Iron House Gym",
  clientName: "Iron House",
  estimatedProfit: 120,
  industry: "Fitness",
  launchStatus: "Building Store",
  podProvider: "Printify",
  productTypes: ["T-shirt"],
  revenue: 0,
  storePlatform: "Shopify"
};

function resetEnv() {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
}

describe("Shopify Store Creation Handoff Jobs", () => {
  beforeEach(resetEnv);

  it("turns a waiting handoff receipt into a capture review packet", async () => {
    const { buildShopifyStoreProvisioningPlan } = await import("../src/services/shopifyStoreProvisioning.js");
    const { buildShopifyStoreCreationHandoffApprovalPacket } = await import("../src/services/shopifyStoreCreationHandoffJobs.js");
    const plan = buildShopifyStoreProvisioningPlan({
      countryCode: "US",
      generatedAt: "2026-06-04T09:00:00.000Z",
      ownerEmail: "owner@example.com",
      requestedShopName: "Iron House Gym",
      store: shopifyStore,
      storeId: "store-1",
      storeType: "client_transfer"
    });
    const packet = buildShopifyStoreCreationHandoffApprovalPacket({
      createdAt: "2026-06-04T09:01:00.000Z",
      note: "Queued by test",
      plan,
      receipt: {
        actualExternalActionsExecuted: false,
        automationJobId: "automation-job-1",
        browserTaskJob: {
          id: "browser-task-job-1",
          scheduledAt: null,
          status: "pending",
          type: "shopify_store_creation_browser_task"
        },
        browserTask: plan.creationHandoff.browserTask,
        captureEndpoint: "/api/v1/merch/stores/store-1/shopify-store-creation-capture",
        evidenceToCapture: plan.creationHandoff.evidenceToCapture,
        externalExecution: false,
        mode: "Shopify Store Creation Handoff Job",
        nextAutonomousStep: "capture_shopify_store_creation",
        providerContacted: false,
        resumeJob: {
          connectionWatch: {
            attempt: 0,
            enabled: true,
            intervalMinutes: 15,
            maxAttempts: 24
          },
          id: "resume-job-1",
          scheduledAt: null,
          status: "scheduled",
          type: "shopify_autonomy_resume"
        },
        status: "waiting_for_dashboard_capture",
        summary: "Waiting for dashboard capture.",
        targetUrl: plan.creationHandoff.targetUrl
      },
      storeId: "store-1"
    });

    expect(packet).toMatchObject({
      businessName: "Iron House Gym",
      humanApprovalRequired: true,
      mode: "Mock Mode",
      shopifyStoreCreation: {
        automationJobId: "automation-job-1",
        browserTaskJobId: "browser-task-job-1",
        browserTaskJobStatus: "pending",
        browserTask: {
          completionEvidence: {
            captureEndpoint: "/api/v1/merch/stores/store-1/shopify-store-creation-capture"
          },
          mode: "Governed Shopify Dev Dashboard Browser Task"
        },
        captureEndpoint: "/api/v1/merch/stores/store-1/shopify-store-creation-capture",
        expectedShopDomain: "iron-house-gym.myshopify.com",
        nextStep: "capture_shopify_store_creation",
        resumeJobId: "resume-job-1",
        resumeJobStatus: "scheduled",
        status: "waiting_for_dashboard_capture",
        targetUrl: "https://dev.shopify.com/dashboard/stores"
      },
      status: "Pending approval",
      storeId: "store-1"
    });
    expect(packet?.actions[0]).toMatchObject({
      channel: "Shopify",
      executionState: "Locked - no external action",
      title: "Capture Shopify store domain"
    });
    expect(packet?.shopifyStoreCreation.evidenceToCapture.join(" ")).toContain("Final myshopify.com domain");
    expect(packet?.shopifyStoreCreation.browserTask.allowedSteps.map((step) => step.id)).toContain("create_store_and_capture_domain");
    expect(packet?.blockedActions.join(" ")).toContain("protected Shopify login flows");
  });

  it("does not queue a capture packet when handoff is not waiting for domain capture", async () => {
    const { buildShopifyStoreProvisioningPlan } = await import("../src/services/shopifyStoreProvisioning.js");
    const { buildShopifyStoreCreationHandoffApprovalPacket } = await import("../src/services/shopifyStoreCreationHandoffJobs.js");
    const plan = buildShopifyStoreProvisioningPlan({
      connectedShopDomain: "iron-house.myshopify.com",
      store: shopifyStore,
      storeId: "store-1"
    });

    expect(buildShopifyStoreCreationHandoffApprovalPacket({
      plan,
      receipt: {
        actualExternalActionsExecuted: false,
        automationJobId: "automation-job-1",
        browserTaskJob: null,
        browserTask: plan.creationHandoff.browserTask,
        captureEndpoint: "/api/v1/merch/stores/store-1/shopify-store-creation-capture",
        evidenceToCapture: [],
        externalExecution: false,
        mode: "Shopify Store Creation Handoff Job",
        nextAutonomousStep: "run_shopify_draft_executor",
        providerContacted: false,
        resumeJob: null,
        status: "connection_ready",
        summary: "Connection ready.",
        targetUrl: plan.creationHandoff.targetUrl
      },
      storeId: "store-1"
    })).toBeNull();
  });
});
