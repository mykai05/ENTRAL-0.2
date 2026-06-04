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

export type MerchProviderAdapter = "Printify" | "Printful" | "Etsy" | "Shopify";

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
  options: {
    includeUnapproved: boolean;
    maxProducts: number;
  };
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

export type ProviderPayloadPackageResponse = {
  package: ProviderPayloadPackage;
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
  channel: "Social" | "Shopify" | "Ads" | "Analytics" | "Provider";
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
  providerPayloadPackage?: {
    adapterCoverage: MerchProviderAdapter[];
    generatedAt: string;
    payloadCount: number;
    readinessScore: number;
    summary: string;
  };
  rollbackChecklist?: string[];
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

export type ProviderPayloadApprovalResponse = GrowthApprovalResponse & {
  providerPackage: ProviderPayloadPackage;
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

export type ProviderHandoffResponse = {
  auditLogId: string;
  bundle: ProviderHandoffBundle;
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
  channel: "Social" | "Shopify" | "Ads" | "Analytics" | "Provider";
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

export type RevenueEngineAction = "scale" | "prepare_launch" | "generate" | "watch" | "revise" | "pause" | "kill";

export type RevenueEngineThresholds = {
  maxRotationUpdates: number;
  minPortfolioProductsPerStore: number;
  minProductMargin: number;
  minProductProfit: number;
  minScaleProducts: number;
  scaleProductMargin: number;
  scaleProductProfit: number;
};

export type RevenueProductDecision = {
  action: RevenueEngineAction;
  confidence: number;
  dedupeKey: string;
  externalExecution: false;
  priority: number;
  productId: string;
  productName: string;
  reason: string;
  recommendedInternalStatus?: PodProductStatus;
  riskLevel: "low" | "medium" | "high";
  status: PodProductStatus;
  storeId: string;
};

export type RevenueStoreDecision = {
  action: RevenueEngineAction;
  confidence: number;
  externalExecution: false;
  launchStatus: MerchLaunchStatus;
  priority: number;
  reason: string;
  recommendedLaunchStatus?: MerchLaunchStatus;
  storeId: string;
  storeName: string;
};

export type RevenueRotationChange = {
  action: "pause" | "kill";
  fromStatus: string;
  reason: string;
  targetId: string;
  targetName: string;
  targetType: "store" | "product";
  toStatus: string;
};

export type RevenuePipelineAction = {
  action: RevenueEngineAction;
  externalExecution: false;
  id: string;
  priority: number;
  summary: string;
  targetId: string;
  targetType: "store" | "product" | "portfolio";
  title: string;
};

export type RevenueAssetRotationDecision = "scale" | "watch" | "pause" | "kill";
export type RevenueAssetScoreBand = "excellent" | "healthy" | "watch" | "weak" | "critical";

export type RevenueAssetScoreBreakdown = {
  economicsScore: number;
  finalRank: number;
  readinessScore: number;
  riskPenalty: number;
  velocity: number;
};

export type RevenueAssetPerformanceSignal = {
  action: RevenueAssetRotationDecision;
  confidence: number;
  conversionRate: number;
  evidenceGrade: "none" | "thin" | "usable" | "strong";
  grossRevenue: number;
  netProfit: number;
  netRevenue: number;
  profitMargin: number;
  profitVelocity: number;
  reason: string;
  revenueVelocity: number;
  snapshots: number;
  sourceAction: RevenueAssetRotationDecision;
};

export type RevenueAssetScore = {
  assetId: string;
  assetName: string;
  assetScore: RevenueAssetScoreBreakdown;
  assetType: "product" | "store";
  confidence: number;
  economics: {
    estimatedProfit: number;
    profitMargin: number;
    retailValue: number;
    revenue: number;
  };
  evidence: string[];
  externalExecution: false;
  nextInternalState: PodProductStatus | MerchLaunchStatus | null;
  performance?: RevenueAssetPerformanceSignal;
  priority: number;
  providerContacted: false;
  readiness: {
    approvedProducts?: number;
    listingReady?: boolean;
    portfolioReady?: boolean;
    status: PodProductStatus | MerchLaunchStatus;
  };
  reason: string;
  recommendation: RevenueAssetRotationDecision;
  recommendedInternalStatus?: PodProductStatus;
  recommendedLaunchStatus?: MerchLaunchStatus;
  riskLevel: "low" | "medium" | "high";
  rotationDecision: RevenueAssetRotationDecision;
  rotationReason: string;
  score: number;
  scoreBand: RevenueAssetScoreBand;
  storeId: string;
  storeName: string;
};

export type RevenueEnginePlan = {
  assetScores: RevenueAssetScore[];
  auditEvents: string[];
  blockedExternalActions: string[];
  decisionCounts: Record<RevenueEngineAction, number>;
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Revenue Engine";
  pipelineActions: RevenuePipelineAction[];
  productDecisions: RevenueProductDecision[];
  rotationChanges: RevenueRotationChange[];
  storeDecisions: RevenueStoreDecision[];
  summary: string;
  thresholds: RevenueEngineThresholds;
  totals: {
    approvedProducts: number;
    archivedProducts: number;
    estimatedProfit: number;
    estimatedRetailValue: number;
    highRiskProducts: number;
    products: number;
    publishedProducts: number;
    scaleAssets: number;
    stores: number;
    storesReadyToScale: number;
    watchAssets: number;
    totalRevenue: number;
  };
};

export type RevenueAssetPortfolio = {
  assets: RevenueAssetScore[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Engine Asset Portfolio";
  providerContacted: false;
  rotationChanges: RevenueRotationChange[];
  summary: string;
  thresholds: RevenueEngineThresholds;
  totals: {
    assets: number;
    estimatedProfit: number;
    kill: number;
    pause: number;
    performanceSnapshots: number;
    profitVelocity: number;
    products: number;
    revenueVelocity: number;
    rotationChanges: number;
    scale: number;
    stores: number;
    totalRevenue: number;
    trackedAssets: number;
    watch: number;
  };
};

export type RevenueEnginePortfolioResponse = {
  portfolio: RevenueAssetPortfolio;
};

export type RevenueBusinessFleetLane = "launch_now" | "scale" | "watch" | "quality_repair" | "throttle" | "kill";
export type RevenueBusinessFleetScheduleState = "ready_parallel" | "queued" | "throttled" | "blocked";
export type RevenueBusinessFleetQualityStatus = "pass" | "watch" | "block";

export type RevenueBusinessFleetScore = {
  economicsScore: number;
  finalRank: number;
  killPressure: number;
  qualityScore: number;
  readinessScore: number;
  scalePressure: number;
};

export type RevenueBusinessFleetBusiness = {
  assetCount: number;
  blockedExternalActions: string[];
  businessId: string;
  businessName: string;
  externalExecution: false;
  lane: RevenueBusinessFleetLane;
  nextInternalAction: {
    endpoint: string;
    label: string;
    reason: string;
    state: string;
  };
  parallelism: {
    launchSlots: number;
    maxInternalJobs: number;
    scaleSlots: number;
  };
  productAssets: number;
  profitVelocity: number;
  providerContacted: false;
  qualityGate: {
    reasons: string[];
    status: RevenueBusinessFleetQualityStatus;
  };
  recommendationCounts: Record<RevenueAssetRotationDecision, number>;
  revenueVelocity: number;
  scheduleState: RevenueBusinessFleetScheduleState;
  score: RevenueBusinessFleetScore;
  shardId: string;
  topAsset: {
    assetId: string;
    assetName: string;
    assetType: "product" | "store";
    finalRank: number;
    recommendation: RevenueAssetRotationDecision;
  } | null;
  trackedAssets: number;
};

export type RevenueBusinessFleetShard = {
  blocked: number;
  businesses: number;
  capacity: number;
  id: string;
  laneCounts: Record<RevenueBusinessFleetLane, number>;
  queued: number;
  readyParallel: number;
  throttled: number;
};

export type RevenueBusinessFleetPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  businesses: RevenueBusinessFleetBusiness[];
  capacity: {
    currentBusinesses: number;
    launchWaveSize: number;
    maxParallelLaunches: number;
    maxParallelScaleActions: number;
    parallelSlotsConfigured: number;
    shardCount: number;
    targetBusinesses: number;
    targetGap: number;
  };
  externalExecution: false;
  generatedAt: string;
  launchWave: RevenueBusinessFleetBusiness[];
  mode: "Revenue Business Fleet Scheduler";
  options: {
    killPressureThreshold: number;
    launchWaveSize: number;
    maxParallelLaunches: number;
    maxParallelScaleActions: number;
    qualityFloor: number;
    shardCount: number;
    targetBusinesses: number;
  };
  providerContacted: false;
  shards: RevenueBusinessFleetShard[];
  sourceSignals: {
    assetPortfolioGeneratedAt: string;
    financialKillPressure: number;
    financialScalePressure: number;
    firstBusinessLaunchReady: number;
  };
  summary: string;
  totals: {
    blocked: number;
    businesses: number;
    kill: number;
    launchNow: number;
    qualityBlock: number;
    qualityPass: number;
    qualityRepair: number;
    qualityWatch: number;
    queued: number;
    readyParallel: number;
    scale: number;
    throttled: number;
    watch: number;
  };
};

export type RevenueBusinessFleetSchedulerResponse = {
  plan: RevenueBusinessFleetPlan;
};

export type RevenueHundredStoreOperationsStatus =
  | "ready_for_100_store_internal_operations"
  | "ready_to_build_to_100"
  | "needs_store_generation"
  | "needs_quality_repair"
  | "blocked";

export type RevenueHundredStoreOperationsGateStatus = "pass" | "watch" | "block";
export type RevenueHundredStoreApplicationStatus = "ready" | "partial" | "missing" | "blocked";
export type RevenueHundredStoreApplicationRole = RevenueLiveConnectorBoundaryRole;
export type RevenueHundredStoreInternalJobType =
  | "advisory_growth_allocation"
  | "generate_products"
  | "monitor_performance"
  | "pause_or_kill_review"
  | "prepare_connector_packet"
  | "prepare_launch_package"
  | "queue_organic_content"
  | "repair_quality";
export type RevenueHundredStoreMonitoringCadence =
  | "immediate_rotation_review"
  | "twice_daily_until_first_signal"
  | "daily"
  | "every_3_days"
  | "weekly_watch";
export type RevenueHundredStoreMonitoringSignalStatus =
  | "signal_ready"
  | "needs_manual_snapshot"
  | "needs_readonly_import"
  | "rotation_review_required"
  | "scale_review_required";

export type RevenueHundredStoreControlGrid = {
  auditEvents: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "100 Store Operating Control Grid";
  providerContacted: false;
  safeToRunParallelInternalJobs: boolean;
  shards: Array<{
    availableStoreSlots: number;
    capacityUtilizationPercent: number;
    externalExecution: false;
    id: string;
    laneCounts: Record<RevenueBusinessFleetLane, number>;
    maxStores: number;
    nextInternalFocus: string;
    overloaded: boolean;
    providerContacted: false;
    readyInternalJobs: number;
    stores: number;
    throttledOrBlockedStores: number;
  }>;
  stores: Array<{
    allowedInternalJobs: RevenueHundredStoreInternalJobType[];
    applicationReadiness: {
      approvedReadOnlyConnectors: number;
      missingRoles: string[];
      readinessStatus: RevenueHundredStoreApplicationStatus;
      requiredRoles: number;
    };
    businessId: string;
    businessName: string;
    externalExecution: false;
    lane: RevenueBusinessFleetLane;
    nextInternalAction: string;
    productAssets: number;
    profitVelocity: number;
    providerContacted: false;
    qualityStatus: RevenueBusinessFleetQualityStatus;
    queuePosition: number;
    scheduleState: RevenueBusinessFleetScheduleState;
    score: {
      finalRank: number;
      killPressure: number;
      scalePressure: number;
    };
    shardId: string;
  }>;
  summary: string;
  totals: {
    applicationBlocked: number;
    applicationMissing: number;
    applicationPartial: number;
    applicationReady: number;
    configuredShards: number;
    currentStores: number;
    killLaneStores: number;
    launchLaneStores: number;
    missingStoreSlots: number;
    overloadedShards: number;
    readyInternalJobs: number;
    readyParallelStores: number;
    repairLaneStores: number;
    scaleLaneStores: number;
    targetStores: number;
    visibleStores: number;
    watchLaneStores: number;
  };
};

export type RevenueHundredStoreApplicationConnectionWorkbench = {
  auditEvents: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "100 Store Application Connection Workbench";
  packets: Array<{
    approvalChecklist: string[];
    connectionMode: "internal_preparation_only";
    credentialEnvVars: string[];
    externalExecution: false;
    lane: RevenueBusinessFleetLane | "future_store_slot";
    providerContacted: false;
    providerOptions: string[];
    readOnlyScopes: string[];
    requiredArtifacts: string[];
    role: RevenueHundredStoreApplicationRole;
    rollbackPlan: string[];
    setupStatus: "ready_for_internal_packet" | "already_mapped" | "blocked_by_store_quality";
    shardId: string;
    storeId: string | null;
    storeName: string;
    title: string;
  }>;
  providerContacted: false;
  summary: string;
  templates: Array<{
    connectionMode: "internal_preparation_only";
    externalExecution: false;
    providerContacted: false;
    role: RevenueHundredStoreApplicationRole;
    slotCount: number;
    title: string;
  }>;
  totals: {
    alreadyMappedPackets: number;
    blockedPackets: number;
    credentialEnvVars: number;
    futureStoreTemplates: number;
    packets: number;
    readyPackets: number;
    requiredArtifacts: number;
    rollbackPlans: number;
    storesCovered: number;
  };
};

export type RevenueHundredStoreConnectorActivationStatus =
  | "ready_for_connection_design"
  | "credential_custody_required"
  | "waiting_for_store_shell"
  | "blocked_by_store_quality";

export type RevenueHundredStoreConnectorActivationDryRunRequest = {
  approvalRequired: true;
  endpointTemplate: string;
  idempotencyKey: string;
  method: "GET" | "POST";
  payloadFields: string[];
  stepId: string;
  title: string;
};

export type RevenueHundredStoreConnectorActivationRow = {
  approvalChecklist: string[];
  credentialCustodyChecklist: string[];
  credentialEnvVars: string[];
  dryRunRequestMap: RevenueHundredStoreConnectorActivationDryRunRequest[];
  externalExecution: false;
  providerContacted: false;
  providerOptions: string[];
  readinessScore: number;
  readOnlyScopes: string[];
  requiredArtifacts: string[];
  role: RevenueHundredStoreApplicationRole;
  rowId?: string;
  rollbackPlan: string[];
  shardId: string;
  status: RevenueHundredStoreConnectorActivationStatus;
  storeId: string | null;
  storeName: string;
  title: string;
  writeScopesBlocked: string[];
};

export type RevenueHundredStoreConnectorActivationMatrix = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "100 Store Connector Activation Matrix";
  providerContacted: false;
  rows: RevenueHundredStoreConnectorActivationRow[];
  summary: string;
  totals: {
    blockedByQuality: number;
    credentialCustodyRequired: number;
    credentialEnvVarRefs: number;
    currentStoreRows: number;
    dryRunRequestMaps: number;
    futureStoreRows: number;
    maxSelectableRows: number;
    readyForConnectionDesign: number;
    requiredRoles: number;
    rows: number;
    storesCovered: number;
    targetStores: number;
    waitingForStoreShell: number;
    writeScopesBlocked: number;
  };
};

export type RevenueHundredStoreMonitoringItem = {
  businessId: string;
  businessName: string;
  cadence: RevenueHundredStoreMonitoringCadence;
  externalExecution: false;
  lane: RevenueBusinessFleetLane;
  nextInternalAction: string;
  priority: number;
  profitVelocity: number;
  providerContacted: false;
  requiredSignals: string[];
  rotationDecision: RevenueBusinessFleetLane;
  scheduleState: RevenueBusinessFleetScheduleState;
  shardId: string;
  signalStatus: RevenueHundredStoreMonitoringSignalStatus;
  trackedAssets: number;
  triggerReason: string;
};

export type RevenueHundredStoreMonitoringMatrix = {
  auditEvents: string[];
  externalExecution: false;
  generatedAt: string;
  items: RevenueHundredStoreMonitoringItem[];
  mode: "100 Store Monitoring Matrix";
  providerContacted: false;
  queues: {
    manualSnapshots: RevenueHundredStoreMonitoringItem[];
    readOnlyImports: RevenueHundredStoreMonitoringItem[];
    rotationReviews: RevenueHundredStoreMonitoringItem[];
    scaleReviews: RevenueHundredStoreMonitoringItem[];
  };
  summary: string;
  totals: {
    dailyProfitVelocity: number;
    every3Days: number;
    immediateRotationReviews: number;
    manualSnapshots: number;
    missingStoreSlots: number;
    readOnlyImports: number;
    scaleReviews: number;
    signalReady: number;
    storesCovered: number;
    twiceDaily: number;
    weeklyWatch: number;
  };
};

export type RevenueHundredStoreGrowthAllocationLane =
  | "organic_first"
  | "paid_scale_review"
  | "defensive_hold"
  | "watch";

export type RevenueHundredStoreGrowthAllocationCandidate = {
  adGrowthBucketSharePercent: number;
  allocationLane: RevenueHundredStoreGrowthAllocationLane;
  allocationWeight: number;
  businessId: string;
  businessName: string;
  eligibleForPaidScaleReview: boolean;
  externalExecution: false;
  guardrails: string[];
  killPressure: number;
  lane: RevenueBusinessFleetLane;
  nextInternalAction: string;
  priority: number;
  profitVelocity: number;
  providerContacted: false;
  reason: string;
  recommendedSpendPriority: "none" | "low_test" | "scale_test";
  requiredApproval: string;
  scalePressure: number;
  shardId: string;
  signalStatus: RevenueHundredStoreMonitoringSignalStatus;
  trackedAssets: number;
};

export type RevenueHundredStoreGrowthAllocationRouter = {
  auditEvents: string[];
  blockedExternalActions: string[];
  candidates: RevenueHundredStoreGrowthAllocationCandidate[];
  externalExecution: false;
  generatedAt: string;
  mode: "100 Store Growth Allocation Router";
  providerContacted: false;
  summary: string;
  totals: {
    advisoryOnly: true;
    averageKillPressure: number;
    averageScalePressure: number;
    candidates: number;
    defensiveHold: number;
    organicFirst: number;
    paidScaleReview: number;
    retainedForDefensePercent: number;
    routedAdGrowthPercent: number;
    storesCovered: number;
    totalAllocationWeight: number;
    watch: number;
  };
};

export type RevenueHundredStoreProductDepthDraftStatus =
  | "ready_for_internal_draft"
  | "waiting_for_store_shell"
  | "blocked_by_quality";

export type RevenueHundredStoreProductDepthDraft = {
  approvalChecklist: string[];
  contentTieIn: string;
  currentProducts: number;
  designPrompt: string;
  draftId: string;
  externalExecution: false;
  facelessHook: string;
  lane: RevenueBusinessFleetLane | "future_store_slot";
  listingAngle: string;
  missingProducts: number;
  organicMove: string;
  priority: number;
  productType: string;
  providerContacted: false;
  requiredProducts: number;
  shardId: string;
  status: RevenueHundredStoreProductDepthDraftStatus;
  storeId: string | null;
  storeName: string;
  title: string;
};

export type RevenueHundredStoreProductDepthQueue = {
  auditEvents: string[];
  blockedExternalActions: string[];
  drafts: RevenueHundredStoreProductDepthDraft[];
  externalExecution: false;
  generatedAt: string;
  mode: "100 Store Product Depth Queue";
  providerContacted: false;
  summary: string;
  totals: {
    blockedDrafts: number;
    currentStoreDrafts: number;
    drafts: number;
    futureStoreDrafts: number;
    maxSelectableDrafts: number;
    productDraftDeficit: number;
    readyDrafts: number;
    storesCovered: number;
    targetStores: number;
    waitingDrafts: number;
  };
};

export type RevenueHundredStoreLaunchPacketStatus =
  | "ready_for_internal_launch_review"
  | "waiting_for_store_shell"
  | "needs_application_packets"
  | "needs_product_depth"
  | "blocked_by_quality";

export type RevenueHundredStoreLaunchPacket = {
  applicationPacketCount: number;
  approvalChecklist: string[];
  contentIdeas: string[];
  currentProducts: number;
  externalExecution: false;
  growthLane: RevenueHundredStoreGrowthAllocationLane | "unrouted";
  launchPacketId: string;
  missingApplicationRoles: string[];
  organicMoves: string[];
  priority: number;
  productDraftCount: number;
  providerContacted: false;
  readinessScore: number;
  requiredApplicationRoles: number;
  requiredProducts: number;
  shardId: string;
  status: RevenueHundredStoreLaunchPacketStatus;
  storeId: string | null;
  storeName: string;
  summary: string;
};

export type RevenueHundredStoreLaunchPacketQueue = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "100 Store Launch Packet Queue";
  packets: RevenueHundredStoreLaunchPacket[];
  providerContacted: false;
  summary: string;
  totals: {
    blockedByQuality: number;
    currentStorePackets: number;
    futureStorePackets: number;
    maxSelectablePackets: number;
    needsApplicationPackets: number;
    needsProductDepth: number;
    packets: number;
    readyForReview: number;
    targetStores: number;
    waitingForStoreShell: number;
  };
};

export type RevenueHundredStoreAutonomyJobType =
  | "prepare_store_shell"
  | "record_app_connection_packet"
  | "record_connector_activation_row"
  | "record_product_depth_draft"
  | "record_launch_packet"
  | "record_monitoring_evidence"
  | "review_growth_allocation"
  | "review_rotation";

export type RevenueHundredStoreAutonomyJobStatus =
  | "ready_internal"
  | "approval_required"
  | "waiting"
  | "blocked";

export type RevenueHundredStoreAutonomyJob = {
  approvalGate: string;
  blockedExternalActions: string[];
  expectedInternalEffect: string;
  externalExecution: false;
  jobId: string;
  jobType: RevenueHundredStoreAutonomyJobType;
  priority: number;
  providerContacted: false;
  requiresOwnerApproval: boolean;
  shardId: string;
  sourceId: string;
  sourceModule: string;
  status: RevenueHundredStoreAutonomyJobStatus;
  storeId: string | null;
  storeName: string;
  summary: string;
};

export type RevenueHundredStoreAutonomyRunQueue = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  jobs: RevenueHundredStoreAutonomyJob[];
  mode: "100 Store Autonomy Run Queue";
  providerContacted: false;
  summary: string;
  totals: {
    approvalRequired: number;
    blocked: number;
    cleanParallelJobs: number;
    jobs: number;
    maxJobsPerShard: number;
    maxSelectableJobs: number;
    readyInternal: number;
    shardCount: number;
    storesCovered: number;
    targetStores: number;
    waiting: number;
  };
};

export type RevenueHundredStoreWorkLeaseStatus =
  | "ready_to_claim"
  | "approval_hold"
  | "waiting_dependency"
  | "blocked";

export type RevenueHundredStoreWorkLease = {
  approvalGate: string;
  blockedExternalActions: string[];
  claimWindowMinutes: number;
  dedupeKey: string;
  dependencyRefs: string[];
  expectedInternalEffect: string;
  expiresAt: string;
  externalExecution: false;
  idempotencyKey: string;
  jobId: string;
  jobType: RevenueHundredStoreAutonomyJobType;
  leaseId: string;
  priority: number;
  providerContacted: false;
  retryPolicy: {
    backoffMinutes: number;
    maxAttempts: number;
    requiresFreshPlanAfterFailure: boolean;
  };
  shardId: string;
  sourceModule: string;
  status: RevenueHundredStoreWorkLeaseStatus;
  storeId: string | null;
  storeName: string;
  summary: string;
};

export type RevenueHundredStoreWorkLeasePlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  leases: RevenueHundredStoreWorkLease[];
  mode: "100 Store Internal Work Lease Plan";
  providerContacted: false;
  queues: {
    approvalHold: RevenueHundredStoreWorkLease[];
    blocked: RevenueHundredStoreWorkLease[];
    readyToClaim: RevenueHundredStoreWorkLease[];
    waitingDependency: RevenueHundredStoreWorkLease[];
  };
  summary: string;
  totals: {
    approvalHold: number;
    blocked: number;
    claimWindowMinutes: number;
    cleanParallelLeases: number;
    duplicateDedupeKeys: number;
    leases: number;
    maxLeasesPerShard: number;
    maxSelectableLeases: number;
    readyToClaim: number;
    shardCount: number;
    storesCovered: number;
    targetStores: number;
    waitingDependency: number;
  };
};

