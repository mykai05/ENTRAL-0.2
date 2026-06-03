import type {
  RevenueFirstBusinessLaunchPackageContentIdea,
  RevenueFirstBusinessLaunchPackageOrganicMove,
  RevenueFirstBusinessLaunchPackagePlan,
  RevenueFirstBusinessLaunchPackageProduct
} from "./revenueFirstBusinessLaunchPackage.js";

export type RevenueFirstStorePreparationStatus = "ready_to_execute_internal" | "blocked";
export type RevenueFirstBusinessInternalLaunchStatus = "approved_for_launch_internal" | "blocked";
export type RevenueFirstBusinessExecutionStatus = "ready_to_launch_first_business" | "blocked";
export type RevenueFirstBusinessAutonomousLaunchStatus = "autonomous_ready_payment_gated" | "blocked";
export type RevenueFirstBusinessLiveExecutorStatus =
  | "ready_for_owner_unlock"
  | "armed_non_payment_live_run"
  | "blocked";
export type RevenueFirstBusinessReadinessGateStatus = "ready_for_manual_launch_approval" | "blocked";
export type RevenueFirstBusinessReadinessGateCategory =
  | "store"
  | "products"
  | "listings"
  | "designs"
  | "content"
  | "traffic"
  | "finance"
  | "evidence"
  | "external_lock";

export type RevenueFirstBusinessListingProductPackItem = {
  approvalChecklist: string[];
  candidateId: string;
  designSpec: {
    externalGeneration: false;
    mockupDirection: string;
    negativePrompt: string;
    palette: string[];
    placement: string;
    prompt: string;
    providerContacted: false;
    typography: string;
  };
  externalExecution: false;
  listingBullets: string[];
  listingDescription: string;
  listingTitle: string;
  productName: string;
  productType: string;
  profitMargin: number;
  providerContacted: false;
  retailPrice: number;
  seoKeywords: string[];
  status: "ready_internal";
  storefrontCollection: string;
  tags: string[];
};

export type RevenueFirstStorePreparationPlan = {
  approval: {
    approvedAt: string;
    approvedBy: "operator";
    auditOnly: true;
    externalExecution: false;
    note: string | null;
    packageId: string;
    providerContacted: false;
    status: "approved_internal";
  };
  auditEvents: string[];
  blockedExternalActions: string[];
  contentPlan: Array<RevenueFirstBusinessLaunchPackageContentIdea & {
    executionState: "approved_internal_ready";
  }>;
  externalExecution: false;
  generatedAt: string;
  guardrails: string[];
  mode: "Prepare First Store";
  organicTrafficPlan: Array<RevenueFirstBusinessLaunchPackageOrganicMove & {
    executionState: "approved_internal_ready";
  }>;
  preparationId: string;
  products: Array<RevenueFirstBusinessLaunchPackageProduct & {
    executionState: "approved_internal_ready";
  }>;
  providerContacted: false;
  status: RevenueFirstStorePreparationStatus;
  storeConfig: {
    audience: string;
    businessName: string;
    externalExecution: false;
    industry: string;
    launchStatus: string;
    preparationChecklist: string[];
    providerContacted: false;
    sourceStoreId: string;
    storePlatform: string;
  };
  summary: string;
  totals: {
    approvalChecklist: number;
    blockedExternalActions: number;
    contentIdeas: number;
    organicMoves: number;
    products: number;
    readyInternalSteps: number;
  };
};

export type RevenueFirstBusinessInternalLaunchPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  contentDraftQueue: Array<RevenueFirstStorePreparationPlan["contentPlan"][number] & {
    executionLocked: true;
    launchState: "queued_internal_content_draft";
    sequence: number;
  }>;
  evidenceLedgerFields: string[];
  externalExecution: false;
  generatedAt: string;
  guardrails: string[];
  launchApproval: {
    approvedAt: string;
    approvedBy: "operator";
    auditOnly: true;
    externalExecution: false;
    note: string | null;
    packageId: string;
    preparationId: string;
    providerContacted: false;
    status: "approved_for_launch_internal";
  };
  launchId: string;
  launchSequence: Array<{
    externalExecution: false;
    id: string;
    order: number;
    providerContacted: false;
    state: "ready_internal";
    title: string;
  }>;
  mode: "Launch First Business";
  organicMoveQueue: Array<RevenueFirstStorePreparationPlan["organicTrafficPlan"][number] & {
    executionLocked: true;
    launchState: "queued_internal_organic_move";
    sequence: number;
  }>;
  productSetupQueue: Array<RevenueFirstStorePreparationPlan["products"][number] & {
    executionLocked: true;
    launchState: "queued_internal_product_setup";
    sequence: number;
  }>;
  providerContacted: false;
  status: RevenueFirstBusinessInternalLaunchStatus;
  finalExecutionPacket: {
    approvalState: "approved_for_launch_internal";
    blockedExternalActions: string[];
    evidenceLedgerFields: string[];
    executionChecklist: string[];
    externalExecution: false;
    facelessContentIdeas: RevenueFirstBusinessInternalLaunchPlan["contentDraftQueue"];
    organicMoves: RevenueFirstBusinessInternalLaunchPlan["organicMoveQueue"];
    products: RevenueFirstBusinessInternalLaunchPlan["productSetupQueue"];
    providerContacted: false;
    store: RevenueFirstBusinessInternalLaunchPlan["storeSetup"];
  };
  storeSetup: RevenueFirstStorePreparationPlan["storeConfig"] & {
    launchState: "queued_internal_store_setup";
    setupQueue: string[];
  };
  summary: string;
  totals: {
    blockedExternalActions: number;
    contentDrafts: number;
    evidenceFields: number;
    launchSequenceSteps: number;
    organicMoves: number;
    products: number;
    readyExecutionItems: number;
    storeSetupSteps: number;
  };
};

export type RevenueFirstBusinessExecutionPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  executionApproval: {
    approvedAt: string;
    approvedBy: "operator";
    auditOnly: true;
    externalExecution: false;
    launchId: string;
    note: string | null;
    providerContacted: false;
    status: "ready_to_launch_first_business";
  };
  executionId: string;
  externalExecution: false;
  firstLaunchReadinessGate: {
    externalExecution: false;
    generatedAt: string;
    items: Array<{
      category: RevenueFirstBusinessReadinessGateCategory;
      detail: string;
      externalExecution: false;
      providerContacted: false;
      required: true;
      status: "ready" | "blocked";
      title: string;
    }>;
    label: "First Launch Readiness Gate";
    providerContacted: false;
    status: RevenueFirstBusinessReadinessGateStatus;
    summary: string;
    totals: {
      blocked: number;
      ready: number;
      required: number;
    };
  };
  finalExecutionPacket: RevenueFirstBusinessInternalLaunchPlan["finalExecutionPacket"];
  firstWeekTrackingPlan: {
    checkIns: Array<{
      day: 0 | 1 | 3 | 7;
      requiredEvidence: string[];
      title: string;
    }>;
    externalExecution: false;
    metricFields: Array<{
      cadence: "twice_daily" | "daily" | "end_of_week";
      id: string;
      label: string;
    }>;
    providerContacted: false;
    rotationReview: {
      day: 7;
      inputs: string[];
      output: "feed_revenue_engine_scale_watch_pause_kill";
    };
  };
  generatedAt: string;
  guardrails: string[];
  launchHandoffPacket: {
    blockedExternalActions: string[];
    contentCalendar: Array<{
      captionDraft: string;
      channel: RevenueFirstBusinessLaunchPackageContentIdea["channel"];
      contentIdeaId: string;
      externalExecution: false;
      hook: string;
      providerContacted: false;
      scriptDraft: string;
      sequence: number;
      status: "ready_internal";
    }>;
    explicitLiveApprovalRequired: true;
    externalExecution: false;
    handoffId: string;
    manualExecutionChecklist: string[];
    organicLaunchMoves: Array<RevenueFirstBusinessInternalLaunchPlan["organicMoveQueue"][number] & {
      manualExecutionNote: string;
      status: "ready_internal";
    }>;
    products: RevenueFirstBusinessListingProductPackItem[];
    providerContacted: false;
    status: "ready_for_operator_review" | "blocked";
    store: RevenueFirstBusinessInternalLaunchPlan["finalExecutionPacket"]["store"] & {
      manualSetupInstructions: string[];
    };
    summary: string;
  };
  listingProductPack: RevenueFirstBusinessListingProductPackItem[];
  manualLaunchRunbook: Array<{
    externalExecution: false;
    id: string;
    order: number;
    packetSection: "store" | "products" | "content" | "organic" | "evidence" | "review";
    providerContacted: false;
    status: "ready_manual";
    title: string;
  }>;
  mode: "Execute First Business";
  providerContacted: false;
  readyState: {
    externalExecution: false;
    label: "Ready to Launch First Business";
    manualLaunchReady: boolean;
    providerContacted: false;
    semiAutomatedPreparationReady: boolean;
  };
  revenueStartPlan: {
    first24Hours: string[];
    first72Hours: string[];
    organicFirst: true;
    paidSpendLocked: true;
  };
  semiAutomatedPreparationQueue: Array<{
    externalExecution: false;
    id: string;
    providerContacted: false;
    status: "ready_internal";
    title: string;
  }>;
  sourceLaunchId: string;
  status: RevenueFirstBusinessExecutionStatus;
  summary: string;
  totals: {
    blockedExternalActions: number;
    finalProducts: number;
    firstWeekMetricFields: number;
    handoffProducts: number;
    manualSteps: number;
    organicMoves: number;
    readyLaunchItems: number;
    readinessBlocked: number;
    readinessReady: number;
    semiAutomatedSteps: number;
  };
};

export type RevenueFirstBusinessAutonomousLaunchLane =
  | "store_build"
  | "product_creation"
  | "supplier_selection"
  | "supplier_connection"
  | "content_launch"
  | "organic_traffic"
  | "ad_campaign_drafting"
  | "ad_spend_activation"
  | "tracking";

