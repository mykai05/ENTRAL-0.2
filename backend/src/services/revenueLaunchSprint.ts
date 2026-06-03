import type {
  RevenueLaunchChecklistActionBridgeItem,
  RevenueLaunchChecklistActionBridgePlan
} from "./revenueLaunchChecklistActionBridge.js";
import { selectRevenueLaunchChecklistBridgeActions } from "./revenueLaunchChecklistActionBridge.js";
import type { RevenueLaunchChecklistPlan } from "./revenueLaunchChecklist.js";

export const revenueLaunchSprintConfirmation = "RUN INTERNAL REVENUE LAUNCH SPRINT";

export type RevenueLaunchSprintStopReason =
  | "cycle_limit"
  | "dry_run"
  | "manual_review_required"
  | "no_ready_actions";

export type RevenueLaunchSprintOptions = {
  includeCompleted: boolean;
  maxActions: number;
  maxCycles: number;
  maxItems: number;
  minPriorityScore: number;
  windowDays: number;
};

export type RevenueLaunchSprintDispatchSummary = {
  actionsBlocked: number;
  actionsDispatched: number;
  actionsPreviewed: number;
  actionsSelected: number;
  actionsSkipped: number;
  assetControlActionsSkipped: number;
  assetControlRecordsCreated: number;
  commandRecordsCreated: number;
  dryRun: boolean;
  externalExecution: false;
  internalStatusUpdates: number;
  providerContacted: false;
  summary: string;
};

export type RevenueLaunchSprintCycle = {
  blockedActions: number;
  cycle: number;
  dispatched: RevenueLaunchSprintDispatchSummary | null;
  manualReviewActions: Array<{
    actionId: string;
    blockedReason: string | null;
    checklistAction: RevenueLaunchChecklistActionBridgeItem["checklistAction"];
    dispatchKind: RevenueLaunchChecklistActionBridgeItem["dispatchKind"];
    endpoint: string;
    storeId: string | null;
    storeName: string;
  }>;
  readyActions: number;
  scoreControlActions: number;
  selectedActionIds: string[];
  selectedDispatchKinds: RevenueLaunchChecklistActionBridgeItem["dispatchKind"][];
  watchActions: number;
};

export type RevenueLaunchSprintFactorySummary = {
  auditLogId: string | null;
  businessName: string | null;
  dryRun: boolean;
  externalExecution: false;
  opportunityId: string | null;
  productDraftsCreated: number;
  providerContacted: false;
  skippedExistingProducts: number;
  storeCreated: boolean;
  storeId: string | null;
};

export type RevenueLaunchSprintPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  cycles: RevenueLaunchSprintCycle[];
  externalExecution: false;
  factory: RevenueLaunchSprintFactorySummary | null;
  finalChecklist: {
    blockedItems: number;
    importHandoffsReady: number;
    items: number;
    readyItems: number;
    scoredAssets: number;
    signalEvidenceItems: number;
    summary: string;
  };
  finalManualReviewActions: RevenueLaunchSprintCycle["manualReviewActions"];
  finalReadyActions: number;
  generatedAt: string;
  mode: "Internal Revenue Launch Sprint";
  options: RevenueLaunchSprintOptions;
  providerContacted: false;
  stopReason: RevenueLaunchSprintStopReason;
  summary: string;
  totals: {
    actionsBlocked: number;
    actionsDispatched: number;
    actionsPreviewed: number;
    actionsSelected: number;
    actionsSkipped: number;
    assetControlActionsSkipped: number;
    assetControlRecordsCreated: number;
    commandRecordsCreated: number;
    cyclesRun: number;
    factoryProductDraftsCreated: number;
    factoryStoreCreated: number;
    internalStatusUpdates: number;
    manualReviewActions: number;
    scoreControlActions: number;
  };
};

type SprintPlanInput = {
  bridgePlan: RevenueLaunchChecklistActionBridgePlan;
  checklistPlan: RevenueLaunchChecklistPlan;
  cycles: RevenueLaunchSprintCycle[];
  dryRun: boolean;
  factory?: RevenueLaunchSprintFactorySummary | null;
  generatedAt?: string;
  options: RevenueLaunchSprintOptions;
};

const sprintBlockedExternalActions = [
  "Publishing listings, creating provider-side products, uploading artwork/files, posting content, starting ads, or changing storefronts",
  "Approving connector access, creating write scopes, importing live provider data, opening provider admin sessions, or approving/rejecting review records",
  "Moving money, approving payouts, changing bank/card/payment settings, or executing Stripe Treasury or Connect transfers",
  "Running browser stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, CAPTCHA bypass, or platform-evasion automation"
];

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function manualReviewActions(plan: RevenueLaunchChecklistActionBridgePlan): RevenueLaunchSprintCycle["manualReviewActions"] {
  return plan.actions
    .filter((action) => action.status === "blocked" || action.dispatchKind === "manual_review")
    .map((action) => ({
      actionId: action.actionId,
      blockedReason: action.blockedReason,
      checklistAction: action.checklistAction,
      dispatchKind: action.dispatchKind,
      endpoint: action.endpoint,
      storeId: action.storeId,
      storeName: action.storeName
    }));
}

function scoreControlAction(action: RevenueLaunchChecklistActionBridgeItem) {
  return action.dispatchKind === "portfolio_command"
    && (
      action.payload.assetRecommendation === "kill"
      || action.payload.assetRecommendation === "pause"
      || action.payload.assetRecommendation === "scale"
    );
}

