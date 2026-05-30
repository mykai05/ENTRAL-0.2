import { analyzeCompliance, complianceDisclaimer, type ComplianceSummary } from "./complianceGuardrails.js";

export const merchReportTypes = [
  "Store Launch Report",
  "Weekly Store Report",
  "Product Performance Report",
  "Sales Report",
  "Profit Estimate Report",
  "New Design Opportunity Report",
  "Client Update Report"
] as const;

export type MerchReportType = (typeof merchReportTypes)[number];

export type MerchStoreSnapshot = {
  approvalStatus: string;
  audience: string;
  brandStyle: string;
  businessName: string;
  clientName: string;
  estimatedProfit: number;
  industry: string;
  launchStatus: string;
  notes?: string | null;
  productTypes: string[];
  revenue: number;
  storePlatform: string;
};

export type MerchProductSnapshot = {
  aiDisclosureNeeded: boolean;
  complianceNotes?: string | null;
  designConcept: string;
  designPrompt: string;
  estimatedProfit: number;
  listingDescription?: string | null;
  listingTitle?: string | null;
  productName: string;
  productType: string;
  productionPartnerDisclosureNeeded: boolean;
  retailPrice: number;
  status: string;
  tags: string[];
};

export type EntralReport = {
  analysis: string;
  nextActions: string[];
  recommendation: string;
  situation: string;
  title: MerchReportType;
};

export type LaunchPackage = {
  approvedProducts: MerchProductSnapshot[];
  audienceSummary: string;
  brandSummary: string;
  clientApprovalChecklist: string[];
  complianceNotes: string[];
  listingDrafts: Array<{
    description: string;
    productName: string;
    title: string;
  }>;
  launchChecklist: string[];
  productCollectionSummary: string;
  qrFlyerCopy: string;
  socialCaptions: string[];
  storeBuildChecklist: string[];
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(value);
}

function complianceSummaries(products: MerchProductSnapshot[]): ComplianceSummary[] {
  return products.map((product) => analyzeCompliance(product));
}

export function buildLaunchPackage(store: MerchStoreSnapshot, products: MerchProductSnapshot[]): LaunchPackage {
  const approvedProducts = products.filter((product) => product.status === "Approved");
  const complianceNotes = complianceSummaries(products)
    .flatMap((summary) => summary.findings.map((finding) => `${finding.label}: ${finding.message}`));
  const listingDrafts = approvedProducts.map((product) => ({
    description: product.listingDescription ?? `${product.productName} for ${store.audience}. Final copy requires approval before publishing.`,
    productName: product.productName,
    title: product.listingTitle ?? product.productName
  }));

  return {
    approvedProducts,
    audienceSummary: `${store.businessName} serves ${store.audience}. The launch package should speak directly to this audience and keep the offer aligned with ${store.industry}.`,
    brandSummary: `${store.businessName} brand style: ${store.brandStyle}. Platform target: ${store.storePlatform}.`,
    clientApprovalChecklist: [
      "Client reviewed brand summary.",
      "Client reviewed approved products.",
      "Client approved listing titles and descriptions.",
      "Client acknowledged compliance warnings are not legal advice.",
      "Client approved launch timing and store build checklist."
    ],
    complianceNotes: Array.from(new Set([complianceDisclaimer, ...complianceNotes])),
    listingDrafts,
    launchChecklist: [
      "Confirm approved products only.",
      "Confirm disclosures and production partner settings.",
      "Run storefront QA.",
      "Confirm payment, shipping, and return settings.",
      "Publish after final user approval."
    ],
    productCollectionSummary: `${approvedProducts.length} approved products out of ${products.length} generated products are available for launch package inclusion.`,
    qrFlyerCopy: `Scan to shop ${store.businessName} official merch. Built for ${store.audience}.`,
    socialCaptions: [
      `${store.businessName} merch is preparing for launch. Built for ${store.audience}.`,
      `New ${store.industry} merch drop moving through final approval. Stay tuned.`,
      `Official ${store.businessName} product collection is being finalized now.`
    ],
    storeBuildChecklist: [
      `Create ${store.storePlatform} store shell.`,
      "Load approved product mockups.",
      "Add approved listing drafts.",
      "Configure POD production partner.",
      "Check taxes, shipping, policies, and payment settings."
    ]
  };
}

