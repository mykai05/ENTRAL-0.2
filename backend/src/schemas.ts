import { z } from "zod";

export const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: z.string().min(8).max(128)
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128)
});

const authTokenSchema = z.string().trim().min(32).max(256);

export const requestPasswordResetSchema = z.object({
  email: emailSchema
});

export const confirmPasswordResetSchema = z.object({
  token: authTokenSchema,
  password: z.string().min(8).max(128)
});

export const requestEmailVerificationSchema = z.object({
  email: emailSchema
});

export const confirmEmailVerificationSchema = z.object({
  token: authTokenSchema
});

export const accountDeletionConfirmation = "DELETE MY ACCOUNT";

export const deleteAccountSchema = z.object({
  confirmation: z.literal(accountDeletionConfirmation),
  password: z.string().min(1).max(128)
});

const optionalTrimmedString = (maxLength: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(maxLength).optional()
);

const moneyAmountSchema = z.coerce.number().finite().min(0).max(999_999_999);
const percentAmountSchema = z.coerce.number().finite().min(0).max(100);

export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE", "ARCHIVED"]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(2000).optional(),
  status: taskStatusSchema.default("TODO"),
  dueDate: z.string().datetime().optional(),
  teamId: z.string().cuid().optional(),
  assignedToId: z.string().cuid().optional()
});

export const taskListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  status: taskStatusSchema.optional()
});

export const merchStorePlatformSchema = z.enum(["Etsy", "Shopify", "Other"]);
export const merchPodProviderSchema = z.enum(["Printify", "Printful", "Other"]);
export const merchApprovalStatusSchema = z.enum([
  "Not Started",
  "Research Approved",
  "Designs Pending",
  "Designs Approved",
  "Listings Approved",
  "Launch Approved"
]);
export const merchLaunchStatusSchema = z.enum([
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
]);
export const podProductStatusSchema = z.enum([
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
]);
export const productBatchSizeSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
  z.literal(25)
]);
export const productBatchRiskToleranceSchema = z.enum(["Low", "Medium", "High"]);
export const pricingPlatformPresetSchema = z.enum(["Etsy", "Shopify", "Manual"]);
export const automationLevelSchema = z.enum(["manual", "assisted", "semi_automated", "automated"]);
export const revenueEngineConfirmation = "APPLY INTERNAL ROTATION";
export const revenueAssetActionConfirmation = "APPLY INTERNAL ASSET ACTION";
export const revenueAssetBatchActionConfirmation = "APPLY INTERNAL ASSET BATCH";
export const revenueLaunchPipelineConfirmation = "CREATE INTERNAL LAUNCH QUEUE";
export const revenueDigitalProductConfirmation = "CREATE INTERNAL DIGITAL PRODUCT QUEUE";
export const revenuePerformanceIngestConfirmation = "INGEST INTERNAL PERFORMANCE SNAPSHOTS";
export const revenuePerformanceRotationConfirmation = "APPLY PERFORMANCE ROTATION";
export const revenueListingOptimizationConfirmation = "APPLY INTERNAL LISTING OPTIMIZATION";
export const revenueStoreSetupConfirmation = "APPLY INTERNAL STORE SETUP RUNBOOK";
export const financialOrchestratorConfirmation = "APPLY INTERNAL FINANCIAL ORCHESTRATOR";
export const financialReleaseGovernanceConfirmation = "RECORD FINANCIAL RELEASE GOVERNANCE";
export const financialScalingSpendControlConfirmation = "RECORD FINANCIAL SCALING SPEND CONTROLS";
export const financialScalingExecutionLedgerConfirmation = "INGEST INTERNAL SCALING EXECUTION OUTCOMES";
export const financialPayoutApproveConfirmation = "APPROVE FINANCIAL PAYOUT INTENT";
export const financialPayoutRejectConfirmation = "REJECT FINANCIAL PAYOUT INTENT";
export const financialScalingBudgetApproveConfirmation = "APPROVE FINANCIAL SCALING BUDGET";
export const financialScalingBudgetRejectConfirmation = "REJECT FINANCIAL SCALING BUDGET";
export const facelessContentPipelineConfirmation = "CREATE INTERNAL FACELESS CONTENT PIPELINE";
export const facelessContentPerformanceIngestConfirmation = "INGEST INTERNAL CONTENT PERFORMANCE SNAPSHOTS";
export const portfolioCommandCenterConfirmation = "APPLY INTERNAL PORTFOLIO COMMAND ACTIONS";
export const signalIntakeConfirmation = "INGEST APPROVED READ-ONLY SIGNALS";
export const revenueSignalConnectorConfirmation = "RECORD READONLY SIGNAL CONNECTOR MANIFESTS";
export const revenueSignalConnectorApprovalConfirmation = "QUEUE READONLY SIGNAL CONNECTOR APPROVALS";
export const revenueSignalConnectorApproveConfirmation = "APPROVE READONLY SIGNAL CONNECTOR";
export const revenueSignalConnectorRejectConfirmation = "REJECT READONLY SIGNAL CONNECTOR";
export const revenueSignalImportJobConfirmation = "QUEUE READONLY SIGNAL IMPORT JOBS";
export const revenueSignalImportHandoffConfirmation = "INGEST QUEUED READONLY SIGNAL IMPORT JOBS";
export const revenueAutopilotConfirmation = "RUN INTERNAL REVENUE AUTOPILOT";
export const revenueAutopilotExecutionConfirmation = "EXECUTE INTERNAL REVENUE AUTOPILOT STEPS";
export const revenueOpportunityFactoryConfirmation = "CREATE INTERNAL REVENUE OPPORTUNITY";
export const revenueOpportunityControlConfirmation = "UPDATE INTERNAL REVENUE OPPORTUNITY CONTROL";
export const revenueBusinessFleetLaunchWaveConfirmation = "RUN INTERNAL BUSINESS FLEET LAUNCH WAVE";
export const revenueBusinessFleetSeedGapConfirmation = "CREATE INTERNAL BUSINESS FLEET GAP SEEDS";
export const revenueBusinessFleetGapAccelerationConfirmation = "RUN INTERNAL BUSINESS FLEET GAP ACCELERATION";
export const revenueBusinessFleetLiveLaunchPackageConfirmation = "RECORD INTERNAL BUSINESS FLEET LIVE LAUNCH PACKAGE";
export const revenueBusinessFleetProviderApprovalReviewConfirmation = "REVIEW INTERNAL BUSINESS FLEET PROVIDER APPROVALS";
export const revenueMoneyArmyBatchPipelineConfirmation = "RUN INTERNAL MONEY ARMY BATCH PIPELINE";
export const revenueHundredStoreOperationsApplyConfirmation = "RUN INTERNAL 100 STORE OPERATIONS STEP";
export const revenueHundredStoreAppConnectionPacketsConfirmation = "RECORD INTERNAL 100 STORE APP CONNECTION PACKETS";
export const revenueHundredStoreConnectorActivationConfirmation = "RECORD INTERNAL 100 STORE CONNECTOR ACTIVATION MATRIX";
export const revenueHundredStoreMonitoringCycleConfirmation = "RECORD INTERNAL 100 STORE MONITORING CYCLE";
export const revenueHundredStoreDailySupervisorConfirmation = "RUN INTERNAL 100 STORE DAILY SUPERVISOR";
export const revenueHundredStoreProductDepthConfirmation = "RECORD INTERNAL 100 STORE PRODUCT DEPTH DRAFTS";
export const revenueHundredStoreLaunchPacketsConfirmation = "RECORD INTERNAL 100 STORE LAUNCH PACKETS";
export const revenueHundredStoreAutonomyRunConfirmation = "RECORD INTERNAL 100 STORE AUTONOMY RUN";
export const revenueHundredStoreWorkLeasesConfirmation = "RECORD INTERNAL 100 STORE WORK LEASES";
export const revenueHundredStoreWorkerAssignmentsConfirmation = "RECORD INTERNAL 100 STORE WORKER ASSIGNMENTS";
export const revenueMoneyArmyGenerateScoreBatchConfirmation = "RECORD INTERNAL MONEY ARMY GENERATE SCORE BATCH";
export const revenueFirstBusinessLaunchPackageConfirmation = "RECORD INTERNAL FIRST BUSINESS LAUNCH PACKAGE";
export const revenueFirstStorePrepareConfirmation = "APPROVE AND PREPARE FIRST STORE";
export const revenueFirstBusinessInternalLaunchConfirmation = "LAUNCH FIRST BUSINESS INTERNALLY";
export const revenueFirstBusinessExecuteConfirmation = "EXECUTE FIRST BUSINESS INTERNALLY";
export const revenueFirstBusinessAutonomousLaunchConfirmation = "RUN AUTONOMOUS FIRST BUSINESS LAUNCH PREP";
export const revenueFirstBusinessLiveExecutorConfirmation = "PREPARE CONTROLLED LIVE FIRST BUSINESS EXECUTOR";
export const revenueFirstBusinessLiveExecutorUnlockPhrase = "I APPROVE ENTRAL LIVE LAUNCH EXECUTION";
export const revenueOwnerManualLaunchApprovalConfirmation = "RECORD OWNER MANUAL LIVE LAUNCH APPROVAL";
export const revenueOwnerManualLaunchApprovalPhrase = "APPROVE FIRST STORE MANUAL LIVE LAUNCH";
export const revenueFirstStoreManualLaunchEvidenceConfirmation = "RECORD FIRST STORE MANUAL LAUNCH EVIDENCE";
export const revenueFirstStoreManualLaunchEvidencePhrase = "CONFIRM OWNER COMPLETED MANUAL FIRST STORE LAUNCH STEP";
export const revenueFirstStoreManualSignalCaptureConfirmation = "RECORD FIRST STORE MANUAL SIGNAL SNAPSHOT";
export const revenueWinnerClonePacketApprovalConfirmation = "RECORD INTERNAL WINNER CLONE PACKET APPROVAL";
export const revenueWinnerClonePacketApprovalPhrase = "APPROVE INTERNAL WINNER CLONE PACKET";
export const revenueLaunchChecklistActionBridgeConfirmation = "DISPATCH INTERNAL REVENUE LAUNCH CHECKLIST ACTIONS";
export const revenueLaunchSprintConfirmation = "RUN INTERNAL REVENUE LAUNCH SPRINT";
export const revenueFirstCashSprintConfirmation = "RUN INTERNAL FIRST CASH SPRINT";
export const revenueFirstBusinessLaunchConfirmation = "RUN INTERNAL FIRST BUSINESS LAUNCH PATH";
export const revenueLaunchHandoffConfirmation = "RECORD INTERNAL LAUNCH HANDOFF PACKETS";
export const revenueLaunchHandoffControlConfirmation = "UPDATE INTERNAL LAUNCH HANDOFF CONTROL";
export const revenueLaunchOperationsPackConfirmation = "RECORD INTERNAL LAUNCH OPERATIONS PACKS";
export const revenueLaunchClosureLedgerConfirmation = "RECORD INTERNAL LAUNCH CLOSURE LEDGER";
export const revenueLiveConnectorReadinessRegistryConfirmation = "RECORD INTERNAL LIVE CONNECTOR READINESS REGISTRY";
export const revenueLiveConnectorDesignDossierConfirmation = "RECORD INTERNAL LIVE CONNECTOR DESIGN DOSSIERS";
export const revenuePerformanceSourceSchema = z.enum(["manual", "etsy", "shopify", "printify", "printful", "stripe", "other"]);
export const facelessContentChannelSchema = z.enum(["youtube_shorts", "tiktok", "instagram_reels"]);
export const facelessContentPerformanceSourceSchema = z.enum(["manual", "youtube", "tiktok", "instagram", "other"]);
export const merchReportTypeSchema = z.enum([
  "Store Launch Report",
  "Weekly Store Report",
  "Product Performance Report",
  "Sales Report",
  "Profit Estimate Report",
  "New Design Opportunity Report",
  "Client Update Report"
]);

const clientMerchStoreFields = {
  clientName: z.string().trim().min(2).max(120),
  businessName: z.string().trim().min(2).max(140),
  contactName: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: optionalTrimmedString(40),
  industry: z.string().trim().min(2).max(120),
  audience: z.string().trim().min(2).max(500),
  brandStyle: z.string().trim().min(2).max(500),
  storePlatform: merchStorePlatformSchema,
  podProvider: merchPodProviderSchema,
  productTypes: z.array(z.string().trim().min(1).max(80)).max(30),
  designCount: z.coerce.number().int().min(0).max(10_000),
  setupFee: moneyAmountSchema,
  monthlyFee: moneyAmountSchema,
  profitShare: percentAmountSchema,
  approvalStatus: merchApprovalStatusSchema,
  launchStatus: merchLaunchStatusSchema,
  revenue: moneyAmountSchema,
  estimatedProfit: moneyAmountSchema,
  commandMarshalId: optionalTrimmedString(120),
  commandMarshalName: optionalTrimmedString(160),
  commandGeneralId: optionalTrimmedString(120),
  commandGeneralName: optionalTrimmedString(160),
  notes: optionalTrimmedString(5000)
};