export type RevenueFirstBusinessAutonomousLaunchPlan = {
  adCampaignDrafts: Array<{
    audience: string;
    budgetApprovalRequired: true;
    campaignName: string;
    dailyBudgetCap: number;
    externalExecution: false;
    objective: "organic_amplification" | "product_validation" | "retargeting_seed";
    paymentExecution: false;
    productNames: string[];
    providerContacted: false;
    spendState: "payment_required";
    status: "draft_locked";
  }>;
  auditEvents: string[];
  autonomousLaunchId: string;
  autonomousUntilPayment: true;
  autonomyMatrix: Array<{
    autonomyPercent: number;
    commander: string;
    externalExecution: false;
    hardStop: string | null;
    lane: RevenueFirstBusinessAutonomousLaunchLane;
    nextInternalAction: string;
    ownerApprovalRequired: boolean;
    providerContacted: false;
    status: "autonomous_ready" | "connector_gated" | "payment_gated" | "blocked";
  }>;
  blockedExternalActions: string[];
  chainOfCommand: Array<{
    lane: RevenueFirstBusinessAutonomousLaunchLane;
    owns: string[];
    rank: "marshal" | "general" | "commander" | "soldier";
    status: "ready_internal" | "owner_gate_required";
    title: string;
  }>;
  connectionPlan: {
    connectorManifests: Array<{
      approvalRequired: true;
      credentialScopes: string[];
      externalExecution: false;
      payloadState: "prepared_not_sent";
      provider: "Shopify" | "Etsy" | "Printify" | "Printful" | "Meta" | "Google Analytics";
      providerContacted: false;
      purpose: string;
    }>;
    externalExecution: false;
    providerContacted: false;
    status: "connector_ready_owner_gated" | "blocked";
    summary: string;
  };
  executionPacket: RevenueFirstBusinessExecutionPlan;
  externalExecution: false;
  finalOperatorGate: {
    externalExecution: false;
    paymentExecution: false;
    providerContacted: false;
    requiredApprovals: string[];
    status: "owner_payment_and_provider_approval_required" | "blocked";
    summary: string;
  };
  generatedAt: string;
  guardrails: string[];
  mode: "Autonomous First Business Launch Prep";
  paymentApprovalQueue: Array<{
    approvalType: "provider_account" | "supplier_order" | "ad_spend" | "payment_processor" | "marketplace_fee";
    estimatedAmount: number;
    externalExecution: false;
    paymentExecution: false;
    providerContacted: false;
    reason: string;
    status: "owner_approval_required";
    title: string;
  }>;
  paymentExecution: false;
  productCreationPlan: Array<RevenueFirstBusinessListingProductPackItem & {
    connectorPayloadStatus: "prepared_not_sent";
    creationLane: "autonomous_internal_ready";
    supplierCandidateId: string;
  }>;
  providerContacted: false;
  status: RevenueFirstBusinessAutonomousLaunchStatus;
  storeBuildPlan: {
    businessName: string;
    collectionPlan: string[];
    externalExecution: false;
    navigationPlan: string[];
    policyDrafts: string[];
    providerContacted: false;
    seoPlan: {
      description: string;
      title: string;
    };
    setupPayloadState: "prepared_not_sent";
    status: "autonomous_internal_ready" | "blocked";
    storePlatform: string;
  };
  supplierPlan: {
    candidates: Array<{
      estimatedBaseCost: number;
      externalExecution: false;
      provider: "Printify" | "Printful" | "Other";
      providerContacted: false;
      reasons: string[];
      selectionScore: number;
      status: "candidate_internal";
      supplierCandidateId: string;
    }>;
    externalExecution: false;
    providerContacted: false;
    selectedSupplier: {
      estimatedBaseCost: number;
      externalExecution: false;
      provider: "Printify" | "Printful" | "Other";
      providerContacted: false;
      selectionScore: number;
      supplierCandidateId: string;
    };
    status: "selected_internal_owner_gated" | "blocked";
    summary: string;
  };
  summary: string;
  totals: {
    adDrafts: number;
    autonomousReadyLanes: number;
    blockedExternalActions: number;
    connectorManifests: number;
    paymentApprovals: number;
    productPayloads: number;
    supplierCandidates: number;
  };
};

export type RevenueFirstBusinessLiveExecutorProvider =
  | "Shopify"
  | "Etsy"
  | "Printify"
  | "Printful"
  | "Meta"
  | "Google Analytics"
  | "Manual";

export type RevenueFirstBusinessLiveExecutorStepKind =
  | "connect_storefront"
  | "connect_supplier"
  | "create_supplier_product"
  | "create_storefront_product"
  | "publish_storefront_product"
  | "prepare_content_upload"
  | "prepare_ad_campaign"
  | "activate_ad_spend"
  | "connect_tracking"
  | "record_first_week_evidence";

export type RevenueFirstBusinessLiveExecutorPlan = {
  actualExternalActionsExecuted: false;
  auditEvents: string[];
  blockedExternalActions: string[];
  credentialReadiness: Array<{
    approvalStatus: "owner_approved" | "owner_required";
    credentialRefs: string[];
    externalExecution: false;
    provider: RevenueFirstBusinessLiveExecutorProvider;
    providerContacted: false;
    status: "ready_after_owner_connection" | "missing_owner_unlock";
  }>;
  externalExecution: false;
  generatedAt: string;
  guardrails: string[];
  liveExecutorId: string;
  liveRunbook: Array<{
    approvalRequired: boolean;
    executionState:
      | "ready_live_non_payment"
      | "blocked_owner_unlock"
      | "payment_locked"
      | "internal_tracking_ready";
    externalExecution: false;
    id: string;
    kind: RevenueFirstBusinessLiveExecutorStepKind;
    lane: RevenueFirstBusinessAutonomousLaunchLane;
    paymentRequired: boolean;
    provider: RevenueFirstBusinessLiveExecutorProvider;
    providerContacted: false;
    rollback: string;
    sequence: number;
    title: string;
  }>;
  mode: "Controlled Live First Business Executor";
  ownerUnlock: {
    adDraftApproval: boolean;
    connectorApproval: boolean;
    externalExecution: false;
    paymentExecution: false;
    phraseAccepted: boolean;
    providerContacted: false;
    publicLaunchApproval: boolean;
    status: "accepted_non_payment" | "waiting_owner";
  };
  paymentExecution: false;
  paymentLockedQueue: Array<{
    amount: number;
    externalExecution: false;
    paymentExecution: false;
    provider: RevenueFirstBusinessLiveExecutorProvider;
    providerContacted: false;
    reason: string;
    title: string;
  }>;
  providerActionManifests: Array<{
    approvalRequired: boolean;
    externalExecution: false;
    idempotencyKey: string;
    method: "POST" | "PUT";
    pathTemplate: string;
    payloadState: "prepared_not_sent";
    paymentRequired: boolean;
    provider: RevenueFirstBusinessLiveExecutorProvider;
    providerContacted: false;
    purpose: string;
    rollbackKey: string;
  }>;
  providerContacted: false;
  rollbackPlan: Array<{
    externalExecution: false;
    providerContacted: false;
    step: string;
  }>;
  sourceAutonomousLaunchId: string;
  status: RevenueFirstBusinessLiveExecutorStatus;
  summary: string;
  totals: {
    armedNonPaymentSteps: number;
    blockedSteps: number;
    credentialChecks: number;
    paymentLockedSteps: number;
    providerManifests: number;
    rollbackSteps: number;
  };
};

const prepareFirstStoreBlockedExternalActions = [
  "Creating, changing, or publishing marketplace/storefront records",
  "Creating provider-side products, contacting POD providers, or uploading artwork",
  "Generating live AI artwork through an external provider",
  "Posting, scheduling, or uploading faceless content",
  "Starting, increasing, moving, or reallocating ad spend",
  "Running browser automation, account actions, marketplace operations, or payment changes"
];

const launchFirstBusinessBlockedExternalActions = [
  "Publishing a live store, listing, product, collection, SEO page, or marketplace record",
  "Uploading files, mockups, artwork, videos, captions, scripts, or thumbnails to any provider or platform",
  "Calling POD, marketplace, social, email, ad, browser, banking, payment, or external AI providers",
  "Starting paid campaigns, moving Ad/Growth budget, charging cards, transferring money, or changing payout settings",
  "Using browser automation, account warmup, stealth, proxies, CAPTCHA handling, or platform-evasion workflows"
];

function safeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "first_store";
}

function storePreparationChecklist(packagePlan: RevenueFirstBusinessLaunchPackagePlan) {
  return [
    `Create internal store config snapshot for ${packagePlan.store.businessName} on ${packagePlan.store.storePlatform}.`,
    "Map approved product concepts to internal product setup rows with price, margin, tags, listing title, listing copy, and compliance notes.",
    "Attach internal AI-ready design drafts and mockup directions; external artwork generation remains locked.",
    "Queue faceless content ideas as internal drafts only; posting and scheduling remain locked.",
    "Queue organic-first traffic moves as internal preparation only; outreach, email, social, and SEO publishing remain locked.",
    "Prepare manual evidence fields for visits, units, revenue, saves, comments, conversion notes, and rotation review.",
    "Require a separate explicit live-execution approval before provider, marketplace, browser, upload, ad, bank, or payment actions."
  ];
}

export function buildRevenueFirstStorePreparationPlan(input: {
  approvedAt?: string;
  note?: string | null;
  packagePlan: RevenueFirstBusinessLaunchPackagePlan;
}): RevenueFirstStorePreparationPlan {
  const approvedAt = input.approvedAt ?? new Date().toISOString();
  const products = input.packagePlan.products.map((product) => ({
    ...product,
    executionState: "approved_internal_ready" as const
  }));
  const contentPlan = input.packagePlan.contentIdeas.map((idea) => ({
    ...idea,
    executionState: "approved_internal_ready" as const
  }));
  const organicTrafficPlan = input.packagePlan.organicFirstMoves.map((move) => ({
    ...move,
    executionState: "approved_internal_ready" as const
  }));
  const status: RevenueFirstStorePreparationStatus = input.packagePlan.status === "blocked"
    ? "blocked"
    : "ready_to_execute_internal";

  return {
    approval: {
      approvedAt,
      approvedBy: "operator",
      auditOnly: true,
      externalExecution: false,
      note: input.note ?? null,
      packageId: input.packagePlan.packageId,
      providerContacted: false,
      status: "approved_internal"
    },
    auditEvents: [
      "First Business Launch Package approved internally by operator action.",
      "Prepare First Store packet assembled from the approved package.",
      "No provider, marketplace, browser, ad, social, upload, banking, payment, or external AI action was executed."
    ],
    blockedExternalActions: Array.from(new Set([
      ...prepareFirstStoreBlockedExternalActions,
      ...input.packagePlan.blockedExternalActions
    ])),
    contentPlan,
    externalExecution: false,
    generatedAt: approvedAt,
    guardrails: [
      "Approval only marks the package internally approved; it does not authorize live execution.",
      "Prepared store, product, design, content, and traffic records are internal ready-to-execute instructions.",
      "A separate explicit live-execution approval is required before any external provider, marketplace, upload, browser, ad, bank, or payment action.",
      "Manual evidence must be attached before scale, paid test, or rotation escalation."
    ],
    mode: "Prepare First Store",
    organicTrafficPlan,
    preparationId: `prepare_first_store_${safeId(input.packagePlan.store.sourceStoreId)}_${safeId(approvedAt)}`,
    products,
    providerContacted: false,
    status,
    storeConfig: {
      audience: input.packagePlan.store.audience,
      businessName: input.packagePlan.store.businessName,
      externalExecution: false,
      industry: input.packagePlan.store.industry,
      launchStatus: input.packagePlan.store.launchStatus,
      preparationChecklist: storePreparationChecklist(input.packagePlan),
      providerContacted: false,
      sourceStoreId: input.packagePlan.store.sourceStoreId,
      storePlatform: input.packagePlan.store.storePlatform
    },
    summary: `${input.packagePlan.store.businessName} is approved internally and prepared with ${products.length} product concept${products.length === 1 ? "" : "s"}, ${contentPlan.length} faceless content idea${contentPlan.length === 1 ? "" : "s"}, and ${organicTrafficPlan.length} organic-first move${organicTrafficPlan.length === 1 ? "" : "s"}. External execution remains blocked until explicit live approval.`,
    totals: {
      approvalChecklist: input.packagePlan.approvalChecklist.length,
      blockedExternalActions: Array.from(new Set([
        ...prepareFirstStoreBlockedExternalActions,
        ...input.packagePlan.blockedExternalActions
      ])).length,
      contentIdeas: contentPlan.length,
      organicMoves: organicTrafficPlan.length,
      products: products.length,
      readyInternalSteps: products.length + contentPlan.length + organicTrafficPlan.length + input.packagePlan.approvalChecklist.length
    }
  };
}

function firstBusinessStoreSetupQueue(preparationPlan: RevenueFirstStorePreparationPlan) {
  return [
    `Lock internal launch lane for ${preparationPlan.storeConfig.businessName}.`,
    `Prepare ${preparationPlan.storeConfig.storePlatform} store settings checklist: brand name, audience, navigation, collection plan, policies, SEO title, and manual proof fields.`,
    "Prepare internal storefront content rows only; live storefront writes remain blocked.",
    "Prepare internal product setup queue with pricing, margin, tags, listing copy, compliance notes, mockup directions, and final-approval fields.",
    "Prepare internal faceless content drafts and organic move queue; posting, scheduling, uploading, outreach, and email sends remain blocked.",
    "Prepare manual launch evidence ledger for visits, units, revenue, comments, saves, conversion notes, and rotation review.",
    "Require explicit live-execution approval before provider, marketplace, browser, upload, ad, bank, payout, payment, or social execution."
  ];
}

