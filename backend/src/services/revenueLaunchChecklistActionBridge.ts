import type { PortfolioCommandCenterPlan } from "./portfolioCommandCenter.js";
import type {
  RevenueLaunchChecklistItem,
  RevenueLaunchChecklistNextAction,
  RevenueLaunchChecklistPlan
} from "./revenueLaunchChecklist.js";
import type {
  RevenueSignalConnectorApprovalPlan,
  RevenueSignalConnectorApprovalRecordSnapshot
} from "./revenueSignalConnectorApprovals.js";
import type { RevenueSignalConnectorManifest } from "./revenueSignalConnectors.js";
import type { RevenueSignalImportHandoffPlan } from "./revenueSignalImportHandoff.js";

export const revenueLaunchChecklistActionBridgeConfirmation = "DISPATCH INTERNAL REVENUE LAUNCH CHECKLIST ACTIONS";

export type RevenueLaunchChecklistActionBridgeDispatchKind =
  | "launch_pipeline"
  | "listing_optimization"
  | "store_setup"
  | "signal_connector_approval"
  | "signal_import_job"
  | "signal_import_handoff"
  | "portfolio_command"
  | "manual_review";

export type RevenueLaunchChecklistActionBridgeStatus = "ready" | "blocked" | "watch";

export type RevenueLaunchChecklistActionBridgeOptions = {
  includeCompleted: boolean;
  maxActions: number;
  maxItems: number;
  minPriorityScore: number;
  windowDays: number;
};

export type RevenueLaunchChecklistActionBridgeItem = {
  actionId: string;
  blockedReason: string | null;
  checklistAction: RevenueLaunchChecklistNextAction;
  checklistItemId: string;
  confirmationRequired: string;
  dispatchKind: RevenueLaunchChecklistActionBridgeDispatchKind;
  endpoint: string;
  externalExecution: false;
  payload: Record<string, unknown>;
  priorityScore: number;
  providerContacted: false;
  status: RevenueLaunchChecklistActionBridgeStatus;
  storeId: string | null;
  storeName: string;
  summary: string;
};

export type RevenueLaunchChecklistActionBridgePlan = {
  actions: RevenueLaunchChecklistActionBridgeItem[];
  auditEvents: string[];
  blockedExternalActions: string[];
  checklist: {
    generatedAt: string;
    items: number;
    readyItems: number;
    summary: string;
  };
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Revenue Launch Checklist Action Bridge";
  options: RevenueLaunchChecklistActionBridgeOptions;
  providerContacted: false;
  summary: string;
  totals: {
    actions: number;
    blockedActions: number;
    connectorApprovalActions: number;
    importHandoffActions: number;
    importJobActions: number;
    launchPipelineActions: number;
    listingOptimizationActions: number;
    manualReviewActions: number;
    portfolioCommandActions: number;
    readyActions: number;
    storeSetupActions: number;
    watchActions: number;
  };
};

type ActionBridgeInput = {
  checklistPlan: RevenueLaunchChecklistPlan;
  commandPlan: PortfolioCommandCenterPlan;
  generatedAt?: string;
  options?: Partial<RevenueLaunchChecklistActionBridgeOptions>;
  signalApprovalPlan: RevenueSignalConnectorApprovalPlan;
  signalImportHandoffPlan: RevenueSignalImportHandoffPlan;
};

const defaultOptions: RevenueLaunchChecklistActionBridgeOptions = {
  includeCompleted: true,
  maxActions: 5,
  maxItems: 25,
  minPriorityScore: 0,
  windowDays: 30
};

const lockedExternalActions = [
  "Publishing listings, creating provider products, uploading files, posting content, starting ads, opening provider admin sessions, or executing marketplace/social writes",
  "Moving money, approving payouts, changing bank/card/payment settings, or executing Stripe Treasury or Connect transfers",
  "Running browser stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, CAPTCHA bypass, or platform-evasion automation"
];

