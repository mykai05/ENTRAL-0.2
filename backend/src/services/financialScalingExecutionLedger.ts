import type {
  FinancialPersistedScalingSpendPacketSnapshot,
  FinancialScalingSpendCategory,
  FinancialScalingSpendControlPlan
} from "./financialScalingSpendControl.js";

export type FinancialScalingExecutionOutcome = "validated" | "watch" | "stopped" | "scale_next";
export type FinancialScalingExecutionSource = "manual" | "signal_intake" | "operator_reconciliation" | "other";
export type FinancialScalingExecutionRecommendation = "validate" | "watch" | "stop" | "scale_next";

export type FinancialScalingExecutionEntrySnapshot = {
  amountSpent: number;
  assetId: string;
  assetName: string;
  assetType: FinancialPersistedScalingSpendPacketSnapshot["assetType"];
  auditLogId: string | null;
  category: FinancialScalingSpendCategory;
  createdAt: string;
  externalExecution: false;
  grossRevenue: number;
  id: string;
  netProfit: number;
  notes: string | null;
  outcome: FinancialScalingExecutionOutcome;
  periodEnd: string;
  periodStart: string;
  productId: string | null;
  providerContacted: false;
  recommendation: FinancialScalingExecutionRecommendation;
  reason: string;
  recordId: string;
  roi: number;
  scalingSpendPacketId: string;
  source: FinancialScalingExecutionSource;
  storeId: string;
  storeName: string;
  unitsSold: number;
  updatedAt: string;
  visits: number;
};

export type FinancialScalingExecutionPacketSummary = {
  allocatedAmount: number;
  amountSpent: number;
  assetId: string;
  assetName: string;
  assetType: FinancialPersistedScalingSpendPacketSnapshot["assetType"];
  category: FinancialScalingSpendCategory;
  entries: number;
  externalExecution: false;
  grossRevenue: number;
  hasOutcomeEvidence: boolean;
  maxSpendAmount: number;
  netProfit: number;
  nextInternalState: "record_manual_outcome" | "keep_validated_spend_lane" | "record_more_evidence" | "pause_spend_and_repair_asset" | "queue_next_scaling_budget_review";
  providerContacted: false;
  reason: string;
  recommendation: FinancialScalingExecutionRecommendation;
  roi: number;
  scalingSpendPacketId: string;
  storeId: string;
  storeName: string;
  unitsSold: number;
  visits: number;
};

export type FinancialScalingExecutionLedgerPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  entries: FinancialScalingExecutionEntrySnapshot[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Scaling Execution Ledger";
  packetSummaries: FinancialScalingExecutionPacketSummary[];
  providerContacted: false;
  spendControlPlan: FinancialScalingSpendControlPlan;
  summary: string;
  totals: {
    allocatedAmount: number;
    amountSpent: number;
    grossRevenue: number;
    netProfit: number;
    pendingOutcomeControls: number;
    recordedEntries: number;
    roi: number;
    scaleNext: number;
    spendControls: number;
    stopped: number;
    validated: number;
    watched: number;
  };
};

export const financialScalingExecutionBlockedActions = [
  "Executing ad spend, procurement spend, creative spend, product orders, software purchases, payouts, transfers, or card charges",
  "Calling marketplace, POD, ad, social, payment, bank, payout, upload, browser, proxy, or provider write APIs",
  "Using stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, CAPTCHA bypass, or platform-evasion automation",
  "Treating manually recorded outcome evidence as permission to spend, publish, upload, transfer, or scale externally"
];

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function roi(netProfit: number, amountSpent: number) {
  return amountSpent > 0 ? money(netProfit / amountSpent) : 0;
}

