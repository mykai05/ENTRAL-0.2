import {
  buildSignalIntakePlan,
  signalIntakeBlockedExternalActions,
  type SignalIntakeContentBriefReference,
  type SignalIntakeInput,
  type SignalIntakePlan,
  type SignalIntakeProductReference,
  type SignalIntakeStoreReference
} from "./signalIntakeCenter.js";

export const revenueSignalConnectorConfirmation = "RECORD READONLY SIGNAL CONNECTOR MANIFESTS";

export type RevenueSignalConnectorLane = "commerce" | "content" | "payments";
export type RevenueSignalConnectorRiskLevel = "low" | "medium" | "high";
export type RevenueSignalConnectorStatus = "ready_for_approval" | "missing_inputs" | "disabled";
export type RevenueSignalConnectorProvider =
  | "etsy"
  | "instagram"
  | "manual"
  | "printful"
  | "printify"
  | "shopify"
  | "stripe"
  | "tiktok"
  | "youtube";

export type RevenueSignalConnectorOptions = {
  includeCommerce: boolean;
  includeContent: boolean;
  includePayments: boolean;
  includeSamplePayloads: boolean;
  maxConnectors: number;
  onlyReady: boolean;
  windowDays: number;
};

export type RevenueSignalConnectorScope = {
  reason: string;
  scope: string;
};

export type RevenueSignalConnectorManifest = {
  approvalGate: {
    humanApprovalRequired: true;
    requiredConfirmation: typeof revenueSignalConnectorConfirmation;
    status: "Required";
  };
  blockedExternalActions: string[];
  credentialEnvVars: string[];
  endpointTemplates: string[];
  externalExecution: false;
  id: string;
  lane: RevenueSignalConnectorLane;
  provider: RevenueSignalConnectorProvider;
  providerContacted: false;
  providerName: string;
  readinessScore: number;
  readOnlyScopes: RevenueSignalConnectorScope[];
  riskLevel: RevenueSignalConnectorRiskLevel;
  samplePayload: SignalIntakeInput | null;
  status: RevenueSignalConnectorStatus;
  summary: string;
  target: {
    contentBriefId: string | null;
    productId: string | null;
    storeId: string | null;
    storeName: string | null;
  };
  title: string;
  transformTarget: "content_performance_snapshot" | "financial_reconciliation_report" | "revenue_performance_snapshot";
  writeScopes: [];
};

export type RevenueSignalConnectorPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  manifests: RevenueSignalConnectorManifest[];
  mode: "Internal Read-Only Signal Connector Center";
  options: RevenueSignalConnectorOptions;
  providerContacted: false;
  sampleSignalBatch: SignalIntakeInput | null;
  signalIntakePreview: SignalIntakePlan;
  statusCounts: Record<RevenueSignalConnectorStatus, number>;
  summary: string;
  totals: {
    commerceConnectors: number;
    contentConnectors: number;
    connectors: number;
    disabledConnectors: number;
    missingInputConnectors: number;
    paymentConnectors: number;
    readyConnectors: number;
    sampleCommerceSignals: number;
    sampleContentSignals: number;
    samplePaymentSignals: number;
  };
};

const defaultOptions: RevenueSignalConnectorOptions = {
  includeCommerce: true,
  includeContent: true,
  includePayments: true,
  includeSamplePayloads: true,
  maxConnectors: 18,
  onlyReady: false,
  windowDays: 30
};

const providerNames: Record<RevenueSignalConnectorProvider, string> = {
  etsy: "Etsy",
  instagram: "Instagram Reels",
  manual: "Manual Import",
  printful: "Printful",
  printify: "Printify",
  shopify: "Shopify",
  stripe: "Stripe",
  tiktok: "TikTok",
  youtube: "YouTube Shorts"
};

const credentialEnvVars: Record<RevenueSignalConnectorProvider, string[]> = {
  etsy: ["ETSY_READONLY_CLIENT_ID", "ETSY_READONLY_CLIENT_SECRET", "ETSY_READONLY_REFRESH_TOKEN"],
  instagram: ["META_READONLY_ACCESS_TOKEN", "INSTAGRAM_BUSINESS_ACCOUNT_ID"],
  manual: [],
  printful: ["PRINTFUL_READONLY_TOKEN"],
  printify: ["PRINTIFY_READONLY_TOKEN"],
  shopify: ["SHOPIFY_READONLY_ADMIN_TOKEN", "SHOPIFY_STORE_DOMAIN"],
  stripe: ["STRIPE_READONLY_SECRET_KEY"],
  tiktok: ["TIKTOK_READONLY_CLIENT_KEY", "TIKTOK_READONLY_CLIENT_SECRET"],
  youtube: ["YOUTUBE_READONLY_CLIENT_ID", "YOUTUBE_READONLY_CLIENT_SECRET", "YOUTUBE_READONLY_REFRESH_TOKEN"]
};

