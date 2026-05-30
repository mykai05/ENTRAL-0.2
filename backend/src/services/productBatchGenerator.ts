import type { CreatePodProductInput } from "../schemas.js";
import { formatComplianceNotes } from "./complianceGuardrails.js";

export const productBatchSizes = [5, 10, 15, 25] as const;
export const productBatchRiskTolerances = ["Low", "Medium", "High"] as const;

export type ProductBatchSize = (typeof productBatchSizes)[number];
export type ProductBatchRiskTolerance = (typeof productBatchRiskTolerances)[number];

export type ProductBatchInput = {
  audience: string;
  priceRange: {
    max: number;
    min: number;
  };
  productTypes: string[];
  productCount: ProductBatchSize;
  riskTolerance: ProductBatchRiskTolerance;
  storeId: string;
  styleDirection: string;
};

export type ProductBatchStore = {
  audience: string;
  brandStyle: string;
  businessName: string;
  clientName: string;
  commandGeneralId?: string | null;
  commandGeneralName?: string | null;
  commandMarshalId?: string | null;
  commandMarshalName?: string | null;
  id: string;
  industry: string;
  productTypes: string[];
};

const themePillars = [
  "Founders Club",
  "Local Legend",
  "After Hours",
  "Built Different",
  "Weekend Uniform",
  "Core Team",
  "Legacy Mark",
  "Day One",
  "Quiet Luxury",
  "Operator Series",
  "City Standard",
  "Member Edition",
  "Field Notes",
  "Signal Line",
  "Victory Lap",
  "Origin Story",
  "Front Desk Favorite",
  "Back Room Classic",
  "Launch Crew",
  "Signature Drop",
  "Essential Kit",
  "Loyalty Badge",
  "No Days Off",
  "The Regulars",
  "Mission Patch"
];

