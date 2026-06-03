import type {
  RevenueMoneyArmyGeneratedAssetCandidate,
  RevenueMoneyArmyPressureSignal
} from "./revenueMoneyArmyGenerateScoreBatch.js";
import type {
  RevenueEngineProductSnapshot,
  RevenueEngineStoreSnapshot
} from "./revenueEngine.js";

export type RevenueFirstBusinessLaunchPackageStatus = "ready_for_approval" | "manual_gate" | "blocked";

export type RevenueFirstBusinessLaunchPackageProduct = {
  approvalState: "ready_to_approve" | "needs_manual_review" | "blocked";
  candidateId: string;
  complianceNotes: string;
  designConcept: string;
  designPrompt: string;
  designTheme: string;
  internalDesignDraft: {
    aiProviderUsed: false;
    approvalGate: {
      externalExecutionLocked: true;
      humanApprovalRequired: true;
      reason: string;
      status: "Required";
    };
    assetChecklist: string[];
    externalGeneration: false;
    mockupDirection: string;
    negativePrompt: string;
    palette: string[];
    placement: string;
    prompt: string;
    providerContacted: false;
    typography: string;
  };
  listingDescription: string;
  listingTitle: string;
  productName: string;
  productType: string;
  profitMargin: number;
  recommendation: RevenueMoneyArmyGeneratedAssetCandidate["recommendation"];
  retailPrice: number;
  rotationReason: string;
  score: number;
  scoreBand: RevenueMoneyArmyGeneratedAssetCandidate["scoreBand"];
  sourceProductId: string | null;
  sourceProductName: string | null;
  tags: string[];
};

export type RevenueFirstBusinessLaunchPackageContentIdea = {
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    reason: string;
    status: "Required";
  };
  candidateId: string;
  channel: RevenueMoneyArmyGeneratedAssetCandidate["organicContentTieIn"]["channel"];
  externalExecution: false;
  hook: string;
  id: string;
  productName: string;
  providerContacted: false;
  scriptAngle: string;
  status: "internal_draft_only";
};

export type RevenueFirstBusinessLaunchPackageOrganicMove = {
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    reason: string;
    status: "Required";
  };
  channel: "listing" | "youtube_shorts" | "tiktok" | "instagram_reels" | "manual_signal_tracking" | "storefront_seo" | "community_outreach" | "email_capture";
  expectedInternalEffect: string;
  externalExecution: false;
  id: string;
  providerContacted: false;
  title: string;
};

export type RevenueFirstBusinessLaunchPackagePlan = {
  approvalChecklist: Array<{
    category: "store" | "products" | "designs" | "content" | "traffic" | "finance" | "evidence";
    externalExecutionLocked: true;
    required: true;
    title: string;
  }>;
  auditEvents: string[];
  blockedExternalActions: string[];
  contentIdeas: RevenueFirstBusinessLaunchPackageContentIdea[];
  externalExecution: false;
  generatedAt: string;
  manualApprovalGates: string[];
  mode: "First Business Launch Package";
  organicFirstMoves: RevenueFirstBusinessLaunchPackageOrganicMove[];
  packageId: string;
  products: RevenueFirstBusinessLaunchPackageProduct[];
  providerContacted: false;
  scalePressure: RevenueMoneyArmyPressureSignal;
  killPressure: RevenueMoneyArmyPressureSignal;
  status: RevenueFirstBusinessLaunchPackageStatus;
  store: {
    audience: string;
    businessName: string;
    industry: string;
    launchStatus: string;
    sourceStoreId: string;
    storePlatform: string;
  };
  summary: string;
  totals: {
    contentIdeas: number;
    manualApprovalGates: number;
    organicMoves: number;
    products: number;
    readyToApproveProducts: number;
    scaleCandidates: number;
    watchCandidates: number;
  };
};

const launchPackageBlockedActions = [
  "Publishing marketplace listings or changing storefront settings",
  "Creating provider-side products, uploading artwork, or contacting POD providers",
  "Posting faceless content or scheduling social posts",
  "Starting, increasing, or moving ad spend",
  "Moving money, issuing payouts, changing payment settings, or calling bank APIs",
  "Running browser automation, stealth, proxies, account warmup, CAPTCHA bypass, or platform-evasion workflows"
];

function safeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "package";
}

function unique<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))) as T[];
}

function approvalStateFor(candidate: RevenueMoneyArmyGeneratedAssetCandidate): RevenueFirstBusinessLaunchPackageProduct["approvalState"] {
  if (candidate.recommendation === "kill") return "blocked";
  if (candidate.recommendation === "pause" || candidate.riskLevel === "high") return "needs_manual_review";

  return "ready_to_approve";
}

