import type {
  RevenueLaunchReadinessItem,
  RevenueLaunchReadinessPlan
} from "./revenueLaunchReadiness.js";
import type {
  RevenueLiveConnectorBoundary,
  RevenueLiveConnectorReadinessEntry,
  RevenueLiveConnectorReadinessRegistryPlan
} from "./revenueLiveConnectorReadinessRegistry.js";

export type RevenueFirstCashReadinessOptions = {
  includeBlocked: boolean;
  maxCandidates: number;
  targetDaysToFirstCash: number;
};

export type RevenueFirstCashStatus =
  | "blocked"
  | "cash_active"
  | "needs_launch_approval"
  | "needs_products"
  | "needs_provider_handoff"
  | "needs_store_setup"
  | "ready_for_manual_launch";

export type RevenueAutomaticCashStatus =
  | "automatic_cash_ready"
  | "blocked"
  | "connector_design_needed"
  | "launch_work_needed"
  | "manual_launch_ready"
  | "payment_readiness_needed";

export type RevenueFirstCashNextAction =
  | "final_operator_launch_review"
  | "generate_provider_handoff"
  | "optimize_listings"
  | "prepare_store_setup"
  | "queue_launch_approval"
  | "queue_payment_readiness_review"
  | "queue_readonly_approvals"
  | "resolve_blockers"
  | "seed_product_drafts";

export type RevenuePaymentReadiness =
  | "approved_readonly"
  | "live_design_ready"
  | "missing"
  | "needs_approval"
  | "not_applicable";

export type RevenueFirstCashBlocker = {
  code: string;
  severity: "low" | "medium" | "high";
  title: string;
};

export type RevenueFirstCashCandidate = {
  automaticCashEtaDays: number | null;
  automaticCashReady: boolean;
  automaticCashStatus: RevenueAutomaticCashStatus;
  blockers: RevenueFirstCashBlocker[];
  cashReadinessScore: number;
  estimatedFirstSaleDays: number | null;
  evidence: {
    approvedProducts: number;
    launchReadinessScore: number;
    liveConnectorReadinessScore: number | null;
    payloadsPrepared: number;
    providerApprovalApproved: boolean;
    providerApprovalPending: boolean;
    revenue: number;
  };
  externalExecution: false;
  launchStage: RevenueLaunchReadinessItem["stage"];
  manualLaunchReady: boolean;
  nextAction: {
    action: RevenueFirstCashNextAction;
    reason: string;
    title: string;
  };
  paymentReadiness: RevenuePaymentReadiness;
  providerContacted: false;
  status: RevenueFirstCashStatus;
  storeId: string;
  storeName: string;
  summary: string;
};

export type RevenueFirstCashReadinessPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  candidates: RevenueFirstCashCandidate[];
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Engine First Cash Readiness";
  options: RevenueFirstCashReadinessOptions;
  providerContacted: false;
  summary: string;
  topCandidate: RevenueFirstCashCandidate | null;
  totals: {
    automaticCashReady: number;
    blocked: number;
    candidates: number;
    manualLaunchReady: number;
    targetReady: number;
  };
};

const defaultOptions: RevenueFirstCashReadinessOptions = {
  includeBlocked: true,
  maxCandidates: 8,
  targetDaysToFirstCash: 7
};

