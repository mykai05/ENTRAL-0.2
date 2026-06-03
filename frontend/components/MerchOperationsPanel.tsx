"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calculator, CheckCircle2, ClipboardCheck, FileText, Gauge, Landmark, LineChart, Loader2, LockKeyhole, Megaphone, PackageCheck, PauseCircle, RefreshCcw, Rocket, ShieldAlert, XCircle } from "lucide-react";
import { apiFetch } from "../lib/api";
import { RevenueAutopilotPanel } from "./RevenueAutopilotPanel";
import { RevenueLaunchHandoffControlPanel } from "./RevenueLaunchHandoffControlPanel";
import { RevenueLaunchHandoffPanel } from "./RevenueLaunchHandoffPanel";
import { RevenueLaunchClosureLedgerPanel } from "./RevenueLaunchClosureLedgerPanel";
import { RevenueLiveConnectorReadinessPanel } from "./RevenueLiveConnectorReadinessPanel";
import { RevenueLiveConnectorDesignDossierPanel } from "./RevenueLiveConnectorDesignDossierPanel";
import { RevenueLaunchOperationsPackPanel } from "./RevenueLaunchOperationsPackPanel";
import { RevenueLaunchChecklistPanel } from "./RevenueLaunchChecklistPanel";
import { RevenueLaunchReadinessPanel } from "./RevenueLaunchReadinessPanel";
import { RevenueLaunchSprintPanel } from "./RevenueLaunchSprintPanel";
import { RevenueOpportunityControlPanel } from "./RevenueOpportunityControlPanel";
import { RevenueOpportunityFactoryPanel } from "./RevenueOpportunityFactoryPanel";
import { RevenueSignalConnectorPanel } from "./RevenueSignalConnectorPanel";
import { RevenueSignalConnectorApprovalPanel } from "./RevenueSignalConnectorApprovalPanel";
import { RevenueSignalImportHandoffPanel } from "./RevenueSignalImportHandoffPanel";
import { SignalIntakePanel } from "./SignalIntakePanel";
import {
  formatMerchCurrency,
  type DigitalProductApplyResponse,
  type DigitalProductPortfolioPlan,
  type DigitalProductPortfolioResponse,
  type FacelessContentPipelineApplyResponse,
  type FacelessContentPipelinePlan,
  type FacelessContentPipelineResponse,
  type FacelessContentPerformanceDigest,
  type FacelessContentPerformanceResponse,
  type FinancialOrchestratorApplyResponse,
  type FinancialOrchestratorPlan,
  type FinancialOrchestratorResponse,
  type FinancialPayoutReviewAction,
  type FinancialPayoutReviewApplyResponse,
  type FinancialPayoutReviewItem,
  type FinancialPayoutReviewPlan,
  type FinancialPayoutReviewResponse,
  type FinancialReleaseGovernanceApplyResponse,
  type FinancialReleaseGovernancePlan,
  type FinancialReleaseGovernanceResponse,
  type FinancialScalingBudgetPacketSnapshot,
  type FinancialScalingBudgetReviewAction,
  type FinancialScalingBudgetReviewApplyResponse,
  type FinancialScalingBudgetReviewPlan,
  type FinancialScalingBudgetReviewResponse,
  type FinancialScalingExecutionLedgerApplyResponse,
  type FinancialScalingExecutionLedgerPlan,
  type FinancialScalingExecutionLedgerResponse,
  type FinancialScalingExecutionOutcome,
  type FinancialScalingExecutionSource,
  type FinancialPersistedScalingSpendPacketSnapshot,
  type FinancialScalingSpendControlApplyResponse,
  type FinancialScalingSpendControlPlan,
  type FinancialScalingSpendControlResponse,
  type GrowthApprovalListResponse,
  type GrowthApprovalRecord,
  type GrowthApprovalResponse,
  type GrowthApprovalReviewResponse,
  type GrowthOrchestrationPreviewResponse,
  type GrowthPlan,
  merchAutomationLevels,
  merchReportTypes,
  pricingPlatformPresets,
  type RevenueAssetActionApplyResponse,
  type RevenueAssetBatchActionApplyResponse,
  type RevenueAssetControlLedgerPlan,
  type RevenueAssetControlLedgerQuery,
  type RevenueAssetControlLedgerResponse,
  type RevenueAssetControlRecoveryPlan,
  type RevenueAssetControlRecoveryResponse,
  type RevenueAssetPortfolio,
  type RevenueAssetReviewQueuePlan,
  type RevenueAssetReviewQueueItem,
  type RevenueAssetReviewQueueQuery,
  type RevenueAssetReviewQueueResponse,
  type RevenueAssetRotationDecision,
  type RevenueBusinessFleetLaunchGapAccelerationResponse,
  type RevenueBusinessFleetLaunchGateResponse,
  type RevenueBusinessFleetProviderApprovalReviewApplyResponse,
  type RevenueBusinessFleetProviderApprovalReviewPlan,
  type RevenueBusinessFleetProviderApprovalReviewResponse,
  type RevenueBusinessFleetLiveLaunchPackageResponse,
  type RevenueBusinessFleetLaunchGapPlan,
  type RevenueBusinessFleetLaunchGapResponse,
  type RevenueBusinessFleetLaunchGapSeedApplyResponse,
  type RevenueBusinessFleetLaunchWaveApplyResponse,
  type RevenueBusinessFleetLaunchWavePlan,
  type RevenueBusinessFleetPlan,
  type RevenueBusinessFleetSchedulerResponse,
  type RevenueMoneyArmyBatchPipelineApplyResponse,
  type RevenueMoneyArmyFirstBusinessLaunchPackage,
  type RevenueMoneyArmyFirstBusinessLaunchPackageApplyResponse,
  type RevenueMoneyArmyFirstBusinessLaunchPackageResponse,
  type RevenueMoneyArmyGenerateScoreBatchApplyResponse,
  type RevenueMoneyArmyGenerateScoreBatchPlan,
  type RevenueMoneyArmyGenerateScoreBatchResponse,
  type RevenueMoneyArmyBatchPipelinePlan,
  type RevenueMoneyArmyBatchPipelineResponse,
  type RevenueMoneyArmyBatchRun,
  type RevenueEnginePortfolioResponse,
  type RevenueFirstCashReadinessPlan,
  type RevenueFirstCashReadinessResponse,
  type RevenueFirstBusinessLaunchApplyResponse,
  type RevenueFirstBusinessLaunchPlan,
  type RevenueFirstBusinessLaunchResponse,
  type RevenueFirstCashSprintApplyResponse,
  type RevenueFirstCashSprintPlan,
  type RevenueFirstCashSprintResponse,
  type RevenuePortfolioDashboardNextAction,
  type RevenuePortfolioDashboardPlan,
  type RevenuePortfolioDashboardResponse,
  type RevenueLaunchPipelineApplyResponse,
  type RevenueLaunchPipelinePlan,
  type RevenueLaunchPipelineResponse,
  type RevenueListingOptimizationApplyResponse,
  type RevenueListingOptimizationPlan,
  type RevenueListingOptimizationResponse,
  type RevenueRotationApplyResponse,
  type ClientMerchStore,
  type EntralMerchReport,
  type LaunchPackage,
  type MerchAutomationLevel,
  type MerchReportType,
  type PricingCalculatorInput,
  type PricingCalculatorResponse,
  type PricingPlatformPreset,
  type PortfolioCommandCenterApplyResponse,
  type PortfolioCommandCenterPlan,
  type PortfolioCommandCenterResponse,
  type ProviderHandoffResponse,
  type ProviderPayloadApprovalResponse,
  type ProviderPayloadPackage,
  type ProviderPayloadPackageResponse,
  type RevenuePerformanceDigest,
  type RevenuePerformanceIngestResponse,
  type RevenuePerformanceResponse,
  type RevenuePerformanceRotationApplyResponse,
  type RevenuePerformanceSnapshotInput,
  type RevenueStoreSetupApplyResponse,
  type RevenueStoreSetupPlan,
  type RevenueStoreSetupResponse
} from "../lib/merch-store";

type MerchOperationsPanelProps = {
  isLoadingStores: boolean;
  onEvent?: (message: string) => void;
  onRefreshStores: () => void;
  stores: ClientMerchStore[];
};

const automationStorageKey = "entral-merch-automation-level";
const revenueAssetControlActions: RevenueAssetRotationDecision[] = ["scale", "watch", "pause", "kill"];

function readMerchStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeMerchStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Merch automation level persistence is best-effort.
  }
}

const presetDefaults: Record<PricingPlatformPreset, Pick<PricingCalculatorInput, "listingFee" | "paymentProcessingEstimate" | "platformFeePercent">> = {
  Etsy: {
    listingFee: 0.2,
    paymentProcessingEstimate: 3.25,
    platformFeePercent: 6.5
  },
  Manual: {
    listingFee: 0,
    paymentProcessingEstimate: 0,
    platformFeePercent: 0
  },
  Shopify: {
    listingFee: 0,
    paymentProcessingEstimate: 2.9,
    platformFeePercent: 0
  }
};

function readAutomationLevel(): MerchAutomationLevel {
  if (typeof window === "undefined") {
    return "assisted";
  }

  const stored = readMerchStorage(automationStorageKey);
  return merchAutomationLevels.some((level) => level.value === stored) ? stored as MerchAutomationLevel : "assisted";
}

function defaultPricingForm(preset: PricingPlatformPreset = "Etsy"): PricingCalculatorInput {
  return {
    adSpendEstimate: 0,
    preset,
    retailPrice: 29,
    shippingCost: 4.95,
    supplierCost: 9.8,
    ...presetDefaults[preset]
  };
}

type PerformanceSnapshotForm = {
  adSpend: number;
  grossRevenue: number;
  netProfit: number;
  unitsSold: number;
  visits: number;
};

type ScalingOutcomeForm = {
  amountSpent: number;
  grossRevenue: number;
  netProfit: number;
  notes: string;
  outcome: FinancialScalingExecutionOutcome;
  scalingSpendPacketId: string;
  source: FinancialScalingExecutionSource;
  unitsSold: number;
  visits: number;
};

const financialScalingExecutionOutcomeOptions: FinancialScalingExecutionOutcome[] = ["validated", "watch", "stopped", "scale_next"];
const financialScalingExecutionSourceOptions: FinancialScalingExecutionSource[] = ["manual", "signal_intake", "operator_reconciliation", "other"];

function defaultPerformanceSnapshotForm(): PerformanceSnapshotForm {
  return {
    adSpend: 12,
    grossRevenue: 180,
    netProfit: 92,
    unitsSold: 6,
    visits: 210
  };
}

function defaultScalingOutcomeForm(): ScalingOutcomeForm {
  return {
    amountSpent: 21,
    grossRevenue: 84,
    netProfit: 50.4,
    notes: "Manual operator outcome evidence. No external action executed.",
    outcome: "validated",
    scalingSpendPacketId: "",
    source: "manual",
    unitsSold: 3,
    visits: 120
  };
}

function revenueAssetKey(asset: Pick<RevenueAssetPortfolio["assets"][number], "assetId" | "assetType">) {
  return `${asset.assetType}:${asset.assetId}`;
}

function revenueAssetReviewQueueKey(item: Pick<RevenueAssetReviewQueueItem, "assetId" | "assetType" | "currentRecommendation">) {
  return `${item.assetType}:${item.assetId}:${item.currentRecommendation}`;
}