function candidatePriority(candidate: RevenueMoneyArmyGeneratedAssetCandidate) {
  const recommendationBoost = candidate.recommendation === "scale" ? 35
    : candidate.recommendation === "watch" ? 18
      : candidate.recommendation === "pause" ? -20 : -40;
  const riskPenalty = candidate.riskLevel === "high" ? 30 : candidate.riskLevel === "medium" ? 10 : 0;

  return candidate.score + recommendationBoost - riskPenalty + Math.max(0, candidate.profitMargin / 4);
}

function selectLaunchStore(candidates: RevenueMoneyArmyGeneratedAssetCandidate[]) {
  const groups = new Map<string, RevenueMoneyArmyGeneratedAssetCandidate[]>();

  for (const candidate of candidates) {
    groups.set(candidate.sourceStoreId, [...(groups.get(candidate.sourceStoreId) ?? []), candidate]);
  }

  return [...groups.entries()]
    .map(([storeId, storeCandidates]) => ({
      score: storeCandidates.reduce((sum, candidate) => sum + candidatePriority(candidate), 0) / Math.max(storeCandidates.length, 1)
        + storeCandidates.filter((candidate) => candidate.recommendation === "scale").length * 20
        + storeCandidates.filter((candidate) => candidate.recommendation === "watch").length * 6
        - storeCandidates.filter((candidate) => candidate.recommendation === "kill" || candidate.recommendation === "pause").length * 24,
      storeCandidates,
      storeId
    }))
    .sort((left, right) => right.score - left.score)[0] ?? null;
}

function productPackageFor(candidate: RevenueMoneyArmyGeneratedAssetCandidate): RevenueFirstBusinessLaunchPackageProduct {
  const prompt = [
    candidate.designPrompt,
    `Create an original ${candidate.productType} design for ${candidate.sourceStoreName}.`,
    `Audience: ${candidate.productName}; style theme: ${candidate.designTheme}; keep all copy and artwork original.`
  ].filter(Boolean).join(" ");

  return {
    approvalState: approvalStateFor(candidate),
    candidateId: candidate.candidateId,
    complianceNotes: candidate.complianceNotes,
    designConcept: candidate.designConcept,
    designPrompt: candidate.designPrompt,
    designTheme: candidate.designTheme,
    internalDesignDraft: {
      aiProviderUsed: false,
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason: "Design draft is an internal AI-ready prompt and production brief only. Explicit approval is required before any AI image provider, designer, POD provider, upload, or marketplace action.",
        status: "Required"
      },
      assetChecklist: [
        "Verify all words, symbols, and visual references are original or owned by the store.",
        "Confirm production-safe placement, readable contrast, and product-type fit.",
        "Create or approve final artwork files only after operator approval.",
        "Attach mockup proof and compliance notes before provider or marketplace work."
      ],
      externalGeneration: false,
      mockupDirection: `Prepare front-facing ${candidate.productType} mockup notes for ${candidate.sourceStoreName}; keep artwork centered, readable, and brand-consistent.`,
      negativePrompt: "No protected logos, celebrity likenesses, copyrighted characters, trademarked slogans, copied artwork, misleading claims, or marketplace policy risks.",
      palette: unique([
        "store brand primary",
        "high-contrast neutral",
        candidate.riskLevel === "low" ? "single accent color" : "low-risk minimal palette"
      ]),
      placement: candidate.productType.toLowerCase().includes("hoodie") ? "front chest or center back" : "front chest center",
      prompt,
      providerContacted: false,
      typography: candidate.designTheme || "bold original typography"
    },
    listingDescription: candidate.listingDescription,
    listingTitle: candidate.listingTitle,
    productName: candidate.productName,
    productType: candidate.productType,
    profitMargin: candidate.profitMargin,
    recommendation: candidate.recommendation,
    retailPrice: candidate.retailPrice,
    rotationReason: candidate.rotationReason,
    score: candidate.score,
    scoreBand: candidate.scoreBand,
    sourceProductId: candidate.sourceProductId,
    sourceProductName: candidate.sourceProductName,
    tags: candidate.tags
  };
}

function contentIdeaFor(candidate: RevenueMoneyArmyGeneratedAssetCandidate, index: number): RevenueFirstBusinessLaunchPackageContentIdea {
  return {
    approvalGate: {
      externalExecutionLocked: true,
      humanApprovalRequired: true,
      reason: "Faceless content idea is an internal draft. Script, caption, disclosure, and channel package require approval before posting.",
      status: "Required"
    },
    candidateId: candidate.candidateId,
    channel: candidate.organicContentTieIn.channel,
    externalExecution: false,
    hook: candidate.organicContentTieIn.hook,
    id: `first_business_content_${safeId(candidate.candidateId)}_${index + 1}`,
    productName: candidate.productName,
    providerContacted: false,
    scriptAngle: `Show the product problem, the visual idea, and a simple store CTA for ${candidate.sourceStoreName}; keep it original and no-spend.`,
    status: "internal_draft_only"
  };
}