export type RevenueHundredStoreDailyOperatingLoopPhase =
  | "safety_gate_snapshot"
  | "application_connection_packets"
  | "connector_activation_matrix"
  | "monitoring_cycle"
  | "growth_allocation_review"
  | "product_depth_repair"
  | "launch_packet_review"
  | "autonomy_run_queue"
  | "work_lease_claims"
  | "store_batch_creation"
  | "weak_lane_rotation";

export type RevenueHundredStoreDailyOperatingLoopStatus = "ready" | "waiting" | "blocked" | "approval_required";

export type RevenueHundredStoreDailyOperatingLoopStep = {
  approvalRequired: boolean;
  blockers: string[];
  confirmation: string;
  endpoint: string;
  expectedInternalEffect: string;
  externalExecution: false;
  maxItems: number;
  phase: RevenueHundredStoreDailyOperatingLoopPhase;
  priority: number;
  providerContacted: false;
  reason: string;
  status: RevenueHundredStoreDailyOperatingLoopStatus;
  stepId: string;
  title: string;
};

export type RevenueHundredStoreDailyOperatingLoop = {
  auditEvents: string[];
  blockedExternalActions: string[];
  cadence: "daily_private_internal_ops";
  externalExecution: false;
  generatedAt: string;
  mode: "100 Store Daily Operating Loop";
  providerContacted: false;
  steps: RevenueHundredStoreDailyOperatingLoopStep[];
  summary: string;
  totals: {
    approvalRequired: number;
    blocked: number;
    executableInternalSteps: number;
    ready: number;
    safeBatchSize: number;
    storeGap: number;
    storesCovered: number;
    waiting: number;
  };
};

export type RevenueHundredStoreDailySupervisorMode = "safe_internal_only" | "include_batch_creation";

export type RevenueHundredStoreDailySupervisorAction =
  | "confirm_safety"
  | "record_app_connection_packets"
  | "record_connector_activation_matrix"
  | "record_monitoring_cycle"
  | "record_product_depth_drafts"
  | "record_launch_packets"
  | "record_autonomy_run_queue"
  | "record_work_leases"
  | "review_growth_allocation"
  | "run_money_army_step"
  | "manual_review"
  | "wait";

export type RevenueHundredStoreDailySupervisorStatus =
  | "selected"
  | "approval_required"
  | "blocked"
  | "waiting"
  | "manual_only";

export type RevenueHundredStoreDailySupervisorStep = {
  action: RevenueHundredStoreDailySupervisorAction;
  blockers: string[];
  confirmation: string;
  endpoint: string;
  expectedInternalEffect: string;
  externalExecution: false;
  maxItems: number;
  phase: RevenueHundredStoreDailyOperatingLoopPhase;
  priority: number;
  providerContacted: false;
  reason: string;
  requiresOwnerApproval: boolean;
  sourceStatus: RevenueHundredStoreDailyOperatingLoopStatus;
  status: RevenueHundredStoreDailySupervisorStatus;
  stepId: string;
  title: string;
};

export type RevenueHundredStoreDailySupervisorPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "100 Store Daily Supervisor";
  operatingMode: RevenueHundredStoreDailySupervisorMode;
  providerContacted: false;
  selectedSteps: RevenueHundredStoreDailySupervisorStep[];
  steps: RevenueHundredStoreDailySupervisorStep[];
  summary: string;
  totals: {
    approvalRequired: number;
    blocked: number;
    manualOnly: number;
    maxSteps: number;
    selected: number;
    storesCovered: number;
    waiting: number;
  };
};

export type RevenueHundredStoreCapacityProofStatus = "pass" | "watch" | "block";

export type RevenueHundredStoreCapacityProofCheck = {
  capacity: number;
  checkId: string;
  evidence: string[];
  externalExecution: false;
  gap: number;
  nextInternalAction: string;
  projectedLoad: number;
  providerContacted: false;
  status: RevenueHundredStoreCapacityProofStatus;
  title: string;
};

export type RevenueHundredStoreCapacityProof = {
  auditEvents: string[];
  blockedExternalActions: string[];
  checks: RevenueHundredStoreCapacityProofCheck[];
  externalExecution: false;
  generatedAt: string;
  mode: "100 Store Capacity Proof";
  providerContacted: false;
  status: RevenueHundredStoreCapacityProofStatus;
  stressProfile: {
    applicationBoundaryCoveragePercent: number;
    cleanSimultaneousStoreCapacity: number;
    futureStoreSlotsCovered: number;
    maximumCleanStoresAtShardLimit: number;
    monitoringSweepCycles: number;
    preparedApplicationBoundaries: number;
    productDraftDeficit: number;
    projectedDailySupervisorSteps: number;
    requiredApplicationBoundaries: number;
    safeBatchSize: number;
    shardCapacity: number;
    storeGap: number;
    targetStores: number;
  };
  summary: string;
  totals: {
    block: number;
    cleanSimultaneousStoreCapacity: number;
    pass: number;
    targetStores: number;
    watch: number;
  };
};

export type RevenueHundredStoreOperationsPlan = {
  applicationReadiness: {
    applications: Array<{
      approvedReadOnlyConnectors: number;
      blockedStores: number;
      externalExecution: false;
      missingStores: number;
      nextInternalAction: string;
      pendingStores: number;
      providerContacted: false;
      providerNames: string[];
      readyStores: number;
      readinessStatus: "ready" | "partial" | "missing" | "blocked";
      requiredStores: number;
      role: RevenueLiveConnectorBoundaryRole | "analytics";
      title: string;
    }>;
    summary: string;
    totals: {
      approvedReadOnlyConnectors: number;
      blockedEntries: number;
      mappedStores: number;
      missingStores: number;
      needsOperatorReview: number;
      needsReadOnlyApproval: number;
      readinessCoveragePercent: number;
      readyForDesign: number;
      requiredBoundaries: number;
      targetStores: number;
    };
  };
  auditEvents: string[];
  applicationConnectionWorkbench: RevenueHundredStoreApplicationConnectionWorkbench;
  autonomyRunQueue: RevenueHundredStoreAutonomyRunQueue;
  batchPlan: {
    batchRunsRequired: number;
    currentStores: number;
    productDraftDeficit: number;
    recommendedBatchSize: number;
    storeGap: number;
    targetStores: number;
  };
  blockedExternalActions: string[];
  concurrency: {
    configuredParallelSlots: number;
    currentShards: number;
    maxStoresPerShard: number;
    minimumRecommendedShards: number;
    overloadedShardIds: string[];
    safeInternalJobSlots: number;
    shardCount: number;
  };
  connectorActivationMatrix: RevenueHundredStoreConnectorActivationMatrix;
  controlGrid: RevenueHundredStoreControlGrid;
  externalExecution: false;
  gates: Array<{
    actionEndpoint: string;
    evidence: string[];
    externalExecution: false;
    providerContacted: false;
    status: RevenueHundredStoreOperationsGateStatus;
    title: string;
  }>;
  generatedAt: string;
  growthAllocationRouter: RevenueHundredStoreGrowthAllocationRouter;
  dailyOperatingLoop: RevenueHundredStoreDailyOperatingLoop;
  capacityProof: RevenueHundredStoreCapacityProof;
  launchPacketQueue: RevenueHundredStoreLaunchPacketQueue;
  mode: "100 Store Operations Readiness";
  monitoringMatrix: RevenueHundredStoreMonitoringMatrix;
  nextActions: Array<{
    confirmation: string;
    endpoint: string;
    expectedInternalEffect: string;
    externalExecution: false;
    priority: number;
    providerContacted: false;
    reason: string;
    status: RevenueMoneyArmyBatchPipelineStageStatus;
    title: string;
  }>;
  operatingStatus: RevenueHundredStoreOperationsStatus;
  pipeline: {
    blockedStages: number;
    nextStage: RevenueMoneyArmyBatchPipelineStageName | null;
    readyStages: number;
    seedCandidates: number;
    stages: number;
  };
  profitAcceleration: {
    dailyProfitVelocity: number;
    dailyRevenueVelocity: number;
    killLaneStores: number;
    launchNowStores: number;
    repairLaneStores: number;
    scaleLaneStores: number;
    topScaleCandidates: Array<{
      businessId: string;
      businessName: string;
      profitVelocity: number;
      scalePressure: number;
      shardId: string;
    }>;
  };
  productDepthQueue: RevenueHundredStoreProductDepthQueue;
  providerContacted: false;
  readinessScore: number;
  summary: string;
  totals: {
    approvalPacketsReady: number;
    approvalPacketsWaiting: number;
    currentStores: number;
    gatesBlocked: number;
    gatesPass: number;
    gatesWatch: number;
    readyParallelStores: number;
    storeGap: number;
    targetStores: number;
  };
  workLeasePlan: RevenueHundredStoreWorkLeasePlan;
};

export type RevenueHundredStoreOperationsResponse = {
  dailySupervisor: RevenueHundredStoreDailySupervisorPlan;
  fleet: RevenueBusinessFleetPlan;
  gapPlan: RevenueBusinessFleetLaunchGapPlan;
  pipeline: RevenueMoneyArmyBatchPipelinePlan;
  plan: RevenueHundredStoreOperationsPlan;
};

export type RevenueHundredStoreOperationsCommandAction =
  | "run_money_army_batch_creation"
  | "run_money_army_batch_acceleration"
  | "run_money_army_launch_package"
  | "run_money_army_approval"
  | "run_money_army_deployment"
  | "record_connector_activation_matrix"
  | "record_product_depth_drafts"
  | "record_launch_packets"
  | "record_autonomy_run_queue"
  | "record_work_leases"
  | "manual_quality_review";

export type RevenueHundredStoreOperationsCommand = {
  action: RevenueHundredStoreOperationsCommandAction;
  commandId: string;
  confirmation: string;
  endpoint: string;
  expectedInternalEffect: string;
  externalExecution: false;
  maxItems: number;
  priority: number;
  providerContacted: false;
  reason: string;
  requiresManualSelection: boolean;
  sourceActionTitle: string;
  stage: RevenueMoneyArmyBatchPipelineStageName | null;
  status: RevenueMoneyArmyBatchPipelineStageStatus;
};

export type RevenueHundredStoreOperationsCommandPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  commands: RevenueHundredStoreOperationsCommand[];
  externalExecution: false;
  generatedAt: string;
  mode: "100 Store Operations Command Queue";
  providerContacted: false;
  selectedCommand: RevenueHundredStoreOperationsCommand | null;
  summary: string;
  totals: {
    blocked: number;
    commands: number;
    executable: number;
    manualReview: number;
    ready: number;
    waiting: number;
  };
};

export type RevenueHundredStoreOperationsApplyResponse = {
  after: RevenueHundredStoreOperationsResponse;
  afterCommandPlan: RevenueHundredStoreOperationsCommandPlan;
  applied: {
    auditLogId: string | null;
    batchRunIds: string[];
    cyclesRequested: number;
    cyclesRun: number;
    dryRun: boolean;
    externalExecution: false;
    providerContacted: false;
    selectedCommandId: string | null;
    selectedStage: RevenueMoneyArmyBatchPipelineStageName | null;
    summary: string;
  };
  before: RevenueHundredStoreOperationsResponse;
  beforeCommandPlan: RevenueHundredStoreOperationsCommandPlan;
  cycles: Array<{
    afterReadinessScore: number;
    afterStoreGap: number;
    batchRunId: string | null;
    beforeReadinessScore: number;
    beforeStoreGap: number;
    command: RevenueHundredStoreOperationsCommand;
    cycle: number;
    resultSummary: string;
    stage: RevenueMoneyArmyBatchPipelineStageName;
  }>;
  recentRuns: RevenueMoneyArmyBatchRun[];
};

export type RevenueHundredStoreAppConnectionPacketsApplyResponse = {
  applied: {
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    packetsRecorded: number;
    packetsSelected: number;
    providerContacted: false;
    roleCounts: Record<string, number>;
    storesCovered: number;
    summary: string;
  };
  packets: RevenueHundredStoreApplicationConnectionWorkbench["packets"];
  plan: RevenueHundredStoreOperationsPlan;
};

export type RevenueHundredStoreConnectorActivationApplyResponse = {
  applied: {
    auditLogId: string | null;
    credentialEnvVarRefs: number;
    dryRun: boolean;
    dryRunRequestMaps: number;
    externalExecution: false;
    providerContacted: false;
    roleCounts: Record<string, number>;
    rowsRecorded: number;
    rowsSelected: number;
    statusCounts: Record<string, number>;
    storesCovered: number;
    summary: string;
    writeScopesBlocked: number;
  };
  plan: RevenueHundredStoreOperationsPlan;
  rows: RevenueHundredStoreConnectorActivationRow[];
};

export type RevenueHundredStoreMonitoringCycleApplyResponse = {
  applied: {
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    itemsRecorded: number;
    itemsSelected: number;
    providerContacted: false;
    queueCounts: Record<string, number>;
    requiredSignals: number;
    signalStatusCounts: Record<string, number>;
    storesCovered: number;
    summary: string;
  };
  items: RevenueHundredStoreMonitoringItem[];
  plan: RevenueHundredStoreOperationsPlan;
};

export type RevenueHundredStoreProductDepthApplyResponse = {
  applied: {
    auditLogId: string | null;
    currentStoreDrafts: number;
    draftsRecorded: number;
    draftsSelected: number;
    dryRun: boolean;
    externalExecution: false;
    futureStoreDrafts: number;
    providerContacted: false;
    statusCounts: Record<string, number>;
    storesCovered: number;
    summary: string;
  };
  drafts: RevenueHundredStoreProductDepthDraft[];
  plan: RevenueHundredStoreOperationsPlan;
};

export type RevenueHundredStoreLaunchPacketsApplyResponse = {
  applied: {
    auditLogId: string | null;
    currentStorePackets: number;
    dryRun: boolean;
    externalExecution: false;
    futureStorePackets: number;
    packetsRecorded: number;
    packetsSelected: number;
    providerContacted: false;
    statusCounts: Record<string, number>;
    storesCovered: number;
    summary: string;
  };
  packets: RevenueHundredStoreLaunchPacket[];
  plan: RevenueHundredStoreOperationsPlan;
};

export type RevenueHundredStoreAutonomyRunApplyResponse = {
  applied: {
    approvalRequired: number;
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    jobsRecorded: number;
    jobsSelected: number;
    providerContacted: false;
    readyInternal: number;
    statusCounts: Record<string, number>;
    storesCovered: number;
    summary: string;
    typeCounts: Record<string, number>;
  };
  jobs: RevenueHundredStoreAutonomyJob[];
  plan: RevenueHundredStoreOperationsPlan;
};

export type RevenueHundredStoreWorkLeasesApplyResponse = {
  applied: {
    approvalHold: number;
    auditLogId: string | null;
    dedupeKeys: number;
    dryRun: boolean;
    externalExecution: false;
    leasesRecorded: number;
    leasesSelected: number;
    providerContacted: false;
    readyToClaim: number;
    statusCounts: Record<string, number>;
    storesCovered: number;
    summary: string;
    typeCounts: Record<string, number>;
  };
  leases: RevenueHundredStoreWorkLease[];
  plan: RevenueHundredStoreOperationsPlan;
};

export type RevenueHundredStoreDailySupervisorApplyResponse = {
  after: RevenueHundredStoreOperationsResponse;
  afterSupervisor: RevenueHundredStoreDailySupervisorPlan;
  applied: {
    appPacketsRecorded: number;
    auditLogId: string | null;
    autonomyJobsRecorded: number;
    connectorRowsRecorded: number;
    dryRun: boolean;
    externalExecution: false;
    monitoringItemsRecorded: number;
    operationCyclesRun: number;
    productDraftsRecorded: number;
    launchPacketsRecorded: number;
    providerContacted: false;
    stepsRecorded: number;
    stepsSelected: number;
    summary: string;
    workLeasesRecorded: number;
  };
  before: RevenueHundredStoreOperationsResponse;
  beforeSupervisor: RevenueHundredStoreDailySupervisorPlan;
  results: Array<{
    action: RevenueHundredStoreDailySupervisorAction;
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    connectorRowsRecorded?: number;
    connectorRowsSelected?: number;
    itemsRecorded?: number;
    itemsSelected?: number;
    operationCyclesRun?: number;
    packetsRecorded?: number;
    packetsSelected?: number;
    productDraftsRecorded?: number;
    productDraftsSelected?: number;
    launchPacketsRecorded?: number;
    launchPacketsSelected?: number;
    autonomyJobsRecorded?: number;
    autonomyJobsSelected?: number;
    workLeasesRecorded?: number;
    workLeasesSelected?: number;
    providerContacted: false;
    stepId: string;
    summary: string;
    title: string;
  }>;
};

export type RevenueBusinessFleetLaunchGapAction = {
  action:
    | "run_launch_wave"
    | "repair_quality_gate"
    | "seed_product_drafts"
    | "optimize_listings"
    | "prepare_store_setup"
    | "create_opportunity_shell"
    | "collect_signal";
  businessId: string | null;
  businessName: string;
  endpoint: string;
  expectedInternalEffect: string;
  externalExecution: false;
  priority: number;
  reason: string;
  sourceModule: string;
  status: "ready" | "queued_after_apply" | "blocked";
};

export type RevenueBusinessFleetOpportunitySeed = {
  businessName: string;
  idea: string;
  priceRange: {
    max: number;
    min: number;
  };
  productCount: 5 | 10 | 15 | 25;
  productTypes: string[];
  riskTolerance: "Low";
  sourceKey: string;
  storePlatform: "Etsy" | "Shopify" | "Other";
};

export type RevenueBusinessFleetLaunchGapPlan = {
  actions: RevenueBusinessFleetLaunchGapAction[];
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Business Fleet Launch Gap Planner";
  opportunitySeeds: RevenueBusinessFleetOpportunitySeed[];
  providerContacted: false;
  summary: string;
  totals: {
    createOpportunityShells: number;
    currentBusinesses: number;
    launchWaveGap: number;
    readyLaunchWaveBusinesses: number;
    repairActions: number;
    runLaunchWaveActions: number;
    targetLaunchWave: number;
  };
};

export type RevenueBusinessFleetLaunchGapResponse = {
  plan: RevenueBusinessFleetLaunchGapPlan;
};

export type RevenueBusinessFleetLaunchGapSeedApplyResult = {
  applied: {
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    productDraftsCreated: number;
    providerContacted: false;
    skippedExistingProducts: number;
    storeCreated: boolean;
    storeId: string | null;
    opportunityId: string | null;
  };
  businessName: string;
  plan: {
    nextInternalActions: RevenueOpportunityFactoryPlan["nextInternalActions"];
    summary: string;
    totals: RevenueOpportunityFactoryPlan["totals"];
  };
  sourceKey: string;
  store: ClientMerchStore | null;
};

export type RevenueBusinessFleetLaunchGapSeedApplyResponse = {
  applied: {
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    launchWaveGapAfter: number;
    launchWaveGapBefore: number;
    productDraftsCreated: number;
    providerContacted: false;
    seedsApplied: number;
    seedsPreviewed: number;
    seedsSelected: number;
    skippedExistingProducts: number;
    storeShellsCreated: number;
    summary: string;
  };
  fleet: RevenueBusinessFleetPlan;
  gapPlan: RevenueBusinessFleetLaunchGapPlan;
  refreshedGapPlan: RevenueBusinessFleetLaunchGapPlan;
  results: RevenueBusinessFleetLaunchGapSeedApplyResult[];
};

export type RevenueBusinessFleetLaunchGapAccelerationResponse = {
  applied: {
    approvalPacketsQueued: number;
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    launchProductsCreated: number;
    launchQueueItems: number;
    listingExperimentsQueued: number;
    listingProductsUpdated: number;
    providerContacted: false;
    sourceKeysTargeted: number;
    storeSetupRunbooks: number;
    storeSetupUpdates: number;
    storesTargeted: number;
    summary: string;
  };
  fleet: RevenueBusinessFleetPlan;
  plans: {
    launchPipeline: RevenueLaunchPipelinePlan;
    listingOptimization: RevenueListingOptimizationPlan;
    storeSetup: RevenueStoreSetupPlan;
  };
  results: {
    launchPipeline: {
      approvalPackets: unknown[] | number;
      createdProducts: unknown[] | number;
      storeUpdates: unknown[];
    };
    listingOptimization: {
      productUpdates: unknown[];
    };
    storeSetup: {
      storeUpdates: unknown[];
    };
  };
  targetedStores: Array<{
    businessName: string;
    id: string;
    launchStatus: string;
    products: number;
    sourceKey: string | null;
  }>;
};

export type RevenueLaunchReadinessApprovalSnapshot = {
  createdAt: string;
  id: string;
  packet: GrowthApprovalPacket | null;
  requestAuditLogId: string | null;
  reviewAuditLogId: string | null;
  reviewedAt: string | null;
  status: "approved" | "pending" | "rejected" | string;
  storeId: string;
};

export type RevenueBusinessFleetLiveLaunchPackageResponse = {
  applied: {
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    handoffRecords: number;
    handoffRecordsPreviewed: number;
    operationsPacksRecorded: number;
    operationsPacksSelected: number;
    providerApprovalPacketsPreviewed: number;
    providerApprovalPacketsQueued: number;
    providerContacted: false;
    providerPayloadsPrepared: number;
    readyOperationsPacks: number;
    sourceKeysTargeted: number;
    storesTargeted: number;
    summary: string;
  };
  fleet: RevenueBusinessFleetPlan;
  plans: {
    handoffPlan: RevenueLaunchHandoffPlan | null;
    launchPipeline: RevenueLaunchPipelinePlan;
    operationsPackPlan: RevenueLaunchOperationsPackPlan | null;
    readinessPlan: RevenueLaunchReadinessPlan;
    storeSetup: RevenueStoreSetupPlan;
  };
  providerApprovalSnapshots: RevenueLaunchReadinessApprovalSnapshot[];
  providerPayloads: ProviderPayloadPackage[];
  results: {
    handoff: RevenueLaunchHandoffApplyResponse["applied"] | null;
    operationsPack: RevenueLaunchOperationsPackApplyResponse | null;
  };
  targetedStores: Array<{
    businessName: string;
    id: string;
    launchStatus: string;
    products: number;
    sourceKey: string | null;
  }>;
};

export type RevenueBusinessFleetLaunchGateStatus = "ready_for_manual_launch" | "approval_needed" | "repair_required" | "blocked";

export type RevenueBusinessFleetLaunchGateItem = {
  approvalState: RevenueLaunchReadinessItem["approvalState"];
  blockers: string[];
  businessName: string;
  externalExecution: false;
  gateStatus: RevenueBusinessFleetLaunchGateStatus;
  launchReadinessScore: number;
  launchStatus: string;
  nextInternalAction: {
    endpoint: string;
    label: string;
    state: string;
  };
  operationsPackStatus: RevenueLaunchOperationsPackStatus | null;
  productCount: number;
  providerContacted: false;
  providerPayloadCount: number;
  providerReadinessScore: number;
  reason: string;
  readinessStage: RevenueLaunchReadinessStage;
  sourceKey: string | null;
  storeId: string;
};

export type RevenueBusinessFleetLaunchGatePlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  items: RevenueBusinessFleetLaunchGateItem[];
  mode: "Revenue Business Fleet Launch Gate";
  plans: {
    handoffTotals: RevenueLaunchHandoffPlan["totals"] | null;
    operationsPackTotals: RevenueLaunchOperationsPackPlan["totals"] | null;
    readinessTotals: RevenueLaunchReadinessPlan["totals"];
  };
  providerContacted: false;
  statusCounts: {
    approvalNeeded: number;
    blocked: number;
    readyForManualLaunch: number;
    repairRequired: number;
  };
  summary: string;
  targetedSourceKeys: string[];
  totals: {
    approvalNeeded: number;
    blocked: number;
    handoffRecordsOpen: number;
    operationsPacks: number;
    operationsReady: number;
    payloadsPrepared: number;
    providerPacketsApproved: number;
    providerPacketsPending: number;
    readyForManualLaunch: number;
    repairRequired: number;
    storesEvaluated: number;
  };
};

export type RevenueBusinessFleetLaunchGateResponse = {
  plan: RevenueBusinessFleetLaunchGatePlan;
};

export type RevenueBusinessFleetProviderApprovalReviewItem = {
  actionCount: number;
  adapterCoverage: string[];
  auditLogId: string | null;
  blockedActions: string[];
  businessName: string;
  canApprove: boolean;
  canReject: boolean;
  createdAt: string;
  externalExecution: false;
  mode: string;
  nextInternalState: string;
  packetId: string;
  payloadCount: number;
  providerContacted: false;
  readinessScore: number;
  reason: string;
  requestAuditLogId: string | null;
  reviewAuditLogId: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  reviewNote: string | null;
  scheduledFor: string | null;
  sourceKey: string | null;
  status: "approved" | "pending" | "rejected" | string;
  statusLabel: string;
  storeId: string;
  summary: string;
  updatedAt: string;
};

