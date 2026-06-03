import type {
  RevenueLiveConnectorBoundary,
  RevenueLiveConnectorReadinessEntry,
  RevenueLiveConnectorReadinessRegistryPlan
} from "./revenueLiveConnectorReadinessRegistry.js";

export const revenueLiveConnectorDesignDossierConfirmation = "RECORD INTERNAL LIVE CONNECTOR DESIGN DOSSIERS";

export type RevenueLiveConnectorDesignDossierStatus =
  | "blocked"
  | "needs_readiness_review"
  | "design_review_ready"
  | "final_operator_approval_ready";

export type RevenueLiveConnectorDesignDossierAction =
  | "resolve_readiness_blockers"
  | "review_readiness_registry"
  | "rehearse_connector_design"
  | "queue_final_operator_packet";

export type RevenueLiveConnectorDesignDossierOptions = {
  includeBlocked: boolean;
  includeCredentialCustody: boolean;
  includeRollbackRehearsal: boolean;
  maxDossiers: number;
  minReadinessScore: number;
  requireAllBoundariesMapped: boolean;
  requireApprovedReadOnlyEvidence: boolean;
};

export type RevenueLiveConnectorDryRunRequest = {
  action: string;
  bodyPlan: string[];
  executionMode: "dry_run_only";
  externalExecution: false;
  headers: Record<string, string>;
  idempotencyKey: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  pathTemplate: string;
  providerContacted: false;
  requestId: string;
  validationEvidence: string[];
};

export type RevenueLiveConnectorCredentialCustodyItem = {
  credentialEnvVar: string;
  evidenceRequired: string[];
  externalExecution: false;
  providerContacted: false;
  rotationPolicy: string;
  status: "pending_operator_review";
};

export type RevenueLiveConnectorRollbackRehearsal = {
  externalExecution: false;
  failureStopConditions: string[];
  providerContacted: false;
  rehearsalId: string;
  status: "pending_rehearsal";
  steps: string[];
  successCriteria: string[];
};

export type RevenueLiveConnectorFinalApprovalPacket = {
  approvalMode: "manual_only";
  decision: "pending_operator_approval";
  evidenceBundle: string[];
  externalExecution: false;
  goNoGoCriteria: string[];
  packetId: string;
  providerContacted: false;
  requiredApprovals: string[];
};

export type RevenueLiveConnectorBoundaryDossier = {
  approvalGates: string[];
  blockedExternalActions: string[];
  credentialCustodyChecklist: RevenueLiveConnectorCredentialCustodyItem[];
  dryRunRequestMap: RevenueLiveConnectorDryRunRequest[];
  externalExecution: false;
  finalApprovalPacket: RevenueLiveConnectorFinalApprovalPacket;
  futureLiveScopes: RevenueLiveConnectorBoundary["futureLiveScopes"];
  lane: RevenueLiveConnectorBoundary["lane"];
  liveMode: RevenueLiveConnectorBoundary["liveMode"];
  provider: RevenueLiveConnectorBoundary["provider"];
  providerContacted: false;
  providerName: string;
  readiness: RevenueLiveConnectorBoundary["readiness"];
  role: RevenueLiveConnectorBoundary["role"];
  rollbackRehearsal: RevenueLiveConnectorRollbackRehearsal | null;
};

export type RevenueLiveConnectorDesignDossierEntry = {
  action: RevenueLiveConnectorDesignDossierAction;
  approvalPackets: number;
  blockers: RevenueLiveConnectorReadinessEntry["blockers"];
  boundaryDossiers: RevenueLiveConnectorBoundaryDossier[];
  credentialCustodyItems: number;
  dryRunRequests: number;
  externalExecution: false;
  priority: number;
  providerContacted: false;
  readiness: {
    approvedReadOnlyConnectors: number;
    closureScore: number;
    expectedFirstWeekRevenue: number;
    readinessScore: number;
    registryStatus: RevenueLiveConnectorReadinessEntry["status"];
  };
  rollbackRehearsals: number;
  status: RevenueLiveConnectorDesignDossierStatus;
  storeId: string;
  storeName: string;
  summary: string;
};

export type RevenueLiveConnectorDesignDossierPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  entries: RevenueLiveConnectorDesignDossierEntry[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Revenue Live Connector Design Dossier";
  options: RevenueLiveConnectorDesignDossierOptions;
  providerContacted: false;
  queue: Array<{
    action: RevenueLiveConnectorDesignDossierAction;
    dryRunRequests: number;
    externalExecution: false;
    priority: number;
    providerContacted: false;
    status: RevenueLiveConnectorDesignDossierStatus;
    storeId: string;
    storeName: string;
    summary: string;
  }>;
  summary: string;
  totals: {
    approvalPackets: number;
    blockedDossiers: number;
    credentialCustodyItems: number;
    designReviewReady: number;
    dossiers: number;
    dryRunRequests: number;
    finalOperatorApprovalReady: number;
    needsReadinessReview: number;
    rollbackRehearsals: number;
  };
};

type PlanInput = {
  generatedAt?: string;
  options?: Partial<RevenueLiveConnectorDesignDossierOptions>;
  readinessRegistryPlan: RevenueLiveConnectorReadinessRegistryPlan;
};

const defaultOptions: RevenueLiveConnectorDesignDossierOptions = {
  includeBlocked: true,
  includeCredentialCustody: true,
  includeRollbackRehearsal: true,
  maxDossiers: 10,
  minReadinessScore: 80,
  requireAllBoundariesMapped: false,
  requireApprovedReadOnlyEvidence: true
};