const typeCostProfiles: Record<string, { shipping: number; supplier: number }> = {
  hoodie: { shipping: 8.45, supplier: 19.25 },
  mug: { shipping: 5.25, supplier: 6.4 },
  poster: { shipping: 4.95, supplier: 7.15 },
  sticker: { shipping: 3.35, supplier: 2.1 },
  sweatshirt: { shipping: 8.25, supplier: 18.1 },
  "t-shirt": { shipping: 4.95, supplier: 9.8 },
  tee: { shipping: 4.95, supplier: 9.8 },
  tote: { shipping: 5.75, supplier: 8.6 }
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeTag(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function uniqueTags(values: string[]) {
  return Array.from(new Set(values.map(normalizeTag).filter(Boolean))).slice(0, 13);
}

function costProfileFor(productType: string) {
  const normalized = productType.toLowerCase();
  const match = Object.entries(typeCostProfiles).find(([key]) => normalized.includes(key));
  return match?.[1] ?? { shipping: 5.95, supplier: 10.75 };
}

function riskWarnings(riskTolerance: ProductBatchRiskTolerance, concept: string, productType: string) {
  const warnings = [
    "Run trademark search before publishing.",
    "Verify no protected logos, team names, celebrity references, or copyrighted phrases are included.",
    "Confirm production partner disclosure before marketplace launch."
  ];

  if (riskTolerance === "Low") {
    warnings.push("Use generic, brand-owned wording only. Avoid trend references and third-party names.");
  }

  if (riskTolerance === "High") {
    warnings.push("High risk tolerance selected: manual compliance review is required before design approval.");
  }

  if (/club|team|city|crew/i.test(concept)) {
    warnings.push("Community language detected; confirm it does not imply affiliation with protected organizations.");
  }

  if (/hoodie|shirt|tee/i.test(productType)) {
    warnings.push("Check garment mockups for readable placement, safe print area, and production color limits.");
  }

  return warnings;
}

export function generateProductBatch(store: ProductBatchStore, input: ProductBatchInput): CreatePodProductInput[] {
  const productTypes = input.productTypes.length > 0 ? input.productTypes : store.productTypes.length > 0 ? store.productTypes : ["T-shirt"];
  const minPrice = Math.min(input.priceRange.min, input.priceRange.max);
  const maxPrice = Math.max(input.priceRange.min, input.priceRange.max);
  const priceFloor = clamp(minPrice, 1, 999_999);
  const priceCeiling = clamp(maxPrice, priceFloor, 999_999);
  const audience = input.audience.trim() || store.audience;
  const style = input.styleDirection.trim() || store.brandStyle;
  const industryTag = store.industry.split(/\s+/)[0] ?? "brand";

  return Array.from({ length: input.productCount }, (_, index) => {
    const productType = productTypes[index % productTypes.length];
    const pillar = themePillars[index % themePillars.length];
    const variant = index + 1;
    const profile = costProfileFor(productType);
    const pricePosition = productTypes.length <= 1 ? index / Math.max(input.productCount - 1, 1) : (index % productTypes.length) / Math.max(productTypes.length - 1, 1);
    const retailPrice = money(priceFloor + (priceCeiling - priceFloor) * pricePosition);
    const estimatedPlatformFees = money(retailPrice * 0.095 + 0.3);
    const estimatedProfit = money(retailPrice - profile.supplier - profile.shipping - estimatedPlatformFees);
    const profitMargin = money(retailPrice > 0 ? Math.max(0, estimatedProfit / retailPrice * 100) : 0);
    const designTheme = `${pillar} ${productType}`;
    const productName = `${store.businessName} ${pillar} ${productType}`;
    const concept = `${style} ${productType} concept for ${audience}, anchored around the "${pillar}" merch lane.`;
    const complianceWarnings = riskWarnings(input.riskTolerance, `${pillar} ${store.industry}`, productType);
    const designConcept = `${concept} Focus on a polished, client-ready product idea that feels specific to ${store.businessName}.`;
    const designPrompt = `Create a premium ${productType} design for ${store.businessName}. Audience: ${audience}. Style: ${style}. Theme: ${pillar}. Use original typography, no protected marks, no celebrity likenesses, and no copied artwork. Produce a clean commercial design suitable for POD production.`;
    const listingTitle = `${store.businessName} ${pillar} ${productType}`;
    const listingDescription = `${store.businessName} ${pillar} ${productType} designed for ${audience}. This concept uses ${style.toLowerCase()} and is prepared as a POD-ready draft pending compliance and client approval.`;
    const complianceNotes = [
      ...complianceWarnings,
      formatComplianceNotes({
        aiDisclosureNeeded: true,
        complianceNotes: complianceWarnings.join(" "),
        designConcept,
        designPrompt,
        designTheme,
        listingDescription,
        listingTitle,
        productName,
        productionPartnerDisclosureNeeded: true,
        tags: [store.businessName, store.clientName, store.industry, productType, pillar, style, audience]
      })
    ].join(" ");

    return {
      aiDisclosureNeeded: true,
      colorDirection: `${style}. Keep colors brand-safe, print-friendly, and readable on ${productType.toLowerCase()} mockups.`,
      complianceNotes,
      designConcept,
      designPrompt,
      designTheme,
      estimatedPlatformFees,
      estimatedProfit,
      listingDescription,
      listingTitle,
      mockupNotes: `Mock up on neutral backgrounds and one lifestyle scene for ${audience}. Verify contrast at thumbnail size.`,
      productName: variant === 1 ? productName : `${productName} ${variant}`,
      productType,
      productionPartnerDisclosureNeeded: true,
      profitMargin,
      retailPrice,
      shippingCost: profile.shipping,
      status: "Awaiting Approval",
      storeId: store.id,
      supplierCost: profile.supplier,
      commandGeneralId: store.commandGeneralId ?? undefined,
      commandGeneralName: store.commandGeneralName ?? undefined,
      commandMarshalId: store.commandMarshalId ?? undefined,
      commandMarshalName: store.commandMarshalName ?? undefined,
      tags: uniqueTags([
        store.businessName,
        store.clientName,
        store.industry,
        industryTag,
        productType,
        pillar,
        style,
        audience,
        "pod",
        "custom merch"
      ]),
      targetAudience: audience,
      typographyDirection: `${style}. Prioritize original letterforms, clean hierarchy, strong legibility, and no protected slogans.`
    };
  });
}
