import type {
  RevenueFirstBusinessLaunchPackageContentIdea,
  RevenueFirstBusinessLaunchPackageOrganicMove,
  RevenueFirstBusinessLaunchPackagePlan,
  RevenueFirstBusinessLaunchPackageProduct
} from "./revenueFirstBusinessLaunchPackage.js";

export type RevenueFirstStorePreparationStatus = "ready_to_execute_internal" | "blocked";
export type RevenueFirstBusinessInternalLaunchStatus = "launch_ready_internal" | "blocked";

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
    status: "launch_ready_internal";
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

export function buildRevenueFirstBusinessInternalLaunchPlan(input: {
  launchedAt?: string;
  note?: string | null;
  preparationPlan: RevenueFirstStorePreparationPlan;
}): RevenueFirstBusinessInternalLaunchPlan {
  const launchedAt = input.launchedAt ?? new Date().toISOString();
  const status: RevenueFirstBusinessInternalLaunchStatus = input.preparationPlan.status === "ready_to_execute_internal"
    ? "launch_ready_internal"
    : "blocked";
  const productSetupQueue = input.preparationPlan.products.map((product, index) => ({
    ...product,
    executionLocked: true as const,
    launchState: "queued_internal_product_setup" as const,
    sequence: index + 1
  }));
  const contentDraftQueue = input.preparationPlan.contentPlan.map((idea, index) => ({
    ...idea,
    executionLocked: true as const,
    launchState: "queued_internal_content_draft" as const,
    sequence: index + 1
  }));
  const organicMoveQueue = input.preparationPlan.organicTrafficPlan.map((move, index) => ({
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
      status: "launch_ready_internal"
    },
    launchId: `launch_first_business_${safeId(input.preparationPlan.storeConfig.sourceStoreId)}_${safeId(launchedAt)}`,
    launchSequence,
    mode: "Launch First Business",
    organicMoveQueue,
    productSetupQueue,
    providerContacted: false,
    status,
    storeSetup: {
      ...input.preparationPlan.storeConfig,
      launchState: "queued_internal_store_setup",
      setupQueue
    },
    summary: `${input.preparationPlan.storeConfig.businessName} is launch-ready internally with ${productSetupQueue.length} product setup packet${productSetupQueue.length === 1 ? "" : "s"}, ${contentDraftQueue.length} faceless content draft${contentDraftQueue.length === 1 ? "" : "s"}, ${organicMoveQueue.length} organic move${organicMoveQueue.length === 1 ? "" : "s"}, and ${launchSequence.length} internal launch step${launchSequence.length === 1 ? "" : "s"}. External execution remains locked until explicit live approval.`,
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