export const createClientMerchStoreSchema = z.object({
  ...clientMerchStoreFields,
  storePlatform: clientMerchStoreFields.storePlatform.default("Etsy"),
  podProvider: clientMerchStoreFields.podProvider.default("Printify"),
  productTypes: clientMerchStoreFields.productTypes.default([]),
  designCount: clientMerchStoreFields.designCount.default(0),
  setupFee: clientMerchStoreFields.setupFee.default(0),
  monthlyFee: clientMerchStoreFields.monthlyFee.default(0),
  profitShare: clientMerchStoreFields.profitShare.default(0),
  approvalStatus: clientMerchStoreFields.approvalStatus.default("Not Started"),
  launchStatus: clientMerchStoreFields.launchStatus.default("Lead"),
  revenue: clientMerchStoreFields.revenue.default(0),
  estimatedProfit: clientMerchStoreFields.estimatedProfit.default(0)
});

export const updateClientMerchStoreSchema = z.object(clientMerchStoreFields).partial().refine(
  (input) => Object.keys(input).length > 0,
  "At least one merch store field must be provided."
);

export const clientMerchStoreIdParamsSchema = z.object({
  storeId: z.string().cuid()
});

export const clientMerchStoreListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  approvalStatus: merchApprovalStatusSchema.optional(),
  launchStatus: merchLaunchStatusSchema.optional(),
  search: optionalTrimmedString(120)
});

const podProductFields = {
  storeId: z.string().cuid(),
  productName: z.string().trim().min(2).max(160),
  productType: z.string().trim().min(2).max(120),
  targetAudience: z.string().trim().min(2).max(500),
  designTheme: z.string().trim().min(2).max(240),
  designConcept: z.string().trim().min(2).max(1000),
  designPrompt: z.string().trim().min(2).max(4000),
  typographyDirection: z.string().trim().min(2).max(500),
  colorDirection: z.string().trim().min(2).max(500),
  mockupNotes: optionalTrimmedString(2000),
  supplierCost: moneyAmountSchema,
  shippingCost: moneyAmountSchema,
  retailPrice: moneyAmountSchema,
  estimatedPlatformFees: moneyAmountSchema,
  estimatedProfit: moneyAmountSchema,
  profitMargin: z.coerce.number().finite().min(0).max(10_000),
  listingTitle: optionalTrimmedString(200),
  listingDescription: optionalTrimmedString(5000),
  tags: z.array(z.string().trim().min(1).max(80)).max(40),
  complianceNotes: optionalTrimmedString(3000),
  aiDisclosureNeeded: z.boolean(),
  productionPartnerDisclosureNeeded: z.boolean(),
  status: podProductStatusSchema,
  commandMarshalId: optionalTrimmedString(120),
  commandMarshalName: optionalTrimmedString(160),
  commandGeneralId: optionalTrimmedString(120),
  commandGeneralName: optionalTrimmedString(160),
  commandCommanderId: optionalTrimmedString(120),
  commandCommanderName: optionalTrimmedString(160),
  commandSoldierId: optionalTrimmedString(120),
  commandSoldierName: optionalTrimmedString(160)
};

export const createPodProductSchema = z.object({
  ...podProductFields,
  supplierCost: podProductFields.supplierCost.default(0),
  shippingCost: podProductFields.shippingCost.default(0),
  retailPrice: podProductFields.retailPrice.default(0),
  estimatedPlatformFees: podProductFields.estimatedPlatformFees.default(0),
  estimatedProfit: podProductFields.estimatedProfit.default(0),
  profitMargin: podProductFields.profitMargin.default(0),
  tags: podProductFields.tags.default([]),
  aiDisclosureNeeded: podProductFields.aiDisclosureNeeded.default(false),
  productionPartnerDisclosureNeeded: podProductFields.productionPartnerDisclosureNeeded.default(false),
  status: podProductFields.status.default("Idea")
});

export const updatePodProductSchema = z.object(podProductFields).partial().refine(
  (input) => Object.keys(input).length > 0,
  "At least one POD product field must be provided."
);

export const podProductIdParamsSchema = z.object({
  productId: z.string().cuid()
});

export const storePodProductParamsSchema = z.object({
  storeId: z.string().cuid()
});

export const podProductListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: podProductStatusSchema.optional(),
  storeId: z.string().cuid().optional(),
  search: optionalTrimmedString(120)
});

export const generateProductBatchSchema = z.object({
  storeId: z.string().cuid(),
  productTypes: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
  productCount: z.coerce.number().pipe(productBatchSizeSchema).default(5),
  styleDirection: z.string().trim().min(2).max(500),
  audience: z.string().trim().min(2).max(500),
  priceRange: z.object({
    min: moneyAmountSchema,
    max: moneyAmountSchema
  }).refine((range) => range.max >= range.min, "Maximum price must be greater than or equal to minimum price."),
  riskTolerance: productBatchRiskToleranceSchema.default("Medium")
});

export const complianceCheckSchema = z.object({
  aiDisclosureNeeded: z.boolean().optional(),
  colorDirection: optionalTrimmedString(500),
  complianceNotes: optionalTrimmedString(3000),
  designConcept: optionalTrimmedString(1000),
  designPrompt: optionalTrimmedString(4000),
  designTheme: optionalTrimmedString(240),
  listingDescription: optionalTrimmedString(5000),
  listingTitle: optionalTrimmedString(200),
  productName: optionalTrimmedString(160),
  productionPartnerDisclosureNeeded: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  typographyDirection: optionalTrimmedString(500)
});

export const pricingCalculatorSchema = z.object({
  preset: pricingPlatformPresetSchema.default("Etsy"),
  supplierCost: moneyAmountSchema,
  shippingCost: moneyAmountSchema,
  retailPrice: moneyAmountSchema,
  platformFeePercent: percentAmountSchema.optional(),
  listingFee: moneyAmountSchema.optional(),
  paymentProcessingEstimate: moneyAmountSchema.optional(),
  adSpendEstimate: moneyAmountSchema.default(0)
});

export const providerPayloadQuerySchema = z.object({
  includeUnapproved: z.preprocess((value) => value === true || value === "true", z.boolean()).default(false),
  maxProducts: z.coerce.number().int().min(1).max(25).default(5)
});

export const requestProviderPayloadApprovalSchema = providerPayloadQuerySchema.extend({
  note: optionalTrimmedString(500),
  scheduledFor: z.string().datetime().optional()
});

const revenueEngineThresholdFields = {
  maxRotationUpdates: z.coerce.number().int().min(1).max(250).default(25),
  minPortfolioProductsPerStore: z.coerce.number().int().min(1).max(100).default(5),
  minProductMargin: percentAmountSchema.default(20),
  minProductProfit: moneyAmountSchema.default(6),
  minScaleProducts: z.coerce.number().int().min(1).max(100).default(2),
  scaleProductMargin: percentAmountSchema.default(35),
  scaleProductProfit: moneyAmountSchema.default(12)
};

const revenueAssetRotationDecisionSchema = z.enum(["scale", "watch", "pause", "kill"]);

export const revenueEngineQuerySchema = z.object(revenueEngineThresholdFields);

const revenueBusinessFleetSchedulerFields = {
  killPressureThreshold: z.coerce.number().int().min(0).max(100).default(70),
  launchWaveSize: z.coerce.number().int().min(1).max(100).default(10),
  maxParallelLaunches: z.coerce.number().int().min(1).max(1_000).default(10),
  maxParallelScaleActions: z.coerce.number().int().min(1).max(2_000).default(25),
  qualityFloor: z.coerce.number().int().min(0).max(100).default(70),
  shardCount: z.coerce.number().int().min(1).max(256).default(32),
  targetBusinesses: z.coerce.number().int().min(1).max(100_000).default(1_000)
};

export const revenueBusinessFleetSchedulerQuerySchema = z.object(revenueBusinessFleetSchedulerFields);

const revenueHundredStoreOperationsFields = {
  killPressureThreshold: z.coerce.number().int().min(0).max(100).default(70),
  launchWaveSize: z.coerce.number().int().min(1).max(100).default(25),
  maxParallelLaunches: z.coerce.number().int().min(1).max(1_000).default(25),
  maxParallelScaleActions: z.coerce.number().int().min(1).max(2_000).default(50),
  maxStoresPerShard: z.coerce.number().int().min(1).max(100).default(8),
  minProductsPerStore: z.coerce.number().int().min(1).max(25).default(5),
  qualityFloor: z.coerce.number().int().min(0).max(100).default(72),
  safeBatchSize: z.coerce.number().int().min(1).max(50).default(25),
  shardCount: z.coerce.number().int().min(1).max(256).default(32),
  targetStores: z.coerce.number().int().min(100).max(100_000).default(100)
};

export const revenueHundredStoreOperationsQuerySchema = z.object(revenueHundredStoreOperationsFields);

export const applyRevenueHundredStoreOperationsSchema = z.object({
  ...revenueHundredStoreOperationsFields,
  confirm: z.literal(revenueHundredStoreOperationsApplyConfirmation),
  dryRun: z.boolean().default(true),
  maxCycles: z.coerce.number().int().min(1).max(4).default(1),
  note: optionalTrimmedString(500),
  podProvider: merchPodProviderSchema.default("Printify")
});

export const revenueHundredStoreApplicationRoleSchema = z.enum(["storefront", "pod_provider", "payments", "content", "manual_import"]);
export const revenueHundredStoreApplicationSetupStatusSchema = z.enum(["ready_for_internal_packet", "already_mapped", "blocked_by_store_quality"]);
export const revenueHundredStoreConnectorActivationStatusSchema = z.enum(["ready_for_connection_design", "credential_custody_required", "waiting_for_store_shell", "blocked_by_store_quality"]);
export const revenueHundredStoreMonitoringQueueSchema = z.enum(["manualSnapshots", "readOnlyImports", "rotationReviews", "scaleReviews", "all"]);
export const revenueHundredStoreMonitoringSignalStatusSchema = z.enum(["signal_ready", "needs_manual_snapshot", "needs_readonly_import", "rotation_review_required", "scale_review_required"]);
export const revenueHundredStoreProductDepthDraftStatusSchema = z.enum(["ready_for_internal_draft", "waiting_for_store_shell", "blocked_by_quality"]);
export const revenueHundredStoreLaunchPacketStatusSchema = z.enum(["ready_for_internal_launch_review", "waiting_for_store_shell", "needs_application_packets", "needs_product_depth", "blocked_by_quality"]);
export const revenueHundredStoreAutonomyJobStatusSchema = z.enum(["ready_internal", "approval_required", "waiting", "blocked"]);
export const revenueHundredStoreWorkLeaseStatusSchema = z.enum(["ready_to_claim", "approval_hold", "waiting_dependency", "blocked"]);
export const revenueHundredStoreWorkerAssignmentStatusSchema = z.enum(["ready_to_assign", "approval_hold", "waiting_dependency", "blocked"]);
export const revenueHundredStoreWorkerLaneSchema = z.enum(["store_builder", "product_builder", "connector_planner", "launch_reviewer", "monitoring_analyst", "growth_allocator", "rotation_reviewer"]);
export const revenueHundredStoreAutonomyJobTypeSchema = z.enum([
  "prepare_store_shell",
  "record_app_connection_packet",
  "record_connector_activation_row",
  "record_product_depth_draft",
  "record_launch_packet",
  "record_monitoring_evidence",
  "review_growth_allocation",
  "review_rotation"
]);

export const applyRevenueHundredStoreAppConnectionPacketsSchema = z.object({
  ...revenueHundredStoreOperationsFields,
  confirm: z.literal(revenueHundredStoreAppConnectionPacketsConfirmation),
  dryRun: z.boolean().default(true),
  maxPackets: z.coerce.number().int().min(1).max(500).default(100),
  note: optionalTrimmedString(500),
  roles: z.array(revenueHundredStoreApplicationRoleSchema).max(5).default([]),
  setupStatuses: z.array(revenueHundredStoreApplicationSetupStatusSchema).max(3).default(["ready_for_internal_packet"]),
  storeIds: z.array(z.string().trim().min(1).max(160)).max(100).default([])
});

export const applyRevenueHundredStoreConnectorActivationSchema = z.object({
  ...revenueHundredStoreOperationsFields,
  confirm: z.literal(revenueHundredStoreConnectorActivationConfirmation),
  dryRun: z.boolean().default(true),
  maxRows: z.coerce.number().int().min(1).max(500).default(25),
  note: optionalTrimmedString(500),
  roles: z.array(revenueHundredStoreApplicationRoleSchema).max(5).default([]),
  rowStatuses: z.array(revenueHundredStoreConnectorActivationStatusSchema).max(4).default(["ready_for_connection_design", "credential_custody_required"]),
  storeIds: z.array(z.string().trim().min(1).max(160)).max(100).default([])
});

export const applyRevenueHundredStoreMonitoringCycleSchema = z.object({
  ...revenueHundredStoreOperationsFields,
  confirm: z.literal(revenueHundredStoreMonitoringCycleConfirmation),
  dryRun: z.boolean().default(true),
  maxItems: z.coerce.number().int().min(1).max(100).default(25),
  note: optionalTrimmedString(500),
  queues: z.array(revenueHundredStoreMonitoringQueueSchema).max(5).default(["all"]),
  signalStatuses: z.array(revenueHundredStoreMonitoringSignalStatusSchema).max(5).default([]),
  storeIds: z.array(z.string().trim().min(1).max(160)).max(100).default([])
});

export const applyRevenueHundredStoreProductDepthSchema = z.object({
  ...revenueHundredStoreOperationsFields,
  confirm: z.literal(revenueHundredStoreProductDepthConfirmation),
  draftStatuses: z.array(revenueHundredStoreProductDepthDraftStatusSchema).max(3).default(["ready_for_internal_draft", "waiting_for_store_shell"]),
  dryRun: z.boolean().default(true),
  maxDrafts: z.coerce.number().int().min(1).max(250).default(25),
  note: optionalTrimmedString(500),
  storeIds: z.array(z.string().trim().min(1).max(160)).max(100).default([])
});

