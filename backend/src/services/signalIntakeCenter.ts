import {
  calculateRevenuePerformanceNetProfit,
  normalizeRevenuePerformanceSnapshot,
  type RevenuePerformanceSnapshot,
  type RevenuePerformanceSnapshotInput,
  type RevenuePerformanceSource
} from "./revenuePerformance.js";
import type {
  FacelessContentChannel,
  FacelessContentPerformanceSnapshot,
  FacelessContentSource
} from "./facelessContentPipeline.js";

export type SignalIntakeCommerceSignal = RevenuePerformanceSnapshotInput & {
  externalReference?: string | null;
};

export type SignalIntakeContentSignal = {
  channel?: FacelessContentChannel;
  clicks?: number;
  comments?: number;
  contentBriefId?: string | null;
  conversions?: number;
  cost?: number;
  externalReference?: string | null;
  likes?: number;
  notes?: string | null;
  periodEnd: string;
  periodStart: string;
  productId?: string | null;
  revenue?: number;
  saves?: number;
  shares?: number;
  source?: FacelessContentSource;
  storeId?: string | null;
  views?: number;
  watchSeconds?: number;
};

export type SignalIntakePaymentSignal = {
  availableBalance?: number;
  currency?: "USD";
  externalReference?: string | null;
  fees?: number;
  notes?: string | null;
  paidOut?: number;
  pendingBalance?: number;
  periodEnd: string;
  periodStart: string;
  provider?: "stripe" | "manual" | "other";
};

export type SignalIntakeOptions = {
  includeSamplePayloads: boolean;
  maxSignals: number;
  windowDays: number;
};

export type SignalIntakeStoreReference = {
  businessName: string;
  id: string;
  launchStatus: string;
  storePlatform: string;
};

export type SignalIntakeProductReference = {
  id: string;
  productName: string;
  storeId: string;
};

export type SignalIntakeContentBriefReference = {
  id: string;
  storeId: string;
  productId: string | null;
  title: string;
};

export type SignalIntakeInput = {
  commerceSignals?: SignalIntakeCommerceSignal[];
  contentSignals?: SignalIntakeContentSignal[];
  paymentSignals?: SignalIntakePaymentSignal[];
};

export type SignalIntakePaymentReconciliationDraft = Required<Omit<SignalIntakePaymentSignal, "externalReference" | "notes" | "provider">> & {
  externalExecution: false;
  externalReference: string | null;
  id: string;
  netBalanceDelta: number;
  notes: string | null;
  provider: "stripe" | "manual" | "other";
  providerContacted: false;
  status: "record_only";
};

export type SignalIntakeLane = {
  count: number;
  externalExecution: false;
  lane: "commerce" | "content" | "payments";
  providerContacted: false;
  riskLevel: "low" | "medium" | "high";
  summary: string;
};

export type SignalIntakePlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  lanes: SignalIntakeLane[];
  mode: "Internal Signal Intake Center";
  normalized: {
    commerceSnapshots: RevenuePerformanceSnapshot[];
    contentSnapshots: FacelessContentPerformanceSnapshot[];
    paymentReconciliationDrafts: SignalIntakePaymentReconciliationDraft[];
  };
  options: SignalIntakeOptions;
  providerContacted: false;
  readiness: {
    contentBriefsAvailable: number;
    productsAvailable: number;
    storesAvailable: number;
  };
  samplePayloads: SignalIntakeInput | null;
  summary: string;
  totals: {
    commerceSignals: number;
    contentSignals: number;
    estimatedNetProfit: number;
    paymentSignals: number;
    projectedAvailableBalance: number;
    projectedContentRevenue: number;
    projectedGrossRevenue: number;
    signals: number;
  };
};

export const signalIntakeConfirmation = "INGEST APPROVED READ-ONLY SIGNALS";

export const signalIntakeBlockedExternalActions = [
  "Calling marketplace, POD, social, payment, analytics, bank, card, payout, upload, or ad APIs",
  "Publishing listings, editing storefronts, uploading files, posting content, or changing channel settings",
  "Moving money, creating transfers, creating payouts, changing bank accounts, or authorizing spend",
  "Using browser stealth, anti-detection, proxy rotation, fingerprint spoofing, CAPTCHA bypass, or account automation",
  "Importing data without owner approval, credential-scope review, and internal audit logging"
];

const defaultOptions: SignalIntakeOptions = {
  includeSamplePayloads: true,
  maxSignals: 100,
  windowDays: 30
};

function money(value: number | undefined, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : fallback;
}

