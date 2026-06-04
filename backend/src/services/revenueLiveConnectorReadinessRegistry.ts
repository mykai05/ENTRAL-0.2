import type {
  RevenueLaunchClosureLedgerEntry,
  RevenueLaunchClosureLedgerPlan
} from "./revenueLaunchClosureLedger.js";
import type {
  RevenueLaunchOperationsPack,
  RevenueLaunchOperationsPackPlan
} from "./revenueLaunchOperationsPack.js";
import type {
  RevenueSignalConnectorApprovalPlan,
  RevenueSignalConnectorApprovalRecordSnapshot,
  RevenueSignalImportJobSnapshot
} from "./revenueSignalConnectorApprovals.js";
import type {
  RevenueSignalConnectorLane,
  RevenueSignalConnectorManifest,
  RevenueSignalConnectorProvider,
  RevenueSignalConnectorScope
} from "./revenueSignalConnectors.js";

export const revenueLiveConnectorReadinessRegistryConfirmation = "RECORD INTERNAL LIVE CONNECTOR READINESS REGISTRY";

export type RevenueLiveConnectorReadinessStatus =
  | "blocked"
  | "needs_readonly_approval"
  | "needs_operator_review"
  | "ready_for_design";

export type RevenueLiveConnectorReadinessAction =
  | "resolve_launch_blockers"
  | "queue_readonly_approvals"
  | "review_live_boundary"
  | "record_connector_design_readiness";

export type RevenueLiveConnectorReadinessOptions = {
  includeBlocked: boolean;
  maxEntries: number;
  minClosureScore: number;
  minReadOnlyConnectors: number;
  requireOperationsPackAudit: boolean;
  requirePerformanceEvidence: boolean;
};

export type RevenueLiveConnectorBoundaryRole =
  | "storefront"
  | "pod_provider"
  | "payments"
  | "content"
  | "manual_import";

export type RevenueLiveConnectorBoundary = {
  approvalGates: string[];
  blockedExternalActions: string[];
  credentialEnvVars: string[];
  endpointTemplates: string[];
  externalExecution: false;
  futureLiveScopes: RevenueSignalConnectorScope[];
  lane: RevenueSignalConnectorLane | "launch";
  liveMode: "blocked_until_operator_design_approval";
  provider: RevenueSignalConnectorProvider | "other";
  providerContacted: false;
  providerName: string;
  readOnlyScopes: RevenueSignalConnectorScope[];
  readiness: "missing_manifest" | "needs_approval" | "approved_readonly" | "design_review_ready";
  role: RevenueLiveConnectorBoundaryRole;
  rollbackControls: string[];
};

export type RevenueLiveConnectorReadinessEntry = {
  action: RevenueLiveConnectorReadinessAction;
  approvalGates: Array<{
    evidenceRequired: string[];
    gate: string;
    status: "blocked" | "pending" | "ready";
  }>;
  blockers: Array<{
    code: string;
    severity: "low" | "medium" | "high";
    title: string;
  }>;
  closure: {
    expectedFirstWeekRevenue: number;
    performanceSnapshots: number;
    score: number;
    status: RevenueLaunchClosureLedgerEntry["status"];
  };
  connectorBoundaries: RevenueLiveConnectorBoundary[];
  externalExecution: false;
  operationsPack: {
    artifactSlots: number;
    auditReady: boolean;
    credentialScopes: string[];
    manualSteps: number;
    providers: string[];
    requestManifests: number;
    status: RevenueLaunchOperationsPack["status"];
  };
  priority: number;
  providerContacted: false;
  readinessScore: number;
  readOnlyEvidence: {
    approvedConnectors: number;
    importJobsQueued: number;
    manifestIds: string[];
    pendingApprovals: number;
    readyManifests: number;
    requiredConnectors: number;
  };
  rollbackControls: string[];
  status: RevenueLiveConnectorReadinessStatus;
  storeId: string;
  storeName: string;
  summary: string;
};

