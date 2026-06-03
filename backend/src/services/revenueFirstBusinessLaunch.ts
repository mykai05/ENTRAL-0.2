import type { RevenueFirstCashSprintPlan, RevenueFirstCashSprintStep } from "./revenueFirstCashSprint.js";
import type { RevenueLaunchChecklistItem, RevenueLaunchChecklistPlan } from "./revenueLaunchChecklist.js";

export type RevenueFirstBusinessLaunchStatus =
  | "ready_internal"
  | "manual_gate"
  | "blocked"
  | "watch";

export type RevenueFirstBusinessLaunchCandidate = {
  blockers: string[];
  cashReadinessScore: number;
  checklistItemId: string;
  expectedInternalEffect: string;
  externalExecution: false;
  finalRank: number;
  incomeVelocityScore: number;
  launchReadinessScore: number;
  nextInternalAction: string;
  nextInternalState: string;
  priorityScore: number;
  providerContacted: false;
  reason: string;
  recommendedEndpoint: string;
  riskLevel: "low" | "medium" | "high";
  sprintActionId: string | null;
  status: RevenueFirstBusinessLaunchStatus;
  storeId: string | null;
  storeName: string;
  summary: string;
};

export type RevenueFirstBusinessLaunchPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  candidates: RevenueFirstBusinessLaunchCandidate[];
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Engine First Business Launch Path";
  providerContacted: false;
  sprint: {
    readyInternal: number;
    summary: string;
  };
  summary: string;
  topCandidate: RevenueFirstBusinessLaunchCandidate | null;
  totals: {
    blocked: number;
    candidates: number;
    manualGates: number;
    readyInternal: number;
    watch: number;
  };
};

