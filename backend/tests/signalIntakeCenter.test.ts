import { describe, expect, it } from "vitest";
import { buildSignalIntakePlan } from "../src/services/signalIntakeCenter.js";

const periodStart = "2026-05-26T00:00:00.000Z";
const periodEnd = "2026-06-02T00:00:00.000Z";

describe("Signal Intake Center", () => {
  it("normalizes approved read-only commerce, content, and payment signals", () => {
    const plan = buildSignalIntakePlan({
      generatedAt: "2026-06-02T12:00:00.000Z",
      incoming: {
        commerceSignals: [{
          externalReference: "etsy-ledger-row-1",
          grossRevenue: 240,
          periodEnd,
          periodStart,
          platformFees: 16,
          productionCost: 72,
          shippingCost: 24,
          source: "etsy",
          storeId: "store_1",
          unitsSold: 8,
          visits: 320
        }],
        contentSignals: [{
          channel: "youtube_shorts",
          clicks: 54,
          conversions: 5,
          externalReference: "shorts-row-1",
          periodEnd,
          periodStart,
          revenue: 110,
          source: "youtube",
          storeId: "store_1",
          views: 2400,
          watchSeconds: 31800
        }],
        paymentSignals: [{
          availableBalance: 180,
          fees: 8,
          paidOut: 0,
          pendingBalance: 64,
          periodEnd,
          periodStart,
          provider: "stripe"
        }]
      },
      stores: [{
        businessName: "Iron House Gym",
        id: "store_1",
        launchStatus: "Optimizing",
        storePlatform: "Etsy"
      }]
    });

    expect(plan.mode).toBe("Internal Signal Intake Center");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.totals.signals).toBe(3);
    expect(plan.totals.projectedGrossRevenue).toBe(240);
    expect(plan.totals.estimatedNetProfit).toBe(128);
    expect(plan.totals.projectedContentRevenue).toBe(110);
    expect(plan.totals.projectedAvailableBalance).toBe(180);
    expect(plan.normalized.commerceSnapshots[0]).toEqual(expect.objectContaining({
      netProfit: 128,
      source: "etsy",
      storeId: "store_1"
    }));
    expect(plan.normalized.contentSnapshots[0]).toEqual(expect.objectContaining({
      externalExecution: false,
      source: "youtube",
      views: 2400
    }));
    expect(plan.normalized.paymentReconciliationDrafts[0]).toEqual(expect.objectContaining({
      netBalanceDelta: 236,
      provider: "stripe",
      providerContacted: false,
      status: "record_only"
    }));
    expect(plan.blockedExternalActions).toContain("Moving money, creating transfers, creating payouts, changing bank accounts, or authorizing spend");
  });

  it("builds sample payloads from internal store references only", () => {
    const plan = buildSignalIntakePlan({
      products: [{
        id: "product_1",
        productName: "Command Tee",
        storeId: "store_1"
      }],
      stores: [{
        businessName: "Iron House Gym",
        id: "store_1",
        launchStatus: "Building Store",
        storePlatform: "Shopify"
      }]
    });

    expect(plan.samplePayloads?.commerceSignals?.[0]).toMatchObject({
      productId: "product_1",
      source: "shopify",
      storeId: "store_1"
    });
    expect(plan.samplePayloads?.paymentSignals?.[0]).toMatchObject({
      provider: "stripe"
    });
  });
});
