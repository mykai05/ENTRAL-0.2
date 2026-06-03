import { analyzeCompliance } from "./complianceGuardrails.js";

export type RevenueEngineAction = "scale" | "prepare_launch" | "generate" | "watch" | "revise" | "pause" | "kill";

export type RevenueProductStatus =
  | "Idea"
  | "Prompt Ready"
  | "Designed"
  | "Mockup Created"
  | "Listing Drafted"
  | "Compliance Review"
  | "Awaiting Approval"
  | "Approved"
  | "Published"
  | "Needs Revision"
  | "Rejected"
  | "Archived";

export type RevenueStoreLaunchStatus =
  | "Lead"
  | "Discovery"
  | "Researching"
  | "Designing"
  | "Awaiting Approval"
  | "Building Store"
  | "Launched"
  | "Optimizing"
  | "Paused"
  | "Archived";

export type RevenueEngineThresholds = {
  maxRotationUpdates: number;
  minProductProfit: number;
  minProductMargin: number;
  minPortfolioProductsPerStore: number;
  minScaleProducts: number;
  scaleProductProfit: number;
  scaleProductMargin: number;
};

export type RevenueEngineStoreSnapshot = {
  approvalStatus: string;
  audience: string;
  brandStyle: string;
  businessName: string;
  clientName: string;
  estimatedProfit: number;
  id: string;
  industry: string;
  launchStatus: RevenueStoreLaunchStatus;
  productTypes: string[];
  revenue: number;
  storePlatform: string;
};

export type RevenueEngineProductSnapshot = {
  aiDisclosureNeeded: boolean;
  complianceNotes?: string | null;
  designConcept: string;
  designPrompt: string;
  designTheme?: string | null;
  estimatedProfit: number;
  id: string;
  listingDescription?: string | null;
  listingTitle?: string | null;
  productName: string;
  productType: string;
  productionPartnerDisclosureNeeded: boolean;
  profitMargin: number;
  retailPrice: number;
  status: RevenueProductStatus;
  storeId: string;
  tags: string[];
};

export type RevenueProductDecision = {
  action: RevenueEngineAction;
  confidence: number;
  externalExecution: false;
  priority: number;
  productId: string;
  productName: string;
  reason: string;
  recommendedInternalStatus?: RevenueProductStatus;
  riskLevel: "low" | "medium" | "high";
  status: RevenueProductStatus;
  storeId: string;
};

export type RevenueStoreDecision = {
  action: RevenueEngineAction;
  confidence: number;
  externalExecution: false;
  launchStatus: RevenueStoreLaunchStatus;
  priority: number;
  reason: string;
  recommendedLaunchStatus?: RevenueStoreLaunchStatus;
  storeId: string;
  storeName: string;
};

export type RevenuePipelineAction = {
  action: RevenueEngineAction;
  externalExecution: false;
  id: string;
  priority: number;
  summary: string;
  targetId: string;
  targetType: "store" | "product" | "portfolio";
  title: string;
};

export type RevenueAssetRotationDecision = "scale" | "watch" | "pause" | "kill";
export type RevenueAssetScoreBand = "excellent" | "healthy" | "watch" | "weak" | "critical";

export type RevenueRotationChange = {
  action: Extract<RevenueAssetRotationDecision, "pause" | "kill">;
  fromStatus: string;
  reason: string;
  targetId: string;
  targetName: string;
  targetType: "store" | "product";
  toStatus: string;
};

export type RevenueAssetScoreBreakdown = {
  economicsScore: number;
  finalRank: number;
  readinessScore: number;
  riskPenalty: number;
  velocity: number;
};

export type RevenueAssetPerformanceSignal = {
  action: RevenueAssetRotationDecision;
  confidence: number;
  conversionRate: number;
  evidenceGrade: "none" | "thin" | "usable" | "strong";
  grossRevenue: number;
  netProfit: number;
  netRevenue: number;
  profitMargin: number;
  profitVelocity: number;
  reason: string;
  revenueVelocity: number;
  snapshots: number;
};

export type RevenueAssetPerformanceDigestInput = {
  productScores: Array<RevenueAssetPerformanceSignal & {
    productId: string;
    recommendedInternalStatus?: RevenueProductStatus;
  }>;
  storeScores: Array<RevenueAssetPerformanceSignal & {
    recommendedLaunchStatus?: RevenueStoreLaunchStatus;
    storeId: string;
  }>;
  summary?: string;
  totals: {
    netProfit: number;
    netRevenue: number;
    profitVelocity: number;
    revenueVelocity: number;
    snapshots: number;
  };
};

export type RevenueAssetScore = {
  assetScore: RevenueAssetScoreBreakdown;
  assetId: string;
  assetName: string;
  assetType: "product" | "store";
  confidence: number;
  economics: {
    estimatedProfit: number;
    profitMargin: number;
    retailValue: number;
    revenue: number;
  };
  evidence: string[];
  externalExecution: false;
  priority: number;
  providerContacted: false;
  performance?: {
    action: RevenueAssetRotationDecision;
    confidence: number;
    conversionRate: number;
    evidenceGrade: RevenueAssetPerformanceSignal["evidenceGrade"];
    grossRevenue: number;
    netProfit: number;
    netRevenue: number;
    profitMargin: number;
    profitVelocity: number;
    reason: string;
    revenueVelocity: number;
    snapshots: number;
    sourceAction: RevenueAssetRotationDecision;
  };
  reason: string;
  readiness: {
    approvedProducts?: number;
    portfolioReady?: boolean;
    listingReady?: boolean;
    status: RevenueProductStatus | RevenueStoreLaunchStatus;
  };
  recommendedInternalStatus?: RevenueProductStatus;
  recommendedLaunchStatus?: RevenueStoreLaunchStatus;
  riskLevel: "low" | "medium" | "high";
  recommendation: RevenueAssetRotationDecision;
  rotationDecision: RevenueAssetRotationDecision;
  rotationReason: string;
  nextInternalState: RevenueProductStatus | RevenueStoreLaunchStatus | null;
  score: number;
  scoreBand: RevenueAssetScoreBand;
  storeId: string;
  storeName: string;
};

export type RevenueEnginePlan = {
  assetScores: RevenueAssetScore[];
  auditEvents: string[];
  blockedExternalActions: string[];
  decisionCounts: Record<RevenueEngineAction, number>;
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Revenue Engine";
  pipelineActions: RevenuePipelineAction[];
  productDecisions: RevenueProductDecision[];
  rotationChanges: RevenueRotationChange[];
  storeDecisions: RevenueStoreDecision[];
  summary: string;
  thresholds: RevenueEngineThresholds;
  totals: {
    approvedProducts: number;
    archivedProducts: number;
    estimatedProfit: number;
    estimatedRetailValue: number;
    highRiskProducts: number;
    products: number;
    publishedProducts: number;
    scaleAssets: number;
    stores: number;
    storesReadyToScale: number;
    watchAssets: number;
    totalRevenue: number;
  };
};

