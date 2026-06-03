import type {
  FinancialScalingBudgetPacketSnapshot,
  FinancialScalingBudgetReviewPlan
} from "./financialOrchestrator.js";

export type FinancialScalingSpendCategory =
  | "product_generation"
  | "listing_optimization"
  | "content_production"
  | "operations_buffer";

export type FinancialScalingSpendState =
  | "locked_review"
  | "ready_for_manual_handoff"
  | "rejected"
  | "stale_budget";

export type FinancialScalingSpendPacket = {
  amount: number;
  approvalState: "approval_required" | "approved_manual_handoff" | "rejected" | "voided";
  assetId: string;
  assetName: string;
  assetType: FinancialScalingBudgetPacketSnapshot["assetType"];
  blockedActions: string[];
  budgetPacketId: string;
  category: FinancialScalingSpendCategory;
  controls: string[];
  currency: "USD";
  dedupeKey: string;
  externalExecution: false;
  id: string;
  maxSpendAmount: number;
  priority: number;
  providerContacted: false;
  purpose: string;
  releaseState: FinancialScalingSpendState;
  score: number;
  storeId: string;
  storeName: string;
};

export type FinancialPersistedScalingSpendPacketSnapshot = FinancialScalingSpendPacket & {
  auditLogId: string | null;
  createdAt: string;
  recordId: string;
  updatedAt: string;
};

export type FinancialScalingSpendControlPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Scaling Spend Control";
  persisted: {
    packets: FinancialPersistedScalingSpendPacketSnapshot[];
    totals: {
      recordedPackets: number;
      stalePackets: number;
    };
  };
  providerContacted: false;
  reviewPlan: FinancialScalingBudgetReviewPlan;
  spendPackets: FinancialScalingSpendPacket[];
  summary: string;
  totals: {
    approvedBudgetAmount: number;
    approvedBudgetPackets: number;
    contentProductionAmount: number;
    listingOptimizationAmount: number;
    operationsBufferAmount: number;
    pendingSpendAmount: number;
    productGenerationAmount: number;
    readyForManualHandoff: number;
    rejectedSpendAmount: number;
    spendPackets: number;
  };
};

const blockedExternalActions = [
  "Increasing ad spend, procurement spend, product spend, software spend, or creative spend automatically",
  "Calling marketplace, POD, ad, social, payment, bank, card, payout, transfer, upload, browser, proxy, or provider write APIs",
  "Publishing listings, uploading content, ordering samples, buying ads, moving money, or executing Stripe Treasury or Connect transfers",
  "Running stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, CAPTCHA bypass, or platform-evasion automation"
];

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function safeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item";
}

function controlsFor(category: FinancialScalingSpendCategory, packet: FinancialScalingBudgetPacketSnapshot) {
  const shared = [
    "Keep spend as an internal manual handoff record only until a separate execution approval exists.",
    `Tie all work back to ${packet.assetName}, score ${packet.score}, and recorded profit velocity ${money(packet.profitVelocity)}/day.`,
    "Attach receipts, operator notes, and resulting performance snapshots before refreshing scale recommendations."
  ];

  if (category === "product_generation") {
    return [
      "Use only for internal product drafts, variant concepts, mockups, or sample-review preparation.",
      ...shared
    ];
  }

  if (category === "listing_optimization") {
    return [
      "Use only for listing copy, pricing tests, mockup improvements, and internal conversion experiments.",
      ...shared
    ];
  }

  if (category === "content_production") {
    return [
      "Use only for internal content briefs, scripts, voice/video draft preparation, and creative assets.",
      ...shared
    ];
  }

  return [
    "Hold as reserved scale capital for refunds, rework, software, or downside control.",
    ...shared
  ];
}

function purposeFor(category: FinancialScalingSpendCategory, packet: FinancialScalingBudgetPacketSnapshot) {
  if (category === "product_generation") {
    return `Fund manual product or variant generation work for ${packet.assetName}.`;
  }

  if (category === "listing_optimization") {
    return `Fund manual listing optimization and conversion repair work for ${packet.assetName}.`;
  }

  if (category === "content_production") {
    return `Fund manual content production preparation for ${packet.assetName}.`;
  }

  return `Reserve scaling buffer for ${packet.assetName} so rapid growth does not consume all approved capital.`;
}

function allocationWeights(packet: FinancialScalingBudgetPacketSnapshot): Array<{
  category: FinancialScalingSpendCategory;
  weight: number;
}> {
  if (packet.assetType === "store") {
    return [
      { category: "product_generation", weight: 0.4 },
      { category: "listing_optimization", weight: 0.25 },
      { category: "content_production", weight: 0.25 },
      { category: "operations_buffer", weight: 0.1 }
    ];
  }

  return [
    { category: "listing_optimization", weight: 0.35 },
    { category: "content_production", weight: 0.3 },
    { category: "product_generation", weight: 0.25 },
    { category: "operations_buffer", weight: 0.1 }
  ];
}

