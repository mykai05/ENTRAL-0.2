import type { RevenueEngineProductSnapshot, RevenueEngineStoreSnapshot, RevenueStoreLaunchStatus } from "./revenueEngine.js";

export type RevenueStoreSetupOptions = {
  includeCredentialScopes: boolean;
  maxStores: number;
  minApprovedProducts: number;
  minConnectorReadiness: number;
  minListingReadyProducts: number;
};

export type RevenueStoreSetupAction = "prepare_store_setup" | "queue_connector_readiness" | "hold";

export type RevenueStoreSetupStepCategory =
  | "identity"
  | "policies"
  | "collections"
  | "products"
  | "fulfillment"
  | "analytics"
  | "connector"
  | "rollback";

export type RevenueStorefrontSetting = {
  approvalRequired: true;
  evidence: string;
  key: string;
  label: string;
  recommendedValue: string;
};

export type RevenueStoreCollectionBlueprint = {
  handle: string;
  id: string;
  manualSteps: string[];
  productTypes: string[];
  rule: string;
  title: string;
};

export type RevenueStoreProductLaneTarget = {
  listingReadyProductIds: string[];
  missingProducts: number;
  priority: number;
  productType: string;
  readyProducts: number;
  requiredProducts: number;
};

export type RevenueStoreCredentialScope = {
  provider: "Etsy" | "Shopify" | "Printify" | "Printful" | "Stripe" | "Analytics";
  reason: string;
  scope: string;
  status: "Approval required";
};

export type RevenueStoreSetupStep = {
  category: RevenueStoreSetupStepCategory;
  checklist: string[];
  evidenceRequired: string[];
  externalExecution: false;
  id: string;
  status: "ready" | "needs_input" | "blocked";
  title: string;
};

export type RevenueStoreSetupRunbook = {
  action: RevenueStoreSetupAction;
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    reason: string;
    status: "Required" | "Not ready";
  };
  collectionBlueprints: RevenueStoreCollectionBlueprint[];
  credentialScopes: RevenueStoreCredentialScope[];
  externalExecution: false;
  id: string;
  launchReadiness: {
    readyListingProducts: number;
    readyProducts: number;
    requiredListingProducts: number;
    status: "Ready for internal setup" | "Needs product/listing work" | "Connector review ready";
  };
  manualConnectorReadiness: {
    requiredBeforeConnector: string[];
    score: number;
    status: "Ready for manual handoff" | "Needs review" | "Blocked - missing launch inputs";
  };
  priority: number;
  productLaneTargets: RevenueStoreProductLaneTarget[];
  reason: string;
  recommendedLaunchStatus: RevenueStoreLaunchStatus;
  readinessScore: number;
  setupSteps: RevenueStoreSetupStep[];
  storeId: string;
  storeName: string;
  storePlatform: string;
  storefrontSettings: RevenueStorefrontSetting[];
};

export type RevenueStoreSetupQueueItem = {
  action: RevenueStoreSetupAction;
  externalExecution: false;
  id: string;
  priority: number;
  storeId: string;
  summary: string;
  title: string;
};

export type RevenueStoreSetupPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Store Setup Runbook";
  options: RevenueStoreSetupOptions;
  queue: RevenueStoreSetupQueueItem[];
  runbooks: RevenueStoreSetupRunbook[];
  summary: string;
  totals: {
    collectionBlueprints: number;
    credentialScopes: number;
    readyForConnector: number;
    runbooksQueued: number;
    storefrontSettings: number;
    storesEvaluated: number;
    storesMovingToBuild: number;
  };
};

export const defaultRevenueStoreSetupOptions: RevenueStoreSetupOptions = {
  includeCredentialScopes: true,
  maxStores: 10,
  minApprovedProducts: 2,
  minConnectorReadiness: 75,
  minListingReadyProducts: 2
};

