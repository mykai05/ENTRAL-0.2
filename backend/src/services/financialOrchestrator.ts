import { createHash } from "node:crypto";
import type {
  RevenueAssetPortfolio,
  RevenueEngineProductSnapshot,
  RevenueEngineStoreSnapshot
} from "./revenueEngine.js";
import type {
  RevenuePerformanceSnapshot,
  RevenuePerformanceSource
} from "./revenuePerformance.js";

export type FinancialSplitCategory = "scaling" | "personal" | "buffer";
export type FinancialSplitRole = "ad_growth" | "entral_operations" | "owner_income";

export type FinancialOrchestratorOptions = {
  bufferPercent: number;
  currency: "USD";
  includePayoutIntents: boolean;
  minPayoutIntentAmount: number;
  personalPercent: number;
  reserveFloorAmount: number;
  scalingPercent: number;
  source?: RevenuePerformanceSource;
  storeId?: string;
  windowDays: number;
};

export type FinancialPolicyCheck = {
  message: string;
  status: "pass" | "warn" | "block";
  title: string;
};

export type FinancialLedgerEntryDraft = {
  allocatableProfit: number;
  allocation: Record<FinancialSplitCategory, number>;
  currency: "USD";
  externalExecution: false;
  grossRevenue: number;
  id: string;
  netProfit: number;
  periodEnd: string;
  periodStart: string;
  productId: string | null;
  productName: string | null;
  recordState: "new" | "already_recorded";
  revenuePerformanceSnapshotId: string;
  source: RevenuePerformanceSource;
  status: "allocatable" | "loss_or_zero";
  storeId: string;
  storeName: string;
};

export type FinancialAllocationBucket = {
  amount: number;
  category: FinancialSplitCategory;
  destinationType: "ad_growth_budget" | "entral_tech_operations" | "owner_distribution";
  guardrailReason?: string;
  label: string;
  percent: number;
  role: FinancialSplitRole;
  payoutIntentAmount: number;
  purpose: string;
  retainedAmount: number;
  status: "intent_ready" | "below_minimum" | "held";
};

export type FinancialPayoutIntentDraft = {
  amount: number;
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    reason: string;
    status: "Required";
  };
  category: FinancialSplitCategory;
  currency: "USD";
  dedupeKey: string;
  destinationType: FinancialAllocationBucket["destinationType"];
  externalExecution: false;
  id: string;
  provider: "Stripe Treasury + Connect";
  sourceLedgerEntryIds: string[];
  status: "approval_required";
  title: string;
};

export type FinancialScalingBudgetPacket = {
  allocationLane: "organic_growth" | "paid_scale_review";
  amount: number;
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    reason: string;
    status: "Required";
  };
  assetId: string;
  assetName: string;
  assetType: "product" | "store";
  blockedExternalActions: string[];
  budgetCap: {
    maxPerAssetAmount: number;
    retainedScalingCapital: number;
    totalScalingCapital: number;
  };
  confidence: number;
  dedupeKey: string;
  externalExecution: false;
  id: string;
  organicFirst: boolean;
  performanceBasis: {
    evidenceGrade: NonNullable<RevenueAssetPortfolio["assets"][number]["performance"]>["evidenceGrade"] | "none";
    killPressureScore: number;
    scalePressureScore: number;
    snapshots: number;
  };
  priority: number;
  profitVelocity: number;
  providerContacted: false;
  reason: string;
  recommendedChannel: "organic_content" | "marketplace_listing" | "paid_ads";
  score: number;
  scoreBand: RevenueAssetPortfolio["assets"][number]["scoreBand"];
  spendPriority: "no_spend" | "low_test" | "scale_test";
  status: "approval_required";
  storeId: string;
  storeName: string;
};

export type FinancialAdGrowthAllocationPlan = {
  advisoryOnly: true;
  bucketAmount: number;
  guardrails: string[];
  killPressure: FinancialPortfolioPressure;
  mode: "organic_first" | "paid_scale_review" | "defensive_hold" | "watch";
  organicFirstAmount: number;
  paidScaleReviewAmount: number;
  pressureDecision: {
    advisoryOnly: true;
    decision: "retain_for_defense" | "organic_first" | "paid_scale_review" | "watch";
    guardrail: string;
    killPressureScore: number;
    reason: string;
    recommendedSpendPriority: FinancialScalingBudgetPacket["spendPriority"] | "none";
    scalePressureScore: number;
    source: "revenue_engine_scored_portfolio";
  };
  retainedAmount: number;
  scalePressure: FinancialPortfolioPressure;
  summary: string;
};

export type FinancialScalingBudgetPacketStatus = "approval_required" | "approved_manual_handoff" | "rejected" | "voided";
export type FinancialScalingBudgetReviewAction = "approve" | "reject";

export type FinancialScalingBudgetPacketSnapshot = Omit<FinancialScalingBudgetPacket, "status"> & {
  auditLogId: string | null;
  createdAt: string;
  dedupeKey: string;
  metadata: Record<string, unknown>;
  reviewedAt: string | null;
  reviewedById: string | null;
  reviewNote: string | null;
  splitPolicyId: string | null;
  status: FinancialScalingBudgetPacketStatus | string;
  updatedAt: string;
};

export type FinancialScalingBudgetReviewPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Scaling Budget Review";
  packets: FinancialScalingBudgetPacketSnapshot[];
  providerContacted: false;
  summary: string;
  totals: {
    approved: number;
    approvedAmount: number;
    pending: number;
    pendingAmount: number;
    rejected: number;
    rejectedAmount: number;
    retainedAmount: number;
    reviewItems: number;
    totalAmount: number;
  };
};

export type FinancialRiskFlag = {
  level: "low" | "medium" | "high";
  message: string;
  title: string;
};

export type FinancialPortfolioPressureLevel = "none" | "low" | "medium" | "high";

export type FinancialPortfolioPressureAsset = {
  assetId: string;
  assetName: string;
  assetType: "product" | "store";
  finalRank: number;
  profitVelocity: number;
  reason: string;
  recommendation: RevenueAssetPortfolio["assets"][number]["recommendation"];
  riskLevel: RevenueAssetPortfolio["assets"][number]["riskLevel"];
  scoreBand: RevenueAssetPortfolio["assets"][number]["scoreBand"];
};

