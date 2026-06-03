import type { RevenueLaunchOperationsPack, RevenueLaunchOperationsPackPlan } from "./revenueLaunchOperationsPack.js";
import type { RevenuePerformanceDigest, RevenuePerformanceStoreScore } from "./revenuePerformance.js";

export const revenueLaunchClosureLedgerConfirmation = "RECORD INTERNAL LAUNCH CLOSURE LEDGER";

export type RevenueLaunchClosureLedgerStatus =
  | "blocked"
  | "needs_review"
  | "ready_for_manual_launch"
  | "monitoring_ready";

export type RevenueLaunchClosureLedgerAction =
  | "record_closure_scorecard"
  | "schedule_monitoring"
  | "review_launch_pack"
  | "resolve_blockers";

export type RevenueLaunchClosureLedgerOptions = {
  expectedOrderValue: number;
  includeBlocked: boolean;
  maxEntries: number;
  minClosureScore: number;
  monitoringWindowDays: number;
  targetFirstWeekRevenue: number;
};

export type RevenueLaunchClosureMonitoringTrigger = {
  blockedExternalActions: string[];
  cadence: string;
  evidenceRequired: string[];
  externalExecution: false;
  providerContacted: false;
  status: "queued_internal" | "blocked_review";
  trigger: "revenue_snapshot" | "content_signal" | "refund_watch" | "payout_governance" | "scale_or_rotate_review";
};

export type RevenueLaunchClosureLedgerEntry = {
  blockers: Array<{
    code: string;
    severity: "low" | "medium" | "high";
    title: string;
  }>;
  closureScore: number;
  externalExecution: false;
  expectedFirstWeekRevenue: {
    assumptions: string[];
    conservative: number;
    currency: "USD";
    target: number;
    upside: number;
  };
  launchPack: {
    artifactSlots: number;
    auditReady: boolean;
    manualSteps: number;
    packStatus: RevenueLaunchOperationsPack["status"];
    requestManifests: number;
    reviewGate: string;
  };
  manualReview: {
    approvedPacketId: string | null;
    handoffPacketAuditLogId: string | null;
    handoffPacketId: string | null;
    required: true;
    state: "ready" | "needs_review" | "blocked";
  };
  monitoringTriggers: RevenueLaunchClosureMonitoringTrigger[];
  nextAction: RevenueLaunchClosureLedgerAction;
  performanceEvidence: {
    evidenceGrade: RevenuePerformanceStoreScore["evidenceGrade"] | "none";
    grossRevenue: number;
    netProfit: number;
    profitVelocity: number;
    revenueVelocity: number;
    snapshots: number;
  };
  priority: number;
  providerContacted: false;
  readiness: RevenueLaunchOperationsPack["readiness"];
  riskLevel: RevenueLaunchOperationsPack["riskLevel"];
  status: RevenueLaunchClosureLedgerStatus;
  storeId: string;
  storeName: string;
  summary: string;
};

export type RevenueLaunchClosureLedgerPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  entries: RevenueLaunchClosureLedgerEntry[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Launch Revenue Closure Ledger";
  options: RevenueLaunchClosureLedgerOptions;
  providerContacted: false;
  queue: Array<{
    action: RevenueLaunchClosureLedgerAction;
    closureScore: number;
    externalExecution: false;
    priority: number;
    providerContacted: false;
    status: RevenueLaunchClosureLedgerStatus;
    storeId: string;
    storeName: string;
    summary: string;
  }>;
  summary: string;
  totals: {
    blockedEntries: number;
    entries: number;
    expectedFirstWeekRevenue: number;
    monitoringReady: number;
    needsReview: number;
    readyForManualLaunch: number;
    triggersQueued: number;
  };
};

type PlanInput = {
  generatedAt?: string;
  operationsPackPlan: RevenueLaunchOperationsPackPlan;
  options?: Partial<RevenueLaunchClosureLedgerOptions>;
  performanceDigest: RevenuePerformanceDigest;
};

const defaultOptions: RevenueLaunchClosureLedgerOptions = {
  expectedOrderValue: 32,
  includeBlocked: true,
  maxEntries: 10,
  minClosureScore: 72,
  monitoringWindowDays: 7,
  targetFirstWeekRevenue: 250
};