function organicMove(input: {
  channel: RevenueFirstBusinessLaunchPackageOrganicMove["channel"];
  id: string;
  title: string;
  expectedInternalEffect: string;
}): RevenueFirstBusinessLaunchPackageOrganicMove {
  return {
    approvalGate: {
      externalExecutionLocked: true,
      humanApprovalRequired: true,
      reason: "Organic move is queued as internal preparation only. Manual approval is required before publication, upload, spend, or provider work.",
      status: "Required"
    },
    channel: input.channel,
    expectedInternalEffect: input.expectedInternalEffect,
    externalExecution: false,
    id: input.id,
    providerContacted: false,
    title: input.title
  };
}

function organicMovesFor(input: {
  contentIdeas: RevenueFirstBusinessLaunchPackageContentIdea[];
  products: RevenueFirstBusinessLaunchPackageProduct[];
  storeName: string;
}): RevenueFirstBusinessLaunchPackageOrganicMove[] {
  const primaryProduct = input.products[0];
  const channels = unique(input.contentIdeas.map((idea) => idea.channel));
  const channelMoves = channels.slice(0, 3).map((channel, index) => organicMove({
    channel,
    expectedInternalEffect: `Prepare one approved organic ${channel.replace(/_/g, " ")} draft for ${primaryProduct?.productName ?? input.storeName}.`,
    id: `organic_${safeId(input.storeName)}_${channel}_${index + 1}`,
    title: `Prepare ${channel.replace(/_/g, " ")} product story`
  }));

  return [
    organicMove({
      channel: "listing",
      expectedInternalEffect: primaryProduct
        ? `Prepare listing title, description, tags, pricing notes, and proof checklist for ${primaryProduct.productName}.`
        : `Prepare the first listing checklist for ${input.storeName}.`,
      id: `organic_${safeId(input.storeName)}_listing`,
      title: "Prepare approval-ready listing proof"
    }),
    organicMove({
      channel: "storefront_seo",
      expectedInternalEffect: `Prepare internal SEO title, tags, collection placement, and search-intent notes for ${input.storeName}.`,
      id: `organic_${safeId(input.storeName)}_seo`,
      title: "Prepare storefront SEO map"
    }),
    organicMove({
      channel: "community_outreach",
      expectedInternalEffect: `Draft no-send outreach notes for organic communities, existing customers, or owned channels relevant to ${input.storeName}.`,
      id: `organic_${safeId(input.storeName)}_community`,
      title: "Draft organic community outreach"
    }),
    organicMove({
      channel: "email_capture",
      expectedInternalEffect: `Prepare internal email or waitlist capture copy for ${primaryProduct?.productName ?? input.storeName}; no email platform action is executed.`,
      id: `organic_${safeId(input.storeName)}_email_capture`,
      title: "Prepare owned-list capture copy"
    }),
    ...channelMoves,
    organicMove({
      channel: "manual_signal_tracking",
      expectedInternalEffect: "Prepare manual read-only signal tracking fields for visits, units, revenue, comments, saves, and conversion notes.",
      id: `organic_${safeId(input.storeName)}_signals`,
      title: "Prepare manual signal tracking"
    })
  ];
}

function approvalChecklistFor(): RevenueFirstBusinessLaunchPackagePlan["approvalChecklist"] {
  return [
    {
      category: "store",
      externalExecutionLocked: true,
      required: true,
      title: "Approve selected store, platform fit, audience, brand positioning, and launch status."
    },
    {
      category: "products",
      externalExecutionLocked: true,
      required: true,
      title: "Approve top product concepts, pricing, margin, source lanes, tags, and listing copy."
    },
    {
      category: "designs",
      externalExecutionLocked: true,
      required: true,
      title: "Approve each internal design draft, AI-ready prompt, negative prompt, mockup direction, and compliance note before artwork generation."
    },
    {
      category: "content",
      externalExecutionLocked: true,
      required: true,
      title: "Approve faceless content hooks, scripts, channel fit, captions, disclosure, and posting order."
    },
    {
      category: "traffic",
      externalExecutionLocked: true,
      required: true,
      title: "Approve organic-first traffic moves before any post, email, outreach, browser work, or external upload."
    },
    {
      category: "finance",
      externalExecutionLocked: true,
      required: true,
      title: "Approve any Ad/Growth spend separately in Financial Orchestrator; paid spend remains locked."
    },
    {
      category: "evidence",
      externalExecutionLocked: true,
      required: true,
      title: "Attach manual evidence fields for visits, units, revenue, comments, saves, conversion notes, and rotation review."
    }
  ];
}

