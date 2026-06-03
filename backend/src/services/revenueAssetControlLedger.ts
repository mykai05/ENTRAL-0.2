import type {
  RevenueAssetControlPlan,
  RevenueAssetPortfolio,
  RevenueAssetRotationDecision,
  RevenueAssetScore,
  RevenueAssetScoreBand
} from "./revenueEngine.js";

export type RevenueAssetControlRecordSnapshot = {
  assetId: string;
  assetName: string;
  assetScore: RevenueAssetScore["assetScore"];
  assetType: RevenueAssetScore["assetType"];
  auditLogId: string | null;
  auditOnly: boolean;
  control: Record<string, unknown>;
  createdAt: string;
  externalExecution: false;
  fromStatus: string | null;
  id: string;
  nextInternalState: string | null;
  override: boolean;
  providerContacted: false;
  reason: string;
  requestedAction: RevenueAssetRotationDecision;
  riskLevel: RevenueAssetScore["riskLevel"];
  scoreBand: RevenueAssetScoreBand;
  scoringRecommendation: RevenueAssetRotationDecision;
  statusChangeRequired: boolean;
  storeId: string | null;
  storeName: string;
  toStatus: string | null;
  updatedAt: string;
  warnings: string[];
};

export type RevenueAssetControlLedgerPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Engine Asset Control Ledger";
  providerContacted: false;
  records: RevenueAssetControlRecordSnapshot[];
  summary: string;
  totals: {
    auditOnly: number;
    kill: number;
    overrides: number;
    pause: number;
    records: number;
    scale: number;
    statusChanges: number;
    watch: number;
  };
};

export type RevenueAssetControlRecoveryState =
  | "already_current"
  | "audit_only"
  | "manual_review"
  | "missing_asset"
  | "ready_to_replay"
  | "stale_score";

export type RevenueAssetControlRecoveryItem = {
  ageDays: number;
  assetId: string;
  assetName: string;
  assetType: RevenueAssetScore["assetType"];
  auditLogId: string | null;
  canReplay: boolean;
  createdAt: string;
  currentFinalRank: number | null;
  currentRecommendation: RevenueAssetRotationDecision | null;
  currentState: string | null;
  latestFinalRank: number;
  nextInternalState: string | null;
  reason: string;
  recordId: string;
  requestedAction: RevenueAssetRotationDecision;
  requiresOperatorReview: boolean;
  riskTier: "low" | "medium" | "high";
  scoreDelta: number | null;
  scoringRecommendation: RevenueAssetRotationDecision;
  state: RevenueAssetControlRecoveryState;
  targetState: string | null;
  warnings: string[];
};

export type RevenueAssetControlRecoveryPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Engine Asset Control Recovery";
  providerContacted: false;
  recoveryQueue: RevenueAssetControlRecoveryItem[];
  summary: string;
  totals: {
    alreadyCurrent: number;
    auditOnly: number;
    items: number;
    manualReview: number;
    missingAssets: number;
    readyToReplay: number;
    staleScore: number;
  };
};

export const revenueAssetControlLedgerBlockedActions = [
  "Executing provider, marketplace, POD, ad, social, payment, bank, payout, upload, browser, proxy, or external write actions",
  "Treating an internal scale/watch/pause/kill record as authorization to spend money, publish listings, upload content, or move funds",
  "Using stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, CAPTCHA bypass, or platform-evasion automation"
];

function normalizeAction(value: string): RevenueAssetRotationDecision {
  if (value === "scale" || value === "watch" || value === "pause" || value === "kill") {
    return value;
  }

  return "watch";
}

function normalizeScoreBand(value: string): RevenueAssetScoreBand {
  if (value === "excellent" || value === "healthy" || value === "watch" || value === "weak" || value === "critical") {
    return value;
  }

  return "watch";
}

function normalizeRiskLevel(value: string): RevenueAssetScore["riskLevel"] {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  return "medium";
}

