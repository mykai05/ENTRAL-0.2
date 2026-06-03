import type {
  FinancialBudgetReleasePacket,
  FinancialPayoutReviewItem,
  FinancialPayoutReviewPlan
} from "./financialPayoutReview.js";

export type FinancialPersistedReleasePacketSnapshot = FinancialBudgetReleasePacket & {
  auditLogId: string | null;
  createdAt: string;
  recordId: string;
  updatedAt: string;
};

export type FinancialPersistedReconciliationSnapshot = {
  approvedAmount: number;
  auditLogId: string | null;
  createdAt: string;
  externalExecution: false;
  id: string;
  pendingAmount: number;
  rejectedAmount: number;
  report: Record<string, unknown>;
  source: string;
  status: string;
  totalAmount: number;
  updatedAt: string;
  variance: number;
};

export type FinancialReleaseRiskTier = {
  amount: number;
  count: number;
  intentIds: string[];
  label: "low" | "medium" | "high";
  recommendedControl: string;
};

export type FinancialStripeReadOnlyProbe = {
  checks: Array<{
    evidence: string;
    status: "blocked" | "ready";
    title: string;
  }>;
  connectorStatus: "not_connected";
  externalExecution: false;
  mode: "Read-only Stripe readiness probe";
  provider: "Stripe Treasury + Connect";
  providerContacted: false;
};

export type FinancialReleaseGovernancePlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  budgetReleasePackets: FinancialBudgetReleasePacket[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Release Governance";
  persisted: {
    latestReconciliationReport: FinancialPersistedReconciliationSnapshot | null;
    reconciliationReports: FinancialPersistedReconciliationSnapshot[];
    releasePackets: FinancialPersistedReleasePacketSnapshot[];
    totals: {
      recordedReconciliationReports: number;
      recordedReleasePackets: number;
      staleReleasePackets: number;
    };
  };
  reconciliationReport: {
    approvedAmount: number;
    pendingAmount: number;
    rejectedAmount: number;
    source: "payout_review";
    status: "balanced" | "variance_review";
    totalAmount: number;
    variance: number;
  };
  releaseReadiness: {
    lockedReview: number;
    readyForManualHandoff: number;
    rejected: number;
  };
  reviewPlan: FinancialPayoutReviewPlan;
  riskTiers: FinancialReleaseRiskTier[];
  stripeReadOnlyProbe: FinancialStripeReadOnlyProbe;
  summary: string;
  totals: {
    approvedAmount: number;
    budgetReleasePackets: number;
    highRiskAmount: number;
    highRiskIntents: number;
    pendingAmount: number;
    reconciliationReportsRecorded: number;
    releasePacketsRecorded: number;
    totalAmount: number;
  };
};

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function tierControl(label: FinancialReleaseRiskTier["label"]) {
  if (label === "high") {
    return "Require owner review, accounting evidence, and manual handoff approval before any future release.";
  }

  if (label === "medium") {
    return "Require budget owner review and ledger trace before marking ready for manual handoff.";
  }

  return "Keep locked unless ledger evidence and packet controls remain current.";
}

function riskTierFor(label: FinancialReleaseRiskTier["label"], items: FinancialPayoutReviewItem[]): FinancialReleaseRiskTier {
  return {
    amount: money(items.reduce((sum, item) => sum + item.amount, 0)),
    count: items.length,
    intentIds: items.map((item) => item.id),
    label,
    recommendedControl: tierControl(label)
  };
}

function stripeReadOnlyProbe(): FinancialStripeReadOnlyProbe {
  return {
    checks: [
      {
        evidence: "No Stripe credential connector is enabled in this internal system.",
        status: "blocked",
        title: "Credential presence"
      },
      {
        evidence: "balance.read remains readiness-only until a read-only reconciliation connector is approved.",
        status: "blocked",
        title: "Read-only reconciliation"
      },
      {
        evidence: "Outbound payments, transfers, bank, card, and balance writes remain blocked.",
        status: "blocked",
        title: "Write execution"
      }
    ],
    connectorStatus: "not_connected",
    externalExecution: false,
    mode: "Read-only Stripe readiness probe",
    provider: "Stripe Treasury + Connect",
    providerContacted: false
  };
}

