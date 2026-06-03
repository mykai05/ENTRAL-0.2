import { generateProductBatch, type ProductBatchRiskTolerance, type ProductBatchStore } from "./productBatchGenerator.js";
import {
  buildRevenueAssetPortfolio,
  buildRevenueEnginePlan,
  type RevenueAssetPortfolio,
  type RevenueAssetRotationDecision,
  type RevenueAssetScore,
  type RevenueAssetScoreBand,
  type RevenueAssetScoreBreakdown,
  type RevenueEngineProductSnapshot,
  type RevenueEngineStoreSnapshot,
  type RevenueEngineThresholds,
  type RevenueProductStatus
} from "./revenueEngine.js";
import {
  buildFirstBusinessLaunchPackageFromMoneyArmyCandidates,
  type RevenueFirstBusinessLaunchPackagePlan
} from "./revenueFirstBusinessLaunchPackage.js";

export type RevenueMoneyArmyGenerateScoreBatchOptions = Partial<RevenueEngineThresholds> & {
  candidateCount?: number;
  generatedAt?: string;
  priceRange?: {
    max: number;
    min: number;
  };
  productTypes?: string[];
  riskTolerance?: ProductBatchRiskTolerance;
  storeIds?: string[];
};

export type RevenueMoneyArmyPressureSignal = {
  assets: Array<{
    assetId: string;
    assetName: string;
    recommendation: RevenueAssetRotationDecision;
    score: number;
    storeId: string;
    storeName: string;
  }>;
  level: "none" | "low" | "medium" | "high";
  pressureScore: number;
  reason: string;
};

export type RevenueMoneyArmyRotationRecommendation = {
  assetId: string;
  assetName: string;
  assetType: RevenueAssetScore["assetType"];
  currentState: string;
  externalExecution: false;
  nextInternalState: string | null;
  providerContacted: false;
  reason: string;
  recommendation: RevenueAssetRotationDecision;
  riskLevel: RevenueAssetScore["riskLevel"];
  score: number;
  scoreBand: RevenueAssetScoreBand;
  storeId: string;
  storeName: string;
};

export type RevenueMoneyArmyGeneratedAssetCandidate = {
  assetScore: RevenueAssetScoreBreakdown;
  auditOnly: true;
  candidateId: string;
  confidence: number;
  designConcept: string;
  externalExecution: false;
  listingTitle: string;
  nextInternalState: string | null;
  organicContentTieIn: {
    approvalState: "internal_draft_only";
    channel: "youtube_shorts" | "tiktok" | "instagram_reels";
    hook: string;
    path: "organic_first";
  };
  productName: string;
  productType: string;
  profitMargin: number;
  providerContacted: false;
  recommendation: RevenueAssetRotationDecision;
  retailPrice: number;
  riskLevel: RevenueAssetScore["riskLevel"];
  rotationDecision: RevenueAssetRotationDecision;
  rotationReason: string;
  score: number;
  scoreBand: RevenueAssetScoreBand;
  sourceProductId: string | null;
  sourceProductName: string | null;
  sourceStoreId: string;
  sourceStoreName: string;
  status: RevenueProductStatus;
  tags: string[];
};

export type RevenueMoneyArmyGenerateScoreBatchPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  candidates: RevenueMoneyArmyGeneratedAssetCandidate[];
  currentPortfolio: {
    generatedAt: string;
    rotationRecommendations: RevenueMoneyArmyRotationRecommendation[];
    summary: string;
    totals: RevenueAssetPortfolio["totals"];
  };
  externalExecution: false;
  generatedAt: string;
  mode: "Money Army Generate & Score Batch";
  providerContacted: false;
  firstBusinessLaunchPackage: RevenueFirstBusinessLaunchPackagePlan | null;
  rotationRecommendations: RevenueMoneyArmyRotationRecommendation[];
  rotationSummary: Record<RevenueAssetRotationDecision, number>;
  scalePressure: RevenueMoneyArmyPressureSignal;
  killPressure: RevenueMoneyArmyPressureSignal;
  summary: string;
  totals: {
    generated: number;
    kill: number;
    pause: number;
    requested: number;
    scale: number;
    sourceProducts: number;
    sourceStores: number;
    watch: number;
  };
};

