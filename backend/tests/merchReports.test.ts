import { describe, expect, it } from "vitest";
import { buildLaunchPackage, buildMerchReport, type MerchProductSnapshot, type MerchStoreSnapshot } from "../src/services/merchReports.js";

const store: MerchStoreSnapshot = {
  approvalStatus: "Designs Approved",
  audience: "Local gym members",
  brandStyle: "Minimal black and cyan performance apparel",
  businessName: "Northline Gym",
  clientName: "Northline Fitness",
  estimatedProfit: 1200,
  industry: "Fitness",
  launchStatus: "Awaiting Approval",
  productTypes: ["T-shirts", "Hoodies"],
  revenue: 0,
  storePlatform: "Etsy"
};

const products: MerchProductSnapshot[] = [
  {
    aiDisclosureNeeded: true,
    complianceNotes: "Compliance warnings are operational risk signals only and are not legal advice.",
    designConcept: "Original gym typography mark.",
    designPrompt: "Create an original gym shirt.",
    estimatedProfit: 12,
    listingDescription: "Original Northline Gym shirt.",
    listingTitle: "Northline Gym Core Shirt",
    productName: "Core Shirt",
    productType: "T-shirt",
    productionPartnerDisclosureNeeded: true,
    retailPrice: 32,
    status: "Approved",
    tags: ["gym", "fitness"]
  },
  {
    aiDisclosureNeeded: true,
    designConcept: "Draft hoodie.",
    designPrompt: "Create an original hoodie.",
    estimatedProfit: 18,
    productName: "Draft Hoodie",
    productType: "Hoodie",
    productionPartnerDisclosureNeeded: true,
    retailPrice: 52,
    status: "Awaiting Approval",
    tags: ["hoodie"]
  }
];

describe("merch reports", () => {
  it("builds launch packages from approved products only", () => {
    const launchPackage = buildLaunchPackage(store, products);

    expect(launchPackage.approvedProducts).toHaveLength(1);
    expect(launchPackage.approvedProducts[0].productName).toBe("Core Shirt");
    expect(launchPackage.clientApprovalChecklist.join(" ")).toContain("compliance warnings");
  });

  it("uses ENTRAL report sections for every report", () => {
    const report = buildMerchReport("Profit Estimate Report", store, products);

    expect(report.title).toBe("Profit Estimate Report");
    expect(report.situation).toBeTruthy();
    expect(report.analysis).toBeTruthy();
    expect(report.recommendation).toBeTruthy();
    expect(report.nextActions.length).toBeGreaterThan(0);
  });
});