const launchActionMap: Partial<Record<RevenueLaunchChecklistNextAction, "prepare_launch_package" | "queue_launch_approval" | "seed_products">> = {
  generate_provider_handoff: "prepare_launch_package",
  queue_launch_approval: "queue_launch_approval",
  seed_product_drafts: "seed_products"
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function optionsWithDefaults(input: Partial<RevenueLaunchChecklistActionBridgeOptions> = {}): RevenueLaunchChecklistActionBridgeOptions {
  return {
    includeCompleted: input.includeCompleted ?? defaultOptions.includeCompleted,
    maxActions: clamp(Math.round(input.maxActions ?? defaultOptions.maxActions), 1, 25),
    maxItems: clamp(Math.round(input.maxItems ?? defaultOptions.maxItems), 1, 100),
    minPriorityScore: clamp(Math.round(input.minPriorityScore ?? defaultOptions.minPriorityScore), 0, 100),
    windowDays: clamp(Math.round(input.windowDays ?? defaultOptions.windowDays), 1, 365)
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9:_-]+/g, "_").replace(/^_+|_+$/g, "") || "action";
}

function sampleSignalCount(payload: { commerceSignals?: unknown[]; contentSignals?: unknown[]; paymentSignals?: unknown[] } | null) {
  return (payload?.commerceSignals?.length ?? 0) + (payload?.contentSignals?.length ?? 0) + (payload?.paymentSignals?.length ?? 0);
}

function approvalsForStore(plan: RevenueSignalConnectorApprovalPlan, storeId: string | null) {
  if (!storeId) return [];

  return plan.approvals.filter((approval) => approval.storeId === storeId || approval.manifest.target.storeId === storeId);
}

function readyManifestsForStore(plan: RevenueSignalConnectorApprovalPlan, storeId: string | null) {
  if (!storeId) return [];

  const queuedManifestIds = new Set(plan.approvalQueue.map((item) => item.manifestId));
  return plan.connectorPlan.manifests
    .filter((manifest) => queuedManifestIds.has(manifest.id))
    .filter((manifest) => manifest.target.storeId === storeId)
    .filter((manifest) => manifest.status === "ready_for_approval");
}

function importQueueForStore(plan: RevenueSignalConnectorApprovalPlan, storeId: string | null) {
  const approvalIds = new Set(approvalsForStore(plan, storeId).map((approval) => approval.id));

  return plan.importQueue.filter((item) => approvalIds.has(item.approvalId));
}

function readyHandoffsForStore(input: {
  approvalPlan: RevenueSignalConnectorApprovalPlan;
  handoffPlan: RevenueSignalImportHandoffPlan;
  storeId: string | null;
}) {
  const approvalIds = new Set(approvalsForStore(input.approvalPlan, input.storeId).map((approval) => approval.id));

  return input.handoffPlan.readyHandoffs.filter((handoff) => approvalIds.has(handoff.approvalId));
}

function pendingApprovalIdsForStore(plan: RevenueSignalConnectorApprovalPlan, storeId: string | null) {
  return approvalsForStore(plan, storeId)
    .filter((approval) => approval.status === "pending_review")
    .map((approval) => approval.id);
}

function commandHashesForChecklistItem(plan: PortfolioCommandCenterPlan, item: RevenueLaunchChecklistItem) {
  const hashes = new Set<string>();

  for (const command of plan.commandActions) {
    if (
      item.assetSignal
      && command.targetId === item.assetSignal.assetId
      && command.targetType === item.assetSignal.assetType
    ) {
      hashes.add(command.commandHash);
    }

    if (item.storeId && command.targetType === "store" && command.targetId === item.storeId) {
      hashes.add(command.commandHash);
    }
  }

  return Array.from(hashes);
}

function baseAction(input: {
  blockedReason?: string | null;
  dispatchKind: RevenueLaunchChecklistActionBridgeDispatchKind;
  endpoint: string;
  item: RevenueLaunchChecklistItem;
  payload: Record<string, unknown>;
  status: RevenueLaunchChecklistActionBridgeStatus;
  summary: string;
}): RevenueLaunchChecklistActionBridgeItem {
  return {
    actionId: slug(`${input.item.id}:${input.item.nextAction}:${input.dispatchKind}`),
    blockedReason: input.blockedReason ?? null,
    checklistAction: input.item.nextAction,
    checklistItemId: input.item.id,
    confirmationRequired: revenueLaunchChecklistActionBridgeConfirmation,
    dispatchKind: input.dispatchKind,
    endpoint: input.endpoint,
    externalExecution: false,
    payload: input.payload,
    priorityScore: input.item.priorityScore,
    providerContacted: false,
    status: input.status,
    storeId: input.item.storeId,
    storeName: input.item.storeName,
    summary: input.summary
  };
}

