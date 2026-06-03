import type { RevenueAssetControlLedgerPlan, RevenueAssetControlRecordSnapshot } from "./revenueAssetControlLedger.js";
import type { RevenueAssetPortfolio, RevenueAssetRotationDecision, RevenueAssetScore } from "./revenueEngine.js";

export type RevenueAssetReviewQueueTrigger =
  | "kill_risk"
  | "pause_risk"
  | "scale_ready"
  | "override_review"
  | "stale_review"
  | "no_control_history"
  | "watch_followup";

export type RevenueAssetReviewQueueState =
  | "resolve_override_against_current_score"
  | "queue_manual_scale_budget_review"
  | "pause_or_kill_asset"
  | "record_first_control_decision"
  | "collect_more_signal"
  | "keep_watching";

export type RevenueAssetReviewQueueControlHistory = {
  currentRecommendationChanged: boolean;
  latestActionAgeDays: number | null;
  latestOverride: boolean;
  latestRequestedAction: RevenueAssetRotationDecision | null;
  latestScoringRecommendation: RevenueAssetRotationDecision | null;
  latestStatusChangeRequired: boolean | null;
  overrides: number;
  records: number;
  statusChanges: number;
};

export type RevenueAssetReviewQueueItem = {
  assetId: string;
  assetName: string;
  assetScore: RevenueAssetScore["assetScore"];
  assetType: RevenueAssetScore["assetType"];
  controlHistory: RevenueAssetReviewQueueControlHistory;
  currentRecommendation: RevenueAssetRotationDecision;
  evidence: string[];
  externalExecution: false;
  latestControl: Pick<RevenueAssetControlRecordSnapshot, "createdAt" | "override" | "requestedAction" | "scoringRecommendation" | "statusChangeRequired" | "toStatus"> | null;
  nextReviewState: RevenueAssetReviewQueueState;
  priority: number;
  providerContacted: false;
  reason: string;
  riskLevel: RevenueAssetScore["riskLevel"];
  scoreBand: RevenueAssetScore["scoreBand"];
  storeId: string;
  storeName: string;
  trigger: RevenueAssetReviewQueueTrigger;
};

export type RevenueAssetReviewQueuePlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Engine Asset Review Queue";
  providerContacted: false;
  queue: RevenueAssetReviewQueueItem[];
  summary: string;
  totals: {
    items: number;
    killOrPause: number;
    noHistory: number;
    overrides: number;
    scaleReady: number;
    stale: number;
    watch: number;
  };
};

export type RevenueAssetReviewQueueOptions = {
  includeWatch: boolean;
  maxItems: number;
  staleAfterDays: number;
};

export const defaultRevenueAssetReviewQueueOptions: RevenueAssetReviewQueueOptions = {
  includeWatch: false,
  maxItems: 25,
  staleAfterDays: 14
};

export const revenueAssetReviewQueueBlockedActions = [
  "Executing provider, marketplace, POD, ad, social, payment, bank, payout, upload, browser, proxy, or external write actions",
  "Treating a review queue item as authorization to spend money, publish listings, upload content, or move funds",
  "Using stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, CAPTCHA bypass, or platform-evasion automation"
];

