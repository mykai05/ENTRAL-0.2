import type { ProductBatchInput, ProductBatchRiskTolerance, ProductBatchSize } from "./productBatchGenerator.js";
import type { RevenueEngineProductSnapshot, RevenueEngineStoreSnapshot } from "./revenueEngine.js";

export type RevenueLaunchAction =
  | "seed_products"
  | "prepare_launch_package"
  | "queue_launch_approval"
  | "optimize_listings"
  | "hold";

export type RevenueLaunchPipelineOptions = {
  maxStores: number;
  minApprovedProducts: number;
  minPortfolioProductsPerStore: number;
  productCount: ProductBatchSize;
  riskTolerance: ProductBatchRiskTolerance;
};

export type RevenueLaunchStoreSnapshot = RevenueEngineStoreSnapshot & {
  commandGeneralId?: string | null;
  commandGeneralName?: string | null;
  commandMarshalId?: string | null;
  commandMarshalName?: string | null;
};

export type RevenueLaunchProductSnapshot = RevenueEngineProductSnapshot;

export type RevenueLaunchStorePlan = {
  action: RevenueLaunchAction;
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    reason: string;
    status: "Required" | "Already queued" | "Not ready";
  };
  batchInput: ProductBatchInput;
  confidence: number;
  existingProducts: number;
  externalExecution: false;
  launchPackageReady: boolean;
  missingProducts: number;
  priority: number;
  projectedDraftProfit: number;
  reason: string;
  readyProductIds: string[];
  readyProducts: number;
  score: number;
  storeId: string;
  storeName: string;
  targetProductTypes: string[];
};

export type RevenueLaunchQueueItem = {
  action: RevenueLaunchAction;
  externalExecution: false;
  id: string;
  priority: number;
  storeId: string;
  summary: string;
  title: string;
};

export type RevenueLaunchPipelinePlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Launch Pipeline";
  options: RevenueLaunchPipelineOptions;
  queue: RevenueLaunchQueueItem[];
  storePlans: RevenueLaunchStorePlan[];
  summary: string;
  totals: {
    approvalReadyStores: number;
    draftProductsNeeded: number;
    estimatedDraftProfit: number;
    launchPackageReadyStores: number;
    queuedStores: number;
    storesEvaluated: number;
  };
};

const defaultOptions: RevenueLaunchPipelineOptions = {
  maxStores: 5,
  minApprovedProducts: 2,
  minPortfolioProductsPerStore: 5,
  productCount: 5,
  riskTolerance: "Low"
};

const productBatchSizes = [5, 10, 15, 25] as const;

const statusEligibleForLaunch = new Set(["Approved", "Published"]);
const activeProductStatuses = new Set([
  "Idea",
  "Prompt Ready",
  "Designed",
  "Mockup Created",
  "Listing Drafted",
  "Compliance Review",
  "Awaiting Approval",
  "Approved",
  "Published"
]);

const storeStatusesBlocked = new Set(["Paused", "Archived"]);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(normalizeText).filter(Boolean)));
}

function optionBatchSize(value: number | undefined): ProductBatchSize {
  return productBatchSizes.includes(value as ProductBatchSize) ? value as ProductBatchSize : defaultOptions.productCount;
}

export function withRevenueLaunchPipelineOptions(input: Partial<RevenueLaunchPipelineOptions> = {}): RevenueLaunchPipelineOptions {
  return {
    maxStores: clamp(Math.round(input.maxStores ?? defaultOptions.maxStores), 1, 25),
    minApprovedProducts: clamp(Math.round(input.minApprovedProducts ?? defaultOptions.minApprovedProducts), 1, 25),
    minPortfolioProductsPerStore: clamp(Math.round(input.minPortfolioProductsPerStore ?? defaultOptions.minPortfolioProductsPerStore), 1, 100),
    productCount: optionBatchSize(input.productCount),
    riskTolerance: input.riskTolerance === "Medium" || input.riskTolerance === "High" ? input.riskTolerance : "Low"
  };
}

function fallbackProductTypes(store: RevenueLaunchStoreSnapshot) {
  const industry = store.industry.toLowerCase();

  if (/gym|fitness|training|sport/.test(industry)) return ["T-shirt", "Hoodie", "Sticker", "Tote"];
  if (/coffee|cafe|restaurant|bar|food/.test(industry)) return ["Mug", "T-shirt", "Sticker", "Tote"];
  if (/studio|artist|design|creative|music/.test(industry)) return ["Poster", "T-shirt", "Sticker", "Tote"];
  if (/security|tech|software|agency|consult/.test(industry)) return ["T-shirt", "Sticker", "Notebook", "Poster"];

  return ["T-shirt", "Sticker", "Mug", "Tote"];
}

