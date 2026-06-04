import { env } from "../env.js";
import type { MerchProductSnapshot, MerchStoreSnapshot } from "./merchReports.js";

export const shopifyStorefrontDraftConfirmation = "EXECUTE CONTROLLED SHOPIFY STOREFRONT DRAFT";
export const shopifyStorefrontDraftUnlockPhrase = "I APPROVE ENTRAL SHOPIFY DRAFT EXECUTION";

export type ShopifyStorefrontDraftStatus =
  | "credential_blocked"
  | "dry_run"
  | "executed"
  | "failed"
  | "not_applicable"
  | "ready_for_owner_unlock"
  | "ready_to_execute";

export type ShopifyStorefrontDraftActionKind =
  | "create_shopify_collection_draft"
  | "create_shopify_navigation_menu_draft"
  | "create_shopify_page_draft"
  | "upsert_shopify_product_draft";

export type ShopifyStorefrontDraftActionStatus =
  | "blocked"
  | "executed"
  | "failed"
  | "ready"
  | "skipped";

export type ShopifyStorefrontDraftOptions = {
  includeCollections: boolean;
  includeProducts: boolean;
  includeStoreShell: boolean;
  maxProducts: number;
};

export type ShopifyStorefrontDraftCredentials = {
  adminToken?: string | null;
  apiVersion?: string | null;
  shopDomain?: string | null;
};

export type ShopifyStorefrontDraftAction = {
  body: Record<string, unknown>;
  externalExecution: boolean;
  handle: string;
  id: string;
  idempotencyKey: string;
  kind: ShopifyStorefrontDraftActionKind;
  method: "POST";
  mutationName: "collectionCreate" | "menuCreate" | "pageCreate" | "productSet";
  pathTemplate: "/admin/api/{version}/graphql.json";
  provider: "Shopify";
  providerContacted: boolean;
  reason: string;
  result: {
    message: string;
    resourceHandle: string | null;
    resourceId: string | null;
    userErrors: string[];
  } | null;
  status: ShopifyStorefrontDraftActionStatus;
  title: string;
};

export type ShopifyStorefrontLaunchReadiness = {
  failedResourceCount: number;
  nextAutonomousStep:
    | "await_public_launch_approval"
    | "connect_shopify_admin"
    | "owner_unlock_required"
    | "repair_failed_draft_actions"
    | "review_draft_resources"
    | "run_shopify_draft_executor"
    | "skip_non_shopify_store";
  readyResourceCount: number;
  remainingApprovals: string[];
  reviewResources: Array<{
    adminUrl: string | null;
    handle: string;
    kind: ShopifyStorefrontDraftActionKind;
    resourceId: string;
    status: "executed" | "skipped";
    title: string;
  }>;
  rollbackChecklist: string[];
  status:
    | "blocked_by_failures"
    | "not_started"
    | "ready_for_review"
    | "waiting_connection"
    | "waiting_owner_unlock";
  summary: string;
};

export type ShopifyStorefrontDraftPlan = {
  actualExternalActionsExecuted: boolean;
  auditEvents: string[];
  blockedExternalActions: string[];
  credentialReadiness: {
    apiVersion: string;
    credentialRefs: string[];
    missingEnvVars: string[];
    shopDomain: string | null;
    status: "invalid_domain" | "missing_credentials" | "ready";
  };
  externalExecution: boolean;
  generatedAt: string;
  guardrails: string[];
  launchReadiness: ShopifyStorefrontLaunchReadiness;
  mode: "Controlled Shopify Storefront Draft Executor";
  ownerUnlock: {
    connectorApproval: boolean;
    externalExecution: boolean;
    phraseAccepted: boolean;
    providerContacted: boolean;
    status: "accepted" | "not_requested" | "waiting_owner";
  };
  providerContacted: boolean;
  providerContactedDomain: string | null;
  shopifyAdminUrl: string | null;
  sourceStore: {
    businessName: string;
    storePlatform: string;
  };
  status: ShopifyStorefrontDraftStatus;
  storefrontActions: ShopifyStorefrontDraftAction[];
  summary: string;
  totals: {
    blockedActions: number;
    collections: number;
    executedActions: number;
    failedActions: number;
    navigationMenus: number;
    pages: number;
    products: number;
    readyActions: number;
    skippedActions: number;
    storeShellActions: number;
  };
};

export type ShopifyConnectorState = {
  apiVersion: string;
  missingEnvVars: string[];
  readOnly: false;
  status: "Connected" | "Missing Credentials";
  writeActionsEnabled: boolean;
};

export type ShopifyFetch = (
  input: string,
  init: {
    body: string;
    headers: Record<string, string>;
    method: "POST";
  }
) => Promise<{
  json: () => Promise<unknown>;
  ok: boolean;
  status: number;
  text?: () => Promise<string>;
}>;

const defaultOptions: ShopifyStorefrontDraftOptions = {
  includeCollections: true,
  includeProducts: true,
  includeStoreShell: true,
  maxProducts: 5
};

const defaultApiVersion = "2026-04";

const productSetMutation = `
mutation EntralUpsertProductByHandle($input: ProductSetInput!, $identifier: ProductSetIdentifiers) {
  productSet(input: $input, identifier: $identifier, synchronous: true) {
    product {
      id
      title
      handle
      status
      variants(first: 5) {
        nodes {
          id
          price
          title
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}`;

const collectionCreateMutation = `
mutation EntralCreateCollection($input: CollectionInput!) {
  collectionCreate(input: $input) {
    collection {
      id
      title
      handle
    }
    userErrors {
      field
      message
    }
  }
}`;

const pageCreateMutation = `
mutation EntralCreatePage($page: PageCreateInput!) {
  pageCreate(page: $page) {
    page {
      id
      title
      handle
      isPublished
    }
    userErrors {
      field
      message
    }
  }
}`;

const menuCreateMutation = `
mutation EntralCreateMenu($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) {
  menuCreate(title: $title, handle: $handle, items: $items) {
    menu {
      id
      title
      handle
      items {
        id
        title
        type
      }
    }
    userErrors {
      field
      message
    }
  }
}`;

const collectionByIdentifierQuery = `
query EntralCollectionByHandle($identifier: CollectionIdentifierInput!) {
  collectionByIdentifier(identifier: $identifier) {
    id
    title
    handle
  }
}`;

