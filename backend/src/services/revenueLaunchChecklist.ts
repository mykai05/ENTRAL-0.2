import type {
  PortfolioCommandCenterPlan,
  PortfolioCommandItem,
  PortfolioCommandRiskLevel
} from "./portfolioCommandCenter.js";
import type {
  RevenueAssetPortfolio,
  RevenueAssetRotationDecision,
  RevenueAssetScore,
  RevenueAssetScoreBand
} from "./revenueEngine.js";
import type {
  RevenueLaunchReadinessItem,
  RevenueLaunchReadinessPlan
} from "./revenueLaunchReadiness.js";
import type {
  RevenueOpportunityControlItem,
  RevenueOpportunityControlPlan
} from "./revenueOpportunityControl.js";
import type {
  RevenueSignalConnectorApprovalPlan,
  RevenueSignalConnectorApprovalRecordSnapshot,
  RevenueSignalImportJobSnapshot,
  RevenueSignalImportQueueItem
} from "./revenueSignalConnectorApprovals.js";
import type { RevenueSignalConnectorManifest } from "./revenueSignalConnectors.js";
import type { RevenueSignalImportHandoffPlan } from "./revenueSignalImportHandoff.js";

export type RevenueLaunchChecklistStageKey =
  | "opportunity"
  | "drafts"
  | "launch_readiness"
  | "connector_approval"
  | "import_handoff"
  | "signal_evidence"
  | "asset_scoring"
  | "next_revenue_actions";

export type RevenueLaunchChecklistStageStatus = "missing" | "ready" | "watch" | "blocked" | "complete";

export type RevenueLaunchChecklistNextAction =
  | "create_store_shell"
  | "seed_product_drafts"
  | "run_listing_optimization"
  | "prepare_store_setup"
  | "queue_launch_approval"
  | "request_provider_payload_approval"
  | "generate_provider_handoff"
  | "queue_connector_approval"
  | "review_connector_approval"
  | "queue_signal_import_job"
  | "ingest_import_handoff"
  | "ingest_performance_snapshot"
  | "apply_portfolio_commands"
  | "monitor_scale_or_rotate"
  | "hold_review";

export type RevenueLaunchChecklistOptions = {
  includeCompleted: boolean;
  maxItems: number;
  minPriorityScore: number;
  windowDays: number;
};

export type RevenueLaunchChecklistStage = {
  action: RevenueLaunchChecklistNextAction;
  key: RevenueLaunchChecklistStageKey;
  score: number;
  status: RevenueLaunchChecklistStageStatus;
  summary: string;
};

export type RevenueLaunchChecklistAssetSignal = {
  assetId: string;
  assetName: string;
  assetType: "product" | "store";
  economicsScore: number;
  finalRank: number;
  nextInternalState: string | null;
  readinessScore: number;
  reason: string;
  recommendation: RevenueAssetRotationDecision;
  riskPenalty: number;
  scoreBand: RevenueAssetScoreBand;
  velocity: number;
};

export type RevenueLaunchChecklistItem = {
  assetSignal: RevenueLaunchChecklistAssetSignal | null;
  blockers: string[];
  businessName: string;
  commandActions: Array<{
    action: PortfolioCommandItem["action"];
    commandHash: string;
    expectedInternalEffect: string;
    priority: number;
    riskLevel: PortfolioCommandRiskLevel;
    sourceModule: string;
  }>;
  externalExecution: false;
  id: string;
  incomeVelocityScore: number;
  metrics: {
    approvedProducts: number;
    commandActions: number;
    completedHandoffs: number;
    connectorApprovalQueue: number;
    estimatedDraftProfit: number;
    importHandoffsReady: number;
    importJobs: number;
    listingReadyProducts: number;
    netProfit: number;
    pendingConnectorApprovals: number;
    performanceSnapshots: number;
    scoredAssets: number;
    productDrafts: number;
    revenue: number;
    signalEvidence: number;
  };
  nextAction: RevenueLaunchChecklistNextAction;
  nextActionLabel: string;
  opportunityId: string | null;
  opportunityStatus: string | null;
  priorityScore: number;
  providerContacted: false;
  readinessScore: number;
  riskLevel: "low" | "medium" | "high";
  stages: RevenueLaunchChecklistStage[];
  storeId: string | null;
  storeName: string;
  summary: string;
};

export type RevenueLaunchChecklistPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  items: RevenueLaunchChecklistItem[];
  mode: "Internal Revenue Launch Checklist";
  options: RevenueLaunchChecklistOptions;
  providerContacted: false;
  stageCounts: Record<RevenueLaunchChecklistStageStatus, number>;
  summary: string;
  totals: {
    approvedProducts: number;
    blockedItems: number;
    commandActions: number;
    completedItems: number;
    connectorApprovalQueue: number;
    estimatedDraftProfit: number;
    importHandoffsReady: number;
    importJobs: number;
    items: number;
    killAssets: number;
    listingReadyProducts: number;
    netProfit: number;
    opportunities: number;
    pendingConnectorApprovals: number;
    pauseAssets: number;
    productDrafts: number;
    readyItems: number;
    revenue: number;
    scaleAssets: number;
    scoredAssets: number;
    signalEvidenceItems: number;
    stores: number;
    watchAssets: number;
  };
};

type ChecklistInput = {
  assetPortfolio?: RevenueAssetPortfolio;
  commandPlan: PortfolioCommandCenterPlan;
  generatedAt?: string;
  launchReadinessPlan: RevenueLaunchReadinessPlan;
  options?: Partial<RevenueLaunchChecklistOptions>;
  opportunityPlan: RevenueOpportunityControlPlan;
  signalApprovalPlan: RevenueSignalConnectorApprovalPlan;
  signalImportHandoffPlan: RevenueSignalImportHandoffPlan;
};

type DraftItem = {
  approvalQueue: RevenueSignalConnectorManifest[];
  approvals: RevenueSignalConnectorApprovalRecordSnapshot[];
  assetScores: RevenueAssetScore[];
  commandActions: PortfolioCommandItem[];
  handoffReadyImportJobIds: Set<string>;
  importJobs: RevenueSignalImportJobSnapshot[];
  importQueue: RevenueSignalImportQueueItem[];
  key: string;
  opportunity: RevenueOpportunityControlItem | null;
  readiness: RevenueLaunchReadinessItem | null;
  storeId: string | null;
  storeName: string;
};

const defaultOptions: RevenueLaunchChecklistOptions = {
  includeCompleted: true,
  maxItems: 25,
  minPriorityScore: 0,
  windowDays: 30
};

const stageStatuses: RevenueLaunchChecklistStageStatus[] = ["missing", "ready", "watch", "blocked", "complete"];

const lockedExternalActions = [
  "Publishing marketplace listings, creating provider-side products, uploading artwork or files, changing storefronts, or starting ad spend",
  "Moving money, creating payouts, changing bank/card/payment settings, or authorizing Stripe Treasury or Connect transfers",
  "Opening provider admin sessions, creating write scopes, running browser sessions, using stealth, rotating proxies, spoofing fingerprints, or evading platform controls"
];

const nextActionLabels: Record<RevenueLaunchChecklistNextAction, string> = {
  apply_portfolio_commands: "Record portfolio commands",
  create_store_shell: "Create internal store shell",
  generate_provider_handoff: "Generate provider handoff",
  hold_review: "Hold for review",
  ingest_import_handoff: "Ingest import handoff",
  ingest_performance_snapshot: "Ingest performance evidence",
  monitor_scale_or_rotate: "Monitor, scale, or rotate",
  prepare_store_setup: "Prepare store setup",
  queue_connector_approval: "Queue connector approval",
  queue_launch_approval: "Queue launch approval",
  queue_signal_import_job: "Queue signal import job",
  request_provider_payload_approval: "Request provider payload approval",
  review_connector_approval: "Review connector approval",
  run_listing_optimization: "Run listing optimization",
  seed_product_drafts: "Seed product drafts"
};