function whole(value: number | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function dateMs(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function normalizeOptions(options: Partial<SignalIntakeOptions> = {}): SignalIntakeOptions {
  return {
    includeSamplePayloads: options.includeSamplePayloads ?? defaultOptions.includeSamplePayloads,
    maxSignals: options.maxSignals ?? defaultOptions.maxSignals,
    windowDays: options.windowDays ?? defaultOptions.windowDays
  };
}

function normalizedCommerce(signal: SignalIntakeCommerceSignal, index: number): RevenuePerformanceSnapshot {
  const netProfit = signal.netProfit ?? calculateRevenuePerformanceNetProfit(signal);

  return normalizeRevenuePerformanceSnapshot({
    ...signal,
    id: `signal_commerce_${signal.storeId}_${signal.productId ?? "store"}_${dateMs(signal.periodEnd)}_${index}`,
    netProfit,
    notes: [
      signal.notes,
      signal.externalReference ? `External reference: ${signal.externalReference}` : null,
      "Imported through approved read-only Signal Intake Center."
    ].filter(Boolean).join(" | "),
    source: signal.source as RevenuePerformanceSource | undefined
  });
}

function normalizedContent(signal: SignalIntakeContentSignal, index: number): FacelessContentPerformanceSnapshot {
  const channel = signal.channel ?? "youtube_shorts";
  const source = signal.source ?? (channel === "tiktok" ? "tiktok" : channel === "instagram_reels" ? "instagram" : "youtube");

  return {
    channel,
    clicks: whole(signal.clicks),
    comments: whole(signal.comments),
    contentBriefId: signal.contentBriefId ?? null,
    conversions: whole(signal.conversions),
    cost: money(signal.cost),
    externalExecution: false,
    id: `signal_content_${channel}_${signal.storeId ?? "portfolio"}_${dateMs(signal.periodEnd)}_${index}`,
    likes: whole(signal.likes),
    notes: [
      signal.notes,
      signal.externalReference ? `External reference: ${signal.externalReference}` : null,
      "Imported through approved read-only Signal Intake Center."
    ].filter(Boolean).join(" | ") || null,
    periodEnd: signal.periodEnd,
    periodStart: signal.periodStart,
    productId: signal.productId ?? null,
    revenue: money(signal.revenue),
    saves: whole(signal.saves),
    shares: whole(signal.shares),
    source,
    storeId: signal.storeId ?? null,
    views: whole(signal.views),
    watchSeconds: whole(signal.watchSeconds)
  };
}

function normalizedPayment(signal: SignalIntakePaymentSignal, index: number): SignalIntakePaymentReconciliationDraft {
  const availableBalance = money(signal.availableBalance);
  const pendingBalance = money(signal.pendingBalance);
  const paidOut = money(signal.paidOut);
  const fees = money(signal.fees);

  return {
    availableBalance,
    currency: signal.currency ?? "USD",
    externalExecution: false,
    externalReference: signal.externalReference ?? null,
    fees,
    id: `signal_payment_${signal.provider ?? "manual"}_${dateMs(signal.periodEnd)}_${index}`,
    netBalanceDelta: money(availableBalance + pendingBalance - paidOut - fees),
    notes: signal.notes ?? null,
    paidOut,
    pendingBalance,
    periodEnd: signal.periodEnd,
    periodStart: signal.periodStart,
    provider: signal.provider ?? "manual",
    providerContacted: false,
    status: "record_only"
  };
}

function samplePayloads(input: {
  briefs: SignalIntakeContentBriefReference[];
  products: SignalIntakeProductReference[];
  stores: SignalIntakeStoreReference[];
}): SignalIntakeInput | null {
  const store = input.stores[0];
  if (!store) return null;

  const product = input.products.find((item) => item.storeId === store.id);
  const brief = input.briefs.find((item) => item.storeId === store.id);
  const now = new Date();
  const periodEnd = now.toISOString();
  const periodStart = new Date(now.getTime() - 7 * 86_400_000).toISOString();

  return {
    commerceSignals: [{
      externalReference: `${store.storePlatform.toLowerCase()}-sample-readonly`,
      grossRevenue: 240,
      periodEnd,
      periodStart,
      platformFees: 16,
      productId: product?.id ?? null,
      productionCost: 72,
      shippingCost: 24,
      source: store.storePlatform === "Shopify" ? "shopify" : store.storePlatform === "Etsy" ? "etsy" : "manual",
      storeId: store.id,
      unitsSold: 8,
      visits: 320
    }],
    contentSignals: [{
      channel: "youtube_shorts",
      clicks: 54,
      contentBriefId: brief?.id ?? null,
      conversions: 5,
      externalReference: "shorts-sample-readonly",
      periodEnd,
      periodStart,
      productId: product?.id ?? null,
      revenue: 110,
      source: "youtube",
      storeId: store.id,
      views: 2400,
      watchSeconds: 31800
    }],
    paymentSignals: [{
      availableBalance: 180,
      externalReference: "stripe-readonly-sample",
      fees: 8,
      paidOut: 0,
      pendingBalance: 64,
      periodEnd,
      periodStart,
      provider: "stripe"
    }]
  };
}

function lane(laneName: SignalIntakeLane["lane"], count: number, summary: string): SignalIntakeLane {
  return {
    count,
    externalExecution: false,
    lane: laneName,
    providerContacted: false,
    riskLevel: count > 50 ? "medium" : "low",
    summary
  };
}

export function buildSignalIntakePlan(input: {
  briefs?: SignalIntakeContentBriefReference[];
  generatedAt?: string;
  incoming?: SignalIntakeInput;
  options?: Partial<SignalIntakeOptions>;
  products?: SignalIntakeProductReference[];
  stores?: SignalIntakeStoreReference[];
}): SignalIntakePlan {
  const options = normalizeOptions(input.options);
  const commerceSignals = (input.incoming?.commerceSignals ?? []).slice(0, options.maxSignals);
  const contentSignals = (input.incoming?.contentSignals ?? []).slice(0, options.maxSignals);
  const paymentSignals = (input.incoming?.paymentSignals ?? []).slice(0, Math.min(options.maxSignals, 25));
  const commerceSnapshots = commerceSignals.map(normalizedCommerce);
  const contentSnapshots = contentSignals.map(normalizedContent);
  const paymentReconciliationDrafts = paymentSignals.map(normalizedPayment);
  const projectedGrossRevenue = money(commerceSnapshots.reduce((sum, snapshot) => sum + snapshot.grossRevenue, 0));
  const estimatedNetProfit = money(commerceSnapshots.reduce((sum, snapshot) => sum + snapshot.netProfit, 0));
  const projectedContentRevenue = money(contentSnapshots.reduce((sum, snapshot) => sum + snapshot.revenue - snapshot.cost, 0));
  const projectedAvailableBalance = money(paymentReconciliationDrafts.reduce((sum, draft) => sum + draft.availableBalance, 0));
  const stores = input.stores ?? [];
  const products = input.products ?? [];
  const briefs = input.briefs ?? [];

  return {
    auditEvents: [
      "Signal Intake Center normalized approved read-only signals into internal evidence records.",
      "Commerce signals feed the Performance Velocity Ledger; content signals feed Faceless Content optimization; payment signals create reconciliation-only finance evidence.",
      "No provider, marketplace, social platform, payment processor, bank, browser, proxy, or upload system was contacted."
    ],
    blockedExternalActions: signalIntakeBlockedExternalActions,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    lanes: [
      lane("commerce", commerceSnapshots.length, "Commerce signals normalize into revenue performance snapshots for velocity, margin, and rotation decisions."),
      lane("content", contentSnapshots.length, "Content signals normalize into faceless content performance snapshots for remix and hook optimization."),
      lane("payments", paymentReconciliationDrafts.length, "Payment signals normalize into reconciliation-only evidence without moving money.")
    ],
    mode: "Internal Signal Intake Center",
    normalized: {
      commerceSnapshots,
      contentSnapshots,
      paymentReconciliationDrafts
    },
    options,
    providerContacted: false,
    readiness: {
      contentBriefsAvailable: briefs.length,
      productsAvailable: products.length,
      storesAvailable: stores.length
    },
    samplePayloads: options.includeSamplePayloads ? samplePayloads({ briefs, products, stores }) : null,
    summary: `${commerceSnapshots.length + contentSnapshots.length + paymentReconciliationDrafts.length} approved read-only signal${commerceSnapshots.length + contentSnapshots.length + paymentReconciliationDrafts.length === 1 ? "" : "s"} staged. Projected commerce revenue ${projectedGrossRevenue}, commerce net profit ${estimatedNetProfit}, content net revenue ${projectedContentRevenue}, and available payment balance ${projectedAvailableBalance}.`,
    totals: {
      commerceSignals: commerceSnapshots.length,
      contentSignals: contentSnapshots.length,
      estimatedNetProfit,
      paymentSignals: paymentReconciliationDrafts.length,
      projectedAvailableBalance,
      projectedContentRevenue,
      projectedGrossRevenue,
      signals: commerceSnapshots.length + contentSnapshots.length + paymentReconciliationDrafts.length
    }
  };
}
