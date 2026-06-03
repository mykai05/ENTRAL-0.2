import type {
  RevenueAssetRotationDecision,
  RevenueEngineProductSnapshot,
  RevenueEngineStoreSnapshot,
  RevenueProductStatus,
  RevenueStoreLaunchStatus
} from "./revenueEngine.js";

export const revenuePerformanceSources = [
  "manual",
  "etsy",
  "shopify",
  "printify",
  "printful",
  "stripe",
  "other"
] as const;

export type RevenuePerformanceSource = (typeof revenuePerformanceSources)[number];

export type RevenuePerformanceOptions = {
  maxAdSpendRatio: number;
  maxRecommendations: number;
  maxRefundRate: number;
  minKillProfitVelocity: number;
  minPauseProfitVelocity: number;
  minScaleConversionRate: number;
  minScaleProfitVelocity: number;
  minSnapshotsForKill: number;
  minWatchVisits: number;
  windowDays: number;
};

export type RevenuePerformanceSnapshotInput = {
  adSpend?: number;
  digitalDeliveryCost?: number;
  discounts?: number;
  grossRevenue?: number;
  impressions?: number;
  netProfit?: number;
  notes?: string | null;
  periodEnd: string;
  periodStart: string;
  platformFees?: number;
  productId?: string | null;
  productionCost?: number;
  refunds?: number;
  shippingCost?: number;
  source?: RevenuePerformanceSource;
  storeId: string;
  unitsSold?: number;
  visits?: number;
};

export type RevenuePerformanceSnapshot = Required<Omit<RevenuePerformanceSnapshotInput, "netProfit" | "notes" | "productId" | "source">> & {
  createdAt?: string;
  id: string;
  netProfit: number;
  notes: string | null;
  productId: string | null;
  source: RevenuePerformanceSource;
};

export type RevenuePerformanceScore = {
  adSpendRatio: number;
  conversionRate: number;
  costs: number;
  discounts: number;
  evidenceGrade: "none" | "thin" | "usable" | "strong";
  grossRevenue: number;
  impressions: number;
  netProfit: number;
  netRevenue: number;
  periodDays: number;
  profitMargin: number;
  profitVelocity: number;
  refunds: number;
  refundRate: number;
  revenueVelocity: number;
  snapshots: number;
  unitsSold: number;
  visits: number;
};

export type RevenuePerformanceProductScore = RevenuePerformanceScore & {
  action: RevenueAssetRotationDecision;
  confidence: number;
  productId: string;
  productName: string;
  productType: string;
  reason: string;
  recommendedInternalStatus?: RevenueProductStatus;
  storeId: string;
};

export type RevenuePerformanceStoreScore = RevenuePerformanceScore & {
  action: RevenueAssetRotationDecision;
  confidence: number;
  reason: string;
  recommendedLaunchStatus?: RevenueStoreLaunchStatus;
  scaleProducts: number;
  storeId: string;
  storeName: string;
};

export type RevenuePerformanceRotationChange = {
  action: "pause" | "kill";
  fromStatus: string;
  reason: string;
  targetId: string;
  targetName: string;
  targetType: "store" | "product";
  toStatus: string;
};

export type RevenuePerformanceDigest = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Performance Velocity Ledger";
  options: RevenuePerformanceOptions;
  productScores: RevenuePerformanceProductScore[];
  rotationChanges: RevenuePerformanceRotationChange[];
  snapshots: RevenuePerformanceSnapshot[];
  storeScores: RevenuePerformanceStoreScore[];
  summary: string;
  totals: {
    grossRevenue: number;
    netProfit: number;
    netRevenue: number;
    productsTracked: number;
    profitVelocity: number;
    revenueVelocity: number;
    rotationChanges: number;
    scaleRecommendations: number;
    snapshots: number;
    storesTracked: number;
  };
};

