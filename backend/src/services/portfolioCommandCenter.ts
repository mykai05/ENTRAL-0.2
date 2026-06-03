import type { FacelessContentPipelinePlan } from "./facelessContentPipeline.js";
import type { FinancialScalingExecutionLedgerPlan } from "./financialScalingExecutionLedger.js";
import type { FinancialScalingBudgetReviewPlan } from "./financialOrchestrator.js";
import type { FinancialReleaseGovernancePlan } from "./financialReleaseGovernance.js";
import type {
  RevenueAssetPortfolio,
  RevenueAssetRotationDecision,
  RevenueAssetScore,
  RevenueEngineAction,
  RevenueEnginePlan
} from "./revenueEngine.js";
import type { RevenuePerformanceDigest } from "./revenuePerformance.js";

export type PortfolioCommandAction = RevenueEngineAction | "queue_content" | "record_governance" | "review_payout" | "review_scale_budget" | "review_scale_outcome";
export type PortfolioCommandRiskLevel = "low" | "medium" | "high";
export type PortfolioCommandTargetType = "store" | "product" | "content" | "finance" | "portfolio";
export type PortfolioCommandRecordStatus = "queued" | "applied" | "skipped" | "blocked";
export type PortfolioRiskLaneName = "revenue" | "finance" | "content" | "operations";

export type PortfolioCommandCenterOptions = {
  includeCommandHistory: number;
  includeContent: boolean;
  includeFinance: boolean;
  maxActions: number;
  windowDays: number;
};

export type PortfolioCommandRecordSnapshot = {
  action: PortfolioCommandAction | string;
  auditLogId: string | null;
  commandHash: string;
  control: Record<string, unknown>;
  createdAt: string;
  externalExecution: false;
  id: string;
  priority: number;
  providerContacted: false;
  reason: string;
  recommendedStatus: string | null;
  riskLevel: PortfolioCommandRiskLevel | string;
  sourceModule: string;
  status: PortfolioCommandRecordStatus | string;
  targetId: string;
  targetName: string;
  targetType: PortfolioCommandTargetType | string;
  updatedAt: string;
};

export type PortfolioCommandItem = {
  action: PortfolioCommandAction;
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    status: "Required";
  };
  blockedExternalActions: string[];
  commandHash: string;
  expectedInternalEffect: string;
  externalExecution: false;
  priority: number;
  providerContacted: false;
  reason: string;
  recommendedStatus: string | null;
  riskLevel: PortfolioCommandRiskLevel;
  sourceModule: string;
  targetId: string;
  targetName: string;
  targetType: PortfolioCommandTargetType;
};

export type PortfolioRiskLane = {
  lane: PortfolioRiskLaneName;
  riskLevel: PortfolioCommandRiskLevel;
  score: number;
  signals: string[];
  summary: string;
};

export type PortfolioCommandCenterPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  commandActions: PortfolioCommandItem[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Portfolio Command Center";
  options: PortfolioCommandCenterOptions;
  persistedCommands: PortfolioCommandRecordSnapshot[];
  providerContacted: false;
  riskLanes: PortfolioRiskLane[];
  summary: string;
  totals: {
    approvedPayoutAmount: number;
    assetPortfolioActions: number;
    assetPortfolioKill: number;
    assetPortfolioPause: number;
    assetPortfolioProfitVelocity: number;
    assetPortfolioScale: number;
    assetPortfolioTrackedAssets: number;
    commandActions: number;
    commandsByAction: Record<PortfolioCommandAction, number>;
    commandsByRisk: Record<PortfolioCommandRiskLevel, number>;
    contentNetRevenue: number;
    contentViews: number;
    estimatedProfit: number;
    highRiskCommands: number;
    highRiskProducts: number;
    openCommandRecords: number;
    pendingPayoutAmount: number;
    approvedScalingBudgetAmount: number;
    scaleOutcomeEntries: number;
    scaleOutcomeScaleNext: number;
    scaleOutcomeStop: number;
    pendingScalingBudgetAmount: number;
    pendingScalingBudgetPackets: number;
    scalingBudgetPackets: number;
    products: number;
    profitVelocity: number;
    revenueRotationChanges: number;
    stores: number;
    totalRevenue: number;
  };
};

export const defaultPortfolioCommandCenterOptions: PortfolioCommandCenterOptions = {
  includeCommandHistory: 20,
  includeContent: true,
  includeFinance: true,
  maxActions: 25,
  windowDays: 30
};

const riskWeight: Record<PortfolioCommandRiskLevel, number> = {
  high: 0,
  medium: 1,
  low: 2
};