export type RevenueLiveConnectorReadinessRegistryPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  entries: RevenueLiveConnectorReadinessEntry[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Revenue Live Connector Readiness Registry";
  options: RevenueLiveConnectorReadinessOptions;
  providerContacted: false;
  queue: Array<{
    action: RevenueLiveConnectorReadinessAction;
    externalExecution: false;
    priority: number;
    providerContacted: false;
    readinessScore: number;
    status: RevenueLiveConnectorReadinessStatus;
    storeId: string;
    storeName: string;
    summary: string;
  }>;
  summary: string;
  totals: {
    approvedReadOnlyConnectors: number;
    blockedEntries: number;
    entries: number;
    needsOperatorReview: number;
    needsReadOnlyApproval: number;
    readyForDesign: number;
    requiredBoundaries: number;
  };
};

type PlanInput = {
  closureLedgerPlan: RevenueLaunchClosureLedgerPlan;
  generatedAt?: string;
  operationsPackPlan: RevenueLaunchOperationsPackPlan;
  options?: Partial<RevenueLiveConnectorReadinessOptions>;
  signalApprovalPlan: RevenueSignalConnectorApprovalPlan;
};

const defaultOptions: RevenueLiveConnectorReadinessOptions = {
  includeBlocked: true,
  maxEntries: 10,
  minClosureScore: 76,
  minReadOnlyConnectors: 1,
  requireOperationsPackAudit: true,
  requirePerformanceEvidence: true
};

const blockedExternalActions = [
  "Enabling live connector credentials, OAuth grants, write scopes, webhook subscriptions, storefront changes, provider product creation, uploads, publishing, posting, ad spend, payouts, transfers, or bank/card/account changes",
  "Running provider admin browser sessions, stealth browsers, anti-detection flows, proxy rotation, fingerprint spoofing, CAPTCHA bypass, account warmup, or platform-evasion automation",
  "Importing live marketplace, provider, analytics, social, or payment data outside approved read-only connector records and queued internal Signal Intake handoffs"
];

const providerNames: Record<RevenueSignalConnectorProvider | "other", string> = {
  etsy: "Etsy",
  instagram: "Instagram Reels",
  manual: "Manual Import",
  other: "Other Provider",
  printful: "Printful",
  printify: "Printify",
  shopify: "Shopify",
  stripe: "Stripe",
  tiktok: "TikTok",
  youtube: "YouTube Shorts"
};

const liveCredentialEnvVars: Record<RevenueSignalConnectorProvider | "other", string[]> = {
  etsy: ["ETSY_CONNECTOR_CLIENT_ID", "ETSY_CONNECTOR_CLIENT_SECRET", "ETSY_CONNECTOR_REFRESH_TOKEN"],
  instagram: ["META_CONNECTOR_ACCESS_TOKEN", "INSTAGRAM_BUSINESS_ACCOUNT_ID"],
  manual: [],
  other: ["PROVIDER_CONNECTOR_TOKEN"],
  printful: ["PRINTFUL_CONNECTOR_TOKEN"],
  printify: ["PRINTIFY_CONNECTOR_TOKEN", "PRINTIFY_SHOP_ID"],
  shopify: ["SHOPIFY_CONNECTOR_ADMIN_TOKEN", "SHOPIFY_STORE_DOMAIN"],
  stripe: ["STRIPE_CONNECTOR_SECRET_KEY"],
  tiktok: ["TIKTOK_CONNECTOR_CLIENT_KEY", "TIKTOK_CONNECTOR_CLIENT_SECRET"],
  youtube: ["YOUTUBE_CONNECTOR_CLIENT_ID", "YOUTUBE_CONNECTOR_CLIENT_SECRET", "YOUTUBE_CONNECTOR_REFRESH_TOKEN"]
};