export const applyRevenueHundredStoreLaunchPacketsSchema = z.object({
  ...revenueHundredStoreOperationsFields,
  confirm: z.literal(revenueHundredStoreLaunchPacketsConfirmation),
  dryRun: z.boolean().default(true),
  maxPackets: z.coerce.number().int().min(1).max(250).default(25),
  note: optionalTrimmedString(500),
  packetStatuses: z.array(revenueHundredStoreLaunchPacketStatusSchema).max(5).default(["ready_for_internal_launch_review", "waiting_for_store_shell"]),
  storeIds: z.array(z.string().trim().min(1).max(160)).max(100).default([])
});

export const applyRevenueHundredStoreAutonomyRunSchema = z.object({
  ...revenueHundredStoreOperationsFields,
  confirm: z.literal(revenueHundredStoreAutonomyRunConfirmation),
  dryRun: z.boolean().default(true),
  jobStatuses: z.array(revenueHundredStoreAutonomyJobStatusSchema).max(4).default(["ready_internal", "approval_required"]),
  jobTypes: z.array(revenueHundredStoreAutonomyJobTypeSchema).max(8).default([]),
  maxJobs: z.coerce.number().int().min(1).max(250).default(25),
  note: optionalTrimmedString(500),
  storeIds: z.array(z.string().trim().min(1).max(160)).max(100).default([])
});

export const applyRevenueHundredStoreWorkLeasesSchema = z.object({
  ...revenueHundredStoreOperationsFields,
  confirm: z.literal(revenueHundredStoreWorkLeasesConfirmation),
  dryRun: z.boolean().default(true),
  jobTypes: z.array(revenueHundredStoreAutonomyJobTypeSchema).max(8).default([]),
  leaseStatuses: z.array(revenueHundredStoreWorkLeaseStatusSchema).max(4).default(["ready_to_claim", "approval_hold"]),
  maxLeases: z.coerce.number().int().min(1).max(500).default(25),
  note: optionalTrimmedString(500),
  storeIds: z.array(z.string().trim().min(1).max(160)).max(100).default([])
});

export const applyRevenueHundredStoreWorkerAssignmentsSchema = z.object({
  ...revenueHundredStoreOperationsFields,
  assignmentStatuses: z.array(revenueHundredStoreWorkerAssignmentStatusSchema).max(4).default(["ready_to_assign", "approval_hold"]),
  confirm: z.literal(revenueHundredStoreWorkerAssignmentsConfirmation),
  dryRun: z.boolean().default(true),
  jobTypes: z.array(revenueHundredStoreAutonomyJobTypeSchema).max(8).default([]),
  maxAssignments: z.coerce.number().int().min(1).max(500).default(25),
  note: optionalTrimmedString(500),
  storeIds: z.array(z.string().trim().min(1).max(160)).max(100).default([]),
  workerLanes: z.array(revenueHundredStoreWorkerLaneSchema).max(7).default([])
});

export const revenueHundredStoreDailySupervisorModeSchema = z.enum(["safe_internal_only", "include_batch_creation"]);

export const applyRevenueHundredStoreDailySupervisorSchema = z.object({
  ...revenueHundredStoreOperationsFields,
  confirm: z.literal(revenueHundredStoreDailySupervisorConfirmation),
  dryRun: z.boolean().default(true),
  maxSteps: z.coerce.number().int().min(1).max(10).default(4),
  mode: revenueHundredStoreDailySupervisorModeSchema.default("safe_internal_only"),
  note: optionalTrimmedString(500),
  podProvider: merchPodProviderSchema.default("Printify")
});

export const applyRevenueBusinessFleetLaunchWaveSchema = z.object({
  ...revenueBusinessFleetSchedulerFields,
  businessIds: z.array(z.string().trim().min(1).max(160)).max(100).default([]),
  confirm: z.literal(revenueBusinessFleetLaunchWaveConfirmation),
  dryRun: z.boolean().default(true),
  note: optionalTrimmedString(500)
});

export const applyRevenueBusinessFleetSeedGapSchema = z.object({
  ...revenueBusinessFleetSchedulerFields,
  confirm: z.literal(revenueBusinessFleetSeedGapConfirmation),
  dryRun: z.boolean().default(true),
  maxSeeds: z.coerce.number().int().min(1).max(25).default(10),
  note: optionalTrimmedString(500),
  podProvider: merchPodProviderSchema.default("Printify"),
  sourceKeys: z.array(z.string().trim().min(1).max(160)).max(100).default([])
});

export const applyRevenueBusinessFleetGapAccelerationSchema = z.object({
  confirm: z.literal(revenueBusinessFleetGapAccelerationConfirmation),
  dryRun: z.boolean().default(true),
  includeLaunchPipeline: z.boolean().default(true),
  includeListingOptimization: z.boolean().default(true),
  includeStoreSetup: z.boolean().default(true),
  maxStores: z.coerce.number().int().min(1).max(25).default(10),
  note: optionalTrimmedString(500),
  sourceKeys: z.array(z.string().trim().min(1).max(160)).max(100).default([])
});

export const applyRevenueBusinessFleetLiveLaunchPackageSchema = z.object({
  confirm: z.literal(revenueBusinessFleetLiveLaunchPackageConfirmation),
  dryRun: z.boolean().default(true),
  includeHandoffPackets: z.boolean().default(true),
  includeOperationsPacks: z.boolean().default(true),
  includeProviderApprovals: z.boolean().default(true),
  includeUnapproved: z.boolean().default(false),
  maxStores: z.coerce.number().int().min(1).max(25).default(10),
  note: optionalTrimmedString(500),
  sourceKeys: z.array(z.string().trim().min(1).max(160)).max(100).default([])
});

const revenueBusinessFleetSourceKeysQuerySchema = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);

  return [];
}, z.array(z.string().trim().min(1).max(160)).max(100).default([]));

export const revenueBusinessFleetLaunchGateQuerySchema = z.object({
  maxStores: z.coerce.number().int().min(1).max(25).default(10),
  sourceKeys: revenueBusinessFleetSourceKeysQuerySchema
});

export const revenueBusinessFleetProviderApprovalReviewQuerySchema = z.object({
  maxPackets: z.coerce.number().int().min(1).max(50).default(25),
  maxStores: z.coerce.number().int().min(1).max(25).default(10),
  sourceKeys: revenueBusinessFleetSourceKeysQuerySchema,
  status: z.enum(["pending", "approved", "rejected", "all"]).default("pending")
});

export const applyRevenueBusinessFleetProviderApprovalReviewSchema = z.object({
  action: z.enum(["approve", "reject"]).default("approve"),
  confirm: z.literal(revenueBusinessFleetProviderApprovalReviewConfirmation),
  dryRun: z.boolean().default(true),
  maxPackets: z.coerce.number().int().min(1).max(50).default(25),
  maxStores: z.coerce.number().int().min(1).max(25).default(10),
  note: optionalTrimmedString(500),
  packetIds: z.array(z.string().trim().min(1).max(160)).max(50).default([]),
  sourceKeys: revenueBusinessFleetSourceKeysQuerySchema
});

export const revenueMoneyArmyBatchPipelineQuerySchema = z.object({
  ...revenueBusinessFleetSchedulerFields,
  maxPackets: z.coerce.number().int().min(1).max(50).default(25),
  maxSeeds: z.coerce.number().int().min(1).max(25).default(10),
  maxStores: z.coerce.number().int().min(1).max(25).default(10),
  sourceKeys: revenueBusinessFleetSourceKeysQuerySchema
});

export const applyRevenueMoneyArmyBatchPipelineSchema = z.object({
  ...revenueBusinessFleetSchedulerFields,
  action: z.enum(["approve", "reject"]).default("approve"),
  confirm: z.literal(revenueMoneyArmyBatchPipelineConfirmation),
  dryRun: z.boolean().default(true),
  maxPackets: z.coerce.number().int().min(1).max(50).default(25),
  maxSeeds: z.coerce.number().int().min(1).max(25).default(10),
  maxStores: z.coerce.number().int().min(1).max(25).default(10),
  note: optionalTrimmedString(500),
  packetIds: z.array(z.string().trim().min(1).max(160)).max(50).default([]),
  podProvider: merchPodProviderSchema.default("Printify"),
  sourceKeys: z.array(z.string().trim().min(1).max(160)).max(100).default([]),
  stage: z.enum(["generate_score_batch", "first_business_launch_package", "prepare_first_store", "launch_first_business", "execute_first_business", "autonomous_first_business_launch", "controlled_live_executor", "batch_creation", "batch_acceleration", "launch_package", "approval", "deployment"]).optional()
});

const revenueMoneyArmyGenerateScoreBatchFields = {
  ...revenueEngineThresholdFields,
  candidateCount: z.coerce.number().int().min(10).max(50).default(25),
  maxProducts: z.coerce.number().int().min(5).max(10).default(10),
  priceRange: z.object({
    max: moneyAmountSchema.default(64),
    min: moneyAmountSchema.default(18)
  }).default({ max: 64, min: 18 }).refine((range) => range.max >= range.min, "Maximum price must be greater than or equal to minimum price."),
  productTypes: revenueBusinessFleetSourceKeysQuerySchema.pipe(z.array(z.string().trim().min(1).max(80)).max(12).default([])),
  riskTolerance: productBatchRiskToleranceSchema.default("Low"),
  storeIds: revenueBusinessFleetSourceKeysQuerySchema.pipe(z.array(z.string().trim().min(1).max(160)).max(50).default([]))
};

export const revenueMoneyArmyGenerateScoreBatchQuerySchema = z.object(revenueMoneyArmyGenerateScoreBatchFields);

export const applyRevenueMoneyArmyGenerateScoreBatchSchema = z.object({
  ...revenueMoneyArmyGenerateScoreBatchFields,
  confirm: z.literal(revenueMoneyArmyGenerateScoreBatchConfirmation),
  dryRun: z.boolean().default(true),
  note: optionalTrimmedString(500)
});

export const revenueFirstBusinessLaunchPackageQuerySchema = z.object(revenueMoneyArmyGenerateScoreBatchFields);

export const applyRevenueFirstBusinessLaunchPackageSchema = z.object({
  ...revenueMoneyArmyGenerateScoreBatchFields,
  confirm: z.literal(revenueFirstBusinessLaunchPackageConfirmation),
  dryRun: z.boolean().default(true),
  note: optionalTrimmedString(500)
});

export const applyRevenueFirstStorePrepareSchema = z.object({
  ...revenueMoneyArmyGenerateScoreBatchFields,
  confirm: z.literal(revenueFirstStorePrepareConfirmation),
  dryRun: z.boolean().default(false),
  note: optionalTrimmedString(500)
});

export const applyRevenueFirstBusinessInternalLaunchSchema = z.object({
  ...revenueMoneyArmyGenerateScoreBatchFields,
  confirm: z.literal(revenueFirstBusinessInternalLaunchConfirmation),
  dryRun: z.boolean().default(false),
  note: optionalTrimmedString(500)
});

export const applyRevenueFirstBusinessExecuteSchema = z.object({
  ...revenueMoneyArmyGenerateScoreBatchFields,
  confirm: z.literal(revenueFirstBusinessExecuteConfirmation),
  dryRun: z.boolean().default(false),
  note: optionalTrimmedString(500)
});

export const applyRevenueFirstBusinessAutonomousLaunchSchema = z.object({
  ...revenueMoneyArmyGenerateScoreBatchFields,
  confirm: z.literal(revenueFirstBusinessAutonomousLaunchConfirmation),
  dryRun: z.boolean().default(false),
  note: optionalTrimmedString(500)
});

export const applyRevenueFirstBusinessLiveExecutorSchema = z.object({
  ...revenueMoneyArmyGenerateScoreBatchFields,
  adDraftApproval: z.boolean().default(false),
  confirm: z.literal(revenueFirstBusinessLiveExecutorConfirmation),
  connectorApproval: z.boolean().default(false),
  dryRun: z.boolean().default(false),
  liveUnlockPhrase: z.string().trim().max(120).optional(),
  note: optionalTrimmedString(500),
  publicLaunchApproval: z.boolean().default(false)
});

export const applyRevenueOwnerManualLaunchApprovalSchema = z.object({
  approvalPhrase: z.literal(revenueOwnerManualLaunchApprovalPhrase),
  confirm: z.literal(revenueOwnerManualLaunchApprovalConfirmation),
  dryRun: z.boolean().default(true),
  note: optionalTrimmedString(500),
  storeId: z.string().trim().min(1).max(160).optional()
});

export const applyRevenueFirstStoreManualLaunchEvidenceSchema = z.object({
  approvalPhrase: z.literal(revenueFirstStoreManualLaunchEvidencePhrase),
  completedAt: z.string().datetime().optional(),
  confirm: z.literal(revenueFirstStoreManualLaunchEvidenceConfirmation),
  dryRun: z.boolean().default(true),
  evidenceCategory: z.enum(["storefront", "pod_supplier", "payments_payouts", "content_channels", "analytics_manual_import"]).default("storefront"),
  evidenceNote: optionalTrimmedString(1000),
  ownerCompletedManualStep: z.boolean().default(true),
  stepIndex: z.coerce.number().int().min(0).max(25).default(0),
  storeId: z.string().trim().min(1).max(160).optional()
});