const actionOrder: PortfolioCommandAction[] = [
  "kill",
  "pause",
  "revise",
  "review_payout",
  "review_scale_budget",
  "review_scale_outcome",
  "record_governance",
  "scale",
  "prepare_launch",
  "generate",
  "queue_content",
  "watch"
];

const portfolioActionPriority: Record<RevenueAssetRotationDecision, number> = {
  kill: 6,
  pause: 16,
  scale: 38,
  watch: 90
};

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizedOptions(options: Partial<PortfolioCommandCenterOptions> = {}): PortfolioCommandCenterOptions {
  return {
    includeCommandHistory: options.includeCommandHistory ?? defaultPortfolioCommandCenterOptions.includeCommandHistory,
    includeContent: options.includeContent ?? defaultPortfolioCommandCenterOptions.includeContent,
    includeFinance: options.includeFinance ?? defaultPortfolioCommandCenterOptions.includeFinance,
    maxActions: options.maxActions ?? defaultPortfolioCommandCenterOptions.maxActions,
    windowDays: options.windowDays ?? defaultPortfolioCommandCenterOptions.windowDays
  };
}

function commandHash(command: Omit<PortfolioCommandItem, "approvalGate" | "commandHash" | "externalExecution" | "providerContacted">) {
  return [
    command.targetType,
    command.targetId,
    command.action,
    command.recommendedStatus ?? "none"
  ].join(":").toLowerCase().replace(/[^a-z0-9:_-]+/g, "_");
}

function expectedEffect(action: PortfolioCommandAction, targetType: PortfolioCommandTargetType, recommendedStatus: string | null) {
  if (recommendedStatus) {
    return `Record the command and update the internal ${targetType} status to ${recommendedStatus}.`;
  }

  if (action === "review_payout") {
    return "Record a finance review command. Money movement remains locked behind manual governance.";
  }

  if (action === "review_scale_budget") {
    return "Record a scaling budget review command. Spend, provider calls, and ad changes remain locked behind manual governance.";
  }

  if (action === "review_scale_outcome") {
    return "Record a scaling outcome review command. Outcome evidence can change internal budget posture only.";
  }

  if (action === "queue_content") {
    return "Record a content command for internal creative planning. Uploads and provider calls remain locked.";
  }

  if (action === "record_governance") {
    return "Record a governance command for internal release controls only.";
  }

  if (action === "scale" || action === "generate" || action === "prepare_launch") {
    return "Record the growth command for internal queueing and later human approval.";
  }

  return "Record the command for monitoring without external execution.";
}

function withDefaults(command: Omit<PortfolioCommandItem, "approvalGate" | "commandHash" | "externalExecution" | "expectedInternalEffect" | "providerContacted">): PortfolioCommandItem {
  const base = {
    ...command,
    blockedExternalActions: unique(command.blockedExternalActions),
    expectedInternalEffect: expectedEffect(command.action, command.targetType, command.recommendedStatus)
  };

  return {
    ...base,
    approvalGate: {
      externalExecutionLocked: true,
      humanApprovalRequired: true,
      status: "Required"
    },
    commandHash: commandHash(base),
    externalExecution: false,
    providerContacted: false
  };
}

function mergeReason(existing: string, next: string) {
  return existing.includes(next) ? existing : `${existing} Additional signal: ${next}`;
}

function pushCommand(commands: Map<string, PortfolioCommandItem>, command: PortfolioCommandItem) {
  const existing = commands.get(command.commandHash);

  if (!existing) {
    commands.set(command.commandHash, command);
    return;
  }

  const stronger = riskWeight[command.riskLevel] < riskWeight[existing.riskLevel]
    || (riskWeight[command.riskLevel] === riskWeight[existing.riskLevel] && command.priority < existing.priority)
    ? command
    : existing;
  const sourceModules = unique([...existing.sourceModule.split(" + "), ...command.sourceModule.split(" + ")]);

  commands.set(command.commandHash, {
    ...stronger,
    blockedExternalActions: unique([...existing.blockedExternalActions, ...command.blockedExternalActions]),
    reason: mergeReason(existing.reason, command.reason),
    sourceModule: sourceModules.join(" + ")
  });
}

function blockedActions(...groups: string[][]) {
  return unique([
    ...groups.flat(),
    "Executing provider payouts, transfers, card, bank, Stripe, marketplace, social, ad, or upload write actions",
    "Publishing marketplace listings, changing storefronts, uploading content, or starting ad spend",
    "Browser stealth, anti-detection, proxy rotation, fingerprint spoofing, or platform evasion automation"
  ]);
}

