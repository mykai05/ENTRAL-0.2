export const revenueOpportunityControlStatuses = [
  "active",
  "watch",
  "paused",
  "blocked",
  "killed",
  "ready_for_handoff"
] as const;

export type RevenueOpportunityControlStatus = (typeof revenueOpportunityControlStatuses)[number];

export type RevenueOpportunityControlStage =
  | "idea_captured"
  | "store_shell_created"
  | "drafts_seeded"
  | "listing_optimization"
  | "launch_preparation"
  | "provider_handoff_ready"
  | "live_monitoring"
  | "blocked_review"
  | "paused_or_killed";

export type RevenueOpportunityControlOptions = {
  includeKilled: boolean;
  maxOpportunities: number;
  minApprovedProducts: number;
  minListingReadyProducts: number;
  minProductDrafts: number;
  minReadinessForHandoff: number;
  windowDays: number;
};

export type RevenueOpportunityControlProductSnapshot = {
  estimatedProfit: number;
  id: string;
  productName: string;
  productType: string;
  profitMargin: number;
  status: string;
};

export type RevenueOpportunityControlStoreSnapshot = {
  approvalStatus: string;
  businessName: string;
  estimatedProfit: number;
  id: string;
  launchStatus: string;
  products: RevenueOpportunityControlProductSnapshot[];
  revenue: number;
  storePlatform: string;
};

export type RevenueOpportunityControlPerformanceSnapshot = {
  grossRevenue: number;
  id: string;
  netProfit: number;
  periodEnd: string;
  productId: string | null;
  storeId: string;
};

export type RevenueOpportunitySnapshot = {
  auditLogId?: string | null;
  businessName: string;
  createdAt: string;
  externalExecution: boolean;
  id: string;
  idea: string;
  providerContacted: boolean;
  sourceKey: string;
  status: string;
  store: RevenueOpportunityControlStoreSnapshot | null;
  storeId: string | null;
  totals?: Record<string, unknown> | null;
  updatedAt: string;
};

export type RevenueOpportunityBlocker = {
  code: string;
  severity: "low" | "medium" | "high";
  title: string;
};

export type RevenueOpportunityNextAction = {
  action:
    | "create_store_shell"
    | "seed_product_drafts"
    | "run_listing_optimization"
    | "prepare_store_setup"
    | "queue_launch_approval"
    | "generate_provider_handoff"
    | "ingest_performance_snapshot"
    | "review_risk";
  externalExecution: false;
  priority: number;
  status: "ready" | "blocked" | "watch";
  title: string;
};

export type RevenueOpportunityControlAction = {
  enabled: boolean;
  reason: string;
  status: RevenueOpportunityControlStatus;
  title: string;
};

export type RevenueOpportunityControlItem = {
  auditLogId: string | null;
  blockers: RevenueOpportunityBlocker[];
  businessName: string;
  controlActions: RevenueOpportunityControlAction[];
  createdAt: string;
  externalExecution: false;
  id: string;
  idea: string;
  metrics: {
    approvedProducts: number;
    estimatedDraftProfit: number;
    listingReadyProducts: number;
    netProfit: number;
    performanceSnapshots: number;
    productDrafts: number;
    publishedProducts: number;
    revenue: number;
    revisionProducts: number;
  };
  nextInternalActions: RevenueOpportunityNextAction[];
  providerContacted: false;
  readinessScore: number;
  recommendedStatus: RevenueOpportunityControlStatus;
  riskLevel: "low" | "medium" | "high";
  sourceKey: string;
  stage: RevenueOpportunityControlStage;
  status: RevenueOpportunityControlStatus;
  store: {
    approvalStatus: string;
    businessName: string;
    id: string;
    launchStatus: string;
    storePlatform: string;
  } | null;
  summary: string;
  updatedAt: string;
};

export type RevenueOpportunityControlPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Revenue Opportunity Control Center";
  opportunities: RevenueOpportunityControlItem[];
  options: RevenueOpportunityControlOptions;
  providerContacted: false;
  stageCounts: Record<RevenueOpportunityControlStage, number>;
  statusCounts: Record<RevenueOpportunityControlStatus, number>;
  summary: string;
  totals: {
    activeOpportunities: number;
    blockedOpportunities: number;
    estimatedDraftProfit: number;
    netProfit: number;
    opportunities: number;
    productDrafts: number;
    readyForHandoff: number;
    revenue: number;
  };
};

