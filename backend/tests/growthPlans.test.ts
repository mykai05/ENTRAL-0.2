import { describe, expect, it } from "vitest";
import { buildGrowthApprovalPacket, buildGrowthOrchestrationPreview, buildGrowthPlan } from "../src/services/growthPlans.js";
import type { MerchProductSnapshot, MerchStoreSnapshot } from "../src/services/merchReports.js";

const store: MerchStoreSnapshot = {
  approvalStatus: "Listings Approved",
  audience: "independent gym members",
  brandStyle: "bold black-and-green training aesthetic",
  businessName: "Iron House Gym",
  clientName: "Iron House",
  estimatedProfit: 420,
  industry: "fitness",
  launchStatus: "Awaiting Approval",
  notes: "Launch is waiting on final owner review.",
  productTypes: ["T-shirt", "Hoodie"],
  revenue: 0,
  storePlatform: "Shopify"
};

const products: MerchProductSnapshot[] = [
  {
    aiDisclosureNeeded: true,
    complianceNotes: null,
    designConcept: "Barbell crest",
    designPrompt: "Create a bold barbell crest design.",
    estimatedProfit: 14,
    listingDescription: "Approved gym shirt draft.",
    listingTitle: "Iron House Barbell Crest Tee",
    productName: "Barbell Crest Tee",
    productType: "T-shirt",
    productionPartnerDisclosureNeeded: true,
    retailPrice: 32,
    status: "Approved",
    tags: ["gym", "barbell"]
  },
  {
    aiDisclosureNeeded: false,
    complianceNotes: "Trademark review required.",
    designConcept: "Local motto",
    designPrompt: "Create a local motto hoodie.",
    estimatedProfit: 20,
    listingDescription: "Pending hoodie draft.",
    listingTitle: "Iron House Local Hoodie",
    productName: "Local Hoodie",
    productType: "Hoodie",
    productionPartnerDisclosureNeeded: true,
    retailPrice: 54,
    status: "Awaiting Approval",
    tags: ["hoodie"]
  }
];

describe("growth plans", () => {
  it("builds mock growth plans with locked execution paths", () => {
    const plan = buildGrowthPlan(store, products);

    expect(plan.mode).toBe("Mock Mode");
    expect(plan.summary).toContain("1 approved product");
    expect(plan.readinessScore).toBeGreaterThan(0);
    expect(plan.contentDrafts[0]).toMatchObject({
      approvalStatus: "Draft - needs approval",
      channel: "Social"
    });
    expect(plan.adCampaignDrafts.every((campaign) => campaign.status === "Draft - spend locked")).toBe(true);
    expect(plan.approvalQueue).toEqual(expect.arrayContaining([
      "Approve ad platform, budget, schedule, targeting, and creative before spend."
    ]));
    expect(plan.blockedActions).toEqual(expect.arrayContaining([
      "Publishing social posts",
      "Starting paid ad spend",
      "Updating Shopify or marketplace listings"
    ]));
    expect(plan.auditEvents.join(" ")).toContain("No social platform, commerce platform, ad account, or analytics provider was contacted.");
  });

  it("queues growth approval packets as logged, locked review work", () => {
    const packet = buildGrowthApprovalPacket({
      createdAt: "2026-06-01T12:30:00.000Z",
      note: "Review this in the Monday growth meeting.",
      products,
      scheduledFor: "2026-06-03T16:00:00.000Z",
      store,
      storeId: "store_iron_house"
    });

    expect(packet).toMatchObject({
      businessName: "Iron House Gym",
      costGuardrail: expect.stringContaining("External ad spend is $0"),
      humanApprovalRequired: true,
      mode: "Mock Mode",
      scheduledFor: "2026-06-03T16:00:00.000Z",
      status: "Pending approval",
      storeId: "store_iron_house"
    });
    expect(packet.actions.length).toBeGreaterThanOrEqual(4);
    expect(packet.actions.every((action) => action.approvalStatus === "Pending human approval")).toBe(true);
    expect(packet.actions.every((action) => action.executionState === "Locked - no external action")).toBe(true);
    expect(packet.actions.flatMap((action) => action.requiredControls)).toEqual(expect.arrayContaining([
      "budget approval",
      "final user sign-off",
      "read-only data scope"
    ]));
    expect(packet.auditEvents.join(" ")).toContain("No social platform, commerce platform, ad account, or analytics provider was contacted.");
    expect(packet.summary).toContain("will not publish");
  });

  it("builds read-only orchestration previews for approved packets", () => {
    const packet = buildGrowthApprovalPacket({
      createdAt: "2026-06-01T12:30:00.000Z",
      products,
      scheduledFor: "2026-06-03T16:00:00.000Z",
      store,
      storeId: "store_iron_house"
    });
    const preview = buildGrowthOrchestrationPreview(packet);

    expect(preview).toMatchObject({
      approvalPacketId: packet.id,
      estimatedAiCostCents: 0,
      estimatedExternalSpendCents: 0,
      externalExecution: false,
      mode: "Read-only orchestration preview",
      providerContacted: false,
      scheduledFor: "2026-06-03T16:00:00.000Z",
      status: "Approved - execution locked"
    });
    expect(preview.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        channel: "Shopify",
        executionState: "Locked - no external action",
        status: "Ready for manual handoff"
      }),
      expect.objectContaining({
        channel: "Ads",
        guardrail: expect.stringContaining("spend")
      })
    ]));
    expect(preview.auditEvents.join(" ")).toContain("No social, Shopify, ad, or analytics system was contacted.");
  });
});
