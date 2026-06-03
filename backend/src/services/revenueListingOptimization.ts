import type { RevenueEngineProductSnapshot, RevenueEngineStoreSnapshot, RevenueProductStatus } from "./revenueEngine.js";
import type { RevenuePerformanceDigest, RevenuePerformanceProductScore } from "./revenuePerformance.js";

export type RevenueListingOptimizationOptions = {
  includePricingExperiments: boolean;
  maxPriceIncreasePercent: number;
  maxProducts: number;
  minProfitMargin: number;
  minVisitsForPerformanceExperiment: number;
  variantsPerProduct: number;
  windowDays: number;
};

export type RevenueListingExperimentAction =
  | "write_missing_copy"
  | "improve_conversion"
  | "scale_variant"
  | "price_test";

export type RevenueListingVariant = {
  description: string;
  estimatedPlatformFees: number;
  estimatedProfit: number;
  hypothesis: string;
  id: string;
  label: string;
  mockupNotes: string;
  priceChangePercent: number;
  profitMargin: number;
  retailPrice: number;
  score: number;
  tags: string[];
  title: string;
};

export type RevenueListingExperiment = {
  action: RevenueListingExperimentAction;
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    reason: string;
    status: "Internal draft only";
  };
  currentListing: {
    description: string | null;
    retailPrice: number;
    tags: string[];
    title: string | null;
  };
  evidence: {
    conversionRate: number;
    evidenceGrade: "none" | "thin" | "usable" | "strong";
    profitVelocity: number;
    snapshots: number;
    unitsSold: number;
    visits: number;
  };
  externalExecution: false;
  id: string;
  priority: number;
  productId: string;
  productName: string;
  productType: string;
  reason: string;
  recommendedInternalStatus: RevenueProductStatus;
  recommendedVariant: RevenueListingVariant;
  storeId: string;
  storeName: string;
  variants: RevenueListingVariant[];
};

export type RevenueListingOptimizationPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  experiments: RevenueListingExperiment[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Listing Optimization Queue";
  options: RevenueListingOptimizationOptions;
  summary: string;
  totals: {
    estimatedProfitLift: number;
    experimentsQueued: number;
    missingCopyProducts: number;
    performanceBackedExperiments: number;
    priceExperiments: number;
    productsEvaluated: number;
    variantsGenerated: number;
  };
};

export const defaultRevenueListingOptimizationOptions: RevenueListingOptimizationOptions = {
  includePricingExperiments: true,
  maxPriceIncreasePercent: 20,
  maxProducts: 10,
  minProfitMargin: 25,
  minVisitsForPerformanceExperiment: 50,
  variantsPerProduct: 3,
  windowDays: 30
};

const activeStatuses = new Set<RevenueProductStatus>([
  "Idea",
  "Prompt Ready",
  "Designed",
  "Mockup Created",
  "Listing Drafted",
  "Compliance Review",
  "Awaiting Approval",
  "Approved",
  "Published",
  "Needs Revision"
]);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function limitText(value: string, max: number) {
  const normalized = normalizeText(value);
  return normalized.length <= max ? normalized : normalized.slice(0, max - 1).trimEnd();
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "listing";
}

function tag(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function uniqueTags(values: string[]) {
  return Array.from(new Set(values.map(tag).filter(Boolean))).slice(0, 13);
}

function audienceKeyword(store: RevenueEngineStoreSnapshot) {
  const words = store.audience
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !["with", "and", "that", "from", "clients", "members"].includes(word));

  return words.slice(0, 3).join(" ") || store.industry.toLowerCase();
}

function themeKeyword(product: RevenueEngineProductSnapshot) {
  return normalizeText(product.designTheme ?? product.productName)
    .split(/\s+/)
    .slice(0, 4)
    .join(" ");
}

function platformFees(price: number) {
  return money(price * 0.095 + 0.3);
}

function estimatedEconomics(product: RevenueEngineProductSnapshot, retailPrice: number) {
  const fees = platformFees(retailPrice);
  const knownCost = Math.max(0, product.retailPrice - product.estimatedProfit);
  const inferredCost = product.estimatedProfit > 0 && product.retailPrice > 0
    ? Math.max(0, product.retailPrice - product.estimatedProfit - platformFees(product.retailPrice))
    : 0;
  const cost = inferredCost > 0 ? inferredCost : Math.min(knownCost, retailPrice * 0.72);
  const estimatedProfit = money(retailPrice - cost - fees);

  return {
    estimatedPlatformFees: fees,
    estimatedProfit,
    profitMargin: money(retailPrice > 0 ? estimatedProfit / retailPrice * 100 : 0)
  };
}