export type RevenueOpportunityControlUpdateEvaluation = {
  allowed: boolean;
  blockers: string[];
  externalExecution: false;
  fromStatus: RevenueOpportunityControlStatus;
  providerContacted: false;
  reason: string;
  toStatus: RevenueOpportunityControlStatus;
};

export const defaultRevenueOpportunityControlOptions: RevenueOpportunityControlOptions = {
  includeKilled: false,
  maxOpportunities: 50,
  minApprovedProducts: 2,
  minListingReadyProducts: 3,
  minProductDrafts: 5,
  minReadinessForHandoff: 70,
  windowDays: 30
};

const blockedExternalActions = [
  "Publishing listings, creating provider-side products, uploading artwork, or changing storefront settings",
  "Opening provider admin sessions, calling marketplace APIs, or executing connector writes",
  "Moving money, creating payouts, changing bank accounts, or authorizing spend",
  "Using stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, or platform evasion automation"
];

const stageOrder: RevenueOpportunityControlStage[] = [
  "idea_captured",
  "store_shell_created",
  "drafts_seeded",
  "listing_optimization",
  "launch_preparation",
  "provider_handoff_ready",
  "live_monitoring",
  "blocked_review",
  "paused_or_killed"
];

const statusOrder: RevenueOpportunityControlStatus[] = [
  "active",
  "watch",
  "paused",
  "blocked",
  "killed",
  "ready_for_handoff"
];

const listingReadyStatuses = new Set(["Listing Drafted", "Approved", "Published"]);
const approvedStatuses = new Set(["Approved", "Published"]);
const revisionStatuses = new Set(["Compliance Review", "Needs Revision", "Rejected"]);
const liveStatuses = new Set(["Launched", "Optimizing"]);
const setupStatuses = new Set(["Building Store", "Awaiting Approval", "Launched", "Optimizing"]);

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeStatus(value: string): RevenueOpportunityControlStatus {
  return revenueOpportunityControlStatuses.includes(value as RevenueOpportunityControlStatus)
    ? value as RevenueOpportunityControlStatus
    : "active";
}

function emptyStageCounts(): Record<RevenueOpportunityControlStage, number> {
  return Object.fromEntries(stageOrder.map((stage) => [stage, 0])) as Record<RevenueOpportunityControlStage, number>;
}

function emptyStatusCounts(): Record<RevenueOpportunityControlStatus, number> {
  return Object.fromEntries(statusOrder.map((status) => [status, 0])) as Record<RevenueOpportunityControlStatus, number>;
}

function ratioScore(value: number, target: number, weight: number) {
  if (target <= 0) return weight;

  return clamp(value / target, 0, 1) * weight;
}

function opportunityPerformance(input: {
  opportunity: RevenueOpportunitySnapshot;
  performanceSnapshots: RevenueOpportunityControlPerformanceSnapshot[];
  windowDays: number;
}) {
  if (!input.opportunity.storeId) {
    return [];
  }

  const cutoff = Date.now() - input.windowDays * 86_400_000;

  return input.performanceSnapshots.filter((snapshot) => (
    snapshot.storeId === input.opportunity.storeId
    && Date.parse(snapshot.periodEnd) >= cutoff
  ));
}

function opportunityMetrics(input: {
  opportunity: RevenueOpportunitySnapshot;
  performanceSnapshots: RevenueOpportunityControlPerformanceSnapshot[];
  windowDays: number;
}) {
  const products = input.opportunity.store?.products ?? [];
  const snapshots = opportunityPerformance(input);
  const estimatedDraftProfit = money(products.reduce((sum, product) => sum + product.estimatedProfit, 0));
  const revenue = money(input.opportunity.store?.revenue ?? snapshots.reduce((sum, snapshot) => sum + snapshot.grossRevenue, 0));
  const netProfit = money(snapshots.reduce((sum, snapshot) => sum + snapshot.netProfit, 0));

  return {
    approvedProducts: products.filter((product) => approvedStatuses.has(product.status)).length,
    estimatedDraftProfit,
    listingReadyProducts: products.filter((product) => listingReadyStatuses.has(product.status)).length,
    netProfit,
    performanceSnapshots: snapshots.length,
    productDrafts: products.length,
    publishedProducts: products.filter((product) => product.status === "Published").length,
    revenue,
    revisionProducts: products.filter((product) => revisionStatuses.has(product.status)).length
  };
}