export type FinancialPortfolioPressure = {
  advisoryOnly: true;
  assets: FinancialPortfolioPressureAsset[];
  level: FinancialPortfolioPressureLevel;
  pressureScore: number;
  reason: string;
  source: "revenue_engine_scored_portfolio";
};

export type FinancialPortfolioSignal = {
  assetCommandsReady: number;
  killRecommendations: number;
  killPressure: FinancialPortfolioPressure;
  pauseRecommendations: number;
  profitVelocity: number;
  recommendation: "scale_reinvestment_review" | "defensive_hold" | "watch";
  reason: string;
  revenueVelocity: number;
  scalePressure: FinancialPortfolioPressure;
  scaleRecommendations: number;
  trackedAssets: number;
};

export type FinancialAdvisoryContext = {
  advisoryOnly: true;
  killPressure: FinancialPortfolioPressure;
  posture: "defensive_hold" | "scale_review" | "watch";
  scalePressure: FinancialPortfolioPressure;
  signal: FinancialPortfolioSignal["recommendation"];
  source: "revenue_engine_scored_portfolio";
  summary: string;
};

export type FinancialOrchestratorPlan = {
  advisoryContext: FinancialAdvisoryContext;
  allocationBuckets: FinancialAllocationBucket[];
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  ledgerEntries: FinancialLedgerEntryDraft[];
  mode: "Internal Financial Orchestrator";
  options: FinancialOrchestratorOptions;
  payoutIntents: FinancialPayoutIntentDraft[];
  policyChecks: FinancialPolicyCheck[];
  portfolioSignal: FinancialPortfolioSignal;
  adGrowthAllocation: FinancialAdGrowthAllocationPlan;
  riskFlags: FinancialRiskFlag[];
  scalingBudgetQueue: FinancialScalingBudgetPacket[];
  splitPolicy: {
    adGrowthPercent: number;
    bufferPercent: number;
    currency: "USD";
    entralOperationsPercent: number;
    minPayoutIntentAmount: number;
    ownerPercent: number;
    personalPercent: number;
    reserveFloorAmount: number;
    scalingPercent: number;
    status: "balanced" | "blocked";
    totalPercent: number;
  };
  summary: string;
  totals: {
    allocatableProfit: number;
    alreadyRecordedLedgerEntries: number;
    adGrowthAmount: number;
    bufferAmount: number;
    distributableProfit: number;
    entralOperationsAmount: number;
    grossRevenue: number;
    ledgerEntries: number;
    netProfit: number;
    ownerAmount: number;
    payoutIntentAmount: number;
    payoutIntents: number;
    personalAmount: number;
    portfolioAssetCommandsReady: number;
    portfolioKillPressure: number;
    portfolioProfitVelocity: number;
    portfolioScalePressure: number;
    portfolioScaleRecommendations: number;
    reserveHeld: number;
    scalingBudgetAmount: number;
    scalingBudgetPackets: number;
    scalingBudgetRetainedAmount: number;
    scalingAmount: number;
    snapshots: number;
    storesTracked: number;
  };
};

export const defaultFinancialOrchestratorOptions: FinancialOrchestratorOptions = {
  bufferPercent: 25,
  currency: "USD",
  includePayoutIntents: true,
  minPayoutIntentAmount: 25,
  personalPercent: 50,
  reserveFloorAmount: 0,
  scalingPercent: 25,
  windowDays: 30
};

const categoryLabels: Record<FinancialSplitCategory, string> = {
  buffer: "Entral operations",
  personal: "Owner income",
  scaling: "Ad/Growth bucket"
};

const categoryDestinations: Record<FinancialSplitCategory, FinancialAllocationBucket["destinationType"]> = {
  buffer: "entral_tech_operations",
  personal: "owner_distribution",
  scaling: "ad_growth_budget"
};

const categoryRoles: Record<FinancialSplitCategory, FinancialSplitRole> = {
  buffer: "entral_operations",
  personal: "owner_income",
  scaling: "ad_growth"
};

const categoryPurposes: Record<FinancialSplitCategory, string> = {
  buffer: "Fund Entral technology, operations, infrastructure, tooling, and internal execution overhead.",
  personal: "Reserve the fixed 50% owner-income distribution until explicit payout approval exists.",
  scaling: "Fund advisory-only ad, growth, content distribution, creative testing, and validated scaling loops."
};