function revenueCommands(plan: RevenueEnginePlan, commands: Map<string, PortfolioCommandItem>) {
  for (const change of plan.rotationChanges) {
    pushCommand(commands, withDefaults({
      action: change.action,
      blockedExternalActions: blockedActions(plan.blockedExternalActions),
      priority: change.action === "kill" ? 10 : change.action === "pause" ? 20 : 30,
      reason: change.reason,
      recommendedStatus: change.toStatus,
      riskLevel: change.action === "kill" ? "high" : "medium",
      sourceModule: "revenue_engine",
      targetId: change.targetId,
      targetName: change.targetName,
      targetType: change.targetType
    }));
  }

  for (const action of plan.pipelineActions) {
    if (action.action === "watch") continue;

    pushCommand(commands, withDefaults({
      action: action.action,
      blockedExternalActions: blockedActions(plan.blockedExternalActions),
      priority: action.priority + 35,
      reason: action.summary,
      recommendedStatus: null,
      riskLevel: action.action === "scale" ? "medium" : "low",
      sourceModule: "revenue_engine",
      targetId: action.targetId,
      targetName: action.title,
      targetType: action.targetType
    }));
  }
}

function assetRiskLevel(asset: RevenueAssetScore): PortfolioCommandRiskLevel {
  if (asset.recommendation === "kill" || asset.riskLevel === "high" || asset.assetScore.riskPenalty >= 25) return "high";
  if (asset.recommendation === "pause" || asset.riskLevel === "medium" || (asset.performance?.profitVelocity ?? 0) < 0) return "medium";

  return "low";
}

function assetCommandReason(asset: RevenueAssetScore) {
  const scoreText = `rank ${asset.assetScore.finalRank} (economics ${asset.assetScore.economicsScore}, readiness ${asset.assetScore.readinessScore}, risk penalty ${asset.assetScore.riskPenalty}, velocity ${asset.assetScore.velocity})`;
  const performanceText = asset.performance
    ? ` Performance signal: ${money(asset.performance.profitVelocity)} profit/day, ${asset.performance.snapshots} snapshot${asset.performance.snapshots === 1 ? "" : "s"}.`
    : "";

  return `${asset.reason} Portfolio score: ${scoreText}.${performanceText}`;
}

function assetPortfolioCommands(portfolio: RevenueAssetPortfolio | undefined, commands: Map<string, PortfolioCommandItem>) {
  if (!portfolio) return;

  const commandReadyAssets = portfolio.assets
    .filter((asset) => asset.recommendation !== "watch")
    .sort((left, right) => (
      portfolioActionPriority[left.recommendation] - portfolioActionPriority[right.recommendation]
      || right.assetScore.finalRank - left.assetScore.finalRank
    ));

  for (const asset of commandReadyAssets) {
    pushCommand(commands, withDefaults({
      action: asset.recommendation,
      blockedExternalActions: blockedActions(portfolio.blockedExternalActions),
      priority: portfolioActionPriority[asset.recommendation] - Math.min(12, Math.floor(asset.assetScore.finalRank / 10)),
      reason: assetCommandReason(asset),
      recommendedStatus: asset.nextInternalState,
      riskLevel: assetRiskLevel(asset),
      sourceModule: "revenue_asset_portfolio",
      targetId: asset.assetId,
      targetName: asset.assetName,
      targetType: asset.assetType
    }));
  }
}

function performanceCommands(digest: RevenuePerformanceDigest, commands: Map<string, PortfolioCommandItem>) {
  for (const change of digest.rotationChanges) {
    pushCommand(commands, withDefaults({
      action: change.action,
      blockedExternalActions: blockedActions(digest.blockedExternalActions),
      priority: change.action === "kill" ? 8 : change.action === "pause" ? 18 : 28,
      reason: change.reason,
      recommendedStatus: change.toStatus,
      riskLevel: change.action === "kill" ? "high" : "medium",
      sourceModule: "performance_velocity",
      targetId: change.targetId,
      targetName: change.targetName,
      targetType: change.targetType
    }));
  }

  for (const score of digest.productScores.filter((item) => item.action === "scale").slice(0, 10)) {
    pushCommand(commands, withDefaults({
      action: "scale",
      blockedExternalActions: blockedActions(digest.blockedExternalActions),
      priority: 42,
      reason: score.reason,
      recommendedStatus: null,
      riskLevel: "low",
      sourceModule: "performance_velocity",
      targetId: score.productId,
      targetName: score.productName,
      targetType: "product"
    }));
  }

  for (const score of digest.storeScores.filter((item) => item.action === "scale").slice(0, 5)) {
    pushCommand(commands, withDefaults({
      action: "scale",
      blockedExternalActions: blockedActions(digest.blockedExternalActions),
      priority: 40,
      reason: score.reason,
      recommendedStatus: null,
      riskLevel: "low",
      sourceModule: "performance_velocity",
      targetId: score.storeId,
      targetName: score.storeName,
      targetType: "store"
    }));
  }
}

