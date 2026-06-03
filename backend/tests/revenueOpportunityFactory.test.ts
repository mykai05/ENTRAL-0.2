import { describe, expect, it } from "vitest";
import { buildRevenueOpportunityFactoryPlan } from "../src/services/revenueOpportunityFactory.js";

describe("Revenue Opportunity Factory", () => {
  it("turns a private idea into an internal store shell and product draft plan", () => {
    const plan = buildRevenueOpportunityFactoryPlan({
      options: {
        idea: "Private security intelligence operator merch for internal ENTRAL funding",
        podProvider: "Printify",
        priceRange: {
          max: 64,
          min: 18
        },
        productCount: 5,
        productTypes: [],
        riskTolerance: "Low",
        storePlatform: "Etsy"
      },
      storeId: "store_1"
    });

    expect(plan.mode).toBe("Internal Revenue Opportunity Factory");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.idempotency.sourceKey).toContain("private-security-intelligence");
    expect(plan.storeDraft.businessName).toBe("Private Security Intelligence Operator Merch");
    expect(plan.productDrafts).toHaveLength(5);
    expect(plan.productDrafts.every((product) => product.storeId === "store_1")).toBe(true);
    expect(plan.blockedExternalActions).toContain("Using browser stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, or platform evasion automation");
  });

  it("skips already generated product drafts for idempotent reruns", () => {
    const first = buildRevenueOpportunityFactoryPlan({
      options: {
        businessName: "Signal Forge",
        idea: "Signal Forge private operator product line",
        podProvider: "Printify",
        priceRange: {
          max: 48,
          min: 22
        },
        productCount: 5,
        productTypes: ["T-shirt", "Sticker"],
        riskTolerance: "Low",
        storePlatform: "Etsy"
      },
      storeId: "store_2"
    });
    const rerun = buildRevenueOpportunityFactoryPlan({
      existingProductNames: first.productDrafts.map((product) => product.productName),
      existingStoreId: "store_2",
      options: {
        businessName: "Signal Forge",
        idea: "Signal Forge private operator product line",
        podProvider: "Printify",
        priceRange: {
          max: 48,
          min: 22
        },
        productCount: 5,
        productTypes: ["T-shirt", "Sticker"],
        riskTolerance: "Low",
        storePlatform: "Etsy"
      },
      storeId: "store_2"
    });

    expect(rerun.productDrafts).toHaveLength(0);
    expect(rerun.skippedExistingProducts).toHaveLength(5);
    expect(rerun.idempotency.storeAlreadyExists).toBe(true);
  });
});