const blockedMoneyArmyGenerateScoreBatchActions = [
  "Creating live marketplace listings",
  "Uploading products or artwork to POD providers",
  "Posting faceless content externally",
  "Starting, increasing, or moving ad spend",
  "Moving money, issuing payouts, or changing payment settings",
  "Running browser automation, account warmup, proxy rotation, stealth, or platform-evasion workflows"
];

const supportedBatchSizes = [25, 15, 10, 5] as const;
const contentChannels = ["youtube_shorts", "tiktok", "instagram_reels"] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function safeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "asset";
}

function selectBatchSize(remaining: number) {
  return supportedBatchSizes.find((size) => remaining >= size) ?? 5;
}

function storeBatchSnapshot(store: RevenueEngineStoreSnapshot): ProductBatchStore {
  return {
    audience: store.audience,
    brandStyle: store.brandStyle,
    businessName: store.businessName,
    clientName: store.clientName,
    id: store.id,
    industry: store.industry,
    productTypes: store.productTypes
  };
}

function productsForStore(products: RevenueEngineProductSnapshot[], storeId: string) {
  return products.filter((product) => product.storeId === storeId);
}

function priceRangeForStore(
  storeProducts: RevenueEngineProductSnapshot[],
  override?: RevenueMoneyArmyGenerateScoreBatchOptions["priceRange"]
) {
  if (override) {
    return {
      max: money(Math.max(override.min, override.max)),
      min: money(Math.min(override.min, override.max))
    };
  }

  const prices = storeProducts.map((product) => product.retailPrice).filter((price) => price > 0);

  if (prices.length === 0) {
    return {
      max: 64,
      min: 18
    };
  }

  return {
    max: money(Math.max(...prices, 36)),
    min: money(Math.max(12, Math.min(...prices)))
  };
}

function productTypesForStore(
  store: RevenueEngineStoreSnapshot,
  storeProducts: RevenueEngineProductSnapshot[],
  override?: string[]
) {
  const values = [
    ...(override ?? []),
    ...storeProducts.map((product) => product.productType),
    ...store.productTypes
  ].map((value) => value.trim()).filter(Boolean);

  return Array.from(new Set(values)).slice(0, 12);
}

function generatedStatusFor(score: RevenueAssetScore): RevenueProductStatus {
  if (score.recommendation === "kill") return "Archived";
  if (score.recommendation === "pause") return "Needs Revision";

  return "Awaiting Approval";
}

function rotationSummary(assets: Pick<RevenueAssetScore, "recommendation">[]): Record<RevenueAssetRotationDecision, number> {
  return assets.reduce<Record<RevenueAssetRotationDecision, number>>((counts, asset) => {
    counts[asset.recommendation] += 1;
    return counts;
  }, {
    kill: 0,
    pause: 0,
    scale: 0,
    watch: 0
  });
}

function pressureLevel(score: number): RevenueMoneyArmyPressureSignal["level"] {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  if (score > 0) return "low";

  return "none";
}

function pressureAssets(assets: RevenueAssetScore[]) {
  return assets.slice(0, 8).map((asset) => ({
    assetId: asset.assetId,
    assetName: asset.assetName,
    recommendation: asset.recommendation,
    score: asset.score,
    storeId: asset.storeId,
    storeName: asset.storeName
  }));
}