const endpointTemplates: Record<RevenueSignalConnectorProvider, string[]> = {
  etsy: [
    "GET /v3/application/shops/{shop_id}/receipts",
    "GET /v3/application/shops/{shop_id}/listings/{listing_id}/inventory",
    "GET /v3/application/shops/{shop_id}/transactions"
  ],
  instagram: [
    "GET /{ig_media_id}/insights?metric=plays,reach,saved,shares",
    "GET /{ig_user_id}/media?fields=id,caption,permalink,timestamp"
  ],
  manual: ["Operator-uploaded CSV or JSON payload reviewed before ingestion"],
  printful: [
    "GET /orders",
    "GET /store/products",
    "GET /reports/statistics"
  ],
  printify: [
    "GET /v1/shops/{shop_id}/orders.json",
    "GET /v1/shops/{shop_id}/products.json",
    "GET /v1/shops/{shop_id}/sales_channel/analytics.json"
  ],
  shopify: [
    "GET /admin/api/{version}/orders.json",
    "GET /admin/api/{version}/products.json",
    "GET /admin/api/{version}/reports.json"
  ],
  stripe: [
    "GET /v1/balance",
    "GET /v1/balance_transactions",
    "GET /v1/payouts"
  ],
  tiktok: [
    "GET /v2/research/video/query/",
    "GET /v2/post/publish/creator_info/query/ (read-only account metadata only)"
  ],
  youtube: [
    "GET /youtube/v3/videos?part=statistics,snippet",
    "GET /youtubeAnalytics/v2/reports"
  ]
};