function targetPrice(product: RevenueEngineProductSnapshot, options: RevenueListingOptimizationOptions) {
  const current = product.retailPrice > 0 ? product.retailPrice : 24;
  const currentEconomics = estimatedEconomics(product, current);

  if (!options.includePricingExperiments || currentEconomics.profitMargin >= options.minProfitMargin) {
    return current;
  }

  const maxPrice = current * (1 + options.maxPriceIncreasePercent / 100);
  const target = currentEconomics.estimatedProfit <= 0 ? current * 1.12 : current * 1.08;

  return money(clamp(target, current, maxPrice));
}

function scoreVariant(input: {
  action: RevenueListingExperimentAction;
  economics: ReturnType<typeof estimatedEconomics>;
  index: number;
  performanceScore?: RevenuePerformanceProductScore;
  title: string;
}) {
  const performanceBoost = input.performanceScore
    ? input.performanceScore.action === "scale"
      ? 18
      : input.performanceScore.action === "pause" || input.performanceScore.unitsSold === 0
        ? 12
        : 8
    : 0;
  const marginBoost = clamp(input.economics.profitMargin / 2, 0, 35);
  const titleBoost = input.title.length >= 42 && input.title.length <= 120 ? 10 : 4;
  const actionBoost: Record<RevenueListingExperimentAction, number> = {
    improve_conversion: 18,
    price_test: 14,
    scale_variant: 20,
    write_missing_copy: 16
  };

  return Math.round(clamp(42 + actionBoost[input.action] + performanceBoost + marginBoost + titleBoost - input.index * 3, 1, 100));
}

function descriptionFor(input: {
  angle: string;
  product: RevenueEngineProductSnapshot;
  store: RevenueEngineStoreSnapshot;
}) {
  return limitText([
    `${input.product.productName} is an original ${input.product.productType} concept for ${input.store.audience}.`,
    `The ${input.angle.toLowerCase()} version emphasizes ${themeKeyword(input.product).toLowerCase()}, ${input.store.brandStyle.toLowerCase()}, and a clear fit for ${input.store.businessName}.`,
    "Prepared as an internal listing draft with original copy, original design direction, disclosure review, and final approval required before any external marketplace update."
  ].join(" "), 1200);
}

function variantFor(input: {
  action: RevenueListingExperimentAction;
  angle: string;
  index: number;
  price: number;
  product: RevenueEngineProductSnapshot;
  score?: RevenuePerformanceProductScore;
  store: RevenueEngineStoreSnapshot;
}): RevenueListingVariant {
  const audience = audienceKeyword(input.store);
  const theme = themeKeyword(input.product);
  const titleTemplates = [
    `${input.store.businessName} ${theme} ${input.product.productType}`,
    `${input.product.productType} for ${audience} - ${input.store.businessName}`,
    `${input.store.businessName} ${input.product.productType} - Original ${input.angle}`,
    `${theme} ${input.product.productType} for ${input.store.industry}`
  ];
  const title = limitText(titleTemplates[input.index % titleTemplates.length], 140);
  const economics = estimatedEconomics(input.product, input.price);
  const tags = uniqueTags([
    input.store.businessName,
    input.store.clientName,
    input.store.industry,
    input.store.storePlatform,
    input.product.productType,
    input.product.productName,
    theme,
    input.angle,
    audience,
    ...input.product.tags
  ]);

  return {
    description: descriptionFor({
      angle: input.angle,
      product: input.product,
      store: input.store
    }),
    estimatedPlatformFees: economics.estimatedPlatformFees,
    estimatedProfit: economics.estimatedProfit,
    hypothesis: input.score
      ? `${input.angle} should improve ${input.score.action === "scale" ? "repeatable scale copy" : "conversion quality"} after ${input.score.visits} tracked visits.`
      : `${input.angle} should close listing-copy gaps before approval.`,
    id: `listing_variant_${input.product.id}_${slug(input.angle)}_${input.index + 1}`,
    label: input.angle,
    mockupNotes: `Prepare listing preview images for ${input.product.productName}; emphasize ${input.angle.toLowerCase()} and verify readability at thumbnail size.`,
    priceChangePercent: money(input.product.retailPrice > 0 ? (input.price - input.product.retailPrice) / input.product.retailPrice * 100 : 0),
    profitMargin: economics.profitMargin,
    retailPrice: input.price,
    score: scoreVariant({
      action: input.action,
      economics,
      index: input.index,
      performanceScore: input.score,
      title
    }),
    tags,
    title
  };
}

