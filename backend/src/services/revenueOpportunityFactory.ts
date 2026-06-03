import { generateProductBatch, type ProductBatchRiskTolerance, type ProductBatchSize } from "./productBatchGenerator.js";
import type { CreatePodProductInput } from "../schemas.js";

export type RevenueOpportunityFactoryOptions = {
  audience?: string | null;
  brandStyle?: string | null;
  businessName?: string | null;
  clientName?: string | null;
  contactName?: string | null;
  email?: string | null;
  idea: string;
  industry?: string | null;
  podProvider: "Printify" | "Printful" | "Other";
  priceRange: {
    max: number;
    min: number;
  };
  productCount: ProductBatchSize;
  productTypes: string[];
  riskTolerance: ProductBatchRiskTolerance;
  sourceKey?: string | null;
  storePlatform: "Etsy" | "Shopify" | "Other";
};

export type RevenueOpportunityFactoryPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  batchInput: {
    audience: string;
    priceRange: {
      max: number;
      min: number;
    };
    productCount: ProductBatchSize;
    productTypes: string[];
    riskTolerance: ProductBatchRiskTolerance;
    storeId: string;
    styleDirection: string;
  };
  externalExecution: false;
  generatedAt: string;
  idempotency: {
    sourceKey: string;
    storeAlreadyExists: boolean;
    storeLookup: string;
  };
  mode: "Internal Revenue Opportunity Factory";
  nextInternalActions: Array<{
    action: "create_store" | "seed_product_drafts" | "run_listing_optimization" | "prepare_store_setup" | "run_revenue_autopilot";
    externalExecution: false;
    status: "ready" | "already_done" | "queued_after_apply";
    title: string;
  }>;
  productDrafts: CreatePodProductInput[];
  providerContacted: false;
  skippedExistingProducts: Array<{
    productName: string;
    reason: string;
  }>;
  storeDraft: {
    approvalStatus: "Research Approved";
    audience: string;
    brandStyle: string;
    businessName: string;
    clientName: string;
    contactName: string;
    email: string;
    estimatedProfit: number;
    industry: string;
    launchStatus: "Discovery";
    notes: string;
    podProvider: RevenueOpportunityFactoryOptions["podProvider"];
    productTypes: string[];
    profitShare: number;
    storePlatform: RevenueOpportunityFactoryOptions["storePlatform"];
  };
  summary: string;
  totals: {
    estimatedDraftProfit: number;
    existingProductDrafts: number;
    productDrafts: number;
    skippedProductDrafts: number;
    storeShells: number;
  };
};

const blockedExternalActions = [
  "Publishing marketplace listings, changing storefront settings, uploading POD artwork, or creating provider-side products",
  "Uploading social videos, posting content, changing ad campaigns, or starting ad spend",
  "Moving money, creating payouts, changing bank accounts, creating transfers, or authorizing spend",
  "Using browser stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, or platform evasion automation"
];

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "opportunity";
}