const futureLiveScopes: Record<RevenueSignalConnectorProvider | "other", RevenueSignalConnectorScope[]> = {
  etsy: [
    { reason: "Create or update draft listings only after separate operator launch approval.", scope: "listings:write" },
    { reason: "Update inventory and price fields after rollback controls are tested.", scope: "inventory:write" }
  ],
  instagram: [
    { reason: "Upload approved content packages after channel-level publish approval.", scope: "content:publish" },
    { reason: "Read account metadata needed to verify upload ownership.", scope: "accounts:read" }
  ],
  manual: [
    { reason: "Accept reviewed operator-provided payloads only.", scope: "manual:reviewed_import" }
  ],
  other: [
    { reason: "Provider-specific write access must be explicitly designed and approved.", scope: "provider:write" }
  ],
  printful: [
    { reason: "Create draft POD products from approved locked request manifests.", scope: "products:write" },
    { reason: "Attach approved print files after artifact hash review.", scope: "files:write" }
  ],
  printify: [
    { reason: "Create draft POD products from approved locked request manifests.", scope: "products:write" },
    { reason: "Attach approved print files after artifact hash review.", scope: "uploads:write" },
    { reason: "Read shop metadata required for idempotent provider requests.", scope: "shops:read" }
  ],
  shopify: [
    { reason: "Create or update draft products after separate operator launch approval.", scope: "write_products" },
    { reason: "Update inventory and collection assignment after rollback controls are tested.", scope: "write_inventory" }
  ],
  stripe: [
    { reason: "Create payout or transfer intents only after Financial Orchestrator approval gates pass.", scope: "transfers:write" },
    { reason: "Read balance state immediately before any future operator-approved money movement.", scope: "balance:read" }
  ],
  tiktok: [
    { reason: "Upload approved content packages after channel-level publish approval.", scope: "video:publish" },
    { reason: "Read creator/account metadata needed to verify upload ownership.", scope: "creator:read" }
  ],
  youtube: [
    { reason: "Upload approved content packages after channel-level publish approval.", scope: "youtube.upload" },
    { reason: "Read channel metadata needed to verify upload ownership.", scope: "youtube.readonly" }
  ]
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function optionsWithDefaults(input: Partial<RevenueLiveConnectorReadinessOptions> = {}): RevenueLiveConnectorReadinessOptions {
  return {
    includeBlocked: input.includeBlocked ?? defaultOptions.includeBlocked,
    maxEntries: clamp(Math.round(input.maxEntries ?? defaultOptions.maxEntries), 1, 100),
    minClosureScore: clamp(Math.round(input.minClosureScore ?? defaultOptions.minClosureScore), 1, 100),
    minReadOnlyConnectors: clamp(Math.round(input.minReadOnlyConnectors ?? defaultOptions.minReadOnlyConnectors), 0, 10),
    requireOperationsPackAudit: input.requireOperationsPackAudit ?? defaultOptions.requireOperationsPackAudit,
    requirePerformanceEvidence: input.requirePerformanceEvidence ?? defaultOptions.requirePerformanceEvidence
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeProvider(value: string | null | undefined): RevenueSignalConnectorProvider | "other" {
  const normalized = value?.toLowerCase().trim();

  if (normalized === "etsy") return "etsy";
  if (normalized === "instagram" || normalized === "instagram reels") return "instagram";
  if (normalized === "manual" || normalized === "manual import") return "manual";
  if (normalized === "printful") return "printful";
  if (normalized === "printify") return "printify";
  if (normalized === "shopify") return "shopify";
  if (normalized === "stripe" || normalized === "stripe treasury + connect") return "stripe";
  if (normalized === "tiktok") return "tiktok";
  if (normalized === "youtube" || normalized === "youtube shorts") return "youtube";

  return "other";
}

function roleFor(provider: RevenueSignalConnectorProvider | "other"): RevenueLiveConnectorBoundaryRole {
  if (provider === "etsy" || provider === "shopify") return "storefront";
  if (provider === "printify" || provider === "printful") return "pod_provider";
  if (provider === "stripe") return "payments";
  if (provider === "youtube" || provider === "tiktok" || provider === "instagram") return "content";
  if (provider === "manual") return "manual_import";

  return "manual_import";
}

function laneFor(provider: RevenueSignalConnectorProvider | "other"): RevenueSignalConnectorLane | "launch" {
  if (provider === "stripe") return "payments";
  if (provider === "youtube" || provider === "tiktok" || provider === "instagram") return "content";
  if (provider === "manual" || provider === "other") return "launch";

  return "commerce";
}

function rollbackControls(provider: RevenueSignalConnectorProvider | "other", pack: RevenueLaunchOperationsPack | null) {
  const generic = [
    "Revoke connector token and return ENTRAL to manual-only mode.",
    "Disable queued connector jobs and preserve the last internal approval artifact.",
    "Compare provider state against the locked request manifest before any retry."
  ];

  if (provider === "stripe") {
    return [
      "Cancel pending payout or transfer intent before settlement.",
      "Re-run Financial Orchestrator split-policy checks against the latest read-only balance.",
      ...generic
    ];
  }

  if (provider === "etsy" || provider === "shopify") {
    return [
      "Archive or unpublish only the affected draft listing after operator review.",
      "Restore title, price, inventory, and collection fields from the latest approved ENTRAL product draft.",
      ...generic
    ];
  }

  if (provider === "printify" || provider === "printful") {
    return [
      "Archive the provider draft product and preserve the provider draft id for audit.",
      "Remove uploaded artifact references only after matching the approved artifact slot hash.",
      ...generic,
      ...(pack ? [`Re-check ${pack.requestManifests.length} locked request manifest${pack.requestManifests.length === 1 ? "" : "s"} before any retry.`] : [])
    ];
  }

  if (provider === "youtube" || provider === "tiktok" || provider === "instagram") {
    return [
      "Delete or private the affected draft/upload only after channel owner approval.",
      "Revert content brief status to internal review and preserve upload evidence.",
      ...generic
    ];
  }

  return generic;
}

function relatedManifests(signalPlan: RevenueSignalConnectorApprovalPlan, storeId: string) {
  return signalPlan.connectorPlan.manifests.filter((manifest) => (
    manifest.target.storeId === storeId || manifest.provider === "stripe"
  ));
}

function relatedApprovals(signalPlan: RevenueSignalConnectorApprovalPlan, storeId: string) {
  return signalPlan.approvals.filter((approval) => (
    approval.storeId === storeId || approval.provider === "stripe"
  ));
}

function relatedImportJobs(signalPlan: RevenueSignalConnectorApprovalPlan, approvals: RevenueSignalConnectorApprovalRecordSnapshot[]) {
  const approvalIds = new Set(approvals.map((approval) => approval.id));

  return signalPlan.importJobs.filter((job) => approvalIds.has(job.approvalId));
}

function approvedReadOnly(approval: RevenueSignalConnectorApprovalRecordSnapshot) {
  return approval.status === "approved" || approval.status === "import_queued";
}

function boundaryReadiness(input: {
  approval: RevenueSignalConnectorApprovalRecordSnapshot | null;
  manifest: RevenueSignalConnectorManifest | null;
  readyForDesign: boolean;
}): RevenueLiveConnectorBoundary["readiness"] {
  if (input.readyForDesign && input.approval && approvedReadOnly(input.approval)) return "design_review_ready";
  if (input.approval && approvedReadOnly(input.approval)) return "approved_readonly";
  if (input.manifest) return "needs_approval";

  return "missing_manifest";
}

function boundaryFor(input: {
  approval: RevenueSignalConnectorApprovalRecordSnapshot | null;
  manifest: RevenueSignalConnectorManifest | null;
  pack: RevenueLaunchOperationsPack | null;
  provider: RevenueSignalConnectorProvider | "other";
  readyForDesign: boolean;
}): RevenueLiveConnectorBoundary {
  const manifest = input.manifest;
  const approval = input.approval;
  const provider = input.provider;
  const providerName = manifest?.providerName ?? approval?.providerName ?? providerNames[provider];
  const readOnlyScopes = manifest?.readOnlyScopes ?? approval?.readOnlyScopes ?? [];
  const endpointTemplates = unique([
    ...(manifest?.endpointTemplates ?? approval?.endpointTemplates ?? []),
    ...((input.pack?.requestManifests ?? [])
      .filter((requestManifest) => normalizeProvider(requestManifest.provider) === provider)
      .map((requestManifest) => `${requestManifest.action} ${requestManifest.pathTemplate}`))
  ]);

  return {
    approvalGates: [
      "Approved read-only connector manifest or explicit manual evidence exemption",
      "Credential custodian review with scoped environment variable names only",
      "Connector design review with dry-run and idempotency evidence",
      "Rollback runbook review before any future live write approval"
    ],
    blockedExternalActions,
    credentialEnvVars: unique([
      ...(manifest?.credentialEnvVars ?? approval?.credentialEnvVars ?? []),
      ...liveCredentialEnvVars[provider]
    ]),
    endpointTemplates,
    externalExecution: false,
    futureLiveScopes: futureLiveScopes[provider],
    lane: manifest?.lane ?? approval?.lane ?? laneFor(provider),
    liveMode: "blocked_until_operator_design_approval",
    provider,
    providerContacted: false,
    providerName,
    readOnlyScopes,
    readiness: boundaryReadiness({
      approval,
      manifest,
      readyForDesign: input.readyForDesign
    }),
    role: roleFor(provider),
    rollbackControls: rollbackControls(provider, input.pack)
  };
}

function providersFor(input: {
  approvals: RevenueSignalConnectorApprovalRecordSnapshot[];
  manifests: RevenueSignalConnectorManifest[];
  pack: RevenueLaunchOperationsPack | null;
}) {
  const providers = unique([
    ...input.manifests.map((manifest) => manifest.provider),
    ...input.approvals.map((approval) => approval.provider),
    ...(input.pack?.operatorBrief.providers ?? []),
    ...((input.pack?.requestManifests ?? []).map((requestManifest) => requestManifest.provider)),
    "stripe"
  ]).map(normalizeProvider);

  return Array.from(new Set(providers));
}

function baseBlockers(input: {
  approvals: RevenueSignalConnectorApprovalRecordSnapshot[];
  closureEntry: RevenueLaunchClosureLedgerEntry;
  importJobs: RevenueSignalImportJobSnapshot[];
  options: RevenueLiveConnectorReadinessOptions;
  pack: RevenueLaunchOperationsPack | null;
}) {
  const blockers: RevenueLiveConnectorReadinessEntry["blockers"] = [...input.closureEntry.blockers];
  const approvedConnectors = input.approvals.filter(approvedReadOnly).length;

  if (input.closureEntry.status === "blocked") {
    blockers.push({
      code: "closure_blocked",
      severity: "high",
      title: "Launch closure ledger is blocked."
    });
  }

  if (input.closureEntry.closureScore < input.options.minClosureScore) {
    blockers.push({
      code: "closure_score",
      severity: "medium",
      title: `Closure score ${input.closureEntry.closureScore}/100 is below the ${input.options.minClosureScore}/100 connector design threshold.`
    });
  }

  if (input.options.requireOperationsPackAudit && !input.pack?.auditTrail.handoffPacketAuditLogId && !input.pack?.auditTrail.handoffPacketId) {
    blockers.push({
      code: "operations_pack_audit",
      severity: "medium",
      title: "Launch operations pack audit trail is missing."
    });
  }

  if (input.options.requirePerformanceEvidence && input.closureEntry.performanceEvidence.snapshots <= 0) {
    blockers.push({
      code: "performance_evidence",
      severity: "medium",
      title: "At least one internal performance snapshot is required before live connector design review."
    });
  }

  if (approvedConnectors < input.options.minReadOnlyConnectors) {
    blockers.push({
      code: "readonly_approval",
      severity: "medium",
      title: `${input.options.minReadOnlyConnectors} approved read-only connector${input.options.minReadOnlyConnectors === 1 ? "" : "s"} required before live connector design review.`
    });
  }

  if (input.importJobs.some((job) => job.status === "blocked_review")) {
    blockers.push({
      code: "blocked_import_job",
      severity: "medium",
      title: "A related read-only import job is blocked for review."
    });
  }

  return blockers;
}

function statusFor(input: {
  approvedConnectors: number;
  blockers: RevenueLiveConnectorReadinessEntry["blockers"];
  closureEntry: RevenueLaunchClosureLedgerEntry;
  options: RevenueLiveConnectorReadinessOptions;
}): RevenueLiveConnectorReadinessStatus {
  if (input.blockers.some((blocker) => blocker.severity === "high") || input.closureEntry.status === "blocked") return "blocked";
  if (input.approvedConnectors < input.options.minReadOnlyConnectors) return "needs_readonly_approval";
  if (input.blockers.length > 0 || input.closureEntry.manualReview.state !== "ready") return "needs_operator_review";

  return "ready_for_design";
}

function actionFor(status: RevenueLiveConnectorReadinessStatus): RevenueLiveConnectorReadinessAction {
  if (status === "blocked") return "resolve_launch_blockers";
  if (status === "needs_readonly_approval") return "queue_readonly_approvals";
  if (status === "needs_operator_review") return "review_live_boundary";

  return "record_connector_design_readiness";
}

function readinessScore(input: {
  approvedConnectors: number;
  closureEntry: RevenueLaunchClosureLedgerEntry;
  pack: RevenueLaunchOperationsPack | null;
}) {
  const closurePoints = input.closureEntry.closureScore * 0.55;
  const connectorPoints = Math.min(20, input.approvedConnectors * 12);
  const auditPoints = input.pack?.auditTrail.handoffPacketAuditLogId || input.pack?.auditTrail.handoffPacketId ? 10 : 0;
  const performancePoints = input.closureEntry.performanceEvidence.snapshots > 0 ? 10 : 0;
  const manualReviewPoints = input.closureEntry.manualReview.state === "ready" ? 5 : 0;
  const score = closurePoints + connectorPoints + auditPoints + performancePoints + manualReviewPoints;

  return clamp(Math.round(score), 1, 100);
}

function approvalGates(input: {
  approvedConnectors: number;
  closureEntry: RevenueLaunchClosureLedgerEntry;
  options: RevenueLiveConnectorReadinessOptions;
  pack: RevenueLaunchOperationsPack | null;
}): RevenueLiveConnectorReadinessEntry["approvalGates"] {
  return [{
    evidenceRequired: ["Launch closure scorecard", "Manual review state", "Outstanding blocker summary"],
    gate: "Launch Closure Ledger",
    status: input.closureEntry.status === "blocked" || input.closureEntry.closureScore < input.options.minClosureScore ? "blocked" : "ready"
  }, {
    evidenceRequired: ["Handoff packet id", "Operations pack audit id", "Locked request manifests"],
    gate: "Launch Operations Pack Audit",
    status: input.pack?.auditTrail.handoffPacketAuditLogId || input.pack?.auditTrail.handoffPacketId ? "ready" : "pending"
  }, {
    evidenceRequired: ["Approved read-only connector record", "Read-only scopes", "Sample transform preview"],
    gate: "Read-Only Connector Evidence",
    status: input.approvedConnectors >= input.options.minReadOnlyConnectors ? "ready" : "pending"
  }, {
    evidenceRequired: ["Credential env var names", "Future write-scope list", "Endpoint dry-run plan", "Rollback controls"],
    gate: "Live Connector Design Review",
    status: "pending"
  }];
}

function buildEntry(input: {
  closureEntry: RevenueLaunchClosureLedgerEntry;
  operationsPackPlan: RevenueLaunchOperationsPackPlan;
  options: RevenueLiveConnectorReadinessOptions;
  signalApprovalPlan: RevenueSignalConnectorApprovalPlan;
}): RevenueLiveConnectorReadinessEntry {
  const pack = input.operationsPackPlan.packs.find((item) => item.storeId === input.closureEntry.storeId) ?? null;
  const manifests = relatedManifests(input.signalApprovalPlan, input.closureEntry.storeId);
  const approvals = relatedApprovals(input.signalApprovalPlan, input.closureEntry.storeId);
  const importJobs = relatedImportJobs(input.signalApprovalPlan, approvals);
  const approvedConnectors = approvals.filter(approvedReadOnly).length;
  const blockers = baseBlockers({
    approvals,
    closureEntry: input.closureEntry,
    importJobs,
    options: input.options,
    pack
  });
  const status = statusFor({
    approvedConnectors,
    blockers,
    closureEntry: input.closureEntry,
    options: input.options
  });
  const score = readinessScore({
    approvedConnectors,
    closureEntry: input.closureEntry,
    pack
  });
  const providers = providersFor({
    approvals,
    manifests,
    pack
  });
  const readyForDesign = status === "ready_for_design";
  const connectorBoundaries = providers.map((provider) => {
    const manifest = manifests.find((item) => item.provider === provider) ?? null;
    const approval = approvals.find((item) => item.provider === provider) ?? null;

    return boundaryFor({
      approval,
      manifest,
      pack,
      provider,
      readyForDesign
    });
  });
  const rollback = unique(connectorBoundaries.flatMap((boundary) => boundary.rollbackControls));
  const action = actionFor(status);

  return {
    action,
    approvalGates: approvalGates({
      approvedConnectors,
      closureEntry: input.closureEntry,
      options: input.options,
      pack
    }),
    blockers,
    closure: {
      expectedFirstWeekRevenue: input.closureEntry.expectedFirstWeekRevenue.target,
      performanceSnapshots: input.closureEntry.performanceEvidence.snapshots,
      score: input.closureEntry.closureScore,
      status: input.closureEntry.status
    },
    connectorBoundaries,
    externalExecution: false,
    operationsPack: {
      artifactSlots: pack?.artifactSlots.length ?? input.closureEntry.launchPack.artifactSlots,
      auditReady: Boolean(pack?.auditTrail.handoffPacketAuditLogId || pack?.auditTrail.handoffPacketId || input.closureEntry.launchPack.auditReady),
      credentialScopes: unique(pack?.credentialScopes ?? []),
      manualSteps: pack?.manualSteps.length ?? input.closureEntry.launchPack.manualSteps,
      providers: unique(pack?.operatorBrief.providers ?? connectorBoundaries.map((boundary) => boundary.providerName)),
      requestManifests: pack?.requestManifests.length ?? input.closureEntry.launchPack.requestManifests,
      status: pack?.status ?? input.closureEntry.launchPack.packStatus
    },
    priority: score + (status === "ready_for_design" ? 30 : status === "needs_operator_review" ? 12 : status === "needs_readonly_approval" ? 6 : 0),
    providerContacted: false,
    readinessScore: score,
    readOnlyEvidence: {
      approvedConnectors,
      importJobsQueued: importJobs.length,
      manifestIds: manifests.map((manifest) => manifest.id),
      pendingApprovals: approvals.filter((approval) => approval.status === "pending_review").length,
      readyManifests: manifests.filter((manifest) => manifest.status === "ready_for_approval").length,
      requiredConnectors: input.options.minReadOnlyConnectors
    },
    rollbackControls: rollback,
    status,
    storeId: input.closureEntry.storeId,
    storeName: input.closureEntry.storeName,
    summary: status === "ready_for_design"
      ? `${input.closureEntry.storeName} is ready for internal live connector design review; live execution remains locked.`
      : `${input.closureEntry.storeName} requires ${action.replace(/_/g, " ")} before live connector design review.`
  };
}

export function buildRevenueLiveConnectorReadinessRegistryPlan(input: PlanInput): RevenueLiveConnectorReadinessRegistryPlan {
  const options = optionsWithDefaults(input.options);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const entries = input.closureLedgerPlan.entries
    .map((closureEntry) => buildEntry({
      closureEntry,
      operationsPackPlan: input.operationsPackPlan,
      options,
      signalApprovalPlan: input.signalApprovalPlan
    }))
    .filter((entry) => options.includeBlocked || entry.status !== "blocked")
    .sort((a, b) => b.priority - a.priority || b.readinessScore - a.readinessScore)
    .slice(0, options.maxEntries);
  const totals = entries.reduce((accumulator, entry) => {
    accumulator.approvedReadOnlyConnectors += entry.readOnlyEvidence.approvedConnectors;
    accumulator.requiredBoundaries += entry.connectorBoundaries.length;
    if (entry.status === "blocked") accumulator.blockedEntries += 1;
    if (entry.status === "needs_readonly_approval") accumulator.needsReadOnlyApproval += 1;
    if (entry.status === "needs_operator_review") accumulator.needsOperatorReview += 1;
    if (entry.status === "ready_for_design") accumulator.readyForDesign += 1;

    return accumulator;
  }, {
    approvedReadOnlyConnectors: 0,
    blockedEntries: 0,
    entries: entries.length,
    needsOperatorReview: 0,
    needsReadOnlyApproval: 0,
    readyForDesign: 0,
    requiredBoundaries: 0
  });

  return {
    auditEvents: [
      "Revenue Live Connector Readiness Registry mapped launch closure, operations pack, read-only connector approval, credential, scope, endpoint, and rollback requirements.",
      "Ready entries authorize connector design review only; they do not authorize credentials, OAuth, write scopes, browser sessions, provider calls, uploads, publishing, payouts, or imports.",
      "Apply mode records selected registry entries as internal audit artifacts without changing external systems."
    ],
    blockedExternalActions: unique([
      ...input.closureLedgerPlan.blockedExternalActions,
      ...input.operationsPackPlan.blockedExternalActions,
      ...input.signalApprovalPlan.blockedExternalActions,
      ...blockedExternalActions,
      ...entries.flatMap((entry) => entry.connectorBoundaries.flatMap((boundary) => boundary.blockedExternalActions))
    ]),
    entries,
    externalExecution: false,
    generatedAt,
    mode: "Internal Revenue Live Connector Readiness Registry",
    options,
    providerContacted: false,
    queue: entries.map((entry) => ({
      action: entry.action,
      externalExecution: false,
      priority: entry.priority,
      providerContacted: false,
      readinessScore: entry.readinessScore,
      status: entry.status,
      storeId: entry.storeId,
      storeName: entry.storeName,
      summary: entry.summary
    })),
    summary: entries.length === 0
      ? "No stores matched the live connector readiness registry filters."
      : `${entries.length} live connector readiness entr${entries.length === 1 ? "y" : "ies"} prepared; ${totals.readyForDesign} ready for design review, ${totals.needsReadOnlyApproval} need read-only approval, ${totals.needsOperatorReview} need operator review, ${totals.blockedEntries} blocked.`,
    totals
  };
}

export function selectRevenueLiveConnectorReadinessEntries(plan: RevenueLiveConnectorReadinessRegistryPlan, storeIds: string[] = []) {
  const selected = new Set(storeIds.filter(Boolean));

  if (selected.size === 0) return plan.entries;

  return plan.entries.filter((entry) => selected.has(entry.storeId));
}