function recommendationFor(input: {
  amountSpent: number;
  grossRevenue: number;
  netProfit: number;
  unitsSold: number;
  visits: number;
}): {
  nextInternalState: FinancialScalingExecutionPacketSummary["nextInternalState"];
  reason: string;
  recommendation: FinancialScalingExecutionRecommendation;
} {
  const returnOnSpend = roi(input.netProfit, input.amountSpent);

  if (input.amountSpent <= 0 && input.grossRevenue <= 0 && input.netProfit <= 0 && input.unitsSold <= 0) {
    return {
      nextInternalState: "record_manual_outcome",
      reason: "No outcome evidence is recorded yet; keep this spend lane in manual validation.",
      recommendation: "validate"
    };
  }

  if (input.netProfit < 0 || (input.amountSpent > 0 && input.grossRevenue <= 0 && input.visits >= 100)) {
    return {
      nextInternalState: "pause_spend_and_repair_asset",
      reason: "Recorded outcome evidence is negative or non-converting; pause this spend lane and repair the asset before allocating more.",
      recommendation: "stop"
    };
  }

  if (input.amountSpent > 0 && returnOnSpend >= 2 && input.unitsSold > 0) {
    return {
      nextInternalState: "queue_next_scaling_budget_review",
      reason: `Outcome evidence returned ${returnOnSpend}x spend with recorded sales; queue the next internal scaling budget review.`,
      recommendation: "scale_next"
    };
  }

  if (input.netProfit > 0 && (input.amountSpent === 0 || returnOnSpend >= 1)) {
    return {
      nextInternalState: "keep_validated_spend_lane",
      reason: "Outcome evidence is profitable; keep this spend lane validated while collecting another snapshot.",
      recommendation: "validate"
    };
  }

  return {
    nextInternalState: "record_more_evidence",
    reason: "Outcome evidence is mixed or thin; watch the asset and collect another manual result before changing allocation.",
    recommendation: "watch"
  };
}

function normalizeOutcome(value: string): FinancialScalingExecutionOutcome {
  if (value === "validated" || value === "watch" || value === "stopped" || value === "scale_next") {
    return value;
  }

  return "watch";
}

function normalizeSource(value: string): FinancialScalingExecutionSource {
  if (value === "manual" || value === "signal_intake" || value === "operator_reconciliation" || value === "other") {
    return value;
  }

  return "manual";
}

export function normalizeFinancialScalingExecutionEntry(input: {
  amountSpent: number;
  assetId: string;
  assetName: string;
  assetType: FinancialPersistedScalingSpendPacketSnapshot["assetType"] | string;
  auditLogId?: string | null;
  category: FinancialScalingSpendCategory | string;
  createdAt?: string;
  externalExecution?: boolean;
  grossRevenue: number;
  id?: string;
  netProfit: number;
  notes?: string | null;
  outcome: FinancialScalingExecutionOutcome | string;
  periodEnd: string;
  periodStart: string;
  productId?: string | null;
  providerContacted?: boolean;
  recordId?: string;
  scalingSpendPacketId: string;
  source: FinancialScalingExecutionSource | string;
  storeId: string;
  storeName: string;
  unitsSold: number;
  updatedAt?: string;
  visits: number;
}): FinancialScalingExecutionEntrySnapshot {
  const recommendation = recommendationFor(input);
  const amountSpent = money(input.amountSpent);
  const netProfit = money(input.netProfit);

  return {
    amountSpent,
    assetId: input.assetId,
    assetName: input.assetName,
    assetType: input.assetType === "store" ? "store" : "product",
    auditLogId: input.auditLogId ?? null,
    category: input.category as FinancialScalingSpendCategory,
    createdAt: input.createdAt ?? new Date().toISOString(),
    externalExecution: false,
    grossRevenue: money(input.grossRevenue),
    id: input.id ?? input.recordId ?? input.scalingSpendPacketId,
    netProfit,
    notes: input.notes ?? null,
    outcome: normalizeOutcome(input.outcome),
    periodEnd: input.periodEnd,
    periodStart: input.periodStart,
    productId: input.productId ?? null,
    providerContacted: false,
    recommendation: recommendation.recommendation,
    reason: recommendation.reason,
    recordId: input.recordId ?? input.id ?? input.scalingSpendPacketId,
    roi: roi(netProfit, amountSpent),
    scalingSpendPacketId: input.scalingSpendPacketId,
    source: normalizeSource(input.source),
    storeId: input.storeId,
    storeName: input.storeName,
    unitsSold: input.unitsSold,
    updatedAt: input.updatedAt ?? input.createdAt ?? new Date().toISOString(),
    visits: input.visits
  };
}

function entriesForPacket(
  entries: FinancialScalingExecutionEntrySnapshot[],
  packet: FinancialPersistedScalingSpendPacketSnapshot
) {
  return entries.filter((entry) => entry.scalingSpendPacketId === packet.recordId || entry.scalingSpendPacketId === packet.id);
}

function sum(entries: FinancialScalingExecutionEntrySnapshot[], key: "amountSpent" | "grossRevenue" | "netProfit" | "unitsSold" | "visits") {
  return entries.reduce((total, entry) => total + entry[key], 0);
}