const blockedStoreStatuses = new Set(["Paused", "Archived"]);
const liveSetupStatuses = new Set(["Building Store", "Awaiting Approval"]);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "store";
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function listingReady(product: RevenueEngineProductSnapshot) {
  return (product.status === "Approved" || product.status === "Published")
    && Boolean(product.listingTitle)
    && Boolean(product.listingDescription)
    && product.tags.length >= 3;
}

function approvedProduct(product: RevenueEngineProductSnapshot) {
  return product.status === "Approved" || product.status === "Published";
}

function activeProduct(product: RevenueEngineProductSnapshot) {
  return product.status !== "Archived" && product.status !== "Rejected";
}

function fallbackProductTypes(store: RevenueEngineStoreSnapshot) {
  const industry = store.industry.toLowerCase();

  if (/gym|fitness|training|sport/.test(industry)) return ["T-shirt", "Hoodie", "Sticker"];
  if (/coffee|cafe|restaurant|bar|food/.test(industry)) return ["Mug", "T-shirt", "Sticker"];
  if (/studio|artist|design|creative|music/.test(industry)) return ["Poster", "Sticker", "T-shirt"];
  if (/security|tech|software|agency|consult/.test(industry)) return ["T-shirt", "Sticker", "Notebook"];

  return ["T-shirt", "Sticker", "Mug"];
}

function productTypesForStore(store: RevenueEngineStoreSnapshot, products: RevenueEngineProductSnapshot[]) {
  return unique([
    ...store.productTypes,
    ...products.filter(activeProduct).map((product) => product.productType),
    ...fallbackProductTypes(store)
  ]).slice(0, 8);
}

function laneTargets(
  store: RevenueEngineStoreSnapshot,
  products: RevenueEngineProductSnapshot[],
  options: RevenueStoreSetupOptions
): RevenueStoreProductLaneTarget[] {
  const productTypes = productTypesForStore(store, products);
  const perLaneMinimum = Math.max(1, Math.ceil(options.minListingReadyProducts / Math.max(productTypes.length, 1)));

  return productTypes.map((productType, index) => {
    const matchingReady = products.filter((product) => (
      listingReady(product)
      && product.productType.toLowerCase().includes(productType.toLowerCase())
    ));

    return {
      listingReadyProductIds: matchingReady.map((product) => product.id),
      missingProducts: Math.max(0, perLaneMinimum - matchingReady.length),
      priority: index + 1,
      productType,
      readyProducts: matchingReady.length,
      requiredProducts: perLaneMinimum
    };
  });
}

function collectionBlueprints(store: RevenueEngineStoreSnapshot, products: RevenueEngineProductSnapshot[]) {
  const readyProducts = products.filter(listingReady);
  const types = productTypesForStore(store, products).slice(0, 5);
  const blueprints: RevenueStoreCollectionBlueprint[] = [
    {
      handle: `${slug(store.businessName)}-launch`,
      id: `collection_${store.id}_launch`,
      manualSteps: [
        "Create collection in draft/unpublished state only.",
        "Add approved listing-ready products after final review.",
        "Confirm title, handle, navigation placement, and rollback owner before connector use."
      ],
      productTypes: unique(readyProducts.map((product) => product.productType)).slice(0, 8),
      rule: "Include all approved, listing-ready launch products for the storefront opening collection.",
      title: `${store.businessName} Launch Collection`
    }
  ];

  for (const type of types) {
    blueprints.push({
      handle: `${slug(store.businessName)}-${slug(type)}`,
      id: `collection_${store.id}_${slug(type)}`,
      manualSteps: [
        `Create a draft ${type} collection only after final approval.`,
        "Attach matching approved products and verify listing images manually.",
        "Keep collection hidden until launch approval is complete."
      ],
      productTypes: [type],
      rule: `Include approved products where product type contains ${type}.`,
      title: `${store.businessName} ${type}`
    });
  }

  return blueprints;
}

