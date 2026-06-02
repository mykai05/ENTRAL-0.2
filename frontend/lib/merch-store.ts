export const merchStorePlatforms = ["Etsy", "Shopify", "Other"] as const;
export const merchPodProviders = ["Printify", "Printful", "Other"] as const;
export const merchApprovalStatuses = [
  "Not Started",
  "Research Approved",
  "Designs Pending",
  "Designs Approved",
  "Listings Approved",
  "Launch Approved"
] as const;
export const merchLaunchStatuses = [
  "Lead",
  "Discovery",
  "Researching",
  "Designing",
  "Awaiting Approval",
  "Building Store",
  "Launched",
  "Optimizing",
  "Paused",
  "Archived"
] as const;
export const podProductStatuses = [
  "Idea",
  "Prompt Ready",
  "Designed",
  "Mockup Created",
  "Listing Drafted",
  "Compliance Review",
  "Awaiting Approval",
  "Approved",
  "Published",
  "Needs Revision",
  "Rejected",
  "Archived"
] as const;
export const productBatchSizes = [5, 10, 15, 25] as const;
export const productBatchRiskTolerances = ["Low", "Medium", "High"] as const;
export const merchReportTypes = [
  "Store Launch Report",
  "Weekly Store Report",
  "Product Performance Report",
  "Sales Report",
  "Profit Estimate Report",
  "New Design Opportunity Report",
  "Client Update Report"
] as const;
export const pricingPlatformPresets = ["Etsy", "Shopify", "Manual"] as const;
export const merchAutomationLevels = [
  {
    description: "ENTRAL only organizes information. No records are generated automatically.",
    label: "Level 1 / Manual",
    value: "manual"
  },
  {
    description: "ENTRAL drafts product ideas, listing copy, prompts, and reports for approval.",
    label: "Level 2 / Assisted",
    value: "assisted"
  },
  {
    description: "ENTRAL can create tasks, product records, launch packages, and reports automatically.",
    label: "Level 3 / Semi-Automated",
    value: "semi_automated"
  },
  {
    description: "Reserved for future approved integrations. Publishing and client contact stay locked.",
    label: "Level 4 / Automated",
    value: "automated"
  }
] as const;

export type MerchStorePlatform = (typeof merchStorePlatforms)[number];
export type MerchPodProvider = (typeof merchPodProviders)[number];
export type MerchApprovalStatus = (typeof merchApprovalStatuses)[number];
export type MerchLaunchStatus = (typeof merchLaunchStatuses)[number];
export type PodProductStatus = (typeof podProductStatuses)[number];
export type ProductBatchSize = (typeof productBatchSizes)[number];
export type ProductBatchRiskTolerance = (typeof productBatchRiskTolerances)[number];
export type MerchReportType = (typeof merchReportTypes)[number];
export type PricingPlatformPreset = (typeof pricingPlatformPresets)[number];
export type MerchAutomationLevel = (typeof merchAutomationLevels)[number]["value"];

export type ClientMerchStore = {
  id: string;
  storeId: string;
  userId: string;
  clientName: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string | null;
  industry: string;
  audience: string;
  brandStyle: string;
  storePlatform: MerchStorePlatform;
  podProvider: MerchPodProvider;
  productTypes: string[];
  designCount: number;
  setupFee: number;
  monthlyFee: number;
  profitShare: number;
  approvalStatus: MerchApprovalStatus;
  launchStatus: MerchLaunchStatus;
  revenue: number;
  estimatedProfit: number;
  notes: string | null;
  commandMarshalId: string | null;
  commandMarshalName: string | null;
  commandGeneralId: string | null;
  commandGeneralName: string | null;
  createdAt: string;
  updatedAt: string;
};

type ClientCommandPathFields = "commandMarshalId" | "commandMarshalName" | "commandGeneralId" | "commandGeneralName";

export type ClientMerchStorePayload = Omit<ClientMerchStore, "id" | "storeId" | "userId" | "createdAt" | "updatedAt" | ClientCommandPathFields>
  & Partial<Pick<ClientMerchStore, ClientCommandPathFields>>;

