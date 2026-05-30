export const pricingPlatformPresets = {
  Etsy: {
    listingFee: 0.2,
    paymentProcessingEstimate: 3.25,
    platformFeePercent: 6.5
  },
  Manual: {
    listingFee: 0,
    paymentProcessingEstimate: 0,
    platformFeePercent: 0
  },
  Shopify: {
    listingFee: 0,
    paymentProcessingEstimate: 2.9,
    platformFeePercent: 0
  }
} as const;

export type PricingPlatformPreset = keyof typeof pricingPlatformPresets;

export type PricingInput = {
  adSpendEstimate: number;
  listingFee: number;
  paymentProcessingEstimate: number;
  platformFeePercent: number;
  retailPrice: number;
  shippingCost: number;
  supplierCost: number;
};

export type PricingOutput = {
  breakEvenPrice: number;
  estimatedProfit: number;
  profitMargin: number;
  recommendedRetailPrice: number;
};

function money(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculatePricing(input: PricingInput): PricingOutput {
  const variablePercent = Math.max(0, Math.min(input.platformFeePercent, 95)) / 100;
  const fixedCosts = input.supplierCost + input.shippingCost + input.listingFee + input.paymentProcessingEstimate + input.adSpendEstimate;
  const platformFee = input.retailPrice * variablePercent;
  const estimatedProfit = input.retailPrice - fixedCosts - platformFee;
  const breakEvenPrice = variablePercent >= 1 ? fixedCosts : fixedCosts / (1 - variablePercent);
  const recommendedRetailPrice = breakEvenPrice / 0.7;

  return {
    breakEvenPrice: money(breakEvenPrice),
    estimatedProfit: money(estimatedProfit),
    profitMargin: money(input.retailPrice > 0 ? estimatedProfit / input.retailPrice * 100 : 0),
    recommendedRetailPrice: money(Math.max(recommendedRetailPrice, input.retailPrice))
  };
}