function statusFor(input: {
  killPressure: RevenueMoneyArmyPressureSignal;
  products: RevenueFirstBusinessLaunchPackageProduct[];
}): RevenueFirstBusinessLaunchPackageStatus {
  if (input.products.length === 0 || input.killPressure.pressureScore >= 70 || input.products.every((product) => product.approvalState === "blocked")) {
    return "blocked";
  }

  if (input.killPressure.pressureScore >= 40 || input.products.some((product) => product.approvalState !== "ready_to_approve")) {
    return "manual_gate";
  }

  return "ready_for_approval";
}

export function buildFirstBusinessLaunchPackageFromMoneyArmyCandidates(input: {
  candidates: RevenueMoneyArmyGeneratedAssetCandidate[];
  generatedAt?: string;
  killPressure: RevenueMoneyArmyPressureSignal;
  maxProducts?: number;
  products: RevenueEngineProductSnapshot[];
  scalePressure: RevenueMoneyArmyPressureSignal;
  stores: RevenueEngineStoreSnapshot[];
}): RevenueFirstBusinessLaunchPackagePlan | null {
  const selectedStore = selectLaunchStore(input.candidates);

  if (!selectedStore) return null;

  const store = input.stores.find((item) => item.id === selectedStore.storeId);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const productLimit = Math.max(5, Math.min(input.maxProducts ?? 10, 10));
  const topCandidates = selectedStore.storeCandidates
    .sort((left, right) => candidatePriority(right) - candidatePriority(left) || right.score - left.score)
    .slice(0, productLimit);
  const products = topCandidates.map(productPackageFor);
  const contentIdeas = topCandidates.slice(0, 10).map(contentIdeaFor);
  const organicFirstMoves = organicMovesFor({
    contentIdeas,
    products,
    storeName: store?.businessName ?? selectedStore.storeCandidates[0]?.sourceStoreName ?? "First Business"
  });
  const approvalChecklist = approvalChecklistFor();
  const manualApprovalGates = approvalChecklist.map((item) => item.title);
  const status = statusFor({
    killPressure: input.killPressure,
    products
  });
  const storeName = store?.businessName ?? topCandidates[0]?.sourceStoreName ?? "First Business";

  return {
    approvalChecklist,
    auditEvents: [
      "First Business Launch Package generated from top scored Money Army candidates.",
      "Selected store, product concepts, internal AI-ready design drafts, faceless content ideas, and organic-first moves are approval-gated internal records.",
      "No provider, marketplace, ad, social, banking, upload, browser, or payment write action was executed."
    ],
    blockedExternalActions: launchPackageBlockedActions,
    contentIdeas,
    externalExecution: false,
    generatedAt,
    killPressure: input.killPressure,
    manualApprovalGates,
    mode: "First Business Launch Package",
    organicFirstMoves,
    packageId: `first_business_launch_package_${safeId(selectedStore.storeId)}_${safeId(generatedAt)}`,
    products,
    providerContacted: false,
    scalePressure: input.scalePressure,
    status,
    store: {
      audience: store?.audience ?? "",
      businessName: storeName,
      industry: store?.industry ?? "",
      launchStatus: store?.launchStatus ?? "Awaiting Approval",
      sourceStoreId: selectedStore.storeId,
      storePlatform: store?.storePlatform ?? "Other"
    },
    summary: `${storeName} launch package is ${status.replace(/_/g, " ")} with ${products.length} product concept${products.length === 1 ? "" : "s"}, ${products.length} internal AI-ready design draft${products.length === 1 ? "" : "s"}, ${contentIdeas.length} faceless content idea${contentIdeas.length === 1 ? "" : "s"}, and ${organicFirstMoves.length} organic-first move${organicFirstMoves.length === 1 ? "" : "s"}. Scale pressure ${input.scalePressure.level} ${input.scalePressure.pressureScore}/100; kill pressure ${input.killPressure.level} ${input.killPressure.pressureScore}/100.`,
    totals: {
      contentIdeas: contentIdeas.length,
      manualApprovalGates: manualApprovalGates.length,
      organicMoves: organicFirstMoves.length,
      products: products.length,
      readyToApproveProducts: products.filter((product) => product.approvalState === "ready_to_approve").length,
      scaleCandidates: products.filter((product) => product.recommendation === "scale").length,
      watchCandidates: products.filter((product) => product.recommendation === "watch").length
    }
  };
}
