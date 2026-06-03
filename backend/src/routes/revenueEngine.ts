import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import {
  applyFinancialOrchestratorSchema,
  applyRevenueAssetActionSchema,
  applyRevenueAssetBatchActionSchema,
  applyRevenueBusinessFleetGapAccelerationSchema,
  applyRevenueBusinessFleetLiveLaunchPackageSchema,
  applyRevenueBusinessFleetProviderApprovalReviewSchema,
  applyRevenueBusinessFleetSeedGapSchema,
  applyRevenueBusinessFleetLaunchWaveSchema,
  applyRevenueMoneyArmyBatchPipelineSchema,
  applyRevenueDigitalProductSchema,
  applyRevenueListingOptimizationSchema,
  applyRevenueLaunchPipelineSchema,
  applyRevenueAutopilotSchema,
  applyRevenueLaunchHandoffSchema,
  applyRevenueLaunchHandoffControlSchema,
  applyPortfolioCommandCenterSchema,
  applyRevenuePerformanceRotationSchema,
  applyRevenueRotationSchema,
  applySignalIntakeSchema,
  applyRevenueStoreSetupSchema,
  executeRevenueAutopilotSchema,
  applyRevenueOpportunityControlSchema,
  applyRevenueOpportunityFactorySchema,
  applyRevenueSignalConnectorSchema,
  applyRevenueSignalConnectorApprovalSchema,
  applyRevenueSignalImportJobSchema,
  applyRevenueSignalImportHandoffSchema,
  applyRevenueLaunchChecklistActionBridgeSchema,
  applyRevenueLaunchOperationsPackSchema,
  applyRevenueLaunchClosureLedgerSchema,
  applyRevenueLiveConnectorReadinessSchema,
  applyRevenueLiveConnectorDesignDossierSchema,
  applyRevenueLaunchSprintSchema,
  applyFinancialReleaseGovernanceSchema,
  applyFinancialScalingSpendControlSchema,
  ingestFinancialScalingExecutionLedgerSchema,
  applyFacelessContentPipelineSchema,
  facelessContentPerformanceQuerySchema,
  facelessContentPipelineQuerySchema,
  financialOrchestratorQuerySchema,
  financialPayoutIntentParamsSchema,
  financialScalingBudgetPacketParamsSchema,
  ingestFacelessContentPerformanceSchema,
  ingestRevenuePerformanceSchema,
  portfolioCommandCenterQuerySchema,
  revenueAutopilotQuerySchema,
  revenueDigitalProductQuerySchema,
  revenueListingOptimizationQuerySchema,
  revenueLaunchPipelineQuerySchema,
  revenueAssetControlRecoveryQuerySchema,
  revenueAssetControlLedgerQuerySchema,
  revenueAssetReviewQueueQuerySchema,
  revenueBusinessFleetSchedulerQuerySchema,
  revenueBusinessFleetLaunchGateQuerySchema,
  revenueBusinessFleetProviderApprovalReviewQuerySchema,
  revenueMoneyArmyBatchPipelineQuerySchema,
  revenueEngineQuerySchema,
  revenuePerformanceQuerySchema,
  signalIntakeQuerySchema,
  revenueSignalConnectorQuerySchema,
  revenueSignalConnectorApprovalParamsSchema,
  revenueSignalConnectorApprovalQuerySchema,
  revenueSignalImportHandoffQuerySchema,
  reviewRevenueSignalConnectorApprovalSchema,
  revenueStoreSetupQuerySchema,
  revenueOpportunityControlParamsSchema,
  revenueOpportunityControlQuerySchema,
  revenueLaunchHandoffQuerySchema,
  revenueLaunchHandoffControlParamsSchema,
  revenueLaunchHandoffControlQuerySchema,
  revenueLaunchOperationsPackQuerySchema,
  revenueLaunchClosureLedgerQuerySchema,
  revenueFirstBusinessLaunchQuerySchema,
  revenueFirstCashReadinessQuerySchema,
  revenueFirstCashSprintQuerySchema,
  revenueLiveConnectorReadinessQuerySchema,
  revenueLiveConnectorDesignDossierQuerySchema,
  revenueLaunchChecklistActionBridgeQuerySchema,
  revenueLaunchChecklistQuerySchema,
  revenueLaunchReadinessQuerySchema,
  revenueLaunchChecklistActionBridgeConfirmation,
  revenueFirstBusinessLaunchConfirmation,
  applyRevenueFirstBusinessLaunchSchema,
  applyRevenueFirstCashSprintSchema,
  revenueOpportunityFactoryConfirmation,
  reviewFinancialPayoutIntentSchema,
  reviewFinancialScalingBudgetPacketSchema,
  type ApplyFinancialReleaseGovernanceInput,
  type ApplyFinancialScalingSpendControlInput,
  type IngestFinancialScalingExecutionLedgerInput,
  type ApplyFinancialOrchestratorInput,
  type ApplyRevenueAssetBatchActionInput,
  type ApplyRevenueAssetActionInput,
  type ApplyRevenueBusinessFleetGapAccelerationInput,
  type ApplyRevenueBusinessFleetLiveLaunchPackageInput,
  type ApplyRevenueBusinessFleetProviderApprovalReviewInput,
  type ApplyRevenueBusinessFleetSeedGapInput,
  type ApplyRevenueBusinessFleetLaunchWaveInput,
  type ApplyRevenueMoneyArmyBatchPipelineInput,
  type ApplyFacelessContentPipelineInput,
  type ApplyPortfolioCommandCenterInput,
  type ApplyRevenueAutopilotInput,
  type ApplyRevenueDigitalProductInput,
  type ApplyRevenueLaunchHandoffInput,
  type ApplyRevenueLaunchHandoffControlInput,
  type ApplyRevenueListingOptimizationInput,
  type ApplyRevenueLaunchPipelineInput,
  type ApplyRevenuePerformanceRotationInput,
  type ApplyRevenueRotationInput,
  type ApplySignalIntakeInput,
  type ApplyRevenueStoreSetupInput,
  type CreatePodProductInput,
  type ExecuteRevenueAutopilotInput,
  type ApplyRevenueOpportunityControlInput,
  type ApplyRevenueOpportunityFactoryInput,
  type ApplyRevenueSignalConnectorInput,
  type ApplyRevenueSignalConnectorApprovalInput,
  type ApplyRevenueSignalImportJobInput,
  type ApplyRevenueSignalImportHandoffInput,
  type ApplyRevenueLaunchChecklistActionBridgeInput,
  type ApplyRevenueLaunchOperationsPackInput,
  type ApplyRevenueLaunchClosureLedgerInput,
  type ApplyRevenueLiveConnectorReadinessInput,
  type ApplyRevenueLiveConnectorDesignDossierInput,
  type ApplyRevenueLaunchSprintInput,
  type FinancialOrchestratorQueryInput,
  type FinancialPayoutIntentParamsInput,
  type FinancialScalingBudgetPacketParamsInput,
  type FacelessContentPerformanceQueryInput,
  type FacelessContentPipelineQueryInput,
  type IngestFacelessContentPerformanceInput,
  type IngestRevenuePerformanceInput,
  type PortfolioCommandCenterQueryInput,
  type RevenueAutopilotQueryInput,
  type RevenueDigitalProductQueryInput,
  type RevenueListingOptimizationQueryInput,
  type RevenueLaunchPipelineQueryInput,
  type RevenueAssetControlRecoveryQueryInput,
  type RevenueAssetControlLedgerQueryInput,
  type RevenueAssetReviewQueueQueryInput,
  type RevenueBusinessFleetSchedulerQueryInput,
  type RevenueBusinessFleetLaunchGateQueryInput,
  type RevenueBusinessFleetProviderApprovalReviewQueryInput,
  type RevenueMoneyArmyBatchPipelineQueryInput,
  type RevenueEngineQueryInput,
  type RevenuePerformanceQueryInput,
  type SignalIntakeQueryInput,
  type RevenueSignalConnectorQueryInput,
  type RevenueSignalConnectorApprovalParamsInput,
  type RevenueSignalConnectorApprovalQueryInput,
  type RevenueSignalImportHandoffQueryInput,
  type ReviewRevenueSignalConnectorApprovalInput,
  type RevenueStoreSetupQueryInput,
  type RevenueOpportunityControlParamsInput,
  type RevenueOpportunityControlQueryInput,
  type RevenueLaunchHandoffQueryInput,
  type RevenueLaunchHandoffControlParamsInput,
  type RevenueLaunchHandoffControlQueryInput,
  type RevenueLaunchOperationsPackQueryInput,
  type RevenueLaunchClosureLedgerQueryInput,
  type RevenueFirstBusinessLaunchQueryInput,
  type ApplyRevenueFirstBusinessLaunchInput,
  type RevenueFirstCashReadinessQueryInput,
  type RevenueFirstCashSprintQueryInput,
  type ApplyRevenueFirstCashSprintInput,
  type RevenueLiveConnectorReadinessQueryInput,
  type RevenueLiveConnectorDesignDossierQueryInput,
  type RevenueLaunchChecklistActionBridgeQueryInput,
  type RevenueLaunchChecklistQueryInput,
  type RevenueLaunchReadinessQueryInput,
  type ReviewFinancialPayoutIntentInput,
  type ReviewFinancialScalingBudgetPacketInput
} from "../schemas.js";
import { recordAuditLog } from "../services/audit.js";
import { formatComplianceNotes } from "../services/complianceGuardrails.js";
import type { MerchProductSnapshot, MerchStoreSnapshot } from "../services/merchReports.js";
import {
  buildFinancialScalingBudgetReviewPlan,
  buildFinancialOrchestratorPlan,
  type FinancialOrchestratorPlan,
  type FinancialScalingBudgetPacketSnapshot,
  type FinancialScalingBudgetReviewPlan
} from "../services/financialOrchestrator.js";
import {
  buildFinancialScalingSpendControlPlan,
  type FinancialPersistedScalingSpendPacketSnapshot,
  type FinancialScalingSpendControlPlan
} from "../services/financialScalingSpendControl.js";
import {
  buildFinancialScalingExecutionLedgerPlan,
  normalizeFinancialScalingExecutionEntry,
  type FinancialScalingExecutionEntrySnapshot,
  type FinancialScalingExecutionLedgerPlan
} from "../services/financialScalingExecutionLedger.js";
import {
  buildFinancialPayoutReviewPlan,
  type FinancialPayoutIntentSnapshot,
  type FinancialPayoutReviewPlan
} from "../services/financialPayoutReview.js";
import {
  buildFinancialReleaseGovernancePlan,
  type FinancialPersistedReconciliationSnapshot,
  type FinancialPersistedReleasePacketSnapshot,
  type FinancialReleaseGovernancePlan
} from "../services/financialReleaseGovernance.js";
import {
  buildFacelessContentPipelinePlan,
  type FacelessContentBrief,
  type FacelessContentPerformanceSnapshot,
  type FacelessContentPipelinePlan
} from "../services/facelessContentPipeline.js";
import {
  buildPortfolioCommandCenterPlan,
  type PortfolioCommandCenterPlan,
  type PortfolioCommandItem,
  type PortfolioCommandRecordSnapshot,
  type PortfolioCommandRecordStatus,
  type PortfolioCommandTargetType
} from "../services/portfolioCommandCenter.js";
import {
  buildDigitalProductPortfolioPlan,
  type DigitalProductPortfolioPlan
} from "../services/digitalProductPortfolio.js";
import { buildGrowthApprovalPacket, type GrowthApprovalPacket } from "../services/growthPlans.js";
import { buildProviderPayloadApprovalPacket, buildProviderPayloadPackage, isProviderPayloadApprovalPacket } from "../services/merchProviderPayloads.js";
import { generateProductBatch } from "../services/productBatchGenerator.js";
import {
  buildRevenueAssetControlPlan,
  buildRevenueAssetBatchControlPlan,
  buildRevenueAssetPortfolio,
  buildRevenueEnginePlan,
  mergeRevenueAssetPortfolioPerformance,
  removeDuplicateRevenueAssetBatchControls,
  type RevenueAssetControlPlan,
  type RevenueAssetBatchControlPlan,
  type RevenueAssetControlDuplicateSnapshot,
  type RevenueAssetPortfolio,
  type RevenueEnginePlan,
  type RevenueEngineProductSnapshot,
  type RevenueEngineStoreSnapshot,
  type RevenueProductStatus,
  type RevenueStoreLaunchStatus
} from "../services/revenueEngine.js";
import {
  buildRevenueMoneyArmyBatchPipelinePlan,
  buildRevenueBusinessFleetLaunchGapPlan,
  buildRevenueBusinessFleetSchedulerPlan,
  selectRevenueBusinessFleetLaunchWave,
  type RevenueBusinessFleetLaunchGapPlan,
  type RevenueBusinessFleetOpportunitySeed,
  type RevenueBusinessFleetPlan,
  type RevenueMoneyArmyBatchPipelinePlan,
  type RevenueMoneyArmyBatchPipelineStageName
} from "../services/revenueBusinessFleetScheduler.js";
import {
  buildRevenueAssetControlRecoveryPlan,
  buildRevenueAssetControlLedgerPlan,
  normalizeRevenueAssetControlRecord,
  revenueAssetControlRecordFromPlan,
  type RevenueAssetControlLedgerPlan,
  type RevenueAssetControlRecoveryPlan,
  type RevenueAssetControlRecordSnapshot
} from "../services/revenueAssetControlLedger.js";
import {
  buildRevenueAssetReviewQueuePlan,
  type RevenueAssetReviewQueuePlan
} from "../services/revenueAssetReviewQueue.js";
import { buildRevenueAssetControlsFromPortfolioCommands } from "../services/revenuePortfolioCommandAssetControls.js";
import {
  buildRevenuePortfolioDashboardPlan,
  type RevenuePortfolioDashboardPlan
} from "../services/revenuePortfolioDashboard.js";
import {
  buildRevenueListingOptimizationPlan,
  type RevenueListingOptimizationPlan
} from "../services/revenueListingOptimization.js";
import {
  buildRevenuePerformanceDigest,
  calculateRevenuePerformanceNetProfit,
  normalizeRevenuePerformanceSnapshot,
  type RevenuePerformanceDigest,
  type RevenuePerformanceSnapshot
} from "../services/revenuePerformance.js";
import {
  buildRevenueStoreSetupPlan,
  type RevenueStoreSetupPlan
} from "../services/revenueStoreSetup.js";
import {
  buildRevenueLaunchReadinessPlan,
  type RevenueLaunchReadinessApprovalSnapshot,
  type RevenueLaunchReadinessPlan,
  type RevenueLaunchReadinessStoreSnapshot
} from "../services/revenueLaunchReadiness.js";
import {
  buildRevenueLaunchChecklistPlan,
  type RevenueLaunchChecklistPlan
} from "../services/revenueLaunchChecklist.js";
import {
  buildRevenueLaunchChecklistActionBridgePlan,
  selectRevenueLaunchChecklistBridgeActions,
  type RevenueLaunchChecklistActionBridgeItem,
  type RevenueLaunchChecklistActionBridgePlan
} from "../services/revenueLaunchChecklistActionBridge.js";
import {
  buildRevenueLaunchSprintCycle,
  buildRevenueLaunchSprintPlan,
  selectRevenueLaunchSprintBridgeActions,
  type RevenueLaunchSprintCycle,
  type RevenueLaunchSprintFactorySummary,
  type RevenueLaunchSprintOptions
} from "../services/revenueLaunchSprint.js";
import {
  buildRevenueLaunchHandoffPlan,
  revenueLaunchHandoffDedupeKey,
  revenueLaunchHandoffRecordStatus,
  type RevenueLaunchHandoffItem,
  type RevenueLaunchHandoffPacketRecordSnapshot,
  type RevenueLaunchHandoffPlan
} from "../services/revenueLaunchHandoff.js";
import {
  buildRevenueLaunchHandoffControlPlan,
  evaluateRevenueLaunchHandoffControlUpdate,
  type RevenueLaunchHandoffControlPlan
} from "../services/revenueLaunchHandoffControl.js";
import {
  buildRevenueLaunchOperationsPackPlan,
  selectRevenueLaunchOperationsPacks
} from "../services/revenueLaunchOperationsPack.js";
import {
  buildRevenueLaunchClosureLedgerPlan,
  selectRevenueLaunchClosureLedgerEntries
} from "../services/revenueLaunchClosureLedger.js";
import {
  buildRevenueLiveConnectorReadinessRegistryPlan,
  selectRevenueLiveConnectorReadinessEntries
} from "../services/revenueLiveConnectorReadinessRegistry.js";
import {
  buildRevenueFirstCashReadinessPlan,
  type RevenueFirstCashReadinessPlan
} from "../services/revenueFirstCashReadiness.js";
import {
  buildRevenueFirstCashSprintPlan,
  revenueFirstCashSprintConfirmation,
  selectRevenueFirstCashSprintBridgeActionIds,
  type RevenueFirstCashSprintPlan
} from "../services/revenueFirstCashSprint.js";
import {
  buildRevenueFirstBusinessLaunchPlan,
  type RevenueFirstBusinessLaunchPlan
} from "../services/revenueFirstBusinessLaunch.js";
import {
  buildRevenueLiveConnectorDesignDossierPlan,
  selectRevenueLiveConnectorDesignDossiers
} from "../services/revenueLiveConnectorDesignDossier.js";
import {
  buildRevenueLaunchPipeline,
  type RevenueLaunchPipelinePlan,
  type RevenueLaunchProductSnapshot,
  type RevenueLaunchStoreSnapshot
} from "../services/revenueLaunchPipeline.js";
import {
  buildRevenueAutopilotPlan,
  selectRevenueAutopilotExecutionSteps,
  type RevenueAutopilotAction,
  type RevenueAutopilotExecutionStep,
  type RevenueAutopilotPlan
} from "../services/revenueAutopilot.js";
import {
  buildRevenueOpportunityFactoryPlan,
  revenueOpportunitySourceKey,
  type RevenueOpportunityFactoryPlan
} from "../services/revenueOpportunityFactory.js";
import {
  buildRevenueOpportunityControlPlan,
  evaluateRevenueOpportunityControlUpdate,
  type RevenueOpportunityControlOptions,
  type RevenueOpportunityControlPerformanceSnapshot,
  type RevenueOpportunityControlProductSnapshot,
  type RevenueOpportunityControlStoreSnapshot,
  type RevenueOpportunitySnapshot
} from "../services/revenueOpportunityControl.js";
import {
  buildSignalIntakePlan,
  type SignalIntakeInput,
  type SignalIntakePlan
} from "../services/signalIntakeCenter.js";
import {
  buildRevenueSignalConnectorPlan,
  revenueSignalConnectorConfirmation,
  selectRevenueSignalConnectorManifests,
  type RevenueSignalConnectorManifest,
  type RevenueSignalConnectorPlan
} from "../services/revenueSignalConnectors.js";
import {
  buildRevenueSignalConnectorApprovalPlan,
  revenueSignalConnectorApprovalConfirmation,
  revenueSignalConnectorApprovalDedupeKey,
  revenueSignalConnectorApproveConfirmation,
  revenueSignalConnectorRejectConfirmation,
  revenueSignalImportJobConfirmation,
  selectRevenueSignalApprovalsForImport,
  type RevenueSignalConnectorApprovalPlan,
  type RevenueSignalConnectorApprovalRecordSnapshot,
  type RevenueSignalImportJobSnapshot
} from "../services/revenueSignalConnectorApprovals.js";
import {
  buildRevenueSignalImportHandoffPlan,
  mergeRevenueSignalImportJobPayloads,
  revenueSignalImportHandoffConfirmation,
  selectRevenueSignalImportJobsForHandoff,
  type RevenueSignalImportHandoffPlan
} from "../services/revenueSignalImportHandoff.js";
import { parseSecureJson, stringifySecureJson } from "../services/secureJson.js";

const approvalStatusFromDb = {
  DESIGNS_APPROVED: "Designs Approved",
  DESIGNS_PENDING: "Designs Pending",
  LAUNCH_APPROVED: "Launch Approved",
  LISTINGS_APPROVED: "Listings Approved",
  NOT_STARTED: "Not Started",
  RESEARCH_APPROVED: "Research Approved"
} as const;

const approvalStatusToDb = {
  "Designs Approved": "DESIGNS_APPROVED",
  "Designs Pending": "DESIGNS_PENDING",
  "Launch Approved": "LAUNCH_APPROVED",
  "Listings Approved": "LISTINGS_APPROVED",
  "Not Started": "NOT_STARTED",
  "Research Approved": "RESEARCH_APPROVED"
} as const;

const storePlatformFromDb = {
  ETSY: "Etsy",
  OTHER: "Other",
  SHOPIFY: "Shopify"
} as const;

const storePlatformToDb = {
  Etsy: "ETSY",
  Other: "OTHER",
  Shopify: "SHOPIFY"
} as const;

const podProviderFromDb = {
  OTHER: "Other",
  PRINTFUL: "Printful",
  PRINTIFY: "Printify"
} as const;

const podProviderToDb = {
  Other: "OTHER",
  Printful: "PRINTFUL",
  Printify: "PRINTIFY"
} as const;

const launchStatusFromDb = {
  ARCHIVED: "Archived",
  AWAITING_APPROVAL: "Awaiting Approval",
  BUILDING_STORE: "Building Store",
  DESIGNING: "Designing",
  DISCOVERY: "Discovery",
  LAUNCHED: "Launched",
  LEAD: "Lead",
  OPTIMIZING: "Optimizing",
  PAUSED: "Paused",
  RESEARCHING: "Researching"
} as const;

const launchStatusToDb = {
  Archived: "ARCHIVED",
  "Awaiting Approval": "AWAITING_APPROVAL",
  "Building Store": "BUILDING_STORE",
  Designing: "DESIGNING",
  Discovery: "DISCOVERY",
  Launched: "LAUNCHED",
  Lead: "LEAD",
  Optimizing: "OPTIMIZING",
  Paused: "PAUSED",
  Researching: "RESEARCHING"
} as const;

const productStatusFromDb = {
  APPROVED: "Approved",
  ARCHIVED: "Archived",
  AWAITING_APPROVAL: "Awaiting Approval",
  COMPLIANCE_REVIEW: "Compliance Review",
  DESIGNED: "Designed",
  IDEA: "Idea",
  LISTING_DRAFTED: "Listing Drafted",
  MOCKUP_CREATED: "Mockup Created",
  NEEDS_REVISION: "Needs Revision",
  PROMPT_READY: "Prompt Ready",
  PUBLISHED: "Published",
  REJECTED: "Rejected"
} as const;

const productStatusToDb = {
  Approved: "APPROVED",
  Archived: "ARCHIVED",
  "Awaiting Approval": "AWAITING_APPROVAL",
  "Compliance Review": "COMPLIANCE_REVIEW",
  Designed: "DESIGNED",
  Idea: "IDEA",
  "Listing Drafted": "LISTING_DRAFTED",
  "Mockup Created": "MOCKUP_CREATED",
  "Needs Revision": "NEEDS_REVISION",
  "Prompt Ready": "PROMPT_READY",
  Published: "PUBLISHED",
  Rejected: "REJECTED"
} as const;

type Decimalish = { toString(): string };

type ProductRecord = {
  aiDisclosureNeeded: boolean;
  complianceNotes: string | null;
  designConcept: string;
  designPrompt: string;
  designTheme: string;
  estimatedProfit: Decimalish;
  id: string;
  listingDescription: string | null;
  listingTitle: string | null;
  productName: string;
  productType: string;
  productionPartnerDisclosureNeeded: boolean;
  profitMargin: Decimalish;
  retailPrice: Decimalish;
  status: keyof typeof productStatusFromDb;
  storeId: string;
  tags: string[];
};

type StoreRecord = {
  approvalStatus: keyof typeof approvalStatusFromDb;
  audience: string;
  brandStyle: string;
  businessName: string;
  clientName: string;
  commandGeneralId: string | null;
  commandGeneralName: string | null;
  commandMarshalId: string | null;
  commandMarshalName: string | null;
  estimatedProfit: Decimalish;
  id: string;
  industry: string;
  launchStatus: keyof typeof launchStatusFromDb;
  podProvider: keyof typeof podProviderFromDb;
  productTypes: string[];
  products: ProductRecord[];
  revenue: Decimalish;
  storePlatform: keyof typeof storePlatformFromDb;
};

type PerformanceRecord = {
  adSpend: Decimalish;
  createdAt: Date;
  digitalDeliveryCost: Decimalish;
  discounts: Decimalish;
  grossRevenue: Decimalish;
  id: string;
  impressions: number;
  netProfit: Decimalish;
  notes: string | null;
  periodEnd: Date;
  periodStart: Date;
  platformFees: Decimalish;
  productId: string | null;
  productionCost: Decimalish;
  refunds: Decimalish;
  shippingCost: Decimalish;
  source: string;
  storeId: string;
  unitsSold: number;
  visits: number;
};

type FacelessContentPerformanceRecord = {
  channel: string;
  clicks: number;
  comments: number;
  contentBriefId: string | null;
  conversions: number;
  cost: Decimalish;
  externalExecution: boolean;
  id: string;
  likes: number;
  notes: string | null;
  periodEnd: Date;
  periodStart: Date;
  productId: string | null;
  revenue: Decimalish;
  saves: number;
  shares: number;
  source: string;
  storeId: string | null;
  views: number;
  watchSeconds: number;
};

function decimalToNumber(value: Decimalish) {
  return Number(value.toString());
}

function storeSnapshot(store: StoreRecord): RevenueEngineStoreSnapshot {
  return {
    approvalStatus: approvalStatusFromDb[store.approvalStatus],
    audience: store.audience,
    brandStyle: store.brandStyle,
    businessName: store.businessName,
    clientName: store.clientName,
    estimatedProfit: decimalToNumber(store.estimatedProfit),
    id: store.id,
    industry: store.industry,
    launchStatus: launchStatusFromDb[store.launchStatus],
    productTypes: store.productTypes,
    revenue: decimalToNumber(store.revenue),
    storePlatform: storePlatformFromDb[store.storePlatform]
  };
}

function launchStoreSnapshot(store: StoreRecord): RevenueLaunchStoreSnapshot {
  return {
    ...storeSnapshot(store),
    commandGeneralId: store.commandGeneralId,
    commandGeneralName: store.commandGeneralName,
    commandMarshalId: store.commandMarshalId,
    commandMarshalName: store.commandMarshalName
  };
}

function productSnapshot(product: ProductRecord): RevenueEngineProductSnapshot {
  return {
    aiDisclosureNeeded: product.aiDisclosureNeeded,
    complianceNotes: product.complianceNotes,
    designConcept: product.designConcept,
    designPrompt: product.designPrompt,
    designTheme: product.designTheme,
    estimatedProfit: decimalToNumber(product.estimatedProfit),
    id: product.id,
    listingDescription: product.listingDescription,
    listingTitle: product.listingTitle,
    productName: product.productName,
    productType: product.productType,
    productionPartnerDisclosureNeeded: product.productionPartnerDisclosureNeeded,
    profitMargin: decimalToNumber(product.profitMargin),
    retailPrice: decimalToNumber(product.retailPrice),
    status: productStatusFromDb[product.status],
    storeId: product.storeId,
    tags: product.tags
  };
}

function launchProductSnapshot(product: ProductRecord): RevenueLaunchProductSnapshot {
  return productSnapshot(product);
}

function performanceSnapshot(record: PerformanceRecord): RevenuePerformanceSnapshot {
  return normalizeRevenuePerformanceSnapshot({
    adSpend: decimalToNumber(record.adSpend),
    createdAt: record.createdAt.toISOString(),
    digitalDeliveryCost: decimalToNumber(record.digitalDeliveryCost),
    discounts: decimalToNumber(record.discounts),
    grossRevenue: decimalToNumber(record.grossRevenue),
    id: record.id,
    impressions: record.impressions,
    netProfit: decimalToNumber(record.netProfit),
    notes: record.notes,
    periodEnd: record.periodEnd.toISOString(),
    periodStart: record.periodStart.toISOString(),
    platformFees: decimalToNumber(record.platformFees),
    productId: record.productId,
    productionCost: decimalToNumber(record.productionCost),
    refunds: decimalToNumber(record.refunds),
    shippingCost: decimalToNumber(record.shippingCost),
    source: record.source as RevenuePerformanceSnapshot["source"],
    storeId: record.storeId,
    unitsSold: record.unitsSold,
    visits: record.visits
  });
}

function opportunityControlProductSnapshot(product: ProductRecord): RevenueOpportunityControlProductSnapshot {
  return {
    estimatedProfit: decimalToNumber(product.estimatedProfit),
    id: product.id,
    productName: product.productName,
    productType: product.productType,
    profitMargin: decimalToNumber(product.profitMargin),
    status: productStatusFromDb[product.status]
  };
}

function opportunityControlStoreSnapshot(store: StoreRecord): RevenueOpportunityControlStoreSnapshot {
  return {
    approvalStatus: approvalStatusFromDb[store.approvalStatus],
    businessName: store.businessName,
    estimatedProfit: decimalToNumber(store.estimatedProfit),
    id: store.id,
    launchStatus: launchStatusFromDb[store.launchStatus],
    products: store.products.map(opportunityControlProductSnapshot),
    revenue: decimalToNumber(store.revenue),
    storePlatform: storePlatformFromDb[store.storePlatform]
  };
}

function opportunityControlPerformanceSnapshot(record: PerformanceRecord): RevenueOpportunityControlPerformanceSnapshot {
  return {
    grossRevenue: decimalToNumber(record.grossRevenue),
    id: record.id,
    netProfit: decimalToNumber(record.netProfit),
    periodEnd: record.periodEnd.toISOString(),
    productId: record.productId,
    storeId: record.storeId
  };
}

function opportunityControlSnapshot(record: {
  auditLogId: string | null;
  businessName: string;
  createdAt: Date;
  externalExecution: boolean;
  id: string;
  idea: string;
  providerContacted: boolean;
  sourceKey: string;
  status: string;
  store: StoreRecord | null;
  storeId: string | null;
  totalsJson: string;
  updatedAt: Date;
}): RevenueOpportunitySnapshot {
  return {
    auditLogId: record.auditLogId,
    businessName: record.businessName,
    createdAt: record.createdAt.toISOString(),
    externalExecution: false,
    id: record.id,
    idea: record.idea,
    providerContacted: false,
    sourceKey: record.sourceKey,
    status: record.status,
    store: record.store ? opportunityControlStoreSnapshot(record.store) : null,
    storeId: record.storeId,
    totals: parseSecureJson<Record<string, unknown>>(record.totalsJson) ?? {},
    updatedAt: record.updatedAt.toISOString()
  };
}

function launchReadinessStoreSnapshot(store: StoreRecord): RevenueLaunchReadinessStoreSnapshot {
  return {
    approvalStatus: approvalStatusFromDb[store.approvalStatus],
    businessName: store.businessName,
    estimatedProfit: decimalToNumber(store.estimatedProfit),
    id: store.id,
    launchStatus: launchStatusFromDb[store.launchStatus],
    productTypes: store.productTypes,
    revenue: decimalToNumber(store.revenue),
    storePlatform: storePlatformFromDb[store.storePlatform]
  };
}

function providerMerchStoreSnapshot(store: StoreRecord): MerchStoreSnapshot {
  return {
    approvalStatus: approvalStatusFromDb[store.approvalStatus],
    audience: store.audience,
    brandStyle: store.brandStyle,
    businessName: store.businessName,
    clientName: store.clientName,
    estimatedProfit: decimalToNumber(store.estimatedProfit),
    industry: store.industry,
    launchStatus: launchStatusFromDb[store.launchStatus],
    podProvider: podProviderFromDb[store.podProvider],
    productTypes: store.productTypes,
    revenue: decimalToNumber(store.revenue),
    storePlatform: storePlatformFromDb[store.storePlatform]
  };
}

function providerMerchProductSnapshot(product: ProductRecord): MerchProductSnapshot {
  return {
    aiDisclosureNeeded: product.aiDisclosureNeeded,
    complianceNotes: product.complianceNotes,
    designConcept: product.designConcept,
    designPrompt: product.designPrompt,
    estimatedProfit: decimalToNumber(product.estimatedProfit),
    listingDescription: product.listingDescription,
    listingTitle: product.listingTitle,
    productName: product.productName,
    productType: product.productType,
    productionPartnerDisclosureNeeded: product.productionPartnerDisclosureNeeded,
    retailPrice: decimalToNumber(product.retailPrice),
    status: productStatusFromDb[product.status],
    tags: product.tags
  };
}

function launchReadinessApprovalSnapshot(record: {
  createdAt: Date;
  id: string;
  packetJson: string;
  requestAuditLogId: string | null;
  reviewAuditLogId: string | null;
  reviewedAt: Date | null;
  status: string;
  storeId: string;
}): RevenueLaunchReadinessApprovalSnapshot {
  return {
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    packet: parseSecureJson<GrowthApprovalPacket>(record.packetJson) ?? null,
    requestAuditLogId: record.requestAuditLogId,
    reviewAuditLogId: record.reviewAuditLogId,
    reviewedAt: record.reviewedAt?.toISOString() ?? null,
    status: record.status,
    storeId: record.storeId
  };
}

function facelessContentPerformanceSnapshot(record: FacelessContentPerformanceRecord): FacelessContentPerformanceSnapshot {
  return {
    channel: record.channel,
    clicks: record.clicks,
    comments: record.comments,
    contentBriefId: record.contentBriefId,
    conversions: record.conversions,
    cost: decimalToNumber(record.cost),
    externalExecution: false,
    id: record.id,
    likes: record.likes,
    notes: record.notes,
    periodEnd: record.periodEnd.toISOString(),
    periodStart: record.periodStart.toISOString(),
    productId: record.productId,
    revenue: decimalToNumber(record.revenue),
    saves: record.saves,
    shares: record.shares,
    source: record.source,
    storeId: record.storeId,
    views: record.views,
    watchSeconds: record.watchSeconds
  };
}

function financialPayoutIntentSnapshot(record: {
  amount: Decimalish;
  approvalRequired: boolean;
  auditLogId: string | null;
  category: string;
  createdAt: Date;
  currency: string;
  destinationType: string;
  externalExecution: boolean;
  id: string;
  metadataJson: string | null;
  provider: string;
  status: string;
  updatedAt: Date;
}): FinancialPayoutIntentSnapshot {
  return {
    amount: decimalToNumber(record.amount),
    approvalRequired: record.approvalRequired,
    auditLogId: record.auditLogId,
    category: record.category as FinancialPayoutIntentSnapshot["category"],
    createdAt: record.createdAt.toISOString(),
    currency: "USD",
    destinationType: record.destinationType,
    externalExecution: false,
    id: record.id,
    metadata: parseSecureJson<Record<string, unknown>>(record.metadataJson) ?? {},
    provider: record.provider,
    status: record.status,
    updatedAt: record.updatedAt.toISOString()
  };
}

function financialScalingBudgetPacketSnapshot(record: {
  amount: Decimalish;
  approvalGateJson: string;
  auditLogId: string | null;
  assetId: string;
  assetName: string;
  assetType: string;
  blockedActionsJson: string;
  confidence: number;
  createdAt: Date;
  dedupeKey: string;
  externalExecution: boolean;
  id: string;
  maxPerAssetAmount: Decimalish;
  metadataJson: string | null;
  profitVelocity: Decimalish;
  priority: number;
  providerContacted: boolean;
  reason: string;
  retainedScalingCapital: Decimalish;
  reviewedAt: Date | null;
  reviewedById: string | null;
  reviewNote: string | null;
  score: number;
  scoreBand: string;
  splitPolicyId: string | null;
  status: string;
  storeId: string;
  storeName: string;
  totalScalingCapital: Decimalish;
  updatedAt: Date;
}): FinancialScalingBudgetPacketSnapshot {
  return {
    amount: decimalToNumber(record.amount),
    approvalGate: parseSecureJson<FinancialScalingBudgetPacketSnapshot["approvalGate"]>(record.approvalGateJson) ?? {
      externalExecutionLocked: true,
      humanApprovalRequired: true,
      reason: "Scaling budget requires manual review.",
      status: "Required"
    },
    assetId: record.assetId,
    assetName: record.assetName,
    assetType: record.assetType as FinancialScalingBudgetPacketSnapshot["assetType"],
    auditLogId: record.auditLogId,
    blockedExternalActions: parsedStringArray(record.blockedActionsJson),
    budgetCap: {
      maxPerAssetAmount: decimalToNumber(record.maxPerAssetAmount),
      retainedScalingCapital: decimalToNumber(record.retainedScalingCapital),
      totalScalingCapital: decimalToNumber(record.totalScalingCapital)
    },
    confidence: record.confidence,
    createdAt: record.createdAt.toISOString(),
    dedupeKey: record.dedupeKey,
    externalExecution: false,
    id: record.id,
    metadata: parseSecureJson<Record<string, unknown>>(record.metadataJson) ?? {},
    priority: record.priority,
    profitVelocity: decimalToNumber(record.profitVelocity),
    providerContacted: false,
    reason: record.reason,
    reviewedAt: record.reviewedAt?.toISOString() ?? null,
    reviewedById: record.reviewedById,
    reviewNote: record.reviewNote,
    score: record.score,
    scoreBand: record.scoreBand as FinancialScalingBudgetPacketSnapshot["scoreBand"],
    splitPolicyId: record.splitPolicyId,
    status: record.status,
    storeId: record.storeId,
    storeName: record.storeName,
    updatedAt: record.updatedAt.toISOString()
  };
}

function financialScalingSpendPacketSnapshot(record: {
  amount: Decimalish;
  approvalState: string;
  assetId: string;
  assetName: string;
  assetType: string;
  auditLogId: string | null;
  blockedActionsJson: string;
  category: string;
  controlsJson: string;
  createdAt: Date;
  currency: string;
  dedupeKey: string;
  externalExecution: boolean;
  id: string;
  maxSpendAmount: Decimalish;
  priority: number;
  providerContacted: boolean;
  purpose: string;
  releaseState: string;
  scalingBudgetPacketId: string;
  score: number;
  storeId: string;
  storeName: string;
  updatedAt: Date;
}): FinancialPersistedScalingSpendPacketSnapshot {
  return {
    amount: decimalToNumber(record.amount),
    approvalState: record.approvalState as FinancialPersistedScalingSpendPacketSnapshot["approvalState"],
    assetId: record.assetId,
    assetName: record.assetName,
    assetType: record.assetType as FinancialPersistedScalingSpendPacketSnapshot["assetType"],
    auditLogId: record.auditLogId,
    blockedActions: parsedStringArray(record.blockedActionsJson),
    budgetPacketId: record.scalingBudgetPacketId,
    category: record.category as FinancialPersistedScalingSpendPacketSnapshot["category"],
    controls: parsedStringArray(record.controlsJson),
    createdAt: record.createdAt.toISOString(),
    currency: "USD",
    dedupeKey: record.dedupeKey,
    externalExecution: false,
    id: `scale_spend_${record.id}`,
    maxSpendAmount: decimalToNumber(record.maxSpendAmount),
    priority: record.priority,
    providerContacted: false,
    purpose: record.purpose,
    recordId: record.id,
    releaseState: record.releaseState as FinancialPersistedScalingSpendPacketSnapshot["releaseState"],
    score: record.score,
    storeId: record.storeId,
    storeName: record.storeName,
    updatedAt: record.updatedAt.toISOString()
  };
}

function financialScalingExecutionEntrySnapshot(record: {
  amountSpent: Decimalish;
  assetId: string;
  assetName: string;
  assetType: string;
  auditLogId: string | null;
  category: string;
  createdAt: Date;
  externalExecution: boolean;
  grossRevenue: Decimalish;
  id: string;
  netProfit: Decimalish;
  notes: string | null;
  outcome: string;
  periodEnd: Date;
  periodStart: Date;
  productId: string | null;
  providerContacted: boolean;
  scalingSpendPacketId: string;
  source: string;
  storeId: string;
  storeName: string;
  unitsSold: number;
  updatedAt: Date;
  visits: number;
}): FinancialScalingExecutionEntrySnapshot {
  return normalizeFinancialScalingExecutionEntry({
    amountSpent: decimalToNumber(record.amountSpent),
    assetId: record.assetId,
    assetName: record.assetName,
    assetType: record.assetType,
    auditLogId: record.auditLogId,
    category: record.category,
    createdAt: record.createdAt.toISOString(),
    externalExecution: false,
    grossRevenue: decimalToNumber(record.grossRevenue),
    id: `scale_execution_${record.id}`,
    netProfit: decimalToNumber(record.netProfit),
    notes: record.notes,
    outcome: record.outcome,
    periodEnd: record.periodEnd.toISOString(),
    periodStart: record.periodStart.toISOString(),
    productId: record.productId,
    providerContacted: false,
    recordId: record.id,
    scalingSpendPacketId: record.scalingSpendPacketId,
    source: record.source,
    storeId: record.storeId,
    storeName: record.storeName,
    unitsSold: record.unitsSold,
    updatedAt: record.updatedAt.toISOString(),
    visits: record.visits
  });
}

function financialScalingExecutionPreviewSnapshot(
  packet: {
    assetId: string;
    assetName: string;
    assetType: string;
    category: string;
    id: string;
    storeId: string;
    storeName: string;
  },
  input: IngestFinancialScalingExecutionLedgerInput["entries"][number],
  index: number
): FinancialScalingExecutionEntrySnapshot {
  const createdAt = new Date().toISOString();

  return normalizeFinancialScalingExecutionEntry({
    amountSpent: input.amountSpent,
    assetId: packet.assetId,
    assetName: packet.assetName,
    assetType: packet.assetType,
    auditLogId: null,
    category: packet.category,
    createdAt,
    externalExecution: false,
    grossRevenue: input.grossRevenue,
    id: `scale_execution_preview_${packet.id}_${index + 1}`,
    netProfit: input.netProfit,
    notes: input.notes ?? null,
    outcome: input.outcome,
    periodEnd: input.periodEnd,
    periodStart: input.periodStart,
    productId: packet.assetType === "product" ? packet.assetId : null,
    providerContacted: false,
    recordId: `preview_${packet.id}_${index + 1}`,
    scalingSpendPacketId: packet.id,
    source: input.source,
    storeId: packet.storeId,
    storeName: packet.storeName,
    unitsSold: input.unitsSold,
    updatedAt: createdAt,
    visits: input.visits
  });
}

function parsedStringArray(value: string) {
  const parsed = parseSecureJson<unknown>(value);

  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
}

function revenueSignalConnectorApprovalSnapshot(record: {
  blockedActionsJson: string;
  contentBriefId: string | null;
  createdAt: Date;
  credentialEnvVarsJson: string;
  dedupeKey: string;
  endpointTemplatesJson: string;
  externalExecution: boolean;
  id: string;
  lane: string;
  manifestId: string;
  manifestJson: string;
  productId: string | null;
  provider: string;
  providerContacted: boolean;
  providerName: string;
  readOnlyScopesJson: string;
  readinessScore: number;
  requestAuditLogId: string | null;
  reviewAuditLogId: string | null;
  reviewedAt: Date | null;
  reviewedById: string | null;
  reviewNote: string | null;
  riskLevel: string;
  samplePayloadJson: string | null;
  signalPreviewJson: string;
  status: string;
  storeId: string | null;
  storeName: string | null;
  transformTarget: string;
  updatedAt: Date;
}): RevenueSignalConnectorApprovalRecordSnapshot {
  const manifest = parseSecureJson<RevenueSignalConnectorManifest>(record.manifestJson)
    ?? ({ id: record.manifestId } as RevenueSignalConnectorManifest);

  return {
    blockedActions: parsedStringArray(record.blockedActionsJson),
    contentBriefId: record.contentBriefId,
    createdAt: record.createdAt.toISOString(),
    credentialEnvVars: parsedStringArray(record.credentialEnvVarsJson),
    dedupeKey: record.dedupeKey,
    endpointTemplates: parsedStringArray(record.endpointTemplatesJson),
    externalExecution: false,
    id: record.id,
    lane: manifest.lane,
    manifest,
    manifestId: record.manifestId,
    productId: record.productId,
    provider: manifest.provider,
    providerContacted: false,
    providerName: record.providerName,
    readOnlyScopes: parseSecureJson<RevenueSignalConnectorManifest["readOnlyScopes"]>(record.readOnlyScopesJson) ?? [],
    readinessScore: record.readinessScore,
    requestAuditLogId: record.requestAuditLogId,
    reviewAuditLogId: record.reviewAuditLogId,
    reviewedAt: record.reviewedAt?.toISOString() ?? null,
    reviewedById: record.reviewedById,
    reviewNote: record.reviewNote,
    riskLevel: manifest.riskLevel,
    samplePayload: record.samplePayloadJson ? parseSecureJson<SignalIntakeInput>(record.samplePayloadJson) : null,
    signalPreview: parseSecureJson<SignalIntakePlan>(record.signalPreviewJson) ?? buildSignalIntakePlan({ incoming: undefined }),
    status: record.status,
    storeId: record.storeId,
    storeName: record.storeName,
    transformTarget: manifest.transformTarget,
    updatedAt: record.updatedAt.toISOString()
  };
}

function revenueSignalImportJobSnapshot(record: {
  approvalId: string;
  auditLogId: string | null;
  completedAt?: Date | null;
  createdAt: Date;
  externalExecution: boolean;
  handoffAuditLogId?: string | null;
  id: string;
  intakeResultJson?: string | null;
  lane: string;
  manifestId: string;
  provider: string;
  providerContacted: boolean;
  samplePayloadJson: string | null;
  signalPreviewJson: string;
  status: string;
  transformTarget: string;
  updatedAt: Date;
}): RevenueSignalImportJobSnapshot {
  return {
    approvalId: record.approvalId,
    auditLogId: record.auditLogId,
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    externalExecution: false,
    handoffAuditLogId: record.handoffAuditLogId ?? null,
    id: record.id,
    intakeResult: record.intakeResultJson ? parseSecureJson<Record<string, unknown>>(record.intakeResultJson) : null,
    lane: record.lane as RevenueSignalImportJobSnapshot["lane"],
    manifestId: record.manifestId,
    provider: record.provider as RevenueSignalImportJobSnapshot["provider"],
    providerContacted: false,
    samplePayload: record.samplePayloadJson ? parseSecureJson<SignalIntakeInput>(record.samplePayloadJson) : null,
    signalPreview: parseSecureJson<SignalIntakePlan>(record.signalPreviewJson) ?? buildSignalIntakePlan({ incoming: undefined }),
    status: record.status,
    transformTarget: record.transformTarget as RevenueSignalImportJobSnapshot["transformTarget"],
    updatedAt: record.updatedAt.toISOString()
  };
}

function financialBudgetReleasePacketSnapshot(record: {
  amount: Decimalish;
  approvalState: string;
  auditLogId: string | null;
  blockedActionsJson: string;
  category: string;
  controlsJson: string;
  createdAt: Date;
  currency: string;
  destinationType: string;
  externalExecution: boolean;
  id: string;
  maxReleaseAmount: Decimalish;
  payoutIntentId: string;
  purpose: string;
  releaseState: string;
  updatedAt: Date;
}): FinancialPersistedReleasePacketSnapshot {
  return {
    amount: decimalToNumber(record.amount),
    approvalState: record.approvalState as FinancialPersistedReleasePacketSnapshot["approvalState"],
    auditLogId: record.auditLogId,
    blockedActions: parsedStringArray(record.blockedActionsJson),
    category: record.category as FinancialPersistedReleasePacketSnapshot["category"],
    controls: parsedStringArray(record.controlsJson),
    createdAt: record.createdAt.toISOString(),
    currency: "USD",
    destinationType: record.destinationType,
    externalExecution: false,
    id: `release_${record.payoutIntentId}`,
    intentId: record.payoutIntentId,
    maxReleaseAmount: decimalToNumber(record.maxReleaseAmount),
    purpose: record.purpose,
    recordId: record.id,
    releaseState: record.releaseState as FinancialPersistedReleasePacketSnapshot["releaseState"],
    title: `${record.category.replace(/_/g, " ")} release packet`,
    updatedAt: record.updatedAt.toISOString()
  };
}

function financialReconciliationReportSnapshot(record: {
  approvedAmount: Decimalish;
  auditLogId: string | null;
  createdAt: Date;
  externalExecution: boolean;
  id: string;
  pendingAmount: Decimalish;
  rejectedAmount: Decimalish;
  reportJson: string;
  source: string;
  status: string;
  totalAmount: Decimalish;
  updatedAt: Date;
  variance: Decimalish;
}): FinancialPersistedReconciliationSnapshot {
  return {
    approvedAmount: decimalToNumber(record.approvedAmount),
    auditLogId: record.auditLogId,
    createdAt: record.createdAt.toISOString(),
    externalExecution: false,
    id: record.id,
    pendingAmount: decimalToNumber(record.pendingAmount),
    rejectedAmount: decimalToNumber(record.rejectedAmount),
    report: parseSecureJson<Record<string, unknown>>(record.reportJson) ?? {},
    source: record.source,
    status: record.status,
    totalAmount: decimalToNumber(record.totalAmount),
    updatedAt: record.updatedAt.toISOString(),
    variance: decimalToNumber(record.variance)
  };
}

function portfolioCommandRecordSnapshot(record: {
  action: string;
  auditLogId: string | null;
  commandHash: string;
  controlJson: string;
  createdAt: Date;
  externalExecution: boolean;
  id: string;
  priority: number;
  providerContacted: boolean;
  reason: string;
  recommendedStatus: string | null;
  riskLevel: string;
  sourceModule: string;
  status: string;
  targetId: string;
  targetName: string;
  targetType: string;
  updatedAt: Date;
}): PortfolioCommandRecordSnapshot {
  return {
    action: record.action,
    auditLogId: record.auditLogId,
    commandHash: record.commandHash,
    control: parseSecureJson<Record<string, unknown>>(record.controlJson) ?? {},
    createdAt: record.createdAt.toISOString(),
    externalExecution: false,
    id: record.id,
    priority: record.priority,
    providerContacted: false,
    reason: record.reason,
    recommendedStatus: record.recommendedStatus,
    riskLevel: record.riskLevel,
    sourceModule: record.sourceModule,
    status: record.status,
    targetId: record.targetId,
    targetName: record.targetName,
    targetType: record.targetType,
    updatedAt: record.updatedAt.toISOString()
  };
}

function revenueAssetControlRecordSnapshot(record: {
  assetId: string;
  assetName: string;
  assetType: string;
  auditLogId: string | null;
  auditOnly: boolean;
  controlJson: string;
  createdAt: Date;
  economicsScore: number;
  externalExecution: boolean;
  finalRank: number;
  fromStatus: string | null;
  id: string;
  nextInternalState: string | null;
  override: boolean;
  providerContacted: boolean;
  readinessScore: number;
  reason: string;
  requestedAction: string;
  riskLevel: string;
  riskPenalty: number;
  scoreBand: string;
  scoringRecommendation: string;
  statusChangeRequired: boolean;
  storeId: string | null;
  storeName: string;
  toStatus: string | null;
  updatedAt: Date;
  velocity: number;
  warningsJson: string;
}): RevenueAssetControlRecordSnapshot {
  return normalizeRevenueAssetControlRecord({
    assetId: record.assetId,
    assetName: record.assetName,
    assetType: record.assetType,
    auditLogId: record.auditLogId,
    auditOnly: record.auditOnly,
    control: parseSecureJson<Record<string, unknown>>(record.controlJson) ?? {},
    createdAt: record.createdAt.toISOString(),
    economicsScore: record.economicsScore,
    externalExecution: record.externalExecution,
    finalRank: record.finalRank,
    fromStatus: record.fromStatus,
    id: record.id,
    nextInternalState: record.nextInternalState,
    override: record.override,
    providerContacted: record.providerContacted,
    readinessScore: record.readinessScore,
    reason: record.reason,
    requestedAction: record.requestedAction,
    riskLevel: record.riskLevel,
    riskPenalty: record.riskPenalty,
    scoreBand: record.scoreBand,
    scoringRecommendation: record.scoringRecommendation,
    statusChangeRequired: record.statusChangeRequired,
    storeId: record.storeId,
    storeName: record.storeName,
    toStatus: record.toStatus,
    updatedAt: record.updatedAt.toISOString(),
    velocity: record.velocity,
    warnings: parseSecureJson<string[]>(record.warningsJson) ?? []
  });
}

function duplicateSnapshotFromRevenueAssetControlRecord(record: RevenueAssetControlRecordSnapshot): RevenueAssetControlDuplicateSnapshot {
  return {
    assetId: record.assetId,
    assetType: record.assetType,
    auditOnly: record.auditOnly,
    economicsScore: record.assetScore.economicsScore,
    finalRank: record.assetScore.finalRank,
    fromStatus: record.fromStatus,
    nextInternalState: record.nextInternalState,
    override: record.override,
    readinessScore: record.assetScore.readinessScore,
    requestedAction: record.requestedAction,
    riskPenalty: record.assetScore.riskPenalty,
    scoringRecommendation: record.scoringRecommendation,
    statusChangeRequired: record.statusChangeRequired,
    toStatus: record.toStatus,
    velocity: record.assetScore.velocity
  };
}

function revenueLaunchHandoffPacketSnapshot(record: {
  action: string;
  approvedPacketId: string | null;
  artifactSlotCount: number;
  auditLogId: string | null;
  blockedActionsJson: string;
  blockersJson: string;
  bundleJson: string | null;
  connectorReadinessScore: number;
  connectorStatus: string | null;
  createdAt: Date;
  credentialScopesJson: string;
  dedupeKey: string;
  externalExecution: boolean;
  id: string;
  launchReadinessScore: number;
  manifestCount: number;
  providerContacted: boolean;
  providerReadinessScore: number;
  providersJson: string;
  riskLevel: string;
  status: string;
  storeId: string;
  storeName: string;
  summary: string;
  updatedAt: Date;
}): RevenueLaunchHandoffPacketRecordSnapshot {
  return {
    action: record.action,
    approvedPacketId: record.approvedPacketId,
    artifactSlotCount: record.artifactSlotCount,
    auditLogId: record.auditLogId,
    blockedActions: parseSecureJson<string[]>(record.blockedActionsJson) ?? [],
    blockers: parseSecureJson<RevenueLaunchHandoffPacketRecordSnapshot["blockers"]>(record.blockersJson) ?? [],
    bundle: record.bundleJson ? parseSecureJson<RevenueLaunchHandoffPacketRecordSnapshot["bundle"]>(record.bundleJson) : null,
    connectorReadinessScore: record.connectorReadinessScore,
    connectorStatus: record.connectorStatus,
    createdAt: record.createdAt.toISOString(),
    credentialScopes: parseSecureJson<string[]>(record.credentialScopesJson) ?? [],
    dedupeKey: record.dedupeKey,
    externalExecution: false,
    id: record.id,
    launchReadinessScore: record.launchReadinessScore,
    manifestCount: record.manifestCount,
    providerContacted: false,
    providerReadinessScore: record.providerReadinessScore,
    providers: parseSecureJson<string[]>(record.providersJson) ?? [],
    riskLevel: record.riskLevel,
    status: record.status,
    storeId: record.storeId,
    storeName: record.storeName,
    summary: record.summary,
    updatedAt: record.updatedAt.toISOString()
  };
}

async function loadPortfolioForUser(userId: string) {
  const stores = await prisma.clientMerchStore.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      products: {
        orderBy: { updatedAt: "desc" }
      }
    }
  });

  return stores;
}

async function buildPortfolioCommandCenterForUser(userId: string, options: PortfolioCommandCenterQueryInput): Promise<{
  assetPortfolio: RevenueAssetPortfolio;
  plan: PortfolioCommandCenterPlan;
}> {
  const [revenuePlan, performanceResult, financialResult, scalingBudgetResult, scalingExecutionResult, contentResult, persistedCommandRecords] = await Promise.all([
    buildPlanForUser(userId, revenueEngineQuerySchema.parse({})),
    buildPerformanceDigestForUser(userId, revenuePerformanceQuerySchema.parse({
      windowDays: options.windowDays
    })),
    options.includeFinance ? buildFinancialReleaseGovernanceForUser(userId) : Promise.resolve({ plan: undefined }),
    options.includeFinance ? buildFinancialScalingBudgetReviewForUser(userId) : Promise.resolve({ plan: undefined }),
    options.includeFinance ? buildFinancialScalingExecutionLedgerForUser(userId) : Promise.resolve({ plan: undefined }),
    options.includeContent ? buildFacelessContentPipelineForUser(userId, facelessContentPipelineQuerySchema.parse({
      windowDays: options.windowDays
    })) : Promise.resolve({ plan: undefined }),
    options.includeCommandHistory > 0 ? prisma.portfolioCommandAction.findMany({
      orderBy: { createdAt: "desc" },
      take: options.includeCommandHistory,
      where: { userId }
    }) : Promise.resolve([])
  ]);

  const assetPortfolio = mergeRevenueAssetPortfolioPerformance(
    buildRevenueAssetPortfolio(revenuePlan),
    performanceResult.digest
  );

  return {
    assetPortfolio,
    plan: buildPortfolioCommandCenterPlan({
      assetPortfolio,
      contentPlan: contentResult.plan,
      financialPlan: financialResult.plan,
      financialScalingBudgetPlan: scalingBudgetResult.plan,
      financialScalingExecutionPlan: scalingExecutionResult.plan,
      options,
      performanceDigest: performanceResult.digest,
      persistedCommands: persistedCommandRecords.map(portfolioCommandRecordSnapshot),
      revenuePlan
    })
  };
}

async function buildRevenueAutopilotContextForUser(userId: string, options: RevenueAutopilotQueryInput) {
  const [
    revenuePlan,
    assetPortfolio,
    launchResult,
    digitalResult,
    listingResult,
    storeSetupResult,
    contentResult,
    financialResult,
    firstBusinessLaunchResult,
    firstCashSprintResult,
    releaseResult,
    signalPlan,
    commandResult
  ] = await Promise.all([
    buildPlanForUser(userId, revenueEngineQuerySchema.parse({})),
    buildAssetPortfolioForUser(userId, revenueEngineQuerySchema.parse({})),
    buildLaunchPipelineForUser(userId, revenueLaunchPipelineQuerySchema.parse({})),
    buildDigitalProductPortfolioForUser(userId, revenueDigitalProductQuerySchema.parse({})),
    buildListingOptimizationForUser(userId, revenueListingOptimizationQuerySchema.parse({
      windowDays: options.windowDays
    })),
    buildStoreSetupForUser(userId, revenueStoreSetupQuerySchema.parse({})),
    options.includeContent ? buildFacelessContentPipelineForUser(userId, facelessContentPipelineQuerySchema.parse({
      windowDays: options.windowDays
    })) : Promise.resolve({ plan: undefined }),
    options.includeFinance ? buildFinancialOrchestratorForUser(userId, financialOrchestratorQuerySchema.parse({
      windowDays: options.windowDays
    })) : Promise.resolve({ plan: undefined }),
    buildFirstBusinessLaunchForUser(userId, revenueFirstBusinessLaunchQuerySchema.parse({
      maxCandidates: 8
    })),
    buildFirstCashSprintForUser(userId, revenueFirstCashSprintQuerySchema.parse({
      includeBlocked: true,
      maxCandidates: 8,
      maxSprintActions: Math.min(5, options.maxActions),
      targetDaysToFirstCash: 7
    })),
    options.includeFinance ? buildFinancialReleaseGovernanceForUser(userId) : Promise.resolve({ plan: undefined }),
    options.includeSignalIntake ? buildSignalIntakeForUser(userId, signalIntakeQuerySchema.parse({
      windowDays: options.windowDays
    })) : Promise.resolve(undefined),
    buildPortfolioCommandCenterForUser(userId, portfolioCommandCenterQuerySchema.parse({
      includeContent: options.includeContent,
      includeFinance: options.includeFinance,
      maxActions: options.maxActions,
      windowDays: options.windowDays
    }))
  ]);

  const plan = buildRevenueAutopilotPlan({
    assetPortfolio,
    commandPlan: commandResult.plan,
    contentPlan: contentResult.plan,
    digitalPlan: digitalResult.plan,
    financialPlan: financialResult.plan,
    firstBusinessLaunchPlan: firstBusinessLaunchResult.plan,
    firstCashSprintPlan: firstCashSprintResult.plan,
    launchPlan: launchResult.plan,
    listingPlan: listingResult.plan,
    options,
    releasePlan: releaseResult.plan,
    revenuePlan,
    signalPlan,
    storeSetupPlan: storeSetupResult.plan
  });

  return {
    assetPortfolio,
    commandResult,
    contentResult,
    digitalResult,
    financialResult,
    firstBusinessLaunchResult,
    firstCashSprintResult,
    launchResult,
    listingResult,
    plan,
    releaseResult,
    revenuePlan,
    signalPlan,
    storeSetupResult
  };
}

async function buildRevenueAutopilotForUser(userId: string, options: RevenueAutopilotQueryInput): Promise<{
  plan: RevenueAutopilotPlan;
}> {
  const context = await buildRevenueAutopilotContextForUser(userId, options);

  return {
    plan: context.plan
  };
}

async function buildPlanForUser(userId: string, thresholds: RevenueEngineQueryInput): Promise<RevenueEnginePlan> {
  const stores = await loadPortfolioForUser(userId);
  const storeSnapshots = stores.map((store) => storeSnapshot(store));
  const productSnapshots = stores.flatMap((store) => store.products.map(productSnapshot));

  return buildRevenueEnginePlan({
    products: productSnapshots,
    stores: storeSnapshots,
    thresholds
  });
}

async function buildAssetPortfolioForUser(userId: string, thresholds: RevenueEngineQueryInput): Promise<RevenueAssetPortfolio> {
  const [plan, performance] = await Promise.all([
    buildPlanForUser(userId, thresholds),
    buildPerformanceDigestForUser(userId, revenuePerformanceQuerySchema.parse({}))
  ]);

  return mergeRevenueAssetPortfolioPerformance(buildRevenueAssetPortfolio(plan), performance.digest);
}

async function buildRevenueBusinessFleetSchedulerForUser(userId: string, options: RevenueBusinessFleetSchedulerQueryInput): Promise<{
  firstBusinessLaunchResult: Awaited<ReturnType<typeof buildFirstBusinessLaunchForUser>>;
  plan: RevenueBusinessFleetPlan;
}> {
  const [assetPortfolio, financialResult, firstBusinessLaunchResult] = await Promise.all([
    buildAssetPortfolioForUser(userId, revenueEngineQuerySchema.parse({})),
    buildFinancialOrchestratorForUser(userId, financialOrchestratorQuerySchema.parse({})),
    buildFirstBusinessLaunchForUser(userId, revenueFirstBusinessLaunchQuerySchema.parse({
      maxCandidates: Math.min(options.launchWaveSize, 25)
    }))
  ]);

  return {
    firstBusinessLaunchResult,
    plan: buildRevenueBusinessFleetSchedulerPlan({
      assetPortfolio,
      financialPlan: financialResult.plan,
      firstBusinessLaunchPlan: firstBusinessLaunchResult.plan,
      options
    })
  };
}

async function applyRevenueBusinessFleetLaunchWave(userId: string, input: ApplyRevenueBusinessFleetLaunchWaveInput) {
  const context = await buildRevenueBusinessFleetSchedulerForUser(userId, input);
  const selection = selectRevenueBusinessFleetLaunchWave({
    firstBusinessLaunchPlan: context.firstBusinessLaunchResult.plan,
    plan: context.plan,
    selectedBusinessIds: input.businessIds
  });

  if (selection.sprintActionIds.length === 0) {
    return {
      dispatched: {
        actionsBlocked: 0,
        actionsDispatched: 0,
        actionsPreviewed: 0,
        actionsSelected: 0,
        actionsSkipped: selection.skipped.length,
        dryRun: input.dryRun,
        externalExecution: false as const,
        providerContacted: false as const,
        results: [],
        summary: selection.summary
      },
      firstBusinessLaunch: context.firstBusinessLaunchResult.plan,
      fleet: context.plan,
      selectedSprintActionIds: [],
      selection,
      sprint: context.firstBusinessLaunchResult.firstCashSprintContext.plan
    };
  }

  const response = await applyRevenueFirstBusinessLaunch(userId, applyRevenueFirstBusinessLaunchSchema.parse({
    confirm: revenueFirstBusinessLaunchConfirmation,
    dryRun: input.dryRun,
    maxCandidates: Math.min(25, Math.max(selection.sprintActionIds.length, input.launchWaveSize)),
    note: input.note,
    sprintActionIds: selection.sprintActionIds
  }));
  const refreshed = input.dryRun ? context : await buildRevenueBusinessFleetSchedulerForUser(userId, input);

  return {
    dispatched: response.dispatched,
    firstBusinessLaunch: response.plan,
    fleet: refreshed.plan,
    selectedSprintActionIds: selection.sprintActionIds,
    selection,
    sprint: response.sprint
  };
}

async function buildRevenueBusinessFleetLaunchGapForUser(userId: string, options: RevenueBusinessFleetSchedulerQueryInput): Promise<{
  plan: RevenueBusinessFleetLaunchGapPlan;
}> {
  const context = await buildRevenueBusinessFleetSchedulerForUser(userId, options);

  return {
    plan: buildRevenueBusinessFleetLaunchGapPlan({
      plan: context.plan
    })
  };
}

function moneyArmySchedulerOptions(input: RevenueMoneyArmyBatchPipelineQueryInput | ApplyRevenueMoneyArmyBatchPipelineInput): RevenueBusinessFleetSchedulerQueryInput {
  return revenueBusinessFleetSchedulerQuerySchema.parse({
    killPressureThreshold: input.killPressureThreshold,
    launchWaveSize: input.launchWaveSize,
    maxParallelLaunches: input.maxParallelLaunches,
    maxParallelScaleActions: input.maxParallelScaleActions,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    targetBusinesses: input.targetBusinesses
  });
}

async function buildRevenueMoneyArmyBatchPipelineForUser(
  userId: string,
  input: RevenueMoneyArmyBatchPipelineQueryInput | ApplyRevenueMoneyArmyBatchPipelineInput
): Promise<{ plan: RevenueMoneyArmyBatchPipelinePlan }> {
  const context = await buildRevenueBusinessFleetSchedulerForUser(userId, moneyArmySchedulerOptions(input));
  const gapPlan = buildRevenueBusinessFleetLaunchGapPlan({
    plan: context.plan
  });
  const sourceKeys = input.sourceKeys ?? [];
  const [launchGate, providerApprovalReview] = sourceKeys.length > 0
    ? await Promise.all([
      buildRevenueBusinessFleetLaunchGateForUser(userId, revenueBusinessFleetLaunchGateQuerySchema.parse({
        maxStores: input.maxStores,
        sourceKeys
      })),
      buildRevenueBusinessFleetProviderApprovalReviewForUser(userId, revenueBusinessFleetProviderApprovalReviewQuerySchema.parse({
        maxPackets: input.maxPackets,
        maxStores: input.maxStores,
        sourceKeys,
        status: "all"
      }))
    ])
    : [null, null] as const;

  return {
    plan: buildRevenueMoneyArmyBatchPipelinePlan({
      approvableApprovalPackets: providerApprovalReview?.plan.totals.approvable ?? 0,
      approvedApprovalPackets: providerApprovalReview?.plan.totals.approved ?? 0,
      gapPlan,
      launchGate: launchGate
        ? {
          approvalNeeded: launchGate.plan.totals.approvalNeeded,
          blocked: launchGate.plan.totals.blocked,
          readyForManualLaunch: launchGate.plan.totals.readyForManualLaunch,
          repairRequired: launchGate.plan.totals.repairRequired
        }
        : null,
      pendingApprovalPackets: providerApprovalReview?.plan.totals.pending ?? 0,
      plan: context.plan,
      selectedSourceKeys: sourceKeys
    })
  };
}

function nextMoneyArmyStage(
  pipeline: RevenueMoneyArmyBatchPipelinePlan,
  requestedStage?: RevenueMoneyArmyBatchPipelineStageName
): RevenueMoneyArmyBatchPipelineStageName | null {
  if (requestedStage) {
    const requested = pipeline.stages.find((stage) => stage.name === requestedStage);

    return requested?.status === "ready" ? requested.name : null;
  }

  return pipeline.nextStage?.name ?? null;
}

type RevenueMoneyArmyBatchRunSnapshot = {
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

function moneyArmyBatchKey(input: {
  beforeTotals: RevenueMoneyArmyBatchPipelinePlan["totals"];
  sourceKeys: string[];
  stage: RevenueMoneyArmyBatchPipelineStageName;
  userId: string;
}) {
  return createHash("sha256").update(JSON.stringify({
    beforeTotals: input.beforeTotals,
    sourceKeys: [...input.sourceKeys].sort(),
    stage: input.stage,
    userId: input.userId
  })).digest("hex");
}

function moneyArmyBatchRunSnapshot(record: {
  afterTotalsJson: string;
  auditLogId: string | null;
  batchKey: string;
  beforeTotalsJson: string;
  createdAt: Date;
  dryRun: boolean;
  externalExecution: boolean;
  id: string;
  providerContacted: boolean;
  resultSummary: string;
  sourceKeysJson: string;
  stage: string;
  status: string;
}): RevenueMoneyArmyBatchRunSnapshot {
  return {
    afterTotals: parseSecureJson<RevenueMoneyArmyBatchPipelinePlan["totals"]>(record.afterTotalsJson) ?? {
      approvablePackets: 0,
      approvedPackets: 0,
      blockedStages: 0,
      currentBusinesses: 0,
      launchWaveGap: 0,
      pendingApprovalPackets: 0,
      readyDeploymentBusinesses: 0,
      readyStages: 0,
      repairRequired: 0,
      seedCandidates: 0,
      selectedSourceKeys: 0,
      stages: 0,
      targetBusinesses: 0,
      targetLaunchWave: 0
    },
    auditLogId: record.auditLogId,
    batchKey: record.batchKey,
    beforeTotals: parseSecureJson<RevenueMoneyArmyBatchPipelinePlan["totals"]>(record.beforeTotalsJson) ?? {
      approvablePackets: 0,
      approvedPackets: 0,
      blockedStages: 0,
      currentBusinesses: 0,
      launchWaveGap: 0,
      pendingApprovalPackets: 0,
      readyDeploymentBusinesses: 0,
      readyStages: 0,
      repairRequired: 0,
      seedCandidates: 0,
      selectedSourceKeys: 0,
      stages: 0,
      targetBusinesses: 0,
      targetLaunchWave: 0
    },
    createdAt: record.createdAt.toISOString(),
    dryRun: record.dryRun,
    externalExecution: false,
    id: record.id,
    providerContacted: false,
    resultSummary: record.resultSummary,
    sourceKeys: parseSecureJson<string[]>(record.sourceKeysJson) ?? [],
    stage: record.stage as RevenueMoneyArmyBatchPipelineStageName,
    status: record.status
  };
}

async function listRevenueMoneyArmyBatchRuns(userId: string, limit = 10): Promise<RevenueMoneyArmyBatchRunSnapshot[]> {
  const runs = await prisma.revenueMoneyArmyBatchRun.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 25),
    where: { userId }
  });

  return runs.map(moneyArmyBatchRunSnapshot);
}

async function applyRevenueMoneyArmyBatchPipeline(userId: string, input: ApplyRevenueMoneyArmyBatchPipelineInput) {
  const before = await buildRevenueMoneyArmyBatchPipelineForUser(userId, input);
  const stage = nextMoneyArmyStage(before.plan, input.stage);

  if (!stage) {
    return {
      applied: {
        auditLogId: null,
        batchRunId: null,
        dryRun: input.dryRun,
        externalExecution: false as const,
        providerContacted: false as const,
        stage: null,
        summary: "No Money Army batch pipeline stage is ready for internal execution."
      },
      before: before.plan,
      after: before.plan,
      batchRun: null,
      result: null
    };
  }

  const result = stage === "batch_creation"
    ? await applyRevenueBusinessFleetLaunchGapSeeds(userId, applyRevenueBusinessFleetSeedGapSchema.parse({
      ...input,
      confirm: "CREATE INTERNAL BUSINESS FLEET GAP SEEDS",
      maxSeeds: input.maxSeeds,
      podProvider: input.podProvider
    }))
    : stage === "batch_acceleration"
      ? await applyRevenueBusinessFleetGapAcceleration(userId, applyRevenueBusinessFleetGapAccelerationSchema.parse({
        ...input,
        confirm: "RUN INTERNAL BUSINESS FLEET GAP ACCELERATION"
      }))
      : stage === "launch_package"
        ? await applyRevenueBusinessFleetLiveLaunchPackage(userId, applyRevenueBusinessFleetLiveLaunchPackageSchema.parse({
          ...input,
          confirm: "RECORD INTERNAL BUSINESS FLEET LIVE LAUNCH PACKAGE"
        }))
        : stage === "approval"
          ? await applyRevenueBusinessFleetProviderApprovalReview(userId, applyRevenueBusinessFleetProviderApprovalReviewSchema.parse({
            ...input,
            confirm: "REVIEW INTERNAL BUSINESS FLEET PROVIDER APPROVALS"
          }))
          : await applyRevenueBusinessFleetLaunchWave(userId, applyRevenueBusinessFleetLaunchWaveSchema.parse({
            ...input,
            confirm: "RUN INTERNAL BUSINESS FLEET LAUNCH WAVE"
          }));
  const after = input.dryRun
    ? before
    : await buildRevenueMoneyArmyBatchPipelineForUser(userId, input);
  const auditLog = input.dryRun ? null : await recordAuditLog({
    action: "revenue.money_army_batch_pipeline.stage_applied",
    actorUserId: userId,
    metadata: {
      after: after.plan.totals,
      before: before.plan.totals,
      dryRun: false,
      externalExecution: false,
      note: input.note ?? null,
      providerContacted: false,
      result,
      selectedSourceKeys: input.sourceKeys,
      stage,
      summary: after.plan.summary
    },
    outcome: "success",
    severity: stage === "deployment" || stage === "approval" ? "medium" : "low",
    targetId: null,
    targetType: "revenue_money_army_batch_pipeline"
  });
  const appliedSummary = input.dryRun
    ? `Money Army ${stage.replace(/_/g, " ")} preview completed.`
    : `Money Army ${stage.replace(/_/g, " ")} recorded internally.`;
  const batchKey = moneyArmyBatchKey({
    beforeTotals: before.plan.totals,
    sourceKeys: input.sourceKeys,
    stage,
    userId
  });
  const batchRun = input.dryRun ? null : await prisma.revenueMoneyArmyBatchRun.upsert({
    create: {
      afterTotalsJson: stringifySecureJson(after.plan.totals),
      auditLogId: auditLog?.id ?? null,
      batchKey,
      beforeTotalsJson: stringifySecureJson(before.plan.totals),
      dryRun: false,
      externalExecution: false,
      providerContacted: false,
      resultJson: stringifySecureJson(result),
      resultSummary: appliedSummary,
      sourceKeysJson: stringifySecureJson(input.sourceKeys),
      stage,
      status: "recorded",
      userId
    },
    update: {
      afterTotalsJson: stringifySecureJson(after.plan.totals),
      auditLogId: auditLog?.id ?? null,
      externalExecution: false,
      providerContacted: false,
      resultJson: stringifySecureJson(result),
      resultSummary: appliedSummary,
      sourceKeysJson: stringifySecureJson(input.sourceKeys),
      status: "recorded"
    },
    where: { batchKey }
  });

  return {
    applied: {
      auditLogId: auditLog?.id ?? null,
      batchRunId: batchRun?.id ?? null,
      dryRun: input.dryRun,
      externalExecution: false as const,
      providerContacted: false as const,
      stage,
      summary: appliedSummary
    },
    after: after.plan,
    batchRun: batchRun ? moneyArmyBatchRunSnapshot(batchRun) : null,
    before: before.plan,
    result
  };
}

type RevenueOpportunityFactoryApplyResponse = Awaited<ReturnType<typeof applyRevenueOpportunityFactory>>;

type RevenueBusinessFleetGapSeedResult = {
  applied: RevenueOpportunityFactoryApplyResponse["applied"];
  businessName: string;
  plan: Pick<RevenueOpportunityFactoryApplyResponse["plan"], "nextInternalActions" | "summary" | "totals">;
  sourceKey: string;
  store: RevenueOpportunityFactoryApplyResponse["store"];
};

const revenueBusinessFleetGapSeedSourcePrefix = "entral-private-revenue-lane-";

function opportunityFactoryInputFromFleetSeed(
  seed: RevenueBusinessFleetOpportunitySeed,
  input: ApplyRevenueBusinessFleetSeedGapInput
): ApplyRevenueOpportunityFactoryInput {
  return applyRevenueOpportunityFactorySchema.parse({
    businessName: seed.businessName,
    confirm: revenueOpportunityFactoryConfirmation,
    dryRun: input.dryRun,
    idea: seed.idea,
    podProvider: input.podProvider,
    priceRange: seed.priceRange,
    productCount: seed.productCount,
    productTypes: seed.productTypes,
    riskTolerance: seed.riskTolerance,
    sourceKey: seed.sourceKey,
    storePlatform: seed.storePlatform
  });
}

async function applyRevenueBusinessFleetLaunchGapSeeds(userId: string, input: ApplyRevenueBusinessFleetSeedGapInput) {
  const context = await buildRevenueBusinessFleetSchedulerForUser(userId, input);
  const gapPlan = buildRevenueBusinessFleetLaunchGapPlan({
    plan: context.plan
  });
  const requestedSourceKeys = new Set(input.sourceKeys);
  const selectedSeeds = gapPlan.opportunitySeeds
    .filter((seed) => requestedSourceKeys.size === 0 || requestedSourceKeys.has(seed.sourceKey))
    .slice(0, input.maxSeeds);
  const results: RevenueBusinessFleetGapSeedResult[] = [];

  for (const seed of selectedSeeds) {
    const response = await applyRevenueOpportunityFactory(userId, opportunityFactoryInputFromFleetSeed(seed, input));

    results.push({
      applied: response.applied,
      businessName: seed.businessName,
      plan: {
        nextInternalActions: response.plan.nextInternalActions,
        summary: response.plan.summary,
        totals: response.plan.totals
      },
      sourceKey: seed.sourceKey,
      store: response.store
    });
  }

  const refreshedContext = input.dryRun
    ? context
    : await buildRevenueBusinessFleetSchedulerForUser(userId, input);
  const refreshedGapPlan = buildRevenueBusinessFleetLaunchGapPlan({
    plan: refreshedContext.plan
  });
  const productDraftsCreated = results.reduce((sum, result) => sum + result.applied.productDraftsCreated, 0);
  const skippedExistingProducts = results.reduce((sum, result) => sum + result.applied.skippedExistingProducts, 0);
  const storeShellsCreated = results.filter((result) => result.applied.storeCreated).length;
  const auditLog = input.dryRun ? null : await recordAuditLog({
    action: "revenue.business_fleet_gap_seeds.applied",
    actorUserId: userId,
    metadata: {
      dryRun: false,
      externalExecution: false,
      gapBefore: gapPlan.totals,
      gapAfter: refreshedGapPlan.totals,
      note: input.note ?? null,
      productDraftsCreated,
      providerContacted: false,
      results,
      selectedSourceKeys: selectedSeeds.map((seed) => seed.sourceKey),
      skippedExistingProducts,
      storeShellsCreated,
      summary: `${selectedSeeds.length} internal business-fleet gap seed${selectedSeeds.length === 1 ? "" : "s"} applied.`
    },
    outcome: "success",
    severity: selectedSeeds.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_business_fleet_gap_seed"
  });

  return {
    applied: {
      auditLogId: auditLog?.id ?? null,
      dryRun: input.dryRun,
      externalExecution: false,
      launchWaveGapAfter: refreshedGapPlan.totals.launchWaveGap,
      launchWaveGapBefore: gapPlan.totals.launchWaveGap,
      productDraftsCreated,
      providerContacted: false,
      seedsApplied: input.dryRun ? 0 : selectedSeeds.length,
      seedsPreviewed: input.dryRun ? selectedSeeds.length : 0,
      seedsSelected: selectedSeeds.length,
      skippedExistingProducts,
      storeShellsCreated,
      summary: selectedSeeds.length === 0
        ? "No internal opportunity seeds were selected from the current business-fleet launch gap."
        : input.dryRun
          ? `${selectedSeeds.length} internal opportunity seed${selectedSeeds.length === 1 ? "" : "s"} previewed from the business-fleet launch gap.`
          : `${selectedSeeds.length} internal opportunity seed${selectedSeeds.length === 1 ? "" : "s"} created from the business-fleet launch gap.`
    },
    fleet: refreshedContext.plan,
    gapPlan,
    refreshedGapPlan,
    results
  };
}

type RevenueBusinessFleetSourceKeyStoreInput = Pick<ApplyRevenueBusinessFleetGapAccelerationInput, "maxStores" | "sourceKeys">;

async function loadRevenueBusinessFleetGapSeedStores(userId: string, input: RevenueBusinessFleetSourceKeyStoreInput) {
  const sourceKeyFilter: Prisma.StringFilter = input.sourceKeys.length > 0
    ? { in: input.sourceKeys }
    : { startsWith: revenueBusinessFleetGapSeedSourcePrefix };
  const opportunities = await prisma.revenueOpportunity.findMany({
    orderBy: { updatedAt: "desc" },
    take: input.maxStores,
    where: {
      sourceKey: sourceKeyFilter,
      storeId: { not: null },
      userId
    }
  });
  const sourceKeys = opportunities.map((opportunity) => opportunity.sourceKey);
  const storeIds = new Set(opportunities.map((opportunity) => opportunity.storeId).filter((storeId): storeId is string => Boolean(storeId)));
  const stores = storeIds.size > 0
    ? (await loadPortfolioForUser(userId)).filter((store) => storeIds.has(store.id))
    : [];

  return {
    sourceKeys,
    stores
  };
}

function sourceKeyForFleetGapSeedStore(store: StoreRecord, sourceKeys: string[]) {
  const notes = (store as StoreRecord & { notes?: string | null }).notes ?? "";

  return sourceKeys.find((sourceKey) => notes.includes(sourceKey)) ?? null;
}

function previewListingOptimizationApply(plan: RevenueListingOptimizationPlan) {
  return {
    productUpdates: plan.experiments.map((experiment) => ({
      fromStatus: experiment.currentListing.title ? "Existing listing draft" : "Missing listing copy",
      productId: experiment.productId,
      productName: experiment.productName,
      recommendedVariantId: experiment.recommendedVariant.id,
      storeId: experiment.storeId,
      toStatus: experiment.recommendedInternalStatus
    }))
  };
}

function countedResult(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "number") return value;

  return 0;
}

async function buildRevenueBusinessFleetGapAccelerationPlans(userId: string, stores: StoreRecord[]) {
  const productSnapshots = stores.flatMap((store) => store.products.map(productSnapshot));
  const performance = await buildPerformanceDigestForUser(userId, revenuePerformanceQuerySchema.parse({
    windowDays: 30
  }));
  const launchPipeline = buildRevenueLaunchPipeline({
    options: revenueLaunchPipelineQuerySchema.parse({
      maxStores: Math.min(25, Math.max(stores.length, 1)),
      minPortfolioProductsPerStore: 5,
      productCount: 5,
      riskTolerance: "Low"
    }),
    products: stores.flatMap((store) => store.products.map(launchProductSnapshot)),
    stores: stores.map(launchStoreSnapshot)
  });
  const listingOptimization = buildRevenueListingOptimizationPlan({
    options: revenueListingOptimizationQuerySchema.parse({
      maxProducts: 100,
      variantsPerProduct: 3,
      windowDays: 30
    }),
    performanceDigest: performance.digest,
    products: productSnapshots,
    stores: stores.map(storeSnapshot)
  });
  const storeSetup = buildRevenueStoreSetupPlan({
    options: revenueStoreSetupQuerySchema.parse({
      maxStores: Math.min(25, Math.max(stores.length, 1))
    }),
    products: productSnapshots,
    stores: stores.map(storeSnapshot)
  });

  return {
    launchPipeline,
    listingOptimization,
    storeSetup
  };
}

async function applyRevenueBusinessFleetGapAcceleration(userId: string, input: ApplyRevenueBusinessFleetGapAccelerationInput) {
  const targeted = await loadRevenueBusinessFleetGapSeedStores(userId, input);
  let stores = targeted.stores;
  let plans = await buildRevenueBusinessFleetGapAccelerationPlans(userId, stores);
  const launchPipeline = input.includeLaunchPipeline
    ? input.dryRun
      ? previewLaunchPipelineApply(plans.launchPipeline)
      : await applyLaunchPipeline(userId, stores, plans.launchPipeline)
    : { approvalPackets: [], createdProducts: [], storeUpdates: [] };

  if (!input.dryRun && input.includeLaunchPipeline) {
    const storeIds = new Set(stores.map((store) => store.id));
    stores = (await loadPortfolioForUser(userId)).filter((store) => storeIds.has(store.id));
    plans = await buildRevenueBusinessFleetGapAccelerationPlans(userId, stores);
  }

  const listingOptimization = input.includeListingOptimization
    ? input.dryRun
      ? previewListingOptimizationApply(plans.listingOptimization)
      : await applyListingOptimization(userId, plans.listingOptimization)
    : { productUpdates: [] };

  if (!input.dryRun && input.includeListingOptimization) {
    const storeIds = new Set(stores.map((store) => store.id));
    stores = (await loadPortfolioForUser(userId)).filter((store) => storeIds.has(store.id));
    plans = await buildRevenueBusinessFleetGapAccelerationPlans(userId, stores);
  }

  const storeSetup = input.includeStoreSetup
    ? input.dryRun
      ? { storeUpdates: storeSetupUpdatesFrom(plans.storeSetup, stores) }
      : await applyStoreSetup(userId, plans.storeSetup, stores)
    : { storeUpdates: [] };
  const auditLog = input.dryRun ? null : await recordAuditLog({
    action: "revenue.business_fleet_gap_acceleration.applied",
    actorUserId: userId,
    metadata: {
      dryRun: false,
      externalExecution: false,
      includeLaunchPipeline: input.includeLaunchPipeline,
      includeListingOptimization: input.includeListingOptimization,
      includeStoreSetup: input.includeStoreSetup,
      launchPipeline,
      listingOptimization,
      note: input.note ?? null,
      providerContacted: false,
      sourceKeys: targeted.sourceKeys,
      storeSetup,
      stores: stores.map((store) => ({
        businessName: store.businessName,
        id: store.id,
        launchStatus: launchStatusFromDb[store.launchStatus]
      }))
    },
    outcome: "success",
    severity: stores.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_business_fleet_gap_acceleration"
  });
  const refreshedFleet = await buildRevenueBusinessFleetSchedulerForUser(userId, revenueBusinessFleetSchedulerQuerySchema.parse({}));
  const launchProductsCreated = countedResult(launchPipeline.createdProducts);
  const approvalPacketsQueued = countedResult(launchPipeline.approvalPackets);
  const listingProductsUpdated = countedResult(listingOptimization.productUpdates);
  const storeSetupUpdates = countedResult(storeSetup.storeUpdates);

  return {
    applied: {
      approvalPacketsQueued,
      auditLogId: auditLog?.id ?? null,
      dryRun: input.dryRun,
      externalExecution: false as const,
      launchProductsCreated,
      launchQueueItems: input.includeLaunchPipeline ? plans.launchPipeline.queue.length : 0,
      listingExperimentsQueued: input.includeListingOptimization ? plans.listingOptimization.experiments.length : 0,
      listingProductsUpdated,
      providerContacted: false as const,
      sourceKeysTargeted: targeted.sourceKeys.length,
      storeSetupRunbooks: input.includeStoreSetup ? plans.storeSetup.runbooks.length : 0,
      storeSetupUpdates,
      storesTargeted: stores.length,
      summary: stores.length === 0
        ? "No created business-fleet gap seed stores were found for acceleration."
        : input.dryRun
          ? `${stores.length} gap-seeded store${stores.length === 1 ? "" : "s"} previewed for internal launch/listing/setup acceleration.`
          : `${stores.length} gap-seeded store${stores.length === 1 ? "" : "s"} accelerated through internal launch/listing/setup queues.`
    },
    fleet: refreshedFleet.plan,
    plans,
    results: {
      launchPipeline,
      listingOptimization,
      storeSetup
    },
    targetedStores: stores.map((store) => ({
      businessName: store.businessName,
      id: store.id,
      launchStatus: launchStatusFromDb[store.launchStatus],
      products: store.products.length,
      sourceKey: targeted.sourceKeys.find((sourceKey) => store.notes?.includes(sourceKey)) ?? null
    }))
  };
}

function previewProviderApprovalSnapshot(input: {
  packet: GrowthApprovalPacket;
  storeId: string;
}): RevenueLaunchReadinessApprovalSnapshot {
  return {
    createdAt: input.packet.createdAt,
    id: input.packet.id,
    packet: input.packet,
    requestAuditLogId: null,
    reviewAuditLogId: null,
    reviewedAt: null,
    status: "pending",
    storeId: input.storeId
  };
}

async function buildRevenueBusinessFleetLiveLaunchPackagePlans(input: {
  approvals: RevenueLaunchReadinessApprovalSnapshot[];
  includeHandoffPackets: boolean;
  includeOperationsPacks: boolean;
  options: {
    maxStores: number;
  };
  providerPayloads: ReturnType<typeof buildProviderPayloadPackage>[];
  stores: StoreRecord[];
  userId: string;
}) {
  const maxStores = Math.min(input.options.maxStores, Math.max(input.stores.length, 1));
  const launchPipeline = buildRevenueLaunchPipeline({
    options: revenueLaunchPipelineQuerySchema.parse({
      maxStores,
      minPortfolioProductsPerStore: 5,
      productCount: 5,
      riskTolerance: "Low"
    }),
    products: input.stores.flatMap((store) => store.products.map(launchProductSnapshot)),
    stores: input.stores.map(launchStoreSnapshot)
  });
  const storeSetup = buildRevenueStoreSetupPlan({
    options: revenueStoreSetupQuerySchema.parse({
      maxStores
    }),
    products: input.stores.flatMap((store) => store.products.map(productSnapshot)),
    stores: input.stores.map(storeSnapshot)
  });
  const readinessPlan = buildRevenueLaunchReadinessPlan({
    approvals: input.approvals,
    launchPlan: launchPipeline,
    options: revenueLaunchReadinessQuerySchema.parse({
      includeApprovalHistory: true,
      maxStores
    }),
    providerPayloads: input.providerPayloads,
    setupPlan: storeSetup,
    stores: input.stores.map(launchReadinessStoreSnapshot)
  });
  const persistedPackets = input.includeHandoffPackets
    ? await loadLaunchHandoffRecordsForUser(input.userId, maxStores * 5)
    : [];
  const handoffPlan = input.includeHandoffPackets
    ? buildRevenueLaunchHandoffPlan({
      approvals: input.approvals,
      options: revenueLaunchHandoffQuerySchema.parse({
        includeBlocked: true,
        maxBundles: maxStores
      }),
      persistedPackets,
      providerPayloads: input.providerPayloads,
      readinessPlan
    })
    : null;
  const checklistPlan = input.includeOperationsPacks
    ? await buildRevenueLaunchChecklistForUser(input.userId, revenueLaunchChecklistQuerySchema.parse({
      includeCompleted: true,
      maxItems: Math.min(maxStores * 5, 100),
      minPriorityScore: 0,
      windowDays: 30
    }))
    : null;
  const operationsPackPlan = input.includeOperationsPacks && handoffPlan && checklistPlan
    ? buildRevenueLaunchOperationsPackPlan({
      checklistPlan,
      handoffPlan,
      options: revenueLaunchOperationsPackQuerySchema.parse({
        includeBlocked: true,
        maxPacks: maxStores
      })
    })
    : null;

  return {
    handoffPlan,
    launchPipeline,
    operationsPackPlan,
    readinessPlan,
    storeSetup
  };
}

async function applyRevenueBusinessFleetLiveLaunchPackage(userId: string, input: ApplyRevenueBusinessFleetLiveLaunchPackageInput) {
  const targeted = await loadRevenueBusinessFleetGapSeedStores(userId, input);
  const stores = targeted.stores;
  const storeIds = stores.map((store) => store.id);
  const providerPayloads = stores.map((store) => buildProviderPayloadPackage({
    options: {
      includeUnapproved: input.includeUnapproved,
      maxProducts: 5
    },
    products: store.products.map(providerMerchProductSnapshot),
    store: providerMerchStoreSnapshot(store),
    storeId: store.id
  }));
  const approvalPackets = input.includeProviderApprovals
    ? providerPayloads.map((providerPackage) => buildProviderPayloadApprovalPacket({
      note: input.note,
      package: providerPackage,
      scheduledFor: null,
      storeId: providerPackage.store.storeId
    }))
    : [];
  const existingApprovals = storeIds.length > 0
    ? await prisma.growthApprovalPacket.findMany({
      orderBy: { createdAt: "desc" },
      take: input.maxStores * 10,
      where: {
        storeId: { in: storeIds },
        userId
      }
    })
    : [];
  const queuedApprovalSnapshots: RevenueLaunchReadinessApprovalSnapshot[] = [];
  const auditLogIds: string[] = [];

  if (!input.dryRun && input.includeProviderApprovals) {
    const packagesByStoreId = new Map(providerPayloads.map((providerPackage) => [providerPackage.store.storeId, providerPackage]));

    for (const packet of approvalPackets) {
      const providerPackage = packagesByStoreId.get(packet.storeId);
      const record = await prisma.growthApprovalPacket.create({
        data: {
          mode: packet.mode,
          packetJson: stringifySecureJson(packet),
          scheduledFor: packet.scheduledFor ? new Date(packet.scheduledFor) : null,
          status: "pending",
          storeId: packet.storeId,
          userId
        }
      });
      const store = stores.find((item) => item.id === packet.storeId);
      const auditLog = await recordAuditLog({
        action: "provider_payload.approval.requested",
        actorUserId: userId,
        metadata: {
          packet,
          packetId: record.id,
          providerPackage: providerPackage
            ? {
              adapterCoverage: providerPackage.adapterCoverage,
              payloadCount: providerPackage.payloadCount,
              providerContacted: providerPackage.providerContacted,
              readinessScore: providerPackage.readinessScore
            }
            : null,
          source: "revenue.business_fleet_live_launch_package",
          store: store
            ? {
              businessName: store.businessName,
              platform: storePlatformFromDb[store.storePlatform],
              podProvider: podProviderFromDb[store.podProvider]
            }
            : null
        },
        outcome: "success",
        severity: providerPackage && providerPackage.payloadCount > 0 ? "medium" : "low",
        targetId: packet.storeId,
        targetType: "provider_payload_package"
      });
      const approval = await prisma.growthApprovalPacket.update({
        data: {
          requestAuditLogId: auditLog.id
        },
        where: {
          id: record.id
        }
      });

      auditLogIds.push(auditLog.id);
      queuedApprovalSnapshots.push(launchReadinessApprovalSnapshot(approval));
    }
  } else {
    queuedApprovalSnapshots.push(...approvalPackets.map((packet) => previewProviderApprovalSnapshot({
      packet,
      storeId: packet.storeId
    })));
  }

  const approvals = [
    ...queuedApprovalSnapshots,
    ...existingApprovals.map(launchReadinessApprovalSnapshot)
  ];
  const plans = await buildRevenueBusinessFleetLiveLaunchPackagePlans({
    approvals,
    includeHandoffPackets: input.includeHandoffPackets,
    includeOperationsPacks: input.includeOperationsPacks,
    options: {
      maxStores: input.maxStores
    },
    providerPayloads,
    stores,
    userId
  });
  const handoffResult = input.includeHandoffPackets && plans.handoffPlan
    ? await applyRevenueLaunchHandoff(userId, plans.handoffPlan, applyRevenueLaunchHandoffSchema.parse({
      confirm: "RECORD INTERNAL LAUNCH HANDOFF PACKETS",
      dryRun: input.dryRun,
      includeBlocked: true,
      maxBundles: Math.min(input.maxStores, Math.max(stores.length, 1))
    }))
    : null;
  const selectedOperationsPacks = input.includeOperationsPacks && plans.operationsPackPlan
    ? selectRevenueLaunchOperationsPacks(plans.operationsPackPlan, storeIds)
    : [];
  const operationsAuditLog = input.dryRun || !input.includeOperationsPacks || !plans.operationsPackPlan ? null : await recordAuditLog({
    action: "revenue.launch_operations_pack.recorded",
    actorUserId: userId,
    metadata: {
      blockedExternalActions: plans.operationsPackPlan.blockedExternalActions,
      externalExecution: false,
      note: input.note ?? null,
      packs: selectedOperationsPacks.map((pack) => ({
        artifactSlots: pack.artifactSlots.length,
        credentialScopes: pack.credentialScopes,
        manualSteps: pack.manualSteps.length,
        requestManifests: pack.requestManifests.length,
        status: pack.status,
        storeId: pack.storeId,
        storeName: pack.storeName
      })),
      providerContacted: false,
      source: "revenue.business_fleet_live_launch_package",
      summary: plans.operationsPackPlan.summary
    },
    outcome: "success",
    severity: selectedOperationsPacks.some((pack) => pack.status === "blocked") ? "high" : selectedOperationsPacks.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_launch_operations_pack"
  });
  const operationsResult = input.includeOperationsPacks && plans.operationsPackPlan
    ? {
      applied: {
        auditLogId: operationsAuditLog?.id ?? null,
        dryRun: input.dryRun,
        externalExecution: false as const,
        packsRecorded: input.dryRun ? 0 : selectedOperationsPacks.length,
        packsSelected: selectedOperationsPacks.length,
        providerContacted: false as const,
        readyPacks: selectedOperationsPacks.filter((pack) => pack.status === "ready_for_manual_launch").length,
        summary: input.dryRun
          ? `${selectedOperationsPacks.length} targeted launch operations pack${selectedOperationsPacks.length === 1 ? "" : "s"} would be recorded as internal audit artifacts.`
          : `${selectedOperationsPacks.length} targeted launch operations pack${selectedOperationsPacks.length === 1 ? "" : "s"} recorded as internal audit artifacts.`
      },
      plan: plans.operationsPackPlan
    }
    : null;
  const auditLog = input.dryRun ? null : await recordAuditLog({
    action: "revenue.business_fleet_live_launch_package.recorded",
    actorUserId: userId,
    metadata: {
      dryRun: false,
      externalExecution: false,
      handoffRecords: handoffResult?.recordsCreated ?? 0,
      includeHandoffPackets: input.includeHandoffPackets,
      includeOperationsPacks: input.includeOperationsPacks,
      includeProviderApprovals: input.includeProviderApprovals,
      includeUnapproved: input.includeUnapproved,
      note: input.note ?? null,
      operationsPacks: operationsResult?.applied.packsRecorded ?? 0,
      providerApprovalAuditLogIds: auditLogIds,
      providerApprovalsQueued: queuedApprovalSnapshots.length,
      providerContacted: false,
      sourceKeys: targeted.sourceKeys,
      stores: stores.map((store) => ({
        businessName: store.businessName,
        id: store.id,
        launchStatus: launchStatusFromDb[store.launchStatus],
        sourceKey: sourceKeyForFleetGapSeedStore(store, targeted.sourceKeys)
      }))
    },
    outcome: "success",
    severity: stores.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_business_fleet_live_launch_package"
  });
  const refreshedFleet = await buildRevenueBusinessFleetSchedulerForUser(userId, revenueBusinessFleetSchedulerQuerySchema.parse({}));

  return {
    applied: {
      auditLogId: auditLog?.id ?? null,
      dryRun: input.dryRun,
      externalExecution: false as const,
      handoffRecords: handoffResult?.recordsCreated ?? 0,
      handoffRecordsPreviewed: input.dryRun ? handoffResult?.recordsToWrite ?? 0 : 0,
      operationsPacksRecorded: operationsResult?.applied.packsRecorded ?? 0,
      operationsPacksSelected: operationsResult?.applied.packsSelected ?? 0,
      providerApprovalPacketsPreviewed: input.dryRun ? approvalPackets.length : 0,
      providerApprovalPacketsQueued: input.dryRun ? 0 : queuedApprovalSnapshots.length,
      providerContacted: false as const,
      providerPayloadsPrepared: providerPayloads.length,
      readyOperationsPacks: operationsResult?.applied.readyPacks ?? 0,
      sourceKeysTargeted: targeted.sourceKeys.length,
      storesTargeted: stores.length,
      summary: stores.length === 0
        ? "No created business-fleet gap seed stores were found for live launch packaging."
        : input.dryRun
          ? `${stores.length} gap-seeded store${stores.length === 1 ? "" : "s"} previewed for internal live launch packaging.`
          : `${stores.length} gap-seeded store${stores.length === 1 ? "" : "s"} recorded into internal live launch package artifacts.`
    },
    fleet: refreshedFleet.plan,
    plans,
    providerApprovalSnapshots: queuedApprovalSnapshots,
    providerPayloads,
    results: {
      handoff: handoffResult,
      operationsPack: operationsResult
    },
    targetedStores: stores.map((store) => ({
      businessName: store.businessName,
      id: store.id,
      launchStatus: launchStatusFromDb[store.launchStatus],
      products: store.products.length,
      sourceKey: sourceKeyForFleetGapSeedStore(store, targeted.sourceKeys)
    }))
  };
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function revenueBusinessFleetLaunchGateItem(input: {
  operationsPack: ReturnType<typeof selectRevenueLaunchOperationsPacks>[number] | null;
  readinessItem: RevenueLaunchReadinessPlan["stores"][number] | null;
  sourceKey: string | null;
  store: StoreRecord;
}) {
  const { operationsPack, readinessItem, store } = input;
  const providerPayloadCount = readinessItem?.providerPayload.payloadCount ?? 0;
  const providerReadinessScore = readinessItem?.providerPayload.readinessScore ?? 0;
  const launchReadinessScore = readinessItem?.readinessScore ?? 0;
  const blockers = uniqueStrings([
    ...(readinessItem?.blockers.map((blocker) => blocker.title) ?? []),
    ...(operationsPack?.blockers.map((blocker) => blocker.title) ?? [])
  ]);
  const highBlockers = [
    ...(readinessItem?.blockers ?? []),
    ...(operationsPack?.blockers ?? [])
  ].filter((blocker) => blocker.severity === "high");
  const approvalState = readinessItem?.approvalState ?? {
    approvedPackets: 0,
    latestProviderApprovalId: null,
    pendingPackets: 0,
    providerApprovalApproved: false,
    providerApprovalPending: false,
    rejectedPackets: 0,
    totalPackets: 0
  };
  const gateStatus = operationsPack?.status === "ready_for_manual_launch" && approvalState.providerApprovalApproved
    ? "ready_for_manual_launch"
    : providerPayloadCount === 0 || providerReadinessScore < 60 || launchReadinessScore < 55
      ? "repair_required"
      : approvalState.providerApprovalPending || !approvalState.providerApprovalApproved
        ? "approval_needed"
        : highBlockers.length > 0 || operationsPack?.status === "blocked"
          ? "blocked"
          : "repair_required";
  const nextInternalAction = gateStatus === "ready_for_manual_launch"
    ? {
      endpoint: "/merch/revenue-engine/launch-operations-pack",
      label: "Manual launch review",
      state: "ready_for_manual_launch"
    }
    : gateStatus === "approval_needed"
      ? {
        endpoint: "/merch/stores/:storeId/growth-approvals",
        label: approvalState.providerApprovalPending ? "Review provider approval" : "Record live launch package",
        state: approvalState.providerApprovalPending ? "provider_approval_pending" : "provider_approval_missing"
      }
      : gateStatus === "blocked"
        ? {
          endpoint: "/merch/revenue-engine/launch-readiness",
          label: "Resolve launch blockers",
          state: "blocked_review"
        }
        : {
          endpoint: readinessItem?.nextInternalAction === "optimize_listings"
            ? "/merch/revenue-engine/listing-optimization"
            : readinessItem?.nextInternalAction === "seed_product_drafts"
              ? "/merch/revenue-engine/launch-pipeline"
              : "/merch/revenue-engine/launch-readiness",
          label: readinessItem?.nextInternalAction?.replace(/_/g, " ") ?? "Repair launch package",
          state: readinessItem?.stage ?? "repair_required"
        };
  const reason = gateStatus === "ready_for_manual_launch"
    ? operationsPack?.summary ?? "Operations pack is ready for manual launch review."
    : gateStatus === "approval_needed"
      ? approvalState.providerApprovalPending
        ? "Provider payload approval is pending before handoff can become launch-ready."
        : "No approved provider payload packet is available for this lane."
      : blockers[0] ?? readinessItem?.summary ?? "Launch package needs repair before manual launch.";

  return {
    approvalState,
    blockers,
    businessName: store.businessName,
    externalExecution: false as const,
    gateStatus,
    launchReadinessScore,
    launchStatus: launchStatusFromDb[store.launchStatus],
    nextInternalAction,
    operationsPackStatus: operationsPack?.status ?? null,
    productCount: store.products.length,
    providerContacted: false as const,
    providerPayloadCount,
    providerReadinessScore,
    reason,
    readinessStage: readinessItem?.stage ?? "blocked",
    sourceKey: input.sourceKey,
    storeId: store.id
  };
}

async function buildRevenueBusinessFleetLaunchGateForUser(userId: string, input: RevenueBusinessFleetLaunchGateQueryInput) {
  const targeted = await loadRevenueBusinessFleetGapSeedStores(userId, input);
  const stores = targeted.stores;
  const storeIds = stores.map((store) => store.id);
  const providerPayloads = stores.map((store) => buildProviderPayloadPackage({
    options: {
      includeUnapproved: false,
      maxProducts: 5
    },
    products: store.products.map(providerMerchProductSnapshot),
    store: providerMerchStoreSnapshot(store),
    storeId: store.id
  }));
  const approvals = storeIds.length > 0
    ? await prisma.growthApprovalPacket.findMany({
      orderBy: { createdAt: "desc" },
      take: input.maxStores * 10,
      where: {
        storeId: { in: storeIds },
        userId
      }
    })
    : [];
  const plans = await buildRevenueBusinessFleetLiveLaunchPackagePlans({
    approvals: approvals.map(launchReadinessApprovalSnapshot),
    includeHandoffPackets: true,
    includeOperationsPacks: true,
    options: {
      maxStores: input.maxStores
    },
    providerPayloads,
    stores,
    userId
  });
  const operationsPacks = plans.operationsPackPlan
    ? selectRevenueLaunchOperationsPacks(plans.operationsPackPlan, storeIds)
    : [];
  const items = stores.map((store) => revenueBusinessFleetLaunchGateItem({
    operationsPack: operationsPacks.find((pack) => pack.storeId === store.id) ?? null,
    readinessItem: plans.readinessPlan.stores.find((item) => item.store.id === store.id) ?? null,
    sourceKey: sourceKeyForFleetGapSeedStore(store, targeted.sourceKeys),
    store
  }));
  const statusCounts = {
    approvalNeeded: items.filter((item) => item.gateStatus === "approval_needed").length,
    blocked: items.filter((item) => item.gateStatus === "blocked").length,
    readyForManualLaunch: items.filter((item) => item.gateStatus === "ready_for_manual_launch").length,
    repairRequired: items.filter((item) => item.gateStatus === "repair_required").length
  };

  return {
    plan: {
      auditEvents: [
        "Business fleet launch gate evaluated packaged seed lanes.",
        "Gate statuses are advisory and read-only.",
        "No provider, marketplace, payment, social, ad, browser, or external write action was executed."
      ],
      blockedExternalActions: uniqueStrings([
        ...plans.readinessPlan.blockedExternalActions,
        ...(plans.operationsPackPlan?.blockedExternalActions ?? [])
      ]),
      externalExecution: false as const,
      generatedAt: new Date().toISOString(),
      items,
      mode: "Revenue Business Fleet Launch Gate",
      plans: {
        handoffTotals: plans.handoffPlan?.totals ?? null,
        operationsPackTotals: plans.operationsPackPlan?.totals ?? null,
        readinessTotals: plans.readinessPlan.totals
      },
      providerContacted: false as const,
      statusCounts,
      summary: `${items.length} packaged business lane${items.length === 1 ? "" : "s"} evaluated: ${statusCounts.readyForManualLaunch} ready for manual launch, ${statusCounts.approvalNeeded} need approval, ${statusCounts.repairRequired} need repair, ${statusCounts.blocked} blocked.`,
      targetedSourceKeys: targeted.sourceKeys,
      totals: {
        handoffRecordsOpen: plans.handoffPlan?.totals.openPacketRecords ?? 0,
        operationsPacks: plans.operationsPackPlan?.totals.packs ?? 0,
        operationsReady: plans.operationsPackPlan?.totals.readyPacks ?? 0,
        payloadsPrepared: plans.readinessPlan.totals.payloadsPrepared,
        providerPacketsApproved: plans.readinessPlan.totals.approvedProviderPackets,
        providerPacketsPending: items.filter((item) => item.approvalState.providerApprovalPending).length,
        storesEvaluated: items.length,
        ...statusCounts
      }
    }
  };
}

function businessFleetProviderApprovalStatusLabel(status: string) {
  if (status === "approved") return "Approved - execution still locked";
  if (status === "rejected") return "Rejected";
  return "Pending approval";
}

function businessFleetProviderApprovalReviewItem(input: {
  record: {
    createdAt: Date;
    id: string;
    packetJson: string;
    requestAuditLogId: string | null;
    reviewAuditLogId: string | null;
    reviewedAt: Date | null;
    reviewedById: string | null;
    reviewNote: string | null;
    scheduledFor: Date | null;
    status: string;
    storeId: string;
    updatedAt: Date;
  };
  sourceKey: string | null;
  store: StoreRecord;
}) {
  const packet = parseSecureJson<GrowthApprovalPacket>(input.record.packetJson);

  if (!packet || !isProviderPayloadApprovalPacket(packet)) {
    return null;
  }

  const payloadCount = packet.providerPayloadPackage.payloadCount;
  const readinessScore = packet.providerPayloadPackage.readinessScore;
  const canApprove = input.record.status === "pending" && payloadCount > 0;
  const canReject = input.record.status === "pending";
  const nextInternalState = input.record.status === "approved"
    ? "approved_for_manual_handoff"
    : input.record.status === "rejected"
      ? "rejected_rebuild_provider_payload"
      : canApprove
        ? "ready_for_batch_approval"
        : "watch_repair_empty_payload";
  const reason = input.record.status === "approved"
    ? "Provider payload packet is approved internally; external execution remains locked."
    : input.record.status === "rejected"
      ? "Provider payload packet was rejected and should be rebuilt before handoff."
      : canApprove
        ? `${payloadCount} provider payload draft${payloadCount === 1 ? "" : "s"} are ready for internal approval review.`
        : "Packet is pending but has no provider payload drafts, so it should be watched or repaired before approval.";

  return {
    actionCount: packet.actions.length,
    adapterCoverage: packet.providerPayloadPackage.adapterCoverage,
    auditLogId: input.record.requestAuditLogId,
    blockedActions: packet.blockedActions,
    businessName: input.store.businessName,
    canApprove,
    canReject,
    createdAt: input.record.createdAt.toISOString(),
    externalExecution: false as const,
    mode: packet.mode,
    nextInternalState,
    packetId: input.record.id,
    payloadCount,
    providerContacted: false as const,
    readinessScore,
    reason,
    requestAuditLogId: input.record.requestAuditLogId,
    reviewAuditLogId: input.record.reviewAuditLogId,
    reviewedAt: input.record.reviewedAt?.toISOString() ?? null,
    reviewedById: input.record.reviewedById,
    reviewNote: input.record.reviewNote,
    scheduledFor: input.record.scheduledFor?.toISOString() ?? null,
    sourceKey: input.sourceKey,
    status: input.record.status,
    statusLabel: businessFleetProviderApprovalStatusLabel(input.record.status),
    storeId: input.record.storeId,
    summary: packet.providerPayloadPackage.summary,
    updatedAt: input.record.updatedAt.toISOString()
  };
}

async function buildRevenueBusinessFleetProviderApprovalReviewForUser(
  userId: string,
  input: RevenueBusinessFleetProviderApprovalReviewQueryInput
) {
  const targeted = await loadRevenueBusinessFleetGapSeedStores(userId, input);
  const stores = targeted.stores;
  const storeById = new Map(stores.map((store) => [store.id, store]));
  const sourceKeyByStoreId = new Map(stores.map((store) => [store.id, sourceKeyForFleetGapSeedStore(store, targeted.sourceKeys)]));
  const storeIds = stores.map((store) => store.id);
  const approvalWhere: Prisma.GrowthApprovalPacketWhereInput = {
    storeId: { in: storeIds },
    userId
  };

  if (input.status !== "all") {
    approvalWhere.status = input.status;
  }

  const records = storeIds.length > 0
    ? await prisma.growthApprovalPacket.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.max(input.maxPackets * 3, input.maxStores * 10),
      where: approvalWhere
    })
    : [];
  const items = records
    .map((record) => {
      const store = storeById.get(record.storeId);

      if (!store) return null;

      return businessFleetProviderApprovalReviewItem({
        record,
        sourceKey: sourceKeyByStoreId.get(record.storeId) ?? null,
        store
      });
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, input.maxPackets);
  const totals = {
    approvable: items.filter((item) => item.canApprove).length,
    approved: items.filter((item) => item.status === "approved").length,
    packets: items.length,
    payloads: items.reduce((sum, item) => sum + item.payloadCount, 0),
    pending: items.filter((item) => item.status === "pending").length,
    rejected: items.filter((item) => item.status === "rejected").length,
    storesEvaluated: stores.length
  };

  return {
    plan: {
      auditEvents: [
        "Business fleet provider approval packets inspected for batch review.",
        "Approvals are internal records only and do not execute provider payloads.",
        "No provider, marketplace, payment, social, ad, browser, or external write action was executed."
      ],
      blockedExternalActions: [
        "Calling Printify, Printful, Etsy, Shopify, payment, ad, social, or browser automation write APIs",
        "Publishing or editing stores, listings, products, collections, themes, payouts, or uploads",
        "Using browser stealth, anti-detection, or platform-evasion automation"
      ],
      externalExecution: false as const,
      generatedAt: new Date().toISOString(),
      items,
      mode: "Revenue Business Fleet Provider Approval Review",
      providerContacted: false as const,
      statusFilter: input.status,
      summary: `${items.length} provider approval packet${items.length === 1 ? "" : "s"} inspected: ${totals.approvable} approvable, ${totals.pending} pending, ${totals.approved} approved, ${totals.rejected} rejected.`,
      targetedSourceKeys: targeted.sourceKeys,
      totals
    }
  };
}

async function applyRevenueBusinessFleetProviderApprovalReview(
  userId: string,
  input: ApplyRevenueBusinessFleetProviderApprovalReviewInput
) {
  const review = await buildRevenueBusinessFleetProviderApprovalReviewForUser(userId, revenueBusinessFleetProviderApprovalReviewQuerySchema.parse({
    maxPackets: input.maxPackets,
    maxStores: input.maxStores,
    sourceKeys: input.sourceKeys,
    status: "pending"
  }));
  const requestedPacketIds = new Set(input.packetIds);
  const selectedItems = review.plan.items
    .filter((item) => requestedPacketIds.size === 0 || requestedPacketIds.has(item.packetId))
    .filter((item) => input.action === "approve" ? item.canApprove : item.canReject)
    .slice(0, input.maxPackets);
  const packetIds = selectedItems.map((item) => item.packetId);
  const launchGateInput = revenueBusinessFleetLaunchGateQuerySchema.parse({
    maxStores: input.maxStores,
    sourceKeys: input.sourceKeys
  });
  const actionPastTense = input.action === "approve" ? "approved" : "rejected";

  if (input.dryRun) {
    const launchGate = await buildRevenueBusinessFleetLaunchGateForUser(userId, launchGateInput);

    return {
      applied: {
        action: input.action,
        auditLogId: null,
        dryRun: true,
        externalExecution: false as const,
        packetsApproved: 0,
        packetsPreviewed: selectedItems.length,
        packetsRejected: 0,
        packetsSelected: selectedItems.length,
        providerContacted: false as const,
        summary: `${selectedItems.length} provider approval packet${selectedItems.length === 1 ? "" : "s"} would be ${actionPastTense} internally.`
      },
      launchGate: launchGate.plan,
      plan: review.plan,
      selectedPackets: selectedItems
    };
  }

  const auditLog = await recordAuditLog({
    action: input.action === "approve"
      ? "revenue.business_fleet_provider_approvals.approved"
      : "revenue.business_fleet_provider_approvals.rejected",
    actorUserId: userId,
    metadata: {
      action: input.action,
      externalExecution: false,
      note: input.note ?? null,
      packetIds,
      packets: selectedItems.map((item) => ({
        businessName: item.businessName,
        packetId: item.packetId,
        payloadCount: item.payloadCount,
        readinessScore: item.readinessScore,
        sourceKey: item.sourceKey,
        storeId: item.storeId
      })),
      providerContacted: false,
      source: "revenue.business_fleet_provider_approval_review"
    },
    outcome: "success",
    severity: selectedItems.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_business_fleet_provider_approval_review"
  });
  const updateResult = packetIds.length > 0
    ? await prisma.growthApprovalPacket.updateMany({
      data: {
        reviewAuditLogId: auditLog.id,
        reviewedAt: new Date(),
        reviewedById: userId,
        reviewNote: input.note ?? null,
        status: actionPastTense
      },
      where: {
        id: { in: packetIds },
        status: "pending",
        userId
      }
    })
    : { count: 0 };
  const [refreshedReview, launchGate] = await Promise.all([
    buildRevenueBusinessFleetProviderApprovalReviewForUser(userId, revenueBusinessFleetProviderApprovalReviewQuerySchema.parse({
      maxPackets: input.maxPackets,
      maxStores: input.maxStores,
      sourceKeys: input.sourceKeys,
      status: "pending"
    })),
    buildRevenueBusinessFleetLaunchGateForUser(userId, launchGateInput)
  ]);

  return {
    applied: {
      action: input.action,
      auditLogId: auditLog.id,
      dryRun: false,
      externalExecution: false as const,
      packetsApproved: input.action === "approve" ? updateResult.count : 0,
      packetsPreviewed: 0,
      packetsRejected: input.action === "reject" ? updateResult.count : 0,
      packetsSelected: selectedItems.length,
      providerContacted: false as const,
      summary: `${updateResult.count} provider approval packet${updateResult.count === 1 ? "" : "s"} ${actionPastTense} internally. External execution remains locked.`
    },
    launchGate: launchGate.plan,
    plan: refreshedReview.plan,
    selectedPackets: selectedItems
  };
}

async function buildRevenueAssetControlLedgerForUser(userId: string, options: RevenueAssetControlLedgerQueryInput): Promise<RevenueAssetControlLedgerPlan> {
  const where: Prisma.RevenueAssetControlRecordWhereInput = {
    userId
  };

  if (options.action) {
    where.requestedAction = options.action;
  }

  if (options.assetId) {
    where.assetId = options.assetId;
  }

  if (options.assetType) {
    where.assetType = options.assetType;
  }

  if (options.storeId) {
    where.storeId = options.storeId;
  }

  if (options.includeOverridesOnly) {
    where.override = true;
  }

  if (options.fromDate || options.toDate) {
    where.createdAt = {};

    if (options.fromDate) {
      where.createdAt.gte = new Date(`${options.fromDate}T00:00:00.000Z`);
    }

    if (options.toDate) {
      where.createdAt.lte = new Date(`${options.toDate}T23:59:59.999Z`);
    }
  }

  const records = await prisma.revenueAssetControlRecord.findMany({
    orderBy: {
      createdAt: "desc"
    },
    take: options.limit,
    where
  });

  return buildRevenueAssetControlLedgerPlan({
    records: records.map(revenueAssetControlRecordSnapshot)
  });
}

async function buildRevenueAssetReviewQueueForUser(userId: string, options: RevenueAssetReviewQueueQueryInput): Promise<RevenueAssetReviewQueuePlan> {
  const [portfolio, controlLedger] = await Promise.all([
    buildAssetPortfolioForUser(userId, revenueEngineQuerySchema.parse({})),
    buildRevenueAssetControlLedgerForUser(userId, revenueAssetControlLedgerQuerySchema.parse({
      limit: 250
    }))
  ]);

  return buildRevenueAssetReviewQueuePlan({
    controlLedger,
    options: {
      includeWatch: options.includeWatch,
      maxItems: options.maxItems,
      staleAfterDays: options.staleAfterDays
    },
    portfolio
  });
}

async function buildRevenueAssetControlRecoveryForUser(userId: string, options: RevenueAssetControlRecoveryQueryInput): Promise<RevenueAssetControlRecoveryPlan> {
  const [portfolio, controlLedger] = await Promise.all([
    buildAssetPortfolioForUser(userId, revenueEngineQuerySchema.parse({})),
    buildRevenueAssetControlLedgerForUser(userId, revenueAssetControlLedgerQuerySchema.parse({
      limit: 250
    }))
  ]);

  return buildRevenueAssetControlRecoveryPlan({
    includeResolved: options.includeResolved,
    ledger: controlLedger,
    limit: options.limit,
    portfolio,
    staleAfterDays: options.staleAfterDays
  });
}

async function buildRevenuePortfolioDashboardForUser(userId: string, thresholds: RevenueEngineQueryInput): Promise<RevenuePortfolioDashboardPlan> {
  const [portfolio, controlLedger, commandResult] = await Promise.all([
    buildAssetPortfolioForUser(userId, thresholds),
    buildRevenueAssetControlLedgerForUser(userId, revenueAssetControlLedgerQuerySchema.parse({
      limit: 250
    })),
    buildPortfolioCommandCenterForUser(userId, portfolioCommandCenterQuerySchema.parse({
      includeCommandHistory: 50,
      includeContent: true,
      includeFinance: true,
      maxActions: 50,
      windowDays: 30
    }))
  ]);
  const reviewQueue = buildRevenueAssetReviewQueuePlan({
    controlLedger,
    options: revenueAssetReviewQueueQuerySchema.parse({
      includeWatch: false,
      maxItems: 25,
      staleAfterDays: 14
    }),
    portfolio
  });

  return buildRevenuePortfolioDashboardPlan({
    commandPlan: commandResult.plan,
    controlLedger,
    portfolio,
    reviewQueue
  });
}

async function buildRevenueOpportunityControlForUser(userId: string, options: RevenueOpportunityControlQueryInput): Promise<{
  opportunities: RevenueOpportunitySnapshot[];
  performanceSnapshots: RevenueOpportunityControlPerformanceSnapshot[];
  plan: ReturnType<typeof buildRevenueOpportunityControlPlan>;
}> {
  const records = await prisma.revenueOpportunity.findMany({
    include: {
      store: {
        include: {
          products: {
            orderBy: { updatedAt: "desc" }
          }
        }
      }
    },
    orderBy: { updatedAt: "desc" },
    take: options.maxOpportunities,
    where: {
      userId
    }
  });
  const storeIds = Array.from(new Set(records.map((record) => record.storeId).filter((storeId): storeId is string => Boolean(storeId))));
  const cutoff = new Date(Date.now() - options.windowDays * 86_400_000);
  const performanceRecords = storeIds.length > 0
    ? await prisma.revenuePerformanceSnapshot.findMany({
      orderBy: { periodEnd: "desc" },
      where: {
        periodEnd: { gte: cutoff },
        storeId: { in: storeIds },
        userId
      }
    })
    : [];
  const opportunities = records.map(opportunityControlSnapshot);
  const performanceSnapshots = performanceRecords.map(opportunityControlPerformanceSnapshot);

  return {
    opportunities,
    performanceSnapshots,
    plan: buildRevenueOpportunityControlPlan({
      opportunities,
      options,
      performanceSnapshots
    })
  };
}

async function buildLaunchPipelineForUser(userId: string, options: RevenueLaunchPipelineQueryInput): Promise<{
  plan: RevenueLaunchPipelinePlan;
  stores: StoreRecord[];
}> {
  const stores = await loadPortfolioForUser(userId);
  const storeSnapshots = stores.map((store) => launchStoreSnapshot(store));
  const productSnapshots = stores.flatMap((store) => store.products.map(launchProductSnapshot));

  return {
    plan: buildRevenueLaunchPipeline({
      options,
      products: productSnapshots,
      stores: storeSnapshots
    }),
    stores
  };
}

async function buildDigitalProductPortfolioForUser(userId: string, options: RevenueDigitalProductQueryInput): Promise<{
  plan: DigitalProductPortfolioPlan;
  stores: StoreRecord[];
}> {
  const stores = await loadPortfolioForUser(userId);
  const storeSnapshots = stores.map((store) => storeSnapshot(store));
  const productSnapshots = stores.flatMap((store) => store.products.map(productSnapshot));

  return {
    plan: buildDigitalProductPortfolioPlan({
      options,
      products: productSnapshots,
      stores: storeSnapshots
    }),
    stores
  };
}

async function buildPerformanceDigestForUser(userId: string, options: RevenuePerformanceQueryInput): Promise<{
  digest: RevenuePerformanceDigest;
  products: RevenueEngineProductSnapshot[];
  stores: StoreRecord[];
}> {
  const allStores = await loadPortfolioForUser(userId);
  const stores = options.storeId ? allStores.filter((store) => store.id === options.storeId) : allStores;
  const storeSnapshots = stores.map((store) => storeSnapshot(store));
  const productSnapshots = stores.flatMap((store) => store.products.map(productSnapshot));
  const cutoff = new Date(Date.now() - options.windowDays * 86_400_000);
  const snapshots = await prisma.revenuePerformanceSnapshot.findMany({
    orderBy: { periodEnd: "desc" },
    where: {
      periodEnd: { gte: cutoff },
      source: options.source,
      storeId: options.storeId,
      userId
    }
  });

  return {
    digest: buildRevenuePerformanceDigest({
      options,
      products: productSnapshots,
      snapshots: snapshots.map(performanceSnapshot),
      stores: storeSnapshots
    }),
    products: productSnapshots,
    stores
  };
}

async function buildFinancialOrchestratorForUser(userId: string, options: FinancialOrchestratorQueryInput): Promise<{
  plan: FinancialOrchestratorPlan;
  snapshots: PerformanceRecord[];
  stores: StoreRecord[];
}> {
  const allStores = await loadPortfolioForUser(userId);
  const stores = options.storeId ? allStores.filter((store) => store.id === options.storeId) : allStores;
  const storeSnapshots = stores.map((store) => storeSnapshot(store));
  const productSnapshots = stores.flatMap((store) => store.products.map(productSnapshot));
  const cutoff = new Date(Date.now() - options.windowDays * 86_400_000);
  const snapshots = await prisma.revenuePerformanceSnapshot.findMany({
    orderBy: { periodEnd: "desc" },
    where: {
      periodEnd: { gte: cutoff },
      source: options.source,
      storeId: options.storeId,
      userId
    }
  });
  const existingLedgerEntries = snapshots.length > 0
    ? await prisma.financialLedgerEntry.findMany({
      select: { revenuePerformanceSnapshotId: true },
      where: {
        revenuePerformanceSnapshotId: { in: snapshots.map((snapshot) => snapshot.id) },
        userId
      }
    })
    : [];
  const performanceSnapshots = snapshots.map(performanceSnapshot);
  const revenuePlan = buildRevenueEnginePlan({
    products: productSnapshots,
    stores: storeSnapshots
  });
  const performanceDigest = buildRevenuePerformanceDigest({
    options,
    products: productSnapshots,
    snapshots: performanceSnapshots,
    stores: storeSnapshots
  });
  const assetPortfolio = mergeRevenueAssetPortfolioPerformance(
    buildRevenueAssetPortfolio(revenuePlan),
    performanceDigest
  );

  return {
    plan: buildFinancialOrchestratorPlan({
      assetPortfolio,
      existingLedgerSnapshotIds: new Set(existingLedgerEntries.map((entry) => entry.revenuePerformanceSnapshotId)),
      options,
      ownerId: userId,
      products: productSnapshots,
      snapshots: performanceSnapshots,
      stores: storeSnapshots
    }),
    snapshots,
    stores
  };
}

async function buildFinancialPayoutReviewForUser(userId: string): Promise<{
  intents: FinancialPayoutIntentSnapshot[];
  plan: FinancialPayoutReviewPlan;
}> {
  const records = await prisma.financialPayoutIntent.findMany({
    orderBy: { createdAt: "desc" },
    where: { userId }
  });
  const intents = records.map(financialPayoutIntentSnapshot);

  return {
    intents,
    plan: buildFinancialPayoutReviewPlan({ intents })
  };
}

async function buildFinancialScalingBudgetReviewForUser(userId: string): Promise<{
  packets: FinancialScalingBudgetPacketSnapshot[];
  plan: FinancialScalingBudgetReviewPlan;
}> {
  const records = await prisma.financialScalingBudgetPacket.findMany({
    orderBy: [
      { updatedAt: "desc" },
      { createdAt: "desc" }
    ],
    where: { userId }
  });
  const packets = records.map(financialScalingBudgetPacketSnapshot);

  return {
    packets,
    plan: buildFinancialScalingBudgetReviewPlan({ packets })
  };
}

async function buildFinancialScalingSpendControlForUser(userId: string): Promise<{
  plan: FinancialScalingSpendControlPlan;
}> {
  const [{ plan: reviewPlan }, persistedSpendPackets] = await Promise.all([
    buildFinancialScalingBudgetReviewForUser(userId),
    prisma.financialScalingSpendPacket.findMany({
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" }
      ],
      where: { userId }
    })
  ]);

  return {
    plan: buildFinancialScalingSpendControlPlan({
      persistedSpendPackets: persistedSpendPackets.map(financialScalingSpendPacketSnapshot),
      reviewPlan
    })
  };
}

async function buildFinancialScalingExecutionLedgerForUser(userId: string): Promise<{
  plan: FinancialScalingExecutionLedgerPlan;
  spendControlPlan: FinancialScalingSpendControlPlan;
}> {
  const [{ plan: spendControlPlan }, executionEntries] = await Promise.all([
    buildFinancialScalingSpendControlForUser(userId),
    prisma.financialScalingExecutionEntry.findMany({
      orderBy: [
        { periodEnd: "desc" },
        { createdAt: "desc" }
      ],
      take: 100,
      where: { userId }
    })
  ]);

  return {
    plan: buildFinancialScalingExecutionLedgerPlan({
      entries: executionEntries.map(financialScalingExecutionEntrySnapshot),
      spendControlPlan
    }),
    spendControlPlan
  };
}

async function buildFinancialReleaseGovernanceForUser(userId: string): Promise<{
  plan: FinancialReleaseGovernancePlan;
}> {
  const { plan: reviewPlan } = await buildFinancialPayoutReviewForUser(userId);
  const [releasePacketRecords, reconciliationReportRecords] = await Promise.all([
    prisma.financialBudgetReleasePacket.findMany({
      orderBy: { updatedAt: "desc" },
      where: { userId }
    }),
    prisma.financialReconciliationReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      where: { userId }
    })
  ]);

  return {
    plan: buildFinancialReleaseGovernancePlan({
      persistedReconciliationReports: reconciliationReportRecords.map(financialReconciliationReportSnapshot),
      persistedReleasePackets: releasePacketRecords.map(financialBudgetReleasePacketSnapshot),
      reviewPlan
    })
  };
}

async function buildListingOptimizationForUser(userId: string, options: RevenueListingOptimizationQueryInput): Promise<{
  plan: RevenueListingOptimizationPlan;
  stores: StoreRecord[];
}> {
  const stores = await loadPortfolioForUser(userId);
  const storeSnapshots = stores.map((store) => storeSnapshot(store));
  const productSnapshots = stores.flatMap((store) => store.products.map(productSnapshot));
  const performance = await buildPerformanceDigestForUser(userId, revenuePerformanceQuerySchema.parse({
    windowDays: options.windowDays
  }));

  return {
    plan: buildRevenueListingOptimizationPlan({
      options,
      performanceDigest: performance.digest,
      products: productSnapshots,
      stores: storeSnapshots
    }),
    stores
  };
}

async function buildStoreSetupForUser(userId: string, options: RevenueStoreSetupQueryInput): Promise<{
  plan: RevenueStoreSetupPlan;
  stores: StoreRecord[];
}> {
  const stores = await loadPortfolioForUser(userId);
  const storeSnapshots = stores.map((store) => storeSnapshot(store));
  const productSnapshots = stores.flatMap((store) => store.products.map(productSnapshot));

  return {
    plan: buildRevenueStoreSetupPlan({
      options,
      products: productSnapshots,
      stores: storeSnapshots
    }),
    stores
  };
}

async function buildLaunchReadinessForUser(userId: string, options: RevenueLaunchReadinessQueryInput): Promise<{
  plan: RevenueLaunchReadinessPlan;
}> {
  const [launchResult, setupResult] = await Promise.all([
    buildLaunchPipelineForUser(userId, revenueLaunchPipelineQuerySchema.parse({
      maxStores: options.maxStores
    })),
    buildStoreSetupForUser(userId, revenueStoreSetupQuerySchema.parse({
      maxStores: options.maxStores
    }))
  ]);
  const stores = launchResult.stores;
  const storeIds = stores.map((store) => store.id);
  const approvals = options.includeApprovalHistory && storeIds.length > 0
    ? await prisma.growthApprovalPacket.findMany({
      orderBy: { createdAt: "desc" },
      take: options.maxStores * 10,
      where: {
        storeId: { in: storeIds },
        userId
      }
    })
    : [];
  const providerPayloads = stores.map((store) => buildProviderPayloadPackage({
    options: {
      includeUnapproved: false,
      maxProducts: 5
    },
    products: store.products.map(providerMerchProductSnapshot),
    store: providerMerchStoreSnapshot(store),
    storeId: store.id
  }));

  return {
    plan: buildRevenueLaunchReadinessPlan({
      approvals: approvals.map(launchReadinessApprovalSnapshot),
      launchPlan: launchResult.plan,
      options,
      providerPayloads,
      setupPlan: setupResult.plan,
      stores: stores.map(launchReadinessStoreSnapshot)
    })
  };
}

async function loadLaunchHandoffRecordsForUser(userId: string, take = 25): Promise<RevenueLaunchHandoffPacketRecordSnapshot[]> {
  const records = await prisma.revenueLaunchHandoffPacket.findMany({
    orderBy: { updatedAt: "desc" },
    take,
    where: { userId }
  });

  return records.map(revenueLaunchHandoffPacketSnapshot);
}

async function buildLaunchHandoffForUser(userId: string, options: RevenueLaunchHandoffQueryInput): Promise<{
  plan: RevenueLaunchHandoffPlan;
}> {
  const upstreamMaxStores = Math.min(options.maxBundles, 25);
  const [launchResult, setupResult] = await Promise.all([
    buildLaunchPipelineForUser(userId, revenueLaunchPipelineQuerySchema.parse({
      maxStores: upstreamMaxStores
    })),
    buildStoreSetupForUser(userId, revenueStoreSetupQuerySchema.parse({
      maxStores: options.maxBundles
    }))
  ]);
  const stores = launchResult.stores;
  const storeIds = stores.map((store) => store.id);
  const approvals = storeIds.length > 0
    ? await prisma.growthApprovalPacket.findMany({
      orderBy: { createdAt: "desc" },
      take: options.maxBundles * 10,
      where: {
        storeId: { in: storeIds },
        userId
      }
    })
    : [];
  const approvalSnapshots = approvals.map(launchReadinessApprovalSnapshot);
  const persistedPackets = await loadLaunchHandoffRecordsForUser(userId, options.maxBundles * 5);
  const providerPayloads = stores.map((store) => buildProviderPayloadPackage({
    options: {
      includeUnapproved: false,
      maxProducts: 5
    },
    products: store.products.map(providerMerchProductSnapshot),
    store: providerMerchStoreSnapshot(store),
    storeId: store.id
  }));
  const readinessPlan = buildRevenueLaunchReadinessPlan({
    approvals: approvalSnapshots,
    launchPlan: launchResult.plan,
    options: {
      includeApprovalHistory: true,
      maxStores: options.maxBundles,
      minLaunchReadiness: options.minLaunchReadiness,
      minProviderReadiness: options.minProviderReadiness
    },
    providerPayloads,
    setupPlan: setupResult.plan,
    stores: stores.map(launchReadinessStoreSnapshot)
  });

  return {
    plan: buildRevenueLaunchHandoffPlan({
      approvals: approvalSnapshots,
      options,
      persistedPackets,
      providerPayloads,
      readinessPlan
    })
  };
}

function launchHandoffRecordData(userId: string, auditLogId: string, item: RevenueLaunchHandoffItem, blockedExternalActions: string[]) {
  return {
    action: item.action,
    approvedPacketId: item.approvedPacketId,
    artifactSlotCount: item.artifactSlotCount,
    auditLogId,
    blockedActionsJson: stringifySecureJson(item.bundle?.blockedActions ?? blockedExternalActions),
    blockersJson: stringifySecureJson(item.blockers),
    bundleJson: item.bundle ? stringifySecureJson(item.bundle) : null,
    connectorReadinessScore: item.connectorReadiness?.score ?? 0,
    connectorStatus: item.connectorReadiness?.status ?? null,
    credentialScopesJson: stringifySecureJson(item.credentialScopes),
    dedupeKey: revenueLaunchHandoffDedupeKey(item),
    externalExecution: false,
    launchReadinessScore: item.launchReadiness.readinessScore,
    manifestCount: item.manifestCount,
    providerContacted: false,
    providerReadinessScore: item.providerPayload.readinessScore,
    providersJson: stringifySecureJson(item.providers),
    riskLevel: item.riskLevel,
    status: revenueLaunchHandoffRecordStatus(item),
    storeId: item.storeId,
    storeName: item.storeName,
    summary: item.summary,
    userId
  };
}

async function applyRevenueLaunchHandoff(userId: string, plan: RevenueLaunchHandoffPlan, input: ApplyRevenueLaunchHandoffInput) {
  const items = plan.items;
  const dedupeKeys = items.map(revenueLaunchHandoffDedupeKey);

  if (input.dryRun) {
    return {
      auditLogId: null,
      dryRun: true,
      externalExecution: false as const,
      providerContacted: false as const,
      readyForManualHandoff: items.filter((item) => revenueLaunchHandoffRecordStatus(item) === "ready_for_manual_handoff").length,
      recordsCreated: 0,
      recordsToWrite: items.length,
      recordsUpdated: 0,
      storedRecords: plan.persistedPackets
    };
  }

  const existing = dedupeKeys.length > 0
    ? await prisma.revenueLaunchHandoffPacket.findMany({
      select: { dedupeKey: true },
      where: {
        dedupeKey: { in: dedupeKeys },
        userId
      }
    })
    : [];
  const existingKeys = new Set(existing.map((record) => record.dedupeKey));
  const auditLog = await recordAuditLog({
    action: "revenue.launch_handoff.recorded",
    actorUserId: userId,
    metadata: {
      blockedExternalActions: plan.blockedExternalActions,
      bundlesPrepared: plan.totals.bundlesPrepared,
      externalExecution: false,
      manifestsPrepared: plan.totals.manifestsPrepared,
      providerContacted: false,
      readyForManualHandoff: plan.totals.readyForManualHandoff,
      summary: plan.summary
    },
    outcome: "success",
    severity: plan.totals.blockedBundles > 0 ? "high" : items.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_launch_handoff"
  });

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const data = launchHandoffRecordData(userId, auditLog.id, item, plan.blockedExternalActions);

      await tx.revenueLaunchHandoffPacket.upsert({
        create: data,
        update: {
          action: data.action,
          approvedPacketId: data.approvedPacketId,
          artifactSlotCount: data.artifactSlotCount,
          auditLogId: data.auditLogId,
          blockedActionsJson: data.blockedActionsJson,
          blockersJson: data.blockersJson,
          bundleJson: data.bundleJson,
          connectorReadinessScore: data.connectorReadinessScore,
          connectorStatus: data.connectorStatus,
          credentialScopesJson: data.credentialScopesJson,
          externalExecution: false,
          launchReadinessScore: data.launchReadinessScore,
          manifestCount: data.manifestCount,
          providerContacted: false,
          providerReadinessScore: data.providerReadinessScore,
          providersJson: data.providersJson,
          riskLevel: data.riskLevel,
          status: data.status,
          storeName: data.storeName,
          summary: data.summary
        },
        where: {
          dedupeKey: data.dedupeKey
        }
      });
    }
  });

  const storedRecords = dedupeKeys.length > 0
    ? await prisma.revenueLaunchHandoffPacket.findMany({
      orderBy: { updatedAt: "desc" },
      where: {
        dedupeKey: { in: dedupeKeys },
        userId
      }
    })
    : [];

  return {
    auditLogId: auditLog.id,
    dryRun: false,
    externalExecution: false as const,
    providerContacted: false as const,
    readyForManualHandoff: items.filter((item) => revenueLaunchHandoffRecordStatus(item) === "ready_for_manual_handoff").length,
    recordsCreated: dedupeKeys.filter((key) => !existingKeys.has(key)).length,
    recordsToWrite: items.length,
    recordsUpdated: dedupeKeys.filter((key) => existingKeys.has(key)).length,
    storedRecords: storedRecords.map(revenueLaunchHandoffPacketSnapshot)
  };
}

async function buildLaunchHandoffControlForUser(userId: string, options: RevenueLaunchHandoffControlQueryInput): Promise<{
  plan: RevenueLaunchHandoffControlPlan;
}> {
  const records = await loadLaunchHandoffRecordsForUser(userId, options.maxPackets * (options.includeArchived ? 2 : 1));

  return {
    plan: buildRevenueLaunchHandoffControlPlan({
      options,
      packets: records
    })
  };
}

async function applyRevenueLaunchHandoffControl(userId: string, params: RevenueLaunchHandoffControlParamsInput, input: ApplyRevenueLaunchHandoffControlInput) {
  const options = revenueLaunchHandoffControlQuerySchema.parse(input);
  const current = await buildLaunchHandoffControlForUser(userId, {
    ...options,
    includeArchived: true
  });
  const item = current.plan.packets.find((packet) => packet.id === params.packetId);

  if (!item) {
    return null;
  }

  const evaluation = evaluateRevenueLaunchHandoffControlUpdate({
    item,
    overrideReadiness: input.overrideReadiness,
    toStatus: input.status
  });
  const auditLog = input.dryRun ? null : await recordAuditLog({
    action: "revenue.launch_handoff.control.updated",
    actorUserId: userId,
    metadata: {
      blockers: evaluation.blockers,
      dryRun: false,
      externalExecution: false,
      fromStatus: evaluation.fromStatus,
      note: input.note ?? null,
      packetId: params.packetId,
      providerContacted: false,
      reason: evaluation.reason,
      toStatus: evaluation.toStatus
    },
    outcome: evaluation.allowed ? "success" : "failure",
    severity: evaluation.allowed ? "medium" : "high",
    targetId: params.packetId,
    targetType: "revenue_launch_handoff_packet"
  });

  if (evaluation.allowed && !input.dryRun) {
    await prisma.revenueLaunchHandoffPacket.update({
      data: {
        auditLogId: auditLog?.id ?? item.auditLogId,
        status: input.status,
        summary: input.note
          ? `${item.summary} Control note: ${input.note}`
          : item.summary
      },
      where: {
        id: params.packetId
      }
    });
  }

  const refreshed = await buildLaunchHandoffControlForUser(userId, options);

  return {
    applied: {
      allowed: evaluation.allowed,
      auditLogId: auditLog?.id ?? null,
      blockers: evaluation.blockers,
      dryRun: input.dryRun,
      externalExecution: false as const,
      fromStatus: evaluation.fromStatus,
      note: input.note ?? null,
      packetId: params.packetId,
      providerContacted: false as const,
      reason: evaluation.reason,
      toStatus: evaluation.toStatus
    },
    evaluation,
    plan: refreshed.plan
  };
}

async function buildLaunchOperationsPackForUser(userId: string, options: RevenueLaunchOperationsPackQueryInput): Promise<{
  plan: ReturnType<typeof buildRevenueLaunchOperationsPackPlan>;
}> {
  const [handoffResult, checklistPlan] = await Promise.all([
    buildLaunchHandoffForUser(userId, revenueLaunchHandoffQuerySchema.parse({
      includeBlocked: options.includeBlocked,
      maxBundles: options.maxPacks,
      minConnectorReadiness: options.minConnectorReadiness,
      minLaunchReadiness: options.minLaunchReadiness,
      minProviderReadiness: options.minProviderReadiness
    })),
    buildRevenueLaunchChecklistForUser(userId, revenueLaunchChecklistQuerySchema.parse({
      includeCompleted: true,
      maxItems: Math.min(options.maxPacks * 5, 100),
      minPriorityScore: 0
    }))
  ]);

  return {
    plan: buildRevenueLaunchOperationsPackPlan({
      checklistPlan,
      handoffPlan: handoffResult.plan,
      options
    })
  };
}

async function applyRevenueLaunchOperationsPack(userId: string, input: ApplyRevenueLaunchOperationsPackInput) {
  const options = revenueLaunchOperationsPackQuerySchema.parse(input);
  const { plan } = await buildLaunchOperationsPackForUser(userId, options);
  const selectedPacks = selectRevenueLaunchOperationsPacks(plan, input.storeIds);

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        dryRun: true,
        externalExecution: false as const,
        packsRecorded: 0,
        packsSelected: selectedPacks.length,
        providerContacted: false as const,
        readyPacks: selectedPacks.filter((pack) => pack.status === "ready_for_manual_launch").length,
        summary: `${selectedPacks.length} launch operations pack${selectedPacks.length === 1 ? "" : "s"} would be recorded as internal audit artifacts.`
      },
      plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.launch_operations_pack.recorded",
    actorUserId: userId,
    metadata: {
      blockedExternalActions: plan.blockedExternalActions,
      externalExecution: false,
      note: input.note ?? null,
      packs: selectedPacks.map((pack) => ({
        artifactSlots: pack.artifactSlots.length,
        credentialScopes: pack.credentialScopes,
        manualSteps: pack.manualSteps.length,
        requestManifests: pack.requestManifests.length,
        status: pack.status,
        storeId: pack.storeId,
        storeName: pack.storeName
      })),
      providerContacted: false,
      summary: plan.summary
    },
    outcome: "success",
    severity: selectedPacks.some((pack) => pack.status === "blocked") ? "high" : selectedPacks.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_launch_operations_pack"
  });

  return {
    applied: {
      auditLogId: auditLog.id,
      dryRun: false,
      externalExecution: false as const,
      packsRecorded: selectedPacks.length,
      packsSelected: selectedPacks.length,
      providerContacted: false as const,
      readyPacks: selectedPacks.filter((pack) => pack.status === "ready_for_manual_launch").length,
      summary: `${selectedPacks.length} launch operations pack${selectedPacks.length === 1 ? "" : "s"} recorded as internal audit artifacts.`
    },
    plan
  };
}

async function buildLaunchClosureLedgerForUser(userId: string, options: RevenueLaunchClosureLedgerQueryInput): Promise<{
  plan: ReturnType<typeof buildRevenueLaunchClosureLedgerPlan>;
}> {
  const [operationsPackResult, performanceResult] = await Promise.all([
    buildLaunchOperationsPackForUser(userId, revenueLaunchOperationsPackQuerySchema.parse({
      includeBlocked: options.includeBlocked,
      maxPacks: options.maxEntries
    })),
    buildPerformanceDigestForUser(userId, revenuePerformanceQuerySchema.parse({
      maxRecommendations: options.maxEntries,
      windowDays: options.monitoringWindowDays
    }))
  ]);

  return {
    plan: buildRevenueLaunchClosureLedgerPlan({
      operationsPackPlan: operationsPackResult.plan,
      options,
      performanceDigest: performanceResult.digest
    })
  };
}

async function applyRevenueLaunchClosureLedger(userId: string, input: ApplyRevenueLaunchClosureLedgerInput) {
  const options = revenueLaunchClosureLedgerQuerySchema.parse(input);
  const { plan } = await buildLaunchClosureLedgerForUser(userId, options);
  const selectedEntries = selectRevenueLaunchClosureLedgerEntries(plan, input.storeIds);

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        dryRun: true,
        entriesRecorded: 0,
        entriesSelected: selectedEntries.length,
        externalExecution: false as const,
        providerContacted: false as const,
        summary: `${selectedEntries.length} launch closure entr${selectedEntries.length === 1 ? "y" : "ies"} would be recorded as internal audit artifacts.`,
        triggersQueued: selectedEntries.reduce((sum, entry) => sum + entry.monitoringTriggers.filter((trigger) => trigger.status === "queued_internal").length, 0)
      },
      plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.launch_closure_ledger.recorded",
    actorUserId: userId,
    metadata: {
      blockedExternalActions: plan.blockedExternalActions,
      entries: selectedEntries.map((entry) => ({
        closureScore: entry.closureScore,
        expectedFirstWeekRevenue: entry.expectedFirstWeekRevenue,
        monitoringTriggers: entry.monitoringTriggers.map((trigger) => trigger.trigger),
        nextAction: entry.nextAction,
        status: entry.status,
        storeId: entry.storeId,
        storeName: entry.storeName
      })),
      externalExecution: false,
      note: input.note ?? null,
      providerContacted: false,
      summary: plan.summary
    },
    outcome: "success",
    severity: selectedEntries.some((entry) => entry.status === "blocked") ? "high" : selectedEntries.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_launch_closure_ledger"
  });

  return {
    applied: {
      auditLogId: auditLog.id,
      dryRun: false,
      entriesRecorded: selectedEntries.length,
      entriesSelected: selectedEntries.length,
      externalExecution: false as const,
      providerContacted: false as const,
      summary: `${selectedEntries.length} launch closure entr${selectedEntries.length === 1 ? "y" : "ies"} recorded as internal audit artifacts.`,
      triggersQueued: selectedEntries.reduce((sum, entry) => sum + entry.monitoringTriggers.filter((trigger) => trigger.status === "queued_internal").length, 0)
    },
    plan
  };
}

async function buildLiveConnectorReadinessRegistryForUser(userId: string, options: RevenueLiveConnectorReadinessQueryInput): Promise<{
  plan: ReturnType<typeof buildRevenueLiveConnectorReadinessRegistryPlan>;
}> {
  const closureOptions = revenueLaunchClosureLedgerQuerySchema.parse({
    includeBlocked: options.includeBlocked,
    maxEntries: options.maxEntries,
    minClosureScore: Math.min(options.minClosureScore, 100),
    monitoringWindowDays: 30
  });
  const [operationsPackResult, performanceResult, signalApprovalPlan] = await Promise.all([
    buildLaunchOperationsPackForUser(userId, revenueLaunchOperationsPackQuerySchema.parse({
      includeBlocked: options.includeBlocked,
      maxPacks: options.maxEntries
    })),
    buildPerformanceDigestForUser(userId, revenuePerformanceQuerySchema.parse({
      maxRecommendations: options.maxEntries,
      windowDays: 30
    })),
    buildRevenueSignalConnectorApprovalForUser(userId, revenueSignalConnectorApprovalQuerySchema.parse({
      includeArchived: true,
      maxConnectors: 100,
      maxRecords: 100,
      windowDays: 30
    }))
  ]);
  const closureLedgerPlan = buildRevenueLaunchClosureLedgerPlan({
    operationsPackPlan: operationsPackResult.plan,
    options: closureOptions,
    performanceDigest: performanceResult.digest
  });

  return {
    plan: buildRevenueLiveConnectorReadinessRegistryPlan({
      closureLedgerPlan,
      operationsPackPlan: operationsPackResult.plan,
      options,
      signalApprovalPlan
    })
  };
}

async function buildFirstCashReadinessForUser(userId: string, options: RevenueFirstCashReadinessQueryInput): Promise<{
  plan: RevenueFirstCashReadinessPlan;
}> {
  const upstreamLimit = Math.min(options.maxCandidates, 25);
  const [launchReadinessResult, liveConnectorResult] = await Promise.all([
    buildLaunchReadinessForUser(userId, revenueLaunchReadinessQuerySchema.parse({
      includeApprovalHistory: true,
      maxStores: upstreamLimit,
      minLaunchReadiness: 1,
      minProviderReadiness: 1
    })),
    buildLiveConnectorReadinessRegistryForUser(userId, revenueLiveConnectorReadinessQuerySchema.parse({
      includeBlocked: true,
      maxEntries: upstreamLimit,
      minClosureScore: 1,
      minReadOnlyConnectors: 0,
      requireOperationsPackAudit: false,
      requirePerformanceEvidence: false
    }))
  ]);

  return {
    plan: buildRevenueFirstCashReadinessPlan({
      launchReadinessPlan: launchReadinessResult.plan,
      liveConnectorPlan: liveConnectorResult.plan,
      options
    })
  };
}

async function buildFirstCashSprintForUser(userId: string, options: RevenueFirstCashSprintQueryInput): Promise<{
  bridgePlan: RevenueLaunchChecklistActionBridgePlan;
  checklistPlan: RevenueLaunchChecklistPlan;
  firstCashPlan: RevenueFirstCashReadinessPlan;
  plan: RevenueFirstCashSprintPlan;
}> {
  const [firstCashResult, bridgeContext] = await Promise.all([
    buildFirstCashReadinessForUser(userId, revenueFirstCashReadinessQuerySchema.parse({
      includeBlocked: options.includeBlocked,
      maxCandidates: options.maxCandidates,
      targetDaysToFirstCash: options.targetDaysToFirstCash
    })),
    buildRevenueLaunchChecklistActionBridgeForUser(userId, revenueLaunchChecklistActionBridgeQuerySchema.parse({
      includeCompleted: true,
      maxActions: options.maxSprintActions,
      maxItems: Math.max(25, options.maxCandidates * 4),
      minPriorityScore: 0,
      windowDays: 30
    }))
  ]);
  const plan = buildRevenueFirstCashSprintPlan({
    bridgePlan: bridgeContext.bridgePlan,
    firstCashPlan: firstCashResult.plan,
    options
  });

  return {
    bridgePlan: bridgeContext.bridgePlan,
    checklistPlan: bridgeContext.checklistPlan,
    firstCashPlan: firstCashResult.plan,
    plan
  };
}

async function applyRevenueFirstCashSprint(userId: string, input: ApplyRevenueFirstCashSprintInput) {
  const context = await buildFirstCashSprintForUser(userId, input);
  const bridgeActionIds = selectRevenueFirstCashSprintBridgeActionIds(context.plan, input.sprintActionIds);

  if (bridgeActionIds.length === 0) {
    return {
      bridge: context.bridgePlan,
      checklist: context.checklistPlan,
      dispatched: {
        actionsBlocked: 0,
        actionsDispatched: 0,
        actionsPreviewed: 0,
        actionsSelected: 0,
        actionsSkipped: 0,
        dryRun: input.dryRun,
        externalExecution: false as const,
        providerContacted: false as const,
        results: [],
        summary: "No ready first-cash sprint bridge actions were eligible for internal dispatch."
      },
      selectedBridgeActionIds: bridgeActionIds,
      sprint: context.plan
    };
  }

  const bridgeInput = applyRevenueLaunchChecklistActionBridgeSchema.parse({
    actionIds: bridgeActionIds,
    confirm: revenueLaunchChecklistActionBridgeConfirmation,
    dryRun: input.dryRun,
    includeCompleted: true,
    maxActions: input.maxSprintActions,
    maxItems: Math.max(25, input.maxCandidates * 4),
    minPriorityScore: 0,
    note: input.note,
    windowDays: 30
  });
  const response = await applyRevenueLaunchChecklistActionBridge(userId, bridgeInput, context.bridgePlan);
  const refreshed = input.dryRun ? context : await buildFirstCashSprintForUser(userId, input);

  return {
    ...response,
    selectedBridgeActionIds: bridgeActionIds,
    sprint: refreshed.plan
  };
}

async function buildFirstBusinessLaunchForUser(userId: string, options: RevenueFirstBusinessLaunchQueryInput): Promise<{
  checklistPlan: RevenueLaunchChecklistPlan;
  firstCashSprintContext: Awaited<ReturnType<typeof buildFirstCashSprintForUser>>;
  plan: RevenueFirstBusinessLaunchPlan;
}> {
  const [checklistPlan, firstCashSprintContext] = await Promise.all([
    buildRevenueLaunchChecklistForUser(userId, revenueLaunchChecklistQuerySchema.parse({
      includeCompleted: true,
      maxItems: Math.max(25, options.maxCandidates * 4),
      minPriorityScore: 0,
      windowDays: 30
    })),
    buildFirstCashSprintForUser(userId, revenueFirstCashSprintQuerySchema.parse({
      includeBlocked: true,
      maxCandidates: options.maxCandidates,
      maxSprintActions: Math.min(5, options.maxCandidates),
      targetDaysToFirstCash: 7
    }))
  ]);
  const plan = buildRevenueFirstBusinessLaunchPlan({
    checklistPlan,
    firstCashSprintPlan: firstCashSprintContext.plan,
    maxCandidates: options.maxCandidates
  });

  return {
    checklistPlan,
    firstCashSprintContext,
    plan
  };
}

async function applyRevenueFirstBusinessLaunch(userId: string, input: ApplyRevenueFirstBusinessLaunchInput) {
  const context = await buildFirstBusinessLaunchForUser(userId, input);
  const selectedSprintActionIds = input.sprintActionIds.length > 0
    ? input.sprintActionIds
    : context.plan.topCandidate?.sprintActionId ? [context.plan.topCandidate.sprintActionId] : [];

  if (selectedSprintActionIds.length === 0) {
    return {
      dispatched: {
        actionsBlocked: 0,
        actionsDispatched: 0,
        actionsPreviewed: 0,
        actionsSelected: 0,
        actionsSkipped: 0,
        dryRun: input.dryRun,
        externalExecution: false as const,
        providerContacted: false as const,
        results: [],
        summary: "No ready first-business launch sprint action is available for internal dispatch."
      },
      plan: context.plan,
      selectedSprintActionIds,
      sprint: context.firstCashSprintContext.plan
    };
  }

  const response = await applyRevenueFirstCashSprint(userId, applyRevenueFirstCashSprintSchema.parse({
    confirm: revenueFirstCashSprintConfirmation,
    dryRun: input.dryRun,
    includeBlocked: true,
    maxCandidates: input.maxCandidates,
    maxSprintActions: Math.max(1, selectedSprintActionIds.length),
    note: input.note,
    sprintActionIds: selectedSprintActionIds,
    targetDaysToFirstCash: 7
  }));
  const refreshed = input.dryRun ? context : await buildFirstBusinessLaunchForUser(userId, input);

  return {
    dispatched: response.dispatched,
    plan: refreshed.plan,
    selectedSprintActionIds,
    sprint: response.sprint
  };
}

async function applyRevenueLiveConnectorReadinessRegistry(userId: string, input: ApplyRevenueLiveConnectorReadinessInput) {
  const options = revenueLiveConnectorReadinessQuerySchema.parse(input);
  const { plan } = await buildLiveConnectorReadinessRegistryForUser(userId, options);
  const selectedEntries = selectRevenueLiveConnectorReadinessEntries(plan, input.storeIds);

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        dryRun: true,
        entriesRecorded: 0,
        entriesSelected: selectedEntries.length,
        externalExecution: false as const,
        providerContacted: false as const,
        readyForDesign: selectedEntries.filter((entry) => entry.status === "ready_for_design").length,
        requiredBoundaries: selectedEntries.reduce((sum, entry) => sum + entry.connectorBoundaries.length, 0),
        summary: `${selectedEntries.length} live connector readiness entr${selectedEntries.length === 1 ? "y" : "ies"} would be recorded as internal audit artifacts.`
      },
      plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.live_connector_readiness.recorded",
    actorUserId: userId,
    metadata: {
      blockedExternalActions: plan.blockedExternalActions,
      entries: selectedEntries.map((entry) => ({
        action: entry.action,
        approvedReadOnlyConnectors: entry.readOnlyEvidence.approvedConnectors,
        connectorBoundaries: entry.connectorBoundaries.map((boundary) => ({
          futureLiveScopes: boundary.futureLiveScopes.map((scope) => scope.scope),
          liveMode: boundary.liveMode,
          provider: boundary.provider,
          providerName: boundary.providerName,
          readiness: boundary.readiness,
          role: boundary.role
        })),
        readinessScore: entry.readinessScore,
        status: entry.status,
        storeId: entry.storeId,
        storeName: entry.storeName
      })),
      externalExecution: false,
      note: input.note ?? null,
      providerContacted: false,
      summary: plan.summary
    },
    outcome: "success",
    severity: selectedEntries.some((entry) => entry.status === "blocked") ? "high" : selectedEntries.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_live_connector_readiness_registry"
  });

  return {
    applied: {
      auditLogId: auditLog.id,
      dryRun: false,
      entriesRecorded: selectedEntries.length,
      entriesSelected: selectedEntries.length,
      externalExecution: false as const,
      providerContacted: false as const,
      readyForDesign: selectedEntries.filter((entry) => entry.status === "ready_for_design").length,
      requiredBoundaries: selectedEntries.reduce((sum, entry) => sum + entry.connectorBoundaries.length, 0),
      summary: `${selectedEntries.length} live connector readiness entr${selectedEntries.length === 1 ? "y" : "ies"} recorded as internal audit artifacts.`
    },
    plan
  };
}

async function buildLiveConnectorDesignDossierForUser(userId: string, options: RevenueLiveConnectorDesignDossierQueryInput): Promise<{
  plan: ReturnType<typeof buildRevenueLiveConnectorDesignDossierPlan>;
}> {
  const { plan: readinessRegistryPlan } = await buildLiveConnectorReadinessRegistryForUser(userId, revenueLiveConnectorReadinessQuerySchema.parse({
    includeBlocked: options.includeBlocked,
    maxEntries: options.maxDossiers,
    minClosureScore: Math.min(options.minReadinessScore, 100),
    minReadOnlyConnectors: options.requireApprovedReadOnlyEvidence ? 1 : 0,
    requireOperationsPackAudit: true,
    requirePerformanceEvidence: true
  }));

  return {
    plan: buildRevenueLiveConnectorDesignDossierPlan({
      options,
      readinessRegistryPlan
    })
  };
}

async function applyRevenueLiveConnectorDesignDossier(userId: string, input: ApplyRevenueLiveConnectorDesignDossierInput) {
  const options = revenueLiveConnectorDesignDossierQuerySchema.parse(input);
  const { plan } = await buildLiveConnectorDesignDossierForUser(userId, options);
  const selectedEntries = selectRevenueLiveConnectorDesignDossiers(plan, input.storeIds);

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        dryRun: true,
        dryRunRequests: selectedEntries.reduce((sum, entry) => sum + entry.dryRunRequests, 0),
        entriesRecorded: 0,
        entriesSelected: selectedEntries.length,
        externalExecution: false as const,
        finalOperatorApprovalReady: selectedEntries.filter((entry) => entry.status === "final_operator_approval_ready").length,
        providerContacted: false as const,
        summary: `${selectedEntries.length} live connector design dossier${selectedEntries.length === 1 ? "" : "s"} would be recorded as internal audit artifacts.`
      },
      plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.live_connector_design_dossier.recorded",
    actorUserId: userId,
    metadata: {
      blockedExternalActions: plan.blockedExternalActions,
      dossiers: selectedEntries.map((entry) => ({
        approvalPackets: entry.approvalPackets,
        boundaries: entry.boundaryDossiers.map((boundary) => ({
          dryRunRequests: boundary.dryRunRequestMap.length,
          liveMode: boundary.liveMode,
          packetId: boundary.finalApprovalPacket.packetId,
          provider: boundary.provider,
          providerName: boundary.providerName,
          readiness: boundary.readiness,
          role: boundary.role
        })),
        dryRunRequests: entry.dryRunRequests,
        readinessScore: entry.readiness.readinessScore,
        status: entry.status,
        storeId: entry.storeId,
        storeName: entry.storeName
      })),
      externalExecution: false,
      note: input.note ?? null,
      providerContacted: false,
      summary: plan.summary
    },
    outcome: "success",
    severity: selectedEntries.some((entry) => entry.status === "blocked") ? "high" : selectedEntries.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_live_connector_design_dossier"
  });

  return {
    applied: {
      auditLogId: auditLog.id,
      dryRun: false,
      dryRunRequests: selectedEntries.reduce((sum, entry) => sum + entry.dryRunRequests, 0),
      entriesRecorded: selectedEntries.length,
      entriesSelected: selectedEntries.length,
      externalExecution: false as const,
      finalOperatorApprovalReady: selectedEntries.filter((entry) => entry.status === "final_operator_approval_ready").length,
      providerContacted: false as const,
      summary: `${selectedEntries.length} live connector design dossier${selectedEntries.length === 1 ? "" : "s"} recorded as internal audit artifacts.`
    },
    plan
  };
}

async function loadFacelessContentPerformanceSnapshots(userId: string, options: FacelessContentPerformanceQueryInput) {
  const cutoff = new Date(Date.now() - options.windowDays * 86_400_000);

  return prisma.facelessContentPerformanceSnapshot.findMany({
    orderBy: { periodEnd: "desc" },
    where: {
      channel: options.channel,
      periodEnd: { gte: cutoff },
      source: options.source,
      storeId: options.storeId,
      userId
    }
  });
}

async function buildFacelessContentPipelineForUser(userId: string, options: FacelessContentPipelineQueryInput): Promise<{
  plan: FacelessContentPipelinePlan;
  stores: StoreRecord[];
}> {
  const stores = await loadPortfolioForUser(userId);
  const storeSnapshots = stores.map((store) => storeSnapshot(store));
  const productSnapshots = stores.flatMap((store) => store.products.map(productSnapshot));
  const cutoff = new Date(Date.now() - options.windowDays * 86_400_000);
  const [existingBriefs, performanceSnapshots] = await Promise.all([
    prisma.facelessContentBrief.findMany({
      select: { dedupeKey: true },
      where: { userId }
    }),
    prisma.facelessContentPerformanceSnapshot.findMany({
      orderBy: { periodEnd: "desc" },
      where: {
        periodEnd: { gte: cutoff },
        userId
      }
    })
  ]);

  return {
    plan: buildFacelessContentPipelinePlan({
      existingBriefSourceKeys: new Set(existingBriefs.map((brief) => brief.dedupeKey)),
      options,
      performanceSnapshots: performanceSnapshots.map(facelessContentPerformanceSnapshot),
      products: productSnapshots,
      stores: storeSnapshots
    }),
    stores
  };
}

async function buildFacelessContentPerformanceForUser(userId: string, options: FacelessContentPerformanceQueryInput): Promise<{
  digest: FacelessContentPipelinePlan["performanceDigest"];
}> {
  const stores = await loadPortfolioForUser(userId);
  const storeSnapshots = stores.map((store) => storeSnapshot(store));
  const productSnapshots = stores.flatMap((store) => store.products.map(productSnapshot));
  const snapshots = await loadFacelessContentPerformanceSnapshots(userId, options);
  const plan = buildFacelessContentPipelinePlan({
    options: {
      targetChannels: options.channel ? [options.channel] : undefined,
      windowDays: options.windowDays
    },
    performanceSnapshots: snapshots.map(facelessContentPerformanceSnapshot),
    products: productSnapshots,
    stores: storeSnapshots
  });

  return {
    digest: plan.performanceDigest
  };
}

async function buildSignalIntakeForUser(userId: string, options: SignalIntakeQueryInput, incoming?: ApplySignalIntakeInput): Promise<SignalIntakePlan> {
  const [stores, briefs] = await Promise.all([
    loadPortfolioForUser(userId),
    prisma.facelessContentBrief.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        productId: true,
        storeId: true,
        title: true
      },
      take: 100,
      where: { userId }
    })
  ]);

  return buildSignalIntakePlan({
    briefs,
    incoming: incoming ? {
      commerceSignals: incoming.commerceSignals,
      contentSignals: incoming.contentSignals,
      paymentSignals: incoming.paymentSignals
    } : undefined,
    options,
    products: stores.flatMap((store) => store.products.map((product) => ({
      id: product.id,
      productName: product.productName,
      storeId: product.storeId
    }))),
    stores: stores.map((store) => ({
      businessName: store.businessName,
      id: store.id,
      launchStatus: launchStatusFromDb[store.launchStatus],
      storePlatform: storePlatformFromDb[store.storePlatform]
    }))
  });
}

async function buildRevenueSignalConnectorsForUser(userId: string, options: RevenueSignalConnectorQueryInput): Promise<RevenueSignalConnectorPlan> {
  const [stores, briefs] = await Promise.all([
    loadPortfolioForUser(userId),
    prisma.facelessContentBrief.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        productId: true,
        storeId: true,
        title: true
      },
      take: 100,
      where: { userId }
    })
  ]);

  return buildRevenueSignalConnectorPlan({
    briefs,
    options,
    products: stores.flatMap((store) => store.products.map((product) => ({
      id: product.id,
      productName: product.productName,
      storeId: product.storeId
    }))),
    stores: stores.map((store) => ({
      businessName: store.businessName,
      id: store.id,
      launchStatus: launchStatusFromDb[store.launchStatus],
      podProvider: podProviderFromDb[store.podProvider],
      storePlatform: storePlatformFromDb[store.storePlatform]
    }))
  });
}

async function applyRevenueSignalConnectors(userId: string, input: ApplyRevenueSignalConnectorInput, plan: RevenueSignalConnectorPlan) {
  const selectedManifests = selectRevenueSignalConnectorManifests(plan, input.manifestIds);
  const blockedManifests = selectedManifests.filter((manifestItem) => manifestItem.status !== "ready_for_approval");
  const auditLogId = input.dryRun ? null : (await recordAuditLog({
    action: "revenue.signal_connectors.manifests_recorded",
    actorUserId: userId,
    metadata: {
      blockedExternalActions: plan.blockedExternalActions,
      blockedManifestIds: blockedManifests.map((manifestItem) => manifestItem.id),
      dryRun: false,
      externalExecution: false,
      manifestIds: selectedManifests.map((manifestItem) => manifestItem.id),
      note: input.note ?? null,
      providerContacted: false,
      readyManifestIds: selectedManifests.filter((manifestItem) => manifestItem.status === "ready_for_approval").map((manifestItem) => manifestItem.id),
      requiredConfirmation: revenueSignalConnectorConfirmation,
      sampleTotals: {
        commerce: plan.totals.sampleCommerceSignals,
        content: plan.totals.sampleContentSignals,
        payments: plan.totals.samplePaymentSignals
      },
      summary: plan.summary
    },
    outcome: blockedManifests.length > 0 ? "failure" : "success",
    severity: blockedManifests.length > 0 || selectedManifests.some((manifestItem) => manifestItem.provider === "stripe") ? "medium" : "low",
    targetId: selectedManifests[0]?.id ?? null,
    targetType: "revenue_signal_connector_manifest"
  })).id;

  return {
    auditLogId,
    blockedManifestIds: blockedManifests.map((manifestItem) => manifestItem.id),
    dryRun: input.dryRun,
    externalExecution: false as const,
    manifestIds: selectedManifests.map((manifestItem) => manifestItem.id),
    manifestsRecorded: input.dryRun ? 0 : selectedManifests.length,
    providerContacted: false as const,
    readyManifests: selectedManifests.length - blockedManifests.length,
    sampleSignals: plan.signalIntakePreview.totals.signals,
    summary: selectedManifests.length === 0
      ? "No read-only signal connector manifests matched the request."
      : `${selectedManifests.length} read-only signal connector manifest${selectedManifests.length === 1 ? "" : "s"} ${input.dryRun ? "previewed" : "recorded"} internally. External execution remains locked.`
  };
}

function signalPreviewForManifest(manifest: RevenueSignalConnectorManifest, windowDays: number): SignalIntakePlan {
  return buildSignalIntakePlan({
    incoming: manifest.samplePayload ?? undefined,
    options: {
      includeSamplePayloads: false,
      maxSignals: 100,
      windowDays
    }
  });
}

async function buildRevenueSignalConnectorApprovalForUser(
  userId: string,
  options: RevenueSignalConnectorApprovalQueryInput
): Promise<RevenueSignalConnectorApprovalPlan> {
  const connectorPlan = await buildRevenueSignalConnectorsForUser(userId, options);
  const [approvalRecords, importJobRecords] = await Promise.all([
    prisma.revenueSignalConnectorApproval.findMany({
      orderBy: { updatedAt: "desc" },
      take: options.maxRecords,
      where: {
        userId,
        ...(options.includeArchived ? {} : { status: { not: "archived" } })
      }
    }),
    prisma.revenueSignalImportJob.findMany({
      orderBy: { updatedAt: "desc" },
      take: options.maxRecords,
      where: {
        userId,
        ...(options.includeArchived ? {} : { status: { not: "archived" } })
      }
    })
  ]);

  return buildRevenueSignalConnectorApprovalPlan({
    approvals: approvalRecords.map(revenueSignalConnectorApprovalSnapshot),
    connectorPlan,
    importJobs: importJobRecords.map(revenueSignalImportJobSnapshot)
  });
}

async function queueRevenueSignalConnectorApprovals(
  userId: string,
  input: ApplyRevenueSignalConnectorApprovalInput,
  plan: RevenueSignalConnectorApprovalPlan
) {
  const selectedManifests = selectRevenueSignalConnectorManifests(plan.connectorPlan, input.manifestIds);
  const existingDedupeKeys = new Set(plan.approvals.map((approval) => approval.dedupeKey));
  const blockedManifests = selectedManifests.filter((manifestItem) => manifestItem.status !== "ready_for_approval");
  const skippedExistingManifests = selectedManifests.filter((manifestItem) => existingDedupeKeys.has(revenueSignalConnectorApprovalDedupeKey(manifestItem)));
  const queueableManifests = selectedManifests
    .filter((manifestItem) => manifestItem.status === "ready_for_approval")
    .filter((manifestItem) => !existingDedupeKeys.has(revenueSignalConnectorApprovalDedupeKey(manifestItem)));

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        blockedManifestIds: blockedManifests.map((manifestItem) => manifestItem.id),
        dryRun: true,
        externalExecution: false as const,
        manifestIds: selectedManifests.map((manifestItem) => manifestItem.id),
        providerContacted: false as const,
        queuedApprovalIds: [] as string[],
        queuedApprovals: 0,
        readyManifests: queueableManifests.length,
        skippedExistingManifestIds: skippedExistingManifests.map((manifestItem) => manifestItem.id),
        summary: `${queueableManifests.length} read-only connector approval record${queueableManifests.length === 1 ? "" : "s"} would be queued.`
      },
      plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.signal_connectors.approvals_queued",
    actorUserId: userId,
    metadata: {
      blockedExternalActions: plan.blockedExternalActions,
      blockedManifestIds: blockedManifests.map((manifestItem) => manifestItem.id),
      dryRun: false,
      externalExecution: false,
      manifestIds: selectedManifests.map((manifestItem) => manifestItem.id),
      note: input.note ?? null,
      providerContacted: false,
      queueableManifestIds: queueableManifests.map((manifestItem) => manifestItem.id),
      requiredConfirmation: revenueSignalConnectorApprovalConfirmation,
      skippedExistingManifestIds: skippedExistingManifests.map((manifestItem) => manifestItem.id),
      summary: plan.summary
    },
    outcome: blockedManifests.length > 0 ? "failure" : "success",
    severity: blockedManifests.length > 0 || queueableManifests.some((manifestItem) => manifestItem.provider === "stripe") ? "medium" : "low",
    targetId: queueableManifests[0]?.id ?? selectedManifests[0]?.id ?? null,
    targetType: "revenue_signal_connector_approval"
  });
  const queued = await Promise.all(queueableManifests.map((manifestItem) => prisma.revenueSignalConnectorApproval.upsert({
    create: {
      blockedActionsJson: stringifySecureJson(manifestItem.blockedExternalActions),
      contentBriefId: manifestItem.target.contentBriefId,
      credentialEnvVarsJson: stringifySecureJson(manifestItem.credentialEnvVars),
      dedupeKey: revenueSignalConnectorApprovalDedupeKey(manifestItem),
      endpointTemplatesJson: stringifySecureJson(manifestItem.endpointTemplates),
      externalExecution: false,
      lane: manifestItem.lane,
      manifestId: manifestItem.id,
      manifestJson: stringifySecureJson(manifestItem),
      productId: manifestItem.target.productId,
      provider: manifestItem.provider,
      providerContacted: false,
      providerName: manifestItem.providerName,
      readOnlyScopesJson: stringifySecureJson(manifestItem.readOnlyScopes),
      readinessScore: manifestItem.readinessScore,
      requestAuditLogId: auditLog.id,
      riskLevel: manifestItem.riskLevel,
      samplePayloadJson: manifestItem.samplePayload ? stringifySecureJson(manifestItem.samplePayload) : null,
      signalPreviewJson: stringifySecureJson(signalPreviewForManifest(manifestItem, input.windowDays)),
      status: "pending_review",
      storeId: manifestItem.target.storeId,
      storeName: manifestItem.target.storeName,
      transformTarget: manifestItem.transformTarget,
      userId
    },
    update: {
      requestAuditLogId: auditLog.id,
      updatedAt: new Date()
    },
    where: {
      userId_dedupeKey: {
        dedupeKey: revenueSignalConnectorApprovalDedupeKey(manifestItem),
        userId
      }
    }
  })));
  const refreshed = await buildRevenueSignalConnectorApprovalForUser(userId, input);

  return {
    applied: {
      auditLogId: auditLog.id,
      blockedManifestIds: blockedManifests.map((manifestItem) => manifestItem.id),
      dryRun: false,
      externalExecution: false as const,
      manifestIds: selectedManifests.map((manifestItem) => manifestItem.id),
      providerContacted: false as const,
      queuedApprovalIds: queued.map((record) => record.id),
      queuedApprovals: queued.length,
      readyManifests: queueableManifests.length,
      skippedExistingManifestIds: skippedExistingManifests.map((manifestItem) => manifestItem.id),
      summary: `${queued.length} read-only connector approval record${queued.length === 1 ? "" : "s"} queued internally. External execution remains locked.`
    },
    plan: refreshed
  };
}

async function reviewRevenueSignalConnectorApproval(
  userId: string,
  params: RevenueSignalConnectorApprovalParamsInput,
  input: ReviewRevenueSignalConnectorApprovalInput,
  options: RevenueSignalConnectorApprovalQueryInput
) {
  const approval = await prisma.revenueSignalConnectorApproval.findFirst({
    where: {
      id: params.approvalId,
      userId
    }
  });

  if (!approval) {
    return {
      errorCode: 404,
      errorMessage: "Signal connector approval was not found."
    };
  }

  if (approval.status === "import_queued" || approval.status === "archived") {
    return {
      errorCode: 409,
      errorMessage: "Signal connector approval cannot be reviewed after it has been archived or queued for import."
    };
  }

  const expectedConfirmation = input.action === "approve"
    ? revenueSignalConnectorApproveConfirmation
    : revenueSignalConnectorRejectConfirmation;
  const nextStatus = input.action === "approve" ? "approved" : "rejected";
  const auditLog = await recordAuditLog({
    action: "revenue.signal_connectors.approval_reviewed",
    actorUserId: userId,
    metadata: {
      approvalId: approval.id,
      dryRun: false,
      externalExecution: false,
      fromStatus: approval.status,
      manifestId: approval.manifestId,
      note: input.note ?? null,
      provider: approval.provider,
      providerContacted: false,
      requiredConfirmation: expectedConfirmation,
      reviewAction: input.action,
      toStatus: nextStatus
    },
    outcome: "success",
    severity: approval.provider === "stripe" || input.action === "reject" ? "medium" : "low",
    targetId: approval.id,
    targetType: "revenue_signal_connector_approval"
  });
  const updated = await prisma.revenueSignalConnectorApproval.update({
    data: {
      reviewAuditLogId: auditLog.id,
      reviewedAt: new Date(),
      reviewedById: userId,
      reviewNote: input.note ?? null,
      status: nextStatus
    },
    where: { id: approval.id }
  });
  const refreshed = await buildRevenueSignalConnectorApprovalForUser(userId, options);

  return {
    applied: {
      approvalId: updated.id,
      auditLogId: auditLog.id,
      dryRun: false,
      externalExecution: false as const,
      fromStatus: approval.status,
      manifestId: approval.manifestId,
      providerContacted: false as const,
      reviewAction: input.action,
      toStatus: updated.status
    },
    plan: refreshed
  };
}

async function queueRevenueSignalImportJobs(
  userId: string,
  input: ApplyRevenueSignalImportJobInput,
  plan: RevenueSignalConnectorApprovalPlan
) {
  const selectedApprovals = selectRevenueSignalApprovalsForImport(plan, input.approvalIds);

  if (input.dryRun) {
    return {
      applied: {
        approvalIds: selectedApprovals.map((approval) => approval.id),
        auditLogId: null,
        dryRun: true,
        externalExecution: false as const,
        importJobIds: [] as string[],
        importJobsQueued: 0,
        providerContacted: false as const,
        sampleSignalsQueued: selectedApprovals.reduce((sum, approval) => (
          sum
          + (approval.samplePayload?.commerceSignals?.length ?? 0)
          + (approval.samplePayload?.contentSignals?.length ?? 0)
          + (approval.samplePayload?.paymentSignals?.length ?? 0)
        ), 0),
        summary: `${selectedApprovals.length} approved read-only connector${selectedApprovals.length === 1 ? "" : "s"} would queue import jobs.`
      },
      plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.signal_import_jobs.queued",
    actorUserId: userId,
    metadata: {
      approvalIds: selectedApprovals.map((approval) => approval.id),
      blockedExternalActions: plan.blockedExternalActions,
      dryRun: false,
      externalExecution: false,
      manifestIds: selectedApprovals.map((approval) => approval.manifestId),
      note: input.note ?? null,
      providerContacted: false,
      requiredConfirmation: revenueSignalImportJobConfirmation,
      summary: plan.summary
    },
    outcome: "success",
    severity: selectedApprovals.some((approval) => approval.provider === "stripe") ? "medium" : "low",
    targetId: selectedApprovals[0]?.id ?? null,
    targetType: "revenue_signal_import_job"
  });
  const jobs = await Promise.all(selectedApprovals.map((approval) => prisma.revenueSignalImportJob.upsert({
    create: {
      approvalId: approval.id,
      auditLogId: auditLog.id,
      externalExecution: false,
      lane: approval.lane,
      manifestId: approval.manifestId,
      provider: approval.provider,
      providerContacted: false,
      samplePayloadJson: approval.samplePayload ? stringifySecureJson(approval.samplePayload) : null,
      signalPreviewJson: stringifySecureJson(approval.signalPreview),
      status: "queued_review",
      transformTarget: approval.transformTarget,
      userId
    },
    update: {
      auditLogId: auditLog.id,
      updatedAt: new Date()
    },
    where: {
      userId_approvalId: {
        approvalId: approval.id,
        userId
      }
    }
  })));

  if (selectedApprovals.length > 0) {
    await prisma.revenueSignalConnectorApproval.updateMany({
      data: { status: "import_queued" },
      where: {
        id: { in: selectedApprovals.map((approval) => approval.id) },
        userId
      }
    });
  }

  const refreshed = await buildRevenueSignalConnectorApprovalForUser(userId, input);

  return {
    applied: {
      approvalIds: selectedApprovals.map((approval) => approval.id),
      auditLogId: auditLog.id,
      dryRun: false,
      externalExecution: false as const,
      importJobIds: jobs.map((job) => job.id),
      importJobsQueued: jobs.length,
      providerContacted: false as const,
      sampleSignalsQueued: selectedApprovals.reduce((sum, approval) => (
        sum
        + (approval.samplePayload?.commerceSignals?.length ?? 0)
        + (approval.samplePayload?.contentSignals?.length ?? 0)
        + (approval.samplePayload?.paymentSignals?.length ?? 0)
      ), 0),
      summary: `${jobs.length} read-only signal import job${jobs.length === 1 ? "" : "s"} queued internally.`
    },
    plan: refreshed
  };
}

async function buildRevenueSignalImportHandoffForUser(
  userId: string,
  options: RevenueSignalImportHandoffQueryInput
): Promise<RevenueSignalImportHandoffPlan> {
  const importJobRecords = await prisma.revenueSignalImportJob.findMany({
    orderBy: { updatedAt: "desc" },
    take: options.maxJobs,
    where: {
      userId,
      ...(options.includeArchived ? {} : { status: { not: "archived" } })
    }
  });

  return buildRevenueSignalImportHandoffPlan({
    importJobs: importJobRecords.map(revenueSignalImportJobSnapshot),
    options
  });
}

async function buildRevenueLaunchChecklistContextForUser(
  userId: string,
  options: RevenueLaunchChecklistQueryInput
): Promise<{
  commandPlan: PortfolioCommandCenterPlan;
  checklistPlan: RevenueLaunchChecklistPlan;
  assetPortfolio: RevenueAssetPortfolio;
  signalApprovalPlan: RevenueSignalConnectorApprovalPlan;
  signalImportHandoffPlan: RevenueSignalImportHandoffPlan;
}> {
  const maxItems = Math.min(Math.max(options.maxItems, 1), 100);
  const [opportunityResult, launchReadinessResult, signalApprovalPlan, signalImportHandoffPlan, commandResult] = await Promise.all([
    buildRevenueOpportunityControlForUser(userId, revenueOpportunityControlQuerySchema.parse({
      includeKilled: options.includeCompleted,
      maxOpportunities: maxItems,
      windowDays: options.windowDays
    })),
    buildLaunchReadinessForUser(userId, revenueLaunchReadinessQuerySchema.parse({
      includeApprovalHistory: true,
      maxStores: Math.min(maxItems, 50)
    })),
    buildRevenueSignalConnectorApprovalForUser(userId, revenueSignalConnectorApprovalQuerySchema.parse({
      includeArchived: options.includeCompleted,
      maxConnectors: 100,
      maxRecords: 100,
      windowDays: options.windowDays
    })),
    buildRevenueSignalImportHandoffForUser(userId, revenueSignalImportHandoffQuerySchema.parse({
      includeArchived: options.includeCompleted,
      maxJobs: 100,
      maxSignals: 100,
      windowDays: options.windowDays
    })),
    buildPortfolioCommandCenterForUser(userId, portfolioCommandCenterQuerySchema.parse({
      includeCommandHistory: 50,
      includeContent: true,
      includeFinance: true,
      maxActions: 100,
      windowDays: options.windowDays
    }))
  ]);

  const checklistPlan = buildRevenueLaunchChecklistPlan({
    assetPortfolio: commandResult.assetPortfolio,
    commandPlan: commandResult.plan,
    launchReadinessPlan: launchReadinessResult.plan,
    opportunityPlan: opportunityResult.plan,
    options,
    signalApprovalPlan,
    signalImportHandoffPlan
  });

  return {
    assetPortfolio: commandResult.assetPortfolio,
    checklistPlan,
    commandPlan: commandResult.plan,
    signalApprovalPlan,
    signalImportHandoffPlan
  };
}

async function buildRevenueLaunchChecklistForUser(
  userId: string,
  options: RevenueLaunchChecklistQueryInput
): Promise<RevenueLaunchChecklistPlan> {
  const context = await buildRevenueLaunchChecklistContextForUser(userId, options);

  return context.checklistPlan;
}

async function buildRevenueLaunchChecklistActionBridgeForUser(
  userId: string,
  options: RevenueLaunchChecklistActionBridgeQueryInput
): Promise<{
  bridgePlan: RevenueLaunchChecklistActionBridgePlan;
  checklistPlan: RevenueLaunchChecklistPlan;
  commandPlan: PortfolioCommandCenterPlan;
  signalApprovalPlan: RevenueSignalConnectorApprovalPlan;
  signalImportHandoffPlan: RevenueSignalImportHandoffPlan;
}> {
  const checklistOptions = revenueLaunchChecklistQuerySchema.parse({
    includeCompleted: options.includeCompleted,
    maxItems: options.maxItems,
    minPriorityScore: options.minPriorityScore,
    windowDays: options.windowDays
  });
  const context = await buildRevenueLaunchChecklistContextForUser(userId, checklistOptions);
  const bridgePlan = buildRevenueLaunchChecklistActionBridgePlan({
    checklistPlan: context.checklistPlan,
    commandPlan: context.commandPlan,
    options,
    signalApprovalPlan: context.signalApprovalPlan,
    signalImportHandoffPlan: context.signalImportHandoffPlan
  });

  return {
    ...context,
    bridgePlan
  };
}

function signalIntakeInputFromImportPayload(
  payload: SignalIntakeInput,
  input: ApplyRevenueSignalImportHandoffInput
): ApplySignalIntakeInput {
  return applySignalIntakeSchema.parse({
    commerceSignals: payload.commerceSignals ?? [],
    confirm: "INGEST APPROVED READ-ONLY SIGNALS",
    contentSignals: payload.contentSignals ?? [],
    dryRun: input.dryRun,
    includeSamplePayloads: false,
    maxSignals: input.maxSignals,
    paymentSignals: payload.paymentSignals ?? [],
    windowDays: input.windowDays
  });
}

async function applyRevenueSignalImportHandoff(
  userId: string,
  input: ApplyRevenueSignalImportHandoffInput,
  plan: RevenueSignalImportHandoffPlan
) {
  const selectedJobs = selectRevenueSignalImportJobsForHandoff(plan, input.importJobIds);
  const stagedPayload = mergeRevenueSignalImportJobPayloads(selectedJobs, input.maxSignals);
  const signalInput = signalIntakeInputFromImportPayload(stagedPayload, input);
  const signalOptions: SignalIntakeQueryInput = {
    includeSamplePayloads: false,
    maxSignals: input.maxSignals,
    windowDays: input.windowDays
  };
  const signalPlan = await buildSignalIntakeForUser(userId, signalOptions, signalInput);
  const commerceOwnership = await validatePerformanceSnapshotOwnership(userId, signalInput.commerceSignals);

  if (commerceOwnership.error) {
    return {
      errorCode: 404,
      errorMessage: commerceOwnership.error
    };
  }

  const contentOwnership = await validateFacelessContentPerformanceOwnership(userId, signalInput.contentSignals);

  if (contentOwnership.error) {
    return {
      errorCode: 404,
      errorMessage: contentOwnership.error
    };
  }

  if (input.dryRun) {
    return {
      handoff: {
        auditLogId: null,
        contentSnapshotsCreated: signalPlan.totals.contentSignals,
        dryRun: true,
        externalExecution: false as const,
        importJobIds: selectedJobs.map((job) => job.id),
        jobsCompleted: 0,
        paymentReconciliationReportId: null,
        paymentSignalsRecorded: signalPlan.totals.paymentSignals,
        providerContacted: false as const,
        revenueSnapshotsCreated: signalPlan.totals.commerceSignals,
        sampleSignalsIngested: signalPlan.totals.signals,
        signalIntakeAuditLogId: null,
        summary: `${selectedJobs.length} read-only import job${selectedJobs.length === 1 ? "" : "s"} would hand off ${signalPlan.totals.signals} stored signal${signalPlan.totals.signals === 1 ? "" : "s"} into Signal Intake.`
      },
      plan,
      signalIntakePlan: signalPlan
    };
  }

  const applied = await applySignalIntake(userId, signalInput, signalPlan);
  const auditLog = await recordAuditLog({
    action: "revenue.signal_import_handoff.completed",
    actorUserId: userId,
    metadata: {
      blockedExternalActions: plan.blockedExternalActions,
      contentSnapshotsCreated: applied.contentSnapshotsCreated,
      dryRun: false,
      externalExecution: false,
      importJobIds: selectedJobs.map((job) => job.id),
      note: input.note ?? null,
      paymentReconciliationReportId: applied.paymentReconciliationReportId,
      paymentSignalsRecorded: signalPlan.totals.paymentSignals,
      providerContacted: false,
      requiredConfirmation: revenueSignalImportHandoffConfirmation,
      revenueSnapshotsCreated: applied.revenueSnapshotsCreated,
      signalIntakeAuditLogId: applied.auditLogId,
      summary: signalPlan.summary,
      totals: signalPlan.totals
    },
    outcome: "success",
    severity: signalPlan.totals.paymentSignals > 0 || selectedJobs.some((job) => job.provider === "stripe") ? "medium" : "low",
    targetId: selectedJobs[0]?.id ?? null,
    targetType: "revenue_signal_import_handoff"
  });

  if (selectedJobs.length > 0) {
    await prisma.revenueSignalImportJob.updateMany({
      data: {
        completedAt: new Date(),
        handoffAuditLogId: auditLog.id,
        intakeResultJson: stringifySecureJson({
          ...applied,
          paymentSignalsRecorded: signalPlan.totals.paymentSignals,
          sampleSignalsIngested: signalPlan.totals.signals,
          signalIntakeAuditLogId: applied.auditLogId
        }),
        status: "completed"
      },
      where: {
        id: { in: selectedJobs.map((job) => job.id) },
        userId
      }
    });
  }

  const refreshed = await buildRevenueSignalImportHandoffForUser(userId, input);

  return {
    handoff: {
      auditLogId: auditLog.id,
      contentSnapshotsCreated: applied.contentSnapshotsCreated,
      dryRun: false,
      externalExecution: false as const,
      importJobIds: selectedJobs.map((job) => job.id),
      jobsCompleted: selectedJobs.length,
      paymentReconciliationReportId: applied.paymentReconciliationReportId,
      paymentSignalsRecorded: signalPlan.totals.paymentSignals,
      providerContacted: false as const,
      revenueSnapshotsCreated: applied.revenueSnapshotsCreated,
      sampleSignalsIngested: signalPlan.totals.signals,
      signalIntakeAuditLogId: applied.auditLogId,
      summary: `${selectedJobs.length} read-only signal import job${selectedJobs.length === 1 ? "" : "s"} completed internal Signal Intake handoff.`
    },
    plan: refreshed,
    signalIntakePlan: signalPlan
  };
}

function payloadStringArray(action: RevenueLaunchChecklistActionBridgeItem, key: string) {
  const value = action.payload[key];

  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function payloadString(action: RevenueLaunchChecklistActionBridgeItem, key: string) {
  const value = action.payload[key];

  return typeof value === "string" ? value : null;
}

function previewLaunchPipelineApply(plan: RevenueLaunchPipelinePlan) {
  return {
    approvalPackets: plan.storePlans
      .filter((storePlan) => storePlan.action === "queue_launch_approval" || storePlan.action === "prepare_launch_package")
      .map((storePlan) => ({
        id: null,
        storeId: storePlan.storeId
      })),
    createdProducts: plan.storePlans
      .filter((storePlan) => storePlan.action === "seed_products")
      .reduce((sum, storePlan) => sum + storePlan.missingProducts, 0),
    storeUpdates: plan.storePlans
      .filter((storePlan) => storePlan.action !== "hold")
      .map((storePlan) => ({
        action: storePlan.action,
        storeId: storePlan.storeId,
        storeName: storePlan.storeName
      }))
  };
}

async function dispatchLaunchChecklistBridgeAction(
  userId: string,
  action: RevenueLaunchChecklistActionBridgeItem,
  input: ApplyRevenueLaunchChecklistActionBridgeInput
) {
  if (action.dispatchKind === "launch_pipeline") {
    const storeId = payloadString(action, "storeId");
    const launchAction = payloadString(action, "launchAction");
    const { plan, stores } = await buildLaunchPipelineForUser(userId, revenueLaunchPipelineQuerySchema.parse({
      maxStores: 25
    }));
    const filteredPlan: RevenueLaunchPipelinePlan = {
      ...plan,
      queue: plan.queue.filter((queueItem) => queueItem.storeId === storeId && queueItem.action === launchAction),
      storePlans: plan.storePlans.filter((storePlan) => storePlan.storeId === storeId && storePlan.action === launchAction)
    };
    const filteredStores = stores.filter((store) => store.id === storeId);
    const applied = input.dryRun
      ? previewLaunchPipelineApply(filteredPlan)
      : await applyLaunchPipeline(userId, filteredStores, filteredPlan);

    return {
      ...applied,
      dryRun: input.dryRun,
      planSummary: filteredPlan.summary
    };
  }

  if (action.dispatchKind === "listing_optimization") {
    const storeId = payloadString(action, "storeId");
    const { plan } = await buildListingOptimizationForUser(userId, revenueListingOptimizationQuerySchema.parse({
      windowDays: input.windowDays
    }));
    const filteredPlan: RevenueListingOptimizationPlan = {
      ...plan,
      experiments: plan.experiments.filter((experiment) => experiment.storeId === storeId)
    };
    const applied = input.dryRun
      ? {
        productUpdates: filteredPlan.experiments.map((experiment) => ({
          fromStatus: experiment.currentListing.title ? "Existing listing draft" : "Missing listing copy",
          productId: experiment.productId,
          productName: experiment.productName,
          recommendedVariantId: experiment.recommendedVariant.id,
          storeId: experiment.storeId,
          toStatus: experiment.recommendedInternalStatus
        }))
      }
      : await applyListingOptimization(userId, filteredPlan);

    return {
      ...applied,
      dryRun: input.dryRun,
      planSummary: filteredPlan.summary
    };
  }

  if (action.dispatchKind === "store_setup") {
    const storeId = payloadString(action, "storeId");
    const { plan, stores } = await buildStoreSetupForUser(userId, revenueStoreSetupQuerySchema.parse({
      maxStores: 50
    }));
    const filteredPlan: RevenueStoreSetupPlan = {
      ...plan,
      queue: plan.queue.filter((queueItem) => queueItem.storeId === storeId),
      runbooks: plan.runbooks.filter((runbook) => runbook.storeId === storeId)
    };
    const filteredStores = stores.filter((store) => store.id === storeId);
    const applied = input.dryRun
      ? { storeUpdates: storeSetupUpdatesFrom(filteredPlan, filteredStores) }
      : await applyStoreSetup(userId, filteredPlan, filteredStores);

    return {
      ...applied,
      dryRun: input.dryRun,
      planSummary: filteredPlan.summary
    };
  }

  if (action.dispatchKind === "signal_connector_approval") {
    const actionInput = applyRevenueSignalConnectorApprovalSchema.parse({
      confirm: "QUEUE READONLY SIGNAL CONNECTOR APPROVALS",
      dryRun: input.dryRun,
      manifestIds: payloadStringArray(action, "manifestIds"),
      maxConnectors: 100,
      maxRecords: 100,
      note: input.note,
      onlyReady: true,
      windowDays: input.windowDays
    });
    const plan = await buildRevenueSignalConnectorApprovalForUser(userId, actionInput);

    return queueRevenueSignalConnectorApprovals(userId, actionInput, plan);
  }

  if (action.dispatchKind === "signal_import_job") {
    const actionInput = applyRevenueSignalImportJobSchema.parse({
      approvalIds: payloadStringArray(action, "approvalIds"),
      confirm: "QUEUE READONLY SIGNAL IMPORT JOBS",
      dryRun: input.dryRun,
      includeArchived: input.includeCompleted,
      maxConnectors: 100,
      maxRecords: 100,
      note: input.note,
      windowDays: input.windowDays
    });
    const plan = await buildRevenueSignalConnectorApprovalForUser(userId, actionInput);

    return queueRevenueSignalImportJobs(userId, actionInput, plan);
  }

  if (action.dispatchKind === "signal_import_handoff") {
    const actionInput = applyRevenueSignalImportHandoffSchema.parse({
      confirm: "INGEST QUEUED READONLY SIGNAL IMPORT JOBS",
      dryRun: input.dryRun,
      importJobIds: payloadStringArray(action, "importJobIds"),
      includeArchived: input.includeCompleted,
      maxJobs: 100,
      maxSignals: 100,
      note: input.note,
      windowDays: input.windowDays
    });
    const plan = await buildRevenueSignalImportHandoffForUser(userId, actionInput);

    return applyRevenueSignalImportHandoff(userId, actionInput, plan);
  }

  if (action.dispatchKind === "portfolio_command") {
    const commandHashes = new Set(payloadStringArray(action, "commandHashes"));
    const { assetPortfolio, plan } = await buildPortfolioCommandCenterForUser(userId, portfolioCommandCenterQuerySchema.parse({
      includeCommandHistory: 50,
      includeContent: true,
      includeFinance: true,
      maxActions: 100,
      windowDays: input.windowDays
    }));
    const filteredPlan: PortfolioCommandCenterPlan = {
      ...plan,
      commandActions: plan.commandActions.filter((command) => commandHashes.has(command.commandHash))
    };

    if (input.dryRun) {
      const assetControlBatch = buildRevenueAssetControlsFromPortfolioCommands({
        plan: filteredPlan,
        portfolio: assetPortfolio
      });

      return {
        assetControlActionsSkipped: assetControlBatch.skipped.length,
        assetControlAuditLogId: null,
        assetControlBatchReview: assetControlBatch.controlReview,
        assetControlRecordsCreated: assetControlBatch.controls.length,
        commandRecordsCreated: filteredPlan.commandActions.length,
        dryRun: true,
        externalExecution: false,
        providerContacted: false
      };
    }

    return applyPortfolioCommandCenter(userId, filteredPlan, assetPortfolio);
  }

  return {
    reason: action.blockedReason ?? "Action requires manual review.",
    skipped: true
  };
}

async function applyRevenueLaunchChecklistActionBridge(
  userId: string,
  input: ApplyRevenueLaunchChecklistActionBridgeInput,
  bridgePlan: RevenueLaunchChecklistActionBridgePlan
) {
  const selectedActions = selectRevenueLaunchChecklistBridgeActions(bridgePlan, input.actionIds);
  const results = [];
  const totals = {
    actionsBlocked: 0,
    actionsDispatched: 0,
    actionsPreviewed: 0,
    actionsSelected: selectedActions.length,
    actionsSkipped: 0,
    externalExecution: false as const,
    providerContacted: false as const
  };

  for (const action of selectedActions) {
    if (action.status !== "ready") {
      totals.actionsBlocked += 1;
      results.push({
        actionId: action.actionId,
        dispatchKind: action.dispatchKind,
        externalExecution: false as const,
        providerContacted: false as const,
        result: {
          reason: action.blockedReason ?? "Action is not ready for dispatch."
        },
        status: action.status === "watch" ? "skipped" : "blocked"
      });
      continue;
    }

    const result = await dispatchLaunchChecklistBridgeAction(userId, action, input);
    const skipped = typeof result === "object" && result !== null && "skipped" in result && result.skipped === true;

    if (skipped) {
      totals.actionsSkipped += 1;
    } else if (input.dryRun) {
      totals.actionsPreviewed += 1;
    } else {
      totals.actionsDispatched += 1;
    }

    results.push({
      actionId: action.actionId,
      dispatchKind: action.dispatchKind,
      externalExecution: false as const,
      providerContacted: false as const,
      result,
      status: skipped ? "skipped" : input.dryRun ? "previewed" : "dispatched"
    });
  }

  const refreshedContext = input.dryRun
    ? null
    : await buildRevenueLaunchChecklistActionBridgeForUser(userId, input);

  return {
    bridge: refreshedContext?.bridgePlan ?? bridgePlan,
    checklist: refreshedContext?.checklistPlan ?? null,
    dispatched: {
      ...totals,
      dryRun: input.dryRun,
      results,
      summary: input.dryRun
        ? `${totals.actionsPreviewed} checklist bridge action${totals.actionsPreviewed === 1 ? "" : "s"} previewed.`
        : `${totals.actionsDispatched} checklist bridge action${totals.actionsDispatched === 1 ? "" : "s"} dispatched internally.`
    }
  };
}

function revenueLaunchSprintOptionsFrom(input: ApplyRevenueLaunchSprintInput): RevenueLaunchSprintOptions {
  return {
    includeCompleted: input.includeCompleted,
    maxActions: input.maxActions,
    maxCycles: input.maxCycles,
    maxItems: input.maxItems,
    minPriorityScore: input.minPriorityScore,
    windowDays: input.windowDays
  };
}

function revenueLaunchSprintFactoryInput(input: ApplyRevenueLaunchSprintInput): ApplyRevenueOpportunityFactoryInput | null {
  if (!input.idea) return null;

  return applyRevenueOpportunityFactorySchema.parse({
    audience: input.audience,
    brandStyle: input.brandStyle,
    businessName: input.businessName,
    clientName: input.clientName,
    confirm: revenueOpportunityFactoryConfirmation,
    contactName: input.contactName,
    dryRun: input.dryRun,
    email: input.email,
    idea: input.idea,
    industry: input.industry,
    podProvider: input.podProvider,
    priceRange: input.priceRange,
    productCount: input.productCount,
    productTypes: input.productTypes,
    riskTolerance: input.riskTolerance,
    sourceKey: input.sourceKey,
    storePlatform: input.storePlatform
  });
}

function revenueLaunchSprintFactorySummary(response: Awaited<ReturnType<typeof applyRevenueOpportunityFactory>> | null): RevenueLaunchSprintFactorySummary | null {
  if (!response) return null;

  return {
    auditLogId: response.applied.auditLogId,
    businessName: response.plan.storeDraft.businessName,
    dryRun: response.applied.dryRun,
    externalExecution: false,
    opportunityId: response.applied.opportunityId,
    productDraftsCreated: response.applied.productDraftsCreated,
    providerContacted: false,
    skippedExistingProducts: response.applied.skippedExistingProducts,
    storeCreated: response.applied.storeCreated,
    storeId: response.applied.storeId
  };
}

function revenueLaunchSprintBridgeInput(
  input: ApplyRevenueLaunchSprintInput,
  actionIds: string[],
  dryRun: boolean
): ApplyRevenueLaunchChecklistActionBridgeInput {
  return applyRevenueLaunchChecklistActionBridgeSchema.parse({
    actionIds,
    confirm: revenueLaunchChecklistActionBridgeConfirmation,
    dryRun,
    includeCompleted: input.includeCompleted,
    maxActions: input.maxActions,
    maxItems: input.maxItems,
    minPriorityScore: input.minPriorityScore,
    note: input.note,
    windowDays: input.windowDays
  });
}

function numericResultValue(result: Record<string, unknown>, key: string) {
  const value = result[key];

  return typeof value === "number" ? value : 0;
}

function arrayResultLength(result: Record<string, unknown>, key: string) {
  const value = result[key];

  return Array.isArray(value) ? value.length : 0;
}

function sumBridgeResultNumber(
  results: Awaited<ReturnType<typeof applyRevenueLaunchChecklistActionBridge>>["dispatched"]["results"],
  key: string
) {
  return results.reduce((sum, item) => (
    item.result && typeof item.result === "object"
      ? sum + numericResultValue(item.result as Record<string, unknown>, key)
      : sum
  ), 0);
}

function sumBridgeResultArrayLength(
  results: Awaited<ReturnType<typeof applyRevenueLaunchChecklistActionBridge>>["dispatched"]["results"],
  key: string
) {
  return results.reduce((sum, item) => (
    item.result && typeof item.result === "object"
      ? sum + arrayResultLength(item.result as Record<string, unknown>, key)
      : sum
  ), 0);
}

function revenueLaunchSprintDispatchSummary(response: Awaited<ReturnType<typeof applyRevenueLaunchChecklistActionBridge>>) {
  const productUpdates = sumBridgeResultArrayLength(response.dispatched.results, "productUpdates");
  const storeUpdates = sumBridgeResultArrayLength(response.dispatched.results, "storeUpdates");

  return {
    actionsBlocked: response.dispatched.actionsBlocked,
    actionsDispatched: response.dispatched.actionsDispatched,
    actionsPreviewed: response.dispatched.actionsPreviewed,
    actionsSelected: response.dispatched.actionsSelected,
    actionsSkipped: response.dispatched.actionsSkipped,
    assetControlActionsSkipped: sumBridgeResultNumber(response.dispatched.results, "assetControlActionsSkipped"),
    assetControlRecordsCreated: sumBridgeResultNumber(response.dispatched.results, "assetControlRecordsCreated"),
    commandRecordsCreated: sumBridgeResultNumber(response.dispatched.results, "commandRecordsCreated"),
    dryRun: response.dispatched.dryRun,
    externalExecution: false as const,
    internalStatusUpdates: productUpdates + storeUpdates,
    providerContacted: false as const,
    summary: response.dispatched.summary
  };
}

async function applyRevenueLaunchSprint(userId: string, input: ApplyRevenueLaunchSprintInput) {
  const options = revenueLaunchSprintOptionsFrom(input);
  const factoryResponse = await (async () => {
    const factoryInput = revenueLaunchSprintFactoryInput(input);

    return factoryInput ? applyRevenueOpportunityFactory(userId, factoryInput) : null;
  })();
  let context = await buildRevenueLaunchChecklistActionBridgeForUser(userId, input);
  const cycles: RevenueLaunchSprintCycle[] = [];

  for (let index = 0; index < input.maxCycles; index += 1) {
    const selectedActions = selectRevenueLaunchSprintBridgeActions(context.bridgePlan);

    if (selectedActions.length === 0) {
      break;
    }

    const bridgeInput = revenueLaunchSprintBridgeInput(
      input,
      selectedActions.map((action) => action.actionId),
      input.dryRun
    );
    const response = await applyRevenueLaunchChecklistActionBridge(userId, bridgeInput, context.bridgePlan);

    cycles.push(buildRevenueLaunchSprintCycle({
      bridgePlan: context.bridgePlan,
      cycle: index + 1,
      dispatched: revenueLaunchSprintDispatchSummary(response),
      selectedActions
    }));

    if (input.dryRun) {
      break;
    }

    context = await buildRevenueLaunchChecklistActionBridgeForUser(userId, input);
  }

  if (cycles.length === 0) {
    cycles.push(buildRevenueLaunchSprintCycle({
      bridgePlan: context.bridgePlan,
      cycle: 1,
      selectedActions: []
    }));
  }

  return {
    bridge: context.bridgePlan,
    checklist: context.checklistPlan,
    sprint: buildRevenueLaunchSprintPlan({
      bridgePlan: context.bridgePlan,
      checklistPlan: context.checklistPlan,
      cycles,
      dryRun: input.dryRun,
      factory: revenueLaunchSprintFactorySummary(factoryResponse),
      options
    })
  };
}

function storeSetupUpdatesFrom(plan: RevenueStoreSetupPlan, stores: StoreRecord[]) {
  const storesById = new Map(stores.map((store) => [store.id, store]));

  return plan.runbooks
    .filter((runbook) => runbook.action !== "hold")
    .filter((runbook) => runbook.recommendedLaunchStatus !== "Paused" && runbook.recommendedLaunchStatus !== "Archived")
    .map((runbook) => {
      const store = storesById.get(runbook.storeId);

      return {
        action: runbook.action,
        fromStatus: store ? launchStatusFromDb[store.launchStatus] : "Unknown",
        readinessScore: runbook.readinessScore,
        storeId: runbook.storeId,
        storeName: runbook.storeName,
        toStatus: runbook.recommendedLaunchStatus
      };
    });
}

async function validatePerformanceSnapshotOwnership(userId: string, snapshots: IngestRevenuePerformanceInput["snapshots"]) {
  const storeIds = Array.from(new Set(snapshots.map((snapshot) => snapshot.storeId)));
  const productIds = Array.from(new Set(snapshots.map((snapshot) => snapshot.productId).filter((productId): productId is string => Boolean(productId))));
  const stores = await prisma.clientMerchStore.findMany({
    select: { id: true },
    where: {
      id: { in: storeIds },
      userId
    }
  });
  const ownedStoreIds = new Set(stores.map((store) => store.id));

  if (storeIds.some((storeId) => !ownedStoreIds.has(storeId))) {
    return {
      error: "One or more performance snapshots target a merch store that was not found."
    };
  }

  if (productIds.length === 0) {
    return { error: null };
  }

  const products = await prisma.podProduct.findMany({
    select: {
      id: true,
      storeId: true
    },
    where: {
      id: { in: productIds },
      store: { userId }
    }
  });
  const productsById = new Map(products.map((product) => [product.id, product]));

  for (const snapshot of snapshots) {
    if (!snapshot.productId) continue;

    const product = productsById.get(snapshot.productId);

    if (!product || product.storeId !== snapshot.storeId) {
      return {
        error: "One or more performance snapshots target a product outside the selected store."
      };
    }
  }

  return { error: null };
}

async function validateFacelessContentPerformanceOwnership(userId: string, snapshots: IngestFacelessContentPerformanceInput["snapshots"]) {
  const storeIds = Array.from(new Set(snapshots.map((snapshot) => snapshot.storeId).filter((storeId): storeId is string => Boolean(storeId))));
  const productIds = Array.from(new Set(snapshots.map((snapshot) => snapshot.productId).filter((productId): productId is string => Boolean(productId))));
  const briefIds = Array.from(new Set(snapshots.map((snapshot) => snapshot.contentBriefId).filter((briefId): briefId is string => Boolean(briefId))));

  if (storeIds.length > 0) {
    const stores = await prisma.clientMerchStore.findMany({
      select: { id: true },
      where: {
        id: { in: storeIds },
        userId
      }
    });
    const ownedStoreIds = new Set(stores.map((store) => store.id));

    if (storeIds.some((storeId) => !ownedStoreIds.has(storeId))) {
      return {
        error: "One or more content performance snapshots target a merch store that was not found."
      };
    }
  }

  if (productIds.length > 0) {
    const products = await prisma.podProduct.findMany({
      select: {
        id: true,
        storeId: true
      },
      where: {
        id: { in: productIds },
        store: { userId }
      }
    });
    const productsById = new Map(products.map((product) => [product.id, product]));

    for (const snapshot of snapshots) {
      if (!snapshot.productId) continue;

      const product = productsById.get(snapshot.productId);

      if (!product || (snapshot.storeId && product.storeId !== snapshot.storeId)) {
        return {
          error: "One or more content performance snapshots target a product outside the selected store."
        };
      }
    }
  }

  if (briefIds.length > 0) {
    const briefs = await prisma.facelessContentBrief.findMany({
      select: {
        id: true,
        productId: true,
        storeId: true
      },
      where: {
        id: { in: briefIds },
        userId
      }
    });
    const briefsById = new Map(briefs.map((brief) => [brief.id, brief]));

    for (const snapshot of snapshots) {
      if (!snapshot.contentBriefId) continue;

      const brief = briefsById.get(snapshot.contentBriefId);

      if (!brief || (snapshot.storeId && brief.storeId !== snapshot.storeId) || (snapshot.productId && brief.productId !== snapshot.productId)) {
        return {
          error: "One or more content performance snapshots target a content brief outside the selected store or product."
        };
      }
    }
  }

  return { error: null };
}

function productStatusForCommand(status: string | null): keyof typeof productStatusToDb | null {
  if (!status) return null;
  return Object.prototype.hasOwnProperty.call(productStatusToDb, status) ? status as keyof typeof productStatusToDb : null;
}

function launchStatusForCommand(status: string | null): keyof typeof launchStatusToDb | null {
  if (!status) return null;
  return Object.prototype.hasOwnProperty.call(launchStatusToDb, status) ? status as keyof typeof launchStatusToDb : null;
}

function commandRecordStatus(command: PortfolioCommandItem): PortfolioCommandRecordStatus {
  if (command.targetType === "product" && productStatusForCommand(command.recommendedStatus)) return "applied";
  if (command.targetType === "store" && launchStatusForCommand(command.recommendedStatus)) return "applied";
  return "queued";
}

async function assetControlBatchForPortfolioCommands(userId: string, plan: PortfolioCommandCenterPlan, assetPortfolio: RevenueAssetPortfolio | null | undefined) {
  if (!assetPortfolio) {
    return null;
  }

  const rawBatch = buildRevenueAssetControlsFromPortfolioCommands({
    plan,
    portfolio: assetPortfolio
  });

  if (rawBatch.controls.length === 0) {
    return rawBatch;
  }

  return buildRevenueAssetControlsFromPortfolioCommands({
    duplicateReason: "Latest asset-control record already matches this portfolio command; duplicate ledger write skipped.",
    latestRecords: await latestRevenueAssetControlDuplicateSnapshots(userId, rawBatch.controls),
    plan,
    portfolio: assetPortfolio
  });
}

async function applyPortfolioCommandCenter(userId: string, plan: PortfolioCommandCenterPlan, assetPortfolio?: RevenueAssetPortfolio) {
  const commands = plan.commandActions;
  const productUpdates: Array<{
    action: PortfolioCommandItem["action"];
    fromStatus: string | null;
    productId: string;
    productName: string;
    toStatus: string;
  }> = [];
  const storeUpdates: Array<{
    action: PortfolioCommandItem["action"];
    fromStatus: string | null;
    storeId: string;
    storeName: string;
    toStatus: string;
  }> = [];
  const assetControlBatch = await assetControlBatchForPortfolioCommands(userId, plan, assetPortfolio);
  const auditLog = await recordAuditLog({
    action: "portfolio.command_center.applied",
    actorUserId: userId,
    metadata: {
      assetControlActions: assetControlBatch?.controls.length ?? 0,
      assetControlActionsSkipped: assetControlBatch?.skipped.length ?? 0,
      assetControlBatchReview: assetControlBatch?.controlReview ?? null,
      blockedExternalActions: plan.blockedExternalActions,
      commandActions: commands.length,
      externalExecution: false,
      providerContacted: false,
      riskLanes: plan.riskLanes,
      summary: plan.summary,
      totals: plan.totals
    },
    outcome: "success",
    severity: commands.some((command) => command.riskLevel === "high") ? "high" : commands.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "portfolio_command_center"
  });

  await prisma.$transaction(async (tx) => {
    for (const command of commands) {
      let status = commandRecordStatus(command);

      if (command.targetType === "product") {
        const nextStatus = productStatusForCommand(command.recommendedStatus);

        if (nextStatus) {
          const current = await tx.podProduct.findFirst({
            select: {
              id: true,
              productName: true,
              status: true
            },
            where: {
              id: command.targetId,
              store: { userId }
            }
          });

          if (current) {
            await tx.podProduct.update({
              data: {
                status: productStatusToDb[nextStatus]
              },
              where: {
                id: current.id
              }
            });
            productUpdates.push({
              action: command.action,
              fromStatus: productStatusFromDb[current.status],
              productId: current.id,
              productName: current.productName,
              toStatus: nextStatus
            });
          } else {
            status = "skipped";
          }
        }
      }

      if (command.targetType === "store") {
        const nextStatus = launchStatusForCommand(command.recommendedStatus);

        if (nextStatus) {
          const current = await tx.clientMerchStore.findFirst({
            select: {
              businessName: true,
              id: true,
              launchStatus: true
            },
            where: {
              id: command.targetId,
              userId
            }
          });

          if (current) {
            await tx.clientMerchStore.update({
              data: {
                launchStatus: launchStatusToDb[nextStatus]
              },
              where: {
                id: current.id
              }
            });
            storeUpdates.push({
              action: command.action,
              fromStatus: launchStatusFromDb[current.launchStatus],
              storeId: current.id,
              storeName: current.businessName,
              toStatus: nextStatus
            });
          } else {
            status = "skipped";
          }
        }
      }

      await tx.portfolioCommandAction.create({
        data: {
          action: command.action,
          auditLogId: auditLog.id,
          commandHash: command.commandHash,
          controlJson: stringifySecureJson({
            approvalGate: command.approvalGate,
            blockedExternalActions: command.blockedExternalActions,
            expectedInternalEffect: command.expectedInternalEffect,
            externalExecution: false,
            providerContacted: false,
            sourceModule: command.sourceModule
          }),
          externalExecution: false,
          priority: command.priority,
          providerContacted: false,
          reason: command.reason,
          recommendedStatus: command.recommendedStatus,
          riskLevel: command.riskLevel,
          sourceModule: command.sourceModule,
          status,
          targetId: command.targetId,
          targetName: command.targetName,
          targetType: command.targetType,
          userId
        }
      });
    }
  });
  const assetControlRecords = assetControlBatch?.controls.length
    ? await recordRevenueAssetControlRecords(userId, assetControlBatch.controls, auditLog.id)
    : [];

  return {
    auditLogId: auditLog.id,
    assetControlActionsSkipped: assetControlBatch?.skipped.length ?? 0,
    assetControlAuditLogId: assetControlBatch && (assetControlBatch.controls.length > 0 || assetControlBatch.skipped.length > 0) ? auditLog.id : null,
    assetControlBatchReview: assetControlBatch?.controlReview ?? null,
    assetControlRecordsCreated: assetControlRecords.length,
    commandRecordsCreated: commands.length,
    contentCommands: commands.filter((command) => command.targetType === "content").length,
    financeCommands: commands.filter((command) => command.targetType === "finance").length,
    productUpdates,
    providerContacted: false as const,
    storeUpdates
  };
}

function autopilotRecordStatus(action: RevenueAutopilotAction): PortfolioCommandRecordStatus {
  return action.status === "blocked" ? "blocked" : "queued";
}

async function applyRevenueAutopilot(userId: string, plan: RevenueAutopilotPlan) {
  const auditLog = await recordAuditLog({
    action: "revenue.autopilot.commands_recorded",
    actorUserId: userId,
    metadata: {
      actions: plan.actions.length,
      auditEvents: plan.auditEvents,
      blockedExternalActions: plan.blockedExternalActions,
      externalExecution: false,
      options: plan.options,
      phases: plan.phases.map((phase) => ({
        actionCount: phase.actionCount,
        name: phase.name,
        status: phase.status
      })),
      providerContacted: false,
      summary: plan.summary,
      totals: plan.totals
    },
    outcome: "success",
    severity: plan.actions.some((item) => item.riskLevel === "high") ? "high" : plan.actions.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_autopilot"
  });

  if (plan.actions.length > 0) {
    await prisma.portfolioCommandAction.createMany({
      data: plan.actions.map((item) => ({
        action: item.action,
        auditLogId: auditLog.id,
        commandHash: item.commandHash,
        controlJson: stringifySecureJson({
          approvalGate: item.approvalGate,
          autopilotStatus: item.status,
          blockedExternalActions: item.blockedExternalActions,
          expectedInternalEffect: item.expectedInternalEffect,
          externalExecution: false,
          phase: item.phase,
          providerContacted: false,
          sourceModule: item.sourceModule
        }),
        externalExecution: false,
        priority: item.priority,
        providerContacted: false,
        reason: item.reason,
        recommendedStatus: item.recommendedStatus,
        riskLevel: item.riskLevel,
        sourceModule: item.sourceModule,
        status: autopilotRecordStatus(item),
        targetId: item.targetId,
        targetName: item.targetName,
        targetType: item.targetType,
        userId
      }))
    });
  }

  return {
    auditLogId: auditLog.id,
    commandRecordsCreated: plan.actions.length,
    contentCommands: plan.actions.filter((item) => item.targetType === "content").length,
    financeCommands: plan.actions.filter((item) => item.targetType === "finance").length,
    portfolioCommands: plan.actions.filter((item) => item.targetType === "portfolio").length,
    providerContacted: false as const,
    signalCommands: plan.actions.filter((item) => item.targetType === "signal").length
  };
}

type RevenueAutopilotExecutionContext = Awaited<ReturnType<typeof buildRevenueAutopilotContextForUser>>;
type RevenueAutopilotStepExecutionStatus = "executed" | "preview" | "skipped" | "blocked";
type RevenueAutopilotExecutedStep = RevenueAutopilotExecutionStep & {
  executionStatus: RevenueAutopilotStepExecutionStatus;
  result: Record<string, unknown>;
};

function portfolioCommandIsAssetBatchCandidate(command: PortfolioCommandItem) {
  return (command.targetType === "product" || command.targetType === "store")
    && (command.action === "scale" || command.action === "watch" || command.action === "pause" || command.action === "kill")
    && command.sourceModule.split(" + ").includes("revenue_asset_portfolio");
}

function autopilotAssetBatchForContext(context: RevenueAutopilotExecutionContext) {
  return buildRevenueAssetBatchControlPlan({
    portfolio: context.assetPortfolio,
    selections: context.commandResult.plan.commandActions
      .filter(portfolioCommandIsAssetBatchCandidate)
      .map((command) => ({
        action: command.action as "scale" | "watch" | "pause" | "kill",
        assetId: command.targetId,
        assetType: command.targetType as "product" | "store"
      }))
  });
}

function nonAssetPortfolioCommandPlan(context: RevenueAutopilotExecutionContext): PortfolioCommandCenterPlan {
  return {
    ...context.commandResult.plan,
    commandActions: context.commandResult.plan.commandActions.filter((command) => !portfolioCommandIsAssetBatchCandidate(command))
  };
}

function launchActionForAutopilot(actionKind: RevenueAutopilotExecutionStep["action"]): RevenueLaunchPipelinePlan["storePlans"][number]["action"] | null {
  if (actionKind === "seed_launch_products") return "seed_products";
  if (actionKind === "queue_launch_approval") return "queue_launch_approval";
  if (actionKind === "prepare_launch_package") return "prepare_launch_package";
  return null;
}

function filteredLaunchPlan(plan: RevenueLaunchPipelinePlan, actionKind: RevenueAutopilotExecutionStep["action"]): RevenueLaunchPipelinePlan {
  const launchAction = launchActionForAutopilot(actionKind);

  if (!launchAction) {
    return {
      ...plan,
      queue: [],
      storePlans: []
    };
  }

  return {
    ...plan,
    queue: plan.queue.filter((item) => item.action === launchAction),
    storePlans: plan.storePlans.filter((storePlan) => storePlan.action === launchAction)
  };
}

function executionPreviewForStep(step: RevenueAutopilotExecutionStep, context: RevenueAutopilotExecutionContext, options: {
  includeAssetBatchActions: boolean;
}): Record<string, unknown> {
  if (step.action === "run_first_business_launch") {
    const selectedSprintActionIds = context.firstBusinessLaunchResult.plan.topCandidate?.sprintActionId
      ? [context.firstBusinessLaunchResult.plan.topCandidate.sprintActionId]
      : [];

    return {
      firstBusinessLaunchActions: selectedSprintActionIds.length,
      firstBusinessLaunchActionsBlocked: 0,
      firstBusinessLaunchActionsDispatched: 0,
      firstBusinessLaunchActionsPreviewed: selectedSprintActionIds.length,
      firstBusinessLaunchActionsSkipped: 0,
      firstBusinessLaunchManualGates: context.firstBusinessLaunchResult.plan.totals.manualGates,
      firstBusinessLaunchReady: context.firstBusinessLaunchResult.plan.totals.readyInternal,
      firstBusinessLaunchSummary: context.firstBusinessLaunchResult.plan.summary,
      selectedSprintActionIds
    };
  }

  if (step.action === "run_first_cash_sprint") {
    const selectedBridgeActionIds = selectRevenueFirstCashSprintBridgeActionIds(context.firstCashSprintResult.plan);

    return {
      firstCashSprintActions: selectedBridgeActionIds.length,
      firstCashSprintActionsBlocked: 0,
      firstCashSprintActionsDispatched: 0,
      firstCashSprintActionsPreviewed: selectedBridgeActionIds.length,
      firstCashSprintActionsSkipped: 0,
      firstCashSprintBridgeActions: selectedBridgeActionIds.length,
      firstCashSprintManualGates: context.firstCashSprintResult.plan.totals.manualGates,
      firstCashSprintReady: context.firstCashSprintResult.plan.totals.readyInternal,
      firstCashSprintSummary: context.firstCashSprintResult.plan.summary
    };
  }

  if (step.action === "apply_listing_optimization") {
    return {
      productUpdates: context.listingResult.plan.experiments.length
    };
  }

  if (step.action === "prepare_store_setup") {
    return {
      storeUpdates: storeSetupUpdatesFrom(context.storeSetupResult.plan, context.storeSetupResult.stores).length
    };
  }

  if (step.action === "queue_content_briefs") {
    return {
      briefsCreated: context.contentResult.plan?.briefs.filter((brief) => brief.recordState === "new").length ?? 0
    };
  }

  if (step.action === "record_finance_split") {
    return {
      ledgerEntriesCreated: context.financialResult.plan?.ledgerEntries.filter((entry) => entry.recordState === "new").length ?? 0,
      payoutIntentsCreated: context.financialResult.plan?.payoutIntents.length ?? 0,
      policyId: null,
      scalingBudgetPackets: context.financialResult.plan?.scalingBudgetQueue.length ?? 0
    };
  }

  if (step.action === "record_release_governance") {
    return {
      budgetReleasePacketsUpserted: context.releaseResult.plan?.budgetReleasePackets.length ?? 0,
      reconciliationReportId: null
    };
  }

  if (step.action === "record_portfolio_commands") {
    if (options.includeAssetBatchActions) {
      const batch = autopilotAssetBatchForContext(context);
      const plan = nonAssetPortfolioCommandPlan(context);

      return {
        assetBatchActions: batch.controls.length,
        assetBatchSkipped: batch.skipped.length,
        assetControlActionsSkipped: batch.skipped.length,
        assetControlBatchReview: batch.controlReview,
        assetControlRecordsCreated: batch.controls.length,
        commandRecordsCreated: plan.commandActions.length,
        contentCommands: plan.commandActions.filter((command) => command.targetType === "content").length,
        financeCommands: plan.commandActions.filter((command) => command.targetType === "finance").length,
        productUpdates: batch.productUpdates,
        storeUpdates: batch.storeUpdates
      };
    }

    return {
        commandRecordsCreated: context.commandResult.plan.commandActions.length,
        contentCommands: context.commandResult.plan.commandActions.filter((command) => command.targetType === "content").length,
        financeCommands: context.commandResult.plan.commandActions.filter((command) => command.targetType === "finance").length,
        assetControlRecordsCreated: buildRevenueAssetControlsFromPortfolioCommands({
          plan: context.commandResult.plan,
          portfolio: context.assetPortfolio
        }).controls.length
      };
    }

  if (step.action === "queue_digital_products") {
    return {
      createdProducts: context.digitalResult.plan.totals.queuedDrafts,
      storeUpdates: context.digitalResult.plan.storePlans.filter((storePlan) => storePlan.queuedDrafts.length > 0).length
    };
  }

  if (step.action === "seed_launch_products" || step.action === "queue_launch_approval" || step.action === "prepare_launch_package") {
    const launchPlan = filteredLaunchPlan(context.launchResult.plan, step.action);

    return {
      approvalPackets: launchPlan.storePlans.filter((storePlan) => storePlan.action === "queue_launch_approval" || storePlan.action === "prepare_launch_package").length,
      createdProducts: launchPlan.storePlans
        .filter((storePlan) => storePlan.action === "seed_products")
        .reduce((sum, storePlan) => sum + storePlan.missingProducts, 0),
      storeUpdates: launchPlan.storePlans.length
    };
  }

  return {};
}

async function runRevenueAutopilotExecutionStep(userId: string, step: RevenueAutopilotExecutionStep, context: RevenueAutopilotExecutionContext, options: {
  includeAssetBatchActions: boolean;
}): Promise<Record<string, unknown>> {
  if (step.action === "run_first_business_launch") {
    const selectedSprintActionIds = context.firstBusinessLaunchResult.plan.topCandidate?.sprintActionId
      ? [context.firstBusinessLaunchResult.plan.topCandidate.sprintActionId]
      : [];
    const response = await applyRevenueFirstBusinessLaunch(userId, applyRevenueFirstBusinessLaunchSchema.parse({
      confirm: revenueFirstBusinessLaunchConfirmation,
      dryRun: false,
      maxCandidates: Math.max(context.firstBusinessLaunchResult.plan.totals.candidates, 1),
      note: `Revenue Autopilot: ${step.reason}`,
      sprintActionIds: selectedSprintActionIds
    }));

    return {
      firstBusinessLaunchActions: response.selectedSprintActionIds.length,
      firstBusinessLaunchActionsBlocked: response.dispatched.actionsBlocked,
      firstBusinessLaunchActionsDispatched: response.dispatched.actionsDispatched,
      firstBusinessLaunchActionsPreviewed: response.dispatched.actionsPreviewed,
      firstBusinessLaunchActionsSkipped: response.dispatched.actionsSkipped,
      firstBusinessLaunchManualGates: response.plan.totals.manualGates,
      firstBusinessLaunchReady: response.plan.totals.readyInternal,
      firstBusinessLaunchSummary: response.dispatched.summary,
      selectedSprintActionIds: response.selectedSprintActionIds
    };
  }

  if (step.action === "run_first_cash_sprint") {
    const response = await applyRevenueFirstCashSprint(userId, applyRevenueFirstCashSprintSchema.parse({
      confirm: revenueFirstCashSprintConfirmation,
      dryRun: false,
      includeBlocked: context.firstCashSprintResult.plan.options.includeBlocked,
      maxCandidates: context.firstCashSprintResult.plan.options.maxCandidates,
      maxSprintActions: context.firstCashSprintResult.plan.options.maxSprintActions,
      note: `Revenue Autopilot: ${step.reason}`,
      targetDaysToFirstCash: context.firstCashSprintResult.plan.options.targetDaysToFirstCash
    }));

    return {
      firstCashSprintActions: response.selectedBridgeActionIds.length,
      firstCashSprintActionsBlocked: response.dispatched.actionsBlocked,
      firstCashSprintActionsDispatched: response.dispatched.actionsDispatched,
      firstCashSprintActionsPreviewed: response.dispatched.actionsPreviewed,
      firstCashSprintActionsSkipped: response.dispatched.actionsSkipped,
      firstCashSprintBridgeActions: response.selectedBridgeActionIds.length,
      firstCashSprintManualGates: response.sprint.totals.manualGates,
      firstCashSprintReady: response.sprint.totals.readyInternal,
      firstCashSprintSummary: response.dispatched.summary
    };
  }

  if (step.action === "apply_listing_optimization") {
    return applyListingOptimization(userId, context.listingResult.plan);
  }

  if (step.action === "prepare_store_setup") {
    return applyStoreSetup(userId, context.storeSetupResult.plan, context.storeSetupResult.stores);
  }

  if (step.action === "queue_content_briefs") {
    if (!context.contentResult.plan) return { skipped: true, reason: "Content pipeline is not included in this executor run." };
    return applyFacelessContentPipeline(userId, context.contentResult.plan);
  }

  if (step.action === "record_finance_split") {
    if (!context.financialResult.plan) return { skipped: true, reason: "Financial orchestrator is not included in this executor run." };
    return applyFinancialOrchestrator(userId, context.financialResult.plan);
  }

  if (step.action === "record_release_governance") {
    if (!context.releaseResult.plan) return { skipped: true, reason: "Financial release governance is not included in this executor run." };
    return applyFinancialReleaseGovernance(userId, context.releaseResult.plan);
  }

  if (step.action === "record_portfolio_commands") {
    if (options.includeAssetBatchActions) {
      const rawBatch = autopilotAssetBatchForContext(context);
      const batch = removeDuplicateRevenueAssetBatchControls({
        batch: rawBatch,
        latestRecords: await latestRevenueAssetControlDuplicateSnapshots(userId, rawBatch.controls),
        reason: "Latest asset-control record already matches this autopilot action; duplicate autopilot ledger write skipped."
      });
      const plan = nonAssetPortfolioCommandPlan(context);
      const commandApplied = plan.commandActions.length > 0
        ? await applyPortfolioCommandCenter(userId, plan)
        : {
          auditLogId: null,
          assetControlActionsSkipped: 0,
          assetControlAuditLogId: null,
          assetControlBatchReview: null,
          assetControlRecordsCreated: 0,
          commandRecordsCreated: 0,
          contentCommands: 0,
          financeCommands: 0,
          productUpdates: [],
          providerContacted: false as const,
          storeUpdates: []
        };
      const batchApplied = batch.controls.length > 0
        ? await applyAssetBatchControl(userId, batch)
        : {
          productUpdates: [],
          storeUpdates: []
        };
      const assetControlAuditLog = batch.controls.length > 0
        ? await recordAuditLog({
          action: "revenue.autopilot.asset_batch_control.applied",
          actorUserId: userId,
          metadata: {
            actionCounts: batch.totals,
            auditOnly: batch.auditOnly,
            controls: batch.controls.map((control) => ({
              action: control.action,
              assetId: control.asset.assetId,
              assetName: control.asset.assetName,
              assetType: control.asset.assetType,
              auditOnly: control.auditOnly,
              change: control.change,
              controlReview: control.controlReview,
              reason: control.reason,
              warnings: control.warnings
            })),
            controlReview: batch.controlReview,
            externalExecution: false,
            providerContacted: false,
            skipped: batch.skipped,
            source: "revenue_autopilot_executor",
            summary: batch.summary,
            warnings: batch.warnings
          },
          outcome: "success",
          severity: batch.totals.kill > 0 ? "high" : batch.totals.pause > 0 || batch.warnings.length > 0 ? "medium" : "low",
          targetId: null,
          targetType: "revenue_asset_batch_control"
        })
        : null;
      const assetControlRecords = batch.controls.length > 0
        ? await recordRevenueAssetControlRecords(userId, batch.controls, assetControlAuditLog?.id ?? null)
        : [];

      return {
        ...commandApplied,
        assetBatchActions: batch.controls.length,
        assetBatchSkipped: batch.skipped.length,
        assetControlActionsSkipped: batch.skipped.length,
        assetControlAuditLogId: assetControlAuditLog?.id ?? null,
        assetControlBatchReview: batch.controlReview,
        assetControlRecordsCreated: assetControlRecords.length,
        productUpdates: [...commandApplied.productUpdates, ...batchApplied.productUpdates],
        storeUpdates: [...commandApplied.storeUpdates, ...batchApplied.storeUpdates]
      };
    }

    return applyPortfolioCommandCenter(userId, context.commandResult.plan, context.assetPortfolio);
  }

  if (step.action === "queue_digital_products") {
    return applyDigitalProductQueue(userId, context.digitalResult.stores, context.digitalResult.plan);
  }

  if (step.action === "seed_launch_products" || step.action === "queue_launch_approval" || step.action === "prepare_launch_package") {
    return applyLaunchPipeline(userId, context.launchResult.stores, filteredLaunchPlan(context.launchResult.plan, step.action));
  }

  return { skipped: true, reason: "Action cannot be executed by the internal step executor." };
}

function mergeExecutionResult(totals: Record<string, unknown>, result: Record<string, unknown>) {
  const numericKeys = [
    "briefsCreated",
    "budgetReleasePacketsUpserted",
    "commandRecordsCreated",
    "contentCommands",
    "financeCommands",
    "firstBusinessLaunchActions",
    "firstBusinessLaunchActionsBlocked",
    "firstBusinessLaunchActionsDispatched",
    "firstBusinessLaunchActionsPreviewed",
    "firstBusinessLaunchActionsSkipped",
    "firstBusinessLaunchManualGates",
    "firstBusinessLaunchReady",
    "firstCashSprintActions",
    "firstCashSprintActionsBlocked",
    "firstCashSprintActionsDispatched",
    "firstCashSprintActionsPreviewed",
    "firstCashSprintActionsSkipped",
    "firstCashSprintBridgeActions",
    "firstCashSprintManualGates",
    "firstCashSprintReady",
    "assetBatchActions",
    "assetBatchSkipped",
    "assetControlActionsSkipped",
    "assetControlRecordsCreated",
    "ledgerEntriesCreated",
    "payoutIntentsCreated",
    "portfolioCommands",
    "scalingBudgetPackets",
    "signalCommands"
  ];
  const arrayKeys = [
    "approvalPackets",
    "createdProducts",
    "productUpdates",
    "storeUpdates"
  ];

  for (const key of numericKeys) {
    const value = result[key];
    if (typeof value === "number") {
      totals[key] = Number(totals[key] ?? 0) + value;
    }
  }

  for (const key of arrayKeys) {
    const value = result[key];
    if (Array.isArray(value)) {
      totals[key] = [...(Array.isArray(totals[key]) ? totals[key] as unknown[] : []), ...value];
    }
  }

  if (typeof result.policyId === "string") {
    totals.policyIds = [...(Array.isArray(totals.policyIds) ? totals.policyIds as string[] : []), result.policyId];
  }

  if (typeof result.reconciliationReportId === "string") {
    totals.reconciliationReportIds = [...(Array.isArray(totals.reconciliationReportIds) ? totals.reconciliationReportIds as string[] : []), result.reconciliationReportId];
  }

  if (result.assetControlBatchReview && typeof result.assetControlBatchReview === "object") {
    totals.assetControlBatchReviews = [
      ...(Array.isArray(totals.assetControlBatchReviews) ? totals.assetControlBatchReviews as unknown[] : []),
      result.assetControlBatchReview
    ];
  }
}

async function executeRevenueAutopilot(userId: string, input: ExecuteRevenueAutopilotInput) {
  const context = await buildRevenueAutopilotContextForUser(userId, input);
  const selection = selectRevenueAutopilotExecutionSteps(context.plan, {
    actions: input.actions,
    includeDraftCreation: input.includeDraftCreation,
    includeLaunchApprovalPackets: input.includeLaunchApprovalPackets,
    maxSteps: input.maxSteps
  });
  const results: RevenueAutopilotExecutedStep[] = [];
  const totals: Record<string, unknown> = {
    approvalPackets: [],
    assetControlBatchReviews: [],
    assetBatchActions: 0,
    assetBatchSkipped: 0,
    assetControlActionsSkipped: 0,
    assetControlRecordsCreated: 0,
    briefsCreated: 0,
    budgetReleasePacketsUpserted: 0,
    commandRecordsCreated: 0,
    contentCommands: 0,
    createdProducts: [],
    financeCommands: 0,
    firstBusinessLaunchActions: 0,
    firstBusinessLaunchActionsBlocked: 0,
    firstBusinessLaunchActionsDispatched: 0,
    firstBusinessLaunchActionsPreviewed: 0,
    firstBusinessLaunchActionsSkipped: 0,
    firstBusinessLaunchManualGates: 0,
    firstBusinessLaunchReady: 0,
    firstCashSprintActions: 0,
    firstCashSprintActionsBlocked: 0,
    firstCashSprintActionsDispatched: 0,
    firstCashSprintActionsPreviewed: 0,
    firstCashSprintActionsSkipped: 0,
    firstCashSprintBridgeActions: 0,
    firstCashSprintManualGates: 0,
    firstCashSprintReady: 0,
    ledgerEntriesCreated: 0,
    payoutIntentsCreated: 0,
    portfolioCommands: 0,
    productUpdates: [],
    providerContacted: false,
    scalingBudgetPackets: 0,
    signalCommands: 0,
    storeUpdates: []
  };

  for (const step of selection.steps) {
    if (step.status !== "ready") {
      results.push({
        ...step,
        executionStatus: step.status === "blocked" ? "blocked" : "skipped",
        result: {}
      });
      continue;
    }

    const result = input.dryRun
      ? executionPreviewForStep(step, context, {
        includeAssetBatchActions: input.includeAssetBatchActions
      })
      : await runRevenueAutopilotExecutionStep(userId, step, context, {
        includeAssetBatchActions: input.includeAssetBatchActions
      });

    mergeExecutionResult(totals, result);
    results.push({
      ...step,
      executionStatus: input.dryRun ? "preview" : result.skipped === true ? "skipped" : "executed",
      result
    });
  }

  const stepsExecuted = results.filter((step) => step.executionStatus === "executed").length;
  const stepsPreviewed = results.filter((step) => step.executionStatus === "preview").length;
  const auditLog = input.dryRun ? null : await recordAuditLog({
    action: "revenue.autopilot.internal_steps_executed",
    actorUserId: userId,
    metadata: {
      blockedExternalActions: context.plan.blockedExternalActions,
      externalExecution: false,
      includeAssetBatchActions: input.includeAssetBatchActions,
      includeDraftCreation: input.includeDraftCreation,
      includeLaunchApprovalPackets: input.includeLaunchApprovalPackets,
      options: context.plan.options,
      providerContacted: false,
      selectedActions: results.filter((step) => step.executionStatus === "executed").map((step) => step.action),
      selectionTotals: selection.totals,
      stepResults: results.map((step) => ({
        action: step.action,
        executionStatus: step.executionStatus,
        requiredOptIn: step.requiredOptIn,
        result: step.result,
        selectionReason: step.selectionReason,
        selectionSource: step.selectionSource,
        sourceModule: step.sourceModule,
        title: step.title
      })),
      summary: context.plan.summary,
      totals
    },
    outcome: "success",
    severity: results.some((step) => step.executionStatus === "executed" && step.riskLevel === "high")
      ? "high"
      : stepsExecuted > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_autopilot_executor"
  });
  const refreshed = input.dryRun ? context : await buildRevenueAutopilotContextForUser(userId, input);

  return {
    executed: {
      ...totals,
      auditLogId: auditLog?.id ?? null,
      dryRun: input.dryRun,
      externalExecution: false,
      providerContacted: false,
      stepsBlocked: results.filter((step) => step.executionStatus === "blocked").length,
      stepsExecuted,
      stepsPreviewed,
      stepsReady: selection.totals.ready,
      stepsSkipped: results.filter((step) => step.executionStatus === "skipped").length
    },
    plan: refreshed.plan,
    selection,
    steps: results
  };
}

function opportunitySourceMarker(sourceKey: string) {
  return `Revenue Factory Source: ${sourceKey}`;
}

async function findOpportunityStore(userId: string, input: ApplyRevenueOpportunityFactoryInput) {
  const sourceKey = revenueOpportunitySourceKey(input);
  const opportunity = await prisma.revenueOpportunity.findUnique({
    include: {
      store: {
        include: {
          products: {
            orderBy: { updatedAt: "desc" }
          }
        }
      }
    },
    where: {
      userId_sourceKey: {
        sourceKey,
        userId
      }
    }
  });

  if (opportunity?.store) {
    return {
      opportunity,
      store: opportunity.store
    };
  }

  const legacyStore = await prisma.clientMerchStore.findFirst({
    include: {
      products: {
        orderBy: { updatedAt: "desc" }
      }
    },
    where: {
      notes: {
        contains: opportunitySourceMarker(sourceKey)
      },
      userId
    }
  });

  return {
    opportunity,
    store: legacyStore
  };
}

function opportunityStoreCreateData(userId: string, plan: RevenueOpportunityFactoryPlan): Prisma.ClientMerchStoreUncheckedCreateInput {
  return {
    approvalStatus: approvalStatusToDb[plan.storeDraft.approvalStatus],
    audience: plan.storeDraft.audience,
    brandStyle: plan.storeDraft.brandStyle,
    businessName: plan.storeDraft.businessName,
    clientName: plan.storeDraft.clientName,
    contactName: plan.storeDraft.contactName,
    designCount: 0,
    email: plan.storeDraft.email,
    estimatedProfit: plan.storeDraft.estimatedProfit,
    industry: plan.storeDraft.industry,
    launchStatus: launchStatusToDb[plan.storeDraft.launchStatus],
    monthlyFee: 0,
    notes: plan.storeDraft.notes,
    podProvider: podProviderToDb[plan.storeDraft.podProvider],
    productTypes: plan.storeDraft.productTypes,
    profitShare: plan.storeDraft.profitShare,
    revenue: 0,
    setupFee: 0,
    storePlatform: storePlatformToDb[plan.storeDraft.storePlatform],
    userId
  };
}

function opportunityStoreSummary(store: {
  businessName: string;
  id: string;
  launchStatus: keyof typeof launchStatusFromDb;
  podProvider: keyof typeof podProviderFromDb;
  storePlatform: keyof typeof storePlatformFromDb;
}) {
  return {
    businessName: store.businessName,
    id: store.id,
    launchStatus: launchStatusFromDb[store.launchStatus],
    podProvider: podProviderFromDb[store.podProvider],
    storePlatform: storePlatformFromDb[store.storePlatform]
  };
}

async function applyRevenueOpportunityFactory(userId: string, input: ApplyRevenueOpportunityFactoryInput) {
  const sourceKey = revenueOpportunitySourceKey(input);
  const existing = await findOpportunityStore(userId, input);
  const existingStore = existing.store;
  const preliminaryPlan = buildRevenueOpportunityFactoryPlan({
    existingProductNames: existingStore?.products.map((product) => product.productName) ?? [],
    existingStoreId: existingStore?.id ?? null,
    options: input,
    storeId: existingStore?.id
  });

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        dryRun: true,
        externalExecution: false,
        productDraftsCreated: preliminaryPlan.productDrafts.length,
        providerContacted: false,
        skippedExistingProducts: preliminaryPlan.skippedExistingProducts.length,
        storeCreated: !existingStore,
        storeId: existingStore?.id ?? null,
        opportunityId: existing.opportunity?.id ?? null
      },
      plan: preliminaryPlan,
      store: existingStore ? opportunityStoreSummary(existingStore) : null
    };
  }

  let store = existingStore;
  let storeCreated = false;

  if (!store) {
    store = await prisma.clientMerchStore.create({
      data: opportunityStoreCreateData(userId, preliminaryPlan),
      include: {
        products: {
          orderBy: { updatedAt: "desc" }
        }
      }
    });
    storeCreated = true;
  }

  const plan = buildRevenueOpportunityFactoryPlan({
    existingProductNames: store.products.map((product) => product.productName),
    existingStoreId: store.id,
    options: input,
    storeId: store.id
  });
  const createdProducts = plan.productDrafts.length > 0
    ? await prisma.$transaction(plan.productDrafts.map((product) => prisma.podProduct.create({
      data: createPodProductData(product),
      select: {
        id: true,
        productName: true,
        storeId: true
      }
    })))
    : [];

  if (createdProducts.length > 0) {
    await prisma.clientMerchStore.update({
      data: {
        approvalStatus: approvalStatusToDb["Designs Pending"],
        designCount: {
          increment: createdProducts.length
        },
        estimatedProfit: plan.totals.estimatedDraftProfit,
        launchStatus: launchStatusToDb.Designing
      },
      where: {
        id: store.id
      }
    });
  }

  const auditLog = await recordAuditLog({
    action: "revenue.opportunity_factory.created",
    actorUserId: userId,
    metadata: {
      auditEvents: plan.auditEvents,
      blockedExternalActions: plan.blockedExternalActions,
      createdProducts,
      externalExecution: false,
      idempotency: plan.idempotency,
      opportunityId: existing.opportunity?.id ?? null,
      providerContacted: false,
      skippedExistingProducts: plan.skippedExistingProducts,
      storeCreated,
      storeId: store.id,
      summary: plan.summary,
      totals: plan.totals
    },
    outcome: "success",
    severity: createdProducts.length > 0 || storeCreated ? "medium" : "low",
    targetId: store.id,
    targetType: "revenue_opportunity_factory"
  });
  const refreshedStore = await prisma.clientMerchStore.findFirst({
    where: {
      id: store.id,
      userId
    },
    include: {
      products: {
        orderBy: { updatedAt: "desc" }
      }
    }
  });
  const refreshedPlan = buildRevenueOpportunityFactoryPlan({
    existingProductNames: refreshedStore?.products.map((product) => product.productName) ?? [],
    existingStoreId: store.id,
    options: input,
    storeId: store.id
  });
  const opportunity = await prisma.revenueOpportunity.upsert({
    create: {
      auditLogId: auditLog.id,
      businessName: refreshedPlan.storeDraft.businessName,
      externalExecution: false,
      idea: input.idea,
      planJson: stringifySecureJson(refreshedPlan),
      providerContacted: false,
      sourceKey,
      status: "active",
      storeId: store.id,
      totalsJson: stringifySecureJson(refreshedPlan.totals),
      userId
    },
    update: {
      auditLogId: auditLog.id,
      businessName: refreshedPlan.storeDraft.businessName,
      externalExecution: false,
      idea: input.idea,
      planJson: stringifySecureJson(refreshedPlan),
      providerContacted: false,
      status: "active",
      storeId: store.id,
      totalsJson: stringifySecureJson(refreshedPlan.totals)
    },
    where: {
      userId_sourceKey: {
        sourceKey,
        userId
      }
    }
  });

  return {
    applied: {
      auditLogId: auditLog.id,
      dryRun: false,
      externalExecution: false,
      productDraftsCreated: createdProducts.length,
      providerContacted: false,
      skippedExistingProducts: refreshedPlan.skippedExistingProducts.length,
      storeCreated,
      storeId: store.id,
      opportunityId: opportunity.id
    },
    createdProducts,
    plan: refreshedPlan,
    store: refreshedStore ? opportunityStoreSummary(refreshedStore) : opportunityStoreSummary(store)
  };
}

async function applyRevenueOpportunityControl(userId: string, params: RevenueOpportunityControlParamsInput, input: ApplyRevenueOpportunityControlInput) {
  const options = revenueOpportunityControlQuerySchema.parse(input);
  const current = await buildRevenueOpportunityControlForUser(userId, {
    ...options,
    includeKilled: true
  });
  const item = current.plan.opportunities.find((opportunity) => opportunity.id === params.opportunityId);

  if (!item) {
    return {
      notFound: true as const
    };
  }

  const evaluation = evaluateRevenueOpportunityControlUpdate({
    item,
    overrideReadiness: input.overrideReadiness,
    toStatus: input.status
  });

  if (input.dryRun || !evaluation.allowed) {
    return {
      applied: {
        allowed: evaluation.allowed,
        auditLogId: null,
        blockers: evaluation.blockers,
        dryRun: input.dryRun,
        externalExecution: false,
        fromStatus: evaluation.fromStatus,
        note: input.note ?? null,
        opportunityId: item.id,
        providerContacted: false,
        reason: evaluation.reason,
        toStatus: evaluation.toStatus
      },
      evaluation,
      plan: current.plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.opportunity_control.updated",
    actorUserId: userId,
    metadata: {
      blockers: item.blockers,
      evaluation,
      externalExecution: false,
      metrics: item.metrics,
      note: input.note ?? null,
      providerContacted: false,
      readinessScore: item.readinessScore,
      stage: item.stage
    },
    outcome: "success",
    severity: input.status === "killed" || input.status === "blocked" ? "high" : input.status === "paused" ? "medium" : "low",
    targetId: item.id,
    targetType: "revenue_opportunity_control"
  });

  await prisma.revenueOpportunity.updateMany({
    data: {
      auditLogId: auditLog.id,
      status: input.status
    },
    where: {
      id: item.id,
      userId
    }
  });

  const refreshed = await buildRevenueOpportunityControlForUser(userId, options);

  return {
    applied: {
      allowed: true,
      auditLogId: auditLog.id,
      blockers: [],
      dryRun: false,
      externalExecution: false,
      fromStatus: evaluation.fromStatus,
      note: input.note ?? null,
      opportunityId: item.id,
      providerContacted: false,
      reason: evaluation.reason,
      toStatus: evaluation.toStatus
    },
    evaluation,
    plan: refreshed.plan
  };
}

function createPerformanceSnapshotData(userId: string, input: IngestRevenuePerformanceInput["snapshots"][number]): Prisma.RevenuePerformanceSnapshotUncheckedCreateInput {
  const netProfit = input.netProfit ?? calculateRevenuePerformanceNetProfit(input);

  return {
    adSpend: input.adSpend,
    digitalDeliveryCost: input.digitalDeliveryCost,
    discounts: input.discounts,
    grossRevenue: input.grossRevenue,
    impressions: input.impressions,
    netProfit,
    notes: input.notes,
    periodEnd: new Date(input.periodEnd),
    periodStart: new Date(input.periodStart),
    platformFees: input.platformFees,
    productId: input.productId ?? null,
    productionCost: input.productionCost,
    refunds: input.refunds,
    shippingCost: input.shippingCost,
    source: input.source,
    storeId: input.storeId,
    unitsSold: input.unitsSold,
    userId,
    visits: input.visits
  };
}

function createFacelessContentPerformanceSnapshotData(userId: string, input: IngestFacelessContentPerformanceInput["snapshots"][number]): Prisma.FacelessContentPerformanceSnapshotUncheckedCreateInput {
  return {
    channel: input.channel,
    clicks: input.clicks,
    comments: input.comments,
    contentBriefId: input.contentBriefId ?? null,
    conversions: input.conversions,
    cost: input.cost,
    externalExecution: false,
    likes: input.likes,
    notes: input.notes,
    periodEnd: new Date(input.periodEnd),
    periodStart: new Date(input.periodStart),
    productId: input.productId ?? null,
    revenue: input.revenue,
    saves: input.saves,
    shares: input.shares,
    source: input.source,
    storeId: input.storeId ?? null,
    userId,
    views: input.views,
    watchSeconds: input.watchSeconds
  };
}

async function rollupPerformanceStores(userId: string, storeIds: string[]) {
  const uniqueStoreIds = Array.from(new Set(storeIds));

  for (const storeId of uniqueStoreIds) {
    const snapshots = await prisma.revenuePerformanceSnapshot.findMany({
      select: {
        grossRevenue: true,
        netProfit: true
      },
      where: {
        storeId,
        userId
      }
    });
    const revenue = snapshots.reduce((sum, snapshot) => sum + decimalToNumber(snapshot.grossRevenue), 0);
    const estimatedProfit = snapshots.reduce((sum, snapshot) => sum + decimalToNumber(snapshot.netProfit), 0);

    await prisma.clientMerchStore.updateMany({
      data: {
        estimatedProfit,
        revenue
      },
      where: {
        id: storeId,
        userId
      }
    });
  }
}

async function applySignalIntake(userId: string, input: ApplySignalIntakeInput, plan: SignalIntakePlan) {
  const revenueCreated = input.commerceSignals.length > 0
    ? await prisma.$transaction(input.commerceSignals.map((snapshot) => prisma.revenuePerformanceSnapshot.create({
      data: createPerformanceSnapshotData(userId, snapshot)
    })))
    : [];
  const contentCreated = input.contentSignals.length > 0
    ? await prisma.$transaction(input.contentSignals.map((snapshot) => prisma.facelessContentPerformanceSnapshot.create({
      data: createFacelessContentPerformanceSnapshotData(userId, snapshot)
    })))
    : [];

  await rollupPerformanceStores(userId, input.commerceSignals.map((snapshot) => snapshot.storeId));

  const paymentReport = plan.normalized.paymentReconciliationDrafts.length > 0
    ? await prisma.financialReconciliationReport.create({
      data: {
        approvedAmount: plan.normalized.paymentReconciliationDrafts.reduce((sum, draft) => sum + draft.paidOut, 0),
        externalExecution: false,
        pendingAmount: plan.normalized.paymentReconciliationDrafts.reduce((sum, draft) => sum + draft.pendingBalance, 0),
        rejectedAmount: 0,
        reportJson: stringifySecureJson({
          auditEvents: plan.auditEvents,
          blockedExternalActions: plan.blockedExternalActions,
          generatedAt: plan.generatedAt,
          paymentReconciliationDrafts: plan.normalized.paymentReconciliationDrafts,
          providerContacted: false,
          summary: plan.summary
        }),
        source: "signal_intake",
        status: "record_only",
        totalAmount: plan.normalized.paymentReconciliationDrafts.reduce((sum, draft) => sum + draft.availableBalance + draft.pendingBalance, 0),
        userId,
        variance: plan.normalized.paymentReconciliationDrafts.reduce((sum, draft) => sum + draft.netBalanceDelta, 0)
      }
    })
    : null;

  const auditLog = await recordAuditLog({
    action: "revenue.signal_intake.ingested",
    actorUserId: userId,
    metadata: {
      contentSnapshotIds: contentCreated.map((snapshot) => snapshot.id),
      dryRun: false,
      externalExecution: false,
      paymentReconciliationReportId: paymentReport?.id ?? null,
      providerContacted: false,
      revenueSnapshotIds: revenueCreated.map((snapshot) => snapshot.id),
      summary: plan.summary,
      totals: plan.totals
    },
    outcome: "success",
    severity: plan.totals.signals > 25 || plan.totals.projectedAvailableBalance > 0 ? "medium" : "low",
    targetId: paymentReport?.id ?? null,
    targetType: "signal_intake"
  });

  if (paymentReport) {
    await prisma.financialReconciliationReport.update({
      data: { auditLogId: auditLog.id },
      where: { id: paymentReport.id }
    });
  }

  return {
    auditLogId: auditLog.id,
    contentSnapshotsCreated: contentCreated.length,
    paymentReconciliationReportId: paymentReport?.id ?? null,
    revenueSnapshotsCreated: revenueCreated.length
  };
}

async function applyRotation(userId: string, plan: RevenueEnginePlan) {
  const productUpdates = plan.rotationChanges.filter((change) => change.targetType === "product");
  const storeUpdates = plan.rotationChanges.filter((change) => change.targetType === "store");
  const transaction: Prisma.PrismaPromise<unknown>[] = [
    ...productUpdates.map((change) => prisma.podProduct.updateMany({
      where: {
        id: change.targetId,
        store: { userId }
      },
      data: {
        status: productStatusToDb[change.toStatus as RevenueProductStatus]
      }
    })),
    ...storeUpdates.map((change) => prisma.clientMerchStore.updateMany({
      where: {
        id: change.targetId,
        userId
      },
      data: {
        launchStatus: launchStatusToDb[change.toStatus as RevenueStoreLaunchStatus]
      }
    }))
  ];

  if (transaction.length > 0) {
    await prisma.$transaction(transaction);
  }

  return {
    productUpdates,
    storeUpdates
  };
}

function revenueAssetControlRecordCreateData(userId: string, control: RevenueAssetControlPlan, auditLogId: string | null): Prisma.RevenueAssetControlRecordUncheckedCreateInput {
  const snapshot = revenueAssetControlRecordFromPlan({
    auditLogId,
    control
  });

  return {
    assetId: snapshot.assetId,
    assetName: snapshot.assetName,
    assetType: snapshot.assetType,
    auditLogId,
    auditOnly: snapshot.auditOnly,
    controlJson: stringifySecureJson(control),
    economicsScore: snapshot.assetScore.economicsScore,
    externalExecution: false,
    finalRank: snapshot.assetScore.finalRank,
    fromStatus: snapshot.fromStatus,
    nextInternalState: snapshot.nextInternalState,
    override: snapshot.override,
    productId: snapshot.assetType === "product" ? snapshot.assetId : null,
    providerContacted: false,
    readinessScore: snapshot.assetScore.readinessScore,
    reason: snapshot.reason,
    requestedAction: snapshot.requestedAction,
    riskLevel: snapshot.riskLevel,
    riskPenalty: snapshot.assetScore.riskPenalty,
    scoreBand: snapshot.scoreBand,
    scoringRecommendation: snapshot.scoringRecommendation,
    statusChangeRequired: snapshot.statusChangeRequired,
    storeId: snapshot.storeId,
    storeName: snapshot.storeName,
    toStatus: snapshot.toStatus,
    userId,
    velocity: snapshot.assetScore.velocity,
    warningsJson: stringifySecureJson(snapshot.warnings)
  };
}

async function recordRevenueAssetControlRecords(userId: string, controls: RevenueAssetControlPlan[], auditLogId: string | null) {
  if (controls.length === 0) {
    return [];
  }

  const created = await prisma.$transaction(controls.map((control) => prisma.revenueAssetControlRecord.create({
    data: revenueAssetControlRecordCreateData(userId, control, auditLogId)
  })));

  return created.map(revenueAssetControlRecordSnapshot);
}

async function latestRevenueAssetControlDuplicateSnapshots(userId: string, controls: RevenueAssetControlPlan[]) {
  const latestRecords: RevenueAssetControlDuplicateSnapshot[] = [];
  const seen = new Set<string>();

  for (const control of controls) {
    const key = `${control.asset.assetType}:${control.asset.assetId}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    const record = await prisma.revenueAssetControlRecord.findFirst({
      orderBy: { createdAt: "desc" },
      where: {
        assetId: control.asset.assetId,
        assetType: control.asset.assetType,
        userId
      }
    });

    if (record) {
      latestRecords.push(duplicateSnapshotFromRevenueAssetControlRecord(revenueAssetControlRecordSnapshot(record)));
    }
  }

  return latestRecords;
}

async function applyAssetControl(userId: string, control: RevenueAssetControlPlan) {
  const productUpdates = control.change && control.change.targetType === "product" ? [control.change] : [];
  const storeUpdates = control.change && control.change.targetType === "store" ? [control.change] : [];
  const transaction: Prisma.PrismaPromise<unknown>[] = [
    ...productUpdates.map((change) => prisma.podProduct.updateMany({
      data: {
        status: productStatusToDb[change.toStatus as RevenueProductStatus]
      },
      where: {
        id: change.targetId,
        store: { userId }
      }
    })),
    ...storeUpdates.map((change) => prisma.clientMerchStore.updateMany({
      data: {
        launchStatus: launchStatusToDb[change.toStatus as RevenueStoreLaunchStatus]
      },
      where: {
        id: change.targetId,
        userId
      }
    }))
  ];

  if (transaction.length > 0) {
    await prisma.$transaction(transaction);
  }

  return {
    productUpdates,
    storeUpdates
  };
}

async function applyAssetBatchControl(userId: string, batch: RevenueAssetBatchControlPlan) {
  const productUpdates: Array<NonNullable<RevenueAssetControlPlan["change"]>> = [];
  const storeUpdates: Array<NonNullable<RevenueAssetControlPlan["change"]>> = [];

  for (const control of batch.controls) {
    const applied = await applyAssetControl(userId, control);
    productUpdates.push(...applied.productUpdates);
    storeUpdates.push(...applied.storeUpdates);
  }

  return {
    productUpdates,
    storeUpdates
  };
}

async function applyPerformanceRotation(userId: string, digest: RevenuePerformanceDigest) {
  const productUpdates = digest.rotationChanges.filter((change) => change.targetType === "product");
  const storeUpdates = digest.rotationChanges.filter((change) => change.targetType === "store");
  const transaction: Prisma.PrismaPromise<unknown>[] = [
    ...productUpdates.map((change) => prisma.podProduct.updateMany({
      data: {
        status: productStatusToDb[change.toStatus as RevenueProductStatus]
      },
      where: {
        id: change.targetId,
        store: { userId }
      }
    })),
    ...storeUpdates.map((change) => prisma.clientMerchStore.updateMany({
      data: {
        launchStatus: launchStatusToDb[change.toStatus as RevenueStoreLaunchStatus]
      },
      where: {
        id: change.targetId,
        userId
      }
    }))
  ];

  if (transaction.length > 0) {
    await prisma.$transaction(transaction);
  }

  return {
    productUpdates,
    storeUpdates
  };
}

async function applyListingOptimization(userId: string, plan: RevenueListingOptimizationPlan) {
  const productUpdates: Array<{
    fromStatus: string;
    productId: string;
    productName: string;
    recommendedVariantId: string;
    storeId: string;
    toStatus: string;
  }> = [];

  for (const experiment of plan.experiments) {
    const variant = experiment.recommendedVariant;
    const status = experiment.recommendedInternalStatus;

    await prisma.podProduct.updateMany({
      data: {
        estimatedPlatformFees: variant.estimatedPlatformFees,
        estimatedProfit: variant.estimatedProfit,
        listingDescription: variant.description,
        listingTitle: variant.title,
        mockupNotes: variant.mockupNotes,
        profitMargin: variant.profitMargin,
        retailPrice: variant.retailPrice,
        status: productStatusToDb[status],
        tags: variant.tags
      },
      where: {
        id: experiment.productId,
        store: { userId }
      }
    });

    productUpdates.push({
      fromStatus: experiment.currentListing.title ? "Existing listing draft" : "Missing listing copy",
      productId: experiment.productId,
      productName: experiment.productName,
      recommendedVariantId: variant.id,
      storeId: experiment.storeId,
      toStatus: status
    });
  }

  return { productUpdates };
}

async function applyStoreSetup(userId: string, plan: RevenueStoreSetupPlan, stores: StoreRecord[]) {
  const storeUpdates = storeSetupUpdatesFrom(plan, stores);

  const transaction = storeUpdates.map((update) => prisma.clientMerchStore.updateMany({
    data: {
      launchStatus: launchStatusToDb[update.toStatus]
    },
    where: {
      id: update.storeId,
      userId
    }
  }));

  if (transaction.length > 0) {
    await prisma.$transaction(transaction);
  }

  return { storeUpdates };
}

async function applyFinancialOrchestrator(userId: string, plan: FinancialOrchestratorPlan) {
  const policy = await prisma.financialSplitPolicy.create({
    data: {
      bufferPercent: plan.splitPolicy.bufferPercent,
      currency: plan.splitPolicy.currency,
      externalExecution: false,
      metadataJson: stringifySecureJson({
        generatedAt: plan.generatedAt,
        policyChecks: plan.policyChecks,
        scalingBudgetQueue: plan.scalingBudgetQueue,
        summary: plan.summary
      }),
      minPayoutIntentAmount: plan.splitPolicy.minPayoutIntentAmount,
      personalPercent: plan.splitPolicy.personalPercent,
      reserveFloorAmount: plan.splitPolicy.reserveFloorAmount,
      scalingPercent: plan.splitPolicy.scalingPercent,
      status: plan.splitPolicy.status,
      userId
    }
  });
  const ledgerEntries = plan.ledgerEntries.filter((entry) => entry.recordState === "new");
  const payoutIntents = plan.payoutIntents;
  const ledgerResult = ledgerEntries.length > 0
    ? await prisma.financialLedgerEntry.createMany({
      data: ledgerEntries.map((entry) => ({
        allocatableProfit: entry.allocatableProfit,
        bufferAmount: entry.allocation.buffer,
        currency: entry.currency,
        externalExecution: false,
        grossRevenue: entry.grossRevenue,
        metadataJson: stringifySecureJson({
          productName: entry.productName,
          storeName: entry.storeName
        }),
        netProfit: entry.netProfit,
        periodEnd: new Date(entry.periodEnd),
        periodStart: new Date(entry.periodStart),
        personalAmount: entry.allocation.personal,
        productId: entry.productId,
        revenuePerformanceSnapshotId: entry.revenuePerformanceSnapshotId,
        scalingAmount: entry.allocation.scaling,
        source: entry.source,
        status: entry.status,
        storeId: entry.storeId,
        userId
      })),
      skipDuplicates: true
    })
    : { count: 0 };
  const payoutResult = payoutIntents.length > 0
    ? await prisma.financialPayoutIntent.createMany({
      data: payoutIntents.map((intent) => ({
        amount: intent.amount,
        approvalRequired: true,
        category: intent.category,
        currency: intent.currency,
        dedupeKey: intent.dedupeKey,
        destinationType: intent.destinationType,
        externalExecution: false,
        metadataJson: stringifySecureJson({
          approvalGate: intent.approvalGate,
          sourceLedgerEntryIds: intent.sourceLedgerEntryIds,
          title: intent.title
        }),
        provider: intent.provider,
        splitPolicyId: policy.id,
        status: intent.status,
        userId
      })),
      skipDuplicates: true
    })
    : { count: 0 };
  const scalingBudgetResult = plan.scalingBudgetQueue.length > 0
    ? await prisma.financialScalingBudgetPacket.createMany({
      data: plan.scalingBudgetQueue.map((packet) => ({
        amount: packet.amount,
        approvalGateJson: stringifySecureJson(packet.approvalGate),
        approvalRequired: true,
        assetId: packet.assetId,
        assetName: packet.assetName,
        assetType: packet.assetType,
        blockedActionsJson: stringifySecureJson(packet.blockedExternalActions),
        confidence: packet.confidence,
        dedupeKey: packet.dedupeKey,
        externalExecution: false,
        maxPerAssetAmount: packet.budgetCap.maxPerAssetAmount,
        metadataJson: stringifySecureJson({
          budgetCap: packet.budgetCap,
          scoreBand: packet.scoreBand,
          source: "financial_orchestrator"
        }),
        priority: packet.priority,
        profitVelocity: packet.profitVelocity,
        providerContacted: false,
        reason: packet.reason,
        retainedScalingCapital: packet.budgetCap.retainedScalingCapital,
        score: packet.score,
        scoreBand: packet.scoreBand,
        splitPolicyId: policy.id,
        status: packet.status,
        storeId: packet.storeId,
        storeName: packet.storeName,
        totalScalingCapital: packet.budgetCap.totalScalingCapital,
        userId
      })),
      skipDuplicates: true
    })
    : { count: 0 };

  return {
    ledgerEntriesCreated: ledgerResult.count,
    payoutIntentsCreated: payoutResult.count,
    policyId: policy.id,
    scalingBudgetPackets: scalingBudgetResult.count
  };
}

async function applyFinancialReleaseGovernance(userId: string, plan: FinancialReleaseGovernancePlan) {
  const upsertedPackets = await prisma.$transaction(plan.budgetReleasePackets.map((packet) => prisma.financialBudgetReleasePacket.upsert({
    create: {
      amount: packet.amount,
      approvalState: packet.approvalState,
      blockedActionsJson: stringifySecureJson(packet.blockedActions),
      category: packet.category,
      controlsJson: stringifySecureJson(packet.controls),
      currency: packet.currency,
      destinationType: packet.destinationType,
      externalExecution: false,
      maxReleaseAmount: packet.maxReleaseAmount,
      payoutIntentId: packet.intentId,
      purpose: packet.purpose,
      releaseState: packet.releaseState,
      userId
    },
    update: {
      amount: packet.amount,
      approvalState: packet.approvalState,
      blockedActionsJson: stringifySecureJson(packet.blockedActions),
      category: packet.category,
      controlsJson: stringifySecureJson(packet.controls),
      currency: packet.currency,
      destinationType: packet.destinationType,
      externalExecution: false,
      maxReleaseAmount: packet.maxReleaseAmount,
      purpose: packet.purpose,
      releaseState: packet.releaseState,
      userId
    },
    where: { payoutIntentId: packet.intentId }
  })));
  const reconciliationReport = await prisma.financialReconciliationReport.create({
    data: {
      approvedAmount: plan.reconciliationReport.approvedAmount,
      externalExecution: false,
      pendingAmount: plan.reconciliationReport.pendingAmount,
      rejectedAmount: plan.reconciliationReport.rejectedAmount,
      reportJson: stringifySecureJson({
        auditEvents: plan.auditEvents,
        generatedAt: plan.generatedAt,
        releaseReadiness: plan.releaseReadiness,
        riskTiers: plan.riskTiers,
        source: plan.reconciliationReport.source,
        stripeReadOnlyProbe: plan.stripeReadOnlyProbe,
        summary: plan.summary
      }),
      source: plan.reconciliationReport.source,
      status: plan.reconciliationReport.status,
      totalAmount: plan.reconciliationReport.totalAmount,
      userId,
      variance: plan.reconciliationReport.variance
    }
  });
  const auditLog = await recordAuditLog({
    action: "financial.release_governance.recorded",
    actorUserId: userId,
    metadata: {
      budgetReleasePacketsUpserted: upsertedPackets.length,
      externalExecution: false,
      reconciliationReportId: reconciliationReport.id,
      reconciliationStatus: plan.reconciliationReport.status,
      releaseReadiness: plan.releaseReadiness,
      stripeProviderContacted: false,
      totals: plan.totals
    },
    outcome: "success",
    severity: plan.totals.highRiskIntents > 0 ? "high" : upsertedPackets.length > 0 ? "medium" : "low",
    targetId: reconciliationReport.id,
    targetType: "financial_release_governance"
  });
  const packetIntentIds = plan.budgetReleasePackets.map((packet) => packet.intentId);
  const auditUpdates: Prisma.PrismaPromise<unknown>[] = [
    prisma.financialReconciliationReport.update({
      data: { auditLogId: auditLog.id },
      where: { id: reconciliationReport.id }
    })
  ];

  if (packetIntentIds.length > 0) {
    auditUpdates.push(prisma.financialBudgetReleasePacket.updateMany({
      data: { auditLogId: auditLog.id },
      where: {
        payoutIntentId: { in: packetIntentIds },
        userId
      }
    }));
  }

  await prisma.$transaction(auditUpdates);

  return {
    auditLogId: auditLog.id,
    budgetReleasePacketsUpserted: upsertedPackets.length,
    reconciliationReportId: reconciliationReport.id
  };
}

async function applyFinancialScalingSpendControl(userId: string, plan: FinancialScalingSpendControlPlan) {
  const upsertedPackets = await prisma.$transaction(plan.spendPackets.map((packet) => prisma.financialScalingSpendPacket.upsert({
    create: {
      amount: packet.amount,
      approvalState: packet.approvalState,
      assetId: packet.assetId,
      assetName: packet.assetName,
      assetType: packet.assetType,
      blockedActionsJson: stringifySecureJson(packet.blockedActions),
      category: packet.category,
      controlsJson: stringifySecureJson(packet.controls),
      currency: packet.currency,
      dedupeKey: packet.dedupeKey,
      externalExecution: false,
      maxSpendAmount: packet.maxSpendAmount,
      priority: packet.priority,
      providerContacted: false,
      purpose: packet.purpose,
      releaseState: packet.releaseState,
      scalingBudgetPacketId: packet.budgetPacketId,
      score: packet.score,
      storeId: packet.storeId,
      storeName: packet.storeName,
      userId
    },
    update: {
      amount: packet.amount,
      approvalState: packet.approvalState,
      assetId: packet.assetId,
      assetName: packet.assetName,
      assetType: packet.assetType,
      blockedActionsJson: stringifySecureJson(packet.blockedActions),
      category: packet.category,
      controlsJson: stringifySecureJson(packet.controls),
      currency: packet.currency,
      externalExecution: false,
      maxSpendAmount: packet.maxSpendAmount,
      priority: packet.priority,
      providerContacted: false,
      purpose: packet.purpose,
      releaseState: packet.releaseState,
      score: packet.score,
      storeId: packet.storeId,
      storeName: packet.storeName,
      userId
    },
    where: { dedupeKey: packet.dedupeKey }
  })));
  const auditLog = await recordAuditLog({
    action: "financial.scaling_spend_control.recorded",
    actorUserId: userId,
    metadata: {
      approvedBudgetAmount: plan.totals.approvedBudgetAmount,
      approvedBudgetPackets: plan.totals.approvedBudgetPackets,
      blockedExternalActions: plan.blockedExternalActions,
      externalExecution: false,
      providerContacted: false,
      spendPacketsUpserted: upsertedPackets.length,
      summary: plan.summary,
      totals: plan.totals
    },
    outcome: "success",
    severity: plan.totals.pendingSpendAmount > 0 ? "medium" : "low",
    targetId: null,
    targetType: "financial_scaling_spend_control"
  });

  if (plan.spendPackets.length > 0) {
    await prisma.financialScalingSpendPacket.updateMany({
      data: { auditLogId: auditLog.id },
      where: {
        dedupeKey: { in: plan.spendPackets.map((packet) => packet.dedupeKey) },
        userId
      }
    });
  }

  return {
    auditLogId: auditLog.id,
    scalingSpendPacketsUpserted: upsertedPackets.length
  };
}

async function validateFinancialScalingExecutionEntries(
  userId: string,
  input: IngestFinancialScalingExecutionLedgerInput
) {
  const packetIds = [...new Set(input.entries.map((entry) => entry.scalingSpendPacketId))];
  const spendPackets = await prisma.financialScalingSpendPacket.findMany({
    where: {
      id: { in: packetIds },
      userId
    }
  });
  const packetById = new Map(spendPackets.map((packet) => [packet.id, packet]));
  const missingPacketIds = packetIds.filter((packetId) => !packetById.has(packetId));

  if (missingPacketIds.length > 0) {
    return {
      error: {
        code: 404,
        message: `Scaling spend packet not found or unavailable: ${missingPacketIds.join(", ")}.`
      },
      packetById
    };
  }

  const blockedPacket = spendPackets.find((packet) => (
    packet.approvalState === "rejected"
    || packet.approvalState === "voided"
    || packet.releaseState === "rejected"
    || packet.releaseState === "stale_budget"
    || packet.externalExecution
    || packet.providerContacted
  ));

  if (blockedPacket) {
    return {
      error: {
        code: 400,
        message: `Scaling spend packet ${blockedPacket.id} cannot receive outcome entries in state ${blockedPacket.releaseState}/${blockedPacket.approvalState}.`
      },
      packetById
    };
  }

  const existingSpendTotals = await prisma.financialScalingExecutionEntry.groupBy({
    _sum: { amountSpent: true },
    by: ["scalingSpendPacketId"],
    where: {
      scalingSpendPacketId: { in: packetIds },
      userId
    }
  });
  const existingSpendByPacket = new Map(existingSpendTotals.map((total) => [
    total.scalingSpendPacketId,
    decimalToNumber(total._sum.amountSpent ?? { toString: () => "0" })
  ]));
  const incomingSpendByPacket = new Map<string, number>();

  for (const entry of input.entries) {
    incomingSpendByPacket.set(entry.scalingSpendPacketId, (incomingSpendByPacket.get(entry.scalingSpendPacketId) ?? 0) + entry.amountSpent);
  }

  for (const [packetId, incomingSpend] of incomingSpendByPacket) {
    const packet = packetById.get(packetId);
    if (!packet) continue;

    const maxSpendAmount = decimalToNumber(packet.maxSpendAmount);
    const totalSpend = (existingSpendByPacket.get(packetId) ?? 0) + incomingSpend;

    if (totalSpend > maxSpendAmount + 0.01) {
      return {
        error: {
          code: 400,
          message: `Scaling execution outcome for ${packet.assetName} would exceed the packet cap of ${maxSpendAmount}.`
        },
        packetById
      };
    }
  }

  return {
    error: null,
    packetById
  };
}

async function applyFinancialScalingExecutionLedger(userId: string, input: IngestFinancialScalingExecutionLedgerInput) {
  const validation = await validateFinancialScalingExecutionEntries(userId, input);

  if (validation.error) {
    return {
      error: validation.error,
      result: null
    };
  }

  const createdEntries = await prisma.$transaction(input.entries.map((entry) => {
    const packet = validation.packetById.get(entry.scalingSpendPacketId);

    if (!packet) {
      throw new Error(`Scaling spend packet ${entry.scalingSpendPacketId} was not available after validation.`);
    }

    return prisma.financialScalingExecutionEntry.create({
      data: {
        amountSpent: entry.amountSpent,
        assetId: packet.assetId,
        assetName: packet.assetName,
        assetType: packet.assetType,
        category: packet.category,
        externalExecution: false,
        grossRevenue: entry.grossRevenue,
        netProfit: entry.netProfit,
        notes: entry.notes ?? null,
        outcome: entry.outcome,
        periodEnd: new Date(entry.periodEnd),
        periodStart: new Date(entry.periodStart),
        productId: packet.assetType === "product" ? packet.assetId : null,
        providerContacted: false,
        scalingSpendPacketId: packet.id,
        source: entry.source,
        storeId: packet.storeId,
        storeName: packet.storeName,
        unitsSold: entry.unitsSold,
        userId,
        visits: entry.visits
      }
    });
  }));
  const auditLog = await recordAuditLog({
    action: "financial.scaling_execution_ledger.ingested",
    actorUserId: userId,
    metadata: {
      blockedExternalActions: [
        "No external spend, provider call, upload, payout, transfer, browser job, or platform write action was executed."
      ],
      entriesRecorded: createdEntries.length,
      externalExecution: false,
      providerContacted: false,
      scalingSpendPacketIds: [...new Set(createdEntries.map((entry) => entry.scalingSpendPacketId))]
    },
    outcome: "success",
    severity: input.entries.some((entry) => entry.outcome === "stopped" || entry.netProfit < 0) ? "medium" : "low",
    targetId: null,
    targetType: "financial_scaling_execution_ledger"
  });

  await prisma.financialScalingExecutionEntry.updateMany({
    data: { auditLogId: auditLog.id },
    where: {
      id: { in: createdEntries.map((entry) => entry.id) },
      userId
    }
  });

  return {
    error: null,
    result: {
      auditLogId: auditLog.id,
      entriesRecorded: createdEntries.length
    }
  };
}

function facelessContentBriefCreateData(userId: string, brief: FacelessContentBrief): Prisma.FacelessContentBriefUncheckedCreateInput {
  return {
    blockedActionsJson: stringifySecureJson(brief.blockedActions),
    conceptJson: stringifySecureJson(brief.concept),
    dedupeKey: brief.dedupeKey,
    externalExecution: false,
    priority: brief.priority,
    productId: brief.productId,
    providerReadinessJson: stringifySecureJson(brief.providerReadiness),
    scriptJson: stringifySecureJson(brief.script),
    status: "draft_queued",
    storyboardJson: stringifySecureJson(brief.storyboard),
    storeId: brief.storeId,
    targetChannelsJson: stringifySecureJson(brief.targetChannels),
    title: brief.title,
    uploadPackageJson: stringifySecureJson(brief.channelPackages),
    userId,
    videoJson: stringifySecureJson(brief.videoSpec),
    voiceoverJson: stringifySecureJson(brief.voiceoverSpec)
  };
}

async function applyFacelessContentPipeline(userId: string, plan: FacelessContentPipelinePlan) {
  const newBriefs = plan.briefs.filter((brief) => brief.recordState === "new");
  const result = newBriefs.length > 0
    ? await prisma.facelessContentBrief.createMany({
      data: newBriefs.map((brief) => facelessContentBriefCreateData(userId, brief)),
      skipDuplicates: true
    })
    : { count: 0 };
  const auditLog = await recordAuditLog({
    action: "faceless_content.pipeline.recorded",
    actorUserId: userId,
    metadata: {
      blockedExternalActions: plan.blockedExternalActions,
      briefsCreated: result.count,
      externalExecution: false,
      options: plan.options,
      providerContacted: false,
      summary: plan.summary,
      totals: plan.totals
    },
    outcome: "success",
    severity: result.count > 0 ? "medium" : "low",
    targetId: null,
    targetType: "faceless_content_pipeline"
  });

  if (newBriefs.length > 0) {
    await prisma.facelessContentBrief.updateMany({
      data: { auditLogId: auditLog.id },
      where: {
        dedupeKey: { in: newBriefs.map((brief) => brief.dedupeKey) },
        userId
      }
    });
  }

  return {
    auditLogId: auditLog.id,
    briefsCreated: result.count
  };
}

function createPodProductData(input: CreatePodProductInput): Prisma.PodProductUncheckedCreateInput {
  const complianceNotes = formatComplianceNotes(input);

  return {
    aiDisclosureNeeded: input.aiDisclosureNeeded,
    colorDirection: input.colorDirection,
    commandCommanderId: input.commandCommanderId,
    commandCommanderName: input.commandCommanderName,
    commandGeneralId: input.commandGeneralId,
    commandGeneralName: input.commandGeneralName,
    commandMarshalId: input.commandMarshalId,
    commandMarshalName: input.commandMarshalName,
    commandSoldierId: input.commandSoldierId,
    commandSoldierName: input.commandSoldierName,
    complianceNotes: input.complianceNotes ? `${input.complianceNotes} ${complianceNotes}` : complianceNotes,
    designConcept: input.designConcept,
    designPrompt: input.designPrompt,
    designTheme: input.designTheme,
    estimatedPlatformFees: input.estimatedPlatformFees,
    estimatedProfit: input.estimatedProfit,
    listingDescription: input.listingDescription,
    listingTitle: input.listingTitle,
    mockupNotes: input.mockupNotes,
    productName: input.productName,
    productType: input.productType,
    productionPartnerDisclosureNeeded: input.productionPartnerDisclosureNeeded,
    profitMargin: input.profitMargin,
    retailPrice: input.retailPrice,
    shippingCost: input.shippingCost,
    status: productStatusToDb[input.status],
    storeId: input.storeId,
    supplierCost: input.supplierCost,
    tags: input.tags,
    targetAudience: input.targetAudience,
    typographyDirection: input.typographyDirection
  };
}

async function applyLaunchPipeline(userId: string, stores: StoreRecord[], plan: RevenueLaunchPipelinePlan) {
  const storesById = new Map(stores.map((store) => [store.id, store]));
  const createdProducts: Array<{ id: string; productName: string; storeId: string }> = [];
  const approvalPackets: Array<{ id: string; storeId: string; auditLogId: string | null }> = [];
  const storeUpdates: Array<{ launchStatus?: string; approvalStatus?: string; storeId: string; storeName: string }> = [];

  for (const storePlan of plan.storePlans) {
    const store = storesById.get(storePlan.storeId);

    if (!store) continue;

    if (storePlan.action === "seed_products") {
      const productsToCreate = generateProductBatch(launchStoreSnapshot(store), storePlan.batchInput);
      const products = await prisma.$transaction(productsToCreate.map((product) => prisma.podProduct.create({
        data: createPodProductData(product),
        select: {
          id: true,
          productName: true,
          storeId: true
        }
      })));

      createdProducts.push(...products);

      await prisma.clientMerchStore.updateMany({
        data: {
          approvalStatus: approvalStatusToDb["Designs Pending"],
          designCount: {
            increment: products.length
          },
          launchStatus: launchStatusToDb.Designing
        },
        where: {
          id: store.id,
          userId
        }
      });
      storeUpdates.push({
        approvalStatus: "Designs Pending",
        launchStatus: "Designing",
        storeId: store.id,
        storeName: store.businessName
      });
    }

    if (storePlan.action === "queue_launch_approval" || storePlan.action === "prepare_launch_package") {
      const products = store.products.map(productSnapshot);
      const packet = buildGrowthApprovalPacket({
        note: `Revenue Launch Pipeline: ${storePlan.reason}`,
        products,
        store: storeSnapshot(store),
        storeId: store.id
      });
      const record = await prisma.growthApprovalPacket.create({
        data: {
          mode: packet.mode,
          packetJson: stringifySecureJson(packet),
          scheduledFor: packet.scheduledFor ? new Date(packet.scheduledFor) : null,
          status: "pending",
          storeId: store.id,
          userId
        },
        select: {
          id: true
        }
      });
      const auditLog = await recordAuditLog({
        action: "revenue.launch_approval.queued",
        actorUserId: userId,
        metadata: {
          externalExecution: false,
          packet,
          packetId: record.id,
          storePlan
        },
        outcome: "success",
        severity: "medium",
        targetId: store.id,
        targetType: "revenue_launch_pipeline"
      });

      await prisma.growthApprovalPacket.update({
        data: {
          requestAuditLogId: auditLog.id
        },
        where: {
          id: record.id
        }
      });

      await prisma.clientMerchStore.updateMany({
        data: {
          launchStatus: launchStatusToDb["Awaiting Approval"]
        },
        where: {
          id: store.id,
          userId
        }
      });

      approvalPackets.push({
        auditLogId: auditLog.id,
        id: record.id,
        storeId: store.id
      });
      storeUpdates.push({
        launchStatus: "Awaiting Approval",
        storeId: store.id,
        storeName: store.businessName
      });
    }
  }

  return {
    approvalPackets,
    createdProducts,
    storeUpdates
  };
}

async function applyDigitalProductQueue(userId: string, stores: StoreRecord[], plan: DigitalProductPortfolioPlan) {
  const storesById = new Map(stores.map((store) => [store.id, store]));
  const createdProducts: Array<{ id: string; productName: string; storeId: string }> = [];
  const storeUpdates: Array<{
    addedProductTypes: string[];
    approvalStatus: string;
    launchStatus: string;
    storeId: string;
    storeName: string;
  }> = [];

  for (const storePlan of plan.storePlans) {
    if (storePlan.queuedDrafts.length === 0) continue;

    const store = storesById.get(storePlan.storeId);

    if (!store) continue;

    const products = await prisma.$transaction(storePlan.queuedDrafts.map((draft) => prisma.podProduct.create({
      data: createPodProductData(draft.createProductInput),
      select: {
        id: true,
        productName: true,
        storeId: true
      }
    })));
    const addedProductTypes = Array.from(new Set(storePlan.queuedDrafts.map((draft) => draft.createProductInput.productType)));
    const nextProductTypes = Array.from(new Set([...store.productTypes, ...addedProductTypes]));

    await prisma.clientMerchStore.updateMany({
      data: {
        approvalStatus: approvalStatusToDb["Designs Pending"],
        designCount: {
          increment: products.length
        },
        launchStatus: launchStatusToDb.Designing,
        productTypes: nextProductTypes
      },
      where: {
        id: store.id,
        userId
      }
    });

    createdProducts.push(...products);
    storeUpdates.push({
      addedProductTypes,
      approvalStatus: "Designs Pending",
      launchStatus: "Designing",
      storeId: store.id,
      storeName: store.businessName
    });
  }

  return {
    createdProducts,
    storeUpdates
  };
}

export async function revenueEngineRoutes(app: FastifyInstance) {
  app.post("/merch/revenue-engine/opportunity-factory", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: ApplyRevenueOpportunityFactoryInput = applyRevenueOpportunityFactorySchema.parse(request.body);
    const response = await applyRevenueOpportunityFactory(currentUser.sub, input);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/opportunities/control", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueOpportunityControlQuerySchema.parse(request.query);
    const { plan } = await buildRevenueOpportunityControlForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/revenue-engine/opportunities/:opportunityId/control", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = revenueOpportunityControlParamsSchema.parse(request.params);
    const input = applyRevenueOpportunityControlSchema.parse(request.body);
    const response = await applyRevenueOpportunityControl(currentUser.sub, params, input);

    if ("notFound" in response) {
      return reply.code(404).send({
        error: "Not Found",
        message: "Revenue opportunity was not found."
      });
    }

    if (!response.applied.allowed && !input.dryRun) {
      return reply.code(409).send(response);
    }

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/launch-readiness", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueLaunchReadinessQuerySchema.parse(request.query);
    const { plan } = await buildLaunchReadinessForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.get("/merch/revenue-engine/first-cash-readiness", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueFirstCashReadinessQuerySchema.parse(request.query);
    const { plan } = await buildFirstCashReadinessForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.get("/merch/revenue-engine/first-cash-sprint", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueFirstCashSprintQuerySchema.parse(request.query);
    const context = await buildFirstCashSprintForUser(currentUser.sub, query);

    return reply.send({
      bridge: context.bridgePlan,
      checklist: context.checklistPlan,
      firstCash: context.firstCashPlan,
      sprint: context.plan
    });
  });

  app.post("/merch/revenue-engine/first-cash-sprint/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueFirstCashSprintSchema.parse(request.body);
    const response = await applyRevenueFirstCashSprint(currentUser.sub, input);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/first-business-launch", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueFirstBusinessLaunchQuerySchema.parse(request.query);
    const context = await buildFirstBusinessLaunchForUser(currentUser.sub, query);

    return reply.send({
      checklist: context.checklistPlan,
      plan: context.plan,
      sprint: context.firstCashSprintContext.plan
    });
  });

  app.post("/merch/revenue-engine/first-business-launch/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueFirstBusinessLaunchSchema.parse(request.body);
    const response = await applyRevenueFirstBusinessLaunch(currentUser.sub, input);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/launch-checklist", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueLaunchChecklistQuerySchema.parse(request.query);
    const plan = await buildRevenueLaunchChecklistForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.get("/merch/revenue-engine/launch-checklist/action-bridge", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueLaunchChecklistActionBridgeQuerySchema.parse(request.query);
    const context = await buildRevenueLaunchChecklistActionBridgeForUser(currentUser.sub, query);

    return reply.send({
      checklist: context.checklistPlan,
      plan: context.bridgePlan
    });
  });

  app.post("/merch/revenue-engine/launch-checklist/action-bridge/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueLaunchChecklistActionBridgeSchema.parse(request.body);
    const context = await buildRevenueLaunchChecklistActionBridgeForUser(currentUser.sub, input);
    const response = await applyRevenueLaunchChecklistActionBridge(currentUser.sub, input, context.bridgePlan);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/launch-sprint", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueLaunchSprintSchema.parse(request.body);
    const response = await applyRevenueLaunchSprint(currentUser.sub, input);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/launch-handoff", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueLaunchHandoffQuerySchema.parse(request.query);
    const { plan } = await buildLaunchHandoffForUser(currentUser.sub, query);

    return reply.send({
      plan,
      records: plan.persistedPackets
    });
  });

  app.post("/merch/revenue-engine/launch-handoff/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueLaunchHandoffSchema.parse(request.body);
    const { plan } = await buildLaunchHandoffForUser(currentUser.sub, input);
    const applied = await applyRevenueLaunchHandoff(currentUser.sub, plan, input);

    return reply.send({
      applied,
      plan: {
        ...plan,
        persistedPackets: input.dryRun ? plan.persistedPackets : applied.storedRecords
      },
      records: applied.storedRecords
    });
  });

  app.get("/merch/revenue-engine/launch-handoff/control", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueLaunchHandoffControlQuerySchema.parse(request.query);
    const { plan } = await buildLaunchHandoffControlForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/revenue-engine/launch-handoff/packets/:packetId/control", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = revenueLaunchHandoffControlParamsSchema.parse(request.params);
    const input = applyRevenueLaunchHandoffControlSchema.parse(request.body);
    const response = await applyRevenueLaunchHandoffControl(currentUser.sub, params, input);

    if (!response) {
      return reply.code(404).send({
        error: "Not Found",
        message: "Launch handoff packet was not found."
      });
    }

    if (!response.applied.allowed && !input.dryRun) {
      return reply.code(409).send(response);
    }

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/launch-operations-pack", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueLaunchOperationsPackQuerySchema.parse(request.query);
    const { plan } = await buildLaunchOperationsPackForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/revenue-engine/launch-operations-pack/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueLaunchOperationsPackSchema.parse(request.body);
    const response = await applyRevenueLaunchOperationsPack(currentUser.sub, input);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/launch-closure-ledger", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueLaunchClosureLedgerQuerySchema.parse(request.query);
    const { plan } = await buildLaunchClosureLedgerForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/revenue-engine/launch-closure-ledger/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueLaunchClosureLedgerSchema.parse(request.body);
    const response = await applyRevenueLaunchClosureLedger(currentUser.sub, input);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/live-connector-readiness", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueLiveConnectorReadinessQuerySchema.parse(request.query);
    const { plan } = await buildLiveConnectorReadinessRegistryForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/revenue-engine/live-connector-readiness/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueLiveConnectorReadinessSchema.parse(request.body);
    const response = await applyRevenueLiveConnectorReadinessRegistry(currentUser.sub, input);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/live-connector-design-dossier", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueLiveConnectorDesignDossierQuerySchema.parse(request.query);
    const { plan } = await buildLiveConnectorDesignDossierForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/revenue-engine/live-connector-design-dossier/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueLiveConnectorDesignDossierSchema.parse(request.body);
    const response = await applyRevenueLiveConnectorDesignDossier(currentUser.sub, input);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/dashboard", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueEngineQuerySchema.parse(request.query);
    const dashboard = await buildRevenuePortfolioDashboardForUser(currentUser.sub, query);

    return reply.send({ dashboard });
  });

  app.get("/merch/revenue-engine/portfolio", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueEngineQuerySchema.parse(request.query);
    const portfolio = await buildAssetPortfolioForUser(currentUser.sub, query);

    return reply.send({ portfolio });
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetSchedulerQuerySchema.parse(request.query);
    const { plan } = await buildRevenueBusinessFleetSchedulerForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler/launch-gap", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetSchedulerQuerySchema.parse(request.query);
    const { plan } = await buildRevenueBusinessFleetLaunchGapForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.get("/merch/revenue-engine/money-army/batches", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueMoneyArmyBatchPipelineQuerySchema.parse(request.query);
    const [response, recentRuns] = await Promise.all([
      buildRevenueMoneyArmyBatchPipelineForUser(currentUser.sub, query),
      listRevenueMoneyArmyBatchRuns(currentUser.sub)
    ]);

    return reply.send({
      ...response,
      recentRuns
    });
  });

  app.post("/merch/revenue-engine/money-army/batches/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueMoneyArmyBatchPipelineSchema.parse(request.body);
    const response = await applyRevenueMoneyArmyBatchPipeline(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/launch-gap/seeds/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueBusinessFleetSeedGapSchema.parse(request.body);
    const response = await applyRevenueBusinessFleetLaunchGapSeeds(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/launch-gap/acceleration/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueBusinessFleetGapAccelerationSchema.parse(request.body);
    const response = await applyRevenueBusinessFleetGapAcceleration(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/launch-gap/live-package/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueBusinessFleetLiveLaunchPackageSchema.parse(request.body);
    const response = await applyRevenueBusinessFleetLiveLaunchPackage(currentUser.sub, input);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-gate", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetLaunchGateQuerySchema.parse(request.query);
    const response = await buildRevenueBusinessFleetLaunchGateForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler/launch-gap/provider-approval-review", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetProviderApprovalReviewQuerySchema.parse(request.query);
    const response = await buildRevenueBusinessFleetProviderApprovalReviewForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/launch-gap/provider-approval-review/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueBusinessFleetProviderApprovalReviewSchema.parse(request.body);
    const response = await applyRevenueBusinessFleetProviderApprovalReview(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/launch-wave/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueBusinessFleetLaunchWaveSchema.parse(request.body);
    const response = await applyRevenueBusinessFleetLaunchWave(currentUser.sub, input);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/asset-controls", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueAssetControlLedgerQuerySchema.parse(request.query);
    const ledger = await buildRevenueAssetControlLedgerForUser(currentUser.sub, query);

    return reply.send({ ledger });
  });

  app.get("/merch/revenue-engine/asset-controls/recovery", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueAssetControlRecoveryQuerySchema.parse(request.query);
    const recovery = await buildRevenueAssetControlRecoveryForUser(currentUser.sub, query);

    return reply.send({ recovery });
  });

  app.get("/merch/revenue-engine/review-queue", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueAssetReviewQueueQuerySchema.parse(request.query);
    const plan = await buildRevenueAssetReviewQueueForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/revenue-engine/portfolio/action", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: ApplyRevenueAssetActionInput = applyRevenueAssetActionSchema.parse(request.body);
    const portfolio = await buildAssetPortfolioForUser(currentUser.sub, input);
    const control = buildRevenueAssetControlPlan({
      action: input.action,
      assetId: input.assetId,
      assetType: input.assetType,
      portfolio
    });

    if (!control) {
      return reply.code(404).send({
        error: "Not Found",
        message: "Revenue asset was not found in the current portfolio."
      });
    }

    if (input.dryRun) {
      return reply.send({
        applied: {
          action: input.action,
          auditLogId: null,
          auditOnly: control.auditOnly,
          dryRun: true,
          externalExecution: false,
          productUpdates: control.change?.targetType === "product" ? [control.change] : [],
          providerContacted: false,
          statusChangeRequired: control.statusChangeRequired,
          storeUpdates: control.change?.targetType === "store" ? [control.change] : []
        },
        control,
        portfolio
      });
    }

    const applied = await applyAssetControl(currentUser.sub, control);
    const auditLog = await recordAuditLog({
      action: "revenue.asset_control.applied",
      actorUserId: currentUser.sub,
      metadata: {
        action: input.action,
        assetId: input.assetId,
        assetName: control.asset.assetName,
        assetType: input.assetType,
        auditOnly: control.auditOnly,
        change: control.change,
        controlReview: control.controlReview,
        dryRun: false,
        externalExecution: false,
        providerContacted: false,
        reason: control.reason,
        warnings: control.warnings
      },
      outcome: "success",
      severity: input.action === "kill" ? "high" : input.action === "pause" || input.action !== control.asset.recommendation ? "medium" : "low",
      targetId: input.assetId,
      targetType: "revenue_asset_control"
    });
    const controlRecords = await recordRevenueAssetControlRecords(currentUser.sub, [control], auditLog.id);
    const refreshedPortfolio = await buildAssetPortfolioForUser(currentUser.sub, input);

    return reply.send({
      applied: {
        action: input.action,
        auditLogId: auditLog.id,
        auditOnly: control.auditOnly,
        dryRun: false,
        externalExecution: false,
        productUpdates: applied.productUpdates,
        providerContacted: false,
        statusChangeRequired: control.statusChangeRequired,
        storeUpdates: applied.storeUpdates
      },
      control,
      controlRecord: controlRecords[0] ?? null,
      portfolio: refreshedPortfolio
    });
  });

  app.post("/merch/revenue-engine/portfolio/actions", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: ApplyRevenueAssetBatchActionInput = applyRevenueAssetBatchActionSchema.parse(request.body);
    const portfolio = await buildAssetPortfolioForUser(currentUser.sub, input);
    const batch = buildRevenueAssetBatchControlPlan({
      portfolio,
      selections: input.actions
    });

    if (batch.controls.length === 0) {
      return reply.code(404).send({
        batch,
        error: "Not Found",
        message: "No selected revenue assets were found in the current portfolio."
      });
    }

    if (input.dryRun) {
      return reply.send({
        applied: {
          actions: batch.controls.length,
          auditLogId: null,
          auditOnly: batch.auditOnly,
          dryRun: true,
          externalExecution: false,
          productUpdates: batch.productUpdates,
          providerContacted: false,
          skipped: batch.skipped,
          statusChangeRequired: batch.statusChangeRequired,
          storeUpdates: batch.storeUpdates
        },
        batch,
        portfolio
      });
    }

    const applied = await applyAssetBatchControl(currentUser.sub, batch);
    const auditLog = await recordAuditLog({
      action: "revenue.asset_batch_control.applied",
      actorUserId: currentUser.sub,
      metadata: {
        actionCounts: batch.totals,
        auditOnly: batch.auditOnly,
        controlReview: batch.controlReview,
        controls: batch.controls.map((control) => ({
          action: control.action,
          assetId: control.asset.assetId,
          assetName: control.asset.assetName,
          assetType: control.asset.assetType,
          auditOnly: control.auditOnly,
          change: control.change,
          controlReview: control.controlReview,
          reason: control.reason,
          warnings: control.warnings
        })),
        dryRun: false,
        externalExecution: false,
        providerContacted: false,
        skipped: batch.skipped,
        summary: batch.summary,
        warnings: batch.warnings
      },
      outcome: "success",
      severity: batch.totals.kill > 0 ? "high" : batch.totals.pause > 0 || batch.warnings.length > 0 ? "medium" : "low",
      targetId: null,
      targetType: "revenue_asset_batch_control"
    });
    const controlRecords = await recordRevenueAssetControlRecords(currentUser.sub, batch.controls, auditLog.id);
    const refreshedPortfolio = await buildAssetPortfolioForUser(currentUser.sub, input);

    return reply.send({
      applied: {
        actions: batch.controls.length,
        auditLogId: auditLog.id,
        auditOnly: batch.auditOnly,
        dryRun: false,
        externalExecution: false,
        productUpdates: applied.productUpdates,
        providerContacted: false,
        skipped: batch.skipped,
        statusChangeRequired: batch.statusChangeRequired,
        storeUpdates: applied.storeUpdates
      },
      batch,
      controlRecords,
      portfolio: refreshedPortfolio
    });
  });

  app.get("/merch/portfolio-command-center", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = portfolioCommandCenterQuerySchema.parse(request.query);
    const { plan } = await buildPortfolioCommandCenterForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/portfolio-command-center/actions/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: ApplyPortfolioCommandCenterInput = applyPortfolioCommandCenterSchema.parse(request.body);
    const { assetPortfolio, plan } = await buildPortfolioCommandCenterForUser(currentUser.sub, input);

    if (input.dryRun) {
      const assetControlBatch = buildRevenueAssetControlsFromPortfolioCommands({
        plan,
        portfolio: assetPortfolio
      });
      const productUpdates = plan.commandActions
        .filter((command) => command.targetType === "product" && productStatusForCommand(command.recommendedStatus))
        .map((command) => ({
          action: command.action,
          fromStatus: null,
          productId: command.targetId,
          productName: command.targetName,
          toStatus: command.recommendedStatus as string
        }));
      const storeUpdates = plan.commandActions
        .filter((command) => command.targetType === "store" && launchStatusForCommand(command.recommendedStatus))
        .map((command) => ({
          action: command.action,
          fromStatus: null,
          storeId: command.targetId,
          storeName: command.targetName,
          toStatus: command.recommendedStatus as string
        }));

      return reply.send({
        applied: {
          auditLogId: null,
          assetControlActionsSkipped: assetControlBatch.skipped.length,
          assetControlAuditLogId: null,
          assetControlBatchReview: assetControlBatch.controlReview,
          assetControlRecordsCreated: assetControlBatch.controls.length,
          commandRecordsCreated: plan.commandActions.length,
          contentCommands: plan.commandActions.filter((command) => command.targetType === "content").length,
          dryRun: true,
          externalExecution: false,
          financeCommands: plan.commandActions.filter((command) => command.targetType === "finance").length,
          productUpdates,
          providerContacted: false,
          storeUpdates
        },
        plan
      });
    }

    const applied = await applyPortfolioCommandCenter(currentUser.sub, plan, assetPortfolio);
    const refreshed = await buildPortfolioCommandCenterForUser(currentUser.sub, input);

    return reply.send({
      applied: {
        ...applied,
        dryRun: false,
        externalExecution: false
      },
      plan: refreshed.plan
    });
  });

  app.get("/merch/revenue-engine/autopilot", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueAutopilotQuerySchema.parse(request.query);
    const { plan } = await buildRevenueAutopilotForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/revenue-engine/autopilot/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: ApplyRevenueAutopilotInput = applyRevenueAutopilotSchema.parse(request.body);
    const { plan } = await buildRevenueAutopilotForUser(currentUser.sub, input);

    if (input.dryRun) {
      return reply.send({
        applied: {
          auditLogId: null,
          commandRecordsCreated: plan.actions.length,
          contentCommands: plan.actions.filter((item) => item.targetType === "content").length,
          dryRun: true,
          externalExecution: false,
          financeCommands: plan.actions.filter((item) => item.targetType === "finance").length,
          portfolioCommands: plan.actions.filter((item) => item.targetType === "portfolio").length,
          providerContacted: false,
          readyActions: plan.totals.readyActions,
          signalCommands: plan.actions.filter((item) => item.targetType === "signal").length
        },
        plan
      });
    }

    const applied = await applyRevenueAutopilot(currentUser.sub, plan);
    const refreshed = await buildRevenueAutopilotForUser(currentUser.sub, input);

    return reply.send({
      applied: {
        ...applied,
        dryRun: false,
        externalExecution: false,
        readyActions: plan.totals.readyActions
      },
      plan: refreshed.plan
    });
  });

  app.post("/merch/revenue-engine/autopilot/execute", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: ExecuteRevenueAutopilotInput = executeRevenueAutopilotSchema.parse(request.body);
    const response = await executeRevenueAutopilot(currentUser.sub, input);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/performance", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenuePerformanceQuerySchema.parse(request.query);
    const { digest } = await buildPerformanceDigestForUser(currentUser.sub, query);

    return reply.send({ digest });
  });

  app.get("/merch/revenue-engine/signal-connectors", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueSignalConnectorQuerySchema.parse(request.query);
    const plan = await buildRevenueSignalConnectorsForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/revenue-engine/signal-connectors/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueSignalConnectorSchema.parse(request.body);
    const plan = await buildRevenueSignalConnectorsForUser(currentUser.sub, input);
    const applied = await applyRevenueSignalConnectors(currentUser.sub, input, plan);

    return reply.send({ applied, plan });
  });

  app.get("/merch/revenue-engine/signal-connectors/approvals", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueSignalConnectorApprovalQuerySchema.parse(request.query);
    const plan = await buildRevenueSignalConnectorApprovalForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/revenue-engine/signal-connectors/approvals/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueSignalConnectorApprovalSchema.parse(request.body);
    const plan = await buildRevenueSignalConnectorApprovalForUser(currentUser.sub, input);
    const response = await queueRevenueSignalConnectorApprovals(currentUser.sub, input, plan);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/signal-connectors/approvals/:approvalId/review", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = revenueSignalConnectorApprovalParamsSchema.parse(request.params);
    const input = reviewRevenueSignalConnectorApprovalSchema.parse(request.body);
    const query = revenueSignalConnectorApprovalQuerySchema.parse(request.query);
    const response = await reviewRevenueSignalConnectorApproval(currentUser.sub, params, input, query);

    if ("errorCode" in response) {
      const statusCode = response.errorCode === 404 ? 404 : 409;

      return reply.code(statusCode).send({
        error: statusCode === 404 ? "Not Found" : "Conflict",
        message: response.errorMessage
      });
    }

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/signal-connectors/import-jobs/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueSignalImportJobSchema.parse(request.body);
    const plan = await buildRevenueSignalConnectorApprovalForUser(currentUser.sub, input);
    const response = await queueRevenueSignalImportJobs(currentUser.sub, input, plan);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/signal-connectors/import-handoff", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueSignalImportHandoffQuerySchema.parse(request.query);
    const plan = await buildRevenueSignalImportHandoffForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/revenue-engine/signal-connectors/import-handoff/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueSignalImportHandoffSchema.parse(request.body);
    const plan = await buildRevenueSignalImportHandoffForUser(currentUser.sub, input);
    const response = await applyRevenueSignalImportHandoff(currentUser.sub, input, plan);

    if ("errorCode" in response) {
      return reply.code(404).send({
        error: "Not Found",
        message: response.errorMessage
      });
    }

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/signal-intake", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query: SignalIntakeQueryInput = signalIntakeQuerySchema.parse(request.query);
    const plan = await buildSignalIntakeForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/revenue-engine/signal-intake/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: ApplySignalIntakeInput = applySignalIntakeSchema.parse(request.body);
    const commerceOwnership = await validatePerformanceSnapshotOwnership(currentUser.sub, input.commerceSignals);

    if (commerceOwnership.error) {
      return reply.code(404).send({ error: "Not Found", message: commerceOwnership.error });
    }

    const contentOwnership = await validateFacelessContentPerformanceOwnership(currentUser.sub, input.contentSignals);

    if (contentOwnership.error) {
      return reply.code(404).send({ error: "Not Found", message: contentOwnership.error });
    }

    const plan = await buildSignalIntakeForUser(currentUser.sub, input, input);

    if (input.dryRun) {
      return reply.send({
        ingested: {
          auditLogId: null,
          contentSnapshotsCreated: plan.totals.contentSignals,
          dryRun: true,
          externalExecution: false,
          paymentReconciliationReportId: null,
          paymentSignalsRecorded: plan.totals.paymentSignals,
          providerContacted: false,
          revenueSnapshotsCreated: plan.totals.commerceSignals
        },
        plan
      });
    }

    const applied = await applySignalIntake(currentUser.sub, input, plan);

    return reply.send({
      ingested: {
        ...applied,
        dryRun: false,
        externalExecution: false,
        paymentSignalsRecorded: plan.totals.paymentSignals,
        providerContacted: false
      },
      plan
    });
  });

  app.get("/merch/financial-orchestrator/plan", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = financialOrchestratorQuerySchema.parse(request.query);
    const { plan } = await buildFinancialOrchestratorForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/financial-orchestrator/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: ApplyFinancialOrchestratorInput = applyFinancialOrchestratorSchema.parse(request.body);
    const { plan } = await buildFinancialOrchestratorForUser(currentUser.sub, input);

    if (input.dryRun) {
      return reply.send({
        applied: {
          auditLogId: null,
          dryRun: true,
          externalExecution: false,
          ledgerEntriesCreated: plan.ledgerEntries.filter((entry) => entry.recordState === "new").length,
          payoutIntentsCreated: plan.payoutIntents.length,
          policyId: null,
          scalingBudgetPackets: plan.scalingBudgetQueue.length
        },
        plan
      });
    }

    const applied = await applyFinancialOrchestrator(currentUser.sub, plan);
    const auditLog = await recordAuditLog({
      action: "financial.orchestrator.applied",
      actorUserId: currentUser.sub,
      metadata: {
        dryRun: false,
        externalExecution: false,
        options: plan.options,
        policyId: applied.policyId,
        scalingBudgetQueue: plan.scalingBudgetQueue,
        summary: plan.summary,
        totals: plan.totals
      },
      outcome: "success",
      severity: applied.payoutIntentsCreated > 0 ? "high" : applied.ledgerEntriesCreated > 0 ? "medium" : "low",
      targetId: applied.policyId,
      targetType: "financial_orchestrator"
    });

    if (plan.scalingBudgetQueue.length > 0) {
      await prisma.financialScalingBudgetPacket.updateMany({
        data: { auditLogId: auditLog.id },
        where: {
          dedupeKey: { in: plan.scalingBudgetQueue.map((packet) => packet.dedupeKey) },
          userId: currentUser.sub
        }
      });
    }

    return reply.send({
      applied: {
        ...applied,
        auditLogId: auditLog.id,
        dryRun: false,
        externalExecution: false
      },
      plan
    });
  });

  app.get("/merch/financial-orchestrator/payout-intents/review", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const { plan } = await buildFinancialPayoutReviewForUser(currentUser.sub);

    return reply.send({ plan });
  });

  app.get("/merch/financial-orchestrator/scaling-budgets/review", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const { plan } = await buildFinancialScalingBudgetReviewForUser(currentUser.sub);

    return reply.send({ plan });
  });

  app.get("/merch/financial-orchestrator/scaling-spend-control", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const { plan } = await buildFinancialScalingSpendControlForUser(currentUser.sub);

    return reply.send({ plan });
  });

  app.post("/merch/financial-orchestrator/scaling-spend-control/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: ApplyFinancialScalingSpendControlInput = applyFinancialScalingSpendControlSchema.parse(request.body);
    const { plan } = await buildFinancialScalingSpendControlForUser(currentUser.sub);

    if (input.dryRun) {
      return reply.send({
        applied: {
          auditLogId: null,
          dryRun: true,
          externalExecution: false,
          providerContacted: false,
          scalingSpendPacketsUpserted: plan.spendPackets.length
        },
        plan
      });
    }

    const applied = await applyFinancialScalingSpendControl(currentUser.sub, plan);
    const refreshed = await buildFinancialScalingSpendControlForUser(currentUser.sub);

    return reply.send({
      applied: {
        ...applied,
        dryRun: false,
        externalExecution: false,
        providerContacted: false
      },
      plan: refreshed.plan
    });
  });

  app.get("/merch/financial-orchestrator/scaling-execution-ledger", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const { plan } = await buildFinancialScalingExecutionLedgerForUser(currentUser.sub);

    return reply.send({ plan });
  });

  app.post("/merch/financial-orchestrator/scaling-execution-ledger/entries", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: IngestFinancialScalingExecutionLedgerInput = ingestFinancialScalingExecutionLedgerSchema.parse(request.body);
    const validation = await validateFinancialScalingExecutionEntries(currentUser.sub, input);

    if (validation.error) {
      return reply.code(validation.error.code).send({
        error: validation.error.code === 404 ? "Not Found" : "Bad Request",
        message: validation.error.message
      });
    }

    if (input.dryRun) {
      const current = await buildFinancialScalingExecutionLedgerForUser(currentUser.sub);
      const previewEntries = input.entries.map((entry, index) => {
        const packet = validation.packetById.get(entry.scalingSpendPacketId);

        if (!packet) {
          throw new Error(`Scaling spend packet ${entry.scalingSpendPacketId} was not available after validation.`);
        }

        return financialScalingExecutionPreviewSnapshot(packet, entry, index);
      });
      const plan = buildFinancialScalingExecutionLedgerPlan({
        entries: [...previewEntries, ...current.plan.entries],
        spendControlPlan: current.spendControlPlan
      });

      return reply.send({
        applied: {
          auditLogId: null,
          dryRun: true,
          entriesRecorded: input.entries.length,
          externalExecution: false,
          providerContacted: false
        },
        plan
      });
    }

    const applied = await applyFinancialScalingExecutionLedger(currentUser.sub, input);

    if (applied.error || !applied.result) {
      const error = applied.error ?? {
        code: 500,
        message: "Scaling execution outcomes could not be recorded."
      };

      return reply.code(error.code).send({
        error: error.code === 404 ? "Not Found" : "Bad Request",
        message: error.message
      });
    }

    const refreshed = await buildFinancialScalingExecutionLedgerForUser(currentUser.sub);

    return reply.send({
      applied: {
        ...applied.result,
        dryRun: false,
        externalExecution: false,
        providerContacted: false
      },
      plan: refreshed.plan
    });
  });

  app.get("/merch/financial-orchestrator/release-governance", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const { plan } = await buildFinancialReleaseGovernanceForUser(currentUser.sub);

    return reply.send({ plan });
  });

  app.post("/merch/financial-orchestrator/release-governance/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: ApplyFinancialReleaseGovernanceInput = applyFinancialReleaseGovernanceSchema.parse(request.body);
    const { plan } = await buildFinancialReleaseGovernanceForUser(currentUser.sub);

    if (input.dryRun) {
      return reply.send({
        applied: {
          auditLogId: null,
          budgetReleasePacketsUpserted: plan.budgetReleasePackets.length,
          dryRun: true,
          externalExecution: false,
          reconciliationReportId: null,
          reconciliationStatus: plan.reconciliationReport.status,
          stripeProviderContacted: false
        },
        plan
      });
    }

    const applied = await applyFinancialReleaseGovernance(currentUser.sub, plan);
    const refreshed = await buildFinancialReleaseGovernanceForUser(currentUser.sub);

    return reply.send({
      applied: {
        ...applied,
        dryRun: false,
        externalExecution: false,
        reconciliationStatus: plan.reconciliationReport.status,
        stripeProviderContacted: false
      },
      plan: refreshed.plan
    });
  });

  app.get("/merch/faceless-content/pipeline", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = facelessContentPipelineQuerySchema.parse(request.query);
    const { plan } = await buildFacelessContentPipelineForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/faceless-content/pipeline/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: ApplyFacelessContentPipelineInput = applyFacelessContentPipelineSchema.parse(request.body);
    const { plan } = await buildFacelessContentPipelineForUser(currentUser.sub, input);

    if (input.dryRun) {
      return reply.send({
        applied: {
          auditLogId: null,
          briefsCreated: plan.briefs.filter((brief) => brief.recordState === "new").length,
          dryRun: true,
          externalExecution: false,
          providerContacted: false
        },
        plan
      });
    }

    const applied = await applyFacelessContentPipeline(currentUser.sub, plan);
    const refreshed = await buildFacelessContentPipelineForUser(currentUser.sub, input);

    return reply.send({
      applied: {
        ...applied,
        dryRun: false,
        externalExecution: false,
        providerContacted: false
      },
      plan: refreshed.plan
    });
  });

  app.get("/merch/faceless-content/performance", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = facelessContentPerformanceQuerySchema.parse(request.query);
    const { digest } = await buildFacelessContentPerformanceForUser(currentUser.sub, query);

    return reply.send({ digest });
  });

  app.post("/merch/faceless-content/performance/snapshots", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: IngestFacelessContentPerformanceInput = ingestFacelessContentPerformanceSchema.parse(request.body);
    const ownership = await validateFacelessContentPerformanceOwnership(currentUser.sub, input.snapshots);

    if (ownership.error) {
      return reply.code(404).send({ error: "Not Found", message: ownership.error });
    }

    const previewSnapshots: FacelessContentPerformanceSnapshot[] = input.snapshots.map((snapshot, index) => ({
      channel: snapshot.channel,
      clicks: snapshot.clicks,
      comments: snapshot.comments,
      contentBriefId: snapshot.contentBriefId ?? null,
      conversions: snapshot.conversions,
      cost: snapshot.cost,
      externalExecution: false,
      id: `preview_content_${index}`,
      likes: snapshot.likes,
      notes: snapshot.notes ?? null,
      periodEnd: snapshot.periodEnd,
      periodStart: snapshot.periodStart,
      productId: snapshot.productId ?? null,
      revenue: snapshot.revenue,
      saves: snapshot.saves,
      shares: snapshot.shares,
      source: snapshot.source,
      storeId: snapshot.storeId ?? null,
      views: snapshot.views,
      watchSeconds: snapshot.watchSeconds
    }));

    if (input.dryRun) {
      const existingRecords = await loadFacelessContentPerformanceSnapshots(currentUser.sub, facelessContentPerformanceQuerySchema.parse({}));
      const stores = await loadPortfolioForUser(currentUser.sub);
      const previewPlan = buildFacelessContentPipelinePlan({
        options: {},
        performanceSnapshots: [
          ...existingRecords.map(facelessContentPerformanceSnapshot),
          ...previewSnapshots
        ],
        products: stores.flatMap((store) => store.products.map(productSnapshot)),
        stores: stores.map((store) => storeSnapshot(store))
      });

      return reply.send({
        digest: previewPlan.performanceDigest,
        ingested: {
          auditLogId: null,
          dryRun: true,
          externalExecution: false,
          snapshots: input.snapshots.length
        }
      });
    }

    const result = await prisma.facelessContentPerformanceSnapshot.createMany({
      data: input.snapshots.map((snapshot) => createFacelessContentPerformanceSnapshotData(currentUser.sub, snapshot))
    });
    const auditLog = await recordAuditLog({
      action: "faceless_content.performance.ingested",
      actorUserId: currentUser.sub,
      metadata: {
        channels: Array.from(new Set(input.snapshots.map((snapshot) => snapshot.channel))),
        externalExecution: false,
        providerContacted: false,
        snapshots: result.count,
        sourceTypes: Array.from(new Set(input.snapshots.map((snapshot) => snapshot.source)))
      },
      outcome: "success",
      severity: result.count > 0 ? "medium" : "low",
      targetId: null,
      targetType: "faceless_content_performance"
    });
    const { digest } = await buildFacelessContentPerformanceForUser(currentUser.sub, facelessContentPerformanceQuerySchema.parse({}));

    return reply.send({
      digest,
      ingested: {
        auditLogId: auditLog.id,
        dryRun: false,
        externalExecution: false,
        snapshots: result.count
      }
    });
  });

  app.post("/merch/financial-orchestrator/payout-intents/:intentId/review", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params: FinancialPayoutIntentParamsInput = financialPayoutIntentParamsSchema.parse(request.params);
    const input: ReviewFinancialPayoutIntentInput = reviewFinancialPayoutIntentSchema.parse(request.body);
    const existing = await prisma.financialPayoutIntent.findFirst({
      where: {
        id: params.intentId,
        userId: currentUser.sub
      }
    });

    if (!existing) {
      return reply.code(404).send({ error: "Not Found", message: "Financial payout intent was not found." });
    }

    if (existing.status !== "approval_required") {
      return reply.code(409).send({ error: "Conflict", message: "Only pending payout intents can be reviewed." });
    }

    const nextStatus = input.action === "approve" ? "approved_manual_handoff" : "rejected";
    const existingMetadata = parseSecureJson<Record<string, unknown>>(existing.metadataJson) ?? {};
    const reviewedAt = new Date().toISOString();
    const reviewEntry = {
      action: input.action,
      externalExecution: false,
      fromStatus: existing.status,
      note: input.note ?? null,
      reviewedAt,
      reviewedById: currentUser.sub,
      toStatus: nextStatus
    };
    const auditLog = await recordAuditLog({
      action: input.action === "approve" ? "financial.payout_intent.approved" : "financial.payout_intent.rejected",
      actorUserId: currentUser.sub,
      metadata: {
        amount: decimalToNumber(existing.amount),
        category: existing.category,
        currency: existing.currency,
        destinationType: existing.destinationType,
        externalExecution: false,
        note: input.note ?? null,
        provider: existing.provider,
        status: nextStatus
      },
      outcome: "success",
      severity: input.action === "approve" ? "high" : "medium",
      targetId: existing.id,
      targetType: "financial_payout_intent"
    });
    const updated = await prisma.financialPayoutIntent.update({
      data: {
        auditLogId: auditLog.id,
        metadataJson: stringifySecureJson({
          ...existingMetadata,
          lastReview: {
            ...reviewEntry,
            auditLogId: auditLog.id
          },
          reviewHistory: [
            ...(Array.isArray(existingMetadata.reviewHistory) ? existingMetadata.reviewHistory : []),
            {
              ...reviewEntry,
              auditLogId: auditLog.id
            }
          ]
        }),
        status: nextStatus
      },
      where: { id: existing.id }
    });
    const { plan } = await buildFinancialPayoutReviewForUser(currentUser.sub);

    return reply.send({
      auditLogId: auditLog.id,
      externalExecution: false,
      intent: financialPayoutIntentSnapshot(updated),
      plan,
      review: {
        action: input.action,
        fromStatus: existing.status,
        note: input.note ?? null,
        toStatus: nextStatus
      }
    });
  });

  app.post("/merch/financial-orchestrator/scaling-budgets/:packetId/review", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params: FinancialScalingBudgetPacketParamsInput = financialScalingBudgetPacketParamsSchema.parse(request.params);
    const input: ReviewFinancialScalingBudgetPacketInput = reviewFinancialScalingBudgetPacketSchema.parse(request.body);
    const existing = await prisma.financialScalingBudgetPacket.findFirst({
      where: {
        id: params.packetId,
        userId: currentUser.sub
      }
    });

    if (!existing) {
      return reply.code(404).send({ error: "Not Found", message: "Financial scaling budget packet was not found." });
    }

    if (existing.status !== "approval_required") {
      return reply.code(409).send({ error: "Conflict", message: "Only pending scaling budget packets can be reviewed." });
    }

    const nextStatus = input.action === "approve" ? "approved_manual_handoff" : "rejected";
    const existingMetadata = parseSecureJson<Record<string, unknown>>(existing.metadataJson) ?? {};
    const reviewedAt = new Date();
    const reviewEntry = {
      action: input.action,
      externalExecution: false,
      fromStatus: existing.status,
      note: input.note ?? null,
      providerContacted: false,
      reviewedAt: reviewedAt.toISOString(),
      reviewedById: currentUser.sub,
      toStatus: nextStatus
    };
    const auditLog = await recordAuditLog({
      action: input.action === "approve" ? "financial.scaling_budget.approved" : "financial.scaling_budget.rejected",
      actorUserId: currentUser.sub,
      metadata: {
        amount: decimalToNumber(existing.amount),
        assetId: existing.assetId,
        assetName: existing.assetName,
        assetType: existing.assetType,
        externalExecution: false,
        note: input.note ?? null,
        providerContacted: false,
        score: existing.score,
        status: nextStatus,
        storeId: existing.storeId,
        storeName: existing.storeName
      },
      outcome: "success",
      severity: input.action === "approve" ? "high" : "medium",
      targetId: existing.id,
      targetType: "financial_scaling_budget_packet"
    });
    const updated = await prisma.financialScalingBudgetPacket.update({
      data: {
        auditLogId: auditLog.id,
        externalExecution: false,
        metadataJson: stringifySecureJson({
          ...existingMetadata,
          lastReview: {
            ...reviewEntry,
            auditLogId: auditLog.id
          },
          reviewHistory: [
            ...(Array.isArray(existingMetadata.reviewHistory) ? existingMetadata.reviewHistory : []),
            {
              ...reviewEntry,
              auditLogId: auditLog.id
            }
          ]
        }),
        providerContacted: false,
        reviewedAt,
        reviewedById: currentUser.sub,
        reviewNote: input.note ?? null,
        status: nextStatus
      },
      where: { id: existing.id }
    });
    const { plan } = await buildFinancialScalingBudgetReviewForUser(currentUser.sub);

    return reply.send({
      auditLogId: auditLog.id,
      externalExecution: false,
      packet: financialScalingBudgetPacketSnapshot(updated),
      plan,
      providerContacted: false,
      review: {
        action: input.action,
        fromStatus: existing.status,
        note: input.note ?? null,
        toStatus: nextStatus
      }
    });
  });

  app.post("/merch/revenue-engine/performance/snapshots", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: IngestRevenuePerformanceInput = ingestRevenuePerformanceSchema.parse(request.body);
    const ownership = await validatePerformanceSnapshotOwnership(currentUser.sub, input.snapshots);

    if (ownership.error) {
      return reply.code(404).send({ error: "Not Found", message: ownership.error });
    }

    const existing = await buildPerformanceDigestForUser(currentUser.sub, revenuePerformanceQuerySchema.parse({}));
    const incomingSnapshots = input.snapshots.map((snapshot) => normalizeRevenuePerformanceSnapshot({
      ...snapshot,
      netProfit: snapshot.netProfit ?? calculateRevenuePerformanceNetProfit(snapshot)
    }));
    const previewDigest = buildRevenuePerformanceDigest({
      options: existing.digest.options,
      products: existing.products,
      snapshots: [...existing.digest.snapshots, ...incomingSnapshots],
      stores: existing.stores.map((store) => storeSnapshot(store))
    });

    if (input.dryRun) {
      return reply.send({
        digest: previewDigest,
        ingested: {
          auditLogId: null,
          dryRun: true,
          externalExecution: false,
          snapshots: incomingSnapshots.length,
          storeRollups: Array.from(new Set(incomingSnapshots.map((snapshot) => snapshot.storeId))).map((storeId) => ({ storeId }))
        }
      });
    }

    const created = await prisma.$transaction(input.snapshots.map((snapshot) => prisma.revenuePerformanceSnapshot.create({
      data: createPerformanceSnapshotData(currentUser.sub, snapshot)
    })));
    await rollupPerformanceStores(currentUser.sub, input.snapshots.map((snapshot) => snapshot.storeId));
    const digest = await buildPerformanceDigestForUser(currentUser.sub, previewDigest.options);
    const auditLog = await recordAuditLog({
      action: "revenue.performance.ingested",
      actorUserId: currentUser.sub,
      metadata: {
        dryRun: false,
        externalExecution: false,
        snapshotIds: created.map((snapshot) => snapshot.id),
        sourceBreakdown: incomingSnapshots.reduce<Record<string, number>>((counts, snapshot) => {
          counts[snapshot.source] = (counts[snapshot.source] ?? 0) + 1;
          return counts;
        }, {}),
        summary: digest.digest.summary
      },
      outcome: "success",
      severity: created.length > 0 ? "medium" : "low",
      targetType: "revenue_performance"
    });

    return reply.send({
      digest: digest.digest,
      ingested: {
        auditLogId: auditLog.id,
        dryRun: false,
        externalExecution: false,
        snapshots: created.length,
        storeRollups: Array.from(new Set(input.snapshots.map((snapshot) => snapshot.storeId))).map((storeId) => ({ storeId }))
      }
    });
  });

  app.post("/merch/revenue-engine/performance/rotation/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: ApplyRevenuePerformanceRotationInput = applyRevenuePerformanceRotationSchema.parse(request.body);
    const { digest } = await buildPerformanceDigestForUser(currentUser.sub, input);

    if (input.dryRun) {
      return reply.send({
        applied: {
          auditLogId: null,
          dryRun: true,
          externalExecution: false,
          productUpdates: digest.rotationChanges.filter((change) => change.targetType === "product"),
          storeUpdates: digest.rotationChanges.filter((change) => change.targetType === "store")
        },
        digest
      });
    }

    const applied = await applyPerformanceRotation(currentUser.sub, digest);
    const auditLog = await recordAuditLog({
      action: "revenue.performance_rotation.applied",
      actorUserId: currentUser.sub,
      metadata: {
        dryRun: false,
        externalExecution: false,
        options: digest.options,
        productUpdates: applied.productUpdates,
        storeUpdates: applied.storeUpdates,
        summary: digest.summary
      },
      outcome: "success",
      severity: applied.productUpdates.length + applied.storeUpdates.length > 0 ? "medium" : "low",
      targetType: "revenue_performance"
    });

    return reply.send({
      applied: {
        auditLogId: auditLog.id,
        dryRun: false,
        externalExecution: false,
        productUpdates: applied.productUpdates,
        storeUpdates: applied.storeUpdates
      },
      digest
    });
  });

  app.get("/merch/revenue-engine/listing-optimization", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueListingOptimizationQuerySchema.parse(request.query);
    const { plan } = await buildListingOptimizationForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/revenue-engine/listing-optimization/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: ApplyRevenueListingOptimizationInput = applyRevenueListingOptimizationSchema.parse(request.body);
    const { plan } = await buildListingOptimizationForUser(currentUser.sub, input);

    if (input.dryRun) {
      return reply.send({
        applied: {
          auditLogId: null,
          dryRun: true,
          externalExecution: false,
          productUpdates: plan.experiments.map((experiment) => ({
            fromStatus: experiment.currentListing.title ? "Existing listing draft" : "Missing listing copy",
            productId: experiment.productId,
            productName: experiment.productName,
            recommendedVariantId: experiment.recommendedVariant.id,
            storeId: experiment.storeId,
            toStatus: experiment.recommendedInternalStatus
          }))
        },
        plan
      });
    }

    const applied = await applyListingOptimization(currentUser.sub, plan);
    const auditLog = await recordAuditLog({
      action: "revenue.listing_optimization.applied",
      actorUserId: currentUser.sub,
      metadata: {
        dryRun: false,
        externalExecution: false,
        options: plan.options,
        productUpdates: applied.productUpdates,
        summary: plan.summary
      },
      outcome: "success",
      severity: applied.productUpdates.length > 0 ? "medium" : "low",
      targetType: "revenue_listing_optimization"
    });

    return reply.send({
      applied: {
        ...applied,
        auditLogId: auditLog.id,
        dryRun: false,
        externalExecution: false
      },
      plan
    });
  });

  app.get("/merch/revenue-engine/store-setup", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueStoreSetupQuerySchema.parse(request.query);
    const { plan } = await buildStoreSetupForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/revenue-engine/store-setup/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: ApplyRevenueStoreSetupInput = applyRevenueStoreSetupSchema.parse(request.body);
    const { plan, stores } = await buildStoreSetupForUser(currentUser.sub, input);
    const storeUpdates = storeSetupUpdatesFrom(plan, stores);

    if (input.dryRun) {
      return reply.send({
        applied: {
          auditLogId: null,
          dryRun: true,
          externalExecution: false,
          storeUpdates
        },
        plan
      });
    }

    const applied = await applyStoreSetup(currentUser.sub, plan, stores);
    const auditLog = await recordAuditLog({
      action: "revenue.store_setup.applied",
      actorUserId: currentUser.sub,
      metadata: {
        dryRun: false,
        externalExecution: false,
        options: plan.options,
        storeUpdates: applied.storeUpdates,
        summary: plan.summary
      },
      outcome: "success",
      severity: applied.storeUpdates.length > 0 ? "medium" : "low",
      targetType: "revenue_store_setup"
    });

    return reply.send({
      applied: {
        ...applied,
        auditLogId: auditLog.id,
        dryRun: false,
        externalExecution: false
      },
      plan
    });
  });

  app.get("/merch/revenue-engine/digital-products", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueDigitalProductQuerySchema.parse(request.query);
    const { plan } = await buildDigitalProductPortfolioForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/revenue-engine/digital-products/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: ApplyRevenueDigitalProductInput = applyRevenueDigitalProductSchema.parse(request.body);
    const { plan, stores } = await buildDigitalProductPortfolioForUser(currentUser.sub, input);

    if (input.dryRun) {
      return reply.send({
        applied: {
          auditLogId: null,
          createdProducts: plan.totals.queuedDrafts,
          dryRun: true,
          externalExecution: false,
          storeUpdates: plan.storePlans
            .filter((storePlan) => storePlan.queuedDrafts.length > 0)
            .map((storePlan) => ({
              addedProductTypes: storePlan.queuedDrafts.map((draft) => draft.createProductInput.productType),
              approvalStatus: "Designs Pending",
              launchStatus: "Designing",
              storeId: storePlan.storeId,
              storeName: storePlan.storeName
            }))
        },
        plan
      });
    }

    const applied = await applyDigitalProductQueue(currentUser.sub, stores, plan);
    const auditLog = await recordAuditLog({
      action: "revenue.digital_products.applied",
      actorUserId: currentUser.sub,
      metadata: {
        createdProducts: applied.createdProducts,
        dryRun: false,
        externalExecution: false,
        options: plan.options,
        storeUpdates: applied.storeUpdates,
        summary: plan.summary
      },
      outcome: "success",
      severity: applied.createdProducts.length > 0 ? "medium" : "low",
      targetType: "revenue_digital_products"
    });

    return reply.send({
      applied: {
        ...applied,
        auditLogId: auditLog.id,
        dryRun: false,
        externalExecution: false
      },
      plan
    });
  });

  app.get("/merch/revenue-engine/launch-pipeline", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueLaunchPipelineQuerySchema.parse(request.query);
    const { plan } = await buildLaunchPipelineForUser(currentUser.sub, query);

    return reply.send({ plan });
  });

  app.post("/merch/revenue-engine/launch-pipeline/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: ApplyRevenueLaunchPipelineInput = applyRevenueLaunchPipelineSchema.parse(request.body);
    const { plan, stores } = await buildLaunchPipelineForUser(currentUser.sub, input);

    if (input.dryRun) {
      return reply.send({
        applied: {
          approvalPackets: plan.storePlans
            .filter((storePlan) => storePlan.action === "queue_launch_approval" || storePlan.action === "prepare_launch_package")
            .map((storePlan) => ({
              id: null,
              storeId: storePlan.storeId
            })),
          auditLogId: null,
          createdProducts: plan.totals.draftProductsNeeded,
          dryRun: true,
          externalExecution: false,
          storeUpdates: plan.storePlans
            .filter((storePlan) => storePlan.action !== "hold")
            .map((storePlan) => ({
              action: storePlan.action,
              storeId: storePlan.storeId,
              storeName: storePlan.storeName
            }))
        },
        plan
      });
    }

    const applied = await applyLaunchPipeline(currentUser.sub, stores, plan);
    const auditLog = await recordAuditLog({
      action: "revenue.launch_pipeline.applied",
      actorUserId: currentUser.sub,
      metadata: {
        approvalPackets: applied.approvalPackets,
        createdProducts: applied.createdProducts,
        dryRun: false,
        externalExecution: false,
        options: plan.options,
        storeUpdates: applied.storeUpdates,
        summary: plan.summary
      },
      outcome: "success",
      severity: applied.createdProducts.length + applied.approvalPackets.length > 0 ? "medium" : "low",
      targetType: "revenue_launch_pipeline"
    });

    return reply.send({
      applied: {
        ...applied,
        auditLogId: auditLog.id,
        dryRun: false,
        externalExecution: false
      },
      plan
    });
  });

  app.post("/merch/revenue-engine/rotation/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input: ApplyRevenueRotationInput = applyRevenueRotationSchema.parse(request.body);
    const plan = await buildPlanForUser(currentUser.sub, input);

    if (input.dryRun) {
      const portfolio = await buildAssetPortfolioForUser(currentUser.sub, input);

      return reply.send({
        applied: {
          auditLogId: null,
          dryRun: true,
          externalExecution: false,
          productUpdates: plan.rotationChanges.filter((change) => change.targetType === "product"),
          storeUpdates: plan.rotationChanges.filter((change) => change.targetType === "store")
        },
        plan,
        portfolio
      });
    }

    const applied = await applyRotation(currentUser.sub, plan);
    const auditLog = await recordAuditLog({
      action: "revenue.rotation.applied",
      actorUserId: currentUser.sub,
      metadata: {
        dryRun: false,
        externalExecution: false,
        productUpdates: applied.productUpdates,
        storeUpdates: applied.storeUpdates,
        summary: plan.summary,
        thresholds: plan.thresholds
      },
      outcome: "success",
      severity: applied.productUpdates.length + applied.storeUpdates.length > 0 ? "medium" : "low",
      targetType: "revenue_engine"
    });

    const portfolio = await buildAssetPortfolioForUser(currentUser.sub, input);

    return reply.send({
      applied: {
        auditLogId: auditLog.id,
        dryRun: false,
        externalExecution: false,
        productUpdates: applied.productUpdates,
        storeUpdates: applied.storeUpdates
      },
      plan,
      portfolio
    });
  });
}