function opportunityBlockers(input: {
  metrics: ReturnType<typeof opportunityMetrics>;
  opportunity: RevenueOpportunitySnapshot;
  options: RevenueOpportunityControlOptions;
  status: RevenueOpportunityControlStatus;
}) {
  const blockers: RevenueOpportunityBlocker[] = [];

  if (!input.opportunity.store) {
    blockers.push({
      code: "missing_store_shell",
      severity: "medium",
      title: "No linked internal store shell exists yet."
    });
  }

  if (input.opportunity.store && input.metrics.productDrafts === 0) {
    blockers.push({
      code: "no_product_drafts",
      severity: "medium",
      title: "No internal product drafts are attached to this opportunity."
    });
  }

  if (input.metrics.productDrafts > 0 && input.metrics.productDrafts < input.options.minProductDrafts) {
    blockers.push({
      code: "thin_product_portfolio",
      severity: "low",
      title: `Only ${input.metrics.productDrafts} product drafts exist; target is ${input.options.minProductDrafts}.`
    });
  }

  if (input.metrics.revisionProducts > 0) {
    blockers.push({
      code: "revision_products",
      severity: "high",
      title: `${input.metrics.revisionProducts} product draft requires revision or compliance review.`
    });
  }

  if (input.metrics.listingReadyProducts < input.options.minListingReadyProducts) {
    blockers.push({
      code: "listing_readiness_gap",
      severity: input.metrics.productDrafts === 0 ? "low" : "medium",
      title: `${input.metrics.listingReadyProducts} listing-ready products; target is ${input.options.minListingReadyProducts}.`
    });
  }

  if (input.metrics.approvedProducts < input.options.minApprovedProducts) {
    blockers.push({
      code: "approval_gap",
      severity: input.metrics.listingReadyProducts >= input.options.minListingReadyProducts ? "medium" : "low",
      title: `${input.metrics.approvedProducts} approved products; target is ${input.options.minApprovedProducts}.`
    });
  }

  if (input.metrics.netProfit < -25) {
    blockers.push({
      code: "negative_profit_velocity",
      severity: "high",
      title: `Recent net profit is ${money(input.metrics.netProfit)}.`
    });
  }

  if (input.status === "blocked") {
    blockers.push({
      code: "operator_blocked",
      severity: "high",
      title: "Operator marked this opportunity as blocked."
    });
  }

  if (input.status === "paused" || input.status === "killed") {
    blockers.push({
      code: "operator_stopped",
      severity: input.status === "killed" ? "high" : "medium",
      title: `Operator marked this opportunity as ${input.status}.`
    });
  }

  return blockers;
}

function opportunityReadiness(input: {
  blockers: RevenueOpportunityBlocker[];
  metrics: ReturnType<typeof opportunityMetrics>;
  opportunity: RevenueOpportunitySnapshot;
  options: RevenueOpportunityControlOptions;
}) {
  const launchStatus = input.opportunity.store?.launchStatus ?? "";
  const score = [
    input.opportunity.store ? 15 : 0,
    ratioScore(input.metrics.productDrafts, input.options.minProductDrafts, 20),
    ratioScore(input.metrics.listingReadyProducts, input.options.minListingReadyProducts, 20),
    ratioScore(input.metrics.approvedProducts, input.options.minApprovedProducts, 15),
    setupStatuses.has(launchStatus) ? 15 : input.metrics.listingReadyProducts > 0 ? 7 : 0,
    input.metrics.performanceSnapshots > 0 ? 10 : 0,
    input.blockers.some((blocker) => blocker.severity === "high") ? 0 : 5
  ].reduce((sum, part) => sum + part, 0);

  return Math.round(clamp(score, 0, 100));
}