function titleCase(value: string) {
  return normalizeText(value)
    .split(/\s+/)
    .slice(0, 5)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function inferIndustry(idea: string) {
  if (/security|intel|intelligence|surveillance|defense|risk/i.test(idea)) return "Security technology";
  if (/fitness|gym|training|sport|athlete/i.test(idea)) return "Fitness";
  if (/coffee|cafe|restaurant|bar|food/i.test(idea)) return "Hospitality";
  if (/creator|artist|music|studio|design/i.test(idea)) return "Creative studio";
  if (/software|automation|ai|data|ops|operator/i.test(idea)) return "Software operations";
  return "Private commerce";
}

function inferProductTypes(idea: string, provided: string[]) {
  if (provided.length > 0) return provided;
  if (/security|intel|operator|ops|software|automation|ai/i.test(idea)) return ["T-shirt", "Sticker", "Notebook", "Poster"];
  if (/fitness|gym|training|sport/i.test(idea)) return ["T-shirt", "Hoodie", "Sticker", "Tote"];
  if (/coffee|cafe|restaurant|bar|food/i.test(idea)) return ["Mug", "T-shirt", "Sticker", "Tote"];
  return ["T-shirt", "Sticker", "Mug", "Poster"];
}

function dedupeProductTypes(values: string[]) {
  return Array.from(new Set(values.map(normalizeText).filter(Boolean))).slice(0, 12);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function productKey(value: string) {
  return normalizeText(value).toLowerCase();
}

export function revenueOpportunitySourceKey(input: Pick<RevenueOpportunityFactoryOptions, "businessName" | "idea" | "sourceKey">) {
  return slugify(input.sourceKey || `${input.businessName ?? ""} ${input.idea}`);
}

export function buildRevenueOpportunityFactoryPlan(input: {
  existingProductNames?: string[];
  existingStoreId?: string | null;
  generatedAt?: string;
  options: RevenueOpportunityFactoryOptions;
  storeId?: string;
}): RevenueOpportunityFactoryPlan {
  const idea = normalizeText(input.options.idea);
  const businessName = normalizeText(input.options.businessName || titleCase(idea) || "Revenue Opportunity");
  const clientName = normalizeText(input.options.clientName || "ENTRAL Private Revenue");
  const contactName = normalizeText(input.options.contactName || "ENTRAL Revenue Operator");
  const industry = normalizeText(input.options.industry || inferIndustry(idea));
  const audience = normalizeText(input.options.audience || `Buyers aligned with ${industry.toLowerCase()} and ${businessName}`);
  const brandStyle = normalizeText(input.options.brandStyle || "Serious, minimal, premium, operational, and brand-owned");
  const sourceKey = revenueOpportunitySourceKey(input.options);
  const productTypes = dedupeProductTypes(inferProductTypes(idea, input.options.productTypes));
  const storeId = input.storeId || input.existingStoreId || "pending_internal_store";
  const existingProductNames = new Set((input.existingProductNames ?? []).map(productKey));
  const batchInput = {
    audience,
    priceRange: input.options.priceRange,
    productCount: input.options.productCount,
    productTypes,
    riskTolerance: input.options.riskTolerance,
    storeId,
    styleDirection: brandStyle
  };
  const allProductDrafts = generateProductBatch({
    audience,
    brandStyle,
    businessName,
    clientName,
    id: storeId,
    industry,
    productTypes
  }, batchInput);
  const productDrafts = allProductDrafts.filter((product) => !existingProductNames.has(productKey(product.productName)));
  const skippedExistingProducts = allProductDrafts
    .filter((product) => existingProductNames.has(productKey(product.productName)))
    .map((product) => ({
      productName: product.productName,
      reason: "A product with this generated name already exists for the opportunity store."
    }));
  const estimatedDraftProfit = money(productDrafts.reduce((sum, product) => sum + product.estimatedProfit, 0));
  const notes = [
    `Revenue Factory Source: ${sourceKey}`,
    `Original idea: ${idea}`,
    "Internal opportunity shell only. External publishing, provider execution, uploads, ad spend, money movement, and browser automation remain locked."
  ].join("\n");

  return {
    auditEvents: [
      "Revenue Opportunity Factory generated an internal store shell and product draft plan.",
      "Apply mode writes private store/product records only and records an audit log.",
      "Marketplace publishing, provider calls, uploads, payments, ad spend, and browser automation remain locked."
    ],
    batchInput,
    blockedExternalActions,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    idempotency: {
      sourceKey,
      storeAlreadyExists: Boolean(input.existingStoreId),
      storeLookup: `Revenue Factory Source: ${sourceKey}`
    },
    mode: "Internal Revenue Opportunity Factory",
    nextInternalActions: [
      {
        action: "create_store",
        externalExecution: false,
        status: input.existingStoreId ? "already_done" : "ready",
        title: "Create private store shell"
      },
      {
        action: "seed_product_drafts",
        externalExecution: false,
        status: productDrafts.length > 0 ? "ready" : "already_done",
        title: "Seed internal product drafts"
      },
      {
        action: "run_listing_optimization",
        externalExecution: false,
        status: "queued_after_apply",
        title: "Run listing optimization queue"
      },
      {
        action: "prepare_store_setup",
        externalExecution: false,
        status: "queued_after_apply",
        title: "Prepare store setup runbook"
      },
      {
        action: "run_revenue_autopilot",
        externalExecution: false,
        status: "queued_after_apply",
        title: "Refresh Revenue Autopilot"
      }
    ],
    productDrafts,
    providerContacted: false,
    skippedExistingProducts,
    storeDraft: {
      approvalStatus: "Research Approved",
      audience,
      brandStyle,
      businessName,
      clientName,
      contactName,
      email: input.options.email || `${slugify(businessName)}@entral.local`,
      estimatedProfit: estimatedDraftProfit,
      industry,
      launchStatus: "Discovery",
      notes,
      podProvider: input.options.podProvider,
      productTypes,
      profitShare: 0,
      storePlatform: input.options.storePlatform
    },
    summary: `${input.existingStoreId ? "Existing" : "New"} private opportunity shell for ${businessName}: ${productDrafts.length} internal product draft${productDrafts.length === 1 ? "" : "s"} ready, ${skippedExistingProducts.length} duplicate draft${skippedExistingProducts.length === 1 ? "" : "s"} skipped, ${estimatedDraftProfit} estimated draft profit. External execution remains locked.`,
    totals: {
      estimatedDraftProfit,
      existingProductDrafts: skippedExistingProducts.length,
      productDrafts: productDrafts.length,
      skippedProductDrafts: skippedExistingProducts.length,
      storeShells: input.existingStoreId ? 0 : 1
    }
  };
}