function buildPacketSummary(
  packet: FinancialPersistedScalingSpendPacketSnapshot,
  entries: FinancialScalingExecutionEntrySnapshot[]
): FinancialScalingExecutionPacketSummary {
  const packetEntries = entriesForPacket(entries, packet);
  const amountSpent = money(sum(packetEntries, "amountSpent"));
  const grossRevenue = money(sum(packetEntries, "grossRevenue"));
  const netProfit = money(sum(packetEntries, "netProfit"));
  const unitsSold = sum(packetEntries, "unitsSold");
  const visits = sum(packetEntries, "visits");
  const recommendation = recommendationFor({
    amountSpent,
    grossRevenue,
    netProfit,
    unitsSold,
    visits
  });

  return {
    allocatedAmount: packet.amount,
    amountSpent,
    assetId: packet.assetId,
    assetName: packet.assetName,
    assetType: packet.assetType,
    category: packet.category,
    entries: packetEntries.length,
    externalExecution: false,
    grossRevenue,
    hasOutcomeEvidence: packetEntries.length > 0,
    maxSpendAmount: packet.maxSpendAmount,
    netProfit,
    nextInternalState: recommendation.nextInternalState,
    providerContacted: false,
    reason: recommendation.reason,
    recommendation: recommendation.recommendation,
    roi: roi(netProfit, amountSpent),
    scalingSpendPacketId: packet.recordId,
    storeId: packet.storeId,
    storeName: packet.storeName,
    unitsSold,
    visits
  };
}

function countRecommendation(summaries: FinancialScalingExecutionPacketSummary[], recommendation: FinancialScalingExecutionRecommendation) {
  return summaries.filter((summary) => summary.recommendation === recommendation).length;
}

export function buildFinancialScalingExecutionLedgerPlan(input: {
  entries?: FinancialScalingExecutionEntrySnapshot[];
  generatedAt?: string;
  spendControlPlan: FinancialScalingSpendControlPlan;
}): FinancialScalingExecutionLedgerPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const entries = [...(input.entries ?? [])].sort((left, right) => right.periodEnd.localeCompare(left.periodEnd));
  const packetSummaries = input.spendControlPlan.persisted.packets.map((packet) => buildPacketSummary(packet, entries));
  const amountSpent = money(entries.reduce((total, entry) => total + entry.amountSpent, 0));
  const grossRevenue = money(entries.reduce((total, entry) => total + entry.grossRevenue, 0));
  const netProfit = money(entries.reduce((total, entry) => total + entry.netProfit, 0));
  const pendingOutcomeControls = packetSummaries.filter((summary) => !summary.hasOutcomeEvidence).length;
  const scaleNext = countRecommendation(packetSummaries, "scale_next");
  const stopped = countRecommendation(packetSummaries, "stop");
  const validated = countRecommendation(packetSummaries, "validate");
  const watched = countRecommendation(packetSummaries, "watch");

  return {
    auditEvents: [
      "Scaling execution ledger generated from persisted manual spend controls and recorded outcome evidence.",
      "Outcome entries are evidence records only; they do not execute spend, move money, call providers, upload assets, or publish listings.",
      "Recommendations feed internal budget review and rotation thinking without authorizing external action."
    ],
    blockedExternalActions: financialScalingExecutionBlockedActions,
    entries,
    externalExecution: false,
    generatedAt,
    mode: "Internal Scaling Execution Ledger",
    packetSummaries,
    providerContacted: false,
    spendControlPlan: input.spendControlPlan,
    summary: `${entries.length} scaling outcome entr${entries.length === 1 ? "y" : "ies"} recorded against ${packetSummaries.length} spend control packet${packetSummaries.length === 1 ? "" : "s"}. ${scaleNext} ready for next budget review, ${validated} validated, ${watched} watch, and ${stopped} stop recommendation${packetSummaries.length === 1 ? "" : "s"}.`,
    totals: {
      allocatedAmount: money(packetSummaries.reduce((total, summary) => total + summary.allocatedAmount, 0)),
      amountSpent,
      grossRevenue,
      netProfit,
      pendingOutcomeControls,
      recordedEntries: entries.length,
      roi: roi(netProfit, amountSpent),
      scaleNext,
      spendControls: packetSummaries.length,
      stopped,
      validated,
      watched
    }
  };
}
