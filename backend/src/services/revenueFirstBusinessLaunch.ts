import type { FacelessContentBrief, FacelessContentPipelinePlan } from "./facelessContentPipeline.js";
import type { RevenueEngineProductSnapshot, RevenueEngineStoreSnapshot } from "./revenueEngine.js";
import type { RevenueFirstCashSprintPlan, RevenueFirstCashSprintStep } from "./revenueFirstCashSprint.js";
import type { RevenueLaunchChecklistItem, RevenueLaunchChecklistPlan } from "./revenueLaunchChecklist.js";

export type RevenueFirstBusinessLaunchStatus =
  | "ready_internal"
  | "manual_gate"
  | "blocked"
  | "watch";

export type RevenueFirstBusinessLaunchCandidate = {
  blockers: string[];
  cashReadinessScore: number;
  checklistItemId: string;
  expectedInternalEffect: string;
  externalExecution: false;
  finalRank: number;
  incomeVelocityScore: number;
  launchReadinessScore: number;
  nextInternalAction: string;
  nextInternalState: string;
  priorityScore: number;
  providerContacted: false;
  reason: string;
  recommendedEndpoint: string;
  riskLevel: "low" | "medium" | "high";
  sprintActionId: string | null;
  status: RevenueFirstBusinessLaunchStatus;
  storeId: string | null;
  storeName: string;
  summary: string;
};

export type RevenueFirstBusinessLaunchProduct = {
  estimatedProfit: number;
  listingTitle: string | null;
  productId: string;
  productName: string;
  productType: string;
  profitMargin: number;
  status: string;
};

export type RevenueFirstBusinessContentTieIn = {
  briefId: string;
  channelPackages: number;
  hook: string;
  objective: FacelessContentBrief["concept"]["objective"];
  productId: string | null;
  status: FacelessContentBrief["status"];
  title: string;
};

export type RevenueFirstBusinessLaunchPackage = {
  batchStage: {
    endpoint: string;
    expectedInternalEffect: string;
    name: "deployment";
    requiredConfirmation: "RUN INTERNAL MONEY ARMY BATCH PIPELINE";
  };
  blockedExternalActions: string[];
  contentTieIns: RevenueFirstBusinessContentTieIn[];
  externalExecution: false;
  manualApprovalGates: string[];
  organicTrafficPlan: {
    channels: string[];
    firstMoves: string[];
    noSpend: true;
    paidSpendLocked: true;
    summary: string;
  };
  products: RevenueFirstBusinessLaunchProduct[];
  providerContacted: false;
  store: {
    audience: string;
    businessName: string;
    industry: string;
    launchStatus: string;
    storeId: string;
    storePlatform: string;
  };
  summary: string;
};

export type RevenueFirstBusinessLaunchPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  candidates: RevenueFirstBusinessLaunchCandidate[];
  externalExecution: false;
  generatedAt: string;
  launchPackage: RevenueFirstBusinessLaunchPackage | null;
  mode: "Revenue Engine First Business Launch Path";
  providerContacted: false;
  sprint: {
    readyInternal: number;
    summary: string;
  };
  summary: string;
  topCandidate: RevenueFirstBusinessLaunchCandidate | null;
  totals: {
    blocked: number;
    candidates: number;
    contentTieIns: number;
    manualGates: number;
    organicTrafficMoves: number;
    productsPrepared: number;
    readyInternal: number;
    watch: number;
  };
};