export function selectRevenueLaunchSprintBridgeActions(plan: RevenueLaunchChecklistActionBridgePlan) {
  return selectRevenueLaunchChecklistBridgeActions(plan)
    .sort((a, b) => (
      Number(scoreControlAction(b)) - Number(scoreControlAction(a))
      || b.priorityScore - a.priorityScore
      || a.storeName.localeCompare(b.storeName)
    ))
    .slice(0, plan.options.maxActions);
}

export function buildRevenueLaunchSprintCycle(input: {
  bridgePlan: RevenueLaunchChecklistActionBridgePlan;
  cycle: number;
  dispatched?: RevenueLaunchSprintDispatchSummary | null;
  selectedActions: RevenueLaunchChecklistActionBridgeItem[];
}): RevenueLaunchSprintCycle {
  return {
    blockedActions: input.bridgePlan.totals.blockedActions,
    cycle: input.cycle,
    dispatched: input.dispatched ?? null,
    manualReviewActions: manualReviewActions(input.bridgePlan),
    readyActions: input.bridgePlan.totals.readyActions,
    scoreControlActions: input.selectedActions.filter(scoreControlAction).length,
    selectedActionIds: input.selectedActions.map((action) => action.actionId),
    selectedDispatchKinds: input.selectedActions.map((action) => action.dispatchKind),
    watchActions: input.bridgePlan.totals.watchActions
  };
}

function stopReasonFor(input: SprintPlanInput): RevenueLaunchSprintStopReason {
  if (input.dryRun) return "dry_run";
  if (input.cycles.length >= input.options.maxCycles && input.bridgePlan.totals.readyActions > 0) return "cycle_limit";
  if (input.bridgePlan.totals.readyActions === 0 && manualReviewActions(input.bridgePlan).length > 0) return "manual_review_required";

  return "no_ready_actions";
}

export function buildRevenueLaunchSprintPlan(input: SprintPlanInput): RevenueLaunchSprintPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const finalManualReviewActions = manualReviewActions(input.bridgePlan);
  const stopReason = stopReasonFor(input);
  const totals = input.cycles.reduce((accumulator, cycle) => {
    accumulator.actionsBlocked += cycle.dispatched?.actionsBlocked ?? 0;
    accumulator.actionsDispatched += cycle.dispatched?.actionsDispatched ?? 0;
    accumulator.actionsPreviewed += cycle.dispatched?.actionsPreviewed ?? 0;
    accumulator.actionsSelected += cycle.dispatched?.actionsSelected ?? cycle.selectedActionIds.length;
    accumulator.actionsSkipped += cycle.dispatched?.actionsSkipped ?? 0;
    accumulator.assetControlActionsSkipped += cycle.dispatched?.assetControlActionsSkipped ?? 0;
    accumulator.assetControlRecordsCreated += cycle.dispatched?.assetControlRecordsCreated ?? 0;
    accumulator.commandRecordsCreated += cycle.dispatched?.commandRecordsCreated ?? 0;
    accumulator.internalStatusUpdates += cycle.dispatched?.internalStatusUpdates ?? 0;
    accumulator.scoreControlActions += cycle.scoreControlActions;

    return accumulator;
  }, {
    actionsBlocked: 0,
    actionsDispatched: 0,
    actionsPreviewed: 0,
    actionsSelected: 0,
    actionsSkipped: 0,
    assetControlActionsSkipped: 0,
    assetControlRecordsCreated: 0,
    commandRecordsCreated: 0,
    cyclesRun: input.cycles.length,
    factoryProductDraftsCreated: input.factory?.productDraftsCreated ?? 0,
    factoryStoreCreated: input.factory?.storeCreated ? 1 : 0,
    internalStatusUpdates: 0,
    manualReviewActions: finalManualReviewActions.length,
    scoreControlActions: 0
  });
  const summary = input.dryRun
    ? `Launch Sprint previewed ${totals.actionsPreviewed} internal bridge action${totals.actionsPreviewed === 1 ? "" : "s"} across ${totals.cyclesRun} cycle${totals.cyclesRun === 1 ? "" : "s"}.`
    : `Launch Sprint dispatched ${totals.actionsDispatched} internal bridge action${totals.actionsDispatched === 1 ? "" : "s"} across ${totals.cyclesRun} cycle${totals.cyclesRun === 1 ? "" : "s"}; stop reason: ${stopReason.replace(/_/g, " ")}.`;

  return {
    auditEvents: [
      "Revenue Launch Sprint optionally created one internal opportunity, then repeatedly refreshed the checklist action bridge.",
      "Each sprint cycle dispatched only bridge actions already marked ready by their source module.",
      "Revenue Engine score-control actions from pause, kill, or scale recommendations were selected before launch handoff and signal import work.",
      "Manual-review and external-execution actions remained blocked and became sprint stop conditions."
    ],
    blockedExternalActions: unique([
      ...input.bridgePlan.blockedExternalActions,
      ...input.checklistPlan.blockedExternalActions,
      ...sprintBlockedExternalActions
    ]),
    cycles: input.cycles,
    externalExecution: false,
    factory: input.factory ?? null,
    finalChecklist: {
      blockedItems: input.checklistPlan.totals.blockedItems,
      importHandoffsReady: input.checklistPlan.totals.importHandoffsReady,
      items: input.checklistPlan.totals.items,
      readyItems: input.checklistPlan.totals.readyItems,
      scoredAssets: input.checklistPlan.totals.scoredAssets,
      signalEvidenceItems: input.checklistPlan.totals.signalEvidenceItems,
      summary: input.checklistPlan.summary
    },
    finalManualReviewActions,
    finalReadyActions: input.bridgePlan.totals.readyActions,
    generatedAt,
    mode: "Internal Revenue Launch Sprint",
    options: input.options,
    providerContacted: false,
    stopReason,
    summary,
    totals
  };
}