function storefrontSettings(store: RevenueEngineStoreSnapshot): RevenueStorefrontSetting[] {
  return [
    {
      approvalRequired: true,
      evidence: "Uses the internal Client Merch Store business name.",
      key: "store_name",
      label: "Store Name",
      recommendedValue: store.businessName
    },
    {
      approvalRequired: true,
      evidence: "Derived from brand style and audience fields.",
      key: "brand_positioning",
      label: "Brand Positioning",
      recommendedValue: `${store.brandStyle}. Built for ${store.audience}.`
    },
    {
      approvalRequired: true,
      evidence: "Production partner and AI disclosure flags are product-level requirements.",
      key: "disclosure_policy",
      label: "Disclosure Policy",
      recommendedValue: "Prepare production partner, AI-assisted design, original-work, shipping, return, and support disclosures before launch."
    },
    {
      approvalRequired: true,
      evidence: "Keeps analytics internal until approved read-only connectors exist.",
      key: "analytics_plan",
      label: "Analytics Plan",
      recommendedValue: "Use manual UTM naming and ENTRAL performance snapshots until read-only analytics scope is approved."
    },
    {
      approvalRequired: true,
      evidence: "Rollback must exist before future connector execution.",
      key: "rollback_owner",
      label: "Rollback Owner",
      recommendedValue: "Assign an internal owner to archive products, hide collections, and stop launch work if review fails."
    }
  ];
}

function credentialScopes(store: RevenueEngineStoreSnapshot, includeCredentialScopes: boolean): RevenueStoreCredentialScope[] {
  if (!includeCredentialScopes) return [];

  const scopes: RevenueStoreCredentialScope[] = [];

  if (store.storePlatform === "Shopify") {
    scopes.push(
      {
        provider: "Shopify",
        reason: "Future draft product and collection handoff requires explicit write scope approval.",
        scope: "write_products",
        status: "Approval required"
      },
      {
        provider: "Shopify",
        reason: "Future verification should read products and collections before writing changes.",
        scope: "read_products",
        status: "Approval required"
      }
    );
  } else if (store.storePlatform === "Etsy") {
    scopes.push(
      {
        provider: "Etsy",
        reason: "Future listing handoff requires explicit listing write scope approval.",
        scope: "listings_w",
        status: "Approval required"
      },
      {
        provider: "Etsy",
        reason: "Future verification should read shop/listing data before writing changes.",
        scope: "listings_r",
        status: "Approval required"
      }
    );
  }

  scopes.push(
    {
      provider: "Printify",
      reason: "POD product payloads require shop and product scope review before provider connector use.",
      scope: "shops:read products:write",
      status: "Approval required"
    },
    {
      provider: "Stripe",
      reason: "Financial Orchestrator must approve read-only revenue reconciliation before payout work exists.",
      scope: "balance.read charges.read",
      status: "Approval required"
    },
    {
      provider: "Analytics",
      reason: "Performance imports stay manual until read-only analytics scope is approved.",
      scope: "read_only_reporting",
      status: "Approval required"
    }
  );

  return scopes;
}

function readinessScore(input: {
  approvedCount: number;
  credentialScopes: number;
  listingReadyCount: number;
  productLaneTargets: RevenueStoreProductLaneTarget[];
  store: RevenueEngineStoreSnapshot;
}) {
  const productScore = Math.min(30, input.approvedCount * 10);
  const listingScore = Math.min(30, input.listingReadyCount * 15);
  const laneScore = input.productLaneTargets.every((lane) => lane.missingProducts === 0) ? 10 : 4;
  const platformScore = input.store.storePlatform === "Shopify" || input.store.storePlatform === "Etsy" ? 8 : 4;
  const credentialScore = input.credentialScopes > 0 ? 8 : 4;
  const statusScore = liveSetupStatuses.has(input.store.launchStatus) ? 10 : 4;

  return clamp(productScore + listingScore + laneScore + platformScore + credentialScore + statusScore, 1, 100);
}