function financeCommands(
  plan: FinancialReleaseGovernancePlan | undefined,
  scalingBudgetPlan: FinancialScalingBudgetReviewPlan | undefined,
  commands: Map<string, PortfolioCommandItem>
) {
  if (!plan && !scalingBudgetPlan) return;

  for (const item of (plan?.reviewPlan.reviewQueue ?? []).slice(0, 25)) {
    if (item.status === "rejected" || item.status === "voided") continue;

    pushCommand(commands, withDefaults({
      action: "review_payout",
      blockedExternalActions: blockedActions(plan?.blockedExternalActions ?? []),
      priority: item.riskLevel === "high" ? 12 : item.riskLevel === "medium" ? 24 : 34,
      reason: `${item.title} is ${item.status} and requires ${item.recommendedAction.replace(/_/g, " ")} before any manual handoff.`,
      recommendedStatus: null,
      riskLevel: item.riskLevel,
      sourceModule: "financial_release_governance",
      targetId: item.id,
      targetName: item.title,
      targetType: "finance"
    }));
  }

  for (const packet of (scalingBudgetPlan?.packets ?? []).filter((item) => item.status === "approval_required").slice(0, 25)) {
    const riskLevel: PortfolioCommandRiskLevel = packet.score < 65 || packet.scoreBand === "watch"
      ? "medium"
      : "low";

    pushCommand(commands, withDefaults({
      action: "review_scale_budget",
      blockedExternalActions: blockedActions(scalingBudgetPlan?.blockedExternalActions ?? [], packet.blockedExternalActions),
      priority: Math.max(14, 32 - Math.min(12, Math.floor(packet.score / 10))),
      reason: `${packet.assetName} has ${money(packet.amount)} pending scaling budget review from ${packet.scoreBand} asset score ${packet.score}. ${packet.reason}`,
      recommendedStatus: null,
      riskLevel,
      sourceModule: "financial_scaling_budget_review",
      targetId: packet.id,
      targetName: `${packet.assetName} scaling budget`,
      targetType: "finance"
    }));
  }

  if (plan && plan.budgetReleasePackets.length > 0) {
    pushCommand(commands, withDefaults({
      action: "record_governance",
      blockedExternalActions: blockedActions(plan.blockedExternalActions),
      priority: plan.totals.highRiskIntents > 0 ? 16 : 36,
      reason: `${plan.budgetReleasePackets.length} budget release packet${plan.budgetReleasePackets.length === 1 ? "" : "s"} should remain stored with reconciliation controls.`,
      recommendedStatus: null,
      riskLevel: plan.totals.highRiskIntents > 0 ? "high" : "medium",
      sourceModule: "financial_release_governance",
      targetId: "financial_release_governance",
      targetName: "Financial release governance",
      targetType: "finance"
    }));
  }
}

function scalingExecutionCommands(plan: FinancialScalingExecutionLedgerPlan | undefined, commands: Map<string, PortfolioCommandItem>) {
  if (!plan) return;

  for (const summary of plan.packetSummaries.filter((item) => item.hasOutcomeEvidence)) {
    if (summary.recommendation === "scale_next") {
      pushCommand(commands, withDefaults({
        action: "review_scale_budget",
        blockedExternalActions: blockedActions(plan.blockedExternalActions),
        priority: Math.max(10, 24 - Math.min(10, Math.floor(summary.roi * 2))),
        reason: `${summary.assetName} ${summary.category.replace(/_/g, " ")} outcome returned ${summary.roi}x ROI, ${money(summary.netProfit)} net profit, and ${summary.unitsSold} unit${summary.unitsSold === 1 ? "" : "s"}. ${summary.reason}`,
        recommendedStatus: "queue_next_scaling_budget_review",
        riskLevel: "low",
        sourceModule: "financial_scaling_execution_ledger",
        targetId: `scale_execution:${summary.scalingSpendPacketId}`,
        targetName: `${summary.assetName} next scale review`,
        targetType: "finance"
      }));
      continue;
    }

    if (summary.recommendation === "stop") {
      pushCommand(commands, withDefaults({
        action: "review_scale_outcome",
        blockedExternalActions: blockedActions(plan.blockedExternalActions),
        priority: 13,
        reason: `${summary.assetName} ${summary.category.replace(/_/g, " ")} outcome should stop: ${summary.reason} Recorded spend ${money(summary.amountSpent)}, revenue ${money(summary.grossRevenue)}, profit ${money(summary.netProfit)}.`,
        recommendedStatus: "pause_spend_and_repair_asset",
        riskLevel: "high",
        sourceModule: "financial_scaling_execution_ledger",
        targetId: `scale_execution:${summary.scalingSpendPacketId}`,
        targetName: `${summary.assetName} scaling outcome`,
        targetType: "finance"
      }));
      continue;
    }

    if (summary.recommendation === "watch") {
      pushCommand(commands, withDefaults({
        action: "review_scale_outcome",
        blockedExternalActions: blockedActions(plan.blockedExternalActions),
        priority: 52,
        reason: `${summary.assetName} ${summary.category.replace(/_/g, " ")} outcome needs more evidence: ${summary.reason}`,
        recommendedStatus: "record_more_evidence",
        riskLevel: "medium",
        sourceModule: "financial_scaling_execution_ledger",
        targetId: `scale_execution:${summary.scalingSpendPacketId}`,
        targetName: `${summary.assetName} scaling outcome`,
        targetType: "finance"
      }));
    }
  }
}