export type PodProduct = {
  id: string;
  productId: string;
  storeId: string;
  store?: {
    id: string;
    businessName: string;
    clientName: string;
  };
  productName: string;
  productType: string;
  targetAudience: string;
  designTheme: string;
  designConcept: string;
  designPrompt: string;
  typographyDirection: string;
  colorDirection: string;
  mockupNotes: string | null;
  supplierCost: number;
  shippingCost: number;
  retailPrice: number;
  estimatedPlatformFees: number;
  estimatedProfit: number;
  profitMargin: number;
  listingTitle: string | null;
  listingDescription: string | null;
  tags: string[];
  complianceNotes: string | null;
  aiDisclosureNeeded: boolean;
  productionPartnerDisclosureNeeded: boolean;
  status: PodProductStatus;
  commandMarshalId: string | null;
  commandMarshalName: string | null;
  commandGeneralId: string | null;
  commandGeneralName: string | null;
  commandCommanderId: string | null;
  commandCommanderName: string | null;
  commandSoldierId: string | null;
  commandSoldierName: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProductCommandPathFields =
  | "commandMarshalId"
  | "commandMarshalName"
  | "commandGeneralId"
  | "commandGeneralName"
  | "commandCommanderId"
  | "commandCommanderName"
  | "commandSoldierId"
  | "commandSoldierName";

export type PodProductPayload = Omit<PodProduct, "id" | "productId" | "store" | "createdAt" | "updatedAt" | ProductCommandPathFields>
  & Partial<Pick<PodProduct, ProductCommandPathFields>>;

export type ProductBatchGeneratorInput = {
  audience: string;
  priceRange: {
    max: number;
    min: number;
  };
  productCount: ProductBatchSize;
  productTypes: string[];
  riskTolerance: ProductBatchRiskTolerance;
  storeId: string;
  styleDirection: string;
};

export type ProductBatchGeneratorResponse = {
  batch: {
    productCount: number;
    riskTolerance: ProductBatchRiskTolerance;
    storeId: string;
    warnings: string[];
  };
  products: PodProduct[];
};

export type ComplianceFinding = {
  category: string;
  label: string;
  matched: string[];
  message: string;
  requiresApproval: boolean;
  severity: "low" | "medium" | "high";
};

export type ComplianceSummary = {
  disclaimer: string;
  findings: ComplianceFinding[];
  requiresApproval: boolean;
  riskLevel: "low" | "medium" | "high";
};

export type PricingCalculatorInput = {
  adSpendEstimate: number;
  listingFee?: number;
  paymentProcessingEstimate?: number;
  platformFeePercent?: number;
  preset: PricingPlatformPreset;
  retailPrice: number;
  shippingCost: number;
  supplierCost: number;
};

export type PricingCalculatorResponse = {
  preset: PricingPlatformPreset;
  pricing: {
    breakEvenPrice: number;
    estimatedProfit: number;
    profitMargin: number;
    recommendedRetailPrice: number;
  };
};

export type EntralMerchReport = {
  analysis: string;
  nextActions: string[];
  recommendation: string;
  situation: string;
  title: MerchReportType;
};

export type LaunchPackageProduct = {
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

export type LaunchPackage = {
  approvedProducts: LaunchPackageProduct[];
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

export type GrowthDraft = {
  approvalStatus: "Draft - needs approval";
  channel: "Social" | "Shopify" | "Ads" | "Analytics";
  copy: string;
  title: string;
};

export type GrowthCampaignDraft = {
  audience: string;
  budgetGuardrail: string;
  name: string;
  objective: string;
  status: "Draft - spend locked";
};

export type GrowthAnalyticsLoop = {
  cadence: string;
  guardrail: string;
  metric: string;
  source: string;
};

export type GrowthPlan = {
  adCampaignDrafts: GrowthCampaignDraft[];
  analyticsLoop: GrowthAnalyticsLoop[];
  approvalQueue: string[];
  auditEvents: string[];
  blockedActions: string[];
  commercePrep: string[];
  contentDrafts: GrowthDraft[];
  mode: "Mock Mode";
  readinessScore: number;
  summary: string;
};

export type GrowthApprovalAction = {
  approvalStatus: "Pending human approval";
  channel: "Social" | "Shopify" | "Ads" | "Analytics";
  executionState: "Locked - no external action";
  id: string;
  requiredControls: string[];
  scheduledFor: string | null;
  summary: string;
  title: string;
};

export type GrowthApprovalPacket = {
  actions: GrowthApprovalAction[];
  auditEvents: string[];
  blockedActions: string[];
  businessName: string;
  costGuardrail: string;
  createdAt: string;
  humanApprovalRequired: true;
  id: string;
  logging: string;
  mode: "Mock Mode";
  note: string | null;
  scheduledFor: string | null;
  status: "Pending approval";
  storeId: string;
  summary: string;
};

export type GrowthApprovalRecord = {
  auditLogId: string | null;
  createdAt: string;
  executionState: "No external action executed";
  id: string;
  mode: "Mock Mode";
  packet: GrowthApprovalPacket;
  requestAuditLogId: string | null;
  reviewAuditLogId: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  reviewNote: string | null;
  scheduledFor: string | null;
  status: "pending" | "approved" | "rejected";
  statusLabel: "Pending approval" | "Approved - execution still locked" | "Rejected";
  updatedAt: string;
};

export type GrowthApprovalResponse = {
  approval: GrowthApprovalRecord;
  auditLogId: string;
  packet: GrowthApprovalPacket;
};

export type GrowthApprovalListResponse = {
  items: GrowthApprovalRecord[];
};

export type GrowthApprovalReviewResponse = {
  approval: GrowthApprovalRecord;
  auditLogId: string;
  message: string;
};

export type GrowthOrchestrationStep = {
  actionId: string;
  channel: "Social" | "Shopify" | "Ads" | "Analytics";
  checklist: string[];
  executionState: "Locked - no external action";
  guardrail: string;
  scheduledFor: string | null;
  status: "Ready for manual handoff";
  title: string;
};

export type GrowthOrchestrationPreview = {
  approvalPacketId: string;
  auditEvents: string[];
  businessName: string;
  costGuardrail: string;
  estimatedAiCostCents: 0;
  estimatedExternalSpendCents: 0;
  externalExecution: false;
  mode: "Read-only orchestration preview";
  providerContacted: false;
  scheduledFor: string | null;
  status: "Approved - execution locked";
  steps: GrowthOrchestrationStep[];
  summary: string;
};

export type GrowthOrchestrationPreviewResponse = {
  auditLogId: string;
  preview: GrowthOrchestrationPreview;
};

export function formatMerchCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(value);
}