function firstBusinessLaunchSequence(preparationPlan: RevenueFirstStorePreparationPlan): RevenueFirstBusinessInternalLaunchPlan["launchSequence"] {
  const storeSlug = safeId(preparationPlan.storeConfig.sourceStoreId);

  return [
    {
      externalExecution: false,
      id: `launch_${storeSlug}_store_setup`,
      order: 1,
      providerContacted: false,
      state: "ready_internal",
      title: "Prepare internal store setup packet"
    },
    {
      externalExecution: false,
      id: `launch_${storeSlug}_product_queue`,
      order: 2,
      providerContacted: false,
      state: "ready_internal",
      title: "Queue first product setup packets"
    },
    {
      externalExecution: false,
      id: `launch_${storeSlug}_design_queue`,
      order: 3,
      providerContacted: false,
      state: "ready_internal",
      title: "Queue internal design and mockup approval packets"
    },
    {
      externalExecution: false,
      id: `launch_${storeSlug}_content_queue`,
      order: 4,
      providerContacted: false,
      state: "ready_internal",
      title: "Queue faceless content drafts"
    },
    {
      externalExecution: false,
      id: `launch_${storeSlug}_organic_queue`,
      order: 5,
      providerContacted: false,
      state: "ready_internal",
      title: "Queue organic-first traffic moves"
    },
    {
      externalExecution: false,
      id: `launch_${storeSlug}_evidence`,
      order: 6,
      providerContacted: false,
      state: "ready_internal",
      title: "Prepare manual evidence and rotation review fields"
    }
  ];
}

function firstLaunchProductScore(product: RevenueFirstStorePreparationPlan["products"][number]) {
  const approvalBoost = product.approvalState === "ready_to_approve" ? 60
    : product.approvalState === "needs_manual_review" ? 20
      : -80;
  const recommendationBoost = product.recommendation === "scale" ? 45
    : product.recommendation === "watch" ? 25
      : product.recommendation === "pause" ? -20 : -80;

  return approvalBoost + recommendationBoost + product.score + product.profitMargin;
}

function selectFirstLaunchProducts(preparationPlan: RevenueFirstStorePreparationPlan) {
  return [...preparationPlan.products]
    .sort((left, right) => (
      firstLaunchProductScore(right) - firstLaunchProductScore(left)
      || right.score - left.score
      || right.profitMargin - left.profitMargin
    ))
    .slice(0, 5);
}

function selectContentDraftsForProducts(
  preparationPlan: RevenueFirstStorePreparationPlan,
  productSetupQueue: RevenueFirstBusinessInternalLaunchPlan["productSetupQueue"]
) {
  const selectedCandidateIds = new Set(productSetupQueue.map((product) => product.candidateId));
  const productContent = preparationPlan.contentPlan.filter((idea) => selectedCandidateIds.has(idea.candidateId));
  const fallbackContent = preparationPlan.contentPlan.filter((idea) => !selectedCandidateIds.has(idea.candidateId));

  return [...productContent, ...fallbackContent]
    .slice(0, Math.max(3, Math.min(5, productSetupQueue.length)))
    .map((idea, index) => ({
      ...idea,
      executionLocked: true as const,
      launchState: "queued_internal_content_draft" as const,
      sequence: index + 1
    }));
}

export function buildRevenueFirstBusinessInternalLaunchPlan(input: {
  launchedAt?: string;
  note?: string | null;
  preparationPlan: RevenueFirstStorePreparationPlan;
}): RevenueFirstBusinessInternalLaunchPlan {
  const launchedAt = input.launchedAt ?? new Date().toISOString();
  const selectedProducts = selectFirstLaunchProducts(input.preparationPlan);
  const productSetupQueue = selectedProducts.map((product, index) => ({
    ...product,
    executionLocked: true as const,
    launchState: "queued_internal_product_setup" as const,
    sequence: index + 1
  }));
  const status: RevenueFirstBusinessInternalLaunchStatus = input.preparationPlan.status === "ready_to_execute_internal" && productSetupQueue.length >= 3
    ? "approved_for_launch_internal"
    : "blocked";
  const contentDraftQueue = selectContentDraftsForProducts(input.preparationPlan, productSetupQueue);
  const organicMoveQueue = input.preparationPlan.organicTrafficPlan.slice(0, 6).map((move, index) => ({
    ...move,
    executionLocked: true as const,
    launchState: "queued_internal_organic_move" as const,
    sequence: index + 1
  }));
  const setupQueue = firstBusinessStoreSetupQueue(input.preparationPlan);
  const launchSequence = firstBusinessLaunchSequence(input.preparationPlan);
  const blockedExternalActions = Array.from(new Set([
    ...launchFirstBusinessBlockedExternalActions,
    ...input.preparationPlan.blockedExternalActions
  ]));
  const evidenceLedgerFields = [
    "manualVisits",
    "manualUnitsSold",
    "manualGrossRevenue",
    "manualNetProfit",
    "manualContentViews",
    "manualSavesOrShares",
    "manualConversionNotes",
    "manualRotationRecommendation",
    "manualOperatorReview"
  ];

  return {
    auditEvents: [
      "Launch First Business internal packet assembled from the approved Prepare First Store packet.",
      "Store setup, product setup, faceless content, organic moves, and evidence fields were queued internally.",
      "No live provider, marketplace, upload, browser, ad, social, banking, payment, payout, or external AI action was executed."
    ],
    blockedExternalActions,
    contentDraftQueue,
    evidenceLedgerFields,
    externalExecution: false,
    generatedAt: launchedAt,
    guardrails: [
      "Launch First Business creates an internal ready-to-execute launch packet only.",
      "All store setup, product setup, content, traffic, and evidence steps are private internal instructions until explicit live execution approval is granted.",
      "Separate live approval is required before any provider, marketplace, browser, upload, external AI, ad, social, email, banking, payout, payment, or platform action.",
      "Organic-first moves are prioritized; paid spend remains locked inside Financial Orchestrator approval controls."
    ],
    launchApproval: {
      approvedAt: launchedAt,
      approvedBy: "operator",
      auditOnly: true,
      externalExecution: false,
      note: input.note ?? null,
      packageId: input.preparationPlan.approval.packageId,
      preparationId: input.preparationPlan.preparationId,
      providerContacted: false,
      status: "approved_for_launch_internal"
    },
    launchId: `launch_first_business_${safeId(input.preparationPlan.storeConfig.sourceStoreId)}_${safeId(launchedAt)}`,
    launchSequence,
    mode: "Launch First Business",
    organicMoveQueue,
    productSetupQueue,
    providerContacted: false,
    status,
    finalExecutionPacket: {
      approvalState: "approved_for_launch_internal",
      blockedExternalActions,
      evidenceLedgerFields,
      executionChecklist: [
        "Review final internal store setup packet.",
        "Review 3-5 selected product setup packets.",
        "Review linked faceless content drafts.",
        "Review organic-first traffic move queue.",
        "Attach manual evidence fields before any performance rotation.",
        "Request separate explicit live-execution approval before any external action."
      ],
      externalExecution: false,
      facelessContentIdeas: contentDraftQueue,
      organicMoves: organicMoveQueue,
      products: productSetupQueue,
      providerContacted: false,
      store: {
        ...input.preparationPlan.storeConfig,
        launchState: "queued_internal_store_setup",
        setupQueue
      }
    },
    storeSetup: {
      ...input.preparationPlan.storeConfig,
      launchState: "queued_internal_store_setup",
      setupQueue
    },
    summary: `${input.preparationPlan.storeConfig.businessName} is approved for launch internally with ${productSetupQueue.length} selected product setup packet${productSetupQueue.length === 1 ? "" : "s"}, ${contentDraftQueue.length} linked faceless content draft${contentDraftQueue.length === 1 ? "" : "s"}, ${organicMoveQueue.length} organic-first move${organicMoveQueue.length === 1 ? "" : "s"}, and ${launchSequence.length} internal launch step${launchSequence.length === 1 ? "" : "s"}. External execution remains locked until explicit live approval.`,
    totals: {
      blockedExternalActions: blockedExternalActions.length,
      contentDrafts: contentDraftQueue.length,
      evidenceFields: evidenceLedgerFields.length,
      launchSequenceSteps: launchSequence.length,
      organicMoves: organicMoveQueue.length,
      products: productSetupQueue.length,
      readyExecutionItems: setupQueue.length + productSetupQueue.length + contentDraftQueue.length + organicMoveQueue.length + launchSequence.length + evidenceLedgerFields.length,
      storeSetupSteps: setupQueue.length
    }
  };
}

function firstBusinessManualRunbook(launchPlan: RevenueFirstBusinessInternalLaunchPlan): RevenueFirstBusinessExecutionPlan["manualLaunchRunbook"] {
  const storeSlug = safeId(launchPlan.storeSetup.sourceStoreId);

  return [
    {
      externalExecution: false,
      id: `execute_${storeSlug}_store`,
      order: 1,
      packetSection: "store",
      providerContacted: false,
      status: "ready_manual",
      title: "Manually create or update the store shell from the approved store packet"
    },
    {
      externalExecution: false,
      id: `execute_${storeSlug}_products`,
      order: 2,
      packetSection: "products",
      providerContacted: false,
      status: "ready_manual",
      title: `Manually create ${launchPlan.finalExecutionPacket.products.length} approved product listing draft${launchPlan.finalExecutionPacket.products.length === 1 ? "" : "s"}`
    },
    {
      externalExecution: false,
      id: `execute_${storeSlug}_content`,
      order: 3,
      packetSection: "content",
      providerContacted: false,
      status: "ready_manual",
      title: "Prepare approved faceless content drafts for manual posting review"
    },
    {
      externalExecution: false,
      id: `execute_${storeSlug}_organic`,
      order: 4,
      packetSection: "organic",
      providerContacted: false,
      status: "ready_manual",
      title: "Run organic-first launch moves manually after live approval"
    },
    {
      externalExecution: false,
      id: `execute_${storeSlug}_evidence`,
      order: 5,
      packetSection: "evidence",
      providerContacted: false,
      status: "ready_manual",
      title: "Record first traffic, sales, and content evidence into the manual ledger"
    },
    {
      externalExecution: false,
      id: `execute_${storeSlug}_review`,
      order: 6,
      packetSection: "review",
      providerContacted: false,
      status: "ready_manual",
      title: "Review first revenue signals before scale, spend, or rotation changes"
    }
  ];
}

function firstBusinessSemiAutomatedQueue(launchPlan: RevenueFirstBusinessInternalLaunchPlan): RevenueFirstBusinessExecutionPlan["semiAutomatedPreparationQueue"] {
  const storeSlug = safeId(launchPlan.storeSetup.sourceStoreId);

  return [
    {
      externalExecution: false,
      id: `semi_${storeSlug}_copy_packet`,
      providerContacted: false,
      status: "ready_internal",
      title: "Prepare copy/paste store setup packet for operator review"
    },
    {
      externalExecution: false,
      id: `semi_${storeSlug}_product_rows`,
      providerContacted: false,
      status: "ready_internal",
      title: "Prepare product setup rows for manual import or copy/paste"
    },
    {
      externalExecution: false,
      id: `semi_${storeSlug}_content_rows`,
      providerContacted: false,
      status: "ready_internal",
      title: "Prepare faceless content rows for manual review"
    },
    {
      externalExecution: false,
      id: `semi_${storeSlug}_organic_rows`,
      providerContacted: false,
      status: "ready_internal",
      title: "Prepare organic move checklist for manual execution"
    }
  ];
}