const pageByHandleQuery = `
query EntralPageByHandle($query: String!) {
  pages(first: 1, query: $query) {
    nodes {
      id
      title
      handle
      isPublished
    }
  }
}`;

const menusQuery = `
query EntralMenus {
  menus(first: 100) {
    nodes {
      id
      title
      handle
    }
  }
}`;

const connectionVerificationQuery = `
query EntralVerifyShopifyConnection {
  shop {
    id
    name
    myshopifyDomain
  }
  currentAppInstallation {
    accessScopes {
      handle
    }
  }
}`;

const shopifyDraftRequiredScopes = [
  "read_products",
  "write_products",
  "read_online_store_pages",
  "write_online_store_pages",
  "read_online_store_navigation",
  "write_online_store_navigation"
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function withOptions(options: Partial<ShopifyStorefrontDraftOptions> = {}): ShopifyStorefrontDraftOptions {
  return {
    includeCollections: options.includeCollections ?? defaultOptions.includeCollections,
    includeProducts: options.includeProducts ?? defaultOptions.includeProducts,
    includeStoreShell: options.includeStoreShell ?? defaultOptions.includeStoreShell,
    maxProducts: clamp(Math.round(options.maxProducts ?? defaultOptions.maxProducts), 1, 25)
  };
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "shopify";
}

function money(value: number) {
  return Math.max(0, Math.round(value * 100) / 100);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeShopDomain(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) return null;

  const domain = trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain) ? domain : null;
}

function apiVersion(credentials?: ShopifyStorefrontDraftCredentials) {
  return credentials?.apiVersion?.trim() || env.SHOPIFY_API_VERSION || defaultApiVersion;
}

function credentialsWithDefaults(credentials?: ShopifyStorefrontDraftCredentials) {
  return {
    adminToken: credentials?.adminToken ?? env.SHOPIFY_CONNECTOR_ADMIN_TOKEN,
    apiVersion: apiVersion(credentials),
    shopDomain: normalizeShopDomain(credentials?.shopDomain ?? env.SHOPIFY_STORE_DOMAIN)
  };
}

export function getShopifyConnectorState(credentials?: ShopifyStorefrontDraftCredentials): ShopifyConnectorState {
  const resolved = credentialsWithDefaults(credentials);
  const missingEnvVars = [
    resolved.shopDomain ? "" : "SHOPIFY_STORE_DOMAIN",
    resolved.adminToken ? "" : "SHOPIFY_CONNECTOR_ADMIN_TOKEN"
  ].filter(Boolean);

  return {
    apiVersion: resolved.apiVersion,
    missingEnvVars,
    readOnly: false,
    status: missingEnvVars.length > 0 ? "Missing Credentials" : "Connected",
    writeActionsEnabled: missingEnvVars.length === 0
  };
}

function selectedProducts(products: MerchProductSnapshot[], options: ShopifyStorefrontDraftOptions) {
  if (!options.includeProducts) return [];

  return products
    .filter((product) => product.status === "Approved" || product.status === "Published")
    .filter((product) => product.listingTitle || product.productName)
    .slice(0, options.maxProducts);
}

function productHandle(storeId: string, product: MerchProductSnapshot) {
  return `entral-${slug(storeId)}-${slug(product.listingTitle ?? product.productName)}`;
}

function productInput(store: MerchStoreSnapshot, storeId: string, product: MerchProductSnapshot) {
  const handle = productHandle(storeId, product);
  const tags = unique([
    "entral",
    "draft",
    store.businessName,
    store.industry,
    product.productType,
    ...product.tags
  ]).slice(0, 40);

  return {
    handle,
    productSet: {
      descriptionHtml: product.listingDescription ?? `${product.productName} for ${store.audience}.`,
      handle,
      productOptions: [{
        name: "Title",
        position: 1,
        values: [{ name: "Default Title" }]
      }],
      productType: product.productType,
      status: "DRAFT",
      tags,
      title: product.listingTitle ?? product.productName,
      variants: [{
        optionValues: [{
          name: "Default Title",
          optionName: "Title"
        }],
        price: money(product.retailPrice)
      }],
      vendor: store.businessName
    }
  };
}

function productAction(input: {
  product: MerchProductSnapshot;
  store: MerchStoreSnapshot;
  storeId: string;
}): ShopifyStorefrontDraftAction {
  const payload = productInput(input.store, input.storeId, input.product);

  return {
    body: {
      query: productSetMutation,
      variables: {
        identifier: { handle: payload.handle },
        input: payload.productSet
      }
    },
    externalExecution: false,
    handle: payload.handle,
    id: `shopify_product_${slug(input.storeId)}_${slug(input.product.productName)}`,
    idempotencyKey: `entral:shopify:${input.storeId}:product:${payload.handle}`,
    kind: "upsert_shopify_product_draft",
    method: "POST",
    mutationName: "productSet",
    pathTemplate: "/admin/api/{version}/graphql.json",
    provider: "Shopify",
    providerContacted: false,
    reason: "Upsert an approved ENTRAL product into Shopify as a draft product using productSet by handle.",
    result: null,
    status: "ready",
    title: `Upsert Shopify draft product: ${input.product.listingTitle ?? input.product.productName}`
  };
}

function collectionHandle(storeId: string, store: MerchStoreSnapshot) {
  return `entral-${slug(storeId)}-launch`;
}

function collectionAction(input: {
  productCount: number;
  store: MerchStoreSnapshot;
  storeId: string;
}): ShopifyStorefrontDraftAction {
  const handle = collectionHandle(input.storeId, input.store);

  return {
    body: {
      query: collectionCreateMutation,
      variables: {
        input: {
          descriptionHtml: `${input.store.businessName} launch collection prepared by ENTRAL for ${input.store.audience}.`,
          handle,
          title: `${input.store.businessName} Launch Collection`
        }
      }
    },
    externalExecution: false,
    handle,
    id: `shopify_collection_${slug(input.storeId)}_launch`,
    idempotencyKey: `entral:shopify:${input.storeId}:collection:${handle}`,
    kind: "create_shopify_collection_draft",
    method: "POST",
    mutationName: "collectionCreate",
    pathTemplate: "/admin/api/{version}/graphql.json",
    provider: "Shopify",
    providerContacted: false,
    reason: `Create an unpublished Shopify collection shell for ${input.productCount} approved ENTRAL product draft${input.productCount === 1 ? "" : "s"}.`,
    result: null,
    status: "ready",
    title: `Create Shopify draft collection: ${input.store.businessName} Launch Collection`
  };
}

