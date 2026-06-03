import type { CreatePodProductInput } from "../schemas.js";
import type { ProductBatchRiskTolerance, ProductBatchSize } from "./productBatchGenerator.js";
import type { RevenueEngineProductSnapshot, RevenueEngineStoreSnapshot } from "./revenueEngine.js";

export type DigitalProductCategory = "asset_pack" | "course" | "planner" | "prompt_pack" | "template";

export type DigitalProductOptions = {
  includeLeadMagnets: boolean;
  maxStores: number;
  minDigitalProductsPerStore: number;
  productsPerStore: ProductBatchSize;
  riskTolerance: ProductBatchRiskTolerance;
};

export type DigitalProductLane = {
  assetChecklist: string[];
  category: DigitalProductCategory;
  deliveryChecklist: string[];
  format: string;
  id: string;
  launchChecklist: string[];
  productType: string;
  recommendedPrice: number;
  templateTitle: string;
};

export type DigitalProductDraft = {
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    status: "Draft only";
  };
  assetChecklist: string[];
  assetPrompt: string;
  createProductInput: CreatePodProductInput;
  deliveryChecklist: string[];
  estimatedProfit: number;
  id: string;
  lane: DigitalProductLane;
  launchChecklist: string[];
  listingDescription: string;
  listingTitle: string;
  productName: string;
  profitMargin: number;
  retailPrice: number;
  storeId: string;
  storeName: string;
};

export type DigitalProductStorePlan = {
  action: "hold" | "optimize_digital_products" | "seed_digital_products";
  digitalLanes: DigitalProductLane[];
  existingDigitalProducts: number;
  externalExecution: false;
  missingDigitalProducts: number;
  priority: number;
  queuedDrafts: DigitalProductDraft[];
  reason: string;
  readinessScore: number;
  storeId: string;
  storeName: string;
};

export type DigitalProductPortfolioPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  draftQueue: DigitalProductDraft[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Digital Product Portfolio";
  options: DigitalProductOptions;
  storePlans: DigitalProductStorePlan[];
  summary: string;
  totals: {
    digitalProductsExisting: number;
    estimatedDraftProfit: number;
    queuedDrafts: number;
    storesEvaluated: number;
    storesQueued: number;
    templateCount: number;
  };
};

export const digitalProductConfirmation = "CREATE INTERNAL DIGITAL PRODUCT QUEUE";

const defaultOptions: DigitalProductOptions = {
  includeLeadMagnets: true,
  maxStores: 5,
  minDigitalProductsPerStore: 3,
  productsPerStore: 5,
  riskTolerance: "Low"
};