function actionForRunbook(input: {
  approvedCount: number;
  listingReadyCount: number;
  options: RevenueStoreSetupOptions;
  readinessScore: number;
  store: RevenueEngineStoreSnapshot;
}): RevenueStoreSetupAction {
  if (blockedStoreStatuses.has(input.store.launchStatus)) return "hold";
  if (input.approvedCount < input.options.minApprovedProducts) return "hold";
  if (liveSetupStatuses.has(input.store.launchStatus) && input.readinessScore >= input.options.minConnectorReadiness) {
    return "queue_connector_readiness";
  }
  if (input.listingReadyCount >= 1) return "prepare_store_setup";

  return "hold";
}

function reasonForAction(action: RevenueStoreSetupAction, store: RevenueEngineStoreSnapshot, approvedCount: number, listingReadyCount: number, options: RevenueStoreSetupOptions) {
  if (action === "queue_connector_readiness") {
    return `${store.businessName} has enough approved and listing-ready products to prepare connector handoff evidence.`;
  }

  if (action === "prepare_store_setup") {
    return `${store.businessName} has ${approvedCount} approved product${approvedCount === 1 ? "" : "s"} and ${listingReadyCount} listing-ready product${listingReadyCount === 1 ? "" : "s"}; prepare the internal storefront setup runbook.`;
  }

  if (blockedStoreStatuses.has(store.launchStatus)) {
    return `${store.businessName} is ${store.launchStatus.toLowerCase()} and should not receive setup work until reviewed.`;
  }

  return `${store.businessName} needs at least ${options.minApprovedProducts} approved products and one listing-ready product before store setup is useful.`;
}

function setupSteps(input: {
  action: RevenueStoreSetupAction;
  collectionCount: number;
  credentialCount: number;
  laneGaps: number;
  listingReadyCount: number;
  store: RevenueEngineStoreSnapshot;
}): RevenueStoreSetupStep[] {
  return [
    {
      category: "identity",
      checklist: [
        "Confirm store name, support identity, and brand positioning.",
        "Confirm storefront profile copy matches the approved business audience.",
        "Confirm visual style can be applied consistently to thumbnails and collection headers."
      ],
      evidenceRequired: ["Store name approval", "Brand positioning approval"],
      externalExecution: false,
      id: `setup_${input.store.id}_identity`,
      status: "ready",
      title: "Store identity review"
    },
    {
      category: "products",
      checklist: [
        "Confirm approved listing-ready products have title, description, tags, price, and mockup notes.",
        "Route gaps back to listing optimization before future provider handoff.",
        "Confirm disclosure requirements are visible in the launch package."
      ],
      evidenceRequired: ["Approved product list", "Listing optimization result", "Compliance note"],
      externalExecution: false,
      id: `setup_${input.store.id}_products`,
      status: input.listingReadyCount > 0 ? "ready" : "needs_input",
      title: "Product readiness review"
    },
    {
      category: "collections",
      checklist: [
        "Review launch collection and product-type collection blueprints.",
        "Confirm handles, collection titles, and matching rules.",
        "Keep all collections draft/unpublished until final approval."
      ],
      evidenceRequired: ["Collection blueprint approval", "Navigation placement approval"],
      externalExecution: false,
      id: `setup_${input.store.id}_collections`,
      status: input.collectionCount > 0 ? "ready" : "needs_input",
      title: "Collection blueprint review"
    },
    {
      category: "connector",
      checklist: [
        "Review credential scopes before any connector exists.",
        "Confirm credential owner, least-privilege scope, rollback owner, and audit owner.",
        "Do not open provider sessions or send API requests from this runbook."
      ],
      evidenceRequired: ["Credential scope approval", "Rollback owner", "Connector dry-run checklist"],
      externalExecution: false,
      id: `setup_${input.store.id}_connector`,
      status: input.credentialCount > 0 && input.action !== "hold" ? "ready" : "needs_input",
      title: "Connector readiness review"
    },
    {
      category: "rollback",
      checklist: [
        "Prepare manual archive/hide steps for products and collections.",
        "Confirm launch freeze condition and responsible reviewer.",
        "Record audit evidence before any future connector step."
      ],
      evidenceRequired: ["Rollback checklist approval", "Launch freeze owner"],
      externalExecution: false,
      id: `setup_${input.store.id}_rollback`,
      status: input.laneGaps === 0 ? "ready" : "needs_input",
      title: "Rollback and launch freeze"
    }
  ];
}