export type RevenueAssetPortfolio = {
  assets: RevenueAssetScore[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Engine Asset Portfolio";
  providerContacted: false;
  rotationChanges: RevenueRotationChange[];
  summary: string;
  thresholds: RevenueEngineThresholds;
  totals: {
    assets: number;
    estimatedProfit: number;
    kill: number;
    pause: number;
    performanceSnapshots: number;
    profitVelocity: number;
    products: number;
    revenueVelocity: number;
    rotationChanges: number;
    scale: number;
    stores: number;
    totalRevenue: number;
    trackedAssets: number;
    watch: number;
  };
};

export type RevenueAssetControlPlan = {
  action: RevenueAssetRotationDecision;
  asset: RevenueAssetScore;
  auditOnly: boolean;
  blockedExternalActions: string[];
  change: RevenueRotationChange | null;
  controlReview: RevenueAssetControlReview;
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Engine Asset Control";
  nextInternalState: RevenueProductStatus | RevenueStoreLaunchStatus | null;
  providerContacted: false;
  reason: string;
  requestedAction: RevenueAssetRotationDecision;
  statusChangeRequired: boolean;
  summary: string;
  warnings: string[];
};

export type RevenueAssetControlReview = {
  alignment: "matches_recommendation" | "dashboard_override";
  executionScope: "audit_only" | "internal_status_change";
  requiresOperatorReview: boolean;
  riskTier: "low" | "medium" | "high";
  statusImpact: "none" | "product_status_change" | "store_status_change";
  summary: string;
};

export type RevenueAssetBatchActionSelection = {
  action: RevenueAssetRotationDecision;
  assetId: string;
  assetType: RevenueAssetScore["assetType"];
};

export type RevenueAssetBatchSkippedAction = RevenueAssetBatchActionSelection & {
  reason: string;
};

export type RevenueAssetBatchControlPlan = {
  auditOnly: boolean;
  blockedExternalActions: string[];
  controlReview: RevenueAssetBatchControlReview;
  controls: RevenueAssetControlPlan[];
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Engine Asset Batch Control";
  productUpdates: RevenueRotationChange[];
  providerContacted: false;
  skipped: RevenueAssetBatchSkippedAction[];
  statusChangeRequired: boolean;
  storeUpdates: RevenueRotationChange[];
  summary: string;
  totals: {
    actions: number;
    auditOnly: number;
    kill: number;
    pause: number;
    productUpdates: number;
    scale: number;
    skipped: number;
    statusChangeRequired: number;
    storeUpdates: number;
    watch: number;
  };
  warnings: string[];
};

export type RevenueAssetBatchControlReview = {
  alignment: {
    dashboardOverrides: number;
    matchedRecommendations: number;
  };
  executionScope: {
    auditOnly: number;
    internalStatusChanges: number;
  };
  requiresOperatorReview: boolean;
  riskTier: "low" | "medium" | "high";
  riskTiers: {
    high: number;
    low: number;
    medium: number;
  };
  skipped: number;
  statusImpact: {
    none: number;
    productStatusChanges: number;
    storeStatusChanges: number;
  };
  summary: string;
};

export type RevenueAssetControlDuplicateSnapshot = {
  assetId: string;
  assetType: RevenueAssetScore["assetType"];
  auditOnly: boolean;
  economicsScore: number;
  finalRank: number;
  fromStatus: string | null;
  nextInternalState: string | null;
  override: boolean;
  readinessScore: number;
  requestedAction: RevenueAssetRotationDecision;
  riskPenalty: number;
  scoringRecommendation: RevenueAssetRotationDecision;
  statusChangeRequired: boolean;
  toStatus: string | null;
  velocity: number;
};

export const defaultRevenueEngineThresholds: RevenueEngineThresholds = {
  maxRotationUpdates: 25,
  minPortfolioProductsPerStore: 5,
  minProductMargin: 20,
  minProductProfit: 6,
  minScaleProducts: 2,
  scaleProductMargin: 35,
  scaleProductProfit: 12
};

const actionPriority: Record<RevenueEngineAction, number> = {
  kill: 1,
  pause: 2,
  revise: 3,
  scale: 4,
  prepare_launch: 5,
  generate: 6,
  watch: 7
};

const rotationPriority: Record<RevenueAssetRotationDecision, number> = {
  kill: 1,
  pause: 2,
  scale: 3,
  watch: 4
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function activeProduct(product: RevenueEngineProductSnapshot) {
  return product.status !== "Archived" && product.status !== "Rejected";
}

function approvedProduct(product: RevenueEngineProductSnapshot) {
  return product.status === "Approved" || product.status === "Published";
}

function listingReadyProduct(product: RevenueEngineProductSnapshot) {
  return approvedProduct(product)
    && Boolean(product.listingTitle)
    && Boolean(product.listingDescription)
    && product.tags.length >= 3;
}

function highRiskNote(product: RevenueEngineProductSnapshot) {
  const notes = product.complianceNotes?.toLowerCase() ?? "";
  return notes.includes("high risk")
    || notes.includes("manual compliance review")
    || notes.includes("prohibited content");
}

function decision(
  action: RevenueEngineAction,
  priorityOffset = 0
) {
  return {
    action,
    externalExecution: false as const,
    priority: actionPriority[action] + priorityOffset
  };
}

function scoreBand(score: number): RevenueAssetScoreBand {
  if (score >= 85) return "excellent";
  if (score >= 70) return "healthy";
  if (score >= 50) return "watch";
  if (score >= 30) return "weak";

  return "critical";
}

function riskPenalty(riskLevel: RevenueAssetScore["riskLevel"]) {
  if (riskLevel === "high") return 25;
  if (riskLevel === "medium") return 10;

  return 0;
}

function productReadinessScore(product: RevenueEngineProductSnapshot) {
  if (product.status === "Published") return 35;
  if (product.status === "Approved") return listingReadyProduct(product) ? 32 : 27;
  if (product.status === "Listing Drafted" || product.status === "Awaiting Approval") return 22;
  if (product.status === "Designed" || product.status === "Mockup Created" || product.status === "Compliance Review") return 16;
  if (product.status === "Idea" || product.status === "Prompt Ready") return 8;

  return 0;
}

function productEconomicsScore(product: RevenueEngineProductSnapshot, thresholds: RevenueEngineThresholds) {
  const profitScore = clamp(product.estimatedProfit / Math.max(thresholds.scaleProductProfit, 1) * 22, -15, 22);
  const marginScore = clamp(product.profitMargin / Math.max(thresholds.scaleProductMargin, 1) * 18, -10, 18);
  const priceScore = product.retailPrice > 0 ? 5 : 0;

  return clamp(Math.round(profitScore + marginScore + priceScore), 0, 45);
}

function productRotationDecision(input: {
  decision: RevenueProductDecision;
  product: RevenueEngineProductSnapshot;
}): RevenueAssetRotationDecision {
  if (input.decision.action === "kill") return "kill";
  if (input.decision.action === "pause") return "pause";
  if (input.decision.action === "revise") {
    return input.decision.recommendedInternalStatus === "Needs Revision" ? "pause" : "watch";
  }
  if (input.decision.action === "scale") return "scale";

  return "watch";
}

function productAssetScore(input: {
  decision: RevenueProductDecision;
  product: RevenueEngineProductSnapshot;
  store: RevenueEngineStoreSnapshot | null;
  thresholds: RevenueEngineThresholds;
}): RevenueAssetScore {
  const economicsScore = productEconomicsScore(input.product, input.thresholds);
  const readinessScore = productReadinessScore(input.product);
  const penalty = riskPenalty(input.decision.riskLevel);
  const velocity = 0;
  const finalRank = clamp(Math.round(economicsScore + readinessScore + velocity - penalty), 0, 100);
  const rotationDecision = productRotationDecision({
    decision: input.decision,
    product: input.product
  });
  const storeName = input.store?.businessName ?? "Unassigned Store";
  const nextInternalState = input.decision.recommendedInternalStatus ?? null;

  return {
    assetScore: {
      economicsScore,
      finalRank,
      readinessScore,
      riskPenalty: penalty,
      velocity
    },
    assetId: input.product.id,
    assetName: input.product.productName,
    assetType: "product",
    confidence: input.decision.confidence,
    economics: {
      estimatedProfit: money(input.product.estimatedProfit),
      profitMargin: money(input.product.profitMargin),
      retailValue: money(input.product.retailPrice),
      revenue: 0
    },
    evidence: [
      `Economics ${economicsScore}/45`,
      `Readiness ${readinessScore}/35`,
      `Risk penalty ${penalty}`,
      `Status ${input.product.status}`
    ],
    externalExecution: false,
    priority: rotationPriority[rotationDecision] * 100 - finalRank,
    providerContacted: false,
    readiness: {
      listingReady: listingReadyProduct(input.product),
      status: input.product.status
    },
    recommendedInternalStatus: input.decision.recommendedInternalStatus,
    nextInternalState,
    reason: input.decision.reason,
    recommendation: rotationDecision,
    riskLevel: input.decision.riskLevel,
    rotationDecision,
    rotationReason: input.decision.reason,
    score: finalRank,
    scoreBand: scoreBand(finalRank),
    storeId: input.product.storeId,
    storeName
  };
}

function storeEconomicsScore(store: RevenueEngineStoreSnapshot, products: RevenueEngineProductSnapshot[], thresholds: RevenueEngineThresholds) {
  const estimatedProfit = store.estimatedProfit || products.reduce((sum, product) => sum + product.estimatedProfit, 0);
  const productValue = products.reduce((sum, product) => sum + product.retailPrice, 0);
  const profitScore = clamp(estimatedProfit / Math.max(thresholds.scaleProductProfit * thresholds.minScaleProducts, 1) * 24, -12, 24);
  const revenueScore = clamp(store.revenue / 1000 * 10, 0, 10);
  const retailScore = clamp(productValue / 200 * 11, 0, 11);

  return clamp(Math.round(profitScore + revenueScore + retailScore), 0, 45);
}

function storeReadinessScore(store: RevenueEngineStoreSnapshot, products: RevenueEngineProductSnapshot[], thresholds: RevenueEngineThresholds) {
  const active = products.filter(activeProduct).length;
  const approved = products.filter(approvedProduct).length;
  const listingReady = products.filter(listingReadyProduct).length;
  const portfolioScore = clamp(active / Math.max(thresholds.minPortfolioProductsPerStore, 1) * 13, 0, 13);
  const approvalScore = clamp(approved / Math.max(thresholds.minScaleProducts, 1) * 11, 0, 11);
  const listingScore = clamp(listingReady / Math.max(thresholds.minScaleProducts, 1) * 7, 0, 7);
  const statusScore = store.launchStatus === "Optimizing" || store.launchStatus === "Launched"
    ? 4
    : store.launchStatus === "Building Store" || store.launchStatus === "Awaiting Approval"
      ? 3
      : 1;

  return clamp(Math.round(portfolioScore + approvalScore + listingScore + statusScore), 0, 35);
}

function storeRiskLevel(store: RevenueEngineStoreSnapshot, productScores: RevenueAssetScore[]): RevenueAssetScore["riskLevel"] {
  if (store.launchStatus === "Archived" || productScores.some((score) => score.storeId === store.id && score.riskLevel === "high")) return "high";
  if (store.launchStatus === "Paused" || productScores.filter((score) => score.storeId === store.id && score.rotationDecision === "pause").length >= 2) return "medium";

  return "low";
}

function storeRotationDecision(decision: RevenueStoreDecision): RevenueAssetRotationDecision {
  if (decision.action === "kill") return "kill";
  if (decision.action === "pause") return "pause";
  if (decision.action === "scale") return "scale";

  return "watch";
}

function storeAssetScore(input: {
  decision: RevenueStoreDecision;
  productScores: RevenueAssetScore[];
  products: RevenueEngineProductSnapshot[];
  store: RevenueEngineStoreSnapshot;
  thresholds: RevenueEngineThresholds;
}): RevenueAssetScore {
  const economicsScore = storeEconomicsScore(input.store, input.products, input.thresholds);
  const readinessScore = storeReadinessScore(input.store, input.products, input.thresholds);
  const riskLevel = storeRiskLevel(input.store, input.productScores);
  const penalty = riskPenalty(riskLevel);
  const velocity = input.store.revenue > 0 ? money(input.store.revenue / 30) : 0;
  const velocityScore = clamp(velocity / 20, 0, 15);
  const finalRank = clamp(Math.round(economicsScore + readinessScore + velocityScore - penalty), 0, 100);
  const rotationDecision = storeRotationDecision(input.decision);
  const approvedProducts = input.products.filter(approvedProduct).length;
  const nextInternalState = input.decision.recommendedLaunchStatus ?? null;

  return {
    assetScore: {
      economicsScore,
      finalRank,
      readinessScore,
      riskPenalty: penalty,
      velocity
    },
    assetId: input.store.id,
    assetName: input.store.businessName,
    assetType: "store",
    confidence: input.decision.confidence,
    economics: {
      estimatedProfit: money(input.store.estimatedProfit || input.products.reduce((sum, product) => sum + product.estimatedProfit, 0)),
      profitMargin: 0,
      retailValue: money(input.products.reduce((sum, product) => sum + product.retailPrice, 0)),
      revenue: money(input.store.revenue)
    },
    evidence: [
      `Economics ${economicsScore}/45`,
      `Readiness ${readinessScore}/35`,
      `Risk penalty ${penalty}`,
      `Velocity ${velocity}/day`,
      `${approvedProducts} approved product${approvedProducts === 1 ? "" : "s"}`
    ],
    externalExecution: false,
    priority: rotationPriority[rotationDecision] * 100 - finalRank,
    providerContacted: false,
    readiness: {
      approvedProducts,
      portfolioReady: input.products.filter(activeProduct).length >= input.thresholds.minPortfolioProductsPerStore,
      status: input.store.launchStatus
    },
    recommendedLaunchStatus: input.decision.recommendedLaunchStatus,
    nextInternalState,
    reason: input.decision.reason,
    recommendation: rotationDecision,
    riskLevel,
    rotationDecision,
    rotationReason: input.decision.reason,
    score: finalRank,
    scoreBand: scoreBand(finalRank),
    storeId: input.store.id,
    storeName: input.store.businessName
  };
}

function decideProduct(product: RevenueEngineProductSnapshot, thresholds: RevenueEngineThresholds): RevenueProductDecision {
  const compliance = analyzeCompliance(product);
  const riskLevel = highRiskNote(product) ? "high" : compliance.riskLevel;
  const base = {
    productId: product.id,
    productName: product.productName,
    riskLevel,
    status: product.status,
    storeId: product.storeId
  };
  const nonPositiveEconomics = product.retailPrice <= 0 || product.estimatedProfit <= 0;
  const lowEconomics = product.estimatedProfit < thresholds.minProductProfit || product.profitMargin < thresholds.minProductMargin;
  const scaleEconomics = product.estimatedProfit >= thresholds.scaleProductProfit && product.profitMargin >= thresholds.scaleProductMargin;

  if (product.status === "Archived") {
    return {
      ...base,
      ...decision("kill", 4),
      confidence: 99,
      reason: "Product is already archived and should stay out of the active portfolio.",
      recommendedInternalStatus: "Archived"
    };
  }

  if (product.status === "Rejected" || nonPositiveEconomics) {
    return {
      ...base,
      ...decision("kill"),
      confidence: product.status === "Rejected" ? 95 : 88,
      reason: product.status === "Rejected"
        ? "Rejected product should be removed from the active revenue path."
        : "Product has non-positive economics and should be archived before it consumes more attention.",
      recommendedInternalStatus: "Archived"
    };
  }

  if (riskLevel === "high") {
    return {
      ...base,
      ...decision("pause"),
      confidence: 90,
      reason: "High compliance risk requires pausing the asset until a real improvement path is reviewed.",
      recommendedInternalStatus: "Needs Revision"
    };
  }

  if (lowEconomics) {
    return {
      ...base,
      ...decision(product.status === "Published" ? "pause" : "watch"),
      confidence: 82,
      reason: product.status === "Published"
        ? `Published asset is below profit or margin threshold (${money(product.estimatedProfit)} / ${money(product.profitMargin)}%); pause before more traffic is sent.`
        : `Estimated profit or margin is below threshold (${money(product.estimatedProfit)} / ${money(product.profitMargin)}%); watch until pricing, offer, or listing improvements are available.`,
      recommendedInternalStatus: product.status === "Published" ? "Needs Revision" : undefined
    };
  }

  if (product.status === "Published" && scaleEconomics) {
    return {
      ...base,
      ...decision("scale"),
      confidence: 91,
      reason: "Published product has strong estimated unit economics and is ready for replication, promotion prep, or variant expansion."
    };
  }

  if (product.status === "Approved" && scaleEconomics) {
    return {
      ...base,
      ...decision("scale"),
      confidence: 88,
      reason: "Approved product has strong estimated unit economics and should move into launch package and variant planning."
    };
  }

  if (product.status === "Approved") {
    return {
      ...base,
      ...decision("prepare_launch"),
      confidence: 82,
      reason: "Approved product is economically viable and ready for launch-package preparation."
    };
  }

  if (product.status === "Idea" || product.status === "Prompt Ready") {
    return {
      ...base,
      ...decision("generate"),
      confidence: 72,
      reason: "Product needs to move from idea or prompt into a complete listing-ready draft."
    };
  }

  return {
    ...base,
    ...decision("watch"),
    confidence: 70,
    reason: "Product is in the normal approval or design pipeline and should be watched until the next decision point."
  };
}

function decideStore(
  store: RevenueEngineStoreSnapshot,
  products: RevenueEngineProductSnapshot[],
  productDecisions: RevenueProductDecision[],
  thresholds: RevenueEngineThresholds
): RevenueStoreDecision {
  const active = products.filter(activeProduct);
  const approved = products.filter(approvedProduct);
  const scaleProducts = productDecisions.filter((item) => item.storeId === store.id && item.action === "scale");
  const weakProductIds = new Set(productDecisions
    .filter((item) => item.storeId === store.id && (item.action === "kill" || item.action === "pause"))
    .map((item) => item.productId));
  const weakProducts = products.filter((product) => (
    weakProductIds.has(product.id)
    || product.retailPrice <= 0
    || product.estimatedProfit < thresholds.minProductProfit
    || product.profitMargin < thresholds.minProductMargin
  ));
  const averageApprovedProfit = average(approved.map((product) => product.estimatedProfit));
  const estimatedProfit = store.estimatedProfit || products.reduce((sum, product) => sum + product.estimatedProfit, 0);

  if (store.launchStatus === "Archived") {
    return {
      ...decision("kill", 4),
      confidence: 99,
      reason: "Store is already archived and should remain out of active operations.",
      launchStatus: store.launchStatus,
      recommendedLaunchStatus: "Archived",
      storeId: store.id,
      storeName: store.businessName
    };
  }

  if (store.launchStatus === "Paused") {
    return {
      ...decision("pause", 3),
      confidence: 94,
      reason: "Store is already paused and should not receive new scale actions until reviewed.",
      launchStatus: store.launchStatus,
      recommendedLaunchStatus: "Paused",
      storeId: store.id,
      storeName: store.businessName
    };
  }

  if (
    products.length > 0
    && approved.length === 0
    && estimatedProfit < thresholds.minProductProfit * thresholds.minPortfolioProductsPerStore
    && weakProducts.length / products.length >= 0.6
  ) {
    return {
      ...decision("pause"),
      confidence: 84,
      launchStatus: store.launchStatus,
      reason: "Most active products are weak or blocked and no approved products are ready; pause internal work before spending more cycles.",
      recommendedLaunchStatus: "Paused",
      storeId: store.id,
      storeName: store.businessName
    };
  }

  if (products.length === 0 || active.length < thresholds.minPortfolioProductsPerStore) {
    return {
      ...decision("generate"),
      confidence: 86,
      launchStatus: store.launchStatus,
      reason: `Store needs at least ${thresholds.minPortfolioProductsPerStore} active product drafts before launch economics are meaningful.`,
      storeId: store.id,
      storeName: store.businessName
    };
  }

  if (scaleProducts.length >= thresholds.minScaleProducts && averageApprovedProfit >= thresholds.scaleProductProfit) {
    return {
      ...decision("scale"),
      confidence: 90,
      launchStatus: store.launchStatus,
      reason: `${scaleProducts.length} products meet scale economics; prepare variants, launch package, and approval-locked growth work.`,
      storeId: store.id,
      storeName: store.businessName
    };
  }

  if (approved.length > 0 && ["Listings Approved", "Launch Approved"].includes(store.approvalStatus)) {
    return {
      ...decision("prepare_launch"),
      confidence: 86,
      launchStatus: store.launchStatus,
      reason: "Store has approved products and approval status is close enough to prepare launch materials.",
      storeId: store.id,
      storeName: store.businessName
    };
  }

  return {
    ...decision("watch"),
    confidence: 72,
    launchStatus: store.launchStatus,
    reason: "Store has active work but does not yet meet launch, pause, or scale thresholds.",
    storeId: store.id,
    storeName: store.businessName
  };
}

function pipelineActionsForStore(store: RevenueStoreDecision): RevenuePipelineAction[] {
  const base = {
    externalExecution: false as const,
    priority: store.priority,
    targetId: store.storeId,
    targetType: "store" as const
  };

  if (store.action === "scale") {
    return [
      {
        ...base,
        action: "scale",
        id: `revenue_scale_${store.storeId}`,
        summary: "Create variant and promotion prep internally, then queue a locked growth approval packet.",
        title: `Scale ${store.storeName}`
      }
    ];
  }

  if (store.action === "prepare_launch") {
    return [
      {
        ...base,
        action: "prepare_launch",
        id: `revenue_launch_${store.storeId}`,
        summary: "Build launch package, pricing review, compliance checklist, and marketplace handoff notes.",
        title: `Prepare launch package for ${store.storeName}`
      }
    ];
  }

  if (store.action === "generate") {
    return [
      {
        ...base,
        action: "generate",
        id: `revenue_generate_${store.storeId}`,
        summary: "Generate a new POD or digital product batch using the store audience, style, price range, and risk threshold.",
        title: `Generate product batch for ${store.storeName}`
      }
    ];
  }

  if (store.action === "pause" || store.action === "kill") {
    return [
      {
        ...base,
        action: store.action,
        id: `revenue_rotation_${store.storeId}`,
        summary: "Apply internal status changes only. No external store, marketplace, ad, social, or payment system is contacted.",
        title: `${store.action === "pause" ? "Pause" : "Archive"} weak revenue path for ${store.storeName}`
      }
    ];
  }

  return [];
}

function createRotationChanges(plan: Pick<RevenueEnginePlan, "productDecisions" | "storeDecisions" | "thresholds">): RevenueRotationChange[] {
  const productChanges = plan.productDecisions
    .filter((item) => (
      (item.action === "kill" || item.action === "pause")
      && item.recommendedInternalStatus
      && item.status !== item.recommendedInternalStatus
    ))
    .map((item): RevenueRotationChange => ({
      action: item.action === "kill" ? "kill" : "pause",
      fromStatus: item.status,
      reason: item.reason,
      targetId: item.productId,
      targetName: item.productName,
      targetType: "product",
      toStatus: item.recommendedInternalStatus ?? item.status
    }));

  const storeChanges = plan.storeDecisions
    .filter((item) => (
      (item.action === "pause" || item.action === "kill")
      && item.recommendedLaunchStatus
      && item.launchStatus !== item.recommendedLaunchStatus
    ))
    .map((item): RevenueRotationChange => ({
      action: item.action === "kill" ? "kill" : "pause",
      fromStatus: item.launchStatus,
      reason: item.reason,
      targetId: item.storeId,
      targetName: item.storeName,
      targetType: "store",
      toStatus: item.recommendedLaunchStatus ?? "Paused"
    }));

  return [...productChanges, ...storeChanges]
    .sort((a, b) => rotationPriority[a.action] - rotationPriority[b.action])
    .slice(0, plan.thresholds.maxRotationUpdates);
}

export function withRevenueEngineThresholds(input: Partial<RevenueEngineThresholds> = {}): RevenueEngineThresholds {
  return {
    maxRotationUpdates: clamp(Math.round(input.maxRotationUpdates ?? defaultRevenueEngineThresholds.maxRotationUpdates), 1, 250),
    minPortfolioProductsPerStore: clamp(Math.round(input.minPortfolioProductsPerStore ?? defaultRevenueEngineThresholds.minPortfolioProductsPerStore), 1, 100),
    minProductMargin: clamp(input.minProductMargin ?? defaultRevenueEngineThresholds.minProductMargin, 0, 100),
    minProductProfit: clamp(input.minProductProfit ?? defaultRevenueEngineThresholds.minProductProfit, 0, 999_999),
    minScaleProducts: clamp(Math.round(input.minScaleProducts ?? defaultRevenueEngineThresholds.minScaleProducts), 1, 100),
    scaleProductMargin: clamp(input.scaleProductMargin ?? defaultRevenueEngineThresholds.scaleProductMargin, 0, 100),
    scaleProductProfit: clamp(input.scaleProductProfit ?? defaultRevenueEngineThresholds.scaleProductProfit, 0, 999_999)
  };
}

export function buildRevenueEnginePlan(input: {
  generatedAt?: string;
  products: RevenueEngineProductSnapshot[];
  stores: RevenueEngineStoreSnapshot[];
  thresholds?: Partial<RevenueEngineThresholds>;
}): RevenueEnginePlan {
  const thresholds = withRevenueEngineThresholds(input.thresholds);
  const productDecisions = input.products
    .map((product) => decideProduct(product, thresholds))
    .sort((a, b) => a.priority - b.priority || b.confidence - a.confidence);
  const storeDecisions = input.stores
    .map((store) => {
      const products = input.products.filter((product) => product.storeId === store.id);
      return decideStore(store, products, productDecisions, thresholds);
    })
    .sort((a, b) => a.priority - b.priority || b.confidence - a.confidence);
  const storesById = new Map(input.stores.map((store) => [store.id, store]));
  const productScores = input.products.map((product) => {
    const productDecision = productDecisions.find((item) => item.productId === product.id);

    if (!productDecision) {
      throw new Error(`Missing revenue decision for product ${product.id}.`);
    }

    return productAssetScore({
      decision: productDecision,
      product,
      store: storesById.get(product.storeId) ?? null,
      thresholds
    });
  });
  const storeScores = input.stores.map((store) => {
    const storeDecision = storeDecisions.find((item) => item.storeId === store.id);

    if (!storeDecision) {
      throw new Error(`Missing revenue decision for store ${store.id}.`);
    }

    return storeAssetScore({
      decision: storeDecision,
      productScores,
      products: input.products.filter((product) => product.storeId === store.id),
      store,
      thresholds
    });
  });
  const assetScores = [...productScores, ...storeScores]
    .sort((a, b) => a.priority - b.priority || b.score - a.score);
  const pipelineActions = storeDecisions
    .flatMap(pipelineActionsForStore)
    .sort((a, b) => a.priority - b.priority);
  const decisionCounts = productDecisions
    .concat(storeDecisions.map((item) => ({
      ...item,
      productId: item.storeId,
      productName: item.storeName,
      riskLevel: "low" as const,
      status: "Idea" as const
    })))
    .reduce<Record<RevenueEngineAction, number>>((counts, item) => {
      counts[item.action] += 1;
      return counts;
    }, {
      generate: 0,
      kill: 0,
      pause: 0,
      prepare_launch: 0,
      revise: 0,
      scale: 0,
      watch: 0
    });
  const highRiskProducts = productDecisions.filter((decisionItem) => decisionItem.riskLevel === "high").length;
  const rotationPlan = {
    productDecisions,
    storeDecisions,
    thresholds
  };
  const rotationChanges = createRotationChanges(rotationPlan);
  const approvedProducts = input.products.filter((product) => product.status === "Approved").length;
  const publishedProducts = input.products.filter((product) => product.status === "Published").length;
  const storesReadyToScale = storeDecisions.filter((item) => item.action === "scale").length;

  return {
    assetScores,
    auditEvents: [
      "Revenue Engine portfolio evaluated internally.",
      "No external commerce, POD, ad, social, banking, or browser automation system was contacted.",
      "Rotation changes modify ENTRAL internal records only and require the apply endpoint confirmation."
    ],
    blockedExternalActions: [
      "Publishing marketplace listings",
      "Changing Shopify, Etsy, Printify, or Printful data",
      "Starting ad spend",
      "Posting social content",
      "Moving money or issuing payouts",
      "Using browser stealth, anti-detection, or platform-evasion automation"
    ],
    decisionCounts,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Internal Revenue Engine",
    pipelineActions,
    productDecisions,
    rotationChanges,
    storeDecisions,
    summary: `${input.stores.length} stores and ${input.products.length} products evaluated. ${storesReadyToScale} stores are ready to scale, ${approvedProducts + publishedProducts} products are launch-ready or live, and ${rotationChanges.length} internal rotation changes are queued.`,
    thresholds,
    totals: {
      approvedProducts,
      archivedProducts: input.products.filter((product) => product.status === "Archived").length,
      estimatedProfit: money(input.products.reduce((sum, product) => sum + product.estimatedProfit, 0)),
      estimatedRetailValue: money(input.products.reduce((sum, product) => sum + product.retailPrice, 0)),
      highRiskProducts,
      products: input.products.length,
      publishedProducts,
      scaleAssets: assetScores.filter((score) => score.rotationDecision === "scale").length,
      stores: input.stores.length,
      storesReadyToScale,
      watchAssets: assetScores.filter((score) => score.rotationDecision === "watch").length,
      totalRevenue: money(input.stores.reduce((sum, store) => sum + store.revenue, 0))
    }
  };
}

export function buildRevenueAssetPortfolio(plan: RevenueEnginePlan): RevenueAssetPortfolio {
  const decisionCount = (decision: RevenueAssetRotationDecision) => plan.assetScores.filter((score) => score.recommendation === decision).length;

  return {
    assets: plan.assetScores,
    blockedExternalActions: plan.blockedExternalActions,
    externalExecution: false,
    generatedAt: plan.generatedAt,
    mode: "Revenue Engine Asset Portfolio",
    providerContacted: false,
    rotationChanges: plan.rotationChanges,
    summary: `${plan.assetScores.length} assets scored. ${decisionCount("scale")} scale, ${decisionCount("watch")} watch, ${decisionCount("pause")} pause, and ${decisionCount("kill")} kill recommendation${plan.assetScores.length === 1 ? "" : "s"} are ready for dashboard review.`,
    thresholds: plan.thresholds,
    totals: {
      assets: plan.assetScores.length,
      estimatedProfit: plan.totals.estimatedProfit,
      kill: decisionCount("kill"),
      pause: decisionCount("pause"),
      performanceSnapshots: 0,
      profitVelocity: 0,
      products: plan.totals.products,
      revenueVelocity: 0,
      rotationChanges: plan.rotationChanges.length,
      scale: decisionCount("scale"),
      stores: plan.totals.stores,
      totalRevenue: plan.totals.totalRevenue,
      trackedAssets: 0,
      watch: decisionCount("watch")
    }
  };
}

function nextStateForAssetAction(asset: RevenueAssetScore, action: RevenueAssetRotationDecision): RevenueProductStatus | RevenueStoreLaunchStatus | null {
  if (action === "kill") return "Archived";
  if (action === "pause") return asset.assetType === "product" ? "Needs Revision" : "Paused";

  return null;
}

function buildRevenueAssetControlReview(input: {
  action: RevenueAssetRotationDecision;
  asset: RevenueAssetScore;
  auditOnly: boolean;
  change: RevenueRotationChange | null;
  warnings: string[];
}): RevenueAssetControlReview {
  const alignment = input.action === input.asset.recommendation ? "matches_recommendation" : "dashboard_override";
  const statusImpact = input.change
    ? input.asset.assetType === "product" ? "product_status_change" : "store_status_change"
    : "none";
  const executionScope = input.auditOnly ? "audit_only" : "internal_status_change";
  const requiresOperatorReview = alignment === "dashboard_override"
    || input.action === "kill"
    || input.action === "pause"
    || input.asset.riskLevel === "high";
  const riskTier: RevenueAssetControlReview["riskTier"] = input.action === "kill" || input.asset.riskLevel === "high"
    ? "high"
    : requiresOperatorReview || input.warnings.length > 0 ? "medium" : "low";
  const alignmentLabel = alignment === "matches_recommendation" ? "matches scoring" : "dashboard override";
  const scopeLabel = executionScope === "audit_only" ? "audit-only" : "internal status change";
  const impactLabel = statusImpact === "none" ? "no state change" : statusImpact.replace(/_/g, " ");

  return {
    alignment,
    executionScope,
    requiresOperatorReview,
    riskTier,
    statusImpact,
    summary: `${input.action} is ${alignmentLabel}, ${scopeLabel}, ${impactLabel}, ${riskTier} review risk.`
  };
}

function buildRevenueAssetBatchControlReview(input: {
  controls: RevenueAssetControlPlan[];
  skipped: RevenueAssetBatchSkippedAction[];
  warnings: string[];
}): RevenueAssetBatchControlReview {
  const matchedRecommendations = input.controls.filter((control) => control.controlReview.alignment === "matches_recommendation").length;
  const dashboardOverrides = input.controls.filter((control) => control.controlReview.alignment === "dashboard_override").length;
  const auditOnly = input.controls.filter((control) => control.controlReview.executionScope === "audit_only").length;
  const internalStatusChanges = input.controls.filter((control) => control.controlReview.executionScope === "internal_status_change").length;
  const high = input.controls.filter((control) => control.controlReview.riskTier === "high").length;
  const medium = input.controls.filter((control) => control.controlReview.riskTier === "medium").length;
  const low = input.controls.filter((control) => control.controlReview.riskTier === "low").length;
  const none = input.controls.filter((control) => control.controlReview.statusImpact === "none").length;
  const productStatusChanges = input.controls.filter((control) => control.controlReview.statusImpact === "product_status_change").length;
  const storeStatusChanges = input.controls.filter((control) => control.controlReview.statusImpact === "store_status_change").length;
  const requiresOperatorReview = input.controls.some((control) => control.controlReview.requiresOperatorReview)
    || dashboardOverrides > 0
    || input.skipped.length > 0;
  const riskTier: RevenueAssetBatchControlReview["riskTier"] = high > 0
    ? "high"
    : medium > 0 || input.warnings.length > 0 || input.skipped.length > 0 ? "medium" : "low";

  return {
    alignment: {
      dashboardOverrides,
      matchedRecommendations
    },
    executionScope: {
      auditOnly,
      internalStatusChanges
    },
    requiresOperatorReview,
    riskTier,
    riskTiers: {
      high,
      low,
      medium
    },
    skipped: input.skipped.length,
    statusImpact: {
      none,
      productStatusChanges,
      storeStatusChanges
    },
    summary: `${input.controls.length} batch asset action${input.controls.length === 1 ? "" : "s"} reviewed: ${matchedRecommendations} match scoring, ${dashboardOverrides} dashboard override${dashboardOverrides === 1 ? "" : "s"}, ${internalStatusChanges} internal status change${internalStatusChanges === 1 ? "" : "s"}, ${auditOnly} audit-only intent${auditOnly === 1 ? "" : "s"}, ${riskTier} review risk. ${input.skipped.length} skipped.`
  };
}

export function buildRevenueAssetControlPlan(input: {
  action: RevenueAssetRotationDecision;
  assetId: string;
  assetType: RevenueAssetScore["assetType"];
  generatedAt?: string;
  portfolio: RevenueAssetPortfolio;
}): RevenueAssetControlPlan | null {
  const asset = input.portfolio.assets.find((item) => item.assetId === input.assetId && item.assetType === input.assetType);

  if (!asset) {
    return null;
  }

  const nextInternalState = nextStateForAssetAction(asset, input.action);
  const currentState = asset.readiness.status;
  const statusChangeRequired = nextInternalState !== null && nextInternalState !== currentState;
  const auditOnly = input.action === "scale" || input.action === "watch" || !statusChangeRequired;
  const reason = input.action === asset.recommendation
    ? asset.reason
    : `Dashboard override requested ${input.action} while the scoring engine recommended ${asset.recommendation}.`;
  const warnings = [
    input.action !== asset.recommendation ? "Requested action differs from the scoring recommendation; retain manual review context." : null,
    input.action === "scale" ? "Scale is recorded as an internal intent only; provider publishing, ad spend, uploads, payouts, and browser automation remain locked." : null,
    input.action === "watch" ? "Watch records the review decision without changing internal asset state." : null
  ].filter((warning): warning is string => Boolean(warning));
  const change: RevenueRotationChange | null = statusChangeRequired && nextInternalState
    ? {
      action: input.action === "kill" ? "kill" : "pause",
      fromStatus: currentState,
      reason,
      targetId: asset.assetId,
      targetName: asset.assetName,
      targetType: asset.assetType,
      toStatus: nextInternalState
    }
    : null;
  const controlReview = buildRevenueAssetControlReview({
    action: input.action,
    asset,
    auditOnly,
    change,
    warnings
  });

  return {
    action: input.action,
    asset,
    auditOnly,
    blockedExternalActions: input.portfolio.blockedExternalActions,
    change,
    controlReview,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Revenue Engine Asset Control",
    nextInternalState,
    providerContacted: false,
    reason,
    requestedAction: input.action,
    statusChangeRequired,
    summary: change
      ? `${input.action} will move ${asset.assetName} from ${currentState} to ${nextInternalState} inside ENTRAL records only.`
      : `${input.action} will be recorded for ${asset.assetName}; no internal status change is required.`,
    warnings
  };
}

export function buildRevenueAssetBatchControlPlan(input: {
  generatedAt?: string;
  portfolio: RevenueAssetPortfolio;
  selections: RevenueAssetBatchActionSelection[];
}): RevenueAssetBatchControlPlan {
  const seen = new Set<string>();
  const controls: RevenueAssetControlPlan[] = [];
  const skipped: RevenueAssetBatchSkippedAction[] = [];

  for (const selection of input.selections) {
    const key = `${selection.assetType}:${selection.assetId}`;

    if (seen.has(key)) {
      skipped.push({
        ...selection,
        reason: "Duplicate asset selection skipped; only the first selected action is used."
      });
      continue;
    }

    seen.add(key);

    const control = buildRevenueAssetControlPlan({
      action: selection.action,
      assetId: selection.assetId,
      assetType: selection.assetType,
      portfolio: input.portfolio
    });

    if (!control) {
      skipped.push({
        ...selection,
        reason: "Asset was not found in the current scored portfolio."
      });
      continue;
    }

    controls.push(control);
  }

  const productUpdates = controls
    .map((control) => control.change)
    .filter((change): change is RevenueRotationChange => change?.targetType === "product");
  const storeUpdates = controls
    .map((control) => control.change)
    .filter((change): change is RevenueRotationChange => change?.targetType === "store");
  const count = (action: RevenueAssetRotationDecision) => controls.filter((control) => control.action === action).length;
  const warnings = Array.from(new Set(controls.flatMap((control) => control.warnings)));
  const controlReview = buildRevenueAssetBatchControlReview({
    controls,
    skipped,
    warnings
  });

  return {
    auditOnly: controls.every((control) => control.auditOnly),
    blockedExternalActions: input.portfolio.blockedExternalActions,
    controlReview,
    controls,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Revenue Engine Asset Batch Control",
    productUpdates,
    providerContacted: false,
    skipped,
    statusChangeRequired: controls.some((control) => control.statusChangeRequired),
    storeUpdates,
    summary: `${controls.length} selected asset action${controls.length === 1 ? "" : "s"} prepared: ${productUpdates.length + storeUpdates.length} internal state change${productUpdates.length + storeUpdates.length === 1 ? "" : "s"} and ${controls.filter((control) => control.auditOnly).length} audit-only intent${controls.filter((control) => control.auditOnly).length === 1 ? "" : "s"}. ${skipped.length} skipped.`,
    totals: {
      actions: controls.length,
      auditOnly: controls.filter((control) => control.auditOnly).length,
      kill: count("kill"),
      pause: count("pause"),
      productUpdates: productUpdates.length,
      scale: count("scale"),
      skipped: skipped.length,
      statusChangeRequired: controls.filter((control) => control.statusChangeRequired).length,
      storeUpdates: storeUpdates.length,
      watch: count("watch")
    },
    warnings
  };
}

function duplicateSnapshotFromControl(control: RevenueAssetControlPlan): RevenueAssetControlDuplicateSnapshot {
  return {
    assetId: control.asset.assetId,
    assetType: control.asset.assetType,
    auditOnly: control.auditOnly,
    economicsScore: control.asset.assetScore.economicsScore,
    finalRank: control.asset.assetScore.finalRank,
    fromStatus: control.change?.fromStatus ?? control.asset.readiness.status,
    nextInternalState: control.nextInternalState,
    override: control.requestedAction !== control.asset.recommendation,
    readinessScore: control.asset.assetScore.readinessScore,
    requestedAction: control.requestedAction,
    riskPenalty: control.asset.assetScore.riskPenalty,
    scoringRecommendation: control.asset.recommendation,
    statusChangeRequired: control.statusChangeRequired,
    toStatus: control.change?.toStatus ?? control.nextInternalState,
    velocity: control.asset.assetScore.velocity
  };
}

function duplicateKey(input: Pick<RevenueAssetControlDuplicateSnapshot, "assetId" | "assetType">) {
  return `${input.assetType}:${input.assetId}`;
}

function nullableEqual(left: string | null, right: string | null) {
  return (left ?? null) === (right ?? null);
}

function duplicateControlMatchesLatest(control: RevenueAssetControlPlan, latest: RevenueAssetControlDuplicateSnapshot) {
  const next = duplicateSnapshotFromControl(control);

  return latest.requestedAction === next.requestedAction
    && latest.scoringRecommendation === next.scoringRecommendation
    && latest.finalRank === next.finalRank
    && latest.economicsScore === next.economicsScore
    && latest.readinessScore === next.readinessScore
    && latest.riskPenalty === next.riskPenalty
    && latest.velocity === next.velocity
    && nullableEqual(latest.fromStatus, next.fromStatus)
    && nullableEqual(latest.toStatus, next.toStatus)
    && nullableEqual(latest.nextInternalState, next.nextInternalState)
    && latest.statusChangeRequired === next.statusChangeRequired
    && latest.auditOnly === next.auditOnly
    && latest.override === next.override;
}

export function rebuildRevenueAssetBatchControlPlan(input: {
  batch: RevenueAssetBatchControlPlan;
  controls: RevenueAssetControlPlan[];
  skipped?: RevenueAssetBatchSkippedAction[];
}): RevenueAssetBatchControlPlan {
  const controls = input.controls;
  const skipped = input.skipped ?? input.batch.skipped;
  const productUpdates = controls
    .map((control) => control.change)
    .filter((change): change is RevenueRotationChange => change?.targetType === "product");
  const storeUpdates = controls
    .map((control) => control.change)
    .filter((change): change is RevenueRotationChange => change?.targetType === "store");
  const count = (action: RevenueAssetRotationDecision) => controls.filter((control) => control.action === action).length;
  const warnings = Array.from(new Set(controls.flatMap((control) => control.warnings)));
  const auditOnlyCount = controls.filter((control) => control.auditOnly).length;
  const controlReview = buildRevenueAssetBatchControlReview({
    controls,
    skipped,
    warnings
  });

  return {
    ...input.batch,
    auditOnly: controls.length === 0 || controls.every((control) => control.auditOnly),
    controlReview,
    controls,
    productUpdates,
    skipped,
    statusChangeRequired: controls.some((control) => control.statusChangeRequired),
    storeUpdates,
    summary: `${controls.length} selected asset action${controls.length === 1 ? "" : "s"} prepared: ${productUpdates.length + storeUpdates.length} internal state change${productUpdates.length + storeUpdates.length === 1 ? "" : "s"} and ${auditOnlyCount} audit-only intent${auditOnlyCount === 1 ? "" : "s"}. ${skipped.length} skipped.`,
    totals: {
      actions: controls.length,
      auditOnly: auditOnlyCount,
      kill: count("kill"),
      pause: count("pause"),
      productUpdates: productUpdates.length,
      scale: count("scale"),
      skipped: skipped.length,
      statusChangeRequired: controls.filter((control) => control.statusChangeRequired).length,
      storeUpdates: storeUpdates.length,
      watch: count("watch")
    },
    warnings
  };
}

export function removeDuplicateRevenueAssetBatchControls(input: {
  batch: RevenueAssetBatchControlPlan;
  latestRecords: RevenueAssetControlDuplicateSnapshot[];
  reason?: string;
}): RevenueAssetBatchControlPlan {
  const latestByAsset = new Map(input.latestRecords.map((record) => [duplicateKey(record), record]));
  const controls: RevenueAssetControlPlan[] = [];
  const duplicateSkipped: RevenueAssetBatchSkippedAction[] = [];

  for (const control of input.batch.controls) {
    const latest = latestByAsset.get(duplicateKey({
      assetId: control.asset.assetId,
      assetType: control.asset.assetType
    }));

    if (latest && duplicateControlMatchesLatest(control, latest)) {
      duplicateSkipped.push({
        action: control.action,
        assetId: control.asset.assetId,
        assetType: control.asset.assetType,
        reason: input.reason ?? "Latest asset-control record already matches this action; duplicate internal decision skipped."
      });
      continue;
    }

    controls.push(control);
  }

  return rebuildRevenueAssetBatchControlPlan({
    batch: input.batch,
    controls,
    skipped: [...input.batch.skipped, ...duplicateSkipped]
  });
}

function performanceAction(action: RevenueAssetRotationDecision): RevenueAssetRotationDecision {
  if (action === "kill") return "kill";
  if (action === "pause") return "pause";
  if (action === "scale") return "scale";

  return "watch";
}

function strongerRotationDecision(
  current: RevenueAssetRotationDecision,
  performance: RevenueAssetRotationDecision,
  signal: RevenueAssetPerformanceSignal
): RevenueAssetRotationDecision {
  if (current === "kill" && !(performance === "scale" && signal.evidenceGrade === "strong" && signal.profitVelocity > 0)) return "kill";
  if (current === "pause" && performance === "watch") return "pause";
  if (performance === "kill") return "kill";
  if (performance === "pause" && current !== "kill") return "pause";

  return performance;
}

function performanceNextState(
  asset: RevenueAssetScore,
  action: RevenueAssetRotationDecision,
  signal: RevenueAssetPerformanceSignal & {
    recommendedInternalStatus?: RevenueProductStatus;
    recommendedLaunchStatus?: RevenueStoreLaunchStatus;
  }
) {
  if (action === "kill") return "Archived";
  if (action === "pause") {
    return asset.assetType === "product"
      ? signal.recommendedInternalStatus ?? "Needs Revision"
      : signal.recommendedLaunchStatus ?? "Paused";
  }

  return null;
}

function applyPerformanceSignal(
  asset: RevenueAssetScore,
  signal: RevenueAssetPerformanceSignal & {
    recommendedInternalStatus?: RevenueProductStatus;
    recommendedLaunchStatus?: RevenueStoreLaunchStatus;
  }
): RevenueAssetScore {
  if (signal.snapshots <= 0) {
    return asset;
  }

  const performanceRecommendation = performanceAction(signal.action);
  const recommendation = strongerRotationDecision(asset.recommendation, performanceRecommendation, signal);
  const nextInternalState = performanceNextState(asset, recommendation, signal);
  const velocityAdjustment = clamp(signal.profitVelocity, -35, 25);
  const conversionBoost = recommendation === "scale" ? clamp(signal.conversionRate * 2, 0, 10) : 0;
  const performancePenalty = recommendation === "kill" ? 18 : recommendation === "pause" ? 9 : 0;
  const finalRank = clamp(Math.round(
    asset.assetScore.economicsScore
    + asset.assetScore.readinessScore
    + velocityAdjustment
    + conversionBoost
    - asset.assetScore.riskPenalty
    - performancePenalty
  ), 0, 100);
  const reason = recommendation === "watch" && asset.recommendation !== "watch"
    ? `${asset.reason} Performance signal: ${signal.reason}`
    : `Performance signal: ${signal.reason}`;

  return {
    ...asset,
    assetScore: {
      ...asset.assetScore,
      finalRank,
      velocity: money(signal.profitVelocity)
    },
    confidence: Math.max(asset.confidence, signal.confidence),
    economics: {
      ...asset.economics,
      estimatedProfit: money(signal.netProfit || asset.economics.estimatedProfit),
      profitMargin: money(signal.profitMargin || asset.economics.profitMargin),
      revenue: money(signal.netRevenue || signal.grossRevenue || asset.economics.revenue)
    },
    evidence: [
      ...asset.evidence,
      `Performance ${signal.evidenceGrade}`,
      `Profit velocity ${money(signal.profitVelocity)}/day`,
      `${signal.snapshots} performance snapshot${signal.snapshots === 1 ? "" : "s"}`
    ],
    nextInternalState,
    performance: {
      action: recommendation,
      confidence: signal.confidence,
      conversionRate: signal.conversionRate,
      evidenceGrade: signal.evidenceGrade,
      grossRevenue: money(signal.grossRevenue),
      netProfit: money(signal.netProfit),
      netRevenue: money(signal.netRevenue),
      profitMargin: money(signal.profitMargin),
      profitVelocity: money(signal.profitVelocity),
      reason: signal.reason,
      revenueVelocity: money(signal.revenueVelocity),
      snapshots: signal.snapshots,
      sourceAction: signal.action
    },
    priority: rotationPriority[recommendation] * 100 - finalRank,
    reason,
    recommendation,
    recommendedInternalStatus: asset.assetType === "product" ? nextInternalState as RevenueProductStatus | null ?? undefined : asset.recommendedInternalStatus,
    recommendedLaunchStatus: asset.assetType === "store" ? nextInternalState as RevenueStoreLaunchStatus | null ?? undefined : asset.recommendedLaunchStatus,
    rotationDecision: recommendation,
    rotationReason: reason,
    score: finalRank,
    scoreBand: scoreBand(finalRank)
  };
}

function performanceRotationChanges(assets: RevenueAssetScore[], maxChanges: number): RevenueRotationChange[] {
  return assets
    .filter((asset) => (
      (asset.recommendation === "pause" || asset.recommendation === "kill")
      && asset.nextInternalState
      && asset.nextInternalState !== asset.readiness.status
    ))
    .map((asset): RevenueRotationChange => ({
      action: asset.recommendation === "kill" ? "kill" : "pause",
      fromStatus: asset.readiness.status,
      reason: asset.reason,
      targetId: asset.assetId,
      targetName: asset.assetName,
      targetType: asset.assetType,
      toStatus: asset.nextInternalState ?? asset.readiness.status
    }))
    .sort((a, b) => rotationPriority[a.action] - rotationPriority[b.action])
    .slice(0, maxChanges);
}

export function mergeRevenueAssetPortfolioPerformance(
  portfolio: RevenueAssetPortfolio,
  performanceDigest: RevenueAssetPerformanceDigestInput
): RevenueAssetPortfolio {
  const productScores = new Map(performanceDigest.productScores.map((score) => [score.productId, score]));
  const storeScores = new Map(performanceDigest.storeScores.map((score) => [score.storeId, score]));
  const assets = portfolio.assets
    .map((asset) => {
      const signal = asset.assetType === "product" ? productScores.get(asset.assetId) : storeScores.get(asset.assetId);

      return signal ? applyPerformanceSignal(asset, signal) : asset;
    })
    .sort((a, b) => a.priority - b.priority || b.score - a.score);
  const rotationChanges = performanceRotationChanges(assets, portfolio.thresholds.maxRotationUpdates);
  const decisionCount = (decision: RevenueAssetRotationDecision) => assets.filter((score) => score.recommendation === decision).length;
  const trackedAssets = assets.filter((asset) => asset.performance && asset.performance.snapshots > 0).length;

  return {
    ...portfolio,
    assets,
    rotationChanges,
    summary: `${assets.length} assets scored with ${performanceDigest.totals.snapshots} live performance snapshot${performanceDigest.totals.snapshots === 1 ? "" : "s"}. ${decisionCount("scale")} scale, ${decisionCount("watch")} watch, ${decisionCount("pause")} pause, and ${decisionCount("kill")} kill recommendation${assets.length === 1 ? "" : "s"} are ready for dashboard review.`,
    totals: {
      assets: assets.length,
      estimatedProfit: money(assets.reduce((sum, asset) => sum + asset.economics.estimatedProfit, 0)),
      kill: decisionCount("kill"),
      pause: decisionCount("pause"),
      performanceSnapshots: performanceDigest.totals.snapshots,
      products: portfolio.totals.products,
      profitVelocity: money(performanceDigest.totals.profitVelocity),
      revenueVelocity: money(performanceDigest.totals.revenueVelocity),
      rotationChanges: rotationChanges.length,
      scale: decisionCount("scale"),
      stores: portfolio.totals.stores,
      totalRevenue: money(performanceDigest.totals.netRevenue || portfolio.totals.totalRevenue),
      trackedAssets,
      watch: decisionCount("watch")
    }
  };
}
