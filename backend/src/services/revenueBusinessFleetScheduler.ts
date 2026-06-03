import { createHash } from "node:crypto";
import type { FinancialOrchestratorPlan } from "./financialOrchestrator.js";
import type { RevenueAssetPortfolio, RevenueAssetRotationDecision, RevenueAssetScore } from "./revenueEngine.js";
import type { RevenueFirstBusinessLaunchCandidate, RevenueFirstBusinessLaunchPlan } from "./revenueFirstBusinessLaunch.js";

export type RevenueBusinessFleetLane = "launch_now" | "scale" | "watch" | "quality_repair" | "throttle" | "kill";
export type RevenueBusinessFleetScheduleState = "ready_parallel" | "queued" | "throttled" | "blocked";
export type RevenueBusinessFleetQualityStatus = "pass" | "watch" | "block";

export type RevenueBusinessFleetOptions = {
  killPressureThreshold: number;
  launchWaveSize: number;
  maxParallelLaunches: number;
  maxParallelScaleActions: number;
  qualityFloor: number;
  shardCount: number;
  targetBusinesses: number;
};

export type RevenueBusinessFleetScore = {
  economicsScore: number;
  finalRank: number;
  killPressure: number;
  qualityScore: number;
  readinessScore: number;
  scalePressure: number;
};

export type RevenueBusinessFleetQualityGate = {
  reasons: string[];
  status: RevenueBusinessFleetQualityStatus;
};

export type RevenueBusinessFleetNextAction = {
  endpoint: string;
  label: string;
  reason: string;
  state: string;
};

export type RevenueBusinessFleetBusiness = {
  assetCount: number;
  blockedExternalActions: string[];
  businessId: string;
  businessName: string;
  externalExecution: false;
  lane: RevenueBusinessFleetLane;
  nextInternalAction: RevenueBusinessFleetNextAction;
  parallelism: {
    launchSlots: number;
    maxInternalJobs: number;
    scaleSlots: number;
  };
  productAssets: number;
  profitVelocity: number;
  providerContacted: false;
  qualityGate: RevenueBusinessFleetQualityGate;
  recommendationCounts: Record<RevenueAssetRotationDecision, number>;
  revenueVelocity: number;
  scheduleState: RevenueBusinessFleetScheduleState;
  score: RevenueBusinessFleetScore;
  shardId: string;
  topAsset: {
    assetId: string;
    assetName: string;
    assetType: RevenueAssetScore["assetType"];
    finalRank: number;
    recommendation: RevenueAssetRotationDecision;
  } | null;
  trackedAssets: number;
};

export type RevenueBusinessFleetShard = {
  blocked: number;
  businesses: number;
  capacity: number;
  id: string;
  laneCounts: Record<RevenueBusinessFleetLane, number>;
  queued: number;
  readyParallel: number;
  throttled: number;
};

export type RevenueBusinessFleetPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  businesses: RevenueBusinessFleetBusiness[];
  capacity: {
    currentBusinesses: number;
    launchWaveSize: number;
    maxParallelLaunches: number;
    maxParallelScaleActions: number;
    parallelSlotsConfigured: number;
    shardCount: number;
    targetBusinesses: number;
    targetGap: number;
  };
  externalExecution: false;
  generatedAt: string;
  launchWave: RevenueBusinessFleetBusiness[];
  mode: "Revenue Business Fleet Scheduler";
  options: RevenueBusinessFleetOptions;
  providerContacted: false;
  shards: RevenueBusinessFleetShard[];
  sourceSignals: {
    assetPortfolioGeneratedAt: string;
    financialKillPressure: number;
    financialScalePressure: number;
    firstBusinessLaunchReady: number;
  };
  summary: string;
  totals: {
    blocked: number;
    businesses: number;
    kill: number;
    launchNow: number;
    qualityBlock: number;
    qualityPass: number;
    qualityRepair: number;
    qualityWatch: number;
    queued: number;
    readyParallel: number;
    scale: number;
    throttled: number;
    watch: number;
  };
};

export type RevenueBusinessFleetLaunchWaveSelection = {
  businessId: string;
  businessName: string;
  finalRank: number;
  nextInternalAction: string;
  qualityStatus: RevenueBusinessFleetQualityStatus;
  scheduleState: RevenueBusinessFleetScheduleState;
  shardId: string;
  sprintActionId: string;
};

export type RevenueBusinessFleetLaunchWaveSkipped = {
  businessId: string;
  businessName: string;
  reason: string;
};

export type RevenueBusinessFleetLaunchWavePlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Business Fleet Launch Wave";
  providerContacted: false;
  selectedBusinesses: RevenueBusinessFleetLaunchWaveSelection[];
  skipped: RevenueBusinessFleetLaunchWaveSkipped[];
  sprintActionIds: string[];
  summary: string;
  totals: {
    eligible: number;
    readyParallel: number;
    requested: number;
    selected: number;
    skipped: number;
  };
};

export type RevenueBusinessFleetLaunchGapAction = {
  action:
    | "run_launch_wave"
    | "repair_quality_gate"
    | "seed_product_drafts"
    | "optimize_listings"
    | "prepare_store_setup"
    | "create_opportunity_shell"
    | "collect_signal";
  businessId: string | null;
  businessName: string;
  endpoint: string;
  expectedInternalEffect: string;
  externalExecution: false;
  priority: number;
  reason: string;
  sourceModule: string;
  status: "ready" | "queued_after_apply" | "blocked";
};

