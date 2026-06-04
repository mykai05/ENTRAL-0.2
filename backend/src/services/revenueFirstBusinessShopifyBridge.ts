import type { MerchProductSnapshot, MerchStoreSnapshot } from "./merchReports.js";
import type {
  RevenueFirstBusinessAutonomousLaunchPlan,
  RevenueFirstBusinessLiveExecutorPlan
} from "./revenueFirstStorePreparation.js";
import {
  executeShopifyStorefrontDraft,
  type ShopifyFetch,
  type ShopifyStorefrontDraftCredentials,
  type ShopifyStorefrontDraftPlan
} from "./shopifyStorefrontExecutor.js";
import {
  executeShopifyAutonomyRun,
  type ShopifyAutonomyRunPlan
} from "./shopifyAutonomyRun.js";

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function merchStoreFromAutonomousLaunch(autonomousLaunch: RevenueFirstBusinessAutonomousLaunchPlan): MerchStoreSnapshot {
  const store = autonomousLaunch.executionPacket.finalExecutionPacket.store;
  const products = autonomousLaunch.productCreationPlan;

  return {
    approvalStatus: "Launch Approved",
    audience: store.audience,
    brandStyle: `${store.businessName} autonomous first-drop`,
    businessName: store.businessName,
    clientName: store.businessName,
    estimatedProfit: products.reduce((sum, product) => sum + Math.max(0, product.retailPrice * product.profitMargin / 100), 0),
    industry: store.industry,
    launchStatus: store.launchStatus,
    notes: autonomousLaunch.summary,
    podProvider: autonomousLaunch.supplierPlan.selectedSupplier.provider,
    productTypes: unique(products.map((product) => product.productType)),
    revenue: 0,
    storePlatform: store.storePlatform
  };
}

function merchProductsFromAutonomousLaunch(autonomousLaunch: RevenueFirstBusinessAutonomousLaunchPlan): MerchProductSnapshot[] {
  return autonomousLaunch.productCreationPlan.map((product) => ({
    aiDisclosureNeeded: true,
    complianceNotes: product.approvalChecklist.join(" "),
    designConcept: product.designSpec.prompt,
    designPrompt: product.designSpec.prompt,
    estimatedProfit: Math.max(0, product.retailPrice * product.profitMargin / 100),
    listingDescription: product.listingDescription,
    listingTitle: product.listingTitle,
    productName: product.productName,
    productType: product.productType,
    productionPartnerDisclosureNeeded: true,
    retailPrice: product.retailPrice,
    status: "Approved",
    tags: product.tags
  }));
}

export async function executeFirstBusinessShopifyStorefrontDraft(input: {
  autonomousLaunch: RevenueFirstBusinessAutonomousLaunchPlan;
  connectorApproval: boolean;
  credentials?: ShopifyStorefrontDraftCredentials;
  dryRun: boolean;
  fetcher?: ShopifyFetch;
  generatedAt?: string;
  liveExecutor: RevenueFirstBusinessLiveExecutorPlan | null;
  shopifyDraftUnlockPhrase?: string | null;
}): Promise<ShopifyStorefrontDraftPlan | null> {
  const store = merchStoreFromAutonomousLaunch(input.autonomousLaunch);

  if (store.storePlatform !== "Shopify") return null;

  const liveExecutorArmed = input.liveExecutor?.status === "armed_non_payment_live_run";

  return executeShopifyStorefrontDraft({
    connectorApproval: input.connectorApproval && liveExecutorArmed,
    credentials: input.credentials,
    dryRun: input.dryRun,
    fetcher: input.fetcher,
    generatedAt: input.generatedAt,
    liveUnlockPhrase: input.shopifyDraftUnlockPhrase,
    options: {
      includeCollections: true,
      includeProducts: true,
      includeStoreShell: true,
      maxProducts: 5
    },
    products: merchProductsFromAutonomousLaunch(input.autonomousLaunch),
    store,
    storeId: input.autonomousLaunch.executionPacket.finalExecutionPacket.store.sourceStoreId
  });
}

export async function executeFirstBusinessShopifyAutonomyRun(input: {
  autonomousLaunch: RevenueFirstBusinessAutonomousLaunchPlan;
  connectorApproval: boolean;
  credentials?: ShopifyStorefrontDraftCredentials;
  dryRun: boolean;
  fetcher?: ShopifyFetch;
  generatedAt?: string;
  liveExecutor: RevenueFirstBusinessLiveExecutorPlan | null;
  shopifyDraftUnlockPhrase?: string | null;
}): Promise<ShopifyAutonomyRunPlan | null> {
  const store = merchStoreFromAutonomousLaunch(input.autonomousLaunch);

  if (store.storePlatform !== "Shopify") return null;

  const liveExecutorArmed = input.liveExecutor?.status === "armed_non_payment_live_run";

  return executeShopifyAutonomyRun({
    connectorApproval: input.connectorApproval && liveExecutorArmed,
    credentials: input.credentials,
    dryRun: input.dryRun,
    fetcher: input.fetcher,
    generatedAt: input.generatedAt,
    liveUnlockPhrase: input.shopifyDraftUnlockPhrase,
    options: {
      includeCollections: true,
      includeProducts: true,
      includeStoreShell: true,
      maxProducts: 5
    },
    products: merchProductsFromAutonomousLaunch(input.autonomousLaunch),
    requestedShopName: store.businessName,
    store,
    storeId: input.autonomousLaunch.executionPacket.finalExecutionPacket.store.sourceStoreId,
    storeType: "client_transfer"
  });
}
