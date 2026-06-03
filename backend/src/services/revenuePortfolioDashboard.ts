import type { PortfolioCommandCenterPlan } from "./portfolioCommandCenter.js";
import type { RevenueAssetControlLedgerPlan } from "./revenueAssetControlLedger.js";
import type { RevenueAssetReviewQueuePlan } from "./revenueAssetReviewQueue.js";
import type { RevenueAssetPortfolio, RevenueAssetRotationDecision, RevenueAssetScore } from "./revenueEngine.js";

export type RevenuePortfolioDashboardRiskLevel = "low" | "medium" | "high";

export type RevenuePortfolioDashboardNextAction = {
  actionLabel: string;
  assetId: string;
  assetName: string;
  assetType: RevenueAssetScore["assetType"];
  nextInternalState: string | null;
  priority: number;
  reason: string;
  recommendation: RevenueAssetRotationDecision;
  score: number;
  scoreBand: RevenueAssetScore["scoreBand"];
  storeId: string;
  storeName: string;
};

export type RevenuePortfolioDashboardPlan = {
  blockedExternalActions: string[];
  controlLedger: {
    auditOnly: number;
    overrides: number;
    records: number;
    statusChanges: number;
  };
  externalExecution: false;
  generatedAt: string;
  kpis: {
    assets: number;
    estimatedMargin: number;
    estimatedProfit: number;
    performanceSnapshots: number;
    products: number;
    profitVelocity: number;
    revenueVelocity: number;
    stores: number;
    totalRevenue: number;
    trackedAssets: number;
  };
  mode: "Revenue Engine Portfolio Dashboard";
  nextActions: RevenuePortfolioDashboardNextAction[];
  providerContacted: false;
  queuePressure: {
    commandActions: number;
    highRiskCommands: number;
    killOrPause: number;
    noHistory: number;
    openCommandRecords: number;
    overrides: number;
    reviewItems: number;
    rotationChanges: number;
    scaleReady: number;
    stale: number;
  };
  recommendations: Record<RevenueAssetRotationDecision, number>;
  risk: {
    highRiskAssets: number;
    killOrPauseAssets: number;
    mediumRiskAssets: number;
    riskLevel: RevenuePortfolioDashboardRiskLevel;
    untrackedAssets: number;
  };
  summary: string;
};

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function average(values: number[]) {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function recommendationCount(portfolio: RevenueAssetPortfolio, recommendation: RevenueAssetRotationDecision) {
  return portfolio.assets.filter((asset) => asset.recommendation === recommendation).length;
}

function actionLabel(recommendation: RevenueAssetRotationDecision) {
  if (recommendation === "kill") return "Archive internally";
  if (recommendation === "pause") return "Pause or repair internally";
  if (recommendation === "scale") return "Queue scale review";

  return "Watch and collect signal";
}

function assetPriority(asset: RevenueAssetScore) {
  if (asset.recommendation === "kill") return 400 - asset.assetScore.finalRank;
  if (asset.recommendation === "pause") return 300 - asset.assetScore.finalRank;
  if (asset.recommendation === "scale") return 200 + asset.assetScore.finalRank;

  return 100 + asset.assetScore.finalRank;
}

function nextActions(portfolio: RevenueAssetPortfolio): RevenuePortfolioDashboardNextAction[] {
  return [...portfolio.assets]
    .sort((left, right) => assetPriority(right) - assetPriority(left) || left.assetName.localeCompare(right.assetName))
    .slice(0, 8)
    .map((asset) => ({
      actionLabel: actionLabel(asset.recommendation),
      assetId: asset.assetId,
      assetName: asset.assetName,
      assetType: asset.assetType,
      nextInternalState: asset.nextInternalState,
      priority: assetPriority(asset),
      reason: asset.reason,
      recommendation: asset.recommendation,
      score: asset.assetScore.finalRank,
      scoreBand: asset.scoreBand,
      storeId: asset.storeId,
      storeName: asset.storeName
    }));
}

function portfolioRisk(input: {
  commandPlan: PortfolioCommandCenterPlan;
  highRiskAssets: number;
  killOrPauseAssets: number;
  reviewQueue: RevenueAssetReviewQueuePlan;
  untrackedAssets: number;
}): RevenuePortfolioDashboardRiskLevel {
  if (input.highRiskAssets > 0 || input.commandPlan.totals.highRiskCommands > 0 || input.reviewQueue.totals.killOrPause > 0) {
    return "high";
  }

  if (input.killOrPauseAssets > 0 || input.reviewQueue.totals.items > 0 || input.untrackedAssets > 0) {
    return "medium";
  }

  return "low";
}

export function buildRevenuePortfolioDashboardPlan(input: {
  commandPlan: PortfolioCommandCenterPlan;
  controlLedger: RevenueAssetControlLedgerPlan;
  generatedAt?: string;
  portfolio: RevenueAssetPortfolio;
  reviewQueue: RevenueAssetReviewQueuePlan;
}): RevenuePortfolioDashboardPlan {
  const productMargins = input.portfolio.assets
    .filter((asset) => asset.assetType === "product")
    .map((asset) => asset.economics.profitMargin)
    .filter((margin) => Number.isFinite(margin));
  const highRiskAssets = input.portfolio.assets.filter((asset) => asset.riskLevel === "high").length;
  const mediumRiskAssets = input.portfolio.assets.filter((asset) => asset.riskLevel === "medium").length;
  const killOrPauseAssets = recommendationCount(input.portfolio, "kill") + recommendationCount(input.portfolio, "pause");
  const untrackedAssets = input.portfolio.totals.assets - input.portfolio.totals.trackedAssets;
  const riskLevel = portfolioRisk({
    commandPlan: input.commandPlan,
    highRiskAssets,
    killOrPauseAssets,
    reviewQueue: input.reviewQueue,
    untrackedAssets
  });

  return {
    blockedExternalActions: unique([
      ...input.portfolio.blockedExternalActions,
      ...input.commandPlan.blockedExternalActions,
      ...input.controlLedger.blockedExternalActions,
      ...input.reviewQueue.blockedExternalActions
    ]),
    controlLedger: {
      auditOnly: input.controlLedger.totals.auditOnly,
      overrides: input.controlLedger.totals.overrides,
      records: input.controlLedger.totals.records,
      statusChanges: input.controlLedger.totals.statusChanges
    },
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    kpis: {
      assets: input.portfolio.totals.assets,
      estimatedMargin: money(average(productMargins)),
      estimatedProfit: input.portfolio.totals.estimatedProfit,
      performanceSnapshots: input.portfolio.totals.performanceSnapshots,
      products: input.portfolio.totals.products,
      profitVelocity: input.portfolio.totals.profitVelocity,
      revenueVelocity: input.portfolio.totals.revenueVelocity,
      stores: input.portfolio.totals.stores,
      totalRevenue: input.portfolio.totals.totalRevenue,
      trackedAssets: input.portfolio.totals.trackedAssets
    },
    mode: "Revenue Engine Portfolio Dashboard",
    nextActions: nextActions(input.portfolio),
    providerContacted: false,
    queuePressure: {
      commandActions: input.commandPlan.totals.commandActions,
      highRiskCommands: input.commandPlan.totals.highRiskCommands,
      killOrPause: input.reviewQueue.totals.killOrPause,
      noHistory: input.reviewQueue.totals.noHistory,
      openCommandRecords: input.commandPlan.totals.openCommandRecords,
      overrides: input.reviewQueue.totals.overrides,
      reviewItems: input.reviewQueue.totals.items,
      rotationChanges: input.portfolio.totals.rotationChanges,
      scaleReady: input.reviewQueue.totals.scaleReady,
      stale: input.reviewQueue.totals.stale
    },
    recommendations: {
      kill: recommendationCount(input.portfolio, "kill"),
      pause: recommendationCount(input.portfolio, "pause"),
      scale: recommendationCount(input.portfolio, "scale"),
      watch: recommendationCount(input.portfolio, "watch")
    },
    risk: {
      highRiskAssets,
      killOrPauseAssets,
      mediumRiskAssets,
      riskLevel,
      untrackedAssets
    },
    summary: `${input.portfolio.totals.assets} scored assets with $${money(input.portfolio.totals.profitVelocity)}/day profit velocity, ${input.reviewQueue.totals.items} review item${input.reviewQueue.totals.items === 1 ? "" : "s"}, ${input.commandPlan.totals.commandActions} command action${input.commandPlan.totals.commandActions === 1 ? "" : "s"}, and ${riskLevel} operating risk.`
  };
}
