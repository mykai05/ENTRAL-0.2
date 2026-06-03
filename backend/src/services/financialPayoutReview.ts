import type { FinancialSplitCategory } from "./financialOrchestrator.js";

export type FinancialPayoutIntentStatus = "approval_required" | "approved_manual_handoff" | "rejected" | "voided";

export type FinancialPayoutIntentSnapshot = {
  amount: number;
  approvalRequired: boolean;
  auditLogId: string | null;
  category: FinancialSplitCategory;
  createdAt: string;
  currency: "USD";
  destinationType: "ad_growth_budget" | "entral_tech_operations" | "owner_distribution" | string;
  externalExecution: false;
  id: string;
  metadata: Record<string, unknown>;
  provider: "Stripe Treasury + Connect" | string;
  status: FinancialPayoutIntentStatus | string;
  updatedAt: string;
};

export type FinancialPayoutReviewAction = "approve" | "reject";

export type FinancialPayoutReviewItem = {
  amount: number;
  approvalRequired: boolean;
  category: FinancialSplitCategory;
  createdAt: string;
  currency: "USD";
  destinationType: string;
  externalExecution: false;
  id: string;
  provider: string;
  recommendedAction: "review" | "manual_handoff" | "retain_rejection";
  riskLevel: "low" | "medium" | "high";
  status: string;
  title: string;
  updatedAt: string;
};

export type FinancialBudgetReleasePacket = {
  amount: number;
  approvalState: "approval_required" | "approved_manual_handoff" | "rejected" | "voided";
  blockedActions: string[];
  category: FinancialSplitCategory;
  controls: string[];
  currency: "USD";
  destinationType: string;
  externalExecution: false;
  id: string;
  intentId: string;
  maxReleaseAmount: number;
  purpose: string;
  releaseState: "locked_review" | "ready_for_manual_handoff" | "rejected";
  title: string;
};

export type FinancialStripeReadinessManifest = {
  connectorStatus: "not_connected";
  externalExecution: false;
  provider: "Stripe Treasury + Connect";
  requiredApprovals: string[];
  requiredScopes: Array<{
    mode: "readiness_only";
    reason: string;
    scope: string;
    status: "blocked";
  }>;
  status: "readiness_manifest_only";
};

export type FinancialPayoutReconciliationReport = {
  approvedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  totalAmount: number;
  variance: number;
};

export type FinancialPayoutReviewPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  budgetReleasePackets: FinancialBudgetReleasePacket[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Payout Review Center";
  reconciliation: FinancialPayoutReconciliationReport;
  reviewQueue: FinancialPayoutReviewItem[];
  stripeReadiness: FinancialStripeReadinessManifest;
  summary: string;
  totals: {
    approved: number;
    approvedAmount: number;
    pending: number;
    pendingAmount: number;
    rejected: number;
    rejectedAmount: number;
    reviewItems: number;
    totalAmount: number;
  };
};

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function categoryTitle(category: FinancialSplitCategory) {
  if (category === "scaling") return "Ad/Growth bucket";
  if (category === "personal") return "Owner income";
  return "Entral operations";
}

function titleForIntent(intent: FinancialPayoutIntentSnapshot) {
  return `${categoryTitle(intent.category)} payout review`;
}

function releasePurpose(intent: FinancialPayoutIntentSnapshot) {
  if (intent.category === "scaling") {
    return "Release Ad/Growth bucket capital for approved creative testing, distribution experiments, and validated growth loops only.";
  }

  if (intent.category === "personal") {
    return "Prepare owner-income distribution evidence for manual review without initiating a transfer.";
  }

  return "Hold Entral operations funding for technology, infrastructure, tooling, refunds, software, reserves, and downside protection.";
}

function controlsForIntent(intent: FinancialPayoutIntentSnapshot) {
  const common = [
    "Verify the payout intent traces back to recorded internal ledger entries.",
    "Confirm the split policy total was exactly 100% when the intent was created.",
    "Require reviewer note before any status change.",
    "Keep Stripe, bank, card, and balance APIs locked."
  ];

  if (intent.category === "scaling") {
    return [
      ...common,
      "Attach an approved Ad/Growth budget before spending this amount.",
      "Cap release amount at the recorded payout intent amount."
    ];
  }

  if (intent.category === "personal") {
    return [
      ...common,
      "Confirm owner distribution destination and tax/accounting review before any future transfer path."
    ];
  }

  return [
    ...common,
    "Confirm reserve floor, infrastructure needs, and refund exposure before reducing Entral operations funding."
  ];
}

function releaseState(status: string): FinancialBudgetReleasePacket["releaseState"] {
  if (status === "approved_manual_handoff") return "ready_for_manual_handoff";
  if (status === "rejected" || status === "voided") return "rejected";
  return "locked_review";
}

function recommendedAction(status: string): FinancialPayoutReviewItem["recommendedAction"] {
  if (status === "approved_manual_handoff") return "manual_handoff";
  if (status === "rejected" || status === "voided") return "retain_rejection";
  return "review";
}

function riskLevel(intent: FinancialPayoutIntentSnapshot): FinancialPayoutReviewItem["riskLevel"] {
  if (intent.amount >= 1_000 || intent.category === "personal") return "high";
  if (intent.amount >= 250 || intent.category === "scaling") return "medium";
  return "low";
}