function targetProductTypes(store: RevenueLaunchStoreSnapshot, products: RevenueLaunchProductSnapshot[]) {
  const configured = store.productTypes.length > 0 ? store.productTypes : fallbackProductTypes(store);
  const activeTypes = products
    .filter((product) => activeProductStatuses.has(product.status))
    .map((product) => product.productType);
  const underrepresented = configured.filter((type) => !activeTypes.some((activeType) => activeType.toLowerCase().includes(type.toLowerCase())));

  return unique([...underrepresented, ...configured, ...fallbackProductTypes(store)]).slice(0, 12);
}

function priceRangeFor(products: RevenueLaunchProductSnapshot[], targetTypes: string[]) {
  const activePrices = products
    .map((product) => product.retailPrice)
    .filter((price) => Number.isFinite(price) && price > 0);

  if (activePrices.length > 0) {
    const min = Math.max(12, Math.min(...activePrices));
    const max = Math.max(min + 8, Math.max(...activePrices));

    return {
      max: money(max + 4),
      min: money(min)
    };
  }

  const hasPremium = targetTypes.some((type) => /hoodie|sweatshirt|jacket/i.test(type));
  const hasSmall = targetTypes.some((type) => /sticker|mug|poster/i.test(type));

  if (hasPremium && hasSmall) return { max: 64, min: 18 };
  if (hasPremium) return { max: 72, min: 34 };
  if (hasSmall) return { max: 42, min: 12 };

  return { max: 48, min: 24 };
}

function projectedDraftProfit(products: RevenueLaunchProductSnapshot[], missingProducts: number, priceRange: { max: number; min: number }) {
  const profitableProducts = products.filter((product) => product.estimatedProfit > 0);
  const averageExistingProfit = profitableProducts.length > 0
    ? profitableProducts.reduce((sum, product) => sum + product.estimatedProfit, 0) / profitableProducts.length
    : (priceRange.min + priceRange.max) / 2 * 0.28;

  return money(Math.max(0, averageExistingProfit) * missingProducts);
}

function storeScore(input: {
  approvedCount: number;
  launchStatus: string;
  missingProducts: number;
  profit: number;
  revenue: number;
}) {
  const statusScore = input.launchStatus === "Launched" || input.launchStatus === "Optimizing"
    ? 20
    : input.launchStatus === "Building Store"
      ? 16
      : input.launchStatus === "Awaiting Approval"
        ? 13
        : input.launchStatus === "Designing"
          ? 10
          : 7;
  const productScore = Math.min(30, input.approvedCount * 10) + Math.min(20, input.missingProducts * 4);
  const moneyScore = Math.min(30, Math.max(input.profit, input.revenue) / 25);

  return clamp(Math.round(statusScore + productScore + moneyScore), 1, 100);
}

function actionForStore(input: {
  activeProducts: RevenueLaunchProductSnapshot[];
  approvedProducts: RevenueLaunchProductSnapshot[];
  launchStatus: string;
  missingProducts: number;
  options: RevenueLaunchPipelineOptions;
}) {
  if (storeStatusesBlocked.has(input.launchStatus)) return "hold";
  if (input.missingProducts > 0) return "seed_products";
  if (input.approvedProducts.length >= input.options.minApprovedProducts && input.launchStatus !== "Launched" && input.launchStatus !== "Optimizing") {
    return "queue_launch_approval";
  }
  if (input.approvedProducts.length >= input.options.minApprovedProducts) return "prepare_launch_package";
  if (input.activeProducts.some((product) => !product.listingTitle || !product.listingDescription)) return "optimize_listings";

  return "hold";
}

function actionReason(action: RevenueLaunchAction, store: RevenueLaunchStoreSnapshot, missingProducts: number, approvedCount: number) {
  if (action === "seed_products") {
    return `${store.businessName} needs ${missingProducts} more internal product draft${missingProducts === 1 ? "" : "s"} to reach the launch portfolio floor.`;
  }

  if (action === "queue_launch_approval") {
    return `${store.businessName} has ${approvedCount} approved product${approvedCount === 1 ? "" : "s"} and should enter a locked launch approval packet.`;
  }

  if (action === "prepare_launch_package") {
    return `${store.businessName} has enough approved products for a launch package refresh and storefront handoff notes.`;
  }

  if (action === "optimize_listings") {
    return `${store.businessName} has active products that need stronger listing copy before approval.`;
  }

  return `${store.businessName} does not need a launch pipeline action right now.`;
}

function approvalGateFor(action: RevenueLaunchAction, reason: string): RevenueLaunchStorePlan["approvalGate"] {
  if (action === "hold") {
    return {
      externalExecutionLocked: true,
      humanApprovalRequired: true,
      reason: "No launch action is ready for approval.",
      status: "Not ready"
    };
  }

  return {
    externalExecutionLocked: true,
    humanApprovalRequired: true,
    reason,
    status: action === "queue_launch_approval" || action === "prepare_launch_package" ? "Required" : "Not ready"
  };
}

