import { buildLaunchPackage, type MerchProductSnapshot, type MerchStoreSnapshot } from "./merchReports.js";
import type { GrowthApprovalAction, GrowthApprovalPacket } from "./growthPlans.js";

export const merchProviderAdapters = ["Printify", "Printful", "Etsy", "Shopify"] as const;

export type MerchProviderAdapter = (typeof merchProviderAdapters)[number];

export type ProviderPayloadOptions = {
  includeUnapproved: boolean;
  maxProducts: number;
};

export type ProviderPayloadRequest = {
  action: "create_pod_product" | "create_marketplace_listing" | "create_shopify_product" | "create_store_collection";
  body: Record<string, unknown>;
  credentialScope: string[];
  externalExecution: false;
  headers: Record<string, string>;
  id: string;
  idempotencyKey: string;
  method: "POST" | "PUT";
  pathTemplate: string;
  provider: MerchProviderAdapter;
  requiredApprovals: string[];
  status: "Draft - not sent";
  validationChecklist: string[];
};

export type ProviderPayloadProduct = {
  estimatedProfit: number;
  listingTitle: string;
  payloads: ProviderPayloadRequest[];
  productName: string;
  productType: string;
  retailPrice: number;
  status: string;
};

export type ProviderPayloadPackage = {
  adapterCoverage: MerchProviderAdapter[];
  auditEvents: string[];
  blockedActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Locked Provider Payload Package";
  options: ProviderPayloadOptions;
  payloadCount: number;
  productPayloads: ProviderPayloadProduct[];
  providerContacted: false;
  readinessScore: number;
  store: {
    businessName: string;
    podProvider: string;
    storeId: string;
    storePlatform: string;
  };
  summary: string;
  warnings: string[];
};

export type ProviderPayloadApprovalPacket = GrowthApprovalPacket & {
  providerPayloadPackage: {
    adapterCoverage: MerchProviderAdapter[];
    generatedAt: string;
    payloadCount: number;
    readinessScore: number;
    summary: string;
  };
  rollbackChecklist: string[];
};

export type ProviderHandoffArtifactSlot = {
  acceptedFormats: string[];
  label: string;
  notes: string;
  required: boolean;
  slotId: string;
};

export type ProviderHandoffRequestManifest = {
  action: ProviderPayloadRequest["action"];
  artifactSlots: ProviderHandoffArtifactSlot[];
  bodyJson: string;
  credentialScope: string[];
  executionState: "Locked - manual handoff only";
  headers: Record<string, string>;
  id: string;
  idempotencyKey: string;
  manualSteps: string[];
  method: ProviderPayloadRequest["method"];
  pathTemplate: string;
  productName: string;
  provider: MerchProviderAdapter;
  requiredApprovals: string[];
  validationChecklist: string[];
};

export type ProviderHandoffBundle = {
  approvedAt: string | null;
  approvedPacketId: string;
  auditEvents: string[];
  blockedActions: string[];
  businessName: string;
  connectorReadiness: {
    requiredBeforeConnector: string[];
    score: number;
    status: "Ready for manual handoff" | "Needs review" | "Blocked - no approved payloads";
  };
  drift: {
    adapterCoverageMatches: boolean;
    payloadCountMatches: boolean;
    readinessScoreDelta: number;
    warnings: string[];
  };
  externalExecution: false;
  generatedAt: string;
  manualLaunchChecklist: string[];
  mode: "Provider Handoff Bundle";
  providerContacted: false;
  requestManifest: ProviderHandoffRequestManifest[];
  reviewAuditLogId: string | null;
  rollbackChecklist: string[];
  summary: string;
};