const lockedExternalActions = [
  "Publishing marketplace listings, creating provider-side products, uploading artwork or files, changing storefront settings, posting content, starting ads, or moving money",
  "Opening provider dashboards, launching browser automation, using stealth, proxy rotation, fingerprint spoofing, account warmup, CAPTCHA bypass, or platform-evasion automation"
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function sprintForItem(item: RevenueLaunchChecklistItem, sprintSteps: RevenueFirstCashSprintStep[]) {
  if (!item.storeId) return null;

  return sprintSteps.find((step) => step.storeId === item.storeId) ?? null;
}

function statusFor(item: RevenueLaunchChecklistItem, sprintStep: RevenueFirstCashSprintStep | null): RevenueFirstBusinessLaunchStatus {
  if (sprintStep?.status === "ready_internal") return "ready_internal";
  if (sprintStep?.status === "manual_gate") return "manual_gate";
  if (sprintStep?.status === "blocked" || item.riskLevel === "high" || item.blockers.length > 0) return "blocked";
  if (item.nextAction !== "hold_review" && item.nextAction !== "monitor_scale_or_rotate") return "manual_gate";

  return "watch";
}

function nextStateFor(status: RevenueFirstBusinessLaunchStatus, item: RevenueLaunchChecklistItem, sprintStep: RevenueFirstCashSprintStep | null) {
  if (status === "ready_internal") return "dispatch_ready_first_cash_bridge_action";
  if (status === "manual_gate") return sprintStep?.nextActionTitle ?? item.nextActionLabel;
  if (status === "blocked") return item.blockers[0] ?? sprintStep?.blockers[0] ?? "resolve_launch_blockers";

  return "collect_more_signal_or_launch_evidence";
}

function endpointFor(sprintStep: RevenueFirstCashSprintStep | null, item: RevenueLaunchChecklistItem) {
  return sprintStep?.endpoint ?? (
    item.nextAction === "apply_portfolio_commands"
      ? "/merch/portfolio-command-center"
      : "/merch/revenue-engine/launch-checklist"
  );
}

function statusWeight(status: RevenueFirstBusinessLaunchStatus) {
  if (status === "ready_internal") return 25;
  if (status === "manual_gate") return 12;
  if (status === "watch") return 4;
  return -18;
}

function riskPenalty(riskLevel: "low" | "medium" | "high", blockers: string[]) {
  const risk = riskLevel === "high" ? 22 : riskLevel === "medium" ? 10 : 0;

  return risk + Math.min(blockers.length * 4, 20);
}

function candidateFor(item: RevenueLaunchChecklistItem, sprintStep: RevenueFirstCashSprintStep | null): RevenueFirstBusinessLaunchCandidate {
  const status = statusFor(item, sprintStep);
  const blockers = unique([
    ...item.blockers,
    ...(sprintStep?.blockers ?? [])
  ]);
  const cashReadinessScore = sprintStep?.cashReadinessScore ?? 0;
  const actionability = statusWeight(status);
  const penalty = riskPenalty(item.riskLevel, blockers);
  const finalRank = clamp(Math.round(
    item.priorityScore * 0.36
    + item.incomeVelocityScore * 0.28
    + item.readinessScore * 0.2
    + cashReadinessScore * 0.16
    + actionability
    - penalty
  ), 0, 100);
  const nextInternalAction = sprintStep?.nextActionTitle ?? item.nextActionLabel;
  const expectedInternalEffect = sprintStep?.expectedInternalEffect
    ?? item.commandActions[0]?.expectedInternalEffect
    ?? `Prepare ${item.nextActionLabel.toLowerCase()} as the next internal launch step.`;

  return {
    blockers,
    cashReadinessScore,
    checklistItemId: item.id,
    expectedInternalEffect,
    externalExecution: false,
    finalRank,
    incomeVelocityScore: item.incomeVelocityScore,
    launchReadinessScore: item.readinessScore,
    nextInternalAction,
    nextInternalState: nextStateFor(status, item, sprintStep),
    priorityScore: item.priorityScore,
    providerContacted: false,
    reason: sprintStep?.reason ?? item.summary,
    recommendedEndpoint: endpointFor(sprintStep, item),
    riskLevel: item.riskLevel,
    sprintActionId: sprintStep?.sprintActionId ?? null,
    status,
    storeId: item.storeId,
    storeName: item.storeName,
    summary: `${item.storeName}: ${status.replace(/_/g, " ")} path ranked ${finalRank}/100. Next: ${nextInternalAction}.`
  };
}

export function buildRevenueFirstBusinessLaunchPlan(input: {
  checklistPlan: RevenueLaunchChecklistPlan;
  firstCashSprintPlan: RevenueFirstCashSprintPlan;
  generatedAt?: string;
  maxCandidates?: number;
}): RevenueFirstBusinessLaunchPlan {
  const maxCandidates = clamp(Math.round(input.maxCandidates ?? 8), 1, 25);
  const candidates = input.checklistPlan.items
    .map((item) => candidateFor(item, sprintForItem(item, input.firstCashSprintPlan.steps)))
    .sort((left, right) => (
      Number(right.status === "ready_internal") - Number(left.status === "ready_internal")
      || right.finalRank - left.finalRank
      || right.priorityScore - left.priorityScore
      || left.storeName.localeCompare(right.storeName)
    ))
    .slice(0, maxCandidates);
  const readyInternal = candidates.filter((candidate) => candidate.status === "ready_internal").length;
  const manualGates = candidates.filter((candidate) => candidate.status === "manual_gate").length;
  const blocked = candidates.filter((candidate) => candidate.status === "blocked").length;
  const watch = candidates.filter((candidate) => candidate.status === "watch").length;
  const topCandidate = candidates[0] ?? null;

  return {
    auditEvents: [
      "First Business Launch Path joined Revenue Launch Checklist and First Cash Sprint evidence into one ranked launch target list.",
      "Ready actions dispatch only through existing internal Launch Checklist Action Bridge controls.",
      "No provider, marketplace, payment, social, ad, browser, proxy, upload, payout, bank, card, or external write action was executed."
    ],
    blockedExternalActions: unique([
      ...input.checklistPlan.blockedExternalActions,
      ...input.firstCashSprintPlan.blockedExternalActions,
      ...lockedExternalActions
    ]),
    candidates,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Revenue Engine First Business Launch Path",
    providerContacted: false,
    sprint: {
      readyInternal: input.firstCashSprintPlan.totals.readyInternal,
      summary: input.firstCashSprintPlan.summary
    },
    summary: topCandidate
      ? `${topCandidate.storeName} is the top first-business launch path: ${topCandidate.status.replace(/_/g, " ")}, rank ${topCandidate.finalRank}/100, next ${topCandidate.nextInternalAction}.`
      : "No first-business launch path is available from current checklist and first-cash sprint evidence.",
    topCandidate,
    totals: {
      blocked,
      candidates: candidates.length,
      manualGates,
      readyInternal,
      watch
    }
  };
}