export const defaultRevenuePerformanceOptions: RevenuePerformanceOptions = {
  maxAdSpendRatio: 70,
  maxRecommendations: 25,
  maxRefundRate: 25,
  minKillProfitVelocity: -5,
  minPauseProfitVelocity: -1,
  minScaleConversionRate: 1.5,
  minScaleProfitVelocity: 10,
  minSnapshotsForKill: 2,
  minWatchVisits: 50,
  windowDays: 30
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function finiteNumber(value: number | undefined, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return money(numerator / denominator * 100);
}

function dateMs(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function coveredDays(snapshots: RevenuePerformanceSnapshot[]) {
  if (snapshots.length === 0) return 0;

  const start = Math.min(...snapshots.map((snapshot) => dateMs(snapshot.periodStart)));
  const end = Math.max(...snapshots.map((snapshot) => dateMs(snapshot.periodEnd)));
  return Math.max(1, Math.ceil((end - start) / 86_400_000));
}

function evidenceGrade(score: Pick<RevenuePerformanceScore, "snapshots" | "visits" | "grossRevenue">): RevenuePerformanceScore["evidenceGrade"] {
  if (score.snapshots === 0) return "none";
  if (score.snapshots >= 3 && (score.visits >= 250 || score.grossRevenue >= 500)) return "strong";
  if (score.snapshots >= 2 || score.visits >= 75 || score.grossRevenue >= 100) return "usable";
  return "thin";
}

function aggregate(snapshots: RevenuePerformanceSnapshot[], fallbackDays: number): RevenuePerformanceScore {
  const grossRevenue = money(snapshots.reduce((sum, snapshot) => sum + snapshot.grossRevenue, 0));
  const refunds = money(snapshots.reduce((sum, snapshot) => sum + snapshot.refunds, 0));
  const discounts = money(snapshots.reduce((sum, snapshot) => sum + snapshot.discounts, 0));
  const netRevenue = money(Math.max(0, grossRevenue - refunds - discounts));
  const costs = money(snapshots.reduce((sum, snapshot) => (
    sum
    + snapshot.platformFees
    + snapshot.productionCost
    + snapshot.shippingCost
    + snapshot.adSpend
    + snapshot.digitalDeliveryCost
  ), 0));
  const netProfit = money(snapshots.reduce((sum, snapshot) => sum + snapshot.netProfit, 0));
  const visits = snapshots.reduce((sum, snapshot) => sum + snapshot.visits, 0);
  const impressions = snapshots.reduce((sum, snapshot) => sum + snapshot.impressions, 0);
  const unitsSold = snapshots.reduce((sum, snapshot) => sum + snapshot.unitsSold, 0);
  const periodDays = snapshots.length > 0 ? coveredDays(snapshots) : fallbackDays;
  const score = {
    adSpendRatio: percent(snapshots.reduce((sum, snapshot) => sum + snapshot.adSpend, 0), netRevenue),
    conversionRate: percent(unitsSold, visits),
    costs,
    discounts,
    grossRevenue,
    impressions,
    netProfit,
    netRevenue,
    periodDays,
    profitMargin: percent(netProfit, grossRevenue),
    profitVelocity: money(netProfit / Math.max(periodDays, 1)),
    refunds,
    refundRate: percent(refunds, grossRevenue),
    revenueVelocity: money(netRevenue / Math.max(periodDays, 1)),
    snapshots: snapshots.length,
    unitsSold,
    visits
  };

  return {
    ...score,
    evidenceGrade: evidenceGrade(score)
  };
}

function sourceOrDefault(source: RevenuePerformanceSource | undefined): RevenuePerformanceSource {
  return revenuePerformanceSources.includes(source as RevenuePerformanceSource) ? source as RevenuePerformanceSource : "manual";
}

export function calculateRevenuePerformanceNetProfit(input: RevenuePerformanceSnapshotInput) {
  const grossRevenue = finiteNumber(input.grossRevenue);
  const costs = finiteNumber(input.refunds)
    + finiteNumber(input.discounts)
    + finiteNumber(input.platformFees)
    + finiteNumber(input.productionCost)
    + finiteNumber(input.shippingCost)
    + finiteNumber(input.adSpend)
    + finiteNumber(input.digitalDeliveryCost);

  return money(grossRevenue - costs);
}

export function normalizeRevenuePerformanceSnapshot(input: RevenuePerformanceSnapshotInput & { createdAt?: string; id?: string }): RevenuePerformanceSnapshot {
  return {
    adSpend: money(finiteNumber(input.adSpend)),
    digitalDeliveryCost: money(finiteNumber(input.digitalDeliveryCost)),
    discounts: money(finiteNumber(input.discounts)),
    grossRevenue: money(finiteNumber(input.grossRevenue)),
    id: input.id ?? `performance_${input.storeId}_${input.productId ?? "store"}_${dateMs(input.periodEnd)}`,
    impressions: Math.max(0, Math.round(finiteNumber(input.impressions))),
    netProfit: money(input.netProfit ?? calculateRevenuePerformanceNetProfit(input)),
    notes: input.notes ?? null,
    periodEnd: input.periodEnd,
    periodStart: input.periodStart,
    platformFees: money(finiteNumber(input.platformFees)),
    productId: input.productId ?? null,
    productionCost: money(finiteNumber(input.productionCost)),
    refunds: money(finiteNumber(input.refunds)),
    shippingCost: money(finiteNumber(input.shippingCost)),
    source: sourceOrDefault(input.source),
    storeId: input.storeId,
    unitsSold: Math.max(0, Math.round(finiteNumber(input.unitsSold))),
    visits: Math.max(0, Math.round(finiteNumber(input.visits))),
    createdAt: input.createdAt
  };
}

export function withRevenuePerformanceOptions(input: Partial<RevenuePerformanceOptions> = {}): RevenuePerformanceOptions {
  return {
    maxAdSpendRatio: clamp(input.maxAdSpendRatio ?? defaultRevenuePerformanceOptions.maxAdSpendRatio, 0, 10_000),
    maxRecommendations: clamp(Math.round(input.maxRecommendations ?? defaultRevenuePerformanceOptions.maxRecommendations), 1, 250),
    maxRefundRate: clamp(input.maxRefundRate ?? defaultRevenuePerformanceOptions.maxRefundRate, 0, 10_000),
    minKillProfitVelocity: clamp(input.minKillProfitVelocity ?? defaultRevenuePerformanceOptions.minKillProfitVelocity, -999_999, 0),
    minPauseProfitVelocity: clamp(input.minPauseProfitVelocity ?? defaultRevenuePerformanceOptions.minPauseProfitVelocity, -999_999, 999_999),
    minScaleConversionRate: clamp(input.minScaleConversionRate ?? defaultRevenuePerformanceOptions.minScaleConversionRate, 0, 100),
    minScaleProfitVelocity: clamp(input.minScaleProfitVelocity ?? defaultRevenuePerformanceOptions.minScaleProfitVelocity, 0, 999_999),
    minSnapshotsForKill: clamp(Math.round(input.minSnapshotsForKill ?? defaultRevenuePerformanceOptions.minSnapshotsForKill), 1, 25),
    minWatchVisits: clamp(Math.round(input.minWatchVisits ?? defaultRevenuePerformanceOptions.minWatchVisits), 0, 1_000_000),
    windowDays: clamp(Math.round(input.windowDays ?? defaultRevenuePerformanceOptions.windowDays), 1, 365)
  };
}

function decideProduct(
  product: RevenueEngineProductSnapshot,
  score: RevenuePerformanceScore,
  options: RevenuePerformanceOptions
): RevenuePerformanceProductScore {
  const base = {
    ...score,
    productId: product.id,
    productName: product.productName,
    productType: product.productType,
    storeId: product.storeId
  };

  if (score.snapshots === 0) {
    return {
      ...base,
      action: "watch",
      confidence: 45,
      reason: "No performance snapshots are available yet; keep this asset in observation mode."
    };
  }

  if (score.snapshots >= options.minSnapshotsForKill && score.profitVelocity <= options.minKillProfitVelocity) {
    return {
      ...base,
      action: "kill",
      confidence: score.evidenceGrade === "strong" ? 92 : 84,
      reason: `Profit velocity is ${money(score.profitVelocity)} per day across ${score.snapshots} snapshots; archive this asset internally before more effort is spent.`,
      recommendedInternalStatus: "Archived"
    };
  }

  if (score.profitVelocity <= options.minPauseProfitVelocity || score.adSpendRatio > options.maxAdSpendRatio || score.refundRate > options.maxRefundRate) {
    return {
      ...base,
      action: "pause",
      confidence: score.evidenceGrade === "thin" ? 72 : 86,
      reason: `Performance is weak: profit velocity ${money(score.profitVelocity)} per day, ad ratio ${score.adSpendRatio}%, refund rate ${score.refundRate}%.`,
      recommendedInternalStatus: "Needs Revision"
    };
  }

  if (score.visits >= options.minWatchVisits && score.unitsSold === 0) {
    return {
      ...base,
      action: "watch",
      confidence: 78,
      reason: `${score.visits} visits produced no units sold; keep the asset under watch until a concrete offer, price, mockup, or listing-copy improvement is available.`
    };
  }

  if (
    score.profitVelocity >= options.minScaleProfitVelocity
    && score.conversionRate >= options.minScaleConversionRate
    && score.profitMargin >= 20
  ) {
    return {
      ...base,
      action: "scale",
      confidence: score.evidenceGrade === "strong" ? 93 : 86,
      reason: `Profit velocity ${money(score.profitVelocity)} per day, conversion ${score.conversionRate}%, and margin ${score.profitMargin}% meet scale thresholds.`
    };
  }

  return {
    ...base,
    action: "watch",
    confidence: score.evidenceGrade === "thin" ? 62 : 74,
    reason: "Performance data is usable but does not yet justify scale, revision, pause, or archival."
  };
}

function decideStore(
  store: RevenueEngineStoreSnapshot,
  score: RevenuePerformanceScore,
  productScores: RevenuePerformanceProductScore[],
  options: RevenuePerformanceOptions
): RevenuePerformanceStoreScore {
  const scaleProducts = productScores.filter((product) => product.storeId === store.id && product.action === "scale").length;
  const weakProducts = productScores.filter((product) => (
    product.storeId === store.id
    && (product.action === "kill" || product.action === "pause")
  )).length;
  const base = {
    ...score,
    scaleProducts,
    storeId: store.id,
    storeName: store.businessName
  };

  if (score.snapshots === 0) {
    return {
      ...base,
      action: "watch",
      confidence: 44,
      reason: "No store-level performance snapshots are available yet."
    };
  }

  if (score.profitVelocity <= options.minPauseProfitVelocity && weakProducts > scaleProducts) {
    return {
      ...base,
      action: "pause",
      confidence: score.evidenceGrade === "thin" ? 70 : 84,
      reason: `Store profit velocity is ${money(score.profitVelocity)} per day and weak product signals outnumber scale signals.`,
      recommendedLaunchStatus: "Paused"
    };
  }

  if (scaleProducts >= 2 || score.profitVelocity >= options.minScaleProfitVelocity * 2) {
    return {
      ...base,
      action: "scale",
      confidence: score.evidenceGrade === "strong" ? 92 : 86,
      reason: `${scaleProducts} products show scale signals and store profit velocity is ${money(score.profitVelocity)} per day.`
    };
  }

  return {
    ...base,
    action: "watch",
    confidence: score.evidenceGrade === "thin" ? 61 : 73,
    reason: "Store performance does not yet justify scale or pause."
  };
}

function createRotationChanges(input: {
  options: RevenuePerformanceOptions;
  productScores: RevenuePerformanceProductScore[];
  products: RevenueEngineProductSnapshot[];
  storeScores: RevenuePerformanceStoreScore[];
  stores: RevenueEngineStoreSnapshot[];
}) {
  const productsById = new Map(input.products.map((product) => [product.id, product]));
  const storesById = new Map(input.stores.map((store) => [store.id, store]));
  const productChanges = input.productScores
    .filter((score) => (
      (score.action === "kill" || score.action === "pause")
      && score.recommendedInternalStatus
      && productsById.get(score.productId)?.status !== score.recommendedInternalStatus
    ))
    .map((score): RevenuePerformanceRotationChange => ({
      action: score.action === "kill" ? "kill" : "pause",
      fromStatus: productsById.get(score.productId)?.status ?? "Unknown",
      reason: score.reason,
      targetId: score.productId,
      targetName: score.productName,
      targetType: "product",
      toStatus: score.recommendedInternalStatus ?? "Needs Revision"
    }));
  const storeChanges = input.storeScores
    .filter((score) => (
      score.action === "pause"
      && score.recommendedLaunchStatus
      && storesById.get(score.storeId)?.launchStatus !== score.recommendedLaunchStatus
    ))
    .map((score): RevenuePerformanceRotationChange => ({
      action: "pause",
      fromStatus: storesById.get(score.storeId)?.launchStatus ?? "Unknown",
      reason: score.reason,
      targetId: score.storeId,
      targetName: score.storeName,
      targetType: "store",
      toStatus: score.recommendedLaunchStatus ?? "Paused"
    }));

  const priority: Record<RevenuePerformanceRotationChange["action"], number> = {
    kill: 1,
    pause: 2
  };

  return [...productChanges, ...storeChanges]
    .sort((a, b) => priority[a.action] - priority[b.action])
    .slice(0, input.options.maxRecommendations);
}

export function buildRevenuePerformanceDigest(input: {
  generatedAt?: string;
  options?: Partial<RevenuePerformanceOptions>;
  products: RevenueEngineProductSnapshot[];
  snapshots: RevenuePerformanceSnapshot[];
  stores: RevenueEngineStoreSnapshot[];
}): RevenuePerformanceDigest {
  const options = withRevenuePerformanceOptions(input.options);
  const cutoff = Date.now() - options.windowDays * 86_400_000;
  const snapshots = input.snapshots
    .filter((snapshot) => dateMs(snapshot.periodEnd) >= cutoff)
    .map((snapshot) => normalizeRevenuePerformanceSnapshot(snapshot))
    .sort((a, b) => dateMs(b.periodEnd) - dateMs(a.periodEnd));
  const productScores = input.products
    .map((product) => {
      const score = aggregate(snapshots.filter((snapshot) => snapshot.productId === product.id), options.windowDays);
      return decideProduct(product, score, options);
    })
    .sort((a, b) => {
      if (a.action !== b.action) {
        const priority: Record<RevenueAssetRotationDecision, number> = {
          kill: 1,
          pause: 2,
          scale: 3,
          watch: 4
        };
        return priority[a.action] - priority[b.action];
      }

      return b.confidence - a.confidence || b.netProfit - a.netProfit;
    });
  const storeScores = input.stores
    .map((store) => {
      const score = aggregate(snapshots.filter((snapshot) => snapshot.storeId === store.id), options.windowDays);
      return decideStore(store, score, productScores, options);
    })
    .sort((a, b) => b.confidence - a.confidence || b.netProfit - a.netProfit);
  const rotationChanges = createRotationChanges({
    options,
    productScores,
    products: input.products,
    storeScores,
    stores: input.stores
  });
  const totalScore = aggregate(snapshots, options.windowDays);
  const scaleRecommendations = productScores.filter((score) => score.action === "scale").length
    + storeScores.filter((score) => score.action === "scale").length;

  return {
    auditEvents: [
      "Revenue performance snapshots evaluated inside ENTRAL.",
      "Manual and approved connector data can be scored; no marketplace, payment, ad, or browser automation source is contacted by this digest.",
      "Performance rotation changes modify ENTRAL internal records only and require explicit confirmation."
    ],
    blockedExternalActions: [
      "Importing marketplace analytics without an approved read-only connector",
      "Changing Shopify, Etsy, Printify, Printful, Stripe, ad, or social records",
      "Publishing or unpublishing listings",
      "Starting, pausing, or changing external ad spend",
      "Moving money or issuing payouts",
      "Using browser stealth, anti-detection, or platform-evasion automation"
    ],
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Internal Performance Velocity Ledger",
    options,
    productScores,
    rotationChanges,
    snapshots,
    storeScores,
    summary: `${snapshots.length} performance snapshots scored across ${input.stores.length} stores and ${input.products.length} products. Net profit is ${money(totalScore.netProfit)} with ${money(totalScore.profitVelocity)} daily profit velocity; ${scaleRecommendations} scale signals and ${rotationChanges.length} internal rotation changes are queued.`,
    totals: {
      grossRevenue: totalScore.grossRevenue,
      netProfit: totalScore.netProfit,
      netRevenue: totalScore.netRevenue,
      productsTracked: productScores.filter((score) => score.snapshots > 0).length,
      profitVelocity: totalScore.profitVelocity,
      revenueVelocity: totalScore.revenueVelocity,
      rotationChanges: rotationChanges.length,
      scaleRecommendations,
      snapshots: snapshots.length,
      storesTracked: storeScores.filter((score) => score.snapshots > 0).length
    }
  };
}