function manualReviewAction(item: RevenueLaunchChecklistItem, reason: string, endpoint: string) {
  return baseAction({
    blockedReason: reason,
    dispatchKind: "manual_review",
    endpoint,
    item,
    payload: {
      checklistAction: item.nextAction,
      opportunityId: item.opportunityId,
      storeId: item.storeId
    },
    status: item.nextAction === "monitor_scale_or_rotate" || item.nextAction === "hold_review" ? "watch" : "blocked",
    summary: `${item.nextActionLabel} needs direct operator review before dispatch.`
  });
}

function actionForChecklistItem(input: {
  approvalPlan: RevenueSignalConnectorApprovalPlan;
  commandPlan: PortfolioCommandCenterPlan;
  handoffPlan: RevenueSignalImportHandoffPlan;
  item: RevenueLaunchChecklistItem;
}): RevenueLaunchChecklistActionBridgeItem {
  const { approvalPlan, commandPlan, handoffPlan, item } = input;
  const launchAction = launchActionMap[item.nextAction];

  if (launchAction) {
    if (!item.storeId) {
      return manualReviewAction(item, "A linked store is required before launch-pipeline dispatch.", "/merch/revenue-engine/launch-pipeline");
    }

    return baseAction({
      dispatchKind: "launch_pipeline",
      endpoint: "/merch/revenue-engine/launch-pipeline/apply",
      item,
      payload: {
        launchAction,
        storeId: item.storeId
      },
      status: "ready",
      summary: `${item.nextActionLabel} can dispatch to the internal Launch Pipeline for ${item.storeName}.`
    });
  }

  if (item.nextAction === "run_listing_optimization") {
    if (!item.storeId) {
      return manualReviewAction(item, "A linked store is required before listing optimization dispatch.", "/merch/revenue-engine/listing-optimization");
    }

    return baseAction({
      dispatchKind: "listing_optimization",
      endpoint: "/merch/revenue-engine/listing-optimization/apply",
      item,
      payload: {
        storeId: item.storeId
      },
      status: "ready",
      summary: `Listing optimization can update internal product listing drafts for ${item.storeName}.`
    });
  }

  if (item.nextAction === "prepare_store_setup") {
    if (!item.storeId) {
      return manualReviewAction(item, "A linked store is required before store setup dispatch.", "/merch/revenue-engine/store-setup");
    }

    return baseAction({
      dispatchKind: "store_setup",
      endpoint: "/merch/revenue-engine/store-setup/apply",
      item,
      payload: {
        storeId: item.storeId
      },
      status: "ready",
      summary: `Store setup can move ${item.storeName} through the internal setup runbook.`
    });
  }

  if (item.nextAction === "queue_connector_approval") {
    const manifests = readyManifestsForStore(approvalPlan, item.storeId);

    return baseAction({
      blockedReason: manifests.length === 0 ? "No ready read-only connector manifests are available for this store." : null,
      dispatchKind: "signal_connector_approval",
      endpoint: "/merch/revenue-engine/signal-connectors/approvals/apply",
      item,
      payload: {
        manifestIds: manifests.map((manifest: RevenueSignalConnectorManifest) => manifest.id),
        sampleSignals: manifests.reduce((sum, manifest) => sum + sampleSignalCount(manifest.samplePayload), 0),
        storeId: item.storeId
      },
      status: manifests.length > 0 ? "ready" : "blocked",
      summary: `${manifests.length} read-only connector manifest${manifests.length === 1 ? "" : "s"} can queue approval records for ${item.storeName}.`
    });
  }

  if (item.nextAction === "review_connector_approval") {
    const approvalIds = pendingApprovalIdsForStore(approvalPlan, item.storeId);

    return baseAction({
      blockedReason: "Connector approval review requires an explicit approve or reject decision in the approval center.",
      dispatchKind: "manual_review",
      endpoint: "/merch/revenue-engine/signal-connectors/approvals",
      item,
      payload: {
        pendingApprovalIds: approvalIds,
        storeId: item.storeId
      },
      status: "blocked",
      summary: `${approvalIds.length} connector approval${approvalIds.length === 1 ? "" : "s"} require direct review for ${item.storeName}.`
    });
  }

  if (item.nextAction === "queue_signal_import_job") {
    const importQueue = importQueueForStore(approvalPlan, item.storeId);

    return baseAction({
      blockedReason: importQueue.length === 0 ? "No approved connector approvals are ready to queue import jobs for this store." : null,
      dispatchKind: "signal_import_job",
      endpoint: "/merch/revenue-engine/signal-connectors/import-jobs/apply",
      item,
      payload: {
        approvalIds: importQueue.map((queueItem) => queueItem.approvalId),
        sampleSignals: importQueue.reduce((sum, queueItem) => sum + queueItem.sampleSignals, 0),
        storeId: item.storeId
      },
      status: importQueue.length > 0 ? "ready" : "blocked",
      summary: `${importQueue.length} approved connector${importQueue.length === 1 ? "" : "s"} can queue read-only import jobs for ${item.storeName}.`
    });
  }

  if (item.nextAction === "ingest_import_handoff") {
    const handoffs = readyHandoffsForStore({ approvalPlan, handoffPlan, storeId: item.storeId });

    return baseAction({
      blockedReason: handoffs.length === 0 ? "No queued read-only import jobs are ready for Signal Intake handoff for this store." : null,
      dispatchKind: "signal_import_handoff",
      endpoint: "/merch/revenue-engine/signal-connectors/import-handoff/apply",
      item,
      payload: {
        importJobIds: handoffs.map((handoff) => handoff.importJobId),
        sampleSignals: handoffs.reduce((sum, handoff) => sum + handoff.sampleSignals, 0),
        storeId: item.storeId
      },
      status: handoffs.length > 0 ? "ready" : "blocked",
      summary: `${handoffs.length} queued read-only import job${handoffs.length === 1 ? "" : "s"} can hand off stored signals for ${item.storeName}.`
    });
  }

  if (item.nextAction === "apply_portfolio_commands") {
    const commandHashes = commandHashesForChecklistItem(commandPlan, item);

    return baseAction({
      blockedReason: commandHashes.length === 0 ? "No matching portfolio command records are available for this checklist item." : null,
      dispatchKind: "portfolio_command",
      endpoint: "/merch/portfolio-command-center/actions/apply",
      item,
      payload: {
        assetFinalRank: item.assetSignal?.finalRank ?? null,
        assetId: item.assetSignal?.assetId ?? null,
        assetRecommendation: item.assetSignal?.recommendation ?? null,
        assetType: item.assetSignal?.assetType ?? null,
        commandHashes,
        nextInternalState: item.assetSignal?.nextInternalState ?? null,
        storeId: item.storeId
      },
      status: commandHashes.length > 0 ? "ready" : "blocked",
      summary: `${commandHashes.length} portfolio command${commandHashes.length === 1 ? "" : "s"} can be recorded for ${item.storeName}.`
    });
  }

  if (item.nextAction === "ingest_performance_snapshot") {
    return manualReviewAction(item, "Performance evidence requires manual revenue/content/payment signal input or approved connector handoff.", "/merch/revenue-engine/signal-intake");
  }

  if (item.nextAction === "create_store_shell") {
    return manualReviewAction(item, "Store shell creation requires the original opportunity idea and factory inputs.", "/merch/revenue-engine/opportunity-factory");
  }

  if (item.nextAction === "request_provider_payload_approval") {
    return manualReviewAction(item, "Provider payload approval requires direct packet review for the selected store.", "/merch/stores/:storeId/provider-payloads/approval-request");
  }

  return manualReviewAction(item, "This checklist item is a monitoring or hold state with no dispatchable internal write.", "/merch/revenue-engine/launch-checklist");
}