function buildScalePressure(candidates: RevenueAssetScore[]): RevenueMoneyArmyPressureSignal {
  const scaleAssets = candidates.filter((asset) => asset.recommendation === "scale");
  const strongWatchAssets = candidates.filter((asset) => asset.recommendation === "watch" && asset.score >= 70 && asset.riskLevel !== "high");
  const strongAssets = [...scaleAssets, ...strongWatchAssets].sort((left, right) => right.score - left.score);

  if (strongAssets.length === 0) {
    return {
      assets: [],
      level: "none",
      pressureScore: 0,
      reason: "No generated candidates currently meet the internal scale-pressure floor."
    };
  }

  const averageScore = strongAssets.reduce((sum, asset) => sum + asset.score, 0) / strongAssets.length;
  const estimatedProfit = strongAssets.reduce((sum, asset) => sum + Math.max(0, asset.economics.estimatedProfit), 0);
  const pressureScore = clamp(Math.round(
    averageScore * 0.54
    + Math.min(24, scaleAssets.length * 12)
    + Math.min(16, strongWatchAssets.length * 4)
    + Math.min(18, estimatedProfit / 20)
  ), 0, 100);

  return {
    assets: pressureAssets(strongAssets),
    level: pressureLevel(pressureScore),
    pressureScore,
    reason: `${strongAssets.length} generated candidate${strongAssets.length === 1 ? "" : "s"} show internal scale pressure before any external spend is allowed.`
  };
}

function buildKillPressure(candidates: RevenueAssetScore[]): RevenueMoneyArmyPressureSignal {
  const killAssets = candidates.filter((asset) => asset.recommendation === "kill");
  const pauseAssets = candidates.filter((asset) => asset.recommendation === "pause");
  const highRiskAssets = candidates.filter((asset) => asset.riskLevel === "high");
  const weakAssets = [...killAssets, ...pauseAssets, ...highRiskAssets]
    .filter((asset, index, all) => all.findIndex((item) => item.assetId === asset.assetId) === index)
    .sort((left, right) => left.score - right.score);

  if (weakAssets.length === 0) {
    return {
      assets: [],
      level: "none",
      pressureScore: 0,
      reason: "No generated candidates require kill or pause pressure."
    };
  }

  const weakness = weakAssets.reduce((sum, asset) => sum + (100 - asset.score), 0) / weakAssets.length;
  const pressureScore = clamp(Math.round(
    weakness * 0.38
    + killAssets.length * 22
    + pauseAssets.length * 11
    + highRiskAssets.length * 10
  ), 0, 100);

  return {
    assets: pressureAssets(weakAssets),
    level: pressureLevel(pressureScore),
    pressureScore,
    reason: `${weakAssets.length} generated candidate${weakAssets.length === 1 ? "" : "s"} should be paused, repaired, or killed before they consume internal launch capacity.`
  };
}

function rotationRecommendation(asset: RevenueAssetScore): RevenueMoneyArmyRotationRecommendation {
  return {
    assetId: asset.assetId,
    assetName: asset.assetName,
    assetType: asset.assetType,
    currentState: String(asset.readiness.status),
    externalExecution: false,
    nextInternalState: asset.nextInternalState,
    providerContacted: false,
    reason: asset.reason,
    recommendation: asset.recommendation,
    riskLevel: asset.riskLevel,
    score: asset.score,
    scoreBand: asset.scoreBand,
    storeId: asset.storeId,
    storeName: asset.storeName
  };
}

function candidateFromScore(input: {
  generatedProduct: RevenueEngineProductSnapshot;
  score: RevenueAssetScore;
  sourceProduct: RevenueEngineProductSnapshot | null;
  store: RevenueEngineStoreSnapshot;
}): RevenueMoneyArmyGeneratedAssetCandidate {
  const channel = contentChannels[Math.abs(input.score.assetId.length + input.score.score) % contentChannels.length] ?? "youtube_shorts";

  return {
    assetScore: input.score.assetScore,
    auditOnly: true,
    candidateId: input.score.assetId,
    confidence: input.score.confidence,
    designConcept: input.generatedProduct.designConcept,
    externalExecution: false,
    listingTitle: input.generatedProduct.listingTitle ?? input.generatedProduct.productName,
    nextInternalState: input.score.nextInternalState,
    organicContentTieIn: {
      approvalState: "internal_draft_only",
      channel,
      hook: `Show the ${input.generatedProduct.productName} idea through a short organic story for ${input.store.audience}.`,
      path: "organic_first"
    },
    productName: input.generatedProduct.productName,
    productType: input.generatedProduct.productType,
    profitMargin: input.generatedProduct.profitMargin,
    providerContacted: false,
    recommendation: input.score.recommendation,
    retailPrice: input.generatedProduct.retailPrice,
    riskLevel: input.score.riskLevel,
    rotationDecision: input.score.rotationDecision,
    rotationReason: input.score.rotationReason,
    score: input.score.score,
    scoreBand: input.score.scoreBand,
    sourceProductId: input.sourceProduct?.id ?? null,
    sourceProductName: input.sourceProduct?.productName ?? null,
    sourceStoreId: input.store.id,
    sourceStoreName: input.store.businessName,
    status: generatedStatusFor(input.score),
    tags: input.generatedProduct.tags
  };
}