export type RevenueBusinessFleetOpportunitySeed = {
  businessName: string;
  idea: string;
  priceRange: {
    max: number;
    min: number;
  };
  productCount: 5 | 10 | 15 | 25;
  productTypes: string[];
  riskTolerance: "Low";
  sourceKey: string;
  storePlatform: "Etsy" | "Shopify" | "Other";
};

export type RevenueBusinessFleetLaunchGapPlan = {
  actions: RevenueBusinessFleetLaunchGapAction[];
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Business Fleet Launch Gap Planner";
  opportunitySeeds: RevenueBusinessFleetOpportunitySeed[];
  providerContacted: false;
  summary: string;
  totals: {
    createOpportunityShells: number;
    currentBusinesses: number;
    launchWaveGap: number;
    readyLaunchWaveBusinesses: number;
    repairActions: number;
    runLaunchWaveActions: number;
    targetLaunchWave: number;
  };
};

export const defaultRevenueBusinessFleetOptions: RevenueBusinessFleetOptions = {
  killPressureThreshold: 70,
  launchWaveSize: 10,
  maxParallelLaunches: 10,
  maxParallelScaleActions: 25,
  qualityFloor: 70,
  shardCount: 32,
  targetBusinesses: 1_000
};

const blockedFleetActions = [
  "Publishing, provider creation, marketplace uploads, content posting, ad spend, payouts, bank movement, or external write actions without a separate approval gate",
  "Launching browser automation, stealth, proxy rotation, fingerprint spoofing, CAPTCHA bypass, account warmup, or platform-evasion workflows",
  "Scaling a business lane whose quality gate is blocked, throttled, or below the configured quality floor"
];