const financialBlockedExternalActions = [
  "Moving money or issuing payouts",
  "Calling Stripe Treasury, Stripe Connect, bank, card, or payment write APIs",
  "Creating, changing, or verifying bank accounts, cards, balances, or payout schedules",
  "Withdrawing owner income without explicit approval gates",
  "Increasing ad spend, procurement spend, or product spend without a separate approved scaling budget"
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function average(values: number[]) {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildFinancialScalingBudgetReviewPlan(input: {
  generatedAt?: string;
  packets: FinancialScalingBudgetPacketSnapshot[];
}): FinancialScalingBudgetReviewPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const pending = input.packets.filter((packet) => packet.status === "approval_required");
  const approved = input.packets.filter((packet) => packet.status === "approved_manual_handoff");
  const rejected = input.packets.filter((packet) => packet.status === "rejected" || packet.status === "voided");
  const totalAmount = money(input.packets.reduce((sum, packet) => sum + packet.amount, 0));
  const approvedAmount = money(approved.reduce((sum, packet) => sum + packet.amount, 0));
  const pendingAmount = money(pending.reduce((sum, packet) => sum + packet.amount, 0));
  const rejectedAmount = money(rejected.reduce((sum, packet) => sum + packet.amount, 0));
  const retainedAmount = money(input.packets.reduce((max, packet) => Math.max(max, packet.budgetCap.retainedScalingCapital), 0));

  return {
    auditEvents: [
      "Scaling budget review generated from persisted internal Financial Orchestrator packets.",
      "Approvals are manual handoff states only; no spend, payout, ad, provider, or browser execution is authorized.",
      "Budget packets must remain tied to scored Revenue Engine assets and recorded performance velocity."
    ],
    blockedExternalActions: financialBlockedExternalActions,
    externalExecution: false,
    generatedAt,
    mode: "Internal Scaling Budget Review",
    packets: input.packets,
    providerContacted: false,
    summary: `${input.packets.length} scaling budget packet${input.packets.length === 1 ? "" : "s"} reviewed. ${pending.length} pending, ${approved.length} approved for manual handoff, and ${rejected.length} rejected or voided. External execution remains locked.`,
    totals: {
      approved: approved.length,
      approvedAmount,
      pending: pending.length,
      pendingAmount,
      rejected: rejected.length,
      rejectedAmount,
      retainedAmount,
      reviewItems: input.packets.length,
      totalAmount
    }
  };
}

function finiteNumber(value: number | undefined, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function safeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item";
}

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function withFinancialOrchestratorOptions(input: Partial<FinancialOrchestratorOptions> = {}): FinancialOrchestratorOptions {
  return {
    bufferPercent: defaultFinancialOrchestratorOptions.bufferPercent,
    currency: "USD",
    includePayoutIntents: input.includePayoutIntents ?? defaultFinancialOrchestratorOptions.includePayoutIntents,
    minPayoutIntentAmount: money(clamp(finiteNumber(input.minPayoutIntentAmount, defaultFinancialOrchestratorOptions.minPayoutIntentAmount), 0, 1_000_000)),
    personalPercent: defaultFinancialOrchestratorOptions.personalPercent,
    reserveFloorAmount: money(clamp(finiteNumber(input.reserveFloorAmount, defaultFinancialOrchestratorOptions.reserveFloorAmount), 0, 10_000_000)),
    scalingPercent: defaultFinancialOrchestratorOptions.scalingPercent,
    source: input.source,
    storeId: input.storeId,
    windowDays: clamp(Math.round(finiteNumber(input.windowDays, defaultFinancialOrchestratorOptions.windowDays)), 1, 365)
  };
}

function policyChecksFor(options: FinancialOrchestratorOptions, totalPercent: number, snapshots: RevenuePerformanceSnapshot[]): FinancialPolicyCheck[] {
  const checks: FinancialPolicyCheck[] = [
    {
      message: totalPercent === 100
        ? "Owner income, Entral operations, and Ad/Growth percentages add to exactly 100%."
        : `Split percentages add to ${totalPercent}%. Adjust them to exactly 100% before applying.`,
      status: totalPercent === 100 ? "pass" : "block",
      title: "25/25/50 split balance"
    },
    {
      message: options.currency === "USD"
        ? "Currency is fixed to USD for this foundation phase."
        : "Only USD is supported in this foundation phase.",
      status: options.currency === "USD" ? "pass" : "block",
      title: "Currency scope"
    },
    {
      message: options.minPayoutIntentAmount > 0
        ? `Payout intents require at least $${options.minPayoutIntentAmount.toFixed(2)} in a bucket.`
        : "No minimum payout threshold is configured; approval gates still block money movement.",
      status: options.minPayoutIntentAmount > 0 ? "pass" : "warn",
      title: "Payout threshold"
    },
    {
      message: snapshots.length > 0
        ? `${snapshots.length} performance snapshot${snapshots.length === 1 ? "" : "s"} available for allocation.`
        : "No performance snapshots are available in the selected window.",
      status: snapshots.length > 0 ? "pass" : "warn",
      title: "Ledger evidence"
    }
  ];

  if (options.reserveFloorAmount > 0) {
    checks.push({
      message: `$${options.reserveFloorAmount.toFixed(2)} is held before split allocation.`,
      status: "pass",
      title: "Reserve floor"
    });
  }

  return checks;
}

function ledgerEntryFor(input: {
  existingSnapshotIds: Set<string>;
  options: FinancialOrchestratorOptions;
  product: RevenueEngineProductSnapshot | undefined;
  snapshot: RevenuePerformanceSnapshot;
  store: RevenueEngineStoreSnapshot | undefined;
}): FinancialLedgerEntryDraft {
  const allocatableProfit = money(Math.max(0, input.snapshot.netProfit));

  return {
    allocatableProfit,
    allocation: {
      buffer: money(allocatableProfit * input.options.bufferPercent / 100),
      personal: money(allocatableProfit * input.options.personalPercent / 100),
      scaling: money(allocatableProfit * input.options.scalingPercent / 100)
    },
    currency: input.options.currency,
    externalExecution: false,
    grossRevenue: money(input.snapshot.grossRevenue),
    id: `ledger_${safeId(input.snapshot.id)}`,
    netProfit: money(input.snapshot.netProfit),
    periodEnd: input.snapshot.periodEnd,
    periodStart: input.snapshot.periodStart,
    productId: input.snapshot.productId,
    productName: input.product?.productName ?? null,
    recordState: input.existingSnapshotIds.has(input.snapshot.id) ? "already_recorded" : "new",
    revenuePerformanceSnapshotId: input.snapshot.id,
    source: input.snapshot.source,
    status: allocatableProfit > 0 ? "allocatable" : "loss_or_zero",
    storeId: input.snapshot.storeId,
    storeName: input.store?.businessName ?? "Unknown Store"
  };
}

function riskFlagsFor(input: {
  distributableProfit: number;
  ledgerEntries: FinancialLedgerEntryDraft[];
  portfolioSignal: FinancialPortfolioSignal;
  snapshots: RevenuePerformanceSnapshot[];
  totalNetProfit: number;
}): FinancialRiskFlag[] {
  const flags: FinancialRiskFlag[] = [];
  const lossEntries = input.ledgerEntries.filter((entry) => entry.netProfit <= 0);

  if (input.snapshots.length === 0) {
    flags.push({
      level: "medium",
      message: "No payout or scaling decision should be made until revenue performance snapshots are ingested.",
      title: "Missing income evidence"
    });
  }

  if (lossEntries.length > 0) {
    flags.push({
      level: "medium",
      message: `${lossEntries.length} ledger entr${lossEntries.length === 1 ? "y has" : "ies have"} zero or negative net profit and are excluded from payout intent creation.`,
      title: "Loss protection"
    });
  }

  if (input.totalNetProfit < 0) {
    flags.push({
      level: "high",
      message: "The selected window is net-negative. All payout intents remain empty.",
      title: "Negative profit window"
    });
  }

  if (input.distributableProfit === 0 && input.snapshots.length > 0) {
    flags.push({
      level: "low",
      message: "Revenue evidence exists, but profit is below reserve and payout thresholds.",
      title: "Distribution hold"
    });
  }

  if (input.portfolioSignal.recommendation === "defensive_hold") {
    flags.push({
      level: input.portfolioSignal.killRecommendations > 0 ? "high" : "medium",
      message: input.portfolioSignal.reason,
      title: "Portfolio defensive hold"
    });
  }

  if (input.portfolioSignal.recommendation === "scale_reinvestment_review" && input.distributableProfit > 0) {
    flags.push({
      level: "low",
      message: input.portfolioSignal.reason,
      title: "Scaling pressure"
    });
  }

  return flags;
}

function portfolioSignalFor(portfolio: RevenueAssetPortfolio | undefined): FinancialPortfolioSignal {
  const scalePressure = portfolioPressureFor(portfolio, "scale");
  const killPressure = portfolioPressureFor(portfolio, "kill");

  if (!portfolio) {
    return {
      assetCommandsReady: 0,
      killRecommendations: 0,
      killPressure,
      pauseRecommendations: 0,
      profitVelocity: 0,
      recommendation: "watch",
      reason: "No scored asset portfolio was attached to this finance plan.",
      revenueVelocity: 0,
      scalePressure,
      scaleRecommendations: 0,
      trackedAssets: 0
    };
  }

  const assetCommandsReady = portfolio.assets.filter((asset) => asset.recommendation !== "watch").length;
  const profitVelocity = money(portfolio.totals.profitVelocity);
  const recommendation: FinancialPortfolioSignal["recommendation"] = portfolio.totals.kill > 0 || profitVelocity < 0
    ? "defensive_hold"
    : portfolio.totals.scale > 0 && profitVelocity > 0
      ? "scale_reinvestment_review"
      : "watch";

  return {
    assetCommandsReady,
    killRecommendations: portfolio.totals.kill,
    killPressure,
    pauseRecommendations: portfolio.totals.pause,
    profitVelocity,
    recommendation,
    reason: recommendation === "defensive_hold"
      ? `${portfolio.totals.kill} kill, ${portfolio.totals.pause} pause, and ${money(profitVelocity)} daily profit velocity signal protection before payout expansion. Kill pressure is ${killPressure.level} at ${killPressure.pressureScore}/100.`
      : recommendation === "scale_reinvestment_review"
        ? `${portfolio.totals.scale} scored asset${portfolio.totals.scale === 1 ? "" : "s"} can use scaling capital review with ${money(profitVelocity)} daily profit velocity. Scale pressure is ${scalePressure.level} at ${scalePressure.pressureScore}/100.`
        : `Scored assets are in watch mode for finance allocation. Scale pressure is ${scalePressure.level}; kill pressure is ${killPressure.level}.`,
    revenueVelocity: money(portfolio.totals.revenueVelocity),
    scalePressure,
    scaleRecommendations: portfolio.totals.scale,
    trackedAssets: portfolio.totals.trackedAssets
  };
}

function advisoryContextFor(portfolioSignal: FinancialPortfolioSignal): FinancialAdvisoryContext {
  const posture: FinancialAdvisoryContext["posture"] = portfolioSignal.recommendation === "defensive_hold"
    ? "defensive_hold"
    : portfolioSignal.recommendation === "scale_reinvestment_review"
      ? "scale_review"
      : "watch";

  return {
    advisoryOnly: true,
    killPressure: portfolioSignal.killPressure,
    posture,
    scalePressure: portfolioSignal.scalePressure,
    signal: portfolioSignal.recommendation,
    source: "revenue_engine_scored_portfolio",
    summary: `Revenue Engine scoring is attached as advisory finance context: ${portfolioSignal.scalePressure.level} scale pressure at ${portfolioSignal.scalePressure.pressureScore}/100 and ${portfolioSignal.killPressure.level} kill pressure at ${portfolioSignal.killPressure.pressureScore}/100. ${portfolioSignal.reason}`
  };
}

function pressureLevel(score: number): FinancialPortfolioPressureLevel {
  if (score <= 0) return "none";
  if (score >= 75) return "high";
  if (score >= 45) return "medium";

  return "low";
}

function emptyPortfolioPressure(reason: string): FinancialPortfolioPressure {
  return {
    advisoryOnly: true,
    assets: [],
    level: "none",
    pressureScore: 0,
    reason,
    source: "revenue_engine_scored_portfolio"
  };
}

function pressureAssetFor(asset: RevenueAssetPortfolio["assets"][number]): FinancialPortfolioPressureAsset {
  return {
    assetId: asset.assetId,
    assetName: asset.assetName,
    assetType: asset.assetType,
    finalRank: asset.assetScore.finalRank,
    profitVelocity: money(asset.performance?.profitVelocity ?? 0),
    reason: asset.reason,
    recommendation: asset.recommendation,
    riskLevel: asset.riskLevel,
    scoreBand: asset.scoreBand
  };
}

function portfolioPressureFor(
  portfolio: RevenueAssetPortfolio | undefined,
  direction: Extract<RevenueAssetPortfolio["assets"][number]["recommendation"], "scale" | "kill">
): FinancialPortfolioPressure {
  if (!portfolio) {
    return emptyPortfolioPressure("No scored Revenue Engine portfolio is attached yet, so finance pressure is neutral.");
  }

  const matchingAssets = portfolio.assets
    .filter((asset) => asset.recommendation === direction)
    .sort((left, right) => {
      if (direction === "scale") {
        return (right.performance?.profitVelocity ?? 0) - (left.performance?.profitVelocity ?? 0)
          || right.assetScore.finalRank - left.assetScore.finalRank
          || right.confidence - left.confidence;
      }

      const leftRisk = left.riskLevel === "high" ? 1 : 0;
      const rightRisk = right.riskLevel === "high" ? 1 : 0;

      return rightRisk - leftRisk
        || left.assetScore.finalRank - right.assetScore.finalRank
        || (left.performance?.profitVelocity ?? 0) - (right.performance?.profitVelocity ?? 0)
        || right.confidence - left.confidence;
    });

  const pressureAssets = matchingAssets.slice(0, 5).map(pressureAssetFor);

  if (direction === "scale") {
    if (matchingAssets.length === 0) {
      return emptyPortfolioPressure("No scored assets currently create scaling pressure for finance allocation.");
    }

    const avgRank = average(matchingAssets.map((asset) => asset.assetScore.finalRank));
    const positiveProfitVelocity = money(matchingAssets.reduce((sum, asset) => sum + Math.max(0, asset.performance?.profitVelocity ?? 0), 0));
    const trackedScaleAssets = matchingAssets.filter((asset) => (asset.performance?.snapshots ?? 0) > 0).length;
    const pressureScore = clamp(Math.round(
      avgRank * 0.55
      + Math.min(25, positiveProfitVelocity)
      + Math.min(20, matchingAssets.length * 6)
      + Math.min(10, trackedScaleAssets * 3)
    ), 0, 100);
    const topAsset = pressureAssets[0];

    return {
      advisoryOnly: true,
      assets: pressureAssets,
      level: pressureLevel(pressureScore),
      pressureScore,
      reason: topAsset
        ? `${matchingAssets.length} scored asset${matchingAssets.length === 1 ? "" : "s"} are pressing for scaling review; top asset ${topAsset.assetName} ranks ${topAsset.finalRank}/100 with $${money(topAsset.profitVelocity).toFixed(2)}/day profit velocity.`
        : "No scored assets currently create scaling pressure for finance allocation.",
      source: "revenue_engine_scored_portfolio"
    };
  }

  const negativePortfolioVelocity = Math.max(0, -portfolio.totals.profitVelocity);

  if (matchingAssets.length === 0 && negativePortfolioVelocity === 0) {
    return emptyPortfolioPressure("No scored assets currently create kill pressure for finance allocation.");
  }

  const avgWeakness = matchingAssets.length > 0
    ? average(matchingAssets.map((asset) => 100 - asset.assetScore.finalRank))
    : 30;
  const highRiskAssets = matchingAssets.filter((asset) => asset.riskLevel === "high").length;
  const negativeAssetVelocity = Math.abs(matchingAssets.reduce((sum, asset) => sum + Math.min(0, asset.performance?.profitVelocity ?? 0), 0));
  const pressureScore = clamp(Math.round(
    avgWeakness * 0.6
    + Math.min(30, matchingAssets.length * 10 + highRiskAssets * 8)
    + Math.min(25, negativePortfolioVelocity + negativeAssetVelocity)
  ), 0, 100);
  const topAsset = pressureAssets[0];

  return {
    advisoryOnly: true,
    assets: pressureAssets,
    level: pressureLevel(pressureScore),
    pressureScore,
    reason: topAsset
      ? `${matchingAssets.length} scored asset${matchingAssets.length === 1 ? "" : "s"} create kill pressure; top risk ${topAsset.assetName} ranks ${topAsset.finalRank}/100 with ${topAsset.riskLevel} risk.`
      : `Portfolio profit velocity is negative at $${money(portfolio.totals.profitVelocity).toFixed(2)}/day, creating defensive kill pressure even without a direct kill asset.`,
    source: "revenue_engine_scored_portfolio"
  };
}

function payoutDedupeKey(input: {
  amount: number;
  category: FinancialSplitCategory;
  ledgerEntries: FinancialLedgerEntryDraft[];
  options: FinancialOrchestratorOptions;
  ownerId: string;
}) {
  return stableHash({
    amount: input.amount,
    category: input.category,
    currency: input.options.currency,
    ledger: input.ledgerEntries.map((entry) => entry.revenuePerformanceSnapshotId).sort(),
    ownerId: input.ownerId,
    split: {
      bufferPercent: input.options.bufferPercent,
      personalPercent: input.options.personalPercent,
      reserveFloorAmount: input.options.reserveFloorAmount,
      scalingPercent: input.options.scalingPercent
    }
  });
}

function validatedScaleAssets(portfolio: RevenueAssetPortfolio | undefined) {
  if (!portfolio) return [];

  return portfolio.assets
    .filter((asset) => {
      const performance = asset.performance;

      return asset.recommendation === "scale"
        && asset.riskLevel !== "high"
        && asset.assetScore.finalRank >= 60
        && performance !== undefined
        && performance.profitVelocity > 0
        && (performance.evidenceGrade === "usable" || performance.evidenceGrade === "strong");
    })
    .sort((left, right) => (
      (right.performance?.profitVelocity ?? 0) - (left.performance?.profitVelocity ?? 0)
      || right.assetScore.finalRank - left.assetScore.finalRank
      || right.confidence - left.confidence
    ))
    .slice(0, 8);
}

function adGrowthSpendPriority(input: {
  killPressureScore: number;
  scalePressureScore: number;
  scalingCapital: number;
}): FinancialScalingBudgetPacket["spendPriority"] {
  if (input.scalingCapital < 100 || input.killPressureScore >= 40 || input.scalePressureScore < 60) {
    return "no_spend";
  }

  if (input.scalingCapital < 250 || input.scalePressureScore < 80) {
    return "low_test";
  }

  return "scale_test";
}

function adGrowthAllocationLane(spendPriority: FinancialScalingBudgetPacket["spendPriority"]): FinancialScalingBudgetPacket["allocationLane"] {
  return spendPriority === "no_spend" ? "organic_growth" : "paid_scale_review";
}

function adGrowthRecommendedChannel(
  asset: RevenueAssetPortfolio["assets"][number],
  spendPriority: FinancialScalingBudgetPacket["spendPriority"]
): FinancialScalingBudgetPacket["recommendedChannel"] {
  if (spendPriority === "no_spend") return "organic_content";
  if (asset.assetType === "product" && asset.performance?.conversionRate && asset.performance.conversionRate >= 2) return "paid_ads";

  return "marketplace_listing";
}

function adGrowthApprovalReason(spendPriority: FinancialScalingBudgetPacket["spendPriority"]) {
  if (spendPriority === "no_spend") {
    return "Ad/Growth allocation is organic-first and no-spend. Content prep, listing experiments, and distribution planning are internal only until a separate spend approval exists.";
  }

  if (spendPriority === "low_test") {
    return "Ad/Growth allocation is limited to a small paid-test review packet. Spend remains blocked until separate approval, caps, creative review, and outcome tracking are attached.";
  }

  return "Ad/Growth allocation is eligible for scale-test review from validated performance. Spend remains blocked until separate approval, caps, creative review, and outcome tracking are attached.";
}

function buildScalingBudgetQueue(input: {
  generatedAt: string;
  ownerId: string;
  portfolio: RevenueAssetPortfolio | undefined;
  portfolioSignal: FinancialPortfolioSignal;
  scalingCapital: number;
}): FinancialScalingBudgetPacket[] {
  const eligibleAssets = validatedScaleAssets(input.portfolio);

  if (input.scalingCapital <= 0 || eligibleAssets.length === 0) {
    return [];
  }

  const spendPriority = adGrowthSpendPriority({
    killPressureScore: input.portfolioSignal.killPressure.pressureScore,
    scalePressureScore: input.portfolioSignal.scalePressure.pressureScore,
    scalingCapital: input.scalingCapital
  });
  const allocationLane = adGrowthAllocationLane(spendPriority);
  const maxPerAssetAmount = money(spendPriority === "no_spend"
    ? input.scalingCapital
    : spendPriority === "low_test"
      ? Math.min(input.scalingCapital * 0.35, 100)
      : Math.min(input.scalingCapital * 0.5, 500));
  const packets: FinancialScalingBudgetPacket[] = [];
  let remaining = input.scalingCapital;

  for (const asset of eligibleAssets) {
    const remainingSlots = eligibleAssets.length - packets.length;
    const amount = money(Math.min(maxPerAssetAmount, remaining / Math.max(remainingSlots, 1)));

    if (amount <= 0) continue;

    remaining = money(remaining - amount);
    packets.push({
      allocationLane,
      amount,
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason: adGrowthApprovalReason(spendPriority),
        status: "Required"
      },
      assetId: asset.assetId,
      assetName: asset.assetName,
      assetType: asset.assetType,
      blockedExternalActions: financialBlockedExternalActions,
      budgetCap: {
        maxPerAssetAmount,
        retainedScalingCapital: 0,
        totalScalingCapital: input.scalingCapital
      },
      confidence: asset.confidence,
      dedupeKey: stableHash({
        allocationLane,
        amount,
        assetId: asset.assetId,
        assetType: asset.assetType,
        ownerId: input.ownerId,
        spendPriority,
        totalScalingCapital: input.scalingCapital
      }),
      externalExecution: false,
      id: `scale_budget_${safeId(input.ownerId)}_${safeId(asset.assetType)}_${safeId(asset.assetId)}_${safeId(input.generatedAt)}`,
      organicFirst: allocationLane === "organic_growth",
      performanceBasis: {
        evidenceGrade: asset.performance?.evidenceGrade ?? "none",
        killPressureScore: input.portfolioSignal.killPressure.pressureScore,
        scalePressureScore: input.portfolioSignal.scalePressure.pressureScore,
        snapshots: asset.performance?.snapshots ?? 0
      },
      priority: asset.priority,
      profitVelocity: money(asset.performance?.profitVelocity ?? 0),
      providerContacted: false,
      reason: `${allocationLane === "organic_growth" ? "Organic-first" : "Paid scale-review"} Ad/Growth packet from the fixed 25% bucket. ${asset.scoreBand} rank ${asset.assetScore.finalRank}, ${asset.performance?.evidenceGrade ?? "no"} evidence, ${asset.performance?.snapshots ?? 0} snapshot${(asset.performance?.snapshots ?? 0) === 1 ? "" : "s"}, and ${money(asset.performance?.profitVelocity ?? 0)} daily profit velocity. ${asset.reason}`,
      recommendedChannel: adGrowthRecommendedChannel(asset, spendPriority),
      score: asset.assetScore.finalRank,
      scoreBand: asset.scoreBand,
      spendPriority,
      status: "approval_required",
      storeId: asset.storeId,
      storeName: asset.storeName
    });
  }

  const retainedScalingCapital = money(Math.max(0, input.scalingCapital - packets.reduce((sum, packet) => sum + packet.amount, 0)));

  return packets.map((packet) => ({
    ...packet,
    budgetCap: {
      ...packet.budgetCap,
      retainedScalingCapital
    }
  }));
}

