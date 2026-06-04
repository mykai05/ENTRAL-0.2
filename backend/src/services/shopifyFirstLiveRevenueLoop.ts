import type { MerchProductSnapshot, MerchStoreSnapshot } from "./merchReports.js";
import { buildProviderPayloadPackage, type ProviderPayloadPackage } from "./merchProviderPayloads.js";
import { buildRevenuePerformanceDigest, type RevenuePerformanceDigest, type RevenuePerformanceSnapshot } from "./revenuePerformance.js";
import type { RevenueEngineProductSnapshot, RevenueEngineStoreSnapshot } from "./revenueEngine.js";
import {
  executeShopifyStorefrontDraft,
  type ShopifyFetch,
  type ShopifyStorefrontDraftCredentials,
  type ShopifyStorefrontDraftOptions,
  type ShopifyStorefrontDraftPlan
} from "./shopifyStorefrontExecutor.js";

export const shopifyFirstLiveRevenueLoopConfirmation = "RUN FIRST LIVE REVENUE LOOP";

export type ShopifyFirstLiveRevenueLoopStatus =
  | "drafts_created"
  | "failed"
  | "needs_owner_unlock"
  | "needs_performance_signal"
  | "needs_products"
  | "needs_shopify_connection"
  | "not_applicable"
  | "ready_for_draft_execution"
  | "ready_for_launch_review"
  | "rotation_review"
  | "watching";

export type ShopifyFirstLiveRevenueLoopNextStep =
  | "apply_performance_rotation"
  | "connect_or_create_shopify_store"
  | "create_internal_product_batch"
  | "ingest_performance_snapshot"
  | "review_draft_resources"
  | "run_controlled_shopify_draft"
  | "skip_non_shopify_store"
  | "watch_first_sales";

export type ShopifyFirstLiveRevenueLoopProduct = MerchProductSnapshot & RevenueEngineProductSnapshot;
export type ShopifyFirstLiveRevenueLoopStore = MerchStoreSnapshot & RevenueEngineStoreSnapshot;

export type ShopifyFirstLiveRevenueLoopPlan = {
  actualExternalActionsExecuted: boolean;
  blockedExternalActions: string[];
  createdInternalProducts: number;
  dryRun: boolean;
  externalExecution: boolean;
  generatedAt: string;
  guardrails: string[];
  mode: "First Live Shopify Revenue Loop";
  nextAutonomousStep: ShopifyFirstLiveRevenueLoopNextStep;
  performanceDigest: RevenuePerformanceDigest;
  productReadiness: {
    approvedProducts: number;
    createdInternalProducts: number;
    minimumProducts: number;
    productTarget: number;
    readyForDraftProducts: number;
    status: "ready" | "needs_products";
  };
  providerContacted: boolean;
  providerPackage: ProviderPayloadPackage;
  shopifyDraft: ShopifyStorefrontDraftPlan;
  status: ShopifyFirstLiveRevenueLoopStatus;
  store: {
    businessName: string;
    id: string;
    launchStatus: string;
    platform: string;
  };
  summary: string;
  todayLaunchWindow: {
    blockers: string[];
    canMoveToday: boolean;
    requiredHumanActions: string[];
  };
  totals: {
    blockedExternalActions: number;
    providerPayloads: number;
    shopifyDraftActions: number;
    shopifyExecutedActions: number;
    performanceSnapshots: number;
    rotationChanges: number;
    scaleSignals: number;
  };
};

export type ShopifyFirstLiveRevenueLoopInput = {
  connectorApproval: boolean;
  createdInternalProducts?: number;
  credentials?: ShopifyStorefrontDraftCredentials;
  dryRun: boolean;
  fetcher?: ShopifyFetch;
  generatedAt?: string;
  liveUnlockPhrase?: string | null;
  options?: Partial<ShopifyStorefrontDraftOptions> & {
    minimumProducts?: number;
  };
  performanceSnapshots: RevenuePerformanceSnapshot[];
  products: ShopifyFirstLiveRevenueLoopProduct[];
  store: ShopifyFirstLiveRevenueLoopStore;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(value), min), max);
}