export const applyRevenueFirstStoreManualSignalCaptureSchema = z.object({
  adSpend: moneyAmountSchema.default(0),
  confirm: z.literal(revenueFirstStoreManualSignalCaptureConfirmation),
  conversionNotes: optionalTrimmedString(1000),
  day: z.coerce.number().int().min(0).max(7).default(0),
  dryRun: z.boolean().default(true),
  grossRevenue: moneyAmountSchema.default(0),
  manualContentViews: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  manualSavesOrShares: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  netProfit: z.coerce.number().finite().min(-999_999_999).max(999_999_999).optional(),
  note: optionalTrimmedString(500),
  periodEnd: z.string().datetime().optional(),
  periodStart: z.string().datetime().optional(),
  rotationRecommendation: revenueAssetRotationDecisionSchema.default("watch"),
  storeId: z.string().trim().min(1).max(160).optional(),
  unitsSold: z.coerce.number().int().min(0).max(1_000_000).default(0),
  visits: z.coerce.number().int().min(0).max(1_000_000_000).default(0)
}).refine((input) => !input.periodStart || !input.periodEnd || Date.parse(input.periodEnd) >= Date.parse(input.periodStart), {
  message: "Manual signal period end must be after period start.",
  path: ["periodEnd"]
});

export const applyRevenueWinnerClonePacketApprovalSchema = z.object({
  approvalPhrase: z.literal(revenueWinnerClonePacketApprovalPhrase),
  confirm: z.literal(revenueWinnerClonePacketApprovalConfirmation),
  dryRun: z.boolean().default(true),
  note: optionalTrimmedString(500),
  storeId: z.string().trim().min(1).max(160).optional(),
  targetStores: z.coerce.number().int().refine((value) => value === 10 || value === 25 || value === 100, {
    message: "Winner clone packet targetStores must be 10, 25, or 100."
  })
});

export const revenueAssetControlLedgerQuerySchema = z.object({
  action: revenueAssetRotationDecisionSchema.optional(),
  assetId: z.string().trim().min(1).max(160).optional(),
  assetType: z.enum(["product", "store"]).optional(),
  fromDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  includeOverridesOnly: z.preprocess((value) => value === true || value === "true", z.boolean()).default(false),
  limit: z.coerce.number().int().min(1).max(250).default(100),
  storeId: z.string().trim().min(1).max(160).optional(),
  toDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
}).refine((input) => !input.fromDate || !input.toDate || input.toDate >= input.fromDate, {
  message: "Asset control ledger toDate must be on or after fromDate.",
  path: ["toDate"]
});

export const revenueAssetReviewQueueQuerySchema = z.object({
  includeWatch: z.preprocess((value) => value === true || value === "true", z.boolean()).default(false),
  maxItems: z.coerce.number().int().min(1).max(100).default(25),
  staleAfterDays: z.coerce.number().int().min(1).max(365).default(14)
});

export const revenueAssetControlRecoveryQuerySchema = z.object({
  includeResolved: z.preprocess((value) => value === true || value === "true", z.boolean()).default(false),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  staleAfterDays: z.coerce.number().int().min(1).max(365).default(14)
});

export const applyRevenueRotationSchema = z.object({
  ...revenueEngineThresholdFields,
  confirm: z.literal(revenueEngineConfirmation),
  dryRun: z.boolean().default(false)
});

export const applyRevenueAssetActionSchema = z.object({
  ...revenueEngineThresholdFields,
  action: revenueAssetRotationDecisionSchema,
  assetId: z.string().trim().min(1).max(160),
  assetType: z.enum(["product", "store"]),
  confirm: z.literal(revenueAssetActionConfirmation),
  dryRun: z.boolean().default(true)
});

export const applyRevenueAssetBatchActionSchema = z.object({
  ...revenueEngineThresholdFields,
  actions: z.array(z.object({
    action: revenueAssetRotationDecisionSchema,
    assetId: z.string().trim().min(1).max(160),
    assetType: z.enum(["product", "store"])
  })).min(1).max(50),
  confirm: z.literal(revenueAssetBatchActionConfirmation),
  dryRun: z.boolean().default(true)
});

const revenueLaunchPipelineFields = {
  maxStores: z.coerce.number().int().min(1).max(25).default(5),
  minApprovedProducts: z.coerce.number().int().min(1).max(25).default(2),
  minPortfolioProductsPerStore: z.coerce.number().int().min(1).max(100).default(5),
  productCount: z.coerce.number().pipe(productBatchSizeSchema).default(5),
  riskTolerance: productBatchRiskToleranceSchema.default("Low")
};

export const revenueLaunchPipelineQuerySchema = z.object(revenueLaunchPipelineFields);

export const applyRevenueLaunchPipelineSchema = z.object({
  ...revenueLaunchPipelineFields,
  confirm: z.literal(revenueLaunchPipelineConfirmation),
  dryRun: z.boolean().default(false)
});

const revenueDigitalProductFields = {
  includeLeadMagnets: z.preprocess((value) => value !== false && value !== "false", z.boolean()).default(true),
  maxStores: z.coerce.number().int().min(1).max(25).default(5),
  minDigitalProductsPerStore: z.coerce.number().int().min(1).max(50).default(3),
  productsPerStore: z.coerce.number().pipe(productBatchSizeSchema).default(5),
  riskTolerance: productBatchRiskToleranceSchema.default("Low")
};

export const revenueDigitalProductQuerySchema = z.object(revenueDigitalProductFields);

export const applyRevenueDigitalProductSchema = z.object({
  ...revenueDigitalProductFields,
  confirm: z.literal(revenueDigitalProductConfirmation),
  dryRun: z.boolean().default(false)
});

const revenuePerformanceOptionFields = {
  maxAdSpendRatio: z.coerce.number().finite().min(0).max(10_000).default(70),
  maxRecommendations: z.coerce.number().int().min(1).max(250).default(25),
  maxRefundRate: z.coerce.number().finite().min(0).max(10_000).default(25),
  minKillProfitVelocity: z.coerce.number().finite().min(-999_999).max(0).default(-5),
  minPauseProfitVelocity: z.coerce.number().finite().min(-999_999).max(999_999).default(-1),
  minScaleConversionRate: percentAmountSchema.default(1.5),
  minScaleProfitVelocity: moneyAmountSchema.default(10),
  minSnapshotsForKill: z.coerce.number().int().min(1).max(25).default(2),
  minWatchVisits: z.coerce.number().int().min(0).max(1_000_000).default(50),
  source: revenuePerformanceSourceSchema.optional(),
  storeId: z.string().cuid().optional(),
  windowDays: z.coerce.number().int().min(1).max(365).default(30)
};

export const revenuePerformanceQuerySchema = z.object(revenuePerformanceOptionFields);

export const revenuePerformanceSnapshotSchema = z.object({
  adSpend: moneyAmountSchema.default(0),
  digitalDeliveryCost: moneyAmountSchema.default(0),
  discounts: moneyAmountSchema.default(0),
  grossRevenue: moneyAmountSchema.default(0),
  impressions: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  netProfit: z.coerce.number().finite().min(-999_999_999).max(999_999_999).optional(),
  notes: optionalTrimmedString(2000),
  periodEnd: z.string().datetime(),
  periodStart: z.string().datetime(),
  platformFees: moneyAmountSchema.default(0),
  productId: z.string().cuid().nullable().optional(),
  productionCost: moneyAmountSchema.default(0),
  refunds: moneyAmountSchema.default(0),
  shippingCost: moneyAmountSchema.default(0),
  source: revenuePerformanceSourceSchema.default("manual"),
  storeId: z.string().cuid(),
  unitsSold: z.coerce.number().int().min(0).max(1_000_000).default(0),
  visits: z.coerce.number().int().min(0).max(1_000_000_000).default(0)
}).refine((input) => Date.parse(input.periodEnd) >= Date.parse(input.periodStart), {
  message: "Performance period end must be after period start.",
  path: ["periodEnd"]
});

export const ingestRevenuePerformanceSchema = z.object({
  confirm: z.literal(revenuePerformanceIngestConfirmation),
  dryRun: z.boolean().default(false),
  snapshots: z.array(revenuePerformanceSnapshotSchema).min(1).max(100)
});

export const applyRevenuePerformanceRotationSchema = z.object({
  ...revenuePerformanceOptionFields,
  confirm: z.literal(revenuePerformanceRotationConfirmation),
  dryRun: z.boolean().default(false)
});

const revenueListingOptimizationFields = {
  includePricingExperiments: z.preprocess((value) => value !== false && value !== "false", z.boolean()).default(true),
  maxPriceIncreasePercent: percentAmountSchema.default(20),
  maxProducts: z.coerce.number().int().min(1).max(50).default(10),
  minProfitMargin: percentAmountSchema.default(25),
  minVisitsForPerformanceExperiment: z.coerce.number().int().min(0).max(1_000_000).default(50),
  variantsPerProduct: z.coerce.number().int().min(1).max(4).default(3),
  windowDays: z.coerce.number().int().min(1).max(365).default(30)
};

export const revenueListingOptimizationQuerySchema = z.object(revenueListingOptimizationFields);

export const applyRevenueListingOptimizationSchema = z.object({
  ...revenueListingOptimizationFields,
  confirm: z.literal(revenueListingOptimizationConfirmation),
  dryRun: z.boolean().default(false)
});

const revenueStoreSetupFields = {
  includeCredentialScopes: z.preprocess((value) => value !== false && value !== "false", z.boolean()).default(true),
  maxStores: z.coerce.number().int().min(1).max(50).default(10),
  minApprovedProducts: z.coerce.number().int().min(1).max(50).default(2),
  minConnectorReadiness: percentAmountSchema.default(75),
  minListingReadyProducts: z.coerce.number().int().min(1).max(50).default(2)
};

export const revenueStoreSetupQuerySchema = z.object(revenueStoreSetupFields);

export const applyRevenueStoreSetupSchema = z.object({
  ...revenueStoreSetupFields,
  confirm: z.literal(revenueStoreSetupConfirmation),
  dryRun: z.boolean().default(false)
});

const financialOrchestratorFields = {
  bufferPercent: percentAmountSchema.default(25),
  currency: z.literal("USD").default("USD"),
  includePayoutIntents: z.preprocess((value) => value !== false && value !== "false", z.boolean()).default(true),
  minPayoutIntentAmount: moneyAmountSchema.default(25),
  personalPercent: percentAmountSchema.default(50),
  reserveFloorAmount: moneyAmountSchema.default(0),
  scalingPercent: percentAmountSchema.default(25),
  source: revenuePerformanceSourceSchema.optional(),
  storeId: z.string().cuid().optional(),
  windowDays: z.coerce.number().int().min(1).max(365).default(30)
};

function splitPolicyMatchesExactMoneyArmyPolicy(input: {
  bufferPercent: number;
  personalPercent: number;
  scalingPercent: number;
}) {
  return Math.round(input.scalingPercent * 100) === 2_500
    && Math.round(input.bufferPercent * 100) === 2_500
    && Math.round(input.personalPercent * 100) === 5_000;
}

export const financialOrchestratorQuerySchema = z.object(financialOrchestratorFields).refine(splitPolicyMatchesExactMoneyArmyPolicy, {
  message: "Financial split is locked to 25% Ad/Growth, 25% Entral operations, and 50% owner income.",
  path: ["scalingPercent"]
});

export const applyFinancialOrchestratorSchema = z.object({
  ...financialOrchestratorFields,
  confirm: z.literal(financialOrchestratorConfirmation),
  dryRun: z.boolean().default(false)
}).refine(splitPolicyMatchesExactMoneyArmyPolicy, {
  message: "Financial split is locked to 25% Ad/Growth, 25% Entral operations, and 50% owner income.",
  path: ["scalingPercent"]
});

export const financialPayoutIntentParamsSchema = z.object({
  intentId: z.string().trim().min(1).max(120)
});

export const financialScalingBudgetPacketParamsSchema = z.object({
  packetId: z.string().trim().min(1).max(160)
});

export const reviewFinancialPayoutIntentSchema = z.object({
  action: z.enum(["approve", "reject"]),
  confirm: z.string().trim(),
  note: optionalTrimmedString(500)
}).superRefine((input, ctx) => {
  const expected = input.action === "approve" ? financialPayoutApproveConfirmation : financialPayoutRejectConfirmation;

  if (input.confirm !== expected) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Confirm with ${expected}.`,
      path: ["confirm"]
    });
  }
});

export const reviewFinancialScalingBudgetPacketSchema = z.object({
  action: z.enum(["approve", "reject"]),
  confirm: z.string().trim(),
  note: optionalTrimmedString(500)
}).superRefine((input, ctx) => {
  const expected = input.action === "approve" ? financialScalingBudgetApproveConfirmation : financialScalingBudgetRejectConfirmation;

  if (input.confirm !== expected) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Confirm with ${expected}.`,
      path: ["confirm"]
    });
  }
});

export const applyFinancialReleaseGovernanceSchema = z.object({
  confirm: z.literal(financialReleaseGovernanceConfirmation),
  dryRun: z.boolean().default(false)
});

export const applyFinancialScalingSpendControlSchema = z.object({
  confirm: z.literal(financialScalingSpendControlConfirmation),
  dryRun: z.boolean().default(false)
});