function buildPacketsForBudget(packet: FinancialScalingBudgetPacketSnapshot): FinancialScalingSpendPacket[] {
  const weights = allocationWeights(packet);
  let allocated = 0;

  return weights.map((allocation, index) => {
    const amount = index === weights.length - 1
      ? money(packet.amount - allocated)
      : money(packet.amount * allocation.weight);
    allocated = money(allocated + amount);

    const spendPacket: FinancialScalingSpendPacket = {
      amount,
      approvalState: "approval_required",
      assetId: packet.assetId,
      assetName: packet.assetName,
      assetType: packet.assetType,
      blockedActions: blockedExternalActions,
      budgetPacketId: packet.id,
      category: allocation.category,
      controls: controlsFor(allocation.category, packet),
      currency: "USD",
      dedupeKey: `${packet.dedupeKey}:${allocation.category}`,
      externalExecution: false,
      id: `scale_spend_${safeId(packet.id)}_${allocation.category}`,
      maxSpendAmount: amount,
      priority: packet.priority + index,
      providerContacted: false,
      purpose: purposeFor(allocation.category, packet),
      releaseState: "locked_review",
      score: packet.score,
      storeId: packet.storeId,
      storeName: packet.storeName
    };

    return spendPacket;
  }).filter((spendPacket) => spendPacket.amount > 0);
}

function categoryAmount(packets: FinancialScalingSpendPacket[], category: FinancialScalingSpendCategory) {
  return money(packets.filter((packet) => packet.category === category).reduce((sum, packet) => sum + packet.amount, 0));
}

export function buildFinancialScalingSpendControlPlan(input: {
  generatedAt?: string;
  persistedSpendPackets?: FinancialPersistedScalingSpendPacketSnapshot[];
  reviewPlan: FinancialScalingBudgetReviewPlan;
}): FinancialScalingSpendControlPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const approvedPackets = input.reviewPlan.packets.filter((packet) => packet.status === "approved_manual_handoff");
  const spendPackets = approvedPackets.flatMap(buildPacketsForBudget);
  const currentDedupeKeys = new Set(spendPackets.map((packet) => packet.dedupeKey));
  const persistedPackets = input.persistedSpendPackets ?? [];
  const stalePackets = persistedPackets.filter((packet) => !currentDedupeKeys.has(packet.dedupeKey));
  const pendingSpendAmount = money(spendPackets
    .filter((packet) => packet.approvalState === "approval_required")
    .reduce((sum, packet) => sum + packet.amount, 0));
  const rejectedSpendAmount = money(persistedPackets
    .filter((packet) => packet.approvalState === "rejected" || packet.approvalState === "voided")
    .reduce((sum, packet) => sum + packet.amount, 0));

  return {
    auditEvents: [
      "Scaling spend control generated from approved internal scaling budget packets.",
      "Spend packets are manual control records only; they do not move money, place orders, call providers, upload content, or start ads.",
      "Every spend packet keeps external execution and provider contact locked to false."
    ],
    blockedExternalActions,
    externalExecution: false,
    generatedAt,
    mode: "Internal Scaling Spend Control",
    persisted: {
      packets: persistedPackets,
      totals: {
        recordedPackets: persistedPackets.length,
        stalePackets: stalePackets.length
      }
    },
    providerContacted: false,
    reviewPlan: input.reviewPlan,
    spendPackets,
    summary: `${approvedPackets.length} approved scaling budget packet${approvedPackets.length === 1 ? "" : "s"} converted into ${spendPackets.length} manual spend control packet${spendPackets.length === 1 ? "" : "s"} worth ${money(spendPackets.reduce((sum, packet) => sum + packet.amount, 0))}. External spend execution remains locked.`,
    totals: {
      approvedBudgetAmount: money(approvedPackets.reduce((sum, packet) => sum + packet.amount, 0)),
      approvedBudgetPackets: approvedPackets.length,
      contentProductionAmount: categoryAmount(spendPackets, "content_production"),
      listingOptimizationAmount: categoryAmount(spendPackets, "listing_optimization"),
      operationsBufferAmount: categoryAmount(spendPackets, "operations_buffer"),
      pendingSpendAmount,
      productGenerationAmount: categoryAmount(spendPackets, "product_generation"),
      readyForManualHandoff: persistedPackets.filter((packet) => packet.releaseState === "ready_for_manual_handoff").length,
      rejectedSpendAmount,
      spendPackets: spendPackets.length
    }
  };
}