const riskWeight: Record<"low" | "medium" | "high", number> = {
  high: 18,
  low: 0,
  medium: 8
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function optionsWithDefaults(input: Partial<RevenueLaunchChecklistOptions> = {}): RevenueLaunchChecklistOptions {
  return {
    includeCompleted: input.includeCompleted ?? defaultOptions.includeCompleted,
    maxItems: clamp(Math.round(input.maxItems ?? defaultOptions.maxItems), 1, 100),
    minPriorityScore: clamp(Math.round(input.minPriorityScore ?? defaultOptions.minPriorityScore), 0, 100),
    windowDays: clamp(Math.round(input.windowDays ?? defaultOptions.windowDays), 1, 365)
  };
}

function emptyStageCounts(): Record<RevenueLaunchChecklistStageStatus, number> {
  return Object.fromEntries(stageStatuses.map((status) => [status, 0])) as Record<RevenueLaunchChecklistStageStatus, number>;
}

function sampleSignalCount(job: RevenueSignalImportJobSnapshot) {
  return (job.samplePayload?.commerceSignals?.length ?? 0)
    + (job.samplePayload?.contentSignals?.length ?? 0)
    + (job.samplePayload?.paymentSignals?.length ?? 0);
}

function manifestStoreId(manifest: RevenueSignalConnectorManifest | undefined) {
  return manifest?.target.storeId ?? null;
}

function ensureDraft(drafts: Map<string, DraftItem>, key: string, storeId: string | null, storeName: string): DraftItem {
  const existing = drafts.get(key);

  if (existing) {
    if (!existing.storeId && storeId) existing.storeId = storeId;
    if (existing.storeName === "Unassigned opportunity" && storeName) existing.storeName = storeName;
    return existing;
  }

  const draft: DraftItem = {
    approvalQueue: [],
    approvals: [],
    assetScores: [],
    commandActions: [],
    handoffReadyImportJobIds: new Set(),
    importJobs: [],
    importQueue: [],
    key,
    opportunity: null,
    readiness: null,
    storeId,
    storeName
  };

  drafts.set(key, draft);
  return draft;
}

function opportunityStoreName(opportunity: RevenueOpportunityControlItem) {
  return opportunity.store?.businessName ?? opportunity.businessName ?? "Unassigned opportunity";
}

function riskFor(draft: DraftItem): "low" | "medium" | "high" {
  if (draft.opportunity?.riskLevel === "high" || draft.readiness?.riskLevel === "high" || draft.commandActions.some((command) => command.riskLevel === "high")) {
    return "high";
  }

  if (draft.opportunity?.riskLevel === "medium" || draft.readiness?.riskLevel === "medium" || draft.commandActions.some((command) => command.riskLevel === "medium")) {
    return "medium";
  }

  return "low";
}

function readinessScoreFor(draft: DraftItem) {
  return Math.max(draft.opportunity?.readinessScore ?? 0, draft.readiness?.readinessScore ?? 0);
}

const assetRecommendationRank: Record<RevenueAssetRotationDecision, number> = {
  kill: 0,
  pause: 1,
  scale: 2,
  watch: 3
};

function assetTypeRank(asset: RevenueAssetScore) {
  return asset.assetType === "store" ? 0 : 1;
}

function assetSignalFor(draft: DraftItem): RevenueLaunchChecklistAssetSignal | null {
  const asset = [...draft.assetScores]
    .sort((a, b) => (
      assetRecommendationRank[a.recommendation] - assetRecommendationRank[b.recommendation]
      || assetTypeRank(a) - assetTypeRank(b)
      || b.assetScore.finalRank - a.assetScore.finalRank
    ))[0];

  if (!asset) return null;

  return {
    assetId: asset.assetId,
    assetName: asset.assetName,
    assetType: asset.assetType,
    economicsScore: asset.assetScore.economicsScore,
    finalRank: asset.assetScore.finalRank,
    nextInternalState: asset.nextInternalState,
    readinessScore: asset.assetScore.readinessScore,
    reason: asset.reason,
    recommendation: asset.recommendation,
    riskPenalty: asset.assetScore.riskPenalty,
    scoreBand: asset.scoreBand,
    velocity: asset.assetScore.velocity
  };
}

function metricsFor(draft: DraftItem) {
  const opportunityMetrics = draft.opportunity?.metrics;
  const completedHandoffs = draft.importJobs.filter((job) => job.status === "completed").length;
  const performanceSnapshots = opportunityMetrics?.performanceSnapshots ?? 0;
  const revenue = money(opportunityMetrics?.revenue ?? draft.readiness?.store.revenue ?? 0);
  const netProfit = money(opportunityMetrics?.netProfit ?? 0);
  const signalEvidence = performanceSnapshots + completedHandoffs + (revenue > 0 ? 1 : 0);

  return {
    approvedProducts: opportunityMetrics?.approvedProducts ?? 0,
    commandActions: draft.commandActions.length,
    completedHandoffs,
    connectorApprovalQueue: draft.approvalQueue.length,
    estimatedDraftProfit: money(opportunityMetrics?.estimatedDraftProfit ?? draft.readiness?.store.estimatedProfit ?? 0),
    importHandoffsReady: draft.handoffReadyImportJobIds.size,
    importJobs: draft.importJobs.length,
    listingReadyProducts: opportunityMetrics?.listingReadyProducts ?? draft.readiness?.launchPipeline?.readyProducts ?? 0,
    netProfit,
    pendingConnectorApprovals: draft.approvals.filter((approval) => approval.status === "pending_review").length,
    performanceSnapshots,
    scoredAssets: draft.assetScores.length,
    productDrafts: opportunityMetrics?.productDrafts ?? draft.readiness?.launchPipeline?.readyProducts ?? 0,
    revenue,
    signalEvidence
  };
}

function blockersFor(draft: DraftItem) {
  const assetSignal = assetSignalFor(draft);

  return unique([
    ...(draft.opportunity?.blockers.map((blocker) => blocker.title) ?? []),
    ...(draft.readiness?.blockers.map((blocker) => blocker.title) ?? []),
    ...(assetSignal && (assetSignal.recommendation === "kill" || assetSignal.recommendation === "pause")
      ? [`Revenue Engine recommends ${assetSignal.recommendation} for ${assetSignal.assetName} before launch work continues.`]
      : []),
    ...draft.importJobs
      .filter((job) => job.status === "blocked_review")
      .map((job) => `Signal import job ${job.id} is blocked.`),
    ...draft.commandActions
      .filter((command) => command.riskLevel === "high")
      .map((command) => `High-risk portfolio command queued: ${command.action} for ${command.targetName}.`)
  ]);
}

function incomeVelocityScore(metrics: ReturnType<typeof metricsFor>, draft: DraftItem) {
  const assetSignal = assetSignalFor(draft);

  return clamp(Math.round(
    (metrics.revenue > 0 ? 25 : 0)
    + (metrics.netProfit > 0 ? 15 : 0)
    + Math.min(metrics.estimatedDraftProfit / 20, 25)
    + Math.min(metrics.productDrafts * 4, 20)
    + Math.min((metrics.connectorApprovalQueue + metrics.pendingConnectorApprovals + metrics.importHandoffsReady) * 7, 21)
    + (draft.commandActions.length > 0 ? 9 : 0)
    + (assetSignal?.recommendation === "scale" ? 8 : 0)
    + Math.min((assetSignal?.velocity ?? 0) / 4, 12)
  ), 0, 100);
}

function priorityScoreFor(input: {
  blockers: string[];
  draft: DraftItem;
  metrics: ReturnType<typeof metricsFor>;
  readinessScore: number;
  riskLevel: "low" | "medium" | "high";
}) {
  const urgency = input.metrics.importHandoffsReady > 0
    ? 18
    : input.metrics.pendingConnectorApprovals > 0 || input.metrics.connectorApprovalQueue > 0
      ? 12
      : input.metrics.commandActions > 0
        ? 8
        : 0;
  const score = (incomeVelocityScore(input.metrics, input.draft) * 0.48)
    + (input.readinessScore * 0.42)
    + urgency
    - riskWeight[input.riskLevel]
    - Math.min(input.blockers.length * 3, 12);

  return clamp(Math.round(score), 0, 100);
}

function firstReadyOpportunityAction(draft: DraftItem): RevenueLaunchChecklistNextAction | null {
  const readyAction = draft.opportunity?.nextInternalActions
    .filter((action) => action.status === "ready")
    .sort((a, b) => a.priority - b.priority)[0]?.action;

  if (!readyAction) return null;
  if (readyAction === "review_risk") return "hold_review";

  return readyAction as RevenueLaunchChecklistNextAction;
}

function launchReadinessAction(draft: DraftItem): RevenueLaunchChecklistNextAction | null {
  const action = draft.readiness?.nextInternalAction;

  if (!action || action === "optimize_listings") return action === "optimize_listings" ? "run_listing_optimization" : null;
  if (action === "ingest_performance") return "ingest_performance_snapshot";

  return action as RevenueLaunchChecklistNextAction;
}

function nextActionFor(draft: DraftItem, metrics: ReturnType<typeof metricsFor>): RevenueLaunchChecklistNextAction {
  const assetSignal = assetSignalFor(draft);

  if (assetSignal?.recommendation === "kill" || assetSignal?.recommendation === "pause") return "apply_portfolio_commands";
  if (metrics.importHandoffsReady > 0) return "ingest_import_handoff";
  if (draft.importQueue.length > 0) return "queue_signal_import_job";
  if (metrics.pendingConnectorApprovals > 0) return "review_connector_approval";
  if (metrics.connectorApprovalQueue > 0) return "queue_connector_approval";
  if (draft.opportunity && !draft.storeId) return "create_store_shell";

  const opportunityAction = firstReadyOpportunityAction(draft);
  if (opportunityAction) return opportunityAction;

  const readinessAction = launchReadinessAction(draft);
  if (readinessAction && readinessAction !== "hold_review") return readinessAction;

  if (metrics.signalEvidence === 0 && (metrics.revenue === 0 || metrics.performanceSnapshots === 0)) return "ingest_performance_snapshot";
  if (metrics.commandActions > 0) return "apply_portfolio_commands";
  if (draft.readiness?.nextInternalAction === "hold_review") return "hold_review";

  return "monitor_scale_or_rotate";
}

function stage(input: {
  action: RevenueLaunchChecklistNextAction;
  key: RevenueLaunchChecklistStageKey;
  score: number;
  status: RevenueLaunchChecklistStageStatus;
  summary: string;
}): RevenueLaunchChecklistStage {
  return input;
}

function stagesFor(input: {
  draft: DraftItem;
  metrics: ReturnType<typeof metricsFor>;
  nextAction: RevenueLaunchChecklistNextAction;
  readinessScore: number;
}) {
  const { draft, metrics, nextAction, readinessScore } = input;
  const assetSignal = assetSignalFor(draft);
  const opportunityStatus: RevenueLaunchChecklistStageStatus = draft.opportunity
    ? draft.storeId ? "complete" : "ready"
    : "missing";
  const draftStatus: RevenueLaunchChecklistStageStatus = metrics.productDrafts > 0
    ? metrics.listingReadyProducts > 0 ? "complete" : "ready"
    : draft.storeId ? "ready" : "blocked";
  const launchStatus: RevenueLaunchChecklistStageStatus = draft.readiness
    ? draft.readiness.stage === "blocked"
      ? "blocked"
      : draft.readiness.stage === "handoff_ready" || draft.readiness.stage === "live_monitoring"
        ? "complete"
        : "ready"
    : "missing";
  const connectorStatus: RevenueLaunchChecklistStageStatus = metrics.connectorApprovalQueue > 0 || metrics.pendingConnectorApprovals > 0
    ? "ready"
    : draft.approvals.some((approval) => approval.status === "approved" || approval.status === "import_queued")
      ? "complete"
      : draft.approvalQueue.length > 0
        ? "ready"
        : "missing";
  const importStatus: RevenueLaunchChecklistStageStatus = metrics.importHandoffsReady > 0
    ? "ready"
    : metrics.completedHandoffs > 0
      ? "complete"
      : metrics.importJobs > 0
        ? "watch"
        : "missing";
  const evidenceStatus: RevenueLaunchChecklistStageStatus = metrics.signalEvidence > 0 ? "complete" : "missing";
  const assetStatus: RevenueLaunchChecklistStageStatus = !assetSignal
    ? "missing"
    : assetSignal.recommendation === "kill" || assetSignal.recommendation === "pause"
      ? "blocked"
      : assetSignal.recommendation === "scale"
        ? "ready"
        : "watch";
  const commandStatus: RevenueLaunchChecklistStageStatus = metrics.commandActions > 0 || nextAction !== "monitor_scale_or_rotate"
    ? "ready"
    : evidenceStatus === "complete"
      ? "complete"
      : "watch";

  return [
    stage({
      action: draft.opportunity && !draft.storeId ? "create_store_shell" : "seed_product_drafts",
      key: "opportunity",
      score: draft.opportunity ? 100 : 0,
      status: opportunityStatus,
      summary: draft.opportunity
        ? `Opportunity ${draft.opportunity.id} is ${draft.opportunity.status}.`
        : "No durable opportunity record is linked to this store."
    }),
    stage({
      action: "seed_product_drafts",
      key: "drafts",
      score: clamp(metrics.productDrafts * 20, 0, 100),
      status: draftStatus,
      summary: `${metrics.productDrafts} draft${metrics.productDrafts === 1 ? "" : "s"}, ${metrics.listingReadyProducts} listing-ready product${metrics.listingReadyProducts === 1 ? "" : "s"}.`
    }),
    stage({
      action: launchReadinessAction(draft) ?? "hold_review",
      key: "launch_readiness",
      score: readinessScore,
      status: launchStatus,
      summary: draft.readiness?.summary ?? "Launch readiness has not evaluated this store yet."
    }),
    stage({
      action: metrics.pendingConnectorApprovals > 0 ? "review_connector_approval" : "queue_connector_approval",
      key: "connector_approval",
      score: clamp((metrics.connectorApprovalQueue + metrics.pendingConnectorApprovals + draft.approvals.length) * 25, 0, 100),
      status: connectorStatus,
      summary: `${metrics.connectorApprovalQueue} approval queue item${metrics.connectorApprovalQueue === 1 ? "" : "s"}, ${metrics.pendingConnectorApprovals} pending review.`
    }),
    stage({
      action: metrics.importHandoffsReady > 0 ? "ingest_import_handoff" : "queue_signal_import_job",
      key: "import_handoff",
      score: clamp((metrics.importHandoffsReady + metrics.completedHandoffs) * 50, 0, 100),
      status: importStatus,
      summary: `${metrics.importHandoffsReady} handoff${metrics.importHandoffsReady === 1 ? "" : "s"} ready, ${metrics.completedHandoffs} completed.`
    }),
    stage({
      action: "ingest_performance_snapshot",
      key: "signal_evidence",
      score: metrics.signalEvidence > 0 ? 100 : 0,
      status: evidenceStatus,
      summary: `${metrics.performanceSnapshots} performance snapshot${metrics.performanceSnapshots === 1 ? "" : "s"} and ${metrics.completedHandoffs} completed signal handoff${metrics.completedHandoffs === 1 ? "" : "s"}.`
    }),
    stage({
      action: assetSignal?.recommendation === "kill" || assetSignal?.recommendation === "pause" || assetSignal?.recommendation === "scale"
        ? "apply_portfolio_commands"
        : "monitor_scale_or_rotate",
      key: "asset_scoring",
      score: assetSignal?.finalRank ?? 0,
      status: assetStatus,
      summary: assetSignal
        ? `Revenue Engine recommends ${assetSignal.recommendation} for ${assetSignal.assetName} at rank ${assetSignal.finalRank}. Next state: ${assetSignal.nextInternalState ?? "no internal status change"}.`
        : "No Revenue Engine asset score is linked to this checklist item yet."
    }),
    stage({
      action: metrics.commandActions > 0 ? "apply_portfolio_commands" : nextAction,
      key: "next_revenue_actions",
      score: clamp(metrics.commandActions * 35 + (nextAction !== "monitor_scale_or_rotate" ? 35 : 0), 0, 100),
      status: commandStatus,
      summary: metrics.commandActions > 0
        ? `${metrics.commandActions} portfolio command${metrics.commandActions === 1 ? "" : "s"} are ready for internal recording.`
        : `${nextActionLabels[nextAction]} is the next internal step.`
    })
  ];
}

function completedChecklistItem(item: RevenueLaunchChecklistItem) {
  return item.nextAction === "monitor_scale_or_rotate"
    && item.stages.filter((itemStage) => itemStage.status === "complete").length >= 5
    && item.assetSignal?.recommendation !== "pause"
    && item.assetSignal?.recommendation !== "kill";
}

function itemForDraft(draft: DraftItem): RevenueLaunchChecklistItem {
  const metrics = metricsFor(draft);
  const readinessScore = readinessScoreFor(draft);
  const assetSignal = assetSignalFor(draft);
  const riskLevel = assetSignal?.recommendation === "kill"
    ? "high"
    : assetSignal?.recommendation === "pause"
      ? "medium"
      : riskFor(draft);
  const blockers = blockersFor(draft);
  const priorityScore = priorityScoreFor({
    blockers,
    draft,
    metrics,
    readinessScore,
    riskLevel
  });
  const nextAction = nextActionFor(draft, metrics);
  const stages = stagesFor({
    draft,
    metrics,
    nextAction,
    readinessScore
  });

  return {
    assetSignal,
    blockers,
    businessName: draft.storeName,
    commandActions: draft.commandActions
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 5)
      .map((command) => ({
        action: command.action,
        commandHash: command.commandHash,
        expectedInternalEffect: command.expectedInternalEffect,
        priority: command.priority,
        riskLevel: command.riskLevel,
        sourceModule: command.sourceModule
      })),
    externalExecution: false,
    id: draft.key,
    incomeVelocityScore: incomeVelocityScore(metrics, draft),
    metrics,
    nextAction,
    nextActionLabel: nextActionLabels[nextAction],
    opportunityId: draft.opportunity?.id ?? null,
    opportunityStatus: draft.opportunity?.status ?? null,
    priorityScore,
    providerContacted: false,
    readinessScore,
    riskLevel,
    stages,
    storeId: draft.storeId,
    storeName: draft.storeName,
    summary: `${draft.storeName}: ${nextActionLabels[nextAction]}. Priority ${priorityScore}, readiness ${readinessScore}, velocity ${incomeVelocityScore(metrics, draft)}${assetSignal ? `, asset ${assetSignal.recommendation} ${assetSignal.finalRank}` : ""}.`
  };
}

