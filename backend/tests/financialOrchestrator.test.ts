import { describe, expect, it } from "vitest";
import { buildFinancialOrchestratorPlan } from "../src/services/financialOrchestrator.js";
import type { RevenueAssetPortfolio } from "../src/services/revenueEngine.js";
import { normalizeRevenuePerformanceSnapshot } from "../src/services/revenuePerformance.js";

const store = {
  approvalStatus: "Approved",
  audience: "Strength athletes",
  brandStyle: "Industrial",
  businessName: "Iron House Gym",
  clientName: "Iron House",
  estimatedProfit: 120,
  id: "store-1",
  industry: "Fitness",
  launchStatus: "Optimizing",
  productTypes: ["T-Shirt"],
  revenue: 500,
  storePlatform: "Shopify"
} as const;

const product = {
  aiDisclosureNeeded: false,
  designConcept: "Core tee",
  designPrompt: "Bold gym tee",
  estimatedProfit: 42,
  id: "product-1",
  listingTitle: "Core Tee",
  productName: "Core Tee",
  productType: "T-Shirt",
  productionPartnerDisclosureNeeded: true,
  profitMargin: 58,
  retailPrice: 32,
  status: "Published",
  storeId: "store-1",
  tags: ["gym", "strength"]
} as const;

function portfolio(): RevenueAssetPortfolio {
  return {
    assets: [{
      assetId: "product-1",
      assetName: "Core Tee",
      assetScore: {
        economicsScore: 42,
        finalRank: 88,
        readinessScore: 32,
        riskPenalty: 0,
        velocity: 14
      },
      assetType: "product",
      confidence: 94,
      economics: {
        estimatedProfit: 42,
        profitMargin: 58,
        retailValue: 32,
        revenue: 500
      },
      evidence: ["Published product with strong profit velocity."],
      externalExecution: false,
      nextInternalState: null,
      performance: {
        action: "scale",
        confidence: 90,
        conversionRate: 3.5,
        evidenceGrade: "strong",
        grossRevenue: 500,
        netProfit: 300,
        netRevenue: 420,
        profitMargin: 60,
        profitVelocity: 28.57,
        reason: "Strong product performance.",
        revenueVelocity: 71.43,
        snapshots: 4,
        sourceAction: "scale"
      },
      priority: 10,
      providerContacted: false,
      readiness: {
        status: "Published"
      },
      reason: "Validated scale asset with strong product evidence.",
      recommendation: "scale",
      riskLevel: "low",
      rotationDecision: "scale",
      rotationReason: "Scale winner.",
      score: 88,
      scoreBand: "excellent",
      storeId: "store-1",
      storeName: "Iron House Gym"
    }],
    auditEvents: [],
    blockedExternalActions: [],
    externalExecution: false,
    generatedAt: "2026-06-03T00:00:00.000Z",
    mode: "Revenue Asset Portfolio",
    providerContacted: false,
    rotationChanges: [],
    summary: "1 asset scored.",
    totals: {
      assets: 1,
      kill: 0,
      pause: 0,
      profitVelocity: 28.57,
      revenueVelocity: 71.43,
      scale: 1,
      trackedAssets: 1,
      watch: 0
    }
  } as unknown as RevenueAssetPortfolio;
}

describe("Financial Orchestrator", () => {
  it("locks profit to 25/25/50 and makes limited Ad/Growth capital organic-first", () => {
    const plan = buildFinancialOrchestratorPlan({
      assetPortfolio: portfolio(),
      generatedAt: "2026-06-03T00:00:00.000Z",
      ownerId: "user-1",
      products: [product],
      snapshots: [normalizeRevenuePerformanceSnapshot({
        grossRevenue: 500,
        id: "snapshot-1",
        netProfit: 300,
        periodEnd: "2026-06-03T00:00:00.000Z",
        periodStart: "2026-05-27T00:00:00.000Z",
        productId: "product-1",
        source: "manual",
        storeId: "store-1",
        unitsSold: 10,
        visits: 300
      })],
      stores: [store]
    });

    expect(plan.splitPolicy).toMatchObject({
      adGrowthPercent: 25,
      entralOperationsPercent: 25,
      ownerPercent: 50,
      status: "balanced",
      totalPercent: 100
    });
    expect(plan.totals).toMatchObject({
      adGrowthAmount: 75,
      entralOperationsAmount: 75,
      ownerAmount: 150
    });
    expect(plan.adGrowthAllocation.mode).toBe("organic_first");
    expect(plan.adGrowthAllocation.organicFirstAmount).toBe(75);
    expect(plan.adGrowthAllocation.paidScaleReviewAmount).toBe(0);
    expect(plan.scalingBudgetQueue[0]).toMatchObject({
      allocationLane: "organic_growth",
      organicFirst: true,
      recommendedChannel: "organic_content",
      spendPriority: "no_spend"
    });
    expect(plan.scalingBudgetQueue[0]?.approvalGate.reason).toContain("no-spend");
  });
});