export function MerchOperationsPanel({ isLoadingStores, onEvent, onRefreshStores, stores }: MerchOperationsPanelProps) {
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [automationLevel, setAutomationLevel] = useState<MerchAutomationLevel>(() => readAutomationLevel());
  const [pricingForm, setPricingForm] = useState<PricingCalculatorInput>(() => defaultPricingForm());
  const [pricing, setPricing] = useState<PricingCalculatorResponse | null>(null);
  const [isCalculatingPricing, setIsCalculatingPricing] = useState(false);
  const [launchPackage, setLaunchPackage] = useState<LaunchPackage | null>(null);
  const [providerPayloadPackage, setProviderPayloadPackage] = useState<ProviderPayloadPackage | null>(null);
  const [providerPayloadApprovalResponse, setProviderPayloadApprovalResponse] = useState<ProviderPayloadApprovalResponse | null>(null);
  const [providerHandoffResponse, setProviderHandoffResponse] = useState<ProviderHandoffResponse | null>(null);
  const [growthPlan, setGrowthPlan] = useState<GrowthPlan | null>(null);
  const [growthApprovalResponse, setGrowthApprovalResponse] = useState<GrowthApprovalResponse | null>(null);
  const [growthApprovals, setGrowthApprovals] = useState<GrowthApprovalRecord[]>([]);
  const [growthApprovalSchedule, setGrowthApprovalSchedule] = useState("");
  const [reportType, setReportType] = useState<MerchReportType>("Store Launch Report");
  const [report, setReport] = useState<EntralMerchReport | null>(null);
  const [isGeneratingLaunchPackage, setIsGeneratingLaunchPackage] = useState(false);
  const [isGeneratingProviderPayloads, setIsGeneratingProviderPayloads] = useState(false);
  const [isRequestingProviderPayloadApproval, setIsRequestingProviderPayloadApproval] = useState(false);
  const [buildingProviderHandoffId, setBuildingProviderHandoffId] = useState<string | null>(null);
  const [isGeneratingGrowthPlan, setIsGeneratingGrowthPlan] = useState(false);
  const [isRequestingGrowthApproval, setIsRequestingGrowthApproval] = useState(false);
  const [isLoadingGrowthApprovals, setIsLoadingGrowthApprovals] = useState(false);
  const [reviewingGrowthApprovalId, setReviewingGrowthApprovalId] = useState<string | null>(null);
  const [growthApprovalMessage, setGrowthApprovalMessage] = useState<string | null>(null);
  const [growthOrchestrationPreview, setGrowthOrchestrationPreview] = useState<GrowthOrchestrationPreviewResponse | null>(null);
  const [previewingGrowthApprovalId, setPreviewingGrowthApprovalId] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [businessFleetPlan, setBusinessFleetPlan] = useState<RevenueBusinessFleetPlan | null>(null);
  const [businessFleetGapPlan, setBusinessFleetGapPlan] = useState<RevenueBusinessFleetLaunchGapPlan | null>(null);
  const [businessFleetGapSeedReceipt, setBusinessFleetGapSeedReceipt] = useState<RevenueBusinessFleetLaunchGapSeedApplyResponse["applied"] | null>(null);
  const [businessFleetGapSeedResults, setBusinessFleetGapSeedResults] = useState<RevenueBusinessFleetLaunchGapSeedApplyResponse["results"]>([]);
  const [businessFleetGapAccelerationReceipt, setBusinessFleetGapAccelerationReceipt] = useState<RevenueBusinessFleetLaunchGapAccelerationResponse["applied"] | null>(null);
  const [businessFleetLiveLaunchPackageReceipt, setBusinessFleetLiveLaunchPackageReceipt] = useState<RevenueBusinessFleetLiveLaunchPackageResponse["applied"] | null>(null);
  const [businessFleetLiveLaunchPackage, setBusinessFleetLiveLaunchPackage] = useState<RevenueBusinessFleetLiveLaunchPackageResponse | null>(null);
  const [businessFleetLaunchGate, setBusinessFleetLaunchGate] = useState<RevenueBusinessFleetLaunchGateResponse["plan"] | null>(null);
  const [businessFleetProviderApprovalReview, setBusinessFleetProviderApprovalReview] = useState<RevenueBusinessFleetProviderApprovalReviewPlan | null>(null);
  const [businessFleetProviderApprovalReceipt, setBusinessFleetProviderApprovalReceipt] = useState<RevenueBusinessFleetProviderApprovalReviewApplyResponse["applied"] | null>(null);
  const [businessFleetWaveSelection, setBusinessFleetWaveSelection] = useState<RevenueBusinessFleetLaunchWavePlan | null>(null);
  const [businessFleetWaveReceipt, setBusinessFleetWaveReceipt] = useState<RevenueBusinessFleetLaunchWaveApplyResponse["dispatched"] | null>(null);
  const [moneyArmyPipeline, setMoneyArmyPipeline] = useState<RevenueMoneyArmyBatchPipelinePlan | null>(null);
  const [moneyArmyPipelineReceipt, setMoneyArmyPipelineReceipt] = useState<RevenueMoneyArmyBatchPipelineApplyResponse["applied"] | null>(null);
  const [moneyArmyGenerateScoreBatch, setMoneyArmyGenerateScoreBatch] = useState<RevenueMoneyArmyGenerateScoreBatchPlan | null>(null);
  const [moneyArmyGenerateScoreBatchReceipt, setMoneyArmyGenerateScoreBatchReceipt] = useState<RevenueMoneyArmyGenerateScoreBatchApplyResponse["applied"] | null>(null);
  const [firstBusinessPackage, setFirstBusinessPackage] = useState<RevenueMoneyArmyFirstBusinessLaunchPackage | null>(null);
  const [firstBusinessPackageReceipt, setFirstBusinessPackageReceipt] = useState<RevenueMoneyArmyFirstBusinessLaunchPackageApplyResponse["applied"] | null>(null);
  const [moneyArmyBatchRuns, setMoneyArmyBatchRuns] = useState<RevenueMoneyArmyBatchRun[]>([]);
  const [isLoadingBusinessFleet, setIsLoadingBusinessFleet] = useState(false);
  const [isLoadingBusinessFleetGap, setIsLoadingBusinessFleetGap] = useState(false);
  const [isLoadingMoneyArmyPipeline, setIsLoadingMoneyArmyPipeline] = useState(false);
  const [isPreviewingMoneyArmyPipeline, setIsPreviewingMoneyArmyPipeline] = useState(false);
  const [isRunningMoneyArmyPipeline, setIsRunningMoneyArmyPipeline] = useState(false);
  const [isGeneratingMoneyArmyScoreBatch, setIsGeneratingMoneyArmyScoreBatch] = useState(false);
  const [isRecordingMoneyArmyScoreBatch, setIsRecordingMoneyArmyScoreBatch] = useState(false);
  const [isGeneratingFirstBusinessPackage, setIsGeneratingFirstBusinessPackage] = useState(false);
  const [isRecordingFirstBusinessPackage, setIsRecordingFirstBusinessPackage] = useState(false);
  const [isPreviewingBusinessFleetGapSeeds, setIsPreviewingBusinessFleetGapSeeds] = useState(false);
  const [isCreatingBusinessFleetGapSeeds, setIsCreatingBusinessFleetGapSeeds] = useState(false);
  const [isPreviewingBusinessFleetGapAcceleration, setIsPreviewingBusinessFleetGapAcceleration] = useState(false);
  const [isRunningBusinessFleetGapAcceleration, setIsRunningBusinessFleetGapAcceleration] = useState(false);
  const [isPreviewingBusinessFleetLiveLaunchPackage, setIsPreviewingBusinessFleetLiveLaunchPackage] = useState(false);
  const [isRecordingBusinessFleetLiveLaunchPackage, setIsRecordingBusinessFleetLiveLaunchPackage] = useState(false);
  const [isLoadingBusinessFleetLaunchGate, setIsLoadingBusinessFleetLaunchGate] = useState(false);
  const [isLoadingBusinessFleetProviderApprovalReview, setIsLoadingBusinessFleetProviderApprovalReview] = useState(false);
  const [isPreviewingBusinessFleetProviderApprovalReview, setIsPreviewingBusinessFleetProviderApprovalReview] = useState(false);
  const [isApplyingBusinessFleetProviderApprovalReview, setIsApplyingBusinessFleetProviderApprovalReview] = useState(false);
  const [isPreviewingBusinessFleetWave, setIsPreviewingBusinessFleetWave] = useState(false);
  const [isRunningBusinessFleetWave, setIsRunningBusinessFleetWave] = useState(false);
  const [businessFleetMessage, setBusinessFleetMessage] = useState<string | null>(null);
  const [revenuePlan, setRevenuePlan] = useState<RevenueAssetPortfolio | null>(null);
  const [revenueDashboard, setRevenueDashboard] = useState<RevenuePortfolioDashboardPlan | null>(null);
  const [isLoadingRevenueDashboard, setIsLoadingRevenueDashboard] = useState(false);
  const [firstCashReadiness, setFirstCashReadiness] = useState<RevenueFirstCashReadinessPlan | null>(null);
  const [isLoadingFirstCashReadiness, setIsLoadingFirstCashReadiness] = useState(false);
  const [firstCashSprint, setFirstCashSprint] = useState<RevenueFirstCashSprintPlan | null>(null);
  const [firstCashSprintReceipt, setFirstCashSprintReceipt] = useState<RevenueFirstCashSprintApplyResponse["dispatched"] | null>(null);
  const [isLoadingFirstCashSprint, setIsLoadingFirstCashSprint] = useState(false);
  const [isPreviewingFirstCashSprint, setIsPreviewingFirstCashSprint] = useState(false);
  const [isRunningFirstCashSprint, setIsRunningFirstCashSprint] = useState(false);
  const [firstCashSprintMessage, setFirstCashSprintMessage] = useState<string | null>(null);
  const [firstBusinessLaunch, setFirstBusinessLaunch] = useState<RevenueFirstBusinessLaunchPlan | null>(null);
  const [firstBusinessLaunchReceipt, setFirstBusinessLaunchReceipt] = useState<RevenueFirstBusinessLaunchApplyResponse["dispatched"] | null>(null);
  const [isLoadingFirstBusinessLaunch, setIsLoadingFirstBusinessLaunch] = useState(false);
  const [isPreviewingFirstBusinessLaunch, setIsPreviewingFirstBusinessLaunch] = useState(false);
  const [isRunningFirstBusinessLaunch, setIsRunningFirstBusinessLaunch] = useState(false);
  const [firstBusinessLaunchMessage, setFirstBusinessLaunchMessage] = useState<string | null>(null);
  const [isLoadingRevenuePlan, setIsLoadingRevenuePlan] = useState(false);
  const [isDryRunningRotation, setIsDryRunningRotation] = useState(false);
  const [isApplyingRotation, setIsApplyingRotation] = useState(false);
  const [assetActionBusyKey, setAssetActionBusyKey] = useState<string | null>(null);
  const [assetControlPreview, setAssetControlPreview] = useState<RevenueAssetActionApplyResponse["control"] | null>(null);
  const [assetBatchControlPreview, setAssetBatchControlPreview] = useState<RevenueAssetBatchActionApplyResponse["batch"] | null>(null);
  const [selectedAssetKeys, setSelectedAssetKeys] = useState<string[]>([]);
  const [isPreviewingAssetBatch, setIsPreviewingAssetBatch] = useState(false);
  const [isApplyingAssetBatch, setIsApplyingAssetBatch] = useState(false);
  const [assetControlLedger, setAssetControlLedger] = useState<RevenueAssetControlLedgerPlan | null>(null);
  const [assetControlRecovery, setAssetControlRecovery] = useState<RevenueAssetControlRecoveryPlan | null>(null);
  const [assetReviewQueue, setAssetReviewQueue] = useState<RevenueAssetReviewQueuePlan | null>(null);
  const [assetReviewQueueBusyKey, setAssetReviewQueueBusyKey] = useState<string | null>(null);
  const [selectedReviewQueueKeys, setSelectedReviewQueueKeys] = useState<string[]>([]);
  const [isApplyingReviewQueueBatch, setIsApplyingReviewQueueBatch] = useState(false);
  const [assetControlLedgerQuery, setAssetControlLedgerQuery] = useState<RevenueAssetControlLedgerQuery>({
    action: "",
    assetId: "",
    assetType: "",
    fromDate: "",
    includeOverridesOnly: false,
    limit: 25,
    storeId: "",
    toDate: ""
  });
  const [assetReviewQueueQuery, setAssetReviewQueueQuery] = useState<RevenueAssetReviewQueueQuery>({
    includeWatch: false,
    maxItems: 12,
    staleAfterDays: 14
  });
  const [isLoadingAssetControlLedger, setIsLoadingAssetControlLedger] = useState(false);
  const [isLoadingAssetControlRecovery, setIsLoadingAssetControlRecovery] = useState(false);
  const [isLoadingAssetReviewQueue, setIsLoadingAssetReviewQueue] = useState(false);
  const [revenueRotationMessage, setRevenueRotationMessage] = useState<string | null>(null);
  const [listingOptimizationPlan, setListingOptimizationPlan] = useState<RevenueListingOptimizationPlan | null>(null);
  const [isLoadingListingOptimization, setIsLoadingListingOptimization] = useState(false);
  const [isDryRunningListingOptimization, setIsDryRunningListingOptimization] = useState(false);
  const [isApplyingListingOptimization, setIsApplyingListingOptimization] = useState(false);
  const [listingOptimizationMessage, setListingOptimizationMessage] = useState<string | null>(null);
  const [storeSetupPlan, setStoreSetupPlan] = useState<RevenueStoreSetupPlan | null>(null);
  const [isLoadingStoreSetup, setIsLoadingStoreSetup] = useState(false);
  const [isDryRunningStoreSetup, setIsDryRunningStoreSetup] = useState(false);
  const [isApplyingStoreSetup, setIsApplyingStoreSetup] = useState(false);
  const [storeSetupMessage, setStoreSetupMessage] = useState<string | null>(null);
  const [launchPipelinePlan, setLaunchPipelinePlan] = useState<RevenueLaunchPipelinePlan | null>(null);
  const [isLoadingLaunchPipeline, setIsLoadingLaunchPipeline] = useState(false);
  const [isDryRunningLaunchPipeline, setIsDryRunningLaunchPipeline] = useState(false);
  const [isApplyingLaunchPipeline, setIsApplyingLaunchPipeline] = useState(false);
  const [launchPipelineMessage, setLaunchPipelineMessage] = useState<string | null>(null);
  const [digitalProductPlan, setDigitalProductPlan] = useState<DigitalProductPortfolioPlan | null>(null);
  const [isLoadingDigitalProducts, setIsLoadingDigitalProducts] = useState(false);
  const [isDryRunningDigitalProducts, setIsDryRunningDigitalProducts] = useState(false);
  const [isApplyingDigitalProducts, setIsApplyingDigitalProducts] = useState(false);
  const [digitalProductMessage, setDigitalProductMessage] = useState<string | null>(null);
  const [facelessContentPlan, setFacelessContentPlan] = useState<FacelessContentPipelinePlan | null>(null);
  const [facelessContentDigest, setFacelessContentDigest] = useState<FacelessContentPerformanceDigest | null>(null);
  const [isLoadingFacelessContent, setIsLoadingFacelessContent] = useState(false);
  const [isDryRunningFacelessContent, setIsDryRunningFacelessContent] = useState(false);
  const [isApplyingFacelessContent, setIsApplyingFacelessContent] = useState(false);
  const [isLoadingFacelessPerformance, setIsLoadingFacelessPerformance] = useState(false);
  const [facelessContentMessage, setFacelessContentMessage] = useState<string | null>(null);
  const [performanceDigest, setPerformanceDigest] = useState<RevenuePerformanceDigest | null>(null);
  const [performanceForm, setPerformanceForm] = useState<PerformanceSnapshotForm>(() => defaultPerformanceSnapshotForm());
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(false);
  const [isIngestingPerformance, setIsIngestingPerformance] = useState(false);
  const [isDryRunningPerformanceRotation, setIsDryRunningPerformanceRotation] = useState(false);
  const [isApplyingPerformanceRotation, setIsApplyingPerformanceRotation] = useState(false);
  const [performanceMessage, setPerformanceMessage] = useState<string | null>(null);
  const [financialPlan, setFinancialPlan] = useState<FinancialOrchestratorPlan | null>(null);
  const [isLoadingFinancialPlan, setIsLoadingFinancialPlan] = useState(false);
  const [isDryRunningFinancialApply, setIsDryRunningFinancialApply] = useState(false);
  const [isApplyingFinancialPlan, setIsApplyingFinancialPlan] = useState(false);
  const [financialMessage, setFinancialMessage] = useState<string | null>(null);
  const [financialReviewPlan, setFinancialReviewPlan] = useState<FinancialPayoutReviewPlan | null>(null);
  const [isLoadingFinancialReview, setIsLoadingFinancialReview] = useState(false);
  const [reviewingFinancialIntentId, setReviewingFinancialIntentId] = useState<string | null>(null);
  const [financialReviewMessage, setFinancialReviewMessage] = useState<string | null>(null);
  const [financialScalingBudgetReviewPlan, setFinancialScalingBudgetReviewPlan] = useState<FinancialScalingBudgetReviewPlan | null>(null);
  const [isLoadingFinancialScalingBudgetReview, setIsLoadingFinancialScalingBudgetReview] = useState(false);
  const [reviewingFinancialScalingBudgetId, setReviewingFinancialScalingBudgetId] = useState<string | null>(null);
  const [financialScalingBudgetReviewMessage, setFinancialScalingBudgetReviewMessage] = useState<string | null>(null);
  const [financialScalingSpendControlPlan, setFinancialScalingSpendControlPlan] = useState<FinancialScalingSpendControlPlan | null>(null);
  const [isLoadingFinancialScalingSpendControl, setIsLoadingFinancialScalingSpendControl] = useState(false);
  const [isDryRunningFinancialScalingSpendControl, setIsDryRunningFinancialScalingSpendControl] = useState(false);
  const [isApplyingFinancialScalingSpendControl, setIsApplyingFinancialScalingSpendControl] = useState(false);
  const [financialScalingSpendControlMessage, setFinancialScalingSpendControlMessage] = useState<string | null>(null);
  const [financialScalingExecutionLedgerPlan, setFinancialScalingExecutionLedgerPlan] = useState<FinancialScalingExecutionLedgerPlan | null>(null);
  const [isLoadingFinancialScalingExecutionLedger, setIsLoadingFinancialScalingExecutionLedger] = useState(false);
  const [isDryRunningFinancialScalingExecutionLedger, setIsDryRunningFinancialScalingExecutionLedger] = useState(false);
  const [isApplyingFinancialScalingExecutionLedger, setIsApplyingFinancialScalingExecutionLedger] = useState(false);
  const [financialScalingExecutionLedgerMessage, setFinancialScalingExecutionLedgerMessage] = useState<string | null>(null);
  const [scalingOutcomeForm, setScalingOutcomeForm] = useState<ScalingOutcomeForm>(() => defaultScalingOutcomeForm());
  const [financialGovernancePlan, setFinancialGovernancePlan] = useState<FinancialReleaseGovernancePlan | null>(null);
  const [isLoadingFinancialGovernance, setIsLoadingFinancialGovernance] = useState(false);
  const [isDryRunningFinancialGovernance, setIsDryRunningFinancialGovernance] = useState(false);
  const [isApplyingFinancialGovernance, setIsApplyingFinancialGovernance] = useState(false);
  const [financialGovernanceMessage, setFinancialGovernanceMessage] = useState<string | null>(null);
  const [portfolioCommandPlan, setPortfolioCommandPlan] = useState<PortfolioCommandCenterPlan | null>(null);
  const [isLoadingPortfolioCommand, setIsLoadingPortfolioCommand] = useState(false);
  const [isDryRunningPortfolioCommand, setIsDryRunningPortfolioCommand] = useState(false);
  const [isApplyingPortfolioCommand, setIsApplyingPortfolioCommand] = useState(false);
  const [portfolioCommandBatchReview, setPortfolioCommandBatchReview] = useState<PortfolioCommandCenterApplyResponse["applied"]["assetControlBatchReview"]>(null);
  const [portfolioCommandMessage, setPortfolioCommandMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId) ?? stores[0] ?? null,
    [selectedStoreId, stores]
  );
  const selectedRevenueAssets = useMemo(() => {
    if (!revenuePlan) return [];

    const selected = new Set(selectedAssetKeys);
    return revenuePlan.assets.filter((asset) => selected.has(revenueAssetKey(asset)));
  }, [revenuePlan, selectedAssetKeys]);
  const selectedBatchActions = useMemo(() => selectedRevenueAssets.map((asset) => ({
    action: asset.recommendation,
    assetId: asset.assetId,
    assetType: asset.assetType
  })), [selectedRevenueAssets]);
  const selectedReviewQueueItems = useMemo(() => {
    if (!assetReviewQueue) return [];

    const selected = new Set(selectedReviewQueueKeys);
    return assetReviewQueue.queue.filter((item) => selected.has(revenueAssetReviewQueueKey(item)));
  }, [assetReviewQueue, selectedReviewQueueKeys]);
  const selectedReviewQueueActions = useMemo(() => selectedReviewQueueItems.map((item) => ({
    action: item.currentRecommendation,
    assetId: item.assetId,
    assetType: item.assetType
  })), [selectedReviewQueueItems]);
  const selectedAutomationLevel = merchAutomationLevels.find((level) => level.value === automationLevel) ?? merchAutomationLevels[1];
  const availableScalingOutcomePackets = useMemo(() => {
    const packetsById = new Map<string, FinancialPersistedScalingSpendPacketSnapshot>();

    for (const packet of financialScalingSpendControlPlan?.persisted.packets ?? []) {
      packetsById.set(packet.recordId, packet);
    }

    for (const packet of financialScalingExecutionLedgerPlan?.spendControlPlan.persisted.packets ?? []) {
      if (!packetsById.has(packet.recordId)) {
        packetsById.set(packet.recordId, packet);
      }
    }

    return Array.from(packetsById.values());
  }, [financialScalingExecutionLedgerPlan, financialScalingSpendControlPlan]);
  const selectedScalingOutcomePacket = useMemo(
    () => availableScalingOutcomePackets.find((packet) => packet.recordId === scalingOutcomeForm.scalingSpendPacketId) ?? availableScalingOutcomePackets[0] ?? null,
    [availableScalingOutcomePackets, scalingOutcomeForm.scalingSpendPacketId]
  );

  useEffect(() => {
    if (!selectedStoreId && stores[0]) {
      setSelectedStoreId(stores[0].id);
    }
  }, [selectedStoreId, stores]);

  useEffect(() => {
    setScalingOutcomeForm((current) => {
      if (current.scalingSpendPacketId && availableScalingOutcomePackets.some((packet) => packet.recordId === current.scalingSpendPacketId)) {
        return current;
      }

      return {
        ...current,
        scalingSpendPacketId: availableScalingOutcomePackets[0]?.recordId ?? ""
      };
    });
  }, [availableScalingOutcomePackets]);

  useEffect(() => {
    if (!revenuePlan) {
      setSelectedAssetKeys([]);
      return;
    }

    const available = new Set(revenuePlan.assets.map(revenueAssetKey));
    setSelectedAssetKeys((current) => current.filter((key) => available.has(key)));
  }, [revenuePlan]);

  useEffect(() => {
    if (!assetReviewQueue) {
      setSelectedReviewQueueKeys([]);
      return;
    }

    const available = new Set(assetReviewQueue.queue.map(revenueAssetReviewQueueKey));
    setSelectedReviewQueueKeys((current) => current.filter((key) => available.has(key)));
  }, [assetReviewQueue]);

  function updateAutomationLevel(nextLevel: MerchAutomationLevel) {
    setAutomationLevel(nextLevel);
    if (typeof window !== "undefined") {
      writeMerchStorage(automationStorageKey, nextLevel);
    }
    onEvent?.(`Merch automation level set to ${merchAutomationLevels.find((level) => level.value === nextLevel)?.label ?? nextLevel}.`);
  }

  function updatePricingForm<K extends keyof PricingCalculatorInput>(key: K, value: PricingCalculatorInput[K]) {
    setPricingForm((current) => {
      if (key === "preset") {
        const nextPreset = value as PricingPlatformPreset;
        return {
          ...current,
          preset: nextPreset,
          ...presetDefaults[nextPreset]
        };
      }

      return { ...current, [key]: value };
    });
  }

  async function calculatePricing() {
    setIsCalculatingPricing(true);
    setError(null);

    try {
      const response = await apiFetch<PricingCalculatorResponse>("/merch/pricing/calculate", {
        json: pricingForm,
        method: "POST"
      });
      setPricing(response);
      onEvent?.("Pricing calculator updated profit, margin, break-even, and recommended retail price.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Pricing calculation failed.");
    } finally {
      setIsCalculatingPricing(false);
    }
  }

  async function generateLaunchPackage() {
    if (!selectedStore) {
      setError("Select a Client Merch Store before generating a launch package.");
      return;
    }

    setIsGeneratingLaunchPackage(true);
    setError(null);

    try {
      const response = await apiFetch<{ package: LaunchPackage }>(`/merch/stores/${selectedStore.id}/launch-package`);
      setLaunchPackage(response.package);
      onEvent?.(`Launch package generated for ${selectedStore.businessName}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Launch package generation failed.");
    } finally {
      setIsGeneratingLaunchPackage(false);
    }
  }

  async function generateProviderPayloads() {
    if (!selectedStore) {
      setError("Select a Client Merch Store before building provider payloads.");
      return;
    }

    setIsGeneratingProviderPayloads(true);
    setError(null);

    try {
      const response = await apiFetch<ProviderPayloadPackageResponse>(`/merch/stores/${selectedStore.id}/provider-payloads`);
      setProviderPayloadPackage(response.package);
      setProviderPayloadApprovalResponse(null);
      setProviderHandoffResponse(null);
      onEvent?.(`Locked provider payload package generated for ${selectedStore.businessName}. No provider was contacted.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Provider payload package generation failed.");
    } finally {
      setIsGeneratingProviderPayloads(false);
    }
  }

  async function requestProviderPayloadApproval() {
    if (!selectedStore || !providerPayloadPackage) {
      setError("Build provider payloads before queuing provider approval.");
      return;
    }

    setIsRequestingProviderPayloadApproval(true);
    setError(null);

    try {
      const response = await apiFetch<ProviderPayloadApprovalResponse>(`/merch/stores/${selectedStore.id}/provider-payloads/approval-request`, {
        json: {
          includeUnapproved: providerPayloadPackage.options.includeUnapproved,
          maxProducts: providerPayloadPackage.options.maxProducts,
          note: "Queued from locked provider payload package for human review."
        },
        method: "POST"
      });
      setProviderPayloadApprovalResponse(response);
      setProviderHandoffResponse(null);
      upsertGrowthApproval(response.approval);
      setGrowthApprovalMessage("Provider payload approval packet queued. Provider execution remains locked.");
      onEvent?.(`Provider payload approval packet queued for ${selectedStore.businessName}. No provider was contacted.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Provider payload approval packet could not be queued.");
    } finally {
      setIsRequestingProviderPayloadApproval(false);
    }
  }

  async function generateReport() {
    if (!selectedStore) {
      setError("Select a Client Merch Store before generating a report.");
      return;
    }

    setIsGeneratingReport(true);
    setError(null);

    try {
      const response = await apiFetch<{ report: EntralMerchReport }>(`/merch/stores/${selectedStore.id}/reports/${encodeURIComponent(reportType)}`);
      setReport(response.report);
      onEvent?.(`${reportType} generated for ${selectedStore.businessName}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Report generation failed.");
    } finally {
      setIsGeneratingReport(false);
    }
  }

  async function generateGrowthPlan() {
    if (!selectedStore) {
      setError("Select a Client Merch Store before generating a growth plan.");
      return;
    }

    setIsGeneratingGrowthPlan(true);
    setError(null);

    try {
      const response = await apiFetch<{ plan: GrowthPlan }>(`/merch/stores/${selectedStore.id}/growth-plan`);
      setGrowthPlan(response.plan);
      setGrowthApprovalResponse(null);
      setGrowthOrchestrationPreview(null);
      onEvent?.(`Mock growth plan generated for ${selectedStore.businessName}. No external systems were contacted.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Growth plan generation failed.");
    } finally {
      setIsGeneratingGrowthPlan(false);
    }
  }

  function upsertGrowthApproval(approval: GrowthApprovalRecord) {
    setGrowthApprovals((current) => {
      const withoutExisting = current.filter((item) => item.id !== approval.id);
      return [approval, ...withoutExisting].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }

  async function loadRevenuePortfolioDashboard(options: { silent?: boolean } = {}) {
    setIsLoadingRevenueDashboard(true);
    setError(null);

    try {
      const response = await apiFetch<RevenuePortfolioDashboardResponse>("/merch/revenue-engine/dashboard");
      setRevenueDashboard(response.dashboard);
      if (!options.silent) {
        onEvent?.(`Revenue Portfolio Dashboard loaded: ${response.dashboard.kpis.assets} assets, ${formatMerchCurrency(response.dashboard.kpis.profitVelocity)}/day profit velocity, ${response.dashboard.risk.riskLevel} risk.`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue portfolio dashboard failed.");
    } finally {
      setIsLoadingRevenueDashboard(false);
    }
  }

  async function loadFirstCashReadiness() {
    setIsLoadingFirstCashReadiness(true);
    setError(null);

    try {
      const response = await apiFetch<RevenueFirstCashReadinessResponse>("/merch/revenue-engine/first-cash-readiness?maxCandidates=8&targetDaysToFirstCash=7");
      setFirstCashReadiness(response.plan);
      onEvent?.(`First Cash Readiness ranked ${response.plan.totals.candidates} candidate${response.plan.totals.candidates === 1 ? "" : "s"}; ${response.plan.totals.targetReady} inside the 7-day target.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "First Cash Readiness failed.");
    } finally {
      setIsLoadingFirstCashReadiness(false);
    }
  }

  async function loadFirstCashSprint() {
    setIsLoadingFirstCashSprint(true);
    setError(null);

    try {
      const response = await apiFetch<RevenueFirstCashSprintResponse>("/merch/revenue-engine/first-cash-sprint?maxCandidates=8&maxSprintActions=5&targetDaysToFirstCash=7");
      setFirstCashSprint(response.sprint);
      setFirstCashReadiness(response.firstCash);
      setFirstCashSprintReceipt(null);
      setFirstCashSprintMessage(null);
      onEvent?.(`First Cash Sprint loaded ${response.sprint.totals.steps} sprint move${response.sprint.totals.steps === 1 ? "" : "s"} with ${response.sprint.totals.readyInternal} ready internal action${response.sprint.totals.readyInternal === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "First Cash Sprint failed.");
    } finally {
      setIsLoadingFirstCashSprint(false);
    }
  }

  async function runFirstCashSprint(dryRun: boolean) {
    const setBusy = dryRun ? setIsPreviewingFirstCashSprint : setIsRunningFirstCashSprint;

    setBusy(true);
    setError(null);
    setFirstCashSprintMessage(null);

    try {
      const response = await apiFetch<RevenueFirstCashSprintApplyResponse>("/merch/revenue-engine/first-cash-sprint/apply", {
        json: {
          confirm: "RUN INTERNAL FIRST CASH SPRINT",
          dryRun,
          maxCandidates: 8,
          maxSprintActions: 5,
          note: dryRun
            ? "Previewed from First Cash Sprint dashboard controls."
            : "Ran from First Cash Sprint dashboard controls.",
          targetDaysToFirstCash: 7
        },
        method: "POST"
      });
      setFirstCashSprint(response.sprint);
      setFirstCashSprintReceipt(response.dispatched);
      setFirstCashSprintMessage(dryRun
        ? `First Cash Sprint preview ready: ${response.dispatched.actionsPreviewed} internal action${response.dispatched.actionsPreviewed === 1 ? "" : "s"} previewed.`
        : `First Cash Sprint ran: ${response.dispatched.actionsDispatched} internal action${response.dispatched.actionsDispatched === 1 ? "" : "s"} dispatched.`);

      if (!dryRun) {
        await loadFirstCashReadiness();
        await loadRevenueEnginePortfolio();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "First Cash Sprint apply failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadFirstBusinessLaunch() {
    setIsLoadingFirstBusinessLaunch(true);
    setError(null);

    try {
      const response = await apiFetch<RevenueFirstBusinessLaunchResponse>("/merch/revenue-engine/first-business-launch?maxCandidates=8");
      setFirstBusinessLaunch(response.plan);
      setFirstCashSprint(response.sprint);
      setFirstBusinessLaunchReceipt(null);
      setFirstBusinessLaunchMessage(null);
      onEvent?.(`First Business Launch Path ranked ${response.plan.totals.candidates} candidate${response.plan.totals.candidates === 1 ? "" : "s"}; ${response.plan.totals.readyInternal} ready internal launch path${response.plan.totals.readyInternal === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "First Business Launch Path failed.");
    } finally {
      setIsLoadingFirstBusinessLaunch(false);
    }
  }

  async function runFirstBusinessLaunch(dryRun: boolean) {
    const setBusy = dryRun ? setIsPreviewingFirstBusinessLaunch : setIsRunningFirstBusinessLaunch;

    setBusy(true);
    setError(null);
    setFirstBusinessLaunchMessage(null);

    try {
      const response = await apiFetch<RevenueFirstBusinessLaunchApplyResponse>("/merch/revenue-engine/first-business-launch/apply", {
        json: {
          confirm: "RUN INTERNAL FIRST BUSINESS LAUNCH PATH",
          dryRun,
          maxCandidates: 8,
          note: dryRun
            ? "Previewed from First Business Launch Path dashboard controls."
            : "Ran from First Business Launch Path dashboard controls."
        },
        method: "POST"
      });
      setFirstBusinessLaunch(response.plan);
      setFirstCashSprint(response.sprint);
      setFirstBusinessLaunchReceipt(response.dispatched);
      setFirstBusinessLaunchMessage(dryRun
        ? `First Business Launch preview ready: ${response.dispatched.actionsPreviewed} internal action${response.dispatched.actionsPreviewed === 1 ? "" : "s"} previewed.`
        : `First Business Launch ran: ${response.dispatched.actionsDispatched} internal action${response.dispatched.actionsDispatched === 1 ? "" : "s"} dispatched.`);

      if (!dryRun) {
        await loadFirstCashReadiness();
        await loadRevenueEnginePortfolio();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "First Business Launch apply failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadRevenueEnginePortfolio() {
    setIsLoadingRevenuePlan(true);
    setError(null);

    try {
      const response = await apiFetch<RevenueEnginePortfolioResponse>("/merch/revenue-engine/portfolio");
      setRevenuePlan(response.portfolio);
      setRevenueRotationMessage(null);
      onEvent?.(`Revenue Engine scored ${response.portfolio.totals.assets} assets: ${response.portfolio.totals.scale} scale, ${response.portfolio.totals.pause} pause, ${response.portfolio.totals.kill} kill.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue Engine portfolio check failed.");
    } finally {
      setIsLoadingRevenuePlan(false);
    }
  }

  async function loadBusinessFleetScheduler() {
    setIsLoadingBusinessFleet(true);
    setError(null);

    try {
      const response = await apiFetch<RevenueBusinessFleetSchedulerResponse>("/merch/revenue-engine/business-fleet-scheduler");
      setBusinessFleetPlan(response.plan);
      setBusinessFleetGapPlan(null);
      setBusinessFleetGapSeedReceipt(null);
      setBusinessFleetGapSeedResults([]);
      setBusinessFleetGapAccelerationReceipt(null);
      setBusinessFleetLiveLaunchPackageReceipt(null);
      setBusinessFleetLiveLaunchPackage(null);
      setBusinessFleetLaunchGate(null);
      setBusinessFleetProviderApprovalReview(null);
      setBusinessFleetProviderApprovalReceipt(null);
      setBusinessFleetWaveSelection(null);
      setBusinessFleetWaveReceipt(null);
      setMoneyArmyPipeline(null);
      setMoneyArmyPipelineReceipt(null);
      setMoneyArmyGenerateScoreBatch(null);
      setMoneyArmyGenerateScoreBatchReceipt(null);
      setFirstBusinessPackage(null);
      setFirstBusinessPackageReceipt(null);
      setBusinessFleetMessage(null);
      onEvent?.(`Business Fleet Scheduler scored ${response.plan.totals.businesses} businesses: ${response.plan.totals.readyParallel} ready parallel, ${response.plan.totals.launchNow} launch-now, ${response.plan.totals.qualityRepair} repair.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Business Fleet Scheduler failed.");
    } finally {
      setIsLoadingBusinessFleet(false);
    }
  }

  async function loadBusinessFleetLaunchGap() {
    setIsLoadingBusinessFleetGap(true);
    setError(null);

    try {
      const response = await apiFetch<RevenueBusinessFleetLaunchGapResponse>("/merch/revenue-engine/business-fleet-scheduler/launch-gap");
      setBusinessFleetGapPlan(response.plan);
      setBusinessFleetGapSeedReceipt(null);
      setBusinessFleetGapSeedResults([]);
      setBusinessFleetGapAccelerationReceipt(null);
      setBusinessFleetLiveLaunchPackageReceipt(null);
      setBusinessFleetLiveLaunchPackage(null);
      setBusinessFleetLaunchGate(null);
      setBusinessFleetProviderApprovalReview(null);
      setBusinessFleetProviderApprovalReceipt(null);
      setMoneyArmyPipeline(null);
      setMoneyArmyPipelineReceipt(null);
      setMoneyArmyGenerateScoreBatch(null);
      setMoneyArmyGenerateScoreBatchReceipt(null);
      setFirstBusinessPackage(null);
      setFirstBusinessPackageReceipt(null);
      setMoneyArmyBatchRuns([]);
      onEvent?.(`Business Fleet launch gap planner found ${response.plan.totals.launchWaveGap} missing first-wave lane${response.plan.totals.launchWaveGap === 1 ? "" : "s"}: ${response.plan.totals.repairActions} repair action${response.plan.totals.repairActions === 1 ? "" : "s"}, ${response.plan.totals.createOpportunityShells} new seed${response.plan.totals.createOpportunityShells === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Business Fleet launch gap planner failed.");
    } finally {
      setIsLoadingBusinessFleetGap(false);
    }
  }

  function moneyArmyBatchSourceKeys() {
    const appliedSourceKeys = businessFleetGapSeedResults.map((result) => result.sourceKey);

    if (appliedSourceKeys.length > 0) {
      return appliedSourceKeys;
    }

    return businessFleetGapPlan?.opportunitySeeds.slice(0, 10).map((seed) => seed.sourceKey) ?? [];
  }

  function moneyArmyPipelineEndpoint() {
    const params = new URLSearchParams();

    params.set("launchWaveSize", "10");
    params.set("maxPackets", "25");
    params.set("maxSeeds", "10");
    params.set("maxStores", "10");
    for (const sourceKey of moneyArmyBatchSourceKeys()) {
      params.append("sourceKeys", sourceKey);
    }

    return `/merch/revenue-engine/money-army/batches?${params.toString()}`;
  }

  async function loadMoneyArmyPipeline() {
    setIsLoadingMoneyArmyPipeline(true);
    setError(null);
    setBusinessFleetMessage(null);

    try {
      const response = await apiFetch<RevenueMoneyArmyBatchPipelineResponse>(moneyArmyPipelineEndpoint());

      setMoneyArmyPipeline(response.plan);
      setMoneyArmyPipelineReceipt(null);
      setMoneyArmyBatchRuns(response.recentRuns);
      setBusinessFleetMessage(`Money Army pipeline loaded: ${response.plan.totals.readyStages} ready stage${response.plan.totals.readyStages === 1 ? "" : "s"}, next ${response.plan.nextStage?.title ?? "watch"}.`);
      onEvent?.(`Money Army batch pipeline loaded with ${response.plan.totals.readyStages} ready stage${response.plan.totals.readyStages === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Money Army batch pipeline failed.");
    } finally {
      setIsLoadingMoneyArmyPipeline(false);
    }
  }

  async function runMoneyArmyPipeline(dryRun: boolean) {
    const setBusy = dryRun ? setIsPreviewingMoneyArmyPipeline : setIsRunningMoneyArmyPipeline;

    setBusy(true);
    setError(null);
    setBusinessFleetMessage(null);

    try {
      const response = await apiFetch<RevenueMoneyArmyBatchPipelineApplyResponse>("/merch/revenue-engine/money-army/batches/apply", {
        json: {
          confirm: "RUN INTERNAL MONEY ARMY BATCH PIPELINE",
          dryRun,
          launchWaveSize: 10,
          maxPackets: 25,
          maxSeeds: 10,
          maxStores: 10,
          note: dryRun
            ? "Previewed from Money Army batch pipeline dashboard controls."
            : "Ran from Money Army batch pipeline dashboard controls.",
          sourceKeys: moneyArmyBatchSourceKeys(),
          stage: moneyArmyPipeline?.nextStage?.name
        },
        method: "POST"
      });

      setMoneyArmyPipeline(response.after);
      setMoneyArmyPipelineReceipt(response.applied);
      if (response.batchRun) {
        const batchRun = response.batchRun;
        setMoneyArmyBatchRuns((currentRuns) => [
          batchRun,
          ...currentRuns.filter((run) => run.id !== batchRun.id)
        ].slice(0, 10));
      }
      setBusinessFleetMessage(response.applied.summary);
      onEvent?.(response.applied.summary);

      if (!dryRun) {
        await onRefreshStores();
        await loadRevenueEnginePortfolio();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Money Army batch pipeline apply failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadMoneyArmyGenerateScoreBatch() {
    setIsGeneratingMoneyArmyScoreBatch(true);
    setError(null);
    setBusinessFleetMessage(null);

    try {
      const response = await apiFetch<RevenueMoneyArmyGenerateScoreBatchResponse>("/merch/revenue-engine/money-army/generate-score-batch?candidateCount=25");

      setMoneyArmyGenerateScoreBatch(response.plan);
      setMoneyArmyGenerateScoreBatchReceipt(null);
      setFirstBusinessPackage(response.plan.firstBusinessLaunchPackage);
      setFirstBusinessPackageReceipt(null);
      setMoneyArmyBatchRuns(response.recentRuns);
      setBusinessFleetMessage(`Generate-score batch ready: ${response.plan.totals.generated} candidates, scale pressure ${response.plan.scalePressure.pressureScore}/100, kill pressure ${response.plan.killPressure.pressureScore}/100.`);
      onEvent?.(`Money Army generated and scored ${response.plan.totals.generated} internal candidates.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Money Army generate-score batch failed.");
    } finally {
      setIsGeneratingMoneyArmyScoreBatch(false);
    }
  }

  async function recordMoneyArmyGenerateScoreBatch() {
    if (!moneyArmyGenerateScoreBatch) return;

    setIsRecordingMoneyArmyScoreBatch(true);
    setError(null);
    setBusinessFleetMessage(null);

    try {
      const response = await apiFetch<RevenueMoneyArmyGenerateScoreBatchApplyResponse>("/merch/revenue-engine/money-army/generate-score-batch/apply", {
        json: {
          candidateCount: moneyArmyGenerateScoreBatch.totals.requested,
          confirm: "RECORD INTERNAL MONEY ARMY GENERATE SCORE BATCH",
          dryRun: false,
          note: "Recorded from Money Army generate-score dashboard controls.",
          riskTolerance: "Low"
        },
        method: "POST"
      });

      setMoneyArmyGenerateScoreBatch(response.plan);
      setMoneyArmyGenerateScoreBatchReceipt(response.applied);
      setFirstBusinessPackage(response.plan.firstBusinessLaunchPackage);
      if (response.batchRun) {
        const batchRun = response.batchRun;
        setMoneyArmyBatchRuns((currentRuns) => [
          batchRun,
          ...currentRuns.filter((run) => run.id !== batchRun.id)
        ].slice(0, 10));
      }
      setBusinessFleetMessage(response.applied.summary);
      onEvent?.(response.applied.summary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Money Army generate-score record failed.");
    } finally {
      setIsRecordingMoneyArmyScoreBatch(false);
    }
  }

  async function generateFirstBusinessPackage() {
    setIsGeneratingFirstBusinessPackage(true);
    setError(null);
    setBusinessFleetMessage(null);

    try {
      const response = await apiFetch<RevenueMoneyArmyFirstBusinessLaunchPackageResponse>("/merch/revenue-engine/money-army/first-business-package?candidateCount=25&maxProducts=10");

      setFirstBusinessPackage(response.package);
      setFirstBusinessPackageReceipt(null);
      setMoneyArmyGenerateScoreBatch(response.sourceBatch);
      setMoneyArmyGenerateScoreBatchReceipt(null);
      setMoneyArmyBatchRuns(response.recentRuns);
      setBusinessFleetMessage(response.package
        ? `First Business Package ready: ${response.package.totals.products} product concepts, ${response.package.totals.contentIdeas} content ideas, ${response.package.totals.organicMoves} organic moves.`
        : "First Business Package found no eligible internal package.");
      onEvent?.(response.package
        ? `Generated First Business Package for ${response.package.store.businessName}.`
        : "Generated First Business Package found no eligible package.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "First Business Package generation failed.");
    } finally {
      setIsGeneratingFirstBusinessPackage(false);
    }
  }

  async function recordFirstBusinessPackage() {
    if (!firstBusinessPackage) return;

    setIsRecordingFirstBusinessPackage(true);
    setError(null);
    setBusinessFleetMessage(null);

    try {
      const response = await apiFetch<RevenueMoneyArmyFirstBusinessLaunchPackageApplyResponse>("/merch/revenue-engine/money-army/first-business-package/apply", {
        json: {
          candidateCount: 25,
          confirm: "RECORD INTERNAL FIRST BUSINESS LAUNCH PACKAGE",
          dryRun: false,
          maxProducts: 10,
          note: "Recorded from First Business Package dashboard controls.",
          riskTolerance: "Low"
        },
        method: "POST"
      });

      setFirstBusinessPackage(response.package);
      setFirstBusinessPackageReceipt(response.applied);
      setMoneyArmyGenerateScoreBatch(response.sourceBatch);
      if (response.batchRun) {
        const batchRun = response.batchRun;
        setMoneyArmyBatchRuns((currentRuns) => [
          batchRun,
          ...currentRuns.filter((run) => run.id !== batchRun.id)
        ].slice(0, 10));
      }
      setBusinessFleetMessage(response.applied.summary);
      onEvent?.(response.applied.summary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "First Business Package record failed.");
    } finally {
      setIsRecordingFirstBusinessPackage(false);
    }
  }

  async function runBusinessFleetGapSeeds(dryRun: boolean) {
    if (!businessFleetGapPlan) return;

    const setBusy = dryRun ? setIsPreviewingBusinessFleetGapSeeds : setIsCreatingBusinessFleetGapSeeds;
    const sourceKeys = businessFleetGapPlan.opportunitySeeds.slice(0, 10).map((seed) => seed.sourceKey);

    setBusy(true);
    setError(null);
    setBusinessFleetMessage(null);

    try {
      const response = await apiFetch<RevenueBusinessFleetLaunchGapSeedApplyResponse>("/merch/revenue-engine/business-fleet-scheduler/launch-gap/seeds/apply", {
        json: {
          confirm: "CREATE INTERNAL BUSINESS FLEET GAP SEEDS",
          dryRun,
          maxSeeds: 10,
          note: dryRun
            ? "Previewed from Business Fleet launch gap dashboard controls."
            : "Created from Business Fleet launch gap dashboard controls.",
          sourceKeys
        },
        method: "POST"
      });

      setBusinessFleetPlan(response.fleet);
      setBusinessFleetGapPlan(response.refreshedGapPlan);
      setBusinessFleetGapSeedReceipt(response.applied);
      setBusinessFleetGapSeedResults(response.results);
      setBusinessFleetGapAccelerationReceipt(null);
      setBusinessFleetLiveLaunchPackageReceipt(null);
      setBusinessFleetLiveLaunchPackage(null);
      setBusinessFleetLaunchGate(null);
      setBusinessFleetProviderApprovalReview(null);
      setBusinessFleetProviderApprovalReceipt(null);
      setBusinessFleetMessage(dryRun
        ? `Fleet gap seed preview ready: ${response.applied.seedsPreviewed} seed${response.applied.seedsPreviewed === 1 ? "" : "s"} selected, ${response.applied.productDraftsCreated} draft${response.applied.productDraftsCreated === 1 ? "" : "s"} planned.`
        : `Fleet gap seeds created: ${response.applied.seedsApplied} seed${response.applied.seedsApplied === 1 ? "" : "s"}, ${response.applied.storeShellsCreated} store shell${response.applied.storeShellsCreated === 1 ? "" : "s"}, ${response.applied.productDraftsCreated} draft${response.applied.productDraftsCreated === 1 ? "" : "s"}.`);
      onEvent?.(dryRun
        ? `Business Fleet gap seed preview selected ${response.applied.seedsPreviewed} seed${response.applied.seedsPreviewed === 1 ? "" : "s"}.`
        : `Business Fleet gap seed creation wrote ${response.applied.storeShellsCreated} store shell${response.applied.storeShellsCreated === 1 ? "" : "s"} and ${response.applied.productDraftsCreated} draft${response.applied.productDraftsCreated === 1 ? "" : "s"}.`);

      if (!dryRun) {
        await onRefreshStores();
        await loadRevenueEnginePortfolio();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Business Fleet gap seed creation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runBusinessFleetGapAcceleration(dryRun: boolean) {
    const sourceKeys = businessFleetGapSeedResults.map((result) => result.sourceKey);
    if (sourceKeys.length === 0) return;

    const setBusy = dryRun ? setIsPreviewingBusinessFleetGapAcceleration : setIsRunningBusinessFleetGapAcceleration;

    setBusy(true);
    setError(null);
    setBusinessFleetMessage(null);

    try {
      const response = await apiFetch<RevenueBusinessFleetLaunchGapAccelerationResponse>("/merch/revenue-engine/business-fleet-scheduler/launch-gap/acceleration/apply", {
        json: {
          confirm: "RUN INTERNAL BUSINESS FLEET GAP ACCELERATION",
          dryRun,
          maxStores: 10,
          note: dryRun
            ? "Previewed from Business Fleet launch gap acceleration dashboard controls."
            : "Ran from Business Fleet launch gap acceleration dashboard controls.",
          sourceKeys
        },
        method: "POST"
      });

      setBusinessFleetPlan(response.fleet);
      setBusinessFleetGapAccelerationReceipt(response.applied);
      setBusinessFleetLiveLaunchPackageReceipt(null);
      setBusinessFleetLiveLaunchPackage(null);
      setBusinessFleetLaunchGate(null);
      setBusinessFleetProviderApprovalReview(null);
      setBusinessFleetProviderApprovalReceipt(null);
      setBusinessFleetMessage(dryRun
        ? `Fleet gap acceleration preview ready: ${response.applied.storesTargeted} store${response.applied.storesTargeted === 1 ? "" : "s"}, ${response.applied.listingExperimentsQueued} listing experiment${response.applied.listingExperimentsQueued === 1 ? "" : "s"}, ${response.applied.storeSetupRunbooks} setup runbook${response.applied.storeSetupRunbooks === 1 ? "" : "s"}.`
        : `Fleet gap acceleration ran: ${response.applied.storesTargeted} store${response.applied.storesTargeted === 1 ? "" : "s"}, ${response.applied.listingProductsUpdated} listing update${response.applied.listingProductsUpdated === 1 ? "" : "s"}, ${response.applied.storeSetupUpdates} setup update${response.applied.storeSetupUpdates === 1 ? "" : "s"}.`);
      onEvent?.(dryRun
        ? `Business Fleet gap acceleration preview targeted ${response.applied.storesTargeted} store${response.applied.storesTargeted === 1 ? "" : "s"}.`
        : `Business Fleet gap acceleration ran ${response.applied.listingProductsUpdated} listing update${response.applied.listingProductsUpdated === 1 ? "" : "s"}.`);

      if (!dryRun) {
        await onRefreshStores();
        await loadRevenueEnginePortfolio();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Business Fleet gap acceleration failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runBusinessFleetLiveLaunchPackage(dryRun: boolean) {
    const sourceKeys = businessFleetGapSeedResults.map((result) => result.sourceKey);
    if (sourceKeys.length === 0) return;

    const setBusy = dryRun ? setIsPreviewingBusinessFleetLiveLaunchPackage : setIsRecordingBusinessFleetLiveLaunchPackage;

    setBusy(true);
    setError(null);
    setBusinessFleetMessage(null);

    try {
      const response = await apiFetch<RevenueBusinessFleetLiveLaunchPackageResponse>("/merch/revenue-engine/business-fleet-scheduler/launch-gap/live-package/apply", {
        json: {
          confirm: "RECORD INTERNAL BUSINESS FLEET LIVE LAUNCH PACKAGE",
          dryRun,
          maxStores: 10,
          note: dryRun
            ? "Previewed from Business Fleet live launch package dashboard controls."
            : "Recorded from Business Fleet live launch package dashboard controls.",
          sourceKeys
        },
        method: "POST"
      });

      setBusinessFleetPlan(response.fleet);
      setBusinessFleetLiveLaunchPackageReceipt(response.applied);
      setBusinessFleetLiveLaunchPackage(response);
      setBusinessFleetLaunchGate(null);
      setBusinessFleetProviderApprovalReview(null);
      setBusinessFleetProviderApprovalReceipt(null);
      setBusinessFleetMessage(dryRun
        ? `Fleet live package preview ready: ${response.applied.storesTargeted} store${response.applied.storesTargeted === 1 ? "" : "s"}, ${response.applied.providerApprovalPacketsPreviewed} provider approval packet${response.applied.providerApprovalPacketsPreviewed === 1 ? "" : "s"}, ${response.applied.operationsPacksSelected} operations pack${response.applied.operationsPacksSelected === 1 ? "" : "s"}.`
        : `Fleet live package recorded: ${response.applied.storesTargeted} store${response.applied.storesTargeted === 1 ? "" : "s"}, ${response.applied.providerApprovalPacketsQueued} provider approval packet${response.applied.providerApprovalPacketsQueued === 1 ? "" : "s"}, ${response.applied.operationsPacksRecorded} operations pack${response.applied.operationsPacksRecorded === 1 ? "" : "s"}.`);
      onEvent?.(dryRun
        ? `Business Fleet live package preview targeted ${response.applied.storesTargeted} store${response.applied.storesTargeted === 1 ? "" : "s"}.`
        : `Business Fleet live package recorded ${response.applied.providerApprovalPacketsQueued} provider approval packet${response.applied.providerApprovalPacketsQueued === 1 ? "" : "s"}.`);

      if (!dryRun) {
        await loadRevenueEnginePortfolio();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Business Fleet live launch package failed.");
    } finally {
      setBusy(false);
    }
  }

  function businessFleetLaunchGateEndpoint() {
    const params = new URLSearchParams();

    params.set("maxStores", "10");
    for (const result of businessFleetGapSeedResults) {
      params.append("sourceKeys", result.sourceKey);
    }

    return `/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-gate?${params.toString()}`;
  }

  async function loadBusinessFleetLaunchGate() {
    if (businessFleetGapSeedResults.length === 0) return;

    setIsLoadingBusinessFleetLaunchGate(true);
    setError(null);
    setBusinessFleetMessage(null);

    try {
      const response = await apiFetch<RevenueBusinessFleetLaunchGateResponse>(businessFleetLaunchGateEndpoint());

      setBusinessFleetLaunchGate(response.plan);
      setBusinessFleetMessage(`Fleet launch gate checked: ${response.plan.totals.readyForManualLaunch} ready, ${response.plan.totals.approvalNeeded} need approval, ${response.plan.totals.repairRequired} need repair, ${response.plan.totals.blocked} blocked.`);
      onEvent?.(`Business Fleet launch gate checked ${response.plan.totals.storesEvaluated} packaged lane${response.plan.totals.storesEvaluated === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Business Fleet launch gate failed.");
    } finally {
      setIsLoadingBusinessFleetLaunchGate(false);
    }
  }

  function businessFleetProviderApprovalReviewEndpoint() {
    const params = new URLSearchParams();

    params.set("maxPackets", "25");
    params.set("maxStores", "10");
    params.set("status", "pending");
    for (const result of businessFleetGapSeedResults) {
      params.append("sourceKeys", result.sourceKey);
    }

    return `/merch/revenue-engine/business-fleet-scheduler/launch-gap/provider-approval-review?${params.toString()}`;
  }

  async function loadBusinessFleetProviderApprovalReview() {
    if (businessFleetGapSeedResults.length === 0) return;

    setIsLoadingBusinessFleetProviderApprovalReview(true);
    setError(null);
    setBusinessFleetMessage(null);

    try {
      const response = await apiFetch<RevenueBusinessFleetProviderApprovalReviewResponse>(businessFleetProviderApprovalReviewEndpoint());

      setBusinessFleetProviderApprovalReview(response.plan);
      setBusinessFleetProviderApprovalReceipt(null);
      setBusinessFleetMessage(`Provider approval review loaded: ${response.plan.totals.approvable} approvable, ${response.plan.totals.pending} pending.`);
      onEvent?.(`Business Fleet provider approval review loaded ${response.plan.totals.packets} packet${response.plan.totals.packets === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Business Fleet provider approval review failed.");
    } finally {
      setIsLoadingBusinessFleetProviderApprovalReview(false);
    }
  }

  async function runBusinessFleetProviderApprovalReview(dryRun: boolean) {
    const sourceKeys = businessFleetGapSeedResults.map((result) => result.sourceKey);
    if (sourceKeys.length === 0) return;

    const setBusy = dryRun ? setIsPreviewingBusinessFleetProviderApprovalReview : setIsApplyingBusinessFleetProviderApprovalReview;

    setBusy(true);
    setError(null);
    setBusinessFleetMessage(null);

    try {
      const response = await apiFetch<RevenueBusinessFleetProviderApprovalReviewApplyResponse>("/merch/revenue-engine/business-fleet-scheduler/launch-gap/provider-approval-review/apply", {
        json: {
          action: "approve",
          confirm: "REVIEW INTERNAL BUSINESS FLEET PROVIDER APPROVALS",
          dryRun,
          maxPackets: 25,
          maxStores: 10,
          note: dryRun
            ? "Previewed from Business Fleet provider approval review dashboard controls."
            : "Approved from Business Fleet provider approval review dashboard controls.",
          packetIds: businessFleetProviderApprovalReview?.items.filter((item) => item.canApprove).map((item) => item.packetId) ?? [],
          sourceKeys
        },
        method: "POST"
      });

      setBusinessFleetProviderApprovalReview(response.plan);
      setBusinessFleetProviderApprovalReceipt(response.applied);
      setBusinessFleetLaunchGate(response.launchGate);
      setBusinessFleetMessage(dryRun
        ? `Provider approval preview ready: ${response.applied.packetsPreviewed} packet${response.applied.packetsPreviewed === 1 ? "" : "s"} selected.`
        : `Provider approvals recorded: ${response.applied.packetsApproved} packet${response.applied.packetsApproved === 1 ? "" : "s"} approved internally.`);
      onEvent?.(dryRun
        ? `Business Fleet provider approval preview selected ${response.applied.packetsPreviewed} packet${response.applied.packetsPreviewed === 1 ? "" : "s"}.`
        : `Business Fleet provider approval batch approved ${response.applied.packetsApproved} packet${response.applied.packetsApproved === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Business Fleet provider approval apply failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runBusinessFleetLaunchWave(dryRun: boolean) {
    const setBusy = dryRun ? setIsPreviewingBusinessFleetWave : setIsRunningBusinessFleetWave;

    setBusy(true);
    setError(null);
    setBusinessFleetMessage(null);

    try {
      const response = await apiFetch<RevenueBusinessFleetLaunchWaveApplyResponse>("/merch/revenue-engine/business-fleet-scheduler/launch-wave/apply", {
        json: {
          confirm: "RUN INTERNAL BUSINESS FLEET LAUNCH WAVE",
          dryRun,
          launchWaveSize: 10,
          note: dryRun
            ? "Previewed from Business Fleet Scheduler dashboard controls."
            : "Ran from Business Fleet Scheduler dashboard controls."
        },
        method: "POST"
      });

      setBusinessFleetPlan(response.fleet);
      setBusinessFleetGapPlan(null);
      setBusinessFleetGapSeedReceipt(null);
      setBusinessFleetGapSeedResults([]);
      setBusinessFleetGapAccelerationReceipt(null);
      setBusinessFleetLiveLaunchPackageReceipt(null);
      setBusinessFleetLiveLaunchPackage(null);
      setBusinessFleetLaunchGate(null);
      setBusinessFleetProviderApprovalReview(null);
      setBusinessFleetProviderApprovalReceipt(null);
      setBusinessFleetWaveSelection(response.selection);
      setBusinessFleetWaveReceipt(response.dispatched);
      setFirstBusinessLaunch(response.firstBusinessLaunch);
      setFirstCashSprint(response.sprint);
      setBusinessFleetMessage(dryRun
        ? `Fleet launch wave preview ready: ${response.selection.totals.selected} business${response.selection.totals.selected === 1 ? "" : "es"} selected, ${response.dispatched.actionsPreviewed} internal action${response.dispatched.actionsPreviewed === 1 ? "" : "s"} previewed.`
        : `Fleet launch wave ran: ${response.dispatched.actionsDispatched} internal action${response.dispatched.actionsDispatched === 1 ? "" : "s"} dispatched across ${response.selection.totals.selected} business${response.selection.totals.selected === 1 ? "" : "es"}.`);
      onEvent?.(dryRun
        ? `Business Fleet launch wave preview selected ${response.selection.totals.selected} business${response.selection.totals.selected === 1 ? "" : "es"}.`
        : `Business Fleet launch wave dispatched ${response.dispatched.actionsDispatched} internal action${response.dispatched.actionsDispatched === 1 ? "" : "s"}.`);

      if (!dryRun) {
        await loadFirstCashReadiness();
        await loadRevenueEnginePortfolio();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Business Fleet launch wave failed.");
    } finally {
      setBusy(false);
    }
  }

  function updateAssetControlLedgerQuery<K extends keyof RevenueAssetControlLedgerQuery>(key: K, value: RevenueAssetControlLedgerQuery[K]) {
    setAssetControlLedgerQuery((current) => ({ ...current, [key]: value }));
  }

  function updateAssetReviewQueueQuery<K extends keyof RevenueAssetReviewQueueQuery>(key: K, value: RevenueAssetReviewQueueQuery[K]) {
    setAssetReviewQueueQuery((current) => ({ ...current, [key]: value }));
  }

  function assetControlLedgerEndpoint(queryInput: RevenueAssetControlLedgerQuery = assetControlLedgerQuery) {
    const params = new URLSearchParams();

    if (queryInput.action) params.set("action", queryInput.action);
    if (queryInput.assetId?.trim()) params.set("assetId", queryInput.assetId.trim());
    if (queryInput.assetType) params.set("assetType", queryInput.assetType);
    if (queryInput.fromDate?.trim()) params.set("fromDate", queryInput.fromDate.trim());
    if (queryInput.includeOverridesOnly) params.set("includeOverridesOnly", "true");
    if (queryInput.limit) params.set("limit", String(queryInput.limit));
    if (queryInput.storeId?.trim()) params.set("storeId", queryInput.storeId.trim());
    if (queryInput.toDate?.trim()) params.set("toDate", queryInput.toDate.trim());

    const query = params.toString();
    return query ? `/merch/revenue-engine/asset-controls?${query}` : "/merch/revenue-engine/asset-controls";
  }

  function assetControlRecoveryEndpoint() {
    const params = new URLSearchParams();

    if (assetControlLedgerQuery.limit) params.set("limit", String(Math.min(100, assetControlLedgerQuery.limit)));
    if (assetReviewQueueQuery.staleAfterDays) params.set("staleAfterDays", String(assetReviewQueueQuery.staleAfterDays));

    const query = params.toString();
    return query ? `/merch/revenue-engine/asset-controls/recovery?${query}` : "/merch/revenue-engine/asset-controls/recovery";
  }

  function assetReviewQueueEndpoint() {
    const params = new URLSearchParams();

    if (assetReviewQueueQuery.includeWatch) params.set("includeWatch", "true");
    if (assetReviewQueueQuery.maxItems) params.set("maxItems", String(assetReviewQueueQuery.maxItems));
    if (assetReviewQueueQuery.staleAfterDays) params.set("staleAfterDays", String(assetReviewQueueQuery.staleAfterDays));

    const query = params.toString();
    return query ? `/merch/revenue-engine/review-queue?${query}` : "/merch/revenue-engine/review-queue";
  }

  async function loadRevenueAssetControlLedger(queryOverride?: RevenueAssetControlLedgerQuery) {
    setIsLoadingAssetControlLedger(true);
    setError(null);

    try {
      const response = await apiFetch<RevenueAssetControlLedgerResponse>(assetControlLedgerEndpoint(queryOverride));
      setAssetControlLedger(response.ledger);
      onEvent?.(`Revenue Asset Control Ledger loaded ${response.ledger.totals.records} internal decision record${response.ledger.totals.records === 1 ? "" : "s"} with ${response.ledger.totals.overrides} override${response.ledger.totals.overrides === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue asset control ledger failed.");
    } finally {
      setIsLoadingAssetControlLedger(false);
    }
  }

  async function loadRevenueAssetControlRecovery() {
    setIsLoadingAssetControlRecovery(true);
    setError(null);

    try {
      const response = await apiFetch<RevenueAssetControlRecoveryResponse>(assetControlRecoveryEndpoint());
      setAssetControlRecovery(response.recovery);
      onEvent?.(`Revenue Asset Control Recovery loaded ${response.recovery.totals.items} recovery item${response.recovery.totals.items === 1 ? "" : "s"} with ${response.recovery.totals.readyToReplay} ready replay candidate${response.recovery.totals.readyToReplay === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue asset control recovery failed.");
    } finally {
      setIsLoadingAssetControlRecovery(false);
    }
  }

  async function loadRevenueAssetControlLedgerForAsset(asset: RevenueAssetPortfolio["assets"][number]) {
    const nextQuery: RevenueAssetControlLedgerQuery = {
      ...assetControlLedgerQuery,
      action: "",
      assetId: asset.assetId,
      assetType: asset.assetType,
      includeOverridesOnly: false,
      storeId: asset.storeId
    };

    setAssetControlLedgerQuery(nextQuery);
    await loadRevenueAssetControlLedger(nextQuery);
  }

  async function loadRevenueAssetReviewQueue() {
    setIsLoadingAssetReviewQueue(true);
    setError(null);

    try {
      const response = await apiFetch<RevenueAssetReviewQueueResponse>(assetReviewQueueEndpoint());
      setAssetReviewQueue(response.plan);
      onEvent?.(`Revenue Asset Review Queue loaded ${response.plan.totals.items} item${response.plan.totals.items === 1 ? "" : "s"} with ${response.plan.totals.overrides} override review${response.plan.totals.overrides === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue asset review queue failed.");
    } finally {
      setIsLoadingAssetReviewQueue(false);
    }
  }

  async function runRevenueRotation(dryRun: boolean) {
    const setBusy = dryRun ? setIsDryRunningRotation : setIsApplyingRotation;

    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<RevenueRotationApplyResponse>("/merch/revenue-engine/rotation/apply", {
        json: {
          confirm: "APPLY INTERNAL ROTATION",
          dryRun
        },
        method: "POST"
      });
      const rotationCount = response.applied.productUpdates.length + response.applied.storeUpdates.length;
      setRevenuePlan(response.portfolio);
      setRevenueRotationMessage(dryRun
        ? `Dry run ready: ${rotationCount} internal rotation change${rotationCount === 1 ? "" : "s"} identified.`
        : `Internal rotation applied: ${rotationCount} change${rotationCount === 1 ? "" : "s"} recorded. Audit log ${response.applied.auditLogId ?? "not created"}.`);
      onEvent?.(dryRun
        ? `Revenue Engine dry run identified ${rotationCount} internal rotation change${rotationCount === 1 ? "" : "s"}.`
        : `Revenue Engine applied ${rotationCount} internal rotation change${rotationCount === 1 ? "" : "s"}. No external systems were contacted.`);

      if (!dryRun) {
        onRefreshStores();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue rotation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runRevenueAssetAction(
    asset: Pick<RevenueAssetPortfolio["assets"][number], "assetId" | "assetName" | "assetType">,
    action: RevenueAssetRotationDecision,
    dryRun: boolean,
    options: { refreshDashboard?: boolean } = {}
  ) {
    const busyKey = `${asset.assetType}-${asset.assetId}-${action}-${dryRun ? "preview" : "apply"}`;

    setAssetActionBusyKey(busyKey);
    setError(null);

    try {
      const response = await apiFetch<RevenueAssetActionApplyResponse>("/merch/revenue-engine/portfolio/action", {
        json: {
          action,
          assetId: asset.assetId,
          assetType: asset.assetType,
          confirm: "APPLY INTERNAL ASSET ACTION",
          dryRun
        },
        method: "POST"
      });
      const changed = response.applied.productUpdates.length + response.applied.storeUpdates.length;

      setAssetControlPreview(response.control);
      setAssetBatchControlPreview(null);
      setRevenuePlan(response.portfolio);
      setRevenueRotationMessage(dryRun
        ? `${action} preview ready for ${asset.assetName}: ${response.control.summary}`
        : `${action} recorded for ${asset.assetName}: ${changed} internal state change${changed === 1 ? "" : "s"}. Audit log ${response.applied.auditLogId ?? "not created"}.`);
      onEvent?.(dryRun
        ? `Revenue Engine previewed ${action} for ${asset.assetName}.`
        : `Revenue Engine recorded ${action} for ${asset.assetName}. No external systems were contacted.`);

      if (!dryRun && changed > 0) {
        onRefreshStores();
      }

      if (!dryRun && options.refreshDashboard) {
        await loadRevenuePortfolioDashboard({ silent: true });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue asset action failed.");
    } finally {
      setAssetActionBusyKey(null);
    }
  }

  async function runRevenueDashboardNextAction(action: RevenuePortfolioDashboardNextAction, dryRun: boolean) {
    await runRevenueAssetAction(action, action.recommendation, dryRun, {
      refreshDashboard: true
    });
  }

  async function runRevenueAssetReviewQueueAction(item: RevenueAssetReviewQueueItem) {
    const busyKey = `${item.assetType}-${item.assetId}-${item.currentRecommendation}`;

    setAssetReviewQueueBusyKey(busyKey);
    setError(null);

    try {
      const response = await apiFetch<RevenueAssetActionApplyResponse>("/merch/revenue-engine/portfolio/action", {
        json: {
          action: item.currentRecommendation,
          assetId: item.assetId,
          assetType: item.assetType,
          confirm: "APPLY INTERNAL ASSET ACTION",
          dryRun: false
        },
        method: "POST"
      });
      const changed = response.applied.productUpdates.length + response.applied.storeUpdates.length;

      setAssetControlPreview(response.control);
      setAssetBatchControlPreview(null);
      setRevenuePlan(response.portfolio);
      setRevenueRotationMessage(`${item.currentRecommendation} recorded for ${item.assetName} from review queue: ${changed} internal state change${changed === 1 ? "" : "s"}. Audit log ${response.applied.auditLogId ?? "not created"}.`);
      onEvent?.(`Revenue review queue recorded ${item.currentRecommendation} for ${item.assetName}. No external systems were contacted.`);

      if (changed > 0) {
        onRefreshStores();
      }

      await loadRevenueAssetReviewQueue();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue asset review queue action failed.");
    } finally {
      setAssetReviewQueueBusyKey(null);
    }
  }

  function toggleReviewQueueSelection(item: RevenueAssetReviewQueueItem) {
    const key = revenueAssetReviewQueueKey(item);

    setSelectedReviewQueueKeys((current) => current.includes(key)
      ? current.filter((selectedKey) => selectedKey !== key)
      : [...current, key]);
  }

  function selectAllReviewQueueItems() {
    if (!assetReviewQueue) return;

    setSelectedReviewQueueKeys(assetReviewQueue.queue
      .slice(0, 50)
      .map(revenueAssetReviewQueueKey));
  }

  async function runRevenueAssetReviewQueueBatch() {
    if (selectedReviewQueueActions.length === 0) {
      setRevenueRotationMessage("Select at least one review queue item before recording a queue batch.");
      return;
    }

    setIsApplyingReviewQueueBatch(true);
    setError(null);

    try {
      const response = await apiFetch<RevenueAssetBatchActionApplyResponse>("/merch/revenue-engine/portfolio/actions", {
        json: {
          actions: selectedReviewQueueActions,
          confirm: "APPLY INTERNAL ASSET BATCH",
          dryRun: false
        },
        method: "POST"
      });
      const changed = response.applied.productUpdates.length + response.applied.storeUpdates.length;

      setAssetControlPreview(null);
      setAssetBatchControlPreview(response.batch);
      setRevenuePlan(response.portfolio);
      setSelectedReviewQueueKeys([]);
      setRevenueRotationMessage(`Review queue batch recorded: ${response.applied.actions} asset action${response.applied.actions === 1 ? "" : "s"} and ${changed} internal state change${changed === 1 ? "" : "s"}. Audit log ${response.applied.auditLogId ?? "not created"}.`);
      onEvent?.(`Revenue review queue batch recorded ${response.applied.actions} selected asset action${response.applied.actions === 1 ? "" : "s"}. No external systems were contacted.`);

      if (changed > 0) {
        onRefreshStores();
      }

      await loadRevenueAssetReviewQueue();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue asset review queue batch failed.");
    } finally {
      setIsApplyingReviewQueueBatch(false);
    }
  }

  function toggleRevenueAssetSelection(asset: RevenueAssetPortfolio["assets"][number]) {
    const key = revenueAssetKey(asset);

    setSelectedAssetKeys((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key]);
  }

  function selectRecommendedRevenueAssets() {
    if (!revenuePlan) return;

    setSelectedAssetKeys(revenuePlan.assets
      .filter((asset) => asset.recommendation !== "watch")
      .slice(0, 50)
      .map(revenueAssetKey));
  }

  async function runRevenueAssetBatch(dryRun: boolean) {
    if (selectedBatchActions.length === 0) {
      setRevenueRotationMessage("Select at least one scored asset before running a batch action.");
      return;
    }

    const setBusy = dryRun ? setIsPreviewingAssetBatch : setIsApplyingAssetBatch;

    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<RevenueAssetBatchActionApplyResponse>("/merch/revenue-engine/portfolio/actions", {
        json: {
          actions: selectedBatchActions,
          confirm: "APPLY INTERNAL ASSET BATCH",
          dryRun
        },
        method: "POST"
      });
      const changed = response.applied.productUpdates.length + response.applied.storeUpdates.length;

      setAssetControlPreview(null);
      setAssetBatchControlPreview(response.batch);
      setRevenuePlan(response.portfolio);
      setRevenueRotationMessage(dryRun
        ? `Batch preview ready: ${response.applied.actions} selected asset action${response.applied.actions === 1 ? "" : "s"}, ${changed} internal state change${changed === 1 ? "" : "s"}, ${response.applied.skipped.length} skipped.`
        : `Batch actions recorded: ${response.applied.actions} asset action${response.applied.actions === 1 ? "" : "s"} and ${changed} internal state change${changed === 1 ? "" : "s"}. Audit log ${response.applied.auditLogId ?? "not created"}.`);
      onEvent?.(dryRun
        ? `Revenue Engine previewed ${response.applied.actions} selected asset action${response.applied.actions === 1 ? "" : "s"}.`
        : `Revenue Engine recorded ${response.applied.actions} selected asset action${response.applied.actions === 1 ? "" : "s"}. No external systems were contacted.`);

      if (!dryRun) {
        setSelectedAssetKeys([]);
        if (changed > 0) {
          onRefreshStores();
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue asset batch action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadListingOptimizationQueue() {
    setIsLoadingListingOptimization(true);
    setError(null);

    try {
      const response = await apiFetch<RevenueListingOptimizationResponse>("/merch/revenue-engine/listing-optimization");
      setListingOptimizationPlan(response.plan);
      setListingOptimizationMessage(null);
      onEvent?.(`Listing Optimization queued ${response.plan.totals.experimentsQueued} internal experiment${response.plan.totals.experimentsQueued === 1 ? "" : "s"} with ${response.plan.totals.variantsGenerated} variant${response.plan.totals.variantsGenerated === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Listing optimization check failed.");
    } finally {
      setIsLoadingListingOptimization(false);
    }
  }

  async function runListingOptimizationQueue(dryRun: boolean) {
    const setBusy = dryRun ? setIsDryRunningListingOptimization : setIsApplyingListingOptimization;

    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<RevenueListingOptimizationApplyResponse>("/merch/revenue-engine/listing-optimization/apply", {
        json: {
          confirm: "APPLY INTERNAL LISTING OPTIMIZATION",
          dryRun
        },
        method: "POST"
      });
      const updateCount = response.applied.productUpdates.length;
      setListingOptimizationPlan(response.plan);
      setListingOptimizationMessage(dryRun
        ? `Listing preview ready: ${updateCount} internal listing draft${updateCount === 1 ? "" : "s"} would be updated.`
        : `Internal listing optimization applied: ${updateCount} draft${updateCount === 1 ? "" : "s"} updated. Audit log ${response.applied.auditLogId ?? "not created"}.`);
      onEvent?.(dryRun
        ? `Listing optimization previewed ${updateCount} internal draft update${updateCount === 1 ? "" : "s"}.`
        : `Listing optimization updated ${updateCount} internal listing draft${updateCount === 1 ? "" : "s"}. No external systems were contacted.`);

      if (!dryRun) {
        onRefreshStores();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Listing optimization apply failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadStoreSetupRunbook() {
    setIsLoadingStoreSetup(true);
    setError(null);

    try {
      const response = await apiFetch<RevenueStoreSetupResponse>("/merch/revenue-engine/store-setup");
      setStoreSetupPlan(response.plan);
      setStoreSetupMessage(null);
      onEvent?.(`Store Setup Runbook queued ${response.plan.totals.runbooksQueued} internal setup runbook${response.plan.totals.runbooksQueued === 1 ? "" : "s"} across ${response.plan.totals.storesEvaluated} stores.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Store setup runbook check failed.");
    } finally {
      setIsLoadingStoreSetup(false);
    }
  }

  async function runStoreSetupRunbook(dryRun: boolean) {
    const setBusy = dryRun ? setIsDryRunningStoreSetup : setIsApplyingStoreSetup;

    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<RevenueStoreSetupApplyResponse>("/merch/revenue-engine/store-setup/apply", {
        json: {
          confirm: "APPLY INTERNAL STORE SETUP RUNBOOK",
          dryRun
        },
        method: "POST"
      });
      const updateCount = response.applied.storeUpdates.length;
      setStoreSetupPlan(response.plan);
      setStoreSetupMessage(dryRun
        ? `Store setup preview ready: ${updateCount} internal store status update${updateCount === 1 ? "" : "s"} identified.`
        : `Internal store setup applied: ${updateCount} store status update${updateCount === 1 ? "" : "s"} recorded. Audit log ${response.applied.auditLogId ?? "not created"}.`);
      onEvent?.(dryRun
        ? `Store setup preview identified ${updateCount} internal update${updateCount === 1 ? "" : "s"}.`
        : `Store setup applied ${updateCount} internal update${updateCount === 1 ? "" : "s"}. No external systems were contacted.`);

      if (!dryRun) {
        onRefreshStores();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Store setup runbook apply failed.");
    } finally {
      setBusy(false);
    }
  }

  function updatePerformanceForm<K extends keyof PerformanceSnapshotForm>(key: K, value: PerformanceSnapshotForm[K]) {
    setPerformanceForm((current) => ({ ...current, [key]: value }));
  }

  function updateScalingOutcomeForm<K extends keyof ScalingOutcomeForm>(key: K, value: ScalingOutcomeForm[K]) {
    setScalingOutcomeForm((current) => ({ ...current, [key]: value }));
  }

  function buildManualPerformanceSnapshot(): RevenuePerformanceSnapshotInput | null {
    if (!selectedStore) return null;

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - 7 * 86_400_000);

    return {
      adSpend: performanceForm.adSpend,
      grossRevenue: performanceForm.grossRevenue,
      netProfit: performanceForm.netProfit,
      notes: "Manual Revenue Engine performance snapshot.",
      periodEnd: periodEnd.toISOString(),
      periodStart: periodStart.toISOString(),
      source: "manual",
      storeId: selectedStore.id,
      unitsSold: performanceForm.unitsSold,
      visits: performanceForm.visits
    };
  }

  async function loadRevenuePerformance() {
    setIsLoadingPerformance(true);
    setError(null);

    try {
      const response = await apiFetch<RevenuePerformanceResponse>("/merch/revenue-engine/performance");
      setPerformanceDigest(response.digest);
      setPerformanceMessage(null);
      onEvent?.(`Performance ledger scored ${response.digest.totals.snapshots} snapshot${response.digest.totals.snapshots === 1 ? "" : "s"} with ${formatMerchCurrency(response.digest.totals.profitVelocity)} daily profit velocity.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Performance velocity check failed.");
    } finally {
      setIsLoadingPerformance(false);
    }
  }

  async function loadFinancialOrchestrator() {
    setIsLoadingFinancialPlan(true);
    setError(null);

    try {
      const response = await apiFetch<FinancialOrchestratorResponse>("/merch/financial-orchestrator/plan");
      setFinancialPlan(response.plan);
      setFinancialMessage(null);
      onEvent?.(`Financial Orchestrator prepared ${response.plan.totals.payoutIntents} payout intent${response.plan.totals.payoutIntents === 1 ? "" : "s"} and ${response.plan.totals.scalingBudgetPackets} Ad/Growth budget packet${response.plan.totals.scalingBudgetPackets === 1 ? "" : "s"} from ${formatMerchCurrency(response.plan.totals.distributableProfit)} distributable profit.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Financial Orchestrator check failed.");
    } finally {
      setIsLoadingFinancialPlan(false);
    }
  }

  async function runFinancialOrchestrator(dryRun: boolean) {
    const setBusy = dryRun ? setIsDryRunningFinancialApply : setIsApplyingFinancialPlan;

    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<FinancialOrchestratorApplyResponse>("/merch/financial-orchestrator/apply", {
        json: {
          confirm: "APPLY INTERNAL FINANCIAL ORCHESTRATOR",
          dryRun
        },
        method: "POST"
      });
      setFinancialPlan(response.plan);
      const budgetText = ` and ${response.applied.scalingBudgetPackets} Ad/Growth budget packet${response.applied.scalingBudgetPackets === 1 ? "" : "s"}`;
      setFinancialMessage(dryRun
        ? `Financial preview ready: ${response.applied.ledgerEntriesCreated} ledger entr${response.applied.ledgerEntriesCreated === 1 ? "y" : "ies"}, ${response.applied.payoutIntentsCreated} payout intent${response.applied.payoutIntentsCreated === 1 ? "" : "s"}${budgetText} identified.`
        : `Financial Orchestrator applied: ${response.applied.ledgerEntriesCreated} ledger entr${response.applied.ledgerEntriesCreated === 1 ? "y" : "ies"}, ${response.applied.payoutIntentsCreated} payout intent${response.applied.payoutIntentsCreated === 1 ? "" : "s"}${budgetText} recorded. Audit log ${response.applied.auditLogId ?? "not created"}.`);
      onEvent?.(dryRun
        ? `Financial Orchestrator previewed ${response.applied.payoutIntentsCreated} approval-locked payout intent${response.applied.payoutIntentsCreated === 1 ? "" : "s"} and ${response.applied.scalingBudgetPackets} Ad/Growth budget packet${response.applied.scalingBudgetPackets === 1 ? "" : "s"}.`
        : `Financial Orchestrator recorded ${response.applied.payoutIntentsCreated} approval-locked payout intent${response.applied.payoutIntentsCreated === 1 ? "" : "s"} and ${response.applied.scalingBudgetPackets} Ad/Growth budget packet${response.applied.scalingBudgetPackets === 1 ? "" : "s"}. No money was moved.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Financial Orchestrator apply failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadFinancialPayoutReview() {
    setIsLoadingFinancialReview(true);
    setError(null);

    try {
      const response = await apiFetch<FinancialPayoutReviewResponse>("/merch/financial-orchestrator/payout-intents/review");
      setFinancialReviewPlan(response.plan);
      setFinancialReviewMessage(null);
      onEvent?.(`Financial payout review loaded ${response.plan.totals.reviewItems} intent${response.plan.totals.reviewItems === 1 ? "" : "s"} with ${formatMerchCurrency(response.plan.totals.pendingAmount)} pending.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Financial payout review failed.");
    } finally {
      setIsLoadingFinancialReview(false);
    }
  }

  async function reviewFinancialPayoutIntent(intent: FinancialPayoutReviewItem, action: FinancialPayoutReviewAction) {
    setReviewingFinancialIntentId(intent.id);
    setError(null);

    try {
      const response = await apiFetch<FinancialPayoutReviewApplyResponse>(`/merch/financial-orchestrator/payout-intents/${intent.id}/review`, {
        json: {
          action,
          confirm: action === "approve" ? "APPROVE FINANCIAL PAYOUT INTENT" : "REJECT FINANCIAL PAYOUT INTENT",
          note: action === "approve"
            ? "Approved for manual handoff only. No financial provider execution is authorized."
            : "Rejected from the Financial Orchestrator payout review queue."
        },
        method: "POST"
      });
      setFinancialReviewPlan(response.plan);
      setFinancialReviewMessage(action === "approve"
        ? `Payout intent approved for manual handoff. Audit log ${response.auditLogId}. No money moved.`
        : `Payout intent rejected. Audit log ${response.auditLogId}.`);
      onEvent?.(action === "approve"
        ? `Financial payout intent approved for manual handoff only. No money moved.`
        : `Financial payout intent rejected inside ENTRAL.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Financial payout review action failed.");
    } finally {
      setReviewingFinancialIntentId(null);
    }
  }

  async function loadFinancialScalingBudgetReview() {
    setIsLoadingFinancialScalingBudgetReview(true);
    setError(null);

    try {
      const response = await apiFetch<FinancialScalingBudgetReviewResponse>("/merch/financial-orchestrator/scaling-budgets/review");
      setFinancialScalingBudgetReviewPlan(response.plan);
      setFinancialScalingBudgetReviewMessage(null);
      onEvent?.(`Scaling budget review loaded ${response.plan.totals.reviewItems} packet${response.plan.totals.reviewItems === 1 ? "" : "s"} with ${formatMerchCurrency(response.plan.totals.pendingAmount)} pending.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Scaling budget review failed.");
    } finally {
      setIsLoadingFinancialScalingBudgetReview(false);
    }
  }

  async function reviewFinancialScalingBudget(packet: FinancialScalingBudgetPacketSnapshot, action: FinancialScalingBudgetReviewAction) {
    setReviewingFinancialScalingBudgetId(packet.id);
    setError(null);

    try {
      const response = await apiFetch<FinancialScalingBudgetReviewApplyResponse>(`/merch/financial-orchestrator/scaling-budgets/${packet.id}/review`, {
        json: {
          action,
          confirm: action === "approve" ? "APPROVE FINANCIAL SCALING BUDGET" : "REJECT FINANCIAL SCALING BUDGET",
          note: action === "approve"
            ? "Approved for internal manual scaling budget handoff only. No provider execution is authorized."
            : "Rejected from the Financial Orchestrator scaling budget review queue."
        },
        method: "POST"
      });
      setFinancialScalingBudgetReviewPlan(response.plan);
      setFinancialScalingBudgetReviewMessage(action === "approve"
        ? `Scaling budget approved for manual handoff. Audit log ${response.auditLogId}. No provider was contacted.`
        : `Scaling budget rejected. Audit log ${response.auditLogId}.`);
      onEvent?.(action === "approve"
        ? `Scaling budget approved for manual handoff only. No spend was executed.`
        : `Scaling budget rejected inside ENTRAL.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Scaling budget review action failed.");
    } finally {
      setReviewingFinancialScalingBudgetId(null);
    }
  }

  async function loadFinancialScalingSpendControl() {
    setIsLoadingFinancialScalingSpendControl(true);
    setError(null);

    try {
      const response = await apiFetch<FinancialScalingSpendControlResponse>("/merch/financial-orchestrator/scaling-spend-control");
      setFinancialScalingSpendControlPlan(response.plan);
      setFinancialScalingSpendControlMessage(null);
      onEvent?.(`Scaling spend controls prepared ${response.plan.totals.spendPackets} packet${response.plan.totals.spendPackets === 1 ? "" : "s"} from ${formatMerchCurrency(response.plan.totals.approvedBudgetAmount)} approved scale budget.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Scaling spend control failed.");
    } finally {
      setIsLoadingFinancialScalingSpendControl(false);
    }
  }

  async function runFinancialScalingSpendControl(dryRun: boolean) {
    const setBusy = dryRun ? setIsDryRunningFinancialScalingSpendControl : setIsApplyingFinancialScalingSpendControl;

    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<FinancialScalingSpendControlApplyResponse>("/merch/financial-orchestrator/scaling-spend-control/apply", {
        json: {
          confirm: "RECORD FINANCIAL SCALING SPEND CONTROLS",
          dryRun
        },
        method: "POST"
      });
      setFinancialScalingSpendControlPlan(response.plan);
      setFinancialScalingSpendControlMessage(dryRun
        ? `Scaling spend preview ready: ${response.applied.scalingSpendPacketsUpserted} spend control packet${response.applied.scalingSpendPacketsUpserted === 1 ? "" : "s"} identified.`
        : `Scaling spend controls recorded: ${response.applied.scalingSpendPacketsUpserted} packet${response.applied.scalingSpendPacketsUpserted === 1 ? "" : "s"}. Audit log ${response.applied.auditLogId ?? "not created"}. No spend executed.`);
      onEvent?.(dryRun
        ? `Scaling spend controls previewed ${response.applied.scalingSpendPacketsUpserted} manual packet${response.applied.scalingSpendPacketsUpserted === 1 ? "" : "s"}.`
        : `Scaling spend controls recorded internally. No provider was contacted and no money moved.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Scaling spend control apply failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadFinancialScalingExecutionLedger() {
    setIsLoadingFinancialScalingExecutionLedger(true);
    setError(null);

    try {
      const response = await apiFetch<FinancialScalingExecutionLedgerResponse>("/merch/financial-orchestrator/scaling-execution-ledger");
      setFinancialScalingExecutionLedgerPlan(response.plan);
      setFinancialScalingExecutionLedgerMessage(null);
      onEvent?.(`Scaling execution ledger loaded ${response.plan.totals.recordedEntries} outcome entr${response.plan.totals.recordedEntries === 1 ? "y" : "ies"} with ${response.plan.totals.scaleNext} next-scale recommendation${response.plan.totals.scaleNext === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Scaling execution ledger failed.");
    } finally {
      setIsLoadingFinancialScalingExecutionLedger(false);
    }
  }

  async function runFinancialScalingExecutionLedger(dryRun: boolean) {
    const packet = selectedScalingOutcomePacket;

    if (!packet) {
      setError("Record scaling spend controls before adding execution outcomes.");
      return;
    }

    const setBusy = dryRun ? setIsDryRunningFinancialScalingExecutionLedger : setIsApplyingFinancialScalingExecutionLedger;
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(now.getDate() - 7);

    setBusy(true);
    setError(null);

    try {
      const amountSpent = Number.isFinite(scalingOutcomeForm.amountSpent) ? Math.max(0, scalingOutcomeForm.amountSpent) : 0;
      const grossRevenue = Number.isFinite(scalingOutcomeForm.grossRevenue) ? Math.max(0, scalingOutcomeForm.grossRevenue) : 0;
      const netProfit = Number.isFinite(scalingOutcomeForm.netProfit) ? scalingOutcomeForm.netProfit : 0;
      const unitsSold = Number.isFinite(scalingOutcomeForm.unitsSold) ? Math.max(0, Math.floor(scalingOutcomeForm.unitsSold)) : 0;
      const visits = Number.isFinite(scalingOutcomeForm.visits) ? Math.max(0, Math.floor(scalingOutcomeForm.visits)) : 0;
      const notes = scalingOutcomeForm.notes.trim() || (dryRun
        ? "Preview internal scaling outcome evidence. No spend, provider call, upload, or payout is executed."
        : "Recorded internal scaling outcome evidence from manual operator review. No spend, provider call, upload, or payout was executed.");
      const response = await apiFetch<FinancialScalingExecutionLedgerApplyResponse>("/merch/financial-orchestrator/scaling-execution-ledger/entries", {
        json: {
          confirm: "INGEST INTERNAL SCALING EXECUTION OUTCOMES",
          dryRun,
          entries: [
            {
              amountSpent,
              grossRevenue,
              netProfit,
              notes,
              outcome: scalingOutcomeForm.outcome,
              periodEnd: now.toISOString(),
              periodStart: periodStart.toISOString(),
              scalingSpendPacketId: packet.recordId,
              source: scalingOutcomeForm.source,
              unitsSold,
              visits
            }
          ]
        },
        method: "POST"
      });
      setFinancialScalingExecutionLedgerPlan(response.plan);
      setFinancialScalingExecutionLedgerMessage(dryRun
        ? `Scaling outcome preview ready: ${response.applied.entriesRecorded} entr${response.applied.entriesRecorded === 1 ? "y" : "ies"} scored.`
        : `Scaling outcome recorded: ${response.applied.entriesRecorded} entr${response.applied.entriesRecorded === 1 ? "y" : "ies"}. Audit log ${response.applied.auditLogId ?? "not created"}. No external action executed.`);
      onEvent?.(dryRun
        ? `Scaling execution outcome previewed for ${packet.assetName}.`
        : `Scaling execution outcome recorded internally for ${packet.assetName}. No money moved.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Scaling execution ledger apply failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadFinancialReleaseGovernance() {
    setIsLoadingFinancialGovernance(true);
    setError(null);

    try {
      const response = await apiFetch<FinancialReleaseGovernanceResponse>("/merch/financial-orchestrator/release-governance");
      setFinancialGovernancePlan(response.plan);
      setFinancialGovernanceMessage(null);
      onEvent?.(`Release governance prepared ${response.plan.totals.budgetReleasePackets} packet${response.plan.totals.budgetReleasePackets === 1 ? "" : "s"} with ${response.plan.totals.highRiskIntents} high-risk intent${response.plan.totals.highRiskIntents === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Financial release governance failed.");
    } finally {
      setIsLoadingFinancialGovernance(false);
    }
  }

  async function runFinancialReleaseGovernance(dryRun: boolean) {
    const setBusy = dryRun ? setIsDryRunningFinancialGovernance : setIsApplyingFinancialGovernance;

    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<FinancialReleaseGovernanceApplyResponse>("/merch/financial-orchestrator/release-governance/apply", {
        json: {
          confirm: "RECORD FINANCIAL RELEASE GOVERNANCE",
          dryRun
        },
        method: "POST"
      });
      setFinancialGovernancePlan(response.plan);
      setFinancialGovernanceMessage(dryRun
        ? `Release governance preview ready: ${response.applied.budgetReleasePacketsUpserted} packet${response.applied.budgetReleasePacketsUpserted === 1 ? "" : "s"} and 1 reconciliation report identified.`
        : `Release governance recorded: ${response.applied.budgetReleasePacketsUpserted} packet${response.applied.budgetReleasePacketsUpserted === 1 ? "" : "s"} and reconciliation report ${response.applied.reconciliationReportId ?? "not created"}. Audit log ${response.applied.auditLogId ?? "not created"}.`);
      onEvent?.(dryRun
        ? "Financial release governance previewed. Stripe was not contacted."
        : "Financial release governance recorded. Stripe was not contacted and no money moved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Financial release governance apply failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadPortfolioCommandCenter() {
    setIsLoadingPortfolioCommand(true);
    setError(null);

    try {
      const response = await apiFetch<PortfolioCommandCenterResponse>("/merch/portfolio-command-center");
      setPortfolioCommandPlan(response.plan);
      setPortfolioCommandBatchReview(null);
      setPortfolioCommandMessage(null);
      onEvent?.(`Portfolio Command Center prioritized ${response.plan.totals.commandActions} command action${response.plan.totals.commandActions === 1 ? "" : "s"} with ${response.plan.totals.highRiskCommands} high-risk command${response.plan.totals.highRiskCommands === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Portfolio Command Center check failed.");
    } finally {
      setIsLoadingPortfolioCommand(false);
    }
  }

  async function runPortfolioCommandCenter(dryRun: boolean) {
    const setBusy = dryRun ? setIsDryRunningPortfolioCommand : setIsApplyingPortfolioCommand;

    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<PortfolioCommandCenterApplyResponse>("/merch/portfolio-command-center/actions/apply", {
        json: {
          confirm: "APPLY INTERNAL PORTFOLIO COMMAND ACTIONS",
          dryRun
        },
        method: "POST"
      });
      const statusUpdates = response.applied.productUpdates.length + response.applied.storeUpdates.length;
      const assetControls = response.applied.assetControlRecordsCreated;
      const skippedAssetControls = response.applied.assetControlActionsSkipped;
      const assetControlSummary = assetControls > 0 || skippedAssetControls > 0
        ? ` ${assetControls} asset-control ledger record${assetControls === 1 ? "" : "s"} ${dryRun ? "identified" : "created"}${skippedAssetControls > 0 ? `; ${skippedAssetControls} duplicate or stale action${skippedAssetControls === 1 ? "" : "s"} skipped` : ""}.`
        : "";
      setPortfolioCommandPlan(response.plan);
      setPortfolioCommandBatchReview(response.applied.assetControlBatchReview);
      setPortfolioCommandMessage(dryRun
        ? `Command preview ready: ${response.applied.commandRecordsCreated} record${response.applied.commandRecordsCreated === 1 ? "" : "s"} and ${statusUpdates} internal status update${statusUpdates === 1 ? "" : "s"} identified.${assetControlSummary}`
        : `Portfolio commands recorded: ${response.applied.commandRecordsCreated} command record${response.applied.commandRecordsCreated === 1 ? "" : "s"} and ${statusUpdates} internal status update${statusUpdates === 1 ? "" : "s"} applied.${assetControlSummary} Audit log ${response.applied.auditLogId ?? "not created"}.`);
      onEvent?.(dryRun
        ? `Portfolio Command Center previewed ${response.applied.commandRecordsCreated} internal command${response.applied.commandRecordsCreated === 1 ? "" : "s"}.`
        : "Portfolio Command Center recorded internal command actions. No providers, payouts, uploads, or browser automation ran.");

      if (!dryRun && statusUpdates > 0) {
        onRefreshStores();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Portfolio Command Center apply failed.");
    } finally {
      setBusy(false);
    }
  }

  async function ingestPerformanceSnapshot() {
    const snapshot = buildManualPerformanceSnapshot();

    if (!snapshot) {
      setError("Select a Client Merch Store before ingesting performance.");
      return;
    }

    setIsIngestingPerformance(true);
    setError(null);

    try {
      const response = await apiFetch<RevenuePerformanceIngestResponse>("/merch/revenue-engine/performance/snapshots", {
        json: {
          confirm: "INGEST INTERNAL PERFORMANCE SNAPSHOTS",
          dryRun: false,
          snapshots: [snapshot]
        },
        method: "POST"
      });
      setPerformanceDigest(response.digest);
      setPerformanceMessage(`Performance snapshot ingested: ${response.ingested.snapshots} record${response.ingested.snapshots === 1 ? "" : "s"} stored. Audit log ${response.ingested.auditLogId ?? "not created"}.`);
      onEvent?.(`Revenue performance snapshot ingested for ${selectedStore?.businessName ?? "selected store"}. External analytics imports remain locked.`);
      onRefreshStores();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Performance snapshot ingest failed.");
    } finally {
      setIsIngestingPerformance(false);
    }
  }

  async function runPerformanceRotation(dryRun: boolean) {
    const setBusy = dryRun ? setIsDryRunningPerformanceRotation : setIsApplyingPerformanceRotation;

    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<RevenuePerformanceRotationApplyResponse>("/merch/revenue-engine/performance/rotation/apply", {
        json: {
          confirm: "APPLY PERFORMANCE ROTATION",
          dryRun
        },
        method: "POST"
      });
      const rotationCount = response.applied.productUpdates.length + response.applied.storeUpdates.length;
      setPerformanceDigest(response.digest);
      setPerformanceMessage(dryRun
        ? `Performance preview ready: ${rotationCount} internal rotation change${rotationCount === 1 ? "" : "s"} identified.`
        : `Performance rotation applied: ${rotationCount} change${rotationCount === 1 ? "" : "s"} recorded. Audit log ${response.applied.auditLogId ?? "not created"}.`);
      onEvent?.(dryRun
        ? `Performance rotation preview identified ${rotationCount} internal change${rotationCount === 1 ? "" : "s"}.`
        : `Performance rotation applied ${rotationCount} internal change${rotationCount === 1 ? "" : "s"}. No external systems were contacted.`);

      if (!dryRun) {
        onRefreshStores();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Performance rotation failed.");
    } finally {
      setBusy(false);
    }
  }

  function launchCreatedProductCount(applied: RevenueLaunchPipelineApplyResponse["applied"]) {
    return Array.isArray(applied.createdProducts) ? applied.createdProducts.length : applied.createdProducts;
  }

  function digitalCreatedProductCount(applied: DigitalProductApplyResponse["applied"]) {
    return Array.isArray(applied.createdProducts) ? applied.createdProducts.length : applied.createdProducts;
  }

  async function loadRevenueLaunchPipeline() {
    setIsLoadingLaunchPipeline(true);
    setError(null);

    try {
      const response = await apiFetch<RevenueLaunchPipelineResponse>("/merch/revenue-engine/launch-pipeline");
      setLaunchPipelinePlan(response.plan);
      setLaunchPipelineMessage(null);
      onEvent?.(`Launch Pipeline queued ${response.plan.queue.length} internal action${response.plan.queue.length === 1 ? "" : "s"} across ${response.plan.totals.storesEvaluated} stores.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue launch pipeline check failed.");
    } finally {
      setIsLoadingLaunchPipeline(false);
    }
  }

  async function runRevenueLaunchPipeline(dryRun: boolean) {
    const setBusy = dryRun ? setIsDryRunningLaunchPipeline : setIsApplyingLaunchPipeline;

    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<RevenueLaunchPipelineApplyResponse>("/merch/revenue-engine/launch-pipeline/apply", {
        json: {
          confirm: "CREATE INTERNAL LAUNCH QUEUE",
          dryRun
        },
        method: "POST"
      });
      const productCount = launchCreatedProductCount(response.applied);
      const packetCount = response.applied.approvalPackets.length;
      setLaunchPipelinePlan(response.plan);
      setLaunchPipelineMessage(dryRun
        ? `Launch preview ready: ${productCount} draft products and ${packetCount} approval packet${packetCount === 1 ? "" : "s"} would be queued.`
        : `Internal launch queue applied: ${productCount} product draft${productCount === 1 ? "" : "s"} and ${packetCount} approval packet${packetCount === 1 ? "" : "s"} recorded. Audit log ${response.applied.auditLogId ?? "not created"}.`);
      onEvent?.(dryRun
        ? `Revenue Launch Pipeline previewed ${productCount} internal product draft${productCount === 1 ? "" : "s"} and ${packetCount} approval packet${packetCount === 1 ? "" : "s"}.`
        : `Revenue Launch Pipeline created ${productCount} internal product draft${productCount === 1 ? "" : "s"} and ${packetCount} approval packet${packetCount === 1 ? "" : "s"}. No external systems were contacted.`);

      if (!dryRun) {
        onRefreshStores();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue launch pipeline apply failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadDigitalProductPortfolio() {
    setIsLoadingDigitalProducts(true);
    setError(null);

    try {
      const response = await apiFetch<DigitalProductPortfolioResponse>("/merch/revenue-engine/digital-products");
      setDigitalProductPlan(response.plan);
      setDigitalProductMessage(null);
      onEvent?.(`Digital Product Portfolio queued ${response.plan.totals.queuedDrafts} internal digital draft${response.plan.totals.queuedDrafts === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Digital product portfolio check failed.");
    } finally {
      setIsLoadingDigitalProducts(false);
    }
  }

  async function runDigitalProductQueue(dryRun: boolean) {
    const setBusy = dryRun ? setIsDryRunningDigitalProducts : setIsApplyingDigitalProducts;

    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<DigitalProductApplyResponse>("/merch/revenue-engine/digital-products/apply", {
        json: {
          confirm: "CREATE INTERNAL DIGITAL PRODUCT QUEUE",
          dryRun
        },
        method: "POST"
      });
      const productCount = digitalCreatedProductCount(response.applied);
      setDigitalProductPlan(response.plan);
      setDigitalProductMessage(dryRun
        ? `Digital preview ready: ${productCount} internal digital product draft${productCount === 1 ? "" : "s"} would be queued.`
        : `Internal digital queue applied: ${productCount} digital product draft${productCount === 1 ? "" : "s"} recorded. Audit log ${response.applied.auditLogId ?? "not created"}.`);
      onEvent?.(dryRun
        ? `Digital Product Portfolio previewed ${productCount} internal draft${productCount === 1 ? "" : "s"}.`
        : `Digital Product Portfolio created ${productCount} internal draft${productCount === 1 ? "" : "s"}. No external systems were contacted.`);

      if (!dryRun) {
        onRefreshStores();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Digital product queue apply failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadFacelessContentPipeline() {
    setIsLoadingFacelessContent(true);
    setError(null);

    try {
      const response = await apiFetch<FacelessContentPipelineResponse>("/merch/faceless-content/pipeline");
      setFacelessContentPlan(response.plan);
      setFacelessContentDigest(response.plan.performanceDigest);
      setFacelessContentMessage(null);
      onEvent?.(`Faceless Content Pipeline prepared ${response.plan.totals.newBriefs} new internal brief${response.plan.totals.newBriefs === 1 ? "" : "s"} across ${response.plan.totals.storesEvaluated} store${response.plan.totals.storesEvaluated === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Faceless Content Pipeline check failed.");
    } finally {
      setIsLoadingFacelessContent(false);
    }
  }

  async function runFacelessContentPipeline(dryRun: boolean) {
    const setBusy = dryRun ? setIsDryRunningFacelessContent : setIsApplyingFacelessContent;

    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<FacelessContentPipelineApplyResponse>("/merch/faceless-content/pipeline/apply", {
        json: {
          confirm: "CREATE INTERNAL FACELESS CONTENT PIPELINE",
          dryRun
        },
        method: "POST"
      });
      setFacelessContentPlan(response.plan);
      setFacelessContentDigest(response.plan.performanceDigest);
      setFacelessContentMessage(dryRun
        ? `Content preview ready: ${response.applied.briefsCreated} internal brief${response.applied.briefsCreated === 1 ? "" : "s"} would be recorded.`
        : `Faceless content queue recorded: ${response.applied.briefsCreated} brief${response.applied.briefsCreated === 1 ? "" : "s"} stored. Audit log ${response.applied.auditLogId ?? "not created"}.`);
      onEvent?.(dryRun
        ? "Faceless Content Pipeline previewed internal briefs. No providers were contacted."
        : "Faceless Content Pipeline recorded internal briefs. No providers were contacted and nothing was uploaded.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Faceless Content Pipeline apply failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadFacelessContentPerformance() {
    setIsLoadingFacelessPerformance(true);
    setError(null);

    try {
      const response = await apiFetch<FacelessContentPerformanceResponse>("/merch/faceless-content/performance");
      setFacelessContentDigest(response.digest);
      onEvent?.(`Faceless content performance loaded ${response.digest.totals.snapshots} snapshot${response.digest.totals.snapshots === 1 ? "" : "s"} with ${response.digest.totals.views} views.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Faceless content performance check failed.");
    } finally {
      setIsLoadingFacelessPerformance(false);
    }
  }

  async function loadGrowthApprovals() {
    if (!selectedStore) {
      setError("Select a Client Merch Store before loading growth approvals.");
      return;
    }

    setIsLoadingGrowthApprovals(true);
    setError(null);

    try {
      const response = await apiFetch<GrowthApprovalListResponse>(`/merch/stores/${selectedStore.id}/growth-approvals`);
      setGrowthApprovals(response.items);
      onEvent?.(`Loaded ${response.items.length} growth approval packet${response.items.length === 1 ? "" : "s"} for ${selectedStore.businessName}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Growth approval queue could not be loaded.");
    } finally {
      setIsLoadingGrowthApprovals(false);
    }
  }

  async function requestGrowthApproval() {
    if (!selectedStore || !growthPlan) {
      setError("Build a growth plan before queuing an approval packet.");
      return;
    }

    let scheduledFor: string | undefined;

    if (growthApprovalSchedule) {
      const scheduledDate = new Date(growthApprovalSchedule);

      if (Number.isNaN(scheduledDate.getTime())) {
        setError("Choose a valid approval review time.");
        return;
      }

      scheduledFor = scheduledDate.toISOString();
    }

    setIsRequestingGrowthApproval(true);
    setError(null);

    try {
      const response = await apiFetch<GrowthApprovalResponse>(`/merch/stores/${selectedStore.id}/growth-plan/approval-request`, {
        json: {
          note: "Queued from the Growth & Scale Plan panel for human review.",
          scheduledFor
        },
        method: "POST"
      });
      setGrowthApprovalResponse(response);
      upsertGrowthApproval(response.approval);
      setGrowthApprovalMessage("Approval packet queued. External execution remains locked.");
      onEvent?.(`Growth approval packet queued for ${selectedStore.businessName}. Posting, storefront changes, ad spend, and analytics imports remain locked.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Growth approval packet could not be queued.");
    } finally {
      setIsRequestingGrowthApproval(false);
    }
  }

  async function reviewGrowthApproval(approval: GrowthApprovalRecord, action: "approve" | "reject") {
    if (!selectedStore) {
      setError("Select a Client Merch Store before reviewing growth approvals.");
      return;
    }

    setReviewingGrowthApprovalId(approval.id);
    setError(null);
    setGrowthApprovalMessage(null);

    try {
      const response = await apiFetch<GrowthApprovalReviewResponse>(`/merch/stores/${selectedStore.id}/growth-approvals/${approval.id}/${action}`, {
        json: {
          note: action === "approve"
            ? "Approved for preparation only. External execution remains locked."
            : "Rejected from the Growth & Scale Plan review queue."
        },
        method: "POST"
      });
      upsertGrowthApproval(response.approval);
      setGrowthApprovalMessage(response.message);
      setGrowthOrchestrationPreview(null);
      setProviderHandoffResponse(null);
      onEvent?.(response.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Growth approval review failed.");
    } finally {
      setReviewingGrowthApprovalId(null);
    }
  }

  async function previewGrowthOrchestration(approval: GrowthApprovalRecord) {
    if (!selectedStore) {
      setError("Select a Client Merch Store before previewing growth orchestration.");
      return;
    }

    setPreviewingGrowthApprovalId(approval.id);
    setError(null);

    try {
      const response = await apiFetch<GrowthOrchestrationPreviewResponse>(`/merch/stores/${selectedStore.id}/growth-approvals/${approval.id}/orchestration-preview`);
      setGrowthOrchestrationPreview(response);
      setGrowthApprovalMessage("Read-only orchestration preview generated. No external systems were contacted.");
      onEvent?.("Read-only growth orchestration preview generated. External execution remains locked.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Growth orchestration preview failed.");
    } finally {
      setPreviewingGrowthApprovalId(null);
    }
  }

  async function buildProviderHandoff(approval: GrowthApprovalRecord) {
    if (!selectedStore) {
      setError("Select a Client Merch Store before building a provider handoff bundle.");
      return;
    }

    setBuildingProviderHandoffId(approval.id);
    setError(null);

    try {
      const response = await apiFetch<ProviderHandoffResponse>(`/merch/stores/${selectedStore.id}/growth-approvals/${approval.id}/provider-handoff`);
      setProviderHandoffResponse(response);
      setGrowthApprovalMessage("Provider handoff bundle generated. External execution remains locked.");
      onEvent?.(`Provider handoff bundle generated for ${approval.packet.businessName}. No provider was contacted.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Provider handoff bundle failed.");
    } finally {
      setBuildingProviderHandoffId(null);
    }
  }

  function dayLabel(days: number | null) {
    if (days === null) return "blocked";
    if (days === 0) return "active";

    return `${days} day${days === 1 ? "" : "s"}`;
  }

  return (
    <section className="merch-operations-panel" aria-label="Merch service operations">
      <header>
        <span className="product-batch-icon">
          <PackageCheck aria-hidden="true" size={17} />
        </span>
        <div>
          <p className="eyebrow">Merch command</p>
          <h3>Operations, Pricing & Reports</h3>
          <small>Manual approval remains required before publishing, contacting clients, deleting records, or changing launch status.</small>
        </div>
      </header>

      <div className="merch-ops-grid">
        <label>
          <span>Client Merch Store</span>
          <select value={selectedStore?.id ?? ""} onChange={(event) => setSelectedStoreId(event.target.value)} disabled={isLoadingStores}>
            <option value="">{isLoadingStores ? "Loading stores..." : "Select store"}</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.businessName} / {store.clientName}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Automation Level</span>
          <select value={automationLevel} onChange={(event) => updateAutomationLevel(event.target.value as MerchAutomationLevel)}>
            {merchAutomationLevels.map((level) => (
              <option key={level.value} value={level.value}>{level.label}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="merch-automation-note">
        <strong>{selectedAutomationLevel.label}</strong>
        <span>{selectedAutomationLevel.description}</span>
      </p>

      <div className="merch-ops-actions">
        <button type="button" onClick={onRefreshStores} disabled={isLoadingStores}>
          {isLoadingStores ? <Loader2 aria-hidden="true" size={15} /> : <RefreshCcw aria-hidden="true" size={15} />}
          Refresh stores
        </button>
      </div>

      <div className="merch-revenue-card">
        <div className="merch-tool-title">
          <Gauge aria-hidden="true" size={16} />
          <strong>Revenue Engine</strong>
        </div>
        <p className="merch-automation-note">
          <strong>Internal Portfolio Mode</strong>
          <span>Scores stores and products, queues scale paths, and rotates weak assets inside ENTRAL records.</span>
        </p>
        <div className="merch-ops-actions split">
          <button type="button" className="primary" onClick={loadPortfolioCommandCenter} disabled={isLoadingPortfolioCommand}>
            {isLoadingPortfolioCommand ? <Loader2 aria-hidden="true" size={15} /> : <Gauge aria-hidden="true" size={15} />}
            Build command center
          </button>
          <button type="button" onClick={() => void runPortfolioCommandCenter(true)} disabled={isDryRunningPortfolioCommand}>
            {isDryRunningPortfolioCommand ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Preview commands
          </button>
          <button type="button" onClick={() => void runPortfolioCommandCenter(false)} disabled={isApplyingPortfolioCommand || !portfolioCommandPlan || portfolioCommandPlan.commandActions.length === 0}>
            {isApplyingPortfolioCommand ? <Loader2 aria-hidden="true" size={15} /> : <LockKeyhole aria-hidden="true" size={15} />}
            Record commands
          </button>
        </div>
        <div className="merch-ops-actions split">
          <button type="button" className="primary" onClick={() => void loadRevenuePortfolioDashboard()} disabled={isLoadingRevenueDashboard}>
            {isLoadingRevenueDashboard ? <Loader2 aria-hidden="true" size={15} /> : <LineChart aria-hidden="true" size={15} />}
            Load dashboard
          </button>
          <button type="button" className="primary" onClick={loadFirstCashReadiness} disabled={isLoadingFirstCashReadiness}>
            {isLoadingFirstCashReadiness ? <Loader2 aria-hidden="true" size={15} /> : <Rocket aria-hidden="true" size={15} />}
            Load first cash
          </button>
          <button type="button" className="primary" onClick={loadFirstCashSprint} disabled={isLoadingFirstCashSprint}>
            {isLoadingFirstCashSprint ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Build first-cash sprint
          </button>
          <button type="button" onClick={() => void runFirstCashSprint(true)} disabled={isPreviewingFirstCashSprint || !firstCashSprint || firstCashSprint.totals.eligibleBridgeActions === 0}>
            {isPreviewingFirstCashSprint ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Preview first-cash sprint
          </button>
          <button type="button" onClick={() => void runFirstCashSprint(false)} disabled={isRunningFirstCashSprint || !firstCashSprint || firstCashSprint.totals.eligibleBridgeActions === 0}>
            {isRunningFirstCashSprint ? <Loader2 aria-hidden="true" size={15} /> : <LockKeyhole aria-hidden="true" size={15} />}
            Run first-cash sprint
          </button>
          <button type="button" className="primary" onClick={loadFirstBusinessLaunch} disabled={isLoadingFirstBusinessLaunch}>
            {isLoadingFirstBusinessLaunch ? <Loader2 aria-hidden="true" size={15} /> : <Rocket aria-hidden="true" size={15} />}
            Build first business
          </button>
          <button type="button" onClick={() => void runFirstBusinessLaunch(true)} disabled={isPreviewingFirstBusinessLaunch || !firstBusinessLaunch || firstBusinessLaunch.totals.readyInternal === 0}>
            {isPreviewingFirstBusinessLaunch ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Preview first business
          </button>
          <button type="button" onClick={() => void runFirstBusinessLaunch(false)} disabled={isRunningFirstBusinessLaunch || !firstBusinessLaunch || firstBusinessLaunch.totals.readyInternal === 0}>
            {isRunningFirstBusinessLaunch ? <Loader2 aria-hidden="true" size={15} /> : <LockKeyhole aria-hidden="true" size={15} />}
            Run first business
          </button>
          <button type="button" className="primary" onClick={loadRevenueEnginePortfolio} disabled={isLoadingRevenuePlan}>
            {isLoadingRevenuePlan ? <Loader2 aria-hidden="true" size={15} /> : <Gauge aria-hidden="true" size={15} />}
            Run engine
          </button>
          <button type="button" className="primary" onClick={loadBusinessFleetScheduler} disabled={isLoadingBusinessFleet}>
            {isLoadingBusinessFleet ? <Loader2 aria-hidden="true" size={15} /> : <LineChart aria-hidden="true" size={15} />}
            Load fleet scheduler
          </button>
          <button type="button" onClick={() => void loadBusinessFleetLaunchGap()} disabled={isLoadingBusinessFleetGap}>
            {isLoadingBusinessFleetGap ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Load launch gap
          </button>
          <button type="button" className="primary" onClick={() => void loadMoneyArmyPipeline()} disabled={isLoadingMoneyArmyPipeline}>
            {isLoadingMoneyArmyPipeline ? <Loader2 aria-hidden="true" size={15} /> : <Rocket aria-hidden="true" size={15} />}
            Load Money Army
          </button>
          <button type="button" className="primary" onClick={() => void loadMoneyArmyGenerateScoreBatch()} disabled={isGeneratingMoneyArmyScoreBatch}>
            {isGeneratingMoneyArmyScoreBatch ? <Loader2 aria-hidden="true" size={15} /> : <Gauge aria-hidden="true" size={15} />}
            Generate score batch
          </button>
          <button type="button" onClick={() => void recordMoneyArmyGenerateScoreBatch()} disabled={isRecordingMoneyArmyScoreBatch || !moneyArmyGenerateScoreBatch || moneyArmyGenerateScoreBatch.totals.generated === 0}>
            {isRecordingMoneyArmyScoreBatch ? <Loader2 aria-hidden="true" size={15} /> : <LockKeyhole aria-hidden="true" size={15} />}
            Record score batch
          </button>
          <button type="button" className="primary" onClick={() => void generateFirstBusinessPackage()} disabled={isGeneratingFirstBusinessPackage}>
            {isGeneratingFirstBusinessPackage ? <Loader2 aria-hidden="true" size={15} /> : <PackageCheck aria-hidden="true" size={15} />}
            Generate first package
          </button>
          <button type="button" onClick={() => void recordFirstBusinessPackage()} disabled={isRecordingFirstBusinessPackage || !firstBusinessPackage}>
            {isRecordingFirstBusinessPackage ? <Loader2 aria-hidden="true" size={15} /> : <LockKeyhole aria-hidden="true" size={15} />}
            Record first package
          </button>
          <button type="button" onClick={() => void runMoneyArmyPipeline(true)} disabled={isPreviewingMoneyArmyPipeline || !moneyArmyPipeline || !moneyArmyPipeline.nextStage}>
            {isPreviewingMoneyArmyPipeline ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Preview batch stage
          </button>
          <button type="button" onClick={() => void runMoneyArmyPipeline(false)} disabled={isRunningMoneyArmyPipeline || !moneyArmyPipeline || !moneyArmyPipeline.nextStage}>
            {isRunningMoneyArmyPipeline ? <Loader2 aria-hidden="true" size={15} /> : <LockKeyhole aria-hidden="true" size={15} />}
            Run batch stage
          </button>
          <button type="button" onClick={() => void runBusinessFleetGapSeeds(true)} disabled={isPreviewingBusinessFleetGapSeeds || !businessFleetGapPlan || businessFleetGapPlan.opportunitySeeds.length === 0}>
            {isPreviewingBusinessFleetGapSeeds ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Preview gap seeds
          </button>
          <button type="button" onClick={() => void runBusinessFleetGapSeeds(false)} disabled={isCreatingBusinessFleetGapSeeds || !businessFleetGapPlan || businessFleetGapPlan.opportunitySeeds.length === 0}>
            {isCreatingBusinessFleetGapSeeds ? <Loader2 aria-hidden="true" size={15} /> : <LockKeyhole aria-hidden="true" size={15} />}
            Create gap seeds
          </button>
          <button type="button" onClick={() => void runBusinessFleetGapAcceleration(true)} disabled={isPreviewingBusinessFleetGapAcceleration || businessFleetGapSeedResults.length === 0 || !businessFleetGapSeedReceipt || businessFleetGapSeedReceipt.dryRun}>
            {isPreviewingBusinessFleetGapAcceleration ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Preview seed acceleration
          </button>
          <button type="button" onClick={() => void runBusinessFleetGapAcceleration(false)} disabled={isRunningBusinessFleetGapAcceleration || businessFleetGapSeedResults.length === 0 || !businessFleetGapSeedReceipt || businessFleetGapSeedReceipt.dryRun}>
            {isRunningBusinessFleetGapAcceleration ? <Loader2 aria-hidden="true" size={15} /> : <LockKeyhole aria-hidden="true" size={15} />}
            Run seed acceleration
          </button>
          <button type="button" onClick={() => void runBusinessFleetLiveLaunchPackage(true)} disabled={isPreviewingBusinessFleetLiveLaunchPackage || businessFleetGapSeedResults.length === 0 || !businessFleetGapAccelerationReceipt || businessFleetGapAccelerationReceipt.dryRun}>
            {isPreviewingBusinessFleetLiveLaunchPackage ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Preview live package
          </button>
          <button type="button" onClick={() => void runBusinessFleetLiveLaunchPackage(false)} disabled={isRecordingBusinessFleetLiveLaunchPackage || businessFleetGapSeedResults.length === 0 || !businessFleetGapAccelerationReceipt || businessFleetGapAccelerationReceipt.dryRun}>
            {isRecordingBusinessFleetLiveLaunchPackage ? <Loader2 aria-hidden="true" size={15} /> : <LockKeyhole aria-hidden="true" size={15} />}
            Record live package
          </button>
          <button type="button" onClick={() => void loadBusinessFleetLaunchGate()} disabled={isLoadingBusinessFleetLaunchGate || businessFleetGapSeedResults.length === 0 || !businessFleetLiveLaunchPackageReceipt}>
            {isLoadingBusinessFleetLaunchGate ? <Loader2 aria-hidden="true" size={15} /> : <ShieldAlert aria-hidden="true" size={15} />}
            Load launch gate
          </button>
          <button type="button" onClick={() => void loadBusinessFleetProviderApprovalReview()} disabled={isLoadingBusinessFleetProviderApprovalReview || businessFleetGapSeedResults.length === 0 || !businessFleetLiveLaunchPackageReceipt || businessFleetLiveLaunchPackageReceipt.dryRun}>
            {isLoadingBusinessFleetProviderApprovalReview ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Load provider approvals
          </button>
          <button type="button" onClick={() => void runBusinessFleetProviderApprovalReview(true)} disabled={isPreviewingBusinessFleetProviderApprovalReview || businessFleetGapSeedResults.length === 0 || !businessFleetProviderApprovalReview || businessFleetProviderApprovalReview.totals.approvable === 0}>
            {isPreviewingBusinessFleetProviderApprovalReview ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Preview approval batch
          </button>
          <button type="button" onClick={() => void runBusinessFleetProviderApprovalReview(false)} disabled={isApplyingBusinessFleetProviderApprovalReview || businessFleetGapSeedResults.length === 0 || !businessFleetProviderApprovalReview || businessFleetProviderApprovalReview.totals.approvable === 0}>
            {isApplyingBusinessFleetProviderApprovalReview ? <Loader2 aria-hidden="true" size={15} /> : <LockKeyhole aria-hidden="true" size={15} />}
            Approve provider batch
          </button>
          <button type="button" onClick={() => void runBusinessFleetLaunchWave(true)} disabled={isPreviewingBusinessFleetWave || !businessFleetPlan || businessFleetPlan.launchWave.filter((business) => business.scheduleState === "ready_parallel").length === 0}>
            {isPreviewingBusinessFleetWave ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Preview launch wave
          </button>
          <button type="button" onClick={() => void runBusinessFleetLaunchWave(false)} disabled={isRunningBusinessFleetWave || !businessFleetPlan || businessFleetPlan.launchWave.filter((business) => business.scheduleState === "ready_parallel").length === 0}>
            {isRunningBusinessFleetWave ? <Loader2 aria-hidden="true" size={15} /> : <LockKeyhole aria-hidden="true" size={15} />}
            Run launch wave
          </button>
          <button type="button" onClick={() => void runRevenueRotation(true)} disabled={isDryRunningRotation}>
            {isDryRunningRotation ? <Loader2 aria-hidden="true" size={15} /> : <PauseCircle aria-hidden="true" size={15} />}
            Preview rotation
          </button>
          <button type="button" onClick={() => void runRevenueRotation(false)} disabled={isApplyingRotation || !revenuePlan || revenuePlan.rotationChanges.length === 0}>
            {isApplyingRotation ? <Loader2 aria-hidden="true" size={15} /> : <Rocket aria-hidden="true" size={15} />}
            Apply internal rotation
          </button>
          <button type="button" onClick={() => void loadRevenueAssetControlLedger()} disabled={isLoadingAssetControlLedger}>
            {isLoadingAssetControlLedger ? <Loader2 aria-hidden="true" size={15} /> : <LineChart aria-hidden="true" size={15} />}
            Load action ledger
          </button>
          <button type="button" onClick={() => void loadRevenueAssetControlRecovery()} disabled={isLoadingAssetControlRecovery}>
            {isLoadingAssetControlRecovery ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Load recovery
          </button>
          <button type="button" onClick={() => void loadRevenueAssetReviewQueue()} disabled={isLoadingAssetReviewQueue}>
            {isLoadingAssetReviewQueue ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Load asset review queue
          </button>
        </div>
        <div className="merch-ops-grid compact">
          <label>
            <span>Ledger Action</span>
            <select value={assetControlLedgerQuery.action ?? ""} onChange={(event) => updateAssetControlLedgerQuery("action", event.target.value as RevenueAssetControlLedgerQuery["action"])}>
              <option value="">All actions</option>
              {revenueAssetControlActions.map((action) => <option key={action} value={action}>{action}</option>)}
            </select>
          </label>
          <label>
            <span>Ledger Asset Type</span>
            <select value={assetControlLedgerQuery.assetType ?? ""} onChange={(event) => updateAssetControlLedgerQuery("assetType", event.target.value as RevenueAssetControlLedgerQuery["assetType"])}>
              <option value="">All types</option>
              <option value="product">product</option>
              <option value="store">store</option>
            </select>
          </label>
          <label>
            <span>Ledger Asset ID</span>
            <input type="text" value={assetControlLedgerQuery.assetId ?? ""} onChange={(event) => updateAssetControlLedgerQuery("assetId", event.target.value)} />
          </label>
          <label>
            <span>Ledger Store ID</span>
            <input type="text" value={assetControlLedgerQuery.storeId ?? ""} onChange={(event) => updateAssetControlLedgerQuery("storeId", event.target.value)} />
          </label>
          <label>
            <span>Ledger From Date</span>
            <input type="date" value={assetControlLedgerQuery.fromDate ?? ""} onChange={(event) => updateAssetControlLedgerQuery("fromDate", event.target.value)} />
          </label>
          <label>
            <span>Ledger To Date</span>
            <input type="date" value={assetControlLedgerQuery.toDate ?? ""} onChange={(event) => updateAssetControlLedgerQuery("toDate", event.target.value)} />
          </label>
          <label>
            <span>Ledger Limit</span>
            <input type="number" min={1} max={250} step={1} value={assetControlLedgerQuery.limit ?? 25} onChange={(event) => updateAssetControlLedgerQuery("limit", Number(event.target.value))} />
          </label>
          <label>
            <span>Overrides Only</span>
            <input type="checkbox" checked={assetControlLedgerQuery.includeOverridesOnly ?? false} onChange={(event) => updateAssetControlLedgerQuery("includeOverridesOnly", event.target.checked)} />
          </label>
          <label>
            <span>Queue Max Items</span>
            <input type="number" min={1} max={100} step={1} value={assetReviewQueueQuery.maxItems ?? 12} onChange={(event) => updateAssetReviewQueueQuery("maxItems", Number(event.target.value))} />
          </label>
          <label>
            <span>Queue Stale Days</span>
            <input type="number" min={1} max={365} step={1} value={assetReviewQueueQuery.staleAfterDays ?? 14} onChange={(event) => updateAssetReviewQueueQuery("staleAfterDays", Number(event.target.value))} />
          </label>
          <label>
            <span>Include Watch</span>
            <input type="checkbox" checked={assetReviewQueueQuery.includeWatch ?? false} onChange={(event) => updateAssetReviewQueueQuery("includeWatch", event.target.checked)} />
          </label>
        </div>
        <div className="merch-ops-actions split">
          <button type="button" className="primary" onClick={loadRevenueLaunchPipeline} disabled={isLoadingLaunchPipeline}>
            {isLoadingLaunchPipeline ? <Loader2 aria-hidden="true" size={15} /> : <PackageCheck aria-hidden="true" size={15} />}
            Build launch queue
          </button>
          <button type="button" onClick={() => void runRevenueLaunchPipeline(true)} disabled={isDryRunningLaunchPipeline}>
            {isDryRunningLaunchPipeline ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Preview launch apply
          </button>
          <button type="button" onClick={() => void runRevenueLaunchPipeline(false)} disabled={isApplyingLaunchPipeline || !launchPipelinePlan || launchPipelinePlan.queue.length === 0}>
            {isApplyingLaunchPipeline ? <Loader2 aria-hidden="true" size={15} /> : <Rocket aria-hidden="true" size={15} />}
            Apply launch queue
          </button>
        </div>
        <div className="merch-ops-actions split">
          <button type="button" className="primary" onClick={loadDigitalProductPortfolio} disabled={isLoadingDigitalProducts}>
            {isLoadingDigitalProducts ? <Loader2 aria-hidden="true" size={15} /> : <FileText aria-hidden="true" size={15} />}
            Build digital queue
          </button>
          <button type="button" onClick={() => void runDigitalProductQueue(true)} disabled={isDryRunningDigitalProducts}>
            {isDryRunningDigitalProducts ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Preview digital apply
          </button>
          <button type="button" onClick={() => void runDigitalProductQueue(false)} disabled={isApplyingDigitalProducts || !digitalProductPlan || digitalProductPlan.draftQueue.length === 0}>
            {isApplyingDigitalProducts ? <Loader2 aria-hidden="true" size={15} /> : <Rocket aria-hidden="true" size={15} />}
            Apply digital queue
          </button>
        </div>
        <div className="merch-ops-actions split">
          <button type="button" className="primary" onClick={loadFacelessContentPipeline} disabled={isLoadingFacelessContent}>
            {isLoadingFacelessContent ? <Loader2 aria-hidden="true" size={15} /> : <Megaphone aria-hidden="true" size={15} />}
            Build content queue
          </button>
          <button type="button" onClick={() => void runFacelessContentPipeline(true)} disabled={isDryRunningFacelessContent}>
            {isDryRunningFacelessContent ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Preview content apply
          </button>
          <button type="button" onClick={() => void runFacelessContentPipeline(false)} disabled={isApplyingFacelessContent || !facelessContentPlan || facelessContentPlan.totals.newBriefs === 0}>
            {isApplyingFacelessContent ? <Loader2 aria-hidden="true" size={15} /> : <Rocket aria-hidden="true" size={15} />}
            Apply content queue
          </button>
          <button type="button" onClick={loadFacelessContentPerformance} disabled={isLoadingFacelessPerformance}>
            {isLoadingFacelessPerformance ? <Loader2 aria-hidden="true" size={15} /> : <LineChart aria-hidden="true" size={15} />}
            Load content metrics
          </button>
        </div>
        <div className="merch-ops-actions split">
          <button type="button" className="primary" onClick={loadListingOptimizationQueue} disabled={isLoadingListingOptimization}>
            {isLoadingListingOptimization ? <Loader2 aria-hidden="true" size={15} /> : <FileText aria-hidden="true" size={15} />}
            Build listing tests
          </button>
          <button type="button" onClick={() => void runListingOptimizationQueue(true)} disabled={isDryRunningListingOptimization}>
            {isDryRunningListingOptimization ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Preview listing apply
          </button>
          <button type="button" onClick={() => void runListingOptimizationQueue(false)} disabled={isApplyingListingOptimization || !listingOptimizationPlan || listingOptimizationPlan.experiments.length === 0}>
            {isApplyingListingOptimization ? <Loader2 aria-hidden="true" size={15} /> : <Rocket aria-hidden="true" size={15} />}
            Apply listing tests
          </button>
        </div>
        <div className="merch-ops-actions split">
          <button type="button" className="primary" onClick={loadStoreSetupRunbook} disabled={isLoadingStoreSetup}>
            {isLoadingStoreSetup ? <Loader2 aria-hidden="true" size={15} /> : <PackageCheck aria-hidden="true" size={15} />}
            Build setup runbook
          </button>
          <button type="button" onClick={() => void runStoreSetupRunbook(true)} disabled={isDryRunningStoreSetup}>
            {isDryRunningStoreSetup ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Preview setup apply
          </button>
          <button type="button" onClick={() => void runStoreSetupRunbook(false)} disabled={isApplyingStoreSetup || !storeSetupPlan || storeSetupPlan.queue.length === 0}>
            {isApplyingStoreSetup ? <Loader2 aria-hidden="true" size={15} /> : <Rocket aria-hidden="true" size={15} />}
            Apply setup runbook
          </button>
        </div>
        <div className="merch-ops-grid compact">
          <label>
            <span>Manual Revenue</span>
            <input type="number" min={0} step="0.01" value={performanceForm.grossRevenue} onChange={(event) => updatePerformanceForm("grossRevenue", Number(event.target.value))} />
          </label>
          <label>
            <span>Net Profit</span>
            <input type="number" step="0.01" value={performanceForm.netProfit} onChange={(event) => updatePerformanceForm("netProfit", Number(event.target.value))} />
          </label>
          <label>
            <span>Visits</span>
            <input type="number" min={0} step="1" value={performanceForm.visits} onChange={(event) => updatePerformanceForm("visits", Number(event.target.value))} />
          </label>
          <label>
            <span>Units</span>
            <input type="number" min={0} step="1" value={performanceForm.unitsSold} onChange={(event) => updatePerformanceForm("unitsSold", Number(event.target.value))} />
          </label>
          <label>
            <span>Ad Spend</span>
            <input type="number" min={0} step="0.01" value={performanceForm.adSpend} onChange={(event) => updatePerformanceForm("adSpend", Number(event.target.value))} />
          </label>
        </div>
        <div className="merch-ops-actions split">
          <button type="button" className="primary" onClick={loadRevenuePerformance} disabled={isLoadingPerformance}>
            {isLoadingPerformance ? <Loader2 aria-hidden="true" size={15} /> : <LineChart aria-hidden="true" size={15} />}
            Load velocity
          </button>
          <button type="button" onClick={ingestPerformanceSnapshot} disabled={isIngestingPerformance || !selectedStore}>
            {isIngestingPerformance ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Ingest snapshot
          </button>
          <button type="button" onClick={() => void runPerformanceRotation(true)} disabled={isDryRunningPerformanceRotation}>
            {isDryRunningPerformanceRotation ? <Loader2 aria-hidden="true" size={15} /> : <PauseCircle aria-hidden="true" size={15} />}
            Preview performance
          </button>
          <button type="button" onClick={() => void runPerformanceRotation(false)} disabled={isApplyingPerformanceRotation || !performanceDigest || performanceDigest.rotationChanges.length === 0}>
            {isApplyingPerformanceRotation ? <Loader2 aria-hidden="true" size={15} /> : <Rocket aria-hidden="true" size={15} />}
            Apply performance rotation
          </button>
        </div>
        <div className="merch-ops-actions split">
          <button type="button" className="primary" onClick={loadFinancialOrchestrator} disabled={isLoadingFinancialPlan}>
            {isLoadingFinancialPlan ? <Loader2 aria-hidden="true" size={15} /> : <Landmark aria-hidden="true" size={15} />}
            Build finance split
          </button>
          <button type="button" onClick={() => void runFinancialOrchestrator(true)} disabled={isDryRunningFinancialApply}>
            {isDryRunningFinancialApply ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Preview finance apply
          </button>
          <button type="button" onClick={() => void runFinancialOrchestrator(false)} disabled={isApplyingFinancialPlan || !financialPlan || financialPlan.ledgerEntries.length === 0}>
            {isApplyingFinancialPlan ? <Loader2 aria-hidden="true" size={15} /> : <LockKeyhole aria-hidden="true" size={15} />}
            Apply finance records
          </button>
          <button type="button" onClick={loadFinancialPayoutReview} disabled={isLoadingFinancialReview}>
            {isLoadingFinancialReview ? <Loader2 aria-hidden="true" size={15} /> : <CheckCircle2 aria-hidden="true" size={15} />}
            Load payout review
          </button>
          <button type="button" onClick={loadFinancialScalingBudgetReview} disabled={isLoadingFinancialScalingBudgetReview}>
            {isLoadingFinancialScalingBudgetReview ? <Loader2 aria-hidden="true" size={15} /> : <Rocket aria-hidden="true" size={15} />}
            Load scale budgets
          </button>
          <button type="button" onClick={loadFinancialScalingSpendControl} disabled={isLoadingFinancialScalingSpendControl}>
            {isLoadingFinancialScalingSpendControl ? <Loader2 aria-hidden="true" size={15} /> : <Gauge aria-hidden="true" size={15} />}
            Build spend controls
          </button>
          <button type="button" onClick={() => void runFinancialScalingSpendControl(true)} disabled={isDryRunningFinancialScalingSpendControl}>
            {isDryRunningFinancialScalingSpendControl ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Preview spend controls
          </button>
          <button type="button" onClick={() => void runFinancialScalingSpendControl(false)} disabled={isApplyingFinancialScalingSpendControl || !financialScalingSpendControlPlan || financialScalingSpendControlPlan.spendPackets.length === 0}>
            {isApplyingFinancialScalingSpendControl ? <Loader2 aria-hidden="true" size={15} /> : <LockKeyhole aria-hidden="true" size={15} />}
            Record spend controls
          </button>
          <button type="button" onClick={loadFinancialScalingExecutionLedger} disabled={isLoadingFinancialScalingExecutionLedger}>
            {isLoadingFinancialScalingExecutionLedger ? <Loader2 aria-hidden="true" size={15} /> : <LineChart aria-hidden="true" size={15} />}
            Load scale outcomes
          </button>
          <button type="button" onClick={() => void runFinancialScalingExecutionLedger(true)} disabled={isDryRunningFinancialScalingExecutionLedger || !selectedScalingOutcomePacket}>
            {isDryRunningFinancialScalingExecutionLedger ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Preview outcome
          </button>
          <button type="button" onClick={() => void runFinancialScalingExecutionLedger(false)} disabled={isApplyingFinancialScalingExecutionLedger || !selectedScalingOutcomePacket}>
            {isApplyingFinancialScalingExecutionLedger ? <Loader2 aria-hidden="true" size={15} /> : <LockKeyhole aria-hidden="true" size={15} />}
            Record outcome
          </button>
        </div>
        <div className="merch-ops-actions split">
          <button type="button" className="primary" onClick={loadFinancialReleaseGovernance} disabled={isLoadingFinancialGovernance}>
            {isLoadingFinancialGovernance ? <Loader2 aria-hidden="true" size={15} /> : <ShieldAlert aria-hidden="true" size={15} />}
            Build release governance
          </button>
          <button type="button" onClick={() => void runFinancialReleaseGovernance(true)} disabled={isDryRunningFinancialGovernance}>
            {isDryRunningFinancialGovernance ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Preview governance record
          </button>
          <button type="button" onClick={() => void runFinancialReleaseGovernance(false)} disabled={isApplyingFinancialGovernance || !financialGovernancePlan || financialGovernancePlan.budgetReleasePackets.length === 0}>
            {isApplyingFinancialGovernance ? <Loader2 aria-hidden="true" size={15} /> : <LockKeyhole aria-hidden="true" size={15} />}
            Record governance
          </button>
        </div>

        <RevenueOpportunityFactoryPanel
          onApplied={async () => {
            onRefreshStores();
            await loadRevenueEnginePortfolio();
            await loadRevenueLaunchPipeline();
            await loadDigitalProductPortfolio();
          }}
        />

        <RevenueLaunchSprintPanel
          onApplied={async () => {
            onRefreshStores();
            await loadRevenueEnginePortfolio();
            await loadRevenueLaunchPipeline();
            await loadPortfolioCommandCenter();
          }}
        />

        <RevenueOpportunityControlPanel
          autoLoad={false}
          onApplied={async () => {
            onRefreshStores();
            await loadRevenueEnginePortfolio();
            await loadPortfolioCommandCenter();
          }}
        />

        <RevenueLaunchChecklistPanel autoLoad={false} />

        <RevenueLaunchReadinessPanel autoLoad={false} />

        <RevenueLaunchHandoffPanel autoLoad={false} />

        <RevenueLaunchHandoffControlPanel autoLoad={false} />

        <RevenueLaunchOperationsPackPanel
          autoLoad={false}
          onApplied={async () => {
            await loadPortfolioCommandCenter();
            await loadRevenueEnginePortfolio();
          }}
        />

        <RevenueLaunchClosureLedgerPanel
          autoLoad={false}
          onApplied={async () => {
            await loadPortfolioCommandCenter();
            await loadRevenueEnginePortfolio();
            await loadRevenuePerformance();
          }}
        />

        <RevenueLiveConnectorReadinessPanel
          autoLoad={false}
          onApplied={async () => {
            await loadPortfolioCommandCenter();
            await loadRevenueEnginePortfolio();
            await loadRevenuePerformance();
          }}
        />

        <RevenueLiveConnectorDesignDossierPanel
          autoLoad={false}
          onApplied={async () => {
            await loadPortfolioCommandCenter();
            await loadRevenueEnginePortfolio();
            await loadRevenuePerformance();
          }}
        />

        <RevenueAutopilotPanel
          autoLoad={false}
          onApplied={async () => {
            await loadPortfolioCommandCenter();
            await loadRevenueEnginePortfolio();
          }}
        />

        <RevenueSignalConnectorPanel
          autoLoad={false}
          onApplied={async () => {
            await loadRevenuePerformance();
            await loadFacelessContentPerformance();
            await loadFinancialReleaseGovernance();
          }}
        />

        <RevenueSignalConnectorApprovalPanel
          autoLoad={false}
          onApplied={async () => {
            await loadRevenuePerformance();
            await loadFacelessContentPerformance();
            await loadFinancialReleaseGovernance();
          }}
        />

        <RevenueSignalImportHandoffPanel
          autoLoad={false}
          onApplied={async () => {
            onRefreshStores();
            await loadRevenuePerformance();
            await loadFacelessContentPerformance();
            await loadFinancialReleaseGovernance();
          }}
        />

        <SignalIntakePanel
          autoLoad={false}
          selectedStore={selectedStore}
          onApplied={async () => {
            onRefreshStores();
            await loadRevenuePerformance();
            await loadFacelessContentPerformance();
            await loadFinancialReleaseGovernance();
          }}
        />

        {firstCashReadiness ? (
          <section className="revenue-engine-result" aria-label="Revenue Engine first cash readiness">
            <div className="revenue-engine-summary">
              <strong>{firstCashReadiness.mode}</strong>
              <p>{firstCashReadiness.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Candidates</dt>
                <dd>{firstCashReadiness.totals.candidates}</dd>
              </div>
              <div>
                <dt>Target Ready</dt>
                <dd>{firstCashReadiness.totals.targetReady}</dd>
              </div>
              <div>
                <dt>Manual Ready</dt>
                <dd>{firstCashReadiness.totals.manualLaunchReady}</dd>
              </div>
              <div>
                <dt>Auto Ready</dt>
                <dd>{firstCashReadiness.totals.automaticCashReady}</dd>
              </div>
              <div>
                <dt>Blocked</dt>
                <dd>{firstCashReadiness.totals.blocked}</dd>
              </div>
              <div>
                <dt>Target</dt>
                <dd>{firstCashReadiness.options.targetDaysToFirstCash} days</dd>
              </div>
            </dl>

            <section className="revenue-engine-table-wrap" aria-label="First cash asset readiness table">
              <table className="revenue-engine-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Score</th>
                    <th>Recommendation</th>
                    <th>Reason</th>
                    <th>Next State</th>
                  </tr>
                </thead>
                <tbody>
                  {firstCashReadiness.candidates.slice(0, 8).map((candidate) => (
                    <tr key={candidate.storeId}>
                      <td>
                        <strong>{candidate.storeName}</strong>
                        <span>{candidate.status.replace(/_/g, " ")} / pay {candidate.paymentReadiness.replace(/_/g, " ")}</span>
                      </td>
                      <td>
                        <strong>{candidate.cashReadinessScore}</strong>
                        <span>first sale {dayLabel(candidate.estimatedFirstSaleDays)}</span>
                        <span>automatic {dayLabel(candidate.automaticCashEtaDays)}</span>
                      </td>
                      <td>
                        <strong>{candidate.automaticCashStatus.replace(/_/g, " ")}</strong>
                        <span>{candidate.manualLaunchReady ? "manual ready" : "manual work needed"} / {candidate.automaticCashReady ? "auto ready" : "auto gated"}</span>
                      </td>
                      <td>{candidate.summary}</td>
                      <td>
                        <strong>{candidate.nextAction.title}</strong>
                        <span>{candidate.nextAction.action.replace(/_/g, " ")}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <div className="growth-blocked-actions">
              <strong>External execution remains locked</strong>
              {firstCashReadiness.blockedExternalActions.slice(0, 3).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {firstCashSprint ? (
          <section className="revenue-engine-result" aria-label="Revenue Engine first cash sprint">
            <div className="revenue-engine-summary">
              <strong>{firstCashSprint.mode}</strong>
              <p>{firstCashSprint.summary}</p>
            </div>

            {firstCashSprintMessage ? <p className="growth-approval-message" role="status">{firstCashSprintMessage}</p> : null}

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Ready</dt>
                <dd>{firstCashSprint.totals.readyInternal}</dd>
              </div>
              <div>
                <dt>Manual Gates</dt>
                <dd>{firstCashSprint.totals.manualGates}</dd>
              </div>
              <div>
                <dt>Blocked</dt>
                <dd>{firstCashSprint.totals.blocked}</dd>
              </div>
              <div>
                <dt>Eligible</dt>
                <dd>{firstCashSprint.totals.eligibleBridgeActions}</dd>
              </div>
              <div>
                <dt>First ETA</dt>
                <dd>{dayLabel(firstCashSprint.readiness.topFirstSaleEtaDays)}</dd>
              </div>
              <div>
                <dt>Auto ETA</dt>
                <dd>{dayLabel(firstCashSprint.readiness.topAutomaticCashEtaDays)}</dd>
              </div>
            </dl>

            <section className="revenue-engine-table-wrap" aria-label="First cash sprint moves">
              <table className="revenue-engine-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Move</th>
                    <th>Effect</th>
                  </tr>
                </thead>
                <tbody>
                  {firstCashSprint.steps.map((step) => (
                    <tr key={step.sprintActionId}>
                      <td>
                        <strong>{step.storeName}</strong>
                        <span>rank {step.candidateRank} / score {step.cashReadinessScore}</span>
                      </td>
                      <td>
                        <strong>{step.priorityScore}</strong>
                        <span>first {dayLabel(step.estimatedFirstSaleDays)} / auto {dayLabel(step.automaticCashEtaDays)}</span>
                      </td>
                      <td>
                        <strong>{step.status.replace(/_/g, " ")}</strong>
                        <span>{step.dispatchKind.replace(/_/g, " ")} / {step.bridgeActionId ?? "manual gate"}</span>
                      </td>
                      <td>
                        <strong>{step.nextActionTitle}</strong>
                        <span>{step.action.replace(/_/g, " ")}</span>
                      </td>
                      <td>{step.expectedInternalEffect}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {firstCashSprintReceipt ? (
              <section className="revenue-engine-list" aria-label="First cash sprint receipt">
                <h4>Sprint Receipt</h4>
                <article>
                  <span>{firstCashSprintReceipt.dryRun ? "preview" : "recorded"} / selected {firstCashSprintReceipt.actionsSelected}</span>
                  <strong>{firstCashSprintReceipt.summary}</strong>
                  <p>{firstCashSprintReceipt.actionsPreviewed} previewed / {firstCashSprintReceipt.actionsDispatched} dispatched / {firstCashSprintReceipt.actionsBlocked} blocked / {firstCashSprintReceipt.actionsSkipped} skipped</p>
                </article>
              </section>
            ) : null}

            <div className="growth-blocked-actions">
              <strong>First-cash sprint remains internal</strong>
              {firstCashSprint.blockedExternalActions.slice(0, 3).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {firstBusinessLaunch ? (
          <section className="revenue-engine-result" aria-label="Revenue Engine first business launch path">
            <div className="revenue-engine-summary">
              <strong>{firstBusinessLaunch.mode}</strong>
              <p>{firstBusinessLaunch.summary}</p>
            </div>

            {firstBusinessLaunchMessage ? <p className="growth-approval-message" role="status">{firstBusinessLaunchMessage}</p> : null}

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Ready</dt>
                <dd>{firstBusinessLaunch.totals.readyInternal}</dd>
              </div>
              <div>
                <dt>Manual</dt>
                <dd>{firstBusinessLaunch.totals.manualGates}</dd>
              </div>
              <div>
                <dt>Blocked</dt>
                <dd>{firstBusinessLaunch.totals.blocked}</dd>
              </div>
              <div>
                <dt>Watch</dt>
                <dd>{firstBusinessLaunch.totals.watch}</dd>
              </div>
              <div>
                <dt>Sprint Ready</dt>
                <dd>{firstBusinessLaunch.sprint.readyInternal}</dd>
              </div>
              <div>
                <dt>Products</dt>
                <dd>{firstBusinessLaunch.totals.productsPrepared}</dd>
              </div>
              <div>
                <dt>Content</dt>
                <dd>{firstBusinessLaunch.totals.contentTieIns}</dd>
              </div>
              <div>
                <dt>Organic Moves</dt>
                <dd>{firstBusinessLaunch.totals.organicTrafficMoves}</dd>
              </div>
            </dl>

            {firstBusinessLaunch.launchPackage ? (
              <section className="revenue-engine-list" aria-label="First practical launch package">
                <h4>First Practical Launch Package</h4>
                <article>
                  <span>{firstBusinessLaunch.launchPackage.store.launchStatus} / {firstBusinessLaunch.launchPackage.store.storePlatform}</span>
                  <strong>{firstBusinessLaunch.launchPackage.store.businessName}</strong>
                  <p>{firstBusinessLaunch.launchPackage.summary}</p>
                  <small>{firstBusinessLaunch.launchPackage.store.industry} / {firstBusinessLaunch.launchPackage.store.audience}</small>
                </article>
                {firstBusinessLaunch.launchPackage.products.slice(0, 3).map((product) => (
                  <article key={product.productId}>
                    <span>{product.status} / {product.productType}</span>
                    <strong>{product.productName}</strong>
                    <p>{product.listingTitle ?? "Listing title pending internal review."}</p>
                    <small>{formatMerchCurrency(product.estimatedProfit)} estimated profit / {product.profitMargin}% margin</small>
                  </article>
                ))}
                {firstBusinessLaunch.launchPackage.contentTieIns.slice(0, 3).map((tieIn) => (
                  <article key={tieIn.briefId}>
                    <span>{tieIn.objective.replace(/_/g, " ")} / {tieIn.status.replace(/_/g, " ")} / {tieIn.channelPackages} channels</span>
                    <strong>{tieIn.title}</strong>
                    <p>{tieIn.hook}</p>
                  </article>
                ))}
                <article>
                  <span>organic first / paid spend locked</span>
                  <strong>{firstBusinessLaunch.launchPackage.organicTrafficPlan.summary}</strong>
                  <p>{firstBusinessLaunch.launchPackage.organicTrafficPlan.firstMoves.slice(0, 3).join(" ")}</p>
                  <small>{firstBusinessLaunch.launchPackage.organicTrafficPlan.channels.map((channel) => channel.replace(/_/g, " ")).join(" / ")}</small>
                </article>
                <article>
                  <span>{firstBusinessLaunch.launchPackage.batchStage.name} / Money Army batch</span>
                  <strong>{firstBusinessLaunch.launchPackage.batchStage.requiredConfirmation}</strong>
                  <p>{firstBusinessLaunch.launchPackage.batchStage.expectedInternalEffect}</p>
                  <small>{firstBusinessLaunch.launchPackage.batchStage.endpoint}</small>
                </article>
              </section>
            ) : null}

            <section className="revenue-engine-table-wrap" aria-label="First business launch candidates">
              <table className="revenue-engine-table">
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>Next State</th>
                  </tr>
                </thead>
                <tbody>
                  {firstBusinessLaunch.candidates.map((candidate) => (
                    <tr key={candidate.checklistItemId}>
                      <td>
                        <strong>{candidate.storeName}</strong>
                        <span>{candidate.storeId ?? "unassigned"} / {candidate.riskLevel} risk</span>
                      </td>
                      <td>
                        <strong>{candidate.finalRank}</strong>
                        <span>launch {candidate.launchReadinessScore} / cash {candidate.cashReadinessScore}</span>
                        <span>velocity {candidate.incomeVelocityScore}</span>
                      </td>
                      <td>
                        <strong>{candidate.status.replace(/_/g, " ")}</strong>
                        <span>{candidate.nextInternalAction}</span>
                      </td>
                      <td>{candidate.reason}</td>
                      <td>
                        <strong>{candidate.nextInternalState.replace(/_/g, " ")}</strong>
                        <span>{candidate.recommendedEndpoint}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {firstBusinessLaunchReceipt ? (
              <section className="revenue-engine-list" aria-label="First business launch receipt">
                <h4>Launch Path Receipt</h4>
                <article>
                  <span>{firstBusinessLaunchReceipt.dryRun ? "preview" : "recorded"} / selected {firstBusinessLaunchReceipt.actionsSelected}</span>
                  <strong>{firstBusinessLaunchReceipt.summary}</strong>
                  <p>{firstBusinessLaunchReceipt.actionsPreviewed} previewed / {firstBusinessLaunchReceipt.actionsDispatched} dispatched / {firstBusinessLaunchReceipt.actionsBlocked} blocked / {firstBusinessLaunchReceipt.actionsSkipped} skipped</p>
                </article>
              </section>
            ) : null}

            <div className="growth-blocked-actions">
              <strong>First-business launch path remains internal</strong>
              {firstBusinessLaunch.blockedExternalActions.slice(0, 3).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {portfolioCommandPlan ? (
          <section className="revenue-engine-result" aria-label="Portfolio Command Center">
            <div className="revenue-engine-summary">
              <strong>{portfolioCommandPlan.mode}</strong>
              <p>{portfolioCommandPlan.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Commands</dt>
                <dd>{portfolioCommandPlan.totals.commandActions}</dd>
              </div>
              <div>
                <dt>High Risk</dt>
                <dd>{portfolioCommandPlan.totals.highRiskCommands}</dd>
              </div>
              <div>
                <dt>Revenue</dt>
                <dd>{formatMerchCurrency(portfolioCommandPlan.totals.totalRevenue)}</dd>
              </div>
              <div>
                <dt>Profit Velocity</dt>
                <dd>{formatMerchCurrency(portfolioCommandPlan.totals.profitVelocity)}</dd>
              </div>
              <div>
                <dt>Asset Commands</dt>
                <dd>{portfolioCommandPlan.totals.assetPortfolioActions}</dd>
              </div>
              <div>
                <dt>Tracked Assets</dt>
                <dd>{portfolioCommandPlan.totals.assetPortfolioTrackedAssets}</dd>
              </div>
              <div>
                <dt>Pending Payout</dt>
                <dd>{formatMerchCurrency(portfolioCommandPlan.totals.pendingPayoutAmount)}</dd>
              </div>
              <div>
                <dt>Scale Budget</dt>
                <dd>{formatMerchCurrency(portfolioCommandPlan.totals.pendingScalingBudgetAmount)}</dd>
              </div>
              <div>
                <dt>Scale Outcomes</dt>
                <dd>{portfolioCommandPlan.totals.scaleOutcomeScaleNext} next / {portfolioCommandPlan.totals.scaleOutcomeStop} stop</dd>
              </div>
              <div>
                <dt>Content Views</dt>
                <dd>{portfolioCommandPlan.totals.contentViews}</dd>
              </div>
            </dl>

            <div className="revenue-decision-counts" aria-label="Portfolio command counts">
              {Object.entries(portfolioCommandPlan.totals.commandsByAction).filter(([, count]) => count > 0).map(([action, count]) => (
                <span key={action}>{action.replace(/_/g, " ")}: {count}</span>
              ))}
            </div>

            {portfolioCommandBatchReview ? (
              <section className="revenue-engine-list" aria-label="Portfolio command asset-control review">
                <h4>Command Asset-Control Review</h4>
                <article>
                  <span>{portfolioCommandBatchReview.riskTier} risk / {portfolioCommandBatchReview.alignment.matchedRecommendations} matched / {portfolioCommandBatchReview.alignment.dashboardOverrides} overrides</span>
                  <strong>{portfolioCommandBatchReview.executionScope.internalStatusChanges} internal status changes</strong>
                  <p>{portfolioCommandBatchReview.summary}</p>
                  <small>{portfolioCommandBatchReview.executionScope.auditOnly} audit-only / {portfolioCommandBatchReview.skipped} skipped / review {portfolioCommandBatchReview.requiresOperatorReview ? "required" : "not required"}</small>
                </article>
              </section>
            ) : null}

            <section className="revenue-engine-list" aria-label="Portfolio risk lanes">
              <h4>Risk Lanes</h4>
              {portfolioCommandPlan.riskLanes.map((lane) => (
                <article key={lane.lane}>
                  <span>{lane.riskLevel} / score {lane.score}</span>
                  <strong>{lane.lane}</strong>
                  <p>{lane.summary}</p>
                  <small>{lane.signals.slice(0, 3).join(" / ")}</small>
                </article>
              ))}
            </section>

            {portfolioCommandPlan.commandActions.length > 0 ? (
              <section className="revenue-engine-list warning" aria-label="Portfolio command actions">
                <h4>Command Actions</h4>
                {portfolioCommandPlan.commandActions.slice(0, 6).map((command) => (
                  <article key={command.commandHash}>
                  <span>{command.action.replace(/_/g, " ")} / {command.targetType} / {command.riskLevel}</span>
                  <strong>{command.targetName}</strong>
                  <p>{command.reason}</p>
                  <small>{command.sourceModule} / {command.expectedInternalEffect}</small>
                </article>
              ))}
              </section>
            ) : (
              <p className="revenue-engine-clear">No portfolio command actions are queued.</p>
            )}

            {portfolioCommandPlan.persistedCommands.length > 0 ? (
              <section className="revenue-engine-list" aria-label="Portfolio command history">
                <h4>Recent Records</h4>
                {portfolioCommandPlan.persistedCommands.slice(0, 4).map((record) => (
                  <article key={record.id}>
                    <span>{record.status} / {record.action.toString().replace(/_/g, " ")} / {record.targetType}</span>
                    <strong>{record.targetName}</strong>
                    <p>{record.reason}</p>
                    <small>audit {record.auditLogId ?? "not attached"} / provider contacted: {record.providerContacted ? "yes" : "no"}</small>
                  </article>
                ))}
              </section>
            ) : null}

            <div className="revenue-engine-blocked" aria-label="Portfolio blocked external actions">
              {portfolioCommandPlan.blockedExternalActions.slice(0, 5).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {performanceDigest ? (
          <section className="revenue-engine-result" aria-label="Performance velocity ledger">
            <div className="revenue-engine-summary">
              <strong>{performanceDigest.mode}</strong>
              <p>{performanceDigest.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Net Revenue</dt>
                <dd>{formatMerchCurrency(performanceDigest.totals.netRevenue)}</dd>
              </div>
              <div>
                <dt>Net Profit</dt>
                <dd>{formatMerchCurrency(performanceDigest.totals.netProfit)}</dd>
              </div>
              <div>
                <dt>Profit Velocity</dt>
                <dd>{formatMerchCurrency(performanceDigest.totals.profitVelocity)}</dd>
              </div>
              <div>
                <dt>Snapshots</dt>
                <dd>{performanceDigest.totals.snapshots}</dd>
              </div>
              <div>
                <dt>Scale Signals</dt>
                <dd>{performanceDigest.totals.scaleRecommendations}</dd>
              </div>
              <div>
                <dt>Rotation</dt>
                <dd>{performanceDigest.totals.rotationChanges}</dd>
              </div>
            </dl>

            {performanceDigest.productScores.some((score) => score.snapshots > 0) ? (
              <section className="revenue-engine-list" aria-label="Performance product scores">
                <h4>Product Velocity</h4>
                {performanceDigest.productScores.filter((score) => score.snapshots > 0).slice(0, 5).map((score) => (
                  <article key={score.productId}>
                    <span>{score.action.replace("_", " ")} / {score.evidenceGrade} / {score.conversionRate.toFixed(1)}% conversion</span>
                    <strong>{score.productName}</strong>
                    <p>{score.reason}</p>
                    <small>{formatMerchCurrency(score.netProfit)} profit / {formatMerchCurrency(score.profitVelocity)} daily velocity / {score.unitsSold} units</small>
                  </article>
                ))}
              </section>
            ) : null}

            {performanceDigest.rotationChanges.length > 0 ? (
              <section className="revenue-engine-list warning" aria-label="Performance rotation changes">
                <h4>Performance Rotation</h4>
                {performanceDigest.rotationChanges.slice(0, 5).map((change) => (
                  <article key={`performance-${change.targetType}-${change.targetId}`}>
                    <span>{change.action} / {change.fromStatus} to {change.toStatus}</span>
                    <strong>{change.targetName}</strong>
                    <p>{change.reason}</p>
                  </article>
                ))}
              </section>
            ) : (
              <p className="revenue-engine-clear">No performance rotation changes are queued.</p>
            )}

            <section className="revenue-engine-list" aria-label="Performance store scores">
              <h4>Store Velocity</h4>
              {performanceDigest.storeScores.slice(0, 3).map((score) => (
                <article key={score.storeId}>
                  <span>{score.action.replace("_", " ")} / {score.evidenceGrade} / {score.confidence}% confidence</span>
                  <strong>{score.storeName}</strong>
                  <p>{score.reason}</p>
                </article>
              ))}
            </section>

            <div className="growth-blocked-actions">
              <strong>Performance execution remains blocked</strong>
              {performanceDigest.blockedExternalActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {financialPlan ? (
          <section className="revenue-engine-result" aria-label="Financial orchestrator plan">
            <div className="revenue-engine-summary">
              <strong>{financialPlan.mode}</strong>
              <p>{financialPlan.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Distributable</dt>
                <dd>{formatMerchCurrency(financialPlan.totals.distributableProfit)}</dd>
              </div>
              <div>
                <dt>Ad/Growth</dt>
                <dd>{formatMerchCurrency(financialPlan.totals.adGrowthAmount)}</dd>
              </div>
              <div>
                <dt>Ad Budgets</dt>
                <dd>{financialPlan.totals.scalingBudgetPackets}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{formatMerchCurrency(financialPlan.totals.ownerAmount)}</dd>
              </div>
              <div>
                <dt>Entral Ops</dt>
                <dd>{formatMerchCurrency(financialPlan.totals.entralOperationsAmount)}</dd>
              </div>
              <div>
                <dt>Payout Intents</dt>
                <dd>{financialPlan.totals.payoutIntents}</dd>
              </div>
              <div>
                <dt>Ledger Rows</dt>
                <dd>{financialPlan.totals.ledgerEntries}</dd>
              </div>
              <div>
                <dt>Portfolio Signal</dt>
                <dd>{financialPlan.advisoryContext.signal.replace(/_/g, " ")}</dd>
              </div>
              <div>
                <dt>Scale Pressure</dt>
                <dd>{financialPlan.advisoryContext.scalePressure.level} {financialPlan.advisoryContext.scalePressure.pressureScore}/100</dd>
              </div>
              <div>
                <dt>Kill Pressure</dt>
                <dd>{financialPlan.advisoryContext.killPressure.level} {financialPlan.advisoryContext.killPressure.pressureScore}/100</dd>
              </div>
              <div>
                <dt>Asset Commands</dt>
                <dd>{financialPlan.totals.portfolioAssetCommandsReady}</dd>
              </div>
            </dl>

            <section className="revenue-engine-list" aria-label="Financial advisory context">
              <h4>Advisory Context</h4>
              <article>
                <span>{financialPlan.advisoryContext.posture.replace(/_/g, " ")} / advisory only</span>
                <strong>Revenue Engine scoring context</strong>
                <p>{financialPlan.advisoryContext.summary}</p>
                <small>{financialPlan.advisoryContext.source.replace(/_/g, " ")}</small>
              </article>
            </section>

            <section className="revenue-engine-list" aria-label="Financial portfolio signal">
              <h4>Portfolio Signal</h4>
              <article>
                <span>{financialPlan.portfolioSignal.trackedAssets} tracked / {formatMerchCurrency(financialPlan.portfolioSignal.profitVelocity)} daily profit velocity</span>
                <strong>{financialPlan.portfolioSignal.recommendation.replace(/_/g, " ")}</strong>
                <p>{financialPlan.portfolioSignal.reason}</p>
                <small>{financialPlan.portfolioSignal.scaleRecommendations} scale / {financialPlan.portfolioSignal.pauseRecommendations} pause / {financialPlan.portfolioSignal.killRecommendations} kill</small>
              </article>
            </section>

            <section className="revenue-engine-list" aria-label="Financial portfolio pressure">
              <h4>Portfolio Pressure</h4>
              {[
                { label: "Ad/Growth pressure", pressure: financialPlan.advisoryContext.scalePressure },
                { label: "Kill pressure", pressure: financialPlan.advisoryContext.killPressure }
              ].map(({ label, pressure }) => (
                <article key={label}>
                  <span>{pressure.level} / {pressure.pressureScore}/100 / advisory only</span>
                  <strong>{label}</strong>
                  <p>{pressure.reason}</p>
                  <small>
                    {pressure.assets.length > 0
                      ? pressure.assets.slice(0, 3).map((asset) => `${asset.assetName} ${asset.finalRank}/100 ${formatMerchCurrency(asset.profitVelocity)}/day`).join(" | ")
                      : "No scored assets in this pressure lane"}
                  </small>
                </article>
              ))}
            </section>

            <section className="revenue-engine-list" aria-label="Ad Growth allocation plan">
              <h4>Ad/Growth Allocation</h4>
              <article>
                <span>{financialPlan.adGrowthAllocation.mode.replace(/_/g, " ")} / advisory only</span>
                <strong>25% Ad/Growth Bucket: {formatMerchCurrency(financialPlan.adGrowthAllocation.bucketAmount)}</strong>
                <p>{financialPlan.adGrowthAllocation.summary}</p>
                <small>
                  organic {formatMerchCurrency(financialPlan.adGrowthAllocation.organicFirstAmount)} / paid review {formatMerchCurrency(financialPlan.adGrowthAllocation.paidScaleReviewAmount)} / retained {formatMerchCurrency(financialPlan.adGrowthAllocation.retainedAmount)}
                </small>
              </article>
              <article>
                <span>{financialPlan.adGrowthAllocation.pressureDecision.decision.replace(/_/g, " ")} / {financialPlan.adGrowthAllocation.pressureDecision.recommendedSpendPriority.replace(/_/g, " ")}</span>
                <strong>Pressure decision</strong>
                <p>{financialPlan.adGrowthAllocation.pressureDecision.reason}</p>
                <small>scale {financialPlan.adGrowthAllocation.pressureDecision.scalePressureScore}/100 / kill {financialPlan.adGrowthAllocation.pressureDecision.killPressureScore}/100 / {financialPlan.adGrowthAllocation.pressureDecision.source.replace(/_/g, " ")}</small>
              </article>
            </section>

            <section className="revenue-engine-list" aria-label="Financial allocation buckets">
              <h4>Split Buckets</h4>
              {financialPlan.allocationBuckets.map((bucket) => (
                <article key={bucket.category}>
                  <span>{bucket.percent}% / {bucket.status.replace(/_/g, " ")}</span>
                  <strong>{bucket.label}: {formatMerchCurrency(bucket.amount)}</strong>
                  <p>{bucket.purpose}</p>
                  {bucket.guardrailReason ? <p>{bucket.guardrailReason}</p> : null}
                  <small>{bucket.destinationType.replace(/_/g, " ")} / payout intent {formatMerchCurrency(bucket.payoutIntentAmount)}</small>
                </article>
              ))}
            </section>

            {financialPlan.scalingBudgetQueue.length > 0 ? (
              <section className="revenue-engine-list" aria-label="Scaling budget queue">
                <h4>Ad/Growth Budgets</h4>
                {financialPlan.scalingBudgetQueue.map((packet) => (
                  <article key={packet.id}>
                    <span>{packet.allocationLane.replace(/_/g, " ")} / {packet.spendPriority.replace(/_/g, " ")} / {packet.recommendedChannel.replace(/_/g, " ")}</span>
                    <strong>{packet.assetName}: {formatMerchCurrency(packet.amount)}</strong>
                    <p>{packet.reason}</p>
                    <small>
                      cap {formatMerchCurrency(packet.budgetCap.maxPerAssetAmount)} / retained {formatMerchCurrency(packet.budgetCap.retainedScalingCapital)} / velocity {formatMerchCurrency(packet.profitVelocity)}/day / evidence {packet.performanceBasis.evidenceGrade}
                    </small>
                  </article>
                ))}
              </section>
            ) : (
              <p className="revenue-engine-clear">No validated Ad/Growth budget packets are queued.</p>
            )}

            {financialPlan.payoutIntents.length > 0 ? (
              <section className="revenue-engine-list" aria-label="Financial payout intents">
                <h4>Payout Intents</h4>
                {financialPlan.payoutIntents.map((intent) => (
                  <article key={intent.id}>
                    <span>{intent.category} / {intent.status.replace(/_/g, " ")} / locked</span>
                    <strong>{intent.title}: {formatMerchCurrency(intent.amount)}</strong>
                    <p>{intent.approvalGate.reason}</p>
                    <small>{intent.provider} / {intent.destinationType.replace(/_/g, " ")}</small>
                  </article>
                ))}
              </section>
            ) : (
              <p className="revenue-engine-clear">No payout intents meet the current threshold.</p>
            )}

            <section className="revenue-engine-list" aria-label="Financial ledger evidence">
              <h4>Ledger Evidence</h4>
              {financialPlan.ledgerEntries.slice(0, 5).map((entry) => (
                <article key={entry.id}>
                  <span>{entry.source} / {entry.status.replace(/_/g, " ")} / {entry.recordState.replace(/_/g, " ")}</span>
                  <strong>{entry.storeName}</strong>
                  <p>{entry.productName ?? "Store-level income"} generated {formatMerchCurrency(entry.netProfit)} net profit.</p>
                  <small>Scaling {formatMerchCurrency(entry.allocation.scaling)} / personal {formatMerchCurrency(entry.allocation.personal)} / buffer {formatMerchCurrency(entry.allocation.buffer)}</small>
                </article>
              ))}
            </section>

            <section className="revenue-engine-list" aria-label="Financial policy checks">
              <h4>Policy Checks</h4>
              {financialPlan.policyChecks.map((check) => (
                <article key={check.title}>
                  <span>{check.status}</span>
                  <strong>{check.title}</strong>
                  <p>{check.message}</p>
                </article>
              ))}
            </section>

            <div className="growth-blocked-actions">
              <strong>Financial execution remains blocked</strong>
              {financialPlan.blockedExternalActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {financialReviewPlan ? (
          <section className="revenue-engine-result" aria-label="Financial payout review center">
            <div className="revenue-engine-summary">
              <strong>{financialReviewPlan.mode}</strong>
              <p>{financialReviewPlan.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Pending</dt>
                <dd>{financialReviewPlan.totals.pending}</dd>
              </div>
              <div>
                <dt>Approved</dt>
                <dd>{financialReviewPlan.totals.approved}</dd>
              </div>
              <div>
                <dt>Rejected</dt>
                <dd>{financialReviewPlan.totals.rejected}</dd>
              </div>
              <div>
                <dt>Total Amount</dt>
                <dd>{formatMerchCurrency(financialReviewPlan.totals.totalAmount)}</dd>
              </div>
              <div>
                <dt>Pending Amount</dt>
                <dd>{formatMerchCurrency(financialReviewPlan.totals.pendingAmount)}</dd>
              </div>
              <div>
                <dt>Variance</dt>
                <dd>{formatMerchCurrency(financialReviewPlan.reconciliation.variance)}</dd>
              </div>
            </dl>

            <section className="revenue-engine-list" aria-label="Financial payout review queue">
              <h4>Payout Review Queue</h4>
              {financialReviewPlan.reviewQueue.length > 0 ? financialReviewPlan.reviewQueue.map((intent) => (
                <article key={intent.id}>
                  <span>{intent.category} / {intent.status.replace(/_/g, " ")} / {intent.riskLevel} risk</span>
                  <strong>{intent.title}: {formatMerchCurrency(intent.amount)}</strong>
                  <p>{intent.destinationType.replace(/_/g, " ")} / {intent.provider}</p>
                  {intent.status === "approval_required" ? (
                    <div className="growth-review-actions">
                      <button type="button" onClick={() => void reviewFinancialPayoutIntent(intent, "approve")} disabled={reviewingFinancialIntentId === intent.id}>
                        {reviewingFinancialIntentId === intent.id ? <Loader2 aria-hidden="true" size={14} /> : <CheckCircle2 aria-hidden="true" size={14} />}
                        Approve manual handoff
                      </button>
                      <button type="button" onClick={() => void reviewFinancialPayoutIntent(intent, "reject")} disabled={reviewingFinancialIntentId === intent.id}>
                        {reviewingFinancialIntentId === intent.id ? <Loader2 aria-hidden="true" size={14} /> : <XCircle aria-hidden="true" size={14} />}
                        Reject
                      </button>
                    </div>
                  ) : null}
                </article>
              )) : (
                <article>
                  <span>empty</span>
                  <strong>No payout intents are waiting for review.</strong>
                  <p>Create finance records from current performance snapshots first.</p>
                </article>
              )}
            </section>

            <section className="revenue-engine-list" aria-label="Financial budget release packets">
              <h4>Budget Release Packets</h4>
              {financialReviewPlan.budgetReleasePackets.slice(0, 4).map((packet) => (
                <article key={packet.id}>
                  <span>{packet.releaseState.replace(/_/g, " ")} / cap {formatMerchCurrency(packet.maxReleaseAmount)}</span>
                  <strong>{packet.title}</strong>
                  <p>{packet.purpose}</p>
                  <small>{packet.controls.slice(0, 2).join(" ")}</small>
                </article>
              ))}
            </section>

            <section className="revenue-engine-list" aria-label="Stripe readiness manifest">
              <h4>Stripe Readiness</h4>
              {financialReviewPlan.stripeReadiness.requiredScopes.map((scope) => (
                <article key={scope.scope}>
                  <span>{scope.status} / {scope.mode}</span>
                  <strong>{scope.scope}</strong>
                  <p>{scope.reason}</p>
                </article>
              ))}
            </section>

            <div className="growth-blocked-actions">
              <strong>Payout execution remains blocked</strong>
              {financialReviewPlan.blockedExternalActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {financialScalingBudgetReviewPlan ? (
          <section className="revenue-engine-result" aria-label="Financial scaling budget review center">
            <div className="revenue-engine-summary">
              <strong>{financialScalingBudgetReviewPlan.mode}</strong>
              <p>{financialScalingBudgetReviewPlan.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Pending</dt>
                <dd>{financialScalingBudgetReviewPlan.totals.pending}</dd>
              </div>
              <div>
                <dt>Approved</dt>
                <dd>{financialScalingBudgetReviewPlan.totals.approved}</dd>
              </div>
              <div>
                <dt>Rejected</dt>
                <dd>{financialScalingBudgetReviewPlan.totals.rejected}</dd>
              </div>
              <div>
                <dt>Total Budget</dt>
                <dd>{formatMerchCurrency(financialScalingBudgetReviewPlan.totals.totalAmount)}</dd>
              </div>
              <div>
                <dt>Pending Budget</dt>
                <dd>{formatMerchCurrency(financialScalingBudgetReviewPlan.totals.pendingAmount)}</dd>
              </div>
              <div>
                <dt>Retained</dt>
                <dd>{formatMerchCurrency(financialScalingBudgetReviewPlan.totals.retainedAmount)}</dd>
              </div>
            </dl>

            <section className="revenue-engine-list" aria-label="Scaling budget review queue">
              <h4>Scaling Budget Queue</h4>
              {financialScalingBudgetReviewPlan.packets.length > 0 ? financialScalingBudgetReviewPlan.packets.map((packet) => (
                <article key={packet.id}>
                  <span>{packet.assetType} / {packet.status.replace(/_/g, " ")} / score {packet.score}</span>
                  <strong>{packet.assetName}: {formatMerchCurrency(packet.amount)}</strong>
                  <p>{packet.reason}</p>
                  <small>{packet.storeName} / {packet.scoreBand} / velocity {formatMerchCurrency(packet.profitVelocity)}/day / cap {formatMerchCurrency(packet.budgetCap.maxPerAssetAmount)}</small>
                  {packet.status === "approval_required" ? (
                    <div className="growth-review-actions">
                      <button type="button" onClick={() => void reviewFinancialScalingBudget(packet, "approve")} disabled={reviewingFinancialScalingBudgetId === packet.id}>
                        {reviewingFinancialScalingBudgetId === packet.id ? <Loader2 aria-hidden="true" size={14} /> : <CheckCircle2 aria-hidden="true" size={14} />}
                        Approve manual handoff
                      </button>
                      <button type="button" onClick={() => void reviewFinancialScalingBudget(packet, "reject")} disabled={reviewingFinancialScalingBudgetId === packet.id}>
                        {reviewingFinancialScalingBudgetId === packet.id ? <Loader2 aria-hidden="true" size={14} /> : <XCircle aria-hidden="true" size={14} />}
                        Reject
                      </button>
                    </div>
                  ) : null}
                </article>
              )) : (
                <article>
                  <span>empty</span>
                  <strong>No scaling budget packets are waiting for review.</strong>
                  <p>Apply the Financial Orchestrator after validated scale assets have profit velocity.</p>
                </article>
              )}
            </section>

            <div className="growth-blocked-actions">
              <strong>Scaling execution remains blocked</strong>
              {financialScalingBudgetReviewPlan.blockedExternalActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {financialScalingSpendControlPlan ? (
          <section className="revenue-engine-result" aria-label="Financial scaling spend control">
            <div className="revenue-engine-summary">
              <strong>{financialScalingSpendControlPlan.mode}</strong>
              <p>{financialScalingSpendControlPlan.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Approved Budget</dt>
                <dd>{formatMerchCurrency(financialScalingSpendControlPlan.totals.approvedBudgetAmount)}</dd>
              </div>
              <div>
                <dt>Spend Packets</dt>
                <dd>{financialScalingSpendControlPlan.totals.spendPackets}</dd>
              </div>
              <div>
                <dt>Products</dt>
                <dd>{formatMerchCurrency(financialScalingSpendControlPlan.totals.productGenerationAmount)}</dd>
              </div>
              <div>
                <dt>Listings</dt>
                <dd>{formatMerchCurrency(financialScalingSpendControlPlan.totals.listingOptimizationAmount)}</dd>
              </div>
              <div>
                <dt>Content</dt>
                <dd>{formatMerchCurrency(financialScalingSpendControlPlan.totals.contentProductionAmount)}</dd>
              </div>
              <div>
                <dt>Recorded</dt>
                <dd>{financialScalingSpendControlPlan.persisted.totals.recordedPackets}</dd>
              </div>
            </dl>

            <section className="revenue-engine-list" aria-label="Scaling spend control packets">
              <h4>Spend Controls</h4>
              {financialScalingSpendControlPlan.spendPackets.length > 0 ? financialScalingSpendControlPlan.spendPackets.slice(0, 8).map((packet) => (
                <article key={packet.dedupeKey}>
                  <span>{packet.category.replace(/_/g, " ")} / {packet.releaseState.replace(/_/g, " ")} / score {packet.score}</span>
                  <strong>{packet.assetName}: {formatMerchCurrency(packet.amount)}</strong>
                  <p>{packet.purpose}</p>
                  <small>{packet.storeName} / max {formatMerchCurrency(packet.maxSpendAmount)} / {packet.controls[0]}</small>
                </article>
              )) : (
                <article>
                  <span>empty</span>
                  <strong>No scaling spend controls are ready.</strong>
                  <p>Approve at least one scaling budget packet before building spend controls.</p>
                </article>
              )}
            </section>

            {financialScalingSpendControlPlan.persisted.packets.length > 0 ? (
              <section className="revenue-engine-list" aria-label="Recorded scaling spend controls">
                <h4>Recorded Spend Controls</h4>
                {financialScalingSpendControlPlan.persisted.packets.slice(0, 4).map((packet) => (
                  <article key={packet.recordId}>
                    <span>{packet.category.replace(/_/g, " ")} / {packet.releaseState.replace(/_/g, " ")}</span>
                    <strong>{packet.assetName}: {formatMerchCurrency(packet.amount)}</strong>
                    <p>{packet.purpose}</p>
                    <small>audit {packet.auditLogId ?? "not attached"} / provider contacted: {packet.providerContacted ? "yes" : "no"}</small>
                  </article>
                ))}
              </section>
            ) : null}

            <div className="growth-blocked-actions">
              <strong>Scaling spend execution remains blocked</strong>
              {financialScalingSpendControlPlan.blockedExternalActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {financialScalingExecutionLedgerPlan ? (
          <section className="revenue-engine-result" aria-label="Financial scaling execution ledger">
            <div className="revenue-engine-summary">
              <strong>{financialScalingExecutionLedgerPlan.mode}</strong>
              <p>{financialScalingExecutionLedgerPlan.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Outcome Entries</dt>
                <dd>{financialScalingExecutionLedgerPlan.totals.recordedEntries}</dd>
              </div>
              <div>
                <dt>Spent</dt>
                <dd>{formatMerchCurrency(financialScalingExecutionLedgerPlan.totals.amountSpent)}</dd>
              </div>
              <div>
                <dt>Revenue</dt>
                <dd>{formatMerchCurrency(financialScalingExecutionLedgerPlan.totals.grossRevenue)}</dd>
              </div>
              <div>
                <dt>Profit</dt>
                <dd>{formatMerchCurrency(financialScalingExecutionLedgerPlan.totals.netProfit)}</dd>
              </div>
              <div>
                <dt>ROI</dt>
                <dd>{financialScalingExecutionLedgerPlan.totals.roi}x</dd>
              </div>
              <div>
                <dt>Next Scale</dt>
                <dd>{financialScalingExecutionLedgerPlan.totals.scaleNext}</dd>
              </div>
            </dl>

            <section aria-label="Scaling outcome entry form">
              <div className="revenue-engine-summary">
                <strong>Record Outcome Evidence</strong>
                <p>
                  {selectedScalingOutcomePacket
                    ? `${selectedScalingOutcomePacket.assetName} / ${selectedScalingOutcomePacket.category.replace(/_/g, " ")} / cap ${formatMerchCurrency(selectedScalingOutcomePacket.maxSpendAmount)}`
                    : "No recorded spend-control packet is ready for outcome evidence."}
                </p>
              </div>
              <div className="merch-ops-grid compact">
                <label>
                  <span>Scale Packet</span>
                  <select value={selectedScalingOutcomePacket?.recordId ?? scalingOutcomeForm.scalingSpendPacketId} onChange={(event) => updateScalingOutcomeForm("scalingSpendPacketId", event.target.value)} disabled={availableScalingOutcomePackets.length === 0}>
                    {availableScalingOutcomePackets.length > 0 ? availableScalingOutcomePackets.map((packet) => (
                      <option key={packet.recordId} value={packet.recordId}>{packet.assetName} / {packet.category.replace(/_/g, " ")} / {formatMerchCurrency(packet.amount)}</option>
                    )) : <option value="">No spend controls recorded</option>}
                  </select>
                </label>
                <label>
                  <span>Scale Outcome</span>
                  <select value={scalingOutcomeForm.outcome} onChange={(event) => updateScalingOutcomeForm("outcome", event.target.value as FinancialScalingExecutionOutcome)}>
                    {financialScalingExecutionOutcomeOptions.map((outcome) => <option key={outcome} value={outcome}>{outcome.replace(/_/g, " ")}</option>)}
                  </select>
                </label>
                <label>
                  <span>Scale Source</span>
                  <select value={scalingOutcomeForm.source} onChange={(event) => updateScalingOutcomeForm("source", event.target.value as FinancialScalingExecutionSource)}>
                    {financialScalingExecutionSourceOptions.map((source) => <option key={source} value={source}>{source.replace(/_/g, " ")}</option>)}
                  </select>
                </label>
                <label>
                  <span>Scale Amount Spent</span>
                  <input type="number" min={0} step="0.01" value={scalingOutcomeForm.amountSpent} onChange={(event) => updateScalingOutcomeForm("amountSpent", Number(event.target.value))} />
                </label>
                <label>
                  <span>Scale Gross Revenue</span>
                  <input type="number" min={0} step="0.01" value={scalingOutcomeForm.grossRevenue} onChange={(event) => updateScalingOutcomeForm("grossRevenue", Number(event.target.value))} />
                </label>
                <label>
                  <span>Scale Net Profit</span>
                  <input type="number" step="0.01" value={scalingOutcomeForm.netProfit} onChange={(event) => updateScalingOutcomeForm("netProfit", Number(event.target.value))} />
                </label>
                <label>
                  <span>Scale Units</span>
                  <input type="number" min={0} step="1" value={scalingOutcomeForm.unitsSold} onChange={(event) => updateScalingOutcomeForm("unitsSold", Number(event.target.value))} />
                </label>
                <label>
                  <span>Scale Visits</span>
                  <input type="number" min={0} step="1" value={scalingOutcomeForm.visits} onChange={(event) => updateScalingOutcomeForm("visits", Number(event.target.value))} />
                </label>
                <label>
                  <span>Scale Notes</span>
                  <input type="text" value={scalingOutcomeForm.notes} onChange={(event) => updateScalingOutcomeForm("notes", event.target.value)} />
                </label>
              </div>
            </section>

            <section className="revenue-table-wrap" aria-label="Scaling outcome recommendation table">
              <table className="revenue-asset-table">
                <thead>
                  <tr>
                    <th scope="col">Asset</th>
                    <th scope="col">Recommendation</th>
                    <th scope="col">Reason</th>
                    <th scope="col">Next State</th>
                    <th scope="col">Spend</th>
                    <th scope="col">Profit</th>
                    <th scope="col">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {financialScalingExecutionLedgerPlan.packetSummaries.length > 0 ? financialScalingExecutionLedgerPlan.packetSummaries.slice(0, 8).map((summary) => (
                    <tr key={`${summary.scalingSpendPacketId}-${summary.category}`}>
                      <td>
                        <strong>{summary.assetName}</strong>
                        <span>{summary.category.replace(/_/g, " ")} / {summary.entries} entr{summary.entries === 1 ? "y" : "ies"}</span>
                      </td>
                      <td><span className={`revenue-pill ${summary.recommendation}`}>{summary.recommendation.replace(/_/g, " ")}</span></td>
                      <td>{summary.reason}</td>
                      <td>{summary.nextInternalState.replace(/_/g, " ")}</td>
                      <td>{formatMerchCurrency(summary.amountSpent)}</td>
                      <td>{formatMerchCurrency(summary.netProfit)}</td>
                      <td>{summary.roi}x</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7}>No spend controls have been recorded for outcome tracking yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            {financialScalingExecutionLedgerPlan.entries.length > 0 ? (
              <section className="revenue-engine-list" aria-label="Recorded scaling outcome entries">
                <h4>Recent Outcome Evidence</h4>
                {financialScalingExecutionLedgerPlan.entries.slice(0, 4).map((entry) => (
                  <article key={entry.recordId}>
                    <span>{entry.outcome.replace(/_/g, " ")} / {entry.source.replace(/_/g, " ")} / {entry.recommendation.replace(/_/g, " ")}</span>
                    <strong>{entry.assetName}: {formatMerchCurrency(entry.netProfit)} profit</strong>
                    <p>{entry.reason}</p>
                    <small>{formatMerchCurrency(entry.amountSpent)} spent / {entry.unitsSold} units / audit {entry.auditLogId ?? "not attached"}</small>
                  </article>
                ))}
              </section>
            ) : null}

            <div className="growth-blocked-actions">
              <strong>Scaling outcome records do not execute spend</strong>
              {financialScalingExecutionLedgerPlan.blockedExternalActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {financialGovernancePlan ? (
          <section className="revenue-engine-result" aria-label="Financial release governance">
            <div className="revenue-engine-summary">
              <strong>{financialGovernancePlan.mode}</strong>
              <p>{financialGovernancePlan.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Packets</dt>
                <dd>{financialGovernancePlan.totals.budgetReleasePackets}</dd>
              </div>
              <div>
                <dt>Recorded</dt>
                <dd>{financialGovernancePlan.persisted.totals.recordedReleasePackets}</dd>
              </div>
              <div>
                <dt>Reports</dt>
                <dd>{financialGovernancePlan.persisted.totals.recordedReconciliationReports}</dd>
              </div>
              <div>
                <dt>High Risk</dt>
                <dd>{financialGovernancePlan.totals.highRiskIntents}</dd>
              </div>
              <div>
                <dt>Approved</dt>
                <dd>{formatMerchCurrency(financialGovernancePlan.totals.approvedAmount)}</dd>
              </div>
              <div>
                <dt>Pending</dt>
                <dd>{formatMerchCurrency(financialGovernancePlan.totals.pendingAmount)}</dd>
              </div>
            </dl>

            <div className="revenue-decision-counts" aria-label="Release readiness counts">
              <span>locked: {financialGovernancePlan.releaseReadiness.lockedReview}</span>
              <span>manual handoff: {financialGovernancePlan.releaseReadiness.readyForManualHandoff}</span>
              <span>rejected: {financialGovernancePlan.releaseReadiness.rejected}</span>
              <span>reconciliation: {financialGovernancePlan.reconciliationReport.status}</span>
              <span>variance: {formatMerchCurrency(financialGovernancePlan.reconciliationReport.variance)}</span>
            </div>

            <section className="revenue-engine-list" aria-label="Financial release risk tiers">
              <h4>Risk Tiers</h4>
              {financialGovernancePlan.riskTiers.map((tier) => (
                <article key={tier.label}>
                  <span>{tier.label} / {tier.count} intent{tier.count === 1 ? "" : "s"} / {formatMerchCurrency(tier.amount)}</span>
                  <strong>{tier.recommendedControl}</strong>
                  <p>{tier.intentIds.length > 0 ? tier.intentIds.join(", ") : "No intents in this tier."}</p>
                </article>
              ))}
            </section>

            <section className="revenue-engine-list" aria-label="Recorded budget release packets">
              <h4>Release Records</h4>
              {(financialGovernancePlan.persisted.releasePackets.length > 0
                ? financialGovernancePlan.persisted.releasePackets.slice(0, 4)
                : financialGovernancePlan.budgetReleasePackets.slice(0, 4)
              ).map((packet) => {
                const packetKey = "recordId" in packet && typeof packet.recordId === "string" ? packet.recordId : packet.id;

                return (
                  <article key={packetKey}>
                    <span>{packet.releaseState.replace(/_/g, " ")} / {formatMerchCurrency(packet.maxReleaseAmount)}</span>
                    <strong>{packet.title}</strong>
                    <p>{packet.purpose}</p>
                    <small>{packet.blockedActions[0]}</small>
                  </article>
                );
              })}
            </section>

            <section className="revenue-engine-list" aria-label="Stripe read-only readiness probe">
              <h4>Stripe Probe</h4>
              {financialGovernancePlan.stripeReadOnlyProbe.checks.map((check) => (
                <article key={check.title}>
                  <span>{check.status} / provider contacted: {financialGovernancePlan.stripeReadOnlyProbe.providerContacted ? "yes" : "no"}</span>
                  <strong>{check.title}</strong>
                  <p>{check.evidence}</p>
                </article>
              ))}
            </section>

            {financialGovernancePlan.persisted.latestReconciliationReport ? (
              <section className="revenue-engine-list" aria-label="Latest reconciliation report">
                <h4>Latest Reconciliation</h4>
                <article>
                  <span>{financialGovernancePlan.persisted.latestReconciliationReport.status} / {financialGovernancePlan.persisted.latestReconciliationReport.source}</span>
                  <strong>{financialGovernancePlan.persisted.latestReconciliationReport.id}</strong>
                  <p>{formatMerchCurrency(financialGovernancePlan.persisted.latestReconciliationReport.totalAmount)} total / {formatMerchCurrency(financialGovernancePlan.persisted.latestReconciliationReport.variance)} variance</p>
                </article>
              </section>
            ) : null}

            <div className="growth-blocked-actions">
              <strong>Release execution remains blocked</strong>
              {financialGovernancePlan.blockedExternalActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {storeSetupPlan ? (
          <section className="revenue-engine-result" aria-label="Store setup runbook">
            <div className="revenue-engine-summary">
              <strong>{storeSetupPlan.mode}</strong>
              <p>{storeSetupPlan.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Runbooks</dt>
                <dd>{storeSetupPlan.totals.runbooksQueued}</dd>
              </div>
              <div>
                <dt>Settings</dt>
                <dd>{storeSetupPlan.totals.storefrontSettings}</dd>
              </div>
              <div>
                <dt>Collections</dt>
                <dd>{storeSetupPlan.totals.collectionBlueprints}</dd>
              </div>
              <div>
                <dt>Credential Scopes</dt>
                <dd>{storeSetupPlan.totals.credentialScopes}</dd>
              </div>
              <div>
                <dt>Connector Ready</dt>
                <dd>{storeSetupPlan.totals.readyForConnector}</dd>
              </div>
              <div>
                <dt>Build Moves</dt>
                <dd>{storeSetupPlan.totals.storesMovingToBuild}</dd>
              </div>
            </dl>

            {storeSetupPlan.queue.length > 0 ? (
              <section className="revenue-engine-list" aria-label="Store setup queue">
                <h4>Setup Queue</h4>
                {storeSetupPlan.queue.slice(0, 5).map((item) => (
                  <article key={item.id}>
                    <span>{item.action.replace(/_/g, " ")} / internal only</span>
                    <strong>{item.title}</strong>
                    <p>{item.summary}</p>
                  </article>
                ))}
              </section>
            ) : (
              <p className="revenue-engine-clear">No store setup runbooks are queued.</p>
            )}

            <section className="revenue-engine-list" aria-label="Store setup runbooks">
              <h4>Runbooks</h4>
              {storeSetupPlan.runbooks.slice(0, 4).map((runbook) => (
                <article key={runbook.id}>
                  <span>{runbook.action.replace(/_/g, " ")} / readiness {runbook.readinessScore}/100 / {runbook.recommendedLaunchStatus}</span>
                  <strong>{runbook.storeName}</strong>
                  <p>{runbook.reason}</p>
                  <small>{runbook.collectionBlueprints.length} collections / {runbook.credentialScopes.length} scopes / {runbook.launchReadiness.readyListingProducts} listing-ready</small>
                </article>
              ))}
            </section>

            {storeSetupPlan.runbooks[0] ? (
              <section className="revenue-engine-list" aria-label="Storefront setup details">
                <h4>Setup Details</h4>
                {storeSetupPlan.runbooks[0].storefrontSettings.slice(0, 3).map((setting) => (
                  <article key={setting.key}>
                    <span>{setting.label} / approval required</span>
                    <strong>{setting.recommendedValue}</strong>
                    <p>{setting.evidence}</p>
                  </article>
                ))}
                {storeSetupPlan.runbooks[0].collectionBlueprints.slice(0, 2).map((collection) => (
                  <article key={collection.id}>
                    <span>Collection / {collection.handle}</span>
                    <strong>{collection.title}</strong>
                    <p>{collection.rule}</p>
                  </article>
                ))}
                {storeSetupPlan.runbooks[0].credentialScopes.slice(0, 3).map((scope) => (
                  <article key={`${scope.provider}-${scope.scope}`}>
                    <span>{scope.provider} / {scope.status}</span>
                    <strong>{scope.scope}</strong>
                    <p>{scope.reason}</p>
                  </article>
                ))}
              </section>
            ) : null}

            <div className="growth-blocked-actions">
              <strong>Store setup execution remains blocked</strong>
              {storeSetupPlan.blockedExternalActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {listingOptimizationPlan ? (
          <section className="revenue-engine-result" aria-label="Listing optimization queue">
            <div className="revenue-engine-summary">
              <strong>{listingOptimizationPlan.mode}</strong>
              <p>{listingOptimizationPlan.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Experiments</dt>
                <dd>{listingOptimizationPlan.totals.experimentsQueued}</dd>
              </div>
              <div>
                <dt>Variants</dt>
                <dd>{listingOptimizationPlan.totals.variantsGenerated}</dd>
              </div>
              <div>
                <dt>Missing Copy</dt>
                <dd>{listingOptimizationPlan.totals.missingCopyProducts}</dd>
              </div>
              <div>
                <dt>Performance</dt>
                <dd>{listingOptimizationPlan.totals.performanceBackedExperiments}</dd>
              </div>
              <div>
                <dt>Price Tests</dt>
                <dd>{listingOptimizationPlan.totals.priceExperiments}</dd>
              </div>
              <div>
                <dt>Profit Lift</dt>
                <dd>{formatMerchCurrency(listingOptimizationPlan.totals.estimatedProfitLift)}</dd>
              </div>
            </dl>

            {listingOptimizationPlan.experiments.length > 0 ? (
              <section className="revenue-engine-list" aria-label="Listing experiments">
                <h4>Listing Experiments</h4>
                {listingOptimizationPlan.experiments.slice(0, 5).map((experiment) => (
                  <article key={experiment.id}>
                    <span>{experiment.action.replace(/_/g, " ")} / {experiment.evidence.evidenceGrade} evidence / score {experiment.recommendedVariant.score}</span>
                    <strong>{experiment.recommendedVariant.title}</strong>
                    <p>{experiment.reason}</p>
                    <small>{experiment.productName} / {formatMerchCurrency(experiment.recommendedVariant.retailPrice)} / {experiment.recommendedVariant.profitMargin.toFixed(1)}% margin / {experiment.recommendedInternalStatus}</small>
                  </article>
                ))}
              </section>
            ) : (
              <p className="revenue-engine-clear">No listing experiments are queued.</p>
            )}

            <div className="growth-blocked-actions">
              <strong>Listing execution remains blocked</strong>
              {listingOptimizationPlan.blockedExternalActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {launchPipelinePlan ? (
          <section className="revenue-engine-result" aria-label="Revenue launch pipeline plan">
            <div className="revenue-engine-summary">
              <strong>{launchPipelinePlan.mode}</strong>
              <p>{launchPipelinePlan.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Queued</dt>
                <dd>{launchPipelinePlan.totals.queuedStores}</dd>
              </div>
              <div>
                <dt>Drafts</dt>
                <dd>{launchPipelinePlan.totals.draftProductsNeeded}</dd>
              </div>
              <div>
                <dt>Draft Profit</dt>
                <dd>{formatMerchCurrency(launchPipelinePlan.totals.estimatedDraftProfit)}</dd>
              </div>
              <div>
                <dt>Approval Ready</dt>
                <dd>{launchPipelinePlan.totals.approvalReadyStores}</dd>
              </div>
              <div>
                <dt>Packages</dt>
                <dd>{launchPipelinePlan.totals.launchPackageReadyStores}</dd>
              </div>
              <div>
                <dt>Stores</dt>
                <dd>{launchPipelinePlan.totals.storesEvaluated}</dd>
              </div>
            </dl>

            {launchPipelinePlan.queue.length > 0 ? (
              <section className="revenue-engine-list" aria-label="Launch queue actions">
                <h4>Launch Queue</h4>
                {launchPipelinePlan.queue.slice(0, 5).map((item) => (
                  <article key={item.id}>
                    <span>{item.action.replace(/_/g, " ")} / internal only</span>
                    <strong>{item.title}</strong>
                    <p>{item.summary}</p>
                  </article>
                ))}
              </section>
            ) : (
              <p className="revenue-engine-clear">No launch queue actions are ready.</p>
            )}

            <section className="revenue-engine-list" aria-label="Launch store plans">
              <h4>Store Launch Plans</h4>
              {launchPipelinePlan.storePlans.slice(0, 4).map((storePlan) => (
                <article key={storePlan.storeId}>
                  <span>{storePlan.action.replace(/_/g, " ")} / score {storePlan.score}</span>
                  <strong>{storePlan.storeName}</strong>
                  <p>{storePlan.reason}</p>
                  <small>{storePlan.readyProducts} ready / {storePlan.existingProducts} active / {storePlan.targetProductTypes.slice(0, 3).join(", ")}</small>
                </article>
              ))}
            </section>

            <div className="growth-blocked-actions">
              <strong>External actions remain blocked</strong>
              {launchPipelinePlan.blockedExternalActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {digitalProductPlan ? (
          <section className="revenue-engine-result" aria-label="Digital Product Portfolio plan">
            <div className="revenue-engine-summary">
              <strong>{digitalProductPlan.mode}</strong>
              <p>{digitalProductPlan.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Drafts</dt>
                <dd>{digitalProductPlan.totals.queuedDrafts}</dd>
              </div>
              <div>
                <dt>Draft Profit</dt>
                <dd>{formatMerchCurrency(digitalProductPlan.totals.estimatedDraftProfit)}</dd>
              </div>
              <div>
                <dt>Queued Stores</dt>
                <dd>{digitalProductPlan.totals.storesQueued}</dd>
              </div>
              <div>
                <dt>Digital Existing</dt>
                <dd>{digitalProductPlan.totals.digitalProductsExisting}</dd>
              </div>
              <div>
                <dt>Templates</dt>
                <dd>{digitalProductPlan.totals.templateCount}</dd>
              </div>
              <div>
                <dt>Stores</dt>
                <dd>{digitalProductPlan.totals.storesEvaluated}</dd>
              </div>
            </dl>

            {digitalProductPlan.draftQueue.length > 0 ? (
              <section className="revenue-engine-list" aria-label="Digital product draft queue">
                <h4>Digital Draft Queue</h4>
                {digitalProductPlan.draftQueue.slice(0, 5).map((draft) => (
                  <article key={draft.id}>
                    <span>{draft.lane.productType} / {formatMerchCurrency(draft.retailPrice)} / {draft.profitMargin.toFixed(1)}% margin</span>
                    <strong>{draft.productName}</strong>
                    <p>{draft.assetPrompt}</p>
                    <small>{draft.assetChecklist.slice(0, 3).join(", ")}</small>
                  </article>
                ))}
              </section>
            ) : null}

            <div className="growth-blocked-actions">
              <strong>Digital execution remains blocked</strong>
              {digitalProductPlan.blockedExternalActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {facelessContentPlan ? (
          <section className="revenue-engine-result" aria-label="Faceless Content Pipeline plan">
            <div className="revenue-engine-summary">
              <strong>{facelessContentPlan.mode}</strong>
              <p>{facelessContentPlan.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Briefs</dt>
                <dd>{facelessContentPlan.totals.newBriefs}</dd>
              </div>
              <div>
                <dt>Packages</dt>
                <dd>{facelessContentPlan.totals.channelPackages}</dd>
              </div>
              <div>
                <dt>Voice</dt>
                <dd>{facelessContentPlan.totals.voiceoverSpecs}</dd>
              </div>
              <div>
                <dt>Video</dt>
                <dd>{facelessContentPlan.totals.videoSpecs}</dd>
              </div>
              <div>
                <dt>Providers</dt>
                <dd>{facelessContentPlan.totals.providerManifests}</dd>
              </div>
              <div>
                <dt>Stores</dt>
                <dd>{facelessContentPlan.totals.storesEvaluated}</dd>
              </div>
            </dl>

            <section className="revenue-engine-list" aria-label="Faceless content briefs">
              <h4>Content Briefs</h4>
              {facelessContentPlan.briefs.slice(0, 5).map((brief) => (
                <article key={brief.id}>
                  <span>{brief.recordState} / priority {brief.priority} / {formatMerchCurrency(brief.estimatedRevenueImpact)} impact</span>
                  <strong>{brief.title}</strong>
                  <p>{brief.concept.hook}</p>
                  <small>{brief.targetChannels.map((channel) => channel.replace(/_/g, " ")).join(", ")} / {brief.voiceoverSpec.provider} / {brief.videoSpec.primaryProviders.join(", ")}</small>
                </article>
              ))}
            </section>

            <section className="revenue-engine-list" aria-label="Faceless provider readiness">
              <h4>Provider Readiness</h4>
              {facelessContentPlan.providerReadiness.slice(0, 5).map((provider) => (
                <article key={provider.provider}>
                  <span>{provider.status} / contacted: {provider.providerContacted ? "yes" : "no"}</span>
                  <strong>{provider.provider}</strong>
                  <p>{provider.blockedReason}</p>
                </article>
              ))}
            </section>

            {facelessContentPlan.briefs[0]?.channelPackages.length ? (
              <section className="revenue-engine-list" aria-label="Faceless channel packages">
                <h4>Channel Packages</h4>
                {facelessContentPlan.briefs[0].channelPackages.map((pack) => (
                  <article key={`${facelessContentPlan.briefs[0].id}-${pack.channel}`}>
                    <span>{pack.channel.replace(/_/g, " ")} / {pack.durationSeconds}s / {pack.uploadState.replace(/_/g, " ")}</span>
                    <strong>{pack.title}</strong>
                    <p>{pack.caption}</p>
                  </article>
                ))}
              </section>
            ) : null}

            <div className="growth-blocked-actions">
              <strong>Content execution remains blocked</strong>
              {facelessContentPlan.blockedExternalActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {facelessContentDigest ? (
          <section className="revenue-engine-result" aria-label="Faceless content performance">
            <div className="revenue-engine-summary">
              <strong>Faceless Content Performance</strong>
              <p>{facelessContentDigest.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Views</dt>
                <dd>{facelessContentDigest.totals.views}</dd>
              </div>
              <div>
                <dt>Clicks</dt>
                <dd>{facelessContentDigest.totals.clicks}</dd>
              </div>
              <div>
                <dt>Conversions</dt>
                <dd>{facelessContentDigest.totals.conversions}</dd>
              </div>
              <div>
                <dt>Net Revenue</dt>
                <dd>{formatMerchCurrency(facelessContentDigest.totals.netRevenue)}</dd>
              </div>
              <div>
                <dt>Watch Sec</dt>
                <dd>{facelessContentDigest.totals.watchSeconds}</dd>
              </div>
              <div>
                <dt>Snapshots</dt>
                <dd>{facelessContentDigest.totals.snapshots}</dd>
              </div>
            </dl>

            {facelessContentDigest.contentScores.length > 0 ? (
              <section className="revenue-engine-list" aria-label="Faceless content optimization">
                <h4>Optimization</h4>
                {facelessContentDigest.contentScores.slice(0, 5).map((score, index) => (
                  <article key={`${score.contentBriefId ?? score.channel}-${index}`}>
                    <span>{score.action.replace(/_/g, " ")} / {score.channel.replace(/_/g, " ")} / {score.clickRate.toFixed(1)}% click rate</span>
                    <strong>{score.contentBriefId ?? "Manual content snapshot"}</strong>
                    <p>{score.reason}</p>
                    <small>{score.views} views / {formatMerchCurrency(score.netRevenue)} net / {score.retentionSeconds.toFixed(1)}s retention</small>
                  </article>
                ))}
              </section>
            ) : null}
          </section>
        ) : null}

        {revenueDashboard ? (
          <section className="revenue-engine-result" aria-label="Revenue portfolio dashboard">
            <div className="revenue-engine-summary">
              <strong>{revenueDashboard.mode}</strong>
              <p>{revenueDashboard.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Revenue</dt>
                <dd>{formatMerchCurrency(revenueDashboard.kpis.totalRevenue)}</dd>
              </div>
              <div>
                <dt>Profit</dt>
                <dd>{formatMerchCurrency(revenueDashboard.kpis.estimatedProfit)}</dd>
              </div>
              <div>
                <dt>Margin</dt>
                <dd>{revenueDashboard.kpis.estimatedMargin.toFixed(1)}%</dd>
              </div>
              <div>
                <dt>Velocity</dt>
                <dd>{formatMerchCurrency(revenueDashboard.kpis.profitVelocity)}/day</dd>
              </div>
              <div>
                <dt>Risk</dt>
                <dd>{revenueDashboard.risk.riskLevel}</dd>
              </div>
              <div>
                <dt>Reviews</dt>
                <dd>{revenueDashboard.queuePressure.reviewItems}</dd>
              </div>
              <div>
                <dt>Commands</dt>
                <dd>{revenueDashboard.queuePressure.commandActions}</dd>
              </div>
              <div>
                <dt>Ledger</dt>
                <dd>{revenueDashboard.controlLedger.records}</dd>
              </div>
            </dl>

            <div className="revenue-decision-counts" aria-label="Revenue portfolio dashboard recommendation counts">
              <span>scale: {revenueDashboard.recommendations.scale}</span>
              <span>watch: {revenueDashboard.recommendations.watch}</span>
              <span>pause: {revenueDashboard.recommendations.pause}</span>
              <span>kill: {revenueDashboard.recommendations.kill}</span>
              <span>untracked: {revenueDashboard.risk.untrackedAssets}</span>
              <span>overrides: {revenueDashboard.controlLedger.overrides}</span>
            </div>

            <section className="revenue-engine-list" aria-label="Revenue portfolio dashboard next actions">
              <h4>Next Scored Moves</h4>
              {revenueDashboard.nextActions.slice(0, 6).map((action) => {
                const previewKey = `${action.assetType}-${action.assetId}-${action.recommendation}-preview`;
                const applyKey = `${action.assetType}-${action.assetId}-${action.recommendation}-apply`;
                const isPreviewing = assetActionBusyKey === previewKey;
                const isApplying = assetActionBusyKey === applyKey;
                const Icon = action.recommendation === "kill" ? XCircle : action.recommendation === "pause" ? PauseCircle : action.recommendation === "watch" ? ClipboardCheck : Rocket;

                return (
                  <article key={`${action.assetType}-${action.assetId}`}>
                    <span>{action.recommendation} / score {action.score} / {action.scoreBand} / next {action.nextInternalState ?? "no change"}</span>
                    <strong>{action.assetName}</strong>
                    <p>{action.reason}</p>
                    <small>{action.actionLabel} / {action.storeName}</small>
                    <div className="revenue-asset-controls">
                      <button
                        type="button"
                        aria-label={`Preview ${action.recommendation} for ${action.assetName}`}
                        onClick={() => void runRevenueDashboardNextAction(action, true)}
                        disabled={assetActionBusyKey !== null}
                      >
                        {isPreviewing ? <Loader2 aria-hidden="true" size={13} /> : <LineChart aria-hidden="true" size={13} />}
                        preview
                      </button>
                      <button
                        type="button"
                        className="recommended"
                        aria-label={`Record ${action.recommendation} for ${action.assetName}`}
                        onClick={() => void runRevenueDashboardNextAction(action, false)}
                        disabled={assetActionBusyKey !== null}
                      >
                        {isApplying ? <Loader2 aria-hidden="true" size={13} /> : <Icon aria-hidden="true" size={13} />}
                        record
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>

            <div className="growth-blocked-actions">
              <strong>Dashboard remains internal</strong>
              {revenueDashboard.blockedExternalActions.slice(0, 3).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {moneyArmyGenerateScoreBatch ? (
          <section className="revenue-engine-result" aria-label="Money Army generate and score batch">
            <div className="revenue-engine-summary">
              <strong>{moneyArmyGenerateScoreBatch.mode}</strong>
              <p>{moneyArmyGenerateScoreBatch.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Candidates</dt>
                <dd>{moneyArmyGenerateScoreBatch.totals.generated}/{moneyArmyGenerateScoreBatch.totals.requested}</dd>
              </div>
              <div>
                <dt>Portfolio Assets</dt>
                <dd>{moneyArmyGenerateScoreBatch.currentPortfolio.totals.assets}</dd>
              </div>
              <div>
                <dt>Scale Pressure</dt>
                <dd>{moneyArmyGenerateScoreBatch.scalePressure.level} {moneyArmyGenerateScoreBatch.scalePressure.pressureScore}/100</dd>
              </div>
              <div>
                <dt>Kill Pressure</dt>
                <dd>{moneyArmyGenerateScoreBatch.killPressure.level} {moneyArmyGenerateScoreBatch.killPressure.pressureScore}/100</dd>
              </div>
              <div>
                <dt>Scale/Watch</dt>
                <dd>{moneyArmyGenerateScoreBatch.totals.scale}/{moneyArmyGenerateScoreBatch.totals.watch}</dd>
              </div>
              <div>
                <dt>Pause/Kill</dt>
                <dd>{moneyArmyGenerateScoreBatch.totals.pause}/{moneyArmyGenerateScoreBatch.totals.kill}</dd>
              </div>
              <div>
                <dt>Stores</dt>
                <dd>{moneyArmyGenerateScoreBatch.totals.sourceStores}</dd>
              </div>
              <div>
                <dt>Source Products</dt>
                <dd>{moneyArmyGenerateScoreBatch.totals.sourceProducts}</dd>
              </div>
            </dl>

            {moneyArmyGenerateScoreBatchReceipt ? (
              <section className="revenue-engine-list" aria-label="Money Army generate score receipt">
                <h4>Generate Score Receipt</h4>
                <article>
                  <span>{moneyArmyGenerateScoreBatchReceipt.stage.replace(/_/g, " ")} / {moneyArmyGenerateScoreBatchReceipt.dryRun ? "preview" : "recorded"}</span>
                  <strong>{moneyArmyGenerateScoreBatchReceipt.providerContacted ? "Provider contacted" : "Provider locked"}</strong>
                  <p>{moneyArmyGenerateScoreBatchReceipt.summary}</p>
                  <small>external execution {moneyArmyGenerateScoreBatchReceipt.externalExecution ? "enabled" : "locked"} / audit {moneyArmyGenerateScoreBatchReceipt.auditLogId ?? "preview only"} / run {moneyArmyGenerateScoreBatchReceipt.batchRunId ?? "not recorded"}</small>
                </article>
              </section>
            ) : null}

            <section className="revenue-engine-list" aria-label="Money Army current portfolio scoring">
              <h4>Current Portfolio Scoring</h4>
              <article>
                <span>scale {moneyArmyGenerateScoreBatch.currentPortfolio.totals.scale} / watch {moneyArmyGenerateScoreBatch.currentPortfolio.totals.watch} / pause {moneyArmyGenerateScoreBatch.currentPortfolio.totals.pause} / kill {moneyArmyGenerateScoreBatch.currentPortfolio.totals.kill}</span>
                <strong>{moneyArmyGenerateScoreBatch.currentPortfolio.summary}</strong>
                <p>{formatMerchCurrency(moneyArmyGenerateScoreBatch.currentPortfolio.totals.estimatedProfit)} estimated profit / {formatMerchCurrency(moneyArmyGenerateScoreBatch.currentPortfolio.totals.profitVelocity)} daily profit velocity / {moneyArmyGenerateScoreBatch.currentPortfolio.totals.trackedAssets} tracked assets</p>
                <small>portfolio scored {new Date(moneyArmyGenerateScoreBatch.currentPortfolio.generatedAt).toLocaleString()}</small>
              </article>
              {moneyArmyGenerateScoreBatch.currentPortfolio.rotationRecommendations.slice(0, 5).map((item) => (
                <article key={`${item.assetType}-${item.assetId}`}>
                  <span>{item.recommendation} / score {item.score} / {item.scoreBand}</span>
                  <strong>{item.assetName}</strong>
                  <p>{item.reason}</p>
                  <small>{item.storeName} / current {item.currentState} / next {item.nextInternalState ?? "no state change"}</small>
                </article>
              ))}
            </section>

            {moneyArmyGenerateScoreBatch.firstBusinessLaunchPackage ? (
              <section className="revenue-engine-list" aria-label="Money Army first business launch package">
                <h4>First Business Launch Package</h4>
                {firstBusinessPackageReceipt ? (
                  <article>
                    <span>{firstBusinessPackageReceipt.stage.replace(/_/g, " ")} / {firstBusinessPackageReceipt.dryRun ? "preview" : "recorded"}</span>
                    <strong>{firstBusinessPackageReceipt.providerContacted ? "Provider contacted" : "Provider locked"}</strong>
                    <p>{firstBusinessPackageReceipt.summary}</p>
                    <small>external execution {firstBusinessPackageReceipt.externalExecution ? "enabled" : "locked"} / audit {firstBusinessPackageReceipt.auditLogId ?? "preview only"} / run {firstBusinessPackageReceipt.batchRunId ?? "not recorded"}</small>
                  </article>
                ) : null}
                <article>
                  <span>{moneyArmyGenerateScoreBatch.firstBusinessLaunchPackage.status.replace(/_/g, " ")} / {moneyArmyGenerateScoreBatch.firstBusinessLaunchPackage.store.storePlatform}</span>
                  <strong>{moneyArmyGenerateScoreBatch.firstBusinessLaunchPackage.store.businessName}</strong>
                  <p>{moneyArmyGenerateScoreBatch.firstBusinessLaunchPackage.summary}</p>
                  <small>{moneyArmyGenerateScoreBatch.firstBusinessLaunchPackage.store.industry} / {moneyArmyGenerateScoreBatch.firstBusinessLaunchPackage.store.audience}</small>
                </article>
                {moneyArmyGenerateScoreBatch.firstBusinessLaunchPackage.products.slice(0, 10).map((product) => (
                  <article key={product.candidateId}>
                    <span>{product.approvalState.replace(/_/g, " ")} / {product.recommendation} / score {product.score}</span>
                    <strong>{product.productName}</strong>
                    <p>{product.designConcept}</p>
                    <small>{product.productType} / {formatMerchCurrency(product.retailPrice)} / {product.profitMargin}% margin / source {product.sourceProductName ?? "generated lane"} / {product.listingTitle}</small>
                  </article>
                ))}
                {moneyArmyGenerateScoreBatch.firstBusinessLaunchPackage.products.slice(0, 5).map((product) => (
                  <article key={`${product.candidateId}-design`}>
                    <span>AI-ready design draft / provider locked</span>
                    <strong>{product.internalDesignDraft.mockupDirection}</strong>
                    <p>{product.internalDesignDraft.prompt}</p>
                    <small>{product.internalDesignDraft.placement} / {product.internalDesignDraft.typography} / avoid {product.internalDesignDraft.negativePrompt}</small>
                  </article>
                ))}
                {moneyArmyGenerateScoreBatch.firstBusinessLaunchPackage.contentIdeas.slice(0, 10).map((idea) => (
                  <article key={idea.id}>
                    <span>{idea.channel.replace(/_/g, " ")} / {idea.status.replace(/_/g, " ")}</span>
                    <strong>{idea.productName}</strong>
                    <p>{idea.hook}</p>
                    <small>{idea.scriptAngle}</small>
                  </article>
                ))}
                <article>
                  <span>organic first / no spend</span>
                  <strong>{moneyArmyGenerateScoreBatch.firstBusinessLaunchPackage.totals.organicMoves} organic moves queued</strong>
                  <p>{moneyArmyGenerateScoreBatch.firstBusinessLaunchPackage.organicFirstMoves.slice(0, 6).map((move) => move.title).join(" / ")}</p>
                  <small>{moneyArmyGenerateScoreBatch.firstBusinessLaunchPackage.organicFirstMoves.slice(0, 6).map((move) => move.channel.replace(/_/g, " ")).join(" / ")}</small>
                </article>
                <article>
                  <span>{moneyArmyGenerateScoreBatch.firstBusinessLaunchPackage.approvalChecklist.length} approval gates</span>
                  <strong>Approval-gated package</strong>
                  <p>{moneyArmyGenerateScoreBatch.firstBusinessLaunchPackage.approvalChecklist.map((item) => item.title).slice(0, 4).join(" ")}</p>
                  <small>external execution locked / provider contacted false</small>
                </article>
              </section>
            ) : null}

            <section className="revenue-engine-list" aria-label="Money Army generated candidate next actions">
              <h4>Recommended Next Actions</h4>
              {moneyArmyGenerateScoreBatch.candidates.slice(0, 10).map((candidate) => (
                <article key={candidate.candidateId}>
                  <span>{candidate.recommendation} / score {candidate.score} / {candidate.scoreBand} / {candidate.riskLevel}</span>
                  <strong>{candidate.productName}</strong>
                  <p>{candidate.rotationReason}</p>
                  <small>{candidate.sourceStoreName} / {candidate.productType} / {formatMerchCurrency(candidate.retailPrice)} / {candidate.profitMargin}% margin / {candidate.organicContentTieIn.channel.replace(/_/g, " ")}</small>
                </article>
              ))}
            </section>

            <section className="revenue-engine-list" aria-label="Money Army pressure signals">
              <h4>Scale/Kill Pressure Signals</h4>
              {[moneyArmyGenerateScoreBatch.scalePressure, moneyArmyGenerateScoreBatch.killPressure].map((pressure) => (
                <article key={`${pressure.level}-${pressure.pressureScore}-${pressure.reason}`}>
                  <span>{pressure.level} / {pressure.pressureScore}/100</span>
                  <strong>{pressure.reason}</strong>
                  <p>{pressure.assets.slice(0, 4).map((asset) => `${asset.assetName}: ${asset.recommendation} ${asset.score}`).join(" / ") || "No pressure assets in this lane."}</p>
                  <small>signals are advisory only; ad spend and external execution remain locked</small>
                </article>
              ))}
            </section>

            {moneyArmyBatchRuns.length > 0 ? (
              <section className="revenue-engine-list" aria-label="Money Army generate score batch run ledger">
                <h4>Batch Run History</h4>
                {moneyArmyBatchRuns.map((run) => (
                  <article key={run.id}>
                    <span>{run.status} / {run.stage.replace(/_/g, " ")}</span>
                    <strong>{run.resultSummary}</strong>
                    <p>
                      {run.sourceKeys.length} source key{run.sourceKeys.length === 1 ? "" : "s"} / candidates {run.beforeTotals.seedCandidates} to {run.afterTotals.seedCandidates} / ready {run.beforeTotals.readyStages} to {run.afterTotals.readyStages}
                    </p>
                    <small>audit {run.auditLogId ?? "none"} / run {run.id} / key {run.batchKey.slice(0, 12)}</small>
                  </article>
                ))}
              </section>
            ) : null}

            <div className="growth-blocked-actions">
              <strong>Generate-score stays internal</strong>
              {moneyArmyGenerateScoreBatch.blockedExternalActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {moneyArmyPipeline ? (
          <section className="revenue-engine-result" aria-label="Private Money Army batch pipeline">
            <div className="revenue-engine-summary">
              <strong>{moneyArmyPipeline.mode}</strong>
              <p>{moneyArmyPipeline.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Ready Stages</dt>
                <dd>{moneyArmyPipeline.totals.readyStages}/{moneyArmyPipeline.totals.stages}</dd>
              </div>
              <div>
                <dt>Next Stage</dt>
                <dd>{moneyArmyPipeline.nextStage?.title ?? "Watch"}</dd>
              </div>
              <div>
                <dt>Seeds</dt>
                <dd>{moneyArmyPipeline.totals.seedCandidates}</dd>
              </div>
              <div>
                <dt>Selected</dt>
                <dd>{moneyArmyPipeline.totals.selectedSourceKeys}</dd>
              </div>
              <div>
                <dt>Approvals</dt>
                <dd>{moneyArmyPipeline.totals.approvablePackets}</dd>
              </div>
              <div>
                <dt>Deployment</dt>
                <dd>{moneyArmyPipeline.totals.readyDeploymentBusinesses}</dd>
              </div>
              <div>
                <dt>Gap</dt>
                <dd>{moneyArmyPipeline.totals.launchWaveGap}</dd>
              </div>
              <div>
                <dt>Blocked</dt>
                <dd>{moneyArmyPipeline.totals.blockedStages}</dd>
              </div>
            </dl>

            {moneyArmyPipelineReceipt ? (
              <section className="revenue-engine-list" aria-label="Money Army batch pipeline receipt">
                <h4>Batch Receipt</h4>
                <article>
                  <span>{moneyArmyPipelineReceipt.dryRun ? "preview" : "run"} / {moneyArmyPipelineReceipt.stage?.replace(/_/g, " ") ?? "watch"}</span>
                  <strong>{moneyArmyPipelineReceipt.providerContacted ? "Provider contacted" : "Provider locked"}</strong>
                  <p>{moneyArmyPipelineReceipt.summary}</p>
                  <small>external execution {moneyArmyPipelineReceipt.externalExecution ? "enabled" : "locked"} / audit {moneyArmyPipelineReceipt.auditLogId ?? "preview only"} / run {moneyArmyPipelineReceipt.batchRunId ?? "not recorded"}</small>
                </article>
              </section>
            ) : null}

            {moneyArmyBatchRuns.length > 0 ? (
              <section className="revenue-engine-list" aria-label="Money Army batch run ledger">
                <h4>Batch Run Ledger</h4>
                {moneyArmyBatchRuns.map((run) => (
                  <article key={run.id}>
                    <span>{run.status} / {run.stage.replace(/_/g, " ")}</span>
                    <strong>{run.resultSummary}</strong>
                    <p>
                      {run.sourceKeys.length} source key{run.sourceKeys.length === 1 ? "" : "s"} / ready stages {run.beforeTotals.readyStages} to {run.afterTotals.readyStages} / gap {run.beforeTotals.launchWaveGap} to {run.afterTotals.launchWaveGap}
                    </p>
                    <small>audit {run.auditLogId ?? "none"} / run {run.id} / key {run.batchKey.slice(0, 12)}</small>
                  </article>
                ))}
              </section>
            ) : null}

            <section className="revenue-engine-list" aria-label="Money Army pipeline stages">
              <h4>Batch Stages</h4>
              {moneyArmyPipeline.stages.map((stage) => (
                <article key={stage.name}>
                  <span>{stage.status} / priority {stage.priority}</span>
                  <strong>{stage.title}</strong>
                  <p>{stage.reason}</p>
                  <small>{stage.endpoint} / {stage.expectedInternalEffect}</small>
                </article>
              ))}
            </section>

            <div className="growth-blocked-actions">
              <strong>Money Army stays private</strong>
              {moneyArmyPipeline.blockedExternalActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {businessFleetPlan ? (
          <section className="revenue-engine-result" aria-label="Revenue Business Fleet Scheduler">
            <div className="revenue-engine-summary">
              <strong>{businessFleetPlan.mode}</strong>
              <p>{businessFleetPlan.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Target</dt>
                <dd>{businessFleetPlan.capacity.targetBusinesses}</dd>
              </div>
              <div>
                <dt>Current</dt>
                <dd>{businessFleetPlan.capacity.currentBusinesses}</dd>
              </div>
              <div>
                <dt>First Wave</dt>
                <dd>{businessFleetPlan.launchWave.filter((business) => business.scheduleState === "ready_parallel").length}/{businessFleetPlan.capacity.launchWaveSize}</dd>
              </div>
              <div>
                <dt>Ready Parallel</dt>
                <dd>{businessFleetPlan.totals.readyParallel}</dd>
              </div>
              <div>
                <dt>Scale Lane</dt>
                <dd>{businessFleetPlan.totals.scale}</dd>
              </div>
              <div>
                <dt>Repair Lane</dt>
                <dd>{businessFleetPlan.totals.qualityRepair}</dd>
              </div>
              <div>
                <dt>Blocked</dt>
                <dd>{businessFleetPlan.totals.blocked}</dd>
              </div>
              <div>
                <dt>Shards</dt>
                <dd>{businessFleetPlan.capacity.shardCount}</dd>
              </div>
            </dl>

            <div className="revenue-decision-counts" aria-label="Business fleet lane counts">
              <span>launch: {businessFleetPlan.totals.launchNow}</span>
              <span>scale: {businessFleetPlan.totals.scale}</span>
              <span>watch: {businessFleetPlan.totals.watch}</span>
              <span>repair: {businessFleetPlan.totals.qualityRepair}</span>
              <span>throttle: {businessFleetPlan.totals.throttled}</span>
              <span>kill: {businessFleetPlan.totals.kill}</span>
            </div>

            {businessFleetMessage ? <p className="growth-approval-message" role="status">{businessFleetMessage}</p> : null}

            {businessFleetWaveSelection ? (
              <section className="revenue-engine-list" aria-label="Business fleet launch wave selection">
                <h4>Launch Wave Selection</h4>
                <article>
                  <span>{businessFleetWaveSelection.totals.selected} selected / {businessFleetWaveSelection.totals.eligible} eligible / {businessFleetWaveSelection.totals.skipped} skipped</span>
                  <strong>{businessFleetWaveSelection.mode}</strong>
                  <p>{businessFleetWaveSelection.summary}</p>
                  <small>{businessFleetWaveSelection.sprintActionIds.length} sprint action{businessFleetWaveSelection.sprintActionIds.length === 1 ? "" : "s"} selected</small>
                </article>
                {businessFleetWaveSelection.selectedBusinesses.slice(0, 10).map((business) => (
                  <article key={`fleet-selected-${business.businessId}`}>
                    <span>{business.scheduleState.replace(/_/g, " ")} / {business.qualityStatus} / score {business.finalRank}</span>
                    <strong>{business.businessName}</strong>
                    <p>{business.nextInternalAction}</p>
                    <small>{business.shardId} / {business.sprintActionId}</small>
                  </article>
                ))}
                {businessFleetWaveSelection.skipped.length > 0 ? (
                  <article>
                    <span>skipped</span>
                    <strong>{businessFleetWaveSelection.skipped.length} business lane{businessFleetWaveSelection.skipped.length === 1 ? "" : "s"} held out</strong>
                    <p>{businessFleetWaveSelection.skipped.slice(0, 3).map((item) => `${item.businessName}: ${item.reason}`).join(" | ")}</p>
                  </article>
                ) : null}
              </section>
            ) : null}

            {businessFleetWaveReceipt ? (
              <section className="revenue-engine-list" aria-label="Business fleet launch wave receipt">
                <h4>Launch Wave Receipt</h4>
                <article>
                  <span>{businessFleetWaveReceipt.dryRun ? "preview" : "run"} / {businessFleetWaveReceipt.actionsSelected} selected / {businessFleetWaveReceipt.actionsSkipped} skipped</span>
                  <strong>{businessFleetWaveReceipt.actionsPreviewed || businessFleetWaveReceipt.actionsDispatched} internal action{(businessFleetWaveReceipt.actionsPreviewed || businessFleetWaveReceipt.actionsDispatched) === 1 ? "" : "s"}</strong>
                  <p>{businessFleetWaveReceipt.summary}</p>
                  <small>{businessFleetWaveReceipt.providerContacted ? "provider contacted" : "provider locked"} / external execution {businessFleetWaveReceipt.externalExecution ? "enabled" : "locked"}</small>
                </article>
              </section>
            ) : null}

            {businessFleetPlan.launchWave.length > 0 ? (
              <section className="revenue-engine-list" aria-label="First business launch wave">
                <h4>First Wave</h4>
                {businessFleetPlan.launchWave.slice(0, 10).map((business) => (
                  <article key={`launch-wave-${business.businessId}`}>
                    <span>{business.scheduleState.replace(/_/g, " ")} / {business.qualityGate.status} / score {business.score.finalRank}</span>
                    <strong>{business.businessName}</strong>
                    <p>{business.nextInternalAction.reason}</p>
                    <small>{business.nextInternalAction.label.replace(/_/g, " ")} / {business.shardId} / {formatMerchCurrency(business.profitVelocity)}/day</small>
                  </article>
                ))}
              </section>
            ) : (
              <p className="revenue-engine-clear">No businesses are ready for the first 10-lane launch wave yet.</p>
            )}

            <section className="revenue-engine-table-wrap" aria-label="Business fleet scheduling table">
              <table className="revenue-engine-table">
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Score</th>
                    <th>Lane</th>
                    <th>Quality</th>
                    <th>Next Internal State</th>
                    <th>Shard</th>
                  </tr>
                </thead>
                <tbody>
                  {businessFleetPlan.businesses.slice(0, 12).map((business) => (
                    <tr key={business.businessId}>
                      <td>
                        <strong>{business.businessName}</strong>
                        <span>{business.assetCount} assets / {business.productAssets} products / {business.trackedAssets} tracked</span>
                      </td>
                      <td>
                        <strong>{business.score.finalRank}</strong>
                        <span>q{business.score.qualityScore} / r{business.score.readinessScore} / e{business.score.economicsScore}</span>
                        <span>scale {business.score.scalePressure} / kill {business.score.killPressure}</span>
                      </td>
                      <td>
                        <strong>{business.lane.replace(/_/g, " ")}</strong>
                        <span>{business.scheduleState.replace(/_/g, " ")}</span>
                      </td>
                      <td>
                        <strong>{business.qualityGate.status}</strong>
                        <span>{business.qualityGate.reasons[0] ?? "Quality gate has no current notes."}</span>
                      </td>
                      <td>
                        <strong>{business.nextInternalAction.state.replace(/_/g, " ")}</strong>
                        <span>{business.nextInternalAction.label.replace(/_/g, " ")}</span>
                      </td>
                      <td>
                        <strong>{business.shardId}</strong>
                        <span>{business.parallelism.maxInternalJobs} internal jobs</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="revenue-engine-list" aria-label="Business fleet shards">
              <h4>Shard Health</h4>
              {businessFleetPlan.shards.slice(0, 6).map((shard) => (
                <article key={shard.id}>
                  <span>{shard.readyParallel} ready / {shard.throttled} throttled / {shard.blocked} blocked</span>
                  <strong>{shard.id}</strong>
                  <p>{shard.businesses} business lane{shard.businesses === 1 ? "" : "s"} with {shard.capacity} internal job slot{shard.capacity === 1 ? "" : "s"}.</p>
                  <small>launch {shard.laneCounts.launch_now} / scale {shard.laneCounts.scale} / repair {shard.laneCounts.quality_repair} / kill {shard.laneCounts.kill}</small>
                </article>
              ))}
            </section>

            <div className="growth-blocked-actions">
              <strong>Fleet execution remains internal</strong>
              {businessFleetPlan.blockedExternalActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {businessFleetGapPlan ? (
          <section className="revenue-engine-result" aria-label="Business fleet launch gap planner">
            <div className="revenue-engine-summary">
              <strong>{businessFleetGapPlan.mode}</strong>
              <p>{businessFleetGapPlan.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Target Wave</dt>
                <dd>{businessFleetGapPlan.totals.targetLaunchWave}</dd>
              </div>
              <div>
                <dt>Ready Now</dt>
                <dd>{businessFleetGapPlan.totals.readyLaunchWaveBusinesses}</dd>
              </div>
              <div>
                <dt>Gap</dt>
                <dd>{businessFleetGapPlan.totals.launchWaveGap}</dd>
              </div>
              <div>
                <dt>Repairs</dt>
                <dd>{businessFleetGapPlan.totals.repairActions}</dd>
              </div>
              <div>
                <dt>New Seeds</dt>
                <dd>{businessFleetGapPlan.totals.createOpportunityShells}</dd>
              </div>
              <div>
                <dt>Current</dt>
                <dd>{businessFleetGapPlan.totals.currentBusinesses}</dd>
              </div>
            </dl>

            <section className="revenue-engine-list" aria-label="Business fleet launch gap actions">
              <h4>Gap Actions</h4>
              {businessFleetGapPlan.actions.slice(0, 10).map((action) => (
                <article key={`fleet-gap-${action.priority}-${action.action}-${action.businessName}`}>
                  <span>{action.action.replace(/_/g, " ")} / {action.status.replace(/_/g, " ")}</span>
                  <strong>{action.businessName}</strong>
                  <p>{action.reason}</p>
                  <small>{action.endpoint} / {action.expectedInternalEffect}</small>
                </article>
              ))}
            </section>

            {businessFleetGapSeedReceipt ? (
              <section className="revenue-engine-list" aria-label="Business fleet launch gap seed receipt">
                <h4>Gap Seed Receipt</h4>
                <article>
                  <span>{businessFleetGapSeedReceipt.dryRun ? "preview" : "created"} / {businessFleetGapSeedReceipt.seedsSelected} selected / gap {businessFleetGapSeedReceipt.launchWaveGapBefore} to {businessFleetGapSeedReceipt.launchWaveGapAfter}</span>
                  <strong>{businessFleetGapSeedReceipt.storeShellsCreated} store shell{businessFleetGapSeedReceipt.storeShellsCreated === 1 ? "" : "s"} / {businessFleetGapSeedReceipt.productDraftsCreated} draft{businessFleetGapSeedReceipt.productDraftsCreated === 1 ? "" : "s"}</strong>
                  <p>{businessFleetGapSeedReceipt.summary}</p>
                  <small>{businessFleetGapSeedReceipt.providerContacted ? "provider contacted" : "provider locked"} / external execution {businessFleetGapSeedReceipt.externalExecution ? "enabled" : "locked"} / skipped duplicates {businessFleetGapSeedReceipt.skippedExistingProducts}</small>
                </article>
              </section>
            ) : null}

            {businessFleetGapAccelerationReceipt ? (
              <section className="revenue-engine-list" aria-label="Business fleet launch gap acceleration receipt">
                <h4>Gap Acceleration Receipt</h4>
                <article>
                  <span>{businessFleetGapAccelerationReceipt.dryRun ? "preview" : "ran"} / {businessFleetGapAccelerationReceipt.storesTargeted} stores / {businessFleetGapAccelerationReceipt.sourceKeysTargeted} source keys</span>
                  <strong>{businessFleetGapAccelerationReceipt.launchQueueItems} launch items / {businessFleetGapAccelerationReceipt.listingExperimentsQueued} listing experiments / {businessFleetGapAccelerationReceipt.storeSetupRunbooks} setup runbooks</strong>
                  <p>{businessFleetGapAccelerationReceipt.summary}</p>
                  <small>{businessFleetGapAccelerationReceipt.providerContacted ? "provider contacted" : "provider locked"} / external execution {businessFleetGapAccelerationReceipt.externalExecution ? "enabled" : "locked"} / listing updates {businessFleetGapAccelerationReceipt.listingProductsUpdated}</small>
                </article>
              </section>
            ) : null}

            {businessFleetLiveLaunchPackageReceipt ? (
              <section className="revenue-engine-list" aria-label="Business fleet live launch package receipt">
                <h4>Live Launch Package</h4>
                <article>
                  <span>{businessFleetLiveLaunchPackageReceipt.dryRun ? "preview" : "recorded"} / {businessFleetLiveLaunchPackageReceipt.storesTargeted} stores / {businessFleetLiveLaunchPackageReceipt.sourceKeysTargeted} source keys</span>
                  <strong>{businessFleetLiveLaunchPackageReceipt.providerPayloadsPrepared} payload package{businessFleetLiveLaunchPackageReceipt.providerPayloadsPrepared === 1 ? "" : "s"} / {businessFleetLiveLaunchPackageReceipt.providerApprovalPacketsQueued || businessFleetLiveLaunchPackageReceipt.providerApprovalPacketsPreviewed} provider approval packet{(businessFleetLiveLaunchPackageReceipt.providerApprovalPacketsQueued || businessFleetLiveLaunchPackageReceipt.providerApprovalPacketsPreviewed) === 1 ? "" : "s"}</strong>
                  <p>{businessFleetLiveLaunchPackageReceipt.summary}</p>
                  <small>{businessFleetLiveLaunchPackageReceipt.providerContacted ? "provider contacted" : "provider locked"} / external execution {businessFleetLiveLaunchPackageReceipt.externalExecution ? "enabled" : "locked"} / handoff {businessFleetLiveLaunchPackageReceipt.handoffRecords || businessFleetLiveLaunchPackageReceipt.handoffRecordsPreviewed} / packs {businessFleetLiveLaunchPackageReceipt.operationsPacksRecorded || businessFleetLiveLaunchPackageReceipt.operationsPacksSelected} / ready {businessFleetLiveLaunchPackageReceipt.readyOperationsPacks}</small>
                </article>
                {businessFleetLiveLaunchPackage ? businessFleetLiveLaunchPackage.targetedStores.slice(0, 10).map((store) => (
                  <article key={`live-package-${store.id}`}>
                    <span>{store.launchStatus} / {store.products} product{store.products === 1 ? "" : "s"}</span>
                    <strong>{store.businessName}</strong>
                    <p>{store.sourceKey ?? "No source key attached to this package lane."}</p>
                    <small>{businessFleetLiveLaunchPackage.plans.readinessPlan.stores.find((item) => item.store.id === store.id)?.summary ?? "Readiness pending."}</small>
                  </article>
                )) : null}
              </section>
            ) : null}

            {businessFleetLaunchGate ? (
              <section className="revenue-engine-list" aria-label="Business fleet launch gate">
                <h4>Launch Gate</h4>
                <article>
                  <span>{businessFleetLaunchGate.totals.storesEvaluated} lanes / {businessFleetLaunchGate.totals.readyForManualLaunch} ready / {businessFleetLaunchGate.totals.approvalNeeded} approval / {businessFleetLaunchGate.totals.repairRequired} repair / {businessFleetLaunchGate.totals.blocked} blocked</span>
                  <strong>{businessFleetLaunchGate.mode}</strong>
                  <p>{businessFleetLaunchGate.summary}</p>
                  <small>{businessFleetLaunchGate.providerContacted ? "provider contacted" : "provider locked"} / external execution {businessFleetLaunchGate.externalExecution ? "enabled" : "locked"} / payloads {businessFleetLaunchGate.totals.payloadsPrepared} / ops ready {businessFleetLaunchGate.totals.operationsReady}</small>
                </article>
                {businessFleetLaunchGate.items.slice(0, 10).map((item) => (
                  <article key={`launch-gate-${item.storeId}`}>
                    <span>{item.gateStatus.replace(/_/g, " ")} / provider {item.providerReadinessScore} / launch {item.launchReadinessScore}</span>
                    <strong>{item.businessName}</strong>
                    <p>{item.reason}</p>
                    <small>{item.nextInternalAction.label} / {item.nextInternalAction.state} / payloads {item.providerPayloadCount} / products {item.productCount}</small>
                  </article>
                ))}
              </section>
            ) : null}

            {businessFleetGapPlan.opportunitySeeds.length > 0 ? (
              <section className="revenue-engine-list" aria-label="Business fleet opportunity seeds">
                <h4>Opportunity Seeds</h4>
                {businessFleetGapPlan.opportunitySeeds.slice(0, 10).map((seed) => (
                  <article key={seed.sourceKey}>
                    <span>{seed.storePlatform} / {seed.productCount} drafts / {seed.riskTolerance} risk</span>
                    <strong>{seed.businessName}</strong>
                    <p>{seed.idea}</p>
                    <small>{seed.productTypes.join(", ")} / {formatMerchCurrency(seed.priceRange.min)}-{formatMerchCurrency(seed.priceRange.max)}</small>
                  </article>
                ))}
              </section>
            ) : null}

            <div className="growth-blocked-actions">
              <strong>Launch gap remains internal</strong>
              {businessFleetGapPlan.blockedExternalActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {revenuePlan ? (
          <section className="revenue-engine-result" aria-label="Revenue Engine asset portfolio">
            <div className="revenue-engine-summary">
              <strong>{revenuePlan.mode}</strong>
              <p>{revenuePlan.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Revenue</dt>
                <dd>{formatMerchCurrency(revenuePlan.totals.totalRevenue)}</dd>
              </div>
              <div>
                <dt>Est. Profit</dt>
                <dd>{formatMerchCurrency(revenuePlan.totals.estimatedProfit)}</dd>
              </div>
              <div>
                <dt>Assets</dt>
                <dd>{revenuePlan.totals.assets}</dd>
              </div>
              <div>
                <dt>Scale</dt>
                <dd>{revenuePlan.totals.scale}</dd>
              </div>
              <div>
                <dt>Pause</dt>
                <dd>{revenuePlan.totals.pause}</dd>
              </div>
              <div>
                <dt>Profit Velocity</dt>
                <dd>{formatMerchCurrency(revenuePlan.totals.profitVelocity)}/day</dd>
              </div>
              <div>
                <dt>Signals</dt>
                <dd>{revenuePlan.totals.trackedAssets}/{revenuePlan.totals.performanceSnapshots}</dd>
              </div>
              <div>
                <dt>Rotation</dt>
                <dd>{revenuePlan.rotationChanges.length}</dd>
              </div>
            </dl>

            <div className="revenue-decision-counts" aria-label="Revenue Engine recommendation counts">
              <span>scale: {revenuePlan.totals.scale}</span>
              <span>watch: {revenuePlan.totals.watch}</span>
              <span>pause: {revenuePlan.totals.pause}</span>
              <span>kill: {revenuePlan.totals.kill}</span>
            </div>

            {assetControlPreview ? (
              <section className="revenue-engine-list" aria-label="Revenue asset control review">
                <h4>Latest Asset Control Review</h4>
                <article>
                  <span>
                    {assetControlPreview.controlReview.riskTier} risk / {assetControlPreview.controlReview.alignment.replace(/_/g, " ")} / {assetControlPreview.controlReview.executionScope.replace(/_/g, " ")}
                  </span>
                  <strong>{assetControlPreview.asset.assetName}</strong>
                  <p>{assetControlPreview.controlReview.summary}</p>
                  <small>
                    {assetControlPreview.controlReview.statusImpact.replace(/_/g, " ")} / review {assetControlPreview.controlReview.requiresOperatorReview ? "required" : "not required"}
                  </small>
                  {assetControlPreview.warnings.length > 0 ? <small>{assetControlPreview.warnings.join(" ")}</small> : null}
                </article>
              </section>
            ) : null}

            {assetBatchControlPreview ? (
              <section className="revenue-engine-list" aria-label="Revenue asset batch control review">
                <h4>Latest Batch Control Review</h4>
                <article>
                  <span>
                    {assetBatchControlPreview.controlReview.riskTier} risk / {assetBatchControlPreview.controlReview.alignment.matchedRecommendations} matched / {assetBatchControlPreview.controlReview.alignment.dashboardOverrides} overrides
                  </span>
                  <strong>{assetBatchControlPreview.controls.length} selected asset actions</strong>
                  <p>{assetBatchControlPreview.controlReview.summary}</p>
                  <small>
                    {assetBatchControlPreview.controlReview.executionScope.internalStatusChanges} internal status changes / {assetBatchControlPreview.controlReview.executionScope.auditOnly} audit-only / review {assetBatchControlPreview.controlReview.requiresOperatorReview ? "required" : "not required"}
                  </small>
                  <small>
                    {assetBatchControlPreview.controlReview.statusImpact.productStatusChanges} product changes / {assetBatchControlPreview.controlReview.statusImpact.storeStatusChanges} store changes / {assetBatchControlPreview.controlReview.skipped} skipped
                  </small>
                </article>
              </section>
            ) : null}

            <div className="row-actions" aria-label="Revenue Engine batch asset controls">
              <button type="button" onClick={selectRecommendedRevenueAssets} disabled={revenuePlan.assets.every((asset) => asset.recommendation === "watch")}>
                <ClipboardCheck aria-hidden="true" size={16} />
                Select command-ready
              </button>
              <button type="button" onClick={() => setSelectedAssetKeys([])} disabled={selectedAssetKeys.length === 0}>
                <XCircle aria-hidden="true" size={16} />
                Clear selection
              </button>
              <button type="button" onClick={() => void runRevenueAssetBatch(true)} disabled={isPreviewingAssetBatch || selectedBatchActions.length === 0}>
                {isPreviewingAssetBatch ? <Loader2 aria-hidden="true" size={16} /> : <ClipboardCheck aria-hidden="true" size={16} />}
                Preview selected
              </button>
              <button type="button" onClick={() => void runRevenueAssetBatch(false)} disabled={isApplyingAssetBatch || selectedBatchActions.length === 0}>
                {isApplyingAssetBatch ? <Loader2 aria-hidden="true" size={16} /> : <LockKeyhole aria-hidden="true" size={16} />}
                Apply selected
              </button>
              <span>{selectedRevenueAssets.length} selected</span>
            </div>

            <section className="revenue-engine-table-wrap" aria-label="Revenue Engine asset scoring table">
              <table className="revenue-engine-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Asset</th>
                    <th>Score</th>
                    <th>Recommendation</th>
                    <th>Reason</th>
                    <th>Next State</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {revenuePlan.assets.slice(0, 12).map((asset) => {
                    const assetKey = revenueAssetKey(asset);
                    const selected = selectedAssetKeys.includes(assetKey);

                    return (
                      <tr key={`${asset.assetType}-${asset.assetId}`}>
                        <td>
                          <input
                            aria-label={`Select ${asset.assetName}`}
                            checked={selected}
                            type="checkbox"
                            onChange={() => toggleRevenueAssetSelection(asset)}
                          />
                        </td>
                        <td>
                          <strong>{asset.assetName}</strong>
                          <span>{asset.assetType} / {asset.storeName}</span>
                        </td>
                        <td>
                          <strong>{asset.assetScore.finalRank}</strong>
                          <span>
                            e{asset.assetScore.economicsScore} / r{asset.assetScore.readinessScore} / p-{asset.assetScore.riskPenalty} / v{asset.assetScore.velocity}
                          </span>
                          {asset.performance ? (
                            <span>
                              pv {formatMerchCurrency(asset.performance.profitVelocity)}/day / {asset.performance.snapshots} signal{asset.performance.snapshots === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <strong>{asset.recommendation}</strong>
                          <span>{asset.scoreBand}</span>
                        </td>
                        <td>{asset.reason}</td>
                        <td>{asset.nextInternalState ?? "No change"}</td>
                        <td>
                          <div className="revenue-asset-controls">
                            {revenueAssetControlActions.map((action) => {
                              const actionKey = `${asset.assetType}-${asset.assetId}-${action}-apply`;
                              const isBusy = assetActionBusyKey === actionKey;
                              const Icon = action === "kill" ? XCircle : action === "pause" ? PauseCircle : action === "watch" ? ClipboardCheck : Rocket;

                              return (
                                <button
                                  key={action}
                                  type="button"
                                  className={action === asset.recommendation ? "recommended" : undefined}
                                  onClick={() => void runRevenueAssetAction(asset, action, false)}
                                  disabled={assetActionBusyKey !== null}
                                >
                                  {isBusy ? <Loader2 aria-hidden="true" size={13} /> : <Icon aria-hidden="true" size={13} />}
                                  {action}
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => void loadRevenueAssetControlLedgerForAsset(asset)}
                              disabled={isLoadingAssetControlLedger}
                            >
                              {isLoadingAssetControlLedger ? <Loader2 aria-hidden="true" size={13} /> : <LineChart aria-hidden="true" size={13} />}
                              history
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            {revenuePlan.rotationChanges.length > 0 ? (
              <section className="revenue-engine-list warning" aria-label="Internal rotation changes">
                <h4>Internal Rotation</h4>
                {revenuePlan.rotationChanges.slice(0, 5).map((change) => (
                  <article key={`${change.targetType}-${change.targetId}`}>
                    <span>{change.action} / {change.fromStatus} to {change.toStatus}</span>
                    <strong>{change.targetName}</strong>
                    <p>{change.reason}</p>
                  </article>
                ))}
              </section>
            ) : (
              <p className="revenue-engine-clear">No internal rotation changes are queued.</p>
            )}
          </section>
        ) : null}

        {assetReviewQueue ? (
          <section className="revenue-engine-result" aria-label="Revenue Engine asset review queue">
            <div className="revenue-engine-summary">
              <strong>{assetReviewQueue.mode}</strong>
              <p>{assetReviewQueue.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Items</dt>
                <dd>{assetReviewQueue.totals.items}</dd>
              </div>
              <div>
                <dt>Scale Ready</dt>
                <dd>{assetReviewQueue.totals.scaleReady}</dd>
              </div>
              <div>
                <dt>Pause/Kill</dt>
                <dd>{assetReviewQueue.totals.killOrPause}</dd>
              </div>
              <div>
                <dt>Overrides</dt>
                <dd>{assetReviewQueue.totals.overrides}</dd>
              </div>
            </dl>

            <div className="row-actions" aria-label="Review queue batch controls">
              <button type="button" onClick={selectAllReviewQueueItems} disabled={assetReviewQueue.queue.length === 0 || isApplyingReviewQueueBatch || assetReviewQueueBusyKey !== null}>
                <ClipboardCheck aria-hidden="true" size={16} />
                Select queue
              </button>
              <button type="button" onClick={() => setSelectedReviewQueueKeys([])} disabled={selectedReviewQueueKeys.length === 0 || isApplyingReviewQueueBatch}>
                <XCircle aria-hidden="true" size={16} />
                Clear queue
              </button>
              <button type="button" onClick={() => void runRevenueAssetReviewQueueBatch()} disabled={isApplyingReviewQueueBatch || assetReviewQueueBusyKey !== null || selectedReviewQueueActions.length === 0}>
                {isApplyingReviewQueueBatch ? <Loader2 aria-hidden="true" size={16} /> : <LockKeyhole aria-hidden="true" size={16} />}
                Record selected queue
              </button>
              <span>{selectedReviewQueueItems.length} selected</span>
            </div>

            <section className="revenue-table-wrap" aria-label="Asset review queue table">
              <table className="revenue-asset-table">
                <thead>
                  <tr>
                    <th scope="col">Select</th>
                    <th scope="col">Asset</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Trigger</th>
                    <th scope="col">History</th>
                    <th scope="col">Recommendation</th>
                    <th scope="col">Reason</th>
                    <th scope="col">Next Review</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assetReviewQueue.queue.length > 0 ? assetReviewQueue.queue.slice(0, 10).map((item) => {
                    const itemKey = revenueAssetReviewQueueKey(item);
                    const busyKey = `${item.assetType}-${item.assetId}-${item.currentRecommendation}`;
                    const isBusy = assetReviewQueueBusyKey === busyKey;
                    const selected = selectedReviewQueueKeys.includes(itemKey);
                    const Icon = item.currentRecommendation === "kill" ? XCircle : item.currentRecommendation === "pause" ? PauseCircle : item.currentRecommendation === "watch" ? ClipboardCheck : Rocket;

                    return (
                      <tr key={`${item.assetType}-${item.assetId}-${item.trigger}`}>
                        <td>
                          <input
                            aria-label={`Select review ${item.assetName}`}
                            checked={selected}
                            type="checkbox"
                            onChange={() => toggleReviewQueueSelection(item)}
                          />
                        </td>
                        <td>
                          <strong>{item.assetName}</strong>
                          <span>{item.assetType} / {item.storeName}</span>
                        </td>
                        <td>
                          <strong>{item.priority}</strong>
                          <span>{item.scoreBand} / {item.riskLevel}</span>
                        </td>
                        <td>{item.trigger.replace(/_/g, " ")}</td>
                        <td>
                          <strong>{item.controlHistory.records} record{item.controlHistory.records === 1 ? "" : "s"}</strong>
                          <span>{item.controlHistory.latestActionAgeDays === null ? "no prior action" : `${item.controlHistory.latestActionAgeDays}d old`}</span>
                          <span>
                            {item.controlHistory.overrides > 0
                              ? `${item.controlHistory.overrides} override${item.controlHistory.overrides === 1 ? "" : "s"}`
                              : `${item.controlHistory.statusChanges} state change${item.controlHistory.statusChanges === 1 ? "" : "s"}`}
                          </span>
                          {item.controlHistory.currentRecommendationChanged ? <span>score drift</span> : null}
                        </td>
                        <td>{item.currentRecommendation}</td>
                        <td>{item.reason}</td>
                        <td>{item.nextReviewState.replace(/_/g, " ")}</td>
                        <td>
                          <button type="button" onClick={() => void runRevenueAssetReviewQueueAction(item)} disabled={assetReviewQueueBusyKey !== null || isApplyingReviewQueueBatch}>
                            {isBusy ? <Loader2 aria-hidden="true" size={13} /> : <Icon aria-hidden="true" size={13} />}
                            record {item.currentRecommendation}
                          </button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={9}>No asset review items are queued under the current options.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <div className="growth-blocked-actions">
              <strong>Review queue records remain internal</strong>
              {assetReviewQueue.blockedExternalActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {assetControlRecovery ? (
          <section className="revenue-engine-result" aria-label="Revenue Engine asset control recovery">
            <div className="revenue-engine-summary">
              <strong>{assetControlRecovery.mode}</strong>
              <p>{assetControlRecovery.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Ready Replay</dt>
                <dd>{assetControlRecovery.totals.readyToReplay}</dd>
              </div>
              <div>
                <dt>Manual Review</dt>
                <dd>{assetControlRecovery.totals.manualReview}</dd>
              </div>
              <div>
                <dt>Stale Score</dt>
                <dd>{assetControlRecovery.totals.staleScore}</dd>
              </div>
              <div>
                <dt>Missing Assets</dt>
                <dd>{assetControlRecovery.totals.missingAssets}</dd>
              </div>
            </dl>

            <section className="revenue-table-wrap" aria-label="Asset control recovery table">
              <table className="revenue-asset-table">
                <thead>
                  <tr>
                    <th scope="col">Asset</th>
                    <th scope="col">Recovery</th>
                    <th scope="col">Score</th>
                    <th scope="col">Reason</th>
                    <th scope="col">Next</th>
                  </tr>
                </thead>
                <tbody>
                  {assetControlRecovery.recoveryQueue.length > 0 ? assetControlRecovery.recoveryQueue.slice(0, 8).map((item) => (
                    <tr key={item.recordId}>
                      <td>
                        <strong>{item.assetName}</strong>
                        <span>{item.assetType} / age {item.ageDays}d / audit {item.auditLogId ?? "none"}</span>
                      </td>
                      <td>
                        <strong>{item.state.replace(/_/g, " ")}</strong>
                        <span>{item.riskTier} risk / {item.canReplay ? "replay ready" : item.requiresOperatorReview ? "review required" : "no replay"}</span>
                      </td>
                      <td>
                        <strong>{item.currentFinalRank ?? item.latestFinalRank}</strong>
                        <span>ledger {item.latestFinalRank} / delta {item.scoreDelta ?? 0}</span>
                      </td>
                      <td>{item.reason}</td>
                      <td>{item.targetState ?? item.nextInternalState ?? item.currentState ?? "No change"}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5}>No asset-control recovery items need attention.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </section>
        ) : null}

        {assetControlLedger ? (
          <section className="revenue-engine-result" aria-label="Revenue Engine asset control ledger">
            <div className="revenue-engine-summary">
              <strong>{assetControlLedger.mode}</strong>
              <p>{assetControlLedger.summary}</p>
            </div>

            <dl className="revenue-engine-metrics">
              <div>
                <dt>Records</dt>
                <dd>{assetControlLedger.totals.records}</dd>
              </div>
              <div>
                <dt>Overrides</dt>
                <dd>{assetControlLedger.totals.overrides}</dd>
              </div>
              <div>
                <dt>Status Changes</dt>
                <dd>{assetControlLedger.totals.statusChanges}</dd>
              </div>
              <div>
                <dt>Audit Only</dt>
                <dd>{assetControlLedger.totals.auditOnly}</dd>
              </div>
            </dl>

            <section className="revenue-table-wrap" aria-label="Asset control decision table">
              <table className="revenue-asset-table">
                <thead>
                  <tr>
                    <th scope="col">Asset</th>
                    <th scope="col">Action</th>
                    <th scope="col">Engine</th>
                    <th scope="col">Score</th>
                    <th scope="col">Reason</th>
                    <th scope="col">Next State</th>
                  </tr>
                </thead>
                <tbody>
                  {assetControlLedger.records.length > 0 ? assetControlLedger.records.slice(0, 8).map((record) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.assetName}</strong>
                        <span>{record.assetType} / {record.storeName}</span>
                      </td>
                      <td>
                        <strong>{record.requestedAction}</strong>
                        <span>{record.override ? "override" : record.auditOnly ? "audit only" : "status change"}</span>
                      </td>
                      <td>{record.scoringRecommendation}</td>
                      <td>
                        <strong>{record.assetScore.finalRank}</strong>
                        <span>e{record.assetScore.economicsScore} / r{record.assetScore.readinessScore} / p-{record.assetScore.riskPenalty} / v{record.assetScore.velocity}</span>
                      </td>
                      <td>{record.reason}</td>
                      <td>{record.toStatus ?? record.nextInternalState ?? "No change"}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6}>No asset control decisions have been recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <div className="growth-blocked-actions">
              <strong>Asset control records remain internal</strong>
              {assetControlLedger.blockedExternalActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>
        ) : null}

        {revenueRotationMessage ? <p className="growth-approval-message" role="status">{revenueRotationMessage}</p> : null}
        {listingOptimizationMessage ? <p className="growth-approval-message" role="status">{listingOptimizationMessage}</p> : null}
        {storeSetupMessage ? <p className="growth-approval-message" role="status">{storeSetupMessage}</p> : null}
        {launchPipelineMessage ? <p className="growth-approval-message" role="status">{launchPipelineMessage}</p> : null}
        {digitalProductMessage ? <p className="growth-approval-message" role="status">{digitalProductMessage}</p> : null}
        {facelessContentMessage ? <p className="growth-approval-message" role="status">{facelessContentMessage}</p> : null}
        {performanceMessage ? <p className="growth-approval-message" role="status">{performanceMessage}</p> : null}
        {financialMessage ? <p className="growth-approval-message" role="status">{financialMessage}</p> : null}
        {financialReviewMessage ? <p className="growth-approval-message" role="status">{financialReviewMessage}</p> : null}
        {financialScalingBudgetReviewMessage ? <p className="growth-approval-message" role="status">{financialScalingBudgetReviewMessage}</p> : null}
        {financialScalingSpendControlMessage ? <p className="growth-approval-message" role="status">{financialScalingSpendControlMessage}</p> : null}
        {financialScalingExecutionLedgerMessage ? <p className="growth-approval-message" role="status">{financialScalingExecutionLedgerMessage}</p> : null}
        {financialGovernanceMessage ? <p className="growth-approval-message" role="status">{financialGovernanceMessage}</p> : null}
        {portfolioCommandMessage ? <p className="growth-approval-message" role="status">{portfolioCommandMessage}</p> : null}
      </div>

      <div className="merch-pricing-card">
        <div className="merch-tool-title">
          <Calculator aria-hidden="true" size={16} />
          <strong>Pricing Calculator</strong>
        </div>
        <div className="merch-ops-grid compact">
          <label>
            <span>Preset</span>
            <select value={pricingForm.preset} onChange={(event) => updatePricingForm("preset", event.target.value as PricingPlatformPreset)}>
              {pricingPlatformPresets.map((preset) => <option key={preset} value={preset}>{preset}</option>)}
            </select>
          </label>
          <label>
            <span>Supplier Cost</span>
            <input type="number" min={0} step="0.01" value={pricingForm.supplierCost} onChange={(event) => updatePricingForm("supplierCost", Number(event.target.value))} />
          </label>
          <label>
            <span>Shipping Cost</span>
            <input type="number" min={0} step="0.01" value={pricingForm.shippingCost} onChange={(event) => updatePricingForm("shippingCost", Number(event.target.value))} />
          </label>
          <label>
            <span>Retail Price</span>
            <input type="number" min={0} step="0.01" value={pricingForm.retailPrice} onChange={(event) => updatePricingForm("retailPrice", Number(event.target.value))} />
          </label>
          <label>
            <span>Platform Fee %</span>
            <input type="number" min={0} max={95} step="0.1" value={pricingForm.platformFeePercent ?? 0} onChange={(event) => updatePricingForm("platformFeePercent", Number(event.target.value))} />
          </label>
          <label>
            <span>Listing Fee</span>
            <input type="number" min={0} step="0.01" value={pricingForm.listingFee ?? 0} onChange={(event) => updatePricingForm("listingFee", Number(event.target.value))} />
          </label>
          <label>
            <span>Processing</span>
            <input type="number" min={0} step="0.01" value={pricingForm.paymentProcessingEstimate ?? 0} onChange={(event) => updatePricingForm("paymentProcessingEstimate", Number(event.target.value))} />
          </label>
          <label>
            <span>Ad Spend</span>
            <input type="number" min={0} step="0.01" value={pricingForm.adSpendEstimate} onChange={(event) => updatePricingForm("adSpendEstimate", Number(event.target.value))} />
          </label>
        </div>
        <div className="merch-ops-actions">
          <button type="button" className="primary" onClick={calculatePricing} disabled={isCalculatingPricing}>
            {isCalculatingPricing ? <Loader2 aria-hidden="true" size={15} /> : <Calculator aria-hidden="true" size={15} />}
            Calculate
          </button>
        </div>
        {pricing ? (
          <dl className="merch-pricing-results">
            <div>
              <dt>Estimated Profit</dt>
              <dd>{formatMerchCurrency(pricing.pricing.estimatedProfit)}</dd>
            </div>
            <div>
              <dt>Profit Margin</dt>
              <dd>{pricing.pricing.profitMargin.toFixed(1)}%</dd>
            </div>
            <div>
              <dt>Break-even</dt>
              <dd>{formatMerchCurrency(pricing.pricing.breakEvenPrice)}</dd>
            </div>
            <div>
              <dt>Recommended Retail</dt>
              <dd>{formatMerchCurrency(pricing.pricing.recommendedRetailPrice)}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      <div className="merch-report-card">
        <div className="merch-tool-title">
          <FileText aria-hidden="true" size={16} />
          <strong>Launch Package & Reports</strong>
        </div>
        <div className="merch-ops-grid">
          <label>
            <span>Report Type</span>
            <select value={reportType} onChange={(event) => setReportType(event.target.value as MerchReportType)}>
              {merchReportTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
        </div>
        <div className="merch-ops-actions split">
          <button type="button" onClick={generateLaunchPackage} disabled={isGeneratingLaunchPackage || !selectedStore}>
            {isGeneratingLaunchPackage ? <Loader2 aria-hidden="true" size={15} /> : <PackageCheck aria-hidden="true" size={15} />}
            Build package
          </button>
          <button type="button" onClick={generateProviderPayloads} disabled={isGeneratingProviderPayloads || !selectedStore}>
            {isGeneratingProviderPayloads ? <Loader2 aria-hidden="true" size={15} /> : <LockKeyhole aria-hidden="true" size={15} />}
            Provider payloads
          </button>
          <button type="button" className="primary" onClick={generateReport} disabled={isGeneratingReport || !selectedStore}>
            {isGeneratingReport ? <Loader2 aria-hidden="true" size={15} /> : <FileText aria-hidden="true" size={15} />}
            Generate report
          </button>
        </div>
        {launchPackage ? (
          <div className="merch-launch-package-result">
            <strong>Launch Package</strong>
            <p>{launchPackage.productCollectionSummary}</p>
            <span>{launchPackage.approvedProducts.length} approved products included</span>
            <span>{launchPackage.listingDrafts.length} listing drafts ready for review</span>
            <span>{launchPackage.complianceNotes.length} compliance notes attached</span>
          </div>
        ) : null}
        {providerPayloadPackage ? (
          <section className="provider-payload-result" aria-label="Locked provider payload package">
            <header>
              <span>{providerPayloadPackage.mode}</span>
              <strong>{providerPayloadPackage.payloadCount} payload drafts / {providerPayloadPackage.readinessScore}% ready</strong>
              <p>{providerPayloadPackage.summary}</p>
            </header>
            <div className="provider-payload-grid">
              {providerPayloadPackage.productPayloads.slice(0, 4).map((product) => (
                <article key={`${product.productName}-${product.productType}`}>
                  <span>{product.status} / {formatMerchCurrency(product.retailPrice)}</span>
                  <strong>{product.productName}</strong>
                  <p>{product.payloads.map((payload) => payload.provider).join(", ")}</p>
                  <small>{product.payloads[0]?.status ?? "Draft - not sent"}</small>
                </article>
              ))}
            </div>
            <div className="growth-blocked-actions">
              <strong>Provider execution remains blocked</strong>
              {providerPayloadPackage.blockedActions.slice(0, 4).map((action) => <span key={action}>{action}</span>)}
            </div>
            {providerPayloadPackage.warnings.length > 0 ? (
              <p>{providerPayloadPackage.warnings.join(" ")}</p>
            ) : null}
            <div className="growth-approval-request">
              <button type="button" onClick={requestProviderPayloadApproval} disabled={isRequestingProviderPayloadApproval}>
                {isRequestingProviderPayloadApproval ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
                Queue provider approval
              </button>
              <small>No provider API request, upload, listing creation, or publishing happens from this packet.</small>
            </div>
            {providerPayloadApprovalResponse ? (
              <section className="growth-approval-packet" aria-label="Queued provider payload approval packet">
                <div>
                  <span>{providerPayloadApprovalResponse.packet.mode} / {providerPayloadApprovalResponse.packet.status}</span>
                  <strong>Provider approval packet queued</strong>
                  <p>{providerPayloadApprovalResponse.packet.summary}</p>
                  <small>Audit log: {providerPayloadApprovalResponse.auditLogId}</small>
                </div>
                <div className="growth-approval-actions">
                  {providerPayloadApprovalResponse.packet.actions.slice(0, 4).map((action) => (
                    <article key={action.id}>
                      <span>{action.channel} / {action.approvalStatus}</span>
                      <strong>{action.title}</strong>
                      <p>{action.executionState}</p>
                    </article>
                  ))}
                </div>
                {providerPayloadApprovalResponse.packet.providerPayloadPackage ? (
                  <p>{providerPayloadApprovalResponse.packet.providerPayloadPackage.summary}</p>
                ) : null}
                {providerPayloadApprovalResponse.packet.rollbackChecklist?.[0] ? (
                  <p>{providerPayloadApprovalResponse.packet.rollbackChecklist[0]}</p>
                ) : null}
              </section>
            ) : null}
          </section>
        ) : null}
        {report ? (
          <article className="merch-report-result">
            <strong>{report.title}</strong>
            <p><b>Situation:</b> {report.situation}</p>
            <p><b>Analysis:</b> {report.analysis}</p>
            <p><b>Recommendation:</b> {report.recommendation}</p>
            <div>
              <b>Next Actions:</b>
              {report.nextActions.map((action) => <span key={action}>{action}</span>)}
            </div>
          </article>
        ) : null}
      </div>

      <div className="merch-growth-card">
        <div className="merch-tool-title">
          <Megaphone aria-hidden="true" size={16} />
          <strong>Growth & Scale Plan</strong>
        </div>
        <p className="merch-automation-note">
          <strong>Mock Mode / Approval Required</strong>
          <span>Prepares social, Shopify, ad, and analytics work for review. Posting, store changes, ad spend, and data imports stay locked.</span>
        </p>
        <div className="merch-ops-actions">
          <button type="button" className="primary" onClick={generateGrowthPlan} disabled={isGeneratingGrowthPlan || !selectedStore}>
            {isGeneratingGrowthPlan ? <Loader2 aria-hidden="true" size={15} /> : <LineChart aria-hidden="true" size={15} />}
            Build growth plan
          </button>
          <button type="button" onClick={loadGrowthApprovals} disabled={isLoadingGrowthApprovals || !selectedStore}>
            {isLoadingGrowthApprovals ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Load review queue
          </button>
        </div>

        {growthPlan ? (
          <div className="growth-plan-result">
            <div className="growth-readiness">
              <span>Readiness</span>
              <strong>{growthPlan.readinessScore}/100</strong>
              <p>{growthPlan.summary}</p>
            </div>

            <div className="growth-plan-grid">
              <section aria-label="Prepared content drafts">
                <h4>Content drafts</h4>
                {growthPlan.contentDrafts.map((draft) => (
                  <article key={draft.title}>
                    <span>{draft.channel} / {draft.approvalStatus}</span>
                    <strong>{draft.title}</strong>
                    <p>{draft.copy}</p>
                  </article>
                ))}
              </section>

              <section aria-label="Spend-locked ad campaign drafts">
                <h4>Ad drafts</h4>
                {growthPlan.adCampaignDrafts.map((campaign) => (
                  <article key={campaign.name}>
                    <span>{campaign.status}</span>
                    <strong>{campaign.name}</strong>
                    <p>{campaign.objective}</p>
                    <small>{campaign.budgetGuardrail}</small>
                  </article>
                ))}
              </section>

              <section aria-label="Growth approval queue">
                <h4>Approval queue</h4>
                {growthPlan.approvalQueue.map((item) => (
                  <p key={item}><LockKeyhole aria-hidden="true" size={14} /> {item}</p>
                ))}
              </section>

              <section aria-label="Growth analytics loop">
                <h4>Analytics loop</h4>
                {growthPlan.analyticsLoop.map((item) => (
                  <article key={`${item.metric}-${item.cadence}`}>
                    <span>{item.cadence}</span>
                    <strong>{item.metric}</strong>
                    <p>{item.source}</p>
                    <small>{item.guardrail}</small>
                  </article>
                ))}
              </section>
            </div>

            <div className="growth-blocked-actions">
              <strong>Blocked until explicit approval</strong>
              {growthPlan.blockedActions.map((action) => <span key={action}>{action}</span>)}
            </div>

            <div className="growth-approval-request">
              <label>
                <span>Approval review time</span>
                <input
                  aria-label="Growth approval review time"
                  type="datetime-local"
                  value={growthApprovalSchedule}
                  onChange={(event) => setGrowthApprovalSchedule(event.target.value)}
                />
              </label>
              <button type="button" onClick={requestGrowthApproval} disabled={isRequestingGrowthApproval}>
                {isRequestingGrowthApproval ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
                Queue approval packet
              </button>
              <small>No publishing, storefront updates, ad spend, or analytics imports happen from this packet.</small>
            </div>

            {growthApprovalResponse ? (
              <section className="growth-approval-packet" aria-label="Queued growth approval packet">
                <div>
                  <span>{growthApprovalResponse.packet.mode} / {growthApprovalResponse.packet.status}</span>
                  <strong>Approval packet queued</strong>
                  <p>{growthApprovalResponse.packet.summary}</p>
                  <small>Audit log: {growthApprovalResponse.auditLogId}</small>
                </div>
                <div className="growth-approval-actions">
                  {growthApprovalResponse.packet.actions.map((action) => (
                    <article key={action.id}>
                      <span>{action.channel} / {action.approvalStatus}</span>
                      <strong>{action.title}</strong>
                      <p>{action.executionState}</p>
                    </article>
                  ))}
                </div>
                <p>{growthApprovalResponse.packet.costGuardrail}</p>
              </section>
            ) : null}
          </div>
        ) : null}

        {growthApprovalMessage ? <p className="growth-approval-message" role="status">{growthApprovalMessage}</p> : null}

        {growthApprovals.length > 0 ? (
          <section className="growth-approval-review-list" aria-label="Growth approval review queue">
            <header>
              <strong>Growth approval queue</strong>
              <span>Real review records / external execution locked</span>
            </header>
            {growthApprovals.map((approval) => (
              <article key={approval.id}>
                <div>
                  <span>{approval.mode} / {approval.statusLabel}</span>
                  <strong>{approval.packet.businessName}</strong>
                  <p>{approval.packet.summary}</p>
                  <small>{approval.executionState} / Audit: {approval.reviewAuditLogId ?? approval.auditLogId ?? "pending"}</small>
                </div>
                {approval.status === "pending" ? (
                  <div className="growth-review-actions">
                    <button type="button" onClick={() => reviewGrowthApproval(approval, "approve")} disabled={reviewingGrowthApprovalId === approval.id}>
                      {reviewingGrowthApprovalId === approval.id ? <Loader2 aria-hidden="true" size={14} /> : <CheckCircle2 aria-hidden="true" size={14} />}
                      Approve preparation
                    </button>
                    <button type="button" onClick={() => reviewGrowthApproval(approval, "reject")} disabled={reviewingGrowthApprovalId === approval.id}>
                      <XCircle aria-hidden="true" size={14} />
                      Reject packet
                    </button>
                  </div>
                ) : null}
                {approval.status === "approved" ? (
                  <div className="growth-review-actions">
                    <button type="button" onClick={() => previewGrowthOrchestration(approval)} disabled={previewingGrowthApprovalId === approval.id}>
                      {previewingGrowthApprovalId === approval.id ? <Loader2 aria-hidden="true" size={14} /> : <LineChart aria-hidden="true" size={14} />}
                      Preview locked schedule
                    </button>
                    {approval.packet.providerPayloadPackage ? (
                      <button type="button" onClick={() => buildProviderHandoff(approval)} disabled={buildingProviderHandoffId === approval.id}>
                        {buildingProviderHandoffId === approval.id ? <Loader2 aria-hidden="true" size={14} /> : <FileText aria-hidden="true" size={14} />}
                        Build provider handoff
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}

        {growthOrchestrationPreview ? (
          <section className="growth-orchestration-preview" aria-label="Locked growth orchestration preview">
            <header>
              <span>{growthOrchestrationPreview.preview.mode} / {growthOrchestrationPreview.preview.status}</span>
              <strong>Locked orchestration preview</strong>
              <p>{growthOrchestrationPreview.preview.summary}</p>
              <small>Audit log: {growthOrchestrationPreview.auditLogId} / External spend: {growthOrchestrationPreview.preview.estimatedExternalSpendCents} cents / AI cost: {growthOrchestrationPreview.preview.estimatedAiCostCents} cents</small>
            </header>
            <div className="growth-orchestration-steps">
              {growthOrchestrationPreview.preview.steps.map((step) => (
                <article key={step.actionId}>
                  <span>{step.channel} / {step.status}</span>
                  <strong>{step.title}</strong>
                  <p>{step.executionState}</p>
                  <small>{step.guardrail}</small>
                </article>
              ))}
            </div>
            <p>{growthOrchestrationPreview.preview.auditEvents.join(" ")}</p>
          </section>
        ) : null}

        {providerHandoffResponse ? (
          <section className="growth-orchestration-preview" aria-label="Provider handoff bundle">
            <header>
              <span>{providerHandoffResponse.bundle.mode} / {providerHandoffResponse.bundle.connectorReadiness.status}</span>
              <strong>Provider handoff bundle</strong>
              <p>{providerHandoffResponse.bundle.summary}</p>
              <small>Audit log: {providerHandoffResponse.auditLogId} / Readiness: {providerHandoffResponse.bundle.connectorReadiness.score}/100 / Provider contacted: {String(providerHandoffResponse.bundle.providerContacted)}</small>
            </header>
            <div className="growth-orchestration-steps">
              {providerHandoffResponse.bundle.requestManifest.slice(0, 5).map((manifest) => (
                <article key={manifest.id}>
                  <span>{manifest.provider} / {manifest.method} / {manifest.executionState}</span>
                  <strong>{manifest.productName}</strong>
                  <p>{manifest.pathTemplate}</p>
                  <small>{manifest.credentialScope.join(", ")} / {manifest.artifactSlots.length} artifact slots</small>
                </article>
              ))}
            </div>
            {providerHandoffResponse.bundle.drift.warnings.length > 0 ? (
              <p>{providerHandoffResponse.bundle.drift.warnings.join(" ")}</p>
            ) : (
              <p>{providerHandoffResponse.bundle.manualLaunchChecklist[0]}</p>
            )}
          </section>
        ) : null}
      </div>

      <p className="merch-compliance-disclaimer">
        <ShieldAlert aria-hidden="true" size={15} />
        Compliance warnings are operational risk signals only, not legal advice. Flagged products require user approval before publishing.
      </p>

      {error ? <p className="merch-ops-error" role="alert">{error}</p> : null}
    </section>
  );
}
