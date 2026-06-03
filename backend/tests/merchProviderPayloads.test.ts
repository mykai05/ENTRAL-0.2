import { describe, expect, it } from "vitest";
import { buildProviderHandoffBundle, buildProviderPayloadApprovalPacket, buildProviderPayloadPackage, isProviderPayloadApprovalPacket } from "../src/services/merchProviderPayloads.js";
import type { MerchProductSnapshot, MerchStoreSnapshot } from "../src/services/merchReports.js";

const store: MerchStoreSnapshot = {
  approvalStatus: "Listings Approved",
  audience: "independent gym members",
  brandStyle: "bold black-and-green training aesthetic",
  businessName: "Iron House Gym",
  clientName: "Iron House",
  estimatedProfit: 220,
  industry: "fitness",
  launchStatus: "Awaiting Approval",
  podProvider: "Printify",
  productTypes: ["T-shirt", "Hoodie"],
  revenue: 0,
  storePlatform: "Shopify"
};

function product(input: Partial<MerchProductSnapshot> = {}): MerchProductSnapshot {
  return {
    aiDisclosureNeeded: true,
    complianceNotes: "Compliance reviewed internally.",
    designConcept: "Original gym typography.",
    designPrompt: "Create original gym artwork without protected marks.",
    estimatedProfit: 14,
    listingDescription: "Original training merch for independent gym members.",
    listingTitle: "Iron House Core Tee",
    productName: "Iron House Core Tee",
    productType: "T-shirt",
    productionPartnerDisclosureNeeded: true,
    retailPrice: 34,
    status: "Approved",
    tags: ["fitness", "training", "gym"],
    ...input
  };
}

describe("merch provider payload package", () => {
  it("builds locked provider payloads for approved products only", () => {
    const packageResult = buildProviderPayloadPackage({
      generatedAt: "2026-06-02T12:00:00.000Z",
      products: [
        product(),
        product({ productName: "Draft Hoodie", status: "Awaiting Approval" })
      ],
      store,
      storeId: "store_1"
    });

    expect(packageResult.mode).toBe("Locked Provider Payload Package");
    expect(packageResult.providerContacted).toBe(false);
    expect(packageResult.externalExecution).toBe(false);
    expect(packageResult.adapterCoverage).toEqual(["Printify", "Shopify"]);
    expect(packageResult.productPayloads).toHaveLength(2);
    expect(packageResult.productPayloads[0].productName).toBe("Iron House Core Tee");
    expect(packageResult.productPayloads[0].payloads.map((payload) => payload.provider)).toEqual(["Printify", "Shopify"]);
    expect(packageResult.productPayloads[0].payloads.every((payload) => payload.status === "Draft - not sent")).toBe(true);
    expect(packageResult.productPayloads[0].payloads[0].headers.authorization).toContain("<PRINTIFY_TOKEN>");
    expect(packageResult.productPayloads[1]).toMatchObject({
      productName: "Iron House Gym Launch Collection",
      productType: "Store collection"
    });
    expect(packageResult.blockedActions).toContain("Sending provider API requests");
  });

  it("supports alternate providers and explicitly warns on unapproved inspection", () => {
    const packageResult = buildProviderPayloadPackage({
      options: {
        includeUnapproved: true,
        maxProducts: 2
      },
      products: [
        product({ productName: "Approved Poster", productType: "Poster" }),
        product({ productName: "Inspection Draft", status: "Listing Drafted" })
      ],
      store: {
        ...store,
        podProvider: "Other",
        storePlatform: "Etsy"
      },
      storeId: "store_2"
    });

    expect(packageResult.adapterCoverage).toEqual(["Printify", "Printful", "Etsy"]);
    expect(packageResult.productPayloads[0].payloads.map((payload) => payload.provider)).toEqual(["Printify", "Printful", "Etsy"]);
    expect(packageResult.productPayloads[1].productName).toBe("Inspection Draft");
    expect(packageResult.warnings.join(" ")).toContain("Unapproved products were included");
  });

  it("turns locked payloads into provider approval packets without execution", () => {
    const packageResult = buildProviderPayloadPackage({
      generatedAt: "2026-06-02T12:00:00.000Z",
      products: [product()],
      store,
      storeId: "store_1"
    });
    const packet = buildProviderPayloadApprovalPacket({
      createdAt: "2026-06-02T13:00:00.000Z",
      note: "Review provider payload scopes before connector setup.",
      package: packageResult,
      scheduledFor: "2026-06-03T16:00:00.000Z",
      storeId: "store_1"
    });

    expect(packet.mode).toBe("Mock Mode");
    expect(packet.status).toBe("Pending approval");
    expect(packet.humanApprovalRequired).toBe(true);
    expect(packet.actions).toHaveLength(packageResult.payloadCount);
    expect(packet.actions.every((action) => action.channel === "Provider")).toBe(true);
    expect(packet.actions.every((action) => action.executionState === "Locked - no external action")).toBe(true);
    expect(packet.actions[0].requiredControls).toContain("credential owner approval");
    expect(packet.actions[0].requiredControls).toContain("rollback checklist approval");
    expect(packet.providerPayloadPackage).toMatchObject({
      adapterCoverage: ["Printify", "Shopify"],
      payloadCount: packageResult.payloadCount,
      readinessScore: packageResult.readinessScore
    });
    expect(packet.rollbackChecklist.join(" ")).toContain("draft or unpublished");
    expect(packet.auditEvents.join(" ")).toContain("No provider API request was sent");
    expect(packageResult.providerContacted).toBe(false);
    expect(packageResult.externalExecution).toBe(false);
    expect(isProviderPayloadApprovalPacket(packet)).toBe(true);
  });

  it("builds export-ready provider handoff bundles from approved packets", () => {
    const packageResult = buildProviderPayloadPackage({
      generatedAt: "2026-06-02T12:00:00.000Z",
      products: [product()],
      store,
      storeId: "store_1"
    });
    const packet = buildProviderPayloadApprovalPacket({
      createdAt: "2026-06-02T13:00:00.000Z",
      package: packageResult,
      storeId: "store_1"
    });
    const bundle = buildProviderHandoffBundle({
      approvalId: "packet_1",
      generatedAt: "2026-06-02T14:00:00.000Z",
      package: packageResult,
      packet,
      reviewedAt: "2026-06-02T13:30:00.000Z",
      reviewAuditLogId: "audit_review_1"
    });

    expect(bundle.mode).toBe("Provider Handoff Bundle");
    expect(bundle.providerContacted).toBe(false);
    expect(bundle.externalExecution).toBe(false);
    expect(bundle.approvedPacketId).toBe("packet_1");
    expect(bundle.reviewAuditLogId).toBe("audit_review_1");
    expect(bundle.requestManifest).toHaveLength(packageResult.payloadCount);
    expect(bundle.requestManifest[0]).toMatchObject({
      executionState: "Locked - manual handoff only",
      method: "POST",
      provider: "Printify"
    });
    expect(bundle.requestManifest[0].bodyJson).toContain("blueprint_id");
    expect(bundle.requestManifest[0].artifactSlots.map((slot) => slot.label)).toContain("Approved design asset");
    expect(bundle.connectorReadiness.status).toBe("Ready for manual handoff");
    expect(bundle.drift.payloadCountMatches).toBe(true);
    expect(bundle.manualLaunchChecklist.join(" ")).toContain("separate final publish approval");
    expect(bundle.rollbackChecklist.join(" ")).toContain("delete/archive");
  });
});