function contentCommands(plan: FacelessContentPipelinePlan | undefined, commands: Map<string, PortfolioCommandItem>) {
  if (!plan) return;

  for (const score of plan.performanceDigest.contentScores.slice(0, 15)) {
    const action: PortfolioCommandAction = score.action === "scale_remix"
      ? "queue_content"
      : score.action === "revise_hook"
        ? "revise"
        : "watch";

    pushCommand(commands, withDefaults({
      action,
      blockedExternalActions: blockedActions(plan.blockedExternalActions),
      priority: action === "revise" ? 32 : action === "queue_content" ? 46 : 70,
      reason: score.reason,
      recommendedStatus: null,
      riskLevel: action === "revise" ? "medium" : "low",
      sourceModule: "faceless_content_pipeline",
      targetId: score.contentBriefId ?? `content_${score.channel}`,
      targetName: `${score.channel.replace(/_/g, " ")} content`,
      targetType: "content"
    }));
  }

  for (const brief of plan.briefs.filter((item) => item.recordState === "new").slice(0, 10)) {
    pushCommand(commands, withDefaults({
      action: "queue_content",
      blockedExternalActions: blockedActions(plan.blockedExternalActions, brief.blockedActions),
      priority: brief.priority + 50,
      reason: `${brief.title} is ready to be recorded as an internal creative brief.`,
      recommendedStatus: "draft_queued",
      riskLevel: "low",
      sourceModule: "faceless_content_pipeline",
      targetId: brief.id,
      targetName: brief.title,
      targetType: "content"
    }));
  }
}

