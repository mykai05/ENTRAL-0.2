import { describe, expect, it } from "vitest";
import { buildProviderPayloadApprovalPacket, buildProviderPayloadPackage } from "../src/services/merchProviderPayloads.js";
import { buildRevenueLaunchPipeline } from "../src/services/revenueLaunchPipeline.js";
import { buildRevenueLaunchReadinessPlan } from "../src/services/revenueLaunchReadiness.js";
import { buildRevenueStoreSetupPlan } from "../src/services/revenueStoreSetup.js";
import type { RevenueEngineProductSnapshot, RevenueEngineStoreSnapshot } from "../src/services/revenueEngine.js";

const store: RevenueEngineStoreSnapshot = {
  approvalStatus: "Launch Approved",
  audience: "private operators",
  brandStyle: "minimal operational",
  businessName: "Signal Forge",
  clientName: "ENTRAL Private Revenue",
  estimatedProfit: 300,
  id: "store_1",
  industry: "security technology",
  launchStatus: "Building Store",
  productTypes: ["T-shirt", "Sticker", "Notebook"],
  revenue: 0,
  storePlatform: "Etsy"
};

function product(index: number): RevenueEngineProductSnapshot {
  return {
    aiDisclosureNeeded: true,
    complianceNotes: "Compliance warnings are operational risk signals only and are not legal advice.",
    designConcept: "Original internal operator design.",
    designPrompt: "Create original launch artwork with no protected marks.",
    designTheme: "Signal Forge launch series",
    estimatedProfit: 24,
    id: `product_${index}`,
    listingDescription: `Approved launch listing ${index}.`,
    listingTitle: `Signal Forge Product ${index}`,
    productName: `Signal Forge Product ${index}`,
    productType: index % 2 === 0 ? "T-shirt" : "Sticker",
    productionPartnerDisclosureNeeded: true,
    profitMargin: 55,
    retailPrice: 42,
    status: "Approved",
    storeId: store.id,
    tags: ["signal", "forge", "operator"]
  };
}

const products = Array.from({ length: 5 }, (_, index) => product(index + 1));

describe("Revenue Launch Readiness Board", () => {
  it("ranks approved provider packets as handoff-ready without external execution", () => {
    const launchPlan = buildRevenueLaunchPipeline({
      products,
      stores: [store]
    });
    const setupPlan = buildRevenueStoreSetupPlan({
      products,
      stores: [store]
    });
    const providerPackage = buildProviderPayloadPackage({
      products,
      store: {
        ...store,
        podProvider: "Printify"
      },
      storeId: store.id
    });
    const packet = buildProviderPayloadApprovalPacket({
      package: providerPackage,
      storeId: store.id
    });
    const plan = buildRevenueLaunchReadinessPlan({
      approvals: [
        {
          createdAt: "2026-06-02T12:00:00.000Z",
          id: "approval_1",
          packet,
          requestAuditLogId: "audit_request",
          reviewAuditLogId: "audit_review",
          reviewedAt: "2026-06-02T12:30:00.000Z",
          status: "approved",
          storeId: store.id
        }
      ],
      generatedAt: "2026-06-02T12:00:00.000Z",
      launchPlan,
      providerPayloads: [providerPackage],
      setupPlan,
      stores: [{
        approvalStatus: store.approvalStatus,
        businessName: store.businessName,
        estimatedProfit: store.estimatedProfit,
        id: store.id,
        launchStatus: store.launchStatus,
        productTypes: store.productTypes,
        revenue: store.revenue,
        storePlatform: store.storePlatform
      }]
    });

    expect(plan.mode).toBe("Internal Launch Readiness Board");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.totals.handoffReadyStores).toBe(1);
    expect(plan.totals.approvedProviderPackets).toBe(1);
    expect(plan.stores[0]).toMatchObject({
      nextInternalAction: "generate_provider_handoff",
      stage: "handoff_ready"
    });
    expect(plan.blockedExternalActions).toContain("Using stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, or platform evasion automation");
  });

  it("surfaces high-risk blockers when provider payloads are missing", () => {
    const launchPlan = buildRevenueLaunchPipeline({
      products: [],
      stores: [store]
    });
    const setupPlan = buildRevenueStoreSetupPlan({
      products: [],
      stores: [store]
    });
    const plan = buildRevenueLaunchReadinessPlan({
      launchPlan,
      providerPayloads: [],
      setupPlan,
      stores: [{
        approvalStatus: store.approvalStatus,
        businessName: store.businessName,
        estimatedProfit: store.estimatedProfit,
        id: store.id,
        launchStatus: store.launchStatus,
        productTypes: store.productTypes,
        revenue: store.revenue,
        storePlatform: store.storePlatform
      }]
    });

    expect(plan.totals.blockedStores).toBe(1);
    expect(plan.stores[0].stage).toBe("blocked");
    expect(plan.stores[0].blockers.map((blocker) => blocker.code)).toContain("no_provider_payloads");
    expect(plan.stores[0].externalExecution).toBe(false);
  });
});
