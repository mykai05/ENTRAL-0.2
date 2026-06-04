import { describe, expect, it } from "vitest";
import { buildShopifyStoreProvisioningPlan } from "../src/services/shopifyStoreProvisioning.js";

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

describe("shopifyStoreProvisioning", () => {
  it("prepares a Dev Dashboard provisioning packet when no Shopify shop is connected", () => {
    const plan = buildShopifyStoreProvisioningPlan({
      countryCode: "ca",
      generatedAt: "2026-06-04T09:00:00.000Z",
      ownerEmail: "owner@example.com",
      store: shopifyStore,
      storeId: "store-1",
      storeType: "client_transfer"
    });

    expect(plan.status).toBe("dev_dashboard_creation_required");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.devDashboardPacket).toMatchObject({
      countryCode: "CA",
      ownerEmail: "owner@example.com",
      requestedShopName: "Iron House Gym",
      shopDomainSuggestion: "iron-house-gym.myshopify.com",
      storeType: "client_transfer"
    });
    expect(plan.continuation).toMatchObject({
      nextAutonomousStep: "connect_existing_shop",
      readyForDraftExecutor: false
    });
    expect(plan.creationCapture).toMatchObject({
      expectedShopDomain: "iron-house-gym.myshopify.com",
      nextAutonomousStep: "create_store_in_dashboard",
      oauthStartEndpoint: "/api/v1/merch/stores/store-1/shopify-oauth/start",
      status: "capture_required"
    });
    expect(plan.creationCapture.oauthStartRequestDefaults).toMatchObject({
      confirm: "START SHOPIFY OAUTH",
      continueAfterApproval: true,
      countryCode: "CA",
      shopDomain: "iron-house-gym.myshopify.com",
      storeType: "client_transfer"
    });
    expect(plan.creationCapture.autonomyResumeJobRequestDefaults).toMatchObject({
      confirm: "QUEUE SHOPIFY AUTONOMY RESUME JOB",
      watchForConnection: true
    });
    expect(plan.creationHandoff).toMatchObject({
      automationJobEndpoint: "/api/v1/merch/stores/store-1/shopify-store-creation-handoff-job",
      expectedShopDomain: "iron-house-gym.myshopify.com",
      nextAutonomousStep: "queue_store_creation_handoff_job",
      status: "ready_to_queue",
      targetUrl: "https://dev.shopify.com/dashboard/stores"
    });
    expect(plan.creationHandoff.browserTask).toMatchObject({
      currentExecution: "not_started",
      mode: "Governed Shopify Dev Dashboard Browser Task",
      targetUrl: "https://dev.shopify.com/dashboard/stores"
    });
    expect(plan.creationHandoff.browserTask.allowedSteps.map((step) => step.id)).toEqual([
      "open_dev_dashboard_stores",
      "open_create_store_form",
      "select_store_type",
      "fill_store_name",
      "select_country",
      "create_store_and_capture_domain"
    ]);
    expect(plan.creationHandoff.browserTask.completionEvidence).toMatchObject({
      captureEndpoint: "/api/v1/merch/stores/store-1/shopify-store-creation-capture",
      nextAutonomousStep: "submit_shopify_store_creation_capture"
    });
    expect(plan.creationHandoff.browserTask.hardStops.join(" ")).toContain("MFA");
    expect(plan.creationHandoff.automationJobRequestDefaults).toMatchObject({
      confirm: "QUEUE SHOPIFY STORE CREATION HANDOFF JOB",
      queueBrowserTask: true,
      queueAutonomyResume: true,
      watchForConnection: true
    });
    expect(plan.creationHandoff.evidenceToCapture.join(" ")).toContain("Final myshopify.com domain");
    expect(plan.creationCapture.afterCreationChecklist.join(" ")).toContain("OAuth approval");
    expect(plan.officialApiSurface.createStoreMutationDocumented).toBe(false);
    expect(plan.blockedExternalActions.join(" ")).toContain("undocumented Partner API");
  });

  it("continues to the draft executor when an existing Shopify connection is available", () => {
    const plan = buildShopifyStoreProvisioningPlan({
      connections: [{
        apiVersion: "2026-04",
        connectedAt: new Date("2026-06-04T09:00:00.000Z"),
        id: "shopify-connection-1",
        lastUsedAt: null,
        scopes: ["write_products"],
        shopDomain: "iron-house.myshopify.com",
        status: "active",
        storeId: "store-1",
        tokenConfigured: true,
        tokenLastFour: "1234",
        updatedAt: new Date("2026-06-04T09:00:00.000Z")
      }],
      store: shopifyStore,
      storeId: "store-1"
    });

    expect(plan.status).toBe("connected_existing_shop");
    expect(plan.continuation).toMatchObject({
      nextAutonomousStep: "run_shopify_draft_executor",
      readyForDraftExecutor: true
    });
    expect(plan.creationCapture).toMatchObject({
      expectedShopDomain: "iron-house.myshopify.com",
      nextAutonomousStep: "run_shopify_draft_executor",
      status: "connected_shop_ready"
    });
    expect(plan.creationHandoff).toMatchObject({
      expectedShopDomain: "iron-house.myshopify.com",
      nextAutonomousStep: "run_shopify_draft_executor",
      status: "connected_shop_ready"
    });
    expect(plan.creationHandoff.browserTask.allowedSteps).toEqual([]);
    expect(plan.summary).toContain("already has a connected Shopify shop");
  });
});
