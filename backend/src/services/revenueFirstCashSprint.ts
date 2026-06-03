import type { RevenueFirstCashCandidate, RevenueFirstCashNextAction, RevenueFirstCashReadinessPlan } from "./revenueFirstCashReadiness.js";
import type {
  RevenueLaunchChecklistActionBridgeDispatchKind,
  RevenueLaunchChecklistActionBridgeItem,
  RevenueLaunchChecklistActionBridgePlan
} from "./revenueLaunchChecklistActionBridge.js";
import type { RevenueLaunchChecklistNextAction } from "./revenueLaunchChecklist.js";

export const revenueFirstCashSprintConfirmation = "RUN INTERNAL FIRST CASH SPRINT";

export type RevenueFirstCashSprintOptions = {
  includeBlocked: boolean;
  maxCandidates: number;
  maxSprintActions: number;
  targetDaysToFirstCash: number;
};

export type RevenueFirstCashSprintStepStatus =
  | "blocked"
  | "manual_gate"
  | "ready_internal"
  | "watch";

export type RevenueFirstCashSprintStep = {
  action: RevenueFirstCashNextAction;
  automaticCashEtaDays: number | null;
  bridgeActionId: string | null;
  blockers: string[];
  candidateRank: number;
  cashReadinessScore: number;
  dispatchKind: RevenueLaunchChecklistActionBridgeDispatchKind | "none";
  endpoint: string;
  estimatedFirstSaleDays: number | null;
  expectedInternalEffect: string;
  externalExecution: false;
  manualLaunchReady: boolean;
  nextActionTitle: string;
  priorityScore: number;
  providerContacted: false;
  reason: string;
  sprintActionId: string;
  status: RevenueFirstCashSprintStepStatus;
  storeId: string;
  storeName: string;
};

export type RevenueFirstCashSprintPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  bridge: {
    actions: number;
    readyActions: number;
    summary: string;
  };
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Engine First Cash Sprint";
  options: RevenueFirstCashSprintOptions;
  providerContacted: false;
  readiness: {
    summary: string;
    topAutomaticCashEtaDays: number | null;
    topFirstSaleEtaDays: number | null;
    topStoreId: string | null;
    topStoreName: string | null;
  };
  steps: RevenueFirstCashSprintStep[];
  summary: string;
  totals: {
    blocked: number;
    candidates: number;
    eligibleBridgeActions: number;
    manualGates: number;
    readyInternal: number;
    steps: number;
    targetReady: number;
    watch: number;
  };
};

const defaultOptions: RevenueFirstCashSprintOptions = {
  includeBlocked: true,
  maxCandidates: 8,
  maxSprintActions: 5,
  targetDaysToFirstCash: 7
};

const blockedExternalActions = [
  "Publishing listings, products, storefront changes, uploads, posts, ads, payouts, transfers, or payment actions",
  "Opening provider dashboards, browser sessions, proxy pools, fingerprint profiles, or automation contexts",
  "Running stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, CAPTCHA bypass, or platform-evasion automation"
];

const bridgeActionsByFirstCashAction: Partial<Record<RevenueFirstCashNextAction, RevenueLaunchChecklistNextAction[]>> = {
  generate_provider_handoff: ["generate_provider_handoff"],
  optimize_listings: ["run_listing_optimization"],
  prepare_store_setup: ["prepare_store_setup"],
  queue_launch_approval: ["queue_launch_approval"],
  queue_payment_readiness_review: ["queue_connector_approval", "review_connector_approval"],
  queue_readonly_approvals: ["queue_connector_approval"],
  seed_product_drafts: ["seed_product_drafts"]
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9:_-]+/g, "_").replace(/^_+|_+$/g, "") || "first_cash_action";
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function withRevenueFirstCashSprintOptions(input: Partial<RevenueFirstCashSprintOptions> = {}): RevenueFirstCashSprintOptions {
  return {
    includeBlocked: input.includeBlocked ?? defaultOptions.includeBlocked,
    maxCandidates: clamp(Math.round(input.maxCandidates ?? defaultOptions.maxCandidates), 1, 25),
    maxSprintActions: clamp(Math.round(input.maxSprintActions ?? defaultOptions.maxSprintActions), 1, 25),
    targetDaysToFirstCash: clamp(Math.round(input.targetDaysToFirstCash ?? defaultOptions.targetDaysToFirstCash), 1, 90)
  };
}