export type RevenueBusinessFleetProviderApprovalReviewPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  items: RevenueBusinessFleetProviderApprovalReviewItem[];
  mode: "Revenue Business Fleet Provider Approval Review";
  providerContacted: false;
  statusFilter: "pending" | "approved" | "rejected" | "all" | string;
  summary: string;
  targetedSourceKeys: string[];
  totals: {
    approvable: number;
    approved: number;
    packets: number;
    payloads: number;
    pending: number;
    rejected: number;
    storesEvaluated: number;
  };
};

export type RevenueBusinessFleetProviderApprovalReviewResponse = {
  plan: RevenueBusinessFleetProviderApprovalReviewPlan;
};

export type RevenueBusinessFleetProviderApprovalReviewApplyResponse = {
  applied: {
    action: "approve" | "reject";
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    packetsApproved: number;
    packetsPreviewed: number;
    packetsRejected: number;
    packetsSelected: number;
    providerContacted: false;
    summary: string;
  };
  launchGate: RevenueBusinessFleetLaunchGatePlan;
  plan: RevenueBusinessFleetProviderApprovalReviewPlan;
  selectedPackets: RevenueBusinessFleetProviderApprovalReviewItem[];
};

export type RevenueBusinessFleetLaunchWaveSelection = {
  businessId: string;
  businessName: string;
  finalRank: number;
  nextInternalAction: string;
  qualityStatus: RevenueBusinessFleetQualityStatus;
  scheduleState: RevenueBusinessFleetScheduleState;
  shardId: string;
  sprintActionId: string;
};

export type RevenueBusinessFleetLaunchWavePlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Business Fleet Launch Wave";
  providerContacted: false;
  selectedBusinesses: RevenueBusinessFleetLaunchWaveSelection[];
  skipped: Array<{
    businessId: string;
    businessName: string;
    reason: string;
  }>;
  sprintActionIds: string[];
  summary: string;
  totals: {
    eligible: number;
    readyParallel: number;
    requested: number;
    selected: number;
    skipped: number;
  };
};

export type RevenueBusinessFleetLaunchWaveApplyResponse = {
  dispatched: RevenueFirstCashSprintApplyResponse["dispatched"];
  firstBusinessLaunch: RevenueFirstBusinessLaunchPlan;
  fleet: RevenueBusinessFleetPlan;
  selectedSprintActionIds: string[];
  selection: RevenueBusinessFleetLaunchWavePlan;
  sprint: RevenueFirstCashSprintPlan;
};

export type RevenueMoneyArmyBatchPipelineStageName =
  | "generate_score_batch"
  | "first_business_launch_package"
  | "prepare_first_store"
  | "launch_first_business"
  | "execute_first_business"
  | "autonomous_first_business_launch"
  | "controlled_live_executor"
  | "batch_creation"
  | "batch_acceleration"
  | "launch_package"
  | "approval"
  | "deployment";

export type RevenueMoneyArmyBatchPipelineStageStatus = "ready" | "waiting" | "blocked" | "complete";

export type RevenueMoneyArmyBatchPipelineStage = {
  blockedExternalActions: string[];
  endpoint: string;
  expectedInternalEffect: string;
  externalExecution: false;
  name: RevenueMoneyArmyBatchPipelineStageName;
  priority: number;
  providerContacted: false;
  reason: string;
  requiredConfirmation: string;
  status: RevenueMoneyArmyBatchPipelineStageStatus;
  title: string;
};

export type RevenueMoneyArmyBatchPipelinePlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Private Money Army Batch Pipeline";
  nextStage: RevenueMoneyArmyBatchPipelineStage | null;
  providerContacted: false;
  selectedSourceKeys: string[];
  stages: RevenueMoneyArmyBatchPipelineStage[];
  summary: string;
  totals: {
    approvablePackets: number;
    approvedPackets: number;
    blockedStages: number;
    currentBusinesses: number;
    launchWaveGap: number;
    pendingApprovalPackets: number;
    readyDeploymentBusinesses: number;
    readyStages: number;
    repairRequired: number;
    seedCandidates: number;
    selectedSourceKeys: number;
    stages: number;
    targetBusinesses: number;
    targetLaunchWave: number;
  };
};

export type RevenueMoneyArmyBatchPipelineResponse = {
  plan: RevenueMoneyArmyBatchPipelinePlan;
  recentRuns: RevenueMoneyArmyBatchRun[];
};

export type RevenueMoneyArmyBatchRun = {
  afterTotals: RevenueMoneyArmyBatchPipelinePlan["totals"];
  auditLogId: string | null;
  batchKey: string;
  beforeTotals: RevenueMoneyArmyBatchPipelinePlan["totals"];
  createdAt: string;
  dryRun: boolean;
  externalExecution: false;
  id: string;
  providerContacted: false;
  resultSummary: string;
  sourceKeys: string[];
  stage: RevenueMoneyArmyBatchPipelineStageName;
  status: string;
};

export type RevenueMoneyArmyBatchPipelineApplyResponse = {
  after: RevenueMoneyArmyBatchPipelinePlan;
  applied: {
    auditLogId: string | null;
    batchRunId: string | null;
    dryRun: boolean;
    externalExecution: false;
    providerContacted: false;
    stage: RevenueMoneyArmyBatchPipelineStageName | null;
    summary: string;
  };
  batchRun: RevenueMoneyArmyBatchRun | null;
  before: RevenueMoneyArmyBatchPipelinePlan;
  result: unknown;
};

export type RevenueMoneyArmyPressureSignal = {
  assets: Array<{
    assetId: string;
    assetName: string;
    recommendation: RevenueAssetRotationDecision;
    score: number;
    storeId: string;
    storeName: string;
  }>;
  level: "none" | "low" | "medium" | "high";
  pressureScore: number;
  reason: string;
};

export type RevenueMoneyArmyRotationRecommendation = {
  assetId: string;
  assetName: string;
  assetType: "product" | "store";
  currentState: string;
  externalExecution: false;
  nextInternalState: string | null;
  providerContacted: false;
  reason: string;
  recommendation: RevenueAssetRotationDecision;
  riskLevel: "low" | "medium" | "high";
  score: number;
  scoreBand: RevenueAssetScoreBand;
  storeId: string;
  storeName: string;
};

export type RevenueMoneyArmyGeneratedAssetCandidate = {
  assetScore: RevenueAssetScoreBreakdown;
  auditOnly: true;
  candidateId: string;
  complianceNotes: string;
  confidence: number;
  designConcept: string;
  designPrompt: string;
  designTheme: string;
  externalExecution: false;
  listingDescription: string;
  listingTitle: string;
  nextInternalState: string | null;
  organicContentTieIn: {
    approvalState: "internal_draft_only";
    channel: "youtube_shorts" | "tiktok" | "instagram_reels";
    hook: string;
    path: "organic_first";
  };
  productName: string;
  productType: string;
  profitMargin: number;
  providerContacted: false;
  recommendation: RevenueAssetRotationDecision;
  retailPrice: number;
  riskLevel: "low" | "medium" | "high";
  rotationDecision: RevenueAssetRotationDecision;
  rotationReason: string;
  score: number;
  scoreBand: RevenueAssetScoreBand;
  sourceProductId: string | null;
  sourceProductName: string | null;
  sourceStoreId: string;
  sourceStoreName: string;
  status: PodProductStatus;
  tags: string[];
};

export type RevenueFirstBusinessLaunchPackageStatus = "ready_for_approval" | "manual_gate" | "blocked";

export type RevenueFirstBusinessLaunchPackageProductCandidate = {
  approvalState: "ready_to_approve" | "needs_manual_review" | "blocked";
  candidateId: string;
  complianceNotes: string;
  designConcept: string;
  designPrompt: string;
  designTheme: string;
  internalDesignDraft: {
    aiProviderUsed: false;
    approvalGate: {
      externalExecutionLocked: true;
      humanApprovalRequired: true;
      reason: string;
      status: "Required";
    };
    assetChecklist: string[];
    externalGeneration: false;
    mockupDirection: string;
    negativePrompt: string;
    palette: string[];
    placement: string;
    prompt: string;
    providerContacted: false;
    typography: string;
  };
  listingDescription: string;
  listingTitle: string;
  productName: string;
  productType: string;
  profitMargin: number;
  recommendation: RevenueAssetRotationDecision;
  retailPrice: number;
  rotationReason: string;
  score: number;
  scoreBand: RevenueAssetScoreBand;
  sourceProductId: string | null;
  sourceProductName: string | null;
  tags: string[];
};

export type RevenueFirstBusinessLaunchPackageContentIdea = {
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    reason: string;
    status: "Required";
  };
  candidateId: string;
  channel: "youtube_shorts" | "tiktok" | "instagram_reels";
  externalExecution: false;
  hook: string;
  id: string;
  productName: string;
  providerContacted: false;
  scriptAngle: string;
  status: "internal_draft_only";
};

export type RevenueFirstBusinessLaunchPackageOrganicMove = {
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    reason: string;
    status: "Required";
  };
  channel: "listing" | "youtube_shorts" | "tiktok" | "instagram_reels" | "manual_signal_tracking" | "storefront_seo" | "community_outreach" | "email_capture";
  expectedInternalEffect: string;
  externalExecution: false;
  id: string;
  providerContacted: false;
  title: string;
};

export type RevenueMoneyArmyFirstBusinessLaunchPackage = {
  approvalChecklist: Array<{
    category: "store" | "products" | "designs" | "content" | "traffic" | "finance" | "evidence";
    externalExecutionLocked: true;
    required: true;
    title: string;
  }>;
  auditEvents: string[];
  blockedExternalActions: string[];
  contentIdeas: RevenueFirstBusinessLaunchPackageContentIdea[];
  externalExecution: false;
  generatedAt: string;
  manualApprovalGates: string[];
  mode: "First Business Launch Package";
  organicFirstMoves: RevenueFirstBusinessLaunchPackageOrganicMove[];
  packageId: string;
  products: RevenueFirstBusinessLaunchPackageProductCandidate[];
  providerContacted: false;
  scalePressure: RevenueMoneyArmyPressureSignal;
  killPressure: RevenueMoneyArmyPressureSignal;
  status: RevenueFirstBusinessLaunchPackageStatus;
  store: {
    audience: string;
    businessName: string;
    industry: string;
    launchStatus: string;
    sourceStoreId: string;
    storePlatform: string;
  };
  summary: string;
  totals: {
    contentIdeas: number;
    manualApprovalGates: number;
    organicMoves: number;
    products: number;
    readyToApproveProducts: number;
    scaleCandidates: number;
    watchCandidates: number;
  };
};

export type RevenueMoneyArmyGenerateScoreBatchPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  candidates: RevenueMoneyArmyGeneratedAssetCandidate[];
  currentPortfolio: {
    generatedAt: string;
    rotationRecommendations: RevenueMoneyArmyRotationRecommendation[];
    summary: string;
    totals: RevenueAssetPortfolio["totals"];
  };
  externalExecution: false;
  generatedAt: string;
  mode: "Money Army Generate & Score Batch";
  providerContacted: false;
  firstBusinessLaunchPackage: RevenueMoneyArmyFirstBusinessLaunchPackage | null;
  rotationRecommendations: RevenueMoneyArmyRotationRecommendation[];
  rotationSummary: Record<RevenueAssetRotationDecision, number>;
  scalePressure: RevenueMoneyArmyPressureSignal;
  killPressure: RevenueMoneyArmyPressureSignal;
  summary: string;
  totals: {
    generated: number;
    kill: number;
    pause: number;
    requested: number;
    scale: number;
    sourceProducts: number;
    sourceStores: number;
    watch: number;
  };
};

export type RevenueMoneyArmyGenerateScoreBatchResponse = {
  plan: RevenueMoneyArmyGenerateScoreBatchPlan;
  recentRuns: RevenueMoneyArmyBatchRun[];
};

export type RevenueMoneyArmyGenerateScoreBatchApplyResponse = {
  applied: {
    auditLogId: string | null;
    batchRunId: string | null;
    dryRun: boolean;
    externalExecution: false;
    providerContacted: false;
    stage: "generate_score_batch";
    summary: string;
  };
  batchRun: RevenueMoneyArmyBatchRun | null;
  plan: RevenueMoneyArmyGenerateScoreBatchPlan;
};

export type RevenueMoneyArmyFirstBusinessLaunchPackageResponse = {
  package: RevenueMoneyArmyFirstBusinessLaunchPackage | null;
  recentRuns: RevenueMoneyArmyBatchRun[];
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan;
};

export type RevenueMoneyArmyFirstBusinessLaunchPackageApplyResponse = {
  applied: {
    auditLogId: string | null;
    batchRunId: string | null;
    dryRun: boolean;
    externalExecution: false;
    providerContacted: false;
    stage: "first_business_launch_package";
    summary: string;
  };
  batchRun: RevenueMoneyArmyBatchRun | null;
  package: RevenueMoneyArmyFirstBusinessLaunchPackage | null;
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan;
};

export type RevenueFirstStorePreparationPlan = {
  approval: {
    approvedAt: string;
    approvedBy: "operator";
    auditOnly: true;
    externalExecution: false;
    note: string | null;
    packageId: string;
    providerContacted: false;
    status: "approved_internal";
  };
  auditEvents: string[];
  blockedExternalActions: string[];
  contentPlan: Array<RevenueFirstBusinessLaunchPackageContentIdea & {
    executionState: "approved_internal_ready";
  }>;
  externalExecution: false;
  generatedAt: string;
  guardrails: string[];
  mode: "Prepare First Store";
  organicTrafficPlan: Array<RevenueFirstBusinessLaunchPackageOrganicMove & {
    executionState: "approved_internal_ready";
  }>;
  preparationId: string;
  products: Array<RevenueFirstBusinessLaunchPackageProductCandidate & {
    executionState: "approved_internal_ready";
  }>;
  providerContacted: false;
  status: "ready_to_execute_internal" | "blocked";
  storeConfig: {
    audience: string;
    businessName: string;
    externalExecution: false;
    industry: string;
    launchStatus: string;
    preparationChecklist: string[];
    providerContacted: false;
    sourceStoreId: string;
    storePlatform: string;
  };
  summary: string;
  totals: {
    approvalChecklist: number;
    blockedExternalActions: number;
    contentIdeas: number;
    organicMoves: number;
    products: number;
    readyInternalSteps: number;
  };
};

export type RevenueFirstStorePrepareApplyResponse = {
  approval: {
    approved: boolean;
    auditLogId: string | null;
    batchRunId: string | null;
    dryRun: boolean;
    externalExecution: false;
    packageId: string | null;
    preparationId: string | null;
    providerContacted: false;
    stage: "prepare_first_store";
    status: "approved_internal" | "blocked";
    summary: string;
  };
  batchRun: RevenueMoneyArmyBatchRun | null;
  package: RevenueMoneyArmyFirstBusinessLaunchPackage | null;
  preparation: RevenueFirstStorePreparationPlan | null;
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan;
};

export type RevenueFirstBusinessInternalLaunchPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  contentDraftQueue: Array<RevenueFirstStorePreparationPlan["contentPlan"][number] & {
    executionLocked: true;
    launchState: "queued_internal_content_draft";
    sequence: number;
  }>;
  evidenceLedgerFields: string[];
  externalExecution: false;
  generatedAt: string;
  guardrails: string[];
  launchApproval: {
    approvedAt: string;
    approvedBy: "operator";
    auditOnly: true;
    externalExecution: false;
    note: string | null;
    packageId: string;
    preparationId: string;
    providerContacted: false;
    status: "approved_for_launch_internal";
  };
  launchId: string;
  launchSequence: Array<{
    externalExecution: false;
    id: string;
    order: number;
    providerContacted: false;
    state: "ready_internal";
    title: string;
  }>;
  mode: "Launch First Business";
  organicMoveQueue: Array<RevenueFirstStorePreparationPlan["organicTrafficPlan"][number] & {
    executionLocked: true;
    launchState: "queued_internal_organic_move";
    sequence: number;
  }>;
  productSetupQueue: Array<RevenueFirstStorePreparationPlan["products"][number] & {
    executionLocked: true;
    launchState: "queued_internal_product_setup";
    sequence: number;
  }>;
  providerContacted: false;
  status: "approved_for_launch_internal" | "blocked";
  finalExecutionPacket: {
    approvalState: "approved_for_launch_internal";
    blockedExternalActions: string[];
    evidenceLedgerFields: string[];
    executionChecklist: string[];
    externalExecution: false;
    facelessContentIdeas: RevenueFirstBusinessInternalLaunchPlan["contentDraftQueue"];
    organicMoves: RevenueFirstBusinessInternalLaunchPlan["organicMoveQueue"];
    products: RevenueFirstBusinessInternalLaunchPlan["productSetupQueue"];
    providerContacted: false;
    store: RevenueFirstBusinessInternalLaunchPlan["storeSetup"];
  };
  storeSetup: RevenueFirstStorePreparationPlan["storeConfig"] & {
    launchState: "queued_internal_store_setup";
    setupQueue: string[];
  };
  summary: string;
  totals: {
    blockedExternalActions: number;
    contentDrafts: number;
    evidenceFields: number;
    launchSequenceSteps: number;
    organicMoves: number;
    products: number;
    readyExecutionItems: number;
    storeSetupSteps: number;
  };
};

export type RevenueFirstBusinessInternalLaunchApplyResponse = {
  batchRun: RevenueMoneyArmyBatchRun | null;
  launch: RevenueFirstBusinessInternalLaunchPlan | null;
  launched: {
    auditLogId: string | null;
    batchRunId: string | null;
    dryRun: boolean;
    externalExecution: false;
    launched: boolean;
    launchId: string | null;
    packageId: string | null;
    preparationId: string | null;
    providerContacted: false;
    stage: "launch_first_business";
    status: "approved_for_launch_internal" | "blocked";
    summary: string;
  };
  package: RevenueMoneyArmyFirstBusinessLaunchPackage | null;
  preparation: RevenueFirstStorePreparationPlan | null;
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan;
};

export type RevenueFirstBusinessReadinessGateCategory =
  | "store"
  | "products"
  | "listings"
  | "designs"
  | "content"
  | "traffic"
  | "finance"
  | "evidence"
  | "external_lock";

export type RevenueFirstBusinessListingProductPackItem = {
  approvalChecklist: string[];
  candidateId: string;
  designSpec: {
    externalGeneration: false;
    mockupDirection: string;
    negativePrompt: string;
    palette: string[];
    placement: string;
    prompt: string;
    providerContacted: false;
    typography: string;
  };
  externalExecution: false;
  listingBullets: string[];
  listingDescription: string;
  listingTitle: string;
  productName: string;
  productType: string;
  profitMargin: number;
  providerContacted: false;
  retailPrice: number;
  seoKeywords: string[];
  status: "ready_internal";
  storefrontCollection: string;
  tags: string[];
};

export type RevenueFirstBusinessExecutionPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  executionApproval: {
    approvedAt: string;
    approvedBy: "operator";
    auditOnly: true;
    externalExecution: false;
    launchId: string;
    note: string | null;
    providerContacted: false;
    status: "ready_to_launch_first_business";
  };
  executionId: string;
  externalExecution: false;
  firstLaunchReadinessGate: {
    externalExecution: false;
    generatedAt: string;
    items: Array<{
      category: RevenueFirstBusinessReadinessGateCategory;
      detail: string;
      externalExecution: false;
      providerContacted: false;
      required: true;
      status: "ready" | "blocked";
      title: string;
    }>;
    label: "First Launch Readiness Gate";
    providerContacted: false;
    status: "ready_for_manual_launch_approval" | "blocked";
    summary: string;
    totals: {
      blocked: number;
      ready: number;
      required: number;
    };
  };
  finalExecutionPacket: RevenueFirstBusinessInternalLaunchPlan["finalExecutionPacket"];
  firstWeekTrackingPlan: {
    checkIns: Array<{
      day: 0 | 1 | 3 | 7;
      requiredEvidence: string[];
      title: string;
    }>;
    externalExecution: false;
    metricFields: Array<{
      cadence: "twice_daily" | "daily" | "end_of_week";
      id: string;
      label: string;
    }>;
    providerContacted: false;
    rotationReview: {
      day: 7;
      inputs: string[];
      output: "feed_revenue_engine_scale_watch_pause_kill";
    };
  };
  generatedAt: string;
  guardrails: string[];
  launchHandoffPacket: {
    blockedExternalActions: string[];
    contentCalendar: Array<{
      captionDraft: string;
      channel: RevenueFirstBusinessLaunchPackageContentIdea["channel"];
      contentIdeaId: string;
      externalExecution: false;
      hook: string;
      providerContacted: false;
      scriptDraft: string;
      sequence: number;
      status: "ready_internal";
    }>;
    explicitLiveApprovalRequired: true;
    externalExecution: false;
    handoffId: string;
    manualExecutionChecklist: string[];
    organicLaunchMoves: Array<RevenueFirstBusinessInternalLaunchPlan["organicMoveQueue"][number] & {
      manualExecutionNote: string;
      status: "ready_internal";
    }>;
    products: RevenueFirstBusinessListingProductPackItem[];
    providerContacted: false;
    status: "ready_for_operator_review" | "blocked";
    store: RevenueFirstBusinessInternalLaunchPlan["finalExecutionPacket"]["store"] & {
      manualSetupInstructions: string[];
    };
    summary: string;
  };
  listingProductPack: RevenueFirstBusinessListingProductPackItem[];
  manualLaunchRunbook: Array<{
    externalExecution: false;
    id: string;
    order: number;
    packetSection: "store" | "products" | "content" | "organic" | "evidence" | "review";
    providerContacted: false;
    status: "ready_manual";
    title: string;
  }>;
  mode: "Execute First Business";
  providerContacted: false;
  readyState: {
    externalExecution: false;
    label: "Ready to Launch First Business";
    manualLaunchReady: boolean;
    providerContacted: false;
    semiAutomatedPreparationReady: boolean;
  };
  revenueStartPlan: {
    first24Hours: string[];
    first72Hours: string[];
    organicFirst: true;
    paidSpendLocked: true;
  };
  semiAutomatedPreparationQueue: Array<{
    externalExecution: false;
    id: string;
    providerContacted: false;
    status: "ready_internal";
    title: string;
  }>;
  sourceLaunchId: string;
  status: "ready_to_launch_first_business" | "blocked";
  summary: string;
  totals: {
    blockedExternalActions: number;
    finalProducts: number;
    firstWeekMetricFields: number;
    handoffProducts: number;
    manualSteps: number;
    organicMoves: number;
    readyLaunchItems: number;
    readinessBlocked: number;
    readinessReady: number;
    semiAutomatedSteps: number;
  };
};

export type RevenueFirstBusinessExecuteApplyResponse = {
  batchRun: RevenueMoneyArmyBatchRun | null;
  executed: {
    auditLogId: string | null;
    batchRunId: string | null;
    dryRun: boolean;
    executed: boolean;
    executionId: string | null;
    externalExecution: false;
    launchId: string | null;
    providerContacted: false;
    stage: "execute_first_business";
    status: "ready_to_launch_first_business" | "blocked";
    summary: string;
  };
  execution: RevenueFirstBusinessExecutionPlan | null;
  launch: RevenueFirstBusinessInternalLaunchPlan | null;
  package: RevenueMoneyArmyFirstBusinessLaunchPackage | null;
  preparation: RevenueFirstStorePreparationPlan | null;
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan;
};

export type RevenueFirstBusinessAutonomousLaunchLane =
  | "store_build"
  | "product_creation"
  | "supplier_selection"
  | "supplier_connection"
  | "content_launch"
  | "organic_traffic"
  | "ad_campaign_drafting"
  | "ad_spend_activation"
  | "tracking";