export function buildRevenueMoneyArmyGenerateScoreBatchPlan(input: {
  currentPortfolio: RevenueAssetPortfolio;
  options?: RevenueMoneyArmyGenerateScoreBatchOptions;
  products: RevenueEngineProductSnapshot[];
  stores: RevenueEngineStoreSnapshot[];
}): RevenueMoneyArmyGenerateScoreBatchPlan {
  const generatedAt = input.options?.generatedAt ?? new Date().toISOString();
  const requested = clamp(Math.round(input.options?.candidateCount ?? 25), 10, 50);
  const selectedStoreIds = new Set((input.options?.storeIds ?? []).filter(Boolean));
  const sourceStores = input.stores
    .filter((store) => selectedStoreIds.size === 0 || selectedStoreIds.has(store.id))
    .filter((store) => store.launchStatus !== "Archived");
  const generatedProducts: Array<{
    product: RevenueEngineProductSnapshot;
    sourceProduct: RevenueEngineProductSnapshot | null;
    store: RevenueEngineStoreSnapshot;
  }> = [];

  if (sourceStores.length > 0) {
    let storeIndex = 0;

    while (generatedProducts.length < requested) {
      const store = sourceStores[storeIndex % sourceStores.length];
      const storeProducts = productsForStore(input.products, store.id);
      const sourceProduct = storeProducts[generatedProducts.length % Math.max(storeProducts.length, 1)] ?? null;
      const remaining = requested - generatedProducts.length;
      const batchSize = selectBatchSize(remaining);
      const batch = generateProductBatch(storeBatchSnapshot(store), {
        audience: store.audience,
        priceRange: priceRangeForStore(storeProducts, input.options?.priceRange),
        productCount: batchSize,
        productTypes: productTypesForStore(store, storeProducts, input.options?.productTypes),
        riskTolerance: input.options?.riskTolerance ?? "Low",
        storeId: store.id,
        styleDirection: [
          store.brandStyle,
          sourceProduct ? `Use ${sourceProduct.productName} as the internal source lane without copying protected or third-party material.` : "Generate original internal product lanes only."
        ].join(" ")
      }).slice(0, remaining);

      for (const draft of batch) {
        const candidateNumber = generatedProducts.length + 1;
        const candidateId = `money_army_candidate_${safeId(store.id)}_${String(candidateNumber).padStart(3, "0")}`;
        const candidateName = `${draft.productName} Candidate ${candidateNumber}`;

        generatedProducts.push({
          product: {
            aiDisclosureNeeded: draft.aiDisclosureNeeded,
            complianceNotes: draft.complianceNotes,
            designConcept: draft.designConcept,
            designPrompt: draft.designPrompt,
            designTheme: draft.designTheme,
            estimatedProfit: draft.estimatedProfit,
            id: candidateId,
            listingDescription: draft.listingDescription,
            listingTitle: draft.listingTitle ?? candidateName,
            productName: candidateName,
            productType: draft.productType,
            productionPartnerDisclosureNeeded: draft.productionPartnerDisclosureNeeded,
            profitMargin: draft.profitMargin,
            retailPrice: draft.retailPrice,
            status: "Awaiting Approval",
            storeId: store.id,
            tags: Array.from(new Set([
              ...draft.tags,
              "money army candidate",
              "organic first"
            ])).slice(0, 13)
          },
          sourceProduct,
          store
        });
      }

      storeIndex += 1;
    }
  }

  const generatedProductSnapshots = generatedProducts.map((item) => item.product);
  const generatedCandidateIds = new Set(generatedProductSnapshots.map((product) => product.id));
  const scoredPlan = buildRevenueEnginePlan({
    generatedAt,
    products: [
      ...input.products,
      ...generatedProductSnapshots
    ],
    stores: sourceStores.length > 0 ? sourceStores : input.stores,
    thresholds: input.options
  });
  const generatedPortfolio = buildRevenueAssetPortfolio(scoredPlan);
  const generatedAssetScores = generatedPortfolio.assets
    .filter((asset) => generatedCandidateIds.has(asset.assetId))
    .sort((left, right) => right.score - left.score || left.priority - right.priority);
  const byProductId = new Map(generatedProducts.map((item) => [item.product.id, item]));
  const candidates = generatedAssetScores
    .map((score) => {
      const source = byProductId.get(score.assetId);

      if (!source) return null;

      return candidateFromScore({
        generatedProduct: source.product,
        score,
        sourceProduct: source.sourceProduct,
        store: source.store
      });
    })
    .filter((candidate): candidate is RevenueMoneyArmyGeneratedAssetCandidate => Boolean(candidate));
  const rotationRecommendations = generatedAssetScores.map(rotationRecommendation);
  const currentPortfolioRecommendations = input.currentPortfolio.assets
    .slice(0, 50)
    .map(rotationRecommendation);
  const summaryCounts = rotationSummary(generatedAssetScores);
  const sourceProductIds = new Set(generatedProducts.map((item) => item.sourceProduct?.id).filter(Boolean));
  const scalePressure = buildScalePressure(generatedAssetScores);
  const killPressure = buildKillPressure(generatedAssetScores);
  const firstBusinessLaunchPackage = buildFirstBusinessLaunchPackageFromMoneyArmyCandidates({
    candidates,
    generatedAt,
    killPressure,
    products: input.products,
    scalePressure,
    stores: input.stores
  });

  return {
    auditEvents: [
      "Money Army Generate & Score Batch created internal-only candidate drafts from existing store and product records.",
      "Every generated candidate was scored by the Revenue Engine and reduced to scale, watch, pause, or kill.",
      "Generated candidates are not provider records, marketplace listings, social posts, ad campaigns, or payout instructions.",
      "Recording this batch creates audit history only; external execution requires separate explicit approval gates."
    ],
    blockedExternalActions: blockedMoneyArmyGenerateScoreBatchActions,
    candidates,
    currentPortfolio: {
      generatedAt: input.currentPortfolio.generatedAt,
      rotationRecommendations: currentPortfolioRecommendations,
      summary: input.currentPortfolio.summary,
      totals: input.currentPortfolio.totals
    },
    externalExecution: false,
    generatedAt,
    mode: "Money Army Generate & Score Batch",
    providerContacted: false,
    firstBusinessLaunchPackage,
    rotationRecommendations,
    rotationSummary: summaryCounts,
    scalePressure,
    killPressure,
    summary: `${candidates.length} Money Army candidate${candidates.length === 1 ? "" : "s"} generated and scored from ${sourceStores.length} source store${sourceStores.length === 1 ? "" : "s"}: ${summaryCounts.scale} scale, ${summaryCounts.watch} watch, ${summaryCounts.pause} pause, ${summaryCounts.kill} kill. External execution remains locked.`,
    totals: {
      generated: candidates.length,
      kill: summaryCounts.kill,
      pause: summaryCounts.pause,
      requested,
      scale: summaryCounts.scale,
      sourceProducts: sourceProductIds.size,
      sourceStores: sourceStores.length,
      watch: summaryCounts.watch
    }
  };
}