function bridgePriority(action: RevenueLaunchChecklistActionBridgeItem) {
  if (action.status === "ready") return 0;
  if (action.status === "watch") return 1;
  return 2;
}

function bridgeActionForCandidate(candidate: RevenueFirstCashCandidate, bridgePlan: RevenueLaunchChecklistActionBridgePlan) {
  const checklistActions = bridgeActionsByFirstCashAction[candidate.nextAction.action] ?? [];

  if (checklistActions.length === 0) return null;

  return bridgePlan.actions
    .filter((action) => action.storeId === candidate.storeId)
    .filter((action) => checklistActions.includes(action.checklistAction))
    .sort((left, right) => (
      bridgePriority(left) - bridgePriority(right)
      || right.priorityScore - left.priorityScore
      || left.actionId.localeCompare(right.actionId)
    ))[0] ?? null;
}

function statusFor(candidate: RevenueFirstCashCandidate, bridgeAction: RevenueLaunchChecklistActionBridgeItem | null): RevenueFirstCashSprintStepStatus {
  if (candidate.status === "blocked") return "blocked";
  if (bridgeAction?.status === "ready") return "ready_internal";
  if (bridgeAction?.status === "watch") return "watch";
  if (bridgeAction?.status === "blocked") return "blocked";
  if (candidate.nextAction.action === "resolve_blockers") return "blocked";

  return "manual_gate";
}

function endpointFor(candidate: RevenueFirstCashCandidate, bridgeAction: RevenueLaunchChecklistActionBridgeItem | null) {
  if (bridgeAction) return bridgeAction.endpoint;

  if (candidate.nextAction.action === "final_operator_launch_review") return "/merch/revenue-engine/launch-readiness";
  if (candidate.nextAction.action === "queue_payment_readiness_review") return "/merch/revenue-engine/live-connector-readiness";

  return "/merch/revenue-engine/launch-checklist";
}

function expectedEffect(candidate: RevenueFirstCashCandidate, bridgeAction: RevenueLaunchChecklistActionBridgeItem | null, status: RevenueFirstCashSprintStepStatus) {
  if (bridgeAction && status === "ready_internal") {
    return bridgeAction.summary;
  }

  if (status === "manual_gate") {
    return `${candidate.nextAction.title} requires direct operator approval before the cash path can advance.`;
  }

  if (status === "blocked") {
    return candidate.blockers[0]?.title ?? "Resolve readiness blockers before this cash path can advance.";
  }

  return bridgeAction?.summary ?? candidate.nextAction.reason;
}

function priorityFor(candidate: RevenueFirstCashCandidate, bridgeAction: RevenueLaunchChecklistActionBridgeItem | null, rank: number, status: RevenueFirstCashSprintStepStatus) {
  const etaBoost = candidate.estimatedFirstSaleDays === null ? 0 : Math.max(0, 30 - candidate.estimatedFirstSaleDays);
  const readyBoost = status === "ready_internal" ? 20 : status === "manual_gate" ? 10 : 0;
  const bridgeBoost = bridgeAction?.priorityScore ? Math.round(bridgeAction.priorityScore / 5) : 0;

  return clamp(Math.round(candidate.cashReadinessScore + etaBoost + readyBoost + bridgeBoost - rank), 0, 160);
}

function buildStep(input: {
  bridgePlan: RevenueLaunchChecklistActionBridgePlan;
  candidate: RevenueFirstCashCandidate;
  rank: number;
}): RevenueFirstCashSprintStep {
  const bridgeAction = bridgeActionForCandidate(input.candidate, input.bridgePlan);
  const status = statusFor(input.candidate, bridgeAction);
  const blockers = input.candidate.blockers.map((blocker) => blocker.title);

  return {
    action: input.candidate.nextAction.action,
    automaticCashEtaDays: input.candidate.automaticCashEtaDays,
    bridgeActionId: status === "ready_internal" ? bridgeAction?.actionId ?? null : null,
    blockers,
    candidateRank: input.rank,
    cashReadinessScore: input.candidate.cashReadinessScore,
    dispatchKind: bridgeAction?.dispatchKind ?? "none",
    endpoint: endpointFor(input.candidate, bridgeAction),
    estimatedFirstSaleDays: input.candidate.estimatedFirstSaleDays,
    expectedInternalEffect: expectedEffect(input.candidate, bridgeAction, status),
    externalExecution: false,
    manualLaunchReady: input.candidate.manualLaunchReady,
    nextActionTitle: input.candidate.nextAction.title,
    priorityScore: priorityFor(input.candidate, bridgeAction, input.rank, status),
    providerContacted: false,
    reason: input.candidate.nextAction.reason,
    sprintActionId: slug(`first_cash:${input.candidate.storeId}:${input.candidate.nextAction.action}`),
    status,
    storeId: input.candidate.storeId,
    storeName: input.candidate.storeName
  };
}