function scorePart(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

export function normalizeRevenueAssetControlRecord(input: {
  assetId: string;
  assetName: string;
  assetType: string;
  auditLogId?: string | null;
  auditOnly: boolean;
  control?: Record<string, unknown>;
  createdAt?: string;
  economicsScore: number;
  externalExecution?: boolean;
  finalRank: number;
  fromStatus?: string | null;
  id?: string;
  nextInternalState?: string | null;
  override: boolean;
  providerContacted?: boolean;
  readinessScore: number;
  reason: string;
  requestedAction: string;
  riskLevel: string;
  riskPenalty: number;
  scoreBand: string;
  scoringRecommendation: string;
  statusChangeRequired: boolean;
  storeId?: string | null;
  storeName: string;
  toStatus?: string | null;
  updatedAt?: string;
  velocity: number;
  warnings?: string[];
}): RevenueAssetControlRecordSnapshot {
  return {
    assetId: input.assetId,
    assetName: input.assetName,
    assetScore: {
      economicsScore: scorePart(input.economicsScore),
      finalRank: scorePart(input.finalRank),
      readinessScore: scorePart(input.readinessScore),
      riskPenalty: scorePart(input.riskPenalty),
      velocity: scorePart(input.velocity)
    },
    assetType: input.assetType === "store" ? "store" : "product",
    auditLogId: input.auditLogId ?? null,
    auditOnly: input.auditOnly,
    control: input.control ?? {},
    createdAt: input.createdAt ?? new Date().toISOString(),
    externalExecution: false,
    fromStatus: input.fromStatus ?? null,
    id: input.id ?? `${input.assetType}:${input.assetId}:${input.createdAt ?? "control"}`,
    nextInternalState: input.nextInternalState ?? null,
    override: input.override,
    providerContacted: false,
    reason: input.reason,
    requestedAction: normalizeAction(input.requestedAction),
    riskLevel: normalizeRiskLevel(input.riskLevel),
    scoreBand: normalizeScoreBand(input.scoreBand),
    scoringRecommendation: normalizeAction(input.scoringRecommendation),
    statusChangeRequired: input.statusChangeRequired,
    storeId: input.storeId ?? null,
    storeName: input.storeName,
    toStatus: input.toStatus ?? null,
    updatedAt: input.updatedAt ?? input.createdAt ?? new Date().toISOString(),
    warnings: input.warnings ?? []
  };
}

export function revenueAssetControlRecordFromPlan(input: {
  auditLogId?: string | null;
  control: RevenueAssetControlPlan;
  createdAt?: string;
  id?: string;
}): RevenueAssetControlRecordSnapshot {
  const score = input.control.asset.assetScore;

  return normalizeRevenueAssetControlRecord({
    assetId: input.control.asset.assetId,
    assetName: input.control.asset.assetName,
    assetType: input.control.asset.assetType,
    auditLogId: input.auditLogId ?? null,
    auditOnly: input.control.auditOnly,
    control: input.control as unknown as Record<string, unknown>,
    createdAt: input.createdAt,
    economicsScore: score.economicsScore,
    finalRank: score.finalRank,
    fromStatus: input.control.change?.fromStatus ?? input.control.asset.readiness.status,
    id: input.id,
    nextInternalState: input.control.nextInternalState,
    override: input.control.requestedAction !== input.control.asset.recommendation,
    readinessScore: score.readinessScore,
    reason: input.control.reason,
    requestedAction: input.control.requestedAction,
    riskLevel: input.control.asset.riskLevel,
    riskPenalty: score.riskPenalty,
    scoreBand: input.control.asset.scoreBand,
    scoringRecommendation: input.control.asset.recommendation,
    statusChangeRequired: input.control.statusChangeRequired,
    storeId: input.control.asset.storeId,
    storeName: input.control.asset.storeName,
    toStatus: input.control.change?.toStatus ?? input.control.nextInternalState,
    velocity: score.velocity,
    warnings: input.control.warnings
  });
}

export function buildRevenueAssetControlLedgerPlan(input: {
  generatedAt?: string;
  records?: RevenueAssetControlRecordSnapshot[];
}): RevenueAssetControlLedgerPlan {
  const records = [...(input.records ?? [])].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const count = (action: RevenueAssetRotationDecision) => records.filter((record) => record.requestedAction === action).length;
  const overrides = records.filter((record) => record.override).length;
  const statusChanges = records.filter((record) => record.statusChangeRequired).length;
  const auditOnly = records.filter((record) => record.auditOnly).length;

  return {
    auditEvents: [
      "Revenue asset control ledger generated from persisted internal scale/watch/pause/kill decisions.",
      "Records are internal decision evidence only; they do not execute external provider, spend, upload, payout, or browser actions."
    ],
    blockedExternalActions: revenueAssetControlLedgerBlockedActions,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Revenue Engine Asset Control Ledger",
    providerContacted: false,
    records,
    summary: `${records.length} asset control decision${records.length === 1 ? "" : "s"} recorded. ${count("scale")} scale, ${count("watch")} watch, ${count("pause")} pause, ${count("kill")} kill, ${statusChanges} status change${statusChanges === 1 ? "" : "s"}, and ${overrides} override${overrides === 1 ? "" : "s"} are in the internal ledger.`,
    totals: {
      auditOnly,
      kill: count("kill"),
      overrides,
      pause: count("pause"),
      records: records.length,
      scale: count("scale"),
      statusChanges,
      watch: count("watch")
    }
  };
}

function assetKey(input: Pick<RevenueAssetControlRecordSnapshot, "assetId" | "assetType"> | Pick<RevenueAssetScore, "assetId" | "assetType">) {
  return `${input.assetType}:${input.assetId}`;
}

function ageDays(createdAt: string, generatedAt: string) {
  const created = new Date(createdAt).getTime();
  const generated = new Date(generatedAt).getTime();

  if (!Number.isFinite(created) || !Number.isFinite(generated)) {
    return 0;
  }

  return Math.max(0, Math.floor((generated - created) / 86_400_000));
}

function recoveryPriority(state: RevenueAssetControlRecoveryState) {
  switch (state) {
    case "missing_asset":
      return 0;
    case "stale_score":
      return 1;
    case "manual_review":
      return 2;
    case "ready_to_replay":
      return 3;
    case "audit_only":
      return 4;
    case "already_current":
      return 5;
  }
}

function recoveryRiskTier(input: {
  asset?: RevenueAssetScore;
  record: RevenueAssetControlRecordSnapshot;
  state: RevenueAssetControlRecoveryState;
}): RevenueAssetControlRecoveryItem["riskTier"] {
  if (input.state === "missing_asset" || input.state === "manual_review" || input.record.requestedAction === "kill") {
    return "high";
  }

  if (input.state === "stale_score" || input.record.override || input.asset?.riskLevel === "high" || input.record.riskLevel === "high") {
    return "medium";
  }

  return "low";
}

function recoveryReason(input: {
  age: number;
  asset?: RevenueAssetScore;
  record: RevenueAssetControlRecordSnapshot;
  scoreDelta: number | null;
  state: RevenueAssetControlRecoveryState;
}) {
  if (input.state === "missing_asset") {
    return "The ledger record points to an asset that is no longer present in the current portfolio.";
  }

  if (input.state === "stale_score") {
    return `The current score or recommendation changed since this decision was recorded; refresh scoring before replay. Age ${input.age} day${input.age === 1 ? "" : "s"}, score delta ${input.scoreDelta ?? 0}.`;
  }

  if (input.state === "already_current") {
    return "The asset already matches the ledger target state, so no replay is needed.";
  }

  if (input.state === "manual_review") {
    return "This decision is high-risk or an override and should be reviewed before any internal status replay.";
  }

  if (input.state === "audit_only") {
    return "This ledger decision was audit-only and has no internal status change to replay.";
  }

  return "The latest score still matches the ledger decision and the internal status change can be replayed after operator approval.";
}

function recoveryStateFor(input: {
  age: number;
  asset?: RevenueAssetScore;
  record: RevenueAssetControlRecordSnapshot;
  scoreDelta: number | null;
  staleAfterDays: number;
}): RevenueAssetControlRecoveryState {
  if (!input.asset) {
    return "missing_asset";
  }

  if (
    input.age >= input.staleAfterDays
    || input.record.scoringRecommendation !== input.asset.recommendation
    || (input.scoreDelta !== null && input.scoreDelta > 10)
  ) {
    return "stale_score";
  }

  const targetState = input.record.toStatus ?? input.record.nextInternalState;

  if (targetState && input.asset.readiness.status === targetState) {
    return "already_current";
  }

  if (input.record.override || input.record.riskLevel === "high" || input.record.requestedAction === "kill") {
    return "manual_review";
  }

  if (input.record.auditOnly || !input.record.statusChangeRequired) {
    return "audit_only";
  }

  return "ready_to_replay";
}

export function buildRevenueAssetControlRecoveryPlan(input: {
  generatedAt?: string;
  includeResolved?: boolean;
  ledger: RevenueAssetControlLedgerPlan;
  limit?: number;
  portfolio: RevenueAssetPortfolio;
  staleAfterDays?: number;
}): RevenueAssetControlRecoveryPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const staleAfterDays = Math.max(1, Math.round(input.staleAfterDays ?? 14));
  const assetByKey = new Map(input.portfolio.assets.map((asset) => [assetKey(asset), asset]));
  const latestByAsset = new Map<string, RevenueAssetControlRecordSnapshot>();

  for (const record of input.ledger.records) {
    const key = assetKey(record);

    if (!latestByAsset.has(key)) {
      latestByAsset.set(key, record);
    }
  }

  const recoveryQueue = [...latestByAsset.values()]
    .map((record) => {
      const asset = assetByKey.get(assetKey(record));
      const age = ageDays(record.createdAt, generatedAt);
      const scoreDelta = asset ? Math.abs(asset.assetScore.finalRank - record.assetScore.finalRank) : null;
      const state = recoveryStateFor({
        age,
        asset,
        record,
        scoreDelta,
        staleAfterDays
      });
      const riskTier = recoveryRiskTier({ asset, record, state });
      const targetState = record.toStatus ?? record.nextInternalState;

      return {
        ageDays: age,
        assetId: record.assetId,
        assetName: asset?.assetName ?? record.assetName,
        assetType: record.assetType,
        auditLogId: record.auditLogId,
        canReplay: state === "ready_to_replay",
        createdAt: record.createdAt,
        currentFinalRank: asset?.assetScore.finalRank ?? null,
        currentRecommendation: asset?.recommendation ?? null,
        currentState: asset?.readiness.status ?? null,
        latestFinalRank: record.assetScore.finalRank,
        nextInternalState: targetState,
        reason: recoveryReason({ age, asset, record, scoreDelta, state }),
        recordId: record.id,
        requestedAction: record.requestedAction,
        requiresOperatorReview: state === "manual_review" || state === "missing_asset" || state === "stale_score",
        riskTier,
        scoreDelta,
        scoringRecommendation: record.scoringRecommendation,
        state,
        targetState,
        warnings: record.warnings
      };
    })
    .filter((item) => input.includeResolved || item.state !== "already_current")
    .sort((left, right) => {
      const priorityDelta = recoveryPriority(left.state) - recoveryPriority(right.state);
      return priorityDelta !== 0 ? priorityDelta : right.createdAt.localeCompare(left.createdAt);
    })
    .slice(0, Math.max(1, Math.round(input.limit ?? 50)));

  const count = (state: RevenueAssetControlRecoveryState) => recoveryQueue.filter((item) => item.state === state).length;

  return {
    auditEvents: [
      "Revenue asset control recovery generated from current scoring and the latest internal asset-control ledger record per asset.",
      "Recovery items are replay intelligence only; operator approval is still required before internal status changes."
    ],
    blockedExternalActions: revenueAssetControlLedgerBlockedActions,
    externalExecution: false,
    generatedAt,
    mode: "Revenue Engine Asset Control Recovery",
    providerContacted: false,
    recoveryQueue,
    summary: `${recoveryQueue.length} asset-control recover${recoveryQueue.length === 1 ? "y item" : "y items"} evaluated: ${count("ready_to_replay")} ready to replay, ${count("manual_review")} manual review, ${count("stale_score")} stale score, ${count("already_current")} already current, ${count("missing_asset")} missing asset${count("missing_asset") === 1 ? "" : "s"}.`,
    totals: {
      alreadyCurrent: count("already_current"),
      auditOnly: count("audit_only"),
      items: recoveryQueue.length,
      manualReview: count("manual_review"),
      missingAssets: count("missing_asset"),
      readyToReplay: count("ready_to_replay"),
      staleScore: count("stale_score")
    }
  };
}