function assetKey(asset: Pick<RevenueAssetScore, "assetId" | "assetType">) {
  return `${asset.assetType}:${asset.assetId}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function daysSince(dateIso: string | null, now: Date) {
  if (!dateIso) return Number.POSITIVE_INFINITY;

  const parsed = Date.parse(dateIso);
  if (!Number.isFinite(parsed)) return Number.POSITIVE_INFINITY;

  return Math.max(0, Math.floor((now.getTime() - parsed) / 86_400_000));
}

function controlRecordsByAsset(records: RevenueAssetControlRecordSnapshot[]) {
  const grouped = new Map<string, RevenueAssetControlRecordSnapshot[]>();

  for (const record of records) {
    const key = `${record.assetType}:${record.assetId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  }

  for (const assetRecords of grouped.values()) {
    assetRecords.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  return grouped;
}

function controlHistoryFor(asset: RevenueAssetScore, records: RevenueAssetControlRecordSnapshot[], latest: RevenueAssetControlRecordSnapshot | null, daysOld: number): RevenueAssetReviewQueueControlHistory {
  return {
    currentRecommendationChanged: latest ? latest.scoringRecommendation !== asset.recommendation : false,
    latestActionAgeDays: latest ? daysOld : null,
    latestOverride: latest?.override ?? false,
    latestRequestedAction: latest?.requestedAction ?? null,
    latestScoringRecommendation: latest?.scoringRecommendation ?? null,
    latestStatusChangeRequired: latest?.statusChangeRequired ?? null,
    overrides: records.filter((record) => record.override).length,
    records: records.length,
    statusChanges: records.filter((record) => record.statusChangeRequired).length
  };
}

function triggerFor(asset: RevenueAssetScore, latest: RevenueAssetControlRecordSnapshot | null, stale: boolean): RevenueAssetReviewQueueTrigger {
  if (latest?.override) return "override_review";
  if (asset.recommendation === "kill") return "kill_risk";
  if (asset.recommendation === "pause") return "pause_risk";
  if (asset.recommendation === "scale") return "scale_ready";
  if (!latest) return "no_control_history";
  if (stale) return "stale_review";

  return "watch_followup";
}

function nextReviewStateFor(trigger: RevenueAssetReviewQueueTrigger, asset: RevenueAssetScore): RevenueAssetReviewQueueState {
  if (trigger === "override_review") return "resolve_override_against_current_score";
  if (trigger === "scale_ready") return "queue_manual_scale_budget_review";
  if (trigger === "kill_risk" || trigger === "pause_risk") return "pause_or_kill_asset";
  if (trigger === "no_control_history") return "record_first_control_decision";
  if (trigger === "stale_review") return asset.recommendation === "watch" ? "collect_more_signal" : "record_first_control_decision";

  return "keep_watching";
}

function reasonFor(input: {
  asset: RevenueAssetScore;
  daysOld: number;
  latest: RevenueAssetControlRecordSnapshot | null;
  stale: boolean;
  trigger: RevenueAssetReviewQueueTrigger;
}) {
  if (input.trigger === "override_review" && input.latest) {
    return `Latest control overrode ${input.latest.scoringRecommendation} with ${input.latest.requestedAction}; review against the current ${input.asset.recommendation} score before the next internal action.`;
  }

  if (input.trigger === "kill_risk") {
    return `${input.asset.assetName} is currently scored for kill with ${input.asset.scoreBand} quality; review archival before it absorbs more operator time.`;
  }

  if (input.trigger === "pause_risk") {
    return `${input.asset.assetName} is currently scored for pause; review repair work or state change before more scaling attention.`;
  }

  if (input.trigger === "scale_ready") {
    return `${input.asset.assetName} is currently scored for scale; queue a manual scale budget or controlled internal follow-up.`;
  }

  if (input.trigger === "no_control_history") {
    return `${input.asset.assetName} has no recorded scale/watch/pause/kill control decision yet.`;
  }

  if (input.trigger === "stale_review") {
    return `Latest control is ${input.daysOld} days old; refresh the decision against current score and performance signal.`;
  }

  return `${input.asset.assetName} is in watch follow-up; collect another signal before changing internal state.`;
}

function priorityFor(input: {
  asset: RevenueAssetScore;
  history: RevenueAssetReviewQueueControlHistory;
  latest: RevenueAssetControlRecordSnapshot | null;
  stale: boolean;
  trigger: RevenueAssetReviewQueueTrigger;
}) {
  const actionBase: Record<RevenueAssetReviewQueueTrigger, number> = {
    kill_risk: 94,
    no_control_history: 48,
    override_review: 98,
    pause_risk: 86,
    scale_ready: 82,
    stale_review: 62,
    watch_followup: 35
  };
  const scorePressure = input.asset.recommendation === "scale"
    ? input.asset.assetScore.finalRank / 5
    : (100 - input.asset.assetScore.finalRank) / 6;
  const riskPressure = input.asset.riskLevel === "high" ? 12 : input.asset.riskLevel === "medium" ? 6 : 0;
  const stalePressure = input.stale ? 8 : 0;
  const noHistoryPressure = input.latest ? 0 : 8;
  const driftPressure = input.history.currentRecommendationChanged ? 5 : 0;
  const repeatOverridePressure = input.history.overrides > 1 ? Math.min(input.history.overrides * 3, 9) : 0;
  const performancePressure = input.asset.performance
    ? input.asset.performance.profitVelocity < 0 ? 8 : input.asset.performance.profitVelocity > 0 && input.asset.recommendation === "scale" ? 6 : 0
    : 0;

  return clamp(actionBase[input.trigger] + scorePressure + riskPressure + stalePressure + noHistoryPressure + driftPressure + repeatOverridePressure + performancePressure, 0, 100);
}

function triggerUrgency(trigger: RevenueAssetReviewQueueTrigger) {
  const order: Record<RevenueAssetReviewQueueTrigger, number> = {
    kill_risk: 92,
    no_control_history: 45,
    override_review: 100,
    pause_risk: 86,
    scale_ready: 78,
    stale_review: 62,
    watch_followup: 30
  };

  return order[trigger];
}

function evidenceFor(asset: RevenueAssetScore, latest: RevenueAssetControlRecordSnapshot | null, daysOld: number, stale: boolean, history: RevenueAssetReviewQueueControlHistory) {
  const evidence = [
    `Score ${asset.assetScore.finalRank}: economics ${asset.assetScore.economicsScore}, readiness ${asset.assetScore.readinessScore}, risk penalty ${asset.assetScore.riskPenalty}, velocity ${asset.assetScore.velocity}.`,
    `Current recommendation is ${asset.recommendation}; score band is ${asset.scoreBand}; risk is ${asset.riskLevel}.`
  ];

  if (asset.performance) {
    evidence.push(`Performance signal: ${asset.performance.snapshots} snapshot${asset.performance.snapshots === 1 ? "" : "s"}, ${asset.performance.profitVelocity}/day profit velocity, ${asset.performance.evidenceGrade} evidence.`);
  }

  if (latest) {
    evidence.push(`Latest control ${latest.requestedAction} recorded ${daysOld} day${daysOld === 1 ? "" : "s"} ago${latest.override ? " as an override" : ""}.`);
  } else {
    evidence.push("No prior asset-control record is available.");
  }

  if (history.records > 1) {
    evidence.push(`Control history: ${history.records} records, ${history.overrides} override${history.overrides === 1 ? "" : "s"}, ${history.statusChanges} status change${history.statusChanges === 1 ? "" : "s"}.`);
  }

  if (history.currentRecommendationChanged) {
    evidence.push("Current scoring recommendation has drifted from the latest recorded scoring recommendation.");
  }

  if (stale) {
    evidence.push("Control decision is stale against the current review window.");
  }

  return evidence;
}

export function buildRevenueAssetReviewQueuePlan(input: {
  controlLedger?: RevenueAssetControlLedgerPlan;
  generatedAt?: string;
  now?: Date;
  options?: Partial<RevenueAssetReviewQueueOptions>;
  portfolio: RevenueAssetPortfolio;
}): RevenueAssetReviewQueuePlan {
  const options = {
    ...defaultRevenueAssetReviewQueueOptions,
    ...(input.options ?? {})
  };
  const now = input.now ?? new Date();
  const recordsByAsset = controlRecordsByAsset(input.controlLedger?.records ?? []);
  const items = input.portfolio.assets.flatMap((asset): RevenueAssetReviewQueueItem[] => {
    const controlRecords = recordsByAsset.get(assetKey(asset)) ?? [];
    const latest = controlRecords[0] ?? null;
    const daysOld = daysSince(latest?.createdAt ?? null, now);
    const controlHistory = controlHistoryFor(asset, controlRecords, latest, daysOld);
    const stale = Boolean(latest) && daysOld >= options.staleAfterDays;
    const actionable = asset.recommendation !== "watch" || latest?.override || stale || !latest || options.includeWatch;

    if (!actionable) {
      return [];
    }

    const trigger = triggerFor(asset, latest, stale);
    const nextReviewState = nextReviewStateFor(trigger, asset);

    return [{
      assetId: asset.assetId,
      assetName: asset.assetName,
      assetScore: asset.assetScore,
      assetType: asset.assetType,
      controlHistory,
      currentRecommendation: asset.recommendation,
      evidence: evidenceFor(asset, latest, daysOld, stale, controlHistory),
      externalExecution: false,
      latestControl: latest ? {
        createdAt: latest.createdAt,
        override: latest.override,
        requestedAction: latest.requestedAction,
        scoringRecommendation: latest.scoringRecommendation,
        statusChangeRequired: latest.statusChangeRequired,
        toStatus: latest.toStatus
      } : null,
      nextReviewState,
      priority: priorityFor({ asset, history: controlHistory, latest, stale, trigger }),
      providerContacted: false,
      reason: reasonFor({ asset, daysOld, latest, stale, trigger }),
      riskLevel: asset.riskLevel,
      scoreBand: asset.scoreBand,
      storeId: asset.storeId,
      storeName: asset.storeName,
      trigger
    }];
  })
    .sort((left, right) => (
      right.priority - left.priority
      || triggerUrgency(right.trigger) - triggerUrgency(left.trigger)
      || right.assetScore.finalRank - left.assetScore.finalRank
    ))
    .slice(0, options.maxItems);

  const count = (decision: RevenueAssetRotationDecision) => items.filter((item) => item.currentRecommendation === decision).length;
  const stale = items.filter((item) => item.trigger === "stale_review").length;
  const noHistory = items.filter((item) => item.trigger === "no_control_history").length;
  const overrides = items.filter((item) => item.trigger === "override_review").length;

  return {
    auditEvents: [
      "Revenue asset review queue generated from current asset scoring and the internal asset-control ledger.",
      "Queue items are operator review prompts only; no external execution is authorized."
    ],
    blockedExternalActions: Array.from(new Set([
      ...input.portfolio.blockedExternalActions,
      ...(input.controlLedger?.blockedExternalActions ?? []),
      ...revenueAssetReviewQueueBlockedActions
    ])),
    externalExecution: false,
    generatedAt: input.generatedAt ?? now.toISOString(),
    mode: "Revenue Engine Asset Review Queue",
    providerContacted: false,
    queue: items,
    summary: `${items.length} asset review item${items.length === 1 ? "" : "s"} queued from current scores and control history: ${count("scale")} scale-ready, ${count("pause") + count("kill")} pause/kill, ${overrides} override review, ${stale} stale, and ${noHistory} without prior control history.`,
    totals: {
      items: items.length,
      killOrPause: count("pause") + count("kill"),
      noHistory,
      overrides,
      scaleReady: count("scale"),
      stale,
      watch: count("watch")
    }
  };
}