function recommendedStatus(action: RevenueStoreSetupAction, current: RevenueStoreLaunchStatus): RevenueStoreLaunchStatus {
  if (action === "queue_connector_readiness") return "Awaiting Approval";
  if (action === "prepare_store_setup") return "Building Store";
  return current;
}

function queueItemForRunbook(runbook: RevenueStoreSetupRunbook): RevenueStoreSetupQueueItem | null {
  if (runbook.action === "hold") return null;

  return {
    action: runbook.action,
    externalExecution: false,
    id: `store_setup_${runbook.action}_${runbook.storeId}`,
    priority: runbook.priority,
    storeId: runbook.storeId,
    summary: runbook.reason,
    title: runbook.action === "queue_connector_readiness"
      ? `Queue connector readiness for ${runbook.storeName}`
      : `Prepare store setup runbook for ${runbook.storeName}`
  };
}

export function withRevenueStoreSetupOptions(input: Partial<RevenueStoreSetupOptions> = {}): RevenueStoreSetupOptions {
  return {
    includeCredentialScopes: input.includeCredentialScopes ?? defaultRevenueStoreSetupOptions.includeCredentialScopes,
    maxStores: clamp(Math.round(input.maxStores ?? defaultRevenueStoreSetupOptions.maxStores), 1, 50),
    minApprovedProducts: clamp(Math.round(input.minApprovedProducts ?? defaultRevenueStoreSetupOptions.minApprovedProducts), 1, 50),
    minConnectorReadiness: clamp(input.minConnectorReadiness ?? defaultRevenueStoreSetupOptions.minConnectorReadiness, 0, 100),
    minListingReadyProducts: clamp(Math.round(input.minListingReadyProducts ?? defaultRevenueStoreSetupOptions.minListingReadyProducts), 1, 50)
  };
}

