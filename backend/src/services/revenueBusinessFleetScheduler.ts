import { createHash } from "node:crypto";
import type { FinancialOrchestratorPlan } from "./financialOrchestrator.js";
import type { RevenueAssetPortfolio, RevenueAssetRotationDecision, RevenueAssetScore } from "./revenueEngine.js";
import type { RevenueFirstBusinessLaunchCandidate, RevenueFirstBusinessLaunchPlan } from "./revenueFirstBusinessLaunch.js";
import type { RevenueLiveConnectorReadinessEntry, RevenueLiveConnectorReadinessRegistryPlan } from "./revenueLiveConnectorReadinessRegistry.js";

export type RevenueBusinessFleetLane = "launch_now" | "scale" | "watch" | "quality_repair" | "throttle" | "kill";
export type RevenueBusinessFleetScheduleState = "ready_parallel" | "queued" | "throttled" | "blocked";
export type RevenueBusinessFleetQualityStatus = "pass" | "watch" | "block";

export type RevenueBusinessFleetOptions = {
  killPressureThreshold: number;
  launchWaveSize: number;
  maxParallelLaunches: number;
  maxParallelScaleActions: number;
  qualityFloor: number;
  shardCount: number;
  targetBusinesses: number;
};

export type RevenueBusinessFleetScore = {
  economicsScore: number;
  finalRank: number;
  killPressure: number;
  qualityScore: number;
  readinessScore: number;
  scalePressure: number;
};

export type RevenueBusinessFleetQualityGate = {
  reasons: string[];
  status: RevenueBusinessFleetQualityStatus;
};

export type RevenueBusinessFleetNextAction = {
  endpoint: string;
  label: string;
  reason: string;
  state: string;
};

