import type {
  PortfolioCommandCenterPlan,
  PortfolioCommandTargetType
} from "./portfolioCommandCenter.js";
import {
  buildRevenueAssetBatchControlPlan,
  removeDuplicateRevenueAssetBatchControls,
  type RevenueAssetBatchControlPlan,
  type RevenueAssetControlDuplicateSnapshot,
  type RevenueAssetPortfolio,
  type RevenueAssetRotationDecision,
  type RevenueAssetScore
} from "./revenueEngine.js";

const rotationActions = new Set<RevenueAssetRotationDecision>(["scale", "watch", "pause", "kill"]);

function normalizedRotationAction(action: string): RevenueAssetRotationDecision | null {
  return rotationActions.has(action as RevenueAssetRotationDecision)
    ? action as RevenueAssetRotationDecision
    : null;
}

function normalizedAssetType(targetType: PortfolioCommandTargetType): RevenueAssetScore["assetType"] | null {
  if (targetType === "product" || targetType === "store") return targetType;

  return null;
}

function sourceIncludesAssetPortfolio(sourceModule: string) {
  return sourceModule.split(" + ").includes("revenue_asset_portfolio");
}

export function buildRevenueAssetControlsFromPortfolioCommands(input: {
  duplicateReason?: string;
  latestRecords?: RevenueAssetControlDuplicateSnapshot[];
  plan: PortfolioCommandCenterPlan;
  portfolio: RevenueAssetPortfolio;
}): RevenueAssetBatchControlPlan {
  const selections = input.plan.commandActions.flatMap((command) => {
    if (!sourceIncludesAssetPortfolio(command.sourceModule)) return [];

    const action = normalizedRotationAction(command.action);
    const assetType = normalizedAssetType(command.targetType);

    if (!action || !assetType) return [];

    return [{
      action,
      assetId: command.targetId,
      assetType
    }];
  });
  const batch = buildRevenueAssetBatchControlPlan({
    portfolio: input.portfolio,
    selections
  });

  if (!input.latestRecords) {
    return batch;
  }

  return removeDuplicateRevenueAssetBatchControls({
    batch,
    latestRecords: input.latestRecords,
    reason: input.duplicateReason
  });
}