function reviewItemFor(intent: FinancialPayoutIntentSnapshot): FinancialPayoutReviewItem {
  return {
    amount: money(intent.amount),
    approvalRequired: intent.approvalRequired,
    category: intent.category,
    createdAt: intent.createdAt,
    currency: intent.currency,
    destinationType: intent.destinationType,
    externalExecution: false,
    id: intent.id,
    provider: intent.provider,
    recommendedAction: recommendedAction(intent.status),
    riskLevel: riskLevel(intent),
    status: intent.status,
    title: titleForIntent(intent),
    updatedAt: intent.updatedAt
  };
}

function releasePacketFor(intent: FinancialPayoutIntentSnapshot): FinancialBudgetReleasePacket {
  return {
    amount: money(intent.amount),
    approvalState: intent.status as FinancialBudgetReleasePacket["approvalState"],
    blockedActions: [
      "Moving money or issuing payouts",
      "Calling Stripe Treasury, Connect, bank, card, payment, payout, transfer, or balance write APIs",
      "Increasing ad spend or procurement spend without a separate approved budget release",
      "Changing payout schedules, bank accounts, cards, balances, or external recipient records"
    ],
    category: intent.category,
    controls: controlsForIntent(intent),
    currency: intent.currency,
    destinationType: intent.destinationType,
    externalExecution: false,
    id: `release_${intent.id}`,
    intentId: intent.id,
    maxReleaseAmount: money(intent.amount),
    purpose: releasePurpose(intent),
    releaseState: releaseState(intent.status),
    title: `${categoryTitle(intent.category)} release packet`
  };
}

function stripeReadinessManifest(): FinancialStripeReadinessManifest {
  return {
    connectorStatus: "not_connected",
    externalExecution: false,
    provider: "Stripe Treasury + Connect",
    requiredApprovals: [
      "Approve least-privilege credential owner.",
      "Approve read-only reconciliation scope before any write scope.",
      "Approve payout execution policy, rollback owner, and daily payout limit.",
      "Require dry-run reconciliation report before enabling future provider calls."
    ],
    requiredScopes: [
      {
        mode: "readiness_only",
        reason: "Needed for future read-only balance and reconciliation checks.",
        scope: "balance.read",
        status: "blocked"
      },
      {
        mode: "readiness_only",
        reason: "Needed only after payout execution policy exists; currently blocked.",
        scope: "treasury.outbound_payments.write",
        status: "blocked"
      },
      {
        mode: "readiness_only",
        reason: "Needed only after Connect account ownership and transfer limits are approved.",
        scope: "transfers.write",
        status: "blocked"
      }
    ],
    status: "readiness_manifest_only"
  };
}

export function buildFinancialPayoutReviewPlan(input: {
  generatedAt?: string;
  intents: FinancialPayoutIntentSnapshot[];
}): FinancialPayoutReviewPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const reviewQueue = input.intents.map(reviewItemFor);
  const budgetReleasePackets = input.intents.map(releasePacketFor);
  const pending = reviewQueue.filter((item) => item.status === "approval_required");
  const approved = reviewQueue.filter((item) => item.status === "approved_manual_handoff");
  const rejected = reviewQueue.filter((item) => item.status === "rejected" || item.status === "voided");
  const totalAmount = money(reviewQueue.reduce((sum, item) => sum + item.amount, 0));
  const approvedAmount = money(approved.reduce((sum, item) => sum + item.amount, 0));
  const pendingAmount = money(pending.reduce((sum, item) => sum + item.amount, 0));
  const rejectedAmount = money(rejected.reduce((sum, item) => sum + item.amount, 0));

  return {
    auditEvents: [
      "Financial payout review center generated from internal payout intent records.",
      "Budget release packets are internal review artifacts only.",
      "Stripe readiness manifest does not connect credentials or call provider APIs."
    ],
    blockedExternalActions: [
      "Moving money or issuing payouts",
      "Calling Stripe Treasury, Stripe Connect, bank, card, payment, payout, transfer, or balance APIs",
      "Creating, changing, verifying, or deleting external financial accounts",
      "Increasing spend without a separate approved budget release packet"
    ],
    budgetReleasePackets,
    externalExecution: false,
    generatedAt,
    mode: "Internal Payout Review Center",
    reconciliation: {
      approvedAmount,
      pendingAmount,
      rejectedAmount,
      totalAmount,
      variance: money(totalAmount - approvedAmount - pendingAmount - rejectedAmount)
    },
    reviewQueue,
    stripeReadiness: stripeReadinessManifest(),
    summary: `${reviewQueue.length} payout intent${reviewQueue.length === 1 ? "" : "s"} reviewed. ${pending.length} pending, ${approved.length} approved for manual handoff, and ${rejected.length} rejected or voided. External financial execution remains locked.`,
    totals: {
      approved: approved.length,
      approvedAmount,
      pending: pending.length,
      pendingAmount,
      rejected: rejected.length,
      rejectedAmount,
      reviewItems: reviewQueue.length,
      totalAmount
    }
  };
}