function adGrowthAllocationPlanFor(input: {
  packets: FinancialScalingBudgetPacket[];
  portfolioDefensiveHold: boolean;
  portfolioSignal: FinancialPortfolioSignal;
  scalingBucketAmount: number;
}): FinancialAdGrowthAllocationPlan {
  const packetAmount = money(input.packets.reduce((sum, packet) => sum + packet.amount, 0));
  const organicFirstAmount = money(input.packets
    .filter((packet) => packet.allocationLane === "organic_growth")
    .reduce((sum, packet) => sum + packet.amount, 0));
  const paidScaleReviewAmount = money(input.packets
    .filter((packet) => packet.allocationLane === "paid_scale_review")
    .reduce((sum, packet) => sum + packet.amount, 0));
  const retainedAmount = money(Math.max(0, input.scalingBucketAmount - packetAmount));
  const mode: FinancialAdGrowthAllocationPlan["mode"] = input.portfolioDefensiveHold
    ? "defensive_hold"
    : paidScaleReviewAmount > 0
      ? "paid_scale_review"
      : organicFirstAmount > 0
        ? "organic_first"
        : "watch";
  const strongestSpendPriority = input.packets.some((packet) => packet.spendPriority === "scale_test")
    ? "scale_test"
    : input.packets.some((packet) => packet.spendPriority === "low_test")
      ? "low_test"
      : input.packets.some((packet) => packet.spendPriority === "no_spend")
        ? "no_spend"
        : "none";
  const pressureDecision: FinancialAdGrowthAllocationPlan["pressureDecision"] = {
    advisoryOnly: true,
    decision: mode === "defensive_hold"
      ? "retain_for_defense"
      : mode === "paid_scale_review"
        ? "paid_scale_review"
        : mode === "organic_first"
          ? "organic_first"
          : "watch",
    guardrail: "The 25% Ad/Growth bucket is advisory-only; pressure signals can queue internal packets, retain capital, or require review, but cannot spend or call providers.",
    killPressureScore: input.portfolioSignal.killPressure.pressureScore,
    reason: mode === "defensive_hold"
      ? `Kill pressure ${input.portfolioSignal.killPressure.pressureScore}/100 blocks Ad/Growth release and retains the bucket. ${input.portfolioSignal.killPressure.reason}`
      : mode === "paid_scale_review"
        ? `Scale pressure ${input.portfolioSignal.scalePressure.pressureScore}/100 supports paid scale-review packets while spend stays approval-gated. ${input.portfolioSignal.scalePressure.reason}`
        : mode === "organic_first"
          ? `Scale pressure ${input.portfolioSignal.scalePressure.pressureScore}/100 supports organic-first growth packets. Kill pressure ${input.portfolioSignal.killPressure.pressureScore}/100 does not block, but paid spend remains locked.`
          : `Scale pressure ${input.portfolioSignal.scalePressure.pressureScore}/100 and kill pressure ${input.portfolioSignal.killPressure.pressureScore}/100 do not justify a release packet yet.`,
    recommendedSpendPriority: strongestSpendPriority,
    scalePressureScore: input.portfolioSignal.scalePressure.pressureScore,
    source: "revenue_engine_scored_portfolio"
  };

  return {
    advisoryOnly: true,
    bucketAmount: input.scalingBucketAmount,
    guardrails: [
      "Organic content, listing, and marketplace optimization are prioritized before paid spend while capital is limited.",
      "Every Ad/Growth packet is advisory-only until separate manual approval, spend cap, creative review, and outcome tracking exist.",
      "Kill pressure blocks or retains Ad/Growth capital before any scale review.",
      "No provider, ad platform, marketplace, bank, social, upload, browser, or payment write action is authorized here."
    ],
    killPressure: input.portfolioSignal.killPressure,
    mode,
    organicFirstAmount,
    paidScaleReviewAmount,
    pressureDecision,
    retainedAmount,
    scalePressure: input.portfolioSignal.scalePressure,
    summary: mode === "defensive_hold"
      ? `The 25% Ad/Growth bucket is retained because kill pressure is ${input.portfolioSignal.killPressure.level} at ${input.portfolioSignal.killPressure.pressureScore}/100.`
      : mode === "paid_scale_review"
        ? `${paidScaleReviewAmount.toFixed(2)} is queued for paid scale-review packets and ${organicFirstAmount.toFixed(2)} for organic-first prep from the fixed 25% Ad/Growth bucket.`
        : mode === "organic_first"
          ? `${organicFirstAmount.toFixed(2)} is queued for organic-first growth prep from the fixed 25% Ad/Growth bucket; paid spend remains locked.`
          : `The 25% Ad/Growth bucket has ${input.scalingBucketAmount.toFixed(2)} available but no validated performance packet is ready.`
  };
}