export function buildMerchReport(type: MerchReportType, store: MerchStoreSnapshot, products: MerchProductSnapshot[]): EntralReport {
  const approved = products.filter((product) => product.status === "Approved");
  const awaiting = products.filter((product) => product.status === "Awaiting Approval");
  const revision = products.filter((product) => product.status === "Needs Revision" || product.status === "Rejected");
  const totalRevenueEstimate = products.reduce((total, product) => total + product.retailPrice, 0);
  const totalProfitEstimate = products.reduce((total, product) => total + product.estimatedProfit, 0);
  const riskCount = complianceSummaries(products).filter((summary) => summary.requiresApproval).length;

  const sharedNextActions = [
    "Review generated product approvals.",
    "Resolve compliance warnings before publishing.",
    "Advance only approved products into launch execution."
  ];

  switch (type) {
    case "Store Launch Report":
      return {
        analysis: `${approved.length} approved products are eligible for launch package inclusion. ${awaiting.length} products remain in approval review.`,
        nextActions: ["Generate or refresh launch package.", ...sharedNextActions],
        recommendation: approved.length > 0 ? "Proceed with store build preparation for approved products only." : "Hold launch until at least one product is approved.",
        situation: `${store.businessName} launch status is ${store.launchStatus}.`,
        title: type
      };
    case "Weekly Store Report":
      return {
        analysis: `${products.length} products are tracked. ${revision.length} products require revision or rejection follow-up.`,
        nextActions: sharedNextActions,
        recommendation: "Use the next cycle to clear approval blockers and expand winning product lanes.",
        situation: `${store.businessName} weekly merch status is ${store.launchStatus}.`,
        title: type
      };
    case "Product Performance Report":
      return {
        analysis: `${approved.length} approved products are ready for future performance tracking once sales integrations are connected.`,
        nextActions: ["Connect sales data source when available.", "Compare approved product concepts by type.", "Prioritize products with strongest profit estimate."],
        recommendation: "Use approved product count and profit estimate as the current pre-launch performance proxy.",
        situation: "Live product performance data is not connected yet.",
        title: type
      };
    case "Sales Report":
      return {
        analysis: `Recorded store revenue is ${money(store.revenue)}. Generated draft retail value is ${money(totalRevenueEstimate)}.`,
        nextActions: ["Connect platform sales source in a future integration.", "Update store revenue after launch.", "Track approved product sales separately."],
        recommendation: "Use current sales report as a pre-integration estimate until marketplace data is connected.",
        situation: `${store.businessName} sales reporting is in manual mode.`,
        title: type
      };
    case "Profit Estimate Report":
      return {
        analysis: `Generated products estimate ${money(totalProfitEstimate)} total profit before live sales adjustments. Store-level estimated profit is ${money(store.estimatedProfit)}.`,
        nextActions: ["Review low-margin products.", "Adjust retail prices with the pricing calculator.", "Approve only products with acceptable margin."],
        recommendation: "Use pricing calculator outputs before launch approval.",
        situation: "Profit model is estimate-based and pending real sales data.",
        title: type
      };
    case "New Design Opportunity Report":
      return {
        analysis: `${store.productTypes.length} product lanes are defined: ${store.productTypes.join(", ") || "none"}. ${riskCount} products contain compliance warnings requiring approval attention.`,
        nextActions: ["Generate a new batch for underrepresented product types.", "Revise rejected concepts.", "Route approved concepts to design execution."],
        recommendation: "Expand product ideas only after current approval queue is reviewed.",
        situation: `${store.businessName} has active design opportunity capacity.`,
        title: type
      };
    case "Client Update Report":
      return {
        analysis: `${approved.length} products are approved, ${awaiting.length} are awaiting approval, and ${revision.length} require revision or rejection follow-up.`,
        nextActions: ["Send client only approved summaries.", "Keep flagged products internal until reviewed.", "Collect client approval on launch package."],
        recommendation: "Share a concise client-facing update after approval review is complete.",
        situation: `${store.clientName} client update is ready for internal review.`,
        title: type
      };
  }
}