export function buildFinancialReleaseGovernancePlan(input: {
  generatedAt?: string;
  persistedReconciliationReports?: FinancialPersistedReconciliationSnapshot[];
  persistedReleasePackets?: FinancialPersistedReleasePacketSnapshot[];
  reviewPlan: FinancialPayoutReviewPlan;
}): FinancialReleaseGovernancePlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const persistedReleasePackets = input.persistedReleasePackets ?? [];
  const persistedReconciliationReports = input.persistedReconciliationReports ?? [];
  const packetIntentIds = new Set(input.reviewPlan.budgetReleasePackets.map((packet) => packet.intentId));
  const staleReleasePackets = persistedReleasePackets.filter((packet) => !packetIntentIds.has(packet.intentId));
  const lowRisk = input.reviewPlan.reviewQueue.filter((item) => item.riskLevel === "low");
  const mediumRisk = input.reviewPlan.reviewQueue.filter((item) => item.riskLevel === "medium");
  const highRisk = input.reviewPlan.reviewQueue.filter((item) => item.riskLevel === "high");
  const releaseReadiness = {
    lockedReview: input.reviewPlan.budgetReleasePackets.filter((packet) => packet.releaseState === "locked_review").length,
    readyForManualHandoff: input.reviewPlan.budgetReleasePackets.filter((packet) => packet.releaseState === "ready_for_manual_handoff").length,
    rejected: input.reviewPlan.budgetReleasePackets.filter((packet) => packet.releaseState === "rejected").length
  };
  const reconciliationReport = {
    approvedAmount: input.reviewPlan.reconciliation.approvedAmount,
    pendingAmount: input.reviewPlan.reconciliation.pendingAmount,
    rejectedAmount: input.reviewPlan.reconciliation.rejectedAmount,
    source: "payout_review" as const,
    status: input.reviewPlan.reconciliation.variance === 0 ? "balanced" as const : "variance_review" as const,
    totalAmount: input.reviewPlan.reconciliation.totalAmount,
    variance: input.reviewPlan.reconciliation.variance
  };

  return {
    auditEvents: [
      "Release governance plan generated from the internal payout review center.",
      "Budget release packets and reconciliation reports are persisted as internal control records.",
      "Stripe readiness probe is manifest-only and does not contact Stripe or any financial provider."
    ],
    blockedExternalActions: [
      ...input.reviewPlan.blockedExternalActions,
      "Persisting governance records must not move money, call Stripe APIs, or modify external accounts",
      "Budget release packets cannot increase spend without a separate approved internal budget"
    ],
    budgetReleasePackets: input.reviewPlan.budgetReleasePackets,
    externalExecution: false,
    generatedAt,
    mode: "Internal Release Governance",
    persisted: {
      latestReconciliationReport: persistedReconciliationReports[0] ?? null,
      reconciliationReports: persistedReconciliationReports,
      releasePackets: persistedReleasePackets,
      totals: {
        recordedReconciliationReports: persistedReconciliationReports.length,
        recordedReleasePackets: persistedReleasePackets.length,
        staleReleasePackets: staleReleasePackets.length
      }
    },
    reconciliationReport,
    releaseReadiness,
    reviewPlan: input.reviewPlan,
    riskTiers: [
      riskTierFor("high", highRisk),
      riskTierFor("medium", mediumRisk),
      riskTierFor("low", lowRisk)
    ],
    stripeReadOnlyProbe: stripeReadOnlyProbe(),
    summary: `${input.reviewPlan.budgetReleasePackets.length} budget release packet${input.reviewPlan.budgetReleasePackets.length === 1 ? "" : "s"} prepared with ${highRisk.length} high-risk intent${highRisk.length === 1 ? "" : "s"}. ${persistedReleasePackets.length} packet record${persistedReleasePackets.length === 1 ? "" : "s"} and ${persistedReconciliationReports.length} reconciliation report${persistedReconciliationReports.length === 1 ? "" : "s"} are already stored. External execution remains locked.`,
    totals: {
      approvedAmount: input.reviewPlan.totals.approvedAmount,
      budgetReleasePackets: input.reviewPlan.budgetReleasePackets.length,
      highRiskAmount: money(highRisk.reduce((sum, item) => sum + item.amount, 0)),
      highRiskIntents: highRisk.length,
      pendingAmount: input.reviewPlan.totals.pendingAmount,
      reconciliationReportsRecorded: persistedReconciliationReports.length,
      releasePacketsRecorded: persistedReleasePackets.length,
      totalAmount: input.reviewPlan.totals.totalAmount
    }
  };
}
