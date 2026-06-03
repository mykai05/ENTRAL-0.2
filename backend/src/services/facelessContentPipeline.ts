import type {
  RevenueEngineProductSnapshot,
  RevenueEngineStoreSnapshot
} from "./revenueEngine.js";

export type FacelessContentChannel = "youtube_shorts" | "tiktok" | "instagram_reels";
export type FacelessContentSource = "manual" | "youtube" | "tiktok" | "instagram" | "other";

export type FacelessContentOptions = {
  briefsPerStore?: number;
  includeChannelPackages?: boolean;
  includeVideoSpecs?: boolean;
  includeVoiceoverSpecs?: boolean;
  maxStores?: number;
  minClicksForScale?: number;
  minViewsForRemix?: number;
  targetChannels?: FacelessContentChannel[];
  windowDays?: number;
};

export type FacelessContentPerformanceSnapshot = {
  channel: FacelessContentChannel | string;
  clicks: number;
  comments: number;
  contentBriefId: string | null;
  conversions: number;
  cost: number;
  externalExecution: false;
  id: string;
  likes: number;
  notes: string | null;
  periodEnd: string;
  periodStart: string;
  productId: string | null;
  revenue: number;
  saves: number;
  shares: number;
  source: FacelessContentSource | string;
  storeId: string | null;
  views: number;
  watchSeconds: number;
};

export type FacelessProviderReadiness = {
  blockedReason: string;
  provider: "Runway" | "Kling" | "Luma" | "ElevenLabs" | "YouTube Shorts" | "TikTok" | "Instagram Reels";
  providerContacted: false;
  requiredApproval: string;
  status: "not_connected" | "approval_required";
};

export type FacelessChannelPackage = {
  aspectRatio: "9:16";
  caption: string;
  channel: FacelessContentChannel;
  description: string;
  durationSeconds: number;
  externalExecution: false;
  hashtags: string[];
  providerContacted: false;
  title: string;
  uploadState: "approval_required";
};

export type FacelessContentBrief = {
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    status: "Required";
  };
  blockedActions: string[];
  channelPackages: FacelessChannelPackage[];
  concept: {
    angle: string;
    hook: string;
    objective: "product_discovery" | "store_launch" | "conversion_repair" | "scale_remix";
    targetAudience: string;
  };
  dedupeKey: string;
  estimatedRevenueImpact: number;
  externalExecution: false;
  id: string;
  priority: number;
  productId: string | null;
  productName: string | null;
  providerReadiness: FacelessProviderReadiness[];
  recordState: "new" | "existing";
  script: {
    caption: string;
    hookLine: string;
    narration: string[];
    onScreenText: string[];
  };
  status: "draft_queued" | "existing_record";
  storeId: string;
  storeName: string;
  storyboard: Array<{
    beat: string;
    durationSeconds: number;
    visualDirection: string;
  }>;
  targetChannels: FacelessContentChannel[];
  title: string;
  videoSpec: {
    assetRequirements: string[];
    motionDirection: string;
    primaryProviders: Array<"Runway" | "Kling" | "Luma">;
    prompt: string;
    providerContacted: false;
    status: "draft_only" | "omitted";
  };
  voiceoverSpec: {
    delivery: string;
    provider: "ElevenLabs";
    providerContacted: false;
    scriptWordCount: number;
    status: "draft_only" | "omitted";
    voiceDirection: string;
  };
};

export type FacelessContentScore = {
  action: "scale_remix" | "revise_hook" | "watch";
  channel: string;
  clickRate: number;
  contentBriefId: string | null;
  conversionRate: number;
  netRevenue: number;
  reason: string;
  retentionSeconds: number;
  views: number;
};