export type RevenueFirstBusinessAutonomousLaunchPlan = {
  adCampaignDrafts: Array<{
    audience: string;
    budgetApprovalRequired: true;
    campaignName: string;
    dailyBudgetCap: number;
    externalExecution: false;
    objective: "organic_amplification" | "product_validation" | "retargeting_seed";
    paymentExecution: false;
    productNames: string[];
    providerContacted: false;
    spendState: "payment_required";
    status: "draft_locked";
  }>;
  auditEvents: string[];
  autonomousLaunchId: string;
  autonomousUntilPayment: true;
  autonomyMatrix: Array<{
    autonomyPercent: number;
    commander: string;
    externalExecution: false;
    hardStop: string | null;
    lane: RevenueFirstBusinessAutonomousLaunchLane;
    nextInternalAction: string;
    ownerApprovalRequired: boolean;
    providerContacted: false;
    status: "autonomous_ready" | "connector_gated" | "payment_gated" | "blocked";
  }>;
  blockedExternalActions: string[];
  chainOfCommand: Array<{
    lane: RevenueFirstBusinessAutonomousLaunchLane;
    owns: string[];
    rank: "marshal" | "general" | "commander" | "soldier";
    status: "ready_internal" | "owner_gate_required";
    title: string;
  }>;
  connectionPlan: {
    connectorManifests: Array<{
      approvalRequired: true;
      credentialScopes: string[];
      externalExecution: false;
      payloadState: "prepared_not_sent";
      provider: "Shopify" | "Etsy" | "Printify" | "Printful" | "Meta" | "Google Analytics";
      providerContacted: false;
      purpose: string;
    }>;
    externalExecution: false;
    providerContacted: false;
    status: "connector_ready_owner_gated" | "blocked";
    summary: string;
  };
  executionPacket: RevenueFirstBusinessExecutionPlan;
  externalExecution: false;
  finalOperatorGate: {
    externalExecution: false;
    paymentExecution: false;
    providerContacted: false;
    requiredApprovals: string[];
    status: "owner_payment_and_provider_approval_required" | "blocked";
    summary: string;
  };
  generatedAt: string;
  guardrails: string[];
  mode: "Autonomous First Business Launch Prep";
  paymentApprovalQueue: Array<{
    approvalType: "provider_account" | "supplier_order" | "ad_spend" | "payment_processor" | "marketplace_fee";
    estimatedAmount: number;
    externalExecution: false;
    paymentExecution: false;
    providerContacted: false;
    reason: string;
    status: "owner_approval_required";
    title: string;
  }>;
  paymentExecution: false;
  productCreationPlan: Array<RevenueFirstBusinessListingProductPackItem & {
    connectorPayloadStatus: "prepared_not_sent";
    creationLane: "autonomous_internal_ready";
    supplierCandidateId: string;
  }>;
  providerContacted: false;
  status: "autonomous_ready_payment_gated" | "blocked";
  storeBuildPlan: {
    businessName: string;
    collectionPlan: string[];
    externalExecution: false;
    navigationPlan: string[];
    policyDrafts: string[];
    providerContacted: false;
    seoPlan: {
      description: string;
      title: string;
    };
    setupPayloadState: "prepared_not_sent";
    status: "autonomous_internal_ready" | "blocked";
    storePlatform: string;
  };
  supplierPlan: {
    candidates: Array<{
      estimatedBaseCost: number;
      externalExecution: false;
      provider: "Printify" | "Printful" | "Other";
      providerContacted: false;
      reasons: string[];
      selectionScore: number;
      status: "candidate_internal";
      supplierCandidateId: string;
    }>;
    externalExecution: false;
    providerContacted: false;
    selectedSupplier: {
      estimatedBaseCost: number;
      externalExecution: false;
      provider: "Printify" | "Printful" | "Other";
      providerContacted: false;
      selectionScore: number;
      supplierCandidateId: string;
    };
    status: "selected_internal_owner_gated" | "blocked";
    summary: string;
  };
  summary: string;
  totals: {
    adDrafts: number;
    autonomousReadyLanes: number;
    blockedExternalActions: number;
    connectorManifests: number;
    paymentApprovals: number;
    productPayloads: number;
    supplierCandidates: number;
  };
};

export type RevenueFirstBusinessAutonomousLaunchApplyResponse = {
  autonomous: {
    auditLogId: string | null;
    autonomousLaunchId: string | null;
    autonomousPrepared: boolean;
    batchRunId: string | null;
    dryRun: boolean;
    executionId: string | null;
    externalExecution: false;
    paymentExecution: false;
    providerContacted: false;
    stage: "autonomous_first_business_launch";
    status: "autonomous_ready_payment_gated" | "blocked";
    summary: string;
  };
  autonomousLaunch: RevenueFirstBusinessAutonomousLaunchPlan | null;
  batchRun: RevenueMoneyArmyBatchRun | null;
  execution: RevenueFirstBusinessExecutionPlan | null;
  launch: RevenueFirstBusinessInternalLaunchPlan | null;
  package: RevenueMoneyArmyFirstBusinessLaunchPackage | null;
  preparation: RevenueFirstStorePreparationPlan | null;
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan;
};

export type RevenueFirstBusinessLiveExecutorProvider =
  | "Shopify"
  | "Etsy"
  | "Printify"
  | "Printful"
  | "Meta"
  | "Google Analytics"
  | "Manual";

export type RevenueFirstBusinessLiveExecutorStepKind =
  | "connect_storefront"
  | "connect_supplier"
  | "create_supplier_product"
  | "create_storefront_product"
  | "publish_storefront_product"
  | "prepare_content_upload"
  | "prepare_ad_campaign"
  | "activate_ad_spend"
  | "connect_tracking"
  | "record_first_week_evidence";

export type RevenueFirstBusinessLiveExecutorPlan = {
  actualExternalActionsExecuted: false;
  auditEvents: string[];
  blockedExternalActions: string[];
  credentialReadiness: Array<{
    approvalStatus: "owner_approved" | "owner_required";
    credentialRefs: string[];
    externalExecution: false;
    provider: RevenueFirstBusinessLiveExecutorProvider;
    providerContacted: false;
    status: "ready_after_owner_connection" | "missing_owner_unlock";
  }>;
  externalExecution: false;
  generatedAt: string;
  guardrails: string[];
  liveExecutorId: string;
  liveRunbook: Array<{
    approvalRequired: boolean;
    executionState:
      | "ready_live_non_payment"
      | "blocked_owner_unlock"
      | "payment_locked"
      | "internal_tracking_ready";
    externalExecution: false;
    id: string;
    kind: RevenueFirstBusinessLiveExecutorStepKind;
    lane: RevenueFirstBusinessAutonomousLaunchLane;
    paymentRequired: boolean;
    provider: RevenueFirstBusinessLiveExecutorProvider;
    providerContacted: false;
    rollback: string;
    sequence: number;
    title: string;
  }>;
  mode: "Controlled Live First Business Executor";
  ownerUnlock: {
    adDraftApproval: boolean;
    connectorApproval: boolean;
    externalExecution: false;
    paymentExecution: false;
    phraseAccepted: boolean;
    providerContacted: false;
    publicLaunchApproval: boolean;
    status: "accepted_non_payment" | "waiting_owner";
  };
  paymentExecution: false;
  paymentLockedQueue: Array<{
    amount: number;
    externalExecution: false;
    paymentExecution: false;
    provider: RevenueFirstBusinessLiveExecutorProvider;
    providerContacted: false;
    reason: string;
    title: string;
  }>;
  providerActionManifests: Array<{
    approvalRequired: boolean;
    externalExecution: false;
    idempotencyKey: string;
    method: "POST" | "PUT";
    pathTemplate: string;
    payloadState: "prepared_not_sent";
    paymentRequired: boolean;
    provider: RevenueFirstBusinessLiveExecutorProvider;
    providerContacted: false;
    purpose: string;
    rollbackKey: string;
  }>;
  providerContacted: false;
  rollbackPlan: Array<{
    externalExecution: false;
    providerContacted: false;
    step: string;
  }>;
  sourceAutonomousLaunchId: string;
  status: "ready_for_owner_unlock" | "armed_non_payment_live_run" | "blocked";
  summary: string;
  totals: {
    armedNonPaymentSteps: number;
    blockedSteps: number;
    credentialChecks: number;
    paymentLockedSteps: number;
    providerManifests: number;
    rollbackSteps: number;
  };
};

export type RevenueFirstBusinessLiveExecutorApplyResponse = {
  autonomousLaunch: RevenueFirstBusinessAutonomousLaunchPlan | null;
  batchRun: RevenueMoneyArmyBatchRun | null;
  execution: RevenueFirstBusinessExecutionPlan | null;
  launch: RevenueFirstBusinessInternalLaunchPlan | null;
  live: {
    actualExternalActionsExecuted: false;
    auditLogId: string | null;
    batchRunId: string | null;
    dryRun: boolean;
    externalExecution: false;
    liveExecutorId: string | null;
    paymentExecution: false;
    providerContacted: false;
    stage: "controlled_live_executor";
    status: "ready_for_owner_unlock" | "armed_non_payment_live_run" | "blocked";
    summary: string;
    unlockAccepted: boolean;
  };
  liveExecutor: RevenueFirstBusinessLiveExecutorPlan | null;
  package: RevenueMoneyArmyFirstBusinessLaunchPackage | null;
  preparation: RevenueFirstStorePreparationPlan | null;
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan;
};

export type RevenuePortfolioDashboardNextAction = {
  actionLabel: string;
  assetId: string;
  assetName: string;
  assetType: "product" | "store";
  nextInternalState: string | null;
  priority: number;
  reason: string;
  recommendation: RevenueAssetRotationDecision;
  score: number;
  scoreBand: RevenueAssetScoreBand;
  storeId: string;
  storeName: string;
};

export type RevenuePortfolioDashboardPlan = {
  blockedExternalActions: string[];
  controlLedger: {
    auditOnly: number;
    overrides: number;
    records: number;
    statusChanges: number;
  };
  externalExecution: false;
  generatedAt: string;
  kpis: {
    assets: number;
    estimatedMargin: number;
    estimatedProfit: number;
    performanceSnapshots: number;
    products: number;
    profitVelocity: number;
    revenueVelocity: number;
    stores: number;
    totalRevenue: number;
    trackedAssets: number;
  };
  mode: "Revenue Engine Portfolio Dashboard";
  nextActions: RevenuePortfolioDashboardNextAction[];
  providerContacted: false;
  queuePressure: {
    commandActions: number;
    highRiskCommands: number;
    killOrPause: number;
    noHistory: number;
    openCommandRecords: number;
    overrides: number;
    reviewItems: number;
    rotationChanges: number;
    scaleReady: number;
    stale: number;
  };
  recommendations: Record<RevenueAssetRotationDecision, number>;
  risk: {
    highRiskAssets: number;
    killOrPauseAssets: number;
    mediumRiskAssets: number;
    riskLevel: "low" | "medium" | "high";
    untrackedAssets: number;
  };
  summary: string;
};

export type RevenuePortfolioDashboardResponse = {
  dashboard: RevenuePortfolioDashboardPlan;
};

export type RevenueFirstCashStatus =
  | "blocked"
  | "cash_active"
  | "needs_launch_approval"
  | "needs_products"
  | "needs_provider_handoff"
  | "needs_store_setup"
  | "ready_for_manual_launch";

export type RevenueAutomaticCashStatus =
  | "automatic_cash_ready"
  | "blocked"
  | "connector_design_needed"
  | "launch_work_needed"
  | "manual_launch_ready"
  | "payment_readiness_needed";

export type RevenueFirstCashNextAction =
  | "final_operator_launch_review"
  | "generate_provider_handoff"
  | "optimize_listings"
  | "prepare_store_setup"
  | "queue_launch_approval"
  | "queue_payment_readiness_review"
  | "queue_readonly_approvals"
  | "resolve_blockers"
  | "seed_product_drafts";

export type RevenuePaymentReadiness =
  | "approved_readonly"
  | "live_design_ready"
  | "missing"
  | "needs_approval"
  | "not_applicable";

export type RevenueFirstCashCandidate = {
  automaticCashEtaDays: number | null;
  automaticCashReady: boolean;
  automaticCashStatus: RevenueAutomaticCashStatus;
  blockers: Array<{
    code: string;
    severity: "low" | "medium" | "high";
    title: string;
  }>;
  cashReadinessScore: number;
  estimatedFirstSaleDays: number | null;
  evidence: {
    approvedProducts: number;
    launchReadinessScore: number;
    liveConnectorReadinessScore: number | null;
    payloadsPrepared: number;
    providerApprovalApproved: boolean;
    providerApprovalPending: boolean;
    revenue: number;
  };
  externalExecution: false;
  launchStage: string;
  manualLaunchReady: boolean;
  nextAction: {
    action: RevenueFirstCashNextAction;
    reason: string;
    title: string;
  };
  paymentReadiness: RevenuePaymentReadiness;
  providerContacted: false;
  status: RevenueFirstCashStatus;
  storeId: string;
  storeName: string;
  summary: string;
};

export type RevenueFirstCashReadinessPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  candidates: RevenueFirstCashCandidate[];
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Engine First Cash Readiness";
  options: {
    includeBlocked: boolean;
    maxCandidates: number;
    targetDaysToFirstCash: number;
  };
  providerContacted: false;
  summary: string;
  topCandidate: RevenueFirstCashCandidate | null;
  totals: {
    automaticCashReady: number;
    blocked: number;
    candidates: number;
    manualLaunchReady: number;
    targetReady: number;
  };
};

export type RevenueFirstCashReadinessResponse = {
  plan: RevenueFirstCashReadinessPlan;
};

export type RevenueFirstCashSprintStepStatus = "blocked" | "manual_gate" | "ready_internal" | "watch";

export type RevenueFirstCashSprintStep = {
  action: RevenueFirstCashNextAction;
  automaticCashEtaDays: number | null;
  bridgeActionId: string | null;
  blockers: string[];
  candidateRank: number;
  cashReadinessScore: number;
  dispatchKind: string;
  endpoint: string;
  estimatedFirstSaleDays: number | null;
  expectedInternalEffect: string;
  externalExecution: false;
  manualLaunchReady: boolean;
  nextActionTitle: string;
  priorityScore: number;
  providerContacted: false;
  reason: string;
  sprintActionId: string;
  status: RevenueFirstCashSprintStepStatus;
  storeId: string;
  storeName: string;
};

export type RevenueFirstCashSprintPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  bridge: {
    actions: number;
    readyActions: number;
    summary: string;
  };
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Engine First Cash Sprint";
  options: {
    includeBlocked: boolean;
    maxCandidates: number;
    maxSprintActions: number;
    targetDaysToFirstCash: number;
  };
  providerContacted: false;
  readiness: {
    summary: string;
    topAutomaticCashEtaDays: number | null;
    topFirstSaleEtaDays: number | null;
    topStoreId: string | null;
    topStoreName: string | null;
  };
  steps: RevenueFirstCashSprintStep[];
  summary: string;
  totals: {
    blocked: number;
    candidates: number;
    eligibleBridgeActions: number;
    manualGates: number;
    readyInternal: number;
    steps: number;
    targetReady: number;
    watch: number;
  };
};

export type RevenueFirstCashSprintResponse = {
  bridge: unknown;
  checklist: unknown;
  firstCash: RevenueFirstCashReadinessPlan;
  sprint: RevenueFirstCashSprintPlan;
};

export type RevenueFirstCashSprintApplyResponse = {
  dispatched: {
    actionsBlocked: number;
    actionsDispatched: number;
    actionsPreviewed: number;
    actionsSelected: number;
    actionsSkipped: number;
    dryRun: boolean;
    externalExecution: false;
    providerContacted: false;
    results: Array<Record<string, unknown>>;
    summary: string;
  };
  selectedBridgeActionIds: string[];
  sprint: RevenueFirstCashSprintPlan;
};

export type RevenueFirstBusinessLaunchStatus = "ready_internal" | "manual_gate" | "blocked" | "watch";

export type RevenueFirstBusinessLaunchCandidate = {
  blockers: string[];
  cashReadinessScore: number;
  checklistItemId: string;
  expectedInternalEffect: string;
  externalExecution: false;
  finalRank: number;
  incomeVelocityScore: number;
  launchReadinessScore: number;
  nextInternalAction: string;
  nextInternalState: string;
  priorityScore: number;
  providerContacted: false;
  reason: string;
  recommendedEndpoint: string;
  riskLevel: "low" | "medium" | "high";
  sprintActionId: string | null;
  status: RevenueFirstBusinessLaunchStatus;
  storeId: string | null;
  storeName: string;
  summary: string;
};

export type RevenueFirstBusinessLaunchProduct = {
  estimatedProfit: number;
  listingTitle: string | null;
  productId: string;
  productName: string;
  productType: string;
  profitMargin: number;
  status: string;
};

export type RevenueFirstBusinessContentTieIn = {
  briefId: string;
  channelPackages: number;
  hook: string;
  objective: "product_discovery" | "store_launch" | "conversion_repair" | "scale_remix";
  productId: string | null;
  status: "draft_queued" | "existing_record";
  title: string;
};

export type RevenueFirstBusinessLaunchPackage = {
  batchStage: {
    endpoint: string;
    expectedInternalEffect: string;
    name: "deployment";
    requiredConfirmation: "RUN INTERNAL MONEY ARMY BATCH PIPELINE";
  };
  blockedExternalActions: string[];
  contentTieIns: RevenueFirstBusinessContentTieIn[];
  externalExecution: false;
  manualApprovalGates: string[];
  organicTrafficPlan: {
    channels: string[];
    firstMoves: string[];
    noSpend: true;
    paidSpendLocked: true;
    summary: string;
  };
  products: RevenueFirstBusinessLaunchProduct[];
  providerContacted: false;
  store: {
    audience: string;
    businessName: string;
    industry: string;
    launchStatus: string;
    storeId: string;
    storePlatform: string;
  };
  summary: string;
};

export type RevenueFirstBusinessLaunchPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  candidates: RevenueFirstBusinessLaunchCandidate[];
  externalExecution: false;
  generatedAt: string;
  launchPackage: RevenueFirstBusinessLaunchPackage | null;
  mode: "Revenue Engine First Business Launch Path";
  providerContacted: false;
  sprint: {
    readyInternal: number;
    summary: string;
  };
  summary: string;
  topCandidate: RevenueFirstBusinessLaunchCandidate | null;
  totals: {
    blocked: number;
    candidates: number;
    contentTieIns: number;
    manualGates: number;
    organicTrafficMoves: number;
    productsPrepared: number;
    readyInternal: number;
    watch: number;
  };
};

export type RevenueFirstBusinessLaunchResponse = {
  checklist: unknown;
  plan: RevenueFirstBusinessLaunchPlan;
  sprint: RevenueFirstCashSprintPlan;
};

export type RevenueFirstBusinessLaunchApplyResponse = {
  dispatched: RevenueFirstCashSprintApplyResponse["dispatched"];
  plan: RevenueFirstBusinessLaunchPlan;
  selectedSprintActionIds: string[];
  sprint: RevenueFirstCashSprintPlan;
};

export type RevenueAssetControlPlan = {
  action: RevenueAssetRotationDecision;
  asset: RevenueAssetScore;
  auditOnly: boolean;
  blockedExternalActions: string[];
  change: RevenueRotationChange | null;
  controlReview: {
    alignment: "matches_recommendation" | "dashboard_override";
    executionScope: "audit_only" | "internal_status_change";
    requiresOperatorReview: boolean;
    riskTier: "low" | "medium" | "high";
    statusImpact: "none" | "product_status_change" | "store_status_change";
    summary: string;
  };
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Engine Asset Control";
  nextInternalState: PodProductStatus | MerchLaunchStatus | null;
  providerContacted: false;
  reason: string;
  requestedAction: RevenueAssetRotationDecision;
  statusChangeRequired: boolean;
  summary: string;
  warnings: string[];
};

export type RevenueAssetBatchSkippedAction = {
  action: RevenueAssetRotationDecision;
  assetId: string;
  assetType: "product" | "store";
  reason: string;
};

export type RevenueAssetBatchControlReview = {
  alignment: {
    dashboardOverrides: number;
    matchedRecommendations: number;
  };
  executionScope: {
    auditOnly: number;
    internalStatusChanges: number;
  };
  requiresOperatorReview: boolean;
  riskTier: "low" | "medium" | "high";
  riskTiers: {
    high: number;
    low: number;
    medium: number;
  };
  skipped: number;
  statusImpact: {
    none: number;
    productStatusChanges: number;
    storeStatusChanges: number;
  };
  summary: string;
};

export type RevenueAssetBatchControlPlan = {
  auditOnly: boolean;
  blockedExternalActions: string[];
  controlReview: RevenueAssetBatchControlReview;
  controls: RevenueAssetControlPlan[];
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Engine Asset Batch Control";
  productUpdates: RevenueRotationChange[];
  providerContacted: false;
  skipped: RevenueAssetBatchSkippedAction[];
  statusChangeRequired: boolean;
  storeUpdates: RevenueRotationChange[];
  summary: string;
  totals: {
    actions: number;
    auditOnly: number;
    kill: number;
    pause: number;
    productUpdates: number;
    scale: number;
    skipped: number;
    statusChangeRequired: number;
    storeUpdates: number;
    watch: number;
  };
  warnings: string[];
};

export type RevenueAssetControlRecordSnapshot = {
  assetId: string;
  assetName: string;
  assetScore: RevenueAssetScoreBreakdown;
  assetType: "product" | "store";
  auditLogId: string | null;
  auditOnly: boolean;
  control: Record<string, unknown>;
  createdAt: string;
  externalExecution: false;
  fromStatus: string | null;
  id: string;
  nextInternalState: string | null;
  override: boolean;
  providerContacted: false;
  reason: string;
  requestedAction: RevenueAssetRotationDecision;
  riskLevel: "low" | "medium" | "high";
  scoreBand: RevenueAssetScoreBand;
  scoringRecommendation: RevenueAssetRotationDecision;
  statusChangeRequired: boolean;
  storeId: string | null;
  storeName: string;
  toStatus: string | null;
  updatedAt: string;
  warnings: string[];
};

export type RevenueAssetControlLedgerPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Engine Asset Control Ledger";
  providerContacted: false;
  records: RevenueAssetControlRecordSnapshot[];
  summary: string;
  totals: {
    auditOnly: number;
    kill: number;
    overrides: number;
    pause: number;
    records: number;
    scale: number;
    statusChanges: number;
    watch: number;
  };
};

export type RevenueAssetControlLedgerResponse = {
  ledger: RevenueAssetControlLedgerPlan;
};

export type RevenueAssetControlRecoveryState =
  | "already_current"
  | "audit_only"
  | "manual_review"
  | "missing_asset"
  | "ready_to_replay"
  | "stale_score";

export type RevenueAssetControlRecoveryItem = {
  ageDays: number;
  assetId: string;
  assetName: string;
  assetType: "product" | "store";
  auditLogId: string | null;
  canReplay: boolean;
  createdAt: string;
  currentFinalRank: number | null;
  currentRecommendation: RevenueAssetRotationDecision | null;
  currentState: string | null;
  latestFinalRank: number;
  nextInternalState: string | null;
  reason: string;
  recordId: string;
  requestedAction: RevenueAssetRotationDecision;
  requiresOperatorReview: boolean;
  riskTier: "low" | "medium" | "high";
  scoreDelta: number | null;
  scoringRecommendation: RevenueAssetRotationDecision;
  state: RevenueAssetControlRecoveryState;
  targetState: string | null;
  warnings: string[];
};

export type RevenueAssetControlRecoveryPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Engine Asset Control Recovery";
  providerContacted: false;
  recoveryQueue: RevenueAssetControlRecoveryItem[];
  summary: string;
  totals: {
    alreadyCurrent: number;
    auditOnly: number;
    items: number;
    manualReview: number;
    missingAssets: number;
    readyToReplay: number;
    staleScore: number;
  };
};

export type RevenueAssetControlRecoveryResponse = {
  recovery: RevenueAssetControlRecoveryPlan;
};

export type RevenueAssetControlLedgerQuery = {
  action?: RevenueAssetRotationDecision | "";
  assetId?: string;
  assetType?: "product" | "store" | "";
  fromDate?: string;
  includeOverridesOnly?: boolean;
  limit?: number;
  storeId?: string;
  toDate?: string;
};

export type RevenueAssetReviewQueueTrigger =
  | "kill_risk"
  | "pause_risk"
  | "scale_ready"
  | "override_review"
  | "stale_review"
  | "no_control_history"
  | "watch_followup";

export type RevenueAssetReviewQueueState =
  | "resolve_override_against_current_score"
  | "queue_manual_scale_budget_review"
  | "pause_or_kill_asset"
  | "record_first_control_decision"
  | "collect_more_signal"
  | "keep_watching";

export type RevenueAssetReviewQueueControlHistory = {
  currentRecommendationChanged: boolean;
  latestActionAgeDays: number | null;
  latestOverride: boolean;
  latestRequestedAction: RevenueAssetRotationDecision | null;
  latestScoringRecommendation: RevenueAssetRotationDecision | null;
  latestStatusChangeRequired: boolean | null;
  overrides: number;
  records: number;
  statusChanges: number;
};

export type RevenueAssetReviewQueueItem = {
  assetId: string;
  assetName: string;
  assetScore: RevenueAssetScoreBreakdown;
  assetType: "product" | "store";
  controlHistory: RevenueAssetReviewQueueControlHistory;
  currentRecommendation: RevenueAssetRotationDecision;
  evidence: string[];
  externalExecution: false;
  latestControl: {
    createdAt: string;
    override: boolean;
    requestedAction: RevenueAssetRotationDecision;
    scoringRecommendation: RevenueAssetRotationDecision;
    statusChangeRequired: boolean;
    toStatus: string | null;
  } | null;
  nextReviewState: RevenueAssetReviewQueueState;
  priority: number;
  providerContacted: false;
  reason: string;
  riskLevel: "low" | "medium" | "high";
  scoreBand: RevenueAssetScoreBand;
  storeId: string;
  storeName: string;
  trigger: RevenueAssetReviewQueueTrigger;
};

export type RevenueAssetReviewQueuePlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Engine Asset Review Queue";
  providerContacted: false;
  queue: RevenueAssetReviewQueueItem[];
  summary: string;
  totals: {
    items: number;
    killOrPause: number;
    noHistory: number;
    overrides: number;
    scaleReady: number;
    stale: number;
    watch: number;
  };
};

export type RevenueAssetReviewQueueResponse = {
  plan: RevenueAssetReviewQueuePlan;
};

export type RevenueAssetReviewQueueQuery = {
  includeWatch?: boolean;
  maxItems?: number;
  staleAfterDays?: number;
};

export type RevenueAssetActionApplyResponse = {
  applied: {
    action: RevenueAssetRotationDecision;
    auditLogId: string | null;
    auditOnly: boolean;
    dryRun: boolean;
    externalExecution: false;
    productUpdates: RevenueRotationChange[];
    providerContacted: false;
    statusChangeRequired: boolean;
    storeUpdates: RevenueRotationChange[];
  };
  control: RevenueAssetControlPlan;
  controlRecord?: RevenueAssetControlRecordSnapshot | null;
  portfolio: RevenueAssetPortfolio;
};

export type RevenueAssetBatchActionApplyResponse = {
  applied: {
    actions: number;
    auditLogId: string | null;
    auditOnly: boolean;
    dryRun: boolean;
    externalExecution: false;
    productUpdates: RevenueRotationChange[];
    providerContacted: false;
    skipped: RevenueAssetBatchSkippedAction[];
    statusChangeRequired: boolean;
    storeUpdates: RevenueRotationChange[];
  };
  batch: RevenueAssetBatchControlPlan;
  controlRecords?: RevenueAssetControlRecordSnapshot[];
  portfolio: RevenueAssetPortfolio;
};

export type RevenueRotationApplyResponse = {
  applied: {
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    productUpdates: RevenueRotationChange[];
    storeUpdates: RevenueRotationChange[];
  };
  plan: RevenueEnginePlan;
  portfolio: RevenueAssetPortfolio;
};

export type RevenueLaunchAction = "seed_products" | "prepare_launch_package" | "queue_launch_approval" | "optimize_listings" | "hold";

export type RevenueLaunchPipelineOptions = {
  maxStores: number;
  minApprovedProducts: number;
  minPortfolioProductsPerStore: number;
  productCount: ProductBatchSize;
  riskTolerance: ProductBatchRiskTolerance;
};

export type RevenueLaunchStorePlan = {
  action: RevenueLaunchAction;
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    reason: string;
    status: "Required" | "Already queued" | "Not ready";
  };
  batchInput: {
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
  confidence: number;
  existingProducts: number;
  externalExecution: false;
  launchPackageReady: boolean;
  missingProducts: number;
  priority: number;
  projectedDraftProfit: number;
  readyProductIds: string[];
  readyProducts: number;
  reason: string;
  score: number;
  storeId: string;
  storeName: string;
  targetProductTypes: string[];
};

export type RevenueLaunchQueueItem = {
  action: RevenueLaunchAction;
  externalExecution: false;
  id: string;
  priority: number;
  storeId: string;
  summary: string;
  title: string;
};

export type RevenueLaunchPipelinePlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Launch Pipeline";
  options: RevenueLaunchPipelineOptions;
  queue: RevenueLaunchQueueItem[];
  storePlans: RevenueLaunchStorePlan[];
  summary: string;
  totals: {
    approvalReadyStores: number;
    draftProductsNeeded: number;
    estimatedDraftProfit: number;
    launchPackageReadyStores: number;
    queuedStores: number;
    storesEvaluated: number;
  };
};

export type RevenueLaunchPipelineResponse = {
  plan: RevenueLaunchPipelinePlan;
};

export type RevenueLaunchPipelineApplyResponse = {
  applied: {
    approvalPackets: Array<{
      auditLogId?: string | null;
      id: string | null;
      storeId: string;
    }>;
    auditLogId: string | null;
    createdProducts: number | Array<{
      id: string;
      productName: string;
      storeId: string;
    }>;
    dryRun: boolean;
    externalExecution: false;
    storeUpdates: Array<{
      action?: RevenueLaunchAction;
      approvalStatus?: MerchApprovalStatus | string;
      launchStatus?: MerchLaunchStatus | string;
      storeId: string;
      storeName: string;
    }>;
  };
  plan: RevenueLaunchPipelinePlan;
};

export type RevenueLaunchReadinessStage =
  | "product_drafting"
  | "listing_optimization"
  | "launch_approval"
  | "store_setup"
  | "provider_payload_review"
  | "handoff_ready"
  | "live_monitoring"
  | "blocked";

export type RevenueLaunchReadinessAction =
  | "seed_product_drafts"
  | "optimize_listings"
  | "queue_launch_approval"
  | "prepare_store_setup"
  | "request_provider_payload_approval"
  | "generate_provider_handoff"
  | "ingest_performance"
  | "hold_review";

export type RevenueLaunchReadinessItem = {
  approvalState: {
    approvedPackets: number;
    latestProviderApprovalId: string | null;
    pendingPackets: number;
    providerApprovalApproved: boolean;
    providerApprovalPending: boolean;
    rejectedPackets: number;
    totalPackets: number;
  };
  blockers: Array<{
    code: string;
    severity: "low" | "medium" | "high";
    title: string;
  }>;
  externalExecution: false;
  launchPipeline: {
    action: string;
    missingProducts: number;
    readyProducts: number;
    reason: string;
  } | null;
  nextInternalAction: RevenueLaunchReadinessAction;
  priority: number;
  providerContacted: false;
  providerPayload: {
    adapterCoverage: string[];
    payloadCount: number;
    readinessScore: number;
    warnings: string[];
  };
  readinessScore: number;
  riskLevel: "low" | "medium" | "high";
  stage: RevenueLaunchReadinessStage;
  store: {
    approvalStatus: MerchApprovalStatus | string;
    businessName: string;
    estimatedProfit: number;
    id: string;
    launchStatus: MerchLaunchStatus | string;
    productTypes: string[];
    revenue: number;
    storePlatform: MerchStorePlatform | string;
  };
  storeSetup: {
    connectorReadinessScore: number;
    connectorStatus: string;
    queuedAction: string;
    readinessScore: number;
  } | null;
  summary: string;
};

export type RevenueLaunchReadinessPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Launch Readiness Board";
  options: {
    includeApprovalHistory: boolean;
    maxStores: number;
    minLaunchReadiness: number;
    minProviderReadiness: number;
  };
  providerContacted: false;
  queue: Array<{
    action: RevenueLaunchReadinessAction;
    externalExecution: false;
    priority: number;
    readinessScore: number;
    storeId: string;
    storeName: string;
    summary: string;
  }>;
  stageCounts: Record<RevenueLaunchReadinessStage, number>;
  stores: RevenueLaunchReadinessItem[];
  summary: string;
  totals: {
    approvedProviderPackets: number;
    blockedStores: number;
    handoffReadyStores: number;
    payloadsPrepared: number;
    queuedStores: number;
    storesEvaluated: number;
  };
};

export type RevenueLaunchReadinessResponse = {
  plan: RevenueLaunchReadinessPlan;
};

export type RevenueLaunchChecklistStageKey =
  | "opportunity"
  | "drafts"
  | "launch_readiness"
  | "connector_approval"
  | "import_handoff"
  | "signal_evidence"
  | "asset_scoring"
  | "next_revenue_actions";

export type RevenueLaunchChecklistStageStatus = "missing" | "ready" | "watch" | "blocked" | "complete";

export type RevenueLaunchChecklistNextAction =
  | "create_store_shell"
  | "seed_product_drafts"
  | "run_listing_optimization"
  | "prepare_store_setup"
  | "queue_launch_approval"
  | "request_provider_payload_approval"
  | "generate_provider_handoff"
  | "queue_connector_approval"
  | "review_connector_approval"
  | "queue_signal_import_job"
  | "ingest_import_handoff"
  | "ingest_performance_snapshot"
  | "apply_portfolio_commands"
  | "monitor_scale_or_rotate"
  | "hold_review";

export type RevenueLaunchChecklistStage = {
  action: RevenueLaunchChecklistNextAction;
  key: RevenueLaunchChecklistStageKey;
  score: number;
  status: RevenueLaunchChecklistStageStatus;
  summary: string;
};

export type RevenueLaunchChecklistAssetSignal = {
  assetId: string;
  assetName: string;
  assetType: "product" | "store";
  economicsScore: number;
  finalRank: number;
  nextInternalState: string | null;
  readinessScore: number;
  reason: string;
  recommendation: RevenueAssetRotationDecision;
  riskPenalty: number;
  scoreBand: RevenueAssetScoreBand;
  velocity: number;
};

export type RevenueLaunchChecklistItem = {
  assetSignal: RevenueLaunchChecklistAssetSignal | null;
  blockers: string[];
  businessName: string;
  commandActions: Array<{
    action: PortfolioCommandAction;
    commandHash: string;
    expectedInternalEffect: string;
    priority: number;
    riskLevel: PortfolioCommandRiskLevel;
    sourceModule: string;
  }>;
  externalExecution: false;
  id: string;
  incomeVelocityScore: number;
  metrics: {
    approvedProducts: number;
    commandActions: number;
    completedHandoffs: number;
    connectorApprovalQueue: number;
    estimatedDraftProfit: number;
    importHandoffsReady: number;
    importJobs: number;
    listingReadyProducts: number;
    netProfit: number;
    pendingConnectorApprovals: number;
    performanceSnapshots: number;
    scoredAssets: number;
    productDrafts: number;
    revenue: number;
    signalEvidence: number;
  };
  nextAction: RevenueLaunchChecklistNextAction;
  nextActionLabel: string;
  opportunityId: string | null;
  opportunityStatus: string | null;
  priorityScore: number;
  providerContacted: false;
  readinessScore: number;
  riskLevel: "low" | "medium" | "high";
  stages: RevenueLaunchChecklistStage[];
  storeId: string | null;
  storeName: string;
  summary: string;
};

export type RevenueLaunchChecklistPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  items: RevenueLaunchChecklistItem[];
  mode: "Internal Revenue Launch Checklist";
  options: {
    includeCompleted: boolean;
    maxItems: number;
    minPriorityScore: number;
    windowDays: number;
  };
  providerContacted: false;
  stageCounts: Record<RevenueLaunchChecklistStageStatus, number>;
  summary: string;
  totals: {
    approvedProducts: number;
    blockedItems: number;
    commandActions: number;
    completedItems: number;
    connectorApprovalQueue: number;
    estimatedDraftProfit: number;
    importHandoffsReady: number;
    importJobs: number;
    items: number;
    killAssets: number;
    listingReadyProducts: number;
    netProfit: number;
    opportunities: number;
    pendingConnectorApprovals: number;
    pauseAssets: number;
    productDrafts: number;
    readyItems: number;
    revenue: number;
    scaleAssets: number;
    scoredAssets: number;
    signalEvidenceItems: number;
    stores: number;
    watchAssets: number;
  };
};

export type RevenueLaunchChecklistResponse = {
  plan: RevenueLaunchChecklistPlan;
};

export type RevenueLaunchChecklistActionBridgeDispatchKind =
  | "launch_pipeline"
  | "listing_optimization"
  | "store_setup"
  | "signal_connector_approval"
  | "signal_import_job"
  | "signal_import_handoff"
  | "portfolio_command"
  | "manual_review";

export type RevenueLaunchChecklistActionBridgeStatus = "ready" | "blocked" | "watch";

export type RevenueLaunchChecklistActionBridgeOptions = {
  includeCompleted: boolean;
  maxActions: number;
  maxItems: number;
  minPriorityScore: number;
  windowDays: number;
};

export type RevenueLaunchChecklistActionBridgeItem = {
  actionId: string;
  blockedReason: string | null;
  checklistAction: RevenueLaunchChecklistNextAction;
  checklistItemId: string;
  confirmationRequired: string;
  dispatchKind: RevenueLaunchChecklistActionBridgeDispatchKind;
  endpoint: string;
  externalExecution: false;
  payload: Record<string, unknown>;
  priorityScore: number;
  providerContacted: false;
  status: RevenueLaunchChecklistActionBridgeStatus;
  storeId: string | null;
  storeName: string;
  summary: string;
};

export type RevenueLaunchChecklistActionBridgePlan = {
  actions: RevenueLaunchChecklistActionBridgeItem[];
  auditEvents: string[];
  blockedExternalActions: string[];
  checklist: {
    generatedAt: string;
    items: number;
    readyItems: number;
    summary: string;
  };
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Revenue Launch Checklist Action Bridge";
  options: RevenueLaunchChecklistActionBridgeOptions;
  providerContacted: false;
  summary: string;
  totals: {
    actions: number;
    blockedActions: number;
    connectorApprovalActions: number;
    importHandoffActions: number;
    importJobActions: number;
    launchPipelineActions: number;
    listingOptimizationActions: number;
    manualReviewActions: number;
    portfolioCommandActions: number;
    readyActions: number;
    storeSetupActions: number;
    watchActions: number;
  };
};

export type RevenueLaunchChecklistActionBridgeResponse = {
  checklist: RevenueLaunchChecklistPlan;
  plan: RevenueLaunchChecklistActionBridgePlan;
};

export type RevenueLaunchChecklistActionBridgeApplyResponse = {
  bridge: RevenueLaunchChecklistActionBridgePlan;
  checklist: RevenueLaunchChecklistPlan | null;
  dispatched: {
    actionsBlocked: number;
    actionsDispatched: number;
    actionsPreviewed: number;
    actionsSelected: number;
    actionsSkipped: number;
    dryRun: boolean;
    externalExecution: false;
    providerContacted: false;
    results: Array<{
      actionId: string;
      dispatchKind: RevenueLaunchChecklistActionBridgeDispatchKind;
      externalExecution: false;
      providerContacted: false;
      result: Record<string, unknown>;
      status: "blocked" | "dispatched" | "previewed" | "skipped";
    }>;
    summary: string;
  };
};

export type RevenueLaunchSprintStopReason =
  | "cycle_limit"
  | "dry_run"
  | "manual_review_required"
  | "no_ready_actions";

export type RevenueLaunchSprintCycle = {
  blockedActions: number;
  cycle: number;
  dispatched: {
    actionsBlocked: number;
    actionsDispatched: number;
    actionsPreviewed: number;
    actionsSelected: number;
    actionsSkipped: number;
    assetControlActionsSkipped: number;
    assetControlRecordsCreated: number;
    commandRecordsCreated: number;
    dryRun: boolean;
    externalExecution: false;
    internalStatusUpdates: number;
    providerContacted: false;
    summary: string;
  } | null;
  manualReviewActions: Array<{
    actionId: string;
    blockedReason: string | null;
    checklistAction: RevenueLaunchChecklistNextAction;
    dispatchKind: RevenueLaunchChecklistActionBridgeDispatchKind;
    endpoint: string;
    storeId: string | null;
    storeName: string;
  }>;
  readyActions: number;
  scoreControlActions: number;
  selectedActionIds: string[];
  selectedDispatchKinds: RevenueLaunchChecklistActionBridgeDispatchKind[];
  watchActions: number;
};

export type RevenueLaunchSprintPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  cycles: RevenueLaunchSprintCycle[];
  externalExecution: false;
  factory: {
    auditLogId: string | null;
    businessName: string | null;
    dryRun: boolean;
    externalExecution: false;
    opportunityId: string | null;
    productDraftsCreated: number;
    providerContacted: false;
    skippedExistingProducts: number;
    storeCreated: boolean;
    storeId: string | null;
  } | null;
  finalChecklist: {
    blockedItems: number;
    importHandoffsReady: number;
    items: number;
    readyItems: number;
    scoredAssets: number;
    signalEvidenceItems: number;
    summary: string;
  };
  finalManualReviewActions: RevenueLaunchSprintCycle["manualReviewActions"];
  finalReadyActions: number;
  generatedAt: string;
  mode: "Internal Revenue Launch Sprint";
  options: {
    includeCompleted: boolean;
    maxActions: number;
    maxCycles: number;
    maxItems: number;
    minPriorityScore: number;
    windowDays: number;
  };
  providerContacted: false;
  stopReason: RevenueLaunchSprintStopReason;
  summary: string;
  totals: {
    actionsBlocked: number;
    actionsDispatched: number;
    actionsPreviewed: number;
    actionsSelected: number;
    actionsSkipped: number;
    assetControlActionsSkipped: number;
    assetControlRecordsCreated: number;
    commandRecordsCreated: number;
    cyclesRun: number;
    factoryProductDraftsCreated: number;
    factoryStoreCreated: number;
    internalStatusUpdates: number;
    manualReviewActions: number;
    scoreControlActions: number;
  };
};

export type RevenueLaunchSprintResponse = {
  bridge: RevenueLaunchChecklistActionBridgePlan;
  checklist: RevenueLaunchChecklistPlan;
  sprint: RevenueLaunchSprintPlan;
};

export type RevenueLaunchHandoffAction =
  | "review_provider_handoff_bundle"
  | "request_provider_payload_approval"
  | "resolve_handoff_blockers";

export type RevenueLaunchHandoffRecordStatus = "blocked_review" | "queued_review" | "ready_for_manual_handoff";
export type RevenueLaunchHandoffControlStatus = RevenueLaunchHandoffRecordStatus | "archived";

export type RevenueLaunchHandoffItem = {
  action: RevenueLaunchHandoffAction;
  approvedPacketId: string | null;
  artifactSlotCount: number;
  blockers: Array<{
    code: string;
    severity: "low" | "medium" | "high";
    title: string;
  }>;
  bundle: ProviderHandoffBundle | null;
  connectorReadiness: ProviderHandoffBundle["connectorReadiness"] | null;
  credentialScopes: string[];
  externalExecution: false;
  launchReadiness: {
    nextInternalAction: RevenueLaunchReadinessAction;
    readinessScore: number;
    stage: RevenueLaunchReadinessStage;
  };
  manifestCount: number;
  priority: number;
  providerContacted: false;
  providerPayload: {
    adapterCoverage: string[];
    payloadCount: number;
    readinessScore: number;
    warnings: string[];
  };
  providers: string[];
  riskLevel: "low" | "medium" | "high";
  storeId: string;
  storeName: string;
  summary: string;
};

export type RevenueLaunchHandoffPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  items: RevenueLaunchHandoffItem[];
  mode: "Internal Launch Handoff Packet Builder";
  options: {
    includeBlocked: boolean;
    maxBundles: number;
    minConnectorReadiness: number;
    minLaunchReadiness: number;
    minProviderReadiness: number;
  };
  persistedPackets: RevenueLaunchHandoffPacketRecord[];
  providerContacted: false;
  queue: Array<{
    action: RevenueLaunchHandoffAction;
    externalExecution: false;
    priority: number;
    storeId: string;
    storeName: string;
    summary: string;
  }>;
  summary: string;
  totals: {
    artifactSlots: number;
    blockedBundles: number;
    bundlesPrepared: number;
    credentialScopes: number;
    manifestsPrepared: number;
    needsReview: number;
    openPacketRecords: number;
    readyForManualHandoff: number;
    storesEvaluated: number;
  };
};

export type RevenueLaunchHandoffPacketRecord = {
  action: RevenueLaunchHandoffAction | string;
  approvedPacketId: string | null;
  artifactSlotCount: number;
  auditLogId: string | null;
  blockedActions: string[];
  blockers: Array<{
    code: string;
    severity: "low" | "medium" | "high";
    title: string;
  }>;
  bundle: ProviderHandoffBundle | null;
  connectorReadinessScore: number;
  connectorStatus: string | null;
  createdAt: string;
  credentialScopes: string[];
  dedupeKey: string;
  externalExecution: false;
  id: string;
  launchReadinessScore: number;
  manifestCount: number;
  providerContacted: false;
  providerReadinessScore: number;
  providers: string[];
  riskLevel: "low" | "medium" | "high" | string;
  status: RevenueLaunchHandoffRecordStatus | string;
  storeId: string;
  storeName: string;
  summary: string;
  updatedAt: string;
};

export type RevenueLaunchHandoffResponse = {
  plan: RevenueLaunchHandoffPlan;
  records: RevenueLaunchHandoffPacketRecord[];
};

export type RevenueLaunchHandoffApplyResponse = {
  applied: {
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    providerContacted: false;
    readyForManualHandoff: number;
    recordsCreated: number;
    recordsToWrite: number;
    recordsUpdated: number;
    storedRecords: RevenueLaunchHandoffPacketRecord[];
  };
  plan: RevenueLaunchHandoffPlan;
  records: RevenueLaunchHandoffPacketRecord[];
};

export type RevenueLaunchHandoffControlItem = RevenueLaunchHandoffPacketRecord & {
  controlActions: Array<{
    enabled: boolean;
    reason: string;
    status: RevenueLaunchHandoffControlStatus;
    title: string;
  }>;
  recommendedStatus: RevenueLaunchHandoffControlStatus;
  reviewBlockers: Array<{
    code: string;
    severity: "low" | "medium" | "high";
    title: string;
  }>;
};

export type RevenueLaunchHandoffControlPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Launch Handoff Control Center";
  options: {
    includeArchived: boolean;
    maxPackets: number;
    minConnectorReadiness: number;
  };
  packets: RevenueLaunchHandoffControlItem[];
  providerContacted: false;
  statusCounts: Record<RevenueLaunchHandoffControlStatus, number>;
  summary: string;
  totals: {
    archivedPackets: number;
    artifactSlots: number;
    blockedPackets: number;
    manifestCount: number;
    packets: number;
    queuedPackets: number;
    readyForManualHandoff: number;
  };
};

export type RevenueLaunchHandoffControlResponse = {
  plan: RevenueLaunchHandoffControlPlan;
};

export type RevenueLaunchHandoffControlApplyResponse = {
  applied: {
    allowed: boolean;
    auditLogId: string | null;
    blockers: string[];
    dryRun: boolean;
    externalExecution: false;
    fromStatus: RevenueLaunchHandoffControlStatus;
    note: string | null;
    packetId: string;
    providerContacted: false;
    reason: string;
    toStatus: RevenueLaunchHandoffControlStatus;
  };
  evaluation: {
    allowed: boolean;
    blockers: string[];
    externalExecution: false;
    fromStatus: RevenueLaunchHandoffControlStatus;
    providerContacted: false;
    reason: string;
    toStatus: RevenueLaunchHandoffControlStatus;
  };
  plan: RevenueLaunchHandoffControlPlan;
};

export type RevenueLaunchOperationsPackStatus = "ready_for_manual_launch" | "needs_review" | "blocked";
export type RevenueLaunchOperationsPackQueueAction = "record_launch_pack" | "review_launch_pack" | "resolve_launch_blockers";

export type RevenueLaunchOperationsRequestManifest = {
  action: string;
  artifactSlots: number;
  credentialScope: string[];
  executionState: "Locked - manual handoff only";
  id: string;
  pathTemplate: string;
  productName: string;
  provider: string;
};

export type RevenueLaunchOperationsPack = {
  artifactSlots: Array<ProviderHandoffArtifactSlot & {
    manifestId: string;
    provider: string;
  }>;
  auditTrail: {
    approvedPacketId: string | null;
    handoffPacketAuditLogId: string | null;
    handoffPacketId: string | null;
    reviewAuditLogId: string | null;
  };
  blockers: Array<{
    code: string;
    severity: "low" | "medium" | "high";
    title: string;
  }>;
  checklist: {
    blockers: string[];
    nextAction: RevenueLaunchChecklistNextAction | null;
    priorityScore: number;
    readyStages: number;
    signalEvidence: number;
    summary: string | null;
  };
  credentialScopes: string[];
  externalExecution: false;
  manualOnly: true;
  manualSteps: string[];
  operatorBrief: {
    businessName: string;
    nextReviewGate: string;
    productNames: string[];
    providers: string[];
    readinessLine: string;
    storeName: string;
  };
  priority: number;
  providerContacted: false;
  qaChecklist: string[];
  readiness: {
    connectorReadinessScore: number;
    launchReadinessScore: number;
    overallScore: number;
    providerReadinessScore: number;
  };
  requestManifests: RevenueLaunchOperationsRequestManifest[];
  riskLevel: "low" | "medium" | "high";
  status: RevenueLaunchOperationsPackStatus;
  storeId: string;
  storeName: string;
  summary: string;
};

export type RevenueLaunchOperationsPackPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Revenue Launch Operations Pack";
  options: {
    includeBlocked: boolean;
    maxPacks: number;
    minConnectorReadiness: number;
    minLaunchReadiness: number;
    minProviderReadiness: number;
  };
  packs: RevenueLaunchOperationsPack[];
  providerContacted: false;
  queue: Array<{
    action: RevenueLaunchOperationsPackQueueAction;
    externalExecution: false;
    priority: number;
    providerContacted: false;
    status: RevenueLaunchOperationsPackStatus;
    storeId: string;
    storeName: string;
    summary: string;
  }>;
  summary: string;
  totals: {
    artifactSlots: number;
    blockedPacks: number;
    credentialScopes: number;
    manualSteps: number;
    packs: number;
    readyPacks: number;
    requestManifests: number;
    reviewPacks: number;
  };
};

export type RevenueLaunchOperationsPackResponse = {
  plan: RevenueLaunchOperationsPackPlan;
};

export type RevenueLaunchOperationsPackApplyResponse = {
  applied: {
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    packsRecorded: number;
    packsSelected: number;
    providerContacted: false;
    readyPacks: number;
    summary: string;
  };
  plan: RevenueLaunchOperationsPackPlan;
};

export type RevenueLaunchClosureLedgerStatus =
  | "blocked"
  | "needs_review"
  | "ready_for_manual_launch"
  | "monitoring_ready";

export type RevenueLaunchClosureLedgerAction =
  | "record_closure_scorecard"
  | "schedule_monitoring"
  | "review_launch_pack"
  | "resolve_blockers";

export type RevenueLaunchClosureMonitoringTrigger = {
  blockedExternalActions: string[];
  cadence: string;
  evidenceRequired: string[];
  externalExecution: false;
  providerContacted: false;
  status: "queued_internal" | "blocked_review";
  trigger: "revenue_snapshot" | "content_signal" | "refund_watch" | "payout_governance" | "scale_or_rotate_review";
};

export type RevenueLaunchClosureLedgerEntry = {
  blockers: Array<{
    code: string;
    severity: "low" | "medium" | "high";
    title: string;
  }>;
  closureScore: number;
  externalExecution: false;
  expectedFirstWeekRevenue: {
    assumptions: string[];
    conservative: number;
    currency: "USD";
    target: number;
    upside: number;
  };
  launchPack: {
    artifactSlots: number;
    auditReady: boolean;
    manualSteps: number;
    packStatus: RevenueLaunchOperationsPackStatus;
    requestManifests: number;
    reviewGate: string;
  };
  manualReview: {
    approvedPacketId: string | null;
    handoffPacketAuditLogId: string | null;
    handoffPacketId: string | null;
    required: true;
    state: "ready" | "needs_review" | "blocked";
  };
  monitoringTriggers: RevenueLaunchClosureMonitoringTrigger[];
  nextAction: RevenueLaunchClosureLedgerAction;
  performanceEvidence: {
    evidenceGrade: "none" | "thin" | "usable" | "strong";
    grossRevenue: number;
    netProfit: number;
    profitVelocity: number;
    revenueVelocity: number;
    snapshots: number;
  };
  priority: number;
  providerContacted: false;
  readiness: RevenueLaunchOperationsPack["readiness"];
  riskLevel: RevenueLaunchOperationsPack["riskLevel"];
  status: RevenueLaunchClosureLedgerStatus;
  storeId: string;
  storeName: string;
  summary: string;
};

export type RevenueLaunchClosureLedgerPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  entries: RevenueLaunchClosureLedgerEntry[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Launch Revenue Closure Ledger";
  options: {
    expectedOrderValue: number;
    includeBlocked: boolean;
    maxEntries: number;
    minClosureScore: number;
    monitoringWindowDays: number;
    targetFirstWeekRevenue: number;
  };
  providerContacted: false;
  queue: Array<{
    action: RevenueLaunchClosureLedgerAction;
    closureScore: number;
    externalExecution: false;
    priority: number;
    providerContacted: false;
    status: RevenueLaunchClosureLedgerStatus;
    storeId: string;
    storeName: string;
    summary: string;
  }>;
  summary: string;
  totals: {
    blockedEntries: number;
    entries: number;
    expectedFirstWeekRevenue: number;
    monitoringReady: number;
    needsReview: number;
    readyForManualLaunch: number;
    triggersQueued: number;
  };
};

export type RevenueLaunchClosureLedgerResponse = {
  plan: RevenueLaunchClosureLedgerPlan;
};

export type RevenueLaunchClosureLedgerApplyResponse = {
  applied: {
    auditLogId: string | null;
    dryRun: boolean;
    entriesRecorded: number;
    entriesSelected: number;
    externalExecution: false;
    providerContacted: false;
    summary: string;
    triggersQueued: number;
  };
  plan: RevenueLaunchClosureLedgerPlan;
};

export type RevenueLiveConnectorReadinessStatus =
  | "blocked"
  | "needs_readonly_approval"
  | "needs_operator_review"
  | "ready_for_design";

export type RevenueLiveConnectorReadinessAction =
  | "resolve_launch_blockers"
  | "queue_readonly_approvals"
  | "review_live_boundary"
  | "record_connector_design_readiness";

export type RevenueLiveConnectorBoundaryRole =
  | "storefront"
  | "pod_provider"
  | "payments"
  | "content"
  | "manual_import";

export type RevenueLiveConnectorBoundary = {
  approvalGates: string[];
  blockedExternalActions: string[];
  credentialEnvVars: string[];
  endpointTemplates: string[];
  externalExecution: false;
  futureLiveScopes: RevenueSignalConnectorScope[];
  lane: RevenueSignalConnectorLane | "launch";
  liveMode: "blocked_until_operator_design_approval";
  provider: RevenueSignalConnectorProvider | "other";
  providerContacted: false;
  providerName: string;
  readOnlyScopes: RevenueSignalConnectorScope[];
  readiness: "missing_manifest" | "needs_approval" | "approved_readonly" | "design_review_ready";
  role: RevenueLiveConnectorBoundaryRole;
  rollbackControls: string[];
};

export type RevenueLiveConnectorReadinessEntry = {
  action: RevenueLiveConnectorReadinessAction;
  approvalGates: Array<{
    evidenceRequired: string[];
    gate: string;
    status: "blocked" | "pending" | "ready";
  }>;
  blockers: Array<{
    code: string;
    severity: "low" | "medium" | "high";
    title: string;
  }>;
  closure: {
    expectedFirstWeekRevenue: number;
    performanceSnapshots: number;
    score: number;
    status: RevenueLaunchClosureLedgerStatus;
  };
  connectorBoundaries: RevenueLiveConnectorBoundary[];
  externalExecution: false;
  operationsPack: {
    artifactSlots: number;
    auditReady: boolean;
    credentialScopes: string[];
    manualSteps: number;
    providers: string[];
    requestManifests: number;
    status: RevenueLaunchOperationsPackStatus;
  };
  priority: number;
  providerContacted: false;
  readinessScore: number;
  readOnlyEvidence: {
    approvedConnectors: number;
    importJobsQueued: number;
    manifestIds: string[];
    pendingApprovals: number;
    readyManifests: number;
    requiredConnectors: number;
  };
  rollbackControls: string[];
  status: RevenueLiveConnectorReadinessStatus;
  storeId: string;
  storeName: string;
  summary: string;
};

export type RevenueLiveConnectorReadinessRegistryPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  entries: RevenueLiveConnectorReadinessEntry[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Revenue Live Connector Readiness Registry";
  options: {
    includeBlocked: boolean;
    maxEntries: number;
    minClosureScore: number;
    minReadOnlyConnectors: number;
    requireOperationsPackAudit: boolean;
    requirePerformanceEvidence: boolean;
  };
  providerContacted: false;
  queue: Array<{
    action: RevenueLiveConnectorReadinessAction;
    externalExecution: false;
    priority: number;
    providerContacted: false;
    readinessScore: number;
    status: RevenueLiveConnectorReadinessStatus;
    storeId: string;
    storeName: string;
    summary: string;
  }>;
  summary: string;
  totals: {
    approvedReadOnlyConnectors: number;
    blockedEntries: number;
    entries: number;
    needsOperatorReview: number;
    needsReadOnlyApproval: number;
    readyForDesign: number;
    requiredBoundaries: number;
  };
};

export type RevenueLiveConnectorReadinessResponse = {
  plan: RevenueLiveConnectorReadinessRegistryPlan;
};

export type RevenueLiveConnectorReadinessApplyResponse = {
  applied: {
    auditLogId: string | null;
    dryRun: boolean;
    entriesRecorded: number;
    entriesSelected: number;
    externalExecution: false;
    providerContacted: false;
    readyForDesign: number;
    requiredBoundaries: number;
    summary: string;
  };
  plan: RevenueLiveConnectorReadinessRegistryPlan;
};

export type RevenueLiveConnectorDesignDossierStatus =
  | "blocked"
  | "needs_readiness_review"
  | "design_review_ready"
  | "final_operator_approval_ready";

export type RevenueLiveConnectorDesignDossierAction =
  | "resolve_readiness_blockers"
  | "review_readiness_registry"
  | "rehearse_connector_design"
  | "queue_final_operator_packet";

export type RevenueLiveConnectorDryRunRequest = {
  action: string;
  bodyPlan: string[];
  executionMode: "dry_run_only";
  externalExecution: false;
  headers: Record<string, string>;
  idempotencyKey: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  pathTemplate: string;
  providerContacted: false;
  requestId: string;
  validationEvidence: string[];
};

export type RevenueLiveConnectorCredentialCustodyItem = {
  credentialEnvVar: string;
  evidenceRequired: string[];
  externalExecution: false;
  providerContacted: false;
  rotationPolicy: string;
  status: "pending_operator_review";
};

export type RevenueLiveConnectorRollbackRehearsal = {
  externalExecution: false;
  failureStopConditions: string[];
  providerContacted: false;
  rehearsalId: string;
  status: "pending_rehearsal";
  steps: string[];
  successCriteria: string[];
};

export type RevenueLiveConnectorFinalApprovalPacket = {
  approvalMode: "manual_only";
  decision: "pending_operator_approval";
  evidenceBundle: string[];
  externalExecution: false;
  goNoGoCriteria: string[];
  packetId: string;
  providerContacted: false;
  requiredApprovals: string[];
};

export type RevenueLiveConnectorBoundaryDossier = {
  approvalGates: string[];
  blockedExternalActions: string[];
  credentialCustodyChecklist: RevenueLiveConnectorCredentialCustodyItem[];
  dryRunRequestMap: RevenueLiveConnectorDryRunRequest[];
  externalExecution: false;
  finalApprovalPacket: RevenueLiveConnectorFinalApprovalPacket;
  futureLiveScopes: RevenueSignalConnectorScope[];
  lane: RevenueSignalConnectorLane | "launch";
  liveMode: "blocked_until_operator_design_approval";
  provider: RevenueSignalConnectorProvider | "other";
  providerContacted: false;
  providerName: string;
  readiness: RevenueLiveConnectorBoundary["readiness"];
  role: RevenueLiveConnectorBoundaryRole;
  rollbackRehearsal: RevenueLiveConnectorRollbackRehearsal | null;
};

export type RevenueLiveConnectorDesignDossierEntry = {
  action: RevenueLiveConnectorDesignDossierAction;
  approvalPackets: number;
  blockers: RevenueLiveConnectorReadinessEntry["blockers"];
  boundaryDossiers: RevenueLiveConnectorBoundaryDossier[];
  credentialCustodyItems: number;
  dryRunRequests: number;
  externalExecution: false;
  priority: number;
  providerContacted: false;
  readiness: {
    approvedReadOnlyConnectors: number;
    closureScore: number;
    expectedFirstWeekRevenue: number;
    readinessScore: number;
    registryStatus: RevenueLiveConnectorReadinessStatus;
  };
  rollbackRehearsals: number;
  status: RevenueLiveConnectorDesignDossierStatus;
  storeId: string;
  storeName: string;
  summary: string;
};

export type RevenueLiveConnectorDesignDossierPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  entries: RevenueLiveConnectorDesignDossierEntry[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Revenue Live Connector Design Dossier";
  options: {
    includeBlocked: boolean;
    includeCredentialCustody: boolean;
    includeRollbackRehearsal: boolean;
    maxDossiers: number;
    minReadinessScore: number;
    requireAllBoundariesMapped: boolean;
    requireApprovedReadOnlyEvidence: boolean;
  };
  providerContacted: false;
  queue: Array<{
    action: RevenueLiveConnectorDesignDossierAction;
    dryRunRequests: number;
    externalExecution: false;
    priority: number;
    providerContacted: false;
    status: RevenueLiveConnectorDesignDossierStatus;
    storeId: string;
    storeName: string;
    summary: string;
  }>;
  summary: string;
  totals: {
    approvalPackets: number;
    blockedDossiers: number;
    credentialCustodyItems: number;
    designReviewReady: number;
    dossiers: number;
    dryRunRequests: number;
    finalOperatorApprovalReady: number;
    needsReadinessReview: number;
    rollbackRehearsals: number;
  };
};

export type RevenueLiveConnectorDesignDossierResponse = {
  plan: RevenueLiveConnectorDesignDossierPlan;
};

export type RevenueLiveConnectorDesignDossierApplyResponse = {
  applied: {
    auditLogId: string | null;
    dryRun: boolean;
    dryRunRequests: number;
    entriesRecorded: number;
    entriesSelected: number;
    externalExecution: false;
    finalOperatorApprovalReady: number;
    providerContacted: false;
    summary: string;
  };
  plan: RevenueLiveConnectorDesignDossierPlan;
};

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
  createProductInput: PodProductPayload;
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

export type DigitalProductPortfolioResponse = {
  plan: DigitalProductPortfolioPlan;
};

export type DigitalProductApplyResponse = {
  applied: {
    auditLogId: string | null;
    createdProducts: number | Array<{
      id: string;
      productName: string;
      storeId: string;
    }>;
    dryRun: boolean;
    externalExecution: false;
    storeUpdates: Array<{
      addedProductTypes: string[];
      approvalStatus: MerchApprovalStatus | string;
      launchStatus: MerchLaunchStatus | string;
      storeId: string;
      storeName: string;
    }>;
  };
  plan: DigitalProductPortfolioPlan;
};

export type RevenuePerformanceSource = "manual" | "etsy" | "shopify" | "printify" | "printful" | "stripe" | "other";

export type RevenuePerformanceOptions = {
  maxAdSpendRatio: number;
  maxRecommendations: number;
  maxRefundRate: number;
  minKillProfitVelocity: number;
  minPauseProfitVelocity: number;
  minScaleConversionRate: number;
  minScaleProfitVelocity: number;
  minSnapshotsForKill: number;
  minWatchVisits: number;
  windowDays: number;
};

export type RevenuePerformanceSnapshotInput = {
  adSpend?: number;
  digitalDeliveryCost?: number;
  discounts?: number;
  grossRevenue?: number;
  impressions?: number;
  netProfit?: number;
  notes?: string | null;
  periodEnd: string;
  periodStart: string;
  platformFees?: number;
  productId?: string | null;
  productionCost?: number;
  refunds?: number;
  shippingCost?: number;
  source?: RevenuePerformanceSource;
  storeId: string;
  unitsSold?: number;
  visits?: number;
};

export type RevenuePerformanceScore = {
  adSpendRatio: number;
  conversionRate: number;
  costs: number;
  discounts: number;
  evidenceGrade: "none" | "thin" | "usable" | "strong";
  grossRevenue: number;
  impressions: number;
  netProfit: number;
  netRevenue: number;
  periodDays: number;
  profitMargin: number;
  profitVelocity: number;
  refunds: number;
  refundRate: number;
  revenueVelocity: number;
  snapshots: number;
  unitsSold: number;
  visits: number;
};

export type RevenuePerformanceProductScore = RevenuePerformanceScore & {
  action: RevenueAssetRotationDecision;
  confidence: number;
  productId: string;
  productName: string;
  productType: string;
  reason: string;
  recommendedInternalStatus?: PodProductStatus;
  storeId: string;
};

export type RevenuePerformanceStoreScore = RevenuePerformanceScore & {
  action: RevenueAssetRotationDecision;
  confidence: number;
  reason: string;
  recommendedLaunchStatus?: MerchLaunchStatus;
  scaleProducts: number;
  storeId: string;
  storeName: string;
};

export type RevenuePerformanceRotationChange = {
  action: "pause" | "kill";
  fromStatus: string;
  reason: string;
  targetId: string;
  targetName: string;
  targetType: "store" | "product";
  toStatus: string;
};

export type RevenuePerformanceDigest = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Performance Velocity Ledger";
  options: RevenuePerformanceOptions;
  productScores: RevenuePerformanceProductScore[];
  rotationChanges: RevenuePerformanceRotationChange[];
  snapshots: Array<RevenuePerformanceSnapshotInput & {
    id: string;
    netProfit: number;
    productId: string | null;
    source: RevenuePerformanceSource;
  }>;
  storeScores: RevenuePerformanceStoreScore[];
  summary: string;
  totals: {
    grossRevenue: number;
    netProfit: number;
    netRevenue: number;
    productsTracked: number;
    profitVelocity: number;
    revenueVelocity: number;
    rotationChanges: number;
    scaleRecommendations: number;
    snapshots: number;
    storesTracked: number;
  };
};

export type RevenuePerformanceResponse = {
  digest: RevenuePerformanceDigest;
};

export type RevenuePerformanceIngestResponse = {
  digest: RevenuePerformanceDigest;
  ingested: {
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    snapshots: number;
    storeRollups: Array<{ storeId: string }>;
  };
};

export type RevenuePerformanceRotationApplyResponse = {
  applied: {
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    productUpdates: RevenuePerformanceRotationChange[];
    storeUpdates: RevenuePerformanceRotationChange[];
  };
  digest: RevenuePerformanceDigest;
};

export type RevenueListingOptimizationOptions = {
  includePricingExperiments: boolean;
  maxPriceIncreasePercent: number;
  maxProducts: number;
  minProfitMargin: number;
  minVisitsForPerformanceExperiment: number;
  variantsPerProduct: number;
  windowDays: number;
};

export type RevenueListingExperimentAction = "write_missing_copy" | "improve_conversion" | "scale_variant" | "price_test";

export type RevenueListingVariant = {
  description: string;
  estimatedPlatformFees: number;
  estimatedProfit: number;
  hypothesis: string;
  id: string;
  label: string;
  mockupNotes: string;
  priceChangePercent: number;
  profitMargin: number;
  retailPrice: number;
  score: number;
  tags: string[];
  title: string;
};

export type RevenueListingExperiment = {
  action: RevenueListingExperimentAction;
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    reason: string;
    status: "Internal draft only";
  };
  currentListing: {
    description: string | null;
    retailPrice: number;
    tags: string[];
    title: string | null;
  };
  evidence: {
    conversionRate: number;
    evidenceGrade: "none" | "thin" | "usable" | "strong";
    profitVelocity: number;
    snapshots: number;
    unitsSold: number;
    visits: number;
  };
  externalExecution: false;
  id: string;
  priority: number;
  productId: string;
  productName: string;
  productType: string;
  reason: string;
  recommendedInternalStatus: PodProductStatus;
  recommendedVariant: RevenueListingVariant;
  storeId: string;
  storeName: string;
  variants: RevenueListingVariant[];
};

export type RevenueListingOptimizationPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  experiments: RevenueListingExperiment[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Listing Optimization Queue";
  options: RevenueListingOptimizationOptions;
  summary: string;
  totals: {
    estimatedProfitLift: number;
    experimentsQueued: number;
    missingCopyProducts: number;
    performanceBackedExperiments: number;
    priceExperiments: number;
    productsEvaluated: number;
    variantsGenerated: number;
  };
};

export type RevenueListingOptimizationResponse = {
  plan: RevenueListingOptimizationPlan;
};

export type RevenueListingOptimizationApplyResponse = {
  applied: {
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    productUpdates: Array<{
      fromStatus: string;
      productId: string;
      productName: string;
      recommendedVariantId: string;
      storeId: string;
      toStatus: PodProductStatus | string;
    }>;
  };
  plan: RevenueListingOptimizationPlan;
};

export type RevenueStoreSetupOptions = {
  includeCredentialScopes: boolean;
  maxStores: number;
  minApprovedProducts: number;
  minConnectorReadiness: number;
  minListingReadyProducts: number;
};

export type RevenueStoreSetupAction = "prepare_store_setup" | "queue_connector_readiness" | "hold";

export type RevenueStoreSetupStepCategory = "identity" | "policies" | "collections" | "products" | "fulfillment" | "analytics" | "connector" | "rollback";

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
  recommendedLaunchStatus: MerchLaunchStatus;
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

export type RevenueStoreSetupResponse = {
  plan: RevenueStoreSetupPlan;
};

export type RevenueStoreSetupApplyResponse = {
  applied: {
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    storeUpdates: Array<{
      action: RevenueStoreSetupAction;
      fromStatus: string;
      readinessScore: number;
      storeId: string;
      storeName: string;
      toStatus: MerchLaunchStatus | string;
    }>;
  };
  plan: RevenueStoreSetupPlan;
};

export type FinancialSplitCategory = "scaling" | "personal" | "buffer";
export type FinancialSplitRole = "ad_growth" | "entral_operations" | "owner_income";

export type FinancialOrchestratorOptions = {
  bufferPercent: number;
  currency: "USD";
  includePayoutIntents: boolean;
  minPayoutIntentAmount: number;
  personalPercent: number;
  reserveFloorAmount: number;
  scalingPercent: number;
  source?: RevenuePerformanceSnapshotInput["source"];
  storeId?: string;
  windowDays: number;
};

export type FinancialPolicyCheck = {
  message: string;
  status: "pass" | "warn" | "block";
  title: string;
};

export type FinancialLedgerEntryDraft = {
  allocatableProfit: number;
  allocation: Record<FinancialSplitCategory, number>;
  currency: "USD";
  externalExecution: false;
  grossRevenue: number;
  id: string;
  netProfit: number;
  periodEnd: string;
  periodStart: string;
  productId: string | null;
  productName: string | null;
  recordState: "new" | "already_recorded";
  revenuePerformanceSnapshotId: string;
  source: RevenuePerformanceSnapshotInput["source"];
  status: "allocatable" | "loss_or_zero";
  storeId: string;
  storeName: string;
};

export type FinancialAllocationBucket = {
  amount: number;
  category: FinancialSplitCategory;
  destinationType: "ad_growth_budget" | "entral_tech_operations" | "owner_distribution";
  guardrailReason?: string;
  label: string;
  payoutIntentAmount: number;
  percent: number;
  purpose: string;
  retainedAmount: number;
  role: FinancialSplitRole;
  status: "intent_ready" | "below_minimum" | "held";
};

export type FinancialPayoutIntentDraft = {
  amount: number;
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    reason: string;
    status: "Required";
  };
  category: FinancialSplitCategory;
  currency: "USD";
  dedupeKey: string;
  destinationType: FinancialAllocationBucket["destinationType"];
  externalExecution: false;
  id: string;
  provider: "Stripe Treasury + Connect";
  sourceLedgerEntryIds: string[];
  status: "approval_required";
  title: string;
};

export type FinancialScalingBudgetPacket = {
  allocationLane: "organic_growth" | "paid_scale_review";
  amount: number;
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    reason: string;
    status: "Required";
  };
  assetId: string;
  assetName: string;
  assetType: "product" | "store";
  blockedExternalActions: string[];
  budgetCap: {
    maxPerAssetAmount: number;
    retainedScalingCapital: number;
    totalScalingCapital: number;
  };
  confidence: number;
  dedupeKey: string;
  externalExecution: false;
  id: string;
  organicFirst: boolean;
  performanceBasis: {
    evidenceGrade: "none" | "thin" | "usable" | "strong";
    killPressureScore: number;
    scalePressureScore: number;
    snapshots: number;
  };
  priority: number;
  profitVelocity: number;
  providerContacted: false;
  reason: string;
  recommendedChannel: "organic_content" | "marketplace_listing" | "paid_ads";
  score: number;
  scoreBand: RevenueAssetScoreBand;
  spendPriority: "no_spend" | "low_test" | "scale_test";
  status: "approval_required";
  storeId: string;
  storeName: string;
};