function bridgeActionPriority(action: RevenueLaunchChecklistActionBridgeItem) {
  if (action.status !== "ready") return action.status === "watch" ? 100 : 200;

  if (action.dispatchKind === "portfolio_command") {
    if (action.payload.assetRecommendation === "kill") return 0;
    if (action.payload.assetRecommendation === "pause") return 1;
    if (action.payload.assetRecommendation === "scale") return 2;

    return 3;
  }

  const dispatchRank: Record<RevenueLaunchChecklistActionBridgeDispatchKind, number> = {
    manual_review: 90,
    launch_pipeline: 40,
    listing_optimization: 35,
    portfolio_command: 3,
    signal_connector_approval: 30,
    signal_import_handoff: 20,
    signal_import_job: 25,
    store_setup: 38
  };

  return dispatchRank[action.dispatchKind];
}

function totalsFor(actions: RevenueLaunchChecklistActionBridgeItem[]) {
  return {
    actions: actions.length,
    blockedActions: actions.filter((action) => action.status === "blocked").length,
    connectorApprovalActions: actions.filter((action) => action.dispatchKind === "signal_connector_approval").length,
    importHandoffActions: actions.filter((action) => action.dispatchKind === "signal_import_handoff").length,
    importJobActions: actions.filter((action) => action.dispatchKind === "signal_import_job").length,
    launchPipelineActions: actions.filter((action) => action.dispatchKind === "launch_pipeline").length,
    listingOptimizationActions: actions.filter((action) => action.dispatchKind === "listing_optimization").length,
    manualReviewActions: actions.filter((action) => action.dispatchKind === "manual_review").length,
    portfolioCommandActions: actions.filter((action) => action.dispatchKind === "portfolio_command").length,
    readyActions: actions.filter((action) => action.status === "ready").length,
    storeSetupActions: actions.filter((action) => action.dispatchKind === "store_setup").length,
    watchActions: actions.filter((action) => action.status === "watch").length
  };
}