export function selectRevenueFirstCashSprintBridgeActionIds(plan: RevenueFirstCashSprintPlan, sprintActionIds: string[] = []) {
  const requested = new Set(sprintActionIds);

  return plan.steps
    .filter((step) => step.status === "ready_internal" && step.bridgeActionId)
    .filter((step) => requested.size === 0 || requested.has(step.sprintActionId))
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .map((step) => step.bridgeActionId!)
    .slice(0, plan.options.maxSprintActions);
}

export function buildRevenueFirstCashSprintPlan(input: {
  bridgePlan: RevenueLaunchChecklistActionBridgePlan;
  firstCashPlan: RevenueFirstCashReadinessPlan;
  generatedAt?: string;
  options?: Partial<RevenueFirstCashSprintOptions>;
}): RevenueFirstCashSprintPlan {
  const options = withRevenueFirstCashSprintOptions({
    includeBlocked: input.firstCashPlan.options.includeBlocked,
    maxCandidates: input.firstCashPlan.options.maxCandidates,
    targetDaysToFirstCash: input.firstCashPlan.options.targetDaysToFirstCash,
    ...input.options
  });
  const candidates = input.firstCashPlan.candidates
    .filter((candidate) => options.includeBlocked || candidate.status !== "blocked")
    .slice(0, options.maxCandidates);
  const steps = candidates
    .map((candidate, index) => buildStep({
      bridgePlan: input.bridgePlan,
      candidate,
      rank: index + 1
    }))
    .sort((left, right) => (
      Number(right.status === "ready_internal") - Number(left.status === "ready_internal")
      || right.priorityScore - left.priorityScore
      || (left.estimatedFirstSaleDays ?? 999) - (right.estimatedFirstSaleDays ?? 999)
    ))
    .slice(0, options.maxSprintActions);
  const topCandidate = input.firstCashPlan.topCandidate;
  const readyInternal = steps.filter((step) => step.status === "ready_internal").length;
  const manualGates = steps.filter((step) => step.status === "manual_gate").length;
  const blocked = steps.filter((step) => step.status === "blocked").length;
  const watch = steps.filter((step) => step.status === "watch").length;
  const eligibleBridgeActions = steps.filter((step) => step.bridgeActionId).length;

  return {
    auditEvents: [
      "First Cash Sprint converted ranked first-cash candidates into the next internal sprint moves.",
      "Ready sprint moves map to existing Launch Checklist Action Bridge records, preserving command-chain dispatch controls.",
      "Manual-gate sprint moves identify the exact operator review needed before launch or automatic-cash readiness can advance.",
      "No provider, marketplace, payment, browser, social, upload, payout, ad, proxy, fingerprint, or platform-evasion system was contacted."
    ],
    blockedExternalActions: unique([
      ...blockedExternalActions,
      ...input.firstCashPlan.blockedExternalActions,
      ...input.bridgePlan.blockedExternalActions
    ]),
    bridge: {
      actions: input.bridgePlan.totals.actions,
      readyActions: input.bridgePlan.totals.readyActions,
      summary: input.bridgePlan.summary
    },
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Revenue Engine First Cash Sprint",
    options,
    providerContacted: false,
    readiness: {
      summary: input.firstCashPlan.summary,
      topAutomaticCashEtaDays: topCandidate?.automaticCashEtaDays ?? null,
      topFirstSaleEtaDays: topCandidate?.estimatedFirstSaleDays ?? null,
      topStoreId: topCandidate?.storeId ?? null,
      topStoreName: topCandidate?.storeName ?? null
    },
    steps,
    summary: steps.length > 0
      ? `${steps.length} first-cash sprint move${steps.length === 1 ? "" : "s"} prioritized: ${readyInternal} ready internal, ${manualGates} manual-gated, ${blocked} blocked. Top path: ${topCandidate?.storeName ?? "none"}.`
      : "No first-cash sprint moves are available from current readiness evidence.",
    totals: {
      blocked,
      candidates: candidates.length,
      eligibleBridgeActions,
      manualGates,
      readyInternal,
      steps: steps.length,
      targetReady: input.firstCashPlan.totals.targetReady,
      watch
    }
  };
}
