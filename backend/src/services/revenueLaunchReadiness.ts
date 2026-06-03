import type { GrowthApprovalPacket } from "./growthPlans.js";
import { isProviderPayloadApprovalPacket, type ProviderPayloadPackage } from "./merchProviderPayloads.js";
import type { RevenueLaunchPipelinePlan, RevenueLaunchStorePlan } from "./revenueLaunchPipeline.js";
import type { RevenueStoreSetupPlan, RevenueStoreSetupRunbook } from "./revenueStoreSetup.js";

export type RevenueLaunchReadinessOptions = {
  includeApprovalHistory: boolean;
  maxStores: number;
  minLaunchReadiness: number;
  minProviderReadiness: number;
};

export type RevenueLaunchReadinessApprovalSnapshot = {
  createdAt: string;
  id: string;
  packet: GrowthApprovalPacket | null;
  requestAuditLogId: string | null;
  reviewAuditLogId: string | null;
  reviewedAt: string | null;
  status: "approved" | "pending" | "rejected" | string;
  storeId: string;
};

export type RevenueLaunchReadinessStoreSnapshot = {
  approvalStatus: string;
  businessName: string;
  estimatedProfit: number;
  id: string;
  launchStatus: string;
  productTypes: string[];
  revenue: number;
  storePlatform: string;
};

export type RevenueLaunchReadinessItem = {
  approvalState: {
    approvedPackets: number;
    latestProviderApprovalId: string | null;
    pendingPackets: number;
    providerApprovalApproved: boolean;
    providerApprovalPending: boolean;
    rejectedPackets: number;
    totalPackets: number;
  };
  blockers: Array<{
    code: string;
    severity: "low" | "medium" | "high";
    title: string;
  }>;
  externalExecution: false;
  launchPipeline: {
    action: string;
    missingProducts: number;
    readyProducts: number;
    reason: string;
  } | null;
  nextInternalAction:
    | "seed_product_drafts"
    | "optimize_listings"
    | "queue_launch_approval"
    | "prepare_store_setup"
    | "request_provider_payload_approval"
    | "generate_provider_handoff"
    | "ingest_performance"
    | "hold_review";
  priority: number;
  providerContacted: false;
  providerPayload: {
    adapterCoverage: string[];
    payloadCount: number;
    readinessScore: number;
    warnings: string[];
  };
  readinessScore: number;
  riskLevel: "low" | "medium" | "high";
  stage:
    | "product_drafting"
    | "listing_optimization"
    | "launch_approval"
    | "store_setup"
    | "provider_payload_review"
    | "handoff_ready"
    | "live_monitoring"
    | "blocked";
  store: RevenueLaunchReadinessStoreSnapshot;
  storeSetup: {
    connectorReadinessScore: number;
    connectorStatus: string;
    queuedAction: string;
    readinessScore: number;
  } | null;
  summary: string;
};

export type RevenueLaunchReadinessPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Launch Readiness Board";
  options: RevenueLaunchReadinessOptions;
  providerContacted: false;
  queue: Array<{
    action: RevenueLaunchReadinessItem["nextInternalAction"];
    externalExecution: false;
    priority: number;
    readinessScore: number;
    storeId: string;
    storeName: string;
    summary: string;
  }>;
  stageCounts: Record<RevenueLaunchReadinessItem["stage"], number>;
  stores: RevenueLaunchReadinessItem[];
  summary: string;
  totals: {
    approvedProviderPackets: number;
    blockedStores: number;
    handoffReadyStores: number;
    payloadsPrepared: number;
    queuedStores: number;
    storesEvaluated: number;
  };
};

const defaultOptions: RevenueLaunchReadinessOptions = {
  includeApprovalHistory: true,
  maxStores: 12,
  minLaunchReadiness: 70,
  minProviderReadiness: 70
};

const stageOrder: RevenueLaunchReadinessItem["stage"][] = [
  "product_drafting",
  "listing_optimization",
  "launch_approval",
  "store_setup",
  "provider_payload_review",
  "handoff_ready",
  "live_monitoring",
  "blocked"
];