function approved(product: Pick<MerchProductSnapshot, "status">) {
  return product.status === "Approved" || product.status === "Published";
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function statusAndStep(input: {
  performanceDigest: RevenuePerformanceDigest;
  productReadiness: ShopifyFirstLiveRevenueLoopPlan["productReadiness"];
  shopifyDraft: ShopifyStorefrontDraftPlan;
  store: ShopifyFirstLiveRevenueLoopStore;
}): Pick<ShopifyFirstLiveRevenueLoopPlan, "nextAutonomousStep" | "status"> {
  if (input.store.storePlatform !== "Shopify") {
    return {
      nextAutonomousStep: "skip_non_shopify_store",
      status: "not_applicable"
    };
  }

  if (input.productReadiness.status === "needs_products") {
    return {
      nextAutonomousStep: "create_internal_product_batch",
      status: "needs_products"
    };
  }

  if (input.shopifyDraft.status === "credential_blocked") {
    return {
      nextAutonomousStep: "connect_or_create_shopify_store",
      status: "needs_shopify_connection"
    };
  }

  if (input.shopifyDraft.status === "ready_for_owner_unlock") {
    return {
      nextAutonomousStep: "run_controlled_shopify_draft",
      status: "needs_owner_unlock"
    };
  }

  if (input.shopifyDraft.status === "failed") {
    return {
      nextAutonomousStep: "run_controlled_shopify_draft",
      status: "failed"
    };
  }

  if (input.shopifyDraft.status === "dry_run" || input.shopifyDraft.status === "ready_to_execute") {
    return {
      nextAutonomousStep: "run_controlled_shopify_draft",
      status: "ready_for_draft_execution"
    };
  }

  if (input.shopifyDraft.status === "executed") {
    return {
      nextAutonomousStep: "review_draft_resources",
      status: "drafts_created"
    };
  }

  if (input.performanceDigest.totals.rotationChanges > 0) {
    return {
      nextAutonomousStep: "apply_performance_rotation",
      status: "rotation_review"
    };
  }

  if (input.performanceDigest.totals.snapshots === 0) {
    return {
      nextAutonomousStep: "ingest_performance_snapshot",
      status: "needs_performance_signal"
    };
  }

  return {
    nextAutonomousStep: "watch_first_sales",
    status: "watching"
  };
}

function todayLaunchWindow(input: {
  productReadiness: ShopifyFirstLiveRevenueLoopPlan["productReadiness"];
  shopifyDraft: ShopifyStorefrontDraftPlan;
  status: ShopifyFirstLiveRevenueLoopStatus;
}) {
  const blockers = [
    input.productReadiness.status === "needs_products" ? "Create or approve the first internal product batch." : "",
    input.shopifyDraft.credentialReadiness.status !== "ready" ? "Connect verified Shopify Admin credentials or complete store creation/OAuth capture." : "",
    input.shopifyDraft.ownerUnlock.status === "waiting_owner" ? "Approve connector use and provide the exact Shopify draft execution unlock phrase." : "",
    input.shopifyDraft.status === "failed" ? "Repair the failed Shopify draft action before launch review." : ""
  ].filter(Boolean);
  const requiredHumanActions = unique([
    ...input.shopifyDraft.launchReadiness.remainingApprovals,
    "Drive real traffic through approved channels after draft resources are reviewed.",
    "Capture Shopify/order/performance signals before Entral scales, pauses, or rotates products."
  ]);

  return {
    blockers,
    canMoveToday: blockers.length === 0 && input.status !== "not_applicable",
    requiredHumanActions
  };
}

function summaryFor(input: {
  performanceDigest: RevenuePerformanceDigest;
  productReadiness: ShopifyFirstLiveRevenueLoopPlan["productReadiness"];
  shopifyDraft: ShopifyStorefrontDraftPlan;
  status: ShopifyFirstLiveRevenueLoopStatus;
  store: ShopifyFirstLiveRevenueLoopStore;
}) {
  if (input.status === "not_applicable") {
    return `${input.store.businessName} is not a Shopify store, so the first live revenue loop skipped Shopify execution.`;
  }

  if (input.status === "needs_products") {
    return `${input.store.businessName} needs ${Math.max(0, input.productReadiness.minimumProducts - input.productReadiness.approvedProducts)} more approved product${input.productReadiness.minimumProducts - input.productReadiness.approvedProducts === 1 ? "" : "s"} before the Shopify first revenue loop can draft the storefront.`;
  }

  if (input.status === "needs_shopify_connection") {
    return `${input.store.businessName} has a product drop ready, but Shopify connection or store-creation capture is still required.`;
  }

  if (input.status === "needs_owner_unlock") {
    return `${input.store.businessName} is ready for controlled Shopify draft execution once owner unlock is supplied.`;
  }

  if (input.status === "ready_for_draft_execution") {
    return `${input.store.businessName} has ${input.shopifyDraft.totals.readyActions} Shopify draft action${input.shopifyDraft.totals.readyActions === 1 ? "" : "s"} ready for the controlled draft executor.`;
  }

  if (input.status === "drafts_created") {
    return `${input.store.businessName} has Shopify draft resources ready for review. Public launch and money movement remain locked until owner approval.`;
  }

  if (input.status === "rotation_review") {
    return `${input.store.businessName} has performance evidence and ${input.performanceDigest.totals.rotationChanges} internal rotation change${input.performanceDigest.totals.rotationChanges === 1 ? "" : "s"} ready for review.`;
  }

  if (input.status === "needs_performance_signal") {
    return `${input.store.businessName} needs its first traffic, order, or manual performance snapshot after launch review so Entral can decide whether to scale, revise, or pause.`;
  }

  if (input.status === "failed") {
    return `${input.store.businessName} first live revenue loop hit a Shopify draft failure: ${input.shopifyDraft.summary}`;
  }

  return `${input.store.businessName} is in watch mode with ${input.performanceDigest.totals.snapshots} performance snapshot${input.performanceDigest.totals.snapshots === 1 ? "" : "s"} scored.`;
}

export async function executeShopifyFirstLiveRevenueLoop(input: ShopifyFirstLiveRevenueLoopInput): Promise<ShopifyFirstLiveRevenueLoopPlan> {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const maxProducts = clamp(input.options?.maxProducts ?? 5, 1, 25);
  const minimumProducts = clamp(input.options?.minimumProducts ?? Math.min(maxProducts, 3), 1, maxProducts);
  const approvedProducts = input.products.filter(approved);
  const productReadiness = {
    approvedProducts: approvedProducts.length,
    createdInternalProducts: input.createdInternalProducts ?? 0,
    minimumProducts,
    productTarget: maxProducts,
    readyForDraftProducts: Math.min(approvedProducts.length, maxProducts),
    status: approvedProducts.length >= minimumProducts ? "ready" as const : "needs_products" as const
  };
  const providerPackage = buildProviderPayloadPackage({
    options: {
      includeUnapproved: false,
      maxProducts
    },
    products: input.products,
    store: input.store,
    storeId: input.store.id
  });
  const shopifyDraft = await executeShopifyStorefrontDraft({
    connectorApproval: input.connectorApproval,
    credentials: input.credentials,
    dryRun: input.dryRun,
    fetcher: input.fetcher,
    generatedAt,
    liveUnlockPhrase: input.liveUnlockPhrase,
    options: {
      includeCollections: input.options?.includeCollections ?? true,
      includeProducts: input.options?.includeProducts ?? true,
      includeStoreShell: input.options?.includeStoreShell ?? true,
      maxProducts
    },
    products: input.products,
    store: input.store,
    storeId: input.store.id
  });
  const performanceDigest = buildRevenuePerformanceDigest({
    generatedAt,
    products: input.products,
    snapshots: input.performanceSnapshots,
    stores: [input.store]
  });
  const state = statusAndStep({
    performanceDigest,
    productReadiness,
    shopifyDraft,
    store: input.store
  });
  const window = todayLaunchWindow({
    productReadiness,
    shopifyDraft,
    status: state.status
  });

  return {
    actualExternalActionsExecuted: shopifyDraft.actualExternalActionsExecuted,
    blockedExternalActions: unique([
      ...providerPackage.blockedActions,
      ...shopifyDraft.blockedExternalActions,
      ...performanceDigest.blockedExternalActions,
      "Public publishing remains separate from the draft executor.",
      "Payment, payout, billing, supplier charges, tax, legal policy, domain, ad spend, and customer messaging actions remain separately gated."
    ]),
    createdInternalProducts: input.createdInternalProducts ?? 0,
    dryRun: input.dryRun,
    externalExecution: shopifyDraft.externalExecution,
    generatedAt,
    guardrails: [
      "Create internal product records before provider or storefront execution.",
      "Use locked provider payloads for Printify/Printful/Shopify request design; provider publishing is not sent by this loop.",
      "Use Shopify draft resources only until owner review and public launch approval are complete.",
      "Score early performance before scaling, pausing, or killing assets.",
      "Never move money, buy domains, change billing, or start ads from this loop."
    ],
    mode: "First Live Shopify Revenue Loop",
    nextAutonomousStep: state.nextAutonomousStep,
    performanceDigest,
    productReadiness,
    providerContacted: shopifyDraft.providerContacted,
    providerPackage,
    shopifyDraft,
    status: state.status,
    store: {
      businessName: input.store.businessName,
      id: input.store.id,
      launchStatus: input.store.launchStatus,
      platform: input.store.storePlatform
    },
    summary: summaryFor({
      performanceDigest,
      productReadiness,
      shopifyDraft,
      status: state.status,
      store: input.store
    }),
    todayLaunchWindow: window,
    totals: {
      blockedExternalActions: unique([
        ...providerPackage.blockedActions,
        ...shopifyDraft.blockedExternalActions,
        ...performanceDigest.blockedExternalActions
      ]).length,
      performanceSnapshots: performanceDigest.totals.snapshots,
      providerPayloads: providerPackage.payloadCount,
      rotationChanges: performanceDigest.totals.rotationChanges,
      scaleSignals: performanceDigest.totals.scaleRecommendations,
      shopifyDraftActions: shopifyDraft.storefrontActions.length,
      shopifyExecutedActions: shopifyDraft.totals.executedActions
    }
  };
}