function pageHandle(storeId: string, key: string) {
  return `entral-${slug(storeId)}-${key}`;
}

function menuHandle(storeId: string) {
  return `entral-${slug(storeId)}-launch-menu`;
}

function storeShellPageSpecs(store: MerchStoreSnapshot, storeId: string) {
  const businessName = escapeHtml(store.businessName);
  const audience = escapeHtml(store.audience);
  const brandStyle = escapeHtml(store.brandStyle);
  const industry = escapeHtml(store.industry);
  const productTypes = store.productTypes.map(escapeHtml).slice(0, 8);

  return [{
    body: [
      `<p>${businessName} is building a focused ${industry} storefront for ${audience}.</p>`,
      `<p>Brand direction: ${brandStyle}</p>`,
      productTypes.length > 0 ? `<p>Launch product focus: ${productTypes.join(", ")}.</p>` : "",
      "<p>This page is prepared by ENTRAL in unpublished draft mode for owner review before public launch.</p>"
    ].filter(Boolean).join("\n"),
    handle: pageHandle(storeId, "about"),
    key: "about",
    title: `About ${store.businessName}`
  }, {
    body: [
      `<p>${businessName} shipping, returns, and production timing notes are staged here for owner review.</p>`,
      "<p>Publish this page only after supplier shipping windows, return rules, production partner disclosures, and customer support ownership are confirmed.</p>",
      "<p>This page is prepared by ENTRAL in unpublished draft mode.</p>"
    ].join("\n"),
    handle: pageHandle(storeId, "shipping-returns"),
    key: "shipping-returns",
    title: "Shipping and Returns"
  }, {
    body: [
      `<p>Use this page to stage customer contact details for ${businessName}.</p>`,
      "<p>Publish only after the support inbox, response expectations, and fulfillment escalation path are approved.</p>",
      "<p>This page is prepared by ENTRAL in unpublished draft mode.</p>"
    ].join("\n"),
    handle: pageHandle(storeId, "contact"),
    key: "contact",
    title: "Contact"
  }];
}

function pageAction(input: {
  page: ReturnType<typeof storeShellPageSpecs>[number];
  storeId: string;
}): ShopifyStorefrontDraftAction {
  return {
    body: {
      query: pageCreateMutation,
      variables: {
        page: {
          body: input.page.body,
          handle: input.page.handle,
          isPublished: false,
          title: input.page.title
        }
      }
    },
    externalExecution: false,
    handle: input.page.handle,
    id: `shopify_page_${slug(input.storeId)}_${slug(input.page.key)}`,
    idempotencyKey: `entral:shopify:${input.storeId}:page:${input.page.handle}`,
    kind: "create_shopify_page_draft",
    method: "POST",
    mutationName: "pageCreate",
    pathTemplate: "/admin/api/{version}/graphql.json",
    provider: "Shopify",
    providerContacted: false,
    reason: "Create an unpublished Shopify online store page shell for owner review before public launch.",
    result: null,
    status: "ready",
    title: `Create Shopify unpublished page: ${input.page.title}`
  };
}

type MenuResourceRefs = {
  collectionId: string | null;
  pageIdsByHandle: Record<string, string>;
};

function menuVariables(input: {
  resourceRefs?: MenuResourceRefs;
  store: MerchStoreSnapshot;
  storeId: string;
}) {
  const collection = collectionHandle(input.storeId, input.store);
  const pages = storeShellPageSpecs(input.store, input.storeId);
  const pageItem = (title: string, handle: string) => {
    const resourceId = input.resourceRefs?.pageIdsByHandle[handle] ?? null;

    return resourceId
      ? {
        items: [],
        resourceId,
        title,
        type: "PAGE",
        url: `/pages/${handle}`
      }
      : {
        items: [],
        title,
        type: "HTTP",
        url: `/pages/${handle}`
      };
  };
  const collectionItem = input.resourceRefs?.collectionId
    ? {
      items: [],
      resourceId: input.resourceRefs.collectionId,
      title: "Launch Collection",
      type: "COLLECTION",
      url: `/collections/${collection}`
    }
    : {
      items: [],
      title: "Launch Collection",
      type: "HTTP",
      url: `/collections/${collection}`
    };

  return {
    handle: menuHandle(input.storeId),
    items: [
      {
        items: [],
        title: "Shop All",
        type: "CATALOG",
        url: "/collections/all"
      },
      collectionItem,
      pageItem(`About ${input.store.businessName}`, pages[0]!.handle),
      pageItem("Shipping and Returns", pages[1]!.handle),
      pageItem("Contact", pages[2]!.handle)
    ],
    title: `${input.store.businessName} Draft Launch Menu`
  };
}

function menuAction(input: {
  resourceRefs?: MenuResourceRefs;
  store: MerchStoreSnapshot;
  storeId: string;
}): ShopifyStorefrontDraftAction {
  const variables = menuVariables(input);

  return {
    body: {
      query: menuCreateMutation,
      variables
    },
    externalExecution: false,
    handle: variables.handle,
    id: `shopify_menu_${slug(input.storeId)}_launch`,
    idempotencyKey: `entral:shopify:${input.storeId}:menu:${variables.handle}`,
    kind: "create_shopify_navigation_menu_draft",
    method: "POST",
    mutationName: "menuCreate",
    pathTemplate: "/admin/api/{version}/graphql.json",
    provider: "Shopify",
    providerContacted: false,
    reason: "Create a Shopify navigation menu shell that is not attached to the theme until separate public launch approval.",
    result: null,
    status: "ready",
    title: `Create Shopify draft navigation menu: ${variables.title}`
  };
}