const blockedExternalActions = [
  "Publishing listings, products, storefront changes, uploads, posts, ads, payouts, transfers, or payment actions",
  "Opening provider dashboards, browser sessions, proxy pools, fingerprint profiles, or automation contexts",
  "Using stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, CAPTCHA bypass, or platform-evasion automation"
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function withRevenueFirstCashReadinessOptions(input: Partial<RevenueFirstCashReadinessOptions> = {}): RevenueFirstCashReadinessOptions {
  return {
    includeBlocked: input.includeBlocked ?? defaultOptions.includeBlocked,
    maxCandidates: clamp(Math.round(input.maxCandidates ?? defaultOptions.maxCandidates), 1, 25),
    targetDaysToFirstCash: clamp(Math.round(input.targetDaysToFirstCash ?? defaultOptions.targetDaysToFirstCash), 1, 90)
  };
}

function liveEntryFor(item: RevenueLaunchReadinessItem, plan?: RevenueLiveConnectorReadinessRegistryPlan) {
  return plan?.entries.find((entry) => entry.storeId === item.store.id) ?? null;
}

function paymentBoundary(entry: RevenueLiveConnectorReadinessEntry | null): RevenueLiveConnectorBoundary | null {
  return entry?.connectorBoundaries.find((boundary) => boundary.role === "payments" || boundary.provider === "stripe") ?? null;
}

function paymentReadiness(entry: RevenueLiveConnectorReadinessEntry | null): RevenuePaymentReadiness {
  const boundary = paymentBoundary(entry);

  if (!entry) return "missing";
  if (!boundary) return "missing";
  if (boundary.readiness === "design_review_ready") return "live_design_ready";
  if (boundary.readiness === "approved_readonly") return "approved_readonly";
  if (boundary.readiness === "needs_approval") return "needs_approval";

  return "missing";
}

function baseFirstSaleDays(item: RevenueLaunchReadinessItem): number | null {
  if (item.stage === "blocked") return null;
  if (item.stage === "live_monitoring" || item.store.revenue > 0) return 0;
  if (item.stage === "handoff_ready") return 2;
  if (item.stage === "provider_payload_review") return 4;
  if (item.stage === "store_setup") return 7;
  if (item.stage === "launch_approval") return 10;
  if (item.stage === "listing_optimization") return 14;

  return 21;
}

function firstSaleEta(item: RevenueLaunchReadinessItem) {
  if (item.blockers.some((blocker) => blocker.severity === "high")) return null;
  const base = baseFirstSaleDays(item);

  if (base === null) return null;

  const blockerDays = item.blockers.reduce((sum, blocker) => {
    if (blocker.severity === "medium") return sum + 2;
    if (blocker.severity === "low") return sum + 1;
    return sum;
  }, 0);

  return base + blockerDays;
}

function automaticEta(firstSaleDays: number | null, payment: RevenuePaymentReadiness, entry: RevenueLiveConnectorReadinessEntry | null) {
  if (firstSaleDays === null) return null;
  if (entry?.status === "blocked") return null;
  if (payment === "live_design_ready") return firstSaleDays + 1;
  if (payment === "approved_readonly") return firstSaleDays + 5;
  if (payment === "needs_approval") return firstSaleDays + 10;
  if (payment === "not_applicable") return firstSaleDays + 14;

  return firstSaleDays + 14;
}

function statusFor(item: RevenueLaunchReadinessItem, firstSaleDays: number | null): RevenueFirstCashStatus {
  if (firstSaleDays === null || item.stage === "blocked") return "blocked";
  if (item.stage === "live_monitoring" || item.store.revenue > 0) return "cash_active";
  if (item.stage === "handoff_ready") return "ready_for_manual_launch";
  if (item.stage === "provider_payload_review") return "needs_provider_handoff";
  if (item.stage === "store_setup") return "needs_store_setup";
  if (item.stage === "launch_approval") return "needs_launch_approval";

  return "needs_products";
}

function automaticStatusFor(input: {
  entry: RevenueLiveConnectorReadinessEntry | null;
  firstSaleStatus: RevenueFirstCashStatus;
  payment: RevenuePaymentReadiness;
}): RevenueAutomaticCashStatus {
  if (input.firstSaleStatus === "blocked" || input.entry?.status === "blocked") return "blocked";
  if (input.firstSaleStatus !== "cash_active" && input.firstSaleStatus !== "ready_for_manual_launch") return "launch_work_needed";
  if (input.payment === "live_design_ready" && input.entry?.status === "ready_for_design") return "automatic_cash_ready";
  if (input.payment === "approved_readonly") return "connector_design_needed";
  if (input.payment === "needs_approval" || input.payment === "missing") return "payment_readiness_needed";

  return "manual_launch_ready";
}

function candidateBlockers(item: RevenueLaunchReadinessItem, entry: RevenueLiveConnectorReadinessEntry | null, payment: RevenuePaymentReadiness): RevenueFirstCashBlocker[] {
  const blockers: RevenueFirstCashBlocker[] = [...item.blockers];

  if (!entry) {
    blockers.push({
      code: "live_connector_readiness_missing",
      severity: "medium",
      title: "Live connector readiness evidence is missing for automatic cashflow."
    });
  } else {
    blockers.push(...entry.blockers);
  }

  if (payment === "missing") {
    blockers.push({
      code: "payment_readiness_missing",
      severity: "medium",
      title: "Payment readiness is missing; Stripe/read-only payment evidence must be reviewed before automatic cashflow."
    });
  }

  if (payment === "needs_approval") {
    blockers.push({
      code: "payment_readonly_approval_needed",
      severity: "medium",
      title: "Payment connector evidence needs read-only approval before automatic cashflow."
    });
  }

  return blockers;
}

function scoreFor(input: {
  automaticDays: number | null;
  entry: RevenueLiveConnectorReadinessEntry | null;
  firstSaleDays: number | null;
  item: RevenueLaunchReadinessItem;
  payment: RevenuePaymentReadiness;
}) {
  const launchPoints = input.item.readinessScore * 0.58;
  const connectorPoints = (input.entry?.readinessScore ?? 0) * 0.22;
  const paymentPoints = input.payment === "live_design_ready"
    ? 20
    : input.payment === "approved_readonly" ? 14 : input.payment === "needs_approval" ? 6 : 0;
  const etaPenalty = input.firstSaleDays === null ? 40 : Math.min(24, input.firstSaleDays);
  const score = launchPoints + connectorPoints + paymentPoints - etaPenalty;

  return clamp(Math.round(score), 0, 100);
}

function nextActionFor(input: {
  automaticStatus: RevenueAutomaticCashStatus;
  entry: RevenueLiveConnectorReadinessEntry | null;
  item: RevenueLaunchReadinessItem;
  status: RevenueFirstCashStatus;
}): RevenueFirstCashCandidate["nextAction"] {
  if (input.status === "blocked" || input.automaticStatus === "blocked") {
    return {
      action: "resolve_blockers",
      reason: "High-severity readiness blockers must be cleared before launch work continues.",
      title: "Resolve launch blockers"
    };
  }

  if (input.status === "needs_products") {
    return {
      action: input.item.nextInternalAction === "optimize_listings" ? "optimize_listings" : "seed_product_drafts",
      reason: input.item.summary,
      title: input.item.nextInternalAction === "optimize_listings" ? "Optimize listings" : "Seed product drafts"
    };
  }

  if (input.status === "needs_launch_approval") {
    return {
      action: "queue_launch_approval",
      reason: input.item.summary,
      title: "Queue launch approval"
    };
  }

  if (input.status === "needs_store_setup") {
    return {
      action: "prepare_store_setup",
      reason: input.item.summary,
      title: "Prepare store setup"
    };
  }

  if (input.status === "needs_provider_handoff") {
    return {
      action: "generate_provider_handoff",
      reason: input.item.summary,
      title: "Generate provider handoff"
    };
  }

  if (input.automaticStatus === "payment_readiness_needed") {
    return {
      action: "queue_payment_readiness_review",
      reason: "Payment evidence must be reviewed before cashflow can become mostly automatic.",
      title: "Queue payment readiness review"
    };
  }

  if (input.automaticStatus === "connector_design_needed") {
    return {
      action: "queue_readonly_approvals",
      reason: input.entry?.summary ?? "Connector design review is needed before automatic cashflow.",
      title: "Queue connector design review"
    };
  }

  return {
    action: "final_operator_launch_review",
    reason: "The revenue path is close enough for final operator launch review.",
    title: "Final operator launch review"
  };
}

function candidateSummary(input: {
  automaticDays: number | null;
  firstSaleDays: number | null;
  item: RevenueLaunchReadinessItem;
  status: RevenueFirstCashStatus;
}) {
  const firstSale = input.firstSaleDays === null ? "blocked" : `${input.firstSaleDays} day${input.firstSaleDays === 1 ? "" : "s"}`;
  const automatic = input.automaticDays === null ? "blocked" : `${input.automaticDays} day${input.automaticDays === 1 ? "" : "s"}`;

  return `${input.item.store.businessName}: ${input.status.replace(/_/g, " ")}. First sale ETA ${firstSale}; automatic cash ETA ${automatic}.`;
}

function buildCandidate(input: {
  item: RevenueLaunchReadinessItem;
  livePlan?: RevenueLiveConnectorReadinessRegistryPlan;
}): RevenueFirstCashCandidate {
  const entry = liveEntryFor(input.item, input.livePlan);
  const payment = paymentReadiness(entry);
  const firstSaleDays = firstSaleEta(input.item);
  const status = statusFor(input.item, firstSaleDays);
  const automaticDays = automaticEta(firstSaleDays, payment, entry);
  const automaticStatus = automaticStatusFor({
    entry,
    firstSaleStatus: status,
    payment
  });
  const blockers = candidateBlockers(input.item, entry, payment);
  const cashReadinessScore = scoreFor({
    automaticDays,
    entry,
    firstSaleDays,
    item: input.item,
    payment
  });
  const manualLaunchReady = status === "cash_active" || status === "ready_for_manual_launch";
  const automaticCashReady = automaticStatus === "automatic_cash_ready";

  return {
    automaticCashEtaDays: automaticDays,
    automaticCashReady,
    automaticCashStatus: automaticStatus,
    blockers,
    cashReadinessScore,
    estimatedFirstSaleDays: firstSaleDays,
    evidence: {
      approvedProducts: input.item.launchPipeline?.readyProducts ?? 0,
      launchReadinessScore: input.item.readinessScore,
      liveConnectorReadinessScore: entry?.readinessScore ?? null,
      payloadsPrepared: input.item.providerPayload.payloadCount,
      providerApprovalApproved: input.item.approvalState.providerApprovalApproved,
      providerApprovalPending: input.item.approvalState.providerApprovalPending,
      revenue: input.item.store.revenue
    },
    externalExecution: false,
    launchStage: input.item.stage,
    manualLaunchReady,
    nextAction: nextActionFor({
      automaticStatus,
      entry,
      item: input.item,
      status
    }),
    paymentReadiness: payment,
    providerContacted: false,
    status,
    storeId: input.item.store.id,
    storeName: input.item.store.businessName,
    summary: candidateSummary({
      automaticDays,
      firstSaleDays,
      item: input.item,
      status
    })
  };
}

export function buildRevenueFirstCashReadinessPlan(input: {
  generatedAt?: string;
  launchReadinessPlan: RevenueLaunchReadinessPlan;
  liveConnectorPlan?: RevenueLiveConnectorReadinessRegistryPlan;
  options?: Partial<RevenueFirstCashReadinessOptions>;
}): RevenueFirstCashReadinessPlan {
  const options = withRevenueFirstCashReadinessOptions(input.options);
  const candidates = input.launchReadinessPlan.stores
    .map((item) => buildCandidate({
      item,
      livePlan: input.liveConnectorPlan
    }))
    .filter((candidate) => options.includeBlocked || candidate.status !== "blocked")
    .sort((left, right) => {
      if (left.estimatedFirstSaleDays === null && right.estimatedFirstSaleDays !== null) return 1;
      if (left.estimatedFirstSaleDays !== null && right.estimatedFirstSaleDays === null) return -1;
      if (left.estimatedFirstSaleDays !== null && right.estimatedFirstSaleDays !== null && left.estimatedFirstSaleDays !== right.estimatedFirstSaleDays) {
        return left.estimatedFirstSaleDays - right.estimatedFirstSaleDays;
      }

      return right.cashReadinessScore - left.cashReadinessScore;
    })
    .slice(0, options.maxCandidates);
  const topCandidate = candidates[0] ?? null;
  const targetReady = candidates.filter((candidate) => (
    candidate.estimatedFirstSaleDays !== null
    && candidate.estimatedFirstSaleDays <= options.targetDaysToFirstCash
  )).length;
  const automaticCashReady = candidates.filter((candidate) => candidate.automaticCashReady).length;
  const manualLaunchReady = candidates.filter((candidate) => candidate.manualLaunchReady).length;
  const blocked = candidates.filter((candidate) => candidate.status === "blocked").length;

  return {
    auditEvents: [
      "First Cash Readiness aggregated launch readiness and live connector readiness into ranked cash-path candidates.",
      "First-sale ETA assumes operator-approved manual launch work; automatic-cash ETA requires payment and connector readiness evidence.",
      "No provider, marketplace, payment, bank, browser, social, upload, payout, or ad system was contacted."
    ],
    blockedExternalActions: Array.from(new Set([
      ...blockedExternalActions,
      ...input.launchReadinessPlan.blockedExternalActions,
      ...(input.liveConnectorPlan?.blockedExternalActions ?? [])
    ])),
    candidates,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Revenue Engine First Cash Readiness",
    options,
    providerContacted: false,
    summary: topCandidate
      ? `${candidates.length} first-cash candidate${candidates.length === 1 ? "" : "s"} ranked. Top path: ${topCandidate.storeName}, first sale ETA ${topCandidate.estimatedFirstSaleDays === null ? "blocked" : `${topCandidate.estimatedFirstSaleDays} day${topCandidate.estimatedFirstSaleDays === 1 ? "" : "s"}`}, automatic cash ETA ${topCandidate.automaticCashEtaDays === null ? "blocked" : `${topCandidate.automaticCashEtaDays} day${topCandidate.automaticCashEtaDays === 1 ? "" : "s"}`}.`
      : "No first-cash candidates are available from current launch readiness evidence.",
    topCandidate,
    totals: {
      automaticCashReady,
      blocked,
      candidates: candidates.length,
      manualLaunchReady,
      targetReady
    }
  };
}
