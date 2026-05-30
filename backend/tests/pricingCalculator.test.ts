import { describe, expect, it } from "vitest";
import { calculatePricing, pricingPlatformPresets } from "../src/services/pricingCalculator.js";

describe("merch pricing calculator", () => {
  it("calculates profit, margin, break-even, and recommended retail price", () => {
    const preset = pricingPlatformPresets.Etsy;
    const result = calculatePricing({
      adSpendEstimate: 2,
      listingFee: preset.listingFee,
      paymentProcessingEstimate: preset.paymentProcessingEstimate,
      platformFeePercent: preset.platformFeePercent,
      retailPrice: 32,
      shippingCost: 4.95,
      supplierCost: 9.8
    });

    expect(result.estimatedProfit).toBeGreaterThan(0);
    expect(result.profitMargin).toBeGreaterThan(0);
    expect(result.breakEvenPrice).toBeGreaterThan(0);
    expect(result.recommendedRetailPrice).toBeGreaterThanOrEqual(32);
  });
});