function actionTotals(actions: ShopifyStorefrontDraftAction[]) {
  return {
    blockedActions: actions.filter((action) => action.status === "blocked").length,
    collections: actions.filter((action) => action.kind === "create_shopify_collection_draft").length,
    executedActions: actions.filter((action) => action.status === "executed").length,
    failedActions: actions.filter((action) => action.status === "failed").length,
    navigationMenus: actions.filter((action) => action.kind === "create_shopify_navigation_menu_draft").length,
    pages: actions.filter((action) => action.kind === "create_shopify_page_draft").length,
    products: actions.filter((action) => action.kind === "upsert_shopify_product_draft").length,
    readyActions: actions.filter((action) => action.status === "ready").length,
    skippedActions: actions.filter((action) => action.status === "skipped").length,
    storeShellActions: actions.filter((action) => (
      action.kind === "create_shopify_navigation_menu_draft"
      || action.kind === "create_shopify_page_draft"
    )).length
  };
}

function shopifyResourceAdminUrl(input: {
  action: ShopifyStorefrontDraftAction;
  shopifyAdminUrl: string | null;
}) {
  if (!input.shopifyAdminUrl || !input.action.result?.resourceId) return null;

  if (input.action.kind === "create_shopify_navigation_menu_draft") {
    return `${input.shopifyAdminUrl}/online_store/navigation`;
  }

  const resourceId = input.action.result.resourceId.split("/").filter(Boolean).pop();
  if (!resourceId) return input.shopifyAdminUrl;

  const encodedId = encodeURIComponent(resourceId);

  if (input.action.kind === "upsert_shopify_product_draft") {
    return `${input.shopifyAdminUrl}/products/${encodedId}`;
  }

  if (input.action.kind === "create_shopify_collection_draft") {
    return `${input.shopifyAdminUrl}/collections/${encodedId}`;
  }

  if (input.action.kind === "create_shopify_page_draft") {
    return `${input.shopifyAdminUrl}/pages/${encodedId}`;
  }

  return input.shopifyAdminUrl;
}

function buildLaunchReadiness(input: {
  actions: ShopifyStorefrontDraftAction[];
  shopifyAdminUrl: string | null;
  status: ShopifyStorefrontDraftStatus;
  store: MerchStoreSnapshot;
}): ShopifyStorefrontLaunchReadiness {
  const totals = actionTotals(input.actions);
  const reviewResources = input.actions
    .filter((action): action is ShopifyStorefrontDraftAction & {
      result: NonNullable<ShopifyStorefrontDraftAction["result"]>;
      status: "executed" | "skipped";
    } => (
      (action.status === "executed" || action.status === "skipped")
      && Boolean(action.result?.resourceId)
    ))
    .map((action) => ({
      adminUrl: shopifyResourceAdminUrl({ action, shopifyAdminUrl: input.shopifyAdminUrl }),
      handle: action.result.resourceHandle ?? action.handle,
      kind: action.kind,
      resourceId: action.result.resourceId ?? "",
      status: action.status,
      title: action.title
    }));
  const baseRemainingApprovals = [
    "Owner review of every created or skipped Shopify draft resource",
    "Separate public launch approval before publishing products, collections, pages, or navigation",
    "Payment, payout, billing, tax, shipping, domain, legal policy, supplier charge, and ad spend approval outside this executor"
  ];
  const rollbackChecklist = [
    "Keep all generated Shopify products in draft status until public launch approval is recorded.",
    "Keep generated collections unpublished and remove them from sales channels if a retry or rollback is needed.",
    "Keep generated pages unpublished; delete or revise the drafted page shells before launch if copy, policy, or brand review fails.",
    "Leave generated navigation unattached to the active theme until public launch approval; remove the draft menu if the store shell is rejected.",
    "Use the recorded Shopify resource IDs and handles in this receipt before retrying so duplicate draft resources are skipped instead of recreated."
  ];

  if (input.status === "not_applicable") {
    return {
      failedResourceCount: totals.failedActions,
      nextAutonomousStep: "skip_non_shopify_store",
      readyResourceCount: reviewResources.length,
      remainingApprovals: [],
      reviewResources,
      rollbackChecklist: [],
      status: "not_started",
      summary: `${input.store.businessName} is not a Shopify store, so no Shopify launch-readiness receipt was created.`
    };
  }

  if (input.status === "credential_blocked") {
    return {
      failedResourceCount: totals.failedActions,
      nextAutonomousStep: "connect_shopify_admin",
      readyResourceCount: reviewResources.length,
      remainingApprovals: [
        "Connect and verify Shopify Admin API credentials before draft resources can be created.",
        ...baseRemainingApprovals
      ],
      reviewResources,
      rollbackChecklist,
      status: "waiting_connection",
      summary: `${input.store.businessName} Shopify launch readiness is waiting for a verified Admin API connection.`
    };
  }

  if (input.status === "ready_for_owner_unlock") {
    return {
      failedResourceCount: totals.failedActions,
      nextAutonomousStep: "owner_unlock_required",
      readyResourceCount: reviewResources.length,
      remainingApprovals: [
        "Connector approval and the exact Shopify draft owner phrase are required before draft resources can be created.",
        ...baseRemainingApprovals
      ],
      reviewResources,
      rollbackChecklist,
      status: "waiting_owner_unlock",
      summary: `${input.store.businessName} Shopify launch readiness is waiting for owner unlock before draft resources can be created.`
    };
  }

  if (input.status === "failed") {
    return {
      failedResourceCount: totals.failedActions,
      nextAutonomousStep: "repair_failed_draft_actions",
      readyResourceCount: reviewResources.length,
      remainingApprovals: [
        "Repair failed Shopify draft actions and rerun before public launch review.",
        ...baseRemainingApprovals
      ],
      reviewResources,
      rollbackChecklist,
      status: "blocked_by_failures",
      summary: `${input.store.businessName} Shopify launch readiness is blocked by ${totals.failedActions} failed draft action${totals.failedActions === 1 ? "" : "s"}.`
    };
  }

  if (input.status === "executed") {
    return {
      failedResourceCount: totals.failedActions,
      nextAutonomousStep: "review_draft_resources",
      readyResourceCount: reviewResources.length,
      remainingApprovals: baseRemainingApprovals,
      reviewResources,
      rollbackChecklist,
      status: "ready_for_review",
      summary: `${input.store.businessName} has ${reviewResources.length} Shopify draft resource${reviewResources.length === 1 ? "" : "s"} ready for owner review; public launch remains locked.`
    };
  }

  return {
    failedResourceCount: totals.failedActions,
    nextAutonomousStep: "run_shopify_draft_executor",
    readyResourceCount: reviewResources.length,
    remainingApprovals: [
      "Run the controlled Shopify draft executor before launch review can begin.",
      ...baseRemainingApprovals
    ],
    reviewResources,
    rollbackChecklist,
    status: "not_started",
    summary: `${input.store.businessName} Shopify launch readiness has not started; ${input.actions.length} draft action${input.actions.length === 1 ? "" : "s"} are planned.`
  };
}