const blockedExternalActions = [
  "Publishing listings or products",
  "Sending provider API requests or opening provider admin sessions",
  "Uploading artwork, mockups, digital files, or storefront assets",
  "Changing storefront settings, collections, shipping, taxes, fulfillment, payment, or return policies",
  "Moving money, creating payouts, starting ad spend, or posting social content",
  "Using stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, or platform evasion automation"
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function optionsWithDefaults(input: Partial<RevenueLaunchReadinessOptions> = {}): RevenueLaunchReadinessOptions {
  const provided = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<RevenueLaunchReadinessOptions>;

  return {
    includeApprovalHistory: provided.includeApprovalHistory ?? defaultOptions.includeApprovalHistory,
    maxStores: clamp(Math.round(provided.maxStores ?? defaultOptions.maxStores), 1, 50),
    minLaunchReadiness: clamp(Math.round(provided.minLaunchReadiness ?? defaultOptions.minLaunchReadiness), 1, 100),
    minProviderReadiness: clamp(Math.round(provided.minProviderReadiness ?? defaultOptions.minProviderReadiness), 1, 100)
  };
}

function emptyStageCounts(): Record<RevenueLaunchReadinessItem["stage"], number> {
  return Object.fromEntries(stageOrder.map((stage) => [stage, 0])) as Record<RevenueLaunchReadinessItem["stage"], number>;
}

function approvalsForStore(storeId: string, approvals: RevenueLaunchReadinessApprovalSnapshot[]) {
  return approvals.filter((approval) => approval.storeId === storeId);
}

function isProviderApproval(approval: RevenueLaunchReadinessApprovalSnapshot) {
  return Boolean(approval.packet && isProviderPayloadApprovalPacket(approval.packet));
}

function approvalState(storeId: string, approvals: RevenueLaunchReadinessApprovalSnapshot[]) {
  const storeApprovals = approvalsForStore(storeId, approvals);
  const providerApprovals = storeApprovals.filter(isProviderApproval);
  const approvedProvider = providerApprovals.find((approval) => approval.status === "approved") ?? null;
  const pendingProvider = providerApprovals.some((approval) => approval.status === "pending");

  return {
    approvedPackets: storeApprovals.filter((approval) => approval.status === "approved").length,
    latestProviderApprovalId: approvedProvider?.id ?? providerApprovals[0]?.id ?? null,
    pendingPackets: storeApprovals.filter((approval) => approval.status === "pending").length,
    providerApprovalApproved: Boolean(approvedProvider),
    providerApprovalPending: pendingProvider,
    rejectedPackets: storeApprovals.filter((approval) => approval.status === "rejected").length,
    totalPackets: storeApprovals.length
  };
}

function blockers(input: {
  approvalState: ReturnType<typeof approvalState>;
  launchPlan: RevenueLaunchStorePlan | null;
  providerPayload: ProviderPayloadPackage;
  setupRunbook: RevenueStoreSetupRunbook | null;
}) {
  const items: RevenueLaunchReadinessItem["blockers"] = [];

  if (!input.launchPlan) {
    items.push({
      code: "missing_launch_pipeline",
      severity: "medium",
      title: "No launch pipeline plan is available for this store."
    });
  } else {
    if (input.launchPlan.missingProducts > 0) {
      items.push({
        code: "product_floor_gap",
        severity: "medium",
        title: `${input.launchPlan.missingProducts} more internal product draft${input.launchPlan.missingProducts === 1 ? "" : "s"} needed before launch.`
      });
    }

    if (input.launchPlan.action === "optimize_listings") {
      items.push({
        code: "listing_copy_gap",
        severity: "medium",
        title: "Listing copy needs optimization before approval."
      });
    }

    if (!input.launchPlan.launchPackageReady) {
      items.push({
        code: "launch_package_gap",
        severity: "low",
        title: "Launch package does not yet have the required approved products."
      });
    }
  }

  if (!input.setupRunbook) {
    items.push({
      code: "missing_store_setup",
      severity: "medium",
      title: "No store setup runbook exists for this store."
    });
  } else if (input.setupRunbook.manualConnectorReadiness.status === "Blocked - missing launch inputs") {
    items.push({
      code: "connector_inputs_missing",
      severity: "medium",
      title: "Connector readiness is blocked by missing launch inputs."
    });
  }

  if (input.providerPayload.payloadCount === 0) {
    items.push({
      code: "no_provider_payloads",
      severity: "high",
      title: "No locked provider payloads are available."
    });
  }

  if (input.providerPayload.readinessScore < 50) {
    items.push({
      code: "provider_payload_weak",
      severity: "medium",
      title: `Provider payload readiness is ${input.providerPayload.readinessScore}/100.`
    });
  }

  if (!input.approvalState.providerApprovalApproved && !input.approvalState.providerApprovalPending && input.providerPayload.payloadCount > 0) {
    items.push({
      code: "provider_approval_missing",
      severity: "medium",
      title: "Provider payload approval packet has not been requested."
    });
  }

  if (input.approvalState.rejectedPackets > 0) {
    items.push({
      code: "rejected_approval_present",
      severity: "high",
      title: "A launch or provider approval packet was rejected."
    });
  }

  return items;
}

function stageFor(input: {
  approvalState: ReturnType<typeof approvalState>;
  blockers: RevenueLaunchReadinessItem["blockers"];
  launchPlan: RevenueLaunchStorePlan | null;
  providerPayload: ProviderPayloadPackage;
  setupRunbook: RevenueStoreSetupRunbook | null;
  store: RevenueLaunchReadinessStoreSnapshot;
}) {
  if (input.store.launchStatus === "Launched" || input.store.launchStatus === "Optimizing" || input.store.revenue > 0) {
    return "live_monitoring";
  }

  if (input.blockers.some((blocker) => blocker.severity === "high")) return "blocked";

  if (input.approvalState.providerApprovalApproved && input.providerPayload.readinessScore >= 70) {
    return "handoff_ready";
  }

  if (input.approvalState.providerApprovalPending || input.providerPayload.payloadCount > 0) {
    return "provider_payload_review";
  }

  if (input.setupRunbook?.action === "prepare_store_setup" || input.setupRunbook?.action === "queue_connector_readiness") {
    return "store_setup";
  }

  if (input.launchPlan?.action === "queue_launch_approval" || input.launchPlan?.action === "prepare_launch_package") {
    return "launch_approval";
  }

  if (input.launchPlan?.action === "optimize_listings") return "listing_optimization";

  return "product_drafting";
}

function readinessScore(input: {
  approvalState: ReturnType<typeof approvalState>;
  blockers: RevenueLaunchReadinessItem["blockers"];
  launchPlan: RevenueLaunchStorePlan | null;
  providerPayload: ProviderPayloadPackage;
  setupRunbook: RevenueStoreSetupRunbook | null;
}) {
  const launchScore = input.launchPlan ? Math.min(25, input.launchPlan.score * 0.25) : 0;
  const productScore = input.launchPlan ? Math.min(20, input.launchPlan.readyProducts * 8) : 0;
  const setupScore = input.setupRunbook ? Math.min(25, input.setupRunbook.readinessScore * 0.25) : 0;
  const providerScore = Math.min(20, input.providerPayload.readinessScore * 0.2);
  const approvalScore = input.approvalState.providerApprovalApproved ? 10 : input.approvalState.providerApprovalPending ? 5 : 0;
  const blockerPenalty = input.blockers.reduce((sum, blocker) => {
    if (blocker.severity === "high") return sum + 28;
    if (blocker.severity === "medium") return sum + 12;
    return sum + 4;
  }, 0);

  return Math.round(clamp(launchScore + productScore + setupScore + providerScore + approvalScore - blockerPenalty, 0, 100));
}

function nextAction(input: {
  approvalState: ReturnType<typeof approvalState>;
  launchPlan: RevenueLaunchStorePlan | null;
  providerPayload: ProviderPayloadPackage;
  setupRunbook: RevenueStoreSetupRunbook | null;
  stage: RevenueLaunchReadinessItem["stage"];
}) {
  if (input.stage === "blocked") return "hold_review";
  if (input.stage === "handoff_ready") return "generate_provider_handoff";
  if (input.launchPlan?.action === "seed_products") return "seed_product_drafts";
  if (input.launchPlan?.action === "optimize_listings") return "optimize_listings";
  if (input.launchPlan?.action === "queue_launch_approval" || input.launchPlan?.action === "prepare_launch_package") return "queue_launch_approval";
  if (input.setupRunbook?.action === "prepare_store_setup" || input.setupRunbook?.action === "queue_connector_readiness") return "prepare_store_setup";
  if (input.providerPayload.payloadCount > 0 && !input.approvalState.providerApprovalApproved && !input.approvalState.providerApprovalPending) return "request_provider_payload_approval";
  if (input.stage === "live_monitoring") return "ingest_performance";

  return "hold_review";
}

function riskLevel(blockersValue: RevenueLaunchReadinessItem["blockers"]) {
  if (blockersValue.some((blocker) => blocker.severity === "high")) return "high";
  if (blockersValue.some((blocker) => blocker.severity === "medium")) return "medium";
  return "low";
}

function itemSummary(input: {
  launchPlan: RevenueLaunchStorePlan | null;
  providerPayload: ProviderPayloadPackage;
  readinessScore: number;
  setupRunbook: RevenueStoreSetupRunbook | null;
  stage: RevenueLaunchReadinessItem["stage"];
  store: RevenueLaunchReadinessStoreSnapshot;
}) {
  const readyProducts = input.launchPlan?.readyProducts ?? 0;
  const connector = input.setupRunbook?.manualConnectorReadiness.status ?? "No setup runbook";

  return `${input.store.businessName} is in ${input.stage.replace(/_/g, " ")} at ${input.readinessScore}/100 readiness: ${readyProducts} approved products, ${input.providerPayload.payloadCount} locked provider payloads, ${connector}.`;
}

function buildItem(input: {
  approvals: RevenueLaunchReadinessApprovalSnapshot[];
  launchPlan: RevenueLaunchStorePlan | null;
  providerPayload: ProviderPayloadPackage;
  setupRunbook: RevenueStoreSetupRunbook | null;
  store: RevenueLaunchReadinessStoreSnapshot;
}): RevenueLaunchReadinessItem {
  const state = approvalState(input.store.id, input.approvals);
  const blockerList = blockers({
    approvalState: state,
    launchPlan: input.launchPlan,
    providerPayload: input.providerPayload,
    setupRunbook: input.setupRunbook
  });
  const stage = stageFor({
    approvalState: state,
    blockers: blockerList,
    launchPlan: input.launchPlan,
    providerPayload: input.providerPayload,
    setupRunbook: input.setupRunbook,
    store: input.store
  });
  const score = readinessScore({
    approvalState: state,
    blockers: blockerList,
    launchPlan: input.launchPlan,
    providerPayload: input.providerPayload,
    setupRunbook: input.setupRunbook
  });
  const action = nextAction({
    approvalState: state,
    launchPlan: input.launchPlan,
    providerPayload: input.providerPayload,
    setupRunbook: input.setupRunbook,
    stage
  });

  return {
    approvalState: state,
    blockers: blockerList,
    externalExecution: false,
    launchPipeline: input.launchPlan ? {
      action: input.launchPlan.action,
      missingProducts: input.launchPlan.missingProducts,
      readyProducts: input.launchPlan.readyProducts,
      reason: input.launchPlan.reason
    } : null,
    nextInternalAction: action,
    priority: stage === "handoff_ready" ? 1 : stage === "provider_payload_review" ? 2 : stage === "store_setup" ? 3 : stage === "launch_approval" ? 4 : stage === "blocked" ? 9 : 6,
    providerContacted: false,
    providerPayload: {
      adapterCoverage: input.providerPayload.adapterCoverage,
      payloadCount: input.providerPayload.payloadCount,
      readinessScore: input.providerPayload.readinessScore,
      warnings: input.providerPayload.warnings
    },
    readinessScore: score,
    riskLevel: riskLevel(blockerList),
    stage,
    store: input.store,
    storeSetup: input.setupRunbook ? {
      connectorReadinessScore: input.setupRunbook.manualConnectorReadiness.score,
      connectorStatus: input.setupRunbook.manualConnectorReadiness.status,
      queuedAction: input.setupRunbook.action,
      readinessScore: input.setupRunbook.readinessScore
    } : null,
    summary: itemSummary({
      launchPlan: input.launchPlan,
      providerPayload: input.providerPayload,
      readinessScore: score,
      setupRunbook: input.setupRunbook,
      stage,
      store: input.store
    })
  };
}

export function buildRevenueLaunchReadinessPlan(input: {
  approvals?: RevenueLaunchReadinessApprovalSnapshot[];
  generatedAt?: string;
  launchPlan: RevenueLaunchPipelinePlan;
  options?: Partial<RevenueLaunchReadinessOptions>;
  providerPayloads: ProviderPayloadPackage[];
  setupPlan: RevenueStoreSetupPlan;
  stores: RevenueLaunchReadinessStoreSnapshot[];
}): RevenueLaunchReadinessPlan {
  const options = optionsWithDefaults(input.options);
  const launchPlansByStore = new Map(input.launchPlan.storePlans.map((plan) => [plan.storeId, plan]));
  const setupRunbooksByStore = new Map(input.setupPlan.runbooks.map((runbook) => [runbook.storeId, runbook]));
  const payloadsByStore = new Map(input.providerPayloads.map((payload) => [payload.store.storeId, payload]));
  const items = input.stores.map((store) => buildItem({
    approvals: options.includeApprovalHistory ? input.approvals ?? [] : [],
    launchPlan: launchPlansByStore.get(store.id) ?? null,
    providerPayload: payloadsByStore.get(store.id) ?? {
      adapterCoverage: [],
      auditEvents: [],
      blockedActions: blockedExternalActions,
      externalExecution: false,
      generatedAt: input.generatedAt ?? new Date().toISOString(),
      mode: "Locked Provider Payload Package",
      options: {
        includeUnapproved: false,
        maxProducts: 0
      },
      payloadCount: 0,
      productPayloads: [],
      providerContacted: false,
      readinessScore: 0,
      store: {
        businessName: store.businessName,
        podProvider: "Other",
        storeId: store.id,
        storePlatform: store.storePlatform
      },
      summary: "No provider payload package was generated for this store.",
      warnings: ["Provider payload package is missing."]
    },
    setupRunbook: setupRunbooksByStore.get(store.id) ?? null,
    store
  }))
    .filter((item) => item.readinessScore >= options.minLaunchReadiness || item.nextInternalAction !== "hold_review" || item.riskLevel === "high")
    .sort((a, b) => a.priority - b.priority || b.readinessScore - a.readinessScore)
    .slice(0, options.maxStores);
  const stageCounts = emptyStageCounts();

  for (const item of items) {
    stageCounts[item.stage] += 1;
  }

  const queue = items
    .filter((item) => item.nextInternalAction !== "hold_review")
    .map((item) => ({
      action: item.nextInternalAction,
      externalExecution: false as const,
      priority: item.priority,
      readinessScore: item.readinessScore,
      storeId: item.store.id,
      storeName: item.store.businessName,
      summary: item.summary
    }));
  const approvedProviderPackets = items.filter((item) => item.approvalState.providerApprovalApproved).length;
  const handoffReadyStores = items.filter((item) => item.stage === "handoff_ready" && item.providerPayload.readinessScore >= options.minProviderReadiness).length;
  const payloadsPrepared = items.reduce((sum, item) => sum + item.providerPayload.payloadCount, 0);
  const blockedStores = items.filter((item) => item.riskLevel === "high").length;

  return {
    auditEvents: [
      "Launch Readiness Board aggregated launch pipeline, store setup, provider payload, and approval evidence.",
      "The board is read-only and prepares internal next actions only.",
      "No external provider, browser session, upload target, payment provider, social platform, or ad account was contacted."
    ],
    blockedExternalActions,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Internal Launch Readiness Board",
    options,
    providerContacted: false,
    queue,
    stageCounts,
    stores: items,
    summary: `${items.length} stores ranked for launch readiness: ${handoffReadyStores} handoff-ready, ${approvedProviderPackets} with approved provider packets, ${payloadsPrepared} locked provider payloads prepared, ${blockedStores} blocked.`,
    totals: {
      approvedProviderPackets,
      blockedStores,
      handoffReadyStores,
      payloadsPrepared,
      queuedStores: queue.length,
      storesEvaluated: input.stores.length
    }
  };
}