export function buildRevenueLaunchChecklistActionBridgePlan(input: ActionBridgeInput): RevenueLaunchChecklistActionBridgePlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const options = optionsWithDefaults(input.options);
  const actions = input.checklistPlan.items
    .map((item) => actionForChecklistItem({
      approvalPlan: input.signalApprovalPlan,
      commandPlan: input.commandPlan,
      handoffPlan: input.signalImportHandoffPlan,
      item
    }))
    .sort((a, b) => (
      bridgeActionPriority(a) - bridgeActionPriority(b)
      || b.priorityScore - a.priorityScore
      || a.storeName.localeCompare(b.storeName)
    ))
    .slice(0, options.maxActions);
  const totals = totalsFor(actions);

  return {
    actions,
    auditEvents: [
      "Revenue Launch Checklist items were mapped onto existing internal module apply endpoints.",
      "Ready bridge actions include only store-scoped or id-scoped internal dispatch payloads.",
      "Manual-review actions remain blocked when they require operator judgment, missing evidence, or module-specific approval."
    ],
    blockedExternalActions: unique([
      ...input.checklistPlan.blockedExternalActions,
      ...input.signalApprovalPlan.blockedExternalActions,
      ...input.signalImportHandoffPlan.blockedExternalActions,
      ...input.commandPlan.blockedExternalActions,
      ...lockedExternalActions
    ]),
    checklist: {
      generatedAt: input.checklistPlan.generatedAt,
      items: input.checklistPlan.totals.items,
      readyItems: input.checklistPlan.totals.readyItems,
      summary: input.checklistPlan.summary
    },
    externalExecution: false,
    generatedAt,
    mode: "Internal Revenue Launch Checklist Action Bridge",
    options,
    providerContacted: false,
    summary: `${totals.readyActions} checklist bridge action${totals.readyActions === 1 ? "" : "s"} are ready for internal dispatch; ${totals.blockedActions} require direct review.`,
    totals
  };
}

export function selectRevenueLaunchChecklistBridgeActions(
  plan: RevenueLaunchChecklistActionBridgePlan,
  actionIds: string[] = []
) {
  const selectedIds = new Set(actionIds);

  return selectedIds.size === 0
    ? plan.actions
      .filter((action) => action.status === "ready")
      .sort((a, b) => bridgeActionPriority(a) - bridgeActionPriority(b) || b.priorityScore - a.priorityScore)
    : plan.actions.filter((action) => selectedIds.has(action.actionId));
}