function statusFor(input: {
  connectorApproval: boolean;
  credentials: ReturnType<typeof credentialsWithDefaults>;
  dryRun: boolean;
  hasActions: boolean;
  phraseAccepted: boolean;
  store: MerchStoreSnapshot;
}) {
  if (input.store.storePlatform !== "Shopify") return "not_applicable" satisfies ShopifyStorefrontDraftStatus;
  if (!input.hasActions) return "not_applicable" satisfies ShopifyStorefrontDraftStatus;
  if (input.dryRun) return "dry_run" satisfies ShopifyStorefrontDraftStatus;
  if (!input.connectorApproval || !input.phraseAccepted) return "ready_for_owner_unlock" satisfies ShopifyStorefrontDraftStatus;
  if (!input.credentials.shopDomain || !input.credentials.adminToken) return "credential_blocked" satisfies ShopifyStorefrontDraftStatus;

  return "ready_to_execute" satisfies ShopifyStorefrontDraftStatus;
}

export function buildShopifyStorefrontDraftPlan(input: {
  connectorApproval?: boolean;
  credentials?: ShopifyStorefrontDraftCredentials;
  dryRun?: boolean;
  generatedAt?: string;
  liveUnlockPhrase?: string | null;
  options?: Partial<ShopifyStorefrontDraftOptions>;
  products: MerchProductSnapshot[];
  store: MerchStoreSnapshot;
  storeId: string;
}): ShopifyStorefrontDraftPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const options = withOptions(input.options);
  const dryRun = input.dryRun ?? true;
  const connectorApproval = input.connectorApproval ?? false;
  const phraseAccepted = input.liveUnlockPhrase === shopifyStorefrontDraftUnlockPhrase;
  const credentials = credentialsWithDefaults(input.credentials);
  const approvedProducts = selectedProducts(input.products, options);
  const storeShellActions = options.includeStoreShell
    ? [
      ...storeShellPageSpecs(input.store, input.storeId).map((page) => pageAction({
        page,
        storeId: input.storeId
      })),
      menuAction({
        store: input.store,
        storeId: input.storeId
      })
    ]
    : [];
  const actions = [
    ...approvedProducts.map((product) => productAction({
      product,
      store: input.store,
      storeId: input.storeId
    })),
    ...(options.includeCollections && approvedProducts.length > 0 ? [collectionAction({
      productCount: approvedProducts.length,
      store: input.store,
      storeId: input.storeId
    })] : []),
    ...storeShellActions
  ];
  const status = statusFor({
    connectorApproval,
    credentials,
    dryRun,
    hasActions: actions.length > 0,
    phraseAccepted,
    store: input.store
  });
  const missingEnvVars = [
    credentials.shopDomain ? "" : "SHOPIFY_STORE_DOMAIN",
    credentials.adminToken ? "" : "SHOPIFY_CONNECTOR_ADMIN_TOKEN"
  ].filter(Boolean);
  const credentialStatus = missingEnvVars.length > 0
    ? "missing_credentials"
    : credentials.shopDomain ? "ready" : "invalid_domain";
  const totals = actionTotals(actions);
  const shopifyAdminUrl = credentials.shopDomain ? `https://${credentials.shopDomain}/admin` : null;

  return {
    actualExternalActionsExecuted: false,
    auditEvents: [
      "Controlled Shopify storefront draft executor prepared a provider-specific draft plan.",
      "Dry-run and blocked plans do not contact Shopify.",
      "Live mode can upsert draft products, create unpublished pages, create an unattached draft navigation menu, and create unpublished collections only after owner unlock and backend credentials are present."
    ],
    blockedExternalActions: [
      "Provisioning a brand-new Shopify account, organization store, paid plan, billing record, payment processor, tax profile, bank account, payout setting, domain purchase, app charge, or ad spend action",
      "Publishing products, collections, pages, policies, or theme navigation to public sales channels without separate public launch approval",
      "Creating or updating legal policies, shipping settings, taxes, markets, checkout settings, theme templates, or customer-facing support commitments without owner review",
      "Uploading unapproved artwork, changing themes, opening provider admin browser sessions, using stealth/proxy/fingerprint automation, or bypassing Shopify account protections",
      "Sending any Shopify request when dryRun=true, credentials are missing, the connector approval is false, or the exact owner unlock phrase is absent"
    ],
    credentialReadiness: {
      apiVersion: credentials.apiVersion,
      credentialRefs: ["SHOPIFY_STORE_DOMAIN", "SHOPIFY_CONNECTOR_ADMIN_TOKEN", "SHOPIFY_API_VERSION"],
      missingEnvVars,
      shopDomain: credentials.shopDomain,
      status: credentialStatus
    },
    externalExecution: false,
    generatedAt,
    guardrails: [
      "Use Shopify GraphQL Admin API productSet by handle for draft product idempotency.",
      "Keep products in draft status and collections unpublished.",
      "Create store pages as unpublished drafts and leave generated navigation unattached to the theme until launch approval.",
      "Never execute payment, billing, plan, domain, payout, tax, ad spend, or public publish actions from this executor.",
      "Record Shopify resource IDs returned by the API before any later launch or rollback review."
    ],
    launchReadiness: buildLaunchReadiness({
      actions,
      shopifyAdminUrl,
      status,
      store: input.store
    }),
    mode: "Controlled Shopify Storefront Draft Executor",
    ownerUnlock: {
      connectorApproval,
      externalExecution: false,
      phraseAccepted,
      providerContacted: false,
      status: dryRun ? "not_requested" : connectorApproval && phraseAccepted ? "accepted" : "waiting_owner"
    },
    providerContacted: false,
    providerContactedDomain: null,
    shopifyAdminUrl,
    sourceStore: {
      businessName: input.store.businessName,
      storePlatform: input.store.storePlatform
    },
    status,
    storefrontActions: actions,
    summary: summaryFor({
      actionCount: actions.length,
      products: approvedProducts.length,
      storeShellActions: storeShellActions.length,
      status,
      store: input.store
    }),
    totals
  };
}

