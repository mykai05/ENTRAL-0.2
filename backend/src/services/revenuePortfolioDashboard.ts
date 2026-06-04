import type { PortfolioCommandCenterPlan } from "./portfolioCommandCenter.js";
import type { RevenueBusinessFleetPlan, RevenueHundredStoreOperationsPlan } from "./revenueBusinessFleetScheduler.js";
import type { RevenueAssetControlLedgerPlan } from "./revenueAssetControlLedger.js";
import type { RevenueAssetReviewQueuePlan } from "./revenueAssetReviewQueue.js";
import type { RevenueAssetPortfolio, RevenueAssetRotationDecision, RevenueAssetScore } from "./revenueEngine.js";
import type { RevenueFirstBusinessLaunchPlan } from "./revenueFirstBusinessLaunch.js";
import type { RevenueFirstBusinessExecutionPlan } from "./revenueFirstStorePreparation.js";
import type { RevenueFirstCashReadinessPlan } from "./revenueFirstCashReadiness.js";
import type { RevenueLaunchReadinessItem, RevenueLaunchReadinessPlan } from "./revenueLaunchReadiness.js";
import type { FinancialOrchestratorPlan } from "./financialOrchestrator.js";

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

export type RevenuePortfolioDashboardConnectionStatus = "ready" | "approval_required" | "missing" | "blocked" | "watch";

export type RevenuePortfolioDashboardLaunchEvidenceCategory =
  | "storefront"
  | "pod_supplier"
  | "payments_payouts"
  | "content_channels"
  | "analytics_manual_import"
  | "ads";

export type RevenuePortfolioDashboardConnectionCheck = {
  category: RevenuePortfolioDashboardLaunchEvidenceCategory;
  label: string;
  nextInternalAction: string;
  ready: boolean;
  reason: string;
  status: RevenuePortfolioDashboardConnectionStatus;
};

export type RevenuePortfolioDashboardDailyChecklistItem = {
  evidence: string;
  nextInternalAction: string;
  status: "ready" | "approval_required" | "blocked" | "watch";
  title: string;
};

export type RevenuePortfolioDashboardDailyRevenueLoopAction = {
  detail: string;
  lane: "product" | "content" | "growth";
  nextInternalAction: string;
  status: "ready" | "approval_required" | "blocked" | "watch";
  title: string;
};

export type RevenuePortfolioDashboardDailyRevenueLoop = {
  advisoryAllocation: {
    adGrowthAmount: number;
    adGrowthPercent: number;
    entralOperationsAmount: number;
    entralOperationsPercent: number;
    guardrail: string;
    mode: "organic_first" | "paid_scale_review" | "defensive_hold" | "watch" | "unavailable";
    ownerIncomeAmount: number;
    ownerIncomePercent: number;
    reserveHeld: number;
    scalingBudgetPackets: number;
    status: "balanced" | "blocked" | "unavailable";
  };
  decision: {
    killPressure: number;
    posture: "defensive_hold" | "scale_review" | "watch" | "launch_review";
    reason: string;
    recommendation: RevenueAssetRotationDecision | "launch";
    scalePressure: number;
  };
  nextActions: RevenuePortfolioDashboardDailyRevenueLoopAction[];
  signalIngest: {
    manualSnapshots: number;
    performanceSnapshots: number;
    source: "financial_orchestrator" | "portfolio_dashboard";
    status: "ready" | "missing" | "watch";
    summary: string;
    trackedAssets: number;
  };
};

export type RevenuePortfolioDashboardFirstWeekRevenueLoop = {
  checkIns: Array<{
    day: 0 | 1 | 3 | 7;
    requiredEvidence: string[];
    status: "ready_manual_capture" | "waiting_for_launch";
    title: string;
  }>;
  externalExecution: false;
  metricFields: Array<{
    cadence: "twice_daily" | "daily" | "end_of_week";
    id: string;
    label: string;
  }>;
  providerContacted: false;
  rotationReview: {
    day: 7;
    inputs: string[];
    nextInternalAction: string;
    output: "feed_revenue_engine_scale_watch_pause_kill";
  };
  signalCaptureChecklist: Array<{
    blockedExternalActions: string[];
    day: 0 | 1 | 3 | 7;
    nextInternalAction: string;
    recorded: boolean;
    requiredEvidence: string[];
    requiredFields: string[];
    rotationRecommendation: RevenueAssetRotationDecision | null;
    rotationRecommendationRequired: boolean;
    status: "recorded" | "missing" | "needs_rotation_recommendation" | "waiting_for_launch";
    title: string;
  }>;
  status: "ready_for_manual_signal_capture" | "waiting_for_final_execution_packet" | "blocked";
  summary: string;
};

export type RevenuePortfolioDashboardWinnerScaleLadder = {
  clonePackets: Array<{
    approvalPhrase: "APPROVE INTERNAL WINNER CLONE PACKET";
    auditTrail: string[];
    blockedExternalActions: string[];
    draftCloneSlots: number;
    draftSlots: Array<{
      blockedExternalActions: string[];
      contentTemplate: string;
      externalExecution: false;
      listingTemplate: string;
      nextInternalAction: string;
      productTemplate: string;
      providerContacted: false;
      signalTemplate: string;
      slot: number;
      status: "approval_required" | "blocked" | "waiting_for_proof";
      storeTemplate: string;
      title: string;
    }>;
    externalExecution: false;
    nextInternalAction: string;
    ownerApprovalRequired: boolean;
    proofSummary: string;
    providerContacted: false;
    readinessPercent: number;
    requiredProof: string[];
    sourceTemplate: "final_execution_packet" | "hundred_store_launch_packets" | "none";
    status: "approval_required" | "blocked" | "waiting_for_proof";
    summary: string;
    targetStores: 10 | 25 | 100;
    tasks: Array<{
      category: "storefront" | "product" | "listing" | "content" | "signal";
      detail: string;
      nextInternalAction: string;
      status: "approval_required" | "blocked" | "ready_internal" | "waiting_for_proof";
      title: string;
    }>;
  }>;
  cloneTemplates: Array<{
    detail: string;
    ready: boolean;
    source: "final_execution_packet" | "first_week_loop" | "hundred_store_ops";
    type: "storefront" | "product" | "listing" | "content" | "signal";
  }>;
  externalExecution: false;
  proofGate: {
    evidenceSummary: string;
    nextInternalAction: string;
    requiredSignals: string[];
    status: "blocked" | "waiting_for_first_sale" | "ready_for_owner_scale_review";
  };
  providerContacted: false;
  stages: Array<{
    allowedInternalActions: string[];
    blockedExternalActions: string[];
    nextInternalAction: string;
    proofRequired: string;
    readinessPercent: number;
    status: "approval_required" | "blocked" | "ready_internal" | "waiting_for_proof";
    targetStores: 10 | 25 | 100;
    templateSource: "final_execution_packet" | "hundred_store_launch_packets" | "none";
  }>;
  summary: string;
};

export type RevenuePortfolioDashboardOwnerLaunchApprovalPacket = {
  approvalMode: "manual_live_launch_review";
  approvalPhrase: "APPROVE FIRST STORE MANUAL LIVE LAUNCH";
  auditTrail: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  liveApprovalRequired: true;
  manualOnlyActions: Array<{
    detail: string;
    status: "ready_for_owner_review" | "blocked" | "waiting";
    title: string;
  }>;
  preflightChecks: Array<{
    detail: string;
    status: "ready" | "approval_required" | "blocked" | "watch";
    title: string;
  }>;
  providerContacted: false;
  rollbackPlan: string[];
  status: "ready_for_owner_review" | "blocked" | "waiting_for_final_execution_packet";
  summary: string;
  unlockBoundary: {
    nextInternalAction: string;
    stillLocked: string[];
    unlocks: string[];
  };
};

export type RevenuePortfolioDashboardRevenueMilestonePath = {
  currentRunRate: {
    dailyProfitVelocity: number;
    dailyRevenueVelocity: number;
    estimatedProfit: number;
    monthlyProfitRunRate: number;
    monthlyRevenueRunRate: number;
    totalRevenue: number;
  };
  externalExecution: false;
  milestones: Array<{
    currentMonthlyRunRate: number;
    gapMonthlyRevenue: number;
    guardrail: string;
    label: "First Real Revenue" | "$10k/month" | "$100k/month";
    nextInternalAction: string;
    requiredEvidence: string[];
    status:
      | "achieved"
      | "ready_for_owner_review"
      | "waiting_for_first_sale"
      | "waiting_for_scale_proof"
      | "waiting_for_10k"
      | "blocked";
    targetMonthlyRevenue: number;
  }>;
  providerContacted: false;
  summary: string;
};

export type RevenuePortfolioDashboardFirstStoreRevenueProof = {
  evidence: string[];
  evidenceGrade: "none" | "thin" | "usable" | "strong";
  externalExecution: false;
  firstRevenueCaptured: boolean;
  grossRevenue: number;
  manualSignalReceipts: number;
  netProfit: number;
  nextInternalAction: string;
  providerContacted: false;
  revenueVelocity: number;
  snapshots: number;
  status: "proven" | "waiting_for_revenue" | "waiting_for_signal" | "waiting_for_store" | "blocked";
  storeId: string | null;
  storeName: string | null;
  summary: string;
};

export type RevenuePortfolioDashboardCashLoopVerificationAudit = {
  externalExecution: false;
  nextInternalAction: string;
  providerContacted: false;
  requirements: Array<{
    evidence: string[];
    externalActionsLocked: string[];
    id:
      | "final_execution_packet"
      | "launch_readiness_connections"
      | "manual_launch_packet"
      | "owner_launch_approval"
      | "first_week_signal_capture"
      | "daily_revenue_loop"
      | "cash_loop_evidence_ledger"
      | "proven_winner_scale_ladder"
      | "revenue_milestones"
      | "hundred_store_worker_assignments"
      | "safety_lock";
    label: string;
    nextInternalAction: string;
    ownerApprovalRequired: boolean;
    status: "proven" | "owner_approval_required" | "waiting_for_live_evidence" | "waiting_for_scale_proof" | "blocked";
  }>;
  status: "verified_internal_ready" | "needs_owner_approval" | "needs_live_revenue_evidence" | "needs_scale_proof" | "blocked";
  summary: string;
  totals: {
    blocked: number;
    ownerApprovalRequired: number;
    proven: number;
    requirements: number;
    waitingForLiveEvidence: number;
    waitingForScaleProof: number;
  };
};

export type RevenuePortfolioDashboardCashLoopEvidenceType =
  | "owner_launch_approval"
  | "manual_launch_evidence"
  | "manual_signal_snapshot"
  | "winner_clone_packet_approval";

export type RevenuePortfolioDashboardCashLoopEvidenceReceipt = {
  action: string;
  auditLogId: string;
  createdAt: string;
  entryHash: string;
  evidenceType: RevenuePortfolioDashboardCashLoopEvidenceType;
  externalExecution: false;
  launchEvidenceCategory?: RevenuePortfolioDashboardLaunchEvidenceCategory | null;
  manualSignalDay?: number | null;
  manualSignalRotationRecommendation?: RevenueAssetRotationDecision | null;
  providerContacted: false;
  storeId: string | null;
  storeName: string | null;
  summary: string;
  targetId: string | null;
  targetStores?: 10 | 25 | 100 | null;
  targetType: string;
};

export type RevenuePortfolioDashboardCashLoopEvidenceTotals = {
  cloneApprovals: number;
  cloneApprovalsByTarget: {
    hundredStore: number;
    tenStore: number;
    twentyFiveStore: number;
    unscoped: number;
  };
  launchEvidence: number;
  manualSignals: number;
  ownerApprovals: number;
  receipts: number;
};

export type RevenuePortfolioDashboardLaunchEvidenceCoverage = {
  missingCategories: RevenuePortfolioDashboardLaunchEvidenceCategory[];
  ready: boolean;
  recordedCategories: RevenuePortfolioDashboardLaunchEvidenceCategory[];
  requiredCategories: RevenuePortfolioDashboardLaunchEvidenceCategory[];
  summary: string;
};

export type RevenuePortfolioDashboardFirstWeekSignalCoverage = {
  daySevenRecorded: boolean;
  missingDays: number[];
  ready: boolean;
  recordedDays: number[];
  requiredDays: number[];
  rotationRecommendation: RevenueAssetRotationDecision | null;
  rotationRecommendationRecorded: boolean;
  summary: string;
};

export type RevenuePortfolioDashboardCashLoopEvidenceLedger = {
  externalExecution: false;
  providerContacted: false;
  receipts: RevenuePortfolioDashboardCashLoopEvidenceReceipt[];
  selectedStore: {
    firstWeekSignalCoverage: RevenuePortfolioDashboardFirstWeekSignalCoverage;
    launchEvidenceCoverage: RevenuePortfolioDashboardLaunchEvidenceCoverage;
    storeId: string | null;
    storeName: string | null;
    summary: string;
    totals: RevenuePortfolioDashboardCashLoopEvidenceTotals;
  };
  summary: string;
  totals: RevenuePortfolioDashboardCashLoopEvidenceTotals;
};

export type RevenuePortfolioDashboardCashLoopStage = {
  externalExecution: false;
  firstRevenueCaptured: boolean;
  label: string;
  nextOwnerAction: {
    label: string;
    nextInternalAction: string;
    reason: string;
    source: "cash_loop_stage";
  };
  providerContacted: false;
  receiptsNeeded: string[];
  receiptsRecorded: string[];
  status:
    | "waiting_for_execution_packet"
    | "waiting_for_owner_launch_approval"
    | "waiting_for_manual_launch_evidence"
    | "waiting_for_first_signal_snapshot"
    | "waiting_for_first_revenue"
    | "waiting_for_scale_packet_approval"
    | "scale_packet_approved"
    | "blocked";
  summary: string;
};

export type RevenuePortfolioDashboardOwnerActionQueueItem = {
  actionLabel: string;
  blockedExternalActions: string[];
  evidenceToRecord: string[];
  externalExecution: false;
  nextInternalAction: string;
  order: number;
  providerContacted: false;
  receiptType: RevenuePortfolioDashboardCashLoopEvidenceType | "final_execution_packet" | "first_revenue_signal" | "none";
  source:
    | "cash_loop_stage"
    | "execution_packet"
    | "owner_launch_approval"
    | "manual_launch_packet"
    | "first_week_revenue_loop"
    | "daily_revenue_loop"
    | "winner_scale_ladder";
  status: "complete" | "current" | "owner_approval_required" | "waiting" | "blocked";
  summary: string;
};

export type RevenuePortfolioDashboardFirstStoreToScaleProofChain = {
  blockedExternalActions: string[];
  externalExecution: false;
  nextInternalAction: string;
  providerContacted: false;
  stages: Array<{
    blockedExternalActions: string[];
    evidence: string[];
    externalExecution: false;
    label: string;
    nextInternalAction: string;
    order: number;
    providerContacted: false;
    receipts: string[];
    status:
      | "proven"
      | "current"
      | "owner_approval_required"
      | "waiting_for_internal_packet"
      | "waiting_for_live_evidence"
      | "waiting_for_scale_proof"
      | "blocked";
    unlocks: string[];
  }>;
  status:
    | "first_store_to_scale_verified"
    | "in_private_scale_preparation"
    | "needs_internal_packet"
    | "needs_owner_approval"
    | "needs_live_revenue_evidence"
    | "needs_scale_proof"
    | "blocked";
  summary: string;
  totals: {
    blocked: number;
    current: number;
    ownerApprovalRequired: number;
    proven: number;
    stages: number;
    waitingForInternalPacket: number;
    waitingForLiveEvidence: number;
    waitingForScaleProof: number;
  };
};

export type RevenuePortfolioDashboardManualLaunchPacket = {
  auditTrail: string[];
  contentPlan: Array<{
    channel: string;
    hook: string;
    status: "ready_internal";
  }>;
  externalExecution: false;
  listing: {
    bullets: string[];
    description: string;
    seoKeywords: string[];
    title: string;
  };
  launchEvidenceChecklist: Array<{
    blockedExternalActions: string[];
    category: RevenuePortfolioDashboardLaunchEvidenceCategory;
    nextInternalAction: string;
    ownerApprovalRequired: boolean;
    requiredForFirstSignal: boolean;
    requiredProof: string[];
    status: "recorded" | "missing" | "approval_required";
    title: string;
  }>;
  manualSteps: string[];
  organicFirstWeek: Array<{
    day: number;
    evidence: string[];
    title: string;
  }>;
  product: {
    marginPercent: number;
    name: string;
    retailPrice: number;
    storefrontCollection: string;
    type: string;
  } | null;
  providerContacted: false;
  rollbackPlan: string[];
  semiAutomatedSteps: string[];
  status: "ready_for_operator_review" | "blocked" | "waiting_for_final_execution_packet";
  store: {
    name: string;
    platform: string;
  } | null;
  supplier: {
    estimatedBaseCost: number;
    provider: "Printify" | "Printful" | "Other";
    steps: string[];
    status: "selected_internal_owner_gated" | "blocked" | "waiting";
  };
};