const blockedExternalActions = [
  "Sending provider, marketplace, payment, social, AI, browser, webhook, OAuth, upload, publish, payout, transfer, ad, or storefront-change requests",
  "Reading, storing, printing, validating, or transmitting live credential values; only credential environment variable names may be recorded",
  "Creating write scopes, enabling live jobs, opening provider admin sessions, running stealth browsers, rotating proxies, spoofing fingerprints, bypassing CAPTCHA, warming accounts, or evading platform controls",
  "Treating final operator approval packets as live authorization; they are pending manual review artifacts only"
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function optionsWithDefaults(input: Partial<RevenueLiveConnectorDesignDossierOptions> = {}): RevenueLiveConnectorDesignDossierOptions {
  return {
    includeBlocked: input.includeBlocked ?? defaultOptions.includeBlocked,
    includeCredentialCustody: input.includeCredentialCustody ?? defaultOptions.includeCredentialCustody,
    includeRollbackRehearsal: input.includeRollbackRehearsal ?? defaultOptions.includeRollbackRehearsal,
    maxDossiers: clamp(Math.round(input.maxDossiers ?? defaultOptions.maxDossiers), 1, 50),
    minReadinessScore: clamp(Math.round(input.minReadinessScore ?? defaultOptions.minReadinessScore), 1, 100),
    requireAllBoundariesMapped: input.requireAllBoundariesMapped ?? defaultOptions.requireAllBoundariesMapped,
    requireApprovedReadOnlyEvidence: input.requireApprovedReadOnlyEvidence ?? defaultOptions.requireApprovedReadOnlyEvidence
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "dossier";
}

function shortHash(value: string) {
  let hash = 2166136261;

  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function statusFor(input: {
  boundaries: RevenueLiveConnectorBoundaryDossier[];
  entry: RevenueLiveConnectorReadinessEntry;
  options: RevenueLiveConnectorDesignDossierOptions;
}): RevenueLiveConnectorDesignDossierStatus {
  if (input.entry.status === "blocked" || input.entry.blockers.some((blocker) => blocker.severity === "high")) return "blocked";
  if (input.options.requireApprovedReadOnlyEvidence && input.entry.readOnlyEvidence.approvedConnectors < input.entry.readOnlyEvidence.requiredConnectors) {
    return "needs_readiness_review";
  }
  if (input.entry.readinessScore < input.options.minReadinessScore) return "needs_readiness_review";
  if (input.options.requireAllBoundariesMapped && input.boundaries.some((boundary) => boundary.readiness === "missing_manifest" || boundary.readiness === "needs_approval")) {
    return "needs_readiness_review";
  }
  if (input.entry.status === "ready_for_design" && input.boundaries.every((boundary) => boundary.dryRunRequestMap.length > 0 || boundary.role === "manual_import")) {
    return "final_operator_approval_ready";
  }

  return "design_review_ready";
}

function actionFor(status: RevenueLiveConnectorDesignDossierStatus): RevenueLiveConnectorDesignDossierAction {
  if (status === "blocked") return "resolve_readiness_blockers";
  if (status === "needs_readiness_review") return "review_readiness_registry";
  if (status === "design_review_ready") return "rehearse_connector_design";

  return "queue_final_operator_packet";
}

function parseEndpoint(template: string): {
  action: string;
  method: RevenueLiveConnectorDryRunRequest["method"];
  pathTemplate: string;
} {
  const normalized = template.trim();
  const explicit = normalized.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(.+)$/i);

  if (explicit) {
    return {
      action: explicit[1].toUpperCase(),
      method: explicit[1].toUpperCase() as RevenueLiveConnectorDryRunRequest["method"],
      pathTemplate: explicit[2].trim()
    };
  }

  const pathMatch = normalized.match(/(\/[^\s]+.*)$/);
  const action = normalized.replace(pathMatch?.[1] ?? "", "").trim() || "dry_run_request";
  const method = /create|upload|publish|payout|transfer|write|post/i.test(action) ? "POST" : "GET";

  return {
    action,
    method,
    pathTemplate: pathMatch?.[1]?.trim() || "Operator-provided reviewed payload"
  };
}

function dryRunRequests(input: {
  boundary: RevenueLiveConnectorBoundary;
  storeId: string;
  storeName: string;
}): RevenueLiveConnectorDryRunRequest[] {
  const endpoints = input.boundary.endpointTemplates.length > 0
    ? input.boundary.endpointTemplates
    : input.boundary.role === "manual_import" ? ["manual_review Operator-provided reviewed payload"] : [];

  return endpoints.map((endpoint, index) => {
    const parsed = parseEndpoint(endpoint);
    const requestSeed = `${input.storeId}:${input.boundary.provider}:${parsed.method}:${parsed.pathTemplate}:${index}`;

    return {
      action: parsed.action,
      bodyPlan: [
        "Build request body from the locked launch operations manifest only.",
        "Replace credential values with environment variable references before review.",
        "Attach artifact hash references instead of uploading files.",
        "Record expected response shape and rollback owner before any future live approval."
      ],
      executionMode: "dry_run_only",
      externalExecution: false,
      headers: {
        authorization: `<${input.boundary.credentialEnvVars[0] ?? "NO_CREDENTIAL_REQUIRED"}>`,
        "content-type": "application/json",
        "x-entral-dry-run": "true",
        "x-entral-store": slug(input.storeName)
      },
      idempotencyKey: `entral:connector-design:${slug(input.storeId)}:${slug(input.boundary.provider)}:${shortHash(requestSeed)}`,
      method: parsed.method,
      pathTemplate: parsed.pathTemplate,
      providerContacted: false,
      requestId: `dry_${slug(input.boundary.provider)}_${shortHash(requestSeed)}`,
      validationEvidence: [
        "Read-only connector approval record",
        "Locked operations pack request manifest",
        "Credential custody checklist",
        "Rollback rehearsal checklist",
        "Final operator approval packet"
      ]
    };
  });
}

function credentialCustody(boundary: RevenueLiveConnectorBoundary, enabled: boolean): RevenueLiveConnectorCredentialCustodyItem[] {
  if (!enabled) return [];

  return unique(boundary.credentialEnvVars).map((credentialEnvVar) => ({
    credentialEnvVar,
    evidenceRequired: [
      "Credential owner named in internal approval packet",
      "Least-privilege scope reviewed against future live scopes",
      "Rotation and revocation path documented",
      "No credential value stored in ENTRAL audit payloads"
    ],
    externalExecution: false,
    providerContacted: false,
    rotationPolicy: "Rotate before first approved live connector use and immediately after any failed rollback rehearsal.",
    status: "pending_operator_review" as const
  }));
}

function rollbackRehearsal(input: {
  boundary: RevenueLiveConnectorBoundary;
  enabled: boolean;
  storeId: string;
}): RevenueLiveConnectorRollbackRehearsal | null {
  if (!input.enabled) return null;

  const seed = `${input.storeId}:${input.boundary.provider}:rollback`;

  return {
    externalExecution: false,
    failureStopConditions: [
      "Rollback owner is missing or unavailable.",
      "Provider state cannot be reconciled against the locked request manifest.",
      "Credential revocation path is not documented.",
      "Financial, publishing, upload, or browser side effect would be required."
    ],
    providerContacted: false,
    rehearsalId: `rollback_${slug(input.boundary.provider)}_${shortHash(seed)}`,
    status: "pending_rehearsal",
    steps: [
      ...input.boundary.rollbackControls,
      "Run the rehearsal against the dry-run request map only.",
      "Record expected revert state, audit owner, and stop condition before final operator review."
    ],
    successCriteria: [
      "Every dry-run request has a matching rollback step.",
      "Credential revocation is possible without provider support tickets.",
      "No external system, browser session, upload, payout, listing, or social post is touched.",
      "Operator can freeze the connector queue from ENTRAL before retry."
    ]
  };
}

function finalApprovalPacket(input: {
  boundary: RevenueLiveConnectorBoundary;
  dryRunRequests: RevenueLiveConnectorDryRunRequest[];
  entry: RevenueLiveConnectorReadinessEntry;
}): RevenueLiveConnectorFinalApprovalPacket {
  const seed = `${input.entry.storeId}:${input.boundary.provider}:approval`;

  return {
    approvalMode: "manual_only",
    decision: "pending_operator_approval",
    evidenceBundle: unique([
      `Readiness registry status: ${input.entry.status}`,
      `Readiness score: ${input.entry.readinessScore}/100`,
      `Closure score: ${input.entry.closure.score}/100`,
      `${input.entry.readOnlyEvidence.approvedConnectors} approved read-only connector record(s)`,
      `${input.dryRunRequests.length} dry-run request map item(s)`,
      ...input.boundary.approvalGates
    ]),
    externalExecution: false,
    goNoGoCriteria: [
      "All dry-run request maps have idempotency keys and expected rollback steps.",
      "Credential custodian confirms environment variable names without exposing values.",
      "Financial, publishing, upload, social, browser, and provider write side effects remain disabled until a separate live execution approval exists.",
      "Operator signs the packet after reviewing blocked external actions."
    ],
    packetId: `operator_packet_${slug(input.boundary.provider)}_${shortHash(seed)}`,
    providerContacted: false,
    requiredApprovals: [
      "Connector design owner",
      "Credential custodian",
      "Rollback owner",
      "Revenue operator",
      input.boundary.role === "payments" ? "Financial Orchestrator reviewer" : "Launch operations reviewer"
    ]
  };
}

function boundaryDossier(input: {
  boundary: RevenueLiveConnectorBoundary;
  entry: RevenueLiveConnectorReadinessEntry;
  options: RevenueLiveConnectorDesignDossierOptions;
}): RevenueLiveConnectorBoundaryDossier {
  const requestMap = dryRunRequests({
    boundary: input.boundary,
    storeId: input.entry.storeId,
    storeName: input.entry.storeName
  });

  return {
    approvalGates: input.boundary.approvalGates,
    blockedExternalActions: input.boundary.blockedExternalActions,
    credentialCustodyChecklist: credentialCustody(input.boundary, input.options.includeCredentialCustody),
    dryRunRequestMap: requestMap,
    externalExecution: false,
    finalApprovalPacket: finalApprovalPacket({
      boundary: input.boundary,
      dryRunRequests: requestMap,
      entry: input.entry
    }),
    futureLiveScopes: input.boundary.futureLiveScopes,
    lane: input.boundary.lane,
    liveMode: input.boundary.liveMode,
    provider: input.boundary.provider,
    providerContacted: false,
    providerName: input.boundary.providerName,
    readiness: input.boundary.readiness,
    role: input.boundary.role,
    rollbackRehearsal: rollbackRehearsal({
      boundary: input.boundary,
      enabled: input.options.includeRollbackRehearsal,
      storeId: input.entry.storeId
    })
  };
}

function buildEntry(input: {
  entry: RevenueLiveConnectorReadinessEntry;
  options: RevenueLiveConnectorDesignDossierOptions;
}): RevenueLiveConnectorDesignDossierEntry {
  const boundaryDossiers = input.entry.connectorBoundaries.map((boundary) => boundaryDossier({
    boundary,
    entry: input.entry,
    options: input.options
  }));
  const status = statusFor({
    boundaries: boundaryDossiers,
    entry: input.entry,
    options: input.options
  });
  const action = actionFor(status);
  const dryRunRequestCount = boundaryDossiers.reduce((sum, boundary) => sum + boundary.dryRunRequestMap.length, 0);
  const credentialCustodyItems = boundaryDossiers.reduce((sum, boundary) => sum + boundary.credentialCustodyChecklist.length, 0);
  const rollbackRehearsals = boundaryDossiers.filter((boundary) => boundary.rollbackRehearsal).length;
  const approvalPackets = boundaryDossiers.length;

  return {
    action,
    approvalPackets,
    blockers: input.entry.blockers,
    boundaryDossiers,
    credentialCustodyItems,
    dryRunRequests: dryRunRequestCount,
    externalExecution: false,
    priority: input.entry.priority + (status === "final_operator_approval_ready" ? 30 : status === "design_review_ready" ? 16 : status === "needs_readiness_review" ? 6 : 0),
    providerContacted: false,
    readiness: {
      approvedReadOnlyConnectors: input.entry.readOnlyEvidence.approvedConnectors,
      closureScore: input.entry.closure.score,
      expectedFirstWeekRevenue: input.entry.closure.expectedFirstWeekRevenue,
      readinessScore: input.entry.readinessScore,
      registryStatus: input.entry.status
    },
    rollbackRehearsals,
    status,
    storeId: input.entry.storeId,
    storeName: input.entry.storeName,
    summary: status === "final_operator_approval_ready"
      ? `${input.entry.storeName} has provider-specific dry-run maps and pending final operator packets; live execution remains disabled.`
      : `${input.entry.storeName} needs ${action.replace(/_/g, " ")} before any final connector approval packet can be considered.`
  };
}

export function buildRevenueLiveConnectorDesignDossierPlan(input: PlanInput): RevenueLiveConnectorDesignDossierPlan {
  const options = optionsWithDefaults(input.options);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const entries = input.readinessRegistryPlan.entries
    .map((entry) => buildEntry({ entry, options }))
    .filter((entry) => options.includeBlocked || entry.status !== "blocked")
    .sort((a, b) => b.priority - a.priority || b.dryRunRequests - a.dryRunRequests)
    .slice(0, options.maxDossiers);
  const totals = entries.reduce((accumulator, entry) => {
    accumulator.approvalPackets += entry.approvalPackets;
    accumulator.credentialCustodyItems += entry.credentialCustodyItems;
    accumulator.dryRunRequests += entry.dryRunRequests;
    accumulator.rollbackRehearsals += entry.rollbackRehearsals;
    if (entry.status === "blocked") accumulator.blockedDossiers += 1;
    if (entry.status === "needs_readiness_review") accumulator.needsReadinessReview += 1;
    if (entry.status === "design_review_ready") accumulator.designReviewReady += 1;
    if (entry.status === "final_operator_approval_ready") accumulator.finalOperatorApprovalReady += 1;

    return accumulator;
  }, {
    approvalPackets: 0,
    blockedDossiers: 0,
    credentialCustodyItems: 0,
    designReviewReady: 0,
    dossiers: entries.length,
    dryRunRequests: 0,
    finalOperatorApprovalReady: 0,
    needsReadinessReview: 0,
    rollbackRehearsals: 0
  });

  return {
    auditEvents: [
      "Revenue Live Connector Design Dossier converted readiness-registry boundaries into provider-specific dry-run request maps, idempotency keys, credential custody checklists, rollback rehearsals, and pending final operator approval packets.",
      "Dossiers are design artifacts only; they do not authorize credentials, OAuth, write scopes, provider calls, browser sessions, uploads, publishing, payouts, transfers, ad spend, social posts, imports, or live jobs.",
      "Apply mode records selected dossiers as internal audit artifacts without contacting external systems."
    ],
    blockedExternalActions: unique([
      ...input.readinessRegistryPlan.blockedExternalActions,
      ...blockedExternalActions,
      ...entries.flatMap((entry) => entry.boundaryDossiers.flatMap((boundary) => boundary.blockedExternalActions))
    ]),
    entries,
    externalExecution: false,
    generatedAt,
    mode: "Internal Revenue Live Connector Design Dossier",
    options,
    providerContacted: false,
    queue: entries.map((entry) => ({
      action: entry.action,
      dryRunRequests: entry.dryRunRequests,
      externalExecution: false,
      priority: entry.priority,
      providerContacted: false,
      status: entry.status,
      storeId: entry.storeId,
      storeName: entry.storeName,
      summary: entry.summary
    })),
    summary: entries.length === 0
      ? "No readiness-registry entries matched the live connector design dossier filters."
      : `${entries.length} connector design dossier${entries.length === 1 ? "" : "s"} prepared with ${totals.dryRunRequests} dry-run request map item${totals.dryRunRequests === 1 ? "" : "s"}, ${totals.credentialCustodyItems} custody checklist item${totals.credentialCustodyItems === 1 ? "" : "s"}, ${totals.rollbackRehearsals} rollback rehearsal${totals.rollbackRehearsals === 1 ? "" : "s"}, and ${totals.approvalPackets} pending operator packet${totals.approvalPackets === 1 ? "" : "s"}.`,
    totals
  };
}

export function selectRevenueLiveConnectorDesignDossiers(plan: RevenueLiveConnectorDesignDossierPlan, storeIds: string[] = []) {
  const selected = new Set(storeIds.filter(Boolean));

  if (selected.size === 0) return plan.entries;

  return plan.entries.filter((entry) => selected.has(entry.storeId));
}