function summaryFor(input: {
  actionCount: number;
  products: number;
  storeShellActions: number;
  status: ShopifyStorefrontDraftStatus;
  store: MerchStoreSnapshot;
}) {
  if (input.store.storePlatform !== "Shopify") {
    return `${input.store.businessName} is configured for ${input.store.storePlatform}, so the Shopify storefront draft executor is not applicable.`;
  }

  if (input.actionCount === 0) {
    return `${input.store.businessName} has no approved products or store-shell drafts ready for a Shopify draft storefront run.`;
  }

  if (input.status === "dry_run") {
    return `${input.actionCount} Shopify draft action${input.actionCount === 1 ? "" : "s"} planned for ${input.store.businessName}: ${input.products} approved product${input.products === 1 ? "" : "s"} and ${input.storeShellActions} store-shell action${input.storeShellActions === 1 ? "" : "s"}. No Shopify request was sent.`;
  }

  if (input.status === "ready_for_owner_unlock") {
    return `${input.store.businessName} is ready for controlled Shopify draft execution, but owner unlock gates are incomplete.`;
  }

  if (input.status === "credential_blocked") {
    return `${input.store.businessName} has owner unlock approval, but Shopify credentials are missing from the backend environment.`;
  }

  if (input.status === "ready_to_execute") {
    return `${input.store.businessName} is ready to execute ${input.actionCount} Shopify draft action${input.actionCount === 1 ? "" : "s"} against the connected shop.`;
  }

  return `${input.store.businessName} Shopify draft executor status is ${input.status.replace(/_/g, " ")}.`;
}

function resultFromGraphql(payload: unknown, mutationName: ShopifyStorefrontDraftAction["mutationName"]) {
  if (!payload || typeof payload !== "object") {
    return {
      errors: ["Shopify returned an unreadable GraphQL response."],
      handle: null,
      id: null
    };
  }

  const root = payload as Record<string, unknown>;
  const graphqlErrors = Array.isArray(root.errors)
    ? root.errors.map((error) => (
      error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "Shopify GraphQL error."
    ))
    : [];
  const data = root.data && typeof root.data === "object" ? root.data as Record<string, unknown> : {};
  const node = data[mutationName] && typeof data[mutationName] === "object"
    ? data[mutationName] as Record<string, unknown>
    : {};
  const userErrors = Array.isArray(node.userErrors)
    ? node.userErrors.map((error) => {
      if (!error || typeof error !== "object") return "Shopify user error.";
      const candidate = error as Record<string, unknown>;
      const field = Array.isArray(candidate.field) ? candidate.field.join(".") : "";
      const message = candidate.message ? String(candidate.message) : "Shopify user error.";

      return field ? `${field}: ${message}` : message;
    })
    : [];
  const resourceKeyByMutation: Record<ShopifyStorefrontDraftAction["mutationName"], string> = {
    collectionCreate: "collection",
    menuCreate: "menu",
    pageCreate: "page",
    productSet: "product"
  };
  const resourceKey = resourceKeyByMutation[mutationName];
  const resource = node[resourceKey] && typeof node[resourceKey] === "object"
    ? node[resourceKey] as Record<string, unknown>
    : null;

  return {
    errors: [...graphqlErrors, ...userErrors],
    handle: resource?.handle ? String(resource.handle) : null,
    id: resource?.id ? String(resource.id) : null
  };
}

function resourceRefsFromActions(actions: ShopifyStorefrontDraftAction[]): MenuResourceRefs {
  return actions.reduce<MenuResourceRefs>((refs, action) => {
    if (!["executed", "skipped"].includes(action.status) || !action.result?.resourceId) return refs;

    if (action.kind === "create_shopify_collection_draft") {
      refs.collectionId = action.result.resourceId;
    }

    if (action.kind === "create_shopify_page_draft" && action.result.resourceHandle) {
      refs.pageIdsByHandle[action.result.resourceHandle] = action.result.resourceId;
    }

    return refs;
  }, {
    collectionId: null,
    pageIdsByHandle: {}
  });
}

type ShopifyLookupResource = {
  handle: string | null;
  id: string;
  title: string | null;
};

function recordFrom(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function parseGraphqlErrors(payload: unknown) {
  const root = recordFrom(payload);

  if (!root || !Array.isArray(root.errors)) return [];

  return root.errors.map((error) => (
    error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "Shopify GraphQL error."
  ));
}

function lookupResourceFromNode(value: unknown): ShopifyLookupResource | null {
  const node = recordFrom(value);
  const id = node?.id ? String(node.id) : null;

  if (!id) return null;

  return {
    handle: node?.handle ? String(node.handle) : null,
    id,
    title: node?.title ? String(node.title) : null
  };
}

function firstLookupResourceFromConnection(value: unknown, expectedHandle: string): ShopifyLookupResource | null {
  const connection = recordFrom(value);
  const nodes = Array.isArray(connection?.nodes) ? connection.nodes : [];

  return nodes
    .map(lookupResourceFromNode)
    .find((resource): resource is ShopifyLookupResource => Boolean(resource && resource.handle === expectedHandle)) ?? null;
}

function hydrateMenuAction(input: {
  action: ShopifyStorefrontDraftAction;
  completedActions: ShopifyStorefrontDraftAction[];
  store: MerchStoreSnapshot;
  storeId: string;
}) {
  if (input.action.kind !== "create_shopify_navigation_menu_draft") return input.action;

  return menuAction({
    resourceRefs: resourceRefsFromActions(input.completedActions),
    store: input.store,
    storeId: input.storeId
  });
}

async function callShopifyGraphql(input: {
  body: Record<string, unknown>;
  credentials: ReturnType<typeof credentialsWithDefaults>;
  fetcher: ShopifyFetch;
  idempotencyKey?: string;
}) {
  const url = `https://${input.credentials.shopDomain}/admin/api/${input.credentials.apiVersion}/graphql.json`;
  const response = await input.fetcher(url, {
    body: JSON.stringify(input.body),
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": input.credentials.adminToken ?? "",
      ...(input.idempotencyKey ? { "X-Entral-Idempotency-Key": input.idempotencyKey } : {})
    },
    method: "POST"
  });
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    payload = response.text ? await response.text() : null;
  }

  return {
    ok: response.ok,
    payload,
    status: response.status
  };
}

