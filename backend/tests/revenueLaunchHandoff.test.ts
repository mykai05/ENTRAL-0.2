import { describe, expect, it } from "vitest";
import { buildProviderPayloadApprovalPacket, buildProviderPayloadPackage } from "../src/services/merchProviderPayloads.js";
import { buildRevenueLaunchHandoffPlan } from "../src/services/revenueLaunchHandoff.js";
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

function readinessPlan(input: {
  approvals?: Parameters<typeof buildRevenueLaunchHandoffPlan>[0]["approvals"];
  providerPackage: ReturnType<typeof buildProviderPayloadPackage>;
}) {
  const launchPlan = buildRevenueLaunchPipeline({
    products,
    stores: [store]
  });
  const setupPlan = buildRevenueStoreSetupPlan({
    products,
    stores: [store]
  });

  return buildRevenueLaunchReadinessPlan({
    approvals: input.approvals,
    generatedAt: "2026-06-02T12:00:00.000Z",
    launchPlan,
    providerPayloads: [input.providerPackage],
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
}

describe("Revenue Launch Handoff Packet Builder", () => {
  it("builds internal handoff bundles from approved provider packets", () => {
    const providerPackage = buildProviderPayloadPackage({
      generatedAt: "2026-06-02T12:00:00.000Z",
      products,
      store: {
        ...store,
        podProvider: "Printify"
      },
      storeId: store.id
    });
    const packet = buildProviderPayloadApprovalPacket({
      createdAt: "2026-06-02T12:10:00.000Z",
      package: providerPackage,
      storeId: store.id
    });
    const approvals = [
      {
        createdAt: "2026-06-02T12:10:00.000Z",
        id: "approval_1",
        packet,
        requestAuditLogId: "audit_request",
        reviewAuditLogId: "audit_review",
        reviewedAt: "2026-06-02T12:30:00.000Z",
        status: "approved",
        storeId: store.id
      }
    ];
    const plan = buildRevenueLaunchHandoffPlan({
      approvals,
      generatedAt: "2026-06-02T13:00:00.000Z",
      providerPayloads: [providerPackage],
      readinessPlan: readinessPlan({ approvals, providerPackage })
    });

    expect(plan.mode).toBe("Internal Launch Handoff Packet Builder");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.totals.readyForManualHandoff).toBe(1);
    expect(plan.totals.bundlesPrepared).toBe(1);
    expect(plan.totals.manifestsPrepared).toBe(providerPackage.payloadCount);
    expect(plan.totals.artifactSlots).toBeGreaterThan(providerPackage.payloadCount);
    expect(plan.queue[0]).toMatchObject({
      action: "review_provider_handoff_bundle",
      externalExecution: false,
      storeName: "Signal Forge"
    });
    expect(plan.items[0].bundle?.requestManifest[0]).toMatchObject({
      executionState: "Locked - manual handoff only",
      provider: "Printify"
    });
    expect(plan.blockedExternalActions).toContain("Using stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, or platform evasion automation");
  });

  it("blocks handoff when approved provider approval evidence is missing", () => {
    const providerPackage = buildProviderPayloadPackage({
      products,
      store: {
        ...store,
        podProvider: "Printify"
      },
      storeId: store.id
    });
    const plan = buildRevenueLaunchHandoffPlan({
      providerPayloads: [providerPackage],
      readinessPlan: readinessPlan({ providerPackage })
    });

    expect(plan.totals.readyForManualHandoff).toBe(0);
    expect(plan.totals.blockedBundles).toBe(1);
    expect(plan.items[0]).toMatchObject({
      action: "request_provider_payload_approval",
      approvedPacketId: null,
      bundle: null,
      externalExecution: false,
      providerContacted: false,
      riskLevel: "high"
    });
    expect(plan.items[0].blockers.map((blocker) => blocker.code)).toContain("approved_packet_missing");
  });
});