function riskLevelFrom(score: number): PortfolioCommandRiskLevel {
  if (score >= 70) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function riskLanes(input: {
  commands: PortfolioCommandItem[];
  contentPlan?: FacelessContentPipelinePlan;
  financialPlan?: FinancialReleaseGovernancePlan;
  financialScalingBudgetPlan?: FinancialScalingBudgetReviewPlan;
  financialScalingExecutionPlan?: FinancialScalingExecutionLedgerPlan;
  performanceDigest: RevenuePerformanceDigest;
  revenuePlan: RevenueEnginePlan;
  assetPortfolio?: RevenueAssetPortfolio;
}): PortfolioRiskLane[] {
  const revenueRotationChanges = input.assetPortfolio?.totals.rotationChanges ?? input.revenuePlan.rotationChanges.length;
  const profitVelocity = input.assetPortfolio?.totals.profitVelocity ?? input.performanceDigest.totals.profitVelocity;
  const revenueScore = Math.min(100,
    input.revenuePlan.totals.highRiskProducts * 25
    + revenueRotationChanges * 10
    + (profitVelocity < 0 ? 35 : 0)
    + (input.assetPortfolio?.totals.kill ?? 0) * 8
  );
  const financeScore = input.financialPlan
    ? Math.min(100,
      input.financialPlan.totals.highRiskIntents * 30
      + (input.financialPlan.totals.pendingAmount > 0 ? 20 : 0)
      + ((input.financialScalingBudgetPlan?.totals.pending ?? 0) > 0 ? 15 : 0)
      + (input.financialScalingExecutionPlan?.totals.stopped ?? 0) * 18
      + (input.financialScalingExecutionPlan?.totals.scaleNext ?? 0) * 8
      + Math.min(20, Math.floor((input.financialScalingBudgetPlan?.totals.pendingAmount ?? 0) / 50) * 5)
    )
    : input.financialScalingBudgetPlan
      ? Math.min(100, (input.financialScalingBudgetPlan.totals.pending > 0 ? 20 : 0) + Math.min(20, Math.floor(input.financialScalingBudgetPlan.totals.pendingAmount / 50) * 5))
    : input.financialScalingExecutionPlan
      ? Math.min(100, input.financialScalingExecutionPlan.totals.stopped * 18 + input.financialScalingExecutionPlan.totals.scaleNext * 8)
    : 0;
  const contentScore = input.contentPlan
    ? Math.min(100,
      input.contentPlan.performanceDigest.contentScores.filter((score) => score.action === "revise_hook").length * 25
      + (input.contentPlan.performanceDigest.totals.snapshots === 0 && input.contentPlan.totals.newBriefs > 0 ? 20 : 0)
      + (input.contentPlan.performanceDigest.totals.netRevenue < 0 ? 35 : 0)
    )
    : 0;
  const operationsScore = Math.min(100, input.commands.filter((command) => command.riskLevel === "high").length * 20 + input.commands.length * 2);

  return [
    {
      lane: "revenue",
      riskLevel: riskLevelFrom(revenueScore),
      score: revenueScore,
      signals: [
        `${revenueRotationChanges} revenue rotation change${revenueRotationChanges === 1 ? "" : "s"}`,
        `${input.revenuePlan.totals.highRiskProducts} high-risk product${input.revenuePlan.totals.highRiskProducts === 1 ? "" : "s"}`,
        `${money(profitVelocity)} daily profit velocity`,
        `${input.assetPortfolio?.totals.trackedAssets ?? 0} tracked scored asset${(input.assetPortfolio?.totals.trackedAssets ?? 0) === 1 ? "" : "s"}`
      ],
      summary: "Store and product movement risk from portfolio decisions and performance velocity."
    },
    {
      lane: "finance",
      riskLevel: riskLevelFrom(financeScore),
      score: financeScore,
      signals: input.financialPlan
        ? [
          `${input.financialPlan.totals.highRiskIntents} high-risk payout intent${input.financialPlan.totals.highRiskIntents === 1 ? "" : "s"}`,
          `${money(input.financialPlan.totals.pendingAmount)} pending payout amount`,
          `${input.financialPlan.releaseReadiness.readyForManualHandoff} payout packet${input.financialPlan.releaseReadiness.readyForManualHandoff === 1 ? "" : "s"} ready for manual handoff`,
          `${input.financialScalingBudgetPlan?.totals.pending ?? 0} pending scaling budget packet${(input.financialScalingBudgetPlan?.totals.pending ?? 0) === 1 ? "" : "s"}`,
          `${money(input.financialScalingBudgetPlan?.totals.pendingAmount ?? 0)} pending scaling budget`,
          `${input.financialScalingExecutionPlan?.totals.scaleNext ?? 0} scaling outcome${(input.financialScalingExecutionPlan?.totals.scaleNext ?? 0) === 1 ? "" : "s"} ready for next budget review`,
          `${input.financialScalingExecutionPlan?.totals.stopped ?? 0} scaling outcome stop recommendation${(input.financialScalingExecutionPlan?.totals.stopped ?? 0) === 1 ? "" : "s"}`
        ]
        : input.financialScalingBudgetPlan
          ? [
            `${input.financialScalingBudgetPlan.totals.pending} pending scaling budget packet${input.financialScalingBudgetPlan.totals.pending === 1 ? "" : "s"}`,
            `${money(input.financialScalingBudgetPlan.totals.pendingAmount)} pending scaling budget`,
            `${input.financialScalingBudgetPlan.totals.approved} scaling budget packet${input.financialScalingBudgetPlan.totals.approved === 1 ? "" : "s"} approved for manual handoff`,
            `${input.financialScalingExecutionPlan?.totals.scaleNext ?? 0} scaling outcome${(input.financialScalingExecutionPlan?.totals.scaleNext ?? 0) === 1 ? "" : "s"} ready for next budget review`
          ]
        : input.financialScalingExecutionPlan
          ? [
            `${input.financialScalingExecutionPlan.totals.recordedEntries} scaling outcome entr${input.financialScalingExecutionPlan.totals.recordedEntries === 1 ? "y" : "ies"}`,
            `${input.financialScalingExecutionPlan.totals.scaleNext} ready for next scale review`,
            `${input.financialScalingExecutionPlan.totals.stopped} stop recommendation${input.financialScalingExecutionPlan.totals.stopped === 1 ? "" : "s"}`
          ]
        : ["Finance signals were not included in this dashboard build."],
      summary: "Payout readiness, scaling budget approval, and release governance risk. Provider execution stays locked."
    },
    {
      lane: "content",
      riskLevel: riskLevelFrom(contentScore),
      score: contentScore,
      signals: input.contentPlan
        ? [
          `${input.contentPlan.totals.newBriefs} new content brief${input.contentPlan.totals.newBriefs === 1 ? "" : "s"}`,
          `${input.contentPlan.performanceDigest.totals.views} tracked view${input.contentPlan.performanceDigest.totals.views === 1 ? "" : "s"}`,
          `${money(input.contentPlan.performanceDigest.totals.netRevenue)} content net revenue`
        ]
        : ["Content signals were not included in this dashboard build."],
      summary: "Creative throughput and content optimization risk. Uploads and provider calls stay locked."
    },
    {
      lane: "operations",
      riskLevel: riskLevelFrom(operationsScore),
      score: operationsScore,
      signals: [
        `${input.commands.length} internal command action${input.commands.length === 1 ? "" : "s"}`,
        `${input.commands.filter((command) => command.riskLevel === "high").length} high-risk command${input.commands.filter((command) => command.riskLevel === "high").length === 1 ? "" : "s"}`,
        "0 external executions authorized"
      ],
      summary: "Internal command load and control pressure across the portfolio."
    }
  ];
}

function actionCounts(commands: PortfolioCommandItem[]): Record<PortfolioCommandAction, number> {
  const counts = Object.fromEntries(actionOrder.map((action) => [action, 0])) as Record<PortfolioCommandAction, number>;

  for (const command of commands) {
    counts[command.action] += 1;
  }

  return counts;
}

function riskCounts(commands: PortfolioCommandItem[]): Record<PortfolioCommandRiskLevel, number> {
  return {
    high: commands.filter((command) => command.riskLevel === "high").length,
    low: commands.filter((command) => command.riskLevel === "low").length,
    medium: commands.filter((command) => command.riskLevel === "medium").length
  };
}

export function buildPortfolioCommandCenterPlan(input: {
  assetPortfolio?: RevenueAssetPortfolio;
  contentPlan?: FacelessContentPipelinePlan;
  financialPlan?: FinancialReleaseGovernancePlan;
  financialScalingBudgetPlan?: FinancialScalingBudgetReviewPlan;
  financialScalingExecutionPlan?: FinancialScalingExecutionLedgerPlan;
  generatedAt?: string;
  options?: Partial<PortfolioCommandCenterOptions>;
  performanceDigest: RevenuePerformanceDigest;
  persistedCommands?: PortfolioCommandRecordSnapshot[];
  revenuePlan: RevenueEnginePlan;
}): PortfolioCommandCenterPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const options = normalizedOptions(input.options);
  const commandMap = new Map<string, PortfolioCommandItem>();

  assetPortfolioCommands(input.assetPortfolio, commandMap);
  revenueCommands(input.revenuePlan, commandMap);
  performanceCommands(input.performanceDigest, commandMap);

  if (options.includeFinance) {
    financeCommands(input.financialPlan, input.financialScalingBudgetPlan, commandMap);
    scalingExecutionCommands(input.financialScalingExecutionPlan, commandMap);
  }

  if (options.includeContent) {
    contentCommands(input.contentPlan, commandMap);
  }

  const commandActions = Array.from(commandMap.values())
    .sort((left, right) => left.priority - right.priority || riskWeight[left.riskLevel] - riskWeight[right.riskLevel])
    .slice(0, options.maxActions);
  const persistedCommands = (input.persistedCommands ?? []).slice(0, options.includeCommandHistory);
  const lanes = riskLanes({
    commands: commandActions,
    contentPlan: options.includeContent ? input.contentPlan : undefined,
    financialPlan: options.includeFinance ? input.financialPlan : undefined,
    financialScalingBudgetPlan: options.includeFinance ? input.financialScalingBudgetPlan : undefined,
    financialScalingExecutionPlan: options.includeFinance ? input.financialScalingExecutionPlan : undefined,
    performanceDigest: input.performanceDigest,
    revenuePlan: input.revenuePlan,
    assetPortfolio: input.assetPortfolio
  });
  const portfolioProfitVelocity = input.assetPortfolio?.totals.profitVelocity ?? input.performanceDigest.totals.profitVelocity;
  const portfolioRotationChanges = input.assetPortfolio?.totals.rotationChanges
    ?? input.revenuePlan.rotationChanges.length + input.performanceDigest.rotationChanges.length;
  const assetPortfolioCommandsCount = commandActions.filter((command) => command.sourceModule.split(" + ").includes("revenue_asset_portfolio")).length;

  return {
    auditEvents: [
      "Portfolio Command Center generated from internal revenue, performance, finance, and content planners.",
      "Command actions are internal status/control records and require human review before any external handoff.",
      "No provider, marketplace, social platform, financial provider, browser, proxy, or stealth automation system was contacted."
    ],
    blockedExternalActions: blockedActions(
      input.revenuePlan.blockedExternalActions,
      input.assetPortfolio?.blockedExternalActions ?? [],
      input.performanceDigest.blockedExternalActions,
      input.financialPlan?.blockedExternalActions ?? [],
      input.financialScalingBudgetPlan?.blockedExternalActions ?? [],
      input.financialScalingExecutionPlan?.blockedExternalActions ?? [],
      input.contentPlan?.blockedExternalActions ?? []
    ),
    commandActions,
    externalExecution: false,
    generatedAt,
    mode: "Internal Portfolio Command Center",
    options,
    persistedCommands,
    providerContacted: false,
    riskLanes: lanes,
    summary: `${commandActions.length} internal command action${commandActions.length === 1 ? "" : "s"} prioritized across ${input.revenuePlan.totals.stores} store${input.revenuePlan.totals.stores === 1 ? "" : "s"}, ${input.revenuePlan.totals.products} product${input.revenuePlan.totals.products === 1 ? "" : "s"}, ${money(portfolioProfitVelocity)} daily profit velocity, ${assetPortfolioCommandsCount} scored-asset command${assetPortfolioCommandsCount === 1 ? "" : "s"}, ${money(input.financialPlan?.totals.pendingAmount ?? 0)} pending payout review, ${money(input.financialScalingBudgetPlan?.totals.pendingAmount ?? 0)} pending scaling budget, ${input.financialScalingExecutionPlan?.totals.scaleNext ?? 0} scaling outcome${(input.financialScalingExecutionPlan?.totals.scaleNext ?? 0) === 1 ? "" : "s"} ready for next budget review, and ${input.contentPlan?.performanceDigest.totals.views ?? 0} content view${(input.contentPlan?.performanceDigest.totals.views ?? 0) === 1 ? "" : "s"}. External execution remains locked.`,
    totals: {
      approvedPayoutAmount: money(input.financialPlan?.totals.approvedAmount ?? 0),
      approvedScalingBudgetAmount: money(input.financialScalingBudgetPlan?.totals.approvedAmount ?? 0),
      assetPortfolioActions: assetPortfolioCommandsCount,
      assetPortfolioKill: input.assetPortfolio?.totals.kill ?? 0,
      assetPortfolioPause: input.assetPortfolio?.totals.pause ?? 0,
      assetPortfolioProfitVelocity: money(portfolioProfitVelocity),
      assetPortfolioScale: input.assetPortfolio?.totals.scale ?? 0,
      assetPortfolioTrackedAssets: input.assetPortfolio?.totals.trackedAssets ?? 0,
      commandActions: commandActions.length,
      commandsByAction: actionCounts(commandActions),
      commandsByRisk: riskCounts(commandActions),
      contentNetRevenue: money(input.contentPlan?.performanceDigest.totals.netRevenue ?? 0),
      contentViews: input.contentPlan?.performanceDigest.totals.views ?? 0,
      estimatedProfit: money(input.revenuePlan.totals.estimatedProfit),
      highRiskCommands: commandActions.filter((command) => command.riskLevel === "high").length,
      highRiskProducts: input.revenuePlan.totals.highRiskProducts,
      openCommandRecords: persistedCommands.filter((command) => command.status === "queued").length,
      pendingPayoutAmount: money(input.financialPlan?.totals.pendingAmount ?? 0),
      scaleOutcomeEntries: input.financialScalingExecutionPlan?.totals.recordedEntries ?? 0,
      scaleOutcomeScaleNext: input.financialScalingExecutionPlan?.totals.scaleNext ?? 0,
      scaleOutcomeStop: input.financialScalingExecutionPlan?.totals.stopped ?? 0,
      pendingScalingBudgetAmount: money(input.financialScalingBudgetPlan?.totals.pendingAmount ?? 0),
      pendingScalingBudgetPackets: input.financialScalingBudgetPlan?.totals.pending ?? 0,
      scalingBudgetPackets: input.financialScalingBudgetPlan?.totals.reviewItems ?? 0,
      products: input.revenuePlan.totals.products,
      profitVelocity: money(portfolioProfitVelocity),
      revenueRotationChanges: portfolioRotationChanges,
      stores: input.revenuePlan.totals.stores,
      totalRevenue: money(input.revenuePlan.totals.totalRevenue)
    }
  };
}