function accessScopesFromPayload(payload: unknown) {
  const installation = recordFrom(recordFrom(recordFrom(payload)?.data)?.currentAppInstallation);

  return Array.isArray(installation?.accessScopes)
    ? installation.accessScopes.map((scope) => recordFrom(scope)?.handle).filter((scope): scope is string => typeof scope === "string")
    : [];
}

function shopDomainFromPayload(payload: unknown) {
  const shop = recordFrom(recordFrom(recordFrom(payload)?.data)?.shop);

  return shop?.myshopifyDomain ? normalizeShopDomain(String(shop.myshopifyDomain)) : null;
}

function shouldVerifyResolvedCredentials(inputCredentials?: ShopifyStorefrontDraftCredentials) {
  return !inputCredentials?.adminToken?.trim() || !inputCredentials.shopDomain?.trim();
}

async function verifyResolvedCredentialsBeforeExecution(input: {
  credentials: ReturnType<typeof credentialsWithDefaults>;
  fetcher: ShopifyFetch;
}) {
  const response = await callShopifyGraphql({
    body: {
      query: connectionVerificationQuery
    },
    credentials: input.credentials,
    fetcher: input.fetcher,
    idempotencyKey: `entral:shopify:${input.credentials.shopDomain}:env-connection-verification`
  });

  if (!response.ok) {
    return {
      errors: [typeof response.payload === "string" ? stripHtml(response.payload).slice(0, 300) : `Shopify returned HTTP ${response.status}.`],
      grantedScopes: [] as string[],
      status: "failed" as const
    };
  }

  const errors = parseGraphqlErrors(response.payload);
  const actualShopDomain = shopDomainFromPayload(response.payload);
  const grantedScopes = accessScopesFromPayload(response.payload);
  const missingScopes = shopifyDraftRequiredScopes.filter((scope) => !grantedScopes.includes(scope));

  if (!actualShopDomain) {
    errors.push("Shopify verification did not return a shop domain.");
  } else if (actualShopDomain !== input.credentials.shopDomain) {
    errors.push(`Shopify token belongs to ${actualShopDomain}, not ${input.credentials.shopDomain}.`);
  }

  if (missingScopes.length > 0) {
    errors.push(`Shopify token is missing required scopes: ${missingScopes.join(", ")}.`);
  }

  return {
    errors,
    grantedScopes,
    status: errors.length > 0 ? "failed" as const : "verified" as const
  };
}

function failedVerificationActions(input: {
  actions: ShopifyStorefrontDraftAction[];
  message: string;
}) {
  return input.actions.map((action) => action.status === "ready"
    ? {
      ...action,
      externalExecution: false,
      providerContacted: true,
      result: {
        message: input.message,
        resourceHandle: null,
        resourceId: null,
        userErrors: [input.message]
      },
      status: "failed" as const
    }
    : action);
}

function lookupBodyForAction(action: ShopifyStorefrontDraftAction) {
  if (action.kind === "create_shopify_collection_draft") {
    return {
      query: collectionByIdentifierQuery,
      variables: {
        identifier: { handle: action.handle }
      }
    };
  }

  if (action.kind === "create_shopify_page_draft") {
    return {
      query: pageByHandleQuery,
      variables: {
        query: `handle:${action.handle}`
      }
    };
  }

  if (action.kind === "create_shopify_navigation_menu_draft") {
    return {
      query: menusQuery
    };
  }

  return null;
}

function parseLookupResource(action: ShopifyStorefrontDraftAction, payload: unknown): ShopifyLookupResource | null {
  const data = recordFrom(recordFrom(payload)?.data);

  if (!data) return null;

  if (action.kind === "create_shopify_collection_draft") {
    return lookupResourceFromNode(data.collectionByIdentifier);
  }

  if (action.kind === "create_shopify_page_draft") {
    return firstLookupResourceFromConnection(data.pages, action.handle);
  }

  if (action.kind === "create_shopify_navigation_menu_draft") {
    return firstLookupResourceFromConnection(data.menus, action.handle);
  }

  return null;
}

async function findExistingShopifyDraftResource(input: {
  action: ShopifyStorefrontDraftAction;
  credentials: ReturnType<typeof credentialsWithDefaults>;
  fetcher: ShopifyFetch;
}) {
  const body = lookupBodyForAction(input.action);

  if (!body) return null;

  try {
    const response = await callShopifyGraphql({
      body,
      credentials: input.credentials,
      fetcher: input.fetcher,
      idempotencyKey: `${input.action.idempotencyKey}:lookup`
    });

    if (!response.ok || parseGraphqlErrors(response.payload).length > 0) {
      return null;
    }

    return parseLookupResource(input.action, response.payload);
  } catch {
    return null;
  }
}

function canSkipExistingAction(action: ShopifyStorefrontDraftAction) {
  return action.kind !== "upsert_shopify_product_draft";
}

function isDuplicateResourceError(errors: string[]) {
  return errors.some((error) => {
    const normalized = error.toLowerCase();

    return normalized.includes("already exists")
      || normalized.includes("already been taken")
      || normalized.includes("handle has already")
      || (normalized.includes("handle") && normalized.includes("taken"));
  });
}

function existingResourceResult(action: ShopifyStorefrontDraftAction, resource: {
  handle?: string | null;
  id?: string | null;
} | null) {
  return {
    message: "Shopify already has this draft resource; create skipped for retry-safe autonomy.",
    resourceHandle: resource?.handle ?? action.handle,
    resourceId: resource?.id ?? null,
    status: "skipped" as const,
    userErrors: []
  };
}