export const financialScalingExecutionOutcomeSchema = z.enum(["validated", "watch", "stopped", "scale_next"]);
export const financialScalingExecutionSourceSchema = z.enum(["manual", "signal_intake", "operator_reconciliation", "other"]);

export const financialScalingExecutionEntrySchema = z.object({
  amountSpent: moneyAmountSchema.default(0),
  grossRevenue: moneyAmountSchema.default(0),
  netProfit: z.coerce.number().finite().min(-999_999_999).max(999_999_999).default(0),
  notes: optionalTrimmedString(2000),
  outcome: financialScalingExecutionOutcomeSchema.default("watch"),
  periodEnd: z.string().datetime(),
  periodStart: z.string().datetime(),
  scalingSpendPacketId: z.string().trim().min(1).max(160),
  source: financialScalingExecutionSourceSchema.default("manual"),
  unitsSold: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  visits: z.coerce.number().int().min(0).max(1_000_000_000).default(0)
}).refine((input) => Date.parse(input.periodEnd) >= Date.parse(input.periodStart), {
  message: "Scaling execution period end must be after period start.",
  path: ["periodEnd"]
});

export const ingestFinancialScalingExecutionLedgerSchema = z.object({
  confirm: z.literal(financialScalingExecutionLedgerConfirmation),
  dryRun: z.boolean().default(false),
  entries: z.array(financialScalingExecutionEntrySchema).min(1).max(50)
});

const facelessTargetChannelsSchema = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return undefined;
}, z.array(facelessContentChannelSchema).min(1).max(3).default(["youtube_shorts", "tiktok", "instagram_reels"]));

const facelessContentPipelineFields = {
  briefsPerStore: z.coerce.number().int().min(1).max(10).default(3),
  includeChannelPackages: z.preprocess((value) => value !== false && value !== "false", z.boolean()).default(true),
  includeVideoSpecs: z.preprocess((value) => value !== false && value !== "false", z.boolean()).default(true),
  includeVoiceoverSpecs: z.preprocess((value) => value !== false && value !== "false", z.boolean()).default(true),
  maxStores: z.coerce.number().int().min(1).max(25).default(5),
  minClicksForScale: z.coerce.number().int().min(0).max(1_000_000).default(25),
  minViewsForRemix: z.coerce.number().int().min(0).max(1_000_000_000).default(500),
  targetChannels: facelessTargetChannelsSchema,
  windowDays: z.coerce.number().int().min(1).max(365).default(30)
};

export const facelessContentPipelineQuerySchema = z.object(facelessContentPipelineFields);

export const applyFacelessContentPipelineSchema = z.object({
  ...facelessContentPipelineFields,
  confirm: z.literal(facelessContentPipelineConfirmation),
  dryRun: z.boolean().default(false)
});

export const facelessContentPerformanceQuerySchema = z.object({
  channel: facelessContentChannelSchema.optional(),
  source: facelessContentPerformanceSourceSchema.optional(),
  storeId: z.string().cuid().optional(),
  windowDays: z.coerce.number().int().min(1).max(365).default(30)
});

export const facelessContentPerformanceSnapshotSchema = z.object({
  channel: facelessContentChannelSchema.default("youtube_shorts"),
  clicks: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  comments: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  contentBriefId: z.string().trim().min(1).max(120).nullable().optional(),
  conversions: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  cost: moneyAmountSchema.default(0),
  likes: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  notes: optionalTrimmedString(2000),
  periodEnd: z.string().datetime(),
  periodStart: z.string().datetime(),
  productId: z.string().cuid().nullable().optional(),
  revenue: moneyAmountSchema.default(0),
  saves: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  shares: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  source: facelessContentPerformanceSourceSchema.default("manual"),
  storeId: z.string().cuid().nullable().optional(),
  views: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  watchSeconds: z.coerce.number().int().min(0).max(1_000_000_000).default(0)
}).refine((input) => Date.parse(input.periodEnd) >= Date.parse(input.periodStart), {
  message: "Content performance period end must be after period start.",
  path: ["periodEnd"]
});

export const ingestFacelessContentPerformanceSchema = z.object({
  confirm: z.literal(facelessContentPerformanceIngestConfirmation),
  dryRun: z.boolean().default(false),
  snapshots: z.array(facelessContentPerformanceSnapshotSchema).min(1).max(100)
});

const signalIntakeFields = {
  includeSamplePayloads: z.preprocess((value) => value !== false && value !== "false", z.boolean()).default(true),
  maxSignals: z.coerce.number().int().min(1).max(100).default(100),
  windowDays: z.coerce.number().int().min(1).max(365).default(30)
};

export const signalIntakeQuerySchema = z.object(signalIntakeFields);

export const signalIntakeCommerceSignalSchema = z.intersection(revenuePerformanceSnapshotSchema, z.object({
  externalReference: optionalTrimmedString(240)
}));

export const signalIntakeContentSignalSchema = z.intersection(facelessContentPerformanceSnapshotSchema, z.object({
  externalReference: optionalTrimmedString(240)
}));

export const signalIntakePaymentSignalSchema = z.object({
  availableBalance: moneyAmountSchema.default(0),
  currency: z.literal("USD").default("USD"),
  externalReference: optionalTrimmedString(240),
  fees: moneyAmountSchema.default(0),
  notes: optionalTrimmedString(2000),
  paidOut: moneyAmountSchema.default(0),
  pendingBalance: moneyAmountSchema.default(0),
  periodEnd: z.string().datetime(),
  periodStart: z.string().datetime(),
  provider: z.enum(["stripe", "manual", "other"]).default("manual")
}).refine((input) => Date.parse(input.periodEnd) >= Date.parse(input.periodStart), {
  message: "Payment signal period end must be after period start.",
  path: ["periodEnd"]
});

export const applySignalIntakeSchema = z.object({
  ...signalIntakeFields,
  commerceSignals: z.array(signalIntakeCommerceSignalSchema).max(100).default([]),
  confirm: z.literal(signalIntakeConfirmation),
  contentSignals: z.array(signalIntakeContentSignalSchema).max(100).default([]),
  dryRun: z.boolean().default(false),
  paymentSignals: z.array(signalIntakePaymentSignalSchema).max(25).default([])
}).superRefine((input, ctx) => {
  if (input.commerceSignals.length + input.contentSignals.length + input.paymentSignals.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide at least one approved read-only signal.",
      path: ["commerceSignals"]
    });
  }
});

const revenueSignalConnectorBooleanSchema = (defaultValue: boolean) => z.preprocess((value) => {
  if (typeof value === "string") {
    if (value.toLowerCase() === "false") return false;
    if (value.toLowerCase() === "true") return true;
  }

  return value;
}, z.boolean()).default(defaultValue);

const revenueSignalConnectorFields = {
  includeCommerce: revenueSignalConnectorBooleanSchema(true),
  includeContent: revenueSignalConnectorBooleanSchema(true),
  includePayments: revenueSignalConnectorBooleanSchema(true),
  includeSamplePayloads: revenueSignalConnectorBooleanSchema(true),
  maxConnectors: z.coerce.number().int().min(1).max(100).default(18),
  onlyReady: revenueSignalConnectorBooleanSchema(false),
  windowDays: z.coerce.number().int().min(1).max(365).default(30)
};

export const revenueSignalConnectorQuerySchema = z.object(revenueSignalConnectorFields);

export const applyRevenueSignalConnectorSchema = z.object({
  ...revenueSignalConnectorFields,
  confirm: z.literal(revenueSignalConnectorConfirmation),
  dryRun: z.boolean().default(false),
  manifestIds: z.array(z.string().trim().min(1).max(220)).max(50).default([]),
  note: optionalTrimmedString(500)
});

const revenueSignalConnectorApprovalFields = {
  ...revenueSignalConnectorFields,
  includeArchived: revenueSignalConnectorBooleanSchema(false),
  maxRecords: z.coerce.number().int().min(1).max(100).default(50)
};

export const revenueSignalConnectorApprovalQuerySchema = z.object(revenueSignalConnectorApprovalFields);

export const applyRevenueSignalConnectorApprovalSchema = z.object({
  ...revenueSignalConnectorApprovalFields,
  confirm: z.literal(revenueSignalConnectorApprovalConfirmation),
  dryRun: z.boolean().default(false),
  manifestIds: z.array(z.string().trim().min(1).max(220)).max(50).default([]),
  note: optionalTrimmedString(500)
});

export const revenueSignalConnectorApprovalParamsSchema = z.object({
  approvalId: z.string().trim().min(1).max(160)
});

export const reviewRevenueSignalConnectorApprovalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  confirm: z.string().trim(),
  note: optionalTrimmedString(500)
}).superRefine((input, ctx) => {
  const expected = input.action === "approve" ? revenueSignalConnectorApproveConfirmation : revenueSignalConnectorRejectConfirmation;

  if (input.confirm !== expected) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Confirm with ${expected}.`,
      path: ["confirm"]
    });
  }
});

export const applyRevenueSignalImportJobSchema = z.object({
  ...revenueSignalConnectorApprovalFields,
  approvalIds: z.array(z.string().trim().min(1).max(160)).max(50).default([]),
  confirm: z.literal(revenueSignalImportJobConfirmation),
  dryRun: z.boolean().default(false),
  note: optionalTrimmedString(500)
});

const revenueSignalImportHandoffFields = {
  includeArchived: revenueSignalConnectorBooleanSchema(false),
  maxJobs: z.coerce.number().int().min(1).max(100).default(25),
  maxSignals: z.coerce.number().int().min(1).max(100).default(100),
  windowDays: z.coerce.number().int().min(1).max(365).default(30)
};

export const revenueSignalImportHandoffQuerySchema = z.object(revenueSignalImportHandoffFields);

export const applyRevenueSignalImportHandoffSchema = z.object({
  ...revenueSignalImportHandoffFields,
  confirm: z.literal(revenueSignalImportHandoffConfirmation),
  dryRun: z.boolean().default(false),
  importJobIds: z.array(z.string().trim().min(1).max(160)).max(100).default([]),
  note: optionalTrimmedString(500)
});

const portfolioCommandCenterFields = {
  includeCommandHistory: z.coerce.number().int().min(0).max(100).default(20),
  includeContent: z.preprocess((value) => value !== false && value !== "false", z.boolean()).default(true),
  includeFinance: z.preprocess((value) => value !== false && value !== "false", z.boolean()).default(true),
  maxActions: z.coerce.number().int().min(1).max(100).default(25),
  windowDays: z.coerce.number().int().min(1).max(365).default(30)
};

export const portfolioCommandCenterQuerySchema = z.object(portfolioCommandCenterFields);

export const applyPortfolioCommandCenterSchema = z.object({
  ...portfolioCommandCenterFields,
  confirm: z.literal(portfolioCommandCenterConfirmation),
  dryRun: z.boolean().default(false)
});

const revenueAutopilotFields = {
  includeContent: z.preprocess((value) => value !== false && value !== "false", z.boolean()).default(true),
  includeFinance: z.preprocess((value) => value !== false && value !== "false", z.boolean()).default(true),
  includeSignalIntake: z.preprocess((value) => value !== false && value !== "false", z.boolean()).default(true),
  maxActions: z.coerce.number().int().min(1).max(50).default(12),
  mode: z.enum(["balanced", "conservative", "velocity"]).default("balanced"),
  windowDays: z.coerce.number().int().min(1).max(365).default(30)
};

export const revenueAutopilotQuerySchema = z.object(revenueAutopilotFields);

export const applyRevenueAutopilotSchema = z.object({
  ...revenueAutopilotFields,
  confirm: z.literal(revenueAutopilotConfirmation),
  dryRun: z.boolean().default(false)
});

const revenueAutopilotExecutableActionSchema = z.enum([
  "run_first_business_launch",
  "run_first_cash_sprint",
  "seed_launch_products",
  "queue_launch_approval",
  "prepare_launch_package",
  "queue_digital_products",
  "apply_listing_optimization",
  "prepare_store_setup",
  "queue_content_briefs",
  "record_finance_split",
  "record_release_governance",
  "record_portfolio_commands"
]);

export const executeRevenueAutopilotSchema = z.object({
  ...revenueAutopilotFields,
  actions: z.array(revenueAutopilotExecutableActionSchema).max(10).optional(),
  confirm: z.literal(revenueAutopilotExecutionConfirmation),
  dryRun: z.boolean().default(false),
  includeAssetBatchActions: z.boolean().default(false),
  includeDraftCreation: z.boolean().default(false),
  includeLaunchApprovalPackets: z.boolean().default(false),
  maxSteps: z.coerce.number().int().min(1).max(10).default(6)
});

export const applyRevenueOpportunityFactorySchema = z.object({
  audience: optionalTrimmedString(500),
  brandStyle: optionalTrimmedString(500),
  businessName: optionalTrimmedString(140),
  clientName: optionalTrimmedString(120),
  confirm: z.literal(revenueOpportunityFactoryConfirmation),
  contactName: optionalTrimmedString(120),
  dryRun: z.boolean().default(false),
  email: emailSchema.optional(),
  idea: z.string().trim().min(10).max(2000),
  industry: optionalTrimmedString(120),
  podProvider: merchPodProviderSchema.default("Printify"),
  priceRange: z.object({
    max: moneyAmountSchema.default(64),
    min: moneyAmountSchema.default(18)
  }).default({ max: 64, min: 18 }).refine((range) => range.max >= range.min, "Maximum price must be greater than or equal to minimum price."),
  productCount: z.coerce.number().pipe(productBatchSizeSchema).default(5),
  productTypes: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  riskTolerance: productBatchRiskToleranceSchema.default("Low"),
  sourceKey: optionalTrimmedString(160),
  storePlatform: merchStorePlatformSchema.default("Etsy")
});

const revenueOpportunityControlFields = {
  includeKilled: z.coerce.boolean().default(false),
  maxOpportunities: z.coerce.number().int().min(1).max(100).default(50),
  minApprovedProducts: z.coerce.number().int().min(1).max(25).default(2),
  minListingReadyProducts: z.coerce.number().int().min(1).max(25).default(3),
  minProductDrafts: z.coerce.number().int().min(1).max(50).default(5),
  minReadinessForHandoff: z.coerce.number().int().min(1).max(100).default(70),
  windowDays: z.coerce.number().int().min(1).max(365).default(30)
};

export const revenueOpportunityControlQuerySchema = z.object(revenueOpportunityControlFields);

export const revenueOpportunityControlStatusSchema = z.enum([
  "active",
  "watch",
  "paused",
  "blocked",
  "killed",
  "ready_for_handoff"
]);

export const revenueOpportunityControlParamsSchema = z.object({
  opportunityId: z.string().trim().min(1).max(160)
});

export const applyRevenueOpportunityControlSchema = z.object({
  ...revenueOpportunityControlFields,
  confirm: z.literal(revenueOpportunityControlConfirmation),
  dryRun: z.boolean().default(false),
  note: optionalTrimmedString(500),
  overrideReadiness: z.boolean().default(false),
  status: revenueOpportunityControlStatusSchema
});

const queryBooleanSchema = (defaultValue: boolean) => z.preprocess((value) => {
  if (typeof value === "string") {
    if (value.toLowerCase() === "false") return false;
    if (value.toLowerCase() === "true") return true;
  }

  return value;
}, z.boolean()).default(defaultValue);

export const revenueLaunchReadinessQuerySchema = z.object({
  includeApprovalHistory: queryBooleanSchema(true),
  maxStores: z.coerce.number().int().min(1).max(50).default(12),
  minLaunchReadiness: z.coerce.number().int().min(1).max(100).default(70),
  minProviderReadiness: z.coerce.number().int().min(1).max(100).default(70)
});

export const revenueFirstCashReadinessQuerySchema = z.object({
  includeBlocked: queryBooleanSchema(true),
  maxCandidates: z.coerce.number().int().min(1).max(25).default(8),
  targetDaysToFirstCash: z.coerce.number().int().min(1).max(90).default(7)
});

const revenueFirstCashSprintFields = {
  includeBlocked: queryBooleanSchema(true),
  maxCandidates: z.coerce.number().int().min(1).max(25).default(8),
  maxSprintActions: z.coerce.number().int().min(1).max(25).default(5),
  targetDaysToFirstCash: z.coerce.number().int().min(1).max(90).default(7)
};

export const revenueFirstCashSprintQuerySchema = z.object(revenueFirstCashSprintFields);

export const applyRevenueFirstCashSprintSchema = z.object({
  ...revenueFirstCashSprintFields,
  confirm: z.literal(revenueFirstCashSprintConfirmation),
  dryRun: z.boolean().default(true),
  note: optionalTrimmedString(500),
  sprintActionIds: z.array(z.string().trim().min(1).max(220)).max(25).default([])
});

export const revenueFirstBusinessLaunchQuerySchema = z.object({
  maxCandidates: z.coerce.number().int().min(1).max(25).default(8)
});

export const applyRevenueFirstBusinessLaunchSchema = z.object({
  confirm: z.literal(revenueFirstBusinessLaunchConfirmation),
  dryRun: z.boolean().default(true),
  maxCandidates: z.coerce.number().int().min(1).max(25).default(8),
  note: optionalTrimmedString(500),
  sprintActionIds: z.array(z.string().trim().min(1).max(220)).max(25).default([])
});

export const revenueLaunchChecklistQuerySchema = z.object({
  includeCompleted: queryBooleanSchema(true),
  maxItems: z.coerce.number().int().min(1).max(100).default(25),
  minPriorityScore: z.coerce.number().int().min(0).max(100).default(0),
  windowDays: z.coerce.number().int().min(1).max(365).default(30)
});

const revenueLaunchChecklistActionBridgeFields = {
  includeCompleted: queryBooleanSchema(true),
  maxActions: z.coerce.number().int().min(1).max(25).default(5),
  maxItems: z.coerce.number().int().min(1).max(100).default(25),
  minPriorityScore: z.coerce.number().int().min(0).max(100).default(0),
  windowDays: z.coerce.number().int().min(1).max(365).default(30)
};

export const revenueLaunchChecklistActionBridgeQuerySchema = z.object(revenueLaunchChecklistActionBridgeFields);

export const applyRevenueLaunchChecklistActionBridgeSchema = z.object({
  ...revenueLaunchChecklistActionBridgeFields,
  actionIds: z.array(z.string().trim().min(1).max(220)).max(25).default([]),
  confirm: z.literal(revenueLaunchChecklistActionBridgeConfirmation),
  dryRun: z.boolean().default(true),
  note: optionalTrimmedString(500)
});

export const applyRevenueLaunchSprintSchema = z.object({
  ...revenueLaunchChecklistActionBridgeFields,
  audience: optionalTrimmedString(500),
  brandStyle: optionalTrimmedString(500),
  businessName: optionalTrimmedString(140),
  clientName: optionalTrimmedString(120),
  confirm: z.literal(revenueLaunchSprintConfirmation),
  contactName: optionalTrimmedString(120),
  dryRun: z.boolean().default(true),
  email: emailSchema.optional(),
  idea: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().min(10).max(2000).optional()
  ),
  industry: optionalTrimmedString(120),
  maxCycles: z.coerce.number().int().min(1).max(8).default(4),
  note: optionalTrimmedString(500),
  podProvider: merchPodProviderSchema.default("Printify"),
  priceRange: z.object({
    max: moneyAmountSchema.default(64),
    min: moneyAmountSchema.default(18)
  }).default({ max: 64, min: 18 }).refine((range) => range.max >= range.min, "Maximum price must be greater than or equal to minimum price."),
  productCount: z.coerce.number().pipe(productBatchSizeSchema).default(5),
  productTypes: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  riskTolerance: productBatchRiskToleranceSchema.default("Low"),
  sourceKey: optionalTrimmedString(160),
  storePlatform: merchStorePlatformSchema.default("Etsy")
});

const revenueLaunchHandoffFields = {
  includeBlocked: queryBooleanSchema(true),
  maxBundles: z.coerce.number().int().min(1).max(50).default(10),
  minConnectorReadiness: z.coerce.number().int().min(1).max(100).default(70),
  minLaunchReadiness: z.coerce.number().int().min(1).max(100).default(70),
  minProviderReadiness: z.coerce.number().int().min(1).max(100).default(70)
};

export const revenueLaunchHandoffQuerySchema = z.object(revenueLaunchHandoffFields);

export const applyRevenueLaunchHandoffSchema = z.object({
  ...revenueLaunchHandoffFields,
  confirm: z.literal(revenueLaunchHandoffConfirmation),
  dryRun: z.boolean().default(false)
});

const revenueLaunchOperationsPackFields = {
  includeBlocked: queryBooleanSchema(true),
  maxPacks: z.coerce.number().int().min(1).max(100).default(10),
  minConnectorReadiness: z.coerce.number().int().min(1).max(100).default(70),
  minLaunchReadiness: z.coerce.number().int().min(1).max(100).default(70),
  minProviderReadiness: z.coerce.number().int().min(1).max(100).default(70)
};

export const revenueLaunchOperationsPackQuerySchema = z.object(revenueLaunchOperationsPackFields);

export const applyRevenueLaunchOperationsPackSchema = z.object({
  ...revenueLaunchOperationsPackFields,
  confirm: z.literal(revenueLaunchOperationsPackConfirmation),
  dryRun: z.boolean().default(true),
  note: optionalTrimmedString(500),
  storeIds: z.array(z.string().trim().min(1).max(160)).max(50).default([])
});

const revenueLaunchClosureLedgerFields = {
  expectedOrderValue: moneyAmountSchema.default(32),
  includeBlocked: queryBooleanSchema(true),
  maxEntries: z.coerce.number().int().min(1).max(100).default(10),
  minClosureScore: z.coerce.number().int().min(1).max(100).default(72),
  monitoringWindowDays: z.coerce.number().int().min(1).max(30).default(7),
  targetFirstWeekRevenue: moneyAmountSchema.default(250)
};

export const revenueLaunchClosureLedgerQuerySchema = z.object(revenueLaunchClosureLedgerFields);

export const applyRevenueLaunchClosureLedgerSchema = z.object({
  ...revenueLaunchClosureLedgerFields,
  confirm: z.literal(revenueLaunchClosureLedgerConfirmation),
  dryRun: z.boolean().default(true),
  note: optionalTrimmedString(500),
  storeIds: z.array(z.string().trim().min(1).max(160)).max(50).default([])
});

const revenueLiveConnectorReadinessFields = {
  includeBlocked: queryBooleanSchema(true),
  maxEntries: z.coerce.number().int().min(1).max(100).default(10),
  minClosureScore: z.coerce.number().int().min(1).max(100).default(76),
  minReadOnlyConnectors: z.coerce.number().int().min(0).max(10).default(1),
  requireOperationsPackAudit: queryBooleanSchema(true),
  requirePerformanceEvidence: queryBooleanSchema(true)
};

export const revenueLiveConnectorReadinessQuerySchema = z.object(revenueLiveConnectorReadinessFields);

export const applyRevenueLiveConnectorReadinessSchema = z.object({
  ...revenueLiveConnectorReadinessFields,
  confirm: z.literal(revenueLiveConnectorReadinessRegistryConfirmation),
  dryRun: z.boolean().default(true),
  note: optionalTrimmedString(500),
  storeIds: z.array(z.string().trim().min(1).max(160)).max(100).default([])
});

const revenueLiveConnectorDesignDossierFields = {
  includeBlocked: queryBooleanSchema(true),
  includeCredentialCustody: queryBooleanSchema(true),
  includeRollbackRehearsal: queryBooleanSchema(true),
  maxDossiers: z.coerce.number().int().min(1).max(50).default(10),
  minReadinessScore: z.coerce.number().int().min(1).max(100).default(80),
  requireAllBoundariesMapped: queryBooleanSchema(false),
  requireApprovedReadOnlyEvidence: queryBooleanSchema(true)
};

export const revenueLiveConnectorDesignDossierQuerySchema = z.object(revenueLiveConnectorDesignDossierFields);

export const applyRevenueLiveConnectorDesignDossierSchema = z.object({
  ...revenueLiveConnectorDesignDossierFields,
  confirm: z.literal(revenueLiveConnectorDesignDossierConfirmation),
  dryRun: z.boolean().default(true),
  note: optionalTrimmedString(500),
  storeIds: z.array(z.string().trim().min(1).max(160)).max(50).default([])
});

export const revenueLaunchHandoffControlStatusSchema = z.enum([
  "queued_review",
  "ready_for_manual_handoff",
  "blocked_review",
  "archived"
]);

export const revenueLaunchHandoffControlQuerySchema = z.object({
  includeArchived: queryBooleanSchema(false),
  maxPackets: z.coerce.number().int().min(1).max(100).default(25),
  minConnectorReadiness: z.coerce.number().int().min(1).max(100).default(70)
});

export const revenueLaunchHandoffControlParamsSchema = z.object({
  packetId: z.string().trim().min(1).max(160)
});

export const applyRevenueLaunchHandoffControlSchema = z.object({
  confirm: z.literal(revenueLaunchHandoffControlConfirmation),
  dryRun: z.boolean().default(false),
  includeArchived: queryBooleanSchema(false),
  maxPackets: z.coerce.number().int().min(1).max(100).default(25),
  minConnectorReadiness: z.coerce.number().int().min(1).max(100).default(70),
  note: optionalTrimmedString(500),
  overrideReadiness: z.boolean().default(false),
  status: revenueLaunchHandoffControlStatusSchema
});

export const merchReportParamsSchema = z.object({
  reportType: merchReportTypeSchema,
  storeId: z.string().cuid()
});

export const requestGrowthApprovalSchema = z.object({
  note: optionalTrimmedString(500),
  scheduledFor: z.string().datetime().optional()
});

export const growthApprovalPacketParamsSchema = z.object({
  packetId: z.string().cuid(),
  storeId: z.string().cuid()
});

export const reviewGrowthApprovalSchema = z.object({
  note: optionalTrimmedString(500)
});

export const conversationIdParamsSchema = z.object({
  conversationId: z.string().cuid()
});

export const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(80).optional()
});

export const importConversationsSchema = z.object({
  conversations: z.array(z.object({
    title: z.string().trim().min(1).max(80).optional(),
    messages: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().trim().min(1).max(4000)
    })).max(100).optional()
  })).min(1).max(25)
});

export const chatMessageSchema = z.object({
  conversationId: z.preprocess((value) => value === null ? undefined : value, z.string().cuid().optional()),
  message: z.string()
    .trim()
    .min(1)
    .max(4000)
    .refine((value) => !/<\/?script[\s>]/i.test(value), "Messages cannot include script tags.")
});

export const screenInsightSchema = z.object({
  conversationId: z.preprocess((value) => value === null ? undefined : value, z.string().cuid().optional()),
  message: z.string()
    .trim()
    .min(1)
    .max(1000)
    .refine((value) => !/<\/?script[\s>]/i.test(value), "Messages cannot include script tags."),
  prompt: z.string().trim().min(1).max(1000).optional(),
  screenshot: z.string()
    .max(3_000_000)
    .regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Screenshot must be a base64 image data URL.")
});

export const commandOSNodeTypeSchema = z.enum(["emperor", "marshal", "general", "commander", "soldier"]);
export const commandOSStatusSchema = z.enum(["idle", "working", "thinking", "waiting", "error", "offline"]);
export const commandOSTaskStatusSchema = z.enum(["pending", "assigned", "running", "completed", "failed"]);

const commandOSMemorySchema = z.object({
  instructions: z.string().max(5000),
  notes: z.array(z.string().max(2000)).max(100),
  recentTasks: z.array(z.string().max(500)).max(100),
  role: z.string().max(500),
  taskResults: z.array(z.string().max(2000)).max(100)
}).passthrough();

export const commandOSReportRecordSchema = z.object({
  analysis: z.string().max(10_000),
  commanderId: z.string().max(160).nullable().optional(),
  createdAt: z.string().datetime(),
  destinationEntityId: z.string().min(1).max(160),
  destinationEntityType: commandOSNodeTypeSchema,
  generalId: z.string().max(160).nullable().optional(),
  id: z.string().min(1).max(180),
  marshalId: z.string().max(160).nullable().optional(),
  nextActions: z.array(z.string().max(1000)).max(20),
  recommendation: z.string().max(10_000),
  situation: z.string().max(10_000),
  soldierId: z.string().max(160).nullable().optional(),
  sourceEntityId: z.string().min(1).max(160),
  sourceEntityType: commandOSNodeTypeSchema
}).passthrough();

const commandOSNodeSchema = z.object({
  children: z.array(z.string().max(160)).max(500).optional(),
  commandType: commandOSNodeTypeSchema,
  currentTask: z.string().max(500).nullable(),
  groupId: z.string().min(1).max(160),
  id: z.string().min(1).max(160),
  logs: z.array(z.string().max(2000)).max(200),
  memory: commandOSMemorySchema,
  name: z.string().min(1).max(200),
  parentId: z.string().max(160).nullable(),
  reportHistory: z.array(commandOSReportRecordSchema).max(50).optional(),
  reports: z.array(commandOSReportRecordSchema).max(50).optional(),
  status: commandOSStatusSchema,
  taskHistory: z.array(z.string().max(500)).max(200),
  type: z.enum(["core", "agent"])
}).passthrough();

const commandOSGroupSchema = z.object({
  collapsed: z.boolean().optional(),
  color: z.string().max(40),
  id: z.string().min(1).max(160),
  name: z.string().min(1).max(200)
}).passthrough();

const commandOSEdgeSchema = z.object({
  id: z.string().min(1).max(220),
  label: z.string().max(200),
  source: z.string().min(1).max(160),
  target: z.string().min(1).max(160)
}).passthrough();

const commandOSTaskSchema = z.object({
  assignedEntityId: z.string().max(160).nullable(),
  assignedEntityType: commandOSNodeTypeSchema.nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  commanderId: z.string().max(160).nullable().optional(),
  commanderName: z.string().max(200).nullable().optional(),
  createdAt: z.string().datetime(),
  delegationPath: z.array(z.string().max(160)).max(20),
  description: z.string().max(5000),
  generalId: z.string().max(160).nullable().optional(),
  generalName: z.string().max(200).nullable().optional(),
  history: z.array(z.string().max(2000)).max(200),
  id: z.string().min(1).max(180),
  marshalId: z.string().max(160).nullable().optional(),
  marshalName: z.string().max(200).nullable().optional(),
  name: z.string().min(1).max(240),
  reportHistory: z.array(commandOSReportRecordSchema).max(50).optional(),
  soldierId: z.string().max(160).nullable().optional(),
  soldierName: z.string().max(200).nullable().optional(),
  status: commandOSTaskStatusSchema,
  updatedAt: z.string().datetime()
}).passthrough();

export const commandOSStateSchema = z.object({
  edges: z.array(commandOSEdgeSchema).max(2500),
  groups: z.array(commandOSGroupSchema).max(500),
  nodes: z.array(commandOSNodeSchema).min(1).max(1000),
  tasks: z.array(commandOSTaskSchema).max(2500)
}).passthrough();

export const commandOSSnapshotSchema = z.object({
  source: z.enum(["dashboard", "import", "repair"]).default("dashboard"),
  state: commandOSStateSchema
}).superRefine((input, context) => {
  const size = JSON.stringify(input.state).length;

  if (size > 2_000_000) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Command OS state is too large to persist safely."
    });
  }
});

export const automationJobTypeSchema = z.enum(["scrape"]);
export const automationJobStatusSchema = z.enum(["pending", "scheduled", "running", "completed", "failed", "canceled"]);
export const browserOperationsRecoveryConfirmation = "APPLY INTERNAL BROWSER RECOVERY ACTIONS";

export const scrapePayloadSchema = z.object({
  url: z.string().trim().url(),
  selector: z.string().trim().min(1).max(200).optional()
});

export const createAutomationJobSchema = z.object({
  type: automationJobTypeSchema,
  payload: scrapePayloadSchema,
  scheduledAt: z.string().datetime().optional()
});

export const automationJobIdParamsSchema = z.object({
  jobId: z.string().cuid()
});

const browserOperationsFields = {
  includeCompleted: z.preprocess((value) => value === true || value === "true", z.boolean()).default(false),
  maxRecoveryJobs: z.coerce.number().int().min(1).max(50).default(10),
  staleRunningMinutes: z.coerce.number().int().min(1).max(1440).default(30),
  windowHours: z.coerce.number().int().min(1).max(720).default(24)
};

export const browserOperationsQuerySchema = z.object(browserOperationsFields);

export const applyBrowserOperationsRecoverySchema = z.object({
  ...browserOperationsFields,
  confirm: z.literal(browserOperationsRecoveryConfirmation),
  dryRun: z.boolean().default(false)
});

export const agentStatusSchema = z.enum(["idle", "busy", "paused", "error"]);
export const agentTaskStatusSchema = z.enum(["queued", "running", "completed", "failed", "canceled"]);
export const agentActionSchema = z.enum([
  "research",
  "internet_research",
  "governed_deep_research",
  "business_discovery",
  "commerce_operations",
  "app_build",
  "brand_operations",
  "browser_automation",
  "external_tool_call",
  "sales_outreach",
  "automation_review",
  "chat_summary",
  "general"
]);
export const agentPayloadSourceSchema = z.enum(["chat", "automation", "manual", "schedule"]);

export const createAgentSchema = z.object({
  name: z.string().trim().min(2).max(80),
  role: z.string().trim().min(2).max(120),
  capabilities: z.array(z.string().trim().min(1).max(60)).min(1).max(8).default(["general"]),
  runInBackground: z.boolean().default(true),
  webhookUrl: z.string().trim().url().optional()
});

export const agentIdParamsSchema = z.object({
  agentId: z.string().cuid()
});

export const assignAgentTaskSchema = z.object({
  title: z.string().trim().min(2).max(140),
  action: agentActionSchema.default("general"),
  payload: z.object({
    instructions: z.string().trim().min(1).max(4000),
    context: z.string().trim().max(4000).optional(),
    sourceType: agentPayloadSourceSchema.default("manual"),
    sourceId: z.string().trim().max(120).optional(),
    webhookUrl: z.string().trim().url().optional()
  })
});

export const updateAgentBackgroundSchema = z.object({
  runInBackground: z.boolean()
});

export const createAgentScheduleSchema = z.object({
  title: z.string().trim().min(2).max(140),
  action: agentActionSchema.default("general"),
  payload: z.object({
    instructions: z.string().trim().min(1).max(4000),
    context: z.string().trim().max(4000).optional(),
    sourceType: agentPayloadSourceSchema.default("schedule"),
    sourceId: z.string().trim().max(120).optional(),
    webhookUrl: z.string().trim().url().optional()
  }),
  intervalMinutes: z.coerce.number().int().min(1).max(10080),
  runImmediately: z.boolean().default(true)
});

export const agentScheduleIdParamsSchema = z.object({
  agentId: z.string().cuid(),
  scheduleId: z.string().cuid()
});

export const agentTaskIdParamsSchema = z.object({
  agentId: z.string().cuid(),
  taskId: z.string().cuid()
});

export const policyRuleSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("blocked_keywords"),
    keywords: z.array(z.string().trim().min(1).max(80)).min(1).max(30)
  }),
  z.object({
    kind: z.literal("blocked_domains"),
    domains: z.array(z.string().trim().min(1).max(160)).min(1).max(30)
  }),
  z.object({
    kind: z.literal("agent_quota"),
    maxTasks: z.coerce.number().int().min(1).max(500),
    windowMinutes: z.coerce.number().int().min(1).max(1440)
  }),
  z.object({
    kind: z.literal("manual_approval_required"),
    actions: z.array(agentActionSchema).min(1).max(8)
  })
]);

export const policySeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export const policyEffectSchema = z.enum(["block", "warn"]);

export const createPolicySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  enabled: z.boolean().default(true),
  effect: policyEffectSchema.default("block"),
  severity: policySeveritySchema.default("medium"),
  rule: policyRuleSchema
});

export const updatePolicySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  enabled: z.boolean().optional(),
  effect: policyEffectSchema.optional(),
  severity: policySeveritySchema.optional(),
  rule: policyRuleSchema.optional()
});

export const policyIdParamsSchema = z.object({
  policyId: z.string().cuid()
});

export const auditLogListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
});

export const adminAgentTaskParamsSchema = z.object({
  taskId: z.string().cuid()
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ConfirmPasswordResetInput = z.infer<typeof confirmPasswordResetSchema>;
export type RequestEmailVerificationInput = z.infer<typeof requestEmailVerificationSchema>;
export type ConfirmEmailVerificationInput = z.infer<typeof confirmEmailVerificationSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type CreateClientMerchStoreInput = z.infer<typeof createClientMerchStoreSchema>;
export type UpdateClientMerchStoreInput = z.infer<typeof updateClientMerchStoreSchema>;
export type CreatePodProductInput = z.infer<typeof createPodProductSchema>;
export type UpdatePodProductInput = z.infer<typeof updatePodProductSchema>;
export type GenerateProductBatchInput = z.infer<typeof generateProductBatchSchema>;
export type ComplianceCheckInput = z.infer<typeof complianceCheckSchema>;
export type PricingCalculatorInput = z.infer<typeof pricingCalculatorSchema>;
export type ProviderPayloadQueryInput = z.infer<typeof providerPayloadQuerySchema>;
export type RequestProviderPayloadApprovalInput = z.infer<typeof requestProviderPayloadApprovalSchema>;
export type RequestGrowthApprovalInput = z.infer<typeof requestGrowthApprovalSchema>;
export type ReviewGrowthApprovalInput = z.infer<typeof reviewGrowthApprovalSchema>;
export type RevenueEngineQueryInput = z.infer<typeof revenueEngineQuerySchema>;
export type RevenueBusinessFleetSchedulerQueryInput = z.infer<typeof revenueBusinessFleetSchedulerQuerySchema>;
export type RevenueHundredStoreOperationsQueryInput = z.infer<typeof revenueHundredStoreOperationsQuerySchema>;
export type ApplyRevenueHundredStoreOperationsInput = z.infer<typeof applyRevenueHundredStoreOperationsSchema>;
export type ApplyRevenueHundredStoreAppConnectionPacketsInput = z.infer<typeof applyRevenueHundredStoreAppConnectionPacketsSchema>;
export type ApplyRevenueHundredStoreConnectorActivationInput = z.infer<typeof applyRevenueHundredStoreConnectorActivationSchema>;
export type ApplyRevenueHundredStoreMonitoringCycleInput = z.infer<typeof applyRevenueHundredStoreMonitoringCycleSchema>;
export type ApplyRevenueHundredStoreDailySupervisorInput = z.infer<typeof applyRevenueHundredStoreDailySupervisorSchema>;
export type ApplyRevenueHundredStoreProductDepthInput = z.infer<typeof applyRevenueHundredStoreProductDepthSchema>;
export type ApplyRevenueHundredStoreLaunchPacketsInput = z.infer<typeof applyRevenueHundredStoreLaunchPacketsSchema>;
export type ApplyRevenueHundredStoreAutonomyRunInput = z.infer<typeof applyRevenueHundredStoreAutonomyRunSchema>;
export type ApplyRevenueHundredStoreWorkLeasesInput = z.infer<typeof applyRevenueHundredStoreWorkLeasesSchema>;
export type ApplyRevenueHundredStoreWorkerAssignmentsInput = z.infer<typeof applyRevenueHundredStoreWorkerAssignmentsSchema>;
export type ApplyRevenueBusinessFleetLaunchWaveInput = z.infer<typeof applyRevenueBusinessFleetLaunchWaveSchema>;
export type ApplyRevenueBusinessFleetSeedGapInput = z.infer<typeof applyRevenueBusinessFleetSeedGapSchema>;
export type ApplyRevenueBusinessFleetGapAccelerationInput = z.infer<typeof applyRevenueBusinessFleetGapAccelerationSchema>;
export type ApplyRevenueBusinessFleetLiveLaunchPackageInput = z.infer<typeof applyRevenueBusinessFleetLiveLaunchPackageSchema>;
export type RevenueBusinessFleetLaunchGateQueryInput = z.infer<typeof revenueBusinessFleetLaunchGateQuerySchema>;
export type RevenueBusinessFleetProviderApprovalReviewQueryInput = z.infer<typeof revenueBusinessFleetProviderApprovalReviewQuerySchema>;
export type ApplyRevenueBusinessFleetProviderApprovalReviewInput = z.infer<typeof applyRevenueBusinessFleetProviderApprovalReviewSchema>;
export type RevenueMoneyArmyBatchPipelineQueryInput = z.infer<typeof revenueMoneyArmyBatchPipelineQuerySchema>;
export type ApplyRevenueMoneyArmyBatchPipelineInput = z.infer<typeof applyRevenueMoneyArmyBatchPipelineSchema>;
export type RevenueMoneyArmyGenerateScoreBatchQueryInput = z.infer<typeof revenueMoneyArmyGenerateScoreBatchQuerySchema>;
export type ApplyRevenueMoneyArmyGenerateScoreBatchInput = z.infer<typeof applyRevenueMoneyArmyGenerateScoreBatchSchema>;
export type RevenueFirstBusinessLaunchPackageQueryInput = z.infer<typeof revenueFirstBusinessLaunchPackageQuerySchema>;
export type ApplyRevenueFirstBusinessLaunchPackageInput = z.infer<typeof applyRevenueFirstBusinessLaunchPackageSchema>;
export type ApplyRevenueFirstStorePrepareInput = z.infer<typeof applyRevenueFirstStorePrepareSchema>;
export type ApplyRevenueFirstBusinessInternalLaunchInput = z.infer<typeof applyRevenueFirstBusinessInternalLaunchSchema>;
export type ApplyRevenueFirstBusinessExecuteInput = z.infer<typeof applyRevenueFirstBusinessExecuteSchema>;
export type ApplyRevenueFirstBusinessAutonomousLaunchInput = z.infer<typeof applyRevenueFirstBusinessAutonomousLaunchSchema>;
export type ApplyRevenueFirstBusinessLiveExecutorInput = z.infer<typeof applyRevenueFirstBusinessLiveExecutorSchema>;
export type ApplyRevenueOwnerManualLaunchApprovalInput = z.infer<typeof applyRevenueOwnerManualLaunchApprovalSchema>;
export type ApplyRevenueFirstStoreManualLaunchEvidenceInput = z.infer<typeof applyRevenueFirstStoreManualLaunchEvidenceSchema>;
export type ApplyRevenueFirstStoreManualSignalCaptureInput = z.infer<typeof applyRevenueFirstStoreManualSignalCaptureSchema>;
export type ApplyRevenueWinnerClonePacketApprovalInput = z.infer<typeof applyRevenueWinnerClonePacketApprovalSchema>;
export type RevenueAssetControlLedgerQueryInput = z.infer<typeof revenueAssetControlLedgerQuerySchema>;
export type RevenueAssetControlRecoveryQueryInput = z.infer<typeof revenueAssetControlRecoveryQuerySchema>;
export type RevenueAssetReviewQueueQueryInput = z.infer<typeof revenueAssetReviewQueueQuerySchema>;
export type ApplyRevenueRotationInput = z.infer<typeof applyRevenueRotationSchema>;
export type ApplyRevenueAssetActionInput = z.infer<typeof applyRevenueAssetActionSchema>;
export type ApplyRevenueAssetBatchActionInput = z.infer<typeof applyRevenueAssetBatchActionSchema>;
export type RevenueLaunchPipelineQueryInput = z.infer<typeof revenueLaunchPipelineQuerySchema>;
export type ApplyRevenueLaunchPipelineInput = z.infer<typeof applyRevenueLaunchPipelineSchema>;
export type RevenueDigitalProductQueryInput = z.infer<typeof revenueDigitalProductQuerySchema>;
export type ApplyRevenueDigitalProductInput = z.infer<typeof applyRevenueDigitalProductSchema>;
export type RevenuePerformanceQueryInput = z.infer<typeof revenuePerformanceQuerySchema>;
export type RevenuePerformanceSnapshotInput = z.infer<typeof revenuePerformanceSnapshotSchema>;
export type IngestRevenuePerformanceInput = z.infer<typeof ingestRevenuePerformanceSchema>;
export type ApplyRevenuePerformanceRotationInput = z.infer<typeof applyRevenuePerformanceRotationSchema>;
export type RevenueListingOptimizationQueryInput = z.infer<typeof revenueListingOptimizationQuerySchema>;
export type ApplyRevenueListingOptimizationInput = z.infer<typeof applyRevenueListingOptimizationSchema>;
export type RevenueStoreSetupQueryInput = z.infer<typeof revenueStoreSetupQuerySchema>;
export type ApplyRevenueStoreSetupInput = z.infer<typeof applyRevenueStoreSetupSchema>;
export type FinancialOrchestratorQueryInput = z.infer<typeof financialOrchestratorQuerySchema>;
export type ApplyFinancialOrchestratorInput = z.infer<typeof applyFinancialOrchestratorSchema>;
export type FinancialPayoutIntentParamsInput = z.infer<typeof financialPayoutIntentParamsSchema>;
export type FinancialScalingBudgetPacketParamsInput = z.infer<typeof financialScalingBudgetPacketParamsSchema>;
export type ReviewFinancialPayoutIntentInput = z.infer<typeof reviewFinancialPayoutIntentSchema>;
export type ReviewFinancialScalingBudgetPacketInput = z.infer<typeof reviewFinancialScalingBudgetPacketSchema>;
export type ApplyFinancialReleaseGovernanceInput = z.infer<typeof applyFinancialReleaseGovernanceSchema>;
export type ApplyFinancialScalingSpendControlInput = z.infer<typeof applyFinancialScalingSpendControlSchema>;
export type FinancialScalingExecutionEntryInput = z.infer<typeof financialScalingExecutionEntrySchema>;
export type IngestFinancialScalingExecutionLedgerInput = z.infer<typeof ingestFinancialScalingExecutionLedgerSchema>;
export type FacelessContentPipelineQueryInput = z.infer<typeof facelessContentPipelineQuerySchema>;
export type ApplyFacelessContentPipelineInput = z.infer<typeof applyFacelessContentPipelineSchema>;
export type FacelessContentPerformanceQueryInput = z.infer<typeof facelessContentPerformanceQuerySchema>;
export type FacelessContentPerformanceSnapshotInput = z.infer<typeof facelessContentPerformanceSnapshotSchema>;
export type IngestFacelessContentPerformanceInput = z.infer<typeof ingestFacelessContentPerformanceSchema>;
export type SignalIntakeQueryInput = z.infer<typeof signalIntakeQuerySchema>;
export type SignalIntakeCommerceSignalInput = z.infer<typeof signalIntakeCommerceSignalSchema>;
export type SignalIntakeContentSignalInput = z.infer<typeof signalIntakeContentSignalSchema>;
export type SignalIntakePaymentSignalInput = z.infer<typeof signalIntakePaymentSignalSchema>;
export type ApplySignalIntakeInput = z.infer<typeof applySignalIntakeSchema>;
export type RevenueSignalConnectorQueryInput = z.infer<typeof revenueSignalConnectorQuerySchema>;
export type ApplyRevenueSignalConnectorInput = z.infer<typeof applyRevenueSignalConnectorSchema>;
export type RevenueSignalConnectorApprovalQueryInput = z.infer<typeof revenueSignalConnectorApprovalQuerySchema>;
export type ApplyRevenueSignalConnectorApprovalInput = z.infer<typeof applyRevenueSignalConnectorApprovalSchema>;
export type RevenueSignalConnectorApprovalParamsInput = z.infer<typeof revenueSignalConnectorApprovalParamsSchema>;
export type ReviewRevenueSignalConnectorApprovalInput = z.infer<typeof reviewRevenueSignalConnectorApprovalSchema>;
export type ApplyRevenueSignalImportJobInput = z.infer<typeof applyRevenueSignalImportJobSchema>;
export type RevenueSignalImportHandoffQueryInput = z.infer<typeof revenueSignalImportHandoffQuerySchema>;
export type ApplyRevenueSignalImportHandoffInput = z.infer<typeof applyRevenueSignalImportHandoffSchema>;
export type PortfolioCommandCenterQueryInput = z.infer<typeof portfolioCommandCenterQuerySchema>;
export type ApplyPortfolioCommandCenterInput = z.infer<typeof applyPortfolioCommandCenterSchema>;
export type RevenueAutopilotQueryInput = z.infer<typeof revenueAutopilotQuerySchema>;
export type ApplyRevenueAutopilotInput = z.infer<typeof applyRevenueAutopilotSchema>;
export type ExecuteRevenueAutopilotInput = z.infer<typeof executeRevenueAutopilotSchema>;
export type ApplyRevenueOpportunityFactoryInput = z.infer<typeof applyRevenueOpportunityFactorySchema>;
export type RevenueOpportunityControlQueryInput = z.infer<typeof revenueOpportunityControlQuerySchema>;
export type RevenueOpportunityControlParamsInput = z.infer<typeof revenueOpportunityControlParamsSchema>;
export type ApplyRevenueOpportunityControlInput = z.infer<typeof applyRevenueOpportunityControlSchema>;
export type RevenueLaunchHandoffQueryInput = z.infer<typeof revenueLaunchHandoffQuerySchema>;
export type ApplyRevenueLaunchHandoffInput = z.infer<typeof applyRevenueLaunchHandoffSchema>;
export type RevenueLaunchHandoffControlQueryInput = z.infer<typeof revenueLaunchHandoffControlQuerySchema>;
export type RevenueLaunchHandoffControlParamsInput = z.infer<typeof revenueLaunchHandoffControlParamsSchema>;
export type ApplyRevenueLaunchHandoffControlInput = z.infer<typeof applyRevenueLaunchHandoffControlSchema>;
export type RevenueLaunchOperationsPackQueryInput = z.infer<typeof revenueLaunchOperationsPackQuerySchema>;
export type ApplyRevenueLaunchOperationsPackInput = z.infer<typeof applyRevenueLaunchOperationsPackSchema>;
export type RevenueLaunchClosureLedgerQueryInput = z.infer<typeof revenueLaunchClosureLedgerQuerySchema>;
export type ApplyRevenueLaunchClosureLedgerInput = z.infer<typeof applyRevenueLaunchClosureLedgerSchema>;
export type RevenueLiveConnectorReadinessQueryInput = z.infer<typeof revenueLiveConnectorReadinessQuerySchema>;
export type ApplyRevenueLiveConnectorReadinessInput = z.infer<typeof applyRevenueLiveConnectorReadinessSchema>;
export type RevenueLiveConnectorDesignDossierQueryInput = z.infer<typeof revenueLiveConnectorDesignDossierQuerySchema>;
export type ApplyRevenueLiveConnectorDesignDossierInput = z.infer<typeof applyRevenueLiveConnectorDesignDossierSchema>;
export type RevenueFirstCashReadinessQueryInput = z.infer<typeof revenueFirstCashReadinessQuerySchema>;
export type RevenueFirstCashSprintQueryInput = z.infer<typeof revenueFirstCashSprintQuerySchema>;
export type ApplyRevenueFirstCashSprintInput = z.infer<typeof applyRevenueFirstCashSprintSchema>;
export type RevenueFirstBusinessLaunchQueryInput = z.infer<typeof revenueFirstBusinessLaunchQuerySchema>;
export type ApplyRevenueFirstBusinessLaunchInput = z.infer<typeof applyRevenueFirstBusinessLaunchSchema>;
export type RevenueLaunchReadinessQueryInput = z.infer<typeof revenueLaunchReadinessQuerySchema>;
export type RevenueLaunchChecklistQueryInput = z.infer<typeof revenueLaunchChecklistQuerySchema>;
export type RevenueLaunchChecklistActionBridgeQueryInput = z.infer<typeof revenueLaunchChecklistActionBridgeQuerySchema>;
export type ApplyRevenueLaunchChecklistActionBridgeInput = z.infer<typeof applyRevenueLaunchChecklistActionBridgeSchema>;
export type ApplyRevenueLaunchSprintInput = z.infer<typeof applyRevenueLaunchSprintSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ScreenInsightInput = z.infer<typeof screenInsightSchema>;
export type CommandOSSnapshotInput = z.infer<typeof commandOSSnapshotSchema>;
export type CommandOSReportRecordInput = z.infer<typeof commandOSReportRecordSchema>;
export type ImportConversationsInput = z.infer<typeof importConversationsSchema>;
export type CreateAutomationJobInput = z.infer<typeof createAutomationJobSchema>;
export type ScrapePayload = z.infer<typeof scrapePayloadSchema>;
export type BrowserOperationsQueryInput = z.infer<typeof browserOperationsQuerySchema>;
export type ApplyBrowserOperationsRecoveryInput = z.infer<typeof applyBrowserOperationsRecoverySchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type AssignAgentTaskInput = z.infer<typeof assignAgentTaskSchema>;
export type UpdateAgentBackgroundInput = z.infer<typeof updateAgentBackgroundSchema>;
export type CreateAgentScheduleInput = z.infer<typeof createAgentScheduleSchema>;
export type PolicyRule = z.infer<typeof policyRuleSchema>;
export type CreatePolicyInput = z.infer<typeof createPolicySchema>;
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;