export function buildRevenueStoreSetupPlan(input: {
  generatedAt?: string;
  options?: Partial<RevenueStoreSetupOptions>;
  products: RevenueEngineProductSnapshot[];
  stores: RevenueEngineStoreSnapshot[];
}): RevenueStoreSetupPlan {
  const options = withRevenueStoreSetupOptions(input.options);
  const runbooks = input.stores.map((store) => {
    const products = input.products.filter((product) => product.storeId === store.id);
    const approvedProducts = products.filter(approvedProduct);
    const listingReadyProducts = products.filter(listingReady);
    const targets = laneTargets(store, products, options);
    const collections = collectionBlueprints(store, products);
    const scopes = credentialScopes(store, options.includeCredentialScopes);
    const score = readinessScore({
      approvedCount: approvedProducts.length,
      credentialScopes: scopes.length,
      listingReadyCount: listingReadyProducts.length,
      productLaneTargets: targets,
      store
    });
    const action = actionForRunbook({
      approvedCount: approvedProducts.length,
      listingReadyCount: listingReadyProducts.length,
      options,
      readinessScore: score,
      store
    });
    const reason = reasonForAction(action, store, approvedProducts.length, listingReadyProducts.length, options);
    const laneGaps = targets.reduce((sum, lane) => sum + lane.missingProducts, 0);
    const requiredBeforeConnector = [
      "Approve every storefront setting and collection blueprint.",
      "Approve credential owner, least-privilege scopes, rollback owner, and audit owner.",
      "Confirm provider payload package still matches current listing drafts.",
      "Confirm Financial Orchestrator has not authorized payouts from this module."
    ];

    if (laneGaps > 0) {
      requiredBeforeConnector.unshift("Close product lane gaps or explicitly approve launch with missing lanes.");
    }

    return {
      action,
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason,
        status: action === "hold" ? "Not ready" : "Required"
      },
      collectionBlueprints: collections,
      credentialScopes: scopes,
      externalExecution: false,
      id: `store_setup_runbook_${store.id}`,
      launchReadiness: {
        readyListingProducts: listingReadyProducts.length,
        readyProducts: approvedProducts.length,
        requiredListingProducts: options.minListingReadyProducts,
        status: action === "queue_connector_readiness"
          ? "Connector review ready"
          : action === "prepare_store_setup" ? "Ready for internal setup" : "Needs product/listing work"
      },
      manualConnectorReadiness: {
        requiredBeforeConnector,
        score,
        status: action === "queue_connector_readiness"
          ? "Ready for manual handoff"
          : action === "prepare_store_setup" ? "Needs review" : "Blocked - missing launch inputs"
      },
      priority: action === "queue_connector_readiness" ? 1 : action === "prepare_store_setup" ? 2 : 9,
      productLaneTargets: targets,
      reason,
      recommendedLaunchStatus: recommendedStatus(action, store.launchStatus),
      readinessScore: score,
      setupSteps: setupSteps({
        action,
        collectionCount: collections.length,
        credentialCount: scopes.length,
        laneGaps,
        listingReadyCount: listingReadyProducts.length,
        store
      }),
      storeId: store.id,
      storeName: store.businessName,
      storePlatform: store.storePlatform,
      storefrontSettings: storefrontSettings(store)
    } satisfies RevenueStoreSetupRunbook;
  })
    .sort((a, b) => a.priority - b.priority || b.readinessScore - a.readinessScore)
    .slice(0, options.maxStores);
  const queue = runbooks
    .map(queueItemForRunbook)
    .filter((item): item is RevenueStoreSetupQueueItem => Boolean(item));
  const readyForConnector = runbooks.filter((runbook) => runbook.action === "queue_connector_readiness").length;
  const storesMovingToBuild = runbooks.filter((runbook) => runbook.recommendedLaunchStatus === "Building Store").length;

  return {
    auditEvents: [
      "Store setup runbook generated inside ENTRAL.",
      "Storefront settings, collections, credential scopes, connector readiness, and rollback evidence are internal preparation only.",
      "No marketplace, POD provider, payment provider, analytics provider, browser, or storefront admin was contacted."
    ],
    blockedExternalActions: [
      "Creating or editing Shopify stores, collections, products, pages, themes, or navigation",
      "Creating or editing Etsy shops or listings",
      "Changing Printify or Printful product data",
      "Uploading artwork, mockups, digital files, or theme assets",
      "Connecting payment, banking, payout, analytics, ad, email, or social accounts",
      "Moving money or issuing payouts",
      "Using browser stealth, anti-detection, or platform-evasion automation"
    ],
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Internal Store Setup Runbook",
    options,
    queue,
    runbooks,
    summary: `${input.stores.length} stores evaluated. ${queue.length} store setup runbook${queue.length === 1 ? "" : "s"} queued, ${readyForConnector} ready for connector review, and ${storesMovingToBuild} can move to internal Building Store status.`,
    totals: {
      collectionBlueprints: runbooks.reduce((sum, runbook) => sum + runbook.collectionBlueprints.length, 0),
      credentialScopes: runbooks.reduce((sum, runbook) => sum + runbook.credentialScopes.length, 0),
      readyForConnector,
      runbooksQueued: queue.length,
      storefrontSettings: runbooks.reduce((sum, runbook) => sum + runbook.storefrontSettings.length, 0),
      storesEvaluated: input.stores.length,
      storesMovingToBuild
    }
  };
}