export type FacelessContentPipelinePlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  briefs: FacelessContentBrief[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Faceless Content Pipeline";
  options: Required<FacelessContentOptions>;
  performanceDigest: {
    contentScores: FacelessContentScore[];
    summary: string;
    totals: {
      clicks: number;
      conversions: number;
      cost: number;
      netRevenue: number;
      snapshots: number;
      views: number;
      watchSeconds: number;
    };
  };
  providerReadiness: FacelessProviderReadiness[];
  summary: string;
  totals: {
    channelPackages: number;
    existingBriefs: number;
    newBriefs: number;
    providerManifests: number;
    storesEvaluated: number;
    videoSpecs: number;
    voiceoverSpecs: number;
  };
};

const defaultChannels: FacelessContentChannel[] = ["youtube_shorts", "tiktok", "instagram_reels"];

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function optionDefaults(options: FacelessContentOptions = {}): Required<FacelessContentOptions> {
  return {
    briefsPerStore: options.briefsPerStore ?? 3,
    includeChannelPackages: options.includeChannelPackages ?? true,
    includeVideoSpecs: options.includeVideoSpecs ?? true,
    includeVoiceoverSpecs: options.includeVoiceoverSpecs ?? true,
    maxStores: options.maxStores ?? 5,
    minClicksForScale: options.minClicksForScale ?? 25,
    minViewsForRemix: options.minViewsForRemix ?? 500,
    targetChannels: options.targetChannels?.length ? options.targetChannels : defaultChannels,
    windowDays: options.windowDays ?? 30
  };
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function providerReadiness(): FacelessProviderReadiness[] {
  return [
    {
      blockedReason: "Video generation provider calls require explicit connector approval, budget limits, and asset review.",
      provider: "Runway",
      providerContacted: false,
      requiredApproval: "Approve read/write video-generation connector scope and per-job cost ceiling.",
      status: "not_connected"
    },
    {
      blockedReason: "Video generation provider calls require explicit connector approval, budget limits, and asset review.",
      provider: "Kling",
      providerContacted: false,
      requiredApproval: "Approve read/write video-generation connector scope and per-job cost ceiling.",
      status: "not_connected"
    },
    {
      blockedReason: "Video generation provider calls require explicit connector approval, budget limits, and asset review.",
      provider: "Luma",
      providerContacted: false,
      requiredApproval: "Approve read/write video-generation connector scope and per-job cost ceiling.",
      status: "not_connected"
    },
    {
      blockedReason: "Voiceover generation requires explicit connector approval and voice/style review.",
      provider: "ElevenLabs",
      providerContacted: false,
      requiredApproval: "Approve voiceover connector scope, cost ceiling, and voice identity policy.",
      status: "not_connected"
    },
    {
      blockedReason: "Upload, scheduling, comment, and analytics writes remain blocked.",
      provider: "YouTube Shorts",
      providerContacted: false,
      requiredApproval: "Approve channel ownership, upload policy, and read-only analytics scope before any connector use.",
      status: "not_connected"
    },
    {
      blockedReason: "Upload, scheduling, comment, and analytics writes remain blocked.",
      provider: "TikTok",
      providerContacted: false,
      requiredApproval: "Approve channel ownership, upload policy, and read-only analytics scope before any connector use.",
      status: "not_connected"
    },
    {
      blockedReason: "Upload, scheduling, comment, and analytics writes remain blocked.",
      provider: "Instagram Reels",
      providerContacted: false,
      requiredApproval: "Approve channel ownership, upload policy, and read-only analytics scope before any connector use.",
      status: "not_connected"
    }
  ];
}

function channelTitle(channel: FacelessContentChannel) {
  if (channel === "youtube_shorts") return "YouTube Shorts";
  if (channel === "tiktok") return "TikTok";
  return "Instagram Reels";
}

function channelPackage(channel: FacelessContentChannel, briefTitle: string, hook: string, hashtags: string[]): FacelessChannelPackage {
  return {
    aspectRatio: "9:16",
    caption: `${hook} ${hashtags.slice(0, 4).join(" ")}`,
    channel,
    description: `${briefTitle}. Internal upload package only; final caption, disclosures, and channel policy review required.`,
    durationSeconds: 28,
    externalExecution: false,
    hashtags,
    providerContacted: false,
    title: `${briefTitle} | ${channelTitle(channel)}`,
    uploadState: "approval_required"
  };
}

function productCandidates(store: RevenueEngineStoreSnapshot, products: RevenueEngineProductSnapshot[]) {
  return products
    .filter((product) => product.storeId === store.id)
    .filter((product) => ["Approved", "Published", "Listing Drafted", "Mockup Created"].includes(product.status))
    .sort((left, right) => (right.estimatedProfit + right.profitMargin) - (left.estimatedProfit + left.profitMargin));
}

function buildBrief(input: {
  existingBriefSourceKeys: Set<string>;
  index: number;
  options: Required<FacelessContentOptions>;
  product: RevenueEngineProductSnapshot | null;
  store: RevenueEngineStoreSnapshot;
}): FacelessContentBrief {
  const product = input.product;
  const productName = product?.productName ?? `${input.store.businessName} launch story`;
  const targetAudience = input.store.audience;
  const objective = product?.status === "Published" ? "scale_remix" : product ? "product_discovery" : "store_launch";
  const title = product ? `${input.store.businessName} ${product.productName} faceless short` : `${input.store.businessName} faceless launch short`;
  const hook = product
    ? `Nobody sees the system behind ${product.productName}.`
    : `${input.store.businessName} is building a sharper launch lane.`;
  const dedupeKey = `faceless:${input.store.id}:${product?.id ?? "store"}:${input.options.targetChannels.join("_")}:v1`;
  const estimatedRevenueImpact = money((product?.estimatedProfit ?? input.store.estimatedProfit / 4) * (input.options.targetChannels.length / 2));
  const hashtags = [
    `#${slug(input.store.businessName).replace(/_/g, "")}`,
    "#originalmerch",
    "#smallbusiness",
    "#launch",
    product ? `#${slug(product.productType).replace(/_/g, "")}` : "#brand"
  ];
  const narration = [
    hook,
    product
      ? `This is an original ${product.productType} concept built for ${targetAudience}.`
      : `The offer is simple: a clean brand lane, stronger product story, and a launch package that can be reviewed before anything goes live.`,
    "Every asset stays in draft until the operator approves the final package.",
    product
      ? `The next move is to test the strongest hook, remix the winning version, and keep weak edits out of rotation.`
      : `The next move is to turn the strongest story into repeatable short-form content.`
  ];

  return {
    approvalGate: {
      externalExecutionLocked: true,
      humanApprovalRequired: true,
      status: "Required"
    },
    blockedActions: [
      "Calling Runway, Kling, Luma, ElevenLabs, YouTube, TikTok, Instagram, Meta, or Google APIs",
      "Uploading, scheduling, publishing, deleting, or editing social content",
      "Importing channel analytics without an approved read-only connector",
      "Using browser stealth, anti-detection, proxy rotation, or platform-evasion automation"
    ],
    channelPackages: input.options.includeChannelPackages
      ? input.options.targetChannels.map((channel) => channelPackage(channel, title, hook, hashtags))
      : [],
    concept: {
      angle: product
        ? `Show the hidden operating system behind the ${product.productType} instead of a person talking to camera.`
        : "Show the private brand launch system as a faceless sequence of product, checklist, and proof beats.",
      hook,
      objective,
      targetAudience
    },
    dedupeKey,
    estimatedRevenueImpact,
    externalExecution: false,
    id: `faceless_${slug(input.store.id)}_${slug(product?.id ?? "store")}_${input.index + 1}`,
    priority: Math.max(1, 5 - input.index),
    productId: product?.id ?? null,
    productName: product?.productName ?? null,
    providerReadiness: providerReadiness(),
    recordState: input.existingBriefSourceKeys.has(dedupeKey) ? "existing" : "new",
    script: {
      caption: `${hook} ${hashtags.slice(0, 3).join(" ")}`,
      hookLine: hook,
      narration,
      onScreenText: [
        "Original product lane",
        "Draft package only",
        "Operator approval required",
        "Scale the winner"
      ]
    },
    status: input.existingBriefSourceKeys.has(dedupeKey) ? "existing_record" : "draft_queued",
    storeId: input.store.id,
    storeName: input.store.businessName,
    storyboard: [
      {
        beat: "Open with product or system proof",
        durationSeconds: 4,
        visualDirection: product ? `Close-up mockup detail for ${product.productName}` : `${input.store.businessName} launch checklist and product lane overview`
      },
      {
        beat: "Show the operating sequence",
        durationSeconds: 10,
        visualDirection: "Fast cuts between draft listing, creative board, price/margin card, and approval checklist"
      },
      {
        beat: "Reveal the product or launch value",
        durationSeconds: 10,
        visualDirection: product ? product.designConcept : input.store.brandStyle
      },
      {
        beat: "Close with approval-gated next step",
        durationSeconds: 4,
        visualDirection: "Minimal end card with draft status and internal review mark"
      }
    ],
    targetChannels: input.options.targetChannels,
    title,
    videoSpec: {
      assetRequirements: [
        "Approved product mockup or store launch visual",
        "Readable 9:16 title frame",
        "Brand-safe background texture or product close-up",
        "Final caption and disclosure review"
      ],
      motionDirection: "Crisp faceless edits, fast product cuts, no human identity dependency, no platform-native publishing.",
      primaryProviders: ["Runway", "Kling", "Luma"],
      prompt: `Create a 9:16 faceless short for ${input.store.businessName}. Use original product visuals, minimal command-interface overlays, and a serious private-operator tone. Hook: ${hook}`,
      providerContacted: false,
      status: input.options.includeVideoSpecs ? "draft_only" : "omitted"
    },
    voiceoverSpec: {
      delivery: "calm, premium, direct, under 30 seconds",
      provider: "ElevenLabs",
      providerContacted: false,
      scriptWordCount: narration.join(" ").split(/\s+/).filter(Boolean).length,
      status: input.options.includeVoiceoverSpecs ? "draft_only" : "omitted",
      voiceDirection: "low-hype operator narration with clean pacing"
    }
  };
}

function performanceScores(snapshots: FacelessContentPerformanceSnapshot[], options: Required<FacelessContentOptions>): FacelessContentScore[] {
  return snapshots.map((snapshot) => {
    const clickRate = snapshot.views > 0 ? money((snapshot.clicks / snapshot.views) * 100) : 0;
    const conversionRate = snapshot.clicks > 0 ? money((snapshot.conversions / snapshot.clicks) * 100) : 0;
    const retentionSeconds = snapshot.views > 0 ? money(snapshot.watchSeconds / snapshot.views) : 0;
    const netRevenue = money(snapshot.revenue - snapshot.cost);
    const action: FacelessContentScore["action"] = snapshot.clicks >= options.minClicksForScale && netRevenue > 0
      ? "scale_remix"
      : snapshot.views >= options.minViewsForRemix && snapshot.clicks < options.minClicksForScale
        ? "revise_hook"
        : "watch";

    return {
      action,
      channel: snapshot.channel,
      clickRate,
      contentBriefId: snapshot.contentBriefId,
      conversionRate,
      netRevenue,
      reason: action === "scale_remix"
        ? "Content has enough clicks and positive net revenue for remix planning."
        : action === "revise_hook"
          ? "Content has enough views but weak click evidence; revise the hook before scaling."
          : "Keep collecting internal performance evidence.",
      retentionSeconds,
      views: snapshot.views
    };
  }).sort((left, right) => {
    const actionWeight = (action: FacelessContentScore["action"]) => action === "scale_remix" ? 3 : action === "revise_hook" ? 2 : 1;

    return actionWeight(right.action) - actionWeight(left.action) || right.netRevenue - left.netRevenue || right.views - left.views;
  });
}

export function buildFacelessContentPipelinePlan(input: {
  existingBriefSourceKeys?: Set<string>;
  generatedAt?: string;
  options?: FacelessContentOptions;
  performanceSnapshots?: FacelessContentPerformanceSnapshot[];
  products: RevenueEngineProductSnapshot[];
  stores: RevenueEngineStoreSnapshot[];
}): FacelessContentPipelinePlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const options = optionDefaults(input.options);
  const existingBriefSourceKeys = input.existingBriefSourceKeys ?? new Set<string>();
  const stores = [...input.stores]
    .sort((left, right) => (right.estimatedProfit + right.revenue) - (left.estimatedProfit + left.revenue))
    .slice(0, options.maxStores);
  const briefs = stores.flatMap((store) => {
    const candidates = productCandidates(store, input.products).slice(0, options.briefsPerStore);
    const selected = candidates.length > 0 ? candidates : [null];

    return selected.map((product, index) => buildBrief({
      existingBriefSourceKeys,
      index,
      options,
      product,
      store
    }));
  });
  const performanceSnapshots = input.performanceSnapshots ?? [];
  const contentScores = performanceScores(performanceSnapshots, options);
  const performanceTotals = {
    clicks: performanceSnapshots.reduce((sum, snapshot) => sum + snapshot.clicks, 0),
    conversions: performanceSnapshots.reduce((sum, snapshot) => sum + snapshot.conversions, 0),
    cost: money(performanceSnapshots.reduce((sum, snapshot) => sum + snapshot.cost, 0)),
    netRevenue: money(performanceSnapshots.reduce((sum, snapshot) => sum + snapshot.revenue - snapshot.cost, 0)),
    snapshots: performanceSnapshots.length,
    views: performanceSnapshots.reduce((sum, snapshot) => sum + snapshot.views, 0),
    watchSeconds: performanceSnapshots.reduce((sum, snapshot) => sum + snapshot.watchSeconds, 0)
  };
  const newBriefs = briefs.filter((brief) => brief.recordState === "new");
  const existingBriefs = briefs.filter((brief) => brief.recordState === "existing");

  return {
    auditEvents: [
      "Faceless Content Pipeline generated internal content briefs and provider manifests.",
      "No AI video, voiceover, social, analytics, browser, or upload provider was contacted.",
      "All channel packages require human approval and future connector authorization before execution."
    ],
    blockedExternalActions: [
      "Calling Runway, Kling, Luma, ElevenLabs, YouTube, TikTok, Instagram, Meta, Google, or analytics APIs",
      "Uploading, scheduling, publishing, deleting, or editing social content",
      "Importing channel analytics without an approved read-only connector",
      "Starting ad spend or boosting posts",
      "Using browser stealth, anti-detection, proxy rotation, or platform-evasion automation"
    ],
    briefs,
    externalExecution: false,
    generatedAt,
    mode: "Internal Faceless Content Pipeline",
    options,
    performanceDigest: {
      contentScores,
      summary: `${performanceTotals.snapshots} content performance snapshot${performanceTotals.snapshots === 1 ? "" : "s"} evaluated. ${contentScores.filter((score) => score.action === "scale_remix").length} scale remix candidate${contentScores.filter((score) => score.action === "scale_remix").length === 1 ? "" : "s"} and ${contentScores.filter((score) => score.action === "revise_hook").length} hook revision candidate${contentScores.filter((score) => score.action === "revise_hook").length === 1 ? "" : "s"} found.`,
      totals: performanceTotals
    },
    providerReadiness: providerReadiness(),
    summary: `${briefs.length} faceless content brief${briefs.length === 1 ? "" : "s"} prepared across ${stores.length} store${stores.length === 1 ? "" : "s"}. ${newBriefs.length} new brief${newBriefs.length === 1 ? "" : "s"} can be recorded internally. Provider calls and uploads remain locked.`,
    totals: {
      channelPackages: briefs.reduce((sum, brief) => sum + brief.channelPackages.length, 0),
      existingBriefs: existingBriefs.length,
      newBriefs: newBriefs.length,
      providerManifests: providerReadiness().length,
      storesEvaluated: stores.length,
      videoSpecs: briefs.filter((brief) => brief.videoSpec.status === "draft_only").length,
      voiceoverSpecs: briefs.filter((brief) => brief.voiceoverSpec.status === "draft_only").length
    }
  };
}