export type FinancialAdGrowthAllocationPlan = {
  advisoryOnly: true;
  bucketAmount: number;
  guardrails: string[];
  killPressure: FinancialPortfolioPressure;
  mode: "organic_first" | "paid_scale_review" | "defensive_hold" | "watch";
  organicFirstAmount: number;
  paidScaleReviewAmount: number;
  pressureDecision: {
    advisoryOnly: true;
    decision: "retain_for_defense" | "organic_first" | "paid_scale_review" | "watch";
    guardrail: string;
    killPressureScore: number;
    reason: string;
    recommendedSpendPriority: FinancialScalingBudgetPacket["spendPriority"] | "none";
    scalePressureScore: number;
    source: "revenue_engine_scored_portfolio";
  };
  retainedAmount: number;
  scalePressure: FinancialPortfolioPressure;
  summary: string;
};

export type FinancialRiskFlag = {
  level: "low" | "medium" | "high";
  message: string;
  title: string;
};

export type FinancialPortfolioPressureLevel = "none" | "low" | "medium" | "high";

export type FinancialPortfolioPressureAsset = {
  assetId: string;
  assetName: string;
  assetType: "product" | "store";
  finalRank: number;
  profitVelocity: number;
  reason: string;
  recommendation: RevenueAssetRotationDecision;
  riskLevel: "low" | "medium" | "high";
  scoreBand: RevenueAssetScoreBand;
};

export type FinancialPortfolioPressure = {
  advisoryOnly: true;
  assets: FinancialPortfolioPressureAsset[];
  level: FinancialPortfolioPressureLevel;
  pressureScore: number;
  reason: string;
  source: "revenue_engine_scored_portfolio";
};

export type FinancialPortfolioSignal = {
  assetCommandsReady: number;
  killRecommendations: number;
  killPressure: FinancialPortfolioPressure;
  pauseRecommendations: number;
  profitVelocity: number;
  recommendation: "scale_reinvestment_review" | "defensive_hold" | "watch";
  reason: string;
  revenueVelocity: number;
  scalePressure: FinancialPortfolioPressure;
  scaleRecommendations: number;
  trackedAssets: number;
};

export type FinancialAdvisoryContext = {
  advisoryOnly: true;
  killPressure: FinancialPortfolioPressure;
  posture: "defensive_hold" | "scale_review" | "watch";
  scalePressure: FinancialPortfolioPressure;
  signal: FinancialPortfolioSignal["recommendation"];
  source: "revenue_engine_scored_portfolio";
  summary: string;
};

export type FinancialOrchestratorPlan = {
  advisoryContext: FinancialAdvisoryContext;
  allocationBuckets: FinancialAllocationBucket[];
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  ledgerEntries: FinancialLedgerEntryDraft[];
  mode: "Internal Financial Orchestrator";
  options: FinancialOrchestratorOptions;
  payoutIntents: FinancialPayoutIntentDraft[];
  policyChecks: FinancialPolicyCheck[];
  portfolioSignal: FinancialPortfolioSignal;
  adGrowthAllocation: FinancialAdGrowthAllocationPlan;
  riskFlags: FinancialRiskFlag[];
  scalingBudgetQueue: FinancialScalingBudgetPacket[];
  splitPolicy: {
    adGrowthPercent: number;
    bufferPercent: number;
    currency: "USD";
    entralOperationsPercent: number;
    minPayoutIntentAmount: number;
    ownerPercent: number;
    personalPercent: number;
    reserveFloorAmount: number;
    scalingPercent: number;
    status: "balanced" | "blocked";
    totalPercent: number;
  };
  summary: string;
  totals: {
    allocatableProfit: number;
    alreadyRecordedLedgerEntries: number;
    adGrowthAmount: number;
    bufferAmount: number;
    distributableProfit: number;
    entralOperationsAmount: number;
    grossRevenue: number;
    ledgerEntries: number;
    netProfit: number;
    ownerAmount: number;
    payoutIntentAmount: number;
    payoutIntents: number;
    personalAmount: number;
    portfolioAssetCommandsReady: number;
    portfolioKillPressure: number;
    portfolioProfitVelocity: number;
    portfolioScalePressure: number;
    portfolioScaleRecommendations: number;
    reserveHeld: number;
    scalingBudgetAmount: number;
    scalingBudgetPackets: number;
    scalingBudgetRetainedAmount: number;
    scalingAmount: number;
    snapshots: number;
    storesTracked: number;
  };
};

export type FinancialOrchestratorResponse = {
  plan: FinancialOrchestratorPlan;
};

export type FinancialOrchestratorApplyResponse = {
  applied: {
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    ledgerEntriesCreated: number;
    payoutIntentsCreated: number;
    policyId: string | null;
    scalingBudgetPackets: number;
  };
  plan: FinancialOrchestratorPlan;
};

export type FinancialPayoutReviewAction = "approve" | "reject";

export type FinancialPayoutReviewItem = {
  amount: number;
  approvalRequired: boolean;
  category: FinancialSplitCategory;
  createdAt: string;
  currency: "USD";
  destinationType: string;
  externalExecution: false;
  id: string;
  provider: string;
  recommendedAction: "review" | "manual_handoff" | "retain_rejection";
  riskLevel: "low" | "medium" | "high";
  status: string;
  title: string;
  updatedAt: string;
};

export type FinancialPayoutIntentSnapshot = {
  amount: number;
  approvalRequired: boolean;
  auditLogId: string | null;
  category: FinancialSplitCategory;
  createdAt: string;
  currency: "USD";
  destinationType: string;
  externalExecution: false;
  id: string;
  metadata: Record<string, unknown>;
  provider: string;
  status: string;
  updatedAt: string;
};

export type FinancialBudgetReleasePacket = {
  amount: number;
  approvalState: "approval_required" | "approved_manual_handoff" | "rejected" | "voided";
  blockedActions: string[];
  category: FinancialSplitCategory;
  controls: string[];
  currency: "USD";
  destinationType: string;
  externalExecution: false;
  id: string;
  intentId: string;
  maxReleaseAmount: number;
  purpose: string;
  releaseState: "locked_review" | "ready_for_manual_handoff" | "rejected";
  title: string;
};

export type FinancialStripeReadinessManifest = {
  connectorStatus: "not_connected";
  externalExecution: false;
  provider: "Stripe Treasury + Connect";
  requiredApprovals: string[];
  requiredScopes: Array<{
    mode: "readiness_only";
    reason: string;
    scope: string;
    status: "blocked";
  }>;
  status: "readiness_manifest_only";
};

export type FinancialPayoutReviewPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  budgetReleasePackets: FinancialBudgetReleasePacket[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Payout Review Center";
  reconciliation: {
    approvedAmount: number;
    pendingAmount: number;
    rejectedAmount: number;
    totalAmount: number;
    variance: number;
  };
  reviewQueue: FinancialPayoutReviewItem[];
  stripeReadiness: FinancialStripeReadinessManifest;
  summary: string;
  totals: {
    approved: number;
    approvedAmount: number;
    pending: number;
    pendingAmount: number;
    rejected: number;
    rejectedAmount: number;
    reviewItems: number;
    totalAmount: number;
  };
};

export type FinancialPayoutReviewResponse = {
  plan: FinancialPayoutReviewPlan;
};

export type FinancialPayoutReviewApplyResponse = {
  auditLogId: string;
  externalExecution: false;
  intent: FinancialPayoutIntentSnapshot;
  plan: FinancialPayoutReviewPlan;
  review: {
    action: FinancialPayoutReviewAction;
    fromStatus: string;
    note: string | null;
    toStatus: string;
  };
};

export type FinancialScalingBudgetReviewAction = "approve" | "reject";

export type FinancialScalingBudgetPacketSnapshot = Omit<FinancialScalingBudgetPacket, "status"> & {
  auditLogId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
  reviewedAt: string | null;
  reviewedById: string | null;
  reviewNote: string | null;
  splitPolicyId: string | null;
  status: "approval_required" | "approved_manual_handoff" | "rejected" | "voided" | string;
  updatedAt: string;
};

export type FinancialScalingBudgetReviewPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Scaling Budget Review";
  packets: FinancialScalingBudgetPacketSnapshot[];
  providerContacted: false;
  summary: string;
  totals: {
    approved: number;
    approvedAmount: number;
    pending: number;
    pendingAmount: number;
    rejected: number;
    rejectedAmount: number;
    retainedAmount: number;
    reviewItems: number;
    totalAmount: number;
  };
};

export type FinancialScalingBudgetReviewResponse = {
  plan: FinancialScalingBudgetReviewPlan;
};

export type FinancialScalingBudgetReviewApplyResponse = {
  auditLogId: string;
  externalExecution: false;
  packet: FinancialScalingBudgetPacketSnapshot;
  plan: FinancialScalingBudgetReviewPlan;
  providerContacted: false;
  review: {
    action: FinancialScalingBudgetReviewAction;
    fromStatus: string;
    note: string | null;
    toStatus: string;
  };
};

export type FinancialScalingSpendCategory =
  | "product_generation"
  | "listing_optimization"
  | "content_production"
  | "operations_buffer";

export type FinancialScalingSpendPacket = {
  amount: number;
  approvalState: "approval_required" | "approved_manual_handoff" | "rejected" | "voided";
  assetId: string;
  assetName: string;
  assetType: "product" | "store";
  blockedActions: string[];
  budgetPacketId: string;
  category: FinancialScalingSpendCategory;
  controls: string[];
  currency: "USD";
  dedupeKey: string;
  externalExecution: false;
  id: string;
  maxSpendAmount: number;
  priority: number;
  providerContacted: false;
  purpose: string;
  releaseState: "locked_review" | "ready_for_manual_handoff" | "rejected" | "stale_budget";
  score: number;
  storeId: string;
  storeName: string;
};

export type FinancialPersistedScalingSpendPacketSnapshot = FinancialScalingSpendPacket & {
  auditLogId: string | null;
  createdAt: string;
  recordId: string;
  updatedAt: string;
};

export type FinancialScalingSpendControlPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Scaling Spend Control";
  persisted: {
    packets: FinancialPersistedScalingSpendPacketSnapshot[];
    totals: {
      recordedPackets: number;
      stalePackets: number;
    };
  };
  providerContacted: false;
  reviewPlan: FinancialScalingBudgetReviewPlan;
  spendPackets: FinancialScalingSpendPacket[];
  summary: string;
  totals: {
    approvedBudgetAmount: number;
    approvedBudgetPackets: number;
    contentProductionAmount: number;
    listingOptimizationAmount: number;
    operationsBufferAmount: number;
    pendingSpendAmount: number;
    productGenerationAmount: number;
    readyForManualHandoff: number;
    rejectedSpendAmount: number;
    spendPackets: number;
  };
};

export type FinancialScalingSpendControlResponse = {
  plan: FinancialScalingSpendControlPlan;
};

export type FinancialScalingSpendControlApplyResponse = {
  applied: {
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    providerContacted: false;
    scalingSpendPacketsUpserted: number;
  };
  plan: FinancialScalingSpendControlPlan;
};

export type FinancialScalingExecutionOutcome = "validated" | "watch" | "stopped" | "scale_next";
export type FinancialScalingExecutionSource = "manual" | "signal_intake" | "operator_reconciliation" | "other";
export type FinancialScalingExecutionRecommendation = "validate" | "watch" | "stop" | "scale_next";

export type FinancialScalingExecutionEntrySnapshot = {
  amountSpent: number;
  assetId: string;
  assetName: string;
  assetType: "product" | "store";
  auditLogId: string | null;
  category: FinancialScalingSpendCategory;
  createdAt: string;
  externalExecution: false;
  grossRevenue: number;
  id: string;
  netProfit: number;
  notes: string | null;
  outcome: FinancialScalingExecutionOutcome;
  periodEnd: string;
  periodStart: string;
  productId: string | null;
  providerContacted: false;
  recommendation: FinancialScalingExecutionRecommendation;
  reason: string;
  recordId: string;
  roi: number;
  scalingSpendPacketId: string;
  source: FinancialScalingExecutionSource;
  storeId: string;
  storeName: string;
  unitsSold: number;
  updatedAt: string;
  visits: number;
};

export type FinancialScalingExecutionPacketSummary = {
  allocatedAmount: number;
  amountSpent: number;
  assetId: string;
  assetName: string;
  assetType: "product" | "store";
  category: FinancialScalingSpendCategory;
  entries: number;
  externalExecution: false;
  grossRevenue: number;
  hasOutcomeEvidence: boolean;
  maxSpendAmount: number;
  netProfit: number;
  nextInternalState: "record_manual_outcome" | "keep_validated_spend_lane" | "record_more_evidence" | "pause_spend_and_repair_asset" | "queue_next_scaling_budget_review";
  providerContacted: false;
  reason: string;
  recommendation: FinancialScalingExecutionRecommendation;
  roi: number;
  scalingSpendPacketId: string;
  storeId: string;
  storeName: string;
  unitsSold: number;
  visits: number;
};

export type FinancialScalingExecutionLedgerPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  entries: FinancialScalingExecutionEntrySnapshot[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Scaling Execution Ledger";
  packetSummaries: FinancialScalingExecutionPacketSummary[];
  providerContacted: false;
  spendControlPlan: FinancialScalingSpendControlPlan;
  summary: string;
  totals: {
    allocatedAmount: number;
    amountSpent: number;
    grossRevenue: number;
    netProfit: number;
    pendingOutcomeControls: number;
    recordedEntries: number;
    roi: number;
    scaleNext: number;
    spendControls: number;
    stopped: number;
    validated: number;
    watched: number;
  };
};

export type FinancialScalingExecutionLedgerResponse = {
  plan: FinancialScalingExecutionLedgerPlan;
};

export type FinancialScalingExecutionLedgerApplyResponse = {
  applied: {
    auditLogId: string | null;
    dryRun: boolean;
    entriesRecorded: number;
    externalExecution: false;
    providerContacted: false;
  };
  plan: FinancialScalingExecutionLedgerPlan;
};

export type FinancialPersistedReleasePacketSnapshot = FinancialBudgetReleasePacket & {
  auditLogId: string | null;
  createdAt: string;
  recordId: string;
  updatedAt: string;
};

export type FinancialPersistedReconciliationSnapshot = {
  approvedAmount: number;
  auditLogId: string | null;
  createdAt: string;
  externalExecution: false;
  id: string;
  pendingAmount: number;
  rejectedAmount: number;
  report: Record<string, unknown>;
  source: string;
  status: string;
  totalAmount: number;
  updatedAt: string;
  variance: number;
};

export type FinancialReleaseRiskTier = {
  amount: number;
  count: number;
  intentIds: string[];
  label: "low" | "medium" | "high";
  recommendedControl: string;
};

export type FinancialStripeReadOnlyProbe = {
  checks: Array<{
    evidence: string;
    status: "blocked" | "ready";
    title: string;
  }>;
  connectorStatus: "not_connected";
  externalExecution: false;
  mode: "Read-only Stripe readiness probe";
  provider: "Stripe Treasury + Connect";
  providerContacted: false;
};

export type FinancialReleaseGovernancePlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  budgetReleasePackets: FinancialBudgetReleasePacket[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Release Governance";
  persisted: {
    latestReconciliationReport: FinancialPersistedReconciliationSnapshot | null;
    reconciliationReports: FinancialPersistedReconciliationSnapshot[];
    releasePackets: FinancialPersistedReleasePacketSnapshot[];
    totals: {
      recordedReconciliationReports: number;
      recordedReleasePackets: number;
      staleReleasePackets: number;
    };
  };
  reconciliationReport: {
    approvedAmount: number;
    pendingAmount: number;
    rejectedAmount: number;
    source: "payout_review";
    status: "balanced" | "variance_review";
    totalAmount: number;
    variance: number;
  };
  releaseReadiness: {
    lockedReview: number;
    readyForManualHandoff: number;
    rejected: number;
  };
  reviewPlan: FinancialPayoutReviewPlan;
  riskTiers: FinancialReleaseRiskTier[];
  stripeReadOnlyProbe: FinancialStripeReadOnlyProbe;
  summary: string;
  totals: {
    approvedAmount: number;
    budgetReleasePackets: number;
    highRiskAmount: number;
    highRiskIntents: number;
    pendingAmount: number;
    reconciliationReportsRecorded: number;
    releasePacketsRecorded: number;
    totalAmount: number;
  };
};

export type FinancialReleaseGovernanceResponse = {
  plan: FinancialReleaseGovernancePlan;
};

export type FinancialReleaseGovernanceApplyResponse = {
  applied: {
    auditLogId: string | null;
    budgetReleasePacketsUpserted: number;
    dryRun: boolean;
    externalExecution: false;
    reconciliationReportId: string | null;
    reconciliationStatus: string;
    stripeProviderContacted: false;
  };
  plan: FinancialReleaseGovernancePlan;
};

export type FacelessContentChannel = "youtube_shorts" | "tiktok" | "instagram_reels";

export type FacelessContentOptions = {
  briefsPerStore: number;
  includeChannelPackages: boolean;
  includeVideoSpecs: boolean;
  includeVoiceoverSpecs: boolean;
  maxStores: number;
  minClicksForScale: number;
  minViewsForRemix: number;
  targetChannels: FacelessContentChannel[];
  windowDays: number;
};

export type FacelessProviderReadiness = {
  blockedReason: string;
  provider: "Runway" | "Kling" | "Luma" | "ElevenLabs" | "YouTube Shorts" | "TikTok" | "Instagram Reels";
  providerContacted: false;
  requiredApproval: string;
  status: "not_connected" | "approval_required";
};

export type FacelessChannelPackage = {
  aspectRatio: "9:16";
  caption: string;
  channel: FacelessContentChannel;
  description: string;
  durationSeconds: number;
  externalExecution: false;
  hashtags: string[];
  providerContacted: false;
  title: string;
  uploadState: "approval_required";
};

export type FacelessContentBrief = {
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    status: "Required";
  };
  blockedActions: string[];
  channelPackages: FacelessChannelPackage[];
  concept: {
    angle: string;
    hook: string;
    objective: "product_discovery" | "store_launch" | "conversion_repair" | "scale_remix";
    targetAudience: string;
  };
  dedupeKey: string;
  estimatedRevenueImpact: number;
  externalExecution: false;
  id: string;
  priority: number;
  productId: string | null;
  productName: string | null;
  providerReadiness: FacelessProviderReadiness[];
  recordState: "new" | "existing";
  script: {
    caption: string;
    hookLine: string;
    narration: string[];
    onScreenText: string[];
  };
  status: "draft_queued" | "existing_record";
  storeId: string;
  storeName: string;
  storyboard: Array<{
    beat: string;
    durationSeconds: number;
    visualDirection: string;
  }>;
  targetChannels: FacelessContentChannel[];
  title: string;
  videoSpec: {
    assetRequirements: string[];
    motionDirection: string;
    primaryProviders: Array<"Runway" | "Kling" | "Luma">;
    prompt: string;
    providerContacted: false;
    status: "draft_only" | "omitted";
  };
  voiceoverSpec: {
    delivery: string;
    provider: "ElevenLabs";
    providerContacted: false;
    scriptWordCount: number;
    status: "draft_only" | "omitted";
    voiceDirection: string;
  };
};

export type FacelessContentScore = {
  action: "scale_remix" | "revise_hook" | "watch";
  channel: string;
  clickRate: number;
  contentBriefId: string | null;
  conversionRate: number;
  netRevenue: number;
  reason: string;
  retentionSeconds: number;
  views: number;
};

export type FacelessContentPerformanceDigest = {
  contentScores: FacelessContentScore[];
  summary: string;
  totals: {
    clicks: number;
    conversions: number;
    cost: number;
    netRevenue: number;
    snapshots: number;
    views: number;
    watchSeconds: number;
  };
};

export type FacelessContentPipelinePlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  briefs: FacelessContentBrief[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Faceless Content Pipeline";
  options: FacelessContentOptions;
  performanceDigest: FacelessContentPerformanceDigest;
  providerReadiness: FacelessProviderReadiness[];
  summary: string;
  totals: {
    channelPackages: number;
    existingBriefs: number;
    newBriefs: number;
    providerManifests: number;
    storesEvaluated: number;
    videoSpecs: number;
    voiceoverSpecs: number;
  };
};

export type FacelessContentPipelineResponse = {
  plan: FacelessContentPipelinePlan;
};

export type FacelessContentPipelineApplyResponse = {
  applied: {
    auditLogId: string | null;
    briefsCreated: number;
    dryRun: boolean;
    externalExecution: false;
    providerContacted: false;
  };
  plan: FacelessContentPipelinePlan;
};

export type FacelessContentPerformanceResponse = {
  digest: FacelessContentPerformanceDigest;
};

export type PortfolioCommandAction = RevenueEngineAction | "queue_content" | "record_governance" | "review_payout" | "review_scale_budget" | "review_scale_outcome";
export type PortfolioCommandRiskLevel = "low" | "medium" | "high";
export type PortfolioCommandTargetType = "store" | "product" | "content" | "finance" | "portfolio";
export type PortfolioCommandRecordStatus = "queued" | "applied" | "skipped" | "blocked";
export type PortfolioRiskLaneName = "revenue" | "finance" | "content" | "operations";

export type PortfolioCommandCenterOptions = {
  includeCommandHistory: number;
  includeContent: boolean;
  includeFinance: boolean;
  maxActions: number;
  windowDays: number;
};

export type PortfolioCommandRecordSnapshot = {
  action: PortfolioCommandAction | string;
  auditLogId: string | null;
  commandHash: string;
  control: Record<string, unknown>;
  createdAt: string;
  externalExecution: false;
  id: string;
  priority: number;
  providerContacted: false;
  reason: string;
  recommendedStatus: string | null;
  riskLevel: PortfolioCommandRiskLevel | string;
  sourceModule: string;
  status: PortfolioCommandRecordStatus | string;
  targetId: string;
  targetName: string;
  targetType: PortfolioCommandTargetType | string;
  updatedAt: string;
};

export type PortfolioCommandItem = {
  action: PortfolioCommandAction;
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    status: "Required";
  };
  blockedExternalActions: string[];
  commandHash: string;
  expectedInternalEffect: string;
  externalExecution: false;
  priority: number;
  providerContacted: false;
  reason: string;
  recommendedStatus: string | null;
  riskLevel: PortfolioCommandRiskLevel;
  sourceModule: string;
  targetId: string;
  targetName: string;
  targetType: PortfolioCommandTargetType;
};

export type PortfolioRiskLane = {
  lane: PortfolioRiskLaneName;
  riskLevel: PortfolioCommandRiskLevel;
  score: number;
  signals: string[];
  summary: string;
};

export type PortfolioCommandCenterPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  commandActions: PortfolioCommandItem[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Portfolio Command Center";
  options: PortfolioCommandCenterOptions;
  persistedCommands: PortfolioCommandRecordSnapshot[];
  providerContacted: false;
  riskLanes: PortfolioRiskLane[];
  summary: string;
  totals: {
    approvedPayoutAmount: number;
    assetPortfolioActions: number;
    assetPortfolioKill: number;
    assetPortfolioPause: number;
    assetPortfolioProfitVelocity: number;
    assetPortfolioScale: number;
    assetPortfolioTrackedAssets: number;
    commandActions: number;
    commandsByAction: Record<PortfolioCommandAction, number>;
    commandsByRisk: Record<PortfolioCommandRiskLevel, number>;
    contentNetRevenue: number;
    contentViews: number;
    estimatedProfit: number;
    highRiskCommands: number;
    highRiskProducts: number;
    openCommandRecords: number;
    pendingPayoutAmount: number;
    approvedScalingBudgetAmount: number;
    scaleOutcomeEntries: number;
    scaleOutcomeScaleNext: number;
    scaleOutcomeStop: number;
    pendingScalingBudgetAmount: number;
    pendingScalingBudgetPackets: number;
    scalingBudgetPackets: number;
    products: number;
    profitVelocity: number;
    revenueRotationChanges: number;
    stores: number;
    totalRevenue: number;
  };
};

export type PortfolioCommandCenterResponse = {
  plan: PortfolioCommandCenterPlan;
};

export type PortfolioCommandCenterApplyResponse = {
  applied: {
    auditLogId: string | null;
    assetControlActionsSkipped: number;
    assetControlAuditLogId: string | null;
    assetControlBatchReview: RevenueAssetBatchControlReview | null;
    assetControlRecordsCreated: number;
    commandRecordsCreated: number;
    contentCommands: number;
    dryRun: boolean;
    externalExecution: false;
    financeCommands: number;
    productUpdates: Array<{
      action: PortfolioCommandAction;
      fromStatus: string | null;
      productId: string;
      productName: string;
      toStatus: string;
    }>;
    providerContacted: false;
    storeUpdates: Array<{
      action: PortfolioCommandAction;
      fromStatus: string | null;
      storeId: string;
      storeName: string;
      toStatus: string;
    }>;
  };
  plan: PortfolioCommandCenterPlan;
};

export type RevenueAutopilotMode = "balanced" | "conservative" | "velocity";
export type RevenueAutopilotPhaseName =
  | "signal_intake"
  | "first_business_launch"
  | "first_cash_sprint"
  | "product_factory"
  | "digital_factory"
  | "listing_factory"
  | "store_setup"
  | "content_factory"
  | "finance_governance"
  | "portfolio_command";
