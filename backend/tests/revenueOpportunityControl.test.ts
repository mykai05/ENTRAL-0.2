import { describe, expect, it } from "vitest";
import {
  buildRevenueOpportunityControlPlan,
  evaluateRevenueOpportunityControlUpdate,
  type RevenueOpportunitySnapshot
} from "../src/services/revenueOpportunityControl.js";

const baseOpportunity: RevenueOpportunitySnapshot = {
  auditLogId: null,
  businessName: "Signal Forge",
  createdAt: "2026-06-02T12:00:00.000Z",
  externalExecution: false,
  id: "revenue_opp_1",
  idea: "Private operator merch line",
  providerContacted: false,
  sourceKey: "signal-forge",
  status: "active",
  store: {
    approvalStatus: "Launch Approved",
    businessName: "Signal Forge",
    estimatedProfit: 180,
    id: "store_1",
    launchStatus: "Awaiting Approval",
    products: [
      {
        estimatedProfit: 28,
        id: "product_1",
        productName: "Signal Forge Tee",
        productType: "T-shirt",
        profitMargin: 52,
        status: "Approved"
      },
      {
        estimatedProfit: 20,
        id: "product_2",
        productName: "Signal Forge Sticker",
        productType: "Sticker",
        profitMargin: 70,
        status: "Approved"
      },
      {
        estimatedProfit: 34,
        id: "product_3",
        productName: "Signal Forge Notebook",
        productType: "Notebook",
        profitMargin: 48,
        status: "Listing Drafted"
      },
      {
        estimatedProfit: 22,
        id: "product_4",
        productName: "Signal Forge Poster",
        productType: "Poster",
        profitMargin: 44,
        status: "Listing Drafted"
      },
      {
        estimatedProfit: 18,
        id: "product_5",
        productName: "Signal Forge Mug",
        productType: "Mug",
        profitMargin: 38,
        status: "Listing Drafted"
      }
    ],
    revenue: 0,
    storePlatform: "Etsy"
  },
  storeId: "store_1",
  totals: {},
  updatedAt: "2026-06-02T12:00:00.000Z"
};

describe("Revenue Opportunity Control Center", () => {
  it("scores a launch-ready opportunity for internal provider handoff without external execution", () => {
    const plan = buildRevenueOpportunityControlPlan({
      generatedAt: "2026-06-02T12:00:00.000Z",
      opportunities: [baseOpportunity],
      performanceSnapshots: [
        {
          grossRevenue: 120,
          id: "snapshot_1",
          netProfit: 80,
          periodEnd: "2026-06-02T00:00:00.000Z",
          productId: "product_1",
          storeId: "store_1"
        }
      ]
    });

    expect(plan.mode).toBe("Internal Revenue Opportunity Control Center");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.totals.readyForHandoff).toBe(1);
    expect(plan.opportunities[0]).toMatchObject({
      recommendedStatus: "ready_for_handoff",
      stage: "provider_handoff_ready",
      status: "active"
    });
    expect(plan.opportunities[0].controlActions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        enabled: true,
        status: "ready_for_handoff"
      })
    ]));
    expect(plan.blockedExternalActions).toContain("Using stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, or platform evasion automation");
  });

  it("blocks premature handoff status changes until readiness thresholds are met", () => {
    const plan = buildRevenueOpportunityControlPlan({
      opportunities: [{
        ...baseOpportunity,
        store: {
          ...baseOpportunity.store!,
          products: baseOpportunity.store!.products.slice(0, 1)
        }
      }],
      performanceSnapshots: []
    });
    const item = plan.opportunities[0];
    const evaluation = evaluateRevenueOpportunityControlUpdate({
      item,
      toStatus: "ready_for_handoff"
    });

    expect(item.stage).toBe("listing_optimization");
    expect(item.blockers.map((blocker) => blocker.code)).toEqual(expect.arrayContaining([
      "thin_product_portfolio",
      "listing_readiness_gap",
      "approval_gap"
    ]));
    expect(evaluation.allowed).toBe(false);
    expect(evaluation.externalExecution).toBe(false);
    expect(evaluation.providerContacted).toBe(false);
  });
});