function performanceForProduct(digest: RevenuePerformanceDigest | undefined, productId: string) {
  return digest?.productScores.find((score) => score.productId === productId);
}

function actionForProduct(
  product: RevenueEngineProductSnapshot,
  score: RevenuePerformanceProductScore | undefined,
  options: RevenueListingOptimizationOptions
): RevenueListingExperimentAction | null {
  const missingCopy = !product.listingTitle || !product.listingDescription || product.tags.length < 5;

  if (missingCopy) return "write_missing_copy";
  if (score && score.visits >= options.minVisitsForPerformanceExperiment && (score.action === "pause" || score.unitsSold === 0)) return "improve_conversion";
  if (score?.action === "scale") return "scale_variant";
  if (options.includePricingExperiments && product.profitMargin < options.minProfitMargin) return "price_test";

  return null;
}

function reasonForAction(action: RevenueListingExperimentAction, product: RevenueEngineProductSnapshot, score: RevenuePerformanceProductScore | undefined) {
  if (action === "write_missing_copy") {
    return "Product is missing complete listing copy, enough tags, or both.";
  }

  if (action === "improve_conversion") {
    return score
      ? `Performance data shows ${score.visits} visits, ${score.unitsSold} units, and ${score.conversionRate}% conversion; queue copy and offer variants before more scale work.`
      : "Product needs conversion-oriented listing variants before launch approval.";
  }

  if (action === "scale_variant") {
    return score
      ? `Product has a scale signal with ${score.profitVelocity} daily profit velocity; queue stronger copy variants for repeatable expansion.`
      : "Product is ready for scale copy variants.";
  }

  return `Profit margin ${product.profitMargin}% is below the configured listing experiment floor.`;
}

function recommendedStatus(product: RevenueEngineProductSnapshot): RevenueProductStatus {
  if (product.status === "Published") return "Needs Revision";
  if (product.status === "Approved") return "Awaiting Approval";
  return "Listing Drafted";
}

export function withRevenueListingOptimizationOptions(input: Partial<RevenueListingOptimizationOptions> = {}): RevenueListingOptimizationOptions {
  return {
    includePricingExperiments: input.includePricingExperiments ?? defaultRevenueListingOptimizationOptions.includePricingExperiments,
    maxPriceIncreasePercent: clamp(input.maxPriceIncreasePercent ?? defaultRevenueListingOptimizationOptions.maxPriceIncreasePercent, 0, 100),
    maxProducts: clamp(Math.round(input.maxProducts ?? defaultRevenueListingOptimizationOptions.maxProducts), 1, 50),
    minProfitMargin: clamp(input.minProfitMargin ?? defaultRevenueListingOptimizationOptions.minProfitMargin, 0, 100),
    minVisitsForPerformanceExperiment: clamp(Math.round(input.minVisitsForPerformanceExperiment ?? defaultRevenueListingOptimizationOptions.minVisitsForPerformanceExperiment), 0, 1_000_000),
    variantsPerProduct: clamp(Math.round(input.variantsPerProduct ?? defaultRevenueListingOptimizationOptions.variantsPerProduct), 1, 4),
    windowDays: clamp(Math.round(input.windowDays ?? defaultRevenueListingOptimizationOptions.windowDays), 1, 365)
  };
}