function buildDrafts(input: ChecklistInput) {
  const drafts = new Map<string, DraftItem>();
  const manifestsById = new Map(input.signalApprovalPlan.connectorPlan.manifests.map((manifest) => [manifest.id, manifest]));
  const approvalsById = new Map(input.signalApprovalPlan.approvals.map((approval) => [approval.id, approval]));
  const readyHandoffJobIds = new Set(input.signalImportHandoffPlan.readyHandoffs.map((handoff) => handoff.importJobId));

  for (const opportunity of input.opportunityPlan.opportunities) {
    const storeId = opportunity.store?.id ?? null;
    const key = storeId ?? `opportunity:${opportunity.id}`;
    const draft = ensureDraft(drafts, key, storeId, opportunityStoreName(opportunity));
    draft.opportunity = opportunity;
  }

  for (const readiness of input.launchReadinessPlan.stores) {
    const draft = ensureDraft(drafts, readiness.store.id, readiness.store.id, readiness.store.businessName);
    draft.readiness = readiness;
  }

  for (const manifest of input.signalApprovalPlan.connectorPlan.manifests) {
    const storeId = manifestStoreId(manifest);
    if (!storeId) continue;

    const draft = ensureDraft(drafts, storeId, storeId, manifest.target.storeName ?? manifest.title);
    if (manifest.status === "ready_for_approval") draft.approvalQueue.push(manifest);
  }

  for (const approval of input.signalApprovalPlan.approvals) {
    const storeId = approval.storeId ?? manifestStoreId(manifestsById.get(approval.manifestId));
    if (!storeId) continue;

    const draft = ensureDraft(drafts, storeId, storeId, approval.storeName ?? approval.manifest.target.storeName ?? approval.providerName);
    draft.approvals.push(approval);
  }

  for (const importItem of input.signalApprovalPlan.importQueue) {
    const approval = approvalsById.get(importItem.approvalId);
    const storeId = approval?.storeId ?? manifestStoreId(manifestsById.get(importItem.manifestId));
    if (!storeId) continue;

    const draft = ensureDraft(drafts, storeId, storeId, approval?.storeName ?? manifestsById.get(importItem.manifestId)?.target.storeName ?? importItem.provider);
    draft.importQueue.push(importItem);
  }

  for (const job of input.signalImportHandoffPlan.importJobs) {
    const approval = approvalsById.get(job.approvalId);
    const storeId = approval?.storeId ?? manifestStoreId(manifestsById.get(job.manifestId));
    if (!storeId) continue;

    const draft = ensureDraft(drafts, storeId, storeId, approval?.storeName ?? manifestsById.get(job.manifestId)?.target.storeName ?? job.provider);
    draft.importJobs.push(job);
    if (readyHandoffJobIds.has(job.id) && sampleSignalCount(job) > 0) {
      draft.handoffReadyImportJobIds.add(job.id);
    }
  }

  for (const command of input.commandPlan.commandActions) {
    if (command.targetType !== "store") continue;

    const draft = ensureDraft(drafts, command.targetId, command.targetId, command.targetName);
    draft.commandActions.push(command);
  }

  for (const asset of input.assetPortfolio?.assets ?? []) {
    if (!asset.storeId) continue;

    const draft = ensureDraft(drafts, asset.storeId, asset.storeId, asset.storeName);
    draft.assetScores.push(asset);
  }

  return drafts;
}

