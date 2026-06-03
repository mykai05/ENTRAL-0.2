import { describe, expect, it } from "vitest";
import {
  buildRevenueAssetPortfolio,
  buildRevenueEnginePlan,
  type RevenueEngineProductSnapshot,
  type RevenueEngineStoreSnapshot
} from "../src/services/revenueEngine.js";
import { buildRevenueMoneyArmyGenerateScoreBatchPlan } from "../src/services/revenueMoneyArmyGenerateScoreBatch.js";

const store: RevenueEngineStoreSnapshot = {
  approvalStatus: "Launch Approved",
  audience: "independent gym members and local training clients",
  brandStyle: "bold black-and-green training aesthetic",
  businessName: "Iron House Gym",
  clientName: "Iron House",
  estimatedProfit: 480,
  id: "store_scale",
  industry: "fitness",
  launchStatus: "Optimizing",
  productTypes: ["T-shirt", "Hoodie", "Sticker"],
  revenue: 1200,
  storePlatform: "Shopify"
};

function product(input: Partial<RevenueEngineProductSnapshot> & { id: string }): RevenueEngineProductSnapshot {
  return {
    aiDisclosureNeeded: true,
    complianceNotes: "Original internal merch draft. Verify trademarks before publishing.",
    designConcept: "Original typography for a brand-owned merch lane.",
    designPrompt: "Create original art with no protected marks or copied work.",
    designTheme: "Original operator series",
    estimatedProfit: 16,
    id: input.id,
    listingDescription: "Original product listing.",
    listingTitle: "Original Product",
    productName: "Original Product",
    productType: "T-shirt",
    productionPartnerDisclosureNeeded: true,
    profitMargin: 42,
    retailPrice: 38,
    status: "Approved",
    storeId: store.id,
    tags: ["original", "fitness"],
    ...input
  };
}

describe("Revenue Money Army Generate & Score Batch", () => {
  it("generates 10-50 internal candidates and scores each through the rotation engine", () => {
    const products = [
      product({ id: "product-source-1", productName: "Core Tee" }),
      product({ id: "product-source-2", productName: "Operator Hoodie", productType: "Hoodie", retailPrice: 58 })
    ];
    const currentPortfolio = buildRevenueAssetPortfolio(buildRevenueEnginePlan({
      generatedAt: "2026-06-02T12:00:00.000Z",
      products,
      stores: [store]
    }));
    const plan = buildRevenueMoneyArmyGenerateScoreBatchPlan({
      currentPortfolio,
      options: {
        candidateCount: 12,
        generatedAt: "2026-06-02T12:30:00.000Z",
        riskTolerance: "Low"
      },
      products,
      stores: [store]
    });

    expect(plan).toMatchObject({
      externalExecution: false,
      mode: "Money Army Generate & Score Batch",
      providerContacted: false,
      totals: {
        generated: 12,
        requested: 12,
        sourceStores: 1
      }
    });
    expect(plan.candidates).toHaveLength(12);
    expect(plan.rotationRecommendations).toHaveLength(12);
    expect(plan.candidates.every((candidate) => (
      candidate.auditOnly
      && candidate.externalExecution === false
      && candidate.providerContacted === false
      && candidate.organicContentTieIn.approvalState === "internal_draft_only"
    ))).toBe(true);
    expect(plan.rotationRecommendations.every((recommendation) => (
      ["scale", "watch", "pause", "kill"].includes(recommendation.recommendation)
    ))).toBe(true);
    expect(plan.currentPortfolio.totals.assets).toBeGreaterThan(0);
    expect(plan.firstBusinessLaunchPackage).toMatchObject({
      externalExecution: false,
      mode: "First Business Launch Package",
      providerContacted: false,
      status: expect.any(String)
    });
    expect(plan.firstBusinessLaunchPackage?.products.length).toBeGreaterThanOrEqual(5);
    expect(plan.firstBusinessLaunchPackage?.products.length).toBeLessThanOrEqual(10);
    expect(plan.firstBusinessLaunchPackage?.products[0]?.internalDesignDraft).toMatchObject({
      aiProviderUsed: false,
      externalGeneration: false,
      providerContacted: false
    });
    expect(plan.firstBusinessLaunchPackage?.products[0]?.internalDesignDraft.assetChecklist.length).toBeGreaterThan(0);
    expect(plan.firstBusinessLaunchPackage?.contentIdeas.length).toBeGreaterThan(0);
    expect(plan.firstBusinessLaunchPackage?.organicFirstMoves.length).toBeGreaterThan(0);
    expect(plan.firstBusinessLaunchPackage?.approvalChecklist.map((item) => item.category)).toContain("designs");
    expect(plan.firstBusinessLaunchPackage?.manualApprovalGates.join(" ")).toContain("Approve");
    expect(plan.scalePressure.pressureScore).toBeGreaterThanOrEqual(0);
    expect(plan.killPressure.pressureScore).toBeGreaterThanOrEqual(0);
    expect(plan.blockedExternalActions).toContain("Posting faceless content externally");
  });
});