function opportunityStage(input: {
  metrics: ReturnType<typeof opportunityMetrics>;
  opportunity: RevenueOpportunitySnapshot;
  options: RevenueOpportunityControlOptions;
  readinessScore: number;
  status: RevenueOpportunityControlStatus;
}) {
  if (input.status === "blocked") return "blocked_review";
  if (input.status === "paused" || input.status === "killed") return "paused_or_killed";
  if (!input.opportunity.store) return "idea_captured";
  if (input.metrics.productDrafts === 0) return "store_shell_created";
  if (input.metrics.publishedProducts > 0 || liveStatuses.has(input.opportunity.store.launchStatus) || input.metrics.revenue > 0) {
    return "live_monitoring";
  }
  if (
    input.metrics.approvedProducts >= input.options.minApprovedProducts
    && input.metrics.listingReadyProducts >= input.options.minListingReadyProducts
    && input.readinessScore >= input.options.minReadinessForHandoff
  ) {
    return "provider_handoff_ready";
  }
  if (input.metrics.listingReadyProducts < input.options.minListingReadyProducts) return "listing_optimization";
  if (setupStatuses.has(input.opportunity.store.launchStatus)) return "launch_preparation";

  return "drafts_seeded";
}

function recommendedStatus(input: {
  blockers: RevenueOpportunityBlocker[];
  metrics: ReturnType<typeof opportunityMetrics>;
  stage: RevenueOpportunityControlStage;
  status: RevenueOpportunityControlStatus;
}) {
  if (input.status === "paused" || input.status === "killed" || input.status === "blocked") return input.status;
  if (input.stage === "provider_handoff_ready") return "ready_for_handoff";
  if (input.blockers.some((blocker) => blocker.severity === "high")) return "blocked";
  if (input.metrics.performanceSnapshots > 0 || input.blockers.some((blocker) => blocker.severity === "medium")) return "watch";

  return "active";
}

function riskLevel(input: {
  blockers: RevenueOpportunityBlocker[];
  metrics: ReturnType<typeof opportunityMetrics>;
  status: RevenueOpportunityControlStatus;
}) {
  if (input.status === "killed" || input.blockers.some((blocker) => blocker.severity === "high")) return "high";
  if (input.status === "paused" || input.status === "watch" || input.blockers.some((blocker) => blocker.severity === "medium")) return "medium";
  if (input.metrics.netProfit < 0) return "medium";

  return "low";
}