const blockedExternalActions = [
  "Publishing listings, creating provider products, uploading files, changing storefronts, starting ads, or posting content",
  "Importing live marketplace, provider, analytics, or payment data without a reviewed read-only connector approval",
  "Moving money, approving payouts, changing bank/card/payment settings, or executing Stripe Treasury or Connect transfers",
  "Opening provider admin sessions, running stealth browsers, rotating proxies, spoofing fingerprints, or evading platform controls"
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function optionsWithDefaults(input: Partial<RevenueLaunchClosureLedgerOptions> = {}): RevenueLaunchClosureLedgerOptions {
  const provided = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<RevenueLaunchClosureLedgerOptions>;

  return {
    expectedOrderValue: money(clamp(Number(provided.expectedOrderValue ?? defaultOptions.expectedOrderValue), 1, 10_000)),
    includeBlocked: provided.includeBlocked ?? defaultOptions.includeBlocked,
    maxEntries: clamp(Math.round(provided.maxEntries ?? defaultOptions.maxEntries), 1, 50),
    minClosureScore: clamp(Math.round(provided.minClosureScore ?? defaultOptions.minClosureScore), 1, 100),
    monitoringWindowDays: clamp(Math.round(provided.monitoringWindowDays ?? defaultOptions.monitoringWindowDays), 1, 30),
    targetFirstWeekRevenue: money(clamp(Number(provided.targetFirstWeekRevenue ?? defaultOptions.targetFirstWeekRevenue), 0, 1_000_000))
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function performanceForStore(digest: RevenuePerformanceDigest, storeId: string) {
  return digest.storeScores.find((score) => score.storeId === storeId) ?? null;
}

function performanceEvidence(score: RevenuePerformanceStoreScore | null): RevenueLaunchClosureLedgerEntry["performanceEvidence"] {
  return {
    evidenceGrade: score?.evidenceGrade ?? "none",
    grossRevenue: money(score?.grossRevenue ?? 0),
    netProfit: money(score?.netProfit ?? 0),
    profitVelocity: money(score?.profitVelocity ?? 0),
    revenueVelocity: money(score?.revenueVelocity ?? 0),
    snapshots: score?.snapshots ?? 0
  };
}

function expectedRevenue(input: {
  options: RevenueLaunchClosureLedgerOptions;
  pack: RevenueLaunchOperationsPack;
  performance: RevenuePerformanceStoreScore | null;
}) {
  const readinessFactor = clamp(input.pack.readiness.overallScore / 100, 0.2, 1.25);
  const manifestDemand = Math.max(1, input.pack.requestManifests.length) * input.options.expectedOrderValue * readinessFactor;
  const evidenceDemand = input.performance && input.performance.revenueVelocity > 0
    ? input.performance.revenueVelocity * input.options.monitoringWindowDays
    : 0;
  const target = money(Math.max(manifestDemand, evidenceDemand, input.options.targetFirstWeekRevenue * readinessFactor));

  return {
    assumptions: [
      `${input.pack.requestManifests.length} locked request manifest${input.pack.requestManifests.length === 1 ? "" : "s"} staged for manual launch review.`,
      `${input.pack.readiness.overallScore}/100 overall readiness score applied as launch confidence.`,
      `${input.options.monitoringWindowDays}-day first monitoring window at $${input.options.expectedOrderValue.toFixed(2)} expected order value.`,
      input.performance && input.performance.snapshots > 0
        ? `${input.performance.snapshots} internal performance snapshot${input.performance.snapshots === 1 ? "" : "s"} included as evidence.`
        : "No live revenue evidence included; estimate is pre-launch only."
    ],
    conservative: money(target * 0.55),
    currency: "USD" as const,
    target,
    upside: money(target * 1.65)
  };
}

function blockerList(pack: RevenueLaunchOperationsPack) {
  return [
    ...pack.blockers,
    ...pack.checklist.blockers.map((title, index) => ({
      code: `checklist_${index + 1}`,
      severity: "medium" as const,
      title
    }))
  ];
}

function manualReviewState(pack: RevenueLaunchOperationsPack): RevenueLaunchClosureLedgerEntry["manualReview"]["state"] {
  if (pack.status === "blocked") return "blocked";
  if (pack.status === "needs_review") return "needs_review";
  return "ready";
}

function closureScore(input: {
  blockers: ReturnType<typeof blockerList>;
  pack: RevenueLaunchOperationsPack;
  performance: RevenuePerformanceStoreScore | null;
}) {
  const performancePoints = input.performance?.evidenceGrade === "strong"
    ? 12
    : input.performance?.evidenceGrade === "usable"
      ? 8
      : input.performance?.evidenceGrade === "thin"
        ? 4
        : 0;
  const auditPoints = input.pack.auditTrail.handoffPacketId || input.pack.auditTrail.handoffPacketAuditLogId ? 7 : 0;
  const blockerPenalty = input.blockers.reduce((sum, blocker) => (
    sum + (blocker.severity === "high" ? 22 : blocker.severity === "medium" ? 10 : 4)
  ), 0);
  const statusPenalty = input.pack.status === "blocked" ? 28 : input.pack.status === "needs_review" ? 12 : 0;

  return clamp(Math.round(input.pack.readiness.overallScore * 0.78 + performancePoints + auditPoints - blockerPenalty - statusPenalty), 1, 100);
}

function statusFor(input: {
  blockers: ReturnType<typeof blockerList>;
  score: number;
  pack: RevenueLaunchOperationsPack;
  performance: RevenuePerformanceStoreScore | null;
  options: RevenueLaunchClosureLedgerOptions;
}): RevenueLaunchClosureLedgerStatus {
  if (input.pack.status === "blocked" || input.blockers.some((blocker) => blocker.severity === "high")) return "blocked";
  if (input.pack.status === "needs_review" || input.score < input.options.minClosureScore) return "needs_review";
  if ((input.performance?.snapshots ?? 0) > 0) return "monitoring_ready";
  return "ready_for_manual_launch";
}

function nextAction(status: RevenueLaunchClosureLedgerStatus): RevenueLaunchClosureLedgerAction {
  if (status === "monitoring_ready") return "schedule_monitoring";
  if (status === "ready_for_manual_launch") return "record_closure_scorecard";
  if (status === "needs_review") return "review_launch_pack";
  return "resolve_blockers";
}

function monitoringTriggers(input: {
  status: RevenueLaunchClosureLedgerStatus;
  windowDays: number;
}): RevenueLaunchClosureMonitoringTrigger[] {
  const blocked = input.status === "blocked";
  const status = blocked ? "blocked_review" as const : "queued_internal" as const;
  const commonBlockedActions = [
    "No provider, marketplace, social, payment, or browser write is authorized by this monitoring trigger."
  ];

  return [{
    blockedExternalActions: commonBlockedActions,
    cadence: "24 hours after manual launch review",
    evidenceRequired: ["Manual revenue snapshot", "Units sold", "Visits or impressions", "Refund count"],
    externalExecution: false,
    providerContacted: false,
    status,
    trigger: "revenue_snapshot"
  }, {
    blockedExternalActions: commonBlockedActions,
    cadence: "48 hours after manual launch review",
    evidenceRequired: ["Channel views", "Clicks", "Content cost", "Conversion notes"],
    externalExecution: false,
    providerContacted: false,
    status,
    trigger: "content_signal"
  }, {
    blockedExternalActions: commonBlockedActions,
    cadence: `Every ${Math.max(1, Math.floor(input.windowDays / 2))} days inside the first ${input.windowDays}-day window`,
    evidenceRequired: ["Refunds", "Support notes", "Ad spend if any", "Compliance issues"],
    externalExecution: false,
    providerContacted: false,
    status,
    trigger: "refund_watch"
  }, {
    blockedExternalActions: commonBlockedActions,
    cadence: "After first revenue evidence is entered",
    evidenceRequired: ["Net profit", "Available balance", "Split policy check", "Payout intent review"],
    externalExecution: false,
    providerContacted: false,
    status,
    trigger: "payout_governance"
  }, {
    blockedExternalActions: commonBlockedActions,
    cadence: `End of first ${input.windowDays}-day window`,
    evidenceRequired: ["Revenue velocity", "Profit velocity", "Conversion rate", "Portfolio command recommendation"],
    externalExecution: false,
    providerContacted: false,
    status,
    trigger: "scale_or_rotate_review"
  }];
}

function buildEntry(input: {
  options: RevenueLaunchClosureLedgerOptions;
  pack: RevenueLaunchOperationsPack;
  performance: RevenuePerformanceStoreScore | null;
}): RevenueLaunchClosureLedgerEntry {
  const blockers = blockerList(input.pack);
  const score = closureScore({
    blockers,
    pack: input.pack,
    performance: input.performance
  });
  const status = statusFor({
    blockers,
    options: input.options,
    pack: input.pack,
    performance: input.performance,
    score
  });
  const action = nextAction(status);
  const expectedFirstWeekRevenue = expectedRevenue(input);

  return {
    blockers,
    closureScore: score,
    expectedFirstWeekRevenue,
    externalExecution: false,
    launchPack: {
      artifactSlots: input.pack.artifactSlots.length,
      auditReady: Boolean(input.pack.auditTrail.handoffPacketId || input.pack.auditTrail.handoffPacketAuditLogId),
      manualSteps: input.pack.manualSteps.length,
      packStatus: input.pack.status,
      requestManifests: input.pack.requestManifests.length,
      reviewGate: input.pack.operatorBrief.nextReviewGate
    },
    manualReview: {
      approvedPacketId: input.pack.auditTrail.approvedPacketId,
      handoffPacketAuditLogId: input.pack.auditTrail.handoffPacketAuditLogId,
      handoffPacketId: input.pack.auditTrail.handoffPacketId,
      required: true,
      state: manualReviewState(input.pack)
    },
    monitoringTriggers: monitoringTriggers({
      status,
      windowDays: input.options.monitoringWindowDays
    }),
    nextAction: action,
    performanceEvidence: performanceEvidence(input.performance),
    priority: score + (status === "monitoring_ready" ? 20 : status === "ready_for_manual_launch" ? 12 : 0),
    providerContacted: false,
    readiness: input.pack.readiness,
    riskLevel: input.pack.riskLevel,
    status,
    storeId: input.pack.storeId,
    storeName: input.pack.storeName,
    summary: status === "blocked"
      ? `${input.pack.storeName} cannot close launch readiness until high-risk blockers are resolved.`
      : `${input.pack.storeName} closure score ${score}/100 with $${expectedFirstWeekRevenue.target.toFixed(2)} target first-week revenue.`
  };
}

export function buildRevenueLaunchClosureLedgerPlan(input: PlanInput): RevenueLaunchClosureLedgerPlan {
  const options = optionsWithDefaults(input.options);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const entries = input.operationsPackPlan.packs
    .map((pack) => buildEntry({
      options,
      pack,
      performance: performanceForStore(input.performanceDigest, pack.storeId)
    }))
    .filter((entry) => options.includeBlocked || entry.status !== "blocked")
    .sort((a, b) => b.priority - a.priority || b.closureScore - a.closureScore)
    .slice(0, options.maxEntries);
  const totals = entries.reduce((accumulator, entry) => {
    accumulator.expectedFirstWeekRevenue += entry.expectedFirstWeekRevenue.target;
    accumulator.triggersQueued += entry.monitoringTriggers.filter((trigger) => trigger.status === "queued_internal").length;
    if (entry.status === "blocked") accumulator.blockedEntries += 1;
    if (entry.status === "needs_review") accumulator.needsReview += 1;
    if (entry.status === "ready_for_manual_launch") accumulator.readyForManualLaunch += 1;
    if (entry.status === "monitoring_ready") accumulator.monitoringReady += 1;

    return accumulator;
  }, {
    blockedEntries: 0,
    entries: entries.length,
    expectedFirstWeekRevenue: 0,
    monitoringReady: 0,
    needsReview: 0,
    readyForManualLaunch: 0,
    triggersQueued: 0
  });
  totals.expectedFirstWeekRevenue = money(totals.expectedFirstWeekRevenue);

  return {
    auditEvents: [
      "Launch Revenue Closure Ledger tied manual launch pack review, readiness, first-week revenue targets, blockers, and monitoring triggers into one scorecard.",
      "Monitoring triggers are internal evidence requests only; no marketplace, provider, social, payment, or browser execution occurred.",
      "Apply mode records selected closure scorecards as audit artifacts without changing external systems."
    ],
    blockedExternalActions: unique([
      ...input.operationsPackPlan.blockedExternalActions,
      ...input.performanceDigest.blockedExternalActions,
      ...blockedExternalActions,
      ...entries.flatMap((entry) => entry.monitoringTriggers.flatMap((trigger) => trigger.blockedExternalActions))
    ]),
    entries,
    externalExecution: false,
    generatedAt,
    mode: "Internal Launch Revenue Closure Ledger",
    options,
    providerContacted: false,
    queue: entries.map((entry) => ({
      action: entry.nextAction,
      closureScore: entry.closureScore,
      externalExecution: false,
      priority: entry.priority,
      providerContacted: false,
      status: entry.status,
      storeId: entry.storeId,
      storeName: entry.storeName,
      summary: entry.summary
    })),
    summary: entries.length === 0
      ? "No launch closure ledger entries matched the current filters."
      : `${entries.length} launch closure entr${entries.length === 1 ? "y" : "ies"} prepared; ${totals.readyForManualLaunch + totals.monitoringReady} ready for launch/monitoring, ${totals.needsReview} need review, ${totals.blockedEntries} blocked.`,
    totals
  };
}

export function selectRevenueLaunchClosureLedgerEntries(plan: RevenueLaunchClosureLedgerPlan, storeIds: string[] = []) {
  const selected = new Set(storeIds.filter(Boolean));

  if (selected.size === 0) return plan.entries;

  return plan.entries.filter((entry) => selected.has(entry.storeId));
}