function queueItemForStore(plan: RevenueLaunchStorePlan): RevenueLaunchQueueItem | null {
  if (plan.action === "hold") return null;

  const labels: Record<RevenueLaunchAction, string> = {
    hold: "Hold",
    optimize_listings: "Optimize listings",
    prepare_launch_package: "Prepare launch package",
    queue_launch_approval: "Queue launch approval",
    seed_products: "Seed product drafts"
  };

  return {
    action: plan.action,
    externalExecution: false,
    id: `launch_${plan.action}_${plan.storeId}`,
    priority: plan.priority,
    storeId: plan.storeId,
    summary: plan.action === "seed_products"
      ? `Create ${plan.batchInput.productCount} internal product drafts for review.`
      : plan.reason,
    title: `${labels[plan.action]} for ${plan.storeName}`
  };
}

export function buildRevenueLaunchPipeline(input: {
  generatedAt?: string;
  options?: Partial<RevenueLaunchPipelineOptions>;
  products: RevenueLaunchProductSnapshot[];
  stores: RevenueLaunchStoreSnapshot[];
}): RevenueLaunchPipelinePlan {
  const options = withRevenueLaunchPipelineOptions(input.options);
  const storePlans = input.stores.map((store) => {
    const products = input.products.filter((product) => product.storeId === store.id);
    const activeProducts = products.filter((product) => activeProductStatuses.has(product.status));
    const approvedProducts = products.filter((product) => statusEligibleForLaunch.has(product.status));
    const missingProducts = Math.max(0, options.minPortfolioProductsPerStore - activeProducts.length);
    const targetTypes = targetProductTypes(store, products);
    const priceRange = priceRangeFor(products, targetTypes);
    const action = actionForStore({
      activeProducts,
      approvedProducts,
      launchStatus: store.launchStatus,
      missingProducts,
      options
    });
    const reason = actionReason(action, store, missingProducts, approvedProducts.length);
    const score = storeScore({
      approvedCount: approvedProducts.length,
      launchStatus: store.launchStatus,
      missingProducts,
      profit: store.estimatedProfit,
      revenue: store.revenue
    });
    const priority = action === "queue_launch_approval" ? 1 : action === "seed_products" ? 2 : action === "prepare_launch_package" ? 3 : action === "optimize_listings" ? 4 : 9;

    return {
      action,
      approvalGate: approvalGateFor(action, reason),
      batchInput: {
        audience: store.audience,
        priceRange,
        productCount: options.productCount,
        productTypes: targetTypes,
        riskTolerance: options.riskTolerance,
        storeId: store.id,
        styleDirection: `${store.brandStyle}. Prioritize original, launch-ready products for ${store.audience}.`
      },
      confidence: clamp(55 + score / 2, 55, 95),
      existingProducts: activeProducts.length,
      externalExecution: false,
      launchPackageReady: approvedProducts.length >= options.minApprovedProducts,
      missingProducts,
      priority,
      projectedDraftProfit: projectedDraftProfit(products, Math.max(missingProducts, action === "seed_products" ? options.productCount : 0), priceRange),
      readyProductIds: approvedProducts.map((product) => product.id),
      readyProducts: approvedProducts.length,
      reason,
      score,
      storeId: store.id,
      storeName: store.businessName,
      targetProductTypes: targetTypes
    } satisfies RevenueLaunchStorePlan;
  })
    .sort((a, b) => a.priority - b.priority || b.score - a.score)
    .slice(0, options.maxStores);
  const queue = storePlans
    .map(queueItemForStore)
    .filter((item): item is RevenueLaunchQueueItem => Boolean(item))
    .sort((a, b) => a.priority - b.priority);
  const draftProductsNeeded = storePlans
    .filter((plan) => plan.action === "seed_products")
    .reduce((sum, plan) => sum + plan.batchInput.productCount, 0);
  const approvalReadyStores = storePlans.filter((plan) => plan.action === "queue_launch_approval").length;
  const launchPackageReadyStores = storePlans.filter((plan) => plan.launchPackageReady).length;
  const estimatedDraftProfit = money(storePlans.reduce((sum, plan) => sum + plan.projectedDraftProfit, 0));

  return {
    auditEvents: [
      "Revenue launch pipeline evaluated internally.",
      "Draft creation, approval packets, and store status changes remain inside ENTRAL.",
      "No marketplace, POD provider, ad platform, social platform, payment system, or browser automation provider was contacted."
    ],
    blockedExternalActions: [
      "Creating or publishing marketplace listings",
      "Changing Shopify, Etsy, Printify, or Printful data",
      "Uploading product artwork to external providers",
      "Posting social content",
      "Starting ad spend",
      "Moving money or issuing payouts",
      "Using browser stealth, anti-detection, or platform-evasion automation"
    ],
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Internal Launch Pipeline",
    options,
    queue,
    storePlans,
    summary: `${input.stores.length} stores evaluated. ${draftProductsNeeded} internal draft products are queued, ${approvalReadyStores} stores are ready for launch approval packets, and ${launchPackageReadyStores} stores have launch-package-ready products.`,
    totals: {
      approvalReadyStores,
      draftProductsNeeded,
      estimatedDraftProfit,
      launchPackageReadyStores,
      queuedStores: queue.length,
      storesEvaluated: input.stores.length
    }
  };
}