function nextInternalActions(input: {
  metrics: ReturnType<typeof opportunityMetrics>;
  opportunity: RevenueOpportunitySnapshot;
  options: RevenueOpportunityControlOptions;
  stage: RevenueOpportunityControlStage;
}) {
  const actions: RevenueOpportunityNextAction[] = [];

  if (!input.opportunity.store) {
    actions.push({
      action: "create_store_shell",
      externalExecution: false,
      priority: 10,
      status: "ready",
      title: "Create internal store shell"
    });
  }

  if (input.metrics.productDrafts < input.options.minProductDrafts) {
    actions.push({
      action: "seed_product_drafts",
      externalExecution: false,
      priority: 20,
      status: input.opportunity.store ? "ready" : "blocked",
      title: "Seed internal POD and digital product drafts"
    });
  }

  if (input.metrics.listingReadyProducts < input.options.minListingReadyProducts && input.metrics.productDrafts > 0) {
    actions.push({
      action: "run_listing_optimization",
      externalExecution: false,
      priority: 30,
      status: "ready",
      title: "Run listing optimization queue"
    });
  }

  if (input.metrics.revisionProducts > 0) {
    actions.push({
      action: "review_risk",
      externalExecution: false,
      priority: 35,
      status: "ready",
      title: "Review product risk and revision queue"
    });
  }

  if (input.metrics.listingReadyProducts >= input.options.minListingReadyProducts) {
    actions.push({
      action: "prepare_store_setup",
      externalExecution: false,
      priority: 40,
      status: "ready",
      title: "Prepare store setup runbook"
    });
  }

  if (input.metrics.approvedProducts >= input.options.minApprovedProducts) {
    actions.push({
      action: "queue_launch_approval",
      externalExecution: false,
      priority: 50,
      status: "ready",
      title: "Queue launch approval packet"
    });
  }

  if (input.stage === "provider_handoff_ready") {
    actions.push({
      action: "generate_provider_handoff",
      externalExecution: false,
      priority: 60,
      status: "ready",
      title: "Generate provider handoff bundle"
    });
  }

  if (input.stage === "live_monitoring" && input.metrics.performanceSnapshots === 0) {
    actions.push({
      action: "ingest_performance_snapshot",
      externalExecution: false,
      priority: 70,
      status: "watch",
      title: "Ingest read-only performance evidence"
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}

function controlActions(input: {
  blockers: RevenueOpportunityBlocker[];
  stage: RevenueOpportunityControlStage;
  status: RevenueOpportunityControlStatus;
}) {
  const handoffEnabled = input.stage === "provider_handoff_ready";
  const highRisk = input.blockers.some((blocker) => blocker.severity === "high");

  return [
    {
      enabled: input.status !== "active",
      reason: "Return the opportunity to normal internal execution.",
      status: "active",
      title: "Mark active"
    },
    {
      enabled: input.status !== "watch",
      reason: "Keep the opportunity visible but require more evidence before scaling.",
      status: "watch",
      title: "Mark watch"
    },
    {
      enabled: handoffEnabled,
      reason: handoffEnabled
        ? "Readiness, listing, and approval thresholds are met for manual provider handoff preparation."
        : "Handoff stays locked until listing-ready and approved product thresholds are met.",
      status: "ready_for_handoff",
      title: "Mark ready for handoff"
    },
    {
      enabled: input.status !== "paused",
      reason: "Pause internal scaling and keep records available for review.",
      status: "paused",
      title: "Pause"
    },
    {
      enabled: highRisk && input.status !== "blocked",
      reason: highRisk ? "High-risk blockers require operator review." : "No high-risk blocker is present.",
      status: "blocked",
      title: "Mark blocked"
    },
    {
      enabled: input.status !== "killed",
      reason: "Kill the opportunity internally without deleting audit history or linked records.",
      status: "killed",
      title: "Kill internally"
    }
  ] satisfies RevenueOpportunityControlAction[];
}

function itemSummary(input: {
  metrics: ReturnType<typeof opportunityMetrics>;
  opportunity: RevenueOpportunitySnapshot;
  stage: RevenueOpportunityControlStage;
}) {
  const productWord = input.metrics.productDrafts === 1 ? "draft" : "drafts";
  const stageText = input.stage.replace(/_/g, " ");

  return `${input.opportunity.businessName} is in ${stageText}: ${input.metrics.productDrafts} product ${productWord}, ${input.metrics.listingReadyProducts} listing-ready, ${input.metrics.approvedProducts} approved, ${money(input.metrics.netProfit)} recent net profit.`;
}

function buildControlItem(input: {
  opportunity: RevenueOpportunitySnapshot;
  options: RevenueOpportunityControlOptions;
  performanceSnapshots: RevenueOpportunityControlPerformanceSnapshot[];
}): RevenueOpportunityControlItem {
  const status = normalizeStatus(input.opportunity.status);
  const metrics = opportunityMetrics({
    opportunity: input.opportunity,
    performanceSnapshots: input.performanceSnapshots,
    windowDays: input.options.windowDays
  });
  const blockers = opportunityBlockers({
    metrics,
    opportunity: input.opportunity,
    options: input.options,
    status
  });
  const readinessScore = opportunityReadiness({
    blockers,
    metrics,
    opportunity: input.opportunity,
    options: input.options
  });
  const stage = opportunityStage({
    metrics,
    opportunity: input.opportunity,
    options: input.options,
    readinessScore,
    status
  });
  const recommended = recommendedStatus({
    blockers,
    metrics,
    stage,
    status
  });

  return {
    auditLogId: input.opportunity.auditLogId ?? null,
    blockers,
    businessName: input.opportunity.businessName,
    controlActions: controlActions({
      blockers,
      stage,
      status
    }),
    createdAt: input.opportunity.createdAt,
    externalExecution: false,
    id: input.opportunity.id,
    idea: input.opportunity.idea,
    metrics,
    nextInternalActions: nextInternalActions({
      metrics,
      opportunity: input.opportunity,
      options: input.options,
      stage
    }),
    providerContacted: false,
    readinessScore,
    recommendedStatus: recommended,
    riskLevel: riskLevel({ blockers, metrics, status }),
    sourceKey: input.opportunity.sourceKey,
    stage,
    status,
    store: input.opportunity.store ? {
      approvalStatus: input.opportunity.store.approvalStatus,
      businessName: input.opportunity.store.businessName,
      id: input.opportunity.store.id,
      launchStatus: input.opportunity.store.launchStatus,
      storePlatform: input.opportunity.store.storePlatform
    } : null,
    summary: itemSummary({ metrics, opportunity: input.opportunity, stage }),
    updatedAt: input.opportunity.updatedAt
  };
}

export function buildRevenueOpportunityControlPlan(input: {
  generatedAt?: string;
  opportunities: RevenueOpportunitySnapshot[];
  options?: Partial<RevenueOpportunityControlOptions>;
  performanceSnapshots?: RevenueOpportunityControlPerformanceSnapshot[];
}): RevenueOpportunityControlPlan {
  const providedOptions = Object.fromEntries(
    Object.entries(input.options ?? {}).filter(([, value]) => value !== undefined)
  ) as Partial<RevenueOpportunityControlOptions>;
  const options = {
    ...defaultRevenueOpportunityControlOptions,
    ...providedOptions
  };
  const items = input.opportunities
    .filter((opportunity) => options.includeKilled || normalizeStatus(opportunity.status) !== "killed")
    .map((opportunity) => buildControlItem({
      opportunity,
      options,
      performanceSnapshots: input.performanceSnapshots ?? []
    }))
    .sort((a, b) => b.readinessScore - a.readinessScore || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, options.maxOpportunities);
  const stageCounts = emptyStageCounts();
  const statusCounts = emptyStatusCounts();

  for (const item of items) {
    stageCounts[item.stage] += 1;
    statusCounts[item.status] += 1;
  }

  const totals = {
    activeOpportunities: items.filter((item) => item.status === "active").length,
    blockedOpportunities: items.filter((item) => item.blockers.some((blocker) => blocker.severity === "high")).length,
    estimatedDraftProfit: money(items.reduce((sum, item) => sum + item.metrics.estimatedDraftProfit, 0)),
    netProfit: money(items.reduce((sum, item) => sum + item.metrics.netProfit, 0)),
    opportunities: items.length,
    productDrafts: items.reduce((sum, item) => sum + item.metrics.productDrafts, 0),
    readyForHandoff: items.filter((item) => item.stage === "provider_handoff_ready" || item.status === "ready_for_handoff").length,
    revenue: money(items.reduce((sum, item) => sum + item.metrics.revenue, 0))
  };

  return {
    auditEvents: [
      "Revenue Opportunity Control Center evaluated durable opportunity records against linked store, product, and performance evidence.",
      "Control updates change only internal opportunity status and write audit logs.",
      "Provider calls, marketplace writes, uploads, payments, ad spend, and browser automation remain locked."
    ],
    blockedExternalActions,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Internal Revenue Opportunity Control Center",
    opportunities: items,
    options,
    providerContacted: false,
    stageCounts,
    statusCounts,
    summary: `${items.length} revenue opportunit${items.length === 1 ? "y" : "ies"} under control: ${totals.readyForHandoff} ready for handoff, ${totals.blockedOpportunities} high-risk, ${totals.productDrafts} internal product drafts, ${totals.netProfit} recent net profit. External execution remains locked.`,
    totals
  };
}

export function evaluateRevenueOpportunityControlUpdate(input: {
  item: RevenueOpportunityControlItem;
  overrideReadiness?: boolean;
  toStatus: RevenueOpportunityControlStatus;
}): RevenueOpportunityControlUpdateEvaluation {
  const blockers: string[] = [];

  if (input.toStatus === "ready_for_handoff" && input.item.stage !== "provider_handoff_ready" && !input.overrideReadiness) {
    blockers.push("Opportunity is not provider-handoff ready. Use listing optimization, store setup, and approval queues first.");
  }

  if (input.toStatus === "active" && input.item.status === "killed" && !input.overrideReadiness) {
    blockers.push("Killed opportunities require an explicit override before returning to active.");
  }

  if (input.toStatus === "ready_for_handoff" && input.item.blockers.some((blocker) => blocker.severity === "high") && !input.overrideReadiness) {
    blockers.push("High-risk blockers must be resolved before provider handoff.");
  }

  const allowed = blockers.length === 0;

  return {
    allowed,
    blockers,
    externalExecution: false,
    fromStatus: input.item.status,
    providerContacted: false,
    reason: allowed
      ? `Internal opportunity status can change from ${input.item.status} to ${input.toStatus}.`
      : blockers.join(" "),
    toStatus: input.toStatus
  };
}