const lockedExternalActions = [
  "Publishing marketplace listings, creating provider-side products, uploading artwork or files, changing storefront settings, posting content, starting ads, or moving money",
  "Opening provider dashboards, launching browser automation, using stealth, proxy rotation, fingerprint spoofing, account warmup, CAPTCHA bypass, or platform-evasion automation"
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function sprintForItem(item: RevenueLaunchChecklistItem, sprintSteps: RevenueFirstCashSprintStep[]) {
  if (!item.storeId) return null;

  return sprintSteps.find((step) => step.storeId === item.storeId) ?? null;
}

function statusFor(item: RevenueLaunchChecklistItem, sprintStep: RevenueFirstCashSprintStep | null): RevenueFirstBusinessLaunchStatus {
  if (sprintStep?.status === "ready_internal") return "ready_internal";
  if (sprintStep?.status === "manual_gate") return "manual_gate";
  if (sprintStep?.status === "blocked" || item.riskLevel === "high" || item.blockers.length > 0) return "blocked";
  if (item.nextAction !== "hold_review" && item.nextAction !== "monitor_scale_or_rotate") return "manual_gate";

  return "watch";
}

function nextStateFor(status: RevenueFirstBusinessLaunchStatus, item: RevenueLaunchChecklistItem, sprintStep: RevenueFirstCashSprintStep | null) {
  if (status === "ready_internal") return "dispatch_ready_first_cash_bridge_action";
  if (status === "manual_gate") return sprintStep?.nextActionTitle ?? item.nextActionLabel;
  if (status === "blocked") return item.blockers[0] ?? sprintStep?.blockers[0] ?? "resolve_launch_blockers";

  return "collect_more_signal_or_launch_evidence";
}

function endpointFor(sprintStep: RevenueFirstCashSprintStep | null, item: RevenueLaunchChecklistItem) {
  return sprintStep?.endpoint ?? (
    item.nextAction === "apply_portfolio_commands"
      ? "/merch/portfolio-command-center"
      : "/merch/revenue-engine/launch-checklist"
  );
}

function statusWeight(status: RevenueFirstBusinessLaunchStatus) {
  if (status === "ready_internal") return 25;
  if (status === "manual_gate") return 12;
  if (status === "watch") return 4;
  return -18;
}

function riskPenalty(riskLevel: "low" | "medium" | "high", blockers: string[]) {
  const risk = riskLevel === "high" ? 22 : riskLevel === "medium" ? 10 : 0;

  return risk + Math.min(blockers.length * 4, 20);
}

function candidateFor(item: RevenueLaunchChecklistItem, sprintStep: RevenueFirstCashSprintStep | null): RevenueFirstBusinessLaunchCandidate {
  const status = statusFor(item, sprintStep);
  const blockers = unique([
    ...item.blockers,
    ...(sprintStep?.blockers ?? [])
  ]);
  const cashReadinessScore = sprintStep?.cashReadinessScore ?? 0;
  const actionability = statusWeight(status);
  const penalty = riskPenalty(item.riskLevel, blockers);
  const finalRank = clamp(Math.round(
    item.priorityScore * 0.36
    + item.incomeVelocityScore * 0.28
    + item.readinessScore * 0.2
    + cashReadinessScore * 0.16
    + actionability
    - penalty
  ), 0, 100);
  const nextInternalAction = sprintStep?.nextActionTitle ?? item.nextActionLabel;
  const expectedInternalEffect = sprintStep?.expectedInternalEffect
    ?? item.commandActions[0]?.expectedInternalEffect
    ?? `Prepare ${item.nextActionLabel.toLowerCase()} as the next internal launch step.`;

  return {
    blockers,
    cashReadinessScore,
    checklistItemId: item.id,
    expectedInternalEffect,
    externalExecution: false,
    finalRank,
    incomeVelocityScore: item.incomeVelocityScore,
    launchReadinessScore: item.readinessScore,
    nextInternalAction,
    nextInternalState: nextStateFor(status, item, sprintStep),
    priorityScore: item.priorityScore,
    providerContacted: false,
    reason: sprintStep?.reason ?? item.summary,
    recommendedEndpoint: endpointFor(sprintStep, item),
    riskLevel: item.riskLevel,
    sprintActionId: sprintStep?.sprintActionId ?? null,
    status,
    storeId: item.storeId,
    storeName: item.storeName,
    summary: `${item.storeName}: ${status.replace(/_/g, " ")} path ranked ${finalRank}/100. Next: ${nextInternalAction}.`
  };
}

function productPriority(product: RevenueEngineProductSnapshot) {
  const statusScore = product.status === "Published" ? 20
    : product.status === "Approved" ? 16
      : product.status === "Listing Drafted" ? 12
        : product.status === "Mockup Created" ? 8 : 0;

  return statusScore + product.estimatedProfit + product.profitMargin / 10;
}

function launchProductsFor(storeId: string, products: RevenueEngineProductSnapshot[]): RevenueFirstBusinessLaunchProduct[] {
  return products
    .filter((product) => product.storeId === storeId)
    .filter((product) => ["Published", "Approved", "Listing Drafted", "Mockup Created", "Designed"].includes(product.status))
    .sort((left, right) => productPriority(right) - productPriority(left) || left.productName.localeCompare(right.productName))
    .slice(0, 3)
    .map((product) => ({
      estimatedProfit: product.estimatedProfit,
      listingTitle: product.listingTitle ?? null,
      productId: product.id,
      productName: product.productName,
      productType: product.productType,
      profitMargin: product.profitMargin,
      status: product.status
    }));
}

function contentTieInsFor(storeId: string, contentPlan: FacelessContentPipelinePlan | undefined): RevenueFirstBusinessContentTieIn[] {
  return (contentPlan?.briefs ?? [])
    .filter((brief) => brief.storeId === storeId)
    .sort((left, right) => right.estimatedRevenueImpact - left.estimatedRevenueImpact || right.priority - left.priority)
    .slice(0, 3)
    .map((brief) => ({
      briefId: brief.id,
      channelPackages: brief.channelPackages.length,
      hook: brief.concept.hook,
      objective: brief.concept.objective,
      productId: brief.productId,
      status: brief.status,
      title: brief.title
    }));
}

function buildLaunchPackage(input: {
  blockedExternalActions: string[];
  candidate: RevenueFirstBusinessLaunchCandidate | null;
  contentPlan?: FacelessContentPipelinePlan;
  products: RevenueEngineProductSnapshot[];
  stores: RevenueEngineStoreSnapshot[];
}): RevenueFirstBusinessLaunchPackage | null {
  if (!input.candidate?.storeId) return null;

  const store = input.stores.find((candidateStore) => candidateStore.id === input.candidate?.storeId);

  if (!store) return null;

  const products = launchProductsFor(store.id, input.products);
  const contentTieIns = contentTieInsFor(store.id, input.contentPlan);
  const channels = unique(contentTieIns.flatMap((tieIn) => {
    const brief = input.contentPlan?.briefs.find((candidateBrief) => candidateBrief.id === tieIn.briefId);

    return brief?.targetChannels ?? [];
  }));
  const firstMoves = unique([
    products.length > 0
      ? `Prepare ${products[0]?.productName ?? "top product"} listing and proof assets for manual launch review.`
      : `Create the first product draft for ${store.businessName} before launch approval.`,
    contentTieIns.length > 0
      ? `Record and review ${contentTieIns[0]?.title ?? "the top faceless brief"} for organic short-form distribution.`
      : `Generate one faceless content brief tied to ${store.businessName}.`,
    "Use organic channels first: product story short, marketplace listing polish, owned social post, and manual signal tracking.",
    "Queue read-only performance signal intake only after approved manual publication creates real metrics."
  ]);

  return {
    batchStage: {
      endpoint: "/merch/revenue-engine/money-army/batches/apply",
      expectedInternalEffect: "Deploy the selected first-business lane through internal First Business Launch and First Cash Sprint bridge controls.",
      name: "deployment",
      requiredConfirmation: "RUN INTERNAL MONEY ARMY BATCH PIPELINE"
    },
    blockedExternalActions: input.blockedExternalActions,
    contentTieIns,
    externalExecution: false,
    manualApprovalGates: [
      "Approve the selected store/product package before any provider or marketplace write action.",
      "Approve faceless content script, caption, disclosure, and channel package before any posting.",
      "Approve any Ad/Growth spend separately; this launch package starts with no-spend organic traffic.",
      "Attach read-only performance evidence before scale rotation or budget release."
    ],
    organicTrafficPlan: {
      channels: channels.length > 0 ? channels : ["youtube_shorts", "tiktok", "instagram_reels"],
      firstMoves,
      noSpend: true,
      paidSpendLocked: true,
      summary: `${firstMoves.length} organic-first moves prepared. Paid traffic stays locked until performance evidence and budget approval exist.`
    },
    products,
    providerContacted: false,
    store: {
      audience: store.audience,
      businessName: store.businessName,
      industry: store.industry,
      launchStatus: store.launchStatus,
      storeId: store.id,
      storePlatform: store.storePlatform
    },
    summary: `${store.businessName} is packaged as the first practical revenue asset with ${products.length} product candidate${products.length === 1 ? "" : "s"} and ${contentTieIns.length} organic content tie-in${contentTieIns.length === 1 ? "" : "s"}.`
  };
}

export function buildRevenueFirstBusinessLaunchPlan(input: {
  checklistPlan: RevenueLaunchChecklistPlan;
  contentPlan?: FacelessContentPipelinePlan;
  firstCashSprintPlan: RevenueFirstCashSprintPlan;
  generatedAt?: string;
  maxCandidates?: number;
  products?: RevenueEngineProductSnapshot[];
  stores?: RevenueEngineStoreSnapshot[];
}): RevenueFirstBusinessLaunchPlan {
  const maxCandidates = clamp(Math.round(input.maxCandidates ?? 8), 1, 25);
  const candidates = input.checklistPlan.items
    .map((item) => candidateFor(item, sprintForItem(item, input.firstCashSprintPlan.steps)))
    .sort((left, right) => (
      Number(right.status === "ready_internal") - Number(left.status === "ready_internal")
      || right.finalRank - left.finalRank
      || right.priorityScore - left.priorityScore
      || left.storeName.localeCompare(right.storeName)
    ))
    .slice(0, maxCandidates);
  const readyInternal = candidates.filter((candidate) => candidate.status === "ready_internal").length;
  const manualGates = candidates.filter((candidate) => candidate.status === "manual_gate").length;
  const blocked = candidates.filter((candidate) => candidate.status === "blocked").length;
  const watch = candidates.filter((candidate) => candidate.status === "watch").length;
  const topCandidate = candidates[0] ?? null;
  const blockedExternalActions = unique([
    ...input.checklistPlan.blockedExternalActions,
    ...input.firstCashSprintPlan.blockedExternalActions,
    ...(input.contentPlan?.blockedExternalActions ?? []),
    ...lockedExternalActions
  ]);
  const launchPackage = buildLaunchPackage({
    blockedExternalActions,
    candidate: topCandidate,
    contentPlan: input.contentPlan,
    products: input.products ?? [],
    stores: input.stores ?? []
  });

  return {
    auditEvents: [
      "First Business Launch Path joined Revenue Launch Checklist and First Cash Sprint evidence into one ranked launch target list.",
      "First practical launch package attached store/product records to faceless content briefs and organic-first traffic moves.",
      "Ready actions dispatch only through existing internal Launch Checklist Action Bridge controls.",
      "No provider, marketplace, payment, social, ad, browser, proxy, upload, payout, bank, card, or external write action was executed."
    ],
    blockedExternalActions,
    candidates,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    launchPackage,
    mode: "Revenue Engine First Business Launch Path",
    providerContacted: false,
    sprint: {
      readyInternal: input.firstCashSprintPlan.totals.readyInternal,
      summary: input.firstCashSprintPlan.summary
    },
    summary: topCandidate
      ? `${topCandidate.storeName} is the top first-business launch path: ${topCandidate.status.replace(/_/g, " ")}, rank ${topCandidate.finalRank}/100, next ${topCandidate.nextInternalAction}.${launchPackage ? ` ${launchPackage.summary}` : ""}`
      : "No first-business launch path is available from current checklist and first-cash sprint evidence.",
    topCandidate,
    totals: {
      blocked,
      candidates: candidates.length,
      contentTieIns: launchPackage?.contentTieIns.length ?? 0,
      manualGates,
      organicTrafficMoves: launchPackage?.organicTrafficPlan.firstMoves.length ?? 0,
      productsPrepared: launchPackage?.products.length ?? 0,
      readyInternal,
      watch
    }
  };
}