export type RevenueBusinessFleetBusiness = {
  assetCount: number;
  blockedExternalActions: string[];
  businessId: string;
  businessName: string;
  externalExecution: false;
  lane: RevenueBusinessFleetLane;
  nextInternalAction: RevenueBusinessFleetNextAction;
  parallelism: {
    launchSlots: number;
    maxInternalJobs: number;
    scaleSlots: number;
  };
  productAssets: number;
  profitVelocity: number;
  providerContacted: false;
  qualityGate: RevenueBusinessFleetQualityGate;
  recommendationCounts: Record<RevenueAssetRotationDecision, number>;
  revenueVelocity: number;
  scheduleState: RevenueBusinessFleetScheduleState;
  score: RevenueBusinessFleetScore;
  shardId: string;
  topAsset: {
    assetId: string;
    assetName: string;
    assetType: RevenueAssetScore["assetType"];
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
  options: RevenueBusinessFleetOptions;
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

export type RevenueBusinessFleetLaunchWaveSkipped = {
  businessId: string;
  businessName: string;
  reason: string;
};

export type RevenueBusinessFleetLaunchWavePlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Revenue Business Fleet Launch Wave";
  providerContacted: false;
  selectedBusinesses: RevenueBusinessFleetLaunchWaveSelection[];
  skipped: RevenueBusinessFleetLaunchWaveSkipped[];
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

export type RevenueHundredStoreOperationsStatus =
  | "ready_for_100_store_internal_operations"
  | "ready_to_build_to_100"
  | "needs_store_generation"
  | "needs_quality_repair"
  | "blocked";

export type RevenueHundredStoreOperationsGateStatus = "pass" | "watch" | "block";
export type RevenueHundredStoreApplicationStatus = "ready" | "partial" | "missing" | "blocked";
export type RevenueHundredStoreInternalJobType =
  | "advisory_growth_allocation"
  | "generate_products"
  | "monitor_performance"
  | "pause_or_kill_review"
  | "prepare_connector_packet"
  | "prepare_launch_package"
  | "queue_organic_content"
  | "repair_quality";
export type RevenueHundredStoreApplicationRole = RevenueLiveConnectorReadinessEntry["connectorBoundaries"][number]["role"];
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

export type RevenueHundredStoreOperationsOptions = {
  maxStoresPerShard: number;
  minProductsPerStore: number;
  safeBatchSize: number;
  targetStores: number;
};

export type RevenueHundredStoreOperationsGate = {
  actionEndpoint: string;
  evidence: string[];
  externalExecution: false;
  providerContacted: false;
  status: RevenueHundredStoreOperationsGateStatus;
  title: string;
};

export type RevenueHundredStoreControlGridStore = {
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
};

export type RevenueHundredStoreControlGridShard = {
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
};

export type RevenueHundredStoreControlGrid = {
  auditEvents: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "100 Store Operating Control Grid";
  providerContacted: false;
  safeToRunParallelInternalJobs: boolean;
  shards: RevenueHundredStoreControlGridShard[];
  stores: RevenueHundredStoreControlGridStore[];
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

export type RevenueHundredStoreApplicationConnectionPacket = {
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
};

export type RevenueHundredStoreApplicationConnectionWorkbench = {
  auditEvents: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "100 Store Application Connection Workbench";
  packets: RevenueHundredStoreApplicationConnectionPacket[];
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
  rowId: string;
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

export type RevenueHundredStoreWorkerLane =
  | "store_builder"
  | "product_builder"
  | "connector_planner"
  | "launch_reviewer"
  | "monitoring_analyst"
  | "growth_allocator"
  | "rotation_reviewer";

export type RevenueHundredStoreWorkerAssignmentStatus =
  | "ready_to_assign"
  | "approval_hold"
  | "waiting_dependency"
  | "blocked";

export type RevenueHundredStoreWorkerAssignment = {
  approvalGate: string;
  assignmentId: string;
  blockedExternalActions: string[];
  claimOrder: number;
  dedupeKey: string;
  dependencyRefs: string[];
  expectedInternalEffect: string;
  externalExecution: false;
  idempotencyKey: string;
  jobType: RevenueHundredStoreAutonomyJobType;
  lane: RevenueHundredStoreWorkerLane;
  leaseExpiresAt: string;
  leaseId: string;
  priority: number;
  providerContacted: false;
  shardId: string;
  status: RevenueHundredStoreWorkerAssignmentStatus;
  storeId: string | null;
  storeName: string;
  summary: string;
  workerId: string;
  workerName: string;
};

export type RevenueHundredStoreWorkerScaleCoverage = {
  approvalHoldAssignments: number;
  readyAssignments: number;
  readyCoveragePercent: number;
  requiredReadyAssignments: number;
  safeCyclesRequired: number;
  status: "ready" | "watch" | "blocked";
  summary: string;
  targetStores: 10 | 25 | 100;
};

export type RevenueHundredStoreWorkerLanePlan = {
  assignments: RevenueHundredStoreWorkerAssignment[];
  blockedExternalActions: string[];
  externalExecution: false;
  lane: RevenueHundredStoreWorkerLane;
  laneCapacity: number;
  nextInternalAction: string;
  providerContacted: false;
  status: "ready" | "approval_hold" | "waiting" | "blocked";
  summary: string;
  totals: {
    approvalHold: number;
    assigned: number;
    blocked: number;
    readyToAssign: number;
    waitingDependency: number;
  };
  workerId: string;
  workerName: string;
};

export type RevenueHundredStoreWorkerAssignmentPlan = {
  assignments: RevenueHundredStoreWorkerAssignment[];
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  lanes: RevenueHundredStoreWorkerLanePlan[];
  mode: "100 Store Chain Of Command Assignment Plan";
  providerContacted: false;
  scaleCoverage: RevenueHundredStoreWorkerScaleCoverage[];
  summary: string;
  totals: {
    approvalHold: number;
    assigned: number;
    blocked: number;
    duplicateDedupeKeys: number;
    laneCount: number;
    maxSelectableAssignments: number;
    readyToAssign: number;
    scaleCoverageReadyTargets: number;
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
  | "worker_assignment_claims"
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
  | "record_worker_assignments"
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

export type RevenueHundredStoreOperationsNextAction = {
  confirmation: string;
  endpoint: string;
  expectedInternalEffect: string;
  externalExecution: false;
  priority: number;
  providerContacted: false;
  reason: string;
  status: RevenueMoneyArmyBatchPipelineStageStatus;
  title: string;
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
      role: RevenueLiveConnectorReadinessEntry["connectorBoundaries"][number]["role"] | "analytics";
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
  gates: RevenueHundredStoreOperationsGate[];
  generatedAt: string;
  growthAllocationRouter: RevenueHundredStoreGrowthAllocationRouter;
  workerAssignmentPlan: RevenueHundredStoreWorkerAssignmentPlan;
  dailyOperatingLoop: RevenueHundredStoreDailyOperatingLoop;
  capacityProof: RevenueHundredStoreCapacityProof;
  launchPacketQueue: RevenueHundredStoreLaunchPacketQueue;
  mode: "100 Store Operations Readiness";
  monitoringMatrix: RevenueHundredStoreMonitoringMatrix;
  nextActions: RevenueHundredStoreOperationsNextAction[];
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

export type RevenueHundredStoreOperationsCommandAction =
  | "run_money_army_batch_creation"
  | "run_money_army_batch_acceleration"
  | "run_money_army_launch_package"
  | "run_money_army_approval"
  | "run_money_army_deployment"
  | "record_product_depth_drafts"
  | "record_launch_packets"
  | "record_autonomy_run_queue"
  | "record_connector_activation_matrix"
  | "record_work_leases"
  | "record_worker_assignments"
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

export const defaultRevenueBusinessFleetOptions: RevenueBusinessFleetOptions = {
  killPressureThreshold: 70,
  launchWaveSize: 10,
  maxParallelLaunches: 10,
  maxParallelScaleActions: 25,
  qualityFloor: 70,
  shardCount: 32,
  targetBusinesses: 1_000
};

export const defaultRevenueHundredStoreOperationsOptions: RevenueHundredStoreOperationsOptions = {
  maxStoresPerShard: 8,
  minProductsPerStore: 5,
  safeBatchSize: 25,
  targetStores: 100
};

const blockedFleetActions = [
  "Publishing, provider creation, marketplace uploads, content posting, ad spend, payouts, bank movement, or external write actions without a separate approval gate",
  "Launching browser automation, stealth, proxy rotation, fingerprint spoofing, CAPTCHA bypass, account warmup, or platform-evasion workflows",
  "Scaling a business lane whose quality gate is blocked, throttled, or below the configured quality floor"
];

const lanePriority: Record<RevenueBusinessFleetLane, number> = {
  launch_now: 1,
  scale: 2,
  quality_repair: 3,
  throttle: 4,
  watch: 5,
  kill: 6
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;

  return clamp(Math.round((numerator / denominator) * 100), 0, 100);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function average(values: number[]) {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function withFleetOptions(input: Partial<RevenueBusinessFleetOptions> = {}): RevenueBusinessFleetOptions {
  return {
    killPressureThreshold: clamp(Math.round(input.killPressureThreshold ?? defaultRevenueBusinessFleetOptions.killPressureThreshold), 0, 100),
    launchWaveSize: clamp(Math.round(input.launchWaveSize ?? defaultRevenueBusinessFleetOptions.launchWaveSize), 1, 100),
    maxParallelLaunches: clamp(Math.round(input.maxParallelLaunches ?? defaultRevenueBusinessFleetOptions.maxParallelLaunches), 1, 1_000),
    maxParallelScaleActions: clamp(Math.round(input.maxParallelScaleActions ?? defaultRevenueBusinessFleetOptions.maxParallelScaleActions), 1, 2_000),
    qualityFloor: clamp(Math.round(input.qualityFloor ?? defaultRevenueBusinessFleetOptions.qualityFloor), 0, 100),
    shardCount: clamp(Math.round(input.shardCount ?? defaultRevenueBusinessFleetOptions.shardCount), 1, 256),
    targetBusinesses: clamp(Math.round(input.targetBusinesses ?? defaultRevenueBusinessFleetOptions.targetBusinesses), 1, 100_000)
  };
}

function assetKey(asset: Pick<RevenueAssetScore, "assetId" | "assetType">) {
  return `${asset.assetType}:${asset.assetId}`;
}

function shardFor(storeId: string, shardCount: number) {
  const digest = createHash("sha256").update(storeId).digest("hex").slice(0, 8);
  const index = parseInt(digest, 16) % shardCount;

  return `shard_${String(index + 1).padStart(3, "0")}`;
}

function emptyRecommendationCounts(): Record<RevenueAssetRotationDecision, number> {
  return {
    kill: 0,
    pause: 0,
    scale: 0,
    watch: 0
  };
}

function recommendationCounts(assets: RevenueAssetScore[]) {
  return assets.reduce<Record<RevenueAssetRotationDecision, number>>((counts, asset) => {
    counts[asset.recommendation] += 1;
    return counts;
  }, emptyRecommendationCounts());
}

function topAssetFor(assets: RevenueAssetScore[]) {
  const asset = [...assets].sort((left, right) => (
    laneRecommendationPriority(right.recommendation) - laneRecommendationPriority(left.recommendation)
    || right.assetScore.finalRank - left.assetScore.finalRank
    || right.confidence - left.confidence
  ))[0];

  if (!asset) return null;

  return {
    assetId: asset.assetId,
    assetName: asset.assetName,
    assetType: asset.assetType,
    finalRank: asset.assetScore.finalRank,
    recommendation: asset.recommendation
  };
}

function laneRecommendationPriority(recommendation: RevenueAssetRotationDecision) {
  if (recommendation === "scale") return 4;
  if (recommendation === "watch") return 3;
  if (recommendation === "pause") return 2;
  return 1;
}

function pressureAssetKeys(
  financialPlan: FinancialOrchestratorPlan | undefined,
  direction: "scalePressure" | "killPressure"
) {
  return new Set((financialPlan?.portfolioSignal[direction].assets ?? []).map(assetKey));
}

function qualityScoreFor(assets: RevenueAssetScore[]) {
  const averageRank = average(assets.map((asset) => asset.assetScore.finalRank));
  const highRiskAssets = assets.filter((asset) => asset.riskLevel === "high").length;
  const mediumRiskAssets = assets.filter((asset) => asset.riskLevel === "medium").length;
  const trackedBonus = Math.min(10, assets.filter((asset) => asset.performance && asset.performance.snapshots > 0).length * 3);
  const productCoverage = Math.min(12, assets.filter((asset) => asset.assetType === "product").length * 4);
  const riskPenalty = highRiskAssets * 18 + mediumRiskAssets * 7;

  return clamp(Math.round(averageRank * 0.76 + trackedBonus + productCoverage - riskPenalty), 0, 100);
}

function readinessScoreFor(assets: RevenueAssetScore[]) {
  return clamp(Math.round(average(assets.map((asset) => asset.assetScore.readinessScore)) / 35 * 100), 0, 100);
}

function economicsScoreFor(assets: RevenueAssetScore[]) {
  return clamp(Math.round(average(assets.map((asset) => asset.assetScore.economicsScore)) / 45 * 100), 0, 100);
}

function scalePressureFor(assets: RevenueAssetScore[], financialScaleAssetKeys: Set<string>) {
  const scaleAssets = assets.filter((asset) => asset.recommendation === "scale");
  if (scaleAssets.length === 0) return 0;

  const positiveProfitVelocity = scaleAssets.reduce((sum, asset) => sum + Math.max(0, asset.performance?.profitVelocity ?? 0), 0);
  const financeMatches = scaleAssets.filter((asset) => financialScaleAssetKeys.has(assetKey(asset))).length;

  return clamp(Math.round(
    average(scaleAssets.map((asset) => asset.assetScore.finalRank)) * 0.55
    + Math.min(30, positiveProfitVelocity)
    + Math.min(24, scaleAssets.length * 8)
    + Math.min(12, financeMatches * 6)
  ), 0, 100);
}

function killPressureFor(assets: RevenueAssetScore[], financialKillAssetKeys: Set<string>, portfolioProfitVelocity: number) {
  const killAssets = assets.filter((asset) => asset.recommendation === "kill");
  const pauseAssets = assets.filter((asset) => asset.recommendation === "pause");
  const weakAssets = [...killAssets, ...pauseAssets];
  const negativeVelocity = Math.abs(assets.reduce((sum, asset) => sum + Math.min(0, asset.performance?.profitVelocity ?? 0), 0));
  const financeMatches = weakAssets.filter((asset) => financialKillAssetKeys.has(assetKey(asset))).length;
  const highRiskAssets = assets.filter((asset) => asset.riskLevel === "high").length;
  const globalVelocityPenalty = portfolioProfitVelocity < 0 ? Math.min(10, Math.abs(portfolioProfitVelocity)) : 0;

  if (weakAssets.length === 0 && negativeVelocity === 0 && highRiskAssets === 0 && globalVelocityPenalty === 0) {
    return 0;
  }

  const weakness = weakAssets.length > 0
    ? average(weakAssets.map((asset) => 100 - asset.assetScore.finalRank))
    : 25;

  return clamp(Math.round(
    weakness * 0.42
    + killAssets.length * 22
    + pauseAssets.length * 10
    + highRiskAssets * 12
    + Math.min(18, negativeVelocity)
    + Math.min(12, financeMatches * 6)
    + globalVelocityPenalty
  ), 0, 100);
}

function qualityGateFor(input: {
  assets: RevenueAssetScore[];
  killPressure: number;
  options: RevenueBusinessFleetOptions;
  qualityScore: number;
}): RevenueBusinessFleetQualityGate {
  const reasons: string[] = [];
  const highRiskAssets = input.assets.filter((asset) => asset.riskLevel === "high").length;
  const killAssets = input.assets.filter((asset) => asset.recommendation === "kill").length;
  const pauseAssets = input.assets.filter((asset) => asset.recommendation === "pause").length;

  if (input.qualityScore >= input.options.qualityFloor) {
    reasons.push(`Quality ${input.qualityScore}/100 meets the ${input.options.qualityFloor}/100 floor.`);
  } else {
    reasons.push(`Quality ${input.qualityScore}/100 is below the ${input.options.qualityFloor}/100 floor.`);
  }

  if (killAssets > 0) {
    reasons.push(`${killAssets} asset${killAssets === 1 ? "" : "s"} currently recommend kill.`);
  }

  if (pauseAssets > 0) {
    reasons.push(`${pauseAssets} asset${pauseAssets === 1 ? "" : "s"} currently recommend pause.`);
  }

  if (highRiskAssets > 0) {
    reasons.push(`${highRiskAssets} high-risk asset${highRiskAssets === 1 ? "" : "s"} must be cleared before scale.`);
  }

  if (input.killPressure >= input.options.killPressureThreshold) {
    reasons.push(`Kill pressure ${input.killPressure}/100 meets or exceeds the ${input.options.killPressureThreshold}/100 threshold.`);
  }

  if (
    killAssets > 0
    || input.killPressure >= input.options.killPressureThreshold
    || input.qualityScore < input.options.qualityFloor - 20
  ) {
    return {
      reasons,
      status: "block"
    };
  }

  if (pauseAssets > 0 || highRiskAssets > 0 || input.qualityScore < input.options.qualityFloor) {
    return {
      reasons,
      status: "watch"
    };
  }

  return {
    reasons,
    status: "pass"
  };
}

function laneFor(input: {
  candidate: RevenueFirstBusinessLaunchCandidate | undefined;
  counts: Record<RevenueAssetRotationDecision, number>;
  killPressure: number;
  options: RevenueBusinessFleetOptions;
  qualityGate: RevenueBusinessFleetQualityGate;
  qualityScore: number;
  scalePressure: number;
}): RevenueBusinessFleetLane {
  if (input.qualityGate.status === "block" && (input.counts.kill > 0 || input.killPressure >= input.options.killPressureThreshold)) {
    return "kill";
  }

  if (input.candidate?.status === "ready_internal" && input.qualityGate.status !== "block" && input.qualityScore >= input.options.qualityFloor) {
    return "launch_now";
  }

  if (input.scalePressure >= 60 && input.qualityGate.status !== "block" && input.qualityScore >= input.options.qualityFloor) {
    return "scale";
  }

  if (input.qualityGate.status === "block" || input.candidate?.status === "blocked" || input.candidate?.status === "manual_gate" || input.qualityScore < input.options.qualityFloor) {
    return "quality_repair";
  }

  if (input.counts.pause > 0 || input.killPressure >= 40) {
    return "throttle";
  }

  return "watch";
}

function nextActionFor(input: {
  businessName: string;
  candidate: RevenueFirstBusinessLaunchCandidate | undefined;
  lane: RevenueBusinessFleetLane;
  qualityGate: RevenueBusinessFleetQualityGate;
  topAsset: RevenueBusinessFleetBusiness["topAsset"];
}): RevenueBusinessFleetNextAction {
  if (input.lane === "launch_now" && input.candidate) {
    return {
      endpoint: input.candidate.recommendedEndpoint,
      label: input.candidate.nextInternalAction,
      reason: input.candidate.reason,
      state: input.candidate.nextInternalState
    };
  }

  if (input.lane === "scale") {
    return {
      endpoint: "/merch/financial-orchestrator/plan",
      label: "review_scaling_budget_pressure",
      reason: `${input.businessName} has enough asset pressure for internal scaling budget review.`,
      state: "scaling_budget_review"
    };
  }

  if (input.lane === "quality_repair") {
    return {
      endpoint: "/merch/revenue-engine/portfolio",
      label: "repair_quality_gate",
      reason: input.qualityGate.reasons.join(" "),
      state: "quality_gate_repair"
    };
  }

  if (input.lane === "throttle") {
    return {
      endpoint: "/merch/revenue-engine/review-queue",
      label: "throttle_and_review_assets",
      reason: input.qualityGate.reasons.join(" "),
      state: "throttled_asset_review"
    };
  }

  if (input.lane === "kill") {
    return {
      endpoint: "/merch/revenue-engine/portfolio/actions",
      label: "prepare_internal_kill_or_archive_review",
      reason: input.qualityGate.reasons.join(" "),
      state: "kill_review_required"
    };
  }

  return {
    endpoint: "/merch/revenue-engine/performance",
    label: "collect_more_performance_signal",
    reason: input.topAsset
      ? `${input.topAsset.assetName} is the strongest current signal, but this business is not ready for launch or scale pressure.`
      : `${input.businessName} needs stronger asset evidence before it enters launch or scale lanes.`,
    state: "watch_for_signal"
  };
}

function businessFromAssets(input: {
  assets: RevenueAssetScore[];
  candidate: RevenueFirstBusinessLaunchCandidate | undefined;
  financialKillAssetKeys: Set<string>;
  financialScaleAssetKeys: Set<string>;
  options: RevenueBusinessFleetOptions;
  portfolio: RevenueAssetPortfolio;
}): RevenueBusinessFleetBusiness {
  const storeAsset = input.assets.find((asset) => asset.assetType === "store");
  const firstAsset = input.assets[0];
  const businessId = storeAsset?.assetId ?? firstAsset.storeId;
  const businessName = storeAsset?.assetName ?? firstAsset.storeName;
  const counts = recommendationCounts(input.assets);
  const qualityScore = qualityScoreFor(input.assets);
  const readinessScore = readinessScoreFor(input.assets);
  const economicsScore = economicsScoreFor(input.assets);
  const scalePressure = scalePressureFor(input.assets, input.financialScaleAssetKeys);
  const killPressure = killPressureFor(input.assets, input.financialKillAssetKeys, input.portfolio.totals.profitVelocity);
  const qualityGate = qualityGateFor({
    assets: input.assets,
    killPressure,
    options: input.options,
    qualityScore
  });
  const lane = laneFor({
    candidate: input.candidate,
    counts,
    killPressure,
    options: input.options,
    qualityGate,
    qualityScore,
    scalePressure
  });
  const topAsset = topAssetFor(input.assets);
  const candidateBoost = input.candidate?.status === "ready_internal" ? 10 : input.candidate?.status === "manual_gate" ? 4 : 0;
  const finalRank = clamp(Math.round(
    qualityScore * 0.38
    + readinessScore * 0.18
    + economicsScore * 0.18
    + scalePressure * 0.16
    + (input.candidate?.finalRank ?? 0) * 0.1
    + candidateBoost
    - killPressure * 0.15
  ), 0, 100);
  const profitVelocity = money(input.assets.reduce((sum, asset) => sum + (asset.performance?.profitVelocity ?? 0), 0));
  const revenueVelocity = money(input.assets.reduce((sum, asset) => sum + (asset.performance?.revenueVelocity ?? 0), 0));

  return {
    assetCount: input.assets.length,
    blockedExternalActions: blockedFleetActions,
    businessId,
    businessName,
    externalExecution: false,
    lane,
    nextInternalAction: nextActionFor({
      businessName,
      candidate: input.candidate,
      lane,
      qualityGate,
      topAsset
    }),
    parallelism: {
      launchSlots: 0,
      maxInternalJobs: 0,
      scaleSlots: 0
    },
    productAssets: input.assets.filter((asset) => asset.assetType === "product").length,
    profitVelocity,
    providerContacted: false,
    qualityGate,
    recommendationCounts: counts,
    revenueVelocity,
    scheduleState: "queued",
    score: {
      economicsScore,
      finalRank,
      killPressure,
      qualityScore,
      readinessScore,
      scalePressure
    },
    shardId: shardFor(businessId, input.options.shardCount),
    topAsset,
    trackedAssets: input.assets.filter((asset) => asset.performance && asset.performance.snapshots > 0).length
  };
}

function withScheduleStates(businesses: RevenueBusinessFleetBusiness[], options: RevenueBusinessFleetOptions) {
  let launchSlots = 0;
  let scaleSlots = 0;
  const launchSlotLimit = Math.min(options.launchWaveSize, options.maxParallelLaunches);

  return businesses.map((business) => {
    if (business.lane === "kill") {
      return {
        ...business,
        parallelism: {
          launchSlots: 0,
          maxInternalJobs: 0,
          scaleSlots: 0
        },
        scheduleState: "blocked" as const
      };
    }

    if (business.lane === "quality_repair" || business.lane === "throttle") {
      return {
        ...business,
        parallelism: {
          launchSlots: 0,
          maxInternalJobs: 1,
          scaleSlots: 0
        },
        scheduleState: "throttled" as const
      };
    }

    if (business.lane === "launch_now") {
      launchSlots += 1;
      const ready = launchSlots <= launchSlotLimit;

      return {
        ...business,
        parallelism: {
          launchSlots: ready ? 1 : 0,
          maxInternalJobs: ready ? 3 : 1,
          scaleSlots: 0
        },
        scheduleState: ready ? "ready_parallel" as const : "queued" as const
      };
    }

    if (business.lane === "scale") {
      scaleSlots += 1;
      const ready = scaleSlots <= options.maxParallelScaleActions;

      return {
        ...business,
        parallelism: {
          launchSlots: 0,
          maxInternalJobs: ready ? 2 : 1,
          scaleSlots: ready ? 1 : 0
        },
        scheduleState: ready ? "ready_parallel" as const : "queued" as const
      };
    }

    return {
      ...business,
      parallelism: {
        launchSlots: 0,
        maxInternalJobs: 1,
        scaleSlots: 0
      },
      scheduleState: "queued" as const
    };
  });
}

function shardSummary(shardId: string, businesses: RevenueBusinessFleetBusiness[]): RevenueBusinessFleetShard {
  const laneCounts = businesses.reduce<Record<RevenueBusinessFleetLane, number>>((counts, business) => {
    counts[business.lane] += 1;
    return counts;
  }, {
    kill: 0,
    launch_now: 0,
    quality_repair: 0,
    scale: 0,
    throttle: 0,
    watch: 0
  });

  return {
    blocked: businesses.filter((business) => business.scheduleState === "blocked").length,
    businesses: businesses.length,
    capacity: businesses.reduce((sum, business) => sum + business.parallelism.maxInternalJobs, 0),
    id: shardId,
    laneCounts,
    queued: businesses.filter((business) => business.scheduleState === "queued").length,
    readyParallel: businesses.filter((business) => business.scheduleState === "ready_parallel").length,
    throttled: businesses.filter((business) => business.scheduleState === "throttled").length
  };
}

function groupAssetsByStore(portfolio: RevenueAssetPortfolio) {
  const groups = new Map<string, RevenueAssetScore[]>();

  for (const asset of portfolio.assets) {
    const key = asset.storeId || asset.assetId;
    const existing = groups.get(key) ?? [];
    existing.push(asset);
    groups.set(key, existing);
  }

  return groups;
}

function candidatesByStore(firstBusinessLaunchPlan: RevenueFirstBusinessLaunchPlan | undefined) {
  const candidates = new Map<string, RevenueFirstBusinessLaunchCandidate>();

  for (const candidate of firstBusinessLaunchPlan?.candidates ?? []) {
    if (!candidate.storeId) continue;

    const existing = candidates.get(candidate.storeId);
    if (!existing || candidate.finalRank > existing.finalRank) {
      candidates.set(candidate.storeId, candidate);
    }
  }

  return candidates;
}

export function buildRevenueBusinessFleetSchedulerPlan(input: {
  assetPortfolio: RevenueAssetPortfolio;
  financialPlan?: FinancialOrchestratorPlan;
  firstBusinessLaunchPlan?: RevenueFirstBusinessLaunchPlan;
  generatedAt?: string;
  options?: Partial<RevenueBusinessFleetOptions>;
}): RevenueBusinessFleetPlan {
  const options = withFleetOptions(input.options);
  const financialScaleAssetKeys = pressureAssetKeys(input.financialPlan, "scalePressure");
  const financialKillAssetKeys = pressureAssetKeys(input.financialPlan, "killPressure");
  const launchCandidates = candidatesByStore(input.firstBusinessLaunchPlan);
  const groupedAssets = groupAssetsByStore(input.assetPortfolio);
  const businesses = Array.from(groupedAssets.entries())
    .map(([storeId, assets]) => businessFromAssets({
      assets,
      candidate: launchCandidates.get(storeId),
      financialKillAssetKeys,
      financialScaleAssetKeys,
      options,
      portfolio: input.assetPortfolio
    }))
    .sort((left, right) => (
      lanePriority[left.lane] - lanePriority[right.lane]
      || right.score.finalRank - left.score.finalRank
      || right.score.scalePressure - left.score.scalePressure
      || left.businessName.localeCompare(right.businessName)
    ));
  const scheduledBusinesses = withScheduleStates(businesses, options);
  const shardIds = Array.from(new Set(scheduledBusinesses.map((business) => business.shardId))).sort();
  const shards = shardIds.map((shardId) => shardSummary(
    shardId,
    scheduledBusinesses.filter((business) => business.shardId === shardId)
  ));
  const countLane = (lane: RevenueBusinessFleetLane) => scheduledBusinesses.filter((business) => business.lane === lane).length;
  const countQuality = (status: RevenueBusinessFleetQualityStatus) => scheduledBusinesses.filter((business) => business.qualityGate.status === status).length;
  const countSchedule = (state: RevenueBusinessFleetScheduleState) => scheduledBusinesses.filter((business) => business.scheduleState === state).length;
  const launchWave = scheduledBusinesses
    .filter((business) => business.lane === "launch_now")
    .slice(0, options.launchWaveSize);
  const targetGap = Math.max(0, options.targetBusinesses - scheduledBusinesses.length);

  return {
    auditEvents: [
      "Business Fleet Scheduler grouped Revenue Engine scored assets by store/business.",
      "Financial Orchestrator scale and kill pressure was attached as advisory context only.",
      "First Business Launch candidates were used to identify the first launch wave.",
      "All fleet scheduling is internal; no provider, marketplace, payment, browser, social, ad, bank, or external write action was executed."
    ],
    blockedExternalActions: unique([
      ...input.assetPortfolio.blockedExternalActions,
      ...(input.financialPlan?.blockedExternalActions ?? []),
      ...(input.firstBusinessLaunchPlan?.blockedExternalActions ?? []),
      ...blockedFleetActions
    ]),
    businesses: scheduledBusinesses,
    capacity: {
      currentBusinesses: scheduledBusinesses.length,
      launchWaveSize: options.launchWaveSize,
      maxParallelLaunches: options.maxParallelLaunches,
      maxParallelScaleActions: options.maxParallelScaleActions,
      parallelSlotsConfigured: options.maxParallelLaunches + options.maxParallelScaleActions,
      shardCount: options.shardCount,
      targetBusinesses: options.targetBusinesses,
      targetGap
    },
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    launchWave,
    mode: "Revenue Business Fleet Scheduler",
    options,
    providerContacted: false,
    shards,
    sourceSignals: {
      assetPortfolioGeneratedAt: input.assetPortfolio.generatedAt,
      financialKillPressure: input.financialPlan?.portfolioSignal.killPressure.pressureScore ?? 0,
      financialScalePressure: input.financialPlan?.portfolioSignal.scalePressure.pressureScore ?? 0,
      firstBusinessLaunchReady: input.firstBusinessLaunchPlan?.totals.readyInternal ?? 0
    },
    summary: `${scheduledBusinesses.length} business${scheduledBusinesses.length === 1 ? "" : "es"} scored across ${options.shardCount} shard${options.shardCount === 1 ? "" : "s"}. ${countSchedule("ready_parallel")} ready for parallel internal work, including ${launchWave.filter((business) => business.scheduleState === "ready_parallel").length}/${options.launchWaveSize} first-wave launch slot${options.launchWaveSize === 1 ? "" : "s"}. ${countLane("scale")} scale, ${countLane("quality_repair")} repair, ${countLane("throttle")} throttle, and ${countLane("kill")} kill lane${scheduledBusinesses.length === 1 ? "" : "s"}. Target capacity is ${options.targetBusinesses} businesses; current gap is ${targetGap}.`,
    totals: {
      blocked: countSchedule("blocked"),
      businesses: scheduledBusinesses.length,
      kill: countLane("kill"),
      launchNow: countLane("launch_now"),
      qualityBlock: countQuality("block"),
      qualityPass: countQuality("pass"),
      qualityRepair: countLane("quality_repair"),
      qualityWatch: countQuality("watch"),
      queued: countSchedule("queued"),
      readyParallel: countSchedule("ready_parallel"),
      scale: countLane("scale"),
      throttled: countSchedule("throttled"),
      watch: countLane("watch")
    }
  };
}

export function selectRevenueBusinessFleetLaunchWave(input: {
  firstBusinessLaunchPlan: RevenueFirstBusinessLaunchPlan;
  generatedAt?: string;
  plan: RevenueBusinessFleetPlan;
  selectedBusinessIds?: string[];
}): RevenueBusinessFleetLaunchWavePlan {
  const requested = new Set((input.selectedBusinessIds ?? []).map((id) => id.trim()).filter(Boolean));
  const candidateByStore = candidatesByStore(input.firstBusinessLaunchPlan);
  const eligibleBusinesses = input.plan.launchWave.filter((business) => (
    business.lane === "launch_now"
    && business.scheduleState === "ready_parallel"
    && business.qualityGate.status === "pass"
  ));
  const selectedBusinesses: RevenueBusinessFleetLaunchWaveSelection[] = [];
  const skipped: RevenueBusinessFleetLaunchWaveSkipped[] = [];

  for (const business of input.plan.launchWave) {
    if (requested.size > 0 && !requested.has(business.businessId)) {
      skipped.push({
        businessId: business.businessId,
        businessName: business.businessName,
        reason: "Business was not selected for this launch-wave dispatch."
      });
      continue;
    }

    if (!eligibleBusinesses.some((eligible) => eligible.businessId === business.businessId)) {
      skipped.push({
        businessId: business.businessId,
        businessName: business.businessName,
        reason: `Business is ${business.scheduleState.replace(/_/g, " ")} with ${business.qualityGate.status} quality and cannot enter the launch wave.`
      });
      continue;
    }

    const candidate = candidateByStore.get(business.businessId);

    if (!candidate?.sprintActionId || candidate.status !== "ready_internal") {
      skipped.push({
        businessId: business.businessId,
        businessName: business.businessName,
        reason: "No ready first-business sprint action is available for this business."
      });
      continue;
    }

    selectedBusinesses.push({
      businessId: business.businessId,
      businessName: business.businessName,
      finalRank: business.score.finalRank,
      nextInternalAction: candidate.nextInternalAction,
      qualityStatus: business.qualityGate.status,
      scheduleState: business.scheduleState,
      shardId: business.shardId,
      sprintActionId: candidate.sprintActionId
    });
  }

  const sprintActionIds = selectedBusinesses.map((business) => business.sprintActionId);

  return {
    auditEvents: [
      "Business Fleet Launch Wave selected only launch-now businesses with ready-parallel scheduling and pass quality gates.",
      "Selected wave actions route through First Business Launch and First Cash Sprint internal bridge controls.",
      "No provider, marketplace, payment, social, ad, browser, bank, payout, upload, or external write action was executed."
    ],
    blockedExternalActions: input.plan.blockedExternalActions,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Revenue Business Fleet Launch Wave",
    providerContacted: false,
    selectedBusinesses,
    skipped,
    sprintActionIds,
    summary: selectedBusinesses.length > 0
      ? `${selectedBusinesses.length} business${selectedBusinesses.length === 1 ? "" : "es"} selected for the internal launch wave from ${eligibleBusinesses.length} eligible ready-parallel lane${eligibleBusinesses.length === 1 ? "" : "s"}.`
      : `No business is eligible for the internal launch wave. ${skipped.length} business${skipped.length === 1 ? "" : "es"} skipped.`,
    totals: {
      eligible: eligibleBusinesses.length,
      readyParallel: input.plan.launchWave.filter((business) => business.scheduleState === "ready_parallel").length,
      requested: requested.size,
      selected: selectedBusinesses.length,
      skipped: skipped.length
    }
  };
}

function launchGapActionForBusiness(business: RevenueBusinessFleetBusiness, priority: number): RevenueBusinessFleetLaunchGapAction {
  if (business.lane === "quality_repair" || business.qualityGate.status !== "pass") {
    return {
      action: "repair_quality_gate",
      businessId: business.businessId,
      businessName: business.businessName,
      endpoint: "/merch/revenue-engine/review-queue",
      expectedInternalEffect: "Clear quality, pause, kill, or risk blockers before this business can enter the launch wave.",
      externalExecution: false,
      priority,
      reason: business.qualityGate.reasons.join(" "),
      sourceModule: "revenue_business_fleet_scheduler + revenue_asset_review_queue",
      status: business.scheduleState === "blocked" ? "blocked" : "ready"
    };
  }

  if (business.recommendationCounts.pause > 0 || business.lane === "throttle") {
    return {
      action: "repair_quality_gate",
      businessId: business.businessId,
      businessName: business.businessName,
      endpoint: "/merch/revenue-engine/portfolio/actions",
      expectedInternalEffect: "Apply internal pause/repair decisions so the business stops draining launch-wave quality.",
      externalExecution: false,
      priority,
      reason: `${business.businessName} has ${business.recommendationCounts.pause} pause recommendation${business.recommendationCounts.pause === 1 ? "" : "s"} and ${business.score.killPressure}/100 kill pressure.`,
      sourceModule: "revenue_business_fleet_scheduler + revenue_asset_portfolio",
      status: "ready"
    };
  }

  if (business.productAssets < 5 || business.score.readinessScore < 70) {
    return {
      action: "seed_product_drafts",
      businessId: business.businessId,
      businessName: business.businessName,
      endpoint: "/merch/revenue-engine/launch-pipeline",
      expectedInternalEffect: "Create or queue internal product drafts until the business reaches launch portfolio depth.",
      externalExecution: false,
      priority,
      reason: `${business.businessName} has ${business.productAssets} product asset${business.productAssets === 1 ? "" : "s"} and ${business.score.readinessScore}/100 readiness.`,
      sourceModule: "revenue_business_fleet_scheduler + revenue_launch_pipeline",
      status: "ready"
    };
  }

  if (business.score.scalePressure >= 60) {
    return {
      action: "prepare_store_setup",
      businessId: business.businessId,
      businessName: business.businessName,
      endpoint: "/merch/revenue-engine/store-setup",
      expectedInternalEffect: "Prepare store setup records and connector readiness before first-business dispatch.",
      externalExecution: false,
      priority,
      reason: `${business.businessName} has ${business.score.scalePressure}/100 scale pressure but is not yet in launch-now lane.`,
      sourceModule: "revenue_business_fleet_scheduler + revenue_store_setup",
      status: "ready"
    };
  }

  return {
    action: "collect_signal",
    businessId: business.businessId,
    businessName: business.businessName,
    endpoint: "/merch/revenue-engine/performance",
    expectedInternalEffect: "Collect performance or readiness evidence before this business competes for the launch wave.",
    externalExecution: false,
    priority,
    reason: business.nextInternalAction.reason,
    sourceModule: "revenue_business_fleet_scheduler + revenue_performance",
    status: "queued_after_apply"
  };
}

function opportunitySeed(index: number): RevenueBusinessFleetOpportunitySeed {
  const lane = index + 1;

  return {
    businessName: `ENTRAL Private Revenue Lane ${lane}`,
    idea: `Private operator POD and digital product lane ${lane} for fast income testing, built around original serious utility designs and launch-ready product drafts.`,
    priceRange: {
      max: 64,
      min: 18
    },
    productCount: 5,
    productTypes: ["T-shirt", "Sticker", "Notebook", "Poster"],
    riskTolerance: "Low",
    sourceKey: `entral-private-revenue-lane-${lane}`,
    storePlatform: "Etsy"
  };
}

export function buildRevenueBusinessFleetLaunchGapPlan(input: {
  generatedAt?: string;
  plan: RevenueBusinessFleetPlan;
}): RevenueBusinessFleetLaunchGapPlan {
  const readyLaunchWave = input.plan.launchWave.filter((business) => (
    business.lane === "launch_now"
    && business.scheduleState === "ready_parallel"
    && business.qualityGate.status === "pass"
  ));
  const launchWaveGap = Math.max(0, input.plan.capacity.launchWaveSize - readyLaunchWave.length);
  const actions: RevenueBusinessFleetLaunchGapAction[] = [];

  if (readyLaunchWave.length > 0) {
    actions.push({
      action: "run_launch_wave",
      businessId: null,
      businessName: `${readyLaunchWave.length} ready launch-wave business${readyLaunchWave.length === 1 ? "" : "es"}`,
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-wave/apply",
      expectedInternalEffect: "Dispatch the currently ready first-wave businesses through internal First Business Launch controls.",
      externalExecution: false,
      priority: 1,
      reason: `${readyLaunchWave.length}/${input.plan.capacity.launchWaveSize} launch-wave lane${input.plan.capacity.launchWaveSize === 1 ? "" : "s"} are ready now.`,
      sourceModule: "revenue_business_fleet_scheduler + revenue_first_business_launch",
      status: "ready"
    });
  }

  const repairCandidates = input.plan.businesses
    .filter((business) => !readyLaunchWave.some((ready) => ready.businessId === business.businessId))
    .filter((business) => business.lane !== "kill")
    .sort((left, right) => (
      Number(right.lane === "quality_repair") - Number(left.lane === "quality_repair")
      || Number(right.lane === "throttle") - Number(left.lane === "throttle")
      || right.score.finalRank - left.score.finalRank
      || right.score.readinessScore - left.score.readinessScore
    ))
    .slice(0, launchWaveGap);

  repairCandidates.forEach((business, index) => {
    actions.push(launchGapActionForBusiness(business, 10 + index));
  });

  const opportunitySeedCount = Math.max(0, launchWaveGap - repairCandidates.length);
  const opportunitySeeds = Array.from({ length: opportunitySeedCount }, (_, index) => opportunitySeed(index));

  opportunitySeeds.forEach((seed, index) => {
    actions.push({
      action: "create_opportunity_shell",
      businessId: null,
      businessName: seed.businessName,
      endpoint: "/merch/revenue-engine/opportunity-factory",
      expectedInternalEffect: "Create a private store shell with internal product drafts so the business can enter launch pipeline scoring.",
      externalExecution: false,
      priority: 50 + index,
      reason: `Launch wave is short by ${launchWaveGap} lane${launchWaveGap === 1 ? "" : "s"}; this seed creates one new internal opportunity candidate.`,
      sourceModule: "revenue_business_fleet_scheduler + revenue_opportunity_factory",
      status: "ready"
    });
  });

  const repairActions = actions.filter((action) => action.action !== "run_launch_wave" && action.action !== "create_opportunity_shell").length;

  return {
    actions: actions.sort((left, right) => left.priority - right.priority),
    auditEvents: [
      "Business Fleet Launch Gap Planner compared the configured launch-wave target against ready-parallel businesses.",
      "Gap actions are internal Revenue Engine actions only and route through existing launch, opportunity, review, setup, and performance queues.",
      "No provider, marketplace, payment, ad, social, browser, bank, payout, upload, or external write action was executed."
    ],
    blockedExternalActions: input.plan.blockedExternalActions,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Revenue Business Fleet Launch Gap Planner",
    opportunitySeeds,
    providerContacted: false,
    summary: launchWaveGap === 0
      ? `The ${input.plan.capacity.launchWaveSize}-business launch wave is full: ${readyLaunchWave.length} ready businesses can run internally now.`
      : `${readyLaunchWave.length}/${input.plan.capacity.launchWaveSize} businesses are ready for the first wave. Gap ${launchWaveGap}: ${repairActions} repair action${repairActions === 1 ? "" : "s"} and ${opportunitySeeds.length} new opportunity seed${opportunitySeeds.length === 1 ? "" : "s"} queued internally.`,
    totals: {
      createOpportunityShells: opportunitySeeds.length,
      currentBusinesses: input.plan.capacity.currentBusinesses,
      launchWaveGap,
      readyLaunchWaveBusinesses: readyLaunchWave.length,
      repairActions,
      runLaunchWaveActions: readyLaunchWave.length > 0 ? 1 : 0,
      targetLaunchWave: input.plan.capacity.launchWaveSize
    }
  };
}

function pipelineStage(input: Omit<RevenueMoneyArmyBatchPipelineStage, "blockedExternalActions" | "externalExecution" | "providerContacted"> & {
  blockedExternalActions?: string[];
}): RevenueMoneyArmyBatchPipelineStage {
  return {
    ...input,
    blockedExternalActions: unique([
      ...(input.blockedExternalActions ?? []),
      ...blockedFleetActions
    ]),
    externalExecution: false,
    providerContacted: false
  };
}

function firstReadyStage(stages: RevenueMoneyArmyBatchPipelineStage[]) {
  return stages.find((stage) => stage.status === "ready") ?? null;
}

export function buildRevenueMoneyArmyBatchPipelinePlan(input: {
  approvableApprovalPackets?: number;
  approvedApprovalPackets?: number;
  generatedAt?: string;
  launchGate?: {
    approvalNeeded: number;
    blocked: number;
    readyForManualLaunch: number;
    repairRequired: number;
  } | null;
  plan: RevenueBusinessFleetPlan;
  selectedSourceKeys?: string[];
  pendingApprovalPackets?: number;
  gapPlan?: RevenueBusinessFleetLaunchGapPlan;
}): RevenueMoneyArmyBatchPipelinePlan {
  const gapPlan = input.gapPlan ?? buildRevenueBusinessFleetLaunchGapPlan({
    generatedAt: input.generatedAt,
    plan: input.plan
  });
  const selectedSourceKeys = unique(input.selectedSourceKeys ?? []);
  const readyDeploymentBusinesses = input.plan.launchWave.filter((business) => (
    business.lane === "launch_now"
    && business.scheduleState === "ready_parallel"
    && business.qualityGate.status === "pass"
  )).length;
  const approvablePackets = input.approvableApprovalPackets ?? 0;
  const approvedPackets = input.approvedApprovalPackets ?? 0;
  const pendingApprovalPackets = input.pendingApprovalPackets ?? 0;
  const launchGate = input.launchGate ?? null;
  const hasSelectedBatch = selectedSourceKeys.length > 0;
  const creationStatus: RevenueMoneyArmyBatchPipelineStageStatus = gapPlan.opportunitySeeds.length > 0
    ? "ready"
    : input.plan.capacity.currentBusinesses > 0 ? "complete" : "waiting";
  const accelerationStatus: RevenueMoneyArmyBatchPipelineStageStatus = hasSelectedBatch
    ? "ready"
    : creationStatus === "ready" ? "waiting" : "complete";
  const launchPackageStatus: RevenueMoneyArmyBatchPipelineStageStatus = hasSelectedBatch
    ? "ready"
    : "waiting";
  const approvalStatus: RevenueMoneyArmyBatchPipelineStageStatus = approvablePackets > 0
    ? "ready"
    : pendingApprovalPackets > 0 ? "waiting" : approvedPackets > 0 ? "complete" : "waiting";
  const deploymentBlocked = (launchGate?.blocked ?? 0) > 0 || (launchGate?.repairRequired ?? 0) > 0;
  const deploymentStatus: RevenueMoneyArmyBatchPipelineStageStatus = deploymentBlocked
    ? "blocked"
    : readyDeploymentBusinesses > 0 ? "ready" : "waiting";

  const stages: RevenueMoneyArmyBatchPipelineStage[] = [
    pipelineStage({
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/seeds/apply",
      expectedInternalEffect: "Create private store shells and product drafts from selected gap seeds.",
      name: "batch_creation",
      priority: 1,
      reason: gapPlan.opportunitySeeds.length > 0
        ? `${gapPlan.opportunitySeeds.length} safe internal opportunity seed${gapPlan.opportunitySeeds.length === 1 ? "" : "s"} can be created for the launch-wave gap.`
        : "No new opportunity seed is required by the current launch-wave gap.",
      requiredConfirmation: "CREATE INTERNAL BUSINESS FLEET GAP SEEDS",
      status: creationStatus,
      title: "Create private batch seeds",
      blockedExternalActions: gapPlan.blockedExternalActions
    }),
    pipelineStage({
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/acceleration/apply",
      expectedInternalEffect: "Run listing optimization, launch pipeline, and store setup records for selected private seed lanes.",
      name: "batch_acceleration",
      priority: 2,
      reason: hasSelectedBatch
        ? `${selectedSourceKeys.length} selected seed lane${selectedSourceKeys.length === 1 ? "" : "s"} can be accelerated through internal drafting and setup controls.`
        : "Create or select seed lanes before acceleration can run.",
      requiredConfirmation: "RUN INTERNAL BUSINESS FLEET GAP ACCELERATION",
      status: accelerationStatus,
      title: "Accelerate selected batch",
      blockedExternalActions: gapPlan.blockedExternalActions
    }),
    pipelineStage({
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/live-package/apply",
      expectedInternalEffect: "Prepare provider payload packages, operations packs, and launch handoff records for manual review.",
      name: "launch_package",
      priority: 3,
      reason: hasSelectedBatch
        ? "Selected lanes can be packaged for provider approval review and launch gate inspection."
        : "Package creation waits for selected seed lanes.",
      requiredConfirmation: "RECORD INTERNAL BUSINESS FLEET LIVE LAUNCH PACKAGE",
      status: launchPackageStatus,
      title: "Package launch assets",
      blockedExternalActions: gapPlan.blockedExternalActions
    }),
    pipelineStage({
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/provider-approval-review/apply",
      expectedInternalEffect: "Approve or reject provider payload packets as internal manual-handoff records only.",
      name: "approval",
      priority: 4,
      reason: approvablePackets > 0
        ? `${approvablePackets} provider approval packet${approvablePackets === 1 ? "" : "s"} can be reviewed for internal manual handoff.`
        : pendingApprovalPackets > 0
          ? `${pendingApprovalPackets} provider approval packet${pendingApprovalPackets === 1 ? "" : "s"} are pending but not currently approvable.`
          : "No provider approval packet is waiting for review yet.",
      requiredConfirmation: "REVIEW INTERNAL BUSINESS FLEET PROVIDER APPROVALS",
      status: approvalStatus,
      title: "Approve batch handoff",
      blockedExternalActions: gapPlan.blockedExternalActions
    }),
    pipelineStage({
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-wave/apply",
      expectedInternalEffect: "Dispatch ready businesses through First Business Launch and First Cash Sprint internal bridge controls.",
      name: "deployment",
      priority: 5,
      reason: deploymentBlocked
        ? `${(launchGate?.blocked ?? 0) + (launchGate?.repairRequired ?? 0)} packaged lane${(launchGate?.blocked ?? 0) + (launchGate?.repairRequired ?? 0) === 1 ? "" : "s"} need repair before deployment.`
        : readyDeploymentBusinesses > 0
          ? `${readyDeploymentBusinesses} launch-wave business${readyDeploymentBusinesses === 1 ? "" : "es"} can be dispatched internally.`
          : "No business lane is ready for deployment yet.",
      requiredConfirmation: "RUN INTERNAL BUSINESS FLEET LAUNCH WAVE",
      status: deploymentStatus,
      title: "Deploy internal launch wave",
      blockedExternalActions: input.plan.blockedExternalActions
    })
  ];
  const nextStage = firstReadyStage(stages);
  const blockedExternalActions = unique([
    ...input.plan.blockedExternalActions,
    ...gapPlan.blockedExternalActions,
    ...stages.flatMap((stage) => stage.blockedExternalActions)
  ]);

  return {
    auditEvents: [
      "Money Army batch pipeline assembled Business Fleet scheduling, launch gap seeds, launch package gates, provider approval review, and internal deployment stages.",
      "Every stage is internal and approval-gated. External publishing, provider writes, ad spend, payouts, uploads, browser automation, and platform-evasion workflows remain blocked.",
      "Pipeline stages are safe to run in dry-run mode before any internal record creation."
    ],
    blockedExternalActions,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Private Money Army Batch Pipeline",
    nextStage,
    providerContacted: false,
    selectedSourceKeys,
    stages,
    summary: nextStage
      ? `${stages.filter((stage) => stage.status === "ready").length} Money Army batch stage${stages.filter((stage) => stage.status === "ready").length === 1 ? "" : "s"} ready. Next: ${nextStage.title}. Current launch-wave gap is ${gapPlan.totals.launchWaveGap}; ${readyDeploymentBusinesses} deployment lane${readyDeploymentBusinesses === 1 ? "" : "s"} ready.`
      : `Money Army batch pipeline is in watch mode. Current launch-wave gap is ${gapPlan.totals.launchWaveGap}; no stage is ready for internal execution.`,
    totals: {
      approvablePackets,
      approvedPackets,
      blockedStages: stages.filter((stage) => stage.status === "blocked").length,
      currentBusinesses: input.plan.capacity.currentBusinesses,
      launchWaveGap: gapPlan.totals.launchWaveGap,
      pendingApprovalPackets,
      readyDeploymentBusinesses,
      readyStages: stages.filter((stage) => stage.status === "ready").length,
      repairRequired: launchGate?.repairRequired ?? 0,
      seedCandidates: gapPlan.opportunitySeeds.length,
      selectedSourceKeys: selectedSourceKeys.length,
      stages: stages.length,
      targetBusinesses: input.plan.capacity.targetBusinesses,
      targetLaunchWave: input.plan.capacity.launchWaveSize
    }
  };
}

function withHundredStoreOptions(input: Partial<RevenueHundredStoreOperationsOptions> = {}): RevenueHundredStoreOperationsOptions {
  return {
    maxStoresPerShard: clamp(Math.round(input.maxStoresPerShard ?? defaultRevenueHundredStoreOperationsOptions.maxStoresPerShard), 1, 100),
    minProductsPerStore: clamp(Math.round(input.minProductsPerStore ?? defaultRevenueHundredStoreOperationsOptions.minProductsPerStore), 1, 25),
    safeBatchSize: clamp(Math.round(input.safeBatchSize ?? defaultRevenueHundredStoreOperationsOptions.safeBatchSize), 1, 50),
    targetStores: clamp(Math.round(input.targetStores ?? defaultRevenueHundredStoreOperationsOptions.targetStores), 100, 100_000)
  };
}

function operationsGate(input: Omit<RevenueHundredStoreOperationsGate, "externalExecution" | "providerContacted">): RevenueHundredStoreOperationsGate {
  return {
    ...input,
    externalExecution: false,
    providerContacted: false
  };
}

function operationsNextAction(input: Omit<RevenueHundredStoreOperationsNextAction, "externalExecution" | "providerContacted">): RevenueHundredStoreOperationsNextAction {
  return {
    ...input,
    externalExecution: false,
    providerContacted: false
  };
}

function gateScore(gates: RevenueHundredStoreOperationsGate[]) {
  if (gates.length === 0) return 0;

  const score = gates.reduce((sum, gate) => {
    if (gate.status === "pass") return sum + 100;
    if (gate.status === "watch") return sum + 62;
    return sum + 12;
  }, 0) / gates.length;

  return Math.round(score);
}

function operationsStatus(input: {
  gates: RevenueHundredStoreOperationsGate[];
  plan: RevenueBusinessFleetPlan;
  storeGap: number;
}): RevenueHundredStoreOperationsStatus {
  if (input.gates.some((gate) => gate.status === "block" && gate.title === "Safety Envelope")) {
    return "blocked";
  }

  if (input.plan.totals.blocked > 0 || input.plan.totals.qualityBlock > 0 || input.plan.totals.kill > 0) {
    return "needs_quality_repair";
  }

  if (input.storeGap > 0) {
    return input.plan.capacity.currentBusinesses > 0 ? "ready_to_build_to_100" : "needs_store_generation";
  }

  if (input.gates.some((gate) => gate.status === "block")) {
    return "blocked";
  }

  return "ready_for_100_store_internal_operations";
}

const hundredStoreApplicationRequirements: Array<{
  role: RevenueHundredStoreApplicationRole;
  title: string;
}> = [{
  role: "storefront",
  title: "Storefront Marketplace"
}, {
  role: "pod_provider",
  title: "POD Supplier"
}, {
  role: "payments",
  title: "Payments And Payout Signals"
}, {
  role: "content",
  title: "Faceless Content Channels"
}, {
  role: "manual_import",
  title: "Manual Signal Import"
}];

function applicationNextAction(status: "ready" | "partial" | "missing" | "blocked") {
  if (status === "ready") return "Keep connector design evidence current and wait for explicit live approvals.";
  if (status === "blocked") return "Resolve blocked launch closure, operations pack, or read-only connector evidence before live design.";
  if (status === "partial") return "Record missing read-only connector manifests, approvals, rollback plans, and operations-pack evidence.";

  return "Create connector readiness entries from launch closure, operations pack, provider manifest, payment, and content-channel evidence.";
}

function buildHundredStoreApplicationReadiness(input: {
  liveConnectorReadiness?: RevenueLiveConnectorReadinessRegistryPlan | null;
  targetStores: number;
}) {
  const entries = input.liveConnectorReadiness?.entries ?? [];
  const mappedStoreIds = new Set(entries.map((entry) => entry.storeId));
  const applications = hundredStoreApplicationRequirements.map((requirement) => {
    const entriesWithRole = entries.filter((entry) => (
      entry.connectorBoundaries.some((boundary) => boundary.role === requirement.role)
    ));
    const storesWithRole = new Set(entriesWithRole.map((entry) => entry.storeId));
    const readyStores = entriesWithRole.filter((entry) => entry.status === "ready_for_design").length;
    const pendingStores = entriesWithRole.filter((entry) => (
      entry.status === "needs_readonly_approval" || entry.status === "needs_operator_review"
    )).length;
    const blockedStores = entriesWithRole.filter((entry) => entry.status === "blocked").length;
    const missingStores = Math.max(0, input.targetStores - storesWithRole.size);
    const readinessStatus = blockedStores > 0
      ? "blocked" as const
      : readyStores >= input.targetStores
        ? "ready" as const
        : storesWithRole.size > 0
          ? "partial" as const
          : "missing" as const;

    return {
      approvedReadOnlyConnectors: entriesWithRole.reduce((sum, entry) => sum + entry.readOnlyEvidence.approvedConnectors, 0),
      blockedStores,
      externalExecution: false as const,
      missingStores,
      nextInternalAction: applicationNextAction(readinessStatus),
      pendingStores,
      providerContacted: false as const,
      providerNames: unique(entriesWithRole.flatMap((entry) => (
        entry.connectorBoundaries
          .filter((boundary) => boundary.role === requirement.role)
          .map((boundary) => boundary.providerName)
      ))),
      readyStores,
      readinessStatus,
      requiredStores: input.targetStores,
      role: requirement.role,
      title: requirement.title
    };
  });
  const readyForDesign = input.liveConnectorReadiness?.totals.readyForDesign ?? entries.filter((entry) => entry.status === "ready_for_design").length;
  const needsReadOnlyApproval = input.liveConnectorReadiness?.totals.needsReadOnlyApproval ?? entries.filter((entry) => entry.status === "needs_readonly_approval").length;
  const needsOperatorReview = input.liveConnectorReadiness?.totals.needsOperatorReview ?? entries.filter((entry) => entry.status === "needs_operator_review").length;
  const blockedEntries = input.liveConnectorReadiness?.totals.blockedEntries ?? entries.filter((entry) => entry.status === "blocked").length;
  const requiredBoundaries = input.liveConnectorReadiness?.totals.requiredBoundaries ?? entries.reduce((sum, entry) => sum + entry.connectorBoundaries.length, 0);
  const approvedReadOnlyConnectors = input.liveConnectorReadiness?.totals.approvedReadOnlyConnectors ?? entries.reduce((sum, entry) => sum + entry.readOnlyEvidence.approvedConnectors, 0);
  const mappedStores = mappedStoreIds.size;
  const missingStores = Math.max(0, input.targetStores - mappedStores);
  const readinessCoveragePercent = input.targetStores === 0 ? 0 : clamp(Math.round((mappedStores / input.targetStores) * 100), 0, 100);

  return {
    applications,
    summary: `${readinessCoveragePercent}% application readiness coverage: ${mappedStores}/${input.targetStores} store${input.targetStores === 1 ? "" : "s"} mapped, ${readyForDesign} ready for connector design, ${needsReadOnlyApproval} need read-only approval, ${needsOperatorReview} need operator review, and ${blockedEntries} blocked. External execution remains locked.`,
    totals: {
      approvedReadOnlyConnectors,
      blockedEntries,
      mappedStores,
      missingStores,
      needsOperatorReview,
      needsReadOnlyApproval,
      readinessCoveragePercent,
      readyForDesign,
      requiredBoundaries,
      targetStores: input.targetStores
    }
  };
}

function emptyLaneCounts(): Record<RevenueBusinessFleetLane, number> {
  return {
    kill: 0,
    launch_now: 0,
    quality_repair: 0,
    scale: 0,
    throttle: 0,
    watch: 0
  };
}

function applicationReadinessForStore(input: {
  liveConnectorReadiness?: RevenueLiveConnectorReadinessRegistryPlan | null;
  storeId: string;
}): RevenueHundredStoreControlGridStore["applicationReadiness"] {
  const entries = (input.liveConnectorReadiness?.entries ?? []).filter((entry) => entry.storeId === input.storeId);
  const roleTitles = new Map<string, string>(hundredStoreApplicationRequirements.map((requirement) => [requirement.role, requirement.title]));
  const mappedRoles = new Set<string>(entries.flatMap((entry) => entry.connectorBoundaries.map((boundary) => boundary.role)));
  const missingRoles = hundredStoreApplicationRequirements
    .filter((requirement) => !mappedRoles.has(requirement.role))
    .map((requirement) => roleTitles.get(requirement.role) ?? requirement.title);
  const approvedReadOnlyConnectors = entries.reduce((sum, entry) => sum + entry.readOnlyEvidence.approvedConnectors, 0);
  const hasBlocked = entries.some((entry) => entry.status === "blocked");
  const hasReady = entries.some((entry) => entry.status === "ready_for_design");
  const readinessStatus: RevenueHundredStoreApplicationStatus = entries.length === 0
    ? "missing"
    : hasBlocked
      ? "blocked"
      : hasReady && missingRoles.length === 0
        ? "ready"
        : "partial";

  return {
    approvedReadOnlyConnectors,
    missingRoles,
    readinessStatus,
    requiredRoles: hundredStoreApplicationRequirements.length
  };
}

function jobsForBusiness(input: {
  applicationReadiness: RevenueHundredStoreControlGridStore["applicationReadiness"];
  business: RevenueBusinessFleetBusiness;
}): RevenueHundredStoreInternalJobType[] {
  const jobs: RevenueHundredStoreInternalJobType[] = [];

  if (input.applicationReadiness.readinessStatus !== "ready") {
    jobs.push("prepare_connector_packet");
  }

  if (input.business.productAssets < defaultRevenueHundredStoreOperationsOptions.minProductsPerStore) {
    jobs.push("generate_products");
  }

  if (input.business.lane === "launch_now") {
    jobs.push("prepare_launch_package", "queue_organic_content", "monitor_performance");
  } else if (input.business.lane === "scale") {
    jobs.push("advisory_growth_allocation", "queue_organic_content", "monitor_performance");
  } else if (input.business.lane === "quality_repair" || input.business.lane === "throttle") {
    jobs.push("repair_quality", "monitor_performance");
  } else if (input.business.lane === "kill") {
    jobs.push("pause_or_kill_review");
  } else {
    jobs.push("monitor_performance", "queue_organic_content");
  }

  return unique(jobs) as RevenueHundredStoreInternalJobType[];
}

function gridShardFocus(input: {
  overloaded: boolean;
  shardStores: RevenueHundredStoreControlGridStore[];
}) {
  if (input.overloaded) return "Hold new store assignments for this shard until density is reduced.";

  const laneCounts = input.shardStores.reduce<Record<RevenueBusinessFleetLane, number>>((counts, store) => {
    counts[store.lane] += 1;
    return counts;
  }, emptyLaneCounts());
  const strongestLane = (Object.entries(laneCounts) as Array<[RevenueBusinessFleetLane, number]>)
    .sort((left, right) => right[1] - left[1])[0];

  if (!strongestLane || strongestLane[1] === 0) return "Reserve capacity for the next approved internal store shell.";
  if (strongestLane[0] === "launch_now") return "Prepare launch packages and connector packets for ready stores.";
  if (strongestLane[0] === "scale") return "Route scale-pressure stores into advisory growth allocation review.";
  if (strongestLane[0] === "quality_repair" || strongestLane[0] === "throttle") return "Clear quality repairs before this shard receives more launch work.";
  if (strongestLane[0] === "kill") return "Drain kill-lane records so they cannot consume launch capacity.";

  return "Monitor watch-lane signals and queue organic content drafts.";
}

function buildRevenueHundredStoreControlGrid(input: {
  generatedAt?: string;
  liveConnectorReadiness?: RevenueLiveConnectorReadinessRegistryPlan | null;
  options: RevenueHundredStoreOperationsOptions;
  plan: RevenueBusinessFleetPlan;
}): RevenueHundredStoreControlGrid {
  const visibleBusinesses = input.plan.businesses.slice(0, Math.min(input.plan.businesses.length, input.options.targetStores));
  const stores = visibleBusinesses.map((business, index) => {
    const applicationReadiness = applicationReadinessForStore({
      liveConnectorReadiness: input.liveConnectorReadiness,
      storeId: business.businessId
    });

    return {
      allowedInternalJobs: jobsForBusiness({
        applicationReadiness,
        business
      }),
      applicationReadiness,
      businessId: business.businessId,
      businessName: business.businessName,
      externalExecution: false as const,
      lane: business.lane,
      nextInternalAction: business.nextInternalAction.label,
      productAssets: business.productAssets,
      profitVelocity: business.profitVelocity,
      providerContacted: false as const,
      qualityStatus: business.qualityGate.status,
      queuePosition: index + 1,
      scheduleState: business.scheduleState,
      score: {
        finalRank: business.score.finalRank,
        killPressure: business.score.killPressure,
        scalePressure: business.score.scalePressure
      },
      shardId: business.shardId
    };
  });
  const shardIds = Array.from({ length: input.plan.capacity.shardCount }, (_, index) => `shard_${String(index + 1).padStart(3, "0")}`);
  const shards = shardIds.map((shardId) => {
    const shardStores = stores.filter((store) => store.shardId === shardId);
    const laneCounts = shardStores.reduce<Record<RevenueBusinessFleetLane, number>>((counts, store) => {
      counts[store.lane] += 1;
      return counts;
    }, emptyLaneCounts());
    const overloaded = shardStores.length > input.options.maxStoresPerShard;

    return {
      availableStoreSlots: Math.max(0, input.options.maxStoresPerShard - shardStores.length),
      capacityUtilizationPercent: clamp(Math.round((shardStores.length / input.options.maxStoresPerShard) * 100), 0, 999),
      externalExecution: false as const,
      id: shardId,
      laneCounts,
      maxStores: input.options.maxStoresPerShard,
      nextInternalFocus: gridShardFocus({
        overloaded,
        shardStores
      }),
      overloaded,
      providerContacted: false as const,
      readyInternalJobs: shardStores.reduce((sum, store) => (
        sum + (store.scheduleState === "ready_parallel" ? store.allowedInternalJobs.length : 0)
      ), 0),
      stores: shardStores.length,
      throttledOrBlockedStores: shardStores.filter((store) => store.scheduleState === "blocked" || store.scheduleState === "throttled").length
    };
  });
  const missingStoreSlots = Math.max(0, input.options.targetStores - input.plan.capacity.currentBusinesses);
  const readyInternalJobs = shards.reduce((sum, shard) => sum + shard.readyInternalJobs, 0);
  const overloadedShards = shards.filter((shard) => shard.overloaded).length;
  const applicationStatusCount = (status: RevenueHundredStoreApplicationStatus) => stores.filter((store) => store.applicationReadiness.readinessStatus === status).length;
  const laneCount = (lane: RevenueBusinessFleetLane) => stores.filter((store) => store.lane === lane).length;
  const readyParallelStores = stores.filter((store) => store.scheduleState === "ready_parallel").length;

  return {
    auditEvents: [
      "100 Store Operating Control Grid assigned each visible store to a shard, lane, allowed internal job set, and application-readiness state.",
      "Control-grid jobs are internal records only; no external provider, marketplace, browser, content, ad, payment, bank, or payout system was contacted.",
      "Overloaded shards and blocked application readiness are surfaced before parallel internal work is expanded."
    ],
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "100 Store Operating Control Grid",
    providerContacted: false,
    safeToRunParallelInternalJobs: overloadedShards === 0 && stores.every((store) => store.applicationReadiness.readinessStatus !== "blocked"),
    shards,
    stores,
    summary: `${stores.length}/${input.options.targetStores} stores mapped into the 100-store control grid across ${shards.length} shard${shards.length === 1 ? "" : "s"}; ${readyParallelStores} ready-parallel stores, ${readyInternalJobs} allowed ready internal job${readyInternalJobs === 1 ? "" : "s"}, ${overloadedShards} overloaded shard${overloadedShards === 1 ? "" : "s"}, and ${missingStoreSlots} empty store slot${missingStoreSlots === 1 ? "" : "s"} remain. External execution is locked.`,
    totals: {
      applicationBlocked: applicationStatusCount("blocked"),
      applicationMissing: applicationStatusCount("missing"),
      applicationPartial: applicationStatusCount("partial"),
      applicationReady: applicationStatusCount("ready"),
      configuredShards: shards.length,
      currentStores: input.plan.capacity.currentBusinesses,
      killLaneStores: laneCount("kill"),
      launchLaneStores: laneCount("launch_now"),
      missingStoreSlots,
      overloadedShards,
      readyInternalJobs,
      readyParallelStores,
      repairLaneStores: laneCount("quality_repair") + laneCount("throttle"),
      scaleLaneStores: laneCount("scale"),
      targetStores: input.options.targetStores,
      visibleStores: stores.length,
      watchLaneStores: laneCount("watch")
    }
  };
}

const applicationConnectionDefaults: Record<RevenueHundredStoreApplicationRole, {
  approvalChecklist: string[];
  credentialEnvVars: string[];
  providerOptions: string[];
  readOnlyScopes: string[];
  requiredArtifacts: string[];
  rollbackPlan: string[];
}> = {
  content: {
    approvalChecklist: [
      "Confirm channel owner and brand-safe publishing boundaries.",
      "Approve read-only channel analytics scope before any upload scope is considered.",
      "Attach content package review, takedown owner, and rollback evidence."
    ],
    credentialEnvVars: ["YOUTUBE_CONNECTOR_CLIENT_ID", "TIKTOK_CONNECTOR_CLIENT_KEY", "META_CONNECTOR_ACCESS_TOKEN"],
    providerOptions: ["YouTube Shorts", "TikTok", "Instagram Reels"],
    readOnlyScopes: ["channel:read", "analytics:read", "content_metadata:read"],
    requiredArtifacts: ["Faceless content channel manifest", "Content brief approval", "Brand-safe topic list", "Takedown/rollback owner"],
    rollbackPlan: [
      "Freeze upload queue before any future live content attempt.",
      "Revert content brief to internal draft if channel ownership cannot be verified.",
      "Remove future publish scopes unless a separate channel approval packet exists."
    ]
  },
  manual_import: {
    approvalChecklist: [
      "Confirm operator-owned source file or manual signal source.",
      "Validate sample schema before importing into Revenue Engine evidence.",
      "Record who can upload manual snapshots and how errors are reversed."
    ],
    credentialEnvVars: [],
    providerOptions: ["Manual Import"],
    readOnlyScopes: ["manual:reviewed_import"],
    requiredArtifacts: ["Manual import schema", "Sample signal file", "Operator review note", "Correction/rollback procedure"],
    rollbackPlan: [
      "Archive bad manual import batch and keep original evidence.",
      "Re-run Revenue Engine scoring without the rejected signal batch.",
      "Require operator review before the source is used again."
    ]
  },
  payments: {
    approvalChecklist: [
      "Confirm payment account owner and payout destination owner.",
      "Approve read-only balance/order signals before any payout or transfer scope.",
      "Route every future money movement through Financial Orchestrator release governance."
    ],
    credentialEnvVars: ["STRIPE_CONNECTOR_SECRET_KEY"],
    providerOptions: ["Stripe"],
    readOnlyScopes: ["balance:read", "charges:read", "orders:read", "payouts:read"],
    requiredArtifacts: ["Payment read-only manifest", "Financial Orchestrator split-policy evidence", "Payout freeze control", "Manual release reviewer"],
    rollbackPlan: [
      "Keep payout and transfer writes disabled until separate financial approval exists.",
      "Freeze scaling spend packets if payment evidence fails validation.",
      "Reconcile imported payment signals against manual ledger before retry."
    ]
  },
  pod_provider: {
    approvalChecklist: [
      "Confirm POD provider account owner and shop id.",
      "Approve draft-product dry-run map before upload or product write scopes.",
      "Attach artifact hash evidence for every future product file."
    ],
    credentialEnvVars: ["PRINTIFY_CONNECTOR_TOKEN", "PRINTIFY_SHOP_ID", "PRINTFUL_CONNECTOR_TOKEN"],
    providerOptions: ["Printify", "Printful"],
    readOnlyScopes: ["shops:read", "catalog:read", "products:read"],
    requiredArtifacts: ["POD provider manifest", "Product request manifest", "Artifact hash list", "Provider draft rollback owner"],
    rollbackPlan: [
      "Archive provider draft product if future dry-run evidence fails.",
      "Remove artifact references from the internal request manifest before retry.",
      "Disable provider write queue for the affected store."
    ]
  },
  storefront: {
    approvalChecklist: [
      "Confirm storefront owner and store URL/marketplace id.",
      "Approve read-only listing/order scope before any product/listing write scope.",
      "Attach listing rollback owner and draft listing idempotency plan."
    ],
    credentialEnvVars: ["ETSY_CONNECTOR_CLIENT_ID", "ETSY_CONNECTOR_CLIENT_SECRET", "SHOPIFY_CONNECTOR_ADMIN_TOKEN", "SHOPIFY_STORE_DOMAIN"],
    providerOptions: ["Etsy", "Shopify"],
    readOnlyScopes: ["listings:read", "orders:read", "shop:read", "inventory:read"],
    requiredArtifacts: ["Storefront connector manifest", "Draft listing field map", "Store setup runbook", "Listing rollback owner"],
    rollbackPlan: [
      "Keep listing writes disabled until a separate launch approval packet exists.",
      "Restore title, price, inventory, and media references from the approved internal draft.",
      "Freeze storefront queue if marketplace policy or ownership evidence is missing."
    ]
  }
};

function mappedRolesForStore(input: {
  liveConnectorReadiness?: RevenueLiveConnectorReadinessRegistryPlan | null;
  storeId: string;
}) {
  return new Set((input.liveConnectorReadiness?.entries ?? [])
    .filter((entry) => entry.storeId === input.storeId)
    .flatMap((entry) => entry.connectorBoundaries.map((boundary) => boundary.role)));
}

function buildConnectionPacket(input: {
  lane: RevenueBusinessFleetLane | "future_store_slot";
  role: RevenueHundredStoreApplicationRole;
  setupStatus: RevenueHundredStoreApplicationConnectionPacket["setupStatus"];
  shardId: string;
  storeId: string | null;
  storeName: string;
}) {
  const requirement = hundredStoreApplicationRequirements.find((item) => item.role === input.role);
  const defaults = applicationConnectionDefaults[input.role];

  return {
    approvalChecklist: defaults.approvalChecklist,
    connectionMode: "internal_preparation_only" as const,
    credentialEnvVars: defaults.credentialEnvVars,
    externalExecution: false as const,
    lane: input.lane,
    providerContacted: false as const,
    providerOptions: defaults.providerOptions,
    readOnlyScopes: defaults.readOnlyScopes,
    requiredArtifacts: defaults.requiredArtifacts,
    role: input.role,
    rollbackPlan: defaults.rollbackPlan,
    setupStatus: input.setupStatus,
    shardId: input.shardId,
    storeId: input.storeId,
    storeName: input.storeName,
    title: requirement?.title ?? input.role.replace(/_/g, " ")
  };
}

function buildRevenueHundredStoreApplicationConnectionWorkbench(input: {
  controlGrid: RevenueHundredStoreControlGrid;
  generatedAt?: string;
  liveConnectorReadiness?: RevenueLiveConnectorReadinessRegistryPlan | null;
  options: RevenueHundredStoreOperationsOptions;
}): RevenueHundredStoreApplicationConnectionWorkbench {
  const packets = input.controlGrid.stores.flatMap((store) => {
    const mappedRoles = mappedRolesForStore({
      liveConnectorReadiness: input.liveConnectorReadiness,
      storeId: store.businessId
    });

    return hundredStoreApplicationRequirements.map((requirement) => {
      const alreadyMapped = mappedRoles.has(requirement.role);
      const blocked = store.qualityStatus === "block" || store.scheduleState === "blocked";

      return buildConnectionPacket({
        lane: store.lane,
        role: requirement.role,
        setupStatus: alreadyMapped ? "already_mapped" : blocked ? "blocked_by_store_quality" : "ready_for_internal_packet",
        shardId: store.shardId,
        storeId: store.businessId,
        storeName: store.businessName
      });
    });
  });
  const futureStoreSlots = Math.max(0, input.options.targetStores - input.controlGrid.totals.currentStores);
  const templates = hundredStoreApplicationRequirements.map((requirement) => ({
    connectionMode: "internal_preparation_only" as const,
    externalExecution: false as const,
    providerContacted: false as const,
    role: requirement.role,
    slotCount: futureStoreSlots,
    title: requirement.title
  }));
  const readyPackets = packets.filter((packet) => packet.setupStatus === "ready_for_internal_packet").length;
  const alreadyMappedPackets = packets.filter((packet) => packet.setupStatus === "already_mapped").length;
  const blockedPackets = packets.filter((packet) => packet.setupStatus === "blocked_by_store_quality").length;

  return {
    auditEvents: [
      "100 Store Application Connection Workbench converted missing application roles into internal connection-prep packets and reusable future-store templates.",
      "Packets are preparation artifacts only; they do not create accounts, credentials, OAuth grants, provider requests, browser sessions, uploads, publishing, ad spend, payouts, transfers, or live jobs.",
      "Every packet requires operator approval, credential custody review, read-only scope review, rollback evidence, and future live connector design approval before external use."
    ],
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "100 Store Application Connection Workbench",
    packets,
    providerContacted: false,
    summary: `${readyPackets} application connection packet${readyPackets === 1 ? "" : "s"} ready for internal prep across ${input.controlGrid.totals.visibleStores} visible store${input.controlGrid.totals.visibleStores === 1 ? "" : "s"}; ${alreadyMappedPackets} already mapped, ${blockedPackets} blocked by store quality, and ${futureStoreSlots} future store slot${futureStoreSlots === 1 ? "" : "s"} have reusable app templates. External execution remains locked.`,
    templates,
    totals: {
      alreadyMappedPackets,
      blockedPackets,
      credentialEnvVars: packets.reduce((sum, packet) => sum + packet.credentialEnvVars.length, 0),
      futureStoreTemplates: templates.reduce((sum, template) => sum + template.slotCount, 0),
      packets: packets.length,
      readyPackets,
      requiredArtifacts: packets.reduce((sum, packet) => sum + packet.requiredArtifacts.length, 0),
      rollbackPlans: packets.reduce((sum, packet) => sum + packet.rollbackPlan.length, 0),
      storesCovered: new Set(packets.map((packet) => packet.storeId).filter(Boolean)).size
    }
  };
}

const connectorActivationBlockedExternalActions = [
  "Reading, storing, printing, validating, exchanging, or transmitting credential values",
  "Creating OAuth grants, provider sessions, write scopes, live webhooks, browser sessions, uploads, marketplace listings, social posts, ad campaigns, payouts, transfers, payment actions, or bank movement",
  "Treating connector activation matrix rows as permission to contact providers before owner approval, credential custody, dry-run review, and rollback rehearsal"
];

const connectorWriteScopesByRole: Record<RevenueHundredStoreApplicationRole, string[]> = {
  content: ["content:upload", "content:publish", "content:delete"],
  manual_import: [],
  payments: ["payouts:write", "transfers:write", "refunds:write", "treasury:write"],
  pod_provider: ["products:write", "orders:write", "files:write"],
  storefront: ["listings:write", "orders:write", "inventory:write", "shop:write"]
};

function connectorActivationEndpoint(role: RevenueHundredStoreApplicationRole) {
  if (role === "content") return "/connector/content/read-only-dry-run";
  if (role === "manual_import") return "/connector/manual-import/schema-review";
  if (role === "payments") return "/connector/payments/read-only-dry-run";
  if (role === "pod_provider") return "/connector/pod-provider/read-only-dry-run";

  return "/connector/storefront/read-only-dry-run";
}

function connectorActivationPayloadFields(role: RevenueHundredStoreApplicationRole) {
  if (role === "manual_import") return ["sourceFileSchema", "sampleRowHash", "operatorReviewNote"];
  if (role === "payments") return ["accountIdAlias", "balanceReadScope", "ordersReadScope", "reconciliationWindow"];
  if (role === "pod_provider") return ["shopIdAlias", "catalogReadScope", "productReadScope", "artifactHashList"];
  if (role === "content") return ["channelIdAlias", "analyticsReadScope", "contentMetadataReadScope", "brandSafetyTopicList"];

  return ["shopIdAlias", "listingReadScope", "ordersReadScope", "inventoryReadScope"];
}

function connectorActivationDryRunRequests(input: {
  role: RevenueHundredStoreApplicationRole;
  rowId: string;
  storeName: string;
  storeId: string | null;
}): RevenueHundredStoreConnectorActivationDryRunRequest[] {
  const source = input.storeId ?? input.rowId;

  return [{
    approvalRequired: true,
    endpointTemplate: connectorActivationEndpoint(input.role),
    idempotencyKey: createHash("sha1")
      .update(`hundred-store-connector:${source}:${input.role}`)
      .digest("hex")
      .slice(0, 16),
    method: input.role === "manual_import" ? "POST" : "GET",
    payloadFields: connectorActivationPayloadFields(input.role),
    stepId: `connector-dry-run:${source}:${input.role}`,
    title: `${input.role.replace(/_/g, " ")} read-only dry-run map`
  }];
}

function connectorCredentialCustodyChecklist(input: {
  credentialEnvVars: string[];
  role: RevenueHundredStoreApplicationRole;
}) {
  if (input.credentialEnvVars.length === 0) {
    return [
      "No credential value required for this role; keep manual payload review inside ENTRAL.",
      "Confirm import owner, source file custody, and correction procedure before accepting manual signals."
    ];
  }

  return input.credentialEnvVars.map((envVar) => (
    `${envVar}: store value outside ENTRAL, expose only the environment variable name, approve owner custody, and rotate before first live use.`
  ));
}

function connectorActivationStatus(input: {
  packet?: RevenueHundredStoreApplicationConnectionPacket;
  role: RevenueHundredStoreApplicationRole;
  storeId: string | null;
}): RevenueHundredStoreConnectorActivationStatus {
  if (!input.storeId) return "waiting_for_store_shell";
  if (input.packet?.setupStatus === "blocked_by_store_quality") return "blocked_by_store_quality";
  if ((input.packet?.credentialEnvVars.length ?? applicationConnectionDefaults[input.role].credentialEnvVars.length) > 0) {
    return "credential_custody_required";
  }

  return "ready_for_connection_design";
}

function connectorActivationReadinessScore(status: RevenueHundredStoreConnectorActivationStatus, input: {
  dryRunRequests: number;
  readOnlyScopes: number;
  requiredArtifacts: number;
  rollbackSteps: number;
}) {
  const statusScore = status === "ready_for_connection_design"
    ? 45
    : status === "credential_custody_required"
      ? 35
      : status === "waiting_for_store_shell"
        ? 20
        : 0;
  const scopeScore = input.readOnlyScopes > 0 ? 20 : 0;
  const artifactScore = input.requiredArtifacts > 0 ? 15 : 0;
  const rollbackScore = input.rollbackSteps > 0 ? 10 : 0;
  const dryRunScore = input.dryRunRequests > 0 ? 10 : 0;

  return clamp(statusScore + scopeScore + artifactScore + rollbackScore + dryRunScore, 0, 100);
}

function connectorActivationRow(input: {
  lane: RevenueBusinessFleetLane | "future_store_slot";
  packet?: RevenueHundredStoreApplicationConnectionPacket;
  role: RevenueHundredStoreApplicationRole;
  rowId: string;
  shardId: string;
  storeId: string | null;
  storeName: string;
}): RevenueHundredStoreConnectorActivationRow {
  const defaults = applicationConnectionDefaults[input.role];
  const packet = input.packet;
  const credentialEnvVars = unique(packet?.credentialEnvVars ?? defaults.credentialEnvVars);
  const readOnlyScopes = unique(packet?.readOnlyScopes ?? defaults.readOnlyScopes);
  const requiredArtifacts = unique(packet?.requiredArtifacts ?? defaults.requiredArtifacts);
  const rollbackPlan = unique(packet?.rollbackPlan ?? defaults.rollbackPlan);
  const dryRunRequestMap = connectorActivationDryRunRequests({
    role: input.role,
    rowId: input.rowId,
    storeId: input.storeId,
    storeName: input.storeName
  });
  const status = connectorActivationStatus({
    packet,
    role: input.role,
    storeId: input.storeId
  });
  const writeScopesBlocked = connectorWriteScopesByRole[input.role];

  return {
    approvalChecklist: unique([
      ...(packet?.approvalChecklist ?? defaults.approvalChecklist),
      "Approve dry-run request map and idempotency key before any live connector code exists.",
      "Confirm write scopes remain blocked until a separate owner-approved live connector phase."
    ]),
    credentialCustodyChecklist: connectorCredentialCustodyChecklist({
      credentialEnvVars,
      role: input.role
    }),
    credentialEnvVars,
    dryRunRequestMap,
    externalExecution: false,
    providerContacted: false,
    providerOptions: unique(packet?.providerOptions ?? defaults.providerOptions),
    readinessScore: connectorActivationReadinessScore(status, {
      dryRunRequests: dryRunRequestMap.length,
      readOnlyScopes: readOnlyScopes.length,
      requiredArtifacts: requiredArtifacts.length,
      rollbackSteps: rollbackPlan.length
    }),
    readOnlyScopes,
    requiredArtifacts,
    role: input.role,
    rowId: input.rowId,
    rollbackPlan,
    shardId: input.shardId,
    status,
    storeId: input.storeId,
    storeName: input.storeName,
    title: `${input.storeName} ${input.role.replace(/_/g, " ")} connector activation`,
    writeScopesBlocked
  };
}

function buildRevenueHundredStoreConnectorActivationMatrix(input: {
  applicationConnectionWorkbench: RevenueHundredStoreApplicationConnectionWorkbench;
  controlGrid: RevenueHundredStoreControlGrid;
  gapPlan: RevenueBusinessFleetLaunchGapPlan;
  generatedAt?: string;
  options: RevenueHundredStoreOperationsOptions;
}): RevenueHundredStoreConnectorActivationMatrix {
  const packetsByStoreRole = new Map(input.applicationConnectionWorkbench.packets.map((packet) => [`${packet.storeId ?? packet.storeName}:${packet.role}`, packet]));
  const currentRows = input.controlGrid.stores.flatMap((store) => (
    hundredStoreApplicationRequirements.map((requirement) => connectorActivationRow({
      lane: store.lane,
      packet: packetsByStoreRole.get(`${store.businessId}:${requirement.role}`),
      role: requirement.role,
      rowId: `${store.businessId}:${requirement.role}`,
      shardId: store.shardId,
      storeId: store.businessId,
      storeName: store.businessName
    }))
  ));
  const futureStoreSlots = Math.max(0, input.options.targetStores - input.controlGrid.totals.currentStores);
  const futureRows = Array.from({ length: futureStoreSlots }, (_, index) => {
    const slot = index + 1;
    const seed = input.gapPlan.opportunitySeeds[index % Math.max(input.gapPlan.opportunitySeeds.length, 1)];
    const storeName = seed?.businessName ?? `Future Store Slot ${slot}`;
    const shardId = `future_shard_${String((index % Math.max(input.controlGrid.totals.configuredShards, 1)) + 1).padStart(3, "0")}`;

    return hundredStoreApplicationRequirements.map((requirement) => connectorActivationRow({
      lane: "future_store_slot",
      role: requirement.role,
      rowId: `future-slot-${slot}:${requirement.role}`,
      shardId,
      storeId: null,
      storeName
    }));
  }).flat();
  const rows = [...currentRows, ...futureRows].sort((left, right) => (
    right.readinessScore - left.readinessScore
    || left.status.localeCompare(right.status)
    || left.storeName.localeCompare(right.storeName)
    || left.role.localeCompare(right.role)
  ));
  const statusCount = (status: RevenueHundredStoreConnectorActivationStatus) => rows.filter((row) => row.status === status).length;

  return {
    auditEvents: [
      "100 Store Connector Activation Matrix converted application packets and future templates into per-store connector readiness rows.",
      "Rows include credential custody checklists, read-only scopes, dry-run request maps, blocked write scopes, required artifacts, approval gates, and rollback plans.",
      "The matrix is readiness-only; it does not read credential values, create OAuth grants, contact providers, open browsers, upload products, publish listings, post content, run ads, move money, move payouts, or enable live jobs."
    ],
    blockedExternalActions: connectorActivationBlockedExternalActions,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "100 Store Connector Activation Matrix",
    providerContacted: false,
    rows,
    summary: `${rows.length}/${input.options.targetStores * hundredStoreApplicationRequirements.length} connector activation row${rows.length === 1 ? "" : "s"} prepared for ${input.options.targetStores} stores: ${statusCount("ready_for_connection_design")} ready for connection design, ${statusCount("credential_custody_required")} need credential custody, ${statusCount("waiting_for_store_shell")} waiting for store shells, and ${statusCount("blocked_by_store_quality")} blocked by quality. External execution remains locked.`,
    totals: {
      blockedByQuality: statusCount("blocked_by_store_quality"),
      credentialCustodyRequired: statusCount("credential_custody_required"),
      credentialEnvVarRefs: rows.reduce((sum, row) => sum + row.credentialEnvVars.length, 0),
      currentStoreRows: currentRows.length,
      dryRunRequestMaps: rows.reduce((sum, row) => sum + row.dryRunRequestMap.length, 0),
      futureStoreRows: futureRows.length,
      maxSelectableRows: Math.min(input.options.safeBatchSize, rows.length),
      readyForConnectionDesign: statusCount("ready_for_connection_design"),
      requiredRoles: hundredStoreApplicationRequirements.length,
      rows: rows.length,
      storesCovered: new Set(rows.map((row) => row.storeId ?? row.storeName)).size,
      targetStores: input.options.targetStores,
      waitingForStoreShell: statusCount("waiting_for_store_shell"),
      writeScopesBlocked: rows.reduce((sum, row) => sum + row.writeScopesBlocked.length, 0)
    }
  };
}

function monitoringRequiredSignals(input: {
  status: RevenueHundredStoreMonitoringSignalStatus;
  store: RevenueHundredStoreControlGridStore;
}) {
  const base = [
    "gross revenue",
    "net profit",
    "units sold",
    "store visits",
    "conversion rate",
    "refunds",
    "ad spend",
    "organic content views"
  ];

  if (input.status === "scale_review_required") {
    return unique([
      ...base,
      "scale pressure",
      "growth allocation outcome",
      "inventory or POD fulfillment constraint"
    ]);
  }

  if (input.status === "rotation_review_required") {
    return unique([
      ...base,
      "kill pressure",
      "quality gate reason",
      "pause or kill reviewer note"
    ]);
  }

  if (input.status === "needs_readonly_import") {
    return unique([
      ...base,
      "read-only connector import timestamp",
      "source system record id"
    ]);
  }

  if (input.status === "needs_manual_snapshot") {
    return unique([
      ...base,
      "manual snapshot owner",
      "manual snapshot source"
    ]);
  }

  return input.store.lane === "watch"
    ? unique([...base, "watch-lane drift check"])
    : base;
}

function monitoringProfile(input: {
  business?: RevenueBusinessFleetBusiness;
  store: RevenueHundredStoreControlGridStore;
}): {
  cadence: RevenueHundredStoreMonitoringCadence;
  nextInternalAction: string;
  priority: number;
  signalStatus: RevenueHundredStoreMonitoringSignalStatus;
  triggerReason: string;
} {
  const trackedAssets = input.business?.trackedAssets ?? 0;
  const readOnlyConnectors = input.store.applicationReadiness.approvedReadOnlyConnectors;
  const scalePressure = input.store.score.scalePressure;
  const killPressure = input.store.score.killPressure;

  if (
    input.store.lane === "kill"
    || input.store.qualityStatus === "block"
    || input.store.scheduleState === "blocked"
    || killPressure >= 70
  ) {
    return {
      cadence: "immediate_rotation_review",
      nextInternalAction: "route_to_pause_or_kill_review",
      priority: clamp(100 + killPressure - scalePressure, 75, 100),
      signalStatus: "rotation_review_required",
      triggerReason: `${input.store.businessName} is in a blocked/kill-pressure state and must be reviewed before it can consume launch capacity.`
    };
  }

  if (trackedAssets === 0 && readOnlyConnectors > 0) {
    return {
      cadence: "twice_daily_until_first_signal",
      nextInternalAction: "queue_readonly_performance_import",
      priority: clamp(80 + scalePressure - killPressure, 65, 95),
      signalStatus: "needs_readonly_import",
      triggerReason: `${input.store.businessName} has approved read-only connector evidence but no tracked performance assets yet.`
    };
  }

  if (trackedAssets === 0) {
    return {
      cadence: "twice_daily_until_first_signal",
      nextInternalAction: "queue_manual_performance_snapshot",
      priority: clamp(75 + scalePressure - killPressure, 60, 90),
      signalStatus: "needs_manual_snapshot",
      triggerReason: `${input.store.businessName} has no tracked performance assets yet and needs an internal signal snapshot.`
    };
  }

  if (input.store.lane === "scale" || scalePressure >= 70) {
    return {
      cadence: "daily",
      nextInternalAction: "review_scale_pressure_for_ad_growth_allocation",
      priority: clamp(70 + scalePressure - killPressure, 55, 95),
      signalStatus: "scale_review_required",
      triggerReason: `${input.store.businessName} is carrying scale pressure that should inform advisory growth allocation.`
    };
  }

  if (input.store.lane === "launch_now") {
    return {
      cadence: "daily",
      nextInternalAction: "monitor_launch_signal_quality",
      priority: clamp(55 + scalePressure - killPressure, 35, 80),
      signalStatus: "signal_ready",
      triggerReason: `${input.store.businessName} is launch-ready and should be watched daily for first revenue proof.`
    };
  }

  if (input.store.lane === "quality_repair" || input.store.lane === "throttle") {
    return {
      cadence: "every_3_days",
      nextInternalAction: "monitor_repair_or_throttle_recovery",
      priority: clamp(45 + killPressure, 35, 80),
      signalStatus: "signal_ready",
      triggerReason: `${input.store.businessName} is in repair or throttle mode and should be checked for recovery evidence.`
    };
  }

  return {
    cadence: "weekly_watch",
    nextInternalAction: "monitor_watch_lane_drift",
    priority: clamp(30 + scalePressure - killPressure, 20, 65),
    signalStatus: "signal_ready",
    triggerReason: `${input.store.businessName} is stable enough for watch-lane monitoring.`
  };
}

function buildRevenueHundredStoreMonitoringMatrix(input: {
  controlGrid: RevenueHundredStoreControlGrid;
  generatedAt?: string;
  options: RevenueHundredStoreOperationsOptions;
  plan: RevenueBusinessFleetPlan;
}): RevenueHundredStoreMonitoringMatrix {
  const businessById = new Map(input.plan.businesses.map((business) => [business.businessId, business]));
  const items = input.controlGrid.stores.map((store) => {
    const business = businessById.get(store.businessId);
    const profile = monitoringProfile({
      business,
      store
    });

    return {
      businessId: store.businessId,
      businessName: store.businessName,
      cadence: profile.cadence,
      externalExecution: false as const,
      lane: store.lane,
      nextInternalAction: profile.nextInternalAction,
      priority: profile.priority,
      profitVelocity: store.profitVelocity,
      providerContacted: false as const,
      requiredSignals: monitoringRequiredSignals({
        status: profile.signalStatus,
        store
      }),
      rotationDecision: store.lane,
      scheduleState: store.scheduleState,
      shardId: store.shardId,
      signalStatus: profile.signalStatus,
      trackedAssets: business?.trackedAssets ?? 0,
      triggerReason: profile.triggerReason
    };
  }).sort((left, right) => (
    right.priority - left.priority
    || right.profitVelocity - left.profitVelocity
    || left.businessName.localeCompare(right.businessName)
  ));
  const manualSnapshots = items.filter((item) => item.signalStatus === "needs_manual_snapshot");
  const readOnlyImports = items.filter((item) => item.signalStatus === "needs_readonly_import");
  const rotationReviews = items.filter((item) => item.signalStatus === "rotation_review_required");
  const scaleReviews = items.filter((item) => item.signalStatus === "scale_review_required");
  const cadenceCount = (cadence: RevenueHundredStoreMonitoringCadence) => items.filter((item) => item.cadence === cadence).length;
  const signalReady = items.filter((item) => item.signalStatus === "signal_ready").length;
  const missingStoreSlots = Math.max(0, input.options.targetStores - input.controlGrid.totals.currentStores);
  const dailyProfitVelocity = money(input.plan.businesses.reduce((sum, business) => sum + business.profitVelocity, 0));

  return {
    auditEvents: [
      "100 Store Monitoring Matrix assigned every visible store to an internal signal cadence, evidence queue, and rotation/scale review path.",
      "Monitoring rows use existing Revenue Engine lanes, scale pressure, kill pressure, tracked asset counts, and application readiness evidence.",
      "The matrix prepares manual snapshots and read-only imports only; it does not contact providers, upload content, spend on ads, move money, or run browser automation."
    ],
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    items,
    mode: "100 Store Monitoring Matrix",
    providerContacted: false,
    queues: {
      manualSnapshots,
      readOnlyImports,
      rotationReviews,
      scaleReviews
    },
    summary: `${items.length}/${input.options.targetStores} stores are on a monitoring cadence: ${manualSnapshots.length} manual snapshot queue${manualSnapshots.length === 1 ? "" : "s"}, ${readOnlyImports.length} read-only import queue${readOnlyImports.length === 1 ? "" : "s"}, ${rotationReviews.length} rotation review${rotationReviews.length === 1 ? "" : "s"}, ${scaleReviews.length} scale review${scaleReviews.length === 1 ? "" : "s"}, and ${missingStoreSlots} future slot${missingStoreSlots === 1 ? "" : "s"} still need store creation. External execution is locked.`,
    totals: {
      dailyProfitVelocity,
      every3Days: cadenceCount("every_3_days"),
      immediateRotationReviews: cadenceCount("immediate_rotation_review"),
      manualSnapshots: manualSnapshots.length,
      missingStoreSlots,
      readOnlyImports: readOnlyImports.length,
      scaleReviews: scaleReviews.length,
      signalReady,
      storesCovered: items.length,
      twiceDaily: cadenceCount("twice_daily_until_first_signal"),
      weeklyWatch: cadenceCount("weekly_watch")
    }
  };
}

function growthAllocationLaneFor(input: {
  item: RevenueHundredStoreMonitoringItem;
  store: RevenueHundredStoreControlGridStore;
}): RevenueHundredStoreGrowthAllocationLane {
  if (
    input.item.signalStatus === "rotation_review_required"
    || input.store.lane === "kill"
    || input.store.qualityStatus === "block"
    || input.store.score.killPressure >= 70
  ) {
    return "defensive_hold";
  }

  if (input.item.signalStatus === "scale_review_required" && input.item.trackedAssets > 0 && input.store.score.scalePressure >= 70) {
    return "paid_scale_review";
  }

  if (
    input.item.signalStatus === "needs_manual_snapshot"
    || input.item.signalStatus === "needs_readonly_import"
    || input.item.trackedAssets === 0
    || input.store.lane === "launch_now"
  ) {
    return "organic_first";
  }

  if (input.store.lane === "scale" && input.store.score.scalePressure >= 60 && input.store.score.killPressure < 50) {
    return "paid_scale_review";
  }

  return "watch";
}

function growthAllocationReason(input: {
  candidate: {
    allocationLane: RevenueHundredStoreGrowthAllocationLane;
    businessName: string;
    killPressure: number;
    scalePressure: number;
    signalStatus: RevenueHundredStoreMonitoringSignalStatus;
    trackedAssets: number;
  };
}) {
  if (input.candidate.allocationLane === "defensive_hold") {
    return `${input.candidate.businessName} receives 0% of the Ad/Growth bucket until kill pressure ${input.candidate.killPressure}/100 and rotation review are cleared.`;
  }

  if (input.candidate.allocationLane === "paid_scale_review") {
    return `${input.candidate.businessName} has scale pressure ${input.candidate.scalePressure}/100 with ${input.candidate.trackedAssets} tracked asset${input.candidate.trackedAssets === 1 ? "" : "s"} and can receive paid-scale review after approval.`;
  }

  if (input.candidate.allocationLane === "organic_first") {
    return `${input.candidate.businessName} should use organic-first growth and signal capture before paid spend because status is ${input.candidate.signalStatus.replace(/_/g, " ")}.`;
  }

  return `${input.candidate.businessName} stays in watch mode until new scale pressure or revenue evidence appears.`;
}

function growthAllocationGuardrails(lane: RevenueHundredStoreGrowthAllocationLane) {
  const base = [
    "Ad/Growth allocation is advisory only and cannot spend money without Financial Orchestrator approval.",
    "No provider, marketplace, browser, upload, publishing, payout, bank, card, or ad account action is authorized here."
  ];

  if (lane === "paid_scale_review") {
    return [
      ...base,
      "Paid tests require explicit owner approval, positive performance evidence, and a separate scaling budget packet.",
      "Daily caps must be enforced before any future ad connector can run."
    ];
  }

  if (lane === "defensive_hold") {
    return [
      ...base,
      "Growth allocation is held until pause/kill review and evidence cleanup are complete."
    ];
  }

  if (lane === "organic_first") {
    return [
      ...base,
      "Organic content, listing improvement, and read-only signal capture must happen before paid spend review."
    ];
  }

  return [
    ...base,
    "Watch-lane stores stay out of budget allocation until pressure changes."
  ];
}

function buildRevenueHundredStoreGrowthAllocationRouter(input: {
  controlGrid: RevenueHundredStoreControlGrid;
  generatedAt?: string;
  monitoringMatrix: RevenueHundredStoreMonitoringMatrix;
  options: RevenueHundredStoreOperationsOptions;
}): RevenueHundredStoreGrowthAllocationRouter {
  const storeById = new Map(input.controlGrid.stores.map((store) => [store.businessId, store]));
  const rawCandidates = input.monitoringMatrix.items.map((item) => {
    const store = storeById.get(item.businessId);
    const scalePressure = store?.score.scalePressure ?? 0;
    const killPressure = store?.score.killPressure ?? 0;
    const allocationLane = store
      ? growthAllocationLaneFor({
        item,
        store
      })
      : "watch";
    const eligibleForPaidScaleReview = allocationLane === "paid_scale_review";
    const allocationWeight = allocationLane === "paid_scale_review"
      ? clamp(Math.round(scalePressure * 1.4 + Math.max(0, item.profitVelocity) * 2 + item.trackedAssets * 4 - killPressure), 1, 250)
      : allocationLane === "organic_first"
        ? clamp(Math.round(scalePressure * 0.7 + item.priority * 0.4 - killPressure * 0.6), 1, 100)
        : 0;

    const candidate = {
      allocationLane,
      businessId: item.businessId,
      businessName: item.businessName,
      eligibleForPaidScaleReview,
      killPressure,
      lane: item.lane,
      priority: item.priority,
      profitVelocity: item.profitVelocity,
      scalePressure,
      shardId: item.shardId,
      signalStatus: item.signalStatus,
      trackedAssets: item.trackedAssets
    };

    return {
      adGrowthBucketSharePercent: 0,
      allocationLane,
      allocationWeight,
      businessId: item.businessId,
      businessName: item.businessName,
      eligibleForPaidScaleReview,
      externalExecution: false as const,
      guardrails: growthAllocationGuardrails(allocationLane),
      killPressure,
      lane: item.lane,
      nextInternalAction: allocationLane === "paid_scale_review"
        ? "prepare_financial_scaling_budget_review_packet"
        : allocationLane === "organic_first"
          ? "queue_organic_content_and_signal_capture"
          : allocationLane === "defensive_hold"
            ? "clear_rotation_or_kill_review_before_growth"
            : "watch_for_new_performance_pressure",
      priority: item.priority,
      profitVelocity: item.profitVelocity,
      providerContacted: false as const,
      reason: growthAllocationReason({
        candidate
      }),
      recommendedSpendPriority: (allocationLane === "paid_scale_review"
        ? scalePressure >= 85 && item.profitVelocity > 0 ? "scale_test" : "low_test"
        : "none") as RevenueHundredStoreGrowthAllocationCandidate["recommendedSpendPriority"],
      requiredApproval: allocationLane === "paid_scale_review"
        ? "Owner approval plus Financial Orchestrator scaling budget packet required before paid spend."
        : "No paid spend approval is available from this lane.",
      scalePressure,
      shardId: item.shardId,
      signalStatus: item.signalStatus,
      trackedAssets: item.trackedAssets
    };
  });
  const allocatableCandidates = rawCandidates.filter((candidate) => candidate.allocationWeight > 0);
  const totalAllocationWeight = allocatableCandidates.reduce((sum, candidate) => sum + candidate.allocationWeight, 0);
  const candidates = rawCandidates
    .map((candidate) => ({
      ...candidate,
      adGrowthBucketSharePercent: totalAllocationWeight > 0 && candidate.allocationWeight > 0
        ? money(candidate.allocationWeight / totalAllocationWeight * 100)
        : 0
    }))
    .sort((left, right) => (
      right.adGrowthBucketSharePercent - left.adGrowthBucketSharePercent
      || right.priority - left.priority
      || right.profitVelocity - left.profitVelocity
      || left.businessName.localeCompare(right.businessName)
    ));
  const laneCount = (lane: RevenueHundredStoreGrowthAllocationLane) => candidates.filter((candidate) => candidate.allocationLane === lane).length;
  const routedAdGrowthPercent = money(candidates.reduce((sum, candidate) => sum + candidate.adGrowthBucketSharePercent, 0));
  const retainedForDefensePercent = money(Math.max(0, 100 - routedAdGrowthPercent));
  const averageScalePressure = candidates.length > 0
    ? Math.round(average(candidates.map((candidate) => candidate.scalePressure)))
    : 0;
  const averageKillPressure = candidates.length > 0
    ? Math.round(average(candidates.map((candidate) => candidate.killPressure)))
    : 0;

  return {
    auditEvents: [
      "100 Store Growth Allocation Router converted scale pressure, kill pressure, monitoring status, and tracked signal depth into advisory Ad/Growth bucket priorities.",
      "The router distributes percentages of the Financial Orchestrator 25% Ad/Growth bucket only; it does not create spend, provider, browser, upload, publishing, payment, payout, bank, or ad account actions.",
      "Paid-scale lanes require separate owner approval and Financial Orchestrator scaling budget packets before any external action can exist."
    ],
    blockedExternalActions: [
      "Spending from the 25% Ad/Growth bucket without explicit owner approval",
      "Starting paid ads, provider writes, marketplace uploads, content posting, browser automation, payouts, bank movement, or payment actions",
      "Routing growth budget to kill-lane, blocked, or signal-empty stores before review"
    ],
    candidates,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "100 Store Growth Allocation Router",
    providerContacted: false,
    summary: `${candidates.length}/${input.options.targetStores} stores evaluated for advisory Ad/Growth routing: ${laneCount("paid_scale_review")} paid-scale review, ${laneCount("organic_first")} organic-first, ${laneCount("defensive_hold")} defensive hold, and ${laneCount("watch")} watch. ${retainedForDefensePercent}% of the 25% Ad/Growth bucket remains unrouted or defensive. External execution is locked.`,
    totals: {
      advisoryOnly: true,
      averageKillPressure,
      averageScalePressure,
      candidates: candidates.length,
      defensiveHold: laneCount("defensive_hold"),
      organicFirst: laneCount("organic_first"),
      paidScaleReview: laneCount("paid_scale_review"),
      retainedForDefensePercent,
      routedAdGrowthPercent,
      storesCovered: input.monitoringMatrix.totals.storesCovered,
      totalAllocationWeight,
      watch: laneCount("watch")
    }
  };
}

const hundredStoreProductTypeFallbacks = [
  "premium graphic tee",
  "oversized hoodie",
  "embroidered cap",
  "wall poster",
  "sticker pack",
  "tote bag",
  "phone case",
  "coffee mug"
];

function productDepthProductType(input: {
  business?: RevenueBusinessFleetBusiness;
  seed?: RevenueBusinessFleetOpportunitySeed;
  index: number;
}) {
  const seedType = input.seed?.productTypes[input.index % Math.max(input.seed.productTypes.length, 1)];
  const assetType = input.business?.topAsset?.assetType === "product" ? "hero product variant" : null;

  return seedType ?? assetType ?? hundredStoreProductTypeFallbacks[input.index % hundredStoreProductTypeFallbacks.length] ?? "POD product";
}

function productDepthConceptTitle(input: {
  businessName: string;
  index: number;
  productType: string;
}) {
  const angle = [
    "founder edition",
    "daily discipline",
    "quiet flex",
    "first drop",
    "community signal",
    "evergreen core"
  ][input.index % 6];

  return `${input.businessName} ${angle} ${input.productType}`;
}

function productDepthDraft(input: Omit<RevenueHundredStoreProductDepthDraft, "approvalChecklist" | "externalExecution" | "providerContacted">): RevenueHundredStoreProductDepthDraft {
  return {
    ...input,
    approvalChecklist: [
      "Confirm product concept fits store audience and brand voice.",
      "Approve design prompt before generating or uploading any asset.",
      "Approve supplier, pricing, mockup, and listing copy before external provider work.",
      "Keep ad spend, uploads, marketplace publishing, browser automation, and payment actions locked."
    ],
    externalExecution: false,
    providerContacted: false
  };
}

function buildRevenueHundredStoreProductDepthQueue(input: {
  controlGrid: RevenueHundredStoreControlGrid;
  gapPlan: RevenueBusinessFleetLaunchGapPlan;
  generatedAt?: string;
  options: RevenueHundredStoreOperationsOptions;
  plan: RevenueBusinessFleetPlan;
  productDraftDeficit: number;
  storeGap: number;
}): RevenueHundredStoreProductDepthQueue {
  const businessesById = new Map(input.plan.businesses.map((business) => [business.businessId, business]));
  const existingDrafts = input.controlGrid.stores
    .map((store) => {
      const business = businessesById.get(store.businessId);
      const missingProducts = Math.max(0, input.options.minProductsPerStore - store.productAssets);

      return {
        business,
        missingProducts,
        store
      };
    })
    .filter((item) => item.missingProducts > 0)
    .sort((left, right) => (
      right.missingProducts - left.missingProducts
      || right.store.score.scalePressure - left.store.score.scalePressure
      || right.store.score.finalRank - left.store.score.finalRank
      || left.store.businessName.localeCompare(right.store.businessName)
    ))
    .flatMap((item) => Array.from({ length: item.missingProducts }, (_, index) => {
      const productType = productDepthProductType({
        business: item.business,
        index
      });
      const title = productDepthConceptTitle({
        businessName: item.store.businessName,
        index,
        productType
      });

      return productDepthDraft({
        contentTieIn: `Faceless short showing the product angle as a ${item.store.businessName} identity cue.`,
        currentProducts: item.store.productAssets,
        designPrompt: `Create a clean POD-ready ${productType} design for ${item.store.businessName}; bold readable motif, limited colors, no trademarked text, no copyrighted characters.`,
        draftId: `product-depth:${item.store.businessId}:${index + 1}`,
        facelessHook: `POV: ${item.store.businessName} customers spot the ${productType} before everyone else.`,
        lane: item.store.lane,
        listingAngle: `Evergreen ${productType} positioned around ${item.store.businessName}'s core audience and repeatable organic hooks.`,
        missingProducts: item.missingProducts,
        organicMove: "Queue one short-form organic test, one product-pin image, and one manual performance snapshot slot.",
        priority: 100 + item.store.score.scalePressure - item.store.score.killPressure - index,
        productType,
        requiredProducts: input.options.minProductsPerStore,
        shardId: item.store.shardId,
        status: item.store.qualityStatus === "block" ? "blocked_by_quality" : "ready_for_internal_draft",
        storeId: item.store.businessId,
        storeName: item.store.businessName,
        title
      });
    }));
  const futureDraftsNeeded = Math.max(0, input.storeGap * input.options.minProductsPerStore);
  const futureDrafts = Array.from({ length: futureDraftsNeeded }, (_, index) => {
    const storeSlot = Math.floor(index / input.options.minProductsPerStore) + 1;
    const productIndex = index % input.options.minProductsPerStore;
    const seed = input.gapPlan.opportunitySeeds[index % Math.max(input.gapPlan.opportunitySeeds.length, 1)];
    const seedName = seed?.businessName ?? `Future Store Slot ${storeSlot}`;
    const productType = productDepthProductType({
      index: productIndex,
      seed
    });
    const title = productDepthConceptTitle({
      businessName: seedName,
      index: productIndex,
      productType
    });

    return productDepthDraft({
      contentTieIn: `Faceless launch teaser for ${seedName} built around the ${productType} first-drop angle.`,
      currentProducts: 0,
      designPrompt: `Create a reusable POD-ready ${productType} concept for ${seedName}; original text or abstract motif only, no protected brands, no provider upload.`,
      draftId: `product-depth:future-slot-${storeSlot}:${productIndex + 1}`,
      facelessHook: `The first ${seedName} drop starts with a ${productType} people can understand in three seconds.`,
      lane: "future_store_slot",
      listingAngle: seed?.idea ?? `Future ${seedName} launch concept prepared for organic-first validation.`,
      missingProducts: input.options.minProductsPerStore,
      organicMove: "Prepare launch caption, three organic hooks, and a manual signal row before provider work.",
      priority: 50 - productIndex,
      productType,
      requiredProducts: input.options.minProductsPerStore,
      shardId: `future_shard_${String(((storeSlot - 1) % Math.max(input.controlGrid.totals.configuredShards, 1)) + 1).padStart(3, "0")}`,
      status: "waiting_for_store_shell",
      storeId: null,
      storeName: seedName,
      title
    });
  });
  const drafts = [...existingDrafts, ...futureDrafts]
    .sort((left, right) => (
      right.priority - left.priority
      || left.storeName.localeCompare(right.storeName)
      || left.title.localeCompare(right.title)
    ));
  const statusCount = (status: RevenueHundredStoreProductDepthDraftStatus) => drafts.filter((draft) => draft.status === status).length;
  const currentStoreDrafts = drafts.filter((draft) => draft.storeId).length;
  const futureStoreDrafts = drafts.length - currentStoreDrafts;
  const readyDrafts = statusCount("ready_for_internal_draft");
  const waitingDrafts = statusCount("waiting_for_store_shell");
  const blockedDrafts = statusCount("blocked_by_quality");
  const storesCovered = new Set(drafts.map((draft) => draft.storeId ?? draft.storeName)).size;

  return {
    auditEvents: [
      "100 Store Product Depth Queue prepared deterministic internal product draft packets for current under-depth stores and future store slots.",
      "Draft packets include concept, prompt, listing angle, faceless hook, organic move, and approval checklist only.",
      "No AI image generation, supplier lookup, provider write, upload, marketplace publishing, browser automation, payment, payout, bank, or ad spend action is executed."
    ],
    blockedExternalActions: [
      "Generating images, uploading products, choosing suppliers, publishing listings, posting content, running ads, opening browsers, charging cards, moving payouts, or contacting providers from product-depth queue records",
      "Treating future-store-slot drafts as live listings before a store shell and owner approval exist",
      "Skipping design, supplier, price, mockup, listing, and compliance approval before external provider work"
    ],
    drafts,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "100 Store Product Depth Queue",
    providerContacted: false,
    summary: `${drafts.length} internal product-depth draft packet${drafts.length === 1 ? "" : "s"} prepared for the 100-store floor: ${readyDrafts} ready for current stores, ${waitingDrafts} waiting for future store shells, and ${blockedDrafts} blocked by quality. External execution remains locked.`,
    totals: {
      blockedDrafts,
      currentStoreDrafts,
      drafts: drafts.length,
      futureStoreDrafts,
      maxSelectableDrafts: Math.min(input.options.safeBatchSize, drafts.length),
      productDraftDeficit: input.productDraftDeficit,
      readyDrafts,
      storesCovered,
      targetStores: input.options.targetStores,
      waitingDrafts
    }
  };
}

function launchPacketApprovalChecklist(status: RevenueHundredStoreLaunchPacketStatus) {
  const base = [
    "Review store shell, product depth, application packets, faceless hooks, and organic moves.",
    "Confirm no provider, marketplace, browser, upload, ad spend, payment, payout, bank, or publishing action is authorized by this packet.",
    "Approve supplier, pricing, mockup, listing copy, connector setup, and launch timing before external execution can exist."
  ];

  if (status === "ready_for_internal_launch_review") {
    return [
      ...base,
      "Owner can move this packet into manual/semi-automated launch preparation after separate approval gates are satisfied."
    ];
  }

  if (status === "waiting_for_store_shell") {
    return [
      ...base,
      "Create or approve the store shell before this future-slot packet can become a live launch candidate."
    ];
  }

  return [
    ...base,
    "Clear the packet blocker before launch review."
  ];
}

function launchPacketStatus(input: {
  applicationPacketCount: number;
  currentProducts: number;
  missingApplicationRoles: string[];
  productDraftCount: number;
  qualityStatus?: RevenueBusinessFleetQualityStatus;
  storeId: string | null;
  requiredProducts: number;
}): RevenueHundredStoreLaunchPacketStatus {
  if (input.qualityStatus === "block") return "blocked_by_quality";
  if (!input.storeId) return "waiting_for_store_shell";
  if (input.missingApplicationRoles.length > 0 || input.applicationPacketCount < hundredStoreApplicationRequirements.length) return "needs_application_packets";
  if (input.currentProducts + input.productDraftCount < input.requiredProducts) return "needs_product_depth";

  return "ready_for_internal_launch_review";
}

function launchPacketReadinessScore(status: RevenueHundredStoreLaunchPacketStatus, input: {
  applicationPacketCount: number;
  currentProducts: number;
  productDraftCount: number;
  requiredProducts: number;
}) {
  const applicationScore = clamp(Math.round((input.applicationPacketCount / hundredStoreApplicationRequirements.length) * 45), 0, 45);
  const productScore = clamp(Math.round(((input.currentProducts + input.productDraftCount) / input.requiredProducts) * 35), 0, 35);
  const statusScore = status === "ready_for_internal_launch_review"
    ? 20
    : status === "waiting_for_store_shell"
      ? 10
      : status === "blocked_by_quality"
        ? 0
        : 5;

  return clamp(applicationScore + productScore + statusScore, 0, 100);
}

function futureSlotFromDraftId(draftId: string) {
  const match = draftId.match(/^product-depth:future-slot-(\d+):/);

  return match?.[1] ? Number.parseInt(match[1], 10) : null;
}

function buildRevenueHundredStoreLaunchPacketQueue(input: {
  applicationConnectionWorkbench: RevenueHundredStoreApplicationConnectionWorkbench;
  controlGrid: RevenueHundredStoreControlGrid;
  generatedAt?: string;
  growthAllocationRouter: RevenueHundredStoreGrowthAllocationRouter;
  options: RevenueHundredStoreOperationsOptions;
  productDepthQueue: RevenueHundredStoreProductDepthQueue;
  storeGap: number;
}): RevenueHundredStoreLaunchPacketQueue {
  const appPacketsByStore = new Map<string, RevenueHundredStoreApplicationConnectionPacket[]>();
  for (const packet of input.applicationConnectionWorkbench.packets) {
    if (!packet.storeId) continue;
    const current = appPacketsByStore.get(packet.storeId) ?? [];
    current.push(packet);
    appPacketsByStore.set(packet.storeId, current);
  }
  const productDraftsByStore = new Map<string, RevenueHundredStoreProductDepthDraft[]>();
  const futureDraftsBySlot = new Map<number, RevenueHundredStoreProductDepthDraft[]>();
  for (const draft of input.productDepthQueue.drafts) {
    if (draft.storeId) {
      const current = productDraftsByStore.get(draft.storeId) ?? [];
      current.push(draft);
      productDraftsByStore.set(draft.storeId, current);
      continue;
    }

    const slot = futureSlotFromDraftId(draft.draftId);
    if (slot) {
      const current = futureDraftsBySlot.get(slot) ?? [];
      current.push(draft);
      futureDraftsBySlot.set(slot, current);
    }
  }
  const growthByStore = new Map(input.growthAllocationRouter.candidates.map((candidate) => [candidate.businessId, candidate]));
  const requiredRoles = hundredStoreApplicationRequirements.map((requirement) => requirement.role);
  const currentPackets = input.controlGrid.stores.map((store) => {
    const appPackets = appPacketsByStore.get(store.businessId) ?? [];
    const packetRoles = new Set(appPackets.map((packet) => packet.role));
    const missingApplicationRoles = requiredRoles.filter((role) => !packetRoles.has(role));
    const productDrafts = productDraftsByStore.get(store.businessId) ?? [];
    const status = launchPacketStatus({
      applicationPacketCount: appPackets.length,
      currentProducts: store.productAssets,
      missingApplicationRoles,
      productDraftCount: productDrafts.length,
      qualityStatus: store.qualityStatus,
      requiredProducts: input.options.minProductsPerStore,
      storeId: store.businessId
    });
    const growth = growthByStore.get(store.businessId);
    const readinessScore = launchPacketReadinessScore(status, {
      applicationPacketCount: appPackets.length,
      currentProducts: store.productAssets,
      productDraftCount: productDrafts.length,
      requiredProducts: input.options.minProductsPerStore
    });

    return {
      applicationPacketCount: appPackets.length,
      approvalChecklist: launchPacketApprovalChecklist(status),
      contentIdeas: productDrafts.slice(0, 3).map((draft) => draft.facelessHook),
      currentProducts: store.productAssets,
      externalExecution: false as const,
      growthLane: (growth?.allocationLane ?? "unrouted") as RevenueHundredStoreLaunchPacket["growthLane"],
      launchPacketId: `launch-packet:${store.businessId}`,
      missingApplicationRoles,
      organicMoves: [
        ...productDrafts.slice(0, 2).map((draft) => draft.organicMove),
        growth?.nextInternalAction ?? "Capture manual launch signals before growth allocation."
      ],
      priority: store.queuePosition + readinessScore,
      productDraftCount: productDrafts.length,
      providerContacted: false as const,
      readinessScore,
      requiredApplicationRoles: hundredStoreApplicationRequirements.length,
      requiredProducts: input.options.minProductsPerStore,
      shardId: store.shardId,
      status,
      storeId: store.businessId,
      storeName: store.businessName,
      summary: `${store.businessName} launch packet is ${status.replace(/_/g, " ")} with ${appPackets.length}/${hundredStoreApplicationRequirements.length} app packets and ${store.productAssets + productDrafts.length}/${input.options.minProductsPerStore} product depth.`
    };
  });
  const futurePackets = Array.from({ length: input.storeGap }, (_, index) => {
    const slot = index + 1;
    const productDrafts = futureDraftsBySlot.get(slot) ?? [];
    const appTemplateCount = Math.min(
      hundredStoreApplicationRequirements.length,
      Math.floor(input.applicationConnectionWorkbench.totals.futureStoreTemplates / Math.max(input.storeGap, 1))
    );
    const missingApplicationRoles = appTemplateCount >= hundredStoreApplicationRequirements.length
      ? []
      : requiredRoles.slice(appTemplateCount);
    const storeName = productDrafts[0]?.storeName ?? `Future Store Slot ${slot}`;
    const status = launchPacketStatus({
      applicationPacketCount: appTemplateCount,
      currentProducts: 0,
      missingApplicationRoles,
      productDraftCount: productDrafts.length,
      requiredProducts: input.options.minProductsPerStore,
      storeId: null
    });
    const readinessScore = launchPacketReadinessScore(status, {
      applicationPacketCount: appTemplateCount,
      currentProducts: 0,
      productDraftCount: productDrafts.length,
      requiredProducts: input.options.minProductsPerStore
    });

    return {
      applicationPacketCount: appTemplateCount,
      approvalChecklist: launchPacketApprovalChecklist(status),
      contentIdeas: productDrafts.slice(0, 3).map((draft) => draft.facelessHook),
      currentProducts: 0,
      externalExecution: false as const,
      growthLane: "unrouted" as const,
      launchPacketId: `launch-packet:future-slot-${slot}`,
      missingApplicationRoles,
      organicMoves: productDrafts.slice(0, 2).map((draft) => draft.organicMove),
      priority: 50 + readinessScore - index,
      productDraftCount: productDrafts.length,
      providerContacted: false as const,
      readinessScore,
      requiredApplicationRoles: hundredStoreApplicationRequirements.length,
      requiredProducts: input.options.minProductsPerStore,
      shardId: `future_shard_${String((index % Math.max(input.controlGrid.totals.configuredShards, 1)) + 1).padStart(3, "0")}`,
      status,
      storeId: null,
      storeName,
      summary: `${storeName} future launch packet is ${status.replace(/_/g, " ")} with ${appTemplateCount}/${hundredStoreApplicationRequirements.length} app templates and ${productDrafts.length}/${input.options.minProductsPerStore} planned product drafts.`
    };
  });
  const packets = [...currentPackets, ...futurePackets]
    .sort((left, right) => (
      right.readinessScore - left.readinessScore
      || right.priority - left.priority
      || left.storeName.localeCompare(right.storeName)
    ));
  const statusCount = (status: RevenueHundredStoreLaunchPacketStatus) => packets.filter((packet) => packet.status === status).length;

  return {
    auditEvents: [
      "100 Store Launch Packet Queue assembled store readiness, application packets/templates, product-depth drafts, faceless hooks, organic moves, and growth lanes into per-store internal review packets.",
      "Launch packets are private preparation artifacts and do not publish listings, upload products, contact providers, open browsers, post content, run ads, move payments, move payouts, or execute external writes.",
      "Future-slot packets keep the 100-store floor planned before all store shells exist."
    ],
    blockedExternalActions: [
      "Treating launch packets as live marketplace listings, provider uploads, browser automation, ad launches, social posts, payment actions, payouts, bank movement, or external write execution",
      "Launching future-slot packets before store shells, connector approvals, supplier/pricing approval, and owner launch approval exist",
      "Bypassing the per-packet approval checklist before any manual or semi-automated live execution"
    ],
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "100 Store Launch Packet Queue",
    packets,
    providerContacted: false,
    summary: `${packets.length}/${input.options.targetStores} launch packet${packets.length === 1 ? "" : "s"} assembled: ${statusCount("ready_for_internal_launch_review")} ready for internal launch review, ${statusCount("waiting_for_store_shell")} waiting for store shells, ${statusCount("needs_application_packets")} need application packets, ${statusCount("needs_product_depth")} need product depth, and ${statusCount("blocked_by_quality")} blocked by quality. External execution remains locked.`,
    totals: {
      blockedByQuality: statusCount("blocked_by_quality"),
      currentStorePackets: currentPackets.length,
      futureStorePackets: futurePackets.length,
      maxSelectablePackets: Math.min(input.options.safeBatchSize, packets.length),
      needsApplicationPackets: statusCount("needs_application_packets"),
      needsProductDepth: statusCount("needs_product_depth"),
      packets: packets.length,
      readyForReview: statusCount("ready_for_internal_launch_review"),
      targetStores: input.options.targetStores,
      waitingForStoreShell: statusCount("waiting_for_store_shell")
    }
  };
}

const hundredStoreAutonomyBlockedExternalActions = [
  "Provider account creation, OAuth authorization, credential exchange, API writes, uploads, marketplace publishing, browser automation, social posting, ad spend, payment actions, payout actions, bank movement, or supplier contact",
  "Treating ready internal jobs as permission to execute outside ENTRAL without a separate owner approval gate",
  "Running paid growth, public launch, supplier selection, or payment movement from an autonomy queue record"
];

function autonomyJob(input: Omit<RevenueHundredStoreAutonomyJob, "externalExecution" | "providerContacted">): RevenueHundredStoreAutonomyJob {
  return {
    ...input,
    externalExecution: false,
    providerContacted: false
  };
}

function autonomyStatusForLaunchPacket(status: RevenueHundredStoreLaunchPacketStatus): RevenueHundredStoreAutonomyJobStatus {
  if (status === "ready_for_internal_launch_review") return "approval_required";
  if (status === "blocked_by_quality") return "blocked";

  return "waiting";
}

function autonomyStatusForMonitoringItem(item: RevenueHundredStoreMonitoringItem): RevenueHundredStoreAutonomyJobStatus {
  if (item.signalStatus === "rotation_review_required" || item.signalStatus === "scale_review_required") return "approval_required";
  if (item.signalStatus === "needs_readonly_import") return "approval_required";

  return "ready_internal";
}

function autonomyStatusForGrowthCandidate(candidate: RevenueHundredStoreGrowthAllocationCandidate): RevenueHundredStoreAutonomyJobStatus {
  if (candidate.allocationLane === "paid_scale_review" || candidate.allocationLane === "defensive_hold") return "approval_required";

  return "ready_internal";
}

function countCleanParallelAutonomyJobs(input: {
  jobs: RevenueHundredStoreAutonomyJob[];
  maxJobsPerShard: number;
}) {
  const shardCounts = new Map<string, number>();
  let cleanJobs = 0;

  for (const job of input.jobs) {
    if (job.status !== "ready_internal") continue;

    const current = shardCounts.get(job.shardId) ?? 0;
    if (current >= input.maxJobsPerShard) continue;

    shardCounts.set(job.shardId, current + 1);
    cleanJobs += 1;
  }

  return cleanJobs;
}

function buildRevenueHundredStoreAutonomyRunQueue(input: {
  applicationConnectionWorkbench: RevenueHundredStoreApplicationConnectionWorkbench;
  connectorActivationMatrix: RevenueHundredStoreConnectorActivationMatrix;
  controlGrid: RevenueHundredStoreControlGrid;
  gapPlan: RevenueBusinessFleetLaunchGapPlan;
  generatedAt?: string;
  growthAllocationRouter: RevenueHundredStoreGrowthAllocationRouter;
  launchPacketQueue: RevenueHundredStoreLaunchPacketQueue;
  monitoringMatrix: RevenueHundredStoreMonitoringMatrix;
  options: RevenueHundredStoreOperationsOptions;
  productDepthQueue: RevenueHundredStoreProductDepthQueue;
}): RevenueHundredStoreAutonomyRunQueue {
  const storeShellJobs = input.gapPlan.opportunitySeeds.slice(0, input.options.safeBatchSize).map((seed, index) => autonomyJob({
    approvalGate: "Internal store shell creation only; separate provider and public launch approval required.",
    blockedExternalActions: hundredStoreAutonomyBlockedExternalActions,
    expectedInternalEffect: `Prepare a private store shell record for ${seed.businessName} with ${seed.productCount} planned product concepts.`,
    jobId: `autonomy:store-shell:${seed.sourceKey}`,
    jobType: "prepare_store_shell",
    priority: 95 - index,
    requiresOwnerApproval: false,
    shardId: `future_shard_${String((index % Math.max(input.controlGrid.totals.configuredShards, 1)) + 1).padStart(3, "0")}`,
    sourceId: seed.sourceKey,
    sourceModule: "Revenue Business Fleet Launch Gap Planner",
    status: "ready_internal",
    storeId: null,
    storeName: seed.businessName,
    summary: `${seed.businessName} can be prepared as an internal store shell with no provider, marketplace, browser, ad, or payment action.`
  }));
  const appPacketJobs = input.applicationConnectionWorkbench.packets.map((packet, index) => autonomyJob({
    approvalGate: "Owner must approve credential custody, read-only scopes, rollback owner, and connector design before live connection.",
    blockedExternalActions: hundredStoreAutonomyBlockedExternalActions,
    expectedInternalEffect: `Record ${packet.title} readiness packet for ${packet.storeName}.`,
    jobId: `autonomy:app-packet:${packet.storeId ?? packet.storeName}:${packet.role}`,
    jobType: "record_app_connection_packet",
    priority: packet.setupStatus === "ready_for_internal_packet" ? 85 - index : 30 - index,
    requiresOwnerApproval: packet.setupStatus === "ready_for_internal_packet",
    shardId: packet.shardId,
    sourceId: `${packet.storeId ?? packet.storeName}:${packet.role}`,
    sourceModule: "100 Store Application Connection Workbench",
    status: packet.setupStatus === "ready_for_internal_packet"
      ? "approval_required"
      : packet.setupStatus === "already_mapped" ? "waiting" : "blocked",
    storeId: packet.storeId,
    storeName: packet.storeName,
    summary: `${packet.storeName} ${packet.role} packet is ${packet.setupStatus.replace(/_/g, " ")}.`
  }));
  const connectorActivationJobs = input.connectorActivationMatrix.rows.map((row, index) => autonomyJob({
    approvalGate: row.status === "ready_for_connection_design"
      ? "Internal connector design row only; provider contact and live credentials remain locked."
      : row.status === "credential_custody_required"
        ? "Owner must approve credential custody, env-var ownership, read-only scope, dry-run map, and rollback rehearsal before connection."
        : row.status === "waiting_for_store_shell"
          ? "Create or approve the store shell before connector activation can advance."
          : "Clear store quality blocker before connector activation can advance.",
    blockedExternalActions: hundredStoreAutonomyBlockedExternalActions,
    expectedInternalEffect: `Record connector activation readiness for ${row.storeName} ${row.role}.`,
    jobId: `autonomy:connector-activation:${row.rowId}`,
    jobType: "record_connector_activation_row",
    priority: row.readinessScore + 15 - Math.floor(index / Math.max(input.options.safeBatchSize, 1)),
    requiresOwnerApproval: row.status === "credential_custody_required",
    shardId: row.shardId,
    sourceId: row.rowId,
    sourceModule: "100 Store Connector Activation Matrix",
    status: row.status === "ready_for_connection_design"
      ? "ready_internal"
      : row.status === "credential_custody_required"
        ? "approval_required"
        : row.status === "waiting_for_store_shell" ? "waiting" : "blocked",
    storeId: row.storeId,
    storeName: row.storeName,
    summary: `${row.storeName} ${row.role} connector activation is ${row.status.replace(/_/g, " ")} with ${row.readOnlyScopes.length} read-only scope${row.readOnlyScopes.length === 1 ? "" : "s"} and ${row.writeScopesBlocked.length} blocked write scope${row.writeScopesBlocked.length === 1 ? "" : "s"}.`
  }));
  const productDraftJobs = input.productDepthQueue.drafts.map((draft, index) => autonomyJob({
    approvalGate: "Internal product concept only; separate design, supplier, pricing, mockup, listing, and provider approval required.",
    blockedExternalActions: hundredStoreAutonomyBlockedExternalActions,
    expectedInternalEffect: `Record product-depth draft ${draft.title} for ${draft.storeName}.`,
    jobId: `autonomy:product-depth:${draft.draftId}`,
    jobType: "record_product_depth_draft",
    priority: draft.priority + 20 - Math.floor(index / Math.max(input.options.safeBatchSize, 1)),
    requiresOwnerApproval: false,
    shardId: draft.shardId,
    sourceId: draft.draftId,
    sourceModule: "100 Store Product Depth Queue",
    status: draft.status === "ready_for_internal_draft"
      ? "ready_internal"
      : draft.status === "waiting_for_store_shell" ? "waiting" : "blocked",
    storeId: draft.storeId,
    storeName: draft.storeName,
    summary: `${draft.storeName} product-depth draft ${draft.title} is ${draft.status.replace(/_/g, " ")}.`
  }));
  const launchPacketJobs = input.launchPacketQueue.packets.map((packet, index) => autonomyJob({
    approvalGate: "Owner must approve the launch packet before manual or semi-automated external execution can be prepared.",
    blockedExternalActions: hundredStoreAutonomyBlockedExternalActions,
    expectedInternalEffect: `Record launch packet review bundle for ${packet.storeName}.`,
    jobId: `autonomy:launch-packet:${packet.launchPacketId}`,
    jobType: "record_launch_packet",
    priority: packet.readinessScore + 10 - Math.floor(index / Math.max(input.options.safeBatchSize, 1)),
    requiresOwnerApproval: packet.status === "ready_for_internal_launch_review",
    shardId: packet.shardId,
    sourceId: packet.launchPacketId,
    sourceModule: "100 Store Launch Packet Queue",
    status: autonomyStatusForLaunchPacket(packet.status),
    storeId: packet.storeId,
    storeName: packet.storeName,
    summary: packet.summary
  }));
  const monitoringJobs = input.monitoringMatrix.items.map((item, index) => {
    const status = autonomyStatusForMonitoringItem(item);

    return autonomyJob({
      approvalGate: status === "ready_internal"
        ? "Internal monitoring evidence record only; read-only import/write scopes remain locked."
        : "Owner must approve connector import or rotation/scale review before the decision affects live operations.",
      blockedExternalActions: hundredStoreAutonomyBlockedExternalActions,
      expectedInternalEffect: `Record monitoring evidence requirement for ${item.businessName}.`,
      jobId: `autonomy:monitoring:${item.businessId}:${item.signalStatus}`,
      jobType: "record_monitoring_evidence",
      priority: item.priority,
      requiresOwnerApproval: status === "approval_required",
      shardId: item.shardId,
      sourceId: `${item.businessId}:${item.signalStatus}`,
      sourceModule: "100 Store Monitoring Matrix",
      status,
      storeId: item.businessId,
      storeName: item.businessName,
      summary: item.triggerReason
    });
  });
  const growthJobs = input.growthAllocationRouter.candidates.map((candidate, index) => {
    const status = autonomyStatusForGrowthCandidate(candidate);

    return autonomyJob({
      approvalGate: status === "ready_internal"
        ? "Ad/Growth allocation is advisory and organic-first; no spend approval is implied."
        : "Owner must approve paid scale, defensive hold, or rotation release before any budget/action changes.",
      blockedExternalActions: hundredStoreAutonomyBlockedExternalActions,
      expectedInternalEffect: `Record advisory growth allocation route for ${candidate.businessName}.`,
      jobId: `autonomy:growth:${candidate.businessId}:${candidate.allocationLane}`,
      jobType: "review_growth_allocation",
      priority: candidate.priority - Math.floor(index / Math.max(input.options.safeBatchSize, 1)),
      requiresOwnerApproval: status === "approval_required",
      shardId: candidate.shardId,
      sourceId: `${candidate.businessId}:${candidate.allocationLane}`,
      sourceModule: "100 Store Growth Allocation Router",
      status,
      storeId: candidate.businessId,
      storeName: candidate.businessName,
      summary: candidate.reason
    });
  });
  const rotationJobs = input.controlGrid.stores
    .filter((store) => store.lane === "kill" || store.lane === "quality_repair" || store.lane === "throttle" || store.score.killPressure >= 70)
    .map((store, index) => autonomyJob({
      approvalGate: "Pause, kill, or repair decisions require owner-visible rotation review before live action changes.",
      blockedExternalActions: hundredStoreAutonomyBlockedExternalActions,
      expectedInternalEffect: `Queue internal rotation review for ${store.businessName}.`,
      jobId: `autonomy:rotation:${store.businessId}`,
      jobType: "review_rotation",
      priority: 90 + store.score.killPressure - index,
      requiresOwnerApproval: true,
      shardId: store.shardId,
      sourceId: store.businessId,
      sourceModule: "100 Store Operating Control Grid",
      status: store.qualityStatus === "block" || store.scheduleState === "blocked" ? "blocked" : "approval_required",
      storeId: store.businessId,
      storeName: store.businessName,
      summary: `${store.businessName} needs rotation review with kill pressure ${store.score.killPressure}/100.`
    }));
  const jobs = [
    ...storeShellJobs,
    ...monitoringJobs,
    ...growthJobs,
    ...connectorActivationJobs,
    ...productDraftJobs,
    ...launchPacketJobs,
    ...appPacketJobs,
    ...rotationJobs
  ].sort((left, right) => (
    right.priority - left.priority
    || left.status.localeCompare(right.status)
    || left.storeName.localeCompare(right.storeName)
    || left.jobType.localeCompare(right.jobType)
  ));
  const statusCount = (status: RevenueHundredStoreAutonomyJobStatus) => jobs.filter((job) => job.status === status).length;
  const maxJobsPerShard = Math.max(1, Math.ceil(input.options.safeBatchSize / Math.max(input.controlGrid.totals.configuredShards, 1)));
  const cleanParallelJobs = countCleanParallelAutonomyJobs({
    jobs,
    maxJobsPerShard
  });

  return {
    auditEvents: [
      "100 Store Autonomy Run Queue converted store shells, monitoring evidence, growth routing, connector activation rows, product-depth drafts, launch packets, connector packets, and rotation reviews into bounded internal jobs.",
      "The queue separates ready internal work from owner-approval, waiting, and blocked lanes so ENTRAL can do the maximum private work without touching live systems.",
      "Jobs are internal records only and do not contact providers, open browsers, upload products, publish listings, post content, run ads, move payments, move payouts, or execute marketplace actions."
    ],
    blockedExternalActions: hundredStoreAutonomyBlockedExternalActions,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    jobs,
    mode: "100 Store Autonomy Run Queue",
    providerContacted: false,
    summary: `${jobs.length} internal autonomy job${jobs.length === 1 ? "" : "s"} queued for the ${input.options.targetStores}-store floor: ${statusCount("ready_internal")} ready internal, ${statusCount("approval_required")} approval-required, ${statusCount("waiting")} waiting, ${statusCount("blocked")} blocked, and ${cleanParallelJobs} clean parallel job${cleanParallelJobs === 1 ? "" : "s"} can run within shard caps. External execution remains locked.`,
    totals: {
      approvalRequired: statusCount("approval_required"),
      blocked: statusCount("blocked"),
      cleanParallelJobs,
      jobs: jobs.length,
      maxJobsPerShard,
      maxSelectableJobs: Math.min(input.options.safeBatchSize, jobs.length),
      readyInternal: statusCount("ready_internal"),
      shardCount: input.controlGrid.totals.configuredShards,
      storesCovered: new Set(jobs.map((job) => job.storeId ?? job.storeName)).size,
      targetStores: input.options.targetStores,
      waiting: statusCount("waiting")
    }
  };
}

const hundredStoreWorkLeaseBlockedExternalActions = [
  ...hundredStoreAutonomyBlockedExternalActions,
  "Claiming the same dedupe key more than once in a single internal work cycle",
  "Extending an expired lease into live provider, marketplace, ad, social, browser, upload, payment, payout, bank, or external API execution",
  "Using a work lease as proof of credential custody, supplier selection, payment authorization, or public launch approval"
];

function workLeaseStatusForJob(status: RevenueHundredStoreAutonomyJobStatus): RevenueHundredStoreWorkLeaseStatus {
  if (status === "ready_internal") return "ready_to_claim";
  if (status === "approval_required") return "approval_hold";
  if (status === "waiting") return "waiting_dependency";

  return "blocked";
}

function workLeaseDependenciesForJob(job: RevenueHundredStoreAutonomyJob) {
  if (job.jobType === "prepare_store_shell") return ["source_opportunity_seed", "store_shell_template"];
  if (job.jobType === "record_app_connection_packet") return ["application_role_packet", "credential_env_refs"];
  if (job.jobType === "record_connector_activation_row") return ["connector_activation_row", "dry_run_request_map", "write_scope_block"];
  if (job.jobType === "record_product_depth_draft") return job.storeId ? ["store_shell", "product_depth_target"] : ["future_store_shell", "product_depth_target"];
  if (job.jobType === "record_launch_packet") return ["store_shell", "connector_activation_matrix", "product_depth_queue", "owner_launch_review"];
  if (job.jobType === "record_monitoring_evidence") return ["manual_or_readonly_signal_source", "rotation_thresholds"];
  if (job.jobType === "review_growth_allocation") return ["scale_pressure", "kill_pressure", "financial_orchestrator_ad_growth_bucket"];
  if (job.jobType === "review_rotation") return ["quality_gate", "owner_rotation_review"];

  return ["internal_control_record"];
}

function countCleanParallelWorkLeases(input: {
  leases: RevenueHundredStoreWorkLease[];
  maxLeasesPerShard: number;
}) {
  const shardCounts = new Map<string, number>();
  const claimedDedupeKeys = new Set<string>();
  let cleanLeases = 0;

  for (const lease of input.leases) {
    if (lease.status !== "ready_to_claim") continue;
    if (claimedDedupeKeys.has(lease.dedupeKey)) continue;

    const current = shardCounts.get(lease.shardId) ?? 0;
    if (current >= input.maxLeasesPerShard) continue;

    claimedDedupeKeys.add(lease.dedupeKey);
    shardCounts.set(lease.shardId, current + 1);
    cleanLeases += 1;
  }

  return cleanLeases;
}

function buildRevenueHundredStoreWorkLeasePlan(input: {
  autonomyRunQueue: RevenueHundredStoreAutonomyRunQueue;
  controlGrid: RevenueHundredStoreControlGrid;
  generatedAt?: string;
  options: RevenueHundredStoreOperationsOptions;
}): RevenueHundredStoreWorkLeasePlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const claimWindowMinutes = 45;
  const expiresAt = new Date(Date.parse(generatedAt) + claimWindowMinutes * 60_000).toISOString();
  const maxLeasesPerShard = Math.max(1, Math.ceil(input.options.safeBatchSize / Math.max(input.controlGrid.totals.configuredShards, 1)));
  const leases = input.autonomyRunQueue.jobs.map((job) => {
    const dedupeKey = `${job.storeId ?? job.storeName}:${job.jobType}:${job.sourceId}`;
    const idempotencyKey = createHash("sha1").update(`100-store-work-lease:${job.jobId}:${dedupeKey}`).digest("hex").slice(0, 24);

    return {
      approvalGate: job.approvalGate,
      blockedExternalActions: hundredStoreWorkLeaseBlockedExternalActions,
      claimWindowMinutes,
      dedupeKey,
      dependencyRefs: workLeaseDependenciesForJob(job),
      expectedInternalEffect: job.expectedInternalEffect,
      expiresAt,
      externalExecution: false as const,
      idempotencyKey,
      jobId: job.jobId,
      jobType: job.jobType,
      leaseId: `lease:${idempotencyKey}`,
      priority: job.priority,
      providerContacted: false as const,
      retryPolicy: {
        backoffMinutes: job.status === "ready_internal" ? 15 : 60,
        maxAttempts: job.status === "blocked" ? 1 : 3,
        requiresFreshPlanAfterFailure: job.status !== "ready_internal"
      },
      shardId: job.shardId,
      sourceModule: job.sourceModule,
      status: workLeaseStatusForJob(job.status),
      storeId: job.storeId,
      storeName: job.storeName,
      summary: `${job.storeName} ${job.jobType.replace(/_/g, " ")} lease is ${workLeaseStatusForJob(job.status).replace(/_/g, " ")} with idempotency key ${idempotencyKey}.`
    };
  }).sort((left, right) => (
    right.priority - left.priority
    || left.status.localeCompare(right.status)
    || left.storeName.localeCompare(right.storeName)
    || left.jobType.localeCompare(right.jobType)
  ));
  const dedupeCounts = leases.reduce<Map<string, number>>((counts, lease) => {
    counts.set(lease.dedupeKey, (counts.get(lease.dedupeKey) ?? 0) + 1);
    return counts;
  }, new Map());
  const duplicateDedupeKeys = [...dedupeCounts.values()].filter((count) => count > 1).length;
  const statusCount = (status: RevenueHundredStoreWorkLeaseStatus) => leases.filter((lease) => lease.status === status).length;
  const queues = {
    approvalHold: leases.filter((lease) => lease.status === "approval_hold"),
    blocked: leases.filter((lease) => lease.status === "blocked"),
    readyToClaim: leases.filter((lease) => lease.status === "ready_to_claim"),
    waitingDependency: leases.filter((lease) => lease.status === "waiting_dependency")
  };
  const cleanParallelLeases = countCleanParallelWorkLeases({
    leases,
    maxLeasesPerShard
  });

  return {
    auditEvents: [
      "100 Store Internal Work Lease Plan converted autonomy jobs into deterministic, deduped, shard-capped claim records.",
      "Each lease is an internal claim/audit object only; it does not execute providers, marketplaces, browsers, uploads, ads, payments, payouts, banks, social channels, or external APIs.",
      "Ready leases can be claimed by the chain of command once per dedupe key; approval-hold, waiting, and blocked leases remain visible but not claimable."
    ],
    blockedExternalActions: hundredStoreWorkLeaseBlockedExternalActions,
    externalExecution: false,
    generatedAt,
    leases,
    mode: "100 Store Internal Work Lease Plan",
    providerContacted: false,
    queues,
    summary: `${leases.length} internal work lease${leases.length === 1 ? "" : "s"} prepared for ${input.options.targetStores}-store operations: ${statusCount("ready_to_claim")} ready to claim, ${statusCount("approval_hold")} approval-hold, ${statusCount("waiting_dependency")} waiting on dependencies, ${statusCount("blocked")} blocked, and ${cleanParallelLeases} can run cleanly within shard caps. External execution remains locked.`,
    totals: {
      approvalHold: statusCount("approval_hold"),
      blocked: statusCount("blocked"),
      claimWindowMinutes,
      cleanParallelLeases,
      duplicateDedupeKeys,
      leases: leases.length,
      maxLeasesPerShard,
      maxSelectableLeases: Math.min(input.options.safeBatchSize, leases.length),
      readyToClaim: statusCount("ready_to_claim"),
      shardCount: input.controlGrid.totals.configuredShards,
      storesCovered: new Set(leases.map((lease) => lease.storeId ?? lease.storeName)).size,
      targetStores: input.options.targetStores,
      waitingDependency: statusCount("waiting_dependency")
    }
  };
}

const hundredStoreWorkerAssignmentBlockedExternalActions = [
  ...hundredStoreWorkLeaseBlockedExternalActions,
  "Treating a worker assignment as permission to create provider accounts, upload products, publish listings, post content, run ads, move money, move payouts, use browsers, or call external APIs",
  "Assigning the same lease, dedupe key, or shard slot to multiple internal workers in one claim cycle",
  "Bypassing approval-hold, waiting-dependency, or blocked assignment state"
];

const hundredStoreWorkerLaneDefinitions: Array<{
  lane: RevenueHundredStoreWorkerLane;
  workerId: string;
  workerName: string;
  capacityRatio: number;
}> = [
  {
    capacityRatio: 0.2,
    lane: "store_builder",
    workerId: "chain-store-builder",
    workerName: "Store Builder Command"
  },
  {
    capacityRatio: 0.28,
    lane: "product_builder",
    workerId: "chain-product-builder",
    workerName: "Product Builder Command"
  },
  {
    capacityRatio: 0.24,
    lane: "connector_planner",
    workerId: "chain-connector-planner",
    workerName: "Connector Planner Command"
  },
  {
    capacityRatio: 0.16,
    lane: "launch_reviewer",
    workerId: "chain-launch-reviewer",
    workerName: "Launch Reviewer Command"
  },
  {
    capacityRatio: 0.12,
    lane: "monitoring_analyst",
    workerId: "chain-monitoring-analyst",
    workerName: "Monitoring Analyst Command"
  },
  {
    capacityRatio: 0.08,
    lane: "growth_allocator",
    workerId: "chain-growth-allocator",
    workerName: "Growth Allocation Command"
  },
  {
    capacityRatio: 0.08,
    lane: "rotation_reviewer",
    workerId: "chain-rotation-reviewer",
    workerName: "Rotation Review Command"
  }
];

function workerLaneForJobType(jobType: RevenueHundredStoreAutonomyJobType): RevenueHundredStoreWorkerLane {
  if (jobType === "prepare_store_shell") return "store_builder";
  if (jobType === "record_product_depth_draft") return "product_builder";
  if (jobType === "record_app_connection_packet" || jobType === "record_connector_activation_row") return "connector_planner";
  if (jobType === "record_launch_packet") return "launch_reviewer";
  if (jobType === "record_monitoring_evidence") return "monitoring_analyst";
  if (jobType === "review_growth_allocation") return "growth_allocator";

  return "rotation_reviewer";
}

function workerAssignmentStatusForLease(status: RevenueHundredStoreWorkLeaseStatus): RevenueHundredStoreWorkerAssignmentStatus {
  if (status === "ready_to_claim") return "ready_to_assign";
  if (status === "approval_hold") return "approval_hold";
  if (status === "waiting_dependency") return "waiting_dependency";

  return "blocked";
}

function workerLaneCapacity(input: {
  lane: RevenueHundredStoreWorkerLane;
  safeBatchSize: number;
}) {
  const definition = hundredStoreWorkerLaneDefinitions.find((item) => item.lane === input.lane);
  const ratio = definition?.capacityRatio ?? 0.1;

  return Math.max(1, Math.ceil(input.safeBatchSize * ratio));
}

function buildWorkerScaleCoverage(input: {
  approvalHoldAssignments: number;
  readyAssignments: number;
  safeBatchSize: number;
}): RevenueHundredStoreWorkerScaleCoverage[] {
  const targets: Array<RevenueHundredStoreWorkerScaleCoverage["targetStores"]> = [10, 25, 100];

  return targets.map((targetStores) => {
    const requiredReadyAssignments = Math.min(targetStores, input.safeBatchSize);
    const readyAssignments = Math.min(input.readyAssignments, requiredReadyAssignments);
    const readyCoveragePercent = percent(readyAssignments, requiredReadyAssignments);
    const safeCyclesRequired = Math.max(1, Math.ceil(targetStores / input.safeBatchSize));
    const status: RevenueHundredStoreWorkerScaleCoverage["status"] = readyAssignments >= requiredReadyAssignments
      ? "ready"
      : input.readyAssignments + input.approvalHoldAssignments > 0 ? "watch" : "blocked";

    return {
      approvalHoldAssignments: input.approvalHoldAssignments,
      readyAssignments,
      readyCoveragePercent,
      requiredReadyAssignments,
      safeCyclesRequired,
      status,
      summary: status === "ready"
        ? `${targetStores}-store worker coverage is ready for the next safe internal claim cycle with ${readyAssignments}/${requiredReadyAssignments} required assignment${requiredReadyAssignments === 1 ? "" : "s"}.`
        : status === "watch"
          ? `${targetStores}-store worker coverage is partial at ${readyAssignments}/${requiredReadyAssignments} required assignment${requiredReadyAssignments === 1 ? "" : "s"}; approval-held or waiting assignments must be cleared before scale review.`
          : `${targetStores}-store worker coverage has no ready assignments for the next safe internal claim cycle.`,
      targetStores
    };
  });
}

function buildRevenueHundredStoreWorkerAssignmentPlan(input: {
  generatedAt?: string;
  options: RevenueHundredStoreOperationsOptions;
  workLeasePlan: RevenueHundredStoreWorkLeasePlan;
}): RevenueHundredStoreWorkerAssignmentPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const sortedLeases = input.workLeasePlan.leases.slice().sort((left, right) => (
    right.priority - left.priority
    || left.status.localeCompare(right.status)
    || left.storeName.localeCompare(right.storeName)
    || left.jobType.localeCompare(right.jobType)
  ));
  const laneCounts = new Map<RevenueHundredStoreWorkerLane, number>();
  const shardCounts = new Map<string, number>();
  const claimedDedupeKeys = new Set<string>();
  let readyClaimOrder = 0;
  const maxAssignmentsPerShard = input.workLeasePlan.totals.maxLeasesPerShard;
  const assignments = sortedLeases.map((lease) => {
    const lane = workerLaneForJobType(lease.jobType);
    const definition = hundredStoreWorkerLaneDefinitions.find((item) => item.lane === lane) ?? hundredStoreWorkerLaneDefinitions[0]!;
    const laneCapacity = workerLaneCapacity({
      lane,
      safeBatchSize: input.options.safeBatchSize
    });
    const laneAssigned = laneCounts.get(lane) ?? 0;
    const shardAssigned = shardCounts.get(lease.shardId) ?? 0;
    const baseStatus = workerAssignmentStatusForLease(lease.status);
    const canAssign = baseStatus === "ready_to_assign"
      && readyClaimOrder < input.options.safeBatchSize
      && laneAssigned < laneCapacity
      && shardAssigned < maxAssignmentsPerShard
      && !claimedDedupeKeys.has(lease.dedupeKey);
    const status: RevenueHundredStoreWorkerAssignmentStatus = canAssign ? "ready_to_assign" : baseStatus === "ready_to_assign" ? "waiting_dependency" : baseStatus;
    const claimOrder = canAssign ? readyClaimOrder + 1 : 0;
    const assignmentId = `assignment:${createHash("sha1").update(`100-store-worker-assignment:${lease.leaseId}:${definition.workerId}`).digest("hex").slice(0, 24)}`;

    if (canAssign) {
      readyClaimOrder += 1;
      laneCounts.set(lane, laneAssigned + 1);
      shardCounts.set(lease.shardId, shardAssigned + 1);
      claimedDedupeKeys.add(lease.dedupeKey);
    }

    return {
      approvalGate: lease.approvalGate,
      assignmentId,
      blockedExternalActions: hundredStoreWorkerAssignmentBlockedExternalActions,
      claimOrder,
      dedupeKey: lease.dedupeKey,
      dependencyRefs: lease.dependencyRefs,
      expectedInternalEffect: lease.expectedInternalEffect,
      externalExecution: false as const,
      idempotencyKey: createHash("sha1").update(`100-store-worker-assignment-idempotency:${assignmentId}`).digest("hex").slice(0, 24),
      jobType: lease.jobType,
      lane,
      leaseExpiresAt: lease.expiresAt,
      leaseId: lease.leaseId,
      priority: lease.priority,
      providerContacted: false as const,
      shardId: lease.shardId,
      status,
      storeId: lease.storeId,
      storeName: lease.storeName,
      summary: canAssign
        ? `${definition.workerName} can claim ${lease.storeName} ${lease.jobType.replace(/_/g, " ")} at order ${claimOrder}.`
        : `${definition.workerName} keeps ${lease.storeName} ${lease.jobType.replace(/_/g, " ")} in ${status.replace(/_/g, " ")} state.`,
      workerId: definition.workerId,
      workerName: definition.workerName
    };
  });
  const statusCount = (status: RevenueHundredStoreWorkerAssignmentStatus) => assignments.filter((assignment) => assignment.status === status).length;
  const scaleCoverage = buildWorkerScaleCoverage({
    approvalHoldAssignments: statusCount("approval_hold"),
    readyAssignments: statusCount("ready_to_assign"),
    safeBatchSize: input.options.safeBatchSize
  });
  const lanePlans = hundredStoreWorkerLaneDefinitions.map((definition) => {
    const laneAssignments = assignments.filter((assignment) => assignment.lane === definition.lane);
    const laneStatusCount = (status: RevenueHundredStoreWorkerAssignmentStatus) => laneAssignments.filter((assignment) => assignment.status === status).length;
    const laneCapacity = workerLaneCapacity({
      lane: definition.lane,
      safeBatchSize: input.options.safeBatchSize
    });
    const laneStatus: RevenueHundredStoreWorkerLanePlan["status"] = laneStatusCount("ready_to_assign") > 0
      ? "ready"
      : laneStatusCount("approval_hold") > 0 ? "approval_hold"
        : laneStatusCount("blocked") > 0 ? "blocked" : "waiting";

    return {
      assignments: laneAssignments,
      blockedExternalActions: hundredStoreWorkerAssignmentBlockedExternalActions,
      externalExecution: false as const,
      lane: definition.lane,
      laneCapacity,
      nextInternalAction: laneStatusCount("ready_to_assign") > 0
        ? `Claim up to ${laneStatusCount("ready_to_assign")} ${definition.lane.replace(/_/g, " ")} assignment${laneStatusCount("ready_to_assign") === 1 ? "" : "s"} internally.`
        : laneStatusCount("approval_hold") > 0
          ? "Resolve approval-held assignments before this lane can claim more work."
          : laneStatusCount("blocked") > 0
            ? "Clear blocked lease dependencies before this lane can advance."
            : "Wait for new clean leases in this lane.",
      providerContacted: false as const,
      status: laneStatus,
      summary: `${definition.workerName} has ${laneStatusCount("ready_to_assign")} ready assignment${laneStatusCount("ready_to_assign") === 1 ? "" : "s"}, ${laneStatusCount("approval_hold")} approval-held, ${laneStatusCount("waiting_dependency")} waiting, and ${laneStatusCount("blocked")} blocked.`,
      totals: {
        approvalHold: laneStatusCount("approval_hold"),
        assigned: laneStatusCount("ready_to_assign"),
        blocked: laneStatusCount("blocked"),
        readyToAssign: laneStatusCount("ready_to_assign"),
        waitingDependency: laneStatusCount("waiting_dependency")
      },
      workerId: definition.workerId,
      workerName: definition.workerName
    };
  });

  return {
    assignments,
    auditEvents: [
      "100 Store Chain Of Command Assignment Plan routed clean work leases into capped internal worker lanes.",
      "Assignments are claim instructions only; they do not create accounts, upload products, publish listings, post content, run ads, move payments, move payouts, open browsers, or call external providers.",
      "Each assignment keeps the lease id, dedupe key, shard id, worker id, and idempotency key visible for audit and retry control."
    ],
    blockedExternalActions: hundredStoreWorkerAssignmentBlockedExternalActions,
    externalExecution: false,
    generatedAt,
    lanes: lanePlans,
    mode: "100 Store Chain Of Command Assignment Plan",
    providerContacted: false,
    scaleCoverage,
    summary: `${statusCount("ready_to_assign")} worker assignment${statusCount("ready_to_assign") === 1 ? "" : "s"} ready across ${lanePlans.length} internal command lane${lanePlans.length === 1 ? "" : "s"} for the ${input.options.targetStores}-store floor; ${scaleCoverage.map((coverage) => `${coverage.targetStores}-store ${coverage.status} ${coverage.readyAssignments}/${coverage.requiredReadyAssignments}`).join(", ")}. ${statusCount("approval_hold")} approval-held, ${statusCount("waiting_dependency")} waiting, and ${statusCount("blocked")} blocked. External execution remains locked.`,
    totals: {
      approvalHold: statusCount("approval_hold"),
      assigned: statusCount("ready_to_assign"),
      blocked: statusCount("blocked"),
      duplicateDedupeKeys: input.workLeasePlan.totals.duplicateDedupeKeys,
      laneCount: lanePlans.length,
      maxSelectableAssignments: Math.min(input.options.safeBatchSize, statusCount("ready_to_assign") + statusCount("approval_hold")),
      readyToAssign: statusCount("ready_to_assign"),
      scaleCoverageReadyTargets: scaleCoverage.filter((coverage) => coverage.status === "ready").length,
      targetStores: input.options.targetStores,
      waitingDependency: statusCount("waiting_dependency")
    }
  };
}

function dailyLoopStep(
  input: Omit<RevenueHundredStoreDailyOperatingLoopStep, "externalExecution" | "providerContacted">
): RevenueHundredStoreDailyOperatingLoopStep {
  return {
    ...input,
    externalExecution: false,
    providerContacted: false
  };
}

function buildRevenueHundredStoreDailyOperatingLoop(input: {
  applicationConnectionWorkbench: RevenueHundredStoreApplicationConnectionWorkbench;
  autonomyRunQueue: RevenueHundredStoreAutonomyRunQueue;
  connectorActivationMatrix: RevenueHundredStoreConnectorActivationMatrix;
  generatedAt?: string;
  growthAllocationRouter: RevenueHundredStoreGrowthAllocationRouter;
  launchPacketQueue: RevenueHundredStoreLaunchPacketQueue;
  monitoringMatrix: RevenueHundredStoreMonitoringMatrix;
  nextActions: RevenueHundredStoreOperationsNextAction[];
  options: RevenueHundredStoreOperationsOptions;
  productDraftDeficit: number;
  productDepthQueue: RevenueHundredStoreProductDepthQueue;
  safetyClear: boolean;
  storeGap: number;
  workerAssignmentPlan: RevenueHundredStoreWorkerAssignmentPlan;
  workLeasePlan: RevenueHundredStoreWorkLeasePlan;
}): RevenueHundredStoreDailyOperatingLoop {
  const readyConnectionPackets = input.applicationConnectionWorkbench.totals.readyPackets;
  const connectorActivationRows = input.connectorActivationMatrix.totals.readyForConnectionDesign + input.connectorActivationMatrix.totals.credentialCustodyRequired;
  const monitoringItems = input.monitoringMatrix.items.length;
  const growthCandidates = input.growthAllocationRouter.totals.candidates;
  const growthReviewRoutes = input.growthAllocationRouter.totals.paidScaleReview + input.growthAllocationRouter.totals.organicFirst;
  const batchCreationAction = input.nextActions.find((action) => action.endpoint.includes("/launch-gap/seeds/apply"));
  const productDepthAction = input.nextActions.find((action) => action.endpoint.includes("/100-store-product-depth/apply"));
  const launchPacketAction = input.nextActions.find((action) => action.endpoint.includes("/100-store-launch-packets/apply"));
  const autonomyRunAction = input.nextActions.find((action) => action.endpoint.includes("/100-store-autonomy-run/apply"));
  const workLeaseAction = input.nextActions.find((action) => action.endpoint.includes("/100-store-work-leases/apply"));
  const workerAssignmentAction = input.nextActions.find((action) => action.endpoint.includes("/100-store-worker-assignments/apply"));
  const connectorActivationAction = input.nextActions.find((action) => action.endpoint.includes("/100-store-connector-activation/apply"));
  const weakLaneAction = input.nextActions.find((action) => action.endpoint.includes("/review-queue"));
  const steps: RevenueHundredStoreDailyOperatingLoopStep[] = [
    dailyLoopStep({
      approvalRequired: false,
      blockers: input.safetyClear ? [] : ["One or more source plans reported unsafe external/provider flags."],
      confirmation: "REVIEW INTERNAL SAFETY ENVELOPE",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-operations",
      expectedInternalEffect: "Confirm all 100-store operating layers remain private, internal, and external-execution locked.",
      maxItems: 1,
      phase: "safety_gate_snapshot",
      priority: 1,
      reason: input.safetyClear
        ? "Safety envelope is clear enough to continue internal daily sequencing."
        : "Daily operating loop cannot proceed until unsafe flags are investigated.",
      status: input.safetyClear ? "ready" : "blocked",
      stepId: "daily_safety_gate_snapshot",
      title: "Confirm private safety envelope"
    }),
    dailyLoopStep({
      approvalRequired: true,
      blockers: readyConnectionPackets > 0 ? [] : ["No ready application connection packets are waiting."],
      confirmation: "RECORD INTERNAL 100 STORE APP CONNECTION PACKETS",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-application-connections/apply",
      expectedInternalEffect: `Record up to ${Math.min(100, readyConnectionPackets)} internal app readiness packet${Math.min(100, readyConnectionPackets) === 1 ? "" : "s"} for required store applications.`,
      maxItems: Math.min(100, readyConnectionPackets),
      phase: "application_connection_packets",
      priority: 2,
      reason: readyConnectionPackets > 0
        ? `${readyConnectionPackets} application connection packet${readyConnectionPackets === 1 ? "" : "s"} can be recorded before launch capacity expands.`
        : "Application packet queue is empty or already mapped.",
      status: readyConnectionPackets > 0 ? "ready" : "waiting",
      stepId: "daily_application_connection_packets",
      title: "Record app connection packets"
    }),
    dailyLoopStep({
      approvalRequired: input.connectorActivationMatrix.totals.credentialCustodyRequired > 0,
      blockers: connectorActivationRows > 0 ? [] : ["No connector activation rows are ready for design or credential custody review."],
      confirmation: connectorActivationAction?.confirmation ?? "RECORD INTERNAL 100 STORE CONNECTOR ACTIVATION MATRIX",
      endpoint: connectorActivationAction?.endpoint ?? "/merch/revenue-engine/business-fleet-scheduler/100-store-connector-activation/apply",
      expectedInternalEffect: connectorActivationAction?.expectedInternalEffect ?? `Record up to ${input.connectorActivationMatrix.totals.maxSelectableRows} connector activation readiness row${input.connectorActivationMatrix.totals.maxSelectableRows === 1 ? "" : "s"} with dry-run maps and credential custody gates.`,
      maxItems: input.connectorActivationMatrix.totals.maxSelectableRows,
      phase: "connector_activation_matrix",
      priority: 3,
      reason: connectorActivationAction?.reason ?? `${input.connectorActivationMatrix.totals.readyForConnectionDesign} rows are ready for connection design and ${input.connectorActivationMatrix.totals.credentialCustodyRequired} require credential custody approval.`,
      status: connectorActivationRows > 0 ? "ready" : "waiting",
      stepId: "daily_connector_activation_matrix",
      title: "Record connector activation matrix"
    }),
    dailyLoopStep({
      approvalRequired: true,
      blockers: monitoringItems > 0 ? [] : ["No monitoring rows are available."],
      confirmation: "RECORD INTERNAL 100 STORE MONITORING CYCLE",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-monitoring-cycle/apply",
      expectedInternalEffect: `Record up to ${Math.min(input.options.safeBatchSize, monitoringItems)} monitoring item${Math.min(input.options.safeBatchSize, monitoringItems) === 1 ? "" : "s"} from the 100-store signal queues.`,
      maxItems: Math.min(input.options.safeBatchSize, monitoringItems),
      phase: "monitoring_cycle",
      priority: 4,
      reason: `${input.monitoringMatrix.totals.manualSnapshots} manual, ${input.monitoringMatrix.totals.readOnlyImports} read-only, ${input.monitoringMatrix.totals.scaleReviews} scale, and ${input.monitoringMatrix.totals.immediateRotationReviews} rotation monitoring queues are visible.`,
      status: monitoringItems > 0 ? "ready" : "waiting",
      stepId: "daily_monitoring_cycle",
      title: "Run monitoring cycle"
    }),
    dailyLoopStep({
      approvalRequired: true,
      blockers: growthCandidates > 0 ? [] : ["No growth allocation candidates are available."],
      confirmation: "REVIEW ADVISORY 100 STORE GROWTH ALLOCATION",
      endpoint: "/merch/financial-orchestrator/plan",
      expectedInternalEffect: "Review advisory routing for the Financial Orchestrator 25% Ad/Growth bucket without authorizing spend.",
      maxItems: Math.min(input.options.safeBatchSize, growthCandidates),
      phase: "growth_allocation_review",
      priority: 5,
      reason: `${growthReviewRoutes} growth route${growthReviewRoutes === 1 ? "" : "s"} can inform organic work or paid-scale budget review; all spend remains approval-gated.`,
      status: growthCandidates > 0 ? "approval_required" : "waiting",
      stepId: "daily_growth_allocation_review",
      title: "Review Ad/Growth allocation router"
    }),
    dailyLoopStep({
      approvalRequired: true,
      blockers: input.productDepthQueue.totals.drafts > 0 ? [] : ["Product depth already satisfies the configured minimum for visible and planned stores."],
      confirmation: productDepthAction?.confirmation ?? "RECORD INTERNAL 100 STORE PRODUCT DEPTH DRAFTS",
      endpoint: productDepthAction?.endpoint ?? "/merch/revenue-engine/business-fleet-scheduler/100-store-product-depth/apply",
      expectedInternalEffect: productDepthAction?.expectedInternalEffect ?? "Record internal product-depth draft packets for current stores and future store slots.",
      maxItems: Math.min(input.options.safeBatchSize, Math.max(0, input.productDepthQueue.totals.drafts)),
      phase: "product_depth_repair",
      priority: 6,
      reason: productDepthAction?.reason ?? `${input.productDepthQueue.totals.drafts} product-depth draft packet${input.productDepthQueue.totals.drafts === 1 ? "" : "s"} are prepared for 100-store product coverage.`,
      status: input.productDepthQueue.totals.drafts > 0 ? "ready" : "waiting",
      stepId: "daily_product_depth_repair",
      title: "Fill product depth"
    }),
    dailyLoopStep({
      approvalRequired: true,
      blockers: input.launchPacketQueue.totals.packets > 0 ? [] : ["No launch packets are available."],
      confirmation: launchPacketAction?.confirmation ?? "RECORD INTERNAL 100 STORE LAUNCH PACKETS",
      endpoint: launchPacketAction?.endpoint ?? "/merch/revenue-engine/business-fleet-scheduler/100-store-launch-packets/apply",
      expectedInternalEffect: launchPacketAction?.expectedInternalEffect ?? "Record internal launch packet review bundles for ready and planned 100-store lanes.",
      maxItems: Math.min(input.options.safeBatchSize, Math.max(0, input.launchPacketQueue.totals.packets)),
      phase: "launch_packet_review",
      priority: 7,
      reason: launchPacketAction?.reason ?? `${input.launchPacketQueue.totals.packets} launch packet${input.launchPacketQueue.totals.packets === 1 ? "" : "s"} are assembled for 100-store internal review.`,
      status: input.launchPacketQueue.totals.packets > 0 ? "ready" : "waiting",
      stepId: "daily_launch_packet_review",
      title: "Review launch packets"
    }),
    dailyLoopStep({
      approvalRequired: input.autonomyRunQueue.totals.approvalRequired > 0,
      blockers: input.autonomyRunQueue.totals.readyInternal + input.autonomyRunQueue.totals.approvalRequired > 0 ? [] : ["No autonomy jobs are ready or approval-routed."],
      confirmation: autonomyRunAction?.confirmation ?? "RECORD INTERNAL 100 STORE AUTONOMY RUN",
      endpoint: autonomyRunAction?.endpoint ?? "/merch/revenue-engine/business-fleet-scheduler/100-store-autonomy-run/apply",
      expectedInternalEffect: autonomyRunAction?.expectedInternalEffect ?? `Record up to ${input.autonomyRunQueue.totals.maxSelectableJobs} bounded internal autonomy job${input.autonomyRunQueue.totals.maxSelectableJobs === 1 ? "" : "s"} across 100-store control lanes.`,
      maxItems: input.autonomyRunQueue.totals.maxSelectableJobs,
      phase: "autonomy_run_queue",
      priority: 8,
      reason: autonomyRunAction?.reason ?? `${input.autonomyRunQueue.totals.readyInternal} ready internal job${input.autonomyRunQueue.totals.readyInternal === 1 ? "" : "s"} and ${input.autonomyRunQueue.totals.approvalRequired} approval-routed job${input.autonomyRunQueue.totals.approvalRequired === 1 ? "" : "s"} are queued for the chain of command.`,
      status: input.autonomyRunQueue.totals.readyInternal + input.autonomyRunQueue.totals.approvalRequired > 0 ? "ready" : "waiting",
      stepId: "daily_autonomy_run_queue",
      title: "Record autonomy run queue"
    }),
    dailyLoopStep({
      approvalRequired: input.workLeasePlan.totals.approvalHold > 0,
      blockers: input.workLeasePlan.totals.readyToClaim + input.workLeasePlan.totals.approvalHold > 0 ? [] : ["No internal work leases are ready or approval-held."],
      confirmation: workLeaseAction?.confirmation ?? "RECORD INTERNAL 100 STORE WORK LEASES",
      endpoint: workLeaseAction?.endpoint ?? "/merch/revenue-engine/business-fleet-scheduler/100-store-work-leases/apply",
      expectedInternalEffect: workLeaseAction?.expectedInternalEffect ?? `Record up to ${input.workLeasePlan.totals.maxSelectableLeases} deterministic internal work lease${input.workLeasePlan.totals.maxSelectableLeases === 1 ? "" : "s"} with dedupe and shard caps.`,
      maxItems: input.workLeasePlan.totals.maxSelectableLeases,
      phase: "work_lease_claims",
      priority: 9,
      reason: workLeaseAction?.reason ?? `${input.workLeasePlan.totals.readyToClaim} leases are ready to claim and ${input.workLeasePlan.totals.approvalHold} leases remain approval-held.`,
      status: input.workLeasePlan.totals.readyToClaim + input.workLeasePlan.totals.approvalHold > 0 ? "ready" : "waiting",
      stepId: "daily_work_lease_claims",
      title: "Record work leases"
    }),
    dailyLoopStep({
      approvalRequired: input.workerAssignmentPlan.totals.approvalHold > 0,
      blockers: input.workerAssignmentPlan.totals.readyToAssign + input.workerAssignmentPlan.totals.approvalHold > 0 ? [] : ["No internal worker assignments are ready or approval-held."],
      confirmation: workerAssignmentAction?.confirmation ?? "RECORD INTERNAL 100 STORE WORKER ASSIGNMENTS",
      endpoint: workerAssignmentAction?.endpoint ?? "/merch/revenue-engine/business-fleet-scheduler/100-store-worker-assignments/apply",
      expectedInternalEffect: workerAssignmentAction?.expectedInternalEffect ?? `Record up to ${input.workerAssignmentPlan.totals.maxSelectableAssignments} internal worker assignment${input.workerAssignmentPlan.totals.maxSelectableAssignments === 1 ? "" : "s"} across capped chain-of-command lanes.`,
      maxItems: input.workerAssignmentPlan.totals.maxSelectableAssignments,
      phase: "worker_assignment_claims",
      priority: 10,
      reason: workerAssignmentAction?.reason ?? `${input.workerAssignmentPlan.totals.readyToAssign} assignments are ready across ${input.workerAssignmentPlan.totals.laneCount} command lanes.`,
      status: input.workerAssignmentPlan.totals.readyToAssign + input.workerAssignmentPlan.totals.approvalHold > 0 ? "ready" : "waiting",
      stepId: "daily_worker_assignment_claims",
      title: "Record worker assignments"
    }),
    dailyLoopStep({
      approvalRequired: true,
      blockers: input.storeGap > 0 ? [] : ["The 100-store operating floor is already filled."],
      confirmation: batchCreationAction?.confirmation ?? "CREATE INTERNAL BUSINESS FLEET GAP SEEDS",
      endpoint: batchCreationAction?.endpoint ?? "/merch/revenue-engine/business-fleet-scheduler/launch-gap/seeds/apply",
      expectedInternalEffect: batchCreationAction?.expectedInternalEffect ?? "Create the next private store shell batch with internal product drafts.",
      maxItems: Math.min(input.options.safeBatchSize, Math.max(0, input.storeGap)),
      phase: "store_batch_creation",
      priority: 11,
      reason: batchCreationAction?.reason ?? `${input.storeGap} store slot${input.storeGap === 1 ? "" : "s"} remain before the 100-store operating floor is filled.`,
      status: input.storeGap > 0 ? (batchCreationAction?.status === "ready" ? "ready" : "waiting") : "waiting",
      stepId: "daily_store_batch_creation",
      title: "Create next store batch"
    }),
    dailyLoopStep({
      approvalRequired: true,
      blockers: weakLaneAction ? [] : ["No weak-lane review action is currently queued."],
      confirmation: weakLaneAction?.confirmation ?? "APPLY INTERNAL ASSET ACTION",
      endpoint: weakLaneAction?.endpoint ?? "/merch/revenue-engine/review-queue",
      expectedInternalEffect: weakLaneAction?.expectedInternalEffect ?? "Review weak lanes before they consume launch or growth capacity.",
      maxItems: input.monitoringMatrix.totals.immediateRotationReviews,
      phase: "weak_lane_rotation",
      priority: 12,
      reason: weakLaneAction?.reason ?? `${input.monitoringMatrix.totals.immediateRotationReviews} immediate rotation review${input.monitoringMatrix.totals.immediateRotationReviews === 1 ? "" : "s"} are visible in monitoring.`,
      status: weakLaneAction ? "ready" : input.monitoringMatrix.totals.immediateRotationReviews > 0 ? "approval_required" : "waiting",
      stepId: "daily_weak_lane_rotation",
      title: "Clear weak lanes"
    })
  ];
  const statusCount = (status: RevenueHundredStoreDailyOperatingLoopStatus) => steps.filter((step) => step.status === status).length;
  const executableInternalSteps = steps.filter((step) => step.status === "ready").length;

  return {
    auditEvents: [
      "100 Store Daily Operating Loop sequenced safety, application packet prep, connector activation readiness, monitoring, growth allocation review, product depth repair, launch packet review, autonomy queue recording, work lease claims, worker assignments, store batch creation, and weak-lane cleanup.",
      "Loop steps reference existing internal endpoints and confirmation phrases; no provider, marketplace, browser, upload, publishing, ad spend, payout, payment, bank, or external write action is executed.",
      "Approval-required steps are review or internal-recording gates only and remain private until an operator explicitly records them."
    ],
    blockedExternalActions: [
      "Running daily loop steps against external providers, marketplaces, ad accounts, banks, payment systems, browsers, uploads, or publishing systems",
      "Spending Ad/Growth allocation or moving payout money from a daily loop step",
      "Bypassing confirmation phrases or audit records before daily-loop work is recorded"
    ],
    cadence: "daily_private_internal_ops",
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "100 Store Daily Operating Loop",
    providerContacted: false,
    steps,
    summary: `${steps.length} daily operating step${steps.length === 1 ? "" : "s"} sequenced for 100-store private operations: ${executableInternalSteps} ready, ${statusCount("approval_required")} approval-required, ${statusCount("waiting")} waiting, and ${statusCount("blocked")} blocked. External execution remains locked.`,
    totals: {
      approvalRequired: statusCount("approval_required"),
      blocked: statusCount("blocked"),
      executableInternalSteps,
      ready: statusCount("ready"),
      safeBatchSize: input.options.safeBatchSize,
      storeGap: input.storeGap,
      storesCovered: input.monitoringMatrix.totals.storesCovered,
      waiting: statusCount("waiting")
    }
  };
}

export function buildRevenueHundredStoreOperationsPlan(input: {
  gapPlan: RevenueBusinessFleetLaunchGapPlan;
  generatedAt?: string;
  liveConnectorReadiness?: RevenueLiveConnectorReadinessRegistryPlan | null;
  options?: Partial<RevenueHundredStoreOperationsOptions>;
  pipeline: RevenueMoneyArmyBatchPipelinePlan;
  plan: RevenueBusinessFleetPlan;
}): RevenueHundredStoreOperationsPlan {
  const options = withHundredStoreOptions(input.options);
  const currentStores = input.plan.capacity.currentBusinesses;
  const storeGap = Math.max(0, options.targetStores - currentStores);
  const productDraftDeficit = input.plan.businesses.reduce((sum, business) => (
    sum + Math.max(0, options.minProductsPerStore - business.productAssets)
  ), storeGap * options.minProductsPerStore);
  const batchRunsRequired = storeGap === 0 ? 0 : Math.ceil(storeGap / options.safeBatchSize);
  const recommendedBatchSize = storeGap === 0 ? 0 : Math.min(options.safeBatchSize, storeGap);
  const minimumRecommendedShards = Math.ceil(options.targetStores / options.maxStoresPerShard);
  const overloadedShardIds = input.plan.shards
    .filter((shard) => shard.businesses > options.maxStoresPerShard)
    .map((shard) => shard.id);
  const safetyClear = input.plan.externalExecution === false
    && input.pipeline.externalExecution === false
    && input.gapPlan.externalExecution === false
    && (input.liveConnectorReadiness?.externalExecution ?? false) === false
    && input.plan.providerContacted === false
    && input.pipeline.providerContacted === false
    && input.gapPlan.providerContacted === false
    && (input.liveConnectorReadiness?.providerContacted ?? false) === false;
  const readyLaunchWave = input.plan.launchWave.filter((business) => (
    business.scheduleState === "ready_parallel"
    && business.qualityGate.status === "pass"
  )).length;
  const approvalPacketsReady = input.pipeline.totals.approvablePackets + input.pipeline.totals.approvedPackets;
  const approvalPacketsWaiting = input.pipeline.totals.pendingApprovalPackets;
  const applicationReadiness = buildHundredStoreApplicationReadiness({
    liveConnectorReadiness: input.liveConnectorReadiness,
    targetStores: options.targetStores
  });
  const controlGrid = buildRevenueHundredStoreControlGrid({
    generatedAt: input.generatedAt,
    liveConnectorReadiness: input.liveConnectorReadiness,
    options,
    plan: input.plan
  });
  const applicationConnectionWorkbench = buildRevenueHundredStoreApplicationConnectionWorkbench({
    controlGrid,
    generatedAt: input.generatedAt,
    liveConnectorReadiness: input.liveConnectorReadiness,
    options
  });
  const connectorActivationMatrix = buildRevenueHundredStoreConnectorActivationMatrix({
    applicationConnectionWorkbench,
    controlGrid,
    gapPlan: input.gapPlan,
    generatedAt: input.generatedAt,
    options
  });
  const monitoringMatrix = buildRevenueHundredStoreMonitoringMatrix({
    controlGrid,
    generatedAt: input.generatedAt,
    options,
    plan: input.plan
  });
  const growthAllocationRouter = buildRevenueHundredStoreGrowthAllocationRouter({
    controlGrid,
    generatedAt: input.generatedAt,
    monitoringMatrix,
    options
  });
  const productDepthQueue = buildRevenueHundredStoreProductDepthQueue({
    controlGrid,
    gapPlan: input.gapPlan,
    generatedAt: input.generatedAt,
    options,
    plan: input.plan,
    productDraftDeficit,
    storeGap
  });
  const launchPacketQueue = buildRevenueHundredStoreLaunchPacketQueue({
    applicationConnectionWorkbench,
    controlGrid,
    generatedAt: input.generatedAt,
    growthAllocationRouter,
    options,
    productDepthQueue,
    storeGap
  });
  const autonomyRunQueue = buildRevenueHundredStoreAutonomyRunQueue({
    applicationConnectionWorkbench,
    connectorActivationMatrix,
    controlGrid,
    gapPlan: input.gapPlan,
    generatedAt: input.generatedAt,
    growthAllocationRouter,
    launchPacketQueue,
    monitoringMatrix,
    options,
    productDepthQueue
  });
  const workLeasePlan = buildRevenueHundredStoreWorkLeasePlan({
    autonomyRunQueue,
    controlGrid,
    generatedAt: input.generatedAt,
    options
  });
  const workerAssignmentPlan = buildRevenueHundredStoreWorkerAssignmentPlan({
    generatedAt: input.generatedAt,
    options,
    workLeasePlan
  });
  const gates: RevenueHundredStoreOperationsGate[] = [
    operationsGate({
      actionEndpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/seeds/apply",
      evidence: [
        `${currentStores}/${options.targetStores} stores currently tracked.`,
        `${storeGap} additional store shell${storeGap === 1 ? "" : "s"} needed for the 100-store operating floor.`,
        `${batchRunsRequired} safe batch run${batchRunsRequired === 1 ? "" : "s"} at up to ${options.safeBatchSize} stores each.`
      ],
      status: storeGap === 0 ? "pass" : currentStores > 0 ? "watch" : "block",
      title: "Store Inventory"
    }),
    operationsGate({
      actionEndpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-wave/apply",
      evidence: [
        `${input.plan.totals.readyParallel} stores are ready for parallel internal work.`,
        `${readyLaunchWave}/${input.plan.capacity.launchWaveSize} launch-wave slots pass quality gates.`,
        `${input.plan.capacity.parallelSlotsConfigured} configured parallel launch/scale slots.`
      ],
      status: readyLaunchWave >= Math.min(input.plan.capacity.launchWaveSize, input.plan.capacity.maxParallelLaunches)
        ? "pass"
        : readyLaunchWave > 0 ? "watch" : "block",
      title: "Parallel Launch Capacity"
    }),
    operationsGate({
      actionEndpoint: "/merch/revenue-engine/review-queue",
      evidence: [
        `${input.plan.totals.qualityPass} pass, ${input.plan.totals.qualityWatch} watch, ${input.plan.totals.qualityBlock} blocked quality gates.`,
        `${input.plan.totals.qualityRepair} repair lane${input.plan.totals.qualityRepair === 1 ? "" : "s"} and ${input.plan.totals.kill} kill lane${input.plan.totals.kill === 1 ? "" : "s"}.`,
        `Quality floor is ${input.plan.options.qualityFloor}/100.`
      ],
      status: input.plan.totals.qualityBlock === 0 && input.plan.totals.kill === 0
        ? input.plan.totals.qualityRepair === 0 ? "pass" : "watch"
        : "block",
      title: "Quality And Rotation Health"
    }),
    operationsGate({
      actionEndpoint: "/merch/revenue-engine/business-fleet-scheduler",
      evidence: [
        `${input.plan.capacity.shardCount} configured shards; ${minimumRecommendedShards} recommended minimum for ${options.targetStores} stores at ${options.maxStoresPerShard} stores/shard.`,
        `${overloadedShardIds.length} shard${overloadedShardIds.length === 1 ? "" : "s"} exceed the safe store density.`,
        `${input.plan.shards.reduce((sum, shard) => sum + shard.capacity, 0)} current internal job slots across active shards.`,
        `${controlGrid.totals.readyInternalJobs} ready internal job${controlGrid.totals.readyInternalJobs === 1 ? "" : "s"} mapped in the 100-store control grid.`
      ],
      status: overloadedShardIds.length === 0 && input.plan.capacity.shardCount >= minimumRecommendedShards
        ? "pass"
        : overloadedShardIds.length === 0 ? "watch" : "block",
      title: "Shard Distribution"
    }),
    operationsGate({
      actionEndpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/provider-approval-review",
      evidence: [
        `${approvalPacketsReady} provider approval packet${approvalPacketsReady === 1 ? "" : "s"} ready or approved.`,
        `${approvalPacketsWaiting} provider approval packet${approvalPacketsWaiting === 1 ? "" : "s"} waiting.`,
        `${input.pipeline.totals.readyDeploymentBusinesses} deployment lane${input.pipeline.totals.readyDeploymentBusinesses === 1 ? "" : "s"} currently ready.`
      ],
      status: approvalPacketsReady > 0 || input.pipeline.totals.readyDeploymentBusinesses === 0
        ? approvalPacketsWaiting > 0 ? "watch" : "pass"
        : "watch",
      title: "Connector And Provider Packets"
    }),
    operationsGate({
      actionEndpoint: "/merch/revenue-engine/live-connector-readiness",
      evidence: [
        `${applicationReadiness.totals.mappedStores}/${applicationReadiness.totals.targetStores} stores have application readiness entries.`,
        `${applicationReadiness.totals.readyForDesign} stores are ready for connector design; ${applicationReadiness.totals.needsReadOnlyApproval} need read-only approval.`,
        `${applicationReadiness.totals.requiredBoundaries} required connector boundary record${applicationReadiness.totals.requiredBoundaries === 1 ? "" : "s"} mapped.`,
        `${applicationConnectionWorkbench.totals.readyPackets} application connection packet${applicationConnectionWorkbench.totals.readyPackets === 1 ? "" : "s"} ready for internal preparation.`
      ],
      status: applicationReadiness.totals.blockedEntries > 0
        ? "block"
        : applicationReadiness.totals.mappedStores >= options.targetStores
          && applicationReadiness.totals.readyForDesign >= options.targetStores ? "pass" : "watch",
      title: "Application Connection Readiness"
    }),
    operationsGate({
      actionEndpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-connector-activation/apply",
      evidence: [
        `${connectorActivationMatrix.totals.rows}/${options.targetStores * hundredStoreApplicationRequirements.length} connector activation row${connectorActivationMatrix.totals.rows === 1 ? "" : "s"} prepared.`,
        `${connectorActivationMatrix.totals.readyForConnectionDesign} ready for connection design, ${connectorActivationMatrix.totals.credentialCustodyRequired} need credential custody, and ${connectorActivationMatrix.totals.waitingForStoreShell} waiting for store shells.`,
        `${connectorActivationMatrix.totals.blockedByQuality} connector row${connectorActivationMatrix.totals.blockedByQuality === 1 ? "" : "s"} remain quality-repair rows, not claimable live connection work.`,
        `${connectorActivationMatrix.totals.dryRunRequestMaps} dry-run request map${connectorActivationMatrix.totals.dryRunRequestMaps === 1 ? "" : "s"} and ${connectorActivationMatrix.totals.writeScopesBlocked} blocked write-scope reference${connectorActivationMatrix.totals.writeScopesBlocked === 1 ? "" : "s"} are recorded.`
      ],
      status: connectorActivationMatrix.totals.rows >= options.targetStores * hundredStoreApplicationRequirements.length
        ? connectorActivationMatrix.totals.credentialCustodyRequired > 0 || connectorActivationMatrix.totals.blockedByQuality > 0 ? "watch" : "pass"
        : "watch",
      title: "Connector Activation Matrix"
    }),
    operationsGate({
      actionEndpoint: "/merch/revenue-engine/performance",
      evidence: [
        `${monitoringMatrix.totals.storesCovered}/${options.targetStores} stores are in the 100-store monitoring matrix.`,
        `${monitoringMatrix.totals.manualSnapshots} manual snapshot queue${monitoringMatrix.totals.manualSnapshots === 1 ? "" : "s"} and ${monitoringMatrix.totals.readOnlyImports} read-only import queue${monitoringMatrix.totals.readOnlyImports === 1 ? "" : "s"} are waiting for performance evidence.`,
        `${monitoringMatrix.totals.immediateRotationReviews} immediate rotation review${monitoringMatrix.totals.immediateRotationReviews === 1 ? "" : "s"} and ${monitoringMatrix.totals.scaleReviews} scale review${monitoringMatrix.totals.scaleReviews === 1 ? "" : "s"} are queued.`
      ],
      status: monitoringMatrix.totals.immediateRotationReviews === 0
        ? monitoringMatrix.totals.manualSnapshots + monitoringMatrix.totals.readOnlyImports <= options.safeBatchSize ? "pass" : "watch"
        : "watch",
      title: "Monitoring Cadence"
    }),
    operationsGate({
      actionEndpoint: input.pipeline.nextStage?.endpoint ?? "/merch/revenue-engine/money-army/batches",
      evidence: [
        `${input.pipeline.totals.readyStages} Money Army stage${input.pipeline.totals.readyStages === 1 ? "" : "s"} ready.`,
        `Next stage: ${input.pipeline.nextStage?.title ?? "watch mode"}.`,
        `${input.pipeline.totals.seedCandidates} seed candidate${input.pipeline.totals.seedCandidates === 1 ? "" : "s"} currently available.`
      ],
      status: input.pipeline.totals.readyStages > 0 ? "pass" : storeGap > 0 ? "watch" : "pass",
      title: "Money Army Batch Pipeline"
    }),
    operationsGate({
      actionEndpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-autonomy-run/apply",
      evidence: [
        `${autonomyRunQueue.totals.readyInternal} ready internal autonomy job${autonomyRunQueue.totals.readyInternal === 1 ? "" : "s"}.`,
        `${autonomyRunQueue.totals.approvalRequired} approval-routed job${autonomyRunQueue.totals.approvalRequired === 1 ? "" : "s"} and ${autonomyRunQueue.totals.blocked} blocked job${autonomyRunQueue.totals.blocked === 1 ? "" : "s"}.`,
        `${autonomyRunQueue.totals.cleanParallelJobs} clean parallel job${autonomyRunQueue.totals.cleanParallelJobs === 1 ? "" : "s"} fit current shard caps.`
      ],
      status: autonomyRunQueue.totals.blocked === 0 && autonomyRunQueue.totals.cleanParallelJobs > 0
        ? "pass"
        : autonomyRunQueue.totals.readyInternal + autonomyRunQueue.totals.approvalRequired > 0 ? "watch" : "block",
      title: "Autonomy Run Queue"
    }),
    operationsGate({
      actionEndpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-work-leases/apply",
      evidence: [
        `${workLeasePlan.totals.readyToClaim} work lease${workLeasePlan.totals.readyToClaim === 1 ? "" : "s"} ready to claim and ${workLeasePlan.totals.approvalHold} approval-held.`,
        `${workLeasePlan.totals.cleanParallelLeases} clean parallel lease${workLeasePlan.totals.cleanParallelLeases === 1 ? "" : "s"} fit current shard caps with max ${workLeasePlan.totals.maxLeasesPerShard} lease${workLeasePlan.totals.maxLeasesPerShard === 1 ? "" : "s"} per shard.`,
        `${workLeasePlan.totals.blocked} blocked lease${workLeasePlan.totals.blocked === 1 ? "" : "s"} remain visible but not claimable.`,
        `${workLeasePlan.totals.duplicateDedupeKeys} duplicate dedupe key${workLeasePlan.totals.duplicateDedupeKeys === 1 ? "" : "s"} detected.`
      ],
      status: workLeasePlan.totals.duplicateDedupeKeys > 0
        ? "block"
        : workLeasePlan.totals.cleanParallelLeases > 0 ? "pass" : "watch",
      title: "Internal Work Leases"
    }),
    operationsGate({
      actionEndpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-worker-assignments/apply",
      evidence: [
        `${workerAssignmentPlan.totals.readyToAssign} worker assignment${workerAssignmentPlan.totals.readyToAssign === 1 ? "" : "s"} ready across ${workerAssignmentPlan.totals.laneCount} chain-of-command lane${workerAssignmentPlan.totals.laneCount === 1 ? "" : "s"}.`,
        `${workerAssignmentPlan.totals.approvalHold} approval-held, ${workerAssignmentPlan.totals.waitingDependency} waiting, and ${workerAssignmentPlan.totals.blocked} blocked assignment${workerAssignmentPlan.totals.blocked === 1 ? "" : "s"} remain visible.`,
        `${workerAssignmentPlan.totals.duplicateDedupeKeys} duplicate lease dedupe key${workerAssignmentPlan.totals.duplicateDedupeKeys === 1 ? "" : "s"} carried into assignment planning.`
      ],
      status: workerAssignmentPlan.totals.duplicateDedupeKeys > 0
        ? "block"
        : workerAssignmentPlan.totals.readyToAssign > 0 ? "pass" : "watch",
      title: "Chain Of Command Assignments"
    }),
    operationsGate({
      actionEndpoint: "/merch/financial-orchestrator/plan",
      evidence: [
        `${input.plan.totals.scale} scale lane${input.plan.totals.scale === 1 ? "" : "s"} and ${input.plan.totals.launchNow} launch-now lane${input.plan.totals.launchNow === 1 ? "" : "s"}.`,
        `${money(input.plan.businesses.reduce((sum, business) => sum + business.profitVelocity, 0))}/day current profit velocity.`,
        `${growthAllocationRouter.totals.paidScaleReview} paid-scale review route${growthAllocationRouter.totals.paidScaleReview === 1 ? "" : "s"} and ${growthAllocationRouter.totals.organicFirst} organic-first route${growthAllocationRouter.totals.organicFirst === 1 ? "" : "s"} are ready for advisory Ad/Growth allocation.`,
        "Financial Orchestrator remains advisory until owner spend approval."
      ],
      status: input.plan.totals.scale > 0 || input.plan.totals.launchNow > 0 ? "pass" : currentStores > 0 ? "watch" : "block",
      title: "Profit Acceleration"
    }),
    operationsGate({
      actionEndpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-operations",
      evidence: [
        safetyClear ? "All inspected fleet, gap, and pipeline plans report external execution locked." : "One inspected plan reported an unsafe external/provider flag.",
        controlGrid.safeToRunParallelInternalJobs ? "The 100-store control grid has no overloaded shard or blocked application-readiness row." : "The 100-store control grid has a blocked application row or overloaded shard.",
        "Provider writes, browser automation, uploads, publishing, ad spend, card charges, payouts, and bank movement stay blocked.",
        "Every next action routes through an internal endpoint with confirmation text."
      ],
      status: safetyClear ? "pass" : "block",
      title: "Safety Envelope"
    })
  ];
  const topScaleCandidates = input.plan.businesses
    .filter((business) => business.lane === "scale" || business.lane === "launch_now")
    .sort((left, right) => (
      right.score.scalePressure - left.score.scalePressure
      || right.profitVelocity - left.profitVelocity
      || right.score.finalRank - left.score.finalRank
    ))
    .slice(0, 10)
    .map((business) => ({
      businessId: business.businessId,
      businessName: business.businessName,
      profitVelocity: business.profitVelocity,
      scalePressure: business.score.scalePressure,
      shardId: business.shardId
    }));
  const safePipelineNextStage = input.pipeline.nextStage
    && (input.pipeline.nextStage.name !== "batch_creation" || storeGap > 0)
    ? input.pipeline.nextStage
    : null;
  const nextActions: RevenueHundredStoreOperationsNextAction[] = [
    ...(safePipelineNextStage ? [
      operationsNextAction({
        confirmation: safePipelineNextStage.requiredConfirmation,
        endpoint: safePipelineNextStage.endpoint,
        expectedInternalEffect: safePipelineNextStage.expectedInternalEffect,
        priority: 1,
        reason: safePipelineNextStage.reason,
        status: safePipelineNextStage.status,
        title: safePipelineNextStage.title
      })
    ] : []),
    ...(storeGap > 0 ? [
      operationsNextAction({
        confirmation: "CREATE INTERNAL BUSINESS FLEET GAP SEEDS",
        endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/seeds/apply",
        expectedInternalEffect: `Create the next ${recommendedBatchSize} private store shell${recommendedBatchSize === 1 ? "" : "s"} with internal product drafts.`,
        priority: 2,
        reason: `${storeGap} stores remain before the 100-store operating floor; safe batch size is ${options.safeBatchSize}.`,
        status: input.gapPlan.opportunitySeeds.length > 0 ? "ready" : "waiting",
        title: "Create the next 100-store batch"
      })
    ] : []),
    ...(productDraftDeficit > 0 ? [
      operationsNextAction({
        confirmation: "RECORD INTERNAL 100 STORE PRODUCT DEPTH DRAFTS",
        endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-product-depth/apply",
        expectedInternalEffect: `Record up to ${productDepthQueue.totals.maxSelectableDrafts} internal product-depth draft packet${productDepthQueue.totals.maxSelectableDrafts === 1 ? "" : "s"} across current stores and future store slots.`,
        priority: 3,
        reason: `100-store operations require at least ${options.minProductsPerStore} products per store; ${productDepthQueue.totals.drafts} internal draft packet${productDepthQueue.totals.drafts === 1 ? "" : "s"} are queued.`,
        status: productDepthQueue.totals.drafts > 0 ? "ready" : "waiting",
        title: "Fill product depth for 100 stores"
      })
    ] : []),
    ...(launchPacketQueue.totals.packets > 0 ? [
      operationsNextAction({
        confirmation: "RECORD INTERNAL 100 STORE LAUNCH PACKETS",
        endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-launch-packets/apply",
        expectedInternalEffect: `Record up to ${launchPacketQueue.totals.maxSelectablePackets} internal launch packet${launchPacketQueue.totals.maxSelectablePackets === 1 ? "" : "s"} for ready and planned store lanes.`,
        priority: 4,
        reason: `${launchPacketQueue.totals.readyForReview} packets are ready for internal launch review and ${launchPacketQueue.totals.waitingForStoreShell} future packets are waiting for store shells.`,
        status: launchPacketQueue.totals.readyForReview + launchPacketQueue.totals.waitingForStoreShell > 0 ? "ready" : "waiting",
        title: "Record 100-store launch packets"
      })
    ] : []),
    ...(connectorActivationMatrix.totals.rows > 0 ? [
      operationsNextAction({
        confirmation: "RECORD INTERNAL 100 STORE CONNECTOR ACTIVATION MATRIX",
        endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-connector-activation/apply",
        expectedInternalEffect: `Record up to ${connectorActivationMatrix.totals.maxSelectableRows} connector activation readiness row${connectorActivationMatrix.totals.maxSelectableRows === 1 ? "" : "s"} for 100-store app connection design.`,
        priority: 5,
        reason: `${connectorActivationMatrix.totals.readyForConnectionDesign} rows are ready for design and ${connectorActivationMatrix.totals.credentialCustodyRequired} require credential custody approval.`,
        status: connectorActivationMatrix.totals.readyForConnectionDesign + connectorActivationMatrix.totals.credentialCustodyRequired > 0 ? "ready" : "waiting",
        title: "Record connector activation matrix"
      })
    ] : []),
    ...(autonomyRunQueue.totals.jobs > 0 ? [
      operationsNextAction({
        confirmation: "RECORD INTERNAL 100 STORE AUTONOMY RUN",
        endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-autonomy-run/apply",
        expectedInternalEffect: `Record up to ${autonomyRunQueue.totals.maxSelectableJobs} internal autonomy job${autonomyRunQueue.totals.maxSelectableJobs === 1 ? "" : "s"} for the 100-store chain of command.`,
        priority: 6,
        reason: `${autonomyRunQueue.totals.readyInternal} jobs are ready for internal automation and ${autonomyRunQueue.totals.approvalRequired} jobs are routed to approval gates.`,
        status: autonomyRunQueue.totals.readyInternal + autonomyRunQueue.totals.approvalRequired > 0 ? "ready" : "waiting",
        title: "Record 100-store autonomy run"
      })
    ] : []),
    ...(workLeasePlan.totals.leases > 0 ? [
      operationsNextAction({
        confirmation: "RECORD INTERNAL 100 STORE WORK LEASES",
        endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-work-leases/apply",
        expectedInternalEffect: `Record up to ${workLeasePlan.totals.maxSelectableLeases} deduped internal work lease${workLeasePlan.totals.maxSelectableLeases === 1 ? "" : "s"} for clean 100-store parallel operations.`,
        priority: 7,
        reason: `${workLeasePlan.totals.readyToClaim} leases are ready to claim, ${workLeasePlan.totals.approvalHold} are approval-held, and ${workLeasePlan.totals.cleanParallelLeases} fit shard caps.`,
        status: workLeasePlan.totals.readyToClaim + workLeasePlan.totals.approvalHold > 0 ? "ready" : "waiting",
        title: "Record 100-store work leases"
      })
    ] : []),
    ...(workerAssignmentPlan.totals.readyToAssign + workerAssignmentPlan.totals.approvalHold > 0 ? [
      operationsNextAction({
        confirmation: "RECORD INTERNAL 100 STORE WORKER ASSIGNMENTS",
        endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-worker-assignments/apply",
        expectedInternalEffect: `Record up to ${workerAssignmentPlan.totals.maxSelectableAssignments} internal worker assignment${workerAssignmentPlan.totals.maxSelectableAssignments === 1 ? "" : "s"} across capped chain-of-command lanes.`,
        priority: 8,
        reason: `${workerAssignmentPlan.totals.readyToAssign} assignments are ready, ${workerAssignmentPlan.totals.approvalHold} are approval-held, and ${workerAssignmentPlan.totals.laneCount} lanes are mapped.`,
        status: workerAssignmentPlan.totals.readyToAssign + workerAssignmentPlan.totals.approvalHold > 0 ? "ready" : "waiting",
        title: "Record 100-store worker assignments"
      })
    ] : []),
    ...(input.plan.totals.qualityRepair > 0 || input.plan.totals.kill > 0 ? [
      operationsNextAction({
        confirmation: "APPLY INTERNAL ASSET ACTION",
        endpoint: "/merch/revenue-engine/review-queue",
        expectedInternalEffect: "Repair, pause, or kill weak lanes so they cannot consume launch capacity.",
        priority: 9,
        reason: `${input.plan.totals.qualityRepair} repair lane${input.plan.totals.qualityRepair === 1 ? "" : "s"} and ${input.plan.totals.kill} kill lane${input.plan.totals.kill === 1 ? "" : "s"} must be cleared for clean parallel operation.`,
        status: "ready",
        title: "Clear weak store lanes"
      })
    ] : []),
    ...(approvalPacketsWaiting > 0 || approvalPacketsReady > 0 ? [
      operationsNextAction({
        confirmation: "REVIEW INTERNAL BUSINESS FLEET PROVIDER APPROVALS",
        endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/provider-approval-review/apply",
        expectedInternalEffect: "Approve or reject provider packets as internal handoff records only.",
        priority: 10,
        reason: `${approvalPacketsReady + approvalPacketsWaiting} provider approval packet${approvalPacketsReady + approvalPacketsWaiting === 1 ? "" : "s"} exist across the current fleet buildout.`,
        status: approvalPacketsReady > 0 ? "ready" : "waiting",
        title: "Review connector handoff packets"
      })
    ] : [])
  ].sort((left, right) => left.priority - right.priority);
  const dailyOperatingLoop = buildRevenueHundredStoreDailyOperatingLoop({
    applicationConnectionWorkbench,
    autonomyRunQueue,
    connectorActivationMatrix,
    generatedAt: input.generatedAt,
    growthAllocationRouter,
    launchPacketQueue,
    monitoringMatrix,
    nextActions,
    options,
    productDraftDeficit,
    productDepthQueue,
    safetyClear,
    storeGap,
    workerAssignmentPlan,
    workLeasePlan
  });
  const capacityProof = buildRevenueHundredStoreCapacityProof({
    applicationConnectionWorkbench,
    connectorActivationMatrix,
    controlGrid,
    dailyOperatingLoop,
    generatedAt: input.generatedAt,
    growthAllocationRouter,
    monitoringMatrix,
    options,
    productDraftDeficit,
    safetyClear,
    storeGap,
    workerAssignmentPlan,
    workLeasePlan
  });
  const readinessScore = gateScore(gates);
  const operatingStatus = operationsStatus({
    gates,
    plan: input.plan,
    storeGap
  });
  const gatesPass = gates.filter((gate) => gate.status === "pass").length;
  const gatesWatch = gates.filter((gate) => gate.status === "watch").length;
  const gatesBlocked = gates.filter((gate) => gate.status === "block").length;
  const dailyProfitVelocity = money(input.plan.businesses.reduce((sum, business) => sum + business.profitVelocity, 0));
  const dailyRevenueVelocity = money(input.plan.businesses.reduce((sum, business) => sum + business.revenueVelocity, 0));

  return {
    auditEvents: [
      "100 Store Operations Readiness assembled Business Fleet scheduling, launch gap planning, Money Army batch stages, and provider packet readiness.",
      "The plan is internal and advisory; no provider, marketplace, browser, upload, publishing, ad spend, payment, bank, payout, or external write action was executed.",
      "Profit acceleration prioritizes launch-now and scale lanes while weak lanes are routed to repair, pause, or kill review.",
      "Application connection workbench packets prepare required app roles without creating credentials, OAuth grants, provider calls, browser sessions, or live jobs.",
      "100 Store Connector Activation Matrix prepares credential custody, read-only scope, dry-run request, write-scope block, and rollback readiness for every required application row.",
      "100 Store Monitoring Matrix keeps every visible store on a signal cadence before autonomous launch or scale work is expanded.",
      "100 Store Growth Allocation Router maps the Financial Orchestrator 25% Ad/Growth bucket into advisory store priorities without authorizing spend.",
      "100 Store Daily Operating Loop sequences the private command cadence without bypassing confirmations or audit trails.",
      "100 Store Autonomy Run Queue tells the chain of command which internal work can run now, which needs approval, and which remains waiting or blocked.",
      "100 Store Internal Work Lease Plan dedupes and shard-caps autonomy jobs so parallel work can be claimed cleanly.",
      "100 Store Chain Of Command Assignment Plan routes claimable leases into capped worker lanes before work begins.",
      "100 Store Capacity Proof stress-tests whether shards, application prep, monitoring, supervisor control, work leasing, worker assignment, batch/product depth, and growth guardrails can carry the 100-store floor."
    ],
    applicationConnectionWorkbench,
    autonomyRunQueue,
    batchPlan: {
      batchRunsRequired,
      currentStores,
      productDraftDeficit,
      recommendedBatchSize,
      storeGap,
      targetStores: options.targetStores
    },
    blockedExternalActions: unique([
      ...input.plan.blockedExternalActions,
      ...input.gapPlan.blockedExternalActions,
      ...input.pipeline.blockedExternalActions,
      ...autonomyRunQueue.blockedExternalActions,
      ...workLeasePlan.blockedExternalActions,
      ...workerAssignmentPlan.blockedExternalActions,
      ...connectorActivationMatrix.blockedExternalActions,
      ...(input.liveConnectorReadiness?.blockedExternalActions ?? []),
      ...blockedFleetActions
    ]),
    applicationReadiness,
    concurrency: {
      configuredParallelSlots: input.plan.capacity.parallelSlotsConfigured,
      currentShards: input.plan.shards.length,
      maxStoresPerShard: options.maxStoresPerShard,
      minimumRecommendedShards,
      overloadedShardIds,
      safeInternalJobSlots: input.plan.shards.reduce((sum, shard) => sum + shard.capacity, 0),
      shardCount: input.plan.capacity.shardCount
    },
    connectorActivationMatrix,
    controlGrid,
    externalExecution: false,
    gates,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    growthAllocationRouter,
    workerAssignmentPlan,
    dailyOperatingLoop,
    capacityProof,
    launchPacketQueue,
    mode: "100 Store Operations Readiness",
    monitoringMatrix,
    nextActions,
    operatingStatus,
    pipeline: {
      blockedStages: input.pipeline.totals.blockedStages,
      nextStage: input.pipeline.nextStage?.name ?? null,
      readyStages: input.pipeline.totals.readyStages,
      seedCandidates: input.pipeline.totals.seedCandidates,
      stages: input.pipeline.totals.stages
    },
    profitAcceleration: {
      dailyProfitVelocity,
      dailyRevenueVelocity,
      killLaneStores: input.plan.totals.kill,
      launchNowStores: input.plan.totals.launchNow,
      repairLaneStores: input.plan.totals.qualityRepair,
      scaleLaneStores: input.plan.totals.scale,
      topScaleCandidates
    },
    productDepthQueue,
    providerContacted: false,
    readinessScore,
    summary: `${readinessScore}/100 readiness for ${options.targetStores}-store internal operations. ${currentStores}/${options.targetStores} stores tracked, ${storeGap} store gap, ${input.plan.totals.readyParallel} ready-parallel lanes, ${input.plan.totals.scale} scale lanes, ${input.plan.totals.qualityRepair} repair lanes, and ${input.pipeline.totals.readyStages} Money Army stage${input.pipeline.totals.readyStages === 1 ? "" : "s"} ready. External execution remains locked.`,
    totals: {
      approvalPacketsReady,
      approvalPacketsWaiting,
      currentStores,
      gatesBlocked,
      gatesPass,
      gatesWatch,
      readyParallelStores: input.plan.totals.readyParallel,
      storeGap,
      targetStores: options.targetStores
    },
    workLeasePlan
  };
}

function commandShapeForAction(action: RevenueHundredStoreOperationsNextAction): {
  action: RevenueHundredStoreOperationsCommandAction;
  requiresManualSelection: boolean;
  stage: RevenueMoneyArmyBatchPipelineStageName | null;
} {
  if (action.endpoint.includes("/launch-gap/seeds/apply")) {
    return {
      action: "run_money_army_batch_creation",
      requiresManualSelection: false,
      stage: "batch_creation"
    };
  }

  if (action.endpoint.includes("/launch-gap/acceleration/apply")) {
    return {
      action: "run_money_army_batch_acceleration",
      requiresManualSelection: false,
      stage: "batch_acceleration"
    };
  }

  if (action.endpoint.includes("/100-store-product-depth/apply")) {
    return {
      action: "record_product_depth_drafts",
      requiresManualSelection: false,
      stage: null
    };
  }

  if (action.endpoint.includes("/100-store-launch-packets/apply")) {
    return {
      action: "record_launch_packets",
      requiresManualSelection: false,
      stage: null
    };
  }

  if (action.endpoint.includes("/100-store-connector-activation/apply")) {
    return {
      action: "record_connector_activation_matrix",
      requiresManualSelection: false,
      stage: null
    };
  }

  if (action.endpoint.includes("/100-store-autonomy-run/apply")) {
    return {
      action: "record_autonomy_run_queue",
      requiresManualSelection: false,
      stage: null
    };
  }

  if (action.endpoint.includes("/100-store-work-leases/apply")) {
    return {
      action: "record_work_leases",
      requiresManualSelection: false,
      stage: null
    };
  }

  if (action.endpoint.includes("/100-store-worker-assignments/apply")) {
    return {
      action: "record_worker_assignments",
      requiresManualSelection: false,
      stage: null
    };
  }

  if (action.endpoint.includes("/launch-gap/live-package/apply")) {
    return {
      action: "run_money_army_launch_package",
      requiresManualSelection: false,
      stage: "launch_package"
    };
  }

  if (action.endpoint.includes("/provider-approval-review/apply")) {
    return {
      action: "run_money_army_approval",
      requiresManualSelection: false,
      stage: "approval"
    };
  }

  if (action.endpoint.includes("/launch-wave/apply")) {
    return {
      action: "run_money_army_deployment",
      requiresManualSelection: false,
      stage: "deployment"
    };
  }

  return {
    action: "manual_quality_review",
    requiresManualSelection: true,
    stage: null
  };
}

function commandMaxItems(input: {
  action: RevenueHundredStoreOperationsCommandAction;
  operations: RevenueHundredStoreOperationsPlan;
}) {
  if (input.action === "run_money_army_batch_creation") {
    return input.operations.batchPlan.recommendedBatchSize;
  }

  if (input.action === "run_money_army_batch_acceleration") {
    return Math.min(
      defaultRevenueHundredStoreOperationsOptions.safeBatchSize,
      Math.max(input.operations.totals.currentStores, 1)
    );
  }

  if (input.action === "record_product_depth_drafts") {
    return input.operations.productDepthQueue.totals.maxSelectableDrafts;
  }

  if (input.action === "record_launch_packets") {
    return input.operations.launchPacketQueue.totals.maxSelectablePackets;
  }

  if (input.action === "record_connector_activation_matrix") {
    return input.operations.connectorActivationMatrix.totals.maxSelectableRows;
  }

  if (input.action === "record_autonomy_run_queue") {
    return input.operations.autonomyRunQueue.totals.maxSelectableJobs;
  }

  if (input.action === "record_work_leases") {
    return input.operations.workLeasePlan.totals.maxSelectableLeases;
  }

  if (input.action === "record_worker_assignments") {
    return input.operations.workerAssignmentPlan.totals.maxSelectableAssignments;
  }

  if (input.action === "run_money_army_launch_package" || input.action === "run_money_army_deployment") {
    return Math.min(
      defaultRevenueHundredStoreOperationsOptions.safeBatchSize,
      Math.max(input.operations.totals.readyParallelStores, 1)
    );
  }

  if (input.action === "run_money_army_approval") {
    return Math.max(input.operations.totals.approvalPacketsReady, 1);
  }

  return Math.max(input.operations.profitAcceleration.repairLaneStores + input.operations.profitAcceleration.killLaneStores, 1);
}

export function buildRevenueHundredStoreOperationsCommandPlan(input: {
  generatedAt?: string;
  operations: RevenueHundredStoreOperationsPlan;
}): RevenueHundredStoreOperationsCommandPlan {
  const commandMap = new Map<string, RevenueHundredStoreOperationsCommand>();

  for (const action of input.operations.nextActions) {
    const shape = commandShapeForAction(action);
    const commandId = shape.stage ?? `${shape.action}:${action.endpoint}`;

    if (commandMap.has(commandId)) continue;

    commandMap.set(commandId, {
      action: shape.action,
      commandId,
      confirmation: action.confirmation,
      endpoint: action.endpoint,
      expectedInternalEffect: action.expectedInternalEffect,
      externalExecution: false,
      maxItems: commandMaxItems({
        action: shape.action,
        operations: input.operations
      }),
      priority: action.priority,
      providerContacted: false,
      reason: action.reason,
      requiresManualSelection: shape.requiresManualSelection,
      sourceActionTitle: action.title,
      stage: shape.stage,
      status: action.status
    });
  }

  const commands = [...commandMap.values()].sort((left, right) => left.priority - right.priority);
  const selectedCommand = commands.find((command) => (
    command.status === "ready"
    && !command.requiresManualSelection
    && command.stage !== null
    && command.maxItems > 0
  )) ?? null;
  const ready = commands.filter((command) => command.status === "ready").length;
  const waiting = commands.filter((command) => command.status === "waiting").length;
  const blocked = commands.filter((command) => command.status === "blocked").length;
  const manualReview = commands.filter((command) => command.requiresManualSelection).length;
  const executable = commands.filter((command) => (
    command.status === "ready"
    && !command.requiresManualSelection
    && command.stage !== null
    && command.maxItems > 0
  )).length;

  return {
    auditEvents: [
      "100 Store Operations Command Queue converted readiness next-actions into bounded internal commands.",
      "Selected commands can only route through existing Money Army and Business Fleet internal endpoints.",
      "Manual quality review commands are surfaced but not auto-applied because they require explicit asset selection."
    ],
    blockedExternalActions: input.operations.blockedExternalActions,
    commands,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "100 Store Operations Command Queue",
    providerContacted: false,
    selectedCommand,
    summary: selectedCommand
      ? `${selectedCommand.sourceActionTitle} is selected as the next bounded 100-store command for up to ${selectedCommand.maxItems} item${selectedCommand.maxItems === 1 ? "" : "s"}. External execution remains locked.`
      : commands.length > 0
        ? `${commands.length} 100-store command${commands.length === 1 ? "" : "s"} require waiting or manual review before automatic internal execution.`
        : "No 100-store command is ready; operations remain in watch mode.",
    totals: {
      blocked,
      commands: commands.length,
      executable,
      manualReview,
      ready,
      waiting
    }
  };
}

function supervisorActionForStep(
  step: RevenueHundredStoreDailyOperatingLoopStep
): RevenueHundredStoreDailySupervisorAction {
  if (step.phase === "safety_gate_snapshot") return "confirm_safety";
  if (step.phase === "application_connection_packets") return "record_app_connection_packets";
  if (step.phase === "connector_activation_matrix") return "record_connector_activation_matrix";
  if (step.phase === "monitoring_cycle") return "record_monitoring_cycle";
  if (step.phase === "growth_allocation_review") return "review_growth_allocation";
  if (step.phase === "product_depth_repair") return "record_product_depth_drafts";
  if (step.phase === "launch_packet_review") return "record_launch_packets";
  if (step.phase === "autonomy_run_queue") return "record_autonomy_run_queue";
  if (step.phase === "work_lease_claims") return "record_work_leases";
  if (step.phase === "worker_assignment_claims") return "record_worker_assignments";
  if (step.phase === "store_batch_creation") return "run_money_army_step";
  if (step.phase === "weak_lane_rotation") return "manual_review";

  return "wait";
}

function supervisorStatusForStep(input: {
  action: RevenueHundredStoreDailySupervisorAction;
  mode: RevenueHundredStoreDailySupervisorMode;
  step: RevenueHundredStoreDailyOperatingLoopStep;
}): RevenueHundredStoreDailySupervisorStatus {
  if (input.step.status === "blocked") return "blocked";
  if (input.action === "manual_review") return "manual_only";
  if (input.step.status === "waiting") return "waiting";
  if (input.action === "run_money_army_step" && input.step.phase === "store_batch_creation" && input.mode !== "include_batch_creation") {
    return "approval_required";
  }

  if (input.step.status === "ready") return "selected";
  if (input.step.status === "approval_required") return "approval_required";

  return "waiting";
}

function supervisorStep(input: {
  mode: RevenueHundredStoreDailySupervisorMode;
  step: RevenueHundredStoreDailyOperatingLoopStep;
}): RevenueHundredStoreDailySupervisorStep {
  const action = supervisorActionForStep(input.step);
  const status = supervisorStatusForStep({
    action,
    mode: input.mode,
    step: input.step
  });

  return {
    action,
    blockers: [
      ...input.step.blockers,
      ...(action === "run_money_army_step" && input.step.phase === "store_batch_creation" && input.mode !== "include_batch_creation"
        ? ["Batch creation is held until the supervisor is run in include-batch-creation mode."]
        : [])
    ],
    confirmation: input.step.confirmation,
    endpoint: input.step.endpoint,
    expectedInternalEffect: input.step.expectedInternalEffect,
    externalExecution: false,
    maxItems: input.step.maxItems,
    phase: input.step.phase,
    priority: input.step.priority,
    providerContacted: false,
    reason: input.step.reason,
    requiresOwnerApproval: input.step.approvalRequired || status === "approval_required" || action === "run_money_army_step",
    sourceStatus: input.step.status,
    status,
    stepId: input.step.stepId,
    title: input.step.title
  };
}

export function buildRevenueHundredStoreDailySupervisorPlan(input: {
  generatedAt?: string;
  maxSteps?: number;
  mode?: RevenueHundredStoreDailySupervisorMode;
  operations: RevenueHundredStoreOperationsPlan;
}): RevenueHundredStoreDailySupervisorPlan {
  const operatingMode = input.mode ?? "safe_internal_only";
  const maxSteps = clamp(Math.round(input.maxSteps ?? 4), 1, 10);
  const steps = input.operations.dailyOperatingLoop.steps
    .map((step) => supervisorStep({
      mode: operatingMode,
      step
    }))
    .sort((left, right) => left.priority - right.priority);
  const selectedSteps = steps
    .filter((step) => step.status === "selected")
    .slice(0, maxSteps);
  const statusCount = (status: RevenueHundredStoreDailySupervisorStatus) => steps.filter((step) => step.status === status).length;

  return {
    auditEvents: [
      "100 Store Daily Supervisor selected bounded internal loop steps from the daily operating loop.",
      "Supervisor steps can only call existing private endpoints for safety review, app packet recording, monitoring evidence, advisory growth review, or Money Army internal stages.",
      "Store batch creation is held unless include-batch-creation mode is explicitly selected; no external provider, marketplace, ad, payment, payout, browser, upload, publishing, or bank action is authorized."
    ],
    blockedExternalActions: [
      ...input.operations.dailyOperatingLoop.blockedExternalActions,
      "Turning a supervisor cycle into provider, marketplace, ad, payment, payout, upload, browser, social, bank, or external write execution",
      "Running store batch creation unless the supervisor request explicitly selects include-batch-creation mode"
    ],
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "100 Store Daily Supervisor",
    operatingMode,
    providerContacted: false,
    selectedSteps,
    steps,
    summary: `${selectedSteps.length}/${steps.length} daily supervisor step${selectedSteps.length === 1 ? "" : "s"} selected in ${operatingMode.replace(/_/g, " ")} mode for up to ${maxSteps} private internal action${maxSteps === 1 ? "" : "s"}. External execution remains locked.`,
    totals: {
      approvalRequired: statusCount("approval_required"),
      blocked: statusCount("blocked"),
      manualOnly: statusCount("manual_only"),
      maxSteps,
      selected: selectedSteps.length,
      storesCovered: input.operations.dailyOperatingLoop.totals.storesCovered,
      waiting: statusCount("waiting")
    }
  };
}

function capacityProofCheck(
  input: Omit<RevenueHundredStoreCapacityProofCheck, "externalExecution" | "providerContacted">
): RevenueHundredStoreCapacityProofCheck {
  return {
    ...input,
    externalExecution: false,
    providerContacted: false
  };
}

function capacityProofStatus(checks: RevenueHundredStoreCapacityProofCheck[]): RevenueHundredStoreCapacityProofStatus {
  if (checks.some((check) => check.status === "block")) return "block";
  if (checks.some((check) => check.status === "watch")) return "watch";

  return "pass";
}

function buildRevenueHundredStoreCapacityProof(input: {
  applicationConnectionWorkbench: RevenueHundredStoreApplicationConnectionWorkbench;
  connectorActivationMatrix: RevenueHundredStoreConnectorActivationMatrix;
  controlGrid: RevenueHundredStoreControlGrid;
  dailyOperatingLoop: RevenueHundredStoreDailyOperatingLoop;
  generatedAt?: string;
  growthAllocationRouter: RevenueHundredStoreGrowthAllocationRouter;
  monitoringMatrix: RevenueHundredStoreMonitoringMatrix;
  options: RevenueHundredStoreOperationsOptions;
  productDraftDeficit: number;
  safetyClear: boolean;
  storeGap: number;
  workerAssignmentPlan: RevenueHundredStoreWorkerAssignmentPlan;
  workLeasePlan: RevenueHundredStoreWorkLeasePlan;
}): RevenueHundredStoreCapacityProof {
  const requiredApplicationBoundaries = input.options.targetStores * hundredStoreApplicationRequirements.length;
  const preparedApplicationBoundaries = input.applicationConnectionWorkbench.totals.packets
    + input.applicationConnectionWorkbench.totals.futureStoreTemplates;
  const applicationBoundaryCoveragePercent = requiredApplicationBoundaries === 0
    ? 100
    : clamp(Math.round((preparedApplicationBoundaries / requiredApplicationBoundaries) * 100), 0, 999);
  const shardCapacity = input.controlGrid.totals.configuredShards * input.options.maxStoresPerShard;
  const maximumCleanStoresAtShardLimit = Math.min(input.options.targetStores, shardCapacity);
  const monitoringSweepCycles = Math.max(1, Math.ceil(input.options.targetStores / input.options.safeBatchSize));
  const futureStoreSlotsCovered = Math.min(
    input.storeGap,
    Math.floor(input.applicationConnectionWorkbench.totals.futureStoreTemplates / hundredStoreApplicationRequirements.length)
  );
  const projectedDailySupervisorSteps = input.dailyOperatingLoop.steps.length;
  const cleanSimultaneousStoreCapacity = Math.min(
    input.options.targetStores,
    maximumCleanStoresAtShardLimit,
    applicationBoundaryCoveragePercent >= 100 ? input.options.targetStores : Math.floor(preparedApplicationBoundaries / hundredStoreApplicationRequirements.length),
    monitoringSweepCycles <= 4 ? input.options.targetStores : input.options.safeBatchSize * 4
  );
  const checks: RevenueHundredStoreCapacityProofCheck[] = [
    capacityProofCheck({
      capacity: shardCapacity,
      checkId: "shard_capacity",
      evidence: [
        `${input.controlGrid.totals.configuredShards} configured shard${input.controlGrid.totals.configuredShards === 1 ? "" : "s"} at ${input.options.maxStoresPerShard} stores per shard.`,
        `${input.controlGrid.totals.overloadedShards} overloaded shard${input.controlGrid.totals.overloadedShards === 1 ? "" : "s"} detected.`,
        `${maximumCleanStoresAtShardLimit}/${input.options.targetStores} projected stores fit inside the current shard ceiling.`
      ],
      gap: Math.max(0, input.options.targetStores - shardCapacity),
      nextInternalAction: shardCapacity >= input.options.targetStores && input.controlGrid.totals.overloadedShards === 0
        ? "Keep shard density under the configured ceiling as batches are created."
        : "Increase shard count or reduce stores per overloaded shard before expanding parallel work.",
      projectedLoad: input.options.targetStores,
      status: shardCapacity >= input.options.targetStores && input.controlGrid.totals.overloadedShards === 0 ? "pass" : "block",
      title: "Shard Capacity"
    }),
    capacityProofCheck({
      capacity: preparedApplicationBoundaries,
      checkId: "application_boundary_preparation",
      evidence: [
        `${preparedApplicationBoundaries}/${requiredApplicationBoundaries} current packets plus future templates cover required application boundaries.`,
        `${input.applicationConnectionWorkbench.totals.readyPackets} ready packet${input.applicationConnectionWorkbench.totals.readyPackets === 1 ? "" : "s"}, ${input.applicationConnectionWorkbench.totals.alreadyMappedPackets} already mapped, and ${input.applicationConnectionWorkbench.totals.blockedPackets} blocked by store quality.`,
        `${futureStoreSlotsCovered}/${input.storeGap} future store slot${input.storeGap === 1 ? "" : "s"} have reusable application templates.`
      ],
      gap: Math.max(0, requiredApplicationBoundaries - preparedApplicationBoundaries),
      nextInternalAction: preparedApplicationBoundaries >= requiredApplicationBoundaries
        ? "Record ready app packets and keep reusable templates attached to every new store shell."
        : "Generate missing application connection packets/templates before store count expands.",
      projectedLoad: requiredApplicationBoundaries,
      status: preparedApplicationBoundaries >= requiredApplicationBoundaries
        ? input.applicationConnectionWorkbench.totals.blockedPackets > 0 ? "watch" : "pass"
        : "block",
      title: "Application Boundary Preparation"
    }),
    capacityProofCheck({
      capacity: input.connectorActivationMatrix.totals.rows,
      checkId: "connector_activation_readiness",
      evidence: [
        `${input.connectorActivationMatrix.totals.rows}/${requiredApplicationBoundaries} connector activation row${requiredApplicationBoundaries === 1 ? "" : "s"} prepared across current and future stores.`,
        `${input.connectorActivationMatrix.totals.readyForConnectionDesign} ready for connection design and ${input.connectorActivationMatrix.totals.credentialCustodyRequired} waiting on credential custody review.`,
        `${input.connectorActivationMatrix.totals.blockedByQuality} connector row${input.connectorActivationMatrix.totals.blockedByQuality === 1 ? "" : "s"} blocked by store quality stay in repair/watch and cannot be claimed.`,
        `${input.connectorActivationMatrix.totals.dryRunRequestMaps} dry-run request map${input.connectorActivationMatrix.totals.dryRunRequestMaps === 1 ? "" : "s"} prepared while ${input.connectorActivationMatrix.totals.writeScopesBlocked} write scope reference${input.connectorActivationMatrix.totals.writeScopesBlocked === 1 ? "" : "s"} remain blocked.`
      ],
      gap: Math.max(0, requiredApplicationBoundaries - input.connectorActivationMatrix.totals.rows),
      nextInternalAction: input.connectorActivationMatrix.totals.rows >= requiredApplicationBoundaries
        ? "Record connector activation rows and keep credential custody/read-only scopes separated from external execution."
        : "Prepare missing connector activation rows before claiming all required application boundaries are ready.",
      projectedLoad: requiredApplicationBoundaries,
      status: input.connectorActivationMatrix.totals.rows >= requiredApplicationBoundaries
        ? input.connectorActivationMatrix.totals.credentialCustodyRequired > 0 || input.connectorActivationMatrix.totals.blockedByQuality > 0 ? "watch" : "pass"
        : "watch",
      title: "Connector Activation Readiness"
    }),
    capacityProofCheck({
      capacity: input.options.safeBatchSize * 4,
      checkId: "monitoring_throughput",
      evidence: [
        `${monitoringSweepCycles} internal monitoring cycle${monitoringSweepCycles === 1 ? "" : "s"} needed to sweep ${input.options.targetStores} store${input.options.targetStores === 1 ? "" : "s"} at safe batch size ${input.options.safeBatchSize}.`,
        `${input.monitoringMatrix.totals.immediateRotationReviews} immediate rotation review${input.monitoringMatrix.totals.immediateRotationReviews === 1 ? "" : "s"} and ${input.monitoringMatrix.totals.scaleReviews} scale review${input.monitoringMatrix.totals.scaleReviews === 1 ? "" : "s"} are currently queued.`,
        `${input.monitoringMatrix.totals.storesCovered}/${input.options.targetStores} current stores are visible in the monitoring matrix.`
      ],
      gap: Math.max(0, input.options.targetStores - input.options.safeBatchSize * 4),
      nextInternalAction: monitoringSweepCycles <= 4
        ? "Run supervisor monitoring cycles until every active store has current signal evidence."
        : "Increase safe monitoring batch size or split monitoring into additional daily supervisor cycles.",
      projectedLoad: input.options.targetStores,
      status: monitoringSweepCycles <= 4
        ? input.monitoringMatrix.totals.immediateRotationReviews > 0 ? "watch" : "pass"
        : "watch",
      title: "Monitoring Throughput"
    }),
    capacityProofCheck({
      capacity: input.dailyOperatingLoop.steps.length,
      checkId: "daily_supervisor_control",
      evidence: [
        `${input.dailyOperatingLoop.totals.ready} ready step${input.dailyOperatingLoop.totals.ready === 1 ? "" : "s"}, ${input.dailyOperatingLoop.totals.approvalRequired} approval-required, ${input.dailyOperatingLoop.totals.waiting} waiting, and ${input.dailyOperatingLoop.totals.blocked} blocked.`,
        `Daily supervisor can select from ${projectedDailySupervisorSteps} ordered internal step${projectedDailySupervisorSteps === 1 ? "" : "s"}.`,
        input.safetyClear ? "Safety envelope reports external execution locked." : "Safety envelope reported an unsafe external/provider flag."
      ],
      gap: input.dailyOperatingLoop.totals.blocked,
      nextInternalAction: input.dailyOperatingLoop.totals.blocked === 0 && input.safetyClear
        ? "Use the daily supervisor as the single private control cycle for 100-store operations."
        : "Clear blocked daily-loop steps before supervisor automation expands.",
      projectedLoad: projectedDailySupervisorSteps,
      status: input.dailyOperatingLoop.totals.blocked === 0 && input.safetyClear
        ? input.dailyOperatingLoop.totals.ready > 0 ? "pass" : "watch"
        : "block",
      title: "Daily Supervisor Control"
    }),
    capacityProofCheck({
      capacity: input.workLeasePlan.totals.cleanParallelLeases,
      checkId: "work_lease_clean_claiming",
      evidence: [
        `${input.workLeasePlan.totals.readyToClaim} ready-to-claim lease${input.workLeasePlan.totals.readyToClaim === 1 ? "" : "s"} and ${input.workLeasePlan.totals.approvalHold} approval-held lease${input.workLeasePlan.totals.approvalHold === 1 ? "" : "s"}.`,
        `${input.workLeasePlan.totals.cleanParallelLeases} clean parallel lease${input.workLeasePlan.totals.cleanParallelLeases === 1 ? "" : "s"} fit shard caps at ${input.workLeasePlan.totals.maxLeasesPerShard} per shard.`,
        `${input.workLeasePlan.totals.blocked} blocked lease${input.workLeasePlan.totals.blocked === 1 ? "" : "s"} remain visible but not claimable.`,
        `${input.workLeasePlan.totals.duplicateDedupeKeys} duplicate dedupe key${input.workLeasePlan.totals.duplicateDedupeKeys === 1 ? "" : "s"} detected across ${input.workLeasePlan.totals.leases} lease${input.workLeasePlan.totals.leases === 1 ? "" : "s"}.`
      ],
      gap: Math.max(0, input.options.safeBatchSize - input.workLeasePlan.totals.cleanParallelLeases) + input.workLeasePlan.totals.duplicateDedupeKeys,
      nextInternalAction: input.workLeasePlan.totals.cleanParallelLeases > 0 && input.workLeasePlan.totals.duplicateDedupeKeys === 0
        ? "Record work leases before running the next internal chain-of-command cycle."
        : "Repair lease dedupe, dependencies, or shard caps before expanding parallel work.",
      projectedLoad: input.options.safeBatchSize,
      status: input.workLeasePlan.totals.duplicateDedupeKeys > 0
        ? "block"
        : input.workLeasePlan.totals.cleanParallelLeases >= Math.min(input.options.safeBatchSize, input.workLeasePlan.totals.readyToClaim) ? "pass" : "watch",
      title: "Work Lease Clean Claiming"
    }),
    capacityProofCheck({
      capacity: input.workerAssignmentPlan.totals.readyToAssign,
      checkId: "chain_of_command_assignment",
      evidence: [
        `${input.workerAssignmentPlan.totals.readyToAssign} ready worker assignment${input.workerAssignmentPlan.totals.readyToAssign === 1 ? "" : "s"} across ${input.workerAssignmentPlan.totals.laneCount} lane${input.workerAssignmentPlan.totals.laneCount === 1 ? "" : "s"}.`,
        `${input.workerAssignmentPlan.totals.approvalHold} approval-held, ${input.workerAssignmentPlan.totals.waitingDependency} waiting, and ${input.workerAssignmentPlan.totals.blocked} blocked assignment${input.workerAssignmentPlan.totals.blocked === 1 ? "" : "s"} remain non-claimable.`,
        `${input.workerAssignmentPlan.totals.duplicateDedupeKeys} duplicate dedupe key${input.workerAssignmentPlan.totals.duplicateDedupeKeys === 1 ? "" : "s"} detected before worker assignment.`
      ],
      gap: Math.max(0, Math.min(input.options.safeBatchSize, input.workLeasePlan.totals.readyToClaim) - input.workerAssignmentPlan.totals.readyToAssign) + input.workerAssignmentPlan.totals.duplicateDedupeKeys,
      nextInternalAction: input.workerAssignmentPlan.totals.readyToAssign > 0 && input.workerAssignmentPlan.totals.duplicateDedupeKeys === 0
        ? "Record worker assignments so each command lane can claim exactly one deduped lease at a time."
        : "Repair assignment dedupe, lane caps, or lease dependencies before expanding chain-of-command work.",
      projectedLoad: Math.min(input.options.safeBatchSize, input.workLeasePlan.totals.readyToClaim),
      status: input.workerAssignmentPlan.totals.duplicateDedupeKeys > 0
        ? "block"
        : input.workerAssignmentPlan.totals.readyToAssign > 0 ? "pass" : "watch",
      title: "Chain Of Command Assignment"
    }),
    capacityProofCheck({
      capacity: input.options.safeBatchSize * 4,
      checkId: "batch_and_product_depth",
      evidence: [
        `${input.storeGap} store slot${input.storeGap === 1 ? "" : "s"} remain before the 100-store floor.`,
        `${input.productDraftDeficit} product draft${input.productDraftDeficit === 1 ? "" : "s"} remain before configured product depth is satisfied.`,
        `Safe batch size ${input.options.safeBatchSize} creates up to ${input.options.safeBatchSize * 4} stores across four internal batch cycles.`
      ],
      gap: input.storeGap + input.productDraftDeficit,
      nextInternalAction: input.storeGap === 0 && input.productDraftDeficit === 0
        ? "Maintain product depth and keep weak lanes from consuming launch capacity."
        : "Run internal batch creation and product-depth repair until all 100 stores have minimum product depth.",
      projectedLoad: input.options.targetStores,
      status: input.storeGap === 0 && input.productDraftDeficit === 0
        ? "pass"
        : input.storeGap <= input.options.safeBatchSize * 4 ? "watch" : "block",
      title: "Batch And Product Depth"
    }),
    capacityProofCheck({
      capacity: input.growthAllocationRouter.totals.candidates,
      checkId: "profit_routing_guardrails",
      evidence: [
        `${input.growthAllocationRouter.totals.candidates} current store${input.growthAllocationRouter.totals.candidates === 1 ? "" : "s"} evaluated for advisory growth routing.`,
        `${input.growthAllocationRouter.totals.paidScaleReview} paid-scale review route${input.growthAllocationRouter.totals.paidScaleReview === 1 ? "" : "s"} and ${input.growthAllocationRouter.totals.organicFirst} organic-first route${input.growthAllocationRouter.totals.organicFirst === 1 ? "" : "s"}.`,
        `${input.growthAllocationRouter.totals.routedAdGrowthPercent}% of advisory Ad/Growth priority is currently routed with spend locked.`
      ],
      gap: Math.max(0, input.options.targetStores - input.growthAllocationRouter.totals.candidates),
      nextInternalAction: input.growthAllocationRouter.totals.candidates > 0
        ? "Use pressure-routed growth priorities for organic work and separate Financial Orchestrator budget review."
        : "Create and monitor first store lanes before allocating growth priority.",
      projectedLoad: input.options.targetStores,
      status: input.growthAllocationRouter.totals.candidates > 0 ? "pass" : "watch",
      title: "Profit Routing Guardrails"
    })
  ];
  const status = capacityProofStatus(checks);
  const count = (value: RevenueHundredStoreCapacityProofStatus) => checks.filter((check) => check.status === value).length;

  return {
    auditEvents: [
      "100 Store Capacity Proof stress-tested shard capacity, application boundary preparation, monitoring throughput, daily supervisor control, batch/product depth, and growth-routing guardrails.",
      "The proof is diagnostic and internal; it does not connect providers, create credentials, publish listings, upload content, run ads, move money, open browsers, or execute external writes.",
      "A pass means the private control architecture can carry the projected 100-store load; watch/block checks identify internal work still required before claiming live operating completion."
    ],
    blockedExternalActions: [
      "Using capacity proof as authorization for provider, marketplace, ad, upload, browser, payment, payout, bank, social, or external write execution",
      "Treating application templates as live credentials or OAuth grants",
      "Expanding beyond proven shard, monitoring, or supervisor limits without a new internal proof cycle"
    ],
    checks,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "100 Store Capacity Proof",
    providerContacted: false,
    status,
    stressProfile: {
      applicationBoundaryCoveragePercent,
      cleanSimultaneousStoreCapacity,
      futureStoreSlotsCovered,
      maximumCleanStoresAtShardLimit,
      monitoringSweepCycles,
      preparedApplicationBoundaries,
      productDraftDeficit: input.productDraftDeficit,
      projectedDailySupervisorSteps,
      requiredApplicationBoundaries,
      safeBatchSize: input.options.safeBatchSize,
      shardCapacity,
      storeGap: input.storeGap,
      targetStores: input.options.targetStores
    },
    summary: `${status.toUpperCase()} capacity proof: private controls can currently model ${cleanSimultaneousStoreCapacity}/${input.options.targetStores} clean simultaneous store slot${input.options.targetStores === 1 ? "" : "s"} with ${count("pass")} pass, ${count("watch")} watch, and ${count("block")} block check${checks.length === 1 ? "" : "s"}. External execution remains locked.`,
    totals: {
      block: count("block"),
      cleanSimultaneousStoreCapacity,
      pass: count("pass"),
      targetStores: input.options.targetStores,
      watch: count("watch")
    }
  };
}