const lanePriority: Record<RevenueBusinessFleetLane, number> = {
  launch_now: 1,
  scale: 2,
  quality_repair: 3,
  throttle: 4,
  watch: 5,
  kill: 6
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function average(values: number[]) {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function withFleetOptions(input: Partial<RevenueBusinessFleetOptions> = {}): RevenueBusinessFleetOptions {
  return {
    killPressureThreshold: clamp(Math.round(input.killPressureThreshold ?? defaultRevenueBusinessFleetOptions.killPressureThreshold), 0, 100),
    launchWaveSize: clamp(Math.round(input.launchWaveSize ?? defaultRevenueBusinessFleetOptions.launchWaveSize), 1, 100),
    maxParallelLaunches: clamp(Math.round(input.maxParallelLaunches ?? defaultRevenueBusinessFleetOptions.maxParallelLaunches), 1, 1_000),
    maxParallelScaleActions: clamp(Math.round(input.maxParallelScaleActions ?? defaultRevenueBusinessFleetOptions.maxParallelScaleActions), 1, 2_000),
    qualityFloor: clamp(Math.round(input.qualityFloor ?? defaultRevenueBusinessFleetOptions.qualityFloor), 0, 100),
    shardCount: clamp(Math.round(input.shardCount ?? defaultRevenueBusinessFleetOptions.shardCount), 1, 256),
    targetBusinesses: clamp(Math.round(input.targetBusinesses ?? defaultRevenueBusinessFleetOptions.targetBusinesses), 1, 100_000)
  };
}

function assetKey(asset: Pick<RevenueAssetScore, "assetId" | "assetType">) {
  return `${asset.assetType}:${asset.assetId}`;
}

function shardFor(storeId: string, shardCount: number) {
  const digest = createHash("sha256").update(storeId).digest("hex").slice(0, 8);
  const index = parseInt(digest, 16) % shardCount;

  return `shard_${String(index + 1).padStart(3, "0")}`;
}

function emptyRecommendationCounts(): Record<RevenueAssetRotationDecision, number> {
  return {
    kill: 0,
    pause: 0,
    scale: 0,
    watch: 0
  };
}

function recommendationCounts(assets: RevenueAssetScore[]) {
  return assets.reduce<Record<RevenueAssetRotationDecision, number>>((counts, asset) => {
    counts[asset.recommendation] += 1;
    return counts;
  }, emptyRecommendationCounts());
}

function topAssetFor(assets: RevenueAssetScore[]) {
  const asset = [...assets].sort((left, right) => (
    laneRecommendationPriority(right.recommendation) - laneRecommendationPriority(left.recommendation)
    || right.assetScore.finalRank - left.assetScore.finalRank
    || right.confidence - left.confidence
  ))[0];

  if (!asset) return null;

  return {
    assetId: asset.assetId,
    assetName: asset.assetName,
    assetType: asset.assetType,
    finalRank: asset.assetScore.finalRank,
    recommendation: asset.recommendation
  };
}

function laneRecommendationPriority(recommendation: RevenueAssetRotationDecision) {
  if (recommendation === "scale") return 4;
  if (recommendation === "watch") return 3;
  if (recommendation === "pause") return 2;
  return 1;
}

function pressureAssetKeys(
  financialPlan: FinancialOrchestratorPlan | undefined,
  direction: "scalePressure" | "killPressure"
) {
  return new Set((financialPlan?.portfolioSignal[direction].assets ?? []).map(assetKey));
}

function qualityScoreFor(assets: RevenueAssetScore[]) {
  const averageRank = average(assets.map((asset) => asset.assetScore.finalRank));
  const highRiskAssets = assets.filter((asset) => asset.riskLevel === "high").length;
  const mediumRiskAssets = assets.filter((asset) => asset.riskLevel === "medium").length;
  const trackedBonus = Math.min(10, assets.filter((asset) => asset.performance && asset.performance.snapshots > 0).length * 3);
  const productCoverage = Math.min(12, assets.filter((asset) => asset.assetType === "product").length * 4);
  const riskPenalty = highRiskAssets * 18 + mediumRiskAssets * 7;

  return clamp(Math.round(averageRank * 0.76 + trackedBonus + productCoverage - riskPenalty), 0, 100);
}

function readinessScoreFor(assets: RevenueAssetScore[]) {
  return clamp(Math.round(average(assets.map((asset) => asset.assetScore.readinessScore)) / 35 * 100), 0, 100);
}

function economicsScoreFor(assets: RevenueAssetScore[]) {
  return clamp(Math.round(average(assets.map((asset) => asset.assetScore.economicsScore)) / 45 * 100), 0, 100);
}

function scalePressureFor(assets: RevenueAssetScore[], financialScaleAssetKeys: Set<string>) {
  const scaleAssets = assets.filter((asset) => asset.recommendation === "scale");
  if (scaleAssets.length === 0) return 0;

  const positiveProfitVelocity = scaleAssets.reduce((sum, asset) => sum + Math.max(0, asset.performance?.profitVelocity ?? 0), 0);
  const financeMatches = scaleAssets.filter((asset) => financialScaleAssetKeys.has(assetKey(asset))).length;

  return clamp(Math.round(
    average(scaleAssets.map((asset) => asset.assetScore.finalRank)) * 0.55
    + Math.min(30, positiveProfitVelocity)
    + Math.min(24, scaleAssets.length * 8)
    + Math.min(12, financeMatches * 6)
  ), 0, 100);
}

function killPressureFor(assets: RevenueAssetScore[], financialKillAssetKeys: Set<string>, portfolioProfitVelocity: number) {
  const killAssets = assets.filter((asset) => asset.recommendation === "kill");
  const pauseAssets = assets.filter((asset) => asset.recommendation === "pause");
  const weakAssets = [...killAssets, ...pauseAssets];
  const negativeVelocity = Math.abs(assets.reduce((sum, asset) => sum + Math.min(0, asset.performance?.profitVelocity ?? 0), 0));
  const financeMatches = weakAssets.filter((asset) => financialKillAssetKeys.has(assetKey(asset))).length;
  const highRiskAssets = assets.filter((asset) => asset.riskLevel === "high").length;
  const globalVelocityPenalty = portfolioProfitVelocity < 0 ? Math.min(10, Math.abs(portfolioProfitVelocity)) : 0;

  if (weakAssets.length === 0 && negativeVelocity === 0 && highRiskAssets === 0 && globalVelocityPenalty === 0) {
    return 0;
  }

  const weakness = weakAssets.length > 0
    ? average(weakAssets.map((asset) => 100 - asset.assetScore.finalRank))
    : 25;

  return clamp(Math.round(
    weakness * 0.42
    + killAssets.length * 22
    + pauseAssets.length * 10
    + highRiskAssets * 12
    + Math.min(18, negativeVelocity)
    + Math.min(12, financeMatches * 6)
    + globalVelocityPenalty
  ), 0, 100);
}

function qualityGateFor(input: {
  assets: RevenueAssetScore[];
  killPressure: number;
  options: RevenueBusinessFleetOptions;
  qualityScore: number;
}): RevenueBusinessFleetQualityGate {
  const reasons: string[] = [];
  const highRiskAssets = input.assets.filter((asset) => asset.riskLevel === "high").length;
  const killAssets = input.assets.filter((asset) => asset.recommendation === "kill").length;
  const pauseAssets = input.assets.filter((asset) => asset.recommendation === "pause").length;

  if (input.qualityScore >= input.options.qualityFloor) {
    reasons.push(`Quality ${input.qualityScore}/100 meets the ${input.options.qualityFloor}/100 floor.`);
  } else {
    reasons.push(`Quality ${input.qualityScore}/100 is below the ${input.options.qualityFloor}/100 floor.`);
  }

  if (killAssets > 0) {
    reasons.push(`${killAssets} asset${killAssets === 1 ? "" : "s"} currently recommend kill.`);
  }

  if (pauseAssets > 0) {
    reasons.push(`${pauseAssets} asset${pauseAssets === 1 ? "" : "s"} currently recommend pause.`);
  }

  if (highRiskAssets > 0) {
    reasons.push(`${highRiskAssets} high-risk asset${highRiskAssets === 1 ? "" : "s"} must be cleared before scale.`);
  }

  if (input.killPressure >= input.options.killPressureThreshold) {
    reasons.push(`Kill pressure ${input.killPressure}/100 meets or exceeds the ${input.options.killPressureThreshold}/100 threshold.`);
  }

  if (
    killAssets > 0
    || input.killPressure >= input.options.killPressureThreshold
    || input.qualityScore < input.options.qualityFloor - 20
  ) {
    return {
      reasons,
      status: "block"
    };
  }

  if (pauseAssets > 0 || highRiskAssets > 0 || input.qualityScore < input.options.qualityFloor) {
    return {
      reasons,
      status: "watch"
    };
  }

  return {
    reasons,
    status: "pass"
  };
}

function laneFor(input: {
  candidate: RevenueFirstBusinessLaunchCandidate | undefined;
  counts: Record<RevenueAssetRotationDecision, number>;
  killPressure: number;
  options: RevenueBusinessFleetOptions;
  qualityGate: RevenueBusinessFleetQualityGate;
  qualityScore: number;
  scalePressure: number;
}): RevenueBusinessFleetLane {
  if (input.qualityGate.status === "block" && (input.counts.kill > 0 || input.killPressure >= input.options.killPressureThreshold)) {
    return "kill";
  }

  if (input.candidate?.status === "ready_internal" && input.qualityGate.status !== "block" && input.qualityScore >= input.options.qualityFloor) {
    return "launch_now";
  }

  if (input.scalePressure >= 60 && input.qualityGate.status !== "block" && input.qualityScore >= input.options.qualityFloor) {
    return "scale";
  }

  if (input.qualityGate.status === "block" || input.candidate?.status === "blocked" || input.candidate?.status === "manual_gate" || input.qualityScore < input.options.qualityFloor) {
    return "quality_repair";
  }

  if (input.counts.pause > 0 || input.killPressure >= 40) {
    return "throttle";
  }

  return "watch";
}

function nextActionFor(input: {
  businessName: string;
  candidate: RevenueFirstBusinessLaunchCandidate | undefined;
  lane: RevenueBusinessFleetLane;
  qualityGate: RevenueBusinessFleetQualityGate;
  topAsset: RevenueBusinessFleetBusiness["topAsset"];
}): RevenueBusinessFleetNextAction {
  if (input.lane === "launch_now" && input.candidate) {
    return {
      endpoint: input.candidate.recommendedEndpoint,
      label: input.candidate.nextInternalAction,
      reason: input.candidate.reason,
      state: input.candidate.nextInternalState
    };
  }

  if (input.lane === "scale") {
    return {
      endpoint: "/merch/financial-orchestrator/plan",
      label: "review_scaling_budget_pressure",
      reason: `${input.businessName} has enough asset pressure for internal scaling budget review.`,
      state: "scaling_budget_review"
    };
  }

  if (input.lane === "quality_repair") {
    return {
      endpoint: "/merch/revenue-engine/portfolio",
      label: "repair_quality_gate",
      reason: input.qualityGate.reasons.join(" "),
      state: "quality_gate_repair"
    };
  }

  if (input.lane === "throttle") {
    return {
      endpoint: "/merch/revenue-engine/review-queue",
      label: "throttle_and_review_assets",
      reason: input.qualityGate.reasons.join(" "),
      state: "throttled_asset_review"
    };
  }

  if (input.lane === "kill") {
    return {
      endpoint: "/merch/revenue-engine/portfolio/actions",
      label: "prepare_internal_kill_or_archive_review",
      reason: input.qualityGate.reasons.join(" "),
      state: "kill_review_required"
    };
  }

  return {
    endpoint: "/merch/revenue-engine/performance",
    label: "collect_more_performance_signal",
    reason: input.topAsset
      ? `${input.topAsset.assetName} is the strongest current signal, but this business is not ready for launch or scale pressure.`
      : `${input.businessName} needs stronger asset evidence before it enters launch or scale lanes.`,
    state: "watch_for_signal"
  };
}

function businessFromAssets(input: {
  assets: RevenueAssetScore[];
  candidate: RevenueFirstBusinessLaunchCandidate | undefined;
  financialKillAssetKeys: Set<string>;
  financialScaleAssetKeys: Set<string>;
  options: RevenueBusinessFleetOptions;
  portfolio: RevenueAssetPortfolio;
}): RevenueBusinessFleetBusiness {
  const storeAsset = input.assets.find((asset) => asset.assetType === "store");
  const firstAsset = input.assets[0];
  const businessId = storeAsset?.assetId ?? firstAsset.storeId;
  const businessName = storeAsset?.assetName ?? firstAsset.storeName;
  const counts = recommendationCounts(input.assets);
  const qualityScore = qualityScoreFor(input.assets);
  const readinessScore = readinessScoreFor(input.assets);
  const economicsScore = economicsScoreFor(input.assets);
  const scalePressure = scalePressureFor(input.assets, input.financialScaleAssetKeys);
  const killPressure = killPressureFor(input.assets, input.financialKillAssetKeys, input.portfolio.totals.profitVelocity);
  const qualityGate = qualityGateFor({
    assets: input.assets,
    killPressure,
    options: input.options,
    qualityScore
  });
  const lane = laneFor({
    candidate: input.candidate,
    counts,
    killPressure,
    options: input.options,
    qualityGate,
    qualityScore,
    scalePressure
  });
  const topAsset = topAssetFor(input.assets);
  const candidateBoost = input.candidate?.status === "ready_internal" ? 10 : input.candidate?.status === "manual_gate" ? 4 : 0;
  const finalRank = clamp(Math.round(
    qualityScore * 0.38
    + readinessScore * 0.18
    + economicsScore * 0.18
    + scalePressure * 0.16
    + (input.candidate?.finalRank ?? 0) * 0.1
    + candidateBoost
    - killPressure * 0.15
  ), 0, 100);
  const profitVelocity = money(input.assets.reduce((sum, asset) => sum + (asset.performance?.profitVelocity ?? 0), 0));
  const revenueVelocity = money(input.assets.reduce((sum, asset) => sum + (asset.performance?.revenueVelocity ?? 0), 0));

  return {
    assetCount: input.assets.length,
    blockedExternalActions: blockedFleetActions,
    businessId,
    businessName,
    externalExecution: false,
    lane,
    nextInternalAction: nextActionFor({
      businessName,
      candidate: input.candidate,
      lane,
      qualityGate,
      topAsset
    }),
    parallelism: {
      launchSlots: 0,
      maxInternalJobs: 0,
      scaleSlots: 0
    },
    productAssets: input.assets.filter((asset) => asset.assetType === "product").length,
    profitVelocity,
    providerContacted: false,
    qualityGate,
    recommendationCounts: counts,
    revenueVelocity,
    scheduleState: "queued",
    score: {
      economicsScore,
      finalRank,
      killPressure,
      qualityScore,
      readinessScore,
      scalePressure
    },
    shardId: shardFor(businessId, input.options.shardCount),
    topAsset,
    trackedAssets: input.assets.filter((asset) => asset.performance && asset.performance.snapshots > 0).length
  };
}

function withScheduleStates(businesses: RevenueBusinessFleetBusiness[], options: RevenueBusinessFleetOptions) {
  let launchSlots = 0;
  let scaleSlots = 0;
  const launchSlotLimit = Math.min(options.launchWaveSize, options.maxParallelLaunches);

  return businesses.map((business) => {
    if (business.lane === "kill") {
      return {
        ...business,
        parallelism: {
          launchSlots: 0,
          maxInternalJobs: 0,
          scaleSlots: 0
        },
        scheduleState: "blocked" as const
      };
    }

    if (business.lane === "quality_repair" || business.lane === "throttle") {
      return {
        ...business,
        parallelism: {
          launchSlots: 0,
          maxInternalJobs: 1,
          scaleSlots: 0
        },
        scheduleState: "throttled" as const
      };
    }

    if (business.lane === "launch_now") {
      launchSlots += 1;
      const ready = launchSlots <= launchSlotLimit;

      return {
        ...business,
        parallelism: {
          launchSlots: ready ? 1 : 0,
          maxInternalJobs: ready ? 3 : 1,
          scaleSlots: 0
        },
        scheduleState: ready ? "ready_parallel" as const : "queued" as const
      };
    }

    if (business.lane === "scale") {
      scaleSlots += 1;
      const ready = scaleSlots <= options.maxParallelScaleActions;

      return {
        ...business,
        parallelism: {
          launchSlots: 0,
          maxInternalJobs: ready ? 2 : 1,
          scaleSlots: ready ? 1 : 0
        },
        scheduleState: ready ? "ready_parallel" as const : "queued" as const
      };
    }

    return {
      ...business,
      parallelism: {
        launchSlots: 0,
        maxInternalJobs: 1,
        scaleSlots: 0
      },
      scheduleState: "queued" as const
    };
  });
}

function shardSummary(shardId: string, businesses: RevenueBusinessFleetBusiness[]): RevenueBusinessFleetShard {
  const laneCounts = businesses.reduce<Record<RevenueBusinessFleetLane, number>>((counts, business) => {
    counts[business.lane] += 1;
    return counts;
  }, {
    kill: 0,
    launch_now: 0,
    quality_repair: 0,
    scale: 0,
    throttle: 0,
    watch: 0
  });

  return {
    blocked: businesses.filter((business) => business.scheduleState === "blocked").length,
    businesses: businesses.length,
    capacity: businesses.reduce((sum, business) => sum + business.parallelism.maxInternalJobs, 0),
    id: shardId,
    laneCounts,
    queued: businesses.filter((business) => business.scheduleState === "queued").length,
    readyParallel: businesses.filter((business) => business.scheduleState === "ready_parallel").length,
    throttled: businesses.filter((business) => business.scheduleState === "throttled").length
  };
}

function groupAssetsByStore(portfolio: RevenueAssetPortfolio) {
  const groups = new Map<string, RevenueAssetScore[]>();

  for (const asset of portfolio.assets) {
    const key = asset.storeId || asset.assetId;
    const existing = groups.get(key) ?? [];
    existing.push(asset);
    groups.set(key, existing);
  }

  return groups;
}

function candidatesByStore(firstBusinessLaunchPlan: RevenueFirstBusinessLaunchPlan | undefined) {
  const candidates = new Map<string, RevenueFirstBusinessLaunchCandidate>();

  for (const candidate of firstBusinessLaunchPlan?.candidates ?? []) {
    if (!candidate.storeId) continue;

    const existing = candidates.get(candidate.storeId);
    if (!existing || candidate.finalRank > existing.finalRank) {
      candidates.set(candidate.storeId, candidate);
    }
  }

  return candidates;
}

export function buildRevenueBusinessFleetSchedulerPlan(input: {
  assetPortfolio: RevenueAssetPortfolio;
  financialPlan?: FinancialOrchestratorPlan;
  firstBusinessLaunchPlan?: RevenueFirstBusinessLaunchPlan;
  generatedAt?: string;
  options?: Partial<RevenueBusinessFleetOptions>;
}): RevenueBusinessFleetPlan {
  const options = withFleetOptions(input.options);
  const financialScaleAssetKeys = pressureAssetKeys(input.financialPlan, "scalePressure");
  const financialKillAssetKeys = pressureAssetKeys(input.financialPlan, "killPressure");
  const launchCandidates = candidatesByStore(input.firstBusinessLaunchPlan);
  const groupedAssets = groupAssetsByStore(input.assetPortfolio);
  const businesses = Array.from(groupedAssets.entries())
    .map(([storeId, assets]) => businessFromAssets({
      assets,
      candidate: launchCandidates.get(storeId),
      financialKillAssetKeys,
      financialScaleAssetKeys,
      options,
      portfolio: input.assetPortfolio
    }))
    .sort((left, right) => (
      lanePriority[left.lane] - lanePriority[right.lane]
      || right.score.finalRank - left.score.finalRank
      || right.score.scalePressure - left.score.scalePressure
      || left.businessName.localeCompare(right.businessName)
    ));
  const scheduledBusinesses = withScheduleStates(businesses, options);
  const shardIds = Array.from(new Set(scheduledBusinesses.map((business) => business.shardId))).sort();
  const shards = shardIds.map((shardId) => shardSummary(
    shardId,
    scheduledBusinesses.filter((business) => business.shardId === shardId)
  ));
  const countLane = (lane: RevenueBusinessFleetLane) => scheduledBusinesses.filter((business) => business.lane === lane).length;
  const countQuality = (status: RevenueBusinessFleetQualityStatus) => scheduledBusinesses.filter((business) => business.qualityGate.status === status).length;
  const countSchedule = (state: RevenueBusinessFleetScheduleState) => scheduledBusinesses.filter((business) => business.scheduleState === state).length;
  const launchWave = scheduledBusinesses
    .filter((business) => business.lane === "launch_now")
    .slice(0, options.launchWaveSize);
  const targetGap = Math.max(0, options.targetBusinesses - scheduledBusinesses.length);

  return {
    auditEvents: [
      "Business Fleet Scheduler grouped Revenue Engine scored assets by store/business.",
      "Financial Orchestrator scale and kill pressure was attached as advisory context only.",
      "First Business Launch candidates were used to identify the first launch wave.",
      "All fleet scheduling is internal; no provider, marketplace, payment, browser, social, ad, bank, or external write action was executed."
    ],
    blockedExternalActions: unique([
      ...input.assetPortfolio.blockedExternalActions,
      ...(input.financialPlan?.blockedExternalActions ?? []),
      ...(input.firstBusinessLaunchPlan?.blockedExternalActions ?? []),
      ...blockedFleetActions
    ]),
    businesses: scheduledBusinesses,
    capacity: {
      currentBusinesses: scheduledBusinesses.length,
      launchWaveSize: options.launchWaveSize,
      maxParallelLaunches: options.maxParallelLaunches,
      maxParallelScaleActions: options.maxParallelScaleActions,
      parallelSlotsConfigured: options.maxParallelLaunches + options.maxParallelScaleActions,
      shardCount: options.shardCount,
      targetBusinesses: options.targetBusinesses,
      targetGap
    },
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    launchWave,
    mode: "Revenue Business Fleet Scheduler",
    options,
    providerContacted: false,
    shards,
    sourceSignals: {
      assetPortfolioGeneratedAt: input.assetPortfolio.generatedAt,
      financialKillPressure: input.financialPlan?.portfolioSignal.killPressure.pressureScore ?? 0,
      financialScalePressure: input.financialPlan?.portfolioSignal.scalePressure.pressureScore ?? 0,
      firstBusinessLaunchReady: input.firstBusinessLaunchPlan?.totals.readyInternal ?? 0
    },
    summary: `${scheduledBusinesses.length} business${scheduledBusinesses.length === 1 ? "" : "es"} scored across ${options.shardCount} shard${options.shardCount === 1 ? "" : "s"}. ${countSchedule("ready_parallel")} ready for parallel internal work, including ${launchWave.filter((business) => business.scheduleState === "ready_parallel").length}/${options.launchWaveSize} first-wave launch slot${options.launchWaveSize === 1 ? "" : "s"}. ${countLane("scale")} scale, ${countLane("quality_repair")} repair, ${countLane("throttle")} throttle, and ${countLane("kill")} kill lane${scheduledBusinesses.length === 1 ? "" : "s"}. Target capacity is ${options.targetBusinesses} businesses; current gap is ${targetGap}.`,
    totals: {
      blocked: countSchedule("blocked"),
      businesses: scheduledBusinesses.length,
      kill: countLane("kill"),
      launchNow: countLane("launch_now"),
      qualityBlock: countQuality("block"),
      qualityPass: countQuality("pass"),
      qualityRepair: countLane("quality_repair"),
      qualityWatch: countQuality("watch"),
      queued: countSchedule("queued"),
      readyParallel: countSchedule("ready_parallel"),
      scale: countLane("scale"),
      throttled: countSchedule("throttled"),
      watch: countLane("watch")
    }
  };
}

export function selectRevenueBusinessFleetLaunchWave(input: {
  firstBusinessLaunchPlan: RevenueFirstBusinessLaunchPlan;
  generatedAt?: string;
  plan: RevenueBusinessFleetPlan;
  selectedBusinessIds?: string[];
}): RevenueBusinessFleetLaunchWavePlan {
  const requested = new Set((input.selectedBusinessIds ?? []).map((id) => id.trim()).filter(Boolean));
  const candidateByStore = candidatesByStore(input.firstBusinessLaunchPlan);
  const eligibleBusinesses = input.plan.launchWave.filter((business) => (
    business.lane === "launch_now"
    && business.scheduleState === "ready_parallel"
    && business.qualityGate.status === "pass"
  ));
  const selectedBusinesses: RevenueBusinessFleetLaunchWaveSelection[] = [];
  const skipped: RevenueBusinessFleetLaunchWaveSkipped[] = [];

  for (const business of input.plan.launchWave) {
    if (requested.size > 0 && !requested.has(business.businessId)) {
      skipped.push({
        businessId: business.businessId,
        businessName: business.businessName,
        reason: "Business was not selected for this launch-wave dispatch."
      });
      continue;
    }

    if (!eligibleBusinesses.some((eligible) => eligible.businessId === business.businessId)) {
      skipped.push({
        businessId: business.businessId,
        businessName: business.businessName,
        reason: `Business is ${business.scheduleState.replace(/_/g, " ")} with ${business.qualityGate.status} quality and cannot enter the launch wave.`
      });
      continue;
    }

    const candidate = candidateByStore.get(business.businessId);

    if (!candidate?.sprintActionId || candidate.status !== "ready_internal") {
      skipped.push({
        businessId: business.businessId,
        businessName: business.businessName,
        reason: "No ready first-business sprint action is available for this business."
      });
      continue;
    }

    selectedBusinesses.push({
      businessId: business.businessId,
      businessName: business.businessName,
      finalRank: business.score.finalRank,
      nextInternalAction: candidate.nextInternalAction,
      qualityStatus: business.qualityGate.status,
      scheduleState: business.scheduleState,
      shardId: business.shardId,
      sprintActionId: candidate.sprintActionId
    });
  }

  const sprintActionIds = selectedBusinesses.map((business) => business.sprintActionId);

  return {
    auditEvents: [
      "Business Fleet Launch Wave selected only launch-now businesses with ready-parallel scheduling and pass quality gates.",
      "Selected wave actions route through First Business Launch and First Cash Sprint internal bridge controls.",
      "No provider, marketplace, payment, social, ad, browser, bank, payout, upload, or external write action was executed."
    ],
    blockedExternalActions: input.plan.blockedExternalActions,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Revenue Business Fleet Launch Wave",
    providerContacted: false,
    selectedBusinesses,
    skipped,
    sprintActionIds,
    summary: selectedBusinesses.length > 0
      ? `${selectedBusinesses.length} business${selectedBusinesses.length === 1 ? "" : "es"} selected for the internal launch wave from ${eligibleBusinesses.length} eligible ready-parallel lane${eligibleBusinesses.length === 1 ? "" : "s"}.`
      : `No business is eligible for the internal launch wave. ${skipped.length} business${skipped.length === 1 ? "" : "es"} skipped.`,
    totals: {
      eligible: eligibleBusinesses.length,
      readyParallel: input.plan.launchWave.filter((business) => business.scheduleState === "ready_parallel").length,
      requested: requested.size,
      selected: selectedBusinesses.length,
      skipped: skipped.length
    }
  };
}

function launchGapActionForBusiness(business: RevenueBusinessFleetBusiness, priority: number): RevenueBusinessFleetLaunchGapAction {
  if (business.lane === "quality_repair" || business.qualityGate.status !== "pass") {
    return {
      action: "repair_quality_gate",
      businessId: business.businessId,
      businessName: business.businessName,
      endpoint: "/merch/revenue-engine/review-queue",
      expectedInternalEffect: "Clear quality, pause, kill, or risk blockers before this business can enter the launch wave.",
      externalExecution: false,
      priority,
      reason: business.qualityGate.reasons.join(" "),
      sourceModule: "revenue_business_fleet_scheduler + revenue_asset_review_queue",
      status: business.scheduleState === "blocked" ? "blocked" : "ready"
    };
  }

  if (business.recommendationCounts.pause > 0 || business.lane === "throttle") {
    return {
      action: "repair_quality_gate",
      businessId: business.businessId,
      businessName: business.businessName,
      endpoint: "/merch/revenue-engine/portfolio/actions",
      expectedInternalEffect: "Apply internal pause/repair decisions so the business stops draining launch-wave quality.",
      externalExecution: false,
      priority,
      reason: `${business.businessName} has ${business.recommendationCounts.pause} pause recommendation${business.recommendationCounts.pause === 1 ? "" : "s"} and ${business.score.killPressure}/100 kill pressure.`,
      sourceModule: "revenue_business_fleet_scheduler + revenue_asset_portfolio",
      status: "ready"
    };
  }

  if (business.productAssets < 5 || business.score.readinessScore < 70) {
    return {
      action: "seed_product_drafts",
      businessId: business.businessId,
      businessName: business.businessName,
      endpoint: "/merch/revenue-engine/launch-pipeline",
      expectedInternalEffect: "Create or queue internal product drafts until the business reaches launch portfolio depth.",
      externalExecution: false,
      priority,
      reason: `${business.businessName} has ${business.productAssets} product asset${business.productAssets === 1 ? "" : "s"} and ${business.score.readinessScore}/100 readiness.`,
      sourceModule: "revenue_business_fleet_scheduler + revenue_launch_pipeline",
      status: "ready"
    };
  }

  if (business.score.scalePressure >= 60) {
    return {
      action: "prepare_store_setup",
      businessId: business.businessId,
      businessName: business.businessName,
      endpoint: "/merch/revenue-engine/store-setup",
      expectedInternalEffect: "Prepare store setup records and connector readiness before first-business dispatch.",
      externalExecution: false,
      priority,
      reason: `${business.businessName} has ${business.score.scalePressure}/100 scale pressure but is not yet in launch-now lane.`,
      sourceModule: "revenue_business_fleet_scheduler + revenue_store_setup",
      status: "ready"
    };
  }

  return {
    action: "collect_signal",
    businessId: business.businessId,
    businessName: business.businessName,
    endpoint: "/merch/revenue-engine/performance",
    expectedInternalEffect: "Collect performance or readiness evidence before this business competes for the launch wave.",
    externalExecution: false,
    priority,
    reason: business.nextInternalAction.reason,
    sourceModule: "revenue_business_fleet_scheduler + revenue_performance",
    status: "queued_after_apply"
  };
}

function opportunitySeed(index: number): RevenueBusinessFleetOpportunitySeed {
  const lane = index + 1;

  return {
    businessName: `ENTRAL Private Revenue Lane ${lane}`,
    idea: `Private operator POD and digital product lane ${lane} for fast income testing, built around original serious utility designs and launch-ready product drafts.`,
    priceRange: {
      max: 64,
      min: 18
    },
    productCount: 5,
    productTypes: ["T-shirt", "Sticker", "Notebook", "Poster"],
    riskTolerance: "Low",
    sourceKey: `entral-private-revenue-lane-${lane}`,
    storePlatform: "Etsy"
  };
}

export function buildRevenueBusinessFleetLaunchGapPlan(input: {
  generatedAt?: string;
  plan: RevenueBusinessFleetPlan;
}): RevenueBusinessFleetLaunchGapPlan {
  const readyLaunchWave = input.plan.launchWave.filter((business) => (
    business.lane === "launch_now"
    && business.scheduleState === "ready_parallel"
    && business.qualityGate.status === "pass"
  ));
  const launchWaveGap = Math.max(0, input.plan.capacity.launchWaveSize - readyLaunchWave.length);
  const actions: RevenueBusinessFleetLaunchGapAction[] = [];

  if (readyLaunchWave.length > 0) {
    actions.push({
      action: "run_launch_wave",
      businessId: null,
      businessName: `${readyLaunchWave.length} ready launch-wave business${readyLaunchWave.length === 1 ? "" : "es"}`,
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-wave/apply",
      expectedInternalEffect: "Dispatch the currently ready first-wave businesses through internal First Business Launch controls.",
      externalExecution: false,
      priority: 1,
      reason: `${readyLaunchWave.length}/${input.plan.capacity.launchWaveSize} launch-wave lane${input.plan.capacity.launchWaveSize === 1 ? "" : "s"} are ready now.`,
      sourceModule: "revenue_business_fleet_scheduler + revenue_first_business_launch",
      status: "ready"
    });
  }

  const repairCandidates = input.plan.businesses
    .filter((business) => !readyLaunchWave.some((ready) => ready.businessId === business.businessId))
    .filter((business) => business.lane !== "kill")
    .sort((left, right) => (
      Number(right.lane === "quality_repair") - Number(left.lane === "quality_repair")
      || Number(right.lane === "throttle") - Number(left.lane === "throttle")
      || right.score.finalRank - left.score.finalRank
      || right.score.readinessScore - left.score.readinessScore
    ))
    .slice(0, launchWaveGap);

  repairCandidates.forEach((business, index) => {
    actions.push(launchGapActionForBusiness(business, 10 + index));
  });

  const opportunitySeedCount = Math.max(0, launchWaveGap - repairCandidates.length);
  const opportunitySeeds = Array.from({ length: opportunitySeedCount }, (_, index) => opportunitySeed(index));

  opportunitySeeds.forEach((seed, index) => {
    actions.push({
      action: "create_opportunity_shell",
      businessId: null,
      businessName: seed.businessName,
      endpoint: "/merch/revenue-engine/opportunity-factory",
      expectedInternalEffect: "Create a private store shell with internal product drafts so the business can enter launch pipeline scoring.",
      externalExecution: false,
      priority: 50 + index,
      reason: `Launch wave is short by ${launchWaveGap} lane${launchWaveGap === 1 ? "" : "s"}; this seed creates one new internal opportunity candidate.`,
      sourceModule: "revenue_business_fleet_scheduler + revenue_opportunity_factory",
      status: "ready"
    });
  });

  const repairActions = actions.filter((action) => action.action !== "run_launch_wave" && action.action !== "create_opportunity_shell").length;

  return {
    actions: actions.sort((left, right) => left.priority - right.priority),
    auditEvents: [
      "Business Fleet Launch Gap Planner compared the configured launch-wave target against ready-parallel businesses.",
      "Gap actions are internal Revenue Engine actions only and route through existing launch, opportunity, review, setup, and performance queues.",
      "No provider, marketplace, payment, ad, social, browser, bank, payout, upload, or external write action was executed."
    ],
    blockedExternalActions: input.plan.blockedExternalActions,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Revenue Business Fleet Launch Gap Planner",
    opportunitySeeds,
    providerContacted: false,
    summary: launchWaveGap === 0
      ? `The ${input.plan.capacity.launchWaveSize}-business launch wave is full: ${readyLaunchWave.length} ready businesses can run internally now.`
      : `${readyLaunchWave.length}/${input.plan.capacity.launchWaveSize} businesses are ready for the first wave. Gap ${launchWaveGap}: ${repairActions} repair action${repairActions === 1 ? "" : "s"} and ${opportunitySeeds.length} new opportunity seed${opportunitySeeds.length === 1 ? "" : "s"} queued internally.`,
    totals: {
      createOpportunityShells: opportunitySeeds.length,
      currentBusinesses: input.plan.capacity.currentBusinesses,
      launchWaveGap,
      readyLaunchWaveBusinesses: readyLaunchWave.length,
      repairActions,
      runLaunchWaveActions: readyLaunchWave.length > 0 ? 1 : 0,
      targetLaunchWave: input.plan.capacity.launchWaveSize
    }
  };
}