async function callShopify(input: {
  action: ShopifyStorefrontDraftAction;
  credentials: ReturnType<typeof credentialsWithDefaults>;
  fetcher: ShopifyFetch;
}) {
  const response = await callShopifyGraphql({
    body: input.action.body,
    credentials: input.credentials,
    fetcher: input.fetcher,
    idempotencyKey: input.action.idempotencyKey
  });

  if (!response.ok) {
    return {
      message: `Shopify returned HTTP ${response.status}.`,
      resourceHandle: null,
      resourceId: null,
      status: "failed" as const,
      userErrors: [typeof response.payload === "string" ? stripHtml(response.payload).slice(0, 300) : `HTTP ${response.status}`]
    };
  }

  const result = resultFromGraphql(response.payload, input.action.mutationName);

  if (result.errors.length > 0) {
    if (canSkipExistingAction(input.action) && isDuplicateResourceError(result.errors)) {
      return existingResourceResult(input.action, {
        handle: result.handle ?? input.action.handle,
        id: result.id
      });
    }

    return {
      message: "Shopify rejected the draft action.",
      resourceHandle: result.handle,
      resourceId: result.id,
      status: "failed" as const,
      userErrors: result.errors
    };
  }

  return {
    message: `${input.action.title} completed in Shopify draft mode.`,
    resourceHandle: result.handle,
    resourceId: result.id,
    status: "executed" as const,
    userErrors: []
  };
}

export async function executeShopifyStorefrontDraft(input: {
  connectorApproval?: boolean;
  credentials?: ShopifyStorefrontDraftCredentials;
  dryRun?: boolean;
  fetcher?: ShopifyFetch;
  generatedAt?: string;
  liveUnlockPhrase?: string | null;
  options?: Partial<ShopifyStorefrontDraftOptions>;
  products: MerchProductSnapshot[];
  store: MerchStoreSnapshot;
  storeId: string;
}): Promise<ShopifyStorefrontDraftPlan> {
  const plan = buildShopifyStorefrontDraftPlan(input);

  if (plan.status !== "ready_to_execute") {
    return plan;
  }

  const credentials = credentialsWithDefaults(input.credentials);
  const fetcher = input.fetcher ?? fetch;
  const storefrontActions: ShopifyStorefrontDraftAction[] = [];

  if (shouldVerifyResolvedCredentials(input.credentials)) {
    const verification = await verifyResolvedCredentialsBeforeExecution({ credentials, fetcher });

    if (verification.status !== "verified") {
      const message = verification.errors[0] ?? "Shopify environment fallback credentials could not be verified.";
      const failedActions = failedVerificationActions({
        actions: plan.storefrontActions,
        message
      });
      const totals = actionTotals(failedActions);

      return {
        ...plan,
        actualExternalActionsExecuted: false,
        auditEvents: [
          ...plan.auditEvents,
          "Shopify environment fallback credentials failed verification before draft actions; no draft write requests were sent."
        ],
        externalExecution: false,
        launchReadiness: buildLaunchReadiness({
          actions: failedActions,
          shopifyAdminUrl: plan.shopifyAdminUrl,
          status: "failed",
          store: input.store
        }),
        providerContacted: true,
        providerContactedDomain: credentials.shopDomain,
        status: "failed",
        storefrontActions: failedActions,
        summary: `Shopify connection verification failed for ${input.store.businessName}: ${message}. No Shopify draft write requests were sent.`,
        totals
      };
    }
  }

  for (const plannedAction of plan.storefrontActions) {
    if (plannedAction.status !== "ready") {
      storefrontActions.push(plannedAction);
      continue;
    }

    const action = hydrateMenuAction({
      action: plannedAction,
      completedActions: storefrontActions,
      store: input.store,
      storeId: input.storeId
    });

    try {
      const existingResource = await findExistingShopifyDraftResource({ action, credentials, fetcher });

      if (existingResource) {
        const result = existingResourceResult(action, existingResource);

        storefrontActions.push({
          ...action,
          externalExecution: false,
          providerContacted: true,
          result: {
            message: result.message,
            resourceHandle: result.resourceHandle,
            resourceId: result.resourceId,
            userErrors: result.userErrors
          },
          status: result.status
        });
        continue;
      }

      const result = await callShopify({ action, credentials, fetcher });
      storefrontActions.push({
        ...action,
        externalExecution: result.status === "executed",
        providerContacted: true,
        result: {
          message: result.message,
          resourceHandle: result.resourceHandle,
          resourceId: result.resourceId,
          userErrors: result.userErrors
        },
        status: result.status
      });
    } catch (error) {
      storefrontActions.push({
        ...action,
        externalExecution: false,
        providerContacted: true,
        result: {
          message: error instanceof Error ? error.message : "Unknown Shopify connector error.",
          resourceHandle: null,
          resourceId: null,
          userErrors: [error instanceof Error ? error.message : "Unknown Shopify connector error."]
        },
        status: "failed"
      });
    }
  }

  const totals = actionTotals(storefrontActions);
  const completedActions = totals.executedActions + totals.skippedActions;
  const status: ShopifyStorefrontDraftStatus = totals.failedActions > 0
    ? "failed"
    : completedActions > 0 ? "executed" : plan.status;

  return {
    ...plan,
    actualExternalActionsExecuted: totals.executedActions > 0,
    auditEvents: [
      ...plan.auditEvents,
      status === "executed"
        ? "Shopify draft actions executed against the connected shop, and existing draft resources were skipped by handle when present. Products remain draft and collections remain unpublished."
        : "Shopify draft executor contacted the connected shop but at least one draft action failed."
    ],
    externalExecution: totals.executedActions > 0,
    launchReadiness: buildLaunchReadiness({
      actions: storefrontActions,
      shopifyAdminUrl: plan.shopifyAdminUrl,
      status,
      store: input.store
    }),
    providerContacted: true,
    providerContactedDomain: credentials.shopDomain,
    status,
    storefrontActions,
    summary: status === "executed"
      ? `${totals.executedActions} Shopify draft action${totals.executedActions === 1 ? "" : "s"} completed and ${totals.skippedActions} existing draft resource${totals.skippedActions === 1 ? "" : "s"} skipped for ${input.store.businessName}. Products remain draft, pages remain unpublished, generated navigation stays unattached, and public launch/payment actions are still locked.`
      : `${totals.failedActions} Shopify draft action${totals.failedActions === 1 ? "" : "s"} failed for ${input.store.businessName}. Review action results before retrying.`,
    totals
  };
}