function uniqueText(values: string[]) {
  const seen = new Set<string>();

  return values
    .map((value) => value.trim())
    .filter((value) => {
      const key = value.toLowerCase();
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function wordsFrom(value: string) {
  return value
    .split(/[^A-Za-z0-9]+/g)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length >= 3);
}

function firstBusinessSeoKeywords(
  product: RevenueFirstBusinessInternalLaunchPlan["productSetupQueue"][number],
  store: RevenueFirstBusinessInternalLaunchPlan["storeSetup"]
) {
  return uniqueText([
    ...product.tags,
    product.productName,
    product.productType,
    store.businessName,
    store.industry,
    store.audience,
    ...wordsFrom(product.designTheme),
    ...wordsFrom(product.designConcept),
    "original merch",
    "gift",
    "organic launch"
  ]).slice(0, 14);
}

function firstBusinessListingBullets(
  product: RevenueFirstBusinessInternalLaunchPlan["productSetupQueue"][number],
  store: RevenueFirstBusinessInternalLaunchPlan["storeSetup"]
) {
  return [
    `${product.productName} is prepared for ${store.audience}.`,
    `${product.designConcept} with ${product.internalDesignDraft.typography} typography.`,
    `${product.productType} listing draft priced at $${product.retailPrice.toFixed(2)} with ${product.profitMargin}% target margin.`,
    `Internal design prompt and mockup direction are ready for manual approval before any external generation.`,
    "Provider, upload, marketplace, and paid traffic actions remain locked."
  ];
}

function buildListingProductPack(launchPlan: RevenueFirstBusinessInternalLaunchPlan): RevenueFirstBusinessListingProductPackItem[] {
  return launchPlan.finalExecutionPacket.products.map((product) => ({
    approvalChecklist: [
      "Approve final listing title, description, and price.",
      "Approve design prompt, negative prompt, mockup direction, placement, palette, and typography.",
      "Confirm original-work and trademark review before any artwork generation or provider upload.",
      "Confirm product can be created manually only after explicit live approval.",
      "Confirm first-week tracking fields are ready before launch."
    ],
    candidateId: product.candidateId,
    designSpec: {
      externalGeneration: false,
      mockupDirection: product.internalDesignDraft.mockupDirection,
      negativePrompt: product.internalDesignDraft.negativePrompt,
      palette: product.internalDesignDraft.palette,
      placement: product.internalDesignDraft.placement,
      prompt: product.internalDesignDraft.prompt,
      providerContacted: false,
      typography: product.internalDesignDraft.typography
    },
    externalExecution: false,
    listingBullets: firstBusinessListingBullets(product, launchPlan.storeSetup),
    listingDescription: product.listingDescription,
    listingTitle: product.listingTitle,
    productName: product.productName,
    productType: product.productType,
    profitMargin: product.profitMargin,
    providerContacted: false,
    retailPrice: product.retailPrice,
    seoKeywords: firstBusinessSeoKeywords(product, launchPlan.storeSetup),
    status: "ready_internal",
    storefrontCollection: `${launchPlan.storeSetup.businessName} First Drop`,
    tags: product.tags
  }));
}

function buildFirstWeekTrackingPlan(): RevenueFirstBusinessExecutionPlan["firstWeekTrackingPlan"] {
  return {
    checkIns: [
      {
        day: 0,
        requiredEvidence: ["storeUrl", "productUrls", "launchTimestamp", "operatorNotes"],
        title: "Launch day proof"
      },
      {
        day: 1,
        requiredEvidence: ["manualVisits", "contentViews", "clicks", "unitsSold", "grossRevenue"],
        title: "First 24 hour signal check"
      },
      {
        day: 3,
        requiredEvidence: ["trafficSources", "bestContentHook", "productPageNotes", "conversionNotes"],
        title: "First 72 hour optimization check"
      },
      {
        day: 7,
        requiredEvidence: ["manualNetProfit", "topProduct", "weakestProduct", "rotationRecommendation"],
        title: "First week Revenue Engine review"
      }
    ],
    externalExecution: false,
    metricFields: [
      { cadence: "twice_daily", id: "manualVisits", label: "Manual visits" },
      { cadence: "twice_daily", id: "manualUnitsSold", label: "Units sold" },
      { cadence: "daily", id: "manualGrossRevenue", label: "Gross revenue" },
      { cadence: "daily", id: "manualNetProfit", label: "Net profit" },
      { cadence: "daily", id: "manualContentViews", label: "Content views" },
      { cadence: "daily", id: "manualClicks", label: "Content or listing clicks" },
      { cadence: "daily", id: "manualConversionNotes", label: "Conversion notes" },
      { cadence: "end_of_week", id: "manualRotationRecommendation", label: "Scale/watch/pause/kill recommendation" }
    ],
    providerContacted: false,
    rotationReview: {
      day: 7,
      inputs: [
        "manualVisits",
        "manualUnitsSold",
        "manualGrossRevenue",
        "manualNetProfit",
        "manualContentViews",
        "manualConversionNotes",
        "manualRotationRecommendation"
      ],
      output: "feed_revenue_engine_scale_watch_pause_kill"
    }
  };
}

function buildFirstLaunchReadinessGate(input: {
  executionStatus: RevenueFirstBusinessExecutionStatus;
  generatedAt: string;
  launchPlan: RevenueFirstBusinessInternalLaunchPlan;
  listingProductPack: RevenueFirstBusinessListingProductPackItem[];
}): RevenueFirstBusinessExecutionPlan["firstLaunchReadinessGate"] {
  const productCount = input.launchPlan.finalExecutionPacket.products.length;
  const contentCount = input.launchPlan.finalExecutionPacket.facelessContentIdeas.length;
  const organicMoveCount = input.launchPlan.finalExecutionPacket.organicMoves.length;
  const items: RevenueFirstBusinessExecutionPlan["firstLaunchReadinessGate"]["items"] = [
    {
      category: "store",
      detail: `${input.launchPlan.storeSetup.businessName} store setup packet has ${input.launchPlan.storeSetup.setupQueue.length} internal setup step${input.launchPlan.storeSetup.setupQueue.length === 1 ? "" : "s"}.`,
      externalExecution: false,
      providerContacted: false,
      required: true,
      status: input.executionStatus === "ready_to_launch_first_business" && input.launchPlan.storeSetup.setupQueue.length > 0 ? "ready" : "blocked",
      title: "Store config ready"
    },
    {
      category: "products",
      detail: `${productCount} selected product setup packet${productCount === 1 ? "" : "s"} are inside the final execution packet.`,
      externalExecution: false,
      providerContacted: false,
      required: true,
      status: productCount >= 3 && productCount <= 5 ? "ready" : "blocked",
      title: "3-5 products selected"
    },
    {
      category: "listings",
      detail: `${input.listingProductPack.length} listing-ready product row${input.listingProductPack.length === 1 ? "" : "s"} include title, description, bullets, SEO keywords, price, and margin.`,
      externalExecution: false,
      providerContacted: false,
      required: true,
      status: input.listingProductPack.length === productCount && input.listingProductPack.every((product) => product.seoKeywords.length > 0 && product.listingBullets.length > 0) ? "ready" : "blocked",
      title: "Listing pack complete"
    },
    {
      category: "designs",
      detail: "Each product has an internal prompt, negative prompt, mockup direction, placement, palette, and typography spec.",
      externalExecution: false,
      providerContacted: false,
      required: true,
      status: input.listingProductPack.every((product) => product.designSpec.prompt.length > 0 && product.designSpec.externalGeneration === false) ? "ready" : "blocked",
      title: "Design specs ready internally"
    },
    {
      category: "content",
      detail: `${contentCount} faceless content draft${contentCount === 1 ? "" : "s"} are linked to the first products.`,
      externalExecution: false,
      providerContacted: false,
      required: true,
      status: contentCount >= 3 ? "ready" : "blocked",
      title: "Faceless content hooks ready"
    },
    {
      category: "traffic",
      detail: `${organicMoveCount} organic-first move${organicMoveCount === 1 ? "" : "s"} are prepared. Paid spend stays locked.`,
      externalExecution: false,
      providerContacted: false,
      required: true,
      status: organicMoveCount > 0 ? "ready" : "blocked",
      title: "Organic traffic path ready"
    },
    {
      category: "finance",
      detail: "Paid spend, provider charges, cards, banking, payout, and budget movement remain locked behind separate approval.",
      externalExecution: false,
      providerContacted: false,
      required: true,
      status: "ready",
      title: "Financial guardrail active"
    },
    {
      category: "evidence",
      detail: `${input.launchPlan.finalExecutionPacket.evidenceLedgerFields.length} first-week evidence field${input.launchPlan.finalExecutionPacket.evidenceLedgerFields.length === 1 ? "" : "s"} are ready for manual tracking.`,
      externalExecution: false,
      providerContacted: false,
      required: true,
      status: input.launchPlan.finalExecutionPacket.evidenceLedgerFields.length > 0 ? "ready" : "blocked",
      title: "Evidence ledger ready"
    },
    {
      category: "external_lock",
      detail: "Provider calls, browser work, uploads, ad spend, marketplace publishing, social posting, bank, and payment actions are still blocked.",
      externalExecution: false,
      providerContacted: false,
      required: true,
      status: input.launchPlan.externalExecution === false && input.launchPlan.providerContacted === false ? "ready" : "blocked",
      title: "External action lock verified"
    }
  ];
  const ready = items.filter((item) => item.status === "ready").length;
  const blocked = items.length - ready;
  const status: RevenueFirstBusinessReadinessGateStatus = blocked === 0 && input.executionStatus === "ready_to_launch_first_business"
    ? "ready_for_manual_launch_approval"
    : "blocked";

  return {
    externalExecution: false,
    generatedAt: input.generatedAt,
    items,
    label: "First Launch Readiness Gate",
    providerContacted: false,
    status,
    summary: status === "ready_for_manual_launch_approval"
      ? `${input.launchPlan.storeSetup.businessName} passes the First Launch Readiness Gate with ${ready}/${items.length} required checks ready. Live external action still requires explicit approval.`
      : `${input.launchPlan.storeSetup.businessName} is blocked at the First Launch Readiness Gate with ${blocked} unresolved check${blocked === 1 ? "" : "s"}.`,
    totals: {
      blocked,
      ready,
      required: items.length
    }
  };
}

function buildContentCalendar(launchPlan: RevenueFirstBusinessInternalLaunchPlan): RevenueFirstBusinessExecutionPlan["launchHandoffPacket"]["contentCalendar"] {
  return launchPlan.finalExecutionPacket.facelessContentIdeas.map((idea, index) => ({
    captionDraft: `${idea.hook} ${idea.productName} is ready for the first organic launch wave. Link goes live only after approval.`,
    channel: idea.channel,
    contentIdeaId: idea.id,
    externalExecution: false,
    hook: idea.hook,
    providerContacted: false,
    scriptDraft: `${idea.hook} Show the problem, reveal the product angle, call out ${idea.productName}, and ask viewers to save or comment. ${idea.scriptAngle}`,
    sequence: index + 1,
    status: "ready_internal"
  }));
}

function buildLaunchHandoffPacket(input: {
  executionId: string;
  executionStatus: RevenueFirstBusinessExecutionStatus;
  launchPlan: RevenueFirstBusinessInternalLaunchPlan;
  listingProductPack: RevenueFirstBusinessListingProductPackItem[];
}): RevenueFirstBusinessExecutionPlan["launchHandoffPacket"] {
  const contentCalendar = buildContentCalendar(input.launchPlan);
  const organicLaunchMoves = input.launchPlan.finalExecutionPacket.organicMoves.map((move) => ({
    ...move,
    manualExecutionNote: "Execute manually only after explicit live approval; no browser, upload, social, provider, or marketplace action is authorized by this packet.",
    status: "ready_internal" as const
  }));
  const manualExecutionChecklist = [
    "Review and approve the First Launch Readiness Gate.",
    "Review store setup instructions, policies, navigation, collection naming, SEO title, and evidence fields.",
    "Review each listing-ready product row for title, description, bullets, SEO keywords, price, margin, tags, and design spec.",
    "Approve designs manually before any external AI generation, mockup creation, provider upload, or marketplace work.",
    "Review faceless content captions and scripts for manual organic posting.",
    "Review organic launch moves and keep paid spend locked.",
    "Grant separate explicit live approval outside this packet before any external action.",
    "Record launch-day and first-week evidence into the manual tracking fields."
  ];

  return {
    blockedExternalActions: input.launchPlan.finalExecutionPacket.blockedExternalActions,
    contentCalendar,
    explicitLiveApprovalRequired: true,
    externalExecution: false,
    handoffId: `handoff_${safeId(input.executionId)}`,
    manualExecutionChecklist,
    organicLaunchMoves,
    products: input.listingProductPack,
    providerContacted: false,
    status: input.executionStatus === "ready_to_launch_first_business" ? "ready_for_operator_review" : "blocked",
    store: {
      ...input.launchPlan.finalExecutionPacket.store,
      manualSetupInstructions: input.launchPlan.finalExecutionPacket.store.setupQueue
    },
    summary: `${input.launchPlan.storeSetup.businessName} handoff packet is ready for operator review with ${input.listingProductPack.length} listing-ready products, ${contentCalendar.length} content drafts, and ${organicLaunchMoves.length} organic moves. External execution remains locked.`
  };
}

export function buildRevenueFirstBusinessExecutionPlan(input: {
  executedAt?: string;
  launchPlan: RevenueFirstBusinessInternalLaunchPlan;
  note?: string | null;
}): RevenueFirstBusinessExecutionPlan {
  const executedAt = input.executedAt ?? new Date().toISOString();
  const status: RevenueFirstBusinessExecutionStatus = input.launchPlan.status === "approved_for_launch_internal"
    ? "ready_to_launch_first_business"
    : "blocked";
  const manualLaunchRunbook = firstBusinessManualRunbook(input.launchPlan);
  const semiAutomatedPreparationQueue = firstBusinessSemiAutomatedQueue(input.launchPlan);
  const executionId = `execute_first_business_${safeId(input.launchPlan.storeSetup.sourceStoreId)}_${safeId(executedAt)}`;
  const listingProductPack = buildListingProductPack(input.launchPlan);
  const firstLaunchReadinessGate = buildFirstLaunchReadinessGate({
    executionStatus: status,
    generatedAt: executedAt,
    launchPlan: input.launchPlan,
    listingProductPack
  });
  const firstWeekTrackingPlan = buildFirstWeekTrackingPlan();
  const launchHandoffPacket = buildLaunchHandoffPacket({
    executionId,
    executionStatus: status,
    launchPlan: input.launchPlan,
    listingProductPack
  });
  const blockedExternalActions = Array.from(new Set([
    ...input.launchPlan.blockedExternalActions,
    "Manual launch may proceed only after explicit live approval outside this internal packet",
    "Semi-automated preparation may generate internal rows only; no provider, browser, upload, marketplace, social, ad, bank, or payment action is allowed"
  ]));

  return {
    auditEvents: [
      "Execute First Business packet prepared from the approved final execution packet.",
      "Manual and semi-automated launch preparation queues were assembled internally.",
      "No provider, marketplace, browser, upload, ad, social, banking, payment, payout, or external AI action was executed."
    ],
    blockedExternalActions,
    executionApproval: {
      approvedAt: executedAt,
      approvedBy: "operator",
      auditOnly: true,
      externalExecution: false,
      launchId: input.launchPlan.launchId,
      note: input.note ?? null,
      providerContacted: false,
      status: "ready_to_launch_first_business"
    },
    executionId,
    externalExecution: false,
    firstLaunchReadinessGate,
    finalExecutionPacket: input.launchPlan.finalExecutionPacket,
    firstWeekTrackingPlan,
    generatedAt: executedAt,
    guardrails: [
      "Execute First Business prepares manual and semi-automated launch work only.",
      "Manual launch work is ready for the operator, but live external execution remains blocked until explicit approval.",
      "Semi-automated preparation may assemble rows, checklists, and copy packets only; it may not call providers, upload files, run browsers, spend money, or publish content.",
      "First revenue collection starts organic-first, with paid spend locked behind Financial Orchestrator controls."
    ],
    launchHandoffPacket,
    listingProductPack,
    manualLaunchRunbook,
    mode: "Execute First Business",
    providerContacted: false,
    readyState: {
      externalExecution: false,
      label: "Ready to Launch First Business",
      manualLaunchReady: status === "ready_to_launch_first_business",
      providerContacted: false,
      semiAutomatedPreparationReady: status === "ready_to_launch_first_business"
    },
    revenueStartPlan: {
      first24Hours: [
        "Manually publish approved store and product setup only after live approval.",
        "Manually post or queue the first approved organic content draft only after live approval.",
        "Record visits, units, gross revenue, net profit, and content response manually."
      ],
      first72Hours: [
        "Collect manual evidence twice daily.",
        "Keep paid spend locked until Financial Orchestrator scale packet approval.",
        "Feed first sales and content signals back into Revenue Engine rotation."
      ],
      organicFirst: true,
      paidSpendLocked: true
    },
    semiAutomatedPreparationQueue,
    sourceLaunchId: input.launchPlan.launchId,
    status,
    summary: `${input.launchPlan.storeSetup.businessName} is Ready to Launch First Business internally with ${input.launchPlan.finalExecutionPacket.products.length} product${input.launchPlan.finalExecutionPacket.products.length === 1 ? "" : "s"}, ${input.launchPlan.finalExecutionPacket.facelessContentIdeas.length} faceless content idea${input.launchPlan.finalExecutionPacket.facelessContentIdeas.length === 1 ? "" : "s"}, and ${input.launchPlan.finalExecutionPacket.organicMoves.length} organic move${input.launchPlan.finalExecutionPacket.organicMoves.length === 1 ? "" : "s"}. Manual and semi-automated launch prep are ready; external execution remains locked until explicit live approval.`,
    totals: {
      blockedExternalActions: blockedExternalActions.length,
      finalProducts: input.launchPlan.finalExecutionPacket.products.length,
      firstWeekMetricFields: firstWeekTrackingPlan.metricFields.length,
      handoffProducts: launchHandoffPacket.products.length,
      manualSteps: manualLaunchRunbook.length,
      organicMoves: input.launchPlan.finalExecutionPacket.organicMoves.length,
      readyLaunchItems: input.launchPlan.finalExecutionPacket.products.length
        + input.launchPlan.finalExecutionPacket.facelessContentIdeas.length
        + input.launchPlan.finalExecutionPacket.organicMoves.length
        + manualLaunchRunbook.length
        + semiAutomatedPreparationQueue.length,
      readinessBlocked: firstLaunchReadinessGate.totals.blocked,
      readinessReady: firstLaunchReadinessGate.totals.ready,
      semiAutomatedSteps: semiAutomatedPreparationQueue.length
    }
  };
}

function averageRetailPrice(products: RevenueFirstBusinessListingProductPackItem[]) {
  if (products.length === 0) return 35;

  return products.reduce((sum, product) => sum + product.retailPrice, 0) / products.length;
}

function buildAutonomousSupplierPlan(
  executionPlan: RevenueFirstBusinessExecutionPlan
): RevenueFirstBusinessAutonomousLaunchPlan["supplierPlan"] {
  const productTypes = Array.from(new Set(executionPlan.listingProductPack.map((product) => product.productType)));
  const averageRetail = averageRetailPrice(executionPlan.listingProductPack);
  const candidates: RevenueFirstBusinessAutonomousLaunchPlan["supplierPlan"]["candidates"] = [
    {
      estimatedBaseCost: Number(Math.max(8, averageRetail * 0.36).toFixed(2)),
      externalExecution: false,
      provider: "Printify",
      providerContacted: false,
      reasons: [
        "Broad POD catalog coverage for first-store validation.",
        `Supports ${productTypes.slice(0, 3).join(", ") || "core merch"} launch products.`,
        "Good fit for fast internal payload preparation before owner-approved connector setup."
      ],
      selectionScore: executionPlan.finalExecutionPacket.store.storePlatform === "Shopify" ? 94 : 90,
      status: "candidate_internal",
      supplierCandidateId: "supplier_printify_first_drop"
    },
    {
      estimatedBaseCost: Number(Math.max(9, averageRetail * 0.39).toFixed(2)),
      externalExecution: false,
      provider: "Printful",
      providerContacted: false,
      reasons: [
        "Reliable backup supplier candidate for quality-sensitive products.",
        "Useful fallback if primary connector scope is not approved.",
        "Prepared internally only; no provider account was contacted."
      ],
      selectionScore: 84,
      status: "candidate_internal",
      supplierCandidateId: "supplier_printful_backup"
    },
    {
      estimatedBaseCost: Number(Math.max(10, averageRetail * 0.42).toFixed(2)),
      externalExecution: false,
      provider: "Other",
      providerContacted: false,
      reasons: [
        "Manual fallback lane if approved POD providers are unavailable.",
        "Keeps first-store package launchable even while connectors are pending.",
        "Requires owner-selected supplier before any live order or upload."
      ],
      selectionScore: 68,
      status: "candidate_internal",
      supplierCandidateId: "supplier_manual_backup"
    }
  ];

  candidates.sort((left, right) => right.selectionScore - left.selectionScore);
  const selected = candidates[0] ?? candidates[2];

  return {
    candidates,
    externalExecution: false,
    providerContacted: false,
    selectedSupplier: {
      estimatedBaseCost: selected.estimatedBaseCost,
      externalExecution: false,
      provider: selected.provider,
      providerContacted: false,
      selectionScore: selected.selectionScore,
      supplierCandidateId: selected.supplierCandidateId
    },
    status: executionPlan.status === "ready_to_launch_first_business" ? "selected_internal_owner_gated" : "blocked",
    summary: `${selected.provider} is selected internally for ${executionPlan.finalExecutionPacket.store.businessName} with score ${selected.selectionScore}/100. No supplier was contacted; account, upload, and order actions need owner approval.`
  };
}

function buildAutonomousStoreBuildPlan(
  executionPlan: RevenueFirstBusinessExecutionPlan
): RevenueFirstBusinessAutonomousLaunchPlan["storeBuildPlan"] {
  const store = executionPlan.finalExecutionPacket.store;
  const collectionName = executionPlan.listingProductPack[0]?.storefrontCollection ?? `${store.businessName} First Drop`;

  return {
    businessName: store.businessName,
    collectionPlan: [
      collectionName,
      `${store.industry} New Arrivals`,
      "Best Sellers",
      "Launch Week"
    ],
    externalExecution: false,
    navigationPlan: [
      "Home",
      collectionName,
      "About",
      "Contact",
      "Policies"
    ],
    policyDrafts: [
      "Draft production partner disclosure for POD fulfillment.",
      "Draft returns and shipping policy for owner review.",
      "Draft AI/design disclosure note where required by marketplace rules."
    ],
    providerContacted: false,
    seoPlan: {
      description: `${store.businessName} first private launch drop for ${store.audience}. Original ${store.industry} products prepared by ENTRAL.`,
      title: `${store.businessName} | ${collectionName}`
    },
    setupPayloadState: "prepared_not_sent",
    status: executionPlan.status === "ready_to_launch_first_business" ? "autonomous_internal_ready" : "blocked",
    storePlatform: store.storePlatform
  };
}

function buildAutonomousProductCreationPlan(
  executionPlan: RevenueFirstBusinessExecutionPlan,
  supplierCandidateId: string
): RevenueFirstBusinessAutonomousLaunchPlan["productCreationPlan"] {
  return executionPlan.listingProductPack.map((product) => ({
    ...product,
    connectorPayloadStatus: "prepared_not_sent",
    creationLane: "autonomous_internal_ready",
    supplierCandidateId
  }));
}

function buildAutonomousConnectionPlan(
  executionPlan: RevenueFirstBusinessExecutionPlan,
  supplierProvider: "Printify" | "Printful" | "Other"
): RevenueFirstBusinessAutonomousLaunchPlan["connectionPlan"] {
  const storefrontProvider: "Shopify" | "Etsy" = executionPlan.finalExecutionPacket.store.storePlatform === "Shopify"
    ? "Shopify"
    : "Etsy";
  const supplierConnector: "Printify" | "Printful" = supplierProvider === "Printful" ? "Printful" : "Printify";
  const connectorManifests: RevenueFirstBusinessAutonomousLaunchPlan["connectionPlan"]["connectorManifests"] = [
    {
      approvalRequired: true,
      credentialScopes: storefrontProvider === "Shopify"
        ? ["products:write", "collections:write", "themes:read", "orders:read"]
        : ["listings:write", "shops:read", "transactions:read"],
      externalExecution: false,
      payloadState: "prepared_not_sent",
      provider: storefrontProvider,
      providerContacted: false,
      purpose: "Create store shell, product listing drafts, collections, SEO metadata, and launch-day tracking fields."
    },
    {
      approvalRequired: true,
      credentialScopes: ["catalog:read", "products:write", "uploads:write", "orders:read"],
      externalExecution: false,
      payloadState: "prepared_not_sent",
      provider: supplierConnector,
      providerContacted: false,
      purpose: "Prepare POD products, variants, mockup slots, production partner notes, and supplier mapping."
    },
    {
      approvalRequired: true,
      credentialScopes: ["campaigns:write", "ads:write", "pixels:read"],
      externalExecution: false,
      payloadState: "prepared_not_sent",
      provider: "Meta",
      providerContacted: false,
      purpose: "Keep paid campaign drafts ready for later owner-approved Ad/Growth activation."
    },
    {
      approvalRequired: true,
      credentialScopes: ["analytics:read", "events:read"],
      externalExecution: false,
      payloadState: "prepared_not_sent",
      provider: "Google Analytics",
      providerContacted: false,
      purpose: "Prepare read-only launch performance tracking after owner-approved connection."
    }
  ];

  return {
    connectorManifests,
    externalExecution: false,
    providerContacted: false,
    status: executionPlan.status === "ready_to_launch_first_business" ? "connector_ready_owner_gated" : "blocked",
    summary: `${connectorManifests.length} connector manifests are prepared but not sent. Credentials, API calls, uploads, tracking installs, and store writes remain owner-gated.`
  };
}

function buildAutonomousAdCampaignDrafts(
  executionPlan: RevenueFirstBusinessExecutionPlan
): RevenueFirstBusinessAutonomousLaunchPlan["adCampaignDrafts"] {
  const products = executionPlan.listingProductPack.slice(0, 5);
  const productNames = products.map((product) => product.productName);
  const audience = executionPlan.finalExecutionPacket.store.audience;

  return [
    {
      audience,
      budgetApprovalRequired: true,
      campaignName: `${executionPlan.finalExecutionPacket.store.businessName} Organic Proof Amplifier`,
      dailyBudgetCap: 5,
      externalExecution: false,
      objective: "organic_amplification",
      paymentExecution: false,
      productNames,
      providerContacted: false,
      spendState: "payment_required",
      status: "draft_locked"
    },
    {
      audience,
      budgetApprovalRequired: true,
      campaignName: `${executionPlan.finalExecutionPacket.store.businessName} First Product Validation`,
      dailyBudgetCap: 10,
      externalExecution: false,
      objective: "product_validation",
      paymentExecution: false,
      productNames: productNames.slice(0, 3),
      providerContacted: false,
      spendState: "payment_required",
      status: "draft_locked"
    }
  ];
}

function buildAutonomousPaymentApprovalQueue(
  executionPlan: RevenueFirstBusinessExecutionPlan,
  supplierPlan: RevenueFirstBusinessAutonomousLaunchPlan["supplierPlan"],
  adCampaignDrafts: RevenueFirstBusinessAutonomousLaunchPlan["adCampaignDrafts"]
): RevenueFirstBusinessAutonomousLaunchPlan["paymentApprovalQueue"] {
  const supplierEstimate = Number((supplierPlan.selectedSupplier.estimatedBaseCost * executionPlan.listingProductPack.length).toFixed(2));
  const adEstimate = adCampaignDrafts.reduce((sum, draft) => sum + draft.dailyBudgetCap, 0);
  const marketplaceEstimate = executionPlan.finalExecutionPacket.store.storePlatform === "Etsy" ? 0.2 * executionPlan.listingProductPack.length : 0;

  return [
    {
      approvalType: "provider_account",
      estimatedAmount: 0,
      externalExecution: false,
      paymentExecution: false,
      providerContacted: false,
      reason: "Owner must approve and provide any live storefront or supplier credentials before ENTRAL can connect accounts.",
      status: "owner_approval_required",
      title: "Approve provider account connection"
    },
    {
      approvalType: "supplier_order",
      estimatedAmount: supplierEstimate,
      externalExecution: false,
      paymentExecution: false,
      providerContacted: false,
      reason: "POD product creation, samples, paid mockups, or first supplier-side orders can create charges.",
      status: "owner_approval_required",
      title: "Approve supplier-side product creation charges"
    },
    {
      approvalType: "ad_spend",
      estimatedAmount: adEstimate,
      externalExecution: false,
      paymentExecution: false,
      providerContacted: false,
      reason: "Paid campaign drafts are ready, but every Ad/Growth dollar remains locked behind Financial Orchestrator approval.",
      status: "owner_approval_required",
      title: "Approve first paid traffic test"
    },
    {
      approvalType: "payment_processor",
      estimatedAmount: 0,
      externalExecution: false,
      paymentExecution: false,
      providerContacted: false,
      reason: "Payment processing, payout settings, cards, banking, and tax settings require owner control.",
      status: "owner_approval_required",
      title: "Approve payment and payout configuration"
    },
    {
      approvalType: "marketplace_fee",
      estimatedAmount: Number(marketplaceEstimate.toFixed(2)),
      externalExecution: false,
      paymentExecution: false,
      providerContacted: false,
      reason: "Listing fees, app fees, subscription fees, and marketplace charges are not executed automatically.",
      status: "owner_approval_required",
      title: "Approve storefront or marketplace fee exposure"
    }
  ];
}

function buildAutonomousChainOfCommand(
  paymentApprovals: RevenueFirstBusinessAutonomousLaunchPlan["paymentApprovalQueue"]
): RevenueFirstBusinessAutonomousLaunchPlan["chainOfCommand"] {
  return [
    {
      lane: "store_build",
      owns: ["store setup payload", "navigation", "collections", "SEO", "policy drafts"],
      rank: "general",
      status: "ready_internal",
      title: "Store Setup General"
    },
    {
      lane: "product_creation",
      owns: ["product rows", "listing copy", "design specs", "mockup directions"],
      rank: "commander",
      status: "ready_internal",
      title: "Product Factory Commander"
    },
    {
      lane: "supplier_selection",
      owns: ["supplier scoring", "primary supplier choice", "backup supplier lane"],
      rank: "commander",
      status: "ready_internal",
      title: "Supplier Commander"
    },
    {
      lane: "supplier_connection",
      owns: ["connector manifest", "credential scopes", "supplier payload draft"],
      rank: "commander",
      status: "owner_gate_required",
      title: "Supplier Connector Commander"
    },
    {
      lane: "content_launch",
      owns: ["faceless scripts", "caption drafts", "channel calendar"],
      rank: "commander",
      status: "owner_gate_required",
      title: "Content Launch Commander"
    },
    {
      lane: "organic_traffic",
      owns: ["organic first moves", "community outreach scripts", "traffic evidence"],
      rank: "soldier",
      status: "ready_internal",
      title: "Organic Traffic Soldier"
    },
    {
      lane: "ad_campaign_drafting",
      owns: ["ad drafts", "audience draft", "creative angles", "budget guardrails"],
      rank: "commander",
      status: "ready_internal",
      title: "Growth Commander"
    },
    {
      lane: "ad_spend_activation",
      owns: paymentApprovals.filter((approval) => approval.approvalType === "ad_spend").map((approval) => approval.title),
      rank: "marshal",
      status: "owner_gate_required",
      title: "Financial Orchestrator Marshal"
    },
    {
      lane: "tracking",
      owns: ["first-week evidence ledger", "read-only metrics scope", "rotation feedback"],
      rank: "soldier",
      status: "owner_gate_required",
      title: "Evidence Soldier"
    }
  ];
}

function buildAutonomousMatrix(
  executionPlan: RevenueFirstBusinessExecutionPlan
): RevenueFirstBusinessAutonomousLaunchPlan["autonomyMatrix"] {
  const ready = executionPlan.status === "ready_to_launch_first_business";

  return [
    {
      autonomyPercent: ready ? 100 : 0,
      commander: "Store Setup General",
      externalExecution: false,
      hardStop: null,
      lane: "store_build",
      nextInternalAction: "Prepare storefront payload and copy/paste setup packet.",
      ownerApprovalRequired: false,
      providerContacted: false,
      status: ready ? "autonomous_ready" : "blocked"
    },
    {
      autonomyPercent: ready ? 100 : 0,
      commander: "Product Factory Commander",
      externalExecution: false,
      hardStop: null,
      lane: "product_creation",
      nextInternalAction: "Prepare product payload rows, listing copy, and design specs.",
      ownerApprovalRequired: false,
      providerContacted: false,
      status: ready ? "autonomous_ready" : "blocked"
    },
    {
      autonomyPercent: ready ? 100 : 0,
      commander: "Supplier Commander",
      externalExecution: false,
      hardStop: null,
      lane: "supplier_selection",
      nextInternalAction: "Select primary and backup supplier candidates internally.",
      ownerApprovalRequired: false,
      providerContacted: false,
      status: ready ? "autonomous_ready" : "blocked"
    },
    {
      autonomyPercent: ready ? 85 : 0,
      commander: "Supplier Connector Commander",
      externalExecution: false,
      hardStop: "Owner must approve credentials and live provider connection.",
      lane: "supplier_connection",
      nextInternalAction: "Prepare connector manifest and supplier payload draft.",
      ownerApprovalRequired: true,
      providerContacted: false,
      status: ready ? "connector_gated" : "blocked"
    },
    {
      autonomyPercent: ready ? 90 : 0,
      commander: "Content Launch Commander",
      externalExecution: false,
      hardStop: "Owner must approve any live posting, upload, scheduling, or browser action.",
      lane: "content_launch",
      nextInternalAction: "Prepare scripts, captions, and channel calendar.",
      ownerApprovalRequired: true,
      providerContacted: false,
      status: ready ? "connector_gated" : "blocked"
    },
    {
      autonomyPercent: ready ? 100 : 0,
      commander: "Organic Traffic Soldier",
      externalExecution: false,
      hardStop: null,
      lane: "organic_traffic",
      nextInternalAction: "Prepare organic-first traffic move checklist and evidence fields.",
      ownerApprovalRequired: false,
      providerContacted: false,
      status: ready ? "autonomous_ready" : "blocked"
    },
    {
      autonomyPercent: ready ? 100 : 0,
      commander: "Growth Commander",
      externalExecution: false,
      hardStop: null,
      lane: "ad_campaign_drafting",
      nextInternalAction: "Draft paid campaign structure with spend locked.",
      ownerApprovalRequired: false,
      providerContacted: false,
      status: ready ? "autonomous_ready" : "blocked"
    },
    {
      autonomyPercent: ready ? 50 : 0,
      commander: "Financial Orchestrator Marshal",
      externalExecution: false,
      hardStop: "Owner approval and payment authorization are required before any ad spend.",
      lane: "ad_spend_activation",
      nextInternalAction: "Hold campaign drafts in payment-gated queue.",
      ownerApprovalRequired: true,
      providerContacted: false,
      status: ready ? "payment_gated" : "blocked"
    },
    {
      autonomyPercent: ready ? 85 : 0,
      commander: "Evidence Soldier",
      externalExecution: false,
      hardStop: "Owner must approve any read-only analytics connector before automatic data import.",
      lane: "tracking",
      nextInternalAction: "Prepare first-week ledger and rotation feedback loop.",
      ownerApprovalRequired: true,
      providerContacted: false,
      status: ready ? "connector_gated" : "blocked"
    }
  ];
}

export function buildRevenueFirstBusinessAutonomousLaunchPlan(input: {
  executedAt?: string;
  executionPlan: RevenueFirstBusinessExecutionPlan;
  note?: string | null;
}): RevenueFirstBusinessAutonomousLaunchPlan {
  const generatedAt = input.executedAt ?? new Date().toISOString();
  const ready = input.executionPlan.status === "ready_to_launch_first_business"
    && input.executionPlan.firstLaunchReadinessGate.status === "ready_for_manual_launch_approval";
  const autonomousLaunchId = `autonomous_first_business_${safeId(input.executionPlan.finalExecutionPacket.store.sourceStoreId)}_${safeId(generatedAt)}`;
  const supplierPlan = buildAutonomousSupplierPlan(input.executionPlan);
  const storeBuildPlan = buildAutonomousStoreBuildPlan(input.executionPlan);
  const productCreationPlan = buildAutonomousProductCreationPlan(
    input.executionPlan,
    supplierPlan.selectedSupplier.supplierCandidateId
  );
  const connectionPlan = buildAutonomousConnectionPlan(input.executionPlan, supplierPlan.selectedSupplier.provider);
  const adCampaignDrafts = buildAutonomousAdCampaignDrafts(input.executionPlan);
  const paymentApprovalQueue = buildAutonomousPaymentApprovalQueue(input.executionPlan, supplierPlan, adCampaignDrafts);
  const chainOfCommand = buildAutonomousChainOfCommand(paymentApprovalQueue);
  const autonomyMatrix = buildAutonomousMatrix(input.executionPlan);
  const blockedExternalActions = Array.from(new Set([
    ...input.executionPlan.blockedExternalActions,
    "Autonomous live provider calls remain blocked until owner-approved credentials are connected",
    "Autonomous store publishing, listing publishing, product upload, content upload, and browser work remain blocked",
    "Autonomous ad activation, ad spend, card charges, supplier orders, marketplace fees, banking, payouts, and payment processor changes remain blocked"
  ]));
  const requiredApprovals = [
    "Approve live storefront connector credentials",
    "Approve supplier connector credentials and any supplier-side charges",
    "Approve payment processor, card, payout, banking, and tax configuration",
    "Approve public publishing or posting actions",
    "Approve any Ad/Growth spend activation through Financial Orchestrator"
  ];
  const status: RevenueFirstBusinessAutonomousLaunchStatus = ready ? "autonomous_ready_payment_gated" : "blocked";

  return {
    adCampaignDrafts,
    auditEvents: [
      "Autonomous First Business Launch Prep assembled store, product, supplier, connector, content, organic, ad, and tracking plans internally.",
      "Chain of command ownership was assigned across store build, product factory, supplier, growth, finance, and evidence lanes.",
      "No provider, marketplace, browser, upload, social, ad, bank, payout, payment, card, or external AI action was executed."
    ],
    autonomousLaunchId,
    autonomousUntilPayment: true,
    autonomyMatrix,
    blockedExternalActions,
    chainOfCommand,
    connectionPlan,
    executionPacket: input.executionPlan,
    externalExecution: false,
    finalOperatorGate: {
      externalExecution: false,
      paymentExecution: false,
      providerContacted: false,
      requiredApprovals,
      status: ready ? "owner_payment_and_provider_approval_required" : "blocked",
      summary: ready
        ? "ENTRAL can continue autonomously through internal preparation. Live launch, provider calls, account connections, public publishing, and spend require owner approval."
        : "Autonomous launch prep is blocked because the execution packet is not ready."
    },
    generatedAt,
    guardrails: [
      "ENTRAL may prepare internal payloads, checklists, copy, drafts, supplier choices, connector manifests, and evidence fields.",
      "ENTRAL may not call providers, browse accounts, upload files, publish listings, post content, activate ads, spend money, or change payment settings without explicit approval.",
      "Organic-first work is prioritized until the Financial Orchestrator approves Ad/Growth budget activation.",
      "Every autonomous lane is audit-only until credentials, payment approval, and public launch approval are granted."
    ],
    mode: "Autonomous First Business Launch Prep",
    paymentApprovalQueue,
    paymentExecution: false,
    productCreationPlan,
    providerContacted: false,
    status,
    storeBuildPlan,
    supplierPlan,
    summary: status === "autonomous_ready_payment_gated"
      ? `${input.executionPlan.finalExecutionPacket.store.businessName} is autonomous-ready until payment: ENTRAL has prepared the store build, ${productCreationPlan.length} product payload${productCreationPlan.length === 1 ? "" : "s"}, supplier selection, connector manifests, faceless content, organic moves, ad drafts, and tracking plan. Owner approval is still required for providers, payments, publishing, uploads, browser actions, and ad spend.`
      : `${input.executionPlan.finalExecutionPacket.store.businessName} is not ready for autonomous first-business launch prep.`,
    totals: {
      adDrafts: adCampaignDrafts.length,
      autonomousReadyLanes: autonomyMatrix.filter((item) => item.status === "autonomous_ready").length,
      blockedExternalActions: blockedExternalActions.length,
      connectorManifests: connectionPlan.connectorManifests.length,
      paymentApprovals: paymentApprovalQueue.length,
      productPayloads: productCreationPlan.length,
      supplierCandidates: supplierPlan.candidates.length
    }
  };
}

function liveProviderFromManifestProvider(
  provider: RevenueFirstBusinessAutonomousLaunchPlan["connectionPlan"]["connectorManifests"][number]["provider"]
): RevenueFirstBusinessLiveExecutorProvider {
  return provider;
}

function credentialRefsForProvider(provider: RevenueFirstBusinessLiveExecutorProvider) {
  const refs: Record<RevenueFirstBusinessLiveExecutorProvider, string[]> = {
    Etsy: ["ETSY_CONNECTOR_CLIENT_ID", "ETSY_CONNECTOR_REFRESH_TOKEN"],
    "Google Analytics": ["GOOGLE_ANALYTICS_PROPERTY_ID", "GOOGLE_ANALYTICS_READONLY_TOKEN"],
    Manual: [],
    Meta: ["META_AD_ACCOUNT_ID", "META_CONNECTOR_ACCESS_TOKEN"],
    Printful: ["PRINTFUL_CONNECTOR_TOKEN"],
    Printify: ["PRINTIFY_CONNECTOR_TOKEN", "PRINTIFY_SHOP_ID"],
    Shopify: ["SHOPIFY_STORE_DOMAIN", "SHOPIFY_CONNECTOR_ADMIN_TOKEN"]
  };

  return refs[provider];
}

function buildLiveExecutorCredentialReadiness(input: {
  approved: boolean;
  autonomousLaunch: RevenueFirstBusinessAutonomousLaunchPlan;
}): RevenueFirstBusinessLiveExecutorPlan["credentialReadiness"] {
  const providers = new Set<RevenueFirstBusinessLiveExecutorProvider>();

  for (const manifest of input.autonomousLaunch.connectionPlan.connectorManifests) {
    providers.add(liveProviderFromManifestProvider(manifest.provider));
  }
  providers.add("Manual");

  return Array.from(providers).map((provider) => ({
    approvalStatus: input.approved ? "owner_approved" : "owner_required",
    credentialRefs: credentialRefsForProvider(provider),
    externalExecution: false,
    provider,
    providerContacted: false,
    status: input.approved ? "ready_after_owner_connection" : "missing_owner_unlock"
  }));
}

function buildLiveProviderActionManifests(
  autonomousLaunch: RevenueFirstBusinessAutonomousLaunchPlan
): RevenueFirstBusinessLiveExecutorPlan["providerActionManifests"] {
  const storeProvider = autonomousLaunch.connectionPlan.connectorManifests.find((manifest) => (
    manifest.provider === "Shopify" || manifest.provider === "Etsy"
  ))?.provider ?? "Shopify";
  const supplierProvider = autonomousLaunch.supplierPlan.selectedSupplier.provider === "Printful" ? "Printful" : "Printify";
  const manifests: RevenueFirstBusinessLiveExecutorPlan["providerActionManifests"] = [
    {
      approvalRequired: true,
      externalExecution: false,
      idempotencyKey: `store_${safeId(autonomousLaunch.autonomousLaunchId)}`,
      method: "POST",
      pathTemplate: storeProvider === "Shopify" ? "/admin/api/products.json" : "/v3/application/shops/{shop_id}/listings",
      payloadState: "prepared_not_sent",
      paymentRequired: false,
      provider: storeProvider,
      providerContacted: false,
      purpose: "Create storefront product drafts from the approved first-business product payloads.",
      rollbackKey: "remove_storefront_product_drafts"
    },
    {
      approvalRequired: true,
      externalExecution: false,
      idempotencyKey: `supplier_${safeId(autonomousLaunch.autonomousLaunchId)}`,
      method: "POST",
      pathTemplate: supplierProvider === "Printify" ? "/v1/shops/{shop_id}/products.json" : "/store/products",
      payloadState: "prepared_not_sent",
      paymentRequired: false,
      provider: supplierProvider,
      providerContacted: false,
      purpose: "Create supplier-side draft products and variant mappings without placing paid orders.",
      rollbackKey: "archive_supplier_product_drafts"
    },
    {
      approvalRequired: true,
      externalExecution: false,
      idempotencyKey: `tracking_${safeId(autonomousLaunch.autonomousLaunchId)}`,
      method: "POST",
      pathTemplate: "/properties/{property_id}/events",
      payloadState: "prepared_not_sent",
      paymentRequired: false,
      provider: "Google Analytics",
      providerContacted: false,
      purpose: "Prepare read-only launch event and evidence tracking after analytics connector approval.",
      rollbackKey: "remove_tracking_draft"
    },
    {
      approvalRequired: true,
      externalExecution: false,
      idempotencyKey: `ad_draft_${safeId(autonomousLaunch.autonomousLaunchId)}`,
      method: "POST",
      pathTemplate: "/act_{ad_account_id}/campaigns",
      payloadState: "prepared_not_sent",
      paymentRequired: false,
      provider: "Meta",
      providerContacted: false,
      purpose: "Create campaign drafts with spend disabled and activation locked.",
      rollbackKey: "archive_ad_campaign_drafts"
    },
    {
      approvalRequired: true,
      externalExecution: false,
      idempotencyKey: `ad_spend_${safeId(autonomousLaunch.autonomousLaunchId)}`,
      method: "PUT",
      pathTemplate: "/act_{ad_account_id}/campaigns/{campaign_id}",
      payloadState: "prepared_not_sent",
      paymentRequired: true,
      provider: "Meta",
      providerContacted: false,
      purpose: "Activate paid traffic only after Financial Orchestrator and owner payment approval.",
      rollbackKey: "disable_ad_spend"
    }
  ];

  return manifests;
}

function buildLiveRunbook(input: {
  adDraftApproval: boolean;
  armed: boolean;
  autonomousLaunch: RevenueFirstBusinessAutonomousLaunchPlan;
  connectorApproval: boolean;
  publicLaunchApproval: boolean;
}): RevenueFirstBusinessLiveExecutorPlan["liveRunbook"] {
  const supplierProvider: RevenueFirstBusinessLiveExecutorProvider = input.autonomousLaunch.supplierPlan.selectedSupplier.provider === "Printful"
    ? "Printful"
    : "Printify";
  const storeProvider: RevenueFirstBusinessLiveExecutorProvider = input.autonomousLaunch.storeBuildPlan.storePlatform === "Shopify"
    ? "Shopify"
    : input.autonomousLaunch.storeBuildPlan.storePlatform === "Etsy" ? "Etsy" : "Manual";
  const connectorReady = input.armed && input.connectorApproval;
  const publicReady = connectorReady && input.publicLaunchApproval;
  const adDraftReady = input.armed && input.adDraftApproval;

  return [
    {
      approvalRequired: true,
      executionState: connectorReady ? "ready_live_non_payment" : "blocked_owner_unlock",
      externalExecution: false,
      id: `live_${safeId(input.autonomousLaunch.autonomousLaunchId)}_connect_storefront`,
      kind: "connect_storefront",
      lane: "store_build",
      paymentRequired: false,
      provider: storeProvider,
      providerContacted: false,
      rollback: "Disconnect storefront connector and archive draft payloads.",
      sequence: 1,
      title: "Connect storefront connector for draft-only product setup"
    },
    {
      approvalRequired: true,
      executionState: connectorReady ? "ready_live_non_payment" : "blocked_owner_unlock",
      externalExecution: false,
      id: `live_${safeId(input.autonomousLaunch.autonomousLaunchId)}_connect_supplier`,
      kind: "connect_supplier",
      lane: "supplier_connection",
      paymentRequired: false,
      provider: supplierProvider,
      providerContacted: false,
      rollback: "Disconnect supplier connector and archive draft supplier mappings.",
      sequence: 2,
      title: "Connect supplier connector for draft-only POD product setup"
    },
    ...input.autonomousLaunch.productCreationPlan.map((product, index) => ({
      approvalRequired: true,
      executionState: connectorReady ? "ready_live_non_payment" as const : "blocked_owner_unlock" as const,
      externalExecution: false as const,
      id: `live_${safeId(input.autonomousLaunch.autonomousLaunchId)}_supplier_product_${index + 1}`,
      kind: "create_supplier_product" as const,
      lane: "product_creation" as const,
      paymentRequired: false,
      provider: supplierProvider,
      providerContacted: false as const,
      rollback: `Archive supplier draft for ${product.productName}.`,
      sequence: index + 3,
      title: `Create supplier draft product for ${product.productName}`
    })),
    ...input.autonomousLaunch.productCreationPlan.map((product, index) => ({
      approvalRequired: true,
      executionState: publicReady ? "ready_live_non_payment" as const : "blocked_owner_unlock" as const,
      externalExecution: false as const,
      id: `live_${safeId(input.autonomousLaunch.autonomousLaunchId)}_storefront_product_${index + 1}`,
      kind: "create_storefront_product" as const,
      lane: "store_build" as const,
      paymentRequired: false,
      provider: storeProvider,
      providerContacted: false as const,
      rollback: `Unpublish or archive storefront draft for ${product.productName}.`,
      sequence: input.autonomousLaunch.productCreationPlan.length + index + 3,
      title: `Create storefront product draft for ${product.productName}`
    })),
    {
      approvalRequired: true,
      executionState: publicReady ? "ready_live_non_payment" : "blocked_owner_unlock",
      externalExecution: false,
      id: `live_${safeId(input.autonomousLaunch.autonomousLaunchId)}_publish_storefront`,
      kind: "publish_storefront_product",
      lane: "store_build",
      paymentRequired: false,
      provider: storeProvider,
      providerContacted: false,
      rollback: "Unpublish launch collection and return storefront to draft mode.",
      sequence: input.autonomousLaunch.productCreationPlan.length * 2 + 3,
      title: "Publish approved first-drop collection"
    },
    {
      approvalRequired: true,
      executionState: publicReady ? "ready_live_non_payment" : "blocked_owner_unlock",
      externalExecution: false,
      id: `live_${safeId(input.autonomousLaunch.autonomousLaunchId)}_content_upload`,
      kind: "prepare_content_upload",
      lane: "content_launch",
      paymentRequired: false,
      provider: "Manual",
      providerContacted: false,
      rollback: "Remove or unschedule launch content drafts if owner cancels.",
      sequence: input.autonomousLaunch.productCreationPlan.length * 2 + 4,
      title: "Prepare approved organic content uploads"
    },
    {
      approvalRequired: true,
      executionState: adDraftReady ? "ready_live_non_payment" : "blocked_owner_unlock",
      externalExecution: false,
      id: `live_${safeId(input.autonomousLaunch.autonomousLaunchId)}_ad_campaign_draft`,
      kind: "prepare_ad_campaign",
      lane: "ad_campaign_drafting",
      paymentRequired: false,
      provider: "Meta",
      providerContacted: false,
      rollback: "Archive ad campaign drafts before spend activation.",
      sequence: input.autonomousLaunch.productCreationPlan.length * 2 + 5,
      title: "Create paid campaign drafts with spend disabled"
    },
    {
      approvalRequired: true,
      executionState: "payment_locked",
      externalExecution: false,
      id: `live_${safeId(input.autonomousLaunch.autonomousLaunchId)}_ad_spend`,
      kind: "activate_ad_spend",
      lane: "ad_spend_activation",
      paymentRequired: true,
      provider: "Meta",
      providerContacted: false,
      rollback: "Disable campaigns and record spend stop evidence.",
      sequence: input.autonomousLaunch.productCreationPlan.length * 2 + 6,
      title: "Activate first paid traffic only after payment approval"
    },
    {
      approvalRequired: false,
      executionState: "internal_tracking_ready",
      externalExecution: false,
      id: `live_${safeId(input.autonomousLaunch.autonomousLaunchId)}_evidence`,
      kind: "record_first_week_evidence",
      lane: "tracking",
      paymentRequired: false,
      provider: "Manual",
      providerContacted: false,
      rollback: "Keep evidence ledger read-only and append correction notes.",
      sequence: input.autonomousLaunch.productCreationPlan.length * 2 + 7,
      title: "Record first-week evidence into Revenue Engine"
    }
  ];
}

function buildLivePaymentLockedQueue(
  autonomousLaunch: RevenueFirstBusinessAutonomousLaunchPlan
): RevenueFirstBusinessLiveExecutorPlan["paymentLockedQueue"] {
  return autonomousLaunch.paymentApprovalQueue.map((approval) => ({
    amount: approval.estimatedAmount,
    externalExecution: false,
    paymentExecution: false,
    provider: approval.approvalType === "ad_spend" ? "Meta" : approval.approvalType === "supplier_order"
      ? autonomousLaunch.supplierPlan.selectedSupplier.provider === "Printful" ? "Printful" : "Printify"
      : approval.approvalType === "payment_processor" ? "Manual" : "Manual",
    providerContacted: false,
    reason: approval.reason,
    title: approval.title
  }));
}

function buildLiveRollbackPlan(
  runbook: RevenueFirstBusinessLiveExecutorPlan["liveRunbook"]
): RevenueFirstBusinessLiveExecutorPlan["rollbackPlan"] {
  return [
    ...runbook.map((step) => ({
      externalExecution: false as const,
      providerContacted: false as const,
      step: step.rollback
    })),
    {
      externalExecution: false,
      providerContacted: false,
      step: "Freeze all launch evidence, record the rollback audit note, and feed outcome back into Revenue Engine rotation."
    }
  ];
}

export function buildRevenueFirstBusinessLiveExecutorPlan(input: {
  adDraftApproval?: boolean;
  autonomousLaunch: RevenueFirstBusinessAutonomousLaunchPlan;
  connectorApproval?: boolean;
  generatedAt?: string;
  liveUnlockPhraseAccepted?: boolean;
  note?: string | null;
  publicLaunchApproval?: boolean;
}): RevenueFirstBusinessLiveExecutorPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const connectorApproval = input.connectorApproval ?? false;
  const publicLaunchApproval = input.publicLaunchApproval ?? false;
  const adDraftApproval = input.adDraftApproval ?? false;
  const phraseAccepted = input.liveUnlockPhraseAccepted ?? false;
  const readySource = input.autonomousLaunch.status === "autonomous_ready_payment_gated";
  const armed = readySource && phraseAccepted && connectorApproval && publicLaunchApproval;
  const status: RevenueFirstBusinessLiveExecutorStatus = !readySource
    ? "blocked"
    : armed ? "armed_non_payment_live_run" : "ready_for_owner_unlock";
  const liveExecutorId = `live_executor_${safeId(input.autonomousLaunch.executionPacket.finalExecutionPacket.store.sourceStoreId)}_${safeId(generatedAt)}`;
  const credentialReadiness = buildLiveExecutorCredentialReadiness({
    approved: phraseAccepted && connectorApproval,
    autonomousLaunch: input.autonomousLaunch
  });
  const providerActionManifests = buildLiveProviderActionManifests(input.autonomousLaunch);
  const liveRunbook = buildLiveRunbook({
    adDraftApproval,
    armed,
    autonomousLaunch: input.autonomousLaunch,
    connectorApproval,
    publicLaunchApproval
  });
  const paymentLockedQueue = buildLivePaymentLockedQueue(input.autonomousLaunch);
  const rollbackPlan = buildLiveRollbackPlan(liveRunbook);
  const blockedExternalActions = Array.from(new Set([
    ...input.autonomousLaunch.blockedExternalActions,
    "Live external calls are not executed by this packet; approved connectors must be invoked by the controlled executor runtime only after owner unlock",
    "Payment processor setup, supplier charges, ad spend activation, card charges, marketplace fees, banking, payouts, and transfers remain payment locked",
    "Any provider failure, duplicate idempotency key, missing credential, policy warning, or rollback signal must halt the live run"
  ]));

  return {
    actualExternalActionsExecuted: false,
    auditEvents: [
      "Controlled Live First Business Executor packet prepared from the autonomous first-business launch plan.",
      armed
        ? "Owner unlock gates are present for non-payment provider, storefront, and public launch preparation. No live call was executed by this packet."
        : "Owner unlock gates are incomplete; live provider, storefront, public launch, and ad draft actions remain blocked.",
      "Payment, ad spend activation, supplier charges, banking, payout, card, and marketplace-fee actions remain locked."
    ],
    blockedExternalActions,
    credentialReadiness,
    externalExecution: false,
    generatedAt,
    guardrails: [
      "This executor produces a controlled live-run packet and does not call any provider directly.",
      "Non-payment live actions require the exact owner unlock phrase plus connector and public launch approval.",
      "Payment-bearing actions never become executable from this packet; they remain routed to Financial Orchestrator and owner payment approval.",
      "Every provider action has an idempotency key and rollback step before any future executor runtime can use it."
    ],
    liveExecutorId,
    liveRunbook,
    mode: "Controlled Live First Business Executor",
    ownerUnlock: {
      adDraftApproval,
      connectorApproval,
      externalExecution: false,
      paymentExecution: false,
      phraseAccepted,
      providerContacted: false,
      publicLaunchApproval,
      status: armed ? "accepted_non_payment" : "waiting_owner"
    },
    paymentExecution: false,
    paymentLockedQueue,
    providerActionManifests,
    providerContacted: false,
    rollbackPlan,
    sourceAutonomousLaunchId: input.autonomousLaunch.autonomousLaunchId,
    status,
    summary: status === "armed_non_payment_live_run"
      ? `${input.autonomousLaunch.executionPacket.finalExecutionPacket.store.businessName} has a controlled live executor armed for non-payment launch steps. Provider writes, storefront publishing, content preparation, and ad drafts are manifest-ready, but no external action has executed here and all payment/ad spend remains locked.`
      : status === "ready_for_owner_unlock"
        ? `${input.autonomousLaunch.executionPacket.finalExecutionPacket.store.businessName} has a controlled live executor packet ready, but owner unlock gates are incomplete. Provider calls, public publishing, ad drafts, and payment actions remain locked.`
        : `${input.autonomousLaunch.executionPacket.finalExecutionPacket.store.businessName} cannot build a controlled live executor until the autonomous launch packet is ready.`,
    totals: {
      armedNonPaymentSteps: liveRunbook.filter((step) => step.executionState === "ready_live_non_payment").length,
      blockedSteps: liveRunbook.filter((step) => step.executionState === "blocked_owner_unlock").length,
      credentialChecks: credentialReadiness.length,
      paymentLockedSteps: liveRunbook.filter((step) => step.paymentRequired).length + paymentLockedQueue.length,
      providerManifests: providerActionManifests.length,
      rollbackSteps: rollbackPlan.length
    }
  };
}