export type RevenuePortfolioDashboardFirstStoreCashLoop = {
  approvalGates: string[];
  connectionChecks: RevenuePortfolioDashboardConnectionCheck[];
  dailyChecklist: RevenuePortfolioDashboardDailyChecklistItem[];
  dailyRevenueLoop: RevenuePortfolioDashboardDailyRevenueLoop;
  evidenceLedger: RevenuePortfolioDashboardCashLoopEvidenceLedger;
  cashLoopStage: RevenuePortfolioDashboardCashLoopStage;
  executionPacket: {
    auditTrail: string[];
    contentIdeas: number;
    firstWeekMetricFields: number;
    label: string;
    manualSteps: number;
    organicMoves: number;
    products: number;
    readinessBlocked: number;
    readinessReady: number;
    rollbackPlan: string[];
    semiAutomatedSteps: number;
    source: "final_execution_packet" | "launch_package" | "none";
    status: "ready_from_final_execution_packet" | "ready_for_final_execution_review" | "waiting_for_approved_package" | "blocked";
  };
  externalExecution: false;
  firstCashStatus: {
    automaticCashEtaDays: number | null;
    automaticCashReady: boolean;
    cashReadinessScore: number;
    estimatedFirstSaleDays: number | null;
    manualLaunchReady: boolean;
    nextActionReason: string;
    nextActionTitle: string;
    status: string;
    storeId: string;
    storeName: string;
  } | null;
  launchReadiness: {
    nextInternalAction: string;
    readinessScore: number;
    stage: string;
    status: "ready" | "approval_required" | "blocked" | "watch";
    storeId: string | null;
    storeName: string | null;
    summary: string;
  };
  manualLaunchPacket: RevenuePortfolioDashboardManualLaunchPacket;
  firstWeekRevenueLoop: RevenuePortfolioDashboardFirstWeekRevenueLoop;
  firstRevenueProof: RevenuePortfolioDashboardFirstStoreRevenueProof;
  ownerLaunchApproval: RevenuePortfolioDashboardOwnerLaunchApprovalPacket;
  missingConnections: string[];
  mode: "First Store Cash Loop Summary";
  nextRevenuePriority: {
    label: string;
    reason: string;
    source: "cash_loop_stage" | "first_cash" | "dashboard" | "scale_path" | "launch_readiness";
  };
  providerContacted: false;
  ownerActionQueue: RevenuePortfolioDashboardOwnerActionQueueItem[];
  proofChain: RevenuePortfolioDashboardFirstStoreToScaleProofChain;
  revenueSignals: {
    estimatedProfit: number;
    killPressure: number;
    profitVelocity: number;
    recommendation: RevenueAssetRotationDecision | "launch";
    revenueVelocity: number;
    scalePressure: number;
    totalRevenue: number;
  };
  revenueMilestonePath: RevenuePortfolioDashboardRevenueMilestonePath;
  verificationAudit: RevenuePortfolioDashboardCashLoopVerificationAudit;
  winnerScaleLadder: RevenuePortfolioDashboardWinnerScaleLadder;
  scalePath: {
    tenStore: {
      currentStores: number;
      gap: number;
      nextInternalAction: string;
      readinessPercent: number;
      readyParallelStores: number;
      scaleReadyStores: number;
      targetStores: number;
    };
    twentyFiveStore: {
      applicationTemplatesReady: number;
      contentTemplatesReady: number;
      currentStores: number;
      gap: number;
      launchPacketsReady: number;
      nextInternalAction: string;
      productTemplatesReady: number;
      readinessPercent: number;
      status: "ready" | "approval_required" | "watch" | "blocked";
      targetStores: 25;
      templateSource: "final_execution_packet" | "hundred_store_launch_packets" | "none";
    };
    hundredStore: {
      currentStores: number;
      dailySupervisorSelected: number;
      gap: number;
      gatesBlocked: number;
      gatesPass: number;
      gatesWatch: number;
      nextInternalAction: string;
      readinessScore: number;
      readyParallelStores: number;
      targetStores: number;
      workerAssignmentsReady: number;
    } | null;
  };
  status:
    | "cash_active"
    | "ready_to_launch"
    | "needs_approval"
    | "needs_connections"
    | "needs_products"
    | "blocked"
    | "watch";
  summary: string;
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
  firstStoreCashLoop: RevenuePortfolioDashboardFirstStoreCashLoop;
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

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;

  return Math.round((numerator / denominator) * 100);
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

function topLaunchReadinessItem(input: {
  firstCashPlan?: RevenueFirstCashReadinessPlan | null;
  launchReadinessPlan?: RevenueLaunchReadinessPlan | null;
}): RevenueLaunchReadinessItem | null {
  const topStoreId = input.firstCashPlan?.topCandidate?.storeId ?? null;

  if (topStoreId) {
    const matched = input.launchReadinessPlan?.stores.find((store) => store.store.id === topStoreId);

    if (matched) return matched;
  }

  return input.launchReadinessPlan?.stores[0] ?? null;
}

function applicationCheck(
  plan: RevenueHundredStoreOperationsPlan | null | undefined,
  role: RevenueHundredStoreOperationsPlan["applicationReadiness"]["applications"][number]["role"]
) {
  return plan?.applicationReadiness.applications.find((application) => application.role === role) ?? null;
}

function connectionStatusFromReady(input: {
  blocked?: boolean;
  ready: boolean;
  review?: boolean;
  watch?: boolean;
}): RevenuePortfolioDashboardConnectionStatus {
  if (input.blocked) return "blocked";
  if (input.ready) return "ready";
  if (input.review) return "approval_required";
  if (input.watch) return "watch";

  return "missing";
}

function buildFirstStoreConnectionChecks(input: {
  firstBusinessLaunchPlan?: RevenueFirstBusinessLaunchPlan | null;
  firstBusinessExecutionPlan?: RevenueFirstBusinessExecutionPlan | null;
  firstCashPlan?: RevenueFirstCashReadinessPlan | null;
  hundredStoreOperationsPlan?: RevenueHundredStoreOperationsPlan | null;
  launchItem: RevenueLaunchReadinessItem | null;
}): RevenuePortfolioDashboardConnectionCheck[] {
  const top = input.firstCashPlan?.topCandidate ?? null;
  const storefront = applicationCheck(input.hundredStoreOperationsPlan, "storefront");
  const pod = applicationCheck(input.hundredStoreOperationsPlan, "pod_provider");
  const payments = applicationCheck(input.hundredStoreOperationsPlan, "payments");
  const content = applicationCheck(input.hundredStoreOperationsPlan, "content");
  const manualImport = applicationCheck(input.hundredStoreOperationsPlan, "manual_import");
  const hasLaunchPackage = Boolean(input.firstBusinessLaunchPlan?.launchPackage);
  const hasContentPlan = (input.firstBusinessLaunchPlan?.totals.contentTieIns ?? 0) > 0
    || (input.firstBusinessLaunchPlan?.totals.organicTrafficMoves ?? 0) > 0;
  const providerReady = (top?.evidence.payloadsPrepared ?? 0) > 0 && (top?.evidence.providerApprovalApproved ?? false);
  const paymentsReady = top?.paymentReadiness === "live_design_ready" || top?.paymentReadiness === "approved_readonly";
  const analyticsReady = (input.hundredStoreOperationsPlan?.monitoringMatrix.totals.signalReady ?? 0) > 0
    || (input.hundredStoreOperationsPlan?.monitoringMatrix.totals.manualSnapshots ?? 0) > 0
    || (input.hundredStoreOperationsPlan?.monitoringMatrix.totals.readOnlyImports ?? 0) > 0;

  const checks: RevenuePortfolioDashboardConnectionCheck[] = [
    {
      category: "storefront",
      label: storefront?.title ?? "Storefront Marketplace",
      nextInternalAction: storefront?.nextInternalAction ?? input.launchItem?.storeSetup?.queuedAction ?? "Prepare storefront setup runbook.",
      ready: input.launchItem?.stage === "handoff_ready" || input.launchItem?.stage === "live_monitoring" || storefront?.readinessStatus === "ready",
      reason: input.launchItem?.summary ?? `${storefront?.readyStores ?? 0}/${storefront?.requiredStores ?? 0} storefront application boundary record${(storefront?.requiredStores ?? 0) === 1 ? "" : "s"} are ready.`,
      status: connectionStatusFromReady({
        blocked: storefront?.readinessStatus === "blocked",
        ready: input.launchItem?.stage === "handoff_ready" || input.launchItem?.stage === "live_monitoring" || storefront?.readinessStatus === "ready",
        review: input.launchItem?.stage === "store_setup" || storefront?.readinessStatus === "partial",
        watch: Boolean(input.launchItem)
      })
    },
    {
      category: "pod_supplier",
      label: pod?.title ?? "POD Supplier",
      nextInternalAction: pod?.nextInternalAction ?? "Prepare supplier payloads and provider approval evidence.",
      ready: providerReady || pod?.readinessStatus === "ready",
      reason: `${top?.evidence.payloadsPrepared ?? 0} payload draft${(top?.evidence.payloadsPrepared ?? 0) === 1 ? "" : "s"} prepared; provider approval ${top?.evidence.providerApprovalApproved ? "approved" : top?.evidence.providerApprovalPending ? "pending" : "missing"}. ${pod ? `${pod.readyStores}/${pod.requiredStores} POD application boundary record${pod.requiredStores === 1 ? "" : "s"} ready.` : ""}`.trim(),
      status: connectionStatusFromReady({
        blocked: pod?.readinessStatus === "blocked",
        ready: providerReady || pod?.readinessStatus === "ready",
        review: top?.evidence.providerApprovalPending || pod?.readinessStatus === "partial"
      })
    },
    {
      category: "payments_payouts",
      label: payments?.title ?? "Payments And Payout Signals",
      nextInternalAction: payments?.nextInternalAction ?? "Queue payment and payout readiness review.",
      ready: paymentsReady || payments?.readinessStatus === "ready",
      reason: `Payment readiness is ${top?.paymentReadiness?.replace(/_/g, " ") ?? "missing"}; payouts remain owner approval-gated. ${payments ? `${payments.readyStores}/${payments.requiredStores} payment boundary record${payments.requiredStores === 1 ? "" : "s"} ready.` : ""}`.trim(),
      status: connectionStatusFromReady({
        blocked: payments?.readinessStatus === "blocked",
        ready: paymentsReady || payments?.readinessStatus === "ready",
        review: top?.paymentReadiness === "needs_approval" || payments?.readinessStatus === "partial"
      })
    },
    {
      category: "content_channels",
      label: content?.title ?? "Faceless Content Channels",
      nextInternalAction: content?.nextInternalAction ?? "Prepare organic content channel checklist.",
      ready: hasContentPlan || content?.readinessStatus === "ready",
      reason: `${input.firstBusinessLaunchPlan?.totals.contentTieIns ?? 0} content tie-in${(input.firstBusinessLaunchPlan?.totals.contentTieIns ?? 0) === 1 ? "" : "s"} and ${input.firstBusinessLaunchPlan?.totals.organicTrafficMoves ?? 0} organic move${(input.firstBusinessLaunchPlan?.totals.organicTrafficMoves ?? 0) === 1 ? "" : "s"} prepared. ${content ? `${content.readyStores}/${content.requiredStores} content boundary record${content.requiredStores === 1 ? "" : "s"} ready.` : ""}`.trim(),
      status: connectionStatusFromReady({
        blocked: content?.readinessStatus === "blocked",
        ready: hasContentPlan || content?.readinessStatus === "ready",
        review: hasLaunchPackage || content?.readinessStatus === "partial"
      })
    },
    {
      category: "analytics_manual_import",
      label: manualImport?.title ?? "Manual Signal Import",
      nextInternalAction: manualImport?.nextInternalAction ?? "Keep manual revenue, traffic, content, and conversion import fields ready.",
      ready: analyticsReady || manualImport?.readinessStatus === "ready",
      reason: `Manual import remains the safe fallback until read-only analytics connectors are owner-approved. ${manualImport ? `${manualImport.readyStores}/${manualImport.requiredStores} manual import boundary record${manualImport.requiredStores === 1 ? "" : "s"} ready.` : ""}`.trim(),
      status: connectionStatusFromReady({
        blocked: manualImport?.readinessStatus === "blocked",
        ready: analyticsReady || manualImport?.readinessStatus === "ready",
        review: manualImport?.readinessStatus === "partial",
        watch: true
      })
    },
    {
      category: "ads",
      label: "Ads",
      nextInternalAction: "Keep paid spend locked; only prepare advisory growth tests after organic proof.",
      ready: false,
      reason: "Ad spend is intentionally locked behind owner approval and Financial Orchestrator review.",
      status: "approval_required"
    }
  ];

  return checks;
}

function buildApprovalGates(input: {
  firstBusinessLaunchPlan?: RevenueFirstBusinessLaunchPlan | null;
  firstBusinessExecutionPlan?: RevenueFirstBusinessExecutionPlan | null;
  firstCashPlan?: RevenueFirstCashReadinessPlan | null;
  launchItem: RevenueLaunchReadinessItem | null;
}) {
  return unique([
    ...(input.firstBusinessLaunchPlan?.launchPackage?.manualApprovalGates ?? []),
    ...(input.launchItem?.blockers.map((blocker) => blocker.title) ?? []),
    ...(input.firstCashPlan?.topCandidate?.blockers.map((blocker) => blocker.title) ?? []),
    "Owner approval required before provider calls, uploads, publishing, ad spend, payments, payouts, marketplace changes, browser actions, or external API writes."
  ]).slice(0, 8);
}

function checklistStatusFromAction(action: RevenuePortfolioDashboardNextAction): RevenuePortfolioDashboardDailyChecklistItem["status"] {
  if (action.recommendation === "kill" || action.recommendation === "pause") return "blocked";
  if (action.recommendation === "scale") return "approval_required";

  return "watch";
}

function buildDailyChecklist(input: {
  dashboardNextActions: RevenuePortfolioDashboardNextAction[];
  firstBusinessLaunchPlan?: RevenueFirstBusinessLaunchPlan | null;
  firstCashPlan?: RevenueFirstCashReadinessPlan | null;
  hundredStoreOperationsPlan?: RevenueHundredStoreOperationsPlan | null;
  launchReadinessPlan?: RevenueLaunchReadinessPlan | null;
}): RevenuePortfolioDashboardDailyChecklistItem[] {
  const top = input.firstCashPlan?.topCandidate ?? null;
  const topLaunch = input.firstBusinessLaunchPlan?.topCandidate ?? null;
  const firstReadyStep = input.hundredStoreOperationsPlan?.dailyOperatingLoop.steps.find((step) => step.status === "ready")
    ?? input.hundredStoreOperationsPlan?.dailyOperatingLoop.steps[0]
    ?? null;
  const items: RevenuePortfolioDashboardDailyChecklistItem[] = [];

  if (top) {
    items.push({
      evidence: top.summary,
      nextInternalAction: top.nextAction.action,
      status: top.manualLaunchReady ? "approval_required" : top.status === "blocked" ? "blocked" : "watch",
      title: top.nextAction.title
    });
  }

  if (topLaunch) {
    items.push({
      evidence: topLaunch.summary,
      nextInternalAction: topLaunch.nextInternalAction,
      status: topLaunch.status === "ready_internal" ? "ready" : topLaunch.status === "manual_gate" ? "approval_required" : topLaunch.status === "blocked" ? "blocked" : "watch",
      title: "First business launch path"
    });
  }

  for (const queueItem of input.launchReadinessPlan?.queue.slice(0, 2) ?? []) {
    items.push({
      evidence: queueItem.summary,
      nextInternalAction: queueItem.action,
      status: queueItem.readinessScore >= 70 ? "ready" : "watch",
      title: queueItem.storeName
    });
  }

  if (firstReadyStep) {
    items.push({
      evidence: firstReadyStep.reason,
      nextInternalAction: firstReadyStep.endpoint,
      status: firstReadyStep.status === "ready" ? "ready" : firstReadyStep.status === "approval_required" ? "approval_required" : firstReadyStep.status === "blocked" ? "blocked" : "watch",
      title: firstReadyStep.title
    });
  }

  for (const action of input.dashboardNextActions.slice(0, 2)) {
    items.push({
      evidence: action.reason,
      nextInternalAction: action.actionLabel,
      status: checklistStatusFromAction(action),
      title: `${action.recommendation} ${action.assetName}`
    });
  }

  return items.slice(0, 8);
}

function firstStoreStatus(input: {
  approvalGates: string[];
  connectionChecks: RevenuePortfolioDashboardConnectionCheck[];
  firstBusinessLaunchPlan?: RevenueFirstBusinessLaunchPlan | null;
  firstCashPlan?: RevenueFirstCashReadinessPlan | null;
}) : RevenuePortfolioDashboardFirstStoreCashLoop["status"] {
  const top = input.firstCashPlan?.topCandidate ?? null;

  if (top?.status === "cash_active") return "cash_active";
  if (top?.status === "blocked" || (input.firstBusinessLaunchPlan?.totals.blocked ?? 0) > 0) return "blocked";
  if (!top || top.status === "needs_products") return "needs_products";
  if (input.connectionChecks.some((check) => !check.ready && check.status === "missing")) return "needs_connections";
  if (input.approvalGates.length > 0 || input.connectionChecks.some((check) => check.status === "approval_required")) return "needs_approval";
  if ((input.firstBusinessLaunchPlan?.totals.readyInternal ?? 0) > 0 || top.manualLaunchReady) return "ready_to_launch";

  return "watch";
}

function recommendationFromPressure(input: {
  fallback: RevenueAssetRotationDecision | null;
  killPressure: number;
  scalePressure: number;
}): RevenueAssetRotationDecision | "launch" {
  if (input.killPressure >= 70) return "kill";
  if (input.killPressure >= 45) return "pause";
  if (input.scalePressure >= 70) return "scale";
  if (input.fallback) return input.fallback;
  if (input.scalePressure > 0 || input.killPressure > 0) return "watch";

  return "launch";
}

function dailyRevenueLoopActions(input: {
  dashboardTopAction: RevenuePortfolioDashboardNextAction | null;
  decision: RevenuePortfolioDashboardDailyRevenueLoop["decision"]["recommendation"];
  finalExecution: RevenueFirstBusinessExecutionPlan | null;
  financialPlan?: FinancialOrchestratorPlan | null;
  hundredStoreOperationsPlan?: RevenueHundredStoreOperationsPlan | null;
  killPressure: number;
  scalePressure: number;
}): RevenuePortfolioDashboardDailyRevenueLoopAction[] {
  const product = input.finalExecution?.listingProductPack[0] ?? null;
  const content = input.finalExecution?.launchHandoffPacket.contentCalendar[0] ?? null;
  const scalingPacket = input.financialPlan?.scalingBudgetQueue[0] ?? null;
  const growthRoute = input.hundredStoreOperationsPlan?.growthAllocationRouter.candidates[0] ?? null;
  const actions: RevenuePortfolioDashboardDailyRevenueLoopAction[] = [];

  actions.push(product
    ? {
      detail: `${product.productType} at $${product.retailPrice.toFixed(2)} with ${product.profitMargin}% target margin and ${product.seoKeywords.length} SEO keyword${product.seoKeywords.length === 1 ? "" : "s"} ready for review.`,
      lane: "product",
      nextInternalAction: "review_listing_product_pack",
      status: "approval_required",
      title: `Review ${product.listingTitle}`
    }
    : {
      detail: input.dashboardTopAction?.reason ?? "No listing-ready product is attached to the first-store packet yet.",
      lane: "product",
      nextInternalAction: input.dashboardTopAction?.actionLabel ?? "build_first_listing_pack",
      status: input.dashboardTopAction ? checklistStatusFromAction(input.dashboardTopAction) : "watch",
      title: input.dashboardTopAction ? `${input.dashboardTopAction.recommendation} ${input.dashboardTopAction.assetName}` : "Build first listing pack"
    });

  actions.push(content
    ? {
      detail: `${content.channel.replace(/_/g, " ")} draft is ready internally: ${content.hook}`,
      lane: "content",
      nextInternalAction: "review_first_week_content_calendar",
      status: "approval_required",
      title: "Review first organic content draft"
    }
    : {
      detail: "Create the first organic content proof before any paid growth test.",
      lane: "content",
      nextInternalAction: "prepare_first_week_content_calendar",
      status: "watch",
      title: "Prepare first organic content proof"
    });

  const advisorySplit = `${input.financialPlan?.splitPolicy.adGrowthPercent ?? 25}/${input.financialPlan?.splitPolicy.entralOperationsPercent ?? 25}/${input.financialPlan?.splitPolicy.ownerPercent ?? 50}`;
  const decisionDetail = `scalePressure ${input.scalePressure}/100 and killPressure ${input.killPressure}/100; ${advisorySplit} allocation is advisory only, with no spend, payout, provider work, upload, publishing, marketplace change, browser action, or external write authorized.`;
  const growthAction: RevenuePortfolioDashboardDailyRevenueLoopAction = (() => {
    if (input.decision === "scale") {
      return {
        detail: scalingPacket
          ? `${decisionDetail} Review the internal ${scalingPacket.allocationLane.replace(/_/g, " ")} packet for ${scalingPacket.assetName} at $${scalingPacket.amount.toFixed(2)} before any owner-approved scale action.`
          : `${decisionDetail} Prepare an owner-gated scale review only after first-store proof and clone packet readiness are visible.`,
        lane: "growth",
        nextInternalAction: scalingPacket ? "review_financial_scaling_budget_packet" : growthRoute?.nextInternalAction ?? "prepare_owner_gated_scale_review",
        status: "approval_required",
        title: scalingPacket ? `Review owner-gated scale packet for ${scalingPacket.assetName}` : "Review owner-gated scale path"
      };
    }

    if (input.decision === "kill") {
      return {
        detail: `${decisionDetail} Freeze growth work, preserve the evidence trail, and prepare an internal rollback/archive review before the asset consumes more cash or attention.`,
        lane: "growth",
        nextInternalAction: "prepare_internal_kill_or_rollback_review",
        status: "blocked",
        title: "Freeze growth and prepare kill review"
      };
    }

    if (input.decision === "pause") {
      return {
        detail: `${decisionDetail} Pause growth changes, repair weak listing/content/signal inputs, and require owner review before restarting scale activity.`,
        lane: "growth",
        nextInternalAction: "prepare_internal_pause_repair_review",
        status: "blocked",
        title: "Pause growth and repair signal gaps"
      };
    }

    if (input.decision === "launch") {
      return {
        detail: `${decisionDetail} Launch remains manual-only through the first-store owner approval packet; keep paid growth held until live evidence exists.`,
        lane: "growth",
        nextInternalAction: "review_owner_manual_launch_approval",
        status: "approval_required",
        title: "Review manual launch approval before growth"
      };
    }

    return growthRoute
      ? {
        detail: `${decisionDetail} ${growthRoute.businessName} is routed ${growthRoute.allocationLane.replace(/_/g, " ")} with ${growthRoute.adGrowthBucketSharePercent}% of advisory Ad/Growth priority.`,
        lane: "growth",
        nextInternalAction: growthRoute.nextInternalAction,
        status: growthRoute.allocationLane === "paid_scale_review" || growthRoute.allocationLane === "defensive_hold" ? "approval_required" : "watch",
        title: `Watch ${growthRoute.businessName} growth route`
      }
      : {
        detail: `${decisionDetail} Continue manual revenue, traffic, conversion, and content-response capture before changing the growth posture.`,
        lane: "growth",
        nextInternalAction: "continue_daily_first_store_signal_capture",
        status: "watch",
        title: "Watch daily signals before growth"
      };
  })();

  actions.push(growthAction);

  return actions;
}

function buildDailyRevenueLoop(input: {
  dashboardTopAction: RevenuePortfolioDashboardNextAction | null;
  finalExecution: RevenueFirstBusinessExecutionPlan | null;
  financialPlan?: FinancialOrchestratorPlan | null;
  hundredStoreOperationsPlan?: RevenueHundredStoreOperationsPlan | null;
  kpis: RevenuePortfolioDashboardPlan["kpis"];
  manualSignalReceipts?: number;
  tenStoreFleetPlan?: RevenueBusinessFleetPlan | null;
}): RevenuePortfolioDashboardDailyRevenueLoop {
  const manualSnapshots = Math.max(input.manualSignalReceipts ?? 0, input.hundredStoreOperationsPlan?.monitoringMatrix.totals.manualSnapshots ?? 0);
  const performanceSnapshots = input.financialPlan?.totals.snapshots ?? input.kpis.performanceSnapshots;
  const trackedAssets = input.financialPlan?.portfolioSignal.trackedAssets ?? input.kpis.trackedAssets;
  const scalePressure = input.financialPlan?.portfolioSignal.scalePressure.pressureScore
    ?? input.tenStoreFleetPlan?.sourceSignals.financialScalePressure
    ?? input.hundredStoreOperationsPlan?.growthAllocationRouter.totals.averageScalePressure
    ?? 0;
  const killPressure = input.financialPlan?.portfolioSignal.killPressure.pressureScore
    ?? input.tenStoreFleetPlan?.sourceSignals.financialKillPressure
    ?? input.hundredStoreOperationsPlan?.growthAllocationRouter.totals.averageKillPressure
    ?? 0;
  const signalStatus: RevenuePortfolioDashboardDailyRevenueLoop["signalIngest"]["status"] = performanceSnapshots > 0 || manualSnapshots > 0
    ? "ready"
    : trackedAssets > 0 ? "watch" : "missing";
  const recommendation = recommendationFromPressure({
    fallback: input.dashboardTopAction?.recommendation ?? null,
    killPressure,
    scalePressure
  });

  return {
    advisoryAllocation: {
      adGrowthAmount: input.financialPlan?.totals.adGrowthAmount ?? 0,
      adGrowthPercent: input.financialPlan?.splitPolicy.adGrowthPercent ?? 25,
      entralOperationsAmount: input.financialPlan?.totals.entralOperationsAmount ?? 0,
      entralOperationsPercent: input.financialPlan?.splitPolicy.entralOperationsPercent ?? 25,
      guardrail: input.financialPlan?.adGrowthAllocation.pressureDecision.guardrail
        ?? "Ad/Growth allocation is advisory only; no spend, provider work, payout, or money movement is authorized.",
      mode: input.financialPlan?.adGrowthAllocation.mode ?? "unavailable",
      ownerIncomeAmount: input.financialPlan?.totals.ownerAmount ?? 0,
      ownerIncomePercent: input.financialPlan?.splitPolicy.ownerPercent ?? 50,
      reserveHeld: input.financialPlan?.totals.reserveHeld ?? 0,
      scalingBudgetPackets: input.financialPlan?.totals.scalingBudgetPackets ?? 0,
      status: input.financialPlan?.splitPolicy.status ?? "unavailable"
    },
    decision: {
      killPressure,
      posture: input.financialPlan?.advisoryContext.posture ?? (input.finalExecution ? "launch_review" : "watch"),
      reason: input.financialPlan?.portfolioSignal.reason
        ?? input.dashboardTopAction?.reason
        ?? "Capture first-store signals before changing scale, watch, pause, or kill posture.",
      recommendation,
      scalePressure
    },
    nextActions: dailyRevenueLoopActions({
      dashboardTopAction: input.dashboardTopAction,
      decision: recommendation,
      finalExecution: input.finalExecution,
      financialPlan: input.financialPlan,
      hundredStoreOperationsPlan: input.hundredStoreOperationsPlan,
      killPressure,
      scalePressure
    }),
    signalIngest: {
      manualSnapshots,
      performanceSnapshots,
      source: input.financialPlan ? "financial_orchestrator" : "portfolio_dashboard",
      status: signalStatus,
      summary: signalStatus === "ready"
        ? `${performanceSnapshots} performance snapshot${performanceSnapshots === 1 ? "" : "s"} and ${manualSnapshots} manual import snapshot${manualSnapshots === 1 ? "" : "s"} are available for the daily revenue loop.`
        : signalStatus === "watch"
          ? `${trackedAssets} tracked asset${trackedAssets === 1 ? "" : "s"} need manual revenue, traffic, content, or conversion snapshots.`
          : "No revenue-loop signal snapshots are available yet.",
      trackedAssets
    }
  };
}

function launchEvidenceRequiredProof(category: RevenuePortfolioDashboardLaunchEvidenceCategory, finalExecution: RevenueFirstBusinessExecutionPlan | null) {
  const storeName = finalExecution?.finalExecutionPacket.store.businessName ?? "the first store";
  const productName = finalExecution?.listingProductPack[0]?.productName ?? "the first product";

  switch (category) {
    case "storefront":
      return [
        `${storeName} storefront, collection, policies, navigation, and unpublished product placement are manually reviewed.`,
        "Record a manual note or screenshot reference; ENTRAL does not open the storefront or publish anything."
      ];
    case "pod_supplier":
      return [
        `${productName} POD supplier, blueprint, variant, mockup, shipping, and base-cost assumptions are manually reviewed.`,
        "Record the supplier readiness proof only; no provider call, upload, product creation, or order is authorized."
      ];
    case "payments_payouts":
      return [
        "Payment processor readiness, tax/fee assumptions, payout destination, and refund path are manually reviewed.",
        "Record readiness evidence only; no payment setup, card charge, payout, transfer, or banking action is authorized."
      ];
    case "content_channels":
      return [
        "Organic channel handles, posting permissions, first-week content drafts, and manual publishing owner are reviewed.",
        "Record channel readiness only; no post, upload, browser action, or social account change is authorized."
      ];
    case "analytics_manual_import":
      return [
        "Manual signal sheet fields for visits, units, revenue, profit, content views, saves/shares, and conversion notes are ready.",
        "Record the import method only; no analytics connector write or external API action is authorized."
      ];
    case "ads":
      return [
        "Ad creative, spend cap, audience, and kill switch require a separate owner ad-spend approval.",
        "Ads are not required before first-week manual signal capture and remain locked until explicit owner approval."
      ];
  }
}

function buildManualLaunchEvidenceChecklist(input: {
  finalExecution: RevenueFirstBusinessExecutionPlan | null;
  launchEvidenceCoverage?: RevenuePortfolioDashboardLaunchEvidenceCoverage | null;
}): RevenuePortfolioDashboardManualLaunchPacket["launchEvidenceChecklist"] {
  const recordedCategories = input.launchEvidenceCoverage?.recordedCategories ?? [];

  return requiredCashLoopConnectionCategories.map((category) => {
    const requiredForFirstSignal = requiredFirstStoreLaunchEvidenceCategories.includes(category);
    const recorded = recordedCategories.includes(category);
    const status: RevenuePortfolioDashboardManualLaunchPacket["launchEvidenceChecklist"][number]["status"] = category === "ads"
      ? "approval_required"
      : recorded ? "recorded" : "missing";

    return {
      blockedExternalActions: cashLoopLockedExternalActions,
      category,
      nextInternalAction: status === "recorded"
        ? `maintain_${category}_launch_evidence_receipt`
        : category === "ads"
          ? "hold_ads_until_owner_ad_spend_approval"
          : `record_${category}_manual_launch_evidence`,
      ownerApprovalRequired: status !== "recorded",
      requiredForFirstSignal,
      requiredProof: launchEvidenceRequiredProof(category, input.finalExecution),
      status,
      title: `${launchEvidenceCategoryLabel(category)} launch evidence`
    };
  });
}

function buildManualLaunchPacket(
  finalExecution: RevenueFirstBusinessExecutionPlan | null,
  launchEvidenceCoverage?: RevenuePortfolioDashboardLaunchEvidenceCoverage | null
): RevenuePortfolioDashboardManualLaunchPacket {
  if (!finalExecution) {
    return {
      auditTrail: [],
      contentPlan: [],
      externalExecution: false,
      listing: {
        bullets: [],
        description: "No final execution packet is available yet.",
        seoKeywords: [],
        title: "Waiting for final execution packet"
      },
      launchEvidenceChecklist: buildManualLaunchEvidenceChecklist({
        finalExecution,
        launchEvidenceCoverage
      }),
      manualSteps: [],
      organicFirstWeek: [],
      product: null,
      providerContacted: false,
      rollbackPlan: [
        "Keep storefront, provider, marketplace, content, ad, browser, payment, and payout actions locked.",
        "Return to first-business final execution review before any launch work."
      ],
      semiAutomatedSteps: [],
      status: "waiting_for_final_execution_packet",
      store: null,
      supplier: {
        estimatedBaseCost: 0,
        provider: "Other",
        steps: ["Select a POD supplier internally after the final execution packet is ready."],
        status: "waiting"
      }
    };
  }

  const product = finalExecution.listingProductPack[0] ?? null;
  const averageRetail = finalExecution.listingProductPack.length > 0
    ? finalExecution.listingProductPack.reduce((sum, item) => sum + item.retailPrice, 0) / finalExecution.listingProductPack.length
    : 35;
  const supplierProvider: "Printify" = "Printify";
  const supplierStatus = finalExecution.status === "ready_to_launch_first_business"
    ? "selected_internal_owner_gated"
    : "blocked";

  return {
    auditTrail: finalExecution.auditEvents.slice(0, 5),
    contentPlan: finalExecution.launchHandoffPacket.contentCalendar.slice(0, 7).map((item) => ({
      channel: item.channel,
      hook: item.hook,
      status: item.status
    })),
    externalExecution: false,
    listing: {
      bullets: product?.listingBullets.slice(0, 5) ?? [],
      description: product?.listingDescription ?? finalExecution.launchHandoffPacket.summary,
      seoKeywords: product?.seoKeywords.slice(0, 8) ?? [],
      title: product?.listingTitle ?? `${finalExecution.finalExecutionPacket.store.businessName} first approved product`
    },
    launchEvidenceChecklist: buildManualLaunchEvidenceChecklist({
      finalExecution,
      launchEvidenceCoverage
    }),
    manualSteps: finalExecution.manualLaunchRunbook.map((step) => step.title).slice(0, 8),
    organicFirstWeek: finalExecution.firstWeekTrackingPlan.checkIns.map((checkIn) => ({
      day: checkIn.day,
      evidence: checkIn.requiredEvidence,
      title: checkIn.title
    })),
    product: product
      ? {
        marginPercent: product.profitMargin,
        name: product.productName,
        retailPrice: product.retailPrice,
        storefrontCollection: product.storefrontCollection,
        type: product.productType
      }
      : null,
    providerContacted: false,
    rollbackPlan: [
      "Pause storefront/product/content/ad execution before any external change.",
      "Archive internal draft payloads and keep all provider request manifests unsent.",
      "Keep payment, payout, and ad spend locked until owner approval."
    ],
    semiAutomatedSteps: finalExecution.semiAutomatedPreparationQueue.map((step) => step.title).slice(0, 8),
    status: finalExecution.launchHandoffPacket.status,
    store: {
      name: finalExecution.finalExecutionPacket.store.businessName,
      platform: finalExecution.finalExecutionPacket.store.storePlatform
    },
    supplier: {
      estimatedBaseCost: money(Math.max(8, averageRetail * 0.36)),
      provider: supplierProvider,
      steps: [
        `Review ${supplierProvider} internally as the first POD supplier candidate.`,
        "Confirm account, catalog, blueprint, shipping, production, and mockup requirements before approval.",
        "Prepare product payload rows only; do not create products, upload artwork, place orders, or contact the provider.",
        "Require explicit owner live approval before supplier credentials, provider calls, uploads, or order actions."
      ],
      status: supplierStatus
    }
  };
}

function buildFirstWeekSignalCaptureChecklist(input: {
  finalExecution: RevenueFirstBusinessExecutionPlan | null;
  firstWeekSignalCoverage?: RevenuePortfolioDashboardFirstWeekSignalCoverage | null;
  status: RevenuePortfolioDashboardFirstWeekRevenueLoop["status"];
}): RevenuePortfolioDashboardFirstWeekRevenueLoop["signalCaptureChecklist"] {
  if (!input.finalExecution) return [];

  const metricFields = input.finalExecution.firstWeekTrackingPlan.metricFields.map((field) => field.label);
  const recordedDays = input.firstWeekSignalCoverage?.recordedDays ?? [];
  const rotationRecommendation = input.firstWeekSignalCoverage?.rotationRecommendation ?? null;
  const rotationRecommendationRecorded = input.firstWeekSignalCoverage?.rotationRecommendationRecorded ?? false;

  return input.finalExecution.firstWeekTrackingPlan.checkIns.map((checkIn) => {
    const day = checkIn.day;
    const recorded = recordedDays.includes(day);
    const rotationRecommendationRequired = day === 7;
    const status: RevenuePortfolioDashboardFirstWeekRevenueLoop["signalCaptureChecklist"][number]["status"] = input.status !== "ready_for_manual_signal_capture"
      ? "waiting_for_launch"
      : rotationRecommendationRequired && recorded && !rotationRecommendationRecorded
        ? "needs_rotation_recommendation"
        : recorded ? "recorded" : "missing";

    return {
      blockedExternalActions: cashLoopLockedExternalActions,
      day,
      nextInternalAction: status === "recorded"
        ? `maintain_day_${day}_manual_signal_receipt`
        : status === "needs_rotation_recommendation"
          ? "record_day_7_scale_watch_pause_kill_recommendation"
          : status === "waiting_for_launch"
            ? `complete_launch_evidence_before_day_${day}_signals`
            : `record_day_${day}_manual_signal_snapshot`,
      recorded,
      requiredEvidence: rotationRecommendationRequired
        ? unique([...checkIn.requiredEvidence, "Day 7 scale/watch/pause/kill recommendation"])
        : checkIn.requiredEvidence,
      requiredFields: rotationRecommendationRequired
        ? unique([...metricFields, "Scale/watch/pause/kill recommendation"])
        : metricFields,
      rotationRecommendation: rotationRecommendationRequired ? rotationRecommendation : null,
      rotationRecommendationRequired,
      status,
      title: checkIn.title
    };
  });
}

function buildFirstWeekRevenueLoop(
  finalExecution: RevenueFirstBusinessExecutionPlan | null,
  firstWeekSignalCoverage?: RevenuePortfolioDashboardFirstWeekSignalCoverage | null
): RevenuePortfolioDashboardFirstWeekRevenueLoop {
  if (!finalExecution) {
    return {
      checkIns: [],
      externalExecution: false,
      metricFields: [],
      providerContacted: false,
      rotationReview: {
        day: 7,
        inputs: [],
        nextInternalAction: "prepare_final_execution_packet",
        output: "feed_revenue_engine_scale_watch_pause_kill"
      },
      signalCaptureChecklist: [],
      status: "waiting_for_final_execution_packet",
      summary: "First-week manual signal capture is waiting for an approved final execution packet."
    };
  }

  const status: RevenuePortfolioDashboardFirstWeekRevenueLoop["status"] = finalExecution.status === "ready_to_launch_first_business"
    ? "ready_for_manual_signal_capture"
    : "blocked";
  const checkInStatus: RevenuePortfolioDashboardFirstWeekRevenueLoop["checkIns"][number]["status"] = status === "ready_for_manual_signal_capture"
    ? "ready_manual_capture"
    : "waiting_for_launch";
  const metricCount = finalExecution.firstWeekTrackingPlan.metricFields.length;
  const checkInCount = finalExecution.firstWeekTrackingPlan.checkIns.length;

  return {
    checkIns: finalExecution.firstWeekTrackingPlan.checkIns.map((checkIn) => ({
      day: checkIn.day,
      requiredEvidence: checkIn.requiredEvidence,
      status: checkInStatus,
      title: checkIn.title
    })),
    externalExecution: false,
    metricFields: finalExecution.firstWeekTrackingPlan.metricFields,
    providerContacted: false,
    rotationReview: {
      ...finalExecution.firstWeekTrackingPlan.rotationReview,
      nextInternalAction: "record_manual_first_week_signals"
    },
    signalCaptureChecklist: buildFirstWeekSignalCaptureChecklist({
      finalExecution,
      firstWeekSignalCoverage,
      status
    }),
    status,
    summary: status === "ready_for_manual_signal_capture"
      ? `${finalExecution.finalExecutionPacket.store.businessName} has ${metricCount} manual metric field${metricCount === 1 ? "" : "s"} and ${checkInCount} first-week check-in${checkInCount === 1 ? "" : "s"} ready to feed scale/watch/pause/kill review.`
      : `${finalExecution.finalExecutionPacket.store.businessName} first-week revenue loop is blocked until the launch packet is ready.`
  };
}

function buildOwnerLaunchApprovalPacket(input: {
  approvalGates: string[];
  connectionChecks: RevenuePortfolioDashboardConnectionCheck[];
  finalExecution: RevenueFirstBusinessExecutionPlan | null;
  firstWeekRevenueLoop: RevenuePortfolioDashboardFirstWeekRevenueLoop;
  manualLaunchPacket: RevenuePortfolioDashboardManualLaunchPacket;
}): RevenuePortfolioDashboardOwnerLaunchApprovalPacket {
  if (!input.finalExecution) {
    return {
      approvalMode: "manual_live_launch_review",
      approvalPhrase: "APPROVE FIRST STORE MANUAL LIVE LAUNCH",
      auditTrail: [],
      blockedExternalActions: [
        "Storefront, provider, marketplace, content, ad, browser, payment, payout, banking, and external API writes remain locked."
      ],
      externalExecution: false,
      liveApprovalRequired: true,
      manualOnlyActions: [],
      preflightChecks: [{
        detail: "Approve the final execution packet before owner launch review can happen.",
        status: "blocked",
        title: "Final execution packet"
      }],
      providerContacted: false,
      rollbackPlan: [
        "Keep all live launch surfaces locked.",
        "Return to first-business execution packet review."
      ],
      status: "waiting_for_final_execution_packet",
      summary: "Owner launch approval is waiting for a final execution packet.",
      unlockBoundary: {
        nextInternalAction: "prepare_final_execution_packet",
        stillLocked: [
          "Provider calls, uploads, publishing, ad spend, payments, payouts, marketplace changes, browser actions, and external API writes"
        ],
        unlocks: []
      }
    };
  }

  const blockingConnections = input.connectionChecks.filter((check) => check.status === "blocked" || check.status === "missing");
  const status: RevenuePortfolioDashboardOwnerLaunchApprovalPacket["status"] = input.finalExecution.status !== "ready_to_launch_first_business" || blockingConnections.length > 0
    ? "blocked"
    : "ready_for_owner_review";
  const connectionPreflight: RevenuePortfolioDashboardOwnerLaunchApprovalPacket["preflightChecks"] = input.connectionChecks.map((check) => {
    const preflightStatus: RevenuePortfolioDashboardOwnerLaunchApprovalPacket["preflightChecks"][number]["status"] = check.status === "missing"
      ? "blocked"
      : check.status;

    return {
      detail: check.reason,
      status: preflightStatus,
      title: check.label
    };
  });
  const manualOnlyActions = input.manualLaunchPacket.manualSteps.slice(0, 6).map((step): RevenuePortfolioDashboardOwnerLaunchApprovalPacket["manualOnlyActions"][number] => ({
    detail: "Manual operator action only; no provider, marketplace, browser, upload, social, ad, payment, payout, or external API action is authorized by this packet.",
    status: status === "ready_for_owner_review" ? "ready_for_owner_review" : "blocked",
    title: step
  }));
  const auditTrail = unique([
    ...input.finalExecution.auditEvents,
    ...input.manualLaunchPacket.auditTrail,
    "Owner launch approval packet assembled for internal review only."
  ]).slice(0, 6);
  const blockedExternalActions = unique([
    ...input.finalExecution.blockedExternalActions,
    ...input.manualLaunchPacket.rollbackPlan,
    "Provider calls, uploads, publishing, ad spend, payments, payouts, marketplace changes, browser actions, and external API writes remain locked until separate explicit owner approval."
  ]);
  type OwnerLaunchPreflightCheck = RevenuePortfolioDashboardOwnerLaunchApprovalPacket["preflightChecks"][number];
  const readinessGatePreflight: OwnerLaunchPreflightCheck = {
    detail: input.finalExecution.firstLaunchReadinessGate.summary,
    status: input.finalExecution.firstLaunchReadinessGate.status === "ready_for_manual_launch_approval" ? "ready" : "blocked",
    title: input.finalExecution.firstLaunchReadinessGate.label
  };
  const approvalGatePreflight: OwnerLaunchPreflightCheck = {
    detail: input.approvalGates.join(" / ") || "No additional approval gates are currently attached.",
    status: input.approvalGates.length > 0 ? "approval_required" : "ready",
    title: "Owner approval gates"
  };
  const firstWeekPreflight: OwnerLaunchPreflightCheck = {
    detail: input.firstWeekRevenueLoop.summary,
    status: input.firstWeekRevenueLoop.status === "ready_for_manual_signal_capture" ? "ready" : input.firstWeekRevenueLoop.status === "blocked" ? "blocked" : "watch",
    title: "First-week manual signal ledger"
  };
  const preflightChecks: RevenuePortfolioDashboardOwnerLaunchApprovalPacket["preflightChecks"] = [
    readinessGatePreflight,
    approvalGatePreflight,
    ...connectionPreflight,
    firstWeekPreflight
  ].slice(0, 10);

  return {
    approvalMode: "manual_live_launch_review",
    approvalPhrase: "APPROVE FIRST STORE MANUAL LIVE LAUNCH",
    auditTrail,
    blockedExternalActions,
    externalExecution: false,
    liveApprovalRequired: true,
    manualOnlyActions,
    preflightChecks,
    providerContacted: false,
    rollbackPlan: input.manualLaunchPacket.rollbackPlan,
    status,
    summary: status === "ready_for_owner_review"
      ? `${input.finalExecution.finalExecutionPacket.store.businessName} is ready for owner manual live launch review. Approval unlocks only operator-run manual launch steps; external automation, spend, payouts, provider writes, browser work, and API writes remain locked.`
      : `${input.finalExecution.finalExecutionPacket.store.businessName} owner launch review is blocked by ${blockingConnections.length} missing or blocked preflight connection${blockingConnections.length === 1 ? "" : "s"}.`,
    unlockBoundary: {
      nextInternalAction: status === "ready_for_owner_review"
        ? "record_owner_manual_launch_review"
        : "repair_owner_launch_preflight",
      stillLocked: [
        "Provider account creation, provider API calls, product uploads, mockup uploads, supplier orders, marketplace publishing, storefront publishing, social posting, browser automation, ad spend, payment setup, card charges, payouts, banking, and external API writes",
        "Any automatic clone, scale, paid growth, or payout action after first launch"
      ],
      unlocks: status === "ready_for_owner_review"
        ? [
          "Operator may manually execute approved store/product/listing/content steps outside ENTRAL after explicit live approval.",
          "Operator may manually record first-week revenue, profit, traffic, and content evidence back into ENTRAL."
        ]
        : []
    }
  };
}

function resolveFirstStoreTarget(input: {
  finalExecution: RevenueFirstBusinessExecutionPlan | null;
  launchItem: RevenueLaunchReadinessItem | null;
  top: RevenueFirstCashReadinessPlan["topCandidate"] | null;
}): { storeId: string | null; storeName: string | null } {
  const storeId = input.top?.storeId
    ?? input.launchItem?.store.id
    ?? input.finalExecution?.finalExecutionPacket.store.sourceStoreId
    ?? null;
  const storeName = input.top?.storeName
    ?? input.launchItem?.store.businessName
    ?? input.finalExecution?.finalExecutionPacket.store.businessName
    ?? null;

  return { storeId, storeName };
}

function buildFirstStoreRevenueProof(input: {
  dailyRevenueLoop: RevenuePortfolioDashboardDailyRevenueLoop;
  evidenceLedger: RevenuePortfolioDashboardCashLoopEvidenceLedger;
  portfolio: RevenueAssetPortfolio;
  storeId: string | null;
  storeName: string | null;
}): RevenuePortfolioDashboardFirstStoreRevenueProof {
  const storeAsset = input.storeId
    ? input.portfolio.assets.find((asset) => asset.assetType === "store" && (asset.assetId === input.storeId || asset.storeId === input.storeId)) ?? null
    : null;
  const grossRevenue = money(storeAsset?.performance?.grossRevenue ?? storeAsset?.economics.revenue ?? 0);
  const netProfit = money(storeAsset?.performance?.netProfit ?? (grossRevenue > 0 ? storeAsset?.economics.estimatedProfit ?? 0 : 0));
  const revenueVelocity = money(storeAsset?.performance?.revenueVelocity ?? 0);
  const snapshots = storeAsset?.performance?.snapshots ?? 0;
  const evidenceGrade = storeAsset?.performance?.evidenceGrade ?? "none";
  const manualSignalReceipts = input.evidenceLedger.selectedStore.totals.manualSignals;
  const firstRevenueCaptured = Boolean(input.storeId && grossRevenue > 0 && manualSignalReceipts > 0);
  const status: RevenuePortfolioDashboardFirstStoreRevenueProof["status"] = !input.storeId
    ? "waiting_for_store"
    : storeAsset?.riskLevel === "high" && storeAsset.recommendation === "kill"
      ? "blocked"
      : firstRevenueCaptured
        ? "proven"
        : manualSignalReceipts <= 0 ? "waiting_for_signal" : "waiting_for_revenue";
  const evidence = [
    input.storeId
      ? `${input.storeName ?? input.storeId} is the selected first-store target.`
      : "No selected first-store target is available.",
    `${money(grossRevenue)} gross revenue, ${money(netProfit)} net profit, and ${money(revenueVelocity)}/day revenue velocity are scoped to the selected first store.`,
    `${snapshots} store performance snapshot${snapshots === 1 ? "" : "s"} and ${manualSignalReceipts} manual signal receipt${manualSignalReceipts === 1 ? "" : "s"} are visible.`,
    `Evidence grade is ${evidenceGrade}; daily loop recommendation is ${input.dailyRevenueLoop.decision.recommendation}.`
  ];
  const nextInternalAction = status === "proven"
    ? netProfit > 0 ? "review_proven_winner_scale_gate" : "continue_daily_first_store_profit_capture"
    : status === "waiting_for_signal" ? "record_manual_first_week_signals"
      : status === "waiting_for_revenue" ? input.dailyRevenueLoop.nextActions[0]?.nextInternalAction ?? "continue_daily_first_store_signal_capture"
        : status === "blocked" ? "repair_first_store_revenue_blockers" : "select_first_store_cash_target";

  return {
    evidence,
    evidenceGrade,
    externalExecution: false,
    firstRevenueCaptured,
    grossRevenue,
    manualSignalReceipts,
    netProfit,
    nextInternalAction,
    providerContacted: false,
    revenueVelocity,
    snapshots,
    status,
    storeId: input.storeId,
    storeName: input.storeName,
    summary: firstRevenueCaptured
      ? `${input.storeName ?? "The first store"} has store-scoped first revenue proof: ${money(grossRevenue)} gross revenue, ${money(netProfit)} net profit, ${manualSignalReceipts} manual signal receipt${manualSignalReceipts === 1 ? "" : "s"}, and ${snapshots} store snapshot${snapshots === 1 ? "" : "s"}. External execution remains locked.`
      : `${input.storeName ?? "The first store"} still needs store-scoped first revenue proof: ${money(grossRevenue)} gross revenue, ${manualSignalReceipts} manual signal receipt${manualSignalReceipts === 1 ? "" : "s"}, and ${snapshots} store snapshot${snapshots === 1 ? "" : "s"} are visible. External execution remains locked.`
  };
}

function buildRevenueMilestonePath(input: {
  firstRevenueProof: RevenuePortfolioDashboardFirstStoreRevenueProof;
  kpis: RevenuePortfolioDashboardPlan["kpis"];
  ownerLaunchApproval: RevenuePortfolioDashboardOwnerLaunchApprovalPacket;
  winnerScaleLadder: RevenuePortfolioDashboardWinnerScaleLadder;
}): RevenuePortfolioDashboardRevenueMilestonePath {
  const monthlyRevenueRunRate = money(input.kpis.revenueVelocity * 30);
  const monthlyProfitRunRate = money(input.kpis.profitVelocity * 30);
  const hasRevenue = input.firstRevenueProof.firstRevenueCaptured;
  const proofGateReady = input.winnerScaleLadder.proofGate.status === "ready_for_owner_scale_review";
  const hundredStoreStage = input.winnerScaleLadder.stages.find((stage) => stage.targetStores === 100) ?? null;
  const firstRevenueStatus: RevenuePortfolioDashboardRevenueMilestonePath["milestones"][number]["status"] = hasRevenue
    ? "achieved"
    : input.ownerLaunchApproval.status === "ready_for_owner_review" ? "ready_for_owner_review" : input.ownerLaunchApproval.status === "blocked" ? "blocked" : "waiting_for_first_sale";
  const tenKStatus: RevenuePortfolioDashboardRevenueMilestonePath["milestones"][number]["status"] = monthlyRevenueRunRate >= 10_000
    ? "achieved"
    : !hasRevenue
      ? "waiting_for_first_sale"
      : proofGateReady ? "ready_for_owner_review" : "waiting_for_scale_proof";
  const hundredKStatus: RevenuePortfolioDashboardRevenueMilestonePath["milestones"][number]["status"] = monthlyRevenueRunRate >= 100_000
    ? "achieved"
    : monthlyRevenueRunRate < 10_000
      ? "waiting_for_10k"
      : hundredStoreStage?.status === "blocked" ? "blocked" : proofGateReady ? "ready_for_owner_review" : "waiting_for_scale_proof";
  const guardrail = "Milestone progress is advisory only; no provider calls, publishing, ad spend, payments, payouts, clone execution, browser work, marketplace writes, or external API writes are authorized.";
  const milestones: RevenuePortfolioDashboardRevenueMilestonePath["milestones"] = [
    {
      currentMonthlyRunRate: monthlyRevenueRunRate,
      gapMonthlyRevenue: hasRevenue ? 0 : 1,
      guardrail,
      label: "First Real Revenue",
      nextInternalAction: firstRevenueStatus === "achieved"
        ? "record_first_revenue_evidence"
        : firstRevenueStatus === "ready_for_owner_review"
          ? input.ownerLaunchApproval.unlockBoundary.nextInternalAction
          : "complete_owner_launch_preflight",
      requiredEvidence: [
        "Owner manual live-launch approval",
        "First sale or no-sale manual snapshot",
        "Store-scoped gross revenue, units sold, net profit, and order/source evidence"
      ],
      status: firstRevenueStatus,
      targetMonthlyRevenue: 1
    },
    {
      currentMonthlyRunRate: monthlyRevenueRunRate,
      gapMonthlyRevenue: money(Math.max(0, 10_000 - monthlyRevenueRunRate)),
      guardrail,
      label: "$10k/month",
      nextInternalAction: tenKStatus === "achieved"
        ? "review_10k_month_operating_split"
        : tenKStatus === "ready_for_owner_review"
          ? "review_10_store_proven_winner_scale_packet"
          : "capture_first_store_proof_before_scale",
      requiredEvidence: [
        "First-store revenue and net profit proof",
        "Day 7 scale/watch/pause/kill review",
        "Owner approval for internal 10-store clone packet",
        "Manual or read-only signal tracking for every scaled store"
      ],
      status: tenKStatus,
      targetMonthlyRevenue: 10_000
    },
    {
      currentMonthlyRunRate: monthlyRevenueRunRate,
      gapMonthlyRevenue: money(Math.max(0, 100_000 - monthlyRevenueRunRate)),
      guardrail,
      label: "$100k/month",
      nextInternalAction: hundredKStatus === "achieved"
        ? "review_100k_month_controls"
        : hundredKStatus === "ready_for_owner_review"
          ? "review_100_store_proven_winner_scale_path"
          : hundredKStatus === "blocked"
            ? "repair_100_store_readiness_gates"
            : "reach_10k_month_before_100k_path",
      requiredEvidence: [
        "$10k/month operating proof",
        "100-store worker assignment, monitoring, and launch packet readiness",
        "Owner approval for each scale batch",
        "25/25/50 advisory allocation reviewed without automatic spend or payouts"
      ],
      status: hundredKStatus,
      targetMonthlyRevenue: 100_000
    }
  ];

  return {
    currentRunRate: {
      dailyProfitVelocity: input.kpis.profitVelocity,
      dailyRevenueVelocity: input.kpis.revenueVelocity,
      estimatedProfit: input.kpis.estimatedProfit,
      monthlyProfitRunRate,
      monthlyRevenueRunRate,
      totalRevenue: input.kpis.totalRevenue
    },
    externalExecution: false,
    milestones,
    providerContacted: false,
    summary: `${money(input.kpis.revenueVelocity)}/day revenue velocity equals ${monthlyRevenueRunRate}/month run-rate; next milestone action is ${milestones.find((milestone) => milestone.status !== "achieved")?.nextInternalAction ?? "maintain_verified_scale_controls"}.`
  };
}

export const requiredCashLoopConnectionCategories: RevenuePortfolioDashboardLaunchEvidenceCategory[] = [
  "storefront",
  "pod_supplier",
  "payments_payouts",
  "content_channels",
  "analytics_manual_import",
  "ads"
];

export const requiredFirstStoreLaunchEvidenceCategories: RevenuePortfolioDashboardLaunchEvidenceCategory[] = requiredCashLoopConnectionCategories.filter((category) => category !== "ads");
export const requiredFirstWeekSignalDays = [0, 1, 3, 7];

export function isRevenuePortfolioDashboardLaunchEvidenceCategory(value: unknown): value is RevenuePortfolioDashboardLaunchEvidenceCategory {
  return typeof value === "string" && requiredCashLoopConnectionCategories.includes(value as RevenuePortfolioDashboardLaunchEvidenceCategory);
}

function launchEvidenceCategoryLabel(category: RevenuePortfolioDashboardLaunchEvidenceCategory) {
  return category.replace(/_/g, " ");
}

export function buildRevenuePortfolioDashboardLaunchEvidenceCoverage(
  receipts: RevenuePortfolioDashboardCashLoopEvidenceReceipt[]
): RevenuePortfolioDashboardLaunchEvidenceCoverage {
  const recordedCategories = requiredCashLoopConnectionCategories.filter((category) => (
    receipts.some((receipt) => receipt.evidenceType === "manual_launch_evidence" && receipt.launchEvidenceCategory === category)
  ));
  const missingCategories = requiredFirstStoreLaunchEvidenceCategories.filter((category) => !recordedCategories.includes(category));
  const ready = missingCategories.length === 0;

  return {
    missingCategories,
    ready,
    recordedCategories,
    requiredCategories: requiredFirstStoreLaunchEvidenceCategories,
    summary: ready
      ? `Required first-store launch evidence is covered for ${requiredFirstStoreLaunchEvidenceCategories.length} core categories; ads remain approval-gated.`
      : `${recordedCategories.filter((category) => requiredFirstStoreLaunchEvidenceCategories.includes(category)).length}/${requiredFirstStoreLaunchEvidenceCategories.length} required first-store launch evidence categories recorded; missing ${missingCategories.map(launchEvidenceCategoryLabel).join(", ")}. Ads remain approval-gated.`
  };
}

export function buildRevenuePortfolioDashboardFirstWeekSignalCoverage(
  receipts: RevenuePortfolioDashboardCashLoopEvidenceReceipt[]
): RevenuePortfolioDashboardFirstWeekSignalCoverage {
  const manualSignalReceipts = receipts.filter((receipt) => receipt.evidenceType === "manual_signal_snapshot");
  const recordedDays = [...new Set(manualSignalReceipts
    .map((receipt) => typeof receipt.manualSignalDay === "number" ? Math.max(0, Math.min(7, Math.floor(receipt.manualSignalDay))) : null)
    .filter((day): day is number => day !== null))]
    .sort((left, right) => left - right);
  const daySevenReceipts = manualSignalReceipts.filter((receipt) => receipt.manualSignalDay === 7);
  const rotationReceipt = daySevenReceipts.find((receipt) => receipt.manualSignalRotationRecommendation) ?? null;
  const missingDays = requiredFirstWeekSignalDays.filter((day) => !recordedDays.includes(day));
  const daySevenRecorded = recordedDays.includes(7);
  const rotationRecommendation = rotationReceipt?.manualSignalRotationRecommendation ?? null;
  const rotationRecommendationRecorded = Boolean(rotationRecommendation);
  const ready = missingDays.length === 0 && daySevenRecorded && rotationRecommendationRecorded;

  return {
    daySevenRecorded,
    missingDays,
    ready,
    recordedDays,
    requiredDays: requiredFirstWeekSignalDays,
    rotationRecommendation,
    rotationRecommendationRecorded,
    summary: ready
      ? `First-week manual signal coverage is complete for days ${requiredFirstWeekSignalDays.join(", ")} with day-7 ${rotationRecommendation} recommendation recorded.`
      : `${recordedDays.length}/${requiredFirstWeekSignalDays.length} required first-week signal days recorded; missing day ${missingDays.join(", day ") || "none"}; day-7 rotation recommendation ${rotationRecommendationRecorded ? "recorded" : "missing"}.`
  };
}

const cashLoopLockedExternalActions = [
  "Provider calls, uploads, publishing, ad spend, payments, payouts, marketplace changes, browser actions, and external API writes",
  "Automatic clone execution, paid scale, payout movement, and provider writes"
];

function emptyCashLoopEvidenceTotals(): RevenuePortfolioDashboardCashLoopEvidenceTotals {
  return {
    cloneApprovals: 0,
    cloneApprovalsByTarget: {
      hundredStore: 0,
      tenStore: 0,
      twentyFiveStore: 0,
      unscoped: 0
    },
    launchEvidence: 0,
    manualSignals: 0,
    ownerApprovals: 0,
    receipts: 0
  };
}

function cashLoopEvidenceReceiptMatchesStore(receipt: RevenuePortfolioDashboardCashLoopEvidenceReceipt, storeId: string | null) {
  if (!storeId) return false;

  return receipt.storeId === storeId || receipt.targetId === storeId;
}

function cashLoopEvidenceTotals(receipts: RevenuePortfolioDashboardCashLoopEvidenceReceipt[]): RevenuePortfolioDashboardCashLoopEvidenceTotals {
  return receipts.reduce<RevenuePortfolioDashboardCashLoopEvidenceTotals>((accumulator, receipt) => {
    accumulator.receipts += 1;
    if (receipt.evidenceType === "owner_launch_approval") accumulator.ownerApprovals += 1;
    if (receipt.evidenceType === "manual_launch_evidence") accumulator.launchEvidence += 1;
    if (receipt.evidenceType === "manual_signal_snapshot") accumulator.manualSignals += 1;
    if (receipt.evidenceType === "winner_clone_packet_approval") {
      accumulator.cloneApprovals += 1;
      if (receipt.targetStores === 10) accumulator.cloneApprovalsByTarget.tenStore += 1;
      else if (receipt.targetStores === 25) accumulator.cloneApprovalsByTarget.twentyFiveStore += 1;
      else if (receipt.targetStores === 100) accumulator.cloneApprovalsByTarget.hundredStore += 1;
      else accumulator.cloneApprovalsByTarget.unscoped += 1;
    }

    return accumulator;
  }, emptyCashLoopEvidenceTotals());
}

function buildCashLoopEvidenceLedger(
  receipts: RevenuePortfolioDashboardCashLoopEvidenceReceipt[] = [],
  selectedStore: { storeId: string | null; storeName: string | null } = { storeId: null, storeName: null }
): RevenuePortfolioDashboardCashLoopEvidenceLedger {
  const sortedReceipts = [...receipts]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const visibleReceipts = sortedReceipts.slice(0, 20);
  const totals = cashLoopEvidenceTotals(sortedReceipts);
  const selectedReceipts = sortedReceipts.filter((receipt) => cashLoopEvidenceReceiptMatchesStore(receipt, selectedStore.storeId));
  const selectedTotals = cashLoopEvidenceTotals(selectedReceipts);
  const selectedLaunchEvidenceCoverage = buildRevenuePortfolioDashboardLaunchEvidenceCoverage(selectedReceipts);
  const selectedFirstWeekSignalCoverage = buildRevenuePortfolioDashboardFirstWeekSignalCoverage(selectedReceipts);
  const latestReceipt = visibleReceipts[0] ?? null;
  const latestSelectedReceipt = selectedReceipts[0] ?? null;

  return {
    externalExecution: false,
    providerContacted: false,
    receipts: visibleReceipts,
    selectedStore: {
      firstWeekSignalCoverage: selectedFirstWeekSignalCoverage,
      launchEvidenceCoverage: selectedLaunchEvidenceCoverage,
      storeId: selectedStore.storeId,
      storeName: selectedStore.storeName,
      summary: selectedStore.storeId
        ? latestSelectedReceipt
          ? `${selectedTotals.receipts} selected first-store cash-loop receipt${selectedTotals.receipts === 1 ? "" : "s"} tracked for ${selectedStore.storeName ?? selectedStore.storeId}; latest ${latestSelectedReceipt.evidenceType.replace(/_/g, " ")} was recorded at ${latestSelectedReceipt.createdAt}. External execution remains locked.`
          : `No selected first-store cash-loop receipts are visible for ${selectedStore.storeName ?? selectedStore.storeId} yet. External execution remains locked.`
        : "No selected first-store target is available for receipt scoping yet. External execution remains locked.",
      totals: selectedTotals
    },
    summary: latestReceipt
      ? `${totals.receipts} persisted internal cash-loop receipt${totals.receipts === 1 ? "" : "s"} tracked; latest visible ${latestReceipt.evidenceType.replace(/_/g, " ")} was recorded at ${latestReceipt.createdAt}. External execution remains locked.`
      : "No persisted internal cash-loop receipts are visible yet; owner approvals, manual launch evidence, manual signal snapshots, and clone packet approvals will appear here after they are recorded.",
    totals
  };
}

function buildCashLoopStage(input: {
  dailyRevenueLoop: RevenuePortfolioDashboardDailyRevenueLoop;
  evidenceLedger: RevenuePortfolioDashboardCashLoopEvidenceLedger;
  executionPacket: RevenuePortfolioDashboardFirstStoreCashLoop["executionPacket"];
  firstRevenueProof: RevenuePortfolioDashboardFirstStoreRevenueProof;
  manualLaunchPacket: RevenuePortfolioDashboardManualLaunchPacket;
  ownerLaunchApproval: RevenuePortfolioDashboardOwnerLaunchApprovalPacket;
  revenueMilestonePath: RevenuePortfolioDashboardRevenueMilestonePath;
  winnerScaleLadder: RevenuePortfolioDashboardWinnerScaleLadder;
}): RevenuePortfolioDashboardCashLoopStage {
  const selectedTotals = input.evidenceLedger.selectedStore.totals;
  const launchEvidenceCoverage = input.evidenceLedger.selectedStore.launchEvidenceCoverage;
  const firstWeekSignalCoverage = input.evidenceLedger.selectedStore.firstWeekSignalCoverage;
  const ownerApprovalRecorded = selectedTotals.ownerApprovals > 0;
  const manualLaunchEvidenceRecorded = launchEvidenceCoverage.ready;
  const partialManualLaunchEvidenceRecorded = selectedTotals.launchEvidence > 0;
  const manualSignalRecorded = selectedTotals.manualSignals > 0;
  const tenStoreCloneApprovalRecorded = selectedTotals.cloneApprovalsByTarget.tenStore > 0;
  const firstRevenueCaptured = input.firstRevenueProof.firstRevenueCaptured;
  const receiptsRecorded = [
    ownerApprovalRecorded ? "Owner manual live-launch approval receipt" : null,
    partialManualLaunchEvidenceRecorded ? `Manual first-store launch evidence receipt (${launchEvidenceCoverage.recordedCategories.length}/${launchEvidenceCoverage.requiredCategories.length} categories)` : null,
    manualSignalRecorded ? "Manual first-week revenue signal snapshot" : null,
    tenStoreCloneApprovalRecorded ? "10-store internal winner clone packet approval receipt" : null,
    selectedTotals.cloneApprovalsByTarget.twentyFiveStore > 0 ? "25-store internal winner clone packet approval receipt" : null,
    selectedTotals.cloneApprovalsByTarget.hundredStore > 0 ? "100-store internal winner clone packet approval receipt" : null,
    selectedTotals.cloneApprovalsByTarget.unscoped > 0 ? "Unscoped internal winner clone approval receipt (legacy; does not unlock a target scale stage)" : null
  ].filter((receipt): receipt is string => Boolean(receipt));
  const isBlocked = input.executionPacket.status === "blocked"
    || input.manualLaunchPacket.status === "blocked"
    || input.ownerLaunchApproval.status === "blocked";
  const scaleProofReady = input.winnerScaleLadder.proofGate.status === "ready_for_owner_scale_review";
  const tenStoreCloneApprovalEffective = tenStoreCloneApprovalRecorded && scaleProofReady;
  const stage = (() => {
    if (isBlocked) {
      return {
        label: "Repair blocked first-store launch gates",
        nextInternalAction: "repair_first_store_cash_loop_blockers",
        reason: "A required first-store packet or launch approval gate is blocked.",
        status: "blocked" as const
      };
    }

    if (input.executionPacket.status !== "ready_from_final_execution_packet") {
      return {
        label: "Approve the first-store final execution packet",
        nextInternalAction: "complete_first_business_final_execution_packet",
        reason: "The first-store final execution packet must be ready before live owner review.",
        status: "waiting_for_execution_packet" as const
      };
    }

    if (!ownerApprovalRecorded) {
      return {
        label: "Record owner manual live-launch approval receipt",
        nextInternalAction: "record_owner_manual_launch_review",
        reason: "The launch packet is internally ready, but no persisted owner live-launch approval receipt is visible yet.",
        status: "waiting_for_owner_launch_approval" as const
      };
    }

    if (!manualLaunchEvidenceRecorded) {
      return {
        label: "Record first-store manual launch evidence",
        nextInternalAction: "record_first_store_manual_launch_evidence",
        reason: partialManualLaunchEvidenceRecorded
          ? `${launchEvidenceCoverage.summary} Complete the missing launch evidence before first-week signals.`
          : "Owner approval is recorded; the next proof is operator-completed manual launch evidence.",
        status: "waiting_for_manual_launch_evidence" as const
      };
    }

    if (!manualSignalRecorded) {
      return {
        label: "Capture first-store manual revenue signals",
        nextInternalAction: "record_manual_first_week_signals",
        reason: "Manual launch evidence is recorded; capture visits, units, revenue, profit, and content response next.",
        status: "waiting_for_first_signal_snapshot" as const
      };
    }

    if (!firstRevenueCaptured) {
      return {
        label: "Continue daily signal capture until first real revenue",
        nextInternalAction: input.firstRevenueProof.nextInternalAction,
        reason: input.firstRevenueProof.summary,
        status: "waiting_for_first_revenue" as const
      };
    }

    if (scaleProofReady && !tenStoreCloneApprovalRecorded) {
      return {
        label: "Review internal winner clone packet",
        nextInternalAction: "review_proven_winner_scale_gate",
        reason: "First revenue and signal evidence are visible; scaling remains owner-gated until a 10-store internal clone packet approval is recorded.",
        status: "waiting_for_scale_packet_approval" as const
      };
    }

    if (tenStoreCloneApprovalEffective) {
      return {
        label: "Monitor approved internal clone packet",
        nextInternalAction: "maintain_private_clone_packet_audit",
        reason: "A 10-store winner clone approval receipt is visible; keep clone execution private and approval-gated while monitoring first-store proof.",
        status: "scale_packet_approved" as const
      };
    }

    return {
      label: "Capture more winner proof before scale",
      nextInternalAction: input.winnerScaleLadder.proofGate.nextInternalAction,
      reason: input.winnerScaleLadder.proofGate.evidenceSummary,
      status: "waiting_for_scale_packet_approval" as const
    };
  })();
  const receiptsNeeded = [
    ownerApprovalRecorded ? null : "Owner manual live-launch approval receipt",
    manualLaunchEvidenceRecorded ? null : `Manual first-store launch evidence coverage (${launchEvidenceCoverage.missingCategories.map(launchEvidenceCategoryLabel).join(", ") || "required categories"})`,
    manualSignalRecorded ? null : "Manual first-week revenue signal snapshot",
    firstRevenueCaptured ? null : "First real revenue signal with gross revenue and profit",
    firstRevenueCaptured && !scaleProofReady ? `First-week day-7 scale proof (${firstWeekSignalCoverage.summary})` : null,
    tenStoreCloneApprovalEffective || !firstRevenueCaptured || !scaleProofReady ? null : "10-store internal winner clone packet approval receipt"
  ].filter((receipt): receipt is string => Boolean(receipt));

  return {
    externalExecution: false,
    firstRevenueCaptured,
    label: stage.label,
    nextOwnerAction: {
      label: stage.label,
      nextInternalAction: stage.nextInternalAction,
      reason: stage.reason,
      source: "cash_loop_stage"
    },
    providerContacted: false,
    receiptsNeeded,
    receiptsRecorded,
    status: stage.status,
    summary: `${receiptsRecorded.length} cash-loop receipt${receiptsRecorded.length === 1 ? "" : "s"} recorded and ${receiptsNeeded.length} proof item${receiptsNeeded.length === 1 ? "" : "s"} still needed. ${stage.reason} External execution remains locked.`
  };
}

function buildOwnerActionQueue(input: {
  cashLoopStage: RevenuePortfolioDashboardCashLoopStage;
  dailyRevenueLoop: RevenuePortfolioDashboardDailyRevenueLoop;
  evidenceLedger: RevenuePortfolioDashboardCashLoopEvidenceLedger;
  executionPacket: RevenuePortfolioDashboardFirstStoreCashLoop["executionPacket"];
  firstRevenueProof: RevenuePortfolioDashboardFirstStoreRevenueProof;
  firstWeekRevenueLoop: RevenuePortfolioDashboardFirstWeekRevenueLoop;
  manualLaunchPacket: RevenuePortfolioDashboardManualLaunchPacket;
  ownerLaunchApproval: RevenuePortfolioDashboardOwnerLaunchApprovalPacket;
  revenueMilestonePath: RevenuePortfolioDashboardRevenueMilestonePath;
  scalePath: RevenuePortfolioDashboardFirstStoreCashLoop["scalePath"];
  winnerScaleLadder: RevenuePortfolioDashboardWinnerScaleLadder;
}): RevenuePortfolioDashboardOwnerActionQueueItem[] {
  const selectedTotals = input.evidenceLedger.selectedStore.totals;
  const launchEvidenceCoverage = input.evidenceLedger.selectedStore.launchEvidenceCoverage;
  const firstWeekSignalCoverage = input.evidenceLedger.selectedStore.firstWeekSignalCoverage;
  const ownerApprovalRecorded = selectedTotals.ownerApprovals > 0;
  const manualLaunchEvidenceRecorded = launchEvidenceCoverage.ready;
  const partialManualLaunchEvidenceRecorded = selectedTotals.launchEvidence > 0;
  const manualSignalRecorded = selectedTotals.manualSignals > 0;
  const cloneApprovalRecorded = selectedTotals.cloneApprovals > 0;
  const tenStoreCloneApprovalRecorded = selectedTotals.cloneApprovalsByTarget.tenStore > 0;
  const scaleProofReady = input.winnerScaleLadder.proofGate.status === "ready_for_owner_scale_review";
  const tenStoreCloneApprovalEffective = tenStoreCloneApprovalRecorded && scaleProofReady;
  const executionPacketReady = input.executionPacket.status === "ready_from_final_execution_packet";
  const firstRevenueCaptured = input.cashLoopStage.firstRevenueCaptured;
  const firstMilestone = input.revenueMilestonePath.milestones.find((milestone) => milestone.label === "First Real Revenue") ?? null;
  const tenStoreStage = input.winnerScaleLadder.stages.find((stage) => stage.targetStores === 10) ?? null;
  const firstClonePacket = input.winnerScaleLadder.clonePackets.find((packet) => packet.targetStores === 10) ?? null;

  const item = (entry: Omit<RevenuePortfolioDashboardOwnerActionQueueItem, "blockedExternalActions" | "externalExecution" | "providerContacted">): RevenuePortfolioDashboardOwnerActionQueueItem => ({
    ...entry,
    blockedExternalActions: cashLoopLockedExternalActions,
    externalExecution: false,
    providerContacted: false
  });

  return [
    item({
      actionLabel: "Approve first-store final execution packet",
      evidenceToRecord: [
        `${input.executionPacket.products} product${input.executionPacket.products === 1 ? "" : "s"} and ${input.executionPacket.manualSteps} manual launch step${input.executionPacket.manualSteps === 1 ? "" : "s"}.`,
        `${input.executionPacket.readinessReady} readiness gate${input.executionPacket.readinessReady === 1 ? "" : "s"} ready and ${input.executionPacket.readinessBlocked} blocked.`,
        input.executionPacket.auditTrail[0] ?? "Final execution packet audit trail pending."
      ],
      nextInternalAction: executionPacketReady ? "review_owner_manual_launch_approval" : "complete_first_business_final_execution_packet",
      order: 1,
      receiptType: "final_execution_packet",
      source: "execution_packet",
      status: executionPacketReady ? "complete" : input.executionPacket.status === "blocked" ? "blocked" : "current",
      summary: executionPacketReady
        ? `${input.executionPacket.label} is ready as the first-store source packet.`
        : `${input.executionPacket.label} must be finalized before live owner review.`
    }),
    item({
      actionLabel: "Record owner manual live-launch approval receipt",
      evidenceToRecord: [
        `Approval phrase: ${input.ownerLaunchApproval.approvalPhrase}.`,
        input.ownerLaunchApproval.preflightChecks.map((check) => `${check.title}: ${check.status.replace(/_/g, " ")}`).join(" / ") || "Owner approval preflight pending.",
        input.ownerLaunchApproval.unlockBoundary.stillLocked[0] ?? "External actions remain locked."
      ],
      nextInternalAction: input.ownerLaunchApproval.unlockBoundary.nextInternalAction,
      order: 2,
      receiptType: "owner_launch_approval",
      source: "owner_launch_approval",
      status: ownerApprovalRecorded
        ? "complete"
        : input.ownerLaunchApproval.status === "blocked" ? "blocked" : executionPacketReady ? "owner_approval_required" : "waiting",
      summary: ownerApprovalRecorded
        ? "Owner manual live-launch approval receipt is persisted."
        : "Owner must explicitly approve the manual live-launch boundary before launch evidence can be recorded."
    }),
    item({
      actionLabel: "Record first-store manual launch evidence",
      evidenceToRecord: [
        input.manualLaunchPacket.manualSteps[0] ?? "Manual launch step pending.",
        input.manualLaunchPacket.supplier.steps[0] ?? "Supplier review step pending.",
        input.manualLaunchPacket.rollbackPlan[0] ?? "Rollback plan pending.",
        launchEvidenceCoverage.summary
      ],
      nextInternalAction: manualLaunchEvidenceRecorded ? "record_manual_first_week_signals" : "record_first_store_manual_launch_evidence",
      order: 3,
      receiptType: "manual_launch_evidence",
      source: "manual_launch_packet",
      status: manualLaunchEvidenceRecorded
        ? "complete"
        : input.manualLaunchPacket.status === "blocked" ? "blocked" : ownerApprovalRecorded ? "current" : "waiting",
      summary: manualLaunchEvidenceRecorded
        ? "Required manual first-store launch evidence coverage is complete."
        : partialManualLaunchEvidenceRecorded
          ? launchEvidenceCoverage.summary
          : "After owner approval, record which operator-completed manual launch step was completed and what proof was observed."
    }),
    item({
      actionLabel: "Capture first-store manual revenue signals",
      evidenceToRecord: [
        input.firstWeekRevenueLoop.metricFields.map((field) => field.label).join(" / ") || "Manual metric fields pending.",
        input.firstWeekRevenueLoop.checkIns[0]?.requiredEvidence.join(" / ") ?? "First-week check-in evidence pending.",
        input.dailyRevenueLoop.signalIngest.summary,
        firstWeekSignalCoverage.summary
      ],
      nextInternalAction: input.firstWeekRevenueLoop.rotationReview.nextInternalAction,
      order: 4,
      receiptType: "manual_signal_snapshot",
      source: "first_week_revenue_loop",
      status: firstWeekSignalCoverage.ready
        ? "complete"
        : input.firstWeekRevenueLoop.status === "blocked" ? "blocked" : manualSignalRecorded || manualLaunchEvidenceRecorded ? "current" : "waiting",
      summary: firstWeekSignalCoverage.ready
        ? "Required first-week manual signal coverage is complete."
        : manualSignalRecorded
          ? firstWeekSignalCoverage.summary
        : "Record visits, units sold, gross revenue, net profit, content views, saves/shares, and the scale/watch/pause/kill input."
    }),
    item({
      actionLabel: "Continue daily signal capture until first real revenue",
      evidenceToRecord: [
        firstMilestone ? `First revenue milestone is ${firstMilestone.status.replace(/_/g, " ")}.` : "First revenue milestone is missing.",
        `Selected first-store revenue is $${input.firstRevenueProof.grossRevenue.toFixed(2)} and net profit is $${input.firstRevenueProof.netProfit.toFixed(2)}.`,
        `${input.dailyRevenueLoop.decision.recommendation} recommendation with scalePressure ${input.dailyRevenueLoop.decision.scalePressure}/100 and killPressure ${input.dailyRevenueLoop.decision.killPressure}/100.`
      ],
      nextInternalAction: firstRevenueCaptured ? "review_proven_winner_scale_gate" : input.firstRevenueProof.nextInternalAction,
      order: 5,
      receiptType: "first_revenue_signal",
      source: "daily_revenue_loop",
      status: firstRevenueCaptured ? "complete" : manualSignalRecorded ? "current" : "waiting",
      summary: firstRevenueCaptured
        ? "First real revenue is visible for the selected first store."
        : "Keep the organic-first daily loop running until gross revenue is visible."
    }),
    item({
      actionLabel: "Review internal winner clone packet",
      evidenceToRecord: [
        input.winnerScaleLadder.proofGate.evidenceSummary,
        firstClonePacket?.requiredProof.join(" / ") ?? "10-store clone packet proof pending.",
        firstClonePacket?.approvalPhrase ?? "APPROVE INTERNAL WINNER CLONE PACKET"
      ],
      nextInternalAction: firstClonePacket?.nextInternalAction ?? input.winnerScaleLadder.proofGate.nextInternalAction,
      order: 6,
      receiptType: "winner_clone_packet_approval",
      source: "winner_scale_ladder",
      status: tenStoreCloneApprovalEffective
        ? "complete"
        : firstClonePacket?.status === "blocked" || input.winnerScaleLadder.proofGate.status === "blocked" ? "blocked" : firstRevenueCaptured && firstClonePacket?.status === "approval_required" ? "owner_approval_required" : "waiting",
      summary: tenStoreCloneApprovalEffective
        ? "10-store internal winner clone packet approval receipt is persisted."
        : cloneApprovalRecorded
          ? "A clone approval receipt exists, but the 10-store approval receipt or first-week winner proof is incomplete under the current gate."
        : "Scaling is still private and owner-gated; approve an internal clone packet only after first-revenue proof."
    }),
    item({
      actionLabel: "Prepare 10/25/100 private scale readiness",
      evidenceToRecord: [
        tenStoreStage ? `10-store stage is ${tenStoreStage.status.replace(/_/g, " ")} at ${tenStoreStage.readinessPercent}%.` : "10-store stage is not available.",
        `25-store bridge is ${input.scalePath.twentyFiveStore.status.replace(/_/g, " ")} at ${input.scalePath.twentyFiveStore.readinessPercent}%.`,
        input.scalePath.hundredStore
          ? `100-store readiness is ${input.scalePath.hundredStore.readinessScore}/100 with ${input.scalePath.hundredStore.workerAssignmentsReady} worker assignment${input.scalePath.hundredStore.workerAssignmentsReady === 1 ? "" : "s"} ready.`
          : "100-store readiness plan is not attached."
      ],
      nextInternalAction: tenStoreCloneApprovalEffective
        ? input.scalePath.tenStore.nextInternalAction
        : "wait_for_winner_clone_packet_approval",
      order: 7,
      receiptType: "none",
      source: "winner_scale_ladder",
      status: tenStoreCloneApprovalEffective ? "current" : "waiting",
      summary: tenStoreCloneApprovalEffective
        ? "Clone approval is recorded; keep preparing private 10/25/100 readiness without external execution."
        : "Private scale readiness remains staged behind winner proof and clone packet approval."
    })
  ];
}

function buildFirstStoreToScaleProofChain(input: {
  cashLoopStage: RevenuePortfolioDashboardCashLoopStage;
  dailyRevenueLoop: RevenuePortfolioDashboardDailyRevenueLoop;
  evidenceLedger: RevenuePortfolioDashboardCashLoopEvidenceLedger;
  executionPacket: RevenuePortfolioDashboardFirstStoreCashLoop["executionPacket"];
  firstRevenueProof: RevenuePortfolioDashboardFirstStoreRevenueProof;
  manualLaunchPacket: RevenuePortfolioDashboardManualLaunchPacket;
  ownerActionQueue: RevenuePortfolioDashboardOwnerActionQueueItem[];
  ownerLaunchApproval: RevenuePortfolioDashboardOwnerLaunchApprovalPacket;
  revenueMilestonePath: RevenuePortfolioDashboardRevenueMilestonePath;
  scalePath: RevenuePortfolioDashboardFirstStoreCashLoop["scalePath"];
  winnerScaleLadder: RevenuePortfolioDashboardWinnerScaleLadder;
}): RevenuePortfolioDashboardFirstStoreToScaleProofChain {
  type ProofChainStage = RevenuePortfolioDashboardFirstStoreToScaleProofChain["stages"][number];
  type ProofChainStatus = ProofChainStage["status"];

  const actionByOrder = (order: number) => input.ownerActionQueue.find((item) => item.order === order) ?? null;
  const selectedTotals = input.evidenceLedger.selectedStore.totals;
  const launchEvidenceCoverage = input.evidenceLedger.selectedStore.launchEvidenceCoverage;
  const firstWeekSignalCoverage = input.evidenceLedger.selectedStore.firstWeekSignalCoverage;
  const ownerApprovalRecorded = selectedTotals.ownerApprovals > 0;
  const manualLaunchEvidenceRecorded = launchEvidenceCoverage.ready;
  const manualSignalRecorded = selectedTotals.manualSignals > 0;
  const cloneApprovalRecorded = selectedTotals.cloneApprovals > 0;
  const tenStoreCloneApprovalRecorded = selectedTotals.cloneApprovalsByTarget.tenStore > 0;
  const twentyFiveStoreCloneApprovalRecorded = selectedTotals.cloneApprovalsByTarget.twentyFiveStore > 0;
  const hundredStoreCloneApprovalRecorded = selectedTotals.cloneApprovalsByTarget.hundredStore > 0;
  const scaleProofReady = input.winnerScaleLadder.proofGate.status === "ready_for_owner_scale_review";
  const tenStoreCloneApprovalEffective = tenStoreCloneApprovalRecorded && scaleProofReady;
  const executionPacketReady = input.executionPacket.status === "ready_from_final_execution_packet";
  const firstRevenueCaptured = input.cashLoopStage.firstRevenueCaptured;
  const firstMilestone = input.revenueMilestonePath.milestones.find((milestone) => milestone.label === "First Real Revenue") ?? null;
  const tenKMilestone = input.revenueMilestonePath.milestones.find((milestone) => milestone.label === "$10k/month") ?? null;
  const hundredKMilestone = input.revenueMilestonePath.milestones.find((milestone) => milestone.label === "$100k/month") ?? null;
  const tenStoreStage = input.winnerScaleLadder.stages.find((stage) => stage.targetStores === 10) ?? null;
  const tenStorePacket = input.winnerScaleLadder.clonePackets.find((packet) => packet.targetStores === 10) ?? null;
  const twentyFiveStoreStage = input.winnerScaleLadder.stages.find((stage) => stage.targetStores === 25) ?? null;
  const twentyFiveStorePacket = input.winnerScaleLadder.clonePackets.find((packet) => packet.targetStores === 25) ?? null;
  const hundredStoreStage = input.winnerScaleLadder.stages.find((stage) => stage.targetStores === 100) ?? null;
  const hundredStorePacket = input.winnerScaleLadder.clonePackets.find((packet) => packet.targetStores === 100) ?? null;

  const ownerAction = actionByOrder(2);
  const manualLaunchAction = actionByOrder(3);
  const manualSignalAction = actionByOrder(4);
  const firstRevenueAction = actionByOrder(5);
  const cloneAction = actionByOrder(6);

  const proofStage = (entry: Omit<ProofChainStage, "blockedExternalActions" | "externalExecution" | "providerContacted">): ProofChainStage => ({
    ...entry,
    blockedExternalActions: cashLoopLockedExternalActions,
    externalExecution: false,
    providerContacted: false
  });

  const finalPacketStatus: ProofChainStatus = input.executionPacket.status === "blocked"
    ? "blocked"
    : executionPacketReady ? "proven" : "current";
  const ownerApprovalStatus: ProofChainStatus = ownerApprovalRecorded
    ? "proven"
    : input.ownerLaunchApproval.status === "blocked" ? "blocked" : executionPacketReady ? "owner_approval_required" : "waiting_for_internal_packet";
  const manualLaunchStatus: ProofChainStatus = manualLaunchEvidenceRecorded
    ? "proven"
    : !executionPacketReady
      ? "waiting_for_internal_packet"
      : manualLaunchAction?.status === "blocked" || input.manualLaunchPacket.status === "blocked"
      ? "blocked"
      : ownerApprovalRecorded ? "current" : "owner_approval_required";
  const manualSignalStatus: ProofChainStatus = firstWeekSignalCoverage.ready
    ? "proven"
    : !executionPacketReady
      ? "waiting_for_internal_packet"
      : manualSignalAction?.status === "blocked"
      ? "blocked"
      : manualSignalRecorded || manualLaunchEvidenceRecorded ? "current" : "waiting_for_live_evidence";
  const firstRevenueStatus: ProofChainStatus = firstRevenueCaptured
    ? "proven"
    : !executionPacketReady
      ? "waiting_for_internal_packet"
      : firstRevenueAction?.status === "blocked" ? "blocked" : manualSignalRecorded ? "current" : "waiting_for_live_evidence";
  const clonePacketStatus: ProofChainStatus = tenStoreCloneApprovalEffective
    ? "proven"
    : !executionPacketReady
      ? "waiting_for_internal_packet"
      : cloneAction?.status === "blocked"
      ? "blocked"
      : !firstRevenueCaptured ? "waiting_for_scale_proof" : tenStorePacket?.status === "approval_required" ? "owner_approval_required" : "waiting_for_scale_proof";
  const tenStoreStatus: ProofChainStatus = !executionPacketReady
    ? "waiting_for_internal_packet"
    : tenStoreStage?.status === "blocked"
    ? "blocked"
    : !tenStoreCloneApprovalEffective ? "waiting_for_scale_proof" : tenStoreStage && (tenStoreStage.status === "ready_internal" || tenStoreStage.readinessPercent >= 100) ? "proven" : "current";
  const twentyFiveBridgeReady = input.scalePath.twentyFiveStore.status === "ready" || input.scalePath.twentyFiveStore.readinessPercent >= 100;
  const twentyFiveStatus: ProofChainStatus = !executionPacketReady
    ? "waiting_for_internal_packet"
    : input.scalePath.twentyFiveStore.status === "blocked" || twentyFiveStoreStage?.status === "blocked"
    ? "blocked"
    : !tenStoreCloneApprovalEffective || tenStoreStatus !== "proven"
      ? "waiting_for_scale_proof"
      : !twentyFiveBridgeReady
        ? "current"
        : !twentyFiveStoreCloneApprovalRecorded
          ? twentyFiveStorePacket?.status === "approval_required" ? "owner_approval_required" : "waiting_for_scale_proof"
          : "proven";
  const twentyFiveCloneApprovalEffective = twentyFiveStatus === "proven" && twentyFiveStoreCloneApprovalRecorded;
  const hundredStoreReady = Boolean(input.scalePath.hundredStore
    && input.scalePath.hundredStore.readinessScore >= 100
    && input.scalePath.hundredStore.workerAssignmentsReady >= input.scalePath.hundredStore.targetStores);
  const hundredStoreStatus: ProofChainStatus = !executionPacketReady
    ? "waiting_for_internal_packet"
    : !input.scalePath.hundredStore
    ? "waiting_for_scale_proof"
    : input.scalePath.hundredStore.gatesBlocked > 0 || hundredStoreStage?.status === "blocked"
      ? "blocked"
      : !twentyFiveCloneApprovalEffective || tenKMilestone?.status !== "achieved"
        ? "waiting_for_scale_proof"
        : !hundredStoreReady
          ? "current"
          : !hundredStoreCloneApprovalRecorded
            ? hundredStorePacket?.status === "approval_required" ? "owner_approval_required" : "waiting_for_scale_proof"
            : "proven";

  const stages: ProofChainStage[] = [
    proofStage({
      evidence: [
        `${input.executionPacket.label} is ${input.executionPacket.status.replace(/_/g, " ")}.`,
        `${input.executionPacket.products} product${input.executionPacket.products === 1 ? "" : "s"}, ${input.executionPacket.manualSteps} manual step${input.executionPacket.manualSteps === 1 ? "" : "s"}, and ${input.executionPacket.semiAutomatedSteps} semi-auto step${input.executionPacket.semiAutomatedSteps === 1 ? "" : "s"} are in the first-store packet.`,
        `${input.executionPacket.readinessReady} launch readiness gate${input.executionPacket.readinessReady === 1 ? "" : "s"} ready; ${input.executionPacket.readinessBlocked} blocked.`
      ],
      label: "Approved first-store execution packet",
      nextInternalAction: executionPacketReady ? "review_owner_manual_launch_approval" : "complete_first_business_final_execution_packet",
      order: 1,
      receipts: executionPacketReady ? ["Approved first-business final execution packet"] : [],
      status: finalPacketStatus,
      unlocks: executionPacketReady ? ["Owner manual live-launch approval can be reviewed."] : ["Owner launch approval remains locked behind the final execution packet."]
    }),
    proofStage({
      evidence: [
        ownerAction?.summary ?? input.ownerLaunchApproval.summary,
        `Approval phrase: ${input.ownerLaunchApproval.approvalPhrase}.`,
        `${selectedTotals.ownerApprovals} selected-store owner approval receipt${selectedTotals.ownerApprovals === 1 ? "" : "s"} visible.`
      ],
      label: "Owner manual live-launch approval receipt",
      nextInternalAction: ownerApprovalRecorded ? "record_first_store_manual_launch_evidence" : input.ownerLaunchApproval.unlockBoundary.nextInternalAction,
      order: 2,
      receipts: ownerApprovalRecorded ? ["Owner manual live-launch approval receipt"] : [],
      status: ownerApprovalStatus,
      unlocks: ownerApprovalRecorded
        ? ["Manual operator launch evidence can be recorded."]
        : ["Provider, marketplace, browser, spend, payment, payout, and API actions remain locked."]
    }),
    proofStage({
      evidence: [
        manualLaunchAction?.summary ?? "Manual launch evidence has not been recorded yet.",
        input.manualLaunchPacket.store ? `${input.manualLaunchPacket.store.name} on ${input.manualLaunchPacket.store.platform}.` : "First store packet is missing.",
        input.manualLaunchPacket.product ? `${input.manualLaunchPacket.product.name} at ${money(input.manualLaunchPacket.product.retailPrice)} and ${input.manualLaunchPacket.product.marginPercent}% target margin.` : "First product packet is missing.",
        launchEvidenceCoverage.summary
      ],
      label: "Manual first-store launch evidence",
      nextInternalAction: manualLaunchEvidenceRecorded ? "record_manual_first_week_signals" : "record_first_store_manual_launch_evidence",
      order: 3,
      receipts: manualLaunchEvidenceRecorded
        ? ["Required manual first-store launch evidence coverage"]
        : launchEvidenceCoverage.missingCategories.map((category) => `Missing ${launchEvidenceCategoryLabel(category)} launch evidence`),
      status: manualLaunchStatus,
      unlocks: manualLaunchEvidenceRecorded ? ["First-week manual revenue and content signals can be captured."] : ["Manual launch evidence remains owner/operator completed only."]
    }),
    proofStage({
      evidence: [
        manualSignalAction?.summary ?? input.dailyRevenueLoop.signalIngest.summary,
        `${input.dailyRevenueLoop.signalIngest.manualSnapshots} manual signal snapshot${input.dailyRevenueLoop.signalIngest.manualSnapshots === 1 ? "" : "s"} and ${input.dailyRevenueLoop.signalIngest.performanceSnapshots} performance snapshot${input.dailyRevenueLoop.signalIngest.performanceSnapshots === 1 ? "" : "s"} visible.`,
        `scalePressure ${input.dailyRevenueLoop.decision.scalePressure}/100 and killPressure ${input.dailyRevenueLoop.decision.killPressure}/100.`,
        firstWeekSignalCoverage.summary
      ],
      label: "Manual first-week signal snapshot",
      nextInternalAction: firstWeekSignalCoverage.ready ? "continue_daily_first_store_signal_capture" : "record_manual_first_week_signals",
      order: 4,
      receipts: firstWeekSignalCoverage.ready ? ["Required first-week manual signal coverage"] : manualSignalRecorded ? ["Partial first-week manual signal coverage"] : [],
      status: manualSignalStatus,
      unlocks: firstWeekSignalCoverage.ready ? ["Daily revenue loop can recommend scale/watch/pause/kill from full first-week evidence."] : ["Daily recommendations stay advisory until first-week signal coverage is complete."]
    }),
    proofStage({
      evidence: [
        firstRevenueAction?.summary ?? input.firstRevenueProof.summary,
        `Selected first-store revenue is ${money(input.firstRevenueProof.grossRevenue)} with ${money(input.firstRevenueProof.netProfit)} net profit and ${input.firstRevenueProof.manualSignalReceipts} manual signal receipt${input.firstRevenueProof.manualSignalReceipts === 1 ? "" : "s"}.`,
        `First revenue milestone is ${firstMilestone?.status.replace(/_/g, " ") ?? "missing"}.`
      ],
      label: "First real revenue proof",
      nextInternalAction: firstRevenueCaptured ? "review_proven_winner_scale_gate" : input.firstRevenueProof.nextInternalAction,
      order: 5,
      receipts: firstRevenueCaptured ? ["First real revenue signal with gross revenue and profit"] : [],
      status: firstRevenueStatus,
      unlocks: firstRevenueCaptured ? ["Internal winner clone packet can be reviewed for owner scale approval."] : ["Scaling remains locked until gross revenue and profit evidence are visible."]
    }),
    proofStage({
      evidence: [
        cloneAction?.summary ?? input.winnerScaleLadder.proofGate.evidenceSummary,
        tenStorePacket ? `${tenStorePacket.draftCloneSlots} private 10-store clone draft slot${tenStorePacket.draftCloneSlots === 1 ? "" : "s"} prepared.` : "10-store clone packet is not available.",
        `${selectedTotals.cloneApprovalsByTarget.tenStore} 10-store, ${selectedTotals.cloneApprovalsByTarget.twentyFiveStore} 25-store, ${selectedTotals.cloneApprovalsByTarget.hundredStore} 100-store, and ${selectedTotals.cloneApprovalsByTarget.unscoped} unscoped selected-store clone approval receipt${selectedTotals.cloneApprovals === 1 ? "" : "s"} visible.`
      ],
      label: "Internal winner clone packet approval",
      nextInternalAction: tenStoreCloneApprovalEffective ? "prepare_private_10_store_clone_readiness" : tenStorePacket?.nextInternalAction ?? input.winnerScaleLadder.proofGate.nextInternalAction,
      order: 6,
      receipts: tenStoreCloneApprovalEffective ? ["10-store internal winner clone packet approval receipt"] : cloneApprovalRecorded ? ["Clone approval receipt present, pending 10-store target approval or first-week proof"] : [],
      status: clonePacketStatus,
      unlocks: tenStoreCloneApprovalEffective ? ["10-store private readiness can be prepared from the proven first-store template."] : ["Clone execution, paid scale, and provider writes remain locked."]
    }),
    proofStage({
      evidence: [
        tenStoreStage ? `${tenStoreStage.targetStores}-store stage is ${tenStoreStage.status.replace(/_/g, " ")} at ${tenStoreStage.readinessPercent}%.` : "10-store stage is missing.",
        `${input.scalePath.tenStore.currentStores}/${input.scalePath.tenStore.targetStores} stores tracked; ${input.scalePath.tenStore.gap} store gap remains.`,
        `${input.scalePath.tenStore.readyParallelStores} ready parallel store${input.scalePath.tenStore.readyParallelStores === 1 ? "" : "s"} and ${input.scalePath.tenStore.scaleReadyStores} scale-ready store${input.scalePath.tenStore.scaleReadyStores === 1 ? "" : "s"}.`
      ],
      label: "10-store private clone readiness",
      nextInternalAction: tenStoreStatus === "proven" ? "prepare_25_store_private_scale_bridge" : input.scalePath.tenStore.nextInternalAction,
      order: 7,
      receipts: tenStoreCloneApprovalEffective ? ["10-store internal winner clone packet approval receipt"] : [],
      status: tenStoreStatus,
      unlocks: tenStoreStatus === "proven" ? ["25-store bridge can use the first-store winner template."] : ["10-store readiness remains private and cannot execute externally."]
    }),
    proofStage({
      evidence: [
        `25-store bridge is ${input.scalePath.twentyFiveStore.status.replace(/_/g, " ")} at ${input.scalePath.twentyFiveStore.readinessPercent}%.`,
        `${input.scalePath.twentyFiveStore.applicationTemplatesReady} app templates, ${input.scalePath.twentyFiveStore.productTemplatesReady} product templates, ${input.scalePath.twentyFiveStore.contentTemplatesReady} content templates, and ${input.scalePath.twentyFiveStore.launchPacketsReady} launch packets are ready.`,
        `${input.scalePath.twentyFiveStore.currentStores}/${input.scalePath.twentyFiveStore.targetStores} stores tracked; ${input.scalePath.twentyFiveStore.gap} store gap remains.`
      ],
      label: "25-store private scale bridge",
      nextInternalAction: twentyFiveStatus === "proven" ? "prepare_100_store_private_scale_bridge" : input.scalePath.twentyFiveStore.nextInternalAction,
      order: 8,
      receipts: twentyFiveStoreCloneApprovalRecorded ? ["25-store internal winner clone packet approval receipt"] : [],
      status: twentyFiveStatus,
      unlocks: twentyFiveStatus === "proven" ? ["100-store operations readiness can become the active scale prep lane."] : ["25-store readiness waits for 10-store proof and a 25-store owner-gated clone approval receipt."]
    }),
    proofStage({
      evidence: [
        input.scalePath.hundredStore
          ? `100-store readiness is ${input.scalePath.hundredStore.readinessScore}/100 with ${input.scalePath.hundredStore.workerAssignmentsReady} worker assignment${input.scalePath.hundredStore.workerAssignmentsReady === 1 ? "" : "s"} ready.`
          : "100-store readiness plan is missing.",
        input.scalePath.hundredStore
          ? `${input.scalePath.hundredStore.gatesPass} gates pass, ${input.scalePath.hundredStore.gatesWatch} watch, ${input.scalePath.hundredStore.gatesBlocked} blocked.`
          : "100-store readiness gates are unavailable.",
        `${tenKMilestone?.label ?? "$10k/month"} is ${tenKMilestone?.status.replace(/_/g, " ") ?? "missing"}; ${hundredKMilestone?.label ?? "$100k/month"} is ${hundredKMilestone?.status.replace(/_/g, " ") ?? "missing"}.`
      ],
      label: "100-store private operations readiness",
      nextInternalAction: hundredStoreStatus === "proven" ? "maintain_100_store_private_scale_controls" : input.scalePath.hundredStore?.nextInternalAction ?? "load_100_store_operations_readiness",
      order: 9,
      receipts: hundredStoreCloneApprovalRecorded ? ["100-store internal winner clone packet approval receipt"] : [],
      status: hundredStoreStatus,
      unlocks: hundredStoreStatus === "proven" ? ["100-store operations are internally ready for owner-gated scale review."] : ["100-store scale waits for 10k/month proof, 25-store readiness, and a 100-store owner-gated scale approval receipt."]
    })
  ];

  const totals = stages.reduce<RevenuePortfolioDashboardFirstStoreToScaleProofChain["totals"]>((accumulator, stage) => {
    accumulator.stages += 1;
    if (stage.status === "proven") accumulator.proven += 1;
    if (stage.status === "current") accumulator.current += 1;
    if (stage.status === "owner_approval_required") accumulator.ownerApprovalRequired += 1;
    if (stage.status === "waiting_for_internal_packet") accumulator.waitingForInternalPacket += 1;
    if (stage.status === "waiting_for_live_evidence") accumulator.waitingForLiveEvidence += 1;
    if (stage.status === "waiting_for_scale_proof") accumulator.waitingForScaleProof += 1;
    if (stage.status === "blocked") accumulator.blocked += 1;

    return accumulator;
  }, {
    blocked: 0,
    current: 0,
    ownerApprovalRequired: 0,
    proven: 0,
    stages: 0,
    waitingForInternalPacket: 0,
    waitingForLiveEvidence: 0,
    waitingForScaleProof: 0
  });
  const status: RevenuePortfolioDashboardFirstStoreToScaleProofChain["status"] = totals.blocked > 0
    ? "blocked"
    : finalPacketStatus !== "proven" || totals.waitingForInternalPacket > 0
      ? "needs_internal_packet"
      : totals.ownerApprovalRequired > 0
        ? "needs_owner_approval"
        : totals.waitingForLiveEvidence > 0
          ? "needs_live_revenue_evidence"
          : totals.waitingForScaleProof > 0
            ? "needs_scale_proof"
            : totals.current > 0 ? "in_private_scale_preparation" : "first_store_to_scale_verified";
  const nextStage = stages.find((stage) => stage.status !== "proven") ?? stages[stages.length - 1];

  return {
    blockedExternalActions: cashLoopLockedExternalActions,
    externalExecution: false,
    nextInternalAction: nextStage?.nextInternalAction ?? "maintain_verified_first_store_to_scale_loop",
    providerContacted: false,
    stages,
    status,
    summary: `${totals.proven}/${totals.stages} first-store-to-scale proof stage${totals.stages === 1 ? "" : "s"} proven; ${totals.current} active, ${totals.ownerApprovalRequired} need owner approval, ${totals.waitingForInternalPacket} wait for the execution packet, ${totals.waitingForLiveEvidence} wait for live evidence, ${totals.waitingForScaleProof} wait for scale proof, and ${totals.blocked} are blocked. External execution remains locked.`,
    totals
  };
}

function cashLoopRequirement(input: {
  evidence: string[];
  id: RevenuePortfolioDashboardCashLoopVerificationAudit["requirements"][number]["id"];
  label: string;
  nextInternalAction: string;
  ownerApprovalRequired?: boolean;
  status: RevenuePortfolioDashboardCashLoopVerificationAudit["requirements"][number]["status"];
}): RevenuePortfolioDashboardCashLoopVerificationAudit["requirements"][number] {
  return {
    evidence: input.evidence,
    externalActionsLocked: cashLoopLockedExternalActions,
    id: input.id,
    label: input.label,
    nextInternalAction: input.nextInternalAction,
    ownerApprovalRequired: input.ownerApprovalRequired ?? (
      input.status === "owner_approval_required" || input.status === "waiting_for_scale_proof"
    ),
    status: input.status
  };
}

function buildCashLoopVerificationAudit(input: {
  cashLoopStage: RevenuePortfolioDashboardCashLoopStage;
  connectionChecks: RevenuePortfolioDashboardConnectionCheck[];
  dailyRevenueLoop: RevenuePortfolioDashboardDailyRevenueLoop;
  evidenceLedger: RevenuePortfolioDashboardCashLoopEvidenceLedger;
  executionPacket: RevenuePortfolioDashboardFirstStoreCashLoop["executionPacket"];
  firstRevenueProof: RevenuePortfolioDashboardFirstStoreRevenueProof;
  firstWeekRevenueLoop: RevenuePortfolioDashboardFirstWeekRevenueLoop;
  hundredStore: RevenuePortfolioDashboardFirstStoreCashLoop["scalePath"]["hundredStore"];
  launchReadiness: RevenuePortfolioDashboardFirstStoreCashLoop["launchReadiness"];
  manualLaunchPacket: RevenuePortfolioDashboardManualLaunchPacket;
  ownerLaunchApproval: RevenuePortfolioDashboardOwnerLaunchApprovalPacket;
  revenueMilestonePath: RevenuePortfolioDashboardRevenueMilestonePath;
  tenStore: RevenuePortfolioDashboardFirstStoreCashLoop["scalePath"]["tenStore"];
  twentyFiveStore: RevenuePortfolioDashboardFirstStoreCashLoop["scalePath"]["twentyFiveStore"];
  winnerScaleLadder: RevenuePortfolioDashboardWinnerScaleLadder;
}): RevenuePortfolioDashboardCashLoopVerificationAudit {
  const connectionCategories = new Set(input.connectionChecks.map((check) => check.category));
  const missingConnectionCategories = requiredCashLoopConnectionCategories.filter((category) => !connectionCategories.has(category));
  const blockedConnections = input.connectionChecks.filter((check) => check.status === "blocked" || check.status === "missing");
  const ownerGatedConnections = input.connectionChecks.filter((check) => check.status === "approval_required");
  const firstMilestone = input.revenueMilestonePath.milestones.find((milestone) => milestone.label === "First Real Revenue") ?? null;
  const tenKMilestone = input.revenueMilestonePath.milestones.find((milestone) => milestone.label === "$10k/month") ?? null;
  const hundredKMilestone = input.revenueMilestonePath.milestones.find((milestone) => milestone.label === "$100k/month") ?? null;
  const selectedTotals = input.evidenceLedger.selectedStore.totals;
  const launchEvidenceCoverage = input.evidenceLedger.selectedStore.launchEvidenceCoverage;
  const firstWeekSignalCoverage = input.evidenceLedger.selectedStore.firstWeekSignalCoverage;
  const ownerApprovalReceiptVisible = selectedTotals.ownerApprovals > 0;
  const manualLaunchEvidenceReceiptVisible = launchEvidenceCoverage.ready;
  const manualSignalReceiptVisible = selectedTotals.manualSignals > 0;
  const scaleProofReady = input.winnerScaleLadder.proofGate.status === "ready_for_owner_scale_review";
  const tenStoreCloneApprovalReceiptVisible = selectedTotals.cloneApprovalsByTarget.tenStore > 0;
  const twentyFiveStoreCloneApprovalReceiptVisible = selectedTotals.cloneApprovalsByTarget.twentyFiveStore > 0;
  const hundredStoreCloneApprovalReceiptVisible = selectedTotals.cloneApprovalsByTarget.hundredStore > 0;
  const tenStoreCloneApprovalEffective = tenStoreCloneApprovalReceiptVisible && scaleProofReady;
  const targetScaleApprovalPathReady = tenStoreCloneApprovalEffective
    && twentyFiveStoreCloneApprovalReceiptVisible
    && hundredStoreCloneApprovalReceiptVisible
    && tenKMilestone?.status === "achieved";
  const cloneApprovalTargetSummary = `target clone approvals: 10-store ${selectedTotals.cloneApprovalsByTarget.tenStore}, 25-store ${selectedTotals.cloneApprovalsByTarget.twentyFiveStore}, 100-store ${selectedTotals.cloneApprovalsByTarget.hundredStore}, unscoped ${selectedTotals.cloneApprovalsByTarget.unscoped}`;
  const receiptChainStatus: RevenuePortfolioDashboardCashLoopVerificationAudit["requirements"][number]["status"] = input.cashLoopStage.status === "blocked"
    || input.cashLoopStage.status === "waiting_for_execution_packet"
    ? "blocked"
    : input.cashLoopStage.status === "scale_packet_approved" || input.cashLoopStage.receiptsNeeded.length === 0
      ? "proven"
      : input.cashLoopStage.status === "waiting_for_owner_launch_approval"
        ? "owner_approval_required"
        : input.cashLoopStage.status === "waiting_for_scale_packet_approval"
          ? "waiting_for_scale_proof"
          : "waiting_for_live_evidence";
  const manualPacketComplete = Boolean(
    input.manualLaunchPacket.store
    && input.manualLaunchPacket.product
    && input.manualLaunchPacket.listing.title
    && input.manualLaunchPacket.supplier.status === "selected_internal_owner_gated"
    && input.manualLaunchPacket.organicFirstWeek.length >= 4
    && input.manualLaunchPacket.manualSteps.length > 0
    && input.manualLaunchPacket.rollbackPlan.length > 0
    && input.manualLaunchPacket.auditTrail.length > 0
  );
  const scaleStageBlocked = input.winnerScaleLadder.stages.some((stage) => stage.status === "blocked");
  const scaleStageOwnerReview = input.winnerScaleLadder.stages.some((stage) => stage.status === "approval_required");
  const safetyLocked = input.manualLaunchPacket.externalExecution === false
    && input.manualLaunchPacket.providerContacted === false
    && input.firstWeekRevenueLoop.externalExecution === false
    && input.firstWeekRevenueLoop.providerContacted === false
    && input.ownerLaunchApproval.externalExecution === false
    && input.ownerLaunchApproval.providerContacted === false
    && input.revenueMilestonePath.externalExecution === false
    && input.revenueMilestonePath.providerContacted === false
    && input.winnerScaleLadder.externalExecution === false
    && input.winnerScaleLadder.providerContacted === false;

  const requirements: RevenuePortfolioDashboardCashLoopVerificationAudit["requirements"] = [
    cashLoopRequirement({
      evidence: [
        input.executionPacket.status === "ready_from_final_execution_packet"
          ? `${input.executionPacket.label} is ready from the approved final execution packet.`
          : `${input.executionPacket.label} is ${input.executionPacket.status.replace(/_/g, " ")} with source ${input.executionPacket.source.replace(/_/g, " ")}.`,
        `${input.executionPacket.products} product${input.executionPacket.products === 1 ? "" : "s"}, ${input.executionPacket.manualSteps} manual step${input.executionPacket.manualSteps === 1 ? "" : "s"}, ${input.executionPacket.semiAutomatedSteps} semi-auto step${input.executionPacket.semiAutomatedSteps === 1 ? "" : "s"}, ${input.executionPacket.firstWeekMetricFields} first-week metric field${input.executionPacket.firstWeekMetricFields === 1 ? "" : "s"}.`,
        `${input.executionPacket.readinessReady} readiness gate${input.executionPacket.readinessReady === 1 ? "" : "s"} ready and ${input.executionPacket.readinessBlocked} blocked.`
      ],
      id: "final_execution_packet",
      label: "Approved First-Business Final Execution Packet",
      nextInternalAction: input.executionPacket.status === "ready_from_final_execution_packet"
        ? "review_owner_manual_launch_approval"
        : "complete_first_business_final_execution_packet",
      status: input.executionPacket.status === "ready_from_final_execution_packet" && input.executionPacket.readinessBlocked === 0
        ? "proven"
        : input.executionPacket.status === "blocked" ? "blocked" : "waiting_for_live_evidence"
    }),
    cashLoopRequirement({
      evidence: [
        `${requiredCashLoopConnectionCategories.length - missingConnectionCategories.length}/${requiredCashLoopConnectionCategories.length} required connection categories are represented.`,
        `${blockedConnections.length} missing or blocked connection${blockedConnections.length === 1 ? "" : "s"}; ${ownerGatedConnections.length} owner-gated connection${ownerGatedConnections.length === 1 ? "" : "s"}.`,
        input.connectionChecks.map((check) => `${check.label}: ${check.status.replace(/_/g, " ")}`).join(" / ")
      ],
      id: "launch_readiness_connections",
      label: "Storefront, POD, Payments, Content, Analytics, Ads Readiness",
      nextInternalAction: blockedConnections[0]?.nextInternalAction
        ?? ownerGatedConnections[0]?.nextInternalAction
        ?? input.launchReadiness.nextInternalAction,
      ownerApprovalRequired: ownerGatedConnections.length > 0,
      status: missingConnectionCategories.length > 0 || blockedConnections.length > 0
        ? "blocked"
        : ownerGatedConnections.length > 0 ? "owner_approval_required" : "proven"
    }),
    cashLoopRequirement({
      evidence: [
        input.manualLaunchPacket.store
          ? `${input.manualLaunchPacket.store.name} on ${input.manualLaunchPacket.store.platform}.`
          : "Store packet is missing.",
        input.manualLaunchPacket.product
          ? `${input.manualLaunchPacket.product.name} at $${input.manualLaunchPacket.product.retailPrice.toFixed(2)} with ${input.manualLaunchPacket.product.marginPercent}% margin.`
          : "Product packet is missing.",
        `${input.manualLaunchPacket.organicFirstWeek.length} organic first-week checkpoint${input.manualLaunchPacket.organicFirstWeek.length === 1 ? "" : "s"}, ${input.manualLaunchPacket.rollbackPlan.length} rollback item${input.manualLaunchPacket.rollbackPlan.length === 1 ? "" : "s"}, and ${input.manualLaunchPacket.auditTrail.length} audit event${input.manualLaunchPacket.auditTrail.length === 1 ? "" : "s"}.`,
        `${selectedTotals.launchEvidence} selected-store manual launch evidence receipt${selectedTotals.launchEvidence === 1 ? "" : "s"} visible.`,
        launchEvidenceCoverage.summary
      ],
      id: "manual_launch_packet",
      label: "Manual/Semi-Auto First Store Launch Packet",
      nextInternalAction: manualPacketComplete
        ? manualLaunchEvidenceReceiptVisible ? "record_manual_first_week_signals" : "review_owner_manual_launch_approval"
        : "repair_manual_launch_packet",
      status: manualPacketComplete ? "proven" : input.manualLaunchPacket.status === "blocked" ? "blocked" : "waiting_for_live_evidence"
    }),
    cashLoopRequirement({
      evidence: [
        input.ownerLaunchApproval.summary,
        `${input.ownerLaunchApproval.preflightChecks.length} preflight check${input.ownerLaunchApproval.preflightChecks.length === 1 ? "" : "s"} and ${input.ownerLaunchApproval.manualOnlyActions.length} manual-only action${input.ownerLaunchApproval.manualOnlyActions.length === 1 ? "" : "s"} are in the owner packet.`,
        `Approval phrase: ${input.ownerLaunchApproval.approvalPhrase}.`,
        `${selectedTotals.ownerApprovals} selected-store owner launch approval receipt${selectedTotals.ownerApprovals === 1 ? "" : "s"} visible.`
      ],
      id: "owner_launch_approval",
      label: "Owner Manual Live Launch Approval Gate",
      nextInternalAction: ownerApprovalReceiptVisible
        ? "record_first_store_manual_launch_evidence"
        : input.ownerLaunchApproval.unlockBoundary.nextInternalAction,
      ownerApprovalRequired: !ownerApprovalReceiptVisible && input.ownerLaunchApproval.status === "ready_for_owner_review",
      status: ownerApprovalReceiptVisible
        ? "proven"
        : input.ownerLaunchApproval.status === "ready_for_owner_review"
          ? "owner_approval_required"
          : input.ownerLaunchApproval.status === "blocked" ? "blocked" : "waiting_for_live_evidence"
    }),
    cashLoopRequirement({
      evidence: [
        input.firstWeekRevenueLoop.summary,
        `${input.firstWeekRevenueLoop.metricFields.length} metric field${input.firstWeekRevenueLoop.metricFields.length === 1 ? "" : "s"}, ${input.firstWeekRevenueLoop.checkIns.length} check-in${input.firstWeekRevenueLoop.checkIns.length === 1 ? "" : "s"}, and ${input.dailyRevenueLoop.signalIngest.manualSnapshots} manual snapshot${input.dailyRevenueLoop.signalIngest.manualSnapshots === 1 ? "" : "s"} are visible.`,
        launchEvidenceCoverage.ready ? "Required launch evidence coverage is complete before first-week signals." : launchEvidenceCoverage.summary,
        firstWeekSignalCoverage.ready ? "Required first-week signal coverage is complete before scale review." : firstWeekSignalCoverage.summary,
        `First revenue milestone is ${firstMilestone?.status.replace(/_/g, " ") ?? "missing"}.`,
        `${selectedTotals.manualSignals} selected-store manual signal receipt${selectedTotals.manualSignals === 1 ? "" : "s"} visible.`,
        input.firstRevenueProof.summary
      ],
      id: "first_week_signal_capture",
      label: "First-Week Manual Revenue Signal Capture",
      nextInternalAction: firstWeekSignalCoverage.ready
        ? "maintain_first_week_signal_ledger"
        : manualSignalReceiptVisible
          ? "continue_daily_first_store_signal_capture"
          : launchEvidenceCoverage.ready ? input.firstWeekRevenueLoop.rotationReview.nextInternalAction : "record_first_store_manual_launch_evidence",
      status: firstWeekSignalCoverage.ready
        ? "proven"
        : input.firstWeekRevenueLoop.status === "blocked" ? "blocked" : "waiting_for_live_evidence"
    }),
    cashLoopRequirement({
      evidence: [
        input.dailyRevenueLoop.signalIngest.summary,
        `scalePressure ${input.dailyRevenueLoop.decision.scalePressure}/100, killPressure ${input.dailyRevenueLoop.decision.killPressure}/100, recommendation ${input.dailyRevenueLoop.decision.recommendation}.`,
        `${input.dailyRevenueLoop.advisoryAllocation.adGrowthPercent}/${input.dailyRevenueLoop.advisoryAllocation.entralOperationsPercent}/${input.dailyRevenueLoop.advisoryAllocation.ownerIncomePercent} advisory allocation; ${input.dailyRevenueLoop.nextActions.length} next action${input.dailyRevenueLoop.nextActions.length === 1 ? "" : "s"}.`
      ],
      id: "daily_revenue_loop",
      label: "Daily Revenue Loop And 25/25/50 Advisory Allocation",
      nextInternalAction: input.dailyRevenueLoop.nextActions[0]?.nextInternalAction ?? "record_manual_revenue_signals",
      ownerApprovalRequired: input.dailyRevenueLoop.nextActions.some((action) => action.status === "approval_required"),
      status: input.dailyRevenueLoop.signalIngest.status === "missing"
        ? "waiting_for_live_evidence"
        : input.dailyRevenueLoop.nextActions.length >= 3 ? "proven" : "waiting_for_live_evidence"
    }),
    cashLoopRequirement({
      evidence: [
        input.evidenceLedger.summary,
        input.evidenceLedger.selectedStore.summary,
        `${input.evidenceLedger.totals.receipts} receipt${input.evidenceLedger.totals.receipts === 1 ? "" : "s"} total: owner ${input.evidenceLedger.totals.ownerApprovals}, launch evidence ${input.evidenceLedger.totals.launchEvidence}, manual signals ${input.evidenceLedger.totals.manualSignals}, clone approvals ${input.evidenceLedger.totals.cloneApprovals}.`,
        `${selectedTotals.receipts} selected-store receipt${selectedTotals.receipts === 1 ? "" : "s"} total: owner ${selectedTotals.ownerApprovals}, launch evidence ${selectedTotals.launchEvidence}, manual signals ${selectedTotals.manualSignals}, clone approvals ${selectedTotals.cloneApprovals}; ${cloneApprovalTargetSummary}.`,
        input.cashLoopStage.receiptsRecorded.length > 0
          ? `Recorded: ${input.cashLoopStage.receiptsRecorded.join(" / ")}.`
          : "No receipt-chain proof has been recorded yet.",
        input.cashLoopStage.receiptsNeeded.length > 0
          ? `Needed: ${input.cashLoopStage.receiptsNeeded.join(" / ")}.`
          : "No receipt-chain proof items remain in the current internal audit state."
      ],
      id: "cash_loop_evidence_ledger",
      label: "Persistent Cash Loop Receipt Chain",
      nextInternalAction: input.cashLoopStage.nextOwnerAction.nextInternalAction,
      ownerApprovalRequired: receiptChainStatus === "owner_approval_required" || receiptChainStatus === "waiting_for_scale_proof",
      status: receiptChainStatus
    }),
    cashLoopRequirement({
      evidence: [
        input.winnerScaleLadder.summary,
        input.winnerScaleLadder.proofGate.evidenceSummary,
        input.winnerScaleLadder.stages.map((stage) => `${stage.targetStores} stores: ${stage.status.replace(/_/g, " ")} at ${stage.readinessPercent}%`).join(" / "),
        `${selectedTotals.cloneApprovals} selected-store internal clone approval receipt${selectedTotals.cloneApprovals === 1 ? "" : "s"} visible; ${cloneApprovalTargetSummary}.`,
        tenKMilestone?.status === "achieved" ? "$10k/month proof is achieved for the 100-store bridge." : "$10k/month proof is still required before 100-store approval can be treated as ready."
      ],
      id: "proven_winner_scale_ladder",
      label: "Proven-Winner 10/25/100 Store Scale Ladder",
      nextInternalAction: targetScaleApprovalPathReady
        ? "maintain_private_clone_packet_audit"
        : !tenStoreCloneApprovalEffective
          ? input.winnerScaleLadder.stages.find((stage) => stage.status === "blocked")?.nextInternalAction
            ?? input.winnerScaleLadder.proofGate.nextInternalAction
          : !twentyFiveStoreCloneApprovalReceiptVisible
            ? "review_25_store_private_scale_bridge"
            : tenKMilestone?.status !== "achieved"
              ? "prove_10k_month_before_100_store_scale"
              : !hundredStoreCloneApprovalReceiptVisible
                ? "review_100_store_private_scale_bridge"
                : "maintain_private_clone_packet_audit",
      ownerApprovalRequired: !targetScaleApprovalPathReady && scaleProofReady && scaleStageOwnerReview,
      status: targetScaleApprovalPathReady
        ? "proven"
        : scaleStageBlocked
        ? "blocked"
        : input.winnerScaleLadder.proofGate.status === "waiting_for_first_sale" ? "waiting_for_live_evidence"
          : scaleProofReady && scaleStageOwnerReview ? "owner_approval_required" : "waiting_for_scale_proof"
    }),
    cashLoopRequirement({
      evidence: [
        input.revenueMilestonePath.summary,
        `${tenKMilestone?.label ?? "$10k/month"} is ${tenKMilestone?.status.replace(/_/g, " ") ?? "missing"} with gap $${(tenKMilestone?.gapMonthlyRevenue ?? 0).toFixed(2)}.`,
        `${hundredKMilestone?.label ?? "$100k/month"} is ${hundredKMilestone?.status.replace(/_/g, " ") ?? "missing"} with gap $${(hundredKMilestone?.gapMonthlyRevenue ?? 0).toFixed(2)}.`
      ],
      id: "revenue_milestones",
      label: "First Revenue To $10k/month To $100k/month Milestone Path",
      nextInternalAction: hundredKMilestone?.nextInternalAction ?? tenKMilestone?.nextInternalAction ?? "record_first_revenue_evidence",
      ownerApprovalRequired: tenKMilestone?.status === "ready_for_owner_review" || hundredKMilestone?.status === "ready_for_owner_review",
      status: hundredKMilestone?.status === "achieved"
        ? "proven"
        : hundredKMilestone?.status === "blocked" ? "blocked"
          : tenKMilestone?.status === "waiting_for_first_sale" ? "waiting_for_live_evidence"
            : "waiting_for_scale_proof"
    }),
    cashLoopRequirement({
      evidence: [
        input.hundredStore
          ? `${input.hundredStore.workerAssignmentsReady} worker assignment${input.hundredStore.workerAssignmentsReady === 1 ? "" : "s"} ready, ${input.hundredStore.dailySupervisorSelected} daily supervisor item${input.hundredStore.dailySupervisorSelected === 1 ? "" : "s"} selected.`
          : "100-store operations plan is not attached.",
        input.hundredStore
          ? `${input.hundredStore.gatesPass} gates pass, ${input.hundredStore.gatesWatch} watch, ${input.hundredStore.gatesBlocked} blocked.`
          : "100-store readiness gates are missing.",
        `${input.tenStore.currentStores}/${input.tenStore.targetStores} stores toward 10 and ${input.twentyFiveStore.currentStores}/${input.twentyFiveStore.targetStores} stores toward 25.`
      ],
      id: "hundred_store_worker_assignments",
      label: "100-Store Worker Assignment And Readiness Layer",
      nextInternalAction: input.hundredStore?.gatesBlocked
        ? "repair_100_store_readiness_gates"
        : input.hundredStore?.nextInternalAction ?? "attach_100_store_operations_plan",
      status: !input.hundredStore || input.hundredStore.gatesBlocked > 0
        ? "blocked"
        : input.hundredStore.workerAssignmentsReady > 0 ? "proven" : "waiting_for_scale_proof"
    }),
    cashLoopRequirement({
      evidence: [
        safetyLocked
          ? "Every first-store, signal, milestone, and scale audit artifact reports externalExecution false and providerContacted false."
          : "At least one cash-loop artifact is not safety locked.",
        input.ownerLaunchApproval.unlockBoundary.stillLocked[0] ?? "External actions remain locked.",
        input.revenueMilestonePath.milestones[0]?.guardrail ?? "Milestone progress stays advisory only."
      ],
      id: "safety_lock",
      label: "Private Internal Approval-Gated Safety Lock",
      nextInternalAction: safetyLocked ? "maintain_private_approval_gates" : "repair_cash_loop_safety_boundary",
      status: safetyLocked ? "proven" : "blocked"
    })
  ];
  const totals = requirements.reduce<RevenuePortfolioDashboardCashLoopVerificationAudit["totals"]>((accumulator, requirement) => {
    accumulator.requirements += 1;
    if (requirement.status === "proven") accumulator.proven += 1;
    if (requirement.status === "owner_approval_required") accumulator.ownerApprovalRequired += 1;
    if (requirement.status === "waiting_for_live_evidence") accumulator.waitingForLiveEvidence += 1;
    if (requirement.status === "waiting_for_scale_proof") accumulator.waitingForScaleProof += 1;
    if (requirement.status === "blocked") accumulator.blocked += 1;

    return accumulator;
  }, {
    blocked: 0,
    ownerApprovalRequired: 0,
    proven: 0,
    requirements: 0,
    waitingForLiveEvidence: 0,
    waitingForScaleProof: 0
  });
  const status: RevenuePortfolioDashboardCashLoopVerificationAudit["status"] = totals.blocked > 0
    ? "blocked"
    : totals.waitingForLiveEvidence > 0 ? "needs_live_revenue_evidence"
      : totals.waitingForScaleProof > 0 ? "needs_scale_proof"
        : totals.ownerApprovalRequired > 0 ? "needs_owner_approval" : "verified_internal_ready";
  const nextRequirement = requirements.find((requirement) => requirement.status === "blocked")
    ?? requirements.find((requirement) => requirement.status === "waiting_for_live_evidence")
    ?? requirements.find((requirement) => requirement.status === "waiting_for_scale_proof")
    ?? requirements.find((requirement) => requirement.status === "owner_approval_required")
    ?? null;

  return {
    externalExecution: false,
    nextInternalAction: nextRequirement?.nextInternalAction ?? "maintain_verified_cash_loop_audit",
    providerContacted: false,
    requirements,
    status,
    summary: `${totals.proven}/${totals.requirements} first-store-to-scale requirements are proven from current internal evidence; ${totals.ownerApprovalRequired} need owner approval, ${totals.waitingForLiveEvidence} wait for live evidence, ${totals.waitingForScaleProof} wait for scale proof, and ${totals.blocked} are blocked. External execution remains locked.`,
    totals
  };
}

function buildTwentyFiveStoreScaleBridge(input: {
  currentStores: number;
  finalExecution: RevenueFirstBusinessExecutionPlan | null;
  hundredStoreOperationsPlan?: RevenueHundredStoreOperationsPlan | null;
}): RevenuePortfolioDashboardFirstStoreCashLoop["scalePath"]["twentyFiveStore"] {
  const targetStores = 25 as const;
  const launchQueue = input.hundredStoreOperationsPlan?.launchPacketQueue ?? null;
  const productQueue = input.hundredStoreOperationsPlan?.productDepthQueue ?? null;
  const finalProducts = input.finalExecution?.listingProductPack.length ?? 0;
  const finalContent = input.finalExecution?.launchHandoffPacket.contentCalendar.length ?? 0;
  const finalOrganic = input.finalExecution?.launchHandoffPacket.organicLaunchMoves.length ?? 0;
  const launchPacketsReady = launchQueue?.totals.readyForReview ?? 0;
  const productTemplatesReady = finalProducts + (productQueue?.totals.readyDrafts ?? 0);
  const contentTemplatesReady = finalContent
    + finalOrganic
    + (launchQueue?.packets.reduce((sum, packet) => sum + packet.contentIdeas.length + packet.organicMoves.length, 0) ?? 0);
  const applicationTemplatesReady = input.hundredStoreOperationsPlan?.applicationConnectionWorkbench.totals.futureStoreTemplates ?? 0;
  const reusableTemplateSlots = Math.max(
    input.currentStores,
    launchPacketsReady,
    productQueue?.totals.storesCovered ?? 0,
    applicationTemplatesReady
  );
  const hasFinalTemplate = finalProducts > 0 && (finalContent > 0 || finalOrganic > 0);
  const status: RevenuePortfolioDashboardFirstStoreCashLoop["scalePath"]["twentyFiveStore"]["status"] = !hasFinalTemplate
    ? "blocked"
    : reusableTemplateSlots >= targetStores && launchPacketsReady >= targetStores && productTemplatesReady >= targetStores && contentTemplatesReady >= targetStores
      ? "ready"
      : launchPacketsReady > 0 || productTemplatesReady > 0 || contentTemplatesReady > 0
        ? "approval_required"
        : "watch";

  return {
    applicationTemplatesReady,
    contentTemplatesReady,
    currentStores: input.currentStores,
    gap: Math.max(0, targetStores - input.currentStores),
    launchPacketsReady,
    nextInternalAction: status === "ready"
      ? "Review the 25-store clone bridge after first-sale proof, then duplicate only the winning product/store/content template."
      : hasFinalTemplate
        ? "Expand reusable launch packets, product drafts, content hooks, and app templates to cover 25 internal store slots."
        : "Approve and verify the first-store final execution packet before any 25-store clone bridge.",
    productTemplatesReady,
    readinessPercent: percent(Math.min(targetStores, reusableTemplateSlots), targetStores),
    status,
    targetStores,
    templateSource: input.finalExecution
      ? "final_execution_packet"
      : launchPacketsReady > 0 ? "hundred_store_launch_packets" : "none"
  };
}

function scaleStage(input: {
  approvalPrerequisiteReady?: boolean;
  hasFinalTemplate: boolean;
  proofReady: boolean;
  readinessPercent: number;
  prerequisiteBlocker?: string;
  targetStores: 10 | 25 | 100;
  templateSource: "final_execution_packet" | "hundred_store_launch_packets" | "none";
  unresolvedGateCount?: number;
}): RevenuePortfolioDashboardWinnerScaleLadder["stages"][number] {
  const blockedActions = [
    "Creating live provider products, uploading artwork, publishing cloned listings, opening storefronts, posting content, spending money, moving payouts, or calling external APIs",
    "Scaling a product/store/content template before first-sale proof and owner scale approval"
  ];
  const allowedInternalActions = [
    "Duplicate internal product, listing, storefront, and content templates into draft packets",
    "Prepare manual signal fields and approval packets for owner review",
    "Keep clone batches private until live launch approval is explicit"
  ];
  const prerequisiteReady = input.approvalPrerequisiteReady ?? true;
  const proofRequired = input.prerequisiteBlocker
    ? `Manual first-sale proof, gross revenue, net profit, traffic/content response, day-7 scale/watch/pause/kill review, and ${input.prerequisiteBlocker} are required before clone approval.`
    : "Manual first-sale proof, gross revenue, net profit, traffic/content response, and day-7 scale/watch/pause/kill review are required before clone approval.";
  const status: RevenuePortfolioDashboardWinnerScaleLadder["stages"][number]["status"] = !input.hasFinalTemplate
    ? "blocked"
    : input.unresolvedGateCount && input.unresolvedGateCount > 0
      ? "blocked"
      : input.proofReady && prerequisiteReady
        ? "approval_required"
        : "waiting_for_proof";

  return {
    allowedInternalActions,
    blockedExternalActions: blockedActions,
    nextInternalAction: status === "blocked"
      ? input.unresolvedGateCount && input.unresolvedGateCount > 0
        ? `Resolve ${input.unresolvedGateCount} blocked 100-store readiness gate${input.unresolvedGateCount === 1 ? "" : "s"} before clone review.`
        : "Complete the first-store final execution packet before clone review."
      : status === "waiting_for_proof"
        ? input.proofReady && !prerequisiteReady && input.prerequisiteBlocker
          ? input.prerequisiteBlocker
          : "Capture first-store manual revenue, profit, traffic, content, and day-7 rotation evidence."
        : `Owner scale review: approve or reject the ${input.targetStores}-store internal clone packet.`,
    proofRequired,
    readinessPercent: input.readinessPercent,
    status,
    targetStores: input.targetStores,
    templateSource: input.templateSource
  };
}

function clonePacketTaskStatus(input: {
  stageStatus: RevenuePortfolioDashboardWinnerScaleLadder["stages"][number]["status"];
  templateReady: boolean;
}): RevenuePortfolioDashboardWinnerScaleLadder["clonePackets"][number]["tasks"][number]["status"] {
  if (!input.templateReady || input.stageStatus === "blocked") return "blocked";
  if (input.stageStatus === "waiting_for_proof") return "waiting_for_proof";
  if (input.stageStatus === "approval_required") return "approval_required";

  return "ready_internal";
}

function buildClonePacketTasks(input: {
  cloneTemplates: RevenuePortfolioDashboardWinnerScaleLadder["cloneTemplates"];
  stage: RevenuePortfolioDashboardWinnerScaleLadder["stages"][number];
}): RevenuePortfolioDashboardWinnerScaleLadder["clonePackets"][number]["tasks"] {
  return input.cloneTemplates.map((template) => {
    const status = clonePacketTaskStatus({
      stageStatus: input.stage.status,
      templateReady: template.ready
    });
    const categoryLabel = template.type.replace(/_/g, " ");

    return {
      category: template.type,
      detail: template.ready
        ? template.detail
        : `The ${categoryLabel} template is not ready for internal cloning yet.`,
      nextInternalAction: status === "approval_required" || status === "ready_internal"
        ? `draft_${template.type}_clone_packet_for_${input.stage.targetStores}_store_stage`
        : status === "waiting_for_proof"
          ? "capture_first_store_revenue_profit_content_and_rotation_proof"
          : "repair_source_template_before_clone_packet",
      status,
      title: `${input.stage.targetStores}-store ${categoryLabel} clone task`
    };
  });
}

function buildClonePacketDraftSlots(input: {
  cloneTemplates: RevenuePortfolioDashboardWinnerScaleLadder["cloneTemplates"];
  stage: RevenuePortfolioDashboardWinnerScaleLadder["stages"][number];
}): RevenuePortfolioDashboardWinnerScaleLadder["clonePackets"][number]["draftSlots"] {
  const templateDetail = (type: RevenuePortfolioDashboardWinnerScaleLadder["cloneTemplates"][number]["type"]) => (
    input.cloneTemplates.find((template) => template.type === type)?.detail
      ?? `${type.replace(/_/g, " ")} template is not ready.`
  );
  const status: RevenuePortfolioDashboardWinnerScaleLadder["clonePackets"][number]["draftSlots"][number]["status"] = input.stage.status === "blocked"
    ? "blocked"
    : input.stage.status === "waiting_for_proof" ? "waiting_for_proof" : "approval_required";

  return Array.from({ length: Math.max(0, input.stage.targetStores - 1) }, (_, index) => {
    const slot = index + 2;

    return {
      blockedExternalActions: input.stage.blockedExternalActions,
      contentTemplate: templateDetail("content"),
      externalExecution: false,
      listingTemplate: templateDetail("listing"),
      nextInternalAction: status === "approval_required"
        ? `draft_private_clone_slot_${slot}_for_${input.stage.targetStores}_store_stage`
        : status === "waiting_for_proof"
          ? "capture_first_store_revenue_profit_content_and_rotation_proof"
          : "repair_source_template_before_clone_slot",
      productTemplate: templateDetail("product"),
      providerContacted: false,
      signalTemplate: templateDetail("signal"),
      slot,
      status,
      storeTemplate: templateDetail("storefront"),
      title: `${input.stage.targetStores}-store private clone slot ${slot}`
    };
  });
}

function buildScaleClonePackets(input: {
  cloneTemplates: RevenuePortfolioDashboardWinnerScaleLadder["cloneTemplates"];
  proofGate: RevenuePortfolioDashboardWinnerScaleLadder["proofGate"];
  stages: RevenuePortfolioDashboardWinnerScaleLadder["stages"];
}): RevenuePortfolioDashboardWinnerScaleLadder["clonePackets"] {
  return input.stages.map((stage) => {
    const status: RevenuePortfolioDashboardWinnerScaleLadder["clonePackets"][number]["status"] = stage.status === "approval_required" || stage.status === "ready_internal"
      ? "approval_required"
      : stage.status === "blocked" ? "blocked" : "waiting_for_proof";
    const draftCloneSlots = Math.max(0, stage.targetStores - 1);

    return {
      approvalPhrase: "APPROVE INTERNAL WINNER CLONE PACKET",
      auditTrail: [
        "Uses the approved first-store final execution packet as the source template.",
        "Requires first-store revenue/profit/content/rotation proof before owner scale approval.",
        "Creates private internal draft tasks only; external clone execution remains locked."
      ],
      blockedExternalActions: stage.blockedExternalActions,
      draftCloneSlots,
      draftSlots: buildClonePacketDraftSlots({
        cloneTemplates: input.cloneTemplates,
        stage
      }),
      externalExecution: false,
      nextInternalAction: stage.nextInternalAction,
      ownerApprovalRequired: status === "approval_required",
      proofSummary: input.proofGate.evidenceSummary,
      providerContacted: false,
      readinessPercent: stage.readinessPercent,
      requiredProof: input.proofGate.requiredSignals,
      sourceTemplate: stage.templateSource,
      status,
      summary: status === "approval_required"
        ? `${draftCloneSlots} private clone draft slot${draftCloneSlots === 1 ? "" : "s"} can be reviewed for the ${stage.targetStores}-store stage. Owner approval is still required before any external clone action.`
        : status === "waiting_for_proof"
          ? `${draftCloneSlots} private clone draft slot${draftCloneSlots === 1 ? "" : "s"} stay locked until first-store proof and day-7 rotation evidence are captured.`
          : `${stage.targetStores}-store clone packet is blocked until source templates and readiness gates are repaired.`,
      targetStores: stage.targetStores,
      tasks: buildClonePacketTasks({
        cloneTemplates: input.cloneTemplates,
        stage
      })
    };
  });
}

function buildWinnerScaleLadder(input: {
  dailyRevenueLoop: RevenuePortfolioDashboardDailyRevenueLoop;
  evidenceLedger: RevenuePortfolioDashboardCashLoopEvidenceLedger;
  finalExecution: RevenueFirstBusinessExecutionPlan | null;
  firstRevenueProof: RevenuePortfolioDashboardFirstStoreRevenueProof;
  firstWeekSignalCoverage: RevenuePortfolioDashboardFirstWeekSignalCoverage;
  firstWeekRevenueLoop: RevenuePortfolioDashboardFirstWeekRevenueLoop;
  hundredStoreOperationsPlan?: RevenueHundredStoreOperationsPlan | null;
  kpis: RevenuePortfolioDashboardPlan["kpis"];
  tenStore: RevenuePortfolioDashboardFirstStoreCashLoop["scalePath"]["tenStore"];
  twentyFiveStore: RevenuePortfolioDashboardFirstStoreCashLoop["scalePath"]["twentyFiveStore"];
}): RevenuePortfolioDashboardWinnerScaleLadder {
  const product = input.finalExecution?.listingProductPack[0] ?? null;
  const hasFinalTemplate = Boolean(input.finalExecution && product);
  const hasManualSignal = input.dailyRevenueLoop.signalIngest.manualSnapshots > 0;
  const hasRevenueProof = input.firstRevenueProof.firstRevenueCaptured && input.firstRevenueProof.netProfit > 0;
  const hasFirstWeekSignalProof = input.firstWeekSignalCoverage.ready;
  const proofReady = hasFinalTemplate && hasManualSignal && hasRevenueProof && hasFirstWeekSignalProof;
  const proofGateStatus: RevenuePortfolioDashboardWinnerScaleLadder["proofGate"]["status"] = !hasFinalTemplate
    ? "blocked"
    : proofReady ? "ready_for_owner_scale_review" : "waiting_for_first_sale";
  const requiredSignals = [
    "Manual first sale or no-sale snapshot",
    "Gross revenue, units sold, and net profit",
    "Traffic, clicks, content views, and conversion notes",
    "Day 7 scale/watch/pause/kill recommendation"
  ];
  const firstWeekReady = input.firstWeekRevenueLoop.status === "ready_for_manual_signal_capture";
  const hundred = input.hundredStoreOperationsPlan ?? null;
  const tenStoreCloneApprovalRecorded = input.evidenceLedger.selectedStore.totals.cloneApprovalsByTarget.tenStore > 0;
  const twentyFiveStoreCloneApprovalRecorded = input.evidenceLedger.selectedStore.totals.cloneApprovalsByTarget.twentyFiveStore > 0;
  const tenKRunRateAchieved = money(input.kpis.revenueVelocity * 30) >= 10_000;
  const hundredTemplateSource: RevenuePortfolioDashboardWinnerScaleLadder["stages"][number]["templateSource"] = hundred?.launchPacketQueue.totals.readyForReview
    ? "hundred_store_launch_packets"
    : hasFinalTemplate ? "final_execution_packet" : "none";
  const cloneTemplates: RevenuePortfolioDashboardWinnerScaleLadder["cloneTemplates"] = [
    {
      detail: input.finalExecution
        ? `${input.finalExecution.finalExecutionPacket.store.businessName} storefront setup packet is the source template for private clone drafts.`
        : "No storefront template is available until the final execution packet is ready.",
      ready: Boolean(input.finalExecution),
      source: "final_execution_packet",
      type: "storefront"
    },
    {
      detail: product
        ? `${product.productName} at $${product.retailPrice.toFixed(2)} with ${product.profitMargin}% target margin is the product template.`
        : "No product template is available until the listing pack is ready.",
      ready: Boolean(product),
      source: "final_execution_packet",
      type: "product"
    },
    {
      detail: product
        ? `${product.listingTitle} carries ${product.seoKeywords.length} SEO keyword${product.seoKeywords.length === 1 ? "" : "s"} and ${product.listingBullets.length} listing bullet${product.listingBullets.length === 1 ? "" : "s"}.`
        : "No listing template is available until copy is approved.",
      ready: Boolean(product?.listingTitle && product.seoKeywords.length > 0),
      source: "final_execution_packet",
      type: "listing"
    },
    {
      detail: `${input.finalExecution?.launchHandoffPacket.contentCalendar.length ?? 0} content draft${(input.finalExecution?.launchHandoffPacket.contentCalendar.length ?? 0) === 1 ? "" : "s"} and ${input.finalExecution?.launchHandoffPacket.organicLaunchMoves.length ?? 0} organic move${(input.finalExecution?.launchHandoffPacket.organicLaunchMoves.length ?? 0) === 1 ? "" : "s"} are ready for clone adaptation.`,
      ready: (input.finalExecution?.launchHandoffPacket.contentCalendar.length ?? 0) > 0
        || (input.finalExecution?.launchHandoffPacket.organicLaunchMoves.length ?? 0) > 0,
      source: "final_execution_packet",
      type: "content"
    },
    {
      detail: firstWeekReady
        ? `${input.firstWeekRevenueLoop.metricFields.length} manual metric field${input.firstWeekRevenueLoop.metricFields.length === 1 ? "" : "s"} are ready before scale review.`
        : "Manual first-week signal fields are waiting for a final execution packet.",
      ready: firstWeekReady,
      source: "first_week_loop",
      type: "signal"
    }
  ];
  const proofGate: RevenuePortfolioDashboardWinnerScaleLadder["proofGate"] = {
    evidenceSummary: proofReady
      ? `${money(input.firstRevenueProof.grossRevenue)} first-store revenue, ${money(input.firstRevenueProof.netProfit)} net profit, ${input.firstRevenueProof.manualSignalReceipts} manual signal receipt${input.firstRevenueProof.manualSignalReceipts === 1 ? "" : "s"}, and ${input.firstWeekSignalCoverage.summary} are ready for owner scale review.`
      : hasFinalTemplate
        ? `${input.firstRevenueProof.summary} ${input.firstWeekSignalCoverage.summary}`
        : "No proven-winner scale path can open before the first-store final execution packet is approved.",
    nextInternalAction: proofReady
      ? "review_proven_winner_scale_gate"
      : hasFinalTemplate ? "capture_first_store_proof_before_scale" : "approve_first_store_final_execution_packet",
    requiredSignals,
    status: proofGateStatus
  };
  const stages: RevenuePortfolioDashboardWinnerScaleLadder["stages"] = [
    scaleStage({
      approvalPrerequisiteReady: true,
      hasFinalTemplate,
      proofReady,
      readinessPercent: input.tenStore.readinessPercent,
      targetStores: 10,
      templateSource: hasFinalTemplate ? "final_execution_packet" : "none"
    }),
    scaleStage({
      approvalPrerequisiteReady: tenStoreCloneApprovalRecorded,
      hasFinalTemplate,
      proofReady,
      prerequisiteBlocker: "record the 10-store internal clone approval receipt before 25-store owner review",
      readinessPercent: input.twentyFiveStore.readinessPercent,
      targetStores: 25,
      templateSource: input.twentyFiveStore.templateSource
    }),
    scaleStage({
      approvalPrerequisiteReady: tenStoreCloneApprovalRecorded && twentyFiveStoreCloneApprovalRecorded && tenKRunRateAchieved,
      hasFinalTemplate,
      proofReady,
      prerequisiteBlocker: !tenStoreCloneApprovalRecorded
        ? "record the 10-store internal clone approval receipt before 100-store owner review"
        : !twentyFiveStoreCloneApprovalRecorded
          ? "record the 25-store internal clone approval receipt before 100-store owner review"
          : "prove $10k/month run-rate before 100-store owner review",
      readinessPercent: hundred?.readinessScore ?? 0,
      targetStores: 100,
      templateSource: hundredTemplateSource,
      unresolvedGateCount: hundred?.totals.gatesBlocked ?? 0
    })
  ];

  return {
    clonePackets: buildScaleClonePackets({
      cloneTemplates,
      proofGate,
      stages
    }),
    cloneTemplates,
    externalExecution: false,
    proofGate,
    providerContacted: false,
    stages,
    summary: proofReady
      ? "First-store proof is sufficient for owner scale review; cloning remains internal and approval-gated."
      : "Scale remains locked until the first store produces manual first-sale and first-week evidence."
  };
}

function buildFirstStoreCashLoop(input: {
  cashLoopEvidenceReceipts?: RevenuePortfolioDashboardCashLoopEvidenceReceipt[];
  dashboardNextActions: RevenuePortfolioDashboardNextAction[];
  financialPlan?: FinancialOrchestratorPlan | null;
  firstBusinessExecutionPlan?: RevenueFirstBusinessExecutionPlan | null;
  firstBusinessLaunchPlan?: RevenueFirstBusinessLaunchPlan | null;
  firstCashPlan?: RevenueFirstCashReadinessPlan | null;
  hundredStoreOperationsPlan?: RevenueHundredStoreOperationsPlan | null;
  kpis: RevenuePortfolioDashboardPlan["kpis"];
  launchReadinessPlan?: RevenueLaunchReadinessPlan | null;
  portfolio: RevenueAssetPortfolio;
  recommendations: Record<RevenueAssetRotationDecision, number>;
  tenStoreFleetPlan?: RevenueBusinessFleetPlan | null;
}): RevenuePortfolioDashboardFirstStoreCashLoop {
  const top = input.firstCashPlan?.topCandidate ?? null;
  const launchItem = topLaunchReadinessItem({
    firstCashPlan: input.firstCashPlan,
    launchReadinessPlan: input.launchReadinessPlan
  });
  const connectionChecks = buildFirstStoreConnectionChecks({
    firstBusinessLaunchPlan: input.firstBusinessLaunchPlan,
    firstCashPlan: input.firstCashPlan,
    hundredStoreOperationsPlan: input.hundredStoreOperationsPlan,
    launchItem
  });
  const approvalGates = buildApprovalGates({
    firstBusinessLaunchPlan: input.firstBusinessLaunchPlan,
    firstCashPlan: input.firstCashPlan,
    launchItem
  });
  const status = firstStoreStatus({
    approvalGates,
    connectionChecks,
    firstBusinessLaunchPlan: input.firstBusinessLaunchPlan,
    firstCashPlan: input.firstCashPlan
  });
  const launchPackage = input.firstBusinessLaunchPlan?.launchPackage ?? null;
  const finalExecution = input.firstBusinessExecutionPlan ?? null;
  const dashboardTopAction = input.dashboardNextActions[0] ?? null;
  const firstReadyHundredAction = input.hundredStoreOperationsPlan?.nextActions[0] ?? null;
  const fallbackNextRevenuePriority = top
    ? {
      label: top.nextAction.title,
      reason: top.nextAction.reason,
      source: "first_cash" as const
    }
    : dashboardTopAction
      ? {
        label: dashboardTopAction.actionLabel,
        reason: dashboardTopAction.reason,
        source: "dashboard" as const
      }
      : firstReadyHundredAction
        ? {
          label: firstReadyHundredAction.title,
          reason: firstReadyHundredAction.reason,
          source: "scale_path" as const
        }
        : {
          label: "Review launch readiness",
          reason: input.launchReadinessPlan?.summary ?? "No ranked first cash candidate is available yet.",
          source: "launch_readiness" as const
        };
  const tenTarget = input.tenStoreFleetPlan?.capacity.targetBusinesses ?? 10;
  const tenCurrent = input.tenStoreFleetPlan?.capacity.currentBusinesses ?? input.kpis.stores;
  const hundred = input.hundredStoreOperationsPlan ?? null;
  const firstStoreTarget = resolveFirstStoreTarget({
    finalExecution,
    launchItem,
    top
  });
  const evidenceLedger = buildCashLoopEvidenceLedger(input.cashLoopEvidenceReceipts, firstStoreTarget);
  const dailyRevenueLoop = buildDailyRevenueLoop({
    dashboardTopAction,
    finalExecution,
    financialPlan: input.financialPlan,
    hundredStoreOperationsPlan: input.hundredStoreOperationsPlan,
    kpis: input.kpis,
    manualSignalReceipts: evidenceLedger.selectedStore.totals.manualSignals,
    tenStoreFleetPlan: input.tenStoreFleetPlan
  });
  const firstWeekRevenueLoop = buildFirstWeekRevenueLoop(
    finalExecution,
    evidenceLedger.selectedStore.firstWeekSignalCoverage
  );
  const manualLaunchPacket = buildManualLaunchPacket(
    finalExecution,
    evidenceLedger.selectedStore.launchEvidenceCoverage
  );
  const firstRevenueProof = buildFirstStoreRevenueProof({
    dailyRevenueLoop,
    evidenceLedger,
    portfolio: input.portfolio,
    storeId: firstStoreTarget.storeId,
    storeName: firstStoreTarget.storeName
  });
  const ownerLaunchApproval = buildOwnerLaunchApprovalPacket({
    approvalGates,
    connectionChecks,
    finalExecution,
    firstWeekRevenueLoop,
    manualLaunchPacket
  });
  const tenStore: RevenuePortfolioDashboardFirstStoreCashLoop["scalePath"]["tenStore"] = {
    currentStores: tenCurrent,
    gap: Math.max(0, tenTarget - tenCurrent),
    nextInternalAction: input.tenStoreFleetPlan?.launchWave[0]?.nextInternalAction.label ?? "Build and validate the first store before cloning winners.",
    readinessPercent: percent(tenCurrent, tenTarget),
    readyParallelStores: input.tenStoreFleetPlan?.totals.readyParallel ?? 0,
    scaleReadyStores: input.tenStoreFleetPlan?.totals.scale ?? input.recommendations.scale,
    targetStores: tenTarget
  };
  const twentyFiveStore = buildTwentyFiveStoreScaleBridge({
    currentStores: tenCurrent,
    finalExecution,
    hundredStoreOperationsPlan: input.hundredStoreOperationsPlan
  });
  const winnerScaleLadder = buildWinnerScaleLadder({
    dailyRevenueLoop,
    evidenceLedger,
    finalExecution,
    firstRevenueProof,
    firstWeekSignalCoverage: evidenceLedger.selectedStore.firstWeekSignalCoverage,
    firstWeekRevenueLoop,
    hundredStoreOperationsPlan: input.hundredStoreOperationsPlan,
    kpis: input.kpis,
    tenStore,
    twentyFiveStore
  });
  const revenueMilestonePath = buildRevenueMilestonePath({
    firstRevenueProof,
    kpis: input.kpis,
    ownerLaunchApproval,
    winnerScaleLadder
  });
  const dailyChecklist = buildDailyChecklist({
    dashboardNextActions: input.dashboardNextActions,
    firstBusinessLaunchPlan: input.firstBusinessLaunchPlan,
    firstCashPlan: input.firstCashPlan,
    hundredStoreOperationsPlan: input.hundredStoreOperationsPlan,
    launchReadinessPlan: input.launchReadinessPlan
  });
  const executionPacket: RevenuePortfolioDashboardFirstStoreCashLoop["executionPacket"] = {
    auditTrail: [
      ...(finalExecution?.auditEvents ?? []),
      ...(input.firstBusinessLaunchPlan?.auditEvents ?? []),
      ...(input.firstCashPlan?.auditEvents ?? [])
    ].slice(0, 4),
    contentIdeas: finalExecution?.finalExecutionPacket.facelessContentIdeas.length ?? launchPackage?.contentTieIns.length ?? 0,
    firstWeekMetricFields: finalExecution?.totals.firstWeekMetricFields ?? 0,
    label: finalExecution
      ? `${finalExecution.finalExecutionPacket.store.businessName} final execution packet`
      : launchPackage ? `${launchPackage.store.businessName} launch packet` : "No approved first-business execution packet",
    manualSteps: finalExecution?.totals.manualSteps ?? 0,
    organicMoves: finalExecution?.finalExecutionPacket.organicMoves.length ?? launchPackage?.organicTrafficPlan.firstMoves.length ?? 0,
    products: finalExecution?.finalExecutionPacket.products.length ?? launchPackage?.products.length ?? 0,
    readinessBlocked: finalExecution?.totals.readinessBlocked ?? 0,
    readinessReady: finalExecution?.totals.readinessReady ?? 0,
    rollbackPlan: [
      "Pause storefront/product/content/ad execution before any external change.",
      "Archive internal draft payloads and keep all provider request manifests unsent.",
      "Keep payment, payout, and ad spend locked until owner approval."
    ],
    semiAutomatedSteps: finalExecution?.totals.semiAutomatedSteps ?? 0,
    source: finalExecution ? "final_execution_packet" : launchPackage ? "launch_package" : "none",
    status: finalExecution?.status === "ready_to_launch_first_business"
      ? "ready_from_final_execution_packet"
      : launchPackage ? "ready_for_final_execution_review" : status === "blocked" ? "blocked" : "waiting_for_approved_package"
  };
  const launchReadiness: RevenuePortfolioDashboardFirstStoreCashLoop["launchReadiness"] = {
    nextInternalAction: launchItem?.nextInternalAction ?? "hold_review",
    readinessScore: launchItem?.readinessScore ?? 0,
    stage: launchItem?.stage ?? "blocked",
    status: launchItem
      ? launchItem.riskLevel === "high" || launchItem.blockers.length > 0
        ? "blocked"
        : launchItem.readinessScore >= 70 ? "ready" : "watch"
      : "blocked",
    storeId: launchItem?.store.id ?? null,
    storeName: launchItem?.store.businessName ?? null,
    summary: launchItem?.summary ?? input.launchReadinessPlan?.summary ?? "No launch readiness item is available."
  };
  const hundredStore: RevenuePortfolioDashboardFirstStoreCashLoop["scalePath"]["hundredStore"] = hundred
    ? {
      currentStores: hundred.totals.currentStores,
      dailySupervisorSelected: hundred.dailyOperatingLoop.totals.ready,
      gap: hundred.totals.storeGap,
      gatesBlocked: hundred.totals.gatesBlocked,
      gatesPass: hundred.totals.gatesPass,
      gatesWatch: hundred.totals.gatesWatch,
      nextInternalAction: hundred.nextActions[0]?.title ?? hundred.summary,
      readinessScore: hundred.readinessScore,
      readyParallelStores: hundred.totals.readyParallelStores,
      targetStores: hundred.totals.targetStores,
      workerAssignmentsReady: hundred.workerAssignmentPlan.totals.readyToAssign
    }
    : null;
  const scalePath: RevenuePortfolioDashboardFirstStoreCashLoop["scalePath"] = {
    tenStore,
    twentyFiveStore,
    hundredStore
  };
  const cashLoopStage = buildCashLoopStage({
    dailyRevenueLoop,
    evidenceLedger,
    executionPacket,
    firstRevenueProof,
    manualLaunchPacket,
    ownerLaunchApproval,
    revenueMilestonePath,
    winnerScaleLadder
  });
  const ownerActionQueue = buildOwnerActionQueue({
    cashLoopStage,
    dailyRevenueLoop,
    evidenceLedger,
    executionPacket,
    firstRevenueProof,
    firstWeekRevenueLoop,
    manualLaunchPacket,
    ownerLaunchApproval,
    revenueMilestonePath,
    scalePath,
    winnerScaleLadder
  });
  const proofChain = buildFirstStoreToScaleProofChain({
    cashLoopStage,
    dailyRevenueLoop,
    evidenceLedger,
    executionPacket,
    firstRevenueProof,
    manualLaunchPacket,
    ownerActionQueue,
    ownerLaunchApproval,
    revenueMilestonePath,
    scalePath,
    winnerScaleLadder
  });
  const verificationAudit = buildCashLoopVerificationAudit({
    cashLoopStage,
    connectionChecks,
    dailyRevenueLoop,
    evidenceLedger,
    executionPacket,
    firstRevenueProof,
    firstWeekRevenueLoop,
    hundredStore,
    launchReadiness,
    manualLaunchPacket,
    ownerLaunchApproval,
    revenueMilestonePath,
    tenStore,
    twentyFiveStore,
    winnerScaleLadder
  });
  const nextRevenuePriority = cashLoopStage.nextOwnerAction ?? fallbackNextRevenuePriority;

  return {
    approvalGates,
    cashLoopStage,
    connectionChecks,
    dailyChecklist,
    dailyRevenueLoop,
    evidenceLedger,
    executionPacket,
    externalExecution: false,
    firstCashStatus: top
      ? {
        automaticCashEtaDays: top.automaticCashEtaDays,
        automaticCashReady: top.automaticCashReady,
        cashReadinessScore: top.cashReadinessScore,
        estimatedFirstSaleDays: top.estimatedFirstSaleDays,
        manualLaunchReady: top.manualLaunchReady,
        nextActionReason: top.nextAction.reason,
        nextActionTitle: top.nextAction.title,
        status: top.status,
        storeId: top.storeId,
        storeName: top.storeName
      }
      : null,
    launchReadiness,
    manualLaunchPacket,
    firstWeekRevenueLoop,
    firstRevenueProof,
    ownerLaunchApproval,
    missingConnections: connectionChecks.filter((check) => !check.ready).map((check) => check.label),
    mode: "First Store Cash Loop Summary",
    nextRevenuePriority,
    providerContacted: false,
    ownerActionQueue,
    proofChain,
    revenueSignals: {
      estimatedProfit: input.kpis.estimatedProfit,
      killPressure: dailyRevenueLoop.decision.killPressure,
      profitVelocity: input.kpis.profitVelocity,
      recommendation: dailyRevenueLoop.decision.recommendation,
      revenueVelocity: input.kpis.revenueVelocity,
      scalePressure: dailyRevenueLoop.decision.scalePressure,
      totalRevenue: input.kpis.totalRevenue
    },
    revenueMilestonePath,
    verificationAudit,
    winnerScaleLadder,
    scalePath,
    status,
    summary: top
      ? `${top.storeName} ${status.replace(/_/g, " ")} with first sale ETA ${top.estimatedFirstSaleDays ?? "unknown"} day${top.estimatedFirstSaleDays === 1 ? "" : "s"}, ${connectionChecks.filter((check) => !check.ready).length} missing or gated connection${connectionChecks.filter((check) => !check.ready).length === 1 ? "" : "s"}, and ${approvalGates.length} approval gate${approvalGates.length === 1 ? "" : "s"}.`
      : `No first-store cash candidate is ready yet; ${input.kpis.stores} store${input.kpis.stores === 1 ? "" : "s"} and ${input.kpis.products} product${input.kpis.products === 1 ? "" : "s"} are visible to the private revenue dashboard.`
  };
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
  cashLoopEvidenceReceipts?: RevenuePortfolioDashboardCashLoopEvidenceReceipt[];
  commandPlan: PortfolioCommandCenterPlan;
  controlLedger: RevenueAssetControlLedgerPlan;
  financialPlan?: FinancialOrchestratorPlan | null;
  firstBusinessExecutionPlan?: RevenueFirstBusinessExecutionPlan | null;
  firstBusinessLaunchPlan?: RevenueFirstBusinessLaunchPlan | null;
  firstCashPlan?: RevenueFirstCashReadinessPlan | null;
  generatedAt?: string;
  hundredStoreOperationsPlan?: RevenueHundredStoreOperationsPlan | null;
  launchReadinessPlan?: RevenueLaunchReadinessPlan | null;
  portfolio: RevenueAssetPortfolio;
  reviewQueue: RevenueAssetReviewQueuePlan;
  tenStoreFleetPlan?: RevenueBusinessFleetPlan | null;
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
  const kpis = {
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
  };
  const dashboardNextActions = nextActions(input.portfolio);
  const recommendations = {
    kill: recommendationCount(input.portfolio, "kill"),
    pause: recommendationCount(input.portfolio, "pause"),
    scale: recommendationCount(input.portfolio, "scale"),
    watch: recommendationCount(input.portfolio, "watch")
  };

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
    firstStoreCashLoop: buildFirstStoreCashLoop({
      cashLoopEvidenceReceipts: input.cashLoopEvidenceReceipts,
      dashboardNextActions,
      financialPlan: input.financialPlan,
      firstBusinessExecutionPlan: input.firstBusinessExecutionPlan,
      firstBusinessLaunchPlan: input.firstBusinessLaunchPlan,
      firstCashPlan: input.firstCashPlan,
      hundredStoreOperationsPlan: input.hundredStoreOperationsPlan,
      kpis,
      launchReadinessPlan: input.launchReadinessPlan,
      portfolio: input.portfolio,
      recommendations,
      tenStoreFleetPlan: input.tenStoreFleetPlan
    }),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    kpis,
    mode: "Revenue Engine Portfolio Dashboard",
    nextActions: dashboardNextActions,
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
    recommendations,
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