export function buildFinancialOrchestratorPlan(input: {
  assetPortfolio?: RevenueAssetPortfolio;
  existingLedgerSnapshotIds?: Set<string>;
  generatedAt?: string;
  options?: Partial<FinancialOrchestratorOptions>;
  ownerId: string;
  products: RevenueEngineProductSnapshot[];
  snapshots: RevenuePerformanceSnapshot[];
  stores: RevenueEngineStoreSnapshot[];
}): FinancialOrchestratorPlan {
  const options = withFinancialOrchestratorOptions(input.options);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const storesById = new Map(input.stores.map((store) => [store.id, store]));
  const productsById = new Map(input.products.map((product) => [product.id, product]));
  const existingSnapshotIds = input.existingLedgerSnapshotIds ?? new Set<string>();
  const ledgerEntries = input.snapshots.map((snapshot) => ledgerEntryFor({
    existingSnapshotIds,
    options,
    product: snapshot.productId ? productsById.get(snapshot.productId) : undefined,
    snapshot,
    store: storesById.get(snapshot.storeId)
  }));
  const grossRevenue = money(input.snapshots.reduce((sum, snapshot) => sum + snapshot.grossRevenue, 0));
  const netProfit = money(input.snapshots.reduce((sum, snapshot) => sum + snapshot.netProfit, 0));
  const allocatableProfit = money(Math.max(0, netProfit));
  const reserveHeld = money(Math.min(allocatableProfit, options.reserveFloorAmount));
  const distributableProfit = money(Math.max(0, allocatableProfit - reserveHeld));
  const totalPercent = money(options.scalingPercent + options.personalPercent + options.bufferPercent);
  const policyStatus = totalPercent === 100 ? "balanced" : "blocked";
  const policyChecks = policyChecksFor(options, totalPercent, input.snapshots);
  const portfolioSignal = portfolioSignalFor(input.assetPortfolio);
  const advisoryContext = advisoryContextFor(portfolioSignal);
  const portfolioDefensiveHold = portfolioSignal.recommendation === "defensive_hold";

  const allocationBuckets: FinancialAllocationBucket[] = (["scaling", "personal", "buffer"] as const).map((category) => {
    const percent = options[`${category}Percent`];
    const amount = money(distributableProfit * percent / 100);
    const baseStatus: FinancialAllocationBucket["status"] = amount <= 0
      ? "held"
      : amount >= options.minPayoutIntentAmount
        ? "intent_ready"
        : "below_minimum";
    const portfolioHeld = category === "scaling" && portfolioDefensiveHold && amount > 0;
    const status: FinancialAllocationBucket["status"] = portfolioHeld ? "held" : baseStatus;

    return {
      amount,
      category,
      destinationType: categoryDestinations[category],
      guardrailReason: portfolioHeld ? portfolioSignal.reason : undefined,
      label: categoryLabels[category],
      payoutIntentAmount: status === "intent_ready" ? amount : 0,
      percent,
      purpose: categoryPurposes[category],
      retainedAmount: status === "intent_ready" ? 0 : amount,
      role: categoryRoles[category],
      status
    };
  });

  const sourceLedgerEntryIds = ledgerEntries
    .filter((entry) => entry.allocatableProfit > 0)
    .map((entry) => entry.id);
  const payoutIntents = policyStatus === "balanced" && options.includePayoutIntents
    ? allocationBuckets
      .filter((bucket) => bucket.status === "intent_ready")
      .map((bucket) => ({
        amount: bucket.payoutIntentAmount,
        approvalGate: {
          externalExecutionLocked: true as const,
          humanApprovalRequired: true as const,
          reason: "Financial Orchestrator records payout intent only. Stripe Treasury, Connect, and bank movement require a future explicit approval path.",
          status: "Required" as const
        },
        category: bucket.category,
        currency: options.currency,
        dedupeKey: payoutDedupeKey({
          amount: bucket.payoutIntentAmount,
          category: bucket.category,
          ledgerEntries,
          options,
          ownerId: input.ownerId
        }),
        destinationType: bucket.destinationType,
        externalExecution: false as const,
        id: `payout_${bucket.category}_${safeId(String(bucket.payoutIntentAmount))}`,
        provider: "Stripe Treasury + Connect" as const,
        sourceLedgerEntryIds,
        status: "approval_required" as const,
        title: `${bucket.label} payout intent`
      }))
    : [];
  const scalingBucket = allocationBuckets.find((bucket) => bucket.category === "scaling");
  const scalingBudgetQueue = policyStatus === "balanced" && !portfolioDefensiveHold
    ? buildScalingBudgetQueue({
      generatedAt,
      ownerId: input.ownerId,
      portfolio: input.assetPortfolio,
      portfolioSignal,
      scalingCapital: scalingBucket?.payoutIntentAmount ?? 0
    })
    : [];
  const adGrowthAllocation = adGrowthAllocationPlanFor({
    packets: scalingBudgetQueue,
    portfolioDefensiveHold,
    portfolioSignal,
    scalingBucketAmount: scalingBucket?.amount ?? 0
  });

  const riskFlags = riskFlagsFor({
    distributableProfit,
    ledgerEntries,
    portfolioSignal,
    snapshots: input.snapshots,
    totalNetProfit: netProfit
  });
  const payoutIntentAmount = money(payoutIntents.reduce((sum, intent) => sum + intent.amount, 0));
  const scalingBudgetAmount = money(scalingBudgetQueue.reduce((sum, packet) => sum + packet.amount, 0));
  const scalingBudgetRetainedAmount = money(Math.max(0, (scalingBucket?.amount ?? 0) - scalingBudgetAmount));
  const storeIds = new Set(input.snapshots.map((snapshot) => snapshot.storeId));

  return {
    advisoryContext,
    allocationBuckets,
    auditEvents: [
      "Financial Orchestrator plan generated from internal revenue performance snapshots.",
      "Exact 25/25/50 policy applied: 25% Ad/Growth, 25% Entral technology and operations, 50% owner income.",
      `Revenue Engine scored portfolio attached as advisory scale and kill pressure for Ad/Growth allocation; ${adGrowthAllocation.mode.replace(/_/g, " ")} mode selected and no money movement is authorized.`,
      `Ad/Growth pressure decision ${adGrowthAllocation.pressureDecision.decision.replace(/_/g, " ")} came from scale pressure ${adGrowthAllocation.pressureDecision.scalePressureScore}/100 and kill pressure ${adGrowthAllocation.pressureDecision.killPressureScore}/100.`,
      ...(portfolioDefensiveHold ? ["Portfolio defensive hold retained Ad/Growth capital instead of creating a reinvestment payout intent."] : []),
      ...(scalingBudgetQueue.length > 0 ? [`${scalingBudgetQueue.length} Ad/Growth budget packet${scalingBudgetQueue.length === 1 ? "" : "s"} queued for validated scale assets.`] : []),
      "Payout intents are approval-required records only; no provider or bank was contacted."
    ],
    blockedExternalActions: [
      ...financialBlockedExternalActions
    ],
    externalExecution: false,
    generatedAt,
    ledgerEntries,
    mode: "Internal Financial Orchestrator",
    options,
    payoutIntents,
    policyChecks,
    portfolioSignal,
    adGrowthAllocation,
    riskFlags,
    scalingBudgetQueue,
    splitPolicy: {
      adGrowthPercent: options.scalingPercent,
      bufferPercent: options.bufferPercent,
      currency: options.currency,
      entralOperationsPercent: options.bufferPercent,
      minPayoutIntentAmount: options.minPayoutIntentAmount,
      ownerPercent: options.personalPercent,
      personalPercent: options.personalPercent,
      reserveFloorAmount: options.reserveFloorAmount,
      scalingPercent: options.scalingPercent,
      status: policyStatus,
      totalPercent
    },
    summary: `${input.snapshots.length} income snapshot${input.snapshots.length === 1 ? "" : "s"} evaluated. ${payoutIntents.length} payout intent${payoutIntents.length === 1 ? "" : "s"} prepared from exact 25/25/50 split: ${options.scalingPercent}% Ad/Growth, ${options.bufferPercent}% Entral operations, ${options.personalPercent}% owner income with ${options.currency} ${distributableProfit.toFixed(2)} distributable profit. ${scalingBudgetQueue.length} Ad/Growth budget packet${scalingBudgetQueue.length === 1 ? "" : "s"} queued for validated assets. ${adGrowthAllocation.summary} Portfolio finance signal: ${portfolioSignal.recommendation.replace(/_/g, " ")} at ${money(portfolioSignal.profitVelocity)} daily profit velocity. Scale pressure ${portfolioSignal.scalePressure.level} ${portfolioSignal.scalePressure.pressureScore}/100; kill pressure ${portfolioSignal.killPressure.level} ${portfolioSignal.killPressure.pressureScore}/100.${portfolioDefensiveHold ? " Ad/Growth capital is retained until weak or risky assets are cleared." : ""}`,
    totals: {
      allocatableProfit,
      alreadyRecordedLedgerEntries: ledgerEntries.filter((entry) => entry.recordState === "already_recorded").length,
      adGrowthAmount: allocationBuckets.find((bucket) => bucket.category === "scaling")?.amount ?? 0,
      bufferAmount: allocationBuckets.find((bucket) => bucket.category === "buffer")?.amount ?? 0,
      distributableProfit,
      entralOperationsAmount: allocationBuckets.find((bucket) => bucket.category === "buffer")?.amount ?? 0,
      grossRevenue,
      ledgerEntries: ledgerEntries.length,
      netProfit,
      ownerAmount: allocationBuckets.find((bucket) => bucket.category === "personal")?.amount ?? 0,
      payoutIntentAmount,
      payoutIntents: payoutIntents.length,
      personalAmount: allocationBuckets.find((bucket) => bucket.category === "personal")?.amount ?? 0,
      portfolioAssetCommandsReady: portfolioSignal.assetCommandsReady,
      portfolioKillPressure: portfolioSignal.killPressure.pressureScore,
      portfolioProfitVelocity: portfolioSignal.profitVelocity,
      portfolioScalePressure: portfolioSignal.scalePressure.pressureScore,
      portfolioScaleRecommendations: portfolioSignal.scaleRecommendations,
      reserveHeld,
      scalingBudgetAmount,
      scalingBudgetPackets: scalingBudgetQueue.length,
      scalingBudgetRetainedAmount,
      scalingAmount: allocationBuckets.find((bucket) => bucket.category === "scaling")?.amount ?? 0,
      snapshots: input.snapshots.length,
      storesTracked: storeIds.size
    }
  };
}