const digitalLanes: DigitalProductLane[] = [
  {
    assetChecklist: [
      "Cover mockup",
      "Printable PDF pages",
      "Usage instructions",
      "Exported preview images"
    ],
    category: "planner",
    deliveryChecklist: [
      "ZIP file with PDF and preview images",
      "License and usage note",
      "Customer support note"
    ],
    format: "PDF + PNG preview pack",
    id: "printable_planner",
    launchChecklist: [
      "Confirm page count, print size, and bleed settings.",
      "Confirm all pages use original layouts and text.",
      "Prepare listing images and a sample page preview."
    ],
    productType: "Printable Planner",
    recommendedPrice: 17,
    templateTitle: "Printable execution planner"
  },
  {
    assetChecklist: [
      "Template workspace outline",
      "Setup instructions",
      "Preview screenshots",
      "Duplicate-link placeholder"
    ],
    category: "template",
    deliveryChecklist: [
      "Template access instructions",
      "Quick-start guide",
      "Update/version note"
    ],
    format: "Template link + PDF guide",
    id: "notion_template",
    launchChecklist: [
      "Confirm template fields are generic, original, and reusable.",
      "Confirm duplicate-link instructions are clear.",
      "Prepare before/after preview images."
    ],
    productType: "Notion Template",
    recommendedPrice: 29,
    templateTitle: "Operating system template"
  },
  {
    assetChecklist: [
      "Prompt pack document",
      "Use-case index",
      "Example outputs",
      "Safety and scope note"
    ],
    category: "prompt_pack",
    deliveryChecklist: [
      "PDF prompt pack",
      "Plain-text prompt file",
      "Commercial-use note"
    ],
    format: "PDF + TXT",
    id: "prompt_pack",
    launchChecklist: [
      "Confirm prompts avoid impersonation, protected marks, and unsafe claims.",
      "Confirm examples are original and not copied from providers.",
      "Prepare preview pages that show value without giving away the full pack."
    ],
    productType: "AI Prompt Pack",
    recommendedPrice: 19,
    templateTitle: "Niche prompt pack"
  },
  {
    assetChecklist: [
      "Editable template files",
      "Exported preview images",
      "Font/license notes",
      "Color variant set"
    ],
    category: "template",
    deliveryChecklist: [
      "Editable template access",
      "Exported backup files",
      "Usage instructions"
    ],
    format: "Editable template + PNG previews",
    id: "canva_template",
    launchChecklist: [
      "Confirm all design elements are original or properly licensed.",
      "Confirm template is easy to edit for the target buyer.",
      "Prepare at least five listing preview images."
    ],
    productType: "Canva Template",
    recommendedPrice: 24,
    templateTitle: "Editable brand template"
  },
  {
    assetChecklist: [
      "High-resolution artwork exports",
      "Aspect-ratio variants",
      "Preview room mockups",
      "Print-size instructions"
    ],
    category: "asset_pack",
    deliveryChecklist: [
      "ZIP file with artwork sizes",
      "Print instructions",
      "License and support note"
    ],
    format: "PNG/JPG/PDF art pack",
    id: "digital_wall_art",
    launchChecklist: [
      "Confirm no copied art, protected marks, celebrity likenesses, or restricted phrases.",
      "Confirm each export size renders sharply.",
      "Prepare mockups that accurately show the art."
    ],
    productType: "Digital Wall Art",
    recommendedPrice: 12,
    templateTitle: "Digital wall art pack"
  },
  {
    assetChecklist: [
      "Lesson outline",
      "Slide or worksheet assets",
      "Downloadable cheat sheet",
      "Completion checklist"
    ],
    category: "course",
    deliveryChecklist: [
      "Lesson files or private access instructions",
      "Downloadable worksheet",
      "Support and update note"
    ],
    format: "Mini-course bundle",
    id: "mini_course",
    launchChecklist: [
      "Confirm claims are conservative, practical, and not professional advice.",
      "Confirm lesson files are complete before any sales page goes live.",
      "Prepare module preview and outcome checklist."
    ],
    productType: "Mini Course",
    recommendedPrice: 49,
    templateTitle: "Outcome-focused mini course"
  }
];

