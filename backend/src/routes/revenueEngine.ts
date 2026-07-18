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
  applyRevenueBusinessFleetLaunchExecutionQueueSchema,
  applyRevenueBusinessFleetLaunchWorkerAssignmentsSchema,
  applyRevenueBusinessFleetManualLaunchEvidenceSchema,
  applyRevenueBusinessFleetLaunchCashCycleSchema,
  applyRevenueBusinessFleetLaunchCashCycleCommandQueueSchema,
  applyRevenueBusinessFleetIncomeSprintCommandSchema,
  applyRevenueBusinessFleetIncomeSprintCommandQueueSchema,
  applyRevenueBusinessFleetLaunchNightCommandSchema,
  applyRevenueBusinessFleetLaunchNightCommandQueueSchema,
  applyRevenueBusinessFleetLaunchNightSupervisorActionSchema,
  applyRevenueBusinessFleetLaunchNightSupervisorRunNextSchema,
  applyRevenueBusinessFleetLaunchOutcomeSignalsSchema,
  applyRevenueBusinessFleetLiveLaunchPackageSchema,
  applyRevenueBusinessFleetProviderApprovalReviewSchema,
  applyRevenueBusinessFleetSeedGapSchema,
  applyRevenueBusinessFleetLaunchWaveSchema,
  applyRevenueHundredStoreDailySupervisorSchema,
  applyRevenueHundredStoreAppConnectionPacketsSchema,
  applyRevenueHundredStoreConnectorActivationSchema,
  applyRevenueHundredStoreMonitoringCycleSchema,
  applyRevenueHundredStoreProductDepthSchema,
  applyRevenueHundredStoreLaunchPacketsSchema,
  applyRevenueHundredStoreAutonomyRunSchema,
  applyRevenueHundredStoreWorkLeasesSchema,
  applyRevenueHundredStoreWorkerAssignmentsSchema,
  applyRevenueHundredStoreOperationsSchema,
  applyRevenueMoneyArmyGenerateScoreBatchSchema,
  applyRevenueFirstBusinessLaunchPackageSchema,
  applyRevenueFirstStorePrepareSchema,
  applyRevenueFirstBusinessInternalLaunchSchema,
  applyRevenueFirstBusinessExecuteSchema,
  applyRevenueFirstBusinessAutonomousLaunchSchema,
  applyRevenueFirstBusinessLiveExecutorSchema,
  applyRevenueOwnerManualLaunchApprovalSchema,
  applyRevenueFirstStoreManualLaunchEvidenceSchema,
  applyRevenueFirstStoreManualSignalCaptureSchema,
  applyRevenueWinnerClonePacketApprovalSchema,
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
  revenueHundredStoreOperationsQuerySchema,
  revenueBusinessFleetLaunchGateQuerySchema,
  revenueBusinessFleetLaunchControlQuerySchema,
  revenueBusinessFleetSwarmReadinessQuerySchema,
  revenueBusinessFleetLaunchCashCycleQuerySchema,
  revenueBusinessFleetLaunchCashCycleCommandQueueQuerySchema,
  revenueBusinessFleetIncomeSprintQuerySchema,
  revenueBusinessFleetLaunchNightQuerySchema,
  revenueBusinessFleetLaunchNightExecutionChecklistQuerySchema,
  revenueBusinessFleetLaunchNightOperatorConsoleQuerySchema,
  revenueBusinessFleetLaunchNightSupervisorQuerySchema,
  revenueBusinessFleetLaunchNightSupervisorActionsQuerySchema,
  revenueBusinessFleetLaunchNightSupervisorRunUntilBlockedPreviewSchema,
  revenueBusinessFleetLaunchNightCommandQueueQuerySchema,
  revenueBusinessFleetIncomeSprintCommandQueueQuerySchema,
  revenueBusinessFleetLaunchOutcomeSignalsQuerySchema,
  revenueBusinessFleetLaunchExecutionQueueQuerySchema,
  revenueBusinessFleetLaunchWorkerAssignmentsQuerySchema,
  revenueBusinessFleetManualLaunchEvidenceQuerySchema,
  revenueBusinessFleetProviderApprovalReviewQuerySchema,
  revenueMoneyArmyGenerateScoreBatchQuerySchema,
  revenueFirstBusinessLaunchPackageQuerySchema,
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
  revenueFirstBusinessExecuteConfirmation,
  revenueFirstBusinessLaunchConfirmation,
  revenueFirstBusinessLiveExecutorUnlockPhrase,
  revenueOwnerManualLaunchApprovalConfirmation,
  revenueFirstStoreManualLaunchEvidenceConfirmation,
  revenueFirstStoreManualSignalCaptureConfirmation,
  revenueBusinessFleetManualLaunchEvidenceConfirmation,
  revenueBusinessFleetManualLaunchEvidencePhrase,
  revenueBusinessFleetLaunchCashCycleConfirmation,
  revenueBusinessFleetLaunchNightCommandConfirmation,
  revenueBusinessFleetLaunchNightCommandQueueConfirmation,
  revenueBusinessFleetLaunchNightSupervisorActionConfirmation,
  revenueBusinessFleetLaunchNightSupervisorRunNextConfirmation,
  revenueBusinessFleetLaunchNightSupervisorRunUntilBlockedPreviewConfirmation,
  revenueBusinessFleetLaunchOutcomeSignalsConfirmation,
  revenueWinnerClonePacketApprovalConfirmation,
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
  type ApplyRevenueBusinessFleetLaunchExecutionQueueInput,
  type ApplyRevenueBusinessFleetLaunchWorkerAssignmentsInput,
  type ApplyRevenueBusinessFleetManualLaunchEvidenceInput,
  type ApplyRevenueBusinessFleetLaunchCashCycleInput,
  type ApplyRevenueBusinessFleetLaunchCashCycleCommandQueueInput,
  type ApplyRevenueBusinessFleetIncomeSprintCommandInput,
  type ApplyRevenueBusinessFleetIncomeSprintCommandQueueInput,
  type ApplyRevenueBusinessFleetLaunchNightCommandInput,
  type ApplyRevenueBusinessFleetLaunchNightCommandQueueInput,
  type ApplyRevenueBusinessFleetLaunchNightSupervisorActionInput,
  type ApplyRevenueBusinessFleetLaunchNightSupervisorRunNextInput,
  type ApplyRevenueBusinessFleetLaunchOutcomeSignalsInput,
  type ApplyRevenueBusinessFleetLiveLaunchPackageInput,
  type ApplyRevenueBusinessFleetProviderApprovalReviewInput,
  type ApplyRevenueBusinessFleetSeedGapInput,
  type ApplyRevenueBusinessFleetLaunchWaveInput,
  type ApplyRevenueHundredStoreDailySupervisorInput,
  type ApplyRevenueHundredStoreAppConnectionPacketsInput,
  type ApplyRevenueHundredStoreConnectorActivationInput,
  type ApplyRevenueHundredStoreMonitoringCycleInput,
  type ApplyRevenueHundredStoreProductDepthInput,
  type ApplyRevenueHundredStoreLaunchPacketsInput,
  type ApplyRevenueHundredStoreAutonomyRunInput,
  type ApplyRevenueHundredStoreWorkLeasesInput,
  type ApplyRevenueHundredStoreWorkerAssignmentsInput,
  type ApplyRevenueHundredStoreOperationsInput,
  type ApplyRevenueMoneyArmyGenerateScoreBatchInput,
  type ApplyRevenueFirstBusinessLaunchPackageInput,
  type ApplyRevenueFirstStorePrepareInput,
  type ApplyRevenueFirstBusinessInternalLaunchInput,
  type ApplyRevenueFirstBusinessExecuteInput,
  type ApplyRevenueFirstBusinessAutonomousLaunchInput,
  type ApplyRevenueFirstBusinessLiveExecutorInput,
  type ApplyRevenueOwnerManualLaunchApprovalInput,
  type ApplyRevenueFirstStoreManualLaunchEvidenceInput,
  type ApplyRevenueFirstStoreManualSignalCaptureInput,
  type ApplyRevenueWinnerClonePacketApprovalInput,
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
  type RevenueHundredStoreOperationsQueryInput,
  type RevenueBusinessFleetLaunchGateQueryInput,
  type RevenueBusinessFleetLaunchControlQueryInput,
  type RevenueBusinessFleetSwarmReadinessQueryInput,
  type RevenueBusinessFleetLaunchCashCycleQueryInput,
  type RevenueBusinessFleetLaunchCashCycleCommandQueueQueryInput,
  type RevenueBusinessFleetIncomeSprintQueryInput,
  type RevenueBusinessFleetLaunchNightQueryInput,
  type RevenueBusinessFleetLaunchNightExecutionChecklistQueryInput,
  type RevenueBusinessFleetLaunchNightOperatorConsoleQueryInput,
  type RevenueBusinessFleetLaunchNightSupervisorQueryInput,
  type RevenueBusinessFleetLaunchNightSupervisorActionsQueryInput,
  type RevenueBusinessFleetLaunchNightSupervisorRunUntilBlockedPreviewInput,
  type RevenueBusinessFleetLaunchNightCommandQueueQueryInput,
  type RevenueBusinessFleetIncomeSprintCommandQueueQueryInput,
  type RevenueBusinessFleetLaunchOutcomeSignalsQueryInput,
  type RevenueBusinessFleetLaunchExecutionQueueQueryInput,
  type RevenueBusinessFleetLaunchWorkerAssignmentsQueryInput,
  type RevenueBusinessFleetManualLaunchEvidenceQueryInput,
  type RevenueBusinessFleetProviderApprovalReviewQueryInput,
  type RevenueMoneyArmyGenerateScoreBatchQueryInput,
  type RevenueFirstBusinessLaunchPackageQueryInput,
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
import { publicAuditLog, recordAuditLog } from "../services/audit.js";
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
  type PortfolioCommandAction,
  type PortfolioCommandCenterPlan,
  type PortfolioCommandItem,
  type PortfolioCommandRecordSnapshot,
  type PortfolioCommandRecordStatus,
  type PortfolioCommandRiskLevel,
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
  revenueAssetRotationDecisionValues,
  type RevenueAssetControlPlan,
  type RevenueAssetBatchControlPlan,
  type RevenueAssetControlDuplicateSnapshot,
  type RevenueAssetRotationDecision,
  type RevenueAssetPortfolio,
  type RevenueEnginePlan,
  type RevenueEngineProductSnapshot,
  type RevenueEngineStoreSnapshot,
  type RevenueProductStatus,
  type RevenueStoreLaunchStatus
} from "../services/revenueEngine.js";
import {
  buildRevenueMoneyArmyBatchPipelinePlan,
  buildRevenueHundredStoreDailySupervisorPlan,
  buildRevenueHundredStoreOperationsCommandPlan,
  buildRevenueHundredStoreOperationsPlan,
  buildRevenueBusinessFleetLaunchGapPlan,
  buildRevenueBusinessFleetSchedulerPlan,
  selectRevenueBusinessFleetLaunchWave,
  type RevenueBusinessFleetLaunchGapPlan,
  type RevenueBusinessFleetOpportunitySeed,
  type RevenueBusinessFleetPlan,
  type RevenueHundredStoreOperationsPlan,
  type RevenueHundredStoreConnectorActivationRow,
  type RevenueHundredStoreMonitoringItem,
  type RevenueHundredStoreProductDepthDraft,
  type RevenueHundredStoreLaunchPacket,
  type RevenueHundredStoreAutonomyJob,
  type RevenueHundredStoreWorkLease,
  type RevenueHundredStoreWorkerAssignment,
  type RevenueHundredStoreDailySupervisorPlan,
  type RevenueHundredStoreDailySupervisorStep,
  type RevenueHundredStoreOperationsCommand,
  type RevenueHundredStoreOperationsCommandPlan,
  type RevenueMoneyArmyBatchPipelinePlan,
  type RevenueMoneyArmyBatchPipelineStageName
} from "../services/revenueBusinessFleetScheduler.js";
import {
  buildRevenueMoneyArmyGenerateScoreBatchPlan,
  type RevenueMoneyArmyGenerateScoreBatchPlan
} from "../services/revenueMoneyArmyGenerateScoreBatch.js";
import type { RevenueFirstBusinessLaunchPackagePlan } from "../services/revenueFirstBusinessLaunchPackage.js";
import {
  buildRevenueFirstBusinessAutonomousLaunchPlan,
  buildRevenueFirstBusinessExecutionPlan,
  buildRevenueFirstBusinessInternalLaunchPlan,
  buildRevenueFirstBusinessLiveExecutorPlan,
  buildRevenueFirstStorePreparationPlan,
  type RevenueFirstBusinessAutonomousLaunchPlan,
  type RevenueFirstBusinessExecutionPlan,
  type RevenueFirstBusinessInternalLaunchPlan,
  type RevenueFirstBusinessLiveExecutorPlan,
  type RevenueFirstStorePreparationPlan
} from "../services/revenueFirstStorePreparation.js";
import { executeFirstBusinessShopifyAutonomyRun } from "../services/revenueFirstBusinessShopifyBridge.js";
import { getShopifyConnectionCredentials } from "../services/shopifyConnections.js";
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
  isRevenuePortfolioDashboardLaunchEvidenceCategory,
  type RevenuePortfolioDashboardCashLoopEvidenceReceipt,
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
  buildRevenueFirstStoreManualSignalCaptureGate,
  buildRevenueWinnerClonePacketApprovalGate,
  hasRevenueCashLoopEvidenceReceipt
} from "../services/revenueFirstStoreCashLoopApprovalGates.js";
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
  const metadata = parseSecureJson<Record<string, unknown>>(record.metadataJson) ?? {};
  const allocationLane = metadata.allocationLane === "paid_scale_review" ? "paid_scale_review" : "organic_growth";
  const spendPriority = metadata.spendPriority === "scale_test"
    ? "scale_test"
    : metadata.spendPriority === "low_test" ? "low_test" : "no_spend";
  const recommendedChannel = metadata.recommendedChannel === "paid_ads"
    ? "paid_ads"
    : metadata.recommendedChannel === "marketplace_listing" ? "marketplace_listing" : "organic_content";

  return {
    allocationLane,
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
    metadata,
    organicFirst: metadata.organicFirst === false ? false : allocationLane === "organic_growth",
    performanceBasis: parseSecureJson<FinancialScalingBudgetPacketSnapshot["performanceBasis"]>(stringifySecureJson(metadata.performanceBasis)) ?? {
      evidenceGrade: "none",
      killPressureScore: 0,
      scalePressureScore: 0,
      snapshots: 0
    },
    priority: record.priority,
    profitVelocity: decimalToNumber(record.profitVelocity),
    providerContacted: false,
    reason: record.reason,
    recommendedChannel,
    reviewedAt: record.reviewedAt?.toISOString() ?? null,
    reviewedById: record.reviewedById,
    reviewNote: record.reviewNote,
    score: record.score,
    scoreBand: record.scoreBand as FinancialScalingBudgetPacketSnapshot["scoreBand"],
    spendPriority,
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

function hundredStoreSchedulerOptions(input: RevenueHundredStoreOperationsQueryInput): RevenueBusinessFleetSchedulerQueryInput {
  return revenueBusinessFleetSchedulerQuerySchema.parse({
    killPressureThreshold: input.killPressureThreshold,
    launchWaveSize: input.launchWaveSize,
    maxParallelLaunches: input.maxParallelLaunches,
    maxParallelScaleActions: input.maxParallelScaleActions,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    targetBusinesses: input.targetStores
  });
}

async function buildRevenueHundredStoreOperationsForUser(
  userId: string,
  input: RevenueHundredStoreOperationsQueryInput
): Promise<{
  dailySupervisor: RevenueHundredStoreDailySupervisorPlan;
  fleet: RevenueBusinessFleetPlan;
  gapPlan: RevenueBusinessFleetLaunchGapPlan;
  pipeline: RevenueMoneyArmyBatchPipelinePlan;
  plan: RevenueHundredStoreOperationsPlan;
}> {
  const [context, liveConnectorReadiness] = await Promise.all([
    buildRevenueBusinessFleetSchedulerForUser(userId, hundredStoreSchedulerOptions(input)),
    buildLiveConnectorReadinessRegistryForUser(userId, revenueLiveConnectorReadinessQuerySchema.parse({
      includeBlocked: true,
      maxEntries: Math.min(input.targetStores, 100),
      minClosureScore: 1,
      minReadOnlyConnectors: 0,
      requireOperationsPackAudit: false,
      requirePerformanceEvidence: false
    }))
  ]);
  const gapPlan = buildRevenueBusinessFleetLaunchGapPlan({
    plan: context.plan
  });
  const pipeline = buildRevenueMoneyArmyBatchPipelinePlan({
    gapPlan,
    plan: context.plan
  });
  const plan = buildRevenueHundredStoreOperationsPlan({
    gapPlan,
    liveConnectorReadiness: liveConnectorReadiness.plan,
    options: {
      maxStoresPerShard: input.maxStoresPerShard,
      minProductsPerStore: input.minProductsPerStore,
      safeBatchSize: input.safeBatchSize,
      targetStores: input.targetStores
    },
    pipeline,
    plan: context.plan
  });

  return {
    dailySupervisor: buildRevenueHundredStoreDailySupervisorPlan({
      operations: plan
    }),
    fleet: context.plan,
    gapPlan,
    pipeline,
    plan
  };
}

type RevenueHundredStoreOperationsApplyCycle = {
  afterReadinessScore: number;
  afterStoreGap: number;
  batchRunId: string | null;
  beforeReadinessScore: number;
  beforeStoreGap: number;
  command: RevenueHundredStoreOperationsCommand;
  cycle: number;
  resultSummary: string;
  stage: RevenueMoneyArmyBatchPipelineStageName;
};

function selectHundredStoreApplicationConnectionPackets(
  plan: RevenueHundredStoreOperationsPlan,
  input: ApplyRevenueHundredStoreAppConnectionPacketsInput
) {
  const storeIds = new Set(input.storeIds.filter(Boolean));
  const roles = new Set(input.roles);
  const statuses = new Set(input.setupStatuses);

  return plan.applicationConnectionWorkbench.packets
    .filter((packet) => storeIds.size === 0 || (packet.storeId && storeIds.has(packet.storeId)))
    .filter((packet) => roles.size === 0 || roles.has(packet.role))
    .filter((packet) => statuses.has(packet.setupStatus))
    .slice(0, input.maxPackets);
}

async function applyRevenueHundredStoreAppConnectionPackets(userId: string, input: ApplyRevenueHundredStoreAppConnectionPacketsInput) {
  const context = await buildRevenueHundredStoreOperationsForUser(userId, input);
  const packets = selectHundredStoreApplicationConnectionPackets(context.plan, input);
  const roleCounts = packets.reduce<Record<string, number>>((counts, packet) => {
    counts[packet.role] = (counts[packet.role] ?? 0) + 1;
    return counts;
  }, {});
  const storeIds = [...new Set(packets.map((packet) => packet.storeId).filter((storeId): storeId is string => Boolean(storeId)))];
  const readyPackets = packets.filter((packet) => packet.setupStatus === "ready_for_internal_packet").length;
  const alreadyMappedPackets = packets.filter((packet) => packet.setupStatus === "already_mapped").length;
  const blockedPackets = packets.filter((packet) => packet.setupStatus === "blocked_by_store_quality").length;
  const summary = input.dryRun
    ? `${packets.length} application connection packet${packets.length === 1 ? "" : "s"} would be recorded as internal 100-store app readiness artifacts.`
    : `${packets.length} application connection packet${packets.length === 1 ? "" : "s"} recorded as internal 100-store app readiness artifacts.`;

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        dryRun: true,
        externalExecution: false as const,
        packetsRecorded: 0,
        packetsSelected: packets.length,
        providerContacted: false as const,
        roleCounts,
        storesCovered: storeIds.length,
        summary
      },
      packets,
      plan: context.plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.hundred_store_app_connection_packets.recorded",
    actorUserId: userId,
    metadata: {
      blockedPackets,
      externalExecution: false,
      note: input.note ?? null,
      packets: packets.map((packet) => ({
        connectionMode: packet.connectionMode,
        credentialEnvVars: packet.credentialEnvVars,
        providerOptions: packet.providerOptions,
        readOnlyScopes: packet.readOnlyScopes,
        requiredArtifacts: packet.requiredArtifacts,
        role: packet.role,
        setupStatus: packet.setupStatus,
        shardId: packet.shardId,
        storeId: packet.storeId,
        storeName: packet.storeName,
        title: packet.title
      })),
      providerContacted: false,
      readyPackets,
      roleCounts,
      summary,
      workbenchTotals: context.plan.applicationConnectionWorkbench.totals
    },
    outcome: packets.length > 0 ? "success" : "failure",
    severity: blockedPackets > 0 ? "medium" : packets.length > 0 ? "low" : "low",
    targetId: null,
    targetType: "revenue_hundred_store_app_connection_packets"
  });

  return {
    applied: {
      auditLogId: auditLog.id,
      dryRun: false,
      externalExecution: false as const,
      packetsRecorded: packets.length,
      packetsSelected: packets.length,
      providerContacted: false as const,
      roleCounts,
      storesCovered: storeIds.length,
      summary
    },
    packets,
    plan: context.plan
  };
}

function selectHundredStoreConnectorActivationRows(
  plan: RevenueHundredStoreOperationsPlan,
  input: ApplyRevenueHundredStoreConnectorActivationInput
) {
  const storeIds = new Set(input.storeIds.filter(Boolean));
  const roles = new Set(input.roles);
  const statuses = new Set(input.rowStatuses);

  return plan.connectorActivationMatrix.rows
    .filter((row) => storeIds.size === 0 || (row.storeId && storeIds.has(row.storeId)))
    .filter((row) => roles.size === 0 || roles.has(row.role))
    .filter((row) => statuses.size === 0 || statuses.has(row.status))
    .sort((left, right) => (
      right.readinessScore - left.readinessScore
      || left.storeName.localeCompare(right.storeName)
      || left.role.localeCompare(right.role)
    ))
    .slice(0, input.maxRows);
}

function connectorActivationStatusCounts(rows: RevenueHundredStoreConnectorActivationRow[]) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    return counts;
  }, {});
}

function connectorActivationRoleCounts(rows: RevenueHundredStoreConnectorActivationRow[]) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.role] = (counts[row.role] ?? 0) + 1;
    return counts;
  }, {});
}

async function applyRevenueHundredStoreConnectorActivation(userId: string, input: ApplyRevenueHundredStoreConnectorActivationInput) {
  const context = await buildRevenueHundredStoreOperationsForUser(userId, input);
  const rows = selectHundredStoreConnectorActivationRows(context.plan, input);
  const statusCounts = connectorActivationStatusCounts(rows);
  const roleCounts = connectorActivationRoleCounts(rows);
  const storeIds = [...new Set(rows.map((row) => row.storeId).filter((storeId): storeId is string => Boolean(storeId)))];
  const credentialEnvVarRefs = rows.reduce((sum, row) => sum + row.credentialEnvVars.length, 0);
  const dryRunRequestMaps = rows.reduce((sum, row) => sum + row.dryRunRequestMap.length, 0);
  const writeScopesBlocked = rows.reduce((sum, row) => sum + row.writeScopesBlocked.length, 0);
  const summary = input.dryRun
    ? `${rows.length} connector activation row${rows.length === 1 ? "" : "s"} would be recorded with credential custody and external writes locked.`
    : `${rows.length} connector activation row${rows.length === 1 ? "" : "s"} recorded with credential custody and external writes locked.`;

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        credentialEnvVarRefs,
        dryRun: true,
        dryRunRequestMaps,
        externalExecution: false as const,
        providerContacted: false as const,
        roleCounts,
        rowsRecorded: 0,
        rowsSelected: rows.length,
        statusCounts,
        storesCovered: storeIds.length,
        summary,
        writeScopesBlocked
      },
      plan: context.plan,
      rows
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.hundred_store_connector_activation.recorded",
    actorUserId: userId,
    metadata: {
      credentialEnvVarRefs,
      dryRunRequestMaps,
      externalExecution: false,
      matrixTotals: context.plan.connectorActivationMatrix.totals,
      note: input.note ?? null,
      providerContacted: false,
      roleCounts,
      rows: rows.map((row) => ({
        approvalChecklist: row.approvalChecklist,
        credentialCustodyChecklist: row.credentialCustodyChecklist,
        credentialEnvVars: row.credentialEnvVars,
        dryRunRequestMap: row.dryRunRequestMap,
        providerOptions: row.providerOptions,
        readinessScore: row.readinessScore,
        readOnlyScopes: row.readOnlyScopes,
        requiredArtifacts: row.requiredArtifacts,
        role: row.role,
        rowId: row.rowId,
        rollbackPlan: row.rollbackPlan,
        shardId: row.shardId,
        status: row.status,
        storeId: row.storeId,
        storeName: row.storeName,
        title: row.title,
        writeScopesBlocked: row.writeScopesBlocked
      })),
      statusCounts,
      summary,
      writeScopesBlocked
    },
    outcome: rows.length > 0 ? "success" : "failure",
    severity: statusCounts.blocked_by_store_quality ? "medium" : "low",
    targetId: null,
    targetType: "revenue_hundred_store_connector_activation"
  });

  return {
    applied: {
      auditLogId: auditLog.id,
      credentialEnvVarRefs,
      dryRun: false,
      dryRunRequestMaps,
      externalExecution: false as const,
      providerContacted: false as const,
      roleCounts,
      rowsRecorded: rows.length,
      rowsSelected: rows.length,
      statusCounts,
      storesCovered: storeIds.length,
      summary,
      writeScopesBlocked
    },
    plan: context.plan,
    rows
  };
}

function selectHundredStoreMonitoringItems(
  plan: RevenueHundredStoreOperationsPlan,
  input: ApplyRevenueHundredStoreMonitoringCycleInput
) {
  const storeIds = new Set(input.storeIds.filter(Boolean));
  const signalStatuses = new Set(input.signalStatuses);
  const queues = new Set(input.queues);
  const queueItems: RevenueHundredStoreMonitoringItem[] = queues.size === 0 || queues.has("all")
    ? plan.monitoringMatrix.items
    : [
      ...(queues.has("manualSnapshots") ? plan.monitoringMatrix.queues.manualSnapshots : []),
      ...(queues.has("readOnlyImports") ? plan.monitoringMatrix.queues.readOnlyImports : []),
      ...(queues.has("rotationReviews") ? plan.monitoringMatrix.queues.rotationReviews : []),
      ...(queues.has("scaleReviews") ? plan.monitoringMatrix.queues.scaleReviews : [])
    ];
  const deduped = Array.from(new Map(queueItems.map((item) => [`${item.businessId}:${item.signalStatus}`, item])).values());

  return deduped
    .filter((item) => storeIds.size === 0 || storeIds.has(item.businessId))
    .filter((item) => signalStatuses.size === 0 || signalStatuses.has(item.signalStatus))
    .sort((left, right) => (
      right.priority - left.priority
      || right.profitVelocity - left.profitVelocity
      || left.businessName.localeCompare(right.businessName)
    ))
    .slice(0, input.maxItems);
}

function monitoringQueueCounts(items: RevenueHundredStoreMonitoringItem[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const queue = item.signalStatus === "needs_manual_snapshot"
      ? "manualSnapshots"
      : item.signalStatus === "needs_readonly_import"
        ? "readOnlyImports"
        : item.signalStatus === "rotation_review_required"
          ? "rotationReviews"
          : item.signalStatus === "scale_review_required"
            ? "scaleReviews"
            : "signalReady";

    counts[queue] = (counts[queue] ?? 0) + 1;
    return counts;
  }, {});
}

function monitoringSignalStatusCounts(items: RevenueHundredStoreMonitoringItem[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.signalStatus] = (counts[item.signalStatus] ?? 0) + 1;
    return counts;
  }, {});
}

async function applyRevenueHundredStoreMonitoringCycle(userId: string, input: ApplyRevenueHundredStoreMonitoringCycleInput) {
  const context = await buildRevenueHundredStoreOperationsForUser(userId, input);
  const items = selectHundredStoreMonitoringItems(context.plan, input);
  const queueCounts = monitoringQueueCounts(items);
  const signalStatusCounts = monitoringSignalStatusCounts(items);
  const storeIds = [...new Set(items.map((item) => item.businessId))];
  const requiredSignals = [...new Set(items.flatMap((item) => item.requiredSignals))];
  const summary = input.dryRun
    ? `${items.length} monitoring item${items.length === 1 ? "" : "s"} would be recorded for the 100-store monitoring cycle.`
    : `${items.length} monitoring item${items.length === 1 ? "" : "s"} recorded for the 100-store monitoring cycle.`;

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        dryRun: true,
        externalExecution: false as const,
        itemsRecorded: 0,
        itemsSelected: items.length,
        providerContacted: false as const,
        queueCounts,
        requiredSignals: requiredSignals.length,
        signalStatusCounts,
        storesCovered: storeIds.length,
        summary
      },
      items,
      plan: context.plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.hundred_store_monitoring_cycle.recorded",
    actorUserId: userId,
    metadata: {
      externalExecution: false,
      items: items.map((item) => ({
        businessId: item.businessId,
        businessName: item.businessName,
        cadence: item.cadence,
        lane: item.lane,
        nextInternalAction: item.nextInternalAction,
        priority: item.priority,
        profitVelocity: item.profitVelocity,
        requiredSignals: item.requiredSignals,
        scheduleState: item.scheduleState,
        shardId: item.shardId,
        signalStatus: item.signalStatus,
        trackedAssets: item.trackedAssets,
        triggerReason: item.triggerReason
      })),
      matrixTotals: context.plan.monitoringMatrix.totals,
      note: input.note ?? null,
      providerContacted: false,
      queueCounts,
      requiredSignals,
      signalStatusCounts,
      summary
    },
    outcome: items.length > 0 ? "success" : "failure",
    severity: queueCounts.rotationReviews ? "medium" : items.length > 0 ? "low" : "low",
    targetId: null,
    targetType: "revenue_hundred_store_monitoring_cycle"
  });

  return {
    applied: {
      auditLogId: auditLog.id,
      dryRun: false,
      externalExecution: false as const,
      itemsRecorded: items.length,
      itemsSelected: items.length,
      providerContacted: false as const,
      queueCounts,
      requiredSignals: requiredSignals.length,
      signalStatusCounts,
      storesCovered: storeIds.length,
      summary
    },
    items,
    plan: context.plan
  };
}

function selectHundredStoreProductDepthDrafts(
  plan: RevenueHundredStoreOperationsPlan,
  input: ApplyRevenueHundredStoreProductDepthInput
) {
  const storeIds = new Set(input.storeIds.filter(Boolean));
  const statuses = new Set(input.draftStatuses);

  return plan.productDepthQueue.drafts
    .filter((draft) => storeIds.size === 0 || (draft.storeId && storeIds.has(draft.storeId)))
    .filter((draft) => statuses.size === 0 || statuses.has(draft.status))
    .sort((left, right) => (
      right.priority - left.priority
      || left.storeName.localeCompare(right.storeName)
      || left.title.localeCompare(right.title)
    ))
    .slice(0, input.maxDrafts);
}

function productDepthStatusCounts(drafts: RevenueHundredStoreProductDepthDraft[]) {
  return drafts.reduce<Record<string, number>>((counts, draft) => {
    counts[draft.status] = (counts[draft.status] ?? 0) + 1;
    return counts;
  }, {});
}

async function applyRevenueHundredStoreProductDepth(userId: string, input: ApplyRevenueHundredStoreProductDepthInput) {
  const context = await buildRevenueHundredStoreOperationsForUser(userId, input);
  const drafts = selectHundredStoreProductDepthDrafts(context.plan, input);
  const statusCounts = productDepthStatusCounts(drafts);
  const currentStoreDrafts = drafts.filter((draft) => draft.storeId).length;
  const futureStoreDrafts = drafts.length - currentStoreDrafts;
  const storeIds = [...new Set(drafts.map((draft) => draft.storeId).filter((storeId): storeId is string => Boolean(storeId)))];
  const summary = input.dryRun
    ? `${drafts.length} product-depth draft packet${drafts.length === 1 ? "" : "s"} would be recorded for the 100-store queue.`
    : `${drafts.length} product-depth draft packet${drafts.length === 1 ? "" : "s"} recorded for the 100-store queue.`;

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        currentStoreDrafts,
        draftsRecorded: 0,
        draftsSelected: drafts.length,
        dryRun: true,
        externalExecution: false as const,
        futureStoreDrafts,
        providerContacted: false as const,
        statusCounts,
        storesCovered: storeIds.length,
        summary
      },
      drafts,
      plan: context.plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.hundred_store_product_depth.recorded",
    actorUserId: userId,
    metadata: {
      drafts: drafts.map((draft) => ({
        approvalChecklist: draft.approvalChecklist,
        contentTieIn: draft.contentTieIn,
        currentProducts: draft.currentProducts,
        designPrompt: draft.designPrompt,
        draftId: draft.draftId,
        facelessHook: draft.facelessHook,
        lane: draft.lane,
        listingAngle: draft.listingAngle,
        missingProducts: draft.missingProducts,
        organicMove: draft.organicMove,
        priority: draft.priority,
        productType: draft.productType,
        requiredProducts: draft.requiredProducts,
        shardId: draft.shardId,
        status: draft.status,
        storeId: draft.storeId,
        storeName: draft.storeName,
        title: draft.title
      })),
      externalExecution: false,
      note: input.note ?? null,
      productDepthTotals: context.plan.productDepthQueue.totals,
      providerContacted: false,
      statusCounts,
      summary
    },
    outcome: drafts.length > 0 ? "success" : "failure",
    severity: statusCounts.blocked_by_quality ? "medium" : drafts.length > 0 ? "low" : "low",
    targetId: null,
    targetType: "revenue_hundred_store_product_depth"
  });

  return {
    applied: {
      auditLogId: auditLog.id,
      currentStoreDrafts,
      draftsRecorded: drafts.length,
      draftsSelected: drafts.length,
      dryRun: false,
      externalExecution: false as const,
      futureStoreDrafts,
      providerContacted: false as const,
      statusCounts,
      storesCovered: storeIds.length,
      summary
    },
    drafts,
    plan: context.plan
  };
}

function selectHundredStoreLaunchPackets(
  plan: RevenueHundredStoreOperationsPlan,
  input: ApplyRevenueHundredStoreLaunchPacketsInput
) {
  const storeIds = new Set(input.storeIds.filter(Boolean));
  const statuses = new Set(input.packetStatuses);

  return plan.launchPacketQueue.packets
    .filter((packet) => storeIds.size === 0 || (packet.storeId && storeIds.has(packet.storeId)))
    .filter((packet) => statuses.size === 0 || statuses.has(packet.status))
    .sort((left, right) => (
      right.readinessScore - left.readinessScore
      || right.priority - left.priority
      || left.storeName.localeCompare(right.storeName)
    ))
    .slice(0, input.maxPackets);
}

function launchPacketStatusCounts(packets: RevenueHundredStoreLaunchPacket[]) {
  return packets.reduce<Record<string, number>>((counts, packet) => {
    counts[packet.status] = (counts[packet.status] ?? 0) + 1;
    return counts;
  }, {});
}

async function applyRevenueHundredStoreLaunchPackets(userId: string, input: ApplyRevenueHundredStoreLaunchPacketsInput) {
  const context = await buildRevenueHundredStoreOperationsForUser(userId, input);
  const packets = selectHundredStoreLaunchPackets(context.plan, input);
  const statusCounts = launchPacketStatusCounts(packets);
  const currentStorePackets = packets.filter((packet) => packet.storeId).length;
  const futureStorePackets = packets.length - currentStorePackets;
  const storeIds = [...new Set(packets.map((packet) => packet.storeId).filter((storeId): storeId is string => Boolean(storeId)))];
  const summary = input.dryRun
    ? `${packets.length} launch packet${packets.length === 1 ? "" : "s"} would be recorded for 100-store internal launch review.`
    : `${packets.length} launch packet${packets.length === 1 ? "" : "s"} recorded for 100-store internal launch review.`;

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        currentStorePackets,
        dryRun: true,
        externalExecution: false as const,
        futureStorePackets,
        packetsRecorded: 0,
        packetsSelected: packets.length,
        providerContacted: false as const,
        statusCounts,
        storesCovered: storeIds.length,
        summary
      },
      packets,
      plan: context.plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.hundred_store_launch_packets.recorded",
    actorUserId: userId,
    metadata: {
      externalExecution: false,
      launchPacketTotals: context.plan.launchPacketQueue.totals,
      note: input.note ?? null,
      packets: packets.map((packet) => ({
        applicationPacketCount: packet.applicationPacketCount,
        approvalChecklist: packet.approvalChecklist,
        contentIdeas: packet.contentIdeas,
        currentProducts: packet.currentProducts,
        growthLane: packet.growthLane,
        launchPacketId: packet.launchPacketId,
        missingApplicationRoles: packet.missingApplicationRoles,
        organicMoves: packet.organicMoves,
        productDraftCount: packet.productDraftCount,
        readinessScore: packet.readinessScore,
        requiredApplicationRoles: packet.requiredApplicationRoles,
        requiredProducts: packet.requiredProducts,
        shardId: packet.shardId,
        status: packet.status,
        storeId: packet.storeId,
        storeName: packet.storeName,
        summary: packet.summary
      })),
      providerContacted: false,
      statusCounts,
      summary
    },
    outcome: packets.length > 0 ? "success" : "failure",
    severity: statusCounts.blocked_by_quality ? "medium" : packets.length > 0 ? "low" : "low",
    targetId: null,
    targetType: "revenue_hundred_store_launch_packets"
  });

  return {
    applied: {
      auditLogId: auditLog.id,
      currentStorePackets,
      dryRun: false,
      externalExecution: false as const,
      futureStorePackets,
      packetsRecorded: packets.length,
      packetsSelected: packets.length,
      providerContacted: false as const,
      statusCounts,
      storesCovered: storeIds.length,
      summary
    },
    packets,
    plan: context.plan
  };
}

function selectHundredStoreAutonomyJobs(
  plan: RevenueHundredStoreOperationsPlan,
  input: ApplyRevenueHundredStoreAutonomyRunInput
) {
  const storeIds = new Set(input.storeIds.filter(Boolean));
  const statuses = new Set(input.jobStatuses);
  const jobTypes = new Set(input.jobTypes);

  return plan.autonomyRunQueue.jobs
    .filter((job) => storeIds.size === 0 || (job.storeId && storeIds.has(job.storeId)))
    .filter((job) => statuses.size === 0 || statuses.has(job.status))
    .filter((job) => jobTypes.size === 0 || jobTypes.has(job.jobType))
    .sort((left, right) => (
      right.priority - left.priority
      || left.status.localeCompare(right.status)
      || left.storeName.localeCompare(right.storeName)
      || left.jobType.localeCompare(right.jobType)
    ))
    .slice(0, input.maxJobs);
}

function autonomyJobStatusCounts(jobs: RevenueHundredStoreAutonomyJob[]) {
  return jobs.reduce<Record<string, number>>((counts, job) => {
    counts[job.status] = (counts[job.status] ?? 0) + 1;
    return counts;
  }, {});
}

function autonomyJobTypeCounts(jobs: RevenueHundredStoreAutonomyJob[]) {
  return jobs.reduce<Record<string, number>>((counts, job) => {
    counts[job.jobType] = (counts[job.jobType] ?? 0) + 1;
    return counts;
  }, {});
}

async function applyRevenueHundredStoreAutonomyRun(userId: string, input: ApplyRevenueHundredStoreAutonomyRunInput) {
  const context = await buildRevenueHundredStoreOperationsForUser(userId, input);
  const jobs = selectHundredStoreAutonomyJobs(context.plan, input);
  const statusCounts = autonomyJobStatusCounts(jobs);
  const typeCounts = autonomyJobTypeCounts(jobs);
  const storeIds = [...new Set(jobs.map((job) => job.storeId).filter((storeId): storeId is string => Boolean(storeId)))];
  const approvalRequired = jobs.filter((job) => job.requiresOwnerApproval).length;
  const readyInternal = jobs.filter((job) => job.status === "ready_internal").length;
  const summary = input.dryRun
    ? `${jobs.length} autonomy job${jobs.length === 1 ? "" : "s"} would be recorded for the 100-store chain of command.`
    : `${jobs.length} autonomy job${jobs.length === 1 ? "" : "s"} recorded for the 100-store chain of command.`;

  if (input.dryRun) {
    return {
      applied: {
        approvalRequired,
        auditLogId: null,
        dryRun: true,
        externalExecution: false as const,
        jobsRecorded: 0,
        jobsSelected: jobs.length,
        providerContacted: false as const,
        readyInternal,
        statusCounts,
        storesCovered: storeIds.length,
        summary,
        typeCounts
      },
      jobs,
      plan: context.plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.hundred_store_autonomy_run.recorded",
    actorUserId: userId,
    metadata: {
      autonomyTotals: context.plan.autonomyRunQueue.totals,
      externalExecution: false,
      jobs: jobs.map((job) => ({
        approvalGate: job.approvalGate,
        blockedExternalActions: job.blockedExternalActions,
        expectedInternalEffect: job.expectedInternalEffect,
        jobId: job.jobId,
        jobType: job.jobType,
        priority: job.priority,
        requiresOwnerApproval: job.requiresOwnerApproval,
        shardId: job.shardId,
        sourceId: job.sourceId,
        sourceModule: job.sourceModule,
        status: job.status,
        storeId: job.storeId,
        storeName: job.storeName,
        summary: job.summary
      })),
      note: input.note ?? null,
      providerContacted: false,
      statusCounts,
      summary,
      typeCounts
    },
    outcome: jobs.length > 0 ? "success" : "failure",
    severity: statusCounts.blocked ? "medium" : approvalRequired > 0 ? "low" : "low",
    targetId: null,
    targetType: "revenue_hundred_store_autonomy_run"
  });

  return {
    applied: {
      approvalRequired,
      auditLogId: auditLog.id,
      dryRun: false,
      externalExecution: false as const,
      jobsRecorded: jobs.length,
      jobsSelected: jobs.length,
      providerContacted: false as const,
      readyInternal,
      statusCounts,
      storesCovered: storeIds.length,
      summary,
      typeCounts
    },
    jobs,
    plan: context.plan
  };
}

function selectHundredStoreWorkLeases(
  plan: RevenueHundredStoreOperationsPlan,
  input: ApplyRevenueHundredStoreWorkLeasesInput
) {
  const storeIds = new Set(input.storeIds.filter(Boolean));
  const statuses = new Set(input.leaseStatuses);
  const jobTypes = new Set(input.jobTypes);

  return plan.workLeasePlan.leases
    .filter((lease) => storeIds.size === 0 || (lease.storeId && storeIds.has(lease.storeId)))
    .filter((lease) => statuses.size === 0 || statuses.has(lease.status))
    .filter((lease) => jobTypes.size === 0 || jobTypes.has(lease.jobType))
    .sort((left, right) => (
      right.priority - left.priority
      || left.status.localeCompare(right.status)
      || left.storeName.localeCompare(right.storeName)
      || left.jobType.localeCompare(right.jobType)
    ))
    .slice(0, input.maxLeases);
}

function workLeaseStatusCounts(leases: RevenueHundredStoreWorkLease[]) {
  return leases.reduce<Record<string, number>>((counts, lease) => {
    counts[lease.status] = (counts[lease.status] ?? 0) + 1;
    return counts;
  }, {});
}

function workLeaseJobTypeCounts(leases: RevenueHundredStoreWorkLease[]) {
  return leases.reduce<Record<string, number>>((counts, lease) => {
    counts[lease.jobType] = (counts[lease.jobType] ?? 0) + 1;
    return counts;
  }, {});
}

async function applyRevenueHundredStoreWorkLeases(userId: string, input: ApplyRevenueHundredStoreWorkLeasesInput) {
  const context = await buildRevenueHundredStoreOperationsForUser(userId, input);
  const leases = selectHundredStoreWorkLeases(context.plan, input);
  const statusCounts = workLeaseStatusCounts(leases);
  const typeCounts = workLeaseJobTypeCounts(leases);
  const storeIds = [...new Set(leases.map((lease) => lease.storeId).filter((storeId): storeId is string => Boolean(storeId)))];
  const dedupeKeys = new Set(leases.map((lease) => lease.dedupeKey));
  const readyToClaim = leases.filter((lease) => lease.status === "ready_to_claim").length;
  const approvalHold = leases.filter((lease) => lease.status === "approval_hold").length;
  const summary = input.dryRun
    ? `${leases.length} internal work lease${leases.length === 1 ? "" : "s"} would be recorded for clean 100-store work claiming.`
    : `${leases.length} internal work lease${leases.length === 1 ? "" : "s"} recorded for clean 100-store work claiming.`;

  if (input.dryRun) {
    return {
      applied: {
        approvalHold,
        auditLogId: null,
        dedupeKeys: dedupeKeys.size,
        dryRun: true,
        externalExecution: false as const,
        leasesRecorded: 0,
        leasesSelected: leases.length,
        providerContacted: false as const,
        readyToClaim,
        statusCounts,
        storesCovered: storeIds.length,
        summary,
        typeCounts
      },
      leases,
      plan: context.plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.hundred_store_work_leases.recorded",
    actorUserId: userId,
    metadata: {
      dedupeKeys: [...dedupeKeys],
      externalExecution: false,
      leases: leases.map((lease) => ({
        approvalGate: lease.approvalGate,
        claimWindowMinutes: lease.claimWindowMinutes,
        dedupeKey: lease.dedupeKey,
        dependencyRefs: lease.dependencyRefs,
        expectedInternalEffect: lease.expectedInternalEffect,
        expiresAt: lease.expiresAt,
        idempotencyKey: lease.idempotencyKey,
        jobId: lease.jobId,
        jobType: lease.jobType,
        leaseId: lease.leaseId,
        priority: lease.priority,
        retryPolicy: lease.retryPolicy,
        shardId: lease.shardId,
        sourceModule: lease.sourceModule,
        status: lease.status,
        storeId: lease.storeId,
        storeName: lease.storeName,
        summary: lease.summary
      })),
      leaseTotals: context.plan.workLeasePlan.totals,
      note: input.note ?? null,
      providerContacted: false,
      statusCounts,
      summary,
      typeCounts
    },
    outcome: leases.length > 0 ? "success" : "failure",
    severity: statusCounts.blocked ? "medium" : "low",
    targetId: null,
    targetType: "revenue_hundred_store_work_leases"
  });

  return {
    applied: {
      approvalHold,
      auditLogId: auditLog.id,
      dedupeKeys: dedupeKeys.size,
      dryRun: false,
      externalExecution: false as const,
      leasesRecorded: leases.length,
      leasesSelected: leases.length,
      providerContacted: false as const,
      readyToClaim,
      statusCounts,
      storesCovered: storeIds.length,
      summary,
      typeCounts
    },
    leases,
    plan: context.plan
  };
}

function selectHundredStoreWorkerAssignments(
  plan: RevenueHundredStoreOperationsPlan,
  input: ApplyRevenueHundredStoreWorkerAssignmentsInput
) {
  const storeIds = new Set(input.storeIds.filter(Boolean));
  const statuses = new Set(input.assignmentStatuses);
  const jobTypes = new Set(input.jobTypes);
  const workerLanes = new Set(input.workerLanes);

  return plan.workerAssignmentPlan.assignments
    .filter((assignment) => storeIds.size === 0 || (assignment.storeId && storeIds.has(assignment.storeId)))
    .filter((assignment) => statuses.size === 0 || statuses.has(assignment.status))
    .filter((assignment) => jobTypes.size === 0 || jobTypes.has(assignment.jobType))
    .filter((assignment) => workerLanes.size === 0 || workerLanes.has(assignment.lane))
    .sort((left, right) => (
      (left.claimOrder || Number.MAX_SAFE_INTEGER) - (right.claimOrder || Number.MAX_SAFE_INTEGER)
      || right.priority - left.priority
      || left.status.localeCompare(right.status)
      || left.workerName.localeCompare(right.workerName)
      || left.storeName.localeCompare(right.storeName)
    ))
    .slice(0, input.maxAssignments);
}

function workerAssignmentStatusCounts(assignments: RevenueHundredStoreWorkerAssignment[]) {
  return assignments.reduce<Record<string, number>>((counts, assignment) => {
    counts[assignment.status] = (counts[assignment.status] ?? 0) + 1;
    return counts;
  }, {});
}

function workerAssignmentLaneCounts(assignments: RevenueHundredStoreWorkerAssignment[]) {
  return assignments.reduce<Record<string, number>>((counts, assignment) => {
    counts[assignment.lane] = (counts[assignment.lane] ?? 0) + 1;
    return counts;
  }, {});
}

function workerAssignmentJobTypeCounts(assignments: RevenueHundredStoreWorkerAssignment[]) {
  return assignments.reduce<Record<string, number>>((counts, assignment) => {
    counts[assignment.jobType] = (counts[assignment.jobType] ?? 0) + 1;
    return counts;
  }, {});
}

async function applyRevenueHundredStoreWorkerAssignments(userId: string, input: ApplyRevenueHundredStoreWorkerAssignmentsInput) {
  const context = await buildRevenueHundredStoreOperationsForUser(userId, input);
  const assignments = selectHundredStoreWorkerAssignments(context.plan, input);
  const statusCounts = workerAssignmentStatusCounts(assignments);
  const laneCounts = workerAssignmentLaneCounts(assignments);
  const typeCounts = workerAssignmentJobTypeCounts(assignments);
  const storeIds = [...new Set(assignments.map((assignment) => assignment.storeId).filter((storeId): storeId is string => Boolean(storeId)))];
  const workerIds = new Set(assignments.map((assignment) => assignment.workerId));
  const readyToAssign = assignments.filter((assignment) => assignment.status === "ready_to_assign").length;
  const approvalHold = assignments.filter((assignment) => assignment.status === "approval_hold").length;
  const summary = input.dryRun
    ? `${assignments.length} internal worker assignment${assignments.length === 1 ? "" : "s"} would be recorded for capped chain-of-command claiming.`
    : `${assignments.length} internal worker assignment${assignments.length === 1 ? "" : "s"} recorded for capped chain-of-command claiming.`;

  if (input.dryRun) {
    return {
      applied: {
        approvalHold,
        assignmentsRecorded: 0,
        assignmentsSelected: assignments.length,
        auditLogId: null,
        dryRun: true,
        externalExecution: false as const,
        laneCounts,
        providerContacted: false as const,
        readyToAssign,
        statusCounts,
        storesCovered: storeIds.length,
        summary,
        typeCounts,
        workersCovered: workerIds.size
      },
      assignments,
      plan: context.plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.hundred_store_worker_assignments.recorded",
    actorUserId: userId,
    metadata: {
      assignmentTotals: context.plan.workerAssignmentPlan.totals,
      assignments: assignments.map((assignment) => ({
        approvalGate: assignment.approvalGate,
        assignmentId: assignment.assignmentId,
        claimOrder: assignment.claimOrder,
        dedupeKey: assignment.dedupeKey,
        dependencyRefs: assignment.dependencyRefs,
        expectedInternalEffect: assignment.expectedInternalEffect,
        idempotencyKey: assignment.idempotencyKey,
        jobType: assignment.jobType,
        lane: assignment.lane,
        leaseExpiresAt: assignment.leaseExpiresAt,
        leaseId: assignment.leaseId,
        priority: assignment.priority,
        shardId: assignment.shardId,
        status: assignment.status,
        storeId: assignment.storeId,
        storeName: assignment.storeName,
        summary: assignment.summary,
        workerId: assignment.workerId,
        workerName: assignment.workerName
      })),
      externalExecution: false,
      laneCounts,
      note: input.note ?? null,
      providerContacted: false,
      statusCounts,
      summary,
      typeCounts,
      workerIds: [...workerIds]
    },
    outcome: assignments.length > 0 ? "success" : "failure",
    severity: statusCounts.blocked ? "medium" : "low",
    targetId: null,
    targetType: "revenue_hundred_store_worker_assignments"
  });

  return {
    applied: {
      approvalHold,
      assignmentsRecorded: assignments.length,
      assignmentsSelected: assignments.length,
      auditLogId: auditLog.id,
      dryRun: false,
      externalExecution: false as const,
      laneCounts,
      providerContacted: false as const,
      readyToAssign,
      statusCounts,
      storesCovered: storeIds.length,
      summary,
      typeCounts,
      workersCovered: workerIds.size
    },
    assignments,
    plan: context.plan
  };
}

type RevenueHundredStoreDailySupervisorResult = {
  action: RevenueHundredStoreDailySupervisorStep["action"];
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
  workerAssignmentsRecorded?: number;
  workerAssignmentsSelected?: number;
  providerContacted: false;
  stepId: string;
  summary: string;
  title: string;
};

async function applyRevenueHundredStoreDailySupervisor(userId: string, input: ApplyRevenueHundredStoreDailySupervisorInput) {
  const before = await buildRevenueHundredStoreOperationsForUser(userId, input);
  const beforeSupervisor = buildRevenueHundredStoreDailySupervisorPlan({
    maxSteps: input.maxSteps,
    mode: input.mode,
    operations: before.plan
  });
  const results: RevenueHundredStoreDailySupervisorResult[] = [];

  for (const step of beforeSupervisor.selectedSteps) {
    if (step.action === "confirm_safety") {
      results.push({
        action: step.action,
        auditLogId: null,
        dryRun: input.dryRun,
        externalExecution: false,
        providerContacted: false,
        stepId: step.stepId,
        summary: input.dryRun
          ? "Supervisor would confirm the 100-store safety envelope before internal work."
          : "Supervisor confirmed the 100-store safety envelope inside the audit cycle.",
        title: step.title
      });
      continue;
    }

    if (step.action === "review_growth_allocation") {
      results.push({
        action: step.action,
        auditLogId: null,
        dryRun: input.dryRun,
        externalExecution: false,
        providerContacted: false,
        stepId: step.stepId,
        summary: input.dryRun
          ? "Supervisor would include advisory Ad/Growth routing in the cycle summary without authorizing spend."
          : "Supervisor included advisory Ad/Growth routing in the cycle summary without authorizing spend.",
        title: step.title
      });
      continue;
    }

    if (step.action === "record_app_connection_packets") {
      const packetResult = await applyRevenueHundredStoreAppConnectionPackets(userId, applyRevenueHundredStoreAppConnectionPacketsSchema.parse({
        ...input,
        confirm: "RECORD INTERNAL 100 STORE APP CONNECTION PACKETS",
        maxPackets: step.maxItems,
        note: input.note ?? "100 Store Daily Supervisor selected app connection packet recording.",
        setupStatuses: ["ready_for_internal_packet"]
      }));

      results.push({
        action: step.action,
        auditLogId: packetResult.applied.auditLogId,
        dryRun: input.dryRun,
        externalExecution: false,
        packetsRecorded: packetResult.applied.packetsRecorded,
        packetsSelected: packetResult.applied.packetsSelected,
        providerContacted: false,
        stepId: step.stepId,
        summary: packetResult.applied.summary,
        title: step.title
      });
      continue;
    }

    if (step.action === "record_connector_activation_matrix") {
      const connectorActivationResult = await applyRevenueHundredStoreConnectorActivation(userId, applyRevenueHundredStoreConnectorActivationSchema.parse({
        ...input,
        confirm: "RECORD INTERNAL 100 STORE CONNECTOR ACTIVATION MATRIX",
        maxRows: step.maxItems,
        note: input.note ?? "100 Store Daily Supervisor selected connector activation matrix recording.",
        rowStatuses: ["ready_for_connection_design", "credential_custody_required"]
      }));

      results.push({
        action: step.action,
        auditLogId: connectorActivationResult.applied.auditLogId,
        connectorRowsRecorded: connectorActivationResult.applied.rowsRecorded,
        connectorRowsSelected: connectorActivationResult.applied.rowsSelected,
        dryRun: input.dryRun,
        externalExecution: false,
        providerContacted: false,
        stepId: step.stepId,
        summary: connectorActivationResult.applied.summary,
        title: step.title
      });
      continue;
    }

    if (step.action === "record_monitoring_cycle") {
      const monitoringResult = await applyRevenueHundredStoreMonitoringCycle(userId, applyRevenueHundredStoreMonitoringCycleSchema.parse({
        ...input,
        confirm: "RECORD INTERNAL 100 STORE MONITORING CYCLE",
        maxItems: step.maxItems,
        note: input.note ?? "100 Store Daily Supervisor selected monitoring cycle recording.",
        queues: ["all"]
      }));

      results.push({
        action: step.action,
        auditLogId: monitoringResult.applied.auditLogId,
        dryRun: input.dryRun,
        externalExecution: false,
        itemsRecorded: monitoringResult.applied.itemsRecorded,
        itemsSelected: monitoringResult.applied.itemsSelected,
        providerContacted: false,
        stepId: step.stepId,
        summary: monitoringResult.applied.summary,
        title: step.title
      });
      continue;
    }

    if (step.action === "record_product_depth_drafts") {
      const productDepthResult = await applyRevenueHundredStoreProductDepth(userId, applyRevenueHundredStoreProductDepthSchema.parse({
        ...input,
        confirm: "RECORD INTERNAL 100 STORE PRODUCT DEPTH DRAFTS",
        draftStatuses: ["ready_for_internal_draft", "waiting_for_store_shell"],
        maxDrafts: step.maxItems,
        note: input.note ?? "100 Store Daily Supervisor selected product-depth draft recording."
      }));

      results.push({
        action: step.action,
        auditLogId: productDepthResult.applied.auditLogId,
        dryRun: input.dryRun,
        externalExecution: false,
        productDraftsRecorded: productDepthResult.applied.draftsRecorded,
        productDraftsSelected: productDepthResult.applied.draftsSelected,
        providerContacted: false,
        stepId: step.stepId,
        summary: productDepthResult.applied.summary,
        title: step.title
      });
      continue;
    }

    if (step.action === "record_launch_packets") {
      const launchPacketResult = await applyRevenueHundredStoreLaunchPackets(userId, applyRevenueHundredStoreLaunchPacketsSchema.parse({
        ...input,
        confirm: "RECORD INTERNAL 100 STORE LAUNCH PACKETS",
        maxPackets: step.maxItems,
        note: input.note ?? "100 Store Daily Supervisor selected launch packet recording.",
        packetStatuses: ["ready_for_internal_launch_review", "waiting_for_store_shell"]
      }));

      results.push({
        action: step.action,
        auditLogId: launchPacketResult.applied.auditLogId,
        dryRun: input.dryRun,
        externalExecution: false,
        launchPacketsRecorded: launchPacketResult.applied.packetsRecorded,
        launchPacketsSelected: launchPacketResult.applied.packetsSelected,
        providerContacted: false,
        stepId: step.stepId,
        summary: launchPacketResult.applied.summary,
        title: step.title
      });
      continue;
    }

    if (step.action === "record_autonomy_run_queue") {
      const autonomyRunResult = await applyRevenueHundredStoreAutonomyRun(userId, applyRevenueHundredStoreAutonomyRunSchema.parse({
        ...input,
        confirm: "RECORD INTERNAL 100 STORE AUTONOMY RUN",
        jobStatuses: ["ready_internal", "approval_required"],
        maxJobs: step.maxItems,
        note: input.note ?? "100 Store Daily Supervisor selected autonomy run queue recording."
      }));

      results.push({
        action: step.action,
        auditLogId: autonomyRunResult.applied.auditLogId,
        autonomyJobsRecorded: autonomyRunResult.applied.jobsRecorded,
        autonomyJobsSelected: autonomyRunResult.applied.jobsSelected,
        dryRun: input.dryRun,
        externalExecution: false,
        providerContacted: false,
        stepId: step.stepId,
        summary: autonomyRunResult.applied.summary,
        title: step.title
      });
      continue;
    }

    if (step.action === "record_work_leases") {
      const workLeaseResult = await applyRevenueHundredStoreWorkLeases(userId, applyRevenueHundredStoreWorkLeasesSchema.parse({
        ...input,
        confirm: "RECORD INTERNAL 100 STORE WORK LEASES",
        leaseStatuses: ["ready_to_claim", "approval_hold"],
        maxLeases: step.maxItems,
        note: input.note ?? "100 Store Daily Supervisor selected internal work lease recording."
      }));

      results.push({
        action: step.action,
        auditLogId: workLeaseResult.applied.auditLogId,
        dryRun: input.dryRun,
        externalExecution: false,
        providerContacted: false,
        stepId: step.stepId,
        summary: workLeaseResult.applied.summary,
        title: step.title,
        workLeasesRecorded: workLeaseResult.applied.leasesRecorded,
        workLeasesSelected: workLeaseResult.applied.leasesSelected
      });
      continue;
    }

    if (step.action === "record_worker_assignments") {
      const assignmentResult = await applyRevenueHundredStoreWorkerAssignments(userId, applyRevenueHundredStoreWorkerAssignmentsSchema.parse({
        ...input,
        assignmentStatuses: ["ready_to_assign", "approval_hold"],
        confirm: "RECORD INTERNAL 100 STORE WORKER ASSIGNMENTS",
        maxAssignments: step.maxItems,
        note: input.note ?? "100 Store Daily Supervisor selected chain-of-command worker assignment recording."
      }));

      results.push({
        action: step.action,
        auditLogId: assignmentResult.applied.auditLogId,
        dryRun: input.dryRun,
        externalExecution: false,
        providerContacted: false,
        stepId: step.stepId,
        summary: assignmentResult.applied.summary,
        title: step.title,
        workerAssignmentsRecorded: assignmentResult.applied.assignmentsRecorded,
        workerAssignmentsSelected: assignmentResult.applied.assignmentsSelected
      });
      continue;
    }

    if (step.action === "run_money_army_step") {
      const operationsResult = await applyRevenueHundredStoreOperations(userId, applyRevenueHundredStoreOperationsSchema.parse({
        ...input,
        confirm: "RUN INTERNAL 100 STORE OPERATIONS STEP",
        maxCycles: 1,
        note: input.note ?? `100 Store Daily Supervisor selected ${step.title}.`,
        podProvider: input.podProvider
      }));

      results.push({
        action: step.action,
        auditLogId: operationsResult.applied.auditLogId,
        dryRun: input.dryRun,
        externalExecution: false,
        operationCyclesRun: operationsResult.applied.cyclesRun,
        providerContacted: false,
        stepId: step.stepId,
        summary: operationsResult.applied.summary,
        title: step.title
      });
    }
  }

  const after = input.dryRun ? before : await buildRevenueHundredStoreOperationsForUser(userId, input);
  const afterSupervisor = buildRevenueHundredStoreDailySupervisorPlan({
    maxSteps: input.maxSteps,
    mode: input.mode,
    operations: after.plan
  });
  const summary = results.length === 0
    ? "100-store daily supervisor found no selected private internal steps; review waiting, manual-only, or blocked steps."
    : input.dryRun
      ? `100-store daily supervisor preview selected ${results.length} private internal step${results.length === 1 ? "" : "s"}.`
      : `100-store daily supervisor recorded ${results.length} private internal step${results.length === 1 ? "" : "s"} under one audit cycle.`;
  const auditLog = input.dryRun ? null : await recordAuditLog({
    action: "revenue.hundred_store_daily_supervisor.recorded",
    actorUserId: userId,
    metadata: {
      afterSupervisor,
      beforeSupervisor,
      dryRun: false,
      externalExecution: false,
      mode: input.mode,
      note: input.note ?? null,
      providerContacted: false,
      results,
      summary
    },
    outcome: results.length > 0 ? "success" : "failure",
    severity: beforeSupervisor.totals.blocked > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_hundred_store_daily_supervisor"
  });

  return {
    after,
    afterSupervisor,
    applied: {
      appPacketsRecorded: results.reduce((sum, result) => sum + (result.packetsRecorded ?? 0), 0),
      auditLogId: auditLog?.id ?? null,
      autonomyJobsRecorded: results.reduce((sum, result) => sum + (result.autonomyJobsRecorded ?? 0), 0),
      connectorRowsRecorded: results.reduce((sum, result) => sum + (result.connectorRowsRecorded ?? 0), 0),
      dryRun: input.dryRun,
      externalExecution: false as const,
      monitoringItemsRecorded: results.reduce((sum, result) => sum + (result.itemsRecorded ?? 0), 0),
      operationCyclesRun: results.reduce((sum, result) => sum + (result.operationCyclesRun ?? 0), 0),
      productDraftsRecorded: results.reduce((sum, result) => sum + (result.productDraftsRecorded ?? 0), 0),
      launchPacketsRecorded: results.reduce((sum, result) => sum + (result.launchPacketsRecorded ?? 0), 0),
      providerContacted: false as const,
      stepsRecorded: input.dryRun ? 0 : results.length,
      stepsSelected: results.length,
      summary,
      workLeasesRecorded: results.reduce((sum, result) => sum + (result.workLeasesRecorded ?? 0), 0),
      workerAssignmentsRecorded: results.reduce((sum, result) => sum + (result.workerAssignmentsRecorded ?? 0), 0)
    },
    before,
    beforeSupervisor,
    results
  };
}

function moneyArmyInputForHundredStoreCommand(
  input: ApplyRevenueHundredStoreOperationsInput,
  command: RevenueHundredStoreOperationsCommand
): ApplyRevenueMoneyArmyBatchPipelineInput {
  const maxItems = Math.max(command.maxItems, 1);

  return applyRevenueMoneyArmyBatchPipelineSchema.parse({
    action: "approve",
    confirm: "RUN INTERNAL MONEY ARMY BATCH PIPELINE",
    dryRun: input.dryRun,
    killPressureThreshold: input.killPressureThreshold,
    launchWaveSize: input.launchWaveSize,
    maxPackets: Math.min(50, maxItems),
    maxParallelLaunches: input.maxParallelLaunches,
    maxParallelScaleActions: input.maxParallelScaleActions,
    maxSeeds: Math.min(25, maxItems),
    maxStores: Math.min(25, maxItems),
    note: input.note ?? `100 Store Operations selected ${command.sourceActionTitle}.`,
    podProvider: input.podProvider,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    sourceKeys: [],
    stage: command.stage ?? undefined,
    targetBusinesses: input.targetStores
  });
}

async function applyRevenueHundredStoreOperations(userId: string, input: ApplyRevenueHundredStoreOperationsInput) {
  const before = await buildRevenueHundredStoreOperationsForUser(userId, input);
  const beforeCommandPlan = buildRevenueHundredStoreOperationsCommandPlan({
    operations: before.plan
  });
  let current = before;
  const cycles: RevenueHundredStoreOperationsApplyCycle[] = [];

  for (let cycleIndex = 0; cycleIndex < input.maxCycles; cycleIndex += 1) {
    const commandPlan = buildRevenueHundredStoreOperationsCommandPlan({
      operations: current.plan
    });
    const command = commandPlan.selectedCommand;

    if (!command?.stage) break;

    const result = await applyRevenueMoneyArmyBatchPipeline(
      userId,
      moneyArmyInputForHundredStoreCommand(input, command)
    );
    const afterCycle = input.dryRun
      ? current
      : await buildRevenueHundredStoreOperationsForUser(userId, input);

    cycles.push({
      afterReadinessScore: afterCycle.plan.readinessScore,
      afterStoreGap: afterCycle.plan.batchPlan.storeGap,
      batchRunId: result.applied.batchRunId,
      beforeReadinessScore: current.plan.readinessScore,
      beforeStoreGap: current.plan.batchPlan.storeGap,
      command,
      cycle: cycleIndex + 1,
      resultSummary: result.applied.summary,
      stage: command.stage
    });

    current = afterCycle;

    if (input.dryRun || command.stage !== "batch_creation" || current.plan.batchPlan.storeGap <= 0) {
      break;
    }
  }

  const afterCommandPlan = buildRevenueHundredStoreOperationsCommandPlan({
    operations: current.plan
  });
  const appliedSummary = cycles.length === 0
    ? "100-store operations found no executable internal command; review the command queue for waiting or manual-review steps."
    : input.dryRun
      ? `100-store operations preview selected ${cycles[0]?.command.sourceActionTitle ?? "the next command"} for up to ${cycles[0]?.command.maxItems ?? 0} internal item${(cycles[0]?.command.maxItems ?? 0) === 1 ? "" : "s"}.`
      : `100-store operations recorded ${cycles.length} internal cycle${cycles.length === 1 ? "" : "s"}; store gap moved from ${before.plan.batchPlan.storeGap} to ${current.plan.batchPlan.storeGap}.`;
  const auditLog = input.dryRun ? null : await recordAuditLog({
    action: "revenue.hundred_store_operations.step_applied",
    actorUserId: userId,
    metadata: {
      afterCommandPlan,
      afterPlan: current.plan,
      beforeCommandPlan,
      beforePlan: before.plan,
      cycles,
      dryRun: false,
      externalExecution: false,
      maxCycles: input.maxCycles,
      note: input.note ?? null,
      providerContacted: false,
      summary: appliedSummary
    },
    outcome: cycles.length > 0 ? "success" : "failure",
    severity: cycles.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_hundred_store_operations"
  });
  const recentRuns = await listRevenueMoneyArmyBatchRuns(userId);

  return {
    after: current,
    afterCommandPlan,
    applied: {
      auditLogId: auditLog?.id ?? null,
      batchRunIds: cycles.map((cycle) => cycle.batchRunId).filter((id): id is string => Boolean(id)),
      cyclesRequested: input.maxCycles,
      cyclesRun: cycles.length,
      dryRun: input.dryRun,
      externalExecution: false as const,
      providerContacted: false as const,
      selectedCommandId: cycles[0]?.command.commandId ?? beforeCommandPlan.selectedCommand?.commandId ?? null,
      selectedStage: cycles[0]?.stage ?? beforeCommandPlan.selectedCommand?.stage ?? null,
      summary: appliedSummary
    },
    before,
    beforeCommandPlan,
    cycles,
    recentRuns
  };
}

async function buildRevenueMoneyArmyGenerateScoreBatchForUser(
  userId: string,
  input: RevenueMoneyArmyGenerateScoreBatchQueryInput | ApplyRevenueMoneyArmyGenerateScoreBatchInput
): Promise<{ plan: RevenueMoneyArmyGenerateScoreBatchPlan }> {
  const [stores, currentPortfolio] = await Promise.all([
    loadPortfolioForUser(userId),
    buildAssetPortfolioForUser(userId, revenueEngineQuerySchema.parse(input))
  ]);
  const storeSnapshots = stores.map((store) => storeSnapshot(store));
  const productSnapshots = stores.flatMap((store) => store.products.map(productSnapshot));

  return {
    plan: buildRevenueMoneyArmyGenerateScoreBatchPlan({
      currentPortfolio,
      options: input,
      products: productSnapshots,
      stores: storeSnapshots
    })
  };
}

async function buildRevenueFirstBusinessLaunchPackageForUser(
  userId: string,
  input: RevenueFirstBusinessLaunchPackageQueryInput | ApplyRevenueFirstBusinessLaunchPackageInput
): Promise<{
  package: RevenueFirstBusinessLaunchPackagePlan | null;
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan;
}> {
  const { plan } = await buildRevenueMoneyArmyGenerateScoreBatchForUser(userId, input);

  return {
    package: plan.firstBusinessLaunchPackage,
    sourceBatch: plan
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

function moneyArmyGenerateScoreBatchTotals(plan: RevenueMoneyArmyGenerateScoreBatchPlan): RevenueMoneyArmyBatchPipelinePlan["totals"] {
  return {
    approvablePackets: 0,
    approvedPackets: 0,
    blockedStages: plan.totals.pause + plan.totals.kill,
    currentBusinesses: plan.totals.sourceStores,
    launchWaveGap: Math.max(0, plan.totals.requested - plan.totals.generated),
    pendingApprovalPackets: plan.totals.generated,
    readyDeploymentBusinesses: plan.totals.scale,
    readyStages: plan.totals.scale + plan.totals.watch,
    repairRequired: plan.totals.pause + plan.totals.kill,
    seedCandidates: plan.totals.generated,
    selectedSourceKeys: plan.totals.sourceStores,
    stages: 1,
    targetBusinesses: plan.totals.requested,
    targetLaunchWave: plan.totals.requested
  };
}

function moneyArmyGenerateScoreBatchKey(input: {
  plan: RevenueMoneyArmyGenerateScoreBatchPlan;
  sourceKeys: string[];
  userId: string;
}) {
  return createHash("sha256").update(JSON.stringify({
    candidateIds: input.plan.candidates.map((candidate) => candidate.candidateId),
    generatedAt: input.plan.generatedAt,
    sourceKeys: [...input.sourceKeys].sort(),
    stage: "generate_score_batch",
    totals: input.plan.totals,
    userId: input.userId
})).digest("hex");
}

function firstBusinessLaunchPackageTotals(
  launchPackage: RevenueFirstBusinessLaunchPackagePlan | null,
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan
): RevenueMoneyArmyBatchPipelinePlan["totals"] {
  const base = moneyArmyGenerateScoreBatchTotals(sourceBatch);
  const packagePackets = launchPackage
    ? launchPackage.totals.products
      + launchPackage.totals.contentIdeas
      + launchPackage.totals.organicMoves
      + launchPackage.totals.manualApprovalGates
    : 0;

  return {
    ...base,
    blockedStages: launchPackage?.status === "blocked" ? 1 : 0,
    launchWaveGap: launchPackage ? 0 : 1,
    pendingApprovalPackets: packagePackets,
    readyDeploymentBusinesses: launchPackage?.totals.readyToApproveProducts ?? 0,
    readyStages: launchPackage && launchPackage.status !== "blocked" ? 1 : 0,
    repairRequired: launchPackage?.status === "manual_gate" ? 1 : 0,
    selectedSourceKeys: launchPackage ? 1 : 0,
    stages: 1,
    targetBusinesses: 1,
    targetLaunchWave: 1
  };
}

function firstBusinessLaunchPackageKey(input: {
  launchPackage: RevenueFirstBusinessLaunchPackagePlan | null;
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan;
  userId: string;
}) {
  return createHash("sha256").update(JSON.stringify({
    generatedAt: input.sourceBatch.generatedAt,
    packageId: input.launchPackage?.packageId ?? null,
    sourceStoreId: input.launchPackage?.store.sourceStoreId ?? null,
    stage: "first_business_launch_package",
    totals: input.launchPackage?.totals ?? null,
    userId: input.userId
  })).digest("hex");
}

function firstStorePreparationTotals(
  preparation: RevenueFirstStorePreparationPlan | null,
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan
): RevenueMoneyArmyBatchPipelinePlan["totals"] {
  const base = moneyArmyGenerateScoreBatchTotals(sourceBatch);

  return {
    ...base,
    blockedStages: preparation?.status === "blocked" ? 1 : 0,
    launchWaveGap: preparation ? 0 : 1,
    pendingApprovalPackets: preparation?.totals.readyInternalSteps ?? 0,
    readyDeploymentBusinesses: preparation?.status === "ready_to_execute_internal" ? 1 : 0,
    readyStages: preparation?.status === "ready_to_execute_internal" ? 1 : 0,
    repairRequired: preparation?.status === "blocked" ? 1 : 0,
    selectedSourceKeys: preparation ? 1 : 0,
    stages: 1,
    targetBusinesses: 1,
    targetLaunchWave: 1
  };
}

function firstStorePreparationKey(input: {
  preparation: RevenueFirstStorePreparationPlan | null;
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan;
  userId: string;
}) {
  return createHash("sha256").update(JSON.stringify({
    generatedAt: input.sourceBatch.generatedAt,
    packageId: input.preparation?.approval.packageId ?? null,
    preparationId: input.preparation?.preparationId ?? null,
    sourceStoreId: input.preparation?.storeConfig.sourceStoreId ?? null,
    stage: "prepare_first_store",
    totals: input.preparation?.totals ?? null,
    userId: input.userId
  })).digest("hex");
}

function firstBusinessInternalLaunchTotals(
  launch: RevenueFirstBusinessInternalLaunchPlan | null,
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan
): RevenueMoneyArmyBatchPipelinePlan["totals"] {
  const base = moneyArmyGenerateScoreBatchTotals(sourceBatch);

  return {
    ...base,
    blockedStages: launch?.status === "blocked" ? 1 : 0,
    launchWaveGap: launch ? 0 : 1,
    pendingApprovalPackets: launch?.totals.readyExecutionItems ?? 0,
    readyDeploymentBusinesses: launch?.status === "approved_for_launch_internal" ? 1 : 0,
    readyStages: launch?.status === "approved_for_launch_internal" ? 1 : 0,
    repairRequired: launch?.status === "blocked" ? 1 : 0,
    selectedSourceKeys: launch ? 1 : 0,
    stages: 1,
    targetBusinesses: 1,
    targetLaunchWave: 1
  };
}

function firstBusinessInternalLaunchKey(input: {
  launch: RevenueFirstBusinessInternalLaunchPlan | null;
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan;
  userId: string;
}) {
  return createHash("sha256").update(JSON.stringify({
    generatedAt: input.sourceBatch.generatedAt,
    launchId: input.launch?.launchId ?? null,
    packageId: input.launch?.launchApproval.packageId ?? null,
    preparationId: input.launch?.launchApproval.preparationId ?? null,
    sourceStoreId: input.launch?.storeSetup.sourceStoreId ?? null,
    stage: "launch_first_business",
    totals: input.launch?.totals ?? null,
    userId: input.userId
  })).digest("hex");
}

function firstBusinessExecutionTotals(
  execution: RevenueFirstBusinessExecutionPlan | null,
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan
): RevenueMoneyArmyBatchPipelinePlan["totals"] {
  const base = moneyArmyGenerateScoreBatchTotals(sourceBatch);

  return {
    ...base,
    blockedStages: execution?.status === "blocked" ? 1 : 0,
    launchWaveGap: execution ? 0 : 1,
    pendingApprovalPackets: execution?.totals.readyLaunchItems ?? 0,
    readyDeploymentBusinesses: execution?.status === "ready_to_launch_first_business" ? 1 : 0,
    readyStages: execution?.status === "ready_to_launch_first_business" ? 1 : 0,
    repairRequired: execution?.status === "blocked" ? 1 : 0,
    selectedSourceKeys: execution ? 1 : 0,
    stages: 1,
    targetBusinesses: 1,
    targetLaunchWave: 1
  };
}

function firstBusinessExecutionKey(input: {
  execution: RevenueFirstBusinessExecutionPlan | null;
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan;
  userId: string;
}) {
  return createHash("sha256").update(JSON.stringify({
    executionId: input.execution?.executionId ?? null,
    generatedAt: input.sourceBatch.generatedAt,
    sourceLaunchId: input.execution?.sourceLaunchId ?? null,
    sourceStoreId: input.execution?.finalExecutionPacket.store.sourceStoreId ?? null,
    stage: "execute_first_business",
    totals: input.execution?.totals ?? null,
    userId: input.userId
  })).digest("hex");
}

function firstBusinessAutonomousLaunchTotals(
  autonomousLaunch: RevenueFirstBusinessAutonomousLaunchPlan | null,
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan
): RevenueMoneyArmyBatchPipelinePlan["totals"] {
  const base = moneyArmyGenerateScoreBatchTotals(sourceBatch);

  return {
    ...base,
    blockedStages: autonomousLaunch?.status === "blocked" ? 1 : 0,
    launchWaveGap: autonomousLaunch ? 0 : 1,
    pendingApprovalPackets: autonomousLaunch?.totals.paymentApprovals ?? 0,
    readyDeploymentBusinesses: autonomousLaunch?.status === "autonomous_ready_payment_gated" ? 1 : 0,
    readyStages: autonomousLaunch?.status === "autonomous_ready_payment_gated" ? 1 : 0,
    repairRequired: autonomousLaunch?.status === "blocked" ? 1 : 0,
    selectedSourceKeys: autonomousLaunch ? 1 : 0,
    stages: 1,
    targetBusinesses: 1,
    targetLaunchWave: 1
  };
}

function firstBusinessAutonomousLaunchKey(input: {
  autonomousLaunch: RevenueFirstBusinessAutonomousLaunchPlan | null;
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan;
  userId: string;
}) {
  return createHash("sha256").update(JSON.stringify({
    autonomousLaunchId: input.autonomousLaunch?.autonomousLaunchId ?? null,
    executionId: input.autonomousLaunch?.executionPacket.executionId ?? null,
    generatedAt: input.sourceBatch.generatedAt,
    sourceStoreId: input.autonomousLaunch?.executionPacket.finalExecutionPacket.store.sourceStoreId ?? null,
    stage: "autonomous_first_business_launch",
    totals: input.autonomousLaunch?.totals ?? null,
    userId: input.userId
  })).digest("hex");
}

function firstBusinessLiveExecutorTotals(
  liveExecutor: RevenueFirstBusinessLiveExecutorPlan | null,
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan
): RevenueMoneyArmyBatchPipelinePlan["totals"] {
  const base = moneyArmyGenerateScoreBatchTotals(sourceBatch);

  return {
    ...base,
    blockedStages: liveExecutor?.status === "blocked" ? 1 : 0,
    launchWaveGap: liveExecutor ? 0 : 1,
    pendingApprovalPackets: liveExecutor?.status === "armed_non_payment_live_run"
      ? liveExecutor.totals.paymentLockedSteps
      : (liveExecutor?.totals.blockedSteps ?? 0) + (liveExecutor?.paymentLockedQueue.length ?? 0),
    readyDeploymentBusinesses: liveExecutor?.status === "armed_non_payment_live_run" ? 1 : 0,
    readyStages: liveExecutor?.status === "armed_non_payment_live_run" ? 1 : 0,
    repairRequired: liveExecutor?.status === "blocked" ? 1 : 0,
    selectedSourceKeys: liveExecutor ? 1 : 0,
    stages: 1,
    targetBusinesses: 1,
    targetLaunchWave: 1
  };
}

function firstBusinessLiveExecutorKey(input: {
  liveExecutor: RevenueFirstBusinessLiveExecutorPlan | null;
  sourceBatch: RevenueMoneyArmyGenerateScoreBatchPlan;
  userId: string;
}) {
  return createHash("sha256").update(JSON.stringify({
    generatedAt: input.sourceBatch.generatedAt,
    liveExecutorId: input.liveExecutor?.liveExecutorId ?? null,
    sourceAutonomousLaunchId: input.liveExecutor?.sourceAutonomousLaunchId ?? null,
    stage: "controlled_live_executor",
    status: input.liveExecutor?.status ?? null,
    totals: input.liveExecutor?.totals ?? null,
    userId: input.userId
  })).digest("hex");
}

async function applyRevenueMoneyArmyGenerateScoreBatch(userId: string, input: ApplyRevenueMoneyArmyGenerateScoreBatchInput) {
  const { plan } = await buildRevenueMoneyArmyGenerateScoreBatchForUser(userId, input);
  const sourceKeys = Array.from(new Set(plan.candidates.map((candidate) => candidate.sourceStoreId)));
  const afterTotals = moneyArmyGenerateScoreBatchTotals(plan);
  const beforeTotals: RevenueMoneyArmyBatchPipelinePlan["totals"] = {
    ...afterTotals,
    blockedStages: 0,
    pendingApprovalPackets: 0,
    readyDeploymentBusinesses: 0,
    readyStages: 0,
    repairRequired: 0,
    seedCandidates: 0
  };
  const appliedSummary = input.dryRun
    ? `Money Army generate-score preview completed for ${plan.totals.generated} candidate${plan.totals.generated === 1 ? "" : "s"}.`
    : `Money Army generate-score batch recorded internally for ${plan.totals.generated} candidate${plan.totals.generated === 1 ? "" : "s"}.`;

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        batchRunId: null,
        dryRun: true,
        externalExecution: false as const,
        providerContacted: false as const,
        stage: "generate_score_batch" as const,
        summary: appliedSummary
      },
      batchRun: null,
      plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.money_army_generate_score_batch.recorded",
    actorUserId: userId,
    metadata: {
      blockedExternalActions: plan.blockedExternalActions,
      candidateIds: plan.candidates.map((candidate) => candidate.candidateId),
      dryRun: false,
      externalExecution: false,
      killPressure: plan.killPressure,
      note: input.note ?? null,
      providerContacted: false,
      rotationSummary: plan.rotationSummary,
      scalePressure: plan.scalePressure,
      sourceKeys,
      summary: plan.summary,
      totals: plan.totals
    },
    outcome: "success",
    severity: plan.totals.kill > 0 || plan.totals.pause > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_money_army_generate_score_batch"
  });
  const batchKey = moneyArmyGenerateScoreBatchKey({
    plan,
    sourceKeys,
    userId
  });
  const batchRun = await prisma.revenueMoneyArmyBatchRun.upsert({
    create: {
      afterTotalsJson: stringifySecureJson(afterTotals),
      auditLogId: auditLog.id,
      batchKey,
      beforeTotalsJson: stringifySecureJson(beforeTotals),
      dryRun: false,
      externalExecution: false,
      providerContacted: false,
      resultJson: stringifySecureJson({
        candidateIds: plan.candidates.map((candidate) => candidate.candidateId),
        killPressure: plan.killPressure,
        rotationSummary: plan.rotationSummary,
        scalePressure: plan.scalePressure,
        totals: plan.totals
      }),
      resultSummary: appliedSummary,
      sourceKeysJson: stringifySecureJson(sourceKeys),
      stage: "generate_score_batch",
      status: "recorded",
      userId
    },
    update: {
      afterTotalsJson: stringifySecureJson(afterTotals),
      auditLogId: auditLog.id,
      externalExecution: false,
      providerContacted: false,
      resultJson: stringifySecureJson({
        candidateIds: plan.candidates.map((candidate) => candidate.candidateId),
        killPressure: plan.killPressure,
        rotationSummary: plan.rotationSummary,
        scalePressure: plan.scalePressure,
        totals: plan.totals
      }),
      resultSummary: appliedSummary,
      sourceKeysJson: stringifySecureJson(sourceKeys),
      status: "recorded"
    },
    where: { batchKey }
  });

  return {
    applied: {
      auditLogId: auditLog.id,
      batchRunId: batchRun.id,
      dryRun: false,
      externalExecution: false as const,
      providerContacted: false as const,
      stage: "generate_score_batch" as const,
      summary: appliedSummary
    },
    batchRun: moneyArmyBatchRunSnapshot(batchRun),
    plan
  };
}

async function applyRevenueFirstBusinessLaunchPackage(userId: string, input: ApplyRevenueFirstBusinessLaunchPackageInput) {
  const { package: launchPackage, sourceBatch } = await buildRevenueFirstBusinessLaunchPackageForUser(userId, input);
  const sourceKeys = launchPackage ? [launchPackage.store.sourceStoreId] : [];
  const afterTotals = firstBusinessLaunchPackageTotals(launchPackage, sourceBatch);
  const beforeTotals: RevenueMoneyArmyBatchPipelinePlan["totals"] = {
    ...afterTotals,
    blockedStages: 0,
    pendingApprovalPackets: 0,
    readyDeploymentBusinesses: 0,
    readyStages: 0,
    repairRequired: 0
  };
  const appliedSummary = input.dryRun
    ? launchPackage
      ? `First Business Launch Package preview completed for ${launchPackage.store.businessName}.`
      : "First Business Launch Package preview found no eligible package."
    : launchPackage
      ? `First Business Launch Package recorded internally for ${launchPackage.store.businessName}.`
      : "First Business Launch Package record completed with no eligible package.";

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        batchRunId: null,
        dryRun: true,
        externalExecution: false as const,
        providerContacted: false as const,
        stage: "first_business_launch_package" as const,
        summary: appliedSummary
      },
      batchRun: null,
      package: launchPackage,
      sourceBatch
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.first_business_launch_package.recorded",
    actorUserId: userId,
    metadata: {
      approvalChecklist: launchPackage?.approvalChecklist ?? [],
      blockedExternalActions: launchPackage?.blockedExternalActions ?? [],
      dryRun: false,
      externalExecution: false,
      note: input.note ?? null,
      packageId: launchPackage?.packageId ?? null,
      productCandidateIds: launchPackage?.products.map((product) => product.candidateId) ?? [],
      providerContacted: false,
      sourceBatchTotals: sourceBatch.totals,
      sourceKeys,
      summary: launchPackage?.summary ?? appliedSummary,
      totals: launchPackage?.totals ?? null
    },
    outcome: "success",
    severity: launchPackage?.status === "blocked" || launchPackage?.status === "manual_gate" ? "medium" : "low",
    targetId: launchPackage?.packageId ?? null,
    targetType: "revenue_first_business_launch_package"
  });
  const batchKey = firstBusinessLaunchPackageKey({
    launchPackage,
    sourceBatch,
    userId
  });
  const batchRun = await prisma.revenueMoneyArmyBatchRun.upsert({
    create: {
      afterTotalsJson: stringifySecureJson(afterTotals),
      auditLogId: auditLog.id,
      batchKey,
      beforeTotalsJson: stringifySecureJson(beforeTotals),
      dryRun: false,
      externalExecution: false,
      providerContacted: false,
      resultJson: stringifySecureJson({
        package: launchPackage,
        sourceBatchTotals: sourceBatch.totals
      }),
      resultSummary: appliedSummary,
      sourceKeysJson: stringifySecureJson(sourceKeys),
      stage: "first_business_launch_package",
      status: "recorded",
      userId
    },
    update: {
      afterTotalsJson: stringifySecureJson(afterTotals),
      auditLogId: auditLog.id,
      externalExecution: false,
      providerContacted: false,
      resultJson: stringifySecureJson({
        package: launchPackage,
        sourceBatchTotals: sourceBatch.totals
      }),
      resultSummary: appliedSummary,
      sourceKeysJson: stringifySecureJson(sourceKeys),
      status: "recorded"
    },
    where: { batchKey }
  });

  return {
    applied: {
      auditLogId: auditLog.id,
      batchRunId: batchRun.id,
      dryRun: false,
      externalExecution: false as const,
      providerContacted: false as const,
      stage: "first_business_launch_package" as const,
      summary: appliedSummary
    },
    batchRun: moneyArmyBatchRunSnapshot(batchRun),
    package: launchPackage,
    sourceBatch
  };
}

async function applyRevenueFirstStorePrepare(userId: string, input: ApplyRevenueFirstStorePrepareInput) {
  const { package: launchPackage, sourceBatch } = await buildRevenueFirstBusinessLaunchPackageForUser(userId, input);
  const preparation = launchPackage && launchPackage.status !== "blocked"
    ? buildRevenueFirstStorePreparationPlan({
      note: input.note ?? null,
      packagePlan: launchPackage
    })
    : null;
  const sourceKeys = preparation ? [preparation.storeConfig.sourceStoreId] : [];
  const afterTotals = firstStorePreparationTotals(preparation, sourceBatch);
  const beforeTotals: RevenueMoneyArmyBatchPipelinePlan["totals"] = {
    ...afterTotals,
    blockedStages: 0,
    pendingApprovalPackets: 0,
    readyDeploymentBusinesses: 0,
    readyStages: 0,
    repairRequired: 0
  };
  const approved = Boolean(preparation);
  const appliedSummary = input.dryRun
    ? preparation
      ? `Approve & Prepare preview completed for ${preparation.storeConfig.businessName}.`
      : "Approve & Prepare preview found no eligible unblocked package."
    : preparation
      ? `${preparation.storeConfig.businessName} approved internally and prepared for first-store execution.`
      : "Approve & Prepare could not approve a blocked or missing package.";
  const approvalReceipt = {
    approved,
    auditLogId: null as string | null,
    batchRunId: null as string | null,
    dryRun: input.dryRun,
    externalExecution: false as const,
    packageId: launchPackage?.packageId ?? null,
    preparationId: preparation?.preparationId ?? null,
    providerContacted: false as const,
    stage: "prepare_first_store" as const,
    status: approved ? "approved_internal" as const : "blocked" as const,
    summary: appliedSummary
  };

  if (input.dryRun) {
    return {
      approval: approvalReceipt,
      batchRun: null,
      package: launchPackage,
      preparation,
      sourceBatch
    };
  }

  const auditLog = await recordAuditLog({
    action: approved
      ? "revenue.first_business_package.approved_prepare_first_store"
      : "revenue.first_business_package.approve_prepare_blocked",
    actorUserId: userId,
    metadata: {
      approval: preparation?.approval ?? null,
      blockedExternalActions: preparation?.blockedExternalActions ?? launchPackage?.blockedExternalActions ?? [],
      dryRun: false,
      externalExecution: false,
      guardrails: preparation?.guardrails ?? [],
      note: input.note ?? null,
      packageId: launchPackage?.packageId ?? null,
      preparationId: preparation?.preparationId ?? null,
      productCandidateIds: preparation?.products.map((product) => product.candidateId) ?? [],
      providerContacted: false,
      sourceBatchTotals: sourceBatch.totals,
      sourceKeys,
      status: preparation?.status ?? launchPackage?.status ?? "blocked",
      summary: preparation?.summary ?? appliedSummary,
      totals: preparation?.totals ?? null
    },
    outcome: approved ? "success" : "failure",
    severity: approved ? "low" : "medium",
    targetId: preparation?.preparationId ?? launchPackage?.packageId ?? null,
    targetType: "revenue_prepare_first_store"
  });
  const batchKey = firstStorePreparationKey({
    preparation,
    sourceBatch,
    userId
  });
  const batchRun = await prisma.revenueMoneyArmyBatchRun.upsert({
    create: {
      afterTotalsJson: stringifySecureJson(afterTotals),
      auditLogId: auditLog.id,
      batchKey,
      beforeTotalsJson: stringifySecureJson(beforeTotals),
      dryRun: false,
      externalExecution: false,
      providerContacted: false,
      resultJson: stringifySecureJson({
        approval: {
          ...approvalReceipt,
          auditLogId: auditLog.id
        },
        package: launchPackage,
        preparation,
        sourceBatchTotals: sourceBatch.totals
      }),
      resultSummary: appliedSummary,
      sourceKeysJson: stringifySecureJson(sourceKeys),
      stage: "prepare_first_store",
      status: approved ? "approved_internal" : "blocked",
      userId
    },
    update: {
      afterTotalsJson: stringifySecureJson(afterTotals),
      auditLogId: auditLog.id,
      externalExecution: false,
      providerContacted: false,
      resultJson: stringifySecureJson({
        approval: {
          ...approvalReceipt,
          auditLogId: auditLog.id
        },
        package: launchPackage,
        preparation,
        sourceBatchTotals: sourceBatch.totals
      }),
      resultSummary: appliedSummary,
      sourceKeysJson: stringifySecureJson(sourceKeys),
      status: approved ? "approved_internal" : "blocked"
    },
    where: { batchKey }
  });

  return {
    approval: {
      ...approvalReceipt,
      auditLogId: auditLog.id,
      batchRunId: batchRun.id
    },
    batchRun: moneyArmyBatchRunSnapshot(batchRun),
    package: launchPackage,
    preparation,
    sourceBatch
  };
}

async function applyRevenueFirstBusinessInternalLaunch(userId: string, input: ApplyRevenueFirstBusinessInternalLaunchInput) {
  const { package: launchPackage, sourceBatch } = await buildRevenueFirstBusinessLaunchPackageForUser(userId, input);
  const preparation = launchPackage && launchPackage.status !== "blocked"
    ? buildRevenueFirstStorePreparationPlan({
      note: input.note ?? null,
      packagePlan: launchPackage
    })
    : null;
  const launch = preparation && preparation.status === "ready_to_execute_internal"
    ? buildRevenueFirstBusinessInternalLaunchPlan({
      note: input.note ?? null,
      preparationPlan: preparation
    })
    : null;
  const sourceKeys = launch ? [launch.storeSetup.sourceStoreId] : [];
  const afterTotals = firstBusinessInternalLaunchTotals(launch, sourceBatch);
  const beforeTotals: RevenueMoneyArmyBatchPipelinePlan["totals"] = {
    ...afterTotals,
    blockedStages: 0,
    pendingApprovalPackets: 0,
    readyDeploymentBusinesses: 0,
    readyStages: 0,
    repairRequired: 0
  };
  const launched = launch?.status === "approved_for_launch_internal";
  const appliedSummary = input.dryRun
    ? launched
      ? `Launch First Business preview completed for ${launch.storeSetup.businessName}.`
      : "Launch First Business preview found no eligible prepared package."
    : launched
      ? `${launch.storeSetup.businessName} is approved for launch internally. External execution remains locked.`
      : "Launch First Business could not prepare a launch-ready internal packet.";
  const launchReceipt = {
    auditLogId: null as string | null,
    batchRunId: null as string | null,
    dryRun: input.dryRun,
    externalExecution: false as const,
    launched,
    launchId: launch?.launchId ?? null,
    packageId: launchPackage?.packageId ?? null,
    preparationId: preparation?.preparationId ?? null,
    providerContacted: false as const,
    stage: "launch_first_business" as const,
    status: launched ? "approved_for_launch_internal" as const : "blocked" as const,
    summary: appliedSummary
  };

  if (input.dryRun) {
    return {
      batchRun: null,
      launch,
      launched: launchReceipt,
      package: launchPackage,
      preparation,
      sourceBatch
    };
  }

  const auditLog = await recordAuditLog({
    action: launched
      ? "revenue.first_business.launch_first_business_internal"
      : "revenue.first_business.launch_first_business_blocked",
    actorUserId: userId,
    metadata: {
      blockedExternalActions: launch?.blockedExternalActions ?? preparation?.blockedExternalActions ?? launchPackage?.blockedExternalActions ?? [],
      dryRun: false,
      externalExecution: false,
      guardrails: launch?.guardrails ?? [],
      launch,
      launchId: launch?.launchId ?? null,
      note: input.note ?? null,
      packageId: launchPackage?.packageId ?? null,
      preparationId: preparation?.preparationId ?? null,
      productCandidateIds: launch?.productSetupQueue.map((product) => product.candidateId) ?? [],
      providerContacted: false,
      sourceBatchTotals: sourceBatch.totals,
      sourceKeys,
      status: launch?.status ?? preparation?.status ?? launchPackage?.status ?? "blocked",
      summary: launch?.summary ?? appliedSummary,
      totals: launch?.totals ?? null
    },
    outcome: launched ? "success" : "failure",
    severity: launched ? "low" : "medium",
    targetId: launch?.launchId ?? preparation?.preparationId ?? launchPackage?.packageId ?? null,
    targetType: "revenue_launch_first_business"
  });
  const batchKey = firstBusinessInternalLaunchKey({
    launch,
    sourceBatch,
    userId
  });
  const batchRun = await prisma.revenueMoneyArmyBatchRun.upsert({
    create: {
      afterTotalsJson: stringifySecureJson(afterTotals),
      auditLogId: auditLog.id,
      batchKey,
      beforeTotalsJson: stringifySecureJson(beforeTotals),
      dryRun: false,
      externalExecution: false,
      providerContacted: false,
      resultJson: stringifySecureJson({
        launch,
        launched: {
          ...launchReceipt,
          auditLogId: auditLog.id
        },
        package: launchPackage,
        preparation,
        sourceBatchTotals: sourceBatch.totals
      }),
      resultSummary: appliedSummary,
      sourceKeysJson: stringifySecureJson(sourceKeys),
      stage: "launch_first_business",
      status: launched ? "approved_for_launch_internal" : "blocked",
      userId
    },
    update: {
      afterTotalsJson: stringifySecureJson(afterTotals),
      auditLogId: auditLog.id,
      externalExecution: false,
      providerContacted: false,
      resultJson: stringifySecureJson({
        launch,
        launched: {
          ...launchReceipt,
          auditLogId: auditLog.id
        },
        package: launchPackage,
        preparation,
        sourceBatchTotals: sourceBatch.totals
      }),
      resultSummary: appliedSummary,
      sourceKeysJson: stringifySecureJson(sourceKeys),
      status: launched ? "approved_for_launch_internal" : "blocked"
    },
    where: { batchKey }
  });

  return {
    batchRun: moneyArmyBatchRunSnapshot(batchRun),
    launch,
    launched: {
      ...launchReceipt,
      auditLogId: auditLog.id,
      batchRunId: batchRun.id
    },
    package: launchPackage,
    preparation,
    sourceBatch
  };
}

async function applyRevenueFirstBusinessExecute(userId: string, input: ApplyRevenueFirstBusinessExecuteInput) {
  const { package: launchPackage, sourceBatch } = await buildRevenueFirstBusinessLaunchPackageForUser(userId, input);
  const preparation = launchPackage && launchPackage.status !== "blocked"
    ? buildRevenueFirstStorePreparationPlan({
      note: input.note ?? null,
      packagePlan: launchPackage
    })
    : null;
  const launch = preparation && preparation.status === "ready_to_execute_internal"
    ? buildRevenueFirstBusinessInternalLaunchPlan({
      note: input.note ?? null,
      preparationPlan: preparation
    })
    : null;
  const execution = launch && launch.status === "approved_for_launch_internal"
    ? buildRevenueFirstBusinessExecutionPlan({
      launchPlan: launch,
      note: input.note ?? null
    })
    : null;
  const sourceKeys = execution ? [execution.finalExecutionPacket.store.sourceStoreId] : [];
  const afterTotals = firstBusinessExecutionTotals(execution, sourceBatch);
  const beforeTotals: RevenueMoneyArmyBatchPipelinePlan["totals"] = {
    ...afterTotals,
    blockedStages: 0,
    pendingApprovalPackets: 0,
    readyDeploymentBusinesses: 0,
    readyStages: 0,
    repairRequired: 0
  };
  const executed = execution?.status === "ready_to_launch_first_business";
  const appliedSummary = input.dryRun
    ? executed
      ? `Execute First Business preview completed for ${execution.finalExecutionPacket.store.businessName}.`
      : "Execute First Business preview found no approved final execution packet."
    : executed
      ? `${execution.finalExecutionPacket.store.businessName} is Ready to Launch First Business. Manual and semi-automated launch prep are ready; external execution remains locked.`
      : "Execute First Business could not prepare a ready-to-launch internal packet.";
  const executionReceipt = {
    auditLogId: null as string | null,
    batchRunId: null as string | null,
    dryRun: input.dryRun,
    executed,
    executionId: execution?.executionId ?? null,
    externalExecution: false as const,
    launchId: launch?.launchId ?? null,
    providerContacted: false as const,
    stage: "execute_first_business" as const,
    status: executed ? "ready_to_launch_first_business" as const : "blocked" as const,
    summary: appliedSummary
  };

  if (input.dryRun) {
    return {
      batchRun: null,
      executed: executionReceipt,
      execution,
      launch,
      package: launchPackage,
      preparation,
      sourceBatch
    };
  }

  const auditLog = await recordAuditLog({
    action: executed
      ? "revenue.first_business.execute_first_business_internal"
      : "revenue.first_business.execute_first_business_blocked",
    actorUserId: userId,
    metadata: {
      blockedExternalActions: execution?.blockedExternalActions ?? launch?.blockedExternalActions ?? preparation?.blockedExternalActions ?? [],
      dryRun: false,
      execution,
      executionId: execution?.executionId ?? null,
      externalExecution: false,
      finalExecutionPacket: execution?.finalExecutionPacket ?? launch?.finalExecutionPacket ?? null,
      firstLaunchReadinessGate: execution?.firstLaunchReadinessGate ?? null,
      firstWeekTrackingPlan: execution?.firstWeekTrackingPlan ?? null,
      guardrails: execution?.guardrails ?? [],
      launchHandoffPacket: execution?.launchHandoffPacket ?? null,
      launchId: launch?.launchId ?? null,
      listingProductPack: execution?.listingProductPack ?? [],
      manualLaunchRunbook: execution?.manualLaunchRunbook ?? [],
      note: input.note ?? null,
      productCandidateIds: execution?.finalExecutionPacket.products.map((product) => product.candidateId) ?? [],
      providerContacted: false,
      readyState: execution?.readyState ?? null,
      semiAutomatedPreparationQueue: execution?.semiAutomatedPreparationQueue ?? [],
      sourceBatchTotals: sourceBatch.totals,
      sourceKeys,
      status: execution?.status ?? launch?.status ?? preparation?.status ?? launchPackage?.status ?? "blocked",
      summary: execution?.summary ?? appliedSummary,
      totals: execution?.totals ?? null
    },
    outcome: executed ? "success" : "failure",
    severity: executed ? "low" : "medium",
    targetId: execution?.executionId ?? launch?.launchId ?? preparation?.preparationId ?? launchPackage?.packageId ?? null,
    targetType: "revenue_execute_first_business"
  });
  const batchKey = firstBusinessExecutionKey({
    execution,
    sourceBatch,
    userId
  });
  const batchRun = await prisma.revenueMoneyArmyBatchRun.upsert({
    create: {
      afterTotalsJson: stringifySecureJson(afterTotals),
      auditLogId: auditLog.id,
      batchKey,
      beforeTotalsJson: stringifySecureJson(beforeTotals),
      dryRun: false,
      externalExecution: false,
      providerContacted: false,
      resultJson: stringifySecureJson({
        executed: {
          ...executionReceipt,
          auditLogId: auditLog.id
        },
        execution,
        launch,
        package: launchPackage,
        preparation,
        sourceBatchTotals: sourceBatch.totals
      }),
      resultSummary: appliedSummary,
      sourceKeysJson: stringifySecureJson(sourceKeys),
      stage: "execute_first_business",
      status: executed ? "ready_to_launch_first_business" : "blocked",
      userId
    },
    update: {
      afterTotalsJson: stringifySecureJson(afterTotals),
      auditLogId: auditLog.id,
      externalExecution: false,
      providerContacted: false,
      resultJson: stringifySecureJson({
        executed: {
          ...executionReceipt,
          auditLogId: auditLog.id
        },
        execution,
        launch,
        package: launchPackage,
        preparation,
        sourceBatchTotals: sourceBatch.totals
      }),
      resultSummary: appliedSummary,
      sourceKeysJson: stringifySecureJson(sourceKeys),
      status: executed ? "ready_to_launch_first_business" : "blocked"
    },
    where: { batchKey }
  });

  return {
    batchRun: moneyArmyBatchRunSnapshot(batchRun),
    executed: {
      ...executionReceipt,
      auditLogId: auditLog.id,
      batchRunId: batchRun.id
    },
    execution,
    launch,
    package: launchPackage,
    preparation,
    sourceBatch
  };
}

async function applyRevenueFirstBusinessAutonomousLaunch(userId: string, input: ApplyRevenueFirstBusinessAutonomousLaunchInput) {
  const { package: launchPackage, sourceBatch } = await buildRevenueFirstBusinessLaunchPackageForUser(userId, input);
  const preparation = launchPackage && launchPackage.status !== "blocked"
    ? buildRevenueFirstStorePreparationPlan({
      note: input.note ?? null,
      packagePlan: launchPackage
    })
    : null;
  const launch = preparation && preparation.status === "ready_to_execute_internal"
    ? buildRevenueFirstBusinessInternalLaunchPlan({
      note: input.note ?? null,
      preparationPlan: preparation
    })
    : null;
  const execution = launch && launch.status === "approved_for_launch_internal"
    ? buildRevenueFirstBusinessExecutionPlan({
      launchPlan: launch,
      note: input.note ?? null
    })
    : null;
  const autonomousLaunch = execution && execution.status === "ready_to_launch_first_business"
    ? buildRevenueFirstBusinessAutonomousLaunchPlan({
      executionPlan: execution,
      note: input.note ?? null
    })
    : null;
  const sourceKeys = autonomousLaunch ? [autonomousLaunch.executionPacket.finalExecutionPacket.store.sourceStoreId] : [];
  const afterTotals = firstBusinessAutonomousLaunchTotals(autonomousLaunch, sourceBatch);
  const beforeTotals: RevenueMoneyArmyBatchPipelinePlan["totals"] = {
    ...afterTotals,
    blockedStages: 0,
    pendingApprovalPackets: 0,
    readyDeploymentBusinesses: 0,
    readyStages: 0,
    repairRequired: 0
  };
  const autonomousPrepared = autonomousLaunch?.status === "autonomous_ready_payment_gated";
  const appliedSummary = input.dryRun
    ? autonomousPrepared
      ? `Autonomous First Business Launch Prep preview completed for ${autonomousLaunch.executionPacket.finalExecutionPacket.store.businessName}.`
      : "Autonomous First Business Launch Prep preview found no ready execution packet."
    : autonomousPrepared
      ? `${autonomousLaunch.executionPacket.finalExecutionPacket.store.businessName} is autonomous-ready until payment. ENTRAL prepared the launch packet; provider, payment, publishing, upload, browser, and spend actions remain locked.`
      : "Autonomous First Business Launch Prep could not prepare a payment-gated autonomous packet.";
  const autonomousReceipt = {
    auditLogId: null as string | null,
    autonomousLaunchId: autonomousLaunch?.autonomousLaunchId ?? null,
    autonomousPrepared,
    batchRunId: null as string | null,
    dryRun: input.dryRun,
    executionId: execution?.executionId ?? null,
    externalExecution: false as const,
    paymentExecution: false as const,
    providerContacted: false as const,
    stage: "autonomous_first_business_launch" as const,
    status: autonomousPrepared ? "autonomous_ready_payment_gated" as const : "blocked" as const,
    summary: appliedSummary
  };

  if (input.dryRun) {
    return {
      autonomous: autonomousReceipt,
      autonomousLaunch,
      batchRun: null,
      execution,
      launch,
      package: launchPackage,
      preparation,
      sourceBatch
    };
  }

  const auditLog = await recordAuditLog({
    action: autonomousPrepared
      ? "revenue.first_business.autonomous_launch_prepared"
      : "revenue.first_business.autonomous_launch_blocked",
    actorUserId: userId,
    metadata: {
      adCampaignDrafts: autonomousLaunch?.adCampaignDrafts ?? [],
      autonomyMatrix: autonomousLaunch?.autonomyMatrix ?? [],
      autonomousLaunch,
      autonomousLaunchId: autonomousLaunch?.autonomousLaunchId ?? null,
      blockedExternalActions: autonomousLaunch?.blockedExternalActions ?? execution?.blockedExternalActions ?? launch?.blockedExternalActions ?? [],
      chainOfCommand: autonomousLaunch?.chainOfCommand ?? [],
      connectionPlan: autonomousLaunch?.connectionPlan ?? null,
      dryRun: false,
      executionId: execution?.executionId ?? null,
      externalExecution: false,
      finalOperatorGate: autonomousLaunch?.finalOperatorGate ?? null,
      guardrails: autonomousLaunch?.guardrails ?? [],
      note: input.note ?? null,
      packageId: launchPackage?.packageId ?? null,
      paymentApprovalQueue: autonomousLaunch?.paymentApprovalQueue ?? [],
      paymentExecution: false,
      productCreationPlan: autonomousLaunch?.productCreationPlan ?? [],
      providerContacted: false,
      sourceBatchTotals: sourceBatch.totals,
      sourceKeys,
      status: autonomousLaunch?.status ?? execution?.status ?? launch?.status ?? preparation?.status ?? launchPackage?.status ?? "blocked",
      storeBuildPlan: autonomousLaunch?.storeBuildPlan ?? null,
      summary: autonomousLaunch?.summary ?? appliedSummary,
      supplierPlan: autonomousLaunch?.supplierPlan ?? null,
      totals: autonomousLaunch?.totals ?? null
    },
    outcome: autonomousPrepared ? "success" : "failure",
    severity: autonomousPrepared ? "medium" : "high",
    targetId: autonomousLaunch?.autonomousLaunchId ?? execution?.executionId ?? launch?.launchId ?? preparation?.preparationId ?? launchPackage?.packageId ?? null,
    targetType: "revenue_autonomous_first_business_launch"
  });
  const batchKey = firstBusinessAutonomousLaunchKey({
    autonomousLaunch,
    sourceBatch,
    userId
  });
  const batchRun = await prisma.revenueMoneyArmyBatchRun.upsert({
    create: {
      afterTotalsJson: stringifySecureJson(afterTotals),
      auditLogId: auditLog.id,
      batchKey,
      beforeTotalsJson: stringifySecureJson(beforeTotals),
      dryRun: false,
      externalExecution: false,
      providerContacted: false,
      resultJson: stringifySecureJson({
        autonomous: {
          ...autonomousReceipt,
          auditLogId: auditLog.id
        },
        autonomousLaunch,
        execution,
        launch,
        package: launchPackage,
        preparation,
        sourceBatchTotals: sourceBatch.totals
      }),
      resultSummary: appliedSummary,
      sourceKeysJson: stringifySecureJson(sourceKeys),
      stage: "autonomous_first_business_launch",
      status: autonomousPrepared ? "autonomous_ready_payment_gated" : "blocked",
      userId
    },
    update: {
      afterTotalsJson: stringifySecureJson(afterTotals),
      auditLogId: auditLog.id,
      externalExecution: false,
      providerContacted: false,
      resultJson: stringifySecureJson({
        autonomous: {
          ...autonomousReceipt,
          auditLogId: auditLog.id
        },
        autonomousLaunch,
        execution,
        launch,
        package: launchPackage,
        preparation,
        sourceBatchTotals: sourceBatch.totals
      }),
      resultSummary: appliedSummary,
      sourceKeysJson: stringifySecureJson(sourceKeys),
      status: autonomousPrepared ? "autonomous_ready_payment_gated" : "blocked"
    },
    where: { batchKey }
  });

  return {
    autonomous: {
      ...autonomousReceipt,
      auditLogId: auditLog.id,
      batchRunId: batchRun.id
    },
    autonomousLaunch,
    batchRun: moneyArmyBatchRunSnapshot(batchRun),
    execution,
    launch,
    package: launchPackage,
    preparation,
    sourceBatch
  };
}

async function applyRevenueFirstBusinessLiveExecutor(userId: string, input: ApplyRevenueFirstBusinessLiveExecutorInput) {
  const { package: launchPackage, sourceBatch } = await buildRevenueFirstBusinessLaunchPackageForUser(userId, input);
  const preparation = launchPackage && launchPackage.status !== "blocked"
    ? buildRevenueFirstStorePreparationPlan({
      note: input.note ?? null,
      packagePlan: launchPackage
    })
    : null;
  const launch = preparation && preparation.status === "ready_to_execute_internal"
    ? buildRevenueFirstBusinessInternalLaunchPlan({
      note: input.note ?? null,
      preparationPlan: preparation
    })
    : null;
  const execution = launch && launch.status === "approved_for_launch_internal"
    ? buildRevenueFirstBusinessExecutionPlan({
      launchPlan: launch,
      note: input.note ?? null
    })
    : null;
  const autonomousLaunch = execution && execution.status === "ready_to_launch_first_business"
    ? buildRevenueFirstBusinessAutonomousLaunchPlan({
      executionPlan: execution,
      note: input.note ?? null
    })
    : null;
  const phraseAccepted = input.liveUnlockPhrase === revenueFirstBusinessLiveExecutorUnlockPhrase;
  const liveExecutor = autonomousLaunch
    ? buildRevenueFirstBusinessLiveExecutorPlan({
      adDraftApproval: input.adDraftApproval,
      autonomousLaunch,
      connectorApproval: input.connectorApproval,
      liveUnlockPhraseAccepted: phraseAccepted,
      note: input.note ?? null,
      publicLaunchApproval: input.publicLaunchApproval
    })
    : null;
  const shopifyConnectionCredentials = autonomousLaunch
    ? await getShopifyConnectionCredentials(
      userId,
      autonomousLaunch.executionPacket.finalExecutionPacket.store.sourceStoreId
    )
    : null;
  const shopifyAutonomyRun = autonomousLaunch
    ? await executeFirstBusinessShopifyAutonomyRun({
      autonomousLaunch,
      connectorApproval: input.connectorApproval,
      credentials: shopifyConnectionCredentials ?? undefined,
      dryRun: input.dryRun,
      liveExecutor,
      shopifyDraftUnlockPhrase: input.shopifyDraftUnlockPhrase
    })
    : null;
  const shopifyStorefrontDraft = shopifyAutonomyRun?.storefrontDraft ?? null;
  const sourceKeys = liveExecutor && autonomousLaunch
    ? [autonomousLaunch.executionPacket.finalExecutionPacket.store.sourceStoreId]
    : [];
  const afterTotals = firstBusinessLiveExecutorTotals(liveExecutor, sourceBatch);
  const beforeTotals: RevenueMoneyArmyBatchPipelinePlan["totals"] = {
    ...afterTotals,
    blockedStages: 0,
    pendingApprovalPackets: 0,
    readyDeploymentBusinesses: 0,
    readyStages: 0,
    repairRequired: 0
  };
  const liveExecutorPrepared = Boolean(liveExecutor);
  const appliedSummary = input.dryRun
    ? liveExecutor
      ? `Controlled Live First Business Executor preview completed for ${liveExecutor.sourceAutonomousLaunchId}.`
      : "Controlled Live First Business Executor preview found no autonomous launch packet."
    : shopifyStorefrontDraft?.providerContacted
      ? `${execution?.finalExecutionPacket.store.businessName ?? "First business"} controlled live executor created Shopify draft storefront resources. Payment actions remain locked.`
    : shopifyAutonomyRun?.status === "blocked_store_creation_required"
      ? `${execution?.finalExecutionPacket.store.businessName ?? "First business"} controlled live executor reached Shopify autonomy, but store creation or Admin API connection is still required. Payment actions remain locked.`
    : liveExecutor?.status === "armed_non_payment_live_run"
      ? `${execution?.finalExecutionPacket.store.businessName ?? "First business"} controlled live executor armed for non-payment launch steps. No external action executed; payment actions remain locked.`
      : liveExecutor
        ? `${execution?.finalExecutionPacket.store.businessName ?? "First business"} controlled live executor prepared. Owner unlock, connector approval, public launch approval, or ad draft approval is still incomplete.`
        : "Controlled Live First Business Executor could not prepare a live-run packet.";
  const actualExternalActionsExecuted = shopifyStorefrontDraft?.actualExternalActionsExecuted ?? false;
  const providerContacted = shopifyStorefrontDraft?.providerContacted ?? false;
  const liveReceipt = {
    actualExternalActionsExecuted,
    auditLogId: null as string | null,
    batchRunId: null as string | null,
    dryRun: input.dryRun,
    externalExecution: actualExternalActionsExecuted,
    liveExecutorId: liveExecutor?.liveExecutorId ?? null,
    paymentExecution: false as const,
    providerContacted,
    stage: "controlled_live_executor" as const,
    status: liveExecutor?.status ?? ("blocked" as const),
    summary: appliedSummary,
    unlockAccepted: phraseAccepted
  };

  if (input.dryRun) {
    return {
      autonomousLaunch,
      batchRun: null,
      execution,
      launch,
      live: liveReceipt,
      liveExecutor,
      package: launchPackage,
      preparation,
      shopifyAutonomyRun,
      shopifyStorefrontDraft,
      sourceBatch
    };
  }

  const auditLog = await recordAuditLog({
    action: actualExternalActionsExecuted
      ? "revenue.first_business.controlled_live_executor_executed_shopify_draft"
      : shopifyAutonomyRun?.status === "blocked_store_creation_required"
      ? "revenue.first_business.controlled_live_executor_shopify_autonomy_gate"
      : liveExecutor?.status === "armed_non_payment_live_run"
      ? "revenue.first_business.controlled_live_executor_armed"
      : liveExecutorPrepared
        ? "revenue.first_business.controlled_live_executor_prepared"
        : "revenue.first_business.controlled_live_executor_blocked",
    actorUserId: userId,
    metadata: {
      actualExternalActionsExecuted,
      autonomousLaunchId: autonomousLaunch?.autonomousLaunchId ?? null,
      blockedExternalActions: liveExecutor?.blockedExternalActions ?? autonomousLaunch?.blockedExternalActions ?? execution?.blockedExternalActions ?? [],
      credentialReadiness: liveExecutor?.credentialReadiness ?? [],
      dryRun: false,
      externalExecution: actualExternalActionsExecuted,
      guardrails: liveExecutor?.guardrails ?? [],
      liveExecutor,
      liveExecutorId: liveExecutor?.liveExecutorId ?? null,
      liveRunbook: liveExecutor?.liveRunbook ?? [],
      note: input.note ?? null,
      ownerUnlock: liveExecutor?.ownerUnlock ?? {
        adDraftApproval: input.adDraftApproval,
        connectorApproval: input.connectorApproval,
        phraseAccepted,
        publicLaunchApproval: input.publicLaunchApproval
      },
      paymentExecution: false,
      paymentLockedQueue: liveExecutor?.paymentLockedQueue ?? [],
      providerActionManifests: liveExecutor?.providerActionManifests ?? [],
      providerContacted,
      persistedShopifyConnectionAvailable: Boolean(shopifyConnectionCredentials),
      rollbackPlan: liveExecutor?.rollbackPlan ?? [],
      shopifyAutonomyRun: shopifyAutonomyRun ? {
        nextAction: shopifyAutonomyRun.nextAction,
        providerContacted: shopifyAutonomyRun.providerContacted,
        provisioningStatus: shopifyAutonomyRun.provisioning.status,
        status: shopifyAutonomyRun.status,
        summary: shopifyAutonomyRun.summary,
        totals: shopifyAutonomyRun.totals
      } : null,
      shopifyStorefrontDraft: shopifyStorefrontDraft ? {
        providerContacted: shopifyStorefrontDraft.providerContacted,
        providerContactedDomain: shopifyStorefrontDraft.providerContactedDomain,
        status: shopifyStorefrontDraft.status,
        summary: shopifyStorefrontDraft.summary,
        totals: shopifyStorefrontDraft.totals
      } : null,
      sourceBatchTotals: sourceBatch.totals,
      sourceKeys,
      status: liveExecutor?.status ?? autonomousLaunch?.status ?? execution?.status ?? launch?.status ?? preparation?.status ?? launchPackage?.status ?? "blocked",
      summary: liveExecutor?.summary ?? appliedSummary,
      totals: liveExecutor?.totals ?? null
    },
    outcome: liveExecutorPrepared ? "success" : "failure",
    severity: actualExternalActionsExecuted || liveExecutor?.status === "armed_non_payment_live_run" ? "high" : liveExecutorPrepared ? "medium" : "high",
    targetId: liveExecutor?.liveExecutorId ?? autonomousLaunch?.autonomousLaunchId ?? execution?.executionId ?? launch?.launchId ?? preparation?.preparationId ?? launchPackage?.packageId ?? null,
    targetType: "revenue_controlled_live_first_business_executor"
  });
  const batchKey = firstBusinessLiveExecutorKey({
    liveExecutor,
    sourceBatch,
    userId
  });
  const batchRun = await prisma.revenueMoneyArmyBatchRun.upsert({
    create: {
      afterTotalsJson: stringifySecureJson(afterTotals),
      auditLogId: auditLog.id,
      batchKey,
      beforeTotalsJson: stringifySecureJson(beforeTotals),
      dryRun: false,
      externalExecution: actualExternalActionsExecuted,
      providerContacted,
      resultJson: stringifySecureJson({
        autonomousLaunch,
        execution,
        launch,
        live: {
          ...liveReceipt,
          auditLogId: auditLog.id
        },
        liveExecutor,
        package: launchPackage,
        preparation,
        shopifyAutonomyRun,
        shopifyStorefrontDraft,
        sourceBatchTotals: sourceBatch.totals
      }),
      resultSummary: appliedSummary,
      sourceKeysJson: stringifySecureJson(sourceKeys),
      stage: "controlled_live_executor",
      status: liveExecutor?.status ?? "blocked",
      userId
    },
    update: {
      afterTotalsJson: stringifySecureJson(afterTotals),
      auditLogId: auditLog.id,
      externalExecution: actualExternalActionsExecuted,
      providerContacted,
      resultJson: stringifySecureJson({
        autonomousLaunch,
        execution,
        launch,
        live: {
          ...liveReceipt,
          auditLogId: auditLog.id
        },
        liveExecutor,
        package: launchPackage,
        preparation,
        shopifyAutonomyRun,
        shopifyStorefrontDraft,
        sourceBatchTotals: sourceBatch.totals
      }),
      resultSummary: appliedSummary,
      sourceKeysJson: stringifySecureJson(sourceKeys),
      status: liveExecutor?.status ?? "blocked"
    },
    where: { batchKey }
  });

  return {
    autonomousLaunch,
    batchRun: moneyArmyBatchRunSnapshot(batchRun),
    execution,
    launch,
    live: {
      ...liveReceipt,
      auditLogId: auditLog.id,
      batchRunId: batchRun.id
    },
    liveExecutor,
    package: launchPackage,
    preparation,
    shopifyAutonomyRun,
    shopifyStorefrontDraft,
    sourceBatch
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
  const operationsPackByStoreId = new Map(operationsPacks.map((pack) => [pack.storeId, pack]));
  const readyQueue = items
    .filter((item) => item.gateStatus === "ready_for_manual_launch")
    .map((item, index) => {
      const operationsPack = operationsPackByStoreId.get(item.storeId) ?? null;
      const approvalId = item.approvalState.latestProviderApprovalId;

      return {
        action: "manual_launch_review" as const,
        approvalId,
        artifactSlots: operationsPack?.artifactSlots.length ?? 0,
        businessName: item.businessName,
        credentialScopes: operationsPack?.credentialScopes ?? [],
        externalExecution: false as const,
        manualSteps: operationsPack?.manualSteps.slice(0, 8) ?? [],
        nextInternalState: "ready_for_operator_manual_launch" as const,
        packetId: `business_fleet_manual_launch_${item.storeId}_${approvalId ?? "approved"}`,
        priority: index + 1,
        providerContacted: false as const,
        providerPayloadCount: item.providerPayloadCount,
        readinessScore: operationsPack?.readiness.overallScore ?? Math.round((item.launchReadinessScore + item.providerReadinessScore) / 2),
        requestManifests: operationsPack?.requestManifests.length ?? 0,
        riskLevel: operationsPack?.riskLevel ?? "medium",
        sourceKey: item.sourceKey,
        status: "ready_for_manual_launch" as const,
        storeId: item.storeId,
        summary: operationsPack?.summary ?? item.reason
      };
    });
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
      readyQueue,
      statusCounts,
      summary: `${items.length} packaged business lane${items.length === 1 ? "" : "s"} evaluated: ${statusCounts.readyForManualLaunch} ready for manual launch, ${statusCounts.approvalNeeded} need approval, ${statusCounts.repairRequired} need repair, ${statusCounts.blocked} blocked.`,
      targetedSourceKeys: targeted.sourceKeys,
      totals: {
        handoffRecordsOpen: plans.handoffPlan?.totals.openPacketRecords ?? 0,
        manualLaunchReady: readyQueue.length,
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

type RevenueBusinessFleetLaunchExecutionLeaseStatus =
  | "approval_hold"
  | "blocked"
  | "quality_hold"
  | "ready_to_claim"
  | "waiting_parallel_capacity";

type RevenueBusinessFleetManualLaunchQueuePacket = Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchGateForUser>>["plan"]["readyQueue"][number];

function launchExecutionLeaseStatusForPacket(
  packet: RevenueBusinessFleetManualLaunchQueuePacket,
  input: RevenueBusinessFleetLaunchExecutionQueueQueryInput
): RevenueBusinessFleetLaunchExecutionLeaseStatus {
  const riskLevel = packet.riskLevel.toLowerCase();

  if (!packet.approvalId) return "approval_hold";
  if (packet.manualSteps.length === 0 || packet.providerPayloadCount === 0 || packet.requestManifests === 0) return "blocked";
  if (packet.readinessScore < input.qualityFloor || riskLevel === "high") return "quality_hold";

  return "ready_to_claim";
}

function launchExecutionBlockersForPacket(
  packet: RevenueBusinessFleetManualLaunchQueuePacket,
  input: RevenueBusinessFleetLaunchExecutionQueueQueryInput
) {
  const blockers: string[] = [];
  const riskLevel = packet.riskLevel.toLowerCase();

  if (!packet.approvalId) blockers.push("Provider payload approval id is missing.");
  if (packet.providerPayloadCount === 0) blockers.push("No approved provider payload drafts are attached.");
  if (packet.requestManifests === 0) blockers.push("No locked request manifests are attached.");
  if (packet.manualSteps.length === 0) blockers.push("No operator manual launch steps are attached.");
  if (packet.readinessScore < input.qualityFloor) blockers.push(`Readiness score ${packet.readinessScore} is below quality floor ${input.qualityFloor}.`);
  if (riskLevel === "high") blockers.push("High-risk operations pack must be repaired before launch claiming.");

  return blockers;
}

function buildRevenueBusinessFleetLaunchExecutionLease(
  packet: RevenueBusinessFleetManualLaunchQueuePacket,
  input: RevenueBusinessFleetLaunchExecutionQueueQueryInput,
  index: number,
  generatedAtDate: Date
) {
  const blockers = launchExecutionBlockersForPacket(packet, input);
  const status = launchExecutionLeaseStatusForPacket(packet, input);
  const dedupeKey = `manual_launch:${packet.storeId}:${packet.approvalId ?? packet.packetId}`;
  const idempotencyKey = createHash("sha1")
    .update(`business-fleet-launch-execution:${dedupeKey}:${packet.readinessScore}:${packet.requestManifests}`)
    .digest("hex")
    .slice(0, 24);
  const shardId = `launch-shard-${String((index % input.shardCount) + 1).padStart(2, "0")}`;
  const expiresAt = new Date(generatedAtDate.getTime() + 15 * 60 * 1000).toISOString();

  return {
    action: "operator_manual_launch" as const,
    approvalId: packet.approvalId,
    blockers,
    businessName: packet.businessName,
    claimOrder: null as number | null,
    dedupeKey,
    expectedInternalEffect: "Claim one approved manual launch packet for operator execution review without contacting external providers.",
    expiresAt,
    externalExecution: false as const,
    idempotencyKey,
    leaseId: `business_fleet_launch_lease_${idempotencyKey}`,
    manualSteps: packet.manualSteps,
    nextInternalState: status === "ready_to_claim"
      ? "operator_launch_claim_ready"
      : status === "approval_hold"
        ? "awaiting_provider_packet_approval"
        : status === "quality_hold"
          ? "repair_before_launch_claim"
          : "blocked_rebuild_launch_packet",
    packetId: packet.packetId,
    priority: index + 1,
    providerContacted: false as const,
    qualityGates: {
      approvalPresent: Boolean(packet.approvalId),
      manualStepsPresent: packet.manualSteps.length > 0,
      providerPayloadsPresent: packet.providerPayloadCount > 0,
      readinessScoreFloorPassed: packet.readinessScore >= input.qualityFloor,
      requestManifestsPresent: packet.requestManifests > 0,
      riskAccepted: packet.riskLevel.toLowerCase() !== "high"
    },
    readinessScore: packet.readinessScore,
    reason: blockers.length > 0
      ? blockers[0]!
      : `${packet.businessName} can be claimed for a manual launch execution review.`,
    requestManifests: packet.requestManifests,
    riskLevel: packet.riskLevel,
    shardId,
    sourceKey: packet.sourceKey,
    status,
    storeId: packet.storeId,
    summary: packet.summary
  };
}

function applyRevenueBusinessFleetLaunchExecutionCapacity(
  leases: ReturnType<typeof buildRevenueBusinessFleetLaunchExecutionLease>[],
  input: RevenueBusinessFleetLaunchExecutionQueueQueryInput
) {
  const claimedDedupeKeys = new Set<string>();
  const shardCounts = new Map<string, number>();
  let claimOrder = 0;

  return leases.map((lease) => {
    if (lease.status !== "ready_to_claim") return lease;

    if (claimedDedupeKeys.has(lease.dedupeKey)) {
      return {
        ...lease,
        blockers: [...lease.blockers, "Duplicate launch execution dedupe key detected."],
        nextInternalState: "blocked_rebuild_launch_packet",
        reason: "Duplicate launch execution dedupe key detected.",
        status: "blocked" as const
      };
    }

    const currentShardClaims = shardCounts.get(lease.shardId) ?? 0;

    if (currentShardClaims >= input.maxLeasesPerShard) {
      return {
        ...lease,
        blockers: [...lease.blockers, `Shard ${lease.shardId} already has ${input.maxLeasesPerShard} claimable launch lease${input.maxLeasesPerShard === 1 ? "" : "s"} in this cycle.`],
        nextInternalState: "waiting_for_shard_capacity",
        reason: `Shard ${lease.shardId} is at the configured launch claim cap.`,
        status: "waiting_parallel_capacity" as const
      };
    }

    claimOrder += 1;
    claimedDedupeKeys.add(lease.dedupeKey);
    shardCounts.set(lease.shardId, currentShardClaims + 1);

    return {
      ...lease,
      claimOrder
    };
  });
}

async function buildRevenueBusinessFleetLaunchExecutionQueueForUser(
  userId: string,
  input: RevenueBusinessFleetLaunchExecutionQueueQueryInput
) {
  const launchGate = await buildRevenueBusinessFleetLaunchGateForUser(userId, revenueBusinessFleetLaunchGateQuerySchema.parse({
    maxStores: input.maxStores,
    sourceKeys: input.sourceKeys
  }));
  const generatedAtDate = new Date();
  const baseLeases = launchGate.plan.readyQueue
    .slice(0, input.maxLeases)
    .map((packet, index) => buildRevenueBusinessFleetLaunchExecutionLease(packet, input, index, generatedAtDate));
  const leases = applyRevenueBusinessFleetLaunchExecutionCapacity(baseLeases, input);
  const statusCount = (status: RevenueBusinessFleetLaunchExecutionLeaseStatus) => leases.filter((lease) => lease.status === status).length;
  const dedupeCounts = leases.reduce<Map<string, number>>((counts, lease) => {
    counts.set(lease.dedupeKey, (counts.get(lease.dedupeKey) ?? 0) + 1);

    return counts;
  }, new Map());
  const duplicateDedupeKeys = Array.from(dedupeCounts.values()).filter((count) => count > 1).length;
  const readyToClaim = statusCount("ready_to_claim");

  return {
    plan: {
      auditEvents: [
        "Business fleet launch execution queue derived from launch-gate ready packets.",
        "Queue leases are internal claim/audit objects only.",
        "No provider, marketplace, payment, social, ad, browser, or external write action was executed."
      ],
      blockedExternalActions: uniqueStrings([
        ...launchGate.plan.blockedExternalActions,
        "Calling provider, marketplace, ad, social, browser, payment, payout, bank, or upload write APIs from launch execution leases",
        "Treating a launch execution lease as public-launch approval or proof of external provider completion",
        "Using browser stealth, anti-detection, or platform-evasion automation"
      ]),
      externalExecution: false as const,
      generatedAt: generatedAtDate.toISOString(),
      launchGate: {
        readyQueue: launchGate.plan.readyQueue.length,
        statusCounts: launchGate.plan.statusCounts,
        summary: launchGate.plan.summary,
        totals: launchGate.plan.totals
      },
      leases,
      mode: "Revenue Business Fleet Launch Execution Queue" as const,
      providerContacted: false as const,
      qualityFloor: input.qualityFloor,
      shardPolicy: {
        maxLeasesPerShard: input.maxLeasesPerShard,
        shardCount: input.shardCount
      },
      summary: `${leases.length} launch execution lease${leases.length === 1 ? "" : "s"} prepared from ${launchGate.plan.readyQueue.length} manual-ready packet${launchGate.plan.readyQueue.length === 1 ? "" : "s"}: ${readyToClaim} ready to claim, ${statusCount("approval_hold")} approval-held, ${statusCount("quality_hold")} quality-held, ${statusCount("waiting_parallel_capacity")} waiting on shard capacity, ${statusCount("blocked")} blocked. External execution remains locked.`,
      targetedSourceKeys: launchGate.plan.targetedSourceKeys,
      totals: {
        approvalHold: statusCount("approval_hold"),
        blocked: statusCount("blocked"),
        cleanParallelLeases: readyToClaim,
        duplicateDedupeKeys,
        leases: leases.length,
        maxSelectableLeases: Math.min(input.maxLeases, readyToClaim),
        qualityHold: statusCount("quality_hold"),
        readyToClaim,
        storesEvaluated: launchGate.plan.totals.storesEvaluated,
        waitingParallelCapacity: statusCount("waiting_parallel_capacity")
      }
    }
  };
}

async function applyRevenueBusinessFleetLaunchExecutionQueue(
  userId: string,
  input: ApplyRevenueBusinessFleetLaunchExecutionQueueInput
) {
  const queue = await buildRevenueBusinessFleetLaunchExecutionQueueForUser(userId, revenueBusinessFleetLaunchExecutionQueueQuerySchema.parse({
    maxLeases: input.maxLeases,
    maxLeasesPerShard: input.maxLeasesPerShard,
    maxStores: input.maxStores,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    sourceKeys: input.sourceKeys
  }));
  const requestedLeaseIds = new Set(input.leaseIds);
  const selectedLeases = queue.plan.leases
    .filter((lease) => lease.status === "ready_to_claim")
    .filter((lease) => requestedLeaseIds.size === 0 || requestedLeaseIds.has(lease.leaseId))
    .slice(0, input.maxLeases);

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        dryRun: true,
        externalExecution: false as const,
        leasesPreviewed: selectedLeases.length,
        leasesRecorded: 0,
        leasesSelected: selectedLeases.length,
        providerContacted: false as const,
        summary: `${selectedLeases.length} launch execution lease${selectedLeases.length === 1 ? "" : "s"} would be recorded for internal operator claiming.`
      },
      plan: queue.plan,
      selectedLeases
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.business_fleet_launch_execution_queue.recorded",
    actorUserId: userId,
    metadata: {
      externalExecution: false,
      leases: selectedLeases.map((lease) => ({
        businessName: lease.businessName,
        claimOrder: lease.claimOrder,
        idempotencyKey: lease.idempotencyKey,
        leaseId: lease.leaseId,
        packetId: lease.packetId,
        readinessScore: lease.readinessScore,
        shardId: lease.shardId,
        sourceKey: lease.sourceKey,
        storeId: lease.storeId
      })),
      note: input.note ?? null,
      providerContacted: false,
      source: "revenue.business_fleet_launch_execution_queue"
    },
    outcome: "success",
    severity: selectedLeases.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_business_fleet_launch_execution_queue"
  });

  return {
    applied: {
      auditLogId: auditLog.id,
      dryRun: false,
      externalExecution: false as const,
      leasesPreviewed: 0,
      leasesRecorded: selectedLeases.length,
      leasesSelected: selectedLeases.length,
      providerContacted: false as const,
      summary: `${selectedLeases.length} launch execution lease${selectedLeases.length === 1 ? "" : "s"} recorded for internal operator claiming. External execution remains locked.`
    },
    plan: queue.plan,
    selectedLeases
  };
}

type RevenueBusinessFleetLaunchExecutionQueuePlan = Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchExecutionQueueForUser>>["plan"];
type RevenueBusinessFleetLaunchExecutionLease = RevenueBusinessFleetLaunchExecutionQueuePlan["leases"][number];
type RevenueBusinessFleetLaunchWorkerAssignmentStatus =
  | "approval_hold"
  | "blocked"
  | "ready_to_assign"
  | "waiting_dependency";

const revenueBusinessFleetLaunchAssignmentBlockedExternalActions = [
  "Treating a worker assignment as permission to publish products, listings, stores, content, ads, payments, payouts, browsers, uploads, or external API writes",
  "Using worker assignments as proof of provider completion, marketplace launch, public launch approval, or money movement",
  "Using browser stealth, anti-detection, or platform-evasion automation"
];

function launchWorkerAssignmentStatusForLease(lease: RevenueBusinessFleetLaunchExecutionLease): RevenueBusinessFleetLaunchWorkerAssignmentStatus {
  if (lease.status === "ready_to_claim") return "ready_to_assign";
  if (lease.status === "approval_hold") return "approval_hold";
  if (lease.status === "blocked") return "blocked";

  return "waiting_dependency";
}

function launchWorkerDefinition(index: number) {
  const workerNumber = index + 1;
  const padded = String(workerNumber).padStart(2, "0");

  return {
    lane: "manual_launch_operator" as const,
    workerId: `launch_worker_${padded}`,
    workerName: `Launch Operator Lane ${padded}`
  };
}

function buildRevenueBusinessFleetLaunchWorkerAssignmentsPlan(
  queue: RevenueBusinessFleetLaunchExecutionQueuePlan,
  input: RevenueBusinessFleetLaunchWorkerAssignmentsQueryInput
) {
  const sortedLeases = queue.leases.slice().sort((left, right) => (
    (left.claimOrder || Number.MAX_SAFE_INTEGER) - (right.claimOrder || Number.MAX_SAFE_INTEGER)
    || right.priority - left.priority
    || left.status.localeCompare(right.status)
    || left.businessName.localeCompare(right.businessName)
  ));
  const workerCounts = new Map<string, number>();
  const claimedDedupeKeys = new Set<string>();
  let readyClaimOrder = 0;
  const assignments = sortedLeases.map((lease, index) => {
    const definition = launchWorkerDefinition(index % input.maxWorkers);
    const workerAssigned = workerCounts.get(definition.workerId) ?? 0;
    const baseStatus = launchWorkerAssignmentStatusForLease(lease);
    const canAssign = baseStatus === "ready_to_assign"
      && readyClaimOrder < input.maxAssignments
      && workerAssigned < input.maxAssignmentsPerWorker
      && !claimedDedupeKeys.has(lease.dedupeKey);
    const status: RevenueBusinessFleetLaunchWorkerAssignmentStatus = canAssign ? "ready_to_assign" : baseStatus === "ready_to_assign" ? "waiting_dependency" : baseStatus;
    const claimOrder = canAssign ? readyClaimOrder + 1 : 0;
    const assignmentId = `business_fleet_launch_assignment_${createHash("sha1").update(`business-fleet-launch-worker-assignment:${lease.leaseId}:${definition.workerId}`).digest("hex").slice(0, 24)}`;

    if (canAssign) {
      readyClaimOrder += 1;
      workerCounts.set(definition.workerId, workerAssigned + 1);
      claimedDedupeKeys.add(lease.dedupeKey);
    }

    return {
      assignmentId,
      blockedExternalActions: revenueBusinessFleetLaunchAssignmentBlockedExternalActions,
      claimOrder,
      completionGate: "record_manual_launch_evidence" as const,
      dedupeKey: lease.dedupeKey,
      evidenceRequired: [
        "operator_manual_launch_notes",
        "store_or_listing_preview_reference",
        "post_launch_risk_check",
        "cash_loop_signal_capture_ready"
      ],
      expectedInternalEffect: "Assign one launch execution lease to an internal operator lane for manual launch completion evidence.",
      externalExecution: false as const,
      idempotencyKey: createHash("sha1").update(`business-fleet-launch-worker-assignment-idempotency:${assignmentId}`).digest("hex").slice(0, 24),
      lane: definition.lane,
      leaseExpiresAt: lease.expiresAt,
      leaseId: lease.leaseId,
      nextInternalState: status === "ready_to_assign"
        ? "operator_claim_ready"
        : status === "approval_hold"
          ? "awaiting_provider_packet_approval"
          : status === "blocked"
            ? "blocked_rebuild_launch_packet"
            : "waiting_for_clean_launch_lease",
      packetId: lease.packetId,
      priority: lease.priority,
      providerContacted: false as const,
      readinessScore: lease.readinessScore,
      retryPolicy: {
        backoffMinutes: 5,
        maxAttempts: 2,
        requiresFreshQueueAfterFailure: true
      },
      riskLevel: lease.riskLevel,
      shardId: lease.shardId,
      sourceKey: lease.sourceKey,
      status,
      storeId: lease.storeId,
      storeName: lease.businessName,
      summary: canAssign
        ? `${definition.workerName} can claim ${lease.businessName} manual launch execution at order ${claimOrder}.`
        : `${definition.workerName} keeps ${lease.businessName} manual launch execution in ${status.replace(/_/g, " ")} state.`,
      workerId: definition.workerId,
      workerName: definition.workerName
    };
  });
  const statusCount = (status: RevenueBusinessFleetLaunchWorkerAssignmentStatus) => assignments.filter((assignment) => assignment.status === status).length;
  const workers = Array.from({ length: input.maxWorkers }, (_, index) => {
    const definition = launchWorkerDefinition(index);
    const workerAssignments = assignments.filter((assignment) => assignment.workerId === definition.workerId);
    const workerStatusCount = (status: RevenueBusinessFleetLaunchWorkerAssignmentStatus) => workerAssignments.filter((assignment) => assignment.status === status).length;
    const status = workerStatusCount("ready_to_assign") > 0
      ? "ready"
      : workerStatusCount("approval_hold") > 0
        ? "approval_hold"
        : workerStatusCount("blocked") > 0
          ? "blocked"
          : "waiting";

    return {
      assignments: workerAssignments,
      blockedExternalActions: revenueBusinessFleetLaunchAssignmentBlockedExternalActions,
      externalExecution: false as const,
      lane: definition.lane,
      nextInternalAction: workerStatusCount("ready_to_assign") > 0
        ? `Claim ${workerStatusCount("ready_to_assign")} manual launch assignment${workerStatusCount("ready_to_assign") === 1 ? "" : "s"} and capture completion evidence.`
        : workerStatusCount("approval_hold") > 0
          ? "Resolve approval-held launch packets before this worker can claim."
          : workerStatusCount("blocked") > 0
            ? "Repair blocked launch leases before this worker can advance."
            : "Wait for ready launch execution leases.",
      providerContacted: false as const,
      status,
      summary: `${definition.workerName} has ${workerStatusCount("ready_to_assign")} ready assignment${workerStatusCount("ready_to_assign") === 1 ? "" : "s"}, ${workerStatusCount("approval_hold")} approval-held, ${workerStatusCount("waiting_dependency")} waiting, and ${workerStatusCount("blocked")} blocked.`,
      totals: {
        approvalHold: workerStatusCount("approval_hold"),
        assigned: workerStatusCount("ready_to_assign"),
        blocked: workerStatusCount("blocked"),
        readyToAssign: workerStatusCount("ready_to_assign"),
        waitingDependency: workerStatusCount("waiting_dependency")
      },
      workerCapacity: input.maxAssignmentsPerWorker,
      workerId: definition.workerId,
      workerName: definition.workerName
    };
  });
  const dedupeCounts = assignments.reduce<Map<string, number>>((counts, assignment) => {
    counts.set(assignment.dedupeKey, (counts.get(assignment.dedupeKey) ?? 0) + 1);

    return counts;
  }, new Map());
  const duplicateDedupeKeys = Array.from(dedupeCounts.values()).filter((count) => count > 1).length;

  return {
    assignments,
    auditEvents: [
      "Business fleet launch worker assignment plan routed launch execution leases into capped internal operator lanes.",
      "Assignments require evidence capture before completion and do not execute external providers.",
      "Each assignment keeps lease id, dedupe key, shard id, worker id, retry policy, and idempotency key visible for audit and retry control."
    ],
    blockedExternalActions: revenueBusinessFleetLaunchAssignmentBlockedExternalActions,
    externalExecution: false as const,
    generatedAt: new Date().toISOString(),
    mode: "Revenue Business Fleet Launch Worker Assignment Plan" as const,
    providerContacted: false as const,
    queue: {
      summary: queue.summary,
      totals: queue.totals
    },
    summary: `${statusCount("ready_to_assign")} launch worker assignment${statusCount("ready_to_assign") === 1 ? "" : "s"} ready across ${workers.length} operator lane${workers.length === 1 ? "" : "s"}; ${statusCount("approval_hold")} approval-held, ${statusCount("waiting_dependency")} waiting, and ${statusCount("blocked")} blocked. External execution remains locked.`,
    targetedSourceKeys: queue.targetedSourceKeys,
    totals: {
      approvalHold: statusCount("approval_hold"),
      assigned: statusCount("ready_to_assign"),
      blocked: statusCount("blocked"),
      duplicateDedupeKeys,
      evidencePacketsRequired: statusCount("ready_to_assign"),
      maxSelectableAssignments: Math.min(input.maxAssignments, statusCount("ready_to_assign")),
      readyToAssign: statusCount("ready_to_assign"),
      waitingDependency: statusCount("waiting_dependency"),
      workerCount: workers.length
    },
    workers
  };
}

async function buildRevenueBusinessFleetLaunchWorkerAssignmentsForUser(
  userId: string,
  input: RevenueBusinessFleetLaunchWorkerAssignmentsQueryInput
) {
  const queue = await buildRevenueBusinessFleetLaunchExecutionQueueForUser(userId, revenueBusinessFleetLaunchExecutionQueueQuerySchema.parse({
    maxLeases: input.maxLeases,
    maxLeasesPerShard: input.maxLeasesPerShard,
    maxStores: input.maxStores,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    sourceKeys: input.sourceKeys
  }));

  return {
    plan: buildRevenueBusinessFleetLaunchWorkerAssignmentsPlan(queue.plan, input)
  };
}

function launchWorkerAssignmentStatusCounts(assignments: ReturnType<typeof buildRevenueBusinessFleetLaunchWorkerAssignmentsPlan>["assignments"]) {
  return assignments.reduce<Record<string, number>>((counts, assignment) => {
    counts[assignment.status] = (counts[assignment.status] ?? 0) + 1;

    return counts;
  }, {});
}

function launchWorkerAssignmentWorkerCounts(assignments: ReturnType<typeof buildRevenueBusinessFleetLaunchWorkerAssignmentsPlan>["assignments"]) {
  return assignments.reduce<Record<string, number>>((counts, assignment) => {
    counts[assignment.workerId] = (counts[assignment.workerId] ?? 0) + 1;

    return counts;
  }, {});
}

async function applyRevenueBusinessFleetLaunchWorkerAssignments(
  userId: string,
  input: ApplyRevenueBusinessFleetLaunchWorkerAssignmentsInput
) {
  const plan = await buildRevenueBusinessFleetLaunchWorkerAssignmentsForUser(userId, revenueBusinessFleetLaunchWorkerAssignmentsQuerySchema.parse({
    maxAssignments: input.maxAssignments,
    maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
    maxLeases: input.maxLeases,
    maxLeasesPerShard: input.maxLeasesPerShard,
    maxStores: input.maxStores,
    maxWorkers: input.maxWorkers,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    sourceKeys: input.sourceKeys
  }));
  const requestedAssignmentIds = new Set(input.assignmentIds);
  const selectedAssignments = plan.plan.assignments
    .filter((assignment) => assignment.status === "ready_to_assign")
    .filter((assignment) => requestedAssignmentIds.size === 0 || requestedAssignmentIds.has(assignment.assignmentId))
    .slice(0, input.maxAssignments);
  const statusCounts = launchWorkerAssignmentStatusCounts(selectedAssignments);
  const workerCounts = launchWorkerAssignmentWorkerCounts(selectedAssignments);
  const storeIds = [...new Set(selectedAssignments.map((assignment) => assignment.storeId))];
  const summary = input.dryRun
    ? `${selectedAssignments.length} launch worker assignment${selectedAssignments.length === 1 ? "" : "s"} would be recorded for internal operator claiming.`
    : `${selectedAssignments.length} launch worker assignment${selectedAssignments.length === 1 ? "" : "s"} recorded for internal operator claiming.`;

  if (input.dryRun) {
    return {
      applied: {
        assignmentsPreviewed: selectedAssignments.length,
        assignmentsRecorded: 0,
        assignmentsSelected: selectedAssignments.length,
        auditLogId: null,
        dryRun: true,
        evidencePacketsRequired: selectedAssignments.length,
        externalExecution: false as const,
        providerContacted: false as const,
        readyToAssign: selectedAssignments.length,
        statusCounts,
        storesCovered: storeIds.length,
        summary,
        workerCounts,
        workersCovered: Object.keys(workerCounts).length
      },
      assignments: selectedAssignments,
      plan: plan.plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.business_fleet_launch_worker_assignments.recorded",
    actorUserId: userId,
    metadata: {
      assignmentTotals: plan.plan.totals,
      assignments: selectedAssignments.map((assignment) => ({
        assignmentId: assignment.assignmentId,
        claimOrder: assignment.claimOrder,
        completionGate: assignment.completionGate,
        dedupeKey: assignment.dedupeKey,
        evidenceRequired: assignment.evidenceRequired,
        idempotencyKey: assignment.idempotencyKey,
        leaseExpiresAt: assignment.leaseExpiresAt,
        leaseId: assignment.leaseId,
        packetId: assignment.packetId,
        retryPolicy: assignment.retryPolicy,
        shardId: assignment.shardId,
        sourceKey: assignment.sourceKey,
        status: assignment.status,
        storeId: assignment.storeId,
        storeName: assignment.storeName,
        workerId: assignment.workerId,
        workerName: assignment.workerName
      })),
      externalExecution: false,
      note: input.note ?? null,
      providerContacted: false,
      statusCounts,
      summary,
      workerCounts
    },
    outcome: selectedAssignments.length > 0 ? "success" : "failure",
    severity: selectedAssignments.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_business_fleet_launch_worker_assignments"
  });

  return {
    applied: {
      assignmentsPreviewed: 0,
      assignmentsRecorded: selectedAssignments.length,
      assignmentsSelected: selectedAssignments.length,
      auditLogId: auditLog.id,
      dryRun: false,
      evidencePacketsRequired: selectedAssignments.length,
      externalExecution: false as const,
      providerContacted: false as const,
      readyToAssign: selectedAssignments.length,
      statusCounts,
      storesCovered: storeIds.length,
      summary: `${summary} External execution remains locked.`,
      workerCounts,
      workersCovered: Object.keys(workerCounts).length
    },
    assignments: selectedAssignments,
    plan: plan.plan
  };
}

type RevenueBusinessFleetLaunchWorkerAssignmentPlan = Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchWorkerAssignmentsForUser>>["plan"];
type RevenueBusinessFleetLaunchWorkerAssignment = RevenueBusinessFleetLaunchWorkerAssignmentPlan["assignments"][number];
type RevenueBusinessFleetManualLaunchEvidenceStatus =
  | "blocked"
  | "completed"
  | "ready_for_evidence";

function businessFleetManualLaunchEvidenceStatusForAssignment(assignment: RevenueBusinessFleetLaunchWorkerAssignment): RevenueBusinessFleetManualLaunchEvidenceStatus {
  if (assignment.status !== "ready_to_assign") return "blocked";

  return "ready_for_evidence";
}

function businessFleetManualLaunchEvidenceBlockers(assignment: RevenueBusinessFleetLaunchWorkerAssignment, operatorCompletedManualStep: boolean) {
  const blockers = [
    assignment.status === "ready_to_assign" ? null : `Assignment is ${assignment.status.replace(/_/g, " ")}.`,
    assignment.evidenceRequired.length > 0 ? null : "Assignment has no evidence requirements.",
    operatorCompletedManualStep ? null : "Operator completion must be true before evidence can be recorded."
  ].filter((blocker): blocker is string => Boolean(blocker));

  return blockers;
}

function businessFleetManualEvidenceCategoryLabel(category: string) {
  return category.replace(/_/g, " ");
}

function businessFleetManualLaunchEvidencePacket(
  assignment: RevenueBusinessFleetLaunchWorkerAssignment,
  operatorCompletedManualStep: boolean,
  evidenceCategory: string
) {
  const blockers = businessFleetManualLaunchEvidenceBlockers(assignment, operatorCompletedManualStep);
  const status = blockers.length > 0 ? "blocked" as const : businessFleetManualLaunchEvidenceStatusForAssignment(assignment);

  return {
    assignmentId: assignment.assignmentId,
    auditLogId: null as string | null,
    blockers,
    businessName: assignment.storeName,
    completionGate: assignment.completionGate,
    dedupeKey: assignment.dedupeKey,
    evidenceCategory,
    evidenceRequired: assignment.evidenceRequired,
    externalExecution: false as const,
    leaseId: assignment.leaseId,
    nextInternalState: status === "ready_for_evidence" ? "manual_launch_evidence_ready_to_record" : "repair_launch_assignment_before_evidence",
    operatorCompletedManualStep,
    packetId: `business_fleet_manual_launch_evidence_${assignment.assignmentId}`,
    providerContacted: false as const,
    readinessScore: assignment.readinessScore,
    reason: blockers[0] ?? `${assignment.storeName} is ready for ${businessFleetManualEvidenceCategoryLabel(evidenceCategory)} evidence recording.`,
    retryPolicy: assignment.retryPolicy,
    riskLevel: assignment.riskLevel,
    shardId: assignment.shardId,
    sourceKey: assignment.sourceKey,
    status,
    storeId: assignment.storeId,
    summary: blockers.length > 0
      ? `${assignment.storeName} manual launch evidence is blocked: ${blockers.join(" ")}`
      : `${assignment.workerName} can close ${assignment.storeName} manual launch assignment with ${businessFleetManualEvidenceCategoryLabel(evidenceCategory)} evidence.`,
    workerId: assignment.workerId,
    workerName: assignment.workerName
  };
}

async function buildRevenueBusinessFleetManualLaunchEvidenceForUser(
  userId: string,
  input: RevenueBusinessFleetManualLaunchEvidenceQueryInput
) {
  const assignmentsPlan = await buildRevenueBusinessFleetLaunchWorkerAssignmentsForUser(userId, revenueBusinessFleetLaunchWorkerAssignmentsQuerySchema.parse({
    maxAssignments: input.maxAssignments,
    maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
    maxLeases: input.maxLeases,
    maxLeasesPerShard: input.maxLeasesPerShard,
    maxStores: input.maxStores,
    maxWorkers: input.maxWorkers,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    sourceKeys: input.sourceKeys
  }));
  const requestedAssignmentIds = new Set(input.assignmentIds);
  const evidenceCategory = "operator_notes";
  const packets = assignmentsPlan.plan.assignments
    .filter((assignment) => requestedAssignmentIds.size === 0 || requestedAssignmentIds.has(assignment.assignmentId))
    .slice(0, input.maxAssignments)
    .map((assignment) => businessFleetManualLaunchEvidencePacket(assignment, true, evidenceCategory));
  const statusCount = (status: RevenueBusinessFleetManualLaunchEvidenceStatus) => packets.filter((packet) => packet.status === status).length;

  return {
    plan: {
      assignments: {
        summary: assignmentsPlan.plan.summary,
        totals: assignmentsPlan.plan.totals
      },
      auditEvents: [
        "Business fleet manual launch evidence packets derived from ready launch worker assignments.",
        "Evidence packets close internal launch claims only; they do not perform external launch work.",
        "Completed evidence remains audit-log based and feeds later performance/signal capture."
      ],
      blockedExternalActions: [
        ...revenueBusinessFleetLaunchAssignmentBlockedExternalActions,
        "Recording evidence without operator completion",
        "Treating evidence as automated provider, marketplace, browser, payment, payout, social, ad, or upload execution"
      ],
      externalExecution: false as const,
      generatedAt: new Date().toISOString(),
      mode: "Revenue Business Fleet Manual Launch Evidence" as const,
      packets,
      providerContacted: false as const,
      summary: `${packets.length} manual launch evidence packet${packets.length === 1 ? "" : "s"} prepared from launch worker assignments: ${statusCount("ready_for_evidence")} ready, ${statusCount("blocked")} blocked. External execution remains locked.`,
      targetedSourceKeys: assignmentsPlan.plan.targetedSourceKeys,
      totals: {
        blocked: statusCount("blocked"),
        completed: statusCount("completed"),
        evidencePackets: packets.length,
        maxSelectableEvidence: Math.min(input.maxAssignments, statusCount("ready_for_evidence")),
        readyForEvidence: statusCount("ready_for_evidence"),
        storesCovered: new Set(packets.map((packet) => packet.storeId)).size,
        workersCovered: new Set(packets.map((packet) => packet.workerId)).size
      }
    }
  };
}

async function applyRevenueBusinessFleetManualLaunchEvidence(
  userId: string,
  input: ApplyRevenueBusinessFleetManualLaunchEvidenceInput
) {
  const assignmentsPlan = await buildRevenueBusinessFleetLaunchWorkerAssignmentsForUser(userId, revenueBusinessFleetLaunchWorkerAssignmentsQuerySchema.parse({
    maxAssignments: input.maxAssignments,
    maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
    maxLeases: input.maxLeases,
    maxLeasesPerShard: input.maxLeasesPerShard,
    maxStores: input.maxStores,
    maxWorkers: input.maxWorkers,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    sourceKeys: input.sourceKeys
  }));
  const requestedAssignmentIds = new Set(input.assignmentIds);
  const completedAt = input.completedAt ?? new Date().toISOString();
  const packets = assignmentsPlan.plan.assignments
    .filter((assignment) => requestedAssignmentIds.size === 0 || requestedAssignmentIds.has(assignment.assignmentId))
    .slice(0, input.maxAssignments)
    .map((assignment) => businessFleetManualLaunchEvidencePacket(assignment, input.operatorCompletedManualStep, input.evidenceCategory));
  const selectedPackets = packets.filter((packet) => packet.status === "ready_for_evidence");
  const blockedPackets = packets.filter((packet) => packet.status === "blocked");

  if (input.dryRun) {
    return {
      applied: {
        approvalPhrase: input.approvalPhrase,
        auditLogIds: [] as string[],
        blockedExternalActions: revenueBusinessFleetLaunchAssignmentBlockedExternalActions,
        blockedPackets: blockedPackets.length,
        completedAt,
        dryRun: true,
        evidenceCategory: input.evidenceCategory,
        evidencePreviewed: selectedPackets.length,
        evidenceRecorded: 0,
        evidenceSelected: selectedPackets.length,
        externalExecution: false as const,
        operatorCompletedManualStep: input.operatorCompletedManualStep,
        providerContacted: false as const,
        summary: `${selectedPackets.length} business-fleet manual launch evidence packet${selectedPackets.length === 1 ? "" : "s"} would be recorded. ${blockedPackets.length} blocked.`
      },
      packets,
      plan: (await buildRevenueBusinessFleetManualLaunchEvidenceForUser(userId, revenueBusinessFleetManualLaunchEvidenceQuerySchema.parse({
        assignmentIds: input.assignmentIds,
        maxAssignments: input.maxAssignments,
        maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
        maxLeases: input.maxLeases,
        maxLeasesPerShard: input.maxLeasesPerShard,
        maxStores: input.maxStores,
        maxWorkers: input.maxWorkers,
        qualityFloor: input.qualityFloor,
        shardCount: input.shardCount,
        sourceKeys: input.sourceKeys
      }))).plan,
      selectedPackets
    };
  }

  const auditLogs = await Promise.all(selectedPackets.map((packet) => recordAuditLog({
    action: "revenue.business_fleet.manual_launch_evidence.recorded",
    actorUserId: userId,
    metadata: {
      approvalPhrase: input.approvalPhrase,
      assignmentId: packet.assignmentId,
      blockedExternalActions: revenueBusinessFleetLaunchAssignmentBlockedExternalActions,
      completedAt,
      completionGate: packet.completionGate,
      dedupeKey: packet.dedupeKey,
      dryRun: false,
      evidenceCategory: input.evidenceCategory,
      evidenceNote: input.evidenceNote ?? null,
      evidenceRequired: packet.evidenceRequired,
      externalExecution: false,
      leaseId: packet.leaseId,
      operatorCompletedManualStep: input.operatorCompletedManualStep,
      providerContacted: false,
      requiredConfirmation: "RECORD INTERNAL BUSINESS FLEET MANUAL LAUNCH EVIDENCE",
      retryPolicy: packet.retryPolicy,
      shardId: packet.shardId,
      sourceKey: packet.sourceKey,
      storeId: packet.storeId,
      storeName: packet.businessName,
      summary: `${packet.businessName} business-fleet manual launch evidence recorded: ${businessFleetManualEvidenceCategoryLabel(input.evidenceCategory)}. External execution remains locked.`,
      workerId: packet.workerId,
      workerName: packet.workerName
    },
    outcome: "success",
    severity: "medium",
    targetId: packet.storeId,
    targetType: "revenue_business_fleet_manual_launch_evidence"
  })));
  const plan = await buildRevenueBusinessFleetManualLaunchEvidenceForUser(userId, revenueBusinessFleetManualLaunchEvidenceQuerySchema.parse({
    assignmentIds: input.assignmentIds,
    maxAssignments: input.maxAssignments,
    maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
    maxLeases: input.maxLeases,
    maxLeasesPerShard: input.maxLeasesPerShard,
    maxStores: input.maxStores,
    maxWorkers: input.maxWorkers,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    sourceKeys: input.sourceKeys
  }));

  return {
    applied: {
      approvalPhrase: input.approvalPhrase,
      auditLogIds: auditLogs.map((log) => log.id),
      blockedExternalActions: revenueBusinessFleetLaunchAssignmentBlockedExternalActions,
      blockedPackets: blockedPackets.length,
      completedAt,
      dryRun: false,
      evidenceCategory: input.evidenceCategory,
      evidencePreviewed: 0,
      evidenceRecorded: auditLogs.length,
      evidenceSelected: selectedPackets.length,
      externalExecution: false as const,
      operatorCompletedManualStep: input.operatorCompletedManualStep,
      providerContacted: false as const,
      summary: `${auditLogs.length} business-fleet manual launch evidence packet${auditLogs.length === 1 ? "" : "s"} recorded. External execution remains locked.`
    },
    packets: plan.plan.packets.map((packet) => {
      const auditLog = auditLogs.find((log) => log.targetId === packet.storeId);

      return auditLog && packet.status === "ready_for_evidence"
        ? {
          ...packet,
          auditLogId: auditLog.id,
          nextInternalState: "manual_launch_evidence_recorded",
          status: "completed" as const
        }
        : packet;
    }),
    plan: plan.plan,
    selectedPackets
  };
}

type RevenueBusinessFleetLaunchControlStatus =
  | "blocked"
  | "needs_launch_gap"
  | "needs_launch_package"
  | "needs_provider_approval"
  | "needs_execution_queue"
  | "needs_worker_assignment"
  | "ready_for_operator_launch"
  | "ready_for_launch_wave";

type RevenueBusinessFleetLaunchControlStageStatus = "blocked" | "ready" | "waiting";

function launchControlStage(
  stage: string,
  status: RevenueBusinessFleetLaunchControlStageStatus,
  readyCount: number,
  totalCount: number,
  reason: string,
  nextInternalState: string
): {
  nextInternalState: string;
  readyCount: number;
  reason: string;
  stage: string;
  status: RevenueBusinessFleetLaunchControlStageStatus;
  totalCount: number;
} {
  return {
    nextInternalState,
    readyCount,
    reason,
    stage,
    status,
    totalCount
  };
}

function businessFleetLaunchControlNextAction(context: {
  evidenceReady: number;
  executionReady: number;
  launchGate: Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchGateForUser>>["plan"];
  manualLaunchReady: number;
  scheduler: RevenueBusinessFleetPlan;
  workerReady: number;
}): {
  endpoint: string;
  label: string;
  reason: string;
  state: RevenueBusinessFleetLaunchControlStatus;
} {
  if (context.scheduler.capacity.targetGap > 0 && context.scheduler.totals.launchNow < context.scheduler.capacity.launchWaveSize) {
    return {
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap",
      label: "Create or repair launch-wave candidates",
      reason: `${context.scheduler.totals.launchNow}/${context.scheduler.capacity.launchWaveSize} businesses are currently in the launch-now lane.`,
      state: "needs_launch_gap"
    };
  }

  if (context.launchGate.totals.storesEvaluated === 0) {
    return {
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/live-package/apply",
      label: "Record live launch packages",
      reason: "No packaged stores are visible to the launch gate.",
      state: "needs_launch_package"
    };
  }

  if (context.manualLaunchReady === 0 && context.launchGate.totals.approvalNeeded > 0) {
    return {
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/provider-approval-review",
      label: "Review provider approval packets",
      reason: `${context.launchGate.totals.approvalNeeded} packaged lane${context.launchGate.totals.approvalNeeded === 1 ? "" : "s"} need internal provider approval.`,
      state: "needs_provider_approval"
    };
  }

  if (context.manualLaunchReady === 0) {
    return {
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/live-package/apply",
      label: "Repair launch packages",
      reason: `${context.launchGate.totals.repairRequired} packaged lane${context.launchGate.totals.repairRequired === 1 ? "" : "s"} require repair before manual launch.`,
      state: context.launchGate.totals.repairRequired > 0 ? "needs_launch_package" : "blocked"
    };
  }

  if (context.executionReady === 0) {
    return {
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-execution-queue",
      label: "Build launch execution leases",
      reason: `${context.manualLaunchReady} manual-ready lane${context.manualLaunchReady === 1 ? "" : "s"} need clean launch execution leases.`,
      state: "needs_execution_queue"
    };
  }

  if (context.workerReady === 0) {
    return {
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-worker-assignments",
      label: "Assign launch workers",
      reason: `${context.executionReady} clean launch lease${context.executionReady === 1 ? "" : "s"} need internal operator lanes.`,
      state: "needs_worker_assignment"
    };
  }

  if (context.evidenceReady > 0) {
    return {
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/manual-launch-evidence/apply",
      label: "Record manual launch evidence after operator completion",
      reason: `${context.evidenceReady} worker assignment${context.evidenceReady === 1 ? "" : "s"} can accept post-step evidence.`,
      state: "ready_for_operator_launch"
    };
  }

  return {
    endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-wave/apply",
    label: "Preview launch wave",
    reason: "Launch wave has enough internal score and queue context for preview.",
    state: "ready_for_launch_wave"
  };
}

async function buildRevenueBusinessFleetLaunchControlForUser(
  userId: string,
  input: RevenueBusinessFleetLaunchControlQueryInput
) {
  const schedulerInput = revenueBusinessFleetSchedulerQuerySchema.parse({
    launchWaveSize: input.launchWaveSize,
    maxParallelLaunches: input.maxParallelLaunches,
    maxParallelScaleActions: input.maxParallelScaleActions,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    targetBusinesses: input.targetBusinesses
  });
  const launchGateInput = revenueBusinessFleetLaunchGateQuerySchema.parse({
    maxStores: input.maxStores,
    sourceKeys: input.sourceKeys
  });
  const executionInput = revenueBusinessFleetLaunchExecutionQueueQuerySchema.parse({
    maxLeases: input.maxLeases,
    maxLeasesPerShard: input.maxLeasesPerShard,
    maxStores: input.maxStores,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    sourceKeys: input.sourceKeys
  });
  const workerInput = revenueBusinessFleetLaunchWorkerAssignmentsQuerySchema.parse({
    maxAssignments: input.maxAssignments,
    maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
    maxLeases: input.maxLeases,
    maxLeasesPerShard: input.maxLeasesPerShard,
    maxStores: input.maxStores,
    maxWorkers: input.maxWorkers,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    sourceKeys: input.sourceKeys
  });
  const evidenceInput = revenueBusinessFleetManualLaunchEvidenceQuerySchema.parse({
    maxAssignments: input.maxAssignments,
    maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
    maxLeases: input.maxLeases,
    maxLeasesPerShard: input.maxLeasesPerShard,
    maxStores: input.maxStores,
    maxWorkers: input.maxWorkers,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    sourceKeys: input.sourceKeys
  });
  const [scheduler, launchGate, executionQueue, workerAssignments, manualEvidence] = await Promise.all([
    buildRevenueBusinessFleetSchedulerForUser(userId, schedulerInput),
    buildRevenueBusinessFleetLaunchGateForUser(userId, launchGateInput),
    buildRevenueBusinessFleetLaunchExecutionQueueForUser(userId, executionInput),
    buildRevenueBusinessFleetLaunchWorkerAssignmentsForUser(userId, workerInput),
    buildRevenueBusinessFleetManualLaunchEvidenceForUser(userId, evidenceInput)
  ]);
  const safeLaunchReady = Math.min(
    launchGate.plan.totals.manualLaunchReady,
    executionQueue.plan.totals.readyToClaim,
    workerAssignments.plan.totals.readyToAssign,
    manualEvidence.plan.totals.readyForEvidence
  );
  const nextAction = businessFleetLaunchControlNextAction({
    evidenceReady: manualEvidence.plan.totals.readyForEvidence,
    executionReady: executionQueue.plan.totals.readyToClaim,
    launchGate: launchGate.plan,
    manualLaunchReady: launchGate.plan.totals.manualLaunchReady,
    scheduler: scheduler.plan,
    workerReady: workerAssignments.plan.totals.readyToAssign
  });
  const capacityUtilizationPercent = Math.round((safeLaunchReady / Math.max(1, input.launchWaveSize)) * 100);
  const stages = [
    launchControlStage(
      "fleet_scoring",
      scheduler.plan.totals.readyParallel > 0 ? "ready" : "waiting",
      scheduler.plan.totals.readyParallel,
      scheduler.plan.totals.businesses,
      scheduler.plan.summary,
      scheduler.plan.totals.launchNow >= input.launchWaveSize ? "launch_wave_scored" : "expand_or_repair_launch_candidates"
    ),
    launchControlStage(
      "launch_gate",
      launchGate.plan.totals.manualLaunchReady > 0 ? "ready" : launchGate.plan.totals.blocked > 0 ? "blocked" : "waiting",
      launchGate.plan.totals.manualLaunchReady,
      launchGate.plan.totals.storesEvaluated,
      launchGate.plan.summary,
      launchGate.plan.totals.manualLaunchReady > 0 ? "manual_launch_ready" : "repair_or_approve_launch_packages"
    ),
    launchControlStage(
      "execution_queue",
      executionQueue.plan.totals.readyToClaim > 0 ? "ready" : executionQueue.plan.totals.blocked > 0 ? "blocked" : "waiting",
      executionQueue.plan.totals.readyToClaim,
      executionQueue.plan.totals.leases,
      executionQueue.plan.summary,
      executionQueue.plan.totals.readyToClaim > 0 ? "launch_leases_claimable" : "build_clean_launch_execution_leases"
    ),
    launchControlStage(
      "worker_assignments",
      workerAssignments.plan.totals.readyToAssign > 0 ? "ready" : workerAssignments.plan.totals.blocked > 0 ? "blocked" : "waiting",
      workerAssignments.plan.totals.readyToAssign,
      workerAssignments.plan.totals.readyToAssign + workerAssignments.plan.totals.waitingDependency + workerAssignments.plan.totals.approvalHold + workerAssignments.plan.totals.blocked,
      workerAssignments.plan.summary,
      workerAssignments.plan.totals.readyToAssign > 0 ? "operator_lanes_ready" : "assign_internal_operator_lanes"
    ),
    launchControlStage(
      "manual_evidence",
      manualEvidence.plan.totals.readyForEvidence > 0 ? "ready" : manualEvidence.plan.totals.blocked > 0 ? "blocked" : "waiting",
      manualEvidence.plan.totals.readyForEvidence,
      manualEvidence.plan.totals.evidencePackets,
      manualEvidence.plan.summary,
      manualEvidence.plan.totals.readyForEvidence > 0 ? "manual_evidence_gate_ready" : "record_operator_completion_after_manual_step"
    )
  ];

  return {
    plan: {
      auditEvents: [
        "Business fleet launch control aggregates scheduler, launch gate, execution leases, worker assignments, and manual evidence.",
        "Control status is advisory and internal; it does not dispatch external execution.",
        "Swarm readiness is capped by the smallest clean count across gate, lease, worker, and evidence stages."
      ],
      blockedExternalActions: uniqueStrings([
        ...launchGate.plan.blockedExternalActions,
        ...executionQueue.plan.blockedExternalActions,
        ...workerAssignments.plan.blockedExternalActions,
        ...manualEvidence.plan.blockedExternalActions,
        "Auto-launching stores, listings, ads, payments, payouts, browser sessions, uploads, or provider writes from launch control",
        "Using browser stealth, anti-detection, or platform-evasion automation"
      ]),
      externalExecution: false as const,
      generatedAt: new Date().toISOString(),
      mode: "Revenue Business Fleet Launch Control Tower" as const,
      nextAction,
      providerContacted: false as const,
      stages,
      summary: `${safeLaunchReady}/${input.launchWaveSize} launch lane${input.launchWaveSize === 1 ? "" : "s"} are clean across gate, queue, worker, and evidence stages. Next: ${nextAction.label}.`,
      swarm: {
        capacityUtilizationPercent,
        configuredShards: input.shardCount,
        configuredWorkers: input.maxWorkers,
        maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
        maxWorkerAssignments: input.maxWorkers * input.maxAssignmentsPerWorker,
        requestedLaunchWaveSize: input.launchWaveSize,
        safeLaunchReady,
        targetBusinesses: input.targetBusinesses,
        targetGap: scheduler.plan.capacity.targetGap
      },
      targetedSourceKeys: launchGate.plan.targetedSourceKeys,
      totals: {
        approvalNeeded: launchGate.plan.totals.approvalNeeded,
        blocked: launchGate.plan.totals.blocked + executionQueue.plan.totals.blocked + workerAssignments.plan.totals.blocked + manualEvidence.plan.totals.blocked,
        evidenceCompleted: manualEvidence.plan.totals.completed,
        evidenceReady: manualEvidence.plan.totals.readyForEvidence,
        executionReady: executionQueue.plan.totals.readyToClaim,
        launchGateReady: launchGate.plan.totals.manualLaunchReady,
        launchWaveCandidates: scheduler.plan.totals.launchNow,
        repairRequired: launchGate.plan.totals.repairRequired,
        safeLaunchReady,
        storesEvaluated: launchGate.plan.totals.storesEvaluated,
        workerReady: workerAssignments.plan.totals.readyToAssign
      }
    }
  };
}

type RevenueBusinessFleetSwarmReadinessStatus =
  | "blocked"
  | "needs_batch_expansion"
  | "needs_more_clean_lanes"
  | "ready_now";

type RevenueBusinessFleetSwarmScalePresetStatus =
  | "blocked"
  | "current_ready"
  | "needs_more_clean_lanes"
  | "needs_more_clean_lanes_and_batches"
  | "needs_partitioned_batches";

type RevenueBusinessFleetSwarmBatchStatus =
  | "ready_to_stage"
  | "waiting_for_capacity"
  | "waiting_for_clean_lanes";

type RevenueBusinessFleetLaunchControlPlan = Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchControlForUser>>["plan"];
type RevenueBusinessFleetLaunchControlStage = RevenueBusinessFleetLaunchControlPlan["stages"][number];

function revenueBusinessFleetSwarmPresetDefinitions(input: RevenueBusinessFleetSwarmReadinessQueryInput) {
  return [{
    label: "Starter 10",
    maxAssignments: 10,
    maxAssignmentsPerWorker: 1,
    maxLeases: 10,
    maxLeasesPerShard: 1,
    maxParallelLaunches: 10,
    maxParallelScaleActions: 25,
    maxStores: 10,
    maxWorkers: 10,
    preset: "starter_10",
    qualityFloor: input.qualityFloor,
    shardCount: 10,
    targetBusinesses: 10
  }, {
    label: "Validation 25",
    maxAssignments: 25,
    maxAssignmentsPerWorker: 1,
    maxLeases: 25,
    maxLeasesPerShard: 1,
    maxParallelLaunches: 25,
    maxParallelScaleActions: 50,
    maxStores: 25,
    maxWorkers: 25,
    preset: "validation_25",
    qualityFloor: input.qualityFloor,
    shardCount: 25,
    targetBusinesses: 25
  }, {
    label: "Hundred Lane",
    maxAssignments: 50,
    maxAssignmentsPerWorker: 1,
    maxLeases: 50,
    maxLeasesPerShard: 1,
    maxParallelLaunches: 100,
    maxParallelScaleActions: 250,
    maxStores: 25,
    maxWorkers: 50,
    preset: "hundred_lane",
    qualityFloor: input.qualityFloor,
    shardCount: 50,
    targetBusinesses: 100
  }, {
    label: "Thousand Lane",
    maxAssignments: 50,
    maxAssignmentsPerWorker: 1,
    maxLeases: 50,
    maxLeasesPerShard: 1,
    maxParallelLaunches: 1_000,
    maxParallelScaleActions: 2_000,
    maxStores: 25,
    maxWorkers: 100,
    preset: "thousand_lane",
    qualityFloor: input.qualityFloor,
    shardCount: 100,
    targetBusinesses: 1_000
  }] as const;
}

function revenueBusinessFleetSwarmPresetCapacity(preset: ReturnType<typeof revenueBusinessFleetSwarmPresetDefinitions>[number]) {
  return Math.min(
    preset.targetBusinesses,
    preset.maxLeases,
    preset.maxAssignments,
    preset.maxWorkers * preset.maxAssignmentsPerWorker,
    preset.shardCount * preset.maxLeasesPerShard
  );
}

function revenueBusinessFleetSwarmPresetStatus(input: {
  cleanLanesNow: number;
  perCycleCapacity: number;
  targetBusinesses: number;
}): RevenueBusinessFleetSwarmScalePresetStatus {
  if (input.cleanLanesNow === 0) return "blocked";
  if (input.cleanLanesNow >= input.targetBusinesses && input.perCycleCapacity >= input.targetBusinesses) return "current_ready";
  if (input.cleanLanesNow >= input.targetBusinesses && input.perCycleCapacity < input.targetBusinesses) return "needs_partitioned_batches";
  if (input.cleanLanesNow < input.targetBusinesses && input.perCycleCapacity < input.targetBusinesses) return "needs_more_clean_lanes_and_batches";

  return "needs_more_clean_lanes";
}

function revenueBusinessFleetSwarmPresetReason(input: {
  cleanLanesNow: number;
  limitingStage: RevenueBusinessFleetLaunchControlStage | null;
  perCycleCapacity: number;
  status: RevenueBusinessFleetSwarmScalePresetStatus;
  targetBusinesses: number;
}) {
  if (input.status === "current_ready") {
    return `${input.targetBusinesses} clean lanes fit inside this preset's per-cycle capacity.`;
  }

  if (input.status === "blocked") {
    return "No clean launch lanes are available; repair the limiting chain-of-command stage first.";
  }

  if (input.status === "needs_partitioned_batches") {
    return `${input.cleanLanesNow} clean lanes are available, but this preset can process ${input.perCycleCapacity} per cycle. Partition the launch into controlled batches.`;
  }

  if (input.status === "needs_more_clean_lanes_and_batches") {
    return `${input.cleanLanesNow}/${input.targetBusinesses} clean lanes are available and per-cycle capacity is ${input.perCycleCapacity}; expand clean lanes and run controlled batches.`;
  }

  return `${input.cleanLanesNow}/${input.targetBusinesses} clean lanes are available. Limiting stage: ${input.limitingStage?.stage.replace(/_/g, " ") ?? "unknown"}.`;
}

function buildRevenueBusinessFleetSwarmBatchPlan(input: {
  cleanLanesNow: number;
  limitingStage: RevenueBusinessFleetLaunchControlStage | null;
  perCycleCapacity: number;
  targetBusinesses: number;
}) {
  const requiredCycles = input.perCycleCapacity > 0 ? Math.ceil(input.targetBusinesses / input.perCycleCapacity) : 0;
  const visibleBatchCount = Math.min(requiredCycles, 5);
  const batches = Array.from({ length: visibleBatchCount }, (_, index) => {
    const batchNumber = index + 1;
    const startLane = (index * input.perCycleCapacity) + 1;
    const endLane = Math.min(input.targetBusinesses, batchNumber * input.perCycleCapacity);
    const batchSize = Math.max(0, endLane - startLane + 1);
    const cleanAvailableForBatch = Math.max(0, input.cleanLanesNow - (index * input.perCycleCapacity));
    const cleanLanesReady = Math.min(batchSize, cleanAvailableForBatch);
    const gapToBatch = Math.max(0, batchSize - cleanLanesReady);
    const status: RevenueBusinessFleetSwarmBatchStatus = input.perCycleCapacity === 0
      ? "waiting_for_capacity"
      : gapToBatch === 0
        ? "ready_to_stage"
        : "waiting_for_clean_lanes";

    return {
      batchNumber,
      batchSize,
      cleanLanesReady,
      endLane,
      gapToBatch,
      nextInternalState: status === "ready_to_stage"
        ? "ready_for_internal_batch_staging"
        : input.limitingStage?.nextInternalState ?? "expand_clean_launch_lanes",
      startLane,
      status
    };
  });

  return {
    batches,
    cleanLanesNow: input.cleanLanesNow,
    hiddenBatches: Math.max(0, requiredCycles - visibleBatchCount),
    perCycleCapacity: input.perCycleCapacity,
    requiredCycles,
    summary: requiredCycles === 0
      ? "No launch batches can be partitioned until per-cycle capacity is available."
      : `${requiredCycles} controlled internal batch${requiredCycles === 1 ? "" : "es"} required at ${input.perCycleCapacity}/cycle; showing ${visibleBatchCount}.`,
    targetBusinesses: input.targetBusinesses
  };
}

function buildRevenueBusinessFleetSwarmScalePresets(input: {
  cleanLanesNow: number;
  launchControl: RevenueBusinessFleetLaunchControlPlan;
  query: RevenueBusinessFleetSwarmReadinessQueryInput;
}) {
  const limitingStage = revenueBusinessFleetSwarmLimitingStage(input.launchControl.stages);

  return revenueBusinessFleetSwarmPresetDefinitions(input.query).map((preset) => {
    const perCycleCapacity = revenueBusinessFleetSwarmPresetCapacity(preset);
    const status = revenueBusinessFleetSwarmPresetStatus({
      cleanLanesNow: input.cleanLanesNow,
      perCycleCapacity,
      targetBusinesses: preset.targetBusinesses
    });

    return {
      config: {
        maxAssignments: preset.maxAssignments,
        maxAssignmentsPerWorker: preset.maxAssignmentsPerWorker,
        maxLeases: preset.maxLeases,
        maxLeasesPerShard: preset.maxLeasesPerShard,
        maxParallelLaunches: preset.maxParallelLaunches,
        maxParallelScaleActions: preset.maxParallelScaleActions,
        maxStores: preset.maxStores,
        maxWorkers: preset.maxWorkers,
        qualityFloor: preset.qualityFloor,
        shardCount: preset.shardCount
      },
      batchPlan: buildRevenueBusinessFleetSwarmBatchPlan({
        cleanLanesNow: input.cleanLanesNow,
        limitingStage,
        perCycleCapacity,
        targetBusinesses: preset.targetBusinesses
      }),
      cleanLaneGap: Math.max(0, preset.targetBusinesses - input.cleanLanesNow),
      cleanLanesNow: input.cleanLanesNow,
      label: preset.label,
      limitingStage,
      nextInternalState: status === "current_ready"
        ? "ready_for_controlled_launch_batch"
        : status === "needs_partitioned_batches"
          ? "partition_launch_waves"
          : limitingStage?.nextInternalState ?? input.launchControl.nextAction.state,
      perCycleCapacity,
      preset: preset.preset,
      reason: revenueBusinessFleetSwarmPresetReason({
        cleanLanesNow: input.cleanLanesNow,
        limitingStage,
        perCycleCapacity,
        status,
        targetBusinesses: preset.targetBusinesses
      }),
      requiredCyclesAtPresetCapacity: perCycleCapacity > 0 ? Math.ceil(preset.targetBusinesses / perCycleCapacity) : null,
      status,
      targetBusinesses: preset.targetBusinesses
    };
  });
}

function revenueBusinessFleetSwarmScaleTargets(input: RevenueBusinessFleetSwarmReadinessQueryInput) {
  return Array.from(new Set([
    input.starterBusinesses,
    input.targetBusinesses,
    ...input.scaleTargets
  ])).sort((left, right) => left - right);
}

function revenueBusinessFleetSwarmLimitingStage(stages: RevenueBusinessFleetLaunchControlStage[]) {
  return stages.slice().sort((left, right) => (
    left.readyCount - right.readyCount
    || left.totalCount - right.totalCount
    || left.stage.localeCompare(right.stage)
  ))[0] ?? null;
}

function revenueBusinessFleetSwarmTargetStatus(input: {
  cleanLanesNow: number;
  currentBatchCapacity: number;
  target: number;
}): RevenueBusinessFleetSwarmReadinessStatus {
  if (input.cleanLanesNow >= input.target) return "ready_now";
  if (input.cleanLanesNow === 0) return "blocked";
  if (input.currentBatchCapacity < input.target) return "needs_batch_expansion";

  return "needs_more_clean_lanes";
}

function revenueBusinessFleetSwarmTargetReason(input: {
  cleanLanesNow: number;
  currentBatchCapacity: number;
  limitingStage: RevenueBusinessFleetLaunchControlStage | null;
  nextAction: RevenueBusinessFleetLaunchControlPlan["nextAction"];
  status: RevenueBusinessFleetSwarmReadinessStatus;
  target: number;
}) {
  if (input.status === "ready_now") {
    return `${input.target} clean lane${input.target === 1 ? "" : "s"} can run inside the current internal quality gate.`;
  }

  if (input.status === "blocked") {
    return `No clean launch lanes are ready. Next internal action: ${input.nextAction.label}.`;
  }

  if (input.status === "needs_batch_expansion") {
    return `${input.cleanLanesNow}/${input.target} clean lanes are ready and current per-cycle capacity is ${input.currentBatchCapacity}. Expand workers, shards, leases, assignments, and evidence throughput after the limiting stage is repaired.`;
  }

  return `${input.cleanLanesNow}/${input.target} clean lanes are ready. Limiting stage: ${input.limitingStage?.stage.replace(/_/g, " ") ?? "unknown"}.`;
}

function buildRevenueBusinessFleetSwarmReadinessTarget(input: {
  cleanLanesNow: number;
  currentBatchCapacity: number;
  launchControl: RevenueBusinessFleetLaunchControlPlan;
  target: number;
}) {
  const limitingStage = revenueBusinessFleetSwarmLimitingStage(input.launchControl.stages);
  const status = revenueBusinessFleetSwarmTargetStatus({
    cleanLanesNow: input.cleanLanesNow,
    currentBatchCapacity: input.currentBatchCapacity,
    target: input.target
  });
  const gapToTarget = Math.max(0, input.target - input.cleanLanesNow);

  return {
    cleanLanesReady: Math.min(input.cleanLanesNow, input.target),
    currentBatchCapacity: input.currentBatchCapacity,
    gapToTarget,
    launchWavesAtBatchCapacity: input.currentBatchCapacity > 0 ? Math.ceil(input.target / input.currentBatchCapacity) : null,
    launchWavesAtCurrentCleanRate: input.cleanLanesNow > 0 ? Math.ceil(input.target / input.cleanLanesNow) : null,
    limitingStage: limitingStage ? {
      nextInternalState: limitingStage.nextInternalState,
      readyCount: limitingStage.readyCount,
      reason: limitingStage.reason,
      stage: limitingStage.stage,
      status: limitingStage.status,
      totalCount: limitingStage.totalCount
    } : null,
    nextInternalAction: input.launchControl.nextAction,
    readinessStatus: status,
    reason: revenueBusinessFleetSwarmTargetReason({
      cleanLanesNow: input.cleanLanesNow,
      currentBatchCapacity: input.currentBatchCapacity,
      limitingStage,
      nextAction: input.launchControl.nextAction,
      status,
      target: input.target
    }),
    targetBusinesses: input.target
  };
}

async function buildRevenueBusinessFleetSwarmReadinessForUser(
  userId: string,
  input: RevenueBusinessFleetSwarmReadinessQueryInput
) {
  const launchControl = await buildRevenueBusinessFleetLaunchControlForUser(userId, revenueBusinessFleetLaunchControlQuerySchema.parse({
    launchWaveSize: input.launchWaveSize,
    maxAssignments: input.maxAssignments,
    maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
    maxLeases: input.maxLeases,
    maxLeasesPerShard: input.maxLeasesPerShard,
    maxParallelLaunches: input.maxParallelLaunches,
    maxParallelScaleActions: input.maxParallelScaleActions,
    maxStores: input.maxStores,
    maxWorkers: input.maxWorkers,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    sourceKeys: input.sourceKeys,
    targetBusinesses: input.targetBusinesses
  }));
  const cleanLanesNow = launchControl.plan.totals.safeLaunchReady;
  const workerCapacity = input.maxWorkers * input.maxAssignmentsPerWorker;
  const shardCapacity = input.shardCount * input.maxLeasesPerShard;
  const currentBatchCapacity = Math.min(input.launchWaveSize, input.maxLeases, input.maxAssignments, workerCapacity, shardCapacity);
  const scaleTargets = revenueBusinessFleetSwarmScaleTargets(input);
  const targets = scaleTargets.map((target) => buildRevenueBusinessFleetSwarmReadinessTarget({
    cleanLanesNow,
    currentBatchCapacity,
    launchControl: launchControl.plan,
    target
  }));
  const scalePresets = buildRevenueBusinessFleetSwarmScalePresets({
    cleanLanesNow,
    launchControl: launchControl.plan,
    query: input
  });
  const starterReady = cleanLanesNow >= input.starterBusinesses;
  const limitingStage = revenueBusinessFleetSwarmLimitingStage(launchControl.plan.stages);

  return {
    plan: {
      auditEvents: [
        "Business fleet swarm readiness is derived from the launch control tower and does not create external execution.",
        "Scale targets compare clean lanes against current worker, shard, lease, assignment, and evidence capacity.",
        "The limiting stage is the first chain-of-command stage that prevents increasing clean launch lanes."
      ],
      blockedExternalActions: uniqueStrings([
        ...launchControl.plan.blockedExternalActions,
        "Treating swarm readiness as permission to publish stores, listings, ads, uploads, browser sessions, payments, or payouts",
        "Bypassing launch evidence, provider approval, worker assignment, or rotation gates to inflate launch count"
      ]),
      chainOfCommand: launchControl.plan.stages,
      externalExecution: false as const,
      generatedAt: new Date().toISOString(),
      launchControl: {
        nextAction: launchControl.plan.nextAction,
        summary: launchControl.plan.summary,
        swarm: launchControl.plan.swarm,
        totals: launchControl.plan.totals
      },
      limitingStage,
      mode: "Revenue Business Fleet Swarm Readiness" as const,
      providerContacted: false as const,
      summary: starterReady
        ? `Starter swarm is ready: ${cleanLanesNow}/${input.starterBusinesses} clean lane${input.starterBusinesses === 1 ? "" : "s"} available. Current per-cycle capacity is ${currentBatchCapacity}.`
        : `Starter swarm is not ready: ${cleanLanesNow}/${input.starterBusinesses} clean lane${input.starterBusinesses === 1 ? "" : "s"} available. Next: ${launchControl.plan.nextAction.label}.`,
      targetedSourceKeys: launchControl.plan.targetedSourceKeys,
      scalePresets,
      targets,
      totals: {
        blockedStages: launchControl.plan.stages.filter((stage) => stage.status === "blocked").length,
        cleanLaneGapToStarter: Math.max(0, input.starterBusinesses - cleanLanesNow),
        cleanLanesNow,
        configuredShards: input.shardCount,
        configuredWorkers: input.maxWorkers,
        currentBatchCapacity,
        launchWaveSize: input.launchWaveSize,
        maxAssignments: input.maxAssignments,
        maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
        maxLeases: input.maxLeases,
        maxLeasesPerShard: input.maxLeasesPerShard,
        qualityFloor: input.qualityFloor,
        scaleTargets,
        starterBusinesses: input.starterBusinesses,
        starterReady,
        targetBusinesses: input.targetBusinesses,
        workerCapacity
      }
    }
  };
}

type RevenueBusinessFleetLaunchOutcomeSignalStatus =
  | "blocked"
  | "ready_for_signal"
  | "signal_recorded"
  | "waiting_for_manual_evidence";

async function latestBusinessFleetManualLaunchEvidenceByStore(userId: string) {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    where: {
      actorUserId: userId,
      targetType: "revenue_business_fleet_manual_launch_evidence"
    }
  });
  const latest = new Map<string, PublicRevenueAuditLog>();

  for (const log of logs.map(publicAuditLog)) {
    const entry = recordFromUnknown(log.entry);
    const metadata = recordFromUnknown(entry.metadata);
    const storeId = stringFromRecord(metadata, "storeId") ?? log.targetId;

    if (storeId && !latest.has(storeId)) {
      latest.set(storeId, log);
    }
  }

  return latest;
}

async function latestRevenuePerformanceSnapshotByStore(userId: string, storeIds: string[]) {
  if (storeIds.length === 0) return new Map<string, RevenuePerformanceSnapshot>();

  const records = await prisma.revenuePerformanceSnapshot.findMany({
    orderBy: { periodEnd: "desc" },
    where: {
      storeId: { in: Array.from(new Set(storeIds)) },
      userId
    }
  });
  const latest = new Map<string, RevenuePerformanceSnapshot>();

  for (const record of records) {
    if (!latest.has(record.storeId)) {
      latest.set(record.storeId, performanceSnapshot(record));
    }
  }

  return latest;
}

function businessFleetLaunchOutcomeStatus(input: {
  evidenceLog: PublicRevenueAuditLog | null;
  latestSnapshot: RevenuePerformanceSnapshot | null;
}): RevenueBusinessFleetLaunchOutcomeSignalStatus {
  if (!input.evidenceLog) return "waiting_for_manual_evidence";

  if (input.latestSnapshot?.createdAt && Date.parse(input.latestSnapshot.createdAt) >= input.evidenceLog.createdAt.getTime()) {
    return "signal_recorded";
  }

  return "ready_for_signal";
}

function buildBusinessFleetLaunchOutcomeSignalPacket(input: {
  evidenceLog: PublicRevenueAuditLog | null;
  latestSnapshot: RevenuePerformanceSnapshot | null;
  packet: Awaited<ReturnType<typeof buildRevenueBusinessFleetManualLaunchEvidenceForUser>>["plan"]["packets"][number];
  storeScore: RevenuePerformanceDigest["storeScores"][number] | null;
}) {
  const status = businessFleetLaunchOutcomeStatus({
    evidenceLog: input.evidenceLog,
    latestSnapshot: input.latestSnapshot
  });
  const signalId = `business_fleet_launch_signal_${input.packet.storeId}`;
  const blockers = [
    input.packet.status === "blocked" ? input.packet.reason : null,
    input.evidenceLog ? null : "Business-fleet manual launch evidence audit log is required before outcome signals can be recorded."
  ].filter((blocker): blocker is string => Boolean(blocker));
  const recommendedAction = input.storeScore?.action ?? "watch";
  const profitVelocity = input.storeScore?.profitVelocity ?? 0;
  const grossRevenue = input.latestSnapshot?.grossRevenue ?? 0;
  const netProfit = input.latestSnapshot?.netProfit ?? 0;

  return {
    blockers,
    businessName: input.packet.businessName,
    evidenceAuditLogId: input.evidenceLog?.id ?? null,
    externalExecution: false as const,
    grossRevenue,
    latestSnapshotId: input.latestSnapshot?.id ?? null,
    latestSnapshotPeriodEnd: input.latestSnapshot?.periodEnd ?? null,
    netProfit,
    nextInternalState: status === "ready_for_signal"
      ? "record_launch_outcome_signal"
      : status === "signal_recorded"
        ? "monitor_score_and_rotate"
        : "waiting_for_manual_launch_evidence",
    packetId: input.packet.packetId,
    profitVelocity,
    providerContacted: false as const,
    readinessScore: input.packet.readinessScore,
    reason: blockers[0]
      ?? (status === "signal_recorded"
        ? `${input.packet.businessName} already has a post-launch performance snapshot; monitor scoring and rotate on evidence.`
        : `${input.packet.businessName} can record a post-launch manual revenue/profit signal.`),
    recommendedAction,
    signalId,
    sourceKey: input.packet.sourceKey,
    status,
    storeId: input.packet.storeId,
    summary: status === "ready_for_signal"
      ? `${input.packet.businessName} is ready for launch outcome signal capture.`
      : status === "signal_recorded"
        ? `${input.packet.businessName} has ${netProfit} net profit recorded from the latest launch signal.`
        : `${input.packet.businessName} is waiting for manual launch evidence before signal capture.`
  };
}

async function buildRevenueBusinessFleetLaunchOutcomeSignalsForUser(
  userId: string,
  input: RevenueBusinessFleetLaunchOutcomeSignalsQueryInput
) {
  const [manualEvidence, launchControl, performance] = await Promise.all([
    buildRevenueBusinessFleetManualLaunchEvidenceForUser(userId, revenueBusinessFleetManualLaunchEvidenceQuerySchema.parse({
      maxAssignments: input.maxAssignments,
      maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
      maxLeases: input.maxLeases,
      maxLeasesPerShard: input.maxLeasesPerShard,
      maxStores: input.maxStores,
      maxWorkers: input.maxWorkers,
      qualityFloor: input.qualityFloor,
      shardCount: input.shardCount,
      sourceKeys: input.sourceKeys
    })),
    buildRevenueBusinessFleetLaunchControlForUser(userId, revenueBusinessFleetLaunchControlQuerySchema.parse({
      launchWaveSize: input.launchWaveSize,
      maxAssignments: input.maxAssignments,
      maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
      maxLeases: input.maxLeases,
      maxLeasesPerShard: input.maxLeasesPerShard,
      maxParallelLaunches: input.maxParallelLaunches,
      maxParallelScaleActions: input.maxParallelScaleActions,
      maxStores: input.maxStores,
      maxWorkers: input.maxWorkers,
      qualityFloor: input.qualityFloor,
      shardCount: input.shardCount,
      sourceKeys: input.sourceKeys,
      targetBusinesses: input.targetBusinesses
    })),
    buildPerformanceDigestForUser(userId, revenuePerformanceQuerySchema.parse({}))
  ]);
  const evidenceLogsByStore = await latestBusinessFleetManualLaunchEvidenceByStore(userId);
  const storeIds = manualEvidence.plan.packets.map((packet) => packet.storeId);
  const latestSnapshotsByStore = await latestRevenuePerformanceSnapshotByStore(userId, storeIds);
  const storeScoresByStore = new Map(performance.digest.storeScores.map((score) => [score.storeId, score]));
  const packets = manualEvidence.plan.packets
    .slice(0, input.maxSignals)
    .map((packet) => buildBusinessFleetLaunchOutcomeSignalPacket({
      evidenceLog: evidenceLogsByStore.get(packet.storeId) ?? null,
      latestSnapshot: latestSnapshotsByStore.get(packet.storeId) ?? null,
      packet,
      storeScore: storeScoresByStore.get(packet.storeId) ?? null
    }));
  const statusCount = (status: RevenueBusinessFleetLaunchOutcomeSignalStatus) => packets.filter((packet) => packet.status === status).length;
  const netProfit = packets.reduce((sum, packet) => sum + packet.netProfit, 0);
  const grossRevenue = packets.reduce((sum, packet) => sum + packet.grossRevenue, 0);

  return {
    plan: {
      auditEvents: [
        "Business fleet launch outcome signals are derived from recorded manual launch evidence and persisted performance snapshots.",
        "Outcome signals feed the existing Revenue Performance ledger and scored Revenue Engine portfolio.",
        "No provider, marketplace, payment, ad, browser, upload, payout, or external write action is executed."
      ],
      blockedExternalActions: uniqueStrings([
        ...launchControl.plan.blockedExternalActions,
        "Recording launch outcome signals before manual launch evidence exists",
        "Importing external analytics, payment, marketplace, provider, ad, social, or browser data without approved read-only connectors",
        "Moving money, publishing listings, changing ads, or contacting providers from outcome signal capture"
      ]),
      externalExecution: false as const,
      generatedAt: new Date().toISOString(),
      launchControl: {
        nextAction: launchControl.plan.nextAction,
        summary: launchControl.plan.summary,
        totals: launchControl.plan.totals
      },
      mode: "Revenue Business Fleet Launch Outcome Signals" as const,
      packets,
      performanceDigest: {
        generatedAt: performance.digest.generatedAt,
        summary: performance.digest.summary,
        totals: performance.digest.totals
      },
      providerContacted: false as const,
      summary: `${statusCount("ready_for_signal")} launch outcome signal${statusCount("ready_for_signal") === 1 ? "" : "s"} ready, ${statusCount("signal_recorded")} already recorded, and ${statusCount("waiting_for_manual_evidence")} waiting for manual evidence. Recorded net profit across visible lanes is ${Math.round(netProfit * 100) / 100}.`,
      targetedSourceKeys: manualEvidence.plan.targetedSourceKeys,
      totals: {
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        maxSelectableSignals: Math.min(input.maxSignals, statusCount("ready_for_signal")),
        netProfit: Math.round(netProfit * 100) / 100,
        readyForSignal: statusCount("ready_for_signal"),
        signalPackets: packets.length,
        signalRecorded: statusCount("signal_recorded"),
        storesCovered: new Set(packets.map((packet) => packet.storeId)).size,
        waitingForManualEvidence: statusCount("waiting_for_manual_evidence")
      }
    }
  };
}

type RevenueBusinessFleetLaunchCashCycleStepStatus = "approval_required" | "blocked" | "ready" | "waiting";

function businessFleetLaunchCashCycleStep(input: {
  blockedExternalActions?: string[];
  confirmation?: string | null;
  endpoint: string;
  id: string;
  label: string;
  maxItems: number;
  nextInternalState: string;
  reason: string;
  status: RevenueBusinessFleetLaunchCashCycleStepStatus;
}) {
  return {
    blockedExternalActions: input.blockedExternalActions ?? [],
    confirmation: input.confirmation ?? null,
    endpoint: input.endpoint,
    externalExecution: false as const,
    id: input.id,
    label: input.label,
    maxItems: input.maxItems,
    nextInternalState: input.nextInternalState,
    providerContacted: false as const,
    reason: input.reason,
    status: input.status
  };
}

async function buildRevenueBusinessFleetLaunchCashCycleForUser(
  userId: string,
  input: RevenueBusinessFleetLaunchCashCycleQueryInput
) {
  const launchControlInput = revenueBusinessFleetLaunchControlQuerySchema.parse({
    launchWaveSize: input.launchWaveSize,
    maxAssignments: input.maxAssignments,
    maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
    maxLeases: input.maxLeases,
    maxLeasesPerShard: input.maxLeasesPerShard,
    maxParallelLaunches: input.maxParallelLaunches,
    maxParallelScaleActions: input.maxParallelScaleActions,
    maxStores: input.maxStores,
    maxWorkers: input.maxWorkers,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    sourceKeys: input.sourceKeys,
    targetBusinesses: input.targetBusinesses
  });
  const outcomeSignalsInput = revenueBusinessFleetLaunchOutcomeSignalsQuerySchema.parse({
    ...launchControlInput,
    maxSignals: input.maxSignals
  });
  const schedulerInput = revenueBusinessFleetSchedulerQuerySchema.parse({
    launchWaveSize: input.launchWaveSize,
    maxParallelLaunches: input.maxParallelLaunches,
    maxParallelScaleActions: input.maxParallelScaleActions,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    targetBusinesses: input.targetBusinesses
  });
  const [launchControl, outcomeSignals, portfolio, financial, scheduler] = await Promise.all([
    buildRevenueBusinessFleetLaunchControlForUser(userId, launchControlInput),
    buildRevenueBusinessFleetLaunchOutcomeSignalsForUser(userId, outcomeSignalsInput),
    buildAssetPortfolioForUser(userId, revenueEngineQuerySchema.parse({})),
    buildFinancialOrchestratorForUser(userId, financialOrchestratorQuerySchema.parse({})),
    buildRevenueBusinessFleetSchedulerForUser(userId, schedulerInput)
  ]);
  const scalePressure = financial.plan.portfolioSignal.scalePressure.pressureScore;
  const killPressure = financial.plan.portfolioSignal.killPressure.pressureScore;
  const safeEnvelopeClear = !launchControl.plan.externalExecution
    && !outcomeSignals.plan.externalExecution
    && !portfolio.externalExecution
    && !financial.plan.externalExecution
    && !scheduler.plan.externalExecution;
  const allSteps = [
    businessFleetLaunchCashCycleStep({
      confirmation: "REVIEW INTERNAL SAFETY ENVELOPE",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-control",
      id: "safety_gate_snapshot",
      label: "Verify internal safety envelope",
      maxItems: input.launchWaveSize,
      nextInternalState: safeEnvelopeClear ? "internal_advisory_cycle_ready" : "external_execution_lock_violation",
      reason: safeEnvelopeClear
        ? "All composed plans are advisory-only and show external execution locked."
        : "One or more composed plans reported external execution; stop before launch work.",
      status: safeEnvelopeClear ? "ready" : "blocked"
    }),
    businessFleetLaunchCashCycleStep({
      confirmation: "RECORD INTERNAL BUSINESS FLEET MANUAL LAUNCH EVIDENCE",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/manual-launch-evidence/apply",
      id: "manual_launch_evidence",
      label: "Record completed manual launch evidence",
      maxItems: launchControl.plan.totals.evidenceReady,
      nextInternalState: launchControl.plan.totals.evidenceReady > 0 ? "record_manual_launch_evidence" : "waiting_for_operator_completion",
      reason: launchControl.plan.totals.evidenceReady > 0
        ? `${launchControl.plan.totals.evidenceReady} operator-completed launch lane${launchControl.plan.totals.evidenceReady === 1 ? "" : "s"} can accept evidence.`
        : "No launch lane has reached the evidence gate yet.",
      status: launchControl.plan.totals.evidenceReady > 0
        ? "ready"
        : launchControl.plan.totals.blocked > 0 ? "blocked" : "waiting"
    }),
    businessFleetLaunchCashCycleStep({
      confirmation: "RECORD INTERNAL BUSINESS FLEET LAUNCH OUTCOME SIGNALS",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-outcome-signals/apply",
      id: "launch_outcome_signals",
      label: "Record revenue and profit outcome signals",
      maxItems: Math.max(outcomeSignals.plan.totals.readyForSignal, outcomeSignals.plan.totals.signalRecorded),
      nextInternalState: outcomeSignals.plan.totals.readyForSignal > 0
        ? "record_launch_outcome_signal"
        : outcomeSignals.plan.totals.signalRecorded > 0 ? "monitor_score_and_rotate" : "waiting_for_manual_launch_evidence",
      reason: outcomeSignals.plan.totals.readyForSignal > 0
        ? `${outcomeSignals.plan.totals.readyForSignal} lane${outcomeSignals.plan.totals.readyForSignal === 1 ? "" : "s"} can record post-launch revenue/profit signals.`
        : outcomeSignals.plan.totals.signalRecorded > 0
          ? `${outcomeSignals.plan.totals.signalRecorded} lane${outcomeSignals.plan.totals.signalRecorded === 1 ? "" : "s"} already have outcome signals; move into scoring and rotation.`
          : "Outcome signals are waiting on manual launch evidence.",
      status: outcomeSignals.plan.totals.readyForSignal > 0 || outcomeSignals.plan.totals.signalRecorded > 0
        ? "ready"
        : outcomeSignals.plan.totals.waitingForManualEvidence > 0 ? "waiting" : "blocked"
    }),
    businessFleetLaunchCashCycleStep({
      confirmation: "APPLY INTERNAL ASSET ACTION",
      endpoint: "/merch/revenue-engine/review-queue",
      id: "weak_lane_rotation",
      label: "Cut or pause weak lanes",
      maxItems: portfolio.totals.pause + portfolio.totals.kill,
      nextInternalState: portfolio.totals.kill > 0 ? "kill_underperforming_assets" : portfolio.totals.pause > 0 ? "pause_underperforming_assets" : "watch_rotation_pressure",
      reason: portfolio.totals.kill + portfolio.totals.pause > 0
        ? `${portfolio.totals.kill} kill and ${portfolio.totals.pause} pause recommendation${portfolio.totals.kill + portfolio.totals.pause === 1 ? "" : "s"} are visible in the scored portfolio.`
        : `Kill pressure is ${killPressure}/100 with no current pause/kill queue.`,
      status: portfolio.totals.kill + portfolio.totals.pause > 0 || killPressure >= 45 ? "ready" : "waiting"
    }),
    businessFleetLaunchCashCycleStep({
      confirmation: "REVIEW INTERNAL SCALING BUDGETS",
      endpoint: "/merch/financial-orchestrator/scaling-budgets/review",
      id: "scale_winner_review",
      label: "Review winning lanes for scale capital",
      maxItems: portfolio.totals.scale,
      nextInternalState: portfolio.totals.scale > 0 ? "review_scale_budget_packets" : "watch_for_scale_evidence",
      reason: portfolio.totals.scale > 0
        ? `${portfolio.totals.scale} scored asset${portfolio.totals.scale === 1 ? "" : "s"} are in scale recommendation.`
        : `Scale pressure is ${scalePressure}/100 with no current scale queue.`,
      status: portfolio.totals.scale > 0 || scalePressure >= 60 ? "approval_required" : "waiting"
    }),
    businessFleetLaunchCashCycleStep({
      confirmation: "REVIEW INTERNAL FINANCIAL ORCHESTRATOR",
      endpoint: "/merch/financial-orchestrator/plan",
      id: "financial_allocation_review",
      label: "Review allocation pressure",
      maxItems: financial.plan.totals.scalingBudgetPackets + financial.plan.totals.payoutIntents,
      nextInternalState: financial.plan.totals.distributableProfit > 0 ? "review_profit_split_and_budget_queue" : "waiting_for_profit_signal",
      reason: financial.plan.totals.distributableProfit > 0
        ? `${financial.plan.totals.distributableProfit} distributable profit is visible to the orchestrator.`
        : "No distributable profit is visible yet; keep launch signals moving.",
      status: financial.plan.totals.distributableProfit > 0 || financial.plan.totals.scalingBudgetPackets > 0
        ? "approval_required"
        : "waiting"
    }),
    businessFleetLaunchCashCycleStep({
      confirmation: "RUN INTERNAL BUSINESS FLEET LAUNCH WAVE",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-wave/apply",
      id: "next_launch_wave",
      label: "Prepare next internal launch wave",
      maxItems: launchControl.plan.totals.safeLaunchReady,
      nextInternalState: launchControl.plan.totals.safeLaunchReady > 0 ? "preview_next_launch_wave" : "repair_launch_lane_capacity",
      reason: launchControl.plan.totals.safeLaunchReady > 0
        ? `${launchControl.plan.totals.safeLaunchReady} clean lane${launchControl.plan.totals.safeLaunchReady === 1 ? "" : "s"} can be considered for the next internal launch wave.`
        : "No clean lane is ready for the next launch wave.",
      status: launchControl.plan.totals.safeLaunchReady > 0 && outcomeSignals.plan.totals.readyForSignal === 0
        ? "ready"
        : "waiting"
    }),
    businessFleetLaunchCashCycleStep({
      confirmation: "CREATE INTERNAL BUSINESS FLEET GAP SEEDS",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/seeds/apply",
      id: "launch_gap_refill",
      label: "Refill launch gap seeds",
      maxItems: scheduler.plan.capacity.targetGap,
      nextInternalState: scheduler.plan.capacity.targetGap > 0 ? "create_gap_seed_candidates" : "maintain_candidate_buffer",
      reason: scheduler.plan.capacity.targetGap > 0
        ? `${scheduler.plan.capacity.targetGap} additional business candidate${scheduler.plan.capacity.targetGap === 1 ? "" : "s"} are needed to keep the target swarm full.`
        : "Business candidate capacity is currently filled against target.",
      status: scheduler.plan.capacity.targetGap > 0 || launchControl.plan.nextAction.state === "needs_launch_gap" ? "ready" : "waiting"
    })
  ];
  const steps = allSteps.slice(0, input.maxSteps);
  const statusCount = (status: RevenueBusinessFleetLaunchCashCycleStepStatus) => steps.filter((step) => step.status === status).length;
  const nextStep = steps.find((step) => step.status === "ready")
    ?? steps.find((step) => step.status === "approval_required")
    ?? steps[0]
    ?? null;

  return {
    plan: {
      auditEvents: [
        "Launch cash cycle composes launch control, outcome signals, scored portfolio, and Financial Orchestrator pressure.",
        "Cycle steps are advisory/internal; no provider, payment, browser, marketplace, ad, upload, payout, or external write action is executed.",
        "The first scalable swarm target is clean 10-lane throughput with outcome signals before expanding lane count."
      ],
      blockedExternalActions: uniqueStrings([
        ...launchControl.plan.blockedExternalActions,
        ...outcomeSignals.plan.blockedExternalActions,
        ...portfolio.blockedExternalActions,
        ...financial.plan.blockedExternalActions,
        ...scheduler.plan.blockedExternalActions,
        "Moving money, releasing budgets, publishing listings, changing ads, contacting providers, running browsers, or uploading content from launch cash cycle",
        "Expanding swarm lanes without outcome signals, quality gates, and rotation evidence"
      ]),
      externalExecution: false as const,
      generatedAt: new Date().toISOString(),
      launchControl: {
        nextAction: launchControl.plan.nextAction,
        summary: launchControl.plan.summary,
        swarm: launchControl.plan.swarm,
        totals: launchControl.plan.totals
      },
      mode: "Revenue Business Fleet Launch Cash Cycle" as const,
      nextStep,
      outcomeSignals: {
        summary: outcomeSignals.plan.summary,
        totals: outcomeSignals.plan.totals
      },
      portfolioPressure: {
        killPressure: financial.plan.portfolioSignal.killPressure,
        reason: financial.plan.portfolioSignal.reason,
        recommendation: financial.plan.portfolioSignal.recommendation,
        scalePressure: financial.plan.portfolioSignal.scalePressure,
        trackedAssets: financial.plan.portfolioSignal.trackedAssets
      },
      portfolioTotals: portfolio.totals,
      providerContacted: false as const,
      scheduler: {
        capacity: scheduler.plan.capacity,
        summary: scheduler.plan.summary,
        totals: scheduler.plan.totals
      },
      steps,
      summary: `${statusCount("ready")} cash-cycle step${statusCount("ready") === 1 ? "" : "s"} ready, ${statusCount("approval_required")} approval review${statusCount("approval_required") === 1 ? "" : "s"}, and ${launchControl.plan.totals.safeLaunchReady}/${input.launchWaveSize} clean launch lane${input.launchWaveSize === 1 ? "" : "s"}. Next: ${nextStep?.label ?? "No action"}.`,
      targetBusinesses: input.targetBusinesses,
      totals: {
        approvalRequired: statusCount("approval_required"),
        blocked: statusCount("blocked"),
        killRecommendations: portfolio.totals.kill,
        pauseRecommendations: portfolio.totals.pause,
        portfolioKillPressure: killPressure,
        portfolioScalePressure: scalePressure,
        ready: statusCount("ready"),
        readyOutcomeSignals: outcomeSignals.plan.totals.readyForSignal,
        recordedOutcomeSignals: outcomeSignals.plan.totals.signalRecorded,
        safeLaunchReady: launchControl.plan.totals.safeLaunchReady,
        scaleRecommendations: portfolio.totals.scale,
        steps: steps.length,
        waiting: statusCount("waiting"),
        waitingForEvidence: outcomeSignals.plan.totals.waitingForManualEvidence
      }
    }
  };
}

type RevenueBusinessFleetLaunchCashCyclePlanResult = Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchCashCycleForUser>>["plan"];
type RevenueBusinessFleetLaunchCashCycleStep = RevenueBusinessFleetLaunchCashCyclePlanResult["steps"][number];

function businessFleetLaunchCashCycleCommandHash(step: RevenueBusinessFleetLaunchCashCycleStep, action: PortfolioCommandAction) {
  return `portfolio:business_fleet_launch_cash_cycle:${step.id}:${action}:${step.nextInternalState}`
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "_");
}

function businessFleetLaunchCashCycleCommandAction(
  step: RevenueBusinessFleetLaunchCashCycleStep,
  plan: RevenueBusinessFleetLaunchCashCyclePlanResult
): PortfolioCommandAction {
  if (step.id === "weak_lane_rotation") {
    if (plan.portfolioTotals.kill > 0) return "kill";
    if (plan.portfolioTotals.pause > 0) return "pause";
    return "watch";
  }

  if (step.id === "scale_winner_review") return "review_scale_budget";
  if (step.id === "financial_allocation_review") return "review_payout";
  if (step.id === "launch_gap_refill") return "generate";
  if (step.id === "manual_launch_evidence" || step.id === "launch_outcome_signals" || step.id === "next_launch_wave") return "prepare_launch";

  return "record_governance";
}

function businessFleetLaunchCashCycleCommandRisk(step: RevenueBusinessFleetLaunchCashCycleStep): PortfolioCommandRiskLevel {
  if (step.status === "blocked") return "high";
  if (step.status === "approval_required") return "medium";
  return "low";
}

function businessFleetLaunchCashCycleCommandPriority(step: RevenueBusinessFleetLaunchCashCycleStep) {
  if (step.status === "ready") return 8;
  if (step.status === "approval_required") return 18;
  if (step.status === "blocked") return 88;
  return 64;
}

function businessFleetLaunchCashCycleCommandTargetType(step: RevenueBusinessFleetLaunchCashCycleStep): PortfolioCommandTargetType {
  return step.id === "financial_allocation_review" || step.id === "scale_winner_review" ? "finance" : "portfolio";
}

function businessFleetLaunchCashCycleCommand(
  plan: RevenueBusinessFleetLaunchCashCyclePlanResult
): PortfolioCommandItem | null {
  const step = plan.nextStep;

  if (!step) return null;

  const action = businessFleetLaunchCashCycleCommandAction(step, plan);

  return {
    action,
    approvalGate: {
      externalExecutionLocked: true,
      humanApprovalRequired: true,
      status: "Required"
    },
    blockedExternalActions: uniqueStrings([
      ...plan.blockedExternalActions,
      ...step.blockedExternalActions
    ]),
    commandHash: businessFleetLaunchCashCycleCommandHash(step, action),
    expectedInternalEffect: `Queue the ${step.label} cash-cycle command for internal review only; external systems remain locked.`,
    externalExecution: false as const,
    priority: businessFleetLaunchCashCycleCommandPriority(step),
    providerContacted: false as const,
    reason: step.reason,
    recommendedStatus: null,
    riskLevel: businessFleetLaunchCashCycleCommandRisk(step),
    sourceModule: "revenue_business_fleet_launch_cash_cycle",
    targetId: `business_fleet_launch_cash_cycle:${step.id}`,
    targetName: step.label,
    targetType: businessFleetLaunchCashCycleCommandTargetType(step)
  };
}

async function applyRevenueBusinessFleetLaunchCashCycle(
  userId: string,
  input: ApplyRevenueBusinessFleetLaunchCashCycleInput
) {
  const current = await buildRevenueBusinessFleetLaunchCashCycleForUser(userId, revenueBusinessFleetLaunchCashCycleQuerySchema.parse(input));
  const command = businessFleetLaunchCashCycleCommand(current.plan);
  const summary = command
    ? `Cash-cycle command ${command.action.replace(/_/g, " ")} for ${command.targetName} ${input.dryRun ? "would be queued" : "queued"} internally.`
    : "No cash-cycle command is available because the current plan has no next step.";

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        commandRecordId: null,
        commandRecordsCreated: command ? 1 : 0,
        dryRun: true,
        externalExecution: false as const,
        nextStepId: current.plan.nextStep?.id ?? null,
        nextStepStatus: current.plan.nextStep?.status ?? null,
        providerContacted: false as const,
        summary
      },
      command,
      commandRecord: null,
      plan: current.plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.business_fleet.launch_cash_cycle.command_recorded",
    actorUserId: userId,
    metadata: {
      blockedExternalActions: current.plan.blockedExternalActions,
      command,
      externalExecution: false,
      note: input.note ?? null,
      planSummary: current.plan.summary,
      portfolioPressure: current.plan.portfolioPressure,
      providerContacted: false,
      targetBusinesses: current.plan.targetBusinesses,
      totals: current.plan.totals
    },
    outcome: "success",
    severity: command?.riskLevel === "high" ? "high" : command?.riskLevel === "medium" ? "medium" : "low",
    targetId: command?.targetId ?? null,
    targetType: "revenue_business_fleet_launch_cash_cycle"
  });
  const commandRecord = command
    ? await prisma.portfolioCommandAction.create({
      data: {
        action: command.action,
        auditLogId: auditLog.id,
        commandHash: command.commandHash,
        controlJson: stringifySecureJson({
          approvalGate: command.approvalGate,
          blockedExternalActions: command.blockedExternalActions,
          cashCycleStep: current.plan.nextStep,
          expectedInternalEffect: command.expectedInternalEffect,
          externalExecution: false,
          launchControl: current.plan.launchControl,
          outcomeSignals: current.plan.outcomeSignals,
          portfolioPressure: current.plan.portfolioPressure,
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
        status: command.riskLevel === "high" ? "blocked" : "queued",
        targetId: command.targetId,
        targetName: command.targetName,
        targetType: command.targetType,
        userId
      }
    })
    : null;
  const refreshed = await buildRevenueBusinessFleetLaunchCashCycleForUser(userId, revenueBusinessFleetLaunchCashCycleQuerySchema.parse(input));

  return {
    applied: {
      auditLogId: auditLog.id,
      commandRecordId: commandRecord?.id ?? null,
      commandRecordsCreated: commandRecord ? 1 : 0,
      dryRun: false,
      externalExecution: false as const,
      nextStepId: current.plan.nextStep?.id ?? null,
      nextStepStatus: current.plan.nextStep?.status ?? null,
      providerContacted: false as const,
      summary
    },
    command,
    commandRecord: commandRecord ? portfolioCommandRecordSnapshot(commandRecord) : null,
    plan: refreshed.plan
  };
}

type RevenueBusinessFleetLaunchCashCycleCommandQueueResolution = "applied" | "skipped" | "blocked";
type RevenueBusinessFleetLaunchCashCycleCommandQueueStatus = PortfolioCommandRecordStatus;

const revenueBusinessFleetLaunchCashCycleSourceModule = "revenue_business_fleet_launch_cash_cycle";
const revenueBusinessFleetLaunchCashCycleCommandStatuses: RevenueBusinessFleetLaunchCashCycleCommandQueueStatus[] = ["queued", "applied", "skipped", "blocked"];

function revenueBusinessFleetLaunchCashCycleCommandStatus(status: string): RevenueBusinessFleetLaunchCashCycleCommandQueueStatus {
  return revenueBusinessFleetLaunchCashCycleCommandStatuses.includes(status as RevenueBusinessFleetLaunchCashCycleCommandQueueStatus)
    ? status as RevenueBusinessFleetLaunchCashCycleCommandQueueStatus
    : "blocked";
}

function revenueBusinessFleetLaunchCashCycleCommandEndpoint(record: PortfolioCommandRecordSnapshot, step: Record<string, unknown>) {
  const endpoint = stringFromRecord(step, "endpoint");

  if (endpoint) return endpoint;
  if (record.action === "review_scale_budget") return "/merch/financial-orchestrator/scaling-budgets/review";
  if (record.action === "review_payout") return "/merch/financial-orchestrator/plan";
  if (record.action === "generate") return "/merch/revenue-engine/business-fleet-scheduler/launch-gap/seeds/apply";
  if (record.action === "prepare_launch") return "/merch/revenue-engine/business-fleet-scheduler/launch-wave/apply";

  return "/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-cash-cycle";
}

function revenueBusinessFleetLaunchCashCycleCommandRecommendedResolution(
  status: RevenueBusinessFleetLaunchCashCycleCommandQueueStatus,
  riskLevel: string
): RevenueBusinessFleetLaunchCashCycleCommandQueueResolution {
  if (status === "applied") return "applied";
  if (status === "skipped") return "skipped";
  if (status === "blocked" || riskLevel === "high") return "blocked";

  return "applied";
}

function revenueBusinessFleetLaunchCashCycleCommandReason(input: {
  record: PortfolioCommandRecordSnapshot;
  recommendedResolution: RevenueBusinessFleetLaunchCashCycleCommandQueueResolution;
  status: RevenueBusinessFleetLaunchCashCycleCommandQueueStatus;
}) {
  if (input.status === "applied") return "Command already resolved internally; no provider or external execution was contacted.";
  if (input.status === "skipped") return "Command was skipped internally and remains available only as audit context.";
  if (input.recommendedResolution === "blocked") return "Command requires operator review before it can move because risk or status is blocked.";

  return input.record.reason;
}

function revenueBusinessFleetLaunchCashCycleCommandQueueItem(record: PortfolioCommandRecordSnapshot) {
  const status = revenueBusinessFleetLaunchCashCycleCommandStatus(record.status);
  const control = recordFromUnknown(record.control);
  const step = recordFromUnknown(control.cashCycleStep);
  const plannedState = stringFromRecord(step, "nextInternalState") ?? "cash_cycle_command_review";
  const recommendedResolution = revenueBusinessFleetLaunchCashCycleCommandRecommendedResolution(status, record.riskLevel);
  const runnable = status === "queued" && recommendedResolution === "applied" && record.riskLevel !== "high";
  const reason = revenueBusinessFleetLaunchCashCycleCommandReason({
    record,
    recommendedResolution,
    status
  });

  return {
    action: record.action,
    commandHash: record.commandHash,
    commandRecord: record,
    commandRecordId: record.id,
    externalExecution: false as const,
    externalExecutionLocked: true as const,
    nextInternalState: status === "queued" ? plannedState : `cash_cycle_command_${status}_internal`,
    providerContacted: false as const,
    reason,
    recommendedEndpoint: revenueBusinessFleetLaunchCashCycleCommandEndpoint(record, step),
    recommendedResolution,
    riskLevel: record.riskLevel,
    runnable,
    sourceModule: record.sourceModule,
    status,
    targetName: record.targetName,
    targetType: record.targetType
  };
}

async function buildRevenueBusinessFleetLaunchCashCycleCommandQueueForUser(
  userId: string,
  input: RevenueBusinessFleetLaunchCashCycleCommandQueueQueryInput
) {
  const commandRecords = await prisma.portfolioCommandAction.findMany({
    orderBy: [
      { priority: "asc" },
      { createdAt: "desc" }
    ],
    take: input.maxCommands,
    where: {
      sourceModule: revenueBusinessFleetLaunchCashCycleSourceModule,
      status: {
        in: input.statuses
      },
      userId
    }
  });
  const commands = commandRecords
    .map(portfolioCommandRecordSnapshot)
    .map(revenueBusinessFleetLaunchCashCycleCommandQueueItem);
  const totals = {
    applied: commands.filter((item) => item.status === "applied").length,
    blocked: commands.filter((item) => item.status === "blocked").length,
    commands: commands.length,
    externalExecutionLocked: commands.filter((item) => item.externalExecutionLocked).length,
    highRisk: commands.filter((item) => item.riskLevel === "high").length,
    providerContacted: 0,
    queued: commands.filter((item) => item.status === "queued").length,
    runnable: commands.filter((item) => item.runnable).length,
    skipped: commands.filter((item) => item.status === "skipped").length
  };

  return {
    plan: {
      auditEvents: [
        "Cash-cycle command queue reads PortfolioCommandAction records from the launch cash-cycle source module.",
        "Resolve actions only update internal command status; external execution and provider contact remain locked."
      ],
      blockedExternalActions: [
        "Moving money from cash-cycle command queue",
        "Releasing budgets from cash-cycle command queue",
        "Publishing listings from cash-cycle command queue",
        "Changing ads from cash-cycle command queue",
        "Contacting providers from cash-cycle command queue",
        "Running browsers from cash-cycle command queue",
        "Uploading content from cash-cycle command queue"
      ],
      commands,
      externalExecution: false as const,
      generatedAt: new Date().toISOString(),
      mode: "Revenue Business Fleet Launch Cash Cycle Command Queue" as const,
      options: {
        maxCommands: input.maxCommands,
        statuses: input.statuses
      },
      providerContacted: false as const,
      summary: `${totals.commands} cash-cycle command${totals.commands === 1 ? "" : "s"} visible; ${totals.runnable} runnable, ${totals.blocked} blocked, and ${totals.applied + totals.skipped} already resolved.`,
      totals
    }
  };
}

function revenueBusinessFleetLaunchCashCycleCommandSelectable(input: {
  item: ReturnType<typeof revenueBusinessFleetLaunchCashCycleCommandQueueItem>;
  resolution: RevenueBusinessFleetLaunchCashCycleCommandQueueResolution;
}) {
  if (input.item.status === "applied" || input.item.status === "skipped") return false;
  if (input.resolution === "applied") return input.item.runnable;

  return input.item.status === "queued" || input.item.status === "blocked";
}

async function buildExplicitRevenueBusinessFleetLaunchCashCycleCommandQueueItems(userId: string, commandRecordIds: string[]) {
  if (commandRecordIds.length === 0) return [];

  const records = await prisma.portfolioCommandAction.findMany({
    orderBy: [
      { priority: "asc" },
      { createdAt: "desc" }
    ],
    where: {
      id: {
        in: commandRecordIds
      },
      sourceModule: revenueBusinessFleetLaunchCashCycleSourceModule,
      userId
    }
  });

  return records
    .map(portfolioCommandRecordSnapshot)
    .map(revenueBusinessFleetLaunchCashCycleCommandQueueItem);
}

async function applyRevenueBusinessFleetLaunchCashCycleCommandQueue(
  userId: string,
  input: ApplyRevenueBusinessFleetLaunchCashCycleCommandQueueInput
) {
  const current = await buildRevenueBusinessFleetLaunchCashCycleCommandQueueForUser(userId, {
    maxCommands: input.maxCommands,
    statuses: input.statuses
  });
  const explicitItems = await buildExplicitRevenueBusinessFleetLaunchCashCycleCommandQueueItems(userId, input.commandRecordIds);
  const baseItems = explicitItems.length > 0 ? explicitItems : current.plan.commands;
  const selectedCommands = baseItems
    .filter((item) => revenueBusinessFleetLaunchCashCycleCommandSelectable({
      item,
      resolution: input.resolution
    }))
    .slice(0, input.maxCommands);
  const statusUpdates = selectedCommands.map((item) => ({
    commandRecordId: item.commandRecordId,
    fromStatus: item.status,
    reason: item.reason,
    targetName: item.targetName,
    toStatus: input.resolution
  }));
  const summary = input.dryRun
    ? `${selectedCommands.length} cash-cycle command${selectedCommands.length === 1 ? "" : "s"} would be marked ${input.resolution} internally.`
    : `${selectedCommands.length} cash-cycle command${selectedCommands.length === 1 ? "" : "s"} marked ${input.resolution} internally.`;

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        commandRecordIds: selectedCommands.map((item) => item.commandRecordId),
        commandRecordsResolved: selectedCommands.length,
        dryRun: true,
        externalExecution: false as const,
        providerContacted: false as const,
        resolution: input.resolution,
        statusUpdates,
        summary
      },
      plan: current.plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.business_fleet.launch_cash_cycle.command_queue_resolved",
    actorUserId: userId,
    metadata: {
      commandRecordIds: selectedCommands.map((item) => item.commandRecordId),
      externalExecution: false,
      note: input.note ?? null,
      providerContacted: false,
      resolution: input.resolution,
      statusUpdates,
      summary
    },
    outcome: "success",
    severity: selectedCommands.some((item) => item.riskLevel === "high") || input.resolution === "blocked" ? "medium" : "low",
    targetId: selectedCommands[0]?.commandRecordId ?? null,
    targetType: "revenue_business_fleet_launch_cash_cycle_command_queue"
  });

  if (selectedCommands.length > 0) {
    await prisma.portfolioCommandAction.updateMany({
      data: {
        status: input.resolution
      },
      where: {
        externalExecution: false,
        id: {
          in: selectedCommands.map((item) => item.commandRecordId)
        },
        providerContacted: false,
        sourceModule: revenueBusinessFleetLaunchCashCycleSourceModule,
        status: {
          in: ["queued", "blocked"]
        },
        userId
      }
    });
  }

  const refreshed = await buildRevenueBusinessFleetLaunchCashCycleCommandQueueForUser(userId, {
    maxCommands: input.maxCommands,
    statuses: input.statuses
  });

  return {
    applied: {
      auditLogId: auditLog.id,
      commandRecordIds: selectedCommands.map((item) => item.commandRecordId),
      commandRecordsResolved: selectedCommands.length,
      dryRun: false,
      externalExecution: false as const,
      providerContacted: false as const,
      resolution: input.resolution,
      statusUpdates,
      summary
    },
    plan: refreshed.plan
  };
}

type RevenueBusinessFleetIncomeSprintLaneStatus =
  | "ready_to_launch"
  | "cash_command_ready"
  | "cash_command_blocked"
  | "provider_approval_needed"
  | "quality_repair"
  | "launch_candidate"
  | "watch_only"
  | "blocked";
type RevenueBusinessFleetIncomeSprintCashCommandState = "none" | "runnable" | "blocked" | "resolved";

function incomeSprintClamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function incomeSprintCashCommandState(commandQueue: Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchCashCycleCommandQueueForUser>>["plan"]): RevenueBusinessFleetIncomeSprintCashCommandState {
  if (commandQueue.totals.runnable > 0) return "runnable";
  if (commandQueue.totals.blocked > 0) return "blocked";
  if (commandQueue.totals.applied > 0 || commandQueue.totals.skipped > 0) return "resolved";

  return "none";
}

function incomeSprintLaneStatus(input: {
  business: RevenueBusinessFleetPlan["businesses"][number];
  cashCommandState: RevenueBusinessFleetIncomeSprintCashCommandState;
  gateItem: Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchGateForUser>>["plan"]["items"][number] | null;
}): RevenueBusinessFleetIncomeSprintLaneStatus {
  if (input.cashCommandState === "blocked" && input.business.lane === "launch_now") return "cash_command_blocked";
  if (input.gateItem?.gateStatus === "ready_for_manual_launch" && input.business.scheduleState === "ready_parallel") return "ready_to_launch";
  if (input.cashCommandState === "runnable" && input.business.scheduleState === "ready_parallel") return "cash_command_ready";
  if (input.gateItem?.gateStatus === "approval_needed") return "provider_approval_needed";
  if (input.gateItem?.gateStatus === "repair_required" || input.business.qualityGate.status === "block" || input.business.lane === "quality_repair") return "quality_repair";
  if (input.business.scheduleState === "blocked" || input.business.lane === "kill") return "blocked";
  if (input.business.lane === "launch_now") return "launch_candidate";

  return "watch_only";
}

function incomeSprintPriority(input: {
  business: RevenueBusinessFleetPlan["businesses"][number];
  cashCommandState: RevenueBusinessFleetIncomeSprintCashCommandState;
  gateItem: Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchGateForUser>>["plan"]["items"][number] | null;
  status: RevenueBusinessFleetIncomeSprintLaneStatus;
}) {
  const scheduleBonus = input.business.scheduleState === "ready_parallel"
    ? 16
    : input.business.scheduleState === "queued"
      ? 6
      : -12;
  const gateBonus = input.gateItem?.gateStatus === "ready_for_manual_launch"
    ? 18
    : input.gateItem?.gateStatus === "approval_needed"
      ? 5
      : input.gateItem?.gateStatus === "repair_required"
        ? -14
        : 0;
  const cashBonus = input.cashCommandState === "runnable"
    ? 8
    : input.cashCommandState === "blocked"
      ? -18
      : 0;
  const statusBonus: Record<RevenueBusinessFleetIncomeSprintLaneStatus, number> = {
    blocked: -30,
    cash_command_blocked: -22,
    cash_command_ready: 10,
    launch_candidate: 4,
    provider_approval_needed: 2,
    quality_repair: -18,
    ready_to_launch: 24,
    watch_only: -6
  };
  const velocityBonus = Math.min(18, Math.max(0, input.business.profitVelocity * 3));

  return incomeSprintClamp(Math.round(
    input.business.score.finalRank
    + velocityBonus
    + scheduleBonus
    + gateBonus
    + cashBonus
    + statusBonus[input.status]
  ), 0, 100);
}

function incomeSprintNextAction(input: {
  business: RevenueBusinessFleetPlan["businesses"][number];
  cashCommandState: RevenueBusinessFleetIncomeSprintCashCommandState;
  commandQueue: Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchCashCycleCommandQueueForUser>>["plan"];
  gateItem: Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchGateForUser>>["plan"]["items"][number] | null;
  readyPacket: Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchGateForUser>>["plan"]["readyQueue"][number] | null;
  status: RevenueBusinessFleetIncomeSprintLaneStatus;
}) {
  const runnableCommand = input.commandQueue.commands.find((command) => command.runnable) ?? null;
  const blockedCommand = input.commandQueue.commands.find((command) => command.status === "blocked") ?? null;

  if (input.cashCommandState === "blocked" && blockedCommand) {
    return {
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-cash-cycle/commands",
      label: "Review blocked cash command",
      state: "cash_command_blocked_review"
    };
  }

  if (input.cashCommandState === "runnable" && runnableCommand) {
    return {
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-cash-cycle/commands/apply",
      label: "Resolve cash command",
      state: "cash_command_queue_ready"
    };
  }

  if (input.readyPacket) {
    return {
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/manual-launch-evidence",
      label: "Prepare operator launch evidence",
      state: input.readyPacket.nextInternalState
    };
  }

  if (input.gateItem) return input.gateItem.nextInternalAction;

  return input.business.nextInternalAction;
}

async function buildRevenueBusinessFleetIncomeSprintForUser(
  userId: string,
  input: RevenueBusinessFleetIncomeSprintQueryInput
) {
  const schedulerInput = revenueBusinessFleetSchedulerQuerySchema.parse({
    launchWaveSize: input.launchWaveSize,
    maxParallelLaunches: input.maxParallelLaunches,
    maxParallelScaleActions: input.maxParallelScaleActions,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    targetBusinesses: input.targetBusinesses
  });
  const [schedulerContext, assetPortfolio, launchGate, commandQueue] = await Promise.all([
    buildRevenueBusinessFleetSchedulerForUser(userId, schedulerInput),
    buildAssetPortfolioForUser(userId, revenueEngineQuerySchema.parse({})),
    buildRevenueBusinessFleetLaunchGateForUser(userId, revenueBusinessFleetLaunchGateQuerySchema.parse({
      maxStores: input.maxStores,
      sourceKeys: input.sourceKeys
    })),
    buildRevenueBusinessFleetLaunchCashCycleCommandQueueForUser(userId, revenueBusinessFleetLaunchCashCycleCommandQueueQuerySchema.parse({
      maxCommands: input.maxCommands,
      statuses: ["queued", "blocked"]
    }))
  ]);
  const storeAssetsByStoreId = new Map(assetPortfolio.assets
    .filter((asset) => asset.assetType === "store")
    .map((asset) => [asset.storeId, asset]));
  const gateItemsByStoreId = new Map(launchGate.plan.items.map((item) => [item.storeId, item]));
  const readyPacketsByStoreId = new Map(launchGate.plan.readyQueue.map((item) => [item.storeId, item]));
  const cashCommandState = incomeSprintCashCommandState(commandQueue.plan);
  const laneCandidates = schedulerContext.plan.businesses.map((business) => {
    const gateItem = gateItemsByStoreId.get(business.businessId) ?? null;
    const readyPacket = readyPacketsByStoreId.get(business.businessId) ?? null;
    const storeAsset = storeAssetsByStoreId.get(business.businessId) ?? null;
    const status = incomeSprintLaneStatus({
      business,
      cashCommandState,
      gateItem
    });
    const priorityScore = incomeSprintPriority({
      business,
      cashCommandState,
      gateItem,
      status
    });
    const nextInternalAction = incomeSprintNextAction({
      business,
      cashCommandState,
      commandQueue: commandQueue.plan,
      gateItem,
      readyPacket,
      status
    });

    return {
      assetScore: storeAsset?.assetScore ?? {
        economicsScore: business.score.economicsScore,
        finalRank: business.score.finalRank,
        readinessScore: business.score.readinessScore,
        riskPenalty: Math.max(0, business.score.killPressure),
        velocity: Math.round(business.profitVelocity)
      },
      blockers: uniqueStrings([
        ...(business.qualityGate.status === "block" ? business.qualityGate.reasons : []),
        gateItem?.gateStatus === "approval_needed" ? "Provider approval is still pending." : "",
        gateItem?.gateStatus === "repair_required" ? gateItem.reason : "",
        cashCommandState === "blocked" && business.lane === "launch_now" ? "Cash-cycle command queue has a blocked command." : ""
      ]),
      businessId: business.businessId,
      businessName: business.businessName,
      cashCommandState,
      externalExecution: false as const,
      gateStatus: gateItem?.gateStatus ?? null,
      nextInternalAction,
      priorityScore,
      profitVelocity: business.profitVelocity,
      providerContacted: false as const,
      reason: status === "ready_to_launch"
        ? `${business.businessName} is ready for manual launch review with score ${business.score.finalRank}/100.`
        : status === "cash_command_ready"
          ? `${business.businessName} is ready once the runnable cash command is resolved internally.`
          : gateItem?.reason ?? business.nextInternalAction.reason,
      recommendation: business.topAsset?.recommendation ?? storeAsset?.recommendation ?? "watch",
      scheduleState: business.scheduleState,
      shardId: business.shardId,
      status,
      topAsset: business.topAsset,
      trackedAssets: business.trackedAssets
    };
  });
  const lanes = laneCandidates
    .sort((left, right) => right.priorityScore - left.priorityScore || right.assetScore.finalRank - left.assetScore.finalRank || right.profitVelocity - left.profitVelocity)
    .slice(0, input.maxLanes);
  const statusCount = (status: RevenueBusinessFleetIncomeSprintLaneStatus) => lanes.filter((lane) => lane.status === status).length;
  const topLane = lanes[0] ?? null;
  const summary = topLane
    ? `${lanes.length} income sprint lane${lanes.length === 1 ? "" : "s"} ranked for the next operating window. Top lane: ${topLane.businessName} at ${topLane.priorityScore}/100 with next state ${topLane.nextInternalAction.state}.`
    : "No income sprint lanes are available yet; create or accelerate launch-gap seeds first.";

  return {
    plan: {
      assetPortfolio: {
        generatedAt: assetPortfolio.generatedAt,
        summary: assetPortfolio.summary,
        totals: assetPortfolio.totals
      },
      auditEvents: [
        "Income sprint board composes the scored asset portfolio, business fleet scheduler, launch gate, and cash command queue.",
        "Board is read-only and only recommends the next internal action for each lane."
      ],
      blockedExternalActions: uniqueStrings([
        ...schedulerContext.plan.blockedExternalActions,
        ...assetPortfolio.blockedExternalActions,
        ...launchGate.plan.blockedExternalActions,
        ...commandQueue.plan.blockedExternalActions
      ]),
      cashCommandContext: {
        nextCommandId: commandQueue.plan.commands.find((command) => command.runnable)?.commandRecordId ?? commandQueue.plan.commands[0]?.commandRecordId ?? null,
        state: cashCommandState,
        summary: commandQueue.plan.summary,
        totals: commandQueue.plan.totals
      },
      externalExecution: false as const,
      generatedAt: new Date().toISOString(),
      lanes,
      launchGate: {
        summary: launchGate.plan.summary,
        totals: launchGate.plan.totals
      },
      mode: "Revenue Business Fleet Income Sprint Board" as const,
      options: input,
      providerContacted: false as const,
      scheduler: {
        capacity: schedulerContext.plan.capacity,
        summary: schedulerContext.plan.summary,
        totals: schedulerContext.plan.totals
      },
      summary,
      totals: {
        blocked: statusCount("blocked"),
        cashCommandBlocked: statusCount("cash_command_blocked"),
        cashCommandReady: statusCount("cash_command_ready"),
        externalExecutionLocked: lanes.length,
        lanes: lanes.length,
        launchCandidates: statusCount("launch_candidate"),
        profitVelocity: Math.round(lanes.reduce((total, lane) => total + lane.profitVelocity, 0) * 100) / 100,
        providerApprovalNeeded: statusCount("provider_approval_needed"),
        providerContacted: 0,
        qualityRepair: statusCount("quality_repair"),
        readyToLaunch: statusCount("ready_to_launch"),
        targetBusinesses: input.targetBusinesses,
        targetGap: schedulerContext.plan.capacity.targetGap,
        watchOnly: statusCount("watch_only")
      }
    }
  };
}

type RevenueBusinessFleetIncomeSprintPlanResult = Awaited<ReturnType<typeof buildRevenueBusinessFleetIncomeSprintForUser>>["plan"];
type RevenueBusinessFleetIncomeSprintLane = RevenueBusinessFleetIncomeSprintPlanResult["lanes"][number];

function businessFleetIncomeSprintCommandHash(lane: RevenueBusinessFleetIncomeSprintLane, action: PortfolioCommandAction) {
  return `portfolio:business_fleet_income_sprint:${lane.businessId}:${action}:${lane.nextInternalAction.state}`
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "_");
}

function businessFleetIncomeSprintCommandAction(lane: RevenueBusinessFleetIncomeSprintLane): PortfolioCommandAction {
  if (lane.status === "ready_to_launch" || lane.status === "launch_candidate") return "prepare_launch";
  if (lane.status === "quality_repair") return "revise";
  if (lane.status === "blocked") return "watch";

  return "record_governance";
}

function businessFleetIncomeSprintCommandRisk(lane: RevenueBusinessFleetIncomeSprintLane): PortfolioCommandRiskLevel {
  if (lane.status === "blocked" || lane.status === "cash_command_blocked") return "high";
  if (lane.status === "quality_repair" || lane.status === "provider_approval_needed" || lane.status === "cash_command_ready") return "medium";

  return "low";
}

function businessFleetIncomeSprintCommandRecordStatus(lane: RevenueBusinessFleetIncomeSprintLane): PortfolioCommandRecordStatus {
  return businessFleetIncomeSprintCommandRisk(lane) === "high" ? "blocked" : "queued";
}

function businessFleetIncomeSprintLaneSelectable(lane: RevenueBusinessFleetIncomeSprintLane) {
  return lane.status !== "watch_only";
}

function businessFleetIncomeSprintCommand(lane: RevenueBusinessFleetIncomeSprintLane, plan: RevenueBusinessFleetIncomeSprintPlanResult): PortfolioCommandItem {
  const action = businessFleetIncomeSprintCommandAction(lane);
  const riskLevel = businessFleetIncomeSprintCommandRisk(lane);

  return {
    action,
    approvalGate: {
      externalExecutionLocked: true,
      humanApprovalRequired: true,
      status: "Required"
    },
    blockedExternalActions: uniqueStrings([
      ...plan.blockedExternalActions,
      ...lane.blockers
    ]),
    commandHash: businessFleetIncomeSprintCommandHash(lane, action),
    expectedInternalEffect: `Queue ${lane.businessName} for ${lane.nextInternalAction.label} from the income sprint board; external execution remains locked.`,
    externalExecution: false as const,
    priority: Math.max(1, 100 - lane.priorityScore),
    providerContacted: false as const,
    reason: lane.reason,
    recommendedStatus: lane.nextInternalAction.state,
    riskLevel,
    sourceModule: "revenue_business_fleet_income_sprint",
    targetId: lane.businessId,
    targetName: lane.businessName,
    targetType: "store"
  };
}

async function applyRevenueBusinessFleetIncomeSprintCommand(
  userId: string,
  input: ApplyRevenueBusinessFleetIncomeSprintCommandInput
) {
  const current = await buildRevenueBusinessFleetIncomeSprintForUser(userId, revenueBusinessFleetIncomeSprintQuerySchema.parse(input));
  const requestedLaneIds = new Set(input.laneIds);
  const selectedLanes = current.plan.lanes
    .filter((lane) => requestedLaneIds.size === 0 || requestedLaneIds.has(lane.businessId))
    .filter(businessFleetIncomeSprintLaneSelectable)
    .slice(0, input.maxLanes);
  const commands = selectedLanes.map((lane) => businessFleetIncomeSprintCommand(lane, current.plan));
  const summary = input.dryRun
    ? `${commands.length} income sprint command${commands.length === 1 ? "" : "s"} would be recorded internally.`
    : `${commands.length} income sprint command${commands.length === 1 ? "" : "s"} recorded internally.`;

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        blockedCommands: commands.filter((command) => command.riskLevel === "high").length,
        commandRecordIds: [] as string[],
        commandRecordsCreated: commands.length,
        dryRun: true,
        externalExecution: false as const,
        providerContacted: false as const,
        selectedLaneIds: selectedLanes.map((lane) => lane.businessId),
        summary
      },
      commandRecords: [] as PortfolioCommandRecordSnapshot[],
      commands,
      plan: current.plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.business_fleet.income_sprint.commands_recorded",
    actorUserId: userId,
    metadata: {
      commands: commands.map((command) => ({
        action: command.action,
        commandHash: command.commandHash,
        riskLevel: command.riskLevel,
        targetId: command.targetId,
        targetName: command.targetName
      })),
      externalExecution: false,
      note: input.note ?? null,
      providerContacted: false,
      selectedLaneIds: selectedLanes.map((lane) => lane.businessId),
      summary
    },
    outcome: "success",
    severity: commands.some((command) => command.riskLevel === "high") ? "high" : commands.some((command) => command.riskLevel === "medium") ? "medium" : "low",
    targetId: null,
    targetType: "revenue_business_fleet_income_sprint"
  });
  const commandRecords = await Promise.all(commands.map((command) => prisma.portfolioCommandAction.create({
    data: {
      action: command.action,
      auditLogId: auditLog.id,
      commandHash: command.commandHash,
      controlJson: stringifySecureJson({
        approvalGate: command.approvalGate,
        blockedExternalActions: command.blockedExternalActions,
        cashCommandContext: current.plan.cashCommandContext,
        expectedInternalEffect: command.expectedInternalEffect,
        externalExecution: false,
        incomeSprintLane: selectedLanes.find((lane) => lane.businessId === command.targetId) ?? null,
        nextInternalAction: selectedLanes.find((lane) => lane.businessId === command.targetId)?.nextInternalAction ?? null,
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
      status: businessFleetIncomeSprintCommandRecordStatus(selectedLanes.find((lane) => lane.businessId === command.targetId) ?? selectedLanes[0]!),
      targetId: command.targetId,
      targetName: command.targetName,
      targetType: command.targetType,
      userId
    }
  })));
  const refreshed = await buildRevenueBusinessFleetIncomeSprintForUser(userId, revenueBusinessFleetIncomeSprintQuerySchema.parse(input));

  return {
    applied: {
      auditLogId: auditLog.id,
      blockedCommands: commands.filter((command) => command.riskLevel === "high").length,
      commandRecordIds: commandRecords.map((record) => record.id),
      commandRecordsCreated: commandRecords.length,
      dryRun: false,
      externalExecution: false as const,
      providerContacted: false as const,
      selectedLaneIds: selectedLanes.map((lane) => lane.businessId),
      summary
    },
    commandRecords: commandRecords.map(portfolioCommandRecordSnapshot),
    commands,
    plan: refreshed.plan
  };
}

type RevenueBusinessFleetIncomeSprintCommandQueueResolution = "applied" | "skipped" | "blocked";
type RevenueBusinessFleetIncomeSprintCommandQueueStatus = PortfolioCommandRecordStatus;

const revenueBusinessFleetIncomeSprintSourceModule = "revenue_business_fleet_income_sprint";
const revenueBusinessFleetIncomeSprintCommandStatuses: RevenueBusinessFleetIncomeSprintCommandQueueStatus[] = ["queued", "applied", "skipped", "blocked"];

function revenueBusinessFleetIncomeSprintCommandStatus(status: string): RevenueBusinessFleetIncomeSprintCommandQueueStatus {
  return revenueBusinessFleetIncomeSprintCommandStatuses.includes(status as RevenueBusinessFleetIncomeSprintCommandQueueStatus)
    ? status as RevenueBusinessFleetIncomeSprintCommandQueueStatus
    : "blocked";
}

function revenueBusinessFleetIncomeSprintCommandEndpoint(record: PortfolioCommandRecordSnapshot, nextInternalAction: Record<string, unknown>) {
  const endpoint = stringFromRecord(nextInternalAction, "endpoint");

  if (endpoint) return endpoint;
  if (record.action === "prepare_launch") return "/merch/revenue-engine/business-fleet-scheduler/launch-wave/apply";
  if (record.action === "revise") return "/merch/revenue-engine/portfolio/action";
  if (record.action === "record_governance") return "/merch/revenue-engine/business-fleet-scheduler/income-sprint";

  return "/merch/portfolio-command-center";
}

function revenueBusinessFleetIncomeSprintCommandRecommendedResolution(
  status: RevenueBusinessFleetIncomeSprintCommandQueueStatus,
  riskLevel: string
): RevenueBusinessFleetIncomeSprintCommandQueueResolution {
  if (status === "applied") return "applied";
  if (status === "skipped") return "skipped";
  if (status === "blocked" || riskLevel === "high") return "blocked";

  return "applied";
}

function revenueBusinessFleetIncomeSprintCommandReason(input: {
  record: PortfolioCommandRecordSnapshot;
  recommendedResolution: RevenueBusinessFleetIncomeSprintCommandQueueResolution;
  status: RevenueBusinessFleetIncomeSprintCommandQueueStatus;
}) {
  if (input.status === "applied") return "Income sprint command already resolved internally; no provider or external execution was contacted.";
  if (input.status === "skipped") return "Income sprint command was skipped internally and remains available only as audit context.";
  if (input.recommendedResolution === "blocked") return "Income sprint command requires operator review because risk or status is blocked.";

  return input.record.reason;
}

function revenueBusinessFleetIncomeSprintCommandQueueItem(record: PortfolioCommandRecordSnapshot) {
  const status = revenueBusinessFleetIncomeSprintCommandStatus(record.status);
  const control = recordFromUnknown(record.control);
  const nextInternalAction = recordFromUnknown(control.nextInternalAction);
  const lane = recordFromUnknown(control.incomeSprintLane);
  const plannedState = record.recommendedStatus
    ?? stringFromRecord(nextInternalAction, "state")
    ?? stringFromRecord(recordFromUnknown(lane.nextInternalAction), "state")
    ?? "income_sprint_command_review";
  const recommendedResolution = revenueBusinessFleetIncomeSprintCommandRecommendedResolution(status, record.riskLevel);
  const runnable = status === "queued" && recommendedResolution === "applied" && record.riskLevel !== "high";
  const reason = revenueBusinessFleetIncomeSprintCommandReason({
    record,
    recommendedResolution,
    status
  });

  return {
    action: record.action,
    commandHash: record.commandHash,
    commandRecord: record,
    commandRecordId: record.id,
    externalExecution: false as const,
    externalExecutionLocked: true as const,
    nextInternalState: status === "queued" ? plannedState : `income_sprint_command_${status}_internal`,
    providerContacted: false as const,
    reason,
    recommendedEndpoint: revenueBusinessFleetIncomeSprintCommandEndpoint(record, nextInternalAction),
    recommendedResolution,
    riskLevel: record.riskLevel,
    runnable,
    sourceModule: record.sourceModule,
    status,
    targetName: record.targetName,
    targetType: record.targetType
  };
}

async function buildRevenueBusinessFleetIncomeSprintCommandQueueForUser(
  userId: string,
  input: RevenueBusinessFleetIncomeSprintCommandQueueQueryInput
) {
  const commandRecords = await prisma.portfolioCommandAction.findMany({
    orderBy: [
      { priority: "asc" },
      { createdAt: "desc" }
    ],
    take: input.maxCommands,
    where: {
      sourceModule: revenueBusinessFleetIncomeSprintSourceModule,
      status: {
        in: input.statuses
      },
      userId
    }
  });
  const commands = commandRecords
    .map(portfolioCommandRecordSnapshot)
    .map(revenueBusinessFleetIncomeSprintCommandQueueItem);
  const totals = {
    applied: commands.filter((item) => item.status === "applied").length,
    blocked: commands.filter((item) => item.status === "blocked").length,
    commands: commands.length,
    externalExecutionLocked: commands.filter((item) => item.externalExecutionLocked).length,
    highRisk: commands.filter((item) => item.riskLevel === "high").length,
    providerContacted: 0,
    queued: commands.filter((item) => item.status === "queued").length,
    runnable: commands.filter((item) => item.runnable).length,
    skipped: commands.filter((item) => item.status === "skipped").length
  };

  return {
    plan: {
      auditEvents: [
        "Income sprint command queue reads PortfolioCommandAction records from the income sprint source module.",
        "Resolve actions only update internal command status; external execution and provider contact remain locked."
      ],
      blockedExternalActions: [
        "Moving money from income sprint command queue",
        "Releasing budgets from income sprint command queue",
        "Publishing listings from income sprint command queue",
        "Changing ads from income sprint command queue",
        "Contacting providers from income sprint command queue",
        "Running browsers from income sprint command queue",
        "Uploading content from income sprint command queue"
      ],
      commands,
      externalExecution: false as const,
      generatedAt: new Date().toISOString(),
      mode: "Revenue Business Fleet Income Sprint Command Queue" as const,
      options: {
        maxCommands: input.maxCommands,
        statuses: input.statuses
      },
      providerContacted: false as const,
      summary: `${totals.commands} income sprint command${totals.commands === 1 ? "" : "s"} visible; ${totals.runnable} runnable, ${totals.blocked} blocked, and ${totals.applied + totals.skipped} already resolved.`,
      totals
    }
  };
}

function revenueBusinessFleetIncomeSprintCommandSelectable(input: {
  item: ReturnType<typeof revenueBusinessFleetIncomeSprintCommandQueueItem>;
  resolution: RevenueBusinessFleetIncomeSprintCommandQueueResolution;
}) {
  if (input.item.status === "applied" || input.item.status === "skipped") return false;
  if (input.resolution === "applied") return input.item.runnable;

  return input.item.status === "queued" || input.item.status === "blocked";
}

async function buildExplicitRevenueBusinessFleetIncomeSprintCommandQueueItems(userId: string, commandRecordIds: string[]) {
  if (commandRecordIds.length === 0) return [];

  const records = await prisma.portfolioCommandAction.findMany({
    orderBy: [
      { priority: "asc" },
      { createdAt: "desc" }
    ],
    where: {
      id: {
        in: commandRecordIds
      },
      sourceModule: revenueBusinessFleetIncomeSprintSourceModule,
      userId
    }
  });

  return records
    .map(portfolioCommandRecordSnapshot)
    .map(revenueBusinessFleetIncomeSprintCommandQueueItem);
}

async function applyRevenueBusinessFleetIncomeSprintCommandQueue(
  userId: string,
  input: ApplyRevenueBusinessFleetIncomeSprintCommandQueueInput
) {
  const current = await buildRevenueBusinessFleetIncomeSprintCommandQueueForUser(userId, {
    maxCommands: input.maxCommands,
    statuses: input.statuses
  });
  const explicitItems = await buildExplicitRevenueBusinessFleetIncomeSprintCommandQueueItems(userId, input.commandRecordIds);
  const baseItems = explicitItems.length > 0 ? explicitItems : current.plan.commands;
  const selectedCommands = baseItems
    .filter((item) => revenueBusinessFleetIncomeSprintCommandSelectable({
      item,
      resolution: input.resolution
    }))
    .slice(0, input.maxCommands);
  const statusUpdates = selectedCommands.map((item) => ({
    commandRecordId: item.commandRecordId,
    fromStatus: item.status,
    reason: item.reason,
    targetName: item.targetName,
    toStatus: input.resolution
  }));
  const summary = input.dryRun
    ? `${selectedCommands.length} income sprint command${selectedCommands.length === 1 ? "" : "s"} would be marked ${input.resolution} internally.`
    : `${selectedCommands.length} income sprint command${selectedCommands.length === 1 ? "" : "s"} marked ${input.resolution} internally.`;

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        commandRecordIds: selectedCommands.map((item) => item.commandRecordId),
        commandRecordsResolved: selectedCommands.length,
        dryRun: true,
        externalExecution: false as const,
        providerContacted: false as const,
        resolution: input.resolution,
        statusUpdates,
        summary
      },
      plan: current.plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.business_fleet.income_sprint.command_queue_resolved",
    actorUserId: userId,
    metadata: {
      commandRecordIds: selectedCommands.map((item) => item.commandRecordId),
      externalExecution: false,
      note: input.note ?? null,
      providerContacted: false,
      resolution: input.resolution,
      statusUpdates,
      summary
    },
    outcome: "success",
    severity: selectedCommands.some((item) => item.riskLevel === "high") || input.resolution === "blocked" ? "medium" : "low",
    targetId: selectedCommands[0]?.commandRecordId ?? null,
    targetType: "revenue_business_fleet_income_sprint_command_queue"
  });

  if (selectedCommands.length > 0) {
    await prisma.portfolioCommandAction.updateMany({
      data: {
        status: input.resolution
      },
      where: {
        externalExecution: false,
        id: {
          in: selectedCommands.map((item) => item.commandRecordId)
        },
        providerContacted: false,
        sourceModule: revenueBusinessFleetIncomeSprintSourceModule,
        status: {
          in: ["queued", "blocked"]
        },
        userId
      }
    });
  }

  const refreshed = await buildRevenueBusinessFleetIncomeSprintCommandQueueForUser(userId, {
    maxCommands: input.maxCommands,
    statuses: input.statuses
  });

  return {
    applied: {
      auditLogId: auditLog.id,
      commandRecordIds: selectedCommands.map((item) => item.commandRecordId),
      commandRecordsResolved: selectedCommands.length,
      dryRun: false,
      externalExecution: false as const,
      providerContacted: false as const,
      resolution: input.resolution,
      statusUpdates,
      summary
    },
    plan: refreshed.plan
  };
}

type RevenueBusinessFleetLaunchNightLaneStatus =
  | "ready_for_operator_launch"
  | "ready_for_launch_wave"
  | "sprint_command_ready"
  | "cash_command_ready"
  | "needs_provider_approval"
  | "needs_quality_repair"
  | "needs_launch_package"
  | "needs_execution_queue"
  | "needs_worker_assignment"
  | "needs_manual_evidence"
  | "launch_candidate"
  | "watch_only"
  | "blocked";
type RevenueBusinessFleetLaunchNightCommandState = "none" | "runnable" | "blocked" | "resolved";

function launchNightCommandState(commands: Array<{ riskLevel: string; runnable: boolean; status: PortfolioCommandRecordStatus; targetName: string }>, lane: RevenueBusinessFleetIncomeSprintLane): RevenueBusinessFleetLaunchNightCommandState {
  const matchingCommands = commands.filter((command) => command.targetName === lane.businessName);

  if (matchingCommands.some((command) => command.runnable)) return "runnable";
  if (matchingCommands.some((command) => command.status === "blocked" || command.riskLevel === "high")) return "blocked";
  if (matchingCommands.some((command) => command.status === "applied" || command.status === "skipped")) return "resolved";

  return "none";
}

function launchNightStatus(input: {
  cashCommandState: RevenueBusinessFleetLaunchNightCommandState;
  lane: RevenueBusinessFleetIncomeSprintLane;
  launchControlState: RevenueBusinessFleetLaunchControlStatus;
  sprintCommandState: RevenueBusinessFleetLaunchNightCommandState;
}): RevenueBusinessFleetLaunchNightLaneStatus {
  if (input.sprintCommandState === "blocked" || input.cashCommandState === "blocked" || input.lane.status === "blocked") return "blocked";
  if (input.sprintCommandState === "runnable") return "sprint_command_ready";
  if (input.cashCommandState === "runnable" || input.lane.status === "cash_command_ready") return "cash_command_ready";
  if (input.lane.status === "provider_approval_needed" || input.lane.gateStatus === "approval_needed") return "needs_provider_approval";
  if (input.lane.status === "quality_repair" || input.lane.gateStatus === "repair_required") return "needs_quality_repair";
  if (input.launchControlState === "needs_launch_package") return "needs_launch_package";
  if (input.launchControlState === "needs_execution_queue") return "needs_execution_queue";
  if (input.launchControlState === "needs_worker_assignment") return "needs_worker_assignment";
  if (input.launchControlState === "ready_for_operator_launch" && input.lane.gateStatus === "ready_for_manual_launch") return "ready_for_operator_launch";
  if (input.launchControlState === "ready_for_operator_launch") return "needs_manual_evidence";
  if (input.launchControlState === "ready_for_launch_wave" && input.lane.scheduleState === "ready_parallel") return "ready_for_launch_wave";
  if (input.lane.status === "launch_candidate" || input.lane.status === "ready_to_launch") return "launch_candidate";

  return "watch_only";
}

function launchNightNextInternalAction(input: {
  lane: RevenueBusinessFleetIncomeSprintLane;
  launchControl: Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchControlForUser>>["plan"];
  status: RevenueBusinessFleetLaunchNightLaneStatus;
}) {
  if (input.status === "sprint_command_ready") {
    return {
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/income-sprint/commands/apply",
      label: "Resolve sprint command queue",
      state: "sprint_command_queue_ready"
    };
  }

  if (input.status === "cash_command_ready") {
    return {
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-cash-cycle/commands/apply",
      label: "Resolve cash command queue",
      state: "cash_command_queue_ready"
    };
  }

  if (input.status === "ready_for_operator_launch" || input.status === "needs_manual_evidence") {
    return input.launchControl.nextAction;
  }

  if (input.status === "needs_execution_queue" || input.status === "needs_worker_assignment" || input.status === "needs_launch_package") {
    return input.launchControl.nextAction;
  }

  return input.lane.nextInternalAction;
}

function launchNightStatusReason(input: {
  lane: RevenueBusinessFleetIncomeSprintLane;
  launchControl: Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchControlForUser>>["plan"];
  status: RevenueBusinessFleetLaunchNightLaneStatus;
}) {
  if (input.status === "ready_for_operator_launch") return `${input.lane.businessName} is ready for the operator launch step; record evidence after completion.`;
  if (input.status === "ready_for_launch_wave") return `${input.lane.businessName} can enter launch-wave preview with external execution still locked.`;
  if (input.status === "sprint_command_ready") return "Sprint command is queued and runnable; resolve it before advancing this lane.";
  if (input.status === "cash_command_ready") return "Cash-cycle command is queued and runnable; resolve it before advancing launch capital context.";
  if (input.status === "needs_execution_queue" || input.status === "needs_worker_assignment" || input.status === "needs_launch_package" || input.status === "needs_manual_evidence") return input.launchControl.nextAction.reason;

  return input.lane.reason;
}

async function buildRevenueBusinessFleetLaunchNightForUser(
  userId: string,
  input: RevenueBusinessFleetLaunchNightQueryInput
) {
  const incomeSprintInput = revenueBusinessFleetIncomeSprintQuerySchema.parse({
    ...input,
    maxLanes: Math.min(input.maxLanes, input.launchNightSize)
  });
  const launchControlInput = revenueBusinessFleetLaunchControlQuerySchema.parse({
    ...input,
    launchWaveSize: input.launchWaveSize
  });
  const commandQueueInput = revenueBusinessFleetIncomeSprintCommandQueueQuerySchema.parse({
    maxCommands: input.maxCommands,
    statuses: ["queued", "blocked", "applied", "skipped"]
  });
  const cashCommandQueueInput = revenueBusinessFleetLaunchCashCycleCommandQueueQuerySchema.parse({
    maxCommands: input.maxCommands,
    statuses: ["queued", "blocked", "applied", "skipped"]
  });
  const [incomeSprint, launchControl, sprintCommandQueue, cashCommandQueue] = await Promise.all([
    buildRevenueBusinessFleetIncomeSprintForUser(userId, incomeSprintInput),
    buildRevenueBusinessFleetLaunchControlForUser(userId, launchControlInput),
    buildRevenueBusinessFleetIncomeSprintCommandQueueForUser(userId, commandQueueInput),
    buildRevenueBusinessFleetLaunchCashCycleCommandQueueForUser(userId, cashCommandQueueInput)
  ]);
  const lanes = incomeSprint.plan.lanes.slice(0, input.launchNightSize).map((lane, index) => {
    const sprintCommandState = launchNightCommandState(sprintCommandQueue.plan.commands, lane);
    const cashCommandState = lane.cashCommandState === "runnable"
      ? "runnable"
      : lane.cashCommandState === "blocked"
        ? "blocked"
        : lane.cashCommandState === "resolved"
          ? "resolved"
          : launchNightCommandState(cashCommandQueue.plan.commands, lane);
    const status = launchNightStatus({
      cashCommandState,
      lane,
      launchControlState: launchControl.plan.nextAction.state,
      sprintCommandState
    });
    const nextInternalAction = launchNightNextInternalAction({
      lane,
      launchControl: launchControl.plan,
      status
    });
    const launchabilityScore = incomeSprintClamp(Math.round(
      lane.priorityScore
      + (status === "ready_for_operator_launch" || status === "ready_for_launch_wave" ? 10 : 0)
      + (sprintCommandState === "resolved" ? 4 : 0)
      - (status === "blocked" ? 35 : 0)
      - (status === "needs_quality_repair" ? 20 : 0)
      - (status === "needs_provider_approval" ? 12 : 0)
    ), 0, 100);

    return {
      assetScore: lane.assetScore,
      blockers: uniqueStrings([
        ...lane.blockers,
        status === "blocked" ? "Launch-night lane is blocked by command, cash, or scheduler risk." : "",
        status === "needs_execution_queue" || status === "needs_worker_assignment" || status === "needs_launch_package" || status === "needs_manual_evidence" ? launchControl.plan.nextAction.reason : ""
      ]),
      businessId: lane.businessId,
      businessName: lane.businessName,
      cashCommandState,
      externalExecution: false as const,
      gateStatus: lane.gateStatus,
      launchabilityScore,
      nextInternalAction,
      priorityScore: lane.priorityScore,
      profitVelocity: lane.profitVelocity,
      providerContacted: false as const,
      reason: launchNightStatusReason({
        lane,
        launchControl: launchControl.plan,
        status
      }),
      recommendation: lane.recommendation,
      scheduleState: lane.scheduleState,
      shardId: lane.shardId,
      sprintCommandState,
      status,
      tonightSlot: index + 1
    };
  });
  const statusCount = (status: RevenueBusinessFleetLaunchNightLaneStatus) => lanes.filter((lane) => lane.status === status).length;
  const readyNow = statusCount("ready_for_operator_launch") + statusCount("ready_for_launch_wave");
  const commandReady = statusCount("sprint_command_ready") + statusCount("cash_command_ready");

  return {
    plan: {
      auditEvents: [
        "Launch-night board composes income sprint lanes, launch control, sprint command queue, and cash command queue.",
        "Board is read-only; it does not launch stores, move funds, contact providers, or run browsers.",
        "The first operating target is the clean launch-night lane count, not the configured long-range business target."
      ],
      blockedExternalActions: uniqueStrings([
        ...incomeSprint.plan.blockedExternalActions,
        ...launchControl.plan.blockedExternalActions,
        ...sprintCommandQueue.plan.blockedExternalActions,
        ...cashCommandQueue.plan.blockedExternalActions
      ]),
      commandQueues: {
        cash: cashCommandQueue.plan.totals,
        sprint: sprintCommandQueue.plan.totals
      },
      externalExecution: false as const,
      generatedAt: new Date().toISOString(),
      lanes,
      launchControl: {
        nextAction: launchControl.plan.nextAction,
        summary: launchControl.plan.summary,
        swarm: launchControl.plan.swarm,
        totals: launchControl.plan.totals
      },
      mode: "Revenue Business Fleet Launch Night Board" as const,
      options: {
        launchNightSize: input.launchNightSize,
        launchWaveSize: input.launchWaveSize,
        maxCommands: input.maxCommands,
        maxLanes: input.maxLanes,
        maxStores: input.maxStores,
        maxWorkers: input.maxWorkers,
        qualityFloor: input.qualityFloor,
        shardCount: input.shardCount,
        sourceKeys: input.sourceKeys,
        targetBusinesses: input.targetBusinesses
      },
      providerContacted: false as const,
      summary: `${lanes.length} launch-night lane${lanes.length === 1 ? "" : "s"} ranked; ${readyNow} ready now, ${commandReady} waiting on command resolution, ${statusCount("needs_provider_approval")} approval, ${statusCount("needs_quality_repair")} repair, ${statusCount("blocked")} blocked.`,
      totals: {
        blocked: statusCount("blocked"),
        cashCommandReady: statusCount("cash_command_ready"),
        commandReady,
        externalExecutionLocked: lanes.length,
        lanes: lanes.length,
        launchNightSize: input.launchNightSize,
        launchWaveReady: statusCount("ready_for_launch_wave"),
        needsExecutionQueue: statusCount("needs_execution_queue"),
        needsLaunchPackage: statusCount("needs_launch_package"),
        needsManualEvidence: statusCount("needs_manual_evidence"),
        needsProviderApproval: statusCount("needs_provider_approval"),
        needsQualityRepair: statusCount("needs_quality_repair"),
        needsWorkerAssignment: statusCount("needs_worker_assignment"),
        operatorLaunchReady: statusCount("ready_for_operator_launch"),
        providerContacted: 0,
        readyNow,
        sprintCommandReady: statusCount("sprint_command_ready"),
        watchOnly: statusCount("watch_only")
      }
    }
  };
}

type RevenueBusinessFleetLaunchNightPlanResult = Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchNightForUser>>["plan"];
type RevenueBusinessFleetLaunchNightLane = RevenueBusinessFleetLaunchNightPlanResult["lanes"][number];

function businessFleetLaunchNightCommandHash(lane: RevenueBusinessFleetLaunchNightLane, action: PortfolioCommandAction) {
  return `portfolio:business_fleet_launch_night:${lane.businessId}:${action}:${lane.nextInternalAction.state}`
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "_");
}

function businessFleetLaunchNightCommandAction(lane: RevenueBusinessFleetLaunchNightLane): PortfolioCommandAction {
  if (lane.status === "ready_for_operator_launch" || lane.status === "ready_for_launch_wave" || lane.status === "launch_candidate") return "prepare_launch";
  if (lane.status === "needs_quality_repair") return "revise";
  if (lane.status === "blocked") return "watch";

  return "record_governance";
}

function businessFleetLaunchNightCommandRisk(lane: RevenueBusinessFleetLaunchNightLane): PortfolioCommandRiskLevel {
  if (lane.status === "blocked") return "high";
  if (
    lane.status === "cash_command_ready"
    || lane.status === "sprint_command_ready"
    || lane.status === "needs_provider_approval"
    || lane.status === "needs_quality_repair"
    || lane.status === "needs_launch_package"
    || lane.status === "needs_execution_queue"
    || lane.status === "needs_worker_assignment"
    || lane.status === "needs_manual_evidence"
  ) return "medium";

  return "low";
}

function businessFleetLaunchNightCommandRecordStatus(lane: RevenueBusinessFleetLaunchNightLane): PortfolioCommandRecordStatus {
  return businessFleetLaunchNightCommandRisk(lane) === "high" ? "blocked" : "queued";
}

function businessFleetLaunchNightLaneSelectable(lane: RevenueBusinessFleetLaunchNightLane) {
  return lane.status !== "watch_only";
}

function businessFleetLaunchNightCommand(lane: RevenueBusinessFleetLaunchNightLane, plan: RevenueBusinessFleetLaunchNightPlanResult): PortfolioCommandItem {
  const action = businessFleetLaunchNightCommandAction(lane);
  const riskLevel = businessFleetLaunchNightCommandRisk(lane);

  return {
    action,
    approvalGate: {
      externalExecutionLocked: true,
      humanApprovalRequired: true,
      status: "Required"
    },
    blockedExternalActions: uniqueStrings([
      ...plan.blockedExternalActions,
      ...lane.blockers
    ]),
    commandHash: businessFleetLaunchNightCommandHash(lane, action),
    expectedInternalEffect: `Queue launch-night slot ${lane.tonightSlot} (${lane.businessName}) for ${lane.nextInternalAction.label}; external execution remains locked.`,
    externalExecution: false as const,
    priority: Math.max(1, 100 - lane.launchabilityScore + lane.tonightSlot),
    providerContacted: false as const,
    reason: lane.reason,
    recommendedStatus: lane.nextInternalAction.state,
    riskLevel,
    sourceModule: "revenue_business_fleet_launch_night",
    targetId: lane.businessId,
    targetName: lane.businessName,
    targetType: "store"
  };
}

async function applyRevenueBusinessFleetLaunchNightCommand(
  userId: string,
  input: ApplyRevenueBusinessFleetLaunchNightCommandInput
) {
  const current = await buildRevenueBusinessFleetLaunchNightForUser(userId, revenueBusinessFleetLaunchNightQuerySchema.parse(input));
  const requestedLaneIds = new Set(input.laneIds);
  const selectedLanes = current.plan.lanes
    .filter((lane) => requestedLaneIds.size === 0 || requestedLaneIds.has(lane.businessId))
    .filter(businessFleetLaunchNightLaneSelectable)
    .slice(0, input.launchNightSize);
  const commands = selectedLanes.map((lane) => businessFleetLaunchNightCommand(lane, current.plan));
  const summary = input.dryRun
    ? `${commands.length} launch-night command${commands.length === 1 ? "" : "s"} would be recorded internally.`
    : `${commands.length} launch-night command${commands.length === 1 ? "" : "s"} recorded internally.`;

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        blockedCommands: commands.filter((command) => command.riskLevel === "high").length,
        commandRecordIds: [] as string[],
        commandRecordsCreated: commands.length,
        dryRun: true,
        externalExecution: false as const,
        providerContacted: false as const,
        selectedLaneIds: selectedLanes.map((lane) => lane.businessId),
        summary
      },
      commandRecords: [] as PortfolioCommandRecordSnapshot[],
      commands,
      plan: current.plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.business_fleet.launch_night.commands_recorded",
    actorUserId: userId,
    metadata: {
      commands: commands.map((command) => ({
        action: command.action,
        commandHash: command.commandHash,
        riskLevel: command.riskLevel,
        targetId: command.targetId,
        targetName: command.targetName
      })),
      externalExecution: false,
      launchNightSize: input.launchNightSize,
      note: input.note ?? null,
      providerContacted: false,
      selectedLaneIds: selectedLanes.map((lane) => lane.businessId),
      summary
    },
    outcome: "success",
    severity: commands.some((command) => command.riskLevel === "high") ? "high" : commands.some((command) => command.riskLevel === "medium") ? "medium" : "low",
    targetId: null,
    targetType: "revenue_business_fleet_launch_night"
  });
  const commandRecords = await Promise.all(commands.map((command) => {
    const lane = selectedLanes.find((item) => item.businessId === command.targetId) ?? selectedLanes[0]!;

    return prisma.portfolioCommandAction.create({
      data: {
        action: command.action,
        auditLogId: auditLog.id,
        commandHash: command.commandHash,
        controlJson: stringifySecureJson({
          approvalGate: command.approvalGate,
          blockedExternalActions: command.blockedExternalActions,
          commandQueues: current.plan.commandQueues,
          expectedInternalEffect: command.expectedInternalEffect,
          externalExecution: false,
          launchControl: current.plan.launchControl,
          launchNightLane: lane,
          nextInternalAction: lane.nextInternalAction,
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
        status: businessFleetLaunchNightCommandRecordStatus(lane),
        targetId: command.targetId,
        targetName: command.targetName,
        targetType: command.targetType,
        userId
      }
    });
  }));
  const refreshed = await buildRevenueBusinessFleetLaunchNightForUser(userId, revenueBusinessFleetLaunchNightQuerySchema.parse(input));

  return {
    applied: {
      auditLogId: auditLog.id,
      blockedCommands: commands.filter((command) => command.riskLevel === "high").length,
      commandRecordIds: commandRecords.map((record) => record.id),
      commandRecordsCreated: commandRecords.length,
      dryRun: false,
      externalExecution: false as const,
      providerContacted: false as const,
      selectedLaneIds: selectedLanes.map((lane) => lane.businessId),
      summary
    },
    commandRecords: commandRecords.map(portfolioCommandRecordSnapshot),
    commands,
    plan: refreshed.plan
  };
}

type RevenueBusinessFleetLaunchNightCommandQueueResolution = "applied" | "skipped" | "blocked";
type RevenueBusinessFleetLaunchNightCommandQueueStatus = PortfolioCommandRecordStatus;

const revenueBusinessFleetLaunchNightSourceModule = "revenue_business_fleet_launch_night";
const revenueBusinessFleetLaunchNightCommandStatuses: RevenueBusinessFleetLaunchNightCommandQueueStatus[] = ["queued", "applied", "skipped", "blocked"];

function revenueBusinessFleetLaunchNightCommandStatus(status: string): RevenueBusinessFleetLaunchNightCommandQueueStatus {
  return revenueBusinessFleetLaunchNightCommandStatuses.includes(status as RevenueBusinessFleetLaunchNightCommandQueueStatus)
    ? status as RevenueBusinessFleetLaunchNightCommandQueueStatus
    : "blocked";
}

function revenueBusinessFleetLaunchNightCommandEndpoint(record: PortfolioCommandRecordSnapshot, nextInternalAction: Record<string, unknown>) {
  const endpoint = stringFromRecord(nextInternalAction, "endpoint");

  if (endpoint) return endpoint;
  if (record.action === "prepare_launch") return "/merch/revenue-engine/business-fleet-scheduler/launch-gap/manual-launch-evidence";
  if (record.action === "revise") return "/merch/revenue-engine/portfolio/action";
  if (record.action === "watch" || record.action === "record_governance") return "/merch/revenue-engine/business-fleet-scheduler/launch-night";

  return "/merch/portfolio-command-center";
}

function revenueBusinessFleetLaunchNightCommandRecommendedResolution(
  status: RevenueBusinessFleetLaunchNightCommandQueueStatus,
  riskLevel: string
): RevenueBusinessFleetLaunchNightCommandQueueResolution {
  if (status === "applied") return "applied";
  if (status === "skipped") return "skipped";
  if (status === "blocked" || riskLevel === "high") return "blocked";

  return "applied";
}

function revenueBusinessFleetLaunchNightCommandReason(input: {
  record: PortfolioCommandRecordSnapshot;
  recommendedResolution: RevenueBusinessFleetLaunchNightCommandQueueResolution;
  status: RevenueBusinessFleetLaunchNightCommandQueueStatus;
}) {
  if (input.status === "applied") return "Launch-night command already resolved internally; no provider, browser, store, or payment system was contacted.";
  if (input.status === "skipped") return "Launch-night command was skipped internally and remains available only as audit context.";
  if (input.recommendedResolution === "blocked") return "Launch-night command requires operator review because risk or status is blocked.";

  return input.record.reason;
}

function revenueBusinessFleetLaunchNightCommandQueueItem(record: PortfolioCommandRecordSnapshot) {
  const status = revenueBusinessFleetLaunchNightCommandStatus(record.status);
  const control = recordFromUnknown(record.control);
  const nextInternalAction = recordFromUnknown(control.nextInternalAction);
  const lane = recordFromUnknown(control.launchNightLane);
  const plannedState = record.recommendedStatus
    ?? stringFromRecord(nextInternalAction, "state")
    ?? stringFromRecord(recordFromUnknown(lane.nextInternalAction), "state")
    ?? "launch_night_command_review";
  const recommendedResolution = revenueBusinessFleetLaunchNightCommandRecommendedResolution(status, record.riskLevel);
  const runnable = status === "queued" && recommendedResolution === "applied" && record.riskLevel !== "high";
  const reason = revenueBusinessFleetLaunchNightCommandReason({
    record,
    recommendedResolution,
    status
  });

  return {
    action: record.action,
    commandHash: record.commandHash,
    commandRecord: record,
    commandRecordId: record.id,
    externalExecution: false as const,
    externalExecutionLocked: true as const,
    nextInternalState: status === "queued" ? plannedState : `launch_night_command_${status}_internal`,
    providerContacted: false as const,
    reason,
    recommendedEndpoint: revenueBusinessFleetLaunchNightCommandEndpoint(record, nextInternalAction),
    recommendedResolution,
    riskLevel: record.riskLevel,
    runnable,
    sourceModule: record.sourceModule,
    status,
    targetName: record.targetName,
    targetType: record.targetType
  };
}

async function buildRevenueBusinessFleetLaunchNightCommandQueueForUser(
  userId: string,
  input: RevenueBusinessFleetLaunchNightCommandQueueQueryInput
) {
  const commandRecords = await prisma.portfolioCommandAction.findMany({
    orderBy: [
      { priority: "asc" },
      { createdAt: "desc" }
    ],
    take: input.maxCommands,
    where: {
      sourceModule: revenueBusinessFleetLaunchNightSourceModule,
      status: {
        in: input.statuses
      },
      userId
    }
  });
  const commands = commandRecords
    .map(portfolioCommandRecordSnapshot)
    .map(revenueBusinessFleetLaunchNightCommandQueueItem);
  const totals = {
    applied: commands.filter((item) => item.status === "applied").length,
    blocked: commands.filter((item) => item.status === "blocked").length,
    commands: commands.length,
    externalExecutionLocked: commands.filter((item) => item.externalExecutionLocked).length,
    highRisk: commands.filter((item) => item.riskLevel === "high").length,
    providerContacted: 0,
    queued: commands.filter((item) => item.status === "queued").length,
    runnable: commands.filter((item) => item.runnable).length,
    skipped: commands.filter((item) => item.status === "skipped").length
  };

  return {
    plan: {
      auditEvents: [
        "Launch-night command queue reads PortfolioCommandAction records from the launch-night source module.",
        "Resolve actions only update internal command status; external execution, provider contact, browser work, and money movement remain locked."
      ],
      blockedExternalActions: [
        "Launching stores from launch-night command queue",
        "Moving money from launch-night command queue",
        "Releasing budgets from launch-night command queue",
        "Publishing listings from launch-night command queue",
        "Changing ads from launch-night command queue",
        "Contacting providers from launch-night command queue",
        "Running browsers from launch-night command queue",
        "Uploading content from launch-night command queue"
      ],
      commands,
      externalExecution: false as const,
      generatedAt: new Date().toISOString(),
      mode: "Revenue Business Fleet Launch Night Command Queue" as const,
      options: {
        maxCommands: input.maxCommands,
        statuses: input.statuses
      },
      providerContacted: false as const,
      summary: `${totals.commands} launch-night command${totals.commands === 1 ? "" : "s"} visible; ${totals.runnable} runnable, ${totals.blocked} blocked, and ${totals.applied + totals.skipped} already resolved.`,
      totals
    }
  };
}

function revenueBusinessFleetLaunchNightCommandSelectable(input: {
  item: ReturnType<typeof revenueBusinessFleetLaunchNightCommandQueueItem>;
  resolution: RevenueBusinessFleetLaunchNightCommandQueueResolution;
}) {
  if (input.item.status === "applied" || input.item.status === "skipped") return false;
  if (input.resolution === "applied") return input.item.runnable;

  return input.item.status === "queued" || input.item.status === "blocked";
}

async function buildExplicitRevenueBusinessFleetLaunchNightCommandQueueItems(userId: string, commandRecordIds: string[]) {
  if (commandRecordIds.length === 0) return [];

  const records = await prisma.portfolioCommandAction.findMany({
    orderBy: [
      { priority: "asc" },
      { createdAt: "desc" }
    ],
    where: {
      id: {
        in: commandRecordIds
      },
      sourceModule: revenueBusinessFleetLaunchNightSourceModule,
      userId
    }
  });

  return records
    .map(portfolioCommandRecordSnapshot)
    .map(revenueBusinessFleetLaunchNightCommandQueueItem);
}

async function applyRevenueBusinessFleetLaunchNightCommandQueue(
  userId: string,
  input: ApplyRevenueBusinessFleetLaunchNightCommandQueueInput
) {
  const current = await buildRevenueBusinessFleetLaunchNightCommandQueueForUser(userId, {
    maxCommands: input.maxCommands,
    statuses: input.statuses
  });
  const explicitItems = await buildExplicitRevenueBusinessFleetLaunchNightCommandQueueItems(userId, input.commandRecordIds);
  const baseItems = explicitItems.length > 0 ? explicitItems : current.plan.commands;
  const selectedCommands = baseItems
    .filter((item) => revenueBusinessFleetLaunchNightCommandSelectable({
      item,
      resolution: input.resolution
    }))
    .slice(0, input.maxCommands);
  const statusUpdates = selectedCommands.map((item) => ({
    commandRecordId: item.commandRecordId,
    fromStatus: item.status,
    reason: item.reason,
    targetName: item.targetName,
    toStatus: input.resolution
  }));
  const summary = input.dryRun
    ? `${selectedCommands.length} launch-night command${selectedCommands.length === 1 ? "" : "s"} would be marked ${input.resolution} internally.`
    : `${selectedCommands.length} launch-night command${selectedCommands.length === 1 ? "" : "s"} marked ${input.resolution} internally.`;

  if (input.dryRun) {
    return {
      applied: {
        auditLogId: null,
        commandRecordIds: selectedCommands.map((item) => item.commandRecordId),
        commandRecordsResolved: selectedCommands.length,
        dryRun: true,
        externalExecution: false as const,
        providerContacted: false as const,
        resolution: input.resolution,
        statusUpdates,
        summary
      },
      plan: current.plan
    };
  }

  const auditLog = await recordAuditLog({
    action: "revenue.business_fleet.launch_night.command_queue_resolved",
    actorUserId: userId,
    metadata: {
      commandRecordIds: selectedCommands.map((item) => item.commandRecordId),
      externalExecution: false,
      note: input.note ?? null,
      providerContacted: false,
      resolution: input.resolution,
      statusUpdates,
      summary
    },
    outcome: "success",
    severity: selectedCommands.some((item) => item.riskLevel === "high") || input.resolution === "blocked" ? "medium" : "low",
    targetId: selectedCommands[0]?.commandRecordId ?? null,
    targetType: "revenue_business_fleet_launch_night_command_queue"
  });

  if (selectedCommands.length > 0) {
    await prisma.portfolioCommandAction.updateMany({
      data: {
        status: input.resolution
      },
      where: {
        externalExecution: false,
        id: {
          in: selectedCommands.map((item) => item.commandRecordId)
        },
        providerContacted: false,
        sourceModule: revenueBusinessFleetLaunchNightSourceModule,
        status: {
          in: ["queued", "blocked"]
        },
        userId
      }
    });
  }

  const refreshed = await buildRevenueBusinessFleetLaunchNightCommandQueueForUser(userId, {
    maxCommands: input.maxCommands,
    statuses: input.statuses
  });

  return {
    applied: {
      auditLogId: auditLog.id,
      commandRecordIds: selectedCommands.map((item) => item.commandRecordId),
      commandRecordsResolved: selectedCommands.length,
      dryRun: false,
      externalExecution: false as const,
      providerContacted: false as const,
      resolution: input.resolution,
      statusUpdates,
      summary
    },
    plan: refreshed.plan
  };
}

type RevenueBusinessFleetLaunchNightExecutionChecklistItemStatus =
  | "already_resolved"
  | "blocked"
  | "ready_to_resolve"
  | "waiting_on_command_record"
  | "waiting_on_dependency"
  | "watch";

type RevenueBusinessFleetLaunchNightCommandQueueItem = ReturnType<typeof revenueBusinessFleetLaunchNightCommandQueueItem>;

function launchNightExecutionChecklistStatus(input: {
  command: RevenueBusinessFleetLaunchNightCommandQueueItem | null;
  lane: RevenueBusinessFleetLaunchNightLane;
}): RevenueBusinessFleetLaunchNightExecutionChecklistItemStatus {
  if (input.lane.status === "blocked" || input.command?.status === "blocked" || input.command?.riskLevel === "high") return "blocked";
  if (input.command?.runnable) return "ready_to_resolve";
  if (input.command?.status === "applied" || input.command?.status === "skipped") return "already_resolved";
  if (input.lane.status === "watch_only") return "watch";
  if (businessFleetLaunchNightLaneSelectable(input.lane)) return "waiting_on_command_record";

  return "waiting_on_dependency";
}

function launchNightExecutionChecklistEndpoint(input: {
  command: RevenueBusinessFleetLaunchNightCommandQueueItem | null;
  lane: RevenueBusinessFleetLaunchNightLane;
  status: RevenueBusinessFleetLaunchNightExecutionChecklistItemStatus;
}) {
  if (input.status === "ready_to_resolve") return "/merch/revenue-engine/business-fleet-scheduler/launch-night/commands/apply";
  if (input.status === "waiting_on_command_record") return "/merch/revenue-engine/business-fleet-scheduler/launch-night/apply";
  if (input.command?.recommendedEndpoint) return input.command.recommendedEndpoint;

  return input.lane.nextInternalAction.endpoint;
}

function launchNightExecutionChecklistReason(input: {
  command: RevenueBusinessFleetLaunchNightCommandQueueItem | null;
  lane: RevenueBusinessFleetLaunchNightLane;
  status: RevenueBusinessFleetLaunchNightExecutionChecklistItemStatus;
}) {
  if (input.status === "ready_to_resolve") return "Launch-night command is queued and runnable; resolve the internal record before the lane advances.";
  if (input.status === "waiting_on_command_record") return "Lane is ranked for tonight but has no launch-night command record yet; record launch-night commands first.";
  if (input.status === "already_resolved") return "Launch-night command is already resolved internally; continue with the lane's next internal action.";
  if (input.status === "blocked") return input.command?.reason ?? input.lane.reason;
  if (input.status === "watch") return "Lane is visible for context only and should not enter tonight's execution set.";

  return input.lane.reason;
}

async function buildRevenueBusinessFleetLaunchNightExecutionChecklistForUser(
  userId: string,
  input: RevenueBusinessFleetLaunchNightExecutionChecklistQueryInput
) {
  const launchNightInput = revenueBusinessFleetLaunchNightQuerySchema.parse(input);
  const commandQueueInput = revenueBusinessFleetLaunchNightCommandQueueQuerySchema.parse({
    maxCommands: input.maxCommands,
    statuses: ["queued", "blocked", "applied", "skipped"]
  });
  const [launchNight, commandQueue] = await Promise.all([
    buildRevenueBusinessFleetLaunchNightForUser(userId, launchNightInput),
    buildRevenueBusinessFleetLaunchNightCommandQueueForUser(userId, commandQueueInput)
  ]);
  const commandByTargetId = new Map(commandQueue.plan.commands.map((command) => [command.commandRecord.targetId, command]));
  const checklist = launchNight.plan.lanes
    .slice(0, input.maxChecklistItems)
    .map((lane) => {
      const command = commandByTargetId.get(lane.businessId) ?? commandQueue.plan.commands.find((item) => item.targetName === lane.businessName) ?? null;
      const status = launchNightExecutionChecklistStatus({ command, lane });
      const endpoint = launchNightExecutionChecklistEndpoint({ command, lane, status });
      const reason = launchNightExecutionChecklistReason({ command, lane, status });

      return {
        action: command?.action ?? businessFleetLaunchNightCommandAction(lane),
        blockers: uniqueStrings([
          ...lane.blockers,
          command?.riskLevel === "high" ? "Launch-night command is high risk." : "",
          command?.status === "blocked" ? "Launch-night command record is blocked." : ""
        ]),
        businessId: lane.businessId,
        businessName: lane.businessName,
        commandHash: command?.commandHash ?? null,
        commandRecordId: command?.commandRecordId ?? null,
        endpoint,
        expectedInternalEffect: command?.commandRecord.control
          ? stringFromRecord(recordFromUnknown(command.commandRecord.control), "expectedInternalEffect") ?? `Advance ${lane.businessName} through ${lane.nextInternalAction.label} internally.`
          : `Record launch-night command context for ${lane.businessName}; external execution remains locked.`,
        externalExecution: false as const,
        laneStatus: lane.status,
        launchabilityScore: lane.launchabilityScore,
        nextInternalState: status === "ready_to_resolve"
          ? command?.nextInternalState ?? "launch_night_command_review"
          : lane.nextInternalAction.state,
        priority: status === "ready_to_resolve" ? 1 : status === "waiting_on_command_record" ? 2 : status === "already_resolved" ? 4 : status === "blocked" ? 8 : 6,
        providerContacted: false as const,
        reason,
        recommendedResolution: command?.recommendedResolution ?? null,
        riskLevel: command?.riskLevel ?? businessFleetLaunchNightCommandRisk(lane),
        status,
        tonightSlot: lane.tonightSlot
      };
    })
    .sort((left, right) => left.priority - right.priority || left.tonightSlot - right.tonightSlot);
  const statusCount = (status: RevenueBusinessFleetLaunchNightExecutionChecklistItemStatus) => checklist.filter((item) => item.status === status).length;

  return {
    plan: {
      auditEvents: [
        "Execution checklist composes ranked launch-night lanes with persisted launch-night command records.",
        "Checklist is read-only; it does not launch stores, move money, contact providers, run browsers, publish listings, or upload content."
      ],
      blockedExternalActions: uniqueStrings([
        ...launchNight.plan.blockedExternalActions,
        ...commandQueue.plan.blockedExternalActions,
        "Treating checklist review as external launch execution"
      ]),
      checklist,
      commandQueue: {
        summary: commandQueue.plan.summary,
        totals: commandQueue.plan.totals
      },
      externalExecution: false as const,
      generatedAt: new Date().toISOString(),
      launchNight: {
        summary: launchNight.plan.summary,
        totals: launchNight.plan.totals
      },
      mode: "Revenue Business Fleet Launch Night Execution Checklist" as const,
      options: {
        launchNightSize: input.launchNightSize,
        maxChecklistItems: input.maxChecklistItems,
        maxCommands: input.maxCommands,
        sourceKeys: input.sourceKeys
      },
      providerContacted: false as const,
      summary: `${checklist.length} launch-night checklist item${checklist.length === 1 ? "" : "s"} prepared: ${statusCount("ready_to_resolve")} ready to resolve, ${statusCount("waiting_on_command_record")} waiting on command records, ${statusCount("already_resolved")} resolved, ${statusCount("blocked")} blocked.`,
      totals: {
        alreadyResolved: statusCount("already_resolved"),
        blocked: statusCount("blocked"),
        checklistItems: checklist.length,
        externalExecutionLocked: checklist.filter((item) => item.externalExecution === false).length,
        providerContacted: 0,
        readyToResolve: statusCount("ready_to_resolve"),
        waitingOnCommandRecord: statusCount("waiting_on_command_record"),
        waitingOnDependency: statusCount("waiting_on_dependency"),
        watch: statusCount("watch")
      }
    }
  };
}

type RevenueBusinessFleetLaunchNightOperatorConsoleStatus =
  | "blocked"
  | "monitor_rotation"
  | "record_launch_command"
  | "record_manual_evidence"
  | "record_outcome_signal"
  | "resolve_launch_command"
  | "waiting"
  | "watch";

type RevenueBusinessFleetLaunchNightExecutionChecklistItem = Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchNightExecutionChecklistForUser>>["plan"]["checklist"][number];
type RevenueBusinessFleetManualLaunchEvidencePacket = Awaited<ReturnType<typeof buildRevenueBusinessFleetManualLaunchEvidenceForUser>>["plan"]["packets"][number];
type RevenueBusinessFleetLaunchOutcomeSignalPacket = Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchOutcomeSignalsForUser>>["plan"]["packets"][number];

function launchNightOperatorConsoleStatus(input: {
  checklist: RevenueBusinessFleetLaunchNightExecutionChecklistItem;
  evidence: RevenueBusinessFleetManualLaunchEvidencePacket | null;
  signal: RevenueBusinessFleetLaunchOutcomeSignalPacket | null;
}): RevenueBusinessFleetLaunchNightOperatorConsoleStatus {
  if (input.checklist.status === "blocked" || input.evidence?.status === "blocked" || input.signal?.status === "blocked") return "blocked";
  if (input.checklist.status === "ready_to_resolve") return "resolve_launch_command";
  if (input.checklist.status === "waiting_on_command_record") return "record_launch_command";
  if (input.checklist.status === "watch") return "watch";

  const evidenceRecorded = Boolean(input.signal?.evidenceAuditLogId || input.evidence?.auditLogId);

  if (input.evidence?.status === "ready_for_evidence" && !evidenceRecorded) return "record_manual_evidence";
  if (input.signal?.status === "ready_for_signal") return "record_outcome_signal";
  if (input.signal?.status === "signal_recorded") return "monitor_rotation";
  if (input.signal?.status === "waiting_for_manual_evidence") return "record_manual_evidence";

  return "waiting";
}

function launchNightOperatorConsoleEndpoint(status: RevenueBusinessFleetLaunchNightOperatorConsoleStatus) {
  if (status === "resolve_launch_command") return "/merch/revenue-engine/business-fleet-scheduler/launch-night/commands/apply";
  if (status === "record_launch_command") return "/merch/revenue-engine/business-fleet-scheduler/launch-night/apply";
  if (status === "record_manual_evidence") return "/merch/revenue-engine/business-fleet-scheduler/launch-gap/manual-launch-evidence/apply";
  if (status === "record_outcome_signal") return "/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-outcome-signals/apply";
  if (status === "monitor_rotation") return "/merch/revenue-engine/portfolio";

  return "/merch/revenue-engine/business-fleet-scheduler/launch-night/operator-console";
}

function launchNightOperatorConsoleNextState(status: RevenueBusinessFleetLaunchNightOperatorConsoleStatus) {
  if (status === "resolve_launch_command") return "resolve_launch_night_command";
  if (status === "record_launch_command") return "record_launch_night_command";
  if (status === "record_manual_evidence") return "record_operator_completed_manual_launch_evidence";
  if (status === "record_outcome_signal") return "record_launch_outcome_signal";
  if (status === "monitor_rotation") return "monitor_score_and_rotate";
  if (status === "watch") return "watch_rotation_pressure";
  if (status === "blocked") return "repair_launch_console_blocker";

  return "waiting_for_launch_dependency";
}

function launchNightOperatorConsolePriority(status: RevenueBusinessFleetLaunchNightOperatorConsoleStatus) {
  if (status === "resolve_launch_command") return 1;
  if (status === "record_launch_command") return 2;
  if (status === "record_manual_evidence") return 3;
  if (status === "record_outcome_signal") return 4;
  if (status === "monitor_rotation") return 5;
  if (status === "waiting") return 6;
  if (status === "watch") return 7;

  return 8;
}

function launchNightOperatorConsoleReason(input: {
  checklist: RevenueBusinessFleetLaunchNightExecutionChecklistItem;
  evidence: RevenueBusinessFleetManualLaunchEvidencePacket | null;
  signal: RevenueBusinessFleetLaunchOutcomeSignalPacket | null;
  status: RevenueBusinessFleetLaunchNightOperatorConsoleStatus;
}) {
  if (input.status === "resolve_launch_command") return "Launch command is queued and runnable; resolve the internal command record before the operator lane advances.";
  if (input.status === "record_launch_command") return "Lane is ranked for tonight but still needs an internal launch-night command record.";
  if (input.status === "record_manual_evidence") return "Operator must complete the manual launch step, then record evidence so outcome signals can be captured.";
  if (input.status === "record_outcome_signal") return "Manual launch evidence exists; record revenue, profit, and conversion outcome signals into the performance ledger.";
  if (input.status === "monitor_rotation") return "Outcome signal is already recorded; monitor scored portfolio rotation for scale, watch, pause, or kill.";
  if (input.status === "watch") return "Lane is visible for context only and should not enter tonight's execution set.";
  if (input.status === "blocked") {
    return uniqueStrings([
      ...input.checklist.blockers,
      ...(input.evidence?.blockers ?? []),
      ...(input.signal?.blockers ?? [])
    ])[0] ?? input.checklist.reason;
  }

  return input.signal?.reason ?? input.evidence?.reason ?? input.checklist.reason;
}

async function buildRevenueBusinessFleetLaunchNightOperatorConsoleForUser(
  userId: string,
  input: RevenueBusinessFleetLaunchNightOperatorConsoleQueryInput
) {
  const checklistInput = revenueBusinessFleetLaunchNightExecutionChecklistQuerySchema.parse(input);
  const evidenceInput = revenueBusinessFleetManualLaunchEvidenceQuerySchema.parse({
    maxAssignments: input.maxAssignments,
    maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
    maxLeases: input.maxLeases,
    maxLeasesPerShard: input.maxLeasesPerShard,
    maxStores: input.maxStores,
    maxWorkers: input.maxWorkers,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    sourceKeys: input.sourceKeys
  });
  const signalInput = revenueBusinessFleetLaunchOutcomeSignalsQuerySchema.parse({
    launchWaveSize: input.launchWaveSize,
    maxAssignments: input.maxAssignments,
    maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
    maxLeases: input.maxLeases,
    maxLeasesPerShard: input.maxLeasesPerShard,
    maxParallelLaunches: input.maxParallelLaunches,
    maxParallelScaleActions: input.maxParallelScaleActions,
    maxSignals: input.maxSignals,
    maxStores: input.maxStores,
    maxWorkers: input.maxWorkers,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    sourceKeys: input.sourceKeys,
    targetBusinesses: input.targetBusinesses
  });
  const [checklist, manualEvidence, outcomeSignals] = await Promise.all([
    buildRevenueBusinessFleetLaunchNightExecutionChecklistForUser(userId, checklistInput),
    buildRevenueBusinessFleetManualLaunchEvidenceForUser(userId, evidenceInput),
    buildRevenueBusinessFleetLaunchOutcomeSignalsForUser(userId, signalInput)
  ]);
  const evidenceByStoreId = new Map(manualEvidence.plan.packets.map((packet) => [packet.storeId, packet]));
  const signalByStoreId = new Map(outcomeSignals.plan.packets.map((packet) => [packet.storeId, packet]));
  const consoleItems = checklist.plan.checklist
    .slice(0, input.maxConsoleItems)
    .map((checklistItem) => {
      const evidence = evidenceByStoreId.get(checklistItem.businessId) ?? null;
      const signal = signalByStoreId.get(checklistItem.businessId) ?? null;
      const status = launchNightOperatorConsoleStatus({ checklist: checklistItem, evidence, signal });
      const blockers = uniqueStrings([
        ...checklistItem.blockers,
        ...(evidence?.blockers ?? []),
        ...(signal?.blockers ?? [])
      ]);

      return {
        action: checklistItem.action,
        assignmentId: evidence?.assignmentId ?? null,
        blockers,
        businessId: checklistItem.businessId,
        businessName: checklistItem.businessName,
        checklistStatus: checklistItem.status,
        commandRecordId: checklistItem.commandRecordId,
        endpoint: launchNightOperatorConsoleEndpoint(status),
        evidenceAuditLogId: signal?.evidenceAuditLogId ?? evidence?.auditLogId ?? null,
        evidencePacketId: evidence?.packetId ?? null,
        evidenceStatus: evidence?.status ?? null,
        expectedInternalEffect: checklistItem.expectedInternalEffect,
        externalExecution: false as const,
        launchabilityScore: checklistItem.launchabilityScore,
        nextInternalState: launchNightOperatorConsoleNextState(status),
        operatorStepRequired: status === "record_manual_evidence",
        outcomeSignalId: signal?.signalId ?? null,
        priority: launchNightOperatorConsolePriority(status),
        providerContacted: false as const,
        reason: launchNightOperatorConsoleReason({ checklist: checklistItem, evidence, signal, status }),
        recommendedOutcomeAction: signal?.recommendedAction ?? null,
        signalStatus: signal?.status ?? null,
        status,
        tonightSlot: checklistItem.tonightSlot
      };
    })
    .sort((left, right) => left.priority - right.priority || left.tonightSlot - right.tonightSlot);
  const statusCount = (status: RevenueBusinessFleetLaunchNightOperatorConsoleStatus) => consoleItems.filter((item) => item.status === status).length;

  return {
    plan: {
      auditEvents: [
        "Operator console composes launch-night checklist, manual launch evidence readiness, and launch outcome signal readiness.",
        "Console is read-only; it does not perform manual launch steps, contact providers, run browsers, publish listings, upload content, move money, or call external systems.",
        "The launch-night flow remains command-record gated before evidence and outcome signals can advance scoring."
      ],
      blockedExternalActions: uniqueStrings([
        ...checklist.plan.blockedExternalActions,
        ...manualEvidence.plan.blockedExternalActions,
        ...outcomeSignals.plan.blockedExternalActions,
        "Treating the operator console as automated external launch execution"
      ]),
      checklist: {
        summary: checklist.plan.summary,
        totals: checklist.plan.totals
      },
      consoleItems,
      evidence: {
        summary: manualEvidence.plan.summary,
        totals: manualEvidence.plan.totals
      },
      externalExecution: false as const,
      generatedAt: new Date().toISOString(),
      mode: "Revenue Business Fleet Launch Night Operator Console" as const,
      options: {
        launchNightSize: input.launchNightSize,
        launchWaveSize: input.launchWaveSize,
        maxConsoleItems: input.maxConsoleItems,
        maxSignals: input.maxSignals,
        sourceKeys: input.sourceKeys
      },
      outcomeSignals: {
        summary: outcomeSignals.plan.summary,
        totals: outcomeSignals.plan.totals
      },
      providerContacted: false as const,
      summary: `${consoleItems.length} launch-night operator item${consoleItems.length === 1 ? "" : "s"} staged: ${statusCount("record_manual_evidence")} need evidence, ${statusCount("record_outcome_signal")} need outcome signals, ${statusCount("monitor_rotation")} ready for rotation monitoring, ${statusCount("blocked")} blocked.`,
      totals: {
        blocked: statusCount("blocked"),
        consoleItems: consoleItems.length,
        externalExecutionLocked: consoleItems.filter((item) => item.externalExecution === false).length,
        monitorRotation: statusCount("monitor_rotation"),
        operatorStepRequired: consoleItems.filter((item) => item.operatorStepRequired).length,
        providerContacted: 0,
        readyForManualEvidence: statusCount("record_manual_evidence"),
        readyForOutcomeSignal: statusCount("record_outcome_signal"),
        recordLaunchCommand: statusCount("record_launch_command"),
        resolveLaunchCommand: statusCount("resolve_launch_command"),
        waiting: statusCount("waiting"),
        watch: statusCount("watch")
      }
    }
  };
}

type RevenueBusinessFleetLaunchNightSupervisorStatus =
  | "advance_cash_cycle"
  | "blocked"
  | "monitor_rotation"
  | "record_launch_commands"
  | "record_manual_evidence"
  | "record_outcome_signals"
  | "resolve_launch_commands"
  | "waiting";

type RevenueBusinessFleetLaunchNightSupervisorConsolePlan = Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchNightOperatorConsoleForUser>>["plan"];
type RevenueBusinessFleetLaunchNightSupervisorCashCyclePlan = Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchCashCycleForUser>>["plan"];
type RevenueBusinessFleetLaunchNightSupervisorLaunchNightPlan = Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchNightForUser>>["plan"];

function launchNightSupervisorStatus(input: {
  cashCycle: RevenueBusinessFleetLaunchNightSupervisorCashCyclePlan;
  console: RevenueBusinessFleetLaunchNightSupervisorConsolePlan;
}): RevenueBusinessFleetLaunchNightSupervisorStatus {
  const totals = input.console.totals;

  if (totals.blocked > 0) return "blocked";
  if (totals.resolveLaunchCommand > 0) return "resolve_launch_commands";
  if (totals.recordLaunchCommand > 0) return "record_launch_commands";
  if (totals.readyForManualEvidence > 0) return "record_manual_evidence";
  if (totals.readyForOutcomeSignal > 0) return "record_outcome_signals";
  if (input.cashCycle.nextStep?.status === "ready" || input.cashCycle.nextStep?.status === "approval_required") return "advance_cash_cycle";
  if (totals.monitorRotation > 0) return "monitor_rotation";

  return "waiting";
}

function launchNightSupervisorNextAction(input: {
  cashCycle: RevenueBusinessFleetLaunchNightSupervisorCashCyclePlan;
  console: RevenueBusinessFleetLaunchNightSupervisorConsolePlan;
  status: RevenueBusinessFleetLaunchNightSupervisorStatus;
}) {
  const totals = input.console.totals;

  if (input.status === "blocked") {
    return {
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-night/operator-console",
      label: "Repair blocked launch rows",
      reason: input.console.consoleItems.find((item) => item.status === "blocked")?.reason ?? "One or more launch-night rows are blocked.",
      state: "repair_launch_console_blocker"
    };
  }

  if (input.status === "resolve_launch_commands") {
    return {
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-night/commands/apply",
      label: "Resolve launch-night commands",
      reason: `${totals.resolveLaunchCommand} launch-night command${totals.resolveLaunchCommand === 1 ? "" : "s"} can be resolved internally.`,
      state: "resolve_launch_night_command_queue"
    };
  }

  if (input.status === "record_launch_commands") {
    return {
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-night/apply",
      label: "Record launch-night commands",
      reason: `${totals.recordLaunchCommand} launch-night lane${totals.recordLaunchCommand === 1 ? "" : "s"} need internal command records.`,
      state: "record_launch_night_commands"
    };
  }

  if (input.status === "record_manual_evidence") {
    return {
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/manual-launch-evidence/apply",
      label: "Record manual launch evidence",
      reason: `${totals.readyForManualEvidence} launch lane${totals.readyForManualEvidence === 1 ? "" : "s"} need operator-completed manual evidence before outcome scoring.`,
      state: "record_operator_completed_manual_launch_evidence"
    };
  }

  if (input.status === "record_outcome_signals") {
    return {
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-outcome-signals/apply",
      label: "Record outcome signals",
      reason: `${totals.readyForOutcomeSignal} launch lane${totals.readyForOutcomeSignal === 1 ? "" : "s"} have evidence and need revenue/profit signal capture.`,
      state: "record_launch_outcome_signals"
    };
  }

  if (input.status === "advance_cash_cycle" && input.cashCycle.nextStep) {
    return {
      endpoint: input.cashCycle.nextStep.endpoint,
      label: input.cashCycle.nextStep.label,
      reason: input.cashCycle.nextStep.reason,
      state: input.cashCycle.nextStep.nextInternalState
    };
  }

  if (input.status === "monitor_rotation") {
    return {
      endpoint: "/merch/revenue-engine/portfolio",
      label: "Monitor scored rotation",
      reason: `${totals.monitorRotation} launched lane${totals.monitorRotation === 1 ? "" : "s"} have recorded signals and should be watched for scale, pause, or kill pressure.`,
      state: "monitor_score_and_rotate"
    };
  }

  return {
    endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-night/supervisor",
    label: "Wait for launch dependencies",
    reason: "No launch-night row is currently actionable; load upstream fleet, launch gate, evidence, and command stages.",
    state: "waiting_for_launch_dependency"
  };
}

function launchNightSupervisorStageStatus(ready: number, blocked: number, waiting = 0) {
  if (blocked > 0) return "blocked";
  if (ready > 0) return "ready";
  if (waiting > 0) return "waiting";

  return "watch";
}

async function buildRevenueBusinessFleetLaunchNightSupervisorForUser(
  userId: string,
  input: RevenueBusinessFleetLaunchNightSupervisorQueryInput
) {
  const [operatorConsole, cashCycle, launchNight] = await Promise.all([
    buildRevenueBusinessFleetLaunchNightOperatorConsoleForUser(userId, revenueBusinessFleetLaunchNightOperatorConsoleQuerySchema.parse(input)),
    buildRevenueBusinessFleetLaunchCashCycleForUser(userId, revenueBusinessFleetLaunchCashCycleQuerySchema.parse(input)),
    buildRevenueBusinessFleetLaunchNightForUser(userId, revenueBusinessFleetLaunchNightQuerySchema.parse(input))
  ]);
  const status = launchNightSupervisorStatus({ cashCycle: cashCycle.plan, console: operatorConsole.plan });
  const nextAction = launchNightSupervisorNextAction({ cashCycle: cashCycle.plan, console: operatorConsole.plan, status });
  const actionableConsoleItems = operatorConsole.plan.totals.recordLaunchCommand
    + operatorConsole.plan.totals.resolveLaunchCommand
    + operatorConsole.plan.totals.readyForManualEvidence
    + operatorConsole.plan.totals.readyForOutcomeSignal;
  const canStartTonight = launchNight.plan.totals.readyNow > 0
    && cashCycle.plan.launchControl.swarm.safeLaunchReady > 0
    && operatorConsole.plan.totals.blocked === 0
    && operatorConsole.plan.consoleItems.length > 0;
  const supervisorItems = operatorConsole.plan.consoleItems.slice(0, input.maxSupervisorItems).map((item) => ({
    assignmentId: item.assignmentId,
    businessId: item.businessId,
    businessName: item.businessName,
    commandRecordId: item.commandRecordId,
    endpoint: item.endpoint,
    nextInternalState: item.nextInternalState,
    outcomeSignalId: item.outcomeSignalId,
    reason: item.reason,
    selectable: item.status === "record_manual_evidence" || item.status === "record_outcome_signal",
    status: item.status,
    tonightSlot: item.tonightSlot
  }));

  return {
    plan: {
      auditEvents: [
        "Launch-night supervisor aggregates launch-night lanes, command queue state, operator console rows, outcome signal readiness, and cash-cycle readiness.",
        "Supervisor is read-only and only recommends the next internal action; it does not contact providers, run browsers, publish listings, upload content, execute ad spend, move money, or call external systems."
      ],
      blockedExternalActions: uniqueStrings([
        ...operatorConsole.plan.blockedExternalActions,
        ...cashCycle.plan.blockedExternalActions,
        "Treating the launch-night supervisor as external execution"
      ]),
      canStartTonight,
      externalExecution: false as const,
      generatedAt: new Date().toISOString(),
      mode: "Revenue Business Fleet Launch Night Supervisor" as const,
      nextAction,
      options: {
        launchNightSize: input.launchNightSize,
        launchWaveSize: input.launchWaveSize,
        maxSupervisorItems: input.maxSupervisorItems,
        sourceKeys: input.sourceKeys,
        targetBusinesses: input.targetBusinesses
      },
      providerContacted: false as const,
      stageCards: [
        {
          blocked: launchNight.plan.totals.blocked,
          endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-night",
          label: "Launch Night",
          ready: launchNight.plan.totals.readyNow,
          reason: launchNight.plan.summary,
          status: launchNightSupervisorStageStatus(launchNight.plan.totals.readyNow, launchNight.plan.totals.blocked),
          total: launchNight.plan.totals.lanes
        },
        {
          blocked: operatorConsole.plan.totals.blocked,
          endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-night/operator-console",
          label: "Operator Console",
          ready: actionableConsoleItems,
          reason: operatorConsole.plan.summary,
          status: launchNightSupervisorStageStatus(actionableConsoleItems, operatorConsole.plan.totals.blocked, operatorConsole.plan.totals.waiting),
          total: operatorConsole.plan.totals.consoleItems
        },
        {
          blocked: 0,
          endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-outcome-signals/apply",
          label: "Outcome Signals",
          ready: operatorConsole.plan.totals.readyForOutcomeSignal,
          reason: operatorConsole.plan.outcomeSignals.summary,
          status: launchNightSupervisorStageStatus(operatorConsole.plan.totals.readyForOutcomeSignal, 0, operatorConsole.plan.outcomeSignals.totals.waitingForManualEvidence),
          total: operatorConsole.plan.outcomeSignals.totals.signalPackets
        },
        {
          blocked: cashCycle.plan.totals.blocked,
          endpoint: cashCycle.plan.nextStep?.endpoint ?? "/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-cash-cycle",
          label: "Cash Cycle",
          ready: cashCycle.plan.totals.ready,
          reason: cashCycle.plan.summary,
          status: launchNightSupervisorStageStatus(cashCycle.plan.totals.ready, cashCycle.plan.totals.blocked, cashCycle.plan.totals.waiting),
          total: cashCycle.plan.totals.steps
        }
      ],
      summary: canStartTonight
        ? `${launchNight.plan.totals.readyNow}/${input.launchNightSize} launch-night lane${launchNight.plan.totals.readyNow === 1 ? "" : "s"} are startable. Next: ${nextAction.label}.`
        : `${launchNight.plan.totals.readyNow}/${input.launchNightSize} launch-night lane${launchNight.plan.totals.readyNow === 1 ? "" : "s"} ready; supervisor status ${status.replace(/_/g, " ")}. Next: ${nextAction.label}.`,
      supervisorItems,
      totals: {
        actionableConsoleItems,
        blockedConsoleItems: operatorConsole.plan.totals.blocked,
        cashCycleApprovalRequired: cashCycle.plan.totals.approvalRequired,
        cashCycleBlocked: cashCycle.plan.totals.blocked,
        cashCycleReady: cashCycle.plan.totals.ready,
        consoleItems: operatorConsole.plan.totals.consoleItems,
        launchNightSize: input.launchNightSize,
        monitorRotation: operatorConsole.plan.totals.monitorRotation,
        readyForManualEvidence: operatorConsole.plan.totals.readyForManualEvidence,
        readyForOutcomeSignal: operatorConsole.plan.totals.readyForOutcomeSignal,
        readyNow: launchNight.plan.totals.readyNow,
        safeLaunchReady: cashCycle.plan.launchControl.swarm.safeLaunchReady,
        targetBusinesses: input.targetBusinesses
      }
    }
  };
}

type RevenueBusinessFleetLaunchNightSupervisorActionType =
  | "advance_cash_cycle"
  | "monitor_rotation"
  | "record_launch_commands"
  | "record_manual_evidence"
  | "record_outcome_signals"
  | "repair_blocker"
  | "resolve_launch_commands"
  | "wait";

type RevenueBusinessFleetLaunchNightSupervisorActionMethod = "GET" | "POST";

function limitedSupervisorActionIds(values: Array<string | null | undefined>, limit: number) {
  return uniqueStrings(values.filter((value): value is string => Boolean(value))).slice(0, limit);
}

function buildRevenueBusinessFleetLaunchNightSupervisorAction(input: {
  actionType: RevenueBusinessFleetLaunchNightSupervisorActionType;
  approvalPhrase?: string | null;
  blockedExternalActions: string[];
  confirm?: string | null;
  dryRunSupported: boolean;
  endpoint: string;
  label: string;
  method: RevenueBusinessFleetLaunchNightSupervisorActionMethod;
  nextInternalState: string;
  payloadPreview: Record<string, unknown> | null;
  reason: string;
  recordSupported: boolean;
  selectedIds?: {
    assignmentIds?: string[];
    commandRecordIds?: string[];
    laneIds?: string[];
    signalIds?: string[];
  };
}) {
  const selectedIds = {
    assignmentIds: input.selectedIds?.assignmentIds ?? [],
    commandRecordIds: input.selectedIds?.commandRecordIds ?? [],
    laneIds: input.selectedIds?.laneIds ?? [],
    signalIds: input.selectedIds?.signalIds ?? []
  };
  const selectedKey = uniqueStrings([
    ...selectedIds.commandRecordIds,
    ...selectedIds.laneIds,
    ...selectedIds.assignmentIds,
    ...selectedIds.signalIds
  ]).slice(0, 3).join(":") || input.nextInternalState;

  return {
    actionId: `launch_night_supervisor:${input.actionType}:${selectedKey}`,
    actionType: input.actionType,
    approvalPhrase: input.approvalPhrase ?? null,
    blockedExternalActions: input.blockedExternalActions,
    confirm: input.confirm ?? null,
    dryRunSupported: input.dryRunSupported,
    endpoint: input.endpoint,
    externalExecution: false as const,
    label: input.label,
    method: input.method,
    nextInternalState: input.nextInternalState,
    payloadPreview: input.payloadPreview,
    providerContacted: false as const,
    reason: input.reason,
    recordSupported: input.recordSupported,
    selectedIds
  };
}

async function buildRevenueBusinessFleetLaunchNightSupervisorActionsForUser(
  userId: string,
  input: RevenueBusinessFleetLaunchNightSupervisorActionsQueryInput
) {
  const supervisor = await buildRevenueBusinessFleetLaunchNightSupervisorForUser(
    userId,
    revenueBusinessFleetLaunchNightSupervisorQuerySchema.parse(input)
  );
  const itemLimit = Math.min(10, input.maxSupervisorItems);
  const supervisorItems = supervisor.plan.supervisorItems;
  const actionBlockedExternalActions = uniqueStrings([
    ...supervisor.plan.blockedExternalActions,
    "Executing provider, browser, marketplace, ad, payout, payment, upload, or external write actions from supervisor action queue"
  ]);
  const resolveCommandRecordIds = limitedSupervisorActionIds(
    supervisorItems
      .filter((item) => item.status === "resolve_launch_command")
      .map((item) => item.commandRecordId),
    itemLimit
  );
  const launchCommandLaneIds = limitedSupervisorActionIds(
    supervisorItems
      .filter((item) => item.status === "record_launch_command")
      .map((item) => item.businessId),
    itemLimit
  );
  const evidenceAssignmentIds = limitedSupervisorActionIds(
    supervisorItems
      .filter((item) => item.status === "record_manual_evidence")
      .map((item) => item.assignmentId),
    itemLimit
  );
  const outcomeSignalIds = limitedSupervisorActionIds(
    supervisorItems
      .filter((item) => item.status === "record_outcome_signal")
      .map((item) => item.outcomeSignalId),
    itemLimit
  );
  const actions = [
    resolveCommandRecordIds.length > 0
      ? buildRevenueBusinessFleetLaunchNightSupervisorAction({
        actionType: "resolve_launch_commands",
        blockedExternalActions: actionBlockedExternalActions,
        confirm: revenueBusinessFleetLaunchNightCommandQueueConfirmation,
        dryRunSupported: true,
        endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-night/commands/apply",
        label: "Resolve launch-night command queue",
        method: "POST",
        nextInternalState: "resolve_launch_night_command_queue",
        payloadPreview: {
          commandRecordIds: resolveCommandRecordIds,
          confirm: revenueBusinessFleetLaunchNightCommandQueueConfirmation,
          dryRun: true,
          maxCommands: input.maxCommands,
          note: "Prepared from Business Fleet launch-night supervisor actions.",
          resolution: "applied",
          statuses: ["queued", "blocked"]
        },
        reason: `${resolveCommandRecordIds.length} launch-night command record${resolveCommandRecordIds.length === 1 ? "" : "s"} can be resolved internally before lane advancement.`,
        recordSupported: true,
        selectedIds: {
          commandRecordIds: resolveCommandRecordIds
        }
      })
      : null,
    launchCommandLaneIds.length > 0
      ? buildRevenueBusinessFleetLaunchNightSupervisorAction({
        actionType: "record_launch_commands",
        blockedExternalActions: actionBlockedExternalActions,
        confirm: revenueBusinessFleetLaunchNightCommandConfirmation,
        dryRunSupported: true,
        endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-night/apply",
        label: "Record launch-night commands",
        method: "POST",
        nextInternalState: "record_launch_night_commands",
        payloadPreview: {
          confirm: revenueBusinessFleetLaunchNightCommandConfirmation,
          dryRun: true,
          laneIds: launchCommandLaneIds,
          launchNightSize: input.launchNightSize,
          launchWaveSize: input.launchWaveSize,
          maxCommands: input.maxCommands,
          maxLanes: input.maxLanes,
          maxParallelLaunches: input.maxParallelLaunches,
          maxParallelScaleActions: input.maxParallelScaleActions,
          maxStores: input.maxStores,
          maxWorkers: input.maxWorkers,
          note: "Prepared from Business Fleet launch-night supervisor actions.",
          qualityFloor: input.qualityFloor,
          shardCount: input.shardCount,
          sourceKeys: input.sourceKeys,
          targetBusinesses: input.targetBusinesses
        },
        reason: `${launchCommandLaneIds.length} launch-night lane${launchCommandLaneIds.length === 1 ? "" : "s"} need internal command records.`,
        recordSupported: true,
        selectedIds: {
          laneIds: launchCommandLaneIds
        }
      })
      : null,
    evidenceAssignmentIds.length > 0
      ? buildRevenueBusinessFleetLaunchNightSupervisorAction({
        actionType: "record_manual_evidence",
        approvalPhrase: revenueBusinessFleetManualLaunchEvidencePhrase,
        blockedExternalActions: actionBlockedExternalActions,
        confirm: revenueBusinessFleetManualLaunchEvidenceConfirmation,
        dryRunSupported: true,
        endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/manual-launch-evidence/apply",
        label: "Record manual launch evidence",
        method: "POST",
        nextInternalState: "record_operator_completed_manual_launch_evidence",
        payloadPreview: {
          approvalPhrase: revenueBusinessFleetManualLaunchEvidencePhrase,
          assignmentIds: evidenceAssignmentIds,
          confirm: revenueBusinessFleetManualLaunchEvidenceConfirmation,
          dryRun: true,
          evidenceCategory: "operator_notes",
          evidenceNote: "Prepared from Business Fleet launch-night supervisor actions.",
          maxAssignments: input.maxAssignments,
          maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
          maxLeases: input.maxLeases,
          maxLeasesPerShard: input.maxLeasesPerShard,
          maxStores: input.maxStores,
          maxWorkers: input.maxWorkers,
          operatorCompletedManualStep: true,
          qualityFloor: input.qualityFloor,
          shardCount: input.shardCount,
          sourceKeys: input.sourceKeys
        },
        reason: `${evidenceAssignmentIds.length} assignment${evidenceAssignmentIds.length === 1 ? "" : "s"} need operator-completed manual launch evidence before outcome signals.`,
        recordSupported: true,
        selectedIds: {
          assignmentIds: evidenceAssignmentIds
        }
      })
      : null,
    outcomeSignalIds.length > 0
      ? buildRevenueBusinessFleetLaunchNightSupervisorAction({
        actionType: "record_outcome_signals",
        blockedExternalActions: actionBlockedExternalActions,
        confirm: revenueBusinessFleetLaunchOutcomeSignalsConfirmation,
        dryRunSupported: true,
        endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-outcome-signals/apply",
        label: "Record outcome signals",
        method: "POST",
        nextInternalState: "record_launch_outcome_signals",
        payloadPreview: {
          adSpend: 0,
          confirm: revenueBusinessFleetLaunchOutcomeSignalsConfirmation,
          digitalDeliveryCost: 0,
          discounts: 0,
          dryRun: true,
          grossRevenue: 0,
          impressions: 0,
          launchWaveSize: input.launchWaveSize,
          maxAssignments: input.maxAssignments,
          maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
          maxLeases: input.maxLeases,
          maxLeasesPerShard: input.maxLeasesPerShard,
          maxParallelLaunches: input.maxParallelLaunches,
          maxParallelScaleActions: input.maxParallelScaleActions,
          maxSignals: input.maxSignals,
          maxStores: input.maxStores,
          maxWorkers: input.maxWorkers,
          netProfit: 0,
          note: "Prepared from Business Fleet launch-night supervisor actions.",
          platformFees: 0,
          productionCost: 0,
          qualityFloor: input.qualityFloor,
          refunds: 0,
          shardCount: input.shardCount,
          shippingCost: 0,
          signalIds: outcomeSignalIds,
          source: "manual",
          sourceKeys: input.sourceKeys,
          targetBusinesses: input.targetBusinesses,
          unitsSold: 0,
          visits: 0
        },
        reason: `${outcomeSignalIds.length} launch outcome signal${outcomeSignalIds.length === 1 ? "" : "s"} can feed scored rotation and financial pressure.`,
        recordSupported: true,
        selectedIds: {
          signalIds: outcomeSignalIds
        }
      })
      : null,
    supervisor.plan.totals.cashCycleReady + supervisor.plan.totals.cashCycleApprovalRequired > 0
      ? buildRevenueBusinessFleetLaunchNightSupervisorAction({
        actionType: "advance_cash_cycle",
        blockedExternalActions: actionBlockedExternalActions,
        confirm: revenueBusinessFleetLaunchCashCycleConfirmation,
        dryRunSupported: true,
        endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-cash-cycle/apply",
        label: "Record cash-cycle command",
        method: "POST",
        nextInternalState: supervisor.plan.nextAction.state,
        payloadPreview: {
          confirm: revenueBusinessFleetLaunchCashCycleConfirmation,
          dryRun: true,
          launchWaveSize: input.launchWaveSize,
          maxAssignments: input.maxAssignments,
          maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
          maxLeases: input.maxLeases,
          maxLeasesPerShard: input.maxLeasesPerShard,
          maxParallelLaunches: input.maxParallelLaunches,
          maxParallelScaleActions: input.maxParallelScaleActions,
          maxSignals: input.maxSignals,
          maxStores: input.maxStores,
          maxWorkers: input.maxWorkers,
          note: "Prepared from Business Fleet launch-night supervisor actions.",
          qualityFloor: input.qualityFloor,
          shardCount: input.shardCount,
          sourceKeys: input.sourceKeys,
          targetBusinesses: input.targetBusinesses
        },
        reason: `Cash cycle has ${supervisor.plan.totals.cashCycleReady} ready step${supervisor.plan.totals.cashCycleReady === 1 ? "" : "s"} and ${supervisor.plan.totals.cashCycleApprovalRequired} approval review${supervisor.plan.totals.cashCycleApprovalRequired === 1 ? "" : "s"} available for internal command recording.`,
        recordSupported: true
      })
      : null,
    supervisor.plan.totals.monitorRotation > 0
      ? buildRevenueBusinessFleetLaunchNightSupervisorAction({
        actionType: "monitor_rotation",
        blockedExternalActions: actionBlockedExternalActions,
        dryRunSupported: false,
        endpoint: "/merch/revenue-engine/portfolio",
        label: "Monitor scored rotation",
        method: "GET",
        nextInternalState: "monitor_score_and_rotate",
        payloadPreview: null,
        reason: `${supervisor.plan.totals.monitorRotation} launched lane${supervisor.plan.totals.monitorRotation === 1 ? "" : "s"} have signals and should be checked for scale, watch, pause, or kill pressure.`,
        recordSupported: false
      })
      : null,
    supervisor.plan.totals.blockedConsoleItems > 0
      ? buildRevenueBusinessFleetLaunchNightSupervisorAction({
        actionType: "repair_blocker",
        blockedExternalActions: actionBlockedExternalActions,
        dryRunSupported: false,
        endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-night/operator-console",
        label: "Repair blocked launch rows",
        method: "GET",
        nextInternalState: "repair_launch_console_blocker",
        payloadPreview: null,
        reason: `${supervisor.plan.totals.blockedConsoleItems} launch-night console row${supervisor.plan.totals.blockedConsoleItems === 1 ? "" : "s"} are blocked and should be repaired before scaling lane count.`,
        recordSupported: false
      })
      : null
  ].filter((action): action is NonNullable<typeof action> => Boolean(action));
  const recommendedActions = actions.length > 0
    ? actions.slice(0, input.maxActions)
    : [buildRevenueBusinessFleetLaunchNightSupervisorAction({
      actionType: "wait",
      blockedExternalActions: actionBlockedExternalActions,
      dryRunSupported: false,
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-night/supervisor",
      label: "Wait for launch dependencies",
      method: "GET",
      nextInternalState: "waiting_for_launch_dependency",
      payloadPreview: null,
      reason: "No launch-night row is currently actionable; load upstream fleet, launch gate, evidence, command queue, and outcome signal stages.",
      recordSupported: false
    })];
  const totalSelectedIds = recommendedActions.reduce((sum, action) => sum
    + action.selectedIds.assignmentIds.length
    + action.selectedIds.commandRecordIds.length
    + action.selectedIds.laneIds.length
    + action.selectedIds.signalIds.length, 0);

  return {
    plan: {
      actions: recommendedActions,
      auditEvents: [
        "Supervisor action queue converts launch-night supervisor state into bounded internal action payload previews.",
        "Queue is read-only and does not execute external actions, move money, contact providers, run browsers, publish listings, upload content, or change ad spend.",
        "Payload previews target existing internal apply endpoints so later one-click controls can preserve the current command chain."
      ],
      blockedExternalActions: actionBlockedExternalActions,
      externalExecution: false as const,
      generatedAt: new Date().toISOString(),
      mode: "Revenue Business Fleet Launch Night Supervisor Action Queue" as const,
      options: {
        launchNightSize: input.launchNightSize,
        launchWaveSize: input.launchWaveSize,
        maxActions: input.maxActions,
        maxSupervisorItems: input.maxSupervisorItems,
        sourceKeys: input.sourceKeys,
        targetBusinesses: input.targetBusinesses
      },
      providerContacted: false as const,
      summary: `${recommendedActions.length} supervisor action${recommendedActions.length === 1 ? "" : "s"} prepared for ${supervisor.plan.canStartTonight ? "startable" : "not-startable"} launch-night state. Next: ${recommendedActions[0]?.label ?? supervisor.plan.nextAction.label}.`,
      supervisor: {
        canStartTonight: supervisor.plan.canStartTonight,
        nextAction: supervisor.plan.nextAction,
        summary: supervisor.plan.summary,
        totals: supervisor.plan.totals
      },
      totals: {
        actions: recommendedActions.length,
        dryRunSupported: recommendedActions.filter((action) => action.dryRunSupported).length,
        externalExecutionLocked: recommendedActions.filter((action) => action.externalExecution === false).length,
        getActions: recommendedActions.filter((action) => action.method === "GET").length,
        postActions: recommendedActions.filter((action) => action.method === "POST").length,
        providerContacted: 0,
        recordSupported: recommendedActions.filter((action) => action.recordSupported).length,
        selectedIdentifiers: totalSelectedIds
      }
    }
  };
}

type RevenueBusinessFleetLaunchNightSupervisorAction = ReturnType<typeof buildRevenueBusinessFleetLaunchNightSupervisorAction>;

type RevenueBusinessFleetLaunchNightSupervisorMetricInput = {
  adSpend?: number;
  grossRevenue?: number;
  netProfit?: number;
  unitsSold?: number;
  visits?: number;
};

function revenueBusinessFleetLaunchNightSupervisorOutcomeMetricsProvided(input: RevenueBusinessFleetLaunchNightSupervisorMetricInput) {
  return input.adSpend !== undefined
    || input.grossRevenue !== undefined
    || input.netProfit !== undefined
    || input.unitsSold !== undefined
    || input.visits !== undefined;
}

function revenueBusinessFleetLaunchNightSupervisorApplyPayload(
  action: RevenueBusinessFleetLaunchNightSupervisorAction,
  input: ApplyRevenueBusinessFleetLaunchNightSupervisorActionInput
) {
  if (!action.payloadPreview) return null;

  const payload: Record<string, unknown> = {
    ...action.payloadPreview,
    dryRun: input.dryRun
  };

  if (input.note) {
    if (action.actionType === "record_manual_evidence") {
      payload.evidenceNote = input.note;
    } else {
      payload.note = input.note;
    }
  }

  if (action.actionType === "record_outcome_signals") {
    if (input.adSpend !== undefined) payload.adSpend = input.adSpend;
    if (input.grossRevenue !== undefined) payload.grossRevenue = input.grossRevenue;
    if (input.netProfit !== undefined) payload.netProfit = input.netProfit;
    if (input.unitsSold !== undefined) payload.unitsSold = input.unitsSold;
    if (input.visits !== undefined) {
      payload.impressions = input.visits;
      payload.visits = input.visits;
    }
  }

  return payload;
}

async function applyRevenueBusinessFleetLaunchNightSupervisorAction(
  userId: string,
  input: ApplyRevenueBusinessFleetLaunchNightSupervisorActionInput
) {
  const actionQueue = await buildRevenueBusinessFleetLaunchNightSupervisorActionsForUser(
    userId,
    revenueBusinessFleetLaunchNightSupervisorActionsQuerySchema.parse(input)
  );
  const action = input.actionId
    ? actionQueue.plan.actions.find((item) => item.actionId === input.actionId) ?? null
    : actionQueue.plan.actions.find((item) => item.recordSupported && item.method === "POST") ?? null;
  const selectedIdentifiers = action
    ? action.selectedIds.assignmentIds.length
      + action.selectedIds.commandRecordIds.length
      + action.selectedIds.laneIds.length
      + action.selectedIds.signalIds.length
    : 0;

  if (!action) {
    return {
      action: null,
      applied: {
        actionId: input.actionId ?? null,
        actionType: null,
        auditLogId: null,
        auditLogIds: [] as string[],
        blockedReason: "No matching supervisor action is available.",
        delegatedEndpoint: null,
        delegatedSummary: null,
        dryRun: input.dryRun,
        externalExecution: false as const,
        providerContacted: false as const,
        recordSupported: false,
        requiredConfirmation: revenueBusinessFleetLaunchNightSupervisorActionConfirmation,
        selectedIdentifiers: 0,
        status: "blocked" as const,
        summary: "No matching launch-night supervisor action is available to apply."
      },
      delegated: null,
      plan: actionQueue.plan
    };
  }

  if (!action.recordSupported || action.method !== "POST" || !action.payloadPreview) {
    return {
      action,
      applied: {
        actionId: action.actionId,
        actionType: action.actionType,
        auditLogId: null,
        auditLogIds: [] as string[],
        blockedReason: "Supervisor action is advisory-only and does not support internal recording.",
        delegatedEndpoint: action.endpoint,
        delegatedSummary: null,
        dryRun: input.dryRun,
        externalExecution: false as const,
        providerContacted: false as const,
        recordSupported: false,
        requiredConfirmation: revenueBusinessFleetLaunchNightSupervisorActionConfirmation,
        selectedIdentifiers,
        status: "blocked" as const,
        summary: `${action.label} is advisory-only; no internal apply function was called.`
      },
      delegated: null,
      plan: actionQueue.plan
    };
  }

  if (!input.dryRun && action.actionType === "record_outcome_signals" && !revenueBusinessFleetLaunchNightSupervisorOutcomeMetricsProvided(input)) {
    return {
      action,
      applied: {
        actionId: action.actionId,
        actionType: action.actionType,
        auditLogId: null,
        auditLogIds: [] as string[],
        blockedReason: "Recording outcome signals from the supervisor requires dashboard performance fields.",
        delegatedEndpoint: action.endpoint,
        delegatedSummary: null,
        dryRun: input.dryRun,
        externalExecution: false as const,
        providerContacted: false as const,
        recordSupported: true,
        requiredConfirmation: revenueBusinessFleetLaunchNightSupervisorActionConfirmation,
        selectedIdentifiers,
        status: "blocked" as const,
        summary: "Outcome signal recording was blocked because no revenue, profit, unit, visit, or spend fields were provided."
      },
      delegated: null,
      plan: actionQueue.plan
    };
  }

  const payload = revenueBusinessFleetLaunchNightSupervisorApplyPayload(action, input);
  let delegated: unknown;

  if (!payload) {
    delegated = null;
  } else if (action.actionType === "resolve_launch_commands") {
    delegated = await applyRevenueBusinessFleetLaunchNightCommandQueue(userId, applyRevenueBusinessFleetLaunchNightCommandQueueSchema.parse(payload));
  } else if (action.actionType === "record_launch_commands") {
    delegated = await applyRevenueBusinessFleetLaunchNightCommand(userId, applyRevenueBusinessFleetLaunchNightCommandSchema.parse(payload));
  } else if (action.actionType === "record_manual_evidence") {
    delegated = await applyRevenueBusinessFleetManualLaunchEvidence(userId, applyRevenueBusinessFleetManualLaunchEvidenceSchema.parse(payload));
  } else if (action.actionType === "record_outcome_signals") {
    delegated = await applyRevenueBusinessFleetLaunchOutcomeSignals(userId, applyRevenueBusinessFleetLaunchOutcomeSignalsSchema.parse(payload));
  } else if (action.actionType === "advance_cash_cycle") {
    delegated = await applyRevenueBusinessFleetLaunchCashCycle(userId, applyRevenueBusinessFleetLaunchCashCycleSchema.parse(payload));
  } else {
    delegated = null;
  }

  const delegatedRecord = recordFromUnknown(delegated);
  const delegatedApplied = recordFromUnknown(delegatedRecord.applied);
  const delegatedSummary = stringFromRecord(delegatedApplied, "summary");
  const auditLogId = stringFromRecord(delegatedApplied, "auditLogId");
  const auditLogIds = Array.isArray(delegatedApplied.auditLogIds)
    ? delegatedApplied.auditLogIds.filter((item): item is string => typeof item === "string")
    : [];
  const refreshed = input.dryRun
    ? actionQueue
    : await buildRevenueBusinessFleetLaunchNightSupervisorActionsForUser(
      userId,
      revenueBusinessFleetLaunchNightSupervisorActionsQuerySchema.parse(input)
    );

  return {
    action,
    applied: {
      actionId: action.actionId,
      actionType: action.actionType,
      auditLogId: auditLogId ?? null,
      auditLogIds,
      blockedReason: null,
      delegatedEndpoint: action.endpoint,
      delegatedSummary,
      dryRun: input.dryRun,
      externalExecution: false as const,
      providerContacted: false as const,
      recordSupported: true,
      requiredConfirmation: revenueBusinessFleetLaunchNightSupervisorActionConfirmation,
      selectedIdentifiers,
      status: input.dryRun ? "previewed" as const : "recorded" as const,
      summary: `${input.dryRun ? "Previewed" : "Recorded"} supervisor action ${action.label}. ${delegatedSummary ?? "Delegated internal apply completed."}`
    },
    delegated,
    plan: refreshed.plan
  };
}

async function runRevenueBusinessFleetLaunchNightSupervisorNextAction(
  userId: string,
  input: ApplyRevenueBusinessFleetLaunchNightSupervisorRunNextInput
) {
  const response = await applyRevenueBusinessFleetLaunchNightSupervisorAction(
    userId,
    applyRevenueBusinessFleetLaunchNightSupervisorActionSchema.parse({
      ...input,
      actionId: undefined,
      confirm: revenueBusinessFleetLaunchNightSupervisorActionConfirmation,
      note: input.note ?? "Run-next executed from Business Fleet launch-night supervisor."
    })
  );

  return {
    ...response,
    runNext: {
      dryRun: input.dryRun,
      externalExecution: false as const,
      mode: "Revenue Business Fleet Launch Night Supervisor Run Next" as const,
      providerContacted: false as const,
      requiredConfirmation: revenueBusinessFleetLaunchNightSupervisorRunNextConfirmation,
      selectedActionId: response.applied.actionId,
      selectedActionType: response.applied.actionType,
      status: response.applied.status,
      summary: response.applied.summary
    }
  };
}

function revenueBusinessFleetLaunchNightSupervisorPreviewBlocker(
  action: RevenueBusinessFleetLaunchNightSupervisorAction,
  input: RevenueBusinessFleetLaunchNightSupervisorRunUntilBlockedPreviewInput
) {
  if (!action.recordSupported || action.method !== "POST" || !action.payloadPreview) {
    return "Supervisor action is advisory-only and cannot be recorded through the internal apply chain.";
  }

  if (action.actionType === "record_outcome_signals" && !revenueBusinessFleetLaunchNightSupervisorOutcomeMetricsProvided(input)) {
    return "Outcome signal action needs revenue, profit, unit, visit, or spend fields before it can be recorded.";
  }

  return null;
}

function revenueBusinessFleetLaunchNightSupervisorPreviewPayload(
  action: RevenueBusinessFleetLaunchNightSupervisorAction,
  input: RevenueBusinessFleetLaunchNightSupervisorRunUntilBlockedPreviewInput
) {
  if (!action.payloadPreview) return null;

  return revenueBusinessFleetLaunchNightSupervisorApplyPayload(action, applyRevenueBusinessFleetLaunchNightSupervisorActionSchema.parse({
    ...input,
    actionId: action.actionId,
    confirm: revenueBusinessFleetLaunchNightSupervisorActionConfirmation,
    dryRun: true,
    note: input.note ?? "Previewed from Business Fleet launch-night run-until-blocked sequence."
  }));
}

async function previewRevenueBusinessFleetLaunchNightSupervisorRunUntilBlocked(
  userId: string,
  input: RevenueBusinessFleetLaunchNightSupervisorRunUntilBlockedPreviewInput
) {
  const actionQueue = await buildRevenueBusinessFleetLaunchNightSupervisorActionsForUser(
    userId,
    revenueBusinessFleetLaunchNightSupervisorActionsQuerySchema.parse(input)
  );
  const steps = [];
  let stopReason: "action_blocked" | "queue_exhausted" | "step_cap_reached" = "queue_exhausted";

  for (const action of actionQueue.plan.actions.slice(0, input.maxRunSteps)) {
    const blocker = revenueBusinessFleetLaunchNightSupervisorPreviewBlocker(action, input);
    const selectedIdentifiers = action.selectedIds.assignmentIds.length
      + action.selectedIds.commandRecordIds.length
      + action.selectedIds.laneIds.length
      + action.selectedIds.signalIds.length;
    const payloadPreview = blocker ? action.payloadPreview : revenueBusinessFleetLaunchNightSupervisorPreviewPayload(action, input);

    steps.push({
      actionId: action.actionId,
      actionType: action.actionType,
      blockedReason: blocker,
      confirm: action.confirm,
      dryRunSupported: action.dryRunSupported,
      endpoint: action.endpoint,
      externalExecution: false as const,
      label: action.label,
      method: action.method,
      nextInternalState: action.nextInternalState,
      payloadPreview,
      providerContacted: false as const,
      reason: action.reason,
      recordSupported: action.recordSupported,
      selectedIds: action.selectedIds,
      selectedIdentifiers,
      sequence: steps.length + 1,
      status: blocker ? "blocked" as const : "would_preview" as const
    });

    if (blocker) {
      stopReason = "action_blocked";
      break;
    }
  }

  if (steps.length >= input.maxRunSteps && actionQueue.plan.actions.length > input.maxRunSteps && stopReason !== "action_blocked") {
    stopReason = "step_cap_reached";
  } else if (steps.length === actionQueue.plan.actions.length && stopReason !== "action_blocked") {
    stopReason = "queue_exhausted";
  }

  const blockedStep = steps.find((step) => step.status === "blocked") ?? null;
  const previewableSteps = steps.filter((step) => step.status === "would_preview").length;

  return {
    plan: {
      auditEvents: [
        "Run-until-blocked preview reads the current supervisor action queue and composes a bounded internal sequence.",
        "Preview does not call internal apply functions, mutate command records, move money, contact providers, run browsers, publish listings, upload content, or change ad spend.",
        "Use the run-next or row-level supervisor action controls to execute one internal action at a time after preview review."
      ],
      blockedExternalActions: actionQueue.plan.blockedExternalActions,
      externalExecution: false as const,
      generatedAt: new Date().toISOString(),
      maxRunSteps: input.maxRunSteps,
      mode: "Revenue Business Fleet Launch Night Run Until Blocked Preview" as const,
      providerContacted: false as const,
      requiredConfirmation: revenueBusinessFleetLaunchNightSupervisorRunUntilBlockedPreviewConfirmation,
      sequence: steps,
      stopReason,
      summary: `${steps.length} supervisor step${steps.length === 1 ? "" : "s"} previewed; ${previewableSteps} can be previewed internally before stop reason ${stopReason.replace(/_/g, " ")}.`,
      supervisor: {
        canStartTonight: actionQueue.plan.supervisor.canStartTonight,
        nextAction: actionQueue.plan.supervisor.nextAction,
        summary: actionQueue.plan.supervisor.summary,
        totals: actionQueue.plan.supervisor.totals
      },
      totals: {
        blocked: blockedStep ? 1 : 0,
        externalExecutionLocked: steps.filter((step) => step.externalExecution === false).length,
        providerContacted: 0,
        queueActions: actionQueue.plan.totals.actions,
        selectedIdentifiers: steps.reduce((sum, step) => sum + step.selectedIdentifiers, 0),
        steps: steps.length,
        wouldPreview: previewableSteps
      }
    }
  };
}

function buildBusinessFleetLaunchOutcomePerformanceSnapshot(
  input: ApplyRevenueBusinessFleetLaunchOutcomeSignalsInput,
  packet: Awaited<ReturnType<typeof buildRevenueBusinessFleetLaunchOutcomeSignalsForUser>>["plan"]["packets"][number]
): IngestRevenuePerformanceInput["snapshots"][number] {
  const periodEnd = input.periodEnd ? new Date(input.periodEnd) : new Date();
  const periodStart = input.periodStart ? new Date(input.periodStart) : new Date(periodEnd.getTime() - 86_400_000);
  const netProfit = input.netProfit ?? calculateRevenuePerformanceNetProfit({
    adSpend: input.adSpend,
    digitalDeliveryCost: input.digitalDeliveryCost,
    discounts: input.discounts,
    grossRevenue: input.grossRevenue,
    platformFees: input.platformFees,
    productionCost: input.productionCost,
    refunds: input.refunds,
    shippingCost: input.shippingCost,
    storeId: packet.storeId,
    periodEnd: periodEnd.toISOString(),
    periodStart: periodStart.toISOString()
  });
  const notes = [
    `Business-fleet launch outcome signal for ${packet.businessName}.`,
    `Evidence audit log: ${packet.evidenceAuditLogId ?? "missing"}.`,
    `Recommended action before capture: ${packet.recommendedAction}.`,
    input.note ? `Operator note: ${input.note}` : null,
    "No external analytics import, provider call, ad spend execution, payout, payment, browser action, upload, marketplace write, or API write executed."
  ].filter((item): item is string => Boolean(item)).join(" ");

  return {
    adSpend: input.adSpend,
    digitalDeliveryCost: input.digitalDeliveryCost,
    discounts: input.discounts,
    grossRevenue: input.grossRevenue,
    impressions: input.impressions,
    netProfit,
    notes,
    periodEnd: periodEnd.toISOString(),
    periodStart: periodStart.toISOString(),
    platformFees: input.platformFees,
    productId: null,
    productionCost: input.productionCost,
    refunds: input.refunds,
    shippingCost: input.shippingCost,
    source: "manual",
    storeId: packet.storeId,
    unitsSold: input.unitsSold,
    visits: input.visits
  };
}

async function applyRevenueBusinessFleetLaunchOutcomeSignals(
  userId: string,
  input: ApplyRevenueBusinessFleetLaunchOutcomeSignalsInput
) {
  const current = await buildRevenueBusinessFleetLaunchOutcomeSignalsForUser(userId, revenueBusinessFleetLaunchOutcomeSignalsQuerySchema.parse({
    launchWaveSize: input.launchWaveSize,
    maxAssignments: input.maxAssignments,
    maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
    maxLeases: input.maxLeases,
    maxLeasesPerShard: input.maxLeasesPerShard,
    maxParallelLaunches: input.maxParallelLaunches,
    maxParallelScaleActions: input.maxParallelScaleActions,
    maxSignals: input.maxSignals,
    maxStores: input.maxStores,
    maxWorkers: input.maxWorkers,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    sourceKeys: input.sourceKeys,
    targetBusinesses: input.targetBusinesses
  }));
  const requestedSignalIds = new Set(input.signalIds);
  const selectedPackets = current.plan.packets
    .filter((packet) => packet.status === "ready_for_signal")
    .filter((packet) => requestedSignalIds.size === 0 || requestedSignalIds.has(packet.signalId))
    .slice(0, input.maxSignals);
  const snapshots = selectedPackets.map((packet) => buildBusinessFleetLaunchOutcomePerformanceSnapshot(input, packet));
  const existing = await buildPerformanceDigestForUser(userId, revenuePerformanceQuerySchema.parse({}));
  const incomingSnapshots = snapshots.map((snapshot) => normalizeRevenuePerformanceSnapshot({
    ...snapshot,
    netProfit: snapshot.netProfit ?? calculateRevenuePerformanceNetProfit(snapshot)
  }));
  const previewDigest = buildRevenuePerformanceDigest({
    options: existing.digest.options,
    products: existing.products,
    snapshots: [...existing.digest.snapshots, ...incomingSnapshots],
    stores: existing.stores.map((store) => storeSnapshot(store))
  });
  const netProfit = incomingSnapshots.reduce((sum, snapshot) => sum + snapshot.netProfit, 0);
  const grossRevenue = incomingSnapshots.reduce((sum, snapshot) => sum + snapshot.grossRevenue, 0);

  if (input.dryRun) {
    return {
      applied: {
        auditLogIds: [] as string[],
        dryRun: true,
        externalExecution: false as const,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        providerContacted: false as const,
        signalsPreviewed: incomingSnapshots.length,
        signalsRecorded: 0,
        signalsSelected: selectedPackets.length,
        snapshotIds: [] as string[],
        summary: `${incomingSnapshots.length} business-fleet launch outcome signal${incomingSnapshots.length === 1 ? "" : "s"} would be recorded into the performance ledger.`
      },
      digest: previewDigest,
      plan: current.plan,
      portfolio: await buildAssetPortfolioForUser(userId, revenueEngineQuerySchema.parse({})),
      selectedPackets,
      snapshots: incomingSnapshots
    };
  }

  const ownership = await validatePerformanceSnapshotOwnership(userId, snapshots);

  if (ownership.error) {
    return {
      applied: {
        auditLogIds: [] as string[],
        blockedReason: ownership.error,
        dryRun: false,
        externalExecution: false as const,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        providerContacted: false as const,
        signalsPreviewed: 0,
        signalsRecorded: 0,
        signalsSelected: selectedPackets.length,
        snapshotIds: [] as string[],
        summary: `Business-fleet launch outcome signals were not recorded: ${ownership.error}`
      },
      digest: existing.digest,
      plan: current.plan,
      portfolio: await buildAssetPortfolioForUser(userId, revenueEngineQuerySchema.parse({})),
      selectedPackets,
      snapshots: incomingSnapshots
    };
  }

  const created = await prisma.$transaction(snapshots.map((snapshot) => prisma.revenuePerformanceSnapshot.create({
    data: createPerformanceSnapshotData(userId, snapshot)
  })));
  await rollupPerformanceStores(userId, snapshots.map((snapshot) => snapshot.storeId));
  const createdSnapshots = created.map(performanceSnapshot);
  const auditLogs = await Promise.all(createdSnapshots.map((snapshot) => {
    const packet = selectedPackets.find((item) => item.storeId === snapshot.storeId);

    return recordAuditLog({
      action: "revenue.business_fleet.launch_outcome_signal.recorded",
      actorUserId: userId,
      metadata: {
        adSpend: snapshot.adSpend,
        dryRun: false,
        evidenceAuditLogId: packet?.evidenceAuditLogId ?? null,
        externalExecution: false,
        grossRevenue: snapshot.grossRevenue,
        netProfit: snapshot.netProfit,
        note: input.note ?? null,
        packetId: packet?.packetId ?? null,
        periodEnd: snapshot.periodEnd,
        periodStart: snapshot.periodStart,
        providerContacted: false,
        recommendedAction: packet?.recommendedAction ?? "watch",
        requiredConfirmation: revenueBusinessFleetLaunchOutcomeSignalsConfirmation,
        signalId: packet?.signalId ?? null,
        snapshotId: snapshot.id,
        sourceKey: packet?.sourceKey ?? null,
        storeId: snapshot.storeId,
        storeName: packet?.businessName ?? null,
        summary: `${packet?.businessName ?? "Business fleet lane"} launch outcome signal recorded: ${snapshot.unitsSold} unit${snapshot.unitsSold === 1 ? "" : "s"}, ${snapshot.grossRevenue} gross revenue, ${snapshot.netProfit} net profit. External execution remains locked.`,
        unitsSold: snapshot.unitsSold,
        visits: snapshot.visits
      },
      outcome: "success",
      severity: snapshot.grossRevenue > 0 || snapshot.netProfit > 0 ? "medium" : "low",
      targetId: snapshot.storeId,
      targetType: "revenue_business_fleet_launch_outcome_signal"
    });
  }));
  const [refreshed, portfolio] = await Promise.all([
    buildPerformanceDigestForUser(userId, revenuePerformanceQuerySchema.parse({})),
    buildAssetPortfolioForUser(userId, revenueEngineQuerySchema.parse({}))
  ]);
  const refreshedPlan = await buildRevenueBusinessFleetLaunchOutcomeSignalsForUser(userId, revenueBusinessFleetLaunchOutcomeSignalsQuerySchema.parse({
    launchWaveSize: input.launchWaveSize,
    maxAssignments: input.maxAssignments,
    maxAssignmentsPerWorker: input.maxAssignmentsPerWorker,
    maxLeases: input.maxLeases,
    maxLeasesPerShard: input.maxLeasesPerShard,
    maxParallelLaunches: input.maxParallelLaunches,
    maxParallelScaleActions: input.maxParallelScaleActions,
    maxSignals: input.maxSignals,
    maxStores: input.maxStores,
    maxWorkers: input.maxWorkers,
    qualityFloor: input.qualityFloor,
    shardCount: input.shardCount,
    sourceKeys: input.sourceKeys,
    targetBusinesses: input.targetBusinesses
  }));

  return {
    applied: {
      auditLogIds: auditLogs.map((log) => log.id),
      dryRun: false,
      externalExecution: false as const,
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      providerContacted: false as const,
      signalsPreviewed: 0,
      signalsRecorded: created.length,
      signalsSelected: selectedPackets.length,
      snapshotIds: created.map((snapshot) => snapshot.id),
      summary: `${created.length} business-fleet launch outcome signal${created.length === 1 ? "" : "s"} recorded into the performance ledger.`
    },
    digest: refreshed.digest,
    plan: refreshedPlan.plan,
    portfolio,
    selectedPackets,
    snapshots: createdSnapshots
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

const revenueCashLoopEvidenceTargetTypes = [
  "revenue_first_store_owner_launch_approval",
  "revenue_first_store_manual_launch_evidence",
  "revenue_business_fleet_manual_launch_evidence",
  "revenue_first_store_manual_signal_snapshot",
  "revenue_business_fleet_launch_outcome_signal",
  "revenue_winner_clone_packet_approval"
] as const;

type PublicRevenueAuditLog = ReturnType<typeof publicAuditLog>;

function revenueCashLoopEvidenceType(targetType: string): RevenuePortfolioDashboardCashLoopEvidenceReceipt["evidenceType"] | null {
  if (targetType === "revenue_first_store_owner_launch_approval") return "owner_launch_approval";
  if (targetType === "revenue_first_store_manual_launch_evidence") return "manual_launch_evidence";
  if (targetType === "revenue_business_fleet_manual_launch_evidence") return "manual_launch_evidence";
  if (targetType === "revenue_first_store_manual_signal_snapshot") return "manual_signal_snapshot";
  if (targetType === "revenue_business_fleet_launch_outcome_signal") return "manual_signal_snapshot";
  if (targetType === "revenue_winner_clone_packet_approval") return "winner_clone_packet_approval";

  return null;
}

function recordFromUnknown(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringFromRecord(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberFromRecord(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function revenueAssetRotationDecisionFromRecord(record: Record<string, unknown>, key: string): RevenueAssetRotationDecision | null {
  const value = stringFromRecord(record, key);

  return revenueAssetRotationDecisionValues.includes(value as RevenueAssetRotationDecision)
    ? value as RevenueAssetRotationDecision
    : null;
}

function revenueCashLoopEvidenceSummary(input: {
  evidenceType: RevenuePortfolioDashboardCashLoopEvidenceReceipt["evidenceType"];
  metadata: Record<string, unknown>;
}): string {
  const summary = stringFromRecord(input.metadata, "summary");
  const storeName = stringFromRecord(input.metadata, "storeName") ?? "the first store";

  if (summary) return summary;

  if (input.evidenceType === "manual_launch_evidence") {
    const category = stringFromRecord(input.metadata, "evidenceCategory")?.replace(/_/g, " ") ?? "manual launch";
    const stepIndex = numberFromRecord(input.metadata, "stepIndex");
    return `First-store manual launch evidence recorded for ${storeName}: ${category}${stepIndex === null ? "" : ` step ${stepIndex + 1}`}. External execution remains locked.`;
  }

  if (input.evidenceType === "manual_signal_snapshot") {
    const unitsSold = numberFromRecord(input.metadata, "unitsSold") ?? 0;
    const grossRevenue = numberFromRecord(input.metadata, "grossRevenue") ?? 0;
    const netProfit = numberFromRecord(input.metadata, "netProfit") ?? 0;
    return `First-store manual signal snapshot recorded for ${storeName}: ${unitsSold} unit${unitsSold === 1 ? "" : "s"}, ${grossRevenue} gross revenue, ${netProfit} net profit. External execution remains locked.`;
  }

  if (input.evidenceType === "winner_clone_packet_approval") {
    const targetStores = numberFromRecord(input.metadata, "targetStores");
    const draftCloneSlots = numberFromRecord(input.metadata, "draftCloneSlots") ?? 0;
    return `${targetStores ?? "Winner"}-store internal winner clone packet approval recorded for ${storeName} with ${draftCloneSlots} private draft slot${draftCloneSlots === 1 ? "" : "s"}. External execution remains locked.`;
  }

  return `Owner manual live launch approval receipt recorded for ${storeName}. External execution remains locked.`;
}

function revenueCashLoopEvidenceReceiptFromAuditLog(log: PublicRevenueAuditLog): RevenuePortfolioDashboardCashLoopEvidenceReceipt | null {
  const evidenceType = revenueCashLoopEvidenceType(log.targetType);

  if (!evidenceType) return null;

  const entry = recordFromUnknown(log.entry);
  const entryMetadata = recordFromUnknown(entry.metadata);
  const metadata = Object.keys(entryMetadata).length > 0 ? entryMetadata : entry;
  const evidenceCategory = stringFromRecord(metadata, "evidenceCategory");
  const manualSignalDay = numberFromRecord(metadata, "day");
  const targetStores = numberFromRecord(metadata, "targetStores");

  return {
    action: log.action,
    auditLogId: log.id,
    createdAt: log.createdAt.toISOString(),
    entryHash: log.entryHash,
    evidenceType,
    externalExecution: false,
    launchEvidenceCategory: evidenceType === "manual_launch_evidence" && isRevenuePortfolioDashboardLaunchEvidenceCategory(evidenceCategory)
      ? evidenceCategory
      : null,
    manualSignalDay: evidenceType === "manual_signal_snapshot" && manualSignalDay !== null
      ? Math.max(0, Math.min(7, Math.floor(manualSignalDay)))
      : null,
    manualSignalRotationRecommendation: evidenceType === "manual_signal_snapshot"
      ? revenueAssetRotationDecisionFromRecord(metadata, "rotationRecommendation")
      : null,
    providerContacted: false,
    storeId: stringFromRecord(metadata, "storeId") ?? log.targetId,
    storeName: stringFromRecord(metadata, "storeName"),
    summary: revenueCashLoopEvidenceSummary({
      evidenceType,
      metadata
    }),
    targetId: log.targetId,
    targetStores: evidenceType === "winner_clone_packet_approval" && (targetStores === 10 || targetStores === 25 || targetStores === 100)
      ? targetStores
      : null,
    targetType: log.targetType
  };
}

async function listRevenueCashLoopEvidenceReceipts(userId: string): Promise<RevenuePortfolioDashboardCashLoopEvidenceReceipt[]> {
  const logs = await prisma.auditLog.findMany({
    orderBy: {
      createdAt: "desc"
    },
    where: {
      actorUserId: userId,
      targetType: {
        in: [...revenueCashLoopEvidenceTargetTypes]
      }
    }
  });

  return logs
    .map((log) => revenueCashLoopEvidenceReceiptFromAuditLog(publicAuditLog(log)))
    .filter((receipt): receipt is RevenuePortfolioDashboardCashLoopEvidenceReceipt => Boolean(receipt));
}

async function buildRevenuePortfolioDashboardForUser(userId: string, thresholds: RevenueEngineQueryInput): Promise<RevenuePortfolioDashboardPlan> {
  const [
    portfolio,
    controlLedger,
    commandResult,
    firstCashResult,
    firstBusinessLaunchResult,
    firstBusinessExecutionPreview,
    financialResult,
    launchReadinessResult,
    tenStoreFleetResult,
    hundredStoreOperationsResult,
    cashLoopEvidenceReceipts
  ] = await Promise.all([
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
    })),
    buildFirstCashReadinessForUser(userId, revenueFirstCashReadinessQuerySchema.parse({
      includeBlocked: true,
      maxCandidates: 8,
      targetDaysToFirstCash: 7
    })),
    buildFirstBusinessLaunchForUser(userId, revenueFirstBusinessLaunchQuerySchema.parse({
      maxCandidates: 8
    })),
    applyRevenueFirstBusinessExecute(userId, applyRevenueFirstBusinessExecuteSchema.parse({
      confirm: revenueFirstBusinessExecuteConfirmation,
      dryRun: true,
      note: "Dashboard first-store cash-loop final execution readiness preview."
    })),
    buildFinancialOrchestratorForUser(userId, financialOrchestratorQuerySchema.parse({
      includePayoutIntents: true,
      windowDays: 30
    })),
    buildLaunchReadinessForUser(userId, revenueLaunchReadinessQuerySchema.parse({
      includeApprovalHistory: true,
      maxStores: 8,
      minLaunchReadiness: 1,
      minProviderReadiness: 1
    })),
    buildRevenueBusinessFleetSchedulerForUser(userId, revenueBusinessFleetSchedulerQuerySchema.parse({
      launchWaveSize: 10,
      maxParallelLaunches: 10,
      maxParallelScaleActions: 25,
      targetBusinesses: 10
    })),
    buildRevenueHundredStoreOperationsForUser(userId, revenueHundredStoreOperationsQuerySchema.parse({
      targetStores: 100
    })),
    listRevenueCashLoopEvidenceReceipts(userId)
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
    cashLoopEvidenceReceipts,
    commandPlan: commandResult.plan,
    controlLedger,
    financialPlan: financialResult.plan,
    firstBusinessExecutionPlan: firstBusinessExecutionPreview.execution,
    firstBusinessLaunchPlan: firstBusinessLaunchResult.plan,
    firstCashPlan: firstCashResult.plan,
    hundredStoreOperationsPlan: hundredStoreOperationsResult.plan,
    launchReadinessPlan: launchReadinessResult.plan,
    portfolio,
    reviewQueue,
    tenStoreFleetPlan: tenStoreFleetResult.plan
  });
}

async function applyRevenueOwnerManualLaunchApproval(userId: string, input: ApplyRevenueOwnerManualLaunchApprovalInput) {
  const dashboard = await buildRevenuePortfolioDashboardForUser(userId, revenueEngineQuerySchema.parse({}));
  const ownerLaunchApproval = dashboard.firstStoreCashLoop.ownerLaunchApproval;
  const dashboardStoreId = dashboard.firstStoreCashLoop.firstCashStatus?.storeId
    ?? dashboard.firstStoreCashLoop.launchReadiness.storeId
    ?? dashboard.firstStoreCashLoop.firstRevenueProof.storeId
    ?? null;
  const targetStoreId = input.storeId ?? dashboardStoreId;
  const storeName = dashboard.firstStoreCashLoop.firstCashStatus?.storeName
    ?? dashboard.firstStoreCashLoop.launchReadiness.storeName
    ?? dashboard.firstStoreCashLoop.firstRevenueProof.storeName
    ?? dashboard.firstStoreCashLoop.manualLaunchPacket.store?.name
    ?? null;
  const blockers = [
    targetStoreId ? null : "No first-store target is available on the current cash-loop dashboard.",
    ownerLaunchApproval.status === "ready_for_owner_review" ? null : `Owner launch approval packet is ${ownerLaunchApproval.status.replace(/_/g, " ")}.`,
    input.storeId && dashboardStoreId && input.storeId !== dashboardStoreId
      ? `Requested store ${input.storeId} does not match the current first-store packet ${dashboardStoreId}.`
      : null
  ].filter((blocker): blocker is string => Boolean(blocker));
  const allowed = blockers.length === 0;
  const summary = allowed
    ? input.dryRun
      ? `Owner manual live launch approval receipt previewed for ${storeName ?? "the first store"}. External execution remains locked.`
      : `Owner manual live launch approval receipt recorded for ${storeName ?? "the first store"}. External execution remains locked.`
    : `Owner manual live launch approval receipt was not recorded: ${blockers.join(" ")}`;
  const auditLog = !allowed || input.dryRun ? null : await recordAuditLog({
    action: "revenue.first_store.owner_manual_launch_approval.recorded",
    actorUserId: userId,
    metadata: {
      approvalMode: ownerLaunchApproval.approvalMode,
      approvalPhrase: input.approvalPhrase,
      approvalStatus: ownerLaunchApproval.status,
      blockedExternalActions: ownerLaunchApproval.blockedExternalActions,
      dryRun: false,
      externalExecution: false,
      liveApprovalRequired: ownerLaunchApproval.liveApprovalRequired,
      manualOnlyActions: ownerLaunchApproval.manualOnlyActions,
      note: input.note ?? null,
      preflightChecks: ownerLaunchApproval.preflightChecks,
      providerContacted: false,
      requiredConfirmation: revenueOwnerManualLaunchApprovalConfirmation,
      rollbackPlan: ownerLaunchApproval.rollbackPlan,
      stillLocked: ownerLaunchApproval.unlockBoundary.stillLocked,
      storeId: targetStoreId,
      storeName,
      summary,
      unlocks: ownerLaunchApproval.unlockBoundary.unlocks
    },
    outcome: "success",
    severity: "high",
    targetId: targetStoreId,
    targetType: "revenue_first_store_owner_launch_approval"
  });
  const refreshedDashboard = auditLog ? await buildRevenuePortfolioDashboardForUser(userId, revenueEngineQuerySchema.parse({})) : dashboard;
  const refreshedOwnerLaunchApproval = refreshedDashboard.firstStoreCashLoop.ownerLaunchApproval;

  return {
    applied: {
      allowed,
      approvalPhrase: input.approvalPhrase,
      approvalStatus: ownerLaunchApproval.status,
      approvalsPreviewed: allowed && input.dryRun ? 1 : 0,
      approvalsRecorded: allowed && !input.dryRun ? 1 : 0,
      auditLogId: auditLog?.id ?? null,
      blockedExternalActions: ownerLaunchApproval.blockedExternalActions,
      blockers,
      dryRun: input.dryRun,
      externalExecution: false as const,
      providerContacted: false as const,
      stillLocked: ownerLaunchApproval.unlockBoundary.stillLocked,
      storeId: targetStoreId,
      storeName,
      summary,
      unlocks: ownerLaunchApproval.unlockBoundary.unlocks
    },
    dashboard: refreshedDashboard,
    ownerLaunchApproval: refreshedOwnerLaunchApproval
  };
}

async function applyRevenueFirstStoreManualLaunchEvidence(userId: string, input: ApplyRevenueFirstStoreManualLaunchEvidenceInput) {
  const dashboard = await buildRevenuePortfolioDashboardForUser(userId, revenueEngineQuerySchema.parse({}));
  const manualLaunchPacket = dashboard.firstStoreCashLoop.manualLaunchPacket;
  const dashboardStoreId = dashboard.firstStoreCashLoop.firstCashStatus?.storeId
    ?? dashboard.firstStoreCashLoop.launchReadiness.storeId
    ?? dashboard.firstStoreCashLoop.firstRevenueProof.storeId
    ?? null;
  const targetStoreId = input.storeId ?? dashboardStoreId;
  const storeName = dashboard.firstStoreCashLoop.firstCashStatus?.storeName
    ?? dashboard.firstStoreCashLoop.launchReadiness.storeName
    ?? dashboard.firstStoreCashLoop.firstRevenueProof.storeName
    ?? manualLaunchPacket.store?.name
    ?? null;
  const stepTitle = manualLaunchPacket.manualSteps[input.stepIndex] ?? null;
  const cashLoopReceipts = await listRevenueCashLoopEvidenceReceipts(userId);
  const ownerApprovalRecorded = hasRevenueCashLoopEvidenceReceipt(cashLoopReceipts, "owner_launch_approval", targetStoreId);
  const blockers = [
    targetStoreId ? null : "No first-store target is available on the current cash-loop dashboard.",
    manualLaunchPacket.status === "ready_for_operator_review" ? null : `Manual launch packet is ${manualLaunchPacket.status.replace(/_/g, " ")}.`,
    ownerApprovalRecorded ? null : "Record owner manual live-launch approval receipt before recording first-store manual launch evidence.",
    stepTitle ? null : `Manual launch step ${input.stepIndex + 1} is not available in the current first-store packet.`,
    input.ownerCompletedManualStep ? null : "Owner/operator completion must be true before recording manual launch evidence.",
    input.storeId && dashboardStoreId && input.storeId !== dashboardStoreId
      ? `Requested store ${input.storeId} does not match the current first-store packet ${dashboardStoreId}.`
      : null
  ].filter((blocker): blocker is string => Boolean(blocker));
  const allowed = blockers.length === 0;
  const completedAt = input.completedAt ?? new Date().toISOString();
  const categoryLabel = input.evidenceCategory.replace(/_/g, " ");
  const summary = allowed
    ? input.dryRun
      ? `First-store manual launch evidence previewed for ${storeName ?? "the first store"}: ${categoryLabel} step ${input.stepIndex + 1}. External execution remains locked.`
      : `First-store manual launch evidence recorded for ${storeName ?? "the first store"}: ${categoryLabel} step ${input.stepIndex + 1}. External execution remains locked.`
    : `First-store manual launch evidence was not recorded: ${blockers.join(" ")}`;
  const auditLog = !allowed || input.dryRun ? null : await recordAuditLog({
    action: "revenue.first_store.manual_launch_evidence.recorded",
    actorUserId: userId,
    metadata: {
      approvalPhrase: input.approvalPhrase,
      blockedExternalActions: dashboard.firstStoreCashLoop.ownerLaunchApproval.blockedExternalActions,
      completedAt,
      dryRun: false,
      evidenceCategory: input.evidenceCategory,
      evidenceNote: input.evidenceNote ?? null,
      externalExecution: false,
      manualStep: stepTitle,
      ownerCompletedManualStep: input.ownerCompletedManualStep,
      providerContacted: false,
      requiredConfirmation: revenueFirstStoreManualLaunchEvidenceConfirmation,
      rollbackPlan: manualLaunchPacket.rollbackPlan,
      stepIndex: input.stepIndex,
      storeId: targetStoreId,
      storeName,
      summary
    },
    outcome: "success",
    severity: "medium",
    targetId: targetStoreId,
    targetType: "revenue_first_store_manual_launch_evidence"
  });
  const refreshedDashboard = auditLog ? await buildRevenuePortfolioDashboardForUser(userId, revenueEngineQuerySchema.parse({})) : dashboard;

  return {
    dashboard: refreshedDashboard,
    manualLaunchEvidence: {
      allowed,
      approvalPhrase: input.approvalPhrase,
      auditLogId: auditLog?.id ?? null,
      blockedExternalActions: dashboard.firstStoreCashLoop.ownerLaunchApproval.blockedExternalActions,
      blockers,
      completedAt,
      dryRun: input.dryRun,
      evidenceCategory: input.evidenceCategory,
      evidenceNote: input.evidenceNote ?? null,
      evidencePreviewed: allowed && input.dryRun ? 1 : 0,
      evidenceRecorded: allowed && !input.dryRun ? 1 : 0,
      externalExecution: false as const,
      ownerCompletedManualStep: input.ownerCompletedManualStep,
      providerContacted: false as const,
      stepIndex: input.stepIndex,
      stepTitle,
      storeId: targetStoreId,
      storeName,
      summary
    }
  };
}

function buildFirstStoreManualSignalSnapshot(
  input: ApplyRevenueFirstStoreManualSignalCaptureInput,
  storeId: string
): IngestRevenuePerformanceInput["snapshots"][number] {
  const periodEnd = input.periodEnd ? new Date(input.periodEnd) : new Date();
  const periodStart = input.periodStart ? new Date(input.periodStart) : new Date(periodEnd.getTime() - 86_400_000);
  const notes = [
    `First-store manual signal capture day ${input.day}.`,
    `Manual content views ${input.manualContentViews}; saves/shares ${input.manualSavesOrShares}; rotation recommendation ${input.rotationRecommendation}.`,
    input.conversionNotes ? `Conversion notes: ${input.conversionNotes}` : null,
    input.note ? `Operator note: ${input.note}` : null,
    "No external analytics import, provider call, ad spend execution, payout, payment, browser action, upload, marketplace write, or API write executed."
  ].filter((item): item is string => Boolean(item)).join(" ");

  return {
    adSpend: input.adSpend,
    digitalDeliveryCost: 0,
    discounts: 0,
    grossRevenue: input.grossRevenue,
    impressions: input.manualContentViews,
    netProfit: input.netProfit,
    notes,
    periodEnd: periodEnd.toISOString(),
    periodStart: periodStart.toISOString(),
    platformFees: 0,
    productId: null,
    productionCost: 0,
    refunds: 0,
    shippingCost: 0,
    source: "manual",
    storeId,
    unitsSold: input.unitsSold,
    visits: input.visits
  };
}

async function applyRevenueFirstStoreManualSignalCapture(userId: string, input: ApplyRevenueFirstStoreManualSignalCaptureInput) {
  const dashboard = await buildRevenuePortfolioDashboardForUser(userId, revenueEngineQuerySchema.parse({}));
  const cashLoopReceipts = await listRevenueCashLoopEvidenceReceipts(userId);
  const manualSignalGate = buildRevenueFirstStoreManualSignalCaptureGate({
    cashLoopEvidenceReceipts: cashLoopReceipts,
    dashboard,
    requestedStoreId: input.storeId
  });
  const {
    blockers,
    storeName,
    targetStoreId
  } = manualSignalGate;

  if (!targetStoreId) {
    return {
      capture: {
        allowed: false,
        auditLogId: null,
        blockers,
        dryRun: input.dryRun,
        externalExecution: false as const,
        providerContacted: false as const,
        snapshotId: null,
        snapshotsPreviewed: 0,
        snapshotsRecorded: 0,
        storeId: null,
        storeName,
        summary: `First-store manual signal snapshot was not recorded: ${blockers.join(" ")}`
      },
      dashboard,
      digest: null,
      snapshot: null
    };
  }

  const snapshot = buildFirstStoreManualSignalSnapshot(input, targetStoreId);
  const ownership = await validatePerformanceSnapshotOwnership(userId, [snapshot]);

  if (ownership.error) {
    blockers.push(ownership.error);
  }

  const existing = await buildPerformanceDigestForUser(userId, revenuePerformanceQuerySchema.parse({
    storeId: targetStoreId
  }));
  const incomingSnapshot = normalizeRevenuePerformanceSnapshot({
    ...snapshot,
    netProfit: snapshot.netProfit ?? calculateRevenuePerformanceNetProfit(snapshot)
  });
  const previewDigest = buildRevenuePerformanceDigest({
    options: existing.digest.options,
    products: existing.products,
    snapshots: [...existing.digest.snapshots, incomingSnapshot],
    stores: existing.stores.map((store) => storeSnapshot(store))
  });
  const allowed = blockers.length === 0;
  const summary = allowed
    ? input.dryRun
      ? `First-store manual signal snapshot previewed for ${storeName ?? "the first store"}: ${input.unitsSold} unit${input.unitsSold === 1 ? "" : "s"}, ${input.grossRevenue} gross revenue, ${input.netProfit ?? calculateRevenuePerformanceNetProfit(snapshot)} net profit.`
      : `First-store manual signal snapshot recorded for ${storeName ?? "the first store"}: ${input.unitsSold} unit${input.unitsSold === 1 ? "" : "s"}, ${input.grossRevenue} gross revenue, ${input.netProfit ?? calculateRevenuePerformanceNetProfit(snapshot)} net profit.`
    : `First-store manual signal snapshot was not recorded: ${blockers.join(" ")}`;

  if (!allowed || input.dryRun) {
    return {
      capture: {
        allowed,
        auditLogId: null,
        blockers,
        day: input.day,
        dryRun: input.dryRun,
        externalExecution: false as const,
        grossRevenue: input.grossRevenue,
        netProfit: input.netProfit ?? calculateRevenuePerformanceNetProfit(snapshot),
        providerContacted: false as const,
        rotationRecommendation: input.rotationRecommendation,
        snapshotId: null,
        snapshotsPreviewed: allowed ? 1 : 0,
        snapshotsRecorded: 0,
        storeId: targetStoreId,
        storeName,
        summary,
        unitsSold: input.unitsSold,
        visits: input.visits
      },
      dashboard,
      digest: previewDigest,
      snapshot: incomingSnapshot
    };
  }

  const created = await prisma.revenuePerformanceSnapshot.create({
    data: createPerformanceSnapshotData(userId, snapshot)
  });
  await rollupPerformanceStores(userId, [targetStoreId]);
  const refreshedDigest = await buildPerformanceDigestForUser(userId, revenuePerformanceQuerySchema.parse({
    storeId: targetStoreId
  }));
  const auditLog = await recordAuditLog({
    action: "revenue.first_store.manual_signal_snapshot.recorded",
    actorUserId: userId,
    metadata: {
      day: input.day,
      dryRun: false,
      externalExecution: false,
      grossRevenue: input.grossRevenue,
      manualContentViews: input.manualContentViews,
      manualSavesOrShares: input.manualSavesOrShares,
      netProfit: input.netProfit ?? calculateRevenuePerformanceNetProfit(snapshot),
      note: input.note ?? null,
      providerContacted: false,
      requiredConfirmation: revenueFirstStoreManualSignalCaptureConfirmation,
      rotationRecommendation: input.rotationRecommendation,
      snapshotId: created.id,
      storeId: targetStoreId,
      storeName,
      summary,
      unitsSold: input.unitsSold,
      visits: input.visits
    },
    outcome: "success",
    severity: input.grossRevenue > 0 || input.netProfit !== undefined && input.netProfit > 0 ? "medium" : "low",
    targetId: targetStoreId,
    targetType: "revenue_first_store_manual_signal_snapshot"
  });
  const refreshedDashboard = await buildRevenuePortfolioDashboardForUser(userId, revenueEngineQuerySchema.parse({}));

  return {
    capture: {
      allowed: true,
      auditLogId: auditLog.id,
      blockers: [],
      day: input.day,
      dryRun: false,
      externalExecution: false as const,
      grossRevenue: input.grossRevenue,
      netProfit: input.netProfit ?? calculateRevenuePerformanceNetProfit(snapshot),
      providerContacted: false as const,
      rotationRecommendation: input.rotationRecommendation,
      snapshotId: created.id,
      snapshotsPreviewed: 0,
      snapshotsRecorded: 1,
      storeId: targetStoreId,
      storeName,
      summary,
      unitsSold: input.unitsSold,
      visits: input.visits
    },
    dashboard: refreshedDashboard,
    digest: refreshedDigest.digest,
    snapshot: performanceSnapshot(created)
  };
}

async function applyRevenueWinnerClonePacketApproval(userId: string, input: ApplyRevenueWinnerClonePacketApprovalInput) {
  const dashboard = await buildRevenuePortfolioDashboardForUser(userId, revenueEngineQuerySchema.parse({}));
  const cashLoopReceipts = await listRevenueCashLoopEvidenceReceipts(userId);
  const cloneApprovalGate = buildRevenueWinnerClonePacketApprovalGate({
    cashLoopEvidenceReceipts: cashLoopReceipts,
    dashboard,
    requestedStoreId: input.storeId,
    targetStores: input.targetStores
  });
  const {
    allowed,
    blockers,
    packet,
    storeName,
    targetStoreId
  } = cloneApprovalGate;
  const summary = allowed && packet
    ? input.dryRun
      ? `${input.targetStores}-store internal winner clone packet previewed for ${storeName ?? "the first store"} with ${packet.draftCloneSlots} private draft slot${packet.draftCloneSlots === 1 ? "" : "s"}. External execution remains locked.`
      : `${input.targetStores}-store internal winner clone packet approval recorded for ${storeName ?? "the first store"} with ${packet.draftCloneSlots} private draft slot${packet.draftCloneSlots === 1 ? "" : "s"}. External execution remains locked.`
    : `${input.targetStores}-store internal winner clone packet approval was not recorded: ${blockers.join(" ")}`;
  const auditLog = !allowed || input.dryRun || !packet ? null : await recordAuditLog({
    action: "revenue.first_store.winner_clone_packet_approval.recorded",
    actorUserId: userId,
    metadata: {
      approvalPhrase: input.approvalPhrase,
      blockedExternalActions: packet.blockedExternalActions,
      draftCloneSlots: packet.draftCloneSlots,
      dryRun: false,
      externalExecution: false,
      note: input.note ?? null,
      ownerApprovalRequired: packet.ownerApprovalRequired,
      providerContacted: false,
      readinessPercent: packet.readinessPercent,
      requiredConfirmation: revenueWinnerClonePacketApprovalConfirmation,
      requiredProof: packet.requiredProof,
      sourceTemplate: packet.sourceTemplate,
      storeId: targetStoreId,
      storeName,
      summary,
      targetStores: packet.targetStores,
      tasks: packet.tasks
    },
    outcome: "success",
    severity: "high",
    targetId: targetStoreId ?? `winner-clone-${input.targetStores}`,
    targetType: "revenue_winner_clone_packet_approval"
  });
  const refreshedDashboard = auditLog ? await buildRevenuePortfolioDashboardForUser(userId, revenueEngineQuerySchema.parse({})) : dashboard;
  const refreshedPacket = refreshedDashboard.firstStoreCashLoop.winnerScaleLadder.clonePackets.find((candidate) => candidate.targetStores === input.targetStores) ?? packet;

  return {
    cloneApproval: {
      allowed,
      approvalPhrase: input.approvalPhrase,
      approvalStatus: packet?.status ?? "blocked",
      approvalsPreviewed: allowed && input.dryRun ? 1 : 0,
      approvalsRecorded: allowed && !input.dryRun ? 1 : 0,
      auditLogId: auditLog?.id ?? null,
      blockedExternalActions: packet?.blockedExternalActions ?? [],
      blockers,
      draftCloneSlots: packet?.draftCloneSlots ?? 0,
      dryRun: input.dryRun,
      externalExecution: false as const,
      ownerApprovalRequired: packet?.ownerApprovalRequired ?? false,
      providerContacted: false as const,
      requiredProof: packet?.requiredProof ?? [],
      sourceTemplate: packet?.sourceTemplate ?? "none",
      storeId: targetStoreId,
      storeName,
      summary,
      targetStores: input.targetStores,
      taskCount: packet?.tasks.length ?? 0
    },
    clonePacket: refreshedPacket,
    dashboard: refreshedDashboard
  };
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
  contentPlan: FacelessContentPipelinePlan;
  firstCashSprintContext: Awaited<ReturnType<typeof buildFirstCashSprintForUser>>;
  plan: RevenueFirstBusinessLaunchPlan;
}> {
  const [portfolioStores, checklistPlan, firstCashSprintContext, contentContext] = await Promise.all([
    loadPortfolioForUser(userId),
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
    })),
    buildFacelessContentPipelineForUser(userId, facelessContentPipelineQuerySchema.parse({
      briefsPerStore: 2,
      includeChannelPackages: true,
      includeVideoSpecs: true,
      includeVoiceoverSpecs: true,
      maxStores: Math.min(options.maxCandidates, 5),
      windowDays: 30
    }))
  ]);
  const stores = portfolioStores.map((store) => storeSnapshot(store));
  const products = portfolioStores.flatMap((store) => store.products.map(productSnapshot));
  const plan = buildRevenueFirstBusinessLaunchPlan({
    checklistPlan,
    contentPlan: contentContext.plan,
    firstCashSprintPlan: firstCashSprintContext.plan,
    maxCandidates: options.maxCandidates,
    products,
    stores
  });

  return {
    checklistPlan,
    contentPlan: contentContext.plan,
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
      automationProfile: plan.automationProfile,
      blockedExternalActions: plan.blockedExternalActions,
      chainOfCommand: plan.chainOfCommand,
      externalExecution: false,
      options: plan.options,
      ownerApprovalQueue: plan.ownerApprovalQueue,
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
          sourceModule: item.sourceModule,
          chainOfCommand: plan.chainOfCommand.find((lane) => lane.phase === item.phase) ?? null,
          ownerApprovalQueue: plan.ownerApprovalQueue.filter((approval) => approval.actionIds.includes(item.commandHash))
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
      automationProfile: context.plan.automationProfile,
      chainOfCommand: context.plan.chainOfCommand,
      externalExecution: false,
      includeAssetBatchActions: input.includeAssetBatchActions,
      includeDraftCreation: input.includeDraftCreation,
      includeLaunchApprovalPackets: input.includeLaunchApprovalPackets,
      options: context.plan.options,
      ownerApprovalQueue: context.plan.ownerApprovalQueue,
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
          allocationLane: packet.allocationLane,
          budgetCap: packet.budgetCap,
          organicFirst: packet.organicFirst,
          performanceBasis: packet.performanceBasis,
          recommendedChannel: packet.recommendedChannel,
          scoreBand: packet.scoreBand,
          spendPriority: packet.spendPriority,
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

  app.post("/merch/revenue-engine/first-store-cash-loop/owner-launch-approval/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueOwnerManualLaunchApprovalSchema.parse(request.body);
    const response = await applyRevenueOwnerManualLaunchApproval(currentUser.sub, input);

    if (!response.applied.allowed) {
      return reply.code(409).send(response);
    }

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/first-store-cash-loop/manual-launch-evidence/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueFirstStoreManualLaunchEvidenceSchema.parse(request.body);
    const response = await applyRevenueFirstStoreManualLaunchEvidence(currentUser.sub, input);

    if (!response.manualLaunchEvidence.allowed) {
      return reply.code(409).send(response);
    }

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/first-store-cash-loop/manual-signal-snapshot/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueFirstStoreManualSignalCaptureSchema.parse(request.body);
    const response = await applyRevenueFirstStoreManualSignalCapture(currentUser.sub, input);

    if (!response.capture.allowed) {
      return reply.code(409).send(response);
    }

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/first-store-cash-loop/winner-clone-packet-approval/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueWinnerClonePacketApprovalSchema.parse(request.body);
    const response = await applyRevenueWinnerClonePacketApproval(currentUser.sub, input);

    if (!response.cloneApproval.allowed) {
      return reply.code(409).send(response);
    }

    return reply.send(response);
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

  app.get("/merch/revenue-engine/business-fleet-scheduler/100-store-operations", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueHundredStoreOperationsQuerySchema.parse(request.query);
    const response = await buildRevenueHundredStoreOperationsForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/100-store-operations/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueHundredStoreOperationsSchema.parse(request.body);
    const response = await applyRevenueHundredStoreOperations(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/100-store-application-connections/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueHundredStoreAppConnectionPacketsSchema.parse(request.body);
    const response = await applyRevenueHundredStoreAppConnectionPackets(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/100-store-connector-activation/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueHundredStoreConnectorActivationSchema.parse(request.body);
    const response = await applyRevenueHundredStoreConnectorActivation(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/100-store-monitoring-cycle/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueHundredStoreMonitoringCycleSchema.parse(request.body);
    const response = await applyRevenueHundredStoreMonitoringCycle(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/100-store-product-depth/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueHundredStoreProductDepthSchema.parse(request.body);
    const response = await applyRevenueHundredStoreProductDepth(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/100-store-launch-packets/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueHundredStoreLaunchPacketsSchema.parse(request.body);
    const response = await applyRevenueHundredStoreLaunchPackets(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/100-store-autonomy-run/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueHundredStoreAutonomyRunSchema.parse(request.body);
    const response = await applyRevenueHundredStoreAutonomyRun(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/100-store-work-leases/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueHundredStoreWorkLeasesSchema.parse(request.body);
    const response = await applyRevenueHundredStoreWorkLeases(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/100-store-worker-assignments/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueHundredStoreWorkerAssignmentsSchema.parse(request.body);
    const response = await applyRevenueHundredStoreWorkerAssignments(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/100-store-daily-supervisor/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueHundredStoreDailySupervisorSchema.parse(request.body);
    const response = await applyRevenueHundredStoreDailySupervisor(currentUser.sub, input);

    return reply.send(response);
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

  app.get("/merch/revenue-engine/money-army/generate-score-batch", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueMoneyArmyGenerateScoreBatchQuerySchema.parse(request.query);
    const [response, recentRuns] = await Promise.all([
      buildRevenueMoneyArmyGenerateScoreBatchForUser(currentUser.sub, query),
      listRevenueMoneyArmyBatchRuns(currentUser.sub)
    ]);

    return reply.send({
      ...response,
      recentRuns
    });
  });

  app.get("/merch/revenue-engine/money-army/first-business-package", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueFirstBusinessLaunchPackageQuerySchema.parse(request.query);
    const [response, recentRuns] = await Promise.all([
      buildRevenueFirstBusinessLaunchPackageForUser(currentUser.sub, query),
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

  app.post("/merch/revenue-engine/money-army/generate-score-batch/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueMoneyArmyGenerateScoreBatchSchema.parse(request.body);
    const response = await applyRevenueMoneyArmyGenerateScoreBatch(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/money-army/first-business-package/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueFirstBusinessLaunchPackageSchema.parse(request.body);
    const response = await applyRevenueFirstBusinessLaunchPackage(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/money-army/first-business-package/approve-prepare", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueFirstStorePrepareSchema.parse(request.body);
    const response = await applyRevenueFirstStorePrepare(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/money-army/first-business/launch", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueFirstBusinessInternalLaunchSchema.parse(request.body);
    const response = await applyRevenueFirstBusinessInternalLaunch(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/money-army/first-business/execute", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueFirstBusinessExecuteSchema.parse(request.body);
    const response = await applyRevenueFirstBusinessExecute(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/money-army/first-business/autonomous-launch", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueFirstBusinessAutonomousLaunchSchema.parse(request.body);
    const response = await applyRevenueFirstBusinessAutonomousLaunch(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/money-army/first-business/live-executor", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueFirstBusinessLiveExecutorSchema.parse(request.body);
    const response = await applyRevenueFirstBusinessLiveExecutor(currentUser.sub, input);

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

  app.get("/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-execution-queue", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetLaunchExecutionQueueQuerySchema.parse(request.query);
    const response = await buildRevenueBusinessFleetLaunchExecutionQueueForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-execution-queue/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueBusinessFleetLaunchExecutionQueueSchema.parse(request.body);
    const response = await applyRevenueBusinessFleetLaunchExecutionQueue(currentUser.sub, input);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-worker-assignments", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetLaunchWorkerAssignmentsQuerySchema.parse(request.query);
    const response = await buildRevenueBusinessFleetLaunchWorkerAssignmentsForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-worker-assignments/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueBusinessFleetLaunchWorkerAssignmentsSchema.parse(request.body);
    const response = await applyRevenueBusinessFleetLaunchWorkerAssignments(currentUser.sub, input);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler/launch-gap/manual-launch-evidence", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetManualLaunchEvidenceQuerySchema.parse(request.query);
    const response = await buildRevenueBusinessFleetManualLaunchEvidenceForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-control", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetLaunchControlQuerySchema.parse(request.query);
    const response = await buildRevenueBusinessFleetLaunchControlForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler/launch-gap/swarm-readiness", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetSwarmReadinessQuerySchema.parse(request.query);
    const response = await buildRevenueBusinessFleetSwarmReadinessForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-outcome-signals", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetLaunchOutcomeSignalsQuerySchema.parse(request.query);
    const response = await buildRevenueBusinessFleetLaunchOutcomeSignalsForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-cash-cycle", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetLaunchCashCycleQuerySchema.parse(request.query);
    const response = await buildRevenueBusinessFleetLaunchCashCycleForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-cash-cycle/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueBusinessFleetLaunchCashCycleSchema.parse(request.body);
    const response = await applyRevenueBusinessFleetLaunchCashCycle(currentUser.sub, input);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-cash-cycle/commands", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetLaunchCashCycleCommandQueueQuerySchema.parse(request.query);
    const response = await buildRevenueBusinessFleetLaunchCashCycleCommandQueueForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler/income-sprint", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetIncomeSprintQuerySchema.parse(request.query);
    const response = await buildRevenueBusinessFleetIncomeSprintForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler/launch-night", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetLaunchNightQuerySchema.parse(request.query);
    const response = await buildRevenueBusinessFleetLaunchNightForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/launch-night/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueBusinessFleetLaunchNightCommandSchema.parse(request.body);
    const response = await applyRevenueBusinessFleetLaunchNightCommand(currentUser.sub, input);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler/launch-night/commands", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetLaunchNightCommandQueueQuerySchema.parse(request.query);
    const response = await buildRevenueBusinessFleetLaunchNightCommandQueueForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler/launch-night/execution-checklist", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetLaunchNightExecutionChecklistQuerySchema.parse(request.query);
    const response = await buildRevenueBusinessFleetLaunchNightExecutionChecklistForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler/launch-night/operator-console", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetLaunchNightOperatorConsoleQuerySchema.parse(request.query);
    const response = await buildRevenueBusinessFleetLaunchNightOperatorConsoleForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler/launch-night/supervisor", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetLaunchNightSupervisorQuerySchema.parse(request.query);
    const response = await buildRevenueBusinessFleetLaunchNightSupervisorForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler/launch-night/supervisor/actions", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetLaunchNightSupervisorActionsQuerySchema.parse(request.query);
    const response = await buildRevenueBusinessFleetLaunchNightSupervisorActionsForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/launch-night/supervisor/actions/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueBusinessFleetLaunchNightSupervisorActionSchema.parse(request.body);
    const response = await applyRevenueBusinessFleetLaunchNightSupervisorAction(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/launch-night/supervisor/actions/run-next", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueBusinessFleetLaunchNightSupervisorRunNextSchema.parse(request.body);
    const response = await runRevenueBusinessFleetLaunchNightSupervisorNextAction(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/launch-night/supervisor/actions/run-until-blocked/preview", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = revenueBusinessFleetLaunchNightSupervisorRunUntilBlockedPreviewSchema.parse(request.body);
    const response = await previewRevenueBusinessFleetLaunchNightSupervisorRunUntilBlocked(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/launch-night/commands/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueBusinessFleetLaunchNightCommandQueueSchema.parse(request.body);
    const response = await applyRevenueBusinessFleetLaunchNightCommandQueue(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/income-sprint/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueBusinessFleetIncomeSprintCommandSchema.parse(request.body);
    const response = await applyRevenueBusinessFleetIncomeSprintCommand(currentUser.sub, input);

    return reply.send(response);
  });

  app.get("/merch/revenue-engine/business-fleet-scheduler/income-sprint/commands", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = revenueBusinessFleetIncomeSprintCommandQueueQuerySchema.parse(request.query);
    const response = await buildRevenueBusinessFleetIncomeSprintCommandQueueForUser(currentUser.sub, query);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/income-sprint/commands/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueBusinessFleetIncomeSprintCommandQueueSchema.parse(request.body);
    const response = await applyRevenueBusinessFleetIncomeSprintCommandQueue(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-cash-cycle/commands/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueBusinessFleetLaunchCashCycleCommandQueueSchema.parse(request.body);
    const response = await applyRevenueBusinessFleetLaunchCashCycleCommandQueue(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/launch-gap/manual-launch-evidence/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueBusinessFleetManualLaunchEvidenceSchema.parse(request.body);
    const response = await applyRevenueBusinessFleetManualLaunchEvidence(currentUser.sub, input);

    return reply.send(response);
  });

  app.post("/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-outcome-signals/apply", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = applyRevenueBusinessFleetLaunchOutcomeSignalsSchema.parse(request.body);
    const response = await applyRevenueBusinessFleetLaunchOutcomeSignals(currentUser.sub, input);

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