export function buildRevenueListingOptimizationPlan(input: {
  generatedAt?: string;
  options?: Partial<RevenueListingOptimizationOptions>;
  performanceDigest?: RevenuePerformanceDigest;
  products: RevenueEngineProductSnapshot[];
  stores: RevenueEngineStoreSnapshot[];
}): RevenueListingOptimizationPlan {
  const options = withRevenueListingOptimizationOptions(input.options);
  const storesById = new Map(input.stores.map((store) => [store.id, store]));
  const experiments = input.products
    .filter((product) => activeStatuses.has(product.status))
    .map((product) => {
      const store = storesById.get(product.storeId);

      if (!store) return null;

      const performanceScore = performanceForProduct(input.performanceDigest, product.id);
      const action = actionForProduct(product, performanceScore, options);

      if (!action) return null;

      const basePrice = targetPrice(product, options);
      const angles = action === "scale_variant"
        ? ["Scale-ready search copy", "Premium buyer copy", "Audience proof copy", "Giftable variant copy"]
        : action === "improve_conversion"
          ? ["Conversion repair copy", "Clear benefit copy", "Thumbnail-first copy", "Price confidence copy"]
          : action === "price_test"
            ? ["Margin recovery copy", "Premium value copy", "Simple offer copy", "Bundle-ready copy"]
            : ["Search-ready copy", "Audience-fit copy", "Brand authority copy", "Clean launch copy"];
      const variants = angles
        .slice(0, options.variantsPerProduct)
        .map((angle, index) => variantFor({
          action,
          angle,
          index,
          price: index === 0 ? basePrice : money(basePrice * (1 + Math.min(index, 2) * 0.03)),
          product,
          score: performanceScore,
          store
        }))
        .sort((a, b) => b.score - a.score);
      const recommendedVariant = variants[0];

      if (!recommendedVariant) return null;

      const priority: Record<RevenueListingExperimentAction, number> = {
        improve_conversion: 1,
        price_test: 2,
        scale_variant: 3,
        write_missing_copy: 4
      };

      return {
        action,
        approvalGate: {
          externalExecutionLocked: true,
          humanApprovalRequired: true,
          reason: "Internal listing fields can be updated only after this confirmation. Marketplace publishing remains locked.",
          status: "Internal draft only"
        },
        currentListing: {
          description: product.listingDescription ?? null,
          retailPrice: product.retailPrice,
          tags: product.tags,
          title: product.listingTitle ?? null
        },
        evidence: {
          conversionRate: performanceScore?.conversionRate ?? 0,
          evidenceGrade: performanceScore?.evidenceGrade ?? "none",
          profitVelocity: performanceScore?.profitVelocity ?? 0,
          snapshots: performanceScore?.snapshots ?? 0,
          unitsSold: performanceScore?.unitsSold ?? 0,
          visits: performanceScore?.visits ?? 0
        },
        externalExecution: false,
        id: `listing_experiment_${product.id}_${slug(action)}`,
        priority: priority[action],
        productId: product.id,
        productName: product.productName,
        productType: product.productType,
        reason: reasonForAction(action, product, performanceScore),
        recommendedInternalStatus: recommendedStatus(product),
        recommendedVariant,
        storeId: store.id,
        storeName: store.businessName,
        variants
      } satisfies RevenueListingExperiment;
    })
    .filter((experiment): experiment is RevenueListingExperiment => Boolean(experiment))
    .sort((a, b) => a.priority - b.priority || b.recommendedVariant.score - a.recommendedVariant.score)
    .slice(0, options.maxProducts);
  const missingCopyProducts = experiments.filter((experiment) => experiment.action === "write_missing_copy").length;
  const performanceBackedExperiments = experiments.filter((experiment) => experiment.evidence.snapshots > 0).length;
  const priceExperiments = experiments.filter((experiment) => experiment.recommendedVariant.priceChangePercent !== 0 || experiment.action === "price_test").length;
  const estimatedProfitLift = money(experiments.reduce((sum, experiment) => (
    sum + Math.max(0, experiment.recommendedVariant.estimatedProfit - (experiment.currentListing.retailPrice > 0 ? experiment.currentListing.retailPrice * 0.2 : 0))
  ), 0));

  return {
    auditEvents: [
      "Listing optimization queue generated inside ENTRAL.",
      "Recommended copy, tags, mockup notes, and prices are internal drafts only.",
      "No marketplace listing, Shopify product, POD provider product, ad, social, payment, or browser automation system was contacted."
    ],
    blockedExternalActions: [
      "Publishing or editing Etsy listings",
      "Publishing or editing Shopify products",
      "Changing Printify or Printful product data",
      "Uploading listing images or digital files",
      "Starting ad or social experiments",
      "Moving money or issuing payouts",
      "Using browser stealth, anti-detection, or platform-evasion automation"
    ],
    experiments,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Internal Listing Optimization Queue",
    options,
    summary: `${input.products.length} products evaluated. ${experiments.length} listing experiment${experiments.length === 1 ? "" : "s"} queued, ${performanceBackedExperiments} backed by performance data, and ${priceExperiments} include price changes.`,
    totals: {
      estimatedProfitLift,
      experimentsQueued: experiments.length,
      missingCopyProducts,
      performanceBackedExperiments,
      priceExperiments,
      productsEvaluated: input.products.length,
      variantsGenerated: experiments.reduce((sum, experiment) => sum + experiment.variants.length, 0)
    }
  };
}