const blockedExternalActions = [
  ...signalIntakeBlockedExternalActions,
  "Requesting OAuth consent, refreshing tokens, or storing credentials without a separate credential approval flow",
  "Creating write scopes, webhook subscriptions, uploads, payouts, provider products, marketplace listings, social posts, or browser sessions"
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function optionsWithDefaults(input: Partial<RevenueSignalConnectorOptions> = {}): RevenueSignalConnectorOptions {
  return {
    includeCommerce: input.includeCommerce ?? defaultOptions.includeCommerce,
    includeContent: input.includeContent ?? defaultOptions.includeContent,
    includePayments: input.includePayments ?? defaultOptions.includePayments,
    includeSamplePayloads: input.includeSamplePayloads ?? defaultOptions.includeSamplePayloads,
    maxConnectors: clamp(Math.round(input.maxConnectors ?? defaultOptions.maxConnectors), 1, 100),
    onlyReady: input.onlyReady ?? defaultOptions.onlyReady,
    windowDays: clamp(Math.round(input.windowDays ?? defaultOptions.windowDays), 1, 365)
  };
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function period(generatedAt: string, windowDays: number) {
  const end = new Date(generatedAt);
  const endMs = Number.isFinite(end.getTime()) ? end.getTime() : Date.now();
  const periodEnd = new Date(endMs).toISOString();
  const periodStart = new Date(endMs - windowDays * 86_400_000).toISOString();

  return { periodEnd, periodStart };
}

function providerForStorePlatform(platform: string): RevenueSignalConnectorProvider {
  if (platform === "Shopify") return "shopify";
  if (platform === "Etsy") return "etsy";
  return "manual";
}

function providerForPodProvider(provider: string | undefined): RevenueSignalConnectorProvider | null {
  if (provider === "Printify") return "printify";
  if (provider === "Printful") return "printful";
  return null;
}

function sampleCommerce(input: {
  generatedAt: string;
  product: SignalIntakeProductReference | null;
  provider: RevenueSignalConnectorProvider;
  store: SignalIntakeStoreReference;
  windowDays: number;
}): SignalIntakeInput {
  const range = period(input.generatedAt, input.windowDays);
  const isPodProvider = input.provider === "printify" || input.provider === "printful";

  return {
    commerceSignals: [{
      externalReference: `${input.provider}-readonly-${input.store.id}`,
      grossRevenue: isPodProvider ? 180 : 240,
      periodEnd: range.periodEnd,
      periodStart: range.periodStart,
      platformFees: isPodProvider ? 0 : 18,
      productId: input.product?.id ?? null,
      productionCost: isPodProvider ? 74 : 72,
      shippingCost: isPodProvider ? 26 : 24,
      source: input.provider === "shopify" ? "shopify" : input.provider === "etsy" ? "etsy" : input.provider === "printify" ? "printify" : input.provider === "printful" ? "printful" : "manual",
      storeId: input.store.id,
      unitsSold: isPodProvider ? 6 : 8,
      visits: isPodProvider ? 0 : 320
    }]
  };
}

function sampleContent(input: {
  brief: SignalIntakeContentBriefReference;
  generatedAt: string;
  provider: RevenueSignalConnectorProvider;
  windowDays: number;
}): SignalIntakeInput {
  const range = period(input.generatedAt, input.windowDays);
  const channel = input.provider === "tiktok" ? "tiktok" : input.provider === "instagram" ? "instagram_reels" : "youtube_shorts";
  const source = input.provider === "tiktok" ? "tiktok" : input.provider === "instagram" ? "instagram" : "youtube";

  return {
    contentSignals: [{
      channel,
      clicks: 42,
      contentBriefId: input.brief.id,
      conversions: 4,
      cost: 12,
      externalReference: `${input.provider}-readonly-${input.brief.id}`,
      periodEnd: range.periodEnd,
      periodStart: range.periodStart,
      productId: input.brief.productId,
      revenue: 96,
      source,
      storeId: input.brief.storeId,
      views: input.provider === "youtube" ? 2200 : 1800,
      watchSeconds: input.provider === "youtube" ? 28600 : 21400
    }]
  };
}

function samplePayment(generatedAt: string, windowDays: number): SignalIntakeInput {
  const range = period(generatedAt, windowDays);

  return {
    paymentSignals: [{
      availableBalance: 180,
      externalReference: "stripe-readonly-balance-probe",
      fees: 8,
      paidOut: 0,
      pendingBalance: 64,
      periodEnd: range.periodEnd,
      periodStart: range.periodStart,
      provider: "stripe"
    }]
  };
}

function readOnlyScopes(provider: RevenueSignalConnectorProvider, lane: RevenueSignalConnectorLane): RevenueSignalConnectorScope[] {
  if (lane === "payments") {
    return [
      { reason: "Read balance totals for reconciliation evidence.", scope: "balance:read" },
      { reason: "Read balance transaction rows for ledger matching.", scope: "balance_transactions:read" },
      { reason: "Read payout metadata without creating payouts.", scope: "payouts:read" }
    ];
  }

  if (lane === "content") {
    return [
      { reason: "Read published content metadata for attribution.", scope: "content:read" },
      { reason: "Read aggregate engagement metrics for optimization.", scope: "analytics:read" }
    ];
  }

  if (provider === "printify" || provider === "printful") {
    return [
      { reason: "Read order and fulfillment economics for profit normalization.", scope: "orders:read" },
      { reason: "Read product identifiers for matching ENTRAL internal products.", scope: "products:read" }
    ];
  }

  return [
    { reason: "Read order totals and units sold for the Performance Velocity Ledger.", scope: "orders:read" },
    { reason: "Read product/listing identifiers for internal product matching.", scope: "listings:read" },
    { reason: "Read aggregate traffic metrics where the provider exposes them.", scope: "analytics:read" }
  ];
}

function manifest(input: {
  generatedAt: string;
  lane: RevenueSignalConnectorLane;
  product: SignalIntakeProductReference | null;
  provider: RevenueSignalConnectorProvider;
  samplePayload: SignalIntakeInput | null;
  status: RevenueSignalConnectorStatus;
  store: SignalIntakeStoreReference | null;
  summary: string;
  title: string;
  transformTarget: RevenueSignalConnectorManifest["transformTarget"];
}): RevenueSignalConnectorManifest {
  const missingInputs = input.status === "missing_inputs";

  return {
    approvalGate: {
      humanApprovalRequired: true,
      requiredConfirmation: revenueSignalConnectorConfirmation,
      status: "Required"
    },
    blockedExternalActions,
    credentialEnvVars: credentialEnvVars[input.provider],
    endpointTemplates: endpointTemplates[input.provider],
    externalExecution: false,
    id: [
      "readonly_signal_connector",
      input.lane,
      input.provider,
      input.store?.id ?? "portfolio",
      input.product?.id ?? "all"
    ].map(slug).join(":"),
    lane: input.lane,
    provider: input.provider,
    providerContacted: false,
    providerName: providerNames[input.provider],
    readinessScore: missingInputs ? 25 : input.lane === "payments" ? 72 : input.lane === "content" ? 78 : 82,
    readOnlyScopes: readOnlyScopes(input.provider, input.lane),
    riskLevel: input.provider === "stripe" ? "medium" : "low",
    samplePayload: input.samplePayload,
    status: input.status,
    summary: input.summary,
    target: {
      contentBriefId: null,
      productId: input.product?.id ?? null,
      storeId: input.store?.id ?? null,
      storeName: input.store?.businessName ?? null
    },
    title: input.title,
    transformTarget: input.transformTarget,
    writeScopes: []
  };
}

function combinePayloads(payloads: SignalIntakeInput[]): SignalIntakeInput {
  return {
    commerceSignals: payloads.flatMap((payload) => payload.commerceSignals ?? []),
    contentSignals: payloads.flatMap((payload) => payload.contentSignals ?? []),
    paymentSignals: payloads.flatMap((payload) => payload.paymentSignals ?? [])
  };
}

function emptyStatusCounts(): Record<RevenueSignalConnectorStatus, number> {
  return {
    disabled: 0,
    missing_inputs: 0,
    ready_for_approval: 0
  };
}

export function buildRevenueSignalConnectorPlan(input: {
  briefs?: SignalIntakeContentBriefReference[];
  generatedAt?: string;
  options?: Partial<RevenueSignalConnectorOptions>;
  products?: SignalIntakeProductReference[];
  stores?: Array<SignalIntakeStoreReference & { podProvider?: string }>;
}): RevenueSignalConnectorPlan {
  const options = optionsWithDefaults(input.options);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const stores = input.stores ?? [];
  const products = input.products ?? [];
  const briefs = input.briefs ?? [];
  const manifests: RevenueSignalConnectorManifest[] = [];

  if (options.includeCommerce) {
    for (const store of stores) {
      const product = products.find((item) => item.storeId === store.id) ?? null;
      const provider = providerForStorePlatform(store.storePlatform);
      const status: RevenueSignalConnectorStatus = product ? "ready_for_approval" : "missing_inputs";
      manifests.push(manifest({
        generatedAt,
        lane: "commerce",
        product,
        provider,
        samplePayload: product ? sampleCommerce({ generatedAt, product, provider, store, windowDays: options.windowDays }) : null,
        status,
        store,
        summary: product
          ? `${providerNames[provider]} read-only order, listing, and traffic metrics can feed the Performance Velocity Ledger for ${store.businessName}.`
          : `${store.businessName} needs at least one internal product before commerce metrics can be mapped safely.`,
        title: `${store.businessName} commerce metrics`,
        transformTarget: "revenue_performance_snapshot"
      }));

      const podProvider = providerForPodProvider(store.podProvider);
      if (podProvider) {
        manifests.push(manifest({
          generatedAt,
          lane: "commerce",
          product,
          provider: podProvider,
          samplePayload: product ? sampleCommerce({ generatedAt, product, provider: podProvider, store, windowDays: options.windowDays }) : null,
          status,
          store,
          summary: product
            ? `${providerNames[podProvider]} read-only order and product economics can improve production-cost accuracy for ${store.businessName}.`
            : `${store.businessName} needs at least one internal product before POD metrics can be mapped safely.`,
          title: `${store.businessName} POD economics`,
          transformTarget: "revenue_performance_snapshot"
        }));
      }
    }
  }

  if (options.includeContent) {
    const contentProviders: RevenueSignalConnectorProvider[] = ["youtube", "tiktok", "instagram"];
    for (const brief of briefs) {
      for (const provider of contentProviders) {
        manifests.push({
          ...manifest({
            generatedAt,
            lane: "content",
            product: brief.productId ? products.find((item) => item.id === brief.productId) ?? null : null,
            provider,
            samplePayload: sampleContent({ brief, generatedAt, provider, windowDays: options.windowDays }),
            status: "ready_for_approval",
            store: stores.find((store) => store.id === brief.storeId) ?? null,
            summary: `${providerNames[provider]} read-only engagement metrics can feed faceless content optimization for ${brief.title}.`,
            title: `${brief.title} ${providerNames[provider]} metrics`,
            transformTarget: "content_performance_snapshot"
          }),
          target: {
            contentBriefId: brief.id,
            productId: brief.productId,
            storeId: brief.storeId,
            storeName: stores.find((store) => store.id === brief.storeId)?.businessName ?? null
          }
        });
      }
    }

    if (briefs.length === 0) {
      manifests.push(manifest({
        generatedAt,
        lane: "content",
        product: null,
        provider: "youtube",
        samplePayload: null,
        status: "missing_inputs",
        store: stores[0] ?? null,
        summary: "Create internal faceless content briefs before read-only content metrics can be mapped.",
        title: "Content metric connector pending briefs",
        transformTarget: "content_performance_snapshot"
      }));
    }
  }

  if (options.includePayments) {
    manifests.push(manifest({
      generatedAt,
      lane: "payments",
      product: null,
      provider: "stripe",
      samplePayload: stores.length > 0 ? samplePayment(generatedAt, options.windowDays) : null,
      status: stores.length > 0 ? "ready_for_approval" : "missing_inputs",
      store: null,
      summary: stores.length > 0
        ? "Stripe read-only balance and transaction probes can create reconciliation-only finance evidence without moving money."
        : "Create at least one store before payment balance probes can be tied to the portfolio.",
      title: "Stripe balance reconciliation probe",
      transformTarget: "financial_reconciliation_report"
    }));
  }

  const filtered = manifests
    .filter((item) => !options.onlyReady || item.status === "ready_for_approval")
    .slice(0, options.maxConnectors);
  const sampleSignalBatch = options.includeSamplePayloads
    ? combinePayloads(filtered.flatMap((item) => item.samplePayload ? [item.samplePayload] : []))
    : null;
  const signalIntakePreview = buildSignalIntakePlan({
    briefs,
    incoming: sampleSignalBatch ?? undefined,
    options: {
      includeSamplePayloads: options.includeSamplePayloads,
      maxSignals: 100,
      windowDays: options.windowDays
    },
    products,
    stores
  });
  const statusCounts = emptyStatusCounts();

  for (const item of filtered) {
    statusCounts[item.status] += 1;
  }

  return {
    auditEvents: [
      "Read-only signal connector manifests were prepared from ENTRAL internal store, product, content, and finance readiness.",
      "Connector manifests define read-only scopes, credential environment variables, endpoint templates, sample transforms, and approval gates.",
      "No provider, marketplace, social platform, payment processor, browser, proxy, upload target, bank, card, or payout system was contacted."
    ],
    blockedExternalActions,
    externalExecution: false,
    generatedAt,
    manifests: filtered,
    mode: "Internal Read-Only Signal Connector Center",
    options,
    providerContacted: false,
    sampleSignalBatch,
    signalIntakePreview,
    statusCounts,
    summary: `${filtered.length} read-only signal connector manifest${filtered.length === 1 ? "" : "s"} prepared: ${statusCounts.ready_for_approval} ready for approval, ${statusCounts.missing_inputs} missing inputs. Sample batch stages ${signalIntakePreview.totals.signals} Signal Intake record${signalIntakePreview.totals.signals === 1 ? "" : "s"}.`,
    totals: {
      commerceConnectors: filtered.filter((item) => item.lane === "commerce").length,
      connectors: filtered.length,
      contentConnectors: filtered.filter((item) => item.lane === "content").length,
      disabledConnectors: statusCounts.disabled,
      missingInputConnectors: statusCounts.missing_inputs,
      paymentConnectors: filtered.filter((item) => item.lane === "payments").length,
      readyConnectors: statusCounts.ready_for_approval,
      sampleCommerceSignals: sampleSignalBatch?.commerceSignals?.length ?? 0,
      sampleContentSignals: sampleSignalBatch?.contentSignals?.length ?? 0,
      samplePaymentSignals: sampleSignalBatch?.paymentSignals?.length ?? 0
    }
  };
}

export function selectRevenueSignalConnectorManifests(plan: RevenueSignalConnectorPlan, manifestIds?: string[]) {
  if (!manifestIds || manifestIds.length === 0) {
    return plan.manifests.filter((manifestItem) => manifestItem.status === "ready_for_approval");
  }

  const allowedIds = new Set(manifestIds);
  return plan.manifests.filter((manifestItem) => allowedIds.has(manifestItem.id));
}