const leadMagnetLane: DigitalProductLane = {
  assetChecklist: [
    "Short PDF checklist",
    "Preview image",
    "Opt-in copy",
    "Follow-up offer note"
  ],
  category: "asset_pack",
  deliveryChecklist: [
    "PDF file",
    "Plain-text checklist",
    "Next-offer link placeholder"
  ],
  format: "PDF + TXT",
  id: "lead_magnet",
  launchChecklist: [
    "Confirm the free asset tees up the paid digital product lane.",
    "Confirm no external email, ad, or funnel system is contacted from ENTRAL.",
    "Prepare manual opt-in placement notes."
  ],
  productType: "Digital Lead Magnet",
  recommendedPrice: 0,
  templateTitle: "Conversion checklist"
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "digital-product";
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function digitalProductTypes(includeLeadMagnets = true) {
  const lanes = includeLeadMagnets ? [...digitalLanes, leadMagnetLane] : digitalLanes;
  return lanes.map((lane) => lane.productType.toLowerCase());
}

export function isDigitalProductType(productType: string) {
  const normalized = productType.toLowerCase();
  return digitalProductTypes(true).some((type) => normalized.includes(type))
    || /\b(digital|printable|template|notion|canva|prompt pack|course|worksheet|ebook|wall art)\b/i.test(productType);
}

export function withDigitalProductOptions(input: Partial<DigitalProductOptions> = {}): DigitalProductOptions {
  const productsPerStore = Number(input.productsPerStore ?? defaultOptions.productsPerStore);
  const productCount: ProductBatchSize = ([5, 10, 15, 25] as const).includes(productsPerStore as ProductBatchSize)
    ? productsPerStore as ProductBatchSize
    : defaultOptions.productsPerStore;

  return {
    includeLeadMagnets: input.includeLeadMagnets ?? defaultOptions.includeLeadMagnets,
    maxStores: clamp(Math.round(input.maxStores ?? defaultOptions.maxStores), 1, 25),
    minDigitalProductsPerStore: clamp(Math.round(input.minDigitalProductsPerStore ?? defaultOptions.minDigitalProductsPerStore), 1, 50),
    productsPerStore: productCount,
    riskTolerance: input.riskTolerance === "Medium" || input.riskTolerance === "High" ? input.riskTolerance : "Low"
  };
}

function scoreStore(store: RevenueEngineStoreSnapshot, products: RevenueEngineProductSnapshot[], options: DigitalProductOptions) {
  const digitalProducts = products.filter((product) => product.storeId === store.id && isDigitalProductType(product.productType));
  const activeDigital = digitalProducts.filter((product) => product.status !== "Archived" && product.status !== "Rejected");
  const approvedDigital = digitalProducts.filter((product) => product.status === "Approved" || product.status === "Published");
  const thinPortfolioBoost = Math.max(0, options.minDigitalProductsPerStore - activeDigital.length) * 18;
  const platformBoost = store.storePlatform === "Etsy" || store.storePlatform === "Shopify" ? 12 : 6;
  const approvalBoost = ["Research Approved", "Designs Approved", "Listings Approved", "Launch Approved"].includes(store.approvalStatus) ? 10 : 0;
  const revenueBoost = store.revenue > 0 ? 8 : 0;

  return clamp(40 + thinPortfolioBoost + platformBoost + approvalBoost + revenueBoost + approvedDigital.length * 5, 0, 100);
}

function lanesForStore(store: RevenueEngineStoreSnapshot, products: RevenueEngineProductSnapshot[], options: DigitalProductOptions) {
  const lanes = options.includeLeadMagnets ? [...digitalLanes, leadMagnetLane] : digitalLanes;
  const configured = new Set(store.productTypes.map((type) => type.toLowerCase()));
  const existing = new Set(products
    .filter((product) => product.storeId === store.id)
    .map((product) => product.productType.toLowerCase()));
  const preferred = lanes.filter((lane) => configured.has(lane.productType.toLowerCase()) || !existing.has(lane.productType.toLowerCase()));
  return (preferred.length > 0 ? preferred : lanes).slice(0, options.productsPerStore);
}

function platformFeeFor(price: number) {
  if (price <= 0) return 0;
  return money(Math.max(0.3, price * 0.08));
}

function profitMargin(price: number, fees: number) {
  if (price <= 0) return 0;
  return money(((price - fees) / price) * 100);
}

function tagsFor(store: RevenueEngineStoreSnapshot, lane: DigitalProductLane) {
  return unique([
    store.businessName,
    store.industry,
    lane.productType,
    lane.category.replace("_", " "),
    "digital download",
    "instant download",
    store.audience.split(" ").slice(0, 4).join(" ")
  ]).slice(0, 13);
}

function assetPromptFor(store: RevenueEngineStoreSnapshot, lane: DigitalProductLane) {
  return [
    `Create an original ${lane.productType} digital product for ${store.businessName}.`,
    `Audience: ${store.audience}.`,
    `Brand style: ${store.brandStyle}.`,
    `Industry: ${store.industry}.`,
    `Format: ${lane.format}.`,
    "Use only original copy, layouts, and visual concepts.",
    "Avoid protected marks, copied artwork, celebrity references, professional-advice claims, and unsafe promises.",
    `Required assets: ${lane.assetChecklist.join("; ")}.`
  ].join(" ");
}

function listingFor(store: RevenueEngineStoreSnapshot, lane: DigitalProductLane) {
  const title = `${store.businessName} ${lane.templateTitle}`;
  const description = [
    `${title} is a ${lane.format} digital product prepared for ${store.audience}.`,
    `It matches a ${store.brandStyle.toLowerCase()} direction and is built as an internal ENTRAL draft for review.`,
    "Delivery, listing images, compliance review, and final launch approval remain required before any external sale."
  ].join(" ");

  return {
    description,
    title
  };
}

function createDraft(store: RevenueEngineStoreSnapshot, lane: DigitalProductLane, index: number): DigitalProductDraft {
  const price = lane.recommendedPrice;
  const fees = platformFeeFor(price);
  const profit = money(price - fees);
  const margin = profitMargin(price, fees);
  const listing = listingFor(store, lane);
  const productName = `${store.businessName} ${lane.templateTitle}`;
  const assetPrompt = assetPromptFor(store, lane);
  const createProductInput: CreatePodProductInput = {
    aiDisclosureNeeded: true,
    colorDirection: `${store.brandStyle}. Keep previews clean, legible, and commercially usable.`,
    complianceNotes: "Digital product draft. Verify original assets, platform terms, delivery instructions, and commercial-use notes before launch.",
    designConcept: `${lane.templateTitle} for ${store.audience}, delivered as ${lane.format}.`,
    designPrompt: assetPrompt,
    designTheme: `${lane.productType} / ${store.industry}`,
    estimatedPlatformFees: fees,
    estimatedProfit: profit,
    listingDescription: listing.description,
    listingTitle: listing.title,
    mockupNotes: `Prepare digital preview images for ${lane.format}. No external upload is authorized.`,
    productName,
    productType: lane.productType,
    productionPartnerDisclosureNeeded: false,
    profitMargin: margin,
    retailPrice: price,
    shippingCost: 0,
    status: "Prompt Ready",
    storeId: store.id,
    supplierCost: 0,
    tags: tagsFor(store, lane),
    targetAudience: store.audience,
    typographyDirection: "Use accessible hierarchy, readable headings, and clean export labels."
  };

  return {
    approvalGate: {
      externalExecutionLocked: true,
      humanApprovalRequired: true,
      status: "Draft only"
    },
    assetChecklist: lane.assetChecklist,
    assetPrompt,
    createProductInput,
    deliveryChecklist: lane.deliveryChecklist,
    estimatedProfit: profit,
    id: `digital_${store.id}_${lane.id}_${index + 1}`,
    lane,
    launchChecklist: lane.launchChecklist,
    listingDescription: listing.description,
    listingTitle: listing.title,
    productName,
    profitMargin: margin,
    retailPrice: price,
    storeId: store.id,
    storeName: store.businessName
  };
}

export function buildDigitalProductPortfolioPlan(input: {
  generatedAt?: string;
  options?: Partial<DigitalProductOptions>;
  products: RevenueEngineProductSnapshot[];
  stores: RevenueEngineStoreSnapshot[];
}): DigitalProductPortfolioPlan {
  const options = withDigitalProductOptions(input.options);
  const rankedStores = input.stores
    .map((store) => ({
      score: scoreStore(store, input.products, options),
      store
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, options.maxStores);
  const storePlans = rankedStores.map(({ score, store }, storeIndex): DigitalProductStorePlan => {
    const storeProducts = input.products.filter((product) => product.storeId === store.id);
    const existingDigitalProducts = storeProducts.filter((product) => isDigitalProductType(product.productType)).length;
    const missingDigitalProducts = Math.max(0, options.minDigitalProductsPerStore - existingDigitalProducts);
    const targetCount = Math.min(options.productsPerStore, Math.max(missingDigitalProducts, existingDigitalProducts === 0 ? 2 : 1));
    const digitalLanes = lanesForStore(store, storeProducts, options).slice(0, targetCount);
    const queuedDrafts = digitalLanes.map((lane, index) => createDraft(store, lane, storeIndex * options.productsPerStore + index));
    const action = queuedDrafts.length > 0
      ? "seed_digital_products"
      : existingDigitalProducts >= options.minDigitalProductsPerStore
        ? "optimize_digital_products"
        : "hold";

    return {
      action,
      digitalLanes,
      existingDigitalProducts,
      externalExecution: false,
      missingDigitalProducts,
      priority: action === "seed_digital_products" ? 1 : action === "optimize_digital_products" ? 3 : 5,
      queuedDrafts,
      reason: action === "seed_digital_products"
        ? `${store.businessName} can add ${queuedDrafts.length} high-margin digital product draft${queuedDrafts.length === 1 ? "" : "s"} without supplier or shipping cost.`
        : `${store.businessName} already has ${existingDigitalProducts} digital product lane${existingDigitalProducts === 1 ? "" : "s"}; keep optimizing internally.`,
      readinessScore: score,
      storeId: store.id,
      storeName: store.businessName
    };
  });
  const draftQueue = storePlans.flatMap((plan) => plan.queuedDrafts);
  const estimatedDraftProfit = money(draftQueue.reduce((sum, draft) => sum + draft.estimatedProfit, 0));

  return {
    auditEvents: [
      "Digital Product Portfolio evaluated internally.",
      "Digital drafts use internal ENTRAL product records with zero supplier and shipping costs.",
      "No digital marketplace, file host, email platform, payment system, or browser automation system was contacted."
    ],
    blockedExternalActions: [
      "Uploading digital files to a marketplace or file host",
      "Creating or publishing digital listings",
      "Starting email, funnel, social, or ad automation",
      "Moving money or issuing payouts",
      "Using browser stealth, anti-detection, or platform-evasion automation"
    ],
    draftQueue,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Internal Digital Product Portfolio",
    options,
    storePlans,
    summary: `${input.stores.length} stores evaluated. ${draftQueue.length} digital product draft${draftQueue.length === 1 ? "" : "s"} queued with estimated draft profit ${estimatedDraftProfit}.`,
    totals: {
      digitalProductsExisting: input.products.filter((product) => isDigitalProductType(product.productType)).length,
      estimatedDraftProfit,
      queuedDrafts: draftQueue.length,
      storesEvaluated: input.stores.length,
      storesQueued: storePlans.filter((plan) => plan.queuedDrafts.length > 0).length,
      templateCount: storePlans.reduce((sum, plan) => sum + plan.digitalLanes.length, 0)
    }
  };
}