export type RevenueAutopilotActionKind =
  | "stage_signal_intake"
  | "run_first_business_launch"
  | "run_first_cash_sprint"
  | "seed_launch_products"
  | "queue_launch_approval"
  | "prepare_launch_package"
  | "queue_digital_products"
  | "apply_listing_optimization"
  | "prepare_store_setup"
  | "queue_content_briefs"
  | "record_finance_split"
  | "record_release_governance"
  | "record_portfolio_commands"
  | "watch";
export type RevenueAutopilotRiskLevel = "low" | "medium" | "high";
export type RevenueAutopilotTargetType = "content" | "finance" | "portfolio" | "product" | "signal" | "store";
export type RevenueAutopilotActionStatus = "ready" | "watch" | "blocked";
export type RevenueAutopilotExecutionStepStatus = "ready" | "skipped" | "blocked";
export type RevenueAutopilotStepExecutionStatus = "executed" | "preview" | "skipped" | "blocked";
export type RevenueAutopilotOwnerApprovalType =
  | "external_launch"
  | "provider_upload"
  | "content_publish"
  | "ad_spend"
  | "finance_release"
  | "browser_or_marketplace"
  | "manual_review";
export type RevenueAutopilotCommandRank = "ENTRAL" | "Marshal" | "General" | "Commander" | "Soldier" | "Owner";
export type RevenueAutopilotSelectionSource =
  | "default_executor"
  | "draft_creation_opt_in"
  | "explicit_action"
  | "launch_approval_opt_in"
  | "not_selected";

export type RevenueAutopilotOptions = {
  includeContent: boolean;
  includeFinance: boolean;
  includeSignalIntake: boolean;
  maxActions: number;
  mode: RevenueAutopilotMode;
  windowDays: number;
};

export type RevenueAutopilotAction = {
  action: RevenueAutopilotActionKind;
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    reason: string;
    status: "Required";
  };
  blockedExternalActions: string[];
  commandHash: string;
  expectedInternalEffect: string;
  externalExecution: false;
  phase: RevenueAutopilotPhaseName;
  priority: number;
  providerContacted: false;
  reason: string;
  recommendedStatus: string | null;
  riskLevel: RevenueAutopilotRiskLevel;
  sourceModule: string;
  status: RevenueAutopilotActionStatus;
  summary: string;
  targetId: string;
  targetName: string;
  targetType: RevenueAutopilotTargetType;
  title: string;
};

export type RevenueAutopilotPhase = {
  actionCount: number;
  metrics: Array<{
    label: string;
    value: number | string;
  }>;
  name: RevenueAutopilotPhaseName;
  priority: number;
  status: RevenueAutopilotActionStatus;
  summary: string;
  title: string;
};

export type RevenueAutopilotPlan = {
  actions: RevenueAutopilotAction[];
  auditEvents: string[];
  automationProfile: {
    automatedWorkPercent: number;
    externalExecution: false;
    internalAutopilotWorkItems: number;
    ownerApprovalPercent: number;
    ownerApprovalWorkItems: number;
    providerContacted: false;
    summary: string;
    targetAutomationPercent: 90;
  };
  blockedExternalActions: string[];
  chainOfCommand: Array<{
    actionCount: number;
    actions: string[];
    blockedActions: number;
    commander: string;
    externalExecution: false;
    general: string;
    marshal: string;
    phase: RevenueAutopilotPhaseName;
    providerContacted: false;
    readyActions: number;
    soldier: string;
    status: RevenueAutopilotActionStatus;
    summary: string;
  }>;
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Revenue Autopilot";
  options: RevenueAutopilotOptions;
  ownerApprovalQueue: Array<{
    actionIds: string[];
    approvalType: RevenueAutopilotOwnerApprovalType;
    externalExecution: false;
    id: string;
    phase: RevenueAutopilotPhaseName;
    providerContacted: false;
    rank: Extract<RevenueAutopilotCommandRank, "Owner">;
    reason: string;
    riskLevel: RevenueAutopilotRiskLevel;
    status: "waiting_owner" | "not_ready";
    title: string;
  }>;
  phases: RevenueAutopilotPhase[];
  providerContacted: false;
  summary: string;
  totals: {
    actions: number;
    blockedActions: number;
    commerceSignalsReady: number;
    contentBriefsQueued: number;
    contentSignalsReady: number;
    digitalDraftsQueued: number;
    estimatedDraftProfit: number;
    financeLedgerEntries: number;
    financePayoutIntents: number;
    firstBusinessLaunchCandidates: number;
    firstBusinessLaunchManualGates: number;
    firstBusinessLaunchReady: number;
    firstCashSprintManualGates: number;
    firstCashSprintReady: number;
    listingExperimentsQueued: number;
    paymentSignalsReady: number;
    performanceSnapshots: number;
    portfolioCommands: number;
    products: number;
    profitVelocity: number;
    readyActions: number;
    revenueVelocity: number;
    releasePackets: number;
    rotationChanges: number;
    storeRunbooksQueued: number;
    stores: number;
    trackedAssets: number;
    watchActions: number;
  };
};

export type RevenueAutopilotResponse = {
  plan: RevenueAutopilotPlan;
};

export type RevenueAutopilotApplyResponse = {
  applied: {
    auditLogId: string | null;
    commandRecordsCreated: number;
    contentCommands: number;
    dryRun: boolean;
    externalExecution: false;
    financeCommands: number;
    portfolioCommands: number;
    providerContacted: false;
    readyActions: number;
    signalCommands: number;
  };
  plan: RevenueAutopilotPlan;
};

export type RevenueAutopilotExecutionStep = {
  action: RevenueAutopilotActionKind;
  blockedExternalActions: string[];
  commandHash: string;
  executionStatus?: RevenueAutopilotStepExecutionStatus;
  expectedInternalEffect: string;
  externalExecution: false;
  phase: RevenueAutopilotPhaseName;
  providerContacted: false;
  reason: string;
  requiredOptIn: "draft_creation" | "launch_approval_packets" | null;
  result?: Record<string, unknown>;
  riskLevel: RevenueAutopilotRiskLevel;
  selectionReason: string;
  selectionSource: RevenueAutopilotSelectionSource;
  sourceModule: string;
  status: RevenueAutopilotExecutionStepStatus;
  targetId: string;
  targetName: string;
  targetType: RevenueAutopilotTargetType;
  title: string;
};

export type RevenueAutopilotExecuteResponse = {
  executed: {
    auditLogId: string | null;
    assetBatchActions: number;
    assetBatchSkipped: number;
    assetControlBatchReviews: RevenueAssetBatchControlReview[];
    assetControlActionsSkipped: number;
    assetControlRecordsCreated: number;
    briefsCreated: number;
    budgetReleasePacketsUpserted: number;
    commandRecordsCreated: number;
    contentCommands: number;
    dryRun: boolean;
    externalExecution: false;
    financeCommands: number;
    firstBusinessLaunchActions: number;
    firstBusinessLaunchActionsBlocked: number;
    firstBusinessLaunchActionsDispatched: number;
    firstBusinessLaunchActionsPreviewed: number;
    firstBusinessLaunchActionsSkipped: number;
    firstBusinessLaunchManualGates: number;
    firstBusinessLaunchReady: number;
    firstCashSprintActions: number;
    firstCashSprintActionsBlocked: number;
    firstCashSprintActionsDispatched: number;
    firstCashSprintActionsPreviewed: number;
    firstCashSprintActionsSkipped: number;
    firstCashSprintBridgeActions: number;
    firstCashSprintManualGates: number;
    firstCashSprintReady: number;
    ledgerEntriesCreated: number;
    payoutIntentsCreated: number;
    portfolioCommands: number;
    providerContacted: false;
    scalingBudgetPackets: number;
    signalCommands: number;
    stepsBlocked: number;
    stepsExecuted: number;
    stepsPreviewed: number;
    stepsReady: number;
    stepsSkipped: number;
  } & Record<string, unknown>;
  plan: RevenueAutopilotPlan;
  selection: {
    blockedExternalActions: string[];
    externalExecution: false;
    providerContacted: false;
    steps: RevenueAutopilotExecutionStep[];
    totals: {
      blocked: number;
      ready: number;
      skipped: number;
      steps: number;
    };
  };
  steps: RevenueAutopilotExecutionStep[];
};

export type RevenueOpportunityFactoryPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  idempotency: {
    sourceKey: string;
    storeAlreadyExists: boolean;
    storeLookup: string;
  };
  mode: "Internal Revenue Opportunity Factory";
  nextInternalActions: Array<{
    action: "create_store" | "seed_product_drafts" | "run_listing_optimization" | "prepare_store_setup" | "run_revenue_autopilot";
    externalExecution: false;
    status: "ready" | "already_done" | "queued_after_apply";
    title: string;
  }>;
  productDrafts: Array<Pick<PodProduct, "estimatedProfit" | "productName" | "productType" | "retailPrice" | "status">>;
  providerContacted: false;
  skippedExistingProducts: Array<{
    productName: string;
    reason: string;
  }>;
  storeDraft: {
    approvalStatus: MerchApprovalStatus;
    audience: string;
    brandStyle: string;
    businessName: string;
    clientName: string;
    contactName: string;
    email: string;
    estimatedProfit: number;
    industry: string;
    launchStatus: MerchLaunchStatus;
    notes: string;
    podProvider: MerchPodProvider;
    productTypes: string[];
    profitShare: number;
    storePlatform: MerchStorePlatform;
  };
  summary: string;
  totals: {
    estimatedDraftProfit: number;
    existingProductDrafts: number;
    productDrafts: number;
    skippedProductDrafts: number;
    storeShells: number;
  };
};

export type RevenueOpportunityFactoryResponse = {
  applied: {
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    productDraftsCreated: number;
    providerContacted: false;
    skippedExistingProducts: number;
    storeCreated: boolean;
    storeId: string | null;
    opportunityId: string | null;
  };
  createdProducts?: Array<{
    id: string;
    productName: string;
    storeId: string;
  }>;
  plan: RevenueOpportunityFactoryPlan;
  store: ClientMerchStore | {
    businessName: string;
    id: string;
    launchStatus: MerchLaunchStatus;
    podProvider: MerchPodProvider;
    storePlatform: MerchStorePlatform;
  } | null;
};

export type RevenueOpportunityControlStatus = "active" | "watch" | "paused" | "blocked" | "killed" | "ready_for_handoff";

export type RevenueOpportunityControlStage =
  | "idea_captured"
  | "store_shell_created"
  | "drafts_seeded"
  | "listing_optimization"
  | "launch_preparation"
  | "provider_handoff_ready"
  | "live_monitoring"
  | "blocked_review"
  | "paused_or_killed";

export type RevenueOpportunityControlItem = {
  auditLogId: string | null;
  blockers: Array<{
    code: string;
    severity: "low" | "medium" | "high";
    title: string;
  }>;
  businessName: string;
  controlActions: Array<{
    enabled: boolean;
    reason: string;
    status: RevenueOpportunityControlStatus;
    title: string;
  }>;
  createdAt: string;
  externalExecution: false;
  id: string;
  idea: string;
  metrics: {
    approvedProducts: number;
    estimatedDraftProfit: number;
    listingReadyProducts: number;
    netProfit: number;
    performanceSnapshots: number;
    productDrafts: number;
    publishedProducts: number;
    revenue: number;
    revisionProducts: number;
  };
  nextInternalActions: Array<{
    action: string;
    externalExecution: false;
    priority: number;
    status: "ready" | "blocked" | "watch";
    title: string;
  }>;
  providerContacted: false;
  readinessScore: number;
  recommendedStatus: RevenueOpportunityControlStatus;
  riskLevel: "low" | "medium" | "high";
  sourceKey: string;
  stage: RevenueOpportunityControlStage;
  status: RevenueOpportunityControlStatus;
  store: {
    approvalStatus: MerchApprovalStatus | string;
    businessName: string;
    id: string;
    launchStatus: MerchLaunchStatus | string;
    storePlatform: MerchStorePlatform | string;
  } | null;
  summary: string;
  updatedAt: string;
};

export type RevenueOpportunityControlPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Revenue Opportunity Control Center";
  opportunities: RevenueOpportunityControlItem[];
  options: {
    includeKilled: boolean;
    maxOpportunities: number;
    minApprovedProducts: number;
    minListingReadyProducts: number;
    minProductDrafts: number;
    minReadinessForHandoff: number;
    windowDays: number;
  };
  providerContacted: false;
  stageCounts: Record<RevenueOpportunityControlStage, number>;
  statusCounts: Record<RevenueOpportunityControlStatus, number>;
  summary: string;
  totals: {
    activeOpportunities: number;
    blockedOpportunities: number;
    estimatedDraftProfit: number;
    netProfit: number;
    opportunities: number;
    productDrafts: number;
    readyForHandoff: number;
    revenue: number;
  };
};

export type RevenueOpportunityControlResponse = {
  plan: RevenueOpportunityControlPlan;
};

export type RevenueOpportunityControlApplyResponse = {
  applied: {
    allowed: boolean;
    auditLogId: string | null;
    blockers: string[];
    dryRun: boolean;
    externalExecution: false;
    fromStatus: RevenueOpportunityControlStatus;
    note: string | null;
    opportunityId: string;
    providerContacted: false;
    reason: string;
    toStatus: RevenueOpportunityControlStatus;
  };
  evaluation: {
    allowed: boolean;
    blockers: string[];
    externalExecution: false;
    fromStatus: RevenueOpportunityControlStatus;
    providerContacted: false;
    reason: string;
    toStatus: RevenueOpportunityControlStatus;
  };
  plan: RevenueOpportunityControlPlan;
};

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
  source?: "manual" | "youtube" | "tiktok" | "instagram" | "other";
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

export type SignalIntakeInput = {
  commerceSignals?: SignalIntakeCommerceSignal[];
  contentSignals?: SignalIntakeContentSignal[];
  paymentSignals?: SignalIntakePaymentSignal[];
};

export type RevenueSignalConnectorLane = "commerce" | "content" | "payments";
export type RevenueSignalConnectorProvider = "etsy" | "instagram" | "manual" | "printful" | "printify" | "shopify" | "stripe" | "tiktok" | "youtube";
export type RevenueSignalConnectorStatus = "ready_for_approval" | "missing_inputs" | "disabled";
export type RevenueSignalConnectorScope = {
  reason: string;
  scope: string;
};

export type RevenueSignalConnectorManifest = {
  approvalGate: {
    humanApprovalRequired: true;
    requiredConfirmation: "RECORD READONLY SIGNAL CONNECTOR MANIFESTS";
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
  riskLevel: "low" | "medium" | "high";
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

export type SignalIntakePlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  lanes: Array<{
    count: number;
    externalExecution: false;
    lane: "commerce" | "content" | "payments";
    providerContacted: false;
    riskLevel: "low" | "medium" | "high";
    summary: string;
  }>;
  mode: "Internal Signal Intake Center";
  normalized: {
    commerceSnapshots: Array<RevenuePerformanceSnapshotInput & {
      id: string;
      netProfit: number;
      notes: string | null;
      productId: string | null;
      source: "manual" | "etsy" | "shopify" | "printify" | "printful" | "stripe" | "other";
    }>;
    contentSnapshots: Array<{
      channel: string;
      clicks: number;
      conversions: number;
      cost: number;
      externalExecution: false;
      id: string;
      periodEnd: string;
      periodStart: string;
      revenue: number;
      source: string;
      storeId: string | null;
      views: number;
      watchSeconds: number;
    }>;
    paymentReconciliationDrafts: Array<{
      availableBalance: number;
      currency: "USD";
      externalExecution: false;
      id: string;
      netBalanceDelta: number;
      paidOut: number;
      pendingBalance: number;
      provider: "stripe" | "manual" | "other";
      providerContacted: false;
      status: "record_only";
    }>;
  };
  options: {
    includeSamplePayloads: boolean;
    maxSignals: number;
    windowDays: number;
  };
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

export type RevenueSignalConnectorPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  manifests: RevenueSignalConnectorManifest[];
  mode: "Internal Read-Only Signal Connector Center";
  options: {
    includeCommerce: boolean;
    includeContent: boolean;
    includePayments: boolean;
    includeSamplePayloads: boolean;
    maxConnectors: number;
    onlyReady: boolean;
    windowDays: number;
  };
  providerContacted: false;
  sampleSignalBatch: SignalIntakeInput | null;
  signalIntakePreview: SignalIntakePlan;
  statusCounts: Record<RevenueSignalConnectorStatus, number>;
  summary: string;
  totals: {
    commerceConnectors: number;
    connectors: number;
    contentConnectors: number;
    disabledConnectors: number;
    missingInputConnectors: number;
    paymentConnectors: number;
    readyConnectors: number;
    sampleCommerceSignals: number;
    sampleContentSignals: number;
    samplePaymentSignals: number;
  };
};

export type RevenueSignalConnectorResponse = {
  plan: RevenueSignalConnectorPlan;
};

export type RevenueSignalConnectorApplyResponse = {
  applied: {
    auditLogId: string | null;
    blockedManifestIds: string[];
    dryRun: boolean;
    externalExecution: false;
    manifestIds: string[];
    manifestsRecorded: number;
    providerContacted: false;
    readyManifests: number;
    sampleSignals: number;
    summary: string;
  };
  plan: RevenueSignalConnectorPlan;
};

export type RevenueSignalConnectorApprovalStatus = "pending_review" | "approved" | "rejected" | "import_queued" | "archived";
export type RevenueSignalImportJobStatus = "queued_review" | "ready_for_signal_intake" | "blocked_review" | "completed" | "archived";

export type RevenueSignalConnectorApprovalRecord = {
  blockedActions: string[];
  contentBriefId: string | null;
  createdAt: string;
  credentialEnvVars: string[];
  dedupeKey: string;
  endpointTemplates: string[];
  externalExecution: false;
  id: string;
  lane: RevenueSignalConnectorLane;
  manifest: RevenueSignalConnectorManifest;
  manifestId: string;
  productId: string | null;
  provider: RevenueSignalConnectorProvider;
  providerContacted: false;
  providerName: string;
  readOnlyScopes: RevenueSignalConnectorManifest["readOnlyScopes"];
  readinessScore: number;
  requestAuditLogId: string | null;
  reviewAuditLogId: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  reviewNote: string | null;
  riskLevel: RevenueSignalConnectorManifest["riskLevel"];
  samplePayload: SignalIntakeInput | null;
  signalPreview: SignalIntakePlan;
  status: RevenueSignalConnectorApprovalStatus | string;
  storeId: string | null;
  storeName: string | null;
  transformTarget: RevenueSignalConnectorManifest["transformTarget"];
  updatedAt: string;
};

export type RevenueSignalImportJob = {
  approvalId: string;
  auditLogId: string | null;
  completedAt: string | null;
  createdAt: string;
  externalExecution: false;
  handoffAuditLogId: string | null;
  id: string;
  intakeResult: Record<string, unknown> | null;
  lane: RevenueSignalConnectorLane;
  manifestId: string;
  provider: RevenueSignalConnectorProvider;
  providerContacted: false;
  samplePayload: SignalIntakeInput | null;
  signalPreview: SignalIntakePlan;
  status: RevenueSignalImportJobStatus | string;
  transformTarget: RevenueSignalConnectorManifest["transformTarget"];
  updatedAt: string;
};

export type RevenueSignalConnectorApprovalPlan = {
  approvalQueue: Array<{
    action: "queue_approval";
    externalExecution: false;
    manifestId: string;
    priority: number;
    provider: RevenueSignalConnectorProvider;
    providerContacted: false;
    riskLevel: RevenueSignalConnectorManifest["riskLevel"];
    sampleSignals: number;
    summary: string;
    targetName: string;
  }>;
  approvals: RevenueSignalConnectorApprovalRecord[];
  auditEvents: string[];
  blockedExternalActions: string[];
  connectorPlan: RevenueSignalConnectorPlan;
  externalExecution: false;
  generatedAt: string;
  importJobs: RevenueSignalImportJob[];
  importQueue: Array<{
    action: "queue_readonly_import_job";
    approvalId: string;
    externalExecution: false;
    manifestId: string;
    priority: number;
    provider: RevenueSignalConnectorProvider;
    providerContacted: false;
    sampleSignals: number;
    summary: string;
  }>;
  mode: "Internal Read-Only Signal Connector Approval Center";
  providerContacted: false;
  statusCounts: {
    approvals: Record<RevenueSignalConnectorApprovalStatus, number>;
    importJobs: Record<RevenueSignalImportJobStatus, number>;
  };
  summary: string;
  totals: {
    approvedApprovals: number;
    approvalQueue: number;
    importJobs: number;
    importQueue: number;
    manifests: number;
    pendingApprovals: number;
    readyManifests: number;
    rejectedApprovals: number;
    sampleSignalsQueued: number;
  };
};

export type RevenueSignalConnectorApprovalResponse = {
  plan: RevenueSignalConnectorApprovalPlan;
};

export type RevenueSignalConnectorApprovalApplyResponse = {
  applied: {
    auditLogId: string | null;
    blockedManifestIds: string[];
    dryRun: boolean;
    externalExecution: false;
    manifestIds: string[];
    providerContacted: false;
    queuedApprovalIds: string[];
    queuedApprovals: number;
    readyManifests: number;
    skippedExistingManifestIds: string[];
    summary: string;
  };
  plan: RevenueSignalConnectorApprovalPlan;
};

export type RevenueSignalConnectorApprovalReviewResponse = {
  applied: {
    approvalId: string;
    auditLogId: string;
    dryRun: false;
    externalExecution: false;
    fromStatus: string;
    manifestId: string;
    providerContacted: false;
    reviewAction: "approve" | "reject";
    toStatus: string;
  };
  plan: RevenueSignalConnectorApprovalPlan;
};

export type RevenueSignalImportJobApplyResponse = {
  applied: {
    approvalIds: string[];
    auditLogId: string | null;
    dryRun: boolean;
    externalExecution: false;
    importJobIds: string[];
    importJobsQueued: number;
    providerContacted: false;
    sampleSignalsQueued: number;
    summary: string;
  };
  plan: RevenueSignalConnectorApprovalPlan;
};

export type RevenueSignalImportHandoffPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  blockedHandoffs: Array<{
    approvalId: string;
    blocker: string;
    externalExecution: false;
    importJobId: string;
    providerContacted: false;
    sampleSignals: number;
    status: RevenueSignalImportJobStatus | string;
  }>;
  externalExecution: false;
  generatedAt: string;
  importJobs: RevenueSignalImportJob[];
  mode: "Internal Read-Only Signal Import Handoff";
  options: {
    includeArchived: boolean;
    maxJobs: number;
    maxSignals: number;
    windowDays: number;
  };
  providerContacted: false;
  readyHandoffs: Array<{
    action: "ingest_queued_readonly_signals";
    approvalId: string;
    externalExecution: false;
    importJobId: string;
    lane: RevenueSignalConnectorLane;
    manifestId: string;
    priority: number;
    provider: RevenueSignalConnectorProvider;
    providerContacted: false;
    sampleSignals: number;
    summary: string;
  }>;
  signalIntakePreview: SignalIntakePlan;
  stagedPayload: SignalIntakeInput;
  summary: string;
  totals: {
    blockedJobs: number;
    completedJobs: number;
    contentSignals: number;
    handoffSignals: number;
    importJobs: number;
    paymentSignals: number;
    readyJobs: number;
    revenueSignals: number;
  };
};

export type RevenueSignalImportHandoffResponse = {
  plan: RevenueSignalImportHandoffPlan;
};

export type RevenueSignalImportHandoffApplyResponse = {
  handoff: {
    auditLogId: string | null;
    contentSnapshotsCreated: number;
    dryRun: boolean;
    externalExecution: false;
    importJobIds: string[];
    jobsCompleted: number;
    paymentReconciliationReportId: string | null;
    paymentSignalsRecorded: number;
    providerContacted: false;
    revenueSnapshotsCreated: number;
    sampleSignalsIngested: number;
    signalIntakeAuditLogId: string | null;
    summary: string;
  };
  plan: RevenueSignalImportHandoffPlan;
  signalIntakePlan: SignalIntakePlan;
};

export type SignalIntakeResponse = {
  plan: SignalIntakePlan;
};

export type SignalIntakeApplyResponse = {
  ingested: {
    auditLogId: string | null;
    contentSnapshotsCreated: number;
    dryRun: boolean;
    externalExecution: false;
    paymentReconciliationReportId: string | null;
    paymentSignalsRecorded: number;
    providerContacted: false;
    revenueSnapshotsCreated: number;
  };
  plan: SignalIntakePlan;
};

export function formatMerchCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(value);
}