const defaultOptions: ProviderPayloadOptions = {
  includeUnapproved: false,
  maxProducts: 5
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "payload";
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function selectedPodAdapters(podProvider: string): MerchProviderAdapter[] {
  if (podProvider === "Printify") return ["Printify"];
  if (podProvider === "Printful") return ["Printful"];
  return ["Printify", "Printful"];
}

function selectedStoreAdapters(storePlatform: string): MerchProviderAdapter[] {
  if (storePlatform === "Etsy") return ["Etsy"];
  if (storePlatform === "Shopify") return ["Shopify"];
  return ["Etsy", "Shopify"];
}

function payloadHeaders(provider: MerchProviderAdapter) {
  return {
    authorization: `Bearer <${provider.toUpperCase()}_TOKEN>`,
    "content-type": "application/json",
    "x-entral-mode": "locked-mock-payload"
  };
}

function sharedApprovals(provider: MerchProviderAdapter) {
  return [
    `${provider} credential scope approval`,
    "product title and description approval",
    "mockup/artwork approval",
    "pricing and margin approval",
    "final user launch approval"
  ];
}

function sharedChecklist(product: MerchProductSnapshot) {
  return [
    "Confirm product remains approved in ENTRAL.",
    "Confirm title, description, tags, and price match the latest launch package.",
    "Confirm AI and production partner disclosures are correct.",
    "Confirm no protected marks, copied art, celebrity references, or restricted phrases are present.",
    `Confirm ${product.productName} artwork and mockups exist before any future upload.`
  ];
}

function printifyPayload(store: MerchStoreSnapshot, product: MerchProductSnapshot, storeId: string): ProviderPayloadRequest {
  return {
    action: "create_pod_product",
    body: {
      blueprint_id: "<approved_printify_blueprint_id>",
      description: product.listingDescription,
      external: {
        id: `${storeId}:${slug(product.productName)}`,
        handle: slug(product.productName)
      },
      images: ["<approved_mockup_or_design_asset_url>"],
      print_provider_id: "<approved_print_provider_id>",
      shop_id: "<approved_printify_shop_id>",
      tags: product.tags,
      title: product.listingTitle ?? product.productName,
      variants: [
        {
          is_enabled: true,
          price_cents: Math.round(product.retailPrice * 100),
          variant_id: "<approved_variant_id>"
        }
      ]
    },
    credentialScope: ["shops:read", "products:write"],
    externalExecution: false,
    headers: payloadHeaders("Printify"),
    id: `printify_${slug(product.productName)}`,
    idempotencyKey: `entral:${storeId}:${slug(product.productName)}:printify`,
    method: "POST",
    pathTemplate: "/v1/shops/{shop_id}/products.json",
    provider: "Printify",
    requiredApprovals: sharedApprovals("Printify"),
    status: "Draft - not sent",
    validationChecklist: sharedChecklist(product)
  };
}

function printfulPayload(store: MerchStoreSnapshot, product: MerchProductSnapshot, storeId: string): ProviderPayloadRequest {
  return {
    action: "create_pod_product",
    body: {
      sync_product: {
        external_id: `${storeId}:${slug(product.productName)}`,
        name: product.listingTitle ?? product.productName,
        thumbnail: "<approved_mockup_or_design_asset_url>"
      },
      sync_variants: [
        {
          files: [
            {
              type: "default",
              url: "<approved_design_asset_url>"
            }
          ],
          retail_price: product.retailPrice.toFixed(2),
          variant_id: "<approved_printful_variant_id>"
        }
      ]
    },
    credentialScope: ["sync_products:write", "store:read"],
    externalExecution: false,
    headers: payloadHeaders("Printful"),
    id: `printful_${slug(product.productName)}`,
    idempotencyKey: `entral:${storeId}:${slug(product.productName)}:printful`,
    method: "POST",
    pathTemplate: "/store/products",
    provider: "Printful",
    requiredApprovals: sharedApprovals("Printful"),
    status: "Draft - not sent",
    validationChecklist: sharedChecklist(product)
  };
}

function etsyPayload(store: MerchStoreSnapshot, product: MerchProductSnapshot, storeId: string): ProviderPayloadRequest {
  return {
    action: "create_marketplace_listing",
    body: {
      description: product.listingDescription,
      is_customizable: false,
      is_personalizable: false,
      price: money(product.retailPrice),
      production_partner_ids: ["<approved_production_partner_id>"],
      quantity: 999,
      shipping_profile_id: "<approved_shipping_profile_id>",
      shop_id: "<approved_etsy_shop_id>",
      state: "draft",
      tags: product.tags.slice(0, 13),
      taxonomy_id: "<approved_taxonomy_id>",
      title: product.listingTitle ?? product.productName,
      who_made: "collective"
    },
    credentialScope: ["listings_w", "shops_r"],
    externalExecution: false,
    headers: payloadHeaders("Etsy"),
    id: `etsy_${slug(product.productName)}`,
    idempotencyKey: `entral:${storeId}:${slug(product.productName)}:etsy`,
    method: "POST",
    pathTemplate: "/v3/application/shops/{shop_id}/listings",
    provider: "Etsy",
    requiredApprovals: sharedApprovals("Etsy"),
    status: "Draft - not sent",
    validationChecklist: [
      ...sharedChecklist(product),
      "Confirm Etsy taxonomy, shipping profile, return policy, and production partner settings."
    ]
  };
}

function shopifyPayload(store: MerchStoreSnapshot, product: MerchProductSnapshot, storeId: string): ProviderPayloadRequest {
  return {
    action: "create_shopify_product",
    body: {
      product: {
        body_html: product.listingDescription,
        images: [
          {
            alt: product.productName,
            src: "<approved_mockup_asset_url>"
          }
        ],
        product_type: product.productType,
        status: "draft",
        tags: product.tags.join(", "),
        title: product.listingTitle ?? product.productName,
        variants: [
          {
            inventory_management: null,
            price: product.retailPrice.toFixed(2),
            sku: `${slug(store.businessName).slice(0, 16)}-${slug(product.productName).slice(0, 24)}`.toUpperCase()
          }
        ],
        vendor: store.businessName
      }
    },
    credentialScope: ["write_products", "read_products"],
    externalExecution: false,
    headers: payloadHeaders("Shopify"),
    id: `shopify_${slug(product.productName)}`,
    idempotencyKey: `entral:${storeId}:${slug(product.productName)}:shopify`,
    method: "POST",
    pathTemplate: "/admin/api/{version}/products.json",
    provider: "Shopify",
    requiredApprovals: sharedApprovals("Shopify"),
    status: "Draft - not sent",
    validationChecklist: [
      ...sharedChecklist(product),
      "Confirm Shopify collection, fulfillment, tax, shipping, and return settings before future publish."
    ]
  };
}

function collectionPayload(store: MerchStoreSnapshot, storeId: string): ProviderPayloadRequest {
  return {
    action: "create_store_collection",
    body: {
      custom_collection: {
        body_html: `${store.businessName} launch collection for ${store.audience}.`,
        handle: `${slug(store.businessName)}-launch`,
        published: false,
        title: `${store.businessName} Launch Collection`
      }
    },
    credentialScope: ["write_products", "read_products"],
    externalExecution: false,
    headers: payloadHeaders("Shopify"),
    id: `shopify_collection_${slug(store.businessName)}`,
    idempotencyKey: `entral:${storeId}:${slug(store.businessName)}:shopify_collection`,
    method: "POST",
    pathTemplate: "/admin/api/{version}/custom_collections.json",
    provider: "Shopify",
    requiredApprovals: [
      "Shopify credential scope approval",
      "collection copy approval",
      "navigation and storefront placement approval",
      "final user launch approval"
    ],
    status: "Draft - not sent",
    validationChecklist: [
      "Confirm collection title and description match the launch package.",
      "Confirm collection remains unpublished until final approval.",
      "Confirm rollback owner and storefront QA checklist."
    ]
  };
}

function payloadsForProduct(input: {
  product: MerchProductSnapshot;
  podAdapters: MerchProviderAdapter[];
  store: MerchStoreSnapshot;
  storeAdapters: MerchProviderAdapter[];
  storeId: string;
}) {
  const podPayloads = input.podAdapters.map((adapter) => (
    adapter === "Printify"
      ? printifyPayload(input.store, input.product, input.storeId)
      : printfulPayload(input.store, input.product, input.storeId)
  ));
  const storePayloads = input.storeAdapters.map((adapter) => (
    adapter === "Etsy"
      ? etsyPayload(input.store, input.product, input.storeId)
      : shopifyPayload(input.store, input.product, input.storeId)
  ));

  return [...podPayloads, ...storePayloads];
}

function providerPacketId(storeId: string, createdAt: string) {
  return `provider_payload_approval_${storeId}_${createdAt.replace(/[^0-9]/g, "").slice(0, 14)}`;
}

function providerActionId(packetIdValue: string, provider: string, index: number) {
  return `${packetIdValue}_${provider.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${index + 1}`;
}

function slotId(provider: MerchProviderAdapter, productName: string, label: string) {
  return `${provider.toLowerCase()}_${slug(productName)}_${slug(label)}`;
}

function artifactSlotsForPayload(payload: ProviderPayloadRequest, product: ProviderPayloadProduct): ProviderHandoffArtifactSlot[] {
  const baseSlots: ProviderHandoffArtifactSlot[] = [
    {
      acceptedFormats: ["json"],
      label: "Approved request body",
      notes: "Use the bodyJson template only after confirming every placeholder and provider setting.",
      required: true,
      slotId: slotId(payload.provider, product.productName, "request body")
    },
    {
      acceptedFormats: ["png", "jpg", "webp"],
      label: "QA screenshot",
      notes: "Attach a screenshot of the draft item before any future publish approval.",
      required: true,
      slotId: slotId(payload.provider, product.productName, "qa screenshot")
    }
  ];

  if (payload.action === "create_pod_product") {
    return [
      ...baseSlots,
      {
        acceptedFormats: ["png", "svg", "pdf"],
        label: "Approved design asset",
        notes: "Final printable artwork with compliance review complete.",
        required: true,
        slotId: slotId(payload.provider, product.productName, "design asset")
      },
      {
        acceptedFormats: ["png", "jpg", "webp"],
        label: "Approved mockup asset",
        notes: "Mockup used for listing review and storefront QA.",
        required: true,
        slotId: slotId(payload.provider, product.productName, "mockup asset")
      },
      {
        acceptedFormats: ["json", "csv", "txt"],
        label: "Variant map",
        notes: "Provider blueprint, print provider, variant IDs, sizes, colors, and SKU mapping.",
        required: true,
        slotId: slotId(payload.provider, product.productName, "variant map")
      }
    ];
  }

  if (payload.action === "create_marketplace_listing" || payload.action === "create_shopify_product") {
    return [
      ...baseSlots,
      {
        acceptedFormats: ["png", "jpg", "webp"],
        label: "Listing image set",
        notes: "All public listing images in final display order.",
        required: true,
        slotId: slotId(payload.provider, product.productName, "listing images")
      },
      {
        acceptedFormats: ["json", "txt"],
        label: "Disclosure and production partner notes",
        notes: "AI disclosure, production partner, shipping, returns, tax, and fulfillment notes.",
        required: true,
        slotId: slotId(payload.provider, product.productName, "disclosures")
      }
    ];
  }

  return [
    ...baseSlots,
    {
      acceptedFormats: ["txt", "png", "jpg"],
      label: "Storefront placement proof",
      notes: "Navigation, collection visibility, and unpublished storefront QA evidence.",
      required: true,
      slotId: slotId(payload.provider, product.productName, "storefront qa")
    }
  ];
}

function manualStepsForPayload(payload: ProviderPayloadRequest, product: ProviderPayloadProduct) {
  return [
    `Confirm ${product.productName} is still approved in ENTRAL and matches the latest launch package.`,
    `Review ${payload.provider} credential scopes: ${payload.credentialScope.join(", ")}.`,
    `Validate ${payload.method} ${payload.pathTemplate} against the current ${payload.provider} API docs or manual admin flow.`,
    "Replace every placeholder with approved internal values only.",
    "Keep the provider item draft, unpublished, or non-live during handoff preparation.",
    "Record any future provider resource ID in ENTRAL before a publish approval is considered."
  ];
}

function manifestForPayload(payload: ProviderPayloadRequest, product: ProviderPayloadProduct): ProviderHandoffRequestManifest {
  return {
    action: payload.action,
    artifactSlots: artifactSlotsForPayload(payload, product),
    bodyJson: JSON.stringify(payload.body, null, 2),
    credentialScope: payload.credentialScope,
    executionState: "Locked - manual handoff only",
    headers: payload.headers,
    id: payload.id,
    idempotencyKey: payload.idempotencyKey,
    manualSteps: manualStepsForPayload(payload, product),
    method: payload.method,
    pathTemplate: payload.pathTemplate,
    productName: product.productName,
    provider: payload.provider,
    requiredApprovals: payload.requiredApprovals,
    validationChecklist: payload.validationChecklist
  };
}

function sameAdapterCoverage(first: MerchProviderAdapter[], second: MerchProviderAdapter[]) {
  const normalize = (values: MerchProviderAdapter[]) => values.slice().sort().join("|");
  return normalize(first) === normalize(second);
}

export function withProviderPayloadOptions(input: Partial<ProviderPayloadOptions> = {}): ProviderPayloadOptions {
  return {
    includeUnapproved: Boolean(input.includeUnapproved),
    maxProducts: clamp(Math.round(input.maxProducts ?? defaultOptions.maxProducts), 1, 25)
  };
}

export function isProviderPayloadApprovalPacket(packet: GrowthApprovalPacket): packet is ProviderPayloadApprovalPacket {
  const candidate = packet as ProviderPayloadApprovalPacket;
  return Boolean(
    candidate.providerPayloadPackage
      && Array.isArray(candidate.providerPayloadPackage.adapterCoverage)
      && Array.isArray(candidate.rollbackChecklist)
      && candidate.actions.every((action) => action.channel === "Provider")
  );
}

export function buildProviderPayloadPackage(input: {
  generatedAt?: string;
  options?: Partial<ProviderPayloadOptions>;
  products: MerchProductSnapshot[];
  store: MerchStoreSnapshot;
  storeId: string;
}): ProviderPayloadPackage {
  const options = withProviderPayloadOptions(input.options);
  const launchPackage = buildLaunchPackage(input.store, input.products);
  const eligibleProducts = (options.includeUnapproved
    ? input.products.filter((product) => product.status !== "Archived" && product.status !== "Rejected")
    : launchPackage.approvedProducts)
    .slice(0, options.maxProducts);
  const podAdapters = selectedPodAdapters(input.store.podProvider ?? "Other");
  const storeAdapters = selectedStoreAdapters(input.store.storePlatform);
  const adapterCoverage = unique([...podAdapters, ...storeAdapters]) as MerchProviderAdapter[];
  const productPayloads = eligibleProducts.map((product) => ({
    estimatedProfit: product.estimatedProfit,
    listingTitle: product.listingTitle ?? product.productName,
    payloads: payloadsForProduct({
      podAdapters,
      product,
      store: input.store,
      storeAdapters,
      storeId: input.storeId
    }),
    productName: product.productName,
    productType: product.productType,
    retailPrice: product.retailPrice,
    status: product.status
  }));
  const shopifyCollectionPayload = storeAdapters.includes("Shopify") && productPayloads.length > 0
    ? [collectionPayload(input.store, input.storeId)]
    : [];
  const payloadCount = productPayloads.reduce((sum, product) => sum + product.payloads.length, 0) + shopifyCollectionPayload.length;
  const warnings = [
    eligibleProducts.length === 0 ? "No approved products are available for provider payload generation." : "",
    options.includeUnapproved ? "Unapproved products were included for internal payload inspection only." : "",
    "Provider payloads are request drafts only. They must be reviewed against current provider API docs before any future connector sends them."
  ].filter(Boolean);
  const readinessScore = clamp(
    eligibleProducts.length * 18
      + adapterCoverage.length * 8
      + (launchPackage.listingDrafts.length > 0 ? 12 : 0)
      - (warnings.length > 1 ? 10 : 0),
    0,
    100
  );

  if (shopifyCollectionPayload.length > 0) {
    productPayloads.push({
      estimatedProfit: 0,
      listingTitle: `${input.store.businessName} Launch Collection`,
      payloads: shopifyCollectionPayload,
      productName: `${input.store.businessName} Launch Collection`,
      productType: "Store collection",
      retailPrice: 0,
      status: "Draft"
    });
  }

  return {
    adapterCoverage,
    auditEvents: [
      "Provider payload package generated in locked mock mode.",
      "No provider API request was sent.",
      "All credentials are represented as redacted placeholders.",
      "Every payload requires final approval before any future connector can execute."
    ],
    blockedActions: [
      "Sending provider API requests",
      "Uploading artwork or mockups",
      "Creating marketplace listings",
      "Publishing products or collections",
      "Changing fulfillment, payment, shipping, tax, or return settings"
    ],
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Locked Provider Payload Package",
    options,
    payloadCount,
    productPayloads,
    providerContacted: false,
    readinessScore,
    store: {
      businessName: input.store.businessName,
      podProvider: input.store.podProvider ?? "Other",
      storeId: input.storeId,
      storePlatform: input.store.storePlatform
    },
    summary: `${payloadCount} locked provider payload${payloadCount === 1 ? "" : "s"} prepared for ${eligibleProducts.length} product${eligibleProducts.length === 1 ? "" : "s"} across ${adapterCoverage.join(", ")}. Nothing was sent externally.`,
    warnings
  };
}

export function buildProviderPayloadApprovalPacket(input: {
  createdAt?: string;
  note?: string | null;
  package: ProviderPayloadPackage;
  scheduledFor?: string | null;
  storeId: string;
}): ProviderPayloadApprovalPacket {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const scheduledFor = input.scheduledFor ?? null;
  const packetIdValue = providerPacketId(input.storeId, createdAt);
  const providerRequests = input.package.productPayloads.flatMap((product) => (
    product.payloads.map((payload) => ({
      payload,
      product
    }))
  ));
  const actions = providerRequests.slice(0, 12).map(({ payload, product }, index): GrowthApprovalAction => ({
    approvalStatus: "Pending human approval",
    channel: "Provider",
    executionState: "Locked - no external action",
    id: providerActionId(packetIdValue, payload.provider, index),
    requiredControls: [
      ...payload.requiredApprovals,
      "credential owner approval",
      "provider API version review",
      "rollback checklist approval",
      "final user launch approval"
    ],
    scheduledFor,
    summary: `${payload.provider} ${payload.action.replace(/_/g, " ")} draft for ${product.productName}. Path ${payload.pathTemplate}. Idempotency key ${payload.idempotencyKey}.`,
    title: `${payload.provider} payload review: ${product.productName}`
  }));

  return {
    actions,
    auditEvents: [
      "Provider payload approval packet queued in Mock Mode.",
      "No provider API request was sent.",
      "Credentials remain redacted placeholders.",
      "Every request body, credential scope, idempotency key, and rollback step requires approval."
    ],
    blockedActions: input.package.blockedActions,
    businessName: input.package.store.businessName,
    costGuardrail: "External provider spend and listing changes remain $0. Provider API requests are locked until future connector approval.",
    createdAt,
    humanApprovalRequired: true,
    id: packetIdValue,
    logging: "This packet stores provider payload summaries, credential scopes, rollback requirements, and audit evidence.",
    mode: "Mock Mode",
    note: input.note?.trim() ? input.note.trim().slice(0, 500) : null,
    providerPayloadPackage: {
      adapterCoverage: input.package.adapterCoverage,
      generatedAt: input.package.generatedAt,
      payloadCount: input.package.payloadCount,
      readinessScore: input.package.readinessScore,
      summary: input.package.summary
    },
    rollbackChecklist: [
      "Keep all provider-created resources in draft or unpublished state during any future connector test.",
      "Record provider resource IDs before any future write action.",
      "Prepare delete/archive calls for products, listings, images, and collections before future execution.",
      "Confirm payment, fulfillment, shipping, tax, return, and production partner settings remain unchanged unless explicitly approved.",
      "Write a fresh audit log before and after any future provider connector call."
    ],
    scheduledFor,
    status: "Pending approval",
    storeId: input.storeId,
    summary: `${actions.length} provider payload review actions queued for ${input.package.store.businessName}. ENTRAL will not contact ${input.package.adapterCoverage.join(", ")} without explicit approval.`
  };
}

export function buildProviderHandoffBundle(input: {
  approvalId: string;
  generatedAt?: string;
  package: ProviderPayloadPackage;
  packet: ProviderPayloadApprovalPacket;
  reviewedAt?: string | null;
  reviewAuditLogId?: string | null;
}): ProviderHandoffBundle {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const requestManifest = input.package.productPayloads.flatMap((product) => (
    product.payloads.map((payload) => manifestForPayload(payload, product))
  ));
  const adapterCoverageMatches = sameAdapterCoverage(input.packet.providerPayloadPackage.adapterCoverage, input.package.adapterCoverage);
  const payloadCountMatches = input.packet.providerPayloadPackage.payloadCount === input.package.payloadCount;
  const readinessScoreDelta = input.package.readinessScore - input.packet.providerPayloadPackage.readinessScore;
  const driftWarnings = [
    adapterCoverageMatches ? "" : "Current provider adapter coverage differs from the approved packet.",
    payloadCountMatches ? "" : "Current provider payload count differs from the approved packet.",
    Math.abs(readinessScoreDelta) <= 10 ? "" : "Current payload readiness moved more than 10 points from the approved packet.",
    ...input.package.warnings.filter((warning) => warning !== "Provider payloads are request drafts only. They must be reviewed against current provider API docs before any future connector sends them.")
  ].filter(Boolean);
  const requiredBeforeConnector = unique([
    "Confirm every manifest placeholder has an approved value.",
    "Attach every required design, mockup, listing image, QA screenshot, and variant map.",
    "Reconfirm provider API versions, scopes, shipping, tax, return, fulfillment, and production partner settings.",
    "Run a final compliance review on title, description, tags, artwork, disclosures, and pricing.",
    "Prepare rollback delete/archive calls and record owner before any future connector write."
  ]);
  const readinessScore = clamp(
    input.package.readinessScore
      + (input.reviewAuditLogId ? 8 : 0)
      + (requestManifest.length > 0 ? 7 : 0)
      - driftWarnings.length * 12,
    0,
    100
  );
  const status = requestManifest.length === 0
    ? "Blocked - no approved payloads"
    : driftWarnings.length > 0
      ? "Needs review"
      : "Ready for manual handoff";

  return {
    approvedAt: input.reviewedAt ?? null,
    approvedPacketId: input.approvalId,
    auditEvents: [
      "Provider handoff bundle generated from an approved provider payload packet.",
      "Current store products were rebuilt into locked request manifests for drift review.",
      "No provider API request was sent and no provider admin session was opened.",
      "All request headers use redacted placeholder credentials."
    ],
    blockedActions: input.package.blockedActions,
    businessName: input.packet.businessName,
    connectorReadiness: {
      requiredBeforeConnector,
      score: readinessScore,
      status
    },
    drift: {
      adapterCoverageMatches,
      payloadCountMatches,
      readinessScoreDelta,
      warnings: driftWarnings
    },
    externalExecution: false,
    generatedAt,
    manualLaunchChecklist: [
      "Review the approved packet summary and audit log before touching provider systems.",
      "Work one manifest at a time and keep every item draft, unpublished, or non-live.",
      "Attach required artwork, mockups, image sets, QA screenshots, disclosures, and variant maps.",
      "Record provider draft IDs, listing IDs, collection IDs, and rollback paths inside ENTRAL.",
      "Request a separate final publish approval after draft QA passes."
    ],
    mode: "Provider Handoff Bundle",
    providerContacted: false,
    requestManifest,
    reviewAuditLogId: input.reviewAuditLogId ?? null,
    rollbackChecklist: input.packet.rollbackChecklist,
    summary: `${requestManifest.length} locked request manifest${requestManifest.length === 1 ? "" : "s"} prepared for ${input.packet.businessName}. Connector readiness is ${status.toLowerCase()} at ${readinessScore}/100.`
  };
}