export function buildRevenueLaunchChecklistPlan(input: ChecklistInput): RevenueLaunchChecklistPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const options = optionsWithDefaults(input.options);
  const stageCounts = emptyStageCounts();
  const drafts = buildDrafts(input);
  const items = Array.from(drafts.values())
    .map(itemForDraft)
    .filter((item) => options.includeCompleted || !completedChecklistItem(item))
    .filter((item) => item.priorityScore >= options.minPriorityScore)
    .sort((a, b) => (
      b.priorityScore - a.priorityScore
      || b.incomeVelocityScore - a.incomeVelocityScore
      || b.readinessScore - a.readinessScore
      || a.storeName.localeCompare(b.storeName)
    ))
    .slice(0, options.maxItems);

  for (const item of items) {
    const status = item.blockers.length > 0 || item.riskLevel === "high"
      ? "blocked"
      : completedChecklistItem(item)
        ? "complete"
        : item.nextAction === "hold_review"
          ? "watch"
          : "ready";
    stageCounts[status] += 1;
  }

  const readyItems = stageCounts.ready;
  const blockedItems = stageCounts.blocked;
  const completedItems = stageCounts.complete;
  const signalEvidenceItems = items.filter((item) => item.metrics.signalEvidence > 0).length;

  return {
    auditEvents: [
      "Opportunity, launch-readiness, connector approval, import handoff, Signal Intake evidence, and portfolio command plans were joined into one internal checklist.",
      "Checklist ranking is read-only and chooses the next internal action by approval, handoff, evidence, readiness, Revenue Engine asset scores, and income-velocity signals.",
      "No provider, marketplace, payment processor, social platform, browser, proxy, upload, payout, bank, card, ad, or external write action was executed."
    ],
    blockedExternalActions: unique([
      ...input.opportunityPlan.blockedExternalActions,
      ...input.launchReadinessPlan.blockedExternalActions,
      ...input.signalApprovalPlan.blockedExternalActions,
      ...input.signalImportHandoffPlan.blockedExternalActions,
      ...input.commandPlan.blockedExternalActions,
      ...(input.assetPortfolio?.blockedExternalActions ?? []),
      ...lockedExternalActions
    ]),
    externalExecution: false,
    generatedAt,
    items,
    mode: "Internal Revenue Launch Checklist",
    options,
    providerContacted: false,
    stageCounts,
    summary: items.length === 0
      ? "No Revenue Launch Checklist items matched the current filters."
      : `${readyItems} checklist item${readyItems === 1 ? "" : "s"} are ready for internal execution, ${blockedItems} need review, and ${signalEvidenceItems} have performance or handoff evidence.`,
    totals: {
      approvedProducts: items.reduce((sum, item) => sum + item.metrics.approvedProducts, 0),
      blockedItems,
      commandActions: input.commandPlan.commandActions.length,
      completedItems,
      connectorApprovalQueue: items.reduce((sum, item) => sum + item.metrics.connectorApprovalQueue, 0),
      estimatedDraftProfit: money(items.reduce((sum, item) => sum + item.metrics.estimatedDraftProfit, 0)),
      importHandoffsReady: items.reduce((sum, item) => sum + item.metrics.importHandoffsReady, 0),
      importJobs: items.reduce((sum, item) => sum + item.metrics.importJobs, 0),
      items: items.length,
      killAssets: items.filter((item) => item.assetSignal?.recommendation === "kill").length,
      listingReadyProducts: items.reduce((sum, item) => sum + item.metrics.listingReadyProducts, 0),
      netProfit: money(items.reduce((sum, item) => sum + item.metrics.netProfit, 0)),
      opportunities: items.filter((item) => item.opportunityId).length,
      pendingConnectorApprovals: items.reduce((sum, item) => sum + item.metrics.pendingConnectorApprovals, 0),
      pauseAssets: items.filter((item) => item.assetSignal?.recommendation === "pause").length,
      productDrafts: items.reduce((sum, item) => sum + item.metrics.productDrafts, 0),
      readyItems,
      revenue: money(items.reduce((sum, item) => sum + item.metrics.revenue, 0)),
      scaleAssets: items.filter((item) => item.assetSignal?.recommendation === "scale").length,
      scoredAssets: items.reduce((sum, item) => sum + item.metrics.scoredAssets, 0),
      signalEvidenceItems,
      stores: new Set(items.map((item) => item.storeId).filter(Boolean)).size,
      watchAssets: items.filter((item) => item.assetSignal?.recommendation === "watch").length
    }
  };
}
