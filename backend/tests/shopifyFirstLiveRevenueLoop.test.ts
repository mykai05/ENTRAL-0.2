import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
});

const store = {
  approvalStatus: "Launch Approved" as const,
  audience: "local gym members",
  brandStyle: "bold premium gym typography",
  businessName: "Iron House Gym",
  clientName: "Iron House Gym",
  estimatedProfit: 0,
  id: "store_1",
  industry: "Fitness",
  launchStatus: "Building Store" as const,
  notes: null,
  podProvider: "Printify",
  productTypes: ["T-shirt", "Hoodie"],
  revenue: 0,
  storePlatform: "Shopify" as const
};

function product(index: number) {
  return {
    aiDisclosureNeeded: true,
    complianceNotes: "Original brand-owned artwork only.",
    designConcept: `Iron House launch concept ${index}`,
    designPrompt: `Create original Iron House Gym launch artwork ${index}.`,
    designTheme: `Launch Series ${index}`,
    estimatedProfit: 12,
    id: `product_${index}`,
    listingDescription: `Iron House launch product ${index}.`,
    listingTitle: `Iron House Launch Tee ${index}`,
    productName: `Iron House Launch Tee ${index}`,
    productType: "T-shirt",
    productionPartnerDisclosureNeeded: true,
    profitMargin: 38,
    retailPrice: 32,
    status: "Approved" as const,
    storeId: store.id,
    tags: ["iron house", "gym", "launch"]
  };
}

describe("Shopify first live revenue loop", () => {
  it("asks for internal products before Shopify draft execution", async () => {
    const { executeShopifyFirstLiveRevenueLoop } = await import("../src/services/shopifyFirstLiveRevenueLoop.js");
    const plan = await executeShopifyFirstLiveRevenueLoop({
      connectorApproval: false,
      dryRun: true,
      performanceSnapshots: [],
      products: [],
      store
    });

    expect(plan.status).toBe("needs_products");
    expect(plan.nextAutonomousStep).toBe("create_internal_product_batch");
    expect(plan.productReadiness.status).toBe("needs_products");
    expect(plan.providerContacted).toBe(false);
  });

  it("blocks live draft execution until Shopify credentials are connected", async () => {
    const { executeShopifyFirstLiveRevenueLoop } = await import("../src/services/shopifyFirstLiveRevenueLoop.js");
    const plan = await executeShopifyFirstLiveRevenueLoop({
      connectorApproval: true,
      dryRun: false,
      liveUnlockPhrase: "I APPROVE ENTRAL SHOPIFY DRAFT EXECUTION",
      performanceSnapshots: [],
      products: [product(1), product(2), product(3)],
      store
    });

    expect(plan.status).toBe("needs_shopify_connection");
    expect(plan.nextAutonomousStep).toBe("connect_or_create_shopify_store");
    expect(plan.todayLaunchWindow.blockers).toContain("Connect verified Shopify Admin credentials or complete store creation/OAuth capture.");
    expect(plan.externalExecution).toBe(false);
  });

  it("prepares the controlled Shopify draft when products are ready in dry run", async () => {
    const { executeShopifyFirstLiveRevenueLoop } = await import("../src/services/shopifyFirstLiveRevenueLoop.js");
    const plan = await executeShopifyFirstLiveRevenueLoop({
      connectorApproval: false,
      dryRun: true,
      performanceSnapshots: [],
      products: [product(1), product(2), product(3)],
      store
    });

    expect(plan.status).toBe("ready_for_draft_execution");
    expect(plan.nextAutonomousStep).toBe("run_controlled_shopify_draft");
    expect(plan.providerPackage.payloadCount).toBeGreaterThan(0);
    expect(plan.shopifyDraft.totals.readyActions).toBeGreaterThan(0);
    expect(plan.providerContacted).toBe(false);
  });
});
