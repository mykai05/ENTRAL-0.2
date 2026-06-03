import { resolve } from "node:path";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { config } from "dotenv";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { generateProductBatch, type ProductBatchInput } from "./services/productBatchGenerator.js";
import { analyzeCompliance, formatComplianceNotes } from "./services/complianceGuardrails.js";
import { buildDigitalProductPortfolioPlan, type DigitalProductOptions } from "./services/digitalProductPortfolio.js";
import {
  buildFinancialScalingBudgetReviewPlan,
  buildFinancialOrchestratorPlan,
  type FinancialOrchestratorOptions,
  type FinancialScalingBudgetPacket,
  type FinancialScalingBudgetPacketSnapshot,
  type FinancialScalingBudgetPacketStatus
} from "./services/financialOrchestrator.js";
import {
  buildFinancialPayoutReviewPlan,
  type FinancialBudgetReleasePacket,
  type FinancialPayoutIntentSnapshot
} from "./services/financialPayoutReview.js";
import {
  buildFinancialReleaseGovernancePlan,
  type FinancialPersistedReconciliationSnapshot,
  type FinancialPersistedReleasePacketSnapshot
} from "./services/financialReleaseGovernance.js";
import {
  buildFinancialScalingSpendControlPlan,
  type FinancialPersistedScalingSpendPacketSnapshot,
  type FinancialScalingSpendControlPlan,
  type FinancialScalingSpendPacket
} from "./services/financialScalingSpendControl.js";
import {
  buildFinancialScalingExecutionLedgerPlan,
  normalizeFinancialScalingExecutionEntry,
  type FinancialScalingExecutionEntrySnapshot,
  type FinancialScalingExecutionLedgerPlan,
  type FinancialScalingExecutionOutcome,
  type FinancialScalingExecutionSource
} from "./services/financialScalingExecutionLedger.js";
import {
  buildFacelessContentPipelinePlan,
  type FacelessContentBrief,
  type FacelessContentChannel,
  type FacelessContentOptions,
  type FacelessContentPerformanceSnapshot
} from "./services/facelessContentPipeline.js";
import {
  buildPortfolioCommandCenterPlan,
  type PortfolioCommandCenterPlan,
  type PortfolioCommandCenterOptions,
  type PortfolioCommandItem,
  type PortfolioCommandRecordSnapshot,
  type PortfolioCommandRecordStatus
} from "./services/portfolioCommandCenter.js";
import {
  buildBrowserOperationsPlan,
  type BrowserOperationConfig,
  type BrowserOperationJobSnapshot,
  type BrowserOperationOptions,
  type BrowserOperationsPlan
} from "./services/browserOperations.js";
import { buildGrowthApprovalPacket, buildGrowthOrchestrationPreview, buildGrowthPlan, type GrowthApprovalPacket as GrowthApprovalPacketPayload } from "./services/growthPlans.js";
import { buildLaunchPackage, buildMerchReport, type MerchReportType } from "./services/merchReports.js";
import { buildProviderHandoffBundle, buildProviderPayloadApprovalPacket, buildProviderPayloadPackage, isProviderPayloadApprovalPacket } from "./services/merchProviderPayloads.js";
import { calculatePricing, pricingPlatformPresets, type PricingPlatformPreset } from "./services/pricingCalculator.js";
import { buildRevenueAssetBatchControlPlan, buildRevenueAssetControlPlan, buildRevenueAssetPortfolio, buildRevenueEnginePlan, mergeRevenueAssetPortfolioPerformance, type RevenueEngineThresholds } from "./services/revenueEngine.js";
import { buildRevenueBusinessFleetLaunchGapPlan, buildRevenueBusinessFleetSchedulerPlan, selectRevenueBusinessFleetLaunchWave, type RevenueBusinessFleetOptions } from "./services/revenueBusinessFleetScheduler.js";
import {
  buildRevenueAssetControlLedgerPlan,
  buildRevenueAssetControlRecoveryPlan,
  revenueAssetControlRecordFromPlan,
  type RevenueAssetControlRecordSnapshot
} from "./services/revenueAssetControlLedger.js";
import { buildRevenueAssetReviewQueuePlan } from "./services/revenueAssetReviewQueue.js";
import { buildRevenueAssetControlsFromPortfolioCommands } from "./services/revenuePortfolioCommandAssetControls.js";
import { buildRevenuePortfolioDashboardPlan } from "./services/revenuePortfolioDashboard.js";
import {
  buildRevenueLaunchReadinessPlan,
  type RevenueLaunchReadinessApprovalSnapshot,
  type RevenueLaunchReadinessOptions,
  type RevenueLaunchReadinessPlan,
  type RevenueLaunchReadinessStoreSnapshot
} from "./services/revenueLaunchReadiness.js";
import {
  buildRevenueLaunchChecklistPlan,
  type RevenueLaunchChecklistOptions
} from "./services/revenueLaunchChecklist.js";
import {
  buildRevenueLaunchChecklistActionBridgePlan,
  revenueLaunchChecklistActionBridgeConfirmation,
  selectRevenueLaunchChecklistBridgeActions,
  type RevenueLaunchChecklistActionBridgeItem,
  type RevenueLaunchChecklistActionBridgeOptions,
  type RevenueLaunchChecklistActionBridgePlan
} from "./services/revenueLaunchChecklistActionBridge.js";
import {
  buildRevenueLaunchSprintCycle,
  buildRevenueLaunchSprintPlan,
  revenueLaunchSprintConfirmation,
  selectRevenueLaunchSprintBridgeActions,
  type RevenueLaunchSprintCycle,
  type RevenueLaunchSprintFactorySummary,
  type RevenueLaunchSprintOptions
} from "./services/revenueLaunchSprint.js";
import {
  buildRevenueLaunchHandoffPlan,
  revenueLaunchHandoffDedupeKey,
  revenueLaunchHandoffRecordStatus,
  type RevenueLaunchHandoffItem,
  type RevenueLaunchHandoffPacketRecordSnapshot,
  type RevenueLaunchHandoffOptions
} from "./services/revenueLaunchHandoff.js";
import {
  buildRevenueLaunchHandoffControlPlan,
  evaluateRevenueLaunchHandoffControlUpdate,
  revenueLaunchHandoffControlStatuses,
  type RevenueLaunchHandoffControlOptions,
  type RevenueLaunchHandoffControlStatus
} from "./services/revenueLaunchHandoffControl.js";
import {
  buildRevenueLaunchOperationsPackPlan,
  revenueLaunchOperationsPackConfirmation,
  selectRevenueLaunchOperationsPacks,
  type RevenueLaunchOperationsPackOptions
} from "./services/revenueLaunchOperationsPack.js";
import {
  buildRevenueLaunchClosureLedgerPlan,
  revenueLaunchClosureLedgerConfirmation,
  selectRevenueLaunchClosureLedgerEntries,
  type RevenueLaunchClosureLedgerOptions
} from "./services/revenueLaunchClosureLedger.js";
import {
  buildRevenueLiveConnectorReadinessRegistryPlan,
  revenueLiveConnectorReadinessRegistryConfirmation,
  selectRevenueLiveConnectorReadinessEntries,
  type RevenueLiveConnectorReadinessOptions
} from "./services/revenueLiveConnectorReadinessRegistry.js";
import {
  buildRevenueFirstCashReadinessPlan,
  type RevenueFirstCashReadinessOptions
} from "./services/revenueFirstCashReadiness.js";
import {
  buildRevenueFirstCashSprintPlan,
  revenueFirstCashSprintConfirmation,
  selectRevenueFirstCashSprintBridgeActionIds,
  type RevenueFirstCashSprintOptions
} from "./services/revenueFirstCashSprint.js";
import { buildRevenueFirstBusinessLaunchPlan } from "./services/revenueFirstBusinessLaunch.js";
import {
  buildRevenueLiveConnectorDesignDossierPlan,
  revenueLiveConnectorDesignDossierConfirmation,
  selectRevenueLiveConnectorDesignDossiers,
  type RevenueLiveConnectorDesignDossierOptions
} from "./services/revenueLiveConnectorDesignDossier.js";
import {
  buildRevenueLaunchPipeline,
  type RevenueLaunchAction,
  type RevenueLaunchPipelineOptions,
  type RevenueLaunchPipelinePlan
} from "./services/revenueLaunchPipeline.js";
import {
  buildRevenueListingOptimizationPlan,
  type RevenueListingOptimizationPlan,
  type RevenueListingOptimizationOptions
} from "./services/revenueListingOptimization.js";
import {
  buildRevenueStoreSetupPlan,
  type RevenueStoreSetupPlan,
  type RevenueStoreSetupOptions
} from "./services/revenueStoreSetup.js";
import {
  buildRevenueAutopilotPlan,
  selectRevenueAutopilotExecutionSteps,
  type RevenueAutopilotExecutableActionKind,
  type RevenueAutopilotExecutionStep,
  type RevenueAutopilotOptions,
  type RevenueAutopilotPlan
} from "./services/revenueAutopilot.js";
import {
  buildRevenueOpportunityFactoryPlan,
  revenueOpportunitySourceKey,
  type RevenueOpportunityFactoryOptions
} from "./services/revenueOpportunityFactory.js";
import {
  buildRevenueOpportunityControlPlan,
  evaluateRevenueOpportunityControlUpdate,
  revenueOpportunityControlStatuses,
  type RevenueOpportunityControlOptions,
  type RevenueOpportunityControlPerformanceSnapshot,
  type RevenueOpportunityControlProductSnapshot,
  type RevenueOpportunityControlStoreSnapshot,
  type RevenueOpportunitySnapshot,
  type RevenueOpportunityControlStatus
} from "./services/revenueOpportunityControl.js";
import {
  buildRevenuePerformanceDigest,
  calculateRevenuePerformanceNetProfit,
  normalizeRevenuePerformanceSnapshot,
  type RevenuePerformanceOptions,
  type RevenuePerformanceSnapshotInput
} from "./services/revenuePerformance.js";
import {
  buildSignalIntakePlan,
  type SignalIntakeInput,
  type SignalIntakeOptions,
  type SignalIntakePlan
} from "./services/signalIntakeCenter.js";
import {
  buildRevenueSignalConnectorPlan,
  revenueSignalConnectorConfirmation,
  selectRevenueSignalConnectorManifests,
  type RevenueSignalConnectorManifest,
  type RevenueSignalConnectorOptions
} from "./services/revenueSignalConnectors.js";
import {
  buildRevenueSignalConnectorApprovalPlan,
  revenueSignalConnectorApprovalConfirmation,
  revenueSignalConnectorApprovalDedupeKey,
  revenueSignalConnectorApproveConfirmation,
  revenueSignalConnectorRejectConfirmation,
  revenueSignalImportJobConfirmation,
  selectRevenueSignalApprovalsForImport,
  type RevenueSignalConnectorApprovalRecordSnapshot,
  type RevenueSignalImportJobSnapshot
} from "./services/revenueSignalConnectorApprovals.js";
import {
  buildRevenueSignalImportHandoffPlan,
  mergeRevenueSignalImportJobPayloads,
  revenueSignalImportHandoffConfirmation,
  selectRevenueSignalImportJobsForHandoff
} from "./services/revenueSignalImportHandoff.js";
import type { AiActionPlan } from "./services/aiBrain.js";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../.env") });

type User = {
  email: string;
  id: string;
  name: string;
  password: string;
  role: "USER" | "ADMIN";
};

type Team = {
  id: string;
  name: string;
  role: "OWNER" | "MEMBER";
  slug: string;
  userId: string;
};

type Task = {
  createdAt: string;
  description?: string | null;
  id: string;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "ARCHIVED";
  team: {
    id: string;
    name: string;
  };
  teamId: string;
  title: string;
  userId: string;
};

type Message = {
  content: string;
  createdAt: string;
  id: string;
  role: "user" | "assistant";
};

type Conversation = {
  createdAt: string;
  id: string;
  messages: Message[];
  title: string;
  updatedAt: string;
  userId: string;
};

type AiUsageEvent = {
  createdAt: string;
  estimatedCostCents: number;
  id: string;
  modelName: string;
  providerName: string;
  requestKind: string;
  usedLocalFallback: boolean;
  userId: string;
};

type OpenAiMessage = {
  role: "assistant" | "user";
  content: string;
};

type AutomationJob = {
  createdAt: string;
  error?: string | null;
  id: string;
  logs: Array<{ createdAt: string; id: string; level: string; message: string }>;
  payload: {
    selector?: string;
    url?: string;
  };
  result?: {
    content?: string;
    engine?: string;
    statusCode?: number;
    title?: string;
  } | null;
  scheduledAt?: string | null;
  status: string;
  type: string;
  userId: string;
};

type Agent = {
  capabilities: string[];
  id: string;
  isPaused: boolean;
  lastActivitySeenAt?: string | null;
  load: number;
  name: string;
  role: string;
  runInBackground: boolean;
  status: string;
  userId: string;
  webhookUrl?: string | null;
};

type AgentTask = {
  action: string;
  completedAt?: string | null;
  error?: string | null;
  id: string;
  result?: { recommendation?: string; summary?: string } | null;
  scheduleId?: string | null;
  status: string;
  title: string;
};

type AgentSchedule = {
  action: string;
  id: string;
  intervalMinutes: number;
  lastRunAt?: string | null;
  nextRunAt: string;
  status: string;
  title: string;
};

type AgentLog = {
  createdAt: string;
  id: string;
  level: string;
  message: string;
};

type AgentMessage = {
  action: string;
  createdAt: string;
  id: string;
  taskId?: string | null;
  type: string;
};

type Policy = {
  description?: string | null;
  effect: string;
  enabled: boolean;
  id: string;
  name: string;
  rule: Record<string, unknown>;
  severity: string;
};

type CommandOSSnapshot = {
  createdAt: string;
  id: string;
  source: string;
  state: Record<string, unknown>;
  stateVersion: number;
  updatedAt: string;
  userId: string;
};

type ClientMerchStore = {
  audience: string;
  approvalStatus: "Not Started" | "Research Approved" | "Designs Pending" | "Designs Approved" | "Listings Approved" | "Launch Approved";
  brandStyle: string;
  businessName: string;
  clientName: string;
  contactName: string;
  createdAt: string;
  designCount: number;
  email: string;
  estimatedProfit: number;
  id: string;
  industry: string;
  launchStatus: "Lead" | "Discovery" | "Researching" | "Designing" | "Awaiting Approval" | "Building Store" | "Launched" | "Optimizing" | "Paused" | "Archived";
  monthlyFee: number;
  notes?: string | null;
  phone?: string | null;
  podProvider: "Printify" | "Printful" | "Other";
  productTypes: string[];
  profitShare: number;
  revenue: number;
  setupFee: number;
  storePlatform: "Etsy" | "Shopify" | "Other";
  updatedAt: string;
  userId: string;
};

type PodProduct = {
  aiDisclosureNeeded: boolean;
  colorDirection: string;
  complianceNotes?: string | null;
  createdAt: string;
  designConcept: string;
  designPrompt: string;
  designTheme: string;
  estimatedPlatformFees: number;
  estimatedProfit: number;
  id: string;
  listingDescription?: string | null;
  listingTitle?: string | null;
  mockupNotes?: string | null;
  productName: string;
  productType: string;
  productionPartnerDisclosureNeeded: boolean;
  profitMargin: number;
  retailPrice: number;
  shippingCost: number;
  status: "Idea" | "Prompt Ready" | "Designed" | "Mockup Created" | "Listing Drafted" | "Compliance Review" | "Awaiting Approval" | "Approved" | "Published" | "Needs Revision" | "Rejected" | "Archived";
  storeId: string;
  supplierCost: number;
  tags: string[];
  targetAudience: string;
  typographyDirection: string;
  updatedAt: string;
};

type RevenuePerformanceSnapshot = Required<Omit<RevenuePerformanceSnapshotInput, "netProfit" | "notes" | "productId" | "source">> & {
  createdAt: string;
  id: string;
  netProfit: number;
  notes: string | null;
  productId: string | null;
  source: "manual" | "etsy" | "shopify" | "printify" | "printful" | "stripe" | "other";
  userId: string;
};

type FinancialSplitPolicyRecord = {
  bufferPercent: number;
  createdAt: string;
  currency: "USD";
  externalExecution: false;
  id: string;
  metadata: Record<string, unknown>;
  minPayoutIntentAmount: number;
  personalPercent: number;
  reserveFloorAmount: number;
  scalingPercent: number;
  status: string;
  updatedAt: string;
  userId: string;
};

type FinancialLedgerEntryRecord = {
  allocatableProfit: number;
  allocation: {
    buffer: number;
    personal: number;
    scaling: number;
  };
  createdAt: string;
  currency: "USD";
  externalExecution: false;
  grossRevenue: number;
  id: string;
  netProfit: number;
  periodEnd: string;
  periodStart: string;
  productId: string | null;
  revenuePerformanceSnapshotId: string;
  source: RevenuePerformanceSnapshot["source"];
  status: string;
  storeId: string;
  updatedAt: string;
  userId: string;
};

type FinancialPayoutIntentRecord = {
  amount: number;
  approvalRequired: true;
  auditLogId?: string | null;
  category: string;
  createdAt: string;
  currency: "USD";
  dedupeKey: string;
  destinationType: string;
  externalExecution: false;
  id: string;
  metadata: Record<string, unknown>;
  provider: "Stripe Treasury + Connect";
  splitPolicyId: string | null;
  status: string;
  updatedAt: string;
  userId: string;
};

type FinancialScalingBudgetPacketRecord = {
  amount: number;
  approvalGate: FinancialScalingBudgetPacket["approvalGate"];
  approvalRequired: true;
  assetId: string;
  assetName: string;
  assetType: FinancialScalingBudgetPacket["assetType"];
  auditLogId?: string | null;
  blockedExternalActions: string[];
  budgetCap: FinancialScalingBudgetPacket["budgetCap"];
  confidence: number;
  createdAt: string;
  dedupeKey: string;
  externalExecution: false;
  id: string;
  metadata: Record<string, unknown>;
  priority: number;
  profitVelocity: number;
  providerContacted: false;
  reason: string;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  reviewNote?: string | null;
  score: number;
  scoreBand: FinancialScalingBudgetPacket["scoreBand"];
  splitPolicyId: string | null;
  status: FinancialScalingBudgetPacketStatus | string;
  storeId: string;
  storeName: string;
  updatedAt: string;
  userId: string;
};

type FinancialBudgetReleasePacketRecord = {
  amount: number;
  approvalState: FinancialBudgetReleasePacket["approvalState"];
  auditLogId?: string | null;
  blockedActions: string[];
  category: FinancialBudgetReleasePacket["category"];
  controls: string[];
  createdAt: string;
  currency: "USD";
  destinationType: string;
  externalExecution: false;
  id: string;
  maxReleaseAmount: number;
  payoutIntentId: string;
  purpose: string;
  releaseState: FinancialBudgetReleasePacket["releaseState"];
  updatedAt: string;
  userId: string;
};

type FinancialScalingSpendPacketRecord = {
  amount: number;
  approvalState: FinancialScalingSpendPacket["approvalState"];
  assetId: string;
  assetName: string;
  assetType: FinancialScalingSpendPacket["assetType"];
  auditLogId?: string | null;
  blockedActions: string[];
  budgetPacketId: string;
  category: FinancialScalingSpendPacket["category"];
  controls: string[];
  createdAt: string;
  currency: "USD";
  dedupeKey: string;
  externalExecution: false;
  id: string;
  maxSpendAmount: number;
  priority: number;
  providerContacted: false;
  purpose: string;
  releaseState: FinancialScalingSpendPacket["releaseState"];
  score: number;
  storeId: string;
  storeName: string;
  updatedAt: string;
  userId: string;
};

type FinancialScalingExecutionEntryRecord = {
  amountSpent: number;
  assetId: string;
  assetName: string;
  assetType: FinancialScalingSpendPacket["assetType"];
  auditLogId?: string | null;
  category: FinancialScalingSpendPacket["category"];
  createdAt: string;
  externalExecution: false;
  grossRevenue: number;
  id: string;
  netProfit: number;
  notes?: string | null;
  outcome: FinancialScalingExecutionOutcome;
  periodEnd: string;
  periodStart: string;
  productId: string | null;
  providerContacted: false;
  scalingSpendPacketId: string;
  source: FinancialScalingExecutionSource;
  storeId: string;
  storeName: string;
  unitsSold: number;
  updatedAt: string;
  userId: string;
  visits: number;
};

type FinancialReconciliationReportRecord = {
  approvedAmount: number;
  auditLogId?: string | null;
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
  userId: string;
  variance: number;
};

type FacelessContentBriefRecord = {
  auditLogId?: string | null;
  blockedActions: string[];
  channelPackages: FacelessContentBrief["channelPackages"];
  concept: FacelessContentBrief["concept"];
  createdAt: string;
  dedupeKey: string;
  externalExecution: false;
  id: string;
  priority: number;
  productId: string | null;
  providerReadiness: FacelessContentBrief["providerReadiness"];
  script: FacelessContentBrief["script"];
  status: string;
  storyboard: FacelessContentBrief["storyboard"];
  storeId: string;
  targetChannels: FacelessContentChannel[];
  title: string;
  updatedAt: string;
  userId: string;
  videoSpec: FacelessContentBrief["videoSpec"];
  voiceoverSpec: FacelessContentBrief["voiceoverSpec"];
};

type FacelessContentPerformanceSnapshotRecord = FacelessContentPerformanceSnapshot & {
  createdAt: string;
  updatedAt: string;
  userId: string;
};

type PortfolioCommandActionRecord = {
  action: PortfolioCommandItem["action"] | string;
  auditLogId?: string | null;
  commandHash: string;
  control: Record<string, unknown>;
  createdAt: string;
  externalExecution: false;
  id: string;
  priority: number;
  providerContacted: false;
  reason: string;
  recommendedStatus: string | null;
  riskLevel: PortfolioCommandItem["riskLevel"] | string;
  sourceModule: string;
  status: PortfolioCommandRecordStatus | string;
  targetId: string;
  targetName: string;
  targetType: PortfolioCommandItem["targetType"] | string;
  updatedAt: string;
  userId: string;
};

type RevenueLaunchHandoffPacketRecord = RevenueLaunchHandoffPacketRecordSnapshot & {
  userId: string;
};

type RevenueSignalConnectorApprovalRecord = RevenueSignalConnectorApprovalRecordSnapshot & {
  userId: string;
};

type RevenueSignalImportJobRecord = RevenueSignalImportJobSnapshot & {
  userId: string;
};

type RevenueOpportunityRecord = {
  auditLogId?: string | null;
  businessName: string;
  createdAt: string;
  externalExecution: false;
  id: string;
  idea: string;
  plan: Record<string, unknown>;
  providerContacted: false;
  sourceKey: string;
  status: string;
  storeId: string | null;
  totals: Record<string, unknown>;
  updatedAt: string;
  userId: string;
};

type MemoryRevenueAssetControlRecord = RevenueAssetControlRecordSnapshot & {
  userId: string;
};

type GrowthApprovalPacketRecord = {
  createdAt: string;
  id: string;
  mode: "Mock Mode";
  packet: GrowthApprovalPacketPayload;
  requestAuditLogId?: string | null;
  reviewAuditLogId?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  reviewNote?: string | null;
  scheduledFor?: string | null;
  status: "pending" | "approved" | "rejected";
  storeId: string;
  updatedAt: string;
  userId: string;
};

const app = Fastify({
  logger: {
    level: "info"
  }
});

const state = {
  agentLogs: new Map<string, AgentLog[]>(),
  agentMessages: new Map<string, AgentMessage[]>(),
  agents: new Map<string, Agent>(),
  agentSchedules: new Map<string, AgentSchedule[]>(),
  agentTasks: new Map<string, AgentTask[]>(),
  aiUsageEvents: [] as AiUsageEvent[],
  auditLogs: [] as Array<{
    action: string;
    createdAt: string;
    entry: Record<string, unknown>;
    entryHash: string;
    id: string;
    outcome: string;
    severity: string;
    targetId?: string | null;
    targetType: string;
  }>,
  automationJobs: [] as AutomationJob[],
  commandSnapshots: new Map<string, CommandOSSnapshot>(),
  conversations: new Map<string, Conversation>(),
  facelessContentBriefs: [] as FacelessContentBriefRecord[],
  facelessContentPerformanceSnapshots: [] as FacelessContentPerformanceSnapshotRecord[],
  financialBudgetReleasePackets: [] as FinancialBudgetReleasePacketRecord[],
  financialLedgerEntries: [] as FinancialLedgerEntryRecord[],
  financialPayoutIntents: [] as FinancialPayoutIntentRecord[],
  financialReconciliationReports: [] as FinancialReconciliationReportRecord[],
  financialScalingBudgetPackets: [] as FinancialScalingBudgetPacketRecord[],
  financialScalingExecutionEntries: [] as FinancialScalingExecutionEntryRecord[],
  financialScalingSpendPackets: [] as FinancialScalingSpendPacketRecord[],
  financialSplitPolicies: [] as FinancialSplitPolicyRecord[],
  growthApprovalPackets: [] as GrowthApprovalPacketRecord[],
  merchStores: [] as ClientMerchStore[],
  podProducts: [] as PodProduct[],
  portfolioCommandActions: [] as PortfolioCommandActionRecord[],
  revenueLaunchHandoffPackets: [] as RevenueLaunchHandoffPacketRecord[],
  revenueAssetControlRecords: [] as MemoryRevenueAssetControlRecord[],
  revenueOpportunities: [] as RevenueOpportunityRecord[],
  revenuePerformanceSnapshots: [] as RevenuePerformanceSnapshot[],
  revenueSignalConnectorApprovals: [] as RevenueSignalConnectorApprovalRecord[],
  revenueSignalImportJobs: [] as RevenueSignalImportJobRecord[],
  policies: new Map<string, Policy>(),
  sessions: new Map<string, string>(),
  tasks: [] as Task[],
  teams: new Map<string, Team>(),
  users: new Map<string, User>()
};

const openAiModel = process.env.OPENAI_MODEL?.trim() || "gpt-4o";
const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
let openAiClient: OpenAI | null = null;
const aiDailyCostLimitCents = Number(process.env.AI_DAILY_COST_LIMIT_CENTS ?? 250);
const aiMonthlyCostLimitCents = Number(process.env.AI_MONTHLY_COST_LIMIT_CENTS ?? 2500);
const aiDecisionEstimatedCostCents = Number(process.env.AI_DECISION_ESTIMATED_COST_CENTS ?? 1);
const aiChatEstimatedCostCents = Number(process.env.AI_CHAT_ESTIMATED_COST_CENTS ?? 4);
const aiScreenEstimatedCostCents = Number(process.env.AI_SCREEN_ESTIMATED_COST_CENTS ?? 8);
const aiLocalFallbackEstimatedCostCents = Number(process.env.AI_LOCAL_FALLBACK_ESTIMATED_COST_CENTS ?? 0);

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}

function startOfUtcMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
}

function aiUsageSummary(userId: string) {
  const dailySince = startOfUtcDay();
  const monthlySince = startOfUtcMonth();
  const dailyUsedCents = state.aiUsageEvents
    .filter((event) => event.userId === userId && event.createdAt >= dailySince)
    .reduce((sum, event) => sum + event.estimatedCostCents, 0);
  const monthlyUsedCents = state.aiUsageEvents
    .filter((event) => event.userId === userId && event.createdAt >= monthlySince)
    .reduce((sum, event) => sum + event.estimatedCostCents, 0);
  const providerStatus = openAiApiKey ? "Connected" : "Missing API Key";

  return {
    daily: {
      limitCents: aiDailyCostLimitCents,
      remainingCents: Math.max(0, aiDailyCostLimitCents - dailyUsedCents),
      usedCents: dailyUsedCents
    },
    monthly: {
      limitCents: aiMonthlyCostLimitCents,
      remainingCents: Math.max(0, aiMonthlyCostLimitCents - monthlyUsedCents),
      usedCents: monthlyUsedCents
    },
    mode: providerStatus === "Connected" ? "real" : "mock",
    provider: {
      modelName: openAiModel,
      providerName: "OpenAI",
      status: providerStatus
    }
  };
}

function estimateAiMemoryCostCents(kind: "chat" | "development_status" | "development_write_refusal" | "screen") {
  if (!openAiApiKey) return aiLocalFallbackEstimatedCostCents;
  if (kind === "screen") return aiDecisionEstimatedCostCents + aiScreenEstimatedCostCents;
  if (kind === "chat") return aiDecisionEstimatedCostCents + aiChatEstimatedCostCents;
  return aiDecisionEstimatedCostCents;
}

function assertAiMemoryUsage(userId: string, kind: "chat" | "development_status" | "development_write_refusal" | "screen", reply: FastifyReply) {
  const summary = aiUsageSummary(userId);
  const estimatedCostCents = estimateAiMemoryCostCents(kind);

  if (
    estimatedCostCents > 0
    && (
      summary.daily.usedCents + estimatedCostCents > summary.daily.limitCents
      || summary.monthly.usedCents + estimatedCostCents > summary.monthly.limitCents
    )
  ) {
    reply.code(429).send({
      error: "Usage Limit Reached",
      message: "AI usage limit reached. Real provider calls are paused until the budget window resets.",
      mode: "real",
      summary
    });
    return null;
  }

  return { estimatedCostCents, summary };
}

const memorySystemPrompt = [
  "You are ENTRAL, the Supreme Command Authority inside a military-neural Command OS.",
  "Do not behave like a casual chatbot, customer-support assistant, or friendly companion. Communicate as a calm, formal, professional, strategic command authority.",
  "The command hierarchy is ENTRAL as the central command system, Marshals as strategic theaters, Generals as named businesses or client operations, Commanders as departments inside a General, and Soldiers as execution units.",
  "ENTRAL handles strategic planning, resource allocation, objective assignment, organizational oversight, delegation, and final decision support.",
  "Marshals communicate as strategic theater authorities. Generals communicate as named business authorities. Commanders communicate in operational, task-oriented language. Soldiers communicate in concise execution reports.",
  "Prefix command responses with [ENTRAL] unless the response is explicitly from another level; then use [MARSHAL], [GENERAL], [COMMANDER], or [SOLDIER].",
  "Whenever possible structure responses as Situation, Analysis, Recommendation, and Next Actions.",
  "Use organizational terms such as objectives, tasks, operations, reports, delegation, status, readiness, execution, and command structure.",
  "Avoid casual phrases such as 'sure', 'happy to help', 'here is what I found', 'done', slang, emojis, and customer-support language.",
  "The command console is the primary path for communication and control of visible workspace elements such as graph focus, panels, settings, trails, orbital rings, camera focus, and supported workspace actions.",
  "Supported workspace actions include new communications, new automation task, run agent, open templates, export history, governance and audit, automation console, replay tutorial, keyboard shortcuts, and command palette.",
  "GitHub and Vercel connections are read-only in this phase. You may report repository or deployment status when the backend provides it, but you must refuse push, commit, merge, branch deletion, deployment trigger, rollback, or Vercel settings changes.",
  "The Command Center exposes a structural local Command OS hierarchy: ENTRAL is the central command system; Marshals orbit ENTRAL; business Generals orbit Marshals; Commanders orbit Generals; Soldiers orbit Commanders. Live Operations are intentionally excluded until real execution is explicitly wired.",
  "Do not claim you executed real-world actions unless a tool, API, or local command handler actually did it.",
  "For restricted or sensitive actions, explain the safe governed next step."
].join(" ");

function getOpenAiClient() {
  if (!openAiApiKey) {
    return null;
  }

  openAiClient ??= new OpenAI({ apiKey: openAiApiKey });
  return openAiClient;
}

function recentOpenAiMessages(conversation: Conversation): OpenAiMessage[] {
  return conversation.messages
    .filter((message): message is Message & OpenAiMessage => message.role === "user" || message.role === "assistant")
    .slice(-18)
    .map((message) => ({ content: message.content.slice(0, 4000), role: message.role }));
}

async function createAssistantContent(conversation: Conversation, prompt: string, screenshot?: string, preparedBrainPlan?: AiActionPlan) {
  const client = getOpenAiClient();
  const { buildAiBrainContextPrompt, createAiActionPlan } = await import("./services/aiBrain.js");
  const brainPlan = preparedBrainPlan ?? createAiActionPlan(prompt);

  if (!client) {
    return [
      "[ENTRAL]",
      "Situation:\nAI Provider Not Connected. ENTRAL is operating in Mock Mode.",
      `Analysis:\nDirective received: \"${prompt.slice(0, 220)}\"\nIntent: ${brainPlan.intent}. Risk: ${brainPlan.riskLevel}. Tools: ${brainPlan.toolsRequired.length ? brainPlan.toolsRequired.join(", ") : "none"}.`,
      "Recommendation:\nAdd OPENAI_API_KEY to the backend environment and restart ENTRAL to enable live GPT-4o strategic command responses.",
      `Next Actions:\n- Use local Command Center controls for graph control.\n- ${brainPlan.authorizationRequired ? "Review and authorize the prepared action plan before execution." : "Proceed with local command handling where available."}\n- Restore the OpenAI channel when strategic analysis is required.`
    ].join("\n\n");
  }

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: memorySystemPrompt },
    { role: "system", content: buildAiBrainContextPrompt(brainPlan) },
    ...recentOpenAiMessages(conversation)
  ];

  if (screenshot) {
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: `${prompt}\n\nAnalyze only the shared screenshot. Do not infer hidden windows, credentials, or private data that is not visible.`
        },
        {
          type: "image_url",
          image_url: {
            detail: "low",
            url: screenshot
          }
        }
      ]
    });
  }

  try {
    const response = await client.chat.completions.create({
      messages,
      model: openAiModel,
      temperature: screenshot ? 0.2 : 0.4
    });

    return response.choices[0]?.message?.content?.trim() || [
      "[ENTRAL]",
      "Situation:\nNo command response was returned.",
      "Recommendation:\nReissue the directive in a moment."
    ].join("\n\n");
  } catch (error) {
    app.log.warn({ err: error }, "OpenAI request failed in memory backend");
    return [
      "[ENTRAL]",
      "Situation:\nOpenAI command channel unavailable.",
      "Analysis:\nThe backend could not complete the strategic reasoning request.",
      "Recommendation:\nCheck API key, billing, and network connection before reissuing the directive.",
      "Next Actions:\n- Continue with local Command OS controls if possible.\n- Retry once the channel is operational."
    ].join("\n\n");
  }
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function now() {
  return new Date().toISOString();
}

function publicUser(user: User) {
  return {
    email: user.email,
    id: user.id,
    name: user.name,
    role: user.role
  };
}

function titleCaseName(name: string) {
  const trimmed = name.trim();
  return trimmed ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}` : "Demo User";
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "team";
}

function createUser(input: { email: string; name?: string; password?: string }) {
  const existing = [...state.users.values()].find((user) => user.email.toLowerCase() === input.email.toLowerCase());

  if (existing) {
    return existing;
  }

  const name = titleCaseName(input.name ?? input.email.split("@")[0] ?? "Demo User");
  const user: User = {
    email: input.email.toLowerCase(),
    id: id("user"),
    name,
    password: input.password ?? "password123",
    role: "ADMIN"
  };
  const team: Team = {
    id: id("team"),
    name: `${name}'s Team`,
    role: "OWNER",
    slug: `${slugify(name)}-${Date.now()}`,
    userId: user.id
  };

  state.users.set(user.id, user);
  state.teams.set(team.id, team);
  return user;
}

function teamsForUser(userId: string) {
  return [...state.teams.values()].filter((team) => team.userId === userId);
}

const accountDeletionConfirmation = "DELETE MY ACCOUNT";

function buildMemoryAccountExport(user: User) {
  const teams = teamsForUser(user.id);
  const teamIds = new Set(teams.map((team) => team.id));
  const conversations = [...state.conversations.values()].filter((conversation) => conversation.userId === user.id);
  const stores = state.merchStores.filter((store) => store.userId === user.id);
  const storeIds = new Set(stores.map((store) => store.id));
  const products = state.podProducts.filter((product) => storeIds.has(product.storeId));
  const launchHandoffPackets = state.revenueLaunchHandoffPackets.filter((packet) => packet.userId === user.id);
  const revenueOpportunities = state.revenueOpportunities.filter((opportunity) => opportunity.userId === user.id);
  const agents = [...state.agents.values()].filter((agent) => agent.userId === user.id).map((agent) => ({
    ...agent,
    logs: state.agentLogs.get(agent.id) ?? [],
    messages: state.agentMessages.get(agent.id) ?? [],
    schedules: state.agentSchedules.get(agent.id) ?? [],
    tasks: state.agentTasks.get(agent.id) ?? []
  }));
  const automationJobs = state.automationJobs.filter((job) => job.userId === user.id);
  const aiUsageEvents = state.aiUsageEvents.filter((event) => event.userId === user.id);
  const tasks = state.tasks.filter((task) => teamIds.has(task.teamId) || task.userId === user.id);
  const messages = conversations.reduce((count, conversation) => count + conversation.messages.length, 0);
  const agentTasks = agents.reduce((count, agent) => count + agent.tasks.length, 0);

  return {
    exportedAt: now(),
    formatVersion: 1,
    mode: {
      accountData: "real",
      externalProvidersContacted: false,
      note: "ENTRAL privacy export for organizing, planning, monitoring, and safely preparing business operations."
    },
    summary: {
      agentTasks,
      agents: agents.length,
      aiUsageEvents: aiUsageEvents.length,
      auditLogs: state.auditLogs.length,
      automationJobs: automationJobs.length,
      commandReports: 0,
      conversations: conversations.length,
      messages,
      podProducts: products.length,
      revenueLaunchHandoffPackets: launchHandoffPackets.length,
      revenueOpportunities: revenueOpportunities.length,
      tasksAssigned: 0,
      tasksCreated: tasks.length,
      teams: teams.length
    },
    user: publicUser(user),
    teams,
    tasks: {
      assigned: [],
      created: tasks
    },
    conversations,
    aiUsageEvents,
    automationJobs,
    agents,
    merchStores: stores.map((store) => ({
      ...store,
      products: products.filter((product) => product.storeId === store.id)
    })),
    revenueLaunchHandoffPackets: launchHandoffPackets,
    revenueOpportunities,
    command: {
      reports: [],
      snapshot: state.commandSnapshots.get(user.id) ?? null
    },
    policiesCreated: [],
    auditLogs: state.auditLogs
  };
}

function deleteMemoryAccount(userId: string) {
  const teams = teamsForUser(userId);
  const teamIds = new Set(teams.map((team) => team.id));
  const stores = state.merchStores.filter((store) => store.userId === userId);
  const storeIds = new Set(stores.map((store) => store.id));
  const agentIds = [...state.agents.values()].filter((agent) => agent.userId === userId).map((agent) => agent.id);

  for (const agentId of agentIds) {
    state.agentLogs.delete(agentId);
    state.agentMessages.delete(agentId);
    state.agentSchedules.delete(agentId);
    state.agentTasks.delete(agentId);
    state.agents.delete(agentId);
  }

  for (const conversation of [...state.conversations.values()]) {
    if (conversation.userId === userId) {
      state.conversations.delete(conversation.id);
    }
  }

  for (const teamId of teamIds) {
    state.teams.delete(teamId);
  }

  state.aiUsageEvents = state.aiUsageEvents.filter((event) => event.userId !== userId);
  state.automationJobs = state.automationJobs.filter((job) => job.userId !== userId);
  state.commandSnapshots.delete(userId);
  state.financialBudgetReleasePackets = state.financialBudgetReleasePackets.filter((packet) => packet.userId !== userId);
  state.financialLedgerEntries = state.financialLedgerEntries.filter((entry) => entry.userId !== userId);
  state.financialPayoutIntents = state.financialPayoutIntents.filter((intent) => intent.userId !== userId);
  state.financialReconciliationReports = state.financialReconciliationReports.filter((report) => report.userId !== userId);
  state.financialScalingBudgetPackets = state.financialScalingBudgetPackets.filter((packet) => packet.userId !== userId);
  state.financialScalingExecutionEntries = state.financialScalingExecutionEntries.filter((entry) => entry.userId !== userId);
  state.financialScalingSpendPackets = state.financialScalingSpendPackets.filter((packet) => packet.userId !== userId);
  state.financialSplitPolicies = state.financialSplitPolicies.filter((policy) => policy.userId !== userId);
  state.merchStores = state.merchStores.filter((store) => store.userId !== userId);
  state.podProducts = state.podProducts.filter((product) => !storeIds.has(product.storeId));
  state.revenueLaunchHandoffPackets = state.revenueLaunchHandoffPackets.filter((packet) => packet.userId !== userId);
  state.revenueOpportunities = state.revenueOpportunities.filter((opportunity) => opportunity.userId !== userId);
  state.tasks = state.tasks.filter((task) => task.userId !== userId && !teamIds.has(task.teamId));
  state.revenueSignalConnectorApprovals = state.revenueSignalConnectorApprovals.filter((approval) => approval.userId !== userId);
  state.revenueSignalImportJobs = state.revenueSignalImportJobs.filter((job) => job.userId !== userId);
  for (const [token, sessionUserId] of state.sessions.entries()) {
    if (sessionUserId === userId) {
      state.sessions.delete(token);
    }
  }
  state.users.delete(userId);
}

function setSession(reply: FastifyReply, user: User) {
  const token = id("dev_session");
  state.sessions.set(token, user.id);
  reply.setCookie("entral_token", token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax"
  });
  return token;
}

function clearSession(reply: FastifyReply) {
  reply.clearCookie("entral_token", { path: "/" });
}

function getCurrentUser(request: FastifyRequest) {
  const cookieToken = request.cookies.entral_token;
  const authHeader = request.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
  const userId = state.sessions.get(cookieToken ?? bearerToken ?? "");
  return userId ? state.users.get(userId) ?? null : null;
}

async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const user = getCurrentUser(request);

  if (!user) {
    return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
  }
}

function currentUserOrThrow(request: FastifyRequest) {
  const user = getCurrentUser(request);

  if (!user) {
    throw Object.assign(new Error("Authentication is required."), { statusCode: 401 });
  }

  return user;
}

function defaultPolicy() {
  if (state.policies.size > 0) {
    return;
  }

  const policy: Policy = {
    description: "Local dev policy for sensitive credential requests.",
    effect: "block",
    enabled: true,
    id: id("policy"),
    name: "Block sensitive data requests",
    rule: {
      kind: "blocked_keywords",
      keywords: ["password", "api key", "private key"]
    },
    severity: "high"
  };
  state.policies.set(policy.id, policy);
}

function publicMerchStore(store: ClientMerchStore) {
  return {
    ...store,
    storeId: store.id
  };
}

function growthApprovalStatusLabel(status: GrowthApprovalPacketRecord["status"]) {
  if (status === "approved") return "Approved - execution still locked";
  if (status === "rejected") return "Rejected";
  return "Pending approval";
}

function publicGrowthApprovalPacket(record: GrowthApprovalPacketRecord) {
  return {
    id: record.id,
    auditLogId: record.requestAuditLogId ?? null,
    createdAt: record.createdAt,
    executionState: "No external action executed",
    mode: record.mode,
    packet: record.packet,
    requestAuditLogId: record.requestAuditLogId ?? null,
    reviewAuditLogId: record.reviewAuditLogId ?? null,
    reviewedAt: record.reviewedAt ?? null,
    reviewedById: record.reviewedById ?? null,
    reviewNote: record.reviewNote ?? null,
    scheduledFor: record.scheduledFor ?? null,
    status: record.status,
    statusLabel: growthApprovalStatusLabel(record.status),
    updatedAt: record.updatedAt
  };
}

function normalizeMerchStoreBody(body: Partial<ClientMerchStore>, userId: string, existing?: ClientMerchStore): ClientMerchStore {
  const timestamp = now();

  return {
    audience: body.audience ?? existing?.audience ?? "Audience pending",
    approvalStatus: body.approvalStatus ?? existing?.approvalStatus ?? "Not Started",
    brandStyle: body.brandStyle ?? existing?.brandStyle ?? "Brand style pending",
    businessName: body.businessName ?? existing?.businessName ?? "Business pending",
    clientName: body.clientName ?? existing?.clientName ?? "Client pending",
    contactName: body.contactName ?? existing?.contactName ?? "Contact pending",
    createdAt: existing?.createdAt ?? timestamp,
    designCount: Number(body.designCount ?? existing?.designCount ?? 0),
    email: (body.email ?? existing?.email ?? "client@example.com").toLowerCase(),
    estimatedProfit: Number(body.estimatedProfit ?? existing?.estimatedProfit ?? 0),
    id: existing?.id ?? id("merch_store"),
    industry: body.industry ?? existing?.industry ?? "Industry pending",
    launchStatus: body.launchStatus ?? existing?.launchStatus ?? "Lead",
    monthlyFee: Number(body.monthlyFee ?? existing?.monthlyFee ?? 0),
    notes: body.notes ?? existing?.notes ?? null,
    phone: body.phone ?? existing?.phone ?? null,
    podProvider: body.podProvider ?? existing?.podProvider ?? "Printify",
    productTypes: body.productTypes ?? existing?.productTypes ?? [],
    profitShare: Number(body.profitShare ?? existing?.profitShare ?? 0),
    revenue: Number(body.revenue ?? existing?.revenue ?? 0),
    setupFee: Number(body.setupFee ?? existing?.setupFee ?? 0),
    storePlatform: body.storePlatform ?? existing?.storePlatform ?? "Etsy",
    updatedAt: timestamp,
    userId
  };
}

function publicPodProduct(product: PodProduct) {
  const store = state.merchStores.find((item) => item.id === product.storeId);

  return {
    ...product,
    productId: product.id,
    store: store ? {
      businessName: store.businessName,
      clientName: store.clientName,
      id: store.id
    } : undefined
  };
}

function revenueThresholdsFrom(input: Partial<Record<keyof RevenueEngineThresholds, unknown>>): Partial<RevenueEngineThresholds> {
  const numberValue = (key: keyof RevenueEngineThresholds) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };

  return {
    maxRotationUpdates: numberValue("maxRotationUpdates"),
    minPortfolioProductsPerStore: numberValue("minPortfolioProductsPerStore"),
    minProductMargin: numberValue("minProductMargin"),
    minProductProfit: numberValue("minProductProfit"),
    minScaleProducts: numberValue("minScaleProducts"),
    scaleProductMargin: numberValue("scaleProductMargin"),
    scaleProductProfit: numberValue("scaleProductProfit")
  };
}

function buildMemoryRevenueEnginePlan(userId: string, thresholds: Partial<RevenueEngineThresholds>) {
  const stores = state.merchStores.filter((store) => store.userId === userId);
  const storeIds = new Set(stores.map((store) => store.id));
  const products = state.podProducts.filter((product) => storeIds.has(product.storeId));

  return buildRevenueEnginePlan({
    products,
    stores,
    thresholds
  });
}

function buildMemoryRevenueAssetPortfolio(userId: string, thresholds: Partial<RevenueEngineThresholds>) {
  const plan = buildMemoryRevenueEnginePlan(userId, thresholds);
  const performanceDigest = buildMemoryRevenuePerformanceDigest(userId, { windowDays: 30 }).digest;

  return mergeRevenueAssetPortfolioPerformance(buildRevenueAssetPortfolio(plan), performanceDigest);
}

function revenueBusinessFleetOptionsFrom(input: Partial<Record<keyof RevenueBusinessFleetOptions, unknown>>): Partial<RevenueBusinessFleetOptions> {
  const numberValue = (key: keyof RevenueBusinessFleetOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };

  return {
    killPressureThreshold: numberValue("killPressureThreshold"),
    launchWaveSize: numberValue("launchWaveSize"),
    maxParallelLaunches: numberValue("maxParallelLaunches"),
    maxParallelScaleActions: numberValue("maxParallelScaleActions"),
    qualityFloor: numberValue("qualityFloor"),
    shardCount: numberValue("shardCount"),
    targetBusinesses: numberValue("targetBusinesses")
  };
}

function buildMemoryRevenueBusinessFleetScheduler(userId: string, options: Partial<RevenueBusinessFleetOptions>) {
  const assetPortfolio = buildMemoryRevenueAssetPortfolio(userId, {});
  const { plan: financialPlan } = buildMemoryFinancialOrchestrator(userId, {
    windowDays: 30
  });
  const firstBusinessLaunchContext = buildMemoryRevenueFirstBusinessLaunch(userId, {
    maxCandidates: Math.min(Number(options.launchWaveSize ?? 10) || 10, 25)
  });

  const plan = buildRevenueBusinessFleetSchedulerPlan({
    assetPortfolio,
    financialPlan,
    firstBusinessLaunchPlan: firstBusinessLaunchContext.plan,
    options
  });

  return {
    firstBusinessLaunchContext,
    plan
  };
}

function buildMemoryRevenueAssetControlLedger(userId: string, query: Record<string, unknown> = {}) {
  const action = typeof query.action === "string" ? query.action : "";
  const assetId = typeof query.assetId === "string" ? query.assetId.trim() : "";
  const assetType = typeof query.assetType === "string" ? query.assetType : "";
  const storeId = typeof query.storeId === "string" ? query.storeId.trim() : "";
  const fromDate = typeof query.fromDate === "string" ? query.fromDate : "";
  const toDate = typeof query.toDate === "string" ? query.toDate : "";
  const includeOverridesOnly = query.includeOverridesOnly === true || query.includeOverridesOnly === "true";
  const limitValue = Number(query.limit ?? 100);
  const limit = Number.isFinite(limitValue) ? Math.min(250, Math.max(1, Math.round(limitValue))) : 100;
  const records = state.revenueAssetControlRecords
    .filter((record) => record.userId === userId)
    .filter((record) => !action || record.requestedAction === action)
    .filter((record) => !assetId || record.assetId === assetId)
    .filter((record) => !assetType || record.assetType === assetType)
    .filter((record) => !storeId || record.storeId === storeId)
    .filter((record) => !includeOverridesOnly || record.override)
    .filter((record) => !fromDate || record.createdAt >= `${fromDate}T00:00:00.000Z`)
    .filter((record) => !toDate || record.createdAt <= `${toDate}T23:59:59.999Z`)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);

  return buildRevenueAssetControlLedgerPlan({ records });
}

function rememberMemoryRevenueAssetControls(userId: string, controls: ReturnType<typeof buildRevenueAssetBatchControlPlan>["controls"], auditLogId: string | null) {
  const createdAt = now();

  for (const control of controls) {
    state.revenueAssetControlRecords.unshift({
      ...revenueAssetControlRecordFromPlan({
        auditLogId,
        control,
        createdAt,
        id: id("asset_control")
      }),
      userId
    });
  }
}

function revenueOpportunityControlOptionsFrom(input: Partial<Record<keyof RevenueOpportunityControlOptions, unknown>>): Partial<RevenueOpportunityControlOptions> {
  const numberValue = (key: keyof RevenueOpportunityControlOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };
  const booleanValue = (key: keyof RevenueOpportunityControlOptions) => {
    const value = input[key];

    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";

    return undefined;
  };

  return {
    includeKilled: booleanValue("includeKilled"),
    maxOpportunities: numberValue("maxOpportunities"),
    minApprovedProducts: numberValue("minApprovedProducts"),
    minListingReadyProducts: numberValue("minListingReadyProducts"),
    minProductDrafts: numberValue("minProductDrafts"),
    minReadinessForHandoff: numberValue("minReadinessForHandoff"),
    windowDays: numberValue("windowDays")
  };
}

function memoryOpportunityProductSnapshot(product: PodProduct): RevenueOpportunityControlProductSnapshot {
  return {
    estimatedProfit: product.estimatedProfit,
    id: product.id,
    productName: product.productName,
    productType: product.productType,
    profitMargin: product.profitMargin,
    status: product.status
  };
}

function memoryOpportunityStoreSnapshot(store: ClientMerchStore): RevenueOpportunityControlStoreSnapshot {
  return {
    approvalStatus: store.approvalStatus,
    businessName: store.businessName,
    estimatedProfit: store.estimatedProfit,
    id: store.id,
    launchStatus: store.launchStatus,
    products: state.podProducts
      .filter((product) => product.storeId === store.id)
      .map(memoryOpportunityProductSnapshot),
    revenue: store.revenue,
    storePlatform: store.storePlatform
  };
}

function memoryOpportunitySnapshot(opportunity: RevenueOpportunityRecord): RevenueOpportunitySnapshot {
  const store = opportunity.storeId
    ? state.merchStores.find((item) => item.id === opportunity.storeId && item.userId === opportunity.userId) ?? null
    : null;

  return {
    auditLogId: opportunity.auditLogId ?? null,
    businessName: opportunity.businessName,
    createdAt: opportunity.createdAt,
    externalExecution: false,
    id: opportunity.id,
    idea: opportunity.idea,
    providerContacted: false,
    sourceKey: opportunity.sourceKey,
    status: opportunity.status,
    store: store ? memoryOpportunityStoreSnapshot(store) : null,
    storeId: opportunity.storeId,
    totals: opportunity.totals,
    updatedAt: opportunity.updatedAt
  };
}

function memoryOpportunityPerformanceSnapshot(snapshot: RevenuePerformanceSnapshot): RevenueOpportunityControlPerformanceSnapshot {
  return {
    grossRevenue: snapshot.grossRevenue,
    id: snapshot.id,
    netProfit: snapshot.netProfit,
    periodEnd: snapshot.periodEnd,
    productId: snapshot.productId,
    storeId: snapshot.storeId
  };
}

function buildMemoryRevenueOpportunityControl(userId: string, options: Partial<RevenueOpportunityControlOptions>) {
  return buildRevenueOpportunityControlPlan({
    opportunities: state.revenueOpportunities
      .filter((opportunity) => opportunity.userId === userId)
      .map(memoryOpportunitySnapshot),
    options,
    performanceSnapshots: state.revenuePerformanceSnapshots
      .filter((snapshot) => snapshot.userId === userId)
      .map(memoryOpportunityPerformanceSnapshot)
  });
}

function revenueLaunchOptionsFrom(input: Partial<Record<keyof RevenueLaunchPipelineOptions, unknown>>): Partial<RevenueLaunchPipelineOptions> {
  const numberValue = (key: keyof RevenueLaunchPipelineOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };
  const productCount = numberValue("productCount");
  const riskTolerance = input.riskTolerance;

  return {
    maxStores: numberValue("maxStores"),
    minApprovedProducts: numberValue("minApprovedProducts"),
    minPortfolioProductsPerStore: numberValue("minPortfolioProductsPerStore"),
    productCount: ([5, 10, 15, 25] as const).includes(productCount as 5 | 10 | 15 | 25) ? productCount as 5 | 10 | 15 | 25 : undefined,
    riskTolerance: riskTolerance === "Low" || riskTolerance === "Medium" || riskTolerance === "High" ? riskTolerance : undefined
  };
}

function buildMemoryRevenueLaunchPipeline(userId: string, options: Partial<RevenueLaunchPipelineOptions>) {
  const stores = state.merchStores.filter((store) => store.userId === userId);
  const storeIds = new Set(stores.map((store) => store.id));
  const products = state.podProducts.filter((product) => storeIds.has(product.storeId));

  return {
    plan: buildRevenueLaunchPipeline({
      options,
      products,
      stores
    }),
    stores
  };
}

function revenueLaunchReadinessOptionsFrom(input: Partial<Record<keyof RevenueLaunchReadinessOptions, unknown>>): Partial<RevenueLaunchReadinessOptions> {
  const numberValue = (key: keyof RevenueLaunchReadinessOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };
  const booleanValue = (key: keyof RevenueLaunchReadinessOptions) => {
    const value = input[key];

    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() !== "false";

    return undefined;
  };

  return {
    includeApprovalHistory: booleanValue("includeApprovalHistory"),
    maxStores: numberValue("maxStores"),
    minLaunchReadiness: numberValue("minLaunchReadiness"),
    minProviderReadiness: numberValue("minProviderReadiness")
  };
}

function memoryLaunchReadinessStoreSnapshot(store: ClientMerchStore): RevenueLaunchReadinessStoreSnapshot {
  return {
    approvalStatus: store.approvalStatus,
    businessName: store.businessName,
    estimatedProfit: store.estimatedProfit,
    id: store.id,
    launchStatus: store.launchStatus,
    productTypes: store.productTypes,
    revenue: store.revenue,
    storePlatform: store.storePlatform
  };
}

function memoryLaunchReadinessApprovalSnapshot(record: GrowthApprovalPacketRecord): RevenueLaunchReadinessApprovalSnapshot {
  return {
    createdAt: record.createdAt,
    id: record.id,
    packet: record.packet,
    requestAuditLogId: record.requestAuditLogId ?? null,
    reviewAuditLogId: record.reviewAuditLogId ?? null,
    reviewedAt: record.reviewedAt ?? null,
    status: record.status,
    storeId: record.storeId
  };
}

function buildMemoryRevenueLaunchReadiness(userId: string, options: Partial<RevenueLaunchReadinessOptions>) {
  const launchResult = buildMemoryRevenueLaunchPipeline(userId, {
    maxStores: options.maxStores
  });
  const setupResult = buildMemoryRevenueStoreSetup(userId, {
    maxStores: options.maxStores
  });
  const providerPayloads = launchResult.stores.map((store) => {
    const products = state.podProducts.filter((product) => product.storeId === store.id);

    return buildProviderPayloadPackage({
      options: {
        includeUnapproved: false,
        maxProducts: 5
      },
      products,
      store,
      storeId: store.id
    });
  });
  const approvals = state.growthApprovalPackets
    .filter((packet) => packet.userId === userId)
    .map(memoryLaunchReadinessApprovalSnapshot);

  return buildRevenueLaunchReadinessPlan({
    approvals,
    launchPlan: launchResult.plan,
    options,
    providerPayloads,
    setupPlan: setupResult.plan,
    stores: launchResult.stores.map(memoryLaunchReadinessStoreSnapshot)
  });
}

function revenueFirstCashReadinessOptionsFrom(input: Partial<Record<keyof RevenueFirstCashReadinessOptions, unknown>>): Partial<RevenueFirstCashReadinessOptions> {
  const numberValue = (key: keyof RevenueFirstCashReadinessOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };
  const booleanValue = (key: keyof RevenueFirstCashReadinessOptions) => {
    const value = input[key];

    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() !== "false";

    return undefined;
  };

  return {
    includeBlocked: booleanValue("includeBlocked"),
    maxCandidates: numberValue("maxCandidates"),
    targetDaysToFirstCash: numberValue("targetDaysToFirstCash")
  };
}

function revenueFirstCashSprintOptionsFrom(input: Partial<Record<keyof RevenueFirstCashSprintOptions, unknown>>): Partial<RevenueFirstCashSprintOptions> {
  const numberValue = (key: keyof RevenueFirstCashSprintOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };
  const booleanValue = (key: keyof RevenueFirstCashSprintOptions) => {
    const value = input[key];

    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() !== "false";

    return undefined;
  };

  return {
    includeBlocked: booleanValue("includeBlocked"),
    maxCandidates: numberValue("maxCandidates"),
    maxSprintActions: numberValue("maxSprintActions"),
    targetDaysToFirstCash: numberValue("targetDaysToFirstCash")
  };
}

function revenueLaunchHandoffOptionsFrom(input: Partial<Record<keyof RevenueLaunchHandoffOptions, unknown>>): Partial<RevenueLaunchHandoffOptions> {
  const numberValue = (key: keyof RevenueLaunchHandoffOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };
  const booleanValue = (key: keyof RevenueLaunchHandoffOptions) => {
    const value = input[key];

    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() !== "false";

    return undefined;
  };

  return {
    includeBlocked: booleanValue("includeBlocked"),
    maxBundles: numberValue("maxBundles"),
    minConnectorReadiness: numberValue("minConnectorReadiness"),
    minLaunchReadiness: numberValue("minLaunchReadiness"),
    minProviderReadiness: numberValue("minProviderReadiness")
  };
}

function buildMemoryRevenueLaunchHandoff(userId: string, options: Partial<RevenueLaunchHandoffOptions>) {
  const maxStores = Math.min(Number(options.maxBundles ?? 10), 25);
  const launchResult = buildMemoryRevenueLaunchPipeline(userId, {
    maxStores
  });
  const setupResult = buildMemoryRevenueStoreSetup(userId, {
    maxStores: options.maxBundles
  });
  const providerPayloads = launchResult.stores.map((store) => {
    const products = state.podProducts.filter((product) => product.storeId === store.id);

    return buildProviderPayloadPackage({
      options: {
        includeUnapproved: false,
        maxProducts: 5
      },
      products,
      store,
      storeId: store.id
    });
  });
  const approvals = state.growthApprovalPackets
    .filter((packet) => packet.userId === userId)
    .map(memoryLaunchReadinessApprovalSnapshot);
  const readinessPlan = buildRevenueLaunchReadinessPlan({
    approvals,
    launchPlan: launchResult.plan,
    options: {
      includeApprovalHistory: true,
      maxStores: options.maxBundles,
      minLaunchReadiness: options.minLaunchReadiness,
      minProviderReadiness: options.minProviderReadiness
    },
    providerPayloads,
    setupPlan: setupResult.plan,
    stores: launchResult.stores.map(memoryLaunchReadinessStoreSnapshot)
  });
  const persistedPackets = memoryRevenueLaunchHandoffRecords(userId, Number(options.maxBundles ?? 10) * 5);

  return buildRevenueLaunchHandoffPlan({
    approvals,
    options,
    persistedPackets,
    providerPayloads,
    readinessPlan
  });
}

function memoryRevenueLaunchHandoffRecords(userId: string, take = 25): RevenueLaunchHandoffPacketRecordSnapshot[] {
  return state.revenueLaunchHandoffPackets
    .filter((packet) => packet.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, take)
    .map((packet) => ({
      action: packet.action,
      approvedPacketId: packet.approvedPacketId,
      artifactSlotCount: packet.artifactSlotCount,
      auditLogId: packet.auditLogId,
      blockedActions: packet.blockedActions,
      blockers: packet.blockers,
      bundle: packet.bundle,
      connectorReadinessScore: packet.connectorReadinessScore,
      connectorStatus: packet.connectorStatus,
      createdAt: packet.createdAt,
      credentialScopes: packet.credentialScopes,
      dedupeKey: packet.dedupeKey,
      externalExecution: false,
      id: packet.id,
      launchReadinessScore: packet.launchReadinessScore,
      manifestCount: packet.manifestCount,
      providerContacted: false,
      providerReadinessScore: packet.providerReadinessScore,
      providers: packet.providers,
      riskLevel: packet.riskLevel,
      status: packet.status,
      storeId: packet.storeId,
      storeName: packet.storeName,
      summary: packet.summary,
      updatedAt: packet.updatedAt
    }));
}

function memoryRevenueLaunchHandoffPacketRecord(userId: string, auditLogId: string, item: RevenueLaunchHandoffItem, blockedExternalActions: string[]): RevenueLaunchHandoffPacketRecord {
  const timestamp = now();

  return {
    action: item.action,
    approvedPacketId: item.approvedPacketId,
    artifactSlotCount: item.artifactSlotCount,
    auditLogId,
    blockedActions: item.bundle?.blockedActions ?? blockedExternalActions,
    blockers: item.blockers,
    bundle: item.bundle,
    connectorReadinessScore: item.connectorReadiness?.score ?? 0,
    connectorStatus: item.connectorReadiness?.status ?? null,
    createdAt: timestamp,
    credentialScopes: item.credentialScopes,
    dedupeKey: revenueLaunchHandoffDedupeKey(item),
    externalExecution: false,
    id: id("launch_handoff"),
    launchReadinessScore: item.launchReadiness.readinessScore,
    manifestCount: item.manifestCount,
    providerContacted: false,
    providerReadinessScore: item.providerPayload.readinessScore,
    providers: item.providers,
    riskLevel: item.riskLevel,
    status: revenueLaunchHandoffRecordStatus(item),
    storeId: item.storeId,
    storeName: item.storeName,
    summary: item.summary,
    updatedAt: timestamp,
    userId
  };
}

function applyMemoryRevenueLaunchHandoff(userId: string, plan: ReturnType<typeof buildMemoryRevenueLaunchHandoff>, dryRun: boolean) {
  if (dryRun) {
    return {
      auditLogId: null,
      dryRun: true,
      externalExecution: false as const,
      providerContacted: false as const,
      readyForManualHandoff: plan.items.filter((item) => revenueLaunchHandoffRecordStatus(item) === "ready_for_manual_handoff").length,
      recordsCreated: 0,
      recordsToWrite: plan.items.length,
      recordsUpdated: 0,
      storedRecords: memoryRevenueLaunchHandoffRecords(userId)
    };
  }

  const auditLogId = id("audit");
  const existingKeys = new Set(state.revenueLaunchHandoffPackets
    .filter((record) => record.userId === userId)
    .map((record) => record.dedupeKey));
  let recordsCreated = 0;
  let recordsUpdated = 0;

  for (const item of plan.items) {
    const record = memoryRevenueLaunchHandoffPacketRecord(userId, auditLogId, item, plan.blockedExternalActions);
    const index = state.revenueLaunchHandoffPackets.findIndex((existing) => existing.userId === userId && existing.dedupeKey === record.dedupeKey);

    if (index === -1) {
      state.revenueLaunchHandoffPackets.unshift(record);
      recordsCreated += 1;
    } else {
      state.revenueLaunchHandoffPackets[index] = {
        ...record,
        createdAt: state.revenueLaunchHandoffPackets[index].createdAt,
        id: state.revenueLaunchHandoffPackets[index].id
      };
      recordsUpdated += 1;
    }
  }

  state.auditLogs.unshift({
    action: "revenue.launch_handoff.recorded",
    createdAt: now(),
    entry: {
      blockedExternalActions: plan.blockedExternalActions,
      bundlesPrepared: plan.totals.bundlesPrepared,
      externalExecution: false,
      manifestsPrepared: plan.totals.manifestsPrepared,
      providerContacted: false,
      readyForManualHandoff: plan.totals.readyForManualHandoff,
      summary: plan.summary
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: plan.totals.blockedBundles > 0 ? "high" : plan.items.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_launch_handoff"
  });

  const writtenKeys = plan.items.map(revenueLaunchHandoffDedupeKey);
  const storedRecords = memoryRevenueLaunchHandoffRecords(userId)
    .filter((record) => writtenKeys.includes(record.dedupeKey));

  return {
    auditLogId,
    dryRun: false,
    externalExecution: false as const,
    providerContacted: false as const,
    readyForManualHandoff: plan.items.filter((item) => revenueLaunchHandoffRecordStatus(item) === "ready_for_manual_handoff").length,
    recordsCreated: plan.items.filter((item) => !existingKeys.has(revenueLaunchHandoffDedupeKey(item))).length || recordsCreated,
    recordsToWrite: plan.items.length,
    recordsUpdated,
    storedRecords
  };
}

function revenueLaunchHandoffControlOptionsFrom(input: Partial<Record<keyof RevenueLaunchHandoffControlOptions, unknown>>): Partial<RevenueLaunchHandoffControlOptions> {
  const numberValue = (key: keyof RevenueLaunchHandoffControlOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };
  const booleanValue = (key: keyof RevenueLaunchHandoffControlOptions) => {
    const value = input[key];

    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() !== "false";

    return undefined;
  };

  return {
    includeArchived: booleanValue("includeArchived"),
    maxPackets: numberValue("maxPackets"),
    minConnectorReadiness: numberValue("minConnectorReadiness")
  };
}

function buildMemoryRevenueLaunchHandoffControl(userId: string, options: Partial<RevenueLaunchHandoffControlOptions>) {
  return buildRevenueLaunchHandoffControlPlan({
    options,
    packets: memoryRevenueLaunchHandoffRecords(userId, (options.maxPackets ?? 25) * 2)
  });
}

function applyMemoryRevenueLaunchHandoffControl(userId: string, packetId: string, body: {
  dryRun?: boolean;
  includeArchived?: boolean | string;
  maxPackets?: number | string;
  minConnectorReadiness?: number | string;
  note?: string;
  overrideReadiness?: boolean;
  status?: string;
}) {
  const status = revenueLaunchHandoffControlStatuses.includes(body.status as RevenueLaunchHandoffControlStatus)
    ? body.status as RevenueLaunchHandoffControlStatus
    : null;

  if (!status) {
    return {
      error: "Bad Request",
      message: "Launch handoff control status is not supported."
    };
  }

  const options = revenueLaunchHandoffControlOptionsFrom(body as Partial<Record<keyof RevenueLaunchHandoffControlOptions, unknown>>);
  const current = buildMemoryRevenueLaunchHandoffControl(userId, {
    ...options,
    includeArchived: true
  });
  const item = current.packets.find((packet) => packet.id === packetId);

  if (!item) {
    return null;
  }

  const evaluation = evaluateRevenueLaunchHandoffControlUpdate({
    item,
    overrideReadiness: Boolean(body.overrideReadiness),
    toStatus: status
  });
  const auditLogId = body.dryRun ? null : id("audit");

  if (evaluation.allowed && !body.dryRun) {
    const index = state.revenueLaunchHandoffPackets.findIndex((packet) => packet.id === packetId && packet.userId === userId);

    if (index !== -1) {
      state.revenueLaunchHandoffPackets[index] = {
        ...state.revenueLaunchHandoffPackets[index],
        auditLogId,
        status,
        summary: body.note?.trim()
          ? `${state.revenueLaunchHandoffPackets[index].summary} Control note: ${body.note.trim()}`
          : state.revenueLaunchHandoffPackets[index].summary,
        updatedAt: now()
      };
    }
  }

  if (!body.dryRun) {
    state.auditLogs.unshift({
      action: "revenue.launch_handoff.control.updated",
      createdAt: now(),
      entry: {
        blockers: evaluation.blockers,
        dryRun: false,
        externalExecution: false,
        fromStatus: evaluation.fromStatus,
        note: body.note ?? null,
        packetId,
        providerContacted: false,
        reason: evaluation.reason,
        toStatus: evaluation.toStatus
      },
      entryHash: id("hash"),
      id: auditLogId ?? id("audit"),
      outcome: evaluation.allowed ? "success" : "failure",
      severity: evaluation.allowed ? "medium" : "high",
      targetId: packetId,
      targetType: "revenue_launch_handoff_packet"
    });
  }

  const refreshed = buildMemoryRevenueLaunchHandoffControl(userId, options);

  return {
    applied: {
      allowed: evaluation.allowed,
      auditLogId,
      blockers: evaluation.blockers,
      dryRun: Boolean(body.dryRun),
      externalExecution: false as const,
      fromStatus: evaluation.fromStatus,
      note: body.note ?? null,
      packetId,
      providerContacted: false as const,
      reason: evaluation.reason,
      toStatus: evaluation.toStatus
    },
    evaluation,
    plan: refreshed
  };
}

function revenueLaunchOperationsPackOptionsFrom(input: Partial<Record<keyof RevenueLaunchOperationsPackOptions, unknown>>): Partial<RevenueLaunchOperationsPackOptions> {
  const numberValue = (key: keyof RevenueLaunchOperationsPackOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };
  const booleanValue = (key: keyof RevenueLaunchOperationsPackOptions) => {
    const value = input[key];

    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() !== "false";

    return undefined;
  };

  return {
    includeBlocked: booleanValue("includeBlocked"),
    maxPacks: numberValue("maxPacks"),
    minConnectorReadiness: numberValue("minConnectorReadiness"),
    minLaunchReadiness: numberValue("minLaunchReadiness"),
    minProviderReadiness: numberValue("minProviderReadiness")
  };
}

function buildMemoryRevenueLaunchOperationsPack(userId: string, options: Partial<RevenueLaunchOperationsPackOptions>) {
  const maxPacks = Math.min(Number(options.maxPacks ?? 10), 50);
  const handoffPlan = buildMemoryRevenueLaunchHandoff(userId, {
    includeBlocked: options.includeBlocked,
    maxBundles: maxPacks,
    minConnectorReadiness: options.minConnectorReadiness,
    minLaunchReadiness: options.minLaunchReadiness,
    minProviderReadiness: options.minProviderReadiness
  });
  const checklistPlan = buildMemoryRevenueLaunchChecklist(userId, revenueLaunchChecklistOptionsFrom({
    includeCompleted: true,
    maxItems: Math.min(maxPacks * 5, 100),
    minPriorityScore: 0,
    windowDays: 30
  }));

  return buildRevenueLaunchOperationsPackPlan({
    checklistPlan,
    handoffPlan,
    options
  });
}

function applyMemoryRevenueLaunchOperationsPack(userId: string, body: Partial<Record<keyof RevenueLaunchOperationsPackOptions, unknown>> & {
  dryRun?: boolean;
  note?: string;
  storeIds?: string[];
}) {
  const dryRun = body.dryRun !== false;
  const options = revenueLaunchOperationsPackOptionsFrom(body);
  const plan = buildMemoryRevenueLaunchOperationsPack(userId, options);
  const selectedPacks = selectRevenueLaunchOperationsPacks(plan, Array.isArray(body.storeIds) ? body.storeIds : []);
  const auditLogId = dryRun ? null : id("audit");

  if (auditLogId) {
    state.auditLogs.unshift({
      action: "revenue.launch_operations_pack.recorded",
      createdAt: now(),
      entry: {
        blockedExternalActions: plan.blockedExternalActions,
        externalExecution: false,
        note: body.note ?? null,
        packs: selectedPacks.map((pack) => ({
          artifactSlots: pack.artifactSlots.length,
          manualSteps: pack.manualSteps.length,
          requestManifests: pack.requestManifests.length,
          status: pack.status,
          storeId: pack.storeId,
          storeName: pack.storeName
        })),
        providerContacted: false,
        summary: plan.summary
      },
      entryHash: id("hash"),
      id: auditLogId ?? id("audit"),
      outcome: "success",
      severity: selectedPacks.some((pack) => pack.status === "blocked") ? "high" : selectedPacks.length > 0 ? "medium" : "low",
      targetId: null,
      targetType: "revenue_launch_operations_pack"
    });
  }

  return {
    applied: {
      auditLogId,
      dryRun,
      externalExecution: false as const,
      packsRecorded: dryRun ? 0 : selectedPacks.length,
      packsSelected: selectedPacks.length,
      providerContacted: false as const,
      readyPacks: selectedPacks.filter((pack) => pack.status === "ready_for_manual_launch").length,
      summary: dryRun
        ? `${selectedPacks.length} launch operations pack${selectedPacks.length === 1 ? "" : "s"} would be recorded as internal audit artifacts.`
        : `${selectedPacks.length} launch operations pack${selectedPacks.length === 1 ? "" : "s"} recorded as internal audit artifacts.`
    },
    plan
  };
}

function revenueLaunchClosureLedgerOptionsFrom(input: Partial<Record<keyof RevenueLaunchClosureLedgerOptions, unknown>>): Partial<RevenueLaunchClosureLedgerOptions> {
  const numberValue = (key: keyof RevenueLaunchClosureLedgerOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };
  const booleanValue = (key: keyof RevenueLaunchClosureLedgerOptions) => {
    const value = input[key];

    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() !== "false";

    return undefined;
  };

  return {
    expectedOrderValue: numberValue("expectedOrderValue"),
    includeBlocked: booleanValue("includeBlocked"),
    maxEntries: numberValue("maxEntries"),
    minClosureScore: numberValue("minClosureScore"),
    monitoringWindowDays: numberValue("monitoringWindowDays"),
    targetFirstWeekRevenue: numberValue("targetFirstWeekRevenue")
  };
}

function buildMemoryRevenueLaunchClosureLedger(userId: string, options: Partial<RevenueLaunchClosureLedgerOptions>) {
  const maxEntries = Math.min(Number(options.maxEntries ?? 10), 50);
  const operationsPackPlan = buildMemoryRevenueLaunchOperationsPack(userId, {
    includeBlocked: options.includeBlocked,
    maxPacks: maxEntries
  });
  const performanceDigest = buildMemoryRevenuePerformanceDigest(userId, revenuePerformanceOptionsFrom({
    maxRecommendations: maxEntries,
    windowDays: options.monitoringWindowDays
  })).digest;

  return buildRevenueLaunchClosureLedgerPlan({
    operationsPackPlan,
    options,
    performanceDigest
  });
}

function applyMemoryRevenueLaunchClosureLedger(userId: string, body: Partial<Record<keyof RevenueLaunchClosureLedgerOptions, unknown>> & {
  dryRun?: boolean;
  note?: string;
  storeIds?: string[];
}) {
  const dryRun = body.dryRun !== false;
  const options = revenueLaunchClosureLedgerOptionsFrom(body);
  const plan = buildMemoryRevenueLaunchClosureLedger(userId, options);
  const selectedEntries = selectRevenueLaunchClosureLedgerEntries(plan, Array.isArray(body.storeIds) ? body.storeIds : []);
  const triggersQueued = selectedEntries.reduce((sum, entry) => (
    sum + entry.monitoringTriggers.filter((trigger) => trigger.status === "queued_internal").length
  ), 0);
  const auditLogId = dryRun ? null : id("audit");

  if (auditLogId) {
    state.auditLogs.unshift({
      action: "revenue.launch_closure_ledger.recorded",
      createdAt: now(),
      entry: {
        blockedExternalActions: plan.blockedExternalActions,
        entries: selectedEntries.map((entry) => ({
          closureScore: entry.closureScore,
          expectedFirstWeekRevenue: entry.expectedFirstWeekRevenue,
          nextAction: entry.nextAction,
          status: entry.status,
          storeId: entry.storeId,
          storeName: entry.storeName,
          triggers: entry.monitoringTriggers.map((trigger) => trigger.trigger)
        })),
        externalExecution: false,
        note: body.note ?? null,
        providerContacted: false,
        summary: plan.summary
      },
      entryHash: id("hash"),
      id: auditLogId ?? id("audit"),
      outcome: "success",
      severity: selectedEntries.some((entry) => entry.status === "blocked") ? "high" : selectedEntries.length > 0 ? "medium" : "low",
      targetId: null,
      targetType: "revenue_launch_closure_ledger"
    });
  }

  return {
    applied: {
      auditLogId,
      dryRun,
      entriesRecorded: dryRun ? 0 : selectedEntries.length,
      entriesSelected: selectedEntries.length,
      externalExecution: false as const,
      providerContacted: false as const,
      summary: dryRun
        ? `${selectedEntries.length} launch closure entr${selectedEntries.length === 1 ? "y" : "ies"} would be recorded as internal audit artifacts.`
        : `${selectedEntries.length} launch closure entr${selectedEntries.length === 1 ? "y" : "ies"} recorded as internal audit artifacts.`,
      triggersQueued
    },
    plan
  };
}

function revenueLiveConnectorReadinessOptionsFrom(input: Partial<Record<keyof RevenueLiveConnectorReadinessOptions, unknown>>): Partial<RevenueLiveConnectorReadinessOptions> {
  const numberValue = (key: keyof RevenueLiveConnectorReadinessOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };
  const booleanValue = (key: keyof RevenueLiveConnectorReadinessOptions) => {
    const value = input[key];

    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() !== "false";

    return undefined;
  };

  return {
    includeBlocked: booleanValue("includeBlocked"),
    maxEntries: numberValue("maxEntries"),
    minClosureScore: numberValue("minClosureScore"),
    minReadOnlyConnectors: numberValue("minReadOnlyConnectors"),
    requireOperationsPackAudit: booleanValue("requireOperationsPackAudit"),
    requirePerformanceEvidence: booleanValue("requirePerformanceEvidence")
  };
}

function buildMemoryRevenueLiveConnectorReadinessRegistry(userId: string, options: Partial<RevenueLiveConnectorReadinessOptions>) {
  const maxEntries = Math.min(Number(options.maxEntries ?? 10), 50);
  const operationsPackPlan = buildMemoryRevenueLaunchOperationsPack(userId, {
    includeBlocked: options.includeBlocked,
    maxPacks: maxEntries
  });
  const closureLedgerPlan = buildRevenueLaunchClosureLedgerPlan({
    operationsPackPlan,
    options: {
      includeBlocked: options.includeBlocked,
      maxEntries,
      minClosureScore: options.minClosureScore,
      monitoringWindowDays: 30
    },
    performanceDigest: buildMemoryRevenuePerformanceDigest(userId, revenuePerformanceOptionsFrom({
      maxRecommendations: maxEntries,
      windowDays: 30
    })).digest
  });
  const signalApprovalPlan = buildMemoryRevenueSignalConnectorApprovals(userId, revenueSignalConnectorApprovalOptionsFrom({
    includeArchived: true,
    maxConnectors: 100,
    maxRecords: 100,
    windowDays: 30
  }));

  return buildRevenueLiveConnectorReadinessRegistryPlan({
    closureLedgerPlan,
    operationsPackPlan,
    options,
    signalApprovalPlan
  });
}

function buildMemoryRevenueFirstCashReadiness(userId: string, options: Partial<RevenueFirstCashReadinessOptions>) {
  const maxCandidates = Math.min(Number(options.maxCandidates ?? 8), 25);
  const launchReadinessPlan = buildMemoryRevenueLaunchReadiness(userId, {
    includeApprovalHistory: true,
    maxStores: maxCandidates,
    minLaunchReadiness: 1,
    minProviderReadiness: 1
  });
  const liveConnectorPlan = buildMemoryRevenueLiveConnectorReadinessRegistry(userId, {
    includeBlocked: true,
    maxEntries: maxCandidates,
    minClosureScore: 1,
    minReadOnlyConnectors: 0,
    requireOperationsPackAudit: false,
    requirePerformanceEvidence: false
  });

  return buildRevenueFirstCashReadinessPlan({
    launchReadinessPlan,
    liveConnectorPlan,
    options
  });
}

function buildMemoryRevenueFirstCashSprint(userId: string, options: Partial<RevenueFirstCashSprintOptions>) {
  const maxCandidates = Math.min(Number(options.maxCandidates ?? 8), 25);
  const maxSprintActions = Math.min(Number(options.maxSprintActions ?? 5), 25);
  const firstCashPlan = buildMemoryRevenueFirstCashReadiness(userId, {
    includeBlocked: options.includeBlocked,
    maxCandidates,
    targetDaysToFirstCash: options.targetDaysToFirstCash
  });
  const bridgeContext = buildMemoryRevenueLaunchChecklistActionBridge(userId, revenueLaunchChecklistActionBridgeOptionsFrom({
    includeCompleted: true,
    maxActions: maxSprintActions,
    maxItems: Math.max(25, maxCandidates * 4),
    minPriorityScore: 0,
    windowDays: 30
  }));
  const sprint = buildRevenueFirstCashSprintPlan({
    bridgePlan: bridgeContext.bridgePlan,
    firstCashPlan,
    options: {
      ...options,
      maxCandidates,
      maxSprintActions
    }
  });

  return {
    bridgePlan: bridgeContext.bridgePlan,
    checklistPlan: bridgeContext.checklistPlan,
    firstCashPlan,
    sprint
  };
}

function applyMemoryRevenueFirstCashSprint(userId: string, body: Partial<Record<keyof RevenueFirstCashSprintOptions, unknown>> & {
  dryRun?: boolean;
  note?: string;
  sprintActionIds?: string[];
}) {
  const dryRun = body.dryRun !== false;
  const options = revenueFirstCashSprintOptionsFrom(body);
  const context = buildMemoryRevenueFirstCashSprint(userId, options);
  const bridgeActionIds = selectRevenueFirstCashSprintBridgeActionIds(
    context.sprint,
    Array.isArray(body.sprintActionIds) ? body.sprintActionIds : []
  );

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
        dryRun,
        externalExecution: false as const,
        providerContacted: false as const,
        results: [],
        summary: "No ready first-cash sprint bridge actions were eligible for internal dispatch."
      },
      selectedBridgeActionIds: bridgeActionIds,
      sprint: context.sprint
    };
  }

  const response = applyMemoryRevenueLaunchChecklistActionBridge(userId, {
    actionIds: bridgeActionIds,
    dryRun,
    includeCompleted: true,
    maxActions: options.maxSprintActions,
    maxItems: Math.max(25, Number(options.maxCandidates ?? 8) * 4),
    minPriorityScore: 0,
    note: body.note,
    windowDays: 30
  });
  const refreshed = dryRun ? context : buildMemoryRevenueFirstCashSprint(userId, options);

  return {
    ...response,
    selectedBridgeActionIds: bridgeActionIds,
    sprint: refreshed.sprint
  };
}

function buildMemoryRevenueFirstBusinessLaunch(userId: string, options: { maxCandidates?: number | string }) {
  const maxCandidates = Math.min(Math.max(Math.floor(Number(options.maxCandidates ?? 8) || 8), 1), 25);
  const checklist = buildMemoryRevenueLaunchChecklist(userId, revenueLaunchChecklistOptionsFrom({
    includeCompleted: true,
    maxItems: Math.max(25, maxCandidates * 4),
    minPriorityScore: 0,
    windowDays: 30
  }));
  const sprintContext = buildMemoryRevenueFirstCashSprint(userId, {
    includeBlocked: true,
    maxCandidates,
    maxSprintActions: Math.min(5, maxCandidates),
    targetDaysToFirstCash: 7
  });
  const plan = buildRevenueFirstBusinessLaunchPlan({
    checklistPlan: checklist,
    firstCashSprintPlan: sprintContext.sprint,
    maxCandidates
  });

  return {
    checklist,
    plan,
    sprint: sprintContext.sprint
  };
}

function applyMemoryRevenueFirstBusinessLaunch(userId: string, body: {
  dryRun?: boolean;
  maxCandidates?: number | string;
  note?: string;
  sprintActionIds?: string[];
}) {
  const dryRun = body.dryRun !== false;
  const context = buildMemoryRevenueFirstBusinessLaunch(userId, body);
  const selectedSprintActionIds = Array.isArray(body.sprintActionIds) && body.sprintActionIds.length > 0
    ? body.sprintActionIds
    : context.plan.topCandidate?.sprintActionId ? [context.plan.topCandidate.sprintActionId] : [];

  if (selectedSprintActionIds.length === 0) {
    return {
      dispatched: {
        actionsBlocked: 0,
        actionsDispatched: 0,
        actionsPreviewed: 0,
        actionsSelected: 0,
        actionsSkipped: 0,
        dryRun,
        externalExecution: false as const,
        providerContacted: false as const,
        results: [],
        summary: "No ready first-business launch sprint action is available for internal dispatch."
      },
      plan: context.plan,
      selectedSprintActionIds,
      sprint: context.sprint
    };
  }

  const response = applyMemoryRevenueFirstCashSprint(userId, {
    dryRun,
    includeBlocked: true,
    maxCandidates: context.plan.totals.candidates || 8,
    maxSprintActions: Math.max(1, selectedSprintActionIds.length),
    note: body.note,
    sprintActionIds: selectedSprintActionIds,
    targetDaysToFirstCash: 7
  });
  const refreshed = dryRun ? context : buildMemoryRevenueFirstBusinessLaunch(userId, body);

  return {
    dispatched: response.dispatched,
    plan: refreshed.plan,
    selectedSprintActionIds,
    sprint: response.sprint
  };
}

function applyMemoryRevenueLiveConnectorReadinessRegistry(userId: string, body: Partial<Record<keyof RevenueLiveConnectorReadinessOptions, unknown>> & {
  dryRun?: boolean;
  note?: string;
  storeIds?: string[];
}) {
  const dryRun = body.dryRun !== false;
  const options = revenueLiveConnectorReadinessOptionsFrom(body);
  const plan = buildMemoryRevenueLiveConnectorReadinessRegistry(userId, options);
  const selectedEntries = selectRevenueLiveConnectorReadinessEntries(plan, Array.isArray(body.storeIds) ? body.storeIds : []);
  const auditLogId = dryRun ? null : id("audit");

  if (auditLogId) {
    state.auditLogs.unshift({
      action: "revenue.live_connector_readiness.recorded",
      createdAt: now(),
      entry: {
        blockedExternalActions: plan.blockedExternalActions,
        entries: selectedEntries.map((entry) => ({
          action: entry.action,
          boundaries: entry.connectorBoundaries.map((boundary) => ({
            liveMode: boundary.liveMode,
            provider: boundary.provider,
            readiness: boundary.readiness,
            role: boundary.role
          })),
          readinessScore: entry.readinessScore,
          status: entry.status,
          storeId: entry.storeId,
          storeName: entry.storeName
        })),
        externalExecution: false,
        note: body.note ?? null,
        providerContacted: false,
        summary: plan.summary
      },
      entryHash: id("hash"),
      id: auditLogId ?? id("audit"),
      outcome: "success",
      severity: selectedEntries.some((entry) => entry.status === "blocked") ? "high" : selectedEntries.length > 0 ? "medium" : "low",
      targetId: null,
      targetType: "revenue_live_connector_readiness_registry"
    });
  }

  return {
    applied: {
      auditLogId,
      dryRun,
      entriesRecorded: dryRun ? 0 : selectedEntries.length,
      entriesSelected: selectedEntries.length,
      externalExecution: false as const,
      providerContacted: false as const,
      readyForDesign: selectedEntries.filter((entry) => entry.status === "ready_for_design").length,
      requiredBoundaries: selectedEntries.reduce((sum, entry) => sum + entry.connectorBoundaries.length, 0),
      summary: dryRun
        ? `${selectedEntries.length} live connector readiness entr${selectedEntries.length === 1 ? "y" : "ies"} would be recorded as internal audit artifacts.`
        : `${selectedEntries.length} live connector readiness entr${selectedEntries.length === 1 ? "y" : "ies"} recorded as internal audit artifacts.`
    },
    plan
  };
}

function revenueLiveConnectorDesignDossierOptionsFrom(input: Partial<Record<keyof RevenueLiveConnectorDesignDossierOptions, unknown>>): Partial<RevenueLiveConnectorDesignDossierOptions> {
  const numberValue = (key: keyof RevenueLiveConnectorDesignDossierOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };
  const booleanValue = (key: keyof RevenueLiveConnectorDesignDossierOptions) => {
    const value = input[key];

    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() !== "false";

    return undefined;
  };

  return {
    includeBlocked: booleanValue("includeBlocked"),
    includeCredentialCustody: booleanValue("includeCredentialCustody"),
    includeRollbackRehearsal: booleanValue("includeRollbackRehearsal"),
    maxDossiers: numberValue("maxDossiers"),
    minReadinessScore: numberValue("minReadinessScore"),
    requireAllBoundariesMapped: booleanValue("requireAllBoundariesMapped"),
    requireApprovedReadOnlyEvidence: booleanValue("requireApprovedReadOnlyEvidence")
  };
}

function buildMemoryRevenueLiveConnectorDesignDossier(userId: string, options: Partial<RevenueLiveConnectorDesignDossierOptions>) {
  const readinessRegistryPlan = buildMemoryRevenueLiveConnectorReadinessRegistry(userId, {
    includeBlocked: options.includeBlocked,
    maxEntries: options.maxDossiers,
    minClosureScore: options.minReadinessScore,
    minReadOnlyConnectors: options.requireApprovedReadOnlyEvidence === false ? 0 : 1,
    requireOperationsPackAudit: true,
    requirePerformanceEvidence: true
  });

  return buildRevenueLiveConnectorDesignDossierPlan({
    options,
    readinessRegistryPlan
  });
}

function applyMemoryRevenueLiveConnectorDesignDossier(userId: string, body: Partial<Record<keyof RevenueLiveConnectorDesignDossierOptions, unknown>> & {
  dryRun?: boolean;
  note?: string;
  storeIds?: string[];
}) {
  const dryRun = body.dryRun !== false;
  const options = revenueLiveConnectorDesignDossierOptionsFrom(body);
  const plan = buildMemoryRevenueLiveConnectorDesignDossier(userId, options);
  const selectedEntries = selectRevenueLiveConnectorDesignDossiers(plan, Array.isArray(body.storeIds) ? body.storeIds : []);
  const auditLogId = dryRun ? null : id("audit");
  const dryRunRequests = selectedEntries.reduce((sum, entry) => sum + entry.dryRunRequests, 0);

  if (!dryRun) {
    state.auditLogs.unshift({
      action: "revenue.live_connector_design_dossier.recorded",
      createdAt: now(),
      entry: {
        blockedExternalActions: plan.blockedExternalActions,
        dossiers: selectedEntries.map((entry) => ({
          approvalPackets: entry.approvalPackets,
          boundaries: entry.boundaryDossiers.map((boundary) => ({
            dryRunRequests: boundary.dryRunRequestMap.length,
            liveMode: boundary.liveMode,
            packetId: boundary.finalApprovalPacket.packetId,
            provider: boundary.provider,
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
        note: body.note ?? null,
        providerContacted: false,
        summary: plan.summary
      },
      entryHash: id("hash"),
      id: auditLogId ?? id("audit"),
      outcome: "success",
      severity: selectedEntries.some((entry) => entry.status === "blocked") ? "high" : selectedEntries.length > 0 ? "medium" : "low",
      targetId: null,
      targetType: "revenue_live_connector_design_dossier"
    });
  }

  return {
    applied: {
      auditLogId,
      dryRun,
      dryRunRequests,
      entriesRecorded: dryRun ? 0 : selectedEntries.length,
      entriesSelected: selectedEntries.length,
      externalExecution: false as const,
      finalOperatorApprovalReady: selectedEntries.filter((entry) => entry.status === "final_operator_approval_ready").length,
      providerContacted: false as const,
      summary: dryRun
        ? `${selectedEntries.length} live connector design dossier${selectedEntries.length === 1 ? "" : "s"} would be recorded as internal audit artifacts.`
        : `${selectedEntries.length} live connector design dossier${selectedEntries.length === 1 ? "" : "s"} recorded as internal audit artifacts.`
    },
    plan
  };
}

function digitalProductOptionsFrom(input: Partial<Record<keyof DigitalProductOptions, unknown>>): Partial<DigitalProductOptions> {
  const numberValue = (key: keyof DigitalProductOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };
  const productsPerStore = numberValue("productsPerStore");
  const riskTolerance = input.riskTolerance;

  return {
    includeLeadMagnets: input.includeLeadMagnets === false || input.includeLeadMagnets === "false" ? false : undefined,
    maxStores: numberValue("maxStores"),
    minDigitalProductsPerStore: numberValue("minDigitalProductsPerStore"),
    productsPerStore: ([5, 10, 15, 25] as const).includes(productsPerStore as 5 | 10 | 15 | 25) ? productsPerStore as 5 | 10 | 15 | 25 : undefined,
    riskTolerance: riskTolerance === "Low" || riskTolerance === "Medium" || riskTolerance === "High" ? riskTolerance : undefined
  };
}

function buildMemoryDigitalProductPortfolio(userId: string, options: Partial<DigitalProductOptions>) {
  const stores = state.merchStores.filter((store) => store.userId === userId);
  const storeIds = new Set(stores.map((store) => store.id));
  const products = state.podProducts.filter((product) => storeIds.has(product.storeId));

  return {
    plan: buildDigitalProductPortfolioPlan({
      options,
      products,
      stores
    }),
    stores
  };
}

function revenuePerformanceOptionsFrom(input: Partial<Record<keyof RevenuePerformanceOptions | "source" | "storeId", unknown>>): Partial<RevenuePerformanceOptions> & {
  source?: RevenuePerformanceSnapshot["source"];
  storeId?: string;
} {
  const numberValue = (key: keyof RevenuePerformanceOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };
  const source = input.source;

  return {
    maxAdSpendRatio: numberValue("maxAdSpendRatio"),
    maxRecommendations: numberValue("maxRecommendations"),
    maxRefundRate: numberValue("maxRefundRate"),
    minKillProfitVelocity: numberValue("minKillProfitVelocity"),
    minPauseProfitVelocity: numberValue("minPauseProfitVelocity"),
    minScaleConversionRate: numberValue("minScaleConversionRate"),
    minScaleProfitVelocity: numberValue("minScaleProfitVelocity"),
    minSnapshotsForKill: numberValue("minSnapshotsForKill"),
    minWatchVisits: numberValue("minWatchVisits"),
    source: source === "manual" || source === "etsy" || source === "shopify" || source === "printify" || source === "printful" || source === "stripe" || source === "other" ? source : undefined,
    storeId: typeof input.storeId === "string" ? input.storeId : undefined,
    windowDays: numberValue("windowDays")
  };
}

function buildMemoryRevenuePerformanceDigest(
  userId: string,
  options: Partial<RevenuePerformanceOptions> & { source?: RevenuePerformanceSnapshot["source"]; storeId?: string }
) {
  const stores = state.merchStores.filter((store) => store.userId === userId && (!options.storeId || store.id === options.storeId));
  const storeIds = new Set(stores.map((store) => store.id));
  const products = state.podProducts.filter((product) => storeIds.has(product.storeId));
  const snapshots = state.revenuePerformanceSnapshots
    .filter((snapshot) => snapshot.userId === userId)
    .filter((snapshot) => storeIds.has(snapshot.storeId))
    .filter((snapshot) => !options.source || snapshot.source === options.source)
    .map((snapshot) => normalizeRevenuePerformanceSnapshot(snapshot));

  return {
    digest: buildRevenuePerformanceDigest({
      options,
      products,
      snapshots,
      stores
    }),
    products,
    stores
  };
}

function financialOptionsFrom(input: Partial<Record<keyof FinancialOrchestratorOptions, unknown>>): Partial<FinancialOrchestratorOptions> {
  const numberValue = (key: keyof FinancialOrchestratorOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };
  const source = input.source;

  return {
    bufferPercent: numberValue("bufferPercent"),
    currency: "USD",
    includePayoutIntents: input.includePayoutIntents === false || input.includePayoutIntents === "false" ? false : undefined,
    minPayoutIntentAmount: numberValue("minPayoutIntentAmount"),
    personalPercent: numberValue("personalPercent"),
    reserveFloorAmount: numberValue("reserveFloorAmount"),
    scalingPercent: numberValue("scalingPercent"),
    source: source === "manual" || source === "etsy" || source === "shopify" || source === "printify" || source === "printful" || source === "stripe" || source === "other" ? source : undefined,
    storeId: typeof input.storeId === "string" ? input.storeId : undefined,
    windowDays: numberValue("windowDays")
  };
}

function buildMemoryFinancialOrchestrator(userId: string, options: Partial<FinancialOrchestratorOptions>) {
  const stores = state.merchStores.filter((store) => store.userId === userId && (!options.storeId || store.id === options.storeId));
  const storeIds = new Set(stores.map((store) => store.id));
  const products = state.podProducts.filter((product) => storeIds.has(product.storeId));
  const cutoff = new Date(Date.now() - (options.windowDays ?? 30) * 86_400_000).toISOString();
  const snapshots = state.revenuePerformanceSnapshots
    .filter((snapshot) => snapshot.userId === userId)
    .filter((snapshot) => storeIds.has(snapshot.storeId))
    .filter((snapshot) => !options.source || snapshot.source === options.source)
    .filter((snapshot) => snapshot.periodEnd >= cutoff)
    .map((snapshot) => normalizeRevenuePerformanceSnapshot(snapshot));
  const existingLedgerSnapshotIds = new Set(
    state.financialLedgerEntries
      .filter((entry) => entry.userId === userId)
      .map((entry) => entry.revenuePerformanceSnapshotId)
  );
  const revenuePlan = buildRevenueEnginePlan({
    products,
    stores
  });
  const performanceDigest = buildRevenuePerformanceDigest({
    options,
    products,
    snapshots,
    stores
  });
  const assetPortfolio = mergeRevenueAssetPortfolioPerformance(buildRevenueAssetPortfolio(revenuePlan), performanceDigest);

  return {
    plan: buildFinancialOrchestratorPlan({
      assetPortfolio,
      existingLedgerSnapshotIds,
      options,
      ownerId: userId,
      products,
      snapshots,
      stores
    }),
    products,
    snapshots,
    stores
  };
}

function memoryFinancialPayoutIntentSnapshot(intent: FinancialPayoutIntentRecord): FinancialPayoutIntentSnapshot {
  return {
    amount: intent.amount,
    approvalRequired: intent.approvalRequired,
    auditLogId: intent.auditLogId ?? null,
    category: intent.category as FinancialPayoutIntentSnapshot["category"],
    createdAt: intent.createdAt,
    currency: intent.currency,
    destinationType: intent.destinationType,
    externalExecution: false,
    id: intent.id,
    metadata: intent.metadata,
    provider: intent.provider,
    status: intent.status,
    updatedAt: intent.updatedAt
  };
}

function storeMemoryFinancialScalingBudgetPackets(
  userId: string,
  policyId: string | null,
  packets: FinancialScalingBudgetPacket[],
  auditLogId: string | null,
  createdAt: string
) {
  let created = 0;

  for (const packet of packets) {
    if (state.financialScalingBudgetPackets.some((existing) => existing.userId === userId && existing.dedupeKey === packet.dedupeKey)) continue;

    state.financialScalingBudgetPackets.unshift({
      amount: packet.amount,
      approvalGate: packet.approvalGate,
      approvalRequired: true,
      assetId: packet.assetId,
      assetName: packet.assetName,
      assetType: packet.assetType,
      auditLogId,
      blockedExternalActions: packet.blockedExternalActions,
      budgetCap: packet.budgetCap,
      confidence: packet.confidence,
      createdAt,
      dedupeKey: packet.dedupeKey,
      externalExecution: false,
      id: id("fin_scale_budget"),
      metadata: {
        budgetCap: packet.budgetCap,
        scoreBand: packet.scoreBand,
        source: "financial_orchestrator"
      },
      priority: packet.priority,
      profitVelocity: packet.profitVelocity,
      providerContacted: false,
      reason: packet.reason,
      reviewedAt: null,
      reviewedById: null,
      reviewNote: null,
      score: packet.score,
      scoreBand: packet.scoreBand,
      splitPolicyId: policyId,
      status: packet.status,
      storeId: packet.storeId,
      storeName: packet.storeName,
      updatedAt: createdAt,
      userId
    });
    created += 1;
  }

  return created;
}

function memoryFinancialScalingBudgetPacketSnapshot(packet: FinancialScalingBudgetPacketRecord): FinancialScalingBudgetPacketSnapshot {
  return {
    amount: packet.amount,
    approvalGate: packet.approvalGate,
    assetId: packet.assetId,
    assetName: packet.assetName,
    assetType: packet.assetType,
    auditLogId: packet.auditLogId ?? null,
    blockedExternalActions: packet.blockedExternalActions,
    budgetCap: packet.budgetCap,
    confidence: packet.confidence,
    createdAt: packet.createdAt,
    dedupeKey: packet.dedupeKey,
    externalExecution: false,
    id: packet.id,
    metadata: packet.metadata,
    priority: packet.priority,
    profitVelocity: packet.profitVelocity,
    providerContacted: false,
    reason: packet.reason,
    reviewedAt: packet.reviewedAt ?? null,
    reviewedById: packet.reviewedById ?? null,
    reviewNote: packet.reviewNote ?? null,
    score: packet.score,
    scoreBand: packet.scoreBand,
    splitPolicyId: packet.splitPolicyId,
    status: packet.status,
    storeId: packet.storeId,
    storeName: packet.storeName,
    updatedAt: packet.updatedAt
  };
}

function buildMemoryFinancialScalingBudgetReview(userId: string) {
  const packets = state.financialScalingBudgetPackets
    .filter((packet) => packet.userId === userId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(memoryFinancialScalingBudgetPacketSnapshot);

  return {
    packets,
    plan: buildFinancialScalingBudgetReviewPlan({ packets })
  };
}

function memoryScalingSpendPacketSnapshot(packet: FinancialScalingSpendPacketRecord): FinancialPersistedScalingSpendPacketSnapshot {
  return {
    amount: packet.amount,
    approvalState: packet.approvalState,
    assetId: packet.assetId,
    assetName: packet.assetName,
    assetType: packet.assetType,
    auditLogId: packet.auditLogId ?? null,
    blockedActions: packet.blockedActions,
    budgetPacketId: packet.budgetPacketId,
    category: packet.category,
    controls: packet.controls,
    createdAt: packet.createdAt,
    currency: packet.currency,
    dedupeKey: packet.dedupeKey,
    externalExecution: false,
    id: `scale_spend_${packet.id}`,
    maxSpendAmount: packet.maxSpendAmount,
    priority: packet.priority,
    providerContacted: false,
    purpose: packet.purpose,
    recordId: packet.id,
    releaseState: packet.releaseState,
    score: packet.score,
    storeId: packet.storeId,
    storeName: packet.storeName,
    updatedAt: packet.updatedAt
  };
}

function buildMemoryFinancialScalingSpendControl(userId: string) {
  const review = buildMemoryFinancialScalingBudgetReview(userId);
  const spendPackets = state.financialScalingSpendPackets
    .filter((packet) => packet.userId === userId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(memoryScalingSpendPacketSnapshot);

  return {
    plan: buildFinancialScalingSpendControlPlan({
      persistedSpendPackets: spendPackets,
      reviewPlan: review.plan
    })
  };
}

function applyMemoryFinancialScalingSpendControl(userId: string, plan: FinancialScalingSpendControlPlan) {
  const createdAt = now();
  const auditLogId = id("audit");
  let upsertedPackets = 0;

  for (const packet of plan.spendPackets) {
    const existingIndex = state.financialScalingSpendPackets.findIndex((record) => record.userId === userId && record.dedupeKey === packet.dedupeKey);
    const record: FinancialScalingSpendPacketRecord = {
      amount: packet.amount,
      approvalState: packet.approvalState,
      assetId: packet.assetId,
      assetName: packet.assetName,
      assetType: packet.assetType,
      auditLogId,
      blockedActions: packet.blockedActions,
      budgetPacketId: packet.budgetPacketId,
      category: packet.category,
      controls: packet.controls,
      createdAt: existingIndex >= 0 ? state.financialScalingSpendPackets[existingIndex].createdAt : createdAt,
      currency: packet.currency,
      dedupeKey: packet.dedupeKey,
      externalExecution: false,
      id: existingIndex >= 0 ? state.financialScalingSpendPackets[existingIndex].id : id("fin_scale_spend"),
      maxSpendAmount: packet.maxSpendAmount,
      priority: packet.priority,
      providerContacted: false,
      purpose: packet.purpose,
      releaseState: packet.releaseState,
      score: packet.score,
      storeId: packet.storeId,
      storeName: packet.storeName,
      updatedAt: createdAt,
      userId
    };

    if (existingIndex >= 0) {
      state.financialScalingSpendPackets[existingIndex] = record;
    } else {
      state.financialScalingSpendPackets.unshift(record);
    }
    upsertedPackets += 1;
  }

  state.auditLogs.unshift({
    action: "financial.scaling_spend_control.recorded",
    createdAt,
    entry: {
      approvedBudgetAmount: plan.totals.approvedBudgetAmount,
      approvedBudgetPackets: plan.totals.approvedBudgetPackets,
      blockedExternalActions: plan.blockedExternalActions,
      externalExecution: false,
      providerContacted: false,
      spendPacketsUpserted: upsertedPackets,
      summary: plan.summary,
      totals: plan.totals
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: plan.totals.pendingSpendAmount > 0 ? "medium" : "low",
    targetId: null,
    targetType: "financial_scaling_spend_control"
  });

  return {
    auditLogId,
    scalingSpendPacketsUpserted: upsertedPackets
  };
}

function memoryScalingExecutionEntrySnapshot(entry: FinancialScalingExecutionEntryRecord): FinancialScalingExecutionEntrySnapshot {
  return normalizeFinancialScalingExecutionEntry({
    amountSpent: entry.amountSpent,
    assetId: entry.assetId,
    assetName: entry.assetName,
    assetType: entry.assetType,
    auditLogId: entry.auditLogId ?? null,
    category: entry.category,
    createdAt: entry.createdAt,
    externalExecution: false,
    grossRevenue: entry.grossRevenue,
    id: `scale_execution_${entry.id}`,
    netProfit: entry.netProfit,
    notes: entry.notes ?? null,
    outcome: entry.outcome,
    periodEnd: entry.periodEnd,
    periodStart: entry.periodStart,
    productId: entry.productId,
    providerContacted: false,
    recordId: entry.id,
    scalingSpendPacketId: entry.scalingSpendPacketId,
    source: entry.source,
    storeId: entry.storeId,
    storeName: entry.storeName,
    unitsSold: entry.unitsSold,
    updatedAt: entry.updatedAt,
    visits: entry.visits
  });
}

function buildMemoryFinancialScalingExecutionLedger(userId: string): {
  plan: FinancialScalingExecutionLedgerPlan;
  spendControlPlan: FinancialScalingSpendControlPlan;
} {
  const { plan: spendControlPlan } = buildMemoryFinancialScalingSpendControl(userId);
  const entries = state.financialScalingExecutionEntries
    .filter((entry) => entry.userId === userId)
    .sort((left, right) => right.periodEnd.localeCompare(left.periodEnd))
    .map(memoryScalingExecutionEntrySnapshot);

  return {
    plan: buildFinancialScalingExecutionLedgerPlan({
      entries,
      spendControlPlan
    }),
    spendControlPlan
  };
}

function validateMemoryFinancialScalingExecutionEntries(userId: string, entries: Array<{
  amountSpent: number;
  scalingSpendPacketId: string;
}>) {
  const packetIds = [...new Set(entries.map((entry) => entry.scalingSpendPacketId))];
  const spendPackets = state.financialScalingSpendPackets.filter((packet) => packet.userId === userId && packetIds.includes(packet.id));
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

  const incomingSpendByPacket = new Map<string, number>();

  for (const entry of entries) {
    incomingSpendByPacket.set(entry.scalingSpendPacketId, (incomingSpendByPacket.get(entry.scalingSpendPacketId) ?? 0) + entry.amountSpent);
  }

  for (const [packetId, incomingSpend] of incomingSpendByPacket) {
    const packet = packetById.get(packetId);
    if (!packet) continue;

    const existingSpend = state.financialScalingExecutionEntries
      .filter((entry) => entry.userId === userId && entry.scalingSpendPacketId === packetId)
      .reduce((total, entry) => total + entry.amountSpent, 0);

    if (existingSpend + incomingSpend > packet.maxSpendAmount + 0.01) {
      return {
        error: {
          code: 400,
          message: `Scaling execution outcome for ${packet.assetName} would exceed the packet cap of ${packet.maxSpendAmount}.`
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

function applyMemoryFinancialScalingExecutionLedger(userId: string, entries: Array<{
  amountSpent: number;
  grossRevenue: number;
  netProfit: number;
  notes?: string | null;
  outcome: FinancialScalingExecutionOutcome;
  periodEnd: string;
  periodStart: string;
  scalingSpendPacketId: string;
  source: FinancialScalingExecutionSource;
  unitsSold: number;
  visits: number;
}>) {
  const validation = validateMemoryFinancialScalingExecutionEntries(userId, entries);

  if (validation.error) {
    return {
      error: validation.error,
      result: null
    };
  }

  const createdAt = now();
  const auditLogId = id("audit");
  const createdEntries: FinancialScalingExecutionEntryRecord[] = entries.map((entry) => {
    const packet = validation.packetById.get(entry.scalingSpendPacketId);

    if (!packet) {
      throw new Error(`Scaling spend packet ${entry.scalingSpendPacketId} was not available after validation.`);
    }

    return {
      amountSpent: entry.amountSpent,
      assetId: packet.assetId,
      assetName: packet.assetName,
      assetType: packet.assetType,
      auditLogId,
      category: packet.category,
      createdAt,
      externalExecution: false,
      grossRevenue: entry.grossRevenue,
      id: id("fin_scale_exec"),
      netProfit: entry.netProfit,
      notes: entry.notes ?? null,
      outcome: entry.outcome,
      periodEnd: entry.periodEnd,
      periodStart: entry.periodStart,
      productId: packet.assetType === "product" ? packet.assetId : null,
      providerContacted: false,
      scalingSpendPacketId: packet.id,
      source: entry.source,
      storeId: packet.storeId,
      storeName: packet.storeName,
      unitsSold: entry.unitsSold,
      updatedAt: createdAt,
      userId,
      visits: entry.visits
    };
  });

  state.financialScalingExecutionEntries.unshift(...createdEntries);
  state.auditLogs.unshift({
    action: "financial.scaling_execution_ledger.ingested",
    createdAt,
    entry: {
      entriesRecorded: createdEntries.length,
      externalExecution: false,
      providerContacted: false,
      scalingSpendPacketIds: [...new Set(createdEntries.map((entry) => entry.scalingSpendPacketId))]
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: entries.some((entry) => entry.outcome === "stopped" || entry.netProfit < 0) ? "medium" : "low",
    targetId: null,
    targetType: "financial_scaling_execution_ledger"
  });

  return {
    error: null,
    result: {
      auditLogId,
      entriesRecorded: createdEntries.length
    }
  };
}

function buildMemoryFinancialPayoutReview(userId: string) {
  const intents = state.financialPayoutIntents
    .filter((intent) => intent.userId === userId)
    .map(memoryFinancialPayoutIntentSnapshot);

  return {
    intents,
    plan: buildFinancialPayoutReviewPlan({ intents })
  };
}

function memoryReleasePacketSnapshot(packet: FinancialBudgetReleasePacketRecord): FinancialPersistedReleasePacketSnapshot {
  return {
    amount: packet.amount,
    approvalState: packet.approvalState,
    auditLogId: packet.auditLogId ?? null,
    blockedActions: packet.blockedActions,
    category: packet.category,
    controls: packet.controls,
    createdAt: packet.createdAt,
    currency: packet.currency,
    destinationType: packet.destinationType,
    externalExecution: false,
    id: `release_${packet.payoutIntentId}`,
    intentId: packet.payoutIntentId,
    maxReleaseAmount: packet.maxReleaseAmount,
    purpose: packet.purpose,
    recordId: packet.id,
    releaseState: packet.releaseState,
    title: `${packet.category.replace(/_/g, " ")} release packet`,
    updatedAt: packet.updatedAt
  };
}

function memoryReconciliationReportSnapshot(report: FinancialReconciliationReportRecord): FinancialPersistedReconciliationSnapshot {
  return {
    approvedAmount: report.approvedAmount,
    auditLogId: report.auditLogId ?? null,
    createdAt: report.createdAt,
    externalExecution: false,
    id: report.id,
    pendingAmount: report.pendingAmount,
    rejectedAmount: report.rejectedAmount,
    report: report.report,
    source: report.source,
    status: report.status,
    totalAmount: report.totalAmount,
    updatedAt: report.updatedAt,
    variance: report.variance
  };
}

function buildMemoryFinancialReleaseGovernance(userId: string) {
  const review = buildMemoryFinancialPayoutReview(userId);
  const releasePackets = state.financialBudgetReleasePackets
    .filter((packet) => packet.userId === userId)
    .map(memoryReleasePacketSnapshot);
  const reconciliationReports = state.financialReconciliationReports
    .filter((report) => report.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 10)
    .map(memoryReconciliationReportSnapshot);

  return {
    plan: buildFinancialReleaseGovernancePlan({
      persistedReconciliationReports: reconciliationReports,
      persistedReleasePackets: releasePackets,
      reviewPlan: review.plan
    })
  };
}

function facelessChannelsFrom(value: unknown): FacelessContentChannel[] | undefined {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const channels = values
    .map((item) => typeof item === "string" ? item.trim() : "")
    .filter((item): item is FacelessContentChannel => item === "youtube_shorts" || item === "tiktok" || item === "instagram_reels");

  return channels.length > 0 ? channels : undefined;
}

function facelessContentOptionsFrom(input: Partial<Record<keyof FacelessContentOptions, unknown>>): Partial<FacelessContentOptions> {
  const numberValue = (key: keyof FacelessContentOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };
  const boolValue = (key: keyof FacelessContentOptions) => {
    const value = input[key];
    return value === undefined ? undefined : !(value === false || value === "false");
  };

  return {
    briefsPerStore: numberValue("briefsPerStore"),
    includeChannelPackages: boolValue("includeChannelPackages"),
    includeVideoSpecs: boolValue("includeVideoSpecs"),
    includeVoiceoverSpecs: boolValue("includeVoiceoverSpecs"),
    maxStores: numberValue("maxStores"),
    minClicksForScale: numberValue("minClicksForScale"),
    minViewsForRemix: numberValue("minViewsForRemix"),
    targetChannels: facelessChannelsFrom(input.targetChannels),
    windowDays: numberValue("windowDays")
  };
}

function memoryFacelessPerformanceSnapshot(snapshot: FacelessContentPerformanceSnapshotRecord): FacelessContentPerformanceSnapshot {
  return {
    channel: snapshot.channel,
    clicks: snapshot.clicks,
    comments: snapshot.comments,
    contentBriefId: snapshot.contentBriefId,
    conversions: snapshot.conversions,
    cost: snapshot.cost,
    externalExecution: false,
    id: snapshot.id,
    likes: snapshot.likes,
    notes: snapshot.notes,
    periodEnd: snapshot.periodEnd,
    periodStart: snapshot.periodStart,
    productId: snapshot.productId,
    revenue: snapshot.revenue,
    saves: snapshot.saves,
    shares: snapshot.shares,
    source: snapshot.source,
    storeId: snapshot.storeId,
    views: snapshot.views,
    watchSeconds: snapshot.watchSeconds
  };
}

function buildMemoryFacelessContentPipeline(userId: string, options: Partial<FacelessContentOptions>) {
  const stores = state.merchStores.filter((store) => store.userId === userId);
  const storeIds = new Set(stores.map((store) => store.id));
  const products = state.podProducts.filter((product) => storeIds.has(product.storeId));
  const cutoff = new Date(Date.now() - (options.windowDays ?? 30) * 86_400_000).toISOString();
  const performanceSnapshots = state.facelessContentPerformanceSnapshots
    .filter((snapshot) => snapshot.userId === userId)
    .filter((snapshot) => snapshot.periodEnd >= cutoff)
    .map(memoryFacelessPerformanceSnapshot);

  return {
    plan: buildFacelessContentPipelinePlan({
      existingBriefSourceKeys: new Set(state.facelessContentBriefs.filter((brief) => brief.userId === userId).map((brief) => brief.dedupeKey)),
      options,
      performanceSnapshots,
      products,
      stores
    }),
    products,
    stores
  };
}

function buildMemoryFacelessPerformanceDigest(userId: string, options: Partial<FacelessContentOptions> & {
  channel?: FacelessContentChannel;
  source?: string;
  storeId?: string;
}) {
  const cutoff = new Date(Date.now() - (options.windowDays ?? 30) * 86_400_000).toISOString();
  const stores = state.merchStores.filter((store) => store.userId === userId);
  const storeIds = new Set(stores.map((store) => store.id));
  const products = state.podProducts.filter((product) => storeIds.has(product.storeId));
  const performanceSnapshots = state.facelessContentPerformanceSnapshots
    .filter((snapshot) => snapshot.userId === userId)
    .filter((snapshot) => snapshot.periodEnd >= cutoff)
    .filter((snapshot) => !options.channel || snapshot.channel === options.channel)
    .filter((snapshot) => !options.source || snapshot.source === options.source)
    .filter((snapshot) => !options.storeId || snapshot.storeId === options.storeId)
    .map(memoryFacelessPerformanceSnapshot);
  const plan = buildFacelessContentPipelinePlan({
    options,
    performanceSnapshots,
    products,
    stores
  });

  return { digest: plan.performanceDigest };
}

function signalIntakeOptionsFrom(input: Partial<Record<keyof SignalIntakeOptions, unknown>>): Partial<SignalIntakeOptions> {
  const numberValue = (key: keyof SignalIntakeOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };

  return {
    includeSamplePayloads: input.includeSamplePayloads === false || input.includeSamplePayloads === "false" ? false : undefined,
    maxSignals: numberValue("maxSignals"),
    windowDays: numberValue("windowDays")
  };
}

function buildMemorySignalIntake(userId: string, options: Partial<SignalIntakeOptions>, incoming?: SignalIntakeInput): SignalIntakePlan {
  const stores = state.merchStores.filter((store) => store.userId === userId);
  const storeIds = new Set(stores.map((store) => store.id));
  const products = state.podProducts.filter((product) => storeIds.has(product.storeId));

  return buildSignalIntakePlan({
    briefs: state.facelessContentBriefs
      .filter((brief) => brief.userId === userId)
      .map((brief) => ({
        id: brief.id,
        productId: brief.productId,
        storeId: brief.storeId,
        title: brief.title
      })),
    incoming,
    options,
    products: products.map((product) => ({
      id: product.id,
      productName: product.productName,
      storeId: product.storeId
    })),
    stores: stores.map((store) => ({
      businessName: store.businessName,
      id: store.id,
      launchStatus: store.launchStatus,
      storePlatform: store.storePlatform
    }))
  });
}

function revenueSignalConnectorOptionsFrom(input: Partial<Record<keyof RevenueSignalConnectorOptions, unknown>>): Partial<RevenueSignalConnectorOptions> {
  const numberValue = (key: keyof RevenueSignalConnectorOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };
  const booleanValue = (key: keyof RevenueSignalConnectorOptions) => {
    const value = input[key];

    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";

    return undefined;
  };

  return {
    includeCommerce: booleanValue("includeCommerce"),
    includeContent: booleanValue("includeContent"),
    includePayments: booleanValue("includePayments"),
    includeSamplePayloads: booleanValue("includeSamplePayloads"),
    maxConnectors: numberValue("maxConnectors"),
    onlyReady: booleanValue("onlyReady"),
    windowDays: numberValue("windowDays")
  };
}

function buildMemoryRevenueSignalConnectors(userId: string, options: Partial<RevenueSignalConnectorOptions>) {
  const stores = state.merchStores.filter((store) => store.userId === userId);
  const storeIds = new Set(stores.map((store) => store.id));
  const products = state.podProducts.filter((product) => storeIds.has(product.storeId));

  return buildRevenueSignalConnectorPlan({
    briefs: state.facelessContentBriefs
      .filter((brief) => brief.userId === userId)
      .map((brief) => ({
        id: brief.id,
        productId: brief.productId,
        storeId: brief.storeId,
        title: brief.title
      })),
    options,
    products: products.map((product) => ({
      id: product.id,
      productName: product.productName,
      storeId: product.storeId
    })),
    stores: stores.map((store) => ({
      businessName: store.businessName,
      id: store.id,
      launchStatus: store.launchStatus,
      podProvider: store.podProvider,
      storePlatform: store.storePlatform
    }))
  });
}

function applyMemoryRevenueSignalConnectors(userId: string, body: Partial<Record<keyof RevenueSignalConnectorOptions, unknown>> & {
  dryRun?: boolean;
  manifestIds?: string[];
  note?: string;
}) {
  const options = revenueSignalConnectorOptionsFrom(body);
  const plan = buildMemoryRevenueSignalConnectors(userId, options);
  const selectedManifests = selectRevenueSignalConnectorManifests(plan, Array.isArray(body.manifestIds) ? body.manifestIds : []);
  const blockedManifestIds = selectedManifests.filter((manifestItem) => manifestItem.status !== "ready_for_approval").map((manifestItem) => manifestItem.id);
  const auditLogId = body.dryRun ? null : id("audit");

  if (!body.dryRun) {
    state.auditLogs.unshift({
      action: "revenue.signal_connectors.manifests_recorded",
      createdAt: now(),
      entry: {
        blockedExternalActions: plan.blockedExternalActions,
        blockedManifestIds,
        dryRun: false,
        externalExecution: false,
        manifestIds: selectedManifests.map((manifestItem) => manifestItem.id),
        note: body.note ?? null,
        providerContacted: false,
        requiredConfirmation: revenueSignalConnectorConfirmation,
        sampleSignals: plan.signalIntakePreview.totals.signals,
        summary: plan.summary
      },
      entryHash: id("hash"),
      id: auditLogId ?? id("audit"),
      outcome: blockedManifestIds.length > 0 ? "failure" : "success",
      severity: blockedManifestIds.length > 0 || selectedManifests.some((manifestItem) => manifestItem.provider === "stripe") ? "medium" : "low",
      targetId: selectedManifests[0]?.id ?? null,
      targetType: "revenue_signal_connector_manifest"
    });
  }

  return {
    applied: {
      auditLogId,
      blockedManifestIds,
      dryRun: Boolean(body.dryRun),
      externalExecution: false as const,
      manifestIds: selectedManifests.map((manifestItem) => manifestItem.id),
      manifestsRecorded: body.dryRun ? 0 : selectedManifests.length,
      providerContacted: false as const,
      readyManifests: selectedManifests.length - blockedManifestIds.length,
      sampleSignals: plan.signalIntakePreview.totals.signals,
      summary: selectedManifests.length === 0
        ? "No read-only signal connector manifests matched the request."
        : `${selectedManifests.length} read-only signal connector manifest${selectedManifests.length === 1 ? "" : "s"} ${body.dryRun ? "previewed" : "recorded"} internally. External execution remains locked.`
    },
    plan
  };
}

function revenueSignalConnectorApprovalOptionsFrom(input: Partial<Record<keyof RevenueSignalConnectorOptions | "includeArchived" | "maxRecords", unknown>>) {
  const parsedMaxRecords = Number(input.maxRecords);
  const includeArchivedInput = input.includeArchived;

  return {
    ...revenueSignalConnectorOptionsFrom(input),
    includeArchived: typeof includeArchivedInput === "boolean"
      ? includeArchivedInput
      : typeof includeArchivedInput === "string" && includeArchivedInput.toLowerCase() === "true",
    maxRecords: Number.isFinite(parsedMaxRecords) && parsedMaxRecords > 0 ? Math.min(Math.floor(parsedMaxRecords), 100) : 50
  };
}

function memorySignalPreviewForManifest(manifest: RevenueSignalConnectorManifest, windowDays?: number): SignalIntakePlan {
  return buildSignalIntakePlan({
    incoming: manifest.samplePayload ?? undefined,
    options: {
      includeSamplePayloads: false,
      maxSignals: 100,
      windowDays: windowDays ?? 30
    }
  });
}

function buildMemoryRevenueSignalConnectorApprovals(
  userId: string,
  options: Partial<RevenueSignalConnectorOptions> & { includeArchived?: boolean; maxRecords?: number }
) {
  const connectorPlan = buildMemoryRevenueSignalConnectors(userId, options);
  const maxRecords = options.maxRecords ?? 50;
  const visibleApproval = (approval: RevenueSignalConnectorApprovalRecord) => approval.userId === userId && (options.includeArchived || approval.status !== "archived");
  const visibleJob = (job: RevenueSignalImportJobRecord) => job.userId === userId && (options.includeArchived || job.status !== "archived");
  const approvals = state.revenueSignalConnectorApprovals
    .filter(visibleApproval)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, maxRecords);
  const importJobs = state.revenueSignalImportJobs
    .filter(visibleJob)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, maxRecords);

  return buildRevenueSignalConnectorApprovalPlan({
    approvals,
    connectorPlan,
    importJobs
  });
}

function applyMemoryRevenueSignalConnectorApprovals(userId: string, body: Partial<Record<keyof RevenueSignalConnectorOptions | "includeArchived" | "maxRecords", unknown>> & {
  dryRun?: boolean;
  manifestIds?: string[];
  note?: string;
}) {
  const options = revenueSignalConnectorApprovalOptionsFrom(body);
  const plan = buildMemoryRevenueSignalConnectorApprovals(userId, options);
  const selectedManifests = selectRevenueSignalConnectorManifests(plan.connectorPlan, Array.isArray(body.manifestIds) ? body.manifestIds : []);
  const existingDedupeKeys = new Set(plan.approvals.map((approval) => approval.dedupeKey));
  const blockedManifestIds = selectedManifests.filter((manifestItem) => manifestItem.status !== "ready_for_approval").map((manifestItem) => manifestItem.id);
  const skippedExistingManifestIds = selectedManifests
    .filter((manifestItem) => existingDedupeKeys.has(revenueSignalConnectorApprovalDedupeKey(manifestItem)))
    .map((manifestItem) => manifestItem.id);
  const queueableManifests = selectedManifests
    .filter((manifestItem) => manifestItem.status === "ready_for_approval")
    .filter((manifestItem) => !existingDedupeKeys.has(revenueSignalConnectorApprovalDedupeKey(manifestItem)));

  if (body.dryRun) {
    return {
      applied: {
        auditLogId: null,
        blockedManifestIds,
        dryRun: true,
        externalExecution: false as const,
        manifestIds: selectedManifests.map((manifestItem) => manifestItem.id),
        providerContacted: false as const,
        queuedApprovalIds: [] as string[],
        queuedApprovals: 0,
        readyManifests: queueableManifests.length,
        skippedExistingManifestIds,
        summary: `${queueableManifests.length} read-only connector approval record${queueableManifests.length === 1 ? "" : "s"} would be queued.`
      },
      plan
    };
  }

  const auditLogId = id("audit");
  const createdAt = now();
  const queuedRecords: RevenueSignalConnectorApprovalRecord[] = queueableManifests.map((manifestItem) => ({
    blockedActions: manifestItem.blockedExternalActions,
    contentBriefId: manifestItem.target.contentBriefId,
    createdAt,
    credentialEnvVars: manifestItem.credentialEnvVars,
    dedupeKey: revenueSignalConnectorApprovalDedupeKey(manifestItem),
    endpointTemplates: manifestItem.endpointTemplates,
    externalExecution: false,
    id: id("signal_connector_approval"),
    lane: manifestItem.lane,
    manifest: manifestItem,
    manifestId: manifestItem.id,
    productId: manifestItem.target.productId,
    provider: manifestItem.provider,
    providerContacted: false,
    providerName: manifestItem.providerName,
    readOnlyScopes: manifestItem.readOnlyScopes,
    readinessScore: manifestItem.readinessScore,
    requestAuditLogId: auditLogId,
    reviewAuditLogId: null,
    reviewedAt: null,
    reviewedById: null,
    reviewNote: null,
    riskLevel: manifestItem.riskLevel,
    samplePayload: manifestItem.samplePayload,
    signalPreview: memorySignalPreviewForManifest(manifestItem, options.windowDays),
    status: "pending_review",
    storeId: manifestItem.target.storeId,
    storeName: manifestItem.target.storeName,
    transformTarget: manifestItem.transformTarget,
    updatedAt: createdAt,
    userId
  }));

  state.revenueSignalConnectorApprovals.unshift(...queuedRecords);
  state.auditLogs.unshift({
    action: "revenue.signal_connectors.approvals_queued",
    createdAt,
    entry: {
      blockedExternalActions: plan.blockedExternalActions,
      blockedManifestIds,
      dryRun: false,
      externalExecution: false,
      manifestIds: selectedManifests.map((manifestItem) => manifestItem.id),
      note: body.note ?? null,
      providerContacted: false,
      requiredConfirmation: revenueSignalConnectorApprovalConfirmation,
      skippedExistingManifestIds,
      summary: plan.summary
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: blockedManifestIds.length > 0 ? "failure" : "success",
    severity: blockedManifestIds.length > 0 || queuedRecords.some((record) => record.provider === "stripe") ? "medium" : "low",
    targetId: queuedRecords[0]?.id ?? selectedManifests[0]?.id ?? null,
    targetType: "revenue_signal_connector_approval"
  });

  return {
    applied: {
      auditLogId,
      blockedManifestIds,
      dryRun: false,
      externalExecution: false as const,
      manifestIds: selectedManifests.map((manifestItem) => manifestItem.id),
      providerContacted: false as const,
      queuedApprovalIds: queuedRecords.map((record) => record.id),
      queuedApprovals: queuedRecords.length,
      readyManifests: queueableManifests.length,
      skippedExistingManifestIds,
      summary: `${queuedRecords.length} read-only connector approval record${queuedRecords.length === 1 ? "" : "s"} queued internally. External execution remains locked.`
    },
    plan: buildMemoryRevenueSignalConnectorApprovals(userId, options)
  };
}

function reviewMemoryRevenueSignalConnectorApproval(userId: string, approvalId: string, body: {
  action?: "approve" | "reject";
  note?: string;
}) {
  const approval = state.revenueSignalConnectorApprovals.find((record) => record.userId === userId && record.id === approvalId);

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

  const action = body.action === "reject" ? "reject" : "approve";
  const auditLogId = id("audit");
  const reviewedAt = now();
  const fromStatus = approval.status;
  approval.status = action === "approve" ? "approved" : "rejected";
  approval.reviewAuditLogId = auditLogId;
  approval.reviewedAt = reviewedAt;
  approval.reviewedById = userId;
  approval.reviewNote = body.note ?? null;
  approval.updatedAt = reviewedAt;

  state.auditLogs.unshift({
    action: "revenue.signal_connectors.approval_reviewed",
    createdAt: reviewedAt,
    entry: {
      approvalId,
      dryRun: false,
      externalExecution: false,
      fromStatus,
      manifestId: approval.manifestId,
      note: body.note ?? null,
      provider: approval.provider,
      providerContacted: false,
      requiredConfirmation: action === "approve" ? revenueSignalConnectorApproveConfirmation : revenueSignalConnectorRejectConfirmation,
      reviewAction: action,
      toStatus: approval.status
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: approval.provider === "stripe" || action === "reject" ? "medium" : "low",
    targetId: approval.id,
    targetType: "revenue_signal_connector_approval"
  });

  return {
    applied: {
      approvalId,
      auditLogId,
      dryRun: false,
      externalExecution: false as const,
      fromStatus,
      manifestId: approval.manifestId,
      providerContacted: false as const,
      reviewAction: action,
      toStatus: approval.status
    },
    plan: buildMemoryRevenueSignalConnectorApprovals(userId, revenueSignalConnectorApprovalOptionsFrom({}))
  };
}

function applyMemoryRevenueSignalImportJobs(userId: string, body: Partial<Record<keyof RevenueSignalConnectorOptions | "includeArchived" | "maxRecords", unknown>> & {
  approvalIds?: string[];
  dryRun?: boolean;
  note?: string;
}) {
  const options = revenueSignalConnectorApprovalOptionsFrom(body);
  const plan = buildMemoryRevenueSignalConnectorApprovals(userId, options);
  const selectedApprovals = selectRevenueSignalApprovalsForImport(plan, Array.isArray(body.approvalIds) ? body.approvalIds : []);
  const sampleSignalsQueued = selectedApprovals.reduce((sum, approval) => (
    sum
    + (approval.samplePayload?.commerceSignals?.length ?? 0)
    + (approval.samplePayload?.contentSignals?.length ?? 0)
    + (approval.samplePayload?.paymentSignals?.length ?? 0)
  ), 0);

  if (body.dryRun) {
    return {
      applied: {
        approvalIds: selectedApprovals.map((approval) => approval.id),
        auditLogId: null,
        dryRun: true,
        externalExecution: false as const,
        importJobIds: [] as string[],
        importJobsQueued: 0,
        providerContacted: false as const,
        sampleSignalsQueued,
        summary: `${selectedApprovals.length} approved read-only connector${selectedApprovals.length === 1 ? "" : "s"} would queue import jobs.`
      },
      plan
    };
  }

  const auditLogId = id("audit");
  const createdAt = now();
  const jobs: RevenueSignalImportJobRecord[] = selectedApprovals.map((approval) => ({
    approvalId: approval.id,
    auditLogId,
    completedAt: null,
    createdAt,
    externalExecution: false,
    handoffAuditLogId: null,
    id: id("signal_import_job"),
    intakeResult: null,
    lane: approval.lane,
    manifestId: approval.manifestId,
    provider: approval.provider,
    providerContacted: false,
    samplePayload: approval.samplePayload,
    signalPreview: approval.signalPreview,
    status: "queued_review",
    transformTarget: approval.transformTarget,
    updatedAt: createdAt,
    userId
  }));

  state.revenueSignalImportJobs.unshift(...jobs);
  for (const approval of selectedApprovals) {
    const storedApproval = state.revenueSignalConnectorApprovals.find((record) => record.userId === userId && record.id === approval.id);

    if (storedApproval) {
      storedApproval.status = "import_queued";
      storedApproval.updatedAt = createdAt;
    }
  }

  state.auditLogs.unshift({
    action: "revenue.signal_import_jobs.queued",
    createdAt,
    entry: {
      approvalIds: selectedApprovals.map((approval) => approval.id),
      blockedExternalActions: plan.blockedExternalActions,
      dryRun: false,
      externalExecution: false,
      manifestIds: selectedApprovals.map((approval) => approval.manifestId),
      note: body.note ?? null,
      providerContacted: false,
      requiredConfirmation: revenueSignalImportJobConfirmation,
      sampleSignalsQueued,
      summary: plan.summary
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: selectedApprovals.some((approval) => approval.provider === "stripe") ? "medium" : "low",
    targetId: selectedApprovals[0]?.id ?? null,
    targetType: "revenue_signal_import_job"
  });

  return {
    applied: {
      approvalIds: selectedApprovals.map((approval) => approval.id),
      auditLogId,
      dryRun: false,
      externalExecution: false as const,
      importJobIds: jobs.map((job) => job.id),
      importJobsQueued: jobs.length,
      providerContacted: false as const,
      sampleSignalsQueued,
      summary: `${jobs.length} read-only signal import job${jobs.length === 1 ? "" : "s"} queued internally.`
    },
    plan: buildMemoryRevenueSignalConnectorApprovals(userId, options)
  };
}

function revenueSignalImportHandoffOptionsFrom(input: Partial<Record<"includeArchived" | "maxJobs" | "maxSignals" | "windowDays", unknown>>) {
  const numberValue = (key: "maxJobs" | "maxSignals" | "windowDays", fallback: number, max: number) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed)
      ? fallback
      : Math.min(Math.max(Math.floor(parsed), 1), max);
  };
  const includeArchivedInput = input.includeArchived;

  return {
    includeArchived: typeof includeArchivedInput === "boolean"
      ? includeArchivedInput
      : typeof includeArchivedInput === "string" && includeArchivedInput.toLowerCase() === "true",
    maxJobs: numberValue("maxJobs", 25, 100),
    maxSignals: numberValue("maxSignals", 100, 100),
    windowDays: numberValue("windowDays", 30, 365)
  };
}

function buildMemoryRevenueSignalImportHandoff(userId: string, options: ReturnType<typeof revenueSignalImportHandoffOptionsFrom>) {
  const importJobs = state.revenueSignalImportJobs
    .filter((job) => job.userId === userId)
    .filter((job) => options.includeArchived || job.status !== "archived")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, options.maxJobs);

  return buildRevenueSignalImportHandoffPlan({
    importJobs,
    options
  });
}

function revenueLaunchChecklistOptionsFrom(input: Partial<Record<keyof RevenueLaunchChecklistOptions, unknown>>) {
  const numberValue = (key: "maxItems" | "minPriorityScore" | "windowDays", fallback: number, max: number) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed)
      ? fallback
      : Math.min(Math.max(Math.floor(parsed), key === "minPriorityScore" ? 0 : 1), max);
  };
  const includeCompletedInput = input.includeCompleted;

  return {
    includeCompleted: typeof includeCompletedInput === "boolean"
      ? includeCompletedInput
      : typeof includeCompletedInput === "string"
        ? includeCompletedInput.toLowerCase() !== "false"
        : true,
    maxItems: numberValue("maxItems", 25, 100),
    minPriorityScore: numberValue("minPriorityScore", 0, 100),
    windowDays: numberValue("windowDays", 30, 365)
  };
}

function buildMemoryRevenueLaunchChecklist(userId: string, options: ReturnType<typeof revenueLaunchChecklistOptionsFrom>) {
  const opportunityPlan = buildMemoryRevenueOpportunityControl(userId, {
    includeKilled: options.includeCompleted,
    maxOpportunities: options.maxItems,
    windowDays: options.windowDays
  });
  const launchReadinessPlan = buildMemoryRevenueLaunchReadiness(userId, {
    includeApprovalHistory: true,
    maxStores: Math.min(options.maxItems, 50)
  });
  const signalApprovalPlan = buildMemoryRevenueSignalConnectorApprovals(userId, {
    ...revenueSignalConnectorApprovalOptionsFrom({
      includeArchived: options.includeCompleted,
      maxConnectors: 100,
      maxRecords: 100,
      windowDays: options.windowDays
    })
  });
  const signalImportHandoffPlan = buildMemoryRevenueSignalImportHandoff(userId, revenueSignalImportHandoffOptionsFrom({
    includeArchived: options.includeCompleted,
    maxJobs: 100,
    maxSignals: 100,
    windowDays: options.windowDays
  }));
  const commandResult = buildMemoryPortfolioCommandCenter(userId, {
    includeCommandHistory: 50,
    includeContent: true,
    includeFinance: true,
    maxActions: 100,
    windowDays: options.windowDays
  });

  return buildRevenueLaunchChecklistPlan({
    commandPlan: commandResult.plan,
    launchReadinessPlan,
    opportunityPlan,
    options,
    signalApprovalPlan,
    signalImportHandoffPlan
  });
}

function revenueLaunchChecklistActionBridgeOptionsFrom(input: Partial<Record<keyof RevenueLaunchChecklistActionBridgeOptions, unknown>>) {
  const numberValue = (key: "maxActions" | "maxItems" | "minPriorityScore" | "windowDays", fallback: number, max: number) => {
    const value = input[key];
    const parsed = Number(value);

    return value === undefined || value === null || Number.isNaN(parsed)
      ? fallback
      : Math.min(Math.max(Math.floor(parsed), key === "minPriorityScore" ? 0 : 1), max);
  };
  const includeCompletedInput = input.includeCompleted;

  return {
    includeCompleted: typeof includeCompletedInput === "boolean"
      ? includeCompletedInput
      : typeof includeCompletedInput === "string"
        ? includeCompletedInput.toLowerCase() !== "false"
        : true,
    maxActions: numberValue("maxActions", 5, 25),
    maxItems: numberValue("maxItems", 25, 100),
    minPriorityScore: numberValue("minPriorityScore", 0, 100),
    windowDays: numberValue("windowDays", 30, 365)
  };
}

function buildMemoryRevenueLaunchChecklistActionBridge(
  userId: string,
  options: ReturnType<typeof revenueLaunchChecklistActionBridgeOptionsFrom>
) {
  const checklistOptions = revenueLaunchChecklistOptionsFrom(options);
  const checklistPlan = buildMemoryRevenueLaunchChecklist(userId, checklistOptions);
  const signalApprovalPlan = buildMemoryRevenueSignalConnectorApprovals(userId, revenueSignalConnectorApprovalOptionsFrom({
    includeArchived: options.includeCompleted,
    maxConnectors: 100,
    maxRecords: 100,
    windowDays: options.windowDays
  }));
  const signalImportHandoffPlan = buildMemoryRevenueSignalImportHandoff(userId, revenueSignalImportHandoffOptionsFrom({
    includeArchived: options.includeCompleted,
    maxJobs: 100,
    maxSignals: 100,
    windowDays: options.windowDays
  }));
  const commandResult = buildMemoryPortfolioCommandCenter(userId, {
    includeCommandHistory: 50,
    includeContent: true,
    includeFinance: true,
    maxActions: 100,
    windowDays: options.windowDays
  });
  const bridgePlan = buildRevenueLaunchChecklistActionBridgePlan({
    checklistPlan,
    commandPlan: commandResult.plan,
    options,
    signalApprovalPlan,
    signalImportHandoffPlan
  });

  return {
    bridgePlan,
    checklistPlan,
    commandPlan: commandResult.plan,
    signalApprovalPlan,
    signalImportHandoffPlan
  };
}

function applyMemoryRevenueSignalImportHandoff(userId: string, body: Partial<Record<"includeArchived" | "maxJobs" | "maxSignals" | "windowDays", unknown>> & {
  dryRun?: boolean;
  importJobIds?: string[];
  note?: string;
}) {
  const options = revenueSignalImportHandoffOptionsFrom(body);
  const plan = buildMemoryRevenueSignalImportHandoff(userId, options);
  const selectedJobs = selectRevenueSignalImportJobsForHandoff(plan, Array.isArray(body.importJobIds) ? body.importJobIds : []);
  const stagedPayload = mergeRevenueSignalImportJobPayloads(selectedJobs, options.maxSignals);
  const signalPlan = buildMemorySignalIntake(userId, {
    includeSamplePayloads: false,
    maxSignals: options.maxSignals,
    windowDays: options.windowDays
  }, stagedPayload);
  const commerceError = validateMemoryPerformanceSnapshots(userId, stagedPayload.commerceSignals ?? []);

  if (commerceError) {
    return {
      errorCode: 404,
      errorMessage: commerceError
    };
  }

  const contentError = validateMemoryContentSignals(userId, stagedPayload.contentSignals ?? []);

  if (contentError) {
    return {
      errorCode: 404,
      errorMessage: contentError
    };
  }

  if (body.dryRun) {
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

  const applied = applyMemorySignalIntake(userId, signalPlan);
  const auditLogId = id("audit");
  const completedAt = now();
  state.auditLogs.unshift({
    action: "revenue.signal_import_handoff.completed",
    createdAt: completedAt,
    entry: {
      blockedExternalActions: plan.blockedExternalActions,
      contentSnapshotsCreated: applied.contentSnapshotsCreated,
      dryRun: false,
      externalExecution: false,
      importJobIds: selectedJobs.map((job) => job.id),
      note: body.note ?? null,
      paymentReconciliationReportId: applied.paymentReconciliationReportId,
      paymentSignalsRecorded: signalPlan.totals.paymentSignals,
      providerContacted: false,
      requiredConfirmation: revenueSignalImportHandoffConfirmation,
      revenueSnapshotsCreated: applied.revenueSnapshotsCreated,
      signalIntakeAuditLogId: applied.auditLogId,
      summary: signalPlan.summary,
      totals: signalPlan.totals
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: signalPlan.totals.paymentSignals > 0 || selectedJobs.some((job) => job.provider === "stripe") ? "medium" : "low",
    targetId: selectedJobs[0]?.id ?? null,
    targetType: "revenue_signal_import_handoff"
  });

  for (const selectedJob of selectedJobs) {
    const storedJob = state.revenueSignalImportJobs.find((job) => job.userId === userId && job.id === selectedJob.id);

    if (storedJob) {
      storedJob.completedAt = completedAt;
      storedJob.handoffAuditLogId = auditLogId;
      storedJob.intakeResult = {
        ...applied,
        paymentSignalsRecorded: signalPlan.totals.paymentSignals,
        sampleSignalsIngested: signalPlan.totals.signals,
        signalIntakeAuditLogId: applied.auditLogId
      };
      storedJob.status = "completed";
      storedJob.updatedAt = completedAt;
    }
  }

  return {
    handoff: {
      auditLogId,
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
    plan: buildMemoryRevenueSignalImportHandoff(userId, options),
    signalIntakePlan: signalPlan
  };
}

function memoryBridgePayloadString(action: RevenueLaunchChecklistActionBridgeItem, key: string) {
  const value = action.payload[key];

  return typeof value === "string" ? value : null;
}

function memoryBridgePayloadStringArray(action: RevenueLaunchChecklistActionBridgeItem, key: string) {
  const value = action.payload[key];

  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function previewMemoryLaunchPipelineApply(plan: RevenueLaunchPipelinePlan) {
  return {
    approvalPackets: plan.storePlans
      .filter((storePlan) => storePlan.action === "queue_launch_approval" || storePlan.action === "prepare_launch_package")
      .map((storePlan) => ({
        id: null,
        storeId: storePlan.storeId
      })),
    auditLogId: null,
    createdProducts: plan.storePlans
      .filter((storePlan) => storePlan.action === "seed_products")
      .reduce((sum, storePlan) => sum + storePlan.missingProducts, 0),
    dryRun: true,
    externalExecution: false as const,
    storeUpdates: plan.storePlans
      .filter((storePlan) => storePlan.action !== "hold")
      .map((storePlan) => ({
        action: storePlan.action,
        storeId: storePlan.storeId,
        storeName: storePlan.storeName
      }))
  };
}

function applyMemoryLaunchPipelineBridge(userId: string, plan: RevenueLaunchPipelinePlan, stores: ClientMerchStore[]) {
  const createdProducts: Array<{ id: string; productName: string; storeId: string }> = [];
  const approvalPackets: Array<{ auditLogId: string | null; id: string; storeId: string }> = [];
  const storeUpdates: Array<{ approvalStatus?: string; launchStatus?: string; storeId: string; storeName: string }> = [];

  for (const storePlan of plan.storePlans) {
    const store = stores.find((item) => item.id === storePlan.storeId);

    if (!store) continue;

    if (storePlan.action === "seed_products") {
      const generated = generateProductBatch(store, storePlan.batchInput);
      const products = generated.map((product) => normalizePodProductBody(product as Partial<PodProduct>));
      state.podProducts.unshift(...products);
      createdProducts.push(...products.map((product) => ({
        id: product.id,
        productName: product.productName,
        storeId: product.storeId
      })));

      const index = state.merchStores.findIndex((item) => item.id === store.id && item.userId === userId);

      if (index !== -1) {
        state.merchStores[index] = normalizeMerchStoreBody({
          approvalStatus: "Designs Pending",
          designCount: state.merchStores[index].designCount + products.length,
          launchStatus: "Designing"
        }, userId, state.merchStores[index]);
      }

      storeUpdates.push({
        approvalStatus: "Designs Pending",
        launchStatus: "Designing",
        storeId: store.id,
        storeName: store.businessName
      });
    }

    if (storePlan.action === "queue_launch_approval" || storePlan.action === "prepare_launch_package") {
      const products = state.podProducts.filter((product) => product.storeId === store.id);
      const packet = buildGrowthApprovalPacket({
        note: `Revenue Launch Checklist Action Bridge: ${storePlan.reason}`,
        products,
        store,
        storeId: store.id
      });
      const auditLogId = id("audit");
      const record: GrowthApprovalPacketRecord = {
        createdAt: now(),
        id: id("growth_packet"),
        mode: packet.mode,
        packet,
        requestAuditLogId: auditLogId,
        scheduledFor: packet.scheduledFor,
        status: "pending",
        storeId: store.id,
        updatedAt: now(),
        userId
      };
      state.growthApprovalPackets.unshift(record);
      state.auditLogs.unshift({
        action: "revenue.launch_approval.queued",
        createdAt: now(),
        entry: {
          externalExecution: false,
          packet,
          packetId: record.id,
          source: "revenue_launch_checklist_action_bridge",
          storePlan
        },
        entryHash: id("hash"),
        id: auditLogId,
        outcome: "success",
        severity: "medium",
        targetId: store.id,
        targetType: "revenue_launch_pipeline"
      });

      const index = state.merchStores.findIndex((item) => item.id === store.id && item.userId === userId);

      if (index !== -1) {
        state.merchStores[index] = normalizeMerchStoreBody({ launchStatus: "Awaiting Approval" }, userId, state.merchStores[index]);
      }

      approvalPackets.push({
        auditLogId,
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

  state.auditLogs.unshift({
    action: "revenue.launch_checklist_action_bridge.launch_pipeline_applied",
    createdAt: now(),
    entry: {
      approvalPackets,
      createdProducts,
      dryRun: false,
      externalExecution: false,
      options: plan.options,
      providerContacted: false,
      storeUpdates,
      summary: plan.summary
    },
    entryHash: id("hash"),
    id: id("audit"),
    outcome: "success",
    severity: createdProducts.length + approvalPackets.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_launch_checklist_action_bridge"
  });

  return {
    approvalPackets,
    auditLogId: state.auditLogs[0]?.id ?? null,
    createdProducts,
    dryRun: false,
    externalExecution: false as const,
    storeUpdates
  };
}

function memoryListingUpdatesFrom(plan: RevenueListingOptimizationPlan) {
  return plan.experiments.map((experiment) => ({
    fromStatus: experiment.currentListing.title ? "Existing listing draft" : "Missing listing copy",
    productId: experiment.productId,
    productName: experiment.productName,
    recommendedVariantId: experiment.recommendedVariant.id,
    storeId: experiment.storeId,
    toStatus: experiment.recommendedInternalStatus
  }));
}

function applyMemoryListingOptimizationBridge(userId: string, plan: RevenueListingOptimizationPlan, dryRun: boolean) {
  const productUpdates = memoryListingUpdatesFrom(plan);

  if (!dryRun) {
    const ownedStoreIds = new Set(state.merchStores.filter((store) => store.userId === userId).map((store) => store.id));

    for (const experiment of plan.experiments) {
      const index = state.podProducts.findIndex((product) => product.id === experiment.productId && ownedStoreIds.has(product.storeId));

      if (index !== -1) {
        const variant = experiment.recommendedVariant;
        state.podProducts[index] = normalizePodProductBody({
          estimatedPlatformFees: variant.estimatedPlatformFees,
          estimatedProfit: variant.estimatedProfit,
          listingDescription: variant.description,
          listingTitle: variant.title,
          mockupNotes: variant.mockupNotes,
          profitMargin: variant.profitMargin,
          retailPrice: variant.retailPrice,
          status: experiment.recommendedInternalStatus as PodProduct["status"],
          tags: variant.tags
        }, state.podProducts[index]);
      }
    }

    state.auditLogs.unshift({
      action: "revenue.launch_checklist_action_bridge.listing_optimization_applied",
      createdAt: now(),
      entry: {
        dryRun: false,
        externalExecution: false,
        options: plan.options,
        productUpdates,
        providerContacted: false,
        summary: plan.summary
      },
      entryHash: id("hash"),
      id: id("audit"),
      outcome: "success",
      severity: productUpdates.length > 0 ? "medium" : "low",
      targetId: null,
      targetType: "revenue_launch_checklist_action_bridge"
    });
  }

  return {
    auditLogId: dryRun ? null : state.auditLogs[0]?.id ?? null,
    dryRun,
    externalExecution: false as const,
    productUpdates
  };
}

function memoryStoreSetupUpdatesFrom(plan: RevenueStoreSetupPlan, userId: string) {
  return plan.runbooks
    .filter((runbook) => runbook.action !== "hold")
    .map((runbook) => ({
      action: runbook.action,
      fromStatus: state.merchStores.find((store) => store.id === runbook.storeId && store.userId === userId)?.launchStatus ?? "Unknown",
      readinessScore: runbook.readinessScore,
      storeId: runbook.storeId,
      storeName: runbook.storeName,
      toStatus: runbook.recommendedLaunchStatus
    }));
}

function applyMemoryStoreSetupBridge(userId: string, plan: RevenueStoreSetupPlan, dryRun: boolean) {
  const storeUpdates = memoryStoreSetupUpdatesFrom(plan, userId);

  if (!dryRun) {
    for (const update of storeUpdates) {
      const index = state.merchStores.findIndex((store) => store.id === update.storeId && store.userId === userId);

      if (index !== -1) {
        state.merchStores[index] = normalizeMerchStoreBody({
          launchStatus: update.toStatus as ClientMerchStore["launchStatus"]
        }, userId, state.merchStores[index]);
      }
    }

    state.auditLogs.unshift({
      action: "revenue.launch_checklist_action_bridge.store_setup_applied",
      createdAt: now(),
      entry: {
        dryRun: false,
        externalExecution: false,
        options: plan.options,
        providerContacted: false,
        storeUpdates,
        summary: plan.summary
      },
      entryHash: id("hash"),
      id: id("audit"),
      outcome: "success",
      severity: storeUpdates.length > 0 ? "medium" : "low",
      targetId: null,
      targetType: "revenue_launch_checklist_action_bridge"
    });
  }

  return {
    auditLogId: dryRun ? null : state.auditLogs[0]?.id ?? null,
    dryRun,
    externalExecution: false as const,
    storeUpdates
  };
}

function filterMemoryPortfolioCommandPlan(plan: PortfolioCommandCenterPlan, commandHashes: string[]): PortfolioCommandCenterPlan {
  const selectedHashes = new Set(commandHashes);

  return {
    ...plan,
    commandActions: plan.commandActions.filter((command) => selectedHashes.has(command.commandHash))
  };
}

function dispatchMemoryLaunchChecklistBridgeAction(
  userId: string,
  action: RevenueLaunchChecklistActionBridgeItem,
  dryRun: boolean,
  note: string | undefined,
  options: ReturnType<typeof revenueLaunchChecklistActionBridgeOptionsFrom>
) {
  if (action.dispatchKind === "launch_pipeline") {
    const storeId = memoryBridgePayloadString(action, "storeId");
    const launchAction = memoryBridgePayloadString(action, "launchAction") as RevenueLaunchAction | null;
    const { plan, stores } = buildMemoryRevenueLaunchPipeline(userId, {
      maxStores: 25
    });
    const filteredPlan: RevenueLaunchPipelinePlan = {
      ...plan,
      queue: plan.queue.filter((queueItem) => queueItem.storeId === storeId && queueItem.action === launchAction),
      storePlans: plan.storePlans.filter((storePlan) => storePlan.storeId === storeId && storePlan.action === launchAction)
    };
    const filteredStores = stores.filter((store) => store.id === storeId);
    const applied = dryRun
      ? previewMemoryLaunchPipelineApply(filteredPlan)
      : applyMemoryLaunchPipelineBridge(userId, filteredPlan, filteredStores);

    return {
      ...applied,
      planSummary: filteredPlan.summary
    };
  }

  if (action.dispatchKind === "listing_optimization") {
    const storeId = memoryBridgePayloadString(action, "storeId");
    const { plan } = buildMemoryRevenueListingOptimization(userId, {
      windowDays: options.windowDays
    });
    const filteredPlan: RevenueListingOptimizationPlan = {
      ...plan,
      experiments: plan.experiments.filter((experiment) => experiment.storeId === storeId)
    };

    return {
      ...applyMemoryListingOptimizationBridge(userId, filteredPlan, dryRun),
      planSummary: filteredPlan.summary
    };
  }

  if (action.dispatchKind === "store_setup") {
    const storeId = memoryBridgePayloadString(action, "storeId");
    const { plan } = buildMemoryRevenueStoreSetup(userId, {
      maxStores: 50
    });
    const filteredPlan: RevenueStoreSetupPlan = {
      ...plan,
      queue: plan.queue.filter((queueItem) => queueItem.storeId === storeId),
      runbooks: plan.runbooks.filter((runbook) => runbook.storeId === storeId)
    };

    return {
      ...applyMemoryStoreSetupBridge(userId, filteredPlan, dryRun),
      planSummary: filteredPlan.summary
    };
  }

  if (action.dispatchKind === "signal_connector_approval") {
    return applyMemoryRevenueSignalConnectorApprovals(userId, {
      dryRun,
      manifestIds: memoryBridgePayloadStringArray(action, "manifestIds"),
      maxConnectors: 100,
      maxRecords: 100,
      note,
      windowDays: options.windowDays
    });
  }

  if (action.dispatchKind === "signal_import_job") {
    return applyMemoryRevenueSignalImportJobs(userId, {
      approvalIds: memoryBridgePayloadStringArray(action, "approvalIds"),
      dryRun,
      includeArchived: options.includeCompleted,
      maxConnectors: 100,
      maxRecords: 100,
      note,
      windowDays: options.windowDays
    });
  }

  if (action.dispatchKind === "signal_import_handoff") {
    return applyMemoryRevenueSignalImportHandoff(userId, {
      dryRun,
      importJobIds: memoryBridgePayloadStringArray(action, "importJobIds"),
      includeArchived: options.includeCompleted,
      maxJobs: 100,
      maxSignals: 100,
      note,
      windowDays: options.windowDays
    });
  }

  if (action.dispatchKind === "portfolio_command") {
    const { assetPortfolio, plan } = buildMemoryPortfolioCommandCenter(userId, {
      includeCommandHistory: 50,
      includeContent: true,
      includeFinance: true,
      maxActions: 100,
      windowDays: options.windowDays
    });
    const filteredPlan = filterMemoryPortfolioCommandPlan(plan, memoryBridgePayloadStringArray(action, "commandHashes"));

    if (dryRun) {
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
        externalExecution: false as const,
        providerContacted: false as const
      };
    }

    return {
      ...applyMemoryPortfolioCommandCenter(userId, filteredPlan, assetPortfolio),
      dryRun: false,
      externalExecution: false as const
    };
  }

  return {
    reason: action.blockedReason ?? "Action requires direct review.",
    skipped: true
  };
}

function applyMemoryRevenueLaunchChecklistActionBridge(userId: string, body: Partial<Record<keyof RevenueLaunchChecklistActionBridgeOptions, unknown>> & {
  actionIds?: string[];
  dryRun?: boolean;
  note?: string;
}) {
  const dryRun = body.dryRun !== false;
  const options = revenueLaunchChecklistActionBridgeOptionsFrom(body);
  const context = buildMemoryRevenueLaunchChecklistActionBridge(userId, options);
  const selectedActions = selectRevenueLaunchChecklistBridgeActions(
    context.bridgePlan,
    Array.isArray(body.actionIds) ? body.actionIds : []
  );
  const totals = {
    actionsBlocked: 0,
    actionsDispatched: 0,
    actionsPreviewed: 0,
    actionsSelected: selectedActions.length,
    actionsSkipped: 0,
    externalExecution: false as const,
    providerContacted: false as const
  };
  const results: Array<Record<string, unknown>> = [];

  for (const action of selectedActions) {
    if (action.status !== "ready") {
      totals.actionsBlocked += 1;
      results.push({
        actionId: action.actionId,
        dispatchKind: action.dispatchKind,
        externalExecution: false,
        providerContacted: false,
        result: {
          reason: action.blockedReason ?? "Action is not ready for dispatch."
        },
        status: action.status === "watch" ? "skipped" : "blocked"
      });
      continue;
    }

    const result = dispatchMemoryLaunchChecklistBridgeAction(userId, action, dryRun, body.note, options);
    const skipped = typeof result === "object" && result !== null && "skipped" in result && result.skipped === true;

    if (skipped) {
      totals.actionsSkipped += 1;
    } else if (dryRun) {
      totals.actionsPreviewed += 1;
    } else {
      totals.actionsDispatched += 1;
    }

    results.push({
      actionId: action.actionId,
      dispatchKind: action.dispatchKind,
      externalExecution: false,
      providerContacted: false,
      result,
      status: skipped ? "skipped" : dryRun ? "previewed" : "dispatched"
    });
  }

  const refreshed = dryRun ? null : buildMemoryRevenueLaunchChecklistActionBridge(userId, options);

  return {
    bridge: refreshed?.bridgePlan ?? context.bridgePlan,
    checklist: refreshed?.checklistPlan ?? null,
    dispatched: {
      ...totals,
      dryRun,
      results,
      summary: dryRun
        ? `${totals.actionsPreviewed} checklist bridge action${totals.actionsPreviewed === 1 ? "" : "s"} previewed.`
        : `${totals.actionsDispatched} checklist bridge action${totals.actionsDispatched === 1 ? "" : "s"} dispatched internally.`
    }
  };
}

function revenueLaunchSprintOptionsFrom(input: Partial<Record<keyof RevenueLaunchSprintOptions, unknown>>) {
  const bridgeOptions = revenueLaunchChecklistActionBridgeOptionsFrom(input);
  const maxCyclesInput = input.maxCycles;
  const parsedMaxCycles = Number(maxCyclesInput);

  return {
    ...bridgeOptions,
    maxCycles: maxCyclesInput === undefined || maxCyclesInput === null || Number.isNaN(parsedMaxCycles)
      ? 4
      : Math.min(Math.max(Math.floor(parsedMaxCycles), 1), 8)
  };
}

function memoryRevenueLaunchSprintFactorySummary(response: ReturnType<typeof executeMemoryRevenueOpportunityFactory> | null): RevenueLaunchSprintFactorySummary | null {
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

function numericMemoryBridgeResult(result: unknown, key: string) {
  if (!result || typeof result !== "object") return 0;

  const value = (result as Record<string, unknown>)[key];

  return typeof value === "number" ? value : 0;
}

function memoryBridgeResultArrayLength(result: unknown, key: string) {
  if (!result || typeof result !== "object") return 0;

  const value = (result as Record<string, unknown>)[key];

  return Array.isArray(value) ? value.length : 0;
}

function sumMemoryBridgeResultNumber(response: ReturnType<typeof applyMemoryRevenueLaunchChecklistActionBridge>, key: string) {
  return response.dispatched.results.reduce((sum, item) => sum + numericMemoryBridgeResult(item.result, key), 0);
}

function sumMemoryBridgeResultArrayLength(response: ReturnType<typeof applyMemoryRevenueLaunchChecklistActionBridge>, key: string) {
  return response.dispatched.results.reduce((sum, item) => sum + memoryBridgeResultArrayLength(item.result, key), 0);
}

function memoryRevenueLaunchSprintDispatchSummary(response: ReturnType<typeof applyMemoryRevenueLaunchChecklistActionBridge>) {
  const productUpdates = sumMemoryBridgeResultArrayLength(response, "productUpdates");
  const storeUpdates = sumMemoryBridgeResultArrayLength(response, "storeUpdates");

  return {
    actionsBlocked: response.dispatched.actionsBlocked,
    actionsDispatched: response.dispatched.actionsDispatched,
    actionsPreviewed: response.dispatched.actionsPreviewed,
    actionsSelected: response.dispatched.actionsSelected,
    actionsSkipped: response.dispatched.actionsSkipped,
    assetControlActionsSkipped: sumMemoryBridgeResultNumber(response, "assetControlActionsSkipped"),
    assetControlRecordsCreated: sumMemoryBridgeResultNumber(response, "assetControlRecordsCreated"),
    commandRecordsCreated: sumMemoryBridgeResultNumber(response, "commandRecordsCreated"),
    dryRun: response.dispatched.dryRun,
    externalExecution: false as const,
    internalStatusUpdates: productUpdates + storeUpdates,
    providerContacted: false as const,
    summary: response.dispatched.summary
  };
}

function applyMemoryRevenueLaunchSprint(userId: string, body: Partial<Record<keyof RevenueLaunchSprintOptions, unknown>> & {
  audience?: string;
  brandStyle?: string;
  businessName?: string;
  clientName?: string;
  contactName?: string;
  dryRun?: boolean;
  email?: string;
  idea?: string;
  industry?: string;
  note?: string;
  podProvider?: string;
  priceRange?: { max?: number; min?: number };
  productCount?: number;
  productTypes?: string[];
  riskTolerance?: string;
  sourceKey?: string;
  storePlatform?: string;
}) {
  const dryRun = body.dryRun !== false;
  const options = revenueLaunchSprintOptionsFrom(body);
  const factoryResponse = typeof body.idea === "string" && body.idea.trim().length >= 10
    ? executeMemoryRevenueOpportunityFactory(userId, {
      ...body,
      confirm: "CREATE INTERNAL REVENUE OPPORTUNITY",
      dryRun
    })
    : null;
  let context = buildMemoryRevenueLaunchChecklistActionBridge(userId, options);
  const cycles: RevenueLaunchSprintCycle[] = [];

  for (let index = 0; index < options.maxCycles; index += 1) {
    const selectedActions = selectRevenueLaunchSprintBridgeActions(context.bridgePlan);

    if (selectedActions.length === 0) {
      break;
    }

    const response = applyMemoryRevenueLaunchChecklistActionBridge(userId, {
      ...options,
      actionIds: selectedActions.map((action) => action.actionId),
      dryRun,
      note: body.note
    });

    cycles.push(buildRevenueLaunchSprintCycle({
      bridgePlan: context.bridgePlan,
      cycle: index + 1,
      dispatched: memoryRevenueLaunchSprintDispatchSummary(response),
      selectedActions
    }));

    if (dryRun) {
      break;
    }

    context = buildMemoryRevenueLaunchChecklistActionBridge(userId, options);
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
      dryRun,
      factory: memoryRevenueLaunchSprintFactorySummary(factoryResponse),
      options
    })
  };
}

function validateMemoryContentSignals(userId: string, signals: NonNullable<SignalIntakeInput["contentSignals"]>) {
  const storeIds = new Set(state.merchStores.filter((store) => store.userId === userId).map((store) => store.id));
  const productsById = new Map(state.podProducts
    .filter((product) => storeIds.has(product.storeId))
    .map((product) => [product.id, product]));
  const briefsById = new Map(state.facelessContentBriefs
    .filter((brief) => brief.userId === userId)
    .map((brief) => [brief.id, brief]));

  for (const signal of signals) {
    if (signal.storeId && !storeIds.has(signal.storeId)) {
      return "One or more content signals target a merch store that was not found.";
    }

    if (signal.productId) {
      const product = productsById.get(signal.productId);

      if (!product || (signal.storeId && product.storeId !== signal.storeId)) {
        return "One or more content signals target a product outside the selected store.";
      }
    }

    if (signal.contentBriefId) {
      const brief = briefsById.get(signal.contentBriefId);

      if (!brief || (signal.storeId && brief.storeId !== signal.storeId) || (signal.productId && brief.productId !== signal.productId)) {
        return "One or more content signals target a content brief outside the selected store or product.";
      }
    }
  }

  return null;
}

function applyMemorySignalIntake(userId: string, plan: SignalIntakePlan) {
  const createdAt = now();
  const revenueSnapshots = plan.normalized.commerceSnapshots.map((snapshot) => ({
    ...snapshot,
    createdAt,
    id: id("performance"),
    userId
  }));
  const contentSnapshots: FacelessContentPerformanceSnapshotRecord[] = plan.normalized.contentSnapshots.map((snapshot) => ({
    ...snapshot,
    createdAt,
    id: id("content_perf"),
    updatedAt: createdAt,
    userId
  }));
  let paymentReconciliationReportId: string | null = null;

  state.revenuePerformanceSnapshots.unshift(...revenueSnapshots);
  state.facelessContentPerformanceSnapshots.unshift(...contentSnapshots);
  rollupMemoryPerformanceStores(userId, revenueSnapshots.map((snapshot) => snapshot.storeId));

  if (plan.normalized.paymentReconciliationDrafts.length > 0) {
    paymentReconciliationReportId = id("fin_recon");
    state.financialReconciliationReports.unshift({
      approvedAmount: plan.normalized.paymentReconciliationDrafts.reduce((sum, draft) => sum + draft.paidOut, 0),
      auditLogId: null,
      createdAt,
      externalExecution: false,
      id: paymentReconciliationReportId,
      pendingAmount: plan.normalized.paymentReconciliationDrafts.reduce((sum, draft) => sum + draft.pendingBalance, 0),
      rejectedAmount: 0,
      report: {
        auditEvents: plan.auditEvents,
        blockedExternalActions: plan.blockedExternalActions,
        paymentReconciliationDrafts: plan.normalized.paymentReconciliationDrafts,
        providerContacted: false,
        summary: plan.summary
      },
      source: "signal_intake",
      status: "record_only",
      totalAmount: plan.normalized.paymentReconciliationDrafts.reduce((sum, draft) => sum + draft.availableBalance + draft.pendingBalance, 0),
      updatedAt: createdAt,
      userId,
      variance: plan.normalized.paymentReconciliationDrafts.reduce((sum, draft) => sum + draft.netBalanceDelta, 0)
    });
  }

  const auditLogId = id("audit");
  state.auditLogs.unshift({
    action: "revenue.signal_intake.ingested",
    createdAt,
    entry: {
      contentSnapshotIds: contentSnapshots.map((snapshot) => snapshot.id),
      dryRun: false,
      externalExecution: false,
      paymentReconciliationReportId,
      providerContacted: false,
      revenueSnapshotIds: revenueSnapshots.map((snapshot) => snapshot.id),
      summary: plan.summary,
      totals: plan.totals
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: plan.totals.signals > 25 || plan.totals.projectedAvailableBalance > 0 ? "medium" : "low",
    targetId: paymentReconciliationReportId,
    targetType: "signal_intake"
  });

  if (paymentReconciliationReportId) {
    state.financialReconciliationReports = state.financialReconciliationReports.map((report) => report.id === paymentReconciliationReportId
      ? { ...report, auditLogId }
      : report);
  }

  return {
    auditLogId,
    contentSnapshotsCreated: contentSnapshots.length,
    paymentReconciliationReportId,
    revenueSnapshotsCreated: revenueSnapshots.length
  };
}

function portfolioCommandOptionsFrom(input: Partial<Record<keyof PortfolioCommandCenterOptions, unknown>>): Partial<PortfolioCommandCenterOptions> {
  const numberValue = (key: keyof PortfolioCommandCenterOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };
  const boolValue = (key: keyof PortfolioCommandCenterOptions) => {
    const value = input[key];
    return value === undefined ? undefined : !(value === false || value === "false");
  };

  return {
    includeCommandHistory: numberValue("includeCommandHistory"),
    includeContent: boolValue("includeContent"),
    includeFinance: boolValue("includeFinance"),
    maxActions: numberValue("maxActions"),
    windowDays: numberValue("windowDays")
  };
}

function memoryPortfolioCommandSnapshot(record: PortfolioCommandActionRecord): PortfolioCommandRecordSnapshot {
  return {
    action: record.action,
    auditLogId: record.auditLogId ?? null,
    commandHash: record.commandHash,
    control: record.control,
    createdAt: record.createdAt,
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
    updatedAt: record.updatedAt
  };
}

function buildMemoryPortfolioCommandCenter(userId: string, options: Partial<PortfolioCommandCenterOptions>) {
  const includeFinance = options.includeFinance !== false;
  const includeContent = options.includeContent !== false;
  const revenuePlan = buildMemoryRevenueEnginePlan(userId, {});
  const { digest: performanceDigest } = buildMemoryRevenuePerformanceDigest(userId, {
    windowDays: options.windowDays
  });
  const assetPortfolio = mergeRevenueAssetPortfolioPerformance(buildRevenueAssetPortfolio(revenuePlan), performanceDigest);
  const financialPlan = includeFinance ? buildMemoryFinancialReleaseGovernance(userId).plan : undefined;
  const financialScalingBudgetPlan = includeFinance ? buildMemoryFinancialScalingBudgetReview(userId).plan : undefined;
  const financialScalingExecutionPlan = includeFinance ? buildMemoryFinancialScalingExecutionLedger(userId).plan : undefined;
  const contentPlan = includeContent ? buildMemoryFacelessContentPipeline(userId, {
    windowDays: options.windowDays
  }).plan : undefined;
  const persistedCommands = state.portfolioCommandActions
    .filter((record) => record.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, options.includeCommandHistory ?? 20)
    .map(memoryPortfolioCommandSnapshot);

  return {
    assetPortfolio,
    plan: buildPortfolioCommandCenterPlan({
      assetPortfolio,
      contentPlan,
      financialPlan,
      financialScalingBudgetPlan,
      financialScalingExecutionPlan,
      options,
      performanceDigest,
      persistedCommands,
      revenuePlan
    })
  };
}

function buildMemoryRevenuePortfolioDashboard(userId: string) {
  const { assetPortfolio, plan: commandPlan } = buildMemoryPortfolioCommandCenter(userId, {
    includeCommandHistory: 50,
    includeContent: true,
    includeFinance: true,
    maxActions: 50,
    windowDays: 30
  });
  const controlLedger = buildRevenueAssetControlLedgerPlan({
    records: state.revenueAssetControlRecords
      .filter((record) => record.userId === userId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 250)
  });
  const reviewQueue = buildRevenueAssetReviewQueuePlan({
    controlLedger,
    options: {
      includeWatch: false,
      maxItems: 25,
      staleAfterDays: 14
    },
    portfolio: assetPortfolio
  });

  return buildRevenuePortfolioDashboardPlan({
    commandPlan,
    controlLedger,
    portfolio: assetPortfolio,
    reviewQueue
  });
}

const memoryProductStatuses: Array<PodProduct["status"]> = [
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
];

const memoryLaunchStatuses: Array<ClientMerchStore["launchStatus"]> = [
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
];

function memoryProductStatus(status: string | null): PodProduct["status"] | null {
  return memoryProductStatuses.includes(status as PodProduct["status"]) ? status as PodProduct["status"] : null;
}

function memoryLaunchStatus(status: string | null): ClientMerchStore["launchStatus"] | null {
  return memoryLaunchStatuses.includes(status as ClientMerchStore["launchStatus"]) ? status as ClientMerchStore["launchStatus"] : null;
}

function memoryCommandStatus(command: PortfolioCommandItem): PortfolioCommandRecordStatus {
  if (command.targetType === "product" && memoryProductStatus(command.recommendedStatus)) return "applied";
  if (command.targetType === "store" && memoryLaunchStatus(command.recommendedStatus)) return "applied";
  return "queued";
}

function applyMemoryPortfolioCommandCenter(userId: string, plan: ReturnType<typeof buildPortfolioCommandCenterPlan>, assetPortfolio = buildMemoryRevenueAssetPortfolio(userId, {})) {
  const createdAt = now();
  const auditLogId = id("audit");
  const userStoreIds = new Set(state.merchStores.filter((store) => store.userId === userId).map((store) => store.id));
  const assetControlBatch = buildRevenueAssetControlsFromPortfolioCommands({
    plan,
    portfolio: assetPortfolio
  });
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

  for (const command of plan.commandActions) {
    let status = memoryCommandStatus(command);

    if (command.targetType === "product") {
      const nextStatus = memoryProductStatus(command.recommendedStatus);
      const index = state.podProducts.findIndex((product) => product.id === command.targetId && userStoreIds.has(product.storeId));

      if (nextStatus && index >= 0) {
        const current = state.podProducts[index];
        state.podProducts[index] = normalizePodProductBody({ status: nextStatus }, current);
        productUpdates.push({
          action: command.action,
          fromStatus: current.status,
          productId: current.id,
          productName: current.productName,
          toStatus: nextStatus
        });
      } else if (nextStatus) {
        status = "skipped";
      }
    }

    if (command.targetType === "store") {
      const nextStatus = memoryLaunchStatus(command.recommendedStatus);
      const index = state.merchStores.findIndex((store) => store.id === command.targetId && store.userId === userId);

      if (nextStatus && index >= 0) {
        const current = state.merchStores[index];
        state.merchStores[index] = normalizeMerchStoreBody({ launchStatus: nextStatus }, userId, current);
        storeUpdates.push({
          action: command.action,
          fromStatus: current.launchStatus,
          storeId: current.id,
          storeName: current.businessName,
          toStatus: nextStatus
        });
      } else if (nextStatus) {
        status = "skipped";
      }
    }

    state.portfolioCommandActions.unshift({
      action: command.action,
      auditLogId,
      commandHash: command.commandHash,
      control: {
        approvalGate: command.approvalGate,
        blockedExternalActions: command.blockedExternalActions,
        expectedInternalEffect: command.expectedInternalEffect,
        externalExecution: false,
        providerContacted: false,
        sourceModule: command.sourceModule
      },
      createdAt,
      externalExecution: false,
      id: id("portfolio_cmd"),
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
      updatedAt: createdAt,
      userId
    });
  }

  state.auditLogs.unshift({
    action: "portfolio.command_center.applied",
    createdAt,
    entry: {
      blockedExternalActions: plan.blockedExternalActions,
      commandActions: plan.commandActions.length,
      externalExecution: false,
      providerContacted: false,
      riskLanes: plan.riskLanes,
      summary: plan.summary,
      totals: plan.totals
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: plan.commandActions.some((command) => command.riskLevel === "high") ? "high" : plan.commandActions.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "portfolio_command_center"
  });

  return {
    auditLogId,
      assetControlActionsSkipped: assetControlBatch.skipped.length,
      assetControlAuditLogId: assetControlBatch.controls.length > 0 || assetControlBatch.skipped.length > 0 ? auditLogId : null,
      assetControlBatchReview: assetControlBatch.controlReview,
      assetControlRecordsCreated: assetControlBatch.controls.length,
    commandRecordsCreated: plan.commandActions.length,
    contentCommands: plan.commandActions.filter((command) => command.targetType === "content").length,
    financeCommands: plan.commandActions.filter((command) => command.targetType === "finance").length,
    productUpdates,
    providerContacted: false as const,
    storeUpdates
  };
}

function revenueAutopilotOptionsFrom(input: Partial<Record<keyof RevenueAutopilotOptions, unknown>>): Partial<RevenueAutopilotOptions> {
  const numberValue = (key: keyof RevenueAutopilotOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };
  const boolValue = (key: keyof RevenueAutopilotOptions) => {
    const value = input[key];
    return value === undefined ? undefined : !(value === false || value === "false");
  };
  const mode = input.mode;

  return {
    includeContent: boolValue("includeContent"),
    includeFinance: boolValue("includeFinance"),
    includeSignalIntake: boolValue("includeSignalIntake"),
    maxActions: numberValue("maxActions"),
    mode: mode === "conservative" || mode === "velocity" ? mode : undefined,
    windowDays: numberValue("windowDays")
  };
}

function buildMemoryRevenueAutopilotContext(userId: string, options: Partial<RevenueAutopilotOptions>) {
  const includeContent = options.includeContent !== false;
  const includeFinance = options.includeFinance !== false;
  const includeSignalIntake = options.includeSignalIntake !== false;
  const revenuePlan = buildMemoryRevenueEnginePlan(userId, {});
  const assetPortfolio = buildMemoryRevenueAssetPortfolio(userId, {});
  const launchResult = buildMemoryRevenueLaunchPipeline(userId, {});
  const launchPlan = launchResult.plan;
  const digitalPlan = buildMemoryDigitalProductPortfolio(userId, {}).plan;
  const listingPlan = buildMemoryRevenueListingOptimization(userId, {
    windowDays: options.windowDays
  }).plan;
  const storeSetupPlan = buildMemoryRevenueStoreSetup(userId, {}).plan;
  const contentPlan = includeContent ? buildMemoryFacelessContentPipeline(userId, {
    windowDays: options.windowDays
  }).plan : undefined;
  const financialPlan = includeFinance ? buildMemoryFinancialOrchestrator(userId, {
    windowDays: options.windowDays
  }).plan : undefined;
  const firstCashSprintContext = buildMemoryRevenueFirstCashSprint(userId, {
    includeBlocked: true,
    maxCandidates: 8,
    maxSprintActions: Math.min(5, Number(options.maxActions ?? 12)),
    targetDaysToFirstCash: 7
  });
  const firstBusinessLaunchContext = buildMemoryRevenueFirstBusinessLaunch(userId, {
    maxCandidates: 8
  });
  const releasePlan = includeFinance ? buildMemoryFinancialReleaseGovernance(userId).plan : undefined;
  const signalPlan = includeSignalIntake ? buildMemorySignalIntake(userId, {
    windowDays: options.windowDays
  }) : undefined;
  const commandPlan = buildMemoryPortfolioCommandCenter(userId, {
    includeContent,
    includeFinance,
    maxActions: options.maxActions,
    windowDays: options.windowDays
  }).plan;
  const plan = buildRevenueAutopilotPlan({
    assetPortfolio,
    commandPlan,
    contentPlan,
    digitalPlan,
    financialPlan,
    firstBusinessLaunchPlan: firstBusinessLaunchContext.plan,
    firstCashSprintPlan: firstCashSprintContext.sprint,
    launchPlan,
    listingPlan,
    options,
    releasePlan,
    revenuePlan,
    signalPlan,
    storeSetupPlan
  });

  return {
    assetPortfolio,
    commandPlan,
    contentPlan,
    digitalPlan,
    financialPlan,
    firstBusinessLaunchContext,
    firstCashSprintContext,
    launchPlan,
    launchStores: launchResult.stores,
    listingPlan,
    plan,
    releasePlan,
    revenuePlan,
    signalPlan,
    storeSetupPlan
  };
}

function buildMemoryRevenueAutopilot(userId: string, options: Partial<RevenueAutopilotOptions>) {
  return {
    plan: buildMemoryRevenueAutopilotContext(userId, options).plan
  };
}

function applyMemoryRevenueAutopilot(userId: string, plan: RevenueAutopilotPlan) {
  const createdAt = now();
  const auditLogId = id("audit");

  for (const item of plan.actions) {
    state.portfolioCommandActions.unshift({
      action: item.action,
      auditLogId,
      commandHash: item.commandHash,
      control: {
        approvalGate: item.approvalGate,
        autopilotStatus: item.status,
        blockedExternalActions: item.blockedExternalActions,
        expectedInternalEffect: item.expectedInternalEffect,
        externalExecution: false,
        phase: item.phase,
        providerContacted: false,
        sourceModule: item.sourceModule
      },
      createdAt,
      externalExecution: false,
      id: id("portfolio_cmd"),
      priority: item.priority,
      providerContacted: false,
      reason: item.reason,
      recommendedStatus: item.recommendedStatus,
      riskLevel: item.riskLevel,
      sourceModule: item.sourceModule,
      status: item.status === "blocked" ? "blocked" : "queued",
      targetId: item.targetId,
      targetName: item.targetName,
      targetType: item.targetType,
      updatedAt: createdAt,
      userId
    });
  }

  state.auditLogs.unshift({
    action: "revenue.autopilot.commands_recorded",
    createdAt,
    entry: {
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
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: plan.actions.some((item) => item.riskLevel === "high") ? "high" : plan.actions.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_autopilot"
  });

  return {
    auditLogId,
    commandRecordsCreated: plan.actions.length,
    contentCommands: plan.actions.filter((item) => item.targetType === "content").length,
    financeCommands: plan.actions.filter((item) => item.targetType === "finance").length,
    portfolioCommands: plan.actions.filter((item) => item.targetType === "portfolio").length,
    providerContacted: false as const,
    signalCommands: plan.actions.filter((item) => item.targetType === "signal").length
  };
}

type MemoryRevenueAutopilotContext = ReturnType<typeof buildMemoryRevenueAutopilotContext>;
type MemoryRevenueAutopilotExecutedStep = RevenueAutopilotExecutionStep & {
  executionStatus: "blocked" | "executed" | "preview" | "skipped";
  result: Record<string, unknown>;
};

function memoryPortfolioCommandIsAssetBatchCandidate(command: PortfolioCommandItem) {
  return (command.targetType === "product" || command.targetType === "store")
    && (command.action === "scale" || command.action === "watch" || command.action === "pause" || command.action === "kill")
    && command.sourceModule.split(" + ").includes("revenue_asset_portfolio");
}

function memoryAutopilotAssetBatchForContext(context: MemoryRevenueAutopilotContext) {
  return buildRevenueAssetBatchControlPlan({
    portfolio: context.assetPortfolio,
    selections: context.commandPlan.commandActions
      .filter(memoryPortfolioCommandIsAssetBatchCandidate)
      .map((command) => ({
        action: command.action as "scale" | "watch" | "pause" | "kill",
        assetId: command.targetId,
        assetType: command.targetType as "product" | "store"
      }))
  });
}

function memoryNonAssetPortfolioCommandPlan(context: MemoryRevenueAutopilotContext): PortfolioCommandCenterPlan {
  return {
    ...context.commandPlan,
    commandActions: context.commandPlan.commandActions.filter((command) => !memoryPortfolioCommandIsAssetBatchCandidate(command))
  };
}

function applyMemoryAssetBatchControl(userId: string, batch: ReturnType<typeof buildRevenueAssetBatchControlPlan>) {
  const ownedStoreIds = new Set(state.merchStores.filter((store) => store.userId === userId).map((store) => store.id));

  for (const change of batch.productUpdates) {
    const nextStatus = memoryProductStatus(change.toStatus);
    const index = state.podProducts.findIndex((product) => product.id === change.targetId && ownedStoreIds.has(product.storeId));

    if (nextStatus && index !== -1) {
      state.podProducts[index] = normalizePodProductBody({ status: nextStatus }, state.podProducts[index]);
    }
  }

  for (const change of batch.storeUpdates) {
    const nextStatus = memoryLaunchStatus(change.toStatus);
    const index = state.merchStores.findIndex((store) => store.id === change.targetId && store.userId === userId);

    if (nextStatus && index !== -1) {
      state.merchStores[index] = normalizeMerchStoreBody({ launchStatus: nextStatus }, userId, state.merchStores[index]);
    }
  }

  return {
    productUpdates: batch.productUpdates,
    storeUpdates: batch.storeUpdates
  };
}

const memoryAutopilotExecutableActions = new Set<RevenueAutopilotExecutableActionKind>([
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

function revenueAutopilotExecutableActionsFrom(value: unknown): RevenueAutopilotExecutableActionKind[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const actions = value.filter((item): item is RevenueAutopilotExecutableActionKind => (
    typeof item === "string" && memoryAutopilotExecutableActions.has(item as RevenueAutopilotExecutableActionKind)
  ));

  return actions.length > 0 ? actions.slice(0, 10) : undefined;
}

function memoryLaunchActionForAutopilot(actionKind: RevenueAutopilotExecutionStep["action"]) {
  if (actionKind === "seed_launch_products") return "seed_products";
  if (actionKind === "queue_launch_approval") return "queue_launch_approval";
  if (actionKind === "prepare_launch_package") return "prepare_launch_package";
  return null;
}

function memoryLaunchPlansForStep(context: MemoryRevenueAutopilotContext, step: RevenueAutopilotExecutionStep) {
  const launchAction = memoryLaunchActionForAutopilot(step.action);

  return launchAction ? context.launchPlan.storePlans.filter((storePlan) => storePlan.action === launchAction) : [];
}

function memoryPreviewAutopilotStep(context: MemoryRevenueAutopilotContext, step: RevenueAutopilotExecutionStep, options: {
  includeAssetBatchActions: boolean;
}): Record<string, unknown> {
  if (step.action === "run_first_business_launch") {
    const selectedSprintActionIds = context.firstBusinessLaunchContext.plan.topCandidate?.sprintActionId
      ? [context.firstBusinessLaunchContext.plan.topCandidate.sprintActionId]
      : [];

    return {
      firstBusinessLaunchActions: selectedSprintActionIds.length,
      firstBusinessLaunchActionsBlocked: 0,
      firstBusinessLaunchActionsDispatched: 0,
      firstBusinessLaunchActionsPreviewed: selectedSprintActionIds.length,
      firstBusinessLaunchActionsSkipped: 0,
      firstBusinessLaunchManualGates: context.firstBusinessLaunchContext.plan.totals.manualGates,
      firstBusinessLaunchReady: context.firstBusinessLaunchContext.plan.totals.readyInternal,
      firstBusinessLaunchSummary: context.firstBusinessLaunchContext.plan.summary,
      selectedSprintActionIds
    };
  }

  if (step.action === "run_first_cash_sprint") {
    const selectedBridgeActionIds = selectRevenueFirstCashSprintBridgeActionIds(context.firstCashSprintContext.sprint);

    return {
      firstCashSprintActions: selectedBridgeActionIds.length,
      firstCashSprintActionsBlocked: 0,
      firstCashSprintActionsDispatched: 0,
      firstCashSprintActionsPreviewed: selectedBridgeActionIds.length,
      firstCashSprintActionsSkipped: 0,
      firstCashSprintBridgeActions: selectedBridgeActionIds.length,
      firstCashSprintManualGates: context.firstCashSprintContext.sprint.totals.manualGates,
      firstCashSprintReady: context.firstCashSprintContext.sprint.totals.readyInternal,
      firstCashSprintSummary: context.firstCashSprintContext.sprint.summary
    };
  }

  if (step.action === "apply_listing_optimization") {
    return { productUpdates: context.listingPlan.experiments.length };
  }

  if (step.action === "prepare_store_setup") {
    return { storeUpdates: context.storeSetupPlan.runbooks.filter((runbook) => runbook.action !== "hold").length };
  }

  if (step.action === "queue_content_briefs") {
    return { briefsCreated: context.contentPlan?.briefs.filter((brief) => brief.recordState === "new").length ?? 0 };
  }

  if (step.action === "record_finance_split") {
    return {
      ledgerEntriesCreated: context.financialPlan?.ledgerEntries.filter((entry) => entry.recordState === "new").length ?? 0,
      payoutIntentsCreated: context.financialPlan?.payoutIntents.length ?? 0,
      policyId: null,
      scalingBudgetPackets: context.financialPlan?.scalingBudgetQueue.length ?? 0
    };
  }

  if (step.action === "record_release_governance") {
    return {
      budgetReleasePacketsUpserted: context.releasePlan?.budgetReleasePackets.length ?? 0,
      reconciliationReportId: null
    };
  }

  if (step.action === "record_portfolio_commands") {
    if (options.includeAssetBatchActions) {
      const batch = memoryAutopilotAssetBatchForContext(context);
      const plan = memoryNonAssetPortfolioCommandPlan(context);

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
      assetControlRecordsCreated: buildRevenueAssetControlsFromPortfolioCommands({
        plan: context.commandPlan,
        portfolio: context.assetPortfolio
      }).controls.length,
      commandRecordsCreated: context.commandPlan.commandActions.length,
      contentCommands: context.commandPlan.commandActions.filter((command) => command.targetType === "content").length,
      financeCommands: context.commandPlan.commandActions.filter((command) => command.targetType === "finance").length
    };
  }

  if (step.action === "queue_digital_products") {
    return {
      createdProducts: context.digitalPlan.totals.queuedDrafts,
      storeUpdates: context.digitalPlan.storePlans.filter((storePlan) => storePlan.queuedDrafts.length > 0).length
    };
  }

  if (step.action === "seed_launch_products" || step.action === "queue_launch_approval" || step.action === "prepare_launch_package") {
    const storePlans = memoryLaunchPlansForStep(context, step);

    return {
      approvalPackets: storePlans.filter((storePlan) => storePlan.action === "queue_launch_approval" || storePlan.action === "prepare_launch_package").length,
      createdProducts: storePlans.filter((storePlan) => storePlan.action === "seed_products").reduce((sum, storePlan) => sum + storePlan.missingProducts, 0),
      storeUpdates: storePlans.length
    };
  }

  return {};
}

function mergeMemoryAutopilotResult(totals: Record<string, unknown>, result: Record<string, unknown>) {
  for (const key of ["assetBatchActions", "assetBatchSkipped", "assetControlActionsSkipped", "assetControlRecordsCreated", "briefsCreated", "budgetReleasePacketsUpserted", "commandRecordsCreated", "contentCommands", "financeCommands", "firstBusinessLaunchActions", "firstBusinessLaunchActionsBlocked", "firstBusinessLaunchActionsDispatched", "firstBusinessLaunchActionsPreviewed", "firstBusinessLaunchActionsSkipped", "firstBusinessLaunchManualGates", "firstBusinessLaunchReady", "firstCashSprintActions", "firstCashSprintActionsBlocked", "firstCashSprintActionsDispatched", "firstCashSprintActionsPreviewed", "firstCashSprintActionsSkipped", "firstCashSprintBridgeActions", "firstCashSprintManualGates", "firstCashSprintReady", "ledgerEntriesCreated", "payoutIntentsCreated", "portfolioCommands", "scalingBudgetPackets", "signalCommands"]) {
    const value = result[key];
    if (typeof value === "number") {
      totals[key] = Number(totals[key] ?? 0) + value;
    }
  }

  for (const key of ["approvalPackets", "createdProducts", "productUpdates", "storeUpdates"]) {
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

function applyMemoryAutopilotStep(userId: string, context: MemoryRevenueAutopilotContext, step: RevenueAutopilotExecutionStep, options: {
  includeAssetBatchActions: boolean;
}): Record<string, unknown> {
  const createdAt = now();

  if (step.action === "run_first_business_launch") {
    const selectedSprintActionIds = context.firstBusinessLaunchContext.plan.topCandidate?.sprintActionId
      ? [context.firstBusinessLaunchContext.plan.topCandidate.sprintActionId]
      : [];
    const response = applyMemoryRevenueFirstBusinessLaunch(userId, {
      dryRun: false,
      maxCandidates: Math.max(context.firstBusinessLaunchContext.plan.totals.candidates, 1),
      note: `Revenue Autopilot: ${step.reason}`,
      sprintActionIds: selectedSprintActionIds
    });

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
    const response = applyMemoryRevenueFirstCashSprint(userId, {
      dryRun: false,
      includeBlocked: context.firstCashSprintContext.sprint.options.includeBlocked,
      maxCandidates: context.firstCashSprintContext.sprint.options.maxCandidates,
      maxSprintActions: context.firstCashSprintContext.sprint.options.maxSprintActions,
      note: `Revenue Autopilot: ${step.reason}`,
      targetDaysToFirstCash: context.firstCashSprintContext.sprint.options.targetDaysToFirstCash
    });

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
    const productUpdates = context.listingPlan.experiments.map((experiment) => ({
      fromStatus: experiment.currentListing.title ? "Existing listing draft" : "Missing listing copy",
      productId: experiment.productId,
      productName: experiment.productName,
      recommendedVariantId: experiment.recommendedVariant.id,
      storeId: experiment.storeId,
      toStatus: experiment.recommendedInternalStatus
    }));
    const ownedStoreIds = new Set(state.merchStores.filter((store) => store.userId === userId).map((store) => store.id));

    for (const experiment of context.listingPlan.experiments) {
      const index = state.podProducts.findIndex((product) => product.id === experiment.productId && ownedStoreIds.has(product.storeId));
      if (index === -1) continue;

      const variant = experiment.recommendedVariant;
      state.podProducts[index] = normalizePodProductBody({
        estimatedPlatformFees: variant.estimatedPlatformFees,
        estimatedProfit: variant.estimatedProfit,
        listingDescription: variant.description,
        listingTitle: variant.title,
        mockupNotes: variant.mockupNotes,
        profitMargin: variant.profitMargin,
        retailPrice: variant.retailPrice,
        status: experiment.recommendedInternalStatus as PodProduct["status"],
        tags: variant.tags
      }, state.podProducts[index]);
    }

    return { productUpdates };
  }

  if (step.action === "prepare_store_setup") {
    const storeUpdates = context.storeSetupPlan.runbooks
      .filter((runbook) => runbook.action !== "hold")
      .map((runbook) => ({
        action: runbook.action,
        fromStatus: state.merchStores.find((store) => store.id === runbook.storeId && store.userId === userId)?.launchStatus ?? "Unknown",
        readinessScore: runbook.readinessScore,
        storeId: runbook.storeId,
        storeName: runbook.storeName,
        toStatus: runbook.recommendedLaunchStatus
      }));

    for (const update of storeUpdates) {
      const index = state.merchStores.findIndex((store) => store.id === update.storeId && store.userId === userId);
      if (index !== -1) {
        state.merchStores[index] = normalizeMerchStoreBody({ launchStatus: update.toStatus as ClientMerchStore["launchStatus"] }, userId, state.merchStores[index]);
      }
    }

    return { storeUpdates };
  }

  if (step.action === "queue_content_briefs") {
    if (!context.contentPlan) return { reason: "Content pipeline is not included.", skipped: true };

    let briefsCreated = 0;
    for (const brief of context.contentPlan.briefs.filter((item) => item.recordState === "new")) {
      if (state.facelessContentBriefs.some((existing) => existing.userId === userId && existing.dedupeKey === brief.dedupeKey)) continue;

      state.facelessContentBriefs.unshift({
        auditLogId: null,
        blockedActions: brief.blockedActions,
        channelPackages: brief.channelPackages,
        concept: brief.concept,
        createdAt,
        dedupeKey: brief.dedupeKey,
        externalExecution: false,
        id: id("content_brief"),
        priority: brief.priority,
        productId: brief.productId,
        providerReadiness: brief.providerReadiness,
        script: brief.script,
        status: "draft_queued",
        storyboard: brief.storyboard,
        storeId: brief.storeId,
        targetChannels: brief.targetChannels,
        title: brief.title,
        updatedAt: createdAt,
        userId,
        videoSpec: brief.videoSpec,
        voiceoverSpec: brief.voiceoverSpec
      });
      briefsCreated += 1;
    }

    return { briefsCreated };
  }

  if (step.action === "record_finance_split") {
    if (!context.financialPlan) return { reason: "Financial orchestrator is not included.", skipped: true };

    const policyId = id("fin_policy");
    const ledgerEntries = context.financialPlan.ledgerEntries.filter((entry) => entry.recordState === "new");
    const payoutIntents = context.financialPlan.payoutIntents.filter((intent) => !state.financialPayoutIntents.some((existing) => existing.userId === userId && existing.dedupeKey === intent.dedupeKey));
    state.financialSplitPolicies.unshift({
      bufferPercent: context.financialPlan.splitPolicy.bufferPercent,
      createdAt,
      currency: context.financialPlan.splitPolicy.currency,
      externalExecution: false,
      id: policyId,
      metadata: {
        generatedAt: context.financialPlan.generatedAt,
        policyChecks: context.financialPlan.policyChecks,
        scalingBudgetQueue: context.financialPlan.scalingBudgetQueue,
        summary: context.financialPlan.summary
      },
      minPayoutIntentAmount: context.financialPlan.splitPolicy.minPayoutIntentAmount,
      personalPercent: context.financialPlan.splitPolicy.personalPercent,
      reserveFloorAmount: context.financialPlan.splitPolicy.reserveFloorAmount,
      scalingPercent: context.financialPlan.splitPolicy.scalingPercent,
      status: context.financialPlan.splitPolicy.status,
      updatedAt: createdAt,
      userId
    });

    for (const entry of ledgerEntries) {
      state.financialLedgerEntries.unshift({
        allocatableProfit: entry.allocatableProfit,
        allocation: entry.allocation,
        createdAt,
        currency: entry.currency,
        externalExecution: false,
        grossRevenue: entry.grossRevenue,
        id: id("fin_ledger"),
        netProfit: entry.netProfit,
        periodEnd: entry.periodEnd,
        periodStart: entry.periodStart,
        productId: entry.productId,
        revenuePerformanceSnapshotId: entry.revenuePerformanceSnapshotId,
        source: entry.source,
        status: entry.status,
        storeId: entry.storeId,
        updatedAt: createdAt,
        userId
      });
    }

    for (const intent of payoutIntents) {
      state.financialPayoutIntents.unshift({
        amount: intent.amount,
        approvalRequired: true,
        auditLogId: null,
        category: intent.category,
        createdAt,
        currency: intent.currency,
        dedupeKey: intent.dedupeKey,
        destinationType: intent.destinationType,
        externalExecution: false,
        id: id("fin_intent"),
        metadata: {
          approvalGate: intent.approvalGate,
          sourceLedgerEntryIds: intent.sourceLedgerEntryIds,
          title: intent.title
        },
        provider: intent.provider,
        splitPolicyId: policyId,
        status: intent.status,
        updatedAt: createdAt,
        userId
      });
    }

    const scalingBudgetPackets = storeMemoryFinancialScalingBudgetPackets(
      userId,
      policyId,
      context.financialPlan.scalingBudgetQueue,
      null,
      createdAt
    );

    return {
      ledgerEntriesCreated: ledgerEntries.length,
      payoutIntentsCreated: payoutIntents.length,
      policyId,
      scalingBudgetPackets
    };
  }

  if (step.action === "record_release_governance") {
    if (!context.releasePlan) return { reason: "Release governance is not included.", skipped: true };

    let budgetReleasePacketsUpserted = 0;
    for (const packet of context.releasePlan.budgetReleasePackets) {
      const existingIndex = state.financialBudgetReleasePackets.findIndex((record) => record.userId === userId && record.payoutIntentId === packet.intentId);
      const record: FinancialBudgetReleasePacketRecord = {
        amount: packet.amount,
        approvalState: packet.approvalState,
        auditLogId: null,
        blockedActions: packet.blockedActions,
        category: packet.category,
        controls: packet.controls,
        createdAt: existingIndex >= 0 ? state.financialBudgetReleasePackets[existingIndex].createdAt : createdAt,
        currency: packet.currency,
        destinationType: packet.destinationType,
        externalExecution: false,
        id: existingIndex >= 0 ? state.financialBudgetReleasePackets[existingIndex].id : id("fin_release"),
        maxReleaseAmount: packet.maxReleaseAmount,
        payoutIntentId: packet.intentId,
        purpose: packet.purpose,
        releaseState: packet.releaseState,
        updatedAt: createdAt,
        userId
      };

      if (existingIndex >= 0) {
        state.financialBudgetReleasePackets[existingIndex] = record;
      } else {
        state.financialBudgetReleasePackets.unshift(record);
      }
      budgetReleasePacketsUpserted += 1;
    }

    const reconciliationReportId = id("fin_recon");
    state.financialReconciliationReports.unshift({
      approvedAmount: context.releasePlan.reconciliationReport.approvedAmount,
      auditLogId: null,
      createdAt,
      externalExecution: false,
      id: reconciliationReportId,
      pendingAmount: context.releasePlan.reconciliationReport.pendingAmount,
      rejectedAmount: context.releasePlan.reconciliationReport.rejectedAmount,
      report: {
        auditEvents: context.releasePlan.auditEvents,
        generatedAt: context.releasePlan.generatedAt,
        releaseReadiness: context.releasePlan.releaseReadiness,
        riskTiers: context.releasePlan.riskTiers,
        source: context.releasePlan.reconciliationReport.source,
        stripeReadOnlyProbe: context.releasePlan.stripeReadOnlyProbe,
        summary: context.releasePlan.summary
      },
      source: context.releasePlan.reconciliationReport.source,
      status: context.releasePlan.reconciliationReport.status,
      totalAmount: context.releasePlan.reconciliationReport.totalAmount,
      updatedAt: createdAt,
      userId,
      variance: context.releasePlan.reconciliationReport.variance
    });

    return {
      budgetReleasePacketsUpserted,
      reconciliationReportId
    };
  }

  if (step.action === "record_portfolio_commands") {
    if (options.includeAssetBatchActions) {
      const batch = memoryAutopilotAssetBatchForContext(context);
      const plan = memoryNonAssetPortfolioCommandPlan(context);
      const commandApplied = plan.commandActions.length > 0
        ? applyMemoryPortfolioCommandCenter(userId, plan, context.assetPortfolio)
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
        ? applyMemoryAssetBatchControl(userId, batch)
        : {
          productUpdates: [],
          storeUpdates: []
        };

      return {
        ...commandApplied,
        assetBatchActions: batch.controls.length,
        assetBatchSkipped: batch.skipped.length,
        assetControlActionsSkipped: batch.skipped.length,
        assetControlBatchReview: batch.controlReview,
        assetControlRecordsCreated: batch.controls.length,
        productUpdates: [...commandApplied.productUpdates, ...batchApplied.productUpdates],
        storeUpdates: [...commandApplied.storeUpdates, ...batchApplied.storeUpdates]
      };
    }

    return applyMemoryPortfolioCommandCenter(userId, context.commandPlan, context.assetPortfolio);
  }

  if (step.action === "queue_digital_products") {
    const createdProducts = context.digitalPlan.draftQueue.map((draft) => normalizePodProductBody(draft.createProductInput as Partial<PodProduct>));
    const storeUpdates = context.digitalPlan.storePlans
      .filter((storePlan) => storePlan.queuedDrafts.length > 0)
      .map((storePlan) => ({
        addedProductTypes: storePlan.queuedDrafts.map((draft) => draft.createProductInput.productType),
        approvalStatus: "Designs Pending",
        launchStatus: "Designing",
        storeId: storePlan.storeId,
        storeName: storePlan.storeName
      }));

    state.podProducts.unshift(...createdProducts);
    for (const update of storeUpdates) {
      const index = state.merchStores.findIndex((store) => store.id === update.storeId && store.userId === userId);
      if (index !== -1) {
        state.merchStores[index] = normalizeMerchStoreBody({
          approvalStatus: "Designs Pending",
          designCount: state.merchStores[index].designCount + update.addedProductTypes.length,
          launchStatus: "Designing",
          productTypes: Array.from(new Set([...state.merchStores[index].productTypes, ...update.addedProductTypes]))
        }, userId, state.merchStores[index]);
      }
    }

    return {
      createdProducts: createdProducts.map((product) => ({
        id: product.id,
        productName: product.productName,
        storeId: product.storeId
      })),
      storeUpdates
    };
  }

  if (step.action === "seed_launch_products" || step.action === "queue_launch_approval" || step.action === "prepare_launch_package") {
    const createdProducts: Array<{ id: string; productName: string; storeId: string }> = [];
    const approvalPackets: Array<{ auditLogId: string | null; id: string; storeId: string }> = [];
    const storeUpdates: Array<{ approvalStatus?: string; launchStatus?: string; storeId: string; storeName: string }> = [];

    for (const storePlan of memoryLaunchPlansForStep(context, step)) {
      const store = context.launchStores.find((item) => item.id === storePlan.storeId);
      if (!store) continue;

      if (storePlan.action === "seed_products") {
        const products = generateProductBatch(store, storePlan.batchInput).map((product) => normalizePodProductBody(product as Partial<PodProduct>));
        state.podProducts.unshift(...products);
        createdProducts.push(...products.map((product) => ({
          id: product.id,
          productName: product.productName,
          storeId: product.storeId
        })));
        const index = state.merchStores.findIndex((item) => item.id === store.id && item.userId === userId);
        if (index !== -1) {
          state.merchStores[index] = normalizeMerchStoreBody({
            approvalStatus: "Designs Pending",
            designCount: state.merchStores[index].designCount + products.length,
            launchStatus: "Designing"
          }, userId, state.merchStores[index]);
        }
        storeUpdates.push({
          approvalStatus: "Designs Pending",
          launchStatus: "Designing",
          storeId: store.id,
          storeName: store.businessName
        });
      }

      if (storePlan.action === "queue_launch_approval" || storePlan.action === "prepare_launch_package") {
        const packet = buildGrowthApprovalPacket({
          note: `Revenue Autopilot: ${storePlan.reason}`,
          products: state.podProducts.filter((product) => product.storeId === store.id),
          store,
          storeId: store.id
        });
        const record: GrowthApprovalPacketRecord = {
          createdAt,
          id: id("growth_packet"),
          mode: packet.mode,
          packet,
          requestAuditLogId: null,
          scheduledFor: packet.scheduledFor,
          status: "pending",
          storeId: store.id,
          updatedAt: createdAt,
          userId
        };
        state.growthApprovalPackets.unshift(record);
        const index = state.merchStores.findIndex((item) => item.id === store.id && item.userId === userId);
        if (index !== -1) {
          state.merchStores[index] = normalizeMerchStoreBody({ launchStatus: "Awaiting Approval" }, userId, state.merchStores[index]);
        }
        approvalPackets.push({
          auditLogId: null,
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

  return { reason: "Action cannot be executed by the internal step executor.", skipped: true };
}

function executeMemoryRevenueAutopilot(userId: string, body: Partial<Record<keyof RevenueAutopilotOptions, unknown>> & {
  actions?: unknown;
  dryRun?: boolean;
  includeAssetBatchActions?: boolean;
  includeDraftCreation?: boolean;
  includeLaunchApprovalPackets?: boolean;
  maxSteps?: number | string;
}) {
  const options = revenueAutopilotOptionsFrom(body);
  const context = buildMemoryRevenueAutopilotContext(userId, options);
  const selection = selectRevenueAutopilotExecutionSteps(context.plan, {
    actions: revenueAutopilotExecutableActionsFrom(body.actions),
    includeDraftCreation: body.includeDraftCreation === true,
    includeLaunchApprovalPackets: body.includeLaunchApprovalPackets === true,
    maxSteps: Number(body.maxSteps ?? 6)
  });
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
  const steps: MemoryRevenueAutopilotExecutedStep[] = [];

  for (const step of selection.steps) {
    if (step.status !== "ready") {
      steps.push({
        ...step,
        executionStatus: step.status === "blocked" ? "blocked" : "skipped",
        result: {}
      });
      continue;
    }

    const result = body.dryRun
      ? memoryPreviewAutopilotStep(context, step, {
        includeAssetBatchActions: body.includeAssetBatchActions === true
      })
      : applyMemoryAutopilotStep(userId, context, step, {
        includeAssetBatchActions: body.includeAssetBatchActions === true
      });
    mergeMemoryAutopilotResult(totals, result);
    steps.push({
      ...step,
      executionStatus: body.dryRun ? "preview" : result.skipped === true ? "skipped" : "executed",
      result
    });
  }

  const auditLogId = body.dryRun ? null : id("audit");
  if (auditLogId) {
    state.auditLogs.unshift({
      action: "revenue.autopilot.internal_steps_executed",
      createdAt: now(),
      entry: {
        blockedExternalActions: context.plan.blockedExternalActions,
        externalExecution: false,
        includeAssetBatchActions: body.includeAssetBatchActions === true,
        includeDraftCreation: body.includeDraftCreation === true,
        includeLaunchApprovalPackets: body.includeLaunchApprovalPackets === true,
        providerContacted: false,
        selectionTotals: selection.totals,
        stepResults: steps.map((step) => ({
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
      entryHash: id("hash"),
      id: auditLogId,
      outcome: "success",
      severity: steps.some((step) => step.executionStatus === "executed" && step.riskLevel === "high") ? "high" : steps.some((step) => step.executionStatus === "executed") ? "medium" : "low",
      targetId: null,
      targetType: "revenue_autopilot_executor"
    });
  }

  const refreshed = body.dryRun ? context : buildMemoryRevenueAutopilotContext(userId, options);

  return {
    executed: {
      ...totals,
      auditLogId,
      dryRun: Boolean(body.dryRun),
      externalExecution: false,
      providerContacted: false,
      stepsBlocked: steps.filter((step) => step.executionStatus === "blocked").length,
      stepsExecuted: steps.filter((step) => step.executionStatus === "executed").length,
      stepsPreviewed: steps.filter((step) => step.executionStatus === "preview").length,
      stepsReady: selection.totals.ready,
      stepsSkipped: steps.filter((step) => step.executionStatus === "skipped").length
    },
    plan: refreshed.plan,
    selection,
    steps
  };
}

function memoryRevenueOpportunityOptionsFrom(body: Record<string, unknown>): RevenueOpportunityFactoryOptions {
  const numberValue = (key: string, fallback: number) => {
    const parsed = Number(body[key] ?? fallback);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const numeric = (value: unknown, fallback: number) => {
    const parsed = Number(value ?? fallback);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const productCount = numberValue("productCount", 5);
  const productTypes = Array.isArray(body.productTypes)
    ? body.productTypes.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const priceRange = typeof body.priceRange === "object" && body.priceRange
    ? body.priceRange as { max?: unknown; min?: unknown }
    : {};
  const riskTolerance = body.riskTolerance;
  const storePlatform = body.storePlatform;
  const podProvider = body.podProvider;

  return {
    audience: typeof body.audience === "string" ? body.audience : undefined,
    brandStyle: typeof body.brandStyle === "string" ? body.brandStyle : undefined,
    businessName: typeof body.businessName === "string" ? body.businessName : undefined,
    clientName: typeof body.clientName === "string" ? body.clientName : undefined,
    contactName: typeof body.contactName === "string" ? body.contactName : undefined,
    email: typeof body.email === "string" ? body.email : undefined,
    idea: typeof body.idea === "string" ? body.idea : "",
    industry: typeof body.industry === "string" ? body.industry : undefined,
    podProvider: podProvider === "Printful" || podProvider === "Other" ? podProvider : "Printify",
    priceRange: {
      max: numeric(priceRange.max, 64),
      min: numeric(priceRange.min, 18)
    },
    productCount: ([5, 10, 15, 25] as const).includes(productCount as 5 | 10 | 15 | 25) ? productCount as 5 | 10 | 15 | 25 : 5,
    productTypes,
    riskTolerance: riskTolerance === "Medium" || riskTolerance === "High" ? riskTolerance : "Low",
    sourceKey: typeof body.sourceKey === "string" ? body.sourceKey : undefined,
    storePlatform: storePlatform === "Shopify" || storePlatform === "Other" ? storePlatform : "Etsy"
  };
}

function executeMemoryRevenueOpportunityFactory(userId: string, body: Record<string, unknown>) {
  const options = memoryRevenueOpportunityOptionsFrom(body);
  const sourceKey = revenueOpportunitySourceKey(options);
  const sourceMarker = `Revenue Factory Source: ${sourceKey}`;
  let opportunity = state.revenueOpportunities.find((item) => item.userId === userId && item.sourceKey === sourceKey);
  let existing = opportunity?.storeId
    ? state.merchStores.find((store) => store.id === opportunity?.storeId && store.userId === userId)
    : undefined;

  if (!existing) {
    existing = state.merchStores.find((store) => store.userId === userId && (store.notes ?? "").includes(sourceMarker));
  }

  const existingProducts = existing
    ? state.podProducts.filter((product) => product.storeId === existing?.id).map((product) => product.productName)
    : [];
  const preliminaryPlan = buildRevenueOpportunityFactoryPlan({
    existingProductNames: existingProducts,
    existingStoreId: existing?.id ?? null,
    options,
    storeId: existing?.id
  });

  if (body.dryRun) {
    return {
      applied: {
        auditLogId: null,
        dryRun: true,
        externalExecution: false,
        productDraftsCreated: preliminaryPlan.productDrafts.length,
        providerContacted: false,
        skippedExistingProducts: preliminaryPlan.skippedExistingProducts.length,
        storeCreated: !existing,
        storeId: existing?.id ?? null,
        opportunityId: opportunity?.id ?? null
      },
      plan: preliminaryPlan,
      store: existing ? publicMerchStore(existing) : null
    };
  }

  let storeCreated = false;

  if (!existing) {
    existing = normalizeMerchStoreBody({
      approvalStatus: preliminaryPlan.storeDraft.approvalStatus,
      audience: preliminaryPlan.storeDraft.audience,
      brandStyle: preliminaryPlan.storeDraft.brandStyle,
      businessName: preliminaryPlan.storeDraft.businessName,
      clientName: preliminaryPlan.storeDraft.clientName,
      contactName: preliminaryPlan.storeDraft.contactName,
      designCount: 0,
      email: preliminaryPlan.storeDraft.email,
      estimatedProfit: preliminaryPlan.storeDraft.estimatedProfit,
      industry: preliminaryPlan.storeDraft.industry,
      launchStatus: preliminaryPlan.storeDraft.launchStatus,
      monthlyFee: 0,
      notes: preliminaryPlan.storeDraft.notes,
      podProvider: preliminaryPlan.storeDraft.podProvider,
      productTypes: preliminaryPlan.storeDraft.productTypes,
      profitShare: preliminaryPlan.storeDraft.profitShare,
      revenue: 0,
      setupFee: 0,
      storePlatform: preliminaryPlan.storeDraft.storePlatform
    }, userId);
    state.merchStores.unshift(existing);
    storeCreated = true;
  }

  if (!existing) {
    throw new Error("Revenue opportunity store was not created.");
  }

  let activeStore = existing;
  const currentProductNames = state.podProducts
    .filter((product) => product.storeId === activeStore.id)
    .map((product) => product.productName);
  const plan = buildRevenueOpportunityFactoryPlan({
    existingProductNames: currentProductNames,
    existingStoreId: activeStore.id,
    options,
    storeId: activeStore.id
  });
  const createdProducts = plan.productDrafts.map((product) => normalizePodProductBody(product as Partial<PodProduct>));

  if (createdProducts.length > 0) {
    state.podProducts.unshift(...createdProducts);
    const index = state.merchStores.findIndex((store) => store.id === existing?.id && store.userId === userId);

    if (index !== -1) {
      state.merchStores[index] = normalizeMerchStoreBody({
        approvalStatus: "Designs Pending",
        designCount: state.merchStores[index].designCount + createdProducts.length,
        estimatedProfit: plan.totals.estimatedDraftProfit,
        launchStatus: "Designing"
      }, userId, state.merchStores[index]);
      activeStore = state.merchStores[index];
    }
  }

  const auditLogId = id("audit");
  state.auditLogs.unshift({
    action: "revenue.opportunity_factory.created",
    createdAt: now(),
    entry: {
      auditEvents: plan.auditEvents,
      blockedExternalActions: plan.blockedExternalActions,
      createdProducts: createdProducts.map((product) => ({
        id: product.id,
        productName: product.productName,
        storeId: product.storeId
      })),
      externalExecution: false,
      idempotency: plan.idempotency,
      opportunityId: opportunity?.id ?? null,
      providerContacted: false,
      skippedExistingProducts: plan.skippedExistingProducts,
      storeCreated,
      storeId: activeStore.id,
      summary: plan.summary,
      totals: plan.totals
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: createdProducts.length > 0 || storeCreated ? "medium" : "low",
    targetId: activeStore.id,
    targetType: "revenue_opportunity_factory"
  });

  const refreshedProductNames = state.podProducts
    .filter((product) => product.storeId === activeStore.id)
    .map((product) => product.productName);
  const refreshedPlan = buildRevenueOpportunityFactoryPlan({
    existingProductNames: refreshedProductNames,
    existingStoreId: activeStore.id,
    options,
    storeId: activeStore.id
  });
  const timestamp = now();

  if (opportunity) {
    opportunity.auditLogId = auditLogId;
    opportunity.businessName = refreshedPlan.storeDraft.businessName;
    opportunity.idea = options.idea;
    opportunity.plan = refreshedPlan as unknown as Record<string, unknown>;
    opportunity.storeId = activeStore.id;
    opportunity.totals = refreshedPlan.totals;
    opportunity.updatedAt = timestamp;
  } else {
    opportunity = {
      auditLogId,
      businessName: refreshedPlan.storeDraft.businessName,
      createdAt: timestamp,
      externalExecution: false,
      id: id("revenue_opp"),
      idea: options.idea,
      plan: refreshedPlan as unknown as Record<string, unknown>,
      providerContacted: false,
      sourceKey,
      status: "active",
      storeId: activeStore.id,
      totals: refreshedPlan.totals,
      updatedAt: timestamp,
      userId
    };
    state.revenueOpportunities.unshift(opportunity);
  }

  return {
    applied: {
      auditLogId,
      dryRun: false,
      externalExecution: false,
      productDraftsCreated: createdProducts.length,
      providerContacted: false,
      skippedExistingProducts: refreshedPlan.skippedExistingProducts.length,
      storeCreated,
      storeId: activeStore.id,
      opportunityId: opportunity.id
    },
    createdProducts: createdProducts.map((product) => ({
      id: product.id,
      productName: product.productName,
      storeId: product.storeId
    })),
    plan: refreshedPlan,
    store: publicMerchStore(activeStore)
  };
}

function executeMemoryRevenueBusinessFleetGapSeeds(userId: string, body: Record<string, unknown>) {
  const dryRun = body.dryRun !== false;
  const maxSeeds = Math.min(25, Math.max(1, Number(body.maxSeeds ?? 10) || 10));
  const sourceKeys = new Set(Array.isArray(body.sourceKeys)
    ? body.sourceKeys.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : []);
  const options = revenueBusinessFleetOptionsFrom(body as Partial<Record<keyof RevenueBusinessFleetOptions, unknown>>);
  const context = buildMemoryRevenueBusinessFleetScheduler(userId, options);
  const gapPlan = buildRevenueBusinessFleetLaunchGapPlan({
    plan: context.plan
  });
  const selectedSeeds = gapPlan.opportunitySeeds
    .filter((seed) => sourceKeys.size === 0 || sourceKeys.has(seed.sourceKey))
    .slice(0, maxSeeds);
  const results = selectedSeeds.map((seed) => {
    const response = executeMemoryRevenueOpportunityFactory(userId, {
      businessName: seed.businessName,
      dryRun,
      idea: seed.idea,
      podProvider: typeof body.podProvider === "string" ? body.podProvider : "Printify",
      priceRange: seed.priceRange,
      productCount: seed.productCount,
      productTypes: seed.productTypes,
      riskTolerance: seed.riskTolerance,
      sourceKey: seed.sourceKey,
      storePlatform: seed.storePlatform
    });

    return {
      applied: response.applied,
      businessName: seed.businessName,
      plan: {
        nextInternalActions: response.plan.nextInternalActions,
        summary: response.plan.summary,
        totals: response.plan.totals
      },
      sourceKey: seed.sourceKey,
      store: response.store
    };
  });
  const refreshedContext = dryRun ? context : buildMemoryRevenueBusinessFleetScheduler(userId, options);
  const refreshedGapPlan = buildRevenueBusinessFleetLaunchGapPlan({
    plan: refreshedContext.plan
  });
  const productDraftsCreated = results.reduce((sum, result) => sum + result.applied.productDraftsCreated, 0);
  const skippedExistingProducts = results.reduce((sum, result) => sum + result.applied.skippedExistingProducts, 0);
  const storeShellsCreated = results.filter((result) => result.applied.storeCreated).length;
  const auditLogId = dryRun ? null : id("audit");

  if (auditLogId) {
    state.auditLogs.unshift({
      action: "revenue.business_fleet_gap_seeds.applied",
      createdAt: now(),
      entry: {
        dryRun: false,
        externalExecution: false,
        gapAfter: refreshedGapPlan.totals,
        gapBefore: gapPlan.totals,
        note: typeof body.note === "string" ? body.note : null,
        productDraftsCreated,
        providerContacted: false,
        results,
        selectedSourceKeys: selectedSeeds.map((seed) => seed.sourceKey),
        skippedExistingProducts,
        storeShellsCreated
      },
      entryHash: id("hash"),
      id: auditLogId,
      outcome: "success",
      severity: selectedSeeds.length > 0 ? "medium" : "low",
      targetId: null,
      targetType: "revenue_business_fleet_gap_seed"
    });
  }

  return {
    applied: {
      auditLogId,
      dryRun,
      externalExecution: false,
      launchWaveGapAfter: refreshedGapPlan.totals.launchWaveGap,
      launchWaveGapBefore: gapPlan.totals.launchWaveGap,
      productDraftsCreated,
      providerContacted: false,
      seedsApplied: dryRun ? 0 : selectedSeeds.length,
      seedsPreviewed: dryRun ? selectedSeeds.length : 0,
      seedsSelected: selectedSeeds.length,
      skippedExistingProducts,
      storeShellsCreated,
      summary: selectedSeeds.length === 0
        ? "No internal opportunity seeds were selected from the current business-fleet launch gap."
        : dryRun
          ? `${selectedSeeds.length} internal opportunity seed${selectedSeeds.length === 1 ? "" : "s"} previewed from the business-fleet launch gap.`
          : `${selectedSeeds.length} internal opportunity seed${selectedSeeds.length === 1 ? "" : "s"} created from the business-fleet launch gap.`
    },
    fleet: refreshedContext.plan,
    gapPlan,
    refreshedGapPlan,
    results
  };
}

function buildMemoryRevenueBusinessFleetGapAccelerationPlans(userId: string, stores: ClientMerchStore[]) {
  const storeIds = new Set(stores.map((store) => store.id));
  const products = state.podProducts.filter((product) => storeIds.has(product.storeId));
  const performanceDigest = buildMemoryRevenuePerformanceDigest(userId, {
    windowDays: 30
  }).digest;

  return {
    launchPipeline: buildRevenueLaunchPipeline({
      options: {
        maxStores: Math.min(25, Math.max(stores.length, 1)),
        minPortfolioProductsPerStore: 5,
        productCount: 5,
        riskTolerance: "Low"
      },
      products,
      stores
    }),
    listingOptimization: buildRevenueListingOptimizationPlan({
      options: {
        maxProducts: 100,
        variantsPerProduct: 3,
        windowDays: 30
      },
      performanceDigest,
      products,
      stores
    }),
    storeSetup: buildRevenueStoreSetupPlan({
      options: {
        maxStores: Math.min(25, Math.max(stores.length, 1))
      },
      products,
      stores
    })
  };
}

function executeMemoryRevenueBusinessFleetGapAcceleration(userId: string, body: Record<string, unknown>) {
  const dryRun = body.dryRun !== false;
  const includeLaunchPipeline = body.includeLaunchPipeline !== false;
  const includeListingOptimization = body.includeListingOptimization !== false;
  const includeStoreSetup = body.includeStoreSetup !== false;
  const maxStores = Math.min(25, Math.max(1, Number(body.maxStores ?? 10) || 10));
  const requestedSourceKeys = new Set(Array.isArray(body.sourceKeys)
    ? body.sourceKeys.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : []);
  const opportunities = state.revenueOpportunities
    .filter((opportunity) => opportunity.userId === userId && opportunity.storeId)
    .filter((opportunity) => requestedSourceKeys.size > 0
      ? requestedSourceKeys.has(opportunity.sourceKey)
      : opportunity.sourceKey.startsWith("entral-private-revenue-lane-"))
    .slice(0, maxStores);
  const sourceKeys = opportunities.map((opportunity) => opportunity.sourceKey);
  const storeIds = new Set(opportunities.map((opportunity) => opportunity.storeId).filter((storeId): storeId is string => Boolean(storeId)));
  let stores = state.merchStores.filter((store) => store.userId === userId && storeIds.has(store.id));
  let plans = buildMemoryRevenueBusinessFleetGapAccelerationPlans(userId, stores);
  const launchPipeline = includeLaunchPipeline
    ? dryRun
      ? previewMemoryLaunchPipelineApply(plans.launchPipeline)
      : applyMemoryLaunchPipelineBridge(userId, plans.launchPipeline, stores)
    : { approvalPackets: [], createdProducts: [], storeUpdates: [] };

  if (!dryRun && includeLaunchPipeline) {
    stores = state.merchStores.filter((store) => store.userId === userId && storeIds.has(store.id));
    plans = buildMemoryRevenueBusinessFleetGapAccelerationPlans(userId, stores);
  }

  const listingOptimization = includeListingOptimization
    ? applyMemoryListingOptimizationBridge(userId, plans.listingOptimization, dryRun)
    : { productUpdates: [] };

  if (!dryRun && includeListingOptimization) {
    stores = state.merchStores.filter((store) => store.userId === userId && storeIds.has(store.id));
    plans = buildMemoryRevenueBusinessFleetGapAccelerationPlans(userId, stores);
  }

  const storeSetup = includeStoreSetup
    ? applyMemoryStoreSetupBridge(userId, plans.storeSetup, dryRun)
    : { storeUpdates: [] };
  const auditLogId = dryRun ? null : id("audit");

  if (auditLogId) {
    state.auditLogs.unshift({
      action: "revenue.business_fleet_gap_acceleration.applied",
      createdAt: now(),
      entry: {
        dryRun: false,
        externalExecution: false,
        includeLaunchPipeline,
        includeListingOptimization,
        includeStoreSetup,
        launchPipeline,
        listingOptimization,
        note: typeof body.note === "string" ? body.note : null,
        providerContacted: false,
        sourceKeys,
        storeSetup,
        stores: stores.map((store) => ({
          businessName: store.businessName,
          id: store.id,
          launchStatus: store.launchStatus
        }))
      },
      entryHash: id("hash"),
      id: auditLogId,
      outcome: "success",
      severity: stores.length > 0 ? "medium" : "low",
      targetId: null,
      targetType: "revenue_business_fleet_gap_acceleration"
    });
  }

  const refreshedFleet = buildMemoryRevenueBusinessFleetScheduler(userId, {});

  return {
    applied: {
      approvalPacketsQueued: Array.isArray(launchPipeline.approvalPackets) ? launchPipeline.approvalPackets.length : 0,
      auditLogId,
      dryRun,
      externalExecution: false,
      launchProductsCreated: Array.isArray(launchPipeline.createdProducts) ? launchPipeline.createdProducts.length : Number(launchPipeline.createdProducts ?? 0),
      launchQueueItems: includeLaunchPipeline ? plans.launchPipeline.queue.length : 0,
      listingExperimentsQueued: includeListingOptimization ? plans.listingOptimization.experiments.length : 0,
      listingProductsUpdated: Array.isArray(listingOptimization.productUpdates) ? listingOptimization.productUpdates.length : 0,
      providerContacted: false,
      sourceKeysTargeted: sourceKeys.length,
      storeSetupRunbooks: includeStoreSetup ? plans.storeSetup.runbooks.length : 0,
      storeSetupUpdates: Array.isArray(storeSetup.storeUpdates) ? storeSetup.storeUpdates.length : 0,
      storesTargeted: stores.length,
      summary: stores.length === 0
        ? "No created business-fleet gap seed stores were found for acceleration."
        : dryRun
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
      launchStatus: store.launchStatus,
      products: state.podProducts.filter((product) => product.storeId === store.id).length,
      sourceKey: sourceKeys.find((sourceKey) => (store.notes ?? "").includes(sourceKey)) ?? null
    }))
  };
}

function memoryRevenueBusinessFleetGapSeedTargets(userId: string, body: Record<string, unknown>) {
  const maxStores = Math.min(25, Math.max(1, Number(body.maxStores ?? 10) || 10));
  const sourceKeys = Array.isArray(body.sourceKeys)
    ? body.sourceKeys.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : typeof body.sourceKeys === "string"
      ? body.sourceKeys.split(",").map((item) => item.trim()).filter(Boolean)
      : [];
  const requestedSourceKeys = new Set(sourceKeys);
  const opportunities = state.revenueOpportunities
    .filter((opportunity) => opportunity.userId === userId && opportunity.storeId)
    .filter((opportunity) => requestedSourceKeys.size > 0
      ? requestedSourceKeys.has(opportunity.sourceKey)
      : opportunity.sourceKey.startsWith("entral-private-revenue-lane-"))
    .slice(0, maxStores);
  const sourceKeys = opportunities.map((opportunity) => opportunity.sourceKey);
  const storeIds = new Set(opportunities.map((opportunity) => opportunity.storeId).filter((storeId): storeId is string => Boolean(storeId)));
  const stores = state.merchStores.filter((store) => store.userId === userId && storeIds.has(store.id));

  return {
    sourceKeys,
    stores
  };
}

function sourceKeyForMemoryFleetGapSeedStore(store: ClientMerchStore, sourceKeys: string[]) {
  return sourceKeys.find((sourceKey) => (store.notes ?? "").includes(sourceKey)) ?? null;
}

function memoryProviderApprovalSnapshot(packet: GrowthApprovalPacketPayload, storeId: string): RevenueLaunchReadinessApprovalSnapshot {
  return {
    createdAt: packet.createdAt,
    id: packet.id,
    packet,
    requestAuditLogId: null,
    reviewAuditLogId: null,
    reviewedAt: null,
    status: "pending",
    storeId
  };
}

function executeMemoryRevenueBusinessFleetLiveLaunchPackage(userId: string, body: Record<string, unknown>) {
  const dryRun = body.dryRun !== false;
  const includeProviderApprovals = body.includeProviderApprovals !== false;
  const includeHandoffPackets = body.includeHandoffPackets !== false;
  const includeOperationsPacks = body.includeOperationsPacks !== false;
  const includeUnapproved = body.includeUnapproved === true;
  const targeted = memoryRevenueBusinessFleetGapSeedTargets(userId, body);
  const stores = targeted.stores;
  const storeIds = stores.map((store) => store.id);
  const products = state.podProducts.filter((product) => storeIds.includes(product.storeId));
  const providerPayloads = stores.map((store) => buildProviderPayloadPackage({
    options: {
      includeUnapproved,
      maxProducts: 5
    },
    products: products.filter((product) => product.storeId === store.id),
    store,
    storeId: store.id
  }));
  const approvalPackets = includeProviderApprovals
    ? providerPayloads.map((providerPackage) => buildProviderPayloadApprovalPacket({
      note: typeof body.note === "string" ? body.note : null,
      package: providerPackage,
      scheduledFor: null,
      storeId: providerPackage.store.storeId
    }))
    : [];
  const queuedApprovalSnapshots: RevenueLaunchReadinessApprovalSnapshot[] = [];
  const providerApprovalAuditLogIds: string[] = [];

  if (includeProviderApprovals && !dryRun) {
    for (const packet of approvalPackets) {
      const providerPackage = providerPayloads.find((item) => item.store.storeId === packet.storeId);
      const auditLogId = id("audit");
      const record: GrowthApprovalPacketRecord = {
        createdAt: now(),
        id: id("growth_packet"),
        mode: packet.mode,
        packet,
        requestAuditLogId: auditLogId,
        scheduledFor: packet.scheduledFor,
        status: "pending",
        storeId: packet.storeId,
        updatedAt: now(),
        userId
      };
      const store = stores.find((item) => item.id === packet.storeId);

      state.growthApprovalPackets.unshift(record);
      state.auditLogs.unshift({
        action: "provider_payload.approval.requested",
        createdAt: now(),
        entry: {
          externalExecution: false,
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
          providerContacted: false,
          source: "revenue.business_fleet_live_launch_package",
          store: store
            ? {
              businessName: store.businessName,
              platform: store.storePlatform,
              podProvider: store.podProvider
            }
            : null
        },
        entryHash: id("hash"),
        id: auditLogId,
        outcome: "success",
        severity: providerPackage && providerPackage.payloadCount > 0 ? "medium" : "low",
        targetId: packet.storeId,
        targetType: "provider_payload_package"
      });
      providerApprovalAuditLogIds.push(auditLogId);
      queuedApprovalSnapshots.push(memoryLaunchReadinessApprovalSnapshot(record));
    }
  } else {
    queuedApprovalSnapshots.push(...approvalPackets.map((packet) => memoryProviderApprovalSnapshot(packet, packet.storeId)));
  }

  const approvals = [
    ...queuedApprovalSnapshots,
    ...state.growthApprovalPackets
      .filter((packet) => packet.userId === userId && storeIds.includes(packet.storeId))
      .map(memoryLaunchReadinessApprovalSnapshot)
  ];
  const maxStores = Math.min(25, Math.max(stores.length, 1));
  const launchPipeline = buildRevenueLaunchPipeline({
    options: {
      maxStores,
      minPortfolioProductsPerStore: 5,
      productCount: 5,
      riskTolerance: "Low"
    },
    products,
    stores
  });
  const storeSetup = buildRevenueStoreSetupPlan({
    options: {
      maxStores
    },
    products,
    stores
  });
  const readinessPlan = buildRevenueLaunchReadinessPlan({
    approvals,
    launchPlan: launchPipeline,
    options: {
      includeApprovalHistory: true,
      maxStores,
      minLaunchReadiness: 70,
      minProviderReadiness: 70
    },
    providerPayloads,
    setupPlan: storeSetup,
    stores: stores.map(memoryLaunchReadinessStoreSnapshot)
  });
  const handoffPlan = includeHandoffPackets
    ? buildRevenueLaunchHandoffPlan({
      approvals,
      options: {
        includeBlocked: true,
        maxBundles: maxStores,
        minConnectorReadiness: 70,
        minLaunchReadiness: 70,
        minProviderReadiness: 70
      },
      persistedPackets: memoryRevenueLaunchHandoffRecords(userId, maxStores * 5),
      providerPayloads,
      readinessPlan
    })
    : null;
  const handoffResult = includeHandoffPackets && handoffPlan
    ? applyMemoryRevenueLaunchHandoff(userId, handoffPlan, dryRun)
    : null;
  const operationsPackPlan = includeOperationsPacks && handoffPlan
    ? buildRevenueLaunchOperationsPackPlan({
      checklistPlan: buildMemoryRevenueLaunchChecklist(userId, {
        includeCompleted: true,
        maxItems: Math.min(maxStores * 5, 100),
        minPriorityScore: 0,
        windowDays: 30
      }),
      handoffPlan,
      options: {
        includeBlocked: true,
        maxPacks: maxStores,
        minConnectorReadiness: 70,
        minLaunchReadiness: 70,
        minProviderReadiness: 70
      }
    })
    : null;
  const selectedOperationsPacks = operationsPackPlan ? selectRevenueLaunchOperationsPacks(operationsPackPlan, storeIds) : [];
  const operationsAuditLogId = !dryRun && operationsPackPlan ? id("audit") : null;

  if (operationsAuditLogId && operationsPackPlan) {
    state.auditLogs.unshift({
      action: "revenue.launch_operations_pack.recorded",
      createdAt: now(),
      entry: {
        blockedExternalActions: operationsPackPlan.blockedExternalActions,
        externalExecution: false,
        note: typeof body.note === "string" ? body.note : null,
        packs: selectedOperationsPacks.map((pack) => ({
          artifactSlots: pack.artifactSlots.length,
          manualSteps: pack.manualSteps.length,
          requestManifests: pack.requestManifests.length,
          status: pack.status,
          storeId: pack.storeId,
          storeName: pack.storeName
        })),
        providerContacted: false,
        source: "revenue.business_fleet_live_launch_package",
        summary: operationsPackPlan.summary
      },
      entryHash: id("hash"),
      id: operationsAuditLogId,
      outcome: "success",
      severity: selectedOperationsPacks.some((pack) => pack.status === "blocked") ? "high" : selectedOperationsPacks.length > 0 ? "medium" : "low",
      targetId: null,
      targetType: "revenue_launch_operations_pack"
    });
  }

  const operationsResult = operationsPackPlan
    ? {
      applied: {
        auditLogId: operationsAuditLogId,
        dryRun,
        externalExecution: false,
        packsRecorded: dryRun ? 0 : selectedOperationsPacks.length,
        packsSelected: selectedOperationsPacks.length,
        providerContacted: false,
        readyPacks: selectedOperationsPacks.filter((pack) => pack.status === "ready_for_manual_launch").length,
        summary: dryRun
          ? `${selectedOperationsPacks.length} targeted launch operations pack${selectedOperationsPacks.length === 1 ? "" : "s"} would be recorded as internal audit artifacts.`
          : `${selectedOperationsPacks.length} targeted launch operations pack${selectedOperationsPacks.length === 1 ? "" : "s"} recorded as internal audit artifacts.`
      },
      plan: operationsPackPlan
    }
    : null;
  const auditLogId = dryRun ? null : id("audit");

  if (auditLogId) {
    state.auditLogs.unshift({
      action: "revenue.business_fleet_live_launch_package.recorded",
      createdAt: now(),
      entry: {
        dryRun: false,
        externalExecution: false,
        handoffRecords: handoffResult?.recordsCreated ?? 0,
        includeHandoffPackets,
        includeOperationsPacks,
        includeProviderApprovals,
        includeUnapproved,
        note: typeof body.note === "string" ? body.note : null,
        operationsPacks: operationsResult?.applied.packsRecorded ?? 0,
        providerApprovalAuditLogIds,
        providerApprovalsQueued: queuedApprovalSnapshots.length,
        providerContacted: false,
        sourceKeys: targeted.sourceKeys,
        stores: stores.map((store) => ({
          businessName: store.businessName,
          id: store.id,
          launchStatus: store.launchStatus,
          sourceKey: sourceKeyForMemoryFleetGapSeedStore(store, targeted.sourceKeys)
        }))
      },
      entryHash: id("hash"),
      id: auditLogId,
      outcome: "success",
      severity: stores.length > 0 ? "medium" : "low",
      targetId: null,
      targetType: "revenue_business_fleet_live_launch_package"
    });
  }

  const refreshedFleet = buildMemoryRevenueBusinessFleetScheduler(userId, {});

  return {
    applied: {
      auditLogId,
      dryRun,
      externalExecution: false,
      handoffRecords: handoffResult?.recordsCreated ?? 0,
      handoffRecordsPreviewed: dryRun ? handoffResult?.recordsToWrite ?? 0 : 0,
      operationsPacksRecorded: operationsResult?.applied.packsRecorded ?? 0,
      operationsPacksSelected: operationsResult?.applied.packsSelected ?? 0,
      providerApprovalPacketsPreviewed: dryRun ? approvalPackets.length : 0,
      providerApprovalPacketsQueued: dryRun ? 0 : queuedApprovalSnapshots.length,
      providerContacted: false,
      providerPayloadsPrepared: providerPayloads.length,
      readyOperationsPacks: operationsResult?.applied.readyPacks ?? 0,
      sourceKeysTargeted: targeted.sourceKeys.length,
      storesTargeted: stores.length,
      summary: stores.length === 0
        ? "No created business-fleet gap seed stores were found for live launch packaging."
        : dryRun
          ? `${stores.length} gap-seeded store${stores.length === 1 ? "" : "s"} previewed for internal live launch packaging.`
          : `${stores.length} gap-seeded store${stores.length === 1 ? "" : "s"} recorded into internal live launch package artifacts.`
    },
    fleet: refreshedFleet.plan,
    plans: {
      handoffPlan,
      launchPipeline,
      operationsPackPlan,
      readinessPlan,
      storeSetup
    },
    providerApprovalSnapshots: queuedApprovalSnapshots,
    providerPayloads,
    results: {
      handoff: handoffResult,
      operationsPack: operationsResult
    },
    targetedStores: stores.map((store) => ({
      businessName: store.businessName,
      id: store.id,
      launchStatus: store.launchStatus,
      products: state.podProducts.filter((product) => product.storeId === store.id).length,
      sourceKey: sourceKeyForMemoryFleetGapSeedStore(store, targeted.sourceKeys)
    }))
  };
}

function memoryUniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function memoryBusinessFleetLaunchGateItem(input: {
  operationsPack: ReturnType<typeof selectRevenueLaunchOperationsPacks>[number] | null;
  readinessItem: RevenueLaunchReadinessPlan["stores"][number] | null;
  sourceKey: string | null;
  store: ClientMerchStore;
}) {
  const { operationsPack, readinessItem, store } = input;
  const providerPayloadCount = readinessItem?.providerPayload.payloadCount ?? 0;
  const providerReadinessScore = readinessItem?.providerPayload.readinessScore ?? 0;
  const launchReadinessScore = readinessItem?.readinessScore ?? 0;
  const blockers = memoryUniqueStrings([
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
    externalExecution: false,
    gateStatus,
    launchReadinessScore,
    launchStatus: store.launchStatus,
    nextInternalAction,
    operationsPackStatus: operationsPack?.status ?? null,
    productCount: state.podProducts.filter((product) => product.storeId === store.id).length,
    providerContacted: false,
    providerPayloadCount,
    providerReadinessScore,
    reason,
    readinessStage: readinessItem?.stage ?? "blocked",
    sourceKey: input.sourceKey,
    storeId: store.id
  };
}

function executeMemoryRevenueBusinessFleetLaunchGate(userId: string, query: Record<string, unknown>) {
  const targeted = memoryRevenueBusinessFleetGapSeedTargets(userId, query);
  const stores = targeted.stores;
  const storeIds = stores.map((store) => store.id);
  const products = state.podProducts.filter((product) => storeIds.includes(product.storeId));
  const maxStores = Math.min(25, Math.max(1, Number(query.maxStores ?? 10) || 10));
  const providerPayloads = stores.map((store) => buildProviderPayloadPackage({
    options: {
      includeUnapproved: false,
      maxProducts: 5
    },
    products: products.filter((product) => product.storeId === store.id),
    store,
    storeId: store.id
  }));
  const approvals = state.growthApprovalPackets
    .filter((packet) => packet.userId === userId && storeIds.includes(packet.storeId))
    .map(memoryLaunchReadinessApprovalSnapshot);
  const launchPipeline = buildRevenueLaunchPipeline({
    options: {
      maxStores,
      minPortfolioProductsPerStore: 5,
      productCount: 5,
      riskTolerance: "Low"
    },
    products,
    stores
  });
  const storeSetup = buildRevenueStoreSetupPlan({
    options: {
      maxStores
    },
    products,
    stores
  });
  const readinessPlan = buildRevenueLaunchReadinessPlan({
    approvals,
    launchPlan: launchPipeline,
    options: {
      includeApprovalHistory: true,
      maxStores,
      minLaunchReadiness: 70,
      minProviderReadiness: 70
    },
    providerPayloads,
    setupPlan: storeSetup,
    stores: stores.map(memoryLaunchReadinessStoreSnapshot)
  });
  const handoffPlan = buildRevenueLaunchHandoffPlan({
    approvals,
    options: {
      includeBlocked: true,
      maxBundles: maxStores,
      minConnectorReadiness: 70,
      minLaunchReadiness: 70,
      minProviderReadiness: 70
    },
    persistedPackets: memoryRevenueLaunchHandoffRecords(userId, maxStores * 5),
    providerPayloads,
    readinessPlan
  });
  const operationsPackPlan = buildRevenueLaunchOperationsPackPlan({
    checklistPlan: buildMemoryRevenueLaunchChecklist(userId, {
      includeCompleted: true,
      maxItems: Math.min(maxStores * 5, 100),
      minPriorityScore: 0,
      windowDays: 30
    }),
    handoffPlan,
    options: {
      includeBlocked: true,
      maxPacks: maxStores,
      minConnectorReadiness: 70,
      minLaunchReadiness: 70,
      minProviderReadiness: 70
    }
  });
  const operationsPacks = selectRevenueLaunchOperationsPacks(operationsPackPlan, storeIds);
  const items = stores.map((store) => memoryBusinessFleetLaunchGateItem({
    operationsPack: operationsPacks.find((pack) => pack.storeId === store.id) ?? null,
    readinessItem: readinessPlan.stores.find((item) => item.store.id === store.id) ?? null,
    sourceKey: sourceKeyForMemoryFleetGapSeedStore(store, targeted.sourceKeys),
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
      blockedExternalActions: memoryUniqueStrings([
        ...readinessPlan.blockedExternalActions,
        ...operationsPackPlan.blockedExternalActions
      ]),
      externalExecution: false,
      generatedAt: now(),
      items,
      mode: "Revenue Business Fleet Launch Gate",
      plans: {
        handoffTotals: handoffPlan.totals,
        operationsPackTotals: operationsPackPlan.totals,
        readinessTotals: readinessPlan.totals
      },
      providerContacted: false,
      statusCounts,
      summary: `${items.length} packaged business lane${items.length === 1 ? "" : "s"} evaluated: ${statusCounts.readyForManualLaunch} ready for manual launch, ${statusCounts.approvalNeeded} need approval, ${statusCounts.repairRequired} need repair, ${statusCounts.blocked} blocked.`,
      targetedSourceKeys: targeted.sourceKeys,
      totals: {
        handoffRecordsOpen: handoffPlan.totals.openPacketRecords,
        operationsPacks: operationsPackPlan.totals.packs,
        operationsReady: operationsPackPlan.totals.readyPacks,
        payloadsPrepared: readinessPlan.totals.payloadsPrepared,
        providerPacketsApproved: readinessPlan.totals.approvedProviderPackets,
        providerPacketsPending: items.filter((item) => item.approvalState.providerApprovalPending).length,
        storesEvaluated: items.length,
        ...statusCounts
      }
    }
  };
}

function memoryBusinessFleetProviderApprovalStatusLabel(status: string) {
  if (status === "approved") return "Approved - execution still locked";
  if (status === "rejected") return "Rejected";
  return "Pending approval";
}

function memoryBusinessFleetProviderApprovalReviewItem(record: GrowthApprovalPacketRecord, store: ClientMerchStore, sourceKey: string | null) {
  if (!isProviderPayloadApprovalPacket(record.packet)) {
    return null;
  }

  const payloadCount = record.packet.providerPayloadPackage.payloadCount;
  const readinessScore = record.packet.providerPayloadPackage.readinessScore;
  const canApprove = record.status === "pending" && payloadCount > 0;
  const canReject = record.status === "pending";
  const nextInternalState = record.status === "approved"
    ? "approved_for_manual_handoff"
    : record.status === "rejected"
      ? "rejected_rebuild_provider_payload"
      : canApprove
        ? "ready_for_batch_approval"
        : "watch_repair_empty_payload";
  const reason = record.status === "approved"
    ? "Provider payload packet is approved internally; external execution remains locked."
    : record.status === "rejected"
      ? "Provider payload packet was rejected and should be rebuilt before handoff."
      : canApprove
        ? `${payloadCount} provider payload draft${payloadCount === 1 ? "" : "s"} are ready for internal approval review.`
        : "Packet is pending but has no provider payload drafts, so it should be watched or repaired before approval.";

  return {
    actionCount: record.packet.actions.length,
    adapterCoverage: record.packet.providerPayloadPackage.adapterCoverage,
    auditLogId: record.requestAuditLogId ?? null,
    blockedActions: record.packet.blockedActions,
    businessName: store.businessName,
    canApprove,
    canReject,
    createdAt: record.createdAt,
    externalExecution: false,
    mode: record.packet.mode,
    nextInternalState,
    packetId: record.id,
    payloadCount,
    providerContacted: false,
    readinessScore,
    reason,
    requestAuditLogId: record.requestAuditLogId ?? null,
    reviewAuditLogId: record.reviewAuditLogId ?? null,
    reviewedAt: record.reviewedAt ?? null,
    reviewedById: record.reviewedById ?? null,
    reviewNote: record.reviewNote ?? null,
    scheduledFor: record.scheduledFor ?? null,
    sourceKey,
    status: record.status,
    statusLabel: memoryBusinessFleetProviderApprovalStatusLabel(record.status),
    storeId: record.storeId,
    summary: record.packet.providerPayloadPackage.summary,
    updatedAt: record.updatedAt
  };
}

function executeMemoryRevenueBusinessFleetProviderApprovalReview(userId: string, query: Record<string, unknown>) {
  const targeted = memoryRevenueBusinessFleetGapSeedTargets(userId, query);
  const maxPackets = Math.min(50, Math.max(1, Number(query.maxPackets ?? 25) || 25));
  const status = typeof query.status === "string" && ["pending", "approved", "rejected", "all"].includes(query.status)
    ? query.status
    : "pending";
  const storeById = new Map(targeted.stores.map((store) => [store.id, store]));
  const sourceKeyByStoreId = new Map(targeted.stores.map((store) => [store.id, sourceKeyForMemoryFleetGapSeedStore(store, targeted.sourceKeys)]));
  const storeIds = new Set(targeted.stores.map((store) => store.id));
  const items = state.growthApprovalPackets
    .filter((packet) => packet.userId === userId && storeIds.has(packet.storeId))
    .filter((packet) => status === "all" || packet.status === status)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((packet) => {
      const store = storeById.get(packet.storeId);

      return store ? memoryBusinessFleetProviderApprovalReviewItem(packet, store, sourceKeyByStoreId.get(packet.storeId) ?? null) : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, maxPackets);
  const totals = {
    approvable: items.filter((item) => item.canApprove).length,
    approved: items.filter((item) => item.status === "approved").length,
    packets: items.length,
    payloads: items.reduce((sum, item) => sum + item.payloadCount, 0),
    pending: items.filter((item) => item.status === "pending").length,
    rejected: items.filter((item) => item.status === "rejected").length,
    storesEvaluated: targeted.stores.length
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
      externalExecution: false,
      generatedAt: now(),
      items,
      mode: "Revenue Business Fleet Provider Approval Review",
      providerContacted: false,
      statusFilter: status,
      summary: `${items.length} provider approval packet${items.length === 1 ? "" : "s"} inspected: ${totals.approvable} approvable, ${totals.pending} pending, ${totals.approved} approved, ${totals.rejected} rejected.`,
      targetedSourceKeys: targeted.sourceKeys,
      totals
    }
  };
}

function executeMemoryRevenueBusinessFleetProviderApprovalReviewApply(userId: string, body: Record<string, unknown>) {
  const action = body.action === "reject" ? "reject" : "approve";
  const dryRun = body.dryRun !== false;
  const maxPackets = Math.min(50, Math.max(1, Number(body.maxPackets ?? 25) || 25));
  const review = executeMemoryRevenueBusinessFleetProviderApprovalReview(userId, {
    ...body,
    maxPackets,
    status: "pending"
  });
  const requestedPacketIds = new Set(Array.isArray(body.packetIds)
    ? body.packetIds.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : []);
  const selectedItems = review.plan.items
    .filter((item) => requestedPacketIds.size === 0 || requestedPacketIds.has(item.packetId))
    .filter((item) => action === "approve" ? item.canApprove : item.canReject)
    .slice(0, maxPackets);
  const selectedPacketIds = new Set(selectedItems.map((item) => item.packetId));
  const actionPastTense = action === "approve" ? "approved" : "rejected";

  if (dryRun) {
    return {
      applied: {
        action,
        auditLogId: null,
        dryRun: true,
        externalExecution: false,
        packetsApproved: 0,
        packetsPreviewed: selectedItems.length,
        packetsRejected: 0,
        packetsSelected: selectedItems.length,
        providerContacted: false,
        summary: `${selectedItems.length} provider approval packet${selectedItems.length === 1 ? "" : "s"} would be ${actionPastTense} internally.`
      },
      launchGate: executeMemoryRevenueBusinessFleetLaunchGate(userId, body).plan,
      plan: review.plan,
      selectedPackets: selectedItems
    };
  }

  const auditLogId = id("audit");
  const reviewedAt = now();
  let updated = 0;

  state.auditLogs.unshift({
    action: action === "approve"
      ? "revenue.business_fleet_provider_approvals.approved"
      : "revenue.business_fleet_provider_approvals.rejected",
    createdAt: now(),
    entry: {
      action,
      externalExecution: false,
      note: typeof body.note === "string" ? body.note : null,
      packetIds: Array.from(selectedPacketIds),
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
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: selectedItems.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_business_fleet_provider_approval_review"
  });

  for (const packet of state.growthApprovalPackets) {
    if (packet.userId === userId && packet.status === "pending" && selectedPacketIds.has(packet.id)) {
      packet.status = actionPastTense;
      packet.reviewAuditLogId = auditLogId;
      packet.reviewedAt = reviewedAt;
      packet.reviewedById = userId;
      packet.reviewNote = typeof body.note === "string" ? body.note : null;
      packet.updatedAt = reviewedAt;
      updated += 1;
    }
  }

  const refreshedReview = executeMemoryRevenueBusinessFleetProviderApprovalReview(userId, {
    ...body,
    maxPackets,
    status: "pending"
  });

  return {
    applied: {
      action,
      auditLogId,
      dryRun: false,
      externalExecution: false,
      packetsApproved: action === "approve" ? updated : 0,
      packetsPreviewed: 0,
      packetsRejected: action === "reject" ? updated : 0,
      packetsSelected: selectedItems.length,
      providerContacted: false,
      summary: `${updated} provider approval packet${updated === 1 ? "" : "s"} ${actionPastTense} internally. External execution remains locked.`
    },
    launchGate: executeMemoryRevenueBusinessFleetLaunchGate(userId, body).plan,
    plan: refreshedReview.plan,
    selectedPackets: selectedItems
  };
}

function executeMemoryRevenueOpportunityControl(userId: string, opportunityId: string, body: Record<string, unknown>) {
  const options = revenueOpportunityControlOptionsFrom(body as Partial<Record<keyof RevenueOpportunityControlOptions, unknown>>);
  const status = body.status as RevenueOpportunityControlStatus;
  const current = buildMemoryRevenueOpportunityControl(userId, {
    ...options,
    includeKilled: true
  });
  const item = current.opportunities.find((opportunity) => opportunity.id === opportunityId);

  if (!item) {
    return null;
  }

  const overrideReadiness = body.overrideReadiness === true || body.overrideReadiness === "true";
  const evaluation = evaluateRevenueOpportunityControlUpdate({
    item,
    overrideReadiness,
    toStatus: status
  });
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;

  if (body.dryRun || !evaluation.allowed) {
    return {
      applied: {
        allowed: evaluation.allowed,
        auditLogId: null,
        blockers: evaluation.blockers,
        dryRun: Boolean(body.dryRun),
        externalExecution: false,
        fromStatus: evaluation.fromStatus,
        note,
        opportunityId: item.id,
        providerContacted: false,
        reason: evaluation.reason,
        toStatus: evaluation.toStatus
      },
      evaluation,
      plan: current
    };
  }

  const auditLogId = id("audit");

  state.auditLogs.unshift({
    action: "revenue.opportunity_control.updated",
    createdAt: now(),
    entry: {
      blockers: item.blockers,
      evaluation,
      externalExecution: false,
      metrics: item.metrics,
      note,
      providerContacted: false,
      readinessScore: item.readinessScore,
      stage: item.stage
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: status === "killed" || status === "blocked" ? "high" : status === "paused" ? "medium" : "low",
    targetId: item.id,
    targetType: "revenue_opportunity_control"
  });

  const index = state.revenueOpportunities.findIndex((opportunity) => opportunity.id === item.id && opportunity.userId === userId);

  if (index !== -1) {
    state.revenueOpportunities[index] = {
      ...state.revenueOpportunities[index],
      auditLogId,
      status,
      updatedAt: now()
    };
  }

  const refreshed = buildMemoryRevenueOpportunityControl(userId, options);

  return {
    applied: {
      allowed: true,
      auditLogId,
      blockers: [],
      dryRun: false,
      externalExecution: false,
      fromStatus: evaluation.fromStatus,
      note,
      opportunityId: item.id,
      providerContacted: false,
      reason: evaluation.reason,
      toStatus: evaluation.toStatus
    },
    evaluation,
    plan: refreshed
  };
}

function browserOperationOptionsFrom(input: Partial<Record<keyof BrowserOperationOptions, unknown>>): Partial<BrowserOperationOptions> {
  const numberValue = (key: keyof BrowserOperationOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };

  return {
    includeCompleted: input.includeCompleted === true || input.includeCompleted === "true",
    maxRecoveryJobs: numberValue("maxRecoveryJobs"),
    staleRunningMinutes: numberValue("staleRunningMinutes"),
    windowHours: numberValue("windowHours")
  };
}

function memoryBrowserJobSnapshot(job: AutomationJob): BrowserOperationJobSnapshot {
  return {
    completedAt: job.status === "completed" || job.status === "failed" || job.status === "canceled" ? job.logs[0]?.createdAt ?? job.createdAt : null,
    createdAt: job.createdAt,
    error: job.error ?? null,
    id: job.id,
    logCount: job.logs.length,
    payload: job.payload,
    resultEngine: job.result?.engine ?? null,
    scheduledAt: job.scheduledAt ?? null,
    startedAt: job.status === "running" ? job.logs[0]?.createdAt ?? job.createdAt : null,
    status: job.status,
    type: job.type,
    updatedAt: job.logs[0]?.createdAt ?? job.createdAt
  };
}

function memoryBrowserConfig(): BrowserOperationConfig {
  return {
    allowedDomains: ["example.com"],
    featureEnabled: true,
    localFallbackEnabled: true,
    maxConcurrency: 2,
    playwrightConfigured: false,
    workerEnabled: true
  };
}

function buildMemoryBrowserOperations(userId: string, options: Partial<BrowserOperationOptions>): BrowserOperationsPlan {
  return buildBrowserOperationsPlan({
    config: memoryBrowserConfig(),
    jobs: state.automationJobs.filter((job) => job.userId === userId).map(memoryBrowserJobSnapshot),
    options
  });
}

function applyMemoryBrowserRecovery(userId: string, plan: BrowserOperationsPlan, options: Partial<BrowserOperationOptions>) {
  const maxRecoveryJobs = options.maxRecoveryJobs ?? 10;
  const recoveryRunbooks = plan.runbooks.filter((runbook) => (
    (runbook.action === "retry_failed_job" || runbook.action === "recover_stale_running_job")
    && runbook.targetId
  )).slice(0, maxRecoveryJobs);
  const requeuedJobIds: string[] = [];
  const staleRecoveredJobIds: string[] = [];

  for (const runbook of recoveryRunbooks) {
    const job = state.automationJobs.find((item) => item.id === runbook.targetId && item.userId === userId);

    if (!job) continue;

    if (runbook.action === "recover_stale_running_job" && job.status === "running") {
      job.status = "failed";
      job.error = "Recovered by Browser Operations Layer after exceeding stale running threshold.";
      job.logs.unshift({
        createdAt: now(),
        id: id("log"),
        level: "warn",
        message: "Browser Operations Layer marked this stale running job as failed for deliberate retry."
      });
      staleRecoveredJobIds.push(job.id);
    }

    if (runbook.action === "retry_failed_job" && (job.status === "failed" || job.status === "canceled")) {
      job.status = "completed";
      job.error = null;
      job.result = {
        content: `Recovered ${job.payload.selector ?? "page"} from ${job.payload.url ?? "target"} in memory mode.`,
        engine: "memory-recovery",
        statusCode: 200,
        title: "Recovered dev scrape result"
      };
      job.logs.unshift({
        createdAt: now(),
        id: id("log"),
        level: "info",
        message: "Browser Operations Layer recovered this job in memory mode."
      });
      requeuedJobIds.push(job.id);
    }
  }

  return {
    recoveryRunbooks: recoveryRunbooks.length,
    requeuedJobIds,
    staleRecoveredJobIds
  };
}

function revenueListingOptionsFrom(input: Partial<Record<keyof RevenueListingOptimizationOptions, unknown>>): Partial<RevenueListingOptimizationOptions> {
  const numberValue = (key: keyof RevenueListingOptimizationOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };

  return {
    includePricingExperiments: input.includePricingExperiments === false || input.includePricingExperiments === "false" ? false : undefined,
    maxPriceIncreasePercent: numberValue("maxPriceIncreasePercent"),
    maxProducts: numberValue("maxProducts"),
    minProfitMargin: numberValue("minProfitMargin"),
    minVisitsForPerformanceExperiment: numberValue("minVisitsForPerformanceExperiment"),
    variantsPerProduct: numberValue("variantsPerProduct"),
    windowDays: numberValue("windowDays")
  };
}

function buildMemoryRevenueListingOptimization(userId: string, options: Partial<RevenueListingOptimizationOptions>) {
  const stores = state.merchStores.filter((store) => store.userId === userId);
  const storeIds = new Set(stores.map((store) => store.id));
  const products = state.podProducts.filter((product) => storeIds.has(product.storeId));
  const performanceDigest = buildMemoryRevenuePerformanceDigest(userId, { windowDays: options.windowDays }).digest;

  return {
    plan: buildRevenueListingOptimizationPlan({
      options,
      performanceDigest,
      products,
      stores
    }),
    products,
    stores
  };
}

function revenueStoreSetupOptionsFrom(input: Partial<Record<keyof RevenueStoreSetupOptions, unknown>>): Partial<RevenueStoreSetupOptions> {
  const numberValue = (key: keyof RevenueStoreSetupOptions) => {
    const value = input[key];
    const parsed = Number(value);
    return value === undefined || value === null || Number.isNaN(parsed) ? undefined : parsed;
  };

  return {
    includeCredentialScopes: input.includeCredentialScopes === false || input.includeCredentialScopes === "false" ? false : undefined,
    maxStores: numberValue("maxStores"),
    minApprovedProducts: numberValue("minApprovedProducts"),
    minConnectorReadiness: numberValue("minConnectorReadiness"),
    minListingReadyProducts: numberValue("minListingReadyProducts")
  };
}

function buildMemoryRevenueStoreSetup(userId: string, options: Partial<RevenueStoreSetupOptions>) {
  const stores = state.merchStores.filter((store) => store.userId === userId);
  const storeIds = new Set(stores.map((store) => store.id));
  const products = state.podProducts.filter((product) => storeIds.has(product.storeId));

  return {
    plan: buildRevenueStoreSetupPlan({
      options,
      products,
      stores
    }),
    products,
    stores
  };
}

function normalizeMemoryPerformanceSnapshot(userId: string, input: RevenuePerformanceSnapshotInput): RevenuePerformanceSnapshot {
  const normalized = normalizeRevenuePerformanceSnapshot({
    ...input,
    id: id("performance"),
    netProfit: input.netProfit ?? calculateRevenuePerformanceNetProfit(input)
  });

  return {
    ...normalized,
    createdAt: now(),
    userId
  };
}

function validateMemoryPerformanceSnapshots(userId: string, snapshots: RevenuePerformanceSnapshotInput[]) {
  const storeIds = new Set(state.merchStores.filter((store) => store.userId === userId).map((store) => store.id));
  const productsById = new Map(state.podProducts
    .filter((product) => storeIds.has(product.storeId))
    .map((product) => [product.id, product]));

  for (const snapshot of snapshots) {
    if (!storeIds.has(snapshot.storeId)) {
      return "One or more performance snapshots target a merch store that was not found.";
    }

    if (snapshot.productId) {
      const product = productsById.get(snapshot.productId);

      if (!product || product.storeId !== snapshot.storeId) {
        return "One or more performance snapshots target a product outside the selected store.";
      }
    }
  }

  return null;
}

function rollupMemoryPerformanceStores(userId: string, storeIds: string[]) {
  for (const storeId of Array.from(new Set(storeIds))) {
    const snapshots = state.revenuePerformanceSnapshots.filter((snapshot) => snapshot.userId === userId && snapshot.storeId === storeId);
    const index = state.merchStores.findIndex((store) => store.userId === userId && store.id === storeId);

    if (index !== -1) {
      state.merchStores[index] = normalizeMerchStoreBody({
        estimatedProfit: snapshots.reduce((sum, snapshot) => sum + snapshot.netProfit, 0),
        revenue: snapshots.reduce((sum, snapshot) => sum + snapshot.grossRevenue, 0)
      }, userId, state.merchStores[index]);
    }
  }
}

function normalizePodProductBody(body: Partial<PodProduct>, existing?: PodProduct): PodProduct {
  const timestamp = now();

  return {
    aiDisclosureNeeded: body.aiDisclosureNeeded ?? existing?.aiDisclosureNeeded ?? false,
    colorDirection: body.colorDirection ?? existing?.colorDirection ?? "Color direction pending",
    complianceNotes: body.complianceNotes ?? existing?.complianceNotes ?? formatComplianceNotes(body),
    createdAt: existing?.createdAt ?? timestamp,
    designConcept: body.designConcept ?? existing?.designConcept ?? "Design concept pending",
    designPrompt: body.designPrompt ?? existing?.designPrompt ?? "Design prompt pending",
    designTheme: body.designTheme ?? existing?.designTheme ?? "Design theme pending",
    estimatedPlatformFees: Number(body.estimatedPlatformFees ?? existing?.estimatedPlatformFees ?? 0),
    estimatedProfit: Number(body.estimatedProfit ?? existing?.estimatedProfit ?? 0),
    id: existing?.id ?? id("pod_product"),
    listingDescription: body.listingDescription ?? existing?.listingDescription ?? null,
    listingTitle: body.listingTitle ?? existing?.listingTitle ?? null,
    mockupNotes: body.mockupNotes ?? existing?.mockupNotes ?? null,
    productName: body.productName ?? existing?.productName ?? "Untitled POD Product",
    productType: body.productType ?? existing?.productType ?? "Product type pending",
    productionPartnerDisclosureNeeded: body.productionPartnerDisclosureNeeded ?? existing?.productionPartnerDisclosureNeeded ?? false,
    profitMargin: Number(body.profitMargin ?? existing?.profitMargin ?? 0),
    retailPrice: Number(body.retailPrice ?? existing?.retailPrice ?? 0),
    shippingCost: Number(body.shippingCost ?? existing?.shippingCost ?? 0),
    status: body.status ?? existing?.status ?? "Idea",
    storeId: body.storeId ?? existing?.storeId ?? "",
    supplierCost: Number(body.supplierCost ?? existing?.supplierCost ?? 0),
    tags: body.tags ?? existing?.tags ?? [],
    targetAudience: body.targetAudience ?? existing?.targetAudience ?? "Target audience pending",
    typographyDirection: body.typographyDirection ?? existing?.typographyDirection ?? "Typography direction pending",
    updatedAt: timestamp
  };
}

function seedDemo() {
  defaultPolicy();
  const user = createUser({ email: "demo@entral.local", name: "Demo User" });
  const team = teamsForUser(user.id)[0];

  if (state.tasks.length === 0 && team) {
    state.tasks.push({
      createdAt: now(),
      description: "This in-memory backend is ready for local testing.",
      id: id("task"),
      status: "TODO",
      team: { id: team.id, name: team.name },
      teamId: team.id,
      title: "Try the local dev backend",
      userId: user.id
    });
  }
}

await app.register(cookie);
await app.register(cors, {
  credentials: true,
  origin: true
});

app.setErrorHandler((error, _request, reply) => {
  const statusCode = "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
  const message = statusCode >= 500 ? "Something went wrong." : error.message;
  return reply.code(statusCode).send({
    error: statusCode >= 500 ? "Internal Server Error" : "Request Error",
    message
  });
});

app.get("/health", async () => ({
  mode: "memory",
  ok: true,
  service: "entral-memory-backend",
  timestamp: new Date().toISOString(),
  uptimeSeconds: Math.round(process.uptime())
}));
app.get("/api/v1/health", async () => ({
  mode: "memory",
  ok: true,
  service: "entral-memory-backend",
  timestamp: new Date().toISOString(),
  uptimeSeconds: Math.round(process.uptime())
}));

app.post("/api/v1/signup", async (request, reply) => {
  const body = request.body as { email?: string; name?: string; password?: string };
  const user = createUser({
    email: body.email ?? "demo@entral.local",
    name: body.name,
    password: body.password
  });
  const team = teamsForUser(user.id)[0];
  setSession(reply, user);

  return reply.code(201).send({
    email: user.email,
    id: user.id,
    team,
    user: publicUser(user)
  });
});

app.post("/api/v1/login", async (request, reply) => {
  const body = request.body as { email?: string; password?: string };
  const email = body.email ?? "demo@entral.local";
  const user = [...state.users.values()].find((item) => item.email === email.toLowerCase())
    ?? createUser({ email, name: email.split("@")[0], password: body.password });

  if (body.password && user.password !== body.password) {
    user.password = body.password;
  }

  const token = setSession(reply, user);
  return reply.send({ token, user: publicUser(user) });
});

app.post("/api/v1/logout", async (_request, reply) => {
  clearSession(reply);
  return reply.send({ ok: true });
});

app.get("/api/v1/me", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  return {
    teams: teamsForUser(user.id),
    user: publicUser(user)
  };
});

app.get("/api/v1/account/export", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const exportData = buildMemoryAccountExport(user);
  state.auditLogs.unshift({
    action: "account.data_exported",
    createdAt: now(),
    entry: {
      mode: "real",
      summary: exportData.summary,
      userId: user.id
    },
    entryHash: id("hash"),
    id: id("audit"),
    outcome: "success",
    severity: "low",
    targetId: user.id,
    targetType: "account"
  });

  return reply
    .header("content-disposition", `attachment; filename="entral-account-export-${user.id}.json"`)
    .send(exportData);
});

app.delete("/api/v1/account", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as { confirmation?: string; password?: string };

  if (body.confirmation !== accountDeletionConfirmation || body.password !== user.password) {
    return reply.code(401).send({ error: "Unauthorized", message: "Password confirmation failed." });
  }

  const exportData = buildMemoryAccountExport(user);
  state.auditLogs.unshift({
    action: "account.deletion_confirmed",
    createdAt: now(),
    entry: {
      email: user.email,
      mode: "real",
      summary: exportData.summary,
      userId: user.id
    },
    entryHash: id("hash"),
    id: id("audit"),
    outcome: "success",
    severity: "high",
    targetId: user.id,
    targetType: "account"
  });

  deleteMemoryAccount(user.id);
  clearSession(reply);
  return reply.send({ ok: true, message: "Account and personal workspace data deleted." });
});

app.get("/api/v1/dashboard", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const teams = teamsForUser(user.id);
  const teamIds = teams.map((team) => team.id);
  const tasks = state.tasks.filter((task) => teamIds.includes(task.teamId));
  const agents = [...state.agents.values()].filter((agent) => agent.userId === user.id);
  const agentActivity = agents.flatMap((agent) => state.agentLogs.get(agent.id) ?? []).slice(-10).reverse();

  return {
    agentActivity: agentActivity.map((log) => ({
      ...log,
      agentName: agents.find((agent) => (state.agentLogs.get(agent.id) ?? []).some((item) => item.id === log.id))?.name ?? "Agent",
      result: null,
      taskStatus: null,
      taskTitle: null
    })),
    awaySummary: {
      completedAgentTaskCount: 0,
      since: null,
      summaries: []
    },
    message: `Welcome, ${publicUser(user).name}`,
    tasks,
    teams,
    user: publicUser(user)
  };
});

app.get("/api/v1/command-os/state", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  return { snapshot: state.commandSnapshots.get(user.id) ?? null };
});

app.put("/api/v1/command-os/state", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const body = request.body as { source?: string; state?: Record<string, unknown> };
  const existing = state.commandSnapshots.get(user.id);
  const timestamp = now();
  const snapshot: CommandOSSnapshot = {
    createdAt: existing?.createdAt ?? timestamp,
    id: existing?.id ?? id("command-snapshot"),
    source: body.source ?? "dashboard",
    state: body.state ?? {},
    stateVersion: (existing?.stateVersion ?? 0) + 1,
    updatedAt: timestamp,
    userId: user.id
  };

  state.commandSnapshots.set(user.id, snapshot);
  return { reportCount: 0, snapshot };
});

app.get("/api/v1/tasks", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const teamIds = teamsForUser(user.id).map((team) => team.id);
  const items = state.tasks.filter((task) => teamIds.includes(task.teamId));
  return {
    items,
    page: 1,
    pageSize: 20,
    total: items.length
  };
});

app.post("/api/v1/tasks", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as { description?: string; status?: Task["status"]; teamId?: string; title?: string };
  const team = teamsForUser(user.id).find((item) => item.id === body.teamId) ?? teamsForUser(user.id)[0];

  if (!team) {
    return reply.code(403).send({ error: "Forbidden", message: "No team is available." });
  }

  const task: Task = {
    createdAt: now(),
    description: body.description ?? null,
    id: id("task"),
    status: body.status ?? "TODO",
    team: { id: team.id, name: team.name },
    teamId: team.id,
    title: body.title ?? "Untitled task",
    userId: user.id
  };
  state.tasks.unshift(task);
  return reply.code(201).send({ task });
});

app.get("/api/v1/merch/stores", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const query = request.query as {
    approvalStatus?: ClientMerchStore["approvalStatus"];
    launchStatus?: ClientMerchStore["launchStatus"];
    page?: string;
    pageSize?: string;
    search?: string;
  };
  const page = Math.max(Number(query.page ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize ?? 20), 1), 100);
  const search = query.search?.trim().toLowerCase();
  const filtered = state.merchStores.filter((store) => {
    if (store.userId !== user.id) return false;
    if (query.approvalStatus && store.approvalStatus !== query.approvalStatus) return false;
    if (query.launchStatus && store.launchStatus !== query.launchStatus) return false;
    if (!search) return true;

    return [
      store.clientName,
      store.businessName,
      store.contactName,
      store.email,
      store.industry
    ].some((value) => value.toLowerCase().includes(search));
  });
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    items: items.map(publicMerchStore),
    page,
    pageSize,
    total: filtered.length
  };
});

app.post("/api/v1/merch/stores", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const store = normalizeMerchStoreBody(request.body as Partial<ClientMerchStore>, user.id);
  state.merchStores.unshift(store);
  return reply.code(201).send({ store: publicMerchStore(store) });
});

app.post("/api/v1/merch/revenue-engine/opportunity-factory", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Record<string, unknown>;

  if (body.confirm !== "CREATE INTERNAL REVENUE OPPORTUNITY") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with CREATE INTERNAL REVENUE OPPORTUNITY before creating internal revenue opportunity records."
    });
  }

  if (typeof body.idea !== "string" || body.idea.trim().length < 10) {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Provide a revenue opportunity idea with at least 10 characters."
    });
  }

  return executeMemoryRevenueOpportunityFactory(user.id, body);
});

app.get("/api/v1/merch/revenue-engine/opportunities/control", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const plan = buildMemoryRevenueOpportunityControl(
    user.id,
    revenueOpportunityControlOptionsFrom(request.query as Partial<Record<keyof RevenueOpportunityControlOptions, unknown>>)
  );

  return { plan };
});

app.post("/api/v1/merch/revenue-engine/opportunities/:opportunityId/control", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const params = request.params as { opportunityId: string };
  const body = request.body as Record<string, unknown>;

  if (body.confirm !== "UPDATE INTERNAL REVENUE OPPORTUNITY CONTROL") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with UPDATE INTERNAL REVENUE OPPORTUNITY CONTROL before changing opportunity control status."
    });
  }

  if (!revenueOpportunityControlStatuses.includes(body.status as RevenueOpportunityControlStatus)) {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Provide a valid internal opportunity control status."
    });
  }

  const response = executeMemoryRevenueOpportunityControl(user.id, params.opportunityId, body);

  if (!response) {
    return reply.code(404).send({
      error: "Not Found",
      message: "Revenue opportunity was not found."
    });
  }

  if (!response.applied.allowed && !body.dryRun) {
    return reply.code(409).send(response);
  }

  return response;
});

app.get("/api/v1/merch/revenue-engine/portfolio", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);

  return {
    portfolio: buildMemoryRevenueAssetPortfolio(user.id, revenueThresholdsFrom(request.query as Partial<Record<keyof RevenueEngineThresholds, unknown>>))
  };
});

app.get("/api/v1/merch/revenue-engine/business-fleet-scheduler", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const context = buildMemoryRevenueBusinessFleetScheduler(
    user.id,
    revenueBusinessFleetOptionsFrom(request.query as Partial<Record<keyof RevenueBusinessFleetOptions, unknown>>)
  );

  return { plan: context.plan };
});

app.get("/api/v1/merch/revenue-engine/business-fleet-scheduler/launch-gap", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const context = buildMemoryRevenueBusinessFleetScheduler(
    user.id,
    revenueBusinessFleetOptionsFrom(request.query as Partial<Record<keyof RevenueBusinessFleetOptions, unknown>>)
  );

  return {
    plan: buildRevenueBusinessFleetLaunchGapPlan({
      plan: context.plan
    })
  };
});

app.post("/api/v1/merch/revenue-engine/business-fleet-scheduler/launch-gap/seeds/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = (request.body ?? {}) as Record<string, unknown>;

  if (body.confirm !== "CREATE INTERNAL BUSINESS FLEET GAP SEEDS") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with CREATE INTERNAL BUSINESS FLEET GAP SEEDS before creating internal business-fleet gap seeds."
    });
  }

  return executeMemoryRevenueBusinessFleetGapSeeds(user.id, body);
});

app.post("/api/v1/merch/revenue-engine/business-fleet-scheduler/launch-gap/acceleration/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = (request.body ?? {}) as Record<string, unknown>;

  if (body.confirm !== "RUN INTERNAL BUSINESS FLEET GAP ACCELERATION") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with RUN INTERNAL BUSINESS FLEET GAP ACCELERATION before accelerating internal business-fleet gap seeds."
    });
  }

  return executeMemoryRevenueBusinessFleetGapAcceleration(user.id, body);
});

app.post("/api/v1/merch/revenue-engine/business-fleet-scheduler/launch-gap/live-package/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = (request.body ?? {}) as Record<string, unknown>;

  if (body.confirm !== "RECORD INTERNAL BUSINESS FLEET LIVE LAUNCH PACKAGE") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with RECORD INTERNAL BUSINESS FLEET LIVE LAUNCH PACKAGE before recording internal live launch package artifacts."
    });
  }

  return executeMemoryRevenueBusinessFleetLiveLaunchPackage(user.id, body);
});

app.get("/api/v1/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-gate", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);

  return executeMemoryRevenueBusinessFleetLaunchGate(user.id, request.query as Record<string, unknown>);
});

app.get("/api/v1/merch/revenue-engine/business-fleet-scheduler/launch-gap/provider-approval-review", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);

  return executeMemoryRevenueBusinessFleetProviderApprovalReview(user.id, request.query as Record<string, unknown>);
});

app.post("/api/v1/merch/revenue-engine/business-fleet-scheduler/launch-gap/provider-approval-review/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = (request.body ?? {}) as Record<string, unknown>;

  if (body.confirm !== "REVIEW INTERNAL BUSINESS FLEET PROVIDER APPROVALS") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with REVIEW INTERNAL BUSINESS FLEET PROVIDER APPROVALS before reviewing internal provider approval packets."
    });
  }

  return executeMemoryRevenueBusinessFleetProviderApprovalReviewApply(user.id, body);
});

app.post("/api/v1/merch/revenue-engine/business-fleet-scheduler/launch-wave/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = (request.body ?? {}) as Partial<Record<keyof RevenueBusinessFleetOptions, unknown>> & {
    businessIds?: string[];
    confirm?: string;
    dryRun?: boolean;
    note?: string;
  };

  if (body.confirm !== "RUN INTERNAL BUSINESS FLEET LAUNCH WAVE") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with RUN INTERNAL BUSINESS FLEET LAUNCH WAVE before running the internal business fleet launch wave."
    });
  }

  const options = revenueBusinessFleetOptionsFrom(body);
  const context = buildMemoryRevenueBusinessFleetScheduler(user.id, options);
  const selection = selectRevenueBusinessFleetLaunchWave({
    firstBusinessLaunchPlan: context.firstBusinessLaunchContext.plan,
    plan: context.plan,
    selectedBusinessIds: Array.isArray(body.businessIds) ? body.businessIds : []
  });

  if (selection.sprintActionIds.length === 0) {
    return {
      dispatched: {
        actionsBlocked: 0,
        actionsDispatched: 0,
        actionsPreviewed: 0,
        actionsSelected: 0,
        actionsSkipped: selection.skipped.length,
        dryRun: body.dryRun !== false,
        externalExecution: false,
        providerContacted: false,
        results: [],
        summary: selection.summary
      },
      firstBusinessLaunch: context.firstBusinessLaunchContext.plan,
      fleet: context.plan,
      selectedSprintActionIds: [],
      selection,
      sprint: context.firstBusinessLaunchContext.sprint
    };
  }

  const response = applyMemoryRevenueFirstBusinessLaunch(user.id, {
    dryRun: body.dryRun !== false,
    maxCandidates: Math.min(25, Math.max(selection.sprintActionIds.length, Number(options.launchWaveSize ?? 10) || 10)),
    note: body.note,
    sprintActionIds: selection.sprintActionIds
  });
  const refreshed = body.dryRun === false ? buildMemoryRevenueBusinessFleetScheduler(user.id, options) : context;

  return {
    dispatched: response.dispatched,
    firstBusinessLaunch: response.plan,
    fleet: refreshed.plan,
    selectedSprintActionIds: selection.sprintActionIds,
    selection,
    sprint: response.sprint
  };
});

app.get("/api/v1/merch/revenue-engine/asset-controls", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);

  return {
    ledger: buildMemoryRevenueAssetControlLedger(user.id, request.query as Record<string, unknown>)
  };
});

app.get("/api/v1/merch/revenue-engine/asset-controls/recovery", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const query = request.query as Record<string, unknown>;
  const limitValue = Number(query.limit ?? 50);
  const staleAfterDaysValue = Number(query.staleAfterDays ?? 14);

  return {
    recovery: buildRevenueAssetControlRecoveryPlan({
      includeResolved: query.includeResolved === true || query.includeResolved === "true",
      ledger: buildMemoryRevenueAssetControlLedger(user.id, { limit: 250 }),
      limit: Number.isFinite(limitValue) ? limitValue : 50,
      portfolio: buildMemoryRevenueAssetPortfolio(user.id, {}),
      staleAfterDays: Number.isFinite(staleAfterDaysValue) ? staleAfterDaysValue : 14
    })
  };
});

app.get("/api/v1/merch/revenue-engine/dashboard", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);

  return {
    dashboard: buildMemoryRevenuePortfolioDashboard(user.id)
  };
});

app.post("/api/v1/merch/revenue-engine/portfolio/action", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof RevenueEngineThresholds, unknown>> & {
    action?: "scale" | "watch" | "pause" | "kill";
    assetId?: string;
    assetType?: "product" | "store";
    confirm?: string;
    dryRun?: boolean;
  };

  if (body.confirm !== "APPLY INTERNAL ASSET ACTION") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with APPLY INTERNAL ASSET ACTION before applying an internal asset action."
    });
  }

  if (!body.action || !["scale", "watch", "pause", "kill"].includes(body.action) || !body.assetId || !body.assetType) {
    return reply.code(400).send({
      error: "Bad Request",
      message: "assetId, assetType, and a scale/watch/pause/kill action are required."
    });
  }

  const portfolio = buildMemoryRevenueAssetPortfolio(user.id, revenueThresholdsFrom(body));
  const control = buildRevenueAssetControlPlan({
    action: body.action,
    assetId: body.assetId,
    assetType: body.assetType,
    portfolio
  });

  if (!control) {
    return reply.code(404).send({
      error: "Not Found",
      message: "Revenue asset was not found in the current portfolio."
    });
  }

  const productUpdates = control.change?.targetType === "product" ? [control.change] : [];
  const storeUpdates = control.change?.targetType === "store" ? [control.change] : [];

  if (!body.dryRun) {
    const ownedStoreIds = new Set(state.merchStores.filter((store) => store.userId === user.id).map((store) => store.id));

    for (const change of productUpdates) {
      const nextStatus = memoryProductStatus(change.toStatus);
      const index = state.podProducts.findIndex((product) => product.id === change.targetId && ownedStoreIds.has(product.storeId));

      if (nextStatus && index !== -1) {
        state.podProducts[index] = normalizePodProductBody({ status: nextStatus }, state.podProducts[index]);
      }
    }

    for (const change of storeUpdates) {
      const nextStatus = memoryLaunchStatus(change.toStatus);
      const index = state.merchStores.findIndex((store) => store.id === change.targetId && store.userId === user.id);

      if (nextStatus && index !== -1) {
        state.merchStores[index] = normalizeMerchStoreBody({ launchStatus: nextStatus }, user.id, state.merchStores[index]);
      }
    }

    state.auditLogs.unshift({
      action: "revenue.asset_control.applied",
      createdAt: now(),
      entry: {
        action: body.action,
        assetId: body.assetId,
        assetName: control.asset.assetName,
        assetType: body.assetType,
        auditOnly: control.auditOnly,
        change: control.change,
        controlReview: control.controlReview,
        dryRun: false,
        externalExecution: false,
        providerContacted: false,
        reason: control.reason,
        warnings: control.warnings
      },
      entryHash: id("hash"),
      id: id("audit"),
      outcome: "success",
      severity: body.action === "kill" ? "high" : body.action === "pause" || body.action !== control.asset.recommendation ? "medium" : "low",
      targetId: body.assetId,
      targetType: "revenue_asset_control"
    });
    rememberMemoryRevenueAssetControls(user.id, [control], state.auditLogs[0]?.id ?? null);
  }

  return {
    applied: {
      action: body.action,
      auditLogId: body.dryRun ? null : state.auditLogs[0]?.id ?? null,
      auditOnly: control.auditOnly,
      dryRun: Boolean(body.dryRun),
      externalExecution: false,
      productUpdates,
      providerContacted: false,
      statusChangeRequired: control.statusChangeRequired,
      storeUpdates
    },
    control,
    portfolio: buildMemoryRevenueAssetPortfolio(user.id, revenueThresholdsFrom(body))
  };
});

app.post("/api/v1/merch/revenue-engine/portfolio/actions", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof RevenueEngineThresholds, unknown>> & {
    actions?: Array<{
      action?: "scale" | "watch" | "pause" | "kill";
      assetId?: string;
      assetType?: "product" | "store";
    }>;
    confirm?: string;
    dryRun?: boolean;
  };

  if (body.confirm !== "APPLY INTERNAL ASSET BATCH") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with APPLY INTERNAL ASSET BATCH before applying internal asset batch actions."
    });
  }

  const actions = (body.actions ?? [])
    .filter((action): action is { action: "scale" | "watch" | "pause" | "kill"; assetId: string; assetType: "product" | "store" } => {
      const actionKind = action.action;
      return Boolean(
        (actionKind === "scale" || actionKind === "watch" || actionKind === "pause" || actionKind === "kill")
        && action.assetId
        && action.assetType
      );
    });

  if (actions.length === 0) {
    return reply.code(400).send({
      error: "Bad Request",
      message: "At least one selected scale/watch/pause/kill asset action is required."
    });
  }

  const portfolio = buildMemoryRevenueAssetPortfolio(user.id, revenueThresholdsFrom(body));
  const batch = buildRevenueAssetBatchControlPlan({
    portfolio,
    selections: actions
  });

  if (batch.controls.length === 0) {
    return reply.code(404).send({
      batch,
      error: "Not Found",
      message: "No selected revenue assets were found in the current portfolio."
    });
  }

  let auditLogId: string | null = null;

  if (!body.dryRun) {
    const ownedStoreIds = new Set(state.merchStores.filter((store) => store.userId === user.id).map((store) => store.id));

    for (const change of batch.productUpdates) {
      const nextStatus = memoryProductStatus(change.toStatus);
      const index = state.podProducts.findIndex((product) => product.id === change.targetId && ownedStoreIds.has(product.storeId));

      if (nextStatus && index !== -1) {
        state.podProducts[index] = normalizePodProductBody({ status: nextStatus }, state.podProducts[index]);
      }
    }

    for (const change of batch.storeUpdates) {
      const nextStatus = memoryLaunchStatus(change.toStatus);
      const index = state.merchStores.findIndex((store) => store.id === change.targetId && store.userId === user.id);

      if (nextStatus && index !== -1) {
        state.merchStores[index] = normalizeMerchStoreBody({ launchStatus: nextStatus }, user.id, state.merchStores[index]);
      }
    }

    auditLogId = id("audit");
    state.auditLogs.unshift({
      action: "revenue.asset_batch_control.applied",
      createdAt: now(),
      entry: {
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
      entryHash: id("hash"),
      id: auditLogId,
      outcome: "success",
      severity: batch.totals.kill > 0 ? "high" : batch.totals.pause > 0 || batch.warnings.length > 0 ? "medium" : "low",
      targetId: null,
      targetType: "revenue_asset_batch_control"
    });
    rememberMemoryRevenueAssetControls(user.id, batch.controls, auditLogId);
  }

  return {
    applied: {
      actions: batch.controls.length,
      auditLogId,
      auditOnly: batch.auditOnly,
      dryRun: Boolean(body.dryRun),
      externalExecution: false,
      productUpdates: batch.productUpdates,
      providerContacted: false,
      skipped: batch.skipped,
      statusChangeRequired: batch.statusChangeRequired,
      storeUpdates: batch.storeUpdates
    },
    batch,
    portfolio: buildMemoryRevenueAssetPortfolio(user.id, revenueThresholdsFrom(body))
  };
});

app.get("/api/v1/merch/portfolio-command-center", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const { plan } = buildMemoryPortfolioCommandCenter(
    user.id,
    portfolioCommandOptionsFrom(request.query as Partial<Record<keyof PortfolioCommandCenterOptions, unknown>>)
  );

  return { plan };
});

app.post("/api/v1/merch/portfolio-command-center/actions/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof PortfolioCommandCenterOptions, unknown>> & {
    confirm?: string;
    dryRun?: boolean;
  };

  if (body.confirm !== "APPLY INTERNAL PORTFOLIO COMMAND ACTIONS") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with APPLY INTERNAL PORTFOLIO COMMAND ACTIONS before recording portfolio command actions."
    });
  }

  const { assetPortfolio, plan } = buildMemoryPortfolioCommandCenter(user.id, portfolioCommandOptionsFrom(body));

  if (body.dryRun) {
    const assetControlBatch = buildRevenueAssetControlsFromPortfolioCommands({
      plan,
      portfolio: assetPortfolio
    });

    return {
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
        productUpdates: plan.commandActions
          .filter((command) => command.targetType === "product" && memoryProductStatus(command.recommendedStatus))
          .map((command) => ({
            action: command.action,
            fromStatus: null,
            productId: command.targetId,
            productName: command.targetName,
            toStatus: command.recommendedStatus
          })),
        providerContacted: false,
        storeUpdates: plan.commandActions
          .filter((command) => command.targetType === "store" && memoryLaunchStatus(command.recommendedStatus))
          .map((command) => ({
            action: command.action,
            fromStatus: null,
            storeId: command.targetId,
            storeName: command.targetName,
            toStatus: command.recommendedStatus
          }))
      },
      plan
    };
  }

  const applied = applyMemoryPortfolioCommandCenter(user.id, plan, assetPortfolio);
  const refreshed = buildMemoryPortfolioCommandCenter(user.id, portfolioCommandOptionsFrom(body));

  return {
    applied: {
      ...applied,
      dryRun: false,
      externalExecution: false
    },
    plan: refreshed.plan
  };
});

app.get("/api/v1/merch/revenue-engine/autopilot", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const { plan } = buildMemoryRevenueAutopilot(
    user.id,
    revenueAutopilotOptionsFrom(request.query as Partial<Record<keyof RevenueAutopilotOptions, unknown>>)
  );

  return { plan };
});

app.post("/api/v1/merch/revenue-engine/autopilot/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof RevenueAutopilotOptions, unknown>> & {
    confirm?: string;
    dryRun?: boolean;
  };

  if (body.confirm !== "RUN INTERNAL REVENUE AUTOPILOT") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with RUN INTERNAL REVENUE AUTOPILOT before recording revenue autopilot commands."
    });
  }

  const { plan } = buildMemoryRevenueAutopilot(user.id, revenueAutopilotOptionsFrom(body));

  if (body.dryRun) {
    return {
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
    };
  }

  const applied = applyMemoryRevenueAutopilot(user.id, plan);
  const refreshed = buildMemoryRevenueAutopilot(user.id, revenueAutopilotOptionsFrom(body));

  return {
    applied: {
      ...applied,
      dryRun: false,
      externalExecution: false,
      readyActions: plan.totals.readyActions
    },
    plan: refreshed.plan
  };
});

app.post("/api/v1/merch/revenue-engine/autopilot/execute", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof RevenueAutopilotOptions, unknown>> & {
    actions?: unknown;
    confirm?: string;
    dryRun?: boolean;
    includeAssetBatchActions?: boolean;
    includeDraftCreation?: boolean;
    includeLaunchApprovalPackets?: boolean;
    maxSteps?: number | string;
  };

  if (body.confirm !== "EXECUTE INTERNAL REVENUE AUTOPILOT STEPS") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with EXECUTE INTERNAL REVENUE AUTOPILOT STEPS before executing revenue autopilot internal steps."
    });
  }

  return executeMemoryRevenueAutopilot(user.id, body);
});

app.get("/api/v1/merch/revenue-engine/performance", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const { digest } = buildMemoryRevenuePerformanceDigest(
    user.id,
    revenuePerformanceOptionsFrom(request.query as Partial<Record<keyof RevenuePerformanceOptions | "source" | "storeId", unknown>>)
  );

  return { digest };
});

app.get("/api/v1/merch/revenue-engine/signal-connectors", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const plan = buildMemoryRevenueSignalConnectors(
    user.id,
    revenueSignalConnectorOptionsFrom(request.query as Partial<Record<keyof RevenueSignalConnectorOptions, unknown>>)
  );

  return { plan };
});

app.post("/api/v1/merch/revenue-engine/signal-connectors/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof RevenueSignalConnectorOptions, unknown>> & {
    confirm?: string;
    dryRun?: boolean;
    manifestIds?: string[];
    note?: string;
  };

  if (body.confirm !== revenueSignalConnectorConfirmation) {
    return reply.code(400).send({
      error: "Bad Request",
      message: `Confirm with ${revenueSignalConnectorConfirmation} before recording read-only connector manifests.`
    });
  }

  return applyMemoryRevenueSignalConnectors(user.id, body);
});

app.get("/api/v1/merch/revenue-engine/signal-connectors/approvals", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const plan = buildMemoryRevenueSignalConnectorApprovals(
    user.id,
    revenueSignalConnectorApprovalOptionsFrom(request.query as Partial<Record<keyof RevenueSignalConnectorOptions | "includeArchived" | "maxRecords", unknown>>)
  );

  return { plan };
});

app.post("/api/v1/merch/revenue-engine/signal-connectors/approvals/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof RevenueSignalConnectorOptions | "includeArchived" | "maxRecords", unknown>> & {
    confirm?: string;
    dryRun?: boolean;
    manifestIds?: string[];
    note?: string;
  };

  if (body.confirm !== revenueSignalConnectorApprovalConfirmation) {
    return reply.code(400).send({
      error: "Bad Request",
      message: `Confirm with ${revenueSignalConnectorApprovalConfirmation} before queuing read-only connector approvals.`
    });
  }

  return applyMemoryRevenueSignalConnectorApprovals(user.id, body);
});

app.post("/api/v1/merch/revenue-engine/signal-connectors/approvals/:approvalId/review", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const params = request.params as { approvalId?: string };
  const body = request.body as {
    action?: "approve" | "reject";
    confirm?: string;
    note?: string;
  };
  const expectedConfirmation = body.action === "reject"
    ? revenueSignalConnectorRejectConfirmation
    : revenueSignalConnectorApproveConfirmation;

  if (body.confirm !== expectedConfirmation) {
    return reply.code(400).send({
      error: "Bad Request",
      message: `Confirm with ${expectedConfirmation} before reviewing this connector approval.`
    });
  }

  const response = reviewMemoryRevenueSignalConnectorApproval(user.id, params.approvalId ?? "", body);

  if ("errorCode" in response) {
    const statusCode = response.errorCode === 404 ? 404 : 409;

    return reply.code(statusCode).send({
      error: statusCode === 404 ? "Not Found" : "Conflict",
      message: response.errorMessage
    });
  }

  return response;
});

app.post("/api/v1/merch/revenue-engine/signal-connectors/import-jobs/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof RevenueSignalConnectorOptions | "includeArchived" | "maxRecords", unknown>> & {
    approvalIds?: string[];
    confirm?: string;
    dryRun?: boolean;
    note?: string;
  };

  if (body.confirm !== revenueSignalImportJobConfirmation) {
    return reply.code(400).send({
      error: "Bad Request",
      message: `Confirm with ${revenueSignalImportJobConfirmation} before queuing read-only signal import jobs.`
    });
  }

  return applyMemoryRevenueSignalImportJobs(user.id, body);
});

app.get("/api/v1/merch/revenue-engine/signal-connectors/import-handoff", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const plan = buildMemoryRevenueSignalImportHandoff(
    user.id,
    revenueSignalImportHandoffOptionsFrom(request.query as Partial<Record<"includeArchived" | "maxJobs" | "maxSignals" | "windowDays", unknown>>)
  );

  return { plan };
});

app.post("/api/v1/merch/revenue-engine/signal-connectors/import-handoff/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<"includeArchived" | "maxJobs" | "maxSignals" | "windowDays", unknown>> & {
    confirm?: string;
    dryRun?: boolean;
    importJobIds?: string[];
    note?: string;
  };

  if (body.confirm !== revenueSignalImportHandoffConfirmation) {
    return reply.code(400).send({
      error: "Bad Request",
      message: `Confirm with ${revenueSignalImportHandoffConfirmation} before ingesting queued read-only signal import jobs.`
    });
  }

  const response = applyMemoryRevenueSignalImportHandoff(user.id, body);

  if ("errorCode" in response) {
    return reply.code(404).send({
      error: "Not Found",
      message: response.errorMessage
    });
  }

  return response;
});

app.get("/api/v1/merch/revenue-engine/signal-intake", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const plan = buildMemorySignalIntake(
    user.id,
    signalIntakeOptionsFrom(request.query as Partial<Record<keyof SignalIntakeOptions, unknown>>)
  );

  return { plan };
});

app.post("/api/v1/merch/revenue-engine/signal-intake/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof SignalIntakeOptions, unknown>> & SignalIntakeInput & {
    confirm?: string;
    dryRun?: boolean;
  };
  const incoming: SignalIntakeInput = {
    commerceSignals: Array.isArray(body.commerceSignals) ? body.commerceSignals : [],
    contentSignals: Array.isArray(body.contentSignals) ? body.contentSignals : [],
    paymentSignals: Array.isArray(body.paymentSignals) ? body.paymentSignals : []
  };
  const signalCount = (incoming.commerceSignals?.length ?? 0) + (incoming.contentSignals?.length ?? 0) + (incoming.paymentSignals?.length ?? 0);

  if (body.confirm !== "INGEST APPROVED READ-ONLY SIGNALS") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with INGEST APPROVED READ-ONLY SIGNALS before storing read-only signal evidence."
    });
  }

  if (signalCount === 0) {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Provide at least one approved read-only signal."
    });
  }

  const commerceError = validateMemoryPerformanceSnapshots(user.id, incoming.commerceSignals ?? []);

  if (commerceError) {
    return reply.code(404).send({ error: "Not Found", message: commerceError });
  }

  const contentError = validateMemoryContentSignals(user.id, incoming.contentSignals ?? []);

  if (contentError) {
    return reply.code(404).send({ error: "Not Found", message: contentError });
  }

  const plan = buildMemorySignalIntake(user.id, signalIntakeOptionsFrom(body), incoming);

  if (body.dryRun) {
    return {
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
    };
  }

  const applied = applyMemorySignalIntake(user.id, plan);

  return {
    ingested: {
      ...applied,
      dryRun: false,
      externalExecution: false,
      paymentSignalsRecorded: plan.totals.paymentSignals,
      providerContacted: false
    },
    plan
  };
});

app.get("/api/v1/merch/financial-orchestrator/plan", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const options = financialOptionsFrom(request.query as Partial<Record<keyof FinancialOrchestratorOptions, unknown>>);
  const { plan } = buildMemoryFinancialOrchestrator(user.id, options);

  if (plan.splitPolicy.status !== "balanced") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Financial split percentages must add to exactly 100."
    });
  }

  return { plan };
});

app.post("/api/v1/merch/financial-orchestrator/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof FinancialOrchestratorOptions, unknown>> & {
    confirm?: string;
    dryRun?: boolean;
  };

  if (body.confirm !== "APPLY INTERNAL FINANCIAL ORCHESTRATOR") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with APPLY INTERNAL FINANCIAL ORCHESTRATOR before recording financial ledger entries or payout intents."
    });
  }

  const { plan } = buildMemoryFinancialOrchestrator(user.id, financialOptionsFrom(body));

  if (plan.splitPolicy.status !== "balanced") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Financial split percentages must add to exactly 100."
    });
  }

  const ledgerEntries = plan.ledgerEntries.filter((entry) => entry.recordState === "new");
  const payoutIntents = plan.payoutIntents.filter((intent) => !state.financialPayoutIntents.some((existing) => existing.dedupeKey === intent.dedupeKey));
  const scalingBudgetQueue = plan.scalingBudgetQueue.filter((packet) => !state.financialScalingBudgetPackets.some((existing) => existing.userId === user.id && existing.dedupeKey === packet.dedupeKey));

  if (body.dryRun) {
    return {
      applied: {
        auditLogId: null,
        dryRun: true,
        externalExecution: false,
        ledgerEntriesCreated: ledgerEntries.length,
        payoutIntentsCreated: payoutIntents.length,
        policyId: null,
        scalingBudgetPackets: scalingBudgetQueue.length
      },
      plan
    };
  }

  const createdAt = now();
  const policyId = id("fin_policy");
  state.financialSplitPolicies.unshift({
    bufferPercent: plan.splitPolicy.bufferPercent,
    createdAt,
    currency: plan.splitPolicy.currency,
    externalExecution: false,
    id: policyId,
    metadata: {
      generatedAt: plan.generatedAt,
      policyChecks: plan.policyChecks,
      scalingBudgetQueue: plan.scalingBudgetQueue,
      summary: plan.summary
    },
    minPayoutIntentAmount: plan.splitPolicy.minPayoutIntentAmount,
    personalPercent: plan.splitPolicy.personalPercent,
    reserveFloorAmount: plan.splitPolicy.reserveFloorAmount,
    scalingPercent: plan.splitPolicy.scalingPercent,
    status: plan.splitPolicy.status,
    updatedAt: createdAt,
    userId: user.id
  });

  for (const entry of ledgerEntries) {
    state.financialLedgerEntries.unshift({
      allocatableProfit: entry.allocatableProfit,
      allocation: entry.allocation,
      createdAt,
      currency: entry.currency,
      externalExecution: false,
      grossRevenue: entry.grossRevenue,
      id: id("fin_ledger"),
      netProfit: entry.netProfit,
      periodEnd: entry.periodEnd,
      periodStart: entry.periodStart,
      productId: entry.productId,
      revenuePerformanceSnapshotId: entry.revenuePerformanceSnapshotId,
      source: entry.source,
      status: entry.status,
      storeId: entry.storeId,
      updatedAt: createdAt,
      userId: user.id
    });
  }

  for (const intent of payoutIntents) {
    state.financialPayoutIntents.unshift({
      amount: intent.amount,
      approvalRequired: true,
      auditLogId: null,
      category: intent.category,
      createdAt,
      currency: intent.currency,
      dedupeKey: intent.dedupeKey,
      destinationType: intent.destinationType,
      externalExecution: false,
      id: id("fin_intent"),
      metadata: {
        approvalGate: intent.approvalGate,
        sourceLedgerEntryIds: intent.sourceLedgerEntryIds,
        title: intent.title
      },
      provider: intent.provider,
      splitPolicyId: policyId,
      status: intent.status,
      updatedAt: createdAt,
      userId: user.id
    });
  }

  const auditLogId = id("audit");
  state.auditLogs.unshift({
    action: "financial.orchestrator.applied",
    createdAt,
    entry: {
      dryRun: false,
      externalExecution: false,
      options: plan.options,
      policyId,
      scalingBudgetQueue: plan.scalingBudgetQueue,
      summary: plan.summary,
      totals: plan.totals
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: payoutIntents.length > 0 ? "high" : ledgerEntries.length > 0 ? "medium" : "low",
    targetId: policyId,
    targetType: "financial_orchestrator"
  });
  const scalingBudgetPackets = storeMemoryFinancialScalingBudgetPackets(
    user.id,
    policyId,
    plan.scalingBudgetQueue,
    auditLogId,
    createdAt
  );

  return {
    applied: {
      auditLogId,
      dryRun: false,
      externalExecution: false,
      ledgerEntriesCreated: ledgerEntries.length,
      payoutIntentsCreated: payoutIntents.length,
      policyId,
      scalingBudgetPackets
    },
    plan
  };
});

app.get("/api/v1/merch/financial-orchestrator/payout-intents/review", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const { plan } = buildMemoryFinancialPayoutReview(user.id);

  return { plan };
});

app.get("/api/v1/merch/financial-orchestrator/scaling-budgets/review", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const { plan } = buildMemoryFinancialScalingBudgetReview(user.id);

  return { plan };
});

app.get("/api/v1/merch/financial-orchestrator/scaling-spend-control", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const { plan } = buildMemoryFinancialScalingSpendControl(user.id);

  return { plan };
});

app.post("/api/v1/merch/financial-orchestrator/scaling-spend-control/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as {
    confirm?: string;
    dryRun?: boolean;
  };

  if (body.confirm !== "RECORD FINANCIAL SCALING SPEND CONTROLS") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with RECORD FINANCIAL SCALING SPEND CONTROLS before storing scaling spend controls."
    });
  }

  const { plan } = buildMemoryFinancialScalingSpendControl(user.id);

  if (body.dryRun) {
    return {
      applied: {
        auditLogId: null,
        dryRun: true,
        externalExecution: false,
        providerContacted: false,
        scalingSpendPacketsUpserted: plan.spendPackets.length
      },
      plan
    };
  }

  const applied = applyMemoryFinancialScalingSpendControl(user.id, plan);
  const refreshed = buildMemoryFinancialScalingSpendControl(user.id);

  return {
    applied: {
      ...applied,
      dryRun: false,
      externalExecution: false,
      providerContacted: false
    },
    plan: refreshed.plan
  };
});

app.get("/api/v1/merch/financial-orchestrator/scaling-execution-ledger", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const { plan } = buildMemoryFinancialScalingExecutionLedger(user.id);

  return { plan };
});

app.post("/api/v1/merch/financial-orchestrator/scaling-execution-ledger/entries", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as {
    confirm?: string;
    dryRun?: boolean;
    entries?: Array<{
      amountSpent?: number;
      grossRevenue?: number;
      netProfit?: number;
      notes?: string | null;
      outcome?: FinancialScalingExecutionOutcome;
      periodEnd?: string;
      periodStart?: string;
      scalingSpendPacketId?: string;
      source?: FinancialScalingExecutionSource;
      unitsSold?: number;
      visits?: number;
    }>;
  };

  if (body.confirm !== "INGEST INTERNAL SCALING EXECUTION OUTCOMES") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with INGEST INTERNAL SCALING EXECUTION OUTCOMES before recording scaling execution outcomes."
    });
  }

  if (!Array.isArray(body.entries) || body.entries.length === 0 || body.entries.length > 50) {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Provide between 1 and 50 scaling execution outcome entries."
    });
  }

  const validOutcomes = new Set<FinancialScalingExecutionOutcome>(["validated", "watch", "stopped", "scale_next"]);
  const validSources = new Set<FinancialScalingExecutionSource>(["manual", "signal_intake", "operator_reconciliation", "other"]);
  const entries = body.entries.map((entry) => ({
    amountSpent: Math.max(0, Number(entry.amountSpent ?? 0)),
    grossRevenue: Math.max(0, Number(entry.grossRevenue ?? 0)),
    netProfit: Number(entry.netProfit ?? 0),
    notes: entry.notes ?? null,
    outcome: validOutcomes.has(entry.outcome ?? "watch") ? entry.outcome ?? "watch" : "watch",
    periodEnd: entry.periodEnd ?? "",
    periodStart: entry.periodStart ?? "",
    scalingSpendPacketId: entry.scalingSpendPacketId ?? "",
    source: validSources.has(entry.source ?? "manual") ? entry.source ?? "manual" : "manual",
    unitsSold: Math.max(0, Math.trunc(Number(entry.unitsSold ?? 0))),
    visits: Math.max(0, Math.trunc(Number(entry.visits ?? 0)))
  }));

  if (entries.some((entry) => !entry.scalingSpendPacketId || Number.isNaN(Date.parse(entry.periodStart)) || Number.isNaN(Date.parse(entry.periodEnd)) || Date.parse(entry.periodEnd) < Date.parse(entry.periodStart))) {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Each scaling execution outcome needs a packet id and a valid period."
    });
  }

  const validation = validateMemoryFinancialScalingExecutionEntries(user.id, entries);

  if (validation.error) {
    return reply.code(validation.error.code).send({
      error: validation.error.code === 404 ? "Not Found" : "Bad Request",
      message: validation.error.message
    });
  }

  if (body.dryRun) {
    const current = buildMemoryFinancialScalingExecutionLedger(user.id);
    const createdAt = now();
    const previewEntries = entries.map((entry, index) => {
      const packet = validation.packetById.get(entry.scalingSpendPacketId);

      if (!packet) {
        throw new Error(`Scaling spend packet ${entry.scalingSpendPacketId} was not available after validation.`);
      }

      return normalizeFinancialScalingExecutionEntry({
        amountSpent: entry.amountSpent,
        assetId: packet.assetId,
        assetName: packet.assetName,
        assetType: packet.assetType,
        auditLogId: null,
        category: packet.category,
        createdAt,
        externalExecution: false,
        grossRevenue: entry.grossRevenue,
        id: `scale_execution_preview_${packet.id}_${index + 1}`,
        netProfit: entry.netProfit,
        notes: entry.notes,
        outcome: entry.outcome,
        periodEnd: entry.periodEnd,
        periodStart: entry.periodStart,
        productId: packet.assetType === "product" ? packet.assetId : null,
        providerContacted: false,
        recordId: `preview_${packet.id}_${index + 1}`,
        scalingSpendPacketId: packet.id,
        source: entry.source,
        storeId: packet.storeId,
        storeName: packet.storeName,
        unitsSold: entry.unitsSold,
        updatedAt: createdAt,
        visits: entry.visits
      });
    });

    return {
      applied: {
        auditLogId: null,
        dryRun: true,
        entriesRecorded: entries.length,
        externalExecution: false,
        providerContacted: false
      },
      plan: buildFinancialScalingExecutionLedgerPlan({
        entries: [...previewEntries, ...current.plan.entries],
        spendControlPlan: current.spendControlPlan
      })
    };
  }

  const applied = applyMemoryFinancialScalingExecutionLedger(user.id, entries);

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

  const refreshed = buildMemoryFinancialScalingExecutionLedger(user.id);

  return {
    applied: {
      ...applied.result,
      dryRun: false,
      externalExecution: false,
      providerContacted: false
    },
    plan: refreshed.plan
  };
});

app.get("/api/v1/merch/financial-orchestrator/release-governance", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const { plan } = buildMemoryFinancialReleaseGovernance(user.id);

  return { plan };
});

app.post("/api/v1/merch/financial-orchestrator/release-governance/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as {
    confirm?: string;
    dryRun?: boolean;
  };

  if (body.confirm !== "RECORD FINANCIAL RELEASE GOVERNANCE") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with RECORD FINANCIAL RELEASE GOVERNANCE before storing financial release governance records."
    });
  }

  const { plan } = buildMemoryFinancialReleaseGovernance(user.id);

  if (body.dryRun) {
    return {
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
    };
  }

  const createdAt = now();
  let budgetReleasePacketsUpserted = 0;

  for (const packet of plan.budgetReleasePackets) {
    const existingIndex = state.financialBudgetReleasePackets.findIndex((record) => record.userId === user.id && record.payoutIntentId === packet.intentId);
    const record: FinancialBudgetReleasePacketRecord = {
      amount: packet.amount,
      approvalState: packet.approvalState,
      auditLogId: null,
      blockedActions: packet.blockedActions,
      category: packet.category,
      controls: packet.controls,
      createdAt: existingIndex >= 0 ? state.financialBudgetReleasePackets[existingIndex].createdAt : createdAt,
      currency: packet.currency,
      destinationType: packet.destinationType,
      externalExecution: false,
      id: existingIndex >= 0 ? state.financialBudgetReleasePackets[existingIndex].id : id("fin_release"),
      maxReleaseAmount: packet.maxReleaseAmount,
      payoutIntentId: packet.intentId,
      purpose: packet.purpose,
      releaseState: packet.releaseState,
      updatedAt: createdAt,
      userId: user.id
    };

    if (existingIndex >= 0) {
      state.financialBudgetReleasePackets[existingIndex] = record;
    } else {
      state.financialBudgetReleasePackets.unshift(record);
    }

    budgetReleasePacketsUpserted += 1;
  }

  const reconciliationReportId = id("fin_recon");
  state.financialReconciliationReports.unshift({
    approvedAmount: plan.reconciliationReport.approvedAmount,
    auditLogId: null,
    createdAt,
    externalExecution: false,
    id: reconciliationReportId,
    pendingAmount: plan.reconciliationReport.pendingAmount,
    rejectedAmount: plan.reconciliationReport.rejectedAmount,
    report: {
      auditEvents: plan.auditEvents,
      generatedAt: plan.generatedAt,
      releaseReadiness: plan.releaseReadiness,
      riskTiers: plan.riskTiers,
      source: plan.reconciliationReport.source,
      stripeReadOnlyProbe: plan.stripeReadOnlyProbe,
      summary: plan.summary
    },
    source: plan.reconciliationReport.source,
    status: plan.reconciliationReport.status,
    totalAmount: plan.reconciliationReport.totalAmount,
    updatedAt: createdAt,
    userId: user.id,
    variance: plan.reconciliationReport.variance
  });

  const auditLogId = id("audit");
  state.auditLogs.unshift({
    action: "financial.release_governance.recorded",
    createdAt,
    entry: {
      budgetReleasePacketsUpserted,
      externalExecution: false,
      reconciliationReportId,
      reconciliationStatus: plan.reconciliationReport.status,
      releaseReadiness: plan.releaseReadiness,
      stripeProviderContacted: false,
      totals: plan.totals
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: plan.totals.highRiskIntents > 0 ? "high" : budgetReleasePacketsUpserted > 0 ? "medium" : "low",
    targetId: reconciliationReportId,
    targetType: "financial_release_governance"
  });

  const packetIntentIds = new Set(plan.budgetReleasePackets.map((packet) => packet.intentId));
  state.financialBudgetReleasePackets = state.financialBudgetReleasePackets.map((packet) => packet.userId === user.id && packetIntentIds.has(packet.payoutIntentId)
    ? { ...packet, auditLogId }
    : packet);
  state.financialReconciliationReports = state.financialReconciliationReports.map((report) => report.id === reconciliationReportId
    ? { ...report, auditLogId }
    : report);

  const refreshed = buildMemoryFinancialReleaseGovernance(user.id);

  return {
    applied: {
      auditLogId,
      budgetReleasePacketsUpserted,
      dryRun: false,
      externalExecution: false,
      reconciliationReportId,
      reconciliationStatus: plan.reconciliationReport.status,
      stripeProviderContacted: false
    },
    plan: refreshed.plan
  };
});

app.get("/api/v1/merch/faceless-content/pipeline", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const { plan } = buildMemoryFacelessContentPipeline(user.id, facelessContentOptionsFrom(request.query as Partial<Record<keyof FacelessContentOptions, unknown>>));

  return { plan };
});

app.post("/api/v1/merch/faceless-content/pipeline/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof FacelessContentOptions, unknown>> & {
    confirm?: string;
    dryRun?: boolean;
  };

  if (body.confirm !== "CREATE INTERNAL FACELESS CONTENT PIPELINE") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with CREATE INTERNAL FACELESS CONTENT PIPELINE before recording faceless content briefs."
    });
  }

  const { plan } = buildMemoryFacelessContentPipeline(user.id, facelessContentOptionsFrom(body));
  const newBriefs = plan.briefs.filter((brief) => brief.recordState === "new");

  if (body.dryRun) {
    return {
      applied: {
        auditLogId: null,
        briefsCreated: newBriefs.length,
        dryRun: true,
        externalExecution: false,
        providerContacted: false
      },
      plan
    };
  }

  const createdAt = now();
  const auditLogId = id("audit");
  let briefsCreated = 0;

  for (const brief of newBriefs) {
    if (state.facelessContentBriefs.some((existing) => existing.userId === user.id && existing.dedupeKey === brief.dedupeKey)) {
      continue;
    }

    state.facelessContentBriefs.unshift({
      auditLogId,
      blockedActions: brief.blockedActions,
      channelPackages: brief.channelPackages,
      concept: brief.concept,
      createdAt,
      dedupeKey: brief.dedupeKey,
      externalExecution: false,
      id: id("content_brief"),
      priority: brief.priority,
      productId: brief.productId,
      providerReadiness: brief.providerReadiness,
      script: brief.script,
      status: "draft_queued",
      storyboard: brief.storyboard,
      storeId: brief.storeId,
      targetChannels: brief.targetChannels,
      title: brief.title,
      updatedAt: createdAt,
      userId: user.id,
      videoSpec: brief.videoSpec,
      voiceoverSpec: brief.voiceoverSpec
    });
    briefsCreated += 1;
  }

  state.auditLogs.unshift({
    action: "faceless_content.pipeline.recorded",
    createdAt,
    entry: {
      blockedExternalActions: plan.blockedExternalActions,
      briefsCreated,
      externalExecution: false,
      options: plan.options,
      providerContacted: false,
      summary: plan.summary,
      totals: plan.totals
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: briefsCreated > 0 ? "medium" : "low",
    targetId: null,
    targetType: "faceless_content_pipeline"
  });

  const refreshed = buildMemoryFacelessContentPipeline(user.id, facelessContentOptionsFrom(body));

  return {
    applied: {
      auditLogId,
      briefsCreated,
      dryRun: false,
      externalExecution: false,
      providerContacted: false
    },
    plan: refreshed.plan
  };
});

app.get("/api/v1/merch/faceless-content/performance", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const query = request.query as {
    channel?: FacelessContentChannel;
    source?: string;
    storeId?: string;
    windowDays?: string | number;
  };
  const { digest } = buildMemoryFacelessPerformanceDigest(user.id, {
    channel: query.channel,
    source: query.source,
    storeId: query.storeId,
    windowDays: Number(query.windowDays ?? 30)
  });

  return { digest };
});

app.post("/api/v1/merch/faceless-content/performance/snapshots", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as {
    confirm?: string;
    dryRun?: boolean;
    snapshots?: Array<Partial<FacelessContentPerformanceSnapshot>>;
  };
  const snapshots = Array.isArray(body.snapshots) ? body.snapshots : [];

  if (body.confirm !== "INGEST INTERNAL CONTENT PERFORMANCE SNAPSHOTS") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with INGEST INTERNAL CONTENT PERFORMANCE SNAPSHOTS before storing content performance snapshots."
    });
  }

  if (snapshots.length === 0 || snapshots.length > 100) {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Provide between 1 and 100 content performance snapshots."
    });
  }

  const storeIds = new Set(state.merchStores.filter((store) => store.userId === user.id).map((store) => store.id));
  const productIds = new Set(state.podProducts.filter((product) => storeIds.has(product.storeId)).map((product) => product.id));
  const briefIds = new Set(state.facelessContentBriefs.filter((brief) => brief.userId === user.id).map((brief) => brief.id));

  for (const snapshot of snapshots) {
    if (snapshot.storeId && !storeIds.has(snapshot.storeId)) {
      return reply.code(404).send({ error: "Not Found", message: "One or more content performance snapshots target a merch store that was not found." });
    }
    if (snapshot.productId && !productIds.has(snapshot.productId)) {
      return reply.code(404).send({ error: "Not Found", message: "One or more content performance snapshots target a product outside the selected store." });
    }
    if (snapshot.contentBriefId && !briefIds.has(snapshot.contentBriefId)) {
      return reply.code(404).send({ error: "Not Found", message: "One or more content performance snapshots target a content brief outside the selected store or product." });
    }
  }

  const createdAt = now();
  const normalizedSnapshots: FacelessContentPerformanceSnapshotRecord[] = snapshots.map((snapshot) => ({
    channel: snapshot.channel ?? "youtube_shorts",
    clicks: Number(snapshot.clicks ?? 0),
    comments: Number(snapshot.comments ?? 0),
    contentBriefId: snapshot.contentBriefId ?? null,
    conversions: Number(snapshot.conversions ?? 0),
    cost: Number(snapshot.cost ?? 0),
    createdAt,
    externalExecution: false,
    id: id("content_perf"),
    likes: Number(snapshot.likes ?? 0),
    notes: snapshot.notes ?? null,
    periodEnd: snapshot.periodEnd ?? createdAt,
    periodStart: snapshot.periodStart ?? createdAt,
    productId: snapshot.productId ?? null,
    revenue: Number(snapshot.revenue ?? 0),
    saves: Number(snapshot.saves ?? 0),
    shares: Number(snapshot.shares ?? 0),
    source: snapshot.source ?? "manual",
    storeId: snapshot.storeId ?? null,
    updatedAt: createdAt,
    userId: user.id,
    views: Number(snapshot.views ?? 0),
    watchSeconds: Number(snapshot.watchSeconds ?? 0)
  }));

  if (body.dryRun) {
    const plan = buildFacelessContentPipelinePlan({
      options: {},
      performanceSnapshots: [
        ...state.facelessContentPerformanceSnapshots
          .filter((snapshot) => snapshot.userId === user.id)
          .map(memoryFacelessPerformanceSnapshot),
        ...normalizedSnapshots.map(memoryFacelessPerformanceSnapshot)
      ],
      products: state.podProducts.filter((product) => storeIds.has(product.storeId)),
      stores: state.merchStores.filter((store) => store.userId === user.id)
    });

    return {
      digest: plan.performanceDigest,
      ingested: {
        auditLogId: null,
        dryRun: true,
        externalExecution: false,
        snapshots: normalizedSnapshots.length
      }
    };
  }

  state.facelessContentPerformanceSnapshots.unshift(...normalizedSnapshots);
  const auditLogId = id("audit");
  state.auditLogs.unshift({
    action: "faceless_content.performance.ingested",
    createdAt,
    entry: {
      channels: Array.from(new Set(normalizedSnapshots.map((snapshot) => snapshot.channel))),
      externalExecution: false,
      providerContacted: false,
      snapshots: normalizedSnapshots.length,
      sourceTypes: Array.from(new Set(normalizedSnapshots.map((snapshot) => snapshot.source)))
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: normalizedSnapshots.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "faceless_content_performance"
  });
  const { digest } = buildMemoryFacelessPerformanceDigest(user.id, { windowDays: 30 });

  return {
    digest,
    ingested: {
      auditLogId,
      dryRun: false,
      externalExecution: false,
      snapshots: normalizedSnapshots.length
    }
  };
});

app.post("/api/v1/merch/financial-orchestrator/payout-intents/:intentId/review", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { intentId } = request.params as { intentId: string };
  const body = request.body as {
    action?: "approve" | "reject";
    confirm?: string;
    note?: string;
  };
  const expected = body.action === "approve" ? "APPROVE FINANCIAL PAYOUT INTENT" : "REJECT FINANCIAL PAYOUT INTENT";

  if (body.action !== "approve" && body.action !== "reject") {
    return reply.code(400).send({ error: "Bad Request", message: "Choose approve or reject." });
  }

  if (body.confirm !== expected) {
    return reply.code(400).send({ error: "Bad Request", message: `Confirm with ${expected}.` });
  }

  const index = state.financialPayoutIntents.findIndex((intent) => intent.id === intentId && intent.userId === user.id);

  if (index === -1) {
    return reply.code(404).send({ error: "Not Found", message: "Financial payout intent was not found." });
  }

  const existing = state.financialPayoutIntents[index];

  if (existing.status !== "approval_required") {
    return reply.code(409).send({ error: "Conflict", message: "Only pending payout intents can be reviewed." });
  }

  const nextStatus = body.action === "approve" ? "approved_manual_handoff" : "rejected";
  const auditLogId = id("audit");
  const reviewedAt = now();
  const review = {
    action: body.action,
    auditLogId,
    externalExecution: false,
    fromStatus: existing.status,
    note: body.note ?? null,
    reviewedAt,
    reviewedById: user.id,
    toStatus: nextStatus
  };

  state.financialPayoutIntents[index] = {
    ...existing,
    auditLogId,
    metadata: {
      ...existing.metadata,
      lastReview: review,
      reviewHistory: [
        ...(Array.isArray(existing.metadata.reviewHistory) ? existing.metadata.reviewHistory : []),
        review
      ]
    },
    status: nextStatus,
    updatedAt: reviewedAt
  };
  state.auditLogs.unshift({
    action: body.action === "approve" ? "financial.payout_intent.approved" : "financial.payout_intent.rejected",
    createdAt: reviewedAt,
    entry: {
      amount: existing.amount,
      category: existing.category,
      currency: existing.currency,
      destinationType: existing.destinationType,
      externalExecution: false,
      note: body.note ?? null,
      provider: existing.provider,
      status: nextStatus
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: body.action === "approve" ? "high" : "medium",
    targetId: existing.id,
    targetType: "financial_payout_intent"
  });

  const { plan } = buildMemoryFinancialPayoutReview(user.id);

  return {
    auditLogId,
    externalExecution: false,
    intent: memoryFinancialPayoutIntentSnapshot(state.financialPayoutIntents[index]),
    plan,
    review: {
      action: body.action,
      fromStatus: existing.status,
      note: body.note ?? null,
      toStatus: nextStatus
    }
  };
});

app.post("/api/v1/merch/financial-orchestrator/scaling-budgets/:packetId/review", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { packetId } = request.params as { packetId: string };
  const body = request.body as {
    action?: "approve" | "reject";
    confirm?: string;
    note?: string;
  };
  const expected = body.action === "approve" ? "APPROVE FINANCIAL SCALING BUDGET" : "REJECT FINANCIAL SCALING BUDGET";

  if (body.action !== "approve" && body.action !== "reject") {
    return reply.code(400).send({ error: "Bad Request", message: "Choose approve or reject." });
  }

  if (body.confirm !== expected) {
    return reply.code(400).send({ error: "Bad Request", message: `Confirm with ${expected}.` });
  }

  const index = state.financialScalingBudgetPackets.findIndex((packet) => packet.id === packetId && packet.userId === user.id);

  if (index === -1) {
    return reply.code(404).send({ error: "Not Found", message: "Financial scaling budget packet was not found." });
  }

  const existing = state.financialScalingBudgetPackets[index];

  if (existing.status !== "approval_required") {
    return reply.code(409).send({ error: "Conflict", message: "Only pending scaling budget packets can be reviewed." });
  }

  const nextStatus = body.action === "approve" ? "approved_manual_handoff" : "rejected";
  const auditLogId = id("audit");
  const reviewedAt = now();
  const review = {
    action: body.action,
    auditLogId,
    externalExecution: false,
    fromStatus: existing.status,
    note: body.note ?? null,
    providerContacted: false,
    reviewedAt,
    reviewedById: user.id,
    toStatus: nextStatus
  };

  state.financialScalingBudgetPackets[index] = {
    ...existing,
    auditLogId,
    externalExecution: false,
    metadata: {
      ...existing.metadata,
      lastReview: review,
      reviewHistory: [
        ...(Array.isArray(existing.metadata.reviewHistory) ? existing.metadata.reviewHistory : []),
        review
      ]
    },
    providerContacted: false,
    reviewedAt,
    reviewedById: user.id,
    reviewNote: body.note ?? null,
    status: nextStatus,
    updatedAt: reviewedAt
  };
  state.auditLogs.unshift({
    action: body.action === "approve" ? "financial.scaling_budget.approved" : "financial.scaling_budget.rejected",
    createdAt: reviewedAt,
    entry: {
      amount: existing.amount,
      assetId: existing.assetId,
      assetName: existing.assetName,
      assetType: existing.assetType,
      externalExecution: false,
      note: body.note ?? null,
      providerContacted: false,
      score: existing.score,
      status: nextStatus,
      storeId: existing.storeId,
      storeName: existing.storeName
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: body.action === "approve" ? "high" : "medium",
    targetId: existing.id,
    targetType: "financial_scaling_budget_packet"
  });

  const { plan } = buildMemoryFinancialScalingBudgetReview(user.id);

  return {
    auditLogId,
    externalExecution: false,
    packet: memoryFinancialScalingBudgetPacketSnapshot(state.financialScalingBudgetPackets[index]),
    plan,
    providerContacted: false,
    review: {
      action: body.action,
      fromStatus: existing.status,
      note: body.note ?? null,
      toStatus: nextStatus
    }
  };
});

app.post("/api/v1/merch/revenue-engine/performance/snapshots", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as {
    confirm?: string;
    dryRun?: boolean;
    snapshots?: RevenuePerformanceSnapshotInput[];
  };
  const snapshots = Array.isArray(body.snapshots) ? body.snapshots : [];

  if (body.confirm !== "INGEST INTERNAL PERFORMANCE SNAPSHOTS") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with INGEST INTERNAL PERFORMANCE SNAPSHOTS before storing performance snapshots."
    });
  }

  if (snapshots.length === 0 || snapshots.length > 100) {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Provide between 1 and 100 performance snapshots."
    });
  }

  const ownershipError = validateMemoryPerformanceSnapshots(user.id, snapshots);

  if (ownershipError) {
    return reply.code(404).send({ error: "Not Found", message: ownershipError });
  }

  const incomingSnapshots = snapshots.map((snapshot) => normalizeMemoryPerformanceSnapshot(user.id, snapshot));
  const existing = buildMemoryRevenuePerformanceDigest(user.id, revenuePerformanceOptionsFrom({}));
  const previewDigest = buildRevenuePerformanceDigest({
    options: existing.digest.options,
    products: existing.products,
    snapshots: [...existing.digest.snapshots, ...incomingSnapshots],
    stores: existing.stores
  });

  if (body.dryRun) {
    return {
      digest: previewDigest,
      ingested: {
        auditLogId: null,
        dryRun: true,
        externalExecution: false,
        snapshots: incomingSnapshots.length,
        storeRollups: Array.from(new Set(incomingSnapshots.map((snapshot) => snapshot.storeId))).map((storeId) => ({ storeId }))
      }
    };
  }

  state.revenuePerformanceSnapshots.unshift(...incomingSnapshots);
  rollupMemoryPerformanceStores(user.id, incomingSnapshots.map((snapshot) => snapshot.storeId));
  const digest = buildMemoryRevenuePerformanceDigest(user.id, previewDigest.options).digest;
  const auditLogId = id("audit");

  state.auditLogs.unshift({
    action: "revenue.performance.ingested",
    createdAt: now(),
    entry: {
      dryRun: false,
      externalExecution: false,
      snapshotIds: incomingSnapshots.map((snapshot) => snapshot.id),
      summary: digest.summary
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: incomingSnapshots.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_performance"
  });

  return {
    digest,
    ingested: {
      auditLogId,
      dryRun: false,
      externalExecution: false,
      snapshots: incomingSnapshots.length,
      storeRollups: Array.from(new Set(incomingSnapshots.map((snapshot) => snapshot.storeId))).map((storeId) => ({ storeId }))
    }
  };
});

app.post("/api/v1/merch/revenue-engine/performance/rotation/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof RevenuePerformanceOptions | "source" | "storeId", unknown>> & {
    confirm?: string;
    dryRun?: boolean;
  };

  if (body.confirm !== "APPLY PERFORMANCE ROTATION") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with APPLY PERFORMANCE ROTATION before applying performance rotation changes."
    });
  }

  const { digest } = buildMemoryRevenuePerformanceDigest(user.id, revenuePerformanceOptionsFrom(body));
  const productUpdates = digest.rotationChanges.filter((change) => change.targetType === "product");
  const storeUpdates = digest.rotationChanges.filter((change) => change.targetType === "store");

  if (!body.dryRun) {
    const ownedStoreIds = new Set(state.merchStores.filter((store) => store.userId === user.id).map((store) => store.id));

    for (const change of productUpdates) {
      const index = state.podProducts.findIndex((product) => product.id === change.targetId && ownedStoreIds.has(product.storeId));

      if (index !== -1) {
        state.podProducts[index] = normalizePodProductBody({ status: change.toStatus as PodProduct["status"] }, state.podProducts[index]);
      }
    }

    for (const change of storeUpdates) {
      const index = state.merchStores.findIndex((store) => store.id === change.targetId && store.userId === user.id);

      if (index !== -1) {
        state.merchStores[index] = normalizeMerchStoreBody({ launchStatus: change.toStatus as ClientMerchStore["launchStatus"] }, user.id, state.merchStores[index]);
      }
    }

    state.auditLogs.unshift({
      action: "revenue.performance_rotation.applied",
      createdAt: now(),
      entry: {
        dryRun: false,
        externalExecution: false,
        options: digest.options,
        productUpdates,
        storeUpdates,
        summary: digest.summary
      },
      entryHash: id("hash"),
      id: id("audit"),
      outcome: "success",
      severity: productUpdates.length + storeUpdates.length > 0 ? "medium" : "low",
      targetId: null,
      targetType: "revenue_performance"
    });
  }

  return {
    applied: {
      auditLogId: body.dryRun ? null : state.auditLogs[0]?.id ?? null,
      dryRun: Boolean(body.dryRun),
      externalExecution: false,
      productUpdates,
      storeUpdates
    },
    digest
  };
});

app.get("/api/v1/merch/revenue-engine/listing-optimization", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const { plan } = buildMemoryRevenueListingOptimization(
    user.id,
    revenueListingOptionsFrom(request.query as Partial<Record<keyof RevenueListingOptimizationOptions, unknown>>)
  );

  return { plan };
});

app.post("/api/v1/merch/revenue-engine/listing-optimization/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof RevenueListingOptimizationOptions, unknown>> & {
    confirm?: string;
    dryRun?: boolean;
  };

  if (body.confirm !== "APPLY INTERNAL LISTING OPTIMIZATION") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with APPLY INTERNAL LISTING OPTIMIZATION before updating internal listing drafts."
    });
  }

  const { plan } = buildMemoryRevenueListingOptimization(user.id, revenueListingOptionsFrom(body));
  const productUpdates = plan.experiments.map((experiment) => ({
    fromStatus: experiment.currentListing.title ? "Existing listing draft" : "Missing listing copy",
    productId: experiment.productId,
    productName: experiment.productName,
    recommendedVariantId: experiment.recommendedVariant.id,
    storeId: experiment.storeId,
    toStatus: experiment.recommendedInternalStatus
  }));

  if (!body.dryRun) {
    const ownedStoreIds = new Set(state.merchStores.filter((store) => store.userId === user.id).map((store) => store.id));

    for (const experiment of plan.experiments) {
      const index = state.podProducts.findIndex((product) => product.id === experiment.productId && ownedStoreIds.has(product.storeId));

      if (index !== -1) {
        const variant = experiment.recommendedVariant;
        state.podProducts[index] = normalizePodProductBody({
          estimatedPlatformFees: variant.estimatedPlatformFees,
          estimatedProfit: variant.estimatedProfit,
          listingDescription: variant.description,
          listingTitle: variant.title,
          mockupNotes: variant.mockupNotes,
          profitMargin: variant.profitMargin,
          retailPrice: variant.retailPrice,
          status: experiment.recommendedInternalStatus as PodProduct["status"],
          tags: variant.tags
        }, state.podProducts[index]);
      }
    }

    state.auditLogs.unshift({
      action: "revenue.listing_optimization.applied",
      createdAt: now(),
      entry: {
        dryRun: false,
        externalExecution: false,
        options: plan.options,
        productUpdates,
        summary: plan.summary
      },
      entryHash: id("hash"),
      id: id("audit"),
      outcome: "success",
      severity: productUpdates.length > 0 ? "medium" : "low",
      targetId: null,
      targetType: "revenue_listing_optimization"
    });
  }

  return {
    applied: {
      auditLogId: body.dryRun ? null : state.auditLogs[0]?.id ?? null,
      dryRun: Boolean(body.dryRun),
      externalExecution: false,
      productUpdates
    },
    plan
  };
});

app.get("/api/v1/merch/revenue-engine/store-setup", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const { plan } = buildMemoryRevenueStoreSetup(
    user.id,
    revenueStoreSetupOptionsFrom(request.query as Partial<Record<keyof RevenueStoreSetupOptions, unknown>>)
  );

  return { plan };
});

app.post("/api/v1/merch/revenue-engine/store-setup/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof RevenueStoreSetupOptions, unknown>> & {
    confirm?: string;
    dryRun?: boolean;
  };

  if (body.confirm !== "APPLY INTERNAL STORE SETUP RUNBOOK") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with APPLY INTERNAL STORE SETUP RUNBOOK before updating internal store setup state."
    });
  }

  const { plan } = buildMemoryRevenueStoreSetup(user.id, revenueStoreSetupOptionsFrom(body));
  const storeUpdates = plan.runbooks
    .filter((runbook) => runbook.action !== "hold")
    .map((runbook) => ({
      action: runbook.action,
      fromStatus: state.merchStores.find((store) => store.id === runbook.storeId && store.userId === user.id)?.launchStatus ?? "Unknown",
      readinessScore: runbook.readinessScore,
      storeId: runbook.storeId,
      storeName: runbook.storeName,
      toStatus: runbook.recommendedLaunchStatus
    }));

  if (!body.dryRun) {
    for (const update of storeUpdates) {
      const index = state.merchStores.findIndex((store) => store.id === update.storeId && store.userId === user.id);

      if (index !== -1) {
        state.merchStores[index] = normalizeMerchStoreBody({
          launchStatus: update.toStatus as ClientMerchStore["launchStatus"]
        }, user.id, state.merchStores[index]);
      }
    }

    state.auditLogs.unshift({
      action: "revenue.store_setup.applied",
      createdAt: now(),
      entry: {
        dryRun: false,
        externalExecution: false,
        options: plan.options,
        storeUpdates,
        summary: plan.summary
      },
      entryHash: id("hash"),
      id: id("audit"),
      outcome: "success",
      severity: storeUpdates.length > 0 ? "medium" : "low",
      targetId: null,
      targetType: "revenue_store_setup"
    });
  }

  return {
    applied: {
      auditLogId: body.dryRun ? null : state.auditLogs[0]?.id ?? null,
      dryRun: Boolean(body.dryRun),
      externalExecution: false,
      storeUpdates
    },
    plan
  };
});

app.get("/api/v1/merch/revenue-engine/launch-pipeline", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const { plan } = buildMemoryRevenueLaunchPipeline(user.id, revenueLaunchOptionsFrom(request.query as Partial<Record<keyof RevenueLaunchPipelineOptions, unknown>>));

  return { plan };
});

app.get("/api/v1/merch/revenue-engine/launch-readiness", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const plan = buildMemoryRevenueLaunchReadiness(
    user.id,
    revenueLaunchReadinessOptionsFrom(request.query as Partial<Record<keyof RevenueLaunchReadinessOptions, unknown>>)
  );

  return { plan };
});

app.get("/api/v1/merch/revenue-engine/first-cash-readiness", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const plan = buildMemoryRevenueFirstCashReadiness(
    user.id,
    revenueFirstCashReadinessOptionsFrom(request.query as Partial<Record<keyof RevenueFirstCashReadinessOptions, unknown>>)
  );

  return { plan };
});

app.get("/api/v1/merch/revenue-engine/first-cash-sprint", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const context = buildMemoryRevenueFirstCashSprint(
    user.id,
    revenueFirstCashSprintOptionsFrom(request.query as Partial<Record<keyof RevenueFirstCashSprintOptions, unknown>>)
  );

  return {
    bridge: context.bridgePlan,
    checklist: context.checklistPlan,
    firstCash: context.firstCashPlan,
    sprint: context.sprint
  };
});

app.post("/api/v1/merch/revenue-engine/first-cash-sprint/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = (request.body ?? {}) as Partial<Record<keyof RevenueFirstCashSprintOptions, unknown>> & {
    confirm?: string;
    dryRun?: boolean;
    note?: string;
    sprintActionIds?: string[];
  };

  if (body.confirm !== revenueFirstCashSprintConfirmation) {
    return reply.code(400).send({
      error: "Bad Request",
      message: `Confirm with ${revenueFirstCashSprintConfirmation} before running the internal first-cash sprint.`
    });
  }

  return applyMemoryRevenueFirstCashSprint(user.id, body);
});

app.get("/api/v1/merch/revenue-engine/first-business-launch", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const context = buildMemoryRevenueFirstBusinessLaunch(user.id, request.query as { maxCandidates?: number | string });

  return context;
});

app.post("/api/v1/merch/revenue-engine/first-business-launch/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = (request.body ?? {}) as {
    confirm?: string;
    dryRun?: boolean;
    maxCandidates?: number | string;
    note?: string;
    sprintActionIds?: string[];
  };

  if (body.confirm !== "RUN INTERNAL FIRST BUSINESS LAUNCH PATH") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with RUN INTERNAL FIRST BUSINESS LAUNCH PATH before running the internal first-business launch path."
    });
  }

  return applyMemoryRevenueFirstBusinessLaunch(user.id, body);
});

app.get("/api/v1/merch/revenue-engine/launch-checklist", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const plan = buildMemoryRevenueLaunchChecklist(
    user.id,
    revenueLaunchChecklistOptionsFrom(request.query as Partial<Record<keyof RevenueLaunchChecklistOptions, unknown>>)
  );

  return { plan };
});

app.get("/api/v1/merch/revenue-engine/launch-checklist/action-bridge", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const { bridgePlan, checklistPlan } = buildMemoryRevenueLaunchChecklistActionBridge(
    user.id,
    revenueLaunchChecklistActionBridgeOptionsFrom(request.query as Partial<Record<keyof RevenueLaunchChecklistActionBridgeOptions, unknown>>)
  );

  return {
    checklist: checklistPlan,
    plan: bridgePlan
  };
});

app.post("/api/v1/merch/revenue-engine/launch-checklist/action-bridge/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = (request.body ?? {}) as Partial<Record<keyof RevenueLaunchChecklistActionBridgeOptions, unknown>> & {
    actionIds?: string[];
    confirm?: string;
    dryRun?: boolean;
    note?: string;
  };

  if (body.confirm !== revenueLaunchChecklistActionBridgeConfirmation) {
    return reply.code(400).send({
      error: "Bad Request",
      message: `Confirm with ${revenueLaunchChecklistActionBridgeConfirmation} before dispatching internal checklist bridge actions.`
    });
  }

  return applyMemoryRevenueLaunchChecklistActionBridge(user.id, body);
});

app.post("/api/v1/merch/revenue-engine/launch-sprint", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = (request.body ?? {}) as Partial<Record<keyof RevenueLaunchSprintOptions, unknown>> & {
    confirm?: string;
    dryRun?: boolean;
    idea?: string;
  };

  if (body.confirm !== revenueLaunchSprintConfirmation) {
    return reply.code(400).send({
      error: "Bad Request",
      message: `Confirm with ${revenueLaunchSprintConfirmation} before running the internal launch sprint.`
    });
  }

  return applyMemoryRevenueLaunchSprint(user.id, body);
});

app.get("/api/v1/merch/revenue-engine/launch-handoff", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const plan = buildMemoryRevenueLaunchHandoff(
    user.id,
    revenueLaunchHandoffOptionsFrom(request.query as Partial<Record<keyof RevenueLaunchHandoffOptions, unknown>>)
  );

  return {
    plan,
    records: plan.persistedPackets
  };
});

app.post("/api/v1/merch/revenue-engine/launch-handoff/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof RevenueLaunchHandoffOptions, unknown>> & {
    confirm?: string;
    dryRun?: boolean;
  };

  if (body.confirm !== "RECORD INTERNAL LAUNCH HANDOFF PACKETS") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with RECORD INTERNAL LAUNCH HANDOFF PACKETS before recording internal launch handoff packet records."
    });
  }

  const plan = buildMemoryRevenueLaunchHandoff(user.id, revenueLaunchHandoffOptionsFrom(body));
  const applied = applyMemoryRevenueLaunchHandoff(user.id, plan, Boolean(body.dryRun));

  return {
    applied,
    plan: {
      ...plan,
      persistedPackets: body.dryRun ? plan.persistedPackets : applied.storedRecords
    },
    records: applied.storedRecords
  };
});

app.get("/api/v1/merch/revenue-engine/launch-handoff/control", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const plan = buildMemoryRevenueLaunchHandoffControl(
    user.id,
    revenueLaunchHandoffControlOptionsFrom(request.query as Partial<Record<keyof RevenueLaunchHandoffControlOptions, unknown>>)
  );

  return { plan };
});

app.post("/api/v1/merch/revenue-engine/launch-handoff/packets/:packetId/control", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { packetId } = request.params as { packetId: string };
  const body = request.body as {
    confirm?: string;
    dryRun?: boolean;
    includeArchived?: boolean | string;
    maxPackets?: number | string;
    minConnectorReadiness?: number | string;
    note?: string;
    overrideReadiness?: boolean;
    status?: string;
  };

  if (body.confirm !== "UPDATE INTERNAL LAUNCH HANDOFF CONTROL") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with UPDATE INTERNAL LAUNCH HANDOFF CONTROL before changing internal launch handoff packet status."
    });
  }

  const response = applyMemoryRevenueLaunchHandoffControl(user.id, packetId, body);

  if (!response) {
    return reply.code(404).send({
      error: "Not Found",
      message: "Launch handoff packet was not found."
    });
  }

  if ("error" in response) {
    return reply.code(400).send(response);
  }

  if (!response.applied.allowed && !body.dryRun) {
    return reply.code(409).send(response);
  }

  return response;
});

app.get("/api/v1/merch/revenue-engine/launch-operations-pack", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const plan = buildMemoryRevenueLaunchOperationsPack(
    user.id,
    revenueLaunchOperationsPackOptionsFrom(request.query as Partial<Record<keyof RevenueLaunchOperationsPackOptions, unknown>>)
  );

  return { plan };
});

app.post("/api/v1/merch/revenue-engine/launch-operations-pack/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = (request.body ?? {}) as Partial<Record<keyof RevenueLaunchOperationsPackOptions, unknown>> & {
    confirm?: string;
    dryRun?: boolean;
    note?: string;
    storeIds?: string[];
  };

  if (body.confirm !== revenueLaunchOperationsPackConfirmation) {
    return reply.code(400).send({
      error: "Bad Request",
      message: `Confirm with ${revenueLaunchOperationsPackConfirmation} before recording launch operations packs.`
    });
  }

  return applyMemoryRevenueLaunchOperationsPack(user.id, body);
});

app.get("/api/v1/merch/revenue-engine/launch-closure-ledger", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const plan = buildMemoryRevenueLaunchClosureLedger(
    user.id,
    revenueLaunchClosureLedgerOptionsFrom(request.query as Partial<Record<keyof RevenueLaunchClosureLedgerOptions, unknown>>)
  );

  return { plan };
});

app.post("/api/v1/merch/revenue-engine/launch-closure-ledger/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = (request.body ?? {}) as Partial<Record<keyof RevenueLaunchClosureLedgerOptions, unknown>> & {
    confirm?: string;
    dryRun?: boolean;
    note?: string;
    storeIds?: string[];
  };

  if (body.confirm !== revenueLaunchClosureLedgerConfirmation) {
    return reply.code(400).send({
      error: "Bad Request",
      message: `Confirm with ${revenueLaunchClosureLedgerConfirmation} before recording launch closure ledger entries.`
    });
  }

  return applyMemoryRevenueLaunchClosureLedger(user.id, body);
});

app.get("/api/v1/merch/revenue-engine/live-connector-readiness", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const plan = buildMemoryRevenueLiveConnectorReadinessRegistry(
    user.id,
    revenueLiveConnectorReadinessOptionsFrom(request.query as Partial<Record<keyof RevenueLiveConnectorReadinessOptions, unknown>>)
  );

  return { plan };
});

app.post("/api/v1/merch/revenue-engine/live-connector-readiness/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = (request.body ?? {}) as Partial<Record<keyof RevenueLiveConnectorReadinessOptions, unknown>> & {
    confirm?: string;
    dryRun?: boolean;
    note?: string;
    storeIds?: string[];
  };

  if (body.confirm !== revenueLiveConnectorReadinessRegistryConfirmation) {
    return reply.code(400).send({
      error: "Bad Request",
      message: `Confirm with ${revenueLiveConnectorReadinessRegistryConfirmation} before recording live connector readiness registry entries.`
    });
  }

  return applyMemoryRevenueLiveConnectorReadinessRegistry(user.id, body);
});

app.get("/api/v1/merch/revenue-engine/live-connector-design-dossier", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const plan = buildMemoryRevenueLiveConnectorDesignDossier(
    user.id,
    revenueLiveConnectorDesignDossierOptionsFrom(request.query as Partial<Record<keyof RevenueLiveConnectorDesignDossierOptions, unknown>>)
  );

  return { plan };
});

app.post("/api/v1/merch/revenue-engine/live-connector-design-dossier/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = (request.body ?? {}) as Partial<Record<keyof RevenueLiveConnectorDesignDossierOptions, unknown>> & {
    confirm?: string;
    dryRun?: boolean;
    note?: string;
    storeIds?: string[];
  };

  if (body.confirm !== revenueLiveConnectorDesignDossierConfirmation) {
    return reply.code(400).send({
      error: "Bad Request",
      message: `Confirm with ${revenueLiveConnectorDesignDossierConfirmation} before recording live connector design dossiers.`
    });
  }

  return applyMemoryRevenueLiveConnectorDesignDossier(user.id, body);
});

app.get("/api/v1/merch/revenue-engine/digital-products", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const { plan } = buildMemoryDigitalProductPortfolio(user.id, digitalProductOptionsFrom(request.query as Partial<Record<keyof DigitalProductOptions, unknown>>));

  return { plan };
});

app.post("/api/v1/merch/revenue-engine/digital-products/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof DigitalProductOptions, unknown>> & { confirm?: string; dryRun?: boolean };

  if (body.confirm !== "CREATE INTERNAL DIGITAL PRODUCT QUEUE") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with CREATE INTERNAL DIGITAL PRODUCT QUEUE before creating internal digital product records."
    });
  }

  const { plan } = buildMemoryDigitalProductPortfolio(user.id, digitalProductOptionsFrom(body));
  const storeUpdates = plan.storePlans
    .filter((storePlan) => storePlan.queuedDrafts.length > 0)
    .map((storePlan) => ({
      addedProductTypes: storePlan.queuedDrafts.map((draft) => draft.createProductInput.productType),
      approvalStatus: "Designs Pending",
      launchStatus: "Designing",
      storeId: storePlan.storeId,
      storeName: storePlan.storeName
    }));

  if (body.dryRun) {
    return {
      applied: {
        auditLogId: null,
        createdProducts: plan.totals.queuedDrafts,
        dryRun: true,
        externalExecution: false,
        storeUpdates
      },
      plan
    };
  }

  const createdProducts = plan.draftQueue.map((draft) => normalizePodProductBody(draft.createProductInput as Partial<PodProduct>));
  state.podProducts.unshift(...createdProducts);

  for (const update of storeUpdates) {
    const index = state.merchStores.findIndex((store) => store.id === update.storeId && store.userId === user.id);

    if (index !== -1) {
      state.merchStores[index] = normalizeMerchStoreBody({
        approvalStatus: "Designs Pending",
        designCount: state.merchStores[index].designCount + update.addedProductTypes.length,
        launchStatus: "Designing",
        productTypes: Array.from(new Set([...state.merchStores[index].productTypes, ...update.addedProductTypes]))
      }, user.id, state.merchStores[index]);
    }
  }

  state.auditLogs.unshift({
    action: "revenue.digital_products.applied",
    createdAt: now(),
    entry: {
      createdProducts: createdProducts.map((product) => ({
        id: product.id,
        productName: product.productName,
        storeId: product.storeId
      })),
      dryRun: false,
      externalExecution: false,
      options: plan.options,
      storeUpdates,
      summary: plan.summary
    },
    entryHash: id("hash"),
    id: id("audit"),
    outcome: "success",
    severity: createdProducts.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_digital_products"
  });

  return {
    applied: {
      auditLogId: state.auditLogs[0]?.id ?? null,
      createdProducts: createdProducts.map((product) => ({
        id: product.id,
        productName: product.productName,
        storeId: product.storeId
      })),
      dryRun: false,
      externalExecution: false,
      storeUpdates
    },
    plan
  };
});

app.post("/api/v1/merch/revenue-engine/launch-pipeline/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof RevenueLaunchPipelineOptions, unknown>> & { confirm?: string; dryRun?: boolean };

  if (body.confirm !== "CREATE INTERNAL LAUNCH QUEUE") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with CREATE INTERNAL LAUNCH QUEUE before creating internal launch queue records."
    });
  }

  const { plan, stores } = buildMemoryRevenueLaunchPipeline(user.id, revenueLaunchOptionsFrom(body));

  if (body.dryRun) {
    return {
      applied: {
        approvalPackets: plan.storePlans
          .filter((storePlan) => storePlan.action === "queue_launch_approval" || storePlan.action === "prepare_launch_package")
          .map((storePlan) => ({ id: null, storeId: storePlan.storeId })),
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
    };
  }

  const createdProducts: Array<{ id: string; productName: string; storeId: string }> = [];
  const approvalPackets: Array<{ id: string; storeId: string; auditLogId: string | null }> = [];
  const storeUpdates: Array<{ launchStatus?: string; approvalStatus?: string; storeId: string; storeName: string }> = [];

  for (const storePlan of plan.storePlans) {
    const store = stores.find((item) => item.id === storePlan.storeId);

    if (!store) continue;

    if (storePlan.action === "seed_products") {
      const generated = generateProductBatch(store, storePlan.batchInput);
      const products = generated.map((product) => normalizePodProductBody(product as Partial<PodProduct>));
      state.podProducts.unshift(...products);
      createdProducts.push(...products.map((product) => ({
        id: product.id,
        productName: product.productName,
        storeId: product.storeId
      })));
      const index = state.merchStores.findIndex((item) => item.id === store.id && item.userId === user.id);

      if (index !== -1) {
        state.merchStores[index] = normalizeMerchStoreBody({
          approvalStatus: "Designs Pending",
          designCount: state.merchStores[index].designCount + products.length,
          launchStatus: "Designing"
        }, user.id, state.merchStores[index]);
      }
      storeUpdates.push({
        approvalStatus: "Designs Pending",
        launchStatus: "Designing",
        storeId: store.id,
        storeName: store.businessName
      });
    }

    if (storePlan.action === "queue_launch_approval" || storePlan.action === "prepare_launch_package") {
      const products = state.podProducts.filter((product) => product.storeId === store.id);
      const packet = buildGrowthApprovalPacket({
        note: `Revenue Launch Pipeline: ${storePlan.reason}`,
        products,
        store,
        storeId: store.id
      });
      const auditLogId = id("audit");
      const record: GrowthApprovalPacketRecord = {
        createdAt: now(),
        id: id("growth_packet"),
        mode: packet.mode,
        packet,
        requestAuditLogId: auditLogId,
        scheduledFor: packet.scheduledFor,
        status: "pending",
        storeId: store.id,
        updatedAt: now(),
        userId: user.id
      };
      state.growthApprovalPackets.unshift(record);
      state.auditLogs.unshift({
        action: "revenue.launch_approval.queued",
        createdAt: now(),
        entry: {
          externalExecution: false,
          packet,
          packetId: record.id,
          storePlan
        },
        entryHash: id("hash"),
        id: auditLogId,
        outcome: "success",
        severity: "medium",
        targetId: store.id,
        targetType: "revenue_launch_pipeline"
      });

      const index = state.merchStores.findIndex((item) => item.id === store.id && item.userId === user.id);

      if (index !== -1) {
        state.merchStores[index] = normalizeMerchStoreBody({ launchStatus: "Awaiting Approval" }, user.id, state.merchStores[index]);
      }
      approvalPackets.push({
        auditLogId,
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

  state.auditLogs.unshift({
    action: "revenue.launch_pipeline.applied",
    createdAt: now(),
    entry: {
      approvalPackets,
      createdProducts,
      dryRun: false,
      externalExecution: false,
      options: plan.options,
      storeUpdates,
      summary: plan.summary
    },
    entryHash: id("hash"),
    id: id("audit"),
    outcome: "success",
    severity: createdProducts.length + approvalPackets.length > 0 ? "medium" : "low",
    targetId: null,
    targetType: "revenue_launch_pipeline"
  });

  return {
    applied: {
      approvalPackets,
      auditLogId: state.auditLogs[0]?.id ?? null,
      createdProducts,
      dryRun: false,
      externalExecution: false,
      storeUpdates
    },
    plan
  };
});

app.post("/api/v1/merch/revenue-engine/rotation/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof RevenueEngineThresholds, unknown>> & { confirm?: string; dryRun?: boolean };

  if (body.confirm !== "APPLY INTERNAL ROTATION") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with APPLY INTERNAL ROTATION before applying internal revenue rotation changes."
    });
  }

  const plan = buildMemoryRevenueEnginePlan(user.id, revenueThresholdsFrom(body));
  const productUpdates = plan.rotationChanges.filter((change) => change.targetType === "product");
  const storeUpdates = plan.rotationChanges.filter((change) => change.targetType === "store");

  if (!body.dryRun) {
    const ownedStoreIds = new Set(state.merchStores.filter((store) => store.userId === user.id).map((store) => store.id));

    for (const change of productUpdates) {
      const index = state.podProducts.findIndex((product) => product.id === change.targetId && ownedStoreIds.has(product.storeId));

      if (index !== -1) {
        state.podProducts[index] = normalizePodProductBody({ status: change.toStatus as PodProduct["status"] }, state.podProducts[index]);
      }
    }

    for (const change of storeUpdates) {
      const index = state.merchStores.findIndex((store) => store.id === change.targetId && store.userId === user.id);

      if (index !== -1) {
        state.merchStores[index] = normalizeMerchStoreBody({ launchStatus: change.toStatus as ClientMerchStore["launchStatus"] }, user.id, state.merchStores[index]);
      }
    }

    state.auditLogs.unshift({
      action: "revenue.rotation.applied",
      createdAt: now(),
      entry: {
        dryRun: false,
        externalExecution: false,
        productUpdates,
        storeUpdates,
        summary: plan.summary,
        thresholds: plan.thresholds
      },
      entryHash: id("hash"),
      id: id("audit"),
      outcome: "success",
      severity: productUpdates.length + storeUpdates.length > 0 ? "medium" : "low",
      targetId: null,
      targetType: "revenue_engine"
    });
  }

  return {
    applied: {
      auditLogId: body.dryRun ? null : state.auditLogs[0]?.id ?? null,
      dryRun: Boolean(body.dryRun),
      externalExecution: false,
      productUpdates,
      storeUpdates
    },
    plan,
    portfolio: buildMemoryRevenueAssetPortfolio(user.id, revenueThresholdsFrom(body))
  };
});

app.get("/api/v1/merch/stores/:storeId/launch-package", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { storeId } = request.params as { storeId: string };
  const store = state.merchStores.find((item) => item.id === storeId && item.userId === user.id);

  if (!store) {
    return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
  }

  const products = state.podProducts.filter((product) => product.storeId === store.id);
  return { package: buildLaunchPackage(store, products) };
});

app.get("/api/v1/merch/stores/:storeId/provider-payloads", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { storeId } = request.params as { storeId: string };
  const query = request.query as { includeUnapproved?: string; maxProducts?: string };
  const store = state.merchStores.find((item) => item.id === storeId && item.userId === user.id);

  if (!store) {
    return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
  }

  const products = state.podProducts.filter((product) => product.storeId === store.id);
  return {
    package: buildProviderPayloadPackage({
      options: {
        includeUnapproved: query.includeUnapproved === "true",
        maxProducts: Number(query.maxProducts ?? 5)
      },
      products,
      store,
      storeId: store.id
    })
  };
});

app.post("/api/v1/merch/stores/:storeId/provider-payloads/approval-request", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { storeId } = request.params as { storeId: string };
  const body = (request.body ?? {}) as { includeUnapproved?: boolean; maxProducts?: number; note?: string; scheduledFor?: string };
  const store = state.merchStores.find((item) => item.id === storeId && item.userId === user.id);

  if (!store) {
    return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
  }

  const products = state.podProducts.filter((product) => product.storeId === store.id);
  const providerPackage = buildProviderPayloadPackage({
    options: {
      includeUnapproved: Boolean(body.includeUnapproved),
      maxProducts: Number(body.maxProducts ?? 5)
    },
    products,
    store,
    storeId: store.id
  });
  const packet = buildProviderPayloadApprovalPacket({
    note: body.note,
    package: providerPackage,
    scheduledFor: body.scheduledFor ?? null,
    storeId: store.id
  });
  const auditLogId = id("audit");
  const record: GrowthApprovalPacketRecord = {
    createdAt: now(),
    id: id("growth_packet"),
    mode: packet.mode,
    packet,
    requestAuditLogId: auditLogId,
    scheduledFor: packet.scheduledFor,
    status: "pending",
    storeId: store.id,
    updatedAt: now(),
    userId: user.id
  };
  state.growthApprovalPackets.unshift(record);
  state.auditLogs.unshift({
    action: "provider_payload.approval.requested",
    createdAt: now(),
    entry: {
      packet,
      packetId: record.id,
      providerPackage: {
        adapterCoverage: providerPackage.adapterCoverage,
        payloadCount: providerPackage.payloadCount,
        providerContacted: providerPackage.providerContacted,
        readinessScore: providerPackage.readinessScore
      },
      store: {
        businessName: store.businessName,
        platform: store.storePlatform,
        podProvider: store.podProvider
      }
    },
    entryHash: id("hash"),
    id: auditLogId,
    outcome: "success",
    severity: providerPackage.payloadCount > 0 ? "medium" : "low",
    targetId: store.id,
    targetType: "provider_payload_package"
  });

  return reply.code(201).send({
    approval: publicGrowthApprovalPacket(record),
    auditLogId,
    packet,
    providerPackage
  });
});

app.get("/api/v1/merch/stores/:storeId/growth-plan", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { storeId } = request.params as { storeId: string };
  const store = state.merchStores.find((item) => item.id === storeId && item.userId === user.id);

  if (!store) {
    return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
  }

  const products = state.podProducts.filter((product) => product.storeId === store.id);
  return { plan: buildGrowthPlan(store, products) };
});

app.get("/api/v1/merch/stores/:storeId/growth-approvals", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { storeId } = request.params as { storeId: string };
  const store = state.merchStores.find((item) => item.id === storeId && item.userId === user.id);

  if (!store) {
    return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
  }

  const items = state.growthApprovalPackets
    .filter((packet) => packet.storeId === store.id && packet.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 25)
    .map(publicGrowthApprovalPacket);

  return { items };
});

app.post("/api/v1/merch/stores/:storeId/growth-plan/approval-request", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { storeId } = request.params as { storeId: string };
  const body = request.body as { note?: string; scheduledFor?: string };
  const store = state.merchStores.find((item) => item.id === storeId && item.userId === user.id);

  if (!store) {
    return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
  }

  const products = state.podProducts.filter((product) => product.storeId === store.id);
  const packet = buildGrowthApprovalPacket({
    note: body.note ?? null,
    products,
    scheduledFor: body.scheduledFor ?? null,
    store,
    storeId: store.id
  });
  const record: GrowthApprovalPacketRecord = {
    createdAt: now(),
    id: id("growth_approval"),
    mode: packet.mode,
    packet,
    requestAuditLogId: null,
    reviewAuditLogId: null,
    reviewedAt: null,
    reviewedById: null,
    reviewNote: null,
    scheduledFor: packet.scheduledFor,
    status: "pending",
    storeId: store.id,
    updatedAt: now(),
    userId: user.id
  };
  const auditLog = {
    action: "growth.approval.requested",
    createdAt: now(),
    entry: {
      packet,
      packetId: record.id,
      store: {
        businessName: store.businessName,
        platform: store.storePlatform
      }
    },
    entryHash: id("hash"),
    id: id("audit"),
    outcome: "success",
    severity: "medium",
    targetId: record.id,
    targetType: "growth_approval_packet"
  };

  record.requestAuditLogId = auditLog.id;
  state.growthApprovalPackets.unshift(record);
  state.auditLogs.unshift(auditLog);

  return reply.code(201).send({
    approval: publicGrowthApprovalPacket(record),
    auditLogId: auditLog.id,
    packet
  });
});

function reviewMemoryGrowthApproval(request: FastifyRequest, reply: FastifyReply, status: GrowthApprovalPacketRecord["status"]) {
  const user = currentUserOrThrow(request);
  const { packetId, storeId } = request.params as { packetId: string; storeId: string };
  const body = request.body as { note?: string };
  const record = state.growthApprovalPackets.find((item) => (
    item.id === packetId && item.storeId === storeId && item.userId === user.id
  ));

  if (!record) {
    return reply.code(404).send({ error: "Not Found", message: "Growth approval packet was not found." });
  }

  if (record.status !== "pending") {
    return reply.code(409).send({
      error: "Conflict",
      message: `This growth approval packet is already ${growthApprovalStatusLabel(record.status).toLowerCase()}.`
    });
  }

  record.status = status;
  record.reviewedAt = now();
  record.reviewedById = user.id;
  record.reviewNote = body.note?.trim() || null;
  record.updatedAt = now();

  const auditLog = {
    action: status === "approved" ? "growth.approval.approved" : "growth.approval.rejected",
    createdAt: now(),
    entry: {
      externalExecution: false,
      note: record.reviewNote,
      packet: record.packet,
      packetId: record.id,
      reviewStatus: status
    },
    entryHash: id("hash"),
    id: id("audit"),
    outcome: "success",
    severity: status === "approved" ? "medium" : "low",
    targetId: record.id,
    targetType: "growth_approval_packet"
  };

  record.reviewAuditLogId = auditLog.id;
  state.auditLogs.unshift(auditLog);

  return reply.send({
    approval: publicGrowthApprovalPacket(record),
    auditLogId: auditLog.id,
    message: status === "approved"
      ? "Growth packet approved for preparation only. No external action executed."
      : "Growth packet rejected. No external action executed."
  });
}

app.post("/api/v1/merch/stores/:storeId/growth-approvals/:packetId/approve", { preHandler: requireAuth }, async (request, reply) => (
  reviewMemoryGrowthApproval(request, reply, "approved")
));

app.post("/api/v1/merch/stores/:storeId/growth-approvals/:packetId/reject", { preHandler: requireAuth }, async (request, reply) => (
  reviewMemoryGrowthApproval(request, reply, "rejected")
));

app.get("/api/v1/merch/stores/:storeId/growth-approvals/:packetId/orchestration-preview", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { packetId, storeId } = request.params as { packetId: string; storeId: string };
  const record = state.growthApprovalPackets.find((item) => (
    item.id === packetId && item.storeId === storeId && item.userId === user.id
  ));

  if (!record) {
    return reply.code(404).send({ error: "Not Found", message: "Growth approval packet was not found." });
  }

  if (record.status !== "approved") {
    return reply.code(409).send({
      error: "Conflict",
      message: "Approve the growth packet before previewing the locked orchestration handoff."
    });
  }

  const preview = buildGrowthOrchestrationPreview(record.packet);
  const auditLog = {
    action: "growth.orchestration.previewed",
    createdAt: now(),
    entry: {
      externalExecution: false,
      packetId: record.id,
      preview
    },
    entryHash: id("hash"),
    id: id("audit"),
    outcome: "success",
    severity: "low",
    targetId: record.id,
    targetType: "growth_approval_packet"
  };

  state.auditLogs.unshift(auditLog);

  return {
    auditLogId: auditLog.id,
    preview
  };
});

app.get("/api/v1/merch/stores/:storeId/growth-approvals/:packetId/provider-handoff", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { packetId, storeId } = request.params as { packetId: string; storeId: string };
  const record = state.growthApprovalPackets.find((item) => (
    item.id === packetId && item.storeId === storeId && item.userId === user.id
  ));

  if (!record) {
    return reply.code(404).send({ error: "Not Found", message: "Growth approval packet was not found." });
  }

  if (record.status !== "approved") {
    return reply.code(409).send({
      error: "Conflict",
      message: "Approve the provider payload packet before building a handoff bundle."
    });
  }

  if (!isProviderPayloadApprovalPacket(record.packet)) {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Only provider payload approval packets can produce provider handoff bundles."
    });
  }

  const store = state.merchStores.find((item) => item.id === storeId && item.userId === user.id);

  if (!store) {
    return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
  }

  const products = state.podProducts.filter((product) => product.storeId === store.id);
  const providerPackage = buildProviderPayloadPackage({
    products,
    store,
    storeId: store.id
  });
  const bundle = buildProviderHandoffBundle({
    approvalId: record.id,
    package: providerPackage,
    packet: record.packet,
    reviewedAt: record.reviewedAt,
    reviewAuditLogId: record.reviewAuditLogId ?? null
  });
  const auditLog = {
    action: "provider_payload.handoff.generated",
    createdAt: now(),
    entry: {
      bundle,
      externalExecution: false,
      packetId: record.id,
      providerContacted: false
    },
    entryHash: id("hash"),
    id: id("audit"),
    outcome: "success",
    severity: bundle.connectorReadiness.status === "Ready for manual handoff" ? "low" : "medium",
    targetId: record.id,
    targetType: "provider_payload_handoff"
  };

  state.auditLogs.unshift(auditLog);

  return {
    auditLogId: auditLog.id,
    bundle
  };
});

app.get("/api/v1/merch/stores/:storeId/reports/:reportType", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { reportType, storeId } = request.params as { reportType: MerchReportType; storeId: string };
  const store = state.merchStores.find((item) => item.id === storeId && item.userId === user.id);

  if (!store) {
    return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
  }

  const products = state.podProducts.filter((product) => product.storeId === store.id);
  return { report: buildMerchReport(reportType, store, products) };
});

app.get("/api/v1/merch/stores/:storeId", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { storeId } = request.params as { storeId: string };
  const store = state.merchStores.find((item) => item.id === storeId && item.userId === user.id);

  if (!store) {
    return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
  }

  return { store: publicMerchStore(store) };
});

app.patch("/api/v1/merch/stores/:storeId", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { storeId } = request.params as { storeId: string };
  const index = state.merchStores.findIndex((item) => item.id === storeId && item.userId === user.id);

  if (index === -1) {
    return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
  }

  const store = normalizeMerchStoreBody(request.body as Partial<ClientMerchStore>, user.id, state.merchStores[index]);
  state.merchStores[index] = store;
  return { store: publicMerchStore(store) };
});

app.delete("/api/v1/merch/stores/:storeId", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { storeId } = request.params as { storeId: string };
  const originalLength = state.merchStores.length;
  state.merchStores = state.merchStores.filter((store) => !(store.id === storeId && store.userId === user.id));

  if (state.merchStores.length === originalLength) {
    return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
  }

  state.podProducts = state.podProducts.filter((product) => product.storeId !== storeId);

  return reply.code(204).send();
});

app.post("/api/v1/merch/compliance/check", { preHandler: requireAuth }, async (request) => {
  currentUserOrThrow(request);
  return { compliance: analyzeCompliance(request.body as Parameters<typeof analyzeCompliance>[0]) };
});

app.post("/api/v1/merch/pricing/calculate", { preHandler: requireAuth }, async (request) => {
  currentUserOrThrow(request);
  const body = request.body as {
    adSpendEstimate?: number;
    listingFee?: number;
    paymentProcessingEstimate?: number;
    platformFeePercent?: number;
    preset?: PricingPlatformPreset;
    retailPrice?: number;
    shippingCost?: number;
    supplierCost?: number;
  };
  const presetName = body.preset && body.preset in pricingPlatformPresets ? body.preset : "Etsy";
  const preset = pricingPlatformPresets[presetName];

  return {
    preset: presetName,
    pricing: calculatePricing({
      adSpendEstimate: Number(body.adSpendEstimate ?? 0),
      listingFee: Number(body.listingFee ?? preset.listingFee),
      paymentProcessingEstimate: Number(body.paymentProcessingEstimate ?? preset.paymentProcessingEstimate),
      platformFeePercent: Number(body.platformFeePercent ?? preset.platformFeePercent),
      retailPrice: Number(body.retailPrice ?? 0),
      shippingCost: Number(body.shippingCost ?? 0),
      supplierCost: Number(body.supplierCost ?? 0)
    })
  };
});

app.get("/api/v1/merch/products", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const query = request.query as {
    page?: string;
    pageSize?: string;
    search?: string;
    status?: PodProduct["status"];
    storeId?: string;
  };
  const ownedStoreIds = state.merchStores.filter((store) => store.userId === user.id).map((store) => store.id);

  if (query.storeId && !ownedStoreIds.includes(query.storeId)) {
    return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
  }

  const page = Math.max(Number(query.page ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize ?? 20), 1), 100);
  const search = query.search?.trim().toLowerCase();
  const filtered = state.podProducts.filter((product) => {
    if (!ownedStoreIds.includes(product.storeId)) return false;
    if (query.storeId && product.storeId !== query.storeId) return false;
    if (query.status && product.status !== query.status) return false;
    if (!search) return true;

    return [
      product.productName,
      product.productType,
      product.targetAudience,
      product.designTheme,
      product.listingTitle ?? ""
    ].some((value) => value.toLowerCase().includes(search));
  });
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    items: items.map(publicPodProduct),
    page,
    pageSize,
    total: filtered.length
  };
});

app.get("/api/v1/merch/stores/:storeId/products", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { storeId } = request.params as { storeId: string };
  const store = state.merchStores.find((item) => item.id === storeId && item.userId === user.id);

  if (!store) {
    return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
  }

  const products = state.podProducts.filter((product) => product.storeId === store.id);

  return {
    items: products.map(publicPodProduct),
    page: 1,
    pageSize: products.length || 20,
    total: products.length
  };
});

app.post("/api/v1/merch/products", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<PodProduct>;
  const store = state.merchStores.find((item) => item.id === body.storeId && item.userId === user.id);

  if (!store) {
    return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
  }

  if (body.status === "Published") {
    return reply.code(400).send({ error: "Bad Request", message: "Products must be approved before publishing." });
  }

  const product = normalizePodProductBody(body);
  state.podProducts.unshift(product);
  return reply.code(201).send({ product: publicPodProduct(product) });
});

app.post("/api/v1/merch/products/batch", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<ProductBatchInput>;
  const store = state.merchStores.find((item) => item.id === body.storeId && item.userId === user.id);

  if (!store) {
    return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
  }

  const requestedCount = Number(body.productCount ?? 5);
  const productCount = ([5, 10, 15, 25] as const).includes(requestedCount as 5 | 10 | 15 | 25)
    ? requestedCount as 5 | 10 | 15 | 25
    : 5;
  const priceRange = {
    min: Number(body.priceRange?.min ?? 24),
    max: Number(body.priceRange?.max ?? 48)
  };
  const input: ProductBatchInput = {
    audience: body.audience?.trim() || store.audience,
    priceRange: priceRange.max >= priceRange.min ? priceRange : { min: priceRange.max, max: priceRange.min },
    productCount,
    productTypes: Array.isArray(body.productTypes) && body.productTypes.length > 0 ? body.productTypes : store.productTypes.length > 0 ? store.productTypes : ["T-shirt"],
    riskTolerance: body.riskTolerance === "Low" || body.riskTolerance === "High" ? body.riskTolerance : "Medium",
    storeId: store.id,
    styleDirection: body.styleDirection?.trim() || store.brandStyle
  };
  const generated = generateProductBatch(store, input);
  const products = generated.map((product) => normalizePodProductBody(product as Partial<PodProduct>));
  state.podProducts.unshift(...products);
  const warnings = generated
    .flatMap((product) => product.complianceNotes?.split(".").map((warning) => warning.trim()).filter(Boolean) ?? [])
    .filter((warning, index, all) => all.indexOf(warning) === index);

  return reply.code(201).send({
    batch: {
      productCount: products.length,
      riskTolerance: input.riskTolerance,
      storeId: store.id,
      warnings
    },
    products: products.map(publicPodProduct)
  });
});

app.get("/api/v1/merch/products/:productId", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { productId } = request.params as { productId: string };
  const ownedStoreIds = state.merchStores.filter((store) => store.userId === user.id).map((store) => store.id);
  const product = state.podProducts.find((item) => item.id === productId && ownedStoreIds.includes(item.storeId));

  if (!product) {
    return reply.code(404).send({ error: "Not Found", message: "POD product was not found." });
  }

  return { product: publicPodProduct(product) };
});

app.patch("/api/v1/merch/products/:productId", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { productId } = request.params as { productId: string };
  const ownedStoreIds = state.merchStores.filter((store) => store.userId === user.id).map((store) => store.id);
  const index = state.podProducts.findIndex((item) => item.id === productId && ownedStoreIds.includes(item.storeId));

  if (index === -1) {
    return reply.code(404).send({ error: "Not Found", message: "POD product was not found." });
  }

  const body = request.body as Partial<PodProduct>;

  if (body.storeId && !ownedStoreIds.includes(body.storeId)) {
    return reply.code(404).send({ error: "Not Found", message: "Target merch store was not found." });
  }

  if (body.status === "Published" && state.podProducts[index].status !== "Approved") {
    return reply.code(400).send({ error: "Bad Request", message: "Products must be approved before publishing." });
  }

  const product = normalizePodProductBody(body, state.podProducts[index]);
  state.podProducts[index] = product;
  return { product: publicPodProduct(product) };
});

app.delete("/api/v1/merch/products/:productId", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { productId } = request.params as { productId: string };
  const ownedStoreIds = state.merchStores.filter((store) => store.userId === user.id).map((store) => store.id);
  const originalLength = state.podProducts.length;
  state.podProducts = state.podProducts.filter((product) => !(product.id === productId && ownedStoreIds.includes(product.storeId)));

  if (state.podProducts.length === originalLength) {
    return reply.code(404).send({ error: "Not Found", message: "POD product was not found." });
  }

  return reply.code(204).send();
});

app.get("/api/v1/ai/conversations", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const items = [...state.conversations.values()]
    .filter((conversation) => conversation.userId === user.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((conversation) => ({
      createdAt: conversation.createdAt,
      id: conversation.id,
      lastMessage: conversation.messages.at(-1)?.content ?? null,
      title: conversation.title,
      updatedAt: conversation.updatedAt
    }));

  return { items };
});

app.get("/api/v1/ai/usage", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);

  return {
    summary: aiUsageSummary(user.id)
  };
});

app.post("/api/v1/ai/conversations/import", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as { conversations?: Array<{ messages?: Message[]; title?: string }> };
  const conversations = (body.conversations ?? []).map((item) => {
    const conversation: Conversation = {
      createdAt: now(),
      id: id("convo"),
      messages: (item.messages ?? []).map((message) => ({ ...message, id: message.id ?? id("msg") })),
      title: item.title ?? "Imported thread",
      updatedAt: now(),
      userId: user.id
    };
    state.conversations.set(conversation.id, conversation);
    return conversation;
  });

  return reply.code(201).send({ conversations });
});

app.get("/api/v1/ai/conversations/:conversationId", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { conversationId } = request.params as { conversationId: string };
  const conversation = state.conversations.get(conversationId);

  if (!conversation || conversation.userId !== user.id) {
    return reply.code(404).send({ error: "Not Found", message: "Conversation was not found." });
  }

  return reply.send({ conversation });
});

app.delete("/api/v1/ai/conversations/:conversationId", { preHandler: requireAuth }, async (request) => {
  const { conversationId } = request.params as { conversationId: string };
  state.conversations.delete(conversationId);
  return { ok: true };
});

async function chatReply(request: FastifyRequest, reply: FastifyReply) {
  const user = currentUserOrThrow(request);
  const body = request.body as { conversationId?: string; message?: string; prompt?: string; screenshot?: string };
  const text = body.message ?? body.prompt ?? "";
  const { createAiAuditEntry } = await import("./services/aiBrain.js");
  const { createProviderBackedAiDecision } = await import("./services/openaiService.js");
  const {
    createDevelopmentStatusReport,
    createReadOnlyWriteRefusal,
    isDevelopmentStatusRequest,
    isDevelopmentWriteActionRequest
  } = await import("./services/developmentConnections.js");
  const requestKind = body.screenshot
    ? "screen"
    : isDevelopmentWriteActionRequest(text)
      ? "development_write_refusal"
      : isDevelopmentStatusRequest(text) ? "development_status" : "chat";
  const usagePreflight = assertAiMemoryUsage(user.id, requestKind, reply);

  if (!usagePreflight) {
    return;
  }

  const brainDecision = await createProviderBackedAiDecision(text);
  const brainPlan = brainDecision.plan;
  const conversation = body.conversationId && state.conversations.get(body.conversationId)?.userId === user.id
    ? state.conversations.get(body.conversationId)!
    : {
      createdAt: now(),
      id: id("convo"),
      messages: [],
      title: text.slice(0, 58) || "New thread",
      updatedAt: now(),
      userId: user.id
    };

  state.conversations.set(conversation.id, conversation);

  const userMessage: Message = {
    content: text,
    createdAt: now(),
    id: id("msg"),
    role: "user"
  };
  conversation.messages.push(userMessage);

  let assistantContent: string;
  const developmentChecks: Array<{ status: string; toolId: string; toolName: string; readOnly: boolean; writeActionsEnabled: boolean }> = [];

  if (isDevelopmentWriteActionRequest(text)) {
    assistantContent = createReadOnlyWriteRefusal();
  } else if (isDevelopmentStatusRequest(text)) {
    const report = await createDevelopmentStatusReport(text);
    assistantContent = report.content;
    developmentChecks.push(...report.checks.map((check) => ({
      readOnly: check.readOnly,
      status: check.status,
      toolId: check.toolId,
      toolName: check.toolName,
      writeActionsEnabled: check.writeActionsEnabled
    })));
  } else {
    assistantContent = await createAssistantContent(conversation, text, body.screenshot, brainPlan);
  }

  const assistantMessage: Message = {
    content: assistantContent,
    createdAt: now(),
    id: id("msg"),
    role: "assistant"
  };
  conversation.messages.push(assistantMessage);
  conversation.updatedAt = assistantMessage.createdAt;
  const isDevelopmentOnlyUsage = requestKind === "development_status" || requestKind === "development_write_refusal";
  const usedLocalFallback = !isDevelopmentOnlyUsage && !openAiApiKey;
  const usageEvent: AiUsageEvent = {
    createdAt: now(),
    estimatedCostCents: usagePreflight.estimatedCostCents,
    id: id("usage"),
    modelName: isDevelopmentOnlyUsage ? "read-only-development-monitor" : usedLocalFallback ? "local-fallback" : openAiModel,
    providerName: isDevelopmentOnlyUsage ? "ENTRAL Development Monitor" : "OpenAI",
    requestKind,
    usedLocalFallback,
    userId: user.id
  };
  state.aiUsageEvents.unshift(usageEvent);
  const brainAuditEntry = createAiAuditEntry({
    errors: brainDecision.errors,
    executionResult: body.screenshot
      ? "Screen analysis response generated. Screenshot was processed transiently and not stored."
      : brainPlan.authorizationRequired ? "Plan prepared. Authorization required before execution." : "Plan prepared. No external action executed.",
    modelName: openAiApiKey ? openAiModel : "local-fallback",
    plan: brainPlan,
    providerName: "OpenAI"
  });
  state.auditLogs.unshift({
    action: body.screenshot ? "ai.screen.analyzed" : "ai.command.planned",
    createdAt: now(),
    entry: {
      authorizationRequired: brainPlan.authorizationRequired,
      decisionSource: brainDecision.source,
      errors: brainDecision.errors,
      plan: brainPlan,
      provider: "OpenAI",
      providerStatus: brainDecision.provider.connectionStatus,
      screenshotStored: false,
      usage: {
        estimatedCostCents: usageEvent.estimatedCostCents,
        eventId: usageEvent.id,
        requestKind
      },
      userMessage: text
    },
    entryHash: id("hash"),
    id: id("audit"),
    outcome: "success",
    severity: brainPlan.riskLevel === "Critical" ? "critical" : brainPlan.riskLevel === "High" ? "high" : brainPlan.riskLevel === "Medium" ? "medium" : "info",
    targetId: conversation.id,
    targetType: "ai_conversation"
  });

  for (const check of developmentChecks) {
    state.auditLogs.unshift({
      action: check.toolId === "github" ? "github.status.read" : "vercel.status.read",
      createdAt: now(),
      entry: {
        readOnly: check.readOnly,
        requestedBy: text,
        resultStatus: check.status,
        tool: check.toolName,
        writeActionsEnabled: check.writeActionsEnabled
      },
      entryHash: id("hash"),
      id: id("audit"),
      outcome: check.status === "Connected" ? "success" : check.status === "Error" ? "failure" : "blocked",
      severity: check.status === "Error" ? "medium" : "low",
      targetId: check.toolId,
      targetType: "external_tool"
    });
  }

  return {
    content: assistantMessage.content,
    conversationId: conversation.id,
    createdAt: assistantMessage.createdAt,
    messageId: assistantMessage.id,
    userMessage: {
      content: userMessage.content,
      createdAt: userMessage.createdAt,
      messageId: userMessage.id
    },
    brain: {
      auditEntry: brainAuditEntry,
      plan: brainPlan
    },
    usage: {
      estimatedCostCents: usageEvent.estimatedCostCents,
      eventId: usageEvent.id,
      summary: aiUsageSummary(user.id)
    }
  };
}

app.post("/api/v1/ai/chat", { preHandler: requireAuth }, chatReply);
app.post("/api/v1/ai/screen", { preHandler: requireAuth }, chatReply);

app.get("/api/v1/connections/tools", { preHandler: requireAuth }, async () => {
  const { getToolRegistry } = await import("./services/toolRegistry.js");
  const items = getToolRegistry();
  const categories = items.reduce<Record<string, number>>((groups, tool) => {
    groups[tool.category] = (groups[tool.category] ?? 0) + 1;
    return groups;
  }, {});

  return {
    categories,
    items
  };
});

app.post("/api/v1/connections/tools/:toolId/test", { preHandler: requireAuth }, async (request, reply) => {
  const { toolId } = request.params as { toolId: string };
  const { buildToolTestResultWithProvider, getToolById } = await import("./services/toolRegistry.js");
  const tool = getToolById(toolId);

  if (!tool) {
    return reply.code(404).send({ error: "Not Found", message: "Tool was not found." });
  }

  const result = await buildToolTestResultWithProvider(tool);

  if (tool.id === "github" || tool.id === "vercel") {
    state.auditLogs.unshift({
      action: tool.id === "github" ? "github.status.read" : "vercel.status.read",
      createdAt: now(),
      entry: {
        readOnly: result.readOnly ?? false,
        resultStatus: result.status,
        tool: result.toolName,
        writeActionsEnabled: result.writeActionsEnabled ?? false
      },
      entryHash: id("hash"),
      id: id("audit"),
      outcome: result.success ? "success" : result.status === "Error" ? "failure" : "blocked",
      severity: result.status === "Error" ? "medium" : "low",
      targetId: tool.id,
      targetType: "external_tool"
    });
  }

  return { result };
});

app.get("/api/v1/connections/development-status", { preHandler: requireAuth }, async () => {
  const { getDevelopmentStatusSnapshot } = await import("./services/developmentConnections.js");
  const snapshot = await getDevelopmentStatusSnapshot();

  for (const result of [snapshot.github, snapshot.vercel]) {
    state.auditLogs.unshift({
      action: result.toolId === "github" ? "github.status.read" : "vercel.status.read",
      createdAt: now(),
      entry: {
        readOnly: result.readOnly,
        resultStatus: result.status,
        tool: result.toolName,
        writeActionsEnabled: result.writeActionsEnabled
      },
      entryHash: id("hash"),
      id: id("audit"),
      outcome: result.status === "Connected" ? "success" : result.status === "Error" ? "failure" : "blocked",
      severity: result.status === "Error" ? "medium" : "low",
      targetId: result.toolId,
      targetType: "external_tool"
    });
  }

  return snapshot;
});

app.post("/api/v1/connections/tools/:toolId/mock-execute", { preHandler: requireAuth }, async (request, reply) => {
  const { toolId } = request.params as { toolId: string };
  const body = request.body as { request?: string };
  const { buildMockToolExecution, getToolById } = await import("./services/toolRegistry.js");
  const tool = getToolById(toolId);

  if (!tool) {
    return reply.code(404).send({ error: "Not Found", message: "Tool was not found." });
  }

  return { result: buildMockToolExecution(tool, body.request ?? "") };
});

app.get("/api/v1/automation/jobs", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  return { items: state.automationJobs.filter((job) => job.userId === user.id) };
});

app.get("/api/v1/automation/browser-operations", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const plan = buildMemoryBrowserOperations(
    user.id,
    browserOperationOptionsFrom(request.query as Partial<Record<keyof BrowserOperationOptions, unknown>>)
  );

  return { plan };
});

app.post("/api/v1/automation/browser-operations/recovery/apply", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Record<keyof BrowserOperationOptions, unknown>> & {
    confirm?: string;
    dryRun?: boolean;
  };
  const options = browserOperationOptionsFrom(body);
  const plan = buildMemoryBrowserOperations(user.id, options);
  const recoveryRunbooks = plan.runbooks.filter((runbook) => (
    (runbook.action === "retry_failed_job" || runbook.action === "recover_stale_running_job")
    && runbook.targetId
  )).slice(0, options.maxRecoveryJobs ?? 10);

  if (body.confirm !== "APPLY INTERNAL BROWSER RECOVERY ACTIONS") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Confirm with APPLY INTERNAL BROWSER RECOVERY ACTIONS before changing browser operation queue records."
    });
  }

  if (body.dryRun) {
    return {
      applied: {
        dryRun: true,
        externalExecution: false,
        providerContacted: false,
        recoveryRunbooks: recoveryRunbooks.length,
        requeuedJobIds: recoveryRunbooks.filter((runbook) => runbook.action === "retry_failed_job").map((runbook) => runbook.targetId),
        staleRecoveredJobIds: recoveryRunbooks.filter((runbook) => runbook.action === "recover_stale_running_job").map((runbook) => runbook.targetId)
      },
      plan
    };
  }

  const applied = applyMemoryBrowserRecovery(user.id, plan, options);
  const refreshed = buildMemoryBrowserOperations(user.id, options);

  return {
    applied: {
      ...applied,
      dryRun: false,
      externalExecution: false,
      providerContacted: false
    },
    plan: refreshed
  };
});

app.post("/api/v1/automation/jobs", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as { payload?: AutomationJob["payload"]; scheduledAt?: string; type?: string };
  const job: AutomationJob = {
    createdAt: now(),
    error: null,
    id: id("job"),
    logs: [{ createdAt: now(), id: id("log"), level: "info", message: "Dev memory backend completed this job." }],
    payload: body.payload ?? {},
    result: {
      content: `Fetched ${body.payload?.selector ?? "page"} from ${body.payload?.url ?? "target"}.`,
      engine: "memory",
      statusCode: 200,
      title: "Dev scrape result"
    },
    scheduledAt: body.scheduledAt ?? null,
    status: "completed",
    type: body.type ?? "scrape",
    userId: user.id
  };
  state.automationJobs.unshift(job);
  return reply.code(201).send({ job });
});

app.post("/api/v1/automation/jobs/:jobId/cancel", { preHandler: requireAuth }, async (request) => {
  const { jobId } = request.params as { jobId: string };
  const job = state.automationJobs.find((item) => item.id === jobId);
  if (job) job.status = "canceled";
  return { job };
});

app.post("/api/v1/automation/jobs/:jobId/retry", { preHandler: requireAuth }, async (request) => {
  const { jobId } = request.params as { jobId: string };
  const job = state.automationJobs.find((item) => item.id === jobId);
  if (job) {
    job.status = "completed";
    job.logs.unshift({ createdAt: now(), id: id("log"), level: "info", message: "Run again completed in memory mode." });
  }
  return { job };
});

app.get("/api/v1/agents", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  return { items: [...state.agents.values()].filter((agent) => agent.userId === user.id) };
});

app.post("/api/v1/agents", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Agent>;
  const agent: Agent = {
    capabilities: body.capabilities ?? ["general"],
    id: id("agent"),
    isPaused: false,
    lastActivitySeenAt: null,
    load: 0,
    name: body.name ?? "Researcher",
    role: body.role ?? "Research and summarize findings",
    runInBackground: body.runInBackground ?? true,
    status: "idle",
    userId: user.id,
    webhookUrl: body.webhookUrl ?? null
  };
  state.agents.set(agent.id, agent);
  state.agentTasks.set(agent.id, []);
  state.agentLogs.set(agent.id, [{ createdAt: now(), id: id("log"), level: "info", message: "Agent created in local memory mode." }]);
  state.agentMessages.set(agent.id, []);
  state.agentSchedules.set(agent.id, []);
  return reply.code(201).send({ agent });
});

app.get("/api/v1/agents/:agentId", { preHandler: requireAuth }, async (request, reply) => {
  const { agentId } = request.params as { agentId: string };
  const agent = state.agents.get(agentId);

  if (!agent) {
    return reply.code(404).send({ error: "Not Found", message: "Agent was not found." });
  }

  return {
    agent,
    logs: state.agentLogs.get(agentId) ?? [],
    messages: state.agentMessages.get(agentId) ?? [],
    schedules: state.agentSchedules.get(agentId) ?? [],
    tasks: state.agentTasks.get(agentId) ?? []
  };
});

app.post("/api/v1/agents/:agentId/assign", { preHandler: requireAuth }, async (request, reply) => {
  const { agentId } = request.params as { agentId: string };
  const agent = state.agents.get(agentId);
  const body = request.body as { action?: string; title?: string };

  if (!agent) {
    return reply.code(404).send({ error: "Not Found", message: "Agent was not found." });
  }

  const task: AgentTask = {
    action: body.action ?? "general",
    completedAt: now(),
    id: id("agent_task"),
    result: {
      recommendation: "Use the real backend for persistent background agent execution.",
      summary: "Dev memory agent completed the task immediately."
    },
    status: "completed",
    title: body.title ?? "Agent task"
  };
  const tasks = state.agentTasks.get(agentId) ?? [];
  tasks.unshift(task);
  state.agentTasks.set(agentId, tasks);
  state.agentLogs.set(agentId, [
    { createdAt: now(), id: id("log"), level: "info", message: `Completed ${task.title}.` },
    ...(state.agentLogs.get(agentId) ?? [])
  ]);
  state.agentMessages.set(agentId, [
    { action: task.action, createdAt: now(), id: id("message"), taskId: task.id, type: "task-result" },
    ...(state.agentMessages.get(agentId) ?? [])
  ]);
  return reply.code(201).send({ task });
});

app.post("/api/v1/agents/:agentId/schedules", { preHandler: requireAuth }, async (request, reply) => {
  const { agentId } = request.params as { agentId: string };
  const body = request.body as { action?: string; intervalMinutes?: number; title?: string };
  const schedule: AgentSchedule = {
    action: body.action ?? "general",
    id: id("schedule"),
    intervalMinutes: body.intervalMinutes ?? 15,
    lastRunAt: null,
    nextRunAt: new Date(Date.now() + (body.intervalMinutes ?? 15) * 60 * 1000).toISOString(),
    status: "active",
    title: body.title ?? "Agent schedule"
  };
  state.agentSchedules.set(agentId, [schedule, ...(state.agentSchedules.get(agentId) ?? [])]);
  return reply.code(201).send({ schedule });
});

app.post("/api/v1/agents/:agentId/:action", { preHandler: requireAuth }, async (request) => {
  const { action, agentId } = request.params as { action: string; agentId: string };
  const agent = state.agents.get(agentId);
  if (agent) {
    agent.isPaused = action === "pause" ? true : action === "resume" || action === "restart" ? false : agent.isPaused;
    agent.status = agent.isPaused ? "paused" : "idle";
  }
  return { agent };
});

app.patch("/api/v1/agents/:agentId/background", { preHandler: requireAuth }, async (request) => {
  const { agentId } = request.params as { agentId: string };
  const body = request.body as { runInBackground?: boolean };
  const agent = state.agents.get(agentId);
  if (agent) agent.runInBackground = Boolean(body.runInBackground);
  return { agent };
});

app.post("/api/v1/agents/:agentId/schedules/:scheduleId/:action", { preHandler: requireAuth }, async (request) => {
  const { action, agentId, scheduleId } = request.params as { action: string; agentId: string; scheduleId: string };
  const schedule = (state.agentSchedules.get(agentId) ?? []).find((item) => item.id === scheduleId);
  if (schedule) schedule.status = action === "revoke" ? "revoked" : action === "pause" ? "paused" : "active";
  return { schedule };
});

app.post("/api/v1/agents/:agentId/tasks/:taskId/cancel", { preHandler: requireAuth }, async (request) => {
  const { agentId, taskId } = request.params as { agentId: string; taskId: string };
  const task = (state.agentTasks.get(agentId) ?? []).find((item) => item.id === taskId);
  if (task) task.status = "canceled";
  return { task };
});

app.get("/api/v1/admin/overview", { preHandler: requireAuth }, async () => ({
  activeTasks: [],
  auditLogs: state.auditLogs,
  health: {
    activeAgents: [...state.agents.values()].filter((agent) => !agent.isPaused).length,
    activeSchedules: [...state.agentSchedules.values()].flat().filter((schedule) => schedule.status === "active").length,
    agents: state.agents.size,
    enabledPolicies: [...state.policies.values()].filter((policy) => policy.enabled).length,
    policyViolations24h: 0,
    queuedAgentTasks: 0,
    runningAgentTasks: 0
  },
  policies: [...state.policies.values()]
}));

app.post("/api/v1/admin/policies", { preHandler: requireAuth }, async (request, reply) => {
  const body = request.body as Partial<Policy>;
  const policy: Policy = {
    description: body.description ?? null,
    effect: body.effect ?? "block",
    enabled: body.enabled ?? true,
    id: id("policy"),
    name: body.name ?? "Policy",
    rule: body.rule ?? { kind: "blocked_keywords", keywords: [] },
    severity: body.severity ?? "medium"
  };
  state.policies.set(policy.id, policy);
  return reply.code(201).send({ policy });
});

app.patch("/api/v1/admin/policies/:policyId", { preHandler: requireAuth }, async (request) => {
  const { policyId } = request.params as { policyId: string };
  const body = request.body as Partial<Policy>;
  const policy = state.policies.get(policyId);
  if (policy) Object.assign(policy, body);
  return { policy };
});

app.delete("/api/v1/admin/policies/:policyId", { preHandler: requireAuth }, async (request) => {
  const { policyId } = request.params as { policyId: string };
  state.policies.delete(policyId);
  return { ok: true };
});

app.post("/api/v1/admin/agents/pause-all", { preHandler: requireAuth }, async () => {
  for (const agent of state.agents.values()) {
    agent.isPaused = true;
    agent.status = "paused";
  }
  return { ok: true };
});

app.post("/api/v1/admin/agent-tasks/:taskId/revoke", { preHandler: requireAuth }, async () => ({ ok: true }));

seedDemo();

try {
  await app.listen({ host: process.env.API_HOST ?? "0.0.0.0", port: 4000 });
  app.log.info("ENTRAL memory backend ready at http://localhost:4000");
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
